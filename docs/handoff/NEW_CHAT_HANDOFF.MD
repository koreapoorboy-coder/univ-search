# NEW_CHAT_HANDOFF — 2026-04-20

## 0. 이 문서의 목적
이 문서는 **새 채팅에서 바로 이어서 작업하기 위한 실전용 handoff**다.  
다른 설명 없이 이 문서만 주면, 지금까지의 흐름과 고정 규칙을 거의 그대로 이어갈 수 있도록 작성했다.

---

## 1. 지금까지 프로젝트가 어디까지 왔는가

### 프로젝트 정체
현재 만드는 것은  
**학생이 과목과 학과를 선택하면 → 후속 연계축 → 추천 개념/키워드 → 도서 → 보고서 방식 → 관점**으로 이어지는 MINI 보고서 생성 엔진이다.

이 엔진은 단순 추천기가 아니다.

핵심 목적:
- 학생이 학과를 몰라도 검색으로 시작할 수 있어야 함
- 지금 과목의 탐구를 다음 학년 과목으로 확장할 수 있어야 함
- MINI에게 넘길 수 있는 구조화 payload까지 고려해야 함

---

## 2. 이번 채팅에서 확정된 가장 중요한 고정 방향

### A. 엔진의 출발점은 “학과 검색”이다
기존처럼 희망진로/희망학과를 나눠서 두지 않는다.  
중복이 심해서 **학과 검색 하나만 중심**으로 간다.

### B. 3번 후속 연계축은 단순 보고서 퀄리티 업 단계가 아니다
가장 중요하다.

이 단계는:
- 지금 보고서를 더 예쁘게 쓰는 단계가 아니라
- **다음 학년까지 이어질 확장 방향을 선택하는 단계**다.

즉,
- 1학년에서 쓴 보고서
- 2학년 과목에서 확장
- 세특/활동 연속성 확보
를 목표로 한다.

### C. 후속 연계축은 과학 4축만 보면 안 된다
과학만으로는 반쪽짜리다.

반드시 같이 고려해야 할 축:
- 수학
- 정보
- 데이터
- 공학 응용
- 과학

예:
- 컴퓨터공학과면 대수/확률과 통계/정보/데이터 축이 상위일 수 있음
- 반도체면 화학/물리뿐 아니라 재료·구조·정보 처리 축도 봐야 함

### D. MINI가 이해하기 쉬운 구조로 계속 설계해야 한다
앞으로 만드는 모든 데이터는
- 학생 UI 문구
- MINI용 payload
를 동시에 염두에 두고 설계해야 한다.

즉 설명문이 아니라
- 현재 과목
- 학과
- 연계축
- 추천 개념
- 보고서 방식
- 다음 학년 확장
이 분리된 구조가 중요하다.

### E. `core` 폴더는 기준으로 보지 않는다
핵심 고정 규칙이다.

현재 엔진용 교과서 데이터는
**`public/keyword-engine/seed/textbook-data/`**
에 새로 쌓는다.

`core`를 손대거나 기준으로 재정렬하지 않는다.

---

## 3. 현재 실제로 중요하게 보는 경로

### 엔트리
- `public/keyword-engine/index.html`

### 주요 JS
- `public/keyword-engine/assets/major_engine_helper.js`
- `public/keyword-engine/assets/textbook_concept_helper.js`
- `public/keyword-engine/assets/textbook_runtime_bridge_helper.js`

### 학과 데이터
- `public/keyword-engine/seed/major-engine/major_catalog_198.json`
- `public/keyword-engine/seed/major-engine/major_profiles_master_198.json`
- `public/keyword-engine/seed/major-engine/major_alias_map.json`
- `public/keyword-engine/seed/major-engine/major_engine_router.json`
- `public/keyword-engine/seed/major-engine/major_to_book_bridge.json`

### 후속 연계축 데이터
- `public/keyword-engine/seed/followup-axis/major_followup_axis.json`
- `public/keyword-engine/seed/followup-axis/subject_bridge_point.json`

### 새 교과서 데이터 저장 경로
- `public/keyword-engine/seed/textbook-data/`

### 통합 런타임 파일
- `public/keyword-engine/seed/textbook-data/textbook_flattened_segments_v1.json`
- `public/keyword-engine/seed/textbook-data/textbook_cross_subject_bridges_v1.json`
- `public/keyword-engine/seed/textbook-data/textbook_runtime_master_v1.json`
- `public/keyword-engine/seed/textbook-data/textbook_subject_catalog.json`

---

## 4. 학과 데이터 현재 상태
현재 기준:
- 교육·예체능 제외
- **139개 학과 1차 정리 완료**

범위:
- 인문 01~19
- 사회 20~55
- 자연 56~77
- 공학 78~120
- 의약 121~138
- 자율전공 198

