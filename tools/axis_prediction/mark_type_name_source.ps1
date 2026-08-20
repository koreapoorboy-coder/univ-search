# ASCII ONLY (standing rule). Stamp type_name_source on an assembled catalog.
#
# WHY THIS EXISTS (review ruling #3, 2026-08-20):
#   M3_CIRCLE_PROPERTIES and M3_STATISTICS carry type_name_source="variant_bank"
#   so the reader knows their type_name came from the type_variant_bank assembly,
#   not from curation. M2_SIMILARITY_PYTHAGORAS is the same kind of assembly but
#   carried no marker, so it was read as a finished curated catalog - and the
#   87-type prescription set, the 100% coverage figure and the M1 retag endpoint
#   were all built on top of that reading.
#
# SAFETY MODEL
#   - Line insertion only. No ConvertTo-Json re-serialization (single-element
#     array unwrap bug). Korean bytes are never rewritten. EOL style preserved.
#   - Guards: unit_id must equal -ExpectUnit; entry count must equal the number
#     of type_name lines; refuses if any entry already carries the field.
#   - Post-gates: JSON parses / entry count unchanged / every entry stamped /
#     non-ASCII byte count unchanged / U+FFFD 0 / line delta == entry count.
#   - Dry run by default. -Apply writes, after a backup.
#
# USAGE
#   powershell -File tools\axis_prediction\mark_type_name_source.ps1 -ExpectUnit M2_SIMILARITY_PYTHAGORAS
#   powershell -File tools\axis_prediction\mark_type_name_source.ps1 -ExpectUnit M2_SIMILARITY_PYTHAGORAS -Apply

param(
  [string]$Repo = 'C:\Users\user\projects\scshstudy',
  [string]$Path = '',
  [Parameter(Mandatory=$true)][string]$ExpectUnit,
  [string]$Source = 'variant_bank',
  [int]$ExpectCount = 0,
  [string]$BackupPath = '',
  [switch]$Apply
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

if ($Path -eq '') {
  $Path = Join-Path $Repo 'public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json'
}
if (-not (Test-Path $Path)) { throw ("input not found: " + $Path) }
if ($Source -notmatch '^[a-z0-9_]+$') { throw ("REFUSED: -Source must be a bare ascii token, got: " + $Source) }

$rawBefore = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)

# ------------------------------------------------- structure guard (test 3)
$parsedBefore = $null
try { $parsedBefore = $rawBefore | ConvertFrom-Json }
catch { throw ("REFUSED: input is not valid JSON: " + $Path) }
if ($null -eq $parsedBefore.problem_types) {
  throw ("REFUSED: no 'problem_types' member - this tool only edits problem_types catalogs: " + $Path)
}
$entries = @($parsedBefore.problem_types)
if ($entries.Count -eq 0) { throw ("REFUSED: 'problem_types' is empty: " + $Path) }
if ($parsedBefore.unit_id -ne $ExpectUnit) {
  throw ("REFUSED: unit_id is '" + $parsedBefore.unit_id + "' but -ExpectUnit is '" + $ExpectUnit + "' - wrong file?")
}
$already = @($entries | Where-Object { $_.PSObject.Properties.Name -contains 'type_name_source' }).Count
if ($already -gt 0) {
  throw ("REFUSED: " + $already + " of " + $entries.Count + " entries already carry type_name_source - nothing to do")
}
$noName = @($entries | Where-Object { -not $_.type_name }).Count
if ($noName -gt 0) { throw ("REFUSED: " + $noName + " entry(ies) have no type_name - unexpected shape") }
if ($ExpectCount -gt 0 -and $entries.Count -ne $ExpectCount) {
  throw ("REFUSED: entry count " + $entries.Count + " != -ExpectCount " + $ExpectCount)
}

Write-Output ("[in ] " + $Path)
Write-Output ("[in ] unit=" + $parsedBefore.unit_id + " entries=" + $entries.Count)

