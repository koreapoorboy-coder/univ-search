# 닮음(M2_SIMPY) 처방 87종 — 최종 제출 v1 (2026-08-16)

> 🔴🔴 **2026-08-20 상태 정정 (검수 판정 10차 §7-③).** 이 문서의 "87종 완결 · 커버리지 100% · 게이트 해제" 서술은 **정식 종수의 일부 위에서** 성립한 것이다.
> ```
> ✕ 닮음 87종 완성 · 게이트 해제됨
> ○ 닮음 부분 카탈로그(87/177) 기준 87종 · 문항 34% 배정 재검토 필요 · 정식 빌드 미완
> ```
> 카탈로그 `m2_similarity_pythagoras.problem_types.v1.json` = type_variant_bank 조립본(87), 정식 = 177(59 base × 3칸). 2026-08-20 `type_name_source: variant_bank` 표식 추가(87/87).
> **§4 "overlay 87/87 = 100%"를 M1 재태깅 비교표의 끝점으로 인용하지 말 것**(§5 판정으로 끝점에서 제외). 사유·복원안(D안) = `HANDOFF_B_CATALOG_TRUNCATION.v1.md`.

> 검수 확정 요건 11항목 순서 그대로. 정본 = `tools/axis_prediction/m2_simpy_prescriptions.draft.v1.json`.
> 배치 이력: 배치1(6) → B2(10) → B3(7) → B4(8) → B5(7) → B6(4) → B7(6) → B8(11) → B9(9) → B10(8) → B11(11) = **87**.
> 커밋: df577e82 · 8a18c2f0 · e682968a · 7f6e864d · c6579052 · e4ae9182 · 8888cddd · fb92b7e2 · 27b0853d (전부 push 확인).

---

## 1. 전체 검증 수치 [실측]
| 항목 | 결과 |
|---|---|
| JSON 파싱 | OK |
| 엔트리 수 | **87** — 배치계획(`B_similarity_prescription_batch_plan.v1.md`)과 정확 일치, 누락·초과 0 |
| 13필드 완비 | OK (누락 0 · 규격 외 필드 0) |
| checkpoint 분포 | **1개 2종 · 2개 22종 · 3개 36종 · 4개 27종** (상한 4 준수, 0-cp 0) |
| checkpoint 필드조합 | 전건 `error_code · label · diagnosis · student_fix` (정본 스키마) |
| nonnull(matched_template_id·match_score) | **0** (전건 null) |
| category_ledger 합 | **87 = 엔트리 수** (중복 0, 14 카테고리) |
| concept_map 커버 | **87** (중복 0, 47 개념) |
| label_map 일관성 | 전건 일치 (34종 등록) |

## 2. tier 분해 [실측]
```
tier-1 (자기 유형 overlay)                262
tier-2 (단원 overlay 87)                    0
tier-3 (dict v2 §5닮음13 + §2도형공통32)     0
tier-4 (신설)                               0
```
사용된 error_code **262개 전부 tier-1**. 규격 §4의 "overlay 100%라 신설 거의 0이 정상"을 87종 전량에서 확인.

**정합**: overlay 총 태그 **279 = 채택 262 + 절삭 17**.

## 3. gaps 구조적 0 + M2_GEOM 대비
**결과: `predicted_observed_gaps` = 0. (a) 수집했고 결과가 0이며, 그 0은 구조적으로 강제된 값.**

1. M2_GEOM 정본 기준 = "**예측층 유형(observed_basis:false)** 에 배치한 error_code 중 같은 개념의 관측 유형 태그 합집합에 없는 것"만 갭으로 기록.
2. M2_SIMPY는 **overlay 87/87 → observed_basis 전건 true → 예측층 유형 0개** → 갭 판정의 입력이 존재하지 않음.
3. 사용된 262개가 전부 tier-1이라 "관측에 없는 코드"가 원리상 발생 불가.

| | M2_GEOM | M2_SIMPY(닮음) |
|---|---|---|
| overlay 커버리지 | **27/140 = 19%** | **87/87 = 100%** |
| 예측층 유형(observed_basis false) | 존재 | **0** |
| predicted_observed_gaps | **5건**(전역부재 2 · 개념국소 3) | **0** (구조적) |
| 첫 배치 재사용률 | 43% | **tier-1 100%** |
| 신설 태그 | 8종 | **0** |

★ **"overlay 커버리지 100% 단원은 예측·관측 갭이 구조적으로 발생하지 않는다"** — 이것이 이 단원의 주 산출입니다. 뒤집으면 **갭 발견은 커버리지가 낮은 단원에서만 가능**하며, 이는 **M1 재태깅(overlay 부재 192종)의 가치를 뒷받침**합니다.

