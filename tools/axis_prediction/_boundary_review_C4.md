# Boundary review dossier -- C4 adjacencies (C4<->C1, C4<->C3)
> Canonical 11 maps. C4 = same object, notation change only (3-way precedent).

---
## C4 > C1  (current=C4, alt=C1) : 9

### 1. common_subexpression_substitution_failure
- current **C4**, alt **C1**
- note: 반복 복합식→한 문자 치환해 저차식 변환 = 표현변환(C4, 치환) vs 전략 설정(C1). completing_square(C4) 계열
- occurs 7x. representative rationale:
  - **m3_polynomial_set06 type38 Q109-111 62-78% [type-wide]** 치환을 이용한 인수분해(1) 공통부분이 있는 경우
    - Q109~Q111은 x²-x, 3x+4y, x+2y를 한 문자로 치환해 이차식으로 낮춘 뒤 인수분해한다. Q111은 결과가 소수가 되려면 한 인수가 1이어야 하는 경우를 자연수 범위에서 모두 찾아야 하므로 후보 열거를 Q111에만 둔다.
  - **m3_polynomial_set06 type39 Q112-114 71-82% [type-wide]** 치환을 이용한 인수분해(2) 다른 형태로 주어진 공통부분이 있는 경우
    - Q112~Q114는 x-y, x-3y, x²-x처럼 모양이 다른 공통부분을 같은 문자로 맞춰 인수분해한다. Q114는 “인수가 아닌 것”을 골라야 하므로 부정 조건을 Q114에만 둔다.
  - **m3_polynomial_set06 type40 Q115-117 64-78% [type-wide]** 치환을 이용한 인수분해(3) 공통부분이 2개 있는 경우
    - Q115~Q117은 두 개의 공통부분을 동시에 치환하거나 합·차를 X,Y로 두어 다시 인수분해한다. Q117은 64%로 치환→두 제곱의 차→거듭제곱 관계까지 여러 단계가 이어지므로 다단계 오류를 Q117에 둔다.

### 2. conjugate_rationalization_setup_failure
- current **C4**, alt **C1**
- note: 분모 켤레 곱해 무리→유리 형태변환 = 표현변환(C4, 유리화) vs 설정(C1)
- occurs 8x. representative rationale:
  - **m3_polynomial_set06 type17 Q49-51 74-85% [type-wide]** 곱셈 공식을 이용한 분모의 유리화
    - Q49~Q51은 분모의 켤레를 곱해 유리화한다. Q51은 유리화 후 f(k)=-√k+√(k+1) 꼴의 합이 망원합으로 소거되는 패턴까지 읽어야 하므로 패턴 추출 오류를 Q51에만 둔다.
  - **m3_polynomial_set06 type18 Q52-54 63-78% [Q[52,54]]** 식의 값 구하기(1) 수가 주어진 경우
    - Q52~Q54는 주어진 수를 바로 대입하지 않고 필요한 관계를 먼저 만든다. Q52·Q54는 역수나 근호분수를 켤레로 정리해야 하고, Q53은 수직선의 두 직각삼각형에서 √5 길이를 구성해야 하므로 문항별 보조 오류를 나눈다.
  - **m3_polynomial_set06 type23 Q67-69 56-66% [type-wide]** 식의 값 구하기(6) 주어진 수를 변형하여 식에 대입하는 경우
    - Q67~Q69는 주어진 근호분수를 먼저 유리화해 x±상수=√k 관계를 만든 뒤 제곱하고 목표식에 대입한다. 변형 전 수를 그대로 대입하거나 음수·근호식을 괄호 없이 넣으면 계산이 크게 늘거나 부호가 손실된다.

