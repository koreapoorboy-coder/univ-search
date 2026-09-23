// Two-stage experiment report (admission_worker_skeleton/report_stages_v1.mjs).
// Stage 1 is a design report with a data template; stage 2 uses only the student's numbers.
// Every table/chart number is computed from student data, body sentences with other numbers are removed,
// and an empty table turns stage 2 into a literature report.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  STAGE, allowedNumberSet, buildFigures, computeStats, finalizeStageOutput, normalizeStudentData,
  describeCombination, removeUnsupportedNumbers, resolveReportStage, scrubInternalNames, stagePromptLines, stageSchemaProperties, stageSections, summaryForPrompt,
  COLLECTION, buildSourceCardTable, buildRecordDraft, resolveCollectionKind, stageOutputKeys, stageSectionGuide, titleRules,
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
check(finalOut.parsed.sections[0].body === "표 1을 보면 평균은 2.67점이었다." && finalOut.extra.removedNumberSentences === 1 && finalOut.extra.figures.length === 1 && finalOut.extra.figures[0].kind === "table", "final output: invented number removed, the raw table added — no chart the model did not ask for", finalOut.parsed.sections[0].body);

const litOut = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [], comparisonTable: { title: "비교", columns: ["조건", "경향"], rows: [["미지근한 물", "잘 작용"], ["뜨거운 물", "40% 감소"]] } }, { studentData: normalizeStudentData(empty) });
check(litOut.extra.comparisonTable === null, "a literature table with a number is dropped (nothing backs it)");

check(stageSections(STAGE.FINAL, { taskDescription: "활용 방안을 통한 탐구보고서" }).includes("활용 방안") && !stageSections(STAGE.FINAL, { taskDescription: "탐구보고서" }).includes("활용 방안"), "활용 방안 section appears only when the task asks for it");
check(Object.keys(stageSchemaProperties(STAGE.DRAFT)).join() === "caseTag,dataTemplate" && Object.keys(stageSchemaProperties(STAGE.FINAL)).join() === "calculations,recordDraft,figures", "each stage asks the model for its own extra output");

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
// and the second stage closes with 교과 심화와 확장 — the section that says where this competency goes next.
const shallow = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], dataTemplate: { measurementName: "m", unit: "점", scaleGuide: "", conditions: ["A", "B"], trials: 2 } }, { studentData: data });
check(shallow.extra.dataTemplate.trials === 3, "the data template asks for at least 3 repeats", String(shallow.extra.dataTemplate.trials));
check(twoStats.rows.map(r => r.spread).join(",") === "0,1,1,0" && removeUnsupportedNumbers("효소 세제·뜨거운 물은 반복 측정 사이에 1점 차이가 났다.", allowedNumberSet(twoByTwo, twoStats)).removed === 0,
  "the spread between repeats is computed and may be written", twoStats.rows.map(r => r.spread).join(","));
// 2026-09-18 사용자 결정: 「교과 심화와 확장」 절은 없앤다 — 학교 양식에 없어 학생이 쓸 수 없다. 후속 탐구는 결론의 마지막 문단.
check(!stageSections(STAGE.FINAL, { taskDescription: "" }).includes("교과 심화와 확장") && !stageSections(STAGE.LITERATURE, { taskDescription: "" }).includes("교과 심화와 확장")
  && stageSections(STAGE.FINAL, { taskDescription: "" }).includes("결론"), "the second stage has no separate 교과 심화와 확장 section — the conclusion carries the next step");
check(/마지막 문단은 후속 탐구다/.test(stageSectionGuide("결론", STAGE.FINAL, COLLECTION.MEASUREMENT)) && /따로 제목을 달지 않는다/.test(stageSectionGuide("결론", STAGE.FINAL, COLLECTION.MEASUREMENT)),
  "the conclusion ends with a short follow-up paragraph");
check(/후속 탐구다/.test(stageSectionGuide("고찰 및 제언", STAGE.FINAL, COLLECTION.MEASUREMENT)), "a school format's own 고찰·제언 section takes the follow-up instead");

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
// 2026-09-18: 과학 과목이라는 것만으로 실험이 되지 않는다 — 과제 글에 재는 일이 드러나야 한다(test_collection_kind_v1).
// 2026-09-21: 단서가 없을 때의 기본값을 읽기에서 「아무것도 안 요구함」으로 바꿨다. 읽기는 자료 찾기·읽기·
// 요약·내 해석 넷을 시키는데, 이 자리로 오는 과제에는 읽을 자료가 없다.
check(kindOf("탐구 보고서를 쓰시오", "과학") === COLLECTION.NONE, "a science subject alone no longer means an experiment", kindOf("탐구 보고서를 쓰시오", "과학"));

// 야외 조사(방형구·개체 수)는 측정이다 — 운영 테스트에서 '조사'라는 말 때문에 문헌으로 잡혔다.
check(kindOf("방형구법을 활용한 식물 군집 조사 보고서 / 방형구를 설치해 식물 종류와 개체 수를 조사하고 중요치를 구해 비교한다") === COLLECTION.MEASUREMENT,
  "a quadrat field survey is a measurement, not a literature review");
