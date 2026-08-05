# 오답형 4단원 86태그 → 17축 재매핑 v2 (원문 §11 레이블 기준)

기준: 원문 §11 레이블 · **오류절**(해법절 아님) · 문항 stages·first_action_hint(태그 뜻의 둘째 발).
표기: `구축(v1 복원)` → **신축(원문)**. 미해소 경계(A2/D2·B1/C1)·② 항목은 **보류**(§10·v11 대기), 억지 배정 금지.
한계: 원문은 17축 뜻만 확정, 태그 386종 뜻은 이름뿐(문제 text 미저장) → 재매핑도 "태그 이름 ↔ 레이블" 대조, 한 발 뜸.

## 원문 17축 레이블 (대조 기준)
A1 의미해석없이 계산부터(암기형) · A2 공식만 기계적으로(암기형) · A3 조건 정리 안 함 · B1 조건 누락 · B2 정의역·범위 무시 · B3 경우분류 누락·중복 · B4 부호 조건 · C1 식 세우기 실패 · C2 개념 혼동 · C3 개념 분리·연결 못함 · C4 표현 변환 실패 · D1 식 조작 오류 · D2 공식 선택·대입 오류 · D3 단순 연산 실수 · E1 검산 생략 · E2 해 타당성 미확인 · E3 답 형식·단위 미확인

---

## m3_statistics (14종 / 150문항)
| 태그(문항) | 구축 → 신축 | 근거(오류절/힌트) |
|---|---|---|
| mean_and_dispersion_relation_confusion(65) | A1 → **C2** | 평균·산포도 관계 개념 혼동 |
| association_as_causation_error(23) | A1 → **C2** | 상관≠인과 개념 혼동 |
| correlation_direction_confusion(23) | A1 → **C2** | 상관 방향 개념 혼동 |
| sum_or_count_error(42) | D1 → **D3** | 총합·개수 단순 계산 슬립 |
| deviation_sign_error(65) | D1 → **D3** | 편차(변량−평균) 부호 산술 슬립(부호'조건' 아님) |
| data_ordering_error(12) | D1 → **D3** | 정렬 절차 슬립 |
| frequency_count_error(8) | D1 → **D3** | 도수 세기 슬립 |
| middle_position_error(12) | A2 → **D3** | 중앙값 위치 세기 슬립(정의 아는 전제) |
| even_count_median_error(12) | A2 → **A2** | 짝수개 중앙값 규칙 암기 |
| mode_uniqueness_confusion(8) | A2 → **C2** | 최빈값 유일성 개념 혼동 |
| axis_or_point_reading_error(23) | D3 → **C4** | 산점도 축·점 표현 변환(D3 드리프트 교정) |
| representative_value_selection_error(50) | A2 → **보류(C3/D2)** | 어느 대표값 쓸지 = 개념 분리 vs 공식 선택, 레이블 미분리 |
| mean_formula_application_error(42) | A2 → **보류(A2/D2)** | 공식 적용 = 암기 vs 대입, 146충돌 |
| squared_deviation_or_denominator_error(65) | D2 → **보류(A2/D2)** | 분산 공식 분모·제곱합 = 암기 vs 대입 |

## m2_linear_equation (21종 / 192문항)
| 태그(문항) | 구축 → 신축 | 근거 |
|---|---|---|
| elimination_arithmetic_error(93) | D1 → **D3** | 소거 중 산술 슬립(★최대 물량 D1→D3) |
| equation_normalization_error(54) | D1 → **D1** | 표준형 정리 = 식 조작(유지) |
| equation_substitution_error(39) | D1 → **D1** | 대입 정리 = 식 조작(유지) |
| verification_missing(93) | E1 → **E1** | 검산 생략(유지) |
| equation_modeling_error(56) | C1 → **C1** | 두 미지수·독립 두 식 세우기 실패 |
| variable_definition_missing(55) | C1 → **C1** | 미지수 정의 안 함 = 식세우기 착수 |
| unit_condition_omission(55) | B1 → **B1** | 단위 조건 누락 |
| distance_speed_time_relation_error(26) | D2 → **C1** | 거리=속력×시간 관계 모델링 실패 |
| unit_conversion_error(26) | C4·E3 → **C4·E3(이중)** | 단위 환산(표현변환+단위확인)·E3부착 |
| relative_speed_error(26) | C1 → **C1** | 상대속력 방향 모델링 |
| total_amount_error(10) | C1 → **C1** | 농도 전체양 모델링 |
| solute_amount_error(10) | C1 → **C1** | 용질량 모델링 |
| concentration_amount_relation_error(10) | D2 → **C1** | 농도 관계 모델링 |
| coefficient_ratio_error(4) | C2 → **C2** | 계수비 개념 |
| constant_ratio_error(4) | C2 → **C2** | 상수항비 개념 |
| solution_count_misclassification(4) | D2 → **B3** | 해 개수(한개/무수/없음) 경우분류 |
| percent_fraction_conversion_error(3) | D2 → **C4** | %↔분수 표현 변환 |
| ratio_translation_error(3) | (미등재) → **C4** | 비/분수/% 표현 통일(★승계①: v1 미등재 보정) |
| total_part_modeling_error(3) | C1 → **C1** | 전체·부분 모델링 |
| angle_sum_relation_error(1) | B1 → **C1** | 각 관계 식세우기 |
| diagram_condition_omission(1) | B1 → **B1** | 그림 조건 누락 |

