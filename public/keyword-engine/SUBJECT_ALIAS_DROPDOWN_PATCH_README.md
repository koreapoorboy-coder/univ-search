# Patch 2 — Subject aliases, dropdown expansion, and held-subject logging

Apply this ZIP **after Patch 1** at:

`univ-search/public/keyword-engine/`

## What changes

1. Keeps the existing UI option values `미적분1` and `물리` unchanged.
2. Loads `assets/js/subject_alias.js` as the first script.
3. Converts only at lookup time:
   - `미적분1` → `미적분Ⅰ`
   - `물리` → `물리학`
4. Does not apply the old/new curriculum normalization registry and does not collapse spaces in ordinary subject names.
5. Adds six existing-seed subjects to the dropdown:
   - 융합과학 탐구
   - 과학과제 연구
   - 데이터 과학
   - 화학 반응의 세계
   - 인공지능 기초
   - 생물의 유전
6. Retains all explicitly listed held/thin subjects:
   - 공통국어1, 공통국어2, 영어
   - 공통수학1, 공통수학2, 지구과학
7. Shows the requested notice for held/thin subjects.
8. Logs subject selection immediately:
   - browser fallback: `localStorage["ke.subjectSelectionLogs.v1"]`
   - central collection attempt: existing Worker `/collect`
   - event type: `subject_selection`
   - the normal generate-time `/collect` payload also includes `canonical_subject` and the last subject-selection event.

## Important implementation detail

The seed lookup uses the selected subject's canonical name directly. It does **not** substitute a broader subject-route key such as `정보`; this prevents `인공지능 기초` from incorrectly expanding from 58 exact seeds to the larger generic information pool.

## Validation

From the deployed keyword-engine root:

```bash
python build/validate_subject_alias_dropdown.py .
```

Expected minimum counts:

- 미적분1: 169
- 물리: 102
- 융합과학 탐구: 278
- 과학과제 연구: 170
- 데이터 과학: 149
- 화학 반응의 세계: 147
- 인공지능 기초: 58
- 생물의 유전: 41
- 확률과 통계: 162 (spacing preserved)
