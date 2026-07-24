#!/usr/bin/env python3
"""Build the assessment × report-seed browser runtime.

Major matching policy (patch 1):
- subject membership creates the candidate pool;
- major exact match and three-category match only change ordering;
- engineering / natural / medical are the only weighted categories;
- when a category has fewer than 10 subject candidates, category weighting is
  disabled and the full subject pool remains available.
"""
from __future__ import annotations

import glob
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSESSMENT_JSONL = ROOT / "data/assessment/records/assessment_tasks.v1.jsonl"
STRUCTURE_RULES = ROOT / "data/assessment/rules/report_structure_rules.v1.json"
TOPIC_RULES = ROOT / "data/assessment/rules/topic_generation_rules.v1.json"
RATIO_RULES = ROOT / "data/assessment/runtime_v2/assessment_ratio_buckets.v2.json"
BRIDGE_FILE = ROOT / "data/assessment/bridge/assessment_keyword_bridge.v1.json"
OUTPUT = ROOT / "data/assessment/bridge/assessment_seed_cross_axis.v2.json"

MAJOR_CATEGORY_REGISTRY = ROOT / "seed/major-engine/source/major_category_registry.json"
MAJOR_ALIAS_MAP = ROOT / "seed/major-engine/major_alias_map.json"
MAJOR_ALIAS_REGISTRY = ROOT / "seed/major-engine/source/major_alias_registry_all.json"
MAJOR_SOURCE_ROOT = ROOT / "seed/major-engine/source"
TARGET_MAJOR_CATEGORIES = ("engineering", "natural", "medical")
THIN_CATEGORY_THRESHOLD = 10
FALLBACK_PROMPT_INSTRUCTION = (
    "이 시드는 학생 지망 계열과 직접 일치하지 않으므로, "
    "교과 개념과 진로의 연결 논리를 명시적으로 서술할 것"
)
UNICODE_ESCAPE_RE = re.compile(r"#U([0-9a-fA-F]{4})")


def compact(values):
    return [v for v in (values or []) if v not in (None, "")]


def norm(value: object) -> str:
    text = str(value or "").lower()
    text = text.replace("Ⅰ", "1").replace("Ⅱ", "2").replace("Ⅲ", "3")
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def decode_major_name(value: object) -> str:
    text = str(value or "")
    return UNICODE_ESCAPE_RE.sub(lambda m: chr(int(m.group(1), 16)), text)


