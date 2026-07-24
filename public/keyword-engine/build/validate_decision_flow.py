#!/usr/bin/env python3
"""Static validation for Patch 4 after it is applied to keyword-engine root."""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
errors: list[str] = []

def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)

index_path = ROOT / "index.html"
require(index_path.is_file(), "index.html is missing")
html = index_path.read_text(encoding="utf-8") if index_path.is_file() else ""

scripts = re.findall(r'<script\s+src="([^"]+)"', html)
require(bool(scripts), "no scripts found in index.html")
require(bool(scripts) and scripts[0].split("?", 1)[0] == "assets/js/subject_alias.js", "subject_alias.js must be the first script")

for old_script in (
    "textbook_concept_helper.js",
    "report_6_8_flow_bridge.js",
    "book_210_ui_bridge.js",
    "mini_payload_builder.js",
):
    require(old_script not in html, f"old decision-flow script still loaded: {old_script}")

require(len(re.findall(r'data-progress="', html)) == 3, "the screen must contain exactly three normal progress markers")
require(re.search(r'<input\s+id="schoolName"\s+type="hidden"', html) is not None, "schoolName must be hidden")
require(re.search(r'<input\s+id="grade"\s+type="hidden"', html) is not None, "grade must be hidden")
require('수행평가 안내문 (그대로 붙여넣기)' in html, "new assessment notice label is missing")
require(re.search(r'<textarea\s+id="taskDescription"\s+rows="6"', html) is not None, "taskDescription rows must be 6")
require('id="interpretationCard"' in html, "interpretation confirmation card is missing")
require('id="interpretationCorrection"' in html, "on-demand correction panel is missing")
require('id="bookStep"' in html and 'hidden' in html[html.find('id="bookStep"')-100:html.find('id="bookStep"')+150], "book step must start hidden")

categories = re.findall(r'data-category="([^"]+)"', html)
require(categories == ["engineering", "natural", "medical"], f"career categories must be engineering/natural/medical, got {categories}")

required_subject_values = [
    "공통국어1", "공통국어2", "영어", "공통수학1", "공통수학2", "지구과학",
    "융합과학 탐구", "과학과제 연구", "데이터 과학", "화학 반응의 세계", "인공지능 기초", "생물의 유전",
    "미적분1", "물리", "확률과 통계",
]
for value in required_subject_values:
    require(f'<option value="{value}"' in html, f"subject option missing or changed: {value}")
require('<option value="확률과통계"' not in html, "확률과 통계 spacing was removed")

structure_path = ROOT / "data/assessment/rules/report_structure_rules.v1.json"
require(structure_path.is_file(), "report_structure_rules.v1.json is missing")
if structure_path.is_file():
    payload = json.loads(structure_path.read_text(encoding="utf-8"))
    structures = payload.get("structures", [])
    ids = {item.get("structure_id") for item in structures}
    require(len(structures) >= 14, f"expected at least 14 structures, found {len(structures)}")
    require("structure_experiment_analysis" in ids, "experiment analysis structure missing")
    require("structure_data_interpretation" in ids, "data interpretation structure missing")

changed_files = [
    ROOT / "assets/assessment_keyword_bridge_helper.js",
    ROOT / "assets/decision_flow.css",
    ROOT / "assets/js/decision_flow_v1.js",
    ROOT / "assets/js/decision_flow_payload_adapter.js",
    ROOT / "assets/js/mini_worker_generate_bridge_v32.js",
]
for path in changed_files:
    require(path.is_file(), f"required Patch 4 file missing: {path.relative_to(ROOT)}")

joined = "\n".join(path.read_text(encoding="utf-8") for path in changed_files if path.is_file())
for token in (
    "structure_experiment_analysis",
    "structure_data_interpretation",
    "__DECISION_FLOW_STATE__",
    "__BUILD_MINI_REPORT_PAYLOAD__",
    "독서|도서|책|서평|독후|저자|문헌",
):
    require(token in joined, f"required runtime token missing: {token}")

secret_patterns = [
    r"sk-[A-Za-z0-9_-]{20,}",
    r"OPENAI_API_KEY\s*[:=]\s*['\"][^'\"]+",
    r"ANTHROPIC_API_KEY\s*[:=]\s*['\"][^'\"]+",
]
for pattern in secret_patterns:
    require(re.search(pattern, html + "\n" + joined, flags=re.I) is None, f"possible front-end secret detected by {pattern}")

if errors:
    print("Patch 4 validation FAILED")
    for item in errors:
        print(f"- {item}")
    raise SystemExit(1)

print("Patch 4 validation PASS")
print("- visible decision points: subject / interpretation confirmation / category")
print("- school and grade: hidden, not student-facing")
print("- book step: conditional")
print("- structure catalog: 14+ structures")
print("- protected subject values and three-category policy: preserved")
print("- front-end API-key pattern: not found")
