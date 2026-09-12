// Two-stage experiment report (admission_worker_skeleton/report_stages_v1.mjs).
// Stage 1 is a design report with a data template; stage 2 uses only the student's numbers.
// Every table/chart number is computed from student data, body sentences with other numbers are removed,
// and an empty table turns stage 2 into a literature report.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  STAGE, allowedNumberSet, buildFigures, computeStats, finalizeStageOutput, normalizeStudentData,
  describeCombination, removeUnsupportedNumbers, resolveReportStage, scrubInternalNames, stagePromptLines, stageSchemaProperties, stageSections, summaryForPrompt,
  COLLECTION, buildSourceCardTable, resolveCollectionKind, stageOutputKeys, stageSectionGuide,
} from "../../../admission_worker_skeleton/report_stages_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const studentData = {
  measurementName: "얼룩 제거 정도", unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거",
  conditions: [
    { label: "일반 세제 · 미지근한 물", values: ["1", 2, "1"], note: "누런 자국이 남음" },
    { label: "효소 세제 · 미지근한 물", values: [3, 3, "2"], note: "거의 사라짐" },
    { label: "효소 세제 · 뜨거운 물", values: [2, "1", 2] },
  ],
  reason: "집에서 쓰는 세제에 효소가 들어 있다고 해서 궁금했다.",
  reflection: "뜨거운 물이 더 잘 지울 줄 알았는데 아니었다.",
  sources: ["통합과학1 교과서 효소 단원"],
  draftReport: "3. 탐구 방법\n세탁은 20분 동안 한다.",
};
const empty = { ...studentData, conditions: studentData.conditions.map(row => ({ ...row, values: [] })) };

check(resolveReportStage({ reportStage: "experiment_draft" }) === STAGE.DRAFT, "draft stage is recognised");
check(resolveReportStage({ reportStage: "experiment_final", studentData }) === STAGE.FINAL, "final stage needs two measured conditions");
check(resolveReportStage({ reportStage: "experiment_final", studentData: empty }) === STAGE.LITERATURE, "an empty table becomes a literature report");
check(resolveReportStage({}) === STAGE.COMPLETE, "no stage keeps the existing complete report");

const data = normalizeStudentData(studentData);
const stats = computeStats(data);
const [plain, enzymeWarm, enzymeHot] = stats.rows;
check(plain.mean === 1.33 && enzymeWarm.mean === 2.67 && enzymeHot.mean === 1.67, "means are computed from the student values", stats.rows.map(r => r.mean).join(","));
check(enzymeWarm.diff_from_first === 1.34 && enzymeWarm.percent_from_first === 100.8, "difference and percent change are computed against the first condition", `${enzymeWarm.diff_from_first} ${enzymeWarm.percent_from_first}`);

const figures = buildFigures([
  { kind: "line", metric: "mean", conditionOrder: ["효소 세제 · 미지근한 물", "효소 세제 · 뜨거운 물"], title: "효소 세제의 온도별 평균", caption: "", values: [99, 98] },
  { kind: "pie", metric: "mean", conditionOrder: [], title: "invalid kind is dropped", caption: "" },
], stats);
const line = figures.find(f => f.kind === "line");
const table = figures.find(f => f.kind === "table");
check(line && line.values.join(",") === "2.67,1.67" && line.label === "그림 1", "the model picks the chart, the numbers come from the student data", JSON.stringify(line?.values));
check(table && table.label === "표 1" && table.columns.join("|") === "조건|1회|2회|3회|평균|흔들림" && table.rows[0].join("|") === "일반 세제 · 미지근한 물|1|2|1|1.33|1", "a raw-data table is always included, with the spread between repeats", JSON.stringify(table?.rows?.[0]));
check(!figures.some(f => f.title === "invalid kind is dropped"), "unknown figure kinds are ignored");

const allowed = allowedNumberSet(data, stats);
const { body, removed } = removeUnsupportedNumbers("효소 세제는 평균 2.67점으로 가장 높았다. 일반적으로 효소는 45도에서 가장 활발하다. 세탁은 20분 동안 했다. 차이는 1.34점이었다.", allowed);
check(removed === 1 && !body.includes("45도") && body.includes("2.67점") && body.includes("20분") && body.includes("1.34점"), "only the sentence with an invented number is removed (decimals kept)", body);

