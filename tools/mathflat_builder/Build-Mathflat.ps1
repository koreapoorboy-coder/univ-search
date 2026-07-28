param(
  [Parameter(Mandatory=$true)][string]$DumpPath,      # TSV dump produced by Read-Xlsx.ps1
  [string]$LegacyPath = '',    # existing *.raw_taxonomy.v1.json (for concept_ids inheritance)
  [Parameter(Mandatory=$true)][string]$OutPath,
  [Parameter(Mandatory=$true)][string]$UnitId,        # M2_LINEAR_EQUATION
  [Parameter(Mandatory=$true)][string]$UnitCode,      # EQ
  [Parameter(Mandatory=$true)][string]$UnitName,      # 방정식
  [Parameter(Mandatory=$true)][string]$Chapter,       # 2-1 방정식
  [Parameter(Mandatory=$true)][string]$SourceZip,     # 2-1 방정식.zip 내 PNG 17장
  [Parameter(Mandatory=$true)][int]$Expected,
  [Parameter(Mandatory=$true)][string]$Semester,      # M1S1 | M1S2 | M2S1
  [Parameter(Mandatory=$true)][string]$SemesterName,  # 중1 1학기 | ...
  # Legacy files come in two shapes: raw_taxonomy (sections/task_group/raw_section_id)
  # and problem_types (problem_types/type_name/problem_type_id).
  [string]$LegacyArrayProp = 'sections',
  [string]$LegacyNameProp  = 'task_group',
  [string]$LegacyIdProp    = 'raw_section_id',
  # A unit often has a second legacy file. Nothing is inherited from it; it is
  # recorded so a later error_tags pass knows what is available and where.
  [string]$AltLegacyPath      = '',
  [string]$AltLegacyArrayProp = 'problem_types',
  # Groups whose declared count is wrong at the source (MathFlat's own badge),
  # verified against the original screenshot. Accepted, but kept distinct from a
  # real omission so the check still catches those.
  [string[]]$KnownSourceMismatch  = @(),
  [string]$KnownSourceMismatchNote = '',
  # Item-level legacy match, run in addition to the group-level one. Several units
  # have a legacy list whose grain is the 문항 항목, not the 유형 묶음, so matching
  # only at group level throws most of it away.
  # Things the workbook itself says it left out. These never appear as rows, so no
  # count check can surface them; they would vanish silently without this.
  # A 유형 묶음 MathFlat shows but the workbook never gave a row: no badge, no
  # children, so COUNTIF has nothing to compare and it would simply disappear.
  # It still has to exist as a classification target. One entry per group,
  # "gid|type_name|대영역|중영역|source_image|why".
  [string[]]$ExtraGroup      = @(),
  [string[]]$SourceExclusion = @(),
  [string]$UnitCodeNote      = '',
  # 안내 시트의 '화면에서 확인한 세부유형 이름 수'. -1 = the workbook makes no such claim.
  [int]$ExpectedDetailNames  = -1,
  # Screenshots folded at the 유형 묶음 level: topic_type_count/detail_type_count come from
  # badges (real), but topic_types stay empty because the 주제유형 names were never captured.
  # The count-vs-rows mismatch is then EXPECTED, not a transcription error.
  [switch]$GroupOnlyDepth,
  [string]$ItemLegacyPath      = '',
  [string]$ItemLegacyArrayProp = 'problem_types',
  [string]$ItemLegacyNameProp  = 'type_name',
  [string]$ItemLegacyIdProp    = 'problem_type_id'
)

$ErrorActionPreference = 'Stop'
$SEMESTER = $Semester

# ---- parse the TSV dump into per-sheet row arrays --------------------------
$sheets = @{}
$cur = $null
foreach ($line in (Get-Content -LiteralPath $DumpPath -Encoding UTF8)) {
  if ($line -match '^===== SHEET (\d+) : (.*) =====$') { $cur = $Matches[2]; $sheets[$cur] = @(); continue }
  if ($line -match '^-----') { continue }
  if ($null -eq $cur) { continue }
  $f = $line -split "`t"
  if ($f.Count -lt 2) { continue }
  $sheets[$cur] += ,($f[1..($f.Count-1)])
}

# ---- column positions are NOT fixed across workbooks -----------------------
# 고2 대수 지수와 로그 inserts 「세부유형 이름」 into 문항분류표 and 「표시 세부유형 이름 수」
# into 유형요약, pushing every later column one to the right. Earlier workbooks also
# disagree on names (실제 세부항목 수 vs 실제 주제유형 수, 세부 항목 vs 주제유형 이름).
# So read by header name, and throw when a name we depend on is missing: a silent
# off-by-one would put 검토상태 text into the name field and no count check catches it.
function New-ColMap($rows) {
  foreach ($r in $rows) {
    if (([string]$r[0]).Trim() -ne '그룹ID') { continue }
    $map = [ordered]@{}
    for ($i = 0; $i -lt $r.Count; $i++) {
      $h = ([string]$r[$i]).Trim()
      if ($h -and -not $map.Contains($h)) { $map[$h] = $i }
    }
    return $map
  }
  throw '헤더 행(첫 칸이 그룹ID)을 찾지 못했다.'
}
# $null = the workbook has no such column at all; '' = column exists, cell is blank.
# The two mean different things downstream, so they must not collapse together.
function Get-Col($row, $map, [string[]]$names) {
  foreach ($n in $names) {
    if ($map.Contains($n)) {
      $i = $map[$n]
      if ($row.Count -gt $i) { return ([string]$row[$i]) } else { return '' }
    }
  }
  return $null
}
function Assert-Col($map, [string[]]$names, [string]$sheet) {
  foreach ($n in $names) { if ($map.Contains($n)) { return } }
  throw "$sheet 시트에 필요한 열이 없다: $($names -join ' 또는 ')"
}

