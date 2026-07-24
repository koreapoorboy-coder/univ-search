# Assessment Keyword Complete Report Patch v2

## Purpose

This patch changes the secondary report generator from a fill-in draft template to a complete school-submission report.

## Main changes

- Generates a specific report title from subject concept, keyword, assessment focus, selected path, and detailed focus.
- Removes UI noise such as `선택됨` and `전공 맞춤 추천` from generated content.
- Rejects old responses containing `[수정 필요]`, input placeholders, or generic draft instructions.
- Produces the following report structure:
  1. 탐구 동기 및 목적
  2. 탐구 문제
  3. 이론적 배경
  4. 탐구 방법
  5. 탐구 내용 및 결과
  6. 결과 해석 및 고찰
  7. 결론
  8. 한계와 후속 탐구
  9. 느낀 점
  10. 참고자료
- Uses assessment-engine method, output, rubric, and assessment focus in the report.
- Does not invent numerical data or exact sources when the student has not supplied them.
- Includes complete local fallback reports for energy generation, batteries/materials, AI/data, environment/climate, and health/life-science topics.

## Upload path

Upload the extracted contents directly to:

`univ-search/public/keyword-engine/`

Do not upload the outer patch folder as an additional nested directory.

## Files replaced

- `index.html`
- `assets/js/mini_payload_builder.js`
- `assets/js/mini_worker_generate_bridge_v32.js`

## Validation example

Input:

- Subject: 통합과학1
- Concept: 발전과 에너지원
- Keyword: 발전
- Expansion path: 사례 비교형

Expected title:

`화력발전과 재생에너지 발전의 환경 영향 비교: 공급 안정성과 지속가능성을 중심으로`

The output must not contain `[수정 필요]`, `학생 입력 필요`, `선택됨`, or `수정해야 할 부분`.
