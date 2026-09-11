// Connection test: the real access-gateway code in front of the real Worker code, both run locally.
// Only the outside world is mocked: seed files (served from this repo), the OpenAI API and the KV store.
// The live-input candidate is built with the site's own browser builder, so the whole chain is exercised:
// site builder -> gateway (code check, billing) -> Worker (live-intake authority, seeds, prompt) -> AI.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const repo = new URL("../", import.meta.url);
const importSource = async source => (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

// worker.js is ESM inside a CommonJS package, so load its source and point its one relative import at an absolute URL.
const workerSource = readFileSync(new URL("admission_worker_skeleton/worker.js", repo), "utf8")
  .replace("'./simple_live_intake_v1.mjs'", `'${new URL("admission_worker_skeleton/simple_live_intake_v1.mjs", repo).href}'`);
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
    const text = JSON.stringify({ reportTitle: "락타아제 우유로 본 효소의 기질 특이성", report: REPORT });
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
  const leaked = ["메탄", "유전자 편집", "CO2eq", "GMO", "탄소 플럭스", "미카엘리스"].filter(word => prompt.includes(word));
  check(prompt.includes("교과서 개념과 실생활 사례 하나로") && prompt.includes('"reportPatterns": []') && leaked.length === 0,
    `I1 고1 prompt carries no example-report content${leaked.length ? ` (leaked: ${leaked.join(", ")})` : ""}`);
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
  check(res.status === 200 && prompt.includes("미카엘리스-멘텐 반응속도 적용") && prompt.includes("교과 개념으로 설명할 수 있는 범위에서만"),
    "I6 고2 elective prompt keeps the advanced pattern and its analysis method");
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
    "Vmax=100", "Km=10", "MATLAB", "Python", "Michaelis", "미카엘리스", "score_diagnostics", "topCandidates",
  ].filter(word => prompt.includes(word));
  check(res.status === 200 && forbidden.length === 0 && !/\bKm\b|Vmax/.test(prompt),
    `I7 고1 prompt drops client guesses, worked calculations and university equations${forbidden.length ? ` (leaked: ${forbidden.join(", ")})` : ""}`);
  check(prompt.includes("효소 작용 탐구") && prompt.includes("활성화 에너지를 낮추고") && prompt.includes("개념정확성") && prompt.includes("채점 요소다"),
    "I7 prompt keeps the real similar task, the basic content focus and the rubric labelled as grading criteria");
  check(prompt.includes("식이나 상수 기호로 나타내는 대학 과정") && prompt.includes("물음표(?)로 끝나는") && prompt.includes("400자 이상"),
    "I7 prompt carries the foundation enzyme rule, question-form and per-section length rules");
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

globalThis.Date = RealDate;
console.log(`PASS gateway-Worker integration: ${passed}/${passed}`);
