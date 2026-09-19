// Builds the lookup that turns a student's repeated interests into the next subject their work leads to.
//
// The engine already owns 24 subject maps of 종단 축 — 162 concepts, 471 axes, 1,710 keywords — each axis saying
// which subjects and majors it leads into, why, and what a student produces along it. Only the site's keyword
// screen ever read them; the upload analysis invented its own suggestions instead.
//
// This reduces them to one file the Worker can fetch: keyword → axes, and each axis with what it needs to propose
// a next report.
//
// Usage (repo root): node tools/build_axis_index.mjs
// Output: public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const axisDir = join(repo, "public/keyword-engine/seed/followup-axis");
const outDir = join(repo, "public/keyword-engine/seed/engine-index");

const clip = (value, max) => String(value ?? "").trim().slice(0, max);
const axes = {};
const byKeyword = new Map();
let subjects = 0;
let concepts = 0;

for (const file of readdirSync(axisDir).filter((name) => name.endsWith("_concept_longitudinal_map.json"))) {
  let map;
  try { map = JSON.parse(readFileSync(join(axisDir, file), "utf8")); } catch { continue; }
  const subject = clip(map.subject_name, 30) || file.replace("_concept_longitudinal_map.json", "");
  subjects += 1;
  for (const concept of map.concept_longitudinal_map || []) {
    concepts += 1;
    // 대수 지도는 칸 이름이 `axes`다(다른 과목은 `longitudinal_axes`). 예전에는 이걸 못 읽어 대수 단원이
    // 통째로 빠졌다 — 대수 과제의 단원·교과서 줄·다음 걸음이 모두 비었다(2026-09-19).
    for (const axis of concept.longitudinal_axes || concept.axes || []) {
      const id = clip(axis.axis_id, 60);
      if (!id || axes[id]) continue;
      axes[id] = {
        title: clip(axis.axis_title, 60),
        short: clip(axis.axis_short, 20),
        subject,
        concept: clip(concept.concept_name || concept.concept_key, 40),
        next: (axis.next_subjects || []).map((value) => clip(value, 30)).filter(Boolean).slice(0, 5),
        why: clip(axis.why, 200),
        output: clip(axis.student_output_hint, 160),
        priority: Number(axis.priority) || 9,
      };
      for (const signal of axis.keyword_signals || []) {
        const boost = Number(signal.boost) || 50;
        for (const keyword of signal.keywords || []) {
          const term = clip(keyword, 30);
          if (term.length < 2) continue;
          const list = byKeyword.get(term) || [];
          list.push({ axis: id, boost });
          byKeyword.set(term, list);
        }
      }
    }
  }
}

// One keyword can point at several axes; the strongest few are enough and keep the file small.
//
// A keyword that reaches many axes says little about any of them: 데이터 and 모델링 appear all over the maps, and
// left alone they buried the 우주·궤도 축 under a 세포 실험 축 for a student whose whole record was aerospace. Each
// keyword's pull is divided by how far it spreads.
const keywords = Object.fromEntries([...byKeyword.entries()].map(([term, list]) => [
  term,
  list.sort((a, b) => b.boost - a.boost).slice(0, 4)
    .map((item) => [item.axis, Math.max(1, Math.round(item.boost / Math.sqrt(list.length)))]),
]));

const index = {
  version: "longitudinal-axis-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: `seed/followup-axis (${subjects} subjects, ${concepts} concepts)`,
  axes,
  keywords,
};

mkdirSync(outDir, { recursive: true });
const path = join(outDir, "longitudinal_axis_index.v1.json");
writeFileSync(path, JSON.stringify(index), "utf8");
console.log(`과목 ${subjects} · 개념 ${concepts} · 축 ${Object.keys(axes).length} · 키워드 ${Object.keys(keywords).length}`);
console.log(`${path.replace(repo, "")} ${(readFileSync(path).length / 1024).toFixed(0)}KB`);
