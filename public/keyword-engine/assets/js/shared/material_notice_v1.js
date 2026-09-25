// **우리가 무엇을 줬는지 학생에게 말한다.** 화면과 설명서가 같은 말을 쓴다.
//
// 왜 필요한가(2026-09-25). 논문·책·공개 자료가 하나도 안 붙을 때 학생은 **그냥 보고서를 받는다.**
// 참고 자료 칸에는 교과서 한 줄만 있고, 우리가 못 줬다는 사실을 학생은 모른다.
// 그러면 「참고문헌이 교과서 하나뿐인데 괜찮나」를 학생이 판단할 수 없다.
//
// 그리고 얼마나 자주 그런지 재 보았다 — 논문은 과제 1,761건 중 **183건(10.4%)** 에만 붙는다.
// 즉 **열에 아홉은 자료가 없다.** 그것을 말하지 않는 것은 조용히 빠뜨리는 것이다.
//
// 자료를 더 붙이는 쪽도 재 보았고 막혔다: 중심 낱말에 문턱을 걸으니 붙는 비율이 10.4% → 8.7% 로
// 줄었는데 **좋은 것이 떨어지고 나쁜 것이 남았다**(「머신러닝 탐구」 ← 「머신러닝 기반 오이 생육
// 예측」이 떨어지고 「프로그램 작성하기」 ← 「VR 신체활동 프로그램」이 남았다).
// 그래서 매칭을 손보는 대신 **말을 사실에 맞춘다.**

// 준 것을 사람이 읽는 말로. 없으면 빈 문자열이다.
export function gaveText(gave = {}) {
  const parts = [
    [Number(gave.papers) || 0, '논문', '편'],
    [Number(gave.books) || 0, '책', '권'],
    [Number(gave.datasets) || 0, '공개 자료', '개'],
    [Number(gave.tables) || 0, '숫자 표', '장'],
  ];
  return parts.filter(([n]) => n > 0).map(([n, name, unit]) => `${name} ${n}${unit}`).join(', ');
}

export const gaveNothing = (gave = {}) => !gaveText(gave);

// 자료를 못 찾았을 때. **학생이 자기가 할 일을 알아야 한다.**
export const NO_MATERIAL = '<b>이 주제에 맞는 읽을 자료는 찾지 못했어요.</b>'
  + ' 자료는 직접 찾아서 참고 자료에 적어 주세요 — 선생님이 「무엇을 읽었니」 하고 물을 수 있어요.';

// 글쓰기가 아닌 보고서(실험·자료·문헌)에 붙는 한 줄.
// 글쓰기 과제는 writing_task_v1.js 가 따로 말한다 — 거기서는 「글은 대신 안 써 준다」가 먼저다.
// 받침이 있으면 「을」, 없으면 「를」. 「공개 자료 2개을」처럼 나오면 학생이 먼저 눈치챈다.
export function withObject(word) {
  const last = String(word || '').trim().slice(-1);
  // 숫자로 끝나면 읽는 소리로 본다: 0·1·3·6·7·8 은 받침이 있다(영·일·삼·육·칠·팔).
  if (/[0-9]/.test(last)) return '0136780'.includes(last) ? `${word}을` : `${word}를`;
  const code = last.charCodeAt(0) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasFinal ? '을' : '를'}`;
}

export function materialNotice(gave = {}) {
  const what = gaveText(gave);
  if (what) return `읽어 볼 <b>${what}</b>${withObject(what).slice(what.length)} 함께 드렸어요. 열어 보고 참고 자료에 적어 주세요.`;
  return NO_MATERIAL;
}
