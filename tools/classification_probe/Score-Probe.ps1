# Scores whatever result_*.json files exist and prints, per condition, the count
# correct and every wrong answer as "what was classified as what".
param([string]$Dir = $PSScriptRoot)
$ErrorActionPreference = 'Stop'

$idx = Get-Content "$Dir\index.test24.v1.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$ts  = Get-Content "$Dir\testset.v1.json"      -Raw -Encoding UTF8 | ConvertFrom-Json

$nameOf = @{}; $unitOf = @{}; $unitName = @{}
foreach ($u in $idx.units) {
  $unitName[$u.unit_id] = "$($u.unit_code) $($u.unit_name)"
  foreach ($p in $u.problem_types) { $nameOf[$p.id] = $p.name; $unitOf[$p.id] = $u.unit_id }
}
$expect = @{}; foreach ($it in $ts.items) { $expect[$it.id] = $it }

$summary = @()
$nameShared = @()
foreach ($f in (Get-ChildItem $Dir -Filter 'result_*.json' | Sort-Object Name)) {
  $r = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  # Label carries the variant so an Opus run and a Haiku run don't collide.
  $label = "$($r.condition)$($r.test)"
  if ($r.model -and $r.model -notlike '*opus-4-8*') { $label += "/$($r.model -replace 'claude-','')" }
  if ($r.effort) { $label += "/$($r.effort)" }
  if ($r.cache)  { $label += "/cached" }
  $byCat = @{}; $ok = 0; $wrong = @()
  foreach ($res in $r.results) {
    $e = $expect[$res.id]
    if (-not $e) { continue }
    $accepted = @($e.expect_type) + @($e.accept)
    $hit = $accepted -contains $res.picked_type
    if ($hit) { $ok++ } else { $wrong += [pscustomobject]@{ item=$e; got=$res } }
    if (-not $byCat.ContainsKey($e.category)) { $byCat[$e.category] = @{ ok=0; n=0 } }
    $byCat[$e.category].n++
    if ($hit) { $byCat[$e.category].ok++ }
  }
  $summary += [pscustomobject]@{
    조건 = $label; 정답 = $ok; 전체 = $r.results.Count
    평범 = "$($byCat['평범'].ok)/$($byCat['평범'].n)"
    이름겹침 = "$($byCat['이름겹침'].ok)/$($byCat['이름겹침'].n)"
    인접단원 = "$($byCat['인접단원'].ok)/$($byCat['인접단원'].n)"
    비용USD = if ($r.cost) { $r.cost.usd } else { '' }
    '문항당' = if ($r.cost -and $r.results.Count) { [Math]::Round($r.cost.usd / $r.results.Count, 5) } else { '' }
  }
  Write-Host ""
  Write-Host "===== $label : 정답 $ok / $($r.results.Count) ====="
  if ($wrong.Count -eq 0) { Write-Host "  (틀린 문항 없음)" }
  foreach ($w in $wrong) {
    $e = $w.item; $g = $w.got
    $expName = "$($unitName[$e.expect_unit]) 「$($nameOf[$e.expect_type])」"
    $gotUnit = if ($unitName[$g.picked_unit]) { $unitName[$g.picked_unit] } else { $g.picked_unit }
    $gotName = if ($nameOf[$g.picked_type]) { "「$($nameOf[$g.picked_type])」" } else { "($($g.picked_type))" }
    $sameUnit = if ($g.picked_unit -eq $e.expect_unit) { '같은 단원' } else { '다른 단원' }
    # Did the name itself cause this? If the two types are labelled identically,
    # the name could not have told them apart and only the content could.
    $en = $nameOf[$e.expect_type]; $gn = $nameOf[$g.picked_type]
    $nameVerdict = if (-not $gn) { '판정 유형 없음' }
                   elseif ($en -eq $gn) { '이름 동일 -> 이름으로는 구분 불가' }
                   else { '이름 다름 -> 이름 탓 아님' }
    Write-Host "  [$($e.id) $($e.category)] $($e.stem.Substring(0, [Math]::Min(46, $e.stem.Length)))..."
    Write-Host "      정답: $expName  ($($e.expect_type))"
    Write-Host "      판정: $gotUnit $gotName  ($($g.picked_type))  [$sameUnit, conf $($g.confidence)]"
    Write-Host "      이름: $nameVerdict"
    $script:nameShared += [pscustomobject]@{ 조건=$label; 문항=$e.id; 분류=$e.category; 이름동일=($en -eq $gn); 단원=$sameUnit }
  }
}
Write-Host ""
Write-Host "===== 조건별 요약 ====="
$summary | Format-Table -AutoSize
Write-Host "===== 오답의 이름 공유 여부 ====="
if ($nameShared.Count -eq 0) { Write-Host "  (오답 없음)" }
else {
  $nameShared | Group-Object 조건 | ForEach-Object {
    $same = @($_.Group | Where-Object { $_.이름동일 }).Count
    Write-Host ("  {0}: 오답 {1}건 중 정답과 이름이 같은 유형으로 간 것 {2}건, 이름이 다른 유형으로 간 것 {3}건" -f `
      $_.Name, $_.Group.Count, $same, ($_.Group.Count - $same))
  }
  $nameShared | Format-Table -AutoSize
}
