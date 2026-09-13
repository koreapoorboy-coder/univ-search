// Reading a student's past 보고서 or 생활기록부 is its own paid action — they may come only for the analysis and
// never make a report — so it goes through the same door as the report: a valid code, one use, and nothing charged
// when the read fails. Runs the real gateway with a mocked Worker, a Map-backed KV and a fixed clock.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./worker.js", import.meta.url), "utf8");
const gateway = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

const RealDate = Date;
const FIXED_NOW = new RealDate("2026-05-10T12:00:00+09:00").getTime();
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [FIXED_NOW])); }
  static now() { return FIXED_NOW; }
};

const makeKv = () => {
  const store = new Map();
  return { store, get: async (key) => store.get(key) ?? null, put: async (key, value) => { store.set(key, value); } };
};
const uses = (kv, code) => Number(kv.store.get(`access:${code}:uses`) || 0);

let workerReply = null;
let seenPath = "";
globalThis.fetch = async (request) => {
  seenPath = new URL(request.url).pathname;
  return workerReply();
};
const reply = (body, status = 200) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const analysis = { docType: "record", level: "고2 수준", reportLines: [{ title: "t", subject: "s", why: "w", step: "x" }] };
const upload = (code, kv) => {
  const form = new FormData();
  form.append("payload", JSON.stringify({ schoolName: "테스트고등학교", grade: "고2" }));
  form.append("files", new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }), "생기부.pdf");
  return gateway.fetch(new Request(`https://access-gateway.example/${code}/__mini/analyze-upload`, { method: "POST", body: form }), { ACCESS_KV: kv });
};

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// U1: a real analysis is counted once, and reaches the Worker's own endpoint.
{
  const kv = makeKv();
  workerReply = reply({ ok: true, analysis, usage: { input_tokens: 1000, output_tokens: 2000 } });
  const res = await upload("test-0508", kv);
  const body = await res.json();
  check(res.status === 200 && body.ok === true && body.gateway.counted === true && uses(kv, "test-0508") === 1,
    "U1 a completed analysis is counted once", `${res.status} counted=${body.gateway?.counted} uses=${uses(kv, "test-0508")}`);
  check(seenPath === "/analyze-upload", "U1 the upload reaches the Worker's analyze endpoint", seenPath);
  check(body.analysis?.docType === "record", "U1 the analysis reaches the student unchanged");
}

// U2: a file we could not read is free.
{
  const kv = makeKv();
  workerReply = reply({ ok: false, error: "UPLOAD_ANALYSIS_FAILED", message: "자료에서 읽을 내용을 찾지 못했어요." }, 502);
  const res = await upload("test-0508", kv);
  const body = await res.json();
  check(res.status === 502 && body.gateway.counted === false && uses(kv, "test-0508") === 0, "U2 an unreadable file is not counted");
  check(/읽을 내용을 찾지 못했어요/.test(body.error), "U2 the student is told why, not just that it failed", body.error);
}

// U3: an upload the Worker refuses (too big, wrong type) is free and keeps its own message.
{
  const kv = makeKv();
  workerReply = reply({ ok: false, error: "UPLOAD_REJECTED", message: "파일 하나는 45MB까지예요." }, 400);
  const res = await upload("test-0508", kv);
  const body = await res.json();
  check(res.status === 400 && body.gateway.counted === false && uses(kv, "test-0508") === 0, "U3 a refused upload is not counted");
  check(/45MB/.test(body.error), "U3 the size message survives", body.error);
}

// U4: a network failure is free.
{
  const kv = makeKv();
  workerReply = () => { throw new Error("network down"); };
  const res = await upload("test-0508", kv);
  const body = await res.json();
  check(res.status === 502 && body.gateway.counted === false && uses(kv, "test-0508") === 0, "U4 a network failure is not counted");
  check(/차감되지 않았습니다/.test(body.error), "U4 the student is told the use was not counted");
}

// U5: no code, no read. The endpoint used to be callable straight from the Worker with no code at all.
{
  const kv = makeKv();
  workerReply = reply({ ok: true, analysis });
  const res = await gateway.fetch(new Request("https://access-gateway.example/__mini/analyze-upload", { method: "POST", body: new FormData() }), { ACCESS_KV: kv });
  check(res.status === 403, "U5 an upload without an access code is refused", String(res.status));
  check(uses(kv, "test-0508") === 0, "U5 nothing is counted for a refused caller");
}

// U6: a spent code cannot read either, and the failed attempt does not consume anything.
{
  const kv = makeKv();
  kv.store.set("access:limit-0508:uses", "2");
  workerReply = reply({ ok: true, analysis });
  const res = await upload("limit-0508", kv);
  const body = await res.json();
  check(res.status === 403 && body.gateway.counted === false, "U6 a code with no uses left cannot read an upload", String(res.status));
  check(/모두 사용/.test(body.error), "U6 the student is told the code is used up", body.error);
}

// U7: reading and generating draw on the same allowance, so two reads spend a two-use code.
{
  const kv = makeKv();
  workerReply = reply({ ok: true, analysis });
  await upload("limit-0508", kv);
  await upload("limit-0508", kv);
  const third = await upload("limit-0508", kv);
  check(uses(kv, "limit-0508") === 2 && third.status === 403, "U7 two reads spend a two-use code", String(uses(kv, "limit-0508")));
}

globalThis.Date = RealDate;
console.log(`PASS gateway upload billing: ${passed}/${passed}`);
