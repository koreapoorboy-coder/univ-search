# 비용 실측 가이드 (usage 로깅 + Anthropic Console) (2026-08-10)

> 추정을 실측으로 대체하는 절차. Worker에 usage 로깅 추가됨(VERSION `2026.08.10-usage-and-review-hardening`). 사용자 브라우저 기준.

## 0) 먼저 — Worker 재배포 (누적 1회)
이번 Worker에는 **axis-store(D1)·GET엔드포인트·usage 로깅·review-hardening**이 다 들어있음(번들). 한 번 배포하면 전부 반영.
- 배포 후 확인: `https://<worker>/health` → `version` = **`2026.08.10-usage-and-review-hardening`**.
- (사이트 갱신은 데이터/프론트라 push 시 자동. Worker만 수동 배포.)

## 1) 진단 응답에서 토큰·비용 보기 (자동, 코드가 기록)
새 진단 1회 돌리면 응답 `_runtime.usage`에:
```
{ model, effort, call_count, total_input_tokens, total_output_tokens,
  est_cost_usd,  ← 참고 추정치(단가 opus-4-8 $5/$25 기준)
  per_call: [ {call:"analyze_stage1_unit_assign", in, out}, {call:"analyze_stage2_type_M3_...", in, out}, {call:"analyze_review(...)", in, out} ] }
```
- **per_call**로 **어느 호출이 큰지** 즉시 판별(stage1 / 단원별 stage2 / review 중).
- review 호출의 `call`이 `analyze_review(structured)`면 structured 성공(견고), `(prompt-fallback)`이면 기존 방식 폴백 — **review-hardening 라이브 판정**이 이 라벨로 보임.
- ※ overlay_tester/디버그 응답 JSON에서 `_runtime.usage` 확인.

## 2) Worker Logs에서 호출별 실시간 보기 (선택)
Cloudflare 대시보드 → Workers & Pages → 진단 Worker → **Logs**(실시간) 또는 `Begin log stream`.
- 각 API 호출마다 `[usage] {"call":..,"model":..,"input_tokens":..,"output_tokens":..}` 한 줄.
- verification·review_verification·final_report 등 **모든 호출**도 여기 찍힘(진단 외 포함).

## 3) ★ Anthropic Console에서 실제 청구액 확인 (브라우저 단계별)
Worker가 **Anthropic API 키**를 쓰므로 진단 API 청구는 **Anthropic Console**. (Cloudflare는 Worker/D1만·무료한도.)
1. 브라우저에서 **`console.anthropic.com`** 접속 → 로그인(진단에 쓰는 API 키의 그 계정).
2. 좌측 **Usage**(사용량) 또는 **Cost**(비용) 메뉴.
3. **날짜 범위**를 지금까지 테스트 돌린 기간으로 설정.
4. 표시되는 **총 토큰·비용**(입력/출력 분리)을 확인. 모델별로도 볼 수 있음.
5. **지금까지 테스트로 얼마 나왔는지** = 여기 누적액. 이게 실측 기준.

### 대조
- (1)의 `_runtime.usage.est_cost_usd`를 여러 진단 합산 → Console 누적액과 비교.
- 크게 어긋나면 추정 가정(이미지 토큰·thinking량)이 틀린 것 → per_call로 원인 지목.

## 4) 실측 후 절감 판단 (실측 없이 effort/모델 변경 금지)
per_call·Console로 실측 잡힌 뒤:
1. **effort medium 시범**: env `ANTHROPIC_EFFORT=medium`로 바꿔 **같은 시험지**를 high/medium 각각 진단 → 결과(개념/유형/축) 대조 + 토큰 비교. 품질 저하 폭 실물 확인 후 결정.
2. **analyze_review 생략**: 화면 검토문구용. 생략 시 사라지는 것 먼저 확인(진단 본체는 engine_adapter라 유지). 생략하면 진단당 1호출·1출력 절감.
3. **프롬프트 캐싱**: 이미지+지시 재전송을 캐시(read 0.1×). 도입 코드량 vs 절감폭 판단.
4. **모델 변경**(sonnet-5): 마지막 후보. 구조화 추출 품질 실측 후.
★ 진단 품질이 목적이므로 1·4는 반드시 시범 대조 후.

## 참고
- env로 조정: `ANTHROPIC_EFFORT`(high/medium/low), `ANTHROPIC_MODEL`(claude-opus-4-8/…), `ANTHROPIC_MAX_TOKENS`. 대시보드 Worker 변수에서 변경(재배포 불요, 변수는 즉시).
- 단가는 코드 `MODEL_PRICING` 참고용. 정본은 Console.
