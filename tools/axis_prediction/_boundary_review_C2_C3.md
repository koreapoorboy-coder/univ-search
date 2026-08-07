# Boundary review dossier -- C2 <-> C3

> Canonical maps (v1 + circle6new excluded). Directions: C2>C3 and C3>C2.
> Each tag: current axis/alt + note(ko) + up to 3 representative item rationales(ko).

---
## C2 > C3  (current=C2, alt=C3) : 10

### 1. circumcenter_equidistance_relation_failure
- current **C2**, alt **C3**
- note: ★검수지침: 외심 OA=OB=OC 정의를 못 꺼냄 = 개념(C2), B1 아님(isosceles_altitude_bisection B1→C2 선례). vs 등거리→이등변→각 연쇄(C3)
- occurs 5x. representative rationale:
  - **m2_geometry_properties_set07 type10 Q32-35 76-86% [type-wide]** 삼각형의 외심
    - Q32~Q35는 외심이 세 변의 수직이등분선의 교점이며 세 꼭짓점까지의 거리가 같다는 두 기본 성질을 구분해 사용한다. Q32는 외심에 대한 설명 자체의 옳고 그름을 고르는 문항이라 법칙 선택 오류를 Q32에만 둔다.
  - **m2_geometry_properties_set07 type11 Q36-37 66-67% [type-wide]** 둔각삼각형의 외심
    - Q36~Q37은 둔각삼각형의 바깥에 놓인 외심에서 OA=OB=OC를 이용해 여러 이등변삼각형의 밑각을 만든 뒤 목표각까지 연쇄한다. 외심의 위치만 보고 각 관계를 잘못 해석하거나 같은 반지름을 놓치기 쉽다.
  - **m2_geometry_properties_set07 type14 Q45-46 75-81% [type-wide]** 삼각형의 외심의 성질 응용(1) ∠x+∠y+∠z=90°
    - Q45~Q46은 외심에서 세 꼭짓점까지 같은 반지름을 그어 생기는 이등변삼각형의 밑각을 이용해 x,y,z의 합을 90°로 정리한다. 반지름의 등거리 관계와 여러 각의 합을 한 그림 안에서 동시에 유지해야 한다.

### 2. circumcenter_perpendicular_bisector_relation_failure
- current **C2**, alt **C3**
- note: 외심=세 변 수직이등분선 교점 정의 미소환 = 개념(C2). diameter_right_angle(B1)와 달리 정의라 C2. vs 연결(C3)
- occurs 2x. representative rationale:
  - **m2_geometry_properties_set07 type10 Q32-35 76-86% [type-wide]** 삼각형의 외심
    - Q32~Q35는 외심이 세 변의 수직이등분선의 교점이며 세 꼭짓점까지의 거리가 같다는 두 기본 성질을 구분해 사용한다. Q32는 외심에 대한 설명 자체의 옳고 그름을 고르는 문항이라 법칙 선택 오류를 Q32에만 둔다.
  - **m2_geometry_properties_set07 type22 Q71-73 53-84% [type-wide]** 삼각형의 외심과 내심에 대한 설명
    - Q71~Q73은 외심과 내심의 정의·위치·거리 성질을 서로 구분하는 유형이다. 수직이등분선과 각의 이등분선을 혼동하거나, 외심·내심에서 같아지는 거리의 대상을 바꾸는 오류가 핵심이다.

### 3. endpoint_angle_projection_component_confusion
- current **C2**, alt **C3**
- note: 양끝각 sin/cos 성분 혼동 = 개념(C2) vs 연결(C3)
- occurs 2x. representative rationale:
  - **m3_trigonometric_ratio_set01 type27 Q107-111 69-85% [type-wide]** 실생활에서 직각삼각형의 변의 길이의 활용
    - Q107~Q111은 추·그네 줄의 길이를 수직 또는 수평 성분으로 투영해 위치 변화를 계산한다. Q107·Q111은 기준 높이에서 투영된 길이를 빼는 방향을 잘못 잡기 쉽고, Q108·Q111은 지면이나 천장 기준의 추가 높이를 함께 반영해야 한다.