### 3. cylinder_unfolding_wrap_count_failure
- current **C4**, alt **C1**
- note: 원기둥 감은횟수를 전개도 가로(=n×밑면둘레)에 반영. 전개 표현변환(C4) vs 가로길이 식세우기(C1)
- occurs 1x. representative rationale:
  - **m2_similarity_set04 type67 Q149-150 68-73% [type-wide]** 원기둥에서의 최단 거리
    - Q149~Q150은 원기둥 옆면을 직사각형으로 펼쳐 감긴 횟수×밑면 둘레를 가로 길이로 두고, 높이와 함께 피타고라스로 실의 최단 길이를 계산한다. Q149~Q150 모두 전개도의 가로 길이를 감긴 횟수와 밑면 둘레에 연결해야 하며, Q150은 그 관계를 역으로 사용해 밑면 둘레를 복원한다.

### 4. graph_translation_intercept_update_failure
- current **C4**, alt **C1**
- note: 평행이동을 식/절편·상수항에 반영 갱신 = 표현변환 결과 갱신(C4) vs 식 재구성(C1)
- occurs 4x. representative rationale:
  - **m2_linear_function_set06 type8 Q8-8 86-86% [type-wide]** 일차함수의 그래프의 x절편, y절편
    - Q8은 y=-1/5x를 y축 방향으로 1만큼 평행이동해 y=-1/5x+1로 바꾼 뒤 x절편을 구한다. 평행이동이 절편에 어떻게 반영되는지 놓치거나 이동된 식을 다시 구성하지 못하면 오답이 된다.
  - **m2_linear_function_set06 type25 Q25-25 80-80% [type-wide]** y=ax+b의 그래프의 성질
    - Q25는 y=2x를 아래로 3만큼 이동한 y=2x-3에 대해 증가량 비, 제2사분면 통과 여부, 점 통과, 다른 그래프와의 일치 여부를 각각 판단한다. 이동 뒤의 그래프 성질을 여러 진술에 일관되게 적용해야 한다.
  - **m2_linear_function_set06 type28 Q28-28 61-61% [type-wide]** 일차함수의 식 구하기(5) - 종합
    - Q28은 두 점 (-5,4),(15,12)에서 기울기 2/5와 절편 6을 구하고 그래프를 아래로 4만큼 이동해 새 식을 만든다. 기울기 계산과 평행이동 후 절편 갱신을 연속해서 해야 한다.

### 5. linear_rate_slope_conversion_failure
- current **C4**, alt **C1**
- note: 상황 단위변화량→기울기(단위당 변화율) 변환 = 표현변환(C4) vs 모델 식세우기(C1). 단위변환·산술과 구별(검수 why)
- occurs 8x. representative rationale:
  - **m2_linear_function_set06 type5 Q5-5 69-69% [type-wide]** 일차함수
    - Q5는 고도 2 km 증가마다 15℃ 감소를 기울기 -15/2로 바꾸고, 지면의 20℃를 절편으로 둔다. 증가량과 감소량의 부호를 반대로 잡거나 2 km당 변화량을 1 km당 기울기로 바꾸지 못하면 틀린다.
  - **m2_linear_function_set06 type29 Q29-29 72-72% [type-wide]** 온도에 대한 문제
    - Q29는 10 m 높아질 때 0.06℃ 하강을 1 m당 -0.006℃의 기울기로 바꾸고 y=25-0.006x에서 y=22를 풀어야 한다. 변화율을 거리 단위에 맞게 환산하고 역으로 높이를 구하는 과정이 핵심이다.
  - **m2_linear_function_set06 type33 Q33-33 85-85% [type-wide]** 여러 가지 일차함수의 활용
    - Q33은 수심 8 m마다 0.8기압 증가를 1 m당 0.1기압으로 바꾸고 수면의 1기압을 초기값으로 더해야 한다. 변화율만 적용하고 기준 압력 1을 빠뜨리는 오프셋 누락이 대표 오류다.

