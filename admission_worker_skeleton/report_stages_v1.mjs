// Two-stage experiment report.
// Stage 1 (experiment_draft): a design report plus a data template the student fills in after doing the experiment.
// Stage 2 (experiment_final): the final report from the student's own numbers. The model chooses how to show the data
// (table or chart, raw / mean / difference / percent change); this module does every calculation, so no number
// in a table or chart can be invented, and body sentences with numbers not found in the student data are removed.
// If the student leaves the table empty, stage 2 becomes a literature report.

export const STAGE = Object.freeze({
  COMPLETE: 'complete',
  DRAFT: 'experiment_draft',
  FINAL: 'experiment_final',
  LITERATURE: 'literature',
});

const FIGURE_KINDS = ['table', 'bar', 'line', 'grouped_bar', 'grouped_line'];
const METRICS = ['raw', 'mean', 'diff_from_first', 'percent_from_first'];
const METRIC_LABEL = { raw: '측정값', mean: '평균', diff_from_first: '첫 조건과의 차이', percent_from_first: '첫 조건 대비 변화율' };
const MAX_CONDITIONS = 8;
const MAX_TRIALS = 5;
// Feelings a model tends to add to 느낀 점 ("힘들었지만 보람 있었다") that the student never wrote.
const FEELING_WORDS = ['힘들', '어려웠', '재미', '즐거', '뿌듯', '보람', '아쉬', '감동', '행복', '설레', '흥미', '신기', '인상 깊', '기뻤', '만족'];

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const text = String(value ?? '').trim().replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

export function normalizeStudentData(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const conditions = (Array.isArray(src.conditions) ? src.conditions : []).slice(0, MAX_CONDITIONS)
    .map((row) => ({
      label: clip(row?.label, 60),
      values: (Array.isArray(row?.values) ? row.values : []).slice(0, MAX_TRIALS).map(toNumber).filter(Number.isFinite),
      note: clip(row?.note, 300),
    }))
    .filter((row) => row.label);
  return {
    measurementName: clip(src.measurementName, 40),
    unit: clip(src.unit, 20),
    scaleGuide: clip(src.scaleGuide, 200),
    conditions,
    reason: clip(src.reason, 600),
    observations: clip(src.observations, 1200),
    reflection: clip(src.reflection, 800),
    sources: (Array.isArray(src.sources) ? src.sources : []).map((source) => clip(source, 200)).filter(Boolean).slice(0, 6),
    draftTitle: clip(src.draftTitle, 80),
    draftReport: String(src.draftReport ?? '').trim().slice(0, 6000),
  };
}

// Comparing needs at least two conditions with a measured value.
export function hasStudentMeasurements(data) {
  return data.conditions.filter((row) => row.values.length).length >= 2;
}

export function resolveReportStage(payload) {
  const requested = String(payload?.reportStage || '').trim();
  if (requested === STAGE.DRAFT) return STAGE.DRAFT;
  if (requested === STAGE.FINAL || requested === STAGE.LITERATURE) {
    return requested === STAGE.FINAL && hasStudentMeasurements(normalizeStudentData(payload?.studentData))
      ? STAGE.FINAL
      : STAGE.LITERATURE;
  }
  return STAGE.COMPLETE;
}

export function computeStats(data) {
  const rows = data.conditions.filter((row) => row.values.length).map((row) => ({
    label: row.label,
    values: row.values,
    note: row.note,
    mean: round(row.values.reduce((sum, value) => sum + value, 0) / row.values.length),
    min: Math.min(...row.values),
    max: Math.max(...row.values),
    spread: round(Math.max(...row.values) - Math.min(...row.values)),
  }));
  const base = rows[0]?.mean ?? 0;
  rows.forEach((row) => {
    row.diff_from_first = round(row.mean - base);
    row.percent_from_first = base ? round(((row.mean - base) / Math.abs(base)) * 100, 1) : null;
  });
  // Ranking and ties are given to the model so it compares condition by condition instead of generalising.
  const byMean = new Map();
  rows.forEach((row) => byMean.set(row.mean, [...(byMean.get(row.mean) || []), row.label]));
  return {
    measurementName: data.measurementName,
    unit: data.unit,
    scaleGuide: data.scaleGuide,
    trials: Math.max(0, ...rows.map((row) => row.values.length)),
    rows,
    ranking: [...rows].sort((a, b) => b.mean - a.mean).map((row) => ({ label: row.label, mean: row.mean })),
    sameMean: [...byMean.values()].filter((labels) => labels.length > 1),
    comparisons: gridComparisons(rows),
  };
}

