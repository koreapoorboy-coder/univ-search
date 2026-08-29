# `item_axes` 스키마 설계 v1

작성: Codex · 2026-08-25

상태: **설계 정본 · 정적 명세 구현 시작**
근거: 검수 판정 65·66·74·81·87·89·93·112차

> 현재 확정 축은 판정 112차 기준 **13개**다. 사용자 승인에 따라 실제 `item_axis_spec.v1.json`과 구조 검증기를 만들었다. 문항 판정 레지스트리와 D1 이관은 아직 하지 않았다.

---

## 0. 결론

1단계 저장소는 정적 파일 `item_analysis_registry.json`을 사용한다. 레코드 기본키는 `user_item_id`, `content_hash`는 내용 검증용 보조값이다. 축은 이름공간이 있는 열린 `axes` 객체에 저장한다.

```text
item_analysis_registry.json
  records[user_item_id]
    content_hash
    analysis_version
    analyst
    axes[축 이름공간.축 ID]
```

새 축은 새 키로 추가하며 기존 레코드에 키가 없으면 미판정이다. 축값은 닫힌 DB enum으로 만들지 않는다.

---

## 1. 최상위 구조

```json
{
  "schema_version": "item-analysis-registry.v1",
  "generated_at": "2026-08-25T00:00:00+09:00",
  "records": {
    "USER_ITEM_ID": {
      "user_item_id": "USER_ITEM_ID",
      "unit_id": "M3_CIRCLE_PROPERTIES",
      "content_hash": {
        "algorithm": "sha256",
        "value": "...",
        "basis": "normalized_item_content.v1"
      },
      "analysis_version": "axis-def.ruling112",
      "analyst": { "type": "human|model", "id": "판정자", "run_id": "선택값" },
      "axes": {}
    }
  }
}
```

- 기본키는 `user_item_id`다. AI가 ID를 고르지 않고 검증된 대응표로 결합한다.
- `content_hash`는 같은 ID의 내용 변경을 찾는 값이며 기본키가 아니다.
- 해시 정본은 [`normalized_item_content.v1`](B_item_content_normalization.v1.md)이다.
- 임의 PDF나 ID가 검증되지 않은 문항은 확정 레코드로 넣지 않는다.

---

## 2. 이름공간·상태·근거

### 2.1 이름공간

```text
common.AX03_kind
unit.M3_CIRCLE_PROPERTIES.AXC02_count
```

`common.*`는 공통 축, `unit.<unit_id>.*`는 단원 축이다. 새 단원 전용 축이 생겨도 최상위 스키마는 바뀌지 않는다.

### 2.2 네 상태

| 의미 | 표현 |
|---|---|
| 미판정 | 해당 축 키 없음 |
| 해당없음 | `state:"not_applicable"` |
| 판정불가 | `state:"unjudgeable"` + `reason` |
| 판정됨 | `state:"assessed"` + `value` + `certainty` |

`certainty`는 `확실` 또는 `애매`이며, `애매`면 `reason`이 필수다. 다중 축을 판정했으나 결과가 0개이면 `state:"assessed"`, `value:[]`로 쓴다.

최신 확정 어휘의 `AXC01_vertex:none`, `AXC01_tangent_count:해당없음`, `AXC02_circle_relation:해당없음`은 판정 112차가 정한 **축의 도메인 값**이다. 전송 상태 `state:"not_applicable"`과 혼용하지 않는다.

### 2.3 축별 근거

```json
{
  "source": "question|diagram|answer|solution",
  "quote": "근거가 된 실제 표현",
  "locator": "근거 위치"
}
```

그림처럼 문자열 인용이 불가능하면 `quote`를 생략하고 `locator`에 관측 사실을 적을 수 있다. 문항 축 근거를 학생 풀이의 `evidence.quote`로 재사용하지 않는다.

---

## 3. 확정 13축

판정 112차의 활성 축은 **공통 7개 + 원의 성질 단원 축 6개**다. 값 목록은 현재 어휘이며 폐쇄형 enum이 아니다.

### 3.1 공통 7축

