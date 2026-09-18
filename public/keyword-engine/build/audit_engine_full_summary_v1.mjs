// audit_engine_full_v1.mjs 의 결과를 모아 문제별로 센다.
//   node public/keyword-engine/build/audit_engine_full_summary_v1.mjs <폴더> [--show 문제이름] [--n 20]
import { readdirSync, readFileSync } from "node:fs";

const dir = process.argv[2];
const arg = (name, fallback) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
const SHOW = arg("--show", "");
const N = Number(arg("--n", "15"));
const rows = [];
let skipped = 0;
const outbound = {};
let engineLog = [];
for (const file of readdirSync(dir).filter((f) => /^rows_\d+\.json$/.test(f))) {
  const one = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  rows.push(...one.rows);
  skipped = one.skipped;
  for (const [k, v] of Object.entries(one.outbound || {})) outbound[k] = (outbound[k] || 0) + v;
  engineLog = engineLog.concat(one.engineLog || []);
}
const count = (list) => list.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
const top = (m) => [...m].sort((a, b) => b[1] - a[1]);

if (SHOW) {
  const hit = rows.filter((r) => r.issues.some((i) => i.kind === SHOW));
  console.log(`${SHOW}: ${hit.length}건\n`);
  for (const r of hit.slice(0, N)) {
    const detail = r.issues.filter((i) => i.kind === SHOW).map((i) => i.detail).join(" | ");
    console.log(`${r.id} [${r.subject}·${r.kind || "-"}] ${r.task.slice(0, 110)}\n   → ${detail}\n`);
  }
  process.exit(0);
}

console.log(`검사한 과제 ${rows.length.toLocaleString()}건 (사이트에서 고를 수 없는 과목 ${skipped.toLocaleString()}건 제외)`);
console.log(`바깥으로 나간 예상 밖 호출: ${JSON.stringify(outbound)}`);
console.log(`\n과제 종류: ${top(count(rows.map((r) => r.kind || "(없음)"))).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`단계: ${top(count(rows.map((r) => r.stage || "(없음)"))).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
const has = (key) => rows.filter((r) => (r[key] || []).length).length;
console.log(`참고 자료에 붙은 것 — 논문 ${has("refPapers")} · 서울대 글 ${has("web")} · 공공데이터 ${has("datasets")} · 다음걸음 연구 ${has("research")}`);
console.log(`\n문제별 (과제 수):`);
const perKind = count(rows.flatMap((r) => [...new Set(r.issues.map((i) => i.kind))]));
for (const [k, v] of top(perKind)) console.log(`  ${String(v).padStart(5)}  ${k}`);
const clean = rows.filter((r) => !r.issues.length).length;
console.log(`\n문제 없는 과제 ${clean.toLocaleString()}건 (${Math.round((clean / rows.length) * 100)}%)`);
const logs = top(count(engineLog.map((l) => l.replace(/\d+/g, "#").slice(0, 80)))).slice(0, 8);
if (logs.length) console.log(`\n엔진 오류 기록(앞 200줄 중): ${logs.map(([k, v]) => `${v}× ${k}`).join("\n  ")}`);
