# Code탭 인계 — 수연산 처방 저작 스트림 (2026-08-18)

> **새 세션은 이 문서부터 읽고 §7 "다음 할 일"로 바로 들어가면 된다.**
> 상위 인계: `HANDOFF_검수_20260811.md`(역할·URL·인프라) + `REVIEW_HANDOFF_matching_phase.v2.md`(전체 국면·백로그·함정).
> 이 문서는 **현재 진행 중인 단 하나의 저작 스트림**을 다룬다.

---

## 1. 지금 어디까지 왔나

| 트랙 | 상태 |
|---|---|
| 매칭 파이프라인 | ✅ 종결(배포·검증 완료) |
| admin 목록 UI | ✅ 종결 — 서버 페이지네이션까지(`2026.08.18-list-paging` 배포됨) |
| 닮음(M2_SIMPY) 처방 87종 | ✅ **완결** — 저작·병합·게이트 해제까지 종결 |
| M2_GEOM 처방 140종 | ✅ 완결(2026-08-15) |
| **수연산 처방 414종** | 🔵 **진행 중 — 80/414 저작 완료** ← 현재 작업 |
| M1 기하 재태깅 192종 | ⏸ 사용자 GPT 작업 대기 |
| 백로그 ⑥ 관측→태그 개선 절차 설계 | ⏸ 100종 시점 이후 착수(검수 지시) |

**수연산 스코프**: `M2_NUMBER_EXPRESSION` 211 + `M3_REAL_NUMBER_CALC` 203 = **414종**.
overlay 0%인 4단원(M1_PRIME 448·M1_DATA 84·M1_EXPR 60·M1_INT 47 = 639종)은 **재태깅 대기로 제외**(검수 승인).

**현재 80종**은 전부 `M2_NUMBER_EXPRESSION`. 이 단원 잔여 **131종**, 그 다음 `M3_REAL_NUMBER_CALC` 203종.

---

## 2. 정본 파일

| 파일 | 역할 |
|---|---|
| `tools/axis_prediction/m2_ne_prescriptions.draft.v1.json` | **저작 정본**(_meta + prescriptions 58종) |
| `tools/axis_prediction/_backup/m2_ne_prescriptions.draft.v1.lastgood.json` | 롤링 백업(커밋 성공 시 갱신) |
| `tools/axis_prediction/B_arith_prescription_prep.v1.md` | **규격 정본** — 스코프·교체 규격·[코드확인] 6건 |
| `public/math-weakness-engine/data/problem_types/m2_number_expression.problem_types.v1.json` | 카탈로그 211종 |
| `public/math-weakness-engine/data/axis_map/m2_number_expression.pt_fine_error_tags.v1.json` | overlay 71종(34%) |

---

## 3. 저작 규격 (요약 — 상세는 prep 문서 §3)

**닮음은 신설이었지만 수연산은 교체다.** 기존 instruction_map 엔트리가 이미 있다.

| 처리 | 필드 |
|---|---|
| **교체 10** | 8 처방 필드 + `matched_template_id`→null + `match_score`→null |
| **보존 12** | grade·course·unit_id·unit_name·type_name·visible_path·taxonomy_levels·concept_ids·**error_tags**·default_difficulty·source_orders·raw_section_id |
| **추가 3** | `draft`:true · `revision`:1 · `observed_basis` |

★**`error_tags`는 보존한다**(M2_GEOM 실측 0/140 변경). overlay 오류형 태그는 **`error_checkpoints[].error_code`로만** 쓴다. 닮음(신설)과 규칙이 다르다.
★**`observed_basis`는 true/false 혼재가 정상** — 자기 overlay 태그가 있으면 true(커버리지 34%).

**draft 파일의 엔트리는 13필드**(8 처방 + matched/score/draft/revision/observed_basis). 나머지 보존 필드는 **병합 시점에** 기존 엔트리에서 가져온다.

**error_code 4-tier**: ① 자기 overlay → ② 단원 overlay 풀(91 distinct) → ③ `TAG_DICTIONARY_v2` → ④ 신설.
**checkpoint 2~4개**. **신설 상한 40종** — 초과 시 즉시 중간보고. **신설이 1건이라도 나오면 그 배치에서 즉시 보고**(4배치 연속 0이라 발생 자체가 신호).

---

## 4. 진행 실적 (tier 분포)

| 배치 | 범주 | 종수 | overlay | tier-1 | tier-2 | tier-3 | 신설 |
|---|---|---|---|---|---|---|---|
| 1 | 순환소수 3범주 | 10 | 60% | 13 | 11 | 0 | 0 |
| 2 | 지수법칙 3범주 | 12 | 25% | 6 | 22 | 0 | 0 |
| 3 | 다항식 4범주 | 12 | 17% | 6 | 25 | 0 | 0 |
| 4 | 단항식·괄호·이차식 6범주 | 24 | 38% | 16 | 42 | 0 | 0 |
| 5 | 지수법칙 곱셈·실생활·덧셈식·지수방정식 4범주 | 22 | 41% | 17 | 32 | 0 | 0 |
| — | **누계** | **80** | — | **58** | **132** | **0** | **0** |

