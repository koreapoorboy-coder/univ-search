// 빈 자리에 책을 넣는다.
//
// 210권 corpus는 인문·사회 책 모음이다. 개념 152개 중 76개에만 책이 붙고, 비어 있는 46개는 거의 과학이다
// (지구과학 8 · 화학 6 · 물리 5 · 세포와 물질대사 3 · 지구시스템과학 3 · 전자기와 양자 3 · 물질과 에너지 3 ·
// 역학과 에너지 3 · 국어 6 …). 수학 계산 단원은 일부러 비워 둔다 — 거기엔 책이 아니라 통계가 맞다.
//
// 책과 태그는 tools/new_books_2026_09.json 에 손으로 적었다. 태그는 **그 개념이 실제로 쓰는 말**로 단다.
// 무슨 낱말이 걸려야 6점을 넘는지 점수 규칙 그대로 미리 쟀고, 흔한 말(구조·변화·시스템·해석)은 일부러
// 안 썼다 — 넣으면 그 낱말이 흔해져서 다른 과목의 추천까지 무너뜨린다.
//
//   node tools/add_books_2026_09.mjs           — 무엇이 들어가는지만 보여 준다
//   node tools/add_books_2026_09.mjs --write   — 실제로 넣는다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const source = JSON.parse(await readFile(here("new_books_2026_09.json"), "utf8"));
const bookPath = here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json");
const raw = JSON.parse(await readFile(bookPath, "utf8"));

const have = new Set(raw.map((book) => String(book.title || "").trim()));
const fresh = source.books.filter((one) => !have.has(one.title));
const already = source.books.filter((one) => have.has(one.title));

let no = raw.reduce((max, book) => Math.max(max, Number(book.book_no) || 0), 0);
const made = fresh.map((one) => {
  no += 1;
  return {
    book_id: "book_" + String(no).padStart(3, "0"),
    book_no: no,
    title: one.title,
    author: one.author,
    summary_short: one.summary,
    starter_questions: one.points,
    linked_subjects: one.subjects,
    linked_majors: one.majors,
    fit_keywords: one.fit,
    fit_modes: ["compare", "case", "application"],
    // 옛 경로는 우리 개념 이름과 다른 체계를 쓴다(국어::서사와 인물 이해). 179쌍 중 14쌍만 우리 이름과
    // 같았다. 새 책은 우리 개념 이름으로만 적어 둔다.
    engine_subject_routes: one.concepts.map((concept) => ({
      subject: one.subjects[0], concept, unit: concept, micro_keywords: one.core.slice(0, 4),
    })),
    task_fit: ["자료조사 보고서", "실험 보고서", "발표"],
    broad_theme: one.theme,
    status: "active",
    book_core_summary: one.summary,
    book_format: ["교양과학형", "사례 분석형"],
    core_keywords: one.core,
    related_subjects_highschool: one.subjects,
    related_majors: one.majors,
    book_content_points: one.points,
    connectable_concepts: one.concepts,
    added_at: "2026-09-16",
    added_note: source.caveat,
  };
});

console.log(`넣을 책 ${made.length}권` + (already.length ? ` (이미 있는 ${already.length}권은 건너뜀)` : ""));
for (const one of made) console.log(`  ${one.title} (${one.author}) — ${one.linked_subjects.join(", ")}`);
if (already.length) console.log("\n이미 있는 제목: " + already.map((one) => one.title).join(", "));

if (process.argv.includes("--write")) {
  await writeFile(bookPath, JSON.stringify([...raw, ...made], null, 2), "utf8");
  console.log(`\n${raw.length}권 → ${raw.length + made.length}권. tools/build_book_match_index.mjs 로 인덱스를 다시 만드세요.`);
} else {
  console.log("\n(보여 주기만 했습니다. 넣으려면 --write 를 붙이세요.)");
}
