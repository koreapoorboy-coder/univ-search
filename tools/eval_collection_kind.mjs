// Measures how often the engine guesses right about what a student will actually collect.
//
// The corpus does not carry our five kinds, but it carries something better: the 평가방법 checkboxes and the
// output the teacher asked for, both taken straight off the real 평가계획. Where those two agree on an obvious
// answer — 실험·실습 with an 실험보고서 means measurement, 논술 with a 논술문 means there is nothing to collect —
// that agreement is the ground truth here. Rows where they disagree are left out rather than guessed at, so the
// score is measured against tasks whose kind is not in doubt.
//
// Usage (repo root): node tools/eval_collection_kind.mjs [--show 20]
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCollectionKind } from "../admission_worker_skeleton/report_stages_v1.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(repo, "public/keyword-engine/data/assessment/records/assessment_tasks.v1.json");
const show = Number((process.argv.find((a) => a.startsWith("--show=")) || "").split("=")[1] || 0);

const GROUP_MAP = [
  [/정보|소프트|AI|인공지능|기술/, "정보"], [/과학|공학/, "과학"], [/수학/, "수학"], [/국어|문학/, "국어"],
  [/영어|외국어|한문/, "영어"], [/예술|체육|예체능|음악|미술/, "예술·체육"],
  [/사회|역사|윤리|지리|인문|교양|융합|생활|경제|정치/, "사회"],
];
const groupOf = (value) => GROUP_MAP.find(([p]) => p.test(String(value || "")))?.[1] || "기타";

// Only the unmistakable combinations count. Anything else returns null and the row is skipped.
//
// The corpus's own 자료해석형 tag cannot be used for `dataset`: it means "interpret the material you were given",
// which for a 국어 task is reading a text, not copying published figures into a table. A 음운 변동 탐구 came out
// as dataset under that rule. So dataset is only claimed when the task itself asks for 통계·지표·데이터.
function groundTruth(row) {
  const methods = (row.raw_method_labels || []).join(" ");
  const outputs = (row.output_axis || []).join(" ");
  const modes = (Array.isArray(row.report_mode) ? row.report_mode : [row.report_mode]).filter(Boolean).join(" ");
  const text = `${row.raw_task_title || ""} ${row.raw_task_desc || ""}`;

  // Asked for in the task itself, so they win over whatever the axes say.
  if (/설문|인터뷰|여론 ?조사|응답자/.test(text)) return "survey";
  if (/실험|실습/.test(text) && /실험보고서/.test(outputs)) return "measurement";
  if (/통계|지표|데이터|그래프|수치 ?자료|공공 ?데이터/.test(text) && /자료분석지|보고서/.test(outputs)) return "dataset";

  // Nothing to collect: the student writes, performs or makes something.
  if (/실기|시연|연주|가창|경기|연습|실음/.test(`${text} ${outputs} ${modes}`)) return "none";
  if (/논술|논설|비평|서평|감상문|창작|시 쓰기|소설 쓰기/.test(text)) return "none";
  if (/창작물|작품|실기산출물/.test(outputs) && !/실험보고서|자료분석지/.test(outputs)) return "none";

  // Collected from measuring, when the method says so even if the wording does not.
  // 실험보고서 as an output is only believable where an experiment is plausible. The corpus files 수학 탐구
  // 보고서 and 미술 창작 under it too, and scoring against that would be scoring against the tagging, not us.
  if (/실험·실습|실험실습/.test(methods) && /실험보고서/.test(outputs) && /과학|정보|공학/.test(row.subject_group || "")) return "measurement";

  // Collected from reading: the task says 조사 or 문헌 and the output is a report, with no numbers asked for.
  if (/조사|문헌|자료를 찾|탐구 보고서/.test(text) && /탐구보고서|보고서/.test(outputs) && !/실험보고서|자료분석지/.test(outputs)) return "reading";
  return null;
}

const rows = [];
const rl = createInterface({ input: createReadStream(corpus, "utf8"), crlfDelay: Infinity });
for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let row;
  try { row = JSON.parse(trimmed); } catch { continue; }
  const truth = groundTruth(row);
  if (!truth) continue;
  rows.push({
    truth,
    group: groupOf(row.subject_group),
    subject: row.subject_standard || row.subject_raw || "",
    title: row.raw_task_title || "",
    desc: row.raw_task_desc || "",
  });
}

const KINDS = ["measurement", "survey", "dataset", "reading", "none"];
const confusion = new Map();
const wrong = [];
let right = 0;
for (const row of rows) {
  const guess = resolveCollectionKind({ taskDescription: `${row.title} ${row.desc}`, subject: row.subject, subjectGroup: row.group });
  const key = `${row.truth} → ${guess}`;
  confusion.set(key, (confusion.get(key) || 0) + 1);
  if (guess === row.truth) right += 1;
  else wrong.push({ ...row, guess });
}

const pct = (n, d) => `${Math.round((n / Math.max(1, d)) * 1000) / 10}%`;
console.log(`판단이 분명한 과제 ${rows.length.toLocaleString()}건으로 채점 (전체 7,131건 중)\n`);
console.log(`전체 정확도: ${right.toLocaleString()} / ${rows.length.toLocaleString()} = ${pct(right, rows.length)}\n`);

console.log("== 유형별");
for (const kind of KINDS) {
  const total = rows.filter((r) => r.truth === kind).length;
  if (!total) continue;
  const hit = rows.filter((r) => r.truth === kind).length - wrong.filter((r) => r.truth === kind).length;
  console.log(`  ${kind.padEnd(12)} ${String(hit).padStart(5)} / ${String(total).padStart(5)}  ${pct(hit, total)}`);
}

console.log("\n== 가장 흔한 오답 (정답 → 우리 판단)");
[...confusion.entries()].filter(([key]) => key.split(" → ")[0] !== key.split(" → ")[1])
  .sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([key, count]) => console.log(`  ${String(count).padStart(5)}  ${key}`));

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";
if (show) {
  const picked = only ? wrong.filter((row) => `${row.truth} -> ${row.guess}` === only) : wrong;
  console.log(`\n== 틀린 과제 ${Math.min(show, picked.length)}개${only ? ` (${only})` : ""}`);
  picked.slice(0, show).forEach((r) => console.log(`  [${r.truth} -> ${r.guess}] ${r.group}/${r.subject} · ${r.title} · ${r.desc.slice(0, 80)}`));
}
