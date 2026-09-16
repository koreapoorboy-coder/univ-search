// 책에 붙은 과목 태그가 맞는가.
//
// 「겐지 이야기」·「국화와 칼」·「마음」에 **화학**이 붙어 있다. 어제 화학 반응식에 「국화와 칼」이 추천된
// 진짜 원인이 이것이었다 — 점수 규칙이 아니라 데이터가 거짓말을 하고 있었고, 나는 기준을 올려 증상만 가렸다.
//
// 판정 기준은 우리가 이미 가진 것으로 만든다: **그 과목의 교육과정 어휘**다. 축 인덱스에 과목마다 개념·축
// 이름·산출물·설명이 달려 있으므로, 그것이 그 과목이 실제로 다루는 말의 목록이다. 책이 자기 태그(개념·핵심
// 낱말·주제)에서 그 어휘와 **뜻 있는 낱말 하나**라도 겹치면 태그가 맞는 것이고, 하나도 안 겹치면 틀린 것이다.
//
// 뜻 있는 낱말이란: 여러 과목의 어휘에 두루 나오는 말(사회·분석·이해·변화…)은 아무것도 가리지 못하므로 뺀다.
//
//   node tools/audit_book_subjects.mjs            — 재기만 한다
//   node tools/audit_book_subjects.mjs --write    — 틀린 태그를 떼고 다시 쓴다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const bookPath = here("../public/keyword-engine/seed/book-engine/mini_book_engine_books_starter.json");
const raw = JSON.parse(await readFile(bookPath, "utf8"));
const books = Object.entries(raw);

const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((word) => word.length >= 2);
const norm = (value) => String(value || "").replace(/\s+/g, "").replace(/\d+$/, "");

// 과목마다 그 과목이 실제로 쓰는 말. 교육과정에서 그대로 온다.
const vocab = new Map();
for (const axis of Object.values(axisIndex.axes || {})) {
  const bag = vocab.get(axis.subject) || new Set();
  for (const text of [axis.concept, axis.title, axis.output, axis.why]) for (const word of words(text)) bag.add(word);
  vocab.set(axis.subject, bag);
}

// 여러 과목에 두루 나오는 말은 아무것도 가리지 못한다.
const spread = new Map();
for (const bag of vocab.values()) for (const word of bag) spread.set(word, (spread.get(word) || 0) + 1);
// 여섯 과목까지 쳐 줬더니 문학책의 화학 태그가 5개나 살아남았다. 셋으로 조이면 0이 된다.
const MANY = 3;
const telling = (word) => (spread.get(word) || 0) > 0 && spread.get(word) <= MANY;

// 낱말이 맞닿는가. **같은지가 아니라 닿는지를 본다.**
//
// 처음에는 똑같은 낱말만 쳤더니 「엔트로피」가 통합사회에서 떨어졌다. 교육과정은 "지속 가능한 삶"이라 쓰고
// 책 태그는 "지속가능성"이라 쓴다 — 뜻은 하나인데 글자가 달라서 못 붙었다. 한국어는 말을 이어 붙여 만드는
// 말이 많으므로, 한쪽이 다른 쪽을 품고 있으면 닿은 것으로 친다(행동경제학 ⊃ 경제).
//
// 과목 이름 자체는 증거가 아니다. 「국화와 칼」·「마음」·「시학」의 태그 안에 '화학'이라는 글자가 그대로
// 들어 있어서 살아남았다 — "이 책은 화학과 관련 있다"는 말은 지금 따지고 있는 주장이지 근거가 아니다.
// (점수 매기는 쪽 book_match_v1.mjs도 같은 이유로 과목 이름 낱말을 0점 처리한다.)
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

const subjects = [...vocab.keys()];
const subjectFor = (tag) => subjects.find((mine) => {
  const a = norm(mine);
  const b = norm(tag);
  return a && b && b.length >= 2 && (a === b || a.startsWith(b) || b.startsWith(a));
});

// 줄거리와 내용 요약은 안 본다. 긴 산문에는 '구조'·'변화'·'에너지' 같은 말이 우연히 들어 있어서,
// 「국화와 칼」의 화학 태그가 살아남았다. 손으로 붙인 태그만 본다.
const bookWords = (book) => new Set([
  ...(book.connectable_concepts || []), ...(book.core_keywords || []), ...(book.fit_keywords || []),
  book.broad_theme,
].flatMap(words));

