// 참고 사례(seed-bank)가 **학생 과제를 끌고 가지 못하게** 한다.
//
// 운영 사이트 테스트(2026-09-18)에서 나온 일이다. 지구과학 「해수면 온도 · 기후 변화」 과제에 원전 냉각
// 사례가 골라졌고, 두 가지 길로 보고서가 원전 쪽으로 끌려갔다.
//   1. 사례의 **블로그 제목**이 학생 키워드 자리에 그대로 들어갔다 —
//      「[원자력/지구 과학] 기후변화가 초래하는 원전 냉각 위기 … 일반고 세특 보고서 추천」
//   2. 사례의 내용(기초·심화 주제)이 프롬프트에 들어갔다
// 결과 제목이 「… 발전소 냉각 여유 축소」가 됐고, 느낀 점에 학생이 쓰지 않은 「수업에서 배운 응축기」가
// 지어져 들어갔다. 학생이 낸 길을 사례가 덮은 것이다 — 이번 작업의 원칙(학생 과제가 길이다)과 반대다.
import { taskWords } from './univ_research_v1.mjs';

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

// 블로그·홍보 글 제목 모양. 키워드가 아니다.
//   「[원자력/지구 과학] …」 대괄호 머리, 「세특 보고서 추천」·「탐구 보고서 추천」·「일반고」·「자사고 특목고」 꼬리,
//   그리고 키워드라 부르기엔 너무 긴 것.
const BLOG = /(보고서\s*추천|세특|일반고|자사고|특목고|과학중점고|무료\s*세특|^\s*\[[^\]]{1,30}\])/;
export function isBlogTitle(value) {
  const text = clean(value, 400);
  return Boolean(text) && (BLOG.test(text) || text.length > 40);
}

// 키워드로 쓸 수 있는 것만. 블로그 제목이면 빈칸 — 부르는 쪽이 개념으로 물러선다.
export function cleanKeyword(value) {
  const text = clean(value, 200);
  return isBlogTitle(text) ? '' : text;
}

// 이 사례가 학생 과제와 얼마나 겹치는가(0~1). 사례 이름의 내용 낱말 가운데 과제 글에 닿는 것의 비율.
// 원전 사례는 25%(원전·냉각수·열교환기·수명연장이 과제에 없다), 맞는 사례는 88%였다.
export const SEED_FIT_MIN = 0.4;
export function seedFit(label, taskText) {
  const mine = [...taskWords(taskText)];
  const theirs = [...taskWords(label)];
  if (!theirs.length || !mine.length) return 0;
  const hit = theirs.filter((word) => mine.some((one) => one.includes(word) || word.includes(one)));
  return hit.length / theirs.length;
}
export const seedFitsTask = (label, taskText) => seedFit(label, taskText) >= SEED_FIT_MIN;
