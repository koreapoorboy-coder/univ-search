// 붙을 수 있는 **모든 경우**를 다 세워 놓고 두 가지를 본다. AI를 쓰지 않으므로 ₩0이다.
//
// 책이 잘못 붙으면 보고서 한 편이 통째로 틀어진다. 그래서 표본이 아니라 전수로 본다.
//
//   **연결성** — 이 책이 이 개념에 정말 닿는가.
//       개념 이름에서 온 낱말로 걸렸는가(강), 산출물·축 이름에서 온 낱말로 걸렸는가(약).
//       근거 낱말이 하나뿐인가 둘 이상인가. 책이 이 과목을 직접 달고 있는가.
//
//   **구조성** — 보고서에 **실제로 쓸 것이 있는가.**
//       이게 여태 안 본 자리다. 책은 **태그**로 고르는데, 보고서에 들어가는 것은 **내용 조각**이다.
//       태그는 맞는데 내용 조각이 이 개념과 아무 상관이 없으면, 학생은 개념과 무관한 문장을 이론적
//       배경에 인용하게 된다. 그게 보고서가 틀어지는 경로다.
//
//   node public/keyword-engine/build/audit_book_fit_all.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";
import { buildConceptCounts, buildMajorCounts, buildWordCounts, matchBooks, wantsBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const books = JSON.parse(await readFile(here("../seed/engine-index/book_match_index.v1.json"), "utf8")).books;
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const byTitle = new Map(books.map((one) => [one.title, one]));

const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
const norm = (value) => String(value || "").replace(/\s+/g, "").replace(/\d+$/, "");
const counts = buildWordCounts(books);
const conceptCounts = buildConceptCounts(axisIndex);
const majorCounts = buildMajorCounts(books);

// 개념을 가리키는 말. 한 낱말이 몇 개념에 나오는지로 '이 개념만의 말'을 가려낸다.
const spread = new Map();
const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!wantsBooks(axis.subject)) continue;
  rows.push(axis);
  for (const word of new Set([...words(axis.concept), ...words(axis.title), ...words(axis.output)])) {
    spread.set(word, (spread.get(word) || 0) + 1);
  }
}
// 이 개념을 실제로 가리키는 말 — 개념 이름과 산출물에서 오되, 20개 넘는 개념에 나오면 아무것도 못 가린다.
const pointing = (axis) => new Set(
  [...words(axis.concept), ...words(axis.output), ...words(axis.title)]
    .filter((word) => (spread.get(word) || 0) <= 20 && norm(word) !== norm(axis.subject)),
);

// 한쪽이 다른 쪽을 품으면 닿은 것으로 친다 — 효소가 ⊃ 효소, 반응식 ⊃ 반응.
const touchesAim = (word, aim) => {
  if (aim.has(word)) return true;
  for (const one of aim) {
    if (one.length < 2) continue;
    if (word.includes(one) || one.includes(word)) return true;
  }
  return false;
};

const audit = [];
for (const axis of rows) {
  const conceptWords = new Set(words(axis.concept));
  const aim = pointing(axis);
  const found = matchBooks(books, {
    subject: axis.subject, concept: axis.concept, axisTitle: axis.title,
    keyword: String(axis.output || "").split(/[,、·]/)[0].trim(),
  }, 6, counts, conceptCounts, majorCounts);
  for (const hit of found) {
    const book = byTitle.get(hit.title) || {};
    const why = hit.why || [];

    // 연결성
    const fromConcept = why.filter((word) => conceptWords.has(word));
    const namesConcept = (book.connectable_concepts || []).some((one) => norm(one) === norm(axis.concept));
    const ownsSubject = [...(book.linked_subjects || []), ...(book.related_subjects_highschool || [])]
      .some((one) => norm(one) === norm(axis.subject));
    let link = 0;
    if (namesConcept) link += 3;              // 이 개념을 손으로 지명해 뒀다
    if (fromConcept.length) link += 2;        // 개념 이름에서 온 말로 걸렸다
    if (why.length >= 2) link += 1;           // 근거가 하나가 아니다
    if (ownsSubject) link += 1;               // 이 과목을 정확히 달고 있다

    // 구조성 — 보고서에 들어갈 **내용 조각**이 이 개념을 건드리는가
    //
    // 낱말이 **같은지가 아니라 닿는지**를 본다. 개념은 "효소와 대사 반응"이라 쓰고 책의 문장은
    // "효소가 반응의 속도를…"이라 쓴다. 조사만 다른데 다른 말로 세면 멀쩡한 것을 위험이라 부르게 된다.
    // (책 과목 태그를 감사할 때 겪은 것과 같은 일이다.)
    const pieces = book.points || [];
    const touching = pieces.filter((one) => words(one).some((word) => touchesAim(word, aim)));
    const structure = !pieces.length ? 0 : touching.length >= 2 ? 3 : touching.length === 1 ? 2 : 0;

    audit.push({
      subject: axis.subject, concept: axis.concept, title: hit.title, author: hit.author,
      score: hit.score, why, link, structure, pieces: pieces.length, touching: touching.length,
      sample: touching[0] || pieces[0] || "",
    });
  }
}

