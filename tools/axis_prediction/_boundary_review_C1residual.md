# Boundary review dossier -- axis C1 residuals (all alts, held excluded)
> Canonical 11 maps. Current axis = C1. Confirm C1 or flip to alt.
- total: 10

---
## C1 > A2  : 1

### 1. special_angle_area_height_failure
- note: 특수각 높이·넓이 식 = 식세우기(C1) vs 암기(A2)
- occurs 2x. rationale:
  - **m3_trigonometric_ratio_set01 type16 Q64-67 82-88% [type-wide]** 특수한 각의 삼각비의 도형에의 활용
    - Q64~Q67은 30°·45°·60°에서 높이와 밑변 길이를 만든 뒤 삼각형 넓이를 계산한다. 한 도형 안에 여러 직각삼각형이 연속되므로 특수각에서 구한 길이를 다음 넓이식으로 정확히 전달해야 한다.

---
## C1 > B1  : 2

### 1. perfect_square_trinomial_condition_failure
- note: ax²+bx+c 완전제곱 조건(b²=4ac류) 조건식 세우기 = 식 세우기(C1) vs 조건 누락(B1). 검수 why: 단순 공식암기와 구별
- occurs 4x. rationale:
  - **m3_polynomial_set06 type27 Q79-81 52-63% [type-wide]** 완전제곱식이 될 조건
    - Q79~Q81은 완전제곱이 되도록 미정계수 사이의 관계를 세워야 한다. Q80은 52%로 100 이하 자연수 순서쌍을 모두 세어야 하고, Q81은 서로 다른 두 이차식이 동시에 완전제곱이 되는 조건을 각각 구해 합치므로 문항별 추가 오류를 둔다.
  - **m3_polynomial_set10 type9 Q85-95 64-81% [type-wide]** 완전제곱식이 될 조건
    - Q85~Q95는 주어진 이차식이 완전제곱식이 되도록 양 끝항과 중항의 관계를 동시에 맞춰야 한다. ±2ab의 계수·부호를 잘못 읽는 오류가 대표적이며, Q90과 Q92는 각각 정답이 두 개라 한 경우만 고르는 오류를 해당 문항에만 둔다.

### 2. subtraction_of_regions_omitted
- note: 전체−부분 접근 못 잡음 = 식세우기(C1) vs 조건(B1)
- occurs 4x. rationale:
  - **m2_number_expression_set5 type38 Q135-138 54-76% [type-wide]** 도형에서의 다항식의 계산(1) - 평면도형
    - 137이 54%. 전체에서 부분을 빼는 접근을 못 잡음. 136은 규칙에서 세로 길이를 x식으로 세우기
  - **m2_similarity_set04 type43 Q96-98 54-62% [Q[96]]** 닮은 두 입체도형의 부피의 비
    - Q96~Q98은 닮음비의 세제곱이 부피비라는 사실을 사용한다. Q96은 큰 삼각뿔에서 작은 삼각뿔을 빼는 뿔대 부피, Q98은 정팔면체와 작은 정사면체들을 합친 입체의 부피 분해가 추가되므로 각각 해당 분해 오류를 문항별로 둔다.

---
## C1 > B2  : 1

### 1. irrational_integer_fractional_part_split_failure
- note: 무리수 정수부분·소수부분 분리 식 세우기 = 식 세우기(C1) vs 범위 판단(B2, √k 어느 두 정수 사이)
- occurs 4x. rationale:
  - **m3_polynomial_set06 type24 Q70-72 50-69% [type-wide]** 식의 값 구하기(7) 무리수의 정수 부분과 소수 부분
    - Q70~Q72는 유리화한 수가 어느 두 정수 사이인지 확인해 소수 부분을 만들고 그 과정을 반복한다. Q71·Q72는 50%대이며 f(1),1/f(1),f(2)…가 주기적으로 이어지는 연쇄를 80~100항까지 합해야 하므로 다단계 오류를 해당 문항에 둔다.
  - **m3_polynomial_set10 type14 Q124-135 61-85% [Q[131]]** 인수분해 공식을 이용하여 식의 값 구하기(1) 문자의 값이 주어질 때
    - Q124~Q135는 주어진 문자값을 바로 대입하기보다 식을 먼저 인수분해·유리화해 계산 구조를 단순화해야 한다. Q131은 3+2√2의 소수 부분을 정확히 분리해 x=2√2−2로 놓는 조작이 추가되므로 무리수의 정수·소수 부분 분리 오류를 Q131에만 둔다.

---
## C1 > D1  : 2

### 1. grouping_for_factorization_failure
- note: 여러 항 묶어 공통인수 나오게 묶음 전략 구성 = 전략 세우기(C1) vs 식 조작(D1)
- occurs 2x. rationale:
  - **m3_polynomial_set06 type42 Q121-123 52-79% [type-wide]** 적당한 항끼리 묶어 인수분해 하기(1) 두 항씩 묶기
    - Q121~Q123은 두 항씩 묶어 같은 공통인수를 만든 뒤 다시 한 번 묶어야 한다. Q121·Q122는 인수분해 후 가능한 정수 경우를 모두 세며, Q122는 확률을 396/1296에서 11/36으로 기약해야 하므로 최종 약분 누락을 Q122에 둔다.
  - **m3_polynomial_set06 type43 Q124-126 55-75% [type-wide]** 적당한 항끼리 묶어 인수분해 하기(2) ( )²-( )²꼴
    - Q124~Q126은 일부 항을 먼저 완전제곱으로 묶어 ( )²-( )² 꼴을 만든 뒤 합과 차로 인수분해한다. Q124·Q125는 인수인 것을 각각 2개 모두 골라야 하므로 복수정답 누락을 두 문항에 둔다.

