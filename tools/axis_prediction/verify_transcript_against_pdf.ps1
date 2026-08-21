# ASCII ONLY (standing rule). Verify a GPT transcription batch against the labels and
# accuracy figures the worksheet PDF actually prints.
#
# WHY THIS EXISTS (review ruling 25 section 7, 2026-08-21):
#   The 0710 instruction sheet asks the transcriber to copy the printed type name and the
#   printed accuracy into source_note. The reviewer can check that the difficulty mapping
#   is self-consistent, but only this side can check the copied values against the PDF
#   extraction. A transcription that invents a plausible label is worse than one that
#   omits it, because it looks complete.
#
# WHAT IS COMPARED
#   1 printed type name   verbatim, whitespace-normalised only
#   2 printed accuracy    integer percent
#   3 distinct label set   against the known 0710 label inventory, so a label that never
#                          appeared before is surfaced instead of being averaged away
#
# NAMING RULE (review ruling 25 section 5): no single-letter variables anywhere in this
# file. "$s vs $S" and "$t vs $T" both clobbered each other in one session on 2026-08-21
# because PowerShell variable names are case-insensitive. Three characters minimum.
#
# USAGE
#   powershell -File tools\axis_prediction\verify_transcript_against_pdf.ps1 -TranscriptDir <dir> -Probe <csv> -SourceFile "260710_..." [-ReportPath out.txt]

