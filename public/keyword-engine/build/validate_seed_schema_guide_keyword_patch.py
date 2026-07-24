#!/usr/bin/env python3
"""Validate seed schema adaptation and guide-keyword patch after application."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
CROSS = ROOT / "data/assessment/bridge/assessment_seed_cross_axis.v2.json"
errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


require(CROSS.is_file(), "assessment_seed_cross_axis.v2.json is missing")
data = json.loads(CROSS.read_text(encoding="utf-8")) if CROSS.is_file() else {"seeds": []}
seeds = data.get("seeds") or []

null_ids = [seed.get("file") for seed in seeds if not seed.get("id")]
miss_topic: list[str] = []
miss_report: list[str] = []
miss_quality: list[str] = []
for seed in seeds:
    topic = seed.get("topic") or {}
    if not (topic.get("basic") or topic.get("baseTopic") or topic.get("recommendedTopics") or topic.get("coreQuestion")):
        miss_topic.append(seed.get("id"))
    if not any((seed.get("report") or {}).values()):
        miss_report.append(seed.get("id"))
    if not any((seed.get("quality") or {}).values()):
        miss_quality.append(seed.get("id"))

require(len(seeds) == 290, f"expected 290 real seeds after excluding four index files, got {len(seeds)}")
require(not null_ids, f"index/non-seed rows leaked into runtime: {null_ids[:10]}")
require(not miss_topic, f"topic adapter misses remain: {miss_topic[:10]}")
require(not miss_report, f"report adapter misses remain: {miss_report[:10]}")
require(not miss_quality, f"quality adapter misses remain: {miss_quality[:10]}")
require(not any("seed-bank-v2/index/" in str(seed.get("file") or "") for seed in seeds), "seed-bank-v2 index files must be excluded")

by_id = {seed.get("id"): seed for seed in seeds}
bio005 = by_id.get("BIO-005") or {}
nat030 = by_id.get("NAT-030") or {}
require(bool((bio005.get("topic") or {}).get("baseTopic")), "BIO-005 baseTopic was not adapted")
require(bool((bio005.get("topic") or {}).get("coreQuestion")), "BIO-005 coreQuestion was not adapted")
require(bool((bio005.get("report") or {}).get("titleOptions")), "BIO-005 report title options were not adapted")
require(bool((nat030.get("quality") or {}).get("duplicateGuard")), "NAT-030 duplicateGuard was not preserved")

helper = (ROOT / "assets/assessment_keyword_bridge_helper.js").read_text(encoding="utf-8")
require('keywordSource === "derived_from_guide" ? 22 : 30' in helper, "derived keyword weight 22 / direct weight 30 is missing")
require("rawTaskText(payload), seedText, 10" in helper, "guide task score maximum 10 is missing")
require("buildSeedVocabulary" in helper and "extractGuideKeywords" in helper, "guide vocabulary extraction functions are missing")
require("guideVocabularyBonus" in helper, "exact seed-vocabulary overlap bonus is missing")

index = (ROOT / "index.html").read_text(encoding="utf-8")
require(index.count('<option value="한국사"') == 1, "한국사 option must exist exactly once")
ready_start = index.find('<optgroup label="준비 중">')
korean_history = index.find('<option value="한국사"')
require(ready_start >= 0 and korean_history > ready_start, "한국사 must be in the 준비 중 group")
notice = (ROOT / "assets/js/subject_support_notice.js").read_text(encoding="utf-8")
require('PENDING_NO_SEED = new Set(["한국사"])' in notice, "한국사 pending/log status is missing")
require('"지구과학"' in notice and "THIN_SEED" in notice, "지구과학 thin-seed notice must remain")

# Protected policies from Patches 1-4.
require('category never filters the subject pool' in json.dumps(data.get("majorMatching") or {}, ensure_ascii=False), "major weighting policy regressed")
require('<option value="확률과 통계"' in index and '<option value="확률과통계"' not in index, "확률과 통계 spacing regressed")
require(re.search(r'<input\s+id="schoolName"\s+type="hidden"', index) is not None, "schoolName must remain hidden")

runtime_script = ROOT / "build/runtime_validate_guide_keyword_selection.js"
require(runtime_script.is_file(), "runtime guide-keyword validator is missing")
runtime_result = None
if runtime_script.is_file():
    proc = subprocess.run(
        ["node", str(runtime_script), str(ROOT)],
        text=True,
        capture_output=True,
        encoding="utf-8",
    )
    if proc.returncode != 0:
        errors.append("runtime guide-keyword validation failed: " + (proc.stdout + proc.stderr)[-2000:])
    else:
        runtime_result = json.loads(proc.stdout)

result = {
    "pass": not errors,
    "seedCount": len(seeds),
    "nullSeedIds": len(null_ids),
    "topicMissing": len(miss_topic),
    "reportMissing": len(miss_report),
    "qualityMissing": len(miss_quality),
    "bio005": {
        "baseTopic": (bio005.get("topic") or {}).get("baseTopic"),
        "coreQuestion": (bio005.get("topic") or {}).get("coreQuestion"),
    },
    "nat030DuplicateGuard": (nat030.get("quality") or {}).get("duplicateGuard"),
    "runtime": runtime_result,
    "errors": errors,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(1)
