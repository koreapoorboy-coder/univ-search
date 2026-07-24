# Seed schema + guide keyword patch

Apply this patch after Patches 1–4 at:

```text
univ-search/public/keyword-engine/
```

## Defect A: seed adapter completion

`build/build_assessment_seed_cross_axis_runtime.py` now adapts every observed polymorphic form of:

- `topicSeedContext`
- `reportSeedContext`
- `qualityGuardContext`

The adapter preserves the legacy fields and adds normalized fields such as:

- topic: `baseTopic`, `coreQuestion`, `recommendedTopics`, `inquiryQuestions`, `levels`
- report: `titleOptions`, `paragraphBlueprint`, `outputGuidance`, `quantitativeGuidance`
- quality: `evaluatorView`, `levelGuide`, `duplicateGuard`, `safetyGuards`, `rubricGuidance`

The regenerated cross-axis excludes four files under `seed-bank-v2/index/` because they have no `seedId`. Therefore the correct runtime seed count is **290**, not 294.

## Defect B: assessment guide affects seed selection

When no student-selected keyword exists:

1. Vocabulary is built from each seed's `axisTriggers` and `writingKeywords`.
2. Terms appearing in the pasted assessment guide are extracted.
3. The terms are stored in the existing keyword signal with `keywordSource: derived_from_guide`.
4. Derived terms use weight 22; directly supplied terms retain weight 30.
5. The pasted guide's full text receives a task-context maximum of 10.
6. Exact overlaps with a seed's own vocabulary add a bounded bonus, preventing broad incidental mentions from outranking a specialist seed.

The report-generation prompt now receives normalized topic, report and quality context, including the per-seed duplicate guard.

## Auxiliary subject handling

- `한국사`: retained, moved to `준비 중`, selection logged.
- `지구과학`: retained as thin-seed subject with notice and logging.

No `seed/seed-bank-v2/` source file is included or modified.

## Validation

```bash
python build/validate_seed_schema_guide_keyword_patch.py .
python build/validate_major_category_weighting.py .
python build/validate_subject_alias_dropdown.py .
python build/validate_task_interpreter_rules.py .
python build/validate_decision_flow.py .
```

Expected core result:

```text
seedCount 290
topicMissing 0
reportMissing 0
qualityMissing 0
enzyme guide seed NAT-030
```
