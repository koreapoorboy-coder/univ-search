// 실제 수행평가 전부에 책을 붙여 본다. 모의다. AI를 쓰지 않으므로 ₩0이다.
//
// 화면에서 몇 개만 눌러 보는 것으로는 억지가 안 보인다. 우리가 가진 진짜 과제 기록 전부에 붙여 봐야
// "어느 과목에서 안 붙는가", "어떤 억지가 남았는가"가 한눈에 보인다.
//
// **학교 이름은 읽지도 찍지도 않는다.** 과제 기록에 들어 있지만 우리 작업에 쓸 이유가 없다.
//
// 개념은 실제로는 학생이 화면에서 고른다. 여기서는 과제 문구(제목·설명·채점 요소)와 가장 많이 겹치는
// 개념을 대신 고른다 — 학생이 고를 법한 자리다.
//
//   node public/keyword-engine/build/simulate_book_on_tasks.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";
import { buildConceptCounts, buildMajorCounts, buildWordCounts, matchBooks, wantsBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const books = JSON.parse(await readFile(here("../seed/engine-index/book_match_index.v1.json"), "utf8")).books;
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const lines = (await readFile(here("../data/assessment/records/assessment_tasks.v1.json"), "utf8")).split("\n");

const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
// 학교가 적은 과목 이름은 우리 것과 조금씩 다르다 — '물리학'·'화학Ⅱ'·'생명과학Ⅰ'. 로마 숫자도 떼어 낸다.
const norm = (value) => String(value || "").replace(/\s+/g, "").replace(/[ⅠⅡⅢIVX\d]+$/, "");
// 책 고르는 쪽(book_match_v1)과 같은 규칙으로 과목을 맞춘다. 거기서는 '물리학'이 '물리'에 붙는다.
const subjectSame = (mine, theirs) => {
  const a = norm(mine); const b = norm(theirs);
  return a && b && a.length > 1 && b.length > 1 && (a === b || a.startsWith(b) || b.startsWith(a));
};

// 과목마다 개념 목록. 실제로 학생이 고르는 자리다.
const bySubject = new Map();
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const at = bySubject.get(norm(axis.subject)) || [];
  at.push({ subject: axis.subject, concept: axis.concept, title: axis.title, output: axis.output,
    bag: new Set([...words(axis.concept), ...words(axis.title), ...words(axis.output)]) });
  bySubject.set(norm(axis.subject), at);
}

const counts = buildWordCounts(books);
const conceptCounts = buildConceptCounts(axisIndex);
const majorCounts = buildMajorCounts(books);

// 과제 하나가 어느 개념에 서는가. 문구와 가장 많이 겹치는 개념을 고른다.
function subjectKey(subject) {
  if (bySubject.has(norm(subject))) return norm(subject);
  for (const key of bySubject.keys()) if (subjectSame(subject, key)) return key;
  return null;
}

function conceptFor(subject, text) {
  const key = subjectKey(subject);
  const list = key ? bySubject.get(key) : null;
  if (!list) return null;
  const mine = new Set(words(text));
  let best = null;
  for (const one of list) {
    let hit = 0;
    for (const word of mine) if (one.bag.has(word)) hit++;
    if (!best || hit > best.hit) best = { ...one, hit };
  }
  return best;
}

const tasks = [];
for (const line of lines) {
  const text = line.trim();
  if (!text) continue;
  let row;
  try { row = JSON.parse(text); } catch { continue; }
  // 학교 이름은 여기서 버린다. 뒤로 넘기지 않는다.
  tasks.push({
    subject: row.subject_raw || row.subject_standard || "",
    title: row.raw_task_title || "",
    desc: row.raw_task_desc || "",
    rubric: (row.raw_rubric_elements || []).join(" "),
  });
}

const bySubjectReport = new Map();
// 책이 없는데 실제 과제가 많이 서는 개념. 다음에 책을 넣을 자리가 바로 여기다.
const emptyHot = new Map();
const samples = [];
let n = 0, gotBooks = 0, noSubject = 0, mathOff = 0, noConcept = 0, noBook = 0;
for (const task of tasks) {
  n++;
  if (!wantsBooks(task.subject)) { mathOff++; continue; }
  if (!subjectKey(task.subject)) { noSubject++; continue; }
  const axis = conceptFor(task.subject, `${task.title} ${task.desc} ${task.rubric}`);
  if (!axis || !axis.hit) { noConcept++; continue; }
  const found = matchBooks(books, {
    subject: axis.subject, concept: axis.concept, axisTitle: axis.title,
    keyword: String(axis.output || "").split(/[,、·]/)[0].trim(),
  }, 6, counts, conceptCounts, majorCounts);
  const at = bySubjectReport.get(axis.subject) || { total: 0, hit: 0, books: 0 };
  at.total++;
  if (found.length) { at.hit++; at.books += found.length; gotBooks++; } else {
    noBook++;
    const key = `${axis.subject} / ${axis.concept}`;
    emptyHot.set(key, (emptyHot.get(key) || 0) + 1);
  }
  bySubjectReport.set(axis.subject, at);
  if (found.length && samples.length < 40 && Math.random() < 0.06) {
    samples.push({ subject: axis.subject, concept: axis.concept, title: task.title, desc: task.desc.slice(0, 90), found });
  }
}

