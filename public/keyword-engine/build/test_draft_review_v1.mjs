// 설계서 검수가 **설계서를 망가뜨리지 못하게** 막았는지 본다. ₩0 — AI를 부르지 않는다.
//
// 왜 설계서도 검수하나. 처음에는 「아직 숫자가 없어 맞출 것이 없다」고 빼 두었다.
// 그건 여덟 가지 중 하나(number)에만 맞는 말이었다. 설계서 흠은 더 비싸다 —
// 최종 보고서는 다시 만들면 되지만, 설계서에 통제 변인이 빠져 있으면 학생은 그 계획대로
// 가서 엉뚱하게 재고 온다. **실험실에 다녀온 뒤에는 못 고친다.**
//
// 여기서 막는 것:
//   ① 설계서에 없는 문장을 지적하면 버린다.
//   ② 표 틀은 **조건 개수가 크게 달라지면** 받지 않는다 — 학생이 낼 표의 크기는 검수가 정할 일이 아니다.
//   ③ 표 틀 얘기를 하는 지적이 없으면 표 틀을 건드리지 않는다.
//   ④ 반복 횟수(trials)는 검수가 못 바꾼다 — 모으는 방식에 따라 코드가 정한다.
//   ⑤ 다시 쓴 절은 워커가 관문(finalizeStageOutput → sanitizeDataTemplate)에 다시 넣는다.
import { COLLECTION, STAGE, finalizeStageOutput } from '../../../admission_worker_skeleton/report_stages_v1.mjs';
import { applyDraftReview, buildDraftReviewPrompt, draftReviewSchema, keptTemplate, kindLabel, reviewNotes, reviewSchema } from '../../../admission_worker_skeleton/report_review_v1.mjs';

let fail = 0;
const bad = (why) => { console.log(`  ✗ ${why}`); fail += 1; };
const ok = (cond, why) => { if (!cond) bad(why); };

const long = (seed) => `${seed} `.repeat(26).trim();
const draft = {
  reportTitle: '빗면의 기울기와 수레의 속도 탐구 설계',
  sections: [
    { title: '연구 질문', body: long('빗면의 기울기가 커지면 수레의 속도는 어떻게 달라질까?') },
    { title: '이론적 배경', body: long('빗면 위의 물체에는 중력의 성분이 작용한다.') },
    { title: '가설', body: long('기울기가 커지면 속도가 더 빨라질 것이다.') },
    { title: '탐구 방법', body: long('수레를 빗면 위에서 굴려 시간을 잰다.') },
    { title: '결과 기록 계획', body: long('조건마다 세 번씩 재어 표에 적는다.') },
  ],
  dataTemplate: {
    measurementName: '구간을 내려오는 시간', unit: 's', scaleGuide: '',
    conditions: ['높이 5 cm', '높이 10 cm', '높이 15 cm'], trials: 3,
  },
};
const input = { subject: '물리', selectedConcept: '힘과 운동', reportStage: STAGE.DRAFT,
  collectionKind: COLLECTION.MEASUREMENT, taskDescription: '빗면의 기울기를 바꾸며 시간을 세 번씩 재어 표에 적는다.' };

// ── 검수에게 넘기는 말에 표 틀과 안내문이 들어가야 한다 ──────
{
  const prompt = buildDraftReviewPrompt(draft, input);
  ok(/높이 10 cm/.test(prompt), '표 틀의 조건이 들어가야 한다');
  ok(/단위: s/.test(prompt), '표 틀의 단위가 들어가야 한다');
  ok(/직접 재서 숫자를 표에 적는 과제/.test(prompt), '우리가 읽은 모으는 방식을 알려 줘야 한다');
  ok(/여덟 건에 한 건쯤 틀린다/.test(prompt), '우리 판정이 틀릴 수 있음을 알려 줘야 한다');
  ok(/실험실에 가거나/.test(prompt), '설계서가 무엇인지 알려 줘야 한다');
  ok(!/표의 숫자와 본문의 숫자/.test(prompt), '설계서에는 맞출 숫자가 없으므로 그 항목은 없어야 한다');
}

