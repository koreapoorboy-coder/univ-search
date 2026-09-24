// 검수가 **보고서를 망가뜨리지 못하게** 막았는지 본다. ₩0 — AI를 부르지 않는다.
//
// 검수는 gpt-5 를 한 번 더 부르는 것이고(보고서당 약 ₩112), AI는 지어낼 수 있다.
// 그래서 검수의 답을 그대로 믿지 않는다. 여기서 막는 것은 다섯 가지다.
//   ① 보고서에 없는 문장을 지적하면 그 지적을 버린다 — 읽은 척하는 것을 막는다.
//   ② 지적이 하나도 안 남으면 보고서를 건드리지 않는다.
//   ③ 다시 쓴 글이 너무 짧아지거나 너무 길어지면 넣지 않는다 — 분량이 모자라거나 균형이 깨진다.
//   ④ 참고 자료 절은 코드가 만든다. 검수가 손대지 못한다.
//   ⑤ 다시 쓴 절은 워커가 **관문(finalizeStageOutput)에 다시 넣는다** — 지어낸 숫자는 여기서 지워진다.
import { STAGE, finalizeStageOutput, normalizeStudentData } from '../../../admission_worker_skeleton/report_stages_v1.mjs';
import { applyReview, buildReviewPrompt, keptFindings, kindLabel, mergeSections, reviewNotes, reviewSchema } from '../../../admission_worker_skeleton/report_review_v1.mjs';

let fail = 0;
const bad = (why) => { console.log(`  ✗ ${why}`); fail += 1; };
const ok = (cond, why) => { if (!cond) bad(why); };

const long = (seed) => `${seed} `.repeat(40).trim();
const report = {
  reportTitle: '온도에 따른 반응 속도 탐구',
  sections: [
    { title: '1. 탐구 동기', body: long('이 탐구를 시작한 까닭은 온도가 반응 속도를 바꾸는 것을 직접 보고 싶었기 때문이다.') },
    { title: '2. 탐구 방법', body: long('물의 온도를 20도와 40도로 두고 반응이 끝나는 시간을 재었다.') },
    { title: '3. 결과', body: long('20도에서는 40초, 40도에서는 20초가 걸렸다.') },
    { title: '4. 참고 자료', body: '국립환경과학원 「호소의 수질현황」, 2026-09-24 조회' },
  ],
};
// 관문은 **정리된** 학생 자료를 받는다. 워커가 미리 정리해서 넘긴다.
const input = { subject: '화학', selectedConcept: '반응 속도', reportStage: STAGE.FINAL,
  studentData: normalizeStudentData({ measurementName: '반응이 끝나는 시간', unit: 's',
    conditions: [{ label: '20도', values: ['40'] }, { label: '40도', values: ['20'] }] }) };

// ── ① 보고서에 없는 문장을 지적하면 버린다 ──────────────────
{
  const { kept, dropped } = keptFindings(report, [
    { section: '3. 결과', kind: 'number', quote: '20도에서는 40초', why: '표와 맞는지 보라' },
    { section: '3. 결과', kind: 'number', quote: '30도에서는 90초가 걸렸다', why: '없는 문장이다' },
  ]);
  ok(kept.length === 1, `있는 문장만 남아야 한다 — ${kept.length}개 남았다`);
  ok(dropped.length === 1 && /없는 글/.test(dropped[0].reason), '없는 문장은 버려야 한다');
}

// 띄어쓰기가 달라도 같은 문장으로 본다
{
  const { kept } = keptFindings(report, [{ section: '3. 결과', kind: 'number', quote: '20도에서는  40초', why: '왜' }]);
  ok(kept.length === 1, '띄어쓰기가 달라도 같은 문장으로 봐야 한다');
}

// ── ② 지적이 하나도 없으면 보고서를 건드리지 않는다 ──────────
{
  const out = applyReview(report, { findings: [], sections: [{ title: '3. 결과', body: long('아주 다른 글') }] });
  ok(out.sections === report.sections, '지적이 없으면 절이 그대로여야 한다');
  ok(out.review.applied.length === 0, '지적이 없으면 고친 것도 없어야 한다');
}

