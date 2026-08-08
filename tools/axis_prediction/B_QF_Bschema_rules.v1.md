# QF B-schema diagnosis rules (13) -- material for B-revival judgment (2026-08-09)

> Unconsumed: schema field 'trigger_error_tags' != engine 'trigger.error_tags_any'. B-revival = rename field, judge firability + message quality.
> Backing(O/X): trigger value present in static problem_types vocab(1492) = can match. Absent(X) = inert entry.
> ENGINE SEMANTICS = OR/SUM: rule fires if SUM of wrong-counts across its trigger tags >= wrong_min. So a rule with >=1 backed(O) tag CAN fire; X tags just contribute 0 (do not kill the rule).

### 1. M3_QFUNC_RULE_001  [backed 3/3 -> FIREABLE]
- trigger_error_tags: quadratic_function(O), coefficient(O), a_not_zero(O)
- diagnosis_message: 최고차항 계수 a≠0 조건을 확인하지 않아 이차함수 여부를 잘못 판단합니다.
- primary_concept_ids: M3_FUNC_C001, M3_FUNC_C003

### 2. M3_QFUNC_RULE_002  [backed 3/3 -> FIREABLE]
- trigger_error_tags: function_value(O), substitution(O), sign_error(O)
- diagnosis_message: 음수 제곱이나 항별 대입 과정에서 부호 오류가 반복됩니다.
- primary_concept_ids: M3_FUNC_C002, M3_FUNC_C022

### 3. M3_QFUNC_RULE_003  [backed 2/3 -> FIREABLE]
- trigger_error_tags: graph_interpretation(O), coefficient_a(O), parabola_width(X)
- diagnosis_message: a의 부호와 |a|의 역할을 구분하지 못해 방향과 폭을 혼동합니다.
- primary_concept_ids: M3_FUNC_C005, M3_FUNC_C006, M3_FUNC_C034

### 4. M3_QFUNC_RULE_004  [backed 1/3 -> FIREABLE]
- trigger_error_tags: translation(O), vertex_form(X), p_q_sign(X)
- diagnosis_message: y=a(x-p)²+q에서 p의 부호를 반대로 해석하거나 q를 x좌표로 착각합니다.
- primary_concept_ids: M3_FUNC_C009, M3_FUNC_C010, M3_FUNC_C011, M3_FUNC_C012

### 5. M3_QFUNC_RULE_005  [backed 2/2 -> FIREABLE]
- trigger_error_tags: vertex_axis(O), coordinate_order(O)
- diagnosis_message: 축의 방정식과 꼭짓점 좌표를 혼동하거나 y좌표를 빠뜨립니다.
- primary_concept_ids: M3_FUNC_C011, M3_FUNC_C016, M3_FUNC_C017

### 6. M3_QFUNC_RULE_006  [backed 2/3 -> FIREABLE]
- trigger_error_tags: complete_square(O), standard_form(O), constant_adjustment(X)
- diagnosis_message: 완전제곱식으로 바꾸는 과정에서 상수항 보정과 부호 처리가 흔들립니다.
- primary_concept_ids: M3_FUNC_C014, M3_FUNC_C015, M3_FUNC_C043

### 7. M3_QFUNC_RULE_007  [backed 3/3 -> FIREABLE]
- trigger_error_tags: graph_drawing(O), vertex_axis(O), intercepts(O)
- diagnosis_message: 꼭짓점, 축, 대칭점, 절편 중 일부만 표시하여 그래프가 부정확합니다.
- primary_concept_ids: M3_FUNC_C018, M3_FUNC_C019, M3_FUNC_C020, M3_FUNC_C021

### 8. M3_QFUNC_RULE_008  [backed 2/3 -> FIREABLE]
- trigger_error_tags: equation_from_conditions(O), substitution(O), condition_missing(X)
- diagnosis_message: 꼭짓점, 점, 절편 조건 중 일부만 사용하여 식을 잘못 구합니다.
- primary_concept_ids: M3_FUNC_C023, M3_FUNC_C024, M3_FUNC_C025, M3_FUNC_C026

### 9. M3_QFUNC_RULE_009  [backed 2/3 -> FIREABLE]
- trigger_error_tags: intercept(O), quadratic_equation(O), root_graph_connection(X)
- diagnosis_message: x절편을 구할 때 y=0을 두어 이차방정식을 푸는 연결이 약합니다.
- primary_concept_ids: M3_FUNC_C021, M3_FUNC_C031

### 10. M3_QFUNC_RULE_010  [backed 3/3 -> FIREABLE]
- trigger_error_tags: maximum_minimum(O), vertex(O), range_check(O)
- diagnosis_message: a의 부호 또는 제한 범위를 확인하지 않아 최댓값과 최솟값을 반대로 판단합니다.
- primary_concept_ids: M3_FUNC_C027, M3_FUNC_C028, M3_FUNC_C029

### 11. M3_QFUNC_RULE_011  [backed 1/3 -> FIREABLE]
- trigger_error_tags: intersection(O), system(X), coordinate_completion(X)
- diagnosis_message: 연립 후 x값만 구하고 y좌표를 구하지 않아 교점 좌표가 불완전합니다.
- primary_concept_ids: M3_FUNC_C032, M3_FUNC_C033

### 12. M3_QFUNC_RULE_012  [backed 2/3 -> FIREABLE]
- trigger_error_tags: graph_to_equation(X), vertex_axis(O), coefficient_condition(O)
- diagnosis_message: 그래프의 꼭짓점, 축, 절편 정보를 식의 계수와 연결하지 못합니다.
- primary_concept_ids: M3_FUNC_C042, M3_FUNC_C043

### 13. M3_QFUNC_RULE_013  [backed 3/3 -> FIREABLE]
- trigger_error_tags: modeling(O), geometry_area(O), condition_translation(O)
- diagnosis_message: 도형, 거리, 실생활 상황에서 변수를 정하지 못하거나 식 변환이 불안정합니다.
- primary_concept_ids: M3_FUNC_C038, M3_FUNC_C039, M3_FUNC_C040, M3_FUNC_C044

## Summary
- 13 rules. distinct trigger values 35, backed by static vocab 26.
- unbacked(X) values 9: condition_missing, constant_adjustment, coordinate_completion, graph_to_equation, p_q_sign, parabola_width, root_graph_connection, system, vertex_form
- FULLY DEAD rules (0 backed, never fire even after rename): 0
- => rename-only revives all rules with >=1 backed tag. Unbacked X values are inert entries (clean up or map to real tags later).
