// Connection test: the real access-gateway code in front of the real Worker code, both run locally.
// Only the outside world is mocked: seed files (served from this repo), the OpenAI API and the KV store.
// The live-input candidate is built with the site's own browser builder, so the whole chain is exercised:
// site builder -> gateway (code check, billing) -> Worker (live-intake authority, seeds, prompt) -> AI.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const repo = new URL("../", import.meta.url);
const importSource = async source => (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

// worker.js is ESM inside a CommonJS package, so load its source and point every relative import at an
// absolute URL. Listing them one by one meant this test broke each time the worker gained a module.
const workerSource = readFileSync(new URL("admission_worker_skeleton/worker.js", repo), "utf8")
  .replace(/from '\.\/([\w.-]+\.mjs)'/g, (_, file) => `from '${new URL(`admission_worker_skeleton/${file}`, repo).href}'`);
const worker = await importSource(workerSource);
const gateway = await importSource(readFileSync(new URL("worker.js", import.meta.url), "utf8"));
const browserIntake = createRequire(import.meta.url)(new URL("public/keyword-engine/assets/js/simple_live_intake_v1.js", repo).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

// Gateway access codes expire on 2026-05-31; pin the clock inside the valid window.
const RealDate = Date;
const FIXED_NOW = new RealDate("2026-05-10T12:00:00+09:00").getTime();
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [FIXED_NOW])); }
  static now() { return FIXED_NOW; }
};

const WORKER_GENERATE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev/generate";
const SEED_PREFIX = "https://cdn.jsdelivr.net/gh/koreapoorboy-coder/univ-search@main/public/keyword-engine/seed/";
const workerEnv = { OPENAI_API_KEY: "test-key-not-real", ALLOW_STUB: "false", ENGINE_MODE: "production" };

const REPORT = [
  "1. 연구 질문", "락타아제 우유는 어떤 원리로 우유 속 젖당을 줄일까? 온도는 이 과정에 어떤 영향을 줄까?", "",
  "2. 이론적 배경 및 자료 검토", "효소는 생명체 안에서 반응이 잘 일어나도록 활성화 에너지를 낮추는 단백질이다. 락타아제는 젖당에만 작용하는데, 이를 기질 특이성이라고 한다. " .repeat(3), "",
  "3. 탐구 방법", "직접 실험 대신 교과서와 식품 표시 정보를 비교하는 문헌 조사로 진행하고, 실험은 계획으로만 설계한다.",
  "1) 자료 수집 단계에서 교과서의 효소 단원과 락타아제 우유 표시를 읽는다.",
  "2) 온도 조건을 세 가지로 나누어 예상 결과를 표로 정리한다.", "",
  "4. 탐구 결과 및 분석", "실제 측정값이 없으므로 결과를 수치로 말할 수 없다. 문헌에 따르면 온도가 너무 높으면 효소가 변성되어 기능을 잃는다. ".repeat(2), "",
  "5. 결론", "락타아제 우유는 효소의 기질 특이성을 활용한 대표적인 사례라고 판단한다. 다만 실제 측정으로 확인해야 하는 한계가 있다. ".repeat(2), "",
  "6. 참고문헌 및 후속 탐구", "통합과학1 교과서 효소 관련 단원",
].join("\n");

// The same report as the model's sectioned answer ({title, body} per section).
const REPORT_SECTIONS = REPORT.split(/\n\n(?=\d+\. )/).map(block => {
  const [head, ...rest] = block.split("\n");
  return { title: head.replace(/^\d+\.\s*/, ""), body: rest.join("\n") };
});

