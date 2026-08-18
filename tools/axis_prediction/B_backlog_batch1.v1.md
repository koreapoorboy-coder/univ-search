# 백로그 일괄 처리 1차 — ①~⑤ 결과 보고 v1 (2026-08-16)

> 검수 백로그 트랙. **처리 순서 = ② → ③ → ④ → ⑤ → ① → ⑥(다음)**. 수연산 처방(414)은 규격 승인 대기라 그 사이 처리.
> ⑥ 설계(관측→태그 개선 절차)는 분량이 커서 다음 턴 단독 처리.

---

## ② attempts.type_name 검증 — ★배포 완료 상태였음
**[코드확인] 배선 경로 (`math_diagnosis_worker.js`)**
```
1272  const typeNameById = {}            // 맵 선언
1279  for (const t of types) if (t && t.id) typeNameById[t.id] = t.name || '';
        └ fetchUnitProblemTypes 필드 = id·name (problem_type_id/type_name 아님)
1306  for (const a of attempts) if (a && a.problem_type_id && !a.type_name)
        a.type_name = typeNameById[a.problem_type_id] || '';
        └ matchAttemptsToItems(1305) **뒤**에 실행 = 매칭이 교정한 유형의 이름을 씀
```
**[실측] 라이브 배포 확인 (무료 GET, 재진단 없음)**
```
GET /health?t=…  →  "version": "2026.08.14-typename"
                    "qnorm_selfcheck": "pass"  "model": "claude-opus-4-8"  "effort": "high"
```
⇒ **v2 "★배포 대기" 항목은 이미 해소**됐습니다. 인계문 갱신 대상.

**재진단 없이 산출 확인 가능한가 — 불가.** 워커에 저장 레코드 조회 엔드포인트가 없습니다(`/api/axis-store/`는 `health`·`record`(POST)·`profile`뿐). D1 직접 조회는 사용자 콘솔 몫입니다.
→ **다음 진단 시 확인 항목으로 등록**: attempts[].type_name 이 비어 있지 않을 것. ①의 D1 조회를 사용자가 실행할 때 **같은 화면에서 함께 확인 가능**(아래 Q3).

**주의 1건(조용한 실패 계열)**: `fetchUnitProblemTypes`가 실패한 단원은 `typeNameById`가 비어 type_name이 `''`가 되고, 렌더러는 해당 항목을 제외합니다(`wrongText`). 실패는 `typeLoadFailed`에 남으므로 추적 가능하나, **화면에는 "항목이 그냥 없음"으로 보입니다.**

---

## ③ 23번 범주 오배정 — 사실만 보고 (판정 없음)
**대상**: "직선 PA가 원 O의 접선일 때 ∠x" → category `삼각형의 내심`(0.85), 2회 재현.

**[코드확인] 사실 3건**
1. **M2_GEOM 카탈로그 140종에 원의 접선 유형이 없다.** 원 관련은 4종뿐 — 삼각형의 외심과 외접원(조건 적용·계산 추론), 삼각형의 내심과 내접원(조건 적용·계산 추론).
2. **원의 성질은 별도 단원**이다: `data/problem_types/m3_circle_properties.problem_types.v1.json` (M3_CIRCLE_PROPERTIES).
3. **범주 배정은 단원 확정 이후 단계다.** `assignTypesForUnit`은 stage-1이 확정한 단원의 `catSet` 안에서만 고른다(`CATEGORY_ASSIGN_SCHEMA(catSet)`). 즉 stage-2는 **M2_GEOM 밖을 고를 수 없다**.

⇒ 관측되는 사실은 **"해당 범주 부재 상태에서 최근접 배정"** 과 정합합니다(내접원 = 원이 변에 접함 → 접선 문항과 표면 유사). 다만 **선행 지점은 stage-1**입니다 — 원 접선 문항이 M2_GEOM으로 배정된 것이 먼저입니다. taxonomy 사안이라 **지금 고치지 않고 사실만 기록**합니다.

---

## ④ editItem #unit 조용한 실패 — 드러나게 변경 (적용·검증 완료)
`admin_items.html` `editItem`에 실패 표면화만 추가(로드 순서는 그대로).
- `$('#unit').value` 대입 후 **실제로 반영됐는지 대조** → 실패 시: `console.warn` + 상태문구 경고 + `#editing` 배지 `⚠ 단원 미선택` + 입력 테두리 빨강.
- 경고가 함수 말미의 상태문구 대입에 **덮이지 않도록** 뒤에 이어붙임(초판에서 덮이는 것을 검증으로 발견해 수정).

**[실측] 로컬 서버 + 실제 브라우저 2케이스**
| 케이스 | #unit 값 | console.warn | 상태문구 | 배지 | 테두리 |
|---|---|---|---|---|---|
| 단원 목록 미로드 | `''` | **1건** | 경고 문구 포함 | `⚠ 단원 미선택` | `rgb(185,28,28)` |
| 정상 로드 | `M2_GEOMETRY_PROPERTIES` | 0 | 평소 문구 | 없음 | 없음 |

