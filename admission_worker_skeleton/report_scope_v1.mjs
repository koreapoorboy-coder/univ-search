// Is this a task we should be writing a report for at all?
//
// The engine writes 보고서 — 탐구보고서, 논술문, 서평, 자료 해석 보고서. A 수행평가 that is graded on playing the
// drums, serving a shuttlecock or handing in a painting has no report in it. Generating one produces a page the
// student cannot hand in, costs money, and teaches them the tool does not understand their assignment.
//
// So those tasks are turned away at the door, before any model call, with a sentence saying why.

export const SCOPE = Object.freeze({ REPORT: 'report', PERFORMANCE: 'performance', ARTWORK: 'artwork', PARTICIPATION: 'participation' });

// A written deliverable anywhere in the task puts it back in scope: "연주한 뒤 감상문을 쓴다" is a report task with a
// performance attached, and those are common.
const WRITTEN = /보고서|논술|논설|서평|비평문|감상문|평론|에세이|글로 ?쓰|글쓰기|작성하여 ?제출|정리하여 ?제출|탐구 ?결과를 ?정리|기록지|활동지|학습지|소감문|성찰문|설명문|해설문|기록문|보고문|계획서|제안서|설명서|분석하여 ?쓰/;

// 연주 운동·연주 시차는 천문학 말이다(별의 1년 주기 운동) — 「좌표계 탐구하기」 과제가 악기 연주로 막혔다(2026-09-18).
// 독창적·독창성 is "original", not a solo voice, and it sits in almost every 평가 루브릭; 경기 침체 is the
// economy, not a match. Both were pulling real report tasks out of scope.
const OUT_OF_SCOPE = [
  {
    scope: SCOPE.PERFORMANCE,
    test: /연주(?! ?운동| ?시차)|가창|합창|독창(?!적|성)|중주|시연|실기|경기(?! ?침체| ?회복| ?불황| ?호황| ?변동| ?순환| ?지표| ?동향| ?전망)|리그전|타격|송구|드리블|스파이크|스매시|리시브|숏서비스|언더서비스|서브를 ?넣|서비스 ?실시|슛하기|패스하기|스트로크|영법|수영하기|달리기|체조|무용|안무|연기|발표회|공연/,
    reason: '몸으로 하는 수행(연주·경기·실기)을 평가하는 과제로 보여요.',
  },
  {
    scope: SCOPE.ARTWORK,
    test: /그림을 ?그리|그리기 ?과정|형태묘사|드로잉|스케치|채색|조소|판화|도예|작품을 ?제작|작품 ?만들|포스터를 ?만들|영상을 ?제작|사진을 ?촬영|디자인하여 ?제작/,
    reason: '작품을 만들어 내는 과제로 보여요.',
  },
  {
    scope: SCOPE.PARTICIPATION,
    test: /학습 ?참여도|수업 ?참여|참여 ?태도|출석|성실도 ?평가|태도 ?평가|과제 ?제출 ?여부/,
    reason: '수업 참여나 태도를 보는 평가로 보여요.',
  },
];

export function resolveReportScope(input) {
  const text = [input?.taskDescription, input?.taskName, input?.taskType].filter(Boolean).join(' ');
  if (!text.trim()) return { scope: SCOPE.REPORT, reason: '' };
  if (WRITTEN.test(text)) return { scope: SCOPE.REPORT, reason: '' };
  // 수업 참여·태도 평가는 **과제 제목**에서만 본다. 채점표 안의 「수업 참여」 한 줄로 진로 탐구 프로젝트가 막혔다
  // (엔진 전수 검사 2026-09-18). 제목이 「수업 참여도」인 과제는 그대로 막힌다.
  const head = String(input?.taskName || String(input?.taskDescription || '').split(/\r?\n| \/ /)[0] || '');
  const hit = OUT_OF_SCOPE.find((rule) => rule.test.test(rule.scope === SCOPE.PARTICIPATION ? head : text));
  if (!hit) return { scope: SCOPE.REPORT, reason: '' };
  return {
    scope: hit.scope,
    reason: hit.reason,
    message: `${hit.reason} 이 프로그램은 글로 내는 보고서를 만들어요. 안내문에 보고서나 감상문을 쓰라는 부분이 있으면 그 문장까지 함께 붙여 넣어 주세요.`,
  };
}

export const isReportTask = (input) => resolveReportScope(input).scope === SCOPE.REPORT;
