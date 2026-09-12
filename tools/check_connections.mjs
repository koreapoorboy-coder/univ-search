// Read-only connection check for the keyword engine: site (Pages), access-gateway, Worker and seed data.
// Usage (repo root): node tools/check_connections.mjs
// Only GET/OPTIONS requests, plus two POSTs that the Worker rejects before any AI call or DB write.
// "배포 대기" means the live service still runs an older version than this working tree.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SITE = "https://univ-search.pages.dev";
const WORKER = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const GATEWAY = "https://access-gateway.koreapoorboy.workers.dev";
// The Worker reads its seeds from our own Pages deploy: the repo is never pushed to GitHub, so a newly built
// seed would 404 on jsDelivr. Checking the same place the Worker reads keeps this honest.
const SEED_BASE = "https://univ-search.pages.dev/keyword-engine/seed";

const local = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const lf = text => text.replace(/\r\n/g, "\n");
const sha = text => createHash("sha256").update(text).digest("hex").slice(0, 12);

const localBridgeVersion = local("public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js").match(/const VERSION = "([^"]+)"/)[1];
const localMarker = local("public/keyword-engine/index.html").match(/mini_worker_generate_bridge_v32\.js\?v=([^"]+)/)[1];
const gatewaySource = local("access_gateway/worker.js");
const localGatewayMode = gatewaySource.match(/const GATEWAY_MODE = '([^']+)'/)[1];
const seedFiles = [...local("admission_worker_skeleton/worker.js").matchAll(/^\s+\w+: '([^']+\.json)',$/gm)].map(match => match[1]);

const results = [];
const add = (area, name, status, detail = "") => results.push({ area, name, status, detail });

async function request(url, init = {}) {
  try {
    const res = await fetch(url, { redirect: "follow", ...init });
    return { status: res.status, type: res.headers.get("content-type") || "", headers: res.headers, text: await res.text() };
  } catch (error) {
    return { status: 0, type: "", headers: new Headers(), text: String(error?.message || error) };
  }
}
const parse = text => { try { return JSON.parse(text); } catch { return null; } };
const postJson = (url, body) => request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });

// Worker (curly-base-a1a9)
{
  const health = parse((await request(`${WORKER}/health`)).text);
  add("Worker", "상태(/health)", health?.ok && health?.hasDB ? "OK" : "문제", health ? `hasDB=${health.hasDB}` : "응답 없음");
  const config = parse((await request(`${WORKER}/config`)).text);
  const configOk = config?.hasOpenAIKey === true && String(config?.stubAllowed) === "false";
  add("Worker", "AI 설정(/config)", configOk ? "OK" : "문제", config ? `model=${config.model}, stubAllowed=${config.stubAllowed}` : "응답 없음");
  const generate = await postJson(`${WORKER}/generate`, "{}");
  add("Worker", "빈 생성 요청 거부", generate.status === 400 && /LIVE_INPUT_CANDIDATE_REQUIRED/.test(generate.text) ? "OK" : "문제", `HTTP ${generate.status}`);
  const intake = await postJson(`${WORKER}/live-intake`, "{}");
  add("Worker", "입력 검증(/live-intake)", intake.status === 400 && /CANDIDATE_SCHEMA_INVALID/.test(intake.text) ? "OK" : "문제", `HTTP ${intake.status}`);
  const preflight = await request(`${WORKER}/generate`, { method: "OPTIONS" });
  add("Worker", "브라우저 호출 허용(CORS)", preflight.headers.get("access-control-allow-origin") === "*" ? "OK" : "문제", `HTTP ${preflight.status}`);
}

// access-gateway
{
  const health = parse((await request(`${GATEWAY}/health`)).text);
  const liveMode = health?.mode || "(응답 없음)";
  add("gateway", "상태(/health)", health?.ok && health?.hasKV ? "OK" : "문제", health ? `hasKV=${health.hasKV}` : "응답 없음");
  add("gateway", "코드 버전", liveMode === localGatewayMode ? "OK" : "배포 대기", `운영=${liveMode} / 로컬=${localGatewayMode}`);
  const now = Date.now();
  const codes = [...gatewaySource.matchAll(/'([\w-]+)':\s*\{[^}]*?expiresAt:\s*'([^']+)'[^}]*?enabled:\s*(true|false)/g)]
    .map(([, code, expiresAt, enabled]) => ({ code, expiresAt, enabled: enabled === "true" }));
  const usable = codes.filter(code => code.enabled && Date.parse(code.expiresAt) > now);
  add("gateway", "사용 가능한 접속 코드", usable.length ? "OK" : "알림", usable.length ? usable.map(code => code.code).join(", ") : `${codes.length}개 모두 만료 (최종 배포 때 새로 발급 예정)`);
}

// Site (Pages univ-search)
{
  const html = await request(`${SITE}/keyword-engine/`);
  const liveMarker = (html.text.match(/mini_worker_generate_bridge_v32\.js\?v=([^"]+)/) || [])[1] || "(없음)";
  add("사이트", "화면 버전 표시", liveMarker === localMarker ? "OK" : "배포 대기", `운영=${liveMarker} / 로컬=${localMarker}`);
  const bridge = await request(`${SITE}/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js`);
  const liveVersion = (bridge.text.match(/const VERSION = "([^"]+)"/) || [])[1] || "(없음)";
  add("사이트", "bridge 버전", liveVersion === localBridgeVersion ? "OK" : "배포 대기", `운영=${liveVersion} / 로컬=${localBridgeVersion}`);
  const intakeScript = await request(`${SITE}/keyword-engine/assets/js/simple_live_intake_v1.js`);
  add("사이트", "입력 검증 스크립트", intakeScript.status === 200 && /javascript/.test(intakeScript.type) ? "OK" : "문제", `HTTP ${intakeScript.status}`);
  const relativeGenerate = await postJson(`${SITE}/__mini/generate`, "{}");
  add("사이트", "직접 접속 시 Worker로 전환", relativeGenerate.status === 405 ? "OK" : "문제", `사이트의 /__mini/generate POST → HTTP ${relativeGenerate.status} (405여야 Worker로 넘어감)`);
  const audit = await request(`${SITE}/keyword-engine/audit/keyword_quality_audit_template.json`);
  add("사이트", "내부 작업 파일 비공개", /json/.test(audit.type) ? "문제" : "OK", /json/.test(audit.type) ? "audit 파일이 공개되어 있음" : "audit 파일 없음(첫 화면으로 이동)");
}

// Seed data the Worker reads (jsDelivr @main) vs this working tree, ignoring CRLF.
for (const file of seedFiles) {
  const remote = await request(`${SEED_BASE}/${file}`);
  let same = false;
  try { same = remote.status === 200 && sha(lf(remote.text)) === sha(lf(local(`public/keyword-engine/seed/${file}`))); } catch {}
  add("예시·seed 데이터", file, same ? "OK" : "다름", same ? "" : `jsDelivr HTTP ${remote.status} — GitHub main 반영 필요`);
}

const width = Math.max(...results.map(result => `${result.area} · ${result.name}`.length));
for (const result of results) {
  console.log(`${result.status.padEnd(6)} ${`${result.area} · ${result.name}`.padEnd(width)}  ${result.detail}`);
}
const count = status => results.filter(result => result.status === status).length;
console.log(`\n요약: OK ${count("OK")} / 배포 대기 ${count("배포 대기")} / 알림 ${count("알림")} / 다름 ${count("다름")} / 문제 ${count("문제")}`);
process.exitCode = count("문제") ? 1 : 0;
