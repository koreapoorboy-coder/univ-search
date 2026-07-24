#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ALIASES = {"미적분1": "미적분Ⅰ", "물리": "물리학"}
EXPECTED = {
    "미적분1": 169,
    "물리": 102,
    "융합과학 탐구": 278,
    "과학과제 연구": 170,
    "데이터 과학": 149,
    "화학 반응의 세계": 147,
    "인공지능 기초": 58,
    "생물의 유전": 41,
    "확률과 통계": 162,
}
NEW_OPTIONS = {
    "융합과학 탐구",
    "과학과제 연구",
    "데이터 과학",
    "화학 반응의 세계",
    "인공지능 기초",
    "생물의 유전",
}
HELD = {"공통국어1", "공통국어2", "영어", "공통수학1", "공통수학2", "지구과학"}
NOTICE = "현재 과학·수학·정보 과목을 지원합니다.\n국어·영어 수행평가는 준비 중입니다."


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_subject = False
        self.options: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "select" and data.get("id") == "subject":
            self.in_subject = True
        elif tag == "option" and self.in_subject:
            value = data.get("value", "")
            if value:
                self.options.append(value)
        elif tag == "script" and data.get("src"):
            self.scripts.append(data["src"])

    def handle_endtag(self, tag):
        if tag == "select" and self.in_subject:
            self.in_subject = False


def canonical(subject: str) -> str:
    # Intentionally do not remove spacing for normal subjects.
    raw = str(subject or "").strip()
    return ALIASES.get(re.sub(r"\s+", "", raw), raw)


def count_literal(seeds: list[dict], subject: str) -> int:
    target = canonical(subject)
    return sum(target in (seed.get("subjects") or []) for seed in seeds)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=str(Path(__file__).resolve().parents[1]))
    args = parser.parse_args()
    root = Path(args.root).resolve()

    index = root / "index.html"
    alias_js = root / "assets/js/subject_alias.js"
    support_js = root / "assets/js/subject_support_notice.js"
    helper_js = root / "assets/assessment_keyword_bridge_helper.js"
    runtime = root / "data/assessment/bridge/assessment_seed_cross_axis.v2.json"

    missing = [str(p.relative_to(root)) for p in (index, alias_js, support_js, helper_js, runtime) if not p.exists()]
    if missing:
        raise SystemExit("Missing required files: " + ", ".join(missing))

    page = PageParser()
    page.feed(index.read_text(encoding="utf-8"))
    assert page.scripts, "No script tags found"
    assert page.scripts[0].split("?", 1)[0] == "assets/js/subject_alias.js", page.scripts[0]
    assert {"미적분1", "물리"}.issubset(page.options), "Existing UI values changed or missing"
    assert NEW_OPTIONS.issubset(page.options), sorted(NEW_OPTIONS - set(page.options))
    assert HELD.issubset(page.options), sorted(HELD - set(page.options))

    alias_text = alias_js.read_text(encoding="utf-8")
    assert '"미적분1":"미적분Ⅰ"' in alias_text
    assert '"물리":"물리학"' in alias_text
    assert canonical("확률과 통계") == "확률과 통계"

    support_text = support_js.read_text(encoding="utf-8")
    for subject in HELD:
        assert subject in support_text, subject
    assert "현재 과학·수학·정보 과목을 지원합니다." in support_text
    assert "국어·영어 수행평가는 준비 중입니다." in support_text
    assert 'event_type: "subject_selection"' in support_text

    helper_text = helper_js.read_text(encoding="utf-8")
    assert "toCanonicalSubject" in helper_text
    assert "canonicalSubjectInput" in helper_text

    data = json.loads(runtime.read_text(encoding="utf-8"))
    seeds = data.get("seeds") or []
    rows = []
    for subject, expected in EXPECTED.items():
        actual = count_literal(seeds, subject)
        assert actual >= expected, f"{subject}: {actual} < {expected}"
        rows.append({"subject": subject, "canonical": canonical(subject), "actual": actual, "expectedMinimum": expected})

    result = {
        "ok": True,
        "root": str(root),
        "firstScript": page.scripts[0],
        "newOptions": sorted(NEW_OPTIONS),
        "heldSubjects": sorted(HELD),
        "subjectCounts": rows,
        "spacingPreserved": canonical("확률과 통계") == "확률과 통계",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
