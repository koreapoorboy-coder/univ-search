# Math Weakness Engine Patch 1 - GitHub Web Upload Safe

이 패치는 GitHub 웹 업로드의 파일당 25MB 제한을 피하기 위해 `problem_type_instruction_map.v1.json`을 manifest + parts 구조로 분할했습니다.

## 업로드 위치

`public/math-weakness-engine/` 안에서 업로드하세요.

## 업로드할 폴더

압축 해제 후 다음 3개 폴더만 선택해서 업로드합니다.

- `data`
- `docs`
- `samples`

## 정상 경로

업로드 목록이 다음처럼 보여야 합니다.

- `/data/display/problem_type_instruction_map.v1.json`
- `/data/display/problem_type_instruction_map_parts/problem_type_instruction_map.part01.v1.json`
- `/data/display/problem_type_instruction_map_parts/problem_type_instruction_map.part02.v1.json`
- `/data/display/problem_type_instruction_map_parts/problem_type_instruction_map.part03.v1.json`
- `/data/display/problem_type_instruction_map_parts/problem_type_instruction_map.part04.v1.json`

## 로더 규칙

`data/display/problem_type_instruction_map.v1.json`은 실제 전체 데이터가 아니라 manifest입니다.
실제 `instructions`는 `parts` 배열의 파일을 순서대로 읽어서 합치면 됩니다.
