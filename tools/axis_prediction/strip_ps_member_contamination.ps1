# ASCII ONLY (standing rule). Remove PowerShell array-member NAMES that were serialized
# into a catalog array field as if they were values.
#
# WHY THIS EXISTS (review ruling 21 section 7, 2026-08-21):
#   Accessing .Property on an ARRAY in PowerShell enumerates the array's own members, so
#   Count / IsFixedSize / IsReadOnly / IsSynchronized / Length / LongLength / Rank /
#   SyncRoot end up written as data. The result is valid JSON and parses cleanly, which
#   is why it survived until CHECK 9 was built. Detector first, repair second.
#
# METHOD
#   Text-surgical, like add_catalog_entries.ps1. The catalog was produced by
#   ConvertTo-Json and holds single-element arrays, so a parse/re-emit round trip would
#   unwrap them and damage entries this repair never touched. Instead each target array
#   block is located in the raw text, rewritten in place with the file's own indentation,
#   and everything outside those blocks is left byte-for-byte alone.
#
#   IMPORTANT - case-SENSITIVE match only. "length" and "count" are legitimate values in
#   response_formats; a case-insensitive match reported 2 false positives when CHECK 9
#   was first built.
#
# FAIL CLOSED - all must pass or nothing is written:
#   1 whole file parses
#   2 entry count unchanged
#   3 zero member names remain in the target field
#   4 every surviving value is one that was already there, in the original order
#   5 U+FFFD count 0
#   6 REVERSAL: put the old blocks back and the result is byte-identical to the original
#
# USAGE
#   powershell -File tools\axis_prediction\strip_ps_member_contamination.ps1 -Catalog <json> -Field representation_types [-BackupDir <dir>] [-DryRun]

