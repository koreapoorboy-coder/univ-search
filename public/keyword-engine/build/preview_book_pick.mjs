// 책 고르는 칸을 눈으로 본다. AI를 쓰지 않으므로 ₩0이다.
//
// 화면을 한 번 보려고 ₩250씩 태울 이유가 없다. 브리지 파일에서 **실제 renderBookPick 함수와 실제 CSS를
// 그대로 꺼내** 쓴다 — 베껴 쓰면 화면과 미리보기가 따로 놀기 시작한다.
//
//   node public/keyword-engine/build/preview_book_pick.mjs [과목] [개념] [진로] [나갈파일]
import { readFile, writeFile } from "node:fs/promises";
import { buildConceptCounts, buildMajorCounts, buildWordCounts, matchBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const bridgeSrc = await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8");
const books = JSON.parse(await readFile(here("../seed/engine-index/book_match_index.v1.json"), "utf8")).books;
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));

const [, , subject = "화학", concept = "원자의 구조", major = "화학공학과", out] = process.argv;

// 진짜 함수를 꺼낸다.
const cut = (from, to) => {
  const a = bridgeSrc.indexOf(from);
  const b = bridgeSrc.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`브리지에서 ${from} 를 못 찾았습니다`);
  return bridgeSrc.slice(a, b);
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// eslint-disable-next-line no-new-func
const renderBookPick = new Function("escapeHtml", `${cut("function renderBookPick(books){", "\n  // 고른 책을 자료 카드")}\n  return renderBookPick;`)(escapeHtml);

// 진짜 CSS를 꺼낸다. 브리지는 스타일을 따옴표 붙은 줄의 목록으로 들고 있다.
const css = cut('"        .mini-book-pick{', '"        .mini-card-slim{')
  .split("\n").map((line) => line.trim().replace(/^"/, "").replace(/",?$/, "")).join("\n");

const axis = Object.values(axisIndex.axes).find((one) => one.subject === subject && one.concept === concept)
  || Object.values(axisIndex.axes).find((one) => one.concept === concept);
if (!axis) throw new Error(`개념을 못 찾았습니다: ${subject} / ${concept}`);

const found = matchBooks(books, {
  subject, concept, major,
  keyword: String(axis.output || "").split(/[,\u3001\u00b7]/)[0].trim(), axisTitle: axis.title,
}, 3, buildWordCounts(books), buildConceptCounts(axisIndex), buildMajorCounts(books));

const path = out || `C:/Users/korea/Downloads/책_고르는_칸_미리보기.html`;
await writeFile(path, `<!doctype html><meta charset=utf-8><title>책 고르는 칸</title><style>
body{margin:0;background:#f4f6fb;font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif;color:#1f2937}
.page{max-width:720px;margin:0 auto;padding:36px 20px 70px}
.head{margin:0 0 6px;font-size:21px;font-weight:800}
.meta{color:#667085;font-size:13.5px;margin:0 0 26px}
.meta b{color:#2458ff}
.frame{background:#fff;border:1px solid #e6eaf2;border-radius:16px;padding:20px 22px}
${css}
</style><div class=page>
<p class=head>설계서 아래에 이렇게 붙습니다</p>
<p class=meta>${escapeHtml(subject)} · ${escapeHtml(concept)} · 진로 <b>${escapeHtml(major || "(안 적음)")}</b> — 책 ${found.length}권</p>
<div class=frame>${renderBookPick(found)}</div>
</div>`, "utf8");

console.log(`${subject} / ${concept} · 진로 ${major || "(없음)"} → ${found.length}권`);
for (const one of found) console.log(`  ${one.score}점  ${one.title} (${one.author})${one.forMajor ? ` [${one.forMajor}]` : ""}`);
console.log(`\n${path}`);
