# 재태깅 시범 — 260710_수와 식(5).pdf

- **단원**: 중2 수와 식 (유리수의 소수 표현 ~ 다항식의 곱셈과 나눗셈)
- **문항**: 150 (전량 "태그없음 150" 구간)
- **유형**: 41
- **고유 태그**: 91종
- **태그 언어**: 영문 snake_case (792 본보기 관례)
- **판정 기준**: 오류절 기준. "학생이 무엇을 빠뜨렸나/틀렸나"만 기재
- **축 배정**: 미실시. Code탭이 `axis_definitions_v10_orig.md`를 참조해 17축 매핑 후 검수 검토
- **정답률**: PDF 기재값. 실측 `observed_accuracy_percent`와 대조 완료(슬립 4건 교정 반영)

## 교정 이력

| 문항 | 최초 기재 | 교정 | 사유 |
|---|---|---|---|
| Q137 | 70 | **54** | 137/138 순서 뒤바뀜 |
| Q138 | 54 | **70** | 위와 동일 |
| Q48 | 53 | **67** | 46–49 블록 배열 밀림 |
| Q49 | 80 | **53** | 위와 동일 |

근거(rationale) 칸은 최초부터 실측과 일치했음. 표 전사 단계의 슬립.

---

## 유형 1–10 (문항 01–37)

### 1. 유한소수로 나타낼 수 있는(없는) 분수
- **문항**: 01–04 | **정답률**: 67·86·71·48
- **태그**: `reduction_before_test_omitted` / `negation_condition_misread` / `pattern_extraction_failure`
- **근거**: 약분 전 분모로 판정하면 전멸. 02·06이 "없는"으로 부정 조건. 04만 48%인데 유일하게 수열 규칙 추출이 선행

### 2. B/A×x가 유한소수가 되도록 하는 x의 값 구하기
- **문항**: 05–08 | **정답률**: 74·85·54·54
- **태그**: `excluded_case_omission` / `extremum_selection_error`
- **근거**: 07은 "정수가 아닌" 제외 조건(55의 배수 빼기)에서 갈림. 08은 방정식 경유 후 "가장 큰 두 자리" 선택. 배수 조건은 찾고 마지막 걸러내기에서 실패

### 3. B/(A×x)가 유한소수가 되도록 하는 x의 값 구하기
- **문항**: 09–12 | **정답률**: 61·50·53·52
- **태그**: `numerator_cancellation_overlooked` / `unknown_position_confusion`
- **근거**: 유형2보다 일괄 20~30pp 낮음. x가 분모로 가면 "2·5의 거듭제곱" 외에 분자의 약수 경로가 열리는데 이걸 빠뜨림(10번 해설이 명시). 유형2의 규칙을 그대로 옮겨 씀

### 4. 유한소수가 되는 x/A를 기약분수로 나타내기
- **문항**: 13–15 | **정답률**: 86·82·77
- **태그**: `post_reduction_value_error` / `range_constraint_dropped`
- **근거**: a는 배수 조건+범위, b는 약분 후 분모. b를 약분 전 분모로 답하는 게 대표 오류. 15는 10<y<25 검증에서 후보 하나 탈락

### 5. 2개 이상의 분수가 동시에 유한소수가 되도록 하는 미지수의 값
- **문항**: 16–18 | **정답률**: 82·71·83
- **태그**: `lcm_gcd_confusion` / `joint_condition_merge_failure`
- **근거**: 각각의 배수 조건은 구하나 결합에서 최대공약수를 씀. 최소공배수가 정답 경로

### 6. 순환마디
- **문항**: 19–22 | **정답률**: 83·72·59·65
- **태그**: `cycle_start_position_error` / `incomplete_division_overread`
- **근거**: 19·20·22 모두 "알아낼 수 없는 것" 고르기. 주어진 나눗셈이 한 바퀴를 못 돌았는데 마디를 확정해버림

