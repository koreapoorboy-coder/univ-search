# ASCII ONLY (standing rule). Verify a GPT transcription batch against the labels and
# accuracy figures the worksheet PDF actually prints.
#
# WHY THIS EXISTS (review ruling 25 section 7 / ruling 26 section 4, 2026-08-21):
#   A transcription batch declares which PDF it came from. That declaration can be wrong
#   while remaining internally consistent - on 2026-08-21 a batch whose bulk_batch_id and
#   provenance.source agreed with each other turned out to hold a THIRD file's content.
#   No integrity check over the JSON alone can catch that. Only the printed labels and
#   accuracies can, so this comparison is a REQUIRED second stage of transcript review,
#   not an optional extra.
#
# CANDIDATE SCAN IS THE DEFAULT (ruling 26 section 4)
#   With no -SourceFile the tool scores the transcript against EVERY source file in the
#   probe and ranks them. Checking only the declared file would have reported FAIL and
#   stopped, never revealing that a different file matched 150/150.
#
# WHAT IS COMPARED
#   1 printed type name   verbatim, whitespace-normalised only, case-sensitive
#   2 printed accuracy    integer percent, read from the memo section only
#   3 distinct label set   against the probe's whole label inventory, so a label that
#                          never appeared before is surfaced instead of averaged away
#
# DOMAIN CHECK (ruling 26 section 3)
#   Accuracy must be 0..100. A value outside that is a defect in THIS tool's parsing
#   before it is a defect in the data - it is reported as PARSE_SUSPECT, not as a
#   mismatch. Two good items were once reported as 140% / 150% because the regex read the
#   question text instead of the memo.
#
# NAMING RULE (ruling 25 section 5): no single-letter variables in this file. Three
# characters minimum. PowerShell variable names are case-insensitive, so $s and $S are
# one variable, and that clobbered two scripts in a single session.
#
# USAGE
#   powershell -File tools\axis_prediction\verify_transcript_against_pdf.ps1 -TranscriptDir <dir> -Probe <csv> [-SourceFile "<pdf>"] [-ReportPath out.txt]

param(
  [Parameter(Mandatory=$true)][string]$TranscriptDir,
  [Parameter(Mandatory=$true)][string]$Probe,
  [string]$SourceFile = '',
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

# ---------------- probe: what each candidate PDF prints
$probeRows = @(Import-Csv -Path $Probe -Encoding UTF8)
if ($probeRows.Count -eq 0) { throw ('REFUSED: probe csv empty: ' + $Probe) }
foreach ($col in @('source_file', 'question_no', 'accuracy_percent', 'source_type_label')) {
  if (@($probeRows[0].PSObject.Properties.Name) -notcontains $col) { throw ('REFUSED: probe csv has no column ' + $col) }
}
$bySource = @{}
$knownLabels = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($row in $probeRows) {
  $src = [string]$row.source_file
  if (-not $bySource.ContainsKey($src)) { $bySource[$src] = @{ label = @{}; acc = @{} } }
  $qnum = 0
  if (-not [int]::TryParse([string]$row.question_no, [ref]$qnum)) { continue }
  $bySource[$src].label[$qnum] = Norm ([string]$row.source_type_label)
  $bySource[$src].acc[$qnum] = [string]$row.accuracy_percent
  [void]$knownLabels.Add((Norm ([string]$row.source_type_label)))
}
$candidates = @($bySource.Keys | Sort-Object)
if ($candidates.Count -eq 0) { throw 'REFUSED: probe produced no source files' }

# ---------------- transcription
$files = @(Get-ChildItem -Path $TranscriptDir -Filter '*.json' | Sort-Object Name)
if ($files.Count -eq 0) { throw ('REFUSED: no json under ' + $TranscriptDir) }
$gotLabel = @{}
$gotAcc = @{}
$noMemo = @()
$suspect = @()
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
    # The memo sits AFTER the quoted label. Search for the percentage only in the
    # remainder: the question itself can quote a percentage (an enlargement ratio, for
    # example) and matching the first percent in the note reported two perfectly good
    # items as 140% / 150% accuracy. The checker was wrong, not the data.
    $labelMatch = [regex]::Match($note, "PDF\s*[^']*'([^']*)'")
    if (-not $labelMatch.Success) { $noMemo += $qnum; continue }
    $memoTail = $note.Substring($labelMatch.Index + $labelMatch.Length)
    $accMatch = [regex]::Match($memoTail, '(\d+)\s*%')
    if (-not $accMatch.Success) { $noMemo += $qnum; continue }
    $accVal = [int]$accMatch.Groups[1].Value
    if ($accVal -lt 0 -or $accVal -gt 100) { $suspect += ('q' + $qnum.ToString('000') + ' parsed accuracy ' + $accVal + '% is outside 0..100') }
    $gotLabel[$qnum] = Norm $labelMatch.Groups[1].Value
    $gotAcc[$qnum] = [string]$accVal
  }
}
if ($gotLabel.Count -eq 0) { throw 'REFUSED: no memo sections parsed from the transcript - is this the 0710 format?' }