const report = new Map();
const fixes = [];
for (const [id, book] of books) {
  const mine = bookWords(book);
  for (const field of ["linked_subjects", "related_subjects_highschool"]) {
    const keep = [];
    for (const tag of book[field] || []) {
      const subject = subjectFor(tag);
      if (!subject) { keep.push(tag); continue; }   // 우리 과목이 아니면 판정 대상이 아니다. 그대로 둔다.
      const bag = vocab.get(subject);
      const shared = [...mine].map((word) => touches(word, bag, subject)).filter(Boolean);
      const at = report.get(subject) || { had: 0, kept: 0, dropped: [] };
      at.had += 1;
      if (shared.length) { at.kept += 1; keep.push(tag); }
      else at.dropped.push(`${book.title} (${field === "linked_subjects" ? "연결" : "관련"})`);
      report.set(subject, at);
    }
    fixes.push({ id, field, keep });
  }
}

console.log("과목마다 붙은 태그 중 몇 개가 교육과정 어휘와 닿는가\n");
console.log("  과목            붙음   맞음   떼야 함");
for (const [subject, at] of [...report.entries()].sort((a, b) => b[1].had - a[1].had)) {
  const bad = at.had - at.kept;
  const rate = Math.round((at.kept / at.had) * 100);
  console.log(`  ${subject.padEnd(14)} ${String(at.had).padStart(4)}  ${String(at.kept).padStart(4)}  ${String(bad).padStart(5)}   (${rate}% 맞음)`);
}
const had = [...report.values()].reduce((n, at) => n + at.had, 0);
const kept = [...report.values()].reduce((n, at) => n + at.kept, 0);
console.log(`\n  합계 ${had}개 중 ${kept}개가 맞고 ${had - kept}개를 떼야 합니다 (${Math.round((kept / had) * 100)}%).`);

console.log("\n떼야 할 것 (과목별 앞 5권)");
for (const [subject, at] of [...report.entries()].sort((a, b) => (b[1].had - b[1].kept) - (a[1].had - a[1].kept))) {
  if (!at.dropped.length) continue;
  console.log(`\n· ${subject} — ${at.dropped.length}권`);
  for (const one of at.dropped.slice(0, 5)) console.log(`    ${one}`);
}

if (process.argv.includes("--write")) {
  // 무엇을 뗐는지 남긴다. 원본은 git에 있으니 이 파일은 되돌리기용이 아니라,
  // 나중에 "이 책에 왜 화학이 없지"를 답하기 위한 것이다.
  // 쌓아 둔다. 덮어쓰면 앞서 뗀 것이 사라진다 — 「국화와 칼」의 화학이 어디로 갔는지 답할 수 없게 된다.
  const recordPath = here("../public/keyword-engine/seed/book-engine/removed_subject_tags.v1.json");
  const before = await readFile(recordPath, "utf8").then(JSON.parse).catch(() => ({ subjects: [] }));
  const past = new Map((before.subjects || []).map((at) => [at.subject, at.dropped || []]));
  const record = [...report.entries()].map(([subject, at]) => ({
    subject, had: at.had, kept: at.kept,
    dropped: [...new Set([...(past.get(subject) || []), ...at.dropped])],
  }));
  for (const [subject, dropped] of past) if (!report.has(subject)) record.push({ subject, had: 0, kept: 0, dropped });
  await writeFile(recordPath, JSON.stringify({
    version: "removed-subject-tags-v1",
    removed_at: new Date().toISOString().slice(0, 10),
    why: "교육과정 어휘와 한 낱말도 닿지 않는 과목 태그를 뗐다. 「국화와 칼」에 화학이 붙어 화학 반응식 보고서에 추천된 것이 발단이다.",
    rule: "책이 손으로 붙인 태그(개념·핵심 낱말·주제)가 그 과목 교육과정 어휘와 겹치되, 3과목 이하에만 나오는 낱말로 겹쳐야 한다. 줄거리는 보지 않는다 — 긴 산문에는 '구조'·'변화'·'에너지'가 우연히 들어 있다.",
    subjects: record,
  }, null, 1), "utf8");
  for (const { id, field, keep } of fixes) raw[id][field] = keep;
  await writeFile(bookPath, JSON.stringify(raw, null, 2), "utf8");
  console.log("\n다시 썼습니다. 뗀 기록은 seed/book-engine/removed_subject_tags.v1.json 에 있습니다.");
} else {
  console.log("\n(재기만 했습니다. 고치려면 --write 를 붙이세요.)");
}
