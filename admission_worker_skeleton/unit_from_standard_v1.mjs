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
// 과목 머리말을 더할 때는 **여기와 seed 의 subjectOf 를 함께** 고쳐야 한다.
const CODE = /\[?(1[02](?:공국|공영|영|문학)[0-9IVⅠⅡ]*)-(\d\d)-\d\d\]?/g;

// **과학 과목은 붙임표가 하나다.** 국어·영어는 [10공영1-02-02](과목-영역-번호) 세 토막인데,
// 과학은 [12유전01-01](과목+영역-번호) 두 토막이다. 중학교 과학도 [9과21-02] 로 같은 모양이다.
// 2026-09-26 에 「생물의 유전」을 넣으면서 알았다 — 같은 규칙으로 읽으면 영역 번호를 과목 이름의
// 일부로 먹어 버려 하나도 안 걸린다.
// 2026-09-26: 「문학」 코드도 같은 모양이다 — [12문학01-07]. 그래서 문학 코드는 **한 번도 읽히지
// 않고 있었다.** 표에 「12문학 → 공통국어1」을 적어 두었는데 그 표가 한 번도 쓰이지 않았다.
const SHORT_CODE = /\[?(1[02](?:유전|문학))(\d\d)-\d\d\]?/g;

// 학기 전체 성취기준을 다 적어 놓은 안내문이 있다. 그때 코드는 이 과제가 무엇인지 말해 주지 않는다.
// 영역이 셋 이상이면 나열로 본다(2026-09-25: 379건 중 28건).
const TOO_MANY_AREAS = 3;

export function standardAreas(text) {
  const found = new Map();
  const seen = [...String(text ?? '').matchAll(CODE), ...String(text ?? '').matchAll(SHORT_CODE)];
  for (const one of seen) {
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

// **단원 이름에 흔한 말은 세지 않는다.** 2026-09-26: 「유전자발현 과정」과 「유전자발현 조절」이
// 같은 영역에 있는데, 「세포 분화가 유전자 발현 조절 과정을 통해」라는 성취기준이 **과정** 쪽으로 갔다 —
// 글에 「과정」이 두 번 나와서다. 「과정」은 어느 단원 이름에나 붙는 말이라 단원을 가리키지 못한다.
// 여기 적은 말만 뺀다. 다 빼서 남는 말이 없으면 원래대로 둔다(단원 이름이 통째로 흔한 말일 때).
// 「이해」도 넣어 봤다가 뺐다 — 「영어권 문화 이해와 비교」의 낱말이 셋으로 줄면서 비율이 올라,
// 「영미문학 논평 쓰기」가 「문단 쓰기와 에세이 구성」에서 그쪽으로 옮겨 갔다(더 나빠졌다).
// **흔한 말을 뺄수록 좋은 것이 아니다.** 빼면 남은 말의 비중이 커져 엉뚱한 단원이 이길 수 있다.
const TOO_COMMON = new Set(['과정', '활용']);
function overlap(name, text) {
  const flat = String(text ?? '').replace(/\s+/g, '');
  const all = String(name ?? '').split(SPLIT).map((one) => one.replace(/[^가-힣A-Za-z0-9]/g, ''))
    .filter((one) => one.length >= 2);
  const kept = all.filter((one) => !TOO_COMMON.has(one));
  const words = kept.length ? kept : all;
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
  // **성취기준 코드 자체는 점수에서 뺀다.** 코드에 과목 이름이 들어 있어 단원 이름과 겹친다 —
  // [12문학01-02] 의 「문학」이 「문학·독서와 주체적 수용」에 걸려, 시 창작 과제가 그리로 갔다(2026-09-26).
  const said = String(text ?? '').replace(CODE, ' ').replace(SHORT_CODE, ' ');
  // 과목 이름(「문학」)까지 빼 보았다가 **되돌렸다**(2026-09-26). 안내문 본문의 「문학」이 남아
  // 「문학·독서와 주체적 수용」으로 쏠리기에 빼 봤더니, 나아진 과제 2건에 나빠진 과제가 2~3건이었다
  // (「고전 시가의 형식 미학」이 서사·극 갈래로 갔다). 낱말 장난으로는 더 못 간다 —
  // 문학 영역 4개를 제대로 가르려면 **국어과 교육과정(별책5)** 이 있어야 한다.
  const areas = standardAreas(text);
  if (!areas.size) return { unit: '', area: '', why: '코드가 없다' };
  if (areas.size >= TOO_MANY_AREAS) return { unit: '', area: '', why: `영역이 ${areas.size}개 — 학기 전체 나열이다` };

  // 코드가 가리키는 과목이 이 과목과 같아야 한다. 학교가 다른 과목 코드를 함께 적기도 한다.
  const pick = [];
  for (const [number, heads] of areas) {
    const head = [...heads].find((one) => subjectOf(one, table) === own);
    if (!head) continue;
    // **과목 전체가 한 영역인 코드가 있다.** 「문학」 과목은 통째로 문학이라, 영역 번호가 무엇이든
    // 문학 단원으로 간다. 영역 번호의 뜻은 국어과 교육과정을 봐야 알 수 있는데 아직 없고,
    // 기록으로도 확인이 안 된다 — 코드가 적힌 과제 11건이 전부 영역 01 이다(2026-09-26).
    // 모르는 채로 공통국어1 의 번호표를 빌려 쓰면 문학 과제가 「듣기·말하기」로 간다. 그것보다는 이것이 맞다.
    const area = table.areaOfHead?.[head] || (table.area?.[own] || {})[number];
    if (!area) continue;
    for (const unit of (table.byArea?.[own] || {})[area] || []) pick.push({ unit, area });
  }
  if (!pick.length) return { unit: '', area: '', why: '이 과목의 영역이 아니다' };

  // 후보가 여럿이면 **과제 글과 가장 많이 겹치는** 단원을 고른다.
  // 겹치는 낱말이 하나도 없으면 표에 적은 **순서**를 따른다 — 그 영역에서 가장 흔한 단원을 앞에 적어 두었다.
  // 순서를 안 지키면 「영어 학술 텍스트 요약하기」에 「영어권 문화 이해와 비교」가 붙었다(2026-09-25).
  const scored = pick.map((one, at) => ({ ...one, at, score: overlap(one.unit, said) }));
  scored.sort((a, b) => (b.score - a.score) || (a.at - b.at));
  const pick2 = scored;
  return { unit: pick2[0].unit, area: pick2[0].area, why: '' };
}