param(
  [Parameter(Mandatory=$true)][string]$Catalog,
  [string]$Field = 'representation_types',
  [string]$BackupDir = '',
  [switch]$DryRun
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

if (-not (Test-Path $Catalog)) { throw ('input not found: ' + $Catalog) }
if ($Field -notmatch '^[a-z_]+$') { throw ('REFUSED: implausible field name: ' + $Field) }

$PS_MEMBERS = @('Count', 'IsFixedSize', 'IsReadOnly', 'IsSynchronized', 'Length', 'LongLength', 'Rank', 'SyncRoot')
$NL = "`r`n"
$IND_FIELD = (' ' * 30)

$orig = [System.IO.File]::ReadAllText($Catalog)
$cat0 = $orig | ConvertFrom-Json
if ($null -eq $cat0.problem_types) { throw ('REFUSED: not a problem_types catalog: ' + $Catalog) }
$before = @($cat0.problem_types).Count
if (-not (@($cat0.problem_types[0].PSObject.Properties.Name) -contains $Field)) {
  throw ('REFUSED: entries have no field ' + $Field)
}

$head = '"' + $Field + '":  ['
$col = $IND_FIELD.Length + $head.Length
$indEl = (' ' * ($col + 4))
$indClose = (' ' * $col)

# array blocks: elements are plain strings, so there is no nested bracket to worry about
$rx = [regex]('"' + [regex]::Escape($Field) + '":  \[[^\]]*\]')
$matches = @($rx.Matches($orig))
if ($matches.Count -eq 0) { throw ('REFUSED: no ' + $Field + ' array blocks found - is the layout what this tool expects?') }

$sb = New-Object System.Text.StringBuilder
$pos = 0
$pairs = @()
$removedTotal = 0
$entriesTouched = 0
foreach ($m in $matches) {
  [void]$sb.Append($orig.Substring($pos, $m.Index - $pos))
  $old = $m.Value
  $vals = @()
  foreach ($vm in ([regex]'"((?:[^"\\]|\\.)*)"').Matches($old.Substring($head.Length - 1))) {
    $vals += $vm.Groups[1].Value
  }
  $kept = @($vals | Where-Object { $PS_MEMBERS -cnotcontains $_ })
  $removed = $vals.Count - $kept.Count
  if ($removed -gt 0) { $entriesTouched++; $removedTotal += $removed }
  if ($kept.Count -eq 0) {
    $new = $head + ']'
  } else {
    $lines = @($head)
    for ($i = 0; $i -lt $kept.Count; $i++) {
      $tail = ','
      if ($i -eq ($kept.Count - 1)) { $tail = '' }
      $lines += ($indEl + '"' + $kept[$i] + '"' + $tail)
    }
    $lines += ($indClose + ']')
    $new = ($lines -join $NL)
  }
  [void]$sb.Append($new)
  $pairs += [pscustomobject]@{ Old = $old; New = $new; Vals = $vals; Kept = $kept }
  $pos = $m.Index + $m.Length
}
[void]$sb.Append($orig.Substring($pos))
$text = $sb.ToString()

# ---------------- verify (fail closed)
$fail = @()
$cat1 = $null
try { $cat1 = $text | ConvertFrom-Json } catch { $fail += ('1 PARSE: ' + $_.Exception.Message) }
if ($null -ne $cat1) {
  $after = @($cat1.problem_types).Count
  if ($after -ne $before) { $fail += ('2 COUNT: ' + $before + ' -> ' + $after) }
  $left = 0
  foreach ($e in @($cat1.problem_types)) {
    foreach ($el in @($e.$Field)) { if ($PS_MEMBERS -ccontains ([string]$el)) { $left++ } }
  }
  if ($left -ne 0) { $fail += ('3 RESIDUAL: ' + $left + ' member name(s) still present') }
}
foreach ($p in $pairs) {
  $expect = @($p.Vals | Where-Object { $PS_MEMBERS -cnotcontains $_ })
  if (($expect -join "`t") -ne (@($p.Kept) -join "`t")) { $fail += '4 ORDER: surviving values are not the original ones in order' }
}
$fffd = ([regex]::Matches($text, [string][char]0xFFFD)).Count
if ($fffd -ne 0) { $fail += ('5 U+FFFD: ' + $fffd) }

$rev = $text
$ok6 = $true
foreach ($p in $pairs) {
  $i = $rev.IndexOf($p.New)
  if ($i -lt 0) { $ok6 = $false; break }
  $rev = $rev.Remove($i, $p.New.Length).Insert($i, $p.Old)
}
if (-not $ok6 -or $rev -ne $orig) { $fail += '6 REVERSAL: restoring the old blocks does not reproduce the original bytes' }

Write-Output ('[in ] ' + $Catalog)
Write-Output ('field            : ' + $Field)
Write-Output ('entries          : ' + $before)
Write-Output ('array blocks     : ' + $matches.Count)
Write-Output ('entries cleaned  : ' + $entriesTouched)
Write-Output ('elements removed : ' + $removedTotal)
Write-Output ''
Write-Output 'VERIFY'
Write-Output ('  1 parse           : ' + $(if ($null -ne $cat1) { 'ok' } else { 'FAIL' }))
Write-Output ('  2 entry count     : ' + $(if (@($fail | Where-Object { $_ -like '2 *' }).Count -eq 0) { 'unchanged ' + $before } else { 'FAIL' }))
Write-Output ('  3 residual names  : ' + $(if (@($fail | Where-Object { $_ -like '3 *' }).Count -eq 0) { '0' } else { 'FAIL' }))
Write-Output ('  4 value order     : ' + $(if (@($fail | Where-Object { $_ -like '4 *' }).Count -eq 0) { 'ok (survivors are originals, in order)' } else { 'FAIL' }))
Write-Output ('  5 U+FFFD          : ' + $fffd)
Write-Output ('  6 reversal        : ' + $(if (@($fail | Where-Object { $_ -like '6 *' }).Count -eq 0) { 'ok (untouched bytes identical)' } else { 'FAIL' }))

if ($fail.Count -gt 0) {
  Write-Output ''
  foreach ($f in $fail) { Write-Output ('  !! ' + $f) }
  throw ('REFUSED: ' + $fail.Count + ' verification(s) failed. Catalog NOT modified.')
}
if ($DryRun) { Write-Output ''; Write-Output 'DRY RUN - catalog not written.'; exit 0 }
if ($BackupDir -ne '') {
  if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
  $bk = Join-Path $BackupDir ([System.IO.Path]::GetFileName($Catalog) + '.pre-strip-' + $Field)
  Copy-Item $Catalog $bk -Force
  Write-Output ('backup: ' + $bk)
}
[System.IO.File]::WriteAllText($Catalog, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ('written: ' + $Catalog)
