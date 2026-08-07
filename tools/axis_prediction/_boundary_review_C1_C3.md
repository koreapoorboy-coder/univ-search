# Boundary review dossier -- C1 <-> C3

> Canonical count (v1 dedup): **C1>C3 = 13**, **C3>C1 = 9**. Total C1<->C3 = 22.
> Axis: C1 = SET UP an equation/condition. C3 = LINK/connect representations (analytic).
> Each tag: current axis/alt + note(ko) + up to 3 representative item rationales(ko).

---
## C1 > C3  (current=C1, alt=C3) : 13

### 1. area_bisecting_line_condition_failure
- current **C1**, alt **C3**
- note: 넓이 이등분 조건을 교점·부분넓이 식으로 변환 세우기 = 식 세우기(C1) vs 조건 연결(C3)
- occurs 2x. representative rationale:
  - **m2_linear_function_set06 type49 Q49-49 63-63% [type-wide]** 넓이를 이등분하는 직선의 방정식
    - Q49는 원래 직선과 두 축이 만드는 삼각형의 넓이가 54이므로 이등분선 y=ax와 만나는 점 C가 절반 넓이 27을 만들도록 y좌표 9가 되어야 한다. 넓이 이등분 조건을 좌표 조건으로 바꾸고 교점을 다시 직선식에 연결해야 한다.
  - **m2_linear_function_set09 type49 Q49-49 56-56% [type-wide]** 넓이를 이등분하는 직선의 방정식
    - Q49는 y=-3x와 y=x+12의 교점 A=(-3,9)을 구하고 원래 삼각형 넓이의 절반이 되도록 C의 x좌표를 -6으로 정한다. 이등분선 y=ax+b가 A와 C를 모두 지나게 하여 a,b를 구하는 과정에서 부분넓이 조건과 교점 좌표를 연결해야 한다.

### 2. composite_area_subtraction_failure
- current **C1**, alt **C3**
- note: 복합넓이 합-빼기 = 식세우기(C1) vs 연결(C3)
- occurs 14x. representative rationale:
  - **m2_geometry_properties_set07 type33 Q104-107 34-82% [type-wide]** 평행사변형과 넓이(2) 내부의 한 점
    - Q104~Q107은 평행사변형 내부의 한 점을 잇고 같은 높이를 갖는 삼각형들의 넓이 합을 이용한다. 전체 넓이를 여러 부분으로 나누고 필요한 영역만 더하거나 빼는 과정이 공통 핵심이며 Q104가 34%로 가장 낮다.
  - **m2_geometry_properties_set07 type47 Q145-148 65-78% [Q[146,148]]** 평행사변형에서 높이가 같은 삼각형의 넓이
    - Q145~Q148은 평행사변형 안에서 같은 높이를 갖는 삼각형의 넓이비를 이용해 부분 평행사변형·삼각형의 넓이를 구한다. Q146·Q148은 전체에서 이미 구한 부분을 빼는 단계가 추가되므로 영역 빼기 오류를 해당 문항에만 둔다.
  - **m2_similarity_set04 type16 Q37-38 57-71% [Q[38]]** 삼각형의 내각의 이등분선과 삼각형의 넓이
    - Q37~Q38은 이등분선으로 나뉜 밑변의 비를 구하고, 같은 높이를 갖는 두 삼각형의 넓이비로 그대로 옮긴다. Q38은 57%로 더 낮고 8-15-17 직각삼각형의 전체 넓이를 먼저 만든 뒤 이등분 비로 부분 넓이를 분할해야 하므로 복합 넓이 분해 오류를 Q38에만 둔다.

