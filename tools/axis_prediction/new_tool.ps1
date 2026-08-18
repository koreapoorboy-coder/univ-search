# ASCII ONLY (standing rule).
# Scaffolder for new axis_prediction tools.
#
# WHY THIS EXISTS (review directive 2026-08-18):
#   The "keep .ps1 ASCII-only" rule was violated twice in one session, both times while
#   writing a NEW script. Rules that depend on human attention have relapsed every time in
#   this project (push omitted 3x, batch id 4x, Korean literal 2x); rules enforced by tools
#   have not (denominator auto-emitted, _meta editor). So the ASCII check is enforced in the
#   tool itself, and new tools start with that enforcement already in place.
#
# USAGE:
#   .\new_tool.ps1 -Name my_new_tool.ps1 [-Purpose "one line description"]
#
# The generated file:
#   - carries the ASCII SELF-CHECK block (refuses to run if it ever contains non-ASCII)
#   - has param() + $ErrorActionPreference already ordered correctly
#   - is written without BOM, LF-safe

param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Purpose = 'TODO: describe what this tool measures or edits.',
  [string]$Dir = 'C:\Users\user\projects\scshstudy\tools\axis_prediction'
)
$ErrorActionPreference = 'Stop'

# --- ASCII SELF-CHECK (standing rule, enforced in-tool 2026-08-18) ---------
# WHY: a BOM-less .ps1 containing Korean literals is read as ANSI by PS 5.1 and the
# strings are corrupted BEFORE the script runs. No error is raised; the broken value
# is written into data and even passes JSON parsing (real incident: 261 rows).
# The rule "keep .ps1 ASCII-only" was violated twice despite being documented, so it
# is enforced here instead of relied on: this script refuses to run while polluted.
# Non-ASCII text belongs in a UTF-8 data/patch file, or as \uXXXX regex escapes.
$__selfPath = $MyInvocation.MyCommand.Path
if ($__selfPath -and (Test-Path $__selfPath)) {
  $__bad = @([System.IO.File]::ReadAllBytes($__selfPath) | Where-Object { $_ -gt 127 }).Count
  if ($__bad -gt 0) {
    throw ("ASCII RULE VIOLATION: " + [System.IO.Path]::GetFileName($__selfPath) + " contains " + $__bad + " non-ASCII byte(s). PS 5.1 corrupts them before execution. Use \uXXXX escapes or move the text to a UTF-8 data file.")
  }
}
# --- end ASCII SELF-CHECK --------------------------------------------------

if ($Name -notmatch '\.ps1$') { throw "Name must end with .ps1 : $Name" }
if ($Name -match '[^\x20-\x7E]') { throw "Name must be ASCII: $Name" }
if ($Purpose -match '[^\x20-\x7E]') {
  throw "Purpose must be ASCII (this text goes into a .ps1 header). Put Korean in a data file instead."
}
$target = Join-Path $Dir $Name
if (Test-Path $target) { throw "already exists: $target" }

# IMPORTANT: every element that uses '+' MUST be parenthesized. In PowerShell the comma
# operator binds TIGHTER than '+', so `'a' + $x, 'b'` parses as `'a' + ('b' ...)` and the
# array silently regroups into nested arrays / a single joined string. That is what
# produced the one-line scaffold bug (2026-08-18).
$body = @(
  ('# ASCII ONLY (standing rule). ' + $Purpose),
  '#',
  '# USAGE:',
  ('#   .\' + $Name + ' -Example <value>'),
  '',
  'param(',
  ('  [string]$Example = ' + [string][char]39 + 'TODO' + [string][char]39),
  ')',
  "`$ErrorActionPreference = 'Stop'",
  '',
  '# --- ASCII SELF-CHECK (standing rule, enforced in-tool 2026-08-18) ---------',
  '# WHY: a BOM-less .ps1 containing Korean literals is read as ANSI by PS 5.1 and the',
  '# strings are corrupted BEFORE the script runs. No error is raised; the broken value',
  '# is written into data and even passes JSON parsing (real incident: 261 rows).',
  '# Do not remove this block. Non-ASCII text belongs in a UTF-8 data/patch file,',
  '# or as \uXXXX regex escapes.',
  '# KNOWN BLIND SPOT: if the script is executed without a file path (content piped into',
  '# powershell), MyInvocation.MyCommand.Path is null and the check is skipped. Always',
  '# invoke tools as: powershell -File <path> [args]',
  '$__selfPath = $MyInvocation.MyCommand.Path',
  'if ($__selfPath -and (Test-Path $__selfPath)) {',
  '  $__bad = @([System.IO.File]::ReadAllBytes($__selfPath) | Where-Object { $_ -gt 127 }).Count',
  '  if ($__bad -gt 0) {',
  '    throw ("ASCII RULE VIOLATION: " + [System.IO.Path]::GetFileName($__selfPath) + " contains " + $__bad + " non-ASCII byte(s). PS 5.1 corrupts them before execution. Use \uXXXX escapes or move the text to a UTF-8 data file.")',
  '  }',
  '}',
  '# --- end ASCII SELF-CHECK --------------------------------------------------',
  '',
  '# TODO: implement.',
  'Write-Output ("scaffold ok: " + $Example)'
)

# IMPORTANT: join explicitly and use WriteAllText. Do NOT pass an object[] to WriteAllLines here:
# in PS 5.1 the overload binder collapsed it to a single space-joined string, producing a
# ONE-LINE file. Because line 1 starts with '#', the entire generated script became a
# comment: it ran, exited 0, and printed nothing - a silent wrong-output failure that the
# byte-level ASCII check could not see (found by test 2026-08-18).
$text = ($body -join "`r`n") + "`r`n"
[System.IO.File]::WriteAllText($target, $text, (New-Object System.Text.UTF8Encoding($false)))

# --- verify the generated file, not just its bytes ---------------------------
$bad = @([System.IO.File]::ReadAllBytes($target) | Where-Object { $_ -gt 127 }).Count
$lineCount = @([System.IO.File]::ReadAllLines($target)).Count
$hasGuard = ([System.IO.File]::ReadAllText($target)).Contains('ASCII SELF-CHECK')
$ran = ''
try { $ran = (& powershell -File $target -Example 'scaffold-selftest' 2>&1 | Out-String).Trim() } catch { $ran = '' }
$runOk = $ran -match 'scaffold ok: scaffold-selftest'

if ($bad -gt 0 -or $lineCount -lt 10 -or -not $hasGuard -or -not $runOk) {
  Remove-Item $target -Force
  throw ("generated file failed verification (nonascii=$bad lines=$lineCount guard=$hasGuard runs=$runOk) - removed. Output was: " + $ran)
}
Write-Output ("[created] " + $target)
Write-Output ("[verified] non-ASCII=0 / lines=" + $lineCount + " / ASCII SELF-CHECK present / executes correctly")
Write-Output ("[reminder] run tools as: powershell -File <path> [args]")
