// 엔진 전수 검사 — 실제 수행평가 전부를 **운영 엔진 코드 그대로** 돌린다. GPT 만 가짜 답으로 바꾼다(₩0).
//
// 운영 사이트 테스트는 한 번에 ₩230 이고 한 과제만 본다. 그런데 오류 대부분은 GPT 가 아니라 우리 규칙에서
// 났다(2026-09-18: 과목 이름 「생명과학」이 「농업생명과학대학」에 걸림, 블로그 제목이 키워드로 들어감,
// 현장 조사를 읽기 과제로 봄, 같은 논문 두 번). 규칙은 돈이 안 드니 **모든 과제**로 돌려 본다.
//
//   1. 사이트의 과제 해석기(assessment_keyword_bridge_helper.js)로 학생 화면과 같은 값을 만든다
//   2. worker.js 로 설계서를 만든다 — 가짜 GPT 는 요청에 딸린 JSON 스키마대로 답한다
//   3. 같은 과제로 최종 보고서를 만든다(숫자 과제는 숫자, 읽기 과제는 자료 카드)
//   4. 규칙으로 걸러 낸다 — 글자만 겹친 참고 자료, 중복 줄, 블로그 제목, 빈 단원 …
//
//   node public/keyword-engine/build/audit_engine_full_v1.mjs --part 0 --parts 6 --out <폴더>
//   (공공데이터를 보려면 PUBLIC_DATA_KEY 환경 변수. 없으면 공공데이터 칸은 비어 있다)
//
// 학교 이름은 결과에 남기지 않는다. 과제 번호(source_id 순번)로만 적는다.
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";

const ROOT = "C:/Users/korea/univ-search";
const SITE = `${ROOT}/public/keyword-engine`;
const arg = (name, fallback) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
const PART = Number(arg("--part", "0"));
const PARTS = Number(arg("--parts", "1"));
const LIMIT = Number(arg("--limit", "0"));
const OUT = arg("--out", `${SITE}/build/.audit_engine_full`);
const CAREER = arg("--career", "natural");
// 전공. 지금까지 검사는 이 칸을 비워 두고 돌렸다 — 즉 **생활기록부가 하나도 없는 학생**이 최악의
// 경우였다. 실제 학생은 전공과 관심사를 적으므로, 과제 글이 단원을 안 말해도 진로 축으로 단원을
// 정할 수 있다. 이 칸을 넣고 돌려 차이를 본다.
const MAJOR = arg("--major", "");
const INTEREST = arg("--interest", "");
await mkdir(OUT, { recursive: true });
await mkdir(`${OUT}/cache`, { recursive: true });

// ── 과목: 기록의 과목 이름 → 사이트에서 고를 수 있는 32과목 ─────────────────────────────
const { SITE_SUBJECTS, siteSubject } = await import(new URL("../../../tools/site_subject.mjs", import.meta.url));
const { unitChoices } = await import(new URL("../../../admission_worker_skeleton/unit_choices_v1.mjs", import.meta.url));
// **단원이 맞는지 재려고** 엔진 자신의 단원 찾기를 그대로 쓴다. 지금까지 이 검사는 재료만 세었고,
// 단원이 엉뚱해도 재료만 있으면 「문제 없음」이었다 — 「검기를 이용한 정전기 유도」가 「에너지와
// 열」로 잡혀도 안 보였다(2026-09-21).
const { inferConcept } = await import(`file:///${ROOT}/admission_worker_skeleton/book_match_v1.mjs`);
const axisIndexForCheck = JSON.parse(readFileSync(`${SITE}/seed/engine-index/longitudinal_axis_index.v1.json`, "utf8"));
const unitChoiceIndex = JSON.parse(readFileSync(`${SITE}/seed/engine-index/unit_choices.v1.json`, "utf8"));
// 한 번도 안 본 학교. 우리 점수는 가진 자료로 낸 점수라 실제보다 높을 수 있어, 이 학교들로만
// 따로 재어 그것을 진짜 점수로 본다(tools/holdout_schools_2026_09.json).
const HOLDOUT = new Set(JSON.parse(readFileSync(new URL("../../../tools/holdout_schools_2026_09.json", import.meta.url), "utf8")).schools);

