# Classification probe. Calls the Anthropic API directly -- it does not touch the
# Worker, data/index.v1.json, or the live diagnosis path.
#
#   Condition A : candidates are {id, name}            (what the engine sends today)
#   Condition B : candidates are {id, name, items[]}   (adds the 문항 항목 layer)
#   Test 1      : the correct unit is given; only the type is chosen
#   Test 2      : the unit is chosen first, then the type
#
# Set the key in the shell, never in a file:  $env:ANTHROPIC_API_KEY = '...'
param(
  [Parameter(Mandatory=$true)][ValidateSet('A','B')][string]$Condition,
  [Parameter(Mandatory=$true)][ValidateSet('1','2')][string]$Test,
  [string]$Model = 'claude-opus-4-8',
  [string]$Dir = $PSScriptRoot
)
$ErrorActionPreference = 'Stop'
if (-not $env:ANTHROPIC_API_KEY) { throw 'ANTHROPIC_API_KEY가 없다. $env:ANTHROPIC_API_KEY = "..." 로 설정하라.' }

$idx = Get-Content "$Dir\index.test24.v1.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$ts  = Get-Content "$Dir\testset.v1.json"      -Raw -Encoding UTF8 | ConvertFrom-Json
$NO_MATCH = '__NO_MATCH__'

