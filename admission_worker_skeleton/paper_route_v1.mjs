// 논문은 **학생이 낸 길 위에 세우는 표지판**이다.
//
// 지금까지는 개념 이름(「급수」, 「화학 반응」)으로 논문을 찾았다. 낱말 하나로 찾으니 우연히 겹친
// 것이 다 걸렸다 — 「급수」에 피아노 급수, '스펙트럼'에 자폐스펙트럼장애, '화학'에 LG화학 물적분할.
// 규칙을 덧대도 끝이 없었다. 낱말에는 구조가 없기 때문이다.
//
// 사용자가 방향을 바꿨다: **수행평가의 구조로 틀을 잡고, 그 틀로 검색 명령을 짓는다.**
// 재 보니 틀은 이미 있었다. 수행평가 7,131건에 topic_formula 가 96% 박혀 있다:
//   [변인]에 따른 [결과값] 변화가 [교과 원리]에 미치는 영향 분석
// 비어 있는 것은 칸의 **값**이다. 그 값은 학생 글에 있다.
//
// 논문 쪽 구조는 못 읽는다. 11만 편 전수로 재 보니 제목에서 방법(무엇을 바꿔 무엇을 쟀나)이
// 읽히는 것이 19%, 자연과학은 13%다. 그래서 구조는 **논문을 거르는 자리가 아니라 검색 명령을 짓는
// 자리**다. 그리고 명령의 핵심은 하나다 — **학생 글의 낱말 두 개가 제목에 함께 있어야 한다.**
// 낱말 하나는 우연히 겹친다. 두 개는 우연히 잘 안 겹친다(과제 394건: 과제당 309편 → 22편).
//
//   ① 틀     routeOf       — 이 과제가 어떤 길인가 (바꾸고 재기 / 주장하기 / 설명하기)
//   ② 칸     taskSlots     — 학생 글에서 바꾸는 것·재는 것을 뽑는다
//   ③ 명령   paperQuery    — 무엇을, 몇 개 함께 찾을지
//   ④ 판단   fitPaper      — 이 논문이 학생의 칸을 실제로 받치는가. 아니면 안 붙인다
//   ⑤ 안내서 guideLine     — 이 논문을 **어느 칸에** 쓰라고 한 줄로 적는다
//
// 우리는 논문 제목만 안다(초록은 파일에 없다). 그래서 안내서는 '이 논문에 무엇이 있다'고 쓰지 않는다.
// '제목으로 보아 무엇을 함께 다룬 연구이니, 초록에서 무엇을 확인해 어디에 쓰라'고 쓴다.
import { taskWords } from './univ_research_v1.mjs';

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

// ① 틀 → 길. 수행평가 유형(report_shape_index 의 formulas)을 세 길로 묶는다.
// 길마다 논문이 학생에게 해 주는 일이 다르다. 그 차이가 안내서의 말을 바꾼다.
export const ROUTES = {
  change: {
    label: '바꾸고 재는 탐구',
    modes: ['실험분석형', '연구설계형', '데이터해석형', '자료해석형', '모델링형', '문제설계형', '풀이비교형', '프로그래밍구현형'],
  },
  claim: {
    label: '근거로 주장하는 탐구',
    modes: ['논증형', '사회문제분석형', '정책제안형', '독서비평형', '매체분석형'],
  },
  explain: {
    label: '원리로 설명하는 탐구',
    modes: ['원리적용형', '개념해석형', '비교분석형', '연구보고서형', '창작설계형', '실기성찰형'],
  },
};

