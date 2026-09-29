// **흔한 이름표로는 단원을 지목할 수 없다. 그리고 손으로 뺀 짝은 안 나간다.**
//
// 2026-09-29 에 나는 「156권이 「사회 구조와 조직」을 달고 있다」를 근거로 옮기는 표를 만들었다.
// 그것이 거꾸로였다 — **그 숫자는 그 이름표가 쓸모없다는 증거였다.** 한 단원에 166권이 붙었고
// 『겐지 이야기』·『고리오 영감』이 「사회 구조와 사회 변동」에 들어갔다.
// 낱말에는 이미 이 규칙이 있었다(20권 넘으면 0점). 이름표에만 없었다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COMMON_LABEL, buildConceptCounts, buildLabelCounts, buildWordCounts, matchBooks, scoreBook, MIN_SCORE } from '../../../admission_worker_skeleton/book_match_v1.mjs';
import { BOOK_CONCEPT_ALIAS, RIGHT_PAIRS, WRONG_PAIRS, addedPair, allowedPair } from '../../../admission_worker_skeleton/book_concept_alias_v1.mjs';

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

// ── ⑤ 「자료와 모델링」은 옮기지 않는다 ────────────────────────────
//
// 43권이 그 이름을 달고 있는데 그 안에 『시학』·『이상한 나라의 앨리스』·『고리오 영감』이 있다.
// 제목에 데이터·통계라는 말이 든 책은 43권 중 한 권뿐이었다. 그런데 나는 이것을 데이터 단원
// 여섯 개로 펼쳤고, 43 × 6 = 258개 억지 짝이 그 한 줄에서 나왔다.
{
  ok('L5 「자료와 모델링」이 옮기는 표에 없다', !Object.prototype.hasOwnProperty.call(BOOK_CONCEPT_ALIAS, '자료와 모델링'));
  const 전처리 = at('데이터 과학', '데이터 수집과 전처리', '데이터');
  ok(`L5 「데이터 수집과 전처리」에 43권이 안 붙는다 (${전처리.length}권)`, 전처리.length < 10);
  ok('L5 『고리오 영감』은 데이터 단원에 안 붙는다', !전처리.includes('고리오 영감'));
}

// ── ⑥ 그래도 진짜 데이터 책은 손으로 더해 살린다 ─────────────────────
//
// 이름표를 넓게 쓰면 42권이 따라오고, 좁게 쓰면 맞는 책이 죽는다. 그래서 짝으로 더한다.
{
  ok('L6 더한 짝이 적혀 있다', Object.keys(RIGHT_PAIRS).length >= 3);
  ok('L6 이유 없이 더한 짝은 없다', Object.values(RIGHT_PAIRS).every((one) => String(one).trim().length >= 10));
  ok('L6 addedPair 가 판단한다', addedPair('팩트풀니스', '자료와 정보의 분석') && !addedPair('고리오 영감', '자료와 정보의 분석'));
  ok('L6 『팩트풀니스』가 「자료와 정보의 분석」에 남는다', at('정보', '자료와 정보의 분석', '자료').includes('팩트풀니스'));
}

console.log(`이름표 쏠림: ${pass}개 통과${fails.length ? ` · 실패 ${fails.length}` : ''}`);
if (fails.length) { for (const one of fails) console.error('  실패:', one); process.exit(1); }
assert.ok(pass > 0);