function Invoke-Claude($system, $userText, $toolName, $schema) {
  $body = @{
    model = $Model; max_tokens = 8000
    system = $system
    tools = @(@{ name = $toolName; description = '분류 결과를 반환한다'; input_schema = $schema })
    tool_choice = @{ type = 'tool'; name = $toolName }
    messages = @(@{ role = 'user'; content = $userText })
  } | ConvertTo-Json -Depth 30
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  for ($try = 1; $try -le 3; $try++) {
    try {
      $r = Invoke-RestMethod -Method Post -Uri 'https://api.anthropic.com/v1/messages' -Body $bytes -ContentType 'application/json' `
            -Headers @{ 'x-api-key' = $env:ANTHROPIC_API_KEY; 'anthropic-version' = '2023-06-01' }
      return ($r.content | Where-Object { $_.type -eq 'tool_use' } | Select-Object -First 1).input
    } catch {
      if ($try -eq 3) { throw }
      Start-Sleep -Seconds (3 * $try)
    }
  }
}

# Candidate list. Condition A drops the item layer entirely so the model never sees it.
function Get-Candidates($unit) {
  $unit.problem_types | ForEach-Object {
    if ($Condition -eq 'B') { [ordered]@{ id = $_.id; name = $_.name; items = @($_.items) } }
    else                    { [ordered]@{ id = $_.id; name = $_.name } }
  }
}

$SYS = @'
너는 한국 중·고등학교 수학 문항을 분류한다.
주어진 문제 문장을 읽고, 후보 목록에서 그 문항이 속하는 유형을 정확히 하나 고른다.
후보 목록 밖의 값은 절대 만들지 않는다. 확실하지 않으면 가장 가까운 것을 고르되 confidence를 낮춘다.
'@

$results = @()

if ($Test -eq '1') {
  # unit is given; ask only for the type, one call per unit
  foreach ($grp in ($ts.items | Group-Object expect_unit)) {
    $unit = $idx.units | Where-Object { $_.unit_id -eq $grp.Name }
    if (-not $unit) { throw "$($grp.Name) 단원이 인덱스에 없다" }
    $cands = Get-Candidates $unit
    $ids = @($cands | ForEach-Object { $_.id })
    $schema = @{
      type='object'; additionalProperties=$false; required=@('answers')
      properties = @{ answers = @{ type='array'; items = @{
        type='object'; additionalProperties=$false; required=@('id','problem_type_id','confidence')
        properties = @{ id=@{type='string'}; problem_type_id=@{type='string'; enum=@($ids + $NO_MATCH)}; confidence=@{type='number'} } } } }
    }
    $qs = ($grp.Group | ForEach-Object { "[$($_.id)] $($_.stem)" }) -join "`n"
    $txt = "단원: $($unit.unit_name) ($($unit.semester))`n`n[후보 유형]`n" +
           ($cands | ConvertTo-Json -Depth 6) + "`n`n[문항]`n$qs`n`n각 문항의 id와 고른 problem_type_id를 답하라."
    Write-Host "  $($unit.unit_code) ($($grp.Group.Count)문항, 후보 $($ids.Count))"
    $out = Invoke-Claude $SYS $txt 'classify' $schema
    foreach ($a in $out.answers) { $results += [pscustomobject]@{ id=$a.id; picked_unit=$unit.unit_id; picked_type=$a.problem_type_id; confidence=$a.confidence } }
  }
} else {
  # stage 1: choose the unit for every question in one call
  $unitIds = @($idx.units | ForEach-Object { $_.unit_id })
  $unitList = $idx.units | ForEach-Object { [ordered]@{ unit_id=$_.unit_id; name=$_.unit_name; semester=$_.semester } }
  $s1 = @{
    type='object'; additionalProperties=$false; required=@('assignments')
    properties = @{ assignments = @{ type='array'; items = @{
      type='object'; additionalProperties=$false; required=@('id','unit_id')
      properties = @{ id=@{type='string'}; unit_id=@{type='string'; enum=$unitIds} } } } }
  }
  $qs = ($ts.items | ForEach-Object { "[$($_.id)] $($_.stem)" }) -join "`n"
  $txt1 = "[후보 단원]`n" + ($unitList | ConvertTo-Json -Depth 4) + "`n`n[문항]`n$qs`n`n각 문항이 어느 단원인지 답하라."
  Write-Host "  1단계: 단원 배정 (문항 $($ts.items.Count), 단원 $($unitIds.Count))"
  $a1 = Invoke-Claude $SYS $txt1 'assign_unit' $s1
  $pick = @{}; foreach ($a in $a1.assignments) { $pick[$a.id] = $a.unit_id }

  # stage 2: within each chosen unit, choose the type
  foreach ($grp in ($ts.items | Group-Object { $pick[$_.id] })) {
    $unit = $idx.units | Where-Object { $_.unit_id -eq $grp.Name }
    if (-not $unit) { foreach ($q in $grp.Group) { $results += [pscustomobject]@{ id=$q.id; picked_unit=$grp.Name; picked_type=''; confidence=0 } }; continue }
    $cands = Get-Candidates $unit
    $ids = @($cands | ForEach-Object { $_.id })
    $schema = @{
      type='object'; additionalProperties=$false; required=@('answers')
      properties = @{ answers = @{ type='array'; items = @{
        type='object'; additionalProperties=$false; required=@('id','problem_type_id','confidence')
        properties = @{ id=@{type='string'}; problem_type_id=@{type='string'; enum=@($ids + $NO_MATCH)}; confidence=@{type='number'} } } } }
    }
    $q2 = ($grp.Group | ForEach-Object { "[$($_.id)] $($_.stem)" }) -join "`n"
    $txt2 = "단원: $($unit.unit_name) ($($unit.semester))`n`n[후보 유형]`n" +
            ($cands | ConvertTo-Json -Depth 6) + "`n`n[문항]`n$q2`n`n각 문항의 id와 고른 problem_type_id를 답하라."
    Write-Host "  2단계 $($unit.unit_code) ($($grp.Group.Count)문항, 후보 $($ids.Count))"
    $out = Invoke-Claude $SYS $txt2 'classify' $schema
    foreach ($a in $out.answers) { $results += [pscustomobject]@{ id=$a.id; picked_unit=$unit.unit_id; picked_type=$a.problem_type_id; confidence=$a.confidence } }
  }
}

$outPath = "$Dir\result_$Condition$Test.json"
$json = @{ condition=$Condition; test=$Test; model=$Model; results=$results } | ConvertTo-Json -Depth 8
$json = [Regex]::Replace($json, '\\u(?<c>[0-9a-fA-F]{4})', { param($m) [char][int]('0x' + $m.Groups['c'].Value) })
[System.IO.File]::WriteAllText($outPath, $json, (New-Object System.Text.UTF8Encoding($false)))
"OUT: $outPath  ($($results.Count)건)"