★부수 발견 [코드확인]: 배치1 `_meta.gaps_criterion` 문구("예측 유형어 regex 발화 vs overlay 관측")는 **태그 수준에서 실행 불가**. `axis_rules.v44.json`은 `domain.<key>.rules[].axes`로 **17축(A1~E3)만 예측**하며 fine error_code를 예측하지 않습니다. 축 수준 대조는 별도 트랙(D2 갭 계열) 소관. 문구는 정본 기준으로 교체하고 사유를 `gaps_measured.criterion_text_correction`에 보존했습니다.

## 4. label_map — 전량 **58종** (등록 58 = 사용 58, 미등록 사용 0 · 등록 후 미사용 0)
아래는 B1~B8 누계 34종이며, B9~B11에서 추가된 24종을 포함한 **전량 58종은 `_meta.label_map`에 수록**되어 있습니다(첨부 JSON 참조).
```
similar_triangle_correspondence_setup_failure        닮은 삼각형 대응 세우기 실패
segment_ratio_to_length_conversion_failure           선분비→길이 환산 실패
multi_triangle_length_chain_failure                  다중 삼각형 길이 연결 실패
three_dimensional_length_reduction_failure           입체 길이 환원 실패
law_selection_error                                  적용 정리 선택 오류
multi_constraint_intersection_failure                복수 조건 교집합 실패
angle_correspondence_chain_failure                   각 대응 연결 실패
composite_path_length_decomposition_failure          복합 경로 길이 분해 실패
parallel_line_angle_transfer_failure                 평행선 각 전이 실패
midpoint_length_relation_error                       중점 길이 관계 오류
midpoint_area_fraction_relation_misapplied           중점 넓이 분수 관계 오적용
shared_altitude_length_chain_failure                 공통 높이 길이 연결 실패
area_decomposition_equation_setup_failure            넓이 분해 식 세우기 실패
centroid_two_to_one_ratio_confusion                  무게중심 2:1 비율 혼동
segment_partition_tracking_failure                   선분 분할 추적 실패
multiple_answer_omission                             복수 정답 누락
area_formula_setup_error                             넓이 공식 세우기 오류
area_ratio_from_similarity_failure                   닮음비→넓이비 전환 실패
right_triangle_altitude_geometric_mean_failure       직각삼각형 수선 비례중항 실패
paper_fold_reflection_distance_mapping_failure       종이접기 대응 길이 매핑 실패
ratio_setup_from_geometry_failure                    도형에서 비 세우기 실패
parallelism_converse_ratio_test_failure              평행 역판정 비 검사 실패
nested_fraction_simplification_failure               겹친 분수 정리 실패
trapezoid_linear_interpolation_failure               사다리꼴 선형보간 실패
pattern_extraction_failure                           규칙 추출 실패
angle_bisector_side_ratio_setup_failure              각의 이등분선 변비 세우기 실패
same_altitude_area_ratio_transfer_failure            같은 높이 넓이비 전이 실패
composite_area_subtraction_failure                   복합 넓이 빼기 실패
equal_tangent_segment_relation_misapplied            접선 길이 같음 오적용
difference_direction_error                           차의 방향 오류
final_form_reduction_omitted                         최종형 정리 누락
multi_expression_dependency_error                    다중 식 의존 처리 오류
trapezoid_midsegment_average_error                   사다리꼴 중점연결 평균 오류
centroid_area_partition_failure                      무게중심 넓이 분할 실패
```
B9~B11 추가분 24종: `area_ratio_to_side_ratio_conversion_failure`(넓이비→변비 역환산 실패) · `answer_format_mismatch`(답 형식 불일치) · `percentage_scale_factor_conversion_error`(백분율·축척 환산 오류) · `volume_from_ratio_error`(부피비 적용 오류) · `multi_step_composite_error`(다단계 복합 처리 오류) · `subtraction_of_regions_omitted`(영역 빼기 누락) · `ratio_direction_inversion`(비 방향 뒤집음) · `unit_conversion_omitted`(단위 환산 누락) · `multi_stage_motion_distance_setup_failure`(다단계 이동 거리 세우기 실패) · `pythagorean_setup_failure`(피타고라스 식 세우기 실패) · `variable_length_assignment_failure`(미지 길이 설정 실패) · `radical_ratio_simplification_error`(무리수 비 정리 오류) · `tangent_radius_perpendicularity_omitted`(접선·반지름 수직 누락) · `auxiliary_line_construction_failure`(보조선 작도 실패) · `isosceles_altitude_bisection_overlooked`(이등변삼각형 높이 이등분 간과) · `central_angle_to_arc_ratio_failure`(중심각→호 비 연결 실패) · `pythagorean_converse_condition_failure`(피타고라스 역 조건 판정 실패) · `trig_ratio_side_role_confusion`(변의 역할 혼동) · `inequality_bound_conversion_error`(부등식 경계 변환 오류) · `area_inradius_relation_setup_failure`(넓이·내접원 반지름 관계 세우기 실패) · `right_triangle_tangent_partition_failure`(직각삼각형 접선 분할 실패) · `cylinder_unfolding_wrap_count_failure`(원기둥 전개 감김 횟수 오류) · `developed_surface_base_circumference_mapping_failure`(전개도 밑면 둘레 대응 실패) · `spatial_cross_section_identification_failure`(공간 단면 식별 실패)