// reportMode 는 문자열로도, 배열로도 온다. 첫 번째로 아는 유형이 길을 정한다. 모르면 '설명'이다 —
// 가장 조심스러운 말(원리를 받치는 근거로 쓰라)을 하는 길이라서다.
// 보고서 구조 이름(report_shape_index 의 structure_*)으로 올 때도 있다.
const STRUCTURE_ROUTE = {
  structure_experiment_analysis: 'change', structure_research_design: 'change', structure_data_interpretation: 'change',
  structure_modeling_analysis: 'change', structure_problem_design: 'change', structure_solution_comparison: 'change',
  structure_programming_implementation: 'change',
  structure_social_problem_analysis: 'claim', structure_policy_proposal: 'claim', structure_argumentation: 'claim',
  structure_reading_criticism: 'claim',
  structure_principle_application: 'explain',
};
export function routeOf(mode) {
  const list = (Array.isArray(mode) ? mode : String(mode || '').split(/[,·\s/]+/))
    .map((one) => clean(one, 40)).filter(Boolean);
  for (const one of list) {
    if (STRUCTURE_ROUTE[one]) return STRUCTURE_ROUTE[one];
    for (const [route, info] of Object.entries(ROUTES)) {
      if (info.modes.includes(one)) return route;
    }
  }
  return 'explain';
}

// 칸 값이 될 수 없는 말. '변화'·'차이'는 칸의 이름이지 값이 아니다("온도에 따른 **변화**").
const SLOT_EMPTY = new Set(['변화', '차이', '영향', '결과', '효과', '정도', '모습', '양상', '특징', '관계', '경향']);
const JOSA_TAIL = /(으로|에서|에게|의|가|이|은|는|을|를|에|와|과|도|로)$/;
const bare = (word) => {
  const cut = String(word || '').replace(JOSA_TAIL, '');
  return cut.length >= 2 ? cut : String(word || '');
};
// 동사·어미로 끝나는 말은 찾는 말이 아니다. 과제문에는 "측정하여", "찾는다", "수행하기"가 많고,
// 논문 제목에는 거의 없다. 있어도 뜻을 가리키지 못한다.
const VERB_TAIL = /(하여|하고|한다|하기|하는|하며|해서|했다|는다|된다|되는|되어|시켜|시킨|따른|따라|위한|통한|대한|같은|이다|있는|없는|찾는|하자|해보|보기|한다면)$/;
// '~하'로 끝나는 세 글자 넘는 말도 동사 조각이다 — 운영 테스트에서 「초래하」가 중심 낱말에 들어갔다.
export const isVerb = (word) => VERB_TAIL.test(String(word || '')) || /^[가-힣]{2,}하$/.test(String(word || ''));
const TOKEN = '([가-힣A-Za-z0-9]{2,12})';
const FOLLOW = new RegExp(`${TOKEN}\\s*에\\s*따른\\s*${TOKEN}(?:\\s+${TOKEN})?`, 'g');
const ALTER = new RegExp(`${TOKEN}\\s*(?:을|를)\\s*(?:달리|다르게|바꾸|바꿔|변화시|조절)`, 'g');
const MEASURE = new RegExp(`${TOKEN}\\s*(?:을|를)\\s*(?:측정|기록|관찰|계산|재어|재고)`, 'g');
const COMPARE = new RegExp(`${TOKEN}\\s*(?:와|과)\\s*${TOKEN}\\s*(?:을|를)?\\s*비교`, 'g');