check(kindOf("식물의 군집 조사 방법을 통해 우점종을 결정하기(논술형 문제)") === COLLECTION.NONE, "the same words in an essay task stay an essay");
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
// 비교형 과제일 때만 카드로 표를 만든다(2026-09-18) — 논술·비평·성찰 과제에도 표가 붙던 것을 고쳤다.
const readingFinal = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [{ title: "자료 비교 정리", body: "카드를 비교한다." }] },
  { taskDescription: "청소년 노동 문제를 다룬 자료를 비교해 보고서를 쓴다", studentData: normalizeStudentData({ sourceCards: cards, sources: [] }) });
check(readingFinal.extra.comparisonTable.rows.length === 2 && readingFinal.extra.comparisonTable.title === "내가 조사한 자료 정리",
  "a comparison task builds its table from the cards the student typed", JSON.stringify(readingFinal.extra.comparisonTable.columns));
const argueFinal = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [{ title: "자료 분석과 해석", body: "근거를 세운다." }] },
  { taskDescription: "청소년 노동 문제에 대한 자신의 주장을 세우는 보고서", studentData: normalizeStudentData({ sourceCards: cards, sources: [] }) });
check(argueFinal.extra.comparisonTable === null, "a task that does not compare gets no table unless the model chose one");
check(stageSections(STAGE.LITERATURE, { taskDescription: "자신의 주장을 세우는 보고서" }).includes("자료 분석과 해석")
  && stageSections(STAGE.LITERATURE, { taskDescription: "두 자료를 비교하는 보고서" }).includes("자료 비교 정리"), "the section is named for what the task asks");
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
check(stageSectionGuide("결과 기록 계획", STAGE.DRAFT, COLLECTION.MEASUREMENT).includes("표준편차, 오차막대, 흔들림을 표시한 선"),
  "the record plan may not promise statistics the report cannot draw");
check(stagePromptLines(STAGE.DRAFT, {}).join("\n").includes("오차막대, 흔들림 표시선, 유의성 검정"), "the draft is told what the second stage actually produces");
check(scrubInternalNames("권수를 늘리면 flux 결합이 커진다.") === "권수를 늘리면 자속 결합이 커진다.", "English terms are written in Korean", scrubInternalNames("권수를 늘리면 flux 결합이 커진다."));
const rangeSource = bridgeSource.slice(bridgeSource.indexOf("function scoreRange"), bridgeSource.indexOf("function collectExperimentInput"));
const scoreRange = new Function(`${rangeSource}\nreturn scoreRange;`)();
check(JSON.stringify(scoreRange({ unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거" })) === '{"min":0,"max":3}',
  "a score scale sets the range the typed numbers must stay inside", JSON.stringify(scoreRange({ unit: "점", scaleGuide: "0점 그대로, 3점 완전히 제거" })));
check(scoreRange({ unit: "cm", scaleGuide: "풍선의 가장 넓은 부분을 잰다" }) === null, "a measured length has no score range");
check(scoreRange({ unit: "점", scaleGuide: "보라색이 짙을수록 높게 준다" }) === null, "a scale with no numbers sets no range");

// 2026-09-12: a chart was forced onto every report. Two bars show nothing the table has not shown already.
const twoRows = computeStats(normalizeStudentData({ measurementName: "거품 높이", unit: "mm", conditions: [
  { label: "대조군", values: ["3", "4", "3"] }, { label: "실험군", values: ["8", "9", "8"] }] }));
const twoRowFigures = buildFigures([], twoRows);
check(twoRowFigures.length === 1 && twoRowFigures[0].kind === "table", "two conditions get a table and no chart", twoRowFigures.map((f) => f.kind).join(","));
check(buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "평균 비교", caption: "" }], twoRows).every((f) => f.kind === "table"),
  "a chart the model asked for is dropped when there is nothing to show");
const threeRows = computeStats(normalizeStudentData({ measurementName: "거품 높이", unit: "mm", conditions: [
  { label: "가", values: ["3"] }, { label: "나", values: ["8"] }, { label: "다", values: ["5"] }] }));
// 2026-09-18: 그래프는 AI가 고를 때만 — 조건이 셋이어도 저절로 붙지 않는다(모든 보고서가 표 + 그래프 모양이 됐다).
check(buildFigures([], threeRows).every((f) => f.kind === "table"), "three conditions get no chart unless the model chose one");
check(buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "평균 비교", caption: "" }], threeRows).some((f) => f.kind === "bar"),
  "three conditions keep a chart the model chose");
check(buildFigures([], threeWay).every((f) => f.kind === "table"), "a two-variable grid gets no chart unless the model chose one");
check(buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "조합 비교", caption: "" }], threeWay).some((f) => f.kind.startsWith("grouped_")),
  "a chart the model chose over a two-variable grid is drawn grouped");
check(stageSchemaProperties(STAGE.FINAL).figures.minItems === 0, "the model may return no figures at all");
check(stageSectionGuide("탐구 결과", STAGE.FINAL, COLLECTION.MEASUREMENT).includes("그림이 있을 때만"),
  "the result section may not point at a chart that was not drawn");
