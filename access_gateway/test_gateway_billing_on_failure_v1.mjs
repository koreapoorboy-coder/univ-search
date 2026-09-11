// G1 regression: the access gateway must count a use only when the Worker returns a completed report.
// Runs the real gateway module with a mocked Worker (fetch), a Map-backed KV and a fixed clock.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./worker.js", import.meta.url), "utf8");
const gateway = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

// Access codes in the gateway expire on 2026-05-31; pin the clock inside the valid window.
const RealDate = Date;
const FIXED_NOW = new RealDate("2026-05-10T12:00:00+09:00").getTime();
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [FIXED_NOW])); }
  static now() { return FIXED_NOW; }
};

const makeKv = () => {
  const store = new Map();
  return { store, get: async key => store.get(key) ?? null, put: async (key, value) => { store.set(key, value); } };
};
const uses = (kv, code) => Number(kv.store.get(`access:${code}:uses`) || 0);

let workerReply = null;
globalThis.fetch = async request => {
  assert.equal(new URL(request.url).pathname, "/generate");
  return workerReply();
};
const jsonReply = (body, status = 200) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const primaryPayload = { subject: "통합과학1", taskDescription: "효소 탐구보고서", career: "공학계열", grade: "고1", generationStage: "primary_student_result" };
const call = (code, kv, payload = primaryPayload) =>
  gateway.fetch(new Request(`https://access-gateway.example/${code}/__mini/generate`, { method: "POST", body: JSON.stringify(payload) }), { ACCESS_KV: kv });

const fullReport = "1. 연구 질문\n" + "락타아제 우유는 어떤 원리로 만들어질까? ".repeat(40);
let passed = 0;
const check = (ok, label) => { assert.equal(ok, true, label); console.log(`PASS ${label}`); passed++; };

// C1: completed report -> counted once.
{
  const kv = makeKv();
  workerReply = jsonReply({ ok: true, source: "openai", result: { reportTitle: "락타아제 우유 탐구", report: fullReport } });
  const res = await call("test-0508", kv); const body = await res.json();
  check(res.status === 200 && body.ok === true && body.gateway.counted === true && uses(kv, "test-0508") === 1, "C1 completed report is counted once");
  check(Boolean(body.gateway.generationToken), "C1 flow token is still issued for the secondary draft");
}
// C2: Worker says ok but fell back (AI error) -> not counted, clear failure.
{
  const kv = makeKv();
  workerReply = jsonReply({ ok: true, source: "seed-fallback-after-openai-error", result: { reason: "..." } });
  const res = await call("test-0508", kv); const body = await res.json();
  check(res.status === 502 && body.ok === false && body.gateway.counted === false && uses(kv, "test-0508") === 0, "C2 seed-fallback is not counted and returns 502");
  check(/차감되지 않았습니다/.test(body.error), "C2 student-facing error says the use was not counted");
}
// C3: Worker rejects the request -> not counted.
{
  const kv = makeKv();
  workerReply = jsonReply({ ok: false, error: "LIVE_INPUT_CANDIDATE_REQUIRED" }, 400);
  const res = await call("test-0508", kv); const body = await res.json();
  check(res.status === 502 && body.gateway.counted === false && body.gateway.upstreamStatus === 400 && uses(kv, "test-0508") === 0, "C3 Worker 400 is not counted");
}
// C4: network failure -> not counted.
{
  const kv = makeKv();
  workerReply = () => { throw new Error("network down"); };
  const res = await call("test-0508", kv); const body = await res.json();
  check(res.status === 502 && body.gateway.counted === false && uses(kv, "test-0508") === 0, "C4 network failure is not counted");
}
// C5: report too short to be a completed report -> not counted.
{
  const kv = makeKv();
  workerReply = jsonReply({ ok: true, source: "openai", result: { reportTitle: "짧음", report: "1. 연구 질문\n짧다." } });
  const res = await call("test-0508", kv);
  check(res.status === 502 && uses(kv, "test-0508") === 0, "C5 report under 600 characters is not counted");
}
// C6: limited code (2 uses) — two failures do not use up the allowance.
{
  const kv = makeKv();
  workerReply = jsonReply({ ok: true, source: "seed-fallback", result: {} });
  await call("limit-0508", kv); await call("limit-0508", kv);
  workerReply = jsonReply({ ok: true, source: "openai", result: { reportTitle: "완성", report: fullReport } });
  const res = await call("limit-0508", kv); const body = await res.json();
  check(res.status === 200 && body.gateway.counted === true && uses(kv, "limit-0508") === 1, "C6 failures do not consume a 2-use code; a later success counts 1");
}
// C7: secondary draft (no-count stage) keeps its previous failure behaviour.
{
  const kv = makeKv();
  workerReply = jsonReply({ ok: true, source: "openai", result: { reportTitle: "완성", report: fullReport } });
  const first = await (await call("test-0508", kv)).json();
  const token = first.gateway.generationToken;
  workerReply = () => { throw new Error("network down"); };
  const secondary = {
    ...primaryPayload,
    generationStage: "secondary_report_draft",
    mode: "secondary_expansion_report_draft_generation_v233",
    billing: { stage: "secondary_report_draft", countUsage: false, generationToken: token },
    secondaryDraftRequest: {}, secondaryExpansion: {}, generationRules: { produceDraftParagraphs: true },
  };
  const res = await call("test-0508", kv, secondary); const body = await res.json();
  check(res.status === 200 && body.ok === true && body.fallback === true && body.gateway.counted === false && uses(kv, "test-0508") === 1, "C7 secondary draft failure keeps the old no-count fallback response");
}

globalThis.Date = RealDate;
console.log(`PASS gateway billing on failure: ${passed}/${passed}`);