// 있지도 않은 문장만 지적했으면 역시 건드리지 않는다
{
  const out = applyReview(report, {
    findings: [{ section: '3. 결과', kind: 'number', quote: '이 문장은 보고서에 없다', why: '왜' }],
    sections: [{ title: '3. 결과', body: long('검수가 새로 쓴 글') }],
  });
  ok(out.sections === report.sections, '거짓 지적만 있으면 절이 그대로여야 한다');
  ok(out.review.findings.length === 0, '거짓 지적은 남지 않아야 한다');
}

// ── ③ 다시 쓴 글이 너무 짧아지면 넣지 않는다 ────────────────
{
  const titles = new Set(['3. 결과']);
  const { applied, skipped } = mergeSections(report, [{ title: '3. 결과', body: '너무 짧다' }], titles);
  ok(applied.length === 0, '짧아진 글은 넣지 말아야 한다');
  ok(skipped.length === 1 && /짧아졌다/.test(skipped[0].reason), `이유를 남겨야 한다 — ${JSON.stringify(skipped)}`);
}

// 너무 길어져도 넣지 않는다 — 늘어난 만큼은 검수가 새로 쓴 글이다
{
  const titles = new Set(['3. 결과']);
  const twice = report.sections[2].body + report.sections[2].body;
  const { applied, skipped } = mergeSections(report, [{ title: '3. 결과', body: twice }], titles);
  ok(applied.length === 0, '두 배가 된 글은 넣지 말아야 한다');
  ok(skipped.length === 1 && /길어졌다/.test(skipped[0].reason), `이유를 남겨야 한다 — ${JSON.stringify(skipped)}`);
}

// 길이가 비슷하면 넣는다
{
  const titles = new Set(['3. 결과']);
  const body = long('20도에서는 40초, 40도에서는 20초가 걸렸다. 더 빨랐다.');
  const { applied } = mergeSections(report, [{ title: '3. 결과', body }], titles);
  ok(applied.length === 1, '길이가 비슷한 글은 넣어야 한다');
}

// ── ④ 참고 자료 절은 검수가 손대지 못한다 ───────────────────
{
  const titles = new Set(['4. 참고 자료']);
  const { sections, applied } = mergeSections(report, [{ title: '4. 참고 자료', body: long('검수가 바꾼 참고 자료') }], titles);
  ok(applied.length === 0, '참고 자료 절은 검수가 못 바꿔야 한다');
  ok(sections[3].body === report.sections[3].body, '참고 자료 절 내용이 그대로여야 한다');
}

// ── 절 이름에 번호를 붙여 와도 같은 절로 찾는다 ──────────────
// 살아 있는 검수(2026-09-24, 물리·운동량)에서 gpt-5 가 절 이름을 「[7] 느낀 점」으로 적어 왔다.
// 우리 절 이름은 「느낀 점」이라 고칠 절을 못 찾았다 — 지적은 남고 아무것도 안 고쳐졌다.
for (const name of ['[3] 결과', '3. 결과', '결과', '3) 결과']) {
  const { kept } = keptFindings(report, [{ section: name, kind: 'number', quote: '20도에서는 40초', why: '왜' }]);
  ok(kept.length === 1, `「${name}」을 같은 절로 봐야 한다`);
  const body = long('20도에서는 40초, 40도에서는 20초가 걸렸다. 더 빨랐다.');
  const { applied } = mergeSections(report, [{ title: name, body }], new Set([name]));
  ok(applied.length === 1, `「${name}」으로 온 글도 넣어야 한다`);
}

