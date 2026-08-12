# 누적 태그 사전 v2

이미 확정된 태그 목록입니다. **새 태그를 만들기 전에 반드시 여기서 먼저 찾으십시오.**

- 출처: 수와 식(5) · 원의 성질(12) · 원의 성질(6) · 삼각비(6) · 도형의 닮음(3)
- 도형 계열 **131종**을 §1~§5에 정리했습니다. 대수 계열은 §6에 주요 항목만 둡니다.

> **v2 변경점**
> - 도형의 닮음(3) 신규 13종 추가 (§5 신설)
> - 삼각비 통합 8건 확정 반영 — v1의 §4 중복표를 정리했습니다
> - **v1의 오류 2건 정정** — 아래 표의 두 줄은 v1에서 잘못 지시한 것입니다
>
> | v1의 잘못된 지시 | v2 정정 |
> |---|---|
> | `special_angle_side_ratio_direction_error` → `ratio_direction_inversion` | **틀림.** 정본은 `trig_ratio_side_role_confusion` |
> | `area_ratio_to_side_ratio_conversion_failure` → `area_ratio_from_similarity_failure` | **틀림.** 중복 아님. 별개 태그로 유지 |

---

## 1. 범용 — 단원 무관하게 나옴

어느 단원에서든 이 오류가 있으면 **반드시 이 이름을 쓰십시오. 새로 만들지 마십시오.**

| 태그 | 뜻 |
|---|---|
| `answer_format_mismatch` | 요구된 형식으로 답하지 않음 (a+bπ에서 a+b, 개수를 묻는데 값 등) |
| `final_form_reduction_omitted` | 기약분수·최simplest 형태로 마무리 안 함 |
| `rounding_instruction_overlooked` | 반올림·자릿수 지시를 놓침 |
| `ratio_direction_inversion` | 답의 "몇 배" 방향을 거꾸로 |
| `unit_conversion_omitted` | 단위 변환 안 함 (m↔km, 축척, 시간) |
| `verification_missing` | 검산 자체를 안 함 |
| `solution_check_omitted` | 구한 해를 원식에 되돌려 확인 안 함 |
| `multiple_answer_omission` | 정답이 여럿인데 하나만 |
| `extremum_selection_error` | 최대·최소 고르기에서 틀림 |
| `range_constraint_dropped` | 범위 조건을 도중에 놓침 |
| `multi_constraint_intersection_failure` | 여러 조건의 교집합을 빠짐없이 못 셈 |
| `multi_step_composite_error` | 같은 조작을 여러 겹 쌓을 때 무너짐 |
| `difference_direction_error` | 차이의 방향(어느 쪽에서 빼는지)을 뒤집음 |

## 2. 도형 공통 — 원·삼각비·닮음 어디서든

**이 구역을 가장 먼저 확인하십시오.** 도형 단원의 새 태그 대부분이 여기 이미 있습니다.

| 태그 | 뜻 |
|---|---|
| `auxiliary_line_construction_failure` | 보조선을 스스로 못 그음 — **수선·평행선·대각선·보조삼각형 전부 포함** |
| `similar_triangle_correspondence_setup_failure` | 닮음 대응을 못 세우거나 유지 못 함 |
| `area_ratio_from_similarity_failure` | 닮음의 **길이비 → 넓이비** (제곱) |
| `area_ratio_to_side_ratio_conversion_failure` | **넓이비 → 길이비** (제곱근). 위와 역방향, 별개 태그 |
| `pythagorean_setup_failure` | 피타고라스를 쓸 직각삼각형을 못 만듦 |
| `angle_correspondence_chain_failure` | 각 대응을 연쇄로 따라가지 못함 |
| `isosceles_triangle_angle_chain_failure` | 이등변삼각형 밑각 연쇄 실패 |
| `parallel_line_angle_transfer_failure` | 평행선에서 각 전달 실패 |
| `collinear_supplementary_angle_chain_error` | 일직선 보각 연쇄 오류 |
| `segment_partition_tracking_failure` | 분할된 선분을 식으로 추적 실패 |
| `segment_ratio_to_length_conversion_failure` | 선분비를 실제 길이로 못 바꿈 |
| `ratio_setup_from_geometry_failure` | 도형에서 비례식 자체를 못 세움 |
| `composite_area_subtraction_failure` | 전체에서 부분 빼기를 못 함 |
| `subtraction_of_regions_omitted` | 영역 빼기를 아예 빠뜨림 |
| `composite_path_length_decomposition_failure` | 복합 경로를 구간으로 분해 실패 |
| `area_decomposition_equation_setup_failure` | 넓이를 분해해 식으로 세우기 실패 |
| `area_formula_setup_error` | 넓이 공식 설정 오류 |
| `variable_length_assignment_failure` | 미지 길이를 문자로 놓는 데서 실패 |
| `multi_triangle_length_chain_failure` | 여러 삼각형에 걸친 길이 연쇄 실패 |
| `shared_altitude_length_chain_failure` | 공통 높이를 매개로 한 길이 연쇄 실패 |
| `right_triangle_altitude_geometric_mean_failure` | 직각삼각형 높이의 기하평균 관계 실패 |
| `midpoint_length_relation_error` | 중점이 만드는 길이 관계 오류 |
| `midpoint_area_fraction_relation_misapplied` | 중점이 만드는 넓이 분수 관계 오적용 |
| `maximum_area_condition_overlooked` | 넓이 최대 조건을 못 봄 |
| `multi_stage_motion_distance_setup_failure` | 다단계 이동 거리식 설정 실패 |
| `rectangle_side_partition_setup_failure` | 직사각형 변을 분할해 식으로 표현 실패 |
| `right_triangle_trig_setup_failure` | 직각삼각형에서 삼각비 설정 실패 |
| `derived_right_triangle_equation_error` | 유도한 직각삼각형 방정식 오류 |
| `radius_offset_equation_setup_error` | 반지름 오프셋 식 세우기 실패 |
| `volume_from_ratio_error` | 비에서 부피를 구하는 데서 실패 |
| `three_dimensional_length_reduction_failure` | 공간 → 평면으로 길이 축소 실패 |
| `radical_ratio_simplification_error` | 근호가 든 비의 정리 오류 |