// ── 과제 ──────────────────────────────────────────────────────────────────────────────
const all = readFileSync(`${SITE}/data/assessment/records/assessment_tasks.v1.jsonl`, "utf8").split(/\r?\n/)
  .filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
let tasks = all.map((task, at) => ({ at, task, subject: siteSubject(task.subject_standard || task.subject_raw) }))
  .filter((one) => one.subject && String(one.task.raw_task_desc || one.task.raw_task_title || "").trim());
const skipped = all.length - tasks.length;
tasks = tasks.filter((_, i) => i % PARTS === PART);
if (LIMIT) tasks = tasks.slice(0, LIMIT);

// ── 사이트 과제 해석기 ────────────────────────────────────────────────────────────────
function siteRuntime() {
  const s = { console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout, clearTimeout, crypto: globalThis.crypto, Date };
  s.window = s; s.globalThis = s; s.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  s.fetch = async (u) => {
    const file = path.join(SITE, String(u).replace(/^\.\//, "").replace(/\?.*$/, ""));
    try { const t = readFileSync(file, "utf8"); return { ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t }; }
    catch (e) { return { ok: false, status: 404, json: async () => { throw e; }, text: async () => "" }; }
  };
  vm.createContext(s);
  for (const rel of ["assets/js/subject_alias.js", "assets/js/title_composer_v2.js", "assets/assessment_keyword_bridge_helper.js"]) {
    vm.runInContext(readFileSync(path.join(SITE, rel), "utf8"), s, { filename: rel });
  }
  return s;
}
const UNIT_SUBJECTS = new Set(Object.values(JSON.parse(readFileSync(`${SITE}/seed/engine-index/longitudinal_axis_index.v1.json`, "utf8")).axes || {}).map((axis) => axis.subject));
const rt = siteRuntime();
await rt.AssessmentKeywordBridge.ready();
const intake = createRequire(import.meta.url)(`${SITE}/assets/js/simple_live_intake_v1.js`);

// ── 바깥 호출 ─────────────────────────────────────────────────────────────────────────
const SEED = "http://seed.local";
const realFetch = globalThis.fetch;
const seedCache = new Map();
const outbound = new Map();
let lastPrompt = "";
// 2026-09-24: 검수를 붙이자 한 보고서에 OpenAI 호출이 **두 번** 생겼다(생성 → 검수).
// lastPrompt 만 보던 감사는 검수 프롬프트를 보게 되어 「재료_없음」을 2,460건 찍었다.
// 제품 흠이 아니라 우리 자의 흠이었다. 호출을 **다 모아** 두고 첫 번째(생성)를 본다.
let prompts = [];
let publicCalls = 0;
const sectionTitles = (prompt) => {
  // 번호 목록이 여럿일 수 있다(사례 목록 등). 절 목록은 가장 긴 목록이다.
  const lines = String(prompt).split("\n");
  let best = [];
  let run = [];
  for (const line of lines) {
    const m = line.match(/^ {2}(\d+)\. ([^:\n]{1,30}):/);
    if (m && Number(m[1]) === run.length + 1) run.push(m[2].trim());
    else { if (run.length > best.length) best = run; run = m && Number(m[1]) === 1 ? [m[2].trim()] : []; }
  }
  return run.length > best.length ? run : best;
};
function fake(schema, key = "") {
  if (!schema || typeof schema !== "object") return "";
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (schema.anyOf) return fake(schema.anyOf.find((one) => one.type !== "null") || schema.anyOf[0], key);
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "object") {
    const out = {};
    for (const [name, sub] of Object.entries(schema.properties || {})) out[name] = fake(sub, name);
    return out;
  }
  if (type === "array") {
    const n = Math.min(Math.max(schema.minItems || 1, key === "conditions" ? 2 : 1), schema.maxItems || 9);
    return Array.from({ length: n }, (_, i) => (schema.items?.type === "string" && key === "conditions" ? `조건 ${"ABCDEFGH"[i]}` : fake(schema.items, key)));
  }
  if (type === "integer" || type === "number") {
    const want = key === "trials" ? 3 : key === "cardCount" ? 3 : 2;
    return Math.min(Math.max(want, schema.minimum ?? want), schema.maximum ?? want);
  }
  if (type === "boolean") return false;
  const text = "검사용 문장입니다.";
  return text.repeat(Math.max(1, Math.ceil((schema.minLength || 0) / text.length)));
}
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith(SEED)) {
    const file = decodeURIComponent(url.slice(SEED.length + 1));
    if (!seedCache.has(file)) {
      try { seedCache.set(file, readFileSync(`${SITE}/seed/${file}`)); } catch { seedCache.set(file, null); }
    }
    const body = seedCache.get(file);
    return body ? new Response(body, { headers: { "Content-Type": "application/json" } }) : new Response("", { status: 404 });
  }
  if (url === "https://api.openai.com/v1/responses") {
    const body = JSON.parse(init?.body || (await input.text()));
    lastPrompt = typeof body.input === "string" ? body.input : JSON.stringify(body.input);
    prompts.push(lastPrompt);
    const out = fake(body.text?.format?.schema);
    // 재료를 받았으면 첫 재료를 '썼다'고 답한다 — 설계서 → 최종 보고서 참고 자료까지 이어지는지 보려고.
    if ("usedIngredients" in out) out.usedIngredients = (lastPrompt.match(/^ {2}([PR]\d)\. /m) || [])[1] ? [lastPrompt.match(/^ {2}([PR]\d)\. /m)[1]] : [];
    const titles = sectionTitles(lastPrompt);
    if (titles.length) out.sections = titles.map((title) => ({ title, body: `${title} 검사용 본문입니다.` }));
    out.reportTitle = "전수 검사용 보고서 제목입니다";
    const text = JSON.stringify(out);
    return new Response(JSON.stringify({ status: "completed", model: "gpt-5", output: [{ type: "message", content: [{ type: "output_text", text }] }], usage: { input_tokens: 0, output_tokens: 0 } }), { status: 200 });
  }
  if (/^https:\/\/www\.snu\.ac\.kr\//.test(url)) return new Response("", { status: 200 });
  if (/api\.odcloud\.kr|data\.go\.kr/.test(url)) {
    const file = `${OUT}/cache/${createHash("sha1").update(url.replace(/serviceKey=[^&]+/, "")).digest("hex")}.json`;
    if (existsSync(file)) return new Response(readFileSync(file), { status: 200, headers: { "Content-Type": "application/json" } });
    publicCalls += 1;
    const res = await realFetch(url, init);
    const text = await res.text();
    if (res.ok) writeFileSync(file, text);
    return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
  }
  const host = (() => { try { return new URL(url).host; } catch { return url.slice(0, 40); } })();
  outbound.set(host, (outbound.get(host) || 0) + 1);
  return new Response("", { status: 404 });
};

