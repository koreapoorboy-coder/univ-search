// 참고 자료 — 학생이 열어 볼 수 있는 것만.
//
// 지금 실험 보고서의 참고 자료에는 "화학 교과서 관련 단원" 한 줄뿐이다. AI가 게을러서가 아니라, **우리가
// 물어본 적이 없어서**다: 2단계에서 자료를 적는 칸은 '문헌 읽기' 보고서에만 있고, 실험 보고서의 2단계는
// 숫자 표를 채운다. 그래서 sources가 비고, 모델은 지어내지 말라는 규칙을 지켜 제일 안전한 말을 쓴다.
//
// 이 파일이 지키는 규칙은 하나다. **학생이 실제로 열어 보지 못한 자료는 참고 자료가 아니다.** 유료 논문을
// 찾아 적어 주는 것은 지어내는 일을 자동화하는 것과 같다 — 입학사정관이 "읽어 봤어요?" 하면 바로 드러난다.
//
// 그래서 여기서 만드는 것은 딱 두 가지다:
//   · 교과서 인용 — 우리가 이미 아는 과목·단원을 정확히 적는다. 지어내는 것이 아니라 꺼내는 것이다.
//   · 학생이 적은 자료 — 제목·종류·핵심 내용·내 해석. '내 해석'은 안 읽었으면 못 쓴다.

import { datasetUrl } from './public_data_v1.mjs';
import { indexPaperLine, paperLine } from './kci_v1.mjs';
import { webLine } from './univ_web_v1.mjs';

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

// 과목 이름은 교과서 표지에 적힌 대로. '물리'가 아니라 '물리학Ⅰ'로 배우는 과목들이 있다.
const TEXTBOOK_NAME = {
  물리: '물리학Ⅰ', 화학: '화학Ⅰ', 생명과학: '생명과학Ⅰ', 지구과학: '지구과학Ⅰ',
  '물리학Ⅱ': '물리학Ⅱ', '화학Ⅱ': '화학Ⅱ',
};

export function textbookName(subject) {
  const name = clean(subject, 40);
  if (!name) return '';
  return TEXTBOOK_NAME[name] || name;
}

// 우리는 이 보고서가 어느 축에서 나왔는지 알고 있고, 축마다 과목과 단원이 붙어 있다. 그걸 그대로 적는다.
// 단원을 모르면 단원을 쓰지 않는다 — "관련 단원"은 아무것도 말하지 않으면서 뭔가 말한 척한다.
export function textbookCitation(input, axisIndex) {
  // 교과서는 **학생이 지금 하는 과목**의 것이다. 축은 이 탐구가 앞으로 어디로 가는지를 가리키므로 다른 과목일
  // 수 있다 — 실제로 생명과학 보고서에 "공통국어1 교과서"가 적혀 나왔다.
  const ownSubject = clean(input?.subject, 40);
  const subject = textbookName(ownSubject);
  if (!subject) return '';
  const axis = (input?.careerAxes || [])[0] || null;
  const fromAxis = axis?.axisId ? (axisIndex?.axes || {})[axis.axisId] : null;
  // 축의 단원은 축의 과목이 학생 과목과 같을 때만 쓴다. 다른 과목의 단원을 이 교과서 이름 뒤에 붙이면 거짓이다.
  const axisUnit = clean(fromAxis?.subject, 40) === ownSubject ? clean(fromAxis?.concept, 60) : '';
  // **이 보고서가 선 단원이 먼저다.** 축은 이 탐구가 앞으로 갈 곳이라 지금 단원과 다르다 — 운영 테스트 34(지구과학
  // 지진 과제): 축이 해양이라 참고 자료에 「지구과학Ⅰ 교과서 · 해수의 성질 단원」이 붙었다(본문은 지진파 단원이라고
  // 맞게 썼다). 워커가 이미 정한 단원(reportConcept)이 그 과목의 진짜 단원 이름이면 그것을 쓴다.
  const plain = (value) => String(value || '').replace(/\s+/g, '');
  const ownUnit = clean(input?.selectedConcept, 60);
  const isUnitName = (name) => Boolean(name) && Object.values(axisIndex?.axes || {})
    .some((one) => one.concept === name && plain(one.subject) === plain(ownSubject));
  const unit = (isUnitName(ownUnit) ? ownUnit : '') || axisUnit || ownUnit;
  // 평가 기준 문장이 개념 칸에 들어오는 일이 있다. 문장은 단원 이름이 아니다.
  const looksLikeSentence = unit.length > 30 || /(하였는가|했는가|는가[.?]?|[다요][.]?)$/.test(unit);
  return unit && !looksLikeSentence ? `${subject} 교과서 · ${unit} 단원` : `${subject} 교과서`;
}

