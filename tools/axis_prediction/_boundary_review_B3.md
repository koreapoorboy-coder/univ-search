# Boundary review dossier -- B3 cluster (B3 <-> C1/C2/C3/E3)
> Canonical 11 maps. B3 = partition/enumerate/count cases. Split test: is the COUNT the answer (B3) or a step toward an equation/link (C1/C3)?

---
## B3 > C1  (current=B3, alt=C1) : 4

### 1. favorable_outcome_counting_error
- current **B3**, alt **C1**
- note: 확률 분자=사건 만족 결과만 세기 오류 = 경우 열거(B3). sample_space와 짝
- occurs 11x. representative rationale:
  - **m2_probability_set06 type23 Q76-79 58-76% [type-wide]** 간단한 확률 구하기
    - Q76~Q79는 전체 가능한 결과 수와 사건을 만족하는 결과 수를 각각 센 뒤 (유리한 경우)/(전체 경우)로 확률을 만든다. 전체 표본공간과 사건 경우를 서로 다른 기준으로 세거나 분자·분모를 뒤집는 오류가 기본 병목이다.
  - **m2_probability_set06 type24 Q80-83 58-76% [type-wide]** 확률 구하기(1) 일렬로 세울 때 확률 구하기
    - Q80~Q83은 일렬 배열 전체 경우와 조건을 만족하는 배열을 각각 센 뒤 확률을 구한다. Q80·Q82·Q83은 특정 대상이 이웃하는 배열을 묶음으로 처리해야 하므로 인접 묶음 오류를 해당 문항에만 적용한다.
  - **m2_probability_set06 type26 Q86-89 46-70% [type-wide]** 확률 구하기(3) 방정식을 만족할 확률
    - Q86~Q89는 방정식의 해 존재 조건, 직선 교점, 좌표 영역 같은 문장을 주사위 눈 (a,b)의 사건 조건으로 바꾼 뒤 만족하는 점을 센다. 수학적 조건을 사건으로 잘못 번역하거나 여러 조건의 교집합을 빠뜨리는 오류가 핵심이다.

### 2. forbidden_position_arrangement_failure
- current **B3**, alt **C1**
- note: 금지 위치 침범 경우를 제거 못함 = 제외 관리(B3, excluded_case_omission B3 선례) vs 배열 설정(C1)
- occurs 2x. representative rationale:
  - **m2_probability_set06 type16 Q58-60 49-68% [Q[60]]** 대표를 뽑는 경우의 수(2) 자격이 같은 경우
    - Q58~Q60은 대표처럼 자격이 같아 순서를 세지 않는 선택이 기본이다. Q60은 각 사람이 자기 자리를 피해야 하는 금지 위치 배열이 추가되고 정답률도 49%로 낮아 금지 위치 오류를 Q60에만 둔다.
  - **m2_probability_set11 type4 Q21-30 48-83% [Q[21,30]]** 대표를 뽑는 경우의 수(2) 자격이 같은 경우
    - Q22~Q29는 대표·위원·책·공처럼 자격이 같은 대상을 순서 없이 고르는 선택이 핵심이다. 반면 Q21과 Q30은 각 사람이 자기 자리에 갈 수 없는 제한 배열이므로 금지 위치를 따로 처리해야 한다. PDF의 동일 유형명은 그대로 유지하고 오류 기제는 tag_scope로 분리했다.

### 3. route_branch_counting_failure
- current **B3**, alt **C1**
- note: 분기점 다음 경로 수를 구간별 빠짐없이 세기 실패 = 열거(B3)
- occurs 2x. representative rationale:
  - **m2_probability_set06 type5 Q15-18 50-71% [type-wide]** 경우의 수의 곱(2) 교통수단이나 길을 선택하는 경우
    - Q15~Q18은 구간별 교통수단·길 선택 수를 곱하여 전체 경로 수를 만든다. Q17~Q18은 왕복 과정에서 이미 이용한 길을 다시 쓰지 않는 제한이 추가되므로 제외 조건 누락을 해당 문항에만 적용한다.
  - **m2_probability_set06 type19 Q66-67 43-69% [Q[66]]** 최단 경로로 가는 경우의 수
    - Q66~Q67은 길의 구간을 나누어 각 구간의 이동 경우를 곱한다. Q66은 가능한 분기 이동 자체를 세는 문제이고 43%로 낮으며, Q67은 지정점을 지나면서 최단 경로가 되도록 구간별 이동 횟수를 고정해야 하므로 두 오류를 문항별로 구분했다.

