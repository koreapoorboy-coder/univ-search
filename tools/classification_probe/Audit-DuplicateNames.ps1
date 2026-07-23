# Lists every name that repeats inside a single unit, at both layers.
# A repeated name means neither a person nor the classifier can tell the two apart
# from the name alone, so each case needs checking against the original screenshot:
# does MathFlat really print it twice, or did transcription duplicate it?
param(
  [string]$DataDir = "C:\Users\user\Desktop\scshstudy\public\math-weakness-engine\data\raw_taxonomy",
  [string]$OutPath = "$PSScriptRoot\duplicate_names.report.txt"
)
$ErrorActionPreference = 'Stop'
$lines = @()
function W($s) { $script:lines += $s; Write-Host $s }

$typeDupTotal = 0; $itemSameGroup = 0; $itemCrossGroup = 0
foreach ($f in (Get-ChildItem $DataDir -Filter *.mathflat.v1.json | Where-Object { $_.Name -notlike '_pilot*' } | Sort-Object Name)) {
  $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $blocks = @()

  # layer 1 - 유형 묶음 names repeating inside the unit
  $td = $j.problem_types | Group-Object type_name | Where-Object { $_.Count -gt 1 }
  foreach ($g in $td) {
    $typeDupTotal++
    $blocks += "  [유형 묶음] 「$($g.Name)」 x$($g.Count)"
    foreach ($t in $g.Group) {
      $blocks += "      $($t.source_group_id)  $($t.problem_type_id)  ($($t.대영역) > $($t.중영역))  항목 $($t.topic_type_actual)  이미지 $($t.source_image)"
    }
  }

  # layer 2 - 문항 항목 names repeating inside the unit
  $items = @()
  foreach ($t in $j.problem_types) {
    foreach ($it in $t.topic_types) {
      $items += [pscustomobject]@{ gid=$t.source_group_id; gname=$t.type_name; code=$it.source_code; name=$it.name; img=$t.source_image }
    }
  }
  $idup = $items | Group-Object name | Where-Object { $_.Count -gt 1 }
  foreach ($g in $idup) {
    $groups = @($g.Group.gid | Sort-Object -Unique)
    $kind = if ($groups.Count -eq 1) { '같은 묶음 안'; $script:itemSameGroup++ } else { '묶음 간'; $script:itemCrossGroup++ }
    $blocks += "  [문항 항목/$kind] 「$($g.Name)」 x$($g.Count)"
    foreach ($it in $g.Group) { $blocks += "      $($it.code)  $($it.gid) 「$($it.gname)」  이미지 $($it.img)" }
  }

  if ($blocks.Count) {
    W ""
    W "===== $($j.unit_code)  $($j.semester)  $($j.unit_name)  (유형 $($j.problem_types.Count) / 항목 $(@($j.problem_types.topic_types).Count)) ====="
    $blocks | ForEach-Object { W $_ }
  }
}
W ""
W "===== 합계 ====="
W "  유형 묶음 이름 중복: $typeDupTotal 세트"
W "  문항 항목 이름 중복(같은 묶음 안): $itemSameGroup 세트   <- 가장 의심스러운 쪽"
W "  문항 항목 이름 중복(묶음 간): $itemCrossGroup 세트"
[System.IO.File]::WriteAllLines($OutPath, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ""
Write-Host "OUT: $OutPath"
