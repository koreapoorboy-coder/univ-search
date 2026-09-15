// 참고 자료 — 학생이 열어 볼 수 있는 것만.
//
// 실험 보고서의 참고 자료가 "화학 교과서 관련 단원" 한 줄로 끝나고 있었다. AI가 게을러서가 아니라 우리가
// 물어본 적이 없어서다. 이 파일은 두 가지를 지킨다: 교과서 인용은 **우리가 아는 것**만 적고, 학생 자료는
// **무엇을 얻었는지**가 붙어야 참고 자료로 친다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeSourceCards, referencesBody, sourceLine, textbookCitation, textbookName, wantsSourceCards,
} from "../../../admission_worker_skeleton/references_v1.mjs";
import { buildReferencesBody } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const axisIndex = { axes: { chem: { subject: "화학", concept: "동적 평형과 화학 평형" } } };

// F1: 교과서 인용은 지어내는 것이 아니라 우리가 아는 것을 꺼내는 일이다.
{
  const fromAxis = textbookCitation({ careerAxes: [{ axisId: "chem" }] }, axisIndex);
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

// F7: 워커가 교과서 인용을 만들어 넘긴다.
{
  check(worker.includes("input.textbookCitation = textbookCitation(input, seedPack.axisIndex);"),
    "F7 the worker builds the citation from the axis index it already loaded");
  check(worker.indexOf("input.textbookCitation") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "F7 before the report is made, so the section can use it");
}

console.log(`PASS references: ${passed}/${passed}`);
