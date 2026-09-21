// **거친 입력** 검사 — 안내문이 깨졌을 때와 학생이 표를 이상하게 채웠을 때. ₩0(GPT 는 가짜 답).
//
// 지금까지 전수 검사는 **바른 입력**만 넣었다. 안내문은 진짜 수행평가 글이었고, 학생 표는 내가
// 3·4·5 처럼 반듯하게 채웠다. 그런데 실제 학생은 그렇게 안 한다 — 숫자 칸에 「모름」이라고 쓰고,
// 칸을 비워 두고, 0 을 열두 개 붙인다. 안내문도 한 글자만 붙여넣거나 표를 통째로 긁어 온다.
//
// 이 검사가 보는 것은 **보고서가 좋은가가 아니라 무너지지 않는가**다.
//   ① 500 으로 죽지 않는가
//   ② 죽을 때 한국어로 무엇을 해야 하는지 말하는가 (영어·스택 트레이스가 아니라)
//   ③ 학생이 주지 않은 숫자를 지어내지 않는가  ← 제일 중요하다
//   ④ 학생이 쓴 글자가 그대로 보고서에 새지 않는가 (스크립트·아주 긴 글)
//
//   node public/keyword-engine/build/audit_rough_input_v1.mjs
import { copyFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ROOT = "C:/Users/korea/univ-search";
const SITE = `${ROOT}/public/keyword-engine`;
const SEED = "http://seed.local";

// ── 바깥 호출은 전부 가짜 ─────────────────────────────────────────────────────────────
const seedCache = new Map();
const realFetch = globalThis.fetch;
let lastPrompt = "";
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
  if (type === "array") return Array.from({ length: Math.max(1, schema.minItems || 1) }, () => fake(schema.items, key));
  if (type === "number" || type === "integer") return 1;
  if (type === "boolean") return false;
  return `검사용 ${key}`.trim();
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
    const body = JSON.parse(init?.body || "{}");
    lastPrompt = typeof body.input === "string" ? body.input : JSON.stringify(body.input);
    const out = fake(body.text?.format?.schema);
    if ("usedIngredients" in out) out.usedIngredients = [];
    out.reportTitle = "검사용 보고서 제목";
    return new Response(JSON.stringify({ status: "completed", model: "gpt-5",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(out) }] }], usage: {} }), { status: 200 });
  }
  return new Response("", { status: 404 });
};

const TEMP = `${ROOT}/admission_worker_skeleton/.worker_rough.mjs`;
await copyFile(`${ROOT}/admission_worker_skeleton/worker.js`, TEMP);
let worker;
try { worker = (await import(`file:///${TEMP}`)).default; } finally { await rm(TEMP, { force: true }); }
const env = { OPENAI_API_KEY: "rough-stub", OPENAI_MODEL: "gpt-5", ENGINE_MODE: "production", ALLOW_STUB: "false", SEED_BASE_URL: SEED, PUBLIC_DATA_KEY: "" };
const engineLog = [];
console.error = (...a) => engineLog.push(a.map(String).join(" ").slice(0, 160));
console.warn = () => {};

