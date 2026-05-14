# SEED_BANK_POLICY

작성일: 2026-05-14

## 1. 현재 상태

이 폴더는 `keyword-engine` 운영 코드에 아직 연결하지 않는 seed 데이터 저장소다.
현재 작업 목적은 보고서 원문을 그대로 MINI에 넣는 것이 아니라, 보고서의 사고 구조를 seed로 변환해 누적하는 것이다.

## 2. 절대 원칙

```text
운영 엔진 미적용
코드 import 금지
학생 화면 노출 금지
seed 원문 복사 금지
패턴화된 구조만 누적
```

## 3. seed-bank와 index 역할

```text
seed-bank/report-seeds = 실제 seed 데이터 누적
seed-bank/raw-reports = 원본 보고서 보관
seed-bank/index = 전체 seed 통합 관리, coverage, tag, duplicate 점검
```

## 4. 새 보고서 추가 순서

```text
1. 원본 보고서를 raw-reports에 보관
2. 보고서를 seed 구조로 변환
3. report-seeds/stageN에 json/js/md 추가
4. report_seed_index.json 갱신
5. report_seed_tag_map.json 갱신
6. report_seed_coverage_map.md 갱신
7. duplicate_check.md 갱신
```

## 5. 엔진 적용 시점

seed가 충분히 쌓인 뒤 다음 파일을 별도로 만든다.

```text
assets/js/report_seed_bank.js
assets/js/report_seed_matcher.js
assets/js/report_topic_synthesizer.js
```

그 전까지는 `seed/seed-bank` 내부 파일을 운영 코드에서 참조하지 않는다.
