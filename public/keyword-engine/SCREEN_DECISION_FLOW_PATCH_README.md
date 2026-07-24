# Patch 4 — Three-decision report flow

Apply this ZIP **after Patch 1, Patch 2, and Patch 3** at:

`univ-search/public/keyword-engine/`

This patch contains only changed front-end/runtime files. It does not contain or overwrite `data/` or `seed/` source files.

## New student flow

1. Select a subject.
2. Paste the assessment notice or enter only its task title.
3. Confirm the interpretation card, or open correction controls only when the interpretation is wrong.
4. Select one of the three career categories: engineering, natural science, or medical/health.
5. The book step appears only when the notice or interpreted output contains a book/reading signal.
6. Generate the report.

The student's normal decision points are reduced to:

- subject
- interpretation confirmation
- career category

The manual `지금 해석하기` button is optional because interpretation also starts automatically after input pauses.

## Removed from the normal screen path

- school name
- grade
- result type
- major-name search
- textbook concept selection
- follow-up axis selection
- always-visible book selection
- the old abstract 6–8 selection flow

Compatibility fields required by older runtime code remain as hidden fields. `schoolName` stays empty and is not used for topic generation.

## Interpretation card

The card displays:

- allowed existing `report_mode` values
- expected output artifacts
- sections determined by `structure_id`

`다르게 잡을래요` exposes the old-style correction choices only on demand. The correction panel does not create new report-mode labels and uses the current structure catalog.

## Structure handling

The report section list is resolved from:

`data/assessment/rules/report_structure_rules.v1.json`

Selection order inside the existing runtime is:

1. student's explicit correction, when present
2. exact matched task structure
3. structure mapped from the interpreted existing report mode
4. existing research-report fallback

The final MINI payload and report prompt receive the selected `structure_id` and only its defined section list. The previous fixed 10-section/13-section output is no longer forced.

## Conditional book step

The book step opens only when one of these signals is detected:

- the notice includes `독서`, `도서`, `책`, `서평`, `독후`, `저자`, or `문헌`
- the interpreted output axis contains a reading/book-related output

The default remains `도서 없이 진행`, allowing public data, statistics, articles, and experimental material.

## Preserved policies

- major category remains a ranking weight, never an AND filter
- `medical` remains one medical/health category
- no new `report_mode` labels
- held subjects remain in the dropdown
- `확률과 통계` keeps its space
- Patch 2 subject aliases remain query-time aliases
- the simple maximum-term interpreter rule remains unchanged
- no front-end API key is added

## Validation

Run from the deployed keyword-engine root:

```bash
python build/validate_decision_flow.py
python build/validate_major_category_weighting.py
python build/validate_subject_alias_dropdown.py
python build/validate_task_interpreter_rules.py
```

Browser audit snapshots are included in `audit/browser_validation.json` and `audit/correction_override_validation.json`.
