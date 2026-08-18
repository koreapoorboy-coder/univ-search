# ASCII ONLY. Safe editor for the _meta section of large prescription JSON files.
#
# WHY THIS EXISTS (2026-08-16, 2 incidents):
#   (1) _meta text edits broke JSON twice (M2_GEOM waver_pairs brace loss 8/15,
#       M2_SIMPY unescaped double-quote 8/16). Text editing structure repeats the failure.
#   (2) PS 5.1 reads a BOM-less .ps1 as ANSI -> Korean literals inside the script are
#       corrupted before they ever reach the data (M2_SIMPY course, 261 rows).
#
# RULES ENFORCED HERE:
#   - No Korean literal may live in this script. All text comes from -PatchFile (UTF-8 JSON).
#   - Only the named section (default "_meta") is touched; prescriptions text is byte-preserved.
#   - After the edit the whole file is parsed. Parse failure -> automatic restore, non-zero exit.
#   - U+FFFD (replacement char) scan runs on every edit; any hit -> automatic restore.
#
# PATCH FILE FORMAT (UTF-8, no BOM):
#   { "edits": [ { "find": "...", "replace": "..." }, ... ] }
#   'find' must occur exactly once inside the section unless "count" is given.
#
# USAGE:
#   .\edit_json_meta.ps1 -File <target.json> -PatchFile <patch.json> [-Section _meta] [-WhatIfOnly]

param(
  [Parameter(Mandatory = $true)][string]$File,
  [Parameter(Mandatory = $true)][string]$PatchFile,
  [string]$Section = '_meta',
  [switch]$WhatIfOnly
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
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $File)) { throw "target not found: $File" }
if (-not (Test-Path $PatchFile)) { throw "patch not found: $PatchFile" }

$text = [System.IO.File]::ReadAllText($File, [System.Text.Encoding]::UTF8)
$patch = Get-Content $PatchFile -Raw -Encoding UTF8 | ConvertFrom-Json
$edits = @($patch.edits)
if ($edits.Count -eq 0) { throw 'patch has no edits' }

# --- locate the section span by brace matching -------------------------------
$key = '"' + $Section + '"'
$k = $text.IndexOf($key)
if ($k -lt 0) { throw "section not found: $Section" }
$open = $text.IndexOf('{', $k)
if ($open -lt 0) { throw "section opening brace not found: $Section" }
$depth = 0; $inStr = $false; $esc = $false; $close = -1
for ($i = $open; $i -lt $text.Length; $i++) {
  $ch = $text[$i]
  if ($inStr) {
    if ($esc) { $esc = $false }
    elseif ($ch -eq '\') { $esc = $true }
    elseif ($ch -eq '"') { $inStr = $false }
    continue
  }
  if ($ch -eq '"') { $inStr = $true; continue }
  if ($ch -eq '{') { $depth++ }
  elseif ($ch -eq '}') { $depth--; if ($depth -eq 0) { $close = $i; break } }
}
if ($close -lt 0) { throw "section closing brace not found: $Section" }

$head = $text.Substring(0, $open)
$body = $text.Substring($open, $close - $open + 1)
$tail = $text.Substring($close + 1)
Write-Output ("[span] $Section chars = " + $body.Length + " / file = " + $text.Length)

# --- apply edits inside the section only -------------------------------------
$applied = 0
foreach ($e in $edits) {
  $find = [string]$e.find
  $repl = [string]$e.replace
  if ([string]::IsNullOrEmpty($find)) { throw 'edit with empty find' }
  $hits = ([regex]::Matches($body, [regex]::Escape($find))).Count
  $want = 1
  if ($null -ne $e.count) { $want = [int]$e.count }
  if ($hits -ne $want) { throw ("find occurs $hits time(s), expected $want :: " + $find.Substring(0, [Math]::Min(60, $find.Length))) }
  $body = $body.Replace($find, $repl)
  $applied++
  Write-Output ("[edit] applied $applied (hits=$hits)")
}

$new = $head + $body + $tail

# --- gate 1: JSON parse -------------------------------------------------------
$parseOk = $true; $parseErr = ''
try { $null = $new | ConvertFrom-Json } catch { $parseOk = $false; $parseErr = $_.Exception.Message }
if (-not $parseOk) { throw ("JSON parse FAILED after edit, file untouched :: " + $parseErr) }

# --- gate 2: U+FFFD scan (encoding damage) ------------------------------------
# NOTE: never write the replacement char as a literal here - this file must stay ASCII.
# *** BUG FIXED 2026-08-18: PowerShell variable names are CASE-INSENSITIVE.
#   $FFFD (the char) and $fffd (the count) were the SAME variable, so the count
#   overwrote the char and the post-write gate escaped 0 -> counted digit "0" (86 hits).
#   Distinct names are mandatory here: $FFFD_CHAR vs $fffdNew/$fffd2.
$FFFD_CHAR = [string][char]0xFFFD
$fffdNew = ([regex]::Matches($new, [regex]::Escape($FFFD_CHAR))).Count
if ($fffdNew -gt 0) { throw ("U+FFFD x $fffdNew found after edit, file untouched (encoding damage)") }

# --- gate 3: prescriptions text must be byte-identical ------------------------
$oldTail = $text.Substring($close + 1)
if ($tail -ne $oldTail) { throw 'tail (prescriptions) changed unexpectedly' }

if ($WhatIfOnly) { Write-Output '[dry-run] all gates passed, nothing written'; exit 0 }

$bk = $File + '.bak'
Copy-Item $File $bk -Force
[System.IO.File]::WriteAllText($File, $new, $utf8)

# --- post-write re-verify -----------------------------------------------------
$check = [System.IO.File]::ReadAllText($File, [System.Text.Encoding]::UTF8)
$ok = $true
try { $null = $check | ConvertFrom-Json } catch { $ok = $false }
$fffd2 = ([regex]::Matches($check, [regex]::Escape($FFFD_CHAR))).Count
if ((-not $ok) -or $fffd2 -gt 0) {
  Copy-Item $bk $File -Force
  throw "post-write verification FAILED (parse=$ok, U+FFFD=$fffd2) -> restored from .bak"
}
Remove-Item $bk -Force
Write-Output ("[done] edits=$applied  parse=OK  U+FFFD=0  prescriptions=byte-identical")
