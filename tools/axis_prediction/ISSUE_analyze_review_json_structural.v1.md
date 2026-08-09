# ISSUE (별건 백로그) — analyze_review JSON 구조(괄호짝) 파싱 실패 (2026-08-09)

> ② 배포 검증(3단계) 중 같은 요청의 **두 번째 병렬 호출**(`analyze_review`, structured=false)이 JSON 파싱 실패→fallback으로 관측. **②와 인과 없음(기존 문제)**, 저영향(교사 검토문구만). 검수 확인 후 정정된 진단 기록.

## 증상
- `_runtime` 메모: `Claude output was not valid JSON (math_material_review) len=4976 stop=end_turn position 441`.
- `end_turn` = 잘림 아님(완결 출력). 이른 위치(441)에서 구문 오류.

## 진단 (검수 정정 — 최초 "미이스케이프 따옴표" 가설 폐기)
- 실제 깨진 조각: `…흔들린 흔적이 보인다."}},"extraction_summary":{"source_quality":"clear",…`
- 문자열은 `보인다.` 로 **정상 종료**(따옴표/이스케이프 문제 아님). `}}` 로 닫고 `,"extraction_summary"` 로 이어짐.
- ★ **원인 = 괄호 짝(구조 깊이) 오류**: head가 `file_purpose_review.detected_materials[` 배열을 연 상태인데, `}}` 두 개만 닫아 **배열 `]`·객체 `}` 미완결** 상태로 `extraction_summary`가 이어짐 → 괄호 부족.
- **AI가 프롬프트 지시 스키마의 중첩 깊이를 잘못 따라감**. `REVIEW_SCHEMA`는 `AI_EXTRACTION_SCHEMA`(math_diagnosis_worker.js **~600줄**, 1181~1780)에서 engine 2키만 뺀 대형 다단 중첩 → grammar 강제 없이 손으로 생성하다 괄호를 흘림.

## 왜 repairJsonText가 못 살리나 (당연함)
- `repairJsonText`(674행)는 **(1)잘못된 이스케이프·(2)문자열 내 생 줄바꿈/탭**만 복구. **괄호 복구 아님.**
- 괄호 자동 복구는 **위험**(닫을 깊이·순서가 모호 → 오히려 뜻 왜곡). 확장하면 안 됨(검수 동의).

## 영향 범위 = 교사 검토문구만
- 1차 분석은 **두 호출 병렬**(math_diagnosis_worker.js:198): A=engine_adapter(`structured=true`, 스키마강제) + B=review(`structured=false`, 파싱의존).
- A는 성공 → **attempts·observed_error_tags·fine태그·observed_axes·triggered_rules 전부 정상**. B만 실패→`dropKeys(buildAnalyzeFallback,...)` 일반 검토문구로 격하.
- **설계상 의도된 격리**(174행 주석: "B가 실패해도 A의 진단 본체는 남는다"). ②·③·진단 본체 무영향.

## ②와 무관(기존 문제) 확정
- ② 커밋 `ba32030c` diff = `FINE_OVERLAY_BY_UNIT`·`fetchFineErrorTagOverlay`·`fetchUnitProblemTypes`·`assignTypesForUnit`·VERSION만. review 경로(`runJsonTask`/`callClaudeJson`/`parseJsonLoose`/`repairJsonText`/`REVIEW_SCHEMA`) **미변경**. structured=false+느슨한파싱 설계는 522·666행 주석대로 ②보다 오래됨.

## 재현성
- **결정적 재현 아님**(AI 자유텍스트라 확률적). review는 매 호출 다른 설명문 생성 → 괄호를 흘릴 때만 실패. 3단계 재실행 시 성공할 수도.

## 완화안 (권장순)
1. ★ **review도 structured=true(grammar 강제)** = 근본해. engine_adapter가 이 방식이라 구조오류 0. 블로커였던 "스키마가 커서 컴파일 한도 초과"를 **재측정 필요** — 정확 확인은 `REVIEW_SCHEMA`를 `output_config.format=json_schema`로 실은 **시범 배포**로만 가능(Anthropic grammar 컴파일러를 로컬서 못 돌림). 통과하면 전환.
2. 한도 초과 시 **`REVIEW_SCHEMA`를 2+개로 분할**해 각각 structured=true 병렬 호출→병합. (예: `file_purpose_review`+`extraction_summary` 묶음 / 검토본문 묶음.) 각 조각이 한도 안에 들면 확실.
3. ✗ **repairJsonText 괄호복구 확장 = 부적절**(위험, 하지 말 것).

## 다음
- 우선순위 후순위(파일럿 차단 아님·저영향). ③ 학생식별자·② 확대 뒤 review-hardening 트랙에서 1/2 착수.