### 4. incenter_angle_bisector_relation_failure
- current **C2**, alt **C3**
- note: 내심=세 내각 이등분선 교점 정의 미소환 = 개념(C2). 검수 구분: angle_bisector_chain_integration(C3, 후속연쇄)과 다른 '정의'. vs 연결(C3)
- occurs 6x. representative rationale:
  - **m2_geometry_properties_set07 type16 Q49-52 32-76% [type-wide]** 삼각형의 내심
    - Q49~Q52는 내심이 세 내각의 이등분선 교점이라는 사실을 이용해 각을 반으로 나누고, 접점이 있는 문항에서는 반지름과 변의 수직 관계를 함께 사용한다. Q50~Q51은 접점의 90°가 추가되고, Q52는 외심·내심 성질의 설명을 구분하는 문항이라 각각 범위를 제한한다.
  - **m2_geometry_properties_set07 type17 Q53-55 68-79% [type-wide]** 삼각형의 내심의 성질 응용(1) ∠x+∠y+∠z=90°
    - Q53~Q55는 내심이 각을 이등분한다는 성질로 각을 반씩 나눈 뒤 삼각형의 내각·외각을 이어 x+y+z 또는 목표각을 구한다. 한 꼭짓점의 반각을 다른 꼭짓점으로 잘못 옮기지 않는 것이 핵심이다.
  - **m2_geometry_properties_set07 type18 Q56-59 53-75% [type-wide]** 삼각형의 내심의 성질 응용(2) ∠BIC=90°+1/2∠A
    - Q56~Q59는 ∠BIC=90°+1/2∠A 관계를 직접 또는 이등분된 각의 합으로 유도해 사용한다. Q58~Q59는 두 내심이나 여러 수선을 한꺼번에 연결하는 단계가 추가되므로 다단계 복합 오류를 해당 문항에만 둔다.

### 5. irrational_conjugate_root_pair_failure
- current **C2**, alt **C3**
- note: 유리계수서 a-√b 근이면 a+√b도 근(켤레근 성질) 인식 = 개념(C2) vs 성질 연결·복원(C3)
- occurs 2x. representative rationale:
  - **m3_quadratic_equation_set06 type26 Q102-105 75-79% [type-wide]** 한 근이 무리수인 이차방정식
    - Q102~Q105는 유리수 계수 이차방정식에서 한 근이 a-√b 꼴이면 다른 근이 a+√b가 된다는 켤레근 성질을 사용한다. 두 근으로 다시 인수식을 구성해 계수를 비교하는 단계까지 이어지므로 켤레근 인식과 방정식 복원이 함께 요구된다.
  - **m3_quadratic_equation_set12 type14 Q103-109 63-82% [type-wide]** 한 근이 무리수인 이차방정식
    - Q103~Q109는 유리수 계수 이차방정식에서 한 무리수 근이 주어지면 켤레근도 함께 근이 된다는 성질을 이용한다. 두 근으로 식을 복원하거나 계수 관계를 계산하는 과정까지 연결해야 한다.