check(stageSectionGuide("결과 기록 계획", STAGE.DRAFT, COLLECTION.MEASUREMENT).includes("그래프가 반드시 들어간다고도 쓰지 않는다"),
  "the draft may not promise a chart either");
check(stagePromptLines(STAGE.LITERATURE, { studentData: normalizeStudentData({}) }).join("\n").includes("같은 기준으로 나란히 비교될 때만"),
  "the literature report only tables sources that actually compare");
check(finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [] }, { studentData: normalizeStudentData({}) }).extra.comparisonTable === null,
  "no comparable sources means no table at all");

// 2026-09-12: measured 69 real 세특 entries (598자 / 8문장 median, 90% noun endings, material ordered
// 활동 > 개념 > 자료 > 판단 > 확장). The reflection is the teacher's source, so it must carry that material.
const reflectionGuide = stageSectionGuide("느낀 점", STAGE.FINAL, COLLECTION.MEASUREMENT);
check(["활동", "개념", "자료", "한계", "다음에 확인하고 싶은"].every((part) => reflectionGuide.includes(part)) && reflectionGuide.includes("400~700자"),
  "the reflection carries what a teacher needs to write 세특", reflectionGuide.slice(0, 60));
check(reflectionGuide.includes("태도를 스스로 칭찬하는 말은 쓰지 않는다"), "the student may not praise their own attitude");
check(stageSections(STAGE.LITERATURE, {}).includes("느낀 점"), "the literature report ends with a reflection too",
  stageSections(STAGE.LITERATURE, {}).join("/"));
const litFeelings = finalizeStageOutput(STAGE.LITERATURE, { reportTitle: "t", sections: [
  { title: "느낀 점", body: "자료마다 기준이 다르다는 점을 알게 되었다. 힘들었지만 보람이 있었다." }] },
  { studentData: normalizeStudentData({ reflection: "기준을 정하는 게 중요하다고 느꼈다." }) });
check(!litFeelings.parsed.sections[0].body.includes("보람"), "invented feelings are filtered in the literature report too",
  litFeelings.parsed.sections[0].body);

// 2026-09-12: a 명사형 활동 요약 for the teacher, kept out of the report the student hands in.
const recordLines = [
  "조도를 세 수준으로 나누고 잎 뒷면 기공 수를 면적당 밀도로 환산해 비교 설계함.",
  "빛 신호가 형질 발현을 조절한다는 개념을 실제 측정으로 확인함.",
  "나는 교과서 형질 발현 단원을 참고했다.",
  "성실한 태도로 반복 측정을 수행함.",
  "표피 세포 크기를 함께 세지 못해 원인을 분리하지 못한 한계를 밝힘.",
  "후속으로 스펙트럼 조건을 바꾼 비교 탐구를 제안함.",
];
const recordDraft = buildRecordDraft(recordLines, null);
check(recordDraft.length === 4 && recordDraft.every((line) => !/^나는/.test(line)) && !recordDraft.some((line) => /성실/.test(line)),
  "first-person lines and self-praise never reach the record summary", JSON.stringify(recordDraft));
check(recordDraft.some((line) => line.endsWith("밝힘.")), "a ㅁ ending other than 함/됨/임 is still a record line");
check(buildRecordDraft(["조건을 비교하였다.", "자료를 읽었다.", "결과를 정리하였다."], null) === null,
  "sentences in the student's own voice make no record summary");
check(buildRecordDraft(["조도를 세 수준으로 나누어 비교 설계함."], null) === null, "fewer than three usable lines means no box");
const recordData = normalizeStudentData({ conditions: [{ label: "가", values: ["115"] }, { label: "나", values: ["167"] }] });
const numbersAllowed = allowedNumberSet(recordData, computeStats(recordData));
const withFakeNumber = buildRecordDraft([
  "평균이 암조건 115, 실험군 167로 나타남을 확인함.",
  "선행 연구에서 보고된 82%와 일치함을 확인함.",
  "빛 신호가 형질 발현을 조절한다는 개념을 측정으로 확인함.",
  "후속으로 스펙트럼 조건을 바꾼 비교 탐구를 제안함.",
], numbersAllowed);
check(!withFakeNumber.some((line) => line.includes("82%")), "a number the student never measured is cut from the summary too",
  JSON.stringify(withFakeNumber));
check(stageOutputKeys(STAGE.FINAL).includes("recordDraft") && stageOutputKeys(STAGE.LITERATURE).includes("recordDraft"),
  "both finished reports ask for the record summary");
check(bridgeSource.includes("function renderRecordDraft") && bridgeSource.includes("제출하는 보고서에는 들어가지 않아요"),
  "the site shows the summary as a separate, non-submitted box");

