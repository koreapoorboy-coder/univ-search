# Major Category Weighted Seed Ranking Patch v1

## Purpose

This patch removes department/major matching from the report-seed candidate filter.
The subject creates the complete candidate pool, while the requested major only changes ordering.

## Final matching policy

1. Keep every seed whose `bestForSubjects` literally contains the selected subject.
2. Order the subject pool by:
   - exact normalized major match;
   - same `engineering` / `natural` / `medical` category;
   - all other seeds.
3. Never remove a subject seed because its `bestForMajors` does not match.
4. Keep `medical` as one combined medicine/health category. Do not split it.

Within each major tier, the existing keyword, concept, follow-up-axis, task and method relevance scores decide the order.

## Major normalization sources

- `seed/major-engine/major_alias_map.json`
- `seed/major-engine/source/major_alias_registry_all.json`
- `seed/major-engine/source/major_category_registry.json`
- decoded filenames under:
  - `seed/major-engine/source/engineering/majors/`
  - `seed/major-engine/source/natural/majors/`
  - `seed/major-engine/source/medical/majors/`

Unicode filename tokens such as `#Uac74` are decoded before registration.
Normalization is exact after whitespace/punctuation cleanup. Unmapped department names never remove a seed; they fall into the `other` tier.

## Thin-category fallback

The threshold is `10` category-matched seeds.

- fewer than 10: disable category priority and rank the full subject pool;
- exactly 10: keep category priority;
- exact major matching remains available;
- when fallback is active, MINI receives this instruction:

> 이 시드는 학생 지망 계열과 직접 일치하지 않으므로, 교과 개념과 진로의 연결 논리를 명시적으로 서술할 것

## Validation

The category-match count is diagnostic only. The effective candidate pool remains the full subject pool.

| Subject | Requested category | Subject pool | Category matches | Fallback | Effective pool |
|---|---:|---:|---:|---:|---:|
| 화학 | engineering | 188 | 175 | No | 188 |
| 화학 | natural | 188 | 181 | No | 188 |
| 화학 | medical | 188 | 115 | No | 188 |
| 생명과학 | medical | 180 | 148 | No | 180 |
| 지구시스템과학 | medical | 25 | 3 | Yes | 25 |
| 기하 | medical | 34 | 10 | No | 34 |

Run:

```bash
python build/build_assessment_seed_cross_axis_runtime.py
python build/validate_major_category_weighting.py
```

## Apply path

Extract this patch into:

```text
univ-search/public/keyword-engine/
```

Do not add an extra parent folder.
