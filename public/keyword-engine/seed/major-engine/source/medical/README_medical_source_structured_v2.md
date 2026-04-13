# medical_source_structured_v2

의약계열 source 구조본입니다.

## 포함 범위
- 121 간호학과 ~ 138 한의예과

## 반영 원본
- 학과별 전공탐구 활동_의약계열.pdf
- 메디컬 계열 추가.pdf

## 적용 방식
- 기존 `public/keyword-engine/seed/major-engine/source/medical` 폴더가 있으면 이번 v2 폴더 내용으로 덮어쓰기
- 최종 구조:
  - majors/
  - medical_source_master_121_138.json
  - medical_source_index_121_138.json
  - medical_source_index_121_138.csv
  - medical_source_visibility_report_v2.json

## 상태 설명
- complete_two_page_visible: 학과의 기본 2페이지가 모두 보이는 상태
- partial_one_page_visible: 첫 페이지만 보이는 상태