### 3. composite_path_length_decomposition_failure
- current **C1**, alt **C3**
- note: 경로 길이 분해 = 식세우기(C1) vs 연결(C3)
- occurs 7x. representative rationale:
  - **m2_geometry_properties_set07 type27 Q89-91 78-92% [type-wide]** 평행사변형의 성질의 응용(3) 두 대각선은 서로 다른 것을 이등분한다
    - Q89~Q91은 평행사변형의 두 대각선이 서로를 이등분한다는 성질을 여러 교점의 길이에 적용한 뒤 둘레를 합산한다. 중점으로 얻는 절반 길이를 전체 길이와 혼동하거나 둘레의 구성 선분을 빠뜨리는 오류가 핵심이다.
  - **m2_geometry_properties_set07 type30 Q96-97 77-86% [Q[97]]** 새롭게 만든 사각형이 평행사변형이 되는 조건
    - Q96~Q97은 기존 평행사변형의 대각선·중점을 이용해 새로 만든 사각형이 다시 평행사변형임을 보인다. Q97은 새 도형의 네 변을 복원해 둘레까지 합산하므로 경로 길이 분해 오류를 Q97에만 둔다.
  - **m2_geometry_properties_set07 type44 Q133-136 49-68% [Q[136]]** 사각형의 각 변의 중점을 연결하여 만든 사각형
    - Q133~Q136은 사각형 각 변의 중점을 이은 선분이 원래 대각선의 절반이 되는 중점연결 관계를 반복 사용한다. Q134~Q135는 중점 사각형의 넓이가 반복해서 절반이 되는 구조를, Q136은 여러 중점선 길이를 둘레로 합산하는 구조를 각각 문항 범위로 둔다.

### 4. digit_divisibility_condition_failure
- current **C1**, alt **C3**
- note: 배수 조건을 끝자리·자리합 등 숫자 선택 규칙으로 옮김 = 조건 번역 세우기(C1)
- occurs 1x. representative rationale:
  - **m2_probability_set06 type12 Q42-45 41-68% [type-wide]** 자연수의 개수(1) 0을 포함하지 않는 경우
    - Q42~Q45는 주어진 숫자로 자연수를 만들면서 배수 조건·자리 조건을 동시에 적용한다. 끝자리/각 자리 합 같은 배수 판정 조건을 잘못 옮기거나 가능한 숫자 배열을 빠뜨리면 경우의 수가 누락된다.

### 5. event_condition_translation_failure
- current **C1**, alt **C3**
- note: 방정식·부등식·좌표·도형 조건 -> 사건 조건으로 번역 = 조건 세우기(C1, 검수) vs 연결(C3)
- occurs 12x. representative rationale:
  - **m2_probability_set06 type26 Q86-89 46-70% [type-wide]** 확률 구하기(3) 방정식을 만족할 확률
    - Q86~Q89는 방정식의 해 존재 조건, 직선 교점, 좌표 영역 같은 문장을 주사위 눈 (a,b)의 사건 조건으로 바꾼 뒤 만족하는 점을 센다. 수학적 조건을 사건으로 잘못 번역하거나 여러 조건의 교집합을 빠뜨리는 오류가 핵심이다.
  - **m2_probability_set06 type27 Q90-92 72-83% [type-wide]** 확률 구하기(4) 부등식을 만족할 확률
    - Q90~Q92는 부등식을 주사위 눈 또는 두 수의 순서 조건으로 바꾸고 제한된 후보를 전부 점검한다. 부등호 방향·경계와 1~6 범위를 유지하지 않으면 사건에 포함될 후보 수가 달라진다.
  - **m2_probability_set06 type32 Q108-111 64-82% [type-wide]** 두 사건 A, B 중 적어도 하나가 일어날 확률
    - Q108~Q111은 두 사건 중 적어도 하나가 일어남을 “둘 다 일어나지 않음”의 반대로 바꾸거나 사건별 경우를 결합한다. 문장 조건을 정확한 여사건으로 바꾸고 여러 단계 결과를 끝까지 연결해야 한다.

