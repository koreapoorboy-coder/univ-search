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
  // 학과 교과목에 붙여 보고 더 나온 것. 어느 학과 교과목에나 들어 있다:
  //   「과학 기술과 미래 사회」 → 건축토목공학부 "Eco City **기술**"
  //   「지구 환경 변화와 인간 생활」 → 의학과 "**인간**·사회·의료"
  '기술', '인간',
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

// ─── 학과 붙이기 ───────────────────────────────────────────────────────────
//
// 연구가 어느 대학에서 나왔는지는 안다. 학생이 진짜 알고 싶은 것은 그 다음이다 —
// **"그럼 나는 어느 학과를 가야 하나."**
//
// 대학알리미가 학과마다 **실제 개설 교과목**을 준다. 그래서 지어내지 않고 고를 수 있다:
// 그 대학의 학과 가운데, **개설 교과목에 이 개념이 실제로 들어 있는 학과**를 고른다.
// 교과목에 안 보이면 안 붙인다 — 학과 이름만 보고 짐작하는 것은 지어내기다.

// 연구 기록의 기관 이름과 대학알리미의 학교 이름을 맞춘다.
//   "충남대학교 산학협력단"           → 충남대학교
//   "성균관대학교(자연과학캠퍼스)"      → 성균관대학교
//   "공주대학교"                     → 국립공주대학교   ('국립'이 붙는 쪽으로도 본다)
export function schoolKey(name) {
  return clean(name, 60)
    .replace(/\s+/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/(글로컬산학협력단|에리카산학협력단|산학협력단)/g, '')
    .replace(/^국립/, '');
}

// 교과목 이름에는 쓰레기가 많이 섞여 있다. 재 보고 알았다:
//   "연구멘토링-내과학-이동기(MED7185)"  ← 교수 이름과 과목 코드가 붙어 있다.
//                                        '이동기'의 '이동'이 「물질 이동」에 걸려 의학과가 붙었다.
// 괄호 안 코드를 떼고, 내용이 없는 껍데기 과목은 아예 안 본다. 학생에게 보여 줄 것도 못 된다.
const EMPTY_COURSE = /(연구멘토링|특강|세미나|논문지도|논문연구|현장실습|졸업논문|인턴십|캡스톤|자율연구|개별연구|독립연구)/;
export function cleanCourse(name) {
  // 괄호를 떼면 짝 없는 괄호가 남는 줄이 있다("인간·사회·의료)"). 남은 것도 지운다.
  const bare = clean(name, 60).replace(/\([^)]*\)/g, '').replace(/[()[\]{}]/g, '').replace(/\s+/g, ' ').trim();
  if (!bare || bare.length < 2) return '';
  if (EMPTY_COURSE.test(bare)) return '';
  return bare;
}

// **교과목은 연구 제목보다 엄하게 본다.**
//
// 연구 제목에는 접미사 한 글자까지 봐줬다(암석 ⊂ 암석권). 교과목에 그 규칙을 쓰니 이렇게 됐다:
//   「원자의 구조」(화학) → "원자력 계측제어 및 실험" → 원자력및양자공학과
// '원자'와 '원자력'은 다른 것이다. 그런데 '효소'와 '효소학'은 같은 것이다. 둘 다 한 글자 차이라
// 길이로는 못 가른다. 그래서 **학문 이름을 만드는 접미사만** 봐준다 — 학·론·사·법.
const FIELD_SUFFIX = /^(.+)(학|론|사|법)$/;
// **교과목에서는 조사를 떼지 않는다.** 교과목 이름은 문장이 아니라 명사구라 조사가 거의 안 붙는다.
// 떼었더니 "원자로 이론"의 '원자로'가 '원자'가 되어 「원자의 구조」에 원자력공학과가 붙었다.
export function courseTouches(course, aim) {
  for (const word of words(course)) {
    if (aim.has(word)) return true;
    const cut = FIELD_SUFFIX.exec(word);
    if (cut && cut[1].length >= 2 && aim.has(cut[1])) return true;
  }
  return false;
}

// 과목과 학과 계열이 맞는가.
//
// 이게 없을 때 이렇게 붙었다:
//   「광합성과 세포 호흡」(생명과학) → 서울대 **기악과(관악전공)** — "호흡법"
// 관악기 부는 호흡이다. 낱말로는 절대 못 가른다. 계열로 막는 것이 맞다.
const SCIENCE = /^(물리|화학|생명과학|지구과학|통합과학|과학탐구실험|세포와|물질과|역학과|전자기와|지구시스템|정보)/;
const HUMANITY = /^(공통국어|통합사회)/;
export function groupFits(subject, group) {
  const name = clean(subject, 40);
  const field = clean(group, 20).replace(/\s|ㆍ|·/g, '');
  if (!field) return true;              // 계열이 안 적힌 학과는 막지 않는다
  if (SCIENCE.test(name)) return /(자연과학|공학|의학)/.test(field);
  if (HUMANITY.test(name)) return /(인문|사회|교육)/.test(field);
  return true;
}

