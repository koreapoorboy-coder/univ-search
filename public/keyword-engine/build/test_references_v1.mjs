// 참고 자료 — 학생이 열어 볼 수 있는 것만.
//
// 실험 보고서의 참고 자료가 "화학 교과서 관련 단원" 한 줄로 끝나고 있었다. AI가 게을러서가 아니라 우리가
// 물어본 적이 없어서다. 이 파일은 두 가지를 지킨다: 교과서 인용은 **우리가 아는 것**만 적고, 학생 자료는
// **무엇을 얻었는지**가 붙어야 참고 자료로 친다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  dataLine,
  normalizeSourceCards, referencesBody, sourceLine, textbookCitation, textbookName, wantsSourceCards,
} from "../../../admission_worker_skeleton/references_v1.mjs";
import { buildReferencesBody, finalizeStageOutput, normalizeStudentData, STAGE } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const axisIndex = { axes: {
  chem: { subject: "화학", concept: "동적 평형과 화학 평형" },
  ko: { subject: "공통국어1", concept: "비판적 읽기와 토론" },
} };

// F1: 교과서 인용은 지어내는 것이 아니라 우리가 아는 것을 꺼내는 일이다.
{
  const fromAxis = textbookCitation({ subject: "화학", careerAxes: [{ axisId: "chem" }] }, axisIndex);
  check(fromAxis === "화학Ⅰ 교과서 · 동적 평형과 화학 평형 단원", "F1 the axis names the subject and the unit", fromAxis);
  check(!/관련 단원/.test(fromAxis), "F1 '관련 단원'은 아무것도 말하지 않으면서 말한 척한다");
  const noAxis = textbookCitation({ subject: "물리", selectedConcept: "물질의 전기적 특성" }, null);
  check(noAxis === "물리학Ⅰ 교과서 · 물질의 전기적 특성 단원", "F1 축이 없으면 학생이 고른 과목·개념으로", noAxis);
  check(textbookCitation({ subject: "화학" }, null) === "화학Ⅰ 교과서",
    "F1 단원을 모르면 단원을 쓰지 않는다 — 모르는 것을 적는 것이 지어내기다");
  check(textbookCitation({}, null) === "", "F1 과목도 모르면 아무 줄도 만들지 않는다");
  // 평가 기준 문장이 개념 칸에 들어오는 일이 있다(실제로 D1에 그렇게 저장된 적이 있다).
  const rubric = textbookCitation({ subject: "화학", selectedConcept: "실험 목적에 맞게 조건을 설정하고 변인을 통제하여 타당한 절차를 구성했는가." }, null);
  check(rubric === "화학Ⅰ 교과서", "F1 문장은 단원 이름이 아니다", rubric);
  // 실제 보고서에서 나온 것: 생명과학 보고서에 "공통국어1 교과서"가 적혀 나왔다. 축은 이 탐구가 앞으로
  // 어디로 가는지를 가리키므로 다른 과목일 수 있고, 그 과목의 교과서를 적으면 거짓이다.
  const crossed = textbookCitation({ subject: "생명과학", selectedConcept: "뉴런과 흥분 전도", careerAxes: [{ axisId: "ko" }] }, axisIndex);
  check(crossed === "생명과학Ⅰ 교과서 · 뉴런과 흥분 전도 단원",
    "F1 교과서는 학생이 지금 하는 과목의 것이다 — 축이 다른 과목을 가리켜도 따라가지 않는다", crossed);
}

// F2: 교과서 이름은 표지에 적힌 대로.
{
  check(textbookName("물리") === "물리학Ⅰ" && textbookName("생명과학") === "생명과학Ⅰ",
    "F2 '물리'로 배우지만 교과서 이름은 물리학Ⅰ이다");
  check(textbookName("통합과학1") === "통합과학1", "F2 이름이 그대로인 과목은 그대로 둔다");
  check(textbookName("") === "", "F2 없는 과목은 없는 것");
}