// ── 운영 엔진 코드 ────────────────────────────────────────────────────────────────────
const TEMP = `${ROOT}/admission_worker_skeleton/.worker_audit_${PART}.mjs`;
await copyFile(`${ROOT}/admission_worker_skeleton/worker.js`, TEMP);
let worker;
try { worker = (await import(`file:///${TEMP}`)).default; } finally { await rm(TEMP, { force: true }); }
const { contentWords } = await import(`file:///${ROOT}/admission_worker_skeleton/paper_route_v1.mjs`);
const { unitFromStandard } = await import(`file:///${ROOT}/admission_worker_skeleton/unit_from_standard_v1.mjs`);
const unitStandardTable = JSON.parse(readFileSync(`${SITE}/seed/engine-index/unit_from_standard.v1.json`, "utf8"));
const env = { OPENAI_API_KEY: "audit-stub", OPENAI_MODEL: "gpt-5", ENGINE_MODE: "production", ALLOW_STUB: "false",
  SEED_BASE_URL: SEED, PUBLIC_DATA_KEY: process.env.PUBLIC_DATA_KEY || "" };
const quiet = { log: console.log, error: console.error, warn: console.warn };
const engineLog = [];
console.error = (...a) => engineLog.push(a.map(String).join(" ").slice(0, 200));
console.warn = () => {};