## 3. 원 전용

| 태그 | 뜻 |
|---|---|
| `central_inscribed_angle_factor_confusion` | 중심각 = 2×원주각 배수 혼동 |
| `same_arc_inscribed_angle_matching_failure` | 같은 호의 원주각 일치를 못 짚음 |
| `central_angle_to_arc_ratio_failure` | 중심각↔호 비례 변환 실패 |
| `equal_arc_angle_transfer_failure` | 같은 호에서 각 전달 실패 |
| `cyclic_opposite_angle_supplement_error` | 내접사각형 대각 합 180° 적용 오류 |
| `cyclic_exterior_angle_equivalence_failure` | 외각 = 맞은편 내각 적용 실패 |
| `cyclicity_converse_angle_condition_failure` | 공원성 역조건 판정 실패 |
| `supplementary_angle_cyclicity_check_error` | 대각 합으로 공원성 판정 오류 |
| `auxiliary_cyclic_quadrilateral_detection_failure` | 숨은 내접사각형 탐지 실패 |
| `tangent_chord_angle_transfer_failure` | 접선-현 각을 원주각으로 전달 실패 |
| `equal_tangent_segment_relation_misapplied` | 한 점에서 그은 두 접선 길이 같음 오적용 |
| `tangent_radius_perpendicularity_omitted` | 접선⊥반지름 조건 누락 |
| `diameter_right_angle_condition_omitted` | 지름 → 90° 조건 누락 |
| `diameter_chord_relation_misapplied` | 지름-현 관계 오적용 |
| `diameter_pairing_failure` | 지름을 이루는 끝점 짝짓기 실패 (경유 단계) |
| `diameter_pair_counting_error` | 지름 되는 점쌍 세기 오류 (개수가 답) |
| `chord_midpoint_from_center_perpendicular_omitted` | 중심에서 현에 내린 수선이 이등분함을 누락 |
| `equal_distance_chord_equivalence_misapplied` | 중심에서 등거리 현은 길이가 같음 오적용 |
| `intersecting_chord_angle_relation_misapplied` | 두 현이 만드는 각 관계 오적용 |
| `intersecting_secant_arc_relation_error` | 두 할선의 각-호 관계 오류 |
| `two_tangent_central_angle_relation_misapplied` | 두 접선과 중심각 관계 오적용 |
| `overlapping_circle_angle_transfer_failure` | 두 원 사이 각 전달 실패 |
| `shared_chord_angle_transfer_between_circles_failure` | 공통현 각을 원 사이로 전달 실패 |
| `auxiliary_circle_construction_failure` | 보조 원 작도 실패 |
| `multi_circle_length_dependency_tracking_failure` | 여러 원의 길이 의존 연쇄 추적 실패 |
| `multi_circle_radius_dependency_failure` | 여러 원의 반지름 의존 연쇄 실패 |
| `nested_circle_radius_relation_setup_failure` | 내접·외접 원 반지름 관계식 실패 |
| `moving_point_angle_transfer_failure` | 움직이는 점에서 각 전달 실패 |
| `regular_spacing_arc_count_error` | 등분점에서 호 개수 세기 오류 |
| `repeated_circle_sector_decomposition_failure` | 반복 원·부채꼴 분해 실패 |
| `area_inradius_relation_setup_failure` | 넓이-내접원 반지름 관계식 실패 |
| `semiperimeter_tangent_partition_failure` | 반둘레-접점 분할 실패 |
| `right_angle_tangent_partition_failure` | 직각에서 접점 분할 실패 |
| `right_triangle_tangent_partition_failure` | 직각삼각형 내접원 접점 분할 실패 |
| `angle_bisector_chain_integration_failure` | 각 이등분 연쇄 통합 실패 |

