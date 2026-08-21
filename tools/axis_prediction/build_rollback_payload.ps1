# ASCII ONLY (standing rule). Snapshot the CURRENT assignment of every row a reassignment
# is about to touch, in the same shape the bulk-assign screen accepts.
#
# WHY THIS EXISTS (review ruling 28 section 2, 2026-08-21):
#   Catalog edits are reversible because they are files - the reversal check proves the
#   untouched bytes are identical. D1 is not a file, so there is nothing to reverse. The
#   substitute is a snapshot taken BEFORE the write: the same 104 rows with the value they
#   hold right now. If the reassignment turns out wrong, this file is the undo.
#   It must exist before the write, not after.
#
# WHERE "CURRENT" COMES FROM
#   The D1 export is the authority for the current problem_type_id. The map's
#   assigned_problem_type_id is only cross-checked against it - if the two disagree the
#   export has moved since the map was built and the snapshot is refused, because a
#   snapshot of a state that no longer exists is worse than none.
#
# NAMING RULE (ruling 25 section 5): no single-letter variables, three characters minimum.
#
# FAIL CLOSED
#   1 every map row finds exactly one id
#   2 every map row finds a current problem_type_id in the D1 export
#   3 the export's current value agrees with the map's assigned_problem_type_id
#   4 no id appears twice
#   5 emitted count equals map row count
#
# USAGE
#   powershell -File tools\axis_prediction\build_rollback_payload.ps1 -Map <csv> -IdExport <tsv> -D1 <tsv> -OutJson <json>

param(
  [Parameter(Mandatory=$true)][string]$Map,
  [Parameter(Mandatory=$true)][string]$IdExport,
  [Parameter(Mandatory=$true)][string]$D1,
  [Parameter(Mandatory=$true)][string]$OutJson
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

foreach ($path in @($Map, $IdExport, $D1)) { if (-not (Test-Path $path)) { throw ('input not found: ' + $path) } }

function Read-Tsv([string]$path, [int]$valueColumn) {
  $table = @{}
  $dups = @()
  $lines = [System.IO.File]::ReadAllLines($path)
  for ($lineNo = 1; $lineNo -lt $lines.Length; $lineNo++) {
    $cols = $lines[$lineNo] -split "`t"
    if ($cols.Length -le $valueColumn) { continue }
    $qnum = 0
    if (-not [int]::TryParse($cols[1].Trim(), [ref]$qnum)) { continue }
    $coordKey = ($cols[0].Trim() + '|' + $qnum)
    if ($table.ContainsKey($coordKey)) { $dups += $coordKey; continue }
    $table[$coordKey] = $cols[$valueColumn].Trim()
  }
  return @{ table = $table; dups = $dups }
}

$idRead = Read-Tsv $IdExport 2
$idOf = $idRead.table
if ($idOf.Count -eq 0) { throw ('REFUSED: no rows parsed from ' + $IdExport) }
if ($idRead.dups.Count -gt 0) { throw ('REFUSED: id export has duplicate coordinates, first ' + $idRead.dups[0]) }

$d1Read = Read-Tsv $D1 2
$currentOf = $d1Read.table
if ($currentOf.Count -eq 0) { throw ('REFUSED: no rows parsed from ' + $D1) }
if ($d1Read.dups.Count -gt 0) { throw ('REFUSED: D1 export has duplicate coordinates, first ' + $d1Read.dups[0]) }

$mapRows = @(Import-Csv -Path $Map -Encoding UTF8)
if ($mapRows.Count -eq 0) { throw ('REFUSED: map csv empty: ' + $Map) }
foreach ($col in @('bulk_batch_id', 'question_no', 'assigned_problem_type_id')) {
  if (@($mapRows[0].PSObject.Properties.Name) -notcontains $col) { throw ('REFUSED: map csv has no column ' + $col) }
}

$payload = @()
$noId = @()
$noCurrent = @()
$drifted = @()
$seenIds = @{}
$dupIds = @()
foreach ($row in $mapRows) {
  $qnum = 0
  [void][int]::TryParse(([string]$row.question_no), [ref]$qnum)
  $coordKey = ([string]$row.bulk_batch_id + '|' + $qnum)
  if (-not $idOf.ContainsKey($coordKey)) { $noId += $coordKey; continue }
  if (-not $currentOf.ContainsKey($coordKey)) { $noCurrent += $coordKey; continue }
  $currentType = $currentOf[$coordKey]
  if ($currentType -ne ([string]$row.assigned_problem_type_id)) {
    $drifted += ($coordKey + ' map=' + $row.assigned_problem_type_id + ' export=' + $currentType)
    continue
  }
  $rowId = $idOf[$coordKey]
  if ($seenIds.ContainsKey($rowId)) { $dupIds += $rowId } else { $seenIds[$rowId] = $true }
  $payload += [ordered]@{ id = $rowId; problem_type_id = $currentType }
}

Write-Output ('[in ] map rows ' + $mapRows.Count + '   id export ' + $idOf.Count + '   D1 export ' + $currentOf.Count)
Write-Output ''
Write-Output 'VERIFY'
Write-Output ('  1 id found            : ' + ($mapRows.Count - $noId.Count) + ' / ' + $mapRows.Count)
Write-Output ('  2 current value found : ' + ($mapRows.Count - $noId.Count - $noCurrent.Count) + ' / ' + $mapRows.Count)
Write-Output ('  3 map vs export drift : ' + $drifted.Count)
Write-Output ('  4 duplicate ids       : ' + $dupIds.Count)
Write-Output ('  5 emitted count       : ' + $payload.Count)

$problems = @()
if ($noId.Count -gt 0) { $problems += ('1 NO ID ' + $noId.Count + ': ' + (($noId | Select-Object -First 5) -join ', ')) }
if ($noCurrent.Count -gt 0) { $problems += ('2 NO CURRENT ' + $noCurrent.Count + ': ' + (($noCurrent | Select-Object -First 5) -join ', ')) }
if ($drifted.Count -gt 0) { $problems += ('3 DRIFT ' + $drifted.Count + ': ' + (($drifted | Select-Object -First 3) -join ' ; ')) }
if ($dupIds.Count -gt 0) { $problems += ('4 DUPLICATE IDS ' + $dupIds.Count) }
if ($payload.Count -ne $mapRows.Count) { $problems += ('5 COUNT ' + $payload.Count + ' != ' + $mapRows.Count) }
if ($problems.Count -gt 0) {
  Write-Output ''
  foreach ($line in $problems) { Write-Output ('  !! ' + $line) }
  throw ('REFUSED: ' + $problems.Count + ' check(s) failed. Nothing written - do NOT apply the reassignment without a snapshot.')
}

$json = ConvertTo-Json -InputObject @($payload) -Depth 4
[System.IO.File]::WriteAllText($OutJson, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ('written: ' + $OutJson)
Write-Output ''
Write-Output 'CURRENT VALUES BEING SNAPSHOTTED'
foreach ($grp in ($payload | Group-Object { $_.problem_type_id } | Sort-Object Count -Descending)) {
  Write-Output ('  ' + ([string]$grp.Name).PadRight(16) + ([string]$grp.Count).PadLeft(4))
}
