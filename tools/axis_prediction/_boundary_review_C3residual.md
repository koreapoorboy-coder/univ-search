# Boundary review dossier -- axis C3 residuals (all alts, held excluded)
> Canonical 11 maps. Current axis = C3. Confirm C3 or flip to alt.
- total: 14

---
## C3 > A3  : 2

### 1. multi_cell_dependency_tracking_failure
- note: 여러 빈칸 의존 추적 = 연결(C3) vs 정리(A3)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type36 Q127-130 52-81% [type-wide]** 다항식의 덧셈/뺄셈에서 빈 칸에 알맞은 식 구하기
    - 129·130이 52·54%로 최저권. 표에서 가로는 더하기·세로는 빼기로 방향이 다른데 이걸 뒤섞음. 빈 칸이 여러 개라 순서대로 풀어야 함

### 2. pattern_extraction_failure
- note: 수열 규칙 추출 선행 = 개념 연결(C3) vs 조건 정리(A3)
- occurs 26x. rationale:
  - **m2_linear_function_set06 type4 Q4-4 84-84% [type-wide]** f(x)=(x에 대한 조건)꼴인 함수의 함숫값
    - Q4는 3^n의 일의 자리 3,9,7,1이 4개 주기로 반복됨을 먼저 찾아야 한다. 30개 항의 합에서는 주기 길이와 마지막 두 항의 위치를 정확히 추적해야 한다.
  - **m2_linear_function_set06 type30 Q30-30 57-57% [type-wide]** 개수에 대한 문제(규칙이 있는 도형 만들기)
    - Q30은 정육각형을 한 단계 늘릴 때 둘레가 12씩 증가한다는 규칙을 찾아 y=12x+6을 만든다. 그림의 겹친 변을 제외한 증가량과 단계 번호를 정확히 대응하지 못하면 8단계 값이 어긋난다.

---
## C3 > B1  : 2

### 1. numerator_cancellation_overlooked
- note: 분자 약수 경로 열림 간과 = 개념 연결 누락(C3) vs 조건 누락(B1)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type3 Q9-12 50-61% [type-wide]** B/(A×x)가 유한소수가 되도록 하는 x의 값 구하기
    - 유형2보다 일괄 20~30pp 낮음. x가 분모로 가면 "2·5의 거듭제곱" 외에 분자의 약수 경로가 열리는데 이걸 빠뜨림(10번 해설이 명시). 유형2의 규칙을 그대로 옮겨 씀

### 2. parallel_slope_condition_omitted
- note: 평행→기울기 동일 두 개념 잇기 = 개념 연결(C3, 검수확정). ⚠이름 _omitted가 B1(조건누락)처럼 보여 이름-축 어긋남 = 재검토 여지 표시(alt B1). 내용은 C3가 맞음
- occurs 8x. rationale:
  - **m2_linear_function_set06 type22 Q22-22 75-75% [type-wide]** 일차함수의 그래프의 평행(1) - 그래프가 주어지지 않는 경우
    - Q22는 두 점 (-2,a-1), (2,2a+5)을 지나는 직선의 기울기를 구해 y=2x-7의 기울기 2와 같게 둔다. 평행 조건을 '기울기 같음'으로 바꾸고 Δy/Δx 식을 정확히 세워야 한다.
  - **m2_linear_function_set06 type23 Q23-23 82-82% [type-wide]** 일차함수의 그래프의 평행(2) - 그래프가 주어진 경우
    - Q23은 그래프 m의 두 절편 (4,0),(0,12)에서 기울기 -3을 얻고, 평행한 l도 기울기 -3임을 사용한다. l의 y절편 -6과 기울기로 식을 재구성해 x절편 P를 찾아야 한다.

---
## C3 > B2  : 3

### 1. game_stopping_condition_tracking_failure
- note: 승자 결정 즉시 종료 조건을 확률 경로에 반영·추적 = 상태 추적(C3) vs 범위(B2)
- occurs 2x. rationale:
  - **m2_probability_set06 type37 Q127-130 65-74% [type-wide]** 게임에서 이길 확률
    - Q127~Q130은 승자가 결정되는 순간 이후의 시행은 세지 않는 종료 조건을 유지하면서 가능한 승리 경로의 확률을 합한다. Q129는 승부가 결정될 확률을 무승부의 여사건으로 처리할 수 있어 여사건 설정 오류를 해당 문항에만 둔다.
  - **m2_probability_set11 type15 Q112-119 42-66% [Q[113,115,116,119]]** 게임에서 이길 확률
    - Q112~Q119는 승패·무승부·대진 결과의 가능한 경로를 순서대로 연결해 최종 승리 확률을 합한다. Q113·Q115·Q116·Q119는 승부가 결정되는 시점을 넘겨 경기를 더 세면 안 되고, Q112·Q114는 정해진 횟수의 승리/무승부 위치 조합을 빠짐없이 세어야 한다.