### 4. sample_space_counting_error
- current **B3**, alt **C1**
- note: 확률 분모=전체 등가능 결과 세기 오류 = 경우 열거(B3, 검수). 분자/분모 기준설정은 probability_ratio_setup(C1)가 담당
- occurs 7x. representative rationale:
  - **m2_probability_set06 type23 Q76-79 58-76% [type-wide]** 간단한 확률 구하기
    - Q76~Q79는 전체 가능한 결과 수와 사건을 만족하는 결과 수를 각각 센 뒤 (유리한 경우)/(전체 경우)로 확률을 만든다. 전체 표본공간과 사건 경우를 서로 다른 기준으로 세거나 분자·분모를 뒤집는 오류가 기본 병목이다.
  - **m2_probability_set06 type28 Q93-96 60-79% [type-wide]** 어떤 사건이 일어나지 않을 확률
    - Q93~Q96은 직접 세기 어려운 “일어나지 않을” 사건을 전체에서 원래 사건의 확률을 빼는 여사건으로 바꾼다. 부정 조건을 반대로 읽거나 여사건의 표본공간을 원래 사건과 다르게 잡는 오류를 구분해 본다.
  - **m2_probability_set06 type30 Q101-104 55-63% [type-wide]** 사건 A 또는 사건 B가 일어날 확률
    - Q101~Q104는 사건 A 또는 B가 일어나는 경우를 합칠 때 A와 B의 공통 부분을 한 번만 세어야 한다. 두 사건의 경우를 단순히 더해 교집합을 중복 계산하거나 전체 표본공간 수를 잘못 잡는 것이 대표 오류다.

---
## B3 > C2  (current=B3, alt=C2) : 2

### 1. ordered_outcome_enumeration_failure
- current **B3**, alt **C2**
- note: (a,b)≠(b,a) 순서구분 표본 빠짐없이 열거 실패 = 열거·분류(B3). 순서인식 개념은 order_relevance(C2)가 담당
- occurs 5x. representative rationale:
  - **m2_probability_set06 type1 Q1-4 50-73% [type-wide]** 여러 가지 경우의 수(1) 순서쌍을 이용하여 푸는 경우
    - Q1~Q4는 가능한 순서쌍을 빠짐없이 만들고, 각 문항의 추가 조건을 만족하는 경우만 남겨야 한다. 순서가 다른 결과를 같은 것으로 합치거나 조건별 경우 분기를 누락하면 전체 경우의 수가 바로 달라진다.
  - **m2_probability_set06 type3 Q8-10 30-73% [type-wide]** 경우의 수의 합(1) 숫자를 선택하거나 주사위를 던지는 경우
    - Q8~Q10은 서로 겹치지 않는 여러 경우를 각각 센 뒤 합하는 구조가 공통이다. 특히 Q9는 정답률 30%로, 세 번의 주사위 결과를 이동량과 연결한 뒤 최종 위치 조건까지 추적하는 단계가 추가되어 다단계 오류를 Q9에만 둔다.
  - **m2_probability_set06 type4 Q11-14 70-71% [type-wide]** 경우의 수의 곱(1) 서로 다른 사건이 동시에 일어나는 경우의 수
    - Q11~Q14는 서로 다른 두 시행의 결과를 순서 있는 전체 결과로 만든 뒤 동전·주사위의 추가 조건을 동시에 만족시키는 경우를 센다. 합의 법칙으로 잘못 처리하거나 (앞 결과, 뒤 결과)의 순서를 합치면 오답이 된다.