| 축 키 | arity / 타입 | 현재 값 또는 의미 | `confirmed_on` |
|---|---|---|---|
| `common.AX03_cardinality` | single / string | 하나, 여러 값, 순서쌍 | `null` |
| `common.AX03_math_form` | single / string | 수치, 비, 식, 명제 | `null` |
| `common.AX03_response_mode` | single / string | 서술, 선택지 | `null` |
| `common.AX04_direction` | single / string | forward, inverse | `null` |
| `common.AX04_elimination` | single / boolean | 식 조작으로 미지수를 제거하면 `true`, 아니면 `false` | `null` |
| `common.AX03_kind` | single / string | 각, 길이, 넓이, 호, 원의 크기, 개수, 참거짓, 식, 자취 | `["T1","T2"]` |
| `common.AX03_aggregation` | single / string | 단일, 합, 차, 비, 배 | `["T1","T2"]` |

### 3.2 원의 성질 단원 6축

| 축 키 | arity / 타입 | 현재 값 또는 의미 | `confirmed_on` |
|---|---|---|---|
| `unit.M3_CIRCLE_PROPERTIES.AXC02_count` | single / string | `"1"`, `"2"`, `"3이상"` | `null` |
| `unit.M3_CIRCLE_PROPERTIES.AXC03_reflex` | single / boolean | 180°를 넘는 중심각을 360°로 보정하면 `true`, 아니면 `false` | `null` |
| `unit.M3_CIRCLE_PROPERTIES.AXC01_lines` | multi / string[] | chord, secant, tangent | `["T1","T2"]` |
| `unit.M3_CIRCLE_PROPERTIES.AXC01_vertex` | single / string | inside, outside, none | `["T1","T2"]` |
| `unit.M3_CIRCLE_PROPERTIES.AXC01_tangent_count` | single / string | `"1"`, `"2"`, `"3이상"`, `"해당없음"` | `["T1","T2"]` |
| `unit.M3_CIRCLE_PROPERTIES.AXC02_circle_relation` | multi / string[] | 외접, 내접, 동심, 교차, 분리, 해당없음 | `["T2"]` |

기존 7축의 확정 표본은 현재 자료로 알 수 없으므로 `confirmed_on:null`이다. 추정해서 채우지 않는다.

### 3.3 설계 제약

1. 축 키 없음, `not_applicable`, `unjudgeable`, `assessed`를 서로 바꾸지 않는다.
2. 다중 축의 `assessed.value`는 빈 배열 `[]`도 허용한다.
3. 축 ID와 축값을 폐쇄형 enum으로 만들지 않는다.
4. 다중 축은 배열, 단일 축은 스칼라다.
5. 모든 레코드에 `analysis_version`을 둔다.
6. `failed_step`은 학생 풀이에서만 도출하며 `item_axes`에 넣지 않는다.
7. 축값을 `problem_type_id`에서 역산하지 않는다.
8. 숫자 범주는 한 필드에서 정수와 문자열을 섞지 않고 문자열로 통일한다.

### 3.4 폐기·미확정·보류

| 구분 | 축 | 처리 |
|---|---|---|
| 폐기 | `AXC01_kind`, `AXC01_count` | `AXC01_lines`, `AXC01_vertex`, `AXC01_tangent_count`로 대체 |
| 폐기 | `AXC02_relation` | `AXC02_count`, `AXC02_circle_relation`으로 분리 |
| 미확정 | `AXC03_arc_mode`, `AXC03_arc_primary` | 활성 명세·레코드에 넣지 않음 |
| 보류 | `AXC02_polygon_relation`, 현·할선의 개수, `AX04_cancel` | 값과 확정 상태를 넣지 않음 |
| 별도 측정 대기 | `AX02`, `AX02_kind`, `AX02_count` | 삭제도 확정도 하지 않고 결정 이력만 보존 |

`AX02_count`의 이전 승인 단위는 풀이를 위해 새로 그은 선과 새로 만든 점의 합계다. 기존 교점에 이름만 붙이는 것은 새 점으로 세지 않는다.

---

## 4. 판정 규칙과 구조 검증의 경계

