# ASCII ONLY (standing rule). Test one falsifiable prediction about block alignment.
#
# WHY THIS EXISTS (review ruling 24 section 1, 2026-08-21):
#   In simpy-03 the worksheet produced 70 label blocks but the D1 assignment produced only
#   56 slot runs. The reviewer's prediction is that the shortfall equals the number of
#   label blocks whose target slot did not exist in the catalog at assignment time:
#
#       (label blocks) - (slot runs)  ==  (label blocks whose target slot was absent)
#
#   The point of this tool is that the prediction can FAIL. If the three columns do not
#   line up across all eight batches, the observation behind it gets thrown out - the same
#   way the "empty slot 46 causes the shift" story was thrown out.
#
# HOW THE TARGET SLOT IS DECIDED
#   -Catalog     the CURRENT catalog. Used only to answer "which slot does this label want".
#   -RefCatalog  the catalog as it stood when D1 was assigned (the 87-entry backup).
#                Used only to answer "did that slot exist back then".
#   Splitting the two is what makes the question answerable: a label can want a slot that
#   did not exist yet, and that is exactly the case being counted.
#
#   Labels with no slot in either map are counted separately as UNMAPPED, never folded in.
#
# USAGE
#   powershell -File tools\axis_prediction\report_block_alignment.ps1 -D1 <tsv> -Headers <csv> -Pairing <csv> -RefCatalog <json> [-OutCsv <csv>]

param(
  [Parameter(Mandatory=$true)][string]$D1,
  [Parameter(Mandatory=$true)][string]$Headers,
  [Parameter(Mandatory=$true)][string]$Pairing,
  [Parameter(Mandatory=$true)][string]$RefCatalog,
  [string]$Catalog = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json',
  [string]$ItemBankDir = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\source_item_bank\m2_similarity_pythagoras',
  [int]$Questions = 150,
  [string]$OutCsv = '',
  [string]$OutBlocks = ''
)
$ErrorActionPreference = 'Stop'

# --- ASCII SELF-CHECK (standing rule, enforced in-tool 2026-08-18) ---------
$__selfPath = $MyInvocation.MyCommand.Path
if ($__selfPath -and (Test-Path $__selfPath)) {
  $__bad = @([System.IO.File]::ReadAllBytes($__selfPath) | Where-Object { $_ -gt 127 }).Count
  if ($__bad -gt 0) {
    throw ("ASCII RULE VIOLATION: " + [System.IO.Path]::GetFileName($__selfPath) + " contains " + $__bad + " non-ASCII byte(s).")
  }
}
# --- end ASCII SELF-CHECK --------------------------------------------------

foreach ($p in @($D1, $Headers, $Pairing, $RefCatalog, $Catalog)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }
if (-not (Test-Path $ItemBankDir)) { throw ('item bank dir not found: ' + $ItemBankDir) }

function Read-Cat($path) {
  $c = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($null -eq $c.problem_types) { throw ('REFUSED: not a problem_types catalog: ' + $path) }
  return $c
}

$cat = Read-Cat $Catalog
$ref = Read-Cat $RefCatalog

# unit prefix guard (review ruling 24 section 7) -----------------------------
function Get-Prefix($c) {
  foreach ($e in @($c.problem_types)) { if ([string]$e.problem_type_id -match '^(.*PT)\d+$') { return $matches[1] } }
  return ''
}
$pfxCat = Get-Prefix $cat
$pfxRef = Get-Prefix $ref
if ($pfxCat -eq '' -or $pfxRef -eq '') { throw 'REFUSED: could not read a PT id prefix from a catalog' }
if ($pfxCat -ne $pfxRef) { throw ('REFUSED: catalog/ref-catalog unit mismatch: ' + $pfxCat + ' vs ' + $pfxRef) }

# slots present in the reference catalog
$refSlot = @{}
foreach ($e in @($ref.problem_types)) {
  if ([string]$e.problem_type_id -match 'PT(\d+)$') { $refSlot[[int][math]::Ceiling([int]$matches[1] / 3.0)] = $true }
}

