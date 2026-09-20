// 과목마다 **가장 많이 나오는 단원**을 정한다. ₩0.
//
// 과제 글이 주제를 아예 말하지 않을 때(「과제」, 「발표」, 「실험 및 보고서」) 쓰는 마지막 자리다.
// 학생 전공으로도 단원을 못 고르면 여기로 온다.
//
// 아무 단원이나 고르면 안 된다. 진짜 수행평가 중 **사이트에서 고를 수 있는 과목의 것 2,473건**을 엔진
// 자신의 단원 찾기(inferConcept)로 돌려
// **그 과목에서 실제로 가장 자주 나오는 단원**을 센다. 「이 과목 수행평가는 대개 이 단원에서 나온다」는
// 사실에 기대는 것이지, 우리가 고른 것이 아니다.
//
//   node tools/build_subject_default_unit.mjs           — 세기만 한다
//   node tools/build_subject_default_unit.mjs --write   — 실제로 쓴다
import { readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { inferConcept } from "../admission_worker_skeleton/book_match_v1.mjs";
import { siteSubject } from "./site_subject.mjs";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");
const SEED = "../public/keyword-engine/seed/engine-index";
const axisIndex = JSON.parse(await readFile(here(`${SEED}/longitudinal_axis_index.v1.json`), "utf8"));

const CORPUS = "../public/keyword-engine/data/assessment/records/assessment_tasks.v1.jsonl";
const tally = {};
let read = 0;
const lines = createInterface({ input: createReadStream(here(CORPUS), { encoding: "utf8" }) });
for await (const line of lines) {
  let task;
  try { task = JSON.parse(line); } catch { continue; }
  const raw = String(task.subject_standard || task.subject_raw || "").trim();
  const subject = siteSubject(raw);
  if (!subject) continue;
  read += 1;
  const text = [task.raw_task_title, task.raw_task_desc].filter(Boolean).join(" ").slice(0, 1500);
  const concept = inferConcept(subject, text, axisIndex);
  if (!concept) continue;
  (tally[subject] = tally[subject] || {})[concept] = (tally[subject][concept] || 0) + 1;
}

const defaults = {};
for (const [subject, counts] of Object.entries(tally)) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, one) => sum + one[1], 0);
  defaults[subject] = { concept: sorted[0][0], count: sorted[0][1], of: total };
}
// 단원이 한 번도 안 잡힌 과목은 축 목록의 첫 기본 단원(priority 1)으로 둔다. 없는 것보다 낫다.
for (const axis of Object.values(axisIndex.axes || {})) {
  if (!axis.subject || defaults[axis.subject] || axis.priority !== 1) continue;
  defaults[axis.subject] = { concept: axis.concept, count: 0, of: 0 };
}

console.log(`과제 ${read.toLocaleString()}건을 읽어 과목 ${Object.keys(defaults).length}개의 기본 단원을 정했다`);
for (const [subject, one] of Object.entries(defaults).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${subject.padEnd(12)} ${one.concept}${one.of ? `  (${one.count}/${one.of}건)` : "  (과제에서 안 잡힘 — 축 첫 단원)"}`);
}

if (WRITE) {
  const body = {
    version: "subject-default-unit-v1",
    built_at: new Date().toISOString().slice(0, 10),
    note: "과제 글이 단원을 전혀 말하지 않을 때 쓰는 과목별 기본 단원. 진짜 수행평가에서 가장 자주 나온 단원이다. tools/build_subject_default_unit.mjs 가 만든다.",
    subjects: defaults,
  };
  await writeFile(here(`${SEED}/subject_default_unit.v1.json`), `${JSON.stringify(body)}\n`, "utf8");
  console.log("\n썼습니다: seed/engine-index/subject_default_unit.v1.json");
} else {
  console.log("\n(보여 주기만 했습니다. 쓰려면 --write 를 붙이세요.)");
}
