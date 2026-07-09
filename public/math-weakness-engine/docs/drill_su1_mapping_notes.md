# DRILL 수학Ⅰ 대수 엔진 문항은행 전체 매핑

- source_id: `drill_su1`
- source_title: `DRILL 수학Ⅰ`
- engine_subject: `대수`
- total_items: `75`
- data_policy: 문제 원문/해설 전문 미저장, 진단용 메타데이터만 저장

## 포함 범위

| 원본 파일 | 문항 범위 | 문항 수 | 엔진 기준 |
|---|---:|---:|---|
| 드릴 수학1 지수함수와 로그함수.pdf | 001~025 | 25 | 대수 > 지수함수와 로그함수 |
| 드릴 수학1 지수함수와 삼각함수.pdf | 001~023 | 23 | 대수 > 삼각함수 |
| 드릴 수학1 지수함수와 수열.pdf | 001~027 | 27 | 대수 > 수열 |

## 업로드 위치

압축 해제 후 `data`, `review`, `docs`, `README.md`를 `public/math-weakness-engine/`에 업로드합니다.

## 동일 유형 처리

- 같은 풀이 구조: 같은 `matched_problem_type_id`
- 표현/조건 차이: `variant_id`, `variant_tags`
- 유사 문항 묶음: `near_duplicate_group`
- 완전 중복은 이번 패치에서 단정하지 않고 `duplicate_of: null` 유지
