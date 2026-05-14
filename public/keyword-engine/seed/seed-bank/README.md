# Report Seed Bank

Updated: 2026-05-14

수행평가 탐구엔진 `keyword-engine`의 보고서 생성 품질 개선을 위해, 기존 고품질 보고서의 문장을 복사하지 않고 **사고 구조**를 seed로 축적하는 공간입니다.

## Current Stages

- Stage 1: RPT-001~005 완료
- Stage 2: RPT-006~010 완료
- Stage 3: RPT-011~015 완료
- Stage 4: RPT-016~020 완료

## Folder Structure

```text
seed/seed-bank/
├─ report-seeds/
│  ├─ stage1/
│  ├─ stage2/
│  ├─ stage3/
│  └─ stage4/
├─ raw-reports/
│  ├─ original-xlsx/
│  └─ converted-notes/
└─ index/
```

## Important

- 현재 파일은 seed 데이터 누적용이며 운영 엔진에 직접 연결하지 않습니다.
- MINI에 전달할 때는 보고서 원문이 아니라 `corePattern`, `problemFrame`, `analysisMethod`, `axisTriggers` 중심으로 사용합니다.