$sumMap  = New-ColMap $sheets['유형요약']
$itemMap = New-ColMap $sheets['문항분류표']
foreach ($n in @('대영역','중영역','유형 묶음','화면 주제유형 수','화면 세부유형 수','출처 이미지')) {
  Assert-Col $sumMap @($n) '유형요약'
}
Assert-Col $itemMap @('세부코드','주제코드')     '문항분류표'
Assert-Col $itemMap @('묶음 내 번호')            '문항분류표'
Assert-Col $itemMap @('세부 항목','주제유형 이름') '문항분류표'
Assert-Col $itemMap @('검토상태')                '문항분류표'

$summary = @($sheets['유형요약']   | Where-Object { $_[0] -match '^G\d+$' })
$items   = @($sheets['문항분류표'] | Where-Object { $_[0] -match '^G\d+$' })

# Emit the detail-name fields only where the workbook actually has those columns.
# A `detail_type_names_raw: null` on a folded-screenshot unit would read as "we looked
# and there were none"; the key being absent says "this workbook never had the column".
$hasDetailNames = $itemMap.Contains('세부유형 이름')
$hasNameCount   = $sumMap.Contains('표시 세부유형 이름 수')

# ---- legacy sections ------------------------------------------------------
# NOTE: order alignment was tried and REJECTED. The legacy file and the MathFlat
# workbook both happen to hold 53 sections, but they are not the same 53 -- the
# legacy list carries sections MathFlat does not (e.g. "문자가 3개인 연립방정식")
# and merges others, so index i drifts. Match by name similarity instead, and
# only inherit concept_ids on a high-confidence match.
# Some units have no legacy taxonomy at all; matching is then simply skipped.
$legacy = if ($LegacyPath -and (Test-Path -LiteralPath $LegacyPath)) {
  @((Get-Content -LiteralPath $LegacyPath -Raw -Encoding UTF8 | ConvertFrom-Json).$LegacyArrayProp)
} else { @() }

function Get-Normalized([string]$s) {
  if (-not $s) { return '' }
  $t = $s -replace '\([0-9]\)', ''          # screen-pagination markers
  $t = ($t -split '\s+-\s+')[0]              # drop the " - 대입법" style qualifier
  $t = $t -replace '[^\p{IsHangulSyllables}0-9A-Za-z=]', ''
  $t = $t -replace '에대한', '' -replace '문제$', '' -replace '의$', ''
  $t
}

function Get-Similarity([string]$a, [string]$b) {
  if (-not $a -or -not $b) { return 0.0 }
  if ($a -eq $b) { return 1.0 }
  # Flat 1-D DP table; PowerShell's parser chokes on $d[$x-1,$y] style 2-D indexing.
  $n = $a.Length; $m = $b.Length
  $w = $m + 1
  $d = New-Object 'int[]' (($n+1) * $w)
  for ($x = 0; $x -le $n; $x++) { $d[$x * $w] = $x }
  for ($y = 0; $y -le $m; $y++) { $d[$y] = $y }
  for ($x = 1; $x -le $n; $x++) {
    for ($y = 1; $y -le $m; $y++) {
      $cost = if ($a[$x-1] -eq $b[$y-1]) { 0 } else { 1 }
      $del = $d[($x-1) * $w + $y] + 1
      $ins = $d[$x * $w + ($y-1)] + 1
      $sub = $d[($x-1) * $w + ($y-1)] + $cost
      $d[$x * $w + $y] = [Math]::Min([Math]::Min($del, $ins), $sub)
    }
  }
  1.0 - ($d[$n * $w + $m] / [Math]::Max($n, $m))
}

# Greedy one-to-one assignment over all (new, legacy) pairs, best score first.
$normLegacy = @($legacy | ForEach-Object { Get-Normalized $_.$LegacyNameProp })
$pairs = @()
for ($a = 0; $a -lt $summary.Count; $a++) {
  $na = Get-Normalized (Get-Col $summary[$a] $sumMap @('유형 묶음'))
  for ($b = 0; $b -lt $legacy.Count; $b++) {
    $sc = Get-Similarity $na $normLegacy[$b]
    if ($sc -ge 0.55) { $pairs += ,@($sc, $a, $b) }
  }
}
$pairs = $pairs | Sort-Object -Property { -$_[0] }
$takenNew = @{}; $takenOld = @{}; $assign = @{}
foreach ($p in $pairs) {
  if ($takenNew.ContainsKey($p[1]) -or $takenOld.ContainsKey($p[2])) { continue }
  $takenNew[$p[1]] = $true; $takenOld[$p[2]] = $true
  $assign[$p[1]] = @{ idx = $p[2]; score = [Math]::Round($p[0], 3) }
}

