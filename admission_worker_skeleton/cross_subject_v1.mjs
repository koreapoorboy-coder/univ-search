// 교과 융합 — which other subject this report should cross into, and what that subject actually does for it.
//
// A 수행평가 is set inside one subject, but the reports that stand out now are the ones that carry a second
// subject's way of asking into the first. Left alone the model writes a single-subject report and, when told to
// "융합하라", writes a label ("사회적 관점에서 보면 …") instead of a crossing. So this module names one real
// partner subject from our own data and says where in the report that subject has to do work.
//
// Data: seed/engine-index/cross_subject_index.v1.json, built by tools/build_cross_subject_index.mjs from
// subject_bridge_point.json (26 subjects), major_followup_axis.json (17 majors) and the 7,131-task corpus.

export const GROUPS = ['국어', '수학', '영어·외국어', '사회', '과학', '정보·기술', '예술·체육', '교양·융합'];

// What each group brings that the others cannot. Written as the question that group asks, because a lens the
// student cannot turn into a question is a label.
const GROUP_LENS = {
  국어: { lens: '말과 글이 사실을 어떻게 전하고 어떻게 바꾸는지 본다', ask: '같은 사실이 어떤 표현으로 전해지며, 그 표현이 읽는 사람의 판단을 어디까지 바꾸는가' },
  수학: { lens: '값을 서로 견줄 수 있는 형태로 바꾼다', ask: '차이를 비율·변화율·분포 중 무엇으로 재야 공정하며, 그 차이가 우연일 가능성은 없는가' },
  '영어·외국어': { lens: '같은 주제를 다루는 다른 언어권 자료와 우리 자료를 견준다', ask: '다른 나라에서는 이 문제를 어떤 말로 부르고 어떤 기준으로 다루는가' },
  사회: { lens: '사람과 제도의 문제로 본다', ask: '이 결과가 누구에게 더 크게 닿으며, 무엇을 바꾸면 그 차이가 줄어드는가' },
  과학: { lens: '원리와 변인으로 인과를 따진다', ask: '무엇을 바꾸면 무엇이 달라지며, 그렇게 되는 까닭은 무엇인가' },
  '정보·기술': { lens: '과정을 자료와 절차로 바꾼다', ask: '이 일을 어떤 자료로 모아 어떤 순서로 처리하면 사람이 하던 판단을 대신할 수 있는가' },
  '예술·체육': { lens: '몸과 표현으로 드러나는 차이를 다룬다', ask: '감각으로 느껴지는 차이를 어떤 기준으로 재고 어떻게 보여줄 것인가' },
  '교양·융합': { lens: '여러 과목의 답을 한 문제 앞에 모은다', ask: '어느 관점이 무엇을 설명하고, 무엇을 끝내 설명하지 못하는가' },
};

// Where a subject in this group usefully crosses to, in order. Used when the data has no bridge for the subject.
const GROUP_PARTNERS = {
  과학: ['사회', '수학', '정보·기술', '국어'],
  수학: ['사회', '과학', '정보·기술'],
  사회: ['수학', '과학', '국어', '정보·기술'],
  국어: ['사회', '과학', '정보·기술'],
  '영어·외국어': ['사회', '국어', '과학'],
  '정보·기술': ['사회', '수학', '과학'],
  '예술·체육': ['과학', '사회', '정보·기술'],
  '교양·융합': ['사회', '과학', '수학'],
};

// A generic subject name per group, for when no real subject name was found. Every school teaches these.
const GROUP_SUBJECT = { 국어: '공통국어', 수학: '공통수학', '영어·외국어': '영어', 사회: '통합사회', 과학: '통합과학', '정보·기술': '정보', '예술·체육': '체육', '교양·융합': '융합 교과' };

