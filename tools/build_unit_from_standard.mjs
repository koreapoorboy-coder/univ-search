// **성취기준 코드 → 단원** 표를 만든다. ₩0.
//
// 왜 필요한가(2026-09-25 실측). 국어·영어 과제에서 단원을 읽어내는 비율이 **0%** 다.
// 과학은 51% 인데 국어·영어는 한 건도 못 읽는다. 안내문에 단원 이름이 아니라 이렇게 적혀 있어서다:
//
//   [10공영1-02-02] [10공영1-02-03]        ← 성취기준 코드
//   Lesson 4. Cultural Treasures          ← 교과서 과 번호
//   1. 함께 나누는 국어 / 2. 문학의 네 가지 갈래
//
// 단원을 못 읽으면 논문도 뼈대도 다 어긋난다 — 그것이 국어·영어가 안 맞는 첫째 이유다.
// **성취기준 코드는 국가가 정한 것이라 표 하나면 전 학교에 통한다.** 교과서가 필요 없다.
//
// 영역 번호가 무엇인지는 **기록으로 확인했다**(외워서 적지 않았다).
// 그 코드를 단 과제 이름을 모아 보니 이렇게 갈렸다:
//   10공국1-01 → 「문학으로 소통하기」·「구술 평가」·「발표」            → 듣기·말하기
//   10공국1-02 → 「서평 작성」·「함께 읽고 싶은 책」·「한 학기 한 권 읽기」  → 읽기
//   10공국1-03 → 「관심분야 글을 읽고 비판적으로 글쓰기」                → 쓰기
//   10공국1-04 → 「실생활 속 음운의 변동 분석」·「음운의 리듬을 담은 창작 시」 → 문법
//   10공국1-05 → 「현대시 감상」·「작품 속 인물이 되어 토론」·「문학 작가 탐구」 → 문학
//   10공국1-06 → 「매체 독서 비평」·「시 재구성을 통한 매체 생산」          → 매체
//   10공영1-01 / 12영Ⅰ-01 → 「리딩저널」·「지문 요약」·「Ears Wide Open」  → 이해(듣기·읽기)
//   10공영1-02 / 12영Ⅰ-02 → 「논설문 쓰기」·「에세이 쓰기」·「Speak & Shine」 → 표현(말하기·쓰기)
//
//   node tools/build_unit_from_standard.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const OUT = new URL('../public/keyword-engine/seed/engine-index/unit_from_standard.v1.json', import.meta.url);
const AXIS = new URL('../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json', import.meta.url);

// 영역 이름. 과목마다 영역 수가 다르다.
const AREA = {
  공통국어1: { '01': '듣기·말하기', '02': '읽기', '03': '쓰기', '04': '문법', '05': '문학', '06': '매체' },
  공통국어2: { '01': '듣기·말하기', '02': '읽기', '03': '쓰기', '04': '문법', '05': '문학', '06': '매체' },
  영어: { '01': '이해', '02': '표현' },
  // 2026-09-26: 「생물의 유전」(2022 개정 진로 선택). 영역 이름은 교육과정 별책9에 적힌 그대로다.
  '생물의 유전': { '01': '유전자와 유전물질', '02': '유전자의 발현', '03': '생명공학기술' },
};

// 코드 앞부분 → 우리 과목. 학교가 쓰는 표기가 여러 가지다(영Ⅰ·영I·영1).
const SUBJECT_OF = [
  [/^10공국1$/, '공통국어1'],
  [/^10공국2$/, '공통국어2'],
  [/^10공영[12]$/, '영어'],
  [/^12영[ⅠI1]$/, '영어'],
  [/^12영[ⅡII2]$/, '영어'],
  [/^12문학$/, '공통국어1'],   // 문학 과목은 화면에 없다. 공통국어1의 문학 단원으로 본다.
  [/^12유전$/, '생물의 유전'],
];

