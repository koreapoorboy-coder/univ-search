# PROJECT_STATUS — 2026-04-20

## 0. 이 문서의 목적
이 문서는 **현재 엔진 상태, 실제 적용 파일, 고정 규칙, 오늘 완료 범위, 다음 우선 작업**을 한 번에 확인하기 위한 누적 기준 문서다.  
새 채팅으로 넘어가거나, 다른 모델/다른 세션으로 급하게 이어갈 때는 이 문서와 `handoff/NEW_CHAT_HANDOFF_2026-04-20.md`를 함께 주면 된다.

---

## 1. 프로젝트 한 줄 요약
현재 프로젝트는 **학생이 과목과 학과를 선택하면, 후속 연계축 → 추천 개념/키워드 → 도서 → 보고서 방식/관점으로 이어지는 MINI 보고서 생성 엔진**을 만드는 작업이다.

핵심 목적은 단순 추천이 아니라 다음과 같다.

1. 학생이 **학과를 잘 몰라도 학과 검색으로 진입**할 수 있어야 한다.
2. 현재 과목에서 끝나는 것이 아니라, **다음 학년 과목으로 종단 확장**되는 구조여야 한다.
3. 추천 데이터는 사람이 보기 쉬워야 하고, 동시에 **MINI가 바로 이해할 수 있는 payload 구조**로도 변환 가능해야 한다.
4. 교과서 데이터는 예쁘게 보여주는 용도가 아니라, **추천 개념/키워드와 보고서 구조를 뽑는 엔진용 근거 데이터**여야 한다.

---

## 2. 현재 엔진의 기본 화면 흐름
현재 기준으로 정리된 주 흐름은 다음과 같다.

1. **과목 선택**
2. **학과 검색**
3. **후속 과목 연계 축 선택**
4. **연계 축에 맞는 추천 개념/키워드 선택**
5. **도서 선택**
6. **보고서 방식 선택**
7. **관점 선택**

### 현재 구조 해석
- 이 구조는 “교과 개념만 먼저 보여주는 엔진”이 아니라,
  **학생이 학과부터 잡고 → 그 학과에 맞는 연계축을 먼저 잡고 → 그 축에 맞는 개념/키워드로 들어가게 하는 엔진**으로 재정렬된 상태다.
- 즉, 단순 과목 탐색 엔진이 아니라 **학과 중심 탐구 네비게이션**에 가깝다.

---

## 3. UI/입력 구조 관련 고정 결정
오늘까지 대화에서 확정한 UI/입력 설계 원칙은 아래와 같다.

### 3-1. 희망진로/희망학과 이중 구조는 쓰지 않음
- `희망진로`와 `희망 학과`를 따로 두면 중복이 심하다고 판단
- 따라서 **학과 검색 하나만 남기는 방향**으로 정리
- 학생이 진로를 모를 수 있으므로, **직접 검색 가능한 학과 입력/선택 방식**을 우선

### 3-2. 폼은 최소화 방향
- `기본 결과물`
- `이 프로그램을 쓰는 목적`
- `활동 과제 이름`
- `선생님이 준 설명/활동 안내`

같은 항목들은 중복도가 높다고 판단했고, **폼 최소화** 방향으로 정리했다.

핵심은 “학생이 입력 피로 없이 선택을 진행”하는 것이다.

### 3-3. 결과물 유형은 4개 중심으로 축소
결과물 유형은 너무 많으면 학생이 오히려 헷갈리므로, 현재는 아래 4개 중심으로 축소하는 방향이 맞다고 정리했다.

- 탐구보고서
- 실험보고서
- 발표보고서
- 자료조사 보고서

이 네 가지는 학생이 실제 학교 수행평가에서 가장 자주 마주치는 형식이고, 엔진도 이 4개를 기준으로 MINI payload를 설계하는 것이 효율적이라고 판단했다.

### 3-4. 3번 후속 연계축은 “보고서 퀄리티 업”만이 목적이 아님
가장 중요한 고정 원칙:

**후속 연계축은 단순히 현재 보고서를 잘 쓰기 위한 장치가 아니라,  
1학년 보고서를 2학년/이후 과목 활동으로 확장시키기 위한 종단평가용 연결축이다.**

즉,
- `통합과학1의 탐구`
- `공통수학1의 구조 탐구`
- `정보의 데이터 처리`
같은 현재 활동이,

다음 학년에서
- 더 심화된 과목
- 더 전공 맞춤형 활동
- 더 구체적인 수행평가/세특
으로 이어질 수 있어야 한다.

---

## 4. 후속 연계축에 대한 현재 설계 철학
후속 연계축은 처음에는 과학 4축(물리/화학/생명/지구) 중심으로 보였지만, 오늘 대화에서 방향이 크게 확정되었다.

### 고정 원칙
후속 연계축은 **과학 4축만으로 끝나면 안 된다.**

학생이 실제로 선택하는 고등학교 과목과 학과 적합성을 생각하면,
후속 연계축은 아래 축들을 함께 고려해야 한다.

- 과학 축
- 수학 축
- 정보 축
- 데이터 축
- 공학 응용 축

### 예시
- `컴퓨터공학과`를 선택했을 때
  - 무조건 물리/화학만 1순위가 아니라
  - `대수`, `확률과 통계`, `정보`, `데이터 해석`, `알고리즘적 사고`가 상위축이 될 수 있어야 한다.
- `반도체공학과`를 선택했을 때
  - 화학/물리도 중요하지만
  - 동시에 재료·구조·센서·정보 처리까지 연결될 수 있어야 한다.

즉, 연계축은 “다음 과목 이름 추천”이 아니라  
**학과가 중요하게 보는 사고 축 + 현재 과목과 연결 가능한 교과 축**이다.

---

## 5. MINI 전달 구조에 대한 고정 원칙
우리가 만드는 데이터는 화면용 설명문이기도 하지만, 최종적으로는 **MINI에게 전달될 입력 구조**여야 한다.

### 따라서 고정 원칙
- 사람이 읽기 좋은 문장과
- MINI가 해석하기 쉬운 구조화 데이터

이 둘을 동시에 만족해야 한다.

### MINI용 데이터가 가져야 할 성격
1. **모호하지 않아야 함**
2. **현재 과목 / 선택 학과 / 연계축 / 추천 개념 / 보고서 방식**이 분리되어 있어야 함
3. **다음 학년 확장 방향**이 포함되어야 함
4. “좋은 보고서 예시”가 아니라 **보고서를 어떻게 전개해야 하는지**가 들어가야 함

### 정리
즉, 우리는 앞으로도  
**학생 UI 문구**와 **MINI 전달 payload**를 구분해서 생각해야 한다.

---

## 6. 학과 데이터 현황
현재 기준은 **교육·예체능 제외, 139개 학과 1차 정리 완료** 상태다.

### 포함 범위
- 인문계열: 01~19
- 사회계열: 20~55
- 자연계열: 56~77
- 공학계열: 78~120
- 의약계열: 121~138
- 자율전공: 198

### 제외 범위
- 139~197 = 교육·예체능
- 아직 미작업

### 학과 검색 로직 상태
1차 보정 완료.

#### 확인 완료 검색어
- 심리
- 컴퓨터
- 간호
- 건축
- 환경
- 신소재
- 반도체

#### 보정 핵심
- `환경` → 단일 학과 직결이 아니라 후보 묶음 추천
- `신소재` → `신소재공학과` 직결
- `반도체` → `반도체공학과` 직결
- 1글자 alias 오탐 제거 완료

---

## 7. 현재 실제 런타임에서 중요하게 보는 파일/폴더
아래는 현재 프로젝트에서 실제로 중요하다고 정리된 핵심 경로다.

## 7-1. 메인 엔트리
- `public/keyword-engine/index.html`

## 7-2. 주요 JS
- `public/keyword-engine/assets/major_engine_helper.js`
- `public/keyword-engine/assets/textbook_concept_helper.js`
- `public/keyword-engine/assets/textbook_runtime_bridge_helper.js`  ← 새로 추가된 런타임 보조 파일

