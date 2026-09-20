// 전공 × 과목 → 단원 표를 만든다. ₩0.
//
// 왜 필요한가. 수행평가 전수 검사 2,473건 중 **567건은 과제 글이 주제를 말하지 않는다** — 「과제」,
// 「발표」, 「실험 및 보고서」, 「자유주제탐구」. 선생님이 "알아서 정해 와"라고 한 것이다. 이때 엔진은
// 단원을 못 정하고, 단원을 모르니 논문도 책도 안 붙어 속이 빈 보고서가 나간다(오류 화면은 안 뜬다).
//
// 학생에게 "어느 단원이에요?"라고 묻는 것은 마지막 수단이다. 학생은 단원 이름을 모른다. 대신 우리가
// 이미 받아 둔 것으로 정한다 — **학생이 적은 전공**이다.
//
// 재료는 두 가지다.
//   · major_curriculum_index — 대학 33곳 전공의 실제 수업을 고교 단원에 이어 둔 표. 가장 단단하지만
//     이어진 칸이 13%뿐이다(140/1,056). 사학과·영어영문학과는 0개다.
//   · 그 전공의 **수업 제목**(유체역학·열전달·알고리즘…) 260개. 이것을 종단 축 낱말과 맞춰 빈 칸을 메운다.
//
// 축 낱말 맞추기는 그 **과목 안에서만** 한다. 컴퓨터학과 학생의 정보 과제에 「전자기와 양자」 축을
// 물려 주면 안 된다.
//
//   node tools/build_major_subject_concept_index.mjs           — 몇 칸이 차는지만 보여 준다
//   node tools/build_major_subject_concept_index.mjs --write   — 실제로 쓴다
import { readFile, writeFile } from "node:fs/promises";
import { matchAxes, expandMajorTerms } from "../admission_worker_skeleton/upload_analysis_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");
const arg = (name, fallback) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
// 점수가 낮은 짝은 안 쓴다. 틀린 단원은 단원이 없는 것보다 나쁘다 — 보고서 전체가 엉뚱한 자리에 선다.
const FLOOR = Number(arg("--floor", "15"));

const SEED = "../public/keyword-engine/seed/engine-index";
const majors = JSON.parse(await readFile(here(`${SEED}/major_curriculum_index.v1.json`), "utf8")).majors;
const axisIndex = JSON.parse(await readFile(here(`${SEED}/longitudinal_axis_index.v1.json`), "utf8"));

// 축이 있는 과목 전부. 축이 없는 과목은 단원을 줄 수 없다.
const subjects = [...new Set(Object.values(axisIndex.axes || {}).map((one) => one.subject).filter(Boolean))].sort();

// **그 과목에 실제로 있는 단원 이름**만 통과시킨다.
//
// major_curriculum_index 의 고교 연결은 사람이 적은 것이라 축 목록과 이름이 어긋난 것이 섞여 있다 —
// 「공통국어1 / 과학 기술과 인간·미래 사회 성찰」처럼. 이것을 그대로 쓰면 참고 자료에 「공통국어1 교과서 ·
// (그 과목에 없는) 단원」이라고 적히고, 그건 거짓말이다.
const realUnits = new Set(Object.values(axisIndex.axes || {})
  .filter((one) => one.subject && one.concept)
  .map((one) => `${String(one.subject).replace(/\s+/g, "")}::${String(one.concept).replace(/\s+/g, "")}`));
const isReal = (subject, concept) => realUnits.has(`${String(subject).replace(/\s+/g, "")}::${String(concept).replace(/\s+/g, "")}`);
let dropped = 0;

const out = {};
let grounded = 0;
let derived = 0;
for (const [major, entry] of Object.entries(majors)) {
  const courses = (entry.years || []).flatMap((year) => (year.courses || []).map((course) => course.title)).filter(Boolean);
  // 수업 제목이 가장 센 단서다. 전공 이름에서 쪼갠 말은 뜻이 흐려서 점수를 낮춰 넣는다(expandMajorTerms).
  const terms = [...courses.map((title) => ({ term: title, weight: 1 })), ...expandMajorTerms(major)];
  // 대학 수업이 실제로 이어 둔 고교 단원. 같은 단원이 여러 수업에 걸리면 그만큼 센 것이다.
  const linked = new Map();
  for (const year of entry.years || []) {
    for (const course of year.courses || []) {
      for (const link of course.highSchool || []) {
        if (!link?.subject || !link?.concept) continue;
        const key = `${link.subject}::${link.concept}`;
        linked.set(key, (linked.get(key) || 0) + 1);
      }
    }
  }
  const perSubject = {};
  for (const subject of subjects) {
    const own = [...linked.entries()]
      .filter(([key]) => key.split("::")[0] === subject)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key.split("::")[1])
      .filter((concept) => { const ok = isReal(subject, concept); if (!ok) dropped += 1; return ok; });
    if (own.length) {
      perSubject[subject] = { concepts: own.slice(0, 3), from: "curriculum" };
      grounded += 1;
      continue;
    }
    const found = matchAxes(terms, axisIndex, 3, subject).filter((axis) => axis.score >= FLOOR);
    if (!found.length) continue;
    perSubject[subject] = { concepts: found.map((axis) => axis.concept), from: "course", score: found[0].score };
    derived += 1;
  }
  out[major] = perSubject;
}

const filled = Object.values(out).reduce((sum, one) => sum + Object.keys(one).length, 0);
const possible = Object.keys(majors).length * subjects.length;
console.log(`전공 ${Object.keys(majors).length}개 × 과목 ${subjects.length}개 = ${possible}칸`);
console.log(`  대학 교육과정이 직접 이어 둔 칸 ${grounded}`);
console.log(`  이름이 그 과목 단원 목록에 없어 버린 연결 ${dropped}개`);
console.log(`  수업 제목으로 채운 칸 ${derived} (점수 ${FLOOR} 이상)`);
console.log(`  합계 ${filled}칸 (${Math.round((filled / possible) * 100)}%)`);
console.log();
for (const [major, per] of Object.entries(out).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)) {
  console.log(`  ${String(Object.keys(per).length).padStart(2)}과목  ${major}`);
}

if (WRITE) {
  const body = {
    version: "major-subject-concept-v1",
    built_at: new Date().toISOString().slice(0, 10),
    note: "전공 × 과목 → 단원. 과제 글이 주제를 말하지 않을 때만 쓴다. tools/build_major_subject_concept_index.mjs 가 만든다.",
    floor: FLOOR,
    majors: out,
  };
  await writeFile(here(`${SEED}/major_subject_concept_index.v1.json`), `${JSON.stringify(body)}\n`, "utf8");
  console.log("\n썼습니다: seed/engine-index/major_subject_concept_index.v1.json");
} else {
  console.log("\n(보여 주기만 했습니다. 쓰려면 --write 를 붙이세요.)");
}