// ── 여섯 가지만 본다 ────────────────────────────────────
{
  const kinds = draftReviewSchema().properties.findings.items.properties.kind.enum;
  ok(kinds.length === 6, `설계서 검수는 여섯 가지여야 한다 — ${kinds.length}개`);
  for (const kind of kinds) ok(kindLabel(kind).length > 0, `${kind} 에 한글 이름이 있어야 한다`);
  ok(kinds.includes('kindfit'), '모으는 방식이 맞는지 보는 항목이 있어야 한다');
  ok(!kinds.includes('number'), '설계서에는 숫자 맞추기가 없어야 한다');
}

// ── 스키마가 OpenAI strict 규칙을 지켜야 한다 ──────────────
// 2026-09-24 실측: scaleGuide 를 required 에서 빼 두었더니 OpenAI 가 400 을 주었고,
// 검수는 조용히 건너뛰어졌다. 살아 있는 설계서 한 장을 만들어 보고서야 알았다.
// strict 스키마는 **모든 칸이 required 에 있어야 한다.** 검수 두 개 다 본다.
{
  const walk = (node, path = 'root') => {
    if (!node || typeof node !== 'object') return;
    const types = Array.isArray(node.type) ? node.type : [node.type];
    if (types.includes('object') && node.properties) {
      const keys = Object.keys(node.properties);
      const required = node.required || [];
      for (const key of keys) if (!required.includes(key)) bad(`${path} 의 ${key} 가 required 에 없다`);
      if (node.additionalProperties !== false) bad(`${path} 에 additionalProperties: false 가 없다`);
      for (const key of keys) walk(node.properties[key], `${path}.${key}`);
    }
    if (types.includes('array') && node.items) walk(node.items, `${path}[]`);
  };
  walk(draftReviewSchema(), '설계서 검수');
  walk(reviewSchema(), '최종 보고서 검수');
}

// ── ① 없는 문장을 지적하면 버린다 ────────────────────────
{
  const out = applyDraftReview(draft, {
    findings: [{ section: '가설', kind: 'hypothesis', quote: '이 문장은 설계서에 없다', why: '왜' }],
    sections: [{ title: '가설', body: long('검수가 새로 쓴 가설') }],
  });
  ok(out.sections === draft.sections, '거짓 지적만 있으면 절이 그대로여야 한다');
  ok(out.review.findings.length === 0, '거짓 지적은 남지 않아야 한다');
}

// ── ② 조건 개수가 크게 달라진 표 틀은 받지 않는다 ─────────
{
  const many = { ...draft.dataTemplate, conditions: ['5 cm', '10 cm', '15 cm', '20 cm', '25 cm', '30 cm'] };
  const { template, reason } = keptTemplate(draft.dataTemplate, many);
  ok(template === null, '조건이 세 개에서 여섯 개로 늘면 받지 말아야 한다');
  ok(/조건 개수/.test(reason), `이유를 남겨야 한다 — ${reason}`);
}

// 하나 차이는 받는다 — 대조군을 빠뜨렸다는 지적은 정당하다
{
  const plus = { ...draft.dataTemplate, conditions: ['높이 0 cm(대조)', '높이 5 cm', '높이 10 cm', '높이 15 cm'] };
  const { template } = keptTemplate(draft.dataTemplate, plus);
  ok(template !== null, '조건이 하나 늘어난 것은 받아야 한다');
  ok((template.conditions || []).length === 4, '고친 조건이 그대로 와야 한다');
}

// ── ③ 표 틀 얘기를 하는 지적이 없으면 표 틀을 안 건드린다 ──
{
  const out = applyDraftReview(draft, {
    findings: [{ section: '가설', kind: 'mismatch', quote: '기울기가 커지면 속도가 더 빨라질 것이다', why: '절 제목과 다르다' }],
    sections: [{ title: '가설', body: long('기울기가 커지면 속도가 더 빨라질 것이라고 보았다.') }],
    dataTemplate: { measurementName: '전혀 다른 것', unit: 'kg', conditions: ['가', '나', '다'] },
  });
  ok(out.dataTemplate === null, '표 틀 얘기가 없으면 표 틀을 바꾸지 말아야 한다');
  ok(/표 틀 얘기가 없다/.test(out.review.template), `이유를 남겨야 한다 — ${out.review.template}`);
}