// 느낀 점 is what the teacher reads to write 세특, so a sentence praising the student is the one thing that must
// not survive there — the judgement is the teacher's. The prompt forbade it and the 생기부 draft stripped it, but
// the section itself passed it straight through. 11,136 dry runs all carried it.
{
  const praised = finalizeStageOutput(STAGE.FINAL, {
    reportTitle: "t", figures: [],
    sections: [{ title: "느낀 점", body: "나는 성실하게 참여했고 적극적으로 협동하였다. 조건을 나누어 재는 것이 중요하다는 것을 알았다." }],
  }, { studentData: normalizeStudentData(studentData), taskDescription: "", subject: "통합과학1" });
  const body = praised.parsed.sections.find((section) => section.title === "느낀 점").body;
  check(!/성실|적극적/.test(body), "느낀 점 drops a sentence that praises the student", body);
  check(body.includes("중요하다는 것을 알았다"), "what the student actually did stays", body);
  check(praised.extra.removedFeelingSentences >= 1, "the removal is counted");
}

// The one-shot report skipped both data-free filters: our own field names and self-praise. "카드" reaching a
// student report is the fault that was already fixed once — for the two-stage path only.
{
  const one = finalizeStageOutput(STAGE.COMPLETE, {
    reportTitle: "t",
    sections: [
      { title: "결과 분석", body: "카드에 적힌 내용과 비교하면 comparisons 항목이 더 크다." },
      { title: "느낀 점", body: "정말 힘들었지만 재미있었다. 나는 성실하게 참여하였다. 개념을 확인하였다." },
    ],
  }, { studentData: normalizeStudentData(null), taskDescription: "", subject: "통합과학1" });
  const analysis = one.parsed.sections[0].body;
  const feeling = one.parsed.sections[1].body;
  check(!analysis.includes("카드") && !analysis.includes("comparisons"), "the one-shot report no longer leaks our field names", analysis);
  check(!/힘들|재미있|성실/.test(feeling) && feeling.includes("개념을 확인하였다"),
    "the one-shot report drops invented feelings and self-praise too", feeling);
}

// 19 of 32 real reports came back with no 결론: three corpus shapes run 자료 해석 → 오차·한계 → 후속 탐구 and
// stop. A report that never answers its own question is not a report.
{
  const shape = { sections: ["탐구 질문", "교과 개념 정리", "가설과 변인 설정", "실험 조건 또는 자료 수집", "결과 정리", "자료 해석", "오차·한계 분석", "후속 탐구"] };
  const final = stageSections(STAGE.FINAL, { reportShape: shape, taskDescription: "" });
  check(final.includes("결론"), "a shape with no conclusion gets one", final.join("/"));
  check(final.indexOf("결론") < final.indexOf("후속 탐구"), "the conclusion comes before the next-steps section", final.join("/"));
  check(final.indexOf("결론") > final.indexOf("자료 해석"), "and after the analysis it concludes from", final.join("/"));
  const complete = stageSections(STAGE.COMPLETE, { reportShape: shape, taskDescription: "" });
  check(complete.includes("결론"), "the one-shot report gets it too", complete.join("/"));
  const already = stageSections(STAGE.FINAL, { reportShape: { sections: ["연구 질문", "이론적 배경", "탐구 방법", "탐구 결과", "결론"] }, taskDescription: "" });
  check(already.filter((section) => section === "결론").length === 1, "a shape that already concludes is left alone", already.join("/"));
}

// 제목은 주제가 드러나는 보고서 제목이다(사용자 지적 2026-09-19 두 번: 45~90자 요약 한 줄도, 「물음 — 횟수·조건을 늘어놓은
// 부제」도 풀어 쓴 느낌이라 주제 느낌이 안 난다). 규모·조건값·결과 숫자는 제목에서 빠진다.
{
  const lines = titleRules(COLLECTION.MEASUREMENT).join("\n");
  check(/주제가 드러나는 보고서 제목/.test(lines) && /소논문의 제목처럼/.test(lines), "the title is a topic, like a real report title");
  check(/절차를 풀어 쓴 문장이 아니다/.test(lines), "not a summary of the procedure");
  check(/교과 개념어를 하나 이상 넣는다/.test(lines), "it names a subject concept");
  check(/20~45자/.test(lines) && /하나의 명사구/.test(lines), "short, one noun phrase");
  check(/이 보고서는 ~을 ~에 따라 ~해서 ~을 알아본 보고서다/.test(lines) && /무엇에 따라/.test(lines) && /무엇을 알아냈나/.test(lines), "specific enough to say what kind of report it is");
  check(/실 길이에 따른 단진자 주기 측정과 이를 이용한 중력가속도 추정/.test(lines), "the vague-but-close title gets its specific version");
  check(/규모 숫자/.test(lines) && /실험 조건 값/.test(lines) && /결과 숫자/.test(lines), "no counts, condition values or result numbers");
  check(/물음표/.test(lines) && /부제/.test(lines), "no question and no subtitle");
  check(/"~에 대한 고찰"/.test(lines), "no empty shapes");
  check(/물 온도에 따른 효소 세제의 달걀 얼룩 제거 효과 비교/.test(lines), "an experiment gets a topic-style example");
  check(/진자는 길이에 얼마나 민감할까 — /.test(lines), "the title the user rejected is the bad example");
  check(!/식초|적정|감자|카탈레이스/.test(lines), "the good examples do not hand the next live-test tasks their titles");
  check(/고등학생의 수면 시간과 1교시 수업 집중도의 관계 분석/.test(titleRules(COLLECTION.SURVEY).join("\n")), "a survey gets a survey example");
  check(/원자력 발전 찬반 기사의 근거 제시 방식 비교/.test(titleRules(COLLECTION.READING).join("\n")), "a reading task gets its own");
  check(/손 소독 의무화 찬반 칼럼의 논증 타당성 평가/.test(titleRules(COLLECTION.NONE).join("\n")), "and a 논술 task gets its own");
  const final = titleRules(COLLECTION.MEASUREMENT, STAGE.FINAL).join("\n");
  check(/결과는 제목에 넣지 않는다/.test(final), "the finished report keeps results out of the title");
  check(/그대로 써도 된다/.test(final), "and may keep the draft's title when it still fits");
  check(/설계서 제목보다 덜 구체적으로 만들지 않는다/.test(final), "a rewrite may not blur the draft's purpose (운영 테스트 23)");
  const draftRules = stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.MEASUREMENT, studentData: data }).join("\n");
  check(/조건 이름에는 실제 값을 넣는다/.test(draftRules), "draft conditions carry real values, not 「따뜻한 상태」");
}