// Staged answers (two-stage experiment report). The final answer deliberately carries an invented-number
// sentence and its own chart values; the Worker must drop that sentence and compute every figure value itself.
const longBody = text => `${text} `.repeat(6).trim();
const STAGE_OUTPUTS = {
  draft: {
    reportTitle: "효소 세제와 물 온도에 따른 얼룩 제거 실험 설계",
    sections: [
      { title: "연구 질문", body: longBody("효소 세제는 일반 세제보다 얼룩을 더 잘 지울까? 물의 온도는 효소 세제의 효과에 어떤 영향을 줄까?") },
      { title: "이론적 배경", body: longBody("효소는 활성화 에너지를 낮추는 단백질이며 온도가 너무 높으면 변성된다.") },
      { title: "가설", body: longBody("효소 세제를 미지근한 물에서 쓰면 얼룩이 가장 잘 지워질 것이다.") },
      { title: "탐구 방법", body: longBody("같은 천에 달걀 흰자 얼룩을 묻히고 세제와 물 온도를 바꾸어 20분 동안 세탁한다.") },
      { title: "결과 기록 계획", body: longBody("조건마다 세 번 세탁하고 얼룩 제거 정도를 점수로 기록한다.") },
    ],
    caseTag: "세탁 세제 얼룩 제거",
    dataTemplate: { measurementName: "얼룩 제거 정도", unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거", conditions: ["일반 세제 · 미지근한 물", "효소 세제 · 미지근한 물", "효소 세제 · 뜨거운 물"], trials: 3 },
  },
  final: {
    reportTitle: "효소 세제와 물 온도에 따른 얼룩 제거 실험",
    sections: [
      { title: "연구 질문", body: longBody("효소 세제는 일반 세제보다 얼룩을 더 잘 지울까? 나는 집에서 세탁해 본 경험이 있어 궁금했다.") },
      { title: "탐구 결과", body: `${longBody("표 1을 보면 효소 세제 · 미지근한 물의 평균은 2.67점으로 가장 높았다.")} 문헌에서는 효소가 55도에서 가장 활발하다고 한다.` },
      { title: "결과 분석", body: longBody("미지근한 물에서 효소가 잘 작용해 일반 세제와 1.34점 차이가 났다.") },
    ],
    figures: [{ kind: "bar", metric: "mean", conditionOrder: [], title: "조건별 평균 얼룩 제거 정도", caption: "막대가 높을수록 잘 지워졌다", values: [9, 9, 9] }],
  },
  literature: {
    reportTitle: "효소 세제와 물 온도에 관한 문헌 탐구",
    sections: [
      { title: "연구 질문", body: longBody("효소 세제는 일반 세제보다 얼룩을 더 잘 지울까?") },
      { title: "자료 비교 정리", body: longBody("교과서에 따르면 효소는 적당한 온도에서 잘 작용하고 너무 뜨거우면 변성된다.") },
      { title: "결론", body: longBody("효소 세제는 미지근한 물에서 쓰는 것이 알맞다고 판단한다.") },
    ],
    comparisonTable: { title: "물 온도별 효소 세제의 작용", columns: ["조건", "효소의 상태", "예상되는 세탁 효과"], rows: [["미지근한 물", "잘 작용함", "얼룩이 잘 지워짐"], ["뜨거운 물", "변성될 수 있음", "효과가 줄어듦"]] },
  },
};

let openaiMode = "report";
const openaiCalls = [];
globalThis.fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  if (request.url === WORKER_GENERATE_URL) return worker.fetch(request, workerEnv);
  if (request.url.startsWith(SEED_PREFIX)) {
    return new Response(readFileSync(new URL(`public/keyword-engine/seed/${request.url.slice(SEED_PREFIX.length)}`, repo)), { headers: { "Content-Type": "application/json" } });
  }
  if (request.url === "https://api.openai.com/v1/responses") {
    openaiCalls.push(await request.json());
    if (openaiMode === "error") return new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 });
    // "flaky": the first call fails once, the retry gets the normal report.
    if (openaiMode === "flaky") { openaiMode = "report"; return new Response(JSON.stringify({ error: { message: "temporary" } }), { status: 500 }); }
    // "reasoning": a gpt-5 style answer, with a reasoning item before the message and reasoning tokens in usage.
    if (openaiMode === "reasoning") {
      const text = JSON.stringify({ reportTitle: "락타아제 우유로 본 효소의 기질 특이성", sections: REPORT_SECTIONS });
      return new Response(JSON.stringify({
        status: "completed", model: "gpt-5",
        output: [{ type: "reasoning", summary: [] }, { type: "message", content: [{ type: "output_text", text }] }],
        usage: { input_tokens: 100, output_tokens: 300, output_tokens_details: { reasoning_tokens: 200 } },
      }), { status: 200 });
    }
    const text = STAGE_OUTPUTS[openaiMode] ? JSON.stringify(STAGE_OUTPUTS[openaiMode])
      : openaiMode === "sections"
      ? JSON.stringify({ reportTitle: "락타아제 우유로 본 효소의 기질 특이성", sections: REPORT_SECTIONS })
      : JSON.stringify({ reportTitle: "락타아제 우유로 본 효소의 기질 특이성", report: REPORT });
    return new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text }] }] }), { status: 200 });
  }
  throw new Error(`unexpected outbound fetch in test: ${request.url}`);
};

