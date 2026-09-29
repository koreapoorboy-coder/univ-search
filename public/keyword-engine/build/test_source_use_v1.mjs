// **참고문헌에 무엇을 남길지는 검수가 판단하고, 그 말이 맞는지 우리가 되짚는다.**
//
// 사용자 질문 2026-09-30: 「설계서를 잡고 그 다음에 참고문헌을 넣을 수 있게 검수하는 API를 넣으면
// 너나 GPT가 판단을 할 수 있는 거야?」 — 할 수 있는 일과 못 하는 일을 갈라서 이렇게 정했다:
//   · 「이 단원에 우리가 가진 자료가 있나」  → 세는 일. 단원표가 정한다.
//   · 「이 보고서가 그 자료를 실제로 썼나」  → 읽는 일. 검수가 정한다.
// 그런데 모델은 **읽은 척할 수 있다.** 그 말을 믿고 참고문헌에 남기면 학생이 안 쓴 자료를 썼다고
// 적어 내게 된다. 그래서 where 에 옮겨 적은 대목이 본문에 정말 있을 때만 「썼다」로 센다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyReview, buildReviewPrompt, reviewSchema, usedSources } from '../../../admission_worker_skeleton/report_review_v1.mjs';

const here = (name) => new URL(name, import.meta.url);
const worker = (await readFile(here('../../../admission_worker_skeleton/worker.js'), 'utf8')).replace(/\r\n/g, '\n');
const toml = await readFile(here('../../../admission_worker_skeleton/wrangler.production-report-v2.toml'), 'utf8');

let pass = 0;
const fails = [];
const ok = (name, got) => { if (got) pass += 1; else fails.push(name); };

const 보고서 = {
  reportTitle: '식초 양에 따른 이산화탄소 발생량',
  sections: [
    { title: '탐구 질문', body: '식초의 양을 늘리면 이산화탄소가 더 많이 나올까?' },
    { title: '결과 정리', body: '통계청 소비자물가지수 자료에서 가격이 해마다 오른 것을 확인했다. 평균 부피는 12.4 mL였다.' },
  ],
};

// ── ① 옮겨 적은 대목이 본문에 있으면 「썼다」로 센다 ──────────────────────
{
  const { used, faked } = usedSources(보고서, [
    { source: '소비자물가지수', used: true, where: '통계청 소비자물가지수 자료에서 가격이 해마다 오른 것을 확인했다' },
  ]);
  ok('S1 본문에 있는 대목을 댔으면 「썼다」로 센다', used?.has('소비자물가지수') === true);
  ok('S1 그때는 지어냈다고 보지 않는다', faked.length === 0);
}

// ── ② 본문에 없는 대목을 대면 믿지 않는다 ────────────────────────────
{
  const { used, faked } = usedSources(보고서, [
    { source: '국민건강영양조사', used: true, where: '국민건강영양조사에서 비만율이 늘었음을 확인하였다' },
  ]);
  ok('S2 본문에 없는 대목을 댄 자료는 「썼다」로 세지 않는다', used?.has('국민건강영양조사') === false);
  ok('S2 그것을 지어낸 것으로 따로 적어 둔다', faked.includes('국민건강영양조사'));
}

// ── ③ 너무 짧은 조각으로는 확인이 안 된다 ────────────────────────────
{
  const { used } = usedSources(보고서, [{ source: '아무자료', used: true, where: '했다' }]);
  ok('S3 열 글자가 안 되는 조각으로는 확인하지 않는다', used?.has('아무자료') === false);
}

// ── ④ 자료 판단이 아예 안 왔으면 아무것도 빼지 않는다 ─────────────────────
{
  ok('S4 sourceUse 가 비었으면 used 는 null 이다', usedSources(보고서, []).used === null);
  ok('S4 sourceUse 가 없어도 null 이다', usedSources(보고서, undefined).used === null);
  // **이것이 안전 장치다.** 검수가 이 일을 못 했을 때 참고문헌이 통째로 비면 더 나쁘다.
  ok('S4 그때 워커는 아무것도 빼지 않는다', /const 쓴것 = checked\.review\?\.sources\?\.used \|\| null;/.test(worker)
    && /if \(쓴것\) \{/.test(worker));
}

// ── ⑤ applyReview 가 자료 판단을 함께 돌려준다 ───────────────────────
{
  const out = applyReview(보고서, { findings: [], sections: [],
    sourceUse: [{ source: '소비자물가지수', used: true, where: '통계청 소비자물가지수 자료에서 가격이 해마다 오른 것을 확인했다' }] });
  ok('S5 흠이 없어도 자료 판단은 돌려준다', out.review?.sources?.used?.has('소비자물가지수') === true);
}

// ── ⑥ 검수에게 아홉째 일을 시켰나 ────────────────────────────────
{
  const prompt = buildReviewPrompt(보고서, { subject: '화학', selectedConcept: '물질의 양과 화학 반응식',
    taskDescription: '식초와 베이킹소다 반응 탐구', referenceDatasets: [{ title: '소비자물가지수', org: '통계청' }] });
  ok('S6 프롬프트에 자료 고르기 지시가 있다', /sourceUse 에 적는다/.test(prompt));
  ok('S6 「주제가 비슷한 것은 쓴 것이 아니다」를 못 박았다', /주제가 비슷한 것은 쓴 것이 아니다/.test(prompt));
  ok('S6 자료를 더 쓰라고 보고서를 고치지 말라고 했다', /자료를 더 쓰라고 보고서를 고치지는 않는다/.test(prompt));
  const schema = reviewSchema();
  ok('S6 틀에 sourceUse 가 있고 반드시 받는다', schema.required.includes('sourceUse')
    && schema.properties.sourceUse?.items?.required?.includes('where'));
}

// ── ⑦ 검수가 켜져 있고, 통계 후보가 넓어졌나 ──────────────────────────
{
  ok('S7 검수가 켜져 있다', /^REPORT_REVIEW = "on"$/m.test(toml));
  ok('S7 검수가 켜지면 통계 후보를 셋까지 준다', /검수켜짐 \? 3 : 1/.test(worker));
  // 검수가 꺼져 있으면 고를 사람이 없으니 예전처럼 하나만 준다.
  ok('S7 꺼지면 하나만 준다', /const 검수켜짐 = String\(env\.REPORT_REVIEW \|\| 'on'\)\.toLowerCase\(\) !== 'off';/.test(worker));
}

console.log(`참고문헌 고르기: ${pass}개 통과${fails.length ? ` · 실패 ${fails.length}` : ''}`);
if (fails.length) { for (const one of fails) console.error('  실패:', one); process.exit(1); }
assert.ok(pass > 0);
