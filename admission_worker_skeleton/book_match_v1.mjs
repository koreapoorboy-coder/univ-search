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
export function scoreBook(book, { subject = '', terms = [], conceptCounts = null } = {}, counts) {
  if (!bookSubjects(book).some((theirs) => subjectMatches(subject, theirs))) {
    return { score: 0, why: [], onSubject: false };
  }
  const theirWords = new Set(bookTags(book).flatMap(words));
  const mySpread = conceptCounts ? conceptCounts.get(norm(subject)) : null;
  const why = [];
  let score = SUBJECT_POINT;
  const used = new Set();
  for (const term of terms) {
    for (const word of words(term)) {
      // 과목 이름과 같은 낱말은 안 친다. 이미 과목 문턱에서 셌고, 그 말로 걸린 추천은 아무 말도 안 한 것이다.
      if (used.has(word) || !theirWords.has(word) || norm(word) === norm(subject)) continue;
      // 이 과목의 개념 여러 곳에 나오는 말로는 못 걸린다. 어느 개념인지를 못 가리키는 말이다.
      if (mySpread && (mySpread.get(word) || 0) > CONCEPT_SPREAD) continue;
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
  return { score, why, onSubject: true };
}

// 이 보고서에 권할 책. 없으면 빈 배열이 정상이다.
export function matchBooks(books, input = {}, limit = 3, counts = null, conceptCounts = null) {
  const subject = clean(input.subject, 40);
  if (!wantsBooks(subject)) return [];
  const list = Array.isArray(books) ? books : Object.values(books || {});
  const table = counts || buildWordCounts(list);
  // 개념이 먼저다 — 이 보고서가 선 자리를 가장 좁게 가리킨다.
  // .map(clean) 은 쓰지 않는다 — map이 두 번째 인자로 인덱스를 넘겨서 글자 수 제한이 되어 버린다.
  // 이 실수를 이 저장소에서 세 번째로 했다.
  const terms = [input.concept, input.keyword, input.axisTitle].map((value) => clean(value, 80)).filter(Boolean);

  const scored = [];
  for (const book of list) {
    if (!clean(book?.title)) continue;
    const { score, why } = scoreBook(book, { subject, terms, conceptCounts }, table);
    // 상대 순위가 아니라 절대 기준이다. 아무도 못 넘으면 아무도 안 나온다.
    if (score < MIN_SCORE) continue;
    scored.push({
      title: clean(book.title, 120), author: clean(book.author, 60),
      summary: clean(book.summary_short, 200), score, why,
    });
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ko'));
  return scored.slice(0, limit);
}

// 화면에 뭐라고 쓸지. "이 책으로 쓰세요"가 아니라 "이런 책이 있어요"다.
export function bookNote(found) {
  if (!found.length) return '';
  return '읽어 두면 도움이 될 책이에요. 꼭 읽어야 하는 건 아니고, 실제로 읽은 책만 2단계에서 적어 주세요.';
}
