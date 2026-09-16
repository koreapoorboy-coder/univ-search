// 붙이기 전에 잰다. 책을 붙이면 무조건 붙이려 든다는 걱정이 맞는지, 실제 데이터로 확인한다.
//
//   node public/keyword-engine/build/measure_book_match.mjs [--all]
//
// AI를 쓰지 않으므로 ₩0이다.
import { readFile } from "node:fs/promises";
import { buildWordCounts, matchBooks, MIN_SCORE } from "../../../admission_worker_skeleton/book_match_v1.mjs";

const books = Object.values(JSON.parse(await readFile(new URL("../seed/book-engine/mini_book_engine_books_starter.json", import.meta.url), "utf8")));
const axisIndex = JSON.parse(await readFile(new URL("../seed/engine-index/longitudinal_axis_index.v1.json", import.meta.url), "utf8"));

// 진짜 과목·개념 쌍을 축 인덱스에서 꺼낸다. 162개 개념이 우리가 실제로 다루는 전부다.
const cases = [];
const seen = new Set();
for (const [axisId, axis] of Object.entries(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  cases.push({ subject: axis.subject, concept: axis.concept, axisTitle: axis.title, keyword: (axis.output || "").split(/[,、·]/)[0].trim(), axisId });
}

const counts = buildWordCounts(books);
const rows = cases.map((one) => ({ ...one, found: matchBooks(books, one, 3, counts) }));
const withBooks = rows.filter((r) => r.found.length);
const bySubject = new Map();
for (const row of rows) {
  const at = bySubject.get(row.subject) || { total: 0, hit: 0, books: 0 };
  at.total += 1;
  if (row.found.length) { at.hit += 1; at.books += row.found.length; }
  bySubject.set(row.subject, at);
}

console.log(`책 ${books.length}권 · 과목·개념 ${rows.length}쌍 · 기준 점수 ${MIN_SCORE}점\n`);
console.log("과목별 — 몇 개념에서 책이 나왔나");
const sorted = [...bySubject.entries()].sort((a, b) => (b[1].hit / b[1].total) - (a[1].hit / a[1].total) || b[1].total - a[1].total);
for (const [subject, at] of sorted) {
  const rate = Math.round((at.hit / at.total) * 100);
  const bar = "█".repeat(Math.round(rate / 5)).padEnd(20, "·");
  console.log(`  ${subject.padEnd(14)} ${bar} ${String(rate).padStart(3)}%  (${at.hit}/${at.total} 개념, 책 ${at.books}권)`);
}

const hitRate = Math.round((withBooks.length / rows.length) * 100);
console.log(`\n전체: ${withBooks.length}/${rows.length} 개념에서 책이 나옴 (${hitRate}%)`);
console.log(`0권인 개념: ${rows.length - withBooks.length}개 — 억지로 채우지 않은 자리다\n`);

console.log("실제로 나온 추천 — 억지인지 봐 주세요");
const show = process.argv.includes("--all") ? withBooks : withBooks.slice(0, 18);
for (const row of show) {
  console.log(`\n· ${row.subject} / ${row.concept}`);
  for (const book of row.found) {
    console.log(`    ${String(book.score).padStart(2)}점  ${book.title} (${book.author})`);
    console.log(`          걸린 이유: ${book.why.join(" + ") || "과목만"}`);
  }
}

// 가장 낮은 점수로 걸린 것들 — 기준을 올릴지 판단할 재료다.
const edge = withBooks.flatMap((r) => r.found.map((b) => ({ ...b, at: `${r.subject} / ${r.concept}` })))
  .sort((a, b) => a.score - b.score).slice(0, 10);
console.log("\n가장 아슬아슬하게 걸린 것들 (기준을 올리면 이것부터 떨어집니다)");
for (const one of edge) console.log(`  ${one.score}점  ${one.at}  →  ${one.title}  (${one.why.join(" + ")})`);