# ---- build ----------------------------------------------------------------
$types = @()
$audit = [ordered]@{
  _method          = '이름 유사도(정규화 후 Levenshtein) 그리디 1:1 매칭. 순서 대응은 legacy 목록이 다른 구성이라 폐기함.'
  match_confident  = 0   # score >= 0.85 -> concept_ids 상속
  match_candidate  = 0   # 0.55~0.85 -> 후보만 기록, concept_ids 비움
  match_none       = 0
  legacy_section_count = 0
  legacy_has_concept_ids = $false   # several legacy units carry no concept_ids at all
  concept_ids_inherited  = 0
  legacy_unmatched     = @()
}

for ($i = 0; $i -lt $summary.Count; $i++) {
  $r = $summary[$i]
  $gid = $r[0]
  $groupName = Get-Col $r $sumMap @('유형 묶음')

  # @() matters: a lone matching row would otherwise unwrap into its 12 columns.
  # GroupOnlyDepth: the screenshots were folded at the 유형 묶음 level, so the
  # 주제유형 names below were never captured (only their badge count). We deliberately
  # do NOT build topic_types from the blank-named rows; the 유형 묶음 IS the diagnosis
  # unit, and the badge count is preserved as topic_type_count. The workbook may carry
  # 46 blank-named 문항분류표 rows -- those are the 묶음 restated, not real 주제유형 -- so
  # they are ignored here rather than stored as meaningless empty items.
  $own = @($items | Where-Object { $_[0] -eq $gid })
  if ($GroupOnlyDepth) { $own = @() }
  # 문항분류표 stored in full: source code, in-group number, name, review status.
  $topicNames = @()
  $k = 0
  foreach ($it in $own) {
    $k++
    $entry = [ordered]@{
      item_id       = "MPLAT.$SEMESTER.$UnitCode.$gid.I{0:D2}" -f $k
      source_code   = Get-Col $it $itemMap @('세부코드','주제코드')
      no_in_group   = [int](Get-Col $it $itemMap @('묶음 내 번호'))
      name          = Get-Col $it $itemMap @('세부 항목','주제유형 이름')
      review_status = Get-Col $it $itemMap @('검토상태')
      # 원문비고. Added from 경우의 수 onward; null in earlier workbooks.
      source_note   = $(
        $v = Get-Col $it $itemMap @('원문비고')
        if ($v -and $v.Trim()) { $v.Trim() } else { $null })
      # 지수와 로그 is the only unit whose screenshots were taken with 세부유형 expanded,
      # so it is the only one carrying detail-type names. Stored verbatim and NOT split:
      # the separator is a comma but the names themselves contain commas, so splitting
      # would invent a count. The count comes from 유형요약 instead.
      detail_type_names_raw = $(
        $v = Get-Col $it $itemMap @('세부유형 이름')
        if ($v -and $v.Trim()) { $v.Trim() } else { $null })
      # filled by the item-level legacy pass below; null when it finds nothing
      concept_ids            = $null
      legacy_problem_type_id = $null
      legacy_type_name       = $null
      legacy_match_level     = 'none'
      legacy_match_score     = $null
      # reference only. error_tags stay unassigned everywhere until that is a
      # deliberate, separate step.
      legacy_error_tags_ref  = $null
    }
    if (-not $hasDetailNames) { $entry.Remove('detail_type_names_raw') }
    $topicNames += ,$entry
  }

  # "N개 접혀서 안 보임" is recorded on the first row of each group
  $foldNote = $null
  if ($own.Count -gt 0) {
    $st = Get-Col $own[0] $itemMap @('검토상태')
    if ($st -match '(\d+)\s*개\s*(접혀서 안 보임|이름 안 보임)') { $foldNote = $st }
  }

  # A blank 세부유형 badge means the screen did not show a number, which is not
  # the same as zero. Keep it null so nothing is invented.
  $detailRaw = ([string](Get-Col $r $sumMap @('화면 세부유형 수'))).Trim()
  $screenDetail = if ($detailRaw -match '^\d+$') { [int]$detailRaw } else { $null }
  # Same for the 주제유형 badge. Blank there means the group's contents could not be
  # read at all, so it has no items either — null, not zero.
  $topicRaw = ([string](Get-Col $r $sumMap @('화면 주제유형 수'))).Trim()
  $screenTopic = if ($topicRaw -match '^\d+$') { [int]$topicRaw } else { $null }
  # Only 지수와 로그 has this column: how many 세부유형 names the screen actually showed.
  # null elsewhere = the workbook never claimed any, not that there are none.
  $nameCntRaw = Get-Col $r $sumMap @('표시 세부유형 이름 수')
  $detailNameCount = if ($null -ne $nameCntRaw -and $nameCntRaw.Trim() -match '^\d+$') { [int]$nameCntRaw.Trim() } else { $null }
  $lg = $null; $score = $null
  if ($assign.ContainsKey($i)) { $lg = $legacy[$assign[$i].idx]; $score = $assign[$i].score }

  $conceptIds = $null; $legacyId = $null; $legacyName = $null; $matchLevel = 'none'
  if ($lg) {
    $legacyId = $lg.$LegacyIdProp
    $legacyName = $lg.$LegacyNameProp
    if ($score -ge 0.85) {
      $matchLevel = 'confident'
      if ($lg.PSObject.Properties.Name -contains 'concept_ids' -and $lg.concept_ids) {
        $conceptIds = $lg.concept_ids
        $audit.concept_ids_inherited++
      }
    }
    else { $matchLevel = 'candidate' }
  }
  switch ($matchLevel) {
    'confident' { $audit.match_confident++ }
    'candidate' { $audit.match_candidate++ }
    default     { $audit.match_none++ }
  }

  $obj = [ordered]@{
    problem_type_id   = "MPLAT.$SEMESTER.$UnitCode.$gid"
    source_group_id   = $gid
    semester          = $SEMESTER
    unit_id           = $UnitId
    chapter           = $Chapter
    대영역             = Get-Col $r $sumMap @('대영역')
    중영역             = Get-Col $r $sumMap @('중영역')
    type_name         = $groupName
    topic_type_count  = $screenTopic   # null when MathFlat showed no number at all
    topic_type_actual = $k             # $topicNames.Count lies when the group holds one item
    source_count_note = if ($KnownSourceMismatch -contains $gid) { $KnownSourceMismatchNote } else { $null }
    topic_types       = @($topicNames)
    detail_type_count = $screenDetail
    # How many of those the screen actually spelled out. Present only where the
    # workbook has the column at all.
    detail_type_name_count = $detailNameCount
    # Still null even for 지수와 로그: the names exist but only as one comma-joined
    # string per item, and the names contain commas, so no honest array can be built
    # here. The raw string lives on each item as detail_type_names_raw.
    detail_types      = $null
    # ${...} is required: Hangul is a valid identifier char, so "$screenDetail개는"
    # would be parsed as one variable name and silently expand to nothing.
    detail_types_note = if ($null -eq $screenDetail) {
        '매쓰플랫 화면에 세부유형 개수 배지가 보이지 않아 개수도 미확보. 0이 아니라 모름이다.'
      } elseif ($detailNameCount) {
        "세부유형 ${screenDetail}개 중 ${detailNameCount}개는 화면에 펼쳐져 있어 이름을 확보했다. 이름은 각 항목의 detail_type_names_raw에 원문 그대로 있고, 쉼표로 이어져 있으나 이름 자체에 쉼표가 있어 분리하지 않았다. 나머지는 접혀 있어 이름 미확보."
      } elseif ($foldNote) { $foldNote }
      else { "세부유형 ${screenDetail}개는 매쓰플랫 화면에서 접혀 있어 이름 미확보" }
    source_image      = Get-Col $r $sumMap @('출처 이미지')
    # 원문비고. Added from 경우의 수 onward; null in earlier workbooks.
    source_note       = $(
      $v = Get-Col $r $sumMap @('원문비고')
      if ($v -and $v.Trim()) { $v.Trim() } else { $null })
    concept_ids       = $conceptIds
    error_tags        = $null
    prerequisite_ids  = @()
    legacy_raw_section_id = $legacyId
    legacy_task_group     = $legacyName
    legacy_match_level    = $matchLevel
    legacy_match_score    = $score
    status            = 'mathflat_verbatim_not_wired'
  }
  if (-not $hasNameCount) { $obj.Remove('detail_type_name_count') }
  $types += $obj
}

