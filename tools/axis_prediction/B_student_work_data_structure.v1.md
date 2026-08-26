# Code탭 회신 — 학생 풀이 데이터 구조·규모 조사 (판정 61차 요청 1~4)

2026-08-24 · 코드·스키마 읽기만. 집계·분석 미실행. D1 쓰기 없음.

---

## 0. 요약

```
요청 1  테이블 = ★axis_records (D1). 스키마 파일 data/db/axis_records.schema.v1.sql
        ★한 행 = 문항 1개가 아니라 ★진단 세션 1건.  문항별 데이터는 attempts JSON 안에 있다
        Fix-A 로 ★student_work_text · student_answer · tag_rationale 이 들어 있다

요청 2  ★규모는 리포에서 알 수 없습니다. D1 조회가 필요합니다 (§2에 SQL)
        ★리포에 축적본 export 가 ★없습니다. 로컬 파일로 세어볼 방법이 없습니다
        정황: 아직 이중쓰기 시험 단계이고 전환 4기준이 "레코드 20건·진단 10회·14일"입니다

요청 3  ★계산할 수 있습니다. ★단 두 가지 조건과 한 가지 함정이 있습니다
        attempts[].problem_type_id 가 ★pos 를 포함한 전체 PT id 로 저장됩니다
        같은 행에 response_status · observed_error_tags 가 함께 있습니다
        ★함정: 그 problem_type_id 는 ★AI 가 고른 값입니다 — §3-3. 순환 위험

요청 4  키 = ★attempts[].problem_type_id (유형) · attempts[].question_no + question_text (문항)
        ★user_items.id 로 잇는 경로는 ★없습니다. 문항 id 가 저장되지 않습니다
```

---

## 1. 요청 1 — 학생 풀이가 있는 테이블과 스키마

### 1-1. 테이블

```
D1 테이블   axis_records          (user_items 와 같은 D1 인스턴스 AXIS_DB)
스키마      public/math-weakness-engine/data/db/axis_records.schema.v1.sql
엔드포인트  POST /api/axis-store/record    저장 (X-Write-Key)
            GET|POST /api/axis-store/profile  조회
```

### 1-2. 스키마 전문과 컬럼 의미

```sql
CREATE TABLE IF NOT EXISTS axis_records (
  id               TEXT PRIMARY KEY,   -- 레코드 uuid (멱등 upsert)
  student_code     TEXT NOT NULL,
  date             TEXT NOT NULL,      -- 클라이언트 ISO 시각
  exam_label       TEXT,
  scope_units      TEXT,               -- JSON 배열
  observed_axes    TEXT,               -- JSON
  attempts         TEXT,               -- JSON  ★문항별 데이터가 여기 전부 들어간다
  axis_map_version TEXT,
  schema_version   INTEGER,
  created_at       TEXT                -- 서버 수신 시각
);
CREATE INDEX idx_student ON axis_records(student_code);
CREATE INDEX idx_date    ON axis_records(date);
CREATE INDEX idx_amv     ON axis_records(axis_map_version);
```

| 컬럼 | 의미 | 비고 |
|---|---|---|
| `id` | 레코드 uuid | 멱등 upsert 키 |
| `student_code` | 학생 식별 | ★학생 수는 이 컬럼의 distinct |
| `date` | 진단 시각 (클라이언트 ISO) | |
| `exam_label` | 시험 라벨 | |
| `scope_units` | JSON 배열 | ★단원별 집계의 1차 근거 |
| `observed_axes` | JSON | 관측축 산출물 |
| `attempts` | **JSON 배열** | ★문항별 원본. 축 재계산 소스 |
| `axis_map_version` | 축맵 버전 | 버전별 질의용 별도 컬럼 |
| `schema_version` | INTEGER | |
| `created_at` | 서버 수신 시각 | insert 시에만 설정 |

★**정규화되어 있지 않습니다.** 문항 1개 = 1행이 아니고, `attempts` JSON 안의 원소 1개입니다.
문항 단위 집계는 **JSON 을 풀어야** 합니다(SQLite `json_each` 또는 클라이언트에서).