const NAME_GROUP = [
  [/국어|문학|화법|독서|작문|언어와 매체|논술|문예/, '국어'],
  [/수학|대수|미적분|기하|확률과 통계|통계/, '수학'],
  [/영어|중국어|일본어|한문|독일어|프랑스어|스페인어|러시아어|베트남어|아랍어/, '영어·외국어'],
  [/과학|물리|화학|생명|지구|역학|전자기|세포|물질과 에너지/, '과학'],
  [/사회|역사|지리|윤리|정치|경제|법과|인문/, '사회'],
  [/정보|공학|기술·가정|프로그래밍|인공지능|데이터/, '정보·기술'],
  [/음악|미술|체육|스포츠|운동|무용|연극|공예|디자인/, '예술·체육'],
];

const clean = (value) => String(value ?? '').trim();
// 생명과학Ⅰ, 생명과학 I, 생명과학1 are one subject as far as a bridge is concerned.
const bare = (value) => clean(value).replace(/[\sⅠⅡⅢIV0-9]+$/g, '').trim();

export function normalizeGroup(subject, index) {
  const name = clean(subject);
  if (!name) return '';
  const table = index?.subjectGroup || {};
  if (table[name]) return table[name];
  const stem = bare(name);
  if (stem && table[stem]) return table[stem];
  for (const key of Object.keys(table)) {
    if (stem && (key.startsWith(stem) || stem.startsWith(key)) && key.length >= 2) return table[key];
  }
  for (const [pattern, group] of NAME_GROUP) if (pattern.test(name)) return group;
  return '';
}

function bridgesFor(subject, index) {
  const table = index?.bridges || {};
  const name = clean(subject);
  if (table[name]) return table[name];
  const stem = bare(name);
  if (stem && table[stem]) return table[stem];
  for (const key of Object.keys(table)) {
    if (stem && (bare(key) === stem || key.startsWith(stem) || stem.startsWith(bare(key)))) return table[key];
  }
  return [];
}

// 통합사회2, 통합과학1 are how the curriculum map writes them; a student says 통합사회. If dropping the level digit
// lands on a subject the corpus really sees, that is the name to use.
function displayName(subject, index) {
  const name = clean(subject);
  const counts = index?.subjectCount || {};
  if (counts[name]) return name;
  const stem = clean(name).replace(/[12]$/, '').trim();
  return stem && counts[stem] ? stem : name;
}

// The 종단 축 mixes subjects and majors in one "next" list — 기계공학, 심리학과 sit next to 화학 — so a candidate
// has to be a school subject the index actually knows. A major is a career, not a class the student can cross into.
const MAJOR_NAME = /(학과|학부|전공|대학|예과)$/;
function knownSubject(subject, index) {
  const table = index?.subjectGroup || {};
  const name = clean(subject);
  if (!name || MAJOR_NAME.test(name)) return false;
  return Boolean(table[name] || table[bare(name)] || table[displayName(subject, index)]);
}

// Two students with the same task should not get the same partner. What the student is aiming at decides which
// way the report leans, so the track pulls the choice toward the subjects that track really uses.
const TRACK_GROUPS = [
  [/의약|의예|치의|한의|수의|간호|보건|약학|재활|임상/, ['과학', '사회']],
  [/공학|컴퓨터|기계|전자|전기|화공|신소재|반도체|건축|도시|항공|로봇|소프트웨어|데이터|정보/, ['정보·기술', '수학']],
  [/자연|생명|생물|화학|물리|지구|환경|농림|수산|식품|천문/, ['과학', '수학']],
  [/사회|경영|경제|행정|정치|법|교육|심리|복지|관광|무역/, ['사회', '수학']],
  [/인문|어문|국어|영문|문헌|철학|사학|역사|종교|미디어|언론|신문방송|문예/, ['국어', '사회']],
  [/예술|예체능|체육|디자인|음악|미술|무용|연극|영화|스포츠/, ['예술·체육', '국어']],
];
function trackGroups(input) {
  const text = [input?.track, input?.career, input?.major].filter(Boolean).join(' ');
  for (const [pattern, groups] of TRACK_GROUPS) if (pattern.test(text)) return groups;
  return [];
}

