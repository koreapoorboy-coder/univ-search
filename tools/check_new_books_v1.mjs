// **새로 적은 책의 단원·과목 이름이 우리 체계에 실제로 있는지 검문한다.** ₩0.
//
// 단원 이름이 한 글자만 달라도 「단원 지목 3점」을 못 받는다. 책 248권 중 147권이 사장돼 있던
// 까닭이 바로 그것이었다(이름표 60%가 없는 단원을 가리켰다). 손으로 적는 일에는 검문이 붙어야 한다.
//
//   node tools/check_new_books_v1.mjs tools/new_books_gap_2026_09_29.json
import { readFileSync } from 'node:fs';
import { IMMUTABLE_SUBJECT_INVENTORY_BASE64 } from '../admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs';

const file = process.argv[2];
if (!file) { console.log('파일을 주세요'); process.exit(1); }
const source = JSON.parse(readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const ax = JSON.parse(readFileSync(new URL('../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json', import.meta.url), 'utf8'));
const inv = JSON.parse(Buffer.from(IMMUTABLE_SUBJECT_INVENTORY_BASE64, 'base64').toString('utf8')).rows;

const 과목 = new Set(inv.map((one) => one.subject_value));
const 단원 = new Set();
const 단원의과목 = new Map();
for (const a of Object.values(ax.axes || {})) {
  if (!a.subject || !a.concept) continue;
  단원.add(a.concept);
  if (!단원의과목.has(a.concept)) 단원의과목.set(a.concept, new Set());
  단원의과목.get(a.concept).add(a.subject);
}

let 흠 = 0;
const 제목 = new Set();
for (const b of source.books) {
  const 말 = [];
  if (제목.has(b.title)) 말.push('제목이 겹친다');
  제목.add(b.title);
  for (const s of b.subjects || []) if (!과목.has(s)) 말.push(`없는 과목: ${s}`);
  for (const c of b.concepts || []) if (!단원.has(c)) 말.push(`없는 단원: ${c}`);
  // 적은 단원이 적은 과목 안에 있는지 — 없어도 문턱은 통과하지만, 적어 둔 과목이 엉뚱하다는 신호다
  for (const c of b.concepts || []) {
    if (!단원.has(c)) continue;
    const 사는곳 = 단원의과목.get(c);
    if (!(b.subjects || []).some((s) => 사는곳.has(s))) 말.push(`「${c}」는 적은 과목에 없다 (사는 곳: ${[...사는곳].slice(0, 3).join('·')})`);
  }
  for (const f of ['title', 'author', 'summary']) if (!String(b[f] || '').trim()) 말.push(`${f} 가 비었다`);
  if (말.length) { 흠 += 1; console.log(`✗ 『${b.title}』`); for (const m of 말) console.log(`     ${m}`); }
}
console.log(`\n책 ${source.books.length}권 · 흠 있는 책 ${흠}권`);
console.log(`내용 3줄 적은 책 ${source.books.filter((b) => (b.points || []).length).length}권 · 비워 둔 책 ${source.books.filter((b) => !(b.points || []).length).length}권`);
const 닿는단원 = new Set(source.books.flatMap((b) => b.concepts || []));
console.log(`가리키는 단원 ${닿는단원.size}개`);
process.exitCode = 흠 ? 1 : 0;

// ── 적지 않은 단원에 낱말로 새어 들어가는지 ────────────────────────────────
//
// 단원 목록을 좁히는 것만으로는 부족하다. 『재밌어서 밤새 읽는 화학 이야기』의 단원을 「화학과 우리 생활」
// 하나로 좁혔는데도 「화학 반응에서의 동적 평형」에 계속 붙었다 — core 에 남은 낱말 **「평형」** 때문이었다
// (test_suggestions_v1 의 B8 이 잡았다, 2026-09-29). 그래서 여기서 미리 센다.
{
  const { buildWordCounts, buildConceptCounts, scoreBook, MIN_SCORE } = await import('../admission_worker_skeleton/book_match_v1.mjs');
  const { axisForConcept } = await import('../admission_worker_skeleton/next_step_v1.mjs');
  const idx = JSON.parse(readFileSync(new URL('../public/keyword-engine/seed/engine-index/book_match_index.v1.json', import.meta.url), 'utf8')).books;
  const wc = buildWordCounts(idx);
  const cc = buildConceptCounts(ax);
  // **옮기는 표를 거친 뒤에 비교한다.** 표를 안 거치면 표가 제대로 일한 것을 흠으로 잡는다 —
  // 『루쉰 전집』이 「소설·극 갈래와 이야기 구성」을 적었으면 공통국어1의 「서사·극 갈래와 이야기 구성」에
  // 붙는 것이 맞다(같은 갈래를 두 과목이 다르게 부른다). 2026-09-30 에 그것을 흠으로 잡아서 고쳤다.
  const { aliasedConcepts } = await import('../admission_worker_skeleton/book_concept_alias_v1.mjs');
  const 제목별 = new Map(source.books.map((b) => [b.title, b]));
  let 샌것 = 0;
  for (const book of idx) {
    const mine = 제목별.get(book.title);
    if (!mine) continue;                                  // 이 묶음에서 넣은 책만 본다
    const 적은것 = new Set((mine.concepts || []).flatMap(aliasedConcepts));
    const 샌곳 = [];
    for (const a of Object.values(ax.axes || {})) {
      if (!a.subject || !a.concept || 적은것.has(a.concept)) continue;
      if (!(mine.subjects || []).includes(a.subject)) continue;   // 그 책이 적어 둔 과목 안에서만 본다
      const axis = axisForConcept(ax, a.subject, a.concept);
      const terms = [{ text: a.concept, topic: true }, { text: axis?.title || '' }].filter((t) => t.text);
      const r = scoreBook(book, { subject: a.subject, terms, conceptCounts: cc, major: '', majorCounts: null }, wc);
      if (r.score >= MIN_SCORE) 샌곳.push(`${a.subject}·${a.concept}(${r.score}점 ${(r.why || []).join(',')})`);
    }
    if (샌곳.length) {
      샌것 += 1;
      console.log(`△ 『${book.title}』 적지 않은 단원 ${샌곳.length}개에 낱말로 붙는다`);
      for (const one of 샌곳.slice(0, 5)) console.log(`     ${one}`);
    }
  }
  console.log(`\n낱말로 새어 들어가는 책 ${샌것}권 — 맞는 곳이면 concepts 에 적고, 아니면 core·fit·theme 에서 그 낱말을 빼세요.`);
}
