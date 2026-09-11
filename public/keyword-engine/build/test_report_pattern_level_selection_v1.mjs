// R5 regression: example-report patterns are chosen by topic, and their depth follows the student's level.
// 고1 / common subjects get only the flow; 고2·고3 electives also get the analysis method.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
const index = JSON.parse(readFileSync(new URL("../seed/seed-bank/index/report_seed_index.json", import.meta.url), "utf8"));
const slice = (from, to) => {
  const a = worker.indexOf(from), b = worker.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`slice not found: ${from}`);
  return worker.slice(a, b);
};
const { pickReportPatterns } = new Function(
  slice("const FOUNDATION_SUBJECT_PATTERN", "function validateInput") + slice("function toArray", "function compactJoin")
  + "\nreturn { pickReportPatterns };"
)();

const nameOf = id => index.seeds.find(seed => seed.seedId === id).seedName;
const pick = input => pickReportPatterns({ keyword: "", selectedKeyword: "", selectedConcept: "", selectedFollowupAxis: "", track: "", major: "", ...input }, index);

let passed = 0;
const check = (ok, label) => { assert.equal(ok, true, label); passed++; };

// 1. The reported case: 고1 통합과학1, 효소, 공학계열 -> no example content at all at foundation level.
const enzyme = pick({ grade: "고1", subject: "통합과학1", keyword: "효소", selectedKeyword: "효소", selectedConcept: "효소", track: "공학계열", major: "공학계열" });
check(Array.isArray(enzyme) && enzyme.length === 0, "고1 효소: no example pattern (name, flow or cautions) is passed at foundation level");

// 2. Foundation level by subject or by grade.
check(pick({ grade: "고2", subject: "통합과학2", keyword: "효소" }).length === 0, "통합과학 subject is foundation level even in 고2");
check(pick({ grade: "고1", subject: "화학", keyword: "효소" }).length === 0, "고1 is foundation level even in an elective subject");

// 3. 고2·고3 electives keep the full pattern.
const chem = pick({ grade: "고2", subject: "화학Ⅱ", keyword: "효소" });
check(chem.some(p => p.patternName === nameOf("RPT-030") && String(p.analysisMethod || "").includes("미카엘리스")), "고2 화학Ⅱ 효소: analysis method is kept");
check(!chem.some(p => p.patternName === nameOf("RPT-001") || p.patternName === nameOf("RPT-002")), "고2 화학Ⅱ 효소: subject-only matches (RPT-001, RPT-002) are not selected");
const bio = pick({ grade: "고3", subject: "생명과학Ⅱ", keyword: "시냅스" });
check(bio[0]?.patternName === nameOf("RPT-007") && Boolean(bio[0].analysisMethod), "고3 생명과학Ⅱ 시냅스: RPT-007 first, with analysis method");

// 4. No topic match -> no patterns (subject or major alone never selects).
check(pick({ grade: "고2", subject: "화학Ⅱ", keyword: "무관한주제어" }).length === 0, "subject-only match selects nothing (고2 elective)");
check(pick({ grade: "고2", subject: "국어", keyword: "시조", track: "공학계열", major: "공학계열" }).length === 0, "major-only match selects nothing");

// 5. Prompt tells the model how to use the patterns.
check(worker.includes("reportPatterns는 다른 주제의 우수 보고서에서 뽑은 사고 흐름 예시다"), "prompt: do not import the example's topic");
check(worker.includes("교과서 개념과 실생활 사례 하나로 탐구 흐름을 스스로 구성하고"), "prompt: foundation level builds its own flow from textbook concepts");
check(worker.includes("reportPatterns의 분석 방법은 교과 개념으로 설명할 수 있는 범위에서만"), "prompt: advanced level explains methods within subject concepts");

console.log(`PASS report pattern level selection: ${passed}/${passed}`);