// 과학탐구실험에는 학과를 안 붙인다.
//
// 「갈릴레이의 경사면 실험」·「도량형의 역사 추적하기」는 **학교에서 하는 활동**이지 학문 분야가 아니다.
// 억지로 붙이니 이렇게 됐다:
//   「도량형의 역사 추적하기」 → 기초교육학부 "국제관계의 **역사**"
//   「생체 신호와 건강 데이터」 → 미래모빌리티학과 "자율주행 **데이터** 처리"
// 연구는 붙여도 되지만(주제는 있으니) 학과는 아니다.
const NO_MAJOR = /^과학탐구실험/;

// 국어 개념에는 외국어문학과를 붙이지 않는다.
//
// 「문학·독서와 주체적 수용」에 노어노문학과가 붙어서 지웠더니 불어불문학과가 올라왔다. 한 곳을
// 지워도 같은 종류가 줄줄이 올라온다. 손으로 지울 일이 아니라 규칙으로 막을 일이다.
const FOREIGN_LIT = /(영어|영문|불어|불문|노어|노문|중어|중문|일어|일문|독어|독문|서어|서문|아랍|러시아|프랑스|중국|일본|독일|이탈리아|스페인|포르투갈|베트남|태국|인도|몽골|터키|이란|국제어문)/;

// 이 대학의 학과 가운데 이 개념에 닿는 것을 고른다. 닿는 것이 없으면 아무것도 안 준다.
export function pickMajor(majors, { concept = '', subject = '', spread = null } = {}) {
  if (NO_MAJOR.test(clean(subject, 40))) return null;
  const aim = new Set(pointers(concept, subject));
  if (!aim.size) return null;
  const korean = /^공통국어/.test(clean(subject, 40));
  const sharp = new Set(spread ? [...aim].filter((one) => (spread.get(one) || 1) < 3) : []);
  let best = null;
  for (const major of Array.isArray(majors) ? majors : []) {
    if (!groupFits(subject, major.group)) continue;
    if (korean && FOREIGN_LIT.test(String(major.major || ''))) continue;
    const clean2 = (major.courses || []).map(cleanCourse).filter(Boolean);
    const courses = [...new Set(clean2.filter((one) => courseTouches(one, aim)))];
    if (!courses.length) continue;
    // 흔한 말 하나로만 걸린 것은 버린다. 연구를 고를 때와 같은 규칙이다.
    if (sharp.size && !courses.some((one) => courseTouches(one, sharp))) continue;
    const score = courses.length;
    if (!best || score > best.score || (score === best.score && (major.quota || 0) > (best.quota || 0))) {
      best = {
        name: clean(major.major, 60),
        college: clean(major.college, 40),
        group: clean(major.group, 20),
        quota: major.quota || 0,
        // **그 학과에서 이 개념을 실제로 배우는 과목**만 보여 준다. 학과의 전체 커리큘럼이 아니다.
        courses: courses.slice(0, 4).map((one) => clean(one, 40)),
        jobs: (major.jobs || []).slice(0, 3).map((one) => clean(one, 30)),
        score,
      };
    }
  }
  if (!best) return null;
  const { score, ...rest } = best;
  return rest;
}

// 학과 한 줄. "이 학과를 가라"가 아니라 "거기서는 이걸 배운다"다.
export function majorLine(major) {
  const name = clean(major?.name, 60);
  if (!name) return '';
  const courses = (major.courses || []).slice(0, 3).join(' · ');
  return courses ? `${name} — ${courses}` : name;
}

// ─── 학생 과제문으로 고르기 ────────────────────────────────────────────────
//
// **여기가 빠져 있었다.** 사용자가 짚어 줬다.
//
// 책은 처음부터 학생 과제문의 낱말로 점수를 매겨 골랐다(matchBooks 의 keyword). 그런데 내가 새로
// 만든 논문·대학 연구는 `인덱스[과목::개념]` 으로 표를 찾기만 했다. 그러면 「효소와 대사 반응」 과제가
// 온도를 다루든 세제를 다루든 **같은 논문 2편**이 나온다. 그건 "이 개념엔 이게 정답"이라고 박아 둔 것이다.
//
// 우리 제품은 완성본을 파는 것이 아니라 **학생이 낸 수행평가를 읽고** 거기에 맞춰 주는 것이다.
// 그래서 인덱스에는 후보를 넉넉히 담아 두고, **고르는 일은 과제문을 보고** 여기서 한다.
//
// 다만 **무엇이 존재하는지는 여전히 우리가 정한다.** 그것까지 AI에게 넘기면 없는 논문을 지어낸다 —
// 이 저장소가 처음부터 막아 온 일이다. 정리하면:
//   · 논문이 실제로 있는가        → 우리가 정한다 (국가 기록에서 가져온다)
//   · 이 과제에 어느 것이 맞는가   → 과제문이 정한다
const TASK_NOISE = new Set([
  '보고서', '작성', '탐구', '수행', '평가', '기준', '제출', '분량', '자료', '조사', '정리', '분석',
  '내용', '방법', '과정', '결과', '이상', '이하', '가지', '대해', '통해', '위해', '중심', '다음',
  '학생', '선생', '수업', '활동', '주제', '단원', '과목', '학년', '학교', '출처', '참고',
]);

