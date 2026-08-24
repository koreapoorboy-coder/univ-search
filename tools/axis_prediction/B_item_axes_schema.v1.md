# `item_axes` 스키마 설계 v1

작성: Codex · 2026-08-24
상태: **설계안 · 구현 전**
근거: 검수 판정 65·66·74·81차, `B_axis_definition_v4_20260824 (1).md`

> 이 문서는 정적 파일 단계의 데이터 계약만 제안한다. 카탈로그·D1·엔진·워커·클라이언트를 변경하지 않으며, `failed_step`을 문항 축에 포함하지 않는다.

---

## 0. 결론

1단계 저장소는 승인된 대로 정적 파일 `item_analysis_registry.json`을 사용한다. 레코드의 기본키는 `user_item_id`이고 `content_hash`는 동일성을 검증하는 보조값이다. 축 결과는 열(column)이나 닫힌 코드로 만들지 않고, 이름공간이 있는 `axes` 객체에 축을 키로 추가한다.

```text
item_analysis_registry.json
  records[user_item_id]
    content_hash
    analysis_version
    analyst
    axes[축 이름공간.축 ID]
```

이 구조에서는 새 축과 새 축값이 생겨도 기존 레코드 및 파일 스키마를 바꿀 필요가 없다.

---

## 1. 최상위 구조

```json
{
  "schema_version": "item-analysis-registry.v1",
  "generated_at": "2026-08-24T00:00:00+09:00",
  "records": {
    "USER_ITEM_ID": {
      "user_item_id": "USER_ITEM_ID",
      "unit_id": "M3_CIRCLE_PROPERTIES",
      "content_hash": {
        "algorithm": "sha256",
        "value": "...",
        "basis": "normalized_item_content.v1"
      },
      "analysis_version": "axis-def.v4",
      "analyst": {
        "type": "human|model",
        "id": "판정자를 식별하는 문자열",
        "run_id": "선택적 실행 식별자"
      },
      "axes": {}
    }
  }
}
```

`analyst.type`의 표기는 예시이며 축값 enum이 아니다. 실제 판정자 식별 정책이 확정되기 전에는 `id`에 이름을 자유 문자열로 기록한다.

### 1.1 기본키 판단

- **기본키: `user_item_id`** — 문항의 배치·등록 레코드를 안정적으로 가리키며, 이후 attempt의 `user_item_id`와 직접 결합할 수 있다.
- **검증값: `content_hash`** — ID가 같아도 문항 내용이 바뀐 사고를 검출한다. 해시는 레코드 식별자가 아니므로 내용 교정 때 새 문항처럼 분기시키지 않는다.
- `content_hash.basis`를 반드시 기록한다. 정규화 규칙이 없으면 같은 내용도 해시가 달라질 수 있기 때문이다.
- 임의 PDF나 `user_item_id`가 검증되지 않은 문항은 이 레지스트리에 확정 레코드로 넣지 않는다.

`user_item_id`를 기본키로 쓰는 이유는 판정 66차의 “AI가 ID를 고르지 않고 워커가 대응표로 결합한다”는 원칙과 맞기 때문이다. `content_hash`만 기본키로 쓰면 교정·OCR·공백 정규화에 따라 동일 문항의 키가 달라진다.

---

## 2. 축 이름공간과 공통 표현

### 2.1 축 키

```text
common.AX03_kind
common.AX04_direction
unit.M3_CIRCLE_PROPERTIES.AXC02_count
unit.M3_CIRCLE_PROPERTIES.AXC03_arc_mode
```

- `common.*`: 단원이 바뀌어도 유지되는 공통 축
- `unit.<unit_id>.*`: 해당 단원에만 속하는 축

삼각비나 통계 전용 축은 각각 `unit.<새 unit_id>.<axis_id>`로 추가한다. 다른 단원의 축 집합이 달라도 최상위 스키마는 변하지 않는다. 같은 `AXC01` 이름을 단원마다 재사용해도 이름공간 때문에 충돌하지 않는다.

### 2.2 축 결과의 네 상태

축 키가 **없으면 미판정**이다. 키가 있으면 다음 셋 중 하나를 명시한다.

```json
{ "state": "assessed", "value": "각", "certainty": "확실", "evidence": [] }
{ "state": "not_applicable", "reason": "호가 문제에 등장하지 않음" }
{ "state": "unjudgeable", "reason": "그림의 점 표시가 누락되어 판정 불가", "evidence": [] }
```