## m2_linear_inequality (35종 / 150문항)
| 태그(문항) | 구축 → 신축 | 근거 |
|---|---|---|
| integer_answer_selection_error(49) | B2 → **B2** | 범위→정수 선택 |
| comparison_direction_error(37) | B4 → **B4** | 유리 비교 부등호 방향 |
| discount_rate_error(37) | C1 → **C1** | 요금제 상황 모델링 |
| fixed_variable_cost_confusion(37) | C1 → **C3** | 고정량/변동량 개념 분리 실패 |
| endpoint_inclusion_error(26) | B2 → **B2** | 끝값 포함 = 정의역·범위 |
| parameter_sign_case_missing(25) | B4 → **B3** | 문자 부호별 경우분류 누락(co-B4) |
| solution_set_matching_error(25) | A3 → **보류(A3/B3)** | ★승계③·② 재판정: 경우 나눔(B3)+주어진 해 정리(A3) |
| boundary_equation_error(25) | B2 → **B2** | 경계값 범위 |
| inequality_direction_flip_error(20) | B4 → **B4** | 음수로 나눌 때 부등호 뒤집기 = 부호 조건 |
| range_transformation_error(14) | B4 → **B4** | 범위 변형 부등호 방향 |
| segment_condition_omission(13) | B1 → **B1** | 구간 조건 누락 |
| distance_speed_time_formula_error(13) | D2 → **C1** | 거리 관계 모델링 |
| unit_conversion_error(13) | C4·E3 → **C4·E3(이중)** | 단위 환산·E3부착 |
| natural_number_count_error(12) | B2 → **B2** | 범위 내 자연수 개수 |
| formula_selection_error(12) | D2 → **D2** | 공식 선택 오류(clean D2) |
| concentration_formula_error(12) | D2 → **C1** | 농도 모델링 |
| variable_definition_missing(12) | C1 → **C1** | 미지수 정의 |
| parameter_range_error(12) | B2 → **B2** | 문자 범위 |
| word_problem_modeling_error(12) | C1 → **C1** | 문장→부등식 모델링 |
| condition_omission(12) | B1 → **B1** | 조건 누락 |
| geometric_quantity_modeling_error(12) | C1 → **C1** | 도형량 모델링 |
| solute_total_confusion(12) | C1 → **C2** | 용질/전체 개념 혼동 |
| before_after_quantity_error(12) | C1 → **C1** | 전후 양 모델링 |
| integer_boundary_error(6) | B2 → **B2** | 정수 경계 |
| combined_rate_error(6) | C1 → **C1** | 일률 합 모델링 |
| time_condition_error(6) | C1 → **C1** | 일/시간 모델링 |
| distribution_error(6) | D1 → **D1** | 분배법칙 = 식 조작 |
| denominator_clearing_error(6) | D1 → **D1** | 분모 없애기 = 식 조작 |
| work_rate_reciprocal_error(6) | D2 → **C1** | 일률 모델링 |
| inequality_modeling(3) | C1 → **C1** | 부등식 모델링 |
| solution_check(3) | E1 → **E1** | 해 검산 |
| inequality_direction(2) | B4 → **B4** | 부등호 방향 = 부호 조건 |
| solution_set_omission(1) | E1 → **E1** | 대입 확인 빠짐 |
| verification_missing(1) | E1 → **E1** | 검산 생략 |
| substitution_error(1) | D1 → **D3** | 대입 계산 슬립 |