const draftOut = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], dataTemplate: { measurementName: "얼룩 제거 정도", unit: "점", scaleGuide: "", conditions: ["A", "A", "B"], trials: 9 } }, { studentData: data });
check(draftOut.extra.dataTemplate.conditions.join(",") === "A,B" && draftOut.extra.dataTemplate.trials === 5, "the data template is cleaned (unique conditions, at most 5 trials)", JSON.stringify(draftOut.extra.dataTemplate));

const finalOut = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", sections: [{ title: "탐구 결과", body: "표 1을 보면 평균은 2.67점이었다. 문헌에서는 60도에서 변성된다." }], figures: [] }, { studentData: data, taskDescription: "효소 탐구보고서" });
check(finalOut.parsed.sections[0].body === "표 1을 보면 평균은 2.67점이었다." && finalOut.extra.removedNumberSentences === 1 && finalOut.extra.figures.length === 2, "final output: invented number removed, default table and chart added", finalOut.parsed.sections[0].body);

const litOut = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [], comparisonTable: { title: "비교", columns: ["조건", "경향"], rows: [["미지근한 물", "잘 작용"], ["뜨거운 물", "40% 감소"]] } }, { studentData: normalizeStudentData(empty) });
check(litOut.extra.comparisonTable === null, "a literature table with a number is dropped (nothing backs it)");

check(stageSections(STAGE.FINAL, { taskDescription: "활용 방안을 통한 탐구보고서" }).includes("활용 방안") && !stageSections(STAGE.FINAL, { taskDescription: "탐구보고서" }).includes("활용 방안"), "활용 방안 section appears only when the task asks for it");
check(Object.keys(stageSchemaProperties(STAGE.DRAFT)).join() === "caseTag,dataTemplate" && Object.keys(stageSchemaProperties(STAGE.FINAL)).join() === "figures", "each stage asks the model for its own extra output");

// Real test 2026-09-11: 세제 2 × 온도 3 conditions. Charts over the whole grid are grouped (세제 = colours,
// 온도 = x-axis), ties are reported, 참고 자료 is the student's own list, and invented feelings are removed.
const gridData = normalizeStudentData({
  measurementName: "얼룩 제거 정도", unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거",
  conditions: [
    { label: "효소 세제 · 찬물", values: [1, 1, 2] }, { label: "효소 세제 · 미지근한 물", values: [2, 3, 2] }, { label: "효소 세제 · 뜨거운 물", values: [1, 2, 1] },
    { label: "일반 세제 · 찬물", values: [0, 0, 1] }, { label: "일반 세제 · 미지근한 물", values: [1, 1, 1] }, { label: "일반 세제 · 뜨거운 물", values: [1, 2, 1] },
  ],
  reflection: "뜨거운 물이 제일 잘 지울 줄 알았는데 아니어서 신기했다.",
  sources: ["통합과학1 교과서 효소 단원"],
});
const gridStats = computeStats(gridData);
const grouped = buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "평균", caption: "" }], gridStats).find(f => f.kind !== "table");
check(grouped.kind === "grouped_bar" && grouped.labels.join(",") === "찬물,미지근한 물,뜨거운 물" && grouped.series.map(s => `${s.name}:${s.values.join("/")}`).join(" ") === "효소 세제:1.33/2.33/1.33 일반 세제:0.33/1/1.33",
  "a chart over a 세제 × 온도 grid is grouped: 세제 as colours, 온도 on the x-axis", JSON.stringify(grouped));
check(gridStats.sameMean.some(group => group.join("|") === "효소 세제 · 찬물|효소 세제 · 뜨거운 물|일반 세제 · 뜨거운 물") && gridStats.ranking[0].label === "효소 세제 · 미지근한 물",
  "ties (same mean) and the ranking are computed for the model", JSON.stringify(gridStats.sameMean));
