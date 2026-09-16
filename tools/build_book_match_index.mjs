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

// 우리 쪽 홍보문구인가. 학과 이름이나 '탐구·확장·연결' 같은 말이 들어간 줄은 책 내용이 아니다.
const PROMO = /학과|도서|탐구|연결해|핵심 주제로는|수행평가|확장|계열/;
const usable = (line) => {
  const text = String(line || "").trim();
  return text.length >= 12 && /[.다]$/.test(text) && !PROMO.test(text);
};

const out = books
  .filter((book) => clean(book?.title))
  .map((book) => ({
    title: clean(book.title, 120),
    author: clean(book.author, 60),
    // 화면에 한 줄로 보여 줄 만큼만.
    //
    // blurb 가 있으면 그것을 쓴다. 학생은 책을 안 읽으므로 이 한 줄이 아는 전부인데, 원래 summary_short 는
    // "~탐구를 확장하기 좋은 도서. 특히 ○○학과와 연결성이 높다" 같은 홍보문구이거나 100자가 넘었다.
    // 그건 학과에 하는 말이지 학생에게 하는 말이 아니다. tools/book_blurbs_2026_09.json 을 보라.
    summary: clean(book.blurb, 90) || clean(book.summary_short, 160),
    linked_subjects: list(book.linked_subjects),
    related_subjects_highschool: list(book.related_subjects_highschool),
    connectable_concepts: list(book.connectable_concepts, 60),
    core_keywords: list(book.core_keywords),
    fit_keywords: list(book.fit_keywords),
    broad_theme: clean(book.broad_theme, 40),
    // 진로도 맞춘다. 학교에서 "책 읽고 첨부해라" 할 때 학생이 고를 책은 주제만이 아니라 가고 싶은 과도
    // 가리켜야 한다. 240권 전부에 학과가 달려 있다.
    majors: list([...(book.linked_majors || []), ...(book.related_majors || [])], 30).slice(0, 8),
    // 이 책이 무엇을 다루는가. 학생이 읽을 시간이 없으므로 이것이 화면에 펼쳐지고 자료 카드의
    // '핵심 내용'이 된다. 지어낸 말이 아니라 우리가 정리해 둔 그 책의 내용이다.
    //
    // 다만 여기에도 홍보문구가 쉼표로 잘려 들어간 줄이 섞여 있다("약학·제약·생명공학 탐구를 확장하기
    // 좋은 책이다", "사회 계열 확장 도서"). 학생에게 하는 말이 아니므로 거른다.
    points: list(book.book_content_points, 140).filter(usable).slice(0, 3),
    // 우리가 손으로 넣은 책인가. 이 책들은 연결 개념을 **우리 체계의 이름 그대로** 적었으므로,
    // 그 이름의 낱말이 이웃 개념으로 새면 안 된다 — 「지구 이야기」의 '지구 탄생과 시스템 진화'가
    // '진화' 한 낱말로 '별의 특성과 진화'까지 끌고 갔다. 옛 210권은 개념 체계가 달라 해당 없다.
    own: book.added_at === "2026-09-16" || undefined,
  }));

const path = here("../public/keyword-engine/seed/engine-index/book_match_index.v1.json");
await writeFile(path, JSON.stringify({
  version: "book-match-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "seed/book-engine/mini_book_engine_books_starter.json",
  note: "추천을 고를 때 보는 칸과, 보고서에 넣을 때 쓰는 칸(학과·내용 조각)만 남긴 것.",
  books: out,
}, null, 0), "utf8");

const before = (await readFile(here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json"), "utf8")).length;
const after = (await readFile(path, "utf8")).length;
console.log(`책 ${out.length}권 · ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
