[README_engineering_engine_patch_v1.md](https://github.com/user-attachments/files/26633389/README_engineering_engine_patch_v1.md)
공학계열 source(78~87)를 major-engine 실사용 파일에 반영한 패치입니다.

변경 파일:
- major_profiles_master_198.json
- major_alias_map.json
- major_to_book_bridge.json
- major_catalog_198.json

적용 위치:
public/keyword-engine/seed/major-engine/

반영 범위:
78 건설시스템공학과
79 건설환경공학과
80 건축공학과
81 건축학과
82 고분자공학과
83 교통공학과
84 기계공학과
85 기계시스템공학과
86 도시공학과
87 로봇공학과(partial)

주의:
- 추천 도서 제목은 공학계열 PDF에서 OCR로 완전 추출하지 못해 recommended_books_raw는 비워 두었습니다.
- 대신 related_subject_hints와 book_bridge_candidates는 기존 book lookup을 바탕으로 엔진 테스트가 가능하도록 보강했습니다.
- 87 로봇공학과는 현재 1페이지만 보이는 partial 상태입니다.