### 2. quadratic_monotonic_interval_from_vertex_failure
- note: 축·열린방향 -> 증가·감소 구간 연결 = 개념 연결(C3) vs 범위 처리(B2). 범위변환은 별도 inequality_bound_conversion
- occurs 2x. rationale:
  - **m3_quadratic_function_set04 type17 Q59-61 73-75% [type-wide]** 이차함수 y=a(x-p)²+q의 그래프에서 증가·감소하는 범위
    - Q59~Q61은 포물선의 축을 기준으로 x 증가 시 y가 증가·감소하는 구간을 정한다. 열린 방향과 꼭짓점 x좌표를 연결한 뒤 문제의 부등식 범위로 정확히 바꾸는 것이 핵심이다.
  - **m3_quadratic_function_set04 type26 Q92-94 65-82% [type-wide]** 이차함수 y=ax²+bx+c의 그래프에서 증가·감소하는 범위
    - Q92~Q94는 일반형을 꼭짓점 형태로 해석해 증가·감소 구간을 찾고 평행이동 후 구간 변화를 추적한다. Q93·Q94는 이동량이 축 위치를 어떻게 바꾸는지까지 포함해 평행이동 부호를 해당 문항에만 추가한다.

### 3. square_root_floor_interval_mapping_failure
- note: √x 이하 자연수 개수를 n²<=x<(n+1)² 계단 구간으로 대응 = 크기<->구간 해석적 연결(C3) vs 범위 처리(B2). 검수 'C3 또는 B2'
- occurs 1x. rationale:
  - **m3_real_numbers_and_operations_set07 type13 Q46-50 48-76% [type-wide]** √x 이하의 자연수 구하기
    - Q46~Q50은 “√x 이하의 자연수 개수”를 n≤√x<n+1, 즉 n²≤x<(n+1)² 구간으로 바꾸는 것이 출발점이다. Q48은 48%로 반정수 경계의 구간별 개수를 읽어야 하고 Q49·Q50은 같은 계단형 개수를 누적합 패턴으로 연결한다.

---
## C3 > B3  : 3

### 1. diameter_pairing_failure
- note: 검수확정 C3(단 tier boundary 유지): 짝짓기가 목적이면 B3, 각·호 관계로 가는 경유면 C3. Q73은 경유→C3. 형제 diameter_pair_counting_error(Q52,B3)와 이름 유사라 타 단원 재검토 여지
- occurs 1x. rationale:
  - **m3_circle_properties_set12 type7 Q69-80 51-86% [type-wide]** 원주각의 크기와 호의 길이(3)
    - 69~80에서는 71(51%), 73(54%), 75(62%)가 이탈한다. 71·75는 호의 비/길이를 중심각·원주각 또는 두 할선이 만드는 각 관계로 변환해야 하고, 73은 32등분 원에서 서로 지름을 이루는 현의 끝점을 올바르게 짝짓는 단계가 핵심이다.

### 2. joint_condition_merge_failure
- note: 각 조건은 구하나 결합 실패 = 연결(C3) vs 경우결합(B3)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type5 Q16-18 71-83% [type-wide]** 2개 이상의 분수가 동시에 유한소수가 되도록 하는 미지수의 값
    - 각각의 배수 조건은 구하나 결합에서 최대공약수를 씀. 최소공배수가 정답 경로

### 3. root_count_discriminant_condition_failure
- note: ★검수 갈림(C3 후보): 판별식 D 부호·0을 서로다른두실근/중근/실근없음에 연결 = 개념 연결(C3) vs 세 경우분류(B3). 연결이 본질→C3, 경우성분 alt B3
- occurs 7x. rationale:
  - **m3_quadratic_equation_set06 type8 Q27-31 64-84% [type-wide]** 이차방정식이 중근을 가질 조건
    - Q27~Q31은 중근 조건을 판별식 D=0으로 바꾸어 매개변수 조건을 만들고, 필요하면 그 결과를 다른 이차방정식에 다시 넣는다. Q30은 카드에서 가능한 (a,b)를 모두 조사해 확률을 계산하므로 정수 후보 누락을 Q30에만 둔다.
  - **m3_quadratic_equation_set06 type20 Q79-79 49-49% [type-wide]** 이차방정식의 근의 개수
    - Q79는 주어진 a,b,c 조건을 먼저 정리한 뒤 세 이차방정식의 중근 조건을 판별식과 연결해 p,q,r을 연쇄적으로 구한다. 여러 식의 판별식 조건을 동시에 유지해야 해서 한 단계의 오류가 뒤의 모든 값에 전파된다.

