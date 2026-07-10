# Patch47 - 대수 완전 통합 운영 구조

이 패치는 Patch46의 데이터를 유지하면서 세트별 보고서, 세트별 정답 감사 파일,
세트별 안내 문서를 모두 제거한 정리본입니다.

## 실제 운영 구조
- 대수 전체 문항은 `algebra.source_items.master.v1.json` 한 파일에서 관리
- 연결 정보는 `algebra.source_item_to_type.links.v1.json` 한 파일에서 관리
- 출처 정보는 `algebra.sources.master.v1.json` 한 파일에서 관리
- 세트별 운영 파일은 0개
- 학생 화면에는 출처명, 문제집명, 원본 번호, 페이지를 노출하지 않음

## 적용
이 Patch47만 업로드합니다.
기존 Patch36~Patch46은 따로 올리지 않습니다.

## Commit message
`Clean and consolidate algebra into single master structure`
