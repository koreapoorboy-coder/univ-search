# ASCII ONLY (standing rule). Insert new problem_type entries into a catalog JSON by
# SURGICAL TEXT SPLICE - never by full reserialization.
#
# WHY THIS EXISTS (review ruling 20 section 0/1, 2026-08-21):
#   The catalog was produced by ConvertTo-Json. Reading it back and re-emitting it would
#   unwrap single-element arrays (documented repo bug), silently turning
#   "response_formats": ["single_choice"] into a scalar across dozens of untouched
#   entries. So the only safe edit is to splice whole lines of text and leave every
#   existing byte alone.
#
# METHOD
#   The patch file (UTF-8 JSON) carries VALUES only - no layout, no Korean literals in
#   this script. The tool renders each entry block itself using the catalog's own
#   indentation, splices it in front of the named successor entry, and bumps the count
#   field. Field order and field set are fixed here so a new entry cannot drift from the
#   87 that already exist.
#
# FAIL CLOSED - every one of these must pass or the original file is restored:
#   1 whole file parses as JSON
#   2 problem_types count == old + inserted
#   3 every new entry carries exactly the reference field set, in the reference order
#   4 U+FFFD count is 0
#   5 REVERSAL: strip the inserted line blocks and restore the count line, and the result
#     must be byte-identical to the original. This is the check that proves nothing else
#     moved.
#
# USAGE
#   powershell -File tools\axis_prediction\add_catalog_entries.ps1 -Catalog <json> -PatchFile <json> -BackupDir <dir> [-DryRun]

param(
  [Parameter(Mandatory=$true)][string]$Catalog,
  [Parameter(Mandatory=$true)][string]$PatchFile,
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

foreach ($p in @($Catalog, $PatchFile)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }

$FIELD_ORDER = @(
  'problem_type_id', 'grade', 'unit_id', 'unit_name', 'type_name', 'type_name_source',
  'concept_ids', 'error_tags', 'response_formats', 'representation_types',
  'problem_family_id', 'attested_item_ids', 'attested_in_sets', 'status'
)

$IND_BRACE = (' ' * 26)
$IND_FIELD = (' ' * 30)
$NL = "`r`n"

function Esc([string]$s) { return ($s -replace '\\', '\\' -replace '"', '\"') }

function Render-Entry($e) {
  $lines = @()
  $lines += ($IND_BRACE + '{')
  $lines += ($IND_FIELD + '"problem_type_id":  "' + (Esc $e.problem_type_id) + '",')
  $lines += ($IND_FIELD + '"grade":  "' + (Esc $e.grade) + '",')
  $lines += ($IND_FIELD + '"unit_id":  "' + (Esc $e.unit_id) + '",')
  $lines += ($IND_FIELD + '"unit_name":  "' + (Esc $e.unit_name) + '",')
  $lines += ($IND_FIELD + '"type_name":  "' + (Esc $e.type_name) + '",')
  $lines += ($IND_FIELD + '"type_name_source":  "' + (Esc $e.type_name_source) + '",')
  $lines += ($IND_FIELD + '"concept_ids":  "' + (Esc $e.concept_ids) + '",')
  $lines += ($IND_FIELD + '"error_tags":  null,')
  $lines += ($IND_FIELD + '"response_formats":  [],')
  $lines += ($IND_FIELD + '"representation_types":  [],')
  $lines += ($IND_FIELD + '"problem_family_id":  "M2_SIMPY_FAM_' + (Esc $e.problem_type_id) + '",')
  $lines += ($IND_FIELD + '"attested_item_ids":  [],')
  # array field: elements align to the column just after the opening bracket
  $head = '"attested_in_sets":  ['
  $col = $IND_FIELD.Length + $head.Length
  $indEl = (' ' * ($col + 4))
  $indClose = (' ' * $col)
  $lines += ($IND_FIELD + $head)
  $sets = @($e.attested_in_sets)
  for ($i = 0; $i -lt $sets.Count; $i++) {
    $tail = ','
    if ($i -eq ($sets.Count - 1)) { $tail = '' }
    $lines += ($indEl + '"' + (Esc ([string]$sets[$i])) + '"' + $tail)
  }
  $lines += ($indClose + '],')
  $lines += ($IND_FIELD + '"status":  "raw_registered_not_wired"')
  $lines += ($IND_BRACE + '}')
  return ($lines -join $NL)
}

# ---------------- load
$orig = [System.IO.File]::ReadAllText($Catalog)
$patch = Get-Content $PatchFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -eq $patch.entries) { throw ('REFUSED: patch has no entries: ' + $PatchFile) }
$entries = @($patch.entries)
if ($entries.Count -eq 0) { throw 'REFUSED: patch entries is empty' }

$cat0 = $orig | ConvertFrom-Json
if ($null -eq $cat0.problem_types) { throw ('REFUSED: not a problem_types catalog: ' + $Catalog) }
$before = @($cat0.problem_types).Count
$refFields = @($cat0.problem_types[0].PSObject.Properties.Name)
if (($refFields -join ',') -ne ($FIELD_ORDER -join ',')) {
  throw ('REFUSED: catalog field set differs from this tool''s fixed order. catalog=' + ($refFields -join ',') )
}