# ---- groups MathFlat shows but the workbook never rowed ---------------------
foreach ($spec in $ExtraGroup) {
  $p2 = $spec -split '\|'
  $types += [ordered]@{
    problem_type_id   = "MPLAT.$SEMESTER.$UnitCode.$($p2[0])"
    source_group_id   = $p2[0]
    semester          = $SEMESTER
    unit_id           = $UnitId
    chapter           = $Chapter
    대영역             = $p2[2]
    중영역             = $p2[3]
    type_name         = $p2[1]
    topic_type_count  = $null
    topic_type_actual = 0
    source_count_note = $p2[5]
    topic_types       = @()
    detail_type_count = $null
    detail_types      = $null
    detail_types_note = '매쓰플랫 화면에 세부유형 배지가 없다. 0이 아니라 모름이다.'
    source_image      = $p2[4]
    concept_ids       = $null
    error_tags        = $null
    prerequisite_ids  = @()
    legacy_raw_section_id = $null
    legacy_task_group     = $null
    legacy_match_level    = 'none'
    legacy_match_score    = $null
    status            = 'mathflat_documented_no_workbook_row'
  }
}

# ---- item-level legacy match ----------------------------------------------
# Exact normalised names first (one pass, one-to-one), then fuzzy over whatever
# is left on both sides. The exact pass is what keeps this cheap: a fuzzy sweep
# of every item against every legacy entry would be hundreds of thousands of
# edit-distance computations per unit.
$itemAudit = [ordered]@{
  _method   = '항목명 정규화 완전일치 우선, 남은 것만 Levenshtein 유사도로 1:1 매칭. 0.85 이상만 확정.'
  ran       = $false
  source    = $null
  legacy_count = 0
  item_count   = 0
  match_confident = 0
  match_candidate = 0
  match_none      = 0
  match_ambiguous = 0   # name occurs more than once in the unit -> cannot identify one legacy row
  ambiguous_note  = '항목명이 단원 안에서 중복되면 이름만으로는 legacy 한 건을 지목할 수 없다. 유사도가 1.0이어도 확정으로 보지 않고 concept_ids와 error_tags를 상속하지 않는다. 구분은 세부코드로 해야 한다.'
  concept_ids_inherited = 0
  error_tags_referenced = 0
  error_tags_note = 'legacy_error_tags_ref는 참고용 기록일 뿐이다. 항목의 error_tags는 여전히 배정하지 않았다.'
}

