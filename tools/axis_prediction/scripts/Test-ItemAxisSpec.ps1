param(
  [Parameter(Mandatory = $false)]
  [string]$SpecFile = (Join-Path $PSScriptRoot '..\..\..\public\math-weakness-engine\data\item_axes\item_axis_spec.v1.json')
)

$ErrorActionPreference = 'Stop'
$spec = Get-Content -Raw -LiteralPath $SpecFile | ConvertFrom-Json
$expected = @(
  'common.AX03_cardinality',
  'common.AX03_math_form',
  'common.AX03_response_mode',
  'common.AX04_direction',
  'common.AX04_elimination',
  'common.AX03_kind',
  'common.AX03_aggregation',
  'unit.M3_CIRCLE_PROPERTIES.AXC02_count',
  'unit.M3_CIRCLE_PROPERTIES.AXC03_reflex',
  'unit.M3_CIRCLE_PROPERTIES.AXC01_lines',
  'unit.M3_CIRCLE_PROPERTIES.AXC01_vertex',
  'unit.M3_CIRCLE_PROPERTIES.AXC01_tangent_count',
  'unit.M3_CIRCLE_PROPERTIES.AXC02_circle_relation'
)

$keys = @($spec.axes.PSObject.Properties.Name)
$missing = @($expected | Where-Object { $_ -notin $keys })
$extra = @($keys | Where-Object { $_ -notin $expected })
if ($missing.Count -gt 0) { throw "필수 축 누락: $($missing -join ', ')" }
if ($extra.Count -gt 0) { throw "확정 13축 밖의 활성 축: $($extra -join ', ')" }
if ($keys.Count -ne 13) { throw "활성 축 개수 오류: $($keys.Count)" }

foreach ($key in $keys) {
  $axis = $spec.axes.$key
  if ($axis.arity -notin @('single', 'multi')) { throw "$key arity 오류" }
  if ($axis.value_type -notin @('string', 'boolean')) { throw "$key value_type 오류" }
  if (@($axis.current_values).Count -eq 0) { throw "$key current_values 비어 있음" }
  if ($null -ne $axis.confirmed_on -and $axis.confirmed_on -isnot [array]) { throw "$key confirmed_on은 배열 또는 null이어야 함" }
  if ($axis.scope -eq 'unit' -and $axis.unit_id -ne 'M3_CIRCLE_PROPERTIES') { throw "$key unit_id 오류" }
}

$retired = @('AXC01_kind', 'AXC01_count', 'AXC02_relation', 'AXC03_arc_mode', 'AXC03_arc_primary', 'AX04_cancel')
foreach ($key in $keys) {
  foreach ($old in $retired) {
    if ($key -match [regex]::Escape($old)) { throw "폐기·미확정 축이 활성화됨: $key" }
  }
}

Write-Output ([pscustomobject]@{
  ok = $true
  axis_spec_version = $spec.axis_spec_version
  analysis_version = $spec.analysis_version
  axis_count = $keys.Count
})
