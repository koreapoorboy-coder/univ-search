# ASCII ONLY (standing rule). Two read-only reports for the reassignment decision.
#
# WHY THIS EXISTS (review ruling 23 section 4/5, 2026-08-21):
#   (1) A misassigned item cannot be reassigned to a cell that does not exist. Of the
#       canonical 177 only 91 are registered, so every BASE row has to be checked against
#       the catalog before it can be called a reassignment candidate at all. Rows whose
#       target cell is absent are CELL-CREATION work, not reassignment work.
#   (2) The reviewer wants the worksheet label sequence and the D1 assignment sequence
#       laid side by side for one batch, with NO interpretation attached.
#
# TARGET CELL
#   expected_slot comes from the worksheet label. The cell within that slot is taken from
#   the pos the D1 assignment already carries - the repeatedly observed "a shift preserves
#   the cell" regularity (ruling 20 section 2). It is an OBSERVATION, not a definition;
#   the report prints the pos it used so the reviewer can override it.
#       target_pt = 3 * expected_slot - 2 + pos
#
# This tool never writes to any catalog. It only reads and emits CSV.
#
# USAGE
#   powershell -File tools\axis_prediction\report_reassign_readiness.ps1 -D1 <tsv> -Candidates <csv> -Headers <csv> -Pairing <csv> -SeqBatch simpy-03 -OutReadiness <csv> -OutSequence <csv>

param(
  [Parameter(Mandatory=$true)][string]$D1,
  [Parameter(Mandatory=$true)][string]$Candidates,
  [string]$Catalog = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json',
  [string]$MissingCells = 'C:\Users\user\projects\scshstudy\tools\axis_prediction\B_simpy_missing_cells_72.v1.csv',
  [string]$Headers = '',
  [string]$Pairing = '',
  [string]$SeqBatch = '',
  [string]$OutReadiness = '',
  [string]$OutSequence = ''
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

foreach ($p in @($D1, $Candidates, $Catalog, $MissingCells)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }

# ---------------- catalog: existing PT numbers
$cat = Get-Content $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -eq $cat.problem_types) { throw ('REFUSED: not a problem_types catalog: ' + $Catalog) }
$have = @{}
$ptName = @{}
$catPrefix = ''
foreach ($e in @($cat.problem_types)) {
  if ([string]$e.problem_type_id -match '^(.*PT)(\d+)$') {
    if ($catPrefix -eq '') { $catPrefix = $matches[1] }
    $have[[int]$matches[2]] = $true
    $ptName[[int]$matches[2]] = [string]$e.type_name
  }
}
if ($have.Count -eq 0) { throw 'REFUSED: catalog produced no PT numbers' }

# ---------------- missing-cell list
$listed = @{}
$mc = @(Import-Csv -Path $MissingCells -Encoding UTF8)
if ($mc.Count -eq 0) { throw ('REFUSED: missing-cell csv empty: ' + $MissingCells) }
if (@($mc[0].PSObject.Properties.Name) -notcontains 'problem_type_id') { throw 'REFUSED: missing-cell csv has no problem_type_id column' }
foreach ($r in $mc) { if ([string]$r.problem_type_id -match 'PT(\d+)$') { $listed[[int]$matches[1]] = [string]$r.derived_type_name } }

# ---------------- D1 : (batch,qno) -> problem_type_id
$asg = @{}
$d1lines = [System.IO.File]::ReadAllLines($D1)
for ($i = 1; $i -lt $d1lines.Length; $i++) {
  $c = $d1lines[$i] -split "`t"
  if ($c.Length -lt 3) { continue }
  $qn = 0
  if (-not [int]::TryParse($c[1], [ref]$qn)) { continue }
  $asg[($c[0] + '|' + $qn)] = $c[2]
}
if ($asg.Count -eq 0) { throw ('REFUSED: no rows parsed from D1: ' + $D1) }

# Guard: the catalog must belong to the same unit as the D1 assignments. Without this the
# tool happily compares one unit's PT numbers against another unit's catalog and prints a
# plausible EXISTS/MISSING split that means nothing. Caught by the misclassification test
# on 2026-08-21 (m3_statistics catalog + M2_SIMPY D1 -> "EXISTS 19 / MISSING 71").
$d1Prefix = ''
foreach ($v in $asg.Values) { if ([string]$v -match '^(.*PT)\d+$') { $d1Prefix = $matches[1]; break } }
if ($d1Prefix -eq '') { throw 'REFUSED: no parsable problem_type_id in D1' }
if ($catPrefix -ne $d1Prefix) {
  throw ('REFUSED: catalog/D1 unit mismatch. catalog ids look like ' + $catPrefix + 'nnn but D1 ids look like ' + $d1Prefix + 'nnn')
}

# ---------------- report A : reassignment readiness
$cand = @(Import-Csv -Path $Candidates -Encoding UTF8)
foreach ($c in @('verdict', 'bulk_batch_id', 'question_no', 'assigned_slot', 'expected_slot')) {
  if (@($cand[0].PSObject.Properties.Name) -notcontains $c) { throw ('REFUSED: candidates csv has no column ' + $c) }
}
$base = @($cand | Where-Object { $_.verdict -eq 'BASE' })
Write-Output ('[in ] catalog PT ' + $have.Count + '  missing-cell list ' + $listed.Count + '  D1 rows ' + $asg.Count + '  BASE rows ' + $base.Count)

