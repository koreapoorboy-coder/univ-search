#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "data/assessment/rules/task_interpreter_rules.v1.json"
RECORDS_PATH = ROOT / "data/assessment/records/assessment_tasks.v1.jsonl"
BRIDGE_PATH = ROOT / "data/assessment/bridge/assessment_keyword_bridge.v1.json"
CROSS_AXIS_PATH = ROOT / "data/assessment/bridge/assessment_seed_cross_axis.v2.json"
OUTPUT_PATH = ROOT / "audit/task_interpreter_validation.v1.json"


def load_records() -> list[dict[str, Any]]:
    with RECORDS_PATH.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def choose_rule(text: str, rules: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, list[str]]:
    lowered = text.lower()
    best_rule = None
    best_terms: list[str] = []
    for rule in rules:
        matched = [term for term in rule.get("match_terms", []) if str(term).lower() in lowered]
        if len(matched) > len(best_terms):
            best_rule = rule
            best_terms = matched
    return best_rule, best_terms


def score(records: list[dict[str, Any]], rules: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [row for row in records if row.get("is_topic_generating") is not False]
    covered = 0
    report_hits = 0
    method_hits = 0
    unmatched_samples: list[dict[str, str]] = []
    for row in eligible:
        text = f"{row.get('raw_task_title') or ''} {row.get('raw_task_desc') or ''}"
        rule, matched_terms = choose_rule(text, rules)
        if not rule:
            if len(unmatched_samples) < 20:
                unmatched_samples.append({
                    "task_id": row.get("task_id", ""),
                    "subject": row.get("subject_standard") or row.get("subject_raw") or "",
                    "title": row.get("raw_task_title") or "",
                    "description": row.get("raw_task_desc") or "",
                })
            continue
        covered += 1
        report_hits += bool(set(rule.get("report_mode", [])) & set(row.get("report_mode", [])))
        method_hits += bool(set(rule.get("method_axis", [])) & set(row.get("method_axis", [])))
    return {
        "eligible_record_count": len(eligible),
        "covered_record_count": covered,
        "unmatched_record_count": len(eligible) - covered,
        "coverage_pct": round(covered / len(eligible) * 100, 2),
        "report_mode_intersection_pct": round(report_hits / covered * 100, 2) if covered else 0,
        "method_axis_intersection_pct": round(method_hits / covered * 100, 2) if covered else 0,
        "unmatched_samples": unmatched_samples,
    }


def main() -> None:
    rules_doc = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    records = load_records()
    rules = rules_doc.get("rules", [])
    bridge = json.loads(BRIDGE_PATH.read_text(encoding="utf-8"))
    cross_axis = json.loads(CROSS_AXIS_PATH.read_text(encoding="utf-8"))

    actual_report_modes = {mode for row in records for mode in row.get("report_mode", [])}
    rule_report_modes = {mode for rule in rules for mode in rule.get("report_mode", [])}
    unknown_labels = sorted(rule_report_modes - actual_report_modes)

    cross_tasks = [task for group in cross_axis.get("tasksBySubject", {}).values() for task in group]
    result = {
        "version": "task-interpreter-validation-v1.0.0",
        "matching_strategy": "count matched match_terms; choose the first rule in array order on ties",
        "baseline_7_rules": score(records, rules[:7]),
        "patched_13_rules": score(records, rules),
        "rule_count": len(rules),
        "embedded_bridge_rule_count": len(bridge.get("task_interpreter_rules", [])),
        "report_mode_vocabulary_check": {
            "actual_vocabulary_count": len(actual_report_modes),
            "rule_vocabulary_count": len(rule_report_modes),
            "unknown_rule_labels": unknown_labels,
            "passed": not unknown_labels,
        },
        "non_report_policy_check": {
            "source_records_with_flag": sum("is_topic_generating" in row for row in records),
            "source_false_count": sum(row.get("is_topic_generating") is False for row in records),
            "runtime_records_with_flag": sum(task.get("isTopicGenerating") is not None for task in cross_tasks),
            "runtime_false_count": sum(task.get("isTopicGenerating") is False for task in cross_tasks),
            "performance_terms": rules_doc.get("non_report_task_policy", {}).get("match_terms", []),
        },
        "fallback_policy": rules_doc.get("matching_policy", {}),
    }

    assert len(rules) == 13, f"expected 13 rules, got {len(rules)}"
    assert len(bridge.get("task_interpreter_rules", [])) == 13, "bridge does not embed all rules"
    assert not unknown_labels, f"new report_mode label found: {unknown_labels}"
    assert result["patched_13_rules"]["coverage_pct"] >= 89.0
    assert 65.0 <= result["patched_13_rules"]["report_mode_intersection_pct"] <= 68.0
    assert result["patched_13_rules"]["method_axis_intersection_pct"] >= 81.0
    assert result["non_report_policy_check"]["source_false_count"] == 625
    assert result["non_report_policy_check"]["runtime_false_count"] == 625

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