## m2_number_expression (20종 / 300문항)
| 태그(문항) | 구축 → 신축 | 근거 |
|---|---|---|
| multi_condition_overload(118) | (축없음) → **축없음** | ★승계⑤: 난이도 서술자, 오류 유형 아님(17축 부재) |
| operation_order_error(69) | B3 → **D1** | 연산 순서 = 식 조작 순서(B3 아님) |
| verification_missing(51) | E1 → **E1** | 검산 생략 |
| base_conversion_error(39) | D2 → **C4** | 밑 통일(4=2²) 표현 변환 |
| exponent_rule_confusion(39) | A2 → **C2** | 지수법칙 개념 혼동 |
| condition_missing(28) | B1 → **B1** | 분모 소인수 조건 누락 |
| prime_factor_2_5_confusion(28) | A2 → **C2** | 유한소수 판정 개념 혼동 |
| inequality_boundary_error(23) | B2 → **B2** | 등식·부등식 경계 |
| repeating_decimal_conversion_error(23) | D2 → **C4** | 순환소수→분수 표현 변환 |
| bracket_sign_error(18) | B3 → **D1** | 괄호 앞 부호 분배 = 식 조작(pack D-NE-55 선례 D1) |
| like_term_error(18) | C2 → **C2** | 동류항 개념 |
| representation_translation_error(16) | C4 → **C4** | 표현 변환(레이블 정합) |
| fraction_conversion_error(16) | D2 → **C4** | 분수 변환 표현 변환 |
| cycle_length_error(16) | D1 → **D3** | 순환마디 길이 계산 슬립 |
| position_modulo_error(16) | D1 → **D3** | 위치 나머지 계산 슬립 |
| exponent_subtraction_error(14) | D1 → **D3** | 지수 뺄셈 계산 슬립 |
| coefficient_sign_error(14) | B3 → **D3** | 계수 부호 계산 슬립 |
| division_reciprocal_error(14) | B4 → **D1** | 나눗셈 역수 = 식 조작 |
| sign_error(12) | D1 → **D3** | 부호 계산 슬립 |
| substitution_before_simplification(12) | C3 → **A3** | 간단히 안 하고 대입 = 절차/조건 정리 안 함 |

---

## 요약

### 신축 분포(부착 수, 이중축·보류 포함)
- **D3 단순 연산 실수 ≈ 315부착 = 태그 최대 축** (구 D1 대량 이관: elimination 93·deviation_sign 65·sum_or_count 42·cycle/position/exp_sub 46·middle_position 12 등).
- C1 ≈ 250(활용 모델링) · C2 ≈ 190(개념 혼동) · B2 ≈ 130(범위) · C4 ≈ 120(표현 변환) · B4 ≈ 100(부호 조건) · E1 148(검산) · B1 ≈ 110(조건 누락) · D1 ≈ 140(식 조작) · B3 ≈ 30(경우분류) · A3 소수 · A1 0.
- **A1·E2 미사용, A2 축소(even_count_median만 확정), D2 축소(formula_selection만 clean).**

### 보류 (억지 배정 안 함, §10·v11 대기)
- **A2/D2 경계(★승계② ≈146):** mean_formula_application(42)·squared_deviation_or_denominator(65)·representative_value_selection(50, C3/D2) — 공식 "암기 vs 선택·대입"이 §11 레이블로 안 갈림.
- **② A3/B3:** solution_set_matching_error(25) — 경우 나눔(B3)+주어진 해 정리(A3). remap로도 태그 오류절 부재라 미결.
- B1/C1 경계: 모델링/조건 태그 다수는 태그명으로 판별했으나(modeling→C1, omission→B1), 애매분은 위 표에서 C1로 잠정.

### 승계 5건 처리
1. `ratio_translation_error`(3, LE) 미등재 → **C4로 등재** ✓
2. A2·D2 충돌 146 → **보류 3태그로 격리**(합 157, 근사) ✓
3. `solution_set_matching_error`(25)=② → **보류(A3/B3)** ✓
4. E3 부착 39 → **전량 `unit_conversion_error`(LE26+LI13) 이중축뿐** 확인 ✓ (E3 단독 태그 없음)
5. `multi_condition_overload`(118) → **축없음(난이도 서술자)** ✓

### predicted≠observed 최대 격차 (C층 설계 항목)
팩 D3 = 10규칙(0.6%) ↔ 태그 D3 ≈ 315부착(최대 축). **팩은 계산 실수를 거의 예측 안 하는데 태그는 최대 물량으로 잡음** — 매핑 오류 아니라 두 저작의 진단 대상 차이. 재매핑을 완벽히 해도 이 격차는 안 바뀜(C층 상한).