## 4. 삼각비 전용

**v1의 중복표는 통합 완료되어 삭제했습니다.** 아래가 확정된 삼각비 태그입니다.

| 태그 | 뜻 |
|---|---|
| `trig_ratio_side_role_confusion` | 대변·인접변·빗변 역할 혼동 (특수각 변비 방향 포함) |
| `trig_table_value_selection_error` | 삼각비 표에서 값 선택 오류 |
| `special_angle_trig_value_recall_error` | 30·45·60 삼각비 값 암기 실패 |
| `special_angle_identification_from_tangent_failure` | tan 값으로 특수각 판정 실패 |
| `complementary_angle_conversion_error` | 여각 90−θ 변환 오류 |
| `obtuse_angle_supplement_conversion_error` | 둔각 → 보각 변환 오류 |
| `trig_monotonic_direction_confusion` | sin 증가·cos 감소 방향 혼동 |
| `mixed_function_ordering_failure` | 서로 다른 함수값 대소 정렬 실패 |
| `triangle_area_sine_factor_omitted` | ½ab·sinC 의 요소 누락 |
| `quadrilateral_diagonal_area_formula_factor_error` | ½d₁d₂sinθ 계수 오류 |
| `line_slope_to_trig_ratio_conversion_failure` | 기울기 → tan 변환 실패 |
| `trig_ratio_triangle_reconstruction_failure` | 삼각비에서 직각삼각형 재구성 실패 |
| `trig_expression_sign_determination_error` | 삼각식 부호 결정 오류 |
| `mixed_trig_expression_arithmetic_error` | 혼합 삼각비 산술 계산 실수 |
| `absolute_value_from_square_root_omitted` | √(u²)=\|u\| 절댓값 생략 |
| `spatial_cross_section_identification_failure` | 입체 → 평면 단면 식별 실패 |
| `oblique_section_projection_setup_failure` | 비스듬한 단면 투영 식 설정 실패 |
| `coordinate_projection_axis_confusion` | x=cos·y=sin 축 혼동 |
| `coordinate_projection_from_similarity_failure` | 닮음 → 좌표 투영 변환 실패 |
| `scaled_radius_coordinate_conversion_failure` | 반지름 배율에 맞춘 좌표 변환 실패 |
| `range_condition_branch_selection_failure` | 각 범위 조건으로 분기 선택 실패 |
| `contextual_offset_omission` | 눈높이·기준높이 보정량 누락 |
| `real_world_diagram_translation_failure` | 실상황 → 직각삼각형 번역 실패 |
| `two_angle_distance_equation_setup_failure` | 두 각의 수평거리 차 식 설정 실패 |
| `altitude_base_partition_equation_failure` | 높이·밑변 분할 식 실패 |
| `base_extension_difference_equation_failure` | 밑변 연장 차 식 실패 |
| `external_altitude_construction_failure` → **`auxiliary_line_construction_failure` 사용** | |
| `median_segment_area_setup_failure` | 중선 선분 넓이 식 설정 실패 |
| `axis_intercept_triangle_setup_failure` | 축 교점으로 삼각형 구성 실패 |
| `polygon_triangulation_area_decomposition_failure` | 다각형 삼각분할 넓이 식 실패 |
| `prism_cross_section_area_propagation_failure` | 단면 넓이 → 기둥 부피 식 실패 |
| `solid_measure_formula_selection_error` | 부피·겉넓이 공식 선택 오류 |
| `special_angle_area_height_failure` | 특수각 높이·넓이 식 실패 |
| `equilateral_area_relation_transfer_failure` | 정삼각형 넓이 관계 전달 실패 |
| `equilateral_midpoint_angle_derivation_failure` | 정삼각형 중점에서 각 유도 실패 |
| `diagonal_included_angle_derivation_failure` | 대각선 사잇각 유도 실패 |
| `symmetry_congruence_angle_transfer_failure` | 대칭·합동으로 각 전달 실패 |
| `overlapping_rotated_figure_congruence_failure` | 겹친·회전 도형에서 합동 찾기 실패 |
| `multiple_line_angle_comparison_failure` | 두 직선의 각 해석·합성 실패 |
| `multi_step_geometry_trig_transfer_failure` | 다단계 기하-삼각비 전달 실패 |
| `common_altitude_sine_ratio_transfer_failure` | 공통 높이에서 sin 비 전달 실패 |
| `circle_chord_right_triangle_integration_failure` | 원·현·직각삼각형 통합 실패 |
| `similarity_based_subtriangle_area_failure` | 닮음 기반 부분삼각형 넓이 실패 |
| `scaled_extension_area_ratio_failure` | 변 연장에서 넓이비 실패 |
| `endpoint_angle_projection_component_confusion` | 양끝각 sin/cos 성분 혼동 |
| `composite_length_accumulation_error` | 부분 길이 합산 오류 |

