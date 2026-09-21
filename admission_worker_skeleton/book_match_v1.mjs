// 책 추천 — 없으면 없다고 한다.
//
// 걱정은 분명하다: 책을 붙이면 무조건 붙이려 들고, 그러면 억지로 끼워 맞춘 보고서가 된다. 그래서 이 파일은
// **몇 권을 고르는가**가 아니라 **언제 한 권도 안 고르는가**를 정하는 규칙이다.
//
// 세 가지를 지킨다.
//   · **과목이 안 맞으면 탈락이다.** 점수가 아무리 높아도, 물리 보고서에 사회 책을 얹는 것은 억지다.
//   · **상대 순위를 쓰지 않는다.** '가장 잘 맞는 3권'은 언제나 3권을 내놓는다 — 그게 억지의 구조다.
//     절대 기준을 넘긴 책만 나오고, 아무도 못 넘으면 0권이 나온다.
//   · **흔한 낱말로는 못 걸린다.** 책 태그의 '사회'는 186권에 있다. 그 말로 걸린 추천은 아무 말도 안 한
//     것과 같다. 낱말이 드물수록 점수가 크고, 너무 흔하면 0점이다.
//
// 그리고 여기서 고른 책은 **AI에게 가지 않는다.** 설계서 화면에만 보인다. 학생이 실제로 읽고 자료 카드에
// 적었을 때만 보고서에 들어간다. 프롬프트에 넣는 순간 보고서가 책 쪽으로 휘기 때문이다.

const clean = (value, max = 80) => String(value ?? '').trim().slice(0, max);
const norm = (value) => clean(value, 40).replace(/\s+/g, '').replace(/\d+$/, '');
// 끝 숫자를 남긴 이름. 「공통수학1」과 「공통수학2」는 다른 과목이다.
const tightSubject = (value) => clean(value, 40).replace(/\s+/g, '');
const words = (text) => String(text || '').split(/[^가-힣A-Za-z0-9]+/).filter((word) => word.length >= 2);

const SUBJECT_POINT = 3;
// 과목만 맞은 책은 안 나온다. **드문** 낱말이 한 번은 걸려야 한다 — 재 보니 억지는 전부 흔한 낱말로
// 걸린 것들이었다(화학 반응식에 「국화와 칼」이 "화학" 한 낱말로 붙었다).
export const MIN_SCORE = SUBJECT_POINT + 3;
// 몇 권에 나오는 낱말까지 쳐 줄 것인가. 210권 중 20권을 넘으면 그 낱말은 아무것도 가리지 못한다.
const COMMON = 20;
const RARE = 5;
// **책에 흔한 말**만 걸렀더니 **개념에 흔한 말**이 남았다. 「코스모스」가 '탐구' 하나로 내진 설계에,
// 「의사와 수의사가 만나다」가 '비교' 하나로 기본량과 단위에 붙어 있었다.
//
// 세는 자리는 **그 과목 안**이다. 과목은 이미 걸렀으므로 물어야 할 것은 "이 과목의 어느 개념인가"뿐이다.
// 전체에서 세면 '경제'가 여러 과목에 흔하다는 이유로 통합사회의 「넛지」까지 떨어진다 — 정작 통합사회
// 안에서는 '경제'가 개념을 잘 가린다. 152개 개념을 다 재서 정한 값이다.
const CONCEPT_SPREAD = 2;
// 진로는 **점수를 더할 뿐, 문턱이 아니다.** 주제가 맞는데 학과가 안 붙었다고 떨어뜨리면, 아직 진로를
// 못 정한 학생에게는 아무것도 안 나온다. 그리고 흔한 학과로는 못 가린다 — '철학과'는 80권에, '사회학과'는
// 74권에 붙어 있어서 그 말로 걸린 추천은 아무 말도 안 한 것과 같다(낱말에 쓰는 규칙과 같다).
const MAJOR_POINT = 2;
const COMMON_MAJOR = 40;