// **제목의 틀 말.** 논문 제목은 틀 말과 내용 말로 되어 있다:
//   "[온도]가 [효소 활성]에 **미치는 영향**에 **관한 연구**"
// 틀 말은 어느 논문에나 있어 두 낱말 규칙에서 한 자리를 못 맡는다 — '연구'와 '효과'가 함께 있다고
// 무엇을 받치지는 않는다. 11만 편 제목에서 흔한 말을 세어 보고 골랐다(tools/build_paper_route.mjs 가
// 다시 찍어 준다). 통계로만 가르려 했더니 인공지능·리터러시 같은 **진짜 주제어**까지 빠졌다. 그래서 손으로 적는다.
// '분석'·'비교'·'변화'·'구조'처럼 NOT_POINTING 에 이미 있는 말은 taskWords 가 먼저 뺀다.
export const FRAME = new Set([
  '연구', '영향', '미치', '미치는', '관한', '대한', '위한', '통한', '따른', '의한', '간의', '중심', '중심으로',
  '활용한', '이용한', '적용한', '고려한', '나타난', '기반', '기반한', '기반으로', '이용', '사용', '적용', '활용',
  '효과', '효과성', '매개효', '매개효과', '조절효', '조절효과', '조절된', '지각된', '요인', '영향요인', '결정요인',
  '탐색', '탐색적', '동향', '검토', '고찰', '소고', '논의', '모색', '제언', '제안', '시사점', '함의', '의미',
  '방안', '개선', '개선방안', '방향', '전략', '대응', '접근', '실태', '현황', '측정', '사례연구', '질적', '양적',
  '유형', '양상', '특징', '기법', '요소', '측면', '관점', '차원', '수준', '역할', '기능', '가치', '가능성',
  '개발', '구축', '도입', '운영', '관리', '지원', '강화', '형성', '향상', '성과', '과제', '대상', '주요',
  '초기', '시기', '이후', '그리고', '인식', '실제',
  // 목록에 없던 흔한 말을 빌더가 찍어 준 것에서 더 골랐다
  '차이', '국내', '경험', '요구', '의도', '구조적', '시대', '실천', '능력',
]);
const isFrame = (word) => FRAME.has(word) || /^\d+$/.test(word);

// **과제문의 틀 말.** 학교 과제문도 논문 제목처럼 틀과 내용으로 되어 있다:
//   "[기후] 지역별 [생활양식] 분석 … **평가요소**: 분량의 **적합성**, 내용의 **논리성** … **배점** 20점"
// 평가 틀 말은 교육학 논문을 끌어왔다. 수행평가 7,131건 전수로 돌려 보니 '수행평가+영역',
// '포트폴리오+프로젝트', '문항+답안', '적합성+사회'로 걸린 논문이 절반이었다 — 전부 수업·평가 연구다.
// 모든 과목 과제에 고르게 나오는 말을 세어 보고(과목 계열 10곳 넘게), **평가·과제 형식에 관한 말만**
// 손으로 골랐다. 환경·데이터·인공지능·기후처럼 여러 과목에 나와도 내용이 되는 말은 남긴다.
export const TASK_FRAME = new Set([
  '수행평', '수행평가', '평가요소', '평가내용', '평가방법', '평가계획표', '평가함', '배점', '채점', '점수', '만점', '득점',
  '기본점수', '반영비율', '성취기준', '성취기준별', '성취수준', '성취수준별', '성취', '교육과정', '교과', '교과별',
  '교수학습', '영역', '항목', '세부', '기타', '기타유형', '과제별', '1학기', '2학기',
  '프로젝트', '포트폴리오', '활동지', '관찰보고서', '계획서', '결과물', '산출물', '논술', '논술형', '서술', '서술형',
  '서논술형', '구술', '토의', '토론', '실습', '실기', '시연', '글쓰기', '쓰기', '읽고', '읽은', '듣고', '자기평', '동료평',
  '자신', '자신만', '본인', '나의', '자기', '개인', '개별', '개인별', '학생들', '교사',
  '바탕', '토대', '이를', '이에', '있다', '있음', '있는지', '있도록', '있으나', '않음', '않은', '등을', '등의', '또는',
  '모두', '모든', '하나', '일부', '전체', '부분', '해당', '경우', '여부', '사항', '관련된', '관련한', '주어진', '정해진',
  '제시', '제시된', '제시한', '제시할', '제시함', '제시하', '맞게', '맞는', '맞춰', '적절한', '적절하게', '적절히',
  '적절성', '적합한', '적합성', '정확하게', '정확한', '정확히', '정확성', '명확하게', '명확히', '구체적', '구체적인',
  '구체성', '논리적', '논리적인', '논리', '논리성', '체계적', '종합적', '창의적', '창의성', '효과적', '적극적', '타당성',
  '표현할', '표현하', '표현력', '설명할', '작성한', '작성함', '작성할', '분석한', '분석할', '탐구한', '수집한', '선정',
  '선정한', '활용할', '활용해', '수행할', '발표할', '해결할', '해결하', '제출함', '학습', '학습한', '배운', '알고',
  '생각', '의견', '견해', '이유', '근거', '질문', '핵심', '완성', '목적', '목표', '계획', '단계', '단계별', '절차',
  '형식', '흐름', '요약', '개요', '소개', '확장', '심화', '깊이', '맥락', '태도', '자세', '역량', '사고', '사고력',
  '비판적', '의사소통', '문제해결', '아이디어', '관심', '필요한', '중요성', '올바른', '오류', '성찰', '상황', '진로',
  '실생활', '일상생활', '일상', '확인', '예상', '실시', '준비', '최종', '선택', '설정', '반영', '수정', '기회', '타인',
  '함께', '매우', '다소', '비교적', '높은', '사실', '들어', '찾아', '속에서', '용어', '만들기',
  '서로', '다른', '다양', '여러', '과거', '현재', '미래', '나타나', '원인', '피해',
  // 실제 보고서 입력(2026-09-18, 통합과학2 산화·환원 과제)에서 나온 것 — 동사 조각과 실험 과제의 틀 말
  '일어나', '골라', '정해', '해석하', '직접', '변인', '생활',
]);
// 어느 과제에나 있는 과목 말. **그 학생 과목의 이름**은 paperQuery 가 따로 뺀다(묶음이 이미 그 과목이다).
// '화학'·'물리학'은 여기 두지 않는다 — 통합과학 과제에서 「화학 결합」의 '화학'은 내용이다. 처음에 여기 넣었더니
// 「화학 결합」 과제가 '결합' 하나로 「공유 자전거 수요예측 모형의 결합」에 걸렸다.
const SUBJECT_WORDS = new Set(['과학', '과학적', '사회', '사회적', '통합과학', '통합사회', '공통국어', '탐구실험', '과학탐구실험']);
// 날짜·학년·점수(2026학년, 6월, 20점, 2단계)
const COUNTED = /^\d+(학년|학년도|학기|월|일|점|단계|가지|개|명|차시|쪽)?$/;
// 성취기준 번호([10통사1-02-01], [12지구01-01])는 숫자와 한글이 섞인 조각으로 남는다
const CODE = (word) => /\d/.test(word) && /[가-힣]/.test(word);
const isTaskFrame = (word) => TASK_FRAME.has(word) || COUNTED.test(word) || CODE(word);

