// **국어·영어 글쓰기 과제에 맞는 단원과 뼈대를 주는지** 본다. ₩0.
//
// 2026-09-25 실측(과제 379건):
//   · 단원을 읽어내는 비율이 **0%** 였다. 국어·영어 안내문에는 단원 이름이 없고 성취기준 코드만 있다.
//   · 국어 과제의 **42%**, 영어의 **39%** 가 「재는 뼈대」(실험·자료)를 받았다.
//     서평에 「가설과 변인 설정」·「오차·한계 분석」이 붙었고, 모델이 빈 절을 채우려고 없는 실험을
//     지어냈다 — 책 서평이 「코딩해 비교하는 연구」로 나왔다(운영 검사 2026-09-22).
//
// 원인 둘. ① 단원을 못 읽는다. ② 학교가 방식표 칸을 다 켜 두어(「…실험실습…」 열한 개)
// 「실험」 규칙이 글쓰기 과제에 먼저 걸린다.
import { readFileSync } from 'node:fs';
import { decideStructure, pickReportShape } from '../../../admission_worker_skeleton/report_shape_v1.mjs';
import { standardAreas, unitFromStandard } from '../../../admission_worker_skeleton/unit_from_standard_v1.mjs';
import { isWritingTask, writingNotice } from '../../../public/keyword-engine/assets/js/shared/writing_task_v1.js';
import { COLLECTION, removeUnreadAuthority, resolveCollectionKind } from '../../../admission_worker_skeleton/report_stages_v1.mjs';

let fail = 0;
const bad = (why) => { console.log(`  ✗ ${why}`); fail += 1; };
const ok = (cond, why) => { if (!cond) bad(why); };

const table = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/unit_from_standard.v1.json', 'utf8'));
const shapes = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/report_shape_index.v1.json', 'utf8'));
const axis = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json', 'utf8'));

// 학교가 학년 공통 양식으로 칸을 다 켜 둔 방식표. 실제 기록에서 가져온 모양이다.
const FORM = '서술·논술,구술발표,토의토론,조사관찰보고서,실험실습,실기시연,포트폴리오,프로젝트,교사관찰기록,자기평가,동료평가';

// ── ① 성취기준 코드로 단원을 읽어낸다 ────────────────────
// 과제 글이 단원을 **분명히 말하는** 것만 정확히 못박는다.
// 「멋진 신세계 속 역설에 관해 논평하기」처럼 글만 봐서는 「주제 파악」인지 「세부 정보」인지 알 수 없는
// 과제도 많다. 그때는 영역(이해/표현)이 맞고 그 영역의 단원 하나가 붙으면 된 것으로 본다 —
// 단원은 논문·축을 고르는 데 쓰이고, 같은 영역 안이면 크게 어긋나지 않는다.
const UNITS = [
  ['영어', '피지컬 AI 사용에 관한 근거 기반 논설문 쓰기 [10공영1-02-03]', '표현', '문단 쓰기와 에세이 구성'],
  ['영어', '탐구 기반 융합 주제 영어 발표 [10공영1-02-02]', '표현', '발표와 토론'],
  ['영어', '영미 문학 작품을 읽고 감상문 쓰기 [10공영1-01-03]', '이해', '영미 문학 읽기와 감상'],
  ['영어', '영어권 문화를 우리 문화와 비교하기 [10공영1-01-04]', '이해', '영어권 문화 이해와 비교'],
  ['공통국어1', '서평 작성하기 [10공국1-02-01]', '읽기', '문학·독서와 주체적 수용'],
  ['공통국어1', '현대시 감상 및 발표 [10공국1-05-02]', '문학', '서정 갈래와 시적 표현'],
  ['공통국어1', '실생활 속 음운의 변동 분석하기 [10공국1-04-01]', '문법', '음운 변동과 국어 규범'],
  ['공통국어1', '매체 독서 비평 [10공국1-06-02]', '매체', '매체 비평과 비판적 수용'],
];
for (const [subject, text, area, want] of UNITS) {
  const got = unitFromStandard(subject, text, table);
  ok(got.area === area, `${text.slice(0, 30)} → 영역 ${got.area || '(못 읽음)'} (바라는 것 ${area})`);
  ok(got.unit === want, `${text.slice(0, 30)} → ${got.unit || '(못 읽음)'} (바라는 것 ${want})`);
}

// 글만 봐서는 알 수 없는 과제 — 영역만 맞으면 된다
for (const [subject, text, area] of [
  ['영어', '멋진 신세계 속 역설에 관해 논평하기 [10공영1-01-02]', '이해'],
  ['영어', '영어 학술 텍스트 요약하기 [12영Ⅰ-01-02]', '이해'],
]) {
  const got = unitFromStandard(subject, text, table);
  ok(got.area === area, `${text.slice(0, 30)} → 영역 ${got.area || '(못 읽음)'}`);
  ok((table.byArea?.[subject]?.[area] || []).includes(got.unit), `${text.slice(0, 30)} → ${got.unit} 은 ${area} 영역 단원이 아니다`);
}

