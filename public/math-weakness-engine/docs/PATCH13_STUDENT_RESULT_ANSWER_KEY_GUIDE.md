# Patch 13 · Student-facing result cards and answer-key verification

## 목적
기존 결과 화면은 JSON과 진단 과정이 그대로 노출되어 학생이 이해하기 어려웠다. Patch 13은 학생 화면을 결과 중심으로 바꾼다.

## 변경 사항
- 1차 AI 분석 결과를 `오늘 판정 / 왜 이렇게 나왔는지 / 부족한 부분 / 오개념 위험 / 지금 다시 할 것`으로 표시
- 원자료 JSON은 기본 노출하지 않고 `교사용 원자료 보기` 접힘 메뉴로 이동
- 수학 엔진 진단 JSON과 필기 검수 JSON도 접힘 메뉴로 이동
- 학생 검수 문항을 `확인 문제` 형태로 표시
- 각 확인 문제에 `정답/모범답안 확인` 접힘 메뉴 추가
- answer_key, rubric, minimum_pass_score를 학생/교사가 확인할 수 있게 표시

## Cloudflare 변경
Worker prompt의 검수 문항 생성 지시를 수정했다. answer_key가 추상적 기준이 아니라 모범답안/정답 기준을 포함하도록 요구한다.

## 적용 후 확인
- `/health` version: `2026.07.09-patch13-student-result-answer-key`
- 학생 결과 화면에 큰 판정 카드가 먼저 나오는지 확인
- JSON 원자료가 바로 보이지 않고 접힘 메뉴 안에 있는지 확인
- 확인 문제에 정답/모범답안 접힘 메뉴가 있는지 확인
