// 과제 글이 단원을 말하지 않을 때 우리가 단원을 정하는 길을 지킨다.
//
// 이 파일이 지키는 것: **빈 단원을 내보내지 않는다.** 그리고 **아무 단원이나 집지 않는다** —
// 단단한 것(대학 교육과정이 이어 둔 단원)부터 차례로 보고, 학생이 이미 쓴 단원은 뺀다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chooseUnit, UNIT_SOURCE } from "../../../admission_worker_skeleton/unit_fallback_v1.mjs";
import { expandMajorTerms, matchAxes } from "../../../admission_worker_skeleton/upload_analysis_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const seed = (name) => readFile(here(`../seed/engine-index/${name}`), "utf8").then(JSON.parse);
const [axisIndex, majorSubjectIndex, defaultUnitIndex] = await Promise.all([
  seed("longitudinal_axis_index.v1.json"),
  seed("major_subject_concept_index.v1.json"),
  seed("subject_default_unit.v1.json"),
]);
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const all = { axisIndex, majorSubjectIndex, defaultUnitIndex };

// U1. 전공 이름 쪼개기. 학생은 「기계」가 아니라 「기계공학과」라고 쓴다.
{
  const terms = (name) => expandMajorTerms(name).map((one) => one.term);
  check(terms("기계공학과").includes("기계"), "U1 기계공학과 → 기계", terms("기계공학과").join(","));
  check(terms("간호학과").includes("간호"), "U1 간호학과 → 간호", terms("간호학과").join(","));
  check(terms("생명과학과").includes("생명"), "U1 생명과학과 → 생명", terms("생명과학과").join(","));
  check(terms("체육교육과").includes("체육"), "U1 체육교육과 → 체육", terms("체육교육과").join(","));
  check(terms("전기전자공학부").includes("전기전자"), "U1 전기전자공학부 → 전기전자", terms("전기전자공학부").join(","));
  // 「기계공」처럼 말이 안 되는 토막이 나오면 안 된다 — 꼬리를 한 번에 떼면 그렇게 된다.
  check(!terms("기계공학과").includes("기계공"), "U1 「기계공」 같은 토막은 만들지 않는다");
  // 한 글자만 남는 것은 버린다.
  check(!terms("사학과").includes("사"), "U1 한 글자만 남으면 버린다", terms("사학과").join(","));
  check(expandMajorTerms("").length === 0 && expandMajorTerms(null).length === 0, "U1 전공이 없으면 아무것도 안 준다");
  // 쪼갠 말은 점수를 낮춰 넣는다 — 뜻이 흐리기 때문이다.
  const w = expandMajorTerms("기계공학과");
  check(w[0].weight > w[w.length - 1].weight, "U1 짧게 쪼갠 말일수록 점수가 낮다");
}

// U2. 축은 **그 과목 안에서만** 고른다. 컴퓨터학과 학생의 정보 과제에 물리 축을 물려 주면 안 된다.
{
  const found = matchAxes(expandMajorTerms("컴퓨터학과"), axisIndex, 4, "정보");
  check(found.every((axis) => axis.subject === "정보"), "U2 과목을 주면 그 과목 축만 나온다",
    found.map((a) => a.subject).join(","));
  const free = matchAxes(["기계"], axisIndex, 3);
  check(free.length > 0, "U2 과목을 안 주면 예전처럼 모든 과목에서 찾는다");
}

// U3. 차례. 대학 교육과정이 이어 둔 단원이 제일 먼저다.
{
  const fake = { majors: { 시험학과: { 물리: { concepts: ["힘과 운동"], from: "curriculum" } } } };
  const hit = chooseUnit({ subject: "물리", major: "시험학과", majorSubjectIndex: fake, ...all, majorSubjectIndex: fake });
  check(hit.concept === "힘과 운동", "U3 전공 표에 있는 단원을 먼저 쓴다", hit.concept);
  check(hit.from === UNIT_SOURCE.MAJOR_CURRICULUM, "U3 그 까닭을 남긴다", hit.from);
}