### 6. geometric_probability_area_ratio_failure
- current **C1**, alt **C3**
- note: 사건영역/전체영역 넓이비로 확률 설정 = 식 세우기(C1). ★도형 그림 있어도 도형태그 아닌 확률 설정으로 처리(검수 오염방지 확인)
- occurs 2x. representative rationale:
  - **m2_probability_set06 type43 Q148-150 31-58% [type-wide]** 평면도형에서의 확률(넓이를 이용한 확률)
    - Q148~Q150은 등가능한 부채꼴/원 영역의 넓이 비 또는 여러 회전 결과를 이용해 확률을 만든다. Q149는 5≤OP≤6인 고리 영역을 전체 원 넓이와 비교해야 하고, Q148·Q150은 여러 독립 선택 결과를 곱해 사건 조건을 판정해야 한다. Q150은 31%로 전체 최저다.
  - **m2_probability_set11 type19 Q148-150 39-51% [Q[148]]** 평면도형에서의 확률(넓이를 이용한 확률)
    - Q148은 과녁 영역의 넓이비 1:2:3을 각 점수의 적중확률로 바꾼 뒤 5발의 점수 조합을 계산한다. Q149는 9개 점 중 3개를 순서 없이 고른 뒤 일직선인 선택을 제외하고, Q150은 세 주사위 값을 삼각형의 세 내각 조건으로 바꾸어 사건을 판정한다.

### 7. line_intersection_coordinate_failure
- current **C1**, alt **C3**
- note: 두 직선 교점을 연립식 세워 구하고 후속 사용 = 식 세우기(C1) vs 두 직선 연결(C3). 고빈출
- occurs 16x. representative rationale:
  - **m2_linear_function_set06 type16 Q16-16 72-72% [type-wide]** 일차함수의 그래프와 좌표축으로 둘러싸인 도형의 넓이(2) - 두 직선
    - Q16은 두 직선의 y절편 A,B와 교점 C를 구해 y축과 두 직선이 만드는 삼각형의 밑변과 높이를 정해야 한다. 교점 좌표를 못 구하거나 좌표축과 둘러싸인 영역을 잘못 잡으면 넓이식이 무너진다.
  - **m2_linear_function_set06 type43 Q43-43 66-66% [type-wide]** 직선으로 둘러싸인 도형의 넓이(1)
    - Q43은 네 직선과 y=±1의 교점을 각각 구해 평행한 두 수평선 사이 사다리꼴의 두 밑변 길이를 계산한다. 교점 좌표를 잘못 구하면 넓이 전체가 연쇄적으로 틀린다.
  - **m2_linear_function_set06 type45 Q45-45 71-71% [type-wide]** 두 일차방정식의 그래프의 교점을 지나는 직선의 방정식
    - Q45는 두 일차방정식의 교점 (2,2)을 먼저 구하고, 그 점과 x절편 (3,0)을 지나는 직선의 식을 재구성한다. 연립방정식 교점 계산과 새 직선식 구성의 두 단계가 연속된다.

### 8. polygon_triangulation_area_decomposition_failure
- current **C1**, alt **C3**
- note: 다각형 삼각분할 넓이 식 = 식세우기(C1) vs 연결(C3)
- occurs 3x. representative rationale:
  - **m3_trigonometric_ratio_set01 type34 Q136-138 57-76% [type-wide]** 다각형의 넓이
    - Q136~Q138은 다각형을 대각선으로 여러 삼각형에 나누어 각 부분 넓이를 합한다. Q136은 AB의 삼등분점 P와 AC의 중점 M 때문에 같은 높이 삼각형의 밑변비가 넓이비로 직접 옮겨지며, Q137~Q138은 분할된 각 삼각형의 sin 넓이를 정확히 합쳐야 한다.
  - **m3_trigonometric_ratio_set01 type35 Q139-142 42-86% [type-wide]** 정다각형의 넓이
    - Q139~Q142는 정다각형을 중심에서 합동인 이등변삼각형들로 나누고 변의 개수로 중심각을 정한다. Q140은 정육각형 각 변의 중점을 이은 내부 정육각형과 바깥 부분의 넓이 차를 이용하므로 중점이 만드는 넓이 분수 관계 오류를 Q140에만 둔다.

### 9. prism_cross_section_area_propagation_failure
- current **C1**, alt **C3**
- note: 단면 넓이→기둥 부피 식 = 식세우기(C1) vs 전파연결(C3)
- occurs 1x. representative rationale:

### 10. quadratic_function_reconstruction_from_constraints_failure
- current **C1**, alt **C3**
- note: 축·교점·점 여러조건 -> 계수 복원(연립) = 식 세우기(C1) vs 조건 연결(C3)
- occurs 7x. representative rationale:
  - **m3_quadratic_function_set04 type30 Q106-109 64-83% [type-wide]** 이차함수의 식 구하기(1) 미지수가 2개일 때
    - Q106~Q109는 축·교점·지나는 점 등 두 개 이상의 조건으로 이차함수의 미지 계수를 복원한다. 각 조건을 별도 방정식으로 만든 뒤 연립해 같은 함수식으로 묶는 과정이 핵심이다.
  - **m3_quadratic_function_set04 type32 Q114-117 74-80% [type-wide]** 이차함수의 식 구하기(3) 축의 방정식과 두 점을 알 때
    - Q114~Q117은 축의 방정식과 두 점을 이용해 이차함수를 복원한다. 축을 기준으로 대칭인 좌표 관계를 이용하거나 여러 점 조건을 한 식에 동시에 반영해야 한다.
  - **m3_quadratic_function_set04 type33 Q118-120 65-73% [type-wide]** 이차함수의 식 구하기(4) y축과의 교점과 두 점을 알 때
    - Q118~Q120은 y축과의 교점으로 상수항을 먼저 정하고 나머지 두 점 조건으로 a,b를 구한다. 세 좌표 조건을 순서대로 연결해 계수들을 하나의 식으로 복원해야 한다.

### 11. repeated_circle_sector_decomposition_failure
- current **C1**, alt **C3**
- note: 반복 부채꼴 분해 넓이식 = 식세우기(C1) vs 연결(C3)
- occurs 1x. representative rationale:

### 12. segment_partition_tracking_failure
- current **C1**, alt **C3**
- note: 선분 분할 추적 = 분할식(C1) vs 의존추적 연결(C3)
- occurs 30x. representative rationale:
  - **m2_geometry_properties_set07 type1 Q1-2 84-90% [type-wide]** 이등변삼각형의 성질(2) 꼭지각의 이등분선은 밑변을 수직이등분한다
    - Q1~Q2는 이등변삼각형의 꼭지각 이등분선이 밑변을 수직이등분한다는 성질로 BD=DC를 만든 뒤, AD 위의 분할비를 높이로 바꾸어 넓이를 계산한다. 밑변의 절반·높이의 부분 길이를 끝까지 추적하지 못하거나 넓이식을 잘못 세우는 오류가 핵심이다.
  - **m2_geometry_properties_set07 type5 Q15-18 74-93% [Q[18]]** 이등변삼각형이 되는 조건
    - Q15~Q18은 주어진 각·수선·중점 조건에서 합동인 삼각형을 찾아 대응변이 같음을 만들고, 그 결과를 이등변삼각형 조건으로 되돌린다. Q18은 점대칭으로 생긴 여러 대응 선분을 실제 CE 길이까지 이어야 하므로 선분 추적 오류를 Q18에만 둔다.
  - **m2_geometry_properties_set07 type27 Q89-91 78-92% [type-wide]** 평행사변형의 성질의 응용(3) 두 대각선은 서로 다른 것을 이등분한다
    - Q89~Q91은 평행사변형의 두 대각선이 서로를 이등분한다는 성질을 여러 교점의 길이에 적용한 뒤 둘레를 합산한다. 중점으로 얻는 절반 길이를 전체 길이와 혼동하거나 둘레의 구성 선분을 빠뜨리는 오류가 핵심이다.

