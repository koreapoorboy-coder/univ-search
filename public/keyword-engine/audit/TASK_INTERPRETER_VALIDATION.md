# Task interpreter validation

- Eligible validation records: 6,506
- Existing 7-rule coverage: 71.43%
- Patched 13-rule coverage: 89.36%
- Patched report-mode intersection: 66.10%
- Patched method-axis intersection: 81.61%
- New report-mode labels: 0
- `is_topic_generating=false` source/runtime count: 625 / 625
- Runtime checks passed:
  - argumentation rule selected by maximum matched-term count
  - unmatched free text uses subject-default fallback and displays the general-type notice
  - performance terms stop generation
  - strongly matched false-flag records stop generation
  - fallback and blocked input text are logged locally and through `/collect`
- Patch 1 and Patch 2 regression validators passed.
