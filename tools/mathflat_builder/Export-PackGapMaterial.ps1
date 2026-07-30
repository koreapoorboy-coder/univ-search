# 검수 채팅용 재료 생성기 — pack_gap + 미매칭 행을 고정 형식 tsv 로 방출.
#
# 목적: 라운드마다 재료 tsv 형식이 흔들리던 문제를 고정한다(검수 채팅 지적, 2026-07-29).
#   - Run-AxisPrediction.ps1 과 '동일한' 매칭 로직(Split-Names·emit·ctx)을 재사용해 §8-1 재현이 항상 일치.
#   - 코드 열(그룹ID=source_group_id, 코드=source_code) 을 항상 실어 §10-2 문항 ID 지목이 가능.
#   - 출력 = pack_gap(걸렸으나 C-공통만) + 미매칭(무발화). pack_hit(D- 발화)은 재료 아님이라 제외.
#
# 형식(고정, 검수 채팅 마스터 명세 §17-9): TSV(탭) · UTF-8 · BOM 없음 · 헤더 1행 · 값 무인용.
#   열 순서: 그룹ID · 코드 · 중영역 · 묶음 · 이름 · 적용규칙 · 분류
#   적용규칙 = 걸린 C-규칙을 '공백 없는 쉼표'로 결합 (C-01,C-08). 분류 = pack_gap / 미매칭.
# 정렬: 중영역 → 묶음 → 분류 → 이름.
#
# 사용: Export-PackGapMaterial.ps1 -Only EQ [-OutPath <경로>]
# ⚠ 파라미터명은 반드시 $Only — 루프변수 $prefix 와 겹치면 PowerShell 대소문자무시로 덮인다(§4 문서화된 버그).
param(
  [Parameter(Mandatory=$true)][string]$Only,
  [string]$RulesPath = (Join-Path $PSScriptRoot '..\axis_prediction\axis_rules.v28.json'),
  [string]$OutPath   = '',
  [switch]$All        # 전 항목 방출(pack_hit 포함). 기본은 pack_gap+미매칭만(재료용).
)
$ErrorActionPreference = 'Stop'
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

$files = Get-ChildItem $dir -Filter *.mathflat.v1.json | Where-Object { $_.Name -notlike '_pilot*' }
$rows = @()
foreach ($file in $files) {
  $j = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $sem = $j.semester
  $prefix = $j.unit_code
  if ($prefix -eq 'PF') { $prefix = "PF_$sem" }
  if ($prefix -ne $Only) { continue }
  $gr = Get-Rules $prefix; $rules = $gr[0]
  foreach ($t in $j.problem_types) {
    $mid = $t.중영역; $group = $t.type_name; $gid = $t.source_group_id
    $emit = @()
    if (-not $t.topic_types -or @($t.topic_types).Count -eq 0) {
      $emit += @{ name = $group; code = $gid }
    } else {
      foreach ($it in $t.topic_types) {
        $code = $it.source_code
        $detail = if ($it.PSObject.Properties.Name -contains 'detail_type_names_raw') { $it.detail_type_names_raw } else { $null }
        $topic = $it.name
        if ($detail) { foreach ($n in (Split-Names ([string]$detail))) { $emit += @{ name = $n; code = $code } } }
        elseif ($topic -and $topic -ne $group) { $emit += @{ name = $topic; code = $code } }
        elseif ($topic) { $emit += @{ name = $topic; code = $code } }
        else { $emit += @{ name = $group; code = $code } }
      }
    }
    foreach ($e in $emit) {
      $nm = $e.name; $ctx = "$group $nm"; $hits = @(); $hasPack = $false
      foreach ($rule in $rules) {
        if ($ctx -match $rule.pattern) { $hits += $rule.id; if ($rule.id -like 'D-*') { $hasPack = $true } }
      }
      if ($hasPack -and -not $All) { continue }   # pack_hit = 재료 아님(기본). -All 이면 포함.
      $bunryu = if ($hits.Count -eq 0) { '미매칭' } elseif ($hasPack) { 'pack_hit' } else { 'pack_gap' }
      $rows += [pscustomobject]@{
        그룹ID = $gid; 코드 = $e.code; 중영역 = $mid; 묶음 = $group
        이름 = $nm; 적용규칙 = ($hits -join ','); 분류 = $bunryu
      }
    }
  }
}
$sorted = $rows | Sort-Object 중영역, 묶음, 분류, 이름
if (-not $OutPath) { $suffix = if ($All) { 'all' } else { 'pack_gap' }; $OutPath = Join-Path (Join-Path $HOME 'Downloads') ("{0}_{1}.tsv" -f $Only, $suffix) }
# 명세 §17-9: 탭 구분 · 무인용 · BOM 없음 · 헤더 1행 · 줄바꿈 LF. Export-Csv 는 인용·BOM 을 붙여 부적합 → 직접 조립.
# ⚠ AppendLine 은 CRLF 를 붙여 마지막 열(분류)에 \r 이 새므로 금지. Append + "`n"(LF) 로 조립한다.
$hdr = '그룹ID','코드','중영역','묶음','이름','적용규칙','분류'
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append(($hdr -join "`t")).Append("`n")
foreach ($r in $sorted) {
  $vals = @($r.그룹ID, $r.코드, $r.중영역, $r.묶음, $r.이름, $r.적용규칙, $r.분류) |
    ForEach-Object { ([string]$_).Replace("`t",' ').Replace("`r",'').Replace("`n",' ') }
  [void]$sb.Append(($vals -join "`t")).Append("`n")
}
[IO.File]::WriteAllText($OutPath, $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
$g = @($sorted | Where-Object { $_.분류 -eq 'pack_gap' }).Count
$u = @($sorted | Where-Object { $_.분류 -eq '미매칭' }).Count
$h = @($sorted | Where-Object { $_.분류 -eq 'pack_hit' }).Count
if ($All) { Write-Host ("{0}: 전항목 {1}행 (pack_hit {2} + pack_gap {3} + 미매칭 {4}) → {5}" -f $Only, $sorted.Count, $h, $g, $u, $OutPath) }
else      { Write-Host ("{0}: pack_gap {1} + 미매칭 {2} = {3}행 → {4}" -f $Only, $g, $u, $sorted.Count, $OutPath) }
