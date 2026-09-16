// 책 210권에서 **고를 때 쓰는 것만** 남긴다.
//
// 원본은 779KB다. 줄거리·발문·학과 연결까지 들어 있는데, 추천을 고를 때 보는 것은 제목·지은이·과목·태그뿐이다.
// 워커가 보고서를 만들 때마다 779KB를 내려받아 파싱할 이유가 없다.
//
//   node tools/build_book_match_index.mjs
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const raw = JSON.parse(await readFile(here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json"), "utf8"));
const books = Object.values(raw);

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const list = (value, max = 40) => [...new Set((Array.isArray(value) ? value : []).map((one) => clean(one, max)).filter(Boolean))];

const out = books
  .filter((book) => clean(book?.title))
  .map((book) => ({
    title: clean(book.title, 120),
    author: clean(book.author, 60),
    // 화면에 한 줄로 보여 줄 만큼만. 원본 요약은 200자가 넘는다.
    summary: clean(book.summary_short, 160),
    linked_subjects: list(book.linked_subjects),
    related_subjects_highschool: list(book.related_subjects_highschool),
    connectable_concepts: list(book.connectable_concepts, 60),
    core_keywords: list(book.core_keywords),
    fit_keywords: list(book.fit_keywords),
    broad_theme: clean(book.broad_theme, 40),
  }));

const path = here("../public/keyword-engine/seed/engine-index/book_match_index.v1.json");
await writeFile(path, JSON.stringify({
  version: "book-match-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "seed/book-engine/mini_book_engine_books_starter.json",
  note: "추천을 고를 때 보는 칸만 남긴 것. book_content_points·starter_questions 같은 긴 칸은 뺐다.",
  books: out,
}, null, 0), "utf8");

const before = (await readFile(here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json"), "utf8")).length;
const after = (await readFile(path, "utf8")).length;
console.log(`책 ${out.length}권 · ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
