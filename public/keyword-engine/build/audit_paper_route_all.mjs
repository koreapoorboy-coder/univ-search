// 학생 글로 논문 찾기(paper_route_v1) — 실제 수행평가 전수에 돌려 본다. ₩0.
//
// 묻는 것 두 가지:
//   1. 얼마나 붙는가  — 과목별로, 길(바꾸고 재기 / 주장 / 설명)별로
//   2. 붙은 것이 진짜인가 — 무작위로 뽑아 눈으로 읽는다. 숫자는 이걸 대신 못 한다.
//
//   node public/keyword-engine/build/audit_paper_route_all.mjs [--seed N] [--show N]
import { readFile } from "node:fs/promises";
import { routePapers, routedPaperLine, shardFile } from "../../../admission_worker_skeleton/paper_route_v1.mjs";
import { inferConcept } from "../../../admission_worker_skeleton/book_match_v1.mjs";
const axisIndex = JSON.parse(await readFile(new URL("../seed/engine-index/longitudinal_axis_index.v1.json", import.meta.url), "utf8"));

const here = (name) => new URL(name, import.meta.url);
const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? Number(process.argv[at + 1]) : fallback;
};
const SHOW = arg("--show", 30);
let seed = arg("--seed", 7);
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// 수행평가 데이터의 과목 이름 → 묶음 과목. Ⅱ 과목은 같은 학문이므로 Ⅰ 묶음을 쓴다.
const tight = (name) => String(name || "").replace(/\s+/g, "").replace(/(Ⅱ|II|Ⅰ|I)$/, "");
const ALIAS = { 통합과학: "통합과학1", 과학탐구실험: "과학탐구실험1", 물리학: "물리", 공통국어: "공통국어1", 통합사회: "통합사회1" };

const shards = new Map();
async function shardOf(subject) {
  if (shards.has(subject)) return shards.get(subject);
  let shard = null;
  try {
    const body = JSON.parse(await readFile(here(`../seed/${shardFile(subject)}`), "utf8"));
    shard = { rows: body.rows, units: body.units || [] };
  } catch { shard = null; }
  shards.set(subject, shard);
  return shard;
}

const tasks = (await readFile(here("../data/assessment/records/assessment_tasks.v1.jsonl"), "utf8"))
  .split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);

const bySubject = new Map();
const byRoute = new Map();
const samples = [];
let tried = 0;
let got = 0;
for (const task of tasks) {
  const raw = tight(task.subject_standard);
  const subject = ALIAS[raw] || raw;
  const shard = await shardOf(subject);
  if (!shard) continue;
  tried += 1;
  const text = `${task.raw_task_title || ""} ${task.raw_task_desc || ""}`;
  // 보고서의 단원 — 워커와 같게 과제 글에서 추정한다. 꼬리표가 붙은 논문은 이 단원과 같을 때만 나온다.
  // 단원은 **하나**만 쓴다(워커와 같다). 후보를 셋으로 늘리면 넓은 단원(빅데이터 활용 등)이 끼어 붙는 비율은
  // 3%→5%로 오르지만 정확도가 약 75%→65%로 되돌아갔다 — 화산 분포 과제에 택시 GPS 논문이 붙었다.
  const unit = inferConcept(subject, text, axisIndex);
  const units = unit ? [`${subject}::${unit}`] : [];
  const { query, picked } = routePapers(shard.rows, text, task.report_mode, {
    limit: 2, subject, anchor: task.raw_task_title || "", units, table: shard.units });
  const one = bySubject.get(subject) || { tried: 0, got: 0 };
  one.tried += 1;
  if (picked.length) { one.got += 1; got += 1; }
  bySubject.set(subject, one);
  const r = byRoute.get(query.route) || { tried: 0, got: 0 };
  r.tried += 1;
  if (picked.length) r.got += 1;
  byRoute.set(query.route, r);
  if (picked.length) samples.push({ subject, text, query, picked });
}

const pct = (a, b) => `${b ? Math.round((a / b) * 100) : 0}%`;
console.log(`과목 묶음이 있는 수행평가 ${tried.toLocaleString()}건 가운데 논문이 붙은 것 ${got.toLocaleString()}건 (${pct(got, tried)})\n`);
console.log("과목별:");
for (const [subject, one] of [...bySubject].sort((a, b) => b[1].tried - a[1].tried)) {
  console.log(`  ${subject.padEnd(10)} ${String(one.got).padStart(4)} / ${String(one.tried).padStart(4)}  ${pct(one.got, one.tried)}`);
}
console.log("\n길별:");
const LABEL = { change: "바꾸고 재기", claim: "주장", explain: "설명" };
for (const [route, one] of byRoute) console.log(`  ${LABEL[route].padEnd(6)} ${one.got} / ${one.tried}  ${pct(one.got, one.tried)}`);

console.log(`\n무작위 ${SHOW}건 — 눈으로 읽는다:\n`);
const pool = [...samples];
for (let n = 0; n < SHOW && pool.length; n += 1) {
  const one = pool.splice(Math.floor(rand() * pool.length), 1)[0];
  console.log(`[${one.subject} · ${LABEL[one.query.route]}] ${one.text.replace(/\s+/g, " ").slice(0, 90)}`);
  const slot = one.query.slots;
  console.log(`   중심: ${one.query.center.join("·") || "-"}`);
  if (slot.change.length || slot.measure.length) console.log(`   칸: 바꾸는 것 ${slot.change.join("·") || "-"} / 재는 것 ${slot.measure.join("·") || "-"}`);
  for (const paper of one.picked) {
    console.log(`   → ${routedPaperLine(paper).slice(0, 110)}`);
    console.log(`     함께 걸린 말: ${paper.fit.hits.join(" + ")}`);
  }
  console.log("");
}
