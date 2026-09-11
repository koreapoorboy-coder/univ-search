// Real model output check: a gpt-4.1 sectioned report (2026-09-11, enzyme task, no-traffic preview 75bc2994)
// run through the site's own section parser. The method section contains a "1." … "5." procedure list that uses
// the same "." numbering as the section headings; it must stay in the body, and every body line must be shown.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bridge = readFileSync(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const slice = (from, to) => { const a = bridge.indexOf(from), b = bridge.indexOf(to, a); return bridge.slice(a, b); };
const site = new Function([
  slice("function cleanReportLine", "function normalizeGeneratedCandidate"),
  slice("const KNOWN_SECTION_TITLES", "function isTableSection"),
  slice("const REPORT_SECTION_ALIASES", "function renderDocumentBody"),
].join("\n") + "\nreturn {cleanReportText, splitSections, dedupeSections, normalizeDocumentSections};")();

const report = readFileSync(new URL("./fixtures/real_gpt41_sectioned_enzyme_20260911.txt", import.meta.url), "utf8");
const requested = ["연구 질문", "선행 자료 검토", "방법 설계", "자료 수집", "분석 결과", "결론", "참고문헌과 후속 탐구"];
const display = site.normalizeDocumentSections(site.dedupeSections(site.splitSections(site.cleanReportText(report), { requestedTitles: requested })));
const titles = display.map(section => section.title);
const method = display.find(section => section.title === "탐구 방법")?.body || "";
const shown = display.map(section => section.body).join("\n").replace(/\s+/g, "");
const bodyLines = report.split("\n").map(line => line.trim()).filter(line => line && !/^\d\.\s*(?:연구 질문|선행 자료 검토|방법 설계|자료 수집|분석 결과|결론|참고문헌과 후속 탐구)$/.test(line));

let passed = 0;
const check = (ok, label, detail) => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
check(titles.join("|") === "연구 질문|이론적 배경 및 자료 검토|탐구 방법|탐구 결과 및 분석|결론|참고문헌 및 후속 탐구", "real output splits into the six display sections", titles.join(" | "));
check(["1. 세탁 세제에 쓰이는 효소의 종류와", "4. 각 조건이 실제 세탁 환경에서", "5. 자료의 신뢰성을 확인하고"].every(step => method.includes(step)), "numbered procedure 1.–5. stays inside 탐구 방법", method.slice(0, 120));
const missing = bodyLines.filter(line => !shown.includes(line.replace(/\s+/g, "")));
check(missing.length === 0, "every body line of the real output is shown", missing.slice(0, 3).join(" / "));
console.log(`PASS real gpt-4.1 sectioned output parsing: ${passed}/${passed}`);