param(
  [Parameter(Mandatory=$true)][string]$TranscriptDir,
  [Parameter(Mandatory=$true)][string]$Probe,
  [Parameter(Mandatory=$true)][string]$SourceFile,
  [int]$ExpectCount = 150,
  [string]$ReportPath = ''
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

foreach ($path in @($TranscriptDir, $Probe)) { if (-not (Test-Path $path)) { throw ('input not found: ' + $path) } }

function Norm([string]$text) { return (($text -replace '\s+', ' ').Trim()) }

# ---------------- reference: what the PDF prints
$probeRows = @(Import-Csv -Path $Probe -Encoding UTF8)
if ($probeRows.Count -eq 0) { throw ('REFUSED: probe csv empty: ' + $Probe) }
foreach ($col in @('source_file', 'question_no', 'accuracy_percent', 'source_type_label')) {
  if (@($probeRows[0].PSObject.Properties.Name) -notcontains $col) { throw ('REFUSED: probe csv has no column ' + $col) }
}
$refLabel = @{}
$refAcc = @{}
foreach ($row in $probeRows) {
  if ([string]$row.source_file -ne $SourceFile) { continue }
  $qnum = 0
  if (-not [int]::TryParse([string]$row.question_no, [ref]$qnum)) { continue }
  $refLabel[$qnum] = Norm ([string]$row.source_type_label)
  $refAcc[$qnum] = [string]$row.accuracy_percent
}
if ($refLabel.Count -eq 0) { throw ('REFUSED: no probe rows for source_file ' + $SourceFile + ' - check the exact filename') }
if ($refLabel.Count -ne $ExpectCount) { throw ('REFUSED: probe has ' + $refLabel.Count + ' rows for that source, expected ' + $ExpectCount) }

# every distinct label the 0710 probe knows about, across all its source files
$knownLabels = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($row in $probeRows) { [void]$knownLabels.Add((Norm ([string]$row.source_type_label))) }

# ---------------- transcription
$files = @(Get-ChildItem -Path $TranscriptDir -Filter '*.json' | Sort-Object Name)
if ($files.Count -eq 0) { throw ('REFUSED: no json under ' + $TranscriptDir) }
$gotLabel = @{}
$gotAcc = @{}
$noMemo = @()
$batchId = ''
$batchSrc = ''
$unreadable = 0
foreach ($file in $files) {
  $doc = $null
  try { $doc = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $unreadable++; continue }
  if ($null -eq $doc.batch -or $null -eq $doc.items) { $unreadable++; continue }
  if ($batchId -eq '') { $batchId = [string]$doc.batch.bulk_batch_id }
  if ($batchSrc -eq '' -and $null -ne $doc.batch.provenance) { $batchSrc = [string]$doc.batch.provenance.source }
  foreach ($item in @($doc.items)) {
    $qnum = 0
    if (-not [int]::TryParse([string]$item.question_no, [ref]$qnum)) { $unreadable++; continue }
    $note = [string]$item.source_note
    # The memo section sits AFTER the quoted label. Search for the percentage only in the
    # remainder, never in the whole note: the question itself can talk about a percentage
    # (an enlargement ratio, for example), and matching the first percent in the note
    # reported two perfectly good items as 140% / 150% accuracy on 2026-08-21.
    # The checker was wrong, not the data.
    $labelMatch = [regex]::Match($note, "PDF\s*[^']*'([^']*)'")
    if (-not $labelMatch.Success) { $noMemo += $qnum; continue }
    $memoTail = $note.Substring($labelMatch.Index + $labelMatch.Length)
    $accMatch = [regex]::Match($memoTail, '(\d+)\s*%')
    if (-not $accMatch.Success) { $noMemo += $qnum; continue }
    $gotLabel[$qnum] = Norm $labelMatch.Groups[1].Value
    $gotAcc[$qnum] = $accMatch.Groups[1].Value
  }
}
if ($unreadable -gt 0) { Write-Output ('WARN unreadable files/items: ' + $unreadable) }

# ---------------- compare
$report = @()
$report += 'TRANSCRIPT vs PDF EXTRACTION'
$report += ('transcript dir : ' + $TranscriptDir)
$report += ('batch          : ' + $batchId)
$report += ('batch source   : ' + $batchSrc)
$report += ('probe source   : ' + $SourceFile)
$report += ''
if ($batchSrc -ne '' -and $batchSrc -ne $SourceFile) {
  $report += ('WARN batch.provenance.source (' + $batchSrc + ') differs from -SourceFile (' + $SourceFile + ')')
  $report += ''
}

$labelOk = 0; $labelBad = @()
$accOk = 0; $accBad = @()
$missing = @()
for ($qnum = 1; $qnum -le $ExpectCount; $qnum++) {
  if (-not $gotLabel.ContainsKey($qnum)) { $missing += $qnum; continue }
  if ($gotLabel[$qnum] -ceq $refLabel[$qnum]) { $labelOk++ } else { $labelBad += ('q' + $qnum.ToString('000') + '  pdf="' + $refLabel[$qnum] + '"  transcript="' + $gotLabel[$qnum] + '"') }
  if ($gotAcc[$qnum] -eq $refAcc[$qnum]) { $accOk++ } else { $accBad += ('q' + $qnum.ToString('000') + '  pdf=' + $refAcc[$qnum] + '%  transcript=' + $gotAcc[$qnum] + '%') }
}

$report += ('1 label verbatim   : ' + $labelOk + ' / ' + $ExpectCount)
$report += ('2 accuracy         : ' + $accOk + ' / ' + $ExpectCount)
$report += ('  items with no memo section : ' + $noMemo.Count)
$report += ('  items missing entirely     : ' + $missing.Count)
$report += ''

$distinctGot = @($gotLabel.Values | Sort-Object -Unique)
$newLabels = @($distinctGot | Where-Object { -not $knownLabels.Contains($_) })
$report += ('3 distinct labels in transcript : ' + $distinctGot.Count)
$report += ('  known 0710 inventory          : ' + $knownLabels.Count)
$report += ('  labels never seen before      : ' + $newLabels.Count)
foreach ($lbl in $newLabels) { $report += ('    NEW  ' + $lbl) }
$report += ''

if ($labelBad.Count -gt 0) {
  $report += ('LABEL MISMATCHES (' + $labelBad.Count + ')')
  foreach ($line in $labelBad) { $report += ('  ' + $line) }
  $report += ''
}
if ($accBad.Count -gt 0) {
  $report += ('ACCURACY MISMATCHES (' + $accBad.Count + ')')
  foreach ($line in $accBad) { $report += ('  ' + $line) }
  $report += ''
}
if ($noMemo.Count -gt 0) { $report += ('NO MEMO: q' + (($noMemo | Sort-Object) -join ', q')); $report += '' }
if ($missing.Count -gt 0) { $report += ('MISSING: q' + (($missing | Sort-Object) -join ', q')); $report += '' }

$pass = ($labelOk -eq $ExpectCount) -and ($accOk -eq $ExpectCount) -and ($missing.Count -eq 0) -and ($noMemo.Count -eq 0)
if ($pass) { $report += 'RESULT: PASS - transcript matches the PDF extraction on every question' }
else { $report += 'RESULT: FAIL - see the lists above' }

$out = ($report -join [Environment]::NewLine)
Write-Output $out
if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, $out, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('report written: ' + $ReportPath)
}
