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

console.log(`\n${passed} checks passed`);
