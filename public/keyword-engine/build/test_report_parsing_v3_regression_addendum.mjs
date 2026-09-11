// Addendum to test_report_parsing_v3_regression.mjs (Claude re-verification, 2026-09-10).
// E1: numbered procedure lines that merely START with a known section word must stay in the body.
// E4: guard — "N. <known title>: body" inline headings must keep working after the E1 fix.
// E2: informational only (model paraphrasing a heading); not counted as failure.
// Usage (repo root): node test_report_parsing_v3_regression_addendum.mjs [path/to/bridge]
import { readFileSync, existsSync } from "node:fs";

const BRIDGE_REL = "public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js";
const bridgePath = process.argv[2] || [BRIDGE_REL, `source/${BRIDGE_REL}`].find(existsSync) || BRIDGE_REL;
const bridge = readFileSync(bridgePath, "utf8");
const slice = (from, to) => {
  const a = bridge.indexOf(from), b = bridge.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`slice not found: ${from}`);
  return bridge.slice(a, b);
};
const api = new Function([
  slice("function cleanReportLine", "function normalizeGeneratedCandidate"),
  slice("const KNOWN_SECTION_TITLES", "function isTableSection"),
  slice("const REPORT_SECTION_ALIASES", "function renderDocumentBody"),
].join("\n") + "\nreturn {cleanReportText, splitSections, dedupeSections, normalizeDocumentSections};")();
const render = text => api.normalizeDocumentSections(api.dedupeSections(api.splitSections(api.cleanReportText(text))));
const bodyOf = (display, title) => display.find(s => s.title === title)?.body || "";

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failures++; };

const E1 = render([
  "1. 연구 질문", "락타아제 우유의 원리는 무엇일까?", "",
  "2. 탐구 방법", "문헌을 바탕으로 설계한다.",
  "1) 자료 수집 단계에서 교과서와 식품 표시를 읽는다.",
  "2) 결과 정리 표를 만들어 온도별 예상을 적는다.",
  "3) 한계 요인을 줄이기 위해 같은 우유를 쓴다.", "",
  "3. 탐구 결과 및 분석", "측정값이 없으므로 수치로 말할 수 없다.", "",
  "4. 결론", "기질 특이성을 이용한 사례이다.",
].join("\n"));
const method = bodyOf(E1, "탐구 방법");
check(method.includes("1) 자료 수집 단계에서 교과서와 식품 표시를 읽는다."), "E1a: '1) 자료 수집 단계에서…' stays verbatim in 탐구 방법");
check(method.includes("2) 결과 정리 표를 만들어") && !bodyOf(E1, "탐구 결과 및 분석").includes("표를 만들어"), "E1b: '2) 결과 정리 표를…' is not moved into 탐구 결과 및 분석");
check(!E1.some(s => s.title === "한계") && method.includes("3) 한계 요인을 줄이기 위해"), "E1c: '3) 한계 요인을…' does not create a '한계' section");
check(E1.map(s => s.title).join("|") === "연구 질문|탐구 방법|탐구 결과 및 분석|결론", "E1d: section order is exactly 연구 질문 → 탐구 방법 → 탐구 결과 및 분석 → 결론");

const E4 = render(["1. 연구 질문: 락타아제 우유는 어떤 원리일까?", "", "2. 결론", "좋은 사례이다."].join("\n"));
check(E4[0]?.title === "연구 질문" && E4[0]?.body.startsWith("락타아제 우유는"), "E4 guard: '1. 연구 질문: …' inline heading still recognized");

const E2 = render(["1. 탐구 동기", "배가 아픈 친구가 있었다.", "", "2. 이론적 배경", "효소는 단백질이다.", "", "3. 결론", "정리한다."].join("\n"));
console.log(`INFO E2 (optional, paraphrased heading): titles = ${E2.map(s => s.title).join(" | ")}`);

console.log(`\n${failures ? `FAIL ${failures} check(s)` : "ALL PASS"}`);
process.exitCode = failures ? 1 : 0;
