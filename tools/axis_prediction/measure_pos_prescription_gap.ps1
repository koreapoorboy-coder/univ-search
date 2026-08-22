# ASCII ONLY (standing rule). Measure how much the PRESCRIPTION actually changes between
# cells (pos) of the same base, against a control of different bases.
#
# WHY THIS EXISTS (review ruling 36 section 3, 2026-08-22):
#   Two open decisions - the 346 CELL rows and the 38 discrimination-type B rows - both
#   reduce to one question: does getting the cell right change what the student is told?
#   If prescriptions for pos0/pos1/pos2 of the same base are nearly identical, then a cell
#   error costs almost nothing and neither job is worth its risk. If they differ as much as
#   prescriptions from unrelated bases do, then a cell error is a real miss and 70.9% is
#   not good enough to guess with.
#
#   The comparison needs a control. "Same base, different cell" similarity means nothing on
#   its own - every prescription in one unit shares vocabulary. So the same metric is run
#   over pairs from DIFFERENT bases, and the two distributions are reported side by side.
#
# METRICS (per pair)
#   error_code    Jaccard over error_checkpoints[].error_code - what the engine keys on
#   command       Jaccard over character bigrams of student_command - what the student reads
#   nature        Jaccard over character bigrams of problem_nature - how the type is framed
#
# NAMING RULE (ruling 25 section 5): no single-letter variables, three characters minimum.
#
# USAGE
#   powershell -File tools\axis_prediction\measure_pos_prescription_gap.ps1 -Prescriptions <json> -Catalog <json> [-OutCsv <csv>]

param(
  [Parameter(Mandatory=$true)][string]$Prescriptions,
  [string]$Catalog = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json',
  [string]$OutCsv = ''
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

foreach ($path in @($Prescriptions, $Catalog)) { if (-not (Test-Path $path)) { throw ('input not found: ' + $path) } }

function Get-Bigrams([string]$text) {
  $bag = New-Object 'System.Collections.Generic.HashSet[string]'
  if ([string]::IsNullOrEmpty($text)) { return ,$bag }
  $flat = ($text -replace '\s', '')
  for ($idx = 0; $idx -lt ($flat.Length - 1); $idx++) { [void]$bag.Add($flat.Substring($idx, 2)) }
  return ,$bag
}
function Get-Jaccard($setA, $setB) {
  if ($setA.Count -eq 0 -and $setB.Count -eq 0) { return -1.0 }
  $inter = 0
  foreach ($item in $setA) { if ($setB.Contains($item)) { $inter++ } }
  $union = $setA.Count + $setB.Count - $inter
  if ($union -eq 0) { return -1.0 }
  return ([double]$inter / [double]$union)
}

$catalogDoc = Get-Content $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json
$slotOf = @{}
foreach ($entry in @($catalogDoc.problem_types)) {
  if ([string]$entry.problem_type_id -match 'PT(\d+)$') {
    $num = [int]$matches[1]
    $slotOf[[string]$entry.problem_type_id] = @{ slot = [int][math]::Ceiling($num / 3.0); pos = (($num - 1) % 3) }
  }
}

$presDoc = Get-Content $Prescriptions -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -eq $presDoc.prescriptions) { throw ('REFUSED: no prescriptions object in ' + $Prescriptions) }
$items = @()
foreach ($prop in $presDoc.prescriptions.PSObject.Properties) {
  $typeId = $prop.Name
  if (-not $slotOf.ContainsKey($typeId)) { continue }
  $body = $prop.Value
  $codes = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($check in @($body.error_checkpoints)) { if ($check -and $check.error_code) { [void]$codes.Add([string]$check.error_code) } }
  $items += [pscustomobject]@{
    type_id = $typeId; slot = $slotOf[$typeId].slot; pos = $slotOf[$typeId].pos
    codes = $codes
    command = (Get-Bigrams ([string]$body.student_command))
    nature = (Get-Bigrams ([string]$body.problem_nature))
  }
}
if ($items.Count -lt 2) { throw 'REFUSED: fewer than two comparable prescriptions' }
Write-Output ('[in ] prescriptions matched to catalog : ' + $items.Count)

$pairs = @()
for ($outer = 0; $outer -lt $items.Count; $outer++) {
  for ($inner = $outer + 1; $inner -lt $items.Count; $inner++) {
    $left = $items[$outer]; $right = $items[$inner]
    $group = 'DIFFERENT_BASE'
    if ($left.slot -eq $right.slot) { $group = 'SAME_BASE_OTHER_CELL' }
    $pairs += [pscustomobject]@{
      group = $group; left_type = $left.type_id; right_type = $right.type_id
      slot_left = $left.slot; slot_right = $right.slot; pos_left = $left.pos; pos_right = $right.pos
      error_code_jaccard = [math]::Round((Get-Jaccard $left.codes $right.codes), 4)
      command_jaccard = [math]::Round((Get-Jaccard $left.command $right.command), 4)
      nature_jaccard = [math]::Round((Get-Jaccard $left.nature $right.nature), 4)
    }
  }
}

Write-Output ''
Write-Output ('PAIRS  same-base-other-cell ' + @($pairs | Where-Object { $_.group -eq 'SAME_BASE_OTHER_CELL' }).Count + '   different-base ' + @($pairs | Where-Object { $_.group -eq 'DIFFERENT_BASE' }).Count)
Write-Output ''
Write-Output ('metric'.PadRight(20) + 'group'.PadRight(24) + 'n'.PadLeft(6) + 'mean'.PadLeft(9) + 'median'.PadLeft(9) + 'identical'.PadLeft(11))
Write-Output ('-' * 79)
foreach ($metric in @('error_code_jaccard', 'command_jaccard', 'nature_jaccard')) {
  foreach ($group in @('SAME_BASE_OTHER_CELL', 'DIFFERENT_BASE')) {
    $vals = @($pairs | Where-Object { $_.group -eq $group -and $_.$metric -ge 0 } | ForEach-Object { $_.$metric })
    if ($vals.Count -eq 0) { continue }
    $sorted = @($vals | Sort-Object)
    $median = $sorted[[int][math]::Floor($sorted.Count / 2)]
    $mean = ($vals | Measure-Object -Average).Average
    $ident = @($vals | Where-Object { $_ -ge 0.999 }).Count
    Write-Output ($metric.PadRight(20) + $group.PadRight(24) + ([string]$vals.Count).PadLeft(6) + ([string][math]::Round($mean, 3)).PadLeft(9) + ([string]$median).PadLeft(9) + ([string]$ident).PadLeft(11))
  }
}

if ($OutCsv -ne '') { $pairs | Export-Csv -Path $OutCsv -NoTypeInformation -Encoding UTF8; Write-Output ('' ); Write-Output ('[out] ' + $OutCsv) }