const makeKv = () => {
  const store = new Map();
  return { store, get: async key => store.get(key) ?? null, put: async (key, value) => { store.set(key, value); } };
};
const uses = kv => Number(kv.store.get("access:test-0508:uses") || 0);

const TASK = "효소가 실생활에 쓰이는 현상을 찾아 활용 방안을 통한 탐구보고서 작성하기";
const SECTIONS = ["연구 질문", "이론적 배경 및 자료 검토", "탐구 방법", "탐구 결과 및 분석", "결론", "참고문헌 및 후속 탐구"];
const candidate = browserIntake.buildCandidateFromValues({
  school: "테스트고등학교", grade: "고1", subject: "통합과학1", subject_group: "과학", task_description: TASK,
  selected_subject: "통합과학1", selected_subject_group: "과학",
});
const basePayload = {
  schoolName: "테스트고등학교", grade: "고1", subjectGroup: "과학", subject: "통합과학1", taskDescription: TASK,
  career: "공학계열", major: "공학계열", track: "공학계열",
  keyword: "효소", selectedKeyword: "효소", selectedConcept: "효소",
  structureId: "structure_research_report", targetStructure: SECTIONS, useBookInReport: false,
  generationStage: "primary_student_result", billing: { stage: "primary_student_result", countUsage: true },
  liveInputCandidate: candidate,
};
const viaGateway = (payload, kv) => gateway.fetch(
  new Request("https://access-gateway.example/test-0508/__mini/generate", { method: "POST", body: JSON.stringify(payload) }),
  { ACCESS_KV: kv },
);

// The site's own section splitter, to confirm the returned report renders as the requested sections.
const bridge = readFileSync(new URL("public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js", repo), "utf8");
const slice = (from, to) => { const a = bridge.indexOf(from), b = bridge.indexOf(to, a); return bridge.slice(a, b); };
const site = new Function([
  slice("function cleanReportLine", "function normalizeGeneratedCandidate"),
  slice("const KNOWN_SECTION_TITLES", "function isTableSection"),
  slice("const REPORT_SECTION_ALIASES", "function renderDocumentBody"),
].join("\n") + "\nreturn {cleanReportText, splitSections, dedupeSections, normalizeDocumentSections};")();

let passed = 0;
const check = (ok, label) => { assert.equal(ok, true, label); console.log(`PASS ${label}`); passed++; };

