// How many of the 7,131 real 수행평가 과제 are not report tasks at all, and does the door turn away the right ones?
// Usage (repo root): node tools/eval_report_scope.mjs [--show=20] [--only=performance]
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveReportScope } from "../admission_worker_skeleton/report_scope_v1.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(repo, "public/keyword-engine/data/assessment/records/assessment_tasks.v1.json");
const show = Number((process.argv.find((a) => a.startsWith("--show=")) || "").split("=")[1] || 0);
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";

const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const scopes = new Map();
const byGroup = new Map();
const samples = [];
let total = 0;

const rl = createInterface({ input: createReadStream(corpus, "utf8"), crlfDelay: Infinity });
for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let row;
  try { row = JSON.parse(trimmed); } catch { continue; }
  total += 1;
  const { scope, reason } = resolveReportScope({ taskDescription: `${row.raw_task_title || ""} ${row.raw_task_desc || ""}` });
  bump(scopes, scope);
  if (scope !== "report") {
    bump(byGroup, `${row.subject_group || "?"} · ${scope}`);
    if (!only || scope === only) samples.push({ scope, reason, group: row.subject_group, subject: row.subject_standard || row.subject_raw, title: row.raw_task_title, desc: String(row.raw_task_desc || "").slice(0, 70), outputs: (row.output_axis || []).join(",") });
  }
}

const pct = (n) => `${Math.round((n / Math.max(1, total)) * 1000) / 10}%`;
console.log(`과제 ${total.toLocaleString()}건\n`);
[...scopes.entries()].sort((a, b) => b[1] - a[1]).forEach(([scope, count]) => console.log(`  ${scope.padEnd(14)} ${String(count).padStart(5)}건  ${pct(count)}`));

console.log("\n== 보고서가 아닌 과제가 많은 곳");
[...byGroup.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([key, count]) => console.log(`  ${String(count).padStart(4)}  ${key}`));

if (show) {
  console.log(`\n== 걸러진 과제 ${Math.min(show, samples.length)}개${only ? ` (${only})` : ""}`);
  samples.slice(0, show).forEach((s) => console.log(`  [${s.scope}] ${s.group}/${s.subject} · ${s.title} · ${s.desc} · 산출물:${s.outputs}`));
}