# label -> slot : item bank, then catalog entries named after the worksheet label
$lab2slot = @{}
foreach ($f in (Get-ChildItem $ItemBankDir -Filter '*.source_items.v1.json')) {
  $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($it in @($j.items)) {
    $l = ([string]$it.normalized_statement_features.source_type_label) -replace '\s', ''
    if ([string]$it.primary_problem_type_id -match 'PT(\d+)$') { $lab2slot[$l] = [int][math]::Ceiling([int]$matches[1] / 3.0) }
  }
}
$bankLabels = $lab2slot.Count
$seed = 0
foreach ($e in @($cat.problem_types)) {
  if (([string]$e.type_name_source) -ne 'worksheet_label') { continue }
  $tn = [string]$e.type_name
  $cut = $tn.LastIndexOf(' - ')
  if ($cut -lt 0) { continue }
  if (-not ([string]$e.problem_type_id -match 'PT(\d+)$')) { continue }
  $k = ($tn.Substring(0, $cut)) -replace '\s', ''
  if (-not $lab2slot.ContainsKey($k)) { $lab2slot[$k] = [int][math]::Ceiling([int]$matches[1] / 3.0); $seed++ }
}
if ($lab2slot.Count -eq 0) { throw 'REFUSED: label->slot map is empty' }

# D1
$asg = @{}
$pfxD1 = ''
$lines = [System.IO.File]::ReadAllLines($D1)
for ($i = 1; $i -lt $lines.Length; $i++) {
  $c = $lines[$i] -split "`t"
  if ($c.Length -lt 3) { continue }
  $qn = 0
  if (-not [int]::TryParse($c[1], [ref]$qn)) { continue }
  $asg[($c[0] + '|' + $qn)] = $c[2]
  if ($pfxD1 -eq '' -and $c[2] -match '^(.*PT)\d+$') { $pfxD1 = $matches[1] }
}
if ($asg.Count -eq 0) { throw ('REFUSED: no rows parsed from D1: ' + $D1) }
if ($pfxD1 -ne $pfxCat) { throw ('REFUSED: catalog/D1 unit mismatch. catalog ' + $pfxCat + 'nnn vs D1 ' + $pfxD1 + 'nnn') }

# headers
$hdr = @(Import-Csv -Path $Headers -Encoding UTF8)
$setLbl = @{}
foreach ($h in $hdr) {
  $s = [string]$h.set_declared
  if (-not $setLbl.ContainsKey($s)) { $setLbl[$s] = @{} }
  $q = 0
  if ([int]::TryParse([string]$h.question_no, [ref]$q)) { $setLbl[$s][$q] = [string]$h.source_type_label }
}

$pairs = @(Import-Csv -Path $Pairing -Encoding UTF8)
if ($pairs.Count -eq 0) { throw 'REFUSED: pairing csv empty' }

Write-Output ('[in ] label->slot ' + $lab2slot.Count + ' (item bank ' + $bankLabels + ' + worksheet_label ' + $seed + ')')
Write-Output ('[in ] reference catalog slots present : ' + $refSlot.Count + '   entries ' + @($ref.problem_types).Count)
Write-Output ''