const gridOut = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], sections: [
  { title: "느낀 점", body: "뜨거운 물이 제일 잘 지울 줄 알았는데 아니어서 신기했다. 반복해서 실험하는 과정이 힘들었지만 보람 있었다. 온도에 따라 효소 작용이 달라진다는 것을 알게 되었다." },
  { title: "참고 자료", body: "통합과학1 교과서 효소 단원\n학생 실험 기록지 및 관찰 메모\n(추가적인 외부 자료는 사용하지 않았음.)\n\n※ 직접 측정한 데이터만 사용하였다." },
] }, { studentData: gridData, taskDescription: "" });
const [feel, refs] = gridOut.parsed.sections;
check(!feel.body.includes("힘들었지만") && feel.body.includes("신기했다") && feel.body.includes("알게 되었다") && gridOut.extra.removedFeelingSentences === 1, "느낀 점 keeps the student's words and drops a feeling they never wrote", feel.body);
check(refs.body === "통합과학1 교과서 효소 단원", "참고 자료 is exactly the student's source list", refs.body);

// 참고 자료 is not asked of the model (a short list under the section minimum made it loop until cut off);
// code appends the student's list, or the subject textbook when the student listed nothing.
check(!stageSections(STAGE.FINAL, { taskDescription: "" }).includes("참고 자료") && !stageSections(STAGE.LITERATURE, { taskDescription: "" }).includes("참고 자료"),
  "the model is not asked to write 참고 자료 in the second stage");
const appended = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], sections: [{ title: "결론", body: "효소 세제가 미지근한 물에서 가장 잘 지웠다." }] }, { studentData: gridData, taskDescription: "", subject: "통합과학1" });
const noSources = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [{ title: "결론", body: "효소는 적당한 온도에서 잘 작용한다." }] }, { studentData: normalizeStudentData({}), taskDescription: "", subject: "통합과학1" });
check(appended.parsed.sections.at(-1).title === "참고 자료" && appended.parsed.sections.at(-1).body === "통합과학1 교과서 효소 단원"
  && noSources.parsed.sections.at(-1).body === "통합과학1 교과서 관련 단원", "참고 자료 is appended by code (student list, or the subject textbook)", JSON.stringify(noSources.parsed.sections.at(-1)));

// Real test #2 (2026-09-11, 2×2): the report said "비슷하거나" for 1.5 vs 2 and added "흥미로웠다".
// Per-temperature comparisons give the exact gap (and make it an allowed number); "흥미" is an invented feeling.
const twoByTwo = normalizeStudentData({
  measurementName: "얼룩 제거 정도", unit: "점",
  conditions: [
    { label: "효소 세제 · 미지근한 물", values: [3, 3] }, { label: "효소 세제 · 뜨거운 물", values: [1, 2] },
    { label: "일반 세제 · 미지근한 물", values: [2, 1] }, { label: "일반 세제 · 뜨거운 물", values: [2, 2] },
  ],
  reflection: "효소 세제가 무조건 좋을 줄 알았는데 뜨거운 물에서는 일반 세제가 더 나아서 놀랐다.",
});
const twoStats = computeStats(twoByTwo);
check(JSON.stringify(twoStats.comparisons.map(c => [c.at, c.higher, c.gap])) === JSON.stringify([["미지근한 물", "효소 세제", 1.5], ["뜨거운 물", "일반 세제", 0.5]]),
  "per-temperature comparisons name the higher detergent and the exact gap", JSON.stringify(twoStats.comparisons));
check(removeUnsupportedNumbers("뜨거운 물에서는 일반 세제가 0.5점 더 높았다.", allowedNumberSet(twoByTwo, twoStats)).removed === 0, "the computed gap may be written in the report");
const feel2 = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], sections: [{ title: "느낀 점", body: "효소 세제가 무조건 좋을 줄 알았는데 뜨거운 물에서는 일반 세제가 더 나아서 놀랐다. 교과서 내용을 직접 확인할 수 있어 흥미로웠다." }] }, { studentData: twoByTwo, taskDescription: "", subject: "통합과학1" });
check(!feel2.parsed.sections[0].body.includes("흥미") && feel2.parsed.sections[0].body.includes("놀랐다"), "'흥미로웠다' the student never wrote is removed", feel2.parsed.sections[0].body);

// Depth (level policy 2026-09-11): at least 3 repeats, spread between repeats is computed and usable,
// and the second stage has a 계열 연계 탐구 section.
const shallow = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], dataTemplate: { measurementName: "m", unit: "점", scaleGuide: "", conditions: ["A", "B"], trials: 2 } }, { studentData: data });
check(shallow.extra.dataTemplate.trials === 3, "the data template asks for at least 3 repeats", String(shallow.extra.dataTemplate.trials));
check(twoStats.rows.map(r => r.spread).join(",") === "0,1,1,0" && removeUnsupportedNumbers("효소 세제·뜨거운 물은 반복 측정 사이에 1점 차이가 났다.", allowedNumberSet(twoByTwo, twoStats)).removed === 0,
  "the spread between repeats is computed and may be written", twoStats.rows.map(r => r.spread).join(","));