### 6. quadratic_graph_translation_formula_failure
- current **C4**, alt **C1**
- note: ★판례C4: 일반형 평행이동 x치환·상수항 변화를 식으로 = 표현변환(C4). graph_translation_intercept_update(C4) 선례 vs 식재구성(C1)
- occurs 2x. representative rationale:
  - **m3_quadratic_function_set04 type25 Q88-91 58-78% [type-wide]** 이차함수 y=ax²+bx+c의 그래프의 평행이동
    - Q88~Q91은 y=ax²+bx+c의 그래프를 x·y축 방향으로 옮겼을 때 새 식과 꼭짓점을 추적한다. 이동식에서 x의 치환 방향과 상수항 부호가 자주 뒤집히며, Q91은 두 포물선 꼭짓점으로 사분원 넓이까지 계산한다.
  - **m3_quadratic_function_set10 type11 Q81-88 56-83% [type-wide]** 이차함수 y=ax²+bx+c의 그래프의 평행이동
    - Q81~Q88은 일반형 이차함수의 그래프를 x축·y축 방향으로 옮겨 새 식, 교점 거리 또는 이동량을 구한다. x를 x-p로 치환하는 방향과 상수항 변화의 부호를 유지하면서 여러 식을 연쇄 비교해야 하며 Q82는 56%로 가장 낮다.

### 7. root_relation_reduction_failure
- current **C4**, alt **C1**
- note: f(α)=0으로 α²이상 항을 낮은 차수로 환원 = 표현변환(C4, calibration common_subexpression 치환=C4). simplify_before_substitute(A3)보다 구체적 근관계 활용(검수 why) vs 관계 식세우기(C1)
- occurs 2x. representative rationale:
  - **m3_quadratic_equation_set06 type2 Q5-8 61-77% [type-wide]** 이차방정식의 한 근이 문자로 주어졌을 때, 식의 값 구하기
    - Q5~Q8은 한 근 α가 만족하는 f(α)=0을 이용해 α² 이상의 항이나 복잡한 식을 더 낮은 차수로 바꾸어 계산한다. Q5와 Q7은 서로 다른 두 방정식에서 얻은 관계를 함께 써야 하므로 여러 식의 의존 관계 오류를 해당 문항에만 둔다.
  - **m3_quadratic_equation_set12 type1 Q1-8 70-80% [type-wide]** 이차방정식의 한 근이 문자로 주어졌을 때, 식의 값 구하기
    - Q1~Q8은 한 근이 만족하는 이차방정식의 관계를 이용해 제곱항이나 분수식을 낮은 차수의 식으로 환원해 값을 계산한다. Q2·Q4·Q7은 둘 이상의 식·근 조건을 연결하는 단계가 추가되어 여러 식의 의존 관계 오류를 해당 문항에만 둔다.

### 8. three_dimensional_length_reduction_failure
- current **C4**, alt **C1**
- note: 공간→평면 길이 축소 = 변환(C4) vs 식세우기(C1)
- occurs 6x. representative rationale:
  - **m2_similarity_set04 type2 Q3-3 60-60% [type-wide]** 회전체에서 닮음비의 응용
    - Q3은 삼각형을 축 주위로 회전했을 때 생기는 큰 원뿔과 작은 원뿔의 대응 높이·반지름을 먼저 연결해야 한다. 원기둥 반지름 2cm를 원뿔의 단면 반지름으로 읽고, 큰 원뿔과 작은 원뿔의 닮음비 방향을 뒤집지 않는 것이 갈림길이다.
  - **m2_similarity_set04 type66 Q146-148 49-76% [Q[148]]** 입체도형에서의 피타고라스 정리
    - Q146~Q148은 입체의 실제 길이를 한 평면의 직각삼각형으로 내려 피타고라스를 적용한다. Q147은 원뿔 전개도의 호 길이를 밑면 둘레로 바꾼 뒤 높이를 구해야 하고, Q148은 정사각뿔 밑면의 대각선·중심과 높이를 연결해야 하므로 해당 입체 전용 오류를 문항별로 둔다.
  - **m2_similarity_set09 type51 Q148-150 43-46% [type-wide]** 입체도형에서의 피타고라스 정리
    - Q148~Q150은 구와 평면의 교선이 만드는 원의 반지름을 구의 반지름과 중심-평면 거리로 먼저 복원한다. 이후 공간의 A,C,D를 한 평면의 직각삼각형 길이로 내려 AC²+AD²를 계산해야 하므로 단면 인식과 3차원 길이 환원이 핵심이다.

