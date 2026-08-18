# ASCII ONLY (standing rule).
# Theoretical (composition-independent) undecidable rate for a unit.
#
# WHY: the running undecidable rate during authoring is a function of BOTH coverage AND
# batch composition (review directive 2026-08-18). Only the value at full-unit completion
# is comparable across units. That value is fixed by catalog + overlay alone, so it can be
# computed BEFORE authoring finishes - and independently of the draft file (validation
# criterion must be independent of the object being validated).
#
# Concept grouping = the category prefix in problem_types[].description, i.e. the text
# before the marker U+BC94 U+C8FC U+C758 (written as regex \u escapes; this file is ASCII).
#
# USAGE:
#   .\undecidable_theoretical.ps1 -Catalog <problem_types.json> -Overlay <pt_fine_error_tags.json>

param(
  [Parameter(Mandatory = $true)][string]$Catalog,
  [Parameter(Mandatory = $true)][string]$Overlay
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

$cj = Get-Content $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json
$oj = Get-Content $Overlay -Raw -Encoding UTF8 | ConvertFrom-Json

$own = @{}
foreach ($p in @($oj.pt_fine_error_tags.PSObject.Properties)) {
  if (@($p.Value).Count -gt 0) { $own[$p.Name] = @($p.Value) }
}

$catRe = [regex]'^(.+?) \uBC94\uC8FC\uC758 '
$groups = @{}
$unparsed = @()
foreach ($pt in $cj.problem_types) {
  $m = $catRe.Match([string]$pt.description)
  $key = $null
  if ($m.Success) { $key = $m.Groups[1].Value }
  if (-not $key) {
    # Fallback 1: raw_section_id. Fallback 2: a sentinel so the run still reports.
    # Do NOT pass $null to ContainsKey - it throws a raw .NET exception that hides the
    # real cause (catalog uses a different grouping scheme). Observed 2026-08-18 on
    # m2_similarity_pythagoras (no description field) and m1_*_geometry (plain description).
    $key = $pt.raw_section_id
    if (-not $key) { $key = '(ungrouped)' }
    $unparsed += $pt.problem_type_id
  }
  if (-not $groups.ContainsKey($key)) { $groups[$key] = @() }
  $groups[$key] += $pt.problem_type_id
}

$catTotal = @($cj.problem_types).Count

# If NO type carries the category prefix, this catalog does not use the grouping scheme this
# tool measures. Reporting a number anyway would be a granularity-mismatch comparison - exactly
# the error the granularity caveat warns about. Fail loudly and name the alternative.
if ($unparsed.Count -eq $catTotal -and $catTotal -gt 0) {
  throw ("GROUPING SCHEME NOT APPLICABLE: none of the " + $catTotal + " types in " +
    [System.IO.Path]::GetFileName($Catalog) + " carry the category prefix in 'description', " +
    "and 'raw_section_id' is absent. This unit groups differently (e.g. problem_family_id). " +
    "A number computed here would NOT be comparable with units measured by the category rule - " +
    "report it as 'not measured (different grouping rule)' instead.")
}
$concepts = 0; $undecConcepts = 0; $undecTypes = 0; $obsTypes = 0
$undecList = @()
foreach ($k in $groups.Keys) {
  $ids = @($groups[$k])
  $concepts++
  $obs = @($ids | Where-Object { $own.ContainsKey($_) })
  $obsTypes += $obs.Count
  if ($obs.Count -eq 0) {
    $undecConcepts++
    $undecTypes += $ids.Count
    $undecList += [pscustomobject]@{ concept = $k; types = $ids.Count }
  }
}

Write-Output ('[unit] ' + $cj.unit_id)
Write-Output ('   catalog types            = ' + $catTotal)
Write-Output ('   types with own overlay   = ' + $obsTypes + '  (coverage ' + [math]::Round(100.0 * $obsTypes / $catTotal, 1) + '%)')
Write-Output ('   concepts (categories)    = ' + $concepts)
Write-Output ('   undecidable concepts     = ' + $undecConcepts)
Write-Output ('   undecidable types        = ' + $undecTypes)
Write-Output ('   THEORETICAL UNDECIDABLE RATE = ' + $undecTypes + ' / ' + $catTotal + ' = ' + [math]::Round(100.0 * $undecTypes / $catTotal, 1) + '%')
if ($unparsed.Count -gt 0) {
  Write-Output ('   ! description prefix unparsed for ' + $unparsed.Count + ' types (fell back to raw_section_id): ' + ($unparsed -join ','))
}
Write-Output '   --- undecidable concepts (sorted by size) ---'
foreach ($u in ($undecList | Sort-Object types -Descending)) {
  Write-Output ('     ' + $u.types.ToString().PadLeft(3) + '  ' + $u.concept)
}