$allItems = @()
foreach ($t in $types) { foreach ($it in $t.topic_types) { $allItems += $it } }
$itemAudit.item_count = $allItems.Count

if ($ItemLegacyPath -and (Test-Path -LiteralPath $ItemLegacyPath)) {
  $ilg = @((Get-Content -LiteralPath $ItemLegacyPath -Raw -Encoding UTF8 | ConvertFrom-Json).$ItemLegacyArrayProp)
  $itemAudit.ran = $true
  $itemAudit.source = "$(Split-Path $ItemLegacyPath -Leaf) ($ItemLegacyArrayProp / $ItemLegacyNameProp)"
  $itemAudit.legacy_count = $ilg.Count

  $ilgNorm = @($ilg | ForEach-Object { Get-Normalized $_.$ItemLegacyNameProp })
  $itemNorm = @($allItems | ForEach-Object { Get-Normalized $_.name })

  # Names repeat inside a unit -- MathFlat itself has duplicates, kept verbatim.
  # A repeated name cannot pick out one legacy row, so those matches are marked
  # ambiguous and inherit nothing.
  $nameFreq = @{}
  foreach ($n in $itemNorm) { if ($n) { $nameFreq[$n] = [int]$nameFreq[$n] + 1 } }

  $usedL = @{}; $assignI = @{}
  # pass 1 - exact normalised name
  $byName = @{}
  for ($b = 0; $b -lt $ilg.Count; $b++) {
    if ($ilgNorm[$b] -and -not $byName.ContainsKey($ilgNorm[$b])) { $byName[$ilgNorm[$b]] = $b }
  }
  for ($a = 0; $a -lt $allItems.Count; $a++) {
    $n = $itemNorm[$a]
    if ($n -and $byName.ContainsKey($n)) {
      $b = $byName[$n]
      if (-not $usedL.ContainsKey($b)) { $usedL[$b] = $true; $assignI[$a] = @{ idx = $b; score = 1.0 } }
    }
  }
  # pass 2 - fuzzy over the leftovers only
  $restA = @(0..($allItems.Count-1) | Where-Object { -not $assignI.ContainsKey($_) })
  $restB = @(0..($ilg.Count-1)      | Where-Object { -not $usedL.ContainsKey($_) })
  if ($restA.Count -and $restB.Count) {
    $pairsI = @()
    foreach ($a in $restA) {
      $na = $itemNorm[$a]
      if (-not $na) { continue }
      foreach ($b in $restB) {
        $nb = $ilgNorm[$b]
        if (-not $nb) { continue }
        # cheap length gate before paying for the DP table
        if ([Math]::Abs($na.Length - $nb.Length) / [double][Math]::Max($na.Length, $nb.Length) -gt 0.45) { continue }
        $sc = Get-Similarity $na $nb
        if ($sc -ge 0.55) { $pairsI += ,@($sc, $a, $b) }
      }
    }
    foreach ($pr in ($pairsI | Sort-Object -Property { -$_[0] })) {
      if ($assignI.ContainsKey($pr[1]) -or $usedL.ContainsKey($pr[2])) { continue }
      $usedL[$pr[2]] = $true
      $assignI[$pr[1]] = @{ idx = $pr[2]; score = [Math]::Round($pr[0], 3) }
    }
  }

  for ($a = 0; $a -lt $allItems.Count; $a++) {
    $it = $allItems[$a]
    if (-not $assignI.ContainsKey($a)) { $itemAudit.match_none++; continue }
    $lg2 = $ilg[$assignI[$a].idx]
    $sc  = $assignI[$a].score
    $it.legacy_problem_type_id = $lg2.$ItemLegacyIdProp
    $it.legacy_type_name       = $lg2.$ItemLegacyNameProp
    $it.legacy_match_score     = $sc
    if ($nameFreq[$itemNorm[$a]] -gt 1) {
      $it.legacy_match_level = 'ambiguous_duplicate_name'
      $itemAudit.match_ambiguous++
      continue
    }
    if ($sc -ge 0.85) {
      $it.legacy_match_level = 'confident'
      $itemAudit.match_confident++
      if ($lg2.PSObject.Properties.Name -contains 'concept_ids' -and $lg2.concept_ids) {
        $it.concept_ids = $lg2.concept_ids; $itemAudit.concept_ids_inherited++
      }
      if ($lg2.PSObject.Properties.Name -contains 'error_tags' -and $lg2.error_tags) {
        $it.legacy_error_tags_ref = $lg2.error_tags; $itemAudit.error_tags_referenced++
      }
    } else {
      $it.legacy_match_level = 'candidate'
      $itemAudit.match_candidate++
    }
  }
}

