# Boundary review dossier -- axis C2 residuals (all alts, held excluded)
> Canonical 11 maps. Current axis = C2. Confirm C2 or flip to alt.
- total: 8

---
## C2 > A3  : 1

### 1. isosceles_altitude_bisection_overlooked
- note: 이등변삼각형 꼭지높이=밑변이등분 성질(문제 미명시, 학생이 알고 꺼내써야 함) 미적용 = 개념(C2). 검수확정 B1→C2: contextual_offset_omission(B1)은 문제에 명시된 조건 미독해라 다름. alt=A3(성질 정리 안 함) 제안
- occurs 6x. rationale:
  - **m2_geometry_properties_set07 type1 Q1-2 84-90% [type-wide]** 이등변삼각형의 성질(2) 꼭지각의 이등분선은 밑변을 수직이등분한다
    - Q1~Q2는 이등변삼각형의 꼭지각 이등분선이 밑변을 수직이등분한다는 성질로 BD=DC를 만든 뒤, AD 위의 분할비를 높이로 바꾸어 넓이를 계산한다. 밑변의 절반·높이의 부분 길이를 끝까지 추적하지 못하거나 넓이식을 잘못 세우는 오류가 핵심이다.
  - **m2_similarity_set04 type54 Q122-123 39-78% [type-wide]** 이등변삼각형의 높이와 넓이
    - Q122~Q123은 이등변삼각형의 꼭짓점에서 내린 높이가 밑변을 이등분한다는 사실이 출발점이다. Q123은 39%로 크게 낮고 높이·밑변을 구한 뒤 내접 정사각형의 윗변과 밑변 사이에 닮은 삼각형 비례식을 새로 세워야 하므로 similar_triangle_correspondence_setup_failure를 Q123에만 둔다.

---
## C2 > B2  : 1

### 1. mixed_function_ordering_failure
- note: 서로 다른 함수값 대소 정렬 = 개념비교(C2) vs 범위(B2)
- occurs 2x. rationale:
  - **m3_trigonometric_ratio_set01 type19 Q76-78 66-86% [type-wide]** 삼각비의 값의 대소 관계
    - Q76~Q78은 0°~90°에서 sin·cos·tan의 증가·감소와 서로 다른 함수값의 관계를 비교한다. Q77~Q78은 사분원 그림의 수평·수직 투영을 함수값으로 읽어야 하므로 축 방향을 뒤집는 오류를 두 문항에 둔다.

---
## C2 > C4  : 2

### 1. special_angle_identification_from_tangent_failure
- note: tan값으로 특수각 판정 = 개념(C2) vs 변환(C4)
- occurs 1x. rationale:

### 2. vertex_axis_reading_failure
- note: 꼭짓점·대칭축 식별·읽기(꼭짓점형/그래프) = 개념 식별(C2) vs 표현 읽기(C4)
- occurs 7x. rationale:
  - **m3_quadratic_function_set04 type6 Q19-22 68-88% [type-wide]** 이차함수 y=ax²의 그래프의 성질
    - Q19~Q22는 원점 꼭짓점, 대칭축 x=0, 열린 방향, 값의 범위와 증가·감소 성질을 판정한다. 그래프 성질을 개별 진술에 일관되게 적용하고 꼭짓점·축을 혼동하지 않는 것이 핵심이다.
  - **m3_quadratic_function_set04 type10 Q34-37 73-84% [type-wide]** 이차함수 y=ax²+q의 그래프의 성질
    - Q34~Q37은 y=ax²+q의 꼭짓점 (0,q), 대칭축, 폭, 사분면과 증가·감소를 판정한다. Q36은 옳지 않은 설명 2개를 모두 고르는 문항이라 그래프 성질 판정과 복수정답 누락을 함께 확인한다.

---
## C2 > D2  : 3

