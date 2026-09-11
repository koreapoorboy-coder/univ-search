// Task interpreter: common report tasks (e.g. the enzyme "탐구보고서" task) used to fall to "일반형 폴백".
// inquiry_report_003 is a fallback_only rule: it applies only when no regular rule matches, so every existing
// match over the 7,131 real task records must stay exactly the same. PE skill tasks must still fall back.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const bridgePath = "data/assessment/bridge/assessment_keyword_bridge.v1.json";
const bridgeJson = JSON.parse(readFileSync(new URL(bridgePath, root), "utf8"));
const rulesJson = JSON.parse(readFileSync(new URL("data/assessment/rules/task_interpreter_rules.v1.json", root), "utf8"));
const helperSource = readFileSync(new URL("assets/assessment_keyword_bridge_helper.js", root), "utf8");

globalThis.window = globalThis;
console.warn = () => {};
async function loadHelper(bridgeOverride){
  globalThis.fetch = async url => {
    const path = String(url).replace(/^\.\//, "").split("?")[0];
    if(bridgeOverride && path.endsWith(bridgePath)) return new Response(JSON.stringify(bridgeOverride), { status: 200 });
    try{ return new Response(readFileSync(new URL(path, root)), { status: 200 }); }
    catch{ return new Response("", { status: 404 }); }
  };
  vm.runInThisContext(helperSource);
  const helper = globalThis.AssessmentKeywordBridge;
  await helper.ready();
  return helper;
}

const records = readFileSync(new URL("data/assessment/records/assessment_tasks.v1.jsonl", root), "utf8")
  .split("\n").filter(Boolean).map(line => JSON.parse(line));
const payloads = records.map(r => ({ subject: r.subject_raw, taskName: r.raw_task_title, taskDescription: [r.raw_task_title, r.raw_task_desc].filter(Boolean).join(" ") }));
const idOf = result => result.matched ? result.rule.rule_id : "FALLBACK";

const withoutNewRule = { ...bridgeJson, task_interpreter_rules: bridgeJson.task_interpreter_rules.filter(rule => !rule.fallback_only) };
const before = (await loadHelper(withoutNewRule));
const beforeIds = payloads.map(p => idOf(before.inferTaskRule(p)));
const helper = await loadHelper(null);
const afterIds = payloads.map(p => idOf(helper.inferTaskRule(p)));

let passed = 0;
const check = (ok, label, detail) => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const newRule = bridgeJson.task_interpreter_rules.at(-1);
check(JSON.stringify(bridgeJson.task_interpreter_rules) === JSON.stringify(rulesJson.rules), "bridge task_interpreter_rules and rules/task_interpreter_rules.v1.json are identical", `${bridgeJson.task_interpreter_rules.length} vs ${rulesJson.rules.length}`);
check(newRule.rule_id === "inquiry_report_003" && newRule.fallback_only === true && bridgeJson.task_interpreter_rules.filter(rule => rule.fallback_only).length === 1, "inquiry_report_003 is the only fallback_only rule and comes last", newRule.rule_id);

const enzyme = helper.inferTaskRule({ subject: "통합과학1", taskName: "효소가 실생활에 쓰이는 현상을 찾아 활용 방안을 통한 탐구보고서 작성하기", taskDescription: "효소가 실생활에 쓰이는 현상을 찾아 활용 방안을 통한 탐구보고서 작성하기" });
check(enzyme.matched && enzyme.rule.rule_id === "inquiry_report_003" && !enzyme.fallbackActive && enzyme.rule.report_mode.includes("탐구보고서형"), "enzyme report task no longer falls back to 일반형", `${idOf(enzyme)} ${enzyme.fallbackNotice}`);

const switched = beforeIds.filter((id, i) => id !== "FALLBACK" && afterIds[i] !== id);
check(switched.length === 0, "no real task that matched a regular rule changes its rule", `${switched.length} switched`);

const fallbackBefore = beforeIds.filter(id => id === "FALLBACK").length;
const fallbackAfter = afterIds.filter(id => id === "FALLBACK").length;
const recovered = afterIds.filter(id => id === "inquiry_report_003").length;
check(fallbackBefore - fallbackAfter === recovered && recovered >= 100, "common report tasks leave the fallback", `fallback ${fallbackBefore} -> ${fallbackAfter}, recovered ${recovered}`);

const pe = [
  { subject: "체육", taskName: "줄넘기 2단 뛰기", taskDescription: "신체활동이 건강에 영향을 미치는 기전과 효과를 탐구하여 줄넘기 2단 뛰기를 실시하여 성공한 총 횟수를 점수화함" },
  { subject: "체육", taskName: "유도(구르기, 낙법)", taskDescription: "신체활동이 건강에 영향을 미치는 기전과 효과를 탐구하여 앞 구르기 동작을 수행할 수 있다" },
  { subject: "스포츠 생활", taskName: "보고서 실기", taskDescription: "유연성 스트레칭 20회~30회, 앉아 윗몸 앞으로 굽히기" },
];
check(pe.every(p => !helper.inferTaskRule(p).matched), "PE skill tasks with report-like words still fall back", pe.map(p => idOf(helper.inferTaskRule(p))).join(","));
check(!helper.inferTaskRule({ subject: "영어", taskName: "자유 과제", taskDescription: "자유 과제" }).matched, "a task with no report signal still falls back", "자유 과제");

console.log(`INFO fallback ${fallbackBefore} -> ${fallbackAfter} (inquiry_report_003: ${recovered})`);
console.log(`PASS task interpreter fallback_only rule: ${passed}/${passed}`);
