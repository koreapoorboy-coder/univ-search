// **학생이 정상 경로를 벗어났을 때** 무슨 일이 나는가. ₩0.
//
// 런칭 전 마지막으로 남은 미검증 구간이었다(2026-09-25). 실제로 쳐 보니 하나가 뚫려 있었다:
// 안내문은 **비어 있지만 않으면** 통과했다. 「가」 한 글자, 「1234567890」, 이모지 넷으로도
// 유료 보고서가 그대로 나갔다. 돈을 내고 아무 근거 없는 글을 받는 것이 제일 나쁘다.
import { readFileSync } from 'node:fs';
import { GUIDE, guideBlocks, guideLevel, guideMessage, letterCount, scrubPersonal } from '../assets/js/shared/guide_text_v1.js';
import { isWritingTask } from '../assets/js/shared/writing_task_v1.js';
import { computeStats, normalizeStudentData, summaryForPrompt } from '../../../admission_worker_skeleton/report_stages_v1.mjs';

let fail = 0;
const ok = (cond, why) => { if (!cond) { console.log(`  ✗ ${why}`); fail += 1; } };
const read = (path) => readFileSync(path, 'utf8');

// ── ① 짧은 안내문은 막는다 ──────────────────────────────────
// 바닥은 실제 과제 7,131건의 길이를 재서 정했다. 한글·영문 8자.
// 8자 미만은 10건(0.14%)이고 거의 다 체육·음악 실기라 우리 과목이 아니다.
{
  for (const bad of ['', '   ', '가', '\n\n\n', '1234567890', '!@#$%^&*()', '😀😀😀😀', '축구 실기']) {
    ok(guideBlocks(bad), `막아야 한다 — 「${bad.slice(0, 12)}」`);
  }
  // 우리 과목에서 가장 짧은 실제 과제는 살린다.
  for (const thin of ['전기화학 실험평가', '인공지능 프로젝트']) {
    ok(!guideBlocks(thin), `막으면 안 된다 — 「${thin}」`);
    ok(guideLevel(thin) === GUIDE.THIN, `짧다고 말은 해야 한다 — 「${thin}」`);
  }
  ok(guideLevel('효소 농도에 따른 반응 속도를 측정하여 탐구보고서를 작성한다. 평가방법: 논술') === GUIDE.OK, '보통 안내문은 그냥 통과해야 한다');
  ok(letterCount('1234567890') === 0, '숫자는 과제에 대해 아무것도 말하지 않는다');
  ok(/통째로/.test(guideMessage('가')), '무엇을 하면 되는지 말해야 한다');
  ok(guideMessage('효소 농도에 따른 반응 속도를 측정하여 탐구보고서를 작성한다') === '', '멀쩡하면 아무 말도 하지 않는다');
}

// ── ② 이용권이 깎이기 전에 막는다 ───────────────────────────
{
  const worker = read('admission_worker_skeleton/worker.js');
  const at = worker.indexOf('guideBlocks(taskText(input))');
  ok(at > 0, '워커가 안내문 길이를 봐야 한다');
  // 학생 코드를 보기 전에, AI를 부르기 전에 막아야 한다. 뒤에 있으면 이용권이 깎인다.
  ok(at < worker.indexOf('모든 보고서는 학생 코드를 지나간다'), '학생 코드를 확인하기 전에 막아야 한다');
  ok(at < worker.indexOf('const prompt = buildPrompt'), 'AI를 부르기 전에 막아야 한다');
  ok(/message: say/.test(worker), '학생이 읽는 한국어 문장을 보내야 한다');
  const flow = read('public/keyword-engine/assets/js/decision_flow_v1.js');
  ok(/words\.guideBlocks\(guide\)/.test(flow), '화면도 막아야 한다 — 워커까지 가기 전에');
  ok(/__GUIDE_TEXT__/.test(read('public/keyword-engine/index.html')), '화면에 규칙을 실어야 한다');
}

// ── ③ 학생의 개인정보는 AI에게 보내지 않는다 ────────────────
// 「안내문을 통째로 붙여 넣으라」고 했으므로 이름·전화번호가 섞여 들어온다. 학생은 미성년자다.
{
  const dirty = '3학년 2반 17번 홍길동 010-1234-5678 hong@example.com 효소 실험 보고서';
  const clean = scrubPersonal(dirty);
  ok(!/010-1234-5678/.test(clean), `전화번호가 남았다 — ${clean}`);
  ok(!/hong@example\.com/.test(clean), '메일이 남았다');
  ok(!/홍길동/.test(clean), '이름이 남았다');
  ok(/효소 실험 보고서/.test(clean), `과제 내용은 남아야 한다 — ${clean}`);
  ok(/scrubPersonal\(input\.taskDescription\)/.test(read('admission_worker_skeleton/worker.js')), '워커가 지우고 보내야 한다');
}

// ── ④ 표에 이상한 값을 넣어도 터지지 않는다 ─────────────────
// 화면이 「숫자만 넣어 주세요」로 막지만, 워커도 혼자 서 있어야 한다.
{
  const base = { measurementName: '값', unit: '초' };
  const cases = [
    ['글자만', [{ label: '조건 1', values: ['가', '나'] }]],
    ['첫 조건이 0', [{ label: '조건 1', values: ['0', '0'] }, { label: '조건 2', values: ['5', '6'] }]],
    ['음수', [{ label: '조건 1', values: ['-5', '-6'] }, { label: '조건 2', values: ['-1', '-2'] }]],
    ['아주 큰 값', [{ label: '조건 1', values: ['1e12', '999999999999'] }, { label: '조건 2', values: ['1', '2'] }]],
    ['조건이 배열이 아님', 'abc'],
    ['조건이 없음', null],
  ];
  for (const [name, conditions] of cases) {
    let text = '';
    try { text = JSON.stringify(summaryForPrompt(computeStats(normalizeStudentData({ ...base, conditions })))); }
    catch (error) { ok(false, `${name} 에서 터졌다 — ${error?.message}`); continue; }
    ok(!/NaN|Infinity/.test(text), `${name} 에서 이상한 숫자가 나왔다`);
  }
  // 0 으로 나누는 자리는 값을 비워 둔다 — 「무한%」를 보여 주면 안 된다.
  const zero = summaryForPrompt(computeStats(normalizeStudentData({ ...base, conditions: [{ label: '조건 1', values: ['0', '0'] }, { label: '조건 2', values: ['5', '6'] }] })));
  ok(zero['조건별결과'][1]['첫조건대비변화율'] === null, '첫 조건이 0 이면 변화율은 비워 둔다');
}

// ── ⑤ 국어에서 빠져 있던 두 건 ──────────────────────────────
{
  for (const one of ['문학 감상 일지', '시 처방하기', '독서 일지 작성하기']) {
    ok(isWritingTask({ taskName: one, taskDescription: '' }), `${one} 은 학생 자신의 글이다 — 대신 써 주면 안 된다`);
  }
}

if (fail) { console.error(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 짧은 안내문은 막고, 개인정보는 안 보내고, 이상한 값에도 안 터진다');
