# ASCII ONLY (standing rule). Insert new problem_type entries into ANY catalog JSON by
# SURGICAL TEXT SPLICE, cloning an existing entry in the same file as the layout template.
#
# WHY THIS EXISTS (2026-08-24, circle-properties 46-cell restore)
#   add_catalog_entries.ps1 hardwires the similarity catalog: a fixed 14-field order, a
#   Render-Entry that emits concept_ids as a STRING and error_tags as null, and a
#   M2_SIMPY_FAM_ prefix. The circle-properties catalog has 8 fields in a different
#   order, concept_ids as a one-element ARRAY and error_tags as an empty ARRAY. Run
#   against it, that tool REFUSES at its field-set guard - correctly, by design.
#
#   Generalising Render-Entry by hand would mean hardcoding a second layout, and a third
#   for the next unit. So this tool hardcodes NO layout at all. It copies the text of an
#   existing entry and substitutes only the per-entry values. Indentation, field order,
#   field set and value shapes therefore come from the target file itself and cannot
#   drift from what is already there - the same guarantee the fixed order gave, obtained
#   from the data instead of from this script.
#
#   NOTE: add_catalog_entries.ps1 is NOT modified. The similarity path stays proven.
#
# METHOD
#   1 locate the template entry by problem_type_id, take its exact text block
#   2 for each patch entry, clone that block and replace only the varying field values
#   3 splice each block in front of its named successor entry, ascending
#   4 bump the count field
#
# FAIL CLOSED - every one of these must pass or nothing is written:
#   1 whole file parses as JSON
#   2 problem_types count == old + inserted, and the count field matches
#   3 every new entry carries exactly the TEMPLATE's field set in the TEMPLATE's order,
#     and every field the patch does not vary is byte-equal to the template's
#   4 U+FFFD count is 0
#   5 REVERSAL: strip the inserted blocks and restore the count line, and the result must
#     be byte-identical to the original
#
# NAMING RULE (ruling 25 section 5): no single-letter variables. Three characters minimum.
# EMPTY-RESULT GUARD (ruling 38 section 6): zero entries is a failure, not a no-op.
#
# USAGE
#   powershell -File tools\axis_prediction\add_catalog_entries_by_template.ps1
#       -Catalog <json> -PatchFile <json> -TemplateId <problem_type_id>
#       [-BackupDir <dir>] [-DryRun]
#
# PATCH FILE SHAPE (UTF-8 JSON; values only, no layout)
#   { "count_field": "problem_type_count", "old_count": 47, "new_count": 93,
#     "vary_fields": ["problem_type_id","type_name","default_difficulty"],
#     "concept_id_pattern": "M3_CIRC_C\\d{3}",
#     "entries": [ { "problem_type_id": "...", "insert_before": "...",
#                    "type_name": "...", "default_difficulty": "...",
#                    "concept_id": "..." }, ... ] }

param(
  [Parameter(Mandatory=$true)][string]$Catalog,
  [Parameter(Mandatory=$true)][string]$PatchFile,
  [Parameter(Mandatory=$true)][string]$TemplateId,
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

foreach ($needPath in @($Catalog, $PatchFile)) {
  if (-not (Test-Path $needPath)) { throw ('input not found: ' + $needPath) }
}

# ---------------- load
$orig = [System.IO.File]::ReadAllText($Catalog)
$patch = Get-Content $PatchFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -eq $patch.entries) { throw ('REFUSED: patch has no entries: ' + $PatchFile) }
$entries = @($patch.entries)
if ($entries.Count -eq 0) { throw 'REFUSED: patch entries is empty (EMPTY-RESULT GUARD)' }

$catBefore = $orig | ConvertFrom-Json
if ($null -eq $catBefore.problem_types) { throw ('REFUSED: not a problem_types catalog: ' + $Catalog) }
$countBefore = @($catBefore.problem_types).Count
$refFields = @($catBefore.problem_types[0].PSObject.Properties.Name)

# unit prefix guard (ruling 24 section 7): patch ids must match the catalog's id family
$catPrefix = ''
if ([string]$catBefore.problem_types[0].problem_type_id -match '^(.*PT)\d+$') { $catPrefix = $matches[1] }
foreach ($oneEntry in $entries) {
  if ($catPrefix -ne '' -and ([string]$oneEntry.problem_type_id) -notlike ($catPrefix + '*')) {
    throw ('REFUSED: id family mismatch. catalog uses ' + $catPrefix + 'nnn, patch has ' + $oneEntry.problem_type_id)
  }
}