// ② 칸. 학생 글에서 **바꾸는 것**과 **재는 것**을 뽑는다. 못 뽑아도 괜찮다 — 그러면 낱말 두 개
// 규칙만으로 간다. 칸이 뽑히면 그 두 칸이 함께 맞는 논문이 앞에 선다.
export function taskSlots(text) {
  const body = clean(text, 1200);
  const change = [];
  const measure = [];
  const add = (list, word) => {
    const one = bare(word);
    if (one.length < 2 || SLOT_EMPTY.has(one) || isFrame(one) || list.includes(one)) return;
    if (!taskWords(one).size) return;   // '보고서'·'분석' 같은 빈 말은 칸 값이 못 된다
    list.push(one);
  };
  // "온도에 따른 효소의 활성" → 바꾸는 것 = 온도, 재는 것 = 효소·활성
  for (const hit of body.matchAll(FOLLOW)) {
    add(change, hit[1]);
    add(measure, hit[2]);
    if (hit[3]) add(measure, hit[3]);
  }
  // "농도를 달리하여", "빛의 세기를 바꾸어"
  for (const hit of body.matchAll(ALTER)) add(change, hit[1]);
  // "시간을 측정", "길이를 기록"
  for (const hit of body.matchAll(MEASURE)) add(measure, hit[1]);
  // "A와 B를 비교" — 견주는 두 조건은 바꾸는 것이다
  for (const hit of body.matchAll(COMPARE)) {
    add(change, hit[1]);
    add(change, hit[2]);
  }
  return { change: change.slice(0, 3), measure: measure.slice(0, 3) };
}