async function generate(payload) {
  lastPrompt = "";
  prompts = [];
  const res = await worker.fetch(new Request("http://localhost/generate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }), env, { waitUntil() {} });
  // prompt 는 **생성** 프롬프트다. 검수 프롬프트는 reviewPrompt 로 따로 본다.
  return { status: res.status, data: await res.json().catch(() => ({})),
    prompt: prompts[0] || "", reviewPrompt: prompts.length > 1 ? prompts[prompts.length - 1] : "", calls: prompts.length };
}

// ── 규칙 검사 ─────────────────────────────────────────────────────────────────────────
const HANGUL = /[가-힣]/;
// 과제 낱말이 제목의 **긴 낱말 한가운데**에 걸렸는가 — '생명과학' ⊂ '농업생명과학대학'.
// 낱말 앞쪽에 붙은 것('방형구' ⊂ '방형구법')은 같은 말로 본다.
function hitsIn(title, words) {
  const t = String(title || "");
  const out = [];
  for (const w of words) {
    if (w.length < 2) continue;
    let at = t.indexOf(w);
    if (at < 0) continue;
    let inner = true;
    while (at >= 0) {
      const before = at > 0 ? t[at - 1] : " ";
      if (!HANGUL.test(before)) { inner = false; break; }
      at = t.indexOf(w, at + 1);
    }
    out.push({ word: w, inner });
  }
  return out;
}
const BLOG = /세특|보고서 ?추천|일반고|자사고|특목고|^\s*\[[^\]]+\]/;
const norm = (s) => String(s || "").replace(/\s+/g, "").replace(/[^\p{L}\p{N}]/gu, "");

function checkRefs(body) {
  const lines = String(body || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const issues = [];
  const seen = new Map();
  for (const line of lines) {
    const key = norm(line).slice(0, 40);
    if (seen.has(key)) issues.push({ kind: "참고자료_같은줄", line: line.slice(0, 120) });
    seen.set(key, line);
  }
  // 논문 제목이 두 줄에 나오는가(카드 줄과 논문 줄)
  const titles = lines.map((l) => (l.match(/\(\d{4}\)\. ([^.]{8,}?)\./) || [])[1]).filter(Boolean).map(norm);
  const dup = titles.filter((t, i) => titles.indexOf(t) !== i);
  if (dup.length) issues.push({ kind: "참고자료_같은제목", line: dup[0].slice(0, 60) });
  return { lines, issues };
}

const rows = [];
const started = Date.now();
for (const [n, { at, task, subject }] of tasks.entries()) {
  const id = `T${String(at).padStart(4, "0")}`;
  const taskText = [task.raw_task_title, task.raw_task_desc].filter(Boolean).join(" / ").slice(0, 1500);
  const grade = `고${String(task.grade || "").match(/[123]/)?.[0] || 2}`;   // "1,2,3" 처럼 여러 학년이면 첫 학년
  const group = SITE_SUBJECTS[subject];
  // 과제 글 안에 학교 이름이 섞여 있을 때가 있다(「2026학년도 ○○고 교수학습 및 평가 운영 계획」). 결과에는 지운다.
  const school = String(task.school_name || "").trim();
  const scrub = (text) => (school ? String(text).split(school).join("○○고").split(school.replace(/등학교$/, "")).join("○○") : String(text));
  // 시험용으로 떼어 둔 학교인가. **학교 이름은 결과에 적지 않는다** — 참/거짓만 남긴다.
  const row = { id, subject, raw: task.subject_standard, grade, task: scrub(taskText.slice(0, 300)), hold: HOLDOUT.has(school), issues: [] };
  const flag = (kind, detail = "") => row.issues.push({ kind, detail: String(detail).slice(0, 200) });
  try {
    // 1. 사이트 해석
    const conn = await rt.AssessmentKeywordBridge.resolve({ subject, taskDescription: taskText, career: CAREER, taskName: "",
      assessmentDescription: "", selectedConcept: "", selectedKeyword: "", derivedKeywords: [] });
    const cross = conn?.cross_axis || {};
    const concepts = (cross.topic?.subjectConcepts || []).map(String).filter(Boolean);
    const taskConcepts = concepts.slice(0, 3).join(" · ");
    // **화면이 보내는 것과 똑같이 맞춘다.** 2026-09-21 이전에는 화면이 주제 칸에 과목 이름을 넣었고
    // (selectedConcept = concepts[0] || subject) 이 검사기도 그대로 따라 했다. 이제 화면은 학생에게
    // 낱말 목록을 보여 주고 맨 위를 미리 골라 둔다(unit_choice_picker_v1). 그러니 검사기도
    // **미리 골라진 낱말**을 보내야 실제와 같은 것을 재게 된다.
    const top = unitChoices({ subject, index: unitChoiceIndex, major: MAJOR, track: CAREER, detected: concepts[0] || "" })[0] || null;
    const selectedConcept = top?.concept || concepts[0] || "";
    const selectedKeyword = top?.keywords?.[0] || taskConcepts || selectedConcept;
    const reportMode = conn?.assessment_route?.recommendedReportMode || "연구보고서형";
    const structure = cross.structure || { id: "structure_research_report", sections: [] };
    row.site = { concepts, reportMode, structure: structure.id, blocked: Boolean(conn?.reportTarget === false || conn?.blocked) };
    // **흠이 아니다.** 연극 시연·과학 마술·실기시험·수업 참여도처럼 **보고서 과제가 아닌 것**을
    // 맞게 막은 것이다(13건 전부 사람이 확인했다, 2026-09-21). 다만 학생은 아무것도 못 받으므로
    // 숨기지 않고 따로 센다 — 여기 쌓이면 「못 하는 과제를 어떻게 안내할까」를 다시 봐야 한다.
    if (row.site.blocked) flag("맞게막음:사이트가막음");
    if (!concepts.length) flag("사이트_개념없음");
    if (BLOG.test(selectedKeyword)) flag("키워드_블로그제목", selectedKeyword);

    const base = {
      schoolName: "테스트고등학교", grade, subject, subjectGroup: group, taskDescription: taskText,
      career: CAREER, track: CAREER, major: MAJOR, interests: INTEREST ? [INTEREST] : [], keyword: selectedKeyword, selectedKeyword, selectedConcept,
      structureId: structure.id, targetStructure: structure.sections || [],
      performance_assessment: { assessmentKeywordConnection: conn, method: { reportMode },
        content: { concept: selectedConcept, keyword: selectedKeyword } },
      liveInputCandidate: intake.buildCandidateFromValues({ school: "테스트고등학교", grade, subject, subject_group: group,
        task_description: taskText, selected_subject: subject, selected_subject_group: group }),
    };

    // 2. 설계서
    const d = await generate({ ...base, reportStage: "experiment_draft" });
    row.draft = { status: d.status, ok: d.data.ok, source: d.data.source, error: d.data.error || d.data.message || "" };
    if (d.status === 422) { row.scope = d.data.scope; flag("맞게막음:보고서과제아님", d.data.scope); rows.push(row); continue; }
    if (!d.data.ok) { flag("설계서_실패", `${d.status} ${d.data.error || ""}`); rows.push(row); continue; }
    if (d.data.source !== "openai") flag("설계서_GPT단계_실패(검사용)", d.data.result?.diagnostic || d.data.source);
    const r = d.data.resolved || {};
    row.kind = r.collectionKind;
    row.stage = r.reportStage;
    row.keyword = r.keyword;
    row.concept = r.reportConcept;
    // **과제 글이 스스로 말하는 단원**과 견준다. 학생은 이 검사에서 아무것도 고르지 않으므로,
    // 둘이 다르면 우리가 고른 것이 과제를 밀어낸 것이다.
    row.unitFromTask = inferConcept(subject, taskText, axisIndexForCheck) || "";
    // **성취기준 코드로 정한 단원은 낱말 추측과 견주지 않는다.**
    // 국어·영어 안내문에는 단원 이름이 없고 코드만 있어서 낱말 추측이 애초에 0% 였다.
    // 코드는 국가가 정한 것이니 추측보다 낫다 — 견주면 좋은 답이 흠으로 세어진다
    // (2026-09-25: 이 검사가 41 → 61건으로 늘었고 새로 는 20건이 국어·영어였다. 표본 8건 중 우리가 5건 맞았다).
    const byStandard = unitFromStandard(subject, taskText, unitStandardTable).unit;
    if (byStandard && row.concept === byStandard) row.unitFromTask = "";
    if (row.unitFromTask && row.concept && row.unitFromTask !== row.concept) {
      flag("단원_어긋남", `과제 글은 「${row.unitFromTask}」인데 「${row.concept}」로 썼다`);
    }
    // 과목에 단원 자료가 아예 없으면(영어·한국사 등) 규칙 탓이 아니라 자료가 비어 있는 것이다. 따로 센다.
    if (!r.reportConcept) flag(UNIT_SUBJECTS.has(subject) ? "단원_못정함" : "과목에_단원자료없음");
    if (BLOG.test(r.keyword || "")) flag("엔진키워드_블로그제목", r.keyword);
    // 「세특 문구가 …」는 엔진의 피할 것 안내라 블로그 말이 아니다. 블로그 제목에만 나오는 말만 본다.
    if (/보고서 ?추천|자사고|특목고|일반고/.test(d.prompt)) flag("프롬프트에_블로그말", (d.prompt.match(/.{0,30}(보고서 ?추천|자사고|특목고|일반고).{0,30}/) || [""])[0]);
    const words = contentWords(taskText, subject).split(" ").filter(Boolean);
    row.words = words.slice(0, 20);
    // 설계서(주제 잡기)에는 재료가 가지 않는다 — 교과 중심(사용자 결정 2026-09-18)
    if (r.reportStage === "experiment_draft" && /^ {2}[PR]\d\. /m.test(d.prompt)) flag("설계서에_재료가_감");
    const guide = d.data.paperGuide;
    row.papers = (guide?.papers || guide?.items || []).map((p) => p.title || p.line || JSON.stringify(p).slice(0, 120));
    row.books = (d.data.bookChoices || []).map((b) => b.title);

    // 3. 최종 보고서
    let f = null;
    if (r.reportStage === "experiment_draft") {
      const reading = r.collectionKind === "reading";
      const studentData = reading
        ? { sourceCards: [1, 2, 3].map((i) => ({ title: `검사 자료 ${i}`, type: "기사", point: "검사용 핵심 내용", take: "검사용 해석" })) }
        : { measurementName: "값", unit: "", conditions: [{ label: "조건 A", values: [3, 4, 5] }, { label: "조건 B", values: [6, 7, 9] }],
            sourceCards: [{ title: "검사 자료 1", type: "기사", point: "", take: "검사용" }] };
      f = await generate({ ...base, reportStage: reading ? "literature" : "experiment_final", studentData });
    } else {
      f = d;   // 한 번에 끝나는 과제(complete)
    }
    // 교과 확장 재료(ingredients_v1) — 확장을 쓰는 단계에서 몇 개를 AI에게 보냈고, 결과에 무엇이 실렸나
    row.ingredients = { papers: (f.prompt.match(/^ {2}P\d\. /gm) || []).length, research: (f.prompt.match(/^ {2}R\d\. /gm) || []).length };
    row.inspiration = (f.data.result?.inspiration || []).map((one) => one.title);
    // **검수가 돌았나.** 오늘 두 번이나 조용히 안 돌았다 — 스키마가 400을 받았고, 배선이 틀렸다.
    // 겉보기에는 멀쩡한 보고서가 나오니 사람이 알아채지 못한다. 전수로 세는 것이 유일한 방법이다.
    row.reviewed = { draft: d.calls > 1, final: f.calls > 1 };
    if (d.calls <= 1) flag("설계서_검수_안돎");
    if (f !== d && f.calls <= 1) flag("최종_검수_안돎");
    if (f.reviewPrompt && /^ {2}[PR]\d\. /m.test(f.reviewPrompt)) flag("검수에_재료가_감");
    if (!row.ingredients.papers && !row.ingredients.research) flag(UNIT_SUBJECTS.has(subject) && r.reportConcept ? "재료_없음" : "재료_없음(단원모름)");
    else if (f.data.ok && !row.inspiration.length) flag("재료를_썼는데_결과에_없음");
    row.final = { status: f.status, ok: f.data.ok, source: f.data.source };
    if (!f.data.ok) { flag("최종_실패", `${f.status} ${f.data.error || ""}`); rows.push(row); continue; }
    if (f.data.source !== "openai") flag("최종_GPT단계_실패(검사용)", f.data.result?.diagnostic || f.data.source);
    const fr = f.data.resolved || {};
    const web = (fr.referenceWeb || []).map((w) => w.title);
    const data = (fr.referenceDatasets || []).map((x) => x.title);
    const papers = (fr.referencePapers || []).map((p) => p.title || p[0] || "");
    row.web = web; row.datasets = data; row.refPapers = papers;
    // AI가 재료로 쓴 대학 글은 뜻으로 고른 것이다 — 낱말 겹침 검사는 예전 규칙(재료 없이 고른 것)에만.
    const usedSet = new Set([...(row.inspiration || []), ...((f.data.result?.inspiration || []).map((one) => one.title))]);
    for (const title of web) {
      if (usedSet.has(title)) continue;
      const h = hitsIn(title, words);
      row.webHits = h;
      if (!h.length) flag("서울대글_과제낱말없음", title);
      else if (h.every((x) => x.inner)) flag("서울대글_글자만겹침", `${title} ← ${h.map((x) => x.word).join(",")}`);
      else if (h.filter((x) => !x.inner).length === 1) flag("서울대글_한낱말만", `${title} ← ${h.filter((x) => !x.inner)[0].word}`);
    }
    for (const title of data) {
      const h = hitsIn(title, words);
      if (!h.length) flag("공공데이터_과제낱말없음", title);
      else if (h.every((x) => x.inner)) flag("공공데이터_글자만겹침", `${title} ← ${h.map((x) => x.word).join(",")}`);
    }
    const next = f.data.nextStep;
    row.research = (next?.research || []).map((x) => x.title);
    for (const title of row.research) {
      const h = hitsIn(title, words);
      // **흠이 아니라 「살펴볼 것」이다.** 이 연구 글은 낱말이 아니라 **단원으로** 이어 붙인 것이라,
      // 과제 낱말과 겹치지 않는 것이 정상이다 — 「천구와 천체의 일주운동」에 「남반구 하늘 지도」가
      // 붙은 것은 정확한데 이 검사가 잡았다. 단원 낱말로 재 보아도 655개 연결 중 401개(61%)가
      // 걸리는데, 그중 대부분이 좋은 연결이다(「광합성과 세포 호흡」 ← 「엽록소 형광 원격탐사」).
      //
      // 그래도 버리지는 않는다. 손으로 이어 붙인 것 가운데 억지가 둘 있었고(「공의 질량」 ← 「블랙홀
      // 질량」, 「주기율표」 ← 「발광효율」) 바로 이 검사가 잡아 주었다. 사람이 훑어보는 목록으로 남긴다.
      if (h.length && h.every((x) => x.inner)) flag("살펴보기:연구_낱말안겹침", `${title} ← ${h.map((x) => x.word).join(",")}`);
    }
    // 엔진은 절을 「1. 제목\n본문」 글 하나(report)로 합쳐 보낸다.
    const parts = String(f.data.result?.report || "").split(/\n\n(?=\d+\. )/).map((one) => {
      const m = one.match(/^\d+\. ([^\n]*)\n?([\s\S]*)$/);
      return m ? { title: m[1].trim(), body: m[2] } : null;
    }).filter(Boolean);
    row.sections = parts.map((s) => s.title);
    // 참고 절의 이름은 보고서 구조마다 다르다. 창작 구조는 「참고한 개념과 작품」이라고 적는다.
    // 좁게 보다가 멀쩡한 보고서 5건을 「참고 절이 없다」고 잡았다(2026-09-26).
    // **엔진이 쓰는 규칙(report_stages_v1 의 REFERENCE_TITLE)과 같게 본다** — 자가 달라 생긴 흠이었다.
    const refSec = parts.find((s) => /참고|^\s*출처/.test(s.title));
    if (!refSec) flag("참고자료절_없음");
    else {
      const { lines, issues } = checkRefs(refSec.body);
      row.refs = lines.map((l) => l.slice(0, 160));
      for (const one of issues) flag(one.kind, one.line);
      // 서지 줄(「저자 (연도). 제목.」)은 제목에 「교과서」가 들어 있어도 논문이다 — references_v1 과 같은 기준으로 뺀다.
      // 역사교육 논문을 넣자(2026-09-20) 「역사 교과서 서술 검토」 같은 제목 6건이 교과서 줄로 잡혔다.
      const tb = lines.find((l) => /교과서/.test(l) && !/\(\d{4}\)\./.test(l));
      if (tb && !tb.includes(subject.replace(/\d$/, "").replace(/ .*/, "")) && !/통합|과학탐구|융합|과제/.test(subject)) flag("교과서줄_과목다름", tb);
      if (!lines.length) flag("참고자료_빈칸");
      // 설계서가 쓴 재료(또는 한 번에 끝나는 보고서가 쓴 재료)는 참고 자료에 있어야 한다
      const usedTitles = row.inspiration;
      for (const title of usedTitles || []) {
        if (!lines.some((line) => line.includes(String(title).slice(0, 20)))) flag("쓴재료가_참고자료에_없음", title);
      }
    }
  } catch (error) {
    flag("검사중_예외", error?.stack?.split("\n").slice(0, 2).join(" ") || error);
  }
  rows.push(row);
  if ((n + 1) % 100 === 0) quiet.log(`part ${PART}: ${n + 1}/${tasks.length} · ${Math.round((Date.now() - started) / 1000)}초`);
}

await writeFile(`${OUT}/rows_${PART}.json`, JSON.stringify({ part: PART, parts: PARTS, skipped, publicCalls,
  outbound: Object.fromEntries(outbound), engineLog: engineLog.slice(0, 200), rows }), "utf8");
quiet.log(`part ${PART} 끝: ${rows.length}건 · ${Math.round((Date.now() - started) / 1000)}초 · 공공데이터 새 호출 ${publicCalls}`);
