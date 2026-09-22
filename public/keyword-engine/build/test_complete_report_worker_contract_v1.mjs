import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");

const checks = [
  [worker.includes("reportSeedIndex: 'seed-bank/index/report_seed_index.json'"), "report example seed index is not loaded"],
  [worker.includes("function pickReportPatterns"), "report example patterns are not selected"],
  [worker.includes("공백 포함 2800~4200자"), "student report length instruction is missing"],
  [worker.includes("required: ['reportTitle', 'sections']"), "sectioned complete-report schema is not required"],
  [worker.includes("body: { type: 'string', minLength: 150 }"), "section body schema minimum is missing"],
  [worker.includes("function assembleReport"), "model sections are not assembled into one report text"],
  [worker.includes("function sectionWritingGuide"), "per-section writing plan is missing"],
  [worker.includes("같은 문장이나 수행평가 문구를 여러 절에 반복하지 않는다"), "repetition guard is missing"],
  [worker.includes("측정값이나 관찰 결과를 지어내지 않는다"), "fabricated-result guard is missing"],
  [worker.includes("여러 개를 얕게 나열하지 말고"), "single real-life case depth rule is missing"],
  [worker.includes("기본값으로 삼지 않는다") && !worker.includes("실생활 사례는 세제, 식품"), "the case is still defaulted to the most obvious one (duplicate reports across a class)"],
  [worker.includes("Km이 언제나 최적 pH에서 최소가 된다고 단정하지 않는다"), "enzyme misconception guard is missing"],
  [worker.includes("온도 상승은 활성화 에너지 자체를 바꾸지 않고"), "temperature and activation-energy correction is missing"],
  [worker.includes("확인되지 않은 저자, 책 제목, 연도"), "bibliography hallucination guard is missing"],
  [worker.includes("개인 경험, 관찰, 실험 수행을 입력에서 확인할 수 없으면"), "fabricated student experience guard is missing"],
  [worker.includes('"~에서 확인하였다", "~를 활용했다"처럼 실제로 한 것처럼 쓰지 않는다'), "references section still allows claimed source use"],
  [worker.includes('"나는 평소에 ~해 본 경험이 있다"처럼 학생 개인의 경험·습관을 쓰지 않는다'), "global invented-experience rule is missing"],
  [worker.includes("removeInventedExperience(section?.body)"), "invented-experience sentences are not removed from model sections"],
  [worker.includes("await callOpenAIWithRetry(prompt, env, input)"), "a failed model call is not retried once"],
  [worker.includes("connectedBook: input.useBookInReport ? input.selectedBookTitle : '사용하지 않음'"), "book opt-out is not bound to the prompt"],
  [bridge.includes("rawData?.result?.reportTitle"), "worker report title is not rendered"],
  [bridge.includes("value.result?.report"), "worker report body is not extracted"],
  [bridge.includes('.replace(/^\\s*#{1,6}\\s*/gm, "")'), "markdown heading cleanup is missing"],
  [bridge.includes('data?.localFallback || /^seed-fallback'), "seed fallback is still eligible for complete-report display"],
  [bridge.includes('error.code = "COMPLETE_REPORT_GENERATION_FAILED"'), "fallback failure is not surfaced to the student"],
  [bridge.includes("acceptsStructuredWorkerReport"), "structured worker report is not accepted directly"],
];

// Real output from the 2026-09-11 production test: the invented experience sentence must go, the rest must stay.
const filterSource = worker.slice(worker.indexOf("const INVENTED_EXPERIENCE_SENTENCE"), worker.indexOf("function assembleReport"));
const removeInventedExperience = new Function(`${filterSource}\nreturn removeInventedExperience;`)();
const realQuestion = "효소 세제가 실제로 작동하는 조건에는 어떤 차이가 있을까? 나는 평소에 세탁할 때 찬물과 미지근한 물, 그리고 다양한 세제를 사용해 본 경험이 있다. 수업 시간에 효소가 세제에도 쓰인다는 이야기를 듣고 궁금해졌다.";
checks.push(
  [removeInventedExperience(realQuestion) === "효소 세제가 실제로 작동하는 조건에는 어떤 차이가 있을까? 수업 시간에 효소가 세제에도 쓰인다는 이야기를 듣고 궁금해졌다.", "real invented-experience sentence is not removed cleanly"],
  [removeInventedExperience("나는 효소가 늘 잘 작동할 것이라고 생각했지만, 조건에 따라 달라진다는 점을 알게 되었다.").startsWith("나는 효소가"), "reflection sentence was wrongly removed"],
  [removeInventedExperience("이 문제가 생기는 것을 본 적이 있는 사람도 많다.").length > 0, "'문제가' was mistaken for a first-person subject"],
);

// Task types (2026-09-12): the Worker picks what the student will collect; tasks with nothing to collect stay one-shot.
checks.push(
  // 2026-09-22: 이제는 판정에 필요한 것을 따로 모아 넘긴다(과제명·과제 유형·보고서 유형·학생의 정정).
  // 그냥 input 만 넘기면 규칙의 마지막 두 줄과 「다르게 잡을래요」가 닿지 않는다.
  [worker.includes("input.collectionKind = resolveCollectionKind({"), "the Worker does not decide the collection type"],
  [worker.includes("input.collectionKind === COLLECTION.NONE") && worker.includes("input.reportStage = STAGE.COMPLETE"), "an essay/창작 task is not sent back to the one-shot report"],
  [worker.includes("stageSectionGuide(title, stage, input.collectionKind)"), "the section guide is not told the collection type"],
  [bridge.includes('function decideReportStage(){') && bridge.includes('return "experiment_draft";'), "the site still starts the two-stage flow only for science"],
  [bridge.includes("function renderSourceCardPanel"), "the source-card form is missing"],
  [bridge.includes('result?.collectionKind === "reading"'), "the site does not switch the form by collection type"],
  [bridge.includes("collectSourceCards(panel)") && bridge.includes("sourceCards,"), "typed source cards are not sent to the Worker"],
  [bridge.includes('reportStage: !reading && measured >= 2 ? "experiment_final" : "literature"'), "a reading task must end in the literature report"],
);

// 운영 검사 2026-09-22(국어 서평·영어 기사 비평): 글로 쓰는 과제인데 보고서가
// 「코더 2인이 20% 표본을 중복 코딩해 일치도를 확인한다」 같은 연구자용 절차를 시켰다.
// 학생이 혼자 못 하는 일을 시키면 그 절에서 멈추거나, 안 한 일을 했다고 적게 된다.
checks.push(
  [worker.includes("학생이 혼자, 학교와 집에서, 며칠 안에 할 수 있는 크기"), "the report may still order a research-team procedure"],
  [worker.includes("평정자 2인") && worker.includes("1주 뒤 재코딩"), "the examples of what not to order are missing"],
  [worker.includes("절차를 늘려 해결하지 말고"), "a thin sample must be written in the limits, not fixed by more procedure"],
);

for (const [passed, message] of checks) assert.equal(passed, true, message);
console.log(`PASS complete report worker contract: ${checks.length}/${checks.length}`);
