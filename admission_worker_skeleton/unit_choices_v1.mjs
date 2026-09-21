// 과제 글이 주제를 말하지 않을 때 **학생에게 보여 줄 키워드 목록**을 만든다.
//
// 왜 목록인가. 학생에게 「무엇을 탐구할래요?」라고 빈칸을 주면 못 씁니다 — 단원 이름을 모르고, 무엇이
// 가능한지도 모릅니다. 반대로 우리가 말없이 정하면(2026-09-21 유료 시험) 「연습문제 풀이」 과제에
// 「보호필름 정전기 실험 설계」가 나옵니다. 학생은 제출할 수 없습니다.
//
// 그래서 **우리가 고르고 학생이 확인하는** 모양으로 만든다. 고를 거리를 몇 개 보여 주고, 학생은
// 자기 수업에서 배운 것을 짚기만 하면 된다. 그건 학생이 아는 것이다.
//
// 재료는 이미 다 있다(seed/textbook-v1/subject_concept_engine_map.json, 184단원 전부):
//   · micro_keywords      — 그 단원에서 실제로 쓰는 낱말(속도, 가속도, 등가속도 운동…)
//   · student_topics      — 학생 말로 쓴 탐구 질문
//   · linked_career_bridge — 그 단원이 이어지는 진로 분야(기계공, 항공우주공…)
//
// 차례는 **진로와 이어지는 단원이 위**다. 그래야 학생이 자기 것을 먼저 본다.
import { expandMajorTerms } from './upload_analysis_v1.mjs';

const clean = (value, max = 80) => String(value ?? '').trim().slice(0, max);
const plain = (value) => String(value || '').replace(/\s+/g, '');

// 왜 위에 올렸는지. 학생에게 그대로 보여 준다 — 우리가 고른 까닭을 숨기지 않는다.
export const CHOICE_WHY = {
  MAJOR_CURRICULUM: 'curriculum',   // 그 전공이 대학에서 실제로 배우는 단원
  CAREER_BRIDGE: 'career',          // 그 단원이 이어지는 진로 분야에 학생 전공이 있다
  BOTH: 'both',                     // 둘 다
  PLAIN: 'plain',                   // 진로와의 연결은 없지만 그 과목의 단원이다
};

export function unitChoices({
  subject, major = '', interests = [], conceptMap = null, majorSubjectIndex = null,
  used = [], limit = 6, keywords = 5,
} = {}) {
  const want = clean(subject, 40);
  const own = conceptMap ? (conceptMap[want] || conceptMap[plain(want)]) : null;
  const concepts = Object.entries(own?.concepts || {});
  if (!concepts.length) return [];

  // 학생 전공을 낱말로 쪼갠다. 「기계공학과」는 진로 칸의 「기계공」과 글자가 겹치지 않으므로
  // 「기계」까지 만들어야 만난다(expandMajorTerms).
  const terms = [
    ...expandMajorTerms(major),
    ...(Array.isArray(interests) ? interests : []).flatMap((one) => expandMajorTerms(one)),
  ].map((one) => one.term);

  // 대학 교육과정이 이 전공 × 이 과목에 지목한 단원. 가장 단단한 근거다.
  const cell = (majorSubjectIndex?.majors || {})[clean(major, 40)];
  const fromCurriculum = new Set(((cell && (cell[want] || cell[plain(want)]))?.concepts) || []);

  const skip = new Set((Array.isArray(used) ? used : []).map((one) => plain(one)).filter(Boolean));

  const rows = [];
  for (const [concept, body] of concepts) {
    const bridge = (body?.linked_career_bridge || []).map((one) => clean(one, 30)).filter(Boolean);
    // 「기계공」과 「기계」처럼 한쪽이 다른 쪽에 들어 있으면 이어진 것으로 본다.
    const hitCareer = bridge.filter((one) => terms.some((term) => one.includes(term) || term.includes(one)));
    // **진로 연결을 더 무겁게 둔다.** 대학 교육과정 표는 그 전공이 배우는 과목을 말하지만, 단원마다
    // 손으로 적어 둔 진로 칸(linked_career_bridge)이 주제에 더 가깝다 — 기계공학과 학생에게
    // 「물질의 전기적 특성」(전공 수업에 전기공학이 있어서)보다 「힘과 운동」이 먼저여야 한다.
    const onCurriculum = fromCurriculum.has(concept);
    const why = hitCareer.length && onCurriculum ? CHOICE_WHY.BOTH
      : hitCareer.length ? CHOICE_WHY.CAREER_BRIDGE
        : onCurriculum ? CHOICE_WHY.MAJOR_CURRICULUM : CHOICE_WHY.PLAIN;
    const rank = -((hitCareer.length ? 2 : 0) + (onCurriculum ? 1 : 0));
    rows.push({
      concept,
      // 학생이 짚을 낱말. 너무 많이 보여 주면 고르지 못한다.
      keywords: (body?.micro_keywords || []).map((one) => clean(one, 40)).filter(Boolean).slice(0, keywords),
      // 학생 말로 쓴 탐구 질문 한 줄. 없으면 빈 문자열이다(미적분1 은 아직 없다).
      topic: clean((body?.student_topics || [])[0], 200),
      why,
      career: hitCareer.slice(0, 3),
      // 이미 쓴 단원은 지우지 않고 **뒤로 보내고 표시**한다 — 학생이 일부러 또 하고 싶을 수 있다.
      done: skip.has(plain(concept)),
      rank,
    });
  }
  rows.sort((a, b) => (a.done - b.done) || (a.rank - b.rank) || a.concept.localeCompare(b.concept, 'ko'));
  return rows.filter((row) => row.keywords.length).slice(0, limit)
    .map(({ rank, ...row }) => row);
}

// 학생이 고른 낱말이 어느 단원의 것인가. 화면이 낱말만 돌려보내도 단원을 되찾을 수 있어야 한다.
export function conceptOfKeyword({ subject, keyword, conceptMap = null } = {}) {
  const want = clean(subject, 40);
  const pick = plain(keyword);
  if (!pick) return '';
  const own = conceptMap ? (conceptMap[want] || conceptMap[plain(want)]) : null;
  for (const [concept, body] of Object.entries(own?.concepts || {})) {
    if (plain(concept) === pick) return concept;
    for (const word of body?.micro_keywords || []) if (plain(word) === pick) return concept;
  }
  return '';
}