### 1-3. ★`attempts` 원소 한 개에 담기는 것 (워커 :898~921 스키마)

| 필드 | 타입 | 필수 | 내용 |
|---|---|:-:|---|
| `question_no` | string | ✔ | 문항 번호 |
| `problem_type_id` | string | ✔ | ★카탈로그 PT id (enum 제약). **pos 포함** |
| `response_status` | enum | ✔ | 아래 5값 |
| `difficulty` | enum | ✔ | `basic\|core\|advanced\|high` ★문항층 4값 |
| `observed_error_tags` | string[] | ✔ | 관측 오류 태그 |
| `question_text` | string | ✔ | 문제 본문 (학생 풀이 제외) |
| `student_work_text` | string | – | ★**Fix-A. 학생이 쓴 풀이 원문** |
| `student_answer` | string | – | ★Fix-A. 학생 답 |
| `tag_rationale` | string | – | ★Fix-A. 태그 선정 근거 한 문장 |
| `confidence` | number | – | 조각 여러 개일 때 선택 기준 |

`response_status` 5값 (워커 `:860`)
```
CORRECT_COMPLETE   풀이 끝까지 있고 답 맞음
WRONG_COMPLETE     풀이 끝까지 있으나 답 틀림
PARTIAL_STOP       중간에 멈춤
ANSWER_ONLY        답만 씀
BLANK_UNKNOWN      빈칸
```

★**Fix-A 3필드는 `WRONG`/`PARTIAL` 에서만 채워집니다**(워커 주석 `:914`).
정답·빈칸 문항은 강제 생성하지 않습니다 — "오답에서만 비용을 쓴다".

### 1-4. ★검수 요청 목록과의 대조

| 검수가 물은 것 | 저장되는가 |
|---|---|
| 문항 id | ★**아니오.** `user_items.id` 가 저장되지 않습니다 (§4) |
| 정답 여부 | ✔ `response_status` (5단계. 이진값이 아님) |
| 선택지 | ★**아니오.** 학생이 고른 선택지 번호를 담는 필드가 없습니다. `student_answer` 에 문자열로 들어갈 수는 있습니다 |
| 풀이 과정 | ✔ ★`student_work_text` (오답·부분에서만) |
| 소요 시간 | ★**아니오.** 문항별 시간 필드가 없습니다. 레코드 단위 `date` 하나뿐입니다 |

---

## 2. 요청 2 — 현재 데이터 규모

### ★리포에서는 알 수 없습니다. 정직하게 보고합니다.

```
리포에 axis_records 축적본 export 가 ★없습니다
  find 결과: 스키마 .sql 파일 1개뿐. 데이터 파일 0개
  Downloads · 바탕화면에도 학생 레코드 export 없음
⇒ 전체 행수 · 단원별 행수 · 학생 수를 ★셀 방법이 없습니다
```

### 2-1. 리포에 기록된 정황 (수치가 아니라 단계)

`B_wiring_d1_deploy_guide.v1.md §9` — localStorage→D1 이중쓰기 병행 중이고
서버 모드 전환 4기준이 아래입니다.
```
1. 레코드 ≥20건 로컬↔서버 일치
2. 최근 ≥10회 진단 미동기 0
3. profile 서버조회 ≥3명 정상
4. ≥14일 그리고 진단 ≥10회 (둘 다)
```
★**전환 기준이 "20건·10회·3명" 수준이라는 것은 축적이 아직 그 규모라는 뜻입니다.**
★다만 이것은 문서의 기준값이고 **현재 실적이 아닙니다.** 추정하지 않겠습니다.

### 2-2. ★저장 가드 — 규모를 셀 때 반드시 알아야 합니다