# ------------------------------------------------- locate type_name lines
$lines = $rawBefore -split "`n"
$hits = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^(\s*)"type_name":(\s*)"') { $hits += $i }
}
if ($hits.Count -ne $entries.Count) {
  throw ("REFUSED: found " + $hits.Count + " type_name line(s) but " + $entries.Count + " entries - line/entry mismatch, refusing to guess")
}
Write-Output ("[locate] type_name lines = " + $hits.Count + " (1:1 with entries)")

$hitSet = @{}
foreach ($h in $hits) { $hitSet[$h] = $true }

# ------------------------------------------------- insert, preserving EOL
$out = New-Object System.Collections.ArrayList
$inserted = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  [void]$out.Add($lines[$i])
  if (-not $hitSet.ContainsKey($i)) { continue }
  $m = [regex]::Match($lines[$i], '^(\s*)"type_name":(\s*)"')
  $indent = $m.Groups[1].Value
  $gap    = $m.Groups[2].Value
  $cr     = ''
  if ($lines[$i].EndsWith("`r")) { $cr = "`r" }
  # if type_name was the last key of its object it carries no comma; then the
  # comma moves onto it and the inserted line becomes the last key instead.
  $tail = ','
  if ($lines[$i].TrimEnd() -notmatch ',$') {
    $tail = ''
    $out[$out.Count - 1] = ($lines[$i].TrimEnd() + ',' + $cr)
  }
  [void]$out.Add($indent + '"type_name_source":' + $gap + '"' + $Source + '"' + $tail + $cr)
  $inserted++
}
Write-Output ("[edit] inserted " + $inserted + " line(s)")
$rawAfter = ($out -join "`n")

# ------------------------------------------------- post gates
$fail = 0
$parsedAfter = $null
try { $parsedAfter = $rawAfter | ConvertFrom-Json }
catch { Write-Output ("[GATE-FAIL] result does not parse: " + $_.Exception.Message); $fail++ }

if ($parsedAfter) {
  $after = @($parsedAfter.problem_types)
  if ($after.Count -ne $entries.Count) {
    Write-Output ("[GATE-FAIL] entry count " + $entries.Count + " -> " + $after.Count); $fail++
  } else { Write-Output ("[gate] entry count unchanged: " + $after.Count) }

  $stamped = @($after | Where-Object { $_.type_name_source -eq $Source }).Count
  if ($stamped -ne $entries.Count) {
    Write-Output ("[GATE-FAIL] stamped " + $stamped + " / " + $entries.Count); $fail++
  } else { Write-Output ("[gate] stamped " + $stamped + "/" + $entries.Count + " with '" + $Source + "'") }

  $nameChanged = 0
  for ($k = 0; $k -lt $entries.Count; $k++) {
    if ($after[$k].type_name -ne $entries[$k].type_name) { $nameChanged++ }
    if ($after[$k].problem_type_id -ne $entries[$k].problem_type_id) { $nameChanged++ }
  }
  if ($nameChanged -gt 0) {
    Write-Output ("[GATE-FAIL] " + $nameChanged + " id/type_name value(s) changed"); $fail++
  } else { Write-Output '[gate] all problem_type_id / type_name values byte-identical' }
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

$lineDelta = $out.Count - $lines.Count
if ($lineDelta -ne $entries.Count) {
  Write-Output ("[GATE-FAIL] line delta " + $lineDelta + " != " + $entries.Count); $fail++
} else { Write-Output ("[gate] line delta = " + $lineDelta) }

if ($fail -gt 0) { throw ("ABORT: " + $fail + " gate(s) failed - nothing written.") }

if (-not $Apply) {
  Write-Output '[dry-run] all gates passed. re-run with -Apply to write.'
  exit 0
}

$bak = $BackupPath
if ($bak -eq '') { $bak = $Path + '.bak.' + (Get-Item $Path).LastWriteTime.ToString('yyyyMMddHHmmss') }
[System.IO.File]::WriteAllText($bak, $rawBefore, (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText($Path, $rawAfter, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("[write] " + $Path)
Write-Output ("[backup] " + $bak)
