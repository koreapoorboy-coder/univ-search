# 수학 취약유형 진단 엔진

## 현재 데이터 범위

- 중1 정수와 유리수
- 중1 문자와 식
- 중1 좌표평면과 그래프

## 이번 좌표평면과 그래프 데이터 구조

- 원본 이미지: `sources/m1_coordinate_graph/images/001.png` ~ `013.png`
- 원본 섹션 인덱스: `data/raw_taxonomy/m1_coordinate_graph.raw_taxonomy.v1.json`
- 문항 유형 DB: `data/problem_types/m1_coordinate_graph.problem_types.v1.json`
- 개념 노드 통합 DB: `data/math_concepts.v1.json`
- 개념 연결 DB: `data/relations/m1_coordinate_graph.edges.v1.json`
- 진단 규칙 DB: `data/rules/m1_coordinate_graph.diagnosis_rules.v1.json`
- 보강 추천 DB: `data/remediation/m1_coordinate_graph.remediation_map.v1.json`

## 데이터 성격

좌표평면과 그래프 원본 ZIP은 문제 출제 프로그램에서 추출된 이미지 기반 문항 분류표입니다. 이번 패치에서는 원본 이미지를 보존하고, 그 위에 진단용 curated layer를 추가했습니다.

1. `raw_taxonomy`: 원본 분류표의 섹션 단위 인덱스입니다. 원본 leaf 전체는 이미지로 보존합니다.
2. `problem_types`: 학생 시험 문항을 매칭하기 위한 표준 문항 유형입니다.
3. `math_concepts`: 문항 유형을 취약 개념 단위로 묶은 개념 노드입니다.
4. `edges`: 선행·후행·중2 이후 연결성을 표현한 개념 연결 DB입니다.

## 접속 경로

GitHub Pages 기준:

```text
/math-weakness-engine/
```

## 누적 적용 방식

이번 ZIP은 누적 패치입니다. 기존 `정수와 유리수`, `문자와 식` 데이터가 포함되어 있고, `좌표평면과 그래프` 데이터가 추가되어 있습니다.


## v0.4 추가: 중1 평면도형의 성질
- 원본 이미지 11개 보존: `sources/m1_plane_geometry/images/`
- 원본 섹션 인덱스: `data/raw_taxonomy/m1_plane_geometry.raw_taxonomy.v1.json`
- 문항 유형 DB: `data/problem_types/m1_plane_geometry.problem_types.v1.json`
- 개념 연결 DB: `data/relations/m1_plane_geometry.edges.v1.json`
- 진단 규칙: 각도/정다각형/대각선/작도·합동/원·부채꼴/복합도형 분해/도형 조건 식 세우기


## v0.5 추가: 중1 기본 도형과 작도
- 원본 이미지 6개 보존: `sources/m1_basic_geometry/images/`
- 원본 섹션 인덱스: `data/raw_taxonomy/m1_basic_geometry.raw_taxonomy.v1.json`
- 문항 유형 DB: `data/problem_types/m1_basic_geometry.problem_types.v1.json`
- 개념 연결 DB: `data/relations/m1_basic_geometry.edges.v1.json`
- 진단 규칙: 직선·반직선·선분/각도 조건/위치 관계/평행선/작도/삼각형 결정조건/합동조건