check(stageSections(STAGE.FINAL, { taskDescription: "" }).includes("계열 연계 탐구") && stageSections(STAGE.LITERATURE, { taskDescription: "" }).includes("계열 연계 탐구"), "the second stage has a 계열 연계 탐구 section");

// Real depth test (2026-09-11, 세제 3 × 온도 2, 3 repeats): in hot water 효소 = 일반 = 1.33 but the summary said
// "효소 1점 높음" (it compared against 물만), and a 0.34-point gap was treated as meaningful although every
// condition wobbled by 1 point between repeats.
const threeWay = computeStats(normalizeStudentData({
  measurementName: "얼룩 제거 정도", unit: "점",
  conditions: [
    { label: "효소 세제 · 미지근한 물", values: [3, 3, 2] }, { label: "효소 세제 · 뜨거운 물", values: [1, 2, 1] },
    { label: "일반 세제 · 미지근한 물", values: [2, 1, 2] }, { label: "일반 세제 · 뜨거운 물", values: [1, 1, 2] },
    { label: "물만 · 미지근한 물", values: [1, 0, 1] }, { label: "물만 · 뜨거운 물", values: [0, 0, 1] },
  ],
}));
const [warm, hot] = threeWay.comparisons;
check(hot.higher === "같음" && hot.gap === 0 && hot.clearDifference === false, "a tie at the top (효소 = 일반 in hot water) is reported as 같음, not against 물만", JSON.stringify(hot));
check(warm.higher === "효소 세제" && warm.runnerUp === "일반 세제" && warm.gap === 1 && warm.clearDifference === false,
  "the gap is measured against the runner-up, and a gap no bigger than the repeat spread is not a clear difference", JSON.stringify(warm));

// Real gpt-5 production report (2026-09-11) leaked internal field names into the student's text.
const leakedSentences = [
  "이 비교는 clearDifference가 true로 표시되어 반복의 흔들림보다 차이가 커, 가설을 뚜렷하게 지지한다.",
  "1위와 2위 사이의 차이는 1점이고 clearDifference가 false로 나타나 확실한 차이라고 보기 어렵다.",
  "평균이 0.67로 같다(sameMean). 반복 측정의 흔들림(spread)을 보면 나머지 다섯 조건은 spread가 1이었다.",
  "효소 세제의 우위가 확실하지 않았으므로(‘차가운 물’ 비교의 clearDifference=false) 물리적 요소를 강화한다.",
  "본 표는 아래 dataTemplate와 동일 구성으로 사용한다.",
].map(scrubInternalNames);
check(leakedSentences.join("|") === [
    "이 비교는 반복의 흔들림보다 차이가 커, 가설을 뚜렷하게 지지한다.",
    "1위와 2위 사이의 차이는 1점이고 확실한 차이라고 보기 어렵다.",
    "평균이 0.67로 같다. 반복 측정의 흔들림을 보면 나머지 다섯 조건은 흔들림이 1이었다.",
    "효소 세제의 우위가 확실하지 않았으므로 물리적 요소를 강화한다.",
    "본 표는 아래 결과 기록 표와 동일 구성으로 사용한다.",
  ].join("|"),
  "internal field names are removed or rewritten with correct particles", leakedSentences.join(" / "));
const koreanSummary = summaryForPrompt(threeWay);
check(koreanSummary.조건별결과[0].흔들림 === 1 && koreanSummary.수준별비교[1].흔들림보다큰차이인가 === "아니오" && !JSON.stringify(koreanSummary).includes("spread"),
  "the model sees the data summary under Korean names", JSON.stringify(koreanSummary.수준별비교[1]));
const captionFigure = buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "평균 비교", caption: "각 조건의 평균을 비교한다. 에러표시는 반복 측정의 spread를 함께 제시한다." }], threeWay).find(f => f.kind !== "table");
check(captionFigure.caption === "각 조건의 평균을 비교한다.", "a caption may not describe error bars the chart does not draw", captionFigure.caption);

