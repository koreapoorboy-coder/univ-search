# Patch15 · Proof-Based Concept Diagnosis

## 목적
학생이 인강을 보고 정리한 흔적만으로는 개념을 정확히 이해했는지 확인하기 어렵다. Patch15는 학생 화면과 확인 문항을 `개념 설명형`에서 `증명형 개념 진단`으로 전환한다.

## 핵심 철학
수학 개념 이해의 기준은 다음이다.

1. 어떤 조건에서 개념이 성립하는지 말할 수 있는가
2. 어떤 조건에서는 성립하지 않는지 말할 수 있는가
3. 반례로 틀린 일반화를 깨뜨릴 수 있는가
4. 겉모양이 비슷한 대상을 조건으로 비교할 수 있는가
5. 필요한 경우 풀이 또는 증명 과정을 끝까지 쓸 수 있는가

## 학생 화면 변경
학생에게 먼저 보이는 결과는 내부 JSON 또는 confidence가 아니라 아래 순서로 출력된다.

1. 오늘 판정
2. 증명형 개념 판정
3. 판정 경계
4. 증명 답안 기본형
5. 학생이 다시 제출해야 할 증명 과제
6. 현재 확인된 것
7. 증명에서 비어 있는 부분
8. 암기로 넘어갈 위험
9. 교사용 상세 진단 열기

## 유리수·무리수 전용 증명 과제
업로드 자료에서 유리수, 무리수, 순환소수, 비순환무한소수, 루트, 제곱근, π 등이 감지되면 다음 과제를 우선 출력한다.

- 0.333... 또는 0.121212...가 끝나지 않는데도 유리수인 이유를 분수 변환으로 증명
- √4, √9처럼 루트가 있어도 값이 정수로 나오면 유리수임을 증명
- √2가 유리수라고 가정했을 때 모순이 생기는 구조로 설명
- “무한소수는 모두 무리수이다”, “루트가 있으면 모두 무리수이다”가 틀렸음을 반례로 증명

## 확인 문제 생성 원칙
Worker와 로컬 fallback은 단순 O/X, 단순 정의 암기, 빈칸 짜맞추기만 출력하지 않는다. 가능한 경우 아래 유형을 조합한다.

- 성립 조건 증명
- 성립하지 않는 조건 증명
- 반례 증명
- 비슷한 두 대상 비교 설명
- 대표 문제 풀이 과정 증명

## 적용 파일

- `hybrid.html`
- `assets/math_hybrid_report_renderer.js`
- `assets/math_verification_flow.js`
- `data/ai_bridge/verification_question_blueprints.v1.json`
- `data/ai_bridge/verification_answer_review_rubric.v1.json`
- `data/ai_bridge/verification_question_schema.v1.json`
- `worker_skeleton/math_diagnosis_worker.js`
- `manifest.json`

## Cloudflare Worker 확인 버전

```text
2026.07.09-patch15-proof-based-concept-diagnosis
```
