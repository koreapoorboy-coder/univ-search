# ASCII ONLY (standing rule). Turn the approved reassignment map into an id-keyed payload.
#
# WHY THIS EXISTS (review ruling 27 section 4, 2026-08-21):
#   The map is addressed by (bulk_batch_id, question_no) because that is the coordinate
#   both sides can read. D1 is addressed by row id. Joining the two is the only step where
#   a wrong row can be written, so it fails closed on every count: an unmatched coordinate,
#   a duplicate id, or a target type that is not in the catalog stops the whole build.
#   Nothing partial is emitted - a payload that is 103/104 correct is worse than none.
#
# NAMING RULE (ruling 25 section 5): no single-letter variables, three characters minimum.
#
# FAIL CLOSED
#   1 every map row finds exactly one id
#   2 no id appears twice
#   3 every target problem_type_id exists in the catalog
#   4 emitted count equals map row count
#
# USAGE
#   powershell -File tools\axis_prediction\build_reassign_payload.ps1 -Map <csv> -IdExport <tsv> -OutJson <json> [-Catalog <json>]

param(
  [Parameter(Mandatory=$true)][string]$Map,
  [Parameter(Mandatory=$true)][string]$IdExport,
  [Parameter(Mandatory=$true)][string]$OutJson,
  [string]$Catalog = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json'
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

foreach ($path in @($Map, $IdExport, $Catalog)) { if (-not (Test-Path $path)) { throw ('input not found: ' + $path) } }

# ---------------- catalog: which type ids exist
$catalogDoc = Get-Content $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -eq $catalogDoc.problem_types) { throw ('REFUSED: not a problem_types catalog: ' + $Catalog) }
$knownTypes = New-Object 'System.Collections.Generic.HashSet[string]'
$catalogPrefix = ''
foreach ($entry in @($catalogDoc.problem_types)) {
  [void]$knownTypes.Add([string]$entry.problem_type_id)
  if ($catalogPrefix -eq '' -and ([string]$entry.problem_type_id -match '^(.*PT)\d+$')) { $catalogPrefix = $matches[1] }
}
# ---------------- id export: (batch, qno) -> id
#   RESOLVED BY HEADER NAME, NOT BY POSITION (2026-08-22).
#   Two exports arrived with the id column absent and problem_type_id sitting in its
#   place. Positional reads would have treated that value as a row id. The header is
#   read first and a missing column stops the build with the column named.
$idOf = @{}
$exportLines = [System.IO.File]::ReadAllLines($IdExport)
if ($exportLines.Length -lt 2) { throw ('REFUSED: id export has no data rows: ' + $IdExport) }
$headerCells = @($exportLines[0] -split "`t")
if ($headerCells.Length -lt 2) {
  throw ('REFUSED: id export header has no TAB. Expected TSV, got: ' + $exportLines[0])
}
$colIndexOf = @{}
for ($cellNo = 0; $cellNo -lt $headerCells.Length; $cellNo++) {
  $headName = $headerCells[$cellNo].TrimStart([char]0xFEFF).Trim().Trim('"').ToLowerInvariant()
  if ($headName -ne '' -and -not $colIndexOf.ContainsKey($headName)) { $colIndexOf[$headName] = $cellNo }
}
$missingCols = @()
foreach ($wantName in @('bulk_batch_id', 'question_no', 'id')) {
  if (-not $colIndexOf.ContainsKey($wantName)) { $missingCols += $wantName }
}
if ($missingCols.Count -gt 0) {
  throw ('REFUSED: id export is missing column(s) ' + ($missingCols -join ', ') +
         '. Header was: ' + (($headerCells | ForEach-Object { $_.Trim() }) -join ' | '))
}
$batchCol = $colIndexOf['bulk_batch_id']
$qnoCol   = $colIndexOf['question_no']
$rowIdCol = $colIndexOf['id']
$widestCol = [Math]::Max($batchCol, [Math]::Max($qnoCol, $rowIdCol))
$dupCoord = @()
$blankIds = 0
for ($lineNo = 1; $lineNo -lt $exportLines.Length; $lineNo++) {
  $cols = $exportLines[$lineNo] -split "`t"
  if ($cols.Length -le $widestCol) { continue }
  $qnum = 0
  if (-not [int]::TryParse($cols[$qnoCol].Trim().Trim('"'), [ref]$qnum)) { continue }
  $coordKey = ($cols[$batchCol].Trim().Trim('"') + '|' + $qnum)
  $rowIdText = $cols[$rowIdCol].Trim().Trim('"')
  if ($rowIdText -eq '') { $blankIds++; continue }
  if ($idOf.ContainsKey($coordKey)) { $dupCoord += $coordKey; continue }
  $idOf[$coordKey] = $rowIdText
}
if ($idOf.Count -eq 0) { throw ('REFUSED: no rows parsed from ' + $IdExport) }
if ($blankIds -gt 0) { throw ('REFUSED: id export has ' + $blankIds + ' row(s) with a blank id.') }
if ($dupCoord.Count -gt 0) { throw ('REFUSED: id export has ' + $dupCoord.Count + ' duplicate coordinate(s), first ' + $dupCoord[0]) }