// Class-level variety (2026-09-12): the draft records what it investigated, and recent combinations from the same
// school+task are shown to the next student so the engine picks a different one. The student is never asked.
const combo = describeCombination({ conditions: ["효소 세제 · 찬물", "효소 세제 · 미지근한 물", "물만 · 찬물", "물만 · 미지근한 물"], measurementName: "얼룩 제거 정도", unit: "점" }, "세탁 세제 얼룩 제거");
check(combo.caseTag === "세탁 세제 얼룩 제거" && combo.variableTag === "효소 세제/물만 × 찬물/미지근한 물" && combo.measureTag === "얼룩 제거 정도 (점)",
  "a draft is tagged with its case, what it varied and what it measured", JSON.stringify(combo));
const draftOutTagged = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], caseTag: "우유 유당 분해", dataTemplate: { measurementName: "포도당", unit: "mg/dL", scaleGuide: "", conditions: ["락타아제 · 찬 우유", "락타아제 · 미지근한 우유", "무효소 · 찬 우유", "무효소 · 미지근한 우유"], trials: 3 } }, { studentData: data });
check(draftOutTagged.extra.combination.caseTag === "우유 유당 분해" && draftOutTagged.extra.combination.measureTag === "포도당 (mg/dL)",
  "the case tag comes back with the draft", JSON.stringify(draftOutTagged.extra.combination));
const withRecent = stagePromptLines(STAGE.DRAFT, { recentCombinations: ["렌즈 세척액 과산화수소 | 무효소/활성 × 실온/차가움 | 거품 높이 (cm)"] }).join("\n");
check(withRecent.includes("[같은 학교에서 이 과제로 이미 만든 탐구") && withRecent.includes("렌즈 세척액 과산화수소") && withRecent.includes("겹치지 않는 사례를 고른다"),
  "recent combinations from the same class reach the draft instructions");
check(!stagePromptLines(STAGE.DRAFT, {}).join("\n").includes("이미 만든 탐구"), "the first student in a class gets no such list");
check(scrubInternalNames("이번 caseTag는 우유 유당 분해다.") === "이번 는 우유 유당 분해다.", "caseTag never reaches the student's text", scrubInternalNames("이번 caseTag는 우유 유당 분해다."));

// Task types (2026-09-12): every report task goes through the two stages, but what the student collects differs.
const kindOf = (taskDescription, subjectGroup = "") => resolveCollectionKind({ taskDescription, subjectGroup });
check(kindOf("염화나트륨 농도에 따른 발아율을 실험으로 확인하는 보고서") === COLLECTION.MEASUREMENT, "an experiment task collects measurements", kindOf("염화나트륨 농도에 따른 발아율을 실험으로 확인하는 보고서"));
check(kindOf("우리 반 학생들의 미디어 이용 습관을 설문으로 조사해 보고서를 쓰시오") === COLLECTION.SURVEY, "a survey task collects answer counts", kindOf("우리 반 학생들의 미디어 이용 습관을 설문으로 조사해 보고서를 쓰시오"));
check(kindOf("최근 10년 청년 고용 통계 자료를 해석해 보고서를 작성하시오") === COLLECTION.DATASET, "a statistics task collects published figures", kindOf("최근 10년 청년 고용 통계 자료를 해석해 보고서를 작성하시오"));
check(kindOf("관심 있는 사회 문제를 정해 주제 탐구 보고서를 작성하시오") === COLLECTION.READING, "a research task collects source cards", kindOf("관심 있는 사회 문제를 정해 주제 탐구 보고서를 작성하시오"));
check(kindOf("주제에 대한 자신의 주장을 담은 논술문을 쓰시오") === COLLECTION.NONE, "an essay task collects nothing", kindOf("주제에 대한 자신의 주장을 담은 논술문을 쓰시오"));
check(kindOf("탐구 보고서를 쓰시오", "과학") === COLLECTION.MEASUREMENT, "a science subject still means an experiment");

const readingInput = { collectionKind: COLLECTION.READING };
check(Object.keys(stageSchemaProperties(STAGE.DRAFT, readingInput)).join(",") === "caseTag,sourceTemplate" && stageOutputKeys(STAGE.DRAFT, readingInput).includes("sourceTemplate"),
  "a reading draft asks for a source plan, not a number table", Object.keys(stageSchemaProperties(STAGE.DRAFT, readingInput)).join(","));
