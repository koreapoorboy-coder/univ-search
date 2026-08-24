# 진단 데이터 모델 분리 설계 v1

작성: Codex · 2026-08-24  
상태: **설계 승인 · 구현 전**  
근거 판정: **검수 판정 65차 · 66차 · 73차 · 74차**

> 이 문서는 승인된 설계만 통합한 기록이다. 구현 명세가 아니며, 카탈로그·D1·엔진·워커·클라이언트의 변경을 승인하지 않는다. `item_axes`의 구체 스키마와 Shadow 구현은 축 2차 독립 판정 이후 확정한다.

---

## 0. 설계가 필요해진 이유

기존 `problem_type_id` 하나에는 서로 다른 사실이 함께 묶여 있다.

```text
수학 개념
문항의 구조·표현
구 pos(문항 변형)
예상 오류
학생 지시·처방
```

이 구조에서는 문항을 보고 학생의 실패 단계까지 맞혀야 한다. 실제 조사에서 다음이 확인됐다.

- 3칸은 엔진 전체의 절대 규칙이 아니다. `M2_GEOMETRY_PROPERTIES`는 46개 개념 묶음 중 44개가 3종, 2개가 4종이며 3칸식 접미사 비율은 67.1%다.
- 원의 성질의 기존 47종과 복원 46종은 호환 카탈로그로 유효하지만, 그 pos는 학생의 실제 실패 단계 정답이 아니다.
- 도형의 성질 140종 지시 팩은 화면 출력 경로는 완성됐지만 전부 `draft:true`다. 그중 27종의 근거도 학생 풀이 실측이 아니라 학습지 문제·정답·해설에서 만든 예상 오류 태그다.
- `axis_records` 실측에서 같은 문항 축 아래 학생 실패가 구성 실패, 각 대응 실패, 계산 실패로 갈렸다. 실패 단계는 문항 축과 다른 층이다.
- 같은 학생 풀이 원문을 반복 분석해도 `observed_error_tags`가 달라졌다. AI 태그는 정답으로 사용할 수 없다.

따라서 문항에서 알 수 있는 사실과 학생 풀이에서만 알 수 있는 사실을 분리한다.

---

## 1. 전체 계층과 호환 원칙 — 판정 65차

### 1.1 분리할 여섯 층

```text
1. concept_ids             수학 개념
2. item_axes               문항에서 도출한 분석 축
3. observed_error_tags     학생 풀이에서 관측한 오류 태그
4. failed_steps            학생이 실제로 실패한 풀이 단계
5. remediation             실패 단계에 붙는 처방
6. legacy compatibility    기존 problem_type_id와의 연결
```

분리 이유:

- `concept_ids`와 `item_axes`는 문항에서 도출한다.
- `observed_error_tags`와 `failed_steps`는 학생 풀이에서 도출한다.
- 처방은 문항의 모양이 아니라 확인된 실패 단계에 붙인다.
- 기존 `problem_type_id`는 이미 등록 문항과 지시 팩에서 사용 중이므로 폐기하지 않는다.

### 1.2 기존 경로 보존

기존 경로는 그대로 유지한다.

```text
problem_type_id
  -> problemTypeById
  -> problem_type_instruction_map
  -> 기존 student_command
```

새 경로는 옆에 추가한다.

```text
문항              -> concept_ids + item_axes
학생 풀이          -> observed_error_tags + failed_steps
실패 단계·오류     -> remediation
근거 부족          -> 기존 problem_type 지시 팩 또는 진단 보류
```

`problem_type_id`는 새 모델에서도 다음 용도로 보존한다.

- 기존 카탈로그 조회
- 기존 지시 팩 조회
- 이미 등록된 문항과의 호환
- 과거 결과 추적

구 pos는 `legacy_variant_hint`로만 보존하며 `diagnostic_authority:false`로 둔다. 학생 실패 단계의 정답으로 사용하지 않는다.

### 1.3 엔진의 논리적 해석기

승인된 분리는 다음 네 역할이다.

```text
Legacy resolver
  problem_type_id -> 기존 PT·concept_ids·기존 instruction

Item analyzer
  문항 -> concept_ids·item_axes

Attempt analyzer
  학생 풀이 -> response_status·observed_error_tags·failed_steps·evidence

Remediation resolver
  failed_steps·error_tags·concept_ids·item_axes -> 처방
```