console.log(`PASS experiment two-stage report: ${passed}/${passed}`);

// 운영 테스트(2026-09-18): 설계서가 한 칸에 「종별 개체 수와 피복 점수」를 적게 해 표 제목이 학생이 적은 값(종수)과 어긋났다.
{
  const { singleMeasure } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(singleMeasure("종별 개체 수와 피복 점수") === "종별 개체 수" && singleMeasure("반응 시간 및 온도") === "반응 시간",
    "a template name holding two values keeps only the first");
  check(["얼룩 제거 정도", "거품 높이", "방형구당 종수", "생존율"].every((one) => singleMeasure(one) === one), "a single-value name is left alone");
  const twoInOne = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [], dataTemplate: { measurementName: "종별 개체 수와 피복 점수", unit: "", scaleGuide: "", conditions: ["화단", "운동장"], trials: 5 } }, { studentData: data });
  check(twoInOne.extra.dataTemplate.measurementName === "종별 개체 수", "the draft template is cut to one value per cell", twoInOne.extra.dataTemplate.measurementName);
  check(stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.MEASUREMENT, studentData: data }).some((line) => /한 칸에 적을 \*\*값 하나\*\*/.test(line)),
    "the draft prompt says one value per cell");
}

// 운영 테스트(2026-09-19): 느낀 점에 학생이 입력하지 않은 행동(「교과서 단원을 다시 읽으며 보완했다」)이 나왔고,
// 결론이 부른 단원 이름이 참고 자료의 교과서 단원과 달랐다.
{
  const { removeInventedActions } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const cut = removeInventedActions("군집 개념을 적용했다. 개념 정리는 교과서 단원을 다시 읽으며 보완했다. 평균은 8.5였다.", "직접 세어 보니 차이가 보였다.");
  check(cut.removed === 1 && !cut.body.includes("다시 읽") && cut.body.includes("평균은 8.5"), "an action the student never wrote is removed from 느낀 점", cut.body);
  const kept = removeInventedActions("교과서를 다시 읽어 보니 이해가 됐다.", "교과서를 다시 읽어 보니 이해가 됐다.");
  check(kept.removed === 0, "the same action is kept when the student wrote it");
  const fin = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], sections: [{ title: "느낀 점", body: "직접 세어 보았다. 자료를 찾아 읽으며 개념을 보완했다." }] }, { studentData: data, taskDescription: "" });
  check(!fin.parsed.sections[0].body.includes("찾아 읽"), "the final report runs the filter on 느낀 점", fin.parsed.sections[0].body);
  const workerSource = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
  check(workerSource.includes("교과서 단원을 이름으로 가리킬 때는") && workerSource.includes("function textbookUnitOf(citation)"),
    "the prompt pins the unit name to the one in the textbook reference line");
}

// 운영 테스트(2026-09-19, 화학 중화 적정): 학생이 적은 「6.0」이 표에 「6」으로 나왔다.
{
  const typed = normalizeStudentData({ measurementName: "산도", unit: "g/100 mL", conditions: [{ label: "보정 없음", values: ["6.3", "6.4", "6.2"] }, { label: "공백 보정", values: ["6.1", "6.1", "6.0"] }] });
  const table = buildFigures([], computeStats(typed))[0];
  check(typed.decimals === 1 && table.rows[1].slice(1, 4).join("|") === "6.1|6.1|6.0", "measured cells keep the decimals the student typed", JSON.stringify(table.rows[1]));
  const whole = normalizeStudentData({ measurementName: "종수", conditions: [{ label: "화단", values: ["8", "10"] }, { label: "운동장", values: ["4", "3"] }] });
  check(whole.decimals === 0 && buildFigures([], computeStats(whole))[0].rows[0][1] === 8, "whole numbers stay as they were");
}

