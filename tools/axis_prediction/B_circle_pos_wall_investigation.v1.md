# Code탭 회신 — pos 벽 조사 (판정 58차 요청 1~4)

2026-08-24 · 코드·기록 읽기만. D1 쓰기 없음. pos 배정 규칙을 세우지 않았습니다.

---

## 0. 요약 — 네 줄

```
요청 1  problem_type_id 는 ★제약 없는 단일 TEXT. NULL 허용.
        ★슬롯만 담을 표현은 없다. base/slot/pos 컬럼이 어느 스키마에도 없다
        워커는 카탈로그 대조를 ★하지 않지만, ★엔진이 모르는 id 를 만나면 문항을 버린다

요청 2  pos 가 갈라놓는 지점은 ★2곳. 그런데 ★원의 성질에서는 지금 ★1곳만 살아 있다
        처방 조회는 problem_type_id 가 아니라 ★concept_id(=슬롯) 기준이다 -> pos 무관

요청 3  ★원의 성질에 처방이 없다. 세 층 전부 비어 있다
        + 엔진의 no_template_units 에 ★등재돼 있어 비-GENERIC 처방을 억제당한다

요청 4  ★닮음은 pos 를 정하지 않았다. ★pos 선택이 필요 없는 문항만 배정했다
        A_single_cell 149 = cells_in_slot 1  (149/149 예외 0)
        B_multi_cell_hold 308 = cells_in_slot 2 또는 3 (308/308 예외 0) -> 보류
★그런데 그 방법은 ★재사용하지 않습니다 — §4-4 · §5. 판정 59차로 기각됐습니다
        만들어진 칸이 하나였다는 것은 유일해가 아니라 ★2/3 확률로 틀린 배정이었습니다
```

## 0-2. ★판정 59차가 기록으로 남기라고 한 사실

```
① 슬롯이 맞으면 진단은 옳게 작동한다
   처방 조회 remediationByConcept[concept_id] · 점수 pt.concept_ids
   -> ★같은 슬롯의 세 칸이 동일한 결과를 낸다
② (A) 지시 팩이 0/93 이므로 ★지금은 세 칸 모두 null 이다
③ ★칸만 고치는 것은 덮어쓰기이고 가능하다 (빈 값으로 되돌리는 것만 불가)
   -> 나중에 pos 를 정할 근거가 생기면 그때 고칠 수 있다
★유형 지정 보류의 이유는 pos 가 아니라 ★처방이 없어서다. 영구 보류가 아니다
```

---

## 1. 요청 1 — `problem_type_id` 가 받는 값

### 1-1. 스키마 제약: 사실상 없음

`data/db/user_items.schema.v2.sql:11`
```sql
problem_type_id  TEXT,               -- 기존 유형에서 지정(진단 매칭 키). 비면 pending
```
```
NULL 허용     ★예 (NOT NULL 없음)
CHECK 제약     ★없음
FK 제약        ★없음 (카탈로그와 DB 수준 연결이 없다)
UNIQUE         ★없음   (인덱스만: idx_ui_type)
배열 여부      ★아니다. 스칼라 TEXT 하나
```
★**v3 / v3.1 / v3.2 의 `ADD COLUMN` 전량을 확인했습니다.
`slot` · `base_name` · `pos` 계열 컬럼은 ★어느 버전에도 없습니다.**
추가된 것은 `source_text · provenance · dedup_key · dedup_key_norm_version · org_id ·
bulk_batch_id · content_hash · question_no` 뿐입니다.

⇒ **"슬롯만 아는 상태"를 담을 자리가 스키마에 없습니다.**

### 1-2. 워커가 검사하는 것 / 하지 않는 것

`worker_skeleton/math_diagnosis_worker.js`

| 지점 | 검사 내용 |
|---|---|
| `:662` | `if (!a.id \|\| !a.problem_type_id)` → ★**빈 값만 거부.** 이것이 닮음의 "롤백 불가" 근거 |
| `:667-668` | `UPDATE ... SET problem_type_id=?1, status='approved'` → ★**카탈로그 대조 없이 문자열을 그대로 쓴다** |
| `:354` `:602` | `hasType = trim().length > 0` → 값 있으면 `approved`, 없으면 `pending` |
| `:665` | `computeItemHashes({... problem_type_id ...})` → ★**content_hash 에 들어간다** |

```
★따라서 워커는 'M3_CIRC_SLOT_15' 같은 값도 거부하지 않고 씁니다.
★그러나 그것은 쓸 수 있다는 뜻이지 작동한다는 뜻이 아닙니다 — §1-3
★부수 효과: problem_type_id 를 바꾸면 content_hash 가 바뀝니다.
  그래서 bulk-assign-type 이 UNIQUE 충돌을 conflicts 배열로 반환합니다(:672)
```

