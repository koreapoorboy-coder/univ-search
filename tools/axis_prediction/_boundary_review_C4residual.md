# Boundary review dossier -- axis C4 residuals (all alts, held excluded)
> Canonical 11 maps. Current axis = C4. Confirm C4 or flip to alt.
- total: 5

---
## C4 > B1  : 1

### 1. recurrence_dot_scope_misread
- note: 순환점 범위 읽기 = 표기 해석(C4) vs 조건(B1)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type10 Q34-37 61-82% [type-wide]** 순환소수의 대소 관계
    - 34~36은 점의 범위 읽기. 37만 61% — "0.6에 가까운 순서"인데 대소 순서로 처리하면 틀림

---
## C4 > B2  : 1

### 1. inequality_bound_conversion_error
- note: 부등식 경계 순환소수 변환 = 변환(C4) vs 범위(B2)
- occurs 12x. rationale:
  - **m2_linear_function_set06 type36 Q36-36 65-65% [type-wide]** 기울기가 주어진 경우의 일차방정식의 계수
    - Q36은 주어진 그래프의 기울기 1/3으로 a를 정하고, 평행한 ax-y+a-3b=0의 y절편이 제2사분면을 지나지 않도록 경계 부등식을 세운다. 평행 조건과 포함되는 경계값을 정확히 처리해야 한다.
  - **m2_linear_function_set06 type44 Q44-44 66-66% [type-wide]** 직선이 선분과 만날 조건
    - Q44는 l과 x+2y-a=0의 교점이 제4사분면의 선분 구간 안에 있어야 한다. 경계선이 l의 x절편 (3,0), y절편 (0,-2)을 지날 때 a=3,-4가 되며 실제 제4사분면 조건은 -4<a<3의 열린구간이다.

---
## C4 > C2  : 2

### 1. complementary_angle_conversion_error
- note: 여각 90-θ 변환 = 변환(C4) vs 개념(C2)
- occurs 7x. rationale:
  - **m3_trigonometric_ratio_set01 type3 Q9-12 68-85% [Q[12]]** 한 삼각비가 주어진 경우의 다른 삼각비의 값
    - Q9~Q12는 한 삼각비로 직각삼각형의 변비를 복원하고 다른 삼각비를 계산한다. Q12는 sin(90°-A)를 cosA로 바꾸는 여각 변환이 추가되고 정답률도 68%로 낮아 해당 오류를 Q12에만 둔다.
  - **m3_trigonometric_ratio_set01 type18 Q72-75 70-89% [Q[74,75]]** 특수한 각(0˚, 90˚)의 삼각비의 값
    - Q72~Q75는 0°·90° 또는 그와 연결되는 특수각의 삼각비를 사용한다. Q74~Q75는 이등변삼각형의 높이가 밑변을 반으로 나누어 B=45°를 만든 뒤 A=90°-B로 바꾸므로 두 기하·여각 오류를 해당 문항에 제한한다.

### 2. obtuse_angle_supplement_conversion_error
- note: 둔각→보각 변환 = 변환(C4) vs 개념(C2)
- occurs 4x. rationale:
  - **m3_trigonometric_ratio_set01 type28 Q112-115 62-88% [Q[112,115]]** 일반 삼각형의 변의 길이(1); 두 변의 길이와 그 끼인각의 크기를 알 때
    - Q112~Q115는 평행사변형·삼각형에서 대각선 길이를 구하기 위해 꼭짓점에서 밑변 또는 연장선에 수선을 내려 직각삼각형을 만든다. Q112의 120°와 Q115의 135°는 각각 60°·45° 보각으로 바꾸어 높이와 수평 성분을 계산해야 한다.
  - **m3_trigonometric_ratio_set01 type33 Q133-135 68-81% [Q[134,135]]** 둔각삼각형의 넓이
    - Q133~Q135는 둔각이 포함된 삼각형 넓이를 1/2·ab·sinC로 계산한다. Q134는 ∠BAC=120°인 큰 삼각형을 두 부분 넓이의 합으로 세우고, Q134~Q135는 120°·135°의 sin 값을 보각의 예각으로 바꾸어 계산해야 한다.

---
## C4 > D3  : 1

### 1. digit_swap_misapplication
- note: ab→ba 자리 교환 = 변환 규칙(C4) vs 계산(D3)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type9 Q30-33 67-90% [type-wide]** 순환소수를 분수로 나타내기(3) - 조건제한이 없는 경우
    - 32·33은 90%대인데 30·31이 70% 이하. 30은 ab→ba 자리 교환, 31은 무한합 형태 인식이 선행