// For a two-variable grid: at each level of the second variable (e.g. each water temperature), which level of the
// first variable (e.g. which detergent) scored highest and by exactly how much over the runner-up, so the report
// states real gaps instead of "비슷하다". A gap no bigger than the repeat spread of the two rows is not a clear
// difference: a 0~3 score that wobbles by 1 point between repeats cannot separate means 0.34 apart.
function gridComparisons(rows) {
  const grid = splitFactors(rows);
  if (!grid) return [];
  return grid.seconds.map((second) => {
    const values = grid.firsts.map((first) => ({ label: first, mean: grid.find(first, second).mean, spread: grid.find(first, second).spread }));
    const sorted = [...values].sort((a, b) => b.mean - a.mean);
    const gap = round(sorted[0].mean - sorted[1].mean);
    const wobble = Math.max(sorted[0].spread, sorted[1].spread);
    return { at: second, values, higher: gap === 0 ? '같음' : sorted[0].label, runnerUp: sorted[1].label, gap, clearDifference: gap > wobble };
  });
}

function orderRows(order, rows) {
  const key = (text) => String(text || '').replace(/\s+/g, '');
  const picked = (Array.isArray(order) ? order : [])
    .map((label) => rows.find((row) => key(row.label) === key(label)))
    .filter((row, index, list) => row && list.indexOf(row) === index);
  return picked.length >= 2 ? picked : rows;
}

// Conditions such as "효소 세제 · 찬물" that cover every combination of two variables form a grid:
// the first variable becomes the chart series (colours), the second the x-axis.
export function splitFactors(rows) {
  const parts = rows.map((row) => row.label.split(/\s*·\s*/));
  if (parts.some((part) => part.length !== 2)) return null;
  const firsts = [...new Set(parts.map((part) => part[0]))];
  const seconds = [...new Set(parts.map((part) => part[1]))];
  if (firsts.length < 2 || seconds.length < 2 || firsts.length * seconds.length !== rows.length) return null;
  const find = (first, second) => rows[parts.findIndex((part) => part[0] === first && part[1] === second)];
  if (firsts.some((first) => seconds.some((second) => !find(first, second)))) return null;
  return { firsts, seconds, find };
}

// The model picks kind, metric, order and wording; every number comes from computeStats.
export function buildFigures(specs, stats) {
  const valid = (Array.isArray(specs) ? specs : [])
    .filter((spec) => FIGURE_KINDS.includes(spec?.kind) && METRICS.includes(spec?.metric))
    .slice(0, 3);
  const name = stats.measurementName || '측정값';
  const grid = splitFactors(stats.rows);
  if (!valid.some((spec) => spec.kind === 'table')) valid.push({ kind: 'table', metric: 'raw', title: `조건별 ${name} 결과` });
  if (!valid.some((spec) => spec.kind !== 'table')) valid.push({ kind: grid ? 'grouped_bar' : 'bar', metric: 'mean', title: `조건별 평균 ${name}` });
  const counters = { table: 0, chart: 0 };
  // The raw-data table comes first, then the charts drawn from it.
  const ordered = valid.slice(0, 4).sort((a, b) => (a.kind === 'table' ? 0 : 1) - (b.kind === 'table' ? 0 : 1));
  return ordered.map((spec) => {
    const rows = orderRows(spec.conditionOrder, stats.rows);
    const hasPercentBase = rows.every((row) => row.percent_from_first !== null);
    const metric = spec.metric === 'percent_from_first' && !hasPercentBase ? 'diff_from_first' : spec.metric;
    const unit = metric === 'percent_from_first' ? '%' : stats.unit;
    const label = spec.kind === 'table' ? `표 ${++counters.table}` : `그림 ${++counters.chart}`;
    const figure = { label, kind: spec.kind, metric, metricLabel: METRIC_LABEL[metric], title: clip(scrubInternalNames(spec.title), 60) || `조건별 ${name}`, caption: clip(cleanCaption(spec.caption), 160), unit };
    if (spec.kind === 'table') {
      if (metric === 'raw') {
        const trials = Array.from({ length: stats.trials }, (_, index) => `${index + 1}회`);
        return { ...figure, columns: ['조건', ...trials, '평균', '흔들림'], rows: rows.map((row) => [row.label, ...trials.map((_, index) => row.values[index] ?? ''), row.mean, row.spread]) };
      }
      return { ...figure, columns: ['조건', `${METRIC_LABEL[metric]}${unit ? ` (${unit})` : ''}`], rows: rows.map((row) => [row.label, row[metric]]) };
    }
    const chartMetric = metric === 'raw' ? 'mean' : metric;
    const base = { ...figure, metric: chartMetric, metricLabel: METRIC_LABEL[chartMetric] };
    // A chart over the whole grid is drawn grouped even if the model asked for a plain one: six bars in a row
    // hide which variable made the difference.
    const kind = spec.kind.replace('grouped_', '');
    if (grid && (spec.kind.startsWith('grouped_') || rows.length === stats.rows.length)) {
      return {
        ...base,
        kind: `grouped_${kind}`,
        labels: grid.seconds,
        series: grid.firsts.map((first) => ({ name: first, values: grid.seconds.map((second) => grid.find(first, second)[chartMetric]) })),
      };
    }
    return { ...base, kind, labels: rows.map((row) => row.label), values: rows.map((row) => row[chartMetric]) };
  });
}

