// 공공데이터 찾아 주기 — 학생이 열어 볼 수 있는 자료만.
//
// 재 보고 알게 된 것 셋이 이 파일의 이유다.
//   · **교과서 말로 찾으면 0건이다.** '반감기'·'화학 평형'·'수열'은 아무것도 안 나온다. 공공데이터는
//     행정 용어로 이름이 붙어 있어서, 개념 → 자료 말 사전이 있어야 한다(public_data_terms.v1.json).
//   · **totalCount는 늘 17,043이다.** 이 API는 전체 건수를 돌려준다. 그 숫자를 '찾은 수'로 쓰면 거짓말이다.
//   · **지자체 자료가 섞인다.** '인구'로 찾으면 "경기장애인구강진료센터"가 나온다 — '인구'가 '장애인구강'에
//     들어 있어서다. 중앙기관을 앞세우고, 행정 업무용 자료는 걸러야 한다.
//
// 2026-09-23에 바뀌었다. 예전에는 여기서 찾은 자료가 **AI에게 가지 않았다** — 화면에만 보이고,
// 학생이 열어 보고 자료 카드에 적었을 때만 보고서에 들어갔다.
//
// 사용자 지적: 그 전제가 틀렸다. 학생은 모르는 것이 맞고, 모르는 것을 정리해 주는 것이 이
// 프로그램이 하는 일이다. 자료원을 알려 주지 않으면 보고서가 「공공데이터 포털에서 찾아라」라고
// 말만 하고 어디인지 못 적는다. 이제 **자료의 이름과 기관을 보고서에 보낸다.**
//
// 다만 우리가 아는 것은 **자료의 이름과 기관까지**다. 값은 모른다(목록 API는 값을 안 준다).
// 그래서 AI에게 「이 자료를 자료원으로 밝혀라, 그러나 이 자료의 수치를 지어내지 마라」고 이른다.
//
// (옛 주석) 여기서 찾은 자료는 설계서 화면에도 보인다. 학생이 열어 보고 자료 카드에
// 적었을 때만 보고서에 들어간다. 책과 같은 규칙이다.

const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);
const BASE = 'https://api.odcloud.kr/api/15077093/v1/open-data-list';

// 이 개념으로 무엇을 찾을 것인가. **개념에 걸린 말만 쓴다.**
//
// 처음에는 개념에 말이 없으면 과목의 말로 내려가게 했다. 재 보니 그러면 한 과목의 모든 개념에 똑같은 자료가
// 붙었다 — 화학의 '원자의 구조'에 "먹는샘물 수질검사결과"가 권해졌다. 과목은 개념을 가리지 못한다.
// 말이 없으면 0건이 맞다. 책과 같은 규칙이다: 근거가 없으면 안 내놓는다.
// 보고서에게 「쓸 수 있는 공개 자료」를 알려 주는 칸. 이름과 기관까지만 준다 — 값은 우리도 모른다.
export function datasetPromptLines(datasets) {
  const list = (Array.isArray(datasets) ? datasets : []).filter((one) => one?.title).slice(0, 3);
  if (!list.length) return [];
  return [
    '',
    '[쓸 수 있는 공개 자료]',
    ...list.map((one, at) => `  ${at + 1}. ${one.title}${one.org ? ` (${one.org})` : ''}`),
    '- 이 자료는 **자료원**이다. 학생이 값을 옮겨 적은 자료가 이것이면 탐구 방법 절에 「자료원은 ○○(기관)이다」처럼 한 줄로 밝힌다.',
    '- **이 자료의 수치를 지어내지 않는다.** 우리는 자료의 이름과 기관까지만 안다. 값은 학생이 적은 표에만 있다.',
    '- 「이 자료를 읽고 알게 되었다」처럼 쓰지 않는다. 자료원으로 밝히는 것과 읽은 척하는 것은 다르다.',
  ];
}

export function searchTerms(terms, { concept = '' } = {}) {
  return ((terms?.byConcept || {})[clean(concept, 60)] || []).slice(0, 2);
}

// 이 자료가 고등학생 탐구에 쓸 만한가. 행정 업무용 자료는 참고 자료가 아니다.
export function usable(row, terms) {
  const title = clean(row?.title || row?.list_title, 200);
  if (!title) return false;
  const blocked = terms?.blockWords || [];
  return !blocked.some((word) => title.includes(word));
}

// 중앙기관이 앞이다. 한 시의 지하수 검사보다 환경부 전국 자료가 고등학생에게 쓸모 있다.
const LOCAL = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|전라|경상|제주)|(특별시|광역시|특별자치)/;
export function orgRank(row, terms) {
  const org = clean(row?.org_nm, 60);
  const prefer = terms?.preferOrg || [];
  const at = prefer.findIndex((name) => org.includes(name));
  if (at >= 0) return at;
  // 지자체 개별 자료는 맨 뒤다. 한 시의 자료로 전국을 말할 수 없다.
  return LOCAL.test(org) ? prefer.length + 10 : prefer.length;
}

export function pickRows(rows, terms, limit = 3) {
  const seen = new Set();
  const kept = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!usable(row, terms)) continue;
    const title = clean(row.title || row.list_title, 200);
    // 같은 자료가 연도만 바꿔 여러 번 올라와 있다. 뒤의 날짜를 떼고 한 번만 센다.
    const key = title.replace(/_\d{8}$/, '').replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({
      title: title.replace(/_\d{8}$/, ''),
      org: clean(row.org_nm, 60),
      id: clean(row.list_id, 40),
      rank: orgRank(row, terms),
    });
  }
  kept.sort((a, b) => a.rank - b.rank);
  return kept.slice(0, limit).map(({ rank, ...rest }) => rest);
}

// 자료 하나의 주소. 공공데이터포털의 그 자료 페이지로 바로 간다.
export function datasetUrl(id) {
  const key = clean(id, 40);
  return key ? `https://www.data.go.kr/data/${key}/openapi.do` : 'https://www.data.go.kr';
}

// 실제로 찾아본다. 키가 없거나 실패하면 빈 배열 — 자료를 못 찾아도 보고서는 그대로 나가야 한다.
export async function findPublicData(input, terms, apiKey, { limit = 3, fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  const key = clean(apiKey, 200);
  if (!key) return [];
  const queries = searchTerms(terms, input);
  if (!queries.length) return [];

  const rows = [];
  for (const query of queries) {
    const url = `${BASE}?page=1&perPage=20&cond%5Btitle%3A%3ALIKE%5D=${encodeURIComponent(query)}`
      + `&serviceKey=${encodeURIComponent(key)}`;
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      const body = await res.json();
      for (const row of body?.data || []) rows.push(row);
    } catch (error) {
      // 한 검색어가 실패해도 나머지는 계속한다.
    }
  }
  return pickRows(rows, terms, limit);
}

// 화면에 뭐라고 쓸지. "이 자료를 쓰세요"가 아니라 "이런 자료가 있어요"다.
export function publicDataNote(found) {
  if (!found.length) return '';
  return '공공기관이 공개한 자료예요. 열어 보고 쓸 만하면, 2단계에서 무엇을 얻었는지 적어 주세요.';
}