// I1 — path B (gateway): full success.
{
  const kv = makeKv();
  openaiMode = "report"; openaiCalls.length = 0;
  const res = await viaGateway(basePayload, kv); const body = await res.json();
  check(res.status === 200 && body.ok === true && body.source === "openai" && body.result?.report === REPORT, "I1 gateway → Worker → AI returns the completed report");
  check(body.gateway?.counted === true && uses(kv) === 1, "I1 completed report counts exactly one use");
  const prompt = openaiCalls[0]?.input || "";
  // Level policy (2026-09-11): 고1 writes at 고2~고3 depth and gets the topic-matched example pattern (RPT-030) as a
  // thinking-flow example, with the rule not to import its topic, cases, numbers or names.
  check(prompt.includes("목표 수준은 고2~고3 심화 수준") && prompt.includes("[깊이 기준]") && prompt.includes("미카엘리스-멘텐 반응속도 적용")
    && prompt.includes("그 보고서의 주제, 사례, 수치, 고유명사는 가져오지 않는다"),
    "I1 고1 prompt targets 고2~고3 depth with the topic-matched example pattern and the do-not-import rule");
  check(prompt.includes('"connectedBook": "사용하지 않음"') && prompt.includes(TASK), "I1 prompt carries the trusted task and the book opt-out");
  const sections = site.normalizeDocumentSections(site.dedupeSections(site.splitSections(site.cleanReportText(body.result.report), { requestedTitles: SECTIONS })));
  check(sections.map(section => section.title).join("|") === SECTIONS.join("|"), "I1 the site splits the report into the six requested sections");
  check(sections[2].body.includes("1) 자료 수집 단계에서"), "I1 numbered procedure stays inside 탐구 방법");
}
// I2 — path B: AI error → Worker seed-fallback → gateway does not count.
{
  const kv = makeKv();
  openaiMode = "error";
  const res = await viaGateway(basePayload, kv); const body = await res.json();
  check(res.status === 502 && body.gateway?.upstreamSource === "seed-fallback-after-openai-error" && uses(kv) === 0, "I2 AI failure is not counted (502)");
}
// I3 — path B: tampered subject → Worker rejects → gateway does not count.
{
  const kv = makeKv();
  openaiMode = "report";
  const res = await viaGateway({ ...basePayload, subject: "통합과학2" }, kv); const body = await res.json();
  check(res.status === 502 && body.gateway?.upstreamStatus === 400 && /SUBJECT_CONFLICT/.test(body.gateway?.upstreamPreview || "") && uses(kv) === 0, "I3 subject conflict is rejected by the Worker and not counted");
}
// I4 — path B: request without the live-input candidate → rejected, not counted.
{
  const kv = makeKv();
  const { liveInputCandidate, ...withoutCandidate } = basePayload;
  const res = await viaGateway(withoutCandidate, kv); const body = await res.json();
  check(res.status === 502 && /LIVE_INPUT_CANDIDATE_REQUIRED/.test(body.gateway?.upstreamPreview || "") && uses(kv) === 0, "I4 missing live-input candidate is rejected and not counted");
}
// I4b — a student who has not picked a keyword or a track used to get HTTP 500 and the English words
// "Missing required input: keyword". A missing choice is the student's to fix, and it must read that way.
{
  openaiMode = "report";
  const res = await worker.fetch(new Request(WORKER_GENERATE_URL, { method: "POST", body: JSON.stringify({ ...basePayload, keyword: "", selectedKeyword: "", track: "", career: "", major: "" }) }), workerEnv);
  const body = await res.json();
  check(res.status === 400, "I4b a missing choice is a 400, not a server error", String(res.status));
  // Since 2026-09-18 an empty keyword falls back to the concept, then the subject (seed_fit_v1.mjs): the site used
  // to fill it with a seed's blog title. So only the track is missing here — still named in Korean.
  check(body.code === "MISSING_INPUT" && /진로 계열/.test(body.error) && !/키워드/.test(body.error) && !/Missing required input/.test(body.error),
    "I4b the student is told in Korean which choice is missing (keyword now falls back to concept/subject)", body.error);
}

