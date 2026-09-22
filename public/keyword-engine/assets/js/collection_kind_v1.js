// 학생이 무엇을 모아 오게 되는가 — 실험 측정 / 설문 답 / 공개 자료 수치 / 자료 카드 / 없음.
//
// **이 파일은 화면과 워커가 같이 쓴다.** 화면은 학생에게 「이 과제는 …를 적게 돼요」라고 미리
// 보여 주고, 워커는 그 말대로 표를 만든다. 예전에는 화면이 제 나름의 짧은 규칙을 따로 갖고 있어서
// 둘이 어긋났다 — 생명과학 「우리 반 설문」 과제에 화면은 「공개된 자료를 찾아 표에 옮기게 돼요」라고
// 적었는데 워커는 설문으로 잡았다(운영 검사 2026-09-22). 학생에게 한 말과 실제가 다르면,
// 「틀리면 보이게 한다」는 약속 자체가 무너진다. 그래서 규칙을 한 군데만 둔다.
//
// 브라우저가 읽어야 하므로 화면 쪽(public/keyword-engine/assets/js)에 두고, 워커가 가져다 쓴다.
// 워커에서는 report_stages_v1.mjs 가 이 파일을 다시 내보낸다 — 부르는 곳은 그대로다.

// A report task is staged around whatever the student can collect: measurements, survey answers, published
// figures, or source cards. 논술·창작·발표 tasks have nothing to collect, so they keep the one-shot report.
export const COLLECTION = Object.freeze({ MEASUREMENT: 'measurement', SURVEY: 'survey', DATASET: 'dataset', READING: 'reading', NONE: 'none' });

