# ASCII only. Assemble problem_types.v1.json for circle/statistics from type_variant_bank.
# Recipe: distinct problem_type_id -> {id, unit, type_name(from bank), type_name_source:"variant_bank",
#   concept_ids:[] (concepts undefined - separate track), default_difficulty(mode), error_tags:[]}.
$repo = 'C:\Users\user\projects\scshstudy'
$base = Join-Path $repo 'public\math-weakness-engine\data'
function ReadJson($p){ return [IO.File]::ReadAllText($p,[Text.Encoding]::UTF8) | ConvertFrom-Json }
$idx = ReadJson (Join-Path $base 'index.v1.json')

$units = @(
  @{ unitId='M3_CIRCLE_PROPERTIES'; bank='m3_circle_properties'; out='m3_circle_properties' },
  @{ unitId='M3_STATISTICS';        bank='m3_statistics';        out='m3_statistics' }
)

foreach($u in $units){
  $unitName = ($idx.units | Where-Object { $_.unit_id -eq $u.unitId }).unit_name
  $bankDir = Join-Path $base ("type_variant_bank\" + $u.bank)
  $byPt = @{}          # pt -> [ordered] entry
  $diffByPt = @{}      # pt -> hashtable(diff->count)
  foreach($bf in (Get-ChildItem $bankDir -Filter *.type_variants.v1.json)){
    $j = ReadJson $bf.FullName
    foreach($v in $j.variants){
      $pt = $v.problem_type_id
      if(-not $pt){ continue }
      if(-not $byPt.ContainsKey($pt)){
        $byPt[$pt] = $v.type_name
        $diffByPt[$pt] = @{}
      }
      if($v.difficulty_distribution){
        foreach($p in $v.difficulty_distribution.PSObject.Properties){
          $diffByPt[$pt][$p.Name] = ([int]$diffByPt[$pt][$p.Name]) + [int]$p.Value
        }
      }
    }
  }
  $entries = @()
  foreach($pt in ($byPt.Keys | Sort-Object)){
    # mode difficulty
    $dd = $diffByPt[$pt]; $mode='core'; $best=-1
    foreach($k in $dd.Keys){ if([int]$dd[$k] -gt $best){ $best=[int]$dd[$k]; $mode=$k } }
    $entries += [ordered]@{
      problem_type_id = $pt
      unit_id = $u.unitId
      unit_name = $unitName
      type_name = $byPt[$pt]
      type_name_source = 'variant_bank'
      concept_ids = @()
      default_difficulty = $mode
      error_tags = @()
    }
  }
  $obj = [ordered]@{
    version = ('2026.08.09-' + $u.out + '-assembled-from-variant-bank')
    unit_id = $u.unitId
    unit_name = $unitName
    _note = 'problem_types assembled from type_variant_bank (type_name_source=variant_bank, topic names not curated diagnostic names). concept_ids empty (M3_*_C concepts undefined - separate track). error_tags empty (fine layer via overlay).'
    problem_type_count = $entries.Count
    problem_types = $entries
  }
  $outPath = Join-Path $base ("problem_types\" + $u.out + ".problem_types.v1.json")
  [IO.File]::WriteAllText($outPath, ($obj | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))
  Write-Output ("WROTE " + $u.out + " : " + $entries.Count + " PTs, unit_name=" + $unitName + ", sample=" + $entries[0].problem_type_id + " '" + $entries[0].type_name + "' diff=" + $entries[0].default_difficulty)
}
