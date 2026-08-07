# Boundary review dossier -- C4<->D1 and C1<->C2
> Canonical 11 maps. C4 vs D1 = notation change / expression manipulation. C1 vs C2 = build equation / know concept.

---
## C4 > D1  (current=C4, alt=D1) : 6

### 1. abstract_notation_application_failure
- current **C4**, alt **D1**
- note: E[5ⁿ]=n 추상기호 재진술 = 표현변환(C4) vs 식조작(D1)
- occurs 2x. representative rationale:
  - **m2_linear_function_set09 type5 Q5-5 73-73% [type-wide]** f(x)=(x에 대한 조건)꼴인 함수의 함숫값
    - Q5는 f(x)가 'x 이하의 소수의 개수'라는 정의이므로 30 이하의 소수 2,3,5,7,11,13,17,19,23,29를 빠짐없이 세어야 한다. 말로 정의된 함수 규칙을 입력값 30에 적용하고 정수 후보를 누락 없이 열거하는 것이 핵심이다.
  - **m2_number_expression_set5 type20 Q70-73 55-91% [type-wide]** 지수법칙(6) - 종합
    - 73이 55%. E[5ⁿ]=n 같은 추상 기호로 법칙을 재진술하는 문항. 71은 규칙 역추적

### 2. completing_square_vertex_axis_failure
- current **C4**, alt **D1**
- note: ★판례C4: ax²+bx+c→a(x-p)²+q 완전제곱 형태변환 = 표현변환(C4) vs 식조작(D1)
- occurs 4x. representative rationale:
  - **m3_quadratic_function_set04 type21 Q73-75 53-80% [type-wide]** 이차함수 y=ax²+bx+c의 그래프의 꼭짓점과 축의 방정식
    - Q73~Q75는 y=ax²+bx+c를 완전제곱식으로 바꾸어 꼭짓점과 축을 찾는다. Q73은 53%로 낮고 분수 계수까지 포함해 완전제곱을 해야 하므로 분수 계수 정리를 해당 문항에만 추가한다.
  - **m3_quadratic_function_set04 type26 Q92-94 65-82% [type-wide]** 이차함수 y=ax²+bx+c의 그래프에서 증가·감소하는 범위
    - Q92~Q94는 일반형을 꼭짓점 형태로 해석해 증가·감소 구간을 찾고 평행이동 후 구간 변화를 추적한다. Q93·Q94는 이동량이 축 위치를 어떻게 바꾸는지까지 포함해 평행이동 부호를 해당 문항에만 추가한다.
  - **m3_quadratic_function_set04 type27 Q95-98 76-79% [type-wide]** 이차함수 y=ax²+bx+c의 그래프의 성질
    - Q95~Q98은 일반형 포물선의 꼭짓점·축·교점·폭·사분면을 종합 판정한다. Q95는 맞는 설명 2개를 모두 골라야 하므로 완전제곱식 해석 뒤 복수정답 누락을 별도로 확인한다.

### 3. exponent_equation_base_matching_error
- current **C4**, alt **D1**
- note: 지수방정식 밑 맞추기 = 표현통일(C4) vs 식조작(D1)
- occurs 1x. representative rationale:
  - **m2_number_expression_set5 type27 Q98-101 67-82% [type-wide]** 지수에 미지수가 포함된 방정식의 풀이
    - 4^(x+1)+4ˣ+4^(x−1)에서 4ˣ로 묶어내기. 99는 소인수분해로 2의 지수 세기

### 4. mixed_recurring_subtraction_omitted
- current **C4**, alt **D1**
- note: 순환소수→분수 뺄셈 단계 = 표현변환 절차(C4) vs 식조작(D1)
- occurs 1x. representative rationale:
  - **m2_number_expression_set5 type9 Q30-33 67-90% [type-wide]** 순환소수를 분수로 나타내기(3) - 조건제한이 없는 경우
    - 32·33은 90%대인데 30·31이 70% 이하. 30은 ab→ba 자리 교환, 31은 무한합 형태 인식이 선행