// F3: 자료 한 줄. 제목만 있으면 목록이고, 얻은 것이 붙어야 참고 자료다.
{
  const full = sourceLine({ title: "화학 평형의 이해", type: "책", take: "르샤틀리에 원리를 온도로 설명한 부분을 읽었다" });
  check(full.includes("(책)") && full.includes("—"), "F3 제목·종류·얻은 것이 한 줄로", full);
  check(sourceLine({ title: "제목만" }) === "제목만", "F3 얻은 것이 없으면 제목만 남는다");
  check(sourceLine({ title: "" }) === "" && sourceLine(null) === "", "F3 제목이 없으면 자료가 아니다");
  check(sourceLine({ title: "가", point: "핵심 내용" }).includes("핵심 내용"),
    "F3 읽기 보고서의 카드는 '핵심 내용'을 쓰므로 그것도 받는다");
}

// F4: 참고 자료 절 몸통. 학생이 적은 것이 먼저, 교과서가 마지막.
{
  const body = referencesBody({
    cards: [{ title: "기후변화 보고서", type: "기관 자료", take: "국내 평균기온 상승 폭을 확인했다" }],
    textbook: "화학Ⅰ 교과서 · 동적 평형 단원",
  });
  const lines = body.split("\n");
  check(lines.length === 2 && lines[0].includes("기후변화"), "F4 학생이 적은 것이 먼저", body);
  check(lines[1].includes("교과서"), "F4 교과서는 마지막 한 줄");
  check(referencesBody({ cards: [], textbook: "화학Ⅰ 교과서" }) === "화학Ⅰ 교과서",
    "F4 아무것도 안 적었어도 교과서 한 줄은 남는다");
  const already = referencesBody({ cards: [], fallbackBody: "화학 교과서 관련 단원", textbook: "화학Ⅰ 교과서 · 동적 평형 단원" });
  check(already.split("\n").length === 1, "F4 모델이 이미 교과서를 적었으면 두 번 적지 않는다", already);
  const dupes = referencesBody({ cards: [{ title: "같은 책" }, { title: "같은 책" }], textbook: "" });
  check(dupes.split("\n").length === 1, "F4 같은 자료를 두 번 적어도 한 줄");
  check(referencesBody({ cards: [], fallbackBody: "※ 안내문\n(괄호 설명)\n진짜 자료" }) === "진짜 자료",
    "F4 안내문과 괄호 설명은 자료가 아니다");
}

// F4b: 실제 보고서를 한 편 돌려 보고서야 나온 둘. 테스트만으로는 안 잡혔다.
{
  const T = '화학Ⅰ 교과서 · 동적 평형과 화학 평형 단원';
  // 모델은 "화학 교과서 관련 단원"처럼 뭉뚱그린다. 정확한 단원을 아는데 그 줄을 남기면, 아는 것을 두고
  // 모르는 척한 줄이 보고서에 남는다.
  const vague = referencesBody({ cards: [], fallbackBody: '화학 교과서 관련 단원', textbook: T });
  check(vague === T, "F4b a vague textbook line is replaced by the precise one, not kept beside it", vague);
  const both = referencesBody({ cards: [{ title: '기후변화 보고서', take: '기온 상승 폭 확인' }], fallbackBody: '화학 교과서 관련 단원', textbook: T });
  check(both.split("\n").length === 2 && both.endsWith(T), "F4b and the student's own source survives beside it", both);
  check(referencesBody({ cards: [], fallbackBody: T, textbook: T }) === T, 'F4b the precise line is never written twice');
  check(referencesBody({ cards: [], fallbackBody: '화학 교과서 관련 단원', textbook: '' }) === '화학 교과서 관련 단원',
    "F4b but with no citation of our own we keep what the model wrote — deleting it would leave nothing");

  // 읽기 보고서 카드는 point를, 실험 보고서 카드는 take만 채운다. point를 요구하면 후자가 통째로 버려진다.
  const kept = normalizeStudentData({ sourceCards: [{ title: '기관 자료', take: '얻은 것만 적음' }] }).sourceCards;
  check(kept.length === 1, "F4b a card with only 여기서 얻은 것 is kept — the experiment form never asks for 핵심 내용", String(kept.length));
  const dropped = normalizeStudentData({ sourceCards: [{ take: '제목이 없음' }] }).sourceCards;
  check(dropped.length === 0, "F4b but a card with no title is still not a source");
}

