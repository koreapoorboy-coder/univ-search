# Patch 14 · Student-facing result workbook layout

## 목적
학생 결과 화면에서 내부 진단 과정, confidence 수치, JSON 원자료, engine log가 먼저 보이지 않도록 수정했다.

## 학생 화면 기본 순서
1. 오늘 결과
2. 왜 이렇게 나왔나요?
3. 지금 부족한 것 3개
4. 다시 해야 할 정리 양식
5. 확인 문제
6. 정답/모범답안 확인
7. 재제출 기준

## 핵심 변경
- `MathHybridReportRenderer.renderStudentWorkbook(state)` 추가
- `hybrid.html`의 결과 렌더링을 통합 학습지 구조로 변경
- 확인 문제의 `VQ1`, `definition`, `process` 같은 태그를 학생 화면에서 숨김
- 정답/모범답안은 각 확인 문제 아래 접힘 메뉴로 제공
- 교사용 상세 진단에만 자료 품질, 파일 목적, 진단 경로, JSON 원자료를 표시
- Worker fallback 검수 문항을 `Q1`, `Q2`, `Q3` 학생용 번호 체계로 변경

## 적용 파일
- `hybrid.html`
- `assets/math_hybrid_report_renderer.js`
- `assets/math_verification_flow.js`
- `worker_skeleton/math_diagnosis_worker.js`
- `manifest.json`

## 확인 기준
학생 화면 첫 영역에 `자료 품질`, `확신도`, `problem_solving`, `confidence`, `VQ1`, JSON 원자료가 노출되면 실패다. 위 정보는 교사용 상세 진단 접힘 메뉴 안에서만 확인되어야 한다.
