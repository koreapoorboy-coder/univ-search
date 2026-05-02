# PROJECT_STATUS_2026-05-02_V59_AXIS_MAJOR_ROUTING_PATCH

작성일: 2026-05-02  
프로젝트: `keyword-engine` / 수행평가 탐구엔진  
기준 입력 파일:

```text
1. 20260501 새채팅 업로드용.zip
2. keyword-engine.zip
3. PROJECT_STATUS_2026-0502.md
```

---

## 0. 결론 요약

이번 검수의 핵심 결론은 다음이다.

```text
문서 기준은 v58이 맞고, 실제 keyword-engine.zip도 v58 MINI Worker를 로드한다.
다만 4번 후속 연계축 산출부는 아직 v58 문서 기준에 완전히 맞지 않는다.
특히 도시공학과가 독립 bucket으로 분리되지 않아 폭염주의보 문맥에서 물리·시스템 해석 축이 1순위로 올라올 수 있다.
```

따라서 이번 v59 패치는 결과 생성부, 도서, 6~8번 선택 구조를 건드리지 않고, **4번 후속 연계축 산출 단계만 최소 수정**한다.

---

## 1. 전체 파일 확인 결과

### 1-1. `20260501 새채팅 업로드용.zip`

확인 결과:

```text
총 22개 항목
v34 인계 문서
v26~v34 패치 히스토리
latest_patch/report_6_8_worker_json_render_patch_v34.zip
checklists/APPLY_AND_VERIFY_V34.md
README_FIRST_새채팅_첫요청문.md
MANIFEST.md
```

판단:

```text
기존 v34 문서는 삭제하면 안 된다.
해당 문서는 1~8번 구조, MINI/Worker 흐름, 도서/보고서 데이터셋 기준을 설명하는 과거 기준 문서로 유지한다.
```

### 1-2. `PROJECT_STATUS_2026-0502.md`

확인 결과:

```text
v53~v58 검수 내용
4번 후속 연계축 재검수 내용
v59 패치는 적용되지 않았다는 기록
다음 채팅에서는 결과 생성부가 아니라 4번부터 봐야 한다는 기준
```

판단:

```text
이 문서는 기존 v34 인계 문서 위에 추가되어야 하는 최신 검수 문서다.
```

### 1-3. `keyword-engine.zip`

확인 결과:

```text
총 680개 항목
실제 파일 629개
주요 엔진 파일 존재 확인
```

주요 파일:

```text
keyword-engine/index.html
keyword-engine/assets/textbook_concept_helper.js
keyword-engine/assets/major_engine_helper.js
keyword-engine/assets/js/mini_worker_generate_bridge_v32.js
keyword-engine/assets/js/book_recommendation_adapter.js
keyword-engine/assets/js/report_6_8_flow_bridge.js
keyword-engine/assets/js/mini_payload_builder.js
keyword-engine/seed/followup-axis/major_followup_axis.json
keyword-engine/seed/followup-axis/integrated_science1_concept_longitudinal_map.json
```

---

## 2. 버전 확인 결과

실제 `index.html`에서 확인된 MINI Worker 로드:

```html
<script src="assets/js/mini_worker_generate_bridge_v32.js?v=v58_student_display_major_diff_precision"></script>
```

실제 `mini_worker_generate_bridge_v32.js` 내부 버전:

```javascript
mini-worker-generate-bridge-v58-student-display-major-diff-precision
```

판단:

```text
현재 기준은 v58이다.
v59 패치는 이번 패치 전까지 적용된 것으로 보면 안 된다.
```

---

## 3. 코드 검수 결과

### 3-1. JS 문법 검사

다음 파일은 Node 문법 검사 기준 통과했다.

```text
assets/textbook_concept_helper.js
assets/major_engine_helper.js
assets/js/mini_worker_generate_bridge_v32.js
assets/js/mini_payload_builder.js
assets/js/book_210_ui_bridge.js
assets/js/report_6_8_flow_bridge.js
assets/js/book_recommendation_adapter.js
```

### 3-2. JSON 검사

대부분의 JSON은 정상 파싱되었다.
단, 아래 파일은 내용이 1바이트짜리 빈 placeholder라 JSON으로 파싱되지 않는다.

```text
manifest.json
seed/archive/catalog_summary.json
seed/archive/keyword_cluster_bridge.json
seed/archive/raw_keyword.json
seed/archive/subject_book_bridge.json
seed/archive/textbook_detail_seed.json
seed/archive/textbook_ui_feed_seed.json
```

판단:

```text
현재 4번 후속 연계축 패치와 직접 관련 없는 archive/placeholder 파일이다.
이번 패치에서는 건드리지 않았다.
```

---

## 4. 실제 문제 지점

