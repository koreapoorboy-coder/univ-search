// **흔한 이름표로는 단원을 지목할 수 없다. 그리고 손으로 뺀 짝은 안 나간다.**
//
// 2026-09-29 에 나는 「156권이 「사회 구조와 조직」을 달고 있다」를 근거로 옮기는 표를 만들었다.
// 그것이 거꾸로였다 — **그 숫자는 그 이름표가 쓸모없다는 증거였다.** 한 단원에 166권이 붙었고
// 『겐지 이야기』·『고리오 영감』이 「사회 구조와 사회 변동」에 들어갔다.
// 낱말에는 이미 이 규칙이 있었다(20권 넘으면 0점). 이름표에만 없었다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COMMON_LABEL, buildConceptCounts, buildLabelCounts, buildWordCounts, matchBooks, scoreBook, MIN_SCORE } from '../../../admission_worker_skeleton/book_match_v1.mjs';
import { WRONG_PAIRS, allowedPair } from '../../../admission_worker_skeleton/book_concept_alias_v1.mjs';

const here = (name) => new URL(name, import.meta.url);
const books = JSON.parse(await readFile(here('../seed/engine-index/book_match_index.v1.json'), 'utf8')).books;
const axisIndex = JSON.parse(await readFile(here('../seed/engine-index/longitudinal_axis_index.v1.json'), 'utf8'));
const wc = buildWordCounts(books);
const cc = buildConceptCounts(axisIndex);
const lc = buildLabelCounts(books);

let pass = 0;
const fails = [];
const ok = (name, got) => { if (got) pass += 1; else fails.push(name); };
const at = (subject, concept, keyword) => matchBooks(books,
  { subject, concept, keyword: keyword || concept }, 200, wc, cc, null, Math.random, lc).map((one) => one.title);

// ── ① 흔한 이름표는 지목으로 세지 않는다 ────────────────────────────
{
  const 흔한것 = [...lc].filter(([, n]) => n > COMMON_LABEL).map(([k]) => k);
  ok(`L1 문턱을 넘는 이름표가 실제로 있다 (${흔한것.length}개)`, 흔한것.length > 0);
  const 사회 = at('사회와 문화', '사회 구조와 사회 변동');
  ok(`L1 「사회 구조와 사회 변동」에 붙는 책이 30권 미만이다 (${사회.length}권)`, 사회.length < 30);
  ok('L1 『겐지 이야기』는 사회 변동에 안 붙는다', !사회.includes('겐지 이야기'));
  ok('L1 『고리오 영감』도 안 붙는다', !사회.includes('고리오 영감'));
  // **막으면 안 되는 것.** 진짜 사회 변동 책은 남아야 한다.
  ok('L1 『1984』는 남는다', 사회.includes('1984'));
}

// ── ② 손으로 뺀 짝은 아무 점수도 못 받는다 ──────────────────────────
{
  ok('L2 뺀 짝이 실제로 적혀 있다', Object.keys(WRONG_PAIRS).length >= 4);
  ok('L2 이유 없이 뺀 짝은 없다', Object.values(WRONG_PAIRS).every((one) => String(one).trim().length >= 10));
  const 주기율표 = at('통합과학1', '규칙성 발견과 주기율표', '주기율표');
  ok('L2 『페르마의 마지막 정리』는 주기율표에 안 붙는다', !주기율표.includes('페르마의 마지막 정리'));
  ok('L2 그래도 『사라진 스푼』·『멘델레예프의 꿈』은 남는다',
    주기율표.includes('사라진 스푼') && 주기율표.includes('멘델레예프의 꿈'));
  ok('L2 『신곡』은 동양 윤리사상에 안 붙는다', !at('윤리와 사상', '동양 윤리사상').includes('신곡'));
  ok('L2 그래도 『퇴계문선』은 남는다', at('윤리와 사상', '동양 윤리사상').includes('퇴계문선'));
  ok('L2 allowedPair 가 그대로 판단한다',
    allowedPair('사라진 스푼', '규칙성 발견과 주기율표') && !allowedPair('페르마의 마지막 정리', '규칙성 발견과 주기율표'));
}

// ── ③ 옮기는 표가 너무 넓던 두 곳 ───────────────────────────────
{
  ok('L3 「통합적 관점과 행복」에 『경영학 콘서트』가 안 붙는다',
    !at('통합사회1', '통합적 관점과 행복', '행복').includes('경영학 콘서트'));
  ok('L3 「모집단과 표본」에 『죽은 경제학자의 살아있는 아이디어』가 안 붙는다',
    !at('확률과 통계', '모집단과 표본', '표본').includes('죽은 경제학자의 살아있는 아이디어'));
  ok('L3 그래도 『통계의 거짓말』은 남는다', at('확률과 통계', '모집단과 표본', '표본').includes('통계의 거짓말'));
}

// ── ④ labelCounts 를 안 넘기면 예전처럼 다 받는다 ─────────────────────
// 검사와 도구가 그 꼴로 부른다. 규칙을 넘기는 쪽이 정한다.
{
  // **만든 책으로 잰다.** 실제 책을 쓰면 과목 문턱에 막혀 규칙이 아니라 문턱을 재게 된다
  // (『겐지 이야기』의 과목 목록에 「사회와 문화」가 없어서 0점이 나왔다).
  const book = { title: '시험용 책', linked_subjects: ['사회와 문화'], connectable_concepts: ['사회 구조와 조직'] };
  const terms = [{ text: '사회 구조와 사회 변동', topic: true }];
  const 넘김 = scoreBook(book, { subject: '사회와 문화', terms, conceptCounts: cc, labelCounts: lc }, wc);
  const 안넘김 = scoreBook(book, { subject: '사회와 문화', terms, conceptCounts: cc }, wc);
  ok('L4 넘기면 지목으로 안 센다', !(넘김.why || []).includes('단원 지목'));
  ok('L4 안 넘기면 예전처럼 센다', (안넘김.why || []).includes('단원 지목'));
  ok('L4 matchBooks 는 안 넘겨도 스스로 센다 — 부르는 곳이 잊어도 규칙이 산다',
    !matchBooks(books, { subject: '사회와 문화', concept: '사회 구조와 사회 변동' }, 200, wc, cc)
      .map((one) => one.title).includes('겐지 이야기'));
  void MIN_SCORE;
}

console.log(`이름표 쏠림: ${pass}개 통과${fails.length ? ` · 실패 ${fails.length}` : ''}`);
if (fails.length) { for (const one of fails) console.error('  실패:', one); process.exit(1); }
assert.ok(pass > 0);
