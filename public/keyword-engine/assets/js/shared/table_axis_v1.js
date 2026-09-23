// 표의 첫 칸 머리말 — **화면과 워커가 같은 파일을 쓴다.**
//
// 「조건」이 늘 맞는 것은 아니다. 검수 시험 2026-09-22(데이터 과학): 줄이 「1월·3월·5월」인
// 표의 머리말이 「조건」이었고 표 제목도 「조건별 공공자전거 대여 건수」였다. 달은 조건이 아니다.
// 학생이 그대로 제출하면 선생님이 먼저 보는 것이 이 머리말이다.
//
// 지어내지 않는다. **모든 줄이 같은 꼴일 때만** 이름을 바꾸고, 아니면 「조건」으로 둔다.
const AXIS = [
  [/^\d{1,2}\s*월$/, '월'],
  [/^(19|20)\d{2}\s*년$/, '연도'],
  [/^[1-4]\s*분기$/, '분기'],
  [/^[월화수목금토일]요일$/, '요일'],
  [/^(고|중|초)?\s*[1-6]\s*학년$/, '학년'],
];

export function rowAxisName(labels, fallback = '조건') {
  const list = (Array.isArray(labels) ? labels : [])
    .map((one) => String(one ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (list.length < 2) return fallback;
  const hit = AXIS.find(([pattern]) => list.every((one) => pattern.test(one)));
  return hit ? hit[1] : fallback;
}