★AI 경로에는 제약이 있습니다 — `:284` `:907` 의 structured output 스키마가
`problem_type_id: { enum: [...typeIds, NO_MATCH] }` 로 **카탈로그 id 로 한정**합니다.
다만 이것은 AI 구조화·진단 경로이고, **일괄 지정 엔드포인트에는 걸리지 않습니다.**

### 1-3. ★엔진은 모르는 id 를 만나면 문항을 버립니다

`assets/math_weakness_engine.js:336-337`
```js
const pt = this.problemTypeById[attempt.problem_type_id];
if (!pt) return { problem_type_id: attempt.problem_type_id, missing: true };
```
★카탈로그에 없는 값을 넣으면 **그 문항은 진단에서 통째로 빠집니다.**
`missing: true` 로 표시되긴 하므로 조용한 누락은 아니지만, 학생에게 가는 것은 없습니다.

⇒ **결론: 슬롯만 아는 상태로 넣을 수 있는 표현은 없습니다.**
값을 쓰는 것 자체는 막히지 않지만, 카탈로그에 없는 값은 엔진이 버립니다.

---

## 2. 요청 2 — `problem_type_id` 가 진단·처방에서 쓰이는 경로

### 2-1. 코드 경로 (모두 `assets/math_weakness_engine.js`)

```
:148   problemTypeById         = byId(allProblemTypes, 'problem_type_id')
:240   problemTypeInstructionById = byId(instructionList, 'problem_type_id')   ← ★PT별 = pos별
:336   pt = problemTypeById[attempt.problem_type_id]
:338   instruction = getProblemInstruction(pt.problem_type_id)                 ← ★pos 갈림 (A)
:557   (pt.concept_ids||[]).forEach(cid => addScore(cid, ...))                 ← 슬롯 기준
:565   remediation: this.remediationByConcept[x.concept_id] || null            ← ★슬롯 기준
:149   remediationByConcept = byId(allRemediation, 'concept_id')               ← ★concept_id 키
:574   ... && (a.difficulty==='basic' || pt.default_difficulty==='basic') ...  ← ★pos 갈림 (B)
```

### 2-2. ★pos 가 실제로 갈라놓는 지점은 2곳뿐입니다

| | 지점 | pos 가 바꾸는 것 |
|---|---|---|
| **(A)** | `:338` `getProblemInstruction(problem_type_id)` | **학생용 행동지시.** 지시 팩이 PT 단위이므로 칸마다 다름 |
| **(B)** | `:574` `pt.default_difficulty === 'basic'` | pos0 만 `basic` → 이 게이트의 통과 여부 |

### 2-3. ★처방은 pos 로 갈리지 않습니다 — `concept_id` 기준입니다

```
:149  remediationByConcept = byId(allRemediation, 'concept_id')
:565  remediation = remediationByConcept[x.concept_id] || null
```
`concept_id` 는 **슬롯 번호**입니다(슬롯번호 = 개념번호, 원의 성질 93/93 불일치 0 검증분).
★**같은 슬롯의 세 칸은 처방 조회에서 동일한 결과를 냅니다.**
점수 누적(`:557`)도 `pt.concept_ids` 를 타므로 마찬가지로 슬롯 기준입니다.

### 2-4. 판정 38차의 기록과의 관계

판정 38차는 "칸이 틀리면 학생이 받는 지시문이 통째로 다르다 (student_command 유사도 0.091)"
고 적었습니다. 코드로 보면 **그 경로는 §2-2 의 (A)** 입니다.

★**그 측정은 M2_GEOM 처방 스트림에서 나온 것이고, 그 단원은 지시 팩이 완비돼 있습니다.**
아래 실측이 그것을 보여줍니다 — 그리고 원의 성질은 다릅니다(§3).

```
data/display/problem_type_instruction_map.v1.json  (manifest, parts 4개 · 총 38.7MB)
  선언 instruction_total_count = 12,610
  ★part 4/4 전량 스캔 결과 distinct PT
    M2_GEOM_PT   ★140 / 140   (완비)
    M2_SIMPY_PT  ★ 87 / 100   (87종 시절 산출분. 그 뒤 늘어난 13종은 없음)
    M3_CIRC_PT   ★  0 /  93
    M3_TRIG_PT   ★  0 / 108
```
★즉 판정 38차의 실익 측정은 **지시 팩이 있는 단원**에서 성립한 것입니다.
**원의 성질에서는 (A) 경로가 지금 전부 `null` 입니다.**

