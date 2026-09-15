// 보고서 화면을 돈 안 쓰고 본다.
//
// 결과 화면을 한 번 보려면 보고서를 한 편 만들어야 했다 — ₩250, 5분. 그래서 디자인을 손볼 때마다 돈이 들었다.
// 이제 report_outputs에 진짜 보고서가 쌓여 있으므로, 그중 하나를 브리지의 실제 화면 규칙에 그대로 먹인다.
//
//   node public/keyword-engine/build/preview_report_screen.mjs <report_outputs 한 줄.json> [나올.html] [--download]
//
// --download 를 붙이면 화면이 아니라 **학생이 눌러서 제출하는 파일**을 그린다. 선생님이 실제로 읽는 쪽이다.
//
// 규칙은 브리지에서 꺼내 쓴다(MINI_STYLE / DOWNLOAD_STYLE). 여기에 다시 적으면 미리보기가 실제와 갈라지고,
// 그러면 볼 이유가 없어진다.
import { readFile, writeFile } from "node:fs/promises";

const wantDownload = process.argv.includes("--download");
const args = process.argv.slice(2).filter((a) => a !== "--download");
const [rowPath, outPath = wantDownload ? "report_download_preview.html" : "report_screen_preview.html"] = args;
if (!rowPath) {
  console.error("쓰는 법: node preview_report_screen.mjs <report_outputs 한 줄.json> [나올.html] [--download]");
  process.exit(1);
}

const row = JSON.parse(await readFile(rowPath, "utf8"));
const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");

const NAME = wantDownload ? "DOWNLOAD_STYLE" : "MINI_STYLE";
const opened = bridge.indexOf(`const ${NAME} = [`);
if (opened < 0) throw new Error(`${NAME}을 브리지에서 찾지 못했습니다. 이름이 바뀌었는지 확인하세요.`);
const closed = bridge.indexOf("].join(", opened);
const css = bridge
  .slice(opened + `const ${NAME} = [`.length, closed)
  .split("\n")
  .filter((line) => !/^\s*\/\//.test(line))
  .map((line) => line.trim().replace(/^\+\s*/, "").replace(/^['"]/, "").replace(/['"],?$/, ""))
  .join(wantDownload ? "" : "\n")
  .replace(/\\"/g, '"');

const SKIP = /^(reportStage|sectionTitles|figuresAfterSection)$/;
const sections = JSON.parse(row.body_json || "[]").filter((s) => !SKIP.test(s.key));
const draft = String(row.record_draft || "").split("\n").filter(Boolean);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const para = (text) => String(text).split(/\n{2,}/).map((block) => `<p>${esc(block).replace(/\n/g, "<br>")}</p>`).join("");
const count = () => `절 ${sections.length}개 · 글자 ${sections.reduce((n, s) => n + s.text.length, 0)}자`;

if (wantDownload) {
  const at = new Date();
  const today = `${at.getFullYear()}년 ${at.getMonth() + 1}월 ${at.getDate()}일`;
  const facts = [
    ["과목", esc(row.subject)],
    ["학년", esc(row.grade)],
    ["학교", esc(row.school_name)],
    ["이름", '<span class="write-in"></span>'],
    ["작성일", esc(today)],
  ].filter((pair) => pair[1]);
  const task = String(row.task_description || "").trim();
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(row.title)}</title><style>${css}</style></head><body>
<div class="cover"><h1>${esc(row.title)}</h1><dl>${facts.map((p) => `<dt>${p[0]}</dt><dd>${p[1]}</dd>`).join("")}</dl></div>
${task ? `<div class="task"><b>수행평가 안내문</b>${esc(task.slice(0, 1200))}</div>` : ""}
${sections.map((sec, index) => `<section><h2>${index + 1}. ${esc(sec.key)}</h2>${para(sec.text)}</section>`).join("")}
<div class="tail">이 파일은 브라우저에서 바로 인쇄하거나 PDF로 저장할 수 있습니다. 제출 전에 한 번 읽고 직접 다듬어 주세요.</div>
</body></html>`;
  await writeFile(outPath, html, "utf8");
  console.log(`만들었습니다(제출본): ${outPath}`);
  console.log(count());
} else {
  const tags = [row.subject, row.concept, row.keyword].filter(Boolean);
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>결과 화면 미리보기 · ${esc(row.subject || "")}</title>
<link rel="stylesheet" href="../assets/keyword_engine.css">
<style>${css}</style>
<style>body{padding:24px 16px;background:linear-gradient(180deg,#f7faff,#f3f6fb)}
.preview-note{max-width:980px;margin:0 auto 14px;font:13px/1.6 -apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif;color:#667085}
#miniRoot{max-width:980px;margin:0 auto}</style>
</head><body>
<p class="preview-note">결과 화면 미리보기 — D1에 저장된 실제 보고서(${esc(row.report_id || "")})를 브리지의 화면 규칙으로 그린 것입니다. 돈은 들지 않습니다.</p>
<div id="miniRoot">
  <section class="mini-v43-result">
    <div class="mini-v43-head">
      <div>
        <div class="mini-v43-kicker">2단계 · 최종 보고서</div>
        <h2 class="mini-v43-title">${esc(row.title)}</h2>
        <p class="mini-v43-sub">학생이 넣은 값으로 완성한 보고서입니다. 제출 전에 한 번 읽고 다듬어 주세요.</p>
      </div>
      <div class="mini-v43-actions">
        <button type="button">결과 복사</button>
        <button type="button" class="secondary">결과 다운로드</button>
      </div>
    </div>
    <div class="mini-v43-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    ${sections.length >= 5 ? `<nav class="mini-toc" aria-label="보고서 차례"><b>차례</b><div>${sections.map((sec, at) => `<a href="#miniSec${at + 1}" data-mini-toc="${at + 1}"><i>${at + 1}</i>${esc(sec.key)}</a>`).join("")}</div></nav>` : ""}
    <div class="mini-v43-grid">
      ${sections.map((s, at) => `<section class="mini-report-section" id="miniSec${at + 1}">
        <h3><span>${at + 1}</span>${esc(s.key)}</h3>
        <div class="mini-report-section-body">${para(s.text)}</div>
      </section>`).join("")}
    </div>
    ${draft.length ? `<section class="mini-record">
      <div class="mini-record-head"><h3>생활기록부에 적을 문장</h3>
        <button type="button" class="secondary">복사</button></div>
      <p class="mini-record-note">제출하는 보고서에는 들어가지 않아요. 선생님께 전할 재료입니다.</p>
      <ul>${draft.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
    </section>` : ""}
  </section>
</div>
</body></html>`;
  await writeFile(outPath, html, "utf8");
  console.log(`만들었습니다(화면): ${outPath}`);
  console.log(`${count()} · 생기부 초안 ${draft.length}줄`);
}
