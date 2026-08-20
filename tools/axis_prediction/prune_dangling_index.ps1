# ASCII ONLY (standing rule). Prune dangling data/ pointers from index.v1.json.
#
# WHY THIS EXISTS (commit A, review-approved 2026-08-20):
#   index.v1.json declares per-unit pointers to data files. 27 of them point at
#   files that do not exist. Review ruling: remove the key entirely (NOT null),
#   and report the removed list separately.
#
# SAFETY MODEL
#   - Line-based deletion only. No ConvertTo-Json re-serialization anywhere
#     (single-element-array unwrap bug). Korean bytes are never rewritten.
#   - Structure guard: refuses input that is not an index.v1.json shaped file.
#   - Post-gates: JSON parses / unit count unchanged / non-ASCII byte count
#     unchanged / U+FFFD count 0 / only intended lines removed.
#   - Dry run by default. -Apply writes, after a timestamped backup.
#
# USAGE
#   powershell -File tools\axis_prediction\prune_dangling_index.ps1
#   powershell -File tools\axis_prediction\prune_dangling_index.ps1 -Apply
#   powershell -File tools\axis_prediction\prune_dangling_index.ps1 -Path <file> -Root <dir>

param(
  [string]$Repo = 'C:\Users\user\projects\scshstudy',
  [string]$Path = '',
  [string]$Root = '',
  [string]$ReportPath = '',
  [string]$BackupPath = '',
  [switch]$Apply,
  [switch]$Force
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

if ($Root -eq '') { $Root = Join-Path $Repo 'public\math-weakness-engine' }
if ($Path -eq '') { $Path = Join-Path $Root 'data\index.v1.json' }
if (-not (Test-Path $Path)) { throw ("input not found: " + $Path) }
if (-not (Test-Path $Root)) { throw ("root not found: " + $Root) }

$rawBefore = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)

# ------------------------------------------------- structure guard (test 3)
$parsedBefore = $null
try { $parsedBefore = $rawBefore | ConvertFrom-Json }
catch { throw ("REFUSED: input is not valid JSON: " + $Path) }
if ($null -eq $parsedBefore.units) {
  throw ("REFUSED: no 'units' member - this tool only edits index.v1.json shaped files: " + $Path)
}
$unitsBefore = @($parsedBefore.units)
if ($unitsBefore.Count -eq 0) { throw ("REFUSED: 'units' is empty: " + $Path) }
$withId = @($unitsBefore | Where-Object { $_.unit_id }).Count
if ($withId -ne $unitsBefore.Count) {
  throw ("REFUSED: " + ($unitsBefore.Count - $withId) + " unit(s) lack unit_id - unexpected shape: " + $Path)
}

Write-Output ("[in ] " + $Path)
Write-Output ("[in ] units=" + $unitsBefore.Count + " lines=" + (($rawBefore -split "`n").Count))

# ------------------------------------------------- collect dangling pointers
$targets = New-Object System.Collections.ArrayList
$checked = 0
foreach ($u in $unitsBefore) {
  foreach ($p in $u.PSObject.Properties) {
    $v = $p.Value
    if ($v -isnot [string]) { continue }
    if ($v -notmatch '^data/') { continue }
    $checked++
    if (-not (Test-Path (Join-Path $Root $v))) {
      [void]$targets.Add([pscustomobject]@{ unit = $u.unit_id; key = $p.Name; path = $v })
    }
  }
}
Write-Output ("[scan] dangling=" + $targets.Count + " / data-pointers=" + $checked)
if ($targets.Count -eq 0) { Write-Output '[done] nothing to prune.'; exit 0 }

# blast-radius guard: a wrong -Root makes EVERY pointer look dangling.
# a real pointer-rot set is a small minority. refuse anything larger.
$ratio = [math]::Round(100.0 * $targets.Count / [math]::Max($checked, 1), 1)
if ($ratio -gt 25.0 -and -not $Force) {
  throw ("REFUSED: " + $targets.Count + " of " + $checked + " pointers (" + $ratio + "%) look dangling. " +
         "That is a resolution problem (wrong -Root?), not pointer rot. Re-run with -Force only if this is genuinely intended.")
}
Write-Output ("[guard] dangling ratio " + $ratio + "% <= 25% blast-radius limit")

# ------------------------------------------------- locate exact source lines
$lines = $rawBefore -split "`n"
$kill = @{}
foreach ($t in $targets) {
  $pat = '^\s*"' + [regex]::Escape($t.key) + '":\s*"' + [regex]::Escape($t.path) + '",?\s*$'
  $hits = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pat) { $hits += $i }
  }
  if ($hits.Count -ne 1) {
    throw ("REFUSED: expected exactly 1 source line for " + $t.unit + "/" + $t.key + " but found " + $hits.Count + " (no silent skip)")
  }
  $kill[$hits[0]] = $t
}
Write-Output ("[locate] resolved " + $kill.Count + " source line(s), 1:1")

