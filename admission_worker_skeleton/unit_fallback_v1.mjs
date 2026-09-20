// 과제 글이 단원을 말하지 않을 때 **우리가** 단원을 정한다.
//
// 왜 학생에게 묻지 않는가. 학생은 단원 이름을 모른다. 「힘과 운동」과 「역학적 에너지」 중 무엇인지
// 고르라고 하면 찍는다. 찍은 단원은 우리가 고른 것보다 나쁘다 — 틀렸을 때 학생 탓이 되고, 학생은
// 자기가 뭘 골랐는지도 모른다.
//
// 왜 필요한가. 진짜 수행평가 2,473건 중 **567건은 과제 글에 주제가 없다**. 「과제」, 「발표」,
// 「실험 및 보고서」, 「자유주제탐구」 — 선생님이 "알아서 정해 와"라고 한 것이다. 지금 엔진은 이때
// 단원을 비워 두고 그냥 보고서를 쓴다. 오류 화면은 안 뜨지만 논문도 책도 안 붙어 속이 빈다.
//
// 차례는 **단단한 것부터**다.
//   1. 전공이 실제로 배우는 단원 — 대학 33곳 교육과정이 고교 단원에 직접 이어 둔 것
//   2. 전공 수업 제목으로 찾은 단원 — 유체역학·열전달 → 물리 「에너지와 열」
//   3. 전공 이름으로 찾은 종단 축 — 뜻이 흐려서 세 번째다
//   4. 그 과목 수행평가에서 **가장 자주 나오는 단원** — 아무것도 없을 때
//
// 학생이 이미 쓴 단원(생활기록부)은 빼고 고른다. 같은 학생이 같은 단원으로 두 번 쓰면 생활기록부에
// 같은 말이 두 번 올라간다.
import { matchAxes, expandMajorTerms } from './upload_analysis_v1.mjs';

const clean = (value, max = 80) => String(value ?? '').trim().slice(0, max);
const plain = (value) => String(value || '').replace(/\s+/g, '').replace(/\d+$/, '');

// 고른 까닭. 나중에 어느 길이 얼마나 쓰였는지 세려고 남긴다.
export const UNIT_SOURCE = {
  TASK: 'task',                 // 과제 글이 말했다(여기 오기 전에 정해진다)
  MAJOR_CURRICULUM: 'major_curriculum',
  MAJOR_COURSE: 'major_course',
  MAJOR_AXIS: 'major_axis',
  SUBJECT_DEFAULT: 'subject_default',
  NONE: 'none',
};

export function chooseUnit({
  subject, major = '', interests = [], axisIndex = null,
  majorSubjectIndex = null, defaultUnitIndex = null, used = [],
} = {}) {
  const want = clean(subject, 40);
  if (!want) return { concept: '', from: UNIT_SOURCE.NONE };
  const skip = new Set((Array.isArray(used) ? used : []).map((one) => plain(one)).filter(Boolean));
  const take = (list, from) => {
    for (const one of Array.isArray(list) ? list : []) {
      const concept = clean(one, 80);
      if (concept && !skip.has(plain(concept))) return { concept, from };
    }
    return null;
  };

  // 1·2. 전공 × 과목 표. from 이 'curriculum' 이면 대학 교육과정이 직접 이어 둔 것이다.
  const fromMajor = (majorSubjectIndex?.majors || {})[clean(major, 40)];
  const cell = fromMajor ? (fromMajor[want] || fromMajor[plain(want)]) : null;
  if (cell) {
    const hit = take(cell.concepts, cell.from === 'curriculum' ? UNIT_SOURCE.MAJOR_CURRICULUM : UNIT_SOURCE.MAJOR_COURSE);
    if (hit) return hit;
  }

  // 3. 전공·관심사 낱말로 **그 과목 안에서만** 축을 찾는다.
  if (axisIndex) {
    const terms = [
      ...expandMajorTerms(major),
      ...(Array.isArray(interests) ? interests : []).flatMap((one) => expandMajorTerms(one)),
    ];
    if (terms.length) {
      const found = matchAxes(terms, axisIndex, 4, want).map((axis) => axis.concept);
      const hit = take(found, UNIT_SOURCE.MAJOR_AXIS);
      if (hit) return hit;
    }
  }

  // 4. 그 과목에서 가장 자주 나오는 단원. 이미 쓴 단원이어도 여기서는 그대로 쓴다 —
  //    아무것도 안 주는 것보다는 낫다.
  const fallback = clean((defaultUnitIndex?.subjects || {})[want]?.concept, 80);
  if (fallback) return { concept: fallback, from: UNIT_SOURCE.SUBJECT_DEFAULT };

  return { concept: '', from: UNIT_SOURCE.NONE };
}
