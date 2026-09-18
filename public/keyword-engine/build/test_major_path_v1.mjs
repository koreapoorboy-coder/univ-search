// Which way the report reaches the student's future, and what happens when it cannot.
//
// The rule this file exists to hold: 학생의 선택이나 결과나 연결에서 우리가 생각하지 못한 것이 나오면 교과 심화
// 확장으로 간다. 교과 심화 확장 is the floor, not a consolation for undecided students — so most of what is
// checked here is failure, and that every kind of failure lands in the same safe place.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { axisPromptLines, curriculumPathPromptLines, majorPathPromptLines, resolveMajorPath } from "../../../admission_worker_skeleton/major_path_v1.mjs";

const index = JSON.parse(readFileSync(new URL("../seed/engine-index/major_curriculum_index.v1.json", import.meta.url), "utf8"));
const AXES = [{ title: "전기 신호 해석 축", subject: "물리", concept: "물질의 전기적 특성", next: ["전자기와 양자", "정보"], why: "저항과 전류를 재는 힘이 신호 해석으로 이어짐" }];

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const path = (input) => resolveMajorPath(input, index);
const lines = (input, axes = AXES) => majorPathPromptLines(path(input), axes).join("\n");

// P1: the index carries 33 curricula with their 고교 연계 already worked out.
check(Object.keys(index.majors).length === 33, "P1 all 33 majors are bundled", String(Object.keys(index.majors).length));
check(index.majors["물리학과"].leans[0].subject === "물리", "P1 물리학과 comes out leaning on 물리", JSON.stringify(index.majors["물리학과"].leans[0]));
check(Object.values(index.majors).every((m) => Array.isArray(m.sources) && m.sources.length), "P1 every major carries where its curriculum came from");
check(/인용 가능한 사실이 아니다/.test(index.note), "P1 and says plainly that the 고교 연계 is our reading");

// P2: the upgrade. A named major, a curriculum we hold, and a course that touches this very concept.
{
  const chosen = path({ major: "전기전자공학부", subject: "물리", selectedConcept: "물질의 전기적 특성" });
  check(chosen.mode === "curriculum", "P2 a major whose curriculum touches this task takes the curriculum path", chosen.mode);
  check(chosen.hits.length > 0 && chosen.hits.every((hit) => hit.title && hit.concept), "P2 and names the real courses it reaches");
  const text = lines({ major: "전기전자공학부", subject: "물리", selectedConcept: "물질의 전기적 특성" });
  check(/대학이 공개한 교육과정에서 가져온 것이다/.test(text), "P2 the prompt says where the list came from");
  check(/학과 이름은 한 번까지만 쓴다/.test(text), "P2 the major is a lens, not a word to repeat");
  check(/기대는 고교 과목/.test(text), "P2 and the subjects the major leans on are counted, not asserted");
  check(path({ major: "전자공학과", subject: "물리", selectedConcept: "물질의 전기적 특성" }).mode === "curriculum",
    "P2 a near-miss name still finds its curriculum (전자공학과 → 전기전자공학부)");
}

// P3: every way this can fail, and they all land in the same place.
{
  const fails = [
    ["", "NO_MAJOR", "전공을 아직 정하지 않은 학생"],
    ["공학계열", "TRACK_ONLY", "계열까지만 고른 학생"],
    ["치위생학과", "NO_CURRICULUM", "우리가 교육과정을 가지고 있지 않은 학과"],
    ["ㅁㄴㅇㄹ", "NO_CURRICULUM", "오타나 뜻 없는 입력"],
  ];
  for (const [major, reason, why] of fails) {
    const result = path({ major, subject: "물리", selectedConcept: "물질의 전기적 특성" });
    check(result.mode === "axis" && result.reason === reason, `P3 ${why} → 교과 심화 확장`, `${result.mode}/${result.reason}`);
  }
  const far = path({ major: "전기전자공학부", subject: "생명과학", selectedConcept: "효소" });
  check(far.mode === "axis" && far.reason === "NOT_TOUCHING",
    "P3 a real curriculum that does not reach this task → 교과 심화 확장", `${far.mode}/${far.reason}`);
}

// P4: what the floor says. It has to be a real section, not an apology for having nothing.
{
  const text = lines({ major: "", subject: "물리", selectedConcept: "물질의 전기적 특성" });
  check(/후속 탐구 — 결론 마지막 문단/.test(text), "P4 the follow-up is named for the 교과, not the 계열 — and lives in the conclusion (no separate section, 2026-09-18)");
  check(/진로를 맞히는 자리가 아니다/.test(text), "P4 and says outright that it is not a place to guess a career");
  check(/전기 신호 해석 축/.test(text), "P4 the 종단 축 we already matched is what it builds on");
  check(/무엇을 바꾸어 무엇을 볼지까지 구체적으로/.test(text), "P4 and it still has to propose something the student can do");
  check(/학과 이름이나 직업 이름을 쓰지 않는다/.test(text), "P4 no department name — the student may change their mind");
  check(/생활기록부에 3년간 남는다/.test(text), "P4 with the reason given, because the reason is the point");
  check(/억지로 넓히는 것보다/.test(text), "P4 and one accurate direction beats a forced list");
}

// P5: the fallback says why it fell back, so the model does not fill the gap with a guess.
{
  check(/아직 전공을 정하지 않았다/.test(lines({ major: "", subject: "물리" })), "P5 undecided is stated as undecided");
  check(/계열까지만 정했고/.test(lines({ major: "공학계열", subject: "물리" })), "P5 계열-only is stated too");
  check(/닿는 부분이 없다/.test(lines({ major: "전기전자공학부", subject: "생명과학", selectedConcept: "효소" })),
    "P5 and a curriculum that does not reach says so rather than stretching");
  check(/전공 이야기로 끌고 가지 않는다/.test(lines({ major: "", subject: "물리" })), "P5 each of them ends the same way");
}

// P6: nothing to build on is still a usable section, and bad input never throws.
{
  const bare = majorPathPromptLines({ mode: "axis", reason: "NO_MAJOR" }, []).join("\n");
  check(/후속 탐구/.test(bare) && /이어서 할 수 있는 탐구/.test(bare), "P6 no axes either, and the follow-up still asks for a next step", bare.slice(0, 40));
  check(resolveMajorPath(null, index).mode === "axis", "P6 no input at all falls to the floor");
  check(resolveMajorPath({ major: "전기전자공학부" }, null).mode === "axis", "P6 no index falls to the floor");
  check(curriculumPathPromptLines({ mode: "axis" }).length === 0, "P6 the upgrade writes nothing when it did not win");
  check(axisPromptLines(null, null).length > 0, "P6 but the floor always writes something");
}

console.log(`PASS major path: ${passed}/${passed}`);
