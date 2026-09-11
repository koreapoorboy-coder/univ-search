// E2 regression: headings the model reworded are still split into sections,
// while numbered lists and numbered sentences inside a section stay in the body.
import { readFileSync, existsSync } from "node:fs";

const BRIDGE_REL = "public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js";
const bridgePath = process.argv[2]
  || [new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), BRIDGE_REL].find(p => existsSync(p));
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
const render = (text, requestedTitles = []) =>
  api.normalizeDocumentSections(api.dedupeSections(api.splitSections(api.cleanReportText(text), { requestedTitles })));
const titles = display => display.map(s => s.title).join(" | ");
const bodyOf = (display, title) => display.find(s => s.title === title)?.body || "";

let failures = 0;
const check = (ok, label, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : `  -> ${detail}`}`); if (!ok) failures++; };

const reworded = ["1. 탐구 동기", "배가 아픈 친구가 있었다.", "", "2. 이론적 배경", "효소는 단백질이다.", "", "3. 결론", "정리한다."].join("\n");
const r1 = render(reworded, ["탐구 동기", "이론적 배경 및 자료 검토", "결론"]);
check(titles(r1) === "탐구 동기 | 이론적 배경 및 자료 검토 | 결론", "R1: reworded '2. 이론적 배경' maps to the requested title", titles(r1));
const r2 = render(reworded);
check(titles(r2) === "탐구 동기 | 이론적 배경 | 결론", "R2: without requested titles the reworded heading is kept as written", titles(r2));

const r3 = render(["1. 연구 질문", "질문이다.", "", "2. 결론", "결론이다.", "", "3. 알게 된 점", "판단이 바뀌었다."].join("\n"));
check(titles(r3) === "연구 질문 | 결론 | 알게 된 점", "R3: unknown heading with the next number becomes its own section", titles(r3));

const r4 = render(["1. 연구 질문", "질문이다.", "", "2. 탐구 방법", "문헌으로 설계한다.", "1. 비커 준비", "2. 효소 넣기", "3. 온도 기록", "", "3. 탐구 결과 및 분석", "수치는 없다."].join("\n"));
check(titles(r4) === "연구 질문 | 탐구 방법 | 탐구 결과 및 분석", "R4: '3. 온도 기록' inside a same-style list is not a heading", titles(r4));
check(bodyOf(r4, "탐구 방법").includes("3. 온도 기록"), "R4: list item stays in 탐구 방법 body", bodyOf(r4, "탐구 방법"));

const r5 = render(["1. 연구 질문", "질문이다.", "", "2. 탐구 방법", "설명한다.", "3. 온도를 높이면 반응이 빨라진다.", "", "3. 결론", "끝."].join("\n"));
check(titles(r5) === "연구 질문 | 탐구 방법 | 결론", "R5: numbered sentence is not a heading", titles(r5));

const r6 = render(["1. 연구 질문", "질문이다.", "", "2. 탐구 방법", "설명한다.", "1) 비커 준비", "2) 효소 넣기", "3) 온도 기록", "3. 알게 된 점", "판단이 바뀌었다."].join("\n"));
check(titles(r6) === "연구 질문 | 탐구 방법 | 알게 된 점", "R6: '3.' heading right after a ')' list is still a heading", titles(r6));
check(bodyOf(r6, "탐구 방법").includes("3) 온도 기록"), "R6: ')' list stays in 탐구 방법 body", bodyOf(r6, "탐구 방법"));

console.log(`\n${failures ? `FAIL ${failures} check(s)` : "ALL PASS"}`);
process.exitCode = failures ? 1 : 0;
