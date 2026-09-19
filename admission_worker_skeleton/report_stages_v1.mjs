import { ingredientSchema, inspirationCitations, inspirationOf, usedIngredients } from './ingredients_v1.mjs';
import { normalizeSourceCards, referencesBody } from './references_v1.mjs';
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

// A report task is staged around whatever the student can collect: measurements, survey answers, published
// figures, or source cards. 논술·창작·발표 tasks have nothing to collect, so they keep the one-shot report.
export const COLLECTION = Object.freeze({ MEASUREMENT: 'measurement', SURVEY: 'survey', DATASET: 'dataset', READING: 'reading', NONE: 'none' });

export function resolveCollectionKind(input) {
  // Only what the assignment itself says. The subject name used to be in here, so 과학탐구실험 or 생명과학실험
  // made every task a measurement no matter what it asked for — a 통계 자료 분석 in 과학탐구실험 came out as one.
  // 과제 글만 본다. 사이트가 추정한 보고서 유형(reportMode, 예: '실험분석형')을 섞으면 '실험'이라는 말이 과제 글에 없어도
  // 실험 과제가 됐다 — 엔진 전수 검사(2026-09-18)에서 숫자 과제 988건 중 384건이 과제 글에 실험·측정·데이터라는 말이 없었다.
  const text = [input?.taskDescription, input?.taskName, input?.taskType].filter(Boolean).join(' ');
  const science = String(input?.subjectGroup || '').trim() === '과학';

  // Order matters, and it is the order a teacher would read the sentence in. What the student is asked to go out
  // and get comes first: "화학 반응을 관찰한 뒤 논술형 문제를 해결한다" is an experiment that ends in writing, not a
  // writing task. Only when nothing is being collected do the writing and performing words decide.
  if (/설문|인터뷰|여론 ?조사|응답자|만족도 ?조사/.test(text)) return COLLECTION.SURVEY;
  if (/실험|측정|실습|재어|계측/.test(text)) return COLLECTION.MEASUREMENT;
  // Graded as an essay answer: the student looks at something, but there is no table to fill in.
  if (/논술형 ?문제|논술형 ?평가|서·?논술형|논술형으로 ?해결|논술 ?문항/.test(text)) return COLLECTION.NONE;
  if (/통계|지표|빅데이터|공공 ?데이터|데이터를 ?수집|데이터를 ?분석|데이터 ?시각화|자료 ?해석|그래프 ?분석|추이|수치 ?자료|관측 ?자료/.test(text)) return COLLECTION.DATASET;
  // 야외 조사도 직접 재는 일이다. 「방형구를 설치해 개체 수를 조사」가 '조사'라는 말 때문에 문헌 조사로
  // 잡혀, 자료 5개를 읽으라는 설계서가 나왔다(운영 테스트 2026-09-18). 논술형·공개 자료 판정 **뒤에** 둔다 —
  // 수행평가 7,131건 가운데 이 말이 든 12건에서 바뀌는 것은 문헌으로 잡히던 2건뿐이다.
  if (/방형구|개체 ?수를|야외 ?조사|현장 ?조사|채집|표본 ?조사|식생 ?조사|군집 ?조사/.test(text)) return COLLECTION.MEASUREMENT;
  if (/관찰하여|관찰한|관측하여|관측한/.test(text)) return COLLECTION.MEASUREMENT;
  // '실험'이라는 말은 없어도 **양을 바꾸며 재는** 과제다: 「시간에 따른 속도 변화를 통해 운동을 분석」, 「힘과 가속도의 관계」.
  if (science && /에 ?따른 ?[가-힣A-Za-z]{1,10} ?(변화|차이)|(사이|간)의 관계|비례|반비례|[가-힣]{1,6}(과|와) [가-힣]{1,6}의 관계/.test(text)) return COLLECTION.MEASUREMENT;
  // 관찰하고 기록하는 과제, 회로를 꾸며 전류·전압을 재는 과제, 학교 생물 조사(바이오 블리츠) — 전수 검사에서 빠질 뻔한 것들
  if (science && /관찰 ?후|관찰하고|관찰 ?활동|바이오 ?블리츠|직렬|병렬|회로를 ?(구성|꾸미|만들)/.test(text)) return COLLECTION.MEASUREMENT;
  // Running a program and recording what it outputs is the same kind of work as measuring.
  if (/알고리즘|프로그래밍|프로그램을 ?작성|코드를 ?작성|구현하여|구현한|테스트 ?결과|오류를 ?수정|디버깅/.test(text)) return COLLECTION.MEASUREMENT;
  if (/데이터|자료를 ?분석/.test(text)) return COLLECTION.DATASET;

  // Nothing to collect: the student writes it, performs it, or makes it.
  if (/논술|논설|비평|서평|감상문|평론|창작|소설|시 ?쓰기|대본|각본|발표 ?대본|토론|토의|포트폴리오|산출물 ?제작|작품 ?제작|작품을 ?만|프로토타입|모형 ?제작/.test(text)) return COLLECTION.NONE;
  if (/연주|가창|합창|실기|시연|경기|연습|드로잉|스케치|디자인 ?작업|안무|무용/.test(text)) return COLLECTION.NONE;
  if (/타격|송구|드리블|서브|스파이크|리그전|경기에 ?참여|자세를 ?익|동작을 ?익/.test(text)) return COLLECTION.NONE;
  if (/말하기|말한다|듣기|읽고 ?쓰기|발음|회화|작문|번역|암송|낭독|어휘를 ?활용|의사소통 ?표현/.test(text)) return COLLECTION.NONE;

  if (/예술|체육|예체능|음악|미술|스포츠|운동|무용|체조|태권도|공예|연극/.test(String(input?.subjectGroup || '') + ' ' + String(input?.subject || ''))) return COLLECTION.NONE;
  // "탐구 보고서" is not a clue: every kind of task ends in one. Only the words that say where the material
  // comes from count here.
  if (/조사|문헌|자료를 ?찾|사례를 ?찾|주제 ?탐구|자료를 ?모아/.test(text)) return COLLECTION.READING;

  // 과제 글이 아무것도 말하지 않는다. 예전에는 과학 과목이면 실험으로 보았다 — 그러면 「독서 및 글쓰기」, 「자유주제발표」,
  // 「과학 도서 표지 디자인」까지 숫자 표를 채우는 과제가 됐다(2026-09-18). 학생도 모르는 것을 물을 수 없으니(사용자 결정)
  // 가장 적게 요구하는 쪽 — 자료를 읽고 쓰는 보고서 — 으로 둔다.
  return COLLECTION.READING;
}


const COLLECTION_LABEL = {
  [COLLECTION.MEASUREMENT]: '실험 측정',
  [COLLECTION.SURVEY]: '설문 조사',
  [COLLECTION.DATASET]: '공개 자료 수치 정리',
  [COLLECTION.READING]: '자료 조사(문헌)',
};

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const text = String(value ?? '').trim().replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

// 학생이 적은 소수 자릿수. 「6.0」을 숫자로 바꾸면 6이 되어 표에 「6」으로 나왔다 — 같은 열의 6.1·6.2와 자릿수가
// 어긋나 보인다(운영 테스트 2026-09-19). 표의 측정값 칸은 학생이 쓴 자릿수대로 보여 준다.
function decimalsOf(value) {
  const match = String(value ?? '').trim().replace(/,/g, '').match(/^-?\d+\.(\d+)$/);
  return match ? Math.min(match[1].length, 4) : 0;
}

