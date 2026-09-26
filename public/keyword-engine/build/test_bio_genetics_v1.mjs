// **「생물의 유전」이 빈 서랍이 아닌지** 본다. ₩0.
//
// 2026-09-25 에 이 과목은 과목 목록에 **이름만** 있었다 — 단원 사전 파일 자체가 없어 단원 0개,
// 논문 0편, 교과서 지도에도 없었다. 고르면 아무것도 못 주는 과목이었다.
// 2026-09-26 에 2022 개정 교육과정 과학과(별책9)와 미래엔 교사용 교과서(오현선 외)로 채웠다.
//
// **단원만 더하면 오히려 나빠진다**(과학탐구실험에서 겪었다: 논문 꼬리표가 없어 재료가 통째로 비었다).
// 그래서 이 시험은 단원·논문·연구 글이 **함께** 있는지를 본다.
import { readFileSync } from 'node:fs';
import { inferConcept } from '../../../admission_worker_skeleton/book_match_v1.mjs';
import { routePapers } from '../../../admission_worker_skeleton/paper_route_v1.mjs';
import { unitFromStandard } from '../../../admission_worker_skeleton/unit_from_standard_v1.mjs';

let fail = 0;
const ok = (cond, why) => { if (!cond) { console.log(`  ✗ ${why}`); fail += 1; } };
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const SEED = 'public/keyword-engine/seed';
const SUBJECT = '생물의 유전';

// 교과서의 중단원 이름 그대로다. 바꾸려면 교과서를 다시 보고 바꿔야 한다.
const UNITS = ['사람의 유전과 유전병', '유전물질', '유전자발현 과정', '유전자발현 조절',
  '생명공학기술의 발달', '생명공학기술의 영향과 생명윤리'];

// ── ① 단원 사전이 두 곳에 다 있다 ──────────────────────────
// 한 곳만 채우면 엔진이 반만 안다. 전에 그렇게 빠뜨린 적이 있다.
{
  const axis = read(`${SEED}/engine-index/longitudinal_axis_index.v1.json`);
  const mine = [...new Set(Object.values(axis.axes || {}).filter((one) => one.subject === SUBJECT).map((one) => one.concept))];
  ok(mine.length === UNITS.length, `축에 단원 ${UNITS.length}개가 있어야 한다 — ${mine.length}개`);
  for (const unit of UNITS) ok(mine.includes(unit), `축에 「${unit}」이 없다`);
  const book = read(`${SEED}/textbook-v1/subject_concept_engine_map.json`);
  const shown = Object.keys(((book.subjects || book)[SUBJECT] || {}).concepts || {});
  ok(shown.length === UNITS.length, `교과서 지도에도 단원 ${UNITS.length}개가 있어야 한다 — ${shown.length}개`);
}

// ── ② 과제 글만 보고 단원을 읽어낸다 ────────────────────────
{
  const axis = read(`${SEED}/engine-index/longitudinal_axis_index.v1.json`);
  const TASKS = [
    ['가계도를 분석하여 사람의 유전 형질이 상염색체 유전인지 성염색체 유전인지 판단하고 보고서를 작성한다', '사람의 유전과 유전병'],
    ['DNA가 유전물질이라는 증거가 된 실험들을 조사하고 반보존적 복제의 의미를 설명한다', '유전물질'],
    ['전사와 번역 과정을 모형으로 만들어 유전 부호를 해독하고 단백질 합성 과정을 설명한다', '유전자발현 과정'],
    ['원핵생물과 진핵생물의 유전자 발현 조절 과정을 비교하고 세포 분화와의 관계를 설명한다', '유전자발현 조절'],
    ['줄기세포와 유전자 편집 기술이 난치병 치료에 활용된 사례를 조사하여 발표 자료를 만든다', '생명공학기술의 발달'],
    ['유전자 변형 생물체(LMO)가 생태계에 미치는 영향을 조사하고 생명윤리 쟁점에 대해 논술한다', '생명공학기술의 영향과 생명윤리'],
  ];
  for (const [task, want] of TASKS) {
    const got = inferConcept(SUBJECT, task, axis);
    ok(got === want, `「${task.slice(0, 20)}…」 → ${got || '(못 읽음)'} (바란 것: ${want})`);
  }
}