# ------------------------------------------------- rebuild + comma repair
$out = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($kill.ContainsKey($i)) { continue }
  [void]$out.Add($lines[$i])
}
$commaFix = 0
for ($i = 0; $i -lt $out.Count - 1; $i++) {
  $cur = $out[$i]
  if ($cur -notmatch ',\s*$') { continue }
  $j = $i + 1
  while ($j -lt $out.Count -and $out[$j].Trim() -eq '') { $j++ }
  if ($j -ge $out.Count) { continue }
  if ($out[$j].Trim() -match '^[\}\]]') {
    $out[$i] = $cur -replace ',(\s*)$', '$1'
    $commaFix++
  }
}
Write-Output ("[fix ] trailing commas repaired: " + $commaFix)
$rawAfter = ($out -join "`n")

# ------------------------------------------------- post gates
$fail = 0
$parsedAfter = $null
try { $parsedAfter = $rawAfter | ConvertFrom-Json }
catch { Write-Output ("[GATE-FAIL] result does not parse: " + $_.Exception.Message); $fail++ }

if ($parsedAfter) {
  $unitsAfter = @($parsedAfter.units)
  if ($unitsAfter.Count -ne $unitsBefore.Count) {
    Write-Output ("[GATE-FAIL] unit count " + $unitsBefore.Count + " -> " + $unitsAfter.Count); $fail++
  } else { Write-Output ("[gate] unit count unchanged: " + $unitsAfter.Count) }

  $keysBefore = 0; foreach ($u in $unitsBefore) { $keysBefore += @($u.PSObject.Properties).Count }
  $keysAfter  = 0; foreach ($u in $unitsAfter)  { $keysAfter  += @($u.PSObject.Properties).Count }
  if (($keysBefore - $keysAfter) -ne $targets.Count) {
    Write-Output ("[GATE-FAIL] key delta " + ($keysBefore - $keysAfter) + " != expected " + $targets.Count); $fail++
  } else { Write-Output ("[gate] key delta = " + $targets.Count + " (keys " + $keysBefore + " -> " + $keysAfter + ")") }
}

$naBefore = @([System.Text.Encoding]::UTF8.GetBytes($rawBefore) | Where-Object { $_ -gt 127 }).Count
$naAfter  = @([System.Text.Encoding]::UTF8.GetBytes($rawAfter)  | Where-Object { $_ -gt 127 }).Count
if ($naBefore -ne $naAfter) {
  Write-Output ("[GATE-FAIL] non-ASCII byte count " + $naBefore + " -> " + $naAfter + " (Korean text was touched)"); $fail++
} else { Write-Output ("[gate] non-ASCII bytes unchanged: " + $naAfter) }

$fffdChar = [string][char]0xFFFD
$fffdCount = ([regex]::Matches($rawAfter, [regex]::Escape($fffdChar))).Count
if ($fffdCount -ne 0) { Write-Output ("[GATE-FAIL] U+FFFD present: " + $fffdCount); $fail++ }
else { Write-Output '[gate] U+FFFD count 0' }

$lineDelta = ($rawBefore -split "`n").Count - ($out.Count)
if ($lineDelta -ne $targets.Count) {
  Write-Output ("[GATE-FAIL] line delta " + $lineDelta + " != " + $targets.Count); $fail++
} else { Write-Output ("[gate] line delta = " + $targets.Count) }

Write-Output ''
Write-Output '=== REMOVED KEYS (report to review; these are unwritten artifacts) ==='
Write-Output ('{0,-26} {1,-26} {2}' -f 'unit_id', 'key', 'path')
foreach ($t in ($targets | Sort-Object unit, key)) {
  Write-Output ('{0,-26} {1,-26} {2}' -f $t.unit, $t.key, $t.path)
}
Write-Output ''

if ($ReportPath -ne '') {
  $rep = New-Object System.Collections.ArrayList
  [void]$rep.Add('unit_id,key,path')
  foreach ($t in ($targets | Sort-Object unit, key)) { [void]$rep.Add(($t.unit + ',' + $t.key + ',' + $t.path)) }
  [System.IO.File]::WriteAllText($ReportPath, (($rep -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ("[report] " + $ReportPath)
}

if ($fail -gt 0) { throw ("ABORT: " + $fail + " gate(s) failed - nothing written.") }

if (-not $Apply) {
  Write-Output '[dry-run] all gates passed. re-run with -Apply to write.'
  exit 0
}

$stamp = (Get-Item $Path).LastWriteTime.ToString('yyyyMMddHHmmss')
$bak = $BackupPath
if ($bak -eq '') { $bak = $Path + '.bak.' + $stamp }
[System.IO.File]::WriteAllText($bak, $rawBefore, (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText($Path, $rawAfter, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("[write] " + $Path)
Write-Output ("[backup] " + $bak)