### 13. vertex_extremum_parameter_recovery_failure
- current **C1**, alt **C3**
- note: 최대·최소+x값 -> 꼭짓점 -> 미지계수 역산 = 식 세우기(C1) vs 극값=꼭짓점 연결(C3)
- occurs 3x. representative rationale:
  - **m3_quadratic_function_set04 type37 Q131-133 67-76% [type-wide]** 최댓값 또는 최솟값이 주어질 때 미지수의 값 구하기 (1)
    - Q131~Q133은 최댓값 또는 최솟값과 그때의 x값으로 꼭짓점을 복원해 미지 계수를 구한다. 극값 조건에서 축과 꼭짓점을 먼저 정한 뒤 추가 점 조건을 대입하는 순서를 유지해야 한다.
  - **m3_quadratic_function_set04 type38 Q134-136 55-69% [type-wide]** 최댓값 또는 최솟값이 주어질 때 미지수의 값 구하기 (2)
    - Q134~Q136은 평행이동된 그래프의 축과 최솟값 정보를 이용해 원래 식의 미지수를 역으로 찾는다. 이동 전후 꼭짓점과 추가 점 조건이 연쇄되므로 부호와 중간값 연결을 놓치기 쉽다.
  - **m3_quadratic_function_set04 type39 Q137-139 58-61% [type-wide]** 최댓값 또는 최솟값이 주어질 때 이차함수의 식 구하기
    - Q137~Q139는 근, 최소값, 꼭짓점 등 주어진 극값 조건으로 이차함수 식 자체를 복원한다. Q138은 복원된 그래프가 모든 사분면을 지나도록 하는 a의 값을 다시 판정하므로 사분면 조건을 해당 문항에만 추가한다.

---
## C3 > C1  (current=C3, alt=C1) : 9

### 1. at_least_one_complement_failure
- current **C3**, alt **C1**
- note: '적어도 하나'<->'하나도 없음' 여사건 전략 연결 = 해석적 연결(C3) vs 설정(C1). complement_setup(C1·기계적)와 구분
- occurs 3x. representative rationale:
  - **m2_probability_set06 type29 Q97-100 62-72% [type-wide]** 적어도의 조건을 포함하는 확률
    - Q97~Q100은 “적어도 하나”를 직접 여러 경우로 나누기보다 “하나도 없는 경우”의 여사건으로 바꾸는 것이 핵심이다. 적어도 하나와 정확히 하나를 혼동하거나 여사건의 유리한 경우를 잘못 세면 오답이 된다.
  - **m2_probability_set06 type32 Q108-111 64-82% [type-wide]** 두 사건 A, B 중 적어도 하나가 일어날 확률
    - Q108~Q111은 두 사건 중 적어도 하나가 일어남을 “둘 다 일어나지 않음”의 반대로 바꾸거나 사건별 경우를 결합한다. 문장 조건을 정확한 여사건으로 바꾸고 여러 단계 결과를 끝까지 연결해야 한다.
  - **m2_probability_set06 type39 Q134-137 68-81% [type-wide]** 명중률
    - Q134~Q137은 여러 사람이 독립적으로 명중/실패할 때 “적어도 한 번 명중”, “동시에 명중” 등의 사건을 계산한다. 실패 확률을 1-p로 바꾸거나 독립 사건을 곱하는 단계가 뒤바뀌면 결과가 달라진다.

### 2. coincident_line_parameter_matching_failure
- current **C3**, alt **C1**
- note: 일치↔기울기·절편/계수비 전부 매칭 연결 = 개념 연결(C3) vs 조건식 세우기(C1). 부분충족 방지
- occurs 2x. representative rationale:
  - **m2_linear_function_set06 type24 Q24-24 77-77% [type-wide]** 일차함수의 그래프의 일치
    - Q24는 두 일차함수의 그래프가 일치하므로 기울기와 y절편이 각각 같아야 한다. 3a=9와 2a+b=-(2b-3a)를 동시에 만족시키는 매개변수 결합을 놓치면 오답이 된다.
  - **m2_linear_function_set06 type47 Q47-47 83-83% [type-wide]** 연립방정식의 해의 개수와 그래프의 위치관계
    - Q47은 교점이 무수히 많으려면 두 일차방정식이 같은 직선을 나타내야 한다. 계수비를 맞춰 a,b를 동시에 정해야 하므로 일치 조건을 부분적으로만 맞추면 안 된다.