워커 `:224~233` 이 **일부 레코드를 저장하지 않고 버립니다.**
```
skip 조건 ①  attempts 가 전부 response_status='UNKNOWN'   (진단가드 주입값)
skip 조건 ②  attempts 와 observed_axes 가 둘 다 비어 진단 가치 0
⇒ ok:true + skipped 로 응답하므로 ★클라이언트는 성공으로 처리하고 재시도하지 않습니다
★따라서 "진단 실행 횟수" 와 "axis_records 행수" 가 다릅니다
  BLANK_UNKNOWN(전부 빈칸 제출)은 ★저장됩니다 — UNKNOWN 과 다른 값입니다
```

### 2-3. 확인용 SQL (사용자가 D1 Console 에서 실행 · Code탭 실행 아님)

★센티널을 먼저 두어 0행이 "없다"와 "쿼리가 안 돌았다"로 갈리지 않게 했습니다.

```sql
SELECT
  (SELECT COUNT(*) FROM axis_records)                        AS records_total,
  (SELECT COUNT(DISTINCT student_code) FROM axis_records)    AS students,
  (SELECT MIN(date) FROM axis_records)                       AS first_date,
  (SELECT MAX(date) FROM axis_records)                       AS last_date,
  (SELECT COUNT(*) FROM user_items)                          AS user_items_total;
```
```
읽는 법
  user_items_total 이 6,169 이상이어야 쿼리가 돈 것입니다 (판정 58차 실측값)
  ★records_total 이 0 이면 축적이 없다는 뜻이고, 그때 요청 3 은 "데이터 없음"이 답입니다
  ★테이블이 아직 생성되지 않았으면 "no such table: axis_records" 가 납니다 — 그것도 답입니다
```

단원별·문항별로 풀어 보려면 (행수가 0 이 아닐 때만):
```sql
SELECT json_extract(att.value, '$.problem_type_id') AS pt_id,
       json_extract(att.value, '$.response_status')  AS status,
       COUNT(*) AS n
FROM axis_records AS rec, json_each(rec.attempts) AS att
GROUP BY pt_id, status
ORDER BY pt_id, status;
```
★`json_each` 는 SQLite 내장이라 D1 에서 씁니다. ★Code탭은 실행하지 않았습니다.

---

## 3. 요청 3 — 칸이 학생을 갈라놓는지 계산할 수 있는가

### ★결론: 계산할 수 있는 데이터 구조입니다. 단 조건 2개와 함정 1개.

### 3-1. 구조적으로는 가능합니다

```
attempts[].problem_type_id   ★pos 를 포함한 전체 PT id (M2_GEOM_PT001 형태)
attempts[].response_status   정답/오답/부분/답만/빈칸 5단계
attempts[].observed_error_tags  오류 태그 배열
attempts[].student_work_text ★풀이 원문 (오답·부분에서만)
```
★**같은 base 의 세 칸을 PT id 로 갈라 정답률·오답 태그를 비교하는 데 필요한 필드가
한 행 안에 다 있습니다.** 별도 조인이 필요하지 않습니다.

### 3-2. 조건 2개

```
조건 1  ★axis_records 에 행이 있어야 합니다 (§2 미확인)
조건 2  ★그 단원의 진단이 실제로 돌아갔어야 합니다
        M2_GEOMETRY_PROPERTIES  지시 팩 140/140 · no_template_units ★미등재
                                -> ★가장 가능성이 높은 단원입니다 (검수 추정과 같음)
        M3_CIRCLE_PROPERTIES    지시 팩 0/93 · no_template_units ★등재
                                -> 처방이 억제되는 단원이라 진단 자체가 돌았을 가능성이 낮습니다
        ★어느 쪽도 Code탭이 확인할 수 없습니다. §2 SQL 이 답합니다
```

### 3-3. ★함정 — 그 `problem_type_id` 는 AI 가 고른 값입니다

```
워커 :907   problem_type_id: { type: 'string', enum: [...typeIds, NO_MATCH] }
⇒ 진단 시 AI 가 카탈로그 목록에서 ★칸까지 골라 넣습니다
⇒ 즉 "같은 base 다른 칸" 의 칸은 ★사람이 확정한 값이 아니라 AI 의 선택입니다
```
★**그래서 "칸마다 정답률이 다르다"가 나와도 그것이 순환일 수 있습니다.**
AI 가 문항을 보고 칸을 골랐고, 그 문항이 어려우면 오답률이 높은 것이라
"칸이 학생을 갈라놓는다"가 아니라 "AI 가 어려운 문항을 pos2 에 넣는다"일 수 있습니다.

