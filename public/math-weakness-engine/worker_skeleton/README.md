# Math Diagnosis Worker Skeleton

이 폴더는 Cloudflare Worker 배포용 예시입니다. Claude API(Anthropic Messages API)를 호출합니다.

1. 이 폴더를 Worker 프로젝트로 복사합니다.
2. `wrangler secret put ANTHROPIC_API_KEY`로 API Key를 등록합니다.
3. 테스트 중에는 `ALLOW_STUB = "true"`로 두면 Claude 호출 없이 fallback 결과를 반환합니다.
4. 실제 AI 분석을 켜려면 `ALLOW_STUB = "false"`로 변경합니다.

브라우저에는 절대 API Key를 넣지 않습니다.

## 환경 변수

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | (없음) | Secret으로 등록. 없으면 stub fallback 또는 500 |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` | 모델 ID |
| `ANTHROPIC_EFFORT` | `xhigh` | `low`/`medium`/`high`/`xhigh`/`max` |
| `ANTHROPIC_MAX_TOKENS` | `25000` | 응답 상한. thinking 토큰도 여기서 나갑니다 |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com/v1` | 프록시를 쓸 때만 변경 |
| `FALLBACK_ON_AI_ERROR` | `true` | 호출 실패 시 seed fallback 반환 |

## OpenAI에서 넘어올 때 주의

- 이전 `OPENAI_*` 변수는 더 이상 읽지 않습니다. Cloudflare에서 새 이름으로 다시 등록해야 합니다.
- `/health` 응답 필드가 `hasOpenAIKey` → `hasApiKey`로 바뀌었습니다.
- 검수 문항 10개 보장은 스키마(`minItems`/`maxItems`)가 아니라 `assertTenQuestions()` 코드 검증으로 옮겼습니다. Claude의 structured outputs가 배열 길이 제약을 지원하지 않기 때문입니다.
