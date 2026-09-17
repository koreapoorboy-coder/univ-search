// KCI 논문 — 학생이 **열어서 읽을 수 있는** 것만.
//
// 앞서 정한 규칙이 이 파일의 이유다: 학생이 실제로 열어 보지 못한 자료는 참고 자료가 아니다. 유료 논문을
// 찾아 적어 주는 것은 지어내는 일을 자동화하는 것과 같다. 그래서 논문을 붙이되 **조건을 건다.**
//
//   · 응답에 orte-open-yn(원문공개여부)이 있다. Y가 아닌 논문은 버린다.
//   · url이 없는 논문도 버린다.
//
// **이 파일의 아래쪽(indexPaperLine)이 지금 실제로 쓰는 길이다.** 위의 API 부분은 키가 생길 때를
// 위해 남겨 둔다. 그리고 위 규칙 가운데 하나는 **너무 엄했다** — 사용자가 짚어 줘서 고쳤다:
// '원문(PDF)을 다 읽을 수 있나'와 '열어서 확인할 수 있나'는 다른 문제다. KCI 논문 쪽은 로그인 없이
// **초록이 통째로 보인다**(다섯 편을 열어 확인했다). 고등학생 보고서에 필요한 것은 초록 수준이다.
// 그러니 원문이 유료라고 버릴 일이 아니었다.
//
// 이용허락은 아직 확실하지 않다. KCI 포털 쪽 페이지는 이용허락범위 칸을 주석으로 감춰 두었고
// 그 안의 문구는 '영리목적 사용불가'다. 공공데이터포털의 같은 자료는 '제한 없음'이다. 어긋난다.
// 그래서 지금 쓰는 것은 **공공데이터포털 파일**(제한 없음)이고, KCI 포털 API 는 안 쓴다.
//
// 공공데이터와 같은 자리에 같은 방식으로 붙는다. AI에게 보내지 않고, '여기서 무엇을 얻었다'고 쓰지 않는다.
// 무엇이 있고 어디서 볼 수 있는지만 적는다.
//
// 명세는 kci.go.kr > 정보마당 > KCI 데이터 제공 > OPEN API > '논문 기본 정보 제공'에서 확인했다.
// key는 필수다. 키 없이 부르면 "필수 요청 파라미터가 없음 => key"가 돌아온다 — 우회로는 없다.

const BASE = 'https://open.kci.go.kr/po/openapi/openApiSearch.kci';
const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

// 제목(title)이 필수 파라미터다. 그런데 개념 이름을 통째로 넣으면 그 말이 제목에 그대로 든 논문만 걸려
// 0건이 되기 쉽다("동적 평형과 화학 평형"이라는 제목의 논문은 없다). 그래서 개념을 조각으로 끊는다.
const SPLIT = /\s*(?:와|과|및|,|·|;|\/)\s*/;
// 혼자서는 아무 주제도 가리키지 못하는 말. 이 말로 논문을 찾으면 온갖 분야가 다 걸린다.
const TOO_WIDE = new Set([
  '이해', '활용', '적용', '분석', '탐구', '자료', '사례', '변화', '구조', '특성', '성질', '관계',
  '방법', '과정', '체계', '시스템', '기초', '기본', '개념', '원리', '현상', '문제', '해결', '표현',
]);

// 이 개념으로 무엇을 찾을 것인가. **개념에 걸린 말만 쓴다.** 과목 이름으로는 내려가지 않는다 —
// 공공데이터에서 겪은 그대로다. 과목은 개념을 가리지 못한다.
export function paperQueries(concept, limit = 2) {
  const name = clean(concept, 60);
  if (!name) return [];
  const parts = name.split(SPLIT).map((one) => one.trim()).filter(Boolean);
  const kept = [];
  for (const part of parts.length ? parts : [name]) {
    if (part.length < 2) continue;
    if (TOO_WIDE.has(part)) continue;
    if (!kept.includes(part)) kept.push(part);
  }
  // 긴 조각이 더 정확하다. '화학 평형'이 '평형'보다 낫다.
  kept.sort((a, b) => b.length - a.length);
  return kept.slice(0, limit);
}

const unwrap = (value) => String(value ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

// 여는 태그 뒤는 공백이나 '>'여야 한다. 안 그러면 <author>를 찾을 때 <author-group>이 먼저 걸려
// 저자 이름 대신 그룹 전체가 잡힌다(실제로 그랬다). abstract/abstract-group, title-group도 같다.
const open = (tag, attr = '') => `<${tag}(?=[\\s>])${attr ? `[^>]*${attr}` : ''}[^>]*>`;

const one = (xml, tag, attr = '') => {
  const found = new RegExp(`${open(tag, attr)}([\\s\\S]*?)</${tag}>`).exec(xml);
  return found ? unwrap(found[1]) : '';
};

const many = (xml, tag) => {
  const out = [];
  const re = new RegExp(`${open(tag)}([\\s\\S]*?)</${tag}>`, 'g');
  let hit;
  while ((hit = re.exec(xml))) out.push(unwrap(hit[1]));
  return out;
};

// 저자는 "홍길동(서울대학교)"처럼 소속이 붙어 온다. 참고 자료에는 이름만 적는다.
const authorName = (raw) => clean(raw, 60).replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim();

// 응답 한 덩어리를 우리가 쓰는 모양으로. 명세에 있는 이름을 그대로 읽는다.
export function parsePapers(xml) {
  const text = String(xml ?? '');
  // 에러는 resultMsg로 온다(등록되지 않은 key, 사용기간 종료, 검색 조건 없음 …). 그러면 0건이다.
  if (/<resultMsg>/.test(text)) return [];
  const rows = [];
  for (const block of many(text, 'record')) {
    const title = one(block, 'article-title', 'lang="original"') || one(block, 'article-title');
    if (!title) continue;
    rows.push({
      title,
      authors: many(block, 'author').map(authorName).filter(Boolean),
      journal: one(block, 'journal-name'),
      publisher: one(block, 'publisher-name'),
      year: one(block, 'pub-year'),
      volume: one(block, 'volume'),
      issue: one(block, 'issue'),
      fpage: one(block, 'fpage'),
      lpage: one(block, 'lpage'),
      doi: one(block, 'doi'),
      url: one(block, 'url'),
      abstract: one(block, 'abstract', 'lang="original"') || one(block, 'abstract'),
      open: one(block, 'orte-open-yn').toUpperCase(),
      cited: Number(/<citation-count[^>]*kci="(\d+)"/.exec(block)?.[1] || 0),
    });
  }
  return rows;
}

// 고를 수 있는 것만 남긴다. **원문이 열려 있고 주소가 있는 논문만.**
export function pickPapers(rows, limit = 2) {
  const seen = new Set();
  const kept = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    // 학생이 못 여는 논문은 참고 자료가 아니다. 이 두 줄이 이 파일의 전부다.
    if (row.open !== 'Y') continue;
    if (!clean(row.url, 300)) continue;
    const key = clean(row.title, 200).replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  // 최근 것이 앞이다. 같은 해면 많이 인용된 것이 앞.
  kept.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || b.cited - a.cited);
  return kept.slice(0, limit);
}

