# Patch19 Diagnosis Modes & Safe Renderer

학생이 올리는 자료 목적에 따라 진단 흐름을 분리합니다.

## 핵심 변경

- 진단 목적 선택 추가
  - 자동 판별
  - 개념정리 진단
  - 풀이 과정 진단
  - 재제출 답안 검수
- 고등학생이 직접 푼 문제/오답 풀이를 올렸을 때 `풀이 과정 진단` 화면으로 출력
  - 오류 위치
  - 조건을 식으로 바꾸는 단계
  - 계산 전개
  - 답의 범위/정의역/검산
  - 연결되는 단원
- `renderTeacherDiagnostics is not a function` 오류 방지
  - 해당 함수가 없는 구버전 asset이 캐시되어도 페이지가 중단되지 않도록 guard 처리
- 학생 기본 화면에서는 내부 엔진 매칭/필기 점수/JSON을 계속 숨김
- 학생용 PDF 문제지는 개념정리 진단과 풀이 과정 진단 모두에서 사용 가능

## 적용 파일

- `hybrid.html`
- `assets/math_hybrid_report_renderer.js`
- `assets/math_verification_flow.js`
- `worker_skeleton/math_diagnosis_worker.js`
- `manifest.json`
- `docs/PATCH19_DIAGNOSIS_MODES_SAFE_RENDERER_GUIDE.md`
- `docs/patch_report_diagnosis_modes_safe_renderer_20260709.json`

## GitHub commit message

```text
patch: add diagnosis modes and safe teacher renderer
```

## Version

`2026.07.09-patch19-diagnosis-modes-and-safe-renderer`