### 6. parabola_coefficient_width_direction_confusion
- current **C2**, alt **C3**
- note: ★판례C2: a부호=열린방향·|a|=폭, 원자적 개념혼동(C2). slope_sign_graph_direction(C2) 선례 vs 연결(C3)
- occurs 3x. representative rationale:
  - **m3_quadratic_function_set04 type4 Q11-14 80-88% [type-wide]** 이차함수 y=ax²의 그래프
    - Q11~Q14는 y=ax²에서 a의 부호로 위·아래 방향을, |a|의 크기로 그래프의 폭을 비교한다. 좌표평면의 여러 포물선을 계수 크기와 연결하지 못하면 그래프 선택과 개수 판정이 어긋난다.
  - **m3_quadratic_function_set04 type12 Q42-45 71-76% [type-wide]** 이차함수 y=a(x-p)²의 그래프의 성질
    - Q42~Q45는 y=a(x-p)²의 꼭짓점·축·열린 방향·폭을 비교한다. Q42·Q43은 맞는 설명이 2개이므로 그래프의 폭과 축을 정확히 읽은 뒤 복수정답을 모두 남겨야 한다.
  - **m3_quadratic_function_set10 type1 Q1-6 70-90% [type-wide]** 이차함수 y=ax²의 그래프
    - Q1~Q6은 y=ax²에서 a의 부호로 열린 방향을, |a|의 크기로 포물선의 폭을 비교해 그래프·영역과 식을 대응한다. Q4와 Q6은 색칠된 영역을 지나는 식을 각각 2개 모두 골라야 하므로 복수정답 누락을 해당 문항에만 둔다.

### 7. quadrilateral_hierarchy_classification_failure
- current **C2**, alt **C3**
- note: 정사각형·직사각형·마름모·평행사변형 포함관계·필요충분 방향 오분류 = 도형 위계 개념(C2). vs 관계 연결(C3)
- occurs 1x. representative rationale:
  - **m2_geometry_properties_set07 type42 Q128-131 59-80% [type-wide]** 여러 가지 사각형 사이의 관계
    - Q128~Q131은 평행사변형·직사각형·마름모·정사각형 사이의 포함 관계와 필요·충분조건을 판별한다. 한 도형의 성질을 다른 도형에도 항상 성립한다고 일반화하거나 포함 방향을 뒤집는 것이 핵심 오류다.

### 8. radical_magnitude_comparison_failure
- current **C2**, alt **C3**
- note: 근호 포함 수를 제곱값·인접 제곱수 경계로 대소비교 = 크기 비교 개념(C2). slope_magnitude_comparison·proximity_vs_magnitude(C2) 선례 vs 다표현 연결(C3)
- occurs 4x. representative rationale:
  - **m3_real_numbers_and_operations_set07 type11 Q39-42 61-75% [type-wide]** 제곱근의 대소 관계
    - Q39~Q42는 0<a<1 또는 -1<x<0 같은 범위에서 a, √a, 역수, 제곱의 크기와 부호를 비교한다. Q41·Q42에는 √(u²)=|u|가 추가되어 음수 자체를 그대로 꺼내면 순서가 뒤집힌다.
  - **m3_real_numbers_and_operations_set07 type17 Q64-68 64-83% [type-wide]** 두 실수 사이의 수
    - Q64~Q68은 √n을 인접한 정수 사이에 끼워 넣어 두 실수 사이 정수의 개수나 경계를 결정한다. Q66·Q67은 그 구간 안의 유리수·무리수의 무한성을 추가로 묻고, Q68은 네 정수가 들어가도록 양쪽 경계를 동시에 맞춰야 한다.
  - **m3_real_numbers_and_operations_set07 type21 Q82-86 52-83% [Q[82,83]]** 근호가 있는 식의 변형(3) √b/a²
    - Q82~Q86은 근호가 있는 분수를 하나의 √(분수) 꼴로 바꾸거나 분모의 제곱을 밖으로 빼서 정리한다. Q82·Q83은 정리한 값을 비교해야 하고, Q86은 얻어진 비에서 다시 근호가 자연수가 되도록 완전제곱 조건을 적용하며 52%로 가장 낮다.

### 9. slope_magnitude_graph_comparison_error
- current **C2**, alt **C3**
- note: 기울기 절댓값=가파른 정도, 원자적 개념혼동(C2) vs 연결(C3)
- occurs 1x. representative rationale:
  - **m2_linear_function_set06 type17 Q17-17 75-75% [type-wide]** y=ax+b의 그래프의 기울기의 성질
    - Q17은 세 직선이 같은 y절편을 지날 때 기울기 절댓값이 그래프의 가파른 정도를 뜻함을 이용해 -5<a<-1/5를 정한다. 부호뿐 아니라 기울기의 절댓값 크기를 비교하고 열린구간을 유지해야 한다.