축 정의의 판정 규칙은 문항을 읽고 값을 정하는 기준이고, 스키마 검증은 결과의 상태·타입·직렬화를 검사하는 계약이다. 판정 규칙은 라운드마다 바뀔 수 있으므로 검증기에 하드코딩하지 않는다.

```text
축 정의 문서   문항을 읽고 값을 판정
축 명세 파일   scope·arity·타입·현재 어휘·확정 표본
검증기         명세를 읽어 구조만 검사
```

---

## 5. JSON 예시

구조 설명용이며 실제 문항 판정값이 아니다.

```json
{
  "user_item_id": "EXAMPLE_USER_ITEM_001",
  "unit_id": "M3_CIRCLE_PROPERTIES",
  "content_hash": { "algorithm": "sha256", "value": "EXAMPLE", "basis": "normalized_item_content.v1" },
  "analysis_version": "axis-def.ruling112",
  "analyst": { "type": "human", "id": "reviewer-example" },
  "axes": {
    "common.AX03_kind": {
      "state": "assessed", "value": "호", "certainty": "확실",
      "evidence": [{ "source": "question", "quote": "호 AB의 길이를 구하여라", "locator": "질문" }]
    },
    "common.AX03_aggregation": {
      "state": "assessed", "value": "단일", "certainty": "확실",
      "evidence": [{ "source": "question", "quote": "호 AB", "locator": "질문" }]
    },
    "common.AX03_cardinality": { "state": "assessed", "value": "하나", "certainty": "확실", "evidence": [] },
    "common.AX03_math_form": { "state": "assessed", "value": "수치", "certainty": "확실", "evidence": [] },
    "common.AX03_response_mode": { "state": "assessed", "value": "서술", "certainty": "확실", "evidence": [] },
    "common.AX04_direction": { "state": "assessed", "value": "forward", "certainty": "확실", "evidence": [] },
    "common.AX04_elimination": { "state": "assessed", "value": false, "certainty": "확실", "evidence": [] },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_lines": {
      "state": "assessed", "value": ["tangent"], "certainty": "확실",
      "evidence": [{ "source": "diagram", "locator": "원과 한 점에서 만나는 직선" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_vertex": { "state": "assessed", "value": "outside", "certainty": "확실", "evidence": [] },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_tangent_count": { "state": "assessed", "value": "2", "certainty": "확실", "evidence": [] },
    "unit.M3_CIRCLE_PROPERTIES.AXC02_count": { "state": "assessed", "value": "1", "certainty": "확실", "evidence": [] },
    "unit.M3_CIRCLE_PROPERTIES.AXC02_circle_relation": {
      "state": "assessed", "value": [], "certainty": "확실",
      "evidence": [{ "source": "diagram", "locator": "두 원 사이의 관계 없음" }]
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC03_reflex": { "state": "assessed", "value": false, "certainty": "확실", "evidence": [] }
  }
}
```

---

## 6. 새 축·값과 재판정

- 새 축은 새 키를 추가한다. 기존 레코드의 키 부재는 미판정이다.
- 새 값은 축 정의 판본과 `current_values`를 갱신한다.
- `current_values` 밖 값 자체를 구조 오류로 막지 않는다.
- 기존 레코드를 자동 수정하거나 의미를 소급하지 않는다.

공통 재판정 후보는 오래된 `analysis_version`, 새 축 키 없음, `content_hash` 불일치다. 다만 v1 해시는 그림 원본 자체를 포함하지 않는다.

| 축·근거 | v1 해시 커버 | 추가 조건 |
|---|---|---|
| 텍스트 근거 축 | 본문·정답·해설 변경 감지 | 공통 조건 |
| 그림 서술이 본문에 충분한 그림 축 | 서술 변경 감지 | 그림·서술 동기화는 운영 한계 |
| 그림 서술이 없거나 불충분한 AXC01 3축 | **부분 또는 미커버** | 그림 변경 신호 또는 향후 v2 그림 해시 |

D1 실측은 2,168건 중 1,084건에 `그림 정보:`가 있음을 확인했다. v1 해시가 같다는 이유만으로 AXC01 계열을 재판정 불필요로 종결하지 않는다.

---

## 7. 축 명세 계약