## 7-3. 학과 검색 관련 데이터
- `public/keyword-engine/seed/major-engine/major_catalog_198.json`
- `public/keyword-engine/seed/major-engine/major_profiles_master_198.json`
- `public/keyword-engine/seed/major-engine/major_alias_map.json`
- `public/keyword-engine/seed/major-engine/major_engine_router.json`
- `public/keyword-engine/seed/major-engine/major_to_book_bridge.json`

## 7-4. 후속 연계축 관련 데이터
- `public/keyword-engine/seed/followup-axis/major_followup_axis.json`
- `public/keyword-engine/seed/followup-axis/subject_bridge_point.json`

## 7-5. 교과서 구조 데이터(새 체계)
- `public/keyword-engine/seed/textbook-data/`

### 매우 중요
**`core` 폴더는 현재 엔진의 런타임 기준 데이터 저장소로 보지 않는다.**  
오늘 대화에서 고정한 원칙은 다음과 같다.

- `core`를 계속 확장하면 구조가 더 꼬일 가능성이 높음
- 따라서 엔진에서 쓸 교과서 데이터는 **새롭게 정리한 `textbook-data` 체계**에 쌓는다
- 앞으로 subject 구조 데이터는 이 경로에만 누적한다

---

## 8. 후속 연계축 관련 오늘의 실제 작업 상태
오늘 대화에서는 3번 후속 연계축을 위한 구조를 크게 정리했다.

### 8-1. 생성/보정 대상
- `major_followup_axis.json`
- `subject_bridge_point.json`

### 8-2. 핵심 설계
- 학과 기준 1차 우선 축
- 현재 선택한 과목과의 연결 지점
- 다음 학년에서 확장될 방향
- MINI에게 넘길 수 있는 간단한 해석 문장

### 8-3. 현재 확인된 정상 동작 예시
- `통합과학1 + 컴퓨터공학과`
  - → `시스템·데이터 해석 확장 축`
- `공통수학1 + 컴퓨터공학과`
  - → `수학적 규칙·논리 확장 축`

즉, **과목이 바뀌면 3번 연계축 카드도 실제로 바뀌는 상태**는 확인되었다.

### 8-4. 4번 개념 카드 분기 확인
- `통합과학1 + 컴퓨터공학과`
  - 과학의 측정과 우리 사회
  - 기본량과 단위
  - 자연 세계의 시간과 공간
- `공통수학1 + 컴퓨터공학과`
  - 이차방정식과 이차함수
  - 행렬과 행렬의 연산
  - 경우의 수, 순열, 조합

즉, **3번뿐 아니라 4번 추천 개념도 과목과 학과 조합에 따라 바뀌는 상태**까지 확인되었다.

---

## 9. 교과서 데이터 전략 — 오늘 최종 정리
오늘 가장 크게 정리된 부분 중 하나가 교과서 데이터 전략이다.

### 9-1. 교과서 데이터는 “보기 좋은 설명문”이 아니다
우리가 만드는 교과서 데이터는
- 요약문 모음이 아니라
- 엔진이 개념/키워드/축/보고서 방향을 뽑기 위한 구조화 데이터여야 한다.

### 9-2. subject별 저장 원칙
각 과목은 기본적으로 아래 3종으로 만든다.

- `v1` 공식 구조 중심
- `v2` 상세 주제 구조
- `v3` 엔진 추천용 키워드 태그화본

### 9-3. 실제 엔진 적용 원칙
실제 GitHub 런타임에는 각 과목별로 **v3를 표준 적용본**으로 둔다.

즉,
- 작업 산출물은 `v1 / v2 / v3 / zip`으로 보관
- 실제 엔진 반영은 `*_textbook_structure.json` 이름으로 정규화한 v3

### 9-4. 통합 런타임 파일
이미 만들어 둔 통합 런타임 관련 파일:
- `textbook_flattened_segments_v1.json`
- `textbook_cross_subject_bridges_v1.json`
- `textbook_runtime_master_v1.json`
- `textbook_subject_catalog.json`

