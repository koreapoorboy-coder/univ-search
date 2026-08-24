# Code탭 회신 — 46칸 쓰기 보류: 승인 조건 ① 충족 불가 + 대안 dry-run 통과

검수 판정 54차(쓰기 승인) 대응 · 2026-08-24

---

## 0. 결론 — ★쓰지 않았습니다. 확인 한 건 받고 실행하겠습니다

```
★승인 조건 ① 을 문자 그대로는 충족할 수 없습니다
  add_catalog_entries.ps1 은 원의 성질 카탈로그를 ★설계대로 거부합니다
  (추측이 아니라 실제로 돌려서 확인했습니다. §1)

★대안을 만들어 dry-run 을 통과시켜 두었습니다
  신규 형제 도구 add_catalog_entries_by_template.ps1
  5항 + 추가 2항 전부 통과 · 역산 바이트 동일 · 카탈로그 미기록 (§2)

★카탈로그는 무변경입니다. git status 로 확인했습니다
승인 조건 ①이 지목한 도구가 아니므로, ★승인 없이 쓰지 않았습니다
```

---

## 1. 왜 조건 ① 을 못 지키는가 — 실측

`add_catalog_entries.ps1` 을 원의 성질 카탈로그에 `-DryRun` 으로 실행한 결과입니다.

```
REFUSED: catalog field set differs from this tool's fixed order.
         catalog=problem_type_id,unit_id,unit_name,type_name,ty...
exit 1        카탈로그 변경 없음
```

★**이 거부는 버그가 아니라 그 도구의 설계입니다.** 원인은 셋입니다.

| 항목 | add_catalog_entries.ps1 (닮음 전용) | 원의 성질 카탈로그 |
|---|---|---|
| 필드 수·순서 | 14개 고정 배열 `$FIELD_ORDER` | **8개, 순서도 다름** |
| `concept_ids` | `"concept_ids":  "<문자열>"` | **원소 1개 배열** (여러 줄) |
| `error_tags` | `"error_tags":  null` | **빈 배열** (여러 줄) |
| `default_difficulty` | ★필드 자체가 없음 | 있음 |
| `problem_family_id` | `M2_SIMPY_FAM_` 접두사 하드코딩 | 필드 자체가 없음 |

★즉 `Render-Entry` 가 닮음 카탈로그의 레이아웃을 그대로 박아 넣고 있고,
필드셋 가드가 그것을 다른 단원에 쓰지 못하게 막습니다. **가드가 제 일을 했습니다.**

---

## 2. 대안 — `add_catalog_entries_by_template.ps1` (신규, 254행)

### 2-1. 설계

```
★레이아웃을 하나도 하드코딩하지 않는다
  대상 파일의 ★기존 엔트리 텍스트를 템플릿으로 복제하고,
  달라지는 값만 치환한다
  ⇒ 들여쓰기 · 필드 순서 · 필드셋 · 값의 모양(배열/스칼라)이
    전부 ★대상 파일 자신에게서 나온다. 기존과 어긋날 수가 없다
  ⇒ 고정 배열이 주던 보장을 ★스크립트가 아니라 데이터에서 얻는다
```

★**`add_catalog_entries.ps1` 은 고치지 않았습니다.** 닮음 경로는 검증된 상태로 둡니다.
(둘째 단원 때문에 둘째 레이아웃을 박으면 셋째 단원에서 같은 일이 반복됩니다.)

```
치환 방식  정규식 치환 문자열이 아니라 ★인덱스 재조립
           이유 = 유형명에 \ 나 $ 가 있으면 치환 문자열로 재해석된다
           값에 " 나 \ 가 있으면 ★추측하지 않고 REFUSED
상수 검사  패치가 건드리지 않는 필드는 템플릿과 ★바이트 동일한지 검사
ASCII      비ASCII 0바이트 (자기검사 통과. 작성 중 1바이트 걸려서 고쳤습니다)
변수명     한 글자 없음. PS 자동변수 $_ 만
가드       엔트리 0건 = 실패 · 단원 접두사 대조 · 중복 id · 후속자 부재
```

### 2-2. dry-run 결과 (카탈로그 미기록)

```
[tmpl] M3_CIRC_PT003   block 718 chars   indent 26
entries before : 47      entries to add : 46
template : M3_CIRC_PT003  fields 8
  (problem_type_id,unit_id,unit_name,type_name,type_name_source,concept_ids,default_difficulty,error_tags)
vary  : problem_type_id,type_name,default_difficulty,concept_ids
const : unit_id,unit_name,type_name_source,error_tags

VERIFY
  1 parse             : ok
  2 count             : 47 -> 93
  3 field set/order   : ok (8 fields, template order)
  3 constant fields   : ok (byte-equal to template)     <- 추가 검사
  3 concept_ids shape : ok (1-element array)            <- 추가 검사
  4 U+FFFD            : 0
  5 reversal          : ok (untouched bytes identical)

DRY RUN - catalog not written.
```

★삽입 순서는 PT 오름차순이고, 같은 후속자를 공유하는 칸도 번호 순서가 유지됩니다
(후속자 29종에 46칸이 붙습니다).

### 2-3. ★필요한 것 — 확인 한 건

```
승인 조건 ① 은 add_catalog_entries.ps1 을 지목했고, 저는 다른 도구를 만들었습니다.
조건의 ★이유("전량 재직렬화 금지 · 텍스트 서지컬 삽입")는 충족하지만
★지목된 도구는 아닙니다. 그래서 쓰지 않고 멈췄습니다.

(가) 신규 도구로 진행 승인    -> 즉시 실행합니다. 명령 하나입니다
(나) add_catalog_entries.ps1 을 대상 파일에서 필드셋을 읽도록 개조
     -> ★닮음 경로에 회귀 위험이 생깁니다. 권하지 않습니다
(다) 다른 방법 지시
```