---

## ⑤ stage별 비용 분해 — [코드확인] + 계산 (실행 없음)
### (a) per_call은 이미 stage별로 분해된다
`summarizeUsage()`가 `per_call: [{call, in, out}]`을 항상 반환하고, 각 호출에 라벨이 붙습니다:
```
analyze_stage1_unit_assign        stage-1 단원 배정
analyze_stage2cat_<unit>          레버A 1단계 범주 배정
analyze_stage2type_<unit>         레버A 2단계 유형 배정 (+ _recover)
analyze_stage2_type_<unit>[_n]    단일단계 폴백 경로(조각 분할 시 _n)
analyze_review                    검토
item_structure                    문항 AI 구조화(진단과 별개)
```
⇒ **다음 진단 응답에서 per_call을 그대로 받으면 stage별 실측이 나옵니다.** 재진단 불요 — 이미 계측 중입니다.

### (b) ★레버 A가 이미 enum을 범주 내로 제한하고 있다
`assignTypesForUnit` two_stage 경로는 문항별 후보를 `catToTypes[category]`로 좁혀 싣습니다(`cand`). **옵션1("enum을 범주 내로 제한")은 이미 구현된 상태**입니다.

### (c) 남아 있는 실제 낭비 = 후보 목록의 문항별 반복
```js
for (const r of rows) { ... menuBlocks.push(`${r.question_no}번 … \n${lines}`) }
```
같은 범주를 받은 문항이 여러 개면 **동일한 후보 목록이 문항 수만큼 반복** 출력됩니다.

**[계산] M2_GEOM(140종·14범주, overlay 27종 태그 포함) · 50문항 · 범주 균등분포 가정**
| | 메뉴 텍스트 |
|---|---|
| 현재(문항별 반복) | **36,362 자** |
| 범주별 1회로 중복제거 | **9,505 자** |
| 절감 | **26,857 자 (74%)** |

**토큰·비용 환산**(입력 $5/Mtok, opus-4-8)
| 가정 | 현재 | 중복제거 | 절감 | 절감액 |
|---|---|---|---|---|
| 1.0 자/토큰 | 36,362 tok | 9,505 tok | 26,857 tok | **$0.134** |
| 1.5 자/토큰 | 24,241 tok | 6,337 tok | 17,904 tok | **$0.090** |

50문항 총액 $2.5356 대비 **최대 6.2%**.

### (d) ★이 계산의 한계 — 분모를 모른다
`stage2type` 입력의 대부분은 **메뉴 텍스트가 아니라 첨부 파일(시험지 PDF/이미지)** 일 가능성이 큽니다. `callClaudeJson`이 **모든 stage 호출에 `files`를 함께 보내기** 때문입니다(stage1·stage2cat·stage2type·review 각각). 4MB 초과분만 Files API(`file_id` 참조)로 가고 그 이하는 인라인입니다(`filesApiThresholdBytes: 4194304`).
⇒ **"유형 enum이 입력 토큰에서 차지하는 비중"은 per_call 실측 없이는 확정 불가**입니다. 위 계산은 **절감의 절대량**만 신뢰할 수 있습니다.

### (e) 판정 재료 요약
- 옵션1(범주 제한)은 **이미 적용됨** → 추가 이득 없음.
- 새 후보 = **메뉴 중복제거**. 절감 $0.09~0.13/진단(≤6.2%), 워커 변경 소규모(menuBlocks를 범주 단위로 묶어 1회 출력 + 문항→범주 매핑만 나열).
- 더 큰 절감 후보는 **파일 재전송 구조**로 보이나, 근거가 없어 제안하지 않습니다. **다음 진단 per_call을 받으면 그때 판정** 가능합니다.

---

## ① D1 기존 오염 조회 — SQL + 사용자 절차
### 조회 설계
`axis_records.attempts`는 JSON 텍스트입니다(스키마 v1). D1(SQLite)의 `json_each`/`json_extract`로 정확히 셉니다 — 8/14의 `LIKE '%CORRECT_COMPLETE%'` 방식은 부정확했습니다.

**오염 정의**: `response_status = 'CORRECT_COMPLETE'` 인데 **풀이도 답도 없음**.
**제외**: `ANSWER_ONLY`(답만 있음)·`BLANK_UNKNOWN`(빈칸)은 정상 상태이므로 애초에 조건에서 빠집니다.
**★거짓양성 차단**: Fix-A 이전 레코드는 `student_work_text` 필드 **자체가 없어** 빈 문자열과 구분해야 합니다. `json_type(...) IS NULL`로 구분합니다.