그리고 이를 읽기 위한 런타임 JS:
- `textbook_runtime_bridge_helper.js`

### 9-5. 매우 중요한 현재 판단
지금은 교과 과목을 계속 추가하는 단계이므로,  
통합 런타임 파일은 **최종 재생성 전 임시 기준**으로 본다.

즉,
- 과목 추가가 더 진행되면
- 나중에 `flattened / bridges / runtime master`를 한 번 더 재생성해야 한다.

---

## 10. 오늘까지 누적 완료된 과목 데이터 현황

## 10-1. 고1 과목 — 완료
오늘 대화 기준으로 고1은 아래 과목들을 “일단 마감”하기로 정리했다.

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

### 고정 주의
- **공통영어는 제외**
- 이유: 교과서마다 지문 차이가 크고, 출판사별 편차가 커서 지금 단계에서 엔진 공통 구조로 넣기 어렵다고 판단

## 10-2. 고1 과목의 현재 파일명 기준(작업 산출물)
아래는 오늘 세션 기준 `/mnt/data`에 확인된 산출물 이름이다.

- `integrated_science1_textbook_structure_v1.json`
- `integrated_science1_textbook_structure_v2_detailed.json`
- `integrated_science1_textbook_structure_v3_keyword_tags.json`

- `integrated_science2_bundle/integrated_science2_textbook_structure_v1.json`
- `integrated_science2_bundle/integrated_science2_textbook_structure_v2_detailed.json`
- `integrated_science2_bundle/integrated_science2_textbook_structure_v3_keyword_tags.json`

- `science_inquiry1_bundle/science_inquiry1_textbook_structure_v1.json`
- `science_inquiry1_bundle/science_inquiry1_textbook_structure_v2_detailed.json`
- `science_inquiry1_bundle/science_inquiry1_textbook_structure_v3_keyword_tags.json`

- `science_inquiry2_bundle/science_inquiry2_textbook_structure_v1.json`
- `science_inquiry2_bundle/science_inquiry2_textbook_structure_v2_detailed.json`
- `science_inquiry2_bundle/science_inquiry2_textbook_structure_v3_keyword_tags.json`

- `common_math1_bundle/common_math1_textbook_structure_v1.json`
- `common_math1_bundle/common_math1_textbook_structure_v2_detailed.json`
- `common_math1_bundle/common_math1_textbook_structure_v3_keyword_tags.json`

- `common_math2_bundle/common_math2_textbook_structure_v1.json`
- `common_math2_bundle/common_math2_textbook_structure_v2_detailed.json`
- `common_math2_bundle/common_math2_textbook_structure_v3_keyword_tags.json`

- `info_textbook_bundle/info_textbook_structure_v1.json`
- `info_textbook_bundle/info_textbook_structure_v2_detailed.json`
- `info_textbook_bundle/info_textbook_structure_v3_keyword_tags.json`

- `common_korean1_bundle/common_korean1_textbook_structure_v1.json`
- `common_korean1_bundle/common_korean1_textbook_structure_v2_detailed.json`
- `common_korean1_bundle/common_korean1_textbook_structure_v3_keyword_tags.json`

- `common_korean2_bundle/common_korean2_textbook_structure_v1.json`
- `common_korean2_bundle/common_korean2_textbook_structure_v2_detailed.json`
- `common_korean2_bundle/common_korean2_textbook_structure_v3_keyword_tags.json`

- `integrated_society_bundle/integrated_society_textbook_structure_v1.json`
- `integrated_society_bundle/integrated_society_textbook_structure_v2_detailed.json`
- `integrated_society_bundle/integrated_society_textbook_structure_v3_keyword_tags.json`

- `integrated_society2_bundle/integrated_society2_textbook_structure_v1.json`
- `integrated_society2_bundle/integrated_society2_textbook_structure_v2_detailed.json`
- `integrated_society2_bundle/integrated_society2_textbook_structure_v3_keyword_tags.json`

### 실제 GitHub 반영 시 파일명 정규화 원칙
각 과목은 아래처럼 `public/keyword-engine/seed/textbook-data/` 아래에 정규 파일명으로 넣는다.

