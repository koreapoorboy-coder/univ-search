좋아. 아래 내용은 **기존 `newchat.md` 인계문에 이번 채팅에서 추가된 내용까지 반영한 최신 인계문**이야.
기존 인계문은 v84가 미적용된 상태에서 “학과 라우팅을 다시 보정해야 한다”는 내용이 중심이었는데, 이번 채팅에서 **v84 패치 생성, 학과 관련 학과 묶음 사용자 검수 완료, 학과 데이터 1차 잠금 선언, 다음 단계가 3번·4번 셋팅값/mini 전달 확인이라는 점**이 추가됐어. 기존 인계문 기준도 유지하되 최신 상태로 덮어쓴 버전이야. 

아래 전체를 그대로 복사해서 **새 채팅 첫 메시지**로 붙이면 돼.

````markdown
# NEW_CHAT_HANDOFF_2026-05-03_V85_STEP3_4_MINI_PAYLOAD_SETTING

프로젝트: keyword-engine / 수행평가 탐구엔진  
현재 단계: 학과 데이터 1차 잠금 완료 → 3번 교과 개념 / 추천 키워드 / 4번 후속 연계축 / mini 전달값 확인 단계  
중요: 이제는 학과 라우팅을 새로 여는 단계가 아니다.  
핵심: 구조와 틀은 이미 잡혔고, 지금부터는 “셋팅값이 정확히 들어가고 mini에게 정상 전달되는지”를 확인·보정하는 단계다.

---

## 0. 최우선 결론

현재 수행평가 탐구엔진은 아래 구조가 이미 잡혀 있다.

