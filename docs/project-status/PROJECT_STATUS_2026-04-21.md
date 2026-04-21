# PROJECT_STATUS
날짜: 2026-04-21

## 프로젝트명
수행평가 탐구엔진 / MINI 보고서 생성 흐름 개편

## 오늘 작업 핵심 요약
오늘은 엔진의 흐름을 **학과가 먼저 결론을 정하는 구조**에서  
**교과 개념의 종단 연결성을 먼저 보여주고, 학과는 우선순위만 보정하는 구조**로 바꾸는 작업을 중심으로 진행했다.

핵심 변화는 아래와 같다.

1. **과목 선택값 유지 문제 해결**
   - `대수` 같은 신규 과목을 선택하면 상단 과목 카드가 `선택 전`으로 돌아가던 문제 해결
   - 원인: `textbook_concept_helper.js`에서 `uiSeed`에 없는 과목을 빈 문자열로 처리하던 구조
   - 조치: `findSubjectKey(raw)` 실패 시 `engineMap` 검색 후, 그래도 없으면 raw 과목명을 그대로 유지하도록 수정

2. **흐름 순서 변경**
   - 기존: 과목 + 학과 → 후속 연계축 → 개념/키워드
   - 변경: 과목 → 교과 개념 → 핵심 키워드 → 후속 연계축 → 학과는 우선순위 보정
   - 즉, 학과가 먼저 결론을 내리는 구조가 아니라 **교과 개념 기반 종단 탐색 구조**로 변경

3. **통합과학1 개념별 종단 연결 구축 및 미세보정**
   - 개념별 종단축 기준 파일 신규 생성
   - 실제 helper가 이 파일을 읽도록 연결
   - 개념 변경 시 4번 후속 연계축이 실제로 달라지도록 반영
   - 결과적으로 아래 분기 확인 완료
     - 과학의 측정과 우리 사회 → 데이터 / 물리 / 환경
     - 규칙성 발견과 주기율표 → 화학 / 재료
     - 기본량과 단위 → 물리 / 정량 데이터

4. **공통수학1 개념별 종단 연결 구축**
   - 공통수학1도 과목별 종단 연결 맵을 직접 읽도록 확장
   - 결과적으로 아래 분기 확인 완료
     - 경우의 수, 순열, 조합 → 확률·통계 / 정보
     - 나머지정리와 인수분해 → 대수 / 논리 문제 해결
     - 다항식의 연산 → 대수 구조 / 수리 모델링

## 오늘 완료된 단계별 패치 정리

### 1차 패치
목적: 교과서 subject data 1차 정리
- 핵심: `hemistry1_textbook_structure.json` → `chemistry1_textbook_structure.json` 파일명 정상화
- 대수는 기존 GitHub 원본 유지 판단

### 2차 패치
목적: 런타임 연결 구조 정비
- `textbook_flattened_segments_v1.json`
- `textbook_cross_subject_bridges_v1.json`
- `textbook_runtime_bridge_helper.js`
- `index.html`
교체본 생성

### 3차 패치
목적: 후속 연계축(학과-과목 연결) 보정
- `major_followup_axis.json`
- `subject_bridge_point.json`
보정
- 우선 보정 학과:
  - 컴퓨터공학과
  - 반도체공학과
  - 신소재공학과
  - 기계공학과
  - 전자공학과
  - 환경공학과
  - 건축학과
  - 건축공학과
  - 간호학과
  - 생명공학과
  - 심리학과

### 4차 패치
목적: 과목 선택 fallback 수정
- `textbook_concept_helper.js`
- 대수 선택 시 상단 과목 요약이 `선택 전`으로 돌아가지 않도록 수정

### 5차 패치
목적: 흐름 순서 변경
- `교과 개념/키워드 선택`을 `후속 연계축 선택`보다 앞에 배치
- 종단 연결성을 먼저 탐색하는 구조로 개편

### 6차 패치
목적: 통합과학1 개념별 종단 연결 기준 파일 생성
신규 파일:
- `public/keyword-engine/seed/followup-axis/integrated_science1_concept_longitudinal_map.json`

### 7차 패치
목적: 통합과학1 종단 연결 미세보정
- `textbook_concept_helper.js`가 통합과학1 종단 기준 파일을 실제로 읽도록 연결
- 개념별 4번 후속 연계축이 정밀하게 갈라지도록 조정