// **무엇을 하는가**를 가리키는 말로는 못 걸린다. 단, **개념 이름에 든 말은 예외다.**
//
// 실제 수행평가 1537건에 다 붙여 보고 찾았다. 남은 억지가 전부 이런 말로 걸려 있었다 —
// 「페르마의 마지막 정리」가 '문제·해결'로 정보의 알고리즘 설계에, 「아내를 모자로 착각한 남자」가
// '반응'으로 면역과 백신에, 「닥터스 씽킹」이 '사례'로 선조들의 과학 기술에 붙었다.
//
// 이 말들은 과목마다 몇 개 개념에만 나와서 앞의 규칙을 다 통과한다. 그런데 이 개념이 **무엇에 대한
// 것인지**는 하나도 안 가리킨다. 어느 탐구에나 있는 말이기 때문이다.
//
// 넓은 범주어도 같다. '물질'·'성질'·'구조'·'현상'은 과학 어느 단원에나 있다.
//
// 예외가 중요하다. 같은 '자료'·'분석'이라도 **개념 이름**에 들어 있으면 그게 주제다 — 정보의
// '자료와 정보의 분석'에서 「팩트풀니스」가 떨어지면 안 된다. 그래서 개념 이름에서 온 말은 그대로 치고,
// 축 이름과 산출물에서 온 말만 이 목록으로 거른다. 축과 산출물은 '무엇을 하는가'를 적은 자리다.
// 아예 못 쓰는 말 — **공부하는 행위**를 가리킨다. 개념 이름에 들어 있어도 마찬가지다.
// '우리 선조들의 과학 기술 발전 사례 찾기'의 '사례', '추상화와 문제 분해'의 '문제'가 그렇다.
// 이름에 있다고 주제가 되지 않는다. 그 말로 「닥터스 씽킹」과 「페르마의 마지막 정리」가 붙었다.
const NEVER_TOPIC = new Set([
  '사례', '문제', '해결', '정리', '작성', '발표', '평가', '조사', '만들기', '활용', '적용',
  '검증', '판단', '결론', '비교', '해석', '토의', '관찰', '보고서', '종류', '방식', '국어',
  // 국어는 개념 이름끼리 말이 겹쳐서 가장 어려운 자리다. '구성'은 '서사·극 갈래와 이야기 구성'의
  // 이름에 들어 있지만, 그 말로 「유시민의 글쓰기 특강」이 소설 구조 분석에 붙었다.
  '구성',
  // '성질'도 마찬가지다. '분자의 구조와 성질'(극성·결합각)에 주기율표 책 세 권이 그 말로 붙었다.
  // 원소의 주기적 성질에는 '원소의·주기적'가 남으므로 손해가 없다.
  '성질',
  // 전수로 읽다가 더 나온 것들.
  //   '작용' — 신약 개발 책 두 권이 '생태계의 물질 순환과 상호 작용'에 그 말로 붙었다
  //   '전달' — 「소리의 과학」이 '신경 자극 전도와 전달'에 붙었다. 소리 전달과 신경 전달은 다르다
  //   '증거' — 「신기관」이 '진화와 생물 다양성'에 붙었다. 진화의 증거를 다루는 책이 아니다
  '작용', '전달', '증거',
  // '발견' — 주기율표 책 둘이 '과학사에서 동시 발견으로 이룬 과학 발전 추적하기'에 그 말로 붙었다.
  '발견',
  // '발전' — 「사피엔스」가 통합과학2 '발전과 에너지원'(발전 방식 비교)에 그 말로 붙었다.
  //          여기서 발전은 electricity generation 인데 책은 인류의 progress 를 말한다.
  '발전',
  // '관점' — '통합적 관점과 행복'(삶의 질)에 과학철학·역사학 책 셋이 그 말로 붙었다.
  //          사회를 보는 관점과 학문의 관점은 다른 말이다.
  '관점',
]);

