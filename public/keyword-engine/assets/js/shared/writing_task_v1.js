// **학생 자신의 글이 점수인 과제.** 화면과 워커가 같은 규칙을 본다.
//
// 사장님 판단(2026-09-25): 「국어랑 영어 글쓰기·논평·서평은 우리가 해 줄 수 있는 형태가 아니다.」
// 확인해 보니 맞았다. 국어·영어 과제 379건 중 **206건(54%)** 이 학생 자신의 글이고,
// 우리 형태(자료를 모아 정리하는 보고서)에 맞는 것은 **8건(2%)** 뿐이다.
//
// 이유가 셋이다.
//   ① 우리 보고서의 뼈대는 **학생이 넣은 것**이다. 잰 숫자, 옮긴 자료, 적은 메모.
//      글쓰기 과제는 학생이 넣을 것이 없어서 전부 우리 글이 된다.
//   ② 우리 안전 장치는 **숫자**를 본다. 문학 감상문에 걸어 보니
//      「이 작품은 1936년에 발표되었고 …」가 **통째로 지워졌다** — 표에 없는 숫자라서다.
//      켜면 글이 사라지고, 끄면 지어내기를 막을 것이 하나도 없다.
//   ③ 문학 작품의 원문을 우리가 갖고 있지 않다. 인용하면 지어낸 것이다.
//
// 그래서 **글을 대신 쓰지 않는다.** 대신 읽을 자료와 뼈대를 주고, 그것을 학생에게 분명히 말한다.
// 막지는 않는다 — 뼈대와 자료도 학생에게는 큰 도움이고, 막으면 아무것도 못 준다.

import { NO_MATERIAL, gaveText } from './material_notice_v1.js';

export const WRITING = Object.freeze({
  CRITIQUE: 'critique',     // 서평·독후감
  ARGUMENT: 'argument',     // 논술·논설·논증
  CREATIVE: 'creative',     // 시·소설 창작
  ESSAY: 'essay',           // 에세이(영어 포함)
  RESPONSE: 'response',     // 감상·비평·논평
  NONE: '',
});

// 낱말은 **과제 이름과 안내문**에서 본다. 방식표(taskType)는 학년 공통 양식이라 칸이 다 켜져 있어 못 믿는다.
const RULES = [
  [WRITING.CRITIQUE, /서평|독후감|독서 ?감상|책을 ?읽고|도서를 ?읽고/],
  [WRITING.ARGUMENT, /논술문|논설문|논증하는 ?글|논증적 ?글|주장하는 ?글|설득하는 ?글|찬반 ?의견|반론/],
  [WRITING.CREATIVE, /시를 ?창작|시 ?쓰기|소설을 ?쓰|수필을 ?쓰|창작하여|운문 ?창작|극본|대본을 ?쓰/],
  [WRITING.ESSAY, /에세이|essay/i],
  // 2026-09-25: 국어 과제를 다시 훑다 보니 두 건이 빠져 있었다 — 「문학 감상 일지」와 「시 처방하기」.
  // 둘 다 학생이 작품을 읽고 자기 말을 쓰는 과제인데, 「감상문」·「비평문」만 보고 있어서 못 읽었다.
  [WRITING.RESPONSE, /감상문|비평문|평론|논평|감상 ?및 ?발표|작품을 ?감상|감상 ?일지|독서 ?일지|시 ?처방|감상지|감상평/],
];

export function writingKind(input) {
  const text = [input?.taskName, input?.taskDescription].filter(Boolean).join(' ');
  if (!text.trim()) return WRITING.NONE;
  const hit = RULES.find(([, test]) => test.test(text));
  return hit ? hit[0] : WRITING.NONE;
}

export const isWritingTask = (input) => writingKind(input) !== WRITING.NONE;

// 학생에게 보여 줄 말. **무엇을 주고 무엇을 안 주는지** 먼저 말한다.
const NOTICE = {
  [WRITING.CRITIQUE]: '이 과제는 <b>내가 읽고 느낀 것</b>이 점수예요.',
  [WRITING.ARGUMENT]: '이 과제는 <b>내 주장과 근거</b>가 점수예요.',
  [WRITING.CREATIVE]: '이 과제는 <b>내가 지은 작품</b>이 점수예요.',
  [WRITING.ESSAY]: '이 과제는 <b>내가 쓴 글</b>이 점수예요.',
  [WRITING.RESPONSE]: '이 과제는 <b>내 감상과 해석</b>이 점수예요.',
};

// **준 것만 말한다.**
// 처음에는 「읽어 볼 자료와 글의 뼈대를 드릴게요」라고 늘 적었다. 그런데 전수로 재 보니
// 국어·영어 글쓰기 과제 52건 중 **49건(94%)** 에서 자료가 하나도 안 붙었다(2026-09-25).
// 못 주는 것을 준다고 말하면, 학생은 없는 것을 찾다가 프로그램을 못 믿게 된다.
// 그래서 붙은 개수를 받아 **있을 때만** 말하고, 없으면 없다고 말한다.
export function writingNotice(input, gave = {}) {
  const kind = writingKind(input);
  if (!kind) return '';
  const papers = Number(gave.papers) || 0;
  const books = Number(gave.books) || 0;
  const head = `${NOTICE[kind]} 그래서 <b>글은 대신 써 드리지 않아요.</b>`;
  const bones = ' <b>글의 뼈대</b>(어떤 순서로 무엇을 쓸지)를 드릴게요. 뼈대에 내 생각을 채워 넣으면 내 글이 돼요.';
  // 「무엇을 줬나」와 「못 찾았다」는 말은 **공용 파일**을 쓴다. 두 곳에 같은 말을 따로 적으면 어긋난다.
  const what = gaveText({ papers, books, datasets: Number(gave.datasets) || 0, tables: Number(gave.tables) || 0 });
  if (what) return `${head} 대신 <b>읽어 볼 ${what}</b>을 드리고,${bones}`;
  // 자료를 못 찾았을 때는 **못 찾았다고 말한다.** 학생이 직접 찾아야 한다는 것을 알아야 한다.
  return `${head}${bones} ${NO_MATERIAL}`;
}