⇒ **원의 성질에서 pos 가 현재 실제로 갈라놓는 것은 (B) 한 곳뿐입니다.**
★이것은 "pos 가 중요하지 않다"는 말이 아닙니다. **지시 팩이 만들어지면 (A)가 살아납니다.**
지금 상태의 사실 보고입니다.

---

## 3. 요청 3 — 원의 성질에 처방이 존재하는가

### ★없습니다. 세 층 전부입니다.

```
① 개념 처방   data/remediation/m3_circle_properties.remediation_map.v1.json
              "_note": "minimal placeholder (no remediation yet)"
              "remediation": [ ]        ★원소 0
② PT 지시     problem_type_instruction_map parts 전량 스캔
              M3_CIRC_PT ★0 / 93
③ 진단 규칙   data/rules/m3_circle_properties.diagnosis_rules.v1.json
              rule_count ★0
```

### ★그리고 엔진이 이 단원의 처방을 억제합니다

`data/display/template_unit_map.v1.json` 의 `no_template_units` (11개)
```
M1_SOLID_GEOMETRY · M1_BASIC_GEOMETRY · M1_PLANE_GEOMETRY · ★M3_CIRCLE_PROPERTIES ·
★M3_TRIGONOMETRIC_RATIO · M1_PRIME_FACTORIZATION · M3_REAL_NUMBER_CALC ·
M2_NUMBER_EXPRESSION · M1_EXPRESSION · M1_DATA_ANALYSIS · M1_INT_RATIONAL
★M2_SIMILARITY_PYTHAGORAS 는 ★목록에 없습니다
```
`math_weakness_engine.js:344`
```js
if (instruction && _tplId && this.noTemplateUnits.has(_unitId) && !this.genericTemplateIds.has(_tplId)) {
  // 전용 처방 템플릿이 구조적으로 없는 단원에 비-GENERIC 처방이 붙었으면 = 틀린 처방. 억제한다
```
★**원의 성질은 "전용 처방 템플릿이 구조적으로 없는 단원"으로 엔진에 등록돼 있습니다.**

### 참고 — 닮음도 개념 처방은 비어 있습니다

```
data/remediation/m2_similarity_pythagoras.remediation_map.v1.json   remediation 원소 ★0
```
★닮음은 **PT 지시(87종)로 학생 산출물을 냅니다.** 개념 처방 층은 두 단원 다 비어 있습니다.

⇒ **사실 보고: 지금 원의 성질 문항에 유형을 붙여도 학생에게 갈 것은 없습니다.**
긴급도 판단은 검수 몫입니다.

---

## 4. 요청 4 — 닮음은 어떻게 넘겼는가 (기록 확인)

### 4-1. problem_type_id 는 붙어 있습니다

```
D1 닮음 1,650문항   approved 1,338 · pending 312
최종 5지표          OK 985 · CELL 348 · BASE 1 · NEWLABEL 4 · NOID 312
```

### 4-2. ★pos 를 정하지 않았습니다. pos 선택이 필요 없는 것만 배정했습니다

기록: `B_simpy_noid_classified_461.v2.csv` (461행). `cells_in_slot` 컬럼이 답입니다.

| class | 건수 | `cells_in_slot` 분포 | 처리 |
|---|---:|---|---|
| `A_single_cell` | **149** | **1칸 : 149건** (예외 0) | ★배정함 |
| `B_multi_cell_hold` | **308** | 2칸 228 · 3칸 80 (1칸 0건) | ★보류 |
| `D_no_slot` | 4 | 0칸 : 4건 | 보류 |

```
★A 149건은 슬롯에 ★만들어진 칸이 하나뿐이어서 target_problem_type_id 가 하나로 나왔습니다
★B 308건은 만들어진 칸이 2~3개라 골라야 했고, 고를 근거가 없어 ★미배정으로 남겼습니다
  (닮음 최종 보고서 §6: "미배정이 오배정보다 낫다는 판단이고, 이것이 확정 입장")
```

★**즉 판정 38차가 종결한 문제를 닮음은 "넘긴" 것이 아니라 ★우회한 것입니다.**
pos 결정이 필요한 308건은 지금도 미배정입니다.

### 4-4. ★정정 (판정 59차) — A 149 를 "유일해"라 쓴 것은 틀렸습니다

```
초판에서 Code탭은 A 149 를 "선택이 아니라 유일해"라고 적었습니다. ★틀렸습니다.
"1칸 슬롯" 은 칸이 하나뿐이라는 뜻이 아니라 ★세 칸 중 하나만 만들어져 있었다는 뜻입니다.
닮음 카탈로그도 그 시점에 87/177 미완이었습니다.
⇒ 만들어진 그 칸에 배정하는 것은 유일해가 아니라 ★3분의 2 확률로 틀린 배정입니다.
★유일했던 것은 선택지이고 정답이 아닙니다.
⇒ ★이 방법을 재사용하지 않습니다 (판정 59차).
  닮음 149건은 다시 열지 않습니다. CELL 348 의 발생 기제와 연결될 수 있으나
  그것도 판정 25·38차 종결분입니다. 기록만 남깁니다
```

