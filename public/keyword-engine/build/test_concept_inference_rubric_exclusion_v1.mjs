// Concept inference must not take its concept from grading criteria (rubricAxis).
// Real case 2026-09-11: 통합과학1 효소 task matched the record "효소 작용 탐구", whose rubric "개념정확성"
// contains the dictionary term "정확성" (chapter "과학의 측정과 우리 사회"), so "정확성" became the concept.
// Runs the real helper with its real data files (fetch is served from this repo).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const engineRoot = new URL("../", import.meta.url);
globalThis.window = globalThis;
globalThis.fetch = async url => {
  const path = String(url).replace(/^\.\//, "");
  try {
    return new Response(readFileSync(new URL(path, engineRoot)), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
};
const originalWarn = console.warn;
console.warn = () => {};
vm.runInThisContext(readFileSync(new URL("../assets/assessment_keyword_bridge_helper.js", import.meta.url), "utf8"));
const bridge = globalThis.AssessmentKeywordBridge;
await bridge.ready();
console.warn = originalWarn;

const TASK = "효소가 실생활에 쓰이는 현상을 찾아 활용 방안을 통한 탐구보고서 작성하기";
const record = {
  title: "효소 작용 탐구",
  description: "• 효소 작용의 원리에 관한 탐구 활동 수행 하기 • 효소 작용 원리와 특성 설명 하기",
  rubricAxis: ["논리전개", "근거제시", "관점설정", "탐구질문", "자료분석", "결과해석", "개념정확성", "성실성", "참여도", "과정충실도"],
};
const payload = { subject: "통합과학1", taskName: TASK, taskDescription: TASK };

let passed = 0;
const check = (ok, label, detail) => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}  [${detail}]`); passed++; };

const result = bridge.inferSubjectConcepts("통합과학1", record, "", payload);
const summary = `list=${JSON.stringify(result.list)} matched=${JSON.stringify(result.detail?.matchedTerms)}`;
check(!result.list.includes("정확성") && !(result.detail?.matchedTerms || []).includes("정확성"), "rubric '개념정확성' does not produce the concept '정확성'", summary);
check(result.list[0] === "효소", "the enzyme task's first concept is '효소'", summary);

// Control: the same dictionary does match '정확성' when that word is real task content, so the exclusion is specific.
const control = bridge.inferSubjectConcepts("통합과학1", { ...record, description: `${record.description} • 측정값의 정확성과 정밀도 비교하기` }, "", payload);
check((control.detail?.matchedTerms || []).includes("정확성"), "control: '정확성' written in the task content is still recognised", `matched=${JSON.stringify(control.detail?.matchedTerms)}`);

console.log(`PASS concept inference rubric exclusion: ${passed}/${passed}`);
