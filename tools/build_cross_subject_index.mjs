// Builds the lookup that lets a report cross into another subject.
//
// 수행평가 is moving toward 횡단 평가: the task is set in one subject, but the work that stands out connects it to
// another. The engine already owned the material and never used it — 26 subjects' bridge points (which subjects a
// concept can move into and why), 53 majors' followup axes (which subjects a major actually draws on), and the
// 7,131-task corpus (which group every real school subject belongs to). This reduces all three to one small file
// the Worker fetches, so the prompt can name a real partner subject instead of the model guessing one.
//
// Usage (repo root): node tools/build_cross_subject_index.mjs
// Output: public/keyword-engine/seed/engine-index/cross_subject_index.v1.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const axisDir = join(repo, "public/keyword-engine/seed/followup-axis");
const corpus = join(repo, "public/keyword-engine/data/assessment/records/assessment_tasks.v1.json");
const outDir = join(repo, "public/keyword-engine/seed/engine-index");

const clip = (value, max) => String(value ?? "").trim().slice(0, max);
// The curriculum maps put majors and school subjects in one "next" list — 간호학과 next to 화학. A report can cross
// into a subject; it cannot cross into a career, so major names are dropped here rather than leaking downstream.
const MAJOR_NAME = /(학과|학부|전공|대학|예과)$/;
const list = (value, max, each) => (Array.isArray(value) ? value : [])
  .map((item) => clip(item, each))
  .filter((item) => item && !MAJOR_NAME.test(item))
  .slice(0, max);

// The corpus labels subject groups 32 different ways (사회, 사회·역사, 사회·역사·윤리 …). A report only needs to
// know whether two subjects are far enough apart to count as a crossing, so they collapse to eight.
const GROUP_OF = [
  [/국어|문학/, "국어"],
  [/수학/, "수학"],
  [/영어|외국어|한문/, "영어·외국어"],
  [/사회|역사|지리|윤리|인문/, "사회"],
  [/과학/, "과학"],
  [/정보|공학|기술|AI/, "정보·기술"],
  [/예술|예체능|체육/, "예술·체육"],
];
const canonGroup = (raw) => {
  const text = clip(raw, 40);
  for (const [pattern, group] of GROUP_OF) if (pattern.test(text)) return group;
  return "교양·융합";
};

// Which group a school subject belongs to, learned from the real 평가계획 rather than guessed from its name.
const subjectGroup = {};
const seen = new Map();
for (const line of readFileSync(corpus, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let task;
  try { task = JSON.parse(line); } catch { continue; }
  const subject = clip(task.subject_standard, 30);
  const group = canonGroup(task.subject_group);
  if (!subject || !group) continue;
  const counts = seen.get(subject) || new Map();
  counts.set(group, (counts.get(group) || 0) + 1);
  seen.set(subject, counts);
}
// How many real 과제 each subject carries. A partner subject only helps if the student is plausibly taking it, and
// the corpus is the only honest measure of that — 확률과 통계 appears in hundreds of 평가계획, 전자기와 양자 in none.
const subjectCount = {};
for (const [subject, counts] of seen) {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  subjectGroup[subject] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (total >= 3) subjectCount[subject] = total;
}

// The 24 concept maps name subjects the corpus never sees (물질과 에너지, 세포와 물질대사 …). Their axis_domain
// says what kind of thinking the axis is, which is enough to place the subject.
const DOMAIN_GROUP = {
  math: "수학", data: "수학", info: "정보·기술", engineering: "정보·기술",
  physics: "과학", chemistry: "과학", biology: "과학", earth_env: "과학", science: "과학",
  social_policy: "사회", language: "국어", art: "예술·체육",
};

// Which subjects a subject can honestly move into, and on what shared idea.
const bridges = {};
const bridgeFile = JSON.parse(readFileSync(join(axisDir, "subject_bridge_point.json"), "utf8"));
for (const entry of Array.isArray(bridgeFile) ? bridgeFile : []) {
  const subject = clip(entry.subject_name, 30);
  if (!subject) continue;
  const points = (entry.bridge_points || []).map((point) => ({
    keywords: list(point.bridge_keywords, 10, 20),
    next: list(point.next_subject_candidates, 8, 20),
    desc: clip(point.bridge_desc, 160),
    domains: list(point.mapped_axis_domains, 8, 20),
  })).filter((point) => point.next.length);
  if (points.length) bridges[subject] = points;
  for (const point of points) {
    for (const domain of point.domains) {
      const group = DOMAIN_GROUP[domain];
      if (group && !subjectGroup[subject]) subjectGroup[subject] = canonGroup(subject) === "교양·융합" ? group : canonGroup(subject);
    }
  }
}
for (const subject of Object.keys(bridges)) {
  if (!subjectGroup[subject]) subjectGroup[subject] = canonGroup(subject);
  for (const point of bridges[subject]) {
    for (const next of point.next) if (!subjectGroup[next]) subjectGroup[next] = canonGroup(next);
  }
}

// Which subjects a major actually draws on — the student tells us their 진로, so this is the one bridge that is
// keyed to something they chose themselves.
const majors = {};
const majorFile = JSON.parse(readFileSync(join(axisDir, "major_followup_axis.json"), "utf8"));
for (const entry of Array.isArray(majorFile) ? majorFile : []) {
  const name = clip(entry.major_name, 30);
  if (!name) continue;
  const next = [...list(entry.grade2_next_subjects, 6, 20), ...list(entry.linked_subjects, 6, 20)];
  if (!next.length) continue;
  const current = majors[name] || { base: clip(entry.base_subject, 20), next: [], desc: clip(entry.axis_desc, 160) };
  current.next = [...new Set([...current.next, ...next])].slice(0, 8);
  if (!current.desc) current.desc = clip(entry.axis_desc, 160);
  majors[name] = current;
  for (const subject of next) if (!subjectGroup[subject]) subjectGroup[subject] = canonGroup(subject);
}

const out = {
  version: "cross-subject-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "subject_bridge_point.json + major_followup_axis.json + assessment_tasks.v1.json",
  groups: ["국어", "수학", "영어·외국어", "사회", "과학", "정보·기술", "예술·체육", "교양·융합"],
  subjectGroup,
  subjectCount,
  bridges,
  majors,
};

mkdirSync(outDir, { recursive: true });
const path = join(outDir, "cross_subject_index.v1.json");
writeFileSync(path, JSON.stringify(out), "utf8");
console.log(`subjects placed in a group: ${Object.keys(subjectGroup).length}`);
console.log(`subjects schools actually run (3+ tasks): ${Object.keys(subjectCount).length}`);
console.log(`subjects with a bridge: ${Object.keys(bridges).length} (${Object.values(bridges).reduce((n, p) => n + p.length, 0)} bridge points)`);
console.log(`majors with a subject list: ${Object.keys(majors).length}`);
console.log(`wrote ${path} (${Math.round(JSON.stringify(out).length / 1024)}KB)`);
