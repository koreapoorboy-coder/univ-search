# ASCII ONLY (standing rule). Identify WHICH worksheet set each GPT transcription batch
# was actually transcribed FROM, using only the transcription's own text.
#
# WHY THIS EXISTS (review ruling 18 section 0/9, 2026-08-21):
#   Ruling 18 concluded from a filename string (provenance.source "...(5)(1).pdf") that
#   the reviewer's copy carried a wrong bulk_batch_id. A repo-wide scan then found the
#   SAME +1 offset in every transcription batch, which - applied uniformly - contradicts
#   four independent empirical anchors for the batch<->set pairing. A metadata string
#   cannot settle that. This tool settles it from CONTENT.
#
# METHOD
#   For each transcription batch, build a haystack per question_no from that item's own
#   source_note + question_text. For each candidate set, take the label the worksheet
#   PRINTED above the same question_no and measure how much of the label is echoed in
#   the haystack (character-bigram containment). Mean over all shared question numbers.
#   Every set is scored, so rotation control is built in: the correct set must win, and
#   the shifted hypotheses are exactly its neighbours.
#
#   The comparison never touches D1 assignments, so it is independent of the pairing
#   under test.
#
# OUTPUT
#   full batch x set matrix, per-batch best/second/margin, and an explicit count of which
#   offset (0 or +1) the content supports. UNDECIDED when the margin is too thin.
#
# USAGE
#   powershell -File tools\axis_prediction\identify_transcript_to_set.ps1 -TranscriptRoot <dir> -Headers <9sets csv> [-ReportPath out.txt]

