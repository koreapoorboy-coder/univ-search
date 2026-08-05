# 수학 약점진단 엔진 — 문항 작업 전체 구조 지도 (데이터 실측 기준)

> 목적: 검수가 레이블·가정이 아니라 **실제 데이터 구조** 위에서 판단하도록 하는 공통 ground truth.
> 모든 수치는 리포 실측(2026-08, HEAD a00ff3ad 계열). 경로 = `public/math-weakness-engine/data/`.

## 0. 한눈에 — 두 체계, 다섯 층, item_id로 꿰임

```
[분류 체계]  NEW MathFlat 45단원  ←(팩·작업 대상)      OLD algebra  ←(교체 예정)
                     │
[유형 정의]  raw_taxonomy/(45) ─ problem_types/(유형 12,631 정의: type_name·error_tags·concept_ids)
                     │  ▲ 83% 조인(763/920, 고아 157=M2_SIMPY 등)
[문항-분류]  source_item_links/(14단원·3,364) : likely_error_tags·stages·hint  (본문·정답 ❌)
                     │  ▲ item_id 100% 조인(3,364, 고아 0)
[문항-원천]  source_item_bank/(14단원·3,364) : answer_key·방법태그·난이도·PDF페이지참조  (본문 ❌)
                     │
[원천 PDF]   source_file 참조만 — 리포 내 .pdf = 0개
```

## 1. 분류 체계 = 2개 공존
| | NEW (MathFlat) | OLD (algebra) |
|---|---|---|
| 위치 | raw_taxonomy/*.mathflat.v1.json (**45단원**) | algebra/ (병렬 구조) |
| 유형ID | M2_LE_PT011 · M3_STAT_PT002 | ALG_* |
| 팩(예측축) | ✅ 붙음(axis_rules.v44) | — |
| 운명 | 채택 | 교체 대상(§9, index.v1.json 원자 교체 시) |

## 2. 다섯 층 (NEW 체계, item_id로 조인)
1. **raw_taxonomy/** (45단원 정본) — 유형 분류. mathflat.v1.json(러너 입력)·raw_taxonomy.v1.json/csv.
2. **problem_types/** — 유형 정의 12,631개: `problem_type_id·type_name·error_tags·concept_ids·default_difficulty`.
3. **source_item_links/** (14단원·**3,364문항**) — 문항↔유형 연결 + 진단 메타:
   `primary_problem_type_id · likely_error_tags(100%·평균3.57) · expected_process_stages · first_action_hint · concept_ids`. **본문·정답 미저장(policy).**
4. **source_item_bank/** (14단원·**3,364문항**) — 문항 원천 메타:
   **`answer_key`(100%: choice 1571·value 1515·기타 270·multi 8) · answer_evidence(교차검증) · canonical_method_tags·method_summary · difficulty·observed_accuracy_percent · source_file·source_page·solution_page(PDF 참조)**. `raw_problem_text_stored=false·full_solution_text_stored=false`(전량).
5. **sources/** — 워크시트 출처 레지스트리(100 json).

## 3. 조인 실측 (검수 신뢰용)
- source_item_bank.item_id ↔ source_item_links.item_id = **3,364 / 3,364 = 100%** (양방향 고아 0).
- source_item_links.primary_problem_type_id ↔ problem_types.problem_type_id = **763 / 920 = 83%** (고아 157 = 17%, 예: M2_SIMPY_PT004·005·011).

## 4. 커버리지 (단원·학년)
| 학년 | 단원(문항수) |
|---|---|
| 중2 (7) | 문자와식 NE 300 · 일차방정식 LE 192 · 일차부등식 LI 150 · 일차함수 100 · 기하 150 · 확률 300 · 닮음피타 300 |
| 중3 (7) | 실수 150 · 다항식 PM 300 · 이차방정식 300 · 이차함수 300 · 삼각비 372 · 원 300 · 통계 150 |
| **합** | **14단원 · 3,364문항** |
| 중1·고등 (~31단원) | raw_taxonomy·problem_types엔 있음, **source 문항 = 0** (구축 필요) |

## 5. 축·팩 층 (A라인 — 우리가 작업해온 것)
- `tools/axis_prediction/axis_rules.v44.json` — **45단원 예측축 규칙 팩**(45/45 종결). 17진단축.
- **predicted_axes는 아직 문항 데이터에 미배선**(grep=0). 팩 출력↔유형 데이터 굽기가 (B) 배선 작업.
- 17축 정의 원문 = `axis_definitions_v10_orig.md`(§11 확보, §10·v11 미확보).

## 6. 진단·런타임 층 (하류)
- **diagnosis/** — `weakness_scoring_rules · student_solution_behavior_patterns · diagnosis_output_schema`(★`wrong_answer_diagnosis`·`student_solution_behavior_analysis` 블록 실재).
- **index.v1.json**(55KB) — 런타임 인덱스(`answer_review_rubric·diagnosis_rules·algebra_master_matching·hybrid_adapter_rules`). **지금 옛 체계로 돎, 완성 후 원자 교체(§9, 손대지 말 것).**
- **remediation/·forms/·display/·routes/** — 보정 경로·보고서 폼·표시.

## 7. 무엇이 있고 없나 (C층 상한 결정)
| | 있음 ✅ | 없음 ❌ |
|---|---|---|
| 진단 메타 | likely_error_tags·stages·hint·concept | — |
| 정답 | **answer_key 100%** + 교차검증 | — |
| 방법·난이도 | method_tags·observed_accuracy | — |
| 본문·선택지·해설 | — | 본문 텍스트·선택지 문구·해설 전문·**distractor→오류 매핑** |
| 원천 | source_file 참조 | **PDF 리포 0개** |

**→ 지금 가능:** 정오답 판정·난이도 가중·방법태그 진단(후보5 축소판).
**→ 막힘:** "오답 선택지별 실수 분기"는 선택지 텍스트/PDF 필요.

## 8. 이 지도의 용도
검수 오류가 반복된 원인 = 데이터 안 보고 레이블/가정으로 판단(D1↔D3 뒤바뀜·LI A3 성급 철회·"답 필드 없음" 오판, 셋 다 실측으로 뒤집힘). **판정 전 이 지도의 조인·필드·수치를 근거로 삼을 것.**
