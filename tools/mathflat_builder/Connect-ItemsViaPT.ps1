# PT-id 다리: 문항(primary_problem_type_id) → raw_taxonomy topic_type(legacy_problem_type_id) → 팩 예측축.
# 매칭 로직은 Run-AxisPrediction.ps1 v5 그대로(손재현 금지): Get-Rules·Split-Names·ctx="묶음 이름"·unit_code로 팩선택.
# 사용: Connect-ItemsViaPT.ps1 -Unit m2_linear_equation
param(
  [Parameter(Mandatory)][string]$Unit,
  [string]$UnitCode  = '',
  [string]$RulesPath = (Join-Path $PSScriptRoot '..\axis_prediction\axis_rules.v44.json'),
  [string]$OutFile   = ''
)
$ErrorActionPreference='Stop'
$dataRoot = 'C:\Users\user\OneDrive\바탕 화면\scshstudy\public\math-weakness-engine\data'
$R = Get-Content $RulesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$OPEN='([{（〔'; $CLOSE=')]}）〕'
function Get-Rules([string]$prefix){ $rules=@($R.common); $packs=@()
  foreach($p in $R.domain.PSObject.Properties){ if($p.Value.applies_to -contains $prefix){ $rules+=@($p.Value.rules); $packs+=$p.Name } }
  ,@($rules,$packs) }
function Split-Names([string]$raw){ $parts=@(); $buf=New-Object System.Text.StringBuilder; $depth=0
  foreach($ch in $raw.ToCharArray()){ if($OPEN.IndexOf($ch) -ge 0){$depth++}elseif($CLOSE.IndexOf($ch) -ge 0){if($depth -gt 0){$depth--}}
    if($ch -eq '|' -and $depth -eq 0){ $parts+=$buf.ToString(); $buf=New-Object System.Text.StringBuilder; continue }; [void]$buf.Append($ch) }
  $parts+=$buf.ToString(); ,@($parts|ForEach-Object{$_.Trim()}|Where-Object{$_}) }

# 문항 unit_id
$itemUid = (Get-Content (Get-ChildItem "$dataRoot\source_item_links\$Unit\*.json"|Select-Object -First 1).FullName -Raw -Encoding UTF8 | ConvertFrom-Json).links[0].unit_id
# raw_taxonomy 파일: unit_code 우선(견고), 없으면 unit_id 폴백
if($UnitCode){ $rtFile = Get-ChildItem "$dataRoot\raw_taxonomy\*.mathflat.v1.json" | Where-Object { (Get-Content $_.FullName -Raw -Encoding UTF8) -match "`"unit_code`":\s*`"$UnitCode`"" } | Select-Object -First 1 }
else { $rtFile = Get-ChildItem "$dataRoot\raw_taxonomy\*.mathflat.v1.json" | Where-Object { (Get-Content $_.FullName -Raw -Encoding UTF8) -match "`"unit_id`":\s*`"$itemUid`"" } | Select-Object -First 1 }
if(-not $rtFile){ throw "raw_taxonomy 못 찾음 (Unit=$Unit UnitCode=$UnitCode itemUid=$itemUid)" }
$rawUid = ([regex]::Match((Get-Content $rtFile.FullName -Raw -Encoding UTF8),'"unit_id":\s*"([^"]*)"')).Groups[1].Value
$rt = Get-Content $rtFile.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
$prefix = $rt.unit_code
$gr = Get-Rules $prefix; $rules=$gr[0]; $packs=$gr[1]

# topic_type(legacy_problem_type_id) → 축  (러너 emit 로직 그대로)
$ptMap=@{}
foreach($t in $rt.problem_types){ $group=$t.type_name
  if(-not $t.topic_types -or @($t.topic_types).Count -eq 0){ continue }  # 배지없음 묶음=요약전용, PT-id 없음
  foreach($it in $t.topic_types){ $ptid=$it.legacy_problem_type_id; if(-not $ptid){continue}
    $detail = if($it.PSObject.Properties.Name -contains 'detail_type_names_raw'){$it.detail_type_names_raw}else{$null}
    $names=@(); if($detail){ $names=Split-Names ([string]$detail) } elseif($it.name -and $it.name -ne $group){ $names=@($it.name) } elseif($it.name){ $names=@($it.name) } else { $names=@($group) }
    $ax=[System.Collections.Generic.HashSet[string]]::new()
    foreach($nm in $names){ $ctx="$group $nm"; foreach($rule in $rules){ if($ctx -match $rule.pattern){ foreach($a in $rule.axes){[void]$ax.Add($a)} } } }
    $ptMap[$ptid]=@($ax|Sort-Object) } }

# 문항 조인
$items=New-Object System.Collections.Generic.List[object]; $cov=0; $noKey=0; $keyNoAx=0; $axSum=0; $axd=@{}
foreach($f in (Get-ChildItem "$dataRoot\source_item_bank\$Unit\*.json")){ $c=Get-Content $f.FullName -Raw -Encoding UTF8
  $ids=[regex]::Matches($c,'"item_id":\s*"([^"]*)"'); $pts=[regex]::Matches($c,'"primary_problem_type_id":\s*"([^"]*)"')
  for($i=0;$i -lt $ids.Count;$i++){ $iid=$ids[$i].Groups[1].Value; $k=$pts[$i].Groups[1].Value
    if(-not $ptMap.ContainsKey($k)){ $noKey++; $ax=@(); $lm='none' }
    elseif($ptMap[$k].Count -eq 0){ $keyNoAx++; $ax=@(); $lm='pt_id_noaxis' }
    else { $cov++; $ax=$ptMap[$k]; $axSum+=$ax.Count; $lm='pt_id'; foreach($a in $ax){if(-not $axd.ContainsKey($a)){$axd[$a]=0};$axd[$a]++} }
    $items.Add([ordered]@{item_id=$iid; primary_problem_type_id=$k; predicted_axes=$ax; link_method=$lm}) } }
$tot=$items.Count
$uidFlag = if($itemUid -eq $rawUid){'일치'}else{"불일치(문항:$itemUid vs raw:$rawUid)"}
"unit=$Unit  unit_code=$prefix  팩=$($packs -join ',')  raw=$($rtFile.Name)  unit_id=$uidFlag"
"PT-id 맵: $($ptMap.Count) (축>0: $((@($ptMap.Values|Where-Object{$_.Count -gt 0})).Count))"
"문항 $tot → PT-다리 커버 $cov ($([math]::Round(100*$cov/$tot))%) · 키있으나축0 $keyNoAx · 키없음 $noKey · 평균축 $(if($cov){[math]::Round($axSum/$cov,1)}else{0})"
"축분포: " + (($axd.GetEnumerator()|Sort-Object Value -Descending|ForEach-Object{"$($_.Key):$($_.Value)"}) -join ' ')
if($OutFile){ ([ordered]@{version='B-connect-pt-v1'; meta=[ordered]@{unit=$Unit;unit_code=$prefix;pack=($packs -join ',');link_method='pt_id';coverage="$cov/$tot";axis_distribution=$axd}; items=$items}|ConvertTo-Json -Depth 6)|Set-Content $OutFile -Encoding UTF8; "저장: $OutFile" }