export function normalizeStudentData(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const decimals = Math.max(0, ...(Array.isArray(src.conditions) ? src.conditions : [])
    .flatMap((row) => (Array.isArray(row?.values) ? row.values : []).map(decimalsOf)));
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
    sourceCards: (Array.isArray(src.sourceCards) ? src.sourceCards : []).slice(0, 6)
      .map((card) => ({ title: clip(card?.title, 80), type: clip(card?.type, 30), point: clip(card?.point, 300), take: clip(card?.take, 300) }))
      // 읽기 보고서의 카드는 '핵심 내용'(point)을 묻고, 실험 보고서의 카드는 '여기서 얻은 것'(take)만 묻는다.
      // point만 요구하면 실험 보고서에서 적은 자료가 여기서 통째로 버려진다 — 실제로 그렇게 버려지고 있었다.
      .filter((card) => card.title && (card.point || card.take)),
    draftTitle: clip(src.draftTitle, 80),
    draftReport: String(src.draftReport ?? '').trim().slice(0, 6000),
    decimals,
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
    // Numbers go to the measured report; source cards (or nothing) go to the literature report.
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
    decimals: Number(data.decimals) || 0,
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
    // With one value per cell there is no wobble to compare against, so the report may not call a gap clear.
    const singleShot = rows.every((row) => row.values.length < 2);
    return { at: second, values, higher: gap === 0 ? '같음' : sorted[0].label, runnerUp: sorted[1].label, gap, clearDifference: singleShot ? null : gap > wobble };
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
// 학생이 적은 자릿수대로(6.0 → "6.0"). 값이 없으면 빈칸.
function asTyped(value, decimals) {
  if (value === undefined || value === null || value === '') return '';
  return decimals > 0 && Number.isFinite(value) ? value.toFixed(decimals) : value;
}

export function buildFigures(specs, stats) {
  const valid = (Array.isArray(specs) ? specs : [])
    .filter((spec) => FIGURE_KINDS.includes(spec?.kind) && METRICS.includes(spec?.metric))
    .slice(0, 3);
  const name = stats.measurementName || '측정값';
  const grid = splitFactors(stats.rows);
  if (!valid.some((spec) => spec.kind === 'table')) valid.push({ kind: 'table', metric: 'raw', title: `조건별 ${name} 결과` });
  // A chart is worth drawing when there is a shape to see: a two-variable grid, or at least three conditions to
  // line up. Two bars say nothing the table has not already said, so no chart is added and any the model asked
  // for is dropped.
  const chartHelps = Boolean(grid) || stats.rows.length >= 3;
  const kept = chartHelps ? valid : valid.filter((spec) => spec.kind === 'table');
  // 그래프는 **AI가 고를 때만** 넣는다. 예전에는 조건이 셋 이상이면 AI가 안 골라도 막대그래프를 붙였다 — 모든 보고서가
  // 표 + 그래프 모양이 됐다(사용자 지적 2026-09-18). 보고서마다 그래프가 필요한 것은 아니다.
  const counters = { table: 0, chart: 0 };
  // The raw-data table comes first, then the charts drawn from it.
  const ordered = kept.slice(0, 4).sort((a, b) => (a.kind === 'table' ? 0 : 1) - (b.kind === 'table' ? 0 : 1));
  return ordered.map((spec) => {
    const rows = orderRows(spec.conditionOrder, stats.rows);
    const hasPercentBase = rows.every((row) => row.percent_from_first !== null);
    const metric = spec.metric === 'percent_from_first' && !hasPercentBase ? 'diff_from_first' : spec.metric;
    const unit = metric === 'percent_from_first' ? '%' : stats.unit;
    const label = spec.kind === 'table' ? `표 ${++counters.table}` : `그림 ${++counters.chart}`;
    const figure = { label, kind: spec.kind, metric, metricLabel: METRIC_LABEL[metric], title: clip(scrubInternalNames(spec.title), 60) || `조건별 ${name}`, caption: clip(cleanCaption(spec.caption), 160), unit };
    if (spec.kind === 'table') {
      if (metric === 'raw') {
        // One value per cell: the repeat columns, the mean of a single number and its wobble would all say the same thing.
        if (stats.trials <= 1) {
          return { ...figure, columns: ['조건', `${name}${stats.unit ? ` (${stats.unit})` : ''}`], rows: rows.map((row) => [row.label, asTyped(row.values[0], stats.decimals)]) };
        }
        const trials = Array.from({ length: stats.trials }, (_, index) => `${index + 1}회`);
        return { ...figure, columns: ['조건', ...trials, '평균', '흔들림'], rows: rows.map((row) => [row.label, ...trials.map((_, index) => asTyped(row.values[index], stats.decimals)), row.mean, row.spread]) };
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
  // With one value per cell there is no mean to speak of, so the summary is named after the value itself.
  const single = stats.trials <= 1;
  return {
    측정항목: stats.measurementName,
    단위: stats.unit,
    점수기준: stats.scaleGuide,
    반복횟수: stats.trials,
    조건별결과: stats.rows.map((row) => (single
      ? { 조건: row.label, 값: row.mean, 첫조건과의차이: row.diff_from_first, 첫조건대비변화율: row.percent_from_first, 관찰메모: row.note }
      : { 조건: row.label, 측정값: row.values, 평균: row.mean, 흔들림: row.spread, 첫조건과의차이: row.diff_from_first, 첫조건대비변화율: row.percent_from_first, 관찰메모: row.note })),
    [single ? '값이높은순서' : '평균이높은순서']: stats.ranking.map((item) => `${item.label} (${item.mean})`),
    [single ? '값이같은조건' : '평균이같은조건']: stats.sameMean,
    수준별비교: (stats.comparisons || []).map((item) => ({ 기준: item.at, 가장높은쪽: item.higher, 두번째: item.runnerUp, 차이: item.gap, 흔들림보다큰차이인가: item.clearDifference === null ? '반복이 없어 알 수 없음' : (item.clearDifference ? '예' : '아니오') })),
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
  [/\bflux\b/gi, '자속'],
  [/자료\s*카드/g, '자료'], [/카드\s*자료/g, '자료'],
  [/(기사|신문|보고서|교과서|논문|기관|통계|영상|도서)\s*카드/g, '$1'],
  [/카드별/g, '자료별'], [/카드들/g, '자료들'], [/카드(?!뉴스)/g, '자료'],
];

// 교과 확장 재료의 번호(P2, R1)는 AI와 우리 사이의 표시다 — 본문에 「(P2)」가 그대로 나왔다(비교 시험 2026-09-18).
// 본문의 인용 괄호 「(홍의정 외, 2024)」도 지운다 — 참고한 연구는 참고 문헌에만 적는다(사용자 결정 2026-09-18).
export function scrubIngredientIds(text) {
  return String(text || '').replace(/\s*\((?:[PR]\d(?:\s*[,·、]\s*)?)+\)/g, '').replace(/(^|[^A-Za-z0-9])[PR][1-9](?![0-9A-Za-z])/g, '$1')
    .replace(/\s*\([가-힣A-Za-z·\s]{1,30}(?:외)?,\s*(?:19|20)\d{2}\)/g, '')
    .replace(/[ \t]{2,}/g, ' ');
}

// 비교형 과제인가 — 비교표와 「자료 비교 정리」 절은 이런 과제에만 쓴다.
export function wantsComparison(input) {
  return /비교|대조|견주|차이점|공통점/.test([input?.taskDescription, input?.taskName].filter(Boolean).join(' '));
}

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

// 학생이 입력하지 않은 **행동**도 지어낸 것이다 — 운영 테스트(2026-09-19)에서 느낀 점에 「교과서 단원을 다시 읽으며
// 보완했다」가 나왔다. 학생은 그런 말을 쓴 적이 없다. 읽기·찾기·여쭙기 같은 행동은 학생이 쓴 글에 있을 때만 남긴다.
const INVENTED_ACTION = /다시 ?읽|찾아 ?읽|읽으며 ?보완|복습하며|여쭈|여쭤|물어보|검색해 ?보|찾아보았|찾아봤|조사해 ?보았|도움을 받/;
export function removeInventedActions(body, studentText) {
  const text = String(studentText || '');
  return filterSentences(body, (sentence) => !INVENTED_ACTION.test(sentence) || INVENTED_ACTION.test(text));
}

// 느낀 점 is what the teacher reads when they write 세특, so a sentence that praises the student — 성실하게
// 참여했다, 적극적으로 협동하였다 — is the one thing that must not be in it: the judgement is the teacher's to
// make. The prompt forbids it and the 생기부 draft strips it, but the section itself never did.
export function removeSelfPraise(body, studentText) {
  const text = String(studentText || '');
  return filterSentences(body, (sentence) => !SELF_PRAISE.test(sentence) || text.includes(sentence.trim().slice(0, 12)));
}

// 결론의 마지막 문단 — 후속 탐구. 따로 된 「교과 심화와 확장」 절 대신 여기가 이번 탐구가 어디로 더 깊어지는지 쓰는 자리다.
const FOLLOW_UP = '마지막 문단은 후속 탐구다: 이번에 쓴 교과 개념과 방법이 어느 방향으로 더 깊어지는지, 실제로 해 볼 수 있는 다음 탐구 1개를 무엇을 바꾸어 무엇을 볼지까지 쓰고, 그 방향이 관심 계열과 어떻게 이어지는지 한 문장으로 닿는다. 학생의 데이터와 결론이 주인공이므로 이 문단은 짧게 쓴다. 따로 제목을 달지 않는다.';

// 참고 자료 절의 이름. '참고'가 들어 있거나 '출처'로 **시작**할 때만이다 — 「자료 출처와 분석 기준」은 방법 절인데
// '출처'가 들어 있다고 참고 자료로 보고 본문을 참고 자료 목록으로 덮어썼다(엔진 전수 검사 2026-09-18, 106건).
export const REFERENCE_TITLE = /참고|^\s*출처/;

// 참고 자료는 학생이 적은 것이 먼저고, 교과서 한 줄이 마지막에 붙는다. 만드는 규칙은 references_v1에 있다.
// 카드가 있으면 카드가 이긴다 — 제목만 적힌 줄보다 "무엇을 얻었는지"가 적힌 카드가 참고 자료답다.
export function buildReferencesBody(body, sources, extra = {}) {
  const cards = normalizeSourceCards(extra.cards);
  const written = (sources || []).map((line) => String(line || '').trim()).filter(Boolean);
  return referencesBody({
    cards,
    // 개념에 맞는 공개 자료를 자동으로 붙인다. 학생이 본 자료가 아니므로 '얻은 것'은 안 적고
    // 무엇인지와 주소만 적는다 — 선생님이 물으면 학생이 열어 확인할 수 있다.
    datasets: extra.datasets || [],
    // 개념에 맞는 KCI 논문. 원문이 열려 있고 주소가 있는 것만 온다.
    papers: extra.papers || [],
    // 대학 연구 소개 글. 넣기 직전에 주소가 열리는 것을 확인했고 접속일이 붙어 있다.
    web: extra.web || [],
    textbook: extra.textbook || '',
    fallbackBody: written.length ? written.join('\n') : body,
  });
}

function sanitizeSourceTemplate(raw) {
  return {
    cardCount: Math.min(6, Math.max(3, Math.round(Number(raw?.cardCount) || 4))),
    whatToFind: clip(raw?.whatToFind, 200),
  };
}

export function singleMeasure(name) {
  const text = String(name || '').trim();
  const cut = text.match(/^(.+?(?:수|율|도|점수|길이|시간|질량|무게|높이|양|농도|속도|거리|넓이|부피|개수|횟수))\s*(?:와|과|및|,|·|\/|그리고)\s*\S/);
  return cut ? cut[1].trim() : text;
}

function sanitizeDataTemplate(raw, kind) {
  const conditions = [...new Set((Array.isArray(raw?.conditions) ? raw.conditions : []).map((label) => clip(label, 60)).filter(Boolean))].slice(0, MAX_CONDITIONS);
  // Repeating makes sense only for a measurement: a student cannot ask the same class the same question three
  // times, and a published figure for one year has one value.
  const trials = kind === COLLECTION.MEASUREMENT ? Math.min(MAX_TRIALS, Math.max(3, Math.round(Number(raw?.trials) || 3))) : 1;
  return {
    // 한 칸에는 값 하나 — 「종별 개체 수와 피복 점수」처럼 두 값을 한 칸에 담은 이름은 앞의 값만 남긴다(운영 테스트 2026-09-18:
    // 학생은 종수를 적었는데 표 제목이 「개체 수와 피복 점수 결과」로 나왔다).
    measurementName: singleMeasure(clip(raw?.measurementName, 40)) || '측정값',
    unit: clip(raw?.unit, 20),
    scaleGuide: clip(raw?.scaleGuide, 200),
    conditions: conditions.length >= 2 ? conditions : ['조건 1', '조건 2'],
    trials,
  };
}

// Shaped after 69 real 세특 entries: noun-form endings, no first person, one fact per sentence.
const HANGUL_BASE = 0xac00;
const JONGSEONG_MIEUM = 16;
function endsInNounForm(text) {
  const last = String(text || '').replace(/[.\s]+$/, '').slice(-1);
  const index = last.charCodeAt(0) - HANGUL_BASE;
  return index >= 0 && index < 11172 && index % 28 === JONGSEONG_MIEUM;
}
const SELF_PRAISE = /성실|적극적|우수|뛰어|탁월|훌륭|모범|열정적|돋보|인상적/;
const FIRST_PERSON = /^(나는|내가|저는|제가)\b|\b(나의|내)\s/;

// Keeps only the sentences that are actually usable as a record line: noun ending, no first person, no praise
// of the student. Fewer than three usable lines means no box at all rather than a half-empty one.
export function buildRecordDraft(lines, allowed) {
  const cleaned = (Array.isArray(lines) ? lines : [])
    .map((line) => scrubInternalNames(String(line || "")).trim().replace(/^[-·•\d.\s]+/, "").replace(/\s+/g, " "))
    .map((line) => (allowed ? removeUnsupportedNumbers(line, allowed).body.trim() : line))
    .filter((line) => line.length >= 20 && line.length <= 120)
    .filter((line) => endsInNounForm(line))
    .filter((line) => !FIRST_PERSON.test(line) && !SELF_PRAISE.test(line))
    .slice(0, 6);
  return cleaned.length >= 3 ? cleaned : null;
}

export function buildSourceCardTable(cards) {
  if (!Array.isArray(cards) || cards.length < 2) return null;
  return {
    label: '표 1',
    title: '내가 조사한 자료 정리',
    columns: ['자료', '종류', '핵심 내용', '내 해석'],
    rows: cards.map((card) => [card.title, card.type || '-', card.point, card.take || '-']),
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
  const parts = (dataTemplate?.conditions || []).map((condition) => String(condition).split(/\s*·\s*/).map((piece) => piece.trim()));
  const firsts = [...new Set(parts.map((part) => part[0]).filter(Boolean))];
  const seconds = [...new Set(parts.map((part) => part[1]).filter(Boolean))];
  return {
    caseTag: clip(caseTag, 40),
    variableTag: clip([firsts.join('/'), seconds.join('/')].filter(Boolean).join(' × '), 60),
    measureTag: clip([dataTemplate?.measurementName, dataTemplate?.unit ? `(${dataTemplate.unit})` : ''].filter(Boolean).join(' '), 40),
  };
}

const CONCLUSION = /결론|맺음|종합|마무리/;
// Three of the corpus shapes run 자료 해석 → 오차·한계 분석 → 후속 탐구 and simply stop: 19 of 32 real reports
// came back with no 결론 at all. A 탐구보고서 that never answers its own question is not one, so a conclusion is
// put back in front of whatever closes the report.
function withConclusion(sections) {
  if (!sections.length || sections.some((section) => CONCLUSION.test(section))) return sections;
  const closing = sections.findIndex((section) => /후속|활용|제언|참고|출처|성찰/.test(section));
  const at = closing < 0 ? sections.length : closing;
  return [...sections.slice(0, at), '결론', ...sections.slice(at)];
}

// The title is not a heading — it is the line that ends up in 생활기록부. Teachers copy it across and rarely
// carry the body with it, so an 입학사정관 reads this one line and nothing else. It has to say what the student
// handled, what they did with their own hands, and what they were trying to see.
const TITLE_EXAMPLES = {
  [COLLECTION.MEASUREMENT]: [
    '  나쁨: "효소의 작용에 대한 탐구" — 무엇을 재었는지, 무엇과 비교했는지 하나도 보이지 않는다.',
    '  나쁨: "물 온도에 따른 얼룩 제거 비교" — 규모가 없다. 조건을 몇 개 두고 몇 번 쟀는지가 빠졌다.',
    '  나쁨: "용액 3종·측정법 2종 6조건 전류 3회 측정에서 간접법 흔들림 감소 비교" — 뜻은 다 들어 있지만 묶음말과 가운뎃점이 많아 한 번에 읽히지 않는다.',
    '  좋음: "증류수와 수돗물, 소금물 세 가지 용액에서 전류를 직접 재는 방법과 전압으로 계산하는 방법을 여섯 조건으로 3회씩 비교한 측정"',
    '  좋음: "물 온도와 세제 종류를 네 조건으로 나누어 얼룩이 지워진 정도를 3회씩 반복해 잰 비교 측정"',
  ],
  [COLLECTION.SURVEY]: [
    '  나쁨: "청소년 수면에 관한 연구" — 누구에게 무엇을 물었는지 없다.',
    '  나쁨: "수면과 집중도 설문 분석" — 몇 명에게 물었는지가 빠졌다.',
    '  좋음: "같은 학년 62명에게 취침 시각을 묻고 1교시 집중도 점수와 견주어 본 설문 분석"',
  ],
  [COLLECTION.DATASET]: [
    '  나쁨: "고령화 문제 탐구" — 어떤 자료로 무엇을 견주었는지 없다.',
    '  나쁨: "인구 통계로 본 고령화 비교" — 몇 년치인지, 어디를 견주었는지가 빠졌다.',
    '  좋음: "최근 10년 다섯 시·군의 인구 통계를 모아 고령 인구 비율이 해마다 얼마나 빨리 늘었는지 지역끼리 견준 분석"',
  ],
  [COLLECTION.READING]: [
    '  나쁨: "원자력 발전에 대한 고찰" — 무엇을 읽고 무엇을 따졌는지 없다.',
    '  나쁨: "기사를 비교한 원자력 찬반 분석" — 몇 편을 읽었는지가 빠졌다.',
    '  좋음: "원자력 발전을 다룬 찬반 신문 기사 네 편을 읽고 각 글이 근거를 숫자로 드는지 사례로 드는지 견준 비교 분석"',
  ],
  [COLLECTION.NONE]: [
    '  나쁨: "매체 언어의 이해" — 한 일이 없다.',
    '  좋음: "급식실 손 소독 의무화를 다룬 찬반 칼럼 세 편이 어떤 조건과 범위를 밝히는지 따져 본 논증 타당성 평가"',
  ],
};

const SIZE_WORD = {
  [COLLECTION.MEASUREMENT]: '조건을 몇 개 두고 몇 번 반복해 쟀는지',
  [COLLECTION.SURVEY]: '몇 명에게 물었는지',
  [COLLECTION.DATASET]: '몇 년치 자료인지, 몇 곳(몇 항목)을 견주었는지',
  [COLLECTION.READING]: '자료를 몇 편 읽었는지',
  [COLLECTION.NONE]: '자료나 사례를 몇 개 다루었는지',
};

export function titleRules(kind = COLLECTION.MEASUREMENT, stage = STAGE.COMPLETE) {
  const second = stage === STAGE.FINAL || stage === STAGE.LITERATURE;
  return [
    '',
    '[reportTitle — 생활기록부에 그대로 옮겨 적히는 한 줄]',
    '- 담당 선생님은 이 제목을 생활기록부에 거의 그대로 옮긴다. 대학 입학사정관은 보고서 본문을 보지 못하고 이 한 줄만 읽는다.',
    '- 그러므로 제목만 읽고도 다음 세 가지가 보여야 한다.',
    '  ① 무엇을 다루었나 — 막연한 분야 이름이 아니라 구체적인 대상이나 상황',
    '  ② 학생이 직접 무엇을 했나 — 측정·집계·설문·수집·비교·분석·설계·검증·평가 중 실제로 한 일을 낱말로 넣는다',
    '  ③ 무엇을 보려 했나 — 어떤 차이나 영향을 확인하려 했는지',
    `- 여기에 규모를 반드시 넣는다: ${SIZE_WORD[kind] || SIZE_WORD[COLLECTION.MEASUREMENT]}. 규모가 없으면 한 번 해 본 것인지 제대로 한 것인지 읽는 사람이 알 수 없다.`,
    '- 규모는 실제로 한 만큼만 쓴다. 설계서의 계획과 학생이 채운 자료에 없는 숫자를 지어내지 않는다.',
    '- 규모를 뭉뚱그린 말에 붙이지 않는다. "자료 5편", "문헌 4개", "사례 3건"은 읽는 사람이 그게 무엇인지 알 수 없다. 무엇인지 먼저 밝히고 세어 준다.',
    '  나쁨: 자료 5편 / 문헌 4개 / 사례 3건 / 데이터 2종',
    '  좋음: 신문 기사 4편 / 관광 안내서와 학술 논문 5편 / 교과서 단원 2곳 / 지역 인구 통계 10년치 / 같은 학년 62명 / 물 온도 4조건',
    '- 자료의 종류는 학생이 실제로 읽거나 모은 것에서 가져온다. 기관 이름, 신문 이름, 출판사 이름은 학생이 적은 것이 아니면 제목에 넣지 않는다.',
    '- 종류가 여럿이면 대표로 두세 가지만 적는다. "신문·교과서·기관 자료·잡지·단행본 5편"처럼 다 나열하면 제목이 목록이 된다. "신문 기사와 학술 자료 5편"이면 충분하다.',
    '- 숫자는 제목에 많아야 두 개다. 규모를 나타내는 숫자 하나에 필요하면 기간 하나까지. 숫자가 셋 넘게 들어가면 읽는 사람이 무엇이 중요한지 알 수 없다.',
    '- 소리 내어 읽어 자연스러운 우리말이어야 한다. 조사를 빼고 명사만 이어 붙이거나 "~를 위한 ~ 규명" 같은 딱딱한 말투로 쓰지 않는다.',
    '- 위첨자나 아래첨자가 있어야 제대로 보이는 화학식은 제목에서 일반 이름으로 바꾼다(예: 구리 착이온, 아세트산). 물, 소금물, 이산화탄소처럼 익숙한 이름은 그대로 쓴다.',
    '- 길이는 공백 포함 45~90자를 기준으로 한다. 30자 아래로 짧아졌으면 규모나 조건, 알아낸 것 중 무엇인가가 빠진 것이다. 90자를 넘으면 한 탐구에 여러 가지를 담으려 한 것이니 탐구를 좁힌다.',
    '- 제목은 처음부터 끝까지 하나의 명사구다. 끝을 ~비교, ~분석, ~측정, ~설계, ~평가로 맺는다.',
    '- 쉼표로 명사구 두 개를 나란히 붙이지 않는다. "A를 측정, B를 확인"은 제목이 아니라 요약 문장이다. 선생님은 생활기록부에 "\'제목\'을 수행하여 ~"처럼 쓰기 때문에, 제목 안에 문장이 들어 있으면 문장이 겹쳐 읽기 어려워진다. 다만 "~하여", "~어", "~은"처럼 이어 주는 말로 자연스럽게 잇는 것은 괜찮다.',
    '- 짧게 줄이려고 뜻을 깎지 않는다. 이 한 줄이 읽는 사람이 보는 전부이므로, 길어지더라도 한 번에 이해되는 쪽이 낫다.',
    '- 묶음말로 압축하지 않는다. "측정법 2종"이 아니라 "직접 재는 방법과 전압으로 계산하는 방법"이라고 풀어 쓴다. "용액 3종"이 아니라 "증류수·수돗물·소금물 세 가지 용액"이라고 쓴다.',
    '- 가운뎃점(·)은 한 제목에 한 번까지만 쓴다. 그 이상은 "~과 ~", "~에서 ~"처럼 우리말로 잇는다. 가운뎃점이 셋 넘게 들어간 제목은 이미 읽기 어려워진 것이다.',
    '- 조사를 넣어 말이 되게 쓴다. 명사만 이어 붙이면 담당 선생님도 입학사정관도 한 번에 이해하지 못한다.',
    '- 다 쓴 뒤 소리 내어 읽어 본다. 한 번에 뜻이 들어오지 않으면 풀어서 다시 쓴다.',
    '- 쓰지 않는다: 쉼표로 이은 두 토막, 콜론(:)과 부제, 물음표, 과목 이름, "~에 대한 고찰", "~의 이해", "~ 연구"처럼 한 일이 드러나지 않는 말, 수행평가 안내문을 잘라 붙인 문장.',
    '- 약어는 풀어 쓴다. OUV, BOD, KNN처럼 그 분야 사람만 아는 말은 제목에서 우리말로 바꾼다(탁월한 보편적 가치, 생물학적 산소 요구량 등).',
    '- 원소 기호를 이어 붙인 이름도 우리말로 바꾼다. Cu–Cl은 구리–염화, NaCl은 염화나트륨으로 쓴다. 널리 쓰이는 단위(°C, mL, %)와 물·소금물·이산화탄소·산소처럼 누구나 아는 이름은 그대로 둔다.',
    '- 두 과목을 제목에 억지로 다 넣지 않는다. 실제로 한 일 안에 다른 과목의 방법이 들어 있으면 그 방법을 적는 것만으로 드러난다.',
    ...(second
      ? ['- 이번에는 학생의 자료가 있다. 결과정리를 보고 조건에 따라 값이 한 방향으로 뚜렷하게 움직였으면, 알아낸 방향까지 제목에 담는다. 무엇을 했는지에 더해 무엇을 알아냈는지가 보이는 제목이 생활기록부에서 훨씬 강하다.',
        '- 방향은 쉼표 뒤에 문장으로 붙이지 말고, 명사구 안에 넣는다. "증가", "감소", "차이", "~에 따른 ~ 증가"처럼 명사로 바꾸어 담는다.',
        '- 명사구로 쓰라는 규칙 때문에 알아낸 것을 빼지 않는다. 둘은 함께 지킬 수 있고, 아래 예처럼 쓰면 된다.',
        '  나쁨: "진자 충돌 6조건 3회 측정, 각도가 클수록 보존도 증가 확인" — 쉼표로 명사구 둘을 붙여 놓아 제목이 아니다.',
        '  나쁨: "염화농도·온도 6조건 구리 착이온 녹색 성분 3회 측정 비교" — 값이 뚜렷하게 올라갔는데 알아낸 것이 빠졌다.',
        '  좋음: "질량비와 각도를 여섯 조건으로 나눈 진자 충돌을 3회씩 재어 각도가 클수록 운동량 보존도가 커짐을 확인한 측정"',
        '  좋음: "염화 이온 농도와 온도를 여섯 조건으로 바꾸며 구리 착이온의 녹색 성분을 3회씩 재어 농도와 온도가 높을수록 커짐을 확인한 측정"',
        '  좋음: "고령화 정도가 다른 두 군의 심정지 구급출동 비율을 네 개 연도에 걸쳐 견주어 해마다 늘어남을 확인한 비교"',
        '  좋음: "수원 화성을 다룬 관광 안내서와 학술 논문 다섯 편에서 발행 주체에 따라 인물 서술이 어떻게 갈리는지 견준 비교"',
        '- 다만 다음 경우에는 방향을 쓰지 않고 "비교"나 "분석"으로 끝낸다: 조건마다 방향이 엇갈릴 때, 조건 간 차이가 반복 측정의 흔들림보다 작을 때, 값이 하나뿐이라 비교가 안 될 때. 확인하지 않은 것을 확인했다고 쓰지 않는다.',
        '- 1차 설계서의 제목을 그대로 쓰지 않는다. 같은 탐구를 가리키되, 실제로 한 규모와 확인한 것이 드러나게 고쳐 쓴다.']
      : []),
    ...(TITLE_EXAMPLES[kind] || TITLE_EXAMPLES[COLLECTION.MEASUREMENT]),
  ];
}

export function stageSections(stage, input) {
  const wantsUse = /활용|적용|방안|제안/.test(String(input?.taskDescription || ''));
  // The draft is a plan, not the report, so it keeps its own five parts whatever the task is.
  if (stage === STAGE.DRAFT) return ['연구 질문', '이론적 배경', '가설', '탐구 방법', '결과 기록 계획'];
  // The finished report follows the structure this kind of task really uses (7,131 real 과제 decided the
  // seventeen shapes); the two sections our own flow needs are added to it. A structure the site sent
  // explicitly still wins — that came from the student answering questions about their own task.
  const shaped = withConclusion((input?.reportShape?.sections || []).filter(Boolean));
  const siteChose = (input?.targetStructure || []).filter(Boolean).length >= 4;
  if (shaped.length >= 4 && !siteChose) {
    const useSection = wantsUse && !shaped.some((section) => /활용|방안/.test(section)) ? ['활용 방안'] : [];
    // The one-shot report closes with its sources; the two-stage flow closes with 느낀 점 (it feeds the teacher's 세특).
    // 「교과 심화와 확장」 절은 없앴다(사용자 결정 2026-09-18) — 학교 보고서 양식에는 그런 절이 없어 학생이 옮기다
    // 버리게 된다. 그 내용은 결론(또는 양식의 고찰·제언·확장 절)의 마지막 문단, 후속 탐구로 들어간다.
    if (stage === STAGE.COMPLETE) {
      const closes = shaped.some((section) => REFERENCE_TITLE.test(section));
      return [...shaped, ...useSection, ...(closes ? [] : ['참고문헌'])];
    }
    return [...shaped, ...useSection, '느낀 점'];
  }
  if (stage === STAGE.FINAL) return ['연구 질문', '이론적 배경', '탐구 방법', '탐구 결과', '결과 분석', '결론', ...(wantsUse ? ['활용 방안'] : []), '느낀 점'];
  if (stage === STAGE.LITERATURE) return ['연구 질문', '이론적 배경', '자료 조사 방법', wantsComparison(input) ? '자료 비교 정리' : '자료 분석과 해석', '결론', ...(wantsUse ? ['활용 방안'] : []), '느낀 점'];
  return null;
}

export function stageSectionGuide(title, stage, kind = COLLECTION.MEASUREMENT) {
  const draftMethod = {
    [COLLECTION.SURVEY]: '설문을 설계한다. 묻는 대상과 인원, 문항과 보기, 언제 어떻게 받을지, 응답을 어떻게 셀지, 답을 왜곡하지 않는 문항 표현, 개인정보를 묻지 않는 주의까지 쓴다. 700~1000자',
    [COLLECTION.DATASET]: '어떤 공개 자료에서 어떤 지표를 어떤 기준으로 뽑아 비교할지 설계한다. 비교할 항목(연도·지역 등), 같은 기준으로 맞추는 방법, 자료의 한계(조사 방법이 다를 수 있음)까지 쓴다. 수치와 기관명은 지어내지 않는다. 700~1000자',
    [COLLECTION.READING]: '어떤 종류의 자료를 몇 개 읽고 무엇을 뽑아 적을지 설계한다. 자료를 고르는 기준, 서로 다른 관점을 함께 보는 방법, 각 자료에서 확인할 항목, 자료를 믿을 수 있는지 따지는 방법을 쓴다. 실제로 읽지 않은 자료의 내용을 미리 쓰지 않는다. 700~1000자',
  };
  const draftRecord = {
    [COLLECTION.SURVEY]: '응답을 어떤 표에 어떻게 기록할지 쓴다. 집단과 보기별로 몇 명이 답했는지 세어 적는 방식이어야 한다. 결과나 예상 수치는 쓰지 않는다. 200~350자',
    [COLLECTION.DATASET]: '찾은 수치를 어떤 표에 어떤 단위로 기록할지, 출처를 어디에 적을지 쓴다. 결과나 예상 수치는 쓰지 않는다. 200~350자',
    [COLLECTION.READING]: '자료마다 제목, 자료 종류, 핵심 내용, 내 해석을 카드로 적는다는 계획을 쓴다. 몇 개를 읽을지와 무엇을 찾을지가 드러나야 한다. 아직 읽지 않았으므로 내용을 미리 쓰지 않는다. 200~350자',
  };
  if (stage === STAGE.DRAFT && /탐구 방법/.test(String(title)) && draftMethod[kind]) return draftMethod[kind];
  if (stage === STAGE.DRAFT && /결과 기록 계획/.test(String(title)) && draftRecord[kind]) return draftRecord[kind];
  return stageSectionGuideBase(title, stage);
}

function stageSectionGuideBase(title, stage) {
  if (stage === STAGE.COMPLETE) return '';
  const text = String(title || '');
  const second = stage === STAGE.FINAL || stage === STAGE.LITERATURE;
  if (second && /연구 질문/.test(text)) return '1차 설계서의 연구 질문(물음표로 끝나는 질문)을 이어받는다. 주제를 고른 이유는 학생이 쓴 reason이 있으면 그 뜻과 표현을 살리고, 없으면 수업에서 생긴 궁금증으로 쓴다. 250~400자';
  if (second && /이론적 배경/.test(text)) return '1차 설계서의 이론을 이어받되 목표 수준에 맞게 구체적인 물질과 반응 수준으로 깊게 설명한다. 대상의 성분과 그에 맞는 효소·반응의 대응, 조건이 효소와 대상 각각에 주는 영향을 인과 관계로 쓴다. 700~1000자';
  if (stage === STAGE.FINAL && /탐구 방법/.test(text)) return '1차 설계서의 준비물, 변인, 절차, 안전을 실제로 한 과정으로 과거형으로 쓴다. 학생 관찰 메모에 설계와 다르게 한 점이 있으면 반영한다. 500~800자';
  if (stage === STAGE.DRAFT && /탐구 방법/.test(text)) return '학생이 직접 하는 실험으로 설계한다. 준비물, 조작·통제·종속 변인, 대조군, 번호를 붙인 절차, 조건마다 3회 이상 측정해 어떻게 기록할지, 측정 오차를 줄이는 방법, 안전 주의. 문헌 조사로 대신하지 않는다. 700~1000자';
  if (/가설/.test(text)) return '"~하면 ~할 것이다" 형태의 가설 1~2개와 그렇게 생각한 교과 근거. 150~300자';
  if (/결과 기록 계획/.test(text)) return '무엇을 어떤 단위나 점수 기준으로 조건마다 몇 번 측정해 표에 기록할지. 점수는 클수록 측정 항목이 크다는 뜻이 되게 정한다. 학생이 채울 결과 표 양식과 같은 내용이어야 한다. 2차 보고서에서는 조건별 값과 평균, 흔들림(최댓값-최솟값)을 담은 표가 만들어지고, 비교가 뚜렷한 경우에만 막대나 선 그래프가 하나 붙는다. 표준편차, 오차막대, 흔들림을 표시한 선, 통계 검정처럼 만들어지지 않는 것을 하겠다고 쓰지 않고, 그래프가 반드시 들어간다고도 쓰지 않는다. 결과나 예상 수치는 쓰지 않는다. 200~350자';
  if (/탐구 결과|결과 정리|관찰 기록|자료 정리/.test(text)) return '표 1을 먼저 가리키고, 그림이 있을 때만 그림 1도 함께 가리킨다. 조건별 평균을 결과정리의 숫자 그대로 비교한다. 평균이 같은 조건은 같다고 쓴다. 학생의 관찰 메모(note, observations)를 함께 쓴다. 해석은 다음 절로 미룬다. 400~600자';
  if (/결과 분석|자료 해석|패턴 해석|결과 해석/.test(text)) return '가설이 맞았는지 조건마다 판단한다. 수준별비교가 있으면 기준마다 어느 쪽이 몇 점 높았는지 그대로 쓰고, 가설대로 나온 조건과 반대로 나온 조건을 나누어 밝힌다. 두 값이 다르면 "비슷하다"고 쓰지 않는다. 가장 그럴듯한 설명 외에 다른 가능한 설명을 최소 1개 검토하고 데이터가 어느 쪽을 더 지지하는지 따진다. 반복 측정의 흔들림이 큰 조건은 신뢰도가 낮다고 밝히고 원인을 추정한다. 700~1000자';
  if (/오차|한계/.test(text)) return '이 탐구에서 확실하게 말할 수 있는 것과 없는 것을 나눈다. 측정이나 자료의 한계, 조건 수가 적어 생긴 제약을 구체적으로 쓰고, 그래서 결론을 어디까지만 말할 수 있는지 밝힌다. 300~500자';
  if (/결론/.test(text)) return stage === STAGE.FINAL
    ? `연구 질문에 학생 데이터로 직접 답한다. 모든 조건에서 그렇지 않았다면 어느 조건에서 그랬는지까지 쓴다. 한계와 개선점을 쓰고, 이론 설명을 다시 반복하지 않는다. ${FOLLOW_UP} 450~700자`
    : `연구 질문에 자료 조사 결과로 답하고, 실험으로 확인하지 못한 한계를 쓴다. 이론 설명을 다시 반복하지 않는다. ${FOLLOW_UP} 450~700자`;
  // 학교 양식에 이미 확장·후속·제언·고찰 절이 있으면 후속 탐구는 그 절이 맡는다.
  if (/교과 심화와 확장|계열 연계 탐구|확장|후속|제언|고찰/.test(text)) return `이번 탐구의 결과에서 출발해 ${FOLLOW_UP} 400~600자`;
  if (/활용 방안/.test(text)) return '탐구 결과를 근거로 실생활에서 쓸 수 있는 구체적인 방안 2~3개. 방안마다 어떤 결과에 근거했는지 밝힌다. 실험한 대상과 조건(재료, 얼룩 종류, 온도 등) 안에서만 말하고, 실험하지 않은 대상으로 넓히려면 추가 실험이 필요하다고 쓴다. 300~500자';
  if (/느낀 점/.test(text)) return '학생이 입력하지 않은 행동(교과서를 다시 읽었다, 자료를 찾아 읽었다, 선생님께 여쭈었다 등)을 새로 만들지 않는다. 학생이 쓴 reflection 문장을 먼저 거의 그대로 쓰고(맞춤법만 다듬음), 이어서 이번 탐구를 다음 순서로 정리한다. ①내가 한 활동을 무엇을 어떤 기준으로 했는지 구체적으로 ②그래서 이해하게 된 교과 개념 ③참고한 자료에서 확인한 것(sources에 있는 것만) ④결과에서 드러난 것을 숫자와 함께 ⑤이 탐구의 한계 ⑥다음에 확인하고 싶은 것. 모두 학생의 말투(~했다)로 쓰고, 성실했다·적극적이었다처럼 태도를 스스로 칭찬하는 말은 쓰지 않는다. 한 것을 적으면 태도는 드러난다. 힘들었다, 재미있었다처럼 학생이 쓰지 않은 감정이나 경험은 새로 만들지 않는다. 400~700자';
  if (/참고 자료/.test(text)) return '학생이 적은 sources만 한 줄에 하나씩 쓴다. 다른 줄, 괄호 설명, ※ 문장을 덧붙이지 않는다. sources가 없으면 "통합과학1 교과서 효소 관련 단원"처럼 자료 종류만 적고, 단원명·기관명·사이트명을 지어내지 않는다.';
  if (/자료 조사 방법/.test(text)) return '어떤 종류의 자료(교과서, 과학 기사 등)를 어떤 기준으로 골라 비교했는지. 실험을 한 것처럼 쓰지 않는다. 300~450자';
  if (/자료 비교 정리/.test(text)) return '자료에서 설명하는 경향을 비교 기준에 따라 정리한다. 표가 있을 때만 표 1과 연결하고, 표가 없으면 글로만 비교한다. 숫자를 지어내지 않는다. 500~700자';
  if (/자료 분석과 해석/.test(text)) return '자료 카드에서 얻은 근거로 연구 질문에 대한 답을 세운다. 자료끼리 어떻게 뒷받침하거나 부딪히는지 글로 따진다. 표를 만들지 않는다. 숫자를 지어내지 않는다. 500~700자';
  return '';
}

function studentVoice(data) {
  return { reason: data.reason, observations: data.observations, reflection: data.reflection, sources: data.sources };
}

// 학생이 고른 참고 도서. 자료 카드 중에 종류가 '도서'인 것이다.
//
// 학교에서 구두로 "책을 읽고 첨부해라" 하는 수행평가가 있다. 학생은 책을 읽을 시간이 없으므로, 우리가
// 정리해 둔 그 책의 내용이 카드의 핵심 내용으로 들어온다. 그건 **그 책이 실제로 다루는 내용**이라
// 인용은 사실이다. 다만 **읽은 소감은 학생만 쓸 수 있다** — 모델이 지어내면 그 순간 거짓이 된다.
export function pickedBook(data) {
  return (data?.sourceCards || []).find((card) => /도서|책/.test(String(card?.type || '')) && String(card?.title || '').trim()) || null;
}

// 카드의 종류 칸은 "도서 · 샘 킨"이다. 지은이만 떼어 낸다.
const bookAuthor = (book) => String(book?.type || '').replace(/^\s*도서\s*[·|,]?\s*/, '').trim();

export function bookRules(book) {
  if (!book) return [];
  return [
    `- 학생이 참고 도서를 첨부했다: 「${book.title}」${bookAuthor(book) ? ` (${bookAuthor(book)})` : ''}.`,
    '- 이 책은 **이론적 배경**에서 한두 문장으로 근거로 쓴다. 아래 [참고 도서]에 적힌 내용만 쓰고, 거기 없는 내용·줄거리·인물·문장은 지어내지 않는다.',
    '- 책 이름은 「제목」(지은이) 형태로 **한 번만** 밝히고, 그 뒤로는 자연스럽게 이어 쓴다. 절 이름을 따로 만들지 않는다.',
    '- "이 책을 읽고 느꼈다", "인상 깊었다"처럼 **읽은 경험이나 감상은 쓰지 않는다.** 학생이 직접 적은 줄이 있으면 그것만 쓴다.',
    '- 책을 주제로 만들지 않는다. 이 보고서의 주제는 그대로이고, 책은 이론을 받쳐 주는 자료 하나다.',
  ];
}

export function bookBlock(book) {
  if (!book) return [];
  return [
    '',
    '[참고 도서]',
    JSON.stringify({
      제목: book.title, 지은이: bookAuthor(book),
      이_책이_다루는_내용: book.point || '',
      학생이_적은_이어지는_점: book.take || '(학생이 적지 않음 — 지어내지 않는다)',
    }, null, 2),
  ];
}

export function stagePromptLines(stage, input) {
  const data = input.studentData || normalizeStudentData(null);
  const kind = input.collectionKind || COLLECTION.MEASUREMENT;
  const book = pickedBook(data);
  if (stage === STAGE.DRAFT) {
    return [
      '[이번 단계: 1차 탐구 설계서]',
      `- 이 과제에서 학생이 모을 자료는 "${COLLECTION_LABEL[kind]}"이다. 설계는 이 방식에 맞춘다.`,
      '- 이 보고서는 자료를 모으기 전에 쓰는 설계서다. 학생이 이 설계대로 자료를 모아 표나 카드를 채우면 2차로 최종 보고서를 만든다.',
      ...(input.collectionKind === COLLECTION.SURVEY
        ? ['- 설문은 고등학생이 학급이나 학교에서 받을 수 있는 규모로 설계한다. 문항은 3~5개, 보기는 3~5개로 하고, conditions에는 "집단 · 보기"처럼 응답을 셀 칸의 이름을 넣는다. measurementName은 "응답 수", unit은 "명"으로 한다.']
        : []),
      ...(input.collectionKind === COLLECTION.DATASET
        ? ['- 학생이 공개 자료(통계표, 기관 공개 지표 등)에서 숫자를 옮겨 적을 수 있게 설계한다. conditions에는 "연도"나 "지역·항목"처럼 비교할 칸 이름을 넣고, measurementName과 unit에는 그 지표와 단위를 쓴다. 자료의 출처 종류(무엇에서 찾을지)는 본문에 밝히되 기관명이나 수치를 지어내지 않는다.']
        : []),
      ...(input.collectionKind === COLLECTION.READING
        ? ['- 이 과제는 숫자를 재지 않는다. dataTemplate 대신 sourceTemplate을 쓴다. cardCount는 학생이 읽을 자료 수(3~6), whatToFind에는 각 자료에서 무엇을 찾아 적어야 하는지 한 문장으로 쓴다.',
           '- 학생은 자료마다 제목, 자료 종류, 핵심 내용, 내 해석을 카드로 적는다. 본문에는 학생이 아직 읽지 않은 자료의 내용을 미리 쓰지 않는다.']
        : []),
      '- 결과, 예상 수치, 결론을 쓰지 않는다. 가설은 쓴다.',
      ...(kind === COLLECTION.MEASUREMENT
        ? ['- 측정은 고등학생이 학교나 집에서 안전하게 할 수 있고 숫자로 기록할 수 있어야 한다. 기구로 재기 어려우면 0~3점 같은 점수 기준을 정한다.',
           '- 점수 기준은 값이 클수록 measurementName이 크다는 뜻이 되게 정한다. 예: 얼룩 제거 정도는 0점 그대로, 3점 완전히 제거. 작을수록 좋은 점수는 쓰지 않는다.',
           '- 목표 수준에 맞게 설계를 깊게 한다. 비교의 기준이 되는 대조군(예: 세제 없이 물만)을 conditions에 넣고, 조건마다 3회 이상 반복한다.']
        : ['- 같은 칸을 여러 번 채우게 하지 않는다. 칸마다 값은 하나이고, 비교는 conditions에 넣은 칸들 사이에서 한다. 목표 수준에 맞게 비교할 칸을 충분히(4개 이상) 두어 설계를 깊게 한다.']),
      ...(kind !== COLLECTION.MEASUREMENT ? [] : ['- 측정은 눈대중보다 숫자로 잴 수 있는 방법을 우선한다(예: 같은 조명에서 찍은 사진으로 남은 얼룩 면적 비율 비교, 질량·시간 측정). 점수를 쓰면 점수마다 기준을 구체적으로 정하고, 같은 사람이 같은 조건에서 평가하는 등 오차를 줄이는 방법을 쓴다.']),
      '- 가설에는 그렇게 예상하는 과학적 근거를 구체적인 물질·반응 수준으로 쓰고, 다른 결과가 나온다면 무엇을 뜻하는지도 한 문장 쓴다.',
      '- 본문에는 dataTemplate 같은 영어 항목 이름을 쓰지 않는다. flux, gap 같은 영어 낱말도 자속, 차이처럼 우리말로 쓴다.',
      '- 2차 보고서에서 만들어지는 것은 조건별 값과 평균, 흔들림(최댓값-최솟값)을 담은 표이고, 그래프는 비교가 뚜렷할 때만 하나 붙는다. 표준편차, 오차막대, 흔들림 표시선, 유의성 검정처럼 만들어 주지 않는 것을 하겠다고 쓰지 않는다.',
      '- caseTag에는 이번 탐구의 실생활 사례를 8~20자로 짧게 적는다. 예: "우유 유당 분해", "렌즈 세척액 과산화수소". 본문에는 쓰지 않는다.',
      ...((input.recentCombinations || []).length
        ? ['', '[같은 학교에서 이 과제로 이미 만든 탐구 (사례 | 바꾼 것 | 잰 것)]',
           ...input.recentCombinations.map((line, index) => `  ${index + 1}. ${line}`),
           '- 위 목록과 겹치지 않는 사례를 고른다. 사례가 겹칠 수밖에 없으면 바꾸는 변인을, 그것도 겹치면 재는 방법을 다르게 한다. 목록에 없는 새 사례를 우선한다.',
           '- 단, 수행평가 안내문이 정해 둔 대상·장소·재료·방법은 바꾸지 않는다. 겹침은 그 안의 세부 조건과 재는 방법으로 피한다.', '']
        : []),
      '- measurementName은 한 칸에 적을 **값 하나**의 이름이다. 두 가지 값(예: 개체 수와 피복 점수)을 한 칸에 담지 않는다. 여러 값을 재야 하면 연구 질문에 가장 중심이 되는 하나를 표에 두고, 나머지는 관찰 메모에 적게 한다.',
      `- dataTemplate은 학생이 채울 결과 표다. conditions는 표의 행이 될 조건 이름 2~8개(두 변인을 함께 바꾸면 "효소 세제 · 미지근한 물"처럼 "앞 변인 · 뒤 변인" 순서로 모든 조합), ${kind === COLLECTION.MEASUREMENT ? 'trials는 조건마다 반복 횟수(3~5)' : 'trials는 반드시 1'}, measurementName과 unit은 ${kind === COLLECTION.MEASUREMENT ? '측정 항목과 단위(점수면 "점")' : '적을 값의 이름과 단위'}, scaleGuide는 ${kind === COLLECTION.MEASUREMENT ? '점수 기준이나 측정 방법' : '값을 어디서 어떻게 옮겨 적는지'} 한 문장이다.`,
    ];
  }
  if (stage === STAGE.FINAL) {
    const stats = computeStats(data);
    return [
      '[이번 단계: 2차 최종 보고서, 학생 실험 데이터 반영]',
      '- 학생이 1차 설계서대로 실험하고 결과를 입력했다. 아래 [학생 실험 데이터]의 학생입력과 결과정리가 학생의 실제 결과다.',
      '- 보고서의 모든 숫자는 학생입력, 결과정리, 1차 설계서에 있는 숫자여야 한다. 새 숫자, 다른 실험이나 문헌의 수치를 만들지 않는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- 결과정리의 평균, 첫조건과의차이, 첫조건대비변화율(%), 평균이높은순서, 평균이같은조건은 새로 계산하지 말고 그대로 쓴다.',
      '- 표 1(학생이 잰 값)은 항상 만들어진다. 그래프는 figures에 고른 경우에만 붙는다. 그래프를 고르지 않았으면 본문에서 그림을 가리키지 않는다.',
      '- 점수의 뜻은 scaleGuide를 따른다. 점수가 무엇을 뜻하는지 헷갈리게 쓰지 않는다.',
      '- 결과 분석과 결론은 조건마다 비교한다. 수준별비교가 있으면 기준마다 가장높은쪽이 두번째보다 몇 점(차이) 높았는지 그대로 쓴다. 두 값이 다르면 "비슷하다", "큰 차이가 없다"처럼 흐리게 쓰지 않는다. 가설과 반대로 나온 조건은 그대로 밝힌다. "같은 조건에서 항상", "모든 조건에서" 같은 말은 모든 조건에서 그랬을 때만 쓴다.',
      ...(stats.trials <= 1
        ? ['- 칸마다 값이 하나뿐이라 반복의 흔들림이 없다. 값 하나를 "평균"이라고 부르지 않는다. 평균, 흔들림, 반복의 안정성을 근거로 쓰지 않고, 값 자체와 칸 사이의 차이로만 비교한다. 차이가 작을 때는 확실하다고 단정하지 않고, 값이 하나뿐이라 단정할 수 없다고 밝힌다.']
        : []),
      '- 평균이같은조건은 평균이 같은 조건 묶음이다. 서로 다른 조건의 평균이 같은 것은 우연일 수 있으므로 이를 근거로 해석하지 않는다.',
      '- 활용 방안은 실험한 대상과 조건 안에서만 말한다. 실험하지 않은 재료나 얼룩 종류로 넓히려면 추가 실험이 필요하다고 쓴다.',
      '- figures에는 이 데이터를 보여줄 표나 그래프를 고른다. 표는 코드가 항상 만들므로 넣지 않아도 된다. 그래프는 표보다 한눈에 더 잘 보이는 모양(순서 있는 값의 경향, 두 변인이 엇갈리는 모양)이 있을 때만 고르고, 표로 충분하면 고르지 않는다. 조건이 둘뿐이면 그래프를 고르지 않는다. 억지로 채우지 말고 필요 없으면 빈 배열로 둔다. 최대 3개다. 숫자는 넣지 말고 kind(table, bar, line, grouped_bar, grouped_line), metric(raw, mean, diff_from_first, percent_from_first), conditionOrder(보여줄 조건 이름과 순서), title, caption만 쓴다. 조건이 "앞 변인 · 뒤 변인" 조합이면 grouped_bar나 grouped_line으로 앞 변인을 색으로 나누고 뒤 변인을 가로축에 놓는다. 뒤 변인이 순서 있는 값(온도, 시간 등)이면 grouped_line이 알맞다. 숫자는 학생 데이터로 코드가 채운다.',
      '- 본문에서 표와 그래프는 종류별로 나온 순서대로 "표 1", "그림 1"처럼 가리킨다.',
      '- reason, observations는 학생의 목소리다. 뜻과 표현을 최대한 살려 해당 절에 녹이고 맞춤법만 다듬는다.',
      '- recordDraft는 담당 선생님이 생활기록부를 쓸 때 참고하도록 이번 탐구를 정리한 문장 묶음이다. 학생이 제출하는 보고서 본문에는 들어가지 않는다.',
      '- recordDraft 문장은 4~6개, 한 문장 40~90자로 쓴다. 모두 3인칭 명사형으로 끝낸다(예: ~를 설계함, ~를 비교 분석함, ~를 확인함, ~로 해석함). 나는, 내가 같은 1인칭이나 ~했다 같은 종결은 쓰지 않는다.',
      '- recordDraft 순서는 ①무엇을 어떤 기준으로 했는지 ②이해한 교과 개념 ③참고한 자료에서 확인한 것 ④결과에서 드러난 것(숫자가 있으면 숫자와 함께) ⑤한계나 보완할 점 ⑥이어서 하고 싶은 탐구다. 한 문장에 한 가지만 담는다.',
      '- recordDraft에는 성실함, 적극성, 우수함처럼 학생을 평가하는 말을 쓰지 않는다. 평가는 선생님이 한다. 우리는 한 일과 알아낸 것만 적는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- recordDraft의 내용은 모두 위 보고서와 학생이 입력한 자료에 있는 것이어야 한다. 새 사실이나 새 숫자를 만들지 않는다.',
      '- 느낀 점 절은 reflection 문장을 먼저 거의 그대로 쓰고, 이어서 활동 → 이해한 개념 → 참고한 자료 → 숫자로 드러난 것 → 한계 → 다음에 하고 싶은 것 순서로 이어 쓴다. 이 절은 담당 선생님이 학생의 활동을 파악하는 자리이므로, 무엇을 어떤 기준으로 했는지가 문장마다 드러나야 한다.',
      '- 느낀 점 절에서 성실함, 적극성, 협동심처럼 학생의 태도를 평가하는 말은 쓰지 않는다. 실제로 한 일(조건을 통제한 것, 반복 측정한 것, 자료를 비교한 것)만 쓰면 된다. 학생이 쓰지 않은 감정(힘들었다, 재미있었다 등)은 자동으로 삭제된다.',
      '- 참고 자료 절은 쓰지 않는다. 학생이 적은 sources로 자동으로 붙는다.',
      ...bookRules(book),
      '- 결과가 가설과 다르면 억지로 맞추지 말고 다르게 나온 그대로 쓴다.',
      '- 흔들림은 반복 측정값의 최대와 최소의 차이다. 흔들림을 점수 범위와 비교해 판단한다(예: 0~3점에서 1점은 큰 흔들림이다). 흔들림이 큰 조건은 결과의 신뢰도가 낮다고 밝히고 원인을 추정한다.',
      '- 수준별비교의 흔들림보다큰차이인가가 아니오이면 그 차이는 반복 측정의 흔들림보다 작거나 같으므로 "확실한 차이라고 보기 어렵다"고 쓴다. 조건 간 평균 차이가 흔들림보다 작은 비교를 근거로 결론을 내리지 않는다.',
      '- 본문과 그림 제목·설명에는 입력 자료의 항목 이름(결과정리, 수준별비교 같은 이름이나 영어 이름)을 그대로 쓰지 말고 "반복 측정값의 흔들림", "평균의 차이"처럼 자연스러운 말로 풀어 쓴다. 그림 설명에는 그림에 실제로 그려진 것만 쓴다(오차 막대는 그려지지 않는다).',
      ...bookBlock(book),
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
      ...(data.sourceCards.length
        ? ['- 보고서 본문에 \'카드\'라는 말은 쓰지 않는다. \'자료\', \'기사\', \'보고서\'처럼 실제 자료의 이름으로 부른다.',
          '- 학생이 직접 조사한 자료 카드가 아래에 있다. 카드에 적힌 제목, 핵심 내용, 학생의 해석만을 근거로 쓰고, 카드에 없는 자료나 내용을 지어내지 않는다. 표 1은 학생의 카드로 코드가 만든다.']
        : ['- 학생이 실험 결과를 입력하지 않았다. 실험을 했다고 쓰지 않고, 교과서와 자료 조사로 연구 질문에 답하는 문헌 탐구 보고서로 쓴다.']),
      '- 1차 설계서가 있으면 연구 질문과 이론은 이어받고, 실험 설계는 자료 조사 방법으로 바꾼다.',
      '- 자료가 같은 기준으로 나란히 비교될 때만 comparisonTable을 넣는다. 기준이 서로 다른 자료를 억지로 한 표에 넣지 않는다. 넣을 때는 columns 3~4개, rows 2~6개, 칸에는 짧은 말만 쓰고 숫자는 쓰지 않는다. 필요 없으면 표 없이 글로만 쓴다.',
      '- 입력에 근거 없는 숫자는 쓰지 않는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- 참고 자료 절은 쓰지 않는다. 학생이 적은 sources로 자동으로 붙는다.',
      ...bookRules(book),
      '- recordDraft는 담당 선생님이 생활기록부를 쓸 때 참고하도록 이번 탐구를 정리한 문장 묶음이다. 학생이 제출하는 보고서 본문에는 들어가지 않는다.',
      '- recordDraft 문장은 4~6개, 한 문장 40~90자로 쓴다. 모두 3인칭 명사형으로 끝낸다(예: ~를 설계함, ~를 비교 분석함, ~를 확인함, ~로 해석함). 나는, 내가 같은 1인칭이나 ~했다 같은 종결은 쓰지 않는다.',
      '- recordDraft 순서는 ①무엇을 어떤 기준으로 했는지 ②이해한 교과 개념 ③참고한 자료에서 확인한 것 ④결과에서 드러난 것(숫자가 있으면 숫자와 함께) ⑤한계나 보완할 점 ⑥이어서 하고 싶은 탐구다. 한 문장에 한 가지만 담는다.',
      '- recordDraft에는 성실함, 적극성, 우수함처럼 학생을 평가하는 말을 쓰지 않는다. 평가는 선생님이 한다. 우리는 한 일과 알아낸 것만 적는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- recordDraft의 내용은 모두 위 보고서와 학생이 입력한 자료에 있는 것이어야 한다. 새 사실이나 새 숫자를 만들지 않는다.',
      ...bookBlock(book),
      '',
      '[학생이 적은 내용]',
      JSON.stringify({ ...studentVoice(data), 자료카드: data.sourceCards }, null, 2),
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

export function stageOutputKeys(stage, input = {}) {
  if (stage === STAGE.DRAFT && input.collectionKind === COLLECTION.READING) return 'reportTitle, sections, sourceTemplate, caseTag';
  if (stage === STAGE.DRAFT) return 'reportTitle, sections, dataTemplate, caseTag';
  if (stage === STAGE.FINAL) return 'reportTitle, sections, figures, recordDraft';
  if (stage === STAGE.LITERATURE) return 'reportTitle, sections, comparisonTable, recordDraft';
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
    recordDraft: { type: 'array', minItems: 3, maxItems: 6, items: STRING },
    figures: {
      type: 'array',
      minItems: 0,
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
    recordDraft: { type: 'array', minItems: 3, maxItems: 6, items: STRING },
    comparisonTable: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'columns', 'rows'],
      properties: { title: STRING, columns: { type: 'array', items: STRING }, rows: { type: 'array', items: { type: 'array', items: STRING } } },
    },
  },
};

export function stageSchemaProperties(stage, input = {}) {
  const base = baseSchemaProperties(stage, input);
  const sent = (input.ingredients?.papers || []).length + (input.ingredients?.research || []).length;
  // 재료는 확장을 쓰는 단계(최종·문헌·한 번에 끝나는 보고서)에만 간다 — 설계서에는 안 간다.
  // 칸을 **앞에** 둔다 — 긴 답의 맨 끝에 둔 칸에서 AI가 헤맸다(ingredients_v1 의 ingredientSchema).
  return sent && stage !== STAGE.DRAFT ? { ...ingredientSchema(input.ingredients), ...base } : base;
}

function baseSchemaProperties(stage, input = {}) {
  if (stage === STAGE.DRAFT && input.collectionKind === COLLECTION.READING) {
    return {
      caseTag: { type: 'string' },
      sourceTemplate: {
        type: 'object',
        additionalProperties: false,
        required: ['cardCount', 'whatToFind'],
        properties: { cardCount: { type: 'integer', minimum: 3, maximum: 6 }, whatToFind: { type: 'string' } },
      },
    };
  }
  if (stage === STAGE.DRAFT && input.collectionKind && input.collectionKind !== COLLECTION.MEASUREMENT) {
    const draft = STAGE_SCHEMA[STAGE.DRAFT];
    return {
      ...draft,
      dataTemplate: {
        ...draft.dataTemplate,
        properties: { ...draft.dataTemplate.properties, trials: { type: 'integer', minimum: 1, maximum: 1 } },
      },
    };
  }
  return STAGE_SCHEMA[stage] || {};
}

// Applies the stage rules to the model output before the sections are joined into one report.
export function finalizeStageOutput(stage, parsed, input) {
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  if (stage === STAGE.DRAFT) {
    const scrubbed = sections.map((section) => ({ ...section, body: scrubInternalNames(section?.body) }));
    const kind = input.collectionKind || COLLECTION.MEASUREMENT;
    if (kind === COLLECTION.READING) {
      const sourceTemplate = sanitizeSourceTemplate(parsed?.sourceTemplate);
      return {
        parsed: { ...parsed, sections: scrubbed },
        extra: { collectionKind: kind, sourceTemplate, combination: { caseTag: clip(parsed?.caseTag, 40), variableTag: '', measureTag: clip(sourceTemplate.whatToFind, 40) },
 },
      };
    }
    const dataTemplate = sanitizeDataTemplate(parsed?.dataTemplate, kind);
    return { parsed: { ...parsed, sections: scrubbed }, extra: { collectionKind: kind, dataTemplate, combination: describeCombination(dataTemplate, parsed?.caseTag) } };
  }
  if (stage === STAGE.FINAL || stage === STAGE.LITERATURE) {
    const data = input.studentData || normalizeStudentData(null);
    const stats = stage === STAGE.FINAL ? computeStats(data) : null;
    // 교과 확장 재료를 보냈으면(ingredients_v1) **AI가 실제로 쓴 재료**가 참고 자료의 논문·대학 글이다.
    const used = input.ingredients ? usedIngredients(parsed, input.ingredients) : null;
    const usedRefs = used ? inspirationCitations(inspirationOf(used)) : null;
    const refPapers = usedRefs ? usedRefs.papers : (input.referencePapers || []);
    const refWeb = used ? used.research : (input.referenceWeb || []);
    const allowed = allowedNumberSet(data, stats);
    String(input.taskDescription || '').match(/\d+(?:\.\d+)?/g)?.forEach((number) => allowed.add(canonicalNumber(number)));
    // 교과 확장 재료의 서지 숫자(연도·권·호·쪽)는 지어낸 숫자가 아니다. 이것을 막았더니 「(이윤미 외, 2024)」가 든 문장이
    // 통째로 지워져 연구가 본문에서 사라졌다(비교 시험 2026-09-18).
    for (const one of [...(input.ingredients?.papers || []), ...(input.ingredients?.research || [])]) {
      [one.year, one.volume, one.issue, ...String(one.pages || '').split('-'), String(one.date || '').slice(0, 4)]
        .filter((value) => /^\d+$/.test(String(value || ''))).forEach((value) => allowed.add(canonicalNumber(value)));
    }
    const studentText = [data.reason, data.observations, data.reflection].join(' ');
    let removed = 0;
    let removedFeelings = 0;
    const cleaned = sections.map((section) => {
      const title = String(section?.title || '');
      if (/참고 자료/.test(title)) {
        return { ...section, body: buildReferencesBody(section?.body, data.sources, {
          datasets: input.referenceDatasets || [], papers: refPapers, web: refWeb,
          cards: data.sourceCards, textbook: input.textbookCitation || '',
        }) };
      }
      const numbers = removeUnsupportedNumbers(scrubInternalNames(input.ingredients ? scrubIngredientIds(section?.body) : section?.body), allowed);
      removed += numbers.removed;
      if (/느낀 점/.test(title)) {
        const feelings = removeInventedFeelings(numbers.body, studentText);
        const praise = removeSelfPraise(feelings.body, studentText);
        const actions = removeInventedActions(praise.body, studentText);
        removedFeelings += feelings.removed + praise.removed + actions.removed;
        return { ...section, body: actions.body };
      }
      return { ...section, body: numbers.body };
    });
    // 모델에게는 참고 자료 절을 쓰지 말라고 일러 두었으므로, 거의 항상 여기서 붙는다. **실제 경로는 이쪽이다** —
    // 위의 buildReferencesBody만 고쳤을 때 아무것도 바뀌지 않았던 이유가 이것이었다.
    const refs = buildReferencesBody('', data.sources, { cards: data.sourceCards, datasets: input.referenceDatasets || [], papers: refPapers, web: refWeb, textbook: input.textbookCitation || '' })
      || [String(input.subject || '').trim(), '교과서 관련 단원'].filter(Boolean).join(' ');
    if (!cleaned.some((section) => /참고 자료/.test(String(section?.title || '')))) cleaned.push({ title: '참고 자료', body: refs });
    const extra = stage === STAGE.FINAL
      ? { figures: buildFigures(parsed?.figures, stats), figuresAfterSection: '탐구 결과', dataSummary: stats }
      // 비교표는 **비교형 과제이거나 AI가 비교할 수 있다고 표를 고른 때만**. 예전에는 자료 카드가 둘 이상이면 AI 판단과
      // 상관없이 표를 만들었다 — 논술·비평·성찰 과제에도 「내가 조사한 자료 정리」 표가 붙었다(2026-09-18).
      : { comparisonTable: wantsComparison(input) || sanitizeComparisonTable(parsed?.comparisonTable)
            ? buildSourceCardTable(data.sourceCards) || sanitizeComparisonTable(parsed?.comparisonTable) : null,
          comparisonTableAfterSection: '자료 비교 정리' };
    const recordDraft = buildRecordDraft(parsed?.recordDraft, allowed);
    return { parsed: { ...parsed, sections: cleaned }, extra: { ...extra, recordDraft, removedNumberSentences: removed, removedFeelingSentences: removedFeelings,
      ...(used ? { inspiration: inspirationOf(used) } : {}) } };
  }
  // The one-shot report has no student data to check numbers against, but the two filters that need no data were
  // never run on it: our own field names (카드, dataTemplate, gap) and sentences that praise the student.
  let removedPraise = 0;
  // 한 번에 끝나는 보고서의 참고 자료도 **우리가 확인한 것**으로 채운다. 전에는 모델이 쓴 그대로 나갔다 —
  // 모델에게는 논문을 보내지 않으므로 「국어 교과서의 현대소설 단원」, 「문학 이론 개론서」처럼 자료 **종류**만
  // 적혔고, 이미 골라 둔 논문·교과서 단원은 빠졌다(엔진 전수 검사 2026-09-18). 모델이 쓴 후속 탐구 제안은 남긴다.
  // 재료를 보냈으면(ingredients_v1) **AI가 실제로 쓴 재료**가 참고 자료다. 낱말로 짝지은 논문은 쓰지 않는다.
  const used = input.ingredients ? usedIngredients(parsed, input.ingredients) : null;
  const usedRefs = used ? inspirationCitations(inspirationOf(used)) : null;
  const verified = buildReferencesBody('', [], {
    datasets: input.referenceDatasets || [],
    papers: usedRefs ? usedRefs.papers : (input.referencePapers || []),
    web: usedRefs ? used.research : (input.referenceWeb || []),
    textbook: input.textbookCitation || '',
  });
  const oneShot = sections.map((section) => {
    const title = String(section?.title || '');
    if (verified && REFERENCE_TITLE.test(title)) {
      const follow = String(section?.body || '').match(/후속 ?탐구[^\n]*\n([\s\S]+)/)?.[1]?.trim() || '';
      return { ...section, body: follow && /후속/.test(title) ? `${verified}\n\n후속 탐구 제안\n${scrubInternalNames(follow)}` : verified };
    }
    const body = scrubInternalNames(input.ingredients ? scrubIngredientIds(section?.body) : section?.body);
    if (!/느낀 점|소감|성찰/.test(String(section?.title || ''))) return { ...section, body };
    // The student wrote nothing here, so any feeling in it was invented by the model.
    const feelings = removeInventedFeelings(body, '');
    const praise = removeSelfPraise(feelings.body, '');
    removedPraise += praise.removed + feelings.removed;
    return { ...section, body: praise.body };
  });
  // 사이트가 고른 구성(「반론 검토 / 재반박 / 결론」 등)에는 참고 자료 절이 없을 때가 많다 — 전수 검사에서 한 번에
  // 끝나는 보고서 503건 가운데 484건이 참고 자료 없이 끝났다. 확인된 자료가 있으면 끝에 붙인다.
  // 절이 없는 답(보고서 글 하나로 온 옛 모양)에는 붙이지 않는다 — 붙이면 참고 자료 절 하나만 남아 본문이 통째로 사라진다.
  // 확인된 자료가 하나도 없으면(단원을 못 정한 과제) 두 단계 보고서와 같게 과목 교과서 줄 하나를 둔다.
  const closing = verified || [String(input.subject || '').trim(), '교과서 관련 단원'].filter(Boolean).join(' ');
  if (oneShot.length && !oneShot.some((section) => REFERENCE_TITLE.test(String(section?.title || '')))) oneShot.push({ title: '참고 자료', body: closing });
  return { parsed: { ...parsed, sections: oneShot }, extra: { removedFeelingSentences: removedPraise, ...(used ? { inspiration: inspirationOf(used) } : {}) } };
}