### 5. power_of_ten_extraction_failure
- current **C4**, alt **D1**
- note: 10ⁿ 꼴 묶기 = 표현변환(C4) vs 식조작(D1)
- occurs 5x. representative rationale:
  - **m2_number_expression_set5 type26 Q94-97 64-81% [type-wide]** 지수법칙의 응용(5) - 지수법칙과 자연수의 자릿수
    - 2ᵃ×5ᵇ를 10ⁿ 꼴로 묶고 남은 계수의 자릿수를 더함. n자리인지 n+1자리인지에서 하나 어긋남
  - **m3_quadratic_equation_set06 type17 Q67-70 73-79% [type-wide]** 복잡한 이차방정식의 풀이(3) 계수가 소수인 경우
    - Q67~Q70은 소수계수를 10의 거듭제곱으로 확대해 정수계수 이차방정식으로 바꾼 뒤 푼다. Q68과 Q70은 제시된 풀이 중 옳고 그름을 판별하는 문항이라 적용한 법칙·계산 순서의 선택 오류를 해당 문항에만 둔다.
  - **m3_quadratic_equation_set12 type9 Q63-70 69-90% [type-wide]** 복잡한 이차방정식의 풀이(3) 계수가 소수인 경우
    - Q63~Q70은 소수 계수를 10의 거듭제곱으로 없애 정수계수 식으로 바꾼 뒤 해를 판정한다. Q68은 큰 근 이하의 최대 정수, Q69는 두 근 사이의 자연수 개수, Q70은 여러 식 중 절댓값이 가장 큰 음의 근을 골라야 하므로 후보 열거·최댓값 선택을 문항별로 제한한다.

### 6. radical_product_simplification_error
- current **C4**, alt **D1**
- note: ★C4: √a·√b=√(ab)로 근호 합쳐 정리 = 형태변환(C4) vs 계산조작(D1). radical_ratio_simplification(나눗셈비)과 곱/나눗셈 구분
- occurs 3x. representative rationale:
  - **m3_real_numbers_and_operations_set07 type18 Q69-72 76-90% [type-wide]** 근호가 있는 식의 변형(1) √a²b
    - Q69~Q72는 √a·√b=√(ab)로 근호를 합친 뒤 완전제곱 인수를 밖으로 꺼내 계수를 맞춘다. Q72는 여섯 개의 근호 곱을 한꺼번에 소인수 지수로 정리해야 하므로 연쇄 계산 오류를 문항 한정으로 둔다.
  - **m3_real_numbers_and_operations_set07 type19 Q73-77 70-86% [type-wide]** 근호가 있는 식의 변형(2) a√b
    - Q73~Q77은 a√b↔√(a²b) 변형으로 계수를 근호 안팎으로 이동시키고 같은 근호 계수를 비교한다. Q75~Q77은 a,b 두 미지수나 ab 조건을 함께 유지해야 해 한 식에서 구한 관계를 다른 식에 연결하지 못하는 오류를 별도로 둔다.
  - **m3_real_numbers_and_operations_set07 type25 Q99-102 75-81% [type-wide]** 제곱근의 곱셈과 나눗셈의 혼합 계산
    - Q99~Q102는 근호의 곱셈과 나눗셈이 한 식에 섞여 있어 곱·나눗셈을 같은 우선순위로 왼쪽부터 처리하면서 근호를 합쳐야 한다. Q99의 옳고 그름 판별에서도 나눗셈 뒤 곱셈 순서를 바꾸면 다른 보기가 참처럼 보인다.

---
## D1 > C4  (current=D1, alt=C4) : 0

---
## C1 > C2  (current=C1, alt=C2) : 6

### 1. complement_probability_setup_failure
- current **C1**, alt **C2**
- note: P(A^c)=1-P(A) 여사건 확률 설정 = 식 세우기(C1) vs 여사건 개념(C2)
- occurs 8x. representative rationale:
  - **m2_probability_set06 type28 Q93-96 60-79% [type-wide]** 어떤 사건이 일어나지 않을 확률
    - Q93~Q96은 직접 세기 어려운 “일어나지 않을” 사건을 전체에서 원래 사건의 확률을 빼는 여사건으로 바꾼다. 부정 조건을 반대로 읽거나 여사건의 표본공간을 원래 사건과 다르게 잡는 오류를 구분해 본다.
  - **m2_probability_set06 type29 Q97-100 62-72% [type-wide]** 적어도의 조건을 포함하는 확률
    - Q97~Q100은 “적어도 하나”를 직접 여러 경우로 나누기보다 “하나도 없는 경우”의 여사건으로 바꾸는 것이 핵심이다. 적어도 하나와 정확히 하나를 혼동하거나 여사건의 유리한 경우를 잘못 세면 오답이 된다.
  - **m2_probability_set06 type37 Q127-130 65-74% [Q[129]]** 게임에서 이길 확률
    - Q127~Q130은 승자가 결정되는 순간 이후의 시행은 세지 않는 종료 조건을 유지하면서 가능한 승리 경로의 확률을 합한다. Q129는 승부가 결정될 확률을 무승부의 여사건으로 처리할 수 있어 여사건 설정 오류를 해당 문항에만 둔다.

