// The 전공 선택 step, end to end through the files the browser actually loads.
//
// Two things have to hold. The student can say 아직 못 정했어요 and still get a report — most of them have not
// decided, and a 1학년 report that names a department is still in 생활기록부 three years later. And whatever they
// pick has to survive the trip: 전공 step → hidden input → bridge payload → Worker → 교과 심화와 확장.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveMajorPath } from "../../../admission_worker_skeleton/major_path_v1.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const flow = await readFile(new URL("../assets/js/decision_flow_v1.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
const css = await readFile(new URL("../assets/decision_flow.css", import.meta.url), "utf8");
const index = JSON.parse(await readFile(new URL("../seed/engine-index/major_curriculum_index.v1.json", import.meta.url), "utf8"));

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// U1: the step exists on the page, and says up front that skipping it is fine.
check(/id="majorStep"/.test(html), "U1 the 전공 선택 step is on the page");
check(/id="majorChoiceList"/.test(html) && /id="majorPick"/.test(html), "U1 with a list to fill and a hidden field to carry the answer");
check(/선택 사항/.test(html), "U1 the heading says it is optional");
check(/아직 안 정했어도 괜찮아요/.test(html), "U1 and the text says so in words a student reads");

// U2: 아직 못 정했어요 is a button, not a missing answer.
check(/아직 못 정했어요/.test(flow), "U2 undecided is one of the choices");
check(/undecided\.setAttribute\("data-major", ""\)/.test(flow), "U2 and it sends an empty major on purpose");
check(/전공 없이 씁니다/.test(flow) && /나중에 바꿔도 됩니다/.test(flow), "U2 the student is told what that means and that it is reversible");
check(/이번 과제와 닿는 과목이 없으면 교과를 더 깊게/.test(flow), "U2 and a picked major is told it may still fall back");

// U3: every major offered is one we hold a curriculum for. Offering a name we cannot use would be a lie.
{
  const offered = [...flow.matchAll(/"([가-힣·A-Za-z]+(?:학과|학부|과))"/g)].map((m) => m[1]);
  const inTable = offered.filter((name) => index.majors[name]);
  check(inTable.length >= 30, "U3 the list is drawn from the majors we actually hold", `${inTable.length}/${offered.length}`);
  const missing = [...new Set(offered.filter((name) => !index.majors[name] && /학과|학부$/.test(name)))];
  check(missing.length === 0, "U3 nothing is offered that the engine cannot use", missing.join(","));
  check(Object.keys(index.majors).every((name) => flow.includes(`"${name}"`)), "U3 and none of the 33 is left off the list");
}

// U4: the answer survives the trip to the Worker.
check(/if\(\$\("majorPick"\)\) \$\("majorPick"\)\.value = text\(state\.major\)/.test(flow), "U4 the pick lands in the hidden field");
check(/major: readValue\("majorPick"\)/.test(bridge), "U4 the bridge reads the 전공, not the 계열");
check(/track: readValue\("career"\)/.test(bridge), "U4 while the 계열 stays as the track — they are different answers");
check(/s\.selectedMajor = s\.selectedMajor \|\| form\.major \|\| readValue\("majorPick"\)/.test(bridge), "U4 and the request carries it too");
check(/major: firstNonEmpty\(s\.selectedMajor, form\.major, ""\)/.test(bridge), "U4 with an empty major when the student said so");

// U5: the Worker no longer refuses a student who has not decided.
check(/const REQUIRED_INPUTS = \['keyword', 'grade', 'track'\];/.test(worker), "U5 관심 학과 is no longer required", worker.match(/const REQUIRED_INPUTS = [^;]+;/)?.[0]);
check(/OPTIONAL_INPUTS = \['activityLevel', 'style', 'major'\]/.test(worker), "U5 it is optional instead");
check(!/major: '관심 학과'/.test(worker), "U5 and the missing-input message no longer asks for it");

// U6: what each answer produces, run through the real resolver.
{
  const base = { subject: "물리", selectedConcept: "물질의 전기적 특성", track: "공학계열" };
  check(resolveMajorPath({ ...base, major: "전기전자공학부" }, index).mode === "curriculum", "U6 a picked major that fits takes the curriculum path");
  check(resolveMajorPath({ ...base, major: "" }, index).reason === "NO_MAJOR", "U6 아직 못 정했어요 goes to 교과 심화 확장");
  check(resolveMajorPath({ ...base, major: "공학계열" }, index).reason === "TRACK_ONLY", "U6 and a 계열 arriving in the major field is caught too");
}

// U7: the step is styled and cleared with the rest of the flow.
check(/#majorChoiceList\{/.test(css) && /\.major-undecided\{/.test(css), "U7 the step has its own styles");
check(!/#3a4considering/.test(css), "U7 with no broken colour values");
check(/if\(\$\("majorStep"\)\) \$\("majorStep"\)\.hidden = true;/.test(flow), "U7 and 처음부터 다시 hides it with everything else");

console.log(`PASS major pick UI: ${passed}/${passed}`);