제외:
- 139~197 = 교육·예체능, 아직 미작업

검색 보정 완료 키워드:
- 심리
- 컴퓨터
- 간호
- 건축
- 환경
- 신소재
- 반도체

보정 핵심:
- 환경 → 후보 묶음
- 신소재 → 신소재공학과 직결
- 반도체 → 반도체공학과 직결
- 1글자 alias 오탐 제거

---

## 5. 화면/UI 상태
현재 방향:
- 과목
- 학과 검색
- 후속 연계축
- 추천 개념/키워드
- 도서
- 보고서 방식
- 관점

### 입력 폼 관련 고정 방향
- 폼은 최소화
- 희망진로 따로 안 씀
- 학과 검색으로 통일
- 결과물 유형은 아래 4개 중심
  - 탐구보고서
  - 실험보고서
  - 발표보고서
  - 자료조사 보고서

---

## 6. 3번 후속 연계축 현재 확인된 동작
현재 화면에서 확인된 정상 동작 예시는 아래와 같다.

### 예시 1
- 과목: 통합과학1
- 학과: 컴퓨터공학과
- 결과:
  - `시스템·데이터 해석 확장 축`

### 예시 2
- 과목: 공통수학1
- 학과: 컴퓨터공학과
- 결과:
  - `수학적 규칙·논리 확장 축`

즉, 과목이 바뀌면 3번 카드가 실제로 바뀌는 상태는 확인되었다.

---

## 7. 4번 추천 개념/키워드 현재 확인된 동작
3번 연계축에 따라 4번 추천 개념 카드도 바뀌는 상태를 확인했다.

### 예시 1
- 통합과학1 + 컴퓨터공학과
- 개념 카드:
  - 과학의 측정과 우리 사회
  - 기본량과 단위
  - 자연 세계의 시간과 공간

### 예시 2
- 공통수학1 + 컴퓨터공학과
- 개념 카드:
  - 이차방정식과 이차함수
  - 행렬과 행렬의 연산
  - 경우의 수, 순열, 조합

즉,
- 3번이 바뀌면
- 4번도 같이 바뀐다.

---

## 8. 오늘까지 완료된 교과서 데이터

## 8-1. 고1 완료
고1은 현재 다음 과목들까지 완료로 보고 일단 마감했다.

- 통합과학1
- 통합과학2
- 과학탐구실험1
- 과학탐구실험2
- 공통수학1
- 공통수학2
- 정보
- 공통국어1
- 공통국어2
- 통합사회
- 통합사회2

### 제외
- 공통영어는 출판사별 지문 편차 때문에 현재 제외

## 8-2. 고2 오늘 완료
- 대수
- 확률과 통계
- 미적분1
- 물리학Ⅰ
- 화학Ⅰ
- 생명과학

### 주의
- 생명과학은 20쪽 미리보기/발췌본 기반
- 초반부는 상세화, 나머지는 차례 기반 seed

---

## 9. subject 데이터 생성 방식 (앞으로도 유지)
각 과목은 항상 아래 3종 + zip으로 작업한다.

1. `v1` = 공식 구조 위주
2. `v2` = 상세 구조
3. `v3` = 엔진용 키워드 태그화본
4. `zip` = 전달용 묶음

### 실제 GitHub 적용은 항상 v3
예:
- `algebra_textbook_structure_v3_keyword_tags.json`
→ 실제 엔진에서는
- `algebra_textbook_structure.json`
으로 저장

### 저장 위치
- `public/keyword-engine/seed/textbook-data/`

---

## 10. 오늘 생성/수정된 주요 산출물 요약

### 후속 연계축/런타임 쪽
- `major_followup_axis.json`
- `subject_bridge_point.json`
- `textbook_runtime_bridge_helper.js`
- `index.html` 일부 연결/보정
- 결과물 4종 옵션 패치
- 폼 최소화 패치

### 교과서 데이터 쪽
- 고1 과목군 정리본 유지
- 고2 과목군 6과목 신규 정리

### 통합 데이터 쪽
- `textbook_flattened_segments_v1.json`
- `textbook_cross_subject_bridges_v1.json`
- `textbook_runtime_master_v1.json`
- `textbook_subject_catalog.json`

---

## 11. 지금 바로 다음에 해야 할 일
우선순위는 무조건 아래 순서다.

### 1순위
**고2 과목 추가 작업 계속**

이유:
- 지금은 개념 정교화보다 과목 수집이 더 중요함
- 과목이 덜 채워진 상태에서 정교화하면 나중에 또 뜯어고쳐야 함

### 2순위
고2 과목이 더 쌓이면  
**통합 런타임 파일 재생성**

