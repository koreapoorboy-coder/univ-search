# Math Diagnosis Worker Skeleton

이 폴더는 Cloudflare Worker 배포용 예시입니다.

1. 이 폴더를 Worker 프로젝트로 복사합니다.
2. `wrangler secret put OPENAI_API_KEY`로 API Key를 등록합니다.
3. 테스트 중에는 `ALLOW_STUB = "true"`로 두면 OpenAI 호출 없이 fallback 결과를 반환합니다.
4. 실제 AI 분석을 켜려면 `ALLOW_STUB = "false"`로 변경합니다.

브라우저에는 절대 OpenAI API Key를 넣지 않습니다.
