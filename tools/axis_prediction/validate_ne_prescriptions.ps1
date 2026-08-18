# ASCII ONLY (standing rule). Validation + tier breakdown for an arithmetic prescription draft.
#
# Defaults reproduce the original M2_NE behaviour byte-for-byte, so existing invocations
# (-Expected N only) are unchanged. Pass the three path params to validate another unit.
#
# M3_REAL usage:
#   .\validate_ne_prescriptions.ps1 -Expected N `
#     -Draft   'tools\axis_prediction\m3_real_prescriptions.draft.v1.json' `
#     -Catalog 'problem_types\m3_real_numbers_and_operations.problem_types.v1.json' `
#     -Overlay 'axis_map\m3_real_numbers_and_operations.pt_fine_error_tags.v1.json'
param(
  [int]$Expected = 10,
  [string]$Draft = 'tools\axis_prediction\m2_ne_prescriptions.draft.v1.json',
  [string]$Catalog = 'problem_types\m2_number_expression.problem_types.v1.json',
  [string]$Overlay = 'axis_map\m2_number_expression.pt_fine_error_tags.v1.json'
)
$ErrorActionPreference = 'Stop'

# --- ASCII SELF-CHECK (standing rule, enforced in-tool 2026-08-18) ---------
# WHY: a BOM-less .ps1 containing Korean literals is read as ANSI by PS 5.1 and the
# strings are corrupted BEFORE the script runs. No error is raised; the broken value
# is written into data and even passes JSON parsing (real incident: 261 rows).
# The rule "keep .ps1 ASCII-only" was violated twice despite being documented, so it
# is enforced here instead of relied on: this script refuses to run while polluted.
# Non-ASCII text belongs in a UTF-8 data/patch file, or as \uXXXX regex escapes.
$__selfPath = $MyInvocation.MyCommand.Path
if ($__selfPath -and (Test-Path $__selfPath)) {
  $__bad = @([System.IO.File]::ReadAllBytes($__selfPath) | Where-Object { $_ -gt 127 }).Count
  if ($__bad -gt 0) {
    throw ("ASCII RULE VIOLATION: " + [System.IO.Path]::GetFileName($__selfPath) + " contains " + $__bad + " non-ASCII byte(s). PS 5.1 corrupts them before execution. Use \uXXXX escapes or move the text to a UTF-8 data file.")
  }
}
# --- end ASCII SELF-CHECK --------------------------------------------------
$repo = 'C:\Users\user\projects\scshstudy'
$data = Join-Path $repo 'public\math-weakness-engine\data'
$p = Join-Path $repo $Draft

$raw = Get-Content $p -Raw -Encoding UTF8
try { $j = $raw | ConvertFrom-Json; Write-Output '[1] JSON parse OK' } catch { Write-Output ('[1] FAIL ' + $_.Exception.Message); exit 1 }

# distinct names: PS variable names are case-insensitive (see handoff 7)
$FFFD_CHAR = [string][char]0xFFFD
$fffdCount = ([regex]::Matches($raw, [regex]::Escape($FFFD_CHAR))).Count
Write-Output ("[2] U+FFFD scan = " + $fffdCount + $(if ($fffdCount -eq 0) { ' OK' } else { ' FAIL' }))

$pr = $j.prescriptions; $ids = @($pr.PSObject.Properties.Name)
Write-Output ("[3] entries = " + $ids.Count + " (expected $Expected) " + $(if ($ids.Count -eq $Expected) { 'OK' } else { 'CHECK' }))