## 5. trimmed_checkpoints 전량(12건) + 미사용 overlay 목록
| # | 유형 | overlay→cp | 탈락 태그 | 타 유형 채택 |
|---|---|---|---|---|
| 1 | PT105 | 5→4 | segment_partition_tracking_failure | ✅ |
| 2 | PT083 | 5→4 | segment_partition_tracking_failure | ✅ |
| 3 | PT128 | 5→4 | area_ratio_from_similarity_failure | ✅ (같은 개념 PT127) |
| 4 | PT148 | 5→4 | multi_stage_motion_distance_setup_failure | ✅ (같은 개념 PT149) |
| 5 | PT149 | 5→4 | similar_triangle_correspondence_setup_failure | ✅ |
| 6 | PT152 | 6→4 | angle_bisector_side_ratio_setup_failure, centroid_two_to_one_ratio_confusion | ✅✅ |
| 7 | PT158 | 6→4 | similar_triangle_correspondence_setup_failure, segment_partition_tracking_failure | ✅✅ |
| 8 | PT159 | 7→4 | 위 둘 + area_formula_setup_error | ✅✅✅ |
| 9 | PT166 | 6→4 | area_formula_setup_error, answer_format_mismatch | ✅✅ |
| 10 | PT167 | 5→4 | answer_format_mismatch | ✅ |
| 11 | PT171 | 5→4 | segment_partition_tracking_failure | ✅ |
| 12 | PT174 | 5→4 | similar_triangle_correspondence_setup_failure | ✅ |

### ★미사용 overlay 태그 = **0건 (유지)**
overlay distinct **58종 전부 최소 1회 채택**. 절삭 17건이 모두 다른 유형에서 채택되었기 때문이며, PT148처럼 **탈락 시 미사용이 될 태그는 같은 개념의 다른 유형에서 채택하도록 배치**한 결과입니다(우연 아님). 검증 스크립트 항목 14(미사용 overlay ↔ 절삭기록 정합)로 기계 보증.

## 6. tier1_atypical 전량 (2건 · 판정 보류)
| 유형 | 이질 태그 | 이질 사유 | 단원 빈도 | 처리 |
|---|---|---|---|---|
| PT054 (내각 이등분선·복합) | `equal_tangent_segment_relation_misapplied` | 접선 길이 성질 = **원 단원 어휘** | 1 | tier-1 채택, "한 점에서 그은 두 접선만 같다"의 오적용 지점으로 구성 |
| PT152 (피타고라스로 변 구하기) | `tangent_radius_perpendicularity_omitted` | 접선⊥반지름 = **원 단원 어휘** | 1 | tier-1 채택(탈락 시 미사용 1호가 됨), 직각삼각형을 못 만드는 지점으로 구성 |

★**사실 기록**: 두 사례 모두 **원 계열 태그**입니다. M2_SIMPY overlay에 원 어휘가 섞인 경위는 **미확인** — 판정하지 않습니다.

## 7. frequent_deprioritized_tags — 탈락/출현 비율 [실측]
| 태그 | 탈락 | 단원 출현 | 비율 | 채택 |
|---|---|---|---|---|
| segment_partition_tracking_failure | 5 | 21 | **24%** | 16 |
| similar_triangle_correspondence_setup_failure | 4 | 32 | **13%** | 28 |
| area_formula_setup_error | 2 | 13 | **15%** | 11 |
| answer_format_mismatch | 2 | 4 | **50%** | 2 |
| multi_stage_motion_distance_setup_failure | 1 | 2 | **50%** | 1 |
| centroid_two_to_one_ratio_confusion | 1 | 12 | 8% | 11 |
| angle_bisector_side_ratio_setup_failure | 1 | 10 | 10% | 9 |
| area_ratio_from_similarity_failure | 1 | 9 | 11% | 8 |