### 10. slope_sign_graph_direction_confusion
- current **C2**, alt **C3**
- note: ★판례: 기울기 부호=그래프 증감방향, 원자적 개념혼동(C2) vs 연결(C3). trig_monotonic_direction_confusion(C2) 선례
- occurs 4x. representative rationale:
  - **m2_linear_function_set06 type11 Q11-11 85-85% [type-wide]** 변화량에 따른 일차함수의 모양
    - Q11은 x가 증가할 때 y가 감소하는 직선, 즉 기울기가 음수인 식만 골라야 한다. 식의 기울기 부호를 그래프의 증가·감소 방향으로 연결하지 못하거나 여러 설명을 함께 판정할 때 오류가 난다.
  - **m2_linear_function_set06 type14 Q14-14 75-75% [type-wide]** 일차함수의 그래프 그리기/찾기
    - Q14는 원래 직선의 x절편 3, y절편 -1로 a,b를 결정한 후 새 식 y=2bx+3a의 기울기와 절편을 다시 읽어 그래프를 고른다. 절편에서 식을 재구성하는 과정과 음의 기울기 방향 판정이 함께 필요하다.
  - **m2_linear_function_set09 type9 Q9-9 84-84% [type-wide]** 변화량에 따른 일차함수의 모양
    - Q9는 x가 증가할 때 y가 감소하는 식 두 개를 모두 골라야 한다. 기울기 음수 여부를 그래프의 감소 방향으로 연결하지 못하거나 정답 두 개 중 하나만 고르면 오답이다.

---
## C3 > C2  (current=C3, alt=C2) : 12

### 1. graph_property_statement_evaluation_failure
- current **C3**, alt **C2**
- note: 한 그래프의 여러 진술을 기울기·절편·통과점 기준 일관 판정 = 개념 연결·일관적용(C3) vs 개념(C2)
- occurs 13x. representative rationale:
  - **m2_linear_function_set06 type11 Q11-11 85-85% [type-wide]** 변화량에 따른 일차함수의 모양
    - Q11은 x가 증가할 때 y가 감소하는 직선, 즉 기울기가 음수인 식만 골라야 한다. 식의 기울기 부호를 그래프의 증가·감소 방향으로 연결하지 못하거나 여러 설명을 함께 판정할 때 오류가 난다.
  - **m2_linear_function_set06 type25 Q25-25 80-80% [type-wide]** y=ax+b의 그래프의 성질
    - Q25는 y=2x를 아래로 3만큼 이동한 y=2x-3에 대해 증가량 비, 제2사분면 통과 여부, 점 통과, 다른 그래프와의 일치 여부를 각각 판단한다. 이동 뒤의 그래프 성질을 여러 진술에 일관되게 적용해야 한다.
  - **m2_linear_function_set09 type2 Q2-2 85-85% [type-wide]** 함수
    - Q2는 양초의 길이가 30cm에서 시간당 4cm씩 줄어드므로 y=30-4x인 일차함수이다. 변화량의 부호를 반대로 잡거나 'x시간 동안 4xcm만큼 줄어든다'는 진술과 그래프 성질을 일관되게 판정하지 못하면 틀린다.

