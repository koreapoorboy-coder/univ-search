# Assessment × Keyword Connection Patch v1

## Purpose

This patch connects the keyword engine to the accumulated performance-assessment runtime data.
The connection is not a simple keyword tag lookup. It combines:

1. selected subject and subject group,
2. task name, task type, and task description,
3. keyword major group and exploration cluster,
4. actual dominant methods, outputs, report modes, and rubric tags,
5. output-specific report sections and evidence requirements.

The connected result is carried through the local renderer, MINI payload, Worker generation request, collection payload, and final student-facing report.

## Actual uploaded baseline

- Schools: 54
- Assessment records: 7,131
- Source entries: 859
- Latest included school: Sookmyung Girls' High School (숙명여고)
- Duplicate task IDs: 0
- Missing source references: 0

The handoff document expected 59 schools, but the uploaded engine archive contains 54 schools. The five schools absent from the uploaded runtime are 영동고, 영동일고, 영파여고, 오금고, and 위례한빛고.

## Generated connection data

- Keyword routes: 2,780
- UI subject routes with evidence: 26 / 26
- Task/output routes: 4
- Active keyword-library coverage: 4 / 4

## Runtime flow

Student input → task interpreter → subject evidence route → keyword/major/cluster route → task/output route → recommended topic, method, output, rubric, evidence, and report flow.

School names are not exposed in generated recommendations. They remain available only for source validation and aggregate counts.

## Rebuild after adding schools

Run from the repository root:

```bash
python build/build_assessment_keyword_bridge.py
```

This regenerates the bridge JSON, audit, samples, and aggregate counts from the current runtime data.

## Human-readable exports

- `data/assessment/bridge/export/keyword_assessment_routes.v1.csv`
- `data/assessment/bridge/export/subject_assessment_evidence.v1.csv`
- `data/assessment/bridge/export/task_output_evidence.v1.csv`
