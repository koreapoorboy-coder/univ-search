# 조사 — 검증문항 출제 구조 + API 비용 (2026-08-10)

> ★ 실측(코드 확인)과 추정을 구분 표기. 사용자 확인은 브라우저 기준.

---

## 조사 1 — 검증 10문항 출제 구조 (실측, 코드)

### 결론: **AI 생성. 문제 풀에서 꺼내는 것 아님.**
- 엔드포인트 `/api/math-diagnose/generate-verification`(worker 93~94행): `runJsonTask(..., files: [], schema: VERIFICATION_QUESTION_SCHEMA, prompt: buildVerificationPrompt(payload))`.
- **`files: []`** — item_bank·source_item_bank를 AI에 **안 보냄**.
- `buildVerificationPrompt`(910행): `engine_diagnosis.top_concepts`·`top_units`·`engine_locked_context` + `ai_extraction`(=1차 진단 결과)만 근거로 **새 증명형 10문항을 생성**하라 지시. 어떤 문제 풀도 참조 안 함.
- 런타임 어디서도 source_item_bank 문항을 AI로 넘기지 않음(진단 analyze도 업로드된 시험지만 사용).

### 사용자 질문 답
1. **어디서 나오나** → **그때그때 AI 생성**(진단된 개념/단원 기반). 꺼내기·혼합 아님.
2. (꺼내는 것 아니므로 N/A)
3. **현재 풀 규모** → **해당 없음.** 검증문항은 풀이 존재하지 않는 생성형. "뽑을 문항 수"라는 개념이 없음.
4. **문항 추가하려면** → **검증문항에는 무의미.** 새 문제집을 넣어도 verification 출제에 **아무 영향 없음**(풀에서 안 뽑으므로).
5. **생성 근거** → 엔진 확정 단원·개념 + AI 추출. **품질 향상 레버 = concept 메타데이터**(Tier2 description·diagnostic_signals — 지금 비워둔 것)와 **진단 정확도**. 문항 추가가 아니라 이쪽.

### ★ 사용자 오해 교정
- 사용자는 "검증 10문항에 뽑을 문항을 늘리려" 문제집을 넣으려 함 → **그 목적으론 효과 없음**(풀 자체가 없음).
- 문제집 추가가 의미 있는 곳은 **진단(analyze) 커버리지** — 새 문제집을 **재태깅하면 새 단원/유형**이 생겨 진단 대상이 넓어짐(circle/statistics 복구·재태깅 파이프라인). verification과는 별개.
- ⇒ 목적이 "검증문항 다양화"면 **concept Tier2 큐레이션**이 답. "진단 가능 범위 확대"면 **재태깅**이 답.

---

## 조사 2 — API 비용

### 실측 (코드 확인)
- **모델** `claude-opus-4-8`, **effort `high`**, **max_tokens 64000**(thinking+출력 합산 상한), overridable via env.
- **프롬프트 캐싱 없음**(`cache_control` 미사용) — 매 호출 입력 전액.
- **Files API**: 큰 파일 1회 업로드→file_id를 **2개 병렬 분석 호출이 공유**, 분석 후 삭제(저장비 없음). 단 각 호출이 이미지를 **재토큰화**함(캐싱 없어 절감 안 됨).
- **usage 토큰 미기록** — Worker가 응답 usage를 안 잡음 → **정확 토큰은 Anthropic Console에서만** 확인 가능. 아래 토큰·비용은 **추정**.

### 진단 1회 호출 수 (실측)
- **analyze 1회 = stage1(단원배정 1) + 단원수 N개(stage2 유형배정) + analyze_review(1) = `N+2` 호출.**
  - 청킹 없음(단원 PT<600 = MAX_ENUM_TYPES).
  - 1단원 시험 → **3호출**, 3단원 시험 → **5호출**.
  - engine_adapter(A, structured=true)와 review(B, structured=false)는 병렬.
- **별도 온디맨드**(진단과 분리): verification 출제(1) · review_verification(1) · final_report(1).

### 토큰·비용 (추정 — 실측 아님)
가정: 20문항·3단원·시험 2페이지 이미지.
| 항목 | 추정 |
|---|---|
| 호출/analyze | 5회(1+3+1) |
| 입력/analyze | ~75K tok(지시~3K+payload~3K+이미지~6K+stage2 PT목록~5K, ×5호출) |
| 출력+thinking/analyze | ~40K tok(effort high thinking이 변수·상한 64K/호출) |
| **비용/analyze** | 입력 75K×$5/1M + 출력 40K×$25/1M ≈ **$0.38 + $1.00 ≈ $1.4** |
| full cycle(+verification+review+report) | **~$2~3** |
- ★ **출력×$25가 지배적**(effort high). 이미지 없거나 문항 적으면 훨씬 쌈.

### 월 운영비 (추정, ~$1.5/진단 core 가정)
| 규모 | 월 2회 | analyze만 | full cycle(~×1.8) |
|---|---|---|---|
| 10명 | 20진단 | ~$30 | ~$50 |
| 30명 | 60진단 | ~$90 | ~$160 |
| 100명 | 200진단 | ~$300 | ~$540 |
선형 증가. **전부 추정** — 실제는 시험지 크기·문항수·effort에 크게 좌우.

### 절감 여지
1. **effort `high`→`medium`/`low`** — thinking 대폭↓(최대 지렛대). 유형·개념 추출·배정은 구조화 작업이라 medium으로도 충분할 가능성. 출력비용 대략 반감 기대. (품질 실측 필요: medium 시범 후 진단 일치도 비교.)
2. **프롬프트 캐싱 도입** — 지금 미적용. 이미지+지시가 N+2 호출에 매번 재전송. 시험지·지시를 캐시(read 0.1×)하면 입력비용 상당↓. **실질 개선**(Worker 코드 변경 필요).
3. **호출 수↓** — `analyze_review`는 **화면 검토문구용**(진단 본체 아님, engine_adapter가 실진단). 생략하면 진단당 1호출 절감. (review-hardening 트랙과 연계.)
4. **모델 변경** — `opus-4-8`→`sonnet-5`($3/$15, 출력 절반). 구조화 추출·배정엔 sonnet로도 품질 유지 가능성. 시범 비교 후 결정.
- 조합(effort medium + 캐싱 + review 생략)이면 대략 **반값** 기대(추정).

### 사용량·청구 확인 (브라우저)
- **Anthropic Console** `console.anthropic.com` → **Usage / Cost**. Worker가 **Anthropic API 키**를 쓰므로 진단 API 청구는 **여기**. 일자·모델별 토큰·비용 확인.
- **Cloudflare 대시보드**는 Worker 요청수·D1만(무료 한도) — 진단 API 비용 아님.
- ★ **권장**: Worker에 `usage`(input/output tokens) 로깅 추가 → 진단별 정확 토큰·비용 관측 가능(현재 추정을 실측으로 대체). 소규모 코드 변경.

---

## 방향 제안 (사용자 결정)
- **검증문항 목적**이면: 문제집 추가 X → concept Tier2 큐레이션 검토.
- **진단 범위 확대**면: 문제집 재태깅(파이프라인) — 별개 과제로 규모 산정.
- **비용**: 먼저 Console에서 현재 실제 청구 확인 → effort medium 시범/캐싱 도입으로 절감 판단. usage 로깅 추가하면 근거가 추정→실측.