★**Code탭은 이 함정의 해소 방법을 제안하지 않습니다.** 판정 61차가
"문항 본문만 보면 검수의 판단이 근거가 되고 그것은 다섯 번째 가설과 형태가 같아진다"고
한 것과 같은 구조여서, 설계 판단은 검수 몫입니다.
★다만 **조사 결과를 해석할 때 반드시 통제해야 할 항목**으로 보고합니다.

★참고로 통제에 쓸 수 있는 재료는 있습니다 — `student_work_text`(풀이 원문)과
`observed_error_tags` 는 **AI 의 칸 선택과 독립적으로 학생이 무엇을 못 했는지**를 담습니다.
칸 자체가 아니라 **태그 분포로 축을 찾는 것**이 판정 61차가 말한 "데이터로 축을 찾기"에
더 가까워 보이지만, ★그 판단도 검수 몫입니다.

---

## 4. 요청 4 — 학생 풀이와 문항을 잇는 키

### 4-1. 유형으로는 이어집니다

```
attempts[].problem_type_id   <->   카탈로그 problem_type_id
                             <->   user_items.problem_type_id
★둘 다 같은 카탈로그 id 공간이라 직접 이어집니다
```

### 4-2. ★문항 개체로는 이어지지 않습니다

```
attempts 에 저장되는 것   question_no · question_text
attempts 에 ★없는 것      user_items.id (문항 uuid) · bulk_batch_id
```
★**문항 id 가 저장되지 않습니다.** 그래서 "이 학생이 푼 것이 D1 의 어느 행인가"를
확정적으로 이을 수 없습니다.

★워커에 문항 본문으로 맞추는 경로는 있습니다:
```
:912 주석  "매칭용: 이 문항의 문제 본문(학생 풀이 제외).
            등록 문항(user_items)과 대조해 정답/해설을 붙인다"
⇒ ★question_text 대조가 설계된 연결 방식입니다. id 조인이 아니라 ★본문 매칭입니다
⇒ 정확도는 정규화 규칙에 달려 있습니다 (qnorm.v1 · dedup_key 계열)
```

### 4-3. 풀이 쪽에 유형 정보가 따로 저장되는가

```
✔ 저장됩니다.  attempts[].problem_type_id (pos 포함)
✔ attempts[].difficulty 도 따로 저장됩니다 — ★카탈로그의 default_difficulty 와 별개 값입니다
  (문항층 4값: basic|core|advanced|high. 유형층은 basic|concept|advanced)
★즉 풀이 레코드는 카탈로그를 다시 읽지 않아도 유형·난도를 갖고 있습니다
```

---

## 5. 준수 확인

```
✔ 집계·분석 미실행     구조와 필드 목록만 보고했습니다. 어떤 수치도 계산하지 않았습니다
✔ 칸 배정 안 함
✔ 카탈로그 무수정
✔ D1 쓰기 없음         스키마·워커·엔진 코드만 읽었습니다
✔ 처방 생성 안 함
✔ 없는 것은 "없음"     문항 id · 선택지 · 소요 시간 · 축적본 export · 현재 규모
```

## 6. 대기 — 필요한 것 한 가지

```
★§2-3 센티널 SQL 결과가 있어야 요청 2·3 이 사실로 확정됩니다
  records_total 이 0 이거나 테이블이 없으면 요청 3 은 "데이터 없음"이 답입니다
  0 이 아니면 두 번째 쿼리(json_each)로 단원·PT별 분포가 나옵니다
★Code탭은 실행하지 않습니다. 사용자가 D1 Console 에서 돌려 주십시오
```

## 7. 산출

```
tools/axis_prediction/B_student_work_data_structure.v1.md   이 문서
★새 데이터 파일을 만들지 않았습니다
```
