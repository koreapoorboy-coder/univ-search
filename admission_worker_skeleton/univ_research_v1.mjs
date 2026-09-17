// 대학 연구를 「다음에 해 볼 것」에 붙인다.
//
// **참고문헌이 아니다.** 학생이 읽을 원문이 없기 때문이다. 대신 이건 지어낸 말이 아니라 국가 기록이다:
//   "네가 지금 한 효소 탐구는, 연세대학교에서 「미토콘드리아 메티오닌 포르밀화 효소의 대사 스트레스
//    조절기능 규명」으로 이어진다."
// 학생이 안 읽어도 사실이고, 진로를 물었을 때 대답할 거리가 된다.
//
// 여기 든 규칙은 전부 **개념 152개를 전수로 재면서 틀려 본 뒤에 고친 것**이다. 다섯 번 고쳤다.
// 무엇이 왜 이렇게 되어 있는지는 규칙마다 적어 두었다. 재는 도구는
// public/keyword-engine/build/audit_research_coverage_all.mjs 에 있다.

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const words = (text) => String(text || '').split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);

// 조사는 정해진 목록이라 안전하게 뗄 수 있다.
const JOSA = /(으로서|으로써|에서의|에게서|에서는|이라는|라는|으로|에서|에게|부터|까지|보다|과의|와의|의|가|이|은|는|을|를|에|도|만|와|과|로|랑)$/;
export function stem(word) {
  const bare = String(word || '').replace(JOSA, '');
  return bare.length >= 2 ? bare : String(word || '');
}

// 혼자서는 아무 주제도 가리키지 못하는 말. 전수로 재면서 **실제로 가짜를 만들어 낸 것들**이다.
//   「자료 수집·분석·결론 도출」 → "체육계열 내 여교수들의 삶에 대한 내러티브 연구"  ('자료'·'분석')
//   「조건부확률과 사건의 독립」 → "공공부문 이직 연구"                            ('사건'·'독립')
//   「과학의 유용성과 필요성」   → "약물유전형 검사의 유용성과 비용-효과 분석"       ('유용성')
//   「다양한 분야 독서와 홍보」   → "다양한 시간 범위에 대한 시계열 데이터 패턴 분석"  ('다양한')
export const NOT_POINTING = new Set([
  '자료', '분석', '이해', '활용', '적용', '탐구', '사례', '방법', '과정', '구성', '표현', '해석',
  '결론', '도출', '수집', '정리', '비교', '관찰', '조사', '평가', '발표', '작성', '판단', '검증',
  '변화', '구조', '성질', '관계', '특성', '현상', '문제', '해결', '기본', '기초', '개념', '원리',
  '체계', '시스템', '종류', '방식', '발전', '발견', '관점', '증거', '독립', '사건', '활동', '실험',
  '유용성', '필요성', '세계', '우리', '여러', '가지', '수용', '다양한', '새로운', '관련', '중심', '분야',
  // 붙은 것을 전수로 눈으로 읽다가 더 나온 것들. 연구 제목에는 어디에나 들어 있는 말이다:
  //   「미래와 지속 가능한 삶」   → "사막에서도 광합성 **가능한** 인공 잎"     ('가능한')
  //   「통합적 관점과 행복」      → "**통합적** 상황 인지 딥러닝"             ('통합적')
  '가능한', '가능', '지속', '통합적', '통합', '상호작용',
]);

// 이 개념을 실제로 가리키는 말. 과목 이름과 넓은 말은 뺀다.
export function pointers(concept, subject) {
  const kept = [];
  for (const raw of words(concept).map(stem)) {
    if (raw.length < 2 || NOT_POINTING.has(raw)) continue;
    if (raw.replace(/\s+/g, '') === String(subject || '').replace(/\s+/g, '')) continue;
    if (!kept.includes(raw)) kept.push(raw);
  }
  // 긴 말이 더 또렷하다. '화학 평형'이 '평형'보다 낫다.
  kept.sort((a, b) => b.length - a.length);
  return kept;
}

