// **단원마다 「어떤 자료를 쓰는 단원인가」를 한 번 정해 둔다.** ₩0.
//
// 왜 필요한가(사용자 결정 2026-09-30).
//   수행평가 안내문이 요구한 자료는 당연히 넣는다. 다툴 것이 없다.
//   문제는 **안내문이 아무 말도 하지 않은 과제 2,400건(72%)** 이다. 넣어도 되고 안 넣어도 된다.
//   그것을 **보고서마다 판단할 수는 없다.** 판단이 낱말 점수에 맡겨져 있으면 이런 일이 생긴다 —
//   「힘과 운동」에 『패러데이와 맥스웰』이 '자기장' 으로, 고려 단원에 『성호사설』이 '조선' 으로 붙는다.
//   그리고 나는 「붙는 비율」을 올리려고 계속 억지를 넣게 된다.
//
// 그래서 **단원마다 한 번 정해 둔다.** 단원은 371개로 셀 수 있고, 사람이 읽고 고칠 수 있다.
// 낱말은 무한하고 애매하다.
//
// **단원으로 정할 수 있는 것과 없는 것을 갈라 둔다**(실측 2026-09-30, 과제 3,342건):
//   · 「실험이냐 논술이냐」 — **못 정한다.** 같은 단원을 선생님마다 다르게 낸다. 「물질의 양과 화학
//     반응식」 146건이 실험 61 · 말없음 48 · 논술 48 이다. 한 갈래로 또렷한 단원은 8% 뿐이다.
//     그래서 방법은 안내문이 정한다(resolveCollectionKind).
//   · 「어떤 자료를 쓰는 단원인가」 — **정할 수 있다.** 단원은 고정이고 그 단원에 붙을 자료도 고정이다.
//     선생님이 바꿀 수 없다. 이 표가 다루는 것은 이쪽뿐이다.
//
// 이 표가 정하는 것:
//   안내문이 요구한 자료  → 표와 무관하게 준다. 없으면 학생에게 「직접 찾아야 해요」라고 말한다.
//   안내문이 말 안 한 자료 → **표가 「준다」인 것만 준다.** 낱말로 몰래 들어올 길이 막힌다.
//
//   node tools/build_unit_material_policy_v1.mjs            — 초안을 세어 보여 준다
//   node tools/build_unit_material_policy_v1.mjs --review   — 사람이 읽을 목록(338칸)을 낸다
//   node tools/build_unit_material_policy_v1.mjs --write     — seed 에 초안을 쓴다
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { aliasedConcepts } from '../admission_worker_skeleton/book_concept_alias_v1.mjs';

const here = (name) => new URL(name, import.meta.url);
const SEED = here('../public/keyword-engine/seed/');
const read = (name) => JSON.parse(readFileSync(new URL(name, SEED), 'utf8'));
const norm = (value) => String(value || '').replace(/[\s·]/g, '');

const axisIndex = read('engine-index/longitudinal_axis_index.v1.json');
const snu = read('engine-index/snu_research_index.v1.json').concepts || {};
const publicTerms = read('engine-index/public_data_terms.v1.json').byConcept || {};
const kosis = read('engine-index/kosis_unit_map.v1.json').byConcept || {};
const books = read('engine-index/book_match_index.v1.json').books;

// 논문 묶음은 과목마다 한 파일이다. 꼴은 파일의 note 에 적혀 있다 —
//   units  = 「과목::단원」 문자열의 배열
//   rows[i] = [제목, 저자, 연도, 학술지, 권, 호, 쪽, 중심학문, **단원 번호들**(units 의 자리), 난이도]
// 처음에 units 를 「단원 이름 → 편 수」 표로 착각해서 논문이 0 줄로 나왔다(2026-09-30).
const PAPER_UNIT_COLUMN = 8;
const papers = new Map();
for (const file of readdirSync(new URL('paper-route/', SEED)).filter((one) => one.endsWith('.json'))) {
  const one = read(`paper-route/${file}`);
  const names = Array.isArray(one.units) ? one.units : Object.values(one.units || {});
  for (const row of one.rows || []) {
    const tagged = row?.[PAPER_UNIT_COLUMN];
    if (tagged === null || tagged === undefined) continue;   // 꼬리표가 없는 논문은 그 단원에 못 나간다
    for (const at of [].concat(tagged)) {
      const key = names[Number(at)];
      if (key) papers.set(key, (papers.get(key) || 0) + 1);
    }
  }
}

// 책은 **그 단원을 이름으로 지목한 것**만 센다. 낱말로 걸리는 것은 이 표가 막으려는 대상이다.
//
// 한 책이 여러 이름을 적어 두고 그 이름들이 옮기는 표를 거쳐 같은 단원에 닿으면 같은 책이 여러 번
// 세어진다 — 처음 뽑았을 때 「1984 · 1984 · 1984」, 「연암산문선 · 연암산문선」 이 나왔다. Set 으로 센다.
const bookTitles = new Map();
for (const book of books) {
  const title = String(book.title || '').trim();
  if (!title) continue;
  const 닿는곳 = new Set((book.connectable_concepts || []).flatMap(aliasedConcepts).map(norm));
  for (const key of 닿는곳) {
    if (!bookTitles.has(key)) bookTitles.set(key, new Set());
    bookTitles.get(key).add(title);
  }
}

