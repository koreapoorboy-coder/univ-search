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
// **「살펴보기:」로 시작하는 것은 흠으로 세지 않는다.** 사람이 훑어볼 목록이지 잘못이 아니다 —
// 낱말 겹침으로 연구 연결을 재면 좋은 연결의 61%가 걸린다(2026-09-21 확인).
const isLook = (kind) => String(kind).startsWith("살펴보기:");
// 「맞게막음:」은 보고서 과제가 아닌 것을 바르게 막은 것이다. 잘못이 아니므로 흠으로 세지 않되,
// 학생은 아무것도 못 받으므로 따로 세어 보여 준다.
const isRight = (kind) => String(kind).startsWith("맞게막음:");
const wrong = (r) => r.issues.filter((i) => !isLook(i.kind) && !isRight(i.kind));
const clean = rows.filter((r) => !wrong(r).length).length;
const looks = rows.filter((r) => r.issues.some((i) => isLook(i.kind))).length;
const blocked = rows.filter((r) => r.issues.some((i) => isRight(i.kind))).length;
if (blocked) console.log(`
맞게 막은 과제 ${blocked.toLocaleString()}건 (보고서 과제가 아니어서 — 학생은 못 받는다)`);
if (looks) console.log(`
사람이 살펴볼 것 ${looks.toLocaleString()}건 (흠으로 세지 않음)`);
console.log(`\n문제 없는 과제 ${clean.toLocaleString()}건 (${Math.round((clean / rows.length) * 100)}%)`);

// **진짜 점수.** 위 숫자는 우리가 읽고 맞춰 온 자료로 낸 것이라 실제보다 높을 수 있다. 한 번도 안 본
// 학교(tools/holdout_schools_2026_09.json)만 따로 내면, 처음 보는 안내문에서 어떻게 될지에 더 가깝다.
const held = rows.filter((r) => r.hold);
const seen = rows.filter((r) => !r.hold);
if (held.length) {
  const ok = (list) => list.filter((r) => !wrong(r).length).length;
  console.log(`  ├ 우리가 봐 온 학교   ${ok(seen).toLocaleString()}/${seen.length.toLocaleString()} (${Math.round((ok(seen) / seen.length) * 100)}%)`);
  console.log(`  └ 한 번도 안 본 학교 ${ok(held).toLocaleString()}/${held.length.toLocaleString()} (${Math.round((ok(held) / held.length) * 100)}%)  ← 진짜 점수`);
}
const logs = top(count(engineLog.map((l) => l.replace(/\d+/g, "#").slice(0, 80)))).slice(0, 8);
if (logs.length) console.log(`\n엔진 오류 기록(앞 200줄 중): ${logs.map(([k, v]) => `${v}× ${k}`).join("\n  ")}`);
