// Builds the small lookup files the report engine reads at run time, from the 7,131-task corpus.
//
// The corpus is 17MB of JSONL — far too big to fetch while a student waits. This tool reduces it once into two
// files of a few hundred KB: what shape a report of this kind takes, and which words say it is that kind.
//
// Usage (repo root): node tools/build_engine_index.mjs
// Output: public/keyword-engine/seed/engine-index/{report_shape_index.v1.json,structure_signatures.v1.json}
//
// Nothing personal survives: school names, source files and page numbers are dropped here and never written.
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveReportScope, SCOPE } from "../public/keyword-engine/assets/js/shared/report_scope_v1.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(repo, "public/keyword-engine/data/assessment/records/assessment_tasks.v1.json");
const rulesDir = join(repo, "public/keyword-engine/data/assessment/rules");
const outDir = join(repo, "public/keyword-engine/seed/engine-index");

const structureRules = JSON.parse(readFileSync(join(rulesDir, "report_structure_rules.v1.json"), "utf8"));
const modeRules = JSON.parse(readFileSync(join(rulesDir, "report_mode_rules.v1.json"), "utf8"));
const sectionsById = new Map(structureRules.structures.map((s) => [s.structure_id, s.sections]));
const formulaByMode = new Map((modeRules.mode_to_formula || []).map((m) => [m.report_mode, m.topic_formula]));

// A 음악 or 체육 task tagged as an experiment is a tagging slip, not a real experiment: 23 음악 and 21 미술 tasks
// carry structure_experiment_analysis. Those pairs are left out of the buckets so a music report never inherits
// an experiment's sections.
const EXPERIMENT_STRUCTURES = new Set([
  "structure_experiment_analysis", "structure_experiment_report", "structure_experimental_analysis",
  "structure_experiment_inquiry", "structure_research_design",
]);
const ART_PE = /예술|체육|예체능/;
const implausible = (group, structure) => ART_PE.test(String(group)) && EXPERIMENT_STRUCTURES.has(structure);

// The corpus labels 계열 twenty different ways (과학, 공학, 예술, 체육, 예체능, 사회·역사·윤리 …). The site knows six,
// so they are folded together here: fewer buckets, and each one thick enough to mean something.
const GROUP_MAP = [
  [/정보|소프트|AI|인공지능|기술/, "정보"],
  [/과학|공학/, "과학"],
  [/수학/, "수학"],
  [/국어|문학/, "국어"],
  [/영어|외국어|한문/, "영어"],
  [/예술|체육|예체능|음악|미술/, "예술·체육"],
  [/사회|역사|윤리|지리|인문|교양|융합|생활|경제|정치/, "사회"],
];
const normalizeGroup = (value) => (GROUP_MAP.find(([pattern]) => pattern.test(String(value || "")))?.[1]) || "기타";

const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);
const topOf = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

const buckets = new Map();      // 계열 × 구조
const groupOnly = new Map();    // 계열만 (사다리 한 칸 위)
const structureOnly = new Map();// 구조만 (사다리 또 한 칸 위)
const groupMode = new Map();   // 계열 × 보고서 유형 (실제로 쓰는 칸)
const modeOnly = new Map();    // 유형만 (사다리 한 칸 위)
const termsByStructure = new Map();
const termTotals = new Map();
let totalTerms = 0;
let read = 0; let dropped = 0; let noStructure = 0; let notReport = 0;

const emptyBucket = () => ({ count: 0, modes: new Map(), outputs: new Map(), rubrics: new Map(), avoid: new Map(), methods: new Map(), grades: new Map() });
const collect = (bucket, row) => {
  bucket.count += 1;
  (Array.isArray(row.report_mode) ? row.report_mode : [row.report_mode]).filter(Boolean).forEach((v) => bump(bucket.modes, v));
  (row.output_axis || []).forEach((v) => bump(bucket.outputs, v));
  (row.rubric_axis || []).forEach((v) => bump(bucket.rubrics, v));
  (row.avoid_modes || []).forEach((v) => bump(bucket.avoid, v));
  (row.raw_method_labels || []).forEach((v) => bump(bucket.methods, v));
  if (row.grade) bump(bucket.grades, String(row.grade));
};

// Korean words of two characters or more; particles are common enough across every structure that the
// distinctiveness ratio below pushes them out on its own.
const tokenize = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((t) => t.length >= 2 && t.length <= 12);

