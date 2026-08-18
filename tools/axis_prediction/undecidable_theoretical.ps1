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
  if (-not $key) { $key = $pt.raw_section_id; $unparsed += $pt.problem_type_id }
  if (-not $groups.ContainsKey($key)) { $groups[$key] = @() }
  $groups[$key] += $pt.problem_type_id
}

$catTotal = @($cj.problem_types).Count
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