# ---------------- score every candidate
function Score-Source([string]$srcName) {
  $refLabel = $bySource[$srcName].label
  $refAcc = $bySource[$srcName].acc
  $labelHit = 0
  $accHit = 0
  foreach ($qnum in $gotLabel.Keys) {
    if (-not $refLabel.ContainsKey($qnum)) { continue }
    if ($gotLabel[$qnum] -ceq $refLabel[$qnum]) { $labelHit++ }
    if ($gotAcc[$qnum] -eq $refAcc[$qnum]) { $accHit++ }
  }
  return [pscustomobject]@{ source = $srcName; labelHit = $labelHit; accHit = $accHit; rows = $refLabel.Count }
}
$scores = @($candidates | ForEach-Object { Score-Source $_ } | Sort-Object -Property labelHit, accHit -Descending)
$best = $scores[0]

$report = @()
$report += 'TRANSCRIPT vs PDF EXTRACTION'
$report += ('transcript dir : ' + $TranscriptDir)
$report += ('batch          : ' + $batchId)
$report += ('declared source: ' + $batchSrc)
$report += ''
$report += 'CANDIDATE SCAN (every source file in the probe)'
foreach ($sc in $scores) {
  $mark = ' '
  if ($sc.source -eq $best.source) { $mark = '*' }
  $report += ('  ' + $mark + ' ' + ([string]$sc.source).PadRight(30) + ' label ' + ([string]$sc.labelHit).PadLeft(3) + '/' + $sc.rows + '   accuracy ' + ([string]$sc.accHit).PadLeft(3) + '/' + $sc.rows)
}
$report += ''

$chosen = $best.source
if ($SourceFile -ne '') {
  if (-not $bySource.ContainsKey($SourceFile)) { throw ('REFUSED: probe has no rows for source_file ' + $SourceFile) }
  $chosen = $SourceFile
  if ($SourceFile -ne $best.source) { $report += ('NOTE compared against -SourceFile (' + $SourceFile + ') although ' + $best.source + ' scores higher') }
}
if ($batchSrc -ne '' -and $batchSrc -ne $chosen) {
  $report += ('WARN the batch declares ' + $batchSrc + ' but this report compares ' + $chosen)
  $report += '     a batch can be internally consistent and still name the wrong file - see ruling 26 section 2'
}
$report += ('compared against : ' + $chosen)
$report += ''
if ($unreadable -gt 0) { $report += ('WARN unreadable files/items: ' + $unreadable) }

$refLabel = $bySource[$chosen].label
$refAcc = $bySource[$chosen].acc
if ($refLabel.Count -ne $ExpectCount) { $report += ('WARN probe has ' + $refLabel.Count + ' rows for ' + $chosen + ', expected ' + $ExpectCount) }

$labelOk = 0; $labelBad = @()
$accOk = 0; $accBad = @()
$missing = @()
for ($qnum = 1; $qnum -le $ExpectCount; $qnum++) {
  if (-not $gotLabel.ContainsKey($qnum)) { $missing += $qnum; continue }
  if (-not $refLabel.ContainsKey($qnum)) { $missing += $qnum; continue }
  if ($gotLabel[$qnum] -ceq $refLabel[$qnum]) { $labelOk++ } else { $labelBad += ('q' + $qnum.ToString('000') + '  pdf="' + $refLabel[$qnum] + '"  transcript="' + $gotLabel[$qnum] + '"') }
  if ($gotAcc[$qnum] -eq $refAcc[$qnum]) { $accOk++ } else { $accBad += ('q' + $qnum.ToString('000') + '  pdf=' + $refAcc[$qnum] + '%  transcript=' + $gotAcc[$qnum] + '%') }
}

$report += ('1 label verbatim   : ' + $labelOk + ' / ' + $ExpectCount)
$report += ('2 accuracy         : ' + $accOk + ' / ' + $ExpectCount)
$report += ('  items with no memo section : ' + $noMemo.Count)
$report += ('  items missing entirely     : ' + $missing.Count)
$report += ('  PARSE_SUSPECT (out of 0..100 domain) : ' + $suspect.Count)
foreach ($line in $suspect) { $report += ('    ' + $line) }
$report += ''

$distinctGot = @($gotLabel.Values | Sort-Object -Unique)
$newLabels = @($distinctGot | Where-Object { -not $knownLabels.Contains($_) })
$report += ('3 distinct labels in transcript : ' + $distinctGot.Count)
$report += ('  probe label inventory         : ' + $knownLabels.Count)
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

$contentOk = ($labelOk -eq $ExpectCount) -and ($accOk -eq $ExpectCount) -and ($missing.Count -eq 0) -and ($noMemo.Count -eq 0) -and ($suspect.Count -eq 0)
$declOk = ($batchSrc -eq $chosen)
if ($contentOk -and $declOk) { $report += 'RESULT: PASS - content matches, and the batch names the file it actually holds' }
elseif ($contentOk) { $report += ('RESULT: CONTENT PASS / DECLARATION FAIL - the transcript is clean but names ' + $batchSrc + ' while holding ' + $chosen) }
else { $report += 'RESULT: FAIL - see the lists above' }

$out = ($report -join [Environment]::NewLine)
Write-Output $out
if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, $out, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('report written: ' + $ReportPath)
}
