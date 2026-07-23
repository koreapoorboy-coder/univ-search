# Builds an index over the 24 stored MathFlat units, for the classification probe only.
# The engine's own data/index.v1.json is not touched: it still points at the 12,631-type
# legacy packs and the live diagnosis path keeps using them.
param(
  [string]$DataDir = "C:\Users\user\Desktop\scshstudy\public\math-weakness-engine\data\raw_taxonomy",
  [string]$OutPath = "$PSScriptRoot\index.test24.v1.json"
)
$ErrorActionPreference = 'Stop'

$units = @()
foreach ($f in (Get-ChildItem $DataDir -Filter *.mathflat.v1.json | Where-Object { $_.Name -notlike '_pilot*' } | Sort-Object Name)) {
  $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $types = @()
  foreach ($t in $j.problem_types) {
    $types += [ordered]@{
      id    = $t.problem_type_id
      name  = $t.type_name
      # Condition B uses this; condition A drops it before sending.
      items = @($t.topic_types | ForEach-Object { $_.name })
    }
  }
  $units += [ordered]@{
    unit_id   = $j.unit_id
    unit_code = $j.unit_code
    unit_name = $j.unit_name
    semester  = $j.semester
    chapter   = $j.chapter
    type_count = $types.Count
    item_count = @($j.problem_types.topic_types).Count
    problem_types = $types
  }
}

$doc = [ordered]@{
  _note   = '분류 정확도 시험 전용 인덱스. 저장된 24단원만 담는다. 나머지 15단원은 아직 새 체계로 저장되지 않았으므로 후보에 없다 — 그 단원 문항은 구조적으로 맞힐 수 없다.'
  _scope  = 'probe_only_do_not_wire'
  built_from = 'public/math-weakness-engine/data/raw_taxonomy/*.mathflat.v1.json'
  unit_count = $units.Count
  type_count = ($units | ForEach-Object { $_.type_count } | Measure-Object -Sum).Sum
  item_count = ($units | ForEach-Object { $_.item_count } | Measure-Object -Sum).Sum
  units = $units
}
$json = $doc | ConvertTo-Json -Depth 12
$json = [Regex]::Replace($json, '\\u(?<c>[0-9a-fA-F]{4})', { param($m) [char][int]('0x' + $m.Groups['c'].Value) })
[System.IO.File]::WriteAllText($OutPath, $json, (New-Object System.Text.UTF8Encoding($false)))
"OUT: $OutPath"
"units=$($doc.unit_count)  types=$($doc.type_count)  items=$($doc.item_count)"
