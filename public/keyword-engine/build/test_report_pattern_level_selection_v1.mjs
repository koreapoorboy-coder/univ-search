// Example-report patterns are chosen by topic. Level policy (user decision, 2026-09-11): each grade writes one level
// above itself (고1 → 고2~고3, 고2 → 고3~대학 1학년, 고3 → 대학 수준), so every grade gets the full pattern.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
const index = JSON.parse(readFileSync(new URL("../seed/seed-bank/index/report_seed_index.json", import.meta.url), "utf8"));
const slice = (from, to) => {
  const a = worker.indexOf(from), b = worker.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`slice not found: ${from}`);
  return worker.slice(a, b);
};
const { pickReportPatterns, targetLevel } = new Function(
  slice("const TARGET_LEVELS", "const INPUT_LABEL") + slice("function toArray", "function compactJoin")
  + "\nreturn { pickReportPatterns, targetLevel };"
)();

const nameOf = id => index.seeds.find(seed => seed.seedId === id).seedName;
const pick = input => pickReportPatterns({ keyword: "", selectedKeyword: "", selectedConcept: "", selectedFollowupAxis: "", track: "", major: "", ...input }, index);

let passed = 0;
const check = (ok, label) => { assert.equal(ok, true, label); passed++; };

// 1. Target level is one step above the grade.
check(targetLevel({ grade: "고1" }).label === "고2~고3 심화 수준" && targetLevel({ grade: "2" }).label === "고3~대학 1학년 수준" && targetLevel({ grade: "고3" }).label === "대학 교양~전공 기초 수준",
  "target level: 고1 → 고2~고3, 고2 → 고3~대학 1학년, 고3 → 대학");

// 2. The reported case: 고1 통합과학1, 효소 now gets the topic pattern with its analysis method, labelled 고2~고3.
const enzyme = pick({ grade: "고1", subject: "통합과학1", keyword: "효소", selectedKeyword: "효소", selectedConcept: "효소", track: "공학계열", major: "공학계열" });
check(enzyme.some(p => p.patternName === nameOf("RPT-030") && String(p.analysisMethod || "").includes("미카엘리스") && p.patternLevel.startsWith("고2~고3")),
  "고1 효소: the enzyme pattern and its analysis method are passed at 고2~고3 level");

// 3. 고2·고3 electives keep the full pattern.
const chem = pick({ grade: "고2", subject: "화학Ⅱ", keyword: "효소" });
check(chem.some(p => p.patternName === nameOf("RPT-030") && String(p.analysisMethod || "").includes("미카엘리스")), "고2 화학Ⅱ 효소: analysis method is kept");
check(!chem.some(p => p.patternName === nameOf("RPT-001") || p.patternName === nameOf("RPT-002")), "고2 화학Ⅱ 효소: subject-only matches (RPT-001, RPT-002) are not selected");
const bio = pick({ grade: "고3", subject: "생명과학Ⅱ", keyword: "시냅스" });
check(bio[0]?.patternName === nameOf("RPT-007") && Boolean(bio[0].analysisMethod) && bio[0].patternLevel.startsWith("대학"), "고3 생명과학Ⅱ 시냅스: RPT-007 first, with analysis method, at university level");

// 4. No topic match -> no patterns (subject or major alone never selects), for any grade.
check(pick({ grade: "고2", subject: "화학Ⅱ", keyword: "무관한주제어" }).length === 0, "subject-only match selects nothing (고2 elective)");
check(pick({ grade: "고1", subject: "통합과학1", keyword: "무관한주제어" }).length === 0, "subject-only match selects nothing (고1)");
check(pick({ grade: "고2", subject: "국어", keyword: "시조", track: "공학계열", major: "공학계열" }).length === 0, "major-only match selects nothing");

// 5. Prompt tells the model how deep to go and how to use the patterns.
check(worker.includes("reportPatterns는 다른 주제의 우수 보고서에서 뽑은 사고 흐름 예시다"), "prompt: do not import the example's topic");
check(worker.includes("reportPatterns의 분석 방법은 목표 수준에 맞게 뜻을 먼저 설명한 뒤 활용한다"), "prompt: methods are used at the target level, explained first");
check(worker.includes("[깊이 기준]") && worker.includes("다른 가능한 설명을 최소 1개 검토"), "prompt: depth rules (mechanism, alternative explanation, reliability, 계열)");

console.log(`PASS report pattern level selection: ${passed}/${passed}`);