### 2. right_triangle_altitude_geometric_mean_failure
- note: 직각삼각형 높이 기하평균 식(DE²=AE×CE)
- occurs 7x. rationale:
  - **m2_similarity_set04 type9 Q21-23 53-61% [type-wide]** 직각삼각형의 닮음의 응용
    - Q21~Q23은 직각삼각형 또는 직사각형의 대각선에 내린 수선에서 생기는 작은 직각삼각형들의 닮음을 이용한다. 해설형 풀이의 핵심 관계가 높이의 기하평균 또는 투영 길이 비로 이어지며, Q22·Q23은 마지막에 삼각형·직사각형의 넓이를 복원해야 한다.
  - **m2_similarity_set04 type50 Q111-113 56-69% [type-wide]** 직각삼각형의 닮음과 피타고라스 정리
    - Q111~Q113은 빗변에 내린 높이 또는 추가 수선으로 생긴 작은 직각삼각형들이 원래 삼각형과 닮는다는 관계를 피타고라스와 함께 사용한다. Q113은 수선 HQ까지 한 번 더 들어가 두 단계의 닮음을 거쳐 AQ+CH를 구해야 하므로 multi_triangle_length_chain_failure를 Q113에만 둔다.

---
## C1 > D2  : 2

### 1. cross_product_factorization_coefficient_matching_failure
- note: acx²+... 교차곱 합으로 x계수 맞추는 조건 세우기 = 식 세우기(C1) vs 공식 적용(D2)
- occurs 2x. rationale:
  - **m3_polynomial_set06 type31 Q90-92 58-77% [type-wide]** 인수분해 공식(4) acx²+(ad+bc)x+bd=(ax+b)(cx+d)
    - Q90~Q92는 최고차항과 상수항의 인수쌍을 정한 뒤 교차곱의 합으로 x계수를 맞춘다. Q90은 58%로 가장 낮고 주어진 한 인수에서 나머지 계수를 역으로 복원해야 해 계수 간 의존이 특히 크다.
  - **m3_polynomial_set06 type45 Q130-132 67-78% [type-wide]** 내림차순으로 정리하여 인수분해 하기(2) 공통부분이 없는 경우
    - Q130~Q132는 한 문자에 대해 이차식으로 정리했을 때 처음에는 공통부분이 보이지 않으므로 상수항 쪽까지 인수분해 구조를 만들어야 한다. Q131처럼 교차곱으로 중항을 맞추는 과정에서 부호를 바꾸면 인수 전체가 달라진다.

### 2. factor_pair_sum_product_matching_failure
- note: x²+px+q에서 합=p·곱=q 인수쌍 조건 세워 탐색 = 식 세우기(C1) vs 공식 적용(D2)
- occurs 13x. rationale:
  - **m3_polynomial_set06 type6 Q16-18 72-80% [type-wide]** 곱셈 공식(4) 일차항의 계수가 1인 두 일차식의 곱
    - Q16~Q18은 (x+a)(x+b)에서 a+b와 ab를 계수와 연결한다. Q16은 ab=-15인 정수쌍을 모두 조사한 뒤 가능한 P 중 가장 작은 값을 골라야 하므로 후보 열거와 최솟값 선택을 Q16에만 둔다.
  - **m3_polynomial_set06 type30 Q87-89 75-83% [type-wide]** 인수분해 공식(3) x²+(a+b)x+ab=(x+a)(x+b)
    - Q87~Q89는 상수항의 정수 인수쌍을 모두 만들고 합으로 x의 계수를 맞춘다. Q87은 가능한 p의 최솟값, Q89는 최댓값을 묻기 때문에 후보 누락과 극값 선택 오류를 두 문항에만 둔다.

---
## C1 > D3  : 2

### 1. adjacent_block_arrangement_failure
- note: 이웃 대상 묶음 처리+내부순서 = 배열 구성 세우기(C1) vs 계산(D3)
- occurs 4x. rationale:
  - **m2_probability_set06 type10 Q34-37 65-75% [type-wide]** 일렬로 세우는 경우의 수(3) 이웃하는 경우
    - Q34~Q37은 서로 붙어야 하거나 정해진 상대 위치를 가져야 하는 대상을 하나의 묶음처럼 처리한 뒤 묶음 내부 순서까지 세어야 한다. 묶음을 한 개로 줄인 외부 배열 수와 묶음 안의 순서를 한쪽만 계산하는 오류가 핵심이다.
  - **m2_probability_set06 type24 Q80-83 58-76% [Q[80,82,83]]** 확률 구하기(1) 일렬로 세울 때 확률 구하기
    - Q80~Q83은 일렬 배열 전체 경우와 조건을 만족하는 배열을 각각 센 뒤 확률을 구한다. Q80·Q82·Q83은 특정 대상이 이웃하는 배열을 묶음으로 처리해야 하므로 인접 묶음 오류를 해당 문항에만 적용한다.

### 2. fixed_position_arrangement_failure
- note: 특정 대상 자리 고정 후 남은 자리 배열 = 배열 구성 세우기(C1) vs 계산(D3)
- occurs 1x. rationale:
  - **m2_probability_set06 type9 Q30-33 69-79% [type-wide]** 일렬로 세우는 경우의 수(2) 특정한 사람의 자리를 고정하는 경우
    - Q30~Q33은 특정 사람·책·자리의 위치를 먼저 고정하거나 제외한 뒤 남은 대상을 일렬로 배열한다. Q30~Q32는 배열 대상에서 특정 항목을 빼야 하므로 제외 대상을 다시 포함하는 오류를 해당 문항에만 둔다.