두 해석((가) 범용이라 핵심 아님 / (나) overlay 과다 부여)은 현 데이터로 구분 불가 — **판정 보류, 목록만**. M2_GEOM `gaps_excluded` (b) "편재 태그"와 같은 계열.

## 8. overlay 1종 유형 목록 ★
| 유형 | 유형명 | 유일 태그 |
|---|---|---|
| PT133 | 닮은 평면도형 넓이비의 활용 - 개념·조건 판별 | `area_ratio_from_similarity_failure` |
| PT169 | 평면도형에서 피타고라스 정리의 활용 - 개념·조건 판별 | `pythagorean_setup_failure` |

checkpoint 1개는 **cp 하한 위반이 아니라 관측 어휘가 얇은 것**입니다. 임의 추가하지 않았습니다(tier-1 충실). **관측 보강 대상**으로 표기.

## 9. observed_basis 전건 true — 확인
**87/87 `observed_basis: true`** [실측]. 근거 = overlay 87/87 태그 보유(빈 배열 0 · 총 279 · 평균 3.2). `draft: true` · `revision: 1` 도 전건.

## 10. instruction_map 엔트리 87 신설 계획
**규격 = `B_similarity_prescription_prep.v1.md` §1·§3 (승인분).**

**필드 출처**
| 필드 | 출처 |
|---|---|
| problem_type_id·grade·unit_id·unit_name·type_name | M2_SIMPY 카탈로그 그대로 |
| course | `index.v1.json` = "중학수학 2" (카탈로그에 없음) |
| default_difficulty | 카탈로그 빈값 → 기본 `core` |
| visible_path·taxonomy_levels | 파생(단순형 strand=sub_strand=type_name) |
| error_tags | overlay `pt_fine_error_tags` |
| 8 처방 필드 | 본 저작분 |
| matched_template_id·match_score | null |
| draft·revision·observed_basis | true·1·true |
| **concept_ids** | ★**생략** — 런타임 조인(단일 진실원), 엔진 미참조 [코드확인] |
| **source_orders·raw_section_id** | ★**생략** — M2_SIMPY 카탈로그에 없음 |

**part04 append**: 2023 → **2110** 엔트리 (+87 × ~3.2KB ≈ +280KB → 약 6.5MB, 25MB 이내). 새 part 불요.
**매니페스트 갱신**(`problem_type_instruction_map.v1.json`): part04 `instruction_count` 2023→2110 · `instruction_end_index` 12522→12609 · 최상위 `instruction_total_count`/`problem_type_count` 12523→**12610** · `source_problem_type_files`에 `m2_similarity_pythagoras.problem_types.v1.json` 추가.
**병합 방식**: M2_GEOM 서지컬 기법 재사용(`scratchpad/merge_part04.ps1` · `verify_merge.ps1`) — 텍스트 서지컬 삽입, 타 엔트리 무변경.
**백업**: 병합 전 `_backup/part04.pre-simpy-append.<sha>.json` 생성.

## 11. 병합 후 검증 계획
1. **JSON 파싱** + **총수**: part04 엔트리 = **2110**, 4파트 합 = **12610**, 매니페스트 값과 일치.
2. **M2_GEOM 140 무변경**: 병합 전후 part04에서 `M2_GEOM_*` 엔트리 140개의 **직렬화 문자열 해시 대조**(1건이라도 다르면 실패).
3. **타 단원 1883 무변경**: 같은 방식으로 M2_GEOM·M2_SIMPY 외 전 엔트리 해시 대조.
4. **신설 87 존재·필드 완비**: 87개 id 존재 · 26필드 규격(생략 필드 제외) · checkpoint 필드조합 정본.
5. **중복 id 0**: 4파트 전체에서 `M2_SIMPY_PT*` id 중복 없음.
6. **게이트 해제**: `template_unit_map.v1.json` no_template_units에서 `M2_SIMILARITY_PYTHAGOROUS` 아닌 정확 문자열 `M2_SIMILARITY_PYTHAGORAS` 제거 → 12단원 → **11단원**.
7. **실사용 대조**: 닮음 답안이 생길 때(백로그 동일, 보류). M2_GEOM처럼 `suppressed_reason` 소멸·8필드 렌더 확인.

---

### 다음 착수 대기
병합·게이트 해제는 **검수 승인 후** 진행합니다(part04는 §6 손대지 말 것 대상 — 재편집 금지, 서지컬 병합만).