$need = @('problem_nature','required_thinking','must_write_steps','common_wrong_actions','error_checkpoints','student_command','teacher_note','parent_message','matched_template_id','match_score','draft','revision','observed_basis')
$bad = @(); $cpBad = @(); $dist = @{}; $nn = @()
foreach ($id in $ids) {
  $e = $pr.$id; $have = $e.PSObject.Properties.Name
  $m = $need | Where-Object { $have -notcontains $_ }; if ($m) { $bad += ($id + ' missing ' + ($m -join ',')) }
  $x = $have | Where-Object { $need -notcontains $_ }; if ($x) { $bad += ($id + ' extra ' + ($x -join ',')) }
  $cp = @($e.error_checkpoints); $dist[$cp.Count] = $dist[$cp.Count] + 1
  foreach ($c in $cp) { $fn = $c.PSObject.Properties.Name -join '|'; if ($fn -ne 'error_code|label|diagnosis|student_fix') { $cpBad += ($id + ' ' + $fn) } }
  if ($null -ne $e.matched_template_id -or $null -ne $e.match_score) { $nn += $id }
  if ($e.draft -ne $true -or $e.revision -ne 1) { $bad += ($id + ' flags') }
}
Write-Output ("[4] 13-field: " + $(if ($bad) { 'FAIL ' + ($bad -join '; ') } else { 'OK' }))
$maxCp = ($dist.Keys | Measure-Object -Maximum).Maximum
$minCp = ($dist.Keys | Measure-Object -Minimum).Minimum
Write-Output ("[5] cp dist: " + (($dist.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ', ') + "  range $minCp~$maxCp " + $(if ($maxCp -le 4 -and $minCp -ge 2) { 'OK' } else { 'FAIL' }))
Write-Output ("[6] cp field-combo: " + $(if ($cpBad) { 'FAIL' } else { 'OK' }) + "   nonnull: " + $(if ($nn) { 'FAIL' } else { '0 OK' }))

$cat = Get-Content (Join-Path $data $Catalog) -Raw -Encoding UTF8 | ConvertFrom-Json
$ov = Get-Content (Join-Path $data $Overlay) -Raw -Encoding UTF8 | ConvertFrom-Json
$own = @{}; $pool = @()
foreach ($q in @($ov.pt_fine_error_tags.PSObject.Properties)) { if (@($q.Value).Count -gt 0) { $own[$q.Name] = @($q.Value); $pool += @($q.Value) } }
$pool = $pool | Select-Object -Unique
$dictPath = Join-Path $repo 'tools\axis_prediction\TAG_DICTIONARY_v2.md'
$dictRaw = if (Test-Path $dictPath) { Get-Content $dictPath -Raw -Encoding UTF8 } else { '' }
$simpy = Get-Content (Join-Path $repo 'tools\axis_prediction\m2_simpy_prescriptions.draft.v1.json') -Raw -Encoding UTF8 | ConvertFrom-Json

$t1 = 0; $t2 = 0; $t3 = 0; $newTags = @(); $lb = @()
$lm = $j._meta.label_map
foreach ($id in $ids) {
  $mine = @($own[$id])
  foreach ($c in $pr.$id.error_checkpoints) {
    $code = $c.error_code
    if ($mine -contains $code) { $t1++ }
    elseif ($pool -contains $code) { $t2++ }
    elseif ($dictRaw -match [regex]::Escape($code)) { $t3++ }
    else { $newTags += ($id + ':' + $code) }
    $exp = $lm.$code
    if (-not $exp) { $lb += ($id + ' ' + $code + ' NOT-IN-MAP') } elseif ($exp -ne $c.label) { $lb += ($id + ' ' + $code + ' MISMATCH') }
    $s = $simpy._meta.label_map.$code
    if ($s -and $s -ne $c.label) { $lb += ($id + ' ' + $code + ' CROSS-UNIT-MISMATCH: ' + $s) }
  }
}
Write-Output ("[7] tier1(self overlay) $t1 / tier2(unit pool) $t2 / tier3(dict) $t3 / new " + $(if ($newTags) { $newTags.Count.ToString() + ' :: ' + ($newTags -join ',') } else { '0' }))
Write-Output ("[8] label_map (in-unit + cross-unit): " + $(if ($lb) { 'FAIL ' + ($lb -join '; ') } else { 'OK' }))

$led = @(); $j._meta.category_ledger.PSObject.Properties | ForEach-Object { $led += $_.Value }
$cm = @(); $j._meta.concept_map.PSObject.Properties | ForEach-Object { $cm += $_.Value }
$ledDup = @($led | Group-Object | Where-Object { $_.Count -gt 1 }).Count
Write-Output ("[9] ledger sum " + $led.Count + " (dup $ledDup) / concept_map " + $cm.Count + " / entries " + $ids.Count + " : " + $(if ($led.Count -eq $ids.Count -and $cm.Count -eq $ids.Count -and $ledDup -eq 0) { 'OK' } else { 'FAIL' }))

$obBad = @()
foreach ($id in $ids) { $expected = $own.ContainsKey($id); if ($pr.$id.observed_basis -ne $expected) { $obBad += ($id + ' expected=' + $expected) } }
$tv = @($ids | Where-Object { $own.ContainsKey($_) }).Count
Write-Output ("[10] observed_basis matches overlay presence: " + $(if ($obBad) { 'FAIL ' + ($obBad -join ',') } else { "OK (true $tv / false " + ($ids.Count - $tv) + ')' }))

$catIds = @($cat.problem_types | ForEach-Object { $_.problem_type_id })
$miss = $ids | Where-Object { $catIds -notcontains $_ }
Write-Output ("[11] catalog existence: " + $(if ($miss) { 'FAIL ' + ($miss -join ',') } else { 'OK ' + $ids.Count + '/' + $ids.Count }))

$g = @($j._meta.predicted_observed_gaps)
$tb = $j._meta.tier_breakdown
Write-Output ("[12] gaps recorded = " + $g.Count + " / tier_breakdown batches = " + @($tb.batches).Count + " / cumulative types = " + $tb.cumulative.types)
$sum1 = 0; $sum2 = 0; $sumN = 0
foreach ($b in @($tb.batches)) { $sum1 += $b.tier1; $sum2 += $b.tier2; $sumN += $b.new }
Write-Output ("[13] tier_breakdown self-consistency: batches sum tier1=$sum1 tier2=$sum2 new=$sumN vs measured tier1=$t1 tier2=$t2 new=" + @($newTags).Count + " : " + $(if ($sum1 -eq $t1 -and $sum2 -eq $t2) { 'OK' } else { 'FAIL' }))

# --- [14] _meta identifier keys must be ASCII --------------------------------
# WHY (incident 2026-08-18, review side): a key named with a leading star (U+2605)
# makes an ordinary lookup like $j._meta.observation_vocabulary_skew return $null.
# The record then reads as MISSING even though the data is present under a different
# key name. Same failure class as the Korean-literal one: no error, no parse failure,
# just a silent wrong answer. Enforced here instead of relied on.
# Concept-name keys under category_ledger / concept_map are DATA (not identifiers),
# so those two containers are skipped by design.
$script:badKeys = @()
function Test-MetaKeyAscii($node, $path) {
  if ($null -eq $node) { return }
  if ($node -is [System.Object[]]) {
    for ($n = 0; $n -lt $node.Count; $n++) { Test-MetaKeyAscii $node[$n] ($path + '[' + $n + ']') }
    return
  }
  if ($node -is [PSCustomObject]) {
    foreach ($pp in $node.PSObject.Properties) {
      $full = $path + '.' + $pp.Name
      if ($path -ne '_meta.category_ledger' -and $path -ne '_meta.concept_map') {
        $nb = @([System.Text.Encoding]::UTF8.GetBytes($pp.Name) | Where-Object { $_ -gt 127 }).Count
        if ($nb -gt 0) { $script:badKeys += $full }
      }
      Test-MetaKeyAscii $pp.Value $full
    }
  }
}
if ($null -eq $j._meta) {
  Write-Output '[14] _meta identifier keys ASCII: SKIP (no _meta section)'
} else {
  Test-MetaKeyAscii $j._meta '_meta'
  Write-Output ("[14] _meta identifier keys ASCII: " + $(if ($script:badKeys) { 'FAIL ' + ($script:badKeys -join '; ') } else { 'OK' }))
}