### 2. intersection_probability_product_failure
- current **C3**, alt **C2**
- note: 동시=순차/독립 곱 연결 = 사건 연산 연결(C3) vs '동시를 또는으로' 개념혼동(C2)
- occurs 8x. representative rationale:
  - **m2_probability_set06 type31 Q105-107 66-84% [type-wide]** 두 사건 A와 B가 동시에 일어날 확률
    - Q105~Q107은 두 사건 A와 B가 동시에 성립하는 경우를 세고 전체 경우와 비교한다. “동시에”를 “또는”으로 처리하거나 두 단계 확률/경우의 수의 곱 구조를 놓치면 교집합 확률이 잘못된다.
  - **m2_probability_set06 type33 Q112-115 56-81% [type-wide]** 확률의 덧셈과 곱셈
    - Q112~Q115는 문제 상황에 따라 확률을 더할지 곱할지 선택한 뒤, 필요하면 서로 겹치는 사건을 보정한다. 덧셈법칙과 곱셈법칙의 적용 시점을 뒤바꾸는 것이 이 유형의 가장 직접적인 오류다.
  - **m2_probability_set06 type38 Q131-133 50-80% [Q[133]]** 문제를 맞힐 확률
    - Q131은 적어도 한 문제를 맞힐 확률을 전부 틀릴 확률의 여사건으로, Q132는 정확히 한 문제만 맞는 위치별 경우로, Q133은 지정된 사람만 맞히는 독립 사건의 곱으로 처리한다. 세 문항의 핵심 조작이 달라 문항별 tag_scope를 분리했다.

### 3. multiple_line_angle_comparison_failure
- current **C3**, alt **C2**
- note: 두 직선 각 해석·합성 = 연결(C3) vs 개념(C2)
- occurs 1x. representative rationale:

### 4. overlapping_rotated_figure_congruence_failure
- current **C3**, alt **C2**
- note: 겹친·회전 도형 합동 찾기 = 연결(C3) vs 개념(C2)
- occurs 1x. representative rationale:

### 5. parabola_axis_symmetry_point_mapping_failure
- current **C3**, alt **C2**
- note: 대칭축 기준 두 점 x좌표 대칭관계 이용 = 개념 연결(C3) vs 개념(C2)
- occurs 1x. representative rationale:
  - **m3_quadratic_function_set04 type32 Q114-117 74-80% [type-wide]** 이차함수의 식 구하기(3) 축의 방정식과 두 점을 알 때
    - Q114~Q117은 축의 방정식과 두 점을 이용해 이차함수를 복원한다. 축을 기준으로 대칭인 좌표 관계를 이용하거나 여러 점 조건을 한 식에 동시에 반영해야 한다.

### 6. parabola_quadrant_coverage_failure
- current **C3**, alt **C2**
- note: ★판례C3: 꼭짓점·방향·교점 종합 -> 사분면 판정(해석적) = 연결(C3). parameter_sign_to_graph(C3) 선례 vs 개념(C2)
- occurs 6x. representative rationale:
  - **m3_quadratic_function_set04 type15 Q52-54 69-86% [type-wide]** 이차함수 y=a(x-p)²+q의 그래프가 지나는 사분면
    - Q52~Q54는 포물선의 꼭짓점 위치, 열린 방향과 y축 교점을 이용해 지나지 않는 사분면을 판정한다. 특히 Q52는 모든 사분면을 지나게 하는 k의 범위를 세우므로 사분면 조건과 범위 조건을 함께 유지해야 한다.
  - **m3_quadratic_function_set04 type19 Q66-69 56-78% [Q[68,69]]** 이차함수 y=a(x-p)²+q의 그래프에서 a, p, q의 부호
    - Q66~Q69는 그래프나 일차식에서 a,p,q의 부호를 읽어 포물선의 꼭짓점·열린 방향·사분면으로 옮긴다. Q68·Q69는 사분면 통과 여부까지 결합되므로 부호에서 사분면을 추론하는 오류를 해당 문항에만 추가한다.
  - **m3_quadratic_function_set04 type23 Q80-83 57-85% [type-wide]** 이차함수 y=ax²+bx+c의 그래프가 지나는 사분면
    - Q80~Q83은 꼭짓점·열린 방향·계수 조건으로 포물선이 지나지 않는 사분면을 판정한다. Q81·Q82는 -2,-1,0,1,2에서 중복 없이 a,b,c를 뽑는 경우를 모두 세어야 해 정수 후보 열거 누락이 추가 위험이다.

