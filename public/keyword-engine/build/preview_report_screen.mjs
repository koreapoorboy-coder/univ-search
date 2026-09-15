// 보고서 결과 화면을 돈 안 쓰고 본다.
//
// 결과 화면을 한 번 보려면 보고서를 한 편 만들어야 했다 — ₩250, 5분. 그래서 디자인을 손볼 때마다 돈이 들었다.
// 이제 report_outputs에 진짜 보고서가 쌓여 있으므로, 그중 하나를 브리지의 실제 렌더 코드에 그대로 먹인다.
//
//   node public/keyword-engine/build/preview_report_screen.mjs <저장해둔 report_outputs 한 줄.json> [나올 html]
//
// 만들어진 html을 브라우저로 열면 학생이 보는 화면과 같은 것이 나온다.
import { readFile, writeFile } from "node:fs/promises";

const [, , rowPath, outPath = "report_screen_preview.html"] = process.argv;
if (!rowPath) {
  console.error("쓰는 법: node preview_report_screen.mjs <report_outputs 한 줄.json> [나올 html]");
  process.exit(1);
}

const row = JSON.parse(await readFile(rowPath, "utf8"));
const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");

// 브리지는 브라우저용 한 덩어리다. 화면 규칙(MINI_STYLE)만 꺼내 미리보기에 그대로 붙인다 — 규칙을 다시
// 적으면 미리보기가 실제 화면과 갈라지고, 그러면 볼 이유가 없다.
const styleBlock = bridge.match(/const MINI_STYLE = \[([\s\S]*?)\n\s*\]\.join\("\\n"\);/);
if (!styleBlock) throw new Error("MINI_STYLE을 브리지에서 찾지 못했습니다. 이름이 바뀌었는지 확인하세요.");
const css = styleBlock[1]
  .split("\n")
  .map((line) => line.trim().replace(/^"/, "").replace(/",?$/, ""))
  .join("\n")
  .replace(/\\"/g, '"');

const sections = JSON.parse(row.body_json || "[]").filter((s) => !/^(reportStage|sectionTitles|figuresAfterSection)$/.test(s.key));
const draft = String(row.record_draft || "").split("\n").filter(Boolean);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const para = (text) => String(text).split(/\n{2,}/).map((block) => `<p>${esc(block).replace(/\n/g, "<br>")}</p>`).join("");

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
    <div class="mini-v43-grid">
      ${sections.map((s, at) => `<section class="mini-report-section">
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
console.log(`만들었습니다: ${outPath}`);
console.log(`절 ${sections.length}개 · 생기부 초안 ${draft.length}줄 · 글자 ${sections.reduce((n, s) => n + s.text.length, 0)}자`);