// The model sees the summary under Korean names, so it writes "흔들림" rather than "spread" in a student's report.
export function summaryForPrompt(stats) {
  return {
    측정항목: stats.measurementName,
    단위: stats.unit,
    점수기준: stats.scaleGuide,
    반복횟수: stats.trials,
    조건별결과: stats.rows.map((row) => ({ 조건: row.label, 측정값: row.values, 평균: row.mean, 흔들림: row.spread, 첫조건과의차이: row.diff_from_first, 첫조건대비변화율: row.percent_from_first, 관찰메모: row.note })),
    평균이높은순서: stats.ranking.map((item) => `${item.label} (${item.mean})`),
    평균이같은조건: stats.sameMean,
    수준별비교: (stats.comparisons || []).map((item) => ({ 기준: item.at, 가장높은쪽: item.higher, 두번째: item.runnerUp, 차이: item.gap, 흔들림보다큰차이인가: item.clearDifference ? '예' : '아니오' })),
  };
}

// Internal field names must never reach a student's report (a real gpt-5 report wrote "clearDifference가 true로
// 표시되어", "spread", "(sameMean)"; a draft wrote "dataTemplate").
const INTERNAL_NAMES = 'caseTag|sameMean|clearDifference|dataSummary|dataTemplate|comparisons|runnerUp|ranking|conditionOrder|spread|gap';
const INTERNAL_NAME_FIXES = [
  [/\s*\(\s*["“'‘]?(?:예|아니오)["”'’]?\s*\)/g, ''],
  [new RegExp(`\\s*\\([^()]*\\b(?:${INTERNAL_NAMES})\\b[^()]*\\)`, 'g'), ''],
  // The model states the meaning next to the flag ("…흔들림보다 차이가 커"), so the flag phrase itself is dropped.
  [/clearDifference\s*(?:가|는|이)?\s*(?:=\s*)?(?:true|false)(?:로 표시되어|로 나타나|로 나타났다|이므로|이며|이고)?\s*/g, ''],
  // Replacements keep Korean particles right (흔들림 ends in a consonant, 차이 and 표 in a vowel).
  [/\bspread(?:가|이)/g, '흔들림이'], [/\bspread(?:는|은)/g, '흔들림은'], [/\bspread(?:를|을)/g, '흔들림을'], [/\bspread(?:와|과)/g, '흔들림과'], [/\bspread(?:로|으로)/g, '흔들림으로'],
  [/\bspread\b/g, '흔들림'],
  [/\bdataTemplate(?:과|와)/g, '결과 기록 표와'], [/\bdataTemplate(?:은|는)/g, '결과 기록 표는'], [/\bdataTemplate(?:이|가)/g, '결과 기록 표가'], [/\bdataTemplate(?:을|를)/g, '결과 기록 표를'],
  [/\bdataTemplate\b/g, '결과 기록 표'],
  [/\bgap(?:이|가)/g, '차이가'], [/\bgap(?:은|는)/g, '차이는'], [/\bgap(?:을|를)/g, '차이를'],
  [/\bgap\b/g, '차이'],
  [/\b(?:dataSummary|sameMean|comparisons|clearDifference|runnerUp|ranking|conditionOrder|caseTag)\b/g, ''],
];

export function scrubInternalNames(text) {
  return INTERNAL_NAME_FIXES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), String(text || ''))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,])/g, '$1');
}

// Charts carry no error bars, so a caption must not describe any.
function cleanCaption(text) {
  return filterSentences(scrubInternalNames(text), (sentence) => !/에러|오차\s*막대|error/i.test(sentence)).body;
}

const canonicalNumber = (text) => String(Number(text));

// Numbers the report may use: student values and their computed summaries (0–2 decimals, signed or not),
// numbers the student or the approved draft wrote, and small counts such as step numbers.
export function allowedNumberSet(data, stats) {
  const allowed = new Set();
  const addValue = (value) => {
    if (!Number.isFinite(value)) return;
    [0, 1, 2].forEach((digits) => {
      allowed.add(canonicalNumber(round(value, digits)));
      allowed.add(canonicalNumber(Math.abs(round(value, digits))));
    });
  };
  for (let count = 0; count <= 10; count += 1) allowed.add(String(count));
  (stats?.rows || []).forEach((row) => [...row.values, row.mean, row.min, row.max, row.spread, row.diff_from_first, row.percent_from_first].forEach(addValue));
  (stats?.comparisons || []).forEach((comparison) => addValue(comparison.gap));
  const texts = [data.measurementName, data.unit, data.scaleGuide, data.reason, data.observations, data.reflection, data.draftReport, ...data.sources, ...data.conditions.flatMap((row) => [row.label, row.note])];
  texts.join(' ').match(/\d+(?:\.\d+)?/g)?.forEach((number) => allowed.add(canonicalNumber(number)));
  return allowed;
}

