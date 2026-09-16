// 수행평가에 첨부하는 참고 도서.
//
// 학교에서 구두로 "책을 읽고 수행평가에 첨부해라" 하는 경우가 있다. 사용자가 책 데이터를 넣은 이유가
// 그것이다 — 부록이 아니라 **이번 보고서에 쓰이는 자료**다.
//
// 전제가 하나 더 있다: **학생은 책을 읽을 시간이 없다.** 그래서 우리가 그 책이 무엇을 다루는지 미리
// 정리해 두었다. 그건 그 책의 실제 내용이라 인용은 사실이다. 다만 **읽은 소감은 학생만 쓸 수 있다** —
// 모델이 지어내면 그 순간 거짓이 된다. 이 파일이 지키는 선이 거기다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildConceptCounts, buildMajorCounts, buildWordCounts, majorHit, matchBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";
import { bookBlock, bookRules, pickedBook } from "../../../admission_worker_skeleton/report_stages_v1.mjs";
import { referencesBody, sourceLine } from "../../../admission_worker_skeleton/references_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const books = JSON.parse(await readFile(here("../seed/engine-index/book_match_index.v1.json"), "utf8")).books;
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const worker = await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8");
const bridge = await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8");
const stages = await readFile(here("../../../admission_worker_skeleton/report_stages_v1.mjs"), "utf8");
const counts = buildWordCounts(books);
const conceptCounts = buildConceptCounts(axisIndex);
const majorCounts = buildMajorCounts(books);
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const axisFor = (concept) => Object.values(axisIndex.axes).find((one) => one.concept === concept);
const pick = (subject, concept, major) => {
  const axis = axisFor(concept);
  return matchBooks(books, {
    subject, concept, major,
    keyword: String(axis?.output || "").split(/[,、·]/)[0].trim(), axisTitle: axis?.title,
  }, 3, counts, conceptCounts, majorCounts);
};

// A1: 진로는 **순서를 바꿀 뿐 문턱이 아니다.** 진로를 아직 안 정한 학생에게도 책은 나와야 한다.
{
  const none = pick("화학", "원자의 구조", "");
  const mine = pick("화학", "원자의 구조", "화학공학과");
  check(none.length > 0, "A1 진로를 안 적어도 책이 나온다", JSON.stringify(none.map((b) => b.title)));
  check(mine.length > 0 && mine.some((b) => b.forMajor), "A1 진로를 적으면 그 학과를 가리키는 책이 표시된다",
    JSON.stringify(mine.map((b) => `${b.title}:${b.forMajor || "-"}`)));
  check(mine[0].score > none.find((b) => b.title === mine[0].title)?.score,
    "A1 그리고 점수가 올라가 앞으로 온다 — 문턱이 아니라 순서다");
  check(mine.length >= none.length, "A1 진로를 적었다고 책이 줄어들지는 않는다");
}

// A2: **흔한 학과로는 못 가린다.** '철학과'는 80권에, '사회학과'는 74권에 붙어 있다. 낱말과 같은 규칙이다.
{
  const common = [...majorCounts.entries()].filter(([, n]) => n > 40).map(([m]) => m);
  check(common.length > 0, "A2 정말로 아무 책에나 붙어 있는 학과가 있다", common.slice(0, 4).join(", "));
  const one = books.find((b) => (b.majors || []).some((m) => m.replace(/\s+/g, "") === common[0]));
  check(majorHit(one, common[0], majorCounts) === "", `A2 ${common[0]}로는 안 걸린다 — 그 말로 걸린 추천은 아무 말도 안 한 것이다`);
  check(majorHit({ majors: ["화학공학과"] }, "화학공학과", majorCounts) === "화학공학과", "A2 드문 학과는 그대로 걸린다");
  check(majorHit({ majors: ["화학공학과"] }, "", majorCounts) === "", "A2 진로를 안 적으면 아무것도 안 걸린다");
}

// A3: 학생이 읽을 시간이 없다. **그 책이 무엇을 다루는지**가 같이 내려가야 한다.
{
  const found = pick("화학", "원자의 구조", "화학과");
  check(found.every((b) => Array.isArray(b.points)), "A3 책마다 내용 조각이 딸려 온다");
  check(found.some((b) => b.points.length >= 2), "A3 그리고 비어 있지 않다",
    JSON.stringify(found.map((b) => b.points.length)));
  check(books.every((b) => !(b.points || []).some((one) => one.length > 140)), "A3 한 줄이 너무 길지 않다");
}

