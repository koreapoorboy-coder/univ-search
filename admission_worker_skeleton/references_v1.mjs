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
  const axis = (input?.careerAxes || [])[0] || null;
  const fromAxis = axis?.axisId ? (axisIndex?.axes || {})[axis.axisId] : null;
  const subject = textbookName(fromAxis?.subject || input?.subject);
  if (!subject) return '';
  // 개념은 축에 적힌 것이 먼저다 — 학생이 고른 개념보다 이 보고서가 실제로 선 자리에 가깝다.
  const unit = clean(fromAxis?.concept || input?.selectedConcept, 60);
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

// 참고 자료 절의 몸통. 학생이 적은 것이 먼저고, 교과서는 마지막에 한 줄로 붙는다.
export function referencesBody({ cards = [], textbook = '', fallbackBody = '' } = {}) {
  const lines = [];
  for (const card of cards) {
    const line = sourceLine(card);
    if (line && !lines.includes(line)) lines.push(line);
  }
  if (!lines.length) {
    // 학생이 아무것도 안 적었으면, 모델이 쓴 줄 중 안내문이 아닌 것만 남긴다(예전 동작).
    for (const raw of String(fallbackBody || '').split('\n')) {
      const line = raw.trim();
      if (line && !/^(※|\(|\[)/.test(line)) lines.push(line);
    }
  }
  // 교과서는 있으면 늘 한 줄 붙는다. 다만 모델이 이미 교과서를 적었다면 두 번 적지 않는다.
  if (textbook && !lines.some((line) => line.includes('교과서'))) lines.push(textbook);
  return lines.join('\n');
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
