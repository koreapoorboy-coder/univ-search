#!/usr/bin/env python3
"""Validate patch 1 major-category weighting expectations."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "data/assessment/bridge/assessment_seed_cross_axis.v2.json"
OUTPUT = ROOT / "audit/MAJOR_CATEGORY_WEIGHT_VALIDATION.md"

EXPECTED = [
    ("화학", "engineering", 188, 175, False),
    ("화학", "natural", 188, 181, False),
    ("화학", "medical", 188, 115, False),
    ("생명과학", "medical", 180, 148, False),
    ("지구시스템과학", "medical", 25, 3, True),
    ("기하", "medical", 34, 10, False),
]


def norm(value: object) -> str:
    text = str(value or "").lower()
    text = text.replace("Ⅰ", "1").replace("Ⅱ", "2").replace("Ⅲ", "3")
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def main() -> None:
    runtime = json.loads(RUNTIME.read_text(encoding="utf-8"))
    seeds = runtime.get("seeds", [])
    threshold = int(runtime.get("majorMatching", {}).get("thinCategoryThreshold", 10))
    rows = []
    failures = []

    for subject, category, expected_pool, expected_category, expected_fallback in EXPECTED:
        pool = [seed for seed in seeds if any(str(v or "").strip() == subject for v in seed.get("subjects", []))]
        category_hits = [seed for seed in pool if category in seed.get("majorCategories", [])]
        fallback = len(category_hits) < threshold
        row = {
            "subject": subject,
            "category": category,
            "subject_pool": len(pool),
            "category_matches": len(category_hits),
            "fallback": fallback,
            "effective_pool": len(pool),
        }
        rows.append(row)
        actual = (len(pool), len(category_hits), fallback)
        expected = (expected_pool, expected_category, expected_fallback)
        if actual != expected:
            failures.append((subject, category, expected, actual))

    examples = runtime.get("majorMatching", {}).get("decodedFilenameExamples", [])
    decoded_ok = any("건설시스템공학과" == item.get("decodedMajor") for item in examples)
    if not decoded_ok:
        failures.append(("filename decode", "engineering", "건설시스템공학과", examples))

    lines = [
        "# Major Category Weight Validation",
        "",
        f"- runtime: `{runtime.get('version', '')}`",
        f"- thin-category threshold: `{threshold}`",
        "- candidate policy: subject pool is never reduced by major/category",
        "- medical policy: medical and health remain one `medical` category",
        "",
        "| subject | category | subject pool | category matches | fallback | effective pool |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for row in rows:
        lines.append(
            f"| {row['subject']} | {row['category']} | {row['subject_pool']} | "
            f"{row['category_matches']} | {'YES' if row['fallback'] else 'NO'} | {row['effective_pool']} |"
        )
    lines.extend([
        "",
        f"- Unicode filename decode: {'PASS' if decoded_ok else 'FAIL'}",
        f"- Overall: {'PASS' if not failures else 'FAIL'}",
        "",
    ])
    if failures:
        lines.append("## Failures")
        for failure in failures:
            lines.append(f"- {failure}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({"pass": not failures, "rows": rows, "failures": failures}, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
