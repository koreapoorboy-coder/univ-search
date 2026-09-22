import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlPath = new URL("../index.html", import.meta.url);
const bridgePath = new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url);
const [html, bridge] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(bridgePath, "utf8")
]);

// type="module" 조각은 new Function 으로 문법을 볼 수 없다 — import 문이 들어 있다. 그런 조각은
// 불러오는 파일 쪽에서 검사한다(test_unit_choice_picker_v1).
const inlineScripts = Array.from(html.matchAll(/<script((?:\s[^>]*)?)>([\s\S]*?)<\/script>/gi))
  .filter(match => !/type\s*=\s*["']module["']/i.test(match[1]))
  .map(match => match[2])
  .filter(source => source.trim());
for (const source of inlineScripts) new Function(source);

const checks = [
  [html.includes('data-overlay-book-mode="noBook"'), "book opt-out choice is missing"],
  [html.includes('data-overlay-book-mode="useBook"'), "book opt-in choice is missing"],
  [html.includes("setOverlayBookMode(previousBookMode)"), "book choice is not preserved on overlay refresh"],
  [html.includes("setOverlayBookMode(\"noBook\")"), "book opt-out does not clear selected-book state"],
  [bridge.includes('id="miniV32DownloadReportBtn"'), "download button is missing"],
  [bridge.includes("new Blob"), "download file is not created with a Blob"],
  [bridge.includes("URL.createObjectURL(blob)"), "download object URL is missing"],
  [bridge.includes("anchor.download"), "browser download filename is missing"],
  [bridge.includes("normalizeDocumentSections"), "report section normalization is missing"],
  [bridge.includes('class="mini-report-section"'), "full-width report document sections are missing"],
  [bridge.includes("seenBodies.has(bodyKey)"), "duplicate report bodies are not rejected"],
  [bridge.includes('["자료 수집", "탐구 방법"]'), "method/data collection headings are not consolidated"],
  [bridge.includes("makeReportPlainText"), "copy output is not built from the displayed report document"]
  ,[bridge.includes("LIVE_INTAKE_PREFLIGHT_UNAVAILABLE"), "missing live-intake preflight is not handled"]
  ,[bridge.includes("req.liveInputCandidate = candidate"), "live-input candidate is not retained for generate"]
  ,[(() => {
    // Pinning the literal version broke this test on every release. What matters is that the page asks for the
    // same build the bridge says it is — one writes v269_major_pick, the other v269-major-pick.
    const norm = (value) => String(value || "").replace(/[-_]/g, "").replace(/^v/, "");
    const asked = norm((html.match(/mini_worker_generate_bridge_v32\.js\?v=([\w-]+)/) || [])[1]);
    const says = norm((bridge.match(/mini-worker-generate-bridge-([\w-]+)/) || [])[1]);
    return Boolean(asked) && asked === says;
  })(), "the page and the bridge disagree about which build is loaded"]
];

for (const [passed, message] of checks) assert.equal(passed, true, message);
assert.equal((html.match(/data-overlay-book-mode="noBook"/g) || []).length, 1);
assert.equal((html.match(/data-overlay-book-mode="useBook"/g) || []).length, 1);

console.log(`PASS report document/download/book choice regression: ${checks.length + 2}/${checks.length + 2}`);
console.log(`PASS inline browser script syntax: ${inlineScripts.length}/${inlineScripts.length}`);
