// 원래 있던 210권의 잘못된 태그를 지운다.
//
// 붙을 수 있는 모든 경우를 전수로 읽다가 나온 것들이다. 학생은 책을 안 읽으므로 잘못 붙어도 모르고
// 넘어가고, 그게 그대로 생활기록부에 남는다. 그래서 눈으로 찾아 손으로 지운다.
//
// **지우기만 한다.** 없는 것을 새로 붙이지 않는다 — 우리가 안 읽은 책에 내용을 더하는 셈이 된다.
// 무엇을 왜 지웠는지는 tools/fix_book_tags_2026_09.json 에 적혀 있다.
//
//   node tools/fix_book_tags.mjs           — 무엇이 지워지는지만 보여 준다
//   node tools/fix_book_tags.mjs --write   — 실제로 지운다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const source = JSON.parse(await readFile(here("fix_book_tags_2026_09.json"), "utf8"));
const bookPath = here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json");
const raw = JSON.parse(await readFile(bookPath, "utf8"));

const norm = (value) => String(value || "").replace(/\s+/g, "").replace(/\d+$/, "");
const WORD_FIELDS = ["core_keywords", "fit_keywords", "connectable_concepts", "broad_theme"];
const SUBJECT_FIELDS = ["linked_subjects", "related_subjects_highschool"];

let touched = 0;
for (const fix of source.fixes) {
  const book = raw.find((one) => String(one.title || "").trim() === fix.title);
  if (!book) { console.log(`  못 찾음: ${fix.title}`); continue; }
  const gone = [];
  for (const word of fix.drop_words || []) {
    for (const field of WORD_FIELDS) {
      const before = book[field];
      if (!Array.isArray(before)) continue;
      // 그 낱말만 지운다. '효소와 대사 반응' 같은 구절 안의 낱말은 건드리지 않는다 — 구절은 그 자체로 뜻이 있다.
      const after = before.filter((one) => String(one).trim() !== word);
      if (after.length !== before.length) { gone.push(`${field}:${word}`); if (process.argv.includes("--write")) book[field] = after; }
    }
  }
  // 개념 태그는 구절이라 낱말 지우기로는 안 된다. 통째로 뺀다.
  for (const concept of fix.drop_concepts || []) {
    const before = book.connectable_concepts;
    if (!Array.isArray(before)) continue;
    const after = before.filter((one) => String(one).replace(/\s+/g, "") !== String(concept).replace(/\s+/g, ""));
    if (after.length !== before.length) { gone.push(`개념:${concept}`); if (process.argv.includes("--write")) book.connectable_concepts = after; }
  }
  for (const subject of fix.drop_subjects || []) {
    for (const field of SUBJECT_FIELDS) {
      const before = book[field];
      if (!Array.isArray(before)) continue;
      const after = before.filter((one) => norm(one) !== norm(subject));
      if (after.length !== before.length) { gone.push(`${field}:${subject}`); if (process.argv.includes("--write")) book[field] = after; }
    }
  }
  // 지은이 표기 바로잡기. 지우기는 아니지만 생활기록부에 그대로 찍히는 이름이라 여기서 함께 고친다.
  if (fix.set_author && String(book.author || "").trim() !== fix.set_author) {
    gone.push(`지은이:${book.author} → ${fix.set_author}`);
    if (process.argv.includes("--write")) book.author = fix.set_author;
  }
  if (gone.length) touched++;
  console.log(`· ${fix.title} — ${gone.length ? gone.join(", ") : "(이미 없음)"}`);
  console.log(`    까닭: ${fix.why}`);
}

console.log(`\n${source.fixes.length}권 가운데 ${touched}권을 고칩니다.`);
if (process.argv.includes("--write")) {
  await writeFile(bookPath, JSON.stringify(raw, null, 2), "utf8");
  console.log("다시 썼습니다. tools/build_book_match_index.mjs 로 인덱스를 다시 만드세요.");
} else {
  console.log("(보여 주기만 했습니다. 지우려면 --write 를 붙이세요.)");
}

// 파이프라인 차례 (이 차례를 지켜야 같은 결과가 나온다):
//   1. git checkout -- public/keyword-engine/seed/book-engine/   원본으로 되돌린다
//   2. node tools/add_books_2026_09.mjs --write                  우리가 넣은 책을 넣고 고쳐 쓴다
//   3. node tools/fix_book_tags.mjs --write                      옛 210권의 틀린 태그를 지운다
//   4. node tools/apply_book_blurbs.mjs --write                  쉬운 말 한 줄 소개를 단다
//   5. node tools/audit_book_subjects.mjs --write                교육과정과 안 닿는 과목 태그를 뗀다
//   6. node tools/build_book_match_index.mjs                     인덱스를 다시 만든다
