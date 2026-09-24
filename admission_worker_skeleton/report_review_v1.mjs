// **보고서를 한 번 더 읽고 고친다.** gpt-5 를 한 번 더 부른다 — 보고서 하나에 약 ₩112 더 든다.
//
// 왜 붙였나. 2026-09-19 에 다 지은 보고서 5장을 gpt-5 에게 읽혀 보았다(₩560).
// 우리가 깨끗하다고 본 보고서에서 **진짜 흠 여섯 개**가 나왔고, 스무 건 가운데 열아홉이 맞는 지적이었다.
// 절반은 우리 틀에서 나온 흠이었다. 사람이 읽으면 보이는 것을 코드가 못 본 것이다.
//
// **안전 장치.** 검수가 새로 쓴 글은 **원래 보고서와 똑같은 관문을 다시 지난다**(finalizeStageOutput).
// 그래서 검수가 숫자를 새로 지어내거나 없는 자료를 대면 그 문장은 그대로 지워진다.
// 검수는 글을 고칠 수만 있고, 관문을 넘을 권한은 없다.
//
// 그리고 검수가 **지적한 대목이 보고서에 실제로 있는지 우리가 확인한다.** 없는 문장을 지적하면
// 그 지적은 버린다. AI 가 읽은 척하는 것을 막는 유일한 방법이다.
// 관문(finalizeStageOutput)은 우리가 부르지 않는다. 검수한 절을 **합치기 전 자리**로 돌려주면,
// 워커가 관문과 합치기를 원래대로 한 번만 돌린다 — 그래야 검산한 숫자가 살아남는다.

// 검수가 볼 것. 열어 두면 「더 매끄럽게」 같은 말만 하고 돌아온다.
export const REVIEW_KINDS = Object.freeze({
  NUMBER: 'number',       // 표의 숫자와 본문의 숫자가 다르다
  UNIT: 'unit',           // 단위가 빠졌거나 틀렸다
  VARIABLE: 'variable',   // 바꾼 것·고정한 것·잰 것 가운데 빠진 것이 있다
  SOURCE: 'source',       // 자료원을 밝히지 않고 남의 숫자를 썼다
  OVERREACH: 'overreach', // 결과가 말해 주지 않는 것을 결론에서 말한다
  REPEAT: 'repeat',       // 같은 말을 두 번 한다
  MISMATCH: 'mismatch',   // 절 제목과 안의 내용이 다르다
  NOTDONE: 'notdone',     // 학생이 하지 않은 일을 했다고 적었다
});

const KIND_LABEL = {
  number: '표의 숫자와 본문의 숫자가 다르다',
  unit: '단위가 빠졌거나 틀렸다',
  variable: '바꾼 것·고정한 것·잰 것 가운데 빠진 것이 있다',
  source: '자료원을 밝히지 않고 숫자를 썼다',
  overreach: '결과가 말해 주지 않는 것을 결론에서 말한다',
  repeat: '같은 말을 두 번 한다',
  mismatch: '절 제목과 안의 내용이 다르다',
  notdone: '학생이 하지 않은 일을 했다고 적었다',
};

// ── 설계서 검수 ─────────────────────────────────────────────
//
// 처음에는 설계서를 검수하지 않았다. 이유를 「아직 숫자가 없어 맞출 것이 없다」고 적었는데,
// 그건 여덟 가지 중 한 가지(number)에만 맞는 말이었다. 나머지는 설계서에 그대로 해당되고,
// 일부는 **설계서에서 더 중요하다.**
//
// 설계서 흠이 최종 보고서 흠보다 비싸다. 최종 보고서는 다시 만들면 되지만,
// 설계서에 통제 변인이 빠져 있으면 학생은 그 계획대로 가서 엉뚱하게 재고 온다.
// **실험실에 다녀온 뒤에는 못 고친다.** 그 표로 만든 최종 보고서는 검수를 통과해도 틀린다.
export const DRAFT_REVIEW_KINDS = Object.freeze({
  VARIABLE: 'variable',     // 바꾼 것·고정한 것·잰 것 가운데 빠진 것이 있다
  UNIT: 'unit',             // 표 틀의 단위가 없거나 맞지 않는다
  DOABLE: 'doable',         // 학생이 실제로 할 수 없는 조건이다
  KINDFIT: 'kindfit',       // 안내문이 시키는 것과 모으는 방식이 다르다
  HYPOTHESIS: 'hypothesis', // 가설이 재서 판가름할 수 없는 문장이다
  MISMATCH: 'mismatch',     // 절 제목과 안의 내용이 다르다
});