// 그 단원 수행평가가 실제로 몇 건인지. 과제가 없는 단원은 사람이 읽을 필요가 없다.
const taskCount = new Map();
try {
  for (let part = 0; part < 6; part += 1) {
    for (const row of read(`../../../.audit_d4/rows_${part}.json`).rows) {
      if (!row.subject || !row.concept) continue;
      const key = `${row.subject}::${row.concept}`;
      taskCount.set(key, (taskCount.get(key) || 0) + 1);
    }
  }
} catch { /* 감사 결과가 없으면 과제 수를 0 으로 둔다 */ }

const units = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  if (!axis.subject || !axis.concept) continue;
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const titles = [...(bookTitles.get(norm(axis.concept)) || [])];
  units.push({
    key, subject: axis.subject, concept: axis.concept,
    tasks: taskCount.get(key) || 0,
    논문: papers.get(key) || 0,
    대학연구: (snu[key] || []).length,
    통계: (publicTerms[axis.concept] || []).length ? '있음' : ((kosis[axis.concept] || []).length ? '표용만' : ''),
    책: titles.length,
    책목록: titles,
  });
}
units.sort((a, b) => b.tasks - a.tasks || a.key.localeCompare(b.key, 'ko'));

// 초안은 **세어서** 만든다. 자료가 있으면 '준다', 없으면 '없음'. 사람이 읽고 '안준다' 로 바꿀 수 있다.
// 「표용만」은 참고문헌에 붙는 낱말이 없다는 뜻이므로 '없음' 이다(설계서 표는 따로 채운다).
const 초안 = (u) => ({
  논문: u.논문 > 0 ? '준다' : '없음',
  대학연구: u.대학연구 > 0 ? '준다' : '없음',
  통계: u.통계 === '있음' ? '준다' : '없음',
  책: u.책 > 0 ? '준다' : '없음',
});

if (process.argv.includes('--review')) {
  // 사람이 읽어야 하는 것은 **자료가 있다고 적힌 칸**뿐이다. 없는 칸은 볼 것이 없다.
  let n = 0;
  for (const u of units.filter((one) => one.tasks > 0)) {
    const 칸 = [];
    if (u.논문) 칸.push(`논문 ${u.논문}편`);
    if (u.대학연구) 칸.push(`대학연구 ${u.대학연구}건`);
    if (u.통계 === '있음') 칸.push(`통계 있음`);
    if (u.책) 칸.push(`책 ${u.책}권: ${u.책목록.slice(0, 4).join(' · ')}`);
    if (!칸.length) continue;
    n += 칸.length;
    console.log(`[과제 ${String(u.tasks).padStart(3)}건] ${u.key.replace('::', ' · ')}`);
    for (const one of 칸) console.log(`    · ${one}`);
  }
  console.log(`\n사람이 읽을 칸 ${n}개`);
  process.exit(0);
}

const 있는칸 = (u) => [u.논문 > 0, u.대학연구 > 0, u.통계 === '있음', u.책 > 0].filter(Boolean).length;
const 과제있음 = units.filter((one) => one.tasks > 0);
console.log(`단원 ${units.length}개 · 그중 실제 과제가 있는 단원 ${과제있음.length}개\n`);
console.log('【자료를 몇 종 가진 단원인가】(실제 과제 있는 단원)');
for (let i = 0; i <= 4; i += 1) {
  const group = 과제있음.filter((one) => 있는칸(one) === i);
  if (!group.length) continue;
  console.log(`  ${i}종  ${String(group.length).padStart(3)}개 단원 · 과제 ${String(group.reduce((s, o) => s + o.tasks, 0)).padStart(4)}건`);
}
console.log(`\n사람이 읽을 칸 ${과제있음.reduce((s, o) => s + 있는칸(o), 0)}개 / 전체 ${units.length * 4}칸`);

if (process.argv.includes('--write')) {
  const out = {
    version: 'unit-material-policy-v1',
    built_at: new Date().toISOString().slice(0, 10),
    note: [
      '단원마다 어떤 자료를 쓰는 단원인가. 안내문이 말하지 않은 과제에서 이 표가 정한다.',
      '안내문이 요구한 자료는 이 표와 무관하게 준다 — 없으면 학생에게 직접 찾으라고 말한다.',
      '초안은 자료가 있는지 세어서 만들었다. 사람이 읽고 「안준다」로 바꾼 칸은 memo 에 이유를 적는다.',
    ].join(' '),
    policy: Object.fromEntries(units.map((u) => [u.key, { ...초안(u), tasks: u.tasks }])),
  };
  writeFileSync(new URL('engine-index/unit_material_policy.v1.json', SEED), `${JSON.stringify(out, null, 1)}\n`, 'utf8');
  console.log('\nseed/engine-index/unit_material_policy.v1.json 에 초안을 썼습니다.');
}