### 2. zero_product_property_application_failure
- current **B3**, alt **C2**
- note: ★검수 갈림(B3 후보): AB=0→A=0 또는 B=0 두 갈래 생성 = 경우분류(B3). vs 영인수 성질 개념(C2). 두 갈래 만듦이 본질→B3
- occurs 1x. representative rationale:
  - **m3_quadratic_equation_set06 type3 Q9-11 81-93% [type-wide]** AB=0의 성질을 이용한 이차방정식의 풀이
    - Q9~Q11은 이미 인수의 곱으로 주어진 식에서 AB=0이면 A=0 또는 B=0이라는 성질로 두 근을 얻은 뒤 합·차·제곱의 차를 계산한다. Q10~Q11은 두 근의 순서를 정한 뒤 어느 쪽에서 어느 쪽을 빼는지가 추가되므로 차의 방향 오류를 문항 범위로 둔다.

---
## B3 > C3  (current=B3, alt=C3) : 1

### 1. exactly_k_success_case_counting_failure
- current **B3**, alt **C3**
- note: 정확히 k번 성공 위치 조합 세기 = 경우 열거(B3) vs 경로확률 곱(C3)
- occurs 3x. representative rationale:
  - **m2_probability_set06 type38 Q131-133 50-80% [Q[132]]** 문제를 맞힐 확률
    - Q131은 적어도 한 문제를 맞힐 확률을 전부 틀릴 확률의 여사건으로, Q132는 정확히 한 문제만 맞는 위치별 경우로, Q133은 지정된 사람만 맞히는 독립 사건의 곱으로 처리한다. 세 문항의 핵심 조작이 달라 문항별 tag_scope를 분리했다.
  - **m2_probability_set11 type15 Q112-119 42-66% [Q[112,114]]** 게임에서 이길 확률
    - Q112~Q119는 승패·무승부·대진 결과의 가능한 경로를 순서대로 연결해 최종 승리 확률을 합한다. Q113·Q115·Q116·Q119는 승부가 결정되는 시점을 넘겨 경기를 더 세면 안 되고, Q112·Q114는 정해진 횟수의 승리/무승부 위치 조합을 빠짐없이 세어야 한다.
  - **m2_probability_set11 type16 Q120-129 49-75% [Q[120,121,123,124,125,126,127,129]]** 문제를 맞힐 확률
    - Q120~Q129는 여러 문제·학생의 정답/오답 사건을 조합한다. 정확히 k개를 맞히는 위치를 세고 각 경로의 독립 확률을 곱해야 하며, Q128은 P(A)와 P(A∩B)가 주어졌을 때 미지 P(B)를 곱셈 관계의 방정식으로 세워야 한다.

---
## B3 > E3  (current=B3, alt=E3) : 1

### 1. overlap_double_count_error
- current **B3**, alt **E3**
- note: 두 분기에 같은 결과 중복 계수 = 경우 관리(B3). 검수 B3. 후보누락과 반대방향
- occurs 3x. representative rationale:
  - **m2_probability_set06 type22 Q74-75 38-53% [Q[74]]** 대진표를 정하는 경우의 수
    - Q74~Q75는 경기 대진에서 두 팀의 한 쌍이 한 경기라는 구조를 이용해 전체 경기/결과 수를 센다. Q74는 38%로 전승·전패 금지 경우를 제외할 때 서로 겹치는 제외 사례를 다시 보정해야 하므로 중복 계산 오류를 Q74에만 둔다.
  - **m2_probability_set11 type2 Q5-11 30-67% [Q[5]]** 색칠하는 경우의 수
    - Q5~Q11은 색 선택의 제약을 누적해서 세는 유형이다. Q6~Q9·Q11은 인접 영역의 색을 다르게 유지해야 하고, Q5는 회전하여 같은 색칠을 별개로 세면 중복 계산이 생긴다. Q10은 숫자·모양·바탕색의 서로 다른 조건을 동시에 만족시켜야 한다.
  - **m2_probability_set11 type5 Q31-38 30-49% [Q[31,33,35]]** 방정식 또는 부등식에서의 경우의 수
    - Q31~Q38은 주사위 눈 1~6에서 식의 조건을 만족하는 순서쌍을 모두 열거해야 한다. Q31·Q33·Q35는 서로 다른 기울기의 개수를 묻기 때문에 같은 기울기를 만드는 여러 순서쌍을 그대로 세면 중복 계수가 발생한다. 나머지 문항도 평행·불교점·연립방정식 조건의 교집합을 정확히 유지해야 한다.

