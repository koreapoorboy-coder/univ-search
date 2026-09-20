import { ingredientSchema, inspirationCitations, inspirationOf, usedIngredients } from './ingredients_v1.mjs';
import { normalizeSourceCards, referencesBody } from './references_v1.mjs';
import { CALCULATION_SCHEMA, calculationPromptLines, tidyCalculatedNumbers, verifyCalculations } from './calc_check_v1.mjs';
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
  // 「우리 반 30명에게 물어 인원수를 적는다」도 설문이다 — 루프 8(공통수학2 집합): '설문'이라는 말이 없어
  // 문헌 탐구로 잡혀 자료 5개를 읽으라는 설계서가 나왔다. 사람에게 묻는 말이 있으면 설문으로 본다.
  if (/(명|학생|친구|학급|반원|가족)에게/.test(text) && /물어|물었|물어보|여쭈|응답|답하게|답을 ?받|조사한다|조사하여/.test(text)) return COLLECTION.SURVEY;
  if (/손을 ?들게|거수|투표하게 ?하여/.test(text)) return COLLECTION.SURVEY;
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
      // 학생이 쓴 글자 그대로(「36.0」). 표의 측정값 칸은 이것을 보여 준다 — 숫자로 바꾸면 36이 된다.
      typed: (Array.isArray(row?.values) ? row.values : []).slice(0, MAX_TRIALS)
        .filter((value) => Number.isFinite(toNumber(value))).map((value) => String(value).trim().replace(/,/g, '')),
      note: clip(row?.note, 300),
    }))
    .filter((row) => row.label);
  return {
    // 설계서 때 「도달 시각 초」로 저장된 이름도 최종 보고서에서 한 번 더 손본다(표 머리글이 「… 초 (초)」가 됐다).
    measurementName: dropUnitFromName(clip(src.measurementName, 40), clip(src.unit, 20)),
    unit: clip(src.unit, 20),
    scaleGuide: clip(src.scaleGuide, 200),
    conditions,
    references: (Array.isArray(src.references) ? src.references : []).slice(0, 3)
      .map((one) => ({ label: clip(one?.label, 40), unit: clip(one?.unit, 20), value: clip(one?.value, 20).replace(/,/g, '') }))
      .filter((one) => one.label && Number.isFinite(toNumber(one.value))),
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
    typed: Array.isArray(row.typed) && row.typed.length === row.values.length ? row.typed : [],
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
  // 집단이 둘 이상이면(「우리 지역 · 2014년」「비교 지역 · 2014년」) 집단마다 자기 첫 조건을 기준으로도 잰다. 운영 테스트 29:
  // 모든 조건을 「우리 지역 2014년」 하나와만 견줘, 비교 지역의 증가폭을 자기 2014년 기준으로 볼 수 없었다.
  const groupOf = (label) => {
    const text = String(label || '');
    if (text.includes('·')) return text.split(/\s*·\s*/)[0];
    return text.replace(/\s*\S*\d\S*\s*$/, '').trim();
  };
  const groups = new Map();
  rows.forEach((row) => { const key = groupOf(row.label); if (key) groups.set(key, [...(groups.get(key) || []), row]); });
  if (groups.size >= 2 && [...groups.values()].some((list) => list.length >= 2)) {
    for (const list of groups.values()) {
      const first = list[0].mean;
      list.forEach((row) => {
        row.group = groupOf(row.label);
        row.diff_from_group_first = round(row.mean - first);
        row.percent_from_group_first = first ? round(((row.mean - first) / Math.abs(first)) * 100, 1) : null;
      });
    }
  }
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
    frequency: frequencySummary(data, rows),
  };
}

// 도수분포표(계급별 인원수)면 집단마다 계급값으로 평균·표준편차를 **코드가** 구한다. 운영 테스트 28: AI에게 맡기자 평균을
// 211÷32=6.59 대신 6.49로, 표준편차 자리에 분산(0.74)을 적었다 — 검산이 떨어뜨려 보고서에 숫자가 하나도 남지 않았다.
// 계급은 조건 이름의 마지막 토막에 있는 「5~6시간」 같은 닫힌 구간이고, 그 앞 토막(「스마트폰 0~3시간」)이 집단이다.
// 계급 이름은 「6~8시간」처럼 물결표로도, 「4시간 이상 6시간 미만」처럼 말로도 적힌다. 루프 7(확률과 통계):
// 첫 계급만 말로 적혀 있어 도수분포표로 못 알아봤고, 그래서 평균·표준편차를 엔진이 구해 주지 못했다
// (과제가 구하라던 표준편차가 보고서에서 통째로 빠졌다).
const RANGE_MARK = /(\d+(?:\.\d+)?)\s*[~∼\-–]\s*(\d+(?:\.\d+)?)/;
const RANGE_WORDS = /(\d+(?:\.\d+)?)\s*[가-힣]*\s*이상\s*(?:~|부터)?\s*(\d+(?:\.\d+)?)\s*[가-힣]*\s*(?:미만|이하|까지)/;
const matchRange = (text) => String(text).match(RANGE_WORDS) || String(text).match(RANGE_MARK);
export function frequencySummary(data, rows) {
  const counts = /명|도수|응답|인원|개수|건/.test(`${data.unit || ''} ${data.measurementName || ''}`);
  if (!counts || !rows.length || rows.some((row) => row.values.length !== 1)) return [];
  const groups = new Map();
  for (const row of rows) {
    const pieces = String(row.label).split(/\s*·\s*/);
    const match = matchRange(pieces[pieces.length - 1]);
    if (!match) return [];
    const key = pieces.slice(0, -1).join(' · ');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ mid: (Number(match[1]) + Number(match[2])) / 2, count: row.values[0] });
  }
  const out = [];
  for (const [group, classes] of groups) {
    const n = classes.reduce((sum, one) => sum + one.count, 0);
    if (classes.length < 2 || n <= 0) continue;
    const mean = classes.reduce((sum, one) => sum + one.mid * one.count, 0) / n;
    const variance = classes.reduce((sum, one) => sum + (one.mid - mean) ** 2 * one.count, 0) / n;
    out.push({ group: group || '전체', n, mean: round(mean), variance: round(variance), sd: round(Math.sqrt(variance)) });
  }
  return out;
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

// 그래프 가로축에 같은 말을 되풀이하지 않는다. 운영 테스트 32: 조건이 「우리 지역 · 2000년」…「우리 지역 · 2023년」으로
// 집단이 하나뿐이라 x축 이름이 「우리 지역2000년」처럼 여섯 번 같은 말을 달았다. 모든 조건이 함께 가진 앞부분은
// 떼고 그림 제목에 한 번만 남긴다(표는 조건 이름을 그대로 둔다 — 표는 자료 원본이다).
export function trimSharedPrefix(labels) {
  const parts = labels.map((label) => String(label).split(/\s*·\s*/));
  if (parts.length < 2 || parts.some((part) => part.length < 2)) return { labels, shared: '' };
  const shared = [];
  for (let index = 0; index < parts[0].length - 1; index += 1) {
    if (!parts.every((part) => part[index] === parts[0][index])) break;
    shared.push(parts[0][index]);
  }
  if (!shared.length) return { labels, shared: '' };
  return { labels: parts.map((part) => part.slice(shared.length).join(' · ')), shared: shared.join(' · ') };
}