// F4c: **실제 경로**. 모델에게는 참고 자료 절을 쓰지 말라고 일러 두었으므로 그 절은 거의 항상 코드가 붙인다.
// 처음에 buildReferencesBody만 고쳤을 때 실제 보고서가 하나도 안 바뀐 이유가 이것이었다 — 보고서를 두 편
// (₩592) 돌리고 나서야 찾았다. 이 묶음은 그 경로를 통째로 지나간다.
{
  const cite = '물리학Ⅰ 교과서 · 물질의 전기적 특성 단원';
  const run = (sections, studentExtra) => {
    const input = {
      subject: '물리', textbookCitation: cite, reportStage: 'experiment_final',
      studentData: normalizeStudentData({
        measurementName: '저항', unit: 'Ω', conditions: [{ label: '조건1', values: [1, 2, 3] }], sources: [],
        ...studentExtra,
      }),
    };
    const out = finalizeStageOutput(STAGE.FINAL, { sections }, input);
    return ((out.parsed?.sections) || []).find((section) => /참고/.test(section.title))?.body;
  };
  const card = { sourceCards: [{ title: '기후변화 감시 보고서 2025', type: '기관 자료', take: '기온 상승 폭을 확인했다' }] };
  const body = [{ title: '결론', body: 'x' }];

  const withCard = run(body, card);
  check(withCard.split("\n").length === 2 && withCard.startsWith("기후변화"),
    "F4c the section the code appends carries the student's own source first", withCard);
  check(withCard.endsWith(cite), "F4c and the precise textbook line after it");
  check(run(body, {}) === cite, "F4c a student who read nothing still gets the precise unit, not '관련 단원'", run(body, {}));
  const vague = run([...body, { title: '참고 자료', body: '물리 교과서 관련 단원' }], card);
  check(!vague.includes("관련 단원"), "F4c and when the model does write the section, its vague line is replaced", vague);
}

// F5: 옛 경로도 그대로 돈다. 읽기 보고서는 오래전부터 이렇게 써 왔다.
{
  check(buildReferencesBody("무시됨", ["학생이 적은 줄"]) === "학생이 적은 줄", "F5 sources 줄이 오면 그대로");
  check(buildReferencesBody("모델이 쓴 줄", []) === "모델이 쓴 줄", "F5 아무것도 없으면 모델 줄");
  const both = buildReferencesBody("모델", [], { cards: [{ title: "카드", take: "얻은 것" }], textbook: "화학Ⅰ 교과서" });
  check(both.includes("카드 — 얻은 것") && both.includes("화학Ⅰ 교과서"), "F5 카드와 교과서가 함께", both);
  check(!both.includes("모델"), "F5 카드가 있으면 모델 줄은 버린다 — 카드가 더 참고 자료답다");
}

// F6: 폼. 실험 보고서에도 자료를 적을 자리를 주되, 강제하지 않는다.
{
  check(wantsSourceCards("measurement") && wantsSourceCards("survey") && wantsSourceCards("dataset"),
    "F6 실험·설문·자료 해석 보고서에 자료 칸을 준다");
  check(!wantsSourceCards("reading"), "F6 읽기 보고서는 카드가 본체라 두 벌을 주지 않는다");
  check(bridge.includes('renderStudentFields(text[3], false)') && bridge.includes('renderStudentFields(text[3], true)'),
    "F6 and the two forms really do get different blocks");
  check(bridge.includes("mini-ref-block") && bridge.includes("여기서 얻은 것"),
    "F6 the block asks what the student took away, not just the title");
  check(bridge.includes("읽지 않은 자료는 적지 않아요"),
    "F6 그리고 안 읽은 것을 적지 말라고 화면이 말한다 — 여기가 지어내기의 시작점이다");
  check(bridge.includes("안 적으면 참고 자료 절에 교과서 한 줄만 남아요"),
    "F6 학생에게 안 적으면 어떻게 되는지 알려 준다 — 선택 칸은 이유를 말해야 채워진다");
  check(bridge.includes("function collectRefCards"), "F6 and they are collected");
  check(!/text\("miniExpSources"\)/.test(bridge), "F6 the old title-only textarea is gone");
}