문서 기준에서는 4번 후속 연계축이 아래처럼 작동해야 한다.

```text
컴퓨터공학과 → 수리·데이터 모델링 축 1순위
환경공학과 → 지구·환경 데이터 해석 축 1순위
도시공학과 → 지구·환경 데이터 해석 축 또는 도시·공간 환경 분석 축 1순위
```

그런데 실제 코드에서는 다음 문제가 있었다.

```text
1. 도시공학과를 urban bucket으로 분리하지 못함.
2. 도시공학과가 공학이라는 단어 때문에 물리·시스템 해석 축으로 끌림.
3. 컴퓨터공학과에서 물리·시스템 해석 축까지 직접 연계로 판정될 수 있음.
4. 환경공학과에서 물리 축이 공학 단어 때문에 직접 연계로 잡힐 수 있음.
5. 폭염주의보, 기온, 체감온도, 도시 열섬, 녹지, 포장 면적 같은 키워드가 4번 축 보정에 충분히 반영되지 않음.
6. 학과 변경 후 기존 후속 연계축 선택값이 남아 다음 학과 결과를 끌고 갈 수 있음.
```

---

## 5. v59 패치 범위

이번 패치는 아래 3개 파일만 수정한다.

```text
keyword-engine/index.html
keyword-engine/assets/textbook_concept_helper.js
keyword-engine/seed/followup-axis/major_followup_axis.json
```

수정하지 않은 영역:

```text
MINI Worker 결과 생성부
도서 추천 UI
6~8번 보고서 선택 구조
Cloudflare Worker 연결부
major_engine_helper.js
```

이유:

```text
현재 문제는 결과 문장 생성부가 아니라 4번 후속 연계축 산출부에 있기 때문이다.
```

---

## 6. 적용된 핵심 보정

### 6-1. major routing profile 추가

`textbook_concept_helper.js`에 4번 전용 학과 routing profile을 추가했다.

핵심 bucket:

```text
it
env
urban
health
business
engineering
default
```

핵심 매핑:

```text
컴퓨터공학과 → it
환경공학과 → env
도시공학과 → urban
간호학과 → health
경영학과 → business
```

### 6-2. axisDomain 기반 direct / bridge / general 판정

기존에는 축 제목이나 학과 문자열에 있는 단어가 직접 판정에 과하게 개입했다.
이번 패치에서는 axisDomain을 우선 기준으로 사용한다.

```text
data / info / math → 컴퓨터공학과 직접
physics / engineering → 컴퓨터공학과 브리지
earth_env → 환경공학과 직접
earth_env / urban / spatial → 도시공학과 직접
physics / data / engineering → 도시공학과 브리지
```

### 6-3. 폭염주의보 문맥 보정

아래 키워드는 폭염/도시환경 문맥으로 인식한다.

```text
폭염
폭염주의보
기온
체감온도
습도
도시 열섬
녹지
그늘
포장 면적
생활환경
취약 계층
온열 질환
```

정상 기대값:

```text
컴퓨터공학과 + 폭염주의보
→ 수리·데이터 모델링 축 1순위

환경공학과 + 폭염주의보
→ 지구·환경 데이터 해석 축 1순위

도시공학과 + 폭염주의보
→ 지구·환경 데이터 해석 축 1순위
```

### 6-4. 도시공학과 전용 followup axis seed 추가

`major_followup_axis.json`에 도시공학과 + 통합과학1 항목을 추가했다.

```text
major_name: 도시공학과
base_subject: 통합과학1
axis_title: 도시·환경 데이터 해석 확장 축
axis_domain: earth_env
linked_subjects: 통합과학1 / 지구과학 / 지구시스템과학 / 통합사회1 / 확률과 통계
```

### 6-5. 학과 변경 시 하위 선택값 초기화

학과가 바뀌면 아래 값이 초기화되도록 보정했다.

```text
linkTrack
linkTrackSource
selectedBook
selectedBookTitle
reportMode
reportView
reportLine
```

이유:

```text
이전 학과 기준의 4번 축이 다음 학과 화면에 남아 결과를 끌고 가는 것을 막기 위해서다.
```

### 6-6. 캐시 버전 갱신

`index.html`의 `textbook_concept_helper.js` 쿼리 버전을 갱신했다.

```text
v59_axis_major_routing_urban_heatwave_fix
```

---

## 7. 패치 후 4번 화면 검수 기준

결과 생성 버튼은 아직 누르지 말고, 먼저 4번 화면만 확인한다.

고정 조건:

```text
과목: 통합과학1
교과 개념: 과학의 측정과 우리 사회
핵심 키워드: 폭염주의보
```

학과별 기대값:

```text
컴퓨터공학과
1순위: 수리·데이터 모델링 축
관계: 직접 연계 강함
물리·시스템 해석 축: 역량 브리지
지구·환경 데이터 해석 축: 역량 브리지 또는 보조 확장

환경공학과
1순위: 지구·환경 데이터 해석 축
관계: 직접 연계 강함
수리·데이터 모델링 축: 역량 브리지
물리·시스템 해석 축: 역량 브리지 또는 보조 확장

도시공학과
1순위: 지구·환경 데이터 해석 축
관계: 직접 연계 강함
수리·데이터 모델링 축: 역량 브리지
물리·시스템 해석 축: 역량 브리지
```

중요:

```text
도시공학과에서 물리·시스템 해석 축이 1순위로 오면 실패다.
컴퓨터공학과에서 물리·시스템 해석 축이 “직접 연계 강함”으로 뜨면 실패다.
환경공학과에서 물리·시스템 해석 축이 “직접 연계 강함”으로 뜨면 실패다.
```

---

## 8. 적용 방법

패치 zip 안의 경로를 그대로 GitHub 프로젝트에 덮어쓴다.

```text
keyword-engine/index.html
keyword-engine/assets/textbook_concept_helper.js
keyword-engine/seed/followup-axis/major_followup_axis.json
```

적용 후 브라우저에서 강력 새로고침한다.

```text
Windows: Ctrl + F5
Mac: Cmd + Shift + R
```

콘솔에서 확인할 값:

```javascript
console.log(window.__TEXTBOOK_CONCEPT_HELPER_VERSION);
console.log(window.__MINI_WORKER_GENERATE_BRIDGE_VERSION__);
console.log(window.__MAJOR_ENGINE_HELPER_VERSION__ || window.__MAJOR_ENGINE_HELPER_VERSION);
```

정상 기대값:

```text
v59.0-axis-major-routing-urban-heatwave-fix
mini-worker-generate-bridge-v58-student-display-major-diff-precision
v0.7.80-major-search-buffer-fix 또는 v33.18-major-search-buffer-fix
```

---

## 9. 이번 패치에서 일부러 하지 않은 것

```text
1. MINI 결과 문장 수정
2. 도서 추천 로직 수정
3. 6~8번 보고서 선택 구조 수정
4. 전체 keyword-engine 교체본 생성
5. major_engine_helper.js 전체 수정
```

이유:

```text
현재 1차 목표는 4번 후속 연계축의 판정과 우선순위를 먼저 안정화하는 것이다.
4번이 안정화된 뒤에 도서, 6~8번, MINI 결과 출력을 순서대로 보는 것이 맞다.
```

---

## 10. 다음 작업 순서

```text
1. v59 패치 적용
2. 브라우저 강력 새로고침
3. 4번 화면만 검수
4. 컴퓨터공학과 / 환경공학과 / 도시공학과 비교
5. 정상 확인 후 도서 추천 5번 검수
6. 이후 6~8번 선택값 검수
7. 마지막에 MINI 결과 출력 검수
```

---

## 11. 새 채팅 첫 요청문

새 채팅에서는 아래 문장을 그대로 사용한다.

```text
수행평가 탐구엔진 작업을 이어서 진행할게.

업로드한 최신 keyword-engine.zip, 새채팅 업로드용 zip, PROJECT_STATUS 문서를 기준으로 먼저 내부 파일 상태와 버전값을 확인해줘.

현재 기준은 v58 MINI Worker이며, 이번에 추가된 v59 패치는 결과 생성부가 아니라 4번 교과 개념 기반 후속 연계축 선택 단계만 보정한 패치야.

중요 기준은 아래야.

1. 기존 v34 인계 문서는 구조·히스토리 기준으로 유지한다.
2. v58 문서는 최신 검수 기준으로 유지한다.
3. v59 패치는 4번 후속 연계축의 학과 bucket / axisDomain / 직접·브리지·보조 판정 / 도시공학과 urban 가중치 / 폭염주의보 문맥을 보정한 것이다.
4. 결과 생성부, 도서, 6~8번은 먼저 건드리지 않는다.
5. 검수 고정 조건은 통합과학1 → 과학의 측정과 우리 사회 → 폭염주의보다.
6. 컴퓨터공학과는 수리·데이터 모델링 축 1순위, 환경공학과는 지구·환경 데이터 해석 축 1순위, 도시공학과는 지구·환경 데이터 해석 축 1순위가 되어야 한다.
7. 도시공학과에서 물리·시스템 해석 축이 1순위로 오면 실패다.
8. 먼저 4번 화면만 재검수하고, 그 다음 5번 도서와 6~8번으로 넘어간다.

먼저 실제 파일 기준으로 v59가 제대로 적용되어 있는지 확인하고, 4번 화면 검수부터 진행해줘.
```