param(
  [Parameter(Mandatory=$true)][string]$TranscriptRoot,
  [Parameter(Mandatory=$true)][string]$Headers,
  [string]$ReportPath = '',
  [double]$MinMargin = 1.05
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

foreach ($p in @($TranscriptRoot, $Headers)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }

function Get-Bigrams([string]$s) {
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  if ([string]::IsNullOrEmpty($s)) { return ,$set }
  $t = ($s -replace '\s', '').ToLowerInvariant()
  for ($i = 0; $i -lt ($t.Length - 1); $i++) { [void]$set.Add($t.Substring($i, 2)) }
  return ,$set
}

function Get-Containment($needle, $hay) {
  if ($needle.Count -eq 0) { return -1.0 }
  $hit = 0
  foreach ($g in $needle) { if ($hay.Contains($g)) { $hit++ } }
  return ([double]$hit / [double]$needle.Count)
}

# ---------------- headers: set -> (qno -> label)
$rows = @(Import-Csv -Path $Headers -Encoding UTF8)
if ($rows.Count -eq 0) { throw ('REFUSED: headers csv empty: ' + $Headers) }
$cols = @($rows[0].PSObject.Properties.Name)
foreach ($c in @('set_declared', 'question_no', 'source_type_label')) {
  if ($cols -notcontains $c) { throw ('REFUSED: headers csv has no column ' + $c + ' (found: ' + ($cols -join ',') + ')') }
}
$setLabels = @{}
foreach ($r in $rows) {
  $s = [string]$r.set_declared
  if (-not $setLabels.ContainsKey($s)) { $setLabels[$s] = @{} }
  $qn = 0
  if (-not [int]::TryParse(([string]$r.question_no), [ref]$qn)) { continue }
  $setLabels[$s][$qn] = [string]$r.source_type_label
}
$setNames = @($setLabels.Keys | Sort-Object)

# ---------------- transcription batches
$dirs = @(Get-ChildItem -Path $TranscriptRoot -Directory | Sort-Object Name)
if ($dirs.Count -eq 0) { throw ('REFUSED: no subfolders under ' + $TranscriptRoot) }

$batches = @()
$notes = @()
foreach ($d in $dirs) {
  $files = @(Get-ChildItem -Path $d.FullName -Filter '*.json' | Sort-Object Name)
  if ($files.Count -eq 0) { $notes += ('SKIP (no json)        : ' + $d.Name); continue }
  $bid = ''
  $src = ''
  $hay = @{}
  $bad = 0
  foreach ($f in $files) {
    $j = $null
    try { $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $bad++; continue }
    if ($null -eq $j.batch -or $null -eq $j.items) { $bad++; continue }
    if ($bid -eq '') { $bid = [string]$j.batch.bulk_batch_id }
    if ($src -eq '' -and $null -ne $j.batch.provenance) { $src = [string]$j.batch.provenance.source }
    foreach ($it in @($j.items)) {
      $qn = 0
      if (-not [int]::TryParse(([string]$it.question_no), [ref]$qn)) { $bad++; continue }
      $hay[$qn] = (([string]$it.source_note) + ' ' + ([string]$it.question_text))
    }
  }
  if ($bad -gt 0) { $notes += ('WARN (unreadable ' + $bad + ') : ' + $d.Name) }
  if ($hay.Count -eq 0) { $notes += ('SKIP (no usable items): ' + $d.Name); continue }
  $batches += [pscustomobject]@{ Folder = $d.Name; BatchId = $bid; Source = $src; Hay = $hay }
}
if ($batches.Count -eq 0) { throw 'REFUSED: no batch produced usable items (input structure not recognised)' }

# ---------------- score
$report = @()
$report += 'TRANSCRIPT -> SET identification  (content only, D1 not consulted)'
$report += ('root    : ' + $TranscriptRoot)
$report += ('headers : ' + $Headers + '   sets: ' + ($setNames -join ' '))
$report += ''
foreach ($n in $notes) { $report += $n }
if ($notes.Count -gt 0) { $report += '' }

$hdr = 'batch_id'.PadRight(34) + 'n'.PadLeft(5) + '  '
foreach ($s in $setNames) { $hdr += $s.PadLeft(8) }
$report += $hdr
$report += ('-' * $hdr.Length)

$summary = @()
foreach ($b in $batches) {
  $qns = @($b.Hay.Keys | Sort-Object)
  $scores = @{}
  foreach ($s in $setNames) {
    $tot = 0.0
    $cnt = 0
    foreach ($q in $qns) {
      if (-not $setLabels[$s].ContainsKey($q)) { continue }
      $lb = Get-Bigrams $setLabels[$s][$q]
      $hb = Get-Bigrams $b.Hay[$q]
      $c = Get-Containment $lb $hb
      if ($c -lt 0) { continue }
      $tot += $c
      $cnt++
    }
    if ($cnt -eq 0) { $scores[$s] = 0.0 } else { $scores[$s] = ($tot / $cnt) }
  }
  $line = ([string]$b.BatchId).PadRight(34) + ([string]$qns.Count).PadLeft(5) + '  '
  foreach ($s in $setNames) {
    $v = [math]::Round($scores[$s], 4)
    $line += ([string]$v).PadLeft(8)
  }
  $report += $line

  $ranked = @($setNames | Sort-Object -Property @{Expression = { $scores[$_] }} -Descending)
  $best = $ranked[0]
  $second = $ranked[1]
  $bv = $scores[$best]
  $sv = $scores[$second]
  $margin = 0.0
  if ($sv -gt 0) { $margin = ($bv / $sv) }
  $summary += [pscustomobject]@{ BatchId = $b.BatchId; Folder = $b.Folder; Source = $b.Source; Best = $best; BestVal = $bv; Second = $second; SecondVal = $sv; Margin = $margin; N = $qns.Count }
}

$report += ''
$report += 'PER-BATCH VERDICT'
$report += ('-' * 78)
$agree0 = 0
$agree1 = 0
$undec = 0
$other = 0
foreach ($u in $summary) {
  $bn = -1
  if ($u.BatchId -match 'simpy-(\d\d)$') { $bn = [int]$matches[1] }
  $verdict = ''
  if ($u.Margin -lt $MinMargin) { $verdict = 'UNDECIDED (margin below gate)'; $undec++ }
  elseif ($bn -lt 0) { $verdict = 'BATCHNUM-UNREADABLE (id truncated?)'; $other++ }
  elseif ($u.Best -eq ('set' + $bn.ToString('00'))) { $verdict = 'OFFSET-0  content == set of same number'; $agree0++ }
  elseif ($u.Best -eq ('set' + ($bn + 1).ToString('00'))) { $verdict = 'OFFSET+1  content == next set'; $agree1++ }
  else { $verdict = 'NEITHER'; $other++ }
  $report += ('batch   : ' + $u.BatchId + '    folder: ' + $u.Folder)
  $report += ('source  : ' + $u.Source)
  $report += ('items   : ' + $u.N)
  $report += ('best    : ' + $u.Best + ' ' + [math]::Round($u.BestVal, 4) + '    second: ' + $u.Second + ' ' + [math]::Round($u.SecondVal, 4) + '    margin: ' + [math]::Round($u.Margin, 3))
  $report += ('verdict : ' + $verdict)
  $report += ''
}
$report += ('TOTALS   offset-0: ' + $agree0 + '   offset+1: ' + $agree1 + '   undecided: ' + $undec + '   other: ' + $other)

$out = ($report -join [Environment]::NewLine)
Write-Output $out
if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, $out, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('report written: ' + $ReportPath)
}