const usable = n - mathOff - noSubject;
console.log(`실제 수행평가 ${n}건에 책을 붙여 봤습니다 (학교 이름은 읽지 않았습니다)\n`);
console.log(`  우리 과목 목록에 없는 과목:  ${noSubject}건`);
console.log(`  수학이라 일부러 안 붙임:     ${mathOff}건`);
console.log(`  ─────────────────────────────`);
console.log(`  붙일 수 있는 과제:           ${usable}건`);
console.log(`    책이 나온 과제:            ${gotBooks}건 (${Math.round(gotBooks / usable * 100)}%)`);
console.log(`    개념을 못 고른 과제:       ${noConcept}건`);
console.log(`    개념은 섰지만 책이 없음:   ${noBook}건\n`);

console.log("과목별 — 그 과목 과제 중 몇 %에 책이 붙나");
for (const [subject, at] of [...bySubjectReport.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const pct = Math.round(at.hit / at.total * 100);
  const bar = "█".repeat(Math.round(pct / 5)).padEnd(20, "·");
  console.log(`  ${subject.padEnd(12)} ${bar} ${String(pct).padStart(3)}%  (${at.hit}/${at.total}건)`);
}

console.log("\n책이 없는데 실제 과제가 많이 서는 개념 — 다음에 책을 넣을 자리");
for (const [key, count] of [...emptyHot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(count).padStart(3)}건  ${key}`);
}

// 붙은 모습을 눈으로 본다. 이게 이 도구의 진짜 목적이다.
console.log("\n실제로 이렇게 붙습니다 — 억지가 있는지 봐 주세요\n");
for (const one of samples.slice(0, 14)) {
  console.log(`· [${one.subject} / ${one.concept}] ${one.title}`);
  if (one.desc) console.log(`    과제: ${one.desc}`);
  for (const b of one.found.slice(0, 3)) console.log(`    → ${b.score}점 ${b.title} — ${b.summary || ""}`);
  console.log("");
}

const out = process.argv[2];
if (out) {
  const e = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rows = [...bySubjectReport.entries()].sort((a, b) => b[1].total - a[1].total);
  await writeFile(out, `<!doctype html><meta charset=utf-8><title>수행평가에 책 붙여 보기</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--blue:#4a6fa5;--red:#c0392b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 30px;font-size:14px}
h2{font-size:17px;margin:36px 0 12px;padding-top:20px;border-top:1px solid var(--line)}
p{margin:0 0 12px}.note{color:var(--dim);font-size:13.5px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--dim);font-weight:600;font-size:12.5px}td.n{text-align:right;font-variant-numeric:tabular-nums}
.bar{background:var(--line);height:7px;border-radius:4px;overflow:hidden;min-width:90px}.bar i{display:block;height:100%;background:var(--blue)}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;align-items:baseline}
.big{font-size:30px;font-weight:700;letter-spacing:-.5px}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:13px 16px;margin:0 0 10px}
.card b{font-size:14px}.card .q{color:var(--dim);font-size:13px;margin:2px 0 8px}
.card ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.8}
.card em{font-style:normal;color:var(--dim);font-size:12.5px}
</style><div class=wrap>
<h1>실제 수행평가 ${n}건에 책을 붙여 봤습니다</h1>
<p class=sub>우리가 가진 진짜 과제 기록 전부 · 모의 · AI를 쓰지 않았습니다 (₩0) · 학교 이름은 읽지 않았습니다</p>
<div class=box><div><span class=big>${Math.round(gotBooks / usable * 100)}%</span><div class=note>책이 붙는 과제</div></div>
<div><span class=big>${gotBooks}건</span><div class=note>붙일 수 있는 ${usable}건 중</div></div>
<div><span class=big>${mathOff}건</span><div class=note>수학이라 일부러 안 붙임</div></div></div>
<h2>과목별</h2>
<table><tr><th>과목</th><th class=n>과제</th><th class=n>책 붙음</th><th></th></tr>
${rows.map(([s, at]) => `<tr><td>${e(s)}</td><td class=n>${at.total}</td><td class=n>${Math.round(at.hit / at.total * 100)}%</td><td><div class=bar><i style="width:${Math.round(at.hit / at.total * 100)}%"></i></div></td></tr>`).join("\n")}
</table>
<h2>실제로 이렇게 붙습니다 <span class=note>(무작위로 고른 ${samples.length}건 — 억지가 있는지 봐 주세요)</span></h2>
${samples.map((one) => `<div class=card><b>${e(one.title)}</b>
<div class=q>${e(one.subject)} · ${e(one.concept)}${one.desc ? ` — ${e(one.desc)}` : ""}</div>
<ul>${one.found.slice(0, 4).map((b) => `<li>${e(b.title)} <em>${e(b.author)} · ${e(b.summary || "")}</em></li>`).join("")}</ul></div>`).join("\n")}
</div>`, "utf8");
  console.log(`\n${out}`);
}
