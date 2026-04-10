[README_engineering_source_structured_v2.md](https://github.com/user-attachments/files/26633120/README_engineering_source_structured_v2.md)
# engineering source structured pack v2

이 폴더는 공학계열 PDF 원문을 엔진 반영 전 source 데이터로 보관하기 위한 구조입니다.

## 구성
- engineering_source_master_78_87.json : 공학계열 78~87 전체 source 통합본
- engineering_source_index_78_87.json / csv : 학과 목록 및 개별 source 파일 인덱스
- majors/*.json : 학과별 개별 source 파일
- engineering_source_visibility_report.json : 가시범위 및 partial 상태 보고서

## 권장 위치
public/keyword-engine/seed/major-engine/source/engineering/

## 용도
이 파일들은 엔진이 직접 읽는 최종본이 아니라, 원문 기준 검수/수정/반영용 source 파일입니다.
최종 반영 시 major_profiles_master_198.json 등 엔진용 파일로 이관합니다.