---
## C1 > B3  (current=C1, alt=B3) : 3

### 1. complementary_counting_setup_failure
- current **C1**, alt **B3**
- note: 경우의 수에서 전체-금지 여집합형 계수 '설정' = 전략 세우기(C1) vs 경우 관리(B3, excluded_case B3와 구분: 설정 vs 누락)
- occurs 1x. representative rationale:
  - **m2_probability_set06 type11 Q38-41 42-77% [Q[38]]** 일렬로 세우는 경우의 수(4) 이웃하지 않는 경우
    - Q38~Q41은 먼저 한 집단을 세운 뒤 사이의 빈자리에 다른 대상을 배치하거나, 전체 배열에서 이웃하는 경우를 빼는 방식으로 비이웃 조건을 처리한다. Q38은 전체-이웃 경우로 푸는 여집합형 경우의 수이므로 그 설정 오류를 Q38에만 둔다.

### 2. nonadjacent_gap_placement_failure
- current **C1**, alt **B3**
- note: 집단 배열 후 빈칸에 배치해 비이웃 보장 = 배열 구성 세우기(C1)
- occurs 1x. representative rationale:
  - **m2_probability_set06 type11 Q38-41 42-77% [type-wide]** 일렬로 세우는 경우의 수(4) 이웃하지 않는 경우
    - Q38~Q41은 먼저 한 집단을 세운 뒤 사이의 빈자리에 다른 대상을 배치하거나, 전체 배열에서 이웃하는 경우를 빼는 방식으로 비이웃 조건을 처리한다. Q38은 전체-이웃 경우로 푸는 여집합형 경우의 수이므로 그 설정 오류를 Q38에만 둔다.

### 3. shortest_path_segment_counting_failure
- current **C1**, alt **B3**
- note: 최단경로 가로·세로 이동횟수·지정점 구간 고정 = 계수 구조 세우기(C1) vs 열거(B3)
- occurs 1x. representative rationale:
  - **m2_probability_set06 type19 Q66-67 43-69% [Q[67]]** 최단 경로로 가는 경우의 수
    - Q66~Q67은 길의 구간을 나누어 각 구간의 이동 경우를 곱한다. Q66은 가능한 분기 이동 자체를 세는 문제이고 43%로 낮으며, Q67은 지정점을 지나면서 최단 경로가 되도록 구간별 이동 횟수를 고정해야 하므로 두 오류를 문항별로 구분했다.

---
## C2 > B3  (current=C2, alt=B3) : 1

### 1. leading_zero_case_handling_failure
- current **C2**, alt **B3**
- note: 최고자리 0 불가 제약을 놓침 = 자연수 만들기 원자개념(C2, B1아님-내재제약 못꺼냄=C2 판례) vs 경우 나눔(B3)
- occurs 1x. representative rationale:
  - **m2_probability_set06 type13 Q46-49 50-72% [type-wide]** 자연수의 개수(2) 0을 포함하는 경우
    - Q46~Q49는 0을 포함해 수를 만들 때 맨 앞자리에 0이 올 수 없다는 조건과 주어진 수의 범위를 유지해야 한다. Q47·Q49는 앞뒤가 같은 수의 자리 구조를 패턴으로 세어야 하므로 패턴 추출 오류를 해당 문항에만 둔다.

