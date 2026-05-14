# keyword-engine seed-bank

작성일: 2026-05-14

이 폴더는 수행평가 탐구엔진의 보고서 seed bank다.
현재 운영 엔진에 적용하지 않고, 보고서 생성 품질 개선을 위한 seed 데이터를 먼저 축적한다.

## 폴더 구조

```text
seed-bank/
├─ report-seeds/
│  └─ stage1/
├─ raw-reports/
│  ├─ original-xlsx/
│  └─ converted-notes/
├─ index/
└─ archive/
```

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `report-seeds/stage1/report_seed_bank_stage1_v1.json` | stage1 seed 원본 데이터 |
| `report-seeds/stage1/report_seed_bank_stage1_v1.js` | 추후 엔진 연결 가능 형태 |
| `report-seeds/stage1/REPORT_SEED_BANK_STAGE1_V1.md` | 사람이 읽는 stage1 설명서 |
| `index/report_seed_index.json` | 전체 seed 통합 목록 |
| `index/report_seed_tag_map.json` | 과목/학과/후속축별 seed 역색인 |
| `index/report_seed_coverage_map.md` | coverage 확인표 |
| `index/duplicate_check.md` | 중복 seed 점검 문서 |
| `index/SEED_BANK_POLICY.md` | 운영 미적용 및 관리 원칙 |

## 현재 상태

- stage1 seed 5개 구축 완료
- 운영 코드 미수정
- mini payload 미연결
- 학생 화면 영향 없음

## 다음 단계

추가 보고서가 들어오면 `report-seeds/stage2`를 만들고 index 파일을 갱신한다.