// The model picks kind, metric, order and wording; every number comes from computeStats.
// 학생이 적은 자릿수대로(6.0 → "6.0"). 값이 없으면 빈칸.
// 칸마다 학생이 쓴 글자를 그대로 쓴다 — 가장 긴 자릿수로 맞추면 0.05가 있는 표에서 36.0이 「36.00」이 됐다.
function asTyped(value, decimals, typed) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof typed === 'string' && /^-?\d+\.\d+$/.test(typed)) return typed;
  if (typeof typed === 'string' && /^-?\d+$/.test(typed)) return value;
  return decimals > 0 && Number.isFinite(value) ? value.toFixed(decimals) : value;
}
// 평균·흔들림은 그 줄에서 학생이 쓴 가장 긴 자릿수로 맞춘다(36.0·35.8·36.2의 평균은 「36.0」).
function rowDecimals(row) {
  return Math.max(0, ...(row.typed || []).map((one) => (String(one).split('.')[1] || '').length));
}
function asRowNumber(value, row) {
  const places = Math.min(rowDecimals(row), 2);
  return places > 0 && Number.isFinite(value) && Math.round(value * 10 ** places) / 10 ** places === value ? value.toFixed(places) : value;
}

const CONTROL_ROW = /대조|블랭크|공시험|끓여|끓인|변성|효소 ?없음|무처리|증류수만/;
const CALCULATED_WORDS =/²|\^2|제곱|기울기|회귀|추정한|계산한|계산해|중력가속도|g ?=|T ?²/;
// 잰 값의 이름 가운데 한 낱말이라도 들어 있고, 계산값을 가리키는 말이 없으면 그려진 것을 말하는 글이다.
export function describesPlotted(text, measurementName) {
  const value = String(text || '');
  if (CALCULATED_WORDS.test(value)) return false;
  const words = String(measurementName || '').split(/[^가-힣A-Za-z0-9]+/).filter((word) => word.length >= 2);
  return !words.length || words.some((word) => value.includes(word)) || /평균|측정값|잰 값|조건별/.test(value);
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
    // 그림 제목·설명은 **실제로 그려지는 값**(학생이 잰 값)을 말해야 한다. 운영 테스트 21: 10회 진동 시간 평균을 그린
    // 그래프에 「T²와 실 길이의 관계」라는 제목과 「주기 제곱 T²를 계산해 …」라는 설명이 붙었다. 잰 값의 이름이 없거나
    // 계산값(제곱·기울기)을 말하면 코드가 제목을 바꾸고 설명은 뺀다.
    const plotted = (text) => describesPlotted(text, name);
    const rawTitle = clip(scrubInternalNames(spec.title), 60);
    const rawCaption = clip(cleanCaption(spec.caption), 160);
    const figure = { label, kind: spec.kind, metric, metricLabel: METRIC_LABEL[metric],
      title: rawTitle && plotted(rawTitle) ? rawTitle : `조건별 ${name}${metric === 'raw' || metric === 'mean' ? (spec.kind === 'table' ? ' 결과' : ' 평균') : ''}`,
      caption: rawCaption && plotted(rawCaption) ? rawCaption : '', unit };
    if (spec.kind === 'table') {
      if (metric === 'raw') {
        // One value per cell: the repeat columns, the mean of a single number and its wobble would all say the same thing.
        if (stats.trials <= 1) {
          return { ...figure, columns: ['조건', `${name}${stats.unit ? ` (${stats.unit})` : ''}`], rows: rows.map((row) => [row.label, asTyped(row.values[0], stats.decimals, row.typed?.[0])]) };
        }
        const trials = Array.from({ length: stats.trials }, (_, index) => `${index + 1}회`);
        return { ...figure, columns: ['조건', ...trials, '평균', '흔들림'], rows: rows.map((row) => [row.label, ...trials.map((_, index) => asTyped(row.values[index], stats.decimals, row.typed?.[index])), asRowNumber(row.mean, row), asRowNumber(row.spread, row)]) };
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
        series: grid.firsts.map((first) => ({ name: first, values: grid.seconds.map((second) => grid.find(first, second)[chartMetric]),
          ...(chartMetric === 'mean' ? { valueLabels: grid.seconds.map((second) => String(asRowNumber(grid.find(first, second).mean, grid.find(first, second)))) } : {}) })),
      };
    }
    // 꺾은선은 가로축이 순서 있는 값(온도·길이)이라 대조군·블랭크를 한 줄에 이으면 안 된다. 운영 테스트 24: 5~60 °C 다음에
    // 「끓여 식힌 감자즙」이 이어져 60 °C 뒤에 더 떨어지는 것처럼 보였다. 대조군은 표에만 남긴다.
    const lineRows = kind === 'line' ? rows.filter((row) => !CONTROL_ROW.test(row.label)) : rows;
    const plottedRows = lineRows.length >= 2 ? lineRows : rows;
    // 막대 위 숫자도 표와 같은 자릿수로(36.0이 그래프에서 「36」으로 보였다 — 운영 테스트 2026-09-19).
    const trimmed = trimSharedPrefix(plottedRows.map((row) => row.label));
    return { ...base, kind, labels: trimmed.labels, values: plottedRows.map((row) => row[chartMetric]),
      ...(trimmed.shared && !base.title.includes(trimmed.shared) ? { title: `${trimmed.shared} ${base.title}` } : {}),
      ...(chartMetric === 'mean' ? { valueLabels: plottedRows.map((row) => String(asRowNumber(row.mean, row))) } : {}) };
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
    조건별결과: stats.rows.map((row) => ({ ...(single
      ? { 조건: row.label, 값: row.mean, 첫조건과의차이: row.diff_from_first, 첫조건대비변화율: row.percent_from_first, 관찰메모: row.note }
      : { 조건: row.label, 측정값: row.values, 평균: row.mean, 흔들림: row.spread, 첫조건과의차이: row.diff_from_first, 첫조건대비변화율: row.percent_from_first, 관찰메모: row.note }),
      ...(row.group !== undefined ? { 집단: row.group, 같은집단첫조건과의차이: row.diff_from_group_first, 같은집단첫조건대비변화율: row.percent_from_group_first } : {}) })),
    [single ? '값이높은순서' : '평균이높은순서']: stats.ranking.map((item) => `${item.label} (${item.mean})`),
    [single ? '값이같은조건' : '평균이같은조건']: stats.sameMean,
    수준별비교: (stats.comparisons || []).map((item) => ({ 기준: item.at, 가장높은쪽: item.higher, 두번째: item.runnerUp, 차이: item.gap, 흔들림보다큰차이인가: item.clearDifference === null ? '반복이 없어 알 수 없음' : (item.clearDifference ? '예' : '아니오') })),
    ...((stats.frequency || []).length
      ? { 도수분포요약: stats.frequency.map((one) => ({ 집단: one.group, 전체도수: one.n, '평균(계급값)': one.mean, '분산(계급값)': one.variance, '표준편차(계급값)': one.sd })) }
      : {}),
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
  // 우리가 AI에게 넘기는 자료 항목 이름은 한글이어도 본문에 나오면 안 된다. 운영 테스트 31(통합사회 고령화):
  // 「수준별 비교 지표로 본 같은 연도 격차는 …」 — 「수준별비교」는 우리가 넘긴 표의 항목 이름이다.
  [/수준별\s*비교(?:\s*(?:지표|항목|값|결과))?/g, '같은 기준끼리 견준 비교'],
  [/흔들림보다\s*큰\s*차이인가(?:는|은|가|이)?/g, '반복 측정의 흔들림보다 큰 차이인지는'],
  [/조건별결과/g, '조건별 결과'], [/결과정리/g, '결과 정리'], [/도수분포요약/g, '도수분포표 요약'],
  [/측정항목/g, '측정 항목'], [/점수기준/g, '점수 기준'], [/반복횟수/g, '반복 횟수'], [/관찰메모/g, '관찰 메모'],
  [/전체도수/g, '전체 도수'], [/가장높은쪽/g, '가장 높은 쪽'], [/두번째/g, '두 번째'],
  [/같은집단첫조건대비변화율/g, '같은 집단 첫 조건 대비 변화율'], [/같은집단첫조건과의차이/g, '같은 집단 첫 조건과의 차이'],
  [/첫조건대비변화율/g, '첫 조건 대비 변화율'], [/첫조건과의차이/g, '첫 조건과의 차이'],
  [/(값|평균)이높은순서/g, '$1이 높은 순서'], [/(값|평균)이같은조건/g, '$1이 같은 조건'],
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

const canonicalNumber = (text) => String(Number(String(text).replace(/,/g, '')));
// 글 속 숫자. 천 단위 쉼표(38,500)는 한 숫자다. 운영 테스트 29(통합사회 인구 통계): 「38,500명」을 38과 500으로 잘라 읽어
// 500을 모르는 숫자로 보고 탐구 결과 문장 8개를 지웠다.
export function numbersIn(text) {
  return (String(text || '').match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || []).map((number) => number.replace(/,/g, ''));
}

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
  (stats?.rows || []).forEach((row) => [...row.values, row.mean, row.min, row.max, row.spread, row.diff_from_first, row.percent_from_first, row.diff_from_group_first, row.percent_from_group_first].forEach(addValue));
  (stats?.comparisons || []).forEach((comparison) => addValue(comparison.gap));
  (stats?.frequency || []).forEach((one) => [one.n, one.mean, one.variance, one.sd].forEach(addValue));
  (data.references || []).forEach((one) => addValue(toNumber(one.value)));
  const texts = [data.measurementName, data.unit, data.scaleGuide, data.reason, data.observations, data.reflection, data.draftReport, ...data.sources, ...data.conditions.flatMap((row) => [row.label, row.note])];
  numbersIn(texts.join(' ')).forEach((number) => allowed.add(canonicalNumber(number)));
  // 도수분포표의 계급값(「수면 5~6시간」 → 5.5)도 쓸 수 있는 숫자다(운영 테스트 27: 평균·표준편차를 계급값으로 구한다).
  data.conditions.forEach((row) => {
    for (const match of String(row.label || '').matchAll(/(\d+(?:\.\d+)?)\s*[~∼\-–]\s*(\d+(?:\.\d+)?)/g)) {
      addValue((Number(match[1]) + Number(match[2])) / 2);
    }
  });
  return allowed;
}