**확정된 방침(검수 승인)**
- ★**tier-2 보편성 확정** — overlay가 17%까지 얇아져도 신설 0. "자기 유형에 overlay가 없어도 같은 단원 이웃 유형의 관측 어휘로 커버된다."
- ★**tier-2 보편성은 계산 계열 한정이 아니다**(배치5 관측) — 실생활·응용 10종(상황 모델링 유형)을 넣었는데도 단원 관측 어휘(`unit_conversion_omitted`·`stage_indexing_error`·`ratio_direction_inversion`·`answer_stage_confusion`)가 그대로 덮어 신설 0. 5배치 연속 0.
- **tier-2 허용 범위 제한 없음.** 방침 재검토 불요.
- **배치 크기 20~25종**(12종에서 상향, 배치4에서 24종 검증 완료). **한 커밋에 25종을 넘기지 말 것**(_meta 편집 사고 2회).
- **중간 보고는 100·200·300종 시점만.** 매 배치 보고 불요.

**gaps 누계**: 집계 34항목(원시 44건), 전부 B계열. **판정불가 개념 4개(13종)** — 배치5는 4범주 전부 판정 가능(추가 0).

★★**갭은 절대수로 보고·비교하지 말 것**(검수 지시 2026-08-18, `_meta.gaps_denominator_rule`).
갭이 생길 수 있는 자리는 **판정가능 개념(관측≥1 AND 예측층≥1)의 예측층 유형에 배치한 코드 슬롯**뿐이다. 반드시 분모와 함께 낸다. `collect_gaps.ps1`이 `[DENOMINATORS]` 블록으로 출력한다.

| 단원 | 커버리지 | 판정가능 개념 | 검사 코드(분모) | 갭 원시 | **GAP RATE** |
|---|---|---|---|---|---|
| 수연산 M2_NE (현재 도구 실측) | 34% | 16 | 85 | 44 | **51.8%** |
| M2_GEOM (재측정치) | 19% | 24 | 79 | 10 | **12.7%** |

★**GAP RATE는 예측 오류율이 아니다** — 예측층 유형에는 자기 overlay가 없으므로 그 코드는 정의상 전부 tier-2 이상이다. 즉 이웃 어휘를 빌린 결과가 그 개념의 관측 합집합 밖에 떨어진 비율이며 **tier 구성·개념 입도의 함수**다. 해석 보류.
★**M2_GEOM 수치 주의** — 재측정은 집계 6·편재제외 5인데 M2_GEOM 드래프트 기록값은 집계 5·편재제외 1이다(당시 절차가 현재 도구와 다름). **M2_GEOM 드래프트는 병합 완료본이라 덮어쓰지 않는다.** 비교표 인용 시 이 단서를 반드시 병기할 것.
★판정불가 관측의 함의(검수 지시로 기록): **M1은 overlay 0%라 전 개념이 판정불가** → 처방을 써도 예측·관측 대조가 원리상 불가 → **재태깅이 선행되어야 한다**는 정량 근거.

---

## 5. 도구 (전부 리포에 있음 · ASCII 전용)

| 도구 | 용도 |
|---|---|
| `tools/axis_prediction/edit_json_meta.ps1` | **`_meta` 편집 전용.** 텍스트 치환 금지 원칙을 도구로 강제 |
| `tools/axis_prediction/validate_ne_prescriptions.ps1` | 검증 13항목(자기정합 포함) |
| `tools/axis_prediction/collect_gaps.ps1` | gaps 수집·집계(`-Aggregate`로 JSON 블록 생성) + **`[DENOMINATORS]` 분모 출력**. `-GroupField`로 개념 그룹 경로 지정(M2_NE=`category_ledger` 기본 / M2_GEOM=`concept_map.concepts`, 중첩 `{name,types[]}` 형태 자동 판별) |

**사용법**
```
# 검증 (Expected = 누적 종수)
powershell -File tools\axis_prediction\validate_ne_prescriptions.ps1 -Expected 58

# _meta 편집 (한글은 반드시 UTF-8 패치 파일로만 전달)
powershell -File tools\axis_prediction\edit_json_meta.ps1 -File <draft.json> -PatchFile <patch.json> [-WhatIfOnly]

# gaps 수집
powershell -File tools\axis_prediction\collect_gaps.ps1 -Draft <draft.json> -Overlay <overlay.json> -Aggregate
```

**`edit_json_meta.ps1` 게이트 3종**: ① 전체 JSON 파싱 ② U+FFFD 스캔 ③ prescriptions 바이트 무변경. 하나라도 실패하면 **자동 복원**. 실제로 이번 세션에서 쉼표 누락·따옴표 미이스케이프를 두 번 차단했다.

**검증 13항목**: JSON 파싱 · U+FFFD · 엔트리 수 · 13필드 · cp 2~4 · cp 필드조합 · nonnull · tier 분해 · label_map(단원 내 + **교차 단원**) · ledger/concept_map 합 · observed_basis↔overlay 일치 · 카탈로그 실재 · **tier_breakdown 자기정합**.

