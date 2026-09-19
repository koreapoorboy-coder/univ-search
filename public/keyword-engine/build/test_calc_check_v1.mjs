// 계산 검사(calc_check_v1)와 기준값 칸. 운영 테스트 9(2026-09-19): 중화 적정 보고서가 적정 부피만 적고
// 식초의 산도를 계산하지 않았다 — 지어낸 숫자를 지우는 규칙 때문에 계산한 값도 쓸 수 없었다.
import assert from "node:assert/strict";
import { evaluateExpression, verifyCalculations } from "../../../admission_worker_skeleton/calc_check_v1.mjs";
import { allowedNumberSet, computeStats, finalizeStageOutput, normalizeStudentData, STAGE, stageSchemaProperties } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

let passed = 0;
const check = (ok, name, detail = "") => { assert.equal(Boolean(ok), true, `${name}${detail ? ` -> ${detail}` : ""}`); passed += 1; console.log(`PASS ${name}`); };

// C1 식 계산
check(evaluateExpression("0.100 × 36.0 ÷ 5.0") === 0.72, "C1 × ÷ 로 쓴 식을 계산한다", evaluateExpression("0.100 × 36.0 ÷ 5.0"));
check(Math.abs(evaluateExpression("(4.32 - 4.5) / 4.5 * 100") + 4) < 1e-9, "C1 괄호와 음수 결과");
check(evaluateExpression("0.1 × 36 mL") === null, "C1 글자가 섞이면 계산하지 않는다");
check(evaluateExpression("2 + ") === null, "C1 식이 끝나지 않으면 계산하지 않는다");

// C2 검사
const data = normalizeStudentData({ measurementName: "NaOH 소모 부피", unit: "mL",
  conditions: [{ label: "식초 5 mL", values: ["36.0", "35.8", "36.2"] }, { label: "식초 10 mL", values: ["72.1", "71.8", "72.4"] }],
  references: [{ label: "식초 병에 표시된 산도", unit: "%", value: "4.5" }] });
check(data.references.length === 1 && data.references[0].value === "4.5", "C2 기준값을 받는다");
const allowed = allowedNumberSet(data, computeStats(data));
["0.1", "0.100", "5"].forEach((n) => allowed.add(String(Number(n))));
check(allowed.has("4.5"), "C2 기준값은 본문에 쓸 수 있는 숫자다");
const result = verifyCalculations([
  { what: "몰 농도", constants: [], expression: "0.100 × 36.0 ÷ 5", result: "0.72", unit: "M" },
  { what: "산도", constants: [{ name: "아세트산 몰질량", value: "60.05" }], expression: "0.72 × 60.05 ÷ 10", result: "4.32", unit: "%" },
  { what: "오차율", constants: [], expression: "(4.32 - 4.5) ÷ 4.5 × 100", result: "-4", unit: "%" },
  { what: "틀린 답", constants: [], expression: "0.100 × 36.0 ÷ 5", result: "0.8", unit: "M" },
  { what: "출처 없는 숫자", constants: [], expression: "0.72 × 1.05", result: "0.756", unit: "M" },
], allowed);
check(result.verified.length === 3, "C2 맞는 계산 셋은 통과(앞 계산의 답을 뒤에서 쓴다)", JSON.stringify(result.rejected));
check(result.rejected.map((one) => one.why).join("|") === "답이 식과 다름|식에 출처 없는 숫자", "C2 틀린 답과 출처 없는 숫자는 떨어진다", JSON.stringify(result.rejected));
check(result.allowed.has("4.32") && result.allowed.has("4.3") && result.allowed.has("0.72") && result.allowed.has("60.05"), "C2 맞는 계산의 답과 상수는 쓸 수 있다");
check(!result.allowed.has("0.8"), "C2 틀린 답은 쓸 수 없다");