// **닿았다고 부르는 기준.** 여기가 다섯 번 고친 자리다.
//
//   1. 품는 것으로 세니 「수열의 극한」에 "**극한환경**에 따른 액적 충돌"이 걸렸다. 뜻이 전혀 다르다.
//   2. 정확히만 맞추니 「지층과 지질시대」가 '지층과'로 남아 "**지층** 탄성파 속도"를 놓쳤다(개념 쪽 조사).
//   3. 조사만 떼니 「판 구조와 암석 변화」가 "**암석권**"을 못 알아봤다(접미사 한 글자).
//   4. 그래서 앞뒤로 한 글자까지만 봐준다. '극한'과 '극한환경'은 두 글자 차이라 여전히 막힌다.
//   5. 개념이 붙여 쓴 말일 때를 위해 반대쪽도 본다: 「이항분포와 정규분포」 ⊃ '분포' → "확률 **분포**와 응용".
//      다만 이건 **제목 쪽 낱말이 개념 안에 통째로 들어 있을 때만** 된다. 「생태계평형」과 '평형성'처럼
//      둘 다 조금씩 다르게 붙여 쓴 경우는 못 잡는다 — 그건 손 고침 파일로 다룬다.
export function touches(word, aim) {
  const bare = stem(word);
  if (aim.has(bare) || aim.has(word)) return true;
  for (const one of aim) {
    if (one.length < 2) continue;
    if (bare.startsWith(one) && bare.length <= one.length + 1) return true;
    if (!NOT_POINTING.has(bare) && one.includes(bare) && one.length - bare.length <= 3) return true;
  }
  return false;
}

