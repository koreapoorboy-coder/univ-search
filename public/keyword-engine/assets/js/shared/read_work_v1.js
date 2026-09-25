// **읽은 작품이 무엇인지 학생에게 묻는다.** 화면과 워커가 같은 규칙을 본다.
//
// 왜 묻는가(2026-09-25 전수 측정, 국어·영어 과제 620건).
//   · 학교 안내문이 작품 이름을 말하지 않는 과제: **213건 (34.4%)**
//     「사전에 작품은 선정해 놓고 수행평가 당일에 작성」, 「한 가지 주제를 다루는 단편소설들을 읽고」
//   · 교과서를 가리키는 과제: 12건 (1.9%)
//   · 정해진 글이 필요 없는 과제: 395건 (63.7%)
//
// **출판사별 교과서를 다 모아도 1.9% 만 풀린다.** 그리고 34.4% 는 교과서를 다 모아도 못 푼다 —
// 어느 작품인지는 수업에서 정하고, 안내문에 남지 않기 때문이다. 아는 사람은 학생 한 명뿐이다.
//
// 모르는 채로 쓰면 둘 중 하나가 된다: 뜬구름 잡는 글이거나, **읽지도 않은 유명 작품을 끌어오는 것**이다.
// 뒤쪽은 선생님이 한눈에 본다. 그리고 우리는 이것을 막을 수가 없다 — 작품 이름은 맞춰 볼 자료가 없다.
// 그래서 묻는다. 한 줄이면 된다.

// **우리 과목만 묻는다.** 국어·영어가 아닌 과제에 「읽은 작품」을 물으면 고장 난 것처럼 보인다.
// 실제로 넓게 잡아 보니 전 과목 7,131건 중 1,328건이 걸렸고, 그 가운데 1,048건이 미술·음악·과학이었다
// (「그래프를 읽고」·「자료를 해석」에 걸렸다). 그래서 과목으로 먼저 자른다.
const LANG_SUBJECT = /국어|영어|문학|독서|화법|언어와 ?매체/;

// 정해진 **문학 작품**을 읽어야 하는 과제인가. 「읽고」·「해석」 같은 두루뭉술한 말로는 걸지 않는다 —
// 수학·과학 과제도 자료를 읽고 해석한다.
const NEEDS_TEXT = /작품|소설|희곡|극본|수필|시집|시를|시의|시에|문학|서평|독후|평론|비평문/;
// 글 이름이 이미 적혀 있다 — 따옴표·낫표, 또는 「제목(지은이)」 꼴.
const NAMED = /[『「《〈][^』」》〉]{2,40}[』」》〉]|["“'‘][^"”'’]{3,40}["”'’]/;
// 학생이 읽을 것을 **스스로 고르는** 과제. 도서 고르기가 이미 있으므로 따로 묻지 않는다.
const OWN = /스스로 (고른|골라|선택)|자유롭게 (고른|골라|선택)|관심 ?(있는|분야|주제)|직접 (고른|골라|선택|정한|정하여)|자신이 (고른|골라|선택)|한 학기 한 권|진로|선택한 (책|도서|작품)|원하는|주제를 정하여|주제 ?선정/;

const textOf = (input) => [input?.taskName, input?.taskDescription].filter(Boolean).join(' ');

// 물어봐야 하는가. **정해진 글을 읽는데 이름이 아무 데도 없을 때만** 묻는다.
// 쓸데없이 물으면 학생이 칸을 건너뛰는 법을 배운다.
export function needsWorkName(input) {
  if (!LANG_SUBJECT.test(String(input?.subject || ''))) return false;
  const text = textOf(input);
  if (!text.trim()) return false;
  if (!NEEDS_TEXT.test(text)) return false;
  if (NAMED.test(text)) return false;
  if (OWN.test(text)) return false;
  return true;
}

export const ASK_LABEL = '읽은 작품(글)의 이름';
export const ASK_HELP = '이 과제는 <b>정해진 작품을 읽고 쓰는 과제</b>예요. 그런데 안내문에 작품 이름이 없어요.'
  + ' 무슨 작품을 읽었는지 적어 주면 <b>그 작품으로 논문을 찾아 드리고</b>, 보고서도 그 작품 이야기로 써요.'
  + ' 비워 두면 작품 이름 없이 만들어요.';
export const ASK_PLACEHOLDER = '예) 동백꽃 (김유정) / 구운몽 / The Old Man and the Sea';

// 학생이 적은 것을 찾을 수 있는 조각으로 끊는다. 「동백꽃 (김유정)」 → ["동백꽃", "김유정"].
// 제목이 색인에 없어도 지은이로는 걸리는 일이 많다(동백꽃 0편 · 김유정 5편).
export function workParts(value) {
  const raw = String(value || '').replace(/[『「《〈』」》〉"“”'‘’]/g, ' ').trim();
  if (!raw) return [];
  const parts = raw.split(/[()[\]{}/,·、]|\s{2,}/).map((one) => one.trim()).filter(Boolean);
  const out = [];
  for (const part of parts.length ? parts : [raw]) {
    if (part.length < 2) continue;
    if (!out.includes(part)) out.push(part);
    // 「동백꽃 김유정」처럼 띄어쓰기 하나로 붙여 적는 학생이 많다. 낱말로도 끊어 둔다.
    for (const word of part.split(/\s+/)) {
      if (word.length >= 2 && !out.includes(word)) out.push(word);
    }
  }
  // 긴 것이 더 또렷하다. 「메밀꽃 필 무렵」이 「메밀꽃」보다 낫다.
  out.sort((a, b) => b.length - a.length);
  return out.slice(0, 4);
}

// 학생이 적었을 때 화면에 보여 줄 말. **적은 대로 쓴다고 알려 준다.**
export function workNotice(value) {
  const name = String(value || '').trim();
  if (!name) return '';
  return `읽은 작품을 <b>${name}</b>으로 적었어요. 보고서는 이 작품으로 씁니다.`;
}
