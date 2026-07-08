# 수학 하이브리드 AI Bridge 4차 패치 가이드

## 목적

이번 패치는 기존 수학 취약유형 진단 엔진에 다음 흐름을 추가합니다.

```text
학생 PDF / 풀이 사진 / 인강 필기 사진 업로드
↓
Cloudflare Worker가 OpenAI API로 자료 분석
↓
AI가 학생 자료를 구조화 JSON으로 변환
↓
math-weakness-engine이 취약 개념, 선행 원인, 후행 영향 분석
↓
학생에게 검수 문항 제시
↓
학생 답안 재검수
↓
학생용 / 학부모용 / 교사용 리포트 출력
```

## 업로드 위치

GitHub에서 아래 위치로 이동합니다.

```text
public / math-weakness-engine
```

압축 해제 후 아래 파일/폴더를 업로드합니다.

```text
assets
data
docs
samples
worker_skeleton
hybrid.html
manifest.json
```

정상 경로 예시는 다음과 같습니다.

```text
/assets/math_ai_bridge_client.js
/data/ai_bridge/student_upload_input_schema.v1.json
/worker_skeleton/math_diagnosis_worker.js
/hybrid.html
/manifest.json
```

아래처럼 상위 폴더명이 앞에 붙으면 잘못 업로드한 것입니다.

```text
/math_weakness_engine_hybrid_ai_bridge_patch4_20260708/assets/...
```

## Cloudflare Worker 적용

`worker_skeleton` 폴더는 GitHub Pages에서 실행되는 파일이 아니라 Cloudflare Worker 배포용 참고 코드입니다.

1. Cloudflare Worker 프로젝트를 새로 만듭니다.
2. `worker_skeleton/math_diagnosis_worker.js` 내용을 Worker 코드로 넣습니다.
3. `OPENAI_API_KEY`는 secret으로 등록합니다.
4. 테스트 중에는 `ALLOW_STUB=true`로 둡니다.
5. 실제 AI 분석을 켜려면 `ALLOW_STUB=false`로 바꿉니다.

## 페이지 테스트

브라우저에서 다음 페이지로 접속합니다.

```text
/math-weakness-engine/hybrid.html
```

Worker URL을 넣고 `Worker 확인`을 누릅니다. 그다음 학생 자료를 넣고 1차 AI 분석을 실행합니다.

## 주의

- OpenAI API Key를 `hybrid.html` 또는 JS 파일에 직접 넣으면 안 됩니다.
- 학생 PDF/사진은 브라우저에서 Worker로 전달되고, Worker가 AI 분석을 수행합니다.
- 기존 `keyword-engine`과 수행평가 엔진은 건드리지 않습니다.
