# Patch 3 — Task interpreter coverage, fallback, and non-report blocking

Apply this ZIP **after Patch 1 and Patch 2** at:

`univ-search/public/keyword-engine/`

## What changes

1. Expands `task_interpreter_rules.v1.json` from 7 to 13 rules.
2. Uses one simple selection policy:
   - count how many `match_terms` occur in `raw_task_title + raw_task_desc`
   - select the rule with the largest count
   - if counts tie, keep the rule that appears first in the array
3. Does not add any new `report_mode` labels. Every rule label exists in the current 57-label validation vocabulary.
4. When no rule matches:
   - use the selected subject's dominant method/output/report-mode defaults
   - show: `입력한 과제 유형과 정확히 맞는 규칙이 없어 과목 기본값을 바탕으로 일반형으로 잡았습니다.`
   - log the original task name and description through `/collect`
   - keep up to 500 local fallback logs in `localStorage["ke.assessmentTaskInterpreterLogs.v1"]`
5. Stops report generation for performance-only tasks:
   - trusts `is_topic_generating=false` only when the matched task record has a strong title/description match
   - also detects: 연주, 실기, 랠리, 스트로크, 체력, 참여도, 던지기, 경기, 시합
   - shows the requested notice instead of calling the report-generation endpoint
6. Preserves `is_topic_generating` in the browser cross-axis runtime as `isTopicGenerating`.
7. Ignores the synthetic hidden task name such as `화학 탐구보고서` when interpreting free text, so the subject name itself does not create a false rule match.

## Validation results

Validation set: `data/assessment/records/assessment_tasks.v1.jsonl`

Eligible records: records where `is_topic_generating` is not false, 6,506 total.

| Metric | Existing 7 rules | Patched 13 rules |
|---|---:|---:|
| Coverage | 71.43% | **89.36%** |
| report_mode intersection | 66.95% | **66.10%** |
| method_axis intersection | 78.95% | **81.61%** |
| Unmatched records | 1,859 | **692** |

The current engine snapshot produces 81.61% for method-axis intersection, which is within the requested 82% range.

Additional checks:

- fixed report-mode vocabulary: 57 labels
- unknown report-mode labels introduced by rules: 0
- source records with `is_topic_generating=false`: 625
- browser runtime records retaining `isTopicGenerating=false`: 625
- Patch 1 major weighting regression check: passed
- Patch 2 subject alias/dropdown regression check: passed

## Validation commands

Run from the deployed keyword-engine root:

```bash
python build/validate_task_interpreter_rules.py
node build/runtime_validate_task_interpreter.js
python build/validate_major_category_weighting.py
python build/validate_subject_alias_dropdown.py
```