# ---------------- locate the template block, layout and all
$idTok = '"problem_type_id":  "'
$tmplHit = $orig.IndexOf($idTok + $TemplateId + '"')
if ($tmplHit -lt 0) { throw ('REFUSED: template entry not found: ' + $TemplateId) }
$tmplOpen = $orig.LastIndexOf('{', $tmplHit)
if ($tmplOpen -lt 0) { throw 'REFUSED: could not locate template opening brace' }
$lineStart = $orig.LastIndexOf("`n", $tmplOpen)
if ($lineStart -lt 0) { throw 'REFUSED: could not locate template line start' }
$indBrace = $orig.Substring($lineStart + 1, $tmplOpen - $lineStart - 1)
if ($indBrace -match '[^ ]') { throw ('REFUSED: template opening brace is not alone on its line') }
# the closing line is the next line that holds only this indentation and a brace
$closeTok = "`n" + $indBrace + '}'
$tmplClose = $orig.IndexOf($closeTok, $tmplHit)
if ($tmplClose -lt 0) { throw 'REFUSED: could not locate template closing brace' }
$tmplBlock = $orig.Substring($tmplOpen, ($tmplClose + $closeTok.Length) - $tmplOpen)
# normalise: block runs from the opening brace char through the closing brace char
$tmplBlock = $indBrace + $tmplBlock
Write-Output ('[tmpl] ' + $TemplateId + '   block ' + $tmplBlock.Length + ' chars   indent ' + $indBrace.Length)

$newlineTok = "`r`n"
if ($orig.IndexOf($newlineTok) -lt 0) { $newlineTok = "`n" }

# ---------------- render one entry by cloning the template
$varyFields = @($patch.vary_fields)
if ($varyFields.Count -eq 0) { throw 'REFUSED: patch has no vary_fields' }
$cidPattern = [string]$patch.concept_id_pattern

# Substitution is done by index arithmetic, not by regex replacement strings, so that a
# backslash or dollar sign inside a Korean type name can never be reinterpreted.
function Replace-Once([string]$blockText, [string]$findRegex, [string]$literalNew) {
  $hits = [regex]::Matches($blockText, $findRegex)
  if ($hits.Count -ne 1) {
    throw ('REFUSED: pattern /' + $findRegex + '/ occurs ' + $hits.Count + ' times in template, expected 1')
  }
  $spot = $hits[0]
  return $blockText.Substring(0, $spot.Index) + $literalNew + $blockText.Substring($spot.Index + $spot.Length)
}