// A partner subject is only useful if the student is plausibly in it. The corpus counts say which subjects schools
// actually run, so a subject 수백 개 과제 carries outranks one the corpus never saw.
function commonBonus(subject, index) {
  const count = (index?.subjectCount || {})[displayName(subject, index)] || 0;
  if (count >= 200) return 4;
  if (count >= 50) return 3;
  if (count >= 10) return 2;
  if (count > 0) return 1;
  // A subject no 평가계획 in the corpus runs is one the student is unlikely to be sitting in.
  return -2;
}

function majorFor(major, index) {
  const table = index?.majors || {};
  const name = clean(major);
  if (!name) return null;
  if (table[name]) return table[name];
  for (const key of Object.keys(table)) {
    const short = key.replace(/(학과|과|학부|전공)$/, '');
    if (short.length >= 2 && (name.includes(short) || short.includes(name))) return table[key];
  }
  return null;
}

// Which subject this report should reach into, and why that one.
export function pickCrossSubject(input, index, limit = 2) {
  if (!index?.subjectGroup) return null;
  const home = clean(input?.subject) || clean(input?.subjectGroup);
  const homeGroup = normalizeGroup(home, index) || normalizeGroup(input?.subjectGroup, index);
  if (!homeGroup) return null;

  const text = [input?.taskDescription, input?.taskName, input?.selectedConcept, input?.selectedKeyword, input?.keyword]
    .filter(Boolean).join(' ');
  const scores = new Map();
  const reasons = new Map();
  const add = (subject, points, reason) => {
    const name = clean(subject);
    if (!name || bare(name) === bare(home)) return;
    scores.set(name, (scores.get(name) || 0) + points);
    if (!reasons.has(name) && reason) reasons.set(name, reason);
  };

  // 1. The subject's own bridge points: the shared idea is named, and the task text says which one is live.
  for (const point of bridgesFor(home, index)) {
    const hits = (point.keywords || []).filter((word) => word && text.includes(word));
    const weight = 6 + Math.min(hits.length, 3) * 4;
    for (const next of point.next || []) add(next, weight, point.desc);
  }
  // 2. The major the student chose themselves.
  const major = majorFor(input?.major || input?.track, index);
  if (major) for (const next of major.next || []) add(next, 5, major.desc);
  // 3. The 종단 축 already matched for this report.
  for (const axis of input?.careerAxes || []) {
    for (const next of axis?.next || []) add(next, 4, axis.why);
  }

  const leaning = trackGroups(input);
  const ranked = [...scores.entries()]
    .filter(([subject]) => knownSubject(subject, index))
    .map(([subject, score]) => {
      const group = normalizeGroup(subject, index);
      const pull = leaning.indexOf(group);
      return {
        subject: displayName(subject, index),
        score: score + commonBonus(subject, index) + (pull === 0 ? 6 : pull === 1 ? 3 : 0),
        group,
        why: reasons.get(subject) || '',
      };
    })
    .filter((item) => item.group && item.group !== homeGroup && bare(item.subject) !== bare(home))
    .sort((a, b) => b.score - a.score);

  const partners = [];
  const takenGroups = new Set();
  const take = (item) => {
    if (!item || takenGroups.has(item.group) || partners.length >= limit) return;
    takenGroups.add(item.group);
    partners.push({ subject: item.subject, group: item.group, why: item.why, ...GROUP_LENS[item.group] });
  };
  // The best-evidenced partner leads. The next slot is held for the student's own track, so two students handed
  // the same 안내문 do not walk away with the same report — a task's wording alone would give everyone one answer.
  take(ranked[0]);
  const leaned = ranked.find((item) => leaning.includes(item.group) && !takenGroups.has(item.group));
  if (leaned) take(leaned);
  else {
    // The data reaches nowhere near this student's track. Offer the track's own direction anyway, named by the
    // subject every student recognises rather than a bare group label.
    const group = leaning.find((name) => name !== homeGroup && !takenGroups.has(name));
    if (group) take({ subject: GROUP_SUBJECT[group] || group, group, why: '' });
  }
  for (const item of ranked) take(item);
  // Nothing in the data reaches out of this subject — fall back to where this group usually crosses, with the
  // student's own track first in the queue.
  const fallback = [...leaning, ...(GROUP_PARTNERS[homeGroup] || [])];
  for (const group of fallback) {
    if (partners.length >= limit) break;
    if (takenGroups.has(group) || group === homeGroup) continue;
    takenGroups.add(group);
    partners.push({ subject: GROUP_SUBJECT[group], group, why: '', ...GROUP_LENS[group] });
  }
  if (!partners.length) return null;
  return { home: home || GROUP_SUBJECT[homeGroup], homeGroup, homeLens: GROUP_LENS[homeGroup]?.ask || '', partners };
}

