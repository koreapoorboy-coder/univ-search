# Tagging QA Report - Similarity of Figures (3) v4

- Specification: `SPEC_tagging_v4.md`
- Dictionary: `TAG_DICTIONARY_v1.md` + user corrections in this conversation
- Source PDF: `260711_도형의 닮음(3).pdf`
- Types: **67**
- Items: **150**
- Unique error tags: **52**
- Reused dictionary tags: **39**
- New tags: **13**
- Dictionary reuse rate: **75.0%**
- Tags reused across 2+ types inside this PDF: **29**

## User dictionary corrections applied

- [PASS] Ignored the incorrect `special_angle_side_ratio_direction_error -> ratio_direction_inversion` row; canonicalized that concept to `trig_ratio_side_role_confusion` if encountered.
- [PASS] Did **not** merge `area_ratio_to_side_ratio_conversion_failure` into `area_ratio_from_similarity_failure`; it remains a distinct existing dictionary tag and is used in the surface-area-ratio type.

## v4 dictionary-first consolidation

- v3 unique tags: **152**
- v4 unique tags: **52**
- Existing dictionary reuse: **39**
- Legitimately new: **13**
- The v3 one-off synonyms for auxiliary lines, Pythagorean setup, area decomposition, similarity area conversion, unit conversion, and answer finalization were collapsed to dictionary canonical names.

## Answer-finalization / verification scan

- Verification errors: **0 types** after a separate backward-check scan.
- Answer-finalization types: **28, 44, 46, 60, 65**.
- Q60: `final_form_reduction_omitted` (coprime p,q before p+q).
- Q99: `answer_format_mismatch` (count, not raw volume/value).
- Q103-Q104: `unit_conversion_omitted` (map scale / distance-time units).
- Q131-Q132: `answer_format_mismatch` (sum all feasible natural-number candidates).
- Q144: `multiple_answer_omission` (multiple-select completion).

## Mandatory self-check

- [PASS] `item_no_continuous_1_to_150`
- [PASS] `items_sum_equals_n_items`
- [PASS] `type_item_counts_match_ranges`
- [PASS] `all_accuracy_integer_0_to_100`
- [PASS] `all_tags_snake_case`
- [PASS] `no_korean_in_tags`
- [PASS] `type_tag_count_2_to_3`
- [PASS] `no_duplicate_tags_within_type`
- [PASS] `new_tags_complete`
- [PASS] `new_tags_not_in_dictionary`
- [PASS] `reused_tags_in_dictionary`
- [PASS] `reuse_rate_at_least_20pct`
- [PASS] `tag_scope_keys_exist_in_tags`
- [PASS] `tag_scope_items_inside_type_range`
- [PASS] `verification_scan_checked`
- [PASS] `user_override_special_angle_mapping_applied`
- [PASS] `user_override_area_ratio_kept_distinct`
- [PASS] `invalid_dictionary_aliases_not_used`

## New tags

- `angle_bisector_side_ratio_setup_failure` - 사전에 각의 이등분선 정리로 맞은편 변의 분할비를 세우는 오류가 없어 별도 유지했다.
- `centroid_area_partition_failure` - 사전에 무게중심이 만드는 넓이 분할을 직접 진단하는 태그가 없어 별도 유지했다.
- `centroid_two_to_one_ratio_confusion` - 사전에 무게중심의 중선 2:1 분할비 자체를 혼동하는 오류가 없어 별도 유지했다.
- `cylinder_unfolding_wrap_count_failure` - 원기둥을 여러 바퀴 감은 횟수를 전개도 가로 길이에 반영하는 오류가 사전에 없다.
- `developed_surface_base_circumference_mapping_failure` - 회전체 전개도에서 옆면의 대응 길이(부채꼴 호 또는 전개 직사각형 가로)를 밑면 원의 둘레와 연결하는 오류가 사전에 없다.
- `isosceles_altitude_bisection_overlooked` - 이등변삼각형의 꼭짓점 높이가 밑변을 이등분한다는 조건 누락은 기존 각 연쇄 태그와 다르다.
- `paper_fold_reflection_distance_mapping_failure` - 종이접기에서 접기 전후 대응점의 등거리 관계를 원래 도형 길이로 되돌리는 오류가 사전에 없다.
- `parallelism_converse_ratio_test_failure` - 선분비의 일치로 평행을 역판정하는 오류는 평행선 각 전달 실패와 다른 역조건 판정이다.
- `percentage_scale_factor_conversion_error` - 125% 같은 퍼센트 확대율을 선형 배율로 바꾸는 오류가 기존 넓이비 태그와 구분된다.
- `pythagorean_converse_condition_failure` - 세 변의 길이로 직각삼각형 여부를 판정하는 피타고라스 역정리 오류가 사전에 없다.
- `same_altitude_area_ratio_transfer_failure` - 같은 높이를 공유하는 삼각형의 밑변비를 넓이비로 옮기는 오류가 기존 닮음 넓이비 태그와 다르다.
- `trapezoid_linear_interpolation_failure` - 사다리꼴의 평행 단면 길이가 위치에 따라 선형 변화하는 관계를 적용하는 오류가 사전에 없다.
- `trapezoid_midsegment_average_error` - 사다리꼴 중점연결선 길이가 두 밑변 평균이라는 공식을 잘못 적용하는 오류가 사전에 없다.

## Result

**PASS - SPEC_tagging_v4 + corrected dictionary mapping applied.**
