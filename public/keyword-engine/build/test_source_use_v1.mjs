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
import { 조사 } from '../../../admission_worker_skeleton/report_guide_v1.mjs';

const here = (name) => new URL(name, import.meta.url);
const worker = (await readFile(here('../../../admission_worker_skeleton/worker.js'), 'utf8')).replace(/\r\n/g, '\n');
const toml = await readFile(here('../../../admission_worker_skeleton/wrangler.production-report-v2.toml'), 'utf8');
const archive = await readFile(here('../../../admission_worker_skeleton/report_archive_v1.mjs'), 'utf8');

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

// ⑧ **켜 놓고 일하는지 볼 수 있어야 한다.** 이 저장소에서 두 번 겪었다 — 만들어 두고 아무도
//    부르지 않거나, 결과를 아무 데도 남기지 않아 조용히 안 돌아도 몰랐다.
{
  ok('S8 응답에 자료 고르기 결과를 실어 보낸다', worker.includes('reviewSources: reviewInfo ? {'));
  ok('S8 판단이 왔는지·무엇을 지어냈는지 함께 보낸다',
    worker.includes('judged: Boolean(reviewInfo.sources?.used)')
    && worker.includes('faked: (reviewInfo.sources?.faked || [])'));
  ok('S8 D1 에도 남긴다 — 나중에 되짚을 수 있어야 한다',
    archive.includes('sourceJudged: Boolean(meta.review.sources?.used)')
    && archive.includes('sourceFaked:'));
}

// ⑨ **판단할 것과 보여 줄 것이 같아야 한다.**
//
// 2026-09-30 운영 실행에서 잡았다. 검수에게는 referencePapers 만 보여 주었는데, 최종 보고서의
// 참고문헌은 ingredients(교과 확장 재료)에서 온다. 그래서 검수는 정작 참고문헌에 들어갈 논문을
// 한 번도 못 보고 판단했고, 「쓴 자료 없음」이라고 해도 논문이 그대로 남았다.
{
  const prompt = buildReviewPrompt(보고서, {
    subject: '확률과 통계', selectedConcept: '모집단과 표본', taskDescription: '표본 추정 탐구',
    ingredients: { papers: [{ title: '기계학습 모델을 활용한 재입원 예측' }], research: [{ title: '표본 설계 연구' }] },
  });
  ok('S9 검수가 ingredients 논문을 본다', prompt.includes('기계학습 모델을 활용한 재입원 예측'));
  ok('S9 검수가 ingredients 대학 연구도 본다', prompt.includes('표본 설계 연구'));
  ok('S9 워커가 ingredients 도 거른다',
    worker.includes('papers: 남기기(input.ingredients.papers, (one) => one?.title)')
    && worker.includes('research: 남기기(input.ingredients.research, (one) => one?.title)'));
}

// ⑩ **뺀 뒤에 「요구했는데 없는 것」을 다시 세야 한다.**
//
// 2026-09-30 운영 실행에서 잡았다. 통계를 요구한 과제에서 통계가 하나 붙어 있었고, 검수가 「안 썼다」며
// 그것을 뺐다. 그런데 missingDemanded 는 모델을 부르기 **전에** 이미 셌으므로 「있음」으로 남아 있었다.
// 학생은 통계 없는 보고서를 받고 아무 안내도 못 받았다. 세는 자리가 뺀 자리보다 앞에 있으면 안 된다.
{
  ok('S10 뺀 뒤에 다시 센다', worker.includes('if (뺀자료) {')
    && /if \(뺀자료\) \{[\s\S]{0,400}input\.missingDemanded = missingDemanded\(/.test(worker));
}

// ⑪ 학생이 읽는 글의 조사. 「통계 자료을 요구했는데」가 화면에 나왔다(운영 실행 2026-09-30).
{
  ok('S11 받침 없는 말 뒤에는 「를」', 조사('통계 자료', '을', '를') === '통계 자료를');
  ok('S11 받침 있는 말 뒤에는 「을」', 조사('논문', '을', '를') === '논문을' && 조사('책', '을', '를') === '책을');
  ok('S11 여러 개를 이어 붙인 뒤에도 마지막 글자를 본다', 조사('통계 자료·논문', '을', '를') === '통계 자료·논문을');
}

console.log(`참고문헌 고르기: ${pass}개 통과${fails.length ? ` · 실패 ${fails.length}` : ''}`);
if (fails.length) { for (const one of fails) console.error('  실패:', one); process.exit(1); }
assert.ok(pass > 0);
