# Patch 5 validation

## Seed schema adapter

- Source JSON files under `seed/seed-bank-v2/*/*.json`: 294
- Index/rule files excluded because `seedId` is absent: 4
- Real report seeds in runtime: **290**
- Missing `topic`: **0**
- Missing `report`: **0**
- Missing `quality`: **0**
- `BIO-005`: `baseTopic`, `coreQuestion`, report titles and quality context restored
- `NAT-030`: `duplicateGuard` restored

## Guide-derived seed selection

Test input:

- Subject: `생명과학`
- Category: `medical`
- Guide: enzyme activity factors and enzyme reaction-rate experiment

Result:

- `keywordSource`: `derived_from_guide`
- Extracted terms: `반응 속도`, `효소 반응`, `효소 활성`, `효소`
- Selected seed: **NAT-030**
- Subject candidate pool: **180**
- Medical-category matches: **148**
- Content score: **45**

Directly supplied keywords remain `keywordSource: student_selected`.
Guides with no vocabulary match continue through the existing fallback path without an error.

## Regression checks

- Major matching remains a ranking weight, never an AND filter.
- Thin-category threshold remains 10.
- Subject aliases and the six expanded dropdown subjects pass their previous validation.
- Task interpreter remains 13 rules with 89.36% coverage.
- Screen remains subject → interpretation confirmation → category.
- `schoolName` remains hidden.
- `확률과 통계` spacing remains unchanged.
- No frontend API key pattern found.
- `seed/` source files are byte-identical to the Patch 4 baseline.

## Auxiliary handling

- `한국사` remains selectable but is moved to the `준비 중` group and logged as a zero-seed subject.
- `지구과학` remains in the thin-seed notice and logging path.
- The 210-book recommendation policy and duplicate data-file cleanup were not changed in this patch.
