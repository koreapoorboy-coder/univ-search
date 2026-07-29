# 검수 채팅용 재료 생성기 — pack_gap + 미매칭 행을 고정 형식 tsv 로 방출.
#
# 목적: 라운드마다 재료 tsv 형식이 흔들리던 문제를 고정한다(검수 채팅 지적, 2026-07-29).
#   - Run-AxisPrediction.ps1 과 '동일한' 매칭 로직(Split-Names·emit·ctx)을 재사용해 §8-1 재현이 항상 일치.
#   - 코드 열(그룹ID=source_group_id, 코드=source_code) 을 항상 실어 §10-2 문항 ID 지목이 가능.
#   - 출력 = pack_gap(걸렸으나 C-공통만) + 미매칭(무발화). pack_hit(D- 발화)은 재료 아님이라 제외.
#
# 형식(고정): 탭 구분, 헤더 1행, 값 무인용. 열 순서:
#   구분 · 중영역 · 유형묶음 · 그룹ID · 코드 · 이름 · 적용규칙(C-규칙 ', ' 결합)
# 정렬: 중영역 → 유형묶음 → 구분 → 이름.
#
# 사용: Export-PackGapMaterial.ps1 -Only EQ [-OutPath <경로>]
# ⚠ 파라미터명은 반드시 $Only — 루프변수 $prefix 와 겹치면 PowerShell 대소문자무시로 덮인다(§4 문서화된 버그).
param(
  [Parameter(Mandatory=$true)][string]$Only,
  [string]$RulesPath = (Join-Path $PSScriptRoot '..\axis_prediction\axis_rules.v23.json'),
  [string]$OutPath   = ''
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
      if ($hasPack) { continue }   # pack_hit = 재료 아님
      $gubun = if ($hits.Count -eq 0) { '미매칭' } else { 'pack_gap' }
      $rows += [pscustomobject]@{
        구분 = $gubun; 중영역 = $mid; 유형묶음 = $group; 그룹ID = $gid; 코드 = $e.code
        이름 = $nm; 적용규칙 = ($hits -join ', ')
      }
    }
  }
}
$sorted = $rows | Sort-Object 중영역, 유형묶음, 구분, 이름
if (-not $OutPath) { $OutPath = Join-Path (Join-Path $HOME 'Downloads') ("{0}_packgap_material.tsv" -f $Only) }
$sorted | Export-Csv -Path $OutPath -Delimiter "`t" -NoTypeInformation -Encoding UTF8
$g = @($sorted | Where-Object { $_.구분 -eq 'pack_gap' }).Count
$u = @($sorted | Where-Object { $_.구분 -eq '미매칭' }).Count
Write-Host ("{0}: pack_gap {1} + 미매칭 {2} = {3}행 → {4}" -f $Only, $g, $u, $sorted.Count, $OutPath)