// A decimal point is not a sentence end.
const SENTENCE = /(?:[^.?!\n]|(?<=\d)\.(?=\d))+[.?!]*\s*/g;

function filterSentences(body, keep) {
  let removed = 0;
  const kept = String(body || '').split('\n').map((line) => (line.match(SENTENCE) || []).filter((sentence) => {
    const ok = keep(sentence);
    if (!ok) removed += 1;
    return ok;
  }).join('').trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { body: kept, removed };
}

export function removeUnsupportedNumbers(body, allowed) {
  return filterSentences(body, (sentence) => (sentence.match(/\d+(?:\.\d+)?/g) || []).every((number) => allowed.has(canonicalNumber(number))));
}

export function removeInventedFeelings(body, studentText) {
  const invented = FEELING_WORDS.filter((word) => !String(studentText || '').includes(word));
  return filterSentences(body, (sentence) => !invented.some((word) => sentence.includes(word)));
}

// 참고 자료 lists exactly what the student wrote; without that, only lines that are not notes or asides.
export function buildReferencesBody(body, sources) {
  if (sources.length) return sources.join('\n');
  return String(body || '').split('\n').map((line) => line.trim()).filter((line) => line && !/^(※|\(|\[)/.test(line)).join('\n');
}

function sanitizeDataTemplate(raw) {
  const conditions = [...new Set((Array.isArray(raw?.conditions) ? raw.conditions : []).map((label) => clip(label, 60)).filter(Boolean))].slice(0, MAX_CONDITIONS);
  const trials = Math.min(MAX_TRIALS, Math.max(3, Math.round(Number(raw?.trials) || 3)));
  return {
    measurementName: clip(raw?.measurementName, 40) || '측정값',
    unit: clip(raw?.unit, 20),
    scaleGuide: clip(raw?.scaleGuide, 200),
    conditions: conditions.length >= 2 ? conditions : ['조건 1', '조건 2'],
    trials,
  };
}

function sanitizeComparisonTable(raw) {
  const columns = (Array.isArray(raw?.columns) ? raw.columns : []).map((cell) => clip(cell, 30)).filter(Boolean).slice(0, 5);
  if (columns.length < 2) return null;
  const rows = (Array.isArray(raw?.rows) ? raw.rows : []).slice(0, 6)
    .map((row) => columns.map((_, index) => clip(Array.isArray(row) ? row[index] : '', 80)))
    .filter((row) => row[0]);
  // The literature table has no data behind it, so any number in it would be invented.
  if (rows.length < 2 || rows.flat().some((cell) => /\d/.test(cell))) return null;
  return { label: '표 1', title: clip(raw?.title, 60) || '자료 비교 정리', columns, rows };
}

// 참고 자료 is not asked of the model in the second stage: code appends the student's own list. Asking for a
// two-line list under the 150-character section minimum made the model pad it, or repeat it until the output was cut off.
// What this draft investigates, in three short tags. They are stored per school+task so the next student in the
// same class can be steered to a different combination; nothing is ever rejected because of them.
export function describeCombination(dataTemplate, caseTag) {
  const parts = (dataTemplate?.conditions || []).map((condition) => String(condition).split(/s*·s*/).map((piece) => piece.trim()));
  const firsts = [...new Set(parts.map((part) => part[0]).filter(Boolean))];
  const seconds = [...new Set(parts.map((part) => part[1]).filter(Boolean))];
  return {
    caseTag: clip(caseTag, 40),
    variableTag: clip([firsts.join('/'), seconds.join('/')].filter(Boolean).join(' × '), 60),
    measureTag: clip([dataTemplate?.measurementName, dataTemplate?.unit ? `(${dataTemplate.unit})` : ''].filter(Boolean).join(' '), 40),
  };
}

export function stageSections(stage, input) {
  const wantsUse = /활용|적용|방안|제안/.test(String(input?.taskDescription || ''));
  if (stage === STAGE.DRAFT) return ['연구 질문', '이론적 배경', '가설', '탐구 방법', '결과 기록 계획'];
  if (stage === STAGE.FINAL) return ['연구 질문', '이론적 배경', '탐구 방법', '탐구 결과', '결과 분석', '결론', ...(wantsUse ? ['활용 방안'] : []), '계열 연계 탐구', '느낀 점'];
  if (stage === STAGE.LITERATURE) return ['연구 질문', '이론적 배경', '자료 조사 방법', '자료 비교 정리', '결론', ...(wantsUse ? ['활용 방안'] : []), '계열 연계 탐구'];
  return null;
}

export function stageSectionGuide(title, stage) {
  if (stage === STAGE.COMPLETE) return '';
  const text = String(title || '');
  const second = stage === STAGE.FINAL || stage === STAGE.LITERATURE;
  if (second && /연구 질문/.test(text)) return '1차 설계서의 연구 질문(물음표로 끝나는 질문)을 이어받는다. 주제를 고른 이유는 학생이 쓴 reason이 있으면 그 뜻과 표현을 살리고, 없으면 수업에서 생긴 궁금증으로 쓴다. 250~400자';
  if (second && /이론적 배경/.test(text)) return '1차 설계서의 이론을 이어받되 목표 수준에 맞게 구체적인 물질과 반응 수준으로 깊게 설명한다. 대상의 성분과 그에 맞는 효소·반응의 대응, 조건이 효소와 대상 각각에 주는 영향을 인과 관계로 쓴다. 700~1000자';
  if (stage === STAGE.FINAL && /탐구 방법/.test(text)) return '1차 설계서의 준비물, 변인, 절차, 안전을 실제로 한 과정으로 과거형으로 쓴다. 학생 관찰 메모에 설계와 다르게 한 점이 있으면 반영한다. 500~800자';
  if (stage === STAGE.DRAFT && /탐구 방법/.test(text)) return '학생이 직접 하는 실험으로 설계한다. 준비물, 조작·통제·종속 변인, 대조군, 번호를 붙인 절차, 조건마다 3회 이상 측정해 어떻게 기록할지, 측정 오차를 줄이는 방법, 안전 주의. 문헌 조사로 대신하지 않는다. 700~1000자';
  if (/가설/.test(text)) return '"~하면 ~할 것이다" 형태의 가설 1~2개와 그렇게 생각한 교과 근거. 150~300자';
  if (/결과 기록 계획/.test(text)) return '무엇을 어떤 단위나 점수 기준으로 조건마다 몇 번 측정해 표에 기록할지. 점수는 클수록 측정 항목이 크다는 뜻이 되게 정한다. 학생이 채울 결과 표 양식과 같은 내용이어야 한다. 결과나 예상 수치는 쓰지 않는다. 200~350자';
  if (/탐구 결과/.test(text)) return '표 1과 그림 1을 먼저 가리키고 조건별 평균을 결과정리의 숫자 그대로 비교한다. 평균이 같은 조건은 같다고 쓴다. 학생의 관찰 메모(note, observations)를 함께 쓴다. 해석은 다음 절로 미룬다. 400~600자';
  if (/결과 분석/.test(text)) return '가설이 맞았는지 조건마다 판단한다. 수준별비교가 있으면 기준마다 어느 쪽이 몇 점 높았는지 그대로 쓰고, 가설대로 나온 조건과 반대로 나온 조건을 나누어 밝힌다. 두 값이 다르면 "비슷하다"고 쓰지 않는다. 가장 그럴듯한 설명 외에 다른 가능한 설명을 최소 1개 검토하고 데이터가 어느 쪽을 더 지지하는지 따진다. 반복 측정의 흔들림이 큰 조건은 신뢰도가 낮다고 밝히고 원인을 추정한다. 700~1000자';
  if (/결론/.test(text)) return stage === STAGE.FINAL
    ? '연구 질문에 학생 데이터로 직접 답한다. 모든 조건에서 그렇지 않았다면 어느 조건에서 그랬는지까지 쓴다. 한계와 개선점을 쓰고, 이론 설명을 다시 반복하지 않는다. 300~500자'
    : '연구 질문에 자료 조사 결과로 답하고, 실험으로 확인하지 못한 한계를 쓴다. 이론 설명을 다시 반복하지 않는다. 300~500자';
  if (/계열 연계 탐구/.test(text)) return '선택한 계열(careerTrack)의 관점에서 이 결과가 연결되는 실제 문제나 기술을 설명하고, 그 분야에서 이어서 할 수 있는 심화 탐구 1~2개를 목표 수준에 맞게 구체적으로 제안한다(무엇을 바꾸어 무엇을 측정할지). 확립된 개념만 쓰고 기업명·제품명·수치는 지어내지 않는다. 400~600자';
  if (/활용 방안/.test(text)) return '탐구 결과를 근거로 실생활에서 쓸 수 있는 구체적인 방안 2~3개. 방안마다 어떤 결과에 근거했는지 밝힌다. 실험한 대상과 조건(재료, 얼룩 종류, 온도 등) 안에서만 말하고, 실험하지 않은 대상으로 넓히려면 추가 실험이 필요하다고 쓴다. 300~500자';
  if (/느낀 점/.test(text)) return '학생이 쓴 reflection 문장을 먼저 거의 그대로 쓰고(맞춤법만 다듬음), 결과에서 알게 된 점을 1~2문장 덧붙인다. 힘들었다, 재미있었다처럼 학생이 쓰지 않은 감정이나 경험은 새로 만들지 않는다. 150~350자';
  if (/참고 자료/.test(text)) return '학생이 적은 sources만 한 줄에 하나씩 쓴다. 다른 줄, 괄호 설명, ※ 문장을 덧붙이지 않는다. sources가 없으면 "통합과학1 교과서 효소 관련 단원"처럼 자료 종류만 적고, 단원명·기관명·사이트명을 지어내지 않는다.';
  if (/자료 조사 방법/.test(text)) return '어떤 종류의 자료(교과서, 과학 기사 등)를 어떤 기준으로 골라 비교했는지. 실험을 한 것처럼 쓰지 않는다. 300~450자';
  if (/자료 비교 정리/.test(text)) return '조건별로 자료에서 설명하는 경향을 비교 기준에 따라 정리하고 표 1(comparisonTable)과 연결한다. 숫자를 지어내지 않는다. 500~700자';
  return '';
}

function studentVoice(data) {
  return { reason: data.reason, observations: data.observations, reflection: data.reflection, sources: data.sources };
}

export function stagePromptLines(stage, input) {
  const data = input.studentData || normalizeStudentData(null);
  if (stage === STAGE.DRAFT) {
    return [
      '[이번 단계: 1차 탐구 설계서]',
      '- 이 보고서는 실험 전에 쓰는 설계서다. 학생이 이 설계대로 실험한 뒤 결과 표를 채우면 2차로 최종 보고서를 만든다.',
      '- 결과, 예상 수치, 결론을 쓰지 않는다. 가설은 쓴다.',
      '- 측정은 고등학생이 학교나 집에서 안전하게 할 수 있고 숫자로 기록할 수 있어야 한다. 기구로 재기 어려우면 0~3점 같은 점수 기준을 정한다.',
      '- 점수 기준은 값이 클수록 measurementName이 크다는 뜻이 되게 정한다. 예: 얼룩 제거 정도는 0점 그대로, 3점 완전히 제거. 작을수록 좋은 점수는 쓰지 않는다.',
      '- 목표 수준에 맞게 설계를 깊게 한다. 비교의 기준이 되는 대조군(예: 세제 없이 물만)을 conditions에 넣고, 조건마다 3회 이상 반복한다.',
      '- 측정은 눈대중보다 숫자로 잴 수 있는 방법을 우선한다(예: 같은 조명에서 찍은 사진으로 남은 얼룩 면적 비율 비교, 질량·시간 측정). 점수를 쓰면 점수마다 기준을 구체적으로 정하고, 같은 사람이 같은 조건에서 평가하는 등 오차를 줄이는 방법을 쓴다.',
      '- 가설에는 그렇게 예상하는 과학적 근거를 구체적인 물질·반응 수준으로 쓰고, 다른 결과가 나온다면 무엇을 뜻하는지도 한 문장 쓴다.',
      '- 본문에는 dataTemplate 같은 영어 항목 이름을 쓰지 않는다.',
      '- caseTag에는 이번 탐구의 실생활 사례를 8~20자로 짧게 적는다. 예: "우유 유당 분해", "렌즈 세척액 과산화수소". 본문에는 쓰지 않는다.',
      ...((input.recentCombinations || []).length
        ? ['', '[같은 학교에서 이 과제로 이미 만든 탐구 (사례 | 바꾼 것 | 잰 것)]',
           ...input.recentCombinations.map((line, index) => `  ${index + 1}. ${line}`),
           '- 위 목록과 겹치지 않는 사례를 고른다. 사례가 겹칠 수밖에 없으면 바꾸는 변인을, 그것도 겹치면 재는 방법을 다르게 한다. 목록에 없는 새 사례를 우선한다.', '']
        : []),
      '- dataTemplate은 학생이 채울 결과 표다. conditions는 표의 행이 될 조건 이름 2~8개(두 변인을 함께 바꾸면 "효소 세제 · 미지근한 물"처럼 "앞 변인 · 뒤 변인" 순서로 모든 조합), trials는 조건마다 반복 횟수(1~5), measurementName과 unit은 측정 항목과 단위(점수면 "점"), scaleGuide는 점수 기준이나 측정 방법 한 문장이다.',
    ];
  }
  if (stage === STAGE.FINAL) {
    const stats = computeStats(data);
    return [
      '[이번 단계: 2차 최종 보고서, 학생 실험 데이터 반영]',
      '- 학생이 1차 설계서대로 실험하고 결과를 입력했다. 아래 [학생 실험 데이터]의 학생입력과 결과정리가 학생의 실제 결과다.',
      '- 보고서의 모든 숫자는 학생입력, 결과정리, 1차 설계서에 있는 숫자여야 한다. 새 숫자, 다른 실험이나 문헌의 수치를 만들지 않는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- 결과정리의 평균, 첫조건과의차이, 첫조건대비변화율(%), 평균이높은순서, 평균이같은조건은 새로 계산하지 말고 그대로 쓴다.',
      '- 점수의 뜻은 scaleGuide를 따른다. 점수가 무엇을 뜻하는지 헷갈리게 쓰지 않는다.',
      '- 결과 분석과 결론은 조건마다 비교한다. 수준별비교가 있으면 기준마다 가장높은쪽이 두번째보다 몇 점(차이) 높았는지 그대로 쓴다. 두 값이 다르면 "비슷하다", "큰 차이가 없다"처럼 흐리게 쓰지 않는다. 가설과 반대로 나온 조건은 그대로 밝힌다. "같은 조건에서 항상", "모든 조건에서" 같은 말은 모든 조건에서 그랬을 때만 쓴다.',
      '- 평균이같은조건은 평균이 같은 조건 묶음이다. 서로 다른 조건의 평균이 같은 것은 우연일 수 있으므로 이를 근거로 해석하지 않는다.',
      '- 활용 방안은 실험한 대상과 조건 안에서만 말한다. 실험하지 않은 재료나 얼룩 종류로 넓히려면 추가 실험이 필요하다고 쓴다.',
      '- figures에는 이 데이터를 보여줄 표나 그래프를 1~3개 고른다. 숫자는 넣지 말고 kind(table, bar, line, grouped_bar, grouped_line), metric(raw, mean, diff_from_first, percent_from_first), conditionOrder(보여줄 조건 이름과 순서), title, caption만 쓴다. 조건이 "앞 변인 · 뒤 변인" 조합이면 grouped_bar나 grouped_line으로 앞 변인을 색으로 나누고 뒤 변인을 가로축에 놓는다. 뒤 변인이 순서 있는 값(온도, 시간 등)이면 grouped_line이 알맞다. 숫자는 학생 데이터로 코드가 채운다.',
      '- 본문에서 표와 그래프는 종류별로 나온 순서대로 "표 1", "그림 1"처럼 가리킨다.',
      '- reason, observations는 학생의 목소리다. 뜻과 표현을 최대한 살려 해당 절에 녹이고 맞춤법만 다듬는다.',
      '- 느낀 점 절은 reflection 문장을 먼저 거의 그대로 쓰고, 결과에서 알게 된 점만 1~2문장 덧붙인다. 학생이 쓰지 않은 감정(힘들었다, 재미있었다 등)은 자동으로 삭제된다.',
      '- 참고 자료 절은 쓰지 않는다. 학생이 적은 sources로 자동으로 붙는다.',
      '- 결과가 가설과 다르면 억지로 맞추지 말고 다르게 나온 그대로 쓴다.',
      '- 흔들림은 반복 측정값의 최대와 최소의 차이다. 흔들림을 점수 범위와 비교해 판단한다(예: 0~3점에서 1점은 큰 흔들림이다). 흔들림이 큰 조건은 결과의 신뢰도가 낮다고 밝히고 원인을 추정한다.',
      '- 수준별비교의 흔들림보다큰차이인가가 아니오이면 그 차이는 반복 측정의 흔들림보다 작거나 같으므로 "확실한 차이라고 보기 어렵다"고 쓴다. 조건 간 평균 차이가 흔들림보다 작은 비교를 근거로 결론을 내리지 않는다.',
      '- 본문과 그림 제목·설명에는 입력 자료의 항목 이름(결과정리, 수준별비교 같은 이름이나 영어 이름)을 그대로 쓰지 말고 "반복 측정값의 흔들림", "평균의 차이"처럼 자연스러운 말로 풀어 쓴다. 그림 설명에는 그림에 실제로 그려진 것만 쓴다(오차 막대는 그려지지 않는다).',
      '',
      '[학생 실험 데이터]',
      JSON.stringify({ 학생입력: { measurementName: data.measurementName, unit: data.unit, scaleGuide: data.scaleGuide, conditions: data.conditions, ...studentVoice(data) }, 결과정리: summaryForPrompt(stats) }, null, 2),
      '',
      '[1차 탐구 설계서]',
      data.draftReport || '(없음)',
    ];
  }
  if (stage === STAGE.LITERATURE) {
    return [
      '[이번 단계: 문헌 탐구 보고서]',
      '- 학생이 실험 결과를 입력하지 않았다. 실험을 했다고 쓰지 않고, 교과서와 자료 조사로 연구 질문에 답하는 문헌 탐구 보고서로 쓴다.',
      '- 1차 설계서가 있으면 연구 질문과 이론은 이어받고, 실험 설계는 자료 조사 방법으로 바꾼다.',
      '- comparisonTable에는 자료 비교 정리 절의 내용을 조건별로 정리한 표를 넣는다. columns는 3~4개, rows는 2~6개, 칸에는 짧은 말만 쓰고 숫자는 쓰지 않는다.',
      '- 입력에 근거 없는 숫자는 쓰지 않는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- 참고 자료 절은 쓰지 않는다. 학생이 적은 sources로 자동으로 붙는다.',
      '',
      '[학생이 적은 내용]',
      JSON.stringify(studentVoice(data), null, 2),
      '',
      '[1차 탐구 설계서]',
      data.draftReport || '(없음)',
    ];
  }
  return [];
}

export function stageLengthRule(stage) {
  if (stage === STAGE.DRAFT) return '분량은 공백 포함 1800~2800자다. 절마다 서로 다른 역할을 수행한다.';
  if (stage === STAGE.FINAL) return '분량은 공백 포함 4000~5500자다. 절마다 서로 다른 역할을 수행하고, 이론 설명을 여러 절에서 반복하지 않는다.';
  return '분량은 공백 포함 3200~4500자다. 절마다 서로 다른 역할을 수행하고, 이론 설명을 여러 절에서 반복하지 않는다.';
}

export function stageOutputKeys(stage) {
  if (stage === STAGE.DRAFT) return 'reportTitle, sections, dataTemplate, caseTag';
  if (stage === STAGE.FINAL) return 'reportTitle, sections, figures';
  if (stage === STAGE.LITERATURE) return 'reportTitle, sections, comparisonTable';
  return 'reportTitle, sections';
}

const STRING = { type: 'string' };
const STAGE_SCHEMA = {
  [STAGE.DRAFT]: {
    caseTag: { type: 'string' },
    dataTemplate: {
      type: 'object',
      additionalProperties: false,
      required: ['measurementName', 'unit', 'scaleGuide', 'conditions', 'trials'],
      properties: { measurementName: STRING, unit: STRING, scaleGuide: STRING, conditions: { type: 'array', minItems: 2, maxItems: MAX_CONDITIONS, items: STRING }, trials: { type: 'integer', minimum: 3, maximum: MAX_TRIALS } },
    },
  },
  [STAGE.FINAL]: {
    figures: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'metric', 'conditionOrder', 'title', 'caption'],
        properties: { kind: { type: 'string', enum: FIGURE_KINDS }, metric: { type: 'string', enum: METRICS }, conditionOrder: { type: 'array', items: STRING }, title: STRING, caption: STRING },
      },
    },
  },
  [STAGE.LITERATURE]: {
    comparisonTable: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'columns', 'rows'],
      properties: { title: STRING, columns: { type: 'array', items: STRING }, rows: { type: 'array', items: { type: 'array', items: STRING } } },
    },
  },
};