// 단위 지적이 있으면 표 틀을 고친다
{
  const out = applyDraftReview(draft, {
    findings: [{ section: '결과 기록 계획', kind: 'unit', quote: '조건마다 세 번씩 재어', why: '표 틀의 단위가 시간인데 속도를 구하라고 한다' }],
    sections: [{ title: '결과 기록 계획', body: long('조건마다 세 번씩 재어 평균을 구해 표에 적는다.') }],
    dataTemplate: { measurementName: '구간을 내려오는 시간', unit: 's', scaleGuide: '구간 길이 0.60 m',
      conditions: ['높이 5 cm', '높이 10 cm', '높이 15 cm'] },
  });
  ok(out.dataTemplate !== null, '단위 지적이 있으면 표 틀을 고쳐야 한다');
  ok(out.dataTemplate.scaleGuide === '구간 길이 0.60 m', '고친 내용이 들어와야 한다');
}

// ── ④ 반복 횟수는 검수가 못 바꾼다 ──────────────────────
{
  const { template } = keptTemplate(draft.dataTemplate, { ...draft.dataTemplate, trials: 9, unit: 'ms' });
  ok(template !== null, '단위를 고친 표 틀은 받아야 한다');
  ok(template.trials === 3, `반복 횟수는 그대로여야 한다 — ${template.trials}`);
}

// ── ⑤ 워커가 하는 것과 같이 관문에 넣는다 ────────────────
{
  const out = applyDraftReview(draft, {
    findings: [{ section: '탐구 방법', kind: 'variable', quote: '수레를 빗면 위에서 굴려', why: '고정한 것이 안 적혀 있다' }],
    sections: [{ title: '탐구 방법', body: long('빗면의 높이만 바꾸고 수레의 질량과 구간 길이는 같게 둔다.') }],
    dataTemplate: { measurementName: '구간을 내려오는 시간', unit: 's', conditions: ['높이 5 cm', '높이 10 cm', '높이 15 cm', '높이 20 cm'] },
  });
  ok(out.review.applied.length === 1, `고친 절이 하나여야 한다 — ${JSON.stringify(out.review.skipped)}`);
  ok(out.dataTemplate !== null, '표 틀도 고쳐야 한다');
  const { parsed, extra } = finalizeStageOutput(STAGE.DRAFT,
    { ...draft, sections: out.sections, dataTemplate: out.dataTemplate }, input);
  ok((extra.dataTemplate.conditions || []).length === 4, '관문을 지난 표 틀에 조건 네 개가 있어야 한다');
  ok(extra.dataTemplate.trials === 3, '관문이 반복 횟수를 지켜야 한다');
  const body = (parsed.sections || []).find((one) => one.title === '탐구 방법')?.body || '';
  ok(/질량과 구간 길이는 같게/.test(body), '고친 글이 관문을 지나 남아야 한다');
  // 설계서 관문은 우리 내부 이름을 지운다. 검수가 그것을 넣어도 지워져야 한다.
  const leaked = finalizeStageOutput(STAGE.DRAFT,
    { ...draft, sections: [{ title: '탐구 방법', body: `${long('dataTemplate 에 적는다.')} spread 를 본다.` }] }, input);
  ok(!/dataTemplate|spread/.test(leaked.parsed.sections[0].body), '내부 이름은 관문이 지워야 한다');
}

// ── 설명서에 쓸 한 줄 ────────────────────────────────────
{
  const lines = reviewNotes({ findings: [{ kind: 'variable', why: '고정한 것이 안 적혀 있었어요' }, { kind: 'kindfit', why: '안내문은 직접 재라고 해요' }] });
  ok(lines.length === 2, `두 줄이 되어야 한다 — ${JSON.stringify(lines)}`);
  ok(/바꾼 것·고정한 것·잰 것/.test(lines[0]), '종류 이름이 한글로 나와야 한다');
}

if (fail) { console.log(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 설계서 검수는 절과 표 틀을 고쳐 돌려줄 수만 있고, 표의 크기나 반복 횟수를 바꿀 수는 없다');