// 과제문에서 쓸 만한 낱말만 남긴다.
export function taskWords(text) {
  const kept = new Set();
  for (const raw of String(text || '').split(/[^가-힣A-Za-z0-9]+/)) {
    const word = stem(raw);
    if (word.length < 2) continue;
    if (TASK_NOISE.has(word) || NOT_POINTING.has(word)) continue;
    kept.add(word);
  }
  return kept;
}

// 과제문 낱말이 이 제목에 보이는가.
//
// **교과목 규칙(courseTouches)을 그대로 쓰면 안 된다.** 실제 화면에서 잡았다. 논문 제목은 교과목
// 이름과 다르다 — 조사가 붙고 긴 복합어가 나온다:
//   "ETV6-PDGFRB 유전자 **재배열을** 동반한 … 급성림프모구**백혈병** 1예"
// 교과목 규칙은 조사를 안 떼므로 '재배열을' ≠ '재배열' 이고, 포함을 안 보므로
// '급성림프모구백혈병' 에서 '백혈병' 을 못 찾는다. 그래서 논문이 한 건도 안 붙었다.
//
// 여기서는 조사를 떼고, **세 글자 이상이면 붙어 있는 말 안에서도 찾는다.** 두 글자는 정확히 맞춘다 —
// 두 글자로 포함을 보면 아무 데나 걸린다('원자'가 '원자로'에). 그리고 이 함수는 **이미 개념으로
// 걸러진 후보 안에서 순위를 매기는** 일이라, 조금 느슨해도 엉뚱한 주제가 끼어들지 않는다.
// 두 글자 낱말에서는 **'로'를 떼지 않는다.** 그걸 떼면 '원자로'가 '원자'가 된다 — 교과목에서
// 이미 겪은 일이다. 목적격·주격처럼 명백한 조사만 뗀다.
const SHORT_JOSA = /(을|를|이|가|은|는|의|에|와|과|도|만)$/;
export function taskHit(text, word) {
  const body = String(text || '');
  if (word.length >= 3) return body.includes(word);
  return words(body).some((one) => one === word || one.replace(SHORT_JOSA, '') === word);
}

// 후보 가운데 이 과제문에 가장 가까운 것을 고른다.
//
// **개념 낱말은 점수에서 뺀다.** 후보는 이미 개념으로 걸러져 왔으므로 전부 개념 낱말을 갖고 있다.
// 후보들을 **가르는** 것은 과제문의 나머지다 — 온도·세제·pH·플라스틱 같은 말.
// 이걸 안 빼서 「효소가 온도에 따라…」 과제에 "바이오 전환 원천 효소 및 균주 개발"이 붙었다.
// '효소'만 같고 온도와는 아무 상관이 없는 논문이었다.
//
// **strict 이면, 가르는 말에 아무것도 안 걸릴 때 빈 배열을 준다.**
// 논문은 학생이 한 실험을 **받치는** 것이다. 주제어 하나 같다고 붙이면, 받치는 것이 아니라
// 끼워 넣는 것이 된다. 받칠 근거가 없으면 안 붙이는 편이 낫다.
export function pickForTask(list, text, limit = 2, { skip = '', strict = false } = {}) {
  const rows = Array.isArray(list) ? list : [];
  if (!rows.length) return [];
  if (!strict && rows.length <= limit) return rows.slice(0, limit);
  const skipWords = taskWords(skip);
  const aim = new Set([...taskWords(text)].filter((word) => !skipWords.has(word)));
  if (!aim.size) return strict ? [] : rows.slice(0, limit);
  const scored = rows.map((row, at) => {
    // 제목이 먼저다. 요약·키워드는 덤으로 센다.
    const head = clean(row?.title, 200);
    const rest = [clean(row?.summary, 200), clean(row?.keywords, 200), clean(row?.journal, 80)].filter(Boolean).join(' ');
    const hit = [...aim].filter((word) => taskHit(head, word)).length;
    const extra = [...aim].filter((word) => taskHit(rest, word)).length;
    return { row, at, score: hit * 3 + extra };
  });
  if (!scored.some((one) => one.score > 0)) return strict ? [] : rows.slice(0, limit);
  // 점수가 같으면 인덱스 차례를 지킨다. 인덱스 차례에는 이미 '쉬운 글이 먼저'가 들어 있다.
  scored.sort((a, b) => b.score - a.score || a.at - b.at);
  // strict 이면 **맞은 것만** 준다. 하나라도 맞으면 나머지(0점)로 개수를 채우던 탓에, 기후 변화 과제에
  // 「자동차 온실가스 지문」이, 공공데이터 셋 가운데 둘이 무관하게 딸려 올 수 있었다(2026-09-18 발견).
  const kept = strict ? scored.filter((one) => one.score > 0) : scored;
  return kept.slice(0, limit).map((one) => one.row);
}