처방 선택 우선순위:

```text
1. failed_step_id 정확 일치
2. 관측 오류 태그 일치
3. 기존 problem_type 지시 팩
4. 단원 공통 GENERIC 처방
5. 처방 없음 + 교사 확인 요청
```

단, 1·2는 판정 66차의 학생 풀이 evidence 계약을 통과해야 한다.

### 1.4 단계적 이행

```text
legacy     기존 경로만 사용
shadow     새 분석을 기록하지만 학생에게 출력하지 않음
hybrid     근거가 충분한 시도만 새 처방, 나머지는 기존 경로
separated  개념·문항 축·실패 단계·처방을 분리 사용하고 PT는 호환키로 유지
```

단원별 이행 원칙:

- 원의 성질: 유형 지정 없이 Shadow 관측을 먼저 만드는 시험 단원
- 도형의 성질: 기존 출력은 유지하고 Shadow와 비교
- 닮음: 기존 1,650문항과 완료 트랙을 보존하며 마지막에 검토

이행을 한 번에 수행하지 않는 이유는 작동 중인 단원을 멈추지 않고, 단원별 증거를 확보하기 위해서다.

---

## 2. D1 최소 변경과 `user_item_id` 연결 — 판정 65·66차

### 2.1 1단계 D1 원칙

초기 Shadow 단계에는 D1 컬럼 추가가 필요 없다. `axis_records.attempts`는 JSON TEXT이므로 새 필드를 가산할 수 있다.

```text
기존 레코드: schema_version=1, 새 필드 없음, 그대로 판독
신규 레코드: schema_version 상향, 새 필드는 선택적으로 존재
```

`user_item_analysis` 테이블과 `failed_steps` 전용 테이블은 1단계에 만들지 않는다. `item_axes`는 축 확정 뒤 정적 파일로 먼저 검증한다.

### 2.2 `user_item_id`는 AI가 고르지 않는다

진단 요청에 결정적 대응표를 함께 싣는다.

```json
{
  "registered_item_refs": [
    {
      "question_no": "1",
      "user_item_id": "uuid-...",
      "content_hash": "sha256-..."
    }
  ]
}
```

워커가 AI 분석 후 `question_no`로 결합하고 `content_hash`로 내용을 검증한다. AI 출력에 ID 선택을 맡기지 않는다.

연결 상태는 네 값이다.

```text
verified   ID와 내용 검증 통과
ambiguous  후보가 둘 이상
unlinked   등록 문항 대응표 없음
invalid    ID·내용·단원 검증 불일치
```

- `ambiguous`·`invalid`에는 ID를 붙이지 않는다.
- 임의 PDF는 `unlinked`로 둔다.
- 본문 유사도 매칭으로 ID를 확정하지 않는다.
- 기존 레코드에 `user_item_id`를 소급 생성하지 않는다.

이 규칙의 이유는 선언과 실제 내용이 어긋난 과거 사고를 반복하지 않고, AI 판단을 문항 식별의 정답으로 쓰지 않기 위해서다.

---

## 3. 학생 풀이 evidence 계약 — 판정 66차

### 3.1 Shadow 정답 기준

Shadow의 정답은 사람이 읽어 확인한 `student_work_text`뿐이다.

다음은 정답 evidence가 될 수 없다.

```text
AI가 고른 problem_type_id
AI가 고른 observed_error_tags
문제 본문
정답
해설
학습지·해설 기반 예상 오류 태그
```

도형의 성질 27종의 기존 `observed_basis:true`는 학생 풀이 실측을 뜻하지 않는다. 새 모델에서는 이 명칭을 재사용하지 않고 다음처럼 구분한다.

```text
worksheet_solution_basis: true
student_work_observed: false
```

### 3.2 `failed_steps[].evidence` 필수 계약

```json
{
  "failed_step_id": "FS_CONSTRUCT_AUXILIARY",
  "certainty": "확실",
  "evidence": {
    "quote": "40+36+x=90",
    "source": "student_work_text",
    "interpretation": "필요한 구성 없이 각 계산을 시작함"
  }
}
```

기계 검증 규칙:

```text
quote가 비어 있음                         -> 무효
source가 student_work_text가 아님          -> 무효
quote가 student_work_text에 실제로 없음    -> 무효
certainty=애매인데 ambiguity_reason 없음   -> 무효
```