### 2. irrational_coefficient_cancellation_condition_failure
- current **C1**, alt **C2**
- note: ★C1: p+q√n 유리수 되려면 '무리수항 계수 q=0' 조건 세움 = 조건 세우기(C1) vs 개념(C2). B1 아님(검수 지시)
- occurs 1x. representative rationale:
  - **m3_real_numbers_and_operations_set07 type32 Q131-134 60-72% [type-wide]** 제곱근의 계산 결과가 유리수가 될 조건
    - Q131~Q134는 식을 p+q√n 꼴로 모은 뒤 결과가 유리수가 되려면 무리수항의 계수 q가 0이어야 함을 이용한다. Q132는 k를 결정한 뒤 다시 일차부등식으로 넘어가 가장 큰 정수를 골라야 하므로 부등식 경계 변환을 문항 한정으로 둔다.

### 3. perfect_square_radicand_condition_failure
- current **C1**, alt **C2**
- note: ★C1: √N이 자연수·정수 되려면 'N=완전제곱' 조건을 스스로 세움 = 조건 세우기(C1) vs 완전제곱 개념(C2). B1(주어진 조건 누락)로 밀지 말 것 - 검수 지시·B1/C2 판례
- occurs 5x. representative rationale:
  - **m3_real_numbers_and_operations_set07 type8 Q28-30 68-85% [type-wide]** √Ax가 자연수가 되도록 하는 자연수 x의 값 구하기
    - Q28~Q30은 √(An)이 자연수가 되려면 근호 안이 완전제곱수가 되어야 한다는 조건을 소인수 지수의 짝맞춤으로 구현한다. Q28·Q29는 범위 안에서 최대·최소를 골라야 하고, Q30은 두 자리 자연수 후보의 개수를 빠짐없이 세어야 한다.
  - **m3_real_numbers_and_operations_set07 type9 Q31-33 52-89% [type-wide]** √A/x가 자연수가 되도록 하는 자연수 x의 값 구하기
    - Q31~Q33은 √(A/x)가 자연수가 되려면 먼저 x가 분모를 없애는 약수여야 하고 A/x가 완전제곱수가 되어야 한다. Q31과 Q33은 두 근호 조건을 동시에 만족시켜야 하며 Q33이 52%로 가장 낮아 조건 교집합 누락을 별도로 둔다.
  - **m3_real_numbers_and_operations_set07 type10 Q34-38 51-80% [type-wide]** √(A-x)가 자연수(정수)가 되도록 하는 자연수 x의 값 구하기
    - Q34~Q38은 √(A-bx)가 자연수·정수가 되도록 근호 안을 k²로 놓고 가능한 제곱수를 범위 안에서 조사한다. Q34가 51%, Q36이 58%로 낮고, Q35·Q38은 가능한 제곱수 중 최대·최소 조건까지 반영해야 한다.

### 4. root_condition_substitution_failure
- current **C1**, alt **C2**
- note: 'x=r이 근'→f(r)=0 대입해 계수식 세우기 = 식 세우기(C1) vs 근 의미 개념(C2). 단순대입과 구별(검수 why). 근 기초스킬
- occurs 8x. representative rationale:
  - **m3_quadratic_equation_set06 type1 Q1-4 68-84% [type-wide]** 이차방정식의 한 근이 주어졌을 때, 미지수의 값 구하기
    - Q1~Q4는 “x=r이 근”이라는 말을 원래 이차방정식에 대입하여 계수 사이의 식을 만들고, 두 조건을 연립해 미지수를 구한다. Q2~Q4는 음수인 근도 포함하므로 음수를 괄호 없이 대입해 부호가 무너지는 오류를 해당 문항에만 둔다.
  - **m3_quadratic_equation_set06 type5 Q16-19 75-83% [type-wide]** 이차방정식의 한 근이 주어졌을 때, 다른 한 근 구하기
    - Q16~Q19는 주어진 한 근을 원식에 대입해 계수를 먼저 확정하고, 그 이차방정식을 인수분해하여 남은 한 근을 찾는다. 첫 단계의 근 조건 대입과 두 번째 단계의 인수분해를 분리하지 못하거나 계수 결정 후 식을 다시 연결하지 못하는 것이 공통 병목이다.
  - **m3_quadratic_equation_set06 type6 Q20-23 65-87% [type-wide]** 이차방정식의 근의 활용
    - Q20~Q23은 근 하나의 정보로 미지 계수를 정한 뒤 다른 근이나 계수식을 다시 계산한다. Q22는 연속한 두 홀수와 제곱합 74를 만족하는 후보를 빠짐없이 찾아야 하므로 정수 후보 열거 오류를 Q22에만 둔다.