// ③ 검색 명령. 이것이 '어떤 구조로, 어떤 형태로 찾으라'의 실체다.
//   · words : 찾는 말. 학생 글에서 온다. 개념 이름이 아니다.
//   · need  : 제목에 **함께** 있어야 하는 수. 늘 2 — 하나는 우연히 겹친다.
//   · slots : 칸. 두 칸이 함께 맞으면 앞에 선다.
// 틀 말(FRAME)과 과제 틀 말(TASK_FRAME), 과목 이름은 늘 뺀다. common 으로 더 뺄 말을 넘길 수 있다(시험용).
export function paperQuery(text, mode, { common = [], subject = '', anchor = '' } = {}) {
  const own = new Set();
  for (const one of String(subject || '').split(/[\s·]+/).map((part) => part.replace(/\d+$/, '')).filter(Boolean)) {
    own.add(one);
    own.add(`${one}학`);   // 물리 → 물리학
  }
  const skip = {
    has: (word) => isFrame(word) || isTaskFrame(word) || SUBJECT_WORDS.has(word) || own.has(word) || common.includes(word),
  };
  const slots = taskSlots(text);
  const words = [];
  for (const raw of taskWords(text)) {
    const word = bare(raw);
    if (word.length >= 2 && !isVerb(word) && !skip.has(word) && !words.includes(word)) words.push(word);
  }
  for (const word of [...slots.change, ...slots.measure]) {
    if (!words.includes(word) && !skip.has(word)) words.push(word);
  }
  // **중심 칸.** 틀에는 [변인]·[결과값]만 있는 것이 아니라 [교과 개념]이 있다. 논문이 그 칸을 못 채우면
  // 구조에 들어갈 수 없다. 전수로 돌려 보니 「화학 평형」 과제에 '온도+농도'로 대류 논문이, 「낙하운동」
  // 과제에 '본성+이론'으로 맹자 논문이 붙었다 — 낱말 둘은 맞았지만 **탐구의 중심과는 무관**했다.
  // 중심은 과제 제목·학생이 고른 키워드·단원 개념에서 온다. 과제 설명은 평가 문구가 섞여 중심이 아니다.
  const center = [];
  for (const raw of taskWords(anchor)) {
    const word = bare(raw);
    if (word.length >= 2 && !isVerb(word) && !skip.has(word) && !center.includes(word)) center.push(word);
  }
  for (const word of center) if (!words.includes(word)) words.push(word);
  return {
    route: routeOf(mode),
    center,
    words: words.slice(0, 30),
    need: 2,
    slots: {
      change: slots.change.filter((one) => !skip.has(one)),
      measure: slots.measure.filter((one) => !skip.has(one)),
    },
  };
}

// 제목을 한 번만 쪼개 둔다. 두 글자 말은 낱말이 똑같아야 맞고(조사는 뗀다), 세 글자 이상은 붙은 말
// 안에서도 찾는다 — taskHit 과 같은 규칙이다. 논문 수천 편 × 낱말 스무 개를 매번 쪼개면 느리다.
const SHORT_JOSA = /(을|를|이|가|은|는|의|에|와|과|도|만)$/;
function titleView(title) {
  const tokens = new Set();
  for (const one of String(title || '').split(/[^가-힣A-Za-z0-9]+/)) {
    if (one.length < 2) continue;
    tokens.add(one);
    tokens.add(one.replace(SHORT_JOSA, ''));
  }
  return { title, tokens };
}
const seen = (view, word) => (word.length >= 3 ? view.title.includes(word) : view.tokens.has(word));

