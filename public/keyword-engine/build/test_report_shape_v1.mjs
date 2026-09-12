// The report's shape comes from 7,131 real 수행평가 과제 (admission_worker_skeleton/report_shape_v1.mjs).
// A 논술 task must not be given 가설 and 실험 방법, the numbers must come from the corpus, and a thin bucket
// must climb the ladder rather than let a handful of tasks decide.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decideStructure, normalizeGroup, pickReportShape, shapePromptLines } from "../../../admission_worker_skeleton/report_shape_v1.mjs";
import { STAGE, stageSections } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const index = JSON.parse(await readFile(new URL("../seed/engine-index/report_shape_index.v1.json", import.meta.url), "utf8"));
const shapeOf = (subjectGroup, collectionKind, taskDescription) => pickReportShape({ subjectGroup, collectionKind, taskDescription }, index);

check(normalizeGroup("과학") === "과학" && normalizeGroup("공학") === "과학" && normalizeGroup("예체능") === "예술·체육" && normalizeGroup("정보·기술") === "정보",
  "the corpus's twenty 계열 labels fold into the six the site knows", normalizeGroup("정보·기술"));

// The fault this exists to fix: a 논술 task used to be given 가설 and 실험 방법.
const essay = shapeOf("국어", "none", "제시된 작품을 읽고 자신의 주장을 담은 논술문을 쓰시오. 근거를 두 가지 이상 들 것.");
check(essay.structure === "structure_argumentation", "a 논술 task gets the argument structure", essay.structure);
const essaySections = stageSections(STAGE.FINAL, { taskDescription: "논술문을 쓰시오", reportShape: essay });
check(!essaySections.some((s) => /가설|실험/.test(s)) && essaySections.includes("반론 검토"),
  "a 논술 report has no 가설 and no 실험 방법", essaySections.join("/"));

// "실험을 설계하고" is an experiment, not a design project — the bare word 설계 used to win.
const experiment = shapeOf("과학", "measurement", "효소의 작용 조건을 알아보는 실험을 설계하고 결과를 표로 정리하시오.");
check(experiment.structure === "structure_experiment_analysis", "설계 inside an experiment task does not make it a design project", experiment.structure);
check(experiment.count > 500, "the experiment shape rests on a thick bucket", String(experiment.count));

const survey = shapeOf("사회", "survey", "우리 학교 학생들에게 설문을 받아 응답을 정리하고 대안을 제시하시오.");
check(survey.mode === "자료해석형", "a survey is read as data", survey.mode);
const practical = shapeOf("예술·체육", "none", "배드민턴 숏서브 동작을 연습하고 수행 과정을 기록하시오.");
check(practical.structure === "structure_practical_reflection" && practical.sections.includes("수행 과정 기록"),
  "a 실기 task gets the practice structure", practical.structure);
const coding = shapeOf("정보", "none", "알고리즘을 설계하고 프로그램으로 구현한 뒤 오류를 수정하시오.");
check(coding.structure === "structure_programming_implementation", "a coding task gets the implementation structure", coding.structure);

// With nothing in the wording, what the student collects decides.
check(decideStructure({ taskDescription: "탐구 보고서를 작성하시오.", collectionKind: "measurement" }).structure === "structure_experiment_analysis",
  "a wordless science task still lands on the experiment shape");
check(decideStructure({ taskDescription: "탐구 보고서를 작성하시오.", collectionKind: "reading" }).basis === "학생이 모으는 자료의 종류",
  "the basis says the decision came from the collection kind");

// The numbers are the corpus's, and a thin bucket climbs instead of deciding on its own.
check(essay.rubrics.includes("근거제시") && essay.avoid.length > 0, "the graded elements and the things to avoid come from real tasks",
  essay.rubrics.join(","));
const thin = pickReportShape({ subjectGroup: "기타", collectionKind: "reading", taskDescription: "보고서" }, index);
check(thin.count >= 10 || thin.count === 0, "a bucket too thin to trust is never used as it is", String(thin.count));
check(/과제 \d+건/.test(essay.basis), "the report says how many real tasks its shape rests on", essay.basis);

const lines = shapePromptLines(experiment).join("\n");
check(lines.includes("주제를 잡는 방식") && lines.includes("선생님이 실제로 보는 것") && lines.includes("피해야 하는 형태"),
  "the model is told the topic formula, the graded elements and what to avoid");
check(shapePromptLines(null).length === 0, "no index means no extra instructions");

// Falling back must never break the report: without the index the old fixed outline stands.
check(pickReportShape({ subjectGroup: "과학", taskDescription: "실험" }, null).sections.length === 0, "a missing index returns no sections");
const fallback = stageSections(STAGE.FINAL, { taskDescription: "탐구 보고서" });
check(fallback.includes("연구 질문") && fallback.includes("느낀 점"), "without a shape the report keeps the old outline", fallback.join("/"));

// Every structure the rules can choose must actually have sections written for it.
const chooseable = new Set();
for (const group of ["과학", "국어", "수학", "사회", "영어", "예술·체육", "정보"]) {
  for (const kind of ["measurement", "survey", "dataset", "reading", "none"]) {
    for (const text of ["논술문을 쓰시오", "실험을 하시오", "통계 자료를 해석하시오", "작품을 만드시오", "알고리즘을 구현하시오", "연주를 시연하시오", "정책을 제안하시오", "독서 감상문", "모델링하시오", "문항을 제작하시오", "매체 자료를 분석하시오", "사회 문제를 조사하시오", "보고서를 쓰시오"]) {
      chooseable.add(decideStructure({ subjectGroup: group, collectionKind: kind, taskDescription: text }).structure);
    }
  }
}
const withoutSections = [...chooseable].filter((id) => !(index.sections[id] || []).length);
check(withoutSections.length === 0, "every structure the rules can pick has a section list", withoutSections.join(","));
check(chooseable.size >= 10, "the rules reach at least ten different shapes", String(chooseable.size));

const builder = await readFile(new URL("../../../tools/build_engine_index.mjs", import.meta.url), "utf8");
check(!/school_name|source_file|source_page/.test(index.note + JSON.stringify(index).slice(0, 2000)) && builder.includes("학교명·파일명·쪽수는 이 파일에 들어가지 않습니다"),
  "no school, file or page from the source 평가계획 reaches the index");
check(Boolean(index.buckets && index.byGroupMode && index.byMode && index.byGroup), "the index carries every rung of the ladder");

console.log(`PASS report shape: ${passed}/${passed}`);