### 7. parallelism_converse_ratio_test_failure
- current **C3**, alt **C2**
- note: 선분비 일치로 평행 역판정(삼각형 비례정리 역). cyclicity_converse_angle_condition_failure(C3) 선례 참조하되 개별판단: 경우분류 없어 alt=B3 아닌 C2(정/역 개념). 개념연결·역조건 적용(C3) vs 개념 혼동(C2)
- occurs 1x. representative rationale:
  - **m2_similarity_set04 type14 Q32-33 55-71% [type-wide]** 평행선 찾기
    - Q32~Q33은 선분 길이의 비가 같다는 사실에서 평행선을 역으로 판정해야 한다. Q33은 55%로 더 낮고 DE·EF·FD 세 후보를 각각 다른 변의 분할비와 대조해야 하므로 다중 후보 검사를 끝까지 하지 못하는 오류를 Q33에만 둔다.

### 8. parallelogram_condition_converse_failure
- current **C3**, alt **C2**
- note: 조건→평행사변형 역판정 = 개념 연결·역조건 적용(C3). cyclicity_converse(C3) 선례 참조·개별판단. parallelism/pythagorean_converse(similarity, C3/alt C2)와 동일 converse family. vs 정/역 개념(C2)
- occurs 5x. representative rationale:
  - **m2_geometry_properties_set07 type28 Q92-93 52-83% [type-wide]** 평행사변형이 되는 조건의 증명
    - Q92~Q93은 주어진 대변·대각선 조건으로 사각형이 평행사변형임을 역으로 증명한다. 합동 조건을 잘못 골라 평행 관계를 만들지 못하는 오류가 핵심이고, Q93은 옳지 않은 것을 2개 고르는 문항이라 복수정답 누락을 Q93에만 둔다.
  - **m2_geometry_properties_set07 type29 Q94-95 71-75% [type-wide]** 평행사변형이 되는 조건 구하기
    - Q94~Q95는 여러 길이·각·대각선 조건 중 평행사변형을 보장하는 충분조건을 판별한다. 성질의 정방향과 역방향을 혼동하기 쉽고, Q94는 조건이 아닌 것을 2개 고르므로 `multiple_answer_omission`을 Q94에만 둔다.
  - **m2_geometry_properties_set07 type30 Q96-97 77-86% [type-wide]** 새롭게 만든 사각형이 평행사변형이 되는 조건
    - Q96~Q97은 기존 평행사변형의 대각선·중점을 이용해 새로 만든 사각형이 다시 평행사변형임을 보인다. Q97은 새 도형의 네 변을 복원해 둘레까지 합산하므로 경로 길이 분해 오류를 Q97에만 둔다.

### 9. pythagorean_converse_condition_failure
- current **C3**, alt **C2**
- note: 세 변 길이로 직각 판정(피타고라스 역정리). cyclicity_converse(C3) 선례 참조하되 개별판단: 조건판정 단일이라 alt=C2. 개념연결·역조건 적용(C3) vs 개념 혼동(C2)
- occurs 3x. representative rationale:
  - **m2_similarity_set04 type59 Q129-130 90-90% [type-wide]** 직각삼각형이 되기 위한 조건
    - Q129~Q130은 가장 긴 변의 제곱이 나머지 두 변 제곱의 합과 같은지 확인해 직각삼각형을 판정한다. Q130은 판정 후 실제 직각변 9와 12를 골라 넓이를 계산해야 하므로 area_formula_setup_error를 Q130에만 둔다.
  - **m2_similarity_set09 type47 Q138-138 79-79% [type-wide]** 직각삼각형이 되기 위한 조건
    - Q138은 세 변의 길이 6-8-10과 10-24-26이 각각 직각삼각형인지 피타고라스 역정리로 판정한 뒤 두 넓이의 차를 구한다. 직각변을 잘못 고르거나 넓이 공식을 빗변에 적용하는 오류가 핵심이다.
  - **m2_similarity_set09 type48 Q139-141 53-64% [Q[141]]** 각의 크기에 따른 삼각형의 변의 길이
    - Q139~Q140은 삼각형의 존재 조건과 둔각 조건을 제곱 부등식으로 바꾸어 가능한 BC의 범위를 잡는다. Q140은 가능한 자연수들을 찾은 뒤 그 합을 답해야 하며, Q141은 주어진 막대 조합이 직각삼각형인지 피타고라스 역정리로 판정해 개수를 세어야 한다.