function Render-FromTemplate($srcBlock, $oneEntry, $fieldList, $cidRegex) {
  $outBlock = $srcBlock
  foreach ($fieldName in $fieldList) {
    $newValue = [string]$oneEntry.$fieldName
    if ([string]::IsNullOrEmpty($newValue)) { throw ('REFUSED: patch entry missing ' + $fieldName) }
    if ($newValue.Contains('"') -or $newValue.Contains('\')) {
      throw ('REFUSED: value for ' + $fieldName + ' needs JSON escaping, refusing to guess: ' + $newValue)
    }
    $fieldRegex = '"' + [regex]::Escape($fieldName) + '":  "[^"]*"'
    $outBlock = Replace-Once $outBlock $fieldRegex ('"' + $fieldName + '":  "' + $newValue + '"')
  }
  if ($cidRegex -ne '') {
    $cidNew = [string]$oneEntry.concept_id
    if ([string]::IsNullOrEmpty($cidNew)) { throw 'REFUSED: patch entry missing concept_id' }
    $outBlock = Replace-Once $outBlock ('"' + $cidRegex + '"') ('"' + $cidNew + '"')
  }
  return $outBlock
}

# ---------------- splice, ascending so same-anchor entries keep order
$countLineOld = '    "' + $patch.count_field + '":  ' + $patch.old_count + ','
$countLineNew = '    "' + $patch.count_field + '":  ' + $patch.new_count + ','
if ($orig.IndexOf($countLineOld) -lt 0) { throw ('REFUSED: count line not found verbatim: ' + $countLineOld) }

$text = $orig
$blocks = @()
foreach ($oneEntry in $entries) {
  if ($text.IndexOf($idTok + $oneEntry.problem_type_id + '"') -ge 0) {
    throw ('REFUSED: ' + $oneEntry.problem_type_id + ' already exists in catalog')
  }
  $succTok = $idTok + $oneEntry.insert_before + '"'
  $succAt = $text.IndexOf($succTok)
  if ($succAt -lt 0) { throw ('REFUSED: successor not found: ' + $oneEntry.insert_before) }
  $succOpen = $text.LastIndexOf('{', $succAt)
  if ($succOpen -lt 0) { throw ('REFUSED: could not locate opening brace before ' + $oneEntry.insert_before) }
  $succLine = $text.LastIndexOf("`n", $succOpen)
  $insertAt = $succLine + 1
  $oneBlock = (Render-FromTemplate $tmplBlock $oneEntry $varyFields $cidPattern) + ',' + $newlineTok
  $blocks += $oneBlock
  $text = $text.Substring(0, $insertAt) + $oneBlock + $text.Substring($insertAt)
}
$text = $text.Replace($countLineOld, $countLineNew)

# ---------------- verify (fail closed)
$failList = @()
$catAfter = $null
try { $catAfter = $text | ConvertFrom-Json } catch { $failList += ('1 PARSE: ' + $_.Exception.Message) }

$tmplObj = @($catBefore.problem_types | Where-Object { $_.problem_type_id -eq $TemplateId })[0]
$constFields = @($refFields | Where-Object { $varyFields -notcontains $_ -and $_ -ne 'concept_ids' })

if ($null -ne $catAfter) {
  $countAfter = @($catAfter.problem_types).Count
  if ($countAfter -ne ($countBefore + $entries.Count)) {
    $failList += ('2 COUNT: expected ' + ($countBefore + $entries.Count) + ' got ' + $countAfter)
  }
  if ([int]$catAfter.$($patch.count_field) -ne [int]$patch.new_count) { $failList += '2 COUNTFIELD not updated' }
  foreach ($oneEntry in $entries) {
    $found = @($catAfter.problem_types | Where-Object { $_.problem_type_id -eq $oneEntry.problem_type_id })
    if ($found.Count -ne 1) { $failList += ('3 MISSING: ' + $oneEntry.problem_type_id); continue }
    $gotFields = @($found[0].PSObject.Properties.Name)
    if (($gotFields -join ',') -ne ($refFields -join ',')) {
      $failList += ('3 FIELDS: ' + $oneEntry.problem_type_id + ' -> ' + ($gotFields -join ','))
      continue
    }
    foreach ($constName in $constFields) {
      $gotVal = [string]$found[0].$constName
      $wantVal = [string]$tmplObj.$constName
      if ($gotVal -cne $wantVal) { $failList += ('3 CONST ' + $constName + ' drifted on ' + $oneEntry.problem_type_id) }
    }
    $cidArr = @($found[0].concept_ids)
    if ($cidArr.Count -ne 1) { $failList += ('3 CONCEPT_IDS not a 1-element array on ' + $oneEntry.problem_type_id) }
    elseif (([string]$cidArr[0]) -cne ([string]$oneEntry.concept_id)) { $failList += ('3 CONCEPT_IDS wrong value on ' + $oneEntry.problem_type_id) }
  }
}

$fffdCount = ([regex]::Matches($text, [string][char]0xFFFD)).Count
if ($fffdCount -ne 0) { $failList += ('4 U+FFFD: ' + $fffdCount) }

$revText = $text
foreach ($oneBlock in $blocks) {
  $blockAt = $revText.IndexOf($oneBlock)
  if ($blockAt -lt 0) { $failList += '5 REVERSAL: inserted block not found'; break }
  $revText = $revText.Remove($blockAt, $oneBlock.Length)
}
$revText = $revText.Replace($countLineNew, $countLineOld)
if ($revText -cne $orig) { $failList += '5 REVERSAL: residual difference outside the inserted blocks' }

# ---------------- report
Write-Output ('[in ] catalog ' + $Catalog)
Write-Output ('[in ] patch   ' + $PatchFile)
Write-Output ('entries before : ' + $countBefore)
Write-Output ('entries to add : ' + $entries.Count)
Write-Output ('template       : ' + $TemplateId + '   fields ' + $refFields.Count + ' (' + ($refFields -join ',') + ')')
Write-Output ('vary fields    : ' + ($varyFields -join ',') + ',concept_ids')
Write-Output ('const fields   : ' + ($constFields -join ','))
Write-Output ''
Write-Output 'VERIFY'
Write-Output ('  1 parse             : ' + $(if ($null -ne $catAfter) { 'ok' } else { 'FAIL' }))
Write-Output ('  2 count             : ' + $(if ($null -ne $catAfter) { $countBefore.ToString() + ' -> ' + @($catAfter.problem_types).Count } else { 'n/a' }))
Write-Output ('  3 field set/order   : ' + $(if (@($failList | Where-Object { $_ -like '3 FIELDS*' }).Count -eq 0) { 'ok (' + $refFields.Count + ' fields, template order)' } else { 'FAIL' }))
Write-Output ('  3 constant fields   : ' + $(if (@($failList | Where-Object { $_ -like '3 CONST*' }).Count -eq 0) { 'ok (byte-equal to template)' } else { 'FAIL' }))
Write-Output ('  3 concept_ids shape : ' + $(if (@($failList | Where-Object { $_ -like '3 CONCEPT_IDS*' }).Count -eq 0) { 'ok (1-element array)' } else { 'FAIL' }))
Write-Output ('  4 U+FFFD            : ' + $fffdCount)
Write-Output ('  5 reversal          : ' + $(if (@($failList | Where-Object { $_ -like '5 *' }).Count -eq 0) { 'ok (untouched bytes identical)' } else { 'FAIL' }))

if ($failList.Count -gt 0) {
  Write-Output ''
  foreach ($oneFail in $failList) { Write-Output ('  !! ' + $oneFail) }
  throw ('REFUSED: ' + $failList.Count + ' verification(s) failed. Catalog NOT modified.')
}

if ($DryRun) { Write-Output ''; Write-Output 'DRY RUN - catalog not written.'; exit 0 }

if ($BackupDir -ne '') {
  if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
  $bkPath = Join-Path $BackupDir ([System.IO.Path]::GetFileName($Catalog) + '.pre-add-' + $entries.Count + 'entries')
  Copy-Item $Catalog $bkPath -Force
  Write-Output ('backup: ' + $bkPath)
}
[System.IO.File]::WriteAllText($Catalog, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ('written: ' + $Catalog)
