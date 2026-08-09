# ASCII only. Generate fine-tag overlays per retagged unit + coverage report.
# Recipe (verified on QF): reflection(item->likely_error_tags) JOIN source_item_links(item->primary_problem_type_id) by item_id -> PT->union(tags).
$repo   = 'C:\Users\user\projects\scshstudy'
$refDir = Join-Path $repo 'tools\axis_prediction'
$base   = Join-Path $repo 'public\math-weakness-engine\data'
$outDir = Join-Path $base 'axis_map'

function ReadJson($p){ return [IO.File]::ReadAllText($p,[Text.Encoding]::UTF8) | ConvertFrom-Json }

# unit: name | refl slug (reflection filename) | links dir | pt slug (problem_types file, '' if none)
$units = @(
  @{ name='m2_geometry_properties';               refl='m2_geometry_properties';               links='m2_geometry_properties';               pt='m2_geometry_properties' },
  @{ name='m2_linear_function';                   refl='m2_linear_function';                   links='m2_linear_function';                   pt='m2_linear_function' },
  @{ name='m2_number_expression';                 refl='m2_number_expression';                 links='m2_number_expression';                 pt='m2_number_expression' },
  @{ name='m2_probability';                       refl='m2_probability';                       links='m2_probability';                       pt='m2_probability' },
  @{ name='m2_similarity_pythagoras';             refl='m2_similarity';                        links='m2_similarity_pythagoras';             pt='m2_similarity_pythagoras' },
  @{ name='m3_circle_properties';                 refl='m3_circle_properties';                 links='m3_circle_properties';                 pt='' },
  @{ name='m3_polynomial_multiplication_factorization'; refl='m3_polynomial'; links='m3_polynomial_multiplication_factorization'; pt='m3_polynomial_multiplication_factorization' },
  @{ name='m3_quadratic_equation';                refl='m3_quadratic_equation';                links='m3_quadratic_equation';                pt='m3_quadratic_equation' },
  @{ name='m3_quadratic_function';                refl='m3_quadratic_function';                links='m3_quadratic_function';                pt='m3_quadratic_function' },
  @{ name='m3_real_numbers_and_operations';       refl='m3_real_numbers_and_operations';       links='m3_real_numbers_and_operations';       pt='m3_real_numbers_and_operations' },
  @{ name='m3_trigonometric_ratio';               refl='m3_trigonometric_ratio';               links='m3_trigonometric_ratio';               pt='m3_trigonometric_ratio' }
)

$report = @()
foreach($u in $units){
  $linksPath = Join-Path $base ("source_item_links\" + $u.links)
  $item2pt = @{}
  if(Test-Path $linksPath){
    foreach($lf in (Get-ChildItem $linksPath -Filter *.json)){
      $j = ReadJson $lf.FullName
      foreach($l in $j.links){ if($l.item_id -and $l.primary_problem_type_id){ $item2pt[$l.item_id] = $l.primary_problem_type_id } }
    }
  }
  $item2tags = @{}
  $reflGlob = "B_reflection_" + $u.refl + "_set*.v1.json"
  $reflFiles = Get-ChildItem $refDir -Filter $reflGlob
  foreach($rf in $reflFiles){
    $j = ReadJson $rf.FullName
    foreach($it in $j.items){ if($it.item_id){ $item2tags[$it.item_id] = $it.likely_error_tags } }
  }
  $ptTags = @{}
  $joinOk = 0; $joinFail = 0
  foreach($item in $item2tags.Keys){
    $pt = $item2pt[$item]
    if(-not $pt){ $joinFail++; continue }
    $joinOk++
    if(-not $ptTags.ContainsKey($pt)){ $ptTags[$pt] = New-Object 'System.Collections.Generic.HashSet[string]' }
    $tags = $item2tags[$item]
    if($tags){ foreach($t in $tags){ if($t){ [void]$ptTags[$pt].Add([string]$t) } } }
  }
  $nPt = $ptTags.Count
  $sizes = @()
  foreach($k in $ptTags.Keys){ $sizes += $ptTags[$k].Count }
  $min = if($sizes.Count){ ($sizes | Measure-Object -Minimum).Minimum } else { 0 }
  $max = if($sizes.Count){ ($sizes | Measure-Object -Maximum).Maximum } else { 0 }
  $avg = if($sizes.Count){ [math]::Round(($sizes | Measure-Object -Average).Average,2) } else { 0 }
  $totalPt = 0
  if($u.pt -ne ''){
    $ptPath = Join-Path $base ("problem_types\" + $u.pt + ".problem_types.v1.json")
    if(Test-Path $ptPath){ $ptj = ReadJson $ptPath; $totalPt = ($ptj.problem_types | Measure-Object).Count }
  }
  # outlier PT (max tags)
  $maxPtId = ''
  $maxPtN = 0
  foreach($k in $ptTags.Keys){ if($ptTags[$k].Count -gt $maxPtN){ $maxPtN = $ptTags[$k].Count; $maxPtId = $k } }
  # write overlay
  $ov = [ordered]@{
    version = ($u.name + '-pt-fine-error-tags-overlay-v1')
    unit = $u.name
    join = 'reflection likely_error_tags x source_item_links primary_problem_type_id, union by item_id'
    n_pt = $nPt
    total_pt = $totalPt
    pt_fine_error_tags = [ordered]@{}
  }
  foreach($pt in ($ptTags.Keys | Sort-Object)){ $ov.pt_fine_error_tags[$pt] = @($ptTags[$pt]) }
  $outPath = Join-Path $outDir ($u.name + '.pt_fine_error_tags.v1.json')
  [IO.File]::WriteAllText($outPath, ($ov | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))
  $covStr = if($totalPt -gt 0){ ("{0}/{1} ({2}%)" -f $nPt,$totalPt,[math]::Round(100.0*$nPt/$totalPt)) } else { "$nPt/? (no PT file)" }
  $report += [pscustomobject]@{
    unit=$u.name; refl_sets=$reflFiles.Count; items=$item2tags.Count;
    coverage=$covStr; join_ok=$joinOk; join_fail=$joinFail;
    tags_min=$min; tags_max=$max; tags_avg=$avg; outlier_pt=("$maxPtId($maxPtN)")
  }
}
$report | Format-Table -AutoSize
Write-Output "=== OVERLAYS WRITTEN to data/axis_map/<unit>.pt_fine_error_tags.v1.json ==="