def normalize_major_key(value: object) -> str:
    """Exact-key normalization only; never fuzzy-collapse different majors."""
    text = decode_major_name(value).lower().strip()
    text = re.sub(r"[\s()\-_/·.,]+", "", text)
    text = re.sub(r"(?:관련)?계열$", "", text)
    return text


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def extract_numeric_constraints(description: str) -> list[str]:
    text = str(description or "")
    patterns = [
        r"(?:총\s*)?\d+\s*(?:문항|개|회|종|쪽|분|명|자료|사례|주제)",
        r"각\s*\d+\s*(?:문항|개|회|종|쪽|분|명|자료|사례|주제)",
        r"\d+\s*선",
        r"\d+\s*가지",
    ]
    out: list[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            value = match.group(0).strip()
            if value and value not in out:
                out.append(value)
    return out[:12]


def build_tasks() -> tuple[dict[str, list[dict]], int]:
    tasks_by_subject: dict[str, list[dict]] = {}
    count = 0
    with ASSESSMENT_JSONL.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            subject = row.get("subject_standard") or row.get("subject_raw") or ""
            key = norm(subject)
            record = {
                "id": row.get("task_id"),
                "school": row.get("school_name"),
                "year": row.get("year"),
                "semester": row.get("semester"),
                "grade": row.get("grade"),
                "subject": subject,
                "subjectGroup": row.get("subject_group"),
                "title": row.get("raw_task_title"),
                "description": row.get("raw_task_desc"),
                "weight": row.get("weight"),
                "rawMethods": compact(row.get("raw_method_labels")),
                "contentAxis": compact(row.get("content_axis")),
                "methodAxis": compact(row.get("method_axis")),
                "outputAxis": compact(row.get("output_axis")),
                "rubricAxis": compact(row.get("rubric_axis")),
                "reportModes": compact(row.get("report_mode")),
                "topicFormula": row.get("topic_formula"),
                "structureId": row.get("structure_id"),
                "avoidModes": compact(row.get("avoid_modes")),
                "numericConstraints": extract_numeric_constraints(row.get("raw_task_desc") or ""),
            }
            tasks_by_subject.setdefault(key, []).append(record)
            count += 1
    return tasks_by_subject, count


def build_major_matching() -> tuple[dict, dict[str, set[str]], dict[str, set[str]]]:
    category_registry = load_json(MAJOR_CATEGORY_REGISTRY)
    categories = {
        row["category_id"]: {
            "id": row["category_id"],
            "name": (
                "의약·보건계열" if row["category_id"] == "medical"
                else "자연과학계열" if row["category_id"] == "natural"
                else row.get("category_name") or row["category_id"]
            ),
            "majorCount": row.get("major_count", 0),
            "folder": row.get("folder_name", row["category_id"]),
        }
        for row in category_registry.get("categories", [])
        if row.get("category_id") in TARGET_MAJOR_CATEGORIES
    }

    alias_rows = load_json(MAJOR_ALIAS_REGISTRY).get("rows", [])
    alias_to_categories: dict[str, set[str]] = {}
    alias_to_canonical_ids: dict[str, set[str]] = {}
    canonical_by_name: dict[str, tuple[str, str]] = {}

    def register(alias: object, category_id: str, canonical_id: str, canonical_name: str) -> None:
        key = normalize_major_key(alias)
        if not key or category_id not in TARGET_MAJOR_CATEGORIES:
            return
        alias_to_categories.setdefault(key, set()).add(category_id)
        alias_to_canonical_ids.setdefault(key, set()).add(canonical_id)
        canonical_by_name.setdefault(normalize_major_key(canonical_name), (canonical_id, category_id))

    for row in alias_rows:
        category_id = row.get("category_id")
        if category_id not in TARGET_MAJOR_CATEGORIES:
            continue
        canonical_id = row.get("major_uid") or f"{category_id}:{normalize_major_key(row.get('major_name'))}"
        canonical_name = row.get("major_name") or ""
        register(canonical_name, category_id, canonical_id, canonical_name)
        for alias in row.get("aliases", []):
            register(alias, category_id, canonical_id, canonical_name)

    # Merge the older 139-major alias map into the category-aware registry.
    for row in load_json(MAJOR_ALIAS_MAP):
        display_name = row.get("display_name") or ""
        resolved = canonical_by_name.get(normalize_major_key(display_name))
        if not resolved:
            continue
        canonical_id, category_id = resolved
        register(display_name, category_id, canonical_id, display_name)
        for alias in row.get("aliases", []):
            register(alias, category_id, canonical_id, display_name)

    # Decode #Uxxxx filenames and register the source-file major names as aliases.
    decoded_filename_examples: list[dict] = []
    for category_id in TARGET_MAJOR_CATEGORIES:
        for path in sorted((MAJOR_SOURCE_ROOT / category_id / "majors").glob("*.json")):
            raw_stem = re.sub(r"^\d+_", "", path.stem)
            decoded_name = decode_major_name(raw_stem)
            try:
                source_row = load_json(path)
            except Exception:
                source_row = {}
            canonical_name = source_row.get("major_name") or decoded_name
            resolved = canonical_by_name.get(normalize_major_key(canonical_name))
            canonical_id = resolved[0] if resolved else f"{category_id}:{normalize_major_key(canonical_name)}"
            register(canonical_name, category_id, canonical_id, canonical_name)
            register(decoded_name, category_id, canonical_id, canonical_name)
            if len(decoded_filename_examples) < 3 and "#U" in path.name:
                decoded_filename_examples.append({"file": path.name, "decodedMajor": decoded_name})

    category_aliases = {
        normalize_major_key("공학계열"): "engineering",
        normalize_major_key("engineering"): "engineering",
        normalize_major_key("자연계열"): "natural",
        normalize_major_key("자연과학계열"): "natural",
        normalize_major_key("natural"): "natural",
        normalize_major_key("의약계열"): "medical",
        normalize_major_key("의약·보건계열"): "medical",
        normalize_major_key("의약보건계열"): "medical",
        normalize_major_key("메디컬계열"): "medical",
        normalize_major_key("medical"): "medical",
    }

    browser_aliases = {
        key: {
            "categoryIds": sorted(alias_to_categories.get(key, set())),
            "canonicalIds": sorted(alias_to_canonical_ids.get(key, set())),
        }
        for key in sorted(alias_to_categories)
    }
    major_matching = {
        "version": "major-category-weighted-v1.0.0",
        "categoryIds": list(TARGET_MAJOR_CATEGORIES),
        "categories": categories,
        "aliases": browser_aliases,
        "categoryAliases": category_aliases,
        "thinCategoryThreshold": THIN_CATEGORY_THRESHOLD,
        "fallbackPromptInstruction": FALLBACK_PROMPT_INSTRUCTION,
        "matchingRule": "exact major alias > same category > other; category never filters the subject pool",
        "medicalSplitPolicy": "medical remains one combined medical/health category",
        "decodedFilenameExamples": decoded_filename_examples,
    }
    return major_matching, alias_to_categories, alias_to_canonical_ids


def build_seeds(
    alias_to_categories: dict[str, set[str]],
    alias_to_canonical_ids: dict[str, set[str]],
) -> list[dict]:
    seeds: list[dict] = []
    for filename in sorted(glob.glob(str(ROOT / "seed/seed-bank-v2/*/*.json"))):
        path = Path(filename)
        try:
            row = load_json(path)
        except Exception:
            continue
        topic = row.get("topicSeedContext") or {}
        report = row.get("reportSeedContext") or {}
        quality = row.get("qualityGuardContext") or {}
        guide = row.get("sourceGuideContext") or {}
        student = row.get("studentResultTemplate") or {}
        majors = compact(row.get("bestForMajors"))
        major_keys = sorted({normalize_major_key(value) for value in majors if normalize_major_key(value)})
        major_categories = sorted({
            category
            for key in major_keys
            for category in alias_to_categories.get(key, set())
            if category in TARGET_MAJOR_CATEGORIES
        })
        major_canonical_ids = sorted({
            canonical_id
            for key in major_keys
            for canonical_id in alias_to_canonical_ids.get(key, set())
        })
        seeds.append({
            "id": row.get("seedId"),
            "file": path.relative_to(ROOT).as_posix(),
            "category": row.get("reportCategory"),
            "patternType": row.get("patternType"),
            "sourceTitle": row.get("sourceReportTitle"),
            "label": row.get("studentFacingLabel"),
            "subjects": compact(row.get("bestForSubjects")),
            "normalizedSubjects": compact(row.get("normalizedSubjects")),
            "subjectAliases": compact(row.get("legacySubjectAliases")),
            "majors": majors,
            "majorNormalizedKeys": major_keys,
            "majorCanonicalIds": major_canonical_ids,
            "majorCategories": major_categories,
            "axisTriggers": compact(row.get("axisTriggers")),
            "writingKeywords": compact([
                item.get("keyword") for item in (row.get("writingFocusKeywordCandidates") or [])
                if isinstance(item, dict)
            ]),
            "topic": {
                "formula": topic.get("topicFormula"),
                "basic": topic.get("basicTopic"),
                "expanded": topic.get("expandedTopic"),
                "deep": topic.get("deepTopic"),
                "badPatterns": compact(topic.get("badTopicPatterns")),
            },
            "report": {
                "importance": report.get("importanceFrame"),
                "problem": report.get("problemFrame"),
                "conceptRole": report.get("conceptRole"),
                "corePattern": report.get("corePattern"),
                "analysisMethod": report.get("analysisMethod"),
                "paragraphBlueprint": compact(report.get("paragraphBlueprint")),
                "avoid": compact(report.get("avoid")),
            },
            "quality": {
                "mustInclude": compact(quality.get("mustInclude")),
                "mustNotDo": compact(quality.get("mustNotDo")),
                "connectionCheck": compact(quality.get("connectionCheck")),
            },
            "sources": {
                "requiredEvidence": compact(guide.get("requiredEvidence")),
                "referenceTypes": compact(guide.get("referenceTypes")),
                "cautions": compact(guide.get("sourceCautions")),
            },
            "studentTopics": compact(student.get("recommendedTopics")),
        })
    return seeds


def main() -> None:
    tasks_by_subject, task_count = build_tasks()
    major_matching, alias_to_categories, alias_to_canonical_ids = build_major_matching()
    seeds = build_seeds(alias_to_categories, alias_to_canonical_ids)
    structure_data = load_json(STRUCTURE_RULES)
    topic_data = load_json(TOPIC_RULES)
    ratio_data = load_json(RATIO_RULES)
    bridge = load_json(BRIDGE_FILE)
    baseline = bridge.get("source_baseline") or {}

    payload = {
        "version": "assessment-seed-cross-axis-v2.1.0-major-category-weighted",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Keep every subject-matched report seed, then order by exact major, three-category match, and content relevance with thin-category fallback.",
        "priorityPolicy": {
            "candidatePool": "bestForSubjects exact subject membership; major never removes a candidate",
            "majorSortOrder": ["exact major alias", "same engineering/natural/medical category", "other"],
            "thinCategoryThreshold": THIN_CATEGORY_THRESHOLD,
            "thinCategoryFallback": "when category-matched candidates are below 10, disable category priority and use the full subject pool",
            "assessmentRequirement": 35,
            "subjectConcept": 30,
            "selectedKeywordAndContentSeed": 20,
            "methodAndOutput": 10,
            "majorCareerTieBreak": 5,
            "majorForbiddenCoreUses": [
                "title source",
                "research-question source",
                "main comparison criterion",
                "automatic keyword fallback",
                "core conclusion claim",
            ],
        },
        "majorMatching": major_matching,
        "sourceBaseline": {
            "schoolCount": baseline.get("school_count", 0),
            "recordCount": baseline.get("record_count", task_count),
            "sourceCount": baseline.get("source_count", 0),
            "latestSchool": baseline.get("latest_school", ""),
            "seedCount": len(seeds),
            "topicFormulaCount": len(topic_data.get("formulas") or []),
            "structureCount": len(structure_data.get("structures") or []),
            "majorAliasKeyCount": len(major_matching.get("aliases", {})),
        },
        "structures": {
            item.get("structure_id"): compact(item.get("sections"))
            for item in (structure_data.get("structures") or [])
            if item.get("structure_id")
        },
        "topicFormulas": {
            item.get("report_mode"): item.get("formula")
            for item in (topic_data.get("formulas") or [])
            if item.get("report_mode") and item.get("formula")
        },
        "globalAvoidPatterns": compact(topic_data.get("avoid_patterns")),
        "ratioRules": ratio_data,
        "tasksBySubject": tasks_by_subject,
        "seeds": seeds,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"wrote {OUTPUT}")
    print(
        f"tasks={task_count}, subjects={len(tasks_by_subject)}, seeds={len(seeds)}, "
        f"major_alias_keys={len(major_matching.get('aliases', {}))}, size={OUTPUT.stat().st_size}"
    )


if __name__ == "__main__":
    main()