```text
1. 희망 진로 / 학과 검색
2. 과목 선택
3. 교과 개념 / 추천 키워드 선택
4. 후속 연계축 선택
5. 도서 추천
6. 보고서 생성
7. 보고서 후반부 확장
8. 최종 결과 확인
````

이제 해야 할 일은 구조를 다시 만드는 것이 아니다.

```text
학과 데이터 1차 잠금 완료
→ 3번 교과 개념 셋팅값 확인
→ 추천 키워드 셋팅값 확인
→ 4번 후속 연계축 셋팅값 확인
→ mini에게 전달되는 payload 확인
→ 보고서 결과에 정확히 반영되는지 확인
```

가장 중요한 방향:

```text
“무엇을 새로 만들 것인가?”가 아니라,
“이미 있는 구조에 정확한 값이 들어가고 mini로 정상 전달되는가?”를 확인한다.
```

---

## 1. 새 채팅에 업로드할 파일

새 채팅에는 아래 파일을 업로드한다.

```text
1. 최신 keyword-engine.zip
```

주의:

```text
반드시 사용자가 실제로 VSCode/GitHub에 적용한 최신 상태를 zip으로 올려야 한다.
이전 채팅에서 생성된 v84.zip, s34.zip을 그대로 기준으로 삼으면 안 된다.
새 채팅에서는 업로드된 최신 keyword-engine.zip 내부 상태를 먼저 확인해야 한다.
```

이유:

```text
이전 채팅에서 v84.zip과 s34.zip을 생성했지만,
실제 사용자가 로컬/GitHub에 어느 파일까지 적용했는지는 새 채팅에서 zip 내부를 확인해야 한다.
따라서 새 채팅의 기준은 “이전 대화 기억”이 아니라 “업로드된 최신 keyword-engine.zip 내부 파일”이다.
```

---

## 2. 현재 확정된 프로젝트 상태

### 2-1. 학과 데이터 상태

학과 데이터는 1차 잠금 완료로 본다.

```text
학과 검색
대표 학과 라우팅
관련 학과 묶음
빠른 비교 학과
D계열 보건·간호·재활
E계열 생명·식품·제약·약학
메디컬 직접 검색
공학 잔여 라인
```

위 항목은 사용자가 화면에서 직접 확인했고, 이상 항목은 정리·변경한 상태다.

따라서 새 채팅에서는 아래와 같이 판단한다.

```text
학과 데이터 = 1차 잠금 완료
학과 쪽은 전체 재작업 금지
학과 쪽 문제가 나오면 개별 검색어 단위 핫픽스만 허용
```

---

## 3. 절대 건드리면 안 되는 것

아래는 잠금 상태다.

```text
1. UI 구조 변경 금지
2. 보고서 생성 틀 변경 금지
3. 1~8번 흐름 변경 금지
4. 학과 검색 구조 대규모 변경 금지
5. 학과 후보 카드 UI 재도입 금지
6. major_search_fast_guard.js 재추가 금지
7. 학과 라우팅 전체 재작성 금지
8. 도서 추천 단계 선작업 금지
9. 보고서 문장 생성부 선작업 금지
```

특히 아래 파일은 절대 다시 추가하면 안 된다.

```text
keyword-engine/assets/major_search_fast_guard.js
```

이 파일은 과거 검색 속도 개선 목적으로 추가했지만 아래 문제를 만들었기 때문에 폐기했다.

```text
- 별도 후보 카드 UI 생성
- 학과를 한 번 더 클릭해야 하는 구조 발생
- 4번 이후 다시 학과 검색 시 멈춤
- 3번/4번 상태 초기화와 충돌
- 기존 native major_engine_helper 흐름과 충돌
```

확인 기준:

```text
index.html에서 major_search_fast_guard.js 로드가 없어야 함
window.__MAJOR_SEARCH_FAST_GUARD_VERSION 값이 없어야 함
검색 UI가 후보 카드 방식으로 바뀌면 안 됨
```

---

## 4. 이전 단계에서 실제 진행된 일

### 4-1. v84 학과 라우팅 보정 패치 생성

이전 채팅에서 v84 패치가 생성되었다.

패치 파일명:

```text
v84.zip
```

포함 파일:

```text
keyword-engine/index.html
keyword-engine/assets/major_engine_helper.js
```

v84에서 보정한 핵심:

```text
치대 / 치과 / 치의 / 치의학 / 치의예 / 치의예과 → 치의예과
의료공학 / 의료기기 / 의공 / 의공학 / 의료기기공학 / 생체의공 / 바이오메디컬공학 → 의공학과
로봇 / 로봇공학 / 로봇공학과 → 로봇공학과
자동차 / 자동차공학 / 자동차공학과 → 자동차공학과
조선해양 / 조선해양공학 / 조선해양공학과 → 조선해양공학과
해양공학 / 해양공학과 → 해양공학과
산업공학 / 산업공학과 → 산업공학과
산업경영 / 산업경영공학 / 산업경영공학과 → 산업경영공학과
소방 / 소방방재 / 소방방재학과 → 소방방재학과
보건 → 보건관리학과
```

v84 테스트 기대값:

```text
치대 → 치의예과
치과 → 치의예과
의료공학 → 의공학과
의료기기 → 의공학과
로봇 → 로봇공학과
자동차 → 자동차공학과
조선해양공학 → 조선해양공학과
해양공학 → 해양공학과
산업공학 → 산업공학과
산업경영 → 산업경영공학과
소방 → 소방방재학과
보건 → 보건관리학과
```

v84 적용 후 콘솔 확인값:

```javascript
window.__MAJOR_ENGINE_HELPER_VERSION__
```

정상 기대값:

```text
v84-direct-routing-compare-lock
```

단, 새 채팅에서는 v84 적용 여부를 말로만 믿지 말고 반드시 최신 keyword-engine.zip 내부에서 확인한다.

---

### 4-2. 학과 데이터 1차 잠금 선언

사용자는 관련 학과 묶음도 직접 확인했고, 이상한 항목은 모두 변경했다고 밝혔다.

따라서 현재 판단:

```text
keyword-engine 학과 데이터 1차 잠금 완료
```

잠금 범위:

```text
학과 검색어 입력
대표 학과 라우팅
관련 학과 묶음
빠른 비교 학과
D계열 보건·간호·재활
E계열 생명·식품·제약·약학
메디컬 직접 검색
공학 잔여 라인
```

새 채팅에서는 이 잠금을 존중한다.

---

### 4-3. 3번·4번 데이터 구조 1차 점검

이전 채팅에서 최신 zip 내부를 기준으로 아래 파일들을 확인했다.

```text
assets/textbook_concept_helper.js
seed/textbook-v1/subject_concept_engine_map.json
seed/followup-axis/*_concept_longitudinal_map.json
seed/followup-axis/major_followup_axis.json
seed/followup-axis/subject_bridge_point.json
```

확인 결과:

```text
JSON 문법 오류 없음
assets 주요 JS 문법 오류 없음
24개 과목 개념 데이터 존재
24개 과목 후속 연계축 데이터 존재
교과 개념명 ↔ 후속축 개념명 매칭 일치
개념별 4번 축 누락 없음
```

중요한 판단:

```text
현재 3번·4번은 데이터 자체가 없는 문제가 아니라,
경로 안정화 / 추천 순서 / mini 전달값 / 화면 반영 확인이 필요한 단계다.
```

---

### 4-4. s34 안정화 패치 생성

이전 채팅에서 3번·4번 경로 안정화용 패치가 생성되었다.

패치 파일명:

```text
s34.zip
```

포함 파일:

```text
keyword-engine/assets/textbook_concept_helper.js
```

s34 패치 목적:

```text
1. 3번 교과 개념 → 추천 키워드 경로 안정화
2. 과목명 별칭/정식명 매칭 안정화
3. 4번 후속 연계축 JSON 경로 캐시 버전 통일
4. 교과 개념 데이터는 있는데 키워드/후속축이 안 뜨는 상황 방지
5. 같은 개념에서 키워드를 바꿔도 4번 축이 너무 똑같이 나오는 현상 완화
6. 전공군별 4번 축 우선순위 보정
```

s34에서 건드리지 않은 파일:

```text
major_engine_helper.js
index.html
major_search_fast_guard.js
book_recommendation_adapter.js
mini_worker_generate_bridge_v32.js
report_6_8_flow_bridge.js
mini_payload_builder.js
```

s34 적용 후 콘솔 확인값:

```javascript
window.__TEXTBOOK_CONCEPT_HELPER_VERSION__
```

정상 기대값:

```text
v85.0-step3-4-route-stabilizer
```

주의:

```text
s34.zip이 생성되었지만 실제 사용자가 적용했는지는 새 채팅에서 최신 keyword-engine.zip 내부를 확인해야 한다.
새 채팅은 s34 적용 여부를 먼저 확인하고, 적용되어 있지 않으면 같은 목적의 안정화 패치를 다시 만들 수 있다.
```

---

## 5. 현재 단계의 핵심 관점

사용자가 정확히 짚은 관점:

```text
지금 작업은 “내가 뭘 하자고 말하고 그때마다 새로 만드는 작업”이 아니다.
결론은 mini에게 전달하는 구조를 셋팅하는 것이고,
우리는 그 값이 정확히 들어가는지 확인하는 단계다.
구조와 틀은 이미 잡혔으므로,
학과처럼 한 단위씩 셋팅값을 넣고 확인하고 잠그고 다음 단계로 넘어가야 한다.
```

따라서 새 채팅에서는 아래 방식으로 진행해야 한다.

```text
1. 파일 내부 상태 확인
2. 현재 버전/로드 파일 확인
3. 3번 교과 개념 셋팅값 확인
4. 추천 키워드 셋팅값 확인
5. 4번 후속 연계축 셋팅값 확인
6. mini payload에 값이 들어가는지 확인
7. 보고서 생성부로 전달되는지 확인
8. 이상 항목만 국소 패치
9. 정상 확인 후 해당 단계 잠금
```

---

## 6. 이제부터 검수할 핵심 흐름

다음 단계는 “3번·4번 셋팅값 + mini 전달값 확인”이다.

확인 흐름:

```text
학과 선택
→ 과목 선택
→ 3번 교과 개념 추천
→ 교과 개념 선택
→ 추천 키워드 표시
→ 추천 키워드 선택
→ 4번 후속 연계축 표시
→ 후속 연계축 선택
→ mini payload에 선택값 저장
→ 보고서 생성 시 선택값 반영
```

이 단계에서 봐야 하는 것은 화면 예쁘게 보이는지가 아니라, 아래 값들이 정확히 전달되는지다.

```text
selectedMajor
selectedSubject
selectedConcept
selectedKeyword
selectedFollowupAxis
recommendedConcepts
recommendedKeywords
followupAxisCandidates
payload / miniPayload / reportPayload 안의 선택값
```

실제 변수명은 코드 내부에 따라 다를 수 있으므로, 새 채팅에서는 zip 내부의 `textbook_concept_helper.js`, `mini_payload_builder.js`, `mini_worker_generate_bridge_v32.js`, `report_6_8_flow_bridge.js`를 확인해 실제 변수명을 기준으로 판단해야 한다.

---

## 7. 새 채팅에서 먼저 확인할 파일

먼저 확인할 파일:

```text
keyword-engine/index.html
keyword-engine/assets/major_engine_helper.js
keyword-engine/assets/textbook_concept_helper.js
keyword-engine/assets/js/mini_payload_builder.js
keyword-engine/assets/js/mini_worker_generate_bridge_v32.js
keyword-engine/assets/js/report_6_8_flow_bridge.js
keyword-engine/seed/textbook-v1/subject_concept_engine_map.json
keyword-engine/seed/followup-axis/major_followup_axis.json
keyword-engine/seed/followup-axis/subject_bridge_point.json
keyword-engine/seed/followup-axis/*_concept_longitudinal_map.json
```

단, 수정 우선순위는 다르다.

수정 가능성이 높은 파일:

```text
keyword-engine/assets/textbook_concept_helper.js
keyword-engine/seed/followup-axis/해당_과목_concept_longitudinal_map.json
keyword-engine/seed/textbook-v1/subject_concept_engine_map.json
```

mini 전달값 문제가 있을 때만 확인/수정할 파일:

```text
keyword-engine/assets/js/mini_payload_builder.js
keyword-engine/assets/js/mini_worker_generate_bridge_v32.js
keyword-engine/assets/js/report_6_8_flow_bridge.js
```

학과 라우팅 문제가 아니라면 수정 금지:

```text
keyword-engine/assets/major_engine_helper.js
```

절대 재추가 금지:

```text
keyword-engine/assets/major_search_fast_guard.js
```

---

## 8. 새 채팅에서 진행할 첫 번째 작업

새 채팅에서 바로 아래 순서로 진행한다.

```text
1. 최신 keyword-engine.zip 압축 해제
2. index.html 스크립트 로드 순서 확인
3. major_search_fast_guard.js가 없는지 확인
4. major_engine_helper.js 버전 확인
5. textbook_concept_helper.js 버전 확인
6. 3번·4번 데이터 파일 경로 확인
7. mini_payload_builder.js에서 3번·4번 선택값을 받는지 확인
8. mini_worker_generate_bridge_v32.js에서 payload가 mini로 전달되는지 확인
9. report_6_8_flow_bridge.js에서 결과문 생성 흐름과 충돌이 없는지 확인
10. 누락/불일치가 있으면 최소 패치 생성
```

---

## 9. 검수 기준: 정상 상태

정상 상태는 아래와 같다.

```text
학과 검색 결과가 잠금된 상태로 유지됨
과목 선택 후 3번 추천 개념이 뜸
교과 개념을 누르면 추천 키워드가 뜸
추천 키워드를 누르면 4번 후속 연계축이 뜸
키워드를 바꾸면 4번 축 우선순위가 어느 정도 달라짐
후속 연계축을 선택하면 선택값이 내부 상태에 저장됨
보고서 생성 시 선택한 개념/키워드/후속축이 mini payload에 포함됨
보고서 결과문에 선택한 값이 반영됨
```

---

## 10. 검수 기준: 오류 상태

아래는 오류다.

```text
등록된 교과 개념 데이터가 없습니다
등록된 키워드 데이터가 없습니다
4번 후속 연계축이 비어 있음
개념을 바꿔도 추천 키워드가 그대로임
키워드를 바꿔도 4번 축이 완전히 그대로임
후속축을 선택했는데 mini payload에 들어가지 않음
보고서 생성 시 선택한 키워드/후속축이 빠짐
학과를 바꾸었는데 이전 학과의 3번·4번 값이 남아 있음
과목을 바꾸었는데 이전 과목의 개념/키워드가 남아 있음
4번 이후 다시 학과 검색 시 멈춤
후보 카드 UI가 다시 뜸
```

---

## 11. 대표 테스트 세트

처음부터 전체를 다 보지 말고 아래 대표 조합으로 확인한다.

```text
컴퓨터공학과 + 정보
컴퓨터공학과 + 대수
신소재공학과 + 화학
화학공학과 + 물질과 에너지
간호학과 + 생명과학
간호학과 + 세포와 물질대사
환경공학과 + 통합과학2
환경공학과 + 지구시스템과학
로봇공학과 + 물리
로봇공학과 + 역학과 에너지
로봇공학과 + 전자기와 양자
```

대표 조합별 기대 방향:

```text
컴퓨터공학과 + 정보:
알고리즘, 프로그래밍, 자료 분석, 데이터 처리, 시스템 사고

컴퓨터공학과 + 대수:
지수/로그 모델, 수열, 귀납법, 함수적 사고, 데이터 모델링

신소재공학과 + 화학:
화학 결합, 주기적 성질, 분자 구조, 물성, 소재 설계

화학공학과 + 물질과 에너지:
기체 법칙, 혼합 기체, 분자 간 힘, 반응 조건, 공정 변수

간호학과 + 생명과학:
물질대사와 건강, 항상성, 면역, 생체 조절, 질병 예방

간호학과 + 세포와 물질대사:
세포막, 물질 이동, 효소, 에너지 대사, 생리 조절

환경공학과 + 통합과학2:
지구 환경 변화, 생물과 환경, 인간 생활, 지속가능성, 오염 저감

환경공학과 + 지구시스템과학:
대기·해양 순환, 기후, 판 구조, 지구 시스템, 환경 변화

로봇공학과 + 물리:
힘과 운동, 에너지, 전기·자기, 센서, 제어

로봇공학과 + 역학과 에너지:
운동, 충돌, 열, 탄성파, 기계 시스템

로봇공학과 + 전자기와 양자:
전기장, 자기장, 전자기 유도, 회로, 신호
```

---

## 12. 다음 패치 원칙

새 채팅에서 패치를 만들 때는 반드시 최소 단위로 한다.

### 12-1. 3번·4번 경로 문제일 경우

수정 가능 파일:

```text
keyword-engine/assets/textbook_concept_helper.js
```

### 12-2. 특정 과목 개념/키워드 데이터 문제일 경우

수정 가능 파일:

```text
keyword-engine/seed/textbook-v1/subject_concept_engine_map.json
```

### 12-3. 특정 과목의 4번 축 데이터 문제일 경우

수정 가능 파일:

```text
keyword-engine/seed/followup-axis/해당_과목_concept_longitudinal_map.json
```

### 12-4. 학과별 후속축 우선순위 문제일 경우

수정 가능 파일:

```text
keyword-engine/seed/followup-axis/major_followup_axis.json
```

### 12-5. mini 전달값 누락 문제일 경우

수정 가능 파일:

```text
keyword-engine/assets/js/mini_payload_builder.js
keyword-engine/assets/js/mini_worker_generate_bridge_v32.js
keyword-engine/assets/js/report_6_8_flow_bridge.js
```

단, mini 관련 파일은 먼저 읽고 진단한 뒤 필요한 경우에만 수정한다.

---

## 13. 패치 파일 구성 원칙

파일명은 짧은 영문명으로 한다.

추천:

```text
s35.zip
```

또는

```text
patch.zip
```

포함 파일 원칙:

```text
문제가 난 파일만 포함
README는 넣지 않아도 됨
불필요한 index.html 포함 금지
```

index.html을 포함해도 되는 경우:

```text
캐시 버전 변경이 반드시 필요할 때만
```

index.html을 포함할 경우 주의:

```text
v84 학과 잠금 상태를 되돌리면 안 됨
major_search_fast_guard.js를 다시 로드하면 안 됨
textbook_concept_helper.js 캐시 버전만 변경해야 함
```

---

## 14. 새 채팅에서 바로 요청할 문장

아래 문장을 새 채팅 첫 메시지로 사용한다.

```text
수행평가 탐구엔진 keyword-engine 이어서 진행할게.

최신 keyword-engine.zip을 업로드할 거야. 먼저 zip 내부 상태를 확인해줘.

현재 최신 작업 상태:
- 학과 검색 / 대표 학과 / 관련 학과 묶음 / 빠른 비교 학과는 v84 기준 1차 잠금 완료로 본다.
- 사용자가 관련 학과 묶음도 직접 확인했고 이상 항목은 정리·변경한 상태다.
- 이제 학과 라우팅을 다시 여는 단계가 아니다.
- major_search_fast_guard.js는 삭제 상태 유지, 절대 재추가 금지.
- 학과 후보 카드 UI 재도입 금지.
- 보고서 생성 틀과 1~8번 흐름은 유지.
- 구조를 새로 만드는 게 아니라, 3번 교과 개념 / 추천 키워드 / 4번 후속 연계축 셋팅값이 정확히 들어가고 mini로 정상 전달되는지 확인하는 단계다.
- 이전 채팅에서 s34.zip이 생성되었고, 목적은 textbook_concept_helper.js 기반 3번·4번 경로 안정화였다. 실제 적용 여부는 업로드된 최신 zip 내부에서 확인해야 한다.

먼저 아래를 확인해줘:
1. index.html 스크립트 로드 순서
2. major_search_fast_guard.js가 없는지
3. major_engine_helper.js 버전과 학과 잠금 상태
4. textbook_concept_helper.js 버전
5. subject_concept_engine_map.json의 과목/개념 데이터
6. followup-axis의 과목별 longitudinal map 데이터
7. major_followup_axis.json과 subject_bridge_point.json
8. mini_payload_builder.js에서 3번·4번 선택값을 받는지
9. mini_worker_generate_bridge_v32.js에서 mini로 전달되는 payload 구조
10. report_6_8_flow_bridge.js에서 보고서 결과문으로 값이 넘어가는지

작업 원칙:
- 학과 라우팅은 건드리지 않는다.
- 3번·4번 셋팅값과 mini 전달값만 확인한다.
- 필요한 경우 textbook_concept_helper.js, followup-axis 데이터, mini payload 관련 파일만 최소 수정한다.
- 패치 파일은 짧은 영문명 zip으로 제공한다.
- 파일은 필요한 것만 포함한다.
- index.html은 캐시 버전 변경이 꼭 필요할 때만 포함한다.
- 정상인 구조를 다시 바꾸지 않는다.

먼저 실제 zip 내부 상태를 진단하고, 3번·4번 셋팅값과 mini 전달값 확인 중심으로 다음 패치가 필요한지 판단해줘.
```

---

## 15. 새 채팅 작업자가 착각하면 안 되는 점

```text
1. 학과 데이터는 1차 잠금 완료다.
2. 지금은 학과 검색 구조를 다시 만드는 단계가 아니다.
3. 지금은 보고서 틀을 다시 만드는 단계가 아니다.
4. 지금은 도서 추천을 먼저 손대는 단계가 아니다.
5. 지금은 mini에게 들어갈 셋팅값을 확인하는 단계다.
6. 데이터는 대체로 존재한다.
7. 문제는 데이터 부재보다 경로, 우선순위, 선택값 전달, payload 반영일 가능성이 높다.
8. 정상인 파일을 전체 교체하면 오히려 오류가 생긴다.
9. 패치는 항상 최소 단위로 해야 한다.
10. 한 단계씩 잠그고 다음 단계로 넘어간다.
```

---

## 16. 현재 잠금 선언

현재 상태를 아래처럼 선언한다.

```text
[LOCK 1] 학과 데이터 1차 잠금 완료
- 학과 검색
- 대표 학과 라우팅
- 관련 학과 묶음
- 빠른 비교 학과
- D계열 보건·간호·재활
- E계열 생명·식품·제약·약학
- 메디컬 직접 검색
- 공학 잔여 라인
```

다음 잠금 목표:

```text
[LOCK 2] 3번 교과 개념 / 추천 키워드 셋팅값 잠금
[LOCK 3] 4번 후속 연계축 셋팅값 잠금
[LOCK 4] mini payload 전달값 잠금
[LOCK 5] 보고서 결과문 반영 잠금
```

---

## 17. 지금 채팅이 무거워진 이유

현재 이전 채팅은 아래 작업이 누적되어 무거워진 상태다.

```text
keyword-engine.zip 업로드
newchat.md 인계문 확인
v84 패치 생성
step3_4_checklist.md 생성
s34 패치 생성
3번·4번 데이터 구조 점검
여러 번 긴 인계문 작성
```

따라서 새 채팅으로 이동하는 것이 안정적이다.

새 채팅에서는 반드시 최신 keyword-engine.zip을 다시 업로드하고 시작한다.

---

## 18. 최종 결론

현재 프로젝트는 다음 상태다.

```text
보고서 생성 틀: 유지
UI 흐름: 유지
학과 데이터: 1차 잠금 완료
3번·4번 데이터: 구조상 존재 확인
현재 문제 가능성: 경로 / 추천순서 / 선택값 저장 / mini payload 전달
다음 작업: 3번·4번 셋팅값과 mini 전달값 확인 및 최소 패치
```

가장 중요한 작업 방식:

```text
전체를 다시 만들지 않는다.
정상인 것은 잠근다.
이상한 값만 최소 수정한다.
각 단계가 정상 확인되면 잠그고 다음 단계로 넘어간다.
```

```

새 채팅에는 **최신 `keyword-engine.zip`만 업로드**하고, 위 인계문을 그대로 붙이면 돼.  
특히 이번에는 “학과는 다시 열지 말고, 3번·4번 셋팅값과 mini 전달값을 확인한다”는 문장이 제일 중요해.
```