검증 실패 시 attempt를 버리지 않는다.

```json
{
  "analysis_state": "unresolved",
  "failed_steps": [],
  "evidence_validation": {
    "passed": false,
    "reason": "quote_not_found"
  }
}
```

### 3.3 확신도

정의 없는 소수 confidence는 사용하지 않는다.

```text
확실
애매
```

`애매`에는 이유를 반드시 남긴다. 이산 등급을 쓰는 이유는 모델이 스스로 매긴 0.93·0.94 같은 숫자가 무엇을 측정하는지 정의돼 있지 않기 때문이다.

---

## 4. UNKNOWN 보존 — 판정 66차

`UNKNOWN`은 오답도 빈칸도 삭제 대상도 아니다. 분석하지 못한 신호다.

```text
UNKNOWN      -> 저장, 진단 통계 제외
BLANK_UNKNOWN -> 기존처럼 저장, 학생의 빈칸 상태
attempts 0 + axes 0 -> all_unknown과 구분, 초기에는 기존 skip 유지 가능
```

승인된 상태:

```json
{
  "analysis_state": "unresolved",
  "profile_eligible": false,
  "unresolved_reason": {
    "code": "work_not_visible",
    "evidence": "풀이 영역이 판독되지 않음",
    "certainty": "확실"
  }
}
```

집계 원칙:

```text
axis_records 저장          포함
unresolved 건수            별도 포함
정답률·오답률              제외
관측축 통계                제외
처방 생성                  제외
재검토 대기열              포함
```

현재 UNKNOWN은 클라이언트와 서버 양쪽에서 차단되므로 구현 시 두 경로를 함께 다뤄야 한다. 한쪽만 바꾸면 저장되지 않는다.

---

## 5. 유형 없는 Shadow 경로 — 판정 73차

### 5.1 목적

원의 성질은 유형이 미지정이어서 학생 진단에 나가지 않고, 학생 풀이가 없어서 축을 실측할 수 없는 순환에 있다.

```text
축 검증에 학생 풀이 필요
-> 학생에게 문항이 나가야 함
-> 기존 경로는 problem_type_id 필요
-> 축·유형이 없으므로 학생 풀이가 쌓이지 않음
```

유형 없는 Shadow는 이 순환을 끊는 별도의 비출력 관측 경로다. Legacy의 폴백이 아니다.

원의 성질은 기존 problem type 지시 팩이 `0/93`이고 `no_template_units`에 등재돼 있어 §1.3 처방 우선순위 3번이 빈 상태로 Shadow를 시작한다. 이는 설계 결함이 아니라 기존 처방과 섞이지 않은 새 경로만 관측할 수 있어 시험 단원으로 적합한 조건이다. (검수 판정 75차)

### 5.2 진입 조건

```text
problem_type_id 있음
  -> 기존 legacy 진단

problem_type_id 없음
+ concept_ids 있음
+ item_axes 있음
  -> shadow 진단

둘 다 없음
  -> unresolved
```

Shadow에서는:

- `attempt.concept_ids`로 개념 점수를 계산한다.
- `item_axes`는 문항 구조만 설명한다.
- `failed_steps`는 학생 풀이 evidence로만 확정한다.
- `item_axes`만으로 처방을 확정하지 않는다.
- 실패 단계가 없으면 특정 진단 처방을 만들지 않는다.

출력 명칭도 분리한다.

```text
diagnostic remediation     학생 실패 단계가 확인된 처방
concept review suggestion  실패 단계 미확인 상태의 개념 복습 안내
```

### 5.3 태그 재현성의 위치

동일 학생 풀이에서 AI 태그가 달라지는 사례가 실측됐다. 따라서 AI 태그를 정답으로 쓰지 않는다.

측정 가능한 것은 정확도가 아니라 반복 일치성이다.

```text
명칭: observed_tag_repeatability / QF-재현성
비교: 동일 student_work_text에 붙은 정렬된 태그 집합
금지: 의미 정규화로 서로 다른 문장을 자동 병합
주의: raw_string_variants는 답안 수가 아니라 문자열 변형 수
```

---

## 6. `student_work_observation` 3상태 — 판정 74차

### 6.1 분리 이유

기존 저장기는 필드 생략·`null`·빈 문자열을 빈 문자열 하나로 합친다. 그러면 다음 사실이 구분되지 않는다.