// 학생이 적은 자료 한 장. 카드 모양은 이미 2단계 폼이 쓰는 것 그대로다 — 제목·종류·핵심 내용·내 해석.
// 새 이름을 만들면 폼과 갈라진다.
export function sourceLine(card) {
  const title = clean(card?.title, 120);
  if (!title) return '';
  const type = clean(card?.type, 30);
  const head = type ? title + ' (' + type + ')' : title;
  // 무엇을 봤는지가 아니라 거기서 무엇을 얻었는지가 요점이다. 안 읽었으면 이 줄을 못 쓴다.
  const took = clean(card?.take, 200) || clean(card?.point, 200);
  return took ? head + ' — ' + took : head;
}

// 공개 자료 한 줄. **학생이 본 자료가 아니므로 '얻은 것'을 적지 않는다.**
//
// 개념에 맞는 공공데이터를 자동으로 붙인다. 다만 학생이 안 열어 본 자료를 "여기서 이걸 알았다"처럼
// 쓰면 거짓이 된다. 그래서 무엇인지와 **어디서 볼 수 있는지**만 적는다. 선생님이 물어도 학생이
// 주소를 열어 확인할 수 있다.
export function dataLine(row) {
  const title = clean(row?.title, 120);
  if (!title) return '';
  const org = clean(row?.org, 60);
  // 주소는 자료 번호로 만든다. 공공데이터포털은 자료마다 번호로 주소가 정해져 있다.
  // 이 줄이 없으면 학생이 어디서 봤다고 말할 수 없다 — 그게 이 자료를 붙이는 조건이다.
  const url = clean(row?.url, 200) || (clean(row?.id, 40) ? datasetUrl(row.id) : '');
  return `${title}${org ? ` (${org})` : ''}${url ? ` — ${url}` : ''}`;
}

// 참고 자료 절의 몸통.
//
// 차례는 **학생이 적은 것 → 논문 → 공개 자료 → 교과서**다. 학생이 실제로 본 것이 앞이어야 한다.
// **학생이 메모 칸에 적은 자료원.** 설계서가 「자료의 출처나 이상한 점은 오른쪽 메모 칸에 적어요」라고
// 시켜 놓고, 정작 그 메모가 참고 자료에 안 들어가고 있었다(사용자 지적 2026-09-23).
//
// 운영 검사에서 학생이 「공공데이터 포털 대기오염 월별 통계, 2026-09-23 조회」라고 적었는데
// 참고 자료에는 교과서 한 줄뿐이었다. **학생이 실제로 쓴 자료가 그것인데** 빠진 것이다.
// 우리가 개념으로 찾아 둔 공개 자료는 학생이 쓴 것과 다를 수 있어 엄격하게 거르지만,
// 학생이 손으로 적은 출처는 **그 학생이 실제로 본 자료**다. 이것이 가장 확실한 자료원이다.
const SOURCE_NOTE = /출처|자료|포털|통계|조회|내려받|공공데이터|청_|공단|연구원|기상청|환경부|교육청|[0-9]{4}[-.년]/;
export function studentSourceLines(conditions) {
  const seen = new Set();
  const lines = [];
  for (const one of Array.isArray(conditions) ? conditions : []) {
    const note = clean(one?.note, 120);
    if (!note || note.length < 6 || !SOURCE_NOTE.test(note)) continue;
    const key = note.replace(/[\s\p{P}]/gu, '');
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(note);
  }
  return lines.slice(0, 2);
}

