# `item_axes` 스키마 설계 v1

작성: Codex · 2026-08-24
상태: **설계안 · 구현 전**
근거: 검수 판정 65·66·74·81·87·89·93차

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
      "analysis_version": "axis-def.ruling93",
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
- `content_hash.basis`는 [`normalized_item_content.v1`](B_item_content_normalization.v1.md)로 기록한다. 공백·유니코드·필드 순서·직렬화 규칙은 해당 문서를 단일 정본으로 사용한다.
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
[
  { "state": "assessed", "value": "각", "certainty": "확실", "evidence": [] },
  { "state": "not_applicable", "reason": "호가 문제에 등장하지 않음" },
  { "state": "unjudgeable", "reason": "그림의 점 표시가 누락되어 판정 불가", "evidence": [] }
]
```

| 의미 | 표현 |
|---|---|
| 미판정 | `axes`에 해당 키가 없음 |
| 해당없음 | `state: "not_applicable"` |
| 판정불가 | `state: "unjudgeable"` + `reason` 필수 |
| 판정됨 | `state: "assessed"` + `value` + `certainty` |

`assessed`의 `certainty`는 `확실` 또는 `애매`이며, `애매`면 `reason`이 필수다. `unjudgeable`은 값 자체를 확정하지 못한 상태이므로 `value`를 쓰지 않는다.

다중 축을 적용해 판정했지만 사용된 값이 하나도 없으면 `state:"assessed"`, `value:[]`로 기록한다. 이는 축 자체가 적용되지 않는 `not_applicable`, 아직 재지 않은 축 키 없음과 모두 다르다.

```json
{
  "state": "assessed",
  "value": [],
  "certainty": "확실",
  "evidence": [
    { "source": "solution", "locator": "전체 해설 검토: 다른 단원 정리 사용 없음" }
  ]
}
```

이것은 판정 74차의 `student_work_observation`과 **같은 상태 분리 원리**를 쓴다. 다만 두 모델의 대상은 다르다. 여기서는 문항 축의 적용·판정 상태를 표현하고, 학생 필기 유무나 실패 단계는 표현하지 않는다.

### 2.3 축별 근거

판정된 각 축은 자체 근거를 갖는다.

```json
{
  "evidence": [
    {
      "source": "question|diagram|answer|solution",
      "quote": "근거가 된 실제 표현",
      "locator": "본문 2문장 또는 해설 3단계"
    }
  ]
}
```

- 근거는 문항·그림·정답·해설 중 어디서 판정했는지 밝힌다.
- `quote`는 가능한 경우 원자료에 실제 포함된 표현을 쓴다.
- 그림처럼 문자열 인용이 불가능하면 `quote`를 생략하고 `locator`에 관측 사실을 적을 수 있다.
- 이것은 학생 풀이 `evidence.quote`가 아니다. 문항 근거를 학생 관측 근거로 재사용하지 않는다.

---

## 3. 확정 20축과 설계 제약

판정 93차에서 20축의 구조와 현재 관측값이 확정됐다. 아래 값 목록은 현재 판본의 관측 어휘이며 닫힌 enum이 아니다. 새 값은 `analysis_version`을 올려 추가한다.

### 3.1 반드시 지킬 여섯 제약

1. `none`, `해당없음`과 상태 자리표시자로 쓰인 `없음`을 축값에 섞지 않는다. 축이 적용되지 않으면 `state:"not_applicable"`로 표현한다. 적용되는 이진 관측의 부정은 문자열 `"없음"` 대신 불리언 `false`로 저장해 상태와 구분한다. 다중 축을 실제로 판정한 결과가 0개이면 `state:"assessed"`, `value:[]`이며 `not_applicable`이 아니다.
2. 축 ID와 축값을 데이터베이스 enum 또는 JSON Schema의 폐쇄형 enum으로 만들지 않는다.
3. 다중 플래그 축은 배열, 단일 값 축은 스칼라, 종류별 개수는 객체로 구분한다.
4. 모든 레코드에 `analysis_version`을 기록한다. 판본 변경·새 축 키 부재는 공통 재판정 조건이고, `content_hash` 불일치는 v1 해시가 근거를 포함하는 축의 재판정 조건이다. 그림 전용 근거처럼 v1이 포함하지 않는 근거는 축별 조건으로 별도 관리한다.
5. `failed_step`은 학생 풀이에서만 도출하므로 `item_axes`에 넣지 않는다.
6. 축값을 D1의 `problem_type_id`로 만들거나 그 ID에서 역산하지 않는다. 이는 문항 축을 만들기 위해 유형이 필요하고 유형을 만들기 위해 축이 필요한 순환을 재발시킨다.

### 3.2 공통 단일 축

| 축 키 | 저장 형태 | 현재 값 목록 또는 의미 |
|---|---|---|
| `common.AX03_kind` | 단일 문자열 | 각, 길이, 넓이, 호, 원의 크기, 참거짓, 식, 자취 |
| `common.AX03_cardinality` | 단일 문자열 | 하나, 여러 값, 순서쌍 |
| `common.AX03_math_form` | 단일 문자열 | 수치, 비, 식, 명제 |
| `common.AX03_response_mode` | 단일 문자열 | 서술, 선택지 |
| `common.AX04_direction` | 단일 문자열 | forward, inverse |
| `common.AX04_elimination` | 단일 불리언 | 식 조작으로 미지수를 제거하면 `true`, 아니면 `false` |
| `common.AX04_unknowns` | 단일 범주 문자열 | `"0"`, `"1"`, `"2이상"` |
| `common.AX04_cancel` | 단일 불리언 | 보조량이 값을 구하지 않은 채 자연 상쇄되면 `true`, 아니면 `false` |
| `common.AXBASE_angle_partition` | 단일 불리언 | 각을 부분으로 나누어 사용하면 `true`, 아니면 `false` |

`AX04_elimination`과 `AX04_cancel`은 서로 다른 현상이다.

```text
AX04_elimination  두 개 이상의 미지수를 둔 식을 조작해 하나를 제거함
AX04_cancel       보조량이 식에서 저절로 상쇄되어 그 값을 구하지 않고 목표가 결정됨
```

이름 없이 도입된 보조량은 `AX04_unknowns`에 세지 않더라도 `AX04_cancel`에는 기록할 수 있다.

### 3.3 공통 다중 축

| 축 키 | 저장 형태 | 현재 값 목록 |
|---|---|---|
| `common.AX01_same_unit` | 문자열 배열 | 내접사각형의 대각 보각, 호 ∝ 원주각, 원주각 = 중심각의 1/2, 같은 호의 원주각 동등, 원주·호의 등분, 지름의 원주각 90°, 접선의 성질, 접선 길이의 동등, 전체 원주에 대응하는 원주각의 합은 180°, 원의 중심에서 현에 내린 수선은 현을 이등분, 네 점이 한 원 위 조건 |
| `common.AX01_other_unit` | 문자열 배열 | 이등변삼각형, 평행선(엇각), 삼각비, 직각삼각형(수선·피타고라스), 삼각형 합동, 삼각형 사인 넓이 공식, 정삼각형, 정다각형의 변·각·대각선 성질, 삼각형 닮음, 중점연결정리, 평행사변형 성질, 자취·이동거리, 이차방정식·황금비 |
| `common.AXBASE_geometry` | 문자열 배열 | 삼각형 외각 정리, 삼각형 내각합, 중심각 ∝ 호의 길이, 사각형 내각합, 맞꼭지각 |
| `common.AXBASE_algebra` | 문자열 배열 | 비례배분, 일차방정식, 비례식, 이차방정식, 연립소거 |

`AX01_other_unit`은 다른 단원이 열릴 때마다 값이 늘어난다. `AXBASE_geometry`의 `중심각 ∝ 호의 길이`는 8차에서 양쪽 23건이 일치해 신설됐으며, 폐기된 `각의 분해·합성`은 값 목록에 포함하지 않는다.

### 3.4 단원 축 — `M3_CIRCLE_PROPERTIES`

| 축 키 | 저장 형태 | 현재 값 목록 또는 의미 |
|---|---|---|
| `unit.M3_CIRCLE_PROPERTIES.AXC01_kind` | 문자열 배열(다중) | chord_inside, secant_outside, tangent_secant, tangent_tangent, tangency_point, radius_chord, outside_point |
| `unit.M3_CIRCLE_PROPERTIES.AXC01_count` | 종류별 개수 객체 | `{ "chord_inside": 2, "radius_chord": 1 }` 형태. 관측 개수 1, 2, 4이며 상한을 고정하지 않음 |
| `unit.M3_CIRCLE_PROPERTIES.AXC02_count` | 단일 범주 문자열 | `"1"`, `"2"`, `"3이상"` |
| `unit.M3_CIRCLE_PROPERTIES.AXC02_relation` | 단일 문자열 | single, congruent, inscribed, independent |
| `unit.M3_CIRCLE_PROPERTIES.AXC03_reflex` | 단일 불리언 | 180°를 넘는 중심각을 360°로 보정하면 `true`, 아니면 `false` |
| `unit.M3_CIRCLE_PROPERTIES.AXC03_arc_mode` | 문자열 배열(다중) | direct, complement, major |
| `unit.M3_CIRCLE_PROPERTIES.AXC03_arc_primary` | 단일 문자열 | `AXC03_arc_mode` 값 가운데 결론에 주된 것 하나 |

`AXC01_count`는 `"chord_inside:1"` 같은 문자열이 아니라 `kind`를 키로 하는 객체다. 한 문항에 여러 구성이 함께 올 수 있다. `AXC03_arc_primary` 값은 같은 레코드의 `AXC03_arc_mode` 배열에 포함되어야 한다.

`AX04_unknowns`와 `AXC02_count`는 한 필드에서 정수와 문자열을 섞지 않고 모든 값을 범주 문자열로 저장한다. 관측되지 않은 `exact_count`나 상한 필드는 선행 생성하지 않는다.

### 3.5 판정 93차 확정 목록 밖의 이전 예약 필드

판정 81·82차에서 구조 자리와 단위를 승인했던 `AX02`, `AX02_kind`, `AX02_count`는 판정 93차의 확정 20축 및 후보 축 목록에 포함되지 않았다. 이 문서는 세 필드를 확정축으로 표시하거나 값을 생성하지 않는다. 삭제·폐기 판정도 받지 않았으므로 이전 정의를 결정 이력으로만 보존하고, 명시적 후속 판정 전에는 레코드에 쓰지 않는다.

```text
AX02_count의 이전 승인 단위: 풀이를 위해 새로 그은 선과 새로 만든 점의 합계
기존 교점에 이름만 붙이는 것은 새 점으로 세지 않음
```

### 3.6 아직 스키마에 올리지 않는 후보

`SCOPE(global/local)`, `DIR(given/proved)`, 교점각 결합 연산, 대칭 쌍 집계, 구성의 목적, 접점의 역할은 확정 20축에 포함되지 않는다. 문항 근거가 확정될 때까지 필드를 미리 만들지 않는다.

---

## 4. 판정 규칙과 스키마 검증의 경계

축 정의의 판정 규칙 A~O는 어떤 문항에 어떤 축값을 부여할지를 정하는 **판정 기준**이다. 이 규칙은 독립 판정 라운드에서 바뀔 수 있으므로 정적 파일 구조를 검사하는 스키마 검증 규칙에 넣지 않는다.

```text
축 정의 문서   문항을 읽고 값을 판정하는 규칙 A~O
스키마 문서    판정 결과의 상태·타입·관계·직렬화 계약
```

예를 들어 규칙 J는 결론이 `complement` 또는 `major`이면 중간의 `direct` 계산을 흡수한다. 이는 판정자가 `AXC03_arc_mode`를 만드는 규칙이며, 스키마 검증기는 `direct`와 `complement`의 동시 등장을 금지하지 않는다. 판정 규칙이 바뀌어도 저장 형식과 검증기가 함께 깨지지 않게 하기 위해서다.

---

## 5. JSON 예시

아래 예시는 구조 설명용이며 실제 문항 판정값이 아니다.

### 5.1 예시 A — 확정 20축의 저장 형태

```json
{
  "user_item_id": "EXAMPLE_USER_ITEM_001",
  "unit_id": "M3_CIRCLE_PROPERTIES",
  "content_hash": {
    "algorithm": "sha256",
    "value": "EXAMPLE_ONLY",
    "basis": "normalized_item_content.v1"
  },
  "analysis_version": "axis-def.ruling93",
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
    "common.AX04_elimination": {
      "state": "assessed",
      "value": false,
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "중심각은 120°", "locator": "해설" }]
    },
    "common.AX04_unknowns": {
      "state": "assessed",
      "value": "1",
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "각 AOB를 a라 하자", "locator": "해설" }]
    },
    "common.AX04_cancel": {
      "state": "assessed",
      "value": true,
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "(100°-a)+a=100°", "locator": "해설" }]
    },
    "common.AXBASE_angle_partition": {
      "state": "assessed",
      "value": true,
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "∠AOB=∠AOC+∠COB", "locator": "해설" }]
    },
    "common.AX01_same_unit": {
      "state": "assessed",
      "value": ["원주각 = 중심각의 1/2", "같은 호의 원주각 동등"],
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "같은 호에 대한 원주각", "locator": "해설" }]
    },
    "common.AX01_other_unit": {
      "state": "assessed",
      "value": ["이등변삼각형"],
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "OA=OB이므로 이등변삼각형", "locator": "해설" }]
    },
    "common.AXBASE_geometry": {
      "state": "assessed",
      "value": ["삼각형 외각 정리"],
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "외각은 두 내각의 합", "locator": "해설" }]
    },
    "common.AXBASE_algebra": {
      "state": "assessed",
      "value": ["비례배분"],
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "호의 비로 나누면", "locator": "해설" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_kind": {
      "state": "assessed",
      "value": ["chord_inside", "radius_chord"],
      "certainty": "확실",
      "evidence": [{ "source": "diagram", "locator": "원 내부의 현 교점과 반지름-현 교점" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_count": {
      "state": "assessed",
      "value": { "chord_inside": 1, "radius_chord": 1 },
      "certainty": "확실",
      "evidence": [{ "source": "diagram", "locator": "구성 종류별 교점 개수" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC02_count": {
      "state": "assessed",
      "value": "2",
      "certainty": "확실",
      "evidence": [{ "source": "diagram", "locator": "관계 대상 원 2개" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC02_relation": {
      "state": "assessed",
      "value": "independent",
      "certainty": "확실",
      "evidence": [{ "source": "diagram", "locator": "서로 독립인 두 원" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC03_reflex": {
      "state": "assessed",
      "value": false,
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "중심각은 120°", "locator": "해설" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC03_arc_mode": {
      "state": "assessed",
      "value": ["complement"],
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "전체 원주에서 해당 호를 빼면", "locator": "해설" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC03_arc_primary": {
      "state": "assessed",
      "value": "complement",
      "certainty": "확실",
      "evidence": [{ "source": "solution", "quote": "전체 원주에서 해당 호를 빼면", "locator": "해설" }]
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
  "analysis_version": "axis-def.ruling93",
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

위 세 조건은 모든 축의 필요조건을 완전히 대체하지 않는다. 재판정 근거 범위는 축별로 나눈다.

| 축·근거 범위 | v1 `content_hash` 보장 | 추가 조건 |
|---|---|---|
| 근거가 `question_text`, `answer`, `explanation`에 모두 포함된 축 | 해당 텍스트 변경을 감지 | 공통 3조건 사용 |
| 그림 사실이 `question_text`에 충분히 서술된 AXC01 계열 | 서술 변경을 감지 | 서술이 실제 그림과 함께 갱신됐는지 운영 확인 |
| 그림 사실이 `question_text`에 없거나 불충분한 `AXC01_kind`, `AXC01_count` | **커버되지 않음** | 그림 변경 신호 또는 v2 그림 해시가 필요 |

D1 실측은 전체 2,168건 중 1,084건에 `그림 정보:`가 있음을 확인했다. 판정 표본에서는 그림 서술이 없는 70건 중 29건에 AXC01 판정이 있었다. 따라서 v1 해시가 같다는 이유만으로 AXC01 계열을 “재판정 불필요”로 종결하지 않는다.

### 6.3 고정해도 되는 것

축값은 열어 두되 데이터 계약 자체의 상태어(`assessed`, `not_applicable`, `unjudgeable`)와 필드명은 고정할 수 있다. 이것은 수학 분류 enum이 아니라 누락과 관측 상태를 구분하는 전송 규약이다.

---

## 7. 정적 파일 단계의 검증 규칙

구현 시점에 적용할 최소 검증 계약이며, 지금 검증기나 저장기를 만들지는 않는다.

1. `records`의 키와 내부 `user_item_id`가 같아야 한다.
2. `content_hash.algorithm`, `value`, `basis`가 모두 있어야 한다.
3. `analysis_version`과 `analyst.id`가 있어야 한다.
4. `assessed`에는 `value`, `certainty`, `evidence`가 있어야 한다.
5. 다중 축의 `assessed.value`는 배열이어야 하며 빈 배열 `[]`을 유효한 판정 결과로 허용한다. 빈 배열을 누락·오류·`not_applicable`로 바꾸지 않는다.
6. `certainty:"애매"`에는 `reason`이 있어야 한다.
7. `unjudgeable`에는 `reason`이 있어야 하며 확정 `value`를 두지 않는다.
8. `not_applicable`에는 확정 `value`를 두지 않는다.
9. 축 키가 없는 경우만 미판정으로 해석한다. 빈 문자열과 `null`을 상태로 사용하지 않는다.
10. 단원 축의 이름공간 unit ID가 레코드의 `unit_id`와 같아야 한다.
11. `failed_step`, 학생 풀이, QF, OOT를 `axes` 안에 넣지 않는다.
12. `AXC01_count`의 모든 키가 같은 레코드의 `AXC01_kind` 배열에 포함되어야 하며 개수 상한을 고정하지 않는다.
13. `AXC03_arc_primary`는 같은 레코드의 `AXC03_arc_mode` 배열에 포함되어야 한다.
14. `none`, `해당없음`, 상태 자리표시자 `없음`을 축값으로 저장하지 않는다.

### 7.1 축 명세 파일을 통한 데이터 주도 검증 — 채택

검증기에 다중 축 ID나 값 목록을 하드코딩하지 않는다. 별도 정적 명세 파일 `item_axis_spec.json`을 두고 검증기는 그 계약을 읽는다. 지금은 구조만 확정하며 실제 JSON 파일이나 검증기를 만들지 않는다.

```json
{
  "axis_spec_version": "item-axis-spec.v1",
  "axes": {
    "common.AX01_other_unit": {
      "scope": "common",
      "arity": "multi",
      "value_type": "string",
      "current_values": ["이등변삼각형", "평행선(엇각)"],
      "value_policy": "open"
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_count": {
      "scope": "unit",
      "unit_id": "M3_CIRCLE_PROPERTIES",
      "arity": "count_map",
      "value_type": "nonnegative_integer",
      "key_axis_id": "unit.M3_CIRCLE_PROPERTIES.AXC01_kind",
      "rejudgment_basis": ["normalized_item_content.v1"],
      "rejudgment_coverage": "partial",
      "uncovered_change": "diagram_only",
      "planned_basis": "normalized_item_content.v2",
      "current_values": [],
      "value_policy": "open"
    }
  }
}
```

- `scope`: `common` 또는 `unit`; 단원 축에는 `unit_id` 필수
- `arity`: `single`, `multi`, `count_map` 중 하나
- `value_type`: 저장 타입을 검사하는 구조 계약
- `current_values`: 현재 관측값 목록이며 허용값을 닫는 enum이 아님
- `value_policy:"open"`: 목록 밖 새 값 자체를 오류로 만들지 않음
- `key_axis_id`: count map의 키가 어느 다중 축 값과 대응하는지 선언
- `rejudgment_basis`: 현재 재판정 변경 감지에 사용하는 basis 목록
- `rejudgment_coverage`: 현재 basis가 축 근거 전체를 덮는지 표시
- `uncovered_change`: 현재 basis가 감지하지 못하는 변경 종류
- `planned_basis`: 미감지 변경을 다룰 예정 basis이며 존재하지 않는 판본을 구현된 것처럼 사용하지 않음

`scope`, `arity`, `value_type`은 데이터 구조 계약이므로 명세에 고정할 수 있다. 수학 축값은 계속 늘어나므로 `current_values`를 검증기의 폐쇄형 허용 목록으로 사용하지 않는다. 새 축은 명세에 항목 하나를 추가하고 레코드에는 새 키를 쓰며, 검증기 코드는 바꾸지 않는다.

재판정 조건도 축마다 다를 수 있으므로 검증기 코드에 AXC01 예외를 하드코딩하지 않는다. 명세의 `rejudgment_*` 메타데이터를 읽어 v1 해시가 전 근거를 덮는 축과 부분만 덮는 축을 구분한다.

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
| 확정 축 | 판정 93차 기준 20축 |
| 새 축 | 새 키 추가, 기존 레코드는 미판정으로 유지 |
| 새 값 | 축 정의 판본을 올려 추가, 닫힌 enum 없음 |
| 다중 축 | 문자열 배열; 단일 축과 구조적으로 구분 |
| 다중 축 판정 결과 0개 | `state:assessed` + `value:[]` |
| 종류별 개수 | 문자열이 아닌 `{kind: count}` 객체 |
| 단원 축 | `unit.<unit_id>.<axis_id>` 이름공간 |
| 해당없음 | `state:not_applicable` |
| 미판정 | 축 키 없음 |
| 판정불가 | `state:unjudgeable` + 이유 |
| 축별 신뢰도 | `확실` / `애매`; 애매면 이유 필수 |
| 학생 실패 단계 | 포함하지 않음 |
| D1 `problem_type_id` | 축 저장·역산에 사용하지 않음 |

이 문서는 설계안이다. 승인 전 구현·스키마 파일 생성·D1 이관을 하지 않는다.