### 9. volume_from_ratio_error
- current **C4**, alt **C1**
- note: 비→실제 길이 변환 후 부피 = 변환(C4) vs 식세우기(C1)
- occurs 5x. representative rationale:
  - **m2_number_expression_set5 type39 Q139-142 57-80% [type-wide]** 도형에서의 다항식의 계산(2) - 입체도형
    - 141·142가 57·62% — 비 4개를 각각 실제 길이로 바꾼 뒤 넓이를 빼야 함. 단계가 길어 중간에 하나씩 놓침
  - **m2_similarity_set04 type43 Q96-98 54-62% [type-wide]** 닮은 두 입체도형의 부피의 비
    - Q96~Q98은 닮음비의 세제곱이 부피비라는 사실을 사용한다. Q96은 큰 삼각뿔에서 작은 삼각뿔을 빼는 뿔대 부피, Q98은 정팔면체와 작은 정사면체들을 합친 입체의 부피 분해가 추가되므로 각각 해당 분해 오류를 문항별로 둔다.
  - **m2_similarity_set04 type44 Q99-100 61-69% [type-wide]** 닮은 두 입체도형의 부피의 비의 활용
    - Q99~Q100은 반지름·높이의 선형비를 세제곱해 부피비로 바꾸는 실생활 응용이다. Q99는 큰 쇠구슬 하나로 만들 수 있는 작은 쇠구슬의 개수를 묻기 때문에 answer_format_mismatch을, Q100은 이미 들어 있는 와인의 부피를 전체에서 빼야 하므로 subtraction_of_regions_omitted를 각각 문항별로 둔다. Q99는 작은 쇠구슬의 개수를 묻기 때문에 계산한 부피값에서 멈추지 않고 개수로 답을 마무리해야 한다.

---
## C1 > C4  (current=C1, alt=C4) : 2

### 1. root_to_factor_equation_setup_failure
- current **C1**, alt **C4**
- note: 두 근 α,β→k(x-α)(x-β)=0 역방향 방정식 재구성 = 식 세우기(C1) vs 근↔인수 변환(C4). 인수분해 역방향(검수 why)
- occurs 5x. representative rationale:
  - **m3_quadratic_equation_set06 type23 Q89-92 68-82% [type-wide]** 이차방정식 구하기(1) 두 근 또는 중근이 주어졌을 때
    - Q89~Q92는 주어진 두 근 α,β에서 (x-α)(x-β)=0을 만들고 필요하면 최고차항 계수를 맞춰 새 이차방정식을 구성한다. Q91은 √2와 √21-2의 정수·소수 부분을 먼저 분리해 실제 두 근을 확정해야 하므로 해당 오류를 Q91에만 둔다.
  - **m3_quadratic_equation_set06 type24 Q93-97 69-78% [type-wide]** 이차방정식 구하기(2) 두 근 사이의 관계식이 주어졌을 때
    - Q93~Q97은 두 근을 α와 α+d 같은 관계식으로 놓고 인수식의 전개 계수를 주어진 이차방정식과 비교한다. Q95~Q96은 m>0, m<0 같은 추가 부호 조건으로 여러 해 중 하나를 선택해야 하므로 범위 조건 누락을 해당 문항에 둔다.
  - **m3_quadratic_equation_set06 type26 Q102-105 75-79% [type-wide]** 한 근이 무리수인 이차방정식
    - Q102~Q105는 유리수 계수 이차방정식에서 한 근이 a-√b 꼴이면 다른 근이 a+√b가 된다는 켤레근 성질을 사용한다. 두 근으로 다시 인수식을 구성해 계수를 비교하는 단계까지 이어지므로 켤레근 인식과 방정식 복원이 함께 요구된다.

