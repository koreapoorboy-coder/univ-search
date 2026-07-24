# Patch 4 browser and regression validation

## Browser flow

- old `#engineFlowSection`: absent
- visible school-name field: absent
- visible grade field: absent
- normal progress markers: 3
- chemistry notice automatically interpreted as `자료해석형`
- selected structure: `structure_data_interpretation`
- section count: 7, exactly as defined by the structure catalog
- no-book notice: book step hidden
- reading notice: book step visible
- held-subject support notice: displayed
- non-report practical task: generation actions and category step blocked
- final generator required-field diagnostic: no missing fields

## Correction route

The automatic chemistry interpretation was changed through `다르게 잡을래요` to:

- method: `실험실습형`
- output: `실험보고서`
- report mode: `실험분석형`
- structure: `structure_experiment_analysis`

The final context retained all four corrections and the exact eight sections defined by that structure.

## Major weighting regression

For chemistry and the medical/health category:

- subject candidates retained: 188
- category matches: 115
- selected tier: category
- fallback: false

This confirms that the category remains a sorting weight rather than a candidate filter.

## Existing patch regressions

- major-category validation: passed
- subject alias/dropdown validation: passed
- task-interpreter validation: passed
- unknown report-mode labels: 0
- `is_topic_generating=false` runtime records: 625