### 1. addition_principle_selection_error
- note: ★합의 법칙(더할지)을 곱으로 처리 = 세는 방식 개념혼동(C2). law_selection_error(D2·공식선택)와 구분(검수 지시). alt D2
- occurs 1x. rationale:
  - **m2_probability_set06 type3 Q8-10 30-73% [type-wide]** 경우의 수의 합(1) 숫자를 선택하거나 주사위를 던지는 경우
    - Q8~Q10은 서로 겹치지 않는 여러 경우를 각각 센 뒤 합하는 구조가 공통이다. 특히 Q9는 정답률 30%로, 세 번의 주사위 결과를 이동량과 연결한 뒤 최종 위치 조건까지 추적하는 단계가 추가되어 다단계 오류를 Q9에만 둔다.

### 2. multiplication_principle_selection_error
- note: ★곱의 법칙(곱할지)을 합으로 처리 = 세는 방식 개념혼동(C2). 최다빈출 신규(8회). law_selection D2와 구분
- occurs 8x. rationale:
  - **m2_probability_set06 type4 Q11-14 70-71% [type-wide]** 경우의 수의 곱(1) 서로 다른 사건이 동시에 일어나는 경우의 수
    - Q11~Q14는 서로 다른 두 시행의 결과를 순서 있는 전체 결과로 만든 뒤 동전·주사위의 추가 조건을 동시에 만족시키는 경우를 센다. 합의 법칙으로 잘못 처리하거나 (앞 결과, 뒤 결과)의 순서를 합치면 오답이 된다.
  - **m2_probability_set06 type5 Q15-18 50-71% [type-wide]** 경우의 수의 곱(2) 교통수단이나 길을 선택하는 경우
    - Q15~Q18은 구간별 교통수단·길 선택 수를 곱하여 전체 경로 수를 만든다. Q17~Q18은 왕복 과정에서 이미 이용한 길을 다시 쓰지 않는 제한이 추가되므로 제외 조건 누락을 해당 문항에만 적용한다.

### 3. trapezoid_midsegment_average_error
- note: 사다리꼴 중점연결=(윗변+아랫변)/2 개념 오적용(삼각형 ½공식과 혼동). 개념(C2) vs 공식대입(D2)
- occurs 2x. rationale:
  - **m2_similarity_set04 type30 Q66-66 67-67% [type-wide]** 사다리꼴의 두 변의 중점을 연결한 선분의 성질
    - Q66은 사다리꼴의 두 옆변 중점을 이은 MN의 길이가 (AD+BC)/2임을 사용하고, 두 대각선과의 교점 P,Q가 만드는 MP·PQ의 분할 관계를 추가로 해석한다. 평균 길이와 내부 분할비를 같은 식에 올리는 과정이 핵심이다.
  - **m2_similarity_set09 type25 Q71-74 52-73% [type-wide]** 사다리꼴의 두 변의 중점을 연결한 선분의 성질
    - Q71~Q74는 사다리꼴의 두 옆변 중점을 이은 선분 길이가 두 밑변의 평균이라는 성질과 대각선 교점의 분할비를 함께 사용한다. MP:PQ 같은 내부 비를 전체 중점선 길이와 연결하는 과정에서 비례식 방향을 유지해야 한다.

---
## C2 > D3  : 1

### 1. combination_selection_count_error
- note: nCr(순서무시)을 배열수와 혼동 = 조합 개념(C2) vs 계산(D3)
- occurs 5x. rationale:
  - **m2_probability_set06 type16 Q58-60 49-68% [type-wide]** 대표를 뽑는 경우의 수(2) 자격이 같은 경우
    - Q58~Q60은 대표처럼 자격이 같아 순서를 세지 않는 선택이 기본이다. Q60은 각 사람이 자기 자리를 피해야 하는 금지 위치 배열이 추가되고 정답률도 49%로 낮아 금지 위치 오류를 Q60에만 둔다.
  - **m2_probability_set06 type17 Q61-64 49-77% [type-wide]** 만들 수 있는 삼각형의 개수
    - Q61~Q64는 여러 점 중 필요한 개수를 순서 없이 선택하되, 한 직선 위의 점만 골라 도형이 만들어지지 않는 조합을 제외해야 한다. Q63은 49%로 삼각형과 사각형 조건을 함께 세어야 해 여러 조건을 동시에 관리하는 부담도 크다.

