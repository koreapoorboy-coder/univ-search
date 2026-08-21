# ASCII ONLY (standing rule). Extract per-item type headers from a worksheet PDF.
#
# WHY THIS EXISTS (review ruling 13/14, path A, 2026-08-21):
#   Only set04 and set09 were ever ingested, so seven similarity worksheets have no
#   source_type_label anywhere. The labels are printed on the worksheet itself, above
#   every problem, together with the observed accuracy:
#       | <type name> | <accuracy> NN%      | <type name> | <accuracy> NN%
#       01                                    03
#   Reading those headers reconstructs question_no -> original type name without
#   transcribing a single problem body.
#
#   pdftoppm (page rendering) is NOT installed here, so the Read tool cannot open the
#   PDF. pdftotext IS present (shipped with Git for Windows) and the headers live in
#   the text layer, so no OCR is involved.
#
# METHOD
#   1 pdftotext -enc UTF-8 -layout   (skipped when -Txt is given)
#   2 per page, find header lines: segments of "| <name> | <accuracy-word> NN%"
#   3 the next line holding exactly as many integers is the matching problem numbers
#   4 pair left-to-right
#
# GATES (fail closed - a partial extraction is not a success)
#   - every problem number appears exactly once
#   - the numbers form the complete run 1..N
#   - N equals -ExpectCount when that is given
#   Any breach prints the offending numbers and writes nothing.
#
# USAGE
#   powershell -File tools\axis_prediction\extract_pdf_type_headers.ps1 -Pdf <file> -Out <csv> -ExpectCount 150
#   powershell -File tools\axis_prediction\extract_pdf_type_headers.ps1 -Txt <file> -Out <csv>

param(
  [string]$Pdf = '',
  [string]$Txt = '',
  [string]$Out = '',
  [int]$ExpectCount = 0,
  [string]$PdfToText = 'C:\Program Files\Git\mingw64\bin\pdftotext.exe',
  [int]$MaxPage = 0
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

if ($Pdf -eq '' -and $Txt -eq '') { throw 'REFUSED: give -Pdf or -Txt' }

if ($Txt -eq '') {
  if (-not (Test-Path $Pdf)) { throw ('input not found: ' + $Pdf) }
  if (-not (Test-Path $PdfToText)) { throw ('REFUSED: pdftotext not found at ' + $PdfToText + ' - path A is not available in this environment') }
  $Txt = [System.IO.Path]::GetTempFileName() + '.txt'
  # NOTE: no -layout. With -layout a long type name wraps across two lines and the
  # accuracy token is split across the line break, which silently drops items.
  # Raw mode puts one header on one line and its problem number on the next.
  & $PdfToText -enc UTF-8 $Pdf $Txt | Out-Null
  if (-not (Test-Path $Txt)) { throw 'REFUSED: pdftotext produced no output' }
  Write-Output ('[pdf ] ' + $Pdf)
}
if (-not (Test-Path $Txt)) { throw ('input not found: ' + $Txt) }

$raw = Get-Content $Txt -Raw -Encoding UTF8
$pages = $raw -split ([char]12)
Write-Output ('[txt ] ' + $Txt + '  chars=' + $raw.Length + '  pages=' + $pages.Count)

# The sheet's "accuracy" word, written as code points to keep this file ASCII.
# Whitespace is allowed BETWEEN its syllables: a line break inside the word survives
# extraction as a space, so a strict match drops exactly the wrapped headers.
$accRe = ([char]0xC815).ToString() + '\s*' + ([char]0xB2F5).ToString() + '\s*' + ([char]0xB960).ToString()
$segRe = '\|\s*([^|]+?)\s*\|\s*' + $accRe + '\s*(\d+)\s*%'

$items = @{}
$dupes = New-Object System.Collections.ArrayList
$pairFail = 0
$lastPage = $pages.Count
if ($MaxPage -gt 0 -and $MaxPage -lt $lastPage) { $lastPage = $MaxPage }

for ($p = 0; $p -lt $lastPage; $p++) {
  $lines = $pages[$p] -split "`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $ms = [regex]::Matches($lines[$i], $segRe)
    if ($ms.Count -eq 0) { continue }
    # find the next line carrying exactly that many integers
    $j = $i + 1; $nums = @()
    while ($j -lt $lines.Count) {
      $cand = @([regex]::Matches($lines[$j], '(?<![\d%])(\d{1,3})(?![\d%])') | ForEach-Object { $_.Groups[1].Value })
      if ($cand.Count -eq $ms.Count) { $nums = $cand; break }
      if ($cand.Count -gt 0) { break }
      $j++
    }
    if ($nums.Count -ne $ms.Count) { $pairFail++; continue }
    for ($k = 0; $k -lt $ms.Count; $k++) {
      $no = [int]$nums[$k]
      $nm = $ms[$k].Groups[1].Value.Trim()
      $ac = [int]$ms[$k].Groups[2].Value
      if ($items.ContainsKey($no)) { [void]$dupes.Add($no) }
      else { $items[$no] = [pscustomobject]@{ no = $no; name = $nm; acc = $ac; page = ($p + 1) } }
    }
    $i = $j
  }
}

$keys = @($items.Keys | Sort-Object)
Write-Output ('[scan] header segments paired into ' + $keys.Count + ' item(s); unpaired header lines = ' + $pairFail)

# ------------------------------------------------- gates
$fail = 0
if ($dupes.Count -gt 0) {
  Write-Output ('[GATE-FAIL] duplicate problem numbers: ' + ((@($dupes | Select-Object -Unique)) -join ','))
  $fail++
} else { Write-Output '[gate] no duplicate problem numbers' }

if ($keys.Count -eq 0) {
  Write-Output '[GATE-FAIL] no header segments found - this file does not carry the expected layout'
  $fail++
} else {
  $lo = $keys[0]; $hi = $keys[$keys.Count - 1]
  $missing = @()
  for ($n = 1; $n -le $hi; $n++) { if (-not $items.ContainsKey($n)) { $missing += $n } }
  if ($lo -ne 1 -or $missing.Count -gt 0) {
    Write-Output ('[GATE-FAIL] run 1..' + $hi + ' is incomplete. missing: ' + ($missing -join ','))
    $fail++
  } else { Write-Output ('[gate] complete run 1..' + $hi) }
  if ($ExpectCount -gt 0 -and $keys.Count -ne $ExpectCount) {
    Write-Output ('[GATE-FAIL] extracted ' + $keys.Count + ' != -ExpectCount ' + $ExpectCount)
    $fail++
  } elseif ($ExpectCount -gt 0) { Write-Output ('[gate] count = ' + $ExpectCount) }
}

if ($fail -gt 0) { throw ('ABORT: ' + $fail + ' gate(s) failed - partial extraction is not a success, nothing written.') }

Write-Output ('[ok  ] ' + $keys.Count + ' items extracted, ' + (@($items.Values | Select-Object -ExpandProperty name -Unique)).Count + ' distinct type names')

if ($Out -ne '') {
  $rows = New-Object System.Collections.ArrayList
  [void]$rows.Add('question_no,page,accuracy_percent,source_type_label')
  foreach ($n in $keys) {
    $it = $items[$n]
    [void]$rows.Add(('{0:D3},{1},{2},"{3}"' -f $it.no, $it.page, $it.acc, ($it.name -replace '"', '""')))
  }
  [System.IO.File]::WriteAllText($Out, (($rows -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('[out ] ' + $Out)
}