const DRAFT_KIND_LABEL = {
  variable: '바꾼 것·고정한 것·잰 것 가운데 빠진 것이 있다',
  unit: '표 틀의 단위가 없거나 맞지 않는다',
  doable: '학생이 실제로 할 수 없는 조건이다',
  kindfit: '안내문이 시키는 것과 모으는 방식이 다르다',
  hypothesis: '가설이 재서 판가름할 수 없는 문장이다',
  mismatch: '절 제목과 안의 내용이 다르다',
};

export function kindLabel(kind) {
  const key = String(kind || '').trim();
  return KIND_LABEL[key] || DRAFT_KIND_LABEL[key] || '';
}

const clip = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// 검수에게 넘길 말. **보고서와 학생 자료를 같이 준다** — 표를 안 보여 주면 숫자를 맞출 수 없다.
export function buildReviewPrompt(report, input = {}) {
  // 예전에는 절 앞에 「[1] 」처럼 번호를 붙였다. 그러자 gpt-5 가 절 이름을 「[7] 느낀 점」으로 적어 왔고,
  // 우리 절 이름은 「느낀 점」이라 고칠 절을 못 찾았다 — 지적은 남고 아무것도 안 고쳐졌다(2026-09-24 실측).
  const sections = (report?.sections || []).map((one) => `### ${one?.title || ''}\n${one?.body || ''}`);
  const data = input.studentData || {};
  const table = (data.conditions || []).map((row) => {
    const values = Array.isArray(row?.values) ? row.values.join(', ') : '';
    return `  · ${row?.label || ''} = ${values}${row?.note ? ` (메모: ${row.note})` : ''}`;
  });
  // 그림은 코드가 붙인다. 검수에게 안 알려 주면 「그림 1을 언급했는데 그림이 없다」고 잘못 지적한다
  // (2026-09-24 실측). 표 1 은 언제나 붙는다.
  const figures = [`  · 표 1 (학생이 잰 값, 언제나 붙는다)`,
    ...(report?.figures || []).map((one, at) => `  · 그림 ${at + 1} ${clip(one?.title, 60)}`)];

  const sources = [
    ...(data.sources || []).map((one) => clip(one, 120)),
    ...(input.referenceDatasets || []).map((one) => clip(`${one?.title || ''} — ${one?.org || one?.orgName || ''}`, 120)),
    ...(input.referencePapers || []).map((one) => clip(one?.title || '', 120)),
  ].filter(Boolean);

  return [
    '너는 고등학교 수행평가 보고서를 검수한다. 학생이 이 보고서를 그대로 제출한다.',
    '',
    '## 검수 규칙',
    '1. **보고서에 실제로 있는 문장만 지적한다.** quote 는 보고서에서 그대로 옮긴 글자여야 한다. 고쳐 적거나 요약하면 그 지적은 버려진다.',
    '2. section 과 title 에는 **절 제목을 그대로** 적는다. 번호를 붙이거나 줄여 적으면 그 절을 못 찾는다.',
    '3. 아래 여덟 가지만 본다. 글이 매끄러운지, 더 길게 쓸 수 있는지는 보지 않는다.',
    ...Object.entries(KIND_LABEL).map(([key, label]) => `   · ${key}: ${label}`),
    '4. 흠이 있는 절은 **그 절 전체를 다시 써서** sections 에 담는다. 흠이 없는 절은 담지 않는다.',
    '5. 다시 쓸 때 **숫자를 새로 만들지 않는다.** 아래 「학생이 적은 표」에 있는 숫자와 보고서에 이미 있는 숫자만 쓴다.',
    '6. 다시 쓴 글은 원래 글과 길이가 비슷해야 한다. 짧게 줄이면 학생이 낼 분량이 모자란다.',
    '7. 「이 부분은 자료에서 가져왔습니다」 같은 고백 문장을 넣지 않는다. 자료원은 방법 절 첫 문장과 참고 자료에만 적는다.',
    '8. 흠이 없으면 findings 와 sections 를 빈 배열로 둔다. 없는 흠을 만들지 않는다.',
    '',
    '## 이 보고서에 붙는 그림',
    ...(figures.length ? figures : ['  (그림 없음 — 본문에서 그림을 가리키면 안 된다)']),
    '',
    '## 학생이 적은 표',
    ...(table.length ? table : ['  (표 없음)']),
    '',
    '## 우리가 준 자료 (이 밖의 자료를 근거로 대면 안 된다)',
    ...(sources.length ? sources.map((one) => `  · ${one}`) : ['  (없음)']),
    '',
    '## 과제',
    `  과목: ${clip(input.subject, 40)} / 단원: ${clip(input.selectedConcept, 60)}`,
    `  안내문: ${clip(input.taskDescription, 400)}`,
    '',
    '## 보고서',
    `제목: ${report?.reportTitle || ''}`,
    '',
    ...sections,
  ].join('\n');
}