# ---------------- map
$mapRows = @(Import-Csv -Path $Map -Encoding UTF8)
if ($mapRows.Count -eq 0) { throw ('REFUSED: map csv empty: ' + $Map) }
foreach ($col in @('bulk_batch_id', 'question_no', 'target_problem_type_id')) {
  if (@($mapRows[0].PSObject.Properties.Name) -notcontains $col) { throw ('REFUSED: map csv has no column ' + $col) }
}

$payload = @()
$unmatched = @()
$unknownType = @()
$seenIds = @{}
$dupIds = @()
foreach ($row in $mapRows) {
  $qnum = 0
  [void][int]::TryParse(([string]$row.question_no), [ref]$qnum)
  $coordKey = ([string]$row.bulk_batch_id + '|' + $qnum)
  $targetType = [string]$row.target_problem_type_id
  if (-not $knownTypes.Contains($targetType)) { $unknownType += ($coordKey + ' -> ' + $targetType) }
  if (-not $idOf.ContainsKey($coordKey)) { $unmatched += $coordKey; continue }
  $rowId = $idOf[$coordKey]
  if ($seenIds.ContainsKey($rowId)) { $dupIds += $rowId } else { $seenIds[$rowId] = $true }
  $payload += [ordered]@{ id = $rowId; problem_type_id = $targetType }
}

Write-Output ('[in ] map rows ' + $mapRows.Count + '   id export rows ' + $idOf.Count + '   catalog types ' + $knownTypes.Count)
Write-Output ''
Write-Output 'VERIFY'
Write-Output ('  1 coordinates matched : ' + $payload.Count + ' / ' + $mapRows.Count)
Write-Output ('  2 duplicate ids       : ' + $dupIds.Count)
Write-Output ('  3 unknown target type : ' + $unknownType.Count)
Write-Output ('  4 emitted count       : ' + $payload.Count)
$distinctTargets = @($mapRows | Select-Object -ExpandProperty target_problem_type_id -Unique)
Write-Output ('    distinct targets    : ' + $distinctTargets.Count + ' (all present in catalog: ' + $(if ($unknownType.Count -eq 0) { 'yes' } else { 'NO' }) + ')')

$problems = @()
if ($unmatched.Count -gt 0) { $problems += ('1 UNMATCHED ' + $unmatched.Count + ': ' + (($unmatched | Select-Object -First 5) -join ', ')) }
if ($dupIds.Count -gt 0) { $problems += ('2 DUPLICATE IDS ' + $dupIds.Count + ': ' + (($dupIds | Select-Object -First 5) -join ', ')) }
if ($unknownType.Count -gt 0) { $problems += ('3 UNKNOWN TYPE ' + $unknownType.Count + ': ' + (($unknownType | Select-Object -First 5) -join ', ')) }
if ($payload.Count -ne $mapRows.Count) { $problems += ('4 COUNT ' + $payload.Count + ' != ' + $mapRows.Count) }
if ($problems.Count -gt 0) {
  Write-Output ''
  foreach ($line in $problems) { Write-Output ('  !! ' + $line) }
  throw ('REFUSED: ' + $problems.Count + ' check(s) failed. Nothing written.')
}

$json = ConvertTo-Json -InputObject @($payload) -Depth 4
[System.IO.File]::WriteAllText($OutJson, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ('written: ' + $OutJson)

# per-target summary so the reviewer can eyeball the shape without opening the json
Write-Output ''
Write-Output 'PER TARGET'
foreach ($grp in ($payload | Group-Object { $_.problem_type_id } | Sort-Object Count -Descending)) {
  Write-Output ('  ' + ([string]$grp.Name).PadRight(16) + ([string]$grp.Count).PadLeft(4))
}