### 7. 소수점 아래 n번째 자리의 숫자 구하기
- **문항**: 23–26 | **정답률**: 78·83·67·55
- **태그**: `nonrepeating_prefix_offset_ignored` / `remainder_zero_mapping_error`
- **근거**: 23 해설이 정확히 이것 — 0.1485(순환)는 앞 2자리가 비순환이라 100−2로 오프셋. 26(55%)은 앞 3자리가 0인 경우. 나머지 0일 때 마디 마지막 자리로 대응하는 데서도 갈림

### 8. 순환소수가 되도록 하는 미지수의 값
- **문항**: 27–29 | **정답률**: 67·81·80
- **태그**: `condition_negation_error` / `cancellation_breaks_condition_overlooked`
- **근거**: 유한소수 조건의 부정. 29는 a가 3의 배수면 약분돼 순환소수가 안 되는 역방향

### 9. 순환소수를 분수로 나타내기(3) - 조건제한이 없는 경우
- **문항**: 30–33 | **정답률**: 72·67·90·89
- **태그**: `mixed_recurring_subtraction_omitted` / `digit_swap_misapplication`
- **근거**: 32·33은 90%대인데 30·31이 70% 이하. 30은 ab→ba 자리 교환, 31은 무한합 형태 인식이 선행

### 10. 순환소수의 대소 관계
- **문항**: 34–37 | **정답률**: 78·81·82·61
- **태그**: `recurrence_dot_scope_misread` / `proximity_vs_magnitude_confusion`
- **근거**: 34~36은 점의 범위 읽기. 37만 61% — "0.6에 가까운 순서"인데 대소 순서로 처리하면 틀림

---

## 유형 11–16 (문항 38–59) · 순환소수 계열

### 11. 순환소수를 포함한 식의 계산
- **문항**: 38–41 | **정답률**: 75·74·75·77
- **태그**: `mixed_recurring_conversion_error` / `fraction_form_arithmetic_slip` / `digit_index_offset_error`
- **근거**: 정답률 균일. 분수 변환 자체는 되고 (53−5)/90 같은 혼합 마디에서 분자 계산이 흔들림. 41만 자릿수 위치 특정이 선행

### 12. 순환소수를 포함한 부등식의 계산
- **문항**: 42–45 | **정답률**: 64·74·52·80
- **태그**: `inequality_bound_conversion_error` / `integer_candidate_enumeration_gap` / `multi_constraint_intersection_failure`
- **근거**: 44가 52%로 최저 — 조건 3개(자릿수·범위·기약분수)를 동시에 만족시키는 교집합. 45는 유한소수 조건과 부등식을 둘 다 통과시켜야 함

### 13. 순환소수를 포함한 등식에서 미지수의 값 구하기
- **문항**: 46–49 | **정답률**: 67·64·67·53
- **태그**: `equation_setup_from_recurring_error` / `nested_fraction_simplification_failure`
- **근거**: 49(53%)는 연분수 형태. 등식 세우기까지는 되나 정리 단계에서 무너짐

### 14. 잘못 계산한 경우 어떤 수/바르게 계산한 값 구하기
- **문항**: 50–53 | **정답률**: 56·73·61·69
- **태그**: `intended_vs_actual_value_swap` / `difference_direction_error` / `answer_stage_confusion`
- **근거**: 전 유형 중 최저권. 1.354(순환 위치 다름) 중 어느 쪽이 "원래"인지 뒤바꿈. 51은 "작게 나왔다"의 부호 방향. 53은 분모/분자 뒤집기가 조건

### 15. (순환소수)×x가 유한소수 또는 자연수가 되도록 하는 x의 값 구하기
- **문항**: 54–56 | **정답률**: 84·63·79
- **태그**: `denominator_multiple_condition_error` / `multiple_answer_omission`
- **근거**: 55(63%)는 개수 세기. 54는 정답 2개인데 하나만 고름