| 의미 | 표현 |
|---|---|
| 미판정 | `axes`에 해당 키가 없음 |
| 해당없음 | `state: "not_applicable"` |
| 판정불가 | `state: "unjudgeable"` + `reason` 필수 |
| 판정됨 | `state: "assessed"` + `value` + `certainty` |

`assessed`의 `certainty`는 `확실` 또는 `애매`이며, `애매`면 `reason`이 필수다. `unjudgeable`은 값 자체를 확정하지 못한 상태이므로 `value`를 쓰지 않는다.

이것은 판정 74차의 `student_work_observation`과 **같은 상태 분리 원리**를 쓴다. 다만 두 모델의 대상은 다르다. 여기서는 문항 축의 적용·판정 상태를 표현하고, 학생 필기 유무나 실패 단계는 표현하지 않는다.

### 2.3 축별 근거

판정된 각 축은 자체 근거를 갖는다.

```json
"evidence": [
  {
    "source": "question|diagram|answer|solution",
    "quote": "근거가 된 실제 표현",
    "locator": "본문 2문장 또는 해설 3단계"
  }
]
```

- 근거는 문항·그림·정답·해설 중 어디서 판정했는지 밝힌다.
- `quote`는 가능한 경우 원자료에 실제 포함된 표현을 쓴다.
- 그림처럼 문자열 인용이 불가능하면 `quote`를 생략하고 `locator`에 관측 사실을 적을 수 있다.
- 이것은 학생 풀이 `evidence.quote`가 아니다. 문항 근거를 학생 관측 근거로 재사용하지 않는다.

---

## 3. 확정 7축

확정 7축은 `state:"assessed"`일 때 아래 값을 사용한다. 목록은 현재 판본의 허용·관측 값이며 닫힌 enum이 아니다. 새 값은 축 정의 판본을 올리고 추가한다.

| 축 키 | 값 형태 | 현재 값 목록 |
|---|---|---|
| `common.AX03_kind` | 단일 문자열 | 각, 길이, 넓이, 호, 원의 크기, 참거짓, 식, 자취 |
| `common.AX03_cardinality` | 단일 문자열 | 하나, 여러 값, 순서쌍 |
| `common.AX03_math_form` | 단일 문자열 | 수치, 비, 식, 명제 |
| `common.AX03_response_mode` | 단일 문자열 | 서술, 선택지 |
| `common.AX04_direction` | 단일 문자열 | forward, inverse |
| `unit.M3_CIRCLE_PROPERTIES.AXC02_count` | 단일 정수 또는 구간 문자열 | 1, 2, 3이상 |
| `unit.M3_CIRCLE_PROPERTIES.AXC02_relation` | 단일 문자열 | single, congruent, inscribed, independent |

`AXC02_count`의 `3이상`은 원측 정의가 범주값이므로 현재는 문자열로 보존한다. 실제 정수 개수가 안정적으로 관측되는 판본이 나오면 별도 `exact_count`를 추가할 수 있으나, 이 설계안에서는 새 필드를 선행 확정하지 않는다.

---

## 4. 나머지 축의 구조 자리

다음 축은 구조만 예약한다. 값의 최종 허용 목록이나 판정 기준을 이 문서가 확정하지 않는다.

| 축 키 | 값 형태 |
|---|---|
| `common.AX01_same_unit` | 문자열 배열(다중) |
| `common.AX01_other_unit` | 문자열 배열(다중) |
| `common.AXBASE_geometry` | 문자열 배열(다중) |
| `common.AXBASE_algebra` | 문자열 배열(다중) |
| `common.AX02` | 단일 문자열 |
| `common.AX02_kind` | 문자열 배열(다중) |
| `common.AX02_count` | 새로 그은 선·점의 개수(정수) |
| `common.AX04_unknowns` | 단일 문자열 또는 정수 범주 |
| `common.AX04_elimination` | 단일 문자열 |
| `unit.M3_CIRCLE_PROPERTIES.AXC01_kind` | 종류별 개수 객체 |
| `unit.M3_CIRCLE_PROPERTIES.AXC03_reflex` | 단일 문자열 |
| `unit.M3_CIRCLE_PROPERTIES.AXC03_arc_mode` | 단일 문자열 |

다중 축은 `value`에 배열을 넣고, 종류별 개수 축은 객체를 넣는다.

