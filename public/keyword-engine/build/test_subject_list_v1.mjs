// **학생이 고를 수 있는 과목이 우리가 할 수 있는 과목과 같은가.** ₩0.
//
// 유료 프로그램에서 제일 나쁜 것은 **못 하는 것을 고르게 해 놓는 것**이다.
// 영어를 뺀 이유(2026-09-25 전수 측정, 영어 과제 363건):
//   · 글이 하나도 안 나오는 과제 195건(54%) — 발표·듣기·어휘·수업 참여
//   · 우리가 제대로 값을 하는 과제 34건(9%)
//   · 채점 요소에 어휘·문법·철자가 든 과제 24% (국어 8% · 과학 0%) —
//     우리가 영어 글을 써 주면 재려는 것을 대신해 버린다
import { readFileSync } from 'node:fs';

let fail = 0;
const ok = (cond, why) => { if (!cond) { console.log(`  ✗ ${why}`); fail += 1; } };
const read = (path) => readFileSync(path, 'utf8');

const html = read('public/keyword-engine/index.html');
// 고르는 칸에 실제로 들어 있는 과목만 뽑는다. 주석은 세지 않는다.
const picked = [...html.matchAll(/<option value="([^"]+)" data-subject-group="([^"]+)">/g)].map((m) => [m[1], m[2]]);
ok(picked.length >= 25, `과목이 들어 있어야 한다 — ${picked.length}개`);

// ── ① 영어는 고를 수 없다 ────────────────────────────────────
ok(!picked.some(([value]) => value === '영어'), '영어가 아직 목록에 있다');
ok(!picked.some(([, group]) => group === '영어'), '영어 갈래가 아직 목록에 있다');
ok(/영어는 넣지 않는다/.test(html), '왜 뺐는지 코드에 적혀 있어야 한다');
ok(/재려는 것을 대신해 버린다/.test(html), '가장 중요한 이유(채점 대상)가 적혀 있어야 한다');

// 드롭다운을 다시 그리는 쪽에도 없어야 한다 — 한쪽만 빼면 되살아난다
const filter = read('public/keyword-engine/assets/js/ui_subject_group_filter_v222.js');
ok(!/\{ value:"영어"/.test(filter), '드롭다운 목록에 영어가 남아 있다');

// 못 고르는 과목을 안내할 필요가 없다
const notice = read('public/keyword-engine/assets/js/subject_support_notice.js');
ok(!/^\s*"영어": \d/m.test(notice), '「확충 중」 안내에 영어가 남아 있다');
ok(!/"영어", "한국사"/.test(notice), '「확충 중」 목록에 영어가 남아 있다');

// ── ② ₩0 전수 점검도 영어를 세지 않는다 ──────────────────────
// 고를 수 없는 과목을 점수에 넣으면 점검 숫자가 사실과 달라진다.
const site = read('tools/site_subject.mjs');
ok(!/영어: "영어"/.test(site), '점검이 아직 영어를 고를 수 있는 과목으로 본다');

// ── ③ 국어는 남아 있다 ──────────────────────────────────────
// 국어는 글이 중심이고(56%), 한국어로 쓰면 그대로 제출물이 되고, 채점이 언어 정확성이 아니다(8%).
for (const one of ['공통국어1', '공통국어2']) {
  ok(picked.some(([value]) => value === one), `${one} 이 목록에 있어야 한다`);
}
// 런칭 과목도 그대로여야 한다
for (const one of ['공통수학1', '통합과학1', '물리', '화학', '생명과학', '지구과학', '정보']) {
  ok(picked.some(([value]) => value === one), `${one} 이 목록에 있어야 한다`);
}

// ── ④ 두 목록이 서로 같아야 한다 ────────────────────────────
// index.html 과 드롭다운을 다시 그리는 목록이 어긋나면, 골랐는데 사라지는 과목이 생긴다.
const inFilter = new Set([...filter.matchAll(/\{ value:"([^"]+)"/g)].map((m) => m[1]));
for (const [value] of picked) ok(inFilter.has(value), `드롭다운 목록에 ${value} 이 없다`);
for (const value of inFilter) ok(picked.some(([one]) => one === value), `고르는 칸에 ${value} 이 없다`);

// ── ⑤ 단원이 0개인 과목은 목록에 없어야 한다 ─────────────────
// 고르면 단원도 자료도 없는 보고서가 나온다. 영어를 뺄 때 같이 찾았다 —
// 「생물의 유전」이 index.html 에는 없는데 드롭다운 목록에만 있었다(단원 0개, 논문 묶음 없음).
{
  const axis = JSON.parse(read('public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json'));
  const unitsOf = (subject) => new Set(Object.values(axis.axes || {})
    .filter((one) => one.subject === subject).map((one) => one.concept)).size;
  const offered = new Set([...picked.map(([value]) => value), ...inFilter]);
  for (const subject of offered) ok(unitsOf(subject) > 0, `${subject} 은 단원이 0개인데 고를 수 있다`);
}

if (fail) { console.error(`\n실패 ${fail}건`); process.exit(1); }
console.log(`통과 — 고를 수 있는 과목 ${picked.length}개, 영어는 없다`);
