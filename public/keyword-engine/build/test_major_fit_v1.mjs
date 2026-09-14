// 학과 적합도는 근거여야 한다. Run it against the real 33-department index, not a fixture, so the test fails
// when a curriculum file changes shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fitForMajor, fitNote, majorFit } from "../../../admission_worker_skeleton/major_fit_v1.mjs";

const index = JSON.parse(await readFile(new URL("../seed/engine-index/major_curriculum_index.v1.json", import.meta.url), "utf8"));
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const report = (over = {}) => ({
  grade: "고2", subject: "물리", crossSubject: ["정보"], concept: "전기 저항", keyword: "저항",
  axis: { title: "측정 신뢰도 축" }, title: "니크롬선 저항의 온도 의존성 3회 반복 측정", ...over,
});

// F1: 증거가 있는 학과만 올라온다.
{
  const fit = majorFit([report()], index, {});
  check(fit.checked === 33, "F1 all 33 departments are read", String(fit.checked));
  check(fit.ranked.length > 0, "F1 a 물리·정보 report reaches at least one department");
  check(fit.ranked.every((row) => row.touchedCount > 0), "F1 a department with no evidence never appears in the list");
  check(fit.ranked.every((row) => row.touched.every((course) => course.via.every((link) => link.reports.length))),
    "F1 every touched course names the report that touched it");
  check(fit.ranked[0].touched[0].via[0].reports[0].title.includes("니크롬선"), "F1 and that is the student's own title",
    JSON.stringify(fit.ranked[0].touched[0].via[0].reports[0]));
}

// F2: 아무것도 안 한 학생에게 순위를 주지 않는다.
{
  const empty = majorFit([], index, {});
  check(empty.ranked.length === 0, "F2 no reports means no ranking");
  check(empty.note.includes("아직 보고서가 없어요"), "F2 and it says so plainly", empty.note);
  const nothing = majorFit([report({ subject: "체육", crossSubject: [], concept: "", keyword: "줄넘기", axis: null, title: "줄넘기 기록" })], index, {});
  check(nothing.ranked.every((row) => row.touchedCount > 0), "F2 an unrelated report does not invent a department");
}

// F3: 학생이 고른 학과는 순위와 따로 나온다 — 낮아도 숨기지 않는다.
{
  const fit = majorFit([report()], index, { major: "간호학과" });
  check(fit.picked && fit.picked.major === "간호학과", "F3 the department the student chose is answered directly");
  check(typeof fit.picked.touchedCount === "number", "F3 with a count, high or low", String(fit.picked.touchedCount));
  const unknown = majorFit([report()], index, { major: "우주해양행성학과" });
  check(unknown.picked.unknown === true && unknown.picked.touchedCount === 0,
    "F3 a department we have no curriculum for is said to be unknown, not scored");
}

// F4: 닿지 않은 과목은 다음에 할 수 있는 것으로 돌려준다.
{
  const fit = majorFit([report()], index, { major: "컴퓨터학과" });
  check(Array.isArray(fit.picked.open), "F4 untouched courses come back as an opening");
  check(fit.picked.open.every((course) => course.needs.length && !course.via.length),
    "F4 and each one says which 고교 과목 it wants", JSON.stringify(fit.picked.open.slice(0, 2)));
  check(fit.picked.open.length <= 6, "F4 without dumping the whole curriculum on a student", String(fit.picked.open.length));
}

// F5: 과목 이름이 조금 달라도 같은 과목이다. 학생은 물리라고 쓰고 교육과정은 물리학이라고 쓴다.
{
  const nursing = index.majors["간호학과"];
  const viaStats = fitForMajor("간호학과", nursing, [{ title: "t", grade: "고3", subjects: ["확률과 통계"], concepts: [] }]);
  check(viaStats.touchedCount >= 1, "F5 확률과 통계 reaches 통계학", JSON.stringify(viaStats.subjects));
  const viaSpaces = fitForMajor("간호학과", nursing, [{ title: "t", grade: "고3", subjects: ["확률과통계"], concepts: [] }]);
  check(viaSpaces.touchedCount === viaStats.touchedCount, "F5 a space does not make it a different subject");
  const viaKorean = fitForMajor("간호학과", nursing, [{ title: "t", grade: "고1", subjects: ["공통국어"], concepts: [] }]);
  check(viaKorean.touchedCount >= 1, "F5 공통국어 reaches 공통국어1", JSON.stringify(viaKorean.subjects));
  const viaShort = fitForMajor("간호학과", nursing, [{ title: "t", grade: "고1", subjects: ["국"], concepts: [] }]);
  check(viaShort.touchedCount === 0, "F5 one syllable is not a subject match");
}

// F6: 한 줄 설명은 과장하지 않는다.
{
  check(fitNote(0, [], null).includes("아직"), "F6 no reports, no claim");
  check(fitNote(2, [{ major: "컴퓨터학과", touchedCount: 2 }], null).includes("이르고"),
    "F6 two reports are not called a direction", fitNote(2, [{ major: "컴퓨터학과", touchedCount: 2 }], null));
  const mismatch = fitNote(4, [{ major: "물리학과", touchedCount: 3 }], { major: "간호학과", touchedCount: 0 });
  check(mismatch.includes("학과를 바꾸라는 말이 아니라"), "F6 a mismatch never tells a student to change their mind", mismatch);
  check(fitNote(5, [{ major: "물리학과", touchedCount: 4 }], { major: "물리학과", touchedCount: 4 }).includes("점수가 아니라 근거"),
    "F6 and the whole thing says out loud that it is not a score");
}

console.log(`PASS major fit: ${passed}/${passed}`);
