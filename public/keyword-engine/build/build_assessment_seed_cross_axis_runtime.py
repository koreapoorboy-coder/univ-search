#!/usr/bin/env python3
"""Build a compact runtime that crosses real assessment tasks with real report seeds.

Output is intentionally browser-friendly and contains only fields needed by the
report generator. School names stay internal for exact matching and must never
be displayed in student output.
"""
from __future__ import annotations

import glob
import json
import os
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


def compact(values):
    return [v for v in (values or []) if v not in (None, "")]


def norm(value: object) -> str:
    text = str(value or "").lower()
    text = text.replace("Ⅰ", "1").replace("Ⅱ", "2").replace("Ⅲ", "3")
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


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


def build_seeds() -> list[dict]:
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
            # Major is retained only for a maximum 5-point tie break. It is not a topic source.
            "majors": compact(row.get("bestForMajors")),
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
    seeds = build_seeds()
    structure_data = load_json(STRUCTURE_RULES)
    topic_data = load_json(TOPIC_RULES)
    ratio_data = load_json(RATIO_RULES)
    bridge = load_json(BRIDGE_FILE)
    baseline = bridge.get("source_baseline") or {}

    payload = {
        "version": "assessment-seed-cross-axis-v2.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Cross real assessment method/constraint records with real report-seed content while keeping major information as an optional tie-break only.",
        "priorityPolicy": {
            "assessmentRequirement": 35,
            "subjectConcept": 30,
            "selectedKeywordAndContentSeed": 20,
            "methodAndOutput": 10,
            "majorCareerTieBreak": 5,
            "majorUse": "topic candidate tie-break and final follow-up extension only",
            "majorForbiddenCoreUses": [
                "title source",
                "research-question source",
                "main comparison criterion",
                "automatic keyword fallback",
                "core conclusion claim",
            ],
        },
        "sourceBaseline": {
            "schoolCount": baseline.get("school_count", 0),
            "recordCount": baseline.get("record_count", task_count),
            "sourceCount": baseline.get("source_count", 0),
            "latestSchool": baseline.get("latest_school", ""),
            "seedCount": len(seeds),
            "topicFormulaCount": len(topic_data.get("formulas") or []),
            "structureCount": len(structure_data.get("structures") or []),
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
    print(f"tasks={task_count}, subjects={len(tasks_by_subject)}, seeds={len(seeds)}, size={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