async function call(payload) {
  try {
    const res = await worker.fetch(new Request("http://localhost/generate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }), env, { waitUntil() {} });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  } catch (error) {
    return { status: 0, data: {}, threw: String(error?.message || error).slice(0, 120) };
  }
}

// 화면이 보내는 「살아 있는 입력」 딱지. 이것이 없으면 앞 관문에서 막혀 뒤를 볼 수 없다.
const intake = createRequire(import.meta.url)(`${SITE}/assets/js/simple_live_intake_v1.js`);
const candidateFor = (taskDescription) => intake.buildCandidateFromValues({
  school: "한국고등학교", grade: "고2", subject: "물리", subject_group: "과학",
  task_description: taskDescription, selected_subject: "물리", selected_subject_group: "과학",
});
const BASE = {
  schoolName: "한국고등학교", grade: "고2", subject: "물리", subjectGroup: "과학",
  career: "natural", track: "natural", major: "물리학과", studentCode: "sc-study0002-ep68",
  keyword: "등가속도 운동", selectedKeyword: "등가속도 운동", selectedConcept: "힘과 운동", conceptPicked: true,
};

// 보고서 글을 한 덩어리로.
const bodyOf = (data) => {
  const r = data?.result || {};
  const parts = [r.report, r.reportTitle];
  for (const one of r.sections || []) parts.push(one?.title, one?.body);
  for (const [k, v] of Object.entries(r)) if (typeof v === "string") parts.push(v);
  return parts.filter(Boolean).join("\n");
};
const numbersIn = (text) => (String(text).match(/\d+(?:\.\d+)?/g) || []);

let bad = 0;
const say = (ok, label, detail = "") => {
  if (!ok) bad += 1;
  console.log(`${ok ? "  OK  " : "  흠  "} ${label}${detail ? ` — ${detail}` : ""}`);
};

// ── ① 깨진 안내문 ─────────────────────────────────────────────────────────────────────
console.log("■ 깨진 안내문을 넣었을 때");
const BROKEN = [
  ["빈칸", ""],
  ["한 글자", "ㅋ"],
  ["기호 덩어리", "!!!???###@@@$$$%%%^^^&&&***"],
  ["숫자만", "1234567890 1234567890"],
  ["이모지만", "😀😀😀😀😀"],
  ["영어만", "Write a report about your topic."],
  ["스크립트", "<script>alert('x')</script> 탐구 보고서"],
  ["표를 통째로 긁음", "번호\t항목\t배점\n1\t내용\t20\n2\t형식\t10\n".repeat(60)],
  ["아주 긴 글", "탐구 보고서를 작성한다. ".repeat(900)],
  ["줄바꿈만", "\n\n\n\n\n\n"],
];
for (const [name, text] of BROKEN) {
  const out = await call({ ...BASE, taskDescription: text, liveInputCandidate: candidateFor(text), reportStage: "experiment_draft" });
  if (out.threw) { say(false, name, `엔진이 예외로 죽었다: ${out.threw}`); continue; }
  if (out.status >= 500) { say(false, name, `${out.status} — 서버 오류`); continue; }
  if (!out.data.ok) {
    const message = String(out.data.message || out.data.error || "");
    const korean = /[가-힣]/.test(message);
    say(korean, name, korean ? `막음: ${message.slice(0, 44)}` : `막았는데 한국어 안내가 없다: ${message.slice(0, 60)}`);
    continue;
  }
  const body = bodyOf(out.data);
  const leaked = /<script|alert\(/.test(body);
  say(!leaked, name, leaked ? "학생이 쓴 스크립트가 보고서에 새어 나왔다" : `보고서가 나왔다 (${body.length}자)`);
}

// ── ② 학생이 표를 이상하게 채웠을 때 ──────────────────────────────────────────────────
console.log("\n■ 학생이 표를 이상하게 채웠을 때 (숫자를 지어내면 안 된다)");
const TASK = "용수철에 매단 추의 무게를 바꾸며 늘어난 길이를 자로 재어 표에 적는다";
const ROUGH = [
  ["숫자 칸에 글자", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: ["모름", "몰라요", "안 쟀음"] }, { label: "추 2개", values: ["?", "-", ""] }] }],
  ["전부 빈칸", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: ["", "", ""] }, { label: "추 2개", values: ["", "", ""] }] }],
  ["조건이 아예 없음", { measurementName: "길이", unit: "cm", conditions: [] }],
  ["값이 하나뿐", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: [5] }] }],
  ["0 을 열두 개", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: [1e12, 2e12, 3e12] }, { label: "추 2개", values: [4e12, 5e12, 6e12] }] }],
  ["음수와 0", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: [-5, 0, -3] }, { label: "추 2개", values: [0, 0, 0] }] }],
  ["소수점이 여럿", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: ["3.1.4", "2..7", "5,5"] }] }],
  ["조건 이름이 빈칸", { measurementName: "길이", unit: "cm", conditions: [{ label: "", values: [1, 2, 3] }, { label: "   ", values: [4, 5, 6] }] }],
  ["단위에 스크립트", { measurementName: "길이", unit: "<script>alert(1)</script>", conditions: [{ label: "추 1개", values: [1, 2, 3] }] }],
  ["이름이 아주 긴 글", { measurementName: "길".repeat(500), unit: "cm", conditions: [{ label: "추".repeat(500), values: [1, 2, 3] }] }],
  ["값이 뒤죽박죽 꼴", { measurementName: "길이", unit: "cm", conditions: [{ label: "추 1개", values: [{ x: 1 }, [2], null] }] }],
  ["자료 카드가 빈 껍데기", { sourceCards: [{ title: "", type: "", point: "", take: "" }, { title: "   ", type: null, point: undefined, take: 0 }] }],
];
for (const [name, studentData] of ROUGH) {
  const out = await call({ ...BASE, taskDescription: TASK, liveInputCandidate: candidateFor(TASK), reportStage: "experiment_final", studentData });
  if (out.threw) { say(false, name, `엔진이 예외로 죽었다: ${out.threw}`); continue; }
  if (out.status >= 500) { say(false, name, `${out.status} — 서버 오류`); continue; }
  if (!out.data.ok) {
    const message = String(out.data.message || out.data.error || "");
    const korean = /[가-힣]/.test(message);
    say(korean, name, korean ? `막음: ${message.slice(0, 44)}` : `막았는데 한국어 안내가 없다: ${message.slice(0, 60)}`);
    continue;
  }
  const body = bodyOf(out.data);
  const gave = new Set((studentData.conditions || []).flatMap((c) => (c.values || []).map((v) => String(v))));
  // 학생이 준 숫자가 아닌 값이 본문에 있는가. 작은 수(차례·개수)는 뺀다.
  const made = numbersIn(body).filter((n) => Number(n) > 12 && !gave.has(n));
  const leaked = /<script|alert\(/.test(body);
  const problems = [];
  if (made.length) problems.push(`학생이 안 준 숫자: ${made.slice(0, 5).join(", ")}`);
  if (leaked) problems.push("스크립트가 새어 나왔다");
  if (body.length > 40000) problems.push(`본문이 ${body.length}자로 너무 길다`);
  say(!problems.length, name, problems.join(" · ") || `보고서가 나왔다 (${body.length}자)`);
}

console.log(`\n흠 ${bad}건`);
if (engineLog.length) {
  console.log(`\n엔진이 남긴 말 ${engineLog.length}줄 (앞 8줄)`);
  engineLog.slice(0, 8).forEach((one) => console.log(`  ${one}`));
}
