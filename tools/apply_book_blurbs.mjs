// 책 소개를 쉬운 말 한 줄로 바꾼다.
//
// 학생은 책을 안 읽는다. 그러면 화면의 그 한 줄이 학생이 아는 전부다. 그런데 242권 중 91권의 소개가
// "~탐구를 확장하기 좋은 도서. 특히 ○○학과와 연결성이 높다" 같은 홍보문구였다. 그건 학과에 하는 말이지
// 학생에게 하는 말이 아니다.
//
// 원본(summary_short)은 건드리지 않고 `blurb`를 따로 단다 — 원본이 어땠는지 나중에 볼 수 있어야 한다.
// 인덱스는 blurb가 있으면 그것을 쓴다.
//
//   node tools/apply_book_blurbs.mjs           — 무엇이 바뀌는지만 보여 준다
//   node tools/apply_book_blurbs.mjs --write   — 실제로 단다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const source = JSON.parse(await readFile(here("book_blurbs_2026_09.json"), "utf8"));
const bookPath = here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json");
const raw = JSON.parse(await readFile(bookPath, "utf8"));

const LONG = 60;
const done = []; const missing = [];
for (const [title, blurb] of Object.entries(source.blurbs)) {
  const book = raw.find((one) => String(one.title || "").trim() === title);
  if (!book) { missing.push(title); continue; }
  done.push({ title, before: book.summary_short || "", after: blurb });
  if (process.argv.includes("--write")) book.blurb = blurb;
}

// 내용 조각까지 홍보문구가 잘려 들어간 책이 있다. 거르고 나면 한 줄도 안 남는 5권만 손으로 다시 썼다.
const points = [];
for (const [title, lines] of Object.entries(source.points || {})) {
  const book = raw.find((one) => String(one.title || "").trim() === title);
  if (!book) { missing.push(title + " (내용 조각)"); continue; }
  points.push({ title, before: (book.book_content_points || []).length, after: lines.length });
  if (process.argv.includes("--write")) book.book_content_points = lines;
}
console.log(`내용 조각을 다시 쓴 책 ${points.length}권: ${points.map((o) => o.title).join(", ")}`);

console.log(`한 줄 소개를 단 책 ${done.length}권` + (missing.length ? ` · 제목을 못 찾은 것 ${missing.length}권` : ""));
for (const one of missing) console.log(`  못 찾음: ${one}`);
const tooLong = done.filter((one) => one.after.length > LONG);
console.log(`\n${LONG}자를 넘는 줄: ${tooLong.length}개` + (tooLong.length ? ` — ${tooLong.map((o) => o.title).join(", ")}` : " (없음)"));
console.log(`평균 길이 ${Math.round(done.reduce((n, o) => n + o.after.length, 0) / done.length)}자 (전에는 ${Math.round(done.reduce((n, o) => n + o.before.length, 0) / done.length)}자)`);

console.log("\n바뀌는 모습 (앞 5권)");
for (const one of done.slice(0, 5)) {
  console.log(`\n· ${one.title}`);
  console.log(`   전: ${one.before.slice(0, 90)}`);
  console.log(`   후: ${one.after}`);
}

if (process.argv.includes("--write")) {
  await writeFile(bookPath, JSON.stringify(raw, null, 2), "utf8");
  console.log("\n다시 썼습니다. tools/build_book_match_index.mjs 로 인덱스를 다시 만드세요.");
} else {
  console.log("\n(보여 주기만 했습니다. 달려면 --write 를 붙이세요.)");
}
