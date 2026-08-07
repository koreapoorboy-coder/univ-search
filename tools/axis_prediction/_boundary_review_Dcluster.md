# Boundary review dossier -- D cluster (D1 / D2 / D3 residuals)
> Canonical 11 maps, held excluded. D1=manipulate expression, D2=select/substitute formula-data, D3=arithmetic/coefficient.
- total: 17

---
# axis D1  : 7

## D1 > A3 : 1
### 1. substitution_direction_error
- note: 2ⁿ=A 역방향 대입 = 식조작(D1) vs 정리(A3)
- occurs 4x. rationale:
  - **m2_linear_function_set06 type27 Q27-27 76-76% [type-wide]**
    - Q27은 x절편 3, y절편 6에서 원래 y=ax+b의 식을 먼저 정하고, 그 a,b를 새 식 y=bx-a에 올바른 방향으로 대입해야 한다. 원식의 매개변수와 새 식의 자리 역할을 뒤바꾸는 오류가 생기기 쉽다.
  - **m2_linear_function_set09 type24 Q24-24 81-81% [type-wide]**
    - Q24는 x절편 1, y절편 3에서 y=-3x+3이므로 a=-3,b=3을 얻는다. 이를 새 식 y=bx-a에 올바른 자리로 대입해 y=3x+3의 점을 판단해야 한다.

## D1 > B4 : 1
### 1. absolute_value_from_square_root_omitted
- note: √(u²)=|u| 절댓값 생략 = 식조작(D1) vs 부호(B4)
- occurs 12x. rationale:
  - **m3_polynomial_set06 type28 Q82-84 61-69% [type-wide]**
    - Q82~Q84는 근호 안을 (식)²으로 만든 뒤 √(u²)=|u|로 처리하고 a의 범위에 따라 부호를 정해야 한다. 제곱근을 바로 u로 없애거나 범위 조건을 버리면 Q82의 경우분기와 Q83·Q84의 부호가 모두 틀어진다.
  - **m3_polynomial_set10 type10 Q96-96 75-75% [type-wide]**
    - Q96은 두 근호 안을 각각 완전제곱식으로 인수분해한 뒤 √(u²)=|u|로 바꾸고 a<0, b>0 조건으로 절댓값 부호를 결정해야 한다. 완전제곱식 인식, 절댓값 처리, 조건에 따른 부호 선택이 모두 필요하다.

## D1 > C1 : 1
### 1. inverse_operation_setup_error
- note: 빈칸 역연산 세우기 = 식조작(D1) vs 식세우기(C1)
- occurs 12x. rationale:
  - **m2_linear_function_set06 type7 Q7-7 80-80% [type-wide]**
    - Q7은 f(-3), g(4) 조건에서 a,b를 각각 정한 다음 새 함수식으로 f(k)=g(k)를 풀어야 한다. 앞 단계에서 얻은 값들이 뒤 식에 연쇄적으로 의존하므로 중간 변수 연결과 역연산 설정이 핵심이다.
  - **m2_linear_function_set06 type29 Q29-29 72-72% [type-wide]**
    - Q29는 10 m 높아질 때 0.06℃ 하강을 1 m당 -0.006℃의 기울기로 바꾸고 y=25-0.006x에서 y=22를 풀어야 한다. 변화율을 거리 단위에 맞게 환산하고 역으로 높이를 구하는 과정이 핵심이다.

## D1 > C2 : 1
### 1. coefficient_exponent_neglect
- note: 계수에 지수 걸림 누락 = 지수법칙 적용(D1) vs 개념(C2)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type19 Q67-69 75-87% [type-wide]**
    - (−2x²y⁵zᵃ)ᶜ에서 계수 −2에도 지수가 걸리는 걸 빠뜨림

## D1 > C4 : 1
### 1. abstract_notation_application_failure
- note: ★경계재검토: C4->D1 이동(검수). 실패지점=지수법칙으로 양변 정리·검증(E[5ˣ5ʸ]=E[5ˣ]+E[5ʸ] 성립여부)=식조작(D1), 기호 재진술 아님. tier boundary 유지(2회 얕음). ⚠두 사례 결 다름(추상기호재진술/말정의함수적용)-재등장시 분리검토
- occurs 2x. rationale:
  - **m2_linear_function_set09 type5 Q5-5 73-73% [type-wide]**
    - Q5는 f(x)가 'x 이하의 소수의 개수'라는 정의이므로 30 이하의 소수 2,3,5,7,11,13,17,19,23,29를 빠짐없이 세어야 한다. 말로 정의된 함수 규칙을 입력값 30에 적용하고 정수 후보를 누락 없이 열거하는 것이 핵심이다.
  - **m2_number_expression_set5 type20 Q70-73 55-91% [type-wide]**
    - 73이 55%. E[5ⁿ]=n 같은 추상 기호로 법칙을 재진술하는 문항. 71은 규칙 역추적

