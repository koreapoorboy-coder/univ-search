// 다음에 해 볼 것.
//
// 사용자가 짚은 대로다: 우리 제품은 **완성된 보고서를 주는 것**이라, 설계서에 "이 책들을 읽어 보세요"를
// 붙이면 숙제가 하나 늘 뿐이다. 그래서 주는 것을 읽을거리에서 **할 일**로 바꾸고, 자리도 보고서가 끝난
// 자리로 옮겼다. 자료는 그 일을 하는 수단으로만 붙는다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activitiesFrom, buildNextStep, nextStepNote } from "../../../admission_worker_skeleton/next_step_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const worker = await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8");
const bridge = await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const anAxis = Object.keys(axisIndex.axes).find((id) => axisIndex.axes[id].subject === "지구과학");

// N1: 할 일은 축의 output에서 나온다. 지어내지 않는다.
{
  check(activitiesFrom("수온·염분 비교표, 연직 분포 해석, 해양 환경 기초 보고서").length === 3,
    "N1 쉼표로 끊는다");
  check(activitiesFrom("수온·염분 비교표, 연직 분포 해석")[0] === "수온·염분 비교표",
    "N1 가운뎃점은 한 낱말 안에서도 쓰이므로 끊지 않는다", activitiesFrom("수온·염분 비교표, 연직 분포 해석")[0]);
  check(activitiesFrom("").length === 0 && activitiesFrom(null).length === 0, "N1 없으면 없다");
  check(activitiesFrom("첫째 활동, 둘째 활동, 셋째 활동, 넷째 활동, 다섯째 활동").length === 3,
    "N1 셋까지만 — 목록이 길면 아무도 안 읽는다");
  check(activitiesFrom("가, 나, 다").length === 0, "N1 한두 글자짜리는 할 일이 아니다");
}

// N2: 축이 없거나 할 일이 없으면 블록을 아예 안 만든다. 자료만 남으면 그게 읽을거리 목록이다.
{
  check(buildNextStep({}) === null, "N2 축이 없으면 블록도 없다");
  check(buildNextStep({ axis: { axisId: "없는축" }, axisIndex }) === null, "N2 모르는 축도 마찬가지");
  const onlyMaterial = buildNextStep({ axis: { axisId: "없는축" }, axisIndex, datasets: [{ title: "자료", org: "기관", id: "1" }] });
  check(onlyMaterial === null, "N2 자료만 있고 할 일이 없으면 안 만든다 — 그러면 읽을거리 목록이 된다");
}

// N3: 자료는 수단이다. 없어도 블록은 선다.
{
  const bare = buildNextStep({ axis: { axisId: anAxis }, axisIndex });
  check(bare && bare.activities.length > 0, "N3 자료가 하나도 없어도 할 일은 나온다", JSON.stringify(bare && bare.activities));
  check(bare.books.length === 0 && bare.datasets.length === 0, "N3 그리고 없는 자료를 지어내지 않는다");
  check(nextStepNote(bare).includes("한 걸음 더"), "N3 지금 내라는 말이 아니라 다음에 할 수 있다는 말", nextStepNote(bare));
  check(!nextStepNote(bare).includes("자료"), "N3 자료가 없으면 자료 이야기를 꺼내지 않는다");
  const withData = buildNextStep({ axis: { axisId: anAxis }, axisIndex, datasets: [{ title: "가", org: "나", id: "1" }] });
  check(nextStepNote(withData).includes("아래 자료는 그때"), "N3 자료가 있으면 '그때 쓰라'고 말한다");
}

// N4: 자료는 둘까지. 셋이 넘으면 할 일보다 자료가 커진다.
{
  const many = buildNextStep({
    axis: { axisId: anAxis }, axisIndex,
    books: [1, 2, 3, 4].map((n) => ({ title: `책${n}`, author: "지은이" })),
    datasets: [1, 2, 3, 4].map((n) => ({ title: `자료${n}`, org: "기관", id: String(n) })),
  });
  check(many.books.length === 2 && many.datasets.length === 2, "N4 책 둘 · 자료 둘까지");
  check(many.nextSubjects.length <= 3, "N4 이어지는 과목도 셋까지");
}

// N5: **모델을 부른 뒤에** 만든다. 프롬프트에 들어가면 보고서가 그쪽으로 휜다 — 이 기능의 전제다.
{
  check(worker.indexOf("buildNextStep(") > worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "N5 the block is built after the model has already written the report");
  check(!/connectedBook[\s\S]{0,400}buildNextStep/.test(worker), "N5 and never joins the prompt payload");
  check(worker.includes("if (input.reportStage !== STAGE.DRAFT"),
    "N5 설계서에는 안 붙는다 — 보고서가 끝난 자리에서 말해야 숙제가 아니다");
}

// N6: 화면. 할 일이 먼저, 자료는 뒤.
{
  const fn = bridge.slice(bridge.indexOf("function renderNextStep"), bridge.indexOf("function renderRecordDraft"));
  check(fn.includes("다음에 해 볼 것"), "N6 the block is titled as an action, not a reading list");
  // 순서는 만드는 곳이 아니라 **그리는 곳**에서 본다. material은 위에서 미리 조립되므로 함수 전체로 재면 뒤집힌다.
  const template = fn.slice(fn.indexOf("return `"));
  check(template.indexOf("mini-next-acts") < template.indexOf("${material}"),
    "N6 활동이 자료보다 앞에 그려진다 — 자료가 앞에 서면 다시 읽을거리가 된다");
  check(fn.includes("이 보고서는 여기서 끝나요"), "N6 and says the report is already finished");
  check(fn.includes('target="_blank"') && fn.includes("data.go.kr/data/"), "N6 a dataset opens in its own tab");
  check(fn.includes("escapeHtml"), "N6 every value is escaped");
  check(bridge.includes("renderNextStep(rawData?.nextStep)"), "N6 and it reads the field the worker actually returns");
}

console.log(`PASS next step: ${passed}/${passed}`);