$audit.legacy_section_count = $legacy.Count
$audit.legacy_has_concept_ids = [bool](@($legacy | Where-Object { $_.PSObject.Properties.Name -contains 'concept_ids' }).Count)
$audit.legacy_unmatched = @(for ($b = 0; $b -lt $legacy.Count; $b++) { if (-not $takenOld.ContainsKey($b)) { $legacy[$b].$LegacyNameProp } })
$audit.legacy_source = if ($LegacyPath) { "$(Split-Path $LegacyPath -Leaf) ($LegacyArrayProp / $LegacyNameProp)" } else { $null }
if (-not $LegacyPath) { $audit._method = '이 단원에는 대조할 legacy 분류(raw_taxonomy·problem_types)가 존재하지 않는다. 매칭을 수행하지 않았고 concept_ids는 전부 null이다.' }
# error_tags exist in some legacy files but stay unused on purpose: the swap is a
# later, deliberate step, and every unit stored so far carries error_tags = null.
$legacyTags = @($legacy | Where-Object { $_.PSObject.Properties.Name -contains 'error_tags' } | ForEach-Object { $_.error_tags } | Where-Object { $_ } | Sort-Object -Unique)
$audit.legacy_has_error_tags   = [bool]$legacyTags.Count
$audit.legacy_error_tag_vocab  = $legacyTags.Count
$audit.legacy_error_tag_sample = @($legacyTags | Select-Object -First 8)

if ($AltLegacyPath -and (Test-Path -LiteralPath $AltLegacyPath)) {
  $alt = @((Get-Content -LiteralPath $AltLegacyPath -Raw -Encoding UTF8 | ConvertFrom-Json).$AltLegacyArrayProp)
  $altTags = @($alt | Where-Object { $_.PSObject.Properties.Name -contains 'error_tags' } | ForEach-Object { $_.error_tags } | Where-Object { $_ } | Sort-Object -Unique)
  $audit.alt_legacy_source           = "$(Split-Path $AltLegacyPath -Leaf) ($AltLegacyArrayProp)"
  $audit.alt_legacy_count            = $alt.Count
  $audit.alt_legacy_has_error_tags   = [bool]$altTags.Count
  $audit.alt_legacy_error_tag_vocab  = $altTags.Count
  $audit.alt_legacy_error_tag_sample = @($altTags | Select-Object -First 8)
  $audit.alt_legacy_has_concept_ids  = [bool](@($alt | Where-Object { $_.PSObject.Properties.Name -contains 'concept_ids' -and $_.concept_ids }).Count)
  $audit.alt_legacy_note             = '이 파일에서는 아무것도 상속하지 않았다. error_tags 배정 때 참고할 출처로만 기록한다.'
}

$topicTotal  = 0; $types | ForEach-Object { if ($null -ne $_.topic_type_count) { $topicTotal += $_.topic_type_count } }
# Two different null-count cases must not be conflated:
#  - truly unreadable: no badge AND no rows (badge-less standalone like 경우의 수 G031,
#    수열 G062) -> the group exists as a classification target but its contents are unknown.
#  - badge-less-verified: no badge but the workbook DID transcribe rows against the source
#    (확률 PSP: all 4 groups, 원본 3장 전수 대조). Contents are known; only the screen badge
#    was missing. Calling these "unreadable" would misstate verified data.
$topicUnreadable = @($types | Where-Object { $null -eq $_.topic_type_count -and $_.topic_type_actual -eq 0 } | ForEach-Object { $_.source_group_id })
$topicBadgelessVerified = @($types | Where-Object { $null -eq $_.topic_type_count -and $_.topic_type_actual -gt 0 } | ForEach-Object { $_.source_group_id })
$detailTotal = 0; $types | ForEach-Object { if ($null -ne $_.detail_type_count) { $detailTotal += $_.detail_type_count } }
$detailUnknown = @($types | Where-Object { $null -eq $_.detail_type_count } | ForEach-Object { $_.source_group_id })
$itemTotal   = 0; $types | ForEach-Object { $itemTotal   += $_.topic_type_actual }
$nameCountTotal = 0; $itemsWithNames = 0
if ($hasNameCount) { $types | ForEach-Object { if ($_.detail_type_name_count) { $nameCountTotal += $_.detail_type_name_count } } }
if ($hasDetailNames) { foreach ($t in $types) { foreach ($it in $t.topic_types) { if ($it.detail_type_names_raw) { $itemsWithNames++ } } } }
# Under GroupOnlyDepth every group's badge count exceeds its zero stored rows by
# design (topics were folded), so that gap is not a mismatch to explain.
# NB: keep this as two statements, not an `if`-expression -- PS 5.1 serialises the
# empty-array result of an if-expression as {} instead of [], which churns the diff.
$itemMismatch = @($types | Where-Object { $null -ne $_.topic_type_count -and $_.topic_type_count -ne $_.topic_type_actual } | ForEach-Object { $_.source_group_id })
if ($GroupOnlyDepth) { $itemMismatch = @() }
$itemAccepted   = @($itemMismatch | Where-Object { $KnownSourceMismatch -contains $_ })
$itemUnexplained = @($itemMismatch | Where-Object { $KnownSourceMismatch -notcontains $_ })

