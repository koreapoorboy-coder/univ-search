# §5 감사 ①②③ — 배선 전 스키마 실측 (problem_types ↔ raw_taxonomy)

> 배선 전 필수 확인, 3회 인계 동안 미실시. Code탭 실측(데이터). 방법론 검수 대상.
> 대상: `public/math-weakness-engine/data/{problem_types, raw_taxonomy, source_item_bank, source_item_links}`.
> 도구 `Connect-ItemsViaPT.ps1`는 **raw_taxonomy**를 읽고, 엔진은 **problem_types 테이블**을 읽는다 — 이 둘의 정합이 배선 성패.

---

## ① problem_types 스키마에 묶음층이 있는가 → **없음 (평평)**

`problem_types/*.json` 각 행 필드: `problem_type_id · grade · course · unit_id · unit_name · type_name · description · concept_ids · default_difficulty · error_tags · source_orders · raw_section_id · status`

- **묶음명 담는 필드 0** — `group_name·parent_type_name·parent_id·category·topic_type·major_type` 전부 없음.
- `type_name`은 **세부 변형 한 줄**(예: `"방법의 수(물건의 수)가 직접 주어졌을 때 합의 법칙 - 기본 판별"`). 묶음명(`합의 법칙`)이 **문자열 중간**에 묻힘, 접두 아님.
- 단 **되돌아가는 다리 2개 존재**: 행별 `raw_section_id`(세부 단위 back-ref) + 최상위 `raw_taxonomy` 필드(파일 포인터).
- **함의**: 팩 앵커 `^묶음명`은 `type_name`에서 **안 걸림**(묶음명이 앞에 없어서). raw_taxonomy 없이 problem_types만으로는 앵커 재현 불가.

## ② problem_type_id 입도 → **세부보다 잘음(변형 단위), 묶음 아님**

| 층 | 예(CMC/counting) | 입도 |
|---|---|---|
| raw_taxonomy 묶음 (`type_name`) | 31 | 묶음 |
| raw_taxonomy 세부 (`legacy_problem_type_id`) | 107 | 세부 |
| **problem_types 행 (`problem_type_id`)** | **324** | **세부 × 기본/조건/복합 변형** |
| problem_types `raw_section_id` 고유 | 108 | ≈ 세부(back-ref) |

- `problem_type_id`은 세부를 **기본/조건/복합**으로 3분한 **변형 단위** = 세부보다 **더 잘다.**
- **걱정과 반대**: "묶음 단위라 여러 세부가 한 id 공유 → 예측축 뭉침"이 아니라, 오히려 세분되어 뭉침 위험 없음.
- item의 `primary_problem_type_id`도 이 변형 id 공간에 있음(③에서 100% 확인).

## ③ 조인율 실측 → **id는 완벽, 축 도출은 위험**

### (a) id 조인 — item.primary_problem_type_id ↔ ?
| 조인 대상 | 결과 |
|---|---|
| **problem_types.problem_type_id (엔진 테이블)** | **problem_types 파일 있는 11단원 전부 100%** |
| raw_taxonomy.legacy_problem_type_id (도구가 쓴 우회) | 11~100% 들쭉 (= 우리가 "PT-다리 커버율"로 부르던 값의 정체) |

→ **반전**: 엔진 자체 테이블(problem_types)이 **완벽한 조인 대상**이었다. 도구가 raw_taxonomy로 우회한 게 부분 커버였을 뿐. 낮던 커버율은 노동 크기가 아니라 **raw_taxonomy 세부에 legacy id가 부분만 부여된 결과**(조용한 0).

### (b) 축 도출 조인 — 엔진법(type_name) vs 도구법(raw ctx) 전 단원 실측
팩 규칙을 **①problem_types.type_name**(엔진이 가진 것) vs **②raw ctx=`묶음명+세부명`**(도구가 쓴 것)에 각각 돌려 축>0 비율:

| unit_code | 엔진법 type_name | 도구법 raw ctx | 손실 |
|---|---|---|---|
| QF | 31% | 100% | **69pp** |
| IR | 36% | 100% | **64pp** |
| GP | 39% | 100% | **61pp** |
| DA | 44% | 100% | 56pp |
| PG | 46% | 100% | 54pp |
| PM | 55% | 100% | 45pp |
| CG | 57% | 100% | 43pp |
| NE | 61% | 100% | 39pp |
| CM2SP | 65% | 100% | 35pp |
| EQ(LE) | 69% | 100% | 31pp |
| … | … | … | … |
| M1I | 100% | 100% | 0pp |

(전 30행 중 손실 0~69pp. 도구법은 AELF·PF 등 극소수 빼면 ~100%.)

→ **엔진이 `type_name`만으로 축을 도출하면 단원에 따라 최대 69pp가 조용히 빈다.** 원인은 노동 아니라 **필드 구조**(묶음명이 type_name 앞에 없어 `^묶음명` 앵커·묶음규칙 미발화). 사용자 경고("낮으면 필드부터 의심") 적중.

### (c) 배선 브리지 — problem_types.raw_section_id → raw_taxonomy 묶음
- LE 실측: `raw_section_id`(53 고유) → raw_taxonomy 묶음 `legacy_raw_section_id` = **41/53(77%)**. 세부 레벨 매칭 0.
- 즉 다리는 **묶음까지만, 77%**. 세부명(ctx 둘째 발)은 이 경로로 복원 안 됨.

## ⚠ problem_types/raw_taxonomy 결측 3단원 (item은 있음)
| item 단원 | problem_types | raw_taxonomy | 비고 |
|---|---|---|---|
| m2_similarity_pythagoras | **없음** | unit_id 미해소 | 856/유사 문제 단원 |
| m3_circle_properties | **없음** | legacy id 0 | 이름매칭 단원 |
| m3_statistics | **없음** | legacy id 0 | 이름매칭 단원 |

## 결론 (배선 설계에 직결)
1. **id 배선은 problem_types.problem_type_id로 하라 — 11단원 100%.** raw_taxonomy 우회 불필요.
2. **축은 type_name으로 도출하지 마라 — 최대 69pp 유실.** raw ctx(묶음명+세부명) 재구성 필수.
3. 재구성 경로 = `problem_types.raw_section_id → raw_taxonomy 묶음`(77%) + 세부명은 별도 조인 필요. **완전 복원 미달** → 배선 전 이 다리부터 보강.
4. 결측 3단원(유사·원·통계)은 problem_types/raw_taxonomy 자체가 없어 **엔진 재현 불가** — A라인 유형 추가 대기와 겹침.

## 재현
`tools/mathflat_builder/` 아니라 scratchpad 감사 스크립트로 실측. 핵심 수치는 위 표. (스크립트는 세션 scratchpad `audit_s5.ps1`.)