// C3 최종 단계: 계산한 산도가 든 문장은 남고, 검사 못 한 숫자 문장은 지워진다
const out = finalizeStageOutput(STAGE.FINAL, {
  sections: [{ title: "5. 결과 분석", body: "5 mL 시료의 평균 36.0 mL로 몰 농도는 0.72 M이다. 산도는 약 4.3%로 표시값 4.5%보다 4% 낮았다. 다른 식초는 5.1%였다." }],
  calculations: [
    { what: "몰 농도", constants: [], expression: "0.1 × 36 ÷ 5", result: "0.72", unit: "M" },
    { what: "산도", constants: [{ name: "아세트산 몰질량", value: "60.05" }], expression: "0.72 × 60.05 ÷ 10", result: "4.32", unit: "%" },
    { what: "오차율", constants: [], expression: "(4.32 - 4.5) ÷ 4.5 × 100", result: "-4", unit: "%" },
  ], figures: [], recordDraft: [],
}, { studentData: data, taskDescription: "0.1 M 수산화나트륨으로 적정하여 산도와 비교한다", subject: "화학" });
const body = out.parsed.sections[0].body;
check(body.includes("0.72 M") && body.includes("4.3%"), "C3 검사를 통과한 계산은 본문에 남는다", body);
check(!body.includes("5.1%"), "C3 검사 못 한 숫자 문장은 지워진다", body);
check(out.extra.calculations.length === 3, "C3 검사한 계산을 결과에 남긴다");

// C4 모양
const finalSchema = stageSchemaProperties(STAGE.FINAL, {});
check(Boolean(finalSchema.calculations), "C4 최종 단계는 calculations 칸이 있다");
const draftSchema = stageSchemaProperties(STAGE.DRAFT, { collectionKind: "measurement" });
check(draftSchema.dataTemplate.required.includes("referenceInputs"), "C4 설계서는 기준값 칸을 정한다");
const draft = finalizeStageOutput(STAGE.DRAFT, { sections: [], dataTemplate: { measurementName: "부피", unit: "mL", scaleGuide: "", conditions: ["a", "b"], trials: 3,
  referenceInputs: [{ label: "식초 병에 표시된 산도", unit: "%" }] } }, { collectionKind: "measurement" });
check(draft.extra.dataTemplate.referenceInputs[0].label === "식초 병에 표시된 산도", "C4 기준값 칸이 화면까지 간다");

// C3b 단위 바꾸기 숫자(÷1000, ×100)는 출처를 따지지 않는다 — 운영 테스트 12에서 맞는 계산이 이것 때문에 모두 떨어졌다
const units = verifyCalculations([
  { what: "몰 농도", constants: [], expression: "(0.1 × (36.0 ÷ 1000)) ÷ (5 ÷ 1000)", result: "0.72", unit: "M" },
  { what: "산도", constants: [{ name: "아세트산 몰질량", value: "60.05" }], expression: "((0.1 × (36.0 ÷ 1000)) ÷ (5 ÷ 1000) × 60.05) ÷ 10", result: "4.3236", unit: "%" },
  { what: "상대 오차", constants: [{ name: "아세트산 몰질량", value: "60.05" }], expression: "((((0.1 × (36.0 ÷ 1000)) ÷ (5 ÷ 1000) × 60.05) ÷ 10) - 4.5) ÷ 4.5 × 100", result: "-3.92", unit: "%" },
  { what: "앞에서 밝힌 몰질량을 다시 쓴 산도", constants: [], expression: "0.72 × 60.05 ÷ 10", result: "4.32", unit: "%" },
], allowed);
check(units.verified.length === 4, "C3b 단위 바꾸기는 통과하고, 앞에서 밝힌 상수는 뒤에서 다시 쓸 수 있다", JSON.stringify(units.rejected));
const unnamed = verifyCalculations([{ what: "밝히지 않은 낯선 상수", constants: [], expression: "0.72 × 61.3 ÷ 10", result: "4.414", unit: "%" }], allowed);
check(unnamed.rejected[0]?.why === "식에 출처 없는 숫자", "C3b 이름 없는 낯선 상수는 여전히 떨어진다", JSON.stringify(unnamed));
// 운영 테스트 17: 아세트산 몰질량(60.05)을 constants에 안 적어 산도 계산이 떨어졌다 — 교과서 상수는 알아본다
check(verifyCalculations([{ what: "산도", constants: [], expression: "0.7165 × 60.05 × 0.1", result: "4.3026", unit: "%" }], new Set([...allowed, "0.7165"])).verified.length === 1,
  "C3b 교과서 상수(아세트산 몰질량)는 밝히지 않아도 알아본다");

