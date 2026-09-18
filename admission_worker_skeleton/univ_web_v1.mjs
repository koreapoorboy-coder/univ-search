// 대학 연구 소개 글(서울대 「연구성과」)을 **참고 자료**로 붙인다.
//
// 사용자가 짚은 걱정: 참고 자료에 대학 홈페이지 주소를 넣었는데 그 글이 사라지면 곤란하다.
// 그래서 세 겹으로 막는다.
//   1. 달마다 정리 — tools/sync_snu_highlights.mjs 가 사라진 글(404)을 빼고 새 글을 더한다
//   2. **넣기 직전에 연다** — checkAlive. 열리지 않으면 넣지 않는다. 학생이 받는 보고서에는 그 순간
//      살아 있는 주소만 들어간다
//   3. **접속일을 적는다** — 웹 자료 인용의 표준이다. 제출한 뒤에 글이 사라져도 "그날 거기 있었다"는
//      기록이 남아 인용은 여전히 올바르다. 이미 나간 보고서는 우리가 못 고치므로 이것이 마지막 보호다
//
// 글은 논문이 아니라 대학이 쓴 연구 소개(보도자료)다. 그래서 줄 모양도 웹 자료로 적는다.
// **AI에게는 안 보낸다** — 보고서 본문이 이 글에 맞춰 휘면 끼워 맞추기가 된다.
import { pickForTask } from './univ_research_v1.mjs';

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// 이 보고서의 개념에 이어진 글들 가운데 과제문에 가까운 것부터. 인덱스 차례에 이미 '첫째 개념 → 쉬운 글 →
// 최근 글'이 들어 있다.
//
// **자리마다 엄격함이 다르다.** 실제 보고서로 돌려 보고 정했다 — 「사과 갈변」 보고서에 개념(산화와 환원)만
// 보고 붙이면 참고 자료에 「배터리 산소의 산화·환원 거동」 기사가 들어간다. 참고 자료는 **보고서 내용을
// 받쳐야** 하므로 그건 끼워 맞추기다.
//   · strict  (참고 자료)            — 과제문 낱말이 제목에 걸린 글만. 없으면 안 붙인다
//   · 느슨하게 (다음에 해 볼 것)      — 개념만 맞아도 된다. "이 단원이 대학에서 지금 이렇게 이어진다"를 보여 주는 자리다
export function pickUnivWeb(list, text, { limit = 3, skip = '', strict = false } = {}) {
  return pickForTask(Array.isArray(list) ? list : [], text, limit, { skip, strict });
}

// 「다음에 해 볼 것 → 대학에서는 이렇게 이어져요」 칸의 모양(next_step_v1 의 research)으로.
export function asResearch(row) {
  return {
    title: clean(row?.title, 160), org: '서울대학교', lead: clean(row?.team, 60),
    year: clean(row?.date, 4), url: clean(row?.url, 300), kind: 'univ-web',
  };
}

// 주소가 지금 열리는가. 200 이면 산 것, 그 밖(404·시간 초과·막힘)은 **넣지 않는다**.
// 몸통은 안 읽는다 — 서울대 글 한 쪽이 100KB 다.
export async function checkAlive(url, { fetchImpl = fetch, timeoutMs = 4000 } = {}) {
  const address = clean(url, 300);
  if (!/^https:\/\//.test(address)) return false;
  try {
    const res = await fetchImpl(address, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    try { await res.body?.cancel?.(); } catch { /* 몸통을 안 읽어도 된다 */ }
    return res.status === 200;
  } catch {
    return false;
  }
}

// 후보를 차례로 열어 보고 살아 있는 것만 limit 개까지. 한 번에 하나씩 연다 — 서울대에 몰려가지 않게.
export async function aliveOnly(rows, { limit = 1, fetchImpl = fetch, timeoutMs = 4000, maxTries = 3 } = {}) {
  const kept = [];
  let tried = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (kept.length >= limit || tried >= maxTries) break;
    tried += 1;
    if (await checkAlive(row?.url, { fetchImpl, timeoutMs })) kept.push(row);
  }
  return kept;
}

// 한국 날짜로 "2026.09.18"
export function accessDate(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  return kst.replace(/-/g, '.');
}

// 참고 자료 한 줄.
//   서울대학교 (2026). 제목. 서울대학교 연구성과(화학생물공학부 서상우 교수팀). https://… (접속일: 2026.09.18)
export function webLine(row) {
  const title = clean(row?.title, 160);
  const url = clean(row?.url, 300);
  if (!title || !url) return '';                // 주소가 없으면 적지 않는다 — 학생이 확인할 길이 없다
  const org = clean(row?.org, 40) || '서울대학교';
  const year = clean(row?.date, 4);
  const team = clean(row?.team, 60);
  const accessed = clean(row?.accessed, 12);
  return `${org}${year ? ` (${year})` : ''}. ${title}. ${org} 연구성과${team ? `(${team})` : ''}. ${url}`
    + `${accessed ? ` (접속일: ${accessed})` : ''}`;
}