check(Object.keys(stageSchemaProperties(STAGE.DRAFT, { collectionKind: COLLECTION.SURVEY })).join(",") === "caseTag,dataTemplate", "a survey draft still asks for a table");
const readingDraft = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], caseTag: "청소년 노동 인권", sourceTemplate: { cardCount: 9, whatToFind: "사례와 제도" } }, readingInput);
check(readingDraft.extra.collectionKind === COLLECTION.READING && readingDraft.extra.sourceTemplate.cardCount === 6 && !readingDraft.extra.dataTemplate,
  "the reading draft returns a card plan with a sane card count", JSON.stringify(readingDraft.extra.sourceTemplate));
const surveyDraft = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], caseTag: "미디어 이용", dataTemplate: { measurementName: "응답 수", unit: "명", conditions: ["1시간 미만", "1~3시간", "3시간 이상"], trials: 3 } }, { collectionKind: COLLECTION.SURVEY });
check(surveyDraft.extra.dataTemplate.trials === 1, "a survey is counted once even when the model asks for three repeats", String(surveyDraft.extra.dataTemplate.trials));
check(stageSchemaProperties(STAGE.DRAFT, { collectionKind: COLLECTION.SURVEY }).dataTemplate.properties.trials.maximum === 1
  && stageSchemaProperties(STAGE.DRAFT, { collectionKind: COLLECTION.MEASUREMENT }).dataTemplate.properties.trials.minimum === 3,
  "the schema asks a survey for one value per cell and an experiment for three");

// 2026-09-12 live test: a survey draft came back as "8칸 × 3회" and a statistics draft as "4회".
const oneShot = computeStats(normalizeStudentData({ measurementName: "응답 수", unit: "명", conditions: [
  { label: "1학년 · 그렇다", values: ["7"] }, { label: "1학년 · 아니다", values: ["5"] },
  { label: "2학년 · 그렇다", values: ["9"] }, { label: "2학년 · 아니다", values: ["3"] }] }));
const oneShotTable = buildFigures([], oneShot).find((f) => f.kind === "table");
check(oneShotTable.columns.join("|") === "조건|응답 수 (명)" && oneShotTable.rows[0].join("|") === "1학년 · 그렇다|7",
  "one value per cell means no repeat columns, no mean and no wobble", oneShotTable.columns.join("|"));
const oneShotSummary = summaryForPrompt(oneShot);
check(oneShotSummary.값이높은순서 && !oneShotSummary.평균이높은순서 && oneShotSummary.조건별결과[0].값 === 7 && !("평균" in oneShotSummary.조건별결과[0]) && !("흔들림" in oneShotSummary.조건별결과[0]),
  "a single response count is called a value, never a mean", JSON.stringify(oneShotSummary.조건별결과[0]));
check(summaryForPrompt(threeWay).평균이높은순서 && "흔들림" in summaryForPrompt(threeWay).조건별결과[0], "repeated measurements keep the mean and the wobble");
check(summaryForPrompt(oneShot).수준별비교[0].흔들림보다큰차이인가 === "반복이 없어 알 수 없음",
  "a gap with nothing to compare it against is not called clear", JSON.stringify(summaryForPrompt(oneShot).수준별비교[0]));
check(stagePromptLines(STAGE.FINAL, { studentData: normalizeStudentData({ conditions: [{ label: "가", values: ["1"] }, { label: "나", values: ["2"] }] }) }).join("\n").includes("값이 하나뿐이라"),
  "the final report is told not to lean on a mean of one number");
check(!stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.SURVEY }).join("\n").includes("조건마다 3회 이상 반복")
  && stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.MEASUREMENT }).join("\n").includes("조건마다 3회 이상 반복"),
  "repeat-measurement design rules are only given to an experiment");