// I4c — 논술·창작 tasks keep the one-shot report, but not when the student has already filled a table. Throwing
// their numbers away also skips every guard the two-stage path runs, so the invented sentences would survive.
{
  openaiMode = "final";
  const essay = "매체에 나타난 사회 쟁점에 대해 자신의 입장을 논술한다.";
  const withData = {
    ...basePayload, taskDescription: essay, reportStage: "experiment_final",
    studentData: { measurementName: "응답 수", unit: "명", conditions: [{ label: "찬성", values: [12] }, { label: "반대", values: [8] }], reason: "궁금했다", sources: ["통합과학1 교과서"] },
    liveInputCandidate: browserIntake.buildCandidateFromValues({
      school: "테스트고등학교", grade: "고1", subject: "통합과학1", subject_group: "과학",
      task_description: essay, selected_subject: "통합과학1", selected_subject_group: "과학",
    }),
  };
  const res = await worker.fetch(new Request(WORKER_GENERATE_URL, { method: "POST", body: JSON.stringify(withData) }), workerEnv);
  const body = await res.json();
  check(body.resolved?.reportStage === "experiment_final", "I4c a filled table keeps the two-stage report even on a 논술 task", body.resolved?.reportStage);
  const { liveInputCandidate, studentData, ...noData } = withData;
  const plain = await (await worker.fetch(new Request(WORKER_GENERATE_URL, { method: "POST", body: JSON.stringify({ ...noData, liveInputCandidate }) }), workerEnv)).json();
  check(plain.resolved?.reportStage === "complete", "I4c an empty 논술 task still gets the one-shot report", plain.resolved?.reportStage);
}

// I5 — path A (direct Worker, as the site falls back to it): same request works without the gateway.
{
  openaiMode = "report";
  const res = await worker.fetch(new Request(WORKER_GENERATE_URL, { method: "POST", body: JSON.stringify(basePayload) }), workerEnv);
  const body = await res.json();
  check(res.status === 200 && body.source === "openai" && body.result?.report === REPORT, "I5 direct Worker path returns the same completed report");
}

// I6 — 고2 elective (화학) keeps the advanced example pattern, analysis method included.
{
  const kv = makeKv();
  openaiMode = "report"; openaiCalls.length = 0;
  const chemCandidate = browserIntake.buildCandidateFromValues({
    school: "테스트고등학교", grade: "고2", subject: "화학", subject_group: "과학", task_description: TASK,
    selected_subject: "화학", selected_subject_group: "과학",
  });
  const res = await viaGateway({ ...basePayload, grade: "고2", subject: "화학", liveInputCandidate: chemCandidate }, kv);
  const prompt = openaiCalls[0]?.input || "";
  check(res.status === 200 && prompt.includes("미카엘리스-멘텐 반응속도 적용") && prompt.includes("목표 수준에 맞게 뜻을 먼저 설명한 뒤") && prompt.includes("고3~대학 1학년 수준"),
    "I6 고2 elective prompt keeps the advanced pattern and targets 고3~대학 1학년 depth");
}