export function referencesBody({ cards = [], papers = [], web = [], datasets = [], textbook = '', fallbackBody = '', studentSources = [] } = {}) {
  const lines = [];
  // 학생이 자료 카드에 적은 것이 우리가 붙이는 논문과 **같은 논문**이면 한 줄로 합친다 — 운영 테스트에서
  // 같은 논문이 카드 줄과 서지사항 줄로 두 번 나왔다. 서지사항을 쓰고, 학생이 얻은 것을 뒤에 붙인다.
  const bare = (value) => String(value || '').replace(/[\s\p{P}\p{S}]/gu, '');
  const used = new Set();
  const sameAs = (card) => papers.find((row) => {
    const a = bare(card?.title);
    const b = bare(row?.title);
    return a.length >= 8 && b && (b.startsWith(a) || a.startsWith(b));
  });
  // 학생이 적은 자료원이 맨 앞이다 — 그 학생이 실제로 본 자료다.
  for (const note of studentSources) {
    if (note && !lines.includes(note)) lines.push(note);
  }
  for (const card of cards) {
    const paper = sameAs(card);
    let line = sourceLine(card);
    if (paper) {
      used.add(paper);
      const cite = paper?.url ? paperLine(paper) : indexPaperLine(paper);
      const took = clean(card?.take, 200) || clean(card?.point, 200);
      line = cite ? (took ? `${cite} — ${took}` : cite) : line;
    }
    if (line && !lines.includes(line)) lines.push(line);
  }
  if (!lines.length) {
    // 학생이 아무것도 안 적었으면, 모델이 쓴 줄 중 안내문이 아닌 것만 남긴다(예전 동작).
    for (const raw of String(fallbackBody || '').split('\n')) {
      const line = raw.trim();
      if (line && !/^(※|\(|\[)/.test(line)) lines.push(line);
    }
  }
  // 개념에 맞는 논문. **이 논문은 학생이 읽은 것이 아니다.**
  // 우리가 단원에 맞추어 붙인 것이고, 보고서 본문이 그것을 근거로 쓴 것도 아니다.
  // 그런데 학생이 적은 자료와 한 줄씩 섞여 있어 「인용한 자료」처럼 보였다 — 보고서 49장을
  // 읽히니 아홉 장쯤에서 「본문 어디에서도 근거로 활용되지 않는다」고 걸렸다(2026-09-24).
  //
  // 논문을 더 잘 고르는 쪽도 재 보았다. 「중심 낱말도 드물어야 한다」고 걸으니 붙는 비율이
  // 10.4% → 8.7% 로 줄었는데 **좋은 것이 떨어지고 나쁜 것이 살아남았다**(「머신러닝 탐구」 ←
  // 「머신러닝 기반 오이 생육 예측」이 떨어지고 「프로그램 작성하기」 ← 「VR 신체활동 프로그램」이
  // 남았다). 그래서 고르는 규칙은 건드리지 않고, **무엇인지 그대로 적는다.**
  const readMore = [];
  for (const row of papers) {
    if (used.has(row)) continue;   // 학생 카드 자리에서 이미 적었다 — 그건 학생이 본 자료다
    // 인덱스에서 온 줄에는 주소가 없고 저자 칸 이름이 다르다. 둘 다 받는다.
    const line = row?.url ? paperLine(row) : indexPaperLine(row);
    if (line && !lines.includes(line) && !readMore.includes(line)) readMore.push(line);
  }
  // 맨 뒤에 제목을 달아 따로 적는다. 학생이 읽은 자료와 섞이면 안 된다.
  const tail = () => (readMore.length ? ['더 읽어 볼 자료 (아직 읽지 않았어요)', ...readMore] : []);
  // 대학 연구 소개 글(웹 자료). 논문 뒤, 공개 자료 앞. 넣기 직전에 주소가 열리는 것을 확인했고
  // 접속일이 붙어 있다(univ_web_v1.mjs).
  for (const row of web) {
    const line = webLine(row);
    if (line && !lines.includes(line)) lines.push(line);
  }
  // 개념에 맞는 공개 자료. 논문 뒤, 교과서 앞이다.
  for (const row of datasets) {
    const line = dataLine(row);
    if (line && !lines.includes(line)) lines.push(line);
  }
  if (textbook) {
    // 모델은 "화학 교과서 관련 단원"처럼 뭉뚱그린 줄을 쓴다. 우리가 정확한 단원을 아는데 그 줄을 남겨 두면,
    // 아는 것을 두고 모르는 척한 줄이 보고서에 남는다. 뭉뚱그린 줄은 우리 줄로 갈아 끼운다.
    // 서지 줄(「저자 (연도). 제목.」)은 제목에 '교과서'가 들어 있어도 논문이다 — 「…통합사회 교과서의 행복 개념
    // 분석」이 뭉뚱그린 교과서 줄로 보여 지워졌다(엔진 전수 검사 2026-09-18).
    // **학생이 적은 줄은 건드리지 않는다.** 운영 테스트 34(지구과학 지진 과제): 학생이 적은 「지구과학 교과서
    // 지진파와 지구 내부 단원 (교과서) — …를 읽었다」가 뭉뚱그린 줄로 보여 통째로 지워졌고, 느낀 점에는
    // 「참고 자료는 별도로 인용하지 않았고」라는 틀린 문장이 남았다.
    const mine = new Set(cards.map((card) => sourceLine(card)).filter(Boolean));
    // 학생이 같은 교과서·단원을 이미 적었으면 우리 줄을 또 붙이지 않는다. 운영 테스트 38: 「물리학Ⅰ 교과서 힘과 운동
    // 단원 (교과서) — …」 바로 밑에 「물리학Ⅰ 교과서 · 힘과 운동 단원」이 한 번 더 나왔다.
    if ([...mine].some((line) => bare(line).includes(bare(textbook)))) return [...lines.filter((line) => mine.has(line) || !/교과서/.test(line) || line.includes('·') || /\(\d{4}\)\./.test(line)), ...tail()].join(String.fromCharCode(10));
    const vague = (line) => /교과서/.test(line) && !mine.has(line) && !line.includes('·') && !/\(\d{4}\)\./.test(line);
    const precise = lines.findIndex((line) => line === textbook);
    const kept = lines.filter((line) => !vague(line));
    // 출판사·쪽수는 **학생만 안다.** 한때 「(출판사·쪽수는 쓰는 교과서를 보고 적으세요)」를 이 줄에
    // 붙여 보았는데, 설계서 26장을 읽히니 다섯 장에서 **「템플릿 지시 문구가 그대로 남아 있다」**고
    // 걸렸다(2026-09-25). 맞는 지적이다 — 제출물 안에 우리 지시가 들어가면 서지가 모자란 것보다 나쁘다.
    // 그래서 줄은 깨끗하게 두고, 채워 달라는 말은 **제출하지 않는 설명서**에만 적는다.
    // **인용처럼 보이지 않게 무엇인지 밝힌다.** 검수는 「저자·출판사·쪽수가 없어 검증 가능한
    // 참고문헌 형식이 아니다」라고 네 장에서 걸었다(2026-09-25). 고등학교 수행평가에서
    // 「통합과학2 교과서 · 생물과 환경 단원」은 흔한 표기이고 교사도 받아 준다 — 검수가 논문
    // 기준을 들이댄 것이다. 다만 참고문헌 목록에 섞여 있으면 **모자란 서지**로 읽힌다.
    //
    // **두 번 고쳐 보고 둘 다 되돌렸다. 세 번째로 시도하지 말 것.**
    //   1차: 「(출판사·쪽수는 쓰는 교과서를 보고 적으세요)」 → 제출물에 우리 지시가 남아 다섯 장에서 걸렸다.
    //   2차: 「수업 교재 — …」 → 형식만 흔들고 얻는 것이 없었다(테스트 여섯 곳이 이 줄을 못박고 있다).
    //
    // 판단: 이 지적은 **과하다.** 검수는 논문 기준을 들이대는데, 이 글을 읽는 사람은 고등학교 교사이고
    // 「통합과학2 교과서 · 생물과 환경 단원」은 흔한 표기다. 같은 검수가 2026년을 「미래 날짜」라고도 했다.
    // 출판사·쪽수는 학생만 안다 — 그래서 **제출하지 않는 설명서**에서 채워 달라고 한 번 알린다.
    if (precise < 0) kept.push(textbook);
    return [...kept, ...tail()].join(String.fromCharCode(10));
  }
  return [...lines, ...tail()].join(String.fromCharCode(10));
}

// 2단계 폼이 자료 칸을 보여 줄지 정한다. '문헌 읽기'는 자료가 본체라 이미 카드가 있고, 나머지는 **선택**이다 —
// 실험을 하면서 아무것도 안 읽은 학생에게 억지로 적게 하면 그게 지어내기의 시작이다.
export function wantsSourceCards(collectionKind) {
  return clean(collectionKind, 20) !== 'reading';
}

// 카드 목록을 걸러 낸다. 제목이 없는 줄은 자료가 아니다.
export function normalizeSourceCards(raw, limit = 6) {
  const cards = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!clean(item?.title)) continue;
    cards.push(item);
    if (cards.length >= limit) break;
  }
  return cards;
}
