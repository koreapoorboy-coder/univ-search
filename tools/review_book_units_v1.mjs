// **단원마다 어떤 책이 붙는지 사람이 읽기 위한 목록.** ₩0.
//
// 책 추천은 ₩0 감사로 「몇 권 붙었나」까지만 셀 수 있고 「맞는 책인가」는 못 센다. 그래서 사람이 읽는다.
// 다만 두 번 읽지 않는다 — **사람이 「이 책은 이 단원」이라고 지목한 것은 이미 판단한 것**이므로
// 기본으로 접어 둔다(--stated 로 펼친다). 읽어야 하는 것은 **낱말이 겹쳐 붙은 것**이다.
// 「화학 반응식」에 「국화와 칼」이 '화학' 한 낱말로 붙던 것이 그 경우다.
//
//   node tools/review_book_units_v1.mjs 과학          — 그 계열의 단원마다 낱말로 붙은 책
//   node tools/review_book_units_v1.mjs 사회 --stated — 지목으로 붙은 것까지
//   node tools/review_book_units_v1.mjs --계열         — 계열 이름 목록
import { readFileSync } from 'node:fs';
import { buildConceptCounts, buildMajorCounts, buildWordCounts, scoreBook, MIN_SCORE } from '../admission_worker_skeleton/book_match_v1.mjs';
import { axisForConcept } from '../admission_worker_skeleton/next_step_v1.mjs';
import { IMMUTABLE_SUBJECT_INVENTORY_BASE64 } from '../admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs';

const here = (name) => new URL(name, import.meta.url);
const SEED = here('../public/keyword-engine/seed/engine-index/');
const read = (name) => JSON.parse(readFileSync(new URL(name, SEED), 'utf8'));
const books = read('book_match_index.v1.json').books;
const axisIndex = read('longitudinal_axis_index.v1.json');
const inventory = JSON.parse(Buffer.from(IMMUTABLE_SUBJECT_INVENTORY_BASE64, 'base64').toString('utf8')).rows;
const 계열 = new Map(inventory.map((one) => [one.subject_value, one.subject_group]));

const 볼계열 = process.argv.find((one) => !one.startsWith('-') && !/node|review_book/.test(one));
if (process.argv.includes('--계열') || !볼계열) {
  const 셈 = new Map();
  for (const one of inventory) 셈.set(one.subject_group, (셈.get(one.subject_group) || 0) + 1);
  console.log('계열: ' + [...셈].map(([k, n]) => `${k}(${n}과목)`).join(' · '));
  process.exit(0);
}
const 지목도 = process.argv.includes('--stated');

const wordCounts = buildWordCounts(books);
const conceptCounts = buildConceptCounts(axisIndex);
const majorCounts = buildMajorCounts(books);

// 그 계열 과목의 단원 전부
const 짝 = [];
for (const axis of Object.values(axisIndex.axes || {})) {
  if (!axis.subject || !axis.concept) continue;
  if (계열.get(axis.subject) !== 볼계열) continue;
  const key = `${axis.subject}::${axis.concept}`;
  if (!짝.some((one) => one.key === key)) 짝.push({ key, subject: axis.subject, concept: axis.concept });
}
짝.sort((a, b) => a.subject.localeCompare(b.subject, 'ko') || a.concept.localeCompare(b.concept, 'ko'));

let 낱말짝 = 0;
let 지목짝 = 0;
let 빈단원 = 0;
console.log(`══════ ${볼계열} · 단원 ${짝.length}개 ══════\n`);
for (const one of 짝) {
  const axis = axisForConcept(axisIndex, one.subject, one.concept);
  const terms = [{ text: one.concept, topic: true }, { text: axis?.title || '' }].filter((t) => t.text);
  const got = [];
  for (const book of books) {
    const r = scoreBook(book, { subject: one.subject, terms, conceptCounts, major: '', majorCounts }, wordCounts);
    if (r.score >= MIN_SCORE) got.push({ title: book.title, score: r.score, why: r.why || [] });
  }
  const 지목 = got.filter((g) => g.why.includes('단원 지목'));
  const 낱말 = got.filter((g) => !g.why.includes('단원 지목'));
  낱말짝 += 낱말.length;
  지목짝 += 지목.length;
  if (!got.length) { 빈단원 += 1; console.log(`[${one.subject} · ${one.concept}] 0권`); continue; }
  console.log(`[${one.subject} · ${one.concept}] 지목 ${지목.length}권 · 낱말 ${낱말.length}권`);
  for (const g of 낱말.sort((a, b) => b.score - a.score)) {
    console.log(`    낱말 ${g.score}점 · ${g.title.slice(0, 40).padEnd(42)} ← ${g.why.join(',')}`);
  }
  if (지목도) for (const g of 지목.slice(0, 8)) console.log(`    지목 ${g.score}점 · ${g.title.slice(0, 40)}`);
}
console.log(`\n읽을 짝(낱말로 붙은 것) ${낱말짝}개 · 지목으로 붙은 것 ${지목짝}개 · 책이 없는 단원 ${빈단원}개`);