// 학기 전체 성취기준을 다 적어 둔 안내문은 쓰지 않는다 — 이 과제가 무엇인지 말해 주지 않는다.
{
  const many = '수행평가 [10공국1-01-01] [10공국1-02-01] [10공국1-03-01] [10공국1-05-02]';
  const got = unitFromStandard('공통국어1', many, table);
  ok(!got.unit, `영역이 넷이면 쓰지 말아야 한다 — ${got.unit}`);
  ok(/나열/.test(got.why), `이유를 남겨야 한다 — ${got.why}`);
  ok(standardAreas(many).size === 4, '영역을 네 개로 세어야 한다');
}
// 다른 과목 코드가 섞여 와도 이 과목 것만 본다
{
  const got = unitFromStandard('영어', '수행평가 [10공국1-05-02]', table);
  ok(!got.unit, `다른 과목 코드로 단원을 정하면 안 된다 — ${got.unit}`);
}
// 코드가 없으면 억지로 고르지 않는다
{
  const got = unitFromStandard('영어', '자유 주제 에세이 쓰기', table);
  ok(!got.unit, `코드가 없으면 비워야 한다 — ${got.unit}`);
}
// 표에 적은 단원 이름이 우리 축에 정말 있어야 한다 — 없는 이름은 조용히 안 걸린다
{
  const known = new Set();
  for (const one of Object.values(axis.axes || {})) if (one?.concept) known.add(one.concept);
  for (const [, byArea] of Object.entries(table.byArea || {})) {
    for (const [area, units] of Object.entries(byArea)) {
      for (const unit of units) ok(known.has(unit), `축에 없는 단원: ${area} · ${unit}`);
    }
  }
}

// ── ② 글쓰기 과제에 재는 뼈대를 주지 않는다 ───────────────
const WRITING = [
  ['서평 작성하기', '책을 읽고 서평을 쓴다'],
  ['논증하는 글쓰기', '쟁점을 정해 주장과 근거를 갖춘 글을 쓴다'],
  ['문화 유산 비교대조 영어 에세이 쓰기', '두 문화 유산을 비교대조하여 영어 에세이를 쓴다'],
  ['맥락을 통한 문학 소통 및 글쓰기', '작품 선정 및 맥락에 따른 작품 분석하기'],
  ['운문 창작 및 작품 소개하기', '음운의 리듬을 담은 시를 창작한다'],
];
const MEASURING = /experiment|data_interpretation|data_analysis|modeling|problem_design|algorithm|engineering/;
for (const [name, desc] of WRITING) {
  const got = decideStructure({ taskName: name, taskDescription: desc, taskType: FORM, collectionKind: 'none' });
  ok(!MEASURING.test(got.structure), `${name} → ${got.structure} (재는 뼈대가 붙었다)`);
  const shape = pickReportShape({ taskName: name, taskDescription: desc, taskType: FORM, collectionKind: 'none', subjectGroup: '국어' }, shapes);
  ok((shape.sections || []).length >= 4, `${name} → 절이 ${(shape.sections || []).length}개뿐`);
  const secs = (shape.sections || []).join(' ');
  ok(!/변인|오차|실험 조건|측정/.test(secs), `${name} → 절에 실험 말이 남았다: ${secs}`);
}

// 무엇을 쓰는 글인지에 따라 뼈대가 갈려야 한다 — 논증문에 「책 선정 이유」를 주면 안 된다
{
  const arg = decideStructure({ taskName: '논증하는 글쓰기', taskDescription: '쟁점을 정해 주장을 쓴다', taskType: FORM, collectionKind: 'none' });
  ok(arg.structure === 'structure_argumentative_writing', `논증문 뼈대여야 한다 — ${arg.structure}`);
  const make = decideStructure({ taskName: '운문 창작', taskDescription: '시를 창작한다', taskType: FORM, collectionKind: 'none' });
  ok(/creative/.test(make.structure), `창작 뼈대여야 한다 — ${make.structure}`);
}

// ── 재는 과제는 그대로 재는 뼈대를 받는다 ────────────────
const MEASURING_TASKS = [
  ['효소의 온도별 반응 실험', '온도를 바꿔 시간을 세 번씩 재어 표에 적는다', '실험실습', 'measurement'],
  ['미세먼지 자료 해석', '공개 통계에서 5년 자료를 옮겨 그래프로 분석한다', '조사관찰보고서', 'dataset'],
];
for (const [name, desc, type, kind] of MEASURING_TASKS) {
  const got = decideStructure({ taskName: name, taskDescription: desc, taskType: type, collectionKind: kind });
  ok(MEASURING.test(got.structure), `${name} → ${got.structure} (재는 뼈대가 아니다)`);
}

