// **학생이 적은 작품 이름으로 문학 논문을 찾는다.** 색인은 literary_papers.v1.json (4,004편, 0.95MB).
//
// 개념으로 찾는 길(paper_route_v1.mjs)과 따로 두는 이유: 작품은 개념이 아니다.
// 「동백꽃」은 단원 이름도 아니고 성취기준도 아니다. 학생이 읽은 그 글 하나다.
// 그래서 **이름이 제목이나 주제어에 그대로 있는 논문만** 고른다. 낱말을 흩어 맞추지 않는다 —
// 흩어 맞추면 「날개」가 「항공기 날개」에 걸린다.
//
// 못 찾으면 **아무것도 붙이지 않는다.** 없는 것을 만들지 않는다.

const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

// 혼자서는 작품을 가리키지 못하는 말. 이 말로 찾으면 문학 논문이 아무거나 걸린다.
const TOO_WIDE = new Set([
  '소설', '시집', '희곡', '수필', '문학', '작품', '단편', '장편', '현대', '고전', '한국', '영어', '영미',
  '이야기', '지음', '옮김', '외', '편', '권', '작가', '선생님', '교과서',
  // 제목의 앞머리 조각. 이것으로 찾으면 엉뚱한 논문이 걸린다 —
  // 「나의 라임오렌지나무」가 「나의」로 걸려 드라마 <나의 아저씨> 논문이 붙었다.
  '나의', '우리', '너의', '그의', '저의', '나는', '나와', '사람', '인간', '세상', '오늘', '하루', '그리고',
]);

// 학생이 적은 것을 찾을 조각으로 끊는다. 화면 규칙(read_work_v1.js)과 같은 방식이다.
export function workParts(value) {
  const raw = clean(value).replace(/[『「《〈』」》〉"“”'‘’]/g, ' ').trim();
  if (!raw) return [];
  const out = [];
  const push = (one) => {
    const word = one.trim();
    if (word.length < 2) return;
    if (TOO_WIDE.has(word)) return;
    if (!out.includes(word)) out.push(word);
  };
  for (const part of raw.split(/[()[\]{}/,·、]|\s{2,}/)) {
    push(part);
    for (const word of part.split(/\s+/)) push(word);
  }
  out.sort((a, b) => b.length - a.length);
  return out.slice(0, 4);
}

// 논문 제목이 작품을 **묶어서** 인용했는가. <구운몽>, 『채식주의자』, 「메밀꽃 필 무렵」.
// 이 표시는 그 글이 작품 이름이라는 논문 스스로의 말이다.
const OPEN = ["<", "〈", "「", "『", "《", '"', "“", "‘", "'"];
function wrappedIn(title, part) {
  let at = title.indexOf(part);
  while (at >= 0) {
    let before = at - 1;
    while (before >= 0 && title[before] === ' ') before -= 1;
    if (before >= 0 && OPEN.includes(title[before])) return true;
    at = title.indexOf(part, at + 1);
  }
  return false;
}

const rowOf = (row) => ({
  title: row[0] || '', author: row[1] || '', year: row[2] || '', journal: row[3] || '',
  volume: row[4] || '', issue: row[5] || '', pages: row[6] || '', keywords: row[7] || '',
});

// 작품 이름으로 논문을 고른다. **긴 조각이 먼저**다 — 「메밀꽃 필 무렵」이 「메밀꽃」보다 또렷하다.
// 제목에 있는 것이 주제어에만 있는 것보다 낫다.
export function findLiteraryPapers(rows, work, { limit = 2 } = {}) {
  const parts = workParts(work);
  if (!parts.length || !Array.isArray(rows)) return { query: '', picked: [] };
  const scored = [];
  const seen = new Set();
  for (const row of rows) {
    if (!Array.isArray(row) || !row[0]) continue;
    const title = row[0];
    const keywords = row[7] || '';
    let best = 0;
    let by = '';
    for (const part of parts) {
      const wrapped = wrappedIn(title, part);
      const inTitle = title.includes(part);
      const inKeyword = keywords.includes(part);
      // **짧은 이름은 제목에 맨몸으로 있어도 믿지 않는다.** 「날개」가 「뿌리와 날개의 크로노토프」에 걸렸다.
      // 논문은 작품을 인용할 때 <구운몽>·『채식주의자』처럼 묶는다. 그 표시가 있거나,
      // 논문이 스스로 밝힌 주제어에 있으면 믿는다.
      const trust = wrapped || inKeyword || (inTitle && part.length >= 4);
      if (!trust) continue;
      // 조각이 길수록, 묶여 있을수록 높다.
      const score = part.length * (wrapped ? 4 : inTitle && part.length >= 4 ? 3 : 2);
      if (score > best) { best = score; by = part; }
    }
    if (!best) continue;
    const key = title.replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push({ score: best, by, row });
  }
  // 점수가 같으면 새 논문이 먼저다. 학생이 「요즘 연구」로 읽는다.
  scored.sort((a, b) => b.score - a.score || Number(b.row[2] || 0) - Number(a.row[2] || 0));
  const picked = scored.slice(0, limit).map((one) => ({ ...rowOf(one.row), matchedBy: one.by }));
  return { query: picked.length ? picked[0].matchedBy : parts[0], picked };
}

// 참고 자료 줄로 쓸 모양. references_v1 의 indexPaperLine 이 읽는 칸 이름에 맞춘다.
export function literaryCitation(paper) {
  const [from, to] = String(paper?.pages || '').split('-');
  return {
    title: clean(paper?.title, 200), author: clean(paper?.author, 80), with: '', year: clean(paper?.year, 4),
    journal: clean(paper?.journal, 80), volume: clean(paper?.volume, 10), issue: clean(paper?.issue, 10),
    from: clean(from, 10), to: clean(to, 10),
  };
}

// 설계서 화면에 내려보내는 묶음. paper_route_v1 의 guideBlock 과 같은 모양이라 화면 코드를 늘리지 않는다.
// **AI에게는 가지 않는다** — 학생이 읽기 전에 논문에 맞춰 보고서가 휘면 안 된다.
export function literaryGuide(work, picked) {
  const papers = (Array.isArray(picked) ? picked : []).map((paper) => {
    const where = [paper.journal, paper.volume && `${paper.volume}권`, paper.issue && `${paper.issue}호`, paper.pages]
      .filter(Boolean).join(', ');
    const head = paper.author ? `${paper.author}${paper.year ? ` (${paper.year})` : ''}. ` : '';
    return {
      line: `${head}${paper.title}.${where ? ` ${where}.` : ''}`,
      title: clean(paper.title, 200),
      // 왜 이 논문인지 한 줄. **우리가 읽은 것이 아니라 어디가 맞았는지**만 말한다.
      guide: `학생이 적은 「${clean(paper.matchedBy || work, 40)}」이 이 논문의 제목이나 주제어에 있어요.`,
      keywords: clean(paper.keywords, 80),
      hits: [clean(paper.matchedBy || work, 40)],
    };
  }).filter((one) => one.line);
  if (!papers.length) return null;
  return { route: 'work', routeLabel: '읽은 작품으로 찾은 논문', center: [clean(work, 60)], papers };
}