export function reviewSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['findings', 'sections'],
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['section', 'kind', 'quote', 'why'],
          properties: {
            section: { type: 'string' },
            kind: { type: 'string', enum: Object.values(REVIEW_KINDS) },
            quote: { type: 'string', minLength: 4 },
            why: { type: 'string', minLength: 4 },
          },
        },
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'body'],
          properties: {
            title: { type: 'string' },
            body: { type: 'string', minLength: 150 },
          },
        },
      },
    },
  };
}

// 절 이름 앞의 번호를 뗀다 — 「[7] 느낀 점」·「7. 느낀 점」·「느낀 점」이 모두 같은 절이다.
const bareTitle = (text) => String(text ?? '').replace(/^\s*(?:\[\s*\d+\s*\]|\d{1,2})\s*[.)\]]?\s*/, '').replace(/\s+/g, '').trim();

// 띄어쓰기·따옴표가 달라도 같은 문장으로 본다. AI 가 옮겨 적을 때 흔히 바뀐다.
const loose = (text) => String(text ?? '').replace(/[\s"'“”‘’]/g, '');

// 검수가 지적한 대목이 보고서에 **실제로 있는지** 우리가 확인한다.
export function keptFindings(report, findings) {
  const bodies = new Map();
  for (const one of report?.sections || []) bodies.set(bareTitle(one?.title), loose(one?.body));
  const kept = [];
  const dropped = [];
  for (const one of findings || []) {
    const quote = loose(one?.quote);
    if (quote.length < 4) { dropped.push({ ...one, reason: '지적한 글이 너무 짧다' }); continue; }
    const named = bodies.get(bareTitle(one?.section));
    const hit = named !== undefined ? named.includes(quote) : [...bodies.values()].some((body) => body.includes(quote));
    if (hit) kept.push(one);
    else dropped.push({ ...one, reason: '보고서에 없는 글을 지적했다' });
  }
  return { kept, dropped };
}

// 검수가 다시 쓴 절을 넣는다. **너무 짧아지면 넣지 않는다** — 학생이 낼 분량이 모자란다.
export function mergeSections(report, rewritten, titlesWithFindings) {
  const byTitle = new Map((rewritten || []).map((one) => [bareTitle(one?.title), String(one?.body || '')]));
  // 부르는 쪽이 번호가 붙은 이름을 넘길 수도 있다. 여기서 떼어 맞춘다.
  const wanted = new Set([...(titlesWithFindings || [])].map((one) => bareTitle(one)));
  const applied = [];
  const skipped = [];
  const sections = (report?.sections || []).map((one) => {
    const title = String(one?.title || '');
    // 참고 자료 절은 코드가 만든다. 검수가 손대면 안 된다.
    if (/참고|^\s*출처/.test(title)) return one;
    if (!wanted.has(bareTitle(title))) return one;
    const next = byTitle.get(bareTitle(title));
    if (!next) { skipped.push({ title, reason: '다시 쓴 글을 주지 않았다' }); return one; }
    const was = String(one?.body || '');
    if (next.length < was.length * 0.7) { skipped.push({ title, reason: `너무 짧아졌다(${was.length}→${next.length}자)` }); return one; }
    // 늘어나는 것도 막는다. 한 절만 두 배가 되면 보고서의 균형이 깨지고, 늘어난 만큼은 검수가 새로 쓴 글이다.
    if (next.length > was.length * 1.6) { skipped.push({ title, reason: `너무 길어졌다(${was.length}→${next.length}자)` }); return one; }
    if (loose(next) === loose(was)) { skipped.push({ title, reason: '바뀐 것이 없다' }); return one; }
    applied.push({ title, was: was.length, now: next.length });
    return { ...one, body: next };
  });
  return { sections, applied, skipped };
}

// 검수 결과를 절에 반영한다. **관문은 여기서 돌리지 않는다.**
//
// 처음에는 여기서 관문을 한 번 더 돌렸다. 그랬더니 검수한 절에서 속도·운동량 계산 숫자
// (0.800 m/s, 0.400 kg·m/s)가 통째로 지워졌다(2026-09-24 실측, 물리·운동량).
// 관문은 AI 가 적은 계산을 코드가 검산해서 그 답만 허락하는데, 두 번째로 돌릴 때는
// 그 검산 결과를 넘길 수 없어 정당한 숫자가 지어낸 숫자로 보인 것이다.
// 그래서 합친 절만 돌려주고, 관문과 합치기는 워커가 원래 자리에서 한 번만 돌린다.
export function applyReview(report, review) {
  const { kept, dropped } = keptFindings(report, review?.findings);
  const none = { sections: report?.sections || [], review: { findings: kept, dropped, applied: [], skipped: [] } };
  if (!kept.length) return { ...none, review: { ...none.review, findings: [] } };
  const titles = new Set(kept.map((one) => bareTitle(one?.section)).filter(Boolean));
  const { sections, applied, skipped } = mergeSections(report, review?.sections, titles);
  if (!applied.length) return { ...none, review: { findings: kept, dropped, applied: [], skipped } };
  return { sections, review: { findings: kept, dropped, applied, skipped } };
}

// 설계서 검수에게 넘길 말. **표 틀과 안내문을 같이 준다** — 그 둘이 맞는지가 핵심이다.
const KIND_WORD = {
  measurement: '직접 재서 숫자를 표에 적는 과제',
  survey: '설문으로 응답 수를 세는 과제',
  dataset: '공개된 자료의 수치를 옮겨 적는 과제',
  reading: '자료를 읽고 정리하는 과제',
  none: '모아 올 자료 없이 교과 개념으로 쓰는 과제',
};

export function buildDraftReviewPrompt(draft, input = {}) {
  const sections = (draft?.sections || []).map((one) => `### ${one?.title || ''}\n${one?.body || ''}`);
  const table = draft?.dataTemplate || {};
  const kind = String(input.collectionKind || 'measurement');
  return [
    '너는 고등학교 수행평가 **설계서**를 검수한다. 학생은 이 설계서를 보고 실제로 실험실에 가거나 자료를 찾아 온다.',
    '**설계서가 틀리면 학생은 엉뚱하게 재고 돌아온다. 그다음에는 고칠 수 없다.**',
    '',
    '## 검수 규칙',
    '1. **설계서에 실제로 있는 문장만 지적한다.** quote 는 그대로 옮긴 글자여야 한다. 고쳐 적거나 요약하면 그 지적은 버려진다.',
    '2. section 과 title 에는 **절 제목을 그대로** 적는다. 번호를 붙이거나 줄여 적으면 그 절을 못 찾는다.',
    '3. 아래 여섯 가지만 본다. 글이 매끄러운지, 더 길게 쓸 수 있는지는 보지 않는다.',
    ...Object.entries(DRAFT_KIND_LABEL).map(([key, label]) => `   · ${key}: ${label}`),
    '4. 흠이 있는 절은 **그 절 전체를 다시 써서** sections 에 담는다. 흠이 없는 절은 담지 않는다.',
    '5. 표 틀(측정 항목·단위·조건)이 잘못됐으면 dataTemplate 에 고친 것을 담는다. 고칠 것이 없으면 담지 않는다.',
    '   조건 개수는 원래와 크게 달라지면 안 된다. 학생이 낼 표의 크기가 바뀌면 곤란하다.',
    '6. 다시 쓴 글은 원래 글과 길이가 비슷해야 한다.',
    '7. **숫자를 새로 만들지 않는다.** 설계서는 계획이므로, 학생이 정할 조건값은 계획으로 밝혀 적는다.',
    '8. 흠이 없으면 findings 와 sections 를 빈 배열로 둔다. 없는 흠을 만들지 않는다.',
    '',
    '## 이 과제를 우리가 어떻게 읽었나',
    `  모으는 방식: ${KIND_WORD[kind] || kind}`,
    '  이 읽기가 안내문과 다르면 kindfit 으로 지적한다. 우리 판정은 여덟 건에 한 건쯤 틀린다.',
    '',
    '## 학생이 채울 표 틀',
    `  측정 항목: ${clip(table.measurementName, 60) || '(없음)'}`,
    `  단위: ${clip(table.unit, 20) || '(없음)'}`,
    `  점수·기준 설명: ${clip(table.scaleGuide, 200) || '(없음)'}`,
    `  반복 횟수: ${table.trials ?? '(없음)'}`,
    '  조건:',
    ...((table.conditions || []).map((one) => `    · ${clip(one, 60)}`)),
    '',
    '## 과제',
    `  과목: ${clip(input.subject, 40)} / 단원: ${clip(input.selectedConcept, 60)}`,
    `  안내문: ${clip(input.taskDescription, 900)}`,
    '',
    '## 설계서',
    `제목: ${draft?.reportTitle || ''}`,
    '',
    ...sections,
  ].join('\n');
}

export function draftReviewSchema() {
  const base = reviewSchema();
  return {
    type: 'object',
    additionalProperties: false,
    required: ['findings', 'sections', 'dataTemplate'],
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['section', 'kind', 'quote', 'why'],
          properties: {
            section: { type: 'string' },
            kind: { type: 'string', enum: Object.values(DRAFT_REVIEW_KINDS) },
            quote: { type: 'string', minLength: 4 },
            why: { type: 'string', minLength: 4 },
          },
        },
      },
      sections: base.properties.sections,
      // OpenAI 의 strict 스키마는 **모든 칸이 required 에 있어야 한다.**
      // scaleGuide 를 빼 두었더니 400 이 떨어졌고, 검수는 조용히 건너뛰어졌다(2026-09-24 실측).
      // 고칠 표 틀이 없을 때는 null 로 받는다.
      dataTemplate: {
        type: ['object', 'null'],
        additionalProperties: false,
        required: ['measurementName', 'unit', 'scaleGuide', 'conditions'],
        properties: {
          measurementName: { type: 'string' },
          unit: { type: 'string' },
          scaleGuide: { type: 'string' },
          conditions: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
        },
      },
    },
  };
}