// I7 — 고1 with the real client assessment payload: only objective task evidence reaches the prompt.
const realAssessment = JSON.parse(readFileSync(new URL("./fixtures/enzyme_performance_assessment_20260911.json", import.meta.url), "utf8"));
{
  const kv = makeKv();
  openaiMode = "report"; openaiCalls.length = 0;
  const res = await viaGateway({ ...basePayload, performance_assessment: realAssessment }, kv);
  const prompt = openaiCalls[0]?.input || "";
  const forbidden = [
    "효소 구조·성능·안정성", "구조, 조건, 성능, 안정성", "핵심 원리와 적용 조건", '"concept": "정확성"', "과학의 측정과 우리 사회",
    "Vmax=100", "Km=10", "score_diagnostics", "topCandidates",
  ].filter(word => prompt.includes(word));
  check(res.status === 200 && forbidden.length === 0,
    `I7 고1 prompt drops client guesses and worked calculations${forbidden.length ? ` (leaked: ${forbidden.join(", ")})` : ""}`);
  check(prompt.includes("효소 작용 탐구") && prompt.includes("활성화 에너지를 낮추고") && prompt.includes("개념정확성") && prompt.includes("채점 요소다"),
    "I7 prompt keeps the real similar task, the basic content focus and the rubric labelled as grading criteria");
  check(prompt.includes("다른 가능한 설명을 최소 1개") && prompt.includes("열로 응고") && prompt.includes("물음표(?)로 끝나는") && prompt.includes("400자 이상"),
    "I7 prompt carries the depth rules (alternative explanation, enzyme/stain guardrail), question-form and length rules");
}
// I8 — 고2 elective with the same payload keeps the advanced material (analysis cautions, intermediate focus).
{
  const kv = makeKv();
  openaiMode = "report"; openaiCalls.length = 0;
  const chemCandidate = browserIntake.buildCandidateFromValues({
    school: "테스트고등학교", grade: "고2", subject: "화학", subject_group: "과학", task_description: TASK,
    selected_subject: "화학", selected_subject_group: "과학",
  });
  await viaGateway({ ...basePayload, grade: "고2", subject: "화학", liveInputCandidate: chemCandidate, performance_assessment: realAssessment }, kv);
  const prompt = openaiCalls[0]?.input || "";
  check(prompt.includes("Michaelis-Menten 방정식의 Vmax, Km, [S] 의미를 생략하지 않는다") && prompt.includes("Michaelis-Menten 방정식으로 기질 농도와")
    && !prompt.includes("Vmax=100") && !prompt.includes("효소 구조·성능·안정성"),
    "I8 고2 prompt keeps advanced cautions and focus, but still no worked calculation or client guesses");
}

// I9 — the model answers section by section; the Worker joins them into one numbered report the site can split.
{
  const kv = makeKv();
  openaiMode = "sections"; openaiCalls.length = 0;
  const res = await viaGateway(basePayload, kv); const body = await res.json();
  const report = String(body.result?.report || "");
  const sections = site.normalizeDocumentSections(site.dedupeSections(site.splitSections(site.cleanReportText(report), { requestedTitles: SECTIONS })));
  check(res.status === 200 && report.startsWith("1. 연구 질문\n") && sections.map(section => section.title).join("|") === SECTIONS.join("|") && uses(kv) === 1,
    "I9 sectioned model answer becomes one numbered report that splits into the requested sections");
  const prompt = openaiCalls[0]?.input || "";
  check(prompt.includes("탐구 방법: 탐구 방식(문헌 조사인지 실험 계획인지)") && prompt.includes("연구 질문: 물음표(?)로 끝나는 질문 1~2개") && prompt.includes("600~800자"),
    "I9 prompt carries a per-section writing plan with content and length for each requested section");
  openaiMode = "report";
}

