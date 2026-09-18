// 교과 확장 재료 — 보고서는 **조합**이다. 교과 단원 + 학생 데이터가 몸통이고, 실제 연구(논문·대학 연구 소개,
// 나중에 시사)는 **마지막 「교과 심화와 확장」에서** 이 교과 개념이 어디까지 이어지는지를 보여 주는 재료다.
//
// 사용자 결정(2026-09-18, 두 번째):
//   · 논문이 보고서의 핵심이 아니다. 주제·방법·결과·결론은 교과 개념과 학생 데이터로 쓴다
//   · "보고서를 쓰며 자료를 더 찾아보니 이 개념이 실제 연구에서는 여기까지 이어진다"(산화·환원 → 이차전지 양극재,
//     전자·원자의 충돌 → 반도체 공정) → 그래서 내 전공·진로와 이렇게 이어진다 — 교과와 연결된 확장성과 진로 연계성
//   · 대학 연구를 넣는 까닭: 대학은 생활기록부에서 **자기 학교가 연구하는 방향**과 이어진 탐구를 반길 수 있다
// 그래서 재료는 설계서(주제 잡기)에는 안 가고, 확장을 쓰는 단계(최종 보고서·한 번에 끝나는 보고서)에만 간다.
//
// 흐름:
//   1. 이 보고서 단원에 이어진 논문(GPT 가 단원 꼬리표를 붙여 둔 것)과 대학 연구 소개를 **후보**로 고른다
//   2. AI에게 제목·키워드만 보낸다. AI는 확장 절에서 1~2개만 쓰고, 관계없는 후보는 버린다(비교 시험에서 잘 버렸다)
//   3. AI가 **실제로 쓴 번호만**(usedIngredients) 참고 자료가 된다
//
// **조합이 다양해야 한다.** 가장 가까운 둘은 늘 넣고 나머지는 무작위 — 같은 과제라도 학생마다 확장 방향이 달라진다.
// 논문의 **결과·수치는 모른다**(제목과 키워드만 받았다). 그래서 AI에게 "제목으로 알 수 있는 주제까지만"이라고 이른다.
import { contentWords, unitsMeet, unpack } from './paper_route_v1.mjs';
import { taskHit } from './univ_research_v1.mjs';

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const EASE = { e: 2, m: 1, h: 0 };

function hitsOf(text, words) {
  const body = String(text || '');
  return words.filter((word) => taskHit(body, word)).length;
}

// 가까운 것 keep 개는 늘, 나머지는 pool 안에서 무작위로.
function mix(ranked, count, { keep = 2, pool = 15, random = Math.random } = {}) {
  const head = ranked.slice(0, Math.min(keep, count));
  const rest = ranked.slice(head.length, pool);
  for (let at = rest.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [rest[at], rest[other]] = [rest[other], rest[at]];
  }
  return [...head, ...rest.slice(0, Math.max(0, count - head.length))];
}

