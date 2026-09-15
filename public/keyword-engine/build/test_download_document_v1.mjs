// 학생이 눌러서 제출하는 파일. 선생님이 실제로 읽는 것은 화면이 아니라 이쪽이다.
//
// 이 파일은 종이로 나간다. 그래서 화면 규칙과 따로 두고, 쪽이 넘어갈 때 무엇이 쪼개지면 안 되는지를 지킨다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const preview = await readFile(new URL("./preview_report_screen.mjs", import.meta.url), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const opened = bridge.indexOf("const DOWNLOAD_STYLE = [");
check(opened > 0, "W0 the submitted file's rules have a name of their own");
const style = bridge.slice(opened, bridge.indexOf("].join(", opened));
const fn = bridge.slice(bridge.indexOf("function downloadReportHtml"), bridge.indexOf("function getPathById"));

// W1: 종이에 나간다.
check(style.includes("@page{margin:20mm 18mm}"), "W1 the page has real margins — a browser's default is not a document margin");
check(/section\{[^}]*break-inside:avoid;page-break-inside:avoid/.test(style),
  "W1 a section does not split across pages");
check(/h2\{[^}]*break-after:avoid/.test(style) || style.includes("break-after:avoid"),
  "W1 nor is a heading left alone at the foot of a page");
check(style.includes("thead{display:table-header-group}"),
  "W1 a table that spans pages repeats its header — otherwise the next page's numbers mean nothing");
check(/figure\{[^}]*break-inside:avoid/.test(style), "W1 a figure is not cut in half");
check(style.includes("@media print") && style.includes(".tail{display:none}"),
  "W1 the on-screen footnote does not print — it is advice, not part of the report");

// W2: 글꼴. 맑은 고딕만 적으면 맥에서는 아무 글꼴로나 떨어진다.
check(/Noto Sans KR/.test(style) && /Apple SD Gothic Neo/.test(style) && /Malgun Gothic/.test(style),
  "W2 the font stack covers Windows and Mac");
check(style.includes("word-break:keep-all"), "W2 한글은 낱말 가운데서 끊기지 않는다");

// W3: 표지. 제출물에는 무엇을 누가 언제 냈는지가 있어야 한다.
check(fn.includes('["과목"') && fn.includes('["학년"') && fn.includes('["학교"'), "W3 the cover carries 과목·학년·학교");
check(fn.includes('["작성일"'), "W3 and the date it was made");
check(fn.includes('["이름", \'<span class="write-in"></span>\']'),
  "W3 이름은 손으로 적는 줄이다 — 우리는 모델에 이름을 보내지 않으므로 알지 못한다");
check(fn.includes("filter(pair => pair[1])"), "W3 a fact we do not have leaves no empty row");
check(style.includes(".write-in{border-bottom:1px solid"), "W3 and that line is actually a line to write on");

// W4: 수행평가 안내문은 표지에 없다. 긴 안내문이면 표지가 글 덩어리가 된다.
check(fn.includes('<div class="task"><b>수행평가 안내문</b>'), "W4 the task sits in its own block before the body");
check(fn.includes("task.slice(0, 1200)"), "W4 and a very long one is trimmed rather than swallowing the page");
check(!/metadata/.test(fn.split("const html =")[0].split("const facts")[1] || ""),
  "W4 the cover is built from named facts, not from the joined metadata line");

// W5: 미리보기가 같은 규칙을 꺼내 쓴다. 다시 적으면 미리보기가 실제와 갈라지고 볼 이유가 없어진다.
check(preview.includes('wantDownload ? "DOWNLOAD_STYLE" : "MINI_STYLE"'),
  "W5 the preview reads the real rules out of the bridge");
check(preview.includes("--download"), "W5 and can draw the submitted file, not just the screen");
check(!/@page|table-header-group/.test(preview.replace(/^.*보고서 화면을.*$/m, "")),
  "W5 the preview never restates a rule of its own");

// W6: 밖에서 아무것도 안 불러온다. 학생 기기에서 열리는 파일이고, 인터넷이 없을 수도 있다.
check(!/https?:\/\//.test(style), "W6 the submitted file loads no font or stylesheet from the internet");
check(!/<script/i.test(fn), "W6 and carries no script");

console.log(`PASS download document: ${passed}/${passed}`);