검증기에 축 ID·arity·값 목록을 하드코딩하지 않는다. 별도 정적 명세 [`item_axis_spec.v1.json`](../../public/math-weakness-engine/data/item_axes/item_axis_spec.v1.json)이 다음 메타데이터를 제공하고 검증기가 이를 읽는다. 구조 검증기는 `scripts/Test-ItemAxisSpec.ps1`에 두었다.

```json
{
  "axis_spec_version": "item-axis-spec.v1",
  "axes": {
    "common.AX03_kind": {
      "scope": "common", "arity": "single", "value_type": "string",
      "current_values": ["각", "길이", "넓이", "호", "원의 크기", "개수", "참거짓", "식", "자취"],
      "value_policy": "open", "confirmed_on": ["T1", "T2"],
      "rejudgment_basis": ["normalized_item_content.v1"], "rejudgment_coverage": "full"
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC01_lines": {
      "scope": "unit", "unit_id": "M3_CIRCLE_PROPERTIES", "arity": "multi", "value_type": "string",
      "current_values": ["chord", "secant", "tangent"],
      "value_policy": "open", "confirmed_on": ["T1", "T2"],
      "rejudgment_basis": ["normalized_item_content.v1"], "rejudgment_coverage": "partial",
      "uncovered_change": "diagram_only", "planned_basis": "normalized_item_content.v2"
    },
    "unit.M3_CIRCLE_PROPERTIES.AXC02_count": {
      "scope": "unit", "unit_id": "M3_CIRCLE_PROPERTIES", "arity": "single", "value_type": "string",
      "current_values": ["1", "2", "3이상"], "value_policy": "open", "confirmed_on": null
    }
  }
}
```

`confirmed_on`은 확정 표본 ID의 문자열 배열이다. 근거 표본을 모르는 기존 7축에는 `null`을 쓰며 임의 표본을 추정하지 않는다.

### 7.1 최소 구조 검증 규칙

1. `records` 키와 내부 `user_item_id`가 같아야 한다.
2. `content_hash.algorithm`, `value`, `basis`가 모두 있어야 한다.
3. `analysis_version`과 `analyst.id`가 있어야 한다.
4. `assessed`에는 `value`, `certainty`, `evidence`가 있어야 한다.
5. 다중 축의 `assessed.value`는 배열이며 빈 배열도 유효하다.
6. `certainty:"애매"`와 `unjudgeable`에는 `reason`이 있어야 한다.
7. `unjudgeable`과 `not_applicable`에는 확정 `value`를 두지 않는다.
8. 축 키가 없는 경우만 미판정이다. 빈 문자열과 `null`을 상태로 쓰지 않는다.
9. 단원 축의 unit ID는 레코드 `unit_id`와 같아야 한다.
10. `failed_step`, 학생 풀이, QF, OOT를 `axes` 안에 넣지 않는다.
11. `confirmed_on`은 문자열 배열 또는 `null`이다.
12. `current_values`는 폐쇄형 허용 목록으로 사용하지 않는다.

---

## 8. 범위 밖 기록

- `QF`: 원문·그림·해설 데이터 품질 대장
- `OOT`: 별도 검토 표식
- `failed_step`: attempt 분석 결과
- `observed_error_tags`: 학생 풀이 관측 계층
- `problem_type_id`: legacy 호환 계층

---

## 9. 결정 요약

| 질문 | 판단 |
|---|---|
| 기본키 | `user_item_id` |
| 내용 검증 | `normalized_item_content.v1` 해시 |
| 활성 확정 축 | 판정 112차 기준 13개 |
| 확정 표본 | 축 명세의 `confirmed_on`; 모르면 `null` |
| 다중 축 결과 0개 | `state:assessed` + `value:[]` |
| 해당없음 / 미판정 / 판정불가 | `not_applicable` / 키 없음 / `unjudgeable` |
| 학생 실패 단계 | 포함하지 않음 |
| 실제 명세·검증기 | 정적 파일과 구조 검증기 생성 |
| 문항 판정 레지스트리·D1 | 아직 생성·변경하지 않음 |

이 문서는 판정 112차까지의 승인 범위를 반영한 설계 정본이다.
