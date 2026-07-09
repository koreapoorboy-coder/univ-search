# SIDAE SU1 MORE -> Algebra full book item bank patch

## 목적
`2027 시대인재 수능기출 MORE 수학Ⅰ` 전체 문항을 수학 진단 엔진의 `대수` 기준 item_bank로 누적하기 위한 GitHub-ready 패치입니다.

## 이번 패치 범위
- 전체 8개 문제 PDF 기준 문항 번호 001~661 전체 등록
- 수학Ⅰ 원본 단원 → 대수 엔진 단원으로 매핑
- 동일 유형은 같은 `matched_problem_type_id`로 묶고, 표현 차이는 `variant_id`로 저장
- 완전 중복 원문은 저장하지 않으며, 현재 exact duplicate는 0건으로 시작
- 문제 원문/해설 원문 전문은 저장하지 않고 문항분류 메타데이터만 저장

## 전체 문항 수
- 전체: 661문항
- 지수와 로그: 001~127
- 지수함수와 로그함수: 128~239
- 지수함수와 로그함수 활용: 240~280
- 삼각함수 뜻과 그래프: 281~377
- 사인법칙과 코사인법칙: 378~417
- 등차수열과 등비수열: 418~523
- 수열의 합: 524~599
- 수학적 귀납법: 600~661

## 적용 경로
- `data/sources/`
- `data/coverage/`
- `data/item_bank/algebra/exp_log_foundation/`
- `data/item_bank/algebra/exp_log_function/`
- `data/item_bank/algebra/trigonometric_function/`
- `data/item_bank/algebra/sequence/`
- `data/type_variant_bank/algebra/`
- `data/duplicate_map/algebra/`

## 상태
- `coverage_status`: `full_book_completed`
- `mapping_status`: `matched_by_source_subunit`
- `review_status`: `teacher_review_recommended`
- `solution_ref_status`: `pending_solution_page_mapping`

## Commit message
`Add SIDAE SU1 MORE algebra full book item bank`