### 2. trig_ratio_triangle_reconstruction_failure
- current **C1**, alt **C4**
- note: 삼각비→직각삼각형 재구성 = 식세우기(C1) vs 변환(C4)
- occurs 3x. representative rationale:
  - **m3_trigonometric_ratio_set01 type2 Q5-8 67-89% [type-wide]** 삼각비가 주어진 경우의 삼각형의 변의 길이
    - Q5~Q8은 주어진 sin 값과 한 변의 길이로 직각삼각형의 변 길이를 재구성한 뒤 피타고라스와 삼각형 넓이 공식을 적용한다. Q7의 67%처럼 비를 실제 길이로 바꾸는 단계가 길어지면 삼각형 복원 오류가 바로 넓이 계산으로 이어진다.
  - **m3_trigonometric_ratio_set01 type3 Q9-12 68-85% [type-wide]** 한 삼각비가 주어진 경우의 다른 삼각비의 값
    - Q9~Q12는 한 삼각비로 직각삼각형의 변비를 복원하고 다른 삼각비를 계산한다. Q12는 sin(90°-A)를 cosA로 바꾸는 여각 변환이 추가되고 정답률도 68%로 낮아 해당 오류를 Q12에만 둔다.

---
## C4 > C3  (current=C4, alt=C3) : 8

### 1. coordinate_projection_from_similarity_failure
- current **C4**, alt **C3**
- note: 닮음→좌표 투영 변환 = 변환(C4) vs 연결(C3)
- occurs 1x. representative rationale:

### 2. paper_fold_reflection_distance_mapping_failure
- current **C4**, alt **C3**
- note: 종이접기 반사 등거리를 원도형 길이로 되돌림 변환. 접기↔전개 표현변환(C4) vs 접힌점 대응연결(C3)
- occurs 5x. representative rationale:
  - **m2_geometry_properties_set07 type6 Q19-20 73-91% [type-wide]** 폭이 일정한 종이를 접었을 때
    - Q19~Q20은 폭이 일정한 종이를 접었을 때 접기 전후 대응점의 등거리 관계와 종이의 두 변이 평행하다는 사실을 함께 사용한다. 접힌 점을 원래 위치로 잘못 되돌리거나 평행선에서 각을 잘못 전달하면 각·길이 계산이 무너진다.
  - **m2_similarity_set04 type10 Q24-25 68-68% [type-wide]** 종이접기와 삼각형의 닮음
    - Q24~Q25는 접은 뒤 겹치는 점 사이의 거리가 같다는 반사 성질을 원래 도형의 길이로 되돌린 다음, 새로 생긴 직각삼각형들의 닮음을 이용한다. 접힌 점의 대응을 잘못 잡으면 이후 닮음비가 모두 어긋나는 구조다.
  - **m2_similarity_set04 type65 Q144-145 77-84% [type-wide]** 종이접기와 피타고라스 정리
    - Q144~Q145는 접은 뒤 겹친 점의 거리 같음을 이용해 원래 직사각형 안에 직각삼각형을 재구성하고 피타고라스를 적용한다. Q144는 “틀린 것을 모두” 고르는 복수 선택 문항으로 정답이 ③,⑤이므로 한 개만 고르는 multiple_answer_omission를 Q144에만 둔다. Q144는 틀린 것을 모두 고르는 복수 선택 문항이므로 정답 ③,⑤ 중 하나만 고르는 누락 오류를 별도로 본다.