// 개념 이름에 들어 있을 때만 쓸 수 있는 말. 그 자체가 공부 대상이 되기도 한다 —
// 정보의 '자료와 정보의 분석'에서는 '자료'와 '분석'이 바로 주제다. 축 이름과 산출물에서 왔을 때는
// '무엇을 하는가'를 적은 말이라 안 친다.
const NOT_TOPIC = new Set([
  '자료', '분석', '설계', '수집', '탐구', '언어', '이론', '지식',
  // '반응'은 개념 이름에 있을 때만 쓴다. 산출물에 깔려 있어서 효소 책과 뇌 사례집이 '면역과 백신'에
  // 붙었다 — 면역 반응은 효소 반응도 신경 반응도 아니다.
  // '정보'도 같다. 「치과의사가 말하는 치과의사」가 '유전 정보 흐름'으로 유전자 단원에 붙었다.
  '반응', '정보',
  // '과학사'는 개념 이름에 있을 때만 쓴다. '우리 선조들의 과학 기술 발전 사례 찾기'(전통 기술)에
  // 서양 과학사 책 세 권이 그 말로 붙었다. '과학사에서 동시 발견…' 단원에는 이름에 있으므로 남는다.
  '과학사',
  // '분자'는 개념 이름에 있을 때만. 통합과학1 '자연 세계의 시간과 공간'(크기·측정 한계) 산출물에
  // "물 분자·수소 원자처럼"이 있어서 화학 교양서 네 권이 그 말로 붙었다.
  '분자',
  // '예측'은 개념 이름에 있을 때만. 통합과학2 '빅데이터 활용'과 통합과학1 '규칙성 발견과 주기율표'에
  // 주기율표 책과 혼돈 이론 책이 그 말로 섞여 붙었다.
  '예측',
  // '충돌'은 개념 이름에 있을 때만. '인권 보장과 헌법' 산출물의 "기본권 충돌"로 「마의 산」이 붙었다.
  '충돌',
  // 국어 활동어. 축 이름과 산출물에 깔려 있어서 아무 국어 책이나 아무 개념에 붙는다 —
  // 「대통령의 글쓰기」가 '글쓰기'로 교술 갈래에, 「마의 산」이 '성찰'로 교술 갈래에,
  // 「철학적 탐구」가 '소통'으로 화법 단원에 붙었다. 개념 이름에 있을 때는 그대로 쓴다.
  '글쓰기', '성찰', '소통', '문장', '토론',
]);

// 막지 **않은** 것들이 더 중요하다. 낱말마다 무엇이 사라지는지 하나씩 재고 정했다.
//   · '반응'  — 막으면 「세상은 온통 화학이야」가 산화와 환원에서 떨어진다
//   · '현상'  — 막으면 「생명의 도약」이 생명 시스템에서 떨어진다
//   · '과학사' — 막으면 「부분과 전체」가 과학사 단원에서 떨어진다
//   · '데이터' — 막으면 「팩트풀니스」가 자료와 정보의 분석에서 떨어진다. 재 보니 이 말로 걸린 것은
//              둘뿐이고 둘 다 말이 됐다.
// '구조'·'변화'·'시스템'은 여기 없다. 이미 책에 흔해서(21권) 0점이라 따로 막을 필요가 없다.

// 수학 계산 단원에는 책을 안 붙인다.
//
// 개념 152개를 전부 재 본 결과다. 이차방정식·행렬·순열 같은 단원은 **주제가 없다**. 책 태그는 주제어
// (그래프·데이터·변화)뿐이라, 계산 단원에는 아무 책이나 걸린다 — 이차함수에 「팩트풀니스」가 8점으로
// 붙었다. 점수를 올려도 안 걸러진다. 수학 보고서의 참고 자료는 책이 아니라 통계·공공데이터가 맞다.
const NO_BOOKS = /^(공통수학|미적분|기하|대수|확률과 통계|수학)/;
export function wantsBooks(subject) {
  const name = clean(subject, 40);
  return Boolean(name) && !NO_BOOKS.test(name);
}

