# Patch 6 · Worker 연결 화면 안정화

## 목적
Cloudflare Worker와 OpenAI API Key 연결은 정상인데, `hybrid.html` 화면에서 버튼을 눌렀는지 확인하기 어려운 문제를 해결한다.

## 변경 내용
- Worker URL 저장 결과를 별도 상태 박스에 크게 표시
- `Worker 확인` 결과를 JSON 박스로 표시
- `설정 확인` 결과를 JSON 박스로 표시
- 새로고침 후 저장된 Worker URL을 자동 복원
- Worker 연결 버튼 로직을 독립 스크립트로 분리
- 다른 수학 엔진 스크립트가 실패해도 Worker 저장/확인 버튼은 먼저 작동
- 기존 localStorage 키와 호환되도록 저장 키를 복수 지원

## 적용 후 확인 순서
1. `/math-weakness-engine/hybrid.html` 접속
2. Cloudflare Worker URL 입력
3. `URL 저장` 클릭
4. 상태 박스에 `URL 저장 완료`가 표시되는지 확인
5. `Worker 확인` 클릭
6. 상태 박스에 `Worker 연결 성공 · OpenAI Key 연결됨`이 표시되는지 확인
7. 새로고침 후 Worker URL이 다시 입력칸에 들어오는지 확인

## 정상 문구
- `URL 저장 완료`
- `Worker 연결 성공 · OpenAI Key 연결됨`
- JSON 안에 `hasOpenAIKey: true`

## 아직 확인 필요 문구
- `Worker는 연결됐지만 OpenAI Key가 없습니다.`
- `Worker 확인 실패`
- `저장할 URL이 비어 있습니다.`