// 평균을 두 자리로 깎으면 작은 값이 사라진다.
// 운영 검사 2026-09-22(정보): 파이썬 처리 시간 0.004·0.003·0.004초의 평균이 「0초」로 나왔고,
// 보고서가 「딕셔너리는 100개에서 0초」라고 썼다. 거기서 나온 배수도 실제와 달랐다.
{
  const tiny = normalizeStudentData({ measurementName: "처리 시간", unit: "초", conditions: [
    { label: "딕셔너리 · 100개", values: ["0.004", "0.003", "0.004"] },
    { label: "딕셔너리 · 500개", values: ["0.017", "0.016", "0.018"] },
    { label: "중첩반복 · 500개", values: ["0.48", "0.51", "0.47"] },
  ] });
  const stats = computeStats(tiny);
  check(stats.rows[0].mean === 0.004, "작은 값의 평균이 0이 되지 않는다", String(stats.rows[0].mean));
  check(stats.rows[1].mean === 0.017, "셋째 자리까지 적었으면 셋째 자리로 낸다", String(stats.rows[1].mean));
  check(stats.rows[2].mean === 0.49, "두 자리로 적은 줄은 두 자리 그대로다", String(stats.rows[2].mean));
  const table = buildFigures([], stats)[0];
  const meanAt = table.columns.indexOf("평균");
  check(String(table.rows[0][meanAt]) === "0.004", "표의 평균 칸에도 0.00 이 아니라 0.004 가 찍힌다", JSON.stringify(table.rows[0]));
}

// 검수 시험 2026-09-22이 찾은 **우리 틀** 흠 셋. 하나 고치면 그 과제를 받는 학생 전부가 고쳐진다.
{
  const { rowAxisName } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");

  // ① 줄이 조건이 아닐 때 머리말이 「조건」이면 틀린다 — 「1월·3월·5월」은 달이다.
  const mk = (labels) => computeStats(normalizeStudentData({ measurementName: "대여 건수", unit: "건",
    conditions: labels.map((label, at) => ({ label, values: [String(100 + at * 10)] })) }));
  const monthly = buildFigures([], mk(["1월", "3월", "5월", "12월"]))[0];
  check(monthly.columns[0] === "월", "달이 줄에 오면 머리말이 「월」이다", monthly.columns.join("/"));
  check(monthly.title.startsWith("월별"), "표 제목도 「월별」이다", monthly.title);
  const yearly = buildFigures([], mk(["2014년", "2015년", "2016년"]))[0];
  check(yearly.columns[0] === "연도", "연도가 줄에 오면 「연도」다", yearly.columns.join("/"));
  const cond = buildFigures([], mk(["수도권 · 청년층", "경상권 · 중장년층", "전라권 · 청년층"]))[0];
  check(cond.columns[0] === "조건" && cond.title.startsWith("조건별"), "진짜 조건은 그대로 「조건」이다", cond.title);
  check(rowAxisName(["1월"]) === "조건", "줄이 하나면 짐작하지 않는다", rowAxisName(["1월"]));
  check(rowAxisName(["1월", "지난달"]) === "조건", "한 줄이라도 꼴이 다르면 짐작하지 않는다");

  // ② 칸마다 값이 하나뿐인 과제의 연구 질문에 「변동 폭」을 묻지 않는다.
  const draftRules = stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.DATASET, taskDescription: "공공데이터에서 월별 값을 찾아 표로 옮긴다." }).join("\n");
  check(/변동 폭/.test(draftRules) && /칸과 칸 [*][*]사이[*][*]/.test(draftRules),
    "값이 하나뿐인 과제에는 칸 안의 변동 폭을 묻지 말라고 이른다", draftRules.slice(0, 120));
  const measureRules = stagePromptLines(STAGE.DRAFT, { collectionKind: COLLECTION.MEASUREMENT, taskDescription: "온도를 달리하며 반응 속도를 측정한다." }).join("\n");
  check(!/칸과 칸 [*][*]사이[*][*]/.test(measureRules), "재는 과제는 반복이 있으니 그 규칙을 주지 않는다");

  // ③ 뒤가 다른 조건을 나눠 배수를 내지 않는다.
  const finalRules = stagePromptLines(STAGE.FINAL, { collectionKind: COLLECTION.MEASUREMENT,
    studentData: normalizeStudentData({ measurementName: "처리 시간", unit: "초", conditions: [
      { label: "수작업 · 100개", values: ["180", "195", "172"] },
      { label: "딕셔너리 · 1000개", values: ["0.034", "0.031", "0.035"] }] }) }).join("\n");
  check(/뒤가 같은 조건끼리만/.test(finalRules), "견줄 수 없는 조건을 나누지 말라고 이른다", finalRules.slice(0, 120));
}