$oldCountLine = '    "' + $patch.count_field + '":  ' + $patch.old_count + ','
$newCountLine = '    "' + $patch.count_field + '":  ' + $patch.new_count + ','
if ($orig.IndexOf($oldCountLine) -lt 0) { throw ('REFUSED: count line not found verbatim: ' + $oldCountLine) }

# ---------------- splice
$text = $orig
$blocks = @()
foreach ($e in $entries) {
  foreach ($f in @('problem_type_id', 'insert_before', 'type_name', 'concept_ids')) {
    if ([string]::IsNullOrEmpty([string]$e.$f)) { throw ('REFUSED: patch entry missing ' + $f) }
  }
  if ($text.IndexOf('"problem_type_id":  "' + $e.problem_type_id + '"') -ge 0) {
    throw ('REFUSED: ' + $e.problem_type_id + ' already exists in catalog')
  }
  $anchor = '"problem_type_id":  "' + $e.insert_before + '"'
  $at = $text.IndexOf($anchor)
  if ($at -lt 0) { throw ('REFUSED: successor not found: ' + $e.insert_before) }
  $openTok = $NL + $IND_BRACE + '{' + $NL
  $open = $text.LastIndexOf($openTok, $at)
  if ($open -lt 0) { throw ('REFUSED: could not locate entry opening brace before ' + $e.insert_before) }
  $insertAt = $open + $NL.Length
  $block = (Render-Entry $e) + ',' + $NL
  $blocks += $block
  $text = $text.Substring(0, $insertAt) + $block + $text.Substring($insertAt)
}
$text = $text.Replace($oldCountLine, $newCountLine)

# ---------------- verify (fail closed)
$fail = @()
$cat1 = $null
try { $cat1 = $text | ConvertFrom-Json } catch { $fail += ('1 PARSE: ' + $_.Exception.Message) }
if ($null -ne $cat1) {
  $after = @($cat1.problem_types).Count
  if ($after -ne ($before + $entries.Count)) { $fail += ('2 COUNT: expected ' + ($before + $entries.Count) + ' got ' + $after) }
  foreach ($e in $entries) {
    $n = @($cat1.problem_types | Where-Object { $_.problem_type_id -eq $e.problem_type_id })
    if ($n.Count -ne 1) { $fail += ('3 MISSING: ' + $e.problem_type_id); continue }
    $got = @($n[0].PSObject.Properties.Name)
    if (($got -join ',') -ne ($FIELD_ORDER -join ',')) { $fail += ('3 FIELDS: ' + $e.problem_type_id + ' -> ' + ($got -join ',')) }
  }
  if ([int]$cat1.$($patch.count_field) -ne [int]$patch.new_count) { $fail += '2 COUNTFIELD not updated' }
}
$fffd = ([regex]::Matches($text, [string][char]0xFFFD)).Count
if ($fffd -ne 0) { $fail += ('4 U+FFFD: ' + $fffd) }

$rev = $text
foreach ($b in $blocks) {
  $i = $rev.IndexOf($b)
  if ($i -lt 0) { $fail += '5 REVERSAL: inserted block not found'; break }
  $rev = $rev.Remove($i, $b.Length)
}
$rev = $rev.Replace($newCountLine, $oldCountLine)
if ($rev -ne $orig) { $fail += '5 REVERSAL: residual difference outside the inserted blocks' }

Write-Output ('[in ] catalog ' + $Catalog)
Write-Output ('[in ] patch   ' + $PatchFile)
Write-Output ('entries before : ' + $before)
Write-Output ('entries to add : ' + $entries.Count)
foreach ($e in $entries) { Write-Output ('   + ' + $e.problem_type_id + '  before ' + $e.insert_before + '  ' + $e.type_name) }
Write-Output ''
Write-Output 'VERIFY'
Write-Output ('  1 parse            : ' + $(if ($null -ne $cat1) { 'ok' } else { 'FAIL' }))
Write-Output ('  2 count            : ' + $(if ($null -ne $cat1) { $before.ToString() + ' -> ' + @($cat1.problem_types).Count } else { 'n/a' }))
Write-Output ('  3 field set/order  : ' + $(if (@($fail | Where-Object { $_ -like '3 *' }).Count -eq 0) { 'ok (14 fields, reference order)' } else { 'FAIL' }))
Write-Output ('  4 U+FFFD           : ' + $fffd)
Write-Output ('  5 reversal         : ' + $(if (@($fail | Where-Object { $_ -like '5 *' }).Count -eq 0) { 'ok (untouched bytes identical)' } else { 'FAIL' }))

if ($fail.Count -gt 0) {
  Write-Output ''
  foreach ($f in $fail) { Write-Output ('  !! ' + $f) }
  throw ('REFUSED: ' + $fail.Count + ' verification(s) failed. Catalog NOT modified.')
}

if ($DryRun) { Write-Output ''; Write-Output 'DRY RUN - catalog not written.'; exit 0 }

if ($BackupDir -ne '') {
  if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
  $bk = Join-Path $BackupDir ([System.IO.Path]::GetFileName($Catalog) + '.pre-add-' + $entries.Count + 'entries')
  Copy-Item $Catalog $bk -Force
  Write-Output ('backup: ' + $bk)
}
[System.IO.File]::WriteAllText($Catalog, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ('written: ' + $Catalog)
