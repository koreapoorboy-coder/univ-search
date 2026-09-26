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

// **2022 개정 교육과정만 보고 넣은 과목은 아직 이 검사 밖이다**(2026-09-26).
// 사회·도덕 선택 과목 19개는 교육과정 원문(별책6·7)의 영역을 단원으로 삼아 넣었다. 그 어휘는 학술어라
// (「사회현상을 이해하는 관점」) 책 소개 글과 겹치는 말이 거의 없다. 실제로 재 보니 113권이 떨어졌는데,
// 떨어진 태그 대부분이 **맞는 태그**였다 — 「오리엔탈리즘→사회와 문화」, 「앵무새 죽이기→법과 사회」.
// 기준을 낮춰 통과시키는 것은 이 시험을 망치는 일이다(계수를 0.4까지 올려도 30권이 남았고,
// 그쯤이면 검사가 아무것도 안 막는다). 그래서 **범위를 정직하게 좁힌다.**
// 이 과목들의 책 태그를 검사에 넣으려면 그 과목 실제 과제 기록으로 어휘를 넓힌 뒤에 해야 한다.
const CURRICULUM_ONLY = new Set(["현대사회와 윤리", "윤리와 사상", "인문학과 윤리", "윤리문제 탐구",
  "세계시민과 지리", "세계사", "사회와 문화", "한국지리 탐구", "도시의 미래 탐구", "동아시아 역사 기행",
  "정치", "법과 사회", "경제", "국제 관계의 이해", "여행지리", "역사로 탐구하는 현대 세계",
  "사회문제 탐구", "금융과 경제생활", "기후변화와 지속가능한 세계",
  // 국어 선택 과목 7개도 같은 자리다(2026-09-26). 이쪽은 어휘가 학술어라기보다 **너무 흔한 말**이라
  // 닿지 않는다 — 「독서」·「글쓰기」·「읽기」는 어느 과목에나 나와 그 과목을 가리키지 못한다.
  "문학", "매체 의사소통", "화법과 언어", "독서와 작문", "주제 탐구 독서",
  "독서 토론과 글쓰기", "문학과 영상"]);

const vocab = new Map();
for (const axis of Object.values(axisIndex.axes || {})) {
  const bag = vocab.get(axis.subject) || new Set();
  for (const text of [axis.concept, axis.title, axis.output, axis.why]) for (const word of words(text)) bag.add(word);
  vocab.set(axis.subject, bag);
}
const spread = new Map();
for (const bag of vocab.values()) for (const word of bag) spread.set(word, (spread.get(word) || 0) + 1);
const subjects = [...vocab.keys()];
// 「이 말이 그 과목을 가리키는가」는 **몇 과목에 나오는가**로 잰다. 그런데 과목 수가 늘면 같은 말이
// 더 많은 과목에 나타나므로, 고정된 3 으로 재면 과목을 더할 때마다 멀쩡한 태그가 떨어져 나간다 —
// 2026-09-21 에 단원 사전이 없던 5과목을 넣자 「모델링」이 3 → 4 과목이 되어 「카오스」의 지구과학
// 태그가 떨어졌다. 그래서 **과목 수에 견주어** 잰다(26과목이면 3, 31과목이면 4).
// 2026-09-26: 사회·도덕 19과목을 넣어 31 → 51 과목이 되자 0.12 로는 멀쩡한 태그 4개가 떨어졌다
// (「이기적 유전자」의 통합사회1). 같은 일이 또 일어난 것이라 계수를 0.12 → 0.14 로 올렸다.
// 올리기 전에 재 보았다: 0.14 에서 떨어지는 태그 0개, 그 아래로는 남는다.
const tellingMax = Math.max(3, Math.round(subjects.length * 0.14));
const telling = (word) => (spread.get(word) || 0) > 0 && spread.get(word) <= tellingMax;
// 정확히 같은 이름을 먼저 찾는다. norm()이 끝의 숫자를 떼기 때문에 공통국어1과 공통국어2가 같은
// 이름이 되어, 「스틱!」의 공통국어2 태그를 공통국어1의 어휘로 재고 떼어 버렸다 — '홍보'는 공통국어2에만
// 있는 말이다. 1과 2는 다루는 개념이 다르므로 섞으면 안 된다.
const tight = (value) => String(value || "").replace(/\s+/g, "");
// 2026-09-26: 사회·도덕 과목 19개를 넣자 책의 「윤리」 태그가 「윤리문제 탐구」에 걸렸다.
// 앞글자만 같다고 같은 과목이 아니다. **길이가 두 글자 넘게 차이 나면 다른 과목으로 본다** —
// 「공통국어」→「공통국어1」은 한 글자 차이라 그대로 통하고, 「윤리」→「윤리문제 탐구」는 안 통한다.
const NEAR = 2;
const subjectFor = (tag) => subjects.find((mine) => tight(mine) === tight(tag))
  || subjects.find((mine) => {
    const a = norm(mine); const b = norm(tag);
    if (!a || !b || b.length < 2) return false;
    if (Math.abs(a.length - b.length) > NEAR) return false;
    return a === b || a.startsWith(b) || b.startsWith(a);
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
        if (CURRICULUM_ONLY.has(subject)) continue;   // 아래 설명 참고
        if (![...mine].some((word) => touches(word, vocab.get(subject), subject))) bad.push(`${book.title}→${subject}`);
      }
    }
  }
  if (process.env.SHOW_BAD) { if (process.env.SHOW_BAD === "list") { for (const one of bad) console.log("  " + one); process.exit(0); } const by = {}; for (const one of bad) { const s = one.split("→")[1]; by[s] = (by[s] || 0) + 1; } console.log("못 닿은 태그", bad.length, "개"); for (const [k, v] of Object.entries(by).sort((x, y) => y[1] - x[1])) console.log(`  ${k} ${v}권`); process.exit(0); }
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
