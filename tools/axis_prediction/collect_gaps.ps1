# ASCII ONLY (standing rule - see handoff section 7).
# predicted_observed_gaps collector. M2_GEOM criterion.
#
# Criterion: for a predicted-layer type (observed_basis:false), any assigned error_code that is
#   NOT in the union of fine_error_tags of the OBSERVED types (observed_basis:true) in the SAME concept.
#   A concept with zero observed types is UNDECIDABLE -> skipped (recorded separately).
# Refinement (M2_GEOM): a tag observed in >=5 types of the unit is "ubiquitous" -> excluded as sampling noise.
#
# USAGE:
#   .\collect_gaps.ps1 -Draft <draft.json> -Overlay <pt_fine_error_tags.json> [-Aggregate]
#     -Aggregate : group by (concept, tag) and emit a JSON block ready to paste into _meta
#
# NOTE: uses _meta.category_ledger as the concept grouping (concept = ledger key).

param(
  [Parameter(Mandatory = $true)][string]$Draft,
  [Parameter(Mandatory = $true)][string]$Overlay,
  [switch]$Aggregate,
  [int]$UbiquitousThreshold = 5
)
$ErrorActionPreference = 'Stop'

$j = Get-Content $Draft -Raw -Encoding UTF8 | ConvertFrom-Json
$ov = Get-Content $Overlay -Raw -Encoding UTF8 | ConvertFrom-Json

$own = @{}; $freq = @{}
foreach ($p in @($ov.pt_fine_error_tags.PSObject.Properties)) {
  if (@($p.Value).Count -gt 0) {
    $own[$p.Name] = @($p.Value)
    foreach ($t in @($p.Value)) { $freq[$t] = $freq[$t] + 1 }
  }
}
$pool = @($freq.Keys)
$pr = $j.prescriptions

$gaps = @(); $excluded = @(); $undecidable = @()
foreach ($c in @($j._meta.category_ledger.PSObject.Properties)) {
  $ids = @($c.Value)
  $observed = @($ids | Where-Object { $own.ContainsKey($_) })
  $predicted = @($ids | Where-Object { -not $own.ContainsKey($_) })
  if ($observed.Count -eq 0) {
    $undecidable += [pscustomobject]@{ concept = $c.Name; types = $ids.Count; observed_types = 0 }
    continue
  }
  $union = @(); foreach ($o in $observed) { $union += $own[$o] }
  $union = $union | Select-Object -Unique
  foreach ($ptid in $predicted) {
    foreach ($cp in $pr.$ptid.error_checkpoints) {
      $code = $cp.error_code
      if ($union -contains $code) { continue }
      $rec = [pscustomobject]@{
        concept = $c.Name; tag = $code; predicted_in = $ptid
        observed_types_checked = $observed
        unit_occurrences = [int]$freq[$code]
        inPool = ($pool -contains $code)
      }
      if ([int]$freq[$code] -ge $UbiquitousThreshold) { $excluded += $rec } else { $gaps += $rec }
    }
  }
}

Write-Output ("[undecidable concepts] " + $undecidable.Count)
foreach ($u in $undecidable) { Write-Output ("   " + $u.concept + "  types=" + $u.types) }
Write-Output ("[gaps raw] " + $gaps.Count + "   [excluded ubiquitous] " + $excluded.Count)

if (-not $Aggregate) {
  foreach ($g in $gaps) {
    Write-Output ("   " + $g.tag + " | predicted_in=" + $g.predicted_in + " | checked=" + ($g.observed_types_checked -join ',') + " | unit_occ=" + $g.unit_occurrences + " | " + $(if ($g.inPool) { 'B(concept-local)' } else { 'A(unit-absent)' }))
  }
  exit 0
}

# aggregate by (concept, tag) -> predicted_in list
$agg = @{}
foreach ($g in $gaps) {
  $k = $g.concept + '|' + $g.tag
  if (-not $agg.ContainsKey($k)) {
    $agg[$k] = [pscustomobject]@{ concept = $g.concept; tag = $g.tag; predicted = @(); checked = $g.observed_types_checked; occ = $g.unit_occurrences; inPool = $g.inPool }
  }
  $agg[$k].predicted += $g.predicted_in
}
Write-Output ("[gaps aggregated] " + $agg.Count + " items from " + $gaps.Count + " raw")
$KIND_B = "B"   # concept-local: tag exists in unit overlay pool but not in this concept observed union
$KIND_A = "A"   # unit-absent: tag not in unit overlay pool at all (new-tag character)
$lines = @()
foreach ($k in ($agg.Keys | Sort-Object)) {
  $v = $agg[$k]
  $p = ($v.predicted | Select-Object -Unique) -join '","'
  $ch = ($v.checked | Select-Object -Unique) -join '","'
  $kind = $(if ($v.inPool) { $KIND_B } else { $KIND_A })
  $lines += ('      { "tag": "' + $v.tag + '", "concept": "' + $v.concept + '", "predicted_in": ["' + $p + '"], "observed_types_checked": ["' + $ch + '"], "observed_in": [], "unit_occurrences": ' + $v.occ + ', "kind": "' + $kind + '" }')
}
$outPath = [System.IO.Path]::ChangeExtension($Draft, $null) + 'gaps_block.txt'
[System.IO.File]::WriteAllText($outPath, ($lines -join ",`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("[written] " + $outPath)
