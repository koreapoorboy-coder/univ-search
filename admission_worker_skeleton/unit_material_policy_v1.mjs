// **안내문이 말하지 않은 자료는 단원표가 「준다」라고 한 것만 준다.**
//
// 사용자 결정 2026-09-30. 그대로 옮긴다:
//   「수행평가에서 들어가야 되는 건 들어가는 게 맞아. 당연하게 들어가야지. 그런데 그런 언급이 없는 거에
//    들어가야 되는지 안 들어가야 되는지에 대한 판단이잖아. 그래서 우리가 구조를 잡자는 거야.
//    왜냐면 들어가도 되고 안 들어가도 되는 건데 이거를 우리가 매번 보고서마다 판단할 수 없으니까.」
//
// 실제 과제 3,342건을 세어 보니 이렇다(2026-09-30):
//   안내문이 자료를 요구한 과제      578건 (17%)  ← 당연히 준다. 다툴 것이 없다.
//   안내문이 아무 말도 안 한 과제   2,400건 (72%)  ← 이 자리의 판단이 문제였다.
// 그동안 이 판단이 **낱말 점수**에 맡겨져 있었다. 그래서 「힘과 운동」에 『패러데이와 맥스웰』이
// '자기장' 으로, 고려 단원에 『성호사설』이 '조선' 으로 붙었다. 그리고 나는 「붙는 비율」을 올리려고
// 계속 억지를 넣게 되었다(2026-09-30 감사에서 새로 생긴 억지 154개를 찾았다).
//
// 그래서 **단원마다 한 번 정해 둔다.** 단원은 371개로 셀 수 있고 사람이 읽고 고칠 수 있다.
// 낱말은 무한하고 애매하다.
//
// **단원으로 정할 수 있는 것만 정한다**(실측으로 갈랐다):
//   · 「실험이냐 논술이냐」는 **단원으로 못 정한다.** 같은 단원을 선생님마다 다르게 낸다 —
//     「물질의 양과 화학 반응식」 146건이 실험 61 · 말없음 48 · 논술 48 이다. 한 갈래로 또렷한 단원은
//     8% 뿐이었다. 그래서 방법은 안내문이 정한다(resolveCollectionKind).
//   · 「어떤 자료를 쓰는 단원인가」는 **정할 수 있다.** 단원은 고정이고 그 단원에 붙을 자료도 고정이다.
//     선생님이 바꿀 수 없다. 이 표가 다루는 것은 이쪽뿐이다.

export const MATERIAL = Object.freeze({ PAPER: '논문', RESEARCH: '대학연구', DATASET: '통계', BOOK: '책' });

// 안내문이 그 자료를 요구했는가. **넓게 잡는다** — 요구를 못 읽어서 안 주는 것이
// 요구 없는데 주는 것보다 나쁘다. 학생이 안내문을 지키지 못한 보고서를 내게 되기 때문이다.
const DEMAND = Object.freeze({
  [MATERIAL.PAPER]: /논문|선행\s*연구|문헌/,
  // 대학 연구도 논문과 같은 자리에 쓰인다 — 안내문이 「선행 연구」를 요구하면 둘 다 받는다.
  [MATERIAL.RESEARCH]: /논문|선행\s*연구|문헌|연구\s*사례/,
  [MATERIAL.DATASET]: /통계|데이터|빅데이터|지표|자료\s*해석/,
  [MATERIAL.BOOK]: /독서|도서|책을|책\s*읽|서평|읽고/,
  // 「참고문헌」·「출처」·「인용」을 요구하면 어느 자료든 하나는 있어야 한다. 아래에서 따로 본다.
});
const ANY_SOURCE = /참고\s*문헌|출처|인용/;

export function demandsMaterial(taskText, kind) {
  const text = String(taskText || '');
  if (ANY_SOURCE.test(text)) return true;
  const rule = DEMAND[kind];
  return Boolean(rule && rule.test(text));
}

// 이 단원에서 그 자료를 줄 것인가.
//
// 표에 없는 단원은 **막지 않는다.** 표가 아직 못 따라온 단원 때문에 자료가 사라지면, 표를 만든 일이
// 손해가 된다. 새 단원이 생기면 tools/build_unit_material_policy_v1.mjs 가 잡아 준다.
export function allowsMaterial(policy, { subject, concept, taskText, kind }) {
  if (demandsMaterial(taskText, kind)) return true;
  const rows = policy?.policy || policy || {};
  const row = rows[`${String(subject || '')}::${String(concept || '')}`];
  if (!row) return true;
  return row[kind] === '준다';
}

// 왜 안 줬는지 학생에게 말해야 할 때가 있다 — **안내문이 요구했는데 우리에게 없을 때**다.
// 조용히 넘어가면 학생은 자기 보고서가 안내문을 못 지켰다는 것을 모른다(사용자 결정 2026-09-30).
export function missingDemanded(policy, { subject, concept, taskText }, 있는것) {
  const out = [];
  for (const kind of Object.values(MATERIAL)) {
    if (!demandsMaterial(taskText, kind)) continue;
    if (있는것?.[kind]) continue;
    out.push(kind);
  }
  return out;
}