// 방식표 칸이 다섯 개 이상이면 방식 정보로 쓰지 않는다
{
  const withForm = decideStructure({ taskName: '서평 작성하기', taskDescription: '책을 읽고 서평을 쓴다', taskType: FORM, collectionKind: 'none' });
  const withOne = decideStructure({ taskName: '서평 작성하기', taskDescription: '책을 읽고 서평을 쓴다', taskType: '논술', collectionKind: 'none' });
  ok(withForm.structure === withOne.structure, `양식표가 결과를 바꿨다 — ${withForm.structure} vs ${withOne.structure}`);
}

// ── ③ 글쓰기 과제는 숫자 표를 받지 않는다 ────────────────
// 뼈대만 고쳐서는 모자랐다. **수집 방식 판정**도 방식표를 그대로 보고 있어서
// 서평 과제가 「직접 재는 과제」로 가 학생에게 숫자 표를 채우라고 시켰다(국어·영어 87건).
for (const [name, desc] of WRITING) {
  const kind = resolveCollectionKind({ subject: '공통국어1', subjectGroup: '국어',
    taskName: name, taskDescription: desc, taskType: FORM });
  ok(kind !== COLLECTION.MEASUREMENT, `${name} → ${kind} (숫자 표를 받는다)`);
}
{
  const kind = resolveCollectionKind({ subject: '생명과학', subjectGroup: '과학',
    taskName: '효소 실험 보고서', taskDescription: '온도별로 시간을 세 번씩 재어 표에 적는다', taskType: FORM });
  ok(kind === COLLECTION.MEASUREMENT, `실험 과제가 숫자 표를 못 받는다 — ${kind}`);
}

// ── ④ 읽지 않은 연구를 근거로 대지 않는다 ─────────────────
// 우리가 붙인 논문은 「더 읽어 볼 자료 (아직 읽지 않았어요)」인데 본문이 「최근 연구에 따르면」이라
// 썼다(국어·영어 10장 중 두 장). 논문은 프롬프트에 넣지 않으니 그 「최근 연구」는 지어낸 것이다.
for (const line of ['최근 연구에 따르면 구성이 설득력을 바꾼다.', '여러 연구에서 같은 경향이 보고되었다.',
  '학계에서는 이를 정론으로 본다.', '선행 연구는 이를 뒷받침한다.']) {
  ok(removeUnreadAuthority(line, []).removed === 1, `지워야 한다 — ${line}`);
}
for (const [line, read] of [
  ['기후변화 감시 보고서 2025에 따르면 기온이 올랐다.', ['기후변화 감시 보고서 2025']],
  ['내가 잰 값에서는 25도에서 가장 빨랐다.', []],
  ['교과서에 나오듯 물은 100도에서 끓는다.', []],
]) {
  ok(removeUnreadAuthority(line, read).removed === 0, `남겨야 한다 — ${line}`);
}

// ── ⑤ 화면은 **준 것만** 말한다 ──────────────────────────
// 늘 「읽어 볼 자료와 글의 뼈대를 드릴게요」라고 적었더니, 국어·영어 글쓰기 과제 52건 중
// 49건(94%)에서 자료가 하나도 안 붙는데도 그렇게 말했다(2026-09-25 전수 측정).
// 못 주는 것을 준다고 말하면 학생은 없는 것을 찾다가 프로그램을 못 믿게 된다.
{
  const task = { taskName: '서평 작성하기', taskDescription: '책을 읽고 서평을 쓴다' };
  const plain = (text) => String(text).replace(/<[^>]+>/g, '');

  const none = plain(writingNotice(task, {}));
  ok(/찾지 못했어요/.test(none), `자료가 없으면 없다고 말해야 한다 — ${none}`);
  ok(!/읽어 볼 논문|읽어 볼 책/.test(none), `없는 자료를 준다고 말했다 — ${none}`);
  ok(/뼈대/.test(none), '뼈대는 늘 준다고 말해야 한다');
  ok(/직접 찾아서/.test(none), '직접 찾아야 한다는 것을 알려야 한다');

  const two = plain(writingNotice(task, { papers: 2 }));
  ok(/읽어 볼 논문 2편/.test(two), `준 개수를 말해야 한다 — ${two}`);
  ok(!/찾지 못했어요/.test(two), `준 것이 있는데 못 찾았다고 말했다 — ${two}`);

  const both = plain(writingNotice(task, { papers: 1, books: 1 }));
  ok(/논문 1편/.test(both) && /책 1권/.test(both), `둘 다 말해야 한다 — ${both}`);

  // 글쓰기 과제가 아니면 아무 말도 안 한다
  const measuring = { taskName: '효소 반응 실험', taskDescription: '온도를 바꿔 시간을 재어 표에 적는다' };
  ok(!isWritingTask(measuring), '실험 과제를 글쓰기로 보면 안 된다');
  ok(writingNotice(measuring, { papers: 2 }) === '', '실험 과제에는 이 안내를 붙이지 않는다');
}

if (fail) { console.log(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 성취기준 코드로 단원을 읽어내고, 글쓰기 과제에는 글쓰기 뼈대를 준다');