// 사용자 지적 2026-09-23: 「학생이 모르는 것을 넣지 않는다」는 전제가 틀렸다. 학생은 모르는 것이
// 맞고, 모르는 것을 정리해 주는 것이 이 프로그램이 하는 일이다. 지어내기를 막는 장치가
// **가르치기를 막고** 있었다 — 이론적 배경에서 「중력가속도는 9.8 m/s^2」이 통째로 지워졌다.
{
  const M = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const know = ["중력가속도는 약 9.8 m/s^2 이다.", "표준 상태에서 기체 1몰의 부피는 22.4 L 이다."].join(" ");
  const kept = M.removeUnsourcedClaims(know, ["데이터 과학"]);
  check(/9\.8/.test(kept.body) && /22\.4/.test(kept.body), "교과 지식의 숫자는 지식 절에서 살아남는다", kept.body);

  const sourced = M.removeUnsourcedClaims("환경부 대기오염 측정자료에 따르면 연평균은 21 ㎍/㎥ 였다.", ["환경부 대기오염 측정자료"]);
  check(/21/.test(sourced.body), "우리가 준 자료를 가리키면 그대로 둔다", sourced.body);

  const bad = M.removeUnsourcedClaims("선행 연구에 따르면 참여율이 78% 로 나타났다.", ["환경부 대기오염 측정자료"]);
  check(!/78/.test(bad.body), "우리가 주지 않은 근거를 대면 지운다", bad.body);

  // 결과 절은 그대로다 — 거기 숫자는 학생 데이터에서만 나와야 한다.
  check(M.KNOWLEDGE_SECTION.test("이론적 배경") && !M.KNOWLEDGE_SECTION.test("탐구 결과"),
    "지식 절과 결과 절을 가른다");

  // 자료 과제의 방법 절에는 자료원을 반드시 밝히게 한다.
  check(/첫 문장에 자료원을 밝힌다/.test(M.stageSectionGuide("탐구 방법", STAGE.FINAL, COLLECTION.DATASET)),
    "자료 과제는 방법 절에 자료원을 밝힌다");
  check(!/첫 문장에 자료원을 밝힌다/.test(M.stageSectionGuide("탐구 방법", STAGE.FINAL, COLLECTION.MEASUREMENT)),
    "직접 잰 과제에는 그 규칙을 주지 않는다");

  // 학생용 설명서 — AI 없이 우리가 아는 사실로만 만든다.
  const { buildReportGuide } = await import("../../../admission_worker_skeleton/report_guide_v1.mjs");
  const gData = normalizeStudentData({ measurementName: "대여 건수", unit: "건",
    conditions: [{ label: "1월", values: ["182450"], note: "공공데이터 포털, 2026-09-22 조회" }] });
  const guide = buildReportGuide({ input: { subject: "데이터 과학", collectionKind: COLLECTION.DATASET,
    referenceDatasets: [{ title: "한국환경공단_에어코리아", org: "한국환경공단" }] },
    data: gData, stats: computeStats(gData), sections: [{ title: "연구 질문" }], title: "시험" });
  const flat = guide.blocks.flatMap((one) => one.lines).join(" ");
  check(guide.blocks.length === 4, "설명서는 네 덩이다", String(guide.blocks.length));
  check(/한국환경공단/.test(flat), "자료원이 설명서에 들어간다", flat.slice(0, 80));
  check(/공공데이터 포털, 2026-09-22 조회/.test(flat), "내가 적은 출처 메모가 들어간다");
  check(/제출하지 않아요/.test(flat), "설명서는 제출하지 않는다고 알려 준다");
}

// 운영 검사 2026-09-23(데이터 과학 미세먼지): 표 머리글이 「마이크로그램 매 세제곱미터」로 나왔다.
// 학생이 그대로 내면 교과서에 없는 표기다.
{
  const M = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const pairs = [["마이크로그램 매 세제곱미터", "μg/m³"], ["밀리그램 매 리터", "mg/L"],
    ["와트 매 제곱미터", "W/m²"], ["도 섭씨", "°C"], ["피피엠", "ppm"]];
  for (const [said, want] of pairs) {
    check(M.symbolUnit(said) === want, `「${said}」은 ${want} 로 적는다`, M.symbolUnit(said));
  }
  check(M.symbolUnit("건") === "건", "기호가 없는 단위는 그대로 둔다", M.symbolUnit("건"));
}

// 사용자 지적 2026-09-23: 보고서 참고 자료에 공공데이터가 없다. 설명서에는 있는데.
// 설계서가 「자료의 출처는 오른쪽 메모 칸에 적어요」라고 시켜 놓고, 그 메모가 참고 자료에
// 안 들어가고 있었다. 학생이 손으로 적은 출처가 **그 학생이 실제로 본 자료**다.
{
  const M = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const R = await import("../../../admission_worker_skeleton/references_v1.mjs");
  const d = normalizeStudentData({ measurementName: "농도", unit: "μg/m³", conditions: [
    { label: "대전 · 1월", values: ["28.4"], note: "공공데이터 포털 대기오염 월별 통계, 2026-09-23 조회" },
    { label: "부산 · 1월", values: ["26.9"], note: "값이 조금 튀어 보임" },
    { label: "대전 · 4월", values: ["19.1"], note: "공공데이터 포털 대기오염 월별 통계, 2026-09-23 조회" },
  ] });
  const notes = R.studentSourceLines(d.conditions);
  check(notes.length === 1 && /대기오염 월별 통계/.test(notes[0]),
    "출처처럼 보이는 메모만 골라낸다 — 같은 것은 한 번만", JSON.stringify(notes));
  check(!notes.some((one) => /튀어 보임/.test(one)), "관찰 메모는 자료원이 아니다");
  const body = M.buildReferencesBody("", [], { textbook: "데이터 과학 교과서 · 데이터 수집과 전처리 단원", studentSources: notes });
  check(body.split("\n")[0] === notes[0], "학생이 적은 자료원이 참고 자료 맨 앞이다", body);
  check(/교과서/.test(body), "교과서 줄은 그대로 남는다", body);
  const none = R.studentSourceLines([{ label: "가", values: ["1"], note: "색이 연했다" }]);
  check(none.length === 0, "출처가 아닌 메모만 있으면 아무것도 안 넣는다", JSON.stringify(none));
}