// A decimal point is not a sentence end.
const SENTENCE = /(?:[^.?!\n]|(?<=\d)\.(?=\d))+[.?!]*\s*/g;

function filterSentences(body, keep) {
  let removed = 0;
  const dropped = [];
  const kept = String(body || '').split('\n').map((line) => (line.match(SENTENCE) || []).filter((sentence) => {
    const ok = keep(sentence);
    if (!ok) { removed += 1; dropped.push(sentence.trim()); }
    return ok;
  }).join('').trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { body: kept, removed, dropped };
}

// 단원 이름(「…」 단원)을 다른 과목에 붙인 문장은 지운다. 운영 테스트 24: 「고등학교 생명과학과 통합과학의 「물질대사와
// 에너지」 단원」 — 통합과학에는 그런 단원이 없다. 과목 이름 뒤에 과·와·의·가운뎃점이 붙은 경우만 본다(「화학 반응」은 건드리지 않는다).
const SCHOOL_SUBJECTS = ['통합과학', '통합사회', '과학탐구실험', '물리학', '물리', '화학', '생명과학', '지구과학', '공통수학', '대수', '미적분', '확률과 통계', '기하', '정보'];
export function removeCrossSubjectUnitClaims(body, subject) {
  const own = String(subject || '').replace(/\s+/g, '');
  return filterSentences(body, (sentence) => {
    if (!/「[^」]+」\s*단원/.test(sentence)) return true;
    return !SCHOOL_SUBJECTS.some((name) => !own.startsWith(name.replace(/\s+/g, '')) && !name.replace(/\s+/g, '').startsWith(own)
      && new RegExp(`${name}[ⅠⅡ12]?\\s*(과|와|의|·)`).test(sentence));
  });
}

// 고등학교에 없는 과목 이름을 지어낸 문장은 지운다. 운영 테스트 31(통합사회 고령화): 결론 마지막에
// 「나아가 복지정책 과목에서 실제 서비스 입지의 …」 — 「복지정책」이라는 고등학교 과목은 없다.
// 교과군 이름(사회 교과)과 「이 과목·다른 과목」처럼 이름이 없는 말은 그대로 둔다.
const REAL_SUBJECTS = [
  '공통국어', '화법과 언어', '독서와 작문', '문학', '주제 탐구 독서', '문학과 영상', '매체 의사소통', '독서 토론과 글쓰기', '언어생활 탐구', '직무 의사소통',
  '공통수학', '기본수학', '대수', '미적분', '확률과 통계', '기하', '경제 수학', '인공지능 수학', '직무 수학', '수학과 문화', '실용 통계', '수학과제 탐구',
  '공통영어', '영어', '기본영어', '영어 독해와 작문', '영미 문학 읽기', '영어 발표와 토론', '심화 영어', '실생활 영어 회화', '직무 영어',
  '한국사', '통합사회', '세계시민과 지리', '세계사', '사회와 문화', '사회·문화', '현대사회와 윤리', '한국지리 탐구', '한국지리', '세계지리', '도시의 미래 탐구',
  '동아시아 역사 기행', '동아시아사', '정치', '정치와 법', '법과 사회', '경제', '윤리와 사상', '생활과 윤리', '인문학과 윤리', '국제 관계의 이해', '여행지리',
  '역사로 탐구하는 현대 세계', '사회문제 탐구', '금융과 경제생활', '윤리문제 탐구', '기후변화와 지속가능한 세계',
  '통합과학', '과학탐구실험', '물리학', '물리', '화학', '생명과학', '지구과학', '역학과 에너지', '전자기와 양자', '물질과 에너지', '화학 반응의 세계',
  '세포와 물질대사', '생물의 유전', '지구시스템과학', '행성우주과학', '과학의 역사와 문화', '기후변화와 환경생태', '융합과학 탐구', '물리학 실험', '과학과제 연구',
  '기술·가정', '정보', '데이터 과학', '인공지능 기초', '로봇과 공학세계', '소프트웨어와 생활', '생활과학 탐구', '창의 공학 설계', '지식 재산 일반',
  '체육', '운동과 건강', '스포츠 생활', '음악', '미술', '연극', '음악 연주와 창작', '미술 창작', '미술 감상과 비평',
  '진로와 직업', '생태와 환경', '인간과 철학', '논리와 사고', '인간과 심리', '교육의 이해', '삶과 종교', '보건', '논술', '심리학', '환경', '철학', '한문', '제2외국어',
];
// 교과군·묶음 이름과 이름을 대신하는 말 — 이 말 앞에 붙은 「과목」은 지어낸 이름이 아니다.
const SUBJECT_GROUPS = ['국어', '수학', '영어', '사회', '과학', '역사', '지리', '윤리', '도덕', '예술', '체육', '기술', '가정', '한문', '교양', '실기', '탐구'];
const SUBJECT_STAND_INS = ['이', '그', '저', '요', '이번', '해당', '같은', '다른 ', '다른', '여러', '각', '각각의', '모든', '위', '앞', '뒤', '타', '관련', '연계', '선택', '일반', '진로', '융합', '공통', '전공', '주요', '기타', '개별', '두', '세', '네', '몇'];
export function removeUnknownSubjectNames(body) {
  const plain = (name) => String(name).replace(/[\s·,]/g, '').replace(/[ⅠⅡⅢ0-9]+$/, '');
  const known = [...REAL_SUBJECTS, ...SUBJECT_GROUPS, ...SUBJECT_STAND_INS].map(plain).filter((name) => name);
  return filterSentences(body, (sentence) => {
    const words = /([가-힣A-Za-zⅠⅡⅢ0-9·]+)(?:\s+([가-힣A-Za-zⅠⅡⅢ0-9·]+))?(?:\s+([가-힣A-Za-zⅠⅡⅢ0-9·]+))?\s*(?:과목|교과)(?![서군])/g;
    let hit = words.exec(sentence);
    while (hit) {
      const parts = [hit[1], hit[2], hit[3]].filter(Boolean);
      // 「확률과 통계 과목」은 앞 두 낱말을 합쳐야 이름이 된다 — 바로 앞 한 낱말부터 세 낱말까지 모두 견준다.
      const tries = parts.map((word, index) => plain(parts.slice(index).join('')));
      const real = tries.some((candidate) => candidate && known.some((name) => candidate === name || candidate.endsWith(name) || name.startsWith(candidate)));
      if (!real) return false;
      hit = words.exec(sentence);
    }
    return true;
  });
}

// 학생이 말한 적 없는 기구·절차를 했다고 단정한 문장은 지운다. 운영 테스트 38(물리 빗면): 학생은 시간만 적었는데
// 「스마트폰 카메라를 고정해 프레임률을 고정했다」, 「영상 재생의 프레임 단위로 판정했다」가 방법 절에 들어갔다.
// 안내문이나 학생 메모에 그 말이 있으면 그대로 둔다(선생님이 영상으로 재라고 한 과제도 있다).
const UNNAMED_TOOLS = /스마트폰|휴대폰|핸드폰|카메라|촬영|동영상|영상|프레임률|프레임 단위|프레임으로|마스킹테이프|삼각대|광센서|포토게이트|모션 센서|어플|앱으로|전용 프로그램|엑셀로|초고속/;
export function removeUnnamedTools(body, studentText) {
  const text = String(studentText || '');
  return filterSentences(body, (sentence) => {
    const found = String(sentence).match(new RegExp(UNNAMED_TOOLS, 'g')) || [];
    return !found.length || found.every((word) => text.includes(word));
  });
}

// 앞으로 할 일을 말하는 문장(「35~45 °C를 2~3 °C 간격으로 재겠다」)의 숫자는 결과를 지어낸 것이 아니라 다음 실험의 조건이다.
// 운영 테스트 25: 이런 문장 4개가 지워져 결론의 후속 탐구가 한 문장만 남고 느낀 점의 「다음에는 ~」가 빠졌다.
// 결과를 말하는 말(였다·나왔다·측정되었다·확인했다…)이 섞인 문장은 계획으로 보지 않는다.
const PLAN_SENTENCE = /(겠다|겠습니다|하고 싶다|보고 싶다|싶다\.?$|제안한다|제안하고자|제안할 수 있다|계획이다|계획한다|예정이다|할 것이다|해 볼 것이다|필요가 있다|필요하다)\s*[.!]?\s*$/;
const RESULT_WORDS = /(였다|였으|이었|나왔|나타났|측정되었|관찰되었|확인했|확인되었|기록되었|보였|얻었|컸다|컸으|작았|높았|낮았)/;
export function isPlanSentence(sentence) {
  const text = String(sentence || '').trim();
  return PLAN_SENTENCE.test(text) && !RESULT_WORDS.test(text);
}

export function removeUnsupportedNumbers(body, allowed, { allowPlans = false } = {}) {
  return filterSentences(body, (sentence) => (allowPlans && isPlanSentence(sentence))
    || numbersIn(sentence).every((number) => allowed.has(canonicalNumber(number))));
}

export function removeInventedFeelings(body, studentText) {
  const invented = FEELING_WORDS.filter((word) => !String(studentText || '').includes(word));
  return filterSentences(body, (sentence) => !invented.some((word) => sentence.includes(word)));
}

// 학생이 입력하지 않은 **행동**도 지어낸 것이다 — 운영 테스트(2026-09-19)에서 느낀 점에 「교과서 단원을 다시 읽으며
// 보완했다」가 나왔다. 학생은 그런 말을 쓴 적이 없다. 읽기·찾기·여쭙기 같은 행동은 학생이 쓴 글에 있을 때만 남긴다.
// 운영 테스트 21: 「관련 연구 자료를 찾아보며 …」 — 찾아보며·찾아봄·연구 자료를 찾 도 같은 것이다.
const INVENTED_ACTION = /다시 ?읽|찾아 ?읽|읽으며 ?보완|복습하며|여쭈|여쭤|물어보|검색해 ?보|찾아 ?보았|찾아 ?봤|찾아 ?보며|찾아 ?봄|연구 ?자료를 ?찾|조사해 ?보았|도움을 받/;
export function removeInventedActions(body, studentText) {
  const text = String(studentText || '');
  return filterSentences(body, (sentence) => !INVENTED_ACTION.test(sentence) || INVENTED_ACTION.test(text));
}

// 느낀 점 is what the teacher reads when they write 세특, so a sentence that praises the student — 성실하게
// 참여했다, 적극적으로 협동하였다 — is the one thing that must not be in it: the judgement is the teacher's to
// make. The prompt forbids it and the 생기부 draft strips it, but the section itself never did.
// 학생이 참고 자료를 적었는데 「참고 자료는 별도로 인용하지 않았다」고 쓴 문장은 지운다. 운영 테스트 34:
// 학생이 적은 자료 두 개가 참고 자료에서 빠지자 느낀 점에 이 문장이 들어갔다(자료는 그대로 있었다).
const NO_SOURCE_CLAIM = /(참고\s*자료|참고\s*문헌|자료를|문헌을|인용)[^.]*(인용하지|적지|쓰지|밝히지|사용하지|참고하지)\s*(않았|못했|않고|않은)/;
export function removeNoSourceClaim(body, hasSources) {
  if (!hasSources) return { body: String(body || ''), removed: 0, dropped: [] };
  return filterSentences(body, (sentence) => !NO_SOURCE_CLAIM.test(sentence));
}

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

// 값 이름 뒤에 단위를 또 붙이면 표 머리글이 「도달 시각 초 (초)」가 된다(운영 테스트 36). 이름 끝에 붙은
// 단위는 뗀다 — 단위는 머리글의 괄호 자리가 따로 있다. 이름이 단위 하나뿐이면(「초」, 단위 「초」) 그대로 둔다.
export function dropUnitFromName(name, unit) {
  const text = String(name || '').trim();
  const mark = String(unit || '').trim();
  if (!text || !mark) return text;
  const quoted = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cut = text.replace(new RegExp(`[\\s(（\\[【]*${quoted}[)）\\]】]*$`), '').replace(/[\s(（[【]+$/, '').trim();
  return cut.length >= 2 ? cut : text;
}

function sanitizeDataTemplate(raw, kind) {
  // 답 형식 조각이 조건 이름에 새어 든 것은 버린다. 운영 테스트(2026-09-19): 조건을 하나밖에 못 찾은 AI가 두 번째 칸을
  // 「referenceInputs':[{」「label'」 같은 조각으로 채웠다.
  // 조각 앞의 진짜 이름(「식초 시료 1:10 희석'],…」 → 「식초 시료 1:10 희석」)은 살린다.
  // 운영 테스트 30: 조건을 8개보다 많이 만들고 싶던 AI가 한 칸에 「인접 지역 · 2022년」「광역 중심지 · 2013년」…을 뭉쳐 넣었다.
  // 낫표·겹낫표도 경계로 보고 첫 조건만 남긴다.
  const conditions = [...new Set((Array.isArray(raw?.conditions) ? raw.conditions : []).map((label) => clip(String(label ?? '').split(/['"[\]{}「」『』]/).map((piece) => piece.trim()).find(Boolean) || '', 60))
    .filter((label) => label && !/:\s*$|^(label|unit|trials|referenceInputs|conditions|measurementName)$/i.test(label)))].slice(0, MAX_CONDITIONS);
  // Repeating makes sense only for a measurement: a student cannot ask the same class the same question three
  // times, and a published figure for one year has one value.
  const trials = kind === COLLECTION.MEASUREMENT ? Math.min(MAX_TRIALS, Math.max(3, Math.round(Number(raw?.trials) || 3))) : 1;
  return {
    // 한 칸에는 값 하나 — 「종별 개체 수와 피복 점수」처럼 두 값을 한 칸에 담은 이름은 앞의 값만 남긴다(운영 테스트 2026-09-18:
    // 학생은 종수를 적었는데 표 제목이 「개체 수와 피복 점수 결과」로 나왔다).
    measurementName: dropUnitFromName(singleMeasure(clip(raw?.measurementName, 40)), clip(raw?.unit, 20)) || '측정값',
    unit: clip(raw?.unit, 20),
    scaleGuide: clip(raw?.scaleGuide, 200),
    // 하나만 남으면 그 조건은 살리고 대조 칸을 붙인다(예전에는 「조건 1·조건 2」로 바꿔 진짜 조건까지 잃었다).
    conditions: conditions.length >= 2 ? conditions : conditions.length === 1 ? [conditions[0], '대조(비교용)'] : ['조건 1', '조건 2'],
    trials,
    // 결과와 견줄 기준값(표시 산도·이론값) 칸. 학생이 실험 밖에서 옮겨 적는다(calc_check_v1).
    referenceInputs: (Array.isArray(raw?.referenceInputs) ? raw.referenceInputs : [])
      .map((one) => ({ label: clip(one?.label, 40), unit: clip(one?.unit, 20) })).filter((one) => one.label).slice(0, 3),
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

// 제목은 **주제가 드러나는 보고서 제목**이다(실제 탐구 보고서·소논문 제목처럼). 두 번 바꿨다(사용자 지적 2026-09-19):
//   ① 45~90자 명사구 한 줄 — 「양조식초 두 가지 희석을 … 3회 적정해 … 확인한 비교 분석」: 내용을 뽑아 넣은 요약 같다.
//   ② 「주제목 — 부제」 — 「진자는 길이에 얼마나 민감할까 — 실 길이 네 조건의 열 회 시간을 세 번씩 재어 …」: 부제에 횟수·
//      길이가 나열돼 여전히 풀어 쓴 느낌, 주제 느낌이 안 난다.
// 그래서 규모·조건값·결과 숫자는 제목에서 뺀다. 그것은 본문과 세특 초안(recordDraft)이 맡는다.
const TITLE_EXAMPLES = {
  [COLLECTION.MEASUREMENT]: [
    '  나쁨: "효소의 작용에 대한 탐구" — 빈말이다. 무엇을 어떻게 탐구했는지 없다.',
    '  나쁨: "진자는 길이에 얼마나 민감할까 — 실 길이 네 조건의 열 회 시간을 세 번씩 재어 g를 구해 9.8과 비교 측정" — 물음과 부제, 횟수·조건 나열. 주제가 아니라 절차를 풀어 쓴 요약이다.',
    '  나쁨: "물 온도와 세제 종류를 네 조건으로 나누어 얼룩이 지워진 정도를 3회씩 반복해 잰 비교 측정" — 절차 요약이다.',
    // 사용자 지적(2026-09-19): 「실 길이에 따른 단진자 주기와 가속도 측정」은 좋지만 조금 더 구체적이면 좋겠다 —
    // "이 보고서는 어떤 보고서다"가 딱 보이게. 무엇을 위해 쟀는지(중력가속도 추정)가 흐릿했다.
    '  나쁨: "실 길이에 따른 단진자 주기와 가속도 측정" — 주제 느낌은 있지만 흐릿하다. 어떤 가속도를 왜 쟀는지 안 보인다.',
    '  좋음: "실 길이에 따른 단진자 주기 측정과 이를 이용한 중력가속도 추정"',
    '  좋음: "물 온도에 따른 효소 세제의 달걀 얼룩 제거 효과 비교"',
    '  좋음: "빗면 기울기에 따른 수레의 가속도 측정과 역학적 에너지 보존 확인"',
  ],
  [COLLECTION.SURVEY]: [
    '  나쁨: "청소년 수면에 관한 연구" — 무엇을 어떻게 보았는지 없다.',
    '  좋음: "고등학생의 수면 시간과 1교시 수업 집중도의 관계 분석"',
  ],
  [COLLECTION.DATASET]: [
    '  나쁨: "고령화 문제 탐구" — 어떤 자료로 무엇을 견주었는지 없다.',
    '  좋음: "시·군별 인구 통계로 본 고령화 속도의 지역 차이 분석"',
  ],
  [COLLECTION.READING]: [
    '  나쁨: "원자력 발전에 대한 고찰" — 무엇을 읽고 무엇을 따졌는지 없다.',
    '  좋음: "원자력 발전 찬반 기사의 근거 제시 방식 비교"',
  ],
  [COLLECTION.NONE]: [
    '  나쁨: "매체 언어의 이해" — 한 일이 없다.',
    '  좋음: "손 소독 의무화 찬반 칼럼의 논증 타당성 평가"',
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
    '[reportTitle — 주제가 드러나는 보고서 제목]',
    '- 실제 탐구 보고서나 소논문의 제목처럼 쓴다. 제목은 보고서의 주제다. 본문을 요약하거나 절차를 풀어 쓴 문장이 아니다.',
    '- 제목만 읽고 "이 보고서는 ~을 ~에 따라 ~해서 ~을 알아본 보고서다"라고 한 문장으로 말할 수 있어야 한다. 한 구절 안에 세 가지가 보여야 한다:',
    '  ① 무엇을 — 구체적인 대상과 교과 개념(예: 효소 세제의 달걀 얼룩 제거, 수레의 가속도, 시·군의 고령화 속도). "효소", "가속도"처럼 뭉뚱그린 말만 두지 않는다.',
    '  ② 무엇에 따라 — 바꾼 조건이나 견준 관점(예: 물 온도에 따른, 빗면 기울기에 따른, 지역별).',
    '  ③ 무엇을 알아냈나(목적) — 측정한 것과 그것으로 구하거나 확인하려 한 것(예: ~ 측정과 이를 이용한 ~ 추정, ~ 효과 비교, ~ 보존 확인).',
    '- 교과 개념어를 하나 이상 넣는다. 그래야 주제로 읽힌다.',
    '- 길이는 공백 포함 20~45자, 하나의 명사구다. 끝을 ~측정, ~분석, ~비교, ~탐구, ~평가, ~설계, ~추정, ~확인으로 맺는다.',
    '- 넣지 않는다: 조건 수·반복 횟수·인원·편수 같은 규모 숫자, 실험 조건 값(0.40 m, 10배 희석, 30 °C), 결과 숫자, 물음표, 줄표(—)나 콜론(:)으로 붙인 부제, 과목 이름, 학교 이름과 학년(예: ○○고2), 수행평가 안내문 문장, "~에 대한 고찰", "~의 이해", "~ 연구" 같은 빈말. 규모와 결과는 본문과 세특 초안이 따로 맡는다.',
    '- "~을 3회씩 재어 ~해 ~한 비교"처럼 한 일을 차례로 늘어놓지 않는다. 그것은 제목이 아니라 요약이다.',
    '- 조사를 넣어 자연스러운 우리말로 쓴다. 가운뎃점(·)은 한 번까지만 쓴다.',
    '- 약어와 원소 기호는 우리말로 푼다(BOD → 생물학적 산소 요구량, NaCl → 염화나트륨). 위첨자·아래첨자가 필요한 화학식은 일반 이름으로 쓴다(아세트산). 물·이산화탄소처럼 익숙한 이름은 그대로 둔다.',
    '- 다 쓴 뒤 소리 내어 읽어 본다. 학술지 목차나 과학 대회 보고서 제목으로 있을 법하게 들려야 한다.',
    ...(second
      ? ['- 결과는 제목에 넣지 않는다. 1차 설계서의 제목이 위 규칙에 맞고 실제로 한 탐구와 같으면 그대로 써도 된다. 실제로 한 탐구와 달라졌거나 규칙에 어긋날 때만 고친다.',
        // 운영 테스트 23: 설계서 「반응 온도에 따른 … 산소 발생량 측정과 최적 온도 추정」이 최종에서 「… 산소 발생량 분석」으로 흐려졌다.
        '- 고치더라도 설계서 제목보다 덜 구체적으로 만들지 않는다. 설계서 제목의 목적 부분(예: ~을 이용한 ~ 추정, 최적 온도 추정)을 빼지 않는다.']
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
  if (stage === STAGE.FINAL && /탐구 방법/.test(text)) return '1차 설계서의 준비물, 변인, 절차, 안전을 실제로 한 과정으로 과거형으로 쓴다. 학생 관찰 메모에 설계와 다르게 한 점이 있으면 반영한다. **학생이 적지 않은 도구나 절차를 했다고 단정하지 않는다** — 「스마트폰으로 촬영해 프레임으로 판정했다」처럼 쓰지 말고, 「시간을 재는 도구를 정해 시작과 끝 기준을 같게 해 쟀다」처럼 무엇을 같은 기준으로 했는지만 쓴다. 500~800자';
  if (stage === STAGE.DRAFT && /탐구 방법/.test(text)) return '학생이 직접 하는 실험으로 설계한다. 준비물, 조작·통제·종속 변인, 대조군, 번호를 붙인 절차, 조건마다 3회 이상 측정해 어떻게 기록할지, 측정 오차를 줄이는 방법, 안전 주의. 문헌 조사로 대신하지 않는다. **학교나 집에 있는 것으로 할 수 있게 쓰고, 특정 기구·앱·소모품을 못 박지 않는다**(「스마트폰으로 촬영해 프레임으로 읽는다」·「마스킹테이프로 표시한다」처럼 쓰지 말고, 「시간을 재는 도구를 하나 정해 시작과 끝 기준을 같게 해 잰다」·「출발점과 도착점을 눈에 띄게 표시한다」처럼 학생이 고를 수 있게 쓴다). 700~1000자';
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
           '- 단, 수행평가 안내문이 정해 둔 대상·장소·재료·방법은 바꾸지 않는다. 겹침은 그 안의 세부 조건과 재는 방법으로 피한다.',
           // 운영 테스트 23: 설계서를 다시 만들자 안내문의 「거품의 높이」를 「물 치환으로 모은 산소 부피」로 바꿨다.
           '- 안내문이 재라고 정해 둔 값(예: 거품의 높이, 10회 진동 시간)이 있으면 measurementName은 반드시 그 값이다. 겹침을 피하려고 재는 값을 바꾸지 않는다 — 조건의 값·개수, 대조군, 기록 방식으로 다르게 한다.', '']
        : []),
      '- referenceInputs는 결과와 견줄 **기준값**을 학생이 적을 칸이다(식초 병에 표시된 산도, 이론값, 공식 기록값처럼 실험 밖에서 옮겨 적는 숫자). 안내문이 그런 값과 비교하라고 할 때만 label과 unit으로 1~3개 넣고, 아니면 빈 배열이다. 표의 조건으로 넣지 않는다. **탐구 방법이나 계산에 필요한 값(실온, 처음 값, 기준선, 표시값)은 반드시 여기에 칸을 만든다** — 표에도 없고 이 칸에도 없는 값은 학생이 적을 곳이 없어 그 계산과 문장이 통째로 사라진다.',
      '- measurementName은 학생이 **기구에서 직접 읽는 값**(부피·질량·시간·온도·길이·개수 등)이다. 농도·백분율·속력처럼 읽은 값으로 계산해서 얻는 값은 표에 적게 하지 않는다 — 최종 보고서가 학생이 읽은 값으로 계산하고 코드가 검산한다.',
      '- conditions는 서로 다른 조건 2개 이상이다. 시료가 하나뿐인 실험이면 시료의 양을 두 가지로 하거나 블랭크(대조)를 조건으로 넣는다. 조건 이름에는 따옴표·괄호 기호·콜론 같은 형식 기호를 쓰지 않는다. 조건은 모두 8개까지이고, 한 칸에는 조건 하나만 쓴다 — 더 많이 비교하고 싶으면 비교 대상이나 시점을 줄인다.',
      // 운영 테스트 23: 「차가운 상태」「따뜻한 상태」처럼 값 없는 조건 이름 — 보고서가 최적 온도를 숫자로 말하지 못했다.
      '- 조건 이름에는 실제 값을 넣는다(예: "물 온도 25 °C", "실 길이 0.40 m", "5배 희석"). "차가운 상태", "따뜻한 상태"처럼 값 없는 말만 쓰지 않는다.',
      // 운영 테스트 29(통합사회 인구 통계): 「우리 지역 2014년」처럼 써서 지역별로 나눠 견줄 수 없었고, 비율 과제인데 인구 수만 받았다.
      '- 안내문이 값을 적을 **시점**을 늘어놓았으면(0·2·4·6·8·10분마다, 해마다, 주마다) conditions는 바로 그 시점이다(「0분」「2분」…). 시점을 버리고 초기 조건(「초기 온도 80 °C」)을 조건으로 만들지 않는다 — 시간에 따른 변화를 보는 과제는 시점이 행이어야 그래프와 식이 나온다.',
      '- 조건이 두 가지 기준(예: 지역과 연도, 집단과 시기)으로 나뉘면 반드시 "우리 지역 · 2014년"처럼 앞 기준과 뒤 기준을 가운뎃점( · )으로 나눠 쓴다. 그래야 집단마다 따로 견줄 수 있다.',
      ...(/비율|비중|점유율|퍼센트/.test(String(input.taskDescription || '')) && kind !== COLLECTION.MEASUREMENT
        ? ['- 안내문이 비율·비중을 조사하라고 한다. measurementName은 그 **비율 자체**(예: "고령 인구 비율", 단위 %)로 한다. 통계 사이트에는 비율이 이미 있는 경우가 많으니 그 값을 옮겨 적게 하고, scaleGuide에 어느 표의 어느 항목인지 적는다. 인원수만 받으면 보고서가 비율을 말할 수 없다.']
        : []),
      // 운영 테스트 27(확률과 통계 설문): 「6시간 이상·미만」 교차표만 만들어 평균·표준편차를 구할 수 없었다.
      ...(/평균|표준편차|분산/.test(String(input.taskDescription || '')) && kind !== COLLECTION.MEASUREMENT
        ? ['- 안내문이 평균·표준편차·분산을 구하라고 한다. 표는 **도수분포표**로 만든다: conditions는 평균을 구할 값의 **닫힌 계급**(예: "수면 5~6시간", "수면 6~7시간")이고, 칸에는 그 계급의 인원수를 적는다. "6시간 이상", "6시간 미만"처럼 열린 계급은 쓰지 않는다 — 맨 끝 계급도 "8~9시간"처럼 닫는다. 계급 폭은 같게 한다. 두 변수의 관계도 보라는 과제면 다른 변수를 두 집단으로 나누어 계급 앞에 붙인다(예: "스마트폰 3시간 미만 · 수면 6~7시간"). 조건은 모두 8개 이하다.']
        : []),
      '- measurementName에는 단위를 넣지 않는다. 단위는 unit 칸에만 적는다 — 이름에 또 넣으면 표 머리글이 「도달 시각 초 (초)」가 된다.',
      '- measurementName은 한 칸에 적을 **값 하나**의 이름이다. 두 가지 값(예: 개체 수와 피복 점수)을 한 칸에 담지 않는다. 여러 값을 재야 하면 연구 질문에 가장 중심이 되는 하나를 표에 두고, 나머지는 관찰 메모에 적게 한다.',
      `- dataTemplate은 학생이 채울 결과 표다. conditions는 표의 행이 될 조건 이름 2~8개(두 변인을 함께 바꾸면 "효소 세제 · 미지근한 물"처럼 "앞 변인 · 뒤 변인" 순서로 모든 조합), ${kind === COLLECTION.MEASUREMENT ? 'trials는 조건마다 반복 횟수(3~5)' : 'trials는 반드시 1'}, measurementName과 unit은 ${kind === COLLECTION.MEASUREMENT ? '측정 항목과 단위(점수면 "점")' : '적을 값의 이름과 단위'}, scaleGuide는 ${kind === COLLECTION.MEASUREMENT ? '점수 기준이나 측정 방법' : '값을 어디서 어떻게 옮겨 적는지'} 한 문장이다.`,
    ];
  }
  if (stage === STAGE.FINAL) {
    const stats = computeStats(data);
    return [
      '[이번 단계: 2차 최종 보고서, 학생 실험 데이터 반영]',
      '- 학생이 1차 설계서대로 실험하고 결과를 입력했다. 아래 [학생 실험 데이터]의 학생입력과 결과정리가 학생의 실제 결과다.',
      '- 보고서의 모든 숫자는 학생입력, 기준값, 결과정리, 1차 설계서에 있는 숫자이거나 **calculations에서 검산을 통과한 계산 결과**여야 한다. 그 밖의 새 숫자, 다른 실험이나 문헌의 수치를 만들지 않는다. 이를 어긴 문장은 자동으로 삭제된다.',
      '- 결과정리의 평균, 첫조건과의차이, 첫조건대비변화율(%), 평균이높은순서, 평균이같은조건은 새로 계산하지 말고 그대로 쓴다. 이것들은 calculations에 다시 넣지 않는다.',
      ...calculationPromptLines(),
      ...calculationTaskLines(input, data),
      // 운영 테스트 29: 비교 지역을 「우리 지역 2014년」과만 견줬다.
      ...(computeStats(data).rows.some((row) => row.group !== undefined)
        ? ['- 결과정리의 조건별결과에 집단과 같은집단첫조건과의차이·같은집단첫조건대비변화율이 있다. 집단(예: 지역)마다 자기 첫 조건을 기준으로 얼마나 변했는지 견주고, 집단끼리의 비교는 이 변화량과 변화율로 한다. 서로 다른 집단의 값을 첫조건과의차이 하나로 섞어 말하지 않는다.']
        : []),
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
      `- 그래프에는 **학생이 잰 값(${data.measurementName || '측정값'})과 그 평균·차이만** 그려진다. 제곱·기울기·중력가속도·농도처럼 계산한 값의 그래프는 그릴 수 없다. 그러니 "T² 대 L 그래프를 그렸다"처럼 그리지 않은 그래프를 말하지 않는다. 그래프 제목과 설명도 잰 값의 이름으로 쓴다. 계산한 값은 본문과 calculations로 보여 준다.`,
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
      '- 본문과 그림 제목·설명에는 입력 자료의 항목 이름(결과정리, 수준별비교 같은 이름이나 영어 이름)을 그대로 쓰지 말고 "반복 측정값의 흔들림", "평균의 차이"처럼 자연스러운 말로 풀어 쓴다. 띄어쓰기만 바꿔 쓰는 것("수준별 비교 지표로 본")도 안 된다 — 같은 기준끼리 견준 차이라고 쓴다. 그림 설명에는 그림에 실제로 그려진 것만 쓴다(오차 막대는 그려지지 않는다).',
      '- 과목 이름은 실제 고등학교 과목 이름만 쓴다. 없는 과목 이름(예: 복지정책 과목, 도시계획 과목)을 만들어 쓰지 않는다. 학문 분야를 말하려면 "과목" 대신 "행정학 분야", "도시계획 분야"처럼 쓴다.',
      ...bookBlock(book),
      '',
      '[학생 실험 데이터]',
      JSON.stringify({ 학생입력: { measurementName: data.measurementName, unit: data.unit, scaleGuide: data.scaleGuide, conditions: data.conditions, ...studentVoice(data) },
        ...((data.references || []).length ? { 기준값: data.references.map((one) => ({ 이름: one.label, 값: one.value, 단위: one.unit })) } : {}),
        결과정리: summaryForPrompt(stats) }, null, 2),
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
      required: ['measurementName', 'unit', 'scaleGuide', 'conditions', 'trials', 'referenceInputs'],
      properties: {
        measurementName: STRING, unit: STRING, scaleGuide: STRING, conditions: { type: 'array', minItems: 2, maxItems: MAX_CONDITIONS, items: STRING }, trials: { type: 'integer', minimum: 3, maximum: MAX_TRIALS },
        referenceInputs: { type: 'array', minItems: 0, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['label', 'unit'], properties: { label: STRING, unit: STRING } } },
      },
    },
  },
  [STAGE.FINAL]: {
    calculations: CALCULATION_SCHEMA,
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

// 안내문이 값을 구하라고 하거나 학생이 기준값을 적었으면 계산이 하나는 있어야 한다. 운영 테스트 11(2026-09-19): 칸을 비워 두고
// 본문에 산도를 바로 적어, 그 문장 12개가 지어낸 숫자로 모두 지워졌다.
export function needsCalculation(input = {}) {
  return (input.studentData?.references || []).length > 0
    || /구하|구한다|계산|농도|산도|함량|속력|가속도|효율|오차율|밀도|비열|몰질량|분자량|수득률|백분율|표준편차|분산|평균을|비율|비중|증가율|변화율|퍼센트|점유율/.test(String(input.taskDescription || ''));
}

// 안내문이 구하라고 한 값을 **이름을 짚어** 알려 준다. 운영 테스트 13: 계산 칸을 채우라고만 했더니 평균·비율처럼 이미 있는
// 값만 넣고, 정작 안내문이 구하라고 한 산도는 끝내 계산하지 않았다.
export function calculationTaskLines(input = {}, data = {}) {
  if (!needsCalculation({ ...input, studentData: data })) return [];
  const asks = String(input.taskDescription || '').split(/(?<=[.!?다])\s+|\n/)
    .filter((sentence) => /구하|계산|비교|함량|농도|산도/.test(sentence)).map((sentence) => sentence.trim()).filter(Boolean).slice(0, 2);
  const refs = (data.references || []).map((one) => `${one.label} ${one.value}${one.unit}`);
  return [
    '[계산 과제]',
    ...(asks.length ? [`- 안내문이 구하라고 한 것: 「${asks.join(' ')}」`] : []),
    // 운영 테스트 21(단진자): 조건 넷마다 T → T² → g 세 칸씩 12칸을 다 써서, 정작 g의 평균과 9.8과의 오차율은 계산하지 못했다.
    '- calculations는 이 순서로 채운다: ① 구하라는 값의 대표값(조건이 여럿이면 조건별 값을 한 식씩 구한 뒤 그 평균) ② 기준값과의 차이와 오차율 ③ 그 밖의 계산. 조건별 값은 조건마다 **한 식**으로 구한다(예: g = 39.48 × 0.40 ÷ (1.269 × 1.269)). 주기·제곱처럼 중간값을 조건마다 따로 칸에 넣지 않는다.',
    '- calculations의 첫 항목은 바로 그 값(예: 농도·산도·함량)을 학생이 잰 평균으로 구하는 계산이다. 몰질량 같은 교과서 상수는 constants에 이름과 값을 적고 쓴다.',
    ...(refs.length ? [`- 학생이 적은 기준값: ${refs.join(', ')}. 이 값이 **결과와 견줄 값**(표시된 산도, 이론값, 공식 기록값)이면 구한 값과의 차이와 오차율(%)을 calculations로 계산해 결과 분석과 결론에 쓴다. 그러나 **계산에 쓰는 값**(눈높이, 실온, 처음 값, 지면 경사각처럼 식에 넣는 값)이면 차이와 오차율을 구하지 않는다 — 식에 그대로 넣어 쓴다. 뜻이 없는 비교(눈높이 대비 오차율 800%)는 쓰지 않는다.`] : []),
    '- 결과 분석에는 계산 과정과 답을 한 문단으로 보여 주고, 결론에는 구한 값과 (기준값이 있으면) 비교 결과를 숫자로 쓴다.',
    // 운영 테스트 27(확률과 통계 설문): 표가 구간별 인원수뿐이라 「원자료가 없어 평균·표준편차를 구할 수 없다」로 끝났다.
    ...(/평균|표준편차|분산/.test(String(input.taskDescription || '')) && /명|도수|응답/.test(`${data.unit || ''} ${data.measurementName || ''}`)
      ? [(computeStats(data).frequency || []).length
        // 운영 테스트 28: AI가 평균(6.59→6.49)과 표준편차(분산을 적음)를 틀려 검산에 모두 떨어졌다. 코드가 구한 값을 준다.
        ? '- 결과정리의 도수분포요약에 코드가 계급값(계급의 가운데 값)으로 구한 집단별 평균·분산·표준편차가 있다. 이 값을 그대로 쓰고 다시 계산하지 않는다. 결과 분석에는 구하는 방법(평균 = (계급값 × 도수)의 합 ÷ 전체 도수, 표준편차 = √분산)을 한 문장으로 밝히고, 집단끼리 평균과 표준편차를 견준다. calculations에는 집단 간 평균의 차이처럼 이 값을 이용한 비교만 넣는다.'
        : '- 표가 계급(구간)별 인원수인 도수분포표이면, 교과서의 도수분포표 방법으로 평균과 표준편차를 calculations로 구한다: 계급값 = 계급의 가운데 값, 평균 = (계급값 × 도수)의 합 ÷ 전체 도수, 표준편차 = √((계급값 − 평균)² × 도수의 합 ÷ 전체 도수). 두 변수의 관계를 보는 과제면 집단(예: 스마트폰 사용 구간)마다 따로 구해 견준다. 식에는 √(…)와 ^2를 쓸 수 있다. "원자료가 없어 구할 수 없다"로 끝내지 않는다.']
      : []),
  ];
}

export function stageSchemaProperties(stage, input = {}) {
  const base = stage === STAGE.FINAL && needsCalculation(input)
    ? { ...baseSchemaProperties(stage, input), calculations: { ...CALCULATION_SCHEMA, minItems: 1 } }
    : baseSchemaProperties(stage, input);
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
// 제목에서 학교 이름을 뺀다. 운영 테스트 27: 「테스트고2 스마트폰 사용별 수면 분포·표준편차 해석」 — 제목은 주제다.
// 「○○고등학교」「○○고」와 뒤에 붙은 학년 숫자(2, 2학년)까지 지우고, 앞뒤 빈칸과 가운뎃점을 정리한다.
export function stripSchoolName(title, schoolName) {
  const full = String(schoolName || '').trim();
  let out = String(title || '');
  if (full) {
    const short = full.replace(/등학교$/, '');
    for (const name of [full, short].filter((one) => one.length >= 2)) {
      out = out.split(name).map((piece, index) => (index === 0 ? piece : piece.replace(/^\s*(\d\s*학년|\d)?\s*(의|에서)?\s*/, ''))).join(' ');
    }
  }
  return out.replace(/\s{2,}/g, ' ').replace(/^[\s·,]+|[\s·,]+$/g, '').trim();
}

export function finalizeStageOutput(stage, rawParsed, input) {
  const parsed = rawParsed && typeof rawParsed === 'object' && rawParsed.reportTitle
    ? { ...rawParsed, reportTitle: stripSchoolName(rawParsed.reportTitle, input?.schoolName) || rawParsed.reportTitle }
    : rawParsed;
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
    numbersIn(input.taskDescription).forEach((number) => allowed.add(canonicalNumber(number)));
    // 교과 확장 재료의 서지 숫자(연도·권·호·쪽)는 지어낸 숫자가 아니다. 이것을 막았더니 「(이윤미 외, 2024)」가 든 문장이
    // 통째로 지워져 연구가 본문에서 사라졌다(비교 시험 2026-09-18).
    for (const one of [...(input.ingredients?.papers || []), ...(input.ingredients?.research || [])]) {
      [one.year, one.volume, one.issue, ...String(one.pages || '').split('-'), String(one.date || '').slice(0, 4)]
        .filter((value) => /^\d+$/.test(String(value || ''))).forEach((value) => allowed.add(canonicalNumber(value)));
    }
    // AI가 적은 계산을 코드가 다시 해 보고, 맞는 계산의 답만 본문에 쓸 수 있는 숫자로 더한다(calc_check_v1).
    const calculation = verifyCalculations(parsed?.calculations, allowed);
    calculation.allowed.forEach((number) => allowed.add(number));
    const studentText = [data.reason, data.observations, data.reflection].join(' ');
    let removed = 0;
    let removedFeelings = 0;
    const droppedSamples = [];
    const cleaned = sections.map((section) => {
      const title = String(section?.title || '');
      if (/참고 자료/.test(title)) {
        return { ...section, body: buildReferencesBody(section?.body, data.sources, {
          datasets: input.referenceDatasets || [], papers: refPapers, web: refWeb,
          cards: data.sourceCards, textbook: input.textbookCitation || '',
        }) };
      }
      const cleanedNumbers = removeUnsupportedNumbers(tidyCalculatedNumbers(scrubInternalNames(input.ingredients ? scrubIngredientIds(section?.body) : section?.body), calculation.verified), allowed,
        { allowPlans: /결론|제언|후속|느낀 점|고찰|확장|성찰/.test(title) });
      const units = removeCrossSubjectUnitClaims(cleanedNumbers.body, input.subject);
      const subjects = removeUnknownSubjectNames(units.body);
      // 안내문에 적힌 기구(선생님이 영상으로 재라고 한 과제)는 그대로 둔다.
      const tools = removeUnnamedTools(subjects.body, [studentText, input.taskDescription, input.taskName, data.draftReport].filter(Boolean).join(' '));
      const numbers = { body: tools.body, removed: cleanedNumbers.removed + units.removed + subjects.removed + tools.removed, dropped: [...cleanedNumbers.dropped, ...units.dropped, ...subjects.dropped, ...tools.dropped] };
      removed += numbers.removed;
      // 무엇이 지워졌는지 남긴다(학생 화면에는 안 보인다). 운영 테스트에서 지워진 문장을 볼 수 없어 원인을 짐작만 했다.
      droppedSamples.push(...numbers.dropped.map((sentence) => clip(sentence, 140)));
      if (/느낀 점/.test(title)) {
        const feelings = removeInventedFeelings(numbers.body, studentText);
        const praise = removeSelfPraise(feelings.body, studentText);
        const actions = removeInventedActions(praise.body, studentText);
        // 실험 보고서의 학생 자료는 sourceCards 에 있다(sources 는 문헌 탐구 보고서 쪽이다). 운영 테스트 35에서
        // sources 만 보다가 「참고 자료는 별도로 사용하지 않았고」가 그대로 남았다.
        const sourceClaim = removeNoSourceClaim(actions.body, (data.sources || []).length + (data.sourceCards || []).length > 0);
        removedFeelings += feelings.removed + praise.removed + actions.removed + sourceClaim.removed;
        return { ...section, body: sourceClaim.body };
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
    const recordDraft = buildRecordDraft((Array.isArray(parsed?.recordDraft) ? parsed.recordDraft : []).map((line) => tidyCalculatedNumbers(line, calculation.verified)), allowed);
    return { parsed: { ...parsed, sections: cleaned }, extra: { ...extra, recordDraft, removedNumberSentences: removed, removedFeelingSentences: removedFeelings,
      ...(calculation.verified.length || calculation.rejected.length ? { calculations: calculation.verified, rejectedCalculations: calculation.rejected } : {}),
      ...(droppedSamples.length ? { removedNumberSamples: droppedSamples.slice(0, 8) } : {}),
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
