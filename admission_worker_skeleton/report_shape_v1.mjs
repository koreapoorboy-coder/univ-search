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

// **학년 공통 양식의 방식표는 방식 정보가 아니다.**
// 학교가 한 학년 전체에 같은 양식을 쓰면서 칸을 다 켜 둔다 —
//   「서술·논술, 구술발표, 토의토론, 조사관찰보고서, **실험실습**, 실기시연, 포트폴리오, …」 (열한 개)
// 그 「실험실습」 때문에 국어·영어 글쓰기 과제가 실험 뼈대로 갔다. 서평에 「가설과 변인 설정」이 붙었다.
// 전체 2,473건 중 **709건(29%)** 이 칸이 다섯 개 이상이다(2026-09-25 실측).
// 칸이 다섯 개 이상이면 양식일 뿐이므로 뼈대를 정할 때 쓰지 않는다. 안내문 글만 본다.
const FORM_FIELDS = 5;
function methodText(input) {
  const raw = String(input?.taskType || '');
  const fields = raw.split(/[,·\s]+/).map((one) => one.trim()).filter(Boolean);
  return fields.length >= FORM_FIELDS ? '' : raw;
}

// **글쓰기 과제에는 재는 뼈대를 주지 않는다.**
// 서평·논평·감상·에세이는 학생 자신의 글이다. 「가설과 변인 설정」·「오차·한계 분석」을 주면
// 모델이 빈 절을 채우려고 없는 실험을 지어낸다 — 서평이 「코딩해 비교하는 연구」로 나왔다
// (운영 검사 2026-09-22, 공통국어1).
//
// 무엇이 「학생 자신의 글」인지는 **화면과 같은 파일**을 본다. 두 곳이 다르게 판단하면
// 화면은 「글은 안 써 드려요」라고 하고 워커는 실험 뼈대를 주는 일이 생긴다.
// 글쓰기 낱말은 과제 이름·안내문에서만 본다 — 방식표는 학년 공통 양식이라 못 믿는다.
const WRITING_TASK = /서평|독후|감상문|비평|논평|논술|논증|에세이|수필|창작|시 ?쓰기|글쓰기|작문|낭독|번역/;
const MEASURING_SHAPE = /experiment|data_interpretation|data_analysis|modeling|problem_design|algorithm|engineering/;

export function decideStructure(input) {
  const text = [input?.taskDescription, input?.taskName, methodText(input)].filter(Boolean).join(' ');
  const writing = WRITING_TASK.test(text);
  // 글쓰기 과제면 재는 뼈대를 건너뛴다. 규칙 순서는 그대로 두고 **고를 수 있는 것만** 줄인다.
  const rules = writing ? SHAPE_RULES.filter((rule) => !MEASURING_SHAPE.test(rule.structure)) : SHAPE_RULES;
  const matched = rules.find((rule) => rule.test.test(text));
  if (matched) return { structure: matched.structure, mode: matched.mode, basis: '과제 안내문의 표현' };
  // 안내문이 아무 말도 안 하면 학생이 모으는 것으로 정한다. 다만 글쓰기 과제는
  // 「모을 것 없음」이어도 재는 뼈대로 가면 안 된다.
  // 글쓰기 과제는 무엇을 쓰는 글인지에 따라 뼈대가 다르다. 논증문에 「책 선정 이유」를 주면 안 된다.
  if (writing) {
    if (/논술|논증|논설|주장|쟁점|찬반|반론|설득/.test(text)) {
      return { structure: 'structure_argumentative_writing', mode: '논증형', basis: '학생이 직접 쓰는 논증문' };
    }
    if (/서평|독후|책을 읽고|도서/.test(text)) {
      return { structure: 'structure_reading_critique', mode: '독서비평형', basis: '학생이 직접 쓰는 서평' };
    }
    if (/창작|시 ?쓰기|소설|수필 ?쓰기/.test(text)) {
      return { structure: 'structure_creative_application', mode: '창작설계형', basis: '학생이 직접 하는 창작' };
    }
    if (/에세이|영어로|English/i.test(text)) {
      return { structure: 'structure_text_analysis_argument', mode: '논증형', basis: '학생이 직접 쓰는 에세이' };
    }
    return { structure: 'structure_reading_criticism', mode: '독서비평형', basis: '학생이 직접 쓰는 글' };
  }
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