// C3c 단위를 미리 바꿔 적은 숫자(운영 테스트 14의 실제 식)
const shifted = verifyCalculations([
  { what: "5 mL 시료의 산도", constants: [{ name: "아세트산 몰질량", value: "60.05" }], expression: "0.1*0.036/0.005*60.05/10", result: "4.324", unit: "%" },
  { what: "표기와의 차이", constants: [], expression: "4.324-4.5", result: "-0.176", unit: "%" },
  { what: "오차율", constants: [], expression: "(0.176/4.5)*100", result: "3.911", unit: "%" },
], allowed);
check(shifted.verified.length === 3, "C3c mL→L로 바꿔 적은 숫자와 앞 계산의 답(절댓값)을 쓴 식은 통과한다", JSON.stringify(shifted.rejected));
check(verifyCalculations([{ what: "x", constants: [], expression: "0.1*0.0377/0.005", result: "0.754", unit: "M" }], allowed).rejected.length === 1, "C3c 아는 숫자와 자릿수만 다른 게 아닌 숫자는 여전히 떨어진다");
// 운영 테스트 14의 실제 식: 답(4.315)은 맞는데 식은 4315가 된다 — 식이 틀렸으니 떨어뜨린다
check(verifyCalculations([{ what: "산도", constants: [{ name: "몰질량", value: "60.05" }], expression: "0.1*0.036*60.05/0.005*100", result: "4.324", unit: "%" }], allowed).rejected[0]?.why === "답이 식과 다름",
  "C3c 식과 답의 자릿수가 어긋나면(단위 바꾸기 실수) 떨어진다");

// C3d 앞 답의 절댓값을 반올림 없이 그대로 쓴다(운영 테스트 16의 실제 식)
const absolute = verifyCalculations([
  { what: "차이", constants: [], expression: "4.29207375 - 4.5", result: "-0.20792625", unit: "%p" },
  { what: "상대오차", constants: [], expression: "0.20792625 / 4.5 * 100", result: "4.620583333333333", unit: "%" },
], new Set([...allowed, "4.29207375"]));
check(absolute.verified.length === 2, "C3d 앞 답의 절댓값을 그대로 쓴 식은 통과한다", JSON.stringify(absolute.rejected));

// C4b 값을 구하라는 과제나 기준값이 있으면 계산이 하나는 있어야 한다(운영 테스트 11: 칸을 비우고 본문에 바로 적었다)
check(stageSchemaProperties(STAGE.FINAL, { taskDescription: "식초 속 아세트산의 함량을 적정하여 구하고 표시된 산도와 비교한다" }).calculations.minItems === 1, "C4b 값을 구하라는 과제는 계산 칸을 비울 수 없다");
check(stageSchemaProperties(STAGE.FINAL, { taskDescription: "탐구보고서", studentData: data }).calculations.minItems === 1, "C4b 기준값을 적었으면 계산 칸을 비울 수 없다");
check(stageSchemaProperties(STAGE.FINAL, { taskDescription: "효소 탐구보고서" }).calculations.minItems === 0, "C4b 그 밖에는 비워도 된다");

// C5 운영 테스트 10: 조건을 하나밖에 못 찾은 AI가 두 번째 칸을 답 형식 조각으로 채웠다.
const leaked = finalizeStageOutput(STAGE.DRAFT, { sections: [], dataTemplate: { measurementName: "부피", unit: "mL", scaleGuide: "", trials: 3,
  conditions: ["식초 시료 1:10 희석'],'trials':3,", "referenceInputs':[{", "label'", "unit"], referenceInputs: [] } }, { collectionKind: "measurement" });
