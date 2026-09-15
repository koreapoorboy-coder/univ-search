// 차례. 절이 열둘인 보고서에서 결론만 다시 보려면 계속 스크롤해야 했다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const preview = await readFile(new URL("./preview_report_screen.mjs", import.meta.url), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// 목차를 만드는 규칙만 떼어 내 실제로 돌린다 — 소스에 그런 글자가 있는지가 아니라 무엇이 나오는지를 본다.
const fnSource = bridge.slice(bridge.indexOf("function renderReportToc"), bridge.indexOf("function renderDocumentSection"));
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const renderReportToc = new Function("escapeHtml", `${fnSource}; return renderReportToc;`)(escapeHtml);
const secs = (n) => Array.from({ length: n }, (_, at) => ({ title: `절 ${at + 1}` }));

// C1: 넉넉한 보고서에만 붙는다. 서너 개짜리에 붙으면 목차가 본문보다 눈에 띈다.
check(renderReportToc(secs(12)).includes("차례"), "C1 a twelve-section report gets a contents list");
check(renderReportToc(secs(5)) !== "", "C1 five is enough");
check(renderReportToc(secs(4)) === "", "C1 four is not — 목차가 본문보다 길어지면 안 된다");
check(renderReportToc([]) === "" && renderReportToc(null) === "" && renderReportToc(undefined) === "",
  "C1 and nothing at all is not a contents list either");

// C2: 모든 절이 들어가고, 각자 갈 곳을 가리킨다.
const toc = renderReportToc(secs(12));
check((toc.match(/<a /g) || []).length === 12, "C2 every section is listed", String((toc.match(/<a /g) || []).length));
check(toc.includes('href="#miniSec1"') && toc.includes('href="#miniSec12"'), "C2 첫 절과 끝 절 모두");
check(bridge.includes('<section class="mini-report-section" id="miniSec${index + 1}">'),
  "C2 and every section carries the id the list points at");
check(toc.includes("<i>8</i>절 8"), "C2 번호와 이름이 함께 — 번호만으로는 무엇인지 모른다");

// C3: 제목은 학생이 쓴 글에서 온다. 그대로 넣으면 안 된다.
const nasty = renderReportToc([{ title: '<img src=x onerror="alert(1)">' }, ...secs(5)]);
check(!nasty.includes("<img"), "C3 a section title is escaped before it reaches the list", nasty.slice(0, 90));
check(nasty.includes("&lt;img"), "C3 and shows as text instead");

// C4: 눌렀을 때 부드럽게 간다. 앵커만 두면 화면이 툭 튀어서 어디로 갔는지 놓친다.
check(bridge.includes('a[data-mini-toc]') && bridge.includes('behavior: "smooth"'),
  "C4 clicking an entry scrolls rather than jumps");
check(bridge.includes("event.preventDefault()"), "C4 and the address bar does not fill up with #안커");
check(bridge.includes(".mini-report-section{scroll-margin-top:16px}"),
  "C4 the section lands below the top edge, not flush against it");

// C5: 폰에서 줄바꿈된다. 절이 열둘이면 한 줄에 다 못 들어간다.
check(bridge.includes(".mini-toc>div{display:flex;flex-wrap:wrap"), "C5 the entries wrap");
check(bridge.includes(".mini-toc{border:1px solid var(--mini-line"), "C5 and the block uses the shared line colour");

// C6: 미리보기가 같은 것을 그린다 — 안 그러면 ₩0으로 보는 의미가 없다.
check(preview.includes("sections.length >= 5") && preview.includes('class="mini-toc"'),
  "C6 the preview draws the contents list on the same rule");
check(preview.includes('id="miniSec${at + 1}"'), "C6 with the same ids");

console.log(`PASS report toc: ${passed}/${passed}`);