// 표 틀을 고쳐 받았을 때, **학생이 낼 표의 크기가 바뀌지 않는지** 본다.
// 조건 개수가 달라지면 학생이 실험실에서 몇 번 재야 하는지가 달라진다. 그건 검수가 정할 일이 아니다.
export function keptTemplate(was, next) {
  if (!next || typeof next !== 'object') return { template: null, reason: '표 틀을 주지 않았다' };
  const before = (was?.conditions || []).length;
  const after = (next.conditions || []).length;
  if (!after) return { template: null, reason: '조건이 비었다' };
  if (before && Math.abs(after - before) > 1) return { template: null, reason: `조건 개수가 너무 달라졌다(${before}→${after})` };
  // 점수·기준 설명(scaleGuide)도 센다. 이것만 고친 것을 「바뀐 것이 없다」고 버렸는데,
  // 학생에게 「구간 길이 0.60 m」를 알려 주는 자리가 이것이다 — 빠지면 학생이 무엇을 재는지 모른다.
  const same = clip(was?.measurementName, 60) === clip(next.measurementName, 60)
    && clip(was?.unit, 20) === clip(next.unit, 20)
    && clip(was?.scaleGuide, 200) === clip(next.scaleGuide, 200)
    && (was?.conditions || []).join('|') === (next.conditions || []).join('|');
  if (same) return { template: null, reason: '바뀐 것이 없다' };
  // trials 는 검수가 정하지 않는다 — 모으는 방식에 따라 코드가 정한다.
  return { template: { ...next, trials: was?.trials }, reason: '' };
}