export function resolveCollectionKind(input) {
  // Only what the assignment itself says. The subject name used to be in here, so 과학탐구실험 or 생명과학실험
  // made every task a measurement no matter what it asked for — a 통계 자료 분석 in 과학탐구실험 came out as one.
  // 과제 글만 본다. 사이트가 추정한 보고서 유형(reportMode, 예: '실험분석형')을 섞으면 '실험'이라는 말이 과제 글에 없어도
  // 실험 과제가 됐다 — 엔진 전수 검사(2026-09-18)에서 숫자 과제 988건 중 384건이 과제 글에 실험·측정·데이터라는 말이 없었다.
  // **학생이 「다르게 잡을래요」에서 직접 고쳤으면 그 말이 먼저다.**
  //
  // 이 판정은 실제 과제 3,440건으로 재어 86.3% 맞는다. 바꿔 말하면 **여섯 번에 한 번 틀린다.**
  // 유료로 나가는 프로그램에서 한 번 틀리면 한 학생이 아니라 그 과제를 받은 모두가 틀린다. 그래서
  // 틀렸을 때 학생이 되돌릴 길이 있어야 하는데, 화면에 「다르게 잡을래요」가 있는데도 **그 값이
  // 여기까지 오지 않고 있었다**(2026-09-21). 고른 값이 아무것도 바꾸지 못했다.
  //
  // 학생이 손으로 고쳤을 때만 받는다 — 화면이 미리 채워 둔 값은 우리 추정일 뿐이다.
  if (input?.methodPicked === true || input?.methodPicked === 'true') {
    const picked = [].concat(input?.methodAxes || [], input?.correctionMethod || []).join(' ');
    if (/실험|실습|측정|관찰/.test(picked)) return COLLECTION.MEASUREMENT;
    if (/설문/.test(picked)) return COLLECTION.SURVEY;
    if (/자료해석|자료분석|통계|데이터/.test(picked)) return COLLECTION.DATASET;
    if (/문헌|자료조사|독서/.test(picked)) return COLLECTION.READING;
    if (/논술|논증|토의|토론|구술|발표|포트폴리오|프로젝트|창작|제작/.test(picked)) return COLLECTION.NONE;
  }
  const text = [input?.taskDescription, input?.taskName, input?.taskType].filter(Boolean).join(' ');
  const science = String(input?.subjectGroup || '').trim() === '과학';

  // Order matters, and it is the order a teacher would read the sentence in. What the student is asked to go out
  // and get comes first: "화학 반응을 관찰한 뒤 논술형 문제를 해결한다" is an experiment that ends in writing, not a
  // writing task. Only when nothing is being collected do the writing and performing words decide.
  if (/설문|인터뷰|여론 ?조사|응답자|만족도 ?조사/.test(text)) return COLLECTION.SURVEY;
  // 「우리 반 30명에게 물어 인원수를 적는다」도 설문이다 — 루프 8(공통수학2 집합): '설문'이라는 말이 없어
  // 문헌 탐구로 잡혀 자료 5개를 읽으라는 설계서가 나왔다. 사람에게 묻는 말이 있으면 설문으로 본다.
  if (/(명|학생|친구|학급|반원|가족)에게/.test(text) && /물어|물었|물어보|여쭈|응답|답하게|답을 ?받|조사한다|조사하여/.test(text)) return COLLECTION.SURVEY;
  if (/손을 ?들게|거수|투표하게 ?하여/.test(text)) return COLLECTION.SURVEY;
  if (/실험|측정|실습|재어|계측/.test(text)) return COLLECTION.MEASUREMENT;
  // Graded as an essay answer: the student looks at something, but there is no table to fill in.
  if (/논술형 ?문제|논술형 ?평가|서·?논술형|논술형으로 ?해결|논술 ?문항/.test(text)) return COLLECTION.NONE;
  if (/통계|지표|빅데이터|공공 ?데이터|데이터를 ?수집|데이터를 ?분석|데이터 ?시각화|자료 ?해석|그래프 ?분석|추이|수치 ?자료|관측 ?자료/.test(text)) return COLLECTION.DATASET;
  // 「천문 자료에서 별 네 개의 등급을 찾아 표로 정리한다」도 공개 자료를 옮겨 적는 과제다 — 루프 18: '통계·지표'
  // 같은 말이 없어 문헌 탐구로 잡혀 자료 5개를 읽으라는 설계서가 나왔다. 찾아서 **표에 옮겨 적으라는** 말을 본다.
  if (/(자료|데이터|목록|표|기록)[^.]{0,30}(찾아|조회|검색|내려받)[^.]{0,30}(표로|표에|정리|옮겨|적는다|적어)/.test(text)) return COLLECTION.DATASET;
  // 야외 조사도 직접 재는 일이다. 「방형구를 설치해 개체 수를 조사」가 '조사'라는 말 때문에 문헌 조사로
  // 잡혀, 자료 5개를 읽으라는 설계서가 나왔다(운영 테스트 2026-09-18). 논술형·공개 자료 판정 **뒤에** 둔다 —
  // 수행평가 7,131건 가운데 이 말이 든 12건에서 바뀌는 것은 문헌으로 잡히던 2건뿐이다.
  if (/방형구|개체 ?수를|야외 ?조사|현장 ?조사|채집|표본 ?조사|식생 ?조사|군집 ?조사/.test(text)) return COLLECTION.MEASUREMENT;
  if (/관찰하여|관찰한|관측하여|관측한/.test(text)) return COLLECTION.MEASUREMENT;
  // '실험'이라는 말은 없어도 **양을 바꾸며 재는** 과제다: 「시간에 따른 속도 변화를 통해 운동을 분석」, 「힘과 가속도의 관계」.
  if (science && /에 ?따른 ?[가-힣A-Za-z]{1,10} ?(변화|차이)|(사이|간)의 관계|비례|반비례|[가-힣]{1,6}(과|와) [가-힣]{1,6}의 관계/.test(text)) return COLLECTION.MEASUREMENT;
  // 관찰하고 기록하는 과제, 회로를 꾸며 전류·전압을 재는 과제, 학교 생물 조사(바이오 블리츠) — 전수 검사에서 빠질 뻔한 것들
  if (science && /관찰 ?후|관찰하고|관찰 ?활동|바이오 ?블리츠|직렬|병렬|회로를 ?(구성|꾸미|만들)/.test(text)) return COLLECTION.MEASUREMENT;
  // Running a program and recording what it outputs is the same kind of work as measuring.
  if (/알고리즘|프로그래밍|프로그램을 ?작성|코드를 ?작성|구현하여|구현한|테스트 ?결과|오류를 ?수정|디버깅/.test(text)) return COLLECTION.MEASUREMENT;
  if (/데이터|자료를 ?분석/.test(text)) return COLLECTION.DATASET;

  // Nothing to collect: the student writes it, performs it, or makes it.
  if (/논술|논설|비평|서평|감상문|평론|창작|소설|시 ?쓰기|대본|각본|발표 ?대본|토론|토의|포트폴리오|산출물 ?제작|작품 ?제작|작품을 ?만|프로토타입|모형 ?제작/.test(text)) return COLLECTION.NONE;
  if (/연주|가창|합창|실기|시연|경기|연습|드로잉|스케치|디자인 ?작업|안무|무용/.test(text)) return COLLECTION.NONE;
  if (/타격|송구|드리블|서브|스파이크|리그전|경기에 ?참여|자세를 ?익|동작을 ?익/.test(text)) return COLLECTION.NONE;
  if (/말하기|말한다|듣기|읽고 ?쓰기|발음|회화|작문|번역|암송|낭독|어휘를 ?활용|의사소통 ?표현/.test(text)) return COLLECTION.NONE;

  if (/예술|체육|예체능|음악|미술|스포츠|운동|무용|체조|태권도|공예|연극/.test(String(input?.subjectGroup || '') + ' ' + String(input?.subject || ''))) return COLLECTION.NONE;
  // "탐구 보고서" is not a clue: every kind of task ends in one. Only the words that say where the material
  // comes from count here.
  // 「독서·책·도서」가 빠져 있었다. 예전에는 기본값이 읽기라서 그냥 맞았는데, 기본값을 바꾸자 드러났다
  // — 「독서 및 글쓰기 / 책의 내용을 적절하게 요약했는가」가 아무것도 안 요구하는 쪽으로 갔다(2026-09-21).
  if (/조사|문헌|자료를 ?찾|사례를 ?찾|주제 ?탐구|자료를 ?모아|독서|도서|책을 ?읽|책의 ?내용|서평/.test(text)) return COLLECTION.READING;

  // 과제 글이 아무것도 말하지 않는다. 예전에는 과학 과목이면 실험으로 보았다 — 그러면 「독서 및 글쓰기」, 「자유주제발표」,
  // 「과학 도서 표지 디자인」까지 숫자 표를 채우는 과제가 됐다(2026-09-18).
  //
  // 그래서 「자료를 읽고 쓰는 보고서」를 기본값으로 두었는데, **그것이 가장 적게 요구하는 쪽이 아니었다.**
  // 문헌 읽기는 학생에게 네 가지를 시킨다 — 자료 찾기, 읽기, 요약, 내 해석. 그리고 이 자리로 오는
  // 과제는 안내문에 읽을 자료가 한 마디도 없다. 학생은 빈칸 앞에서 멈춘다(전수 검사 869건, 2026-09-21).
  //
  // 이제는 **사이트가 이미 읽어 낸 보고서 유형**으로 방향을 잡는다. 과제 글을 덮어쓰지 않는다 —
  // 여기는 과제 글이 아무 말도 안 한 뒤에야 닿는 맨 마지막 자리다(2026-09-18 의 실패는 이것을 위에서
  // 섞어 쓴 탓이었다).
  const mode = String(input?.reportMode || input?.performance_assessment?.method?.reportMode || '');
  // **「실험분석형」이어도 숫자 표를 시키지 않는다.** 2026-09-18 에 사이트가 추정한 보고서 유형으로
  // 실험 여부를 정했다가, 과제 글에 실험·측정·데이터라는 말이 한 마디도 없는 384건이 숫자 표를 채우는
  // 과제가 됐다. 그 증거는 그대로 유효하다 — 재라고 하려면 과제 글이 재는 일을 말해야 한다.
  // 여기서는 **학생에게 무엇을 덜 시킬지**만 정한다.
  if (/자료해석|자료분석|통계/.test(mode)) return COLLECTION.DATASET;
  if (/독서비평|문헌/.test(mode)) return COLLECTION.READING;
  // 나머지(문제설계·원리적용·개념해석·글쓰기논술·발표논증·창작설계·산출물제작·연구보고서)는 학생에게
  // 아무것도 요구하지 않는다. 글로 쓰는 과제이고, 자료를 읽은 학생은 자료 칸에 적으면 된다(선택).
  return COLLECTION.NONE;
}