$doc = [ordered]@{
  schema  = 'mathflat_problem_type.v1'
  version = "2026.07.22-mathflat-$SEMESTER-$($UnitCode.ToLower())"
  _note   = '매쓰플랫 화면 스크린샷을 전사한 엑셀을 그대로 옮긴 원본 분류. 진단 단위는 "유형 묶음"(problem_types), 그 아래 topic_types가 엑셀 문항분류표를 세부코드·묶음 내 번호·검토상태까지 그대로 담는다. 한글 이름은 원문 그대로이며 다듬지 않았다. 데이터 저장만 한 상태이고 진단 로직에는 연결하지 않았다 — 기존 raw_taxonomy와 옛 진단 경로는 그대로 둔다.'
  _source = [ordered]@{
    origin      = $SourceZip
    workbook    = "$Chapter.xlsx"
    extracted_at= '2026-07-22'
    principle   = '화면에 글자로 보이는 항목만 입력. 보이지 않는 이름은 생성하지 않음.'
  }
  _wiring = [ordered]@{
    concept_ids      = '이름 유사도 0.85 이상인 legacy 섹션에서만 상속했다. 나머지는 null — 사람 확인 전까지 비워 둔다. 순서 대응 상속은 legacy 목록의 구성이 달라 폐기했다.'
    error_tags       = '미배정 (null). 기존 유형에서 묶음 단위 상속 예정.'
    prerequisite_ids = '전부 비움 — 선생님이 직접 지정.'
  }
  semester   = $SEMESTER
  semester_name = $SemesterName
  unit_id    = $UnitId
  unit_code  = $UnitCode
  unit_code_note = if ($UnitCodeNote) { $UnitCodeNote } else { $null }
  source_exclusions = [ordered]@{
    count = $SourceExclusion.Count
    items = @($SourceExclusion)
    note  = if ($SourceExclusion.Count) {
        '매쓰플랫 화면에 있으나 배지·하위 이름이 보이지 않아 엑셀 집계에서 제외된 항목이다. 유형요약에 행 자체가 없으므로 개수 검증으로는 드러나지 않는다. 나중에 원본을 다시 볼 때 여기부터 확인하면 된다.'
      } else { $null }
  }
  unit_name  = $UnitName
  chapter    = $Chapter
  status     = 'raw_not_wired'
  problem_type_count = $types.Count
  count_check = [ordered]@{
    expected = $Expected
    actual   = $types.Count
    match    = ($types.Count -eq $Expected)
  }
  topic_type_total  = $topicTotal
  item_check = [ordered]@{
    declared_total = $topicTotal      # 유형요약 시트의 '화면 주제유형 수' 합계
    stored_total   = $itemTotal       # 실제로 저장한 문항분류표 행 수
    # 원본 표기 오류로 확인된 그룹을 뺀 나머지가 0이어야 통과다.
    match          = ($itemUnexplained.Count -eq 0)
    mismatched_groups        = $itemMismatch
    accepted_source_errors   = $itemAccepted
    accepted_source_note     = $KnownSourceMismatchNote
    unexplained_groups       = $itemUnexplained
    unreadable_groups        = $topicUnreadable
    unreadable_note          = '매쓰플랫 화면에 주제유형 개수가 표시되지 않아 하위 항목을 하나도 읽지 못한 묶음이다. topic_type_count는 null이고 topic_types는 비어 있다. 항목이 없다는 뜻이 아니라 모른다는 뜻이다.'
  }
  detail_type_total = $detailTotal
  detail_type_check = [ordered]@{
    counted_groups   = $types.Count - $detailUnknown.Count
    unknown_groups   = $detailUnknown          # 화면에 배지가 없어 개수를 모르는 묶음
    unknown_note     = '이 묶음들은 detail_type_count가 null이다. 세부유형이 없다는 뜻이 아니라 화면에서 개수를 읽을 수 없었다는 뜻이며, 추정하지 않았다.'
    total_is_partial = ($detailUnknown.Count -gt 0)
  }
  detail_type_name_check = if (-not $hasNameCount) { $null } else { [ordered]@{
    declared_total = if ($ExpectedDetailNames -ge 0) { $ExpectedDetailNames } else { $null }
    summary_total  = $nameCountTotal   # 유형요약 '표시 세부유형 이름 수' 합계
    items_with_names = $itemsWithNames # detail_type_names_raw가 채워진 문항 항목 수
    match          = if ($ExpectedDetailNames -ge 0) { ($nameCountTotal -eq $ExpectedDetailNames) } else { $null }
    note = '이 단원만 스크린샷이 세부유형이 펼쳐진 상태로 찍혀 세부유형 이름이 일부 확보됐다. 이름 문자열은 쉼표로 이어져 있으나 이름 자체에 쉼표가 있어 쉼표 분리로는 개수를 셀 수 없다. 개수는 유형요약의 표시 세부유형 이름 수를 쓰고, 이름은 원문 문자열 그대로 둔다.'
  } }
  legacy_audit = $audit
  item_legacy_audit = $itemAudit
  problem_types = $types
}

