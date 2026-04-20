[PROJECT_STATUS.md](https://github.com/user-attachments/files/26882620/PROJECT_STATUS.md)
# Project Status Snapshot — 2026-04-20

## 1. 현재 프로젝트 상태
현재 기준은 **교육·예체능 제외, 139개 학과 확정본**입니다.

### 포함 범위
- 인문계열: 01~19
- 사회계열: 20~55
- 자연계열: 56~77
- 공학계열: 78~120
- 의약계열: 121~138
- 자율전공: 198

### 제외 범위
- 139~197 = 교육·예체능
- 이 구간은 아직 미작업

---

## 2. 현재 실제 적용 중인 주요 파일

### 엔트리 페이지
- `public/keyword-engine/index.html`

### 런타임 JS
- `public/keyword-engine/assets/keyword_engine.js`
- `public/keyword-engine/assets/topic_generator.js`
- `public/keyword-engine/assets/textbook_concept_helper.js`
- `public/keyword-engine/assets/major_engine_helper.js`

### 실제 적용 학과 데이터
- `public/keyword-engine/seed/major-engine/major_catalog_198.json`
- `public/keyword-engine/seed/major-engine/major_profiles_master_198.json`
- `public/keyword-engine/seed/major-engine/major_alias_map.json`
- `public/keyword-engine/seed/major-engine/major_engine_router.json`
- `public/keyword-engine/seed/major-engine/major_to_book_bridge.json`

### 과목/개념 관련 데이터
- `public/keyword-engine/seed/textbook-v1/subject_concept_ui_seed.json`
- `public/keyword-engine/seed/textbook-v1/subject_concept_engine_map.json`
- `public/keyword-engine/seed/textbook-v1/topic_matrix_seed.json`

---

## 3. 지금까지 완료된 작업
- 학과 카드 1차 정리 완료
- 검색 로직 1차 보정 완료
- 1글자 alias 오탐 제거 완료
- `환경` = 후보 묶음 추천
- `신소재` = `신소재공학과` 직결
- `반도체` = `반도체공학과` 직결

### 확인 완료 검색어
- 심리
- 컴퓨터
- 간호
- 건축
- 환경
- 신소재
- 반도체

---

## 4. 현재 엔진 구조 핵심
현재 흐름은 대체로 다음과 같습니다.

1. 학생이 **선택과목** 선택
2. 학생이 **학과/희망진로** 선택
3. 엔진이 **연계축** 추천
4. 그 축에 맞춰 과목 내부 개념과 키워드 재정렬
5. 최종적으로 **mini 보고서 생성용 payload**로 변환 필요

### 중요한 해석
현재의 `물리/화학/생명/지구` 4축은 엄밀히 말하면
**후속 과목 연계 축 전체**가 아니라 **과학 탐구 축**에 가깝습니다.

즉,
- 지금 구조는 과학 내부 방향 추천에는 강함
- 하지만 수학/정보/데이터/공학 응용까지 포함한 전체 후속 교과 설계는 아직 미분리 상태

---

## 5. 현재 확인된 한계
- 연계축이 아직 코드 규칙 중심
- 학과별 후속 연계축이 별도 마스터 데이터로 분리되어 있지 않음
- mini에게 전달할 보고서 생성용 구조가 화면용 데이터와 분리되어 있지 않음
- 새 채팅으로 갈 때마다 현재 상태를 수동으로 정리해야 함

---

## 6. 다음 우선 작업
### 작업 목표
**학과별 후속 연계축 매핑 데이터**를 분리 정립

### 추천 신규 파일
- `public/keyword-engine/seed/major-engine/major_followup_axis_master.json`

### 추천 역할
- 학과별 1순위/2순위 과학 축
- 수학/정보/데이터/공학 응용 축 포함 가능
- mini 전달용 보고서 생성 payload의 기반 데이터

---

## 7. 추천 데이터 구조
### 최소 필드
- `major_name`
- `axis_domain`
- `axis_title`
- `axis_order`
- `linked_subjects`
- `axis_desc`
- `is_primary`
- `active`

### axis_domain 예시
- `science`
- `math`
- `info`
- `data`
- `engineering`

---

## 8. mini 보고서용 설계 원칙
학생 선택 화면용 데이터와 mini 전달용 데이터는 분리하는 것이 좋습니다.

### 권장 3단 구조
1. 학생 선택 데이터  
   - 선택과목
   - 학과
   - 연계축
   - 세부 개념

2. 엔진 해석 데이터  
   - 학과 핵심 키워드
   - 과학 축 우선순위
   - 후속 교과 축 우선순위
   - 추천 개념
   - 탐구 방향
   - 주의사항

3. mini 전달용 보고서 payload  
   - 보고서 목적
   - 필수 포함 요소
   - 금지 요소
   - 권장 개요
   - 난이도
   - 문체
   - 결과물 형식

---

## 9. GitHub에 저장할 문서 운영 방식 추천
### 추천 폴더
- `docs/project-status/`
- `docs/handoff/`

### 추천 파일 2종
1. `PROJECT_STATUS.md`
   - 현재 엔진 구조
   - 실제 적용 파일
   - 완료 범위
   - 고정 규칙
   - 주의사항

2. `NEW_CHAT_HANDOFF.md`
   - 새 채팅에서 바로 붙여넣을 요약
   - 다음 작업 목표
   - 필요한 원본 데이터
   - 수정할 파일 경로

이렇게 분리하면
- 하나는 누적 기준 문서
- 하나는 채팅 연결용 실무 문서
로 사용 가능합니다.

---

## 10. 새 채팅 시작용 예시 문구
```text
지금부터는 학과 카드가 아니라 후속 연계축 구조를 이어서 작업할게.

현재 기준:
- 교육·예체능 제외
- 139개 학과 기준으로 1차 정리 완료
- 범위: 인문 01~19 / 사회 20~55 / 자연 56~77 / 공학 78~120 / 의약 121~138 / 자율전공 198
- 학과 카드와 검색 로직 1차 보정 완료
- 실제 런타임 파일 기준으로 major_catalog / major_profiles / alias_map / router / bridge가 적용 중
- 현재 연계축은 textbook_concept_helper.js 내부 규칙 기반이며, 학과별 후속 연계축 마스터 데이터는 아직 없음

이번 작업 목표:
- 학과별 후속 연계축 매핑 데이터를 새로 설계
- 과학 4축만이 아니라 수학/정보/데이터까지 포함 가능한 구조로 정리
- 학생 화면용 구조와 mini 보고서 생성용 payload 구조를 분리 설계
```
