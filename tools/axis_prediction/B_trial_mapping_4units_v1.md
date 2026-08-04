# 오답형 4단원 태그 → 17축 시범 매핑 v1 (trial)

근거: ① 팩 axis_rules.v44.json 4팩(EX_LE·LI_IN·SD_ST·NS_NE) why 용례로 축 의미 복원
      ② source_item_links 각 문항 first_action_hint·expected_process_stages·동시태그 (문제text 미저장 policy)
주의: 17축 정의 원문(§10~11)은 리포에 없음(검수측 보유) → 경계축(B1/C1·C3/C4·E1/E3·A2/D2)은 잠정.

## 축 조작적 정의(팩 why에서 복원)
- A1 뜻/경향 안 읽고 직관·계산부터 (상관·표준편차 직관비교)
- A2 정의·공식 암기 재생 (평균정의·편차·분산순서·지수법칙·유한소수 판정조건)
- A3 역방향·구성적 (정의를 식으로 세워 거꾸로 복원; 주어진 해에 맞추기)
- B1 상황의 관계·조건을 빠짐없이 식에 반영 (다리+기차길이, 구간조건, 계수≠0)
- B2 범위·경계 (자연수/정수 조건, 끝값 포함, 양수조건)
- B3 연산 순서·부호 규칙 처리 (곱÷ 차례, 괄호앞부호)
- B4 식 변형 방향 (÷→역수, 부등호 뒤집기, 거스름돈 방향)
- C1 활용 문장을 식으로 착수 (미지수/상수 정하기, 모델링)
- C2 용어·계수·차수 정확히 읽기 (동류항 정의, 계수/상수 구분)
- C3 규칙·정의 절차대로 / 두 단계 되돌림 (먼저 간단히 후 대입, 정의규칙 대입)
- C4 표기·형식·단위 규약 (문자표기, 표현통일, 단위맞춤)
- D1 계산 실행 슬립 (소거·정리·나머지·부호계산)
- D2 공식 선택·적용 (거리=속력×시간, a%=a/100, 지수법칙 적용, 순환소수변환)
- D3 그래프·그림에서 자료 읽어 옮기기 (산점도 축·점, 도수 읽기)
- E1 되돌려 검토/대입 검산 (원식 대입 확인, 되돌림)
- E2 결과 타당성 범위 (표준편차²=분산·음수분산 불가)  ← 4단원 태그 미사용
- E3 마무리 검증: 단위·무엇을 묻는지 확인

## m3_statistics (14종 / 150문항) — 축 5개
A1: mean_and_dispersion_relation_confusion(65), association_as_causation_error(23), correlation_direction_confusion(23)
A2: representative_value_selection_error(50), mean_formula_application_error(42), middle_position_error(12), even_count_median_error(12), mode_uniqueness_confusion(8)
D1: sum_or_count_error(42), deviation_sign_error(65), data_ordering_error(12), frequency_count_error(8)
D2: squared_deviation_or_denominator_error(65)  [분산공식 분모/제곱합]
D3: axis_or_point_reading_error(23)  [산점도]

## m2_linear_equation (21종 / 192문항) — 축 8개
D1: elimination_arithmetic_error(93), equation_normalization_error(54), equation_substitution_error(39)
E1: verification_missing(93)  [원식 대입 검산]
C1: equation_modeling_error(56), variable_definition_missing(55), relative_speed_error(26)*, total_amount_error(10)*, solute_amount_error(10)*, total_part_modeling_error(3)
B1: unit_condition_omission(55), angle_sum_relation_error(1), diagram_condition_omission(1)
D2: distance_speed_time_relation_error(26)*, concentration_amount_relation_error(10)*, percent_fraction_conversion_error(3), solution_count_misclassification(4)
C2: coefficient_ratio_error(4)+, constant_ratio_error(4)
C4+E3: unit_conversion_error(26)  [이중축]
* = C1(모델링)+D2(공식) 이중 성격  + = C2+D2

## m2_linear_inequality (35종 / 150문항) — 축 10개 (★태그-only A3)
B2: integer_answer_selection_error(49), endpoint_inclusion_error(26), boundary_equation_error(25), natural_number_count_error(12), parameter_range_error(12), integer_boundary_error(6)
B4: comparison_direction_error(37), parameter_sign_case_missing(25), inequality_direction_flip_error(20), range_transformation_error(14), inequality_direction(2)
C1: discount_rate_error(37), fixed_variable_cost_confusion(37), variable_definition_missing(12), word_problem_modeling_error(12), geometric_quantity_modeling_error(12), solute_total_confusion(12), before_after_quantity_error(12), combined_rate_error(6), time_condition_error(6), inequality_modeling(3)
B1: segment_condition_omission(13), condition_omission(12)
A3: solution_set_matching_error(25)  ★ 팩 LI_IN 미예측
D2: distance_speed_time_formula_error(13), formula_selection_error(12), concentration_formula_error(12), work_rate_reciprocal_error(6)
D1: distribution_error(6), denominator_clearing_error(6), substitution_error(1)
E1: solution_check(3), solution_set_omission(1), verification_missing(1)
C4+E3: unit_conversion_error(13)  [이중축]

## m2_number_expression (20종 / 300문항) — 축 11개
(축없음) multi_condition_overload(118)  ← 난이도/부하 서술자
B3: operation_order_error(69), bracket_sign_error(18), coefficient_sign_error(14)
E1: verification_missing(51)
D2: base_conversion_error(39), repeating_decimal_conversion_error(23), fraction_conversion_error(16)
A2: exponent_rule_confusion(39), prime_factor_2_5_confusion(28)
B1: condition_missing(28)
B2: inequality_boundary_error(23)
C2: like_term_error(18)
C4: representation_translation_error(16)
D1: cycle_length_error(16), position_modulo_error(16), exponent_subtraction_error(14), sign_error(12)
B4: division_reciprocal_error(14)
C3: substitution_before_simplification(12)

## 팩 축집합(v44 D-규칙) 대조
EX_LE : B1,B2,B3,B4,C1,C2,C3,C4,D1,D2,E1,E3 (12)
LI_IN : B1,B2,B3,B4,C1,C2,C3,C4,D1,D2,E1,E3 (12)
SD_ST : A1,A2,A3,B1,B2,B3,C2,C3,C4,D1,D2,D3,E1,E2 (14)
NS_NE : A2,A3,B1,B2,B3,B4,C1,C2,C3,C4,D1,D2,D3,E1,E3 (15)