---
## C3 > B4  : 1

### 1. table_rule_direction_misread
- note: 표 가로더하기/세로빼기 규칙 = 규칙연결(C3) vs 방향(B4)
- occurs 2x. rationale:
  - **m2_number_expression_set5 type36 Q127-130 52-81% [type-wide]** 다항식의 덧셈/뺄셈에서 빈 칸에 알맞은 식 구하기
    - 129·130이 52·54%로 최저권. 표에서 가로는 더하기·세로는 빼기로 방향이 다른데 이걸 뒤섞음. 빈 칸이 여러 개라 순서대로 풀어야 함
  - **m3_real_numbers_and_operations_set07 type22 Q87-90 57-72% [type-wide]** 제곱근표에 없는 제곱근의 값 구하기
    - Q87~Q90은 제곱근표에 있는 2~4자리 기준값을 10² 배율로 옮겨 √350, √0.0529, √433 같은 값을 만든다. 표의 행·열을 잘못 읽거나 10의 거듭제곱을 근호 밖에서 한 자리씩 잘못 이동하기 쉽고, Q87은 가장 가까운 정수로 마무리해야 한다.

---
## C3 > D1  : 1

### 1. unknown_exponent_matching_failure
- note: 미지 지수 양변 비교 = 연결(C3) vs 식조작(D1)
- occurs 1x. rationale:
  - **m2_number_expression_set5 type29 Q105-108 67-83% [type-wide]** 단항식의 나눗셈
    - 107·108(67%)은 미지 지수 A,B,C를 양변 비교로 결정. 나눗셈→역수 곱셈 전환에서 분모 전체를 뒤집지 않음

---
## C3 > D2  : 1

### 1. triangle_congruence_condition_selection_failure
- note: ★검수 갈림점: SSS/SAS/ASA/RHA/RHS 합동조건 구성·선택. 대응 부분 연결해 합동 확립=개념연결(C3, similar_triangle_correspondence C3 계열) vs 법칙 선택(D2, law_selection D2). 최다11회. C3우선(구성이 본질)·alt D2 명시
- occurs 11x. rationale:
  - **m2_geometry_properties_set07 type5 Q15-18 74-93% [type-wide]** 이등변삼각형이 되는 조건
    - Q15~Q18은 주어진 각·수선·중점 조건에서 합동인 삼각형을 찾아 대응변이 같음을 만들고, 그 결과를 이등변삼각형 조건으로 되돌린다. Q18은 점대칭으로 생긴 여러 대응 선분을 실제 CE 길이까지 이어야 하므로 선분 추적 오류를 Q18에만 둔다.
  - **m2_geometry_properties_set07 type7 Q21-24 76-89% [type-wide]** 직각삼각형의 합동 조건의 응용(1) RHA 합동
    - Q21~Q24는 직각삼각형에서 RHA 합동 조건을 정확히 구성해 대응변·대응각을 얻는다. Q23~Q24는 합동으로 길이를 복원한 뒤 △AFG의 넓이까지 계산하므로 넓이식 설정 오류를 해당 문항에만 둔다.

---
## C3 > D3  : 1

### 1. stage_indexing_error
- note: 단계별 개수·길이 추적 = 연결(C3) vs 계산(D3)
- occurs 3x. rationale:
  - **m2_linear_function_set06 type30 Q30-30 57-57% [type-wide]** 개수에 대한 문제(규칙이 있는 도형 만들기)
    - Q30은 정육각형을 한 단계 늘릴 때 둘레가 12씩 증가한다는 규칙을 찾아 y=12x+6을 만든다. 그림의 겹친 변을 제외한 증가량과 단계 번호를 정확히 대응하지 못하면 8단계 값이 어긋난다.
  - **m2_number_expression_set5 type21 Q74-77 45-80% [type-wide]** 지수법칙을 이용한 실생활 문제
    - 76이 45%로 전체 최저. 단계별 개수·길이를 둘 다 추적해야 함. 74는 m/km 단위 변환. 77은 "몇 배" 방향

