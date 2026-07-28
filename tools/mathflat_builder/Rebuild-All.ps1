param([switch]$MeasureOnly, [string[]]$Only = @())

$sp = Split-Path $MyInvocation.MyCommand.Path
. "$sp\units.ps1"
$build = "$sp\Build-Mathflat.ps1"
$OUT   = "$DATA\raw_taxonomy"

function Invoke-Build($u, $itemLg, $itemArr, $itemName, $itemId, $outPath) {
  $a = @{
    DumpPath = "$sp\$($u.dump).txt"; OutPath = $outPath
    UnitId = $u.id; UnitCode = $u.code; UnitName = $u.name; Chapter = $u.ch
    SourceZip = $u.zip; Expected = $u.exp; Semester = $u.sem; SemesterName = $u.semn
    LegacyArrayProp = $u.lgArr; LegacyNameProp = $u.lgName; LegacyIdProp = $u.lgId
  }
  if ($u.lg)  { $a.LegacyPath = $u.lg }
  if ($u.alt) { $a.AltLegacyPath = $u.alt; $a.AltLegacyArrayProp = $u.altArr }
  if ($u.known) { $a.KnownSourceMismatch = $u.known; $a.KnownSourceMismatchNote = $u.knownNote }
  if ($u.extra) { $a.ExtraGroup = $u.extra }
  if ($u.excl)  { $a.SourceExclusion = $u.excl }
  if ($u.codeNote) { $a.UnitCodeNote = $u.codeNote }
  if ($u.expNames) { $a.ExpectedDetailNames = $u.expNames }
  if ($u.grouponly) { $a.GroupOnlyDepth = $true }
  if ($itemLg) {
    $a.ItemLegacyPath = $itemLg; $a.ItemLegacyArrayProp = $itemArr
    $a.ItemLegacyNameProp = $itemName; $a.ItemLegacyIdProp = $itemId
  }
  & $build @a | Out-Null
}

$rows = @()
foreach ($u in $UNITS) {
  if ($Only.Count -and $u.code -notin $Only) { continue }
  $t0 = Get-Date

  # candidates for the ITEM layer, in preference order; pick whichever confirms more
  # Try every (file, name-field) combination that exists. section_name is present
  # in only some raw_taxonomy files, task_group in all of them, so probe both.
  $cands = @()
  foreach ($pair in @(@($u.lg,$u.lgArr), @($u.alt,$u.altArr))) {
    $path = $pair[0]; $arr = $pair[1]
    if (-not $path) { continue }
    if ($arr -eq 'problem_types') {
      $cands += ,@($path,'problem_types','type_name','problem_type_id')
      $cands += ,@($path,'problem_types','description','problem_type_id')
    } else {
      $cands += ,@($path,'sections','section_name','raw_section_id')
      $cands += ,@($path,'sections','task_group','raw_section_id')
    }
  }

  # Score a candidate by what it actually contributes, not by match count alone:
  # a source that confirms more items but carries no concept_ids or error_tags is
  # worth less than one that confirms fewer and brings both.
  $best = $null; $bestKey = @(-1, -1)
  foreach ($c in $cands) {
    $tmp = "$sp\_probe.json"
    Remove-Item $tmp -ErrorAction SilentlyContinue   # never score a stale probe
    try { Invoke-Build $u $c[0] $c[1] $c[2] $c[3] $tmp } catch { continue }
    if (-not (Test-Path $tmp)) { continue }
    $ia = (Get-Content $tmp -Raw -Encoding UTF8 | ConvertFrom-Json).item_legacy_audit
    $key = @(($ia.concept_ids_inherited + $ia.error_tags_referenced), $ia.match_confident)
    if ($key[0] -gt $bestKey[0] -or ($key[0] -eq $bestKey[0] -and $key[1] -gt $bestKey[1])) {
      $bestKey = $key; $best = $c
    }
  }
  Remove-Item "$sp\_probe.json" -ErrorAction SilentlyContinue

  $outPath = "$OUT\$($u.out).mathflat.v1.json"
  $before = if (Test-Path $outPath) { (Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json) } else { $null }
  $beforeConcept = if ($before) { @($before.problem_types | Where-Object { $null -ne $_.concept_ids }).Count } else { 0 }

  if (-not $MeasureOnly) {
    if ($best) { Invoke-Build $u $best[0] $best[1] $best[2] $best[3] $outPath }
    else       { Invoke-Build $u '' '' '' '' $outPath }
  }

  $j = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $ia = $j.item_legacy_audit
  $rows += [pscustomobject]@{
    코드 = $u.code; 단원 = $u.name
    유형 = $j.problem_types.Count; 항목 = $ia.item_count
    '항목legacy출처' = if ($ia.source) { ($ia.source -split ' ')[0] -replace '\.v1\.json','' } else { '없음' }
    '항목확정' = $ia.match_confident; '항목후보' = $ia.match_candidate
    'concept(항목)' = $ia.concept_ids_inherited
    'errtag참고' = $ia.error_tags_referenced
    'concept(유형,종전)' = $beforeConcept
    초 = [Math]::Round(((Get-Date) - $t0).TotalSeconds,1)
  }
  Write-Host ("{0,-3} 항목확정 {1,-4}/{2,-4} concept {3,-4} errtag참고 {4,-4} ({5}s)" -f $u.code,$ia.match_confident,$ia.item_count,$ia.concept_ids_inherited,$ia.error_tags_referenced,$rows[-1].초)
}
$rows | Export-Csv "$sp\rebuild_summary.csv" -NoTypeInformation -Encoding UTF8
$rows