## D1 > D3 : 2
### 1. inverse_operation_sign_error
- note: 역연산 부호 = 식조작(D1) vs 계산(D3)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type36 Q127-130 52-81% [type-wide]**
    - 129·130이 52·54%로 최저권. 표에서 가로는 더하기·세로는 빼기로 방향이 다른데 이걸 뒤섞음. 빈 칸이 여러 개라 순서대로 풀어야 함

### 2. substitution_parenthesis_omission
- note: 대입 괄호 생략 부호유실 = 식조작(D1) vs 계산(D3)
- occurs 19x. rationale:
  - **m2_linear_function_set06 type3 Q3-3 89-89% [type-wide]**
    - Q3은 f(2)=-4/2와 g(8)=3/4·8+1을 각각 정확히 대입한 뒤 3f(2)+g(8)을 계산한다. 분수·음수 대입 시 괄호와 연산 순서를 놓치면 단순 계산형에서도 오답이 난다.
  - **m2_linear_function_set09 type3 Q3-3 84-84% [type-wide]**
    - Q3은 f(-2)=-7을 먼저 구해 a=-7로 놓고 그 값을 다시 g(a)에 대입한다. 음수 입력을 괄호 없이 처리하거나 첫 함숫값이 다음 함수 입력이 되는 연쇄를 놓치면 오답이 된다.

---
# axis D2  : 3

## D2 > A2 : 1
### 1. trig_table_value_selection_error
- note: 삼각비 표 값 선택 = 자료 선택(D2) vs 암기(A2). 표에서 찾음이라 암기 아님
- occurs 5x. rationale:
  - **m3_trigonometric_ratio_set01 type21 Q84-87 51-83% [type-wide]**
    - Q84~Q87은 삼각비 표에서 필요한 행과 함수를 골라 수치 계산을 한다. Q84는 그림의 87°를 직접 쓰지 않고 3° 여각으로 바꿔야 하며 k를 소수점 아래 넷째 자리에서 반올림해야 하므로 두 추가 오류를 Q84에만 둔다.
  - **m3_trigonometric_ratio_set01 type22 Q88-91 51-93% [type-wide]**
    - Q88~Q91은 길이비를 먼저 만들고 삼각비 표에서 그 값과 일치하는 각을 찾는다. Q88~Q90은 주어진 길이를 올바른 직각삼각형의 sin·cos·tan에 넣어야 하고, Q91은 사분원 좌표값 0.7986을 어느 투영 성분으로 읽을지 구분해야 한다.

## D2 > C2 : 1
### 1. custom_operator_definition_misapplication
- note: 새 연산 정의 적용 = 정의대입(D2) vs 개념(C2)
- occurs 2x. rationale:
  - **m2_number_expression_set5 type37 Q131-134 55-76% [type-wide]**
    - 131(55%) 최저. 134(60%)는 순서쌍 연산 같은 새 연산 정의를 그대로 적용하는 문항
  - **m3_quadratic_equation_set06 type19 Q76-78 50-65% [type-wide]**
    - Q76~Q78은 새 기호로 정의된 연산을 먼저 정확히 펼친 뒤 그 결과를 이차방정식으로 풀어야 한다. Q77~Q78은 해가 개수·소수 조건을 만족하도록 가능한 자연수 값을 모두 세므로 정수 후보 누락을 해당 문항에만 둔다.

## D2 > D3 : 1
### 1. quadratic_formula_coefficient_substitution_failure
- note: ★검수 D2: 근의공식에 a,b,c 자리·부호(-b,2a,b²-4ac) 대응 대입 = 공식 대입(D2). calibration custom_operator·volume_formula=D2 확증. square_formula_middle_term(D3, 계수계산)과 갈림-여긴 대입자리(D2) vs 계산실수(D3)
- occurs 3x. rationale:
  - **m3_quadratic_equation_set06 type13 Q47-51 73-84% [type-wide]**
    - Q47~Q51은 근의 공식에서 a,b,c를 정확한 자리에 넣고 -b, 2a, b²-4ac의 부호를 유지해야 한다. Q49~Q50은 구한 근 중 양수·부등식 조건을 만족하는 값만 선택하므로 범위 조건 누락을 해당 문항에 둔다.
  - **m3_quadratic_equation_set06 type14 Q52-56 68-83% [type-wide]**
    - Q52~Q56은 근의 공식으로 얻은 표현을 문제에 주어진 B±√C 형태와 비교해 미지 계수를 역으로 결정한다. 공식 대입 결과와 추가 계수식을 연결한 뒤 A+B, A-B 같은 최종 요구값까지 가야 하므로 중간 근 표현에서 멈추는 오류도 함께 본다.

---
# axis D3  : 7

## D3 > C1 : 1
### 1. composite_length_accumulation_error
- note: 부분 길이 합산 = 계산(D3) vs 누적식(C1)
- occurs 2x. rationale:
  - **m3_trigonometric_ratio_set01 type12 Q47-50 78-87% [Q[49]]**
    - Q47~Q50은 30°·45° 등의 특수각을 여러 직각삼각형에 연속 적용해 길이를 옮긴다. Q49는 세 변을 따로 구한 뒤 사각형 둘레로 합산해야 하므로 부분 길이를 최종 길이에 누적하는 오류를 Q49에만 둔다.