### 16. 유리수와 순환소수의 관계-소수의 이해
- **문항**: 57–59 | **정답률**: 72·63·75
- **태그**: `irrational_inclusion_error` / `definition_scope_overgeneralization`
- **근거**: 순환하지 않는 무한소수(무리수)를 유리수에 포함시킴. "무한소수=순환소수"로 과일반화

---

## 유형 17–27 (문항 60–101) · 지수법칙 계열

### 17. 지수법칙(1) - 거듭제곱의 곱셈
- **문항**: 60–62 | **정답률**: 81·83·77
- **태그**: `exponent_addition_vs_multiplication_confusion` / `negative_base_parity_error`
- **근거**: 62는 (−1)의 홀짝 지수 판정

### 18. 지수법칙(3) - 거듭제곱의 나눗셈
- **문항**: 63–66 | **정답률**: 78·70·66·67
- **태그**: `exponent_subtraction_direction_error` / `base_unification_omitted`
- **근거**: 4=2², 27=3³로 밑을 먼저 통일해야 하는데 생략. 65는 정의된 기호 S[N] 적용

### 19. 지수법칙(4) - 곱의 거듭제곱
- **문항**: 67–69 | **정답률**: 87·78·75
- **태그**: `coefficient_exponent_neglect` / `sign_of_negative_coefficient_error`
- **근거**: (−2x²y⁵zᵃ)ᶜ에서 계수 −2에도 지수가 걸리는 걸 빠뜨림

### 20. 지수법칙(6) - 종합
- **문항**: 70–73 | **정답률**: 91·69·67·55
- **태그**: `law_selection_error` / `operation_order_violation` / `abstract_notation_application_failure`
- **근거**: 73이 55%. E[5ⁿ]=n 같은 추상 기호로 법칙을 재진술하는 문항. 71은 규칙 역추적

### 21. 지수법칙을 이용한 실생활 문제
- **문항**: 74–77 | **정답률**: 54·80·45·66
- **태그**: `unit_conversion_omitted` / `stage_indexing_error` / `ratio_direction_inversion`
- **근거**: 76이 45%로 전체 최저. 단계별 개수·길이를 둘 다 추적해야 함. 74는 m/km 단위 변환. 77은 "몇 배" 방향

### 22. 지수법칙의 응용(1) - 같은 수의 덧셈식
- **문항**: 78–81 | **정답률**: 77·75·82·50
- **태그**: `repeated_addition_as_multiplication_failure` / `multi_step_composite_error`
- **근거**: 2²+2²+2²+2²=4×2²=2⁴ 전환. 81(50%)은 이걸 3중으로 겹침

### 23. 지수법칙의 응용(2) - 다른 문자를 이용하여 나타내기(1)
- **문항**: 82–85 | **정답률**: 82·77·79·83
- **태그**: `substitution_direction_error` / `exponent_factoring_failure`
- **근거**: 2ⁿ=A일 때 4ⁿ=A²로 가는 지수 분해. 역방향 대입 혼동

### 24. 지수법칙의 응용(3) - 다른 문자를 이용하여 나타내기(2)
- **문항**: 86–89 | **정답률**: 69·58·54·66
- **태그**: `offset_exponent_handling_error` / `constant_factor_separation_failure`
- **근거**: 유형23보다 20pp 낮음. 차이는 지수에 −1, +1 같은 오프셋이 붙는 것. a=2^(x−1)이면 2ˣ=2a로 상수를 떼어내야 하는데 못 함

### 25. 지수법칙의 응용(4) - 지수법칙과 일의 자릿수
- **문항**: 90–93 | **정답률**: 72·64·84·54
- **태그**: `cycle_length_miscount` / `remainder_to_position_mapping_error`
- **근거**: 일의 자리 순환 주기를 세고 나눗셈 나머지로 위치를 찾는 2단. 93(54%)은 여기에 순환소수 변환까지 얹힘