// F8: **참고 자료에 공개 자료를 자동으로 붙인다.**
//
// 사용자가 물었다: "참고문헌에서 우리가 첨부하거나 할 수 있는 것들이 없어?" 책과 교과서 두 줄뿐이었다.
// 개념에 맞는 공공데이터를 자동으로 붙이되, **학생이 본 자료가 아니므로 '얻은 것'은 안 적는다.**
// 무엇인지와 주소만 적어 선생님이 물으면 학생이 열어 확인할 수 있게 한다.
{
  const rows = [
    { title: "화학물질 배출 및 이동량 정보", org: "화학물질안전원", url: "https://www.data.go.kr/data/15048782/openapi.do" },
    { title: "화학사고정보", org: "화학물질안전원", url: "https://www.data.go.kr/data/15048783/openapi.do" },
  ];
  const card = { title: "부엌의 화학자", type: "도서 · 라파엘 오몽", take: "온도가 녹는 정도를 바꾼다는 걸 알았다" };
  const book = referencesBody({ cards: [card], datasets: rows, textbook: "화학Ⅰ 교과서 · 화학과 우리 생활 단원" });
  const lines = book.split(String.fromCharCode(10));
  check(lines.length === 4, "F8 학생 자료 + 공개 자료 둘 + 교과서", String(lines.length));
  check(lines[0].includes("부엌의 화학자"), "F8 학생이 적은 것이 맨 앞이다");
  check(lines[1].includes("data.go.kr"), "F8 공개 자료에는 주소가 함께 적힌다 — 열어 볼 수 있어야 한다");
  check(!/—\s*여기서|얻은/.test(lines[1]), "F8 공개 자료에는 '얻은 것'을 안 적는다 — 학생이 본 자료가 아니다");
  check(lines[3].includes("교과서"), "F8 교과서는 마지막이다");
  check(dataLine({ title: "" }) === "", "F8 제목이 없으면 줄을 안 만든다");
  check(dataLine({ title: "가", org: "나" }) === "가 (나)", "F8 주소가 없어도 적을 수 있다");
  // 자료가 없으면 예전 그대로다.
  check(referencesBody({ cards: [card], textbook: "화학Ⅰ 교과서 · 화학과 우리 생활 단원" }).split(String.fromCharCode(10)).length === 2,
    "F8 공개 자료가 없으면 예전과 같다");
  check(worker.includes("input.referenceDatasets = ["), "F8 워커가 보고서 만들기 전에 자료를 받아 둔다");
  check(worker.indexOf("input.referenceDatasets") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "F8 그래야 참고 자료 절이 쓸 수 있다");
}

// F7: 워커가 교과서 인용을 만들어 넘긴다.
{
  // 개념은 위에서 정한 것(reportConcept)을 쓴다. selectedConcept 만 보면 화면이 보내는 과목 이름
  // ('화학')이 단원으로 찍혀 "화학Ⅰ 교과서 · 화학 단원"이라는 아무 말도 아닌 줄이 나왔다.
  check(worker.includes("textbookCitation({ ...input, selectedConcept: reportConcept }, seedPack.axisIndex)"),
    "F7 the worker builds the citation from the concept it resolved");
  check(worker.indexOf("input.textbookCitation") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "F7 before the report is made, so the section can use it");
}

console.log(`PASS references: ${passed}/${passed}`);