const cards = [
  { title: "청소년 아르바이트 실태 기사", type: "신문 기사", point: "임금을 못 받은 경험이 많다", take: "구제 절차를 모르는 것이 문제다" },
  { title: "근로기준법 해설", type: "기관 자료", point: "18세 미만도 최저임금을 받는다", take: "법은 있으나 현장에서 안 지켜진다" },
];
const cardTable = buildSourceCardTable(cards);
check(cardTable.columns.join("|") === "자료|종류|핵심 내용|내 해석" && cardTable.rows.length === 2 && cardTable.rows[0][1] === "신문 기사",
  "the student cards become the first table of the report", JSON.stringify(cardTable.rows[0]));
check(buildSourceCardTable([cards[0]]) === null, "one card is not enough for a table");
const readingFinal = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [{ title: "자료 비교 정리", body: "카드를 비교한다." }] }, { studentData: normalizeStudentData({ sourceCards: cards, sources: [] }) });
check(readingFinal.extra.comparisonTable.rows.length === 2 && readingFinal.extra.comparisonTable.title === "내가 조사한 자료 정리",
  "the literature report builds its table from the cards the student typed", JSON.stringify(readingFinal.extra.comparisonTable.columns));
check(normalizeStudentData({ sourceCards: [{ title: "제목만", type: "", point: "", take: "" }] }).sourceCards.length === 0, "a card with no key content is dropped");

const readingGuide = stageSectionGuide("탐구 방법", STAGE.DRAFT, COLLECTION.READING);
const surveyGuide = stageSectionGuide("탐구 방법", STAGE.DRAFT, COLLECTION.SURVEY);
check(readingGuide !== surveyGuide && /자료/.test(readingGuide) && /설문/.test(surveyGuide),
  "the method section is written for the task type", `${readingGuide} // ${surveyGuide}`);
check(stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.READING }).join("\n").includes("sourceTemplate"),
  "the reading draft instructions describe the card plan");

// Real gpt-5 output from the 2026-09-12 production test said "기사 카드", "카드 자료" — the word on the input form
// must never reach the student's report.
const cardLeak = "그러나 신문 기사 카드에서 확인된 것처럼 신청자 중 실제 수급은 적었다. 다만 카드 자료는 크기를 말하지 않는다. 자료 카드에 표시를 남기고, 카드별 출처를 요약한다.";
check(!scrubInternalNames(cardLeak).includes("카드") && scrubInternalNames(cardLeak).includes("신문 기사에서") && scrubInternalNames(cardLeak).includes("자료별 출처"),
  "the word 카드 is rewritten as the real name of the source", scrubInternalNames(cardLeak));
check(stagePromptLines(STAGE.LITERATURE, { studentData: normalizeStudentData({ sourceCards: cards }) }).join("\n").includes("'카드'라는 말은 쓰지 않는다"),
  "the model is told not to write 카드 in the report");

const bridgeSource = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
check(bridgeSource.includes("const valueHead = trials > 1"), "the input table still heads a single value column with 1회");

// 고2 선택과목 live test 2026-09-12: the drafts promised 표준편차 and 오차막대, which the final report never gets,
// and a physics draft wrote "flux 결합".
check(stageSectionGuide("결과 기록 계획", STAGE.DRAFT, COLLECTION.MEASUREMENT).includes("표준편차나 오차막대"),
  "the record plan may not promise statistics the report cannot draw");
check(stagePromptLines(STAGE.DRAFT, {}).join("\n").includes("오차막대, 유의성 검정"), "the draft is told what the second stage actually produces");
check(scrubInternalNames("권수를 늘리면 flux 결합이 커진다.") === "권수를 늘리면 자속 결합이 커진다.", "English terms are written in Korean", scrubInternalNames("권수를 늘리면 flux 결합이 커진다."));
const rangeSource = bridgeSource.slice(bridgeSource.indexOf("function scoreRange"), bridgeSource.indexOf("function collectExperimentInput"));
const scoreRange = new Function(`${rangeSource}\nreturn scoreRange;`)();
check(JSON.stringify(scoreRange({ unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거" })) === '{"min":0,"max":3}',
  "a score scale sets the range the typed numbers must stay inside", JSON.stringify(scoreRange({ unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거" })));
check(scoreRange({ unit: "cm", scaleGuide: "풍선의 가장 넓은 부분을 잰다" }) === null, "a measured length has no score range");
check(scoreRange({ unit: "점", scaleGuide: "보라색이 짙을수록 높게 준다" }) === null, "a scale with no numbers sets no range");

console.log(`PASS experiment two-stage report: ${passed}/${passed}`);