// I10 — science draft (1차 탐구 설계서): design sections plus the data template, counted as one use.
{
  const kv = makeKv();
  openaiMode = "draft"; openaiCalls.length = 0;
  const res = await viaGateway({ ...basePayload, reportStage: "experiment_draft" }, kv); const body = await res.json();
  const call = openaiCalls[0] || {};
  check(res.status === 200 && body.result?.reportStage === "experiment_draft" && body.result?.dataTemplate?.conditions?.length === 3
    && body.result?.sectionTitles?.join("|") === "연구 질문|이론적 배경|가설|탐구 방법|결과 기록 계획" && uses(kv) === 1,
    "I10 draft stage returns the design report and the data template, and counts one use");
  check(call.text?.format?.schema?.required?.includes("dataTemplate") && String(call.input).includes("1차 탐구 설계서") && String(call.input).includes("결과, 예상 수치, 결론을 쓰지 않는다"),
    "I10 draft prompt and schema ask for a design report and a data template");
}
// I11 — final stage with the student's numbers: figures computed from the data, invented number removed, one more use.
const STUDENT_DATA = {
  measurementName: "얼룩 제거 정도", unit: "점",
  conditions: [
    { label: "일반 세제 · 미지근한 물", values: ["1", "2", "1"] },
    { label: "효소 세제 · 미지근한 물", values: ["3", "3", "2"], note: "거의 사라짐" },
    { label: "효소 세제 · 뜨거운 물", values: ["2", "1", "2"] },
  ],
  reason: "나는 집에서 세탁해 본 경험이 있어 궁금했다.", reflection: "뜨거운 물이 더 잘 지울 줄 알았다.", sources: [],
  draftReport: "3. 탐구 방법\n20분 동안 세탁한다.",
};
{
  const kv = makeKv();
  openaiMode = "final"; openaiCalls.length = 0;
  const res = await viaGateway({ ...basePayload, reportStage: "experiment_final", studentData: STUDENT_DATA }, kv); const body = await res.json();
  const report = String(body.result?.report || "");
  const chart = (body.result?.figures || []).find(figure => figure.kind === "bar");
  const table = (body.result?.figures || []).find(figure => figure.kind === "table");
  check(res.status === 200 && body.result?.reportStage === "experiment_final" && chart?.values?.join(",") === "1.33,2.67,1.67"
    && table?.rows?.[1]?.join("|") === "효소 세제 · 미지근한 물|3|3|2|2.67|1" && uses(kv) === 1,
    "I11 final stage draws the table and chart from the student's numbers (model values ignored), one more use");
  check(!report.includes("55도") && report.includes("2.67점") && report.includes("1.34점") && body.result?.removedNumberSentences === 1 && report.includes("세탁해 본 경험이 있어"),
    "I11 the invented-number sentence is removed; the student's own experience is kept");
  const prompt = String(openaiCalls[0]?.input || "");
  check(prompt.includes('"평균": 2.67') && prompt.includes('"흔들림"') && !prompt.includes('"spread"') && prompt.includes("20분 동안 세탁한다") && openaiCalls[0]?.text?.format?.schema?.required?.includes("figures") && !prompt.includes("입력에는 학생의 개인 경험이 없으므로"),
    "I11 prompt carries the data summary and the draft; the no-experience rule is lifted when the student wrote one");
}
// I12 — an empty table turns the second stage into a literature report with a text comparison table.
{
  const kv = makeKv();
  openaiMode = "literature"; openaiCalls.length = 0;
  const empty = { ...STUDENT_DATA, conditions: STUDENT_DATA.conditions.map(row => ({ ...row, values: [] })) };
  const res = await viaGateway({ ...basePayload, reportStage: "experiment_final", studentData: empty }, kv); const body = await res.json();
  check(res.status === 200 && body.result?.reportStage === "literature" && body.result?.comparisonTable?.rows?.length === 2
    && String(openaiCalls[0]?.input).includes("문헌 탐구 보고서로 쓴다") && uses(kv) === 1,
    "I12 an empty table turns the second stage into a literature report");
  const sections = site.normalizeDocumentSections(site.dedupeSections(site.splitSections(site.cleanReportText(body.result?.report || ""), { requestedTitles: body.result?.sectionTitles || [] })));
  check(sections.map(section => section.title).join("|") === (body.result?.sectionTitles || []).join("|"), "I12 the site splits a staged report by the section titles the Worker returns");
  openaiMode = "report";
}

// I13 — a single model failure is retried once inside the Worker; the student gets the report and one use is counted.
{
  const kv = makeKv();
  openaiMode = "flaky"; openaiCalls.length = 0;
  const res = await viaGateway(basePayload, kv); const body = await res.json();
  check(res.status === 200 && body.source === "openai" && openaiCalls.length === 2 && uses(kv) === 1, "I13 a transient model failure is retried once and counted once");
  openaiMode = "report";
}