// **영역 → 단원.** 단원 이름은 우리 축(longitudinal_axis_index)에 있는 것 그대로다.
// 한 영역에 단원이 여럿이면 과제 글과 가장 많이 겹치는 것을 고른다(unit_from_standard_v1.mjs).
const MAP = {
  공통국어1: {
    '듣기·말하기': ['공동체 의사소통과 공감', '비판적 읽기와 토론'],
    읽기: ['문학·독서와 주체적 수용', '비판적 읽기와 토론'],
    쓰기: ['사회적 쟁점 글쓰기와 문장 구성'],
    문법: ['음운 변동과 국어 규범'],
    문학: ['서정 갈래와 시적 표현', '서사·극 갈래와 이야기 구성', '교술 갈래와 성찰적 표현', '문학·독서와 주체적 수용'],
    // **공통국어1에는 매체 단원이 없다.** 공통국어2의 매체 단원으로 보낸다 —
    // 과제 26건이 이 영역이고(「매체 독서 비평」·「시 재구성을 통한 매체 생산」),
    // 빈손으로 두면 그 26건은 단원을 못 읽는다.
    매체: ['매체 비평과 비판적 수용'],
  },
  공통국어2: {
    '듣기·말하기': ['공동 보고서 글쓰기와 자료 활용'],
    읽기: ['다양한 분야 독서와 홍보 표현', '매체 비평과 비판적 수용'],
    쓰기: ['공동 보고서 글쓰기와 자료 활용', '다양한 분야 독서와 홍보 표현'],
    문법: [],
    문학: ['과학 기술과 인간·미래 사회 성찰'],
    매체: ['매체 비평과 비판적 수용'],
  },
  영어: {
    // 순서가 곧 기본값이다(겹치는 낱말이 없을 때 앞의 것을 쓴다).
    // 「이해」에서 가장 흔한 과제는 요약·주제 파악이다 — 기록의 과제 이름이 그렇다.
    이해: ['세부 정보와 추론', '글의 주제와 요지 파악', '영미 문학 읽기와 감상', '영어권 문화 이해와 비교'],
    표현: ['문단 쓰기와 에세이 구성', '발표와 토론', '영어권 문화 이해와 비교'],
  },
  // 영역 하나가 중단원 둘로 갈린다(교과서도 그렇게 나눈다). 겹치는 낱말로 고르고, 없으면 앞의 것을 쓴다.
  '생물의 유전': {
    '유전자와 유전물질': ['사람의 유전과 유전병', '유전물질'],
    '유전자의 발현': ['유전자발현 과정', '유전자발현 조절'],
    '생명공학기술': ['생명공학기술의 발달', '생명공학기술의 영향과 생명윤리'],
  },
};

// 적어 둔 단원 이름이 우리 축에 **정말 있는지** 확인한다. 없는 이름을 적으면 조용히 안 걸린다.
const axis = JSON.parse(readFileSync(AXIS, 'utf8'));
const known = new Map();
for (const one of Object.values(axis.axes || {})) {
  if (!one?.subject || !one?.concept) continue;
  const list = known.get(one.subject) || new Set();
  list.add(one.concept);
  known.set(one.subject, list);
}
let bad = 0;
for (const [subject, byArea] of Object.entries(MAP)) {
  for (const [area, units] of Object.entries(byArea)) {
    for (const unit of units) {
      // 매체는 공통국어2 단원을 공통국어1에서도 쓴다 — 그 과목 축에 있으면 된다.
      const ok = [...known.values()].some((set) => set.has(unit));
      if (!ok) { console.log(`  ✗ 축에 없는 단원: ${subject} · ${area} · ${unit}`); bad += 1; }
    }
  }
}
if (bad) { console.error(`\n단원 이름 ${bad}개가 축에 없습니다. 표를 고쳐 주세요.`); process.exit(1); }

const out = {
  version: 'unit-from-standard-v1',
  note: '성취기준 코드의 영역 번호로 단원을 고른다. 영역 이름과 단원 짝은 사람이 정했고, 영역 번호의 뜻은 실제 과제 기록으로 확인했다.',
  builtAt: new Date().toISOString().slice(0, 10),
  subjectOf: SUBJECT_OF.map(([re, subject]) => [re.source, subject]),
  area: AREA,
  byArea: MAP,
};
let pairs = 0;
for (const byArea of Object.values(MAP)) for (const units of Object.values(byArea)) pairs += units.length;
console.log(`과목 ${Object.keys(MAP).length}개 · 영역 ${Object.values(AREA).reduce((n, one) => n + Object.keys(one).length, 0)}개 · 영역↔단원 짝 ${pairs}개`);
for (const [subject, byArea] of Object.entries(MAP)) {
  console.log(`\n  ${subject}`);
  for (const [area, units] of Object.entries(byArea)) {
    console.log(`    ${area.padEnd(8)} ${units.length ? units.join(' / ') : '(없음)'}`);
  }
}
if (WRITE) {
  writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`, 'utf8');
  console.log('\n표를 적었습니다.');
} else console.log('\n(보여 주기만 했습니다. --write 를 붙이세요.)');