// U4. 학생이 이미 쓴 단원은 뺀다. 같은 학생 생활기록부에 같은 말이 두 번 오르면 안 된다.
{
  const fake = { majors: { 시험학과: { 물리: { concepts: ["힘과 운동", "에너지와 열"], from: "curriculum" } } } };
  const hit = chooseUnit({ subject: "물리", major: "시험학과", ...all, majorSubjectIndex: fake, used: ["힘과 운동"] });
  check(hit.concept === "에너지와 열", "U4 이미 쓴 단원은 건너뛴다", hit.concept);
  // 띄어쓰기가 달라도 같은 단원으로 본다.
  const spaced = chooseUnit({ subject: "물리", major: "시험학과", ...all, majorSubjectIndex: fake, used: ["힘과운동"] });
  check(spaced.concept === "에너지와 열", "U4 띄어쓰기가 달라도 같은 단원으로 본다", spaced.concept);
}

// U5. 아무것도 못 찾으면 **그 과목에서 가장 자주 나오는 단원**으로 간다. 빈 단원은 내보내지 않는다.
{
  const hit = chooseUnit({ subject: "물리", major: "없는학과", ...all });
  check(Boolean(hit.concept), "U5 전공을 몰라도 단원이 나온다", JSON.stringify(hit));
  check(hit.from === UNIT_SOURCE.SUBJECT_DEFAULT, "U5 마지막 자리였다고 남긴다", hit.from);
  // 사이트에서 고를 수 있는 과목은 **전부** 기본 단원이 있어야 한다. 하나라도 비면 그 과목은 빈 보고서가 나간다.
  const { SITE_SUBJECTS } = await import(new URL("../../../tools/site_subject.mjs", import.meta.url));
  const missing = Object.keys(SITE_SUBJECTS).filter((subject) => !chooseUnit({ subject, ...all }).concept);
  // **이제 빈 과목은 하나도 없다**(2026-09-26). 전에는 여섯 과목이 비어 있었다 —
  // 융합과학 탐구·과학과제 연구·화학 반응의 세계·생물의 유전·데이터 과학·인공지능 기초.
  // 사회·도덕 19과목을 넣으면서 기본 단원 표(build_subject_default_unit.mjs)를 다시 만들었더니
  // 그 여섯 개까지 메워졌다. 과제에서 안 잡히는 과목은 **축의 첫 단원**을 기본으로 쓴다.
  // 고를 수 있는 과목이 하나라도 비면 그 과목 학생은 빈 보고서를 받는다. 그래서 0개여야 한다.
  check(missing.length === 0, "U5 고를 수 있는 과목은 모두 기본 단원이 있다", missing.join(", ") || "0개");
}

// U6. 과목이 없으면 아무것도 주지 않는다 — 과목을 모르면서 단원을 고르는 것은 지어내기다.
{
  const hit = chooseUnit({ subject: "", major: "기계공학과", ...all });
  check(hit.concept === "" && hit.from === UNIT_SOURCE.NONE, "U6 과목을 모르면 단원도 없다", JSON.stringify(hit));
}

// U7. 고른 단원은 **그 과목의 진짜 단원 이름**이어야 한다. 아니면 참고 자료 줄이 거짓이 된다.
{
  const names = new Set(Object.values(axisIndex.axes || {}).map((axis) => `${axis.subject}::${axis.concept}`));
  const { SITE_SUBJECTS } = await import(new URL("../../../tools/site_subject.mjs", import.meta.url));
  const wrong = [];
  for (const subject of Object.keys(SITE_SUBJECTS)) {
    for (const major of Object.keys(majorSubjectIndex.majors || {})) {
      const hit = chooseUnit({ subject, major, ...all });
      if (hit.concept && !names.has(`${subject}::${hit.concept}`)) wrong.push(`${subject}/${major}/${hit.concept}`);
    }
  }
  check(wrong.length === 0, "U7 고른 단원은 그 과목에 실제로 있는 단원이다", wrong.slice(0, 3).join(" | "));
}

console.log(`PASS unit fallback: ${passed}/${passed}`);
