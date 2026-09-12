// Decides what shape a report takes: which sections it has, how its topic is framed, what the teacher will be
// looking at, and what to avoid.
//
// Two sources, each used for what it is good at.
//
// The structure is decided by rules here, not learned from the corpus. The corpus's own structure tags are noisy
// — "문학 비평문 쓰기" is filed under structure_experiment_report — and a wrong structure puts 가설 and 실험 방법
// into a 논술 report, which is exactly the fault this is meant to fix. The seventeen hand-written structures are
// clean, so the task's wording picks one of those.
//
// The numbers come from the corpus, which is reliable about them: report_mode and the graded elements are derived
// from the 평가방법 checkboxes on real 평가계획, so "what does a 논증형 과제 in 사회 actually get graded on" is a
// question 7,131 tasks can answer. A thin bucket climbs the ladder: 계열+유형 → 유형 → 계열.

const MIN_BUCKET = 10;

const GROUP_MAP = [
  [/정보|소프트|AI|인공지능|기술/, '정보'],
  [/과학|공학/, '과학'],
  [/수학/, '수학'],
  [/국어|문학/, '국어'],
  [/영어|외국어|한문/, '영어'],
  [/예술|체육|예체능|음악|미술/, '예술·체육'],
  [/사회|역사|윤리|지리|인문|교양|융합|생활|경제|정치/, '사회'],
];

export function normalizeGroup(value) {
  return GROUP_MAP.find(([pattern]) => pattern.test(String(value || '')))?.[1] || '기타';
}

// Ordered: the first rule that matches wins, so the more specific wording is listed first.
const SHAPE_RULES = [
  { test: /논술문|논설문|찬반|토론|반론|주장을 담은|자기 주장/, structure: 'structure_argumentation', mode: '논증형' },
  { test: /정책|대안 제시|제도 개선|해결 방안을 제안/, structure: 'structure_policy_proposal', mode: '사회문제탐구형' },
  { test: /사회 ?문제|사회적 쟁점|사회 현상/, structure: 'structure_social_problem_analysis', mode: '사회문제탐구형' },
  { test: /비평|감상문|작품을 읽고|독서|서평/, structure: 'structure_reading_criticism', mode: '독서비평형' },
  { test: /알고리즘|코딩|프로그램|프로그래밍|구현/, structure: 'structure_programming_implementation', mode: '알고리즘구현형' },
  { test: /모델링|모형화|수학적으로 나타|수학화/, structure: 'structure_modeling_analysis', mode: '수학모델링형' },
  { test: /문항 제작|문제를 만들|문제 설계|풀이 과정/, structure: 'structure_problem_design', mode: '문제설계형' },
  { test: /실기|시연|연주|가창|경기|동작|연습/, structure: 'structure_practical_reflection', mode: '수행실기형' },
  // Before the creative rule: "실험을 설계하고" is an experiment, not a design project. The bare word 설계 is too
  // common to stand for creation on its own, so that rule asks for something actually being made.
  { test: /실험|측정|관찰 실험|실습/, structure: 'structure_experiment_analysis', mode: '실험분석형' },
  { test: /창작|제작|디자인|작품을 만|만들어 보|산출물/, structure: 'structure_creative_design', mode: '창작설계형' },
  { test: /통계|지표|추이|자료 ?해석|그래프 분석|데이터/, structure: 'structure_data_interpretation', mode: '자료해석형' },
  { test: /설문|인터뷰|응답자|여론/, structure: 'structure_data_interpretation', mode: '자료해석형' },
  { test: /매체|미디어|광고|영상 분석/, structure: 'structure_media_analysis', mode: '비평분석형' },
];

// When the wording says nothing, what the student will collect does.
const BY_COLLECTION = {
  measurement: { structure: 'structure_experiment_analysis', mode: '실험분석형' },
  survey: { structure: 'structure_data_interpretation', mode: '자료해석형' },
  dataset: { structure: 'structure_data_interpretation', mode: '자료해석형' },
  reading: { structure: 'structure_research_report', mode: '연구보고서형' },
  none: { structure: 'structure_concept_interpretation', mode: '개념해석형' },
};

export function decideStructure(input) {
  const text = [input?.taskDescription, input?.taskName, input?.taskType].filter(Boolean).join(' ');
  const matched = SHAPE_RULES.find((rule) => rule.test.test(text));
  if (matched) return { structure: matched.structure, mode: matched.mode, basis: '과제 안내문의 표현' };
  const byKind = BY_COLLECTION[input?.collectionKind] || BY_COLLECTION.reading;
  return { structure: byKind.structure, mode: byKind.mode, basis: '학생이 모으는 자료의 종류' };
}

// What 7,131 real tasks say about this kind of work in this 계열.
function lookupStats(index, group, mode) {
  const bucket = index?.byGroupMode?.[`${group}::${mode}`];
  if (bucket && bucket.count >= MIN_BUCKET) return { stats: bucket, level: `${group}의 ${mode} 과제 ${bucket.count}건` };
  const byMode = index?.byMode?.[mode];
  if (byMode && byMode.count >= MIN_BUCKET) return { stats: byMode, level: `${mode} 과제 ${byMode.count}건 (계열 구분 없이)` };
  const byGroup = index?.byGroup?.[group];
  if (byGroup) return { stats: byGroup, level: `${group} 과제 ${byGroup.count}건 (유형 구분 없이)` };
  return { stats: null, level: '' };
}

export function pickReportShape(input, index) {
  const group = normalizeGroup(input?.subjectGroup || input?.subject);
  const decided = decideStructure(input);
  const sections = index?.sections?.[decided.structure] || [];
  const { stats, level } = lookupStats(index, group, decided.mode);
  return {
    group,
    structure: decided.structure,
    mode: decided.mode,
    sections,
    formula: index?.formulas?.[decided.mode] || '',
    rubrics: stats?.rubrics || [],
    avoid: stats?.avoid || [],
    outputs: stats?.outputs || [],
    count: stats?.count || 0,
    basis: [decided.basis, level].filter(Boolean).join(' · '),
  };
}

// What the model is told. Sections become the report's headings and are passed separately; these lines carry
// the rest of the shape.
export function shapePromptLines(shape) {
  if (!shape) return [];
  const lines = ['', `[이런 과제가 실제로 쓰이는 모습 — ${shape.basis}]`];
  if (shape.mode) lines.push(`- 보고서 유형: ${shape.mode}`);
  if (shape.formula) lines.push(`- 이런 과제에서 주제를 잡는 방식: ${shape.formula}. 연구 질문과 제목을 이 틀에 맞춰 구체적으로 정한다.`);
  if (shape.rubrics.length) lines.push(`- 같은 유형의 과제에서 선생님이 실제로 보는 것: ${shape.rubrics.join(', ')}. 이 항목이 드러나게 쓴다.`);
  if (shape.avoid.length) lines.push(`- 이런 과제에서 피해야 하는 형태: ${shape.avoid.join(', ')}.`);
  return lines;
}
