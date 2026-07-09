# Patch16 · Compact Student Diagnosis + 10 Proof Questions

## Purpose

학생 화면에서 광범위한 분석 데이터를 먼저 보여주지 않고, 핵심 문제점과 다음 과정 연결만 짧게 보여준 뒤 10문항 증명형 문제로 실제 이해 여부를 확인합니다.

## Student output order

1. 오늘 한 줄 진단
2. 지금 문제점 최대 3개
3. 이 과정이 나중에 연결되는 곳
4. 오늘 풀 10문항
5. 정답/모범답안 접힘 확인
6. 교사용 상세 진단 접힘 처리

## Key behavior

- 분석 JSON, 확신도, 매칭 로그, 교사용 세부 진단은 학생 화면 상단에 노출하지 않습니다.
- 검수 문항은 기본 10문항입니다.
- 유리수·무리수 단원 감지 시 0.5, -3, 0.333..., 0.121212..., √4, √9, √2, 반례, 비교 설명까지 확인합니다.
- 통과 기준은 10문항 중 7문항 이상입니다. 단, 반례·비예시·비교 설명 문항을 2개 이상 틀리면 암기형 이해로 봅니다.

## Apply paths

Copy these files into the same paths in the repository.

- assets/math_hybrid_report_renderer.js
- assets/math_verification_flow.js
- data/ai_bridge/verification_question_blueprints.v1.json
- data/ai_bridge/verification_answer_review_rubric.v1.json
- data/ai_bridge/verification_question_schema.v1.json
- worker_skeleton/math_diagnosis_worker.js
- hybrid.html
- manifest.json
- docs/PATCH16_COMPACT_10Q_STUDENT_OUTPUT_GUIDE.md
- docs/patch_report_compact_10q_student_output_20260709.json

## Commit message

```text
patch: compact student diagnosis and add 10 proof questions
```
