# Boundary review dossier -- A/B residuals (current axis A3 / B1 / B2)
> Canonical 11 maps, held excluded. A3=organize what is asked/given, B1=given condition omitted, B2=range handling.
- total: 6

---
# axis A3  : 3

## A3 > B1 : 1
### 1. incomplete_division_overread
- note: 나눗셈 덜 됐는데 마디 확정 = 정보 충분성 정리(A3) vs 조건(B1)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type6 Q19-22 59-83% [type-wide]**
    - 19·20·22 모두 "알아낼 수 없는 것" 고르기. 주어진 나눗셈이 한 바퀴를 못 돌았는데 마디를 확정해버림

## A3 > C1 : 1
### 1. polynomial_reordering_for_factorization_failure
- note: 한 문자 기준 내림차순 재배열 전처리 = 식 정리 전처리(A3, simplify_before_substitute 선례) vs 구조 세우기(C1)
- occurs 2x. rationale:
  - **m3_polynomial_set06 type44 Q127-129 69-83% [type-wide]**
    - Q127~Q129는 y에 대해 내림차순으로 정리한 뒤 같은 일차식이 공통인수로 나오도록 묶는다. Q128·Q129는 완성된 인수분해식에서 가능한 인수를 각각 2개 모두 골라야 한다.
  - **m3_polynomial_set06 type45 Q130-132 67-78% [type-wide]**
    - Q130~Q132는 한 문자에 대해 이차식으로 정리했을 때 처음에는 공통부분이 보이지 않으므로 상수항 쪽까지 인수분해 구조를 만들어야 한다. Q131처럼 교차곱으로 중항을 맞추는 과정에서 부호를 바꾸면 인수 전체가 달라진다.

## A3 > C4 : 1
### 1. reduction_before_test_omitted
- note: 약분 먼저 안 하고 판정 = 절차 정리 안 함(A3) vs 표현 정리(C4)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type1 Q1-4 48-86% [type-wide]**
    - 약분 전 분모로 판정하면 전멸. 02·06이 "없는"으로 부정 조건. 04만 48%인데 유일하게 수열 규칙 추출이 선행

---
# axis B1  : 1

## B1 > C1 : 1
### 1. denominator_multiple_condition_error
- note: 분모 배수 조건 = 조건(B1) vs 식세우기(C1)
- occurs 2x. rationale:
  - **m2_number_expression_set5 type15 Q54-56 63-84% [type-wide]**
    - 55(63%)는 개수 세기. 54는 정답 2개인데 하나만 고름
  - **m3_real_numbers_and_operations_set07 type9 Q31-33 52-89% [type-wide]**
    - Q31~Q33은 √(A/x)가 자연수가 되려면 먼저 x가 분모를 없애는 약수여야 하고 A/x가 완전제곱수가 되어야 한다. Q31과 Q33은 두 근호 조건을 동시에 만족시켜야 하며 Q33이 52%로 가장 낮아 조건 교집합 누락을 별도로 둔다.

---
# axis B2  : 2

## B2 > C1 : 1
### 1. line_intersection_parameter_range_failure
- note: 직선-도형 교차 조건을 경계직선에서 매개변수 범위(열린/닫힌구간)로 = 범위 처리(B2) vs 조건식(C1)
- occurs 3x. rationale:
  - **m2_linear_function_set06 type44 Q44-44 66-66% [type-wide]**
    - Q44는 l과 x+2y-a=0의 교점이 제4사분면의 선분 구간 안에 있어야 한다. 경계선이 l의 x절편 (3,0), y절편 (0,-2)을 지날 때 a=3,-4가 되며 실제 제4사분면 조건은 -4<a<3의 열린구간이다.
  - **m2_linear_function_set06 type50 Q50-50 72-72% [type-wide]**
    - Q50은 원점을 지나는 y=ax가 삼각형 ABC와 만나려면 기울기가 OB=3과 OC=1/3 사이여야 하고 경계선도 포함된다. 도형과의 교차 조건을 기울기 범위로 바꾸고 포함 경계값을 유지해야 한다.

## B2 > C2 : 1
### 1. discrete_solution_graph_continuity_error
- note: 정수(이산) 정의역 조건 무시하고 연속직선으로 = 정의역·범위 무시(B2) vs 이산↔연속 개념(C2)
- occurs 2x. rationale:
  - **m2_linear_function_set06 type34 Q34-34 63-63% [type-wide]**
    - Q34는 x,y가 음이 아닌 정수이므로 x+y=4의 그래프는 연속 직선이 아니라 (0,4),(1,3),…,(4,0)의 이산 점들이다. 정수 조건을 버리고 연속 그래프로 그리는 오류를 구분해야 한다.
  - **m2_linear_function_set09 type29 Q29-29 55-55% [type-wide]**
    - Q29는 x,y가 정수라는 조건 때문에 x+y=5의 해를 연속 직선으로 그리는 것이 아니라 (...,-1,6),(0,5),(1,4),... 같은 이산 점으로 나타내야 한다. 정수 후보를 빠짐없이 열거하고 연속 그래프로 과잉 확장하지 않는 것이 핵심이다.

