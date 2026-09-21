// 단원 사전에 **내용 주제 단원**을 더한다. ₩0.
//
// 단원 사전은 두 군데에 있고, 둘 다 채워야 엔진이 쓴다.
//   · seed/followup-axis/<과목>_concept_longitudinal_map.json — 축. inferConcept·교과서 줄·다음걸음이 읽는다.
//   · seed/textbook-v1/subject_concept_engine_map.json        — 개념표. 학생에게 보여 줄 낱말이 여기 있다.
//
// 손으로 적은 짧은 표(add_units_*.json)를 두 모양으로 펼쳐 넣는다. **기존 단원은 건드리지 않는다.**
//
//   node tools/add_units_from_patch.mjs tools/add_units_science_inquiry_2026_09.json
//   node tools/add_units_from_patch.mjs tools/add_units_science_inquiry_2026_09.json --write
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");
const patchPath = process.argv[2];
if (!patchPath) { console.error("더할 표 파일을 주세요."); process.exit(1); }
const patch = JSON.parse(await readFile(patchPath, "utf8"));
const SEED = "../public/keyword-engine/seed";

// ── 축 파일 ────────────────────────────────────────────────────────────
const axisPath = here(`${SEED}/followup-axis/${patch.axis_file}`);
// 축 파일이 없는 과목이 있다(인공지능 기초·융합과학 탐구·데이터 과학·과학과제 연구·화학 반응의 세계).
// 사이트에서 고를 수는 있는데 단원 사전이 없어, 그 과목 학생은 무조건 빈 보고서를 받았다.
const axisDoc = JSON.parse(await readFile(axisPath, "utf8").catch(() => JSON.stringify({
  subject_name: patch.subject,
  version: "1.0.0",
  policy: "실제 수행평가 제목을 읽고 묶어 만든 단원. 시험용으로 떼어 둔 학교 과제는 읽지 않았다.",
  concept_longitudinal_map: [],
})));
const axisList = axisDoc.concept_longitudinal_map;
const have = new Set(axisList.map((one) => one.concept_name));

// 키워드는 묶음 하나로 넣는다. 원래 파일은 여러 묶음으로 나누어 놓았지만, 낱말의 무게를 나눌 근거가
// 우리에게 없다 — 손으로 고른 낱말은 모두 그 단원을 곧장 가리키는 말이다.
const axisEntry = (unit) => ({
  concept_name: unit.name,
  concept_label: unit.label,
  core_focus: unit.focus,
  longitudinal_axes: [{
    axis_id: unit.axis_id,
    axis_title: unit.axis_title,
    axis_short: unit.axis_short,
    axis_domain: unit.domain,
    priority: 1,
    next_subjects: unit.next,
    why: unit.why,
    student_output_hint: unit.output,
    keyword_signals: [{
      keywords: unit.keywords,
      boost: 24,
      label: "키워드 직접 반영",
      short: unit.axis_short,
      message: `선택한 키워드가 ${unit.name} 방향을 강화합니다.`,
      reason: `선택한 키워드가 ${unit.name} 방향을 강화합니다.`,
      desc: `선택한 키워드가 ${unit.name} 방향을 강화합니다.`,
      activity_hint: unit.output,
    }],
  }],
});

let addedAxis = 0;
for (const unit of patch.units) {
  if (have.has(unit.name)) { console.log(`  (이미 있음) ${unit.name}`); continue; }
  axisList.push(axisEntry(unit));
  addedAxis += 1;
}

// ── 개념표 ─────────────────────────────────────────────────────────────
const mapPath = here(`${SEED}/textbook-v1/subject_concept_engine_map.json`);
const conceptMap = JSON.parse(await readFile(mapPath, "utf8"));
if (!conceptMap[patch.subject]) {
  conceptMap[patch.subject] = { meta: { subject_kr: patch.subject, curriculum: "2022 개정 교육과정", source_name: "assessment_task_survey", version: "1.0.0" }, concepts: {} };
}
const own = conceptMap[patch.subject];
let addedMap = 0;
for (const unit of patch.units) {
  if (own.concepts[unit.name]) { continue; }
  own.concepts[unit.name] = {
    unit: unit.label,
    lesson_focus: unit.focus,
    core_concepts: unit.keywords.slice(0, 6),
    micro_keywords: unit.keywords,
    student_topics: unit.topics,
    linked_activity_types: unit.activities,
    linked_career_bridge: unit.careers,
    horizontal_links: (unit.next || []).slice(0, 2).map((subject) => ({
      subject,
      concept: "",
      evaluation_focus: `${unit.name} 에서 다룬 것을 ${subject} 의 관점으로 이어 설명할 수 있는가`,
      inquiry_extension: unit.output,
    })),
  };
  addedMap += 1;
}

console.log(`\n${patch.subject}`);
console.log(`  축 파일   ${axisList.length - addedAxis} → ${axisList.length} 단원 (더한 것 ${addedAxis})`);
console.log(`  개념표    ${Object.keys(own.concepts).length - addedMap} → ${Object.keys(own.concepts).length} 단원 (더한 것 ${addedMap})`);
console.log(`  더한 단원: ${patch.units.map((one) => one.name).join(" · ")}`);

if (WRITE) {
  await writeFile(axisPath, `${JSON.stringify(axisDoc, null, 2)}\n`, "utf8");
  await writeFile(mapPath, `${JSON.stringify(conceptMap, null, 2)}\n`, "utf8");
  console.log("\n두 파일을 다시 썼습니다. 이어서 아래를 돌리세요:");
  console.log("  node tools/build_axis_index.mjs");
  console.log("  node tools/build_unit_choices_index.mjs --write");
} else {
  console.log("\n(보여 주기만 했습니다. 쓰려면 --write 를 붙이세요.)");
}