재생성 대상:
- `textbook_flattened_segments_v1.json`
- `textbook_cross_subject_bridges_v1.json`
- `textbook_runtime_master_v1.json`
- `textbook_subject_catalog.json`

### 3순위
**139개 학과와 subject 데이터 정교 매핑**

해야 할 것:
- 학과별 우선 과목
- 학과별 우선 축
- 학과별 대표 세그먼트
- 학과별 보고서 방향

### 4순위
**4번 추천 개념/키워드 최종 정교화**

### 5순위
**도서 / 보고서 방식 / 관점 단계 정교화**

---

## 12. 새 채팅에서 바로 써도 되는 작업 지시문
아래 내용을 새 채팅 첫 메시지로 그대로 붙여넣으면 된다.

```text
지금부터는 수행평가 탐구엔진 작업을 이어갈게.

현재 고정 기준:
- 학과 데이터는 교육·예체능 제외 139개 학과 1차 정리 완료
- 검색 보정 완료 키워드: 심리, 컴퓨터, 간호, 건축, 환경, 신소재, 반도체
- 엔진 기본 흐름은 과목 → 학과 검색 → 후속 연계축 → 추천 개념/키워드 → 도서 → 보고서 방식 → 관점
- 희망진로/희망학과 이중 구조는 안 쓰고 학과 검색 하나만 중심으로 감
- 결과물 유형은 탐구보고서 / 실험보고서 / 발표보고서 / 자료조사 보고서 4개 중심
- 후속 연계축은 단순 보고서 퀄리티 업이 아니라 다음 학년 과목까지 이어지는 종단평가용 확장축으로 설계
- 연계축은 과학 4축만이 아니라 수학/정보/데이터/공학 응용 축도 함께 봐야 함
- MINI가 이해하기 쉬운 구조화 payload를 계속 염두에 두고 작업
- core 폴더는 엔진 기준으로 쓰지 않고, 새 교과서 데이터는 public/keyword-engine/seed/textbook-data/ 에 누적
- 각 과목 데이터는 v1(공식 구조) / v2(상세 구조) / v3(엔진 태그화본)으로 만들고 실제 반영은 v3만 정규 파일명으로 사용

오늘까지 완료된 과목:
[고1]
통합과학1, 통합과학2, 과학탐구실험1, 과학탐구실험2, 공통수학1, 공통수학2, 정보, 공통국어1, 공통국어2, 통합사회, 통합사회2
※ 공통영어는 제외

[고2]
대수, 확률과 통계, 미적분1, 물리학Ⅰ, 화학Ⅰ, 생명과학
※ 생명과학은 20쪽 미리보기/발췌본 기반이라 일부는 차례 기반 seed

현재 중요한 경로:
- public/keyword-engine/index.html
- public/keyword-engine/assets/major_engine_helper.js
- public/keyword-engine/assets/textbook_concept_helper.js
- public/keyword-engine/assets/textbook_runtime_bridge_helper.js
- public/keyword-engine/seed/followup-axis/major_followup_axis.json
- public/keyword-engine/seed/followup-axis/subject_bridge_point.json
- public/keyword-engine/seed/textbook-data/

지금 바로 해야 할 일:
1) 고2 과목 추가 작업 계속
2) 과목이 더 쌓이면 통합 런타임 파일(textbook_flattened_segments_v1.json / textbook_cross_subject_bridges_v1.json / textbook_runtime_master_v1.json / textbook_subject_catalog.json) 재생성
3) 그 다음 139개 학과와 subject 데이터 정교 매핑
4) 마지막으로 4번 추천 개념/키워드와 이후 단계 정교화

이번 채팅에서는 먼저 [여기에 다음 과목명 또는 수정 목표 입력]부터 진행해줘.
```

---

## 13. 다음 채팅에서 하지 말아야 할 것
- `core` 폴더 기준으로 다시 설계하지 말 것
- 학과 검색 로직 전체를 갈아엎지 말 것
- 과목 데이터가 덜 쌓인 상태에서 4번 정교화부터 먼저 하지 말 것
- 학생 UI용 문장과 MINI payload를 섞어서 생각하지 말 것
- 단순 설명문 위주로 subject 데이터를 만들지 말 것

---

## 14. 권장 저장 방식
GitHub 문서 폴더는 계속 아래 구조로 운영 추천.

- `docs/project-status/PROJECT_STATUS.md`
- `docs/handoff/NEW_CHAT_HANDOFF_YYYY-MM-DD.md`

### 추천 사용법
- `PROJECT_STATUS.md` = 누적 기준 문서
- `NEW_CHAT_HANDOFF_YYYY-MM-DD.md` = 날짜별 연결 로그

이렇게 두면
- 매일 작업 종료 시 handoff를 하나씩 저장 가능
- 누적 규칙은 project-status 문서 하나에 계속 반영 가능