### Q1 — 요약 (먼저 실행)
```sql
SELECT
  r.id,
  r.student_code,
  substr(r.date, 1, 10)                                   AS date,
  r.exam_label,
  (SELECT COUNT(*) FROM json_each(r.attempts))            AS total_attempts,
  SUM(CASE WHEN json_extract(a.value, '$.response_status') = 'CORRECT_COMPLETE'
            AND json_type(a.value, '$.student_work_text') IS NOT NULL
            AND COALESCE(json_extract(a.value, '$.student_work_text'), '') = ''
            AND COALESCE(json_extract(a.value, '$.student_answer'),   '') = ''
       THEN 1 ELSE 0 END)                                 AS suspect_fixA,
  SUM(CASE WHEN json_extract(a.value, '$.response_status') = 'CORRECT_COMPLETE'
            AND json_type(a.value, '$.student_work_text') IS NULL
       THEN 1 ELSE 0 END)                                 AS correct_preFixA_unknown
FROM axis_records r, json_each(r.attempts) a
GROUP BY r.id
HAVING suspect_fixA > 0 OR correct_preFixA_unknown > 0
ORDER BY r.date DESC;
```
읽는 법
- `suspect_fixA > 0` → **오염 후보**(Fix-A 필드가 있는데 둘 다 빈 값).
- `correct_preFixA_unknown > 0` → Fix-A 이전 레코드라 **판정 불가**(원문이 저장되지 않던 시기). 오염으로 세지 않습니다.
- `suspect_fixA = total_attempts` → **전건 오염**(8/11 사례와 동형).

### Q2 — 상세 1건 열람 (Q1에서 id 하나 골라 넣기)
```sql
SELECT
  json_extract(a.value, '$.question_no')          AS q,
  json_extract(a.value, '$.response_status')      AS status,
  json_extract(a.value, '$.is_correct')           AS is_correct,
  json_extract(a.value, '$.problem_type_id')      AS pt,
  json_extract(a.value, '$.type_name')            AS type_name,
  length(COALESCE(json_extract(a.value, '$.student_work_text'), '')) AS work_len,
  COALESCE(json_extract(a.value, '$.student_answer'), '')            AS answer
FROM axis_records r, json_each(r.attempts) a
WHERE r.id = '여기에_Q1에서_고른_id'
ORDER BY CAST(json_extract(a.value, '$.question_no') AS INTEGER);
```
`work_len = 0` 이고 `answer` 가 비었는데 `status = CORRECT_COMPLETE` 면 **오염 확정**입니다.

### Q3 — ② type_name 확인 겸용 (같은 화면에서 1분)
```sql
SELECT substr(r.date,1,10) AS date, r.exam_label,
       COUNT(*)                                                    AS attempts_with_type,
       SUM(CASE WHEN COALESCE(json_extract(a.value,'$.type_name'),'') = '' THEN 1 ELSE 0 END) AS type_name_empty
FROM axis_records r, json_each(r.attempts) a
WHERE COALESCE(json_extract(a.value,'$.problem_type_id'),'') <> ''
GROUP BY r.id
ORDER BY r.date DESC
LIMIT 20;
```
**2026-08-14 이후 진단**에서 `type_name_empty = 0` 이면 ② 검증 완료입니다(그 이전 레코드는 빈 값이 정상).

### 사용자 실행 절차 (클릭 기준)
1. 브라우저에서 **`dash.cloudflare.com`** 접속 → 로그인
2. 왼쪽 메뉴 **Storage & Databases → D1 SQL Database** 클릭
3. 데이터베이스 **`scstudy-axis`** 클릭
4. 상단 탭 **Console** 클릭
5. 입력창에 **Q1** 붙여넣기 → **Execute**(또는 실행) 클릭
6. 결과 표를 캡처해 전달 → 행이 없으면 **오염 없음**(그대로 종결)
7. 행이 있으면 `id` 값 하나를 복사해 **Q2**의 `여기에_Q1에서_고른_id` 자리에 붙여넣고 다시 Execute
8. 이어서 **Q3** 실행 → ② 검증까지 한 번에 마무리

★ Q1~Q3 모두 **SELECT 전용**이라 데이터를 바꾸지 않습니다. 안심하고 실행하셔도 됩니다.

### 오염이 확인되면
처리 방안(삭제 vs 표기)은 **검수 판정 대상**입니다. 판정 재료로 Q1의 `suspect_fixA`/`total_attempts` 비율과 Q2 상세 1건을 함께 올리겠습니다.

---

## 다음
- **⑥ 설계(관측→태그 개선 절차)** — 다음 턴 단독. 트리거·입력·판정·반영·호환 5절 + 관측 태그 자유생성 트레이드오프 판단 포함.
- 수연산 처방 414는 §3 교체 규격 승인 오면 첫 배치 10종 착수.