// rows/table: 과목 논문 묶음 · units: 이 보고서 단원('과목::단원') · snu: 단원별 서울대 글 목록(합친 것)
export function pickIngredients({ rows = [], table = [], units = [], taskText = '', subject = '', snu = [],
  papers = 5, research = 2, random = Math.random, minHits = 0 } = {}) {
  const words = contentWords(taskText, subject).split(' ').filter(Boolean);
  const want = (Array.isArray(units) ? units : []).filter(Boolean);
  const out = { papers: [], research: [] };
  if (want.length) {
    const seenAuthor = new Set();
    const candidates = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      const paper = Array.isArray(row) ? unpack(row, table) : row;
      // 단원 꼬리표가 있는 논문만 — GPT 가 "이 단원 탐구의 근거가 된다"고 읽은 것이다
      if (!Array.isArray(paper?.units) || !paper.units.length || !unitsMeet(paper.units, want)) continue;
      if (paper.level === 'h') continue;   // 고등학생이 요지를 잡기 어려운 연구는 재료로 안 준다
      const key = `${paper.who}|${paper.year}`;
      if (seenAuthor.has(key)) continue;   // 한 연구실의 연작이 여러 자리를 차지하지 않게
      seenAuthor.add(key);
      // 낱말로 후보를 조이지 않는다(minHits 기본 0). 비교 시험(2026-09-18)에서 AI는 엉뚱한 후보(「소화 효소 실험」에
      // 「걷기 운동 에너지 대사」)를 전부 버렸고, 낱말이 하나도 안 겹치는 「호미반도 화산·퇴적 활동사」를 지질 단면도
      // 설계에 잘 썼다. 낱말 하나를 조건으로 걸면 재료가 가는 과제가 434 → 127로 줄고 그 좋은 재료도 빠진다.
      // 뜻 판단은 AI가 한다. 낱말은 순서만 정한다.
      const hits = hitsOf(`${paper.title} ${paper.keywords || ''}`, words);
      if (hits < minHits) continue;
      const score = hits * 3 + (EASE[paper.level] || 0) + (Number(paper.year) >= 2021 ? 1 : 0);
      candidates.push({ paper, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    out.papers = mix(candidates.map((one) => one.paper), papers, { random })
      .map((paper, at) => ({ id: `P${at + 1}`, ...paper }));
  }
  const posts = [];
  const seenPost = new Set();
  for (const post of Array.isArray(snu) ? snu : []) {
    if (!post?.title || seenPost.has(post.url)) continue;
    seenPost.add(post.url);
    posts.push({ post, score: hitsOf(post.title, words) });
  }
  posts.sort((a, b) => b.score - a.score);
  out.research = mix(posts.map((one) => one.post), research, { keep: 1, pool: 6, random })
    .map((post, at) => ({ id: `R${at + 1}`, title: clean(post.title, 160), team: clean(post.team, 60), date: clean(post.date, 10), url: clean(post.url, 300) }));
  return out;
}

// AI에게 보내는 재료 칸. 없으면 빈 배열.
export function ingredientPromptLines(ingredients) {
  const papers = ingredients?.papers || [];
  const research = ingredients?.research || [];
  if (!papers.length && !research.length) return [];
  return [
    '',
    '[교과 확장 재료 — 이 단원과 이어지는 실제 연구]',
    ...papers.map((one) => `  ${one.id}. ${one.title} (${one.who || '저자 미상'}, ${one.year || '연도 미상'}, ${one.journal || ''})${one.keywords ? ` · 키워드: ${one.keywords}` : ''}`),
    ...research.map((one) => `  ${one.id}. [대학 연구 소개] ${one.title} (서울대학교 ${one.team || ''}, ${String(one.date || '').slice(0, 4)})`),
    '- 이 재료는 보고서의 핵심이 아니다. 연구 질문·방법·결과·분석·결론은 교과 개념과 학생 데이터로만 쓰고, 재료가 그것을 바꾸지 않는다.',
    '- 재료는 「교과 심화와 확장」 절에서 쓴다(그 절이 없으면 마지막 확장·결론 절). 흐름은 ① 이번 탐구의 교과 개념 → ② 보고서를 쓰며 관련 자료를 더 찾아보니, 이 개념이 실제 연구에서는 어디까지 이어지는지(예: 산화·환원 → 이차전지 양극재 설계, 전자·원자의 충돌 → 반도체 공정) → ③ 그 방향이 관심 계열·진로(careerTrack)와 어떻게 이어지는지다.',
    '- 쓰는 재료는 본문에 **출처가 보이게** 쓴다. 논문은 "관련 연구를 찾아보니 ○○를 다룬 연구(저자, 연도)가 있었다"처럼 저자와 연도를 밝히고, 대학 연구 소개는 "서울대학교 ○○학부 연구팀은 ~를 연구하고 있다"처럼 대학 이름과 연구팀을 밝힌다. 슬쩍 녹여 쓰지 않는다 — 읽는 사람이 어느 연구인지 알아볼 수 있어야 한다.',
    '- 논문은 **제목으로 알 수 있는 주제까지만** 쓴다. 그 연구의 결과·수치·결론, 읽고 알게 된 내용처럼 쓰지 않는다. 대학 연구 소개는 그 대학이 지금 연구하는 방향과 이번 탐구의 교과 개념이 이어지는 지점을 한 문장으로 짚는다.',
    '- 재료 번호(P1, R1)는 본문에 쓰지 않는다. 재료의 주제나 내용을 본문 어디에든 썼으면 그 번호를 반드시 usedIngredients에 넣는다. 쓰지 않은 재료의 내용은 본문에 쓰지 않는다.',
    '- 이번 탐구의 교과 개념과 실제로 이어지는 재료 1~2개만 쓴다. 관계없는 재료는 쓰지 않는다. 억지로 엮지 않는다.',
    '- usedIngredients에는 보고서에 **실제로 쓴** 재료 번호(예: "P2", "R1")만 적는다. 쓰지 않았으면 빈 배열이다.',
  ];
}

// 답 형식에 더할 칸
// **보낸 번호만 고를 수 있게**(enum) 한다. 아무 글자나 되는 칸으로 두었더니 최종 보고서(칸이 많은 답)에서 AI가
// 이 칸에 이르러 빈 줄을 끝없이 찍다가 출력 한도에 걸렸다 — 비교 시험 5건 가운데 3건, 한 건에 8분 넘게(2026-09-18).
// 설계서에서는 괜찮았다. 고를 수 있는 값을 정해 주면 그런 헤맴이 없다. 지어낸 번호도 애초에 못 쓴다.
export function ingredientSchema(ingredients) {
  const ids = [...(ingredients?.papers || []), ...(ingredients?.research || [])].map((one) => one.id).filter(Boolean);
  if (!ids.length) return {};
  return { usedIngredients: { type: 'array', items: { type: 'string', enum: ids }, maxItems: Math.min(4, ids.length) } };
}

// AI가 쓴 번호 → 보낸 재료. 보내지 않은 번호는 버린다(지어낸 번호를 인용으로 만들지 않는다).
export function usedIngredients(parsed, ingredients) {
  const ids = new Set((Array.isArray(parsed?.usedIngredients) ? parsed.usedIngredients : []).map((one) => clean(one, 4).toUpperCase()));
  return {
    papers: (ingredients?.papers || []).filter((one) => ids.has(one.id)),
    research: (ingredients?.research || []).filter((one) => ids.has(one.id)),
  };
}

// 설계서 → 사이트 → 최종 보고서로 되돌아오는 모양(학생 브라우저를 거치므로 받을 때 다시 다듬는다).
export function inspirationOf(used) {
  return [
    ...(used?.papers || []).map((one) => ({ kind: 'paper', title: clean(one.title, 200), author: clean(one.who, 80), year: clean(one.year, 4),
      journal: clean(one.journal, 80), volume: clean(one.volume, 10), issue: clean(one.issue, 10), pages: clean(one.pages, 20) })),
    ...(used?.research || []).map((one) => ({ kind: 'research', title: clean(one.title, 160), team: clean(one.team, 60), date: clean(one.date, 10), url: clean(one.url, 300) })),
  ];
}

export function normalizeInspiration(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, 20) : [];
  return list.map((one) => (one?.kind === 'research'
    ? { kind: 'research', title: clean(one.title, 160), team: clean(one.team, 60), date: clean(one.date, 10), url: /^https:\/\/www\.snu\.ac\.kr\//.test(String(one.url || '')) ? clean(one.url, 300) : '' }
    : { kind: 'paper', title: clean(one?.title, 200), author: clean(one?.author, 80), year: clean(one?.year, 4), journal: clean(one?.journal, 80),
      volume: clean(one?.volume, 10), issue: clean(one?.issue, 10), pages: clean(one?.pages, 20) }))
    .filter((one) => one.title && (one.kind === 'paper' ? one.journal : one.url))
    .slice(0, 4);   // 거른 다음에 자른다 — 앞의 빈 것 때문에 멀쩡한 것이 잘리지 않게
}

// 참고 자료 줄로(references_v1 이 읽는 이름)
export function inspirationCitations(list) {
  const items = normalizeInspiration(list);
  return {
    papers: items.filter((one) => one.kind === 'paper').map((one) => {
      const [from, to] = String(one.pages || '').split('-');
      return { title: one.title, author: one.author, with: '', year: one.year, journal: one.journal, volume: one.volume, issue: one.issue, from: from || '', to: to || '' };
    }),
    web: items.filter((one) => one.kind === 'research').map((one) => ({ title: one.title, team: one.team, date: one.date, url: one.url })),
  };
}

// 설계서 화면의 "이 설계가 참고한 연구" 칸(사이트 renderPaperGuide 가 그린다).
export function inspirationGuide(list) {
  const items = normalizeInspiration(list);
  if (!items.length) return null;
  return {
    mode: 'inspiration',
    routeLabel: '교과 확장에 쓴 연구',
    center: [],
    papers: items.map((one) => ({
      title: one.title,
      line: one.kind === 'paper'
        ? `${one.author || '저자 미상'} (${one.year}). ${one.title}. ${one.journal}${one.volume ? `, ${one.volume}${one.issue ? `(${one.issue})` : ''}` : ''}${one.pages ? `, ${one.pages}` : ''}.`
        : `서울대학교 (${String(one.date).slice(0, 4)}). ${one.title}. 서울대학교 연구성과${one.team ? `(${one.team})` : ''}.`,
      guide: one.kind === 'paper'
        ? 'KCI(kci.go.kr)에서 제목으로 찾아 초록을 읽어 보세요. 이 연구가 무엇을 바꾸고 무엇을 쟀는지 알면 내 설계를 설명하기 쉬워요.'
        : '대학이 쓴 연구 소개 글이에요. 요즘 이 주제가 어디까지 왔는지 볼 수 있어요.',
      url: one.url || '',
    })),
  };
}