// 참고 자료 한 줄. 저자(연도). 제목. 학술지, 권(호), 쪽. — 주소
export function paperLine(row) {
  const title = clean(row?.title, 160);
  if (!title) return '';
  const names = (row?.authors || []).filter(Boolean);
  const who = !names.length ? '' : names.length > 2 ? `${names[0]} 외` : names.join(' · ');
  const year = clean(row?.year, 4);
  const head = who ? `${who}${year ? ` (${year})` : ''}. ` : '';
  const journal = clean(row?.journal, 80);
  const volume = clean(row?.volume, 10);
  const issue = clean(row?.issue, 10);
  const pages = clean(row?.fpage, 10) && clean(row?.lpage, 10) ? `${row.fpage}-${row.lpage}` : '';
  const where = [journal, volume ? `${volume}${issue ? `(${issue})` : ''}` : '', pages].filter(Boolean).join(', ');
  const url = clean(row?.url, 300);
  return `${head}${title}.${where ? ` ${where}.` : ''}${url ? ` — ${url}` : ''}`;
}

// 실제로 찾아본다. 키가 없거나 실패하면 빈 배열 — 논문을 못 찾아도 보고서는 그대로 나가야 한다.
export async function findPapers(input, apiKey, { limit = 2, fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const key = clean(apiKey, 200);
  if (!key) return [];
  const queries = paperQueries(input?.concept);
  if (!queries.length) return [];

  const rows = [];
  for (const query of queries) {
    const url = `${BASE}?key=${encodeURIComponent(key)}&apiCode=articleSearch`
      + `&title=${encodeURIComponent(query)}&displayCount=20&page=1`;
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      for (const row of parsePapers(await res.text())) rows.push(row);
    } catch (error) {
      // 한 검색어가 실패해도 나머지는 계속한다.
    }
    if (rows.length >= 40) break;
  }
  return pickPapers(rows, limit);
}

// ─── 인덱스에서 온 논문 ────────────────────────────────────────────────────
//
// **이제 실제로 쓰는 길은 이쪽이다.** 위의 findPapers 는 KCI 포털 OPEN API 용으로 남겨 둔다
// (키가 생기면 초록과 원문공개여부까지 받을 수 있다). 지금은 키가 없고, 공공데이터포털의 KCI API
// 넷은 검색이 없고 한 쪽에 10줄만 주고 30쪽에서 끊겨 못 쓴다.
//
// 그래서 같은 자료의 **파일**(한국연구재단 KCI논문정보, 11만 편, 이용허락 제한 없음)로 인덱스를
// 만들어 두고 거기서 꺼낸다. 파일에는 논문 번호가 없어 **주소를 못 붙인다.** 그래도 참고 자료가 된다 —
// KCI 논문 쪽은 로그인 없이 초록이 통째로 보이고, 학생이 제목으로 검색하면 찾는다. 실제 학술 인용도
// 주소 없이 서지사항만 적는다. 그러니 **서지사항을 정확히** 적는 것이 이 함수의 일이다.
export function indexPaperLine(row) {
  const title = clean(row?.title, 200);
  if (!title) return '';
  // 공동저자는 **세미콜론**으로 이어져 온다("박상혁;김현기;임지훈"). 쉼표만 자르면 통째로 나온다.
  // 제1저자가 영문인 줄도 있다("Lee Hyeong-Seok") — 원본이 그러므로 바꾸지 않는다. 서지사항은
  // 정확해야 하고, 실제 학술 인용도 제1저자를 그대로 쓴다.
  const names = [clean(row?.author, 60), clean(row?.with, 120)].filter(Boolean).join(';');
  const who = names.split(/[;,·]/).map((one) => one.trim()).filter(Boolean);
  const head = !who.length ? '' : who.length > 2 ? `${who[0]} 외` : who.join(' · ');
  const year = clean(row?.year, 4);
  const journal = clean(row?.journal, 80);
  const volume = clean(row?.volume, 10);
  const issue = clean(row?.issue, 10);
  const pages = clean(row?.from, 10) && clean(row?.to, 10) ? `${row.from}-${row.to}` : '';
  const where = [journal, volume ? `${volume}${issue ? `(${issue})` : ''}` : '', pages].filter(Boolean).join(', ');
  return `${head ? `${head}${year ? ` (${year})` : ''}. ` : ''}${title}.${where ? ` ${where}.` : ''}`;
}
