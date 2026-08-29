param(
  [Parameter(Mandatory = $false)]
  [string]$SpecFile = (Join-Path $PSScriptRoot '..\B_item_axis_spec.v2.proposed.json'),

  [Parameter(Mandatory = $false)]
  [string]$BaseSpecFile = (Join-Path $PSScriptRoot '..\..\..\public\math-weakness-engine\data\item_axes\item_axis_spec.v1.json'),

  [Parameter(Mandatory = $false)]
  [string]$ReportFile
)

$ErrorActionPreference = 'Stop'
$issues = [Collections.Generic.List[object]]::new()

function Add-SpecIssue {
  param([string]$Code, [string]$Path, [string]$Message)
  $script:issues.Add([pscustomobject][ordered]@{
    code = $Code
    path = $Path
    message = $Message
  })
}

function Has-Property {
  param($Object, [string]$Name)
  return $null -ne $Object -and @($Object.PSObject.Properties.Name) -contains $Name
}

function Write-ValidationReport {
  param($Report)
  if ([string]::IsNullOrWhiteSpace($ReportFile)) { return }
  $parent = Split-Path -Parent $ReportFile
  if (-not [string]::IsNullOrWhiteSpace($parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $Report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReportFile -Encoding utf8
}

try {
  $spec = Get-Content -Raw -LiteralPath $SpecFile | ConvertFrom-Json
  $base = Get-Content -Raw -LiteralPath $BaseSpecFile | ConvertFrom-Json
}
catch {
  Add-SpecIssue 'V2S001' '$' "JSON 또는 파일 읽기 실패: $($_.Exception.Message)"
  $report = [pscustomobject][ordered]@{ ok = $false; error_count = $issues.Count; errors = @($issues) }
  Write-ValidationReport $report
  throw "v2 명세 검증 실패: $($issues.Count)건"
}

if ([string]$spec.axis_spec_version -ne 'item-axis-spec.v2.proposed') {
  Add-SpecIssue 'V2S001' '$.axis_spec_version' "예상값 item-axis-spec.v2.proposed, 실제값 $($spec.axis_spec_version)"
}
if ([string]$spec.status -ne 'design_only_not_active') {
  Add-SpecIssue 'V2S011' '$.status' "비활성 제안 명세가 아님: $($spec.status)"
}
if ([string]$spec.unit_id -ne 'M3_CIRCLE_PROPERTIES') {
  Add-SpecIssue 'V2S001' '$.unit_id' "단원 ID 오류: $($spec.unit_id)"
}

$baseKeys = @($base.axes.PSObject.Properties.Name)
$extensionKeys = @($spec.axes.PSObject.Properties.Name)

if ($baseKeys.Count -ne [int]$spec.base_axis_count -or $baseKeys.Count -ne 13) {
  Add-SpecIssue 'V2S002' '$.base_axis_count' "base 축 수 불일치: 실제 $($baseKeys.Count), 선언 $($spec.base_axis_count)"
}
if ($extensionKeys.Count -ne [int]$spec.extension_storage_key_count -or $extensionKeys.Count -ne 3) {
  Add-SpecIssue 'V2S003' '$.extension_storage_key_count' "확장 키 수 불일치: 실제 $($extensionKeys.Count), 선언 $($spec.extension_storage_key_count)"
}
if (($baseKeys.Count + $extensionKeys.Count) -ne [int]$spec.storage_key_count_after_merge) {
  Add-SpecIssue 'V2S003' '$.storage_key_count_after_merge' '병합 뒤 저장 키 수 선언이 실제 합과 다름'
}

$collisions = @($extensionKeys | Where-Object { $_ -in $baseKeys })
foreach ($key in $collisions) {
  Add-SpecIssue 'V2S004' "$.axes.$key" 'base spec과 키가 충돌함'
}

$newMathCount = @($extensionKeys | Where-Object { [string]$spec.axes.$_.axis_role -eq 'new_math_axis' }).Count
$structuredCount = @($extensionKeys | Where-Object { [string]$spec.axes.$_.axis_role -eq 'structured_extension' }).Count
if ($newMathCount -ne [int]$spec.new_math_axis_count -or $newMathCount -ne 1) {
  Add-SpecIssue 'V2S003' '$.new_math_axis_count' "새 수학 축 수 오류: $newMathCount"
}
if ($structuredCount -ne [int]$spec.structured_extension_key_count -or $structuredCount -ne 2) {
  Add-SpecIssue 'V2S003' '$.structured_extension_key_count' "구조 확장 수 오류: $structuredCount"
}
if (($baseKeys.Count + $newMathCount) -ne [int]$spec.math_axis_count_after_merge) {
  Add-SpecIssue 'V2S003' '$.math_axis_count_after_merge' '수학 축 총계가 base+새 수학 축과 다름'
}

if ([string]$spec.value_registration_policy.mode -ne 'registered_open') {
  Add-SpecIssue 'V2S008' '$.value_registration_policy.mode' 'registered_open 정책이 아님'
}
if ($spec.value_registration_policy.database_enum -ne $false) {
  Add-SpecIssue 'V2S008' '$.value_registration_policy.database_enum' 'DB enum 금지 계약 위반'
}

$allowedStates = @($spec.extension_axis_state_policy.allowed_states)
$forbiddenStates = @($spec.extension_axis_state_policy.forbidden_states)
if ('assessed' -notin $allowedStates -or 'unjudgeable' -notin $allowedStates -or 'not_applicable' -notin $forbiddenStates) {
  Add-SpecIssue 'V2S010' '$.extension_axis_state_policy' '허용·금지 상태 계약 누락'
}
if ([string]$spec.progress_denominator.unit_id -ne 'M3_CIRCLE_PROPERTIES') {
  Add-SpecIssue 'V2S010' '$.progress_denominator.unit_id' '미판정 진행률 분모 단원 오류'
}

$requiredForbiddenPaths = @('D1', 'student_profile', 'remediation')
foreach ($path in $requiredForbiddenPaths) {
  if ($path -notin @($spec.activation.forbidden_paths)) {
    Add-SpecIssue 'V2S011' '$.activation.forbidden_paths' "금지 활성 경로 누락: $path"
  }
}
if ($spec.activation.active -ne $false) {
  Add-SpecIssue 'V2S011' '$.activation.active' '제안 명세가 활성 상태임'
}

foreach ($key in $extensionKeys) {
  $axis = $spec.axes.$key
  $path = "$.axes.$key"

  if ([string]$axis.scope -ne 'unit' -or [string]$axis.unit_id -ne 'M3_CIRCLE_PROPERTIES') {
    Add-SpecIssue 'V2S003' $path '단원 축 scope 또는 unit_id 오류'
  }
  if ([string]$axis.arity -ne 'record_multi' -or [string]$axis.value_type -ne 'object') {
    Add-SpecIssue 'V2S006' $path 'record_multi/object 계약 위반'
  }
  if ([string]$axis.value_policy -ne 'registered_open') {
    Add-SpecIssue 'V2S008' "$path.value_policy" 'registered_open 정책이 아님'
  }
  $confirmedOn = @($axis.confirmed_on)
  $designSampleId = [string]$axis.design_evidence.sample_id
  if ($confirmedOn.Count -ne 1 -or [string]$confirmedOn[0] -ne $designSampleId -or $designSampleId -ne 'circle-new-axis-blind-39.corrected.v2') {
    Add-SpecIssue 'V2S009' "$path.confirmed_on" '승인된 39건 표본과 confirmed_on이 일치하지 않음'
  }

  if ([string]$axis.axis_role -eq 'structured_extension') {
    if ([string]::IsNullOrWhiteSpace([string]$axis.semantic_parent) -or [string]$axis.semantic_parent -notin $baseKeys) {
      Add-SpecIssue 'V2S005' "$path.semantic_parent" 'base spec에 존재하는 semantic_parent가 없음'
    }
  }
  elseif ([string]$axis.axis_role -eq 'new_math_axis') {
    if ($null -ne $axis.semantic_parent) {
      Add-SpecIssue 'V2S005' "$path.semantic_parent" '새 수학 축의 semantic_parent는 null이어야 함'
    }
  }
  else {
    Add-SpecIssue 'V2S003' "$path.axis_role" "알 수 없는 axis_role: $($axis.axis_role)"
  }

  $required = @($axis.record_schema.required)
  $fields = @($axis.record_schema.fields.PSObject.Properties.Name)
  if ($required.Count -eq 0 -or 'evidence' -notin $required) {
    Add-SpecIssue 'V2S010' "$path.record_schema.required" '필수 필드 또는 evidence 계약 누락'
  }
  foreach ($field in $required) {
    if ($field -notin $fields) { Add-SpecIssue 'V2S010' "$path.record_schema.fields" "필수 필드 정의 누락: $field" }
  }

  $valueField = [string]$axis.registered_value_field
  if ([string]::IsNullOrWhiteSpace($valueField) -or $valueField -notin $fields) {
    Add-SpecIssue 'V2S010' "$path.registered_value_field" '등록값 필드 정의 누락'
  }
  else {
    $currentValues = @($axis.record_schema.fields.$valueField.current_values)
    if ($currentValues.Count -eq 0) {
      Add-SpecIssue 'V2S007' "$path.record_schema.fields.$valueField.current_values" '등록값 목록이 비어 있음'
    }
    if (@($currentValues | Sort-Object -Unique).Count -ne $currentValues.Count) {
      Add-SpecIssue 'V2S007' "$path.record_schema.fields.$valueField.current_values" '등록값 목록에 중복이 있음'
    }
  }

  foreach ($refField in @($axis.local_reference_fields)) {
    if ($refField -notin $fields) {
      Add-SpecIssue 'V2S010' "$path.local_reference_fields" "참조 필드 정의 누락: $refField"
    }
    if (-not (Has-Property $axis.reference_kind_by_field $refField)) {
      Add-SpecIssue 'V2S010' "$path.reference_kind_by_field" "참조 종류 매핑 누락: $refField"
    }
  }
}

$sortedIssues = @($issues | Sort-Object code, path, message)
$report = [pscustomobject][ordered]@{
  ok = ($sortedIssues.Count -eq 0)
  validator = 'Test-ItemAxisSpecV2.ps1'
  spec_file = (Resolve-Path -LiteralPath $SpecFile).Path
  base_spec_file = (Resolve-Path -LiteralPath $BaseSpecFile).Path
  base_axis_count = $baseKeys.Count
  extension_key_count = $extensionKeys.Count
  merged_storage_key_count = $baseKeys.Count + $extensionKeys.Count
  new_math_axis_count = $newMathCount
  structured_extension_key_count = $structuredCount
  error_count = $sortedIssues.Count
  errors = $sortedIssues
}

Write-ValidationReport $report

if ($sortedIssues.Count -gt 0) {
  foreach ($issue in $sortedIssues | Select-Object -First 50) {
    [Console]::Error.WriteLine("[$($issue.code)] $($issue.path): $($issue.message)")
  }
  throw "v2 명세 검증 실패: $($sortedIssues.Count)건"
}

Write-Output $report