$rowsA = @()
$stat = @{ EXISTS = 0; MISSING_LISTED = 0; MISSING_UNLISTED = 0; NO_D1 = 0 }
foreach ($r in $base) {
  $qn = 0
  [void][int]::TryParse([string]$r.question_no, [ref]$qn)
  $key = ([string]$r.bulk_batch_id + '|' + $qn)
  $pt = ''
  if ($asg.ContainsKey($key)) { $pt = [string]$asg[$key] }
  if ($pt -eq '' -or -not ($pt -match 'PT(\d+)$')) {
    $stat.NO_D1++
    $rowsA += [pscustomobject]@{ status = 'NO_D1'; bulk_batch_id = $r.bulk_batch_id; question_no = $r.question_no; worksheet_label = $r.worksheet_label; assigned_problem_type_id = ''; assigned_slot = $r.assigned_slot; assigned_pos = ''; expected_slot = $r.expected_slot; target_problem_type_id = ''; target_type_name = ''; note = 'no D1 row for this coordinate' }
    continue
  }
  $n = [int]$matches[1]
  $pos = ($n - 1) % 3
  $es = 0
  [void][int]::TryParse([string]$r.expected_slot, [ref]$es)
  $tgt = (3 * $es) - 2 + $pos
  $st = ''
  $nm = ''
  $note = ''
  if ($have.ContainsKey($tgt)) { $st = 'EXISTS'; $nm = $ptName[$tgt] }
  elseif ($listed.ContainsKey($tgt)) { $st = 'MISSING_LISTED'; $nm = $listed[$tgt]; $note = 'cell absent; name already mechanically derived in the missing-cell list' }
  else { $st = 'MISSING_UNLISTED'; $note = 'cell absent AND not in the missing-cell list - see report footer' }
  $stat[$st]++
  $rowsA += [pscustomobject]@{
    status = $st; bulk_batch_id = $r.bulk_batch_id; question_no = $r.question_no
    worksheet_label = $r.worksheet_label
    assigned_problem_type_id = ('M2_SIMPY_PT' + $n.ToString('000')); assigned_slot = $r.assigned_slot; assigned_pos = $pos
    expected_slot = $r.expected_slot
    target_problem_type_id = ('M2_SIMPY_PT' + $tgt.ToString('000')); target_type_name = $nm; note = $note
  }
}
Write-Output ''
Write-Output 'REASSIGNMENT READINESS (BASE rows)'
foreach ($k in @('EXISTS', 'MISSING_LISTED', 'MISSING_UNLISTED', 'NO_D1')) {
  Write-Output ('  ' + $k.PadRight(18) + ' : ' + $stat[$k])
}
if ($OutReadiness -ne '') { $rowsA | Export-Csv -Path $OutReadiness -NoTypeInformation -Encoding UTF8; Write-Output ('  [out] ' + $OutReadiness) }

# ---------------- report B : label sequence vs assignment sequence
if ($SeqBatch -ne '') {
  if ($Headers -eq '' -or $Pairing -eq '') { throw 'REFUSED: -SeqBatch needs -Headers and -Pairing' }
  foreach ($p in @($Headers, $Pairing)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }
  $pairRows = @(Import-Csv -Path $Pairing -Encoding UTF8)
  $batchFull = ''
  $setName = ''
  foreach ($p in $pairRows) {
    if ([string]$p.bulk_batch_id -like ('*' + $SeqBatch)) { $batchFull = [string]$p.bulk_batch_id; $setName = [string]$p.set_declared }
  }
  if ($batchFull -eq '') { throw ('REFUSED: batch not found in pairing: ' + $SeqBatch) }
  $hdr = @(Import-Csv -Path $Headers -Encoding UTF8 | Where-Object { $_.set_declared -eq $setName })
  if ($hdr.Count -eq 0) { throw ('REFUSED: no header rows for ' + $setName) }
  $lbl = @{}
  foreach ($h in $hdr) { $q = 0; if ([int]::TryParse([string]$h.question_no, [ref]$q)) { $lbl[$q] = [string]$h.source_type_label } }

  $rowsB = @()
  $prevL = ''
  $prevS = ''
  $missB = 0
  foreach ($q in (1..150)) {
    $L = ''
    if ($lbl.ContainsKey($q)) { $L = $lbl[$q] }
    $S = ''
    $tn = ''
    $k = ($batchFull + '|' + $q)
    if ($asg.ContainsKey($k) -and ([string]$asg[$k] -match 'PT(\d+)$')) {
      $n = [int]$matches[1]
      $S = [string][int][math]::Ceiling($n / 3.0)
      if ($ptName.ContainsKey($n)) { $tn = $ptName[$n] }
    }
    if ($L -eq '' -or $S -eq '') { $missB++ }
    $rowsB += [pscustomobject]@{
      question_no = $q.ToString('000')
      label_changed = $(if ($L -ne $prevL) { 'Y' } else { '' })
      worksheet_label = $L
      slot_changed = $(if ($S -ne $prevS) { 'Y' } else { '' })
      assigned_slot = $S
      assigned_type_name = $tn
    }
    $prevL = $L
    $prevS = $S
  }
  $lblBlocks = @($rowsB | Where-Object { $_.label_changed -eq 'Y' }).Count
  $slotBlocks = @($rowsB | Where-Object { $_.slot_changed -eq 'Y' }).Count
  Write-Output ''
  Write-Output ('LABEL vs ASSIGNMENT SEQUENCE  ' + $batchFull + '  <-> ' + $setName)
  Write-Output ('  label change points     : ' + $lblBlocks)
  Write-Output ('  slot change points      : ' + $slotBlocks)
  if ($missB -gt 0) { Write-Output ('  WARN rows missing label or assignment : ' + $missB) }
  if ($OutSequence -ne '') { $rowsB | Export-Csv -Path $OutSequence -NoTypeInformation -Encoding UTF8; Write-Output ('  [out] ' + $OutSequence) }
}