## D3 > C2 : 3
### 1. arrangement_factorial_count_error
- note: n!·nPr 단계적 세기 계산 실행 오류 = 계산(D3). 배열 '구성'(fixed/adjacent 등 C1)과 구분한 순수 계산단계
- occurs 7x. rationale:
  - **m2_probability_set06 type9 Q30-33 69-79% [type-wide]**
    - Q30~Q33은 특정 사람·책·자리의 위치를 먼저 고정하거나 제외한 뒤 남은 대상을 일렬로 배열한다. Q30~Q32는 배열 대상에서 특정 항목을 빼야 하므로 제외 대상을 다시 포함하는 오류를 해당 문항에만 둔다.
  - **m2_probability_set06 type10 Q34-37 65-75% [type-wide]**
    - Q34~Q37은 서로 붙어야 하거나 정해진 상대 위치를 가져야 하는 대상을 하나의 묶음처럼 처리한 뒤 묶음 내부 순서까지 세어야 한다. 묶음을 한 개로 줄인 외부 배열 수와 묶음 안의 순서를 한쪽만 계산하는 오류가 핵심이다.

### 2. square_formula_middle_term_error
- note: ★검수판단: 합·차 제곱 중항 ±2ab 계수·부호 오류. triangle_area_sine_factor_omitted(D3/alt C2, ½누락) 선례 그대로 = 공식 계산실수(D3) vs 공식기억(C2)
- occurs 7x. rationale:
  - **m3_polynomial_set06 type2 Q4-6 75-81% [type-wide]**
    - Q4~Q6은 (x+A)²의 A²와 2A를 동시에 맞추는 유형이다. 세 문항 모두 가능한 값이 복수라서 한 경우만 고르는 오류를 별도로 보며, A의 부호가 바뀌면 중항 부호도 함께 바뀌는 점이 핵심이다.
  - **m3_polynomial_set06 type3 Q7-9 74-82% [type-wide]**
    - Q7~Q9은 (a-b)²=a²-2ab+b²에서 음수와 괄호의 위치까지 포함해 전개식을 비교한다. 특히 바깥의 음수와 괄호 안 부호를 중항 부호와 혼동하면 같은 제곱식으로 잘못 판단한다.

### 3. triangle_area_sine_factor_omitted
- note: ½ab sinC 요소 누락 = 공식 계산실수(D3) vs 개념(C2). 검수관찰: ½ 누락은 공식기억 오류(C2)에 가까울 수 있음 — D3·boundary 유지, 유사사례 시 재검토
- occurs 7x. rationale:
  - **m3_trigonometric_ratio_set01 type32 Q130-132 53-62% [type-wide]**
    - Q130~Q132는 1/2·ab·sinC를 이용해 예각삼각형의 넓이를 식으로 만든다. Q130~Q131은 직사각형·정사각형 전체에서 주변 삼각형 넓이를 빼 내부 넓이를 구성하고, Q132는 같은 높이를 가진 △ABD와 △ACD의 넓이비를 BD:DC로 옮긴다.
  - **m3_trigonometric_ratio_set01 type33 Q133-135 68-81% [type-wide]**
    - Q133~Q135는 둔각이 포함된 삼각형 넓이를 1/2·ab·sinC로 계산한다. Q134는 ∠BAC=120°인 큰 삼각형을 두 부분 넓이의 합으로 세우고, Q134~Q135는 120°·135°의 sin 값을 보각의 예각으로 바꾸어 계산해야 한다.

## D3 > C4 : 1
### 1. digit_swap_misapplication
- note: ★경계재검토: C4->D3 이동(검수). ab→ba는 다른 값(0.a̅b̅≠0.b̅a̅)이라 표기변환 아님·자리 바꿔 새 값 만들어 (ba-b)/90 재계산=D3. tier boundary 유지(1회)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type9 Q30-33 67-90% [type-wide]**
    - 32·33은 90%대인데 30·31이 70% 이하. 30은 ab→ba 자리 교환, 31은 무한합 형태 인식이 선행

## D3 > D1 : 1
### 1. sign_carry_through_layers
- note: 부호 층 전달 = 계산(D3) vs 식조작(D1)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type35 Q124-126 65-88% [type-wide]**
    - 소·중·대괄호 안쪽부터. 125(65%)는 3중

## D3 > D2 : 1
### 1. quadrilateral_diagonal_area_formula_factor_error
- note: ½d1d2 sinθ 계수 오류 = 계산실수(D3) vs 공식대입(D2)
- occurs 2x. rationale:
  - **m3_trigonometric_ratio_set01 type37 Q147-150 79-89% [type-wide]**
    - Q147~Q150은 사각형 넓이 1/2·d1·d2·sinθ에서 대각선 길이와 사잇각을 서로 복원한다. Q149~Q150은 같은 sin 값에서 각의 범위를 이용해 올바른 각을 골라야 하고, Q150은 sin(180°-x)로 둔각 x를 보각의 예각과 연결한다.

