# Patch 10 · Material Purpose + Concept Note Review

## 목적
학생 화면은 계속 단순하게 유지합니다.

- 학생 이름
- 학년
- 파일 업로드
- 진단 시작

대신 AI Worker가 업로드 파일을 먼저 아래 유형으로 구분합니다.

- problem_solving: 문제풀이 자료
- wrong_answer_note: 오답노트 자료
- concept_summary: 개념정리 자료
- lecture_note: 수업/인강 필기 자료
- verification_answer: 검수 답안 자료
- mixed: 혼합 자료
- unknown: 판별 불가

## 개념정리 파일 검수 기준
개념정리 파일은 단순히 문제를 맞혔는지가 아니라 아래를 검수합니다.

1. 정의가 정확한가
2. 공식만 외운 형태인가
3. 공식이 성립하는 조건을 알고 있는가
4. 예시가 개념 조건에 맞는가
5. 이전 개념과 연결되어 있는가
6. 다음 단원에서 왜 필요한지 설명할 수 있는가
7. 학생이 자기 말로 다시 설명할 수 있는가

## 결과 화면 변화
1차 AI 자료 분석 영역에 다음이 추가됩니다.

- 파일 목적
- 진단 경로
- 자료별 자동 판별
- 개념정리 검수
- 다시 정리할 과제

## Worker 확인
Cloudflare Worker 전체 코드를 교체한 후 `/health`에서 아래 버전이 나오면 정상입니다.

```text
2026.07.08-patch10-material-purpose-concept-review
```

## 적용 파일
GitHub Pages에는 아래 파일을 덮어씁니다.

```text
hybrid.html
manifest.json
assets/math_hybrid_report_renderer.js
assets/math_verification_flow.js
worker_skeleton/math_diagnosis_worker.js
```

Cloudflare Worker에는 `worker_skeleton/math_diagnosis_worker.js` 내용을 전체 복사하여 붙여넣고 Deploy합니다.