---

## 6. ★이 세션에서 새로 등재한 함정 (인계문 §7에 반영됨)

1. **PS 한글 "리터럴 인코딩" 오염** — BOM 없는 `.ps1`에 한글을 직접 쓰면 실행 전에 이미 깨진다. 스크립트는 **오류 없이 정상 종료**하고 깨진 값이 데이터에 기록되며 **JSON 파싱도 통과**한다. 실사고: 닮음 병합 시 `course` 리터럴 1개가 **261건 오염**. → `.ps1`은 ASCII 전용, 한글은 데이터/패치 파일에서만.
2. **U+FFFD 스캔 상시화** — 인코딩 손상은 문법 오류를 안 내므로 파싱 통과로는 못 잡는다.
3. **`_meta` 구조 편집은 텍스트 치환 금지**(2회 파손) → `edit_json_meta.ps1` 경유.
4. **PS 변수명 대소문자 미구분** — `$FFFD`(문자)와 `$fffd`(개수)가 같은 변수. 도구가 스스로 오탐을 냈다. ★**도구를 만들면 정상 통과와 실패 케이스를 둘 다 시험할 것.**
5. **억제 건수 ≠ 카탈로그 종수**(2회) — 스코프는 반드시 `problem_types` 실집계로.

---

## 7. ★다음 할 일 (바로 착수)

### (1) 수연산 배치6 — 20~24종
`m2_number_expression` 잔여 131종에서 **범주 단위로** 다음 묶음을 고른다. 후보(잔여 종수·overlay, 큰 범주 순):
```
식의 값                        5종/ov2   소수점 아래 n번째 자리의 숫자 구하기  4종/ov2
순환소수를 분수로 나타내기(3)      4종/ov2   도형에서의 단항식의 계산(2) 입체도형   4종/ov1
B/(A×x)가 유한소수가 되도록 …    4종/ov2   등식의 변형의 도형 활용             4종/ov0
지수법칙(5) 몫의 거듭제곱         3종/ov0   지수법칙(6) 종합                  3종/ov2
지수법칙의 응용(2) 다른 문자로(1)  3종/ov2   지수법칙의 응용(4) 일의 자리수      3종/ov2
식의 대입                      3종/ov2   도형에서의 다항식의 계산(2) 입체도형   3종/ov2
```
★잔여 범주가 대부분 2~4종이라 배치6부터는 **6~8범주를 묶어야 20종**이 된다. 계열이 흩어지므로 배치 서사(finding)는 계열별로 나눠 기록할 것.
★전체 잔여 목록 생성기는 세션 스크래치에 있었다(카탈로그 `description`의 `<범주> 범주의 …` 접두에서 범주명을 파싱, overlay 보유 여부와 기저작 여부로 필터). **ASCII 전용 규칙 때문에 한글은 정규식 `\uXXXX` 이스케이프로 쓸 것** — 리터럴로 쓰면 조용히 깨진다(이번 세션에서 1회 발생, 즉시 재작성).

**절차**: 범주 선정 → 카탈로그·overlay 조회 → 저작(Edit로 prescriptions에 append) → `_meta` 패치(edit_json_meta.ps1) → 검증 13항목 → gaps 수집 → 커밋 → 롤링 백업.

**100종 도달 시 중간 보고**(20종 남음 = 배치 1회).

### (2) 100종 이후 — 백로그 ⑥ 설계
`관측→태그 개선 절차` 설계. 5절 필수: 트리거 / 입력 / 판정 / 반영 / 호환.
★전제로 쓸 것: **"커버리지가 얇은 단원은 관측 기반 개선이 불가능하다"**(판정불가 38% 실측).
★함께 판단: **관측 태그 자유생성** 문제(37번 문항에서 같은 오류에 관측 이름 4개, 실재 1·미실재 3). overlay 목록 강제(enum) 여부의 트레이드오프를 설계에서 명시할 것.

### (3) 414종 완료 후
`M3_REAL_NUMBER_CALC` 203종 → 최종 제출 → **part04 서지컬 병합**(교체 방식).
병합 참고: 닮음 append 실적 = `B_similarity_merge_result.v1.md`. 병합 스크립트 원형은 세션 스크래치에 있었으므로 **재작성 필요**(그때 `course` 한글 리터럴 함정을 반드시 피할 것 — 값은 `index.v1.json`에서 읽을 것).

---

## 8. 사용자·검수 쪽 대기 항목

- **사용자**: 문항 등록 진행 중(도형의 성질 8번 학습지, geom-07 중복 75건 롤백 중). D1 오염 조회 SQL 미실행(`B_backlog_batch1.v1.md` ① — Q1·Q2·Q3, 클릭 절차 포함).
- **검수**: 수연산 배치 승인은 100종 시점 보고까지 불요. 신설 발생 시에만 즉시 보고.
- **워커**: `2026.08.18-list-paging` 배포 확인됨. 추가 배포 대기 없음.
