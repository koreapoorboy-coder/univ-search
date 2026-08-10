# ASCII only. Korean comes from circle_concepts_full.json (UTF-8), read as text.
$ErrorActionPreference='Stop'
$base='C:\Users\user\projects\scshstudy\public\math-weakness-engine\data'
$scratch='C:\Users\user\AppData\Local\Temp\claude\C--Users-user-OneDrive-------scshstudy\1b6898a9-3065-4efe-9f87-e7deb4bfbba4\scratchpad'
$enc=New-Object Text.UTF8Encoding $false
$U=[Text.Encoding]::UTF8

# 0) load concept objects text (raw Korean) + validate parse
$cjPath=Join-Path $scratch 'circle_concepts_full.json'
$cjText=[IO.File]::ReadAllText($cjPath,$U)
$cjParsed=$cjText|ConvertFrom-Json
Write-Output ("concept objects parsed: "+$cjParsed.Count)
$ai=$cjText.IndexOf('['); $bi=$cjText.LastIndexOf(']')
$inner=$cjText.Substring($ai+1,$bi-$ai-1).Trim()

# 1) links -> PT -> concept_ids (ASCII ids only)
$ptc=@{}
foreach($s in @('07','13')){
  $f=Join-Path $base "source_item_links\m3_circle_properties\m3_circle_properties_150worksheet_set$s.links.v1.json"
  if(Test-Path $f){
    $j=[IO.File]::ReadAllText($f,$U)|ConvertFrom-Json
    foreach($it in $j.links){
      $pt=$it.primary_problem_type_id; if(-not $pt){continue}
      if(-not $ptc.ContainsKey($pt)){ $ptc[$pt]=New-Object 'System.Collections.Generic.HashSet[string]' }
      foreach($c in $it.concept_ids){ [void]$ptc[$pt].Add($c) }
    }
  }
}

# 2) insert concepts into math_concepts.v1.json (text, preserve raw Korean)
$mcPath=Join-Path $base 'math_concepts.v1.json'
$txt=[IO.File]::ReadAllText($mcPath,$U)
if($txt.Contains('M3_CIRC_C001')){ Write-Output 'SKIP concepts insert (already present)' }
else{
  $needle='"concepts": ['
  $i=$txt.IndexOf($needle); $at=$i+$needle.Length
  $txt=$txt.Substring(0,$at)+"`r`n"+$inner+","+$txt.Substring($at)
  if($txt -match '"concept_count":\s*(\d+)'){ $cur=[int]$Matches[1]; $txt=[Text.RegularExpressions.Regex]::Replace($txt,'"concept_count":\s*\d+',('"concept_count": '+($cur+$cjParsed.Count)),1) }
  [IO.File]::WriteAllText($mcPath,$txt,$enc)
  Write-Output ("inserted "+$cjParsed.Count+" concepts (count "+$cur+" -> "+($cur+$cjParsed.Count)+")")
}
# validate
$chk=[IO.File]::ReadAllText($mcPath,$U)|ConvertFrom-Json
$circ=@($chk.concepts|Where-Object {$_.unit_id -eq 'M3_CIRCLE_PROPERTIES'})
Write-Output ("validate math_concepts: circle concepts="+$circ.Count)

# 3) circle problem_types pt.concept_ids
$ptPath=Join-Path $base 'problem_types\m3_circle_properties.problem_types.v1.json'
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