// 제목에 보이는 낱말들. 하나가 다른 하나를 품으면 **하나로 센다** — '화학반응'과 '화학'이 둘 다
// 걸렸다고 두 개가 아니다. 그건 한 낱말이다.
function distinctHits(view, words) {
  const hit = words.filter((word) => seen(view, word));
  hit.sort((a, b) => b.length - a.length);
  const kept = [];
  for (const word of hit) if (!kept.some((one) => one.includes(word))) kept.push(word);
  return kept;
}

// 제목 문형에서 읽히는 방법. 19%만 읽히므로 **덤**으로만 쓴다 — 읽히면 앞에 세우고, 안 읽혀도 안 뺀다.
const SHAPE = {
  change: /미치는\s*영향|에\s*따른|효과\s*(분석|검증|평가)|의\s*효과|측정|정량|비교|최적화|특성\s*(분석|평가)/,
  claim: /인식|실태|쟁점|담론|비판|논쟁|고찰|사례|정책|제도|방안/,
  explain: /원리|메커니즘|기작|작용|모형|해석|규명|이해/,
};

// ④ 판단. 이 논문이 학생의 길에 들어갈 수 있는가.
//   · 학생 글의 낱말 **둘**이 제목에 함께 있어야 한다
//   · 그중 **하나는 이 과목 안에서도 드문 말**이어야 한다(sharp). 과목 안에서 흔한 말 둘은 우연히 겹친다 —
//     통합사회 논문 1만 편에서 '지역'과 '문제'는 수백 편이 함께 갖고 있다.
export function fitPaper(paper, query, sharp = null) {
  const title = clean(paper?.title, 240);
  if (!title || !query?.words?.length) return null;
  const hits = distinctHits(titleView(title), query.words);
  if (hits.length < query.need) return null;           // 둘이 함께가 아니면 안 붙인다
  if (sharp && !hits.some((word) => sharp.has(word))) return null;
  // 중심 칸을 **채우는가**. 중심 낱말이 둘 이상이면 제목에 **둘이** 있어야 한다 — 하나만 맞으면 반만 채운 것이다.
  // 「중력 가속도」 과제에 '가속' 하나로 「웨어러블 로봇을 통한 인체 운동의 가속」이 붙었다.
  // 중심 낱말이 없으면(과제 제목도 키워드도 비었으면) 아무것도 안 붙인다.
  const center = query.center || [];
  const inCenter = hits.filter((one) => center.some((word) => one.includes(word) || word.includes(one)));
  if (!center.length || inCenter.length < Math.min(2, center.length)) return null;
  // **GPT 꼬리표가 있으면, 이 보고서의 단원과 같을 때만.** 낱말은 맞아도 뜻이 다른 논문을 여기서 거른다 —
  // 해수면 온도 보고서에 「학생들의 기후변화 개념 이해(교육학)」, 판 구조에 「비만 쥐의 지질 대사」.
  // 보고서의 단원을 모르면(query.units 가 비면) 꼬리표로는 막지 않는다.
  const tagged = Array.isArray(paper.units);
  if (tagged && query.units?.length && !unitsMeet(paper.units, query.units)) return null;
  const has = (list) => list.find((word) => hits.some((one) => one.includes(word)));
  const change = has(query.slots?.change || []);
  const measure = has(query.slots?.measure || []);
  // 중심 학문 밖(주변 분야) 논문은 **뒤로 민다**(점수에서 2 덜 받는다). 관문으로 막아 보기도 했다 —
  // 정확도는 거의 그대로(65%→67%)인데 붙는 비율이 12%→8%로 떨어지고 화학·생명과학이 0~2%가 됐다.
  // 한글 제목 화학 논문 427편 가운데 '자연과학 > 화학'은 73편뿐이라서다. 그래서 순서만 바꾼다.
  const shaped = SHAPE[query.route]?.test(title) || false;
  const ease = { e: 2, m: 1 }[paper.level] || 0;   // 고등학생이 읽기 쉬운 논문이 앞
  const score = hits.length * 3 + (change && measure ? 6 : change || measure ? 2 : 0) + (shaped ? 2 : 0) + (paper.core === 0 ? 0 : 2)
    + (tagged && query.units?.length ? 3 : 0) + ease;
  return { hits: hits.slice(0, 3), change: change || '', measure: measure || '', shaped, score, unit: tagged };
}

