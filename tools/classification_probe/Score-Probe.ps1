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
foreach ($f in (Get-ChildItem $Dir -Filter 'result_*.json' | Sort-Object Name)) {
  $r = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $label = "$($r.condition)$($r.test)"
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
    Write-Host "  [$($e.id) $($e.category)] $($e.stem.Substring(0, [Math]::Min(46, $e.stem.Length)))..."
    Write-Host "      정답: $expName  ($($e.expect_type))"
    Write-Host "      판정: $gotUnit $gotName  ($($g.picked_type))  [$sameUnit, conf $($g.confidence)]"
  }
}
Write-Host ""
Write-Host "===== 조건별 요약 ====="
$summary | Format-Table -AutoSize