// What the report is told. Three places the partner subject must do work, because "융합" without a place to land
// comes back as a sentence with another subject's name in it.
// A hands-on 실험 과제 is where the crossing goes wrong. The model designs a clean single-subject experiment
// first and only remembers the other subject in the closing 계열 연계 절, which reads as an afterthought because
// it is one. The way in is the measurement itself: what is measured, and which conditions are compared.
const KIND_LINES = {
  measurement: [
    '- 이 과제는 학생이 직접 재는 실험이다. 실험 설계를 먼저 끝내고 다른 과목을 마지막 절에서 꺼내면 융합이 아니다. 아래 중 최소 하나를 실험 설계 안에서 한다.',
    '  ① 재는 항목을 고른 과목의 물음에 답할 수 있는 값으로 정한다. (예: 저항만 재지 않고 측정 방식에 따른 흔들림을 함께 재기)',
    '  ② 비교할 조건 중 하나를 그 과목이 중요하게 보는 차이로 둔다. (예: 사람마다 다른 조건, 자료 처리 방식이 다른 조건)',
    '  ③ 같은 값을 두 가지 방법으로 재고 어느 쪽이 더 믿을 만한지 따진다.',
    '- 실험 대상과 장면도 학생의 진로 쪽에서 고른다. 같은 원리라도 어디에서 재는지가 달라지면 다른 탐구가 된다.',
  ],
  survey: ['- 문항을 만들 때 고른 과목의 물음이 문항 하나로 들어가야 한다. 응답을 세는 방법이나 집단을 나누는 기준에서도 그 과목이 일하게 한다.'],
  dataset: ['- 어떤 지표를 고르고 무엇과 무엇을 견줄지 정하는 자리에서 고른 과목의 방식을 쓴다. 자료를 다 정리한 뒤 마지막에 한 문단 덧붙이는 것은 융합이 아니다.'],
  reading: ['- 자료를 고르는 기준이나 자료끼리 견주는 기준에서 고른 과목의 방식을 쓴다. 자료를 다 읽은 뒤 마지막에 한 문단 덧붙이는 것은 융합이 아니다.'],
};