예시:
- `integrated_society_textbook_structure.json`
- `integrated_society2_textbook_structure.json`
- `common_korean1_textbook_structure.json`
- `common_korean2_textbook_structure.json`
- `common_math1_textbook_structure.json`
- `common_math2_textbook_structure.json`
- `info_textbook_structure.json`

---

## 11. 오늘까지 누적 완료된 고2 과목 데이터 현황
오늘 대화 후반부터는 고2 과목으로 넘어갔다.

### 완료된 고2 과목
- 대수
- 확률과 통계
- 미적분1
- 물리(물리학Ⅰ)
- 화학(화학Ⅰ)
- 생명과학

### 실제 산출물 이름
- `algebra_bundle/algebra_textbook_structure_v1.json`
- `algebra_bundle/algebra_textbook_structure_v2_detailed.json`
- `algebra_textbook_bundle.zip`

- `probability_statistics_bundle/probability_statistics_textbook_structure_v1.json`
- `probability_statistics_bundle/probability_statistics_textbook_structure_v2_detailed.json`
- `probability_statistics_bundle/probability_statistics_textbook_structure_v3_keyword_tags.json`

- `calculus1_bundle/calculus1_textbook_structure_v1.json`
- `calculus1_bundle/calculus1_textbook_structure_v2_detailed.json`
- `calculus1_bundle/calculus1_textbook_structure_v3_keyword_tags.json`

- `physics1_bundle/physics1_textbook_structure_v1.json`
- `physics1_bundle/physics1_textbook_structure_v2_detailed.json`
- `physics1_bundle/physics1_textbook_structure_v3_keyword_tags.json`

- `chemistry1_bundle/chemistry1_textbook_structure_v1.json`
- `chemistry1_bundle/chemistry1_textbook_structure_v2_detailed.json`
- `chemistry1_bundle/chemistry1_textbook_structure_v3_keyword_tags.json`

- `life_science_bundle/life_science_textbook_structure_v1.json`
- `life_science_bundle/life_science_textbook_structure_v2_detailed.json`
- `life_science_bundle/life_science_textbook_structure_v3_keyword_tags.json`

### 고정 주의
- 생명과학은 **업로드된 20쪽 미리보기/발췌본 기준**
- 즉, 초반 단원은 상세도가 높지만 나머지는 차례 기반 seed 성격이 강함
- 나중에 완본 PDF가 들어오면 다시 보강 가능

---

## 12. 오늘 만든 전달 패치/보조 산출물
오늘 세션 기준 `/mnt/data`에는 아래 보조 패치 파일도 있다.

- `textbook_runtime_integration_patch.zip`
- `form_minimal_patch.zip`
- `result_type_4options_patch.zip`
- `followup_axis_runtime_init.zip`
- `followup_axis_rewrite_v2.zip`
- `step3_followup_axis_bundle.zip`
- `integrated_textbook_runtime_bundle.zip`
- `project_docs_bundle.zip` (기존 보관본)
- `univ-search-main.zip` (기존 보관본)

### 해석
이 zip들은 **전달/교체용 보관 패치**다.  
실제 GitHub에 반영할 때는 zip 전체를 넣는 것이 아니라, 안의 파일을 해당 경로로 분리 반영해야 한다.

---

## 13. 현재 가장 중요한 고정 규칙
이 아래는 앞으로 새 채팅에서도 반드시 지켜야 할 규칙이다.

### 규칙 1. `core` 폴더는 현재 런타임 기준 소스가 아님
- 엔진에 쓸 데이터는 `public/keyword-engine/seed/textbook-data/`에 쌓는다.
- `core`를 기준으로 다시 설계하지 않는다.

### 규칙 2. subject 데이터는 항상 3단 구조로 만든다
- v1 = 공식 구조
- v2 = 상세 구조
- v3 = 엔진 태그화본

### 규칙 3. 실제 엔진 적용은 v3만 정규 이름으로 둔다
예:
- `algebra_textbook_structure_v3_keyword_tags.json`
  → `algebra_textbook_structure.json`