### 26. 지수법칙의 응용(5) - 지수법칙과 자연수의 자릿수
- **문항**: 94–97 | **정답률**: 81·74·64·76
- **태그**: `power_of_ten_extraction_failure` / `digit_count_off_by_one`
- **근거**: 2ᵃ×5ᵇ를 10ⁿ 꼴로 묶고 남은 계수의 자릿수를 더함. n자리인지 n+1자리인지에서 하나 어긋남

### 27. 지수에 미지수가 포함된 방정식의 풀이
- **문항**: 98–101 | **정답률**: 82·71·67·74
- **태그**: `exponent_equation_base_matching_error` / `common_factor_extraction_failure`
- **근거**: 4^(x+1)+4ˣ+4^(x−1)에서 4ˣ로 묶어내기. 99는 소인수분해로 2의 지수 세기

---

## 유형 28–32 (문항 102–117) · 단항식 계열

### 28. 단항식의 곱셈
- **문항**: 102–104 | **정답률**: 71·83·80
- **태그**: `sign_propagation_error` / `coefficient_vs_exponent_operation_mixup`
- **근거**: (−2x²)²에서 부호가 살아나는지. 계수는 곱하고 지수는 더하는 걸 섞음

### 29. 단항식의 나눗셈
- **문항**: 105–108 | **정답률**: 80·83·67·67
- **태그**: `reciprocal_conversion_error` / `unknown_exponent_matching_failure`
- **근거**: 107·108(67%)은 미지 지수 A,B,C를 양변 비교로 결정. 나눗셈→역수 곱셈 전환에서 분모 전체를 뒤집지 않음

### 30. 단항식의 곱셈과 나눗셈의 혼합 계산
- **문항**: 109–110 | **정답률**: 61·87
- **태그**: `left_to_right_order_violation` / `sign_with_even_power_error`
- **근거**: 109(61%) — (−2xy²)⁴처럼 짝수 지수로 부호가 사라지는 것과 순서 규칙이 겹침

### 31. 단항식의 계산에서 빈 칸에 알맞은 식 구하기
- **문항**: 111–113 | **정답률**: 80·85·90
- **태그**: `inverse_operation_setup_error`
- **근거**: 역연산 세우기. 정답률 높아 단일 태그로 충분

### 32. 도형에서의 단항식의 계산(2) - 입체도형
- **문항**: 114–117 | **정답률**: 71·60·67·80
- **태그**: `volume_formula_misapplication` / `ratio_setup_from_geometry_failure` / `conservation_condition_overlooked`
- **근거**: 115가 60%. 원뿔 1/3, 구 4/3πr³ 공식 자체보다 "부피는 변하지 않는다"는 조건을 등식으로 못 세움

---

## 유형 33–41 (문항 118–150) · 다항식 계열

### 33. 다항식의 덧셈과 뺄셈
- **문항**: 118–121 | **정답률**: 73·62·68·65
- **태그**: `parenthesis_sign_distribution_error` / `like_term_misgrouping` / `geometric_rate_setup_failure`
- **근거**: 119·121이 62·65% — 둘 다 도형 위 두 점의 속력 문제. 순수 계산이 아니라 비례식 세우기에서 갈림

### 34. 이차식의 덧셈과 뺄셈
- **문항**: 122–123 | **정답률**: 82·77
- **태그**: `fraction_coefficient_lcd_error` / `degree_term_confusion`
- **근거**: 분모 통분 후 x 계수와 상수항을 각각 짚어내는 데서 혼동

### 35. 여러 가지 괄호가 있는 식의 계산
- **문항**: 124–126 | **정답률**: 79·65·88
- **태그**: `nested_bracket_order_violation` / `sign_carry_through_layers`
- **근거**: 소·중·대괄호 안쪽부터. 125(65%)는 3중