### 8차 패치
목적: 공통수학1 종단 연결 지원
신규 파일:
- `public/keyword-engine/seed/followup-axis/common_math1_concept_longitudinal_map.json`
수정 파일:
- `public/keyword-engine/assets/textbook_concept_helper.js`
결과:
- 공통수학1 개념별 4번 후속 연계축이 분기되도록 반영

## 현재 엔진 구조 상태

### 현재까지 안정적으로 잡힌 것
1. 과목 선택값 유지
   - 대수 포함 신규 과목 선택 가능
2. 교과 개념 먼저 선택하는 구조
3. 통합과학1 개념별 종단 연결
4. 공통수학1 개념별 종단 연결
5. 학과는 4번 축을 없애는 게 아니라 **우선순위 보정자** 역할

### 아직 남은 것
1. **정보 과목 종단 연결**
2. **화학 종단 연결**
3. **생명과학 종단 연결**
4. 이후 필요 시
   - 지구과학
   - 공통수학2 / 대수 / 확률과 통계 / 기하
5. 마지막 단계
   - 키워드가 4번 후속 연계축을 미세 조정하도록 보정
   - 현재는 개념 중심 분기만 먼저 마무리하는 단계

## 오늘 검수 결과

### 통합과학1
#### 정상 확인
- 과학의 측정과 우리 사회
  - 수리·데이터 모델링 축
  - 물리·시스템 해석 축
  - 지구·환경 데이터 해석 축
- 규칙성 발견과 주기율표
  - 화학·성질 예측 축
  - 재료·소자 설계 기초 축
- 기본량과 단위
  - 물리 기초량·측정 축
  - 정량·데이터 표준화 축

#### 판정
- 통합과학1 종단 연결 1차 마무리 가능

### 공통수학1
#### 정상 확인
- 경우의 수, 순열, 조합
  - 확률·통계 추론 축
  - 알고리즘·정보 구조 축
- 나머지정리와 인수분해
  - 대수·조건 해석 축
  - 논리·문제 해결 확장 축
- 다항식의 연산
  - 대수 구조·식 변형 축
  - 수리 모델링 기초 축

#### 판정
- 공통수학1 종단 연결 1차 마무리 가능

## 현재 우선 원칙
현재 작업 원칙은 아래처럼 고정한다.

1. **키워드보다 교과 개념 종단 연결을 먼저 완성**
2. 개념을 눌렀을 때 4번 후속 연계축이 개념 성격에 맞게 갈라져야 함
3. 학과는 축을 결정하는 것이 아니라 정렬/우선순위만 바꾸는 역할
4. 키워드가 4번을 세부 조정하는 단계는 나중에 진행
5. 한 번에 여러 층위를 같이 수정하지 않고,
   - 과목별 개념 종단 연결 완성
   - 그다음 키워드 미세조정
   순서로 진행

## 현재 실제 적용/교체가 필요한 핵심 파일들
- `public/keyword-engine/assets/textbook_concept_helper.js`
- `public/keyword-engine/assets/textbook_runtime_bridge_helper.js`
- `public/keyword-engine/index.html`
- `public/keyword-engine/seed/followup-axis/major_followup_axis.json`
- `public/keyword-engine/seed/followup-axis/subject_bridge_point.json`
- `public/keyword-engine/seed/followup-axis/integrated_science1_concept_longitudinal_map.json`
- `public/keyword-engine/seed/followup-axis/common_math1_concept_longitudinal_map.json`

## 다음 작업 우선순위
1. 정보 과목 개념별 종단 연결 설계 및 적용
2. 정보 과목 화면 검수
3. 화학 과목 개념별 종단 연결 설계 및 적용
4. 화학 과목 화면 검수
5. 생명과학 과목 개념별 종단 연결 설계 및 적용
6. 생명과학 과목 화면 검수
7. 이후 키워드 기반 4번 미세 조정 단계로 이동

## 오늘의 결론
오늘 작업으로 엔진은 단순 추천기에서
**교과 개념 기반 종단 탐색형 구조**로 방향이 크게 전환되었다.

현재 기준으로:
- 통합과학1: 완료권
- 공통수학1: 완료권
- 다음 작업은 정보 과목부터 이어가면 된다
