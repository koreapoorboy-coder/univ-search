# Patch21 · Engine-locked output contract

## 목적
학생 자료를 AI가 먼저 읽더라도, 최종 단원/개념/출력 유형은 엔진 매칭 결과를 기준으로 확정하도록 수정했습니다.

## 핵심 변경
- 1차 AI 분석은 자료 읽기와 구조화만 담당합니다.
- 엔진이 `top_concepts`, `top_units`로 확정 단원과 개념을 결정합니다.
- 10문항 생성은 엔진이 확정한 단원 안에서만 이루어집니다.
- 엔진 확정 단원이 있으면 AI 추출 키워드나 과거 fallback 예시가 우선되지 않습니다.
- 엔진 매칭이 없을 때만 AI 추출 기반 일반형 fallback을 사용합니다.
- 거듭제곱근/유리수 지수 자료가 들어왔는데 유리수·무리수 고정 문항이 나오는 문제를 방지합니다.

## 적용 파일
- `hybrid.html`
- `assets/math_hybrid_report_renderer.js`
- `assets/math_verification_flow.js`
- `worker_skeleton/math_diagnosis_worker.js`
- `manifest.json`

## 출력 계약
1. AI reads: 자료 유형, 키워드, 수식, 풀이 흔적 추출
2. Engine matches: 단원 DB 기준으로 단원/개념/출력 유형 확정
3. AI writes: 엔진이 확정한 범위 안에서 학생용 결과와 10문항 작성

## Commit message
```text
patch: lock student output to engine matched math concept
```
