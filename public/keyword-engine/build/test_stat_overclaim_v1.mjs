// **반복 세 번의 범위로 통계를 말하지 못하게** 막았는지 본다. ₩0.
//
// 2026-09-24: 다 지은 보고서 5장을 gpt-5 에게 읽혀 템플릿 흠을 모았다(₩883, tools/review_reports_open.mjs).
// 가장 무거운 흠이 이것이었다 — 그리고 **AI 가 지어낸 것이 아니라 우리가 시킨 것**이었다.
//
//   「차이의 신뢰성을 흔들림과 함께 보면, 10 °C와 25 °C의 평균 차이는 8.76초로
//    두 조건의 흔들림(1.3초, 0.8초)보다 훨씬 크다」
//   → 최댓값−최솟값(n=3)을 유의성 근거로 쓴 것이다. 통계적으로 성립하지 않는다.
//
// 차이를 견주는 것 자체는 정직하다. 문장을 지우면 학생이 낼 분석이 사라진다.
// 그래서 **주장의 세기만 낮춘다.** 그리고 「직전 조건 대비」도 함께 넣었다 —
// 「'3월 대비' 변화율만 있어 전월 대비 전환점 분석을 수행하지 못했다」는 지적이 있었다.
import { STAGE, computeStats, finalizeStageOutput, normalizeStudentData, softenStatClaims, summaryForPrompt } from '../../../admission_worker_skeleton/report_stages_v1.mjs';

let fail = 0;
const bad = (why) => { console.log(`  ✗ ${why}`); fail += 1; };
const ok = (cond, why) => { if (!cond) bad(why); };

// ── 과한 주장은 말을 바꿔 준다 ────────────────────────────
const SOFTEN = [
  ['두 조건의 차이는 통계적으로 유의미하다.', /통계적으로/],
  ['유의미한 차이가 나타났다.', /유의미/],
  ['평균이 유의미하게 높았다.', /유의미/],
  ['신뢰구간을 구해 비교하였다.', /신뢰구간/],
  ['표준오차보다 큰 차이였다.', /표준오차/],
  ['t검정을 실시했다.', /검정을/],
  ['통계적 유의성을 확인하였다.', /유의성/],
];
for (const [before, gone] of SOFTEN) {
  const out = softenStatClaims(before);
  ok(out.changed > 0, `고쳐야 한다 — ${before}`);
  ok(!gone.test(out.body), `아직 남았다 — ${out.body}`);
}

// 정직한 문장은 건드리지 않는다
for (const keep of [
  '차이가 반복 폭보다 컸다.',
  '반복 측정의 흔들림은 0.8초였다.',
  '평균은 9.47초로 가장 짧았다.',
  '반복에서 생긴 흔들림만으로는 설명되지 않는 차이였다.',
]) {
  const out = softenStatClaims(keep);
  ok(out.changed === 0, `건드리지 말아야 한다 — ${keep} → ${out.body}`);
}

// ── 관문이 실제로 세기를 낮춘다 ───────────────────────────
{
  const data = normalizeStudentData({ measurementName: '도달 시간', unit: '초',
    conditions: [{ label: '10 °C', values: ['18.2', '17.6', '18.9'] }, { label: '25 °C', values: ['9.4', '9.9', '9.1'] }] });
  const input = { subject: '생명과학', reportStage: STAGE.FINAL, studentData: data };
  const long = (seed) => `${seed} `.repeat(14).trim();
  const body = `${long('온도에 따라 도달 시간이 달라졌다.')} 두 조건의 차이는 통계적으로 유의미하다.`;
  const { parsed } = finalizeStageOutput(STAGE.FINAL, { reportTitle: '온도와 효소 반응 탐구',
    sections: [{ title: '자료 해석', body }] }, input);
  const out = parsed.sections[0].body;
  ok(!/통계적으로\s*유의/.test(out), `관문이 못 막았다 — ${out.slice(-70)}`);
  ok(/흔들림만으로는 설명되지 않는/.test(out), `말을 바꿔 줘야 한다 — ${out.slice(-70)}`);
  // 문장을 통째로 지우면 분석이 사라진다
  ok(/온도에 따라 도달 시간이 달라졌다/.test(out), '원래 분석은 남아야 한다');
}

// ── 직전 조건 대비를 준다 ────────────────────────────────
{
  const data = normalizeStudentData({ measurementName: '판매량', unit: '건',
    conditions: [{ label: '3월', values: ['120'] }, { label: '4월', values: ['150'] },
      { label: '5월', values: ['140'] }, { label: '6월', values: ['200'] }] });
  const stats = computeStats(data);
  const rows = stats.rows;
  ok(rows[0].diff_from_prev === null, '첫 조건은 직전이 없으므로 비어 있어야 한다');
  ok(rows[1].percent_from_prev === 25, `4월은 직전 대비 25% 여야 한다 — ${rows[1].percent_from_prev}`);
  // 꺾인 곳이 보여야 한다: 첫 조건 대비로는 5월도 +16.7% 라 오르는 것처럼 보인다
  ok(rows[2].percent_from_first > 0, '첫 조건 대비로는 5월이 오른 것으로 보인다');
  ok(rows[2].percent_from_prev < 0, `직전 대비로는 5월이 꺾여야 한다 — ${rows[2].percent_from_prev}`);
  const summary = summaryForPrompt(stats);
  const one = summary.조건별결과[2];
  ok('직전조건대비변화율' in one, `프롬프트 요약에 직전 대비가 있어야 한다 — ${Object.keys(one).join(',')}`);
}

// ── 내부 이름이 본문에 새지 않는다 ────────────────────────
{
  const data = normalizeStudentData({ measurementName: '값', unit: '',
    conditions: [{ label: '가', values: ['1'] }, { label: '나', values: ['2'] }] });
  const long = (seed) => `${seed} `.repeat(14).trim();
  const { parsed } = finalizeStageOutput(STAGE.FINAL, { reportTitle: '검사용 보고서 제목입니다',
    sections: [{ title: '자료 해석', body: long('직전조건대비변화율과 첫조건과의차이를 보았다.') }] },
    { subject: '수학', reportStage: STAGE.FINAL, studentData: data });
  const out = parsed.sections[0].body;
  ok(!/직전조건대비변화율/.test(out), `붙여 쓴 내부 이름이 남았다 — ${out.slice(0, 60)}`);
  ok(/직전 조건 대비 변화율/.test(out), '사람이 읽는 말로 풀어 써야 한다');
}

if (fail) { console.log(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 반복 세 번으로 통계를 말하지 않고, 꺾인 곳은 직전 조건 대비로 보인다');
