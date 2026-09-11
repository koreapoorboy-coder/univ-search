// Repro for the v3 independent review: runs the real bridge parsing functions on a
// v3-shaped worker report. Usage (repo root = package "source" folder):
//   node repro_report_parsing_v3.mjs [path/to/mini_worker_generate_bridge_v32.js]
import { readFileSync, existsSync } from "node:fs";

const BRIDGE_REL = "public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js";
const bridgePath = process.argv[2] || [BRIDGE_REL, `source/${BRIDGE_REL}`].find(existsSync) || BRIDGE_REL;
const bridge = readFileSync(bridgePath, "utf8");
const slice = (from, to) => {
  const a = bridge.indexOf(from), b = bridge.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`slice not found: ${from}`);
  return bridge.slice(a, b);
};
const src = [
  slice("function cleanReportLine", "function normalizeGeneratedCandidate"),
  slice("const KNOWN_SECTION_TITLES", "function isTableSection"),
  slice("const REPORT_SECTION_ALIASES", "function renderDocumentBody"),
  slice("function looksLikeUnfixedSecondaryDraft", "function cleanReportPhrase"),
  "function makeReportPlainText" + slice("function makeReportPlainText", "function safeDownloadName").slice("function makeReportPlainText".length),
].join("\n");
const api = new Function(src + "\nreturn {cleanReportText, splitSections, dedupeSections, normalizeDocumentSections, looksLikeUnfixedSecondaryDraft, makeReportPlainText};")();

// Same path as extractGeneratedText → renderGeneratedReport.
const render = text => {
  const cleaned = api.cleanReportText(text);
  const discarded = api.looksLikeUnfixedSecondaryDraft(cleaned, null);
  const display = api.normalizeDocumentSections(api.dedupeSections(api.splitSections(cleaned)));
  return { discarded, display, plain: api.makeReportPlainText("T", [], display) };
};

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failures++; };

// Case A: worker default sections + numbered procedure (prompt asks for 재현 가능한 절차).
const pad = " 이 문장은 분량을 채우기 위한 설명 문장이다.".repeat(6);
const A = [
  "1. 연구 질문", "락타아제 우유는 어떤 원리로 젖당을 줄일까? 온도는 이 과정에 어떤 영향을 줄까?" + pad, "",
  "2. 이론적 배경 및 자료 검토", "효소는 반응의 활성화 에너지를 낮추는 단백질이다." + pad, "",
  "3. 탐구 방법", "직접 실험 대신 문헌 조사를 바탕으로 실험을 설계한다. 자료 수집 과정에서 교과서를 참고한다.",
  "1) 같은 양의 우유를 세 비커에 나누어 담는다.",
  "2) 락타아제를 같은 양씩 넣는다.",
  "3) 비커를 서로 다른 온도의 물에 담가 둔다.", "",
  "4. 탐구 결과 및 분석", "측정값이 없으므로 결과를 수치로 말할 수 없다." + pad, "",
  "5. 결론", "락타아제 우유는 기질 특이성을 이용한 사례이다. 이 탐구는 한계 때문에 실제 측정이 필요하다." + pad, "",
  "6. 참고문헌 및 후속 탐구", "통합과학1 교과서 효소 관련 단원",
].join("\n");
const a = render(A);
check(!a.discarded, "A: valid v3 report (worker default sections) is NOT discarded in favour of the local template");
check(["같은 양의 우유", "락타아제를 같은 양씩", "서로 다른 온도의 물"].every(s => a.plain.includes(s)), "A: numbered procedure steps survive into screen/copy/download");
check(a.display.some(s => s.title === "참고문헌 및 후속 탐구"), "A: heading '참고문헌 및 후속 탐구' is kept intact");
check(!a.display.some(s => /\n한계 때문에|\n자료 수집 과정/.test(s.body)), "A: no mid-sentence line breaks before known-heading words");

// Case B: bridge fallback structure (방법 설계 + 자료 수집 consolidation).
const B = ["연구 질문", "선행 자료 검토", "방법 설계", "자료 수집", "분석 결과", "결론", "참고문헌과 후속 탐구"]
  .map((s, i) => `${i + 1}. ${s}\n본문 ${i + 1}입니다.`).join("\n\n");
const b = render(B);
check(!b.display.some(s => /^본문 \d+$/.test(s.title)), "B: no section is retitled as '본문 N'");
check(!b.display.some(s => /^(연구 질문|선행 자료 검토|방법 설계|자료 수집|분석 결과|참고문헌과)\n/.test(s.body)), "B: heading text does not leak into the first body line");

console.log("\n--- Case A display ---");
a.display.forEach((s, i) => console.log(`[${i + 1}] ${s.title} :: ${JSON.stringify(s.body.slice(0, 60))}`));
console.log("\n--- Case B display ---");
b.display.forEach((s, i) => console.log(`[${i + 1}] ${s.title} :: ${JSON.stringify(s.body)}`));
console.log(`\n${failures ? `FAIL ${failures} check(s)` : "ALL PASS"}`);
process.exitCode = failures ? 1 : 0;