// 2026-09-23: 받을 자리만 만들고 **넘겨주는 곳을 빠뜨려서** 보고서에 안 나왔다.
// 그래서 함수 하나가 아니라 **보고서를 끝까지 만들어** 참고 자료를 본다.
{
  const M = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const data = normalizeStudentData({ measurementName: "농도", unit: "μg/m³", conditions: [
    { label: "대전 · 1월", values: ["28.4"], note: "공공데이터 포털 대기오염 월별 통계, 2026-09-23 조회" },
    { label: "부산 · 1월", values: ["26.9"], note: "값이 조금 튀어 보임" },
  ] });
  const out = M.finalizeStageOutput(STAGE.FINAL,
    { title: "시험", sections: [{ title: "탐구 결과", body: "대전 1월은 28.4였다." }, { title: "참고 자료", body: "" }] },
    { studentData: data, subject: "데이터 과학", collectionKind: COLLECTION.DATASET,
      textbookCitation: "데이터 과학 교과서 · 데이터 수집과 전처리 단원" });
  const ref = (out.parsed.sections || []).find((one) => /참고 자료/.test(one.title));
  check(/대기오염 월별 통계/.test(ref?.body || ""), "보고서 참고 자료에 학생이 적은 자료원이 들어간다", ref?.body);
  check(/교과서/.test(ref?.body || ""), "교과서 줄도 함께 남는다", ref?.body);
  check(!/튀어 보임/.test(ref?.body || ""), "관찰 메모는 참고 자료에 안 들어간다", ref?.body);
}

// **설계서 표를 진짜 통계로 채운다** (사용자 결정 2026-09-23).
// 학생이 공공데이터 포털에서 찾아 옮겨 적는 것은 너무 힘들다. 우리가 채우고 학생은 해석을 쓴다.
// 숫자는 KOSIS 씨앗의 값 **그대로**다 — 지어내지 않는다.
{
  const { findTable, buildFilledTable } = await import("../../../admission_worker_skeleton/kosis_fill_v1.mjs");
  const seed = JSON.parse(await readFile(new URL("../seed/engine-index/kosis_tables.v1.json", import.meta.url), "utf8"));
  const map = JSON.parse(await readFile(new URL("../seed/engine-index/kosis_unit_map.v1.json", import.meta.url), "utf8"));

  check((seed.tables || []).length >= 4, "통계표 씨앗이 있다", String((seed.tables || []).length));
  check((seed.tables || []).every((one) => one.org && one.name && one.accessed),
    "표마다 기관·이름·조회일이 있다 — 참고 자료에 그대로 쓴다");

  const table = findTable(seed, map, "모집단과 표본");
  check(Boolean(table), "단원에 짝지은 표를 찾는다", table?.name);
  const filled = buildFilledTable(table);
  check(filled && filled.conditions.length >= 4, "표가 채워진다", String(filled?.conditions.length));
  check(filled.conditions.every((one) => /^[0-9.]+$/.test(one.values[0])), "칸마다 숫자가 들어 있다",
    JSON.stringify(filled.conditions.slice(0, 2)));
  check(/통계청/.test(filled.note) && /조회/.test(filled.note), "출처 메모가 함께 온다", filled.note);

  // 채운 값은 씨앗에 **실제로 있는 값**이어야 한다. 하나라도 지어내면 안 된다.
  const real = new Set(table.rows.map((one) => String(one.value)));
  check(filled.conditions.every((one) => real.has(one.values[0])),
    "채운 값이 전부 씨앗에 있는 값이다 — 지어낸 숫자가 없다");

  // 합계 줄은 조건으로 쓰지 않는다 — 비교가 안 된다.
  check(!filled.conditions.some((one) => /^(전국|총계|합계) /.test(one.label)), "합계 줄은 조건에 넣지 않는다");

  // 짝이 없는 단원에는 아무것도 안 준다.
  check(!findTable(seed, map, "효소와 대사 반응"), "짝이 없으면 아무것도 안 준다");

  // 워커와 화면이 실제로 이어져 있나.
  const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
  const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
  check(/if \(table\) filledTable = buildFilledTable\(table\);/.test(worker), "워커가 설계서에서 표를 채운다");
  check(/input\.reportStage === STAGE\.DRAFT && result\?\.dataTemplate/.test(worker), "설계서 단계에서만 채운다");
  check(/applyFilledTable\(rawData\?\.filledTable\)/.test(bridge), "화면이 그 값을 표에 넣는다");
  check(/if\(box && !box\.value\)/.test(bridge), "학생이 이미 적은 칸은 덮어쓰지 않는다");
}
