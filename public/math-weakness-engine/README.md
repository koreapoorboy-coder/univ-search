# Patch22 · Diagnosis-first, optional question generation

## 목적
진단과 문제 생성을 2단계로 분리했습니다. 학생 자료를 올리면 먼저 1차 진단만 수행하고, 보강 문제가 필요할 때만 2차 보강 문제 생성 버튼을 눌러 10문항과 PDF 문제지를 생성합니다.

## 핵심 변경
- 1차 진단에서는 문제지를 자동 생성하지 않습니다.
- 1차 진단은 자료 읽기, 단원/개념 매칭, 학생 문제점, 연결 단원까지만 출력합니다.
- 2차 보강 문제 생성은 사용자가 별도로 실행할 때만 동작합니다.
- 2차 문제 생성은 1차 진단에서 확정된 `engine_locked_context` 기준으로만 생성됩니다.
- 이전 학생, 이전 단원, 이전 fallback 문제 세트가 새 진단에 섞이지 않도록 run 단위로 상태를 초기화합니다.
- 대수 거듭제곱근 자료가 들어왔는데 유리수·무리수 샘플 PDF가 출력되는 문제를 구조적으로 방지합니다.

## 적용 파일
- `hybrid.html`
- `assets/math_hybrid_report_renderer.js`
- `assets/math_verification_flow.js`
- `worker_skeleton/math_diagnosis_worker.js`
- `manifest.json`

## 새 사용 흐름
1. 학생 자료 업로드
2. `1차 진단 시작`
3. 진단 결과 확인
4. 문제가 필요하면 `2차 보강 문제 생성`
5. 필요한 경우 `학생용 PDF 열기/저장`
6. 학생이 풀어오면 재검수

## Commit message
```text
patch: split diagnosis and optional question generation
```
