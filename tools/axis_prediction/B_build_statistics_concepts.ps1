# ASCII only. Korean from statistics_concepts_full.json (UTF-8).
$ErrorActionPreference='Stop'
$base='C:\Users\user\projects\scshstudy\public\math-weakness-engine\data'
$scratch='C:\Users\user\AppData\Local\Temp\claude\C--Users-user-OneDrive-------scshstudy\1b6898a9-3065-4efe-9f87-e7deb4bfbba4\scratchpad'
$enc=New-Object Text.UTF8Encoding $false
$U=[Text.Encoding]::UTF8

$cjPath=Join-Path $scratch 'statistics_concepts_full.json'
$cjText=[IO.File]::ReadAllText($cjPath,$U)
$cjParsed=$cjText|ConvertFrom-Json
Write-Output ("concept objects parsed: "+$cjParsed.Count)
$ai=$cjText.IndexOf('['); $bi=$cjText.LastIndexOf(']')
$inner=$cjText.Substring($ai+1,$bi-$ai-1).Trim()

# links -> PT -> concept_ids (scan set01..20)
$ptc=@{}
for($n=1;$n -le 20;$n++){
  $s='{0:D2}' -f $n
  $f=Join-Path $base "source_item_links\m3_statistics\m3_statistics_150worksheet_set$s.links.v1.json"
  if(Test-Path $f){
    $j=[IO.File]::ReadAllText($f,$U)|ConvertFrom-Json
    foreach($it in $j.links){
      $pt=$it.primary_problem_type_id; if(-not $pt){continue}
      if(-not $ptc.ContainsKey($pt)){ $ptc[$pt]=New-Object 'System.Collections.Generic.HashSet[string]' }
      foreach($c in $it.concept_ids){ [void]$ptc[$pt].Add($c) }
    }
  }
}

# insert concepts
$mcPath=Join-Path $base 'math_concepts.v1.json'
$txt=[IO.File]::ReadAllText($mcPath,$U)
if($txt.Contains('M3_STAT_C001')){ Write-Output 'SKIP concepts insert (already present)' }
else{
  $needle='"concepts": ['
  $i=$txt.IndexOf($needle); $at=$i+$needle.Length
  $txt=$txt.Substring(0,$at)+"`r`n"+$inner+","+$txt.Substring($at)
  if($txt -match '"concept_count":\s*(\d+)'){ $cur=[int]$Matches[1]; $txt=[Text.RegularExpressions.Regex]::Replace($txt,'"concept_count":\s*\d+',('"concept_count": '+($cur+$cjParsed.Count)),1) }
  [IO.File]::WriteAllText($mcPath,$txt,$enc)
  Write-Output ("inserted "+$cjParsed.Count+" concepts (count "+$cur+" -> "+($cur+$cjParsed.Count)+")")
}
$chk=[IO.File]::ReadAllText($mcPath,$U)|ConvertFrom-Json
$st=@($chk.concepts|Where-Object {$_.unit_id -eq 'M3_STATISTICS'})
Write-Output ("validate math_concepts: statistics concepts="+$st.Count)

# problem_types pt.concept_ids
$ptPath=Join-Path $base 'problem_types\m3_statistics.problem_types.v1.json'
$pt=[IO.File]::ReadAllText($ptPath,$U)|ConvertFrom-Json
$filled=0
foreach($p in $pt.problem_types){
  if($ptc.ContainsKey($p.problem_type_id)){ $p.concept_ids=@($ptc[$p.problem_type_id]|Sort-Object); $filled++ }
}
$pt._note='problem_types assembled from type_variant_bank. pt.concept_ids filled from source_item_links (Tier1 concept build 2026-08-10). concept defs in math_concepts.v1.json (source=pt_derived).'
[IO.File]::WriteAllText($ptPath,($pt|ConvertTo-Json -Depth 8),$enc)
$empty=@($pt.problem_types|Where-Object {@($_.concept_ids).Count -eq 0}).Count
Write-Output ("pt.concept_ids filled: $filled / "+$pt.problem_types.Count+" (empty remaining: $empty)")
Write-Output ("sample PT "+$pt.problem_types[0].problem_type_id+" -> ["+(@($pt.problem_types[0].concept_ids) -join ',')+"]")