export function stageSchemaProperties(stage) {
  return STAGE_SCHEMA[stage] || {};
}

// Applies the stage rules to the model output before the sections are joined into one report.
export function finalizeStageOutput(stage, parsed, input) {
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  if (stage === STAGE.DRAFT) {
    const scrubbed = sections.map((section) => ({ ...section, body: scrubInternalNames(section?.body) }));
    const dataTemplate = sanitizeDataTemplate(parsed?.dataTemplate);
    return { parsed: { ...parsed, sections: scrubbed }, extra: { dataTemplate, combination: describeCombination(dataTemplate, parsed?.caseTag) } };
  }
  if (stage === STAGE.FINAL || stage === STAGE.LITERATURE) {
    const data = input.studentData || normalizeStudentData(null);
    const stats = stage === STAGE.FINAL ? computeStats(data) : null;
    const allowed = allowedNumberSet(data, stats);
    String(input.taskDescription || '').match(/\d+(?:\.\d+)?/g)?.forEach((number) => allowed.add(canonicalNumber(number)));
    const studentText = [data.reason, data.observations, data.reflection].join(' ');
    let removed = 0;
    let removedFeelings = 0;
    const cleaned = sections.map((section) => {
      const title = String(section?.title || '');
      if (/참고 자료/.test(title)) return { ...section, body: buildReferencesBody(section?.body, data.sources) };
      const numbers = removeUnsupportedNumbers(scrubInternalNames(section?.body), allowed);
      removed += numbers.removed;
      if (stage === STAGE.FINAL && /느낀 점/.test(title)) {
        const feelings = removeInventedFeelings(numbers.body, studentText);
        removedFeelings += feelings.removed;
        return { ...section, body: feelings.body };
      }
      return { ...section, body: numbers.body };
    });
    const referencesBody = data.sources.length ? data.sources.join('\n') : [String(input.subject || '').trim(), '교과서 관련 단원'].filter(Boolean).join(' ');
    if (!cleaned.some((section) => /참고 자료/.test(String(section?.title || '')))) cleaned.push({ title: '참고 자료', body: referencesBody });
    const extra = stage === STAGE.FINAL
      ? { figures: buildFigures(parsed?.figures, stats), figuresAfterSection: '탐구 결과', dataSummary: stats }
      : { comparisonTable: sanitizeComparisonTable(parsed?.comparisonTable), comparisonTableAfterSection: '자료 비교 정리' };
    return { parsed: { ...parsed, sections: cleaned }, extra: { ...extra, removedNumberSentences: removed, removedFeelingSentences: removedFeelings } };
  }
  return { parsed, extra: {} };
}
