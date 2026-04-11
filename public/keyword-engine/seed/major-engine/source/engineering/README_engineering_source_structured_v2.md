[README_engineering_source_structured_v4.md](https://github.com/user-attachments/files/26644247/README_engineering_source_structured_v4.md)
# Engineering Source Structured Pack v4

이 폴더는 공학계열 원문 PDF를 엔진 반영 전 단계에서 source 형태로 보관하기 위한 구조본입니다.

## 포함 범위
- 078 건설시스템공학과 ~ 101 자동차공학과
- source_files:
  - 학과별 전공탐구 활동_공학계열.pdf
  - 공학계열 파트 2.pdf
  - 공학계열 파트 3.pdf

## 핵심 파일
- engineering_source_master_78_101.json : 통합 source
- engineering_source_index_78_101.json / csv : 인덱스
- engineering_source_visibility_report_v4.json : complete / partial 상태표
- majors/*.json : 학과별 개별 source

## 용도
- root의 major_profiles_master_198.json 등 실사용 엔진 파일을 수정하기 전 근거 데이터로 활용
- 누락 점검, 원문 역추적, 계열별 검수에 사용