// ── ⑤ 다시 쓴 글도 관문을 한 번 더 지난다 ───────────────────
// 검수가 표에 없는 숫자(「99초」)를 넣으면 그 문장은 지워져야 한다.
{
  // 길이 관문에 걸리지 않게 원래 글과 비슷한 길이로 만든다 — 여기서 보려는 것은 숫자 관문이다.
  const made = `${long('온도를 올리면 반응이 빨라진다는 것을 이 탐구에서 확인하였다.')} 60도에서는 99초가 걸렸다.`;
  const out = applyReview(report, {
    findings: [{ section: '3. 결과', kind: 'number', quote: '20도에서는 40초', why: '표와 견주라' }],
    sections: [{ title: '3. 결과', body: made }],
  });
  ok(out.review.applied.length === 1, '고친 절이 하나여야 한다');
  // 워커가 하는 것과 같다 — 고친 절을 관문에 다시 넣는다.
  const { parsed } = finalizeStageOutput(STAGE.FINAL, { ...report, sections: out.sections }, input);
  const body = (parsed.sections || []).find((one) => one.title === '3. 결과')?.body || '';
  ok(!/99/.test(body), `지어낸 숫자 99가 남았다 — ${body.slice(-80)}`);
}

// 관문을 **두 번** 돌리면 검산한 숫자가 지워진다 — 그래서 검수는 관문을 부르지 않는다.
// 2026-09-24 실측(물리·운동량): 속도 0.800 m/s, 운동량 0.400 kg·m/s 가 통째로 사라졌다.
{
  const withCalc = { ...report, calculations: [{ what: '두 시간의 곱', expression: '40 * 20', result: '800' }] };
  const once = finalizeStageOutput(STAGE.FINAL, { ...withCalc, sections: [{ title: '3. 결과', body: `${long('두 시간을 곱해 보았다.')} 그 곱은 800이었다.` }] }, input);
  const kept = /800/.test(once.parsed.sections[0].body);
  ok(kept, '관문을 한 번 돌리면 검산한 숫자가 남아야 한다');
  const twice = finalizeStageOutput(STAGE.FINAL, { ...report, sections: once.parsed.sections }, input);
  ok(!/800/.test(twice.parsed.sections[0].body), '관문을 두 번 돌리면 검산한 숫자가 지워진다 — 그래서 한 번만 돌린다');
}

// ── 검수에게 넘기는 말에 표와 자료가 들어가야 한다 ───────────
{
  const prompt = buildReviewPrompt(report, input);
  ok(/20도 = 40/.test(prompt), '학생이 적은 표가 들어가야 한다');
  ok(/온도에 따른 반응 속도 탐구/.test(prompt), '보고서 제목이 들어가야 한다');
  ok(/보고서에 실제로 있는 문장만 지적한다/.test(prompt), '지적 규칙이 들어가야 한다');
  ok(prompt.includes('4. 참고 자료'), '모든 절이 들어가야 한다');
}

// ── 설명서에 쓸 한 줄 ────────────────────────────────────
{
  const lines = reviewNotes({ findings: [{ kind: 'number', why: '표와 본문의 숫자가 달랐어요' }, { kind: 'nope', why: '없는 종류' }] });
  ok(lines.length === 1, `아는 종류만 한 줄이 되어야 한다 — ${JSON.stringify(lines)}`);
  ok(/표의 숫자와 본문의 숫자가 다르다/.test(lines[0]), '종류 이름이 한글로 나와야 한다');
  ok(kindLabel('overreach').length > 0, '여덟 종류에 모두 한글 이름이 있어야 한다');
}

// ── 스키마가 검수 종류를 묶어 둔다 ────────────────────────
{
  const schema = reviewSchema();
  const kinds = schema.properties.findings.items.properties.kind.enum;
  ok(kinds.length === 8, `검수 종류가 여덟 개여야 한다 — ${kinds.length}개`);
  ok(schema.properties.sections.items.properties.body.minLength >= 150, '다시 쓴 글에 최소 길이가 있어야 한다');
}

if (fail) { console.log(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 검수는 절을 고쳐 돌려줄 수만 있고, 없는 문장을 지적하거나 분량을 바꾸거나 관문을 넘을 수는 없다');