// I14 — gpt-5 family: no temperature (the API rejects it), a reasoning effort, room for reasoning tokens, and the
// message is read even though a reasoning item comes first.
{
  const kv = makeKv();
  workerEnv.OPENAI_MODEL = "gpt-5";
  openaiMode = "reasoning"; openaiCalls.length = 0;
  const res = await viaGateway(basePayload, kv); const body = await res.json();
  const call = openaiCalls[0] || {};
  check(res.status === 200 && body.source === "openai" && String(body.result?.report || "").startsWith("1. 연구 질문") && body.usage?.reasoning_tokens === 200
    && !("temperature" in call) && call.reasoning?.effort === "medium" && call.max_output_tokens === 20000 && uses(kv) === 1,
    "I14 gpt-5: no temperature, reasoning effort set, message read after the reasoning item");
  delete workerEnv.OPENAI_MODEL;
  openaiMode = "report";
}

// I15 — class-level variety: cases already used for the same school+task steer the next draft, and the new one is
// stored. A student is never asked and never blocked.
{
  const kv = makeKv();
  const saved = [];
  // 이용권이 붙은 뒤로는 D1이 있으면 학생 코드도 있어야 한다. 이 학생은 무제한(-1)이다.
  const holder = { code: "sc-study0001-abcd", name: "권민규", max_uses: -1, used_count: 0, enabled: 1, expires_at: null };
  workerEnv.DB = {
    prepare: (sql) => ({
      run: async () => ({}),
      bind: (...args) => ({
        run: async () => { if (/INSERT INTO report_cases/.test(sql)) saved.push(args); return {}; },
        all: async () => ({ results: /SELECT case_tag/.test(sql) ? [{ case_tag: "렌즈 세척액 과산화수소", variable_tag: "무효소/활성 × 실온/차가움", measure_tag: "거품 높이 (cm)" }] : [] }),
        first: async () => (/SELECT \* FROM students/.test(sql) ? holder : null),
      }),
    }),
  };
  openaiMode = "draft"; openaiCalls.length = 0;
  const res = await viaGateway({ ...basePayload, reportStage: "experiment_draft", studentCode: holder.code }, kv); const body = await res.json();
  const prompt = String(openaiCalls[0]?.input || "");
  check(res.status === 200 && prompt.includes("이미 만든 탐구") && prompt.includes("렌즈 세척액 과산화수소")
    && saved.length === 1 && saved[0][2] === "세탁 세제 얼룩 제거" && body.result?.combination?.measureTag === "얼룩 제거 정도 (점)",
    "I15 recent cases from the same school+task steer the next draft, and the new case is stored");
  // I16 — 문: D1이 붙어 있으면 학생 코드 없이는 보고서를 만들 수 없다. 모델은 불리지 않는다.
  openaiCalls.length = 0;
  const noCode = await viaGateway({ ...basePayload, reportStage: "experiment_draft" }, makeKv());
  const noCodeBody = await noCode.json();
  check(noCode.status === 403 && noCodeBody.reason === "NO_CODE" && openaiCalls.length === 0,
    "I16 a report with no student code is refused before the model is called",
    `${noCode.status} / ${noCodeBody.reason} / calls ${openaiCalls.length}`);

  // I17 — 다 쓴 학생도 같은 자리에서 막힌다.
  openaiCalls.length = 0;
  holder.max_uses = 2; holder.used_count = 2;
  const spent = await viaGateway({ ...basePayload, reportStage: "experiment_draft", studentCode: holder.code }, makeKv());
  const spentBody = await spent.json();
  check(spent.status === 403 && spentBody.reason === "NO_USES" && openaiCalls.length === 0,
    "I17 a student who has used everything is refused before the model is called",
    `${spent.status} / ${spentBody.reason} / calls ${openaiCalls.length}`);
  holder.max_uses = -1; holder.used_count = 0;

  delete workerEnv.DB;
  openaiMode = "report";
}

globalThis.Date = RealDate;
console.log(`PASS gateway-Worker integration: ${passed}/${passed}`);
