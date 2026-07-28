# v3-matching port: per-ROW name-source fallback (세부유형 → 주제유형 → 유형묶음),
# records the source layer per row and aggregates the 이름 출처 분포 per prefix.
$ErrorActionPreference='Stop'
$sp="C:\Users\user\AppData\Local\Temp\claude\C--Users-user-Desktop-scshstudy\1e4dd428-3474-4df8-834a-1b9ae26765ca\scratchpad"
$dir="C:\Users\user\Desktop\scshstudy\public\math-weakness-engine\data\raw_taxonomy"
$R = Get-Content "$sp\axispred\axis_rules.v1.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$OPEN='([{（〔'; $CLOSE=')]}）〕'
function Get-Rules([string]$prefix){ $rules=@($R.common); $packs=@(); foreach($p in $R.domain.PSObject.Properties){ if($p.Value.applies_to -contains $prefix){ $rules+=@($p.Value.rules); $packs+=$p.Name } }; ,@($rules,$packs) }
function Split-Names([string]$raw){
  $parts=@(); $buf=New-Object System.Text.StringBuilder; $depth=0
  foreach($ch in $raw.ToCharArray()){
    if($OPEN.IndexOf($ch) -ge 0){$depth++} elseif($CLOSE.IndexOf($ch) -ge 0){ if($depth -gt 0){$depth--} }
    if($ch -eq '|' -and $depth -eq 0){ $parts+=$buf.ToString(); $buf=New-Object System.Text.StringBuilder; continue }
    [void]$buf.Append($ch)
  }
  $parts+=$buf.ToString(); ,@($parts|ForEach-Object{$_.Trim()}|Where-Object{$_})
}

$dist=@(); $predAll=@()
foreach($f in (Get-ChildItem $dir -Filter *.mathflat.v1.json | Where-Object { $_.Name -notlike '_pilot*' } | Sort-Object Name)){
  $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $prefix=$j.unit_code; $sem=$j.semester; $gr=Get-Rules $prefix; $rules=$gr[0]
  $c=@{ '세부유형'=0; '주제유형'=0; '유형묶음'=0 }; $rows=0; $hit=0; $nameOnly=0
  foreach($t in $j.problem_types){
    $mid=$t.중영역; $group=$t.type_name
    $emit=@()  # list of @{name; src}
    if(-not $t.topic_types -or @($t.topic_types).Count -eq 0){
      $emit += @{ name=$group; src='유형묶음' }
    } else {
      foreach($it in $t.topic_types){
        $detail = if($it.PSObject.Properties.Name -contains 'detail_type_names_raw'){ $it.detail_type_names_raw } else { $null }
        $topic = $it.name
        if($detail){ foreach($n in (Split-Names ([string]$detail))){ $emit += @{ name=$n; src='세부유형' } } }
        elseif($topic -and $topic -ne $group){ $emit += @{ name=$topic; src='주제유형' } }
        elseif($topic){ $emit += @{ name=$topic; src='유형묶음' } }
        else { $emit += @{ name=$group; src='유형묶음' } }
      }
    }
    foreach($e in $emit){
      $nm=$e.name; $c[$e.src]++; $rows++
      $ctx="$mid $group $nm"; $axes=@()
      foreach($rule in $rules){ if($ctx -match $rule.pattern){ foreach($a in $rule.axes){ if($axes -notcontains $a){$axes+=$a} } } }
      if($axes.Count -gt 0){ $hit++ }
      $nH=$false; if($nm){ foreach($rule in $rules){ if($nm -match $rule.pattern){ $nH=$true; break } } }; if($nH){$nameOnly++}
    }
  }
  $rate=if($rows){[Math]::Round(100*$hit/$rows)}else{0}; $nr=if($rows){[Math]::Round(100*$nameOnly/$rows)}else{0}
  $dist += [pscustomobject]@{ prefix=$prefix; 학기=$sem; 이름=$j.unit_name; 세부유형=$c['세부유형']; 주제유형=$c['주제유형']; 유형묶음=$c['유형묶음']; 총항목=$rows; 적중률=$rate; 이름단독=$nr }
}
$dist | Sort-Object prefix | Format-Table prefix,학기,이름,세부유형,주제유형,유형묶음,총항목,적중률,이름단독 -AutoSize
$dist | Export-Csv "$sp\axispred\name_source_dist.csv" -NoTypeInformation -Encoding UTF8
"AELF 확인 (기대 세부79/주제273/묶음0):"
$dist | Where-Object { $_.prefix -eq 'AELF' } | ForEach-Object { "  세부 $($_.세부유형) / 주제 $($_.주제유형) / 묶음 $($_.유형묶음) / 총 $($_.총항목)" }
$ts=($dist|Measure-Object 세부유형 -Sum).Sum; $tt=($dist|Measure-Object 주제유형 -Sum).Sum; $tg=($dist|Measure-Object 유형묶음 -Sum).Sum
"전체 이름출처: 세부유형 $ts · 주제유형 $tt · 유형묶음 $tg · 합 $($ts+$tt+$tg)"