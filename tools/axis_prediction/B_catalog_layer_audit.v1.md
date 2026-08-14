# 유형 카탈로그 층 조사 (add-bulk 구현 선행) v1 (2026-08-14)

> 검수 지시(2026-08-14): GPT 명세 §2 "카탈로그 = index가 가리키는 파일" 원칙의 실제 상태를 구현 전 확인.
> 방법: `data/index.v1.json` 파싱 → 각 unit의 `problem_types` 파일 존재·유형 종수·구조 [코드확인, PS ConvertFrom-Json].

## 결론 요약
- **① 파일 부재 단원 = 0.** 39단원 전부 problem_types 파일 존재·비어있지 않음 → "전건 pending" 단원 없음(검수 item 4 = 해당 없음).
- **② 이중 카탈로그 = 닮음 1건.** 예측층 `m2_similarity`(81, mathflat) / 관측 canonical `m2_similarity_pythagoras`(87). index는 **관측** 참조. 예측 81은 index **미참조**(Run-AxisPrediction 전용). 다른 미참조 파일 없음.
- **③ index → 관측 canonical(매칭 의도층 맞음).** 닮음 외 이중층 단원 없음.
- **★④ 신규·중대: 카탈로그 규모·구조가 §2 범주분할 전제와 어긋남.** 아래.

## ④-A 유형 종수 — 8/14 "140종→90%" 기준을 다수 단원이 초과
| 스코프 | 단원(종수) |
|---|---|
| 중등(현 스코프) | M1_PRIME_FACT **448** · M3_POLY_FACT 212 · M2_NUM_EXPR 211 · M3_REAL 203 · M3_QFUNC 176 · M2_LIN_EQ 156 · M2_PROB 153 · M2_LIN_FUNC 144 · M3_QEQ 144 · **M2_GEOM 140** · M2_LIN_INEQ 115 · M3_TRIG 108 · M2_SIMPY 87 · M1_SOLID 83 · M1_COORD 61 · M1_EXPR 60 · M1_BASIC_GEO 55 · M1_PLANE 54 · M3_CIRCLE 47 · M1_INT 47 · M3_STAT 23 |
| 고등(보류) | H2_SEQ **1131** · H1_FUNC_GRAPH 960 · … 대부분 500~960 |
- 8/14 실측: 유형 140종 단일 제시 시 AI 배정 90%. **중등 상당수가 140 이상**(448·212·211·203·176…). 단일 제시는 배정 정확도 저하 → 범주분할 필요. 그러나 ↓

## ④-B 카탈로그 구조 — domain/subdomain 필드 없음
- index-참조 파일(curated)의 유형 필드: `problem_type_id`·`type_name`·`description`·`concept_ids`·`default_difficulty`·`error_tags`·`status`. **`domain`/`subdomain` 없음**(그 필드는 예측층 mathflat 파일에만 존재).
- `type_name` **100% 존재**(신뢰 가능한 유일 필드). `description`은 단원별 편차.
- ⇒ GPT 명세 §2가 가정한 "domain/subdomain 범주분할"은 **이 파일들엔 실행 불가**.

## ④-C description "범주" 추출 — 일관성 없음(범주분할 기반으로 부적합)
| 단원 | 종수 | description | distinct 범주 | 평가 |
|---|---|---|---|---|
| M2_GEOM | 140 | 140 | **14** (~10/범주) | ✅ 범주분할 유효 |
| M3_QFUNC | 176 | 176 | 17 (~10/범주) | ✅ |
| M1_PRIME_FACT | 448 | 448 | 10 (~45/범주) | △ 줄지만 여전히 큼 |
| M2_NUM_EXPR | 211 | 211 | **71** (~3/범주) | ✗ 범주≈유형, 축소 무의미 |
| M3_TRIG | 108 | 108 | 36 (~3/범주) | ✗ 동일 |
| M2_SIMPY | 87 | **0** | **0** | ✗ description 자체가 없음 |
- ⇒ description-범주는 **단원마다 유효성이 다름**. 균일 규칙으로 못 씀.

## ⑤ 함의 — §2 범주분할 전략 재설계 필요 (검수 판단 요청)
GPT가 87~448종 카탈로그에서 유형을 고르게 하려면, 단원별 상황이 다르므로 단일 방식 불가. 후보:
- **(a) type_name 청크 제시** — 범주 없이 type_name 목록을 N개씩 나눠 순회(전 단원 균일 적용 가능하나 의미 그룹핑 없음).
- **(b) 단원별 범주맵 구축** — 범주가 잘 나오는 단원(M2_GEOM 등)은 description-범주 사용, 안 되는 단원(수와식·닮음)은 별도 범주맵 or type_name 청크. M2_GEOM은 처방 트랙 `category_ledger` 재사용 가능.
- **(c) 2단계 축소** — 1차: GPT가 대범주(사람이 준 소수 범주) 판단 → 2차: 그 범주 유형만 제시(레버 A와 동형). 범주맵을 사람이 단원별로 1회 정의(비용은 있으나 정확도↑).
- **(d) 유형 배정을 GPT 안 시킴** — GPT는 question_text·question_no만 정확 전사, **problem_type_id는 전부 비움(→ 전건 pending)** → §6 pending 후처리(일괄 유형지정)로 사람이 배치. 카탈로그 규모 문제를 투입에서 분리.
- ★검수 원칙("정확성>완결성", "틀린 유형=오매칭 유발")에 비추면 **(d)가 가장 안전**(GPT 억지 배정 0), 단 pending 후처리 부담이 큼. (c)는 정확도·부담 절충. **판단 요청**.

## ⑥ 부수 관측
- `M2_SIMPY`(87)는 description 전무 → (b)/(c) 적용 시 이 단원은 type_name만으로 판단해야 함.
- 검수 언급 "instruction_map에 similarity_pythagoras·circle·trig 3단원 부재"는 **별 파일**(instruction_map) 이슈 — problem_types는 3단원 다 존재(87·47·108). 진단 경로 데이터 완비도는 별건(백로그).

## 다음
검수가 ⑤ (a)~(d) 중 택 → GPT 명세 §2 재작성 → /add-bulk 구현. ★확정 전 §2 미수정.