---

## 3. 파생본 목록 (판정 54차 요구 — "그 외 파생본이 더 있으면 목록을 회신")

원의 성질 PT 를 참조하는 파일 전부를 세었습니다.

### 3-1. ★갱신 필요 2건

| 파일 | 현재 | 조치 |
|---|---|---|
| `data/problem_types_short/M3_CIRCLE_PROPERTIES.catalog_short.v1.json` | `count: 47` · types 47개 | **93 으로 재생성.** `make_catalog_short.ps1 -Unit M3_CIRCLE_PROPERTIES` |
| `data/problem_types/m3_circle_properties.problem_types.v1.json` | `problem_type_count: 47` | **93.** 삽입 도구가 자동 갱신 (dry-run 에서 확인) |

★`catalog_short` 가 **닮음에서 87 에 정지해 있던 그 파생본**입니다. 지적하신 대로 실재합니다.

### 3-2. ★판정 필요 1건 — axis_map 오버레이

```
data/axis_map/m3_circle_properties.pt_fine_error_tags.v1.json
  pt_fine_error_tags = ★PT 를 키로 하는 맵. 키 47개 (기존 47종과 일치)
  n_pt = 47        total_pt = ★0        <- 이 0 은 제 작업과 무관한 기존 값입니다
```
★신규 46종은 이 맵에 **키가 없습니다.**
다만 이 오버레이는 카탈로그 종수의 기계적 파생이 아니라
**reflection likely_error_tags × source_item_links 조인 산출물**입니다(파일의 `join` 필드).
문항 근거가 없는 신규 칸에 빈 키를 넣는 것이 맞는지 **Code탭이 정하지 않습니다.**

```
선택지  ① 손대지 않는다 (47키 유지. 신규 46종은 오버레이 미보유)
        ② 빈 키 46개를 넣는다
        ③ 문항 배정 후 재생성한다
★n_pt=47 을 93 으로 고칠지도 같은 판정에 포함됩니다
```

### 3-3. 조치 불요 3건 — 빈 스텁

```
data/relations/m3_circle_properties.edges.v1.json          edges 0건 · 264바이트
data/rules/m3_circle_properties.diagnosis_rules.v1.json    rule_count 0 · 273바이트
data/remediation/m3_circle_properties.remediation_map.v1.json  remediation 빈 · 258바이트
⇒ PT 참조 0건. 종수와 무관합니다
```

### 3-4. ★발견 — raw_taxonomy 파일이 존재합니다

앞선 회신에서 "카탈로그에 `raw_taxonomy` 필드가 없다"고 보고했는데,
**별도 파일로 존재합니다.** 정정합니다.

```
data/raw_taxonomy/m3_circle_properties.mathflat.v1.json      164,846 바이트
  problem_type_count = ★54
  count_check = { expected 54, actual 54, match True }
  키에 topic_type_total · detail_type_total · legacy_audit · item_legacy_audit 등이 있습니다
```

★**분석하지 않았습니다.** 판정 53차가 44≠42 규명을 열지 않기로 했으므로 숫자만 보고합니다.
다만 그때 "patch 작성 시점과 학습지 판본 대조가 필요하다"고 하신 그 재료가
**이 파일일 가능성이 있습니다**(42 · 44 · 54 가 서로 다른 수입니다).
★46칸 복원과 독립이므로 지금 열지 않습니다. **나중에 여실 때의 진입점으로 기록만 합니다.**

---

## 4. 손대지 않은 것

```
✔ 카탈로그        무변경 (git status 확인). dry-run 만 돌렸습니다
✔ add_catalog_entries.ps1   무수정
✔ EMPTY_SLOT 11개 33칸      패치에 없습니다
✔ 미등재 13종               건드리지 않았습니다
✔ 44 != 42                  열지 않았습니다 (§3-4 는 파일 존재·숫자 보고만)
✔ 문항수 1건 차이            판정 50차 종결분
✔ D1                        접근 없음
✔ decl 126                  낮추지 않았습니다. count 를 126 으로 올리지도 않았습니다
```

---

## 5. 승인 시 실행 순서 (준비 완료)

```
1  powershell -File tools\axis_prediction\add_catalog_entries_by_template.ps1 `
     -Catalog public\math-weakness-engine\data\problem_types\m3_circle_properties.problem_types.v1.json `
     -PatchFile <패치> -TemplateId M3_CIRC_PT003 `
     -BackupDir public\math-weakness-engine\data\problem_types\_backup
   -> 백업 ...pre-add-46entries · 5+2항 검증 · problem_type_count 47->93

2  powershell -File tools\axis_prediction\make_catalog_short.ps1 -Unit M3_CIRCLE_PROPERTIES
   -> catalog_short count 47 -> 93 (실제 숫자 회신)

3  powershell -File tools\axis_prediction\check_catalog_integrity.ps1
   -> entry 93 / decl 126 · C2 FAIL 유지가 정상 (판정 54차 사전판정)

4  31슬롯 완비 표 작성 (3칸 type_name 나란히) — ★판단 없이 표만
```

★패치 파일은 세션 임시폴더에 있습니다. 승인 시 리포에 함께 등재합니다.

## 6. 산출

```
tools/axis_prediction/add_catalog_entries_by_template.ps1        254행 신규 도구
tools/axis_prediction/B_circle_add46_blocker_and_dryrun.v1.md    이 문서
```