## 5. 닮음 — 도형의 닮음(3) 신규 13종

| 태그 | 뜻 |
|---|---|
| `centroid_two_to_one_ratio_confusion` | 무게중심의 중선 2:1 분할비 혼동 |
| `centroid_area_partition_failure` | 무게중심이 만드는 넓이 분할 실패 |
| `angle_bisector_side_ratio_setup_failure` | 각의 이등분선 정리로 변 분할비 세우기 실패 |
| `parallelism_converse_ratio_test_failure` | 선분비 일치로 평행을 역판정하는 데서 실패 |
| `pythagorean_converse_condition_failure` | 세 변 길이로 직각 판정(역정리) 실패 |
| `isosceles_altitude_bisection_overlooked` | 이등변삼각형 높이가 밑변을 이등분함을 누락 |
| `same_altitude_area_ratio_transfer_failure` | 같은 높이 삼각형의 밑변비를 넓이비로 못 옮김 |
| `trapezoid_midsegment_average_error` | 사다리꼴 중점연결선 = 두 밑변 평균 오적용 |
| `trapezoid_linear_interpolation_failure` | 사다리꼴 평행 단면 길이의 선형 변화 적용 실패 |
| `percentage_scale_factor_conversion_error` | 퍼센트 확대율(125% 등)을 선형 배율로 변환 실패 |
| `paper_fold_reflection_distance_mapping_failure` | 종이접기 대응점 등거리를 원 도형 길이로 되돌리기 실패 |
| `cylinder_unfolding_wrap_count_failure` | 원기둥 감은 횟수를 전개도 가로에 반영 실패 |
| `developed_surface_base_circumference_mapping_failure` | 전개도 옆면 길이를 밑면 둘레와 연결 실패 |

## 6. 대수 계열 — 도형에서도 나올 수 있는 것

`operation_order_violation` · `sign_propagation_error` · `parenthesis_sign_distribution_error` · `nested_bracket_order_violation` · `simplify_before_substitute_omitted` · `substitution_parenthesis_omission` · `fraction_coefficient_lcd_error` · `like_term_misgrouping` · `left_to_right_order_violation` · `operation_precedence_error` · `inverse_operation_setup_error` · `inverse_operation_sign_error` · `multi_expression_dependency_error` · `nested_fraction_simplification_failure` · `lcm_gcd_confusion` · `excluded_case_omission` · `condition_negation_error` · `negation_condition_misread` · `pattern_extraction_failure` · `inequality_bound_conversion_error` · `law_selection_error`

전체 91종은 `tagging_sooiksik5.json`의 `unique_tags`에 있습니다.

---

## 사용법

1. 오류를 판정한다
2. **§1 → §2 → 해당 단원 구역** 순으로 찾는다
3. 뜻이 같은 것이 있으면 **그 이름을 그대로 쓴다.** 더 정확한 이름이 떠올라도 쓰지 않는다
4. 없을 때만 새로 만든다
5. 새로 만든 것은 산출물의 `new_tags` 필드에 적는다

**§2를 가장 꼼꼼히 보십시오.** 도형 단원의 새 태그 대부분이 여기 이미 있습니다.
특히 `auxiliary_line_construction_failure`는 보조선의 종류(수선·평행선·대각선·보조삼각형)와 무관하게 이 하나를 씁니다.

## 실적

| 작업 | 사전 | 재사용률 |
|---|---|---|
| 삼각비(6) | 없음 | 3% |
| 도형의 닮음(3) | v1 | **75%** |

닮음(3)은 사전 없이 돌렸을 때 152종이 나왔고, 사전을 주자 52종이 됐습니다.
**같은 PDF, 같은 모델입니다.** 사전을 찾는 것이 이 작업의 절반입니다.