### 3. parabola_axis_reflection_mapping_failure
- current **C4**, alt **C3**
- note: y=ax²↔y=-ax² x축 대칭에서 식·점 반사 대응 = 좌표 반사변환(C4). paper_fold_reflection(C4) 선례 vs 연결(C3)
- occurs 2x. representative rationale:
  - **m3_quadratic_function_set04 type5 Q15-18 75-81% [type-wide]** 이차함수 y=ax², y=-ax²의 그래프의 관계
    - Q15~Q18은 y=ax²와 y=-ax²가 x축에 대하여 대칭이라는 관계를 이용해 식과 점의 좌표를 옮긴다. 반사할 때 y값의 부호만 바뀐다는 사실과 대입 과정의 부호 처리를 놓치면 대응 그래프·점이 잘못된다.
  - **m3_quadratic_function_set10 type2 Q7-14 68-90% [type-wide]** 이차함수 y=ax², y=-ax²의 그래프의 관계
    - Q7~Q14는 y=ax²와 x축 대칭인 그래프를 식·점·계수로 옮긴다. Q11은 68%로 가장 낮고 대칭 후 점 조건에서 가능한 a를 모두 구해 합해야 하며, Q12~Q14는 정답 2개를 모두 선택해야 한다.

### 4. radical_length_to_number_line_mapping_failure
- current **C4**, alt **C3**
- note: 도형에서 만든 √n 길이를 수직선 기준점·좌우방향에 맞춰 좌표로 이동 = 표현 전이(C4). coordinate_projection_from_similarity_failure(C4) 선례 vs 연결(C3)
- occurs 2x. representative rationale:
  - **m3_real_numbers_and_operations_set07 type15 Q56-59 67-81% [type-wide]** 무리수를 수직선 위에 나타내기
    - Q56~Q59는 정사각형·격자에서 피타고라스로 √2, √5 같은 길이를 만든 뒤 그 길이를 수직선의 좌표와 방향으로 옮긴다. Q57은 구성된 점의 좌표가 유리수인지 무리수인지까지 판별해야 하므로 무리수 포함 관계 오류를 해당 문항에만 둔다.
  - **m3_real_numbers_and_operations_set07 type35 Q145-147 72-81% [type-wide]** 제곱근의 덧셈과 뺄셈의 수직선에의 활용
    - Q145~Q147은 도형에서 얻은 √n 길이를 수직선의 좌표로 옮긴다. Q145·Q146은 직사각형·정사각형의 변 길이를 피타고라스로 먼저 구하고, Q147은 √5와 √6 사이의 중점을 두 번 취한 좌표를 정확히 추적해야 한다.

### 5. same_altitude_area_ratio_transfer_failure
- current **C4**, alt **C3**
- note: 동일높이 삼각형 밑변비→넓이비 이전(선형, 제곱 아님). area_ratio_from_similarity_failure(C4) 병렬 vs 개념연결 이전(C3). 검수 신규유지 확정(닮음 넓이비와 구분)
- occurs 13x. representative rationale:
  - **m2_geometry_properties_set07 type32 Q100-103 50-76% [type-wide]** 평행사변형과 넓이(1) 대각선에 의하여 나뉘는 삼각형
    - Q100~Q103은 평행사변형의 대각선이 만드는 삼각형들의 넓이 관계를 이용해 색칠 영역을 구성한다. Q101·Q103은 합동으로 같은 넓이를 만드는 단계가 추가되므로 합동 조건 선택 오류를 해당 문항에만 둔다.
  - **m2_geometry_properties_set07 type33 Q104-107 34-82% [type-wide]** 평행사변형과 넓이(2) 내부의 한 점
    - Q104~Q107은 평행사변형 내부의 한 점을 잇고 같은 높이를 갖는 삼각형들의 넓이 합을 이용한다. 전체 넓이를 여러 부분으로 나누고 필요한 영역만 더하거나 빼는 과정이 공통 핵심이며 Q104가 34%로 가장 낮다.
  - **m2_geometry_properties_set07 type45 Q137-140 72-79% [type-wide]** 평행선과 삼각형의 넓이
    - Q137~Q140은 평행선 사이에 놓인 삼각형들이 같은 높이를 갖는다는 사실로 넓이를 비교하거나 합·차로 구성한다. 평행선에서 공통 높이를 인식하지 못하거나 필요한 영역을 분해해 식으로 만들지 못하는 오류가 핵심이다.