// 받침이 있으면 '과·을', 없으면 '와·를'. 한글이 아니면(DNA, pH) 받침 없는 쪽으로 읽는다.
const batchim = (word) => {
  const code = String(word || '').trim().slice(-1).charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};
export const josa = (word, withFinal, without) => `${word}${batchim(word) ? withFinal : without}`;

// ⑤ 안내서 한 줄. 무엇을 **확인해서 어디에** 쓰는지를 말한다. 논문에 무엇이 있다고 단정하지 않는다.
export function guideLine(fit, route) {
  if (!fit) return '';
  const [a, b] = fit.hits;
  const pair = b ? `「${josa(a, '」과', '」와')} 「${b}」` : `「${a}」`;
  if (route === 'change') {
    const how = fit.change && fit.measure
      ? `${josa(fit.change, '을', '를')} 어떤 범위로 바꾸고 ${josa(fit.measure, '을', '를')} 어떻게 쟀는지`
      : '무엇을 바꾸고 무엇을 쟀는지';
    return `제목으로 보아 ${pair}를 함께 다룬 연구예요. 초록에서 ${how} 확인해, 내 탐구의 조건과 측정 방법을 정하는 근거로 쓰세요.`;
  }
  if (route === 'claim') {
    return `제목으로 보아 ${pair}를 함께 다룬 연구예요. 초록에서 어떤 근거로 어떤 결론을 냈는지 확인해, 내 주장의 근거나 반론으로 쓰세요.`;
  }
  return `제목으로 보아 ${pair}를 함께 다룬 연구예요. 초록에서 그 원리를 어떤 대상으로 설명했는지 확인해, 내 설명을 받치는 근거로 쓰세요.`;
}

// 단원이 같은가. 「과목::단원」이 같거나, 과목이 달라도 단원 이름이 같으면 같다(통합과학2 와 화학에 같은 단원이 있다).
const unitName = (key) => String(key || '').split('::').pop().replace(/\s+/g, '');
export function unitsMeet(paperUnits, reportUnits) {
  const want = new Set(reportUnits.map((one) => String(one).replace(/\s+/g, '')));
  const names = new Set(reportUnits.map(unitName));
  return paperUnits.some((one) => want.has(String(one).replace(/\s+/g, '')) || names.has(unitName(one)));
}

// 과목 묶음 한 줄: [제목, 저자, 연도, 학술지, 권, 호, 쪽, 중심 학문(1/0), 단원 번호들(없으면 null), 난이도(e/m/h)]
// table 은 묶음의 units(단원 이름 목록)다 — 줄마다 이름을 다시 적지 않으려고 번호로 싣는다.
export function unpack(row, table = []) {
  const [title, who, year, journal, volume, issue, pages, core, unitIdx, level] = row;
  return {
    title: clean(title, 240), who: clean(who, 80), year: clean(year, 4), journal: clean(journal, 80),
    volume: clean(volume, 10), issue: clean(issue, 10), pages: clean(pages, 20),
    core: core === 0 ? 0 : 1,
    units: Array.isArray(unitIdx) ? unitIdx.map((at) => table[at]).filter(Boolean) : null,
    level: clean(level, 1),
  };
}

