# Mapping policy

- `source_subject`는 원본 책 기준으로 `수학Ⅰ`을 유지합니다.
- `target_curriculum_subject`와 `engine_unit_id`는 진단 엔진 기준 `대수`로 매핑합니다.
- 같은 진단 유형은 `matched_problem_type_id`를 공유합니다.
- 동일 유형의 변형은 `variant_id`, `variant_tags`, `near_duplicate_group`으로 관리합니다.
- 문제 원문/해설 원문 전문은 저장하지 않습니다.
