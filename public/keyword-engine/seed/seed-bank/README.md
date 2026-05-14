# keyword-engine seed-bank

작성일: 2026-05-14

이 폴더는 수행평가 탐구엔진의 보고서 seed bank다. 현재 운영 엔진에 적용하지 않고, 보고서 생성 품질 개선을 위한 seed 데이터를 먼저 축적한다.

## 폴더 구조

```text
seed-bank/
├─ report-seeds/
│  ├─ stage1/
│  └─ stage2/
├─ raw-reports/
│  ├─ original-xlsx/
│  └─ converted-notes/
├─ index/
└─ archive/
```

## 현재 누적 seed

| Stage | 범위 | 수량 | 상태 |
|---|---|---:|---|
| Stage 1 | RPT-001~RPT-005 | 5 | 완료 |
| Stage 2 | RPT-006~RPT-010 | 5 | 완료 |

## 핵심 원칙

- 보고서 원문을 복사하지 않고 사고 구조만 seed화한다.
- 운영 엔진에는 아직 연결하지 않는다.
- 적용은 seed matcher와 payload 구조가 준비된 뒤 한 번에 진행한다.
