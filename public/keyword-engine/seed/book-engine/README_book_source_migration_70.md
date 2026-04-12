# book-engine source migration (70 books)

이 폴더 구조는 기존 70권 runtime 데이터를 source 중심 구조로 재정리한 버전입니다.

## 핵심 원칙
- `source/books/` : 책 1권당 1파일
- `source/catalog/` : 전체 인덱스 및 가시성 점검
- `source/dedupe/` : 제목/저자/출판사 정규화 및 중복 판정
- `source/bridges/` : 책-학과/교과/주제 연결

## 이번 마이그레이션 기준
- runtime 원본: `mini_book_engine_books_starter.json`
- 변환 메타: `archive/book_engine_transform_master_70.json`
- lookup 참조: `archive/book_engine_lookup_70.json`

## 다음 단계
이 source 구조를 기준으로 이후 신규 도서는 `source/books/`에 먼저 추가하고,
검수 완료 후 runtime 파일(starter / mapping / lookup)에 반영합니다.