### 5. tournament_pairing_count_failure
- current **C1**, alt **C2**
- note: 두 팀 한 쌍=한 경기 쌍 선택 구조 세우기(C1) vs 조합 개념(C2)
- occurs 1x. representative rationale:
  - **m2_probability_set06 type22 Q74-75 38-53% [type-wide]** 대진표를 정하는 경우의 수
    - Q74~Q75는 경기 대진에서 두 팀의 한 쌍이 한 경기라는 구조를 이용해 전체 경기/결과 수를 센다. Q74는 38%로 전승·전패 금지 경우를 제외할 때 서로 겹치는 제외 사례를 다시 보정해야 하므로 중복 계산 오류를 Q74에만 둔다.

### 6. trapezoid_linear_interpolation_failure
- current **C1**, alt **C2**
- note: 사다리꼴 평행단면 길이의 위치별 선형변화 관계 식세우기. 식세우기(C1) vs 관계개념(C2)
- occurs 2x. representative rationale:
  - **m2_similarity_set04 type20 Q44-45 84-86% [type-wide]** 사다리꼴에서 평행선 사이의 선분의 길이의 비
    - Q44~Q45는 사다리꼴의 윗변에서 아랫변으로 내려가며 평행 단면의 길이가 선형적으로 변한다는 관계를 사용한다. Q45는 옆변이 네 등분되어 단면 길이 증가량을 일정하게 누적해야 하므로 pattern_extraction_failure를 Q45에만 둔다.
  - **m2_similarity_set09 type15 Q43-45 71-85% [type-wide]** 사다리꼴에서 평행선 사이의 선분의 길이의 비
    - Q43~Q45는 사다리꼴의 윗변에서 아랫변으로 내려갈수록 평행 단면 길이가 선형적으로 변한다는 관계를 사용한다. Q44~Q45는 등분된 위치마다 증가량이 일정하다는 수열형 패턴을 읽어야 하므로 패턴 추출 오류를 해당 문항에 둔다.

---
## C2 > C1  (current=C2, alt=C1) : 1

### 1. centroid_area_partition_failure
- current **C2**, alt **C1**
- note: 무게중심 넓이분할 성질(중선 넓이이등분/6등분) 오적용. 개념(C2) vs 넓이분할식(C1). midpoint_area_fraction_relation_misapplied(C2) 병렬
- occurs 4x. representative rationale:
  - **m2_similarity_set04 type36 Q80-82 52-57% [type-wide]** 삼각형의 무게중심과 넓이의 관계(1) △ABC의 무게중심
    - Q80~Q82는 무게중심 G와 내심 I를 동시에 사용해 BC 위의 서로 다른 교점을 만든 뒤 넓이를 비교한다. 세 문항 모두 52~57%로 낮으며, G는 중선의 2:1 성질이고 I는 각의 이등분선 정리라는 서로 다른 중심의 성질을 바꿔 쓰면 바로 틀리는 구조다.
  - **m2_similarity_set04 type37 Q83-84 82-88% [type-wide]** 삼각형의 무게중심과 넓이의 관계(2) △ABC, △GBC의 무게중심
    - Q83~Q84는 △ABC의 무게중심과 그 안의 부분삼각형 △GBC의 무게중심을 다시 잡는 중첩 구조다. 한 단계의 2:1 분할을 두 번 적용하면서 길이 축소가 넓이비에는 제곱으로 반영되는 지점을 놓치지 않아야 한다.
  - **m2_similarity_set09 type30 Q86-88 58-72% [type-wide]** 삼각형의 무게중심과 넓이의 관계(1) △ABC의 무게중심
    - Q86~Q88은 무게중심이 만드는 넓이 분할을 이용한다. Q87은 AD:GD=3:1과 평행선에서 얻은 길이비를 같은 높이의 삼각형 넓이비로 옮겨 △EDG를 구하며, Q88은 무게중심 성질 중 옳지 않은 것을 판별하므로 각 오류를 문항별로 둔다.