### 4-3. 참고 — 재배정 104건의 pos 는 어디서 왔는가

```
BASE 104건 재배정은 ★base(계열)를 고친 것이고 pos 는 D1 기존값을 유지했습니다.
CELL 348건(같은 계열·칸 불일치)은 ★손대지 않았습니다 — 그것이 바로 pos 문제입니다.
D1 최초 배정의 pos 출처는 ★미규명입니다(계열 오배정 기제, 판정 25차 2회 시도 후 종결).
★기록 없음 — 배정을 실행한 절차가 리포에 없습니다(워커→D1 직행, assign* 0건).
```

---

## 5. ★기각됨 (판정 59차) — 46칸 복원은 길을 닫은 게 아니라 벼랑을 드러냈습니다

### 5-1. Code탭 초판의 주장과 그것이 틀린 이유

```
초판 주장  "46칸 복원이 닮음의 우회로를 닫았다.
            복원 전이었다면 1,072건(49.4%)을 pos 없이 배정할 수 있었다"
★판정 59차 기각
```

산술 자체(1,072 / 49.4%)는 검수가 재현했고 맞습니다. **규정이 틀렸습니다.**

```
복원 전 31슬롯의 filled 분포 = {1칸 15개, 2칸 16개}.  ★3칸 완비 슬롯 0개
⇒ "1칸 슬롯" 은 칸이 하나뿐이라는 뜻이 아니라
   ★세 칸 중 하나만 만들어져 있었다는 뜻이다
⇒ 그 칸에 배정하는 것은 pos-무관 배정이 아니라
   ★3분의 2 확률로 틀린 pos 배정이다
```

### 5-2. ★실측 — 유일했던 칸의 pos 가 슬롯마다 다릅니다

복원 전 백업(`pre-add-46entries`)에서 15개 1칸 슬롯의 그 한 칸이 어느 pos 였는지 세었습니다.

```
slot  1  pos2 종합 활용      slot 22  pos1 조건 적용      slot 32  pos1 조건 적용
slot  7  pos0 기본 판별      slot 23  pos1 조건 적용      slot 36  pos1 조건 적용
slot  9  pos0 기본 판별      slot 26  pos1 조건 적용      slot 38  pos1 조건 적용
slot 12  pos1 조건 적용      slot 27  pos1 조건 적용      slot 39  pos0 기본 판별
slot 16  pos2 종합 활용      slot 29  pos0 기본 판별      slot 41  pos1 조건 적용

pos0 4개 · pos1 9개 · pos2 2개
```
★**슬롯마다 제각각입니다.** 즉 그 방법을 썼다면
```
slot  1 의 49문항 전부 -> '종합 활용'(pos2) 로
slot  7 의 28문항 전부 -> '기본 판별'(pos0) 로
```
가는데, **어느 쪽에도 근거가 없습니다.** 우연히 만들어져 있던 칸이 목적지를 정한 것뿐입니다.

### 5-3. 결론

```
★유일했던 것은 선택지이고 정답이 아니었습니다
★46칸 복원은 우회로를 닫은 것이 아니라, 그것이 우회로가 아니었음을 드러냈습니다
★이 방법(만들어진 칸 하나에 배정)은 재사용하지 않습니다
```
★Code탭의 초판 규정이 틀렸고, **1,072 라는 숫자가 맞았기 때문에 더 위험한 오류**였습니다.
숫자가 재현되면 규정도 맞다고 읽히기 쉽습니다. 산술과 해석은 별개로 검증해야 합니다.

---

## 6. 준수 확인

```
✔ pos 배정 규칙 안 세움     다섯 번째 가설 없음. §2 는 코드 경로 서술, §5 는 산술 보고
✔ 유형 지정 페이로드 없음
✔ 조인 미실행
✔ D1 쓰기 없음              워커·엔진·스키마 ★코드만 읽었습니다
✔ EMPTY_SLOT 33칸 · 미등재 13종 · axis_map · raw_taxonomy · decl 126   무접촉
✔ circle-11 13건            수정하지 않았습니다
```

## 7. 산출

```
tools/axis_prediction/B_circle_pos_wall_investigation.v1.md   이 문서
★새 데이터 파일을 만들지 않았습니다. 조사 회신뿐입니다
```
