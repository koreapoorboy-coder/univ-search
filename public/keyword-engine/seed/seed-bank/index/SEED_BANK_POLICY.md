# SEED_BANK_POLICY

Updated: 2026-05-14

## 1. 핵심 원칙

- 보고서 원문 복사 X
- 보고서 사고 구조 추출 O
- 보고서 seed 패턴화 O
- 운영 엔진 즉시 적용 X
- seed-bank에 누적 후 별도 검토를 거쳐 적용 O

## 2. 적용 범위

현재 seed-bank는 RPT-001~RPT-015까지 누적 완료 상태다.

- Stage 1: RPT-001~RPT-005
- Stage 2: RPT-006~RPT-010
- Stage 3: RPT-011~RPT-015

## 3. 운영 엔진 연결 금지

아래 파일에는 아직 연결하지 않는다.

- `mini_worker_generate_bridge_v32.js`
- `mini_payload_builder.js`
- 운영용 보고서 생성 payload

## 4. 생성 guardrail

- 참고문헌, 수치, 사례는 지어내지 않는다.
- 불확실한 OCR/이미지 판독 정보는 학생 확인 필요로 표시한다.
- 민감한 집단, 의료·생체 데이터, 교육정책 통계는 단정하지 않는다.
- 학생 화면에 seedId, 내부 stage, RPT 코드, 개발자용 패턴명은 노출하지 않는다.