function subjectMatches(mine, theirs) {
  const a = norm(mine);
  const b = norm(theirs);
  if (!a || !b || a.length < 2 || b.length < 2) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

const bookSubjects = (book) => [...(book?.linked_subjects || []), ...(book?.related_subjects_highschool || [])].filter(Boolean);
const bookTags = (book) => [
  ...(book?.connectable_concepts || []), ...(book?.core_keywords || []),
  ...(book?.fit_keywords || []), book?.broad_theme,
].filter(Boolean);

const bookMajors = (book) => [
  ...(book?.majors || []), ...(book?.linked_majors || []), ...(book?.related_majors || []),
].filter(Boolean);

// 학과가 몇 권에 붙어 있는지 세어 둔다. 낱말과 같은 이유다.
export function buildMajorCounts(books) {
  const counts = new Map();
  for (const book of Array.isArray(books) ? books : Object.values(books || {})) {
    for (const major of new Set(bookMajors(book).map(norm))) counts.set(major, (counts.get(major) || 0) + 1);
  }
  return counts;
}

// 이 책이 **어느 쪽 책인가.** 흔한 학과는 뺀다 — 철학과 80권으로는 아무 방향도 안 가리킨다.
//
// 진로를 아직 안 정한 학생에게 이게 제일 쓸모 있다. 예전에는 진로를 적은 학생에게만 보여 줬는데,
// 정작 필요한 쪽에 가려 놓은 꼴이었다.
export function bookDirection(book, majorCounts, limit = 3) {
  const out = [];
  for (const theirs of bookMajors(book)) {
    const mine = norm(theirs);
    if (!mine || mine.length < 2) continue;
    if (majorCounts && (majorCounts.get(mine) || 0) > COMMON_MAJOR) continue;
    const name = clean(theirs, 30);
    if (name && !out.includes(name)) out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

// 이 책이 이 학생의 진로를 가리키는가. 가리키면 어느 학과로 가리키는지 돌려준다.
export function majorHit(book, major, majorCounts) {
  const want = norm(major);
  if (!want || want.length < 2) return '';
  for (const theirs of bookMajors(book)) {
    const mine = norm(theirs);
    if (!mine || mine.length < 2) continue;
    if (majorCounts && (majorCounts.get(mine) || 0) > COMMON_MAJOR) continue;
    if (mine === want || mine.startsWith(want) || want.startsWith(mine)) return clean(theirs, 30);
  }
  return '';
}

// 낱말이 몇 권에 나오는지 세어 둔다. 한 번 만들어 두고 계속 쓴다.
export function buildWordCounts(books) {
  const counts = new Map();
  for (const book of Array.isArray(books) ? books : Object.values(books || {})) {
    const bag = new Set(bookTags(book).flatMap(words));
    for (const word of bag) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return counts;
}

// 과목마다, 낱말 하나가 그 과목의 개념 몇 곳에 나오는지 세어 둔다. 축 인덱스에서 그대로 나온다.
export function buildConceptCounts(axisIndex) {
  const bySubject = new Map();
  const seen = new Set();
  for (const axis of Object.values(axisIndex?.axes || {})) {
    const key = `${axis.subject}::${axis.concept}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const at = bySubject.get(norm(axis.subject)) || new Map();
    const bag = new Set([axis.concept, String(axis.output || '').split(/[,、·]/)[0], axis.title].flatMap(words));
    for (const word of bag) at.set(word, (at.get(word) || 0) + 1);
    bySubject.set(norm(axis.subject), at);
  }
  return bySubject;
}

// 드문 낱말일수록 크게 친다. 흔한 낱말은 0점 — 걸려도 아무 말을 안 한 것이다.
function wordPoint(word, counts) {
  const seen = counts.get(word) || 0;
  if (!seen || seen > COMMON) return 0;
  return seen <= RARE ? 3 : 2;
}

// 한 권을 이 보고서에 대 본다. 왜 걸렸는지를 함께 돌려준다 — 이유를 못 대는 추천은 억지와 구별되지 않는다.
export function scoreBook(book, { subject = '', terms = [], conceptCounts = null, major = '', majorCounts = null } = {}, counts) {
  if (!bookSubjects(book).some((theirs) => subjectMatches(subject, theirs))) {
    return { score: 0, why: [], onSubject: false };
  }
  // 우리가 넣은 책의 **연결 개념 이름**은 그 개념에만 쓴다.
  //
  // 개념 이름을 우리 체계 그대로 적어 두었기 때문에, 그 낱말이 이웃 개념으로 새면 순전한 잡음이다 —
  // 「지구 이야기」에 적은 '지구 탄생과 시스템 진화'가 '진화' 한 낱말로 '별의 특성과 진화'까지
  // 끌고 갔다. 광물과 판의 책이 별의 일생 보고서에 붙는 것이다.
  // 옛 210권은 개념 체계가 달라(국어::서사와 인물 이해) 이 규칙을 적용하지 않는다.
  const mine = norm(terms.find((one) => one && one.topic)?.text || '');
  const tags = book?.own
    ? [
      ...(book.connectable_concepts || []).filter((one) => norm(one) === mine),
      ...(book.core_keywords || []), ...(book.fit_keywords || []), book.broad_theme,
    ].filter(Boolean)
    : bookTags(book);
  const theirWords = new Set(tags.flatMap(words));
  const mySpread = conceptCounts ? conceptCounts.get(norm(subject)) : null;
  const why = [];
  let score = SUBJECT_POINT;
  const used = new Set();
  for (const term of terms) {
    // 옛 부름꼴도 받는다 — 시험과 도구가 문자열 배열을 그대로 넘긴다.
    const text = typeof term === 'string' ? term : term.text;
    const isTopic = typeof term === 'string' ? false : Boolean(term.topic);
    for (const word of words(text)) {
      // 과목 이름과 같은 낱말은 안 친다. 이미 과목 문턱에서 셌고, 그 말로 걸린 추천은 아무 말도 안 한 것이다.
      if (used.has(word) || !theirWords.has(word) || norm(word) === norm(subject)) continue;
      // 이 과목의 개념 여러 곳에 나오는 말로는 못 걸린다. 어느 개념인지를 못 가리키는 말이다.
      if (mySpread && (mySpread.get(word) || 0) > CONCEPT_SPREAD) continue;
      // 공부하는 행위를 가리키는 말은 개념 이름에 있어도 못 쓴다.
      if (NEVER_TOPIC.has(word)) continue;
      // 그 밖의 넓은 말은 **개념 이름에 있을 때만** 쓴다. 축과 산출물에서 온 것은 안 친다.
      if (!isTopic && NOT_TOPIC.has(word)) continue;
      const point = wordPoint(word, counts);
      if (!point) continue;
      used.add(word);
      score += point;
      why.push(word);
      // 한 책에서 세 낱말까지만 친다. 더 세면 태그를 많이 단 책이 늘 이긴다.
      if (used.size >= 3) break;
    }
    if (used.size >= 3) break;
  }
  // 진로는 마지막에 더한다. 주제로 문턱을 넘은 책들 사이의 **순서**를 정하는 것이지, 넘게 해 주는 것이 아니다.
  const forMajor = majorHit(book, major, majorCounts);
  if (forMajor && score >= MIN_SCORE) score += MAJOR_POINT;
  return { score, why, onSubject: true, forMajor };
}

// 개념이 없을 때 **과제 문구에서 개념을 찾는다.**
//
// 실제 화면에는 학생이 교과 개념을 고르는 단계가 없다. selectedConcept 가 빈칸으로 오고, 축은
// 다른 과목으로 잡힐 수 있다(화학 과제에 통합사회1·미적분1 축이 잡혔다). 그러면 책을 못 고른다.
//
// 그래서 그 과목의 개념 목록과 **과제 문구를 맞춰 본다**. 겹치는 낱말이 가장 많은 개념이 그 과제가
// 선 자리다. 실제 수행평가 7131건에 붙여 보고 고른 방법이다.
//
// 겹치는 낱말이 하나도 없으면 고르지 않는다 — 아무 개념이나 집으면 아무 책이나 붙는다.
// 운영 테스트(2026-09-19): 「식초의 아세트산을 적정해 산도와 비교」 과제가 「화학 반응과 열의 출입」·「물질의 양과
// 화학 반응식」으로 잡혔다. 낱말이 글자 그대로 같아야만 맞았고(식초에 ≠ 식초, 적정하여 ≠ 적정), 과목 이름 '화학'이
// 화학 단원 어디에나 걸렸으며, 단원마다 적어 둔 핵심 낱말(keyword_signals: 중화 적정·지시약…)은 보지 않았다.
const UNIT_JOSA = /(으로|에서|에게|하여|하고|한다|했다|하는|하기|의|에|와|과|을|를|은|는|이|가|도|로)$/;
// 조사를 떼면 한 글자만 남는 말(물의·빛의)은 버린다 — 한 글자로는 단원을 못 가르고 엉뚱한 단원에 걸렸다.
const unitStem = (word) => { const cut = word.replace(UNIT_JOSA, ''); return cut.length >= 2 ? cut : (cut === word ? word : ''); };
const unitWords = (text) => words(text).map(unitStem).filter(Boolean);
// 어느 단원에나 붙는 말 — 이것으로는 단원을 가를 수 없다.
const UNIT_NOISE = new Set(['수행평가', '보고서', '탐구', '실험', '작성', '활동', '평가', '비교', '분석', '정리', '조사', '이해', '설명', '관계',
  '있는', '학습', '경우', '용어', '현상', '이용한', '주제', '결과', '사고력', '안전', '제작', '과정', '방법', '수행', '자유', '심화', '내용', '개념', '문제', '해결', '특성']);
// 여러 단원에 두루 나오는 낱말(발표·자료·데이터·설계·해석…)도 단원을 못 가른다. 전수 검사(2026-09-19)에서
// 「발표」 한 낱말로 「생명과학의 이해」가, 「데이터 분석」으로 「해수의 성질」이 잡혔다. 그래서 전체 단원 가운데
// 몇 곳에 나오는지 세어, 너무 흔한 낱말은 빼고 드문 낱말일수록 무겁게 센다.
// **탐구 방법 낱말.** 무엇을 탐구하는지가 아니라 어떻게 탐구하는지를 말하는 말이다. 이 말만 걸렸을 때는
// 단원을 정하지 않는다 — 「빛의 스펙트럼 관찰하기」가 「관찰」 하나로 과학탐구실험1 「문제 인식과 탐구 질문
// 설정」에 걸렸다(2026-09-21). 단원 이름에 이 말이 들어 있는 경우(「과학의 측정과 우리 사회」)는 이름의
// 다른 낱말로 점수를 받으므로 막히지 않는다.
const UNIT_METHOD = new Set(['관찰', '측정', '기록', '발표', '질문', '계획', '설계', '해석', '추론', '검증', '확인',
  '토론', '토의', '요약', '선정', '선택', '수집', '처리', '제시', '활용', '연결', '적용', '완성', '구체화',
  '배경지식', '궁금증', '일상', '생활', '사례', '범위', '인식', '설정', '작성', '제작', '산출', '발견']);
const UNIT_COMMON = 10;
// 드문 낱말 하나(약 4점)는 걸려야 단원을 정한다. 못 미치면 고르지 않는다.
const UNIT_MIN = 4;
const unitBagCache = new WeakMap();
function unitBags(axisIndex) {
  if (!axisIndex || typeof axisIndex !== 'object') return { bags: new Map(), spread: new Map(), total: 0 };
  if (unitBagCache.has(axisIndex)) return unitBagCache.get(axisIndex);
  const byAxis = new Map();
  for (const [term, list] of Object.entries(axisIndex.keywords || {})) {
    for (const entry of Array.isArray(list) ? list : []) {
      const id = Array.isArray(entry) ? entry[0] : entry?.axis;
      if (!id) continue;
      if (!byAxis.has(id)) byAxis.set(id, new Set());
      for (const word of unitWords(term)) byAxis.get(id).add(word);
    }
  }
  const bags = new Map();   // 과목 → (단원 → 낱말들)
  // **끝 숫자를 남긴 이름으로 담는다.** norm 은 끝 숫자를 지우므로 「공통수학1」과 「공통수학2」가 한
  // 덩어리가 됐고, 공통수학2 과제에 공통수학1 단원이 잡혔다(새 시험 U7 이 잡았다). 공통국어·통합과학·
  // 통합사회·과학탐구실험도 같은 짝이다. 숫자를 지운 이름은 loose 에 따로 두어, 정확한 이름으로 못
  // 찾을 때만 예전처럼 쓴다.
  const loose = new Map();
  for (const [id, axis] of Object.entries(axisIndex.axes || {})) {
    const subject = tightSubject(axis.subject);
    if (!loose.has(norm(axis.subject))) loose.set(norm(axis.subject), new Set());
    loose.get(norm(axis.subject)).add(subject);
    if (!bags.has(subject)) bags.set(subject, new Map());
    const mine = bags.get(subject);
    const bag = mine.get(axis.concept) || new Set();
    // 단원 이름과 핵심 낱말만 넣는다. 축 제목·결과물 글(「…을 이용한 사례 해석 카드」)은 활동 말투라 엉뚱한 단원에 걸렸다.
    for (const word of [...unitWords(axis.concept), ...(byAxis.get(id) || [])]) bag.add(word);
    mine.set(axis.concept, bag);
  }
  const spread = new Map();
  let total = 0;
  for (const mine of bags.values()) for (const bag of mine.values()) { total++; for (const word of bag) spread.set(word, (spread.get(word) || 0) + 1); }
  const out = { bags, spread, total, loose };
  unitBagCache.set(axisIndex, out);
  return out;
}

export function inferConcept(subject, text, axisIndex) {
  const want = norm(subject);
  if (!want) return '';
  const own = new Set([want, want.replace(/\d+$/, ''), ...unitWords(subject)]);
  const mine = new Set(unitWords(text).filter((word) => !own.has(word) && !UNIT_NOISE.has(word)));
  if (!mine.size) return '';
  const { bags, spread, total, loose } = unitBags(axisIndex);
  // 정확한 과목 이름으로 먼저 찾는다. 없으면(「물리학Ⅰ」처럼 다르게 적힌 이름) 숫자를 뗀 이름으로 넓힌다.
  const exact = tightSubject(subject);
  const pool = bags.has(exact)
    ? [...(bags.get(exact) || [])]
    : [...(loose.get(want) || [])].flatMap((name) => [...(bags.get(name) || [])]);
  let best = null;
  // 걸린 단원이 **그 과목 안에서 몇 곳인가**. 하나뿐이면 점수가 낮아도 받는다(아래).
  let touched = 0;
  for (const [concept, bag] of pool) {
    let hit = 0;
    let real = 0;   // 탐구 방법 낱말이 아닌, 무엇을 탐구하는지 말하는 낱말
    for (const word of mine) {
      const many = spread.get(word) || 0;
      if (!bag.has(word) || many > UNIT_COMMON) continue;
      hit += Math.log((total + 1) / many);
      if (!UNIT_METHOD.has(word)) real += 1;
    }
    if (hit) touched += 1;
    if (hit && (!best || hit > best.hit)) best = { concept, hit, real };
  }
  if (!best) return '';
  // **과목 안에서 유일하면 받는다.**
  //
  // 점수는 전체 187개 단원 칸을 통틀어 「몇 곳에 나오는가」로 낸다. 그래서 과목 안에서는 아주 분명한
  // 낱말이 버려졌다 — 「스펙트럼」은 전체 5곳에 있어 3.63점(문턱 4점 미달)이지만, **물리 7단원 중에는
  // 한 곳뿐**이다. 물리 학생에게 이보다 분명한 낱말이 없다. 전수 검사 2,473건 중 1,001건(40%)이
  // 이렇게 주제가 제목에 적혀 있는데도 단원을 못 정했다(2026-09-21).
  //
  // 문턱을 그냥 낮추지는 않는다 — 그러면 「발표」 하나로 「생명과학의 이해」가, 「데이터 분석」으로
  // 「해수의 성질」이 잡히던 예전 실패가 돌아온다(2026-09-19). 흔한 낱말은 위에서 이미 점수를 못 받으므로
  // (UNIT_COMMON), 여기 걸리는 것은 **드문 낱말이 그 과목 단원 하나에만 있는 경우**뿐이다.
  if (touched === 1 && best.real > 0) return best.concept;
  return best.hit >= UNIT_MIN ? best.concept : '';
}

// 이 개념에 **실제로 쓸 수 있는 문장**을 앞으로 보낸다.
//
// 여기가 보고서가 틀어지는 자리였다. 책은 개념으로 고르는데, 보고서에 넘기는 문장은 그냥 앞에서
// 잘랐다 — 지구과학 '지구의 기후 변화'에 「대멸종 연대기」가 붙는 것은 맞는데, 넘어가는 문장은
// "각 대멸종의 원인을 지층에 남은 화학 흔적으로 추적한다"였다. 좋은 책이 엉뚱한 문장을 들고 갔다.
//
// 낱말이 **같은지가 아니라 닿는지**를 본다 — 개념은 '효소와 대사 반응'이라 쓰고 책은 '효소가
// 반응의 속도를…'이라 쓴다. 조사만 다르다.
function sortPoints(points, terms) {
  const aim = new Set();
  for (const term of terms) {
    const text = typeof term === 'string' ? term : term.text;
    for (const word of words(text)) if (norm(word) !== '') aim.add(word);
  }
  const touches = (line) => words(line).some((word) => {
    for (const one of aim) {
      if (one.length < 2) continue;
      if (word === one || word.includes(one) || one.includes(word)) return true;
    }
    return false;
  });
  const hit = [];
  const rest = [];
  for (const line of points) (touches(line) ? hit : rest).push(line);
  // 닿는 문장이 하나도 없으면 원래 순서대로 둔다. 없는 것을 지어내지 않는다.
  return { ordered: [...hit, ...rest], onConcept: hit.length };
}

// 이 보고서에 권할 책. 없으면 빈 배열이 정상이다.
export function matchBooks(books, input = {}, limit = 3, counts = null, conceptCounts = null, majorCounts = null) {
  const subject = clean(input.subject, 40);
  if (!wantsBooks(subject)) return [];
  const list = Array.isArray(books) ? books : Object.values(books || {});
  const table = counts || buildWordCounts(list);
  // 개념이 먼저다 — 이 보고서가 선 자리를 가장 좁게 가리킨다.
  // .map(clean) 은 쓰지 않는다 — map이 두 번째 인자로 인덱스를 넘겨서 글자 수 제한이 되어 버린다.
  // 이 실수를 이 저장소에서 세 번째로 했다.
  // 개념 이름은 **주제**고, 축 이름과 산출물은 **하는 일**이다. 둘을 갈라서 넘긴다.
  const terms = [
    { text: clean(input.concept, 80), topic: true },
    { text: clean(input.keyword, 80) },
    { text: clean(input.axisTitle, 80) },
  ].filter((one) => one.text);

  const scored = [];
  for (const book of list) {
    if (!clean(book?.title)) continue;
    const { score, why, forMajor } = scoreBook(book, {
      subject, terms, conceptCounts, major: clean(input.major, 40), majorCounts,
    }, table);
    // 상대 순위가 아니라 절대 기준이다. 아무도 못 넘으면 아무도 안 나온다.
    if (score < MIN_SCORE) continue;
    const pointsFor = sortPoints(book.points || book.book_content_points || [], terms);
    scored.push({
      title: clean(book.title, 120), author: clean(book.author, 60),
      summary: clean(book.summary_short, 200) || clean(book.summary, 200), score, why, forMajor,
      // 진로를 안 적은 학생에게도 "이 책은 어느 쪽인지"는 보여 준다.
      majors: bookDirection(book, majorCounts),
      // 학생이 읽을 시간이 없다. 이 책이 무엇을 다루는지를 화면과 자료 카드에 그대로 쓴다.
      // **이 개념에 닿는 문장이 앞에 온다** — 자료 카드와 보고서가 그 순서를 그대로 쓰기 때문이다.
      points: pointsFor.ordered.map((one) => clean(one, 140)).filter(Boolean).slice(0, 4),
      // 이 개념에 닿는 문장이 몇 개인가. 0이면 책은 맞아도 인용할 문장이 없다는 뜻이다.
      onConcept: pointsFor.onConcept,
    });
  }
  // 점수가 같으면 **이 개념에 쓸 문장이 있는 책**이 앞이다. 학생이 위에서부터 고른다.
  scored.sort((a, b) => b.score - a.score || b.onConcept - a.onConcept || a.title.localeCompare(b.title, 'ko'));
  return scored.slice(0, limit);
}

// 화면에 뭐라고 쓸지. "이 책으로 쓰세요"가 아니라 "이런 책이 있어요"다.
export function bookNote(found) {
  if (!found.length) return '';
  return '읽어 두면 도움이 될 책이에요. 꼭 읽어야 하는 건 아니고, 실제로 읽은 책만 2단계에서 적어 주세요.';
}