const risky = audit.filter((one) => one.structure === 0);
const weak = audit.filter((one) => one.structure > 0 && one.link <= 1);
const solid = audit.filter((one) => one.structure >= 2 && one.link >= 2);

console.log(`붙을 수 있는 모든 경우 ${audit.length}가지 (개념 ${rows.length}개 · 수학 제외)\n`);
console.log(`  탄탄함  (연결도 되고 쓸 내용도 있음):  ${solid.length}가지 (${Math.round(solid.length / audit.length * 100)}%)`);
console.log(`  약함    (쓸 내용은 있으나 근거가 얇음): ${weak.length}가지`);
console.log(`  위험    (보고서에 쓸 내용이 없음):      ${risky.length}가지 (${Math.round(risky.length / audit.length * 100)}%)\n`);

console.log("■ 위험 — 태그로는 걸렸는데 **보고서에 인용할 내용이 이 개념과 무관하다**");
console.log("   (학생이 이 책을 고르면 이론적 배경에 엉뚱한 문장이 들어간다)\n");
for (const one of risky.slice(0, 30)) {
  console.log(`  ${one.subject} / ${one.concept}`);
  console.log(`    → ${one.title} (${one.score}점, 걸린 이유: ${one.why.join("·")})`);
  console.log(`       보고서에 들어갈 문장: ${String(one.sample).slice(0, 70)}`);
}
if (risky.length > 30) console.log(`  … 그리고 ${risky.length - 30}가지 더`);

console.log("\n■ 약함 — 쓸 내용은 있는데 걸린 근거가 낱말 하나뿐이다\n");
for (const one of weak.slice(0, 12)) {
  console.log(`  ${one.subject} / ${one.concept} → ${one.title} (${one.why.join("·")})`);
}
if (weak.length > 12) console.log(`  … 그리고 ${weak.length - 12}가지 더`);

const out = process.argv[2];
if (out) {
  const e = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const card = (one, kind) => `<div class="card ${kind}"><div class=h><b>${e(one.title)}</b> <i>${e(one.author)}</i>
    <span>${one.score}점 · ${e(one.why.join("·"))}</span></div>
    <div class=c>${e(one.subject)} / ${e(one.concept)}</div>
    <div class=p>보고서에 들어갈 문장: ${e(String(one.sample).slice(0, 110)) || "(없음)"}</div></div>`;
  await writeFile(out, `<!doctype html><meta charset=utf-8><title>책이 잘못 붙을 수 있는 자리</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--red:#c0392b;--amber:#b7791f;--ok:#2d7a4f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 28px;font-size:14px}
h2{font-size:17px;margin:36px 0 6px;padding-top:20px;border-top:1px solid var(--line)}
p{margin:0 0 12px}.note{color:var(--dim);font-size:13.5px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;align-items:baseline}
.big{font-size:30px;font-weight:700;letter-spacing:-.5px}
.card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:11px 14px;margin:0 0 8px}
.card.risky{border-left-color:var(--red)}.card.weak{border-left-color:var(--amber)}
.card .h{font-size:14px}.card .h i{font-style:normal;color:var(--dim);font-size:12.5px}
.card .h span{float:right;color:var(--dim);font-size:12px}
.card .c{color:var(--dim);font-size:12.5px;margin:1px 0 5px}
.card .p{font-size:13px;color:#4b5563;background:#f7f8fa;border-radius:6px;padding:6px 9px}
</style><div class=wrap>
<h1>책이 잘못 붙을 수 있는 자리를 전수로 봤습니다</h1>
<p class=sub>붙을 수 있는 모든 경우 ${audit.length}가지 · 개념 ${rows.length}개 · 수학 제외 · AI를 쓰지 않았습니다 (₩0)</p>
<div class=box>
<div><span class=big style="color:var(--ok)">${solid.length}</span><div class=note>탄탄함</div></div>
<div><span class=big style="color:var(--amber)">${weak.length}</span><div class=note>약함</div></div>
<div><span class=big style="color:var(--red)">${risky.length}</span><div class=note>위험</div></div></div>
<p><b>구조성</b>이 핵심입니다. 책은 <b>태그</b>로 고르는데 보고서에 들어가는 것은 <b>내용 조각</b>입니다.
둘이 어긋나면 학생이 이론적 배경에 개념과 무관한 문장을 인용하게 됩니다 — 보고서가 틀어지는 경로입니다.</p>
<h2>위험 ${risky.length}가지 <span class=note>보고서에 쓸 내용이 이 개념과 무관합니다</span></h2>
${risky.map((one) => card(one, "risky")).join("\n")}
<h2>약함 ${weak.length}가지 <span class=note>쓸 내용은 있는데 걸린 근거가 낱말 하나뿐입니다</span></h2>
${weak.map((one) => card(one, "weak")).join("\n")}
</div>`, "utf8");
  console.log(`\n${out}`);
}