export function crossSubjectPromptLines(bridge, stage = '', kind = '') {
  if (!bridge?.partners?.length) return [];
  // The second stage inherits the question the 설계서 already set; choosing a partner subject again there would
  // split one report into two halves that do not meet.
  if (stage === 'experiment_final' || stage === 'literature') {
    const lead = bridge.partners[0];
    return [
      '',
      '[교과 융합 — 1차 설계서에서 이미 정한 연결]',
      '- 1차 설계서가 다른 과목의 관점으로 연구 질문을 세웠다면 그 연결을 그대로 이어받는다. 다른 과목으로 바꾸거나 새 과목을 덧붙이지 않는다.',
      `- 이번 단계에서는 그 관점이 결과 해석과 결론에서 실제로 일을 하게 한다. 참고로 ${lead.subject}(${lead.group})가 던지는 물음은 "${lead.ask}"이다.`,
      '- 1차 설계서에 다른 과목의 관점이 없으면 억지로 넣지 않는다. 결론에서 이 결과가 어느 과목의 물음으로 이어지는지 한두 문장으로만 밝힌다.',
    ];
  }
  return [
    '',
    '[교과 융합 — 주제가 걸쳐야 할 다른 과목]',
    `- 이 과제의 본 과목은 ${bridge.home}(${bridge.homeGroup})이다. 본 과목은 그대로 중심에 두고, 다른 과목 하나의 보는 방식을 실제로 끌어와 주제를 세운다.`,
    // Both partners often come from one bridge point, so the reason is the same sentence twice. Say it once.
    ...bridge.partners.map((partner, index) => [
      `- ${partner.subject}(${partner.group}): ${partner.lens}. 이 과목이 던지는 물음은 "${partner.ask}"이다.`,
      partner.why && partner.why !== bridge.partners[index - 1]?.why ? `  우리 교육과정 지도에서 이어지는 근거: ${partner.why}` : '',
    ].filter(Boolean).join('\n')),
    '- 위 과목 중 이번 과제에 실제로 쓸모가 있는 하나만 고른다. 둘 다 끌어오면 둘 다 얕아진다.',
    '- 융합은 이름표가 아니다. "사회적 관점에서 보면", "수학적으로 분석하면" 같은 문장을 덧붙이는 것은 융합이 아니다. 고른 과목이 아래 세 곳 중 최소 두 곳에서 실제로 일을 해야 한다.',
    '  ① 연구 질문: 두 과목의 물음이 하나의 질문으로 합쳐진 형태로 쓴다. 본 과목의 질문 뒤에 다른 과목의 질문을 덧붙이지 않는다.',
    '  ② 비교 기준이나 분석 방법: 무엇과 무엇을 어떤 기준으로 견줄지 정하는 자리에서 그 과목의 방식을 쓴다.',
    '  ③ 결론: 본 과목만으로는 답할 수 없던 부분을 그 과목이 어떻게 메웠는지 밝힌다.',
    '- 결론 마지막 문단(후속 탐구)에서만 다른 과목을 꺼내면 위 세 곳 중 어느 것도 채운 것이 아니다. 그 문단은 이미 끝난 탐구의 다음 걸음을 적는 자리다.',
    ...(KIND_LINES[kind] || []),
    // A 국어·사회 lens has no place inside a physics or biology bench experiment, so the model drops it and writes
    // a single-subject lab. It does have one: what the measurement is shown as, and what that does to a reader.
    ...(kind === 'measurement' && bridge.partners.some((partner) => ['국어', '사회'].includes(partner.group))
      ? ['- 고른 과목이 국어나 사회라면, 잰 값 자체가 아니라 그 값을 어떻게 전하느냐를 조건으로 둘 수 있다. 같은 결과를 서로 다른 방식(수치만 · 수치와 범위 · 그림)으로 보여 주고, 읽는 사람의 판단이나 정답률이 어떻게 달라지는지 재는 설계는 고등학생이 실제로 할 수 있다. 실험 대상이나 장면을 그 과목이 다루는 자리에서 고르는 것도 같은 방법이다.']
      : []),
    '- reportTitle에는 탐구 대상과 그것을 보는 관점이 함께 드러나게 쓴다. 과목 이름을 제목에 넣으라는 뜻이 아니다.',
    '- 두 과목을 잇는 다리는 학생이 실제로 할 수 있는 일이어야 한다. 대학 연구나 전문 장비가 있어야 가능한 연결은 쓰지 않는다.',
    '- 다른 과목의 개념을 가져올 때는 이름만 쓰지 말고 이번 탐구에서 그 개념이 무엇을 가리키는지 한 문장으로 풀어 쓴다.',
    '- 억지로 끼워 맞춘 융합은 안 하느니만 못하다. 아래 중 하나라도 해당하면 그 과목은 버리고 본 과목만으로 깊게 쓴다.',
    '  · 다른 과목의 개념을 문장 한두 개로 언급하고 그 뒤로는 쓰지 않는다.',
    '  · 그 과목을 빼도 연구 질문과 결론이 그대로 성립한다.',
    '  · 그 과목을 넣기 위해 확인되지 않은 사실이나 억지 비유를 만들어야 한다.',
    '  · 학생이 실제로 할 수 없는 장비나 자료가 있어야 성립한다.',
    '- 본 과목만으로 쓰기로 했으면 그 사실을 따로 밝히지 않고, 그냥 한 과목을 끝까지 깊게 판 보고서로 쓴다.',
  ];
}