### 36. 다항식의 덧셈/뺄셈에서 빈 칸에 알맞은 식 구하기
- **문항**: 127–130 | **정답률**: 66·81·52·54
- **태그**: `inverse_operation_sign_error` / `table_rule_direction_misread` / `multi_cell_dependency_tracking_failure`
- **근거**: 129·130이 52·54%로 최저권. 표에서 가로는 더하기·세로는 빼기로 방향이 다른데 이걸 뒤섞음. 빈 칸이 여러 개라 순서대로 풀어야 함

### 37. 사칙연산이 혼합된 계산
- **문항**: 131–134 | **정답률**: 55·70·76·60
- **태그**: `operation_precedence_error` / `custom_operator_definition_misapplication`
- **근거**: 131(55%) 최저. 134(60%)는 순서쌍 연산 같은 새 연산 정의를 그대로 적용하는 문항

### 38. 도형에서의 다항식의 계산(1) - 평면도형
- **문항**: 135–138 | **정답률**: 76·60·54·70
- **태그**: `area_formula_setup_error` / `subtraction_of_regions_omitted` / `variable_length_assignment_failure`
- **근거**: 137이 54%. 전체에서 부분을 빼는 접근을 못 잡음. 136은 규칙에서 세로 길이를 x식으로 세우기

### 39. 도형에서의 다항식의 계산(2) - 입체도형
- **문항**: 139–142 | **정답률**: 77·80·57·62
- **태그**: `volume_from_ratio_error` / `segment_ratio_to_length_conversion_failure`
- **근거**: 141·142가 57·62% — 비 4개를 각각 실제 길이로 바꾼 뒤 넓이를 빼야 함. 단계가 길어 중간에 하나씩 놓침

### 40. 식의 값
- **문항**: 143–146 | **정답률**: 74·77·65·76
- **태그**: `simplify_before_substitute_omitted` / `negative_fraction_substitution_error`
- **근거**: 정리 전에 대입해서 계산이 폭발. 음수·분수 대입 시 부호

### 41. 식의 대입
- **문항**: 147–150 | **정답률**: 80·86·86·73
- **태그**: `substitution_parenthesis_omission` / `multi_expression_dependency_error`
- **근거**: A, B를 괄호 없이 대입해 부호 유실. 150(73%)은 A·B·C 세 식이 서로 물림

---

## 관찰 (축 배정 시 참고)

**1. 정답률 절벽이 반복됨.** 유형2→3, 유형23→24, 유형33 내부에서 20~30pp씩 벌어집니다. 난이도 차가 아니라 **한 가지 조작이 추가되는 지점**입니다.
- 유형2→3: 미지수 x가 분자에서 분모로 이동
- 유형23→24: 지수에 오프셋(−1, +1)이 붙음
- 유형33 내부: 계산에서 모델링(비례식 세우기)으로 넘어감

**2. 최저 5개 유형의 공통점.** 76번(45%), 81번(50%), 129번(52%), 44번(52%), 137번(54%)은 오류 종류가 제각각인데, 전부 **여러 조건을 동시에 추적하다 하나를 놓치는** 형태입니다. 단일 축으로 묶이는지 확인 대상.

---

## Code탭 반영 시 주의

**태그는 유형 단위, 엔진은 문항 단위.** `source_item_links`는 item_id → likely_error_tags 구조이므로 배분 규칙이 필요합니다.

- 기본: 유형의 태그 전체를 소속 문항 전부에 배분
- 예외: 근거에 특정 문항이 명시된 경우 그 태그는 해당 문항에만 배정
  - 예) 유형11 "41만 자릿수 위치 특정이 선행" → `digit_index_offset_error`는 Q41에만
  - 예) 유형15 "54는 정답 2개인데 하나만 고름" → `multiple_answer_omission`은 Q54에만

**축 배정은 Code탭이 수행.** 검수는 `axis_definitions_v10_orig.md` 원문 접근이 없습니다. Code탭이 91종 태그를 17축에 매핑한 결과를 검수가 검토하는 순서로 진행합니다.