if (-not $hasNameCount) { $doc.Remove('detail_type_name_check') }
# GroupOnlyDepth marker: record that the topic layer was folded in the source and
# only badge counts are known. Diagnosis still targets the 유형 묶음 level.
if ($GroupOnlyDepth) {
  $doc.topic_depth = 'group_only'
  $doc.topic_depth_note = '원본 스크린샷이 유형 묶음 레벨에서 접힌 상태로 찍혀(▶ 미펼침) 하위 주제유형 이름을 캡처하지 못했다. topic_type_count/detail_type_count는 화면 배지에서 얻은 실제 개수이고, topic_types는 비어 있다(이름 미수집, 추정 아님). 진단 단위는 유형 묶음이므로 진단에는 영향이 없다. 나중에 펼친 화면을 재캡처하면 topic_types를 채워 넣을 수 있다.'
  $doc.item_check.topic_layer_folded = $true
  $doc.item_check.declared_topic_badges = $topicTotal   # 화면 주제유형 수 배지 합계(실제)
  $doc.item_check.stored_topic_rows     = $itemTotal     # 0 -- 이름 미수집
}
# Emit the badge-less-verified fields only when such a group exists, so every unit
# stored before this case (none have null count with rows) stays byte-identical.
if ($topicBadgelessVerified.Count) {
  $doc.item_check.badge_less_verified_groups = $topicBadgelessVerified
  $doc.item_check.badge_less_verified_note   = '화면 배지는 없지만 원본 스크린샷 전수 대조로 항목을 직접 확인해 문항분류표에 행을 유지한 묶음이다. topic_type_count는 배지가 없어 null이지만 topic_types는 실측 항목으로 채워져 있다(추정 아님). 확률 단원처럼 배지가 통째로 안 보이는 경우다.'
}

$json = $doc | ConvertTo-Json -Depth 12
# PS 5.1 escapes non-ASCII as \uXXXX; restore real characters, keep JSON escapes intact.
$json = [Regex]::Replace($json, '\\u(?<c>[0-9a-fA-F]{4})', { param($m) [char][int]('0x' + $m.Groups['c'].Value) })

# ConvertTo-Json indents by key alignment; re-emit as plain 2-space to match the repo.
function Format-Json([string]$src) {
  $sb = New-Object System.Text.StringBuilder
  $depth = 0; $inStr = $false; $esc = $false
  for ($i = 0; $i -lt $src.Length; $i++) {
    $ch = $src[$i]
    if ($inStr) {
      [void]$sb.Append($ch)
      if ($esc) { $esc = $false } elseif ($ch -eq '\') { $esc = $true } elseif ($ch -eq '"') { $inStr = $false }
      continue
    }
    switch ($ch) {
      '"' { $inStr = $true; [void]$sb.Append($ch) }
      '{' { $depth++; [void]$sb.Append("{`n" + ('  ' * $depth)) }
      '[' { $depth++; [void]$sb.Append("[`n" + ('  ' * $depth)) }
      '}' { $depth--; [void]$sb.Append("`n" + ('  ' * $depth) + '}') }
      ']' { $depth--; [void]$sb.Append("`n" + ('  ' * $depth) + ']') }
      ',' { [void]$sb.Append(",`n" + ('  ' * $depth)) }
      ':' { [void]$sb.Append(': ') }
      default { if ($ch -notmatch '\s') { [void]$sb.Append($ch) } }
    }
  }
  $out = $sb.ToString()
  # collapse empty containers that the rules above split across lines
  $out = [Regex]::Replace($out, '\{\s*\}', '{}')
  $out = [Regex]::Replace($out, '\[\s*\]', '[]')
  $out
}
$json = Format-Json $json
[System.IO.File]::WriteAllText($OutPath, $json, (New-Object System.Text.UTF8Encoding($false)))

"OUT: $OutPath"
"count: $($types.Count) / expected $Expected  -> $(if ($types.Count -eq $Expected) {'OK'} else {'MISMATCH'})"
"topic_total(declared): $topicTotal   items(stored): $itemTotal  -> $(if ($itemUnexplained.Count -eq 0) { if ($itemAccepted.Count) { "OK (원본 표기 오류 수용: $($itemAccepted -join ','))" } else { 'OK' } } else { "MISMATCH $($itemUnexplained -join ',')" })"
"detail_total: $detailTotal$(if ($detailUnknown.Count) { "  (배지 미표시로 개수 모름 $($detailUnknown.Count)개 그룹: $($detailUnknown -join ','))" })"
"legacy_audit: " + (($audit.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '  ')
"item_legacy: ran=$($itemAudit.ran) src=$($itemAudit.source) confident=$($itemAudit.match_confident)/$($itemAudit.item_count) candidate=$($itemAudit.match_candidate) concept=$($itemAudit.concept_ids_inherited) errtag_ref=$($itemAudit.error_tags_referenced)"