### 10. quadratic_translation_parameter_sign_confusion
- current **C3**, alt **C2**
- note: ★판례C3: y=a(x-p)²+q의 p,q ↔ 좌우·상하 이동방향 부호 대응(해석적) = 연결(C3) vs 원자적 부호혼동(C2). 최다빈출 10회
- occurs 15x. representative rationale:
  - **m3_quadratic_function_set04 type9 Q30-33 55-77% [type-wide]** 이차함수 y=ax²+q의 그래프가 지나는 점
    - Q30~Q33은 y=ax²+q에서 꼭짓점의 y좌표 q와 주어진 점을 이용해 a를 정한다. Q30은 55%로 가장 낮고 포물선 위 점으로 만든 사각형의 넓이까지 연결하므로 넓이식 설정을 Q30에만 추가한다.
  - **m3_quadratic_function_set04 type11 Q38-41 75-83% [type-wide]** 이차함수 y=a(x-p)²의 그래프가 지나는 점
    - Q38~Q41은 y=a(x-p)²에서 축 x=p를 읽고 평행이동된 그래프가 지나는 점을 대입해 a·p를 구한다. (x-p)의 부호를 이동 방향과 반대로 읽거나 음수 좌표를 괄호 없이 대입하면 오답이 난다.
  - **m3_quadratic_function_set04 type13 Q46-47 79-82% [type-wide]** 이차함수 y=a(x-p)²+q의 그래프
    - Q46~Q47은 기본 포물선을 x·y축 방향으로 평행이동해 y=a(x-p)²+q 꼴을 해석한다. Q47은 같은 폭의 두 포물선 사이 도형 넓이까지 계산하므로 넓이식 설정을 해당 문항에만 둔다.

### 11. union_probability_overlap_failure
- current **C3**, alt **C2**
- note: P(A∪B) 공통 한번만 빼기(포함배제) = 사건 연산 연결(C3) vs 개념(C2)
- occurs 2x. representative rationale:
  - **m2_probability_set06 type30 Q101-104 55-63% [type-wide]** 사건 A 또는 사건 B가 일어날 확률
    - Q101~Q104는 사건 A 또는 B가 일어나는 경우를 합칠 때 A와 B의 공통 부분을 한 번만 세어야 한다. 두 사건의 경우를 단순히 더해 교집합을 중복 계산하거나 전체 표본공간 수를 잘못 잡는 것이 대표 오류다.
  - **m2_probability_set06 type33 Q112-115 56-81% [type-wide]** 확률의 덧셈과 곱셈
    - Q112~Q115는 문제 상황에 따라 확률을 더할지 곱할지 선택한 뒤, 필요하면 서로 겹치는 사건을 보정한다. 덧셈법칙과 곱셈법칙의 적용 시점을 뒤바꾸는 것이 이 유형의 가장 직접적인 오류다.

### 12. with_replacement_state_reset_failure
- current **C3**, alt **C2**
- note: 복원 뒤 전체수·구성비 초기화 반영 = 상태 추적(C3). without_replacement와 짝
- occurs 1x. representative rationale:
  - **m2_probability_set06 type34 Q116-119 57-81% [type-wide]** 연속하여 꺼내는 경우의 확률(1) 꺼낸 것을 다시 넣는 경우
    - Q116~Q119는 한 번 꺼낸 것을 다시 넣으므로 다음 시행의 전체 개수와 각 결과 확률이 처음과 동일하게 초기화된다. 복수의 순차 경로를 빠뜨리거나 각 경로 확률을 더하고 곱하는 과정에서 분수 계산이 흔들릴 수 있다.

