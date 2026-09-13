// 교과 융합: the report has to reach into a second subject, and the second subject has to be a real one.
// Checks the choosing (does it pick a subject far enough away, and one our data actually connects to?) and the
// instruction (does it say where that subject must do work, and does it stop the second stage re-choosing?).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crossSubjectPromptLines, normalizeGroup, pickCrossSubject } from "../../../admission_worker_skeleton/cross_subject_v1.mjs";

const index = JSON.parse(readFileSync(new URL("../seed/engine-index/cross_subject_index.v1.json", import.meta.url), "utf8"));

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const text = (bridge, stage = "") => crossSubjectPromptLines(bridge, stage).join("\n");

// C1: the index carries what the picking needs.
check(Object.keys(index.subjectGroup).length > 700, "C1 every subject the corpus saw has a group", String(Object.keys(index.subjectGroup).length));
check(Object.keys(index.bridges).length >= 20, "C1 the bridge table survived the build", String(Object.keys(index.bridges).length));
check(Object.keys(index.majors).length >= 10, "C1 majors carry the subjects they draw on", String(Object.keys(index.majors).length));
check(index.groups.length === 8, "C1 32 corpus labels collapsed to 8 groups", index.groups.join(","));

// C2: a subject lands in its group whether the corpus names it, a suffix hides it, or only its name is known.
check(normalizeGroup("생명과학", index) === "과학", "C2 a corpus subject keeps its group");
check(normalizeGroup("생명과학Ⅰ", index) === "과학", "C2 a roman-numeral level does not lose the subject", normalizeGroup("생명과학Ⅰ", index));
check(normalizeGroup("확률과 통계", index) === "수학", "C2 통계 is 수학, not 과학", normalizeGroup("확률과 통계", index));
check(normalizeGroup("통합사회", index) === "사회", "C2 통합사회 is 사회");
check(normalizeGroup("세포와 물질대사", index) === "과학", "C2 a 고2 선택 과목 the corpus never saw still lands", normalizeGroup("세포와 물질대사", index));
check(normalizeGroup("", index) === "", "C2 an empty subject stays empty");

// C3: the partner is never the student's own group — that is not a crossing.
{
  const bridge = pickCrossSubject({ subject: "생명과학", subjectGroup: "과학", taskDescription: "인체의 반응과 건강에 대해 탐구하고 보고서를 작성한다", major: "간호학과" }, index);
  check(Boolean(bridge), "C3 a science task gets a bridge");
  check(bridge.homeGroup === "과학", "C3 the home group is the task's own", bridge.homeGroup);
  check(bridge.partners.every((partner) => partner.group !== "과학"), "C3 no partner sits in the home group", bridge.partners.map((p) => `${p.subject}(${p.group})`).join(","));
  check(new Set(bridge.partners.map((p) => p.group)).size === bridge.partners.length, "C3 two partners never share a group");
  check(bridge.partners.every((partner) => partner.lens && partner.ask), "C3 every partner says what it does and what it asks");
}

// C4: the task text steers the choice. 인체·건강 reaches 사회 through the 생명과학 bridge point.
{
  const bridge = pickCrossSubject({ subject: "생명과학", taskDescription: "질환과 건강 행동 사례를 조사하여 분석한다" }, index);
  check(bridge.partners.some((partner) => partner.group === "사회" || partner.group === "수학"), "C4 a health task reaches 사회 or 수학", bridge.partners.map((p) => p.group).join(","));
  check(bridge.partners.some((partner) => partner.why), "C4 the chosen partner carries the reason from our own map");
}

// C5: a subject with no bridge entry still crosses, using where its group usually goes.
{
  const bridge = pickCrossSubject({ subject: "문학", subjectGroup: "국어·문학", taskDescription: "소설을 읽고 비평문을 작성한다" }, index);
  check(Boolean(bridge) && bridge.homeGroup === "국어", "C5 a 국어 task with no bridge point still gets one", bridge?.homeGroup);
  check(bridge.partners.length >= 1 && bridge.partners.every((p) => p.group !== "국어"), "C5 the fallback partner is outside 국어", bridge.partners.map((p) => `${p.subject}(${p.group})`).join(","));
  check(bridge.partners.every((p) => p.subject), "C5 the fallback still names a subject a student would recognise");
}

// C6: an unknown subject with no group is left alone rather than guessed at.
check(pickCrossSubject({ subject: "" }, index) === null, "C6 no subject, no bridge");
check(pickCrossSubject({ subject: "생명과학" }, null) === null, "C6 no index, no bridge");

// C7: the major the student chose pulls the partner toward their own track.
{
  const bridge = pickCrossSubject({ subject: "통합과학", taskDescription: "측정값을 비교하여 정리한다", major: "데이터사이언스학과" }, index);
  check(Boolean(bridge) && bridge.partners.length > 0, "C7 a major-led task gets a bridge");
  check(bridge.partners.some((p) => p.group === "수학" || p.group === "정보·기술"), "C7 a data major reaches 수학 or 정보", bridge.partners.map((p) => p.group).join(","));
}

// C8: the instruction says where the partner has to work, not just that it should be there.
{
  const bridge = pickCrossSubject({ subject: "생명과학", taskDescription: "건강과 질환을 조사한다" }, index);
  const lines = text(bridge);
  check(/연구 질문/.test(lines) && /비교 기준이나 분석 방법/.test(lines) && /결론/.test(lines), "C8 all three landing places are named");
  check(/최소 두 곳/.test(lines), "C8 two of the three are required, not one");
  check(/하나만 고른다/.test(lines), "C8 one partner, not both");
  check(/이름표가 아니다/.test(lines), "C8 a label is refused outright");
  check(/억지 연결을 만들지 않는다/.test(lines), "C8 a task that does not fit is allowed to stay single-subject");
  check(/reportTitle/.test(lines), "C8 the title carries the crossing too");
  check(lines.includes(bridge.partners[0].subject), "C8 the partner subject is named by name");
}

// C9: the second stage inherits, it does not re-choose. A final report that swapped subjects would not match its 설계서.
{
  const bridge = pickCrossSubject({ subject: "생명과학", taskDescription: "건강과 질환을 조사한다" }, index);
  const final = text(bridge, "experiment_final");
  check(/그대로 이어받는다/.test(final), "C9 the final report inherits the draft's crossing");
  check(!/하나만 고른다/.test(final), "C9 the final report is not told to choose again");
  check(/억지로 넣지 않는다/.test(text(bridge, "literature")), "C9 a draft with no crossing is not forced into one late");
  check(text(bridge, "experiment_draft").includes("하나만 고른다"), "C9 the draft, which sets the topic, still chooses");
}

// C10: nothing to say is said as nothing, so the prompt does not grow an empty heading.
check(crossSubjectPromptLines(null).length === 0, "C10 no bridge, no prompt lines");
check(crossSubjectPromptLines({ partners: [] }).length === 0, "C10 an empty partner list adds nothing");

console.log(`PASS cross subject: ${passed}/${passed}`);
