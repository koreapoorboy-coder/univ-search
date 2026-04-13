# 의약계열 source 구조본 v1

- source_group: medical
- 범위: 121~130
- 원문: 학과별 전공탐구 활동_의약계열.pdf
- 상태:
  - complete_two_page_visible: 121~129
  - partial_one_page_visible: 130

## 구성
- `majors/121_간호학과.json` ~ `majors/130_한약학과.json`
- `medical_source_master_121_130.json`
- `medical_source_index_121_130.json`
- `medical_source_index_121_130.csv`
- `medical_source_visibility_report_v1.json`

## 사용 목적
이 파일들은 major-engine 런타임에 바로 투입하는 최종 엔진 파일이 아니라,
PDF 원문 내용을 구조화한 source 보관용 파일입니다.
후속 단계에서 major_profiles_master, alias_map, engine bridge로 이관합니다.