check(leaked.extra.dataTemplate.conditions.join("|") === "식초 시료 1:10 희석|대조(비교용)", "C5 답 형식 조각은 조건 이름이 되지 않고, 앞의 진짜 이름은 살린다", JSON.stringify(leaked.extra.dataTemplate.conditions));
const one = finalizeStageOutput(STAGE.DRAFT, { sections: [], dataTemplate: { measurementName: "부피", unit: "mL", scaleGuide: "", trials: 3,
  conditions: ["식초 시료 5 mL", "unit"], referenceInputs: [] } }, { collectionKind: "measurement" });
check(one.extra.dataTemplate.conditions.join("|") === "식초 시료 5 mL|대조(비교용)", "C5 진짜 조건 하나는 살린다", JSON.stringify(one.extra.dataTemplate.conditions));

// C6 운영 테스트 18 뒤: 긴 소수(4.3236%)는 유효숫자 세 자리로, 지워진 문장은 남겨 둔다, 그래프 숫자도 학생 자릿수로
{
  const { shortNumber, tidyCalculatedNumbers } = await import("../../../admission_worker_skeleton/calc_check_v1.mjs");
  check(shortNumber("4.3236") === "4.32" && shortNumber("43.236") === "43.24" && shortNumber("0.9951388889") === "0.995" && shortNumber("-0.1764") === "-0.176", "C6 긴 소수는 유효숫자 세 자리로");
  check(shortNumber("4.32") === "4.32" && shortNumber("0.072") === "0.072", "C6 이미 짧은 수는 그대로");
  const tidy = tidyCalculatedNumbers("산도는 4.3236%이고 차이는 -0.1764%p, 절대 차이 0.1764%p였다. 14.4 mL는 그대로.", [{ result: "4.3236" }, { result: "-0.1764" }]);
  check(tidy === "산도는 4.32%이고 차이는 -0.176%p, 절대 차이 0.176%p였다. 14.4 mL는 그대로.", "C6 본문의 긴 계산값을 줄인다", tidy);
  const long = finalizeStageOutput(STAGE.FINAL, {
    sections: [{ title: "6. 결론", body: "산도는 4.3236%였다. 다른 식초는 5.1%였다." }],
    calculations: [{ what: "몰 농도", constants: [], expression: "0.1 × 36 ÷ 5", result: "0.72", unit: "M" }, { what: "산도", constants: [], expression: "0.72 × 60.05 ÷ 10", result: "4.3236", unit: "%" }],
    figures: [], recordDraft: ["적정 부피의 평균으로 식초의 산도 4.3236%를 구해 병에 표시된 값과 비교하여 차이를 확인함", "페놀프탈레인 종말점과 당량점의 차이를 중화 반응의 원리로 설명함", "블랭크 적정으로 지시약이 만드는 배경 부피를 확인하고 보정의 필요를 판단함"],
  }, { studentData: data, taskDescription: "0.1 M 수산화나트륨으로 적정하여 산도를 구한다", subject: "화학" });
  check(long.parsed.sections[0].body === "산도는 4.32%였다.", "C6 최종 단계 본문도 줄이고, 검산 못 한 문장은 지운다", long.parsed.sections[0].body);
  check(long.extra.removedNumberSamples?.[0]?.includes("5.1%"), "C6 지운 문장을 결과에 남긴다(원인 확인용)", JSON.stringify(long.extra.removedNumberSamples));
  check(long.extra.recordDraft.some((line) => line.includes("4.32%") && !line.includes("4.3236")), "C6 세특 초안도 같은 자릿수로", JSON.stringify(long.extra.recordDraft));
  const { buildFigures } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const chartData = normalizeStudentData({ measurementName: "부피", unit: "mL", conditions: [{ label: "a", values: ["36.0", "35.8", "36.2"] }, { label: "b", values: ["72.1", "71.8", "72.4"] }, { label: "c", values: ["0.05", "0.05", "0.10"] }] });
  const chart = buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "평균", caption: "" }], computeStats(chartData)).find((one) => one.kind === "bar");
  check(chart?.valueLabels?.join("|") === "36.0|72.1|0.07", "C6 그래프 숫자도 학생이 쓴 자릿수로(36.0)", JSON.stringify(chart?.valueLabels));
}

console.log(`\n${passed} checks passed`);