// 한데 모은 것. rows 는 과목 논문 묶음이다.
// 같은 첫 저자의 같은 해 논문은 한 편만 — 한 연구실의 연작이 두 칸을 다 차지하지 않게.
export const SHARP_SHARE = 0.02;   // 과목 논문의 2% 이하에 나오는 말이 '드문 말'이다
export function routePapers(rows, text, mode, { limit = 2, common = [], subject = '', anchor = '', units = [], table = [] } = {}) {
  const query = paperQuery(text, mode, { common, subject, anchor });
  query.units = (Array.isArray(units) ? units : []).filter(Boolean);
  if (query.words.length < 2) return { query, picked: [] };
  const papers = (Array.isArray(rows) ? rows : []).map((row) => (Array.isArray(row) ? unpack(row, table) : row));
  const views = papers.map((paper) => titleView(clean(paper.title, 240)));
  // 이 과목 안에서 낱말마다 몇 편에 나오는가
  const cap = Math.max(20, Math.round(papers.length * SHARP_SHARE));
  const sharp = new Set(query.words.filter((word) => views.reduce((n, view) => n + (seen(view, word) ? 1 : 0), 0) <= cap));
  query.sharp = [...sharp];
  const scored = [];
  papers.forEach((paper) => {
    const fit = fitPaper(paper, query, sharp);
    if (fit) scored.push({ paper, fit });
  });
  // 점수가 같으면 짧은 제목이 앞 — 고등학생이 읽기 쉬운 쪽이다.
  scored.sort((x, y) => y.fit.score - x.fit.score || x.paper.title.length - y.paper.title.length);
  const picked = [];
  const taken = new Set();
  for (const one of scored) {
    const key = `${String(one.paper.who || '').split(/\s/)[0]}::${one.paper.year}`;
    if (taken.has(key)) continue;
    taken.add(key);
    picked.push({ ...one.paper, fit: one.fit, guide: guideLine(one.fit, query.route) });
    if (picked.length >= limit) break;
  }
  return { query, picked };
}

// 참고 자료 줄. 저자 (연도). 제목. 학술지, 권(호), 쪽.
export function routedPaperLine(paper) {
  const title = clean(paper?.title, 200);
  if (!title) return '';
  const where = [
    clean(paper.journal, 80),
    paper.volume ? `${paper.volume}${paper.issue ? `(${paper.issue})` : ''}` : '',
    clean(paper.pages, 20),
  ].filter(Boolean).join(', ');
  const head = paper.who ? `${paper.who}${paper.year ? ` (${paper.year})` : ''}. ` : '';
  return `${head}${title}.${where ? ` ${where}.` : ''}`;
}

// 설계서 화면에 내려보내는 묶음. 논문 줄과 안내서 한 줄, 그리고 이 논문을 **왜** 골랐는지(길·중심 칸).
// AI에게는 가지 않는다 — 보고서가 논문에 맞춰 휘면 안 된다(사용자가 짚은 그대로다).
export function guideBlock(query, picked) {
  const papers = (Array.isArray(picked) ? picked : []).map((paper) => ({
    line: routedPaperLine(paper),
    title: clean(paper.title, 200),
    guide: clean(paper.guide, 300),
    hits: (paper.fit?.hits || []).slice(0, 3),
  })).filter((one) => one.line);
  if (!papers.length) return null;
  return {
    route: query?.route || 'explain',
    routeLabel: ROUTES[query?.route]?.label || ROUTES.explain.label,
    center: (query?.center || []).slice(0, 4),
    papers,
  };
}

// 최종 보고서 참고 자료로 넘기는 모양. references_v1 의 indexPaperLine 이 읽는 이름으로 바꾼다.
export function citationRow(paper) {
  const [from, to] = String(paper?.pages || '').split('-');
  return {
    title: clean(paper?.title, 200), author: clean(paper?.who, 80), with: '', year: clean(paper?.year, 4),
    journal: clean(paper?.journal, 80), volume: clean(paper?.volume, 10), issue: clean(paper?.issue, 10),
    from: clean(from, 10), to: clean(to, 10),
  };
}

// 과목 → 묶음 파일 이름. 과목 이름에 공백이 있어 밑줄로 바꾼다. 한글은 주소에서 인코딩한다.
export function shardFile(subject) {
  const name = clean(subject, 40).replace(/\s+/g, '_');
  return name ? `paper-route/${name}.v1.json` : '';
}