const rl = createInterface({ input: createReadStream(corpus, "utf8"), crlfDelay: Infinity });
for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let row;
  try { row = JSON.parse(trimmed); } catch { continue; }
  read += 1;
  // Tasks with no report in them (연주, 경기, 실기, 작품 제작, 참여도) are not what this engine writes, so they
  // must not shape what it writes either.
  if (resolveReportScope({ taskDescription: `${row.raw_task_title || ""} ${row.raw_task_desc || ""}` }).scope !== SCOPE.REPORT) { notReport += 1; continue; }
  const structure = row.structure_id;
  if (!structure) { noStructure += 1; continue; }
  const group = normalizeGroup(row.subject_group);
  if (implausible(group, structure)) { dropped += 1; continue; }

  const key = `${group}::${structure}`;
  if (!buckets.has(key)) buckets.set(key, emptyBucket());
  collect(buckets.get(key), row);
  if (!groupOnly.has(group)) groupOnly.set(group, emptyBucket());
  collect(groupOnly.get(group), row);
  if (!structureOnly.has(structure)) structureOnly.set(structure, emptyBucket());
  collect(structureOnly.get(structure), row);

  // report_mode comes from the 평가방법 checkboxes on the real 평가계획, so it is the trustworthy axis to group by.
  for (const mode of (Array.isArray(row.report_mode) ? row.report_mode : [row.report_mode]).filter(Boolean)) {
    const modeKey = `${group}::${mode}`;
    if (!groupMode.has(modeKey)) groupMode.set(modeKey, emptyBucket());
    collect(groupMode.get(modeKey), row);
    if (!modeOnly.has(mode)) modeOnly.set(mode, emptyBucket());
    collect(modeOnly.get(mode), row);
  }

  if (!termsByStructure.has(structure)) termsByStructure.set(structure, new Map());
  const bag = termsByStructure.get(structure);
  for (const term of tokenize(`${row.raw_task_title} ${row.raw_task_desc}`)) {
    bump(bag, term);
    bump(termTotals, term);
    totalTerms += 1;
  }
}

const shape = (bucket) => ({
  count: bucket.count,
  modes: topOf(bucket.modes, 3),
  outputs: topOf(bucket.outputs, 5).map((o) => o.value),
  rubrics: topOf(bucket.rubrics, 6).map((r) => r.value),
  avoid: topOf(bucket.avoid, 4).map((a) => a.value),
  methods: topOf(bucket.methods, 4).map((m) => m.value),
});

const index = {
  version: "engine-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "assessment_tasks.v1 (7,131건) + report_structure_rules + report_mode_rules",
  note: "학교명·파일명·쪽수는 이 파일에 들어가지 않습니다.",
  sections: Object.fromEntries([...sectionsById.entries()]),
  formulas: Object.fromEntries([...formulaByMode.entries()]),
  buckets: Object.fromEntries([...buckets.entries()].map(([key, bucket]) => [key, shape(bucket)])),
  byGroup: Object.fromEntries([...groupOnly.entries()].map(([key, bucket]) => [key, shape(bucket)])),
  byStructure: Object.fromEntries([...structureOnly.entries()].map(([key, bucket]) => [key, shape(bucket)])),
  byGroupMode: Object.fromEntries([...groupMode.entries()].map(([key, bucket]) => [key, shape(bucket)])),
  byMode: Object.fromEntries([...modeOnly.entries()].map(([key, bucket]) => [key, shape(bucket)])),
};

// Which words say a task is of this kind: a term that is far more common inside one structure than across the
// corpus as a whole. Rare terms are held back so a single odd assignment cannot define a structure.
const signatures = {};
for (const [structure, bag] of termsByStructure) {
  const size = [...bag.values()].reduce((t, c) => t + c, 0);
  if (size < 40) continue;
  const scored = [...bag.entries()]
    .filter(([, count]) => count >= 3)
    .map(([term, count]) => {
      const share = count / size;
      const overall = (termTotals.get(term) || 1) / totalTerms;
      return { term, weight: Math.round((share / overall) * 100) / 100, count };
    })
    .filter((t) => t.weight >= 1.6)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30);
  if (scored.length >= 5) signatures[structure] = scored;
}

mkdirSync(outDir, { recursive: true });
const indexPath = join(outDir, "report_shape_index.v1.json");
const signaturePath = join(outDir, "structure_signatures.v1.json");
writeFileSync(indexPath, JSON.stringify(index), "utf8");
writeFileSync(signaturePath, JSON.stringify({ version: "structure-signatures-v1", built_at: index.built_at, signatures }), "utf8");

const kb = (p) => (readFileSync(p).length / 1024).toFixed(0);
console.log(`읽은 과제 ${read.toLocaleString()}건`);
console.log(`  보고서 과제가 아니라 제외 ${notReport}건 · 구조가 없어 건너뜀 ${noStructure}건 · 계열에 안 맞아 제외 ${dropped}건`);
console.log(`계열 × 유형 칸 ${groupMode.size}개 (10건 이상 ${[...groupMode.values()].filter((b) => b.count >= 10).length}개) · 유형 ${modeOnly.size}가지`);
console.log(`계열 × 구조 칸 ${buckets.size}개 (10건 이상 ${[...buckets.values()].filter((b) => b.count >= 10).length}개)`);
console.log(`계열 사다리 ${groupOnly.size}개 · 구조 사다리 ${structureOnly.size}개`);
console.log(`구조 판별용 단어 묶음 ${Object.keys(signatures).length}개 구조`);
console.log(`\n${indexPath.replace(repo, "")} ${kb(indexPath)}KB`);
console.log(`${signaturePath.replace(repo, "")} ${kb(signaturePath)}KB`);
