// 유료로 수학·과학·정보에 내보낼 때 **프로그램이 실제로 무슨 일을 하게 되는가**를 센다. ₩0.
//
// 정확도(eval_collection_kind)는 「맞았나」를 보고, 이 도구는 「무슨 일을 하게 되나」를 본다.
// 학생이 표를 채우는 두 단계 과제가 몇 %인지에 따라 비용도, 위험한 곳도 달라진다.
//
//   node tools/report_load_profile.mjs
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCollectionKind } from "../admission_worker_skeleton/report_stages_v1.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(repo, "public/keyword-engine/data/assessment/records/assessment_tasks.v1.jsonl");
const unitIndex = JSON.parse(readFileSync(join(repo, "public/keyword-engine/seed/engine-index/unit_choices.v1.json"), "utf8"));

const norm = (one) => String(one || "").trim()
  .replace(/Ⅰ/g, "1").replace(/Ⅱ/g, "2").replace(/Ⅲ/g, "3")
  .replace(/[\s·]/g, "");
const SERVED = new Set(Object.keys(unitIndex.subjects || {}).map(norm));
const ALIAS = { "물리학": "물리", "물리학1": "물리", "화학1": "화학", "생명과학1": "생명과학",
  "지구과학1": "지구과학", "통합과학": "통합과학1", "과학탐구실험": "과학탐구실험1",
  "미적분": "미적분1", "공통수학": "공통수학1", "인공지능": "인공지능기초" };
const servedName = (row) => [row.subject_raw, row.subject_standard].map(norm).find((one) =>
  one && (SERVED.has(one) || SERVED.has(norm(ALIAS[one] || ""))));

const GROUP = (one) => {
  const name = String(one || "");
  if (name === "수학") return "수학";
  if (name === "과학") return "과학";
  if (name.startsWith("정보")) return "정보";
  return null;
};

// 표를 채우는 두 단계로 가는 갈래와, 한 번에 끝나는 갈래.
const TWO_STAGE = new Set(["measurement", "survey", "dataset"]);

const rows = [];
const rl = createInterface({ input: createReadStream(corpus, "utf8"), crlfDelay: Infinity });
for await (const line of rl) {
  const one = line.trim();
  if (!one) continue;
  let row; try { row = JSON.parse(one); } catch { continue; }
  const group = GROUP(row.subject_group);
  if (!group || !servedName(row)) continue;
  const text = `${row.raw_task_title || ""} ${row.raw_task_desc || ""}`.trim();
  if (!text) continue;
  rows.push({ group, kind: resolveCollectionKind({ taskDescription: text, subjectGroup: group === "정보" ? "정보" : group }) });
}

const KIND_LABEL = { measurement: "직접 잰 숫자", survey: "설문 응답 수", dataset: "공개 자료 수치", reading: "자료 카드", none: "모을 것 없음" };
const pct = (n, d) => `${((n / Math.max(1, d)) * 100).toFixed(0)}%`;
console.log(`수학·과학·정보에서 프로그램이 받는 과제 ${rows.length.toLocaleString()}건
`);
console.log(`${"".padEnd(6)}${Object.values(KIND_LABEL).map((one) => one.padStart(14)).join("")}`);
for (const group of ["수학", "과학", "정보", "합계"]) {
  const mine = group === "합계" ? rows : rows.filter((one) => one.group === group);
  const cells = Object.keys(KIND_LABEL).map((kind) => {
    const n = mine.filter((one) => one.kind === kind).length;
    return `${n}건 ${pct(n, mine.length)}`.padStart(14);
  });
  console.log(`${group.padEnd(6)}${cells.join("")}`);
}
const two = rows.filter((one) => TWO_STAGE.has(one.kind)).length;
console.log(`
표를 채우는 두 단계 과제 : ${two.toLocaleString()}건 (${pct(two, rows.length)})`);
console.log(`한 번에 끝나는 과제     : ${(rows.length - two).toLocaleString()}건 (${pct(rows.length - two, rows.length)})`);
for (const group of ["수학", "과학", "정보"]) {
  const mine = rows.filter((one) => one.group === group);
  const n = mine.filter((one) => TWO_STAGE.has(one.kind)).length;
  console.log(`  ${group} : ${pct(n, mine.length)} 가 표를 채운다`);
}
