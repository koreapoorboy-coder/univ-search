// Two-stage experiment report (admission_worker_skeleton/report_stages_v1.mjs).
// Stage 1 is a design report with a data template; stage 2 uses only the student's numbers.
// Every table/chart number is computed from student data, body sentences with other numbers are removed,
// and an empty table turns stage 2 into a literature report.
import assert from "node:assert/strict";
import {
  STAGE, allowedNumberSet, buildFigures, computeStats, finalizeStageOutput, normalizeStudentData,
  removeUnsupportedNumbers, resolveReportStage, stageSchemaProperties, stageSections,
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
check(table && table.label === "표 1" && table.columns.join("|") === "조건|1회|2회|3회|평균" && table.rows[0].join("|") === "일반 세제 · 미지근한 물|1|2|1|1.33", "a raw-data table is always included", JSON.stringify(table?.rows?.[0]));
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
check(Object.keys(stageSchemaProperties(STAGE.DRAFT)).join() === "dataTemplate" && Object.keys(stageSchemaProperties(STAGE.FINAL)).join() === "figures", "each stage asks the model for its own extra output");

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

console.log(`PASS experiment two-stage report: ${passed}/${passed}`);