`common.AX02_count`의 단위는 **풀이를 위해 새로 그은 선과 새로 만든 점의 합계**다. 이미 있는 교점에 이름만 붙이는 것은 새 점으로 세지 않는다.

```text
OA, OB를 새로 그음                         -> 2  (선 2)
중심 O를 새로 잡고 OA·OB·OC를 새로 그음    -> 4  (점 1 + 선 3)
기존 교점을 P라고 이름 붙임                 -> 0  (새 선·점 없음)
```

```json
"common.AX01_same_unit": {
  "state": "assessed",
  "value": ["접선의 성질", "접선 길이의 동등"],
  "certainty": "확실",
  "evidence": []
},
"unit.M3_CIRCLE_PROPERTIES.AXC01_kind": {
  "state": "assessed",
  "value": { "chord_inside": 2, "radius_chord": 1 },
  "certainty": "확실",
  "evidence": []
}
```

`none`을 `AXC01_kind`의 일반 값으로 저장하는 것은 피한다. 실제 적용 대상이 없다면 공통 상태인 `not_applicable`로 표현해야 `none`, 미판정, 판정불가가 다시 섞이지 않는다. 축 정의에서 `none`이 별도의 수학적 관측값으로 확정될 경우에만 값으로 유지한다.

---

## 5. JSON 예시

아래 예시는 구조 설명용이며 실제 문항 판정값이 아니다.

### 5.1 예시 A — 확정 축 판정과 다중 공통 축

```json
{
  "user_item_id": "EXAMPLE_USER_ITEM_001",
  "unit_id": "M3_CIRCLE_PROPERTIES",
  "content_hash": {
    "algorithm": "sha256",
    "value": "EXAMPLE_ONLY",
    "basis": "normalized_item_content.v1"
  },
  "analysis_version": "axis-def.v4",
  "analyst": { "type": "human", "id": "reviewer-example" },
  "axes": {
    "common.AX03_kind": {
      "state": "assessed",
      "value": "각",
      "certainty": "확실",
      "evidence": [{ "source": "question", "quote": "각 x의 크기를 구하여라", "locator": "질문" }]
    },
    "common.AX03_cardinality": {
      "state": "assessed",
      "value": "하나",
      "certainty": "확실",
      "evidence": [{ "source": "question", "quote": "각 x", "locator": "질문" }]
    },
    "common.AX03_math_form": {
      "state": "assessed",
      "value": "수치",
      "certainty": "확실",
      "evidence": [{ "source": "answer", "quote": "55°", "locator": "정답" }]
    },
    "common.AX03_response_mode": {
      "state": "assessed",
      "value": "서술",
      "certainty": "확실",
      "evidence": [{ "source": "question", "quote": "구하여라", "locator": "질문" }]
    },
    "common.AX04_direction": {
      "state": "assessed",
      "value": "forward",
      "certainty": "애매",
      "reason": "해설 일부가 누락되어 역방향 조건 사용 여부를 재확인해야 함",
      "evidence": [{ "source": "question", "quote": "각 x의 크기를 구하여라", "locator": "질문" }]
    },
    "common.AX01_same_unit": {
      "state": "assessed",
      "value": ["접선의 성질", "접선 길이의 동등"],
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "두 접선의 길이는 같다", "locator": "해설 1단계" }]
    }
  }
}
```

### 5.2 예시 B — 해당없음·미판정·판정불가

```json
{
  "user_item_id": "EXAMPLE_USER_ITEM_002",
  "unit_id": "M3_CIRCLE_PROPERTIES",
  "content_hash": {
    "algorithm": "sha256",
    "value": "EXAMPLE_ONLY_2",
    "basis": "normalized_item_content.v1"
  },
  "analysis_version": "axis-def.v4",
  "analyst": { "type": "model", "id": "independent-review-example", "run_id": "example-run" },
  "axes": {
    "common.AX03_kind": {
      "state": "assessed",
      "value": "길이",
      "certainty": "확실",
      "evidence": [{ "source": "question", "quote": "선분 AB의 길이", "locator": "질문" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC03_arc_mode": {
      "state": "not_applicable",
      "reason": "호가 문제와 풀이에 등장하지 않음"
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_kind": {
      "state": "unjudgeable",
      "reason": "그림의 교점 표기가 잘려 종류와 개수를 확인할 수 없음",
      "evidence": [{ "source": "diagram", "locator": "오른쪽 원 그림의 잘린 영역" }]
    }
  }
}
```