### 3. coloring_adjacency_constraint_failure
- current **C3**, alt **C1**
- note: 인접 색 제약을 앞 색칠 결과에 따라 갱신하며 곱 = 상태 갱신 추적(C3) vs 구성(C1)
- occurs 2x. representative rationale:
  - **m2_probability_set06 type8 Q26-29 48-80% [type-wide]** 색칠하는 경우의 수
    - Q26~Q29는 인접한 영역에 같은 색을 쓰지 못하는 조건을 앞에서 칠한 결과에 따라 갱신하며 선택 수를 곱한다. Q29는 48%로 가장 낮고 여러 인접 관계가 동시에 걸려 조건 교집합을 놓치기 쉬워 해당 오류를 Q29에만 추가한다.
  - **m2_probability_set11 type2 Q5-11 30-67% [Q[6,7,8,9,11]]** 색칠하는 경우의 수
    - Q5~Q11은 색 선택의 제약을 누적해서 세는 유형이다. Q6~Q9·Q11은 인접 영역의 색을 다르게 유지해야 하고, Q5는 회전하여 같은 색칠을 별개로 세면 중복 계산이 생긴다. Q10은 숫자·모양·바탕색의 서로 다른 조건을 동시에 만족시켜야 한다.

### 4. diagonal_included_angle_derivation_failure
- current **C3**, alt **C1**
- note: 대각선 사잇각 유도 = 연결(C3) vs 식세우기(C1)
- occurs 1x. representative rationale:

### 5. equilateral_midpoint_angle_derivation_failure
- current **C3**, alt **C1**
- note: 정삼각형 중점→각 유도 = 연결(C3) vs 식세우기(C1)
- occurs 1x. representative rationale:

### 6. lexicographic_rank_tracking_failure
- current **C3**, alt **C1**
- note: 사전식 앞자리 묶음크기·누적순위로 목표 추적 = 단계 연결·추적(C3). stage_indexing_error(C3) 계열
- occurs 1x. representative rationale:
  - **m2_probability_set06 type14 Q50-53 65-83% [type-wide]** 사전식으로 나열하는 경우
    - Q50~Q53은 사전식 배열에서 앞자리별로 묶이는 개수를 이용해 목표 순번이 어느 묶음에 속하는지 단계적으로 추적한다. 한 묶음의 크기 또는 몇 번째부터 시작하는지를 1칸 밀리게 읽으면 이후 순위가 모두 어긋난다.

### 7. multi_circle_length_dependency_tracking_failure
- current **C3**, alt **C1**
- note: 여러 원 길이 의존 추적 = 연결(C3) vs 식세우기(C1)
- occurs 1x. representative rationale:

### 8. multi_circle_radius_dependency_failure
- current **C3**, alt **C1**
- note: 여러 원 반지름 의존 = 연결(C3) vs 식세우기(C1)
- occurs 1x. representative rationale:

### 9. quadratic_root_intercept_relation_failure
- current **C3**, alt **C1**
- note: 근 ↔ x절편좌표·두근거리·대칭축 연결 = 개념 연결(C3) vs 식세우기(C1)
- occurs 4x. representative rationale:
  - **m3_quadratic_function_set04 type22 Q76-79 49-83% [type-wide]** 이차함수 y=ax²+bx+c의 그래프가 축과 만나는 점
    - Q76~Q79는 x축·y축과의 교점을 구해 근의 위치, 두 근 사이 거리 또는 도형의 좌표로 연결한다. Q79는 49%로 가장 낮고 두 x절편과 y절편이 만드는 삼각형의 외심 조건까지 사용하므로 축절편 삼각형 구성을 해당 문항에만 추가한다.
  - **m3_quadratic_function_set04 type34 Q121-123 56-75% [type-wide]** 이차함수의 식 구하기(5) x축과의 두 교점과 다른 한 점을 알 때
    - Q121~Q123은 두 x절편을 이용해 y=a(x-r1)(x-r2) 꼴을 만들고 다른 한 점 또는 꼭짓점 조건으로 a를 정한다. 근과 x절편을 인수로 옮기는 방향과 이후 계수 결정을 혼동하면 식 전체가 틀어진다.
  - **m3_quadratic_function_set10 type10 Q73-80 52-87% [type-wide]** 이차함수 y=ax²+bx+c의 그래프가 축과 만나는 점
    - Q73~Q80은 x절편·y절편·두 근과 대칭축의 관계를 이용해 좌표 또는 미지수를 구한다. Q78은 52%로 두 x절편과 y절편이 만드는 삼각형의 외심 조건까지 사용하고, Q80은 AC:CB=1:3을 실제 좌표 길이로 바꾸어야 한다.