// A4: 고른 책은 **자료 카드 한 장**이 된다. 거기서부터는 이미 있는 길을 탄다.
{
  const card = { title: "사라진 스푼", type: "도서 · 샘 킨", point: "원소가 자리를 얻는 기준이 원자에 있다.", take: "주기율표를 읽는 법을 알았다" };
  check(pickedBook({ sourceCards: [{ title: "기사", type: "기사" }, card] })?.title === "사라진 스푼",
    "A4 자료 카드 중에서 책을 찾아낸다");
  check(pickedBook({ sourceCards: [{ title: "기사", type: "기사" }] }) === null, "A4 책이 없으면 없다");
  check(pickedBook(null) === null, "A4 카드가 없어도 터지지 않는다");
  check(sourceLine(card) === "사라진 스푼 (도서 · 샘 킨) — 주기율표를 읽는 법을 알았다",
    "A4 참고 자료 절에 괄호가 겹치지 않게 찍힌다", sourceLine(card));
  check(referencesBody({ cards: [card], textbook: "화학 교과서 · 원자의 구조 단원" }).split("\n").length === 2,
    "A4 책이 먼저, 교과서가 마지막 한 줄");
}

// A5: **읽은 소감은 모델이 못 쓴다.** 여기가 이 기능의 선이다.
{
  const card = { title: "사라진 스푼", type: "도서 · 샘 킨", point: "원소가 자리를 얻는 기준이 원자에 있다.", take: "" };
  const rules = bookRules(card).join("\n");
  check(rules.includes("이론적 배경"), "A5 책은 이론적 배경에 녹여 쓴다 — 절을 따로 만들지 않는다");
  check(/읽은 경험이나 감상은 쓰지 않는다/.test(rules), "A5 읽은 경험과 감상은 못 쓴다");
  check(/지어내지 않는다/.test(rules), "A5 우리가 준 내용 밖으로 나가지 못한다");
  check(/책을 주제로 만들지 않는다/.test(rules), "A5 보고서의 주제는 그대로다");
  check(bookRules(null).length === 0 && bookBlock(null).length === 0, "A5 책이 없으면 규칙도 안 붙는다");
  check(bookBlock(card).join("\n").includes("학생이 적지 않음"),
    "A5 학생이 한 줄을 안 썼으면 '안 적음'이라고 알려 준다 — 빈칸을 모델이 채우면 안 된다");
  check(bookBlock(card).join("\n").includes('"지은이": "샘 킨"'), "A5 지은이를 카드에서 바르게 떼어 낸다");
}

// A6: 워커와 화면이 실제로 이어져 있는가.
{
  check(worker.includes("bookChoices") && /bookChoices,\n/.test(worker), "A6 워커가 설계서 응답에 책 후보를 담는다");
  check(/input\.reportStage === STAGE\.DRAFT[\s\S]{0,600}buildMajorCounts/.test(worker),
    "A6 설계서 단계에서, 진로까지 넣어 고른다");
  check(/major: input\.major \|\| input\.track/.test(worker), "A6 학과가 없으면 계열이라도 쓴다");
  check(bridge.includes("renderBookPick") && bridge.includes("renderCollectionPanel(stageResult, rawData?.bookChoices)"),
    "A6 화면이 그 후보를 받아 그린다");
  check(/collectBookCard\(panel\), \.\.\.collectRefCards\(panel\)/.test(bridge),
    "A6 고른 책이 자료 카드 맨 앞에 붙는다");
  check(/const bookCard = collectBookCard\(panel\);/.test(bridge), "A6 읽기 보고서에서도 책을 센다");
  check(bridge.includes("선생님이 책을 읽고 첨부하라고 하셨나요?"), "A6 학생이 왜 이 칸이 있는지 알 수 있다");
  check(bridge.includes("읽어 두세요"), "A6 그리고 내용은 읽어 두라고 말한다 — 선생님이 물어볼 수 있다");
  check(bridge.includes('value="" checked'), "A6 기본값은 '안 넣을래요'다 — 억지로 붙이지 않는다");
}

// A7: 책은 여전히 **설계서 프롬프트에 안 간다.** 학생이 고르기 전에 모델이 알면 보고서가 그쪽으로 휜다.
{
  check(worker.indexOf("let bookChoices") > worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "A7 후보는 모델을 부른 뒤에 고른다");
  // 응답 객체에 bookChoices 와 promptPreview 가 나란히 있어서 글자 거리로 재면 안 된다. 프롬프트를 만드는
  // 파일이 책 후보를 아예 모르는지를 본다.
  check(!stages.includes("bookChoices"), "A7 프롬프트를 만드는 곳은 책 후보를 아예 모른다");
  check(stages.includes("pickedBook"), "A7 프롬프트에 들어가는 것은 **학생이 고른 뒤**의 자료 카드뿐이다");
}

console.log(`PASS book attach: ${passed}/${passed}`);
