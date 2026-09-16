// 책에 붙은 과목 태그가 거짓말을 하지 않는가.
//
// 화학 반응식 보고서에 「국화와 칼」이 추천됐다. 원인은 점수 규칙이 아니라 데이터였다 — 그 책에 **화학**이
// 붙어 있었다. 기준 점수를 올려 증상만 가렸던 적이 있으므로, 여기서는 데이터 자체를 지킨다.
//
// 판정은 tools/audit_book_subjects.mjs 와 같은 규칙이다: 책이 손으로 붙인 태그가 그 과목의 교육과정
// 어휘와 닿아야 한다. 새 책을 넣을 때 이 시험이 먼저 걸린다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const books = JSON.parse(await readFile(here("../seed/book-engine/mini_book_engine_books_starter.json"), "utf8"));
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((word) => word.length >= 2);
const norm = (value) => String(value || "").replace(/\s+/g, "").replace(/\d+$/, "");

const vocab = new Map();
for (const axis of Object.values(axisIndex.axes || {})) {
  const bag = vocab.get(axis.subject) || new Set();
  for (const text of [axis.concept, axis.title, axis.output, axis.why]) for (const word of words(text)) bag.add(word);
  vocab.set(axis.subject, bag);
}
const spread = new Map();
for (const bag of vocab.values()) for (const word of bag) spread.set(word, (spread.get(word) || 0) + 1);
const telling = (word) => (spread.get(word) || 0) > 0 && spread.get(word) <= 3;
const subjects = [...vocab.keys()];
const subjectFor = (tag) => subjects.find((mine) => {
  const a = norm(mine); const b = norm(tag);
  return a && b && b.length >= 2 && (a === b || a.startsWith(b) || b.startsWith(a));
});
const touches = (word, bag, subject) => {
  const own = norm(subject);
  const bare = (one) => norm(one) === own || own.includes(norm(one)) || norm(one).includes(own);
  if (bare(word)) return null;
  if (bag.has(word) && telling(word)) return word;
  for (const mine of bag) {
    if (mine.length < 2 || !telling(mine) || bare(mine)) continue;
    if (word.includes(mine) || mine.includes(word)) return mine;
  }
  return null;
};
const bookWords = (book) => new Set([
  ...(book.connectable_concepts || []), ...(book.core_keywords || []), ...(book.fit_keywords || []),
  book.broad_theme,
].flatMap(words));

// B1: 우리 과목이 붙은 책은 모두 그 과목의 말을 한다.
{
  const bad = [];
  for (const book of books) {
    const mine = bookWords(book);
    for (const field of ["linked_subjects", "related_subjects_highschool"]) {
      for (const tag of book[field] || []) {
        const subject = subjectFor(tag);
        if (!subject) continue;                       // 우리 과목이 아니면 따지지 않는다
        if (![...mine].some((word) => touches(word, vocab.get(subject), subject))) bad.push(`${book.title}→${subject}`);
      }
    }
  }
  check(bad.length === 0, `B1 ${books.length}권의 과목 태그가 모두 교육과정 어휘와 닿는다`, bad.slice(0, 6).join(", "));
}

// B2: 발단이 된 그 한 권. 문학책에 화학이 다시 붙으면 여기서 걸린다.
{
  const one = books.find((book) => book.title === "국화와 칼");
  check(!!one, "B2 「국화와 칼」이 아직 corpus에 있다");
  const tags = [...(one.linked_subjects || []), ...(one.related_subjects_highschool || [])];
  check(!tags.some((tag) => subjectFor(tag) === "화학"), "B2 그리고 화학이 붙어 있지 않다", tags.join(","));
}

// B3: 뗀 기록이 남아 있다 — 나중에 "이 책에 왜 화학이 없지"에 답해야 한다.
{
  const record = JSON.parse(await readFile(here("../seed/book-engine/removed_subject_tags.v1.json"), "utf8"));
  check(Boolean(record.rule && record.why), "B3 무엇을 왜 뗐는지 적혀 있다");
  const dropped = (record.subjects || []).reduce((n, at) => n + at.dropped.length, 0);
  check(dropped > 0, "B3 뗀 목록이 비어 있지 않다", String(dropped));
}

console.log(`PASS book subject tags: ${passed}/${passed}`);
