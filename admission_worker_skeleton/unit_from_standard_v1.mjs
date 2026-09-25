// **성취기준 코드로 단원을 읽어낸다.** ₩0 — 표만 본다.
//
// 국어·영어 안내문에는 단원 이름이 안 나온다. 대신 이렇게 적혀 있다:
//   [10공영1-02-02] [12영Ⅰ-01-03]
// 그래서 단원을 읽어내는 비율이 **0%** 였다(2026-09-25 실측, 과제 379건).
// 단원을 못 읽으면 논문도 뼈대도 다 어긋난다.
//
// 표는 tools/build_unit_from_standard.mjs 가 만든다. 영역 번호의 뜻은 실제 과제 기록으로 확인했다.
const clean = (value, max = 60) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// [10공영1-02-02], 10공국1-05-03, [12영Ⅰ-01-04] — 낫표는 있어도 없어도 된다.
const CODE = /\[?(1[02](?:공국|공영|영|문학)[0-9IVⅠⅡ]*)-(\d\d)-\d\d\]?/g;

// 학기 전체 성취기준을 다 적어 놓은 안내문이 있다. 그때 코드는 이 과제가 무엇인지 말해 주지 않는다.
// 영역이 셋 이상이면 나열로 본다(2026-09-25: 379건 중 28건).
const TOO_MANY_AREAS = 3;

export function standardAreas(text) {
  const found = new Map();
  for (const one of String(text ?? '').matchAll(CODE)) {
    const head = one[1].replace(/I/g, 'Ⅱ'.length ? 'Ⅰ' : 'Ⅰ');   // 영I → 영Ⅰ
    const list = found.get(one[2]) || new Set();
    list.add(head);
    found.set(one[2], list);
  }
  return found;
}

function subjectOf(head, table) {
  for (const [source, subject] of table?.subjectOf || []) {
    if (new RegExp(source).test(head)) return subject;
  }
  return '';
}

// 단원 이름을 두 글자씩 잘라 세면 「발표와 토론」이 「논설문 쓰기」 과제에 붙었다 —
// 「문단 쓰기와 에세이 구성」과 점수가 비슷해지고 순서가 뒤집혔다(2026-09-25).
// 그래서 **뜻을 담은 낱말**로 센다. 단원 이름을 조사·이음말로 끊어 낱말을 만들고,
// 과제 글에 그 낱말이 통째로 있는지 본다. 긴 낱말이 맞으면 더 세게 센다.
const SPLIT = /[·,\s]+|와 |과 |의 |및 /;
function overlap(name, text) {
  const flat = String(text ?? '').replace(/\s+/g, '');
  const words = String(name ?? '').split(SPLIT).map((one) => one.replace(/[^가-힣A-Za-z0-9]/g, ''))
    .filter((one) => one.length >= 2);
  if (!words.length) return 0;
  // **통째로 맞을 때만 센다.** 앞 두 글자에 점수를 주었더니 「영어 학술 텍스트 요약하기」가
  // 「**영어**권 문화 이해와 비교」로 갔다(2026-09-25). 조각이 맞는 것은 맞는 것이 아니다.
  //
  // 그리고 **맞은 낱말의 비율**로 센다. 글자 수로 세었더니 낱말이 많은 단원이 유리해져,
  // 「발표」가 두 번 나오는 발표 과제가 「글의 주제와 요지 파악」으로 갔다(전수 감사 2026-09-25).
  // 글에 몇 번 나오는지도 센다 — 두 번 나온 말이 그 과제의 중심이다.
  let hit = 0;
  let times = 0;
  for (const word of words) {
    if (!flat.includes(word)) continue;
    hit += 1;
    times += (flat.split(word).length - 1);
  }
  if (!hit) return 0;
  return (hit / words.length) + Math.min(times, 5) * 0.01;}

// 과제 글에서 단원을 읽어낸다. 못 읽으면 빈 문자열이다 — 억지로 고르지 않는다.
export function unitFromStandard(subject, text, table) {
  const own = clean(subject, 40);
  if (!own || !table?.byArea) return { unit: '', area: '', why: '표가 없다' };
  const areas = standardAreas(text);
  if (!areas.size) return { unit: '', area: '', why: '코드가 없다' };
  if (areas.size >= TOO_MANY_AREAS) return { unit: '', area: '', why: `영역이 ${areas.size}개 — 학기 전체 나열이다` };

  // 코드가 가리키는 과목이 이 과목과 같아야 한다. 학교가 다른 과목 코드를 함께 적기도 한다.
  const pick = [];
  for (const [number, heads] of areas) {
    const matched = [...heads].some((head) => subjectOf(head, table) === own);
    if (!matched) continue;
    const area = (table.area?.[own] || {})[number];
    if (!area) continue;
    for (const unit of (table.byArea?.[own] || {})[area] || []) pick.push({ unit, area });
  }
  if (!pick.length) return { unit: '', area: '', why: '이 과목의 영역이 아니다' };

  // 후보가 여럿이면 **과제 글과 가장 많이 겹치는** 단원을 고른다.
  // 겹치는 낱말이 하나도 없으면 표에 적은 **순서**를 따른다 — 그 영역에서 가장 흔한 단원을 앞에 적어 두었다.
  // 순서를 안 지키면 「영어 학술 텍스트 요약하기」에 「영어권 문화 이해와 비교」가 붙었다(2026-09-25).
  const scored = pick.map((one, at) => ({ ...one, at, score: overlap(one.unit, text) }));
  scored.sort((a, b) => (b.score - a.score) || (a.at - b.at));
  const pick2 = scored;
  return { unit: pick2[0].unit, area: pick2[0].area, why: '' };
}