// 설계서 검수 결과를 반영한다. 관문(sanitizeDataTemplate 을 품은 finalizeStageOutput)은 워커가 돌린다.
export function applyDraftReview(draft, review) {
  const { kept, dropped } = keptFindings(draft, review?.findings);
  const none = { sections: draft?.sections || [], dataTemplate: null,
    review: { findings: kept, dropped, applied: [], skipped: [], template: '' } };
  if (!kept.length) return { ...none, review: { ...none.review, findings: [] } };
  const titles = new Set(kept.map((one) => bareTitle(one?.section)).filter(Boolean));
  const { sections, applied, skipped } = mergeSections(draft, review?.sections, titles);
  // 표 틀은 그 얘기를 하는 지적이 있을 때만 고친다.
  const wantsTable = kept.some((one) => ['unit', 'variable', 'doable', 'kindfit'].includes(String(one?.kind)));
  const { template, reason } = wantsTable ? keptTemplate(draft?.dataTemplate, review?.dataTemplate) : { template: null, reason: '표 틀 얘기가 없다' };
  return { sections, dataTemplate: template,
    review: { findings: kept, dropped, applied, skipped, template: template ? '고쳤다' : reason } };
}

// 학생에게 보여 줄 한 줄들. 설명서에 들어간다.
export function reviewNotes(review) {
  const lines = [];
  for (const one of review?.findings || []) {
    const label = kindLabel(one?.kind);
    if (label) lines.push(`${label} — ${clip(one?.why, 120)}`);
  }
  return [...new Set(lines)].slice(0, 6);
}
