[README_runtime_build.md](https://github.com/user-attachments/files/26658979/README_runtime_build.md)
# Book Engine Runtime Build Pack v1

이 폴더는 `source` 구조를 기준으로 runtime 3종 파일을 다시 만들어내기 위한 빌드 도구입니다.

## 목적
- `source/books/`에 책을 계속 추가해도 runtime 파일을 다시 손으로 고치지 않게 하기
- `catalog / dedupe / bridges`를 반영해서 starter / filter_mapping / lookup을 재생성하기
- `active` / `pending_detail` 상태를 구분해서 runtime 포함 범위를 제어하기

## 입력 기준
- `source/books/*.json`
- `source/catalog/book_source_master_index.json`
- `source/bridges/book_to_major_bridge.json`
- `source/bridges/book_to_subject_bridge.json`
- `source/bridges/book_to_theme_bridge.json`

## 출력 파일
- `generated/mini_book_engine_books_starter.generated.json`
- `generated/book_recommendation_filter_mapping.generated.json`
- `generated/book_engine_lookup.generated.json`
- `generated/runtime_build_report.json`

## 기본 원칙
- `status=active` 책만 starter 기본 포함
- `pending_detail` 책은 `--include-pending` 옵션을 줄 때만 starter에 포함
- lookup은 active 기준으로 먼저 생성
- bridge 데이터가 없는 책은 lookup / mapping에 강하게 반영하지 않음

## 실행 예시
```bash
python generate_runtime_from_source.py --book-engine-root ../
python generate_runtime_from_source.py --book-engine-root ../ --include-pending
```