```text
모델이 필드를 내지 않음
모델이 빈 문자열을 명시함
학생이 실제로 아무것도 쓰지 않음
필기는 있으나 시스템이 읽지 못함
```

새 모델은 풀이 텍스트와 풀이 관측 상태를 분리한다.

```text
observed    학생 풀이가 보이고 원문을 옮김
absent      학생이 풀이를 쓰지 않은 것이 실제로 확인됨
unresolved  풀이 유무 또는 내용을 판정하지 못함
```

### 6.2 상태 결정표

| `student_work_text` | `work_absent` | 결과 |
|---|---:|---|
| 비어 있지 않은 문자열 | false/없음 | `observed` |
| 필드 없음 | 없음 | `unresolved: work_field_omitted` |
| `""` | 없음 | `unresolved: work_explicit_empty` |
| 없음 | true | `absent` |
| `""` | true | `absent`, 단 관측 근거 필수 |
| 비어 있지 않은 문자열 | true | `unresolved: conflicting_work_state` |
| 없음/빈 문자열 | false | `unresolved: declared_present_but_text_missing` |

추가 규칙:

- `work_absent:true`는 빈 문자열에서 추론하지 않는다.
- `work_absent:true`에는 제출물에서 필기가 없음을 확인한 설명이 필수다.
- 필기가 있으나 판독할 수 없으면 `unresolved:work_unreadable`이다.
- 모순을 임의로 해소하지 않고 `unresolved`로 보존한다.
- `work_absent`는 특정 실패 단계의 증거가 아니다.

### 6.3 직렬화 계약

속성 존재 여부를 `hasOwnProperty` 기준으로 보존한다.

```text
입력에 student_work_text 속성이 있을 때만 출력에도 생성
속성이 없으면 생성하지 않음
빈 문자열이면 빈 문자열 그대로 보존
null은 null로 보존하거나 별도 스키마 오류로 구분
```

### 6.4 `failed_steps` 허용 조건

```text
student_work_observation.state = observed
+ student_work_text가 비어 있지 않음
+ evidence.quote가 원문에 실제 포함됨
  -> 실패 단계 판정 가능
```

다음 상태에서는 실패 단계를 확정하지 않는다.

```text
absent
unresolved
필드 없음
명시적 빈 문자열
필기 판독 불가
상태 모순
```

기존 레코드에는 상태를 소급 생성하지 않는다. 과거의 필드 없음이나 빈 문자열을 관측 사실로 바꾸지 않는다.

---

## 7. 구현 전 고정 게이트

다음 순서를 바꾸지 않는다.

```text
1. 축 2차 독립 판정 완료
2. item_axes 스키마 확정
3. Shadow 구현
```

구현 전 확인할 불변 조건:

- 기존 `problem_type_id` 경로를 깨지 않는다.
- pos를 새 모델의 실패 단계로 이관하지 않는다.
- AI 태그·문제·정답·해설을 학생 실패의 정답으로 쓰지 않는다.
- 학생 풀이 직접 인용과 기계 검사를 통과한 경우에만 `failed_steps`를 확정한다.
- UNKNOWN과 판독 불가 기록을 버리지 않는다.
- 기존 레코드에 새 관측값을 소급 생성하지 않는다.
- 축 확정 전 `item_axes`를 닫힌 스키마로 구현하지 않는다.

---

## 8. 판정 이력

| 판정 | 승인 내용 | 핵심 이유 |
|---|---|---|
| 65차 | 계층 분리, Legacy 보존, 단계적 이행 | 개념과 diagnostic variant가 한 ID에 묶여 pos 추론이 실패함 |
| 66차 | `user_item_id`, UNKNOWN 보존, evidence 계약, 명칭 정정 | AI 판단의 순환과 예측을 관측으로 오독하는 사고 차단 |
| 73차 | 유형 없는 Shadow, 태그 반복 일치성, 생략/빈 문자열 결함 지적 | 원의 성질의 데이터 미축적 순환을 끊고 AI 태그를 정답에서 제외 |
| 74차 | `student_work_observation` 3상태와 직렬화 계약 | 학생의 무응답과 시스템의 판독 실패를 서로 다른 사실로 보존 |

이 문서 이후 새 설계를 추가하지 않는다. 축 2차 판정 결과가 나온 뒤 `item_axes` 스키마를 별도로 확정한다.