$rows = @()
$blockRows = @()
foreach ($p in $pairs) {
  $b = [string]$p.bulk_batch_id
  $s = [string]$p.set_declared
  if (-not $setLbl.ContainsKey($s)) { Write-Output ('WARN no header rows for ' + $s + ' - batch skipped, not counted'); continue }
  $blocks = 0; $runs = 0; $absent = 0; $unmapped = 0; $present = 0; $noData = 0
  # runsX = runs counted with unassigned rows (NOID) carried over instead of breaking the
  # run. An item with no problem_type_id would otherwise split one run into three and
  # inflate the count - a confound, not a signal (review-handoff section 7: control the
  # confound before reading the difference as an effect).
  $runsX = 0; $noid = 0
  $prevL = ''; $prevS = ''; $prevSX = ''
  for ($q = 1; $q -le $Questions; $q++) {
    $lab = ''
    if ($setLbl[$s].ContainsKey($q)) { $lab = $setLbl[$s][$q] }
    $slot = ''
    $k = ($b + '|' + $q)
    if ($asg.ContainsKey($k) -and ([string]$asg[$k] -match 'PT(\d+)$')) { $slot = [string][int][math]::Ceiling([int]$matches[1] / 3.0) }
    if ($lab -eq '' -or $slot -eq '') { $noData++ }
    if ($lab -ne $prevL) {
      $blocks++
      $key = $lab -replace '\s', ''
      $tgt = ''
      $cls = ''
      if ($lab -eq '') { $cls = 'NO_LABEL' }
      elseif (-not $lab2slot.ContainsKey($key)) { $cls = 'UNMAPPED'; $unmapped++ }
      else {
        $tgt = [int]$lab2slot[$key]
        if ($refSlot.ContainsKey($tgt)) { $cls = 'TARGET_PRESENT'; $present++ }
        else { $cls = 'TARGET_ABSENT'; $absent++ }
      }
      $blockRows += [pscustomobject]@{ bulk_batch_id = $b; set_declared = $s; block_start_q = $q.ToString('000'); worksheet_label = $lab; target_slot = $tgt; classification = $cls }
    }
    if ($slot -ne $prevS) { $runs++ }
    if ($slot -eq '') { $noid++ }
    else {
      if ($slot -ne $prevSX) { $runsX++ }
      $prevSX = $slot
    }
    $prevL = $lab
    $prevS = $slot
  }
  $diff = $blocks - $runs
  $diffX = $blocks - $runsX
  $verdict = 'MISS'
  if ($diff -eq $absent) { $verdict = 'MATCH' }
  elseif ($diff -eq ($absent + $unmapped)) { $verdict = 'MATCH_WITH_UNMAPPED' }
  elseif ($diffX -eq $absent) { $verdict = 'MATCH_NOID_CONTROLLED' }
  $rows += [pscustomobject]@{
    bulk_batch_id = $b; set_declared = $s
    label_blocks = $blocks; slot_runs = $runs; shortfall = $diff
    slot_runs_noid_controlled = $runsX; shortfall_noid_controlled = $diffX; noid_rows = $noid
    target_absent_blocks = $absent; unmapped_blocks = $unmapped; target_present_blocks = $present
    verdict = $verdict; rows_missing_data = $noData
  }
}

$w = 'batch'.PadRight(34) + 'set'.PadRight(7) + 'Lblk'.PadLeft(5) + 'Srun'.PadLeft(6) + 'short'.PadLeft(7) + 'SrunX'.PadLeft(7) + 'shortX'.PadLeft(8) + 'noid'.PadLeft(6) + 'absent'.PadLeft(8) + 'unmap'.PadLeft(7) + '  verdict'
Write-Output $w
Write-Output ('-' * ($w.Length + 12))
foreach ($r in $rows) {
  Write-Output (([string]$r.bulk_batch_id).PadRight(34) + ([string]$r.set_declared).PadRight(7) + ([string]$r.label_blocks).PadLeft(5) + ([string]$r.slot_runs).PadLeft(6) + ([string]$r.shortfall).PadLeft(7) + ([string]$r.slot_runs_noid_controlled).PadLeft(7) + ([string]$r.shortfall_noid_controlled).PadLeft(8) + ([string]$r.noid_rows).PadLeft(6) + ([string]$r.target_absent_blocks).PadLeft(8) + ([string]$r.unmapped_blocks).PadLeft(7) + '  ' + $r.verdict)
}
$m = @($rows | Where-Object { $_.verdict -eq 'MATCH' }).Count
$mu = @($rows | Where-Object { $_.verdict -eq 'MATCH_WITH_UNMAPPED' }).Count
Write-Output ''
Write-Output ('PREDICTION  shortfall == target_absent_blocks : ' + $m + ' / ' + $rows.Count)
Write-Output ('            shortfall == absent + unmapped    : ' + $mu + ' / ' + $rows.Count)
if ($m -eq $rows.Count) { Write-Output '  result: PREDICTION HOLDS on every batch' }
elseif (($m + $mu) -eq $rows.Count) { Write-Output '  result: holds only when UNMAPPED blocks are counted too - report both, do not merge silently' }
else { Write-Output '  result: PREDICTION FAILS - the observation behind it does not survive' }

if ($OutCsv -ne '') { $rows | Export-Csv -Path $OutCsv -NoTypeInformation -Encoding UTF8; Write-Output ('  [out] ' + $OutCsv) }
if ($OutBlocks -ne '') { $blockRows | Export-Csv -Path $OutBlocks -NoTypeInformation -Encoding UTF8; Write-Output ('  [out] ' + $OutBlocks) }
