[README_engineering_engine_patch_v3.md](https://github.com/user-attachments/files/26644492/README_engineering_engine_patch_v3.md)
# engineering_engine_patch_v3

이 패치는 공학계열 source 누적본(78~119)을 major-engine 실사용 파일로 반영한 업데이트입니다.

변경 파일:
- major_profiles_master_198.json
- major_alias_map.json
- major_to_book_bridge.json
- major_catalog_198.json

적용 위치:
public/keyword-engine/seed/major-engine/

반영 범위:
- 78~94 (기존 반영 유지)
- 95~119 (신규 반영)

참고:
- recommended_books_raw는 원문 추천도서 OCR 정밀 추출 전 단계라 빈 배열로 유지했습니다.
- 화면용 전공 해석, 키워드, 연결 교과, 탐구 방향 예시는 source extracted 데이터를 기준으로 반영했습니다.
