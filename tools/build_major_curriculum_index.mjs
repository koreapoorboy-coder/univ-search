// Bundles the 33 curricula into the one file the Worker fetches, with the 고교 연계 already worked out.
//
// The matching needs the 3,222-word concept index; doing it here means the Worker never loads that file and
// never repeats the work. What ships is: major → the courses that stand on a 고교 개념, which 개념, and which
// 고교 과목 the major leans on overall.
//
// Usage (repo root): node tools/build_major_curriculum_index.mjs
// Output: public/keyword-engine/seed/engine-index/major_curriculum_index.v1.json
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { linkCurriculum, subjectsBehindMajor } from "../admission_worker_skeleton/major_curriculum_v1.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const curriculumDir = join(repo, "public/keyword-engine/data/majors/curriculum");
const outDir = join(repo, "public/keyword-engine/seed/engine-index");
const index = JSON.parse(readFileSync(join(outDir, "concept_term_index.v1.json"), "utf8"));

const majors = {};
let courses = 0;
let linked = 0;
for (const file of readdirSync(curriculumDir).filter((name) => name.endsWith(".json"))) {
  let raw;
  try { raw = JSON.parse(readFileSync(join(curriculumDir, file), "utf8")); } catch { continue; }
  const result = linkCurriculum(raw, index, 2);
  if (!result.major) continue;
  courses += result.courseCount;
  linked += result.linkedCount;
  majors[result.major] = {
    group: result.group,
    sources: result.sources,
    // Only the courses that actually reach a 고교 개념 travel; the rest would just be a list of names.
    years: result.years.map((year) => ({
      year: year.year,
      courses: year.courses.filter((course) => course.highSchool.length).map((course) => ({
        title: course.title,
        highSchool: course.highSchool.map((hit) => ({ subject: hit.subject, concept: hit.concept })),
      })),
    })).filter((year) => year.courses.length),
    leans: subjectsBehindMajor(result).slice(0, 5),
    courseCount: result.courseCount,
    linkedCount: result.linkedCount,
  };
}

const out = {
  version: "major-curriculum-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "data/majors/curriculum/*.json (대학 공개 교육과정) × concept_term_index.v1.json",
  note: "대학 과목과 학년은 대학이 공개한 것. 고교 연계는 개념 낱말로 맞춘 우리 판단이며 인용 가능한 사실이 아니다.",
  majors,
};

mkdirSync(outDir, { recursive: true });
const path = join(outDir, "major_curriculum_index.v1.json");
writeFileSync(path, JSON.stringify(out), "utf8");
const empty = Object.entries(majors).filter(([, m]) => !m.years.length).map(([name]) => name);
console.log(`학과 ${Object.keys(majors).length} · 과목 ${courses} · 연결 ${linked}`);
console.log(`연결이 하나도 없는 학과: ${empty.join(", ") || "없음"}`);
console.log(`wrote ${path} (${Math.round(JSON.stringify(out).length / 1024)}KB)`);