예시 B에 없는 `common.AX04_direction`은 **미판정**이다. 명시된 `not_applicable`, `unjudgeable`과 다르다.

---

## 6. 축·값 추가 시 영향

### 6.1 새 값

축값을 데이터베이스 enum이나 JSON Schema의 폐쇄형 `enum`으로 만들지 않는다. 새 값은 축 정의 판본을 올린 뒤 해당 레코드에 문자열·숫자·배열·객체로 저장한다. 기존 레코드는 당시 `analysis_version`의 판정으로 유효하며 자동 수정하지 않는다.

닫힌 enum을 쓰면 다음이 막힌다.

- 새 값이 나온 순간 기존 검증기와 배포가 실패한다.
- 과거 판정값과 새 판정값을 같은 파일에 보존하기 어렵다.
- 단원별 축이 늘 때 공통 스키마를 계속 수정해야 한다.
- AX-03 v1처럼 들어갈 자리가 없는 현상을 기존 코드에 억지로 밀어 넣게 된다.

### 6.2 새 축

새 축은 `axes`에 새 키 하나를 추가한다. 기존 레코드에 그 키가 없으면 “구값”이나 “해당없음”이 아니라 **미판정**이다. 따라서 기존 레코드를 일괄 수정하지 않아도 된다.

재판정 대상은 다음 조건으로 찾는다.

```text
analysis_version이 현재 축 정의보다 오래됨
또는 새 축 키가 없음
또는 content_hash가 현재 문항 내용과 다름
```

### 6.3 고정해도 되는 것

축값은 열어 두되 데이터 계약 자체의 상태어(`assessed`, `not_applicable`, `unjudgeable`)와 필드명은 고정할 수 있다. 이것은 수학 분류 enum이 아니라 누락과 관측 상태를 구분하는 전송 규약이다.

---

## 7. 정적 파일 단계의 검증 규칙

구현 시점에 적용할 최소 검증 계약이며, 지금 검증기나 저장기를 만들지는 않는다.

1. `records`의 키와 내부 `user_item_id`가 같아야 한다.
2. `content_hash.algorithm`, `value`, `basis`가 모두 있어야 한다.
3. `analysis_version`과 `analyst.id`가 있어야 한다.
4. `assessed`에는 `value`, `certainty`, `evidence`가 있어야 한다.
5. `certainty:"애매"`에는 `reason`이 있어야 한다.
6. `unjudgeable`에는 `reason`이 있어야 하며 확정 `value`를 두지 않는다.
7. `not_applicable`에는 확정 `value`를 두지 않는다.
8. 축 키가 없는 경우만 미판정으로 해석한다. 빈 문자열과 `null`을 상태로 사용하지 않는다.
9. 단원 축의 이름공간 unit ID가 레코드의 `unit_id`와 같아야 한다.
10. `failed_step`, 학생 풀이, QF, OOT를 `axes` 안에 넣지 않는다.

---

## 8. 범위 밖 기록

- `QF`: 원문·그림·해설의 데이터 품질 대장에서 관리한다.
- `OOT`: 별도 검토 표식으로 관리하며 축 판정값으로 넣지 않는다.
- `failed_step`: attempt 분석 결과로만 관리한다.
- `observed_error_tags`: 학생 풀이 관측 계층에서 관리한다.
- `problem_type_id`: legacy 호환 계층에 남기며 `item_axes`의 정답으로 쓰지 않는다.

---

## 9. 결정 요약

| 질문 | 설계 판단 |
|---|---|
| 1단계 저장 위치 | 정적 `item_analysis_registry.json` 유지 |
| 레코드 기본키 | `user_item_id` |
| `content_hash` 역할 | 내용 일치 검증값, 기본키 아님 |
| 축 저장 형태 | 이름공간을 가진 열린 `axes` 객체 |
| 새 축 | 새 키 추가, 기존 레코드는 미판정으로 유지 |
| 새 값 | 축 정의 판본을 올려 추가, 닫힌 enum 없음 |
| 단원 축 | `unit.<unit_id>.<axis_id>` 이름공간 |
| 해당없음 | `state:not_applicable` |
| 미판정 | 축 키 없음 |
| 판정불가 | `state:unjudgeable` + 이유 |
| 축별 신뢰도 | `확실` / `애매`; 애매면 이유 필수 |
| 학생 실패 단계 | 포함하지 않음 |

이 문서는 설계안이다. 승인 전 구현·스키마 파일 생성·D1 이관을 하지 않는다.
