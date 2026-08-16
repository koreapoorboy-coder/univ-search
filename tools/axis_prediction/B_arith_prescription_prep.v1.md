# 수연산 처방 저작 준비 — 스코프·교체 규격 ([코드확인] 6건) v1 (2026-08-16)

> 검수 승인 스코프 = **414종 2단원**. overlay 0인 4단원 639종은 재태깅 대기로 분류(제외).
> 닮음(신설·M2_SIMPY)과 달리 **기존 엔트리가 있어 교체**(M2_GEOM 방식). 규격은 M2_GEOM 병합 전후 실측으로 확정.

## 1. 단원 실태 [코드확인]
| 단원 | 카탈로그 | overlay 태그보유 | 커버리지 | IM 엔트리 | 스코프 |
|---|---|---|---|---|---|
| M2_NUMBER_EXPRESSION | 211 | 71 | 34% | 211 | ✅ 착수 |
| M3_REAL_NUMBER_CALC | 203 | 89 | 44% | 203 | ✅ 착수 |
| M1_PRIME_FACTORIZATION | 448 | 0 | 0% | 448 | ⏸ 재태깅 대기 |
| M1_DATA_ANALYSIS | 84 | 0 | 0% | 84 | ⏸ 재태깅 대기 |
| M1_EXPRESSION | 60 | 0 | 0% | 60 | ⏸ 재태깅 대기 |
| M1_INT_RATIONAL | 47 | 0 | 0% | 47 | ⏸ 재태깅 대기 |
| **합** | **1053** | **160** | — | **1053** | **414 착수 / 639 대기** |

★**"수연산 739"는 낡은 수치**(검수 정정: 8/14 억제 규모 보고의 `no_template_for_unit` 건수였고 카탈로그 종수가 아님). 실측 **1053**이 정본. M1_PRIME 448만 우연히 일치.

## 2. 기존 엔트리 상태 [코드확인]
- **6단원 전부 instruction_map 엔트리 보유**(1053) → **신설 아님, 교체**.
- 내용은 **템플릿 보일러플레이트**: M2_NUMBER_EXPRESSION 211종이 distinct `problem_nature` **7개**만 공유(M1_PRIME 448종 → **3개**).
- `matched_template_id`가 타 도메인 오배정 다수(수연산에 `ACTION_MATRIX_ROW_COLUMN`·`ACTION_GEOMETRIC_SERIES`·`ACTION_AREA_BETWEEN_CURVES`). 그래서 6단원 전부 `no_template_units`에 있고 억제 중.
- 보존 대상 필드는 **414/414 전건 채워져 있음**(concept_ids·source_orders·raw_section_id·error_tags·default_difficulty·visible_path).

## 3. ★교체 규격 — M2_GEOM 병합 전후 실측으로 확정 [코드확인]
`_backup/part04.pre-geom-rewrite.6a63ee99.json`(병합 전) ↔ 현재 part04 를 **140종 필드별 대조**한 결과:

| 처리 | 필드 | 변경 건수 |
|---|---|---|
| **교체(10)** | problem_nature · required_thinking · must_write_steps · common_wrong_actions · error_checkpoints · student_command · teacher_note · parent_message | **140/140** |
| | matched_template_id → **null** · match_score → **null** | **140/140** |
| **보존(12)** | grade · course · unit_id · unit_name · type_name · visible_path · taxonomy_levels · concept_ids · **error_tags** · default_difficulty · source_orders · raw_section_id | **0/140** |
| **추가(3)** | draft=true · revision=1 · observed_basis | 신규 |

⇒ 병합 전 23필드 → 병합 후 **26필드**.

### 규격 확정 사항
1. **`error_tags`는 보존**한다. M2_GEOM은 기존 주제형 태그(`angle_relation` 등)를 **그대로 두었다**(0/140 변경). overlay의 오류형 태그는 **`error_checkpoints[].error_code`로만** 쓴다.
   - ★닮음(M2_SIMPY)은 **신설**이라 원본 error_tags가 없어 overlay를 넣었다. **교체 단원에서는 다른 규칙**임에 주의.
2. **`matched_template_id`·`match_score`는 전건 null로 교체**한다. 게이트 해제(`no_template_units` 제거)와 **별개 조치**이며 둘 다 필요하다.
3. **`draft`·`revision`·`observed_basis` 3필드를 추가**한다. `observed_basis`는 그 유형의 overlay 태그 보유 여부로 결정(수연산은 34~44%라 **true/false 혼재**가 정상 — 닮음의 전건 true와 다름).
4. **`concept_ids`는 보존**한다(닮음은 신설이라 생략했으나, 교체 단원은 기존 값이 있으므로 삭제하지 않는다 — 삭제는 데이터 손실).

### 스키마 불일치 여부 [코드확인]
- 현재 instruction_map 12,610 엔트리 필드셋 분포: **12,383 × 23필드(3필드 없음)** · **140 × 26필드(M2_GEOM)** · **87 × 23필드(M2_SIMPY, 3필드 있고 concept_ids 등 3필드 없음)**.
- **엔진·렌더러·워커 어디에도 `draft`·`revision`·`observed_basis`를 읽는 코드가 없다**(assets grep 0건, 워커의 `draft`는 AI 구조화 지역변수로 무관).
- ⇒ **필드 추가는 무해**. 필드 없는 엔트리 12,383건과 동작이 갈리지 않는다. checkpoint 필드명 확인과 동일한 방식으로 코드로 확인함.

## 4. 진행 방식 (검수 지시 반영)
- **tier 방침은 사전에 정하지 않는다.** 첫 배치(**10종 이하**)를 tier 우선순위대로 저작하고 **tier-1/2/3/신설 분포를 실측 보고** → 그 수치로 방침 결정.
- tier 순서 = ① 자기 overlay → ② 단원 overlay 풀(M2_NE 71 / M3_REAL 89) → ③ `TAG_DICTIONARY_v2` 163종 → ④ 신설.
- ★**신설 상한 = 40종**(414의 약 10%). M2_GEOM은 140종에서 신설 8종(5.7%)이었다. **40종을 넘으면 즉시 중간 보고** — 사전·overlay 조회가 부실하다는 신호일 수 있음.
- 배치 = 개념 단위 경계 · 커밋 12종 이하 · 롤링 백업 lastgood · label_map 대조 상시.
- 검증 세트(닮음 승계) + **U+FFFD 스캔 상시**(§7 신규 규칙) + `_meta` 편집은 `edit_json_meta.ps1` 경유.

## 5. 관측 커버리지 ↔ 신설률 (검수 기록 · 414 완료 시 갱신)
| 단원 | overlay 커버리지 | 신설 | 갭 |
|---|---|---|---|
| 닮음 M2_SIMPY | 87/87 = **100%** | 0 | 0 (구조적) |
| M3_REAL_NUMBER_CALC | 89/203 = 44% | (예정) | (예정) |
| M2_NUMBER_EXPRESSION | 71/211 = 34% | (예정) | (예정) |
| M2_GEOM | 27/140 = **19%** | 8 | 5 |
| M1 기하 · 수연산 4단원 | **0%** | — | 재태깅 필요 |

★414종 저작으로 **중간 커버리지(34·44%) 구간의 신설률**이 처음 관측된다. M1 재태깅 우선순위 판단 근거가 되므로 최종 제출 시 이 표를 갱신한다.

## 6. 착수 대기 = 검수 규격 승인
위 §3 교체 규격(특히 error_tags 보존 · matched_template_id null · observed_basis 혼재)에 대한 확인이 오면 첫 배치 10종을 저작해 tier 분포를 보고한다.