### 6. scaled_extension_area_ratio_failure
- current **C4**, alt **C3**
- note: 변 연장 넓이비 = 변환(C4) vs 연결(C3)
- occurs 1x. representative rationale:

### 7. similarity_based_subtriangle_area_failure
- current **C4**, alt **C3**
- note: 닮음→부분삼각형 넓이(area_ratio_from_similarity 선례 C4)
- occurs 1x. representative rationale:

### 8. spatial_cross_section_identification_failure
- current **C4**, alt **C3**
- note: 입체→평면 단면 식별·축소 = 표현변환(C4) vs 연결(C3)
- occurs 5x. representative rationale:
  - **m2_similarity_set09 type51 Q148-150 43-46% [type-wide]** 입체도형에서의 피타고라스 정리
    - Q148~Q150은 구와 평면의 교선이 만드는 원의 반지름을 구의 반지름과 중심-평면 거리로 먼저 복원한다. 이후 공간의 A,C,D를 한 평면의 직각삼각형 길이로 내려 AC²+AD²를 계산해야 하므로 단면 인식과 3차원 길이 환원이 핵심이다.
  - **m3_trigonometric_ratio_set01 type8 Q31-35 65-84% [type-wide]** 입체도형에서의 삼각비의 값
    - Q31~Q35는 정육면체·직육면체의 공간 선분을 한 평면의 직각삼각형으로 환원해 길이를 구한다. 면의 대각선과 공간 대각선을 단계별로 피타고라스로 완성해야 하므로 단면 식별과 3차원→2차원 길이 환원이 공통 병목이다.
  - **m3_trigonometric_ratio_set01 type13 Q51-54 54-77% [type-wide]** 특수한 각의 삼각비를 이용하여 입체도형에서의 삼각비의 값 구하기
    - Q51~Q54는 정사면체·사면체의 공간 구조에서 필요한 단면과 수선의 발을 찾아 30°·45°·60° 삼각형으로 환원한다. 공간 길이를 바로 삼각비에 넣지 않고 평면 직각삼각형의 변 길이로 바꾸는 과정이 핵심이다.

---
## C3 > C4  (current=C3, alt=C4) : 1

### 1. parameter_sign_to_graph_mapping_failure
- current **C3**, alt **C4**
- note: ★판례: 매개변수 부호↔그래프 사분면 연결·역추론 = 개념 연결(C3, 해석적). 순수 형태변환 아니라 alt만 C4
- occurs 15x. representative rationale:
  - **m2_linear_function_set06 type18 Q18-18 74-74% [type-wide]** a, b의 부호와 y=ax+b의 그래프(1) - 부호에 따른 사분면
    - Q18은 ab>0와 a+b>0에서 a,b가 모두 양수임을 결론내고 y=-ax+b의 기울기·절편 부호로 그래프를 골라야 한다. 여러 부호 조건의 교집합과 계수 부호를 그래프 방향으로 옮기는 단계가 핵심이다.
  - **m2_linear_function_set06 type19 Q19-19 77-77% [type-wide]** a, b의 부호와 y=ax+b의 그래프(2) - 그래프에 따른 부호
    - Q19는 주어진 y=abx+b 그래프에서 ab<0, b>0을 읽어 a<0을 얻고, y=ax+a-b의 기울기와 절편 부호를 다시 계산한다. 곱의 부호에서 a를 역추론한 뒤 새 식으로 부호를 전달하는 과정에서 흔들릴 수 있다.
  - **m2_linear_function_set06 type20 Q20-20 80-80% [type-wide]** 일차함수의 그래프가 지나는 사분면
    - Q20은 그래프가 제1·2·3사분면을 지나므로 a>0, b>0임을 읽고 보기의 부호식을 판정한다. '옳지 않은 것'을 묻는 부정형과 그래프에서 매개변수 부호를 추론하는 두 단계가 필요하다.

