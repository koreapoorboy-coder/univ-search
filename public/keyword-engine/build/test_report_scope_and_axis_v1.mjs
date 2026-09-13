// Two things this program has to know about itself: which 수행평가 it should not touch, and where a student's own
// interests already lead. 433 of the 7,131 real tasks have no report in them; the engine owns 465 종단 축 that say
// what comes next, and until now the upload analysis invented its suggestions instead of reading them.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SCOPE, isReportTask, resolveReportScope } from "../../../admission_worker_skeleton/report_scope_v1.mjs";
import { axisPromptLines, matchAxes } from "../../../admission_worker_skeleton/upload_analysis_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const scopeOf = (taskDescription) => resolveReportScope({ taskDescription });

// Turned away: there is no report in these, and writing one costs a use for a page the student cannot hand in.
check(scopeOf("드럼 연주법을 익혀 악곡의 특징을 살려 연주한다.").scope === SCOPE.PERFORMANCE, "playing an instrument is not a report task");
check(scopeOf("배드민턴 라켓을 이용하여 정해진 구역에 숏서비스 실시하기").scope === SCOPE.PERFORMANCE, "a 실기 test is not a report task");
check(scopeOf("롤링티볼 리그전에 적극적으로 참여하기").scope === SCOPE.PERFORMANCE, "playing a match is not a report task");
check(scopeOf("오른쪽 두뇌로 그리기 과정을 통해 관찰력과 형태묘사력을 향상시킨다.").scope === SCOPE.ARTWORK, "making a drawing is not a report task");
check(scopeOf("학습 참여도").scope === SCOPE.PARTICIPATION, "a participation mark is not a report task");
check(scopeOf("드럼 연주하기").message.includes("글로 내는 보고서"), "the student is told what this program does instead",
  scopeOf("드럼 연주하기").message);

// Kept: anything with a written deliverable, however it is wrapped.
check(isReportTask({ taskDescription: "효소의 작용 조건을 실험으로 확인하고 탐구 보고서를 작성하시오." }), "an experiment report is a report task");
check(isReportTask({ taskDescription: "자신의 주장을 담은 논술문을 쓰시오." }), "an essay is a report task");
check(isReportTask({ taskDescription: "작품을 감상한 뒤 감상문을 작성하여 제출한다." }), "a performance with a written piece attached stays in");
check(isReportTask({ taskDescription: "연주를 한 뒤 연주 계획과 과정을 보고서로 정리한다." }), "a 연주 task that ends in a report stays in");
check(isReportTask({ taskDescription: "" }), "an empty task is not turned away on a guess");
check(isReportTask({ taskDescription: "주제를 정해 탐구 보고서를 작성하시오." }), "the ordinary case is untouched");

// 독창적 and 독창성 sit in almost every 평가 루브릭 and mean "original". They were reading as 독창 — a solo voice —
// and throwing real 탐구 과제 out of scope. 41 tasks in the corpus were being turned away this way.
check(isReportTask({ taskDescription: "주제가 독창적이며 학문적·사회적 의의가 있는가? 물리학 원리를 정확히 적용하였는가?" }),
  "독창적 is originality, not a solo performance");
check(isReportTask({ taskDescription: "창의성과 독창성이 드러나게 탐구 주제를 선정하고 분석한다." }), "독창성 does not put a task out of scope either");
check(scopeOf("독창과 중창의 발성 차이를 살려 노래한다.").scope === SCOPE.PERFORMANCE, "an actual 독창 is still a performance");
// 경기 침체 is the economy, not a match.
check(isReportTask({ taskDescription: "경기 침체가 청년 고용에 미친 영향을 통계로 분석하여 보고서를 쓴다." }), "경기 침체 is not a sports match");
check(scopeOf("배드민턴 경기에 참여하여 규칙을 지킨다").scope === SCOPE.PERFORMANCE, "an actual 경기 is still a performance");

// The site and the Worker have to agree, or a student is turned away in one place and charged in the other.
const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const scopeSource = await readFile(new URL("../../../admission_worker_skeleton/report_scope_v1.mjs", import.meta.url), "utf8");
const shared = "연주|가창|합창|독창(?!적|성)|중주|시연|실기|경기(?! ?침체| ?회복| ?불황| ?호황| ?변동| ?순환| ?지표| ?동향| ?전망)|리그전|타격|송구|드리블";
check(bridge.includes(shared) && scopeSource.includes(shared), "the site turns away exactly what the Worker would");
check(bridge.includes("reportScopeProblem(req)") && bridge.includes("이 과제는 보고서 과제가 아닌 것 같아요"),
  "the site says so before any request is made, so nothing is charged");
const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
check(worker.includes("NOT_A_REPORT_TASK") && worker.includes("scope.scope !== SCOPE.REPORT"), "the Worker refuses too, before any model call");
check(worker.indexOf("scope.scope !== SCOPE.REPORT") < worker.indexOf("callOpenAIWithRetry"), "the refusal comes before the model call");

// The index is built from our own curriculum maps, and a generic keyword must not drown a specific one.
const axisIndex = JSON.parse(await readFile(new URL("../seed/engine-index/longitudinal_axis_index.v1.json", import.meta.url), "utf8"));
check(Object.keys(axisIndex.axes).length > 400 && Object.keys(axisIndex.keywords).length > 1500,
  "the axis index carries the whole map", `축 ${Object.keys(axisIndex.axes).length}, 키워드 ${Object.keys(axisIndex.keywords).length}`);
const aerospace = matchAxes(["항공우주", "인공위성", "미세먼지", "수학적 모델링", "프로그래밍"], axisIndex);
check(aerospace[0].next.some((subject) => /항공우주|천문/.test(subject)),
  "an aerospace record leads to an aerospace axis, not whatever shares the word 데이터", aerospace[0].title);
const enzyme = matchAxes(["효소", "생명과학", "생명공학과"], axisIndex);
check(enzyme.some((axis) => /효소|대사/.test(axis.title)), "an enzyme record finds the 효소 axis", enzyme.map((a) => a.title).join(","));
check(matchAxes(["존재하지않는키워드"], axisIndex).length === 0, "nothing is proposed when nothing matches");
check(matchAxes(["효소"], null).length === 0, "no index means no axes");

const lines = axisPromptLines(enzyme).join("\n");
check(lines.includes("이어지는 과목·학과") && lines.includes("reportLines는 위 축 중에서 고른다"),
  "the model is told to choose from our axes, and where each one leads");
check(lines.includes("전혀 맞지 않을 때만 축 밖에서"), "the model may still go outside them, but has to say why");
check(axisPromptLines([]).length === 0, "no matches means no extra instructions");

const builder = await readFile(new URL("../../../tools/build_axis_index.mjs", import.meta.url), "utf8");
check(builder.includes("Math.sqrt(list.length)"), "a keyword that reaches many axes counts for less in each");
check(worker.includes("meta.matchedAxes = matchAxes(") && worker.indexOf("meta.matchedAxes") < worker.indexOf("analyzeUploadWithModel(files, meta, env)"),
  "the axes are matched before the upload is read, so they cost no extra call");

console.log(`PASS report scope and axes: ${passed}/${passed}`);