// ── ③ 성취기준 코드로도 읽어낸다 ────────────────────────────
// 과학 코드는 붙임표가 **하나**다: [12유전01-01]. 국어·영어는 둘이다: [10공영1-02-02].
// 같은 규칙으로 읽으면 영역 번호를 과목 이름의 일부로 먹어 버려 하나도 안 걸린다.
{
  const table = read(`${SEED}/engine-index/unit_from_standard.v1.json`);
  const CODES = [
    ['[12유전01-01] 유전 형질이 유전자를 통해 자손에게 유전됨을 이해하고 상염색체 유전과 성염색체 유전 양상의 차이를 설명할 수 있다', '사람의 유전과 유전병'],
    ['[12유전01-05] DNA의 구조와 유전물질 규명 관련 과학사적 연구 결과를 설명하기 위한 발표 자료를 제작할 수 있다', '유전물질'],
    ['[12유전02-01] 전사와 번역 과정을 거쳐 유전자가 발현되는 중심원리를 이해하고 모형을 이용하여 설명할 수 있다', '유전자발현 과정'],
    ['[12유전02-04] 생물의 발생 과정에서 세포 분화가 유전자 발현 조절 과정을 통해 일어남을 추론할 수 있다', '유전자발현 조절'],
    ['[12유전03-02] 단일클론항체, 줄기세포, 유전자 편집 기술이 난치병 치료에 활용된 사례를 조사할 수 있다', '생명공학기술의 발달'],
    ['[12유전03-04] 유전자 변형 생물체(LMO)의 특징을 이해하고 인간과 생태계에 미치는 영향을 추론할 수 있다', '생명공학기술의 영향과 생명윤리'],
  ];
  for (const [text, want] of CODES) {
    const got = unitFromStandard(SUBJECT, text, table).unit;
    ok(got === want, `${text.slice(0, 12)}… → ${got || '(못 읽음)'} (바란 것: ${want})`);
  }
  // 국어·영어 코드가 깨지지 않았는지도 본다 — 같은 파일을 고쳤다.
  ok(unitFromStandard('공통국어1', '[10공국1-05-02] 현대시를 감상하고 비평한다', table).unit === '서정 갈래와 시적 표현',
    '국어 성취기준 읽기가 깨졌다');
}

// ── ④ 단원마다 재료가 있다 ─────────────────────────────────
// **여기가 이 시험의 핵심이다.** 단원만 만들고 재료가 없으면 속이 빈 보고서가 나간다.
{
  const shard = read(`${SEED}/paper-route/생물의_유전.v1.json`);
  ok(shard.rows.length > 1500, `논문 묶음이 있어야 한다 — ${shard.rows.length}편`);
  const snu = read(`${SEED}/engine-index/snu_research_index.v1.json`);
  for (const unit of UNITS) {
    const posts = (snu.concepts || {})[`${SUBJECT}::${unit}`] || [];
    ok(posts.length >= 2, `「${unit}」에 이어진 서울대 연구 글이 2편 이상이어야 한다 — ${posts.length}편`);
  }
  // 논문은 거의 못 붙인다. **그것을 알고 있다는 것**을 시험으로 남긴다 —
  // 우리 KCI 파일 111,576편에 유전병 0편·이중나선 0편·전사와 번역 0편·코돈 0편이다(2026-09-26 전수 확인).
  // 나중에 논문 파일을 바꾸면 이 수가 올라야 한다.
  const hit = routePapers(shard.rows, '원핵생물과 진핵생물의 유전자 발현 조절 과정을 비교한다', '조사탐구형',
    { limit: 2, subject: SUBJECT, units: [`${SUBJECT}::유전자발현 조절`], table: shard.units, anchor: '유전자발현 조절' });
  ok(Array.isArray(hit.picked), '논문 고르기가 터지지 않아야 한다');
}

// ── ⑤ 학생이 고를 수 있다 ──────────────────────────────────
{
  const html = readFileSync('public/keyword-engine/index.html', 'utf8');
  ok(/<option value="생물의 유전" data-subject-group="과학">/.test(html), '과목 목록에 있어야 한다');
  const filter = readFileSync('public/keyword-engine/assets/js/ui_subject_group_filter_v222.js', 'utf8');
  ok(/\{ value:"생물의 유전"/.test(filter), '드롭다운 목록에도 있어야 한다 — 한쪽만 넣으면 어긋난다');
}

// ── ⑥ 문학 성취기준 코드도 같은 모양이다 ────────────────────
// [12문학01-07] — 붙임표 하나. 국어·영어처럼 둘로 읽고 있어서 **한 번도 안 걸렸다**(2026-09-26).
// 표에 「12문학 → 공통국어1」을 적어 두었는데 그 표가 한 번도 쓰이지 않았다.
// 고친 뒤 성취기준 코드로 단원을 읽어내는 비율이 25/39(64.1%) → 34/39(87.2%) 가 되었다.
{
  const table = read(`${SEED}/engine-index/unit_from_standard.v1.json`);
  const lit = unitFromStandard('공통국어1', '[12문학01-02] 현대시를 감상하고 시를 창작한다', table);
  ok(Boolean(lit.unit), '문학 코드를 읽어야 한다');
  ok(lit.area === '문학', `문학 과목은 영역 번호와 상관없이 문학이다 — ${lit.area}`);
  // 과목 전체가 한 영역인 코드는 표에 적어 둔다. 영역 번호의 뜻을 모르는 채
  // 공통국어1 의 번호표를 빌려 쓰면 문학 과제가 「듣기·말하기」로 간다.
  ok(table.areaOfHead && table.areaOfHead['12문학'] === '문학', '표에 12문학 → 문학 이 적혀 있어야 한다');
  // 성취기준 코드 자체는 점수에서 뺀다 — 코드 속 「문학」이 단원 이름과 겹친다.
  const src = readFileSync('admission_worker_skeleton/unit_from_standard_v1.mjs', 'utf8');
  ok(/replace\(CODE, ' '\)\.replace\(SHORT_CODE, ' '\)/.test(src), '코드를 빼고 점수를 매겨야 한다');
}

if (fail) { console.error(`\n실패 ${fail}건`); process.exit(1); }
console.log(`통과 — 생물의 유전 단원 ${UNITS.length}개, 단원마다 재료가 있다`);