// 개념 152개 가운데 이 말이 몇 개에 나오는가. **여러 개념에 나오는 말은 어느 개념도 못 가리킨다.**
//
// 이게 없을 때 이런 것들이 붙었다:
//   「화학 반응에서의 동적 평형」 → "1억도 이상 초고온 핵융합 **반응**"        ('반응'만 걸림)
//   「지구의 기후 변화」        → "마그네슘 규산염 비정질 **지구**물질의 …"   ('지구'만 걸림)
// '반응'은 3개 개념에, '지구'는 5개 개념에 나온다. 그런 말 하나로는 닿았다고 할 수 없다.
export function buildSpread(axisIndex) {
  const spread = new Map();
  const seen = new Set();
  for (const axis of Object.values(axisIndex?.axes || {})) {
    const key = `${axis.subject}::${axis.concept}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const word of new Set(words(axis.concept).map(stem))) {
      spread.set(word, (spread.get(word) || 0) + 1);
    }
  }
  return spread;
}

// **제목**에 개념이 보이는가. 요약이나 본문까지 훑으면 안 된다 — 보도자료 본문은 길어서 '물질'·'생활'
// 같은 말이 어디에나 있고, 그렇게 세니 87%가 걸렸는데 대부분 가짜였다.
// 그리고 학생도 제목을 보고 고른다. 제목에 안 보이면 학생에게도 안 이어진다.
export function onTopic(title, aim) {
  return words(title).some((word) => touches(word, aim));
}

// 대학인가. 산학협력단까지 대학으로 본다 — 교수 연구비는 거기로 들어간다.
// 우수성과에는 출연연구기관도 섞이는데(기상연구소·국립축산과학원), "**대학**에서 이렇게 이어진다"는
// 말에는 대학이어야 하므로 가른다.
const UNIV = /(대학교|대학(?!원생)|과학기술원|KAIST|POSTECH|UNIST|GIST|DGIST|산학협력단)/;
const SCHOOL = /(고등학교|중학교|초등학교)/;
export function isUniv(org) {
  const name = clean(org, 60);
  return UNIV.test(name) && !SCHOOL.test(name);
}

// 20년 전 과제로는 "지금 이렇게 이어진다"고 말할 수 없다.
const FRESH_YEARS = 10;
export function isFresh(year, now = new Date().getFullYear()) {
  const at = Number(clean(year, 4));
  return Number.isFinite(at) && at >= now - FRESH_YEARS;
}

// 수학 단원에는 대학 연구를 안 붙인다. 책에서 내린 것과 **같은 판단**이고, 같은 이유다.
//
// 재 보니 이렇게 붙었다:
//   「수열의 극한」 → "**극한 환경**에서 초고강도 발휘하는 최첨단 고엔트로피 합금 개발"
//   「급수」       → "아이젠스타인 **급수**와 코호몰로지를 이용한 보형형식의 산술"
// 앞엣것은 글자만 같고 뜻이 다르다(수학의 극한 ≠ 극한 환경). 낱말로는 절대 못 가른다.
// 뒤엣것은 뜻은 맞는데 **고등학생이 읽을 수 있는 글이 아니다.** 붙여 봐야 학생이 쓸 수 없다.
// 수학 보고서의 자리는 연구가 아니라 통계·공공데이터다 — 책에서 내린 결론 그대로다.
const NO_RESEARCH = /^(공통수학|미적분|기하|대수|확률과 통계|수학)/;
export function wantsResearch(subject) {
  const name = clean(subject, 40);
  return Boolean(name) && !NO_RESEARCH.test(name);
}

// 걸러 내고 줄 세운다. 들어오는 것은 어디서 왔든 같은 모양이어야 한다:
//   { title, year, org, lead, summary, url, kind }
// kind 는 'best'(우수성과) 또는 'project'(과제). **쉬운 글이 먼저다.**
export function pickResearch(rows, { concept = '', subject = '', limit = 2, now, spread = null } = {}) {
  if (!wantsResearch(subject)) return [];
  const aim = new Set(pointers(concept, subject));
  if (!aim.size) return [];
  // 이 개념만의 말. 3개 넘는 개념에 나오는 말은 뺀다. spread 를 안 주면 예전처럼 다 본다.
  const sharp = new Set(spread ? [...aim].filter((one) => (spread.get(one) || 1) < 3) : []);
  const seen = new Set();
  const kept = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const title = clean(row?.title, 160);
    if (!title) continue;
    if (!isUniv(row?.org)) continue;
    if (!onTopic(title, aim)) continue;
    // 흔한 말 하나로만 걸린 것은 버린다. 또렷한 말이 하나는 있어야 한다.
    if (sharp.size && !words(title).some((word) => touches(word, sharp))) continue;
    // 과제는 최근 것만. 우수성과는 뽑힌 해가 곧 성과라 오래돼도 읽을 만하다.
    if (row?.kind === 'project' && !isFresh(row?.year, now)) continue;
    // 같은 연구가 연도만 바꿔 여러 번 올라와 있다(「화학 평형」은 1~3위가 전부 같은 과제였다).
    const key = title.replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({
      title,
      year: clean(row.year, 4),
      org: clean(row.org, 60),
      lead: clean(row.lead, 30),
      summary: clean(row.summary, 200),
      url: clean(row.url, 300),
      kind: row.kind === 'best' ? 'best' : 'project',
    });
  }
  // 쉬운 글(우수성과)이 앞. 그 다음은 최근 것이 앞.
  kept.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'best' ? -1 : 1)
    || (Number(b.year) || 0) - (Number(a.year) || 0));
  return kept.slice(0, limit);
}

// 학생이 읽을 한 줄. **"이걸 읽으세요"가 아니라 "여기로 이어집니다"**다.
// 지어낸 말을 넣지 않는다 — 제목·대학·연구자·연도는 전부 기록에 있는 그대로다.
export function researchLine(row) {
  const title = clean(row?.title, 160);
  if (!title) return '';
  const where = [clean(row?.org, 60), clean(row?.lead, 30)].filter(Boolean).join(' · ');
  const year = clean(row?.year, 4);
  return `「${title}」${where ? ` — ${where}` : ''}${year ? ` (${year})` : ''}`;
}

// 화면에 뭐라고 쓸지. 연구를 붙였을 때만 한 줄 더 붙는다.
export function researchNote(found) {
  if (!found?.length) return '';
  return found.some((one) => one.kind === 'best')
    ? '이 주제가 대학에서 어떻게 이어지는지예요. 정부가 뽑은 우수성과라 설명이 쉬운 편이에요.'
    : '이 주제가 대학에서 어떻게 이어지는지예요. 국가 연구과제 기록이라 말이 어려울 수 있어요.';
}
