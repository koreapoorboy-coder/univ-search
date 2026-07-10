# Patch36 — 대수 통합 마스터 구조 전환

## 핵심 변경
- 문제집별 파일 분리 운영을 중단합니다.
- 대수 전체 2,519문항을 하나의 통합 마스터 데이터로 관리합니다.
- 문제집 정보는 관리자용 출처 메타데이터로만 유지합니다.
- 학생 진단은 대수 마스터 개념·문항유형 기준으로만 동작합니다.

## 핵심 파일
- `data/algebra/source_item_bank/algebra.source_items.master.v1.json`
- `data/algebra/source_item_links/algebra.source_item_to_type.links.v1.json`
- `data/algebra/source_registry/algebra.sources.master.v1.json`
- `data/algebra/coverage/algebra.coverage.master.v1.json`
- `data/algebra/algebra.master_index.v1.json`

## 적용
Patch25~Patch35는 업로드하지 않습니다.
이 Patch36의 `math-weakness-engine` 폴더 내용을
`public/math-weakness-engine/`에 덮어씁니다.

## 이후 추가 원칙
새 문제집 → 임시 분석 → 중복/유형 검수 → 대수 통합 마스터에 병합
문제집별 운영 파일은 만들지 않습니다.

## Commit message
`Consolidate algebra data into subject-level master bank`