### 규칙 4. 후속 연계축은 과학 4축으로 제한하지 않는다
- 수학
- 정보
- 데이터
- 공학 응용
도 함께 본다.

### 규칙 5. 학생 UI와 MINI payload는 구분해서 생각한다
- 학생이 보는 문구는 짧고 명확해야 한다.
- MINI용 데이터는 구조화와 확장 방향이 더 중요하다.

### 규칙 6. 검색 로직은 함부로 재구축하지 않는다
- 기존 학과 alias / router 보정은 이미 많이 정리됨
- 새 문제는 부분 보정 원칙으로 접근

### 규칙 7. 설명 중심보다 “다음 학년 확장성”을 우선한다
- 3번 후속 연계축은 현재 보고서 형식을 확정하는 단계가 아니라
- **다음 학년 활동으로 이어질 방향을 정하는 단계**다.

---

## 14. 현재 남아 있는 핵심 미완료 작업
우선순위 순으로 적는다.

### A. 고2 과목 계속 추가
- 아직 남은 고2 과목 계속 구조화
- 특히 자연계/탐구 과목 추가 필요

### B. 과목 추가 완료 후 통합 런타임 재생성
아래 파일은 나중에 한 번 더 재생성해야 한다.
- `textbook_flattened_segments_v1.json`
- `textbook_cross_subject_bridges_v1.json`
- `textbook_runtime_master_v1.json`
- `textbook_subject_catalog.json`

### C. 139개 학과와 교과서 데이터의 정교 매핑
지금은 학과 검색은 많이 정리되었지만,
**교과서 세그먼트와 전 학과의 정교한 1:1 매핑은 아직 미완료**다.

즉 나중에는 아래 작업이 필요하다.
- 학과별 우선 과목
- 학과별 우선 축
- 학과별 대표 세그먼트
- 학과별 보고서 방향

### D. 4번 추천 개념/키워드 정교화
지금은 과목과 연계축에 따라 잘 바뀌는 상태지만,
전 과목/전 학과 기준으로 최종 정교화된 상태는 아니다.

### E. 도서 / 보고서 방식 / 관점 단계 후속 보정
3번, 4번이 어느 정도 안정되면
5번, 6번, 7번 단계도 교과서/학과/축과 더 강하게 연결해야 한다.

---

## 15. 다음 작업 우선순위 제안
내일/다음 채팅에서 가장 자연스러운 순서:

1. **고2 과목 추가 작업 계속**
2. 고2 과목 일정 수준 완료 후
3. **통합 런타임 파일 재생성**
4. 그 다음
5. **학과별 정교 매핑**
6. 마지막으로
7. **4번 추천 개념/키워드 + 5~7단계 정교화**

즉 지금은 **개념 정교화보다 과목 데이터 채우기가 우선**이다.

---

## 16. 이 문서를 실제로 저장할 권장 방식
현재 GitHub 쪽 문서 보관 폴더 구조는 아래처럼 두는 것이 가장 효율적이다.

- `docs/project-status/`
- `docs/handoff/`

### 권장 운영 방식
- `docs/project-status/PROJECT_STATUS.md`
  - 누적 기준 문서
- `docs/handoff/NEW_CHAT_HANDOFF_YYYY-MM-DD.md`
  - 날짜별 실무 연결 문서

또는
- `PROJECT_STATUS.md`는 매일 업데이트
- `NEW_CHAT_HANDOFF_2026-04-20.md`처럼 handoff는 날짜별 누적

이 방식이면
- 프로젝트 기준은 한 곳에서 유지
- 새 채팅 시작용 요약은 날짜별 축적 가능

---

## 17. 오늘 작업 요약 — 아주 짧게
- 학과 검색/후속 연계축 방향 고정
- UI 최소화 방향 확정
- 결과물 4종 중심으로 축소
- `core` 대신 `textbook-data` 체계 사용 원칙 확정
- 고1 과목군 마감
- 고2 과목군(대수/확통/미적분1/물리/화학/생명과학) 추가
- 다음 단계는 고2 과목 추가 → 통합 런타임 재생성 → 학과 정교 매핑

