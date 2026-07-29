# v5-matching port of build_axis_prediction.py — BULK 45-unit runner (분업: Code 탭).
#
# 정본은 검수 채팅의 Python(build_axis_prediction.py, xlsx 입력). 이 포팅은 저장 JSON
# (*.mathflat.v1.json)을 입력으로 같은 규칙을 45단원 전량에 돌린다. xlsx 를 매번 검수
# 채팅에 올리는 것이 비현실적이라, 대량 실행은 여기서 하고 검수 채팅은 표본으로 교차검증한다.
# (AELF 에서 두 구현이 어긋난 덕에 v2 detect_layout 버그를 잡았다 — 교차검증 가치 확인됨.)
#
# v5 로 맞춘 것:
#   - 규칙 = axis_rules.v21.json (공통 15 C-* + 단원팩 D-*: EL_AELF·PS·GE·CA2_M2D·MM_CMM·PF_M1S1·EI_CMEI·SQ_ASQ·TF_ATF·GE2_CM2GE·CA1_M1D·SP_CM2SP·LF_FN·BF_BG·IN1_M1I·IN2_M2I·FG_CM2FG·CR_CP·SM_GS·TB_TR·QD_QF)
#   - 매칭 컨텍스트 = 유형 묶음 + 유형 이름 (v5: 중영역 제거 — 단원 주제어라 변별력 없음)
#   - 행별 이름 폴백: 세부유형 → 주제유형 → 유형묶음  (v3)
#   - PF 코드충돌: unit_code=PF 인 두 단원을 학기로 갈라 PF_M1S1 / PF_M3S1 로 팩 선택(§17-7)
#   - 배지없음 묶음(topic_types=[])은 묶음 이름으로 1행 방출 = Python 의 read_summary_only.
#     (저장 JSON 은 그 묶음을 problem_type 로 이미 갖고 있어 유형요약 시트를 따로 읽을 필요가 없다.)
#   - pack_gap: 걸렸으나 D-(단원팩) 규칙을 하나도 못 짚고 C-(공통)만 걸린 항목. 팩 필요성의 실제 지표.
#   - rule_freq 과다(>60%) 자동 표시. pack_hit / pack_gap / unmatched 3분할.
#
# 출력: 콘솔 요약표 + CSV(name_source_dist / unmatched_all / pack_gap_all / rule_over60).
# 스크린 데이터를 지어내지 않는다 — 규칙에 걸린 것만 축을 채우고, 안 걸리면 unmatched.
param(
  [string]$RulesPath = (Join-Path $PSScriptRoot '..\axis_prediction\axis_rules.v21.json'),
  [string]$OutDir    = (Join-Path ([IO.Path]::GetTempPath()) 'axispred'),
  [string]$Only      = ''    # 단원 prefix 하나만 (예: -Only M2D)
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$dir = 'C:\Users\user\Desktop\scshstudy\public\math-weakness-engine\data\raw_taxonomy'
$R = Get-Content $RulesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$OPEN = '([{（〔'; $CLOSE = ')]}）〕'

function Get-Rules([string]$prefix) {
  $rules = @($R.common); $packs = @()
  foreach ($p in $R.domain.PSObject.Properties) {
    if ($p.Value.applies_to -contains $prefix) { $rules += @($p.Value.rules); $packs += $p.Name }
  }
  , @($rules, $packs)
}
function Split-Names([string]$raw) {
  $parts = @(); $buf = New-Object System.Text.StringBuilder; $depth = 0
  foreach ($ch in $raw.ToCharArray()) {
    if ($OPEN.IndexOf($ch) -ge 0) { $depth++ } elseif ($CLOSE.IndexOf($ch) -ge 0) { if ($depth -gt 0) { $depth-- } }
    if ($ch -eq '|' -and $depth -eq 0) { $parts += $buf.ToString(); $buf = New-Object System.Text.StringBuilder; continue }
    [void]$buf.Append($ch)
  }
  $parts += $buf.ToString(); , @($parts | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$dist = @(); $unmatchedAll = @(); $packGapAll = @(); $over60All = @()
$files = Get-ChildItem $dir -Filter *.mathflat.v1.json | Where-Object { $_.Name -notlike '_pilot*' } | Sort-Object Name
foreach ($file in $files) {
  $j = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $sem = $j.semester
  # PF 코드 충돌(§17-7): 소인수분해 M1S1 · 다항식곱셈 M3S1 둘 다 unit_code=PF.
  # 팩은 prefix 로 선택되므로 학기를 붙여 PF_M1S1 / PF_M3S1 로 갈라 팩이 안 섞이게 한다.
  $prefix = $j.unit_code
  if ($prefix -eq 'PF') { $prefix = "PF_$sem" }
  if ($Only -and $prefix -ne $Only) { continue }
  $gr = Get-Rules $prefix; $rules = $gr[0]; $packs = $gr[1]
  $c = @{ '세부유형' = 0; '주제유형' = 0; '유형묶음' = 0 }
  $rows = 0; $hit = 0; $nameOnly = 0; $packHit = 0; $gap = 0; $summaryOnly = 0
  $freq = @{}
  foreach ($t in $j.problem_types) {
    $mid = $t.중영역; $group = $t.type_name; $gid = $t.source_group_id
    $emit = @()   # @{name; src; code}
    if (-not $t.topic_types -or @($t.topic_types).Count -eq 0) {
      $emit += @{ name = $group; src = '유형묶음'; code = $gid }   # 배지없음 묶음 = read_summary_only
      $summaryOnly++
    } else {
      foreach ($it in $t.topic_types) {
        $code = $it.source_code
        $detail = if ($it.PSObject.Properties.Name -contains 'detail_type_names_raw') { $it.detail_type_names_raw } else { $null }
        $topic = $it.name
        if ($detail) { foreach ($n in (Split-Names ([string]$detail))) { $emit += @{ name = $n; src = '세부유형'; code = $code } } }
        elseif ($topic -and $topic -ne $group) { $emit += @{ name = $topic; src = '주제유형'; code = $code } }
        elseif ($topic) { $emit += @{ name = $topic; src = '유형묶음'; code = $code } }
        else { $emit += @{ name = $group; src = '유형묶음'; code = $code } }
      }
    }
    foreach ($e in $emit) {
      $nm = $e.name; $c[$e.src]++; $rows++
      $ctx = "$group $nm"; $axes = @(); $hits = @()   # v5: 중영역 제거 — 단원 주제어라 전 항목에 같은 축을 붙임
      foreach ($rule in $rules) {
        if ($ctx -match $rule.pattern) {
          $hits += $rule.id
          foreach ($a in $rule.axes) { if ($axes -notcontains $a) { $axes += $a } }
        }
      }
      foreach ($h in $hits) { if ($freq.ContainsKey($h)) { $freq[$h]++ } else { $freq[$h] = 1 } }
      $nH = $false; if ($nm) { foreach ($rule in $rules) { if ($nm -match $rule.pattern) { $nH = $true; break } } }
      if ($nH) { $nameOnly++ }
      if ($axes.Count -eq 0) {
        $hit = $hit   # no-op; unmatched
        $unmatchedAll += [pscustomobject]@{ prefix = $prefix; 학기 = $sem; 그룹ID = $e.code; 중영역 = $mid; 유형묶음 = $group; 이름 = $nm }
      } else {
        $hit++
        $hasPack = @($hits | Where-Object { $_ -like 'D-*' }).Count -gt 0
        if ($hasPack) { $packHit++ }
        else {
          $gap++
          $packGapAll += [pscustomobject]@{ prefix = $prefix; 학기 = $sem; 그룹ID = $e.code; 중영역 = $mid; 유형묶음 = $group; 이름 = $nm; 걸린공통규칙 = ($hits -join ', ') }
        }
      }
    }
  }
  $rate = if ($rows) { [Math]::Round(100 * $hit / $rows) } else { 0 }
  $nr   = if ($rows) { [Math]::Round(100 * $nameOnly / $rows) } else { 0 }
  $pr   = if ($rows) { [Math]::Round(100 * $packHit / $rows) } else { 0 }
  $gr2  = if ($rows) { [Math]::Round(100 * $gap / $rows) } else { 0 }
  # 과다(>60%) 규칙
  $over = @()
  foreach ($k in $freq.Keys) { if ($rows -and ($freq[$k] / $rows) -gt 0.6) { $over += ("{0} {1}%" -f $k, [Math]::Round(100 * $freq[$k] / $rows)) } }
  foreach ($k in ($freq.Keys | Sort-Object { -$freq[$_] })) {
    if ($rows -and ($freq[$k] / $rows) -gt 0.6) {
      $over60All += [pscustomobject]@{ prefix = $prefix; 규칙 = $k; 걸린항목 = $freq[$k]; 비율 = ([Math]::Round(100 * $freq[$k] / $rows)) }
    }
  }
  $packLabel = if ($packs.Count) { $packs -join '+' } else { '—' }
  $dist += [pscustomobject]@{
    prefix = $prefix; 학기 = $sem; 이름 = $j.unit_name; 팩 = $packLabel
    총항목 = $rows; 적중률 = $rate; '팩%' = $pr; 'gap%' = $gr2; 이름단독 = $nr
    미매칭 = ($rows - $hit); gap건수 = $gap; 요약전용 = $summaryOnly; 과다 = ($over -join ' ')
  }
}

$dist | Sort-Object { -[int]$_.'gap%' } | Format-Table prefix, 학기, 팩, 총항목, 적중률, '팩%', 'gap%', 이름단독, 요약전용, 과다 -AutoSize
$dist         | Sort-Object prefix | Export-Csv "$OutDir\name_source_dist.csv" -NoTypeInformation -Encoding UTF8
$unmatchedAll | Export-Csv "$OutDir\unmatched_all.csv" -NoTypeInformation -Encoding UTF8
$packGapAll   | Export-Csv "$OutDir\pack_gap_all.csv"  -NoTypeInformation -Encoding UTF8
$over60All    | Export-Csv "$OutDir\rule_over60.csv"   -NoTypeInformation -Encoding UTF8

$tot = ($dist | Measure-Object 총항목 -Sum).Sum
"---"
"총 항목 $tot · 미매칭 $($unmatchedAll.Count) · pack_gap $($packGapAll.Count) · 과다규칙(>60%) $($over60All.Count)행"
"CSV → $OutDir"
$aelf = $dist | Where-Object { $_.prefix -eq 'AELF' }
if ($aelf) {
  "AELF 교차검증 (Python v4 기대: 총353 적중96% 팩76% gap20% 이름단독92% 요약전용1):"
  "  총 $($aelf.총항목) · 적중 $($aelf.적중률)% · 팩 $($aelf.'팩%')% · gap $($aelf.'gap%')% · 이름단독 $($aelf.이름단독)% · 요약전용 $($aelf.요약전용)"
}
