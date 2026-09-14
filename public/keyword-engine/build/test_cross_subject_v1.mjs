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
  check(/안 하느니만 못하다/.test(lines), "C8 a task that does not fit is allowed to stay single-subject");
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

// C11: a major is a career, not a class. The 종단 축 mixes 간호학과 and 생명공학과 into its "next" lists, and those
// were reaching the prompt as subjects to cross into.
{
  const majorish = Object.keys(index.subjectGroup).filter((name) => /(학과|학부|전공|대학|예과)$/.test(name));
  check(majorish.length === 0, "C11 no major name survived the index build", majorish.slice(0, 5).join(","));
  const bridge = pickCrossSubject({ subject: "화학", taskDescription: "반응 속도를 실험으로 확인한다", major: "간호학과", track: "의약계열", careerAxes: [{ next: ["간호학과", "생명공학과", "통합사회"], why: "축" }] }, index);
  check(bridge.partners.every((partner) => !/(학과|학부|전공|대학|예과)$/.test(partner.subject)), "C11 a major offered by an axis is refused as a partner", bridge.partners.map((p) => p.subject).join(","));
}

// C12: two students with the same task must not get the same report. The track decides which way it leans.
{
  const task = { subject: "물리", subjectGroup: "과학", taskDescription: "운동하는 물체의 속도 변화를 측정하여 분석한다", selectedConcept: "가속도" };
  const engineer = pickCrossSubject({ ...task, major: "컴퓨터공학과", track: "공학계열" }, index);
  const nurse = pickCrossSubject({ ...task, major: "간호학과", track: "의약계열" }, index);
  const names = (bridge) => bridge.partners.map((partner) => partner.subject).join(",");
  check(names(engineer) !== names(nurse), "C12 the same physics task offers different partners by track", `${names(engineer)} vs ${names(nurse)}`);
  check(engineer.partners.some((partner) => ["정보·기술", "수학"].includes(partner.group)), "C12 an engineer is offered 정보 or 수학", names(engineer));
  check(nurse.partners.some((partner) => ["과학", "사회"].includes(partner.group)), "C12 a nurse is offered 과학 or 사회", names(nurse));
  const writer = pickCrossSubject({ ...task, major: "미디어커뮤니케이션학과", track: "인문계열" }, index);
  check(writer.partners.some((partner) => ["국어", "사회"].includes(partner.group)), "C12 a 인문 student is offered 국어 or 사회", names(writer));
}

// C13: a hands-on experiment was the case that kept failing. 5 of 32 real reports crossed into the second subject
// only in the closing 계열 연계 절 — every one of them a 과학 과목 with a lab. The way in has to be the
// measurement itself, and the closing section must be told it does not count.
{
  const bridge = pickCrossSubject({ subject: "전자기와 양자", subjectGroup: "과학", taskDescription: "니크롬선의 저항을 측정하여 길이와의 관계를 확인한다", major: "컴퓨터공학과", track: "공학계열" }, index);
  const lab = crossSubjectPromptLines(bridge, "experiment_draft", "measurement").join("\n");
  check(/실험 설계 안에서 한다/.test(lab), "C13 the crossing has to land inside the experiment design");
  check(/재는 항목/.test(lab) && /비교할 조건/.test(lab), "C13 it names the measurement and the conditions as the way in");
  check(/마지막 절에서 꺼내면 융합이 아니다/.test(lab), "C13 leaving it to the closing section is refused");
  check(/교과 심화와 확장 절에서만/.test(lab), "C13 and the closing section is told it does not count");
  const reading = crossSubjectPromptLines(bridge, "experiment_draft", "reading").join("\n");
  check(/자료를 고르는 기준/.test(reading) && !/재는 항목/.test(reading), "C13 a reading task gets its own way in, not the lab one", reading.slice(0, 60));
  const plain = crossSubjectPromptLines(bridge, "experiment_draft").join("\n");
  check(!/재는 항목/.test(plain) && /최소 두 곳/.test(plain), "C13 an unknown kind keeps the three general landing places");
}

// C14: a 국어·사회 lens has nowhere to stand inside a bench experiment, so the model dropped it and wrote a
// single-subject lab. What the result is shown as, and what that does to a reader, is a design a student can
// actually run.
{
  const bridge = pickCrossSubject({ subject: "생명과학", subjectGroup: "과학", taskDescription: "뉴런의 분극 상태를 실험으로 확인한다", major: "미디어커뮤니케이션학과", track: "인문계열" }, index);
  const lab = crossSubjectPromptLines(bridge, "experiment_draft", "measurement").join("\n");
  check(bridge.partners.some((partner) => ["국어", "사회"].includes(partner.group)), "C14 an 인문 student on a science lab is offered 국어 or 사회", bridge.partners.map((p) => p.group).join(","));
  check(/어떻게 전하느냐를 조건으로/.test(lab), "C14 the way the result is shown can be the measured condition");
  const engineer = pickCrossSubject({ subject: "생명과학", subjectGroup: "과학", taskDescription: "뉴런의 분극 상태를 실험으로 확인한다", major: "컴퓨터공학과", track: "공학계열" }, index);
  check(!/어떻게 전하느냐를 조건으로/.test(crossSubjectPromptLines(engineer, "experiment_draft", "measurement").join("\n")),
    "C14 an engineer, who has a place inside the measurement already, is not given it");
}

// C10: nothing to say is said as nothing, so the prompt does not grow an empty heading.
check(crossSubjectPromptLines(null).length === 0, "C10 no bridge, no prompt lines");
check(crossSubjectPromptLines({ partners: [] }).length === 0, "C10 an empty partner list adds nothing");

// C15: a forced crossing is worse than none. The user's line: 억지로 끼워 맞추는 형태는 절대 안 된다.
{
  const bridge = pickCrossSubject({ subject: "생명과학", subjectGroup: "과학", taskDescription: "뉴런의 분극 상태를 실험으로 확인한다", major: "미디어커뮤니케이션학과", track: "인문계열" }, index);
  const lines = crossSubjectPromptLines(bridge, "experiment_draft", "measurement").join("\n");
  check(/억지로 끼워 맞춘 융합은 안 하느니만 못하다/.test(lines), "C15 a forced crossing is refused outright");
  check(/그 과목을 빼도 연구 질문과 결론이 그대로 성립한다/.test(lines), "C15 the test for a fake crossing is given: remove it and see");
  check(/억지 비유를 만들어야 한다/.test(lines), "C15 inventing an analogy to fit counts as forcing");
  check(/한 과목을 끝까지 깊게 판 보고서로 쓴다/.test(lines), "C15 and staying single-subject is a real option, not an apology");
}

console.log(`PASS cross subject: ${passed}/${passed}`);
