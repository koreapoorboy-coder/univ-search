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

// C3e 운영 테스트 19의 실제 문장: 본문에 식을 풀어 쓰면 식의 숫자(0.0360)도 쓸 수 있어야 한다. 지어낸 숫자는 여전히 지운다.
{
  const inline = finalizeStageOutput(STAGE.FINAL, {
    sections: [{ title: "5. 결과 분석", body: "5 mL 조건은 0.1×0.0360=0.00360 mol, 질량은 0.00360×60.05=0.216 g, 산도는 0.216/5×100=4.32%가 된다. 흔들림은 8~12방울 규모로 보인다." }],
    calculations: [
      { what: "몰수", constants: [], expression: "0.1 * 0.0360", result: "0.00360", unit: "mol" },
      { what: "질량", constants: [], expression: "0.00360 * 60.05", result: "0.216", unit: "g" },
      { what: "산도", constants: [], expression: "0.216 / 5 * 100", result: "4.32", unit: "%p},{" },
    ], figures: [], recordDraft: [],
  }, { studentData: data, taskDescription: "0.1 M 수산화나트륨으로 적정하여 산도를 구한다", subject: "화학" });
  check(inline.parsed.sections[0].body.startsWith("5 mL 조건은 0.1×0.0360=0.00360 mol") && !inline.parsed.sections[0].body.includes("방울 규모"),
    "C3e 식을 풀어 쓴 문장은 남고, 지어낸 숫자 문장은 지운다", inline.parsed.sections[0].body);
  check(inline.extra.calculations[2].unit === "%p", "C3e 단위에 붙은 형식 조각은 떼어 낸다", inline.extra.calculations[2].unit);
}

// C7 운영 테스트 21(단진자): 10회 진동 시간 평균을 그린 그래프에 「T²와 실 길이의 관계」 제목과 T² 설명이 붙었다.
{
  const { buildFigures, describesPlotted, removeInventedActions } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const pend = normalizeStudentData({ measurementName: "10회 진동 시간", unit: "s", conditions: [
    { label: "실 길이 0.40 m", values: ["12.72", "12.65", "12.70"] }, { label: "실 길이 0.60 m", values: ["15.58", "15.51", "15.60"] }, { label: "실 길이 0.80 m", values: ["17.98", "17.90", "18.01"] }] });
  const line = buildFigures([{ kind: "line", metric: "mean", conditionOrder: [], title: "T²와 실 길이의 관계", caption: "네 조건에서 주기 제곱 T²를 계산해 길이 L에 대한 직선 경향을 확인한 그래프" }], computeStats(pend)).find((one) => one.kind === "line");
  check(line.title === "조건별 10회 진동 시간 평균" && line.caption === "", "C7 그려지지 않은 계산값을 말하는 그래프 제목·설명은 바꾸거나 뺀다", JSON.stringify([line.title, line.caption]));
  const ok = buildFigures([{ kind: "line", metric: "mean", conditionOrder: [], title: "실 길이에 따른 10회 진동 시간", caption: "길이가 길수록 진동 시간이 늘어난다" }], computeStats(pend)).find((one) => one.kind === "line");
  check(ok.title === "실 길이에 따른 10회 진동 시간" && ok.caption.length > 0, "C7 잰 값을 말하는 제목·설명은 그대로 둔다");
  check(!describesPlotted("g 추정값의 변화", "10회 진동 시간") && describesPlotted("각 조건의 평균 비교", "10회 진동 시간"), "C7 계산값은 거르고 평균 비교는 둔다");
  // 느낀 점의 「관련 연구 자료를 찾아보며」 — 학생이 쓰지 않은 행동
  const felt = removeInventedActions("주기를 계산했다. 관련 연구 자료를 찾아보며 제어 문제로 이어질 수 있음을 생각했다. 다음에는 큰각을 재고 싶다.", "반응 시간 때문에 10회를 한꺼번에 재는 이유를 알게 되었다.");
  check(felt.body === "주기를 계산했다. 다음에는 큰각을 재고 싶다.", "C7 느낀 점에서 지어낸 '찾아보며'를 지운다", felt.body);
}

// C8 운영 테스트 24(생명과학 카탈레이스): 꺾은선에 대조군이 이어짐, 다른 과목에 단원을 붙인 문장
{
  const { buildFigures, removeCrossSubjectUnitClaims } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const enzyme = normalizeStudentData({ measurementName: "거품 높이", unit: "mm", conditions: [
    { label: "용액 온도 5 °C", values: ["8", "7", "9"] }, { label: "용액 온도 40 °C", values: ["31", "29", "32"] },
    { label: "용액 온도 60 °C", values: ["9", "8", "10"] }, { label: "끓여 식힌 감자즙 25 °C", values: ["1", "0", "1"] }] });
  const line = buildFigures([{ kind: "line", metric: "mean", conditionOrder: [], title: "온도 조건별 거품 높이 평균", caption: "" }], computeStats(enzyme)).find((one) => one.kind === "line");
  check(line.labels.length === 3 && !line.labels.some((label) => /끓여/.test(label)), "C8 꺾은선에서 대조군을 뺀다(표에는 남는다)", JSON.stringify(line.labels));
  const bar = buildFigures([{ kind: "bar", metric: "mean", conditionOrder: [], title: "온도 조건별 거품 높이 평균", caption: "" }], computeStats(enzyme)).find((one) => one.kind === "bar");
  check(bar.labels.length === 4, "C8 막대그래프는 대조군을 그대로 둔다");
  const claim = removeCrossSubjectUnitClaims("평균이 가장 컸다. 이번 탐구는 고등학교 생명과학과 통합과학의 「물질대사와 에너지」 단원 역량이 깊어지는 출발점이 된다. 화학 반응의 속도도 달라진다.", "생명과학");
  check(claim.body === "평균이 가장 컸다. 화학 반응의 속도도 달라진다.", "C8 다른 과목에 단원을 붙인 문장만 지운다", claim.body);
  check(removeCrossSubjectUnitClaims("수업에서 배운 「물질대사와 에너지」 단원을 적용했다.", "생명과학").body.includes("단원을 적용했다"), "C8 제 과목 단원 문장은 둔다");
}

// C9 운영 테스트 25: 계획 문장의 새 조건 숫자는 남기고, 결과를 지어낸 숫자는 지운다(결론·느낀 점에서만)
{
  const { isPlanSentence, removeUnsupportedNumbers } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(isPlanSentence("35–45 °C를 2–3 °C 간격으로 촘촘히 측정해 정점을 더 정확히 찾겠다."), "C9 '~찾겠다'는 계획이다");
  check(isPlanSentence("다음에는 35–45 °C를 더 촘촘히 나누고 산소 부피를 직접 측정하고 싶다."), "C9 '~하고 싶다'는 계획이다");
  check(!isPlanSentence("50 °C에서는 거품이 7.2 cm로 가장 높았다."), "C9 결과를 말하는 문장은 계획이 아니다");
  check(!isPlanSentence("45 °C에서 8 cm가 나왔으므로 더 재 보겠다."), "C9 결과 말이 섞이면 계획으로 보지 않는다");
  const body = "40 °C에서 가장 컸다. 다른 식초는 5.1%였다. 다음에는 35–45 °C를 2–3 °C 간격으로 재 보겠다.";
  check(removeUnsupportedNumbers(body, new Set(["40"]), { allowPlans: true }).body === "40 °C에서 가장 컸다. 다음에는 35–45 °C를 2–3 °C 간격으로 재 보겠다.", "C9 결론에서는 계획 문장이 남는다");
  check(removeUnsupportedNumbers(body, new Set(["40"])).body === "40 °C에서 가장 컸다.", "C9 결과 절에서는 지금처럼 지운다");
}

// C10 운영 테스트 27(확률과 통계 설문): 도수분포표로 평균·표준편차, 제목의 학교 이름
{
  const { stripSchoolName, stagePromptLines: lines, COLLECTION: K } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(evaluateExpression("√((5.5-6.6)^2*4 + (6.5-6.6)^2*10) ") !== null && Math.abs(evaluateExpression("sqrt(9)") - 3) < 1e-9 && evaluateExpression("3²") === 9, "C10 제곱근과 제곱을 계산한다");
  const survey = normalizeStudentData({ measurementName: "응답 수", unit: "명", conditions: [
    { label: "수면 5~6시간", values: ["4"] }, { label: "수면 6~7시간", values: ["10"] }, { label: "수면 7~8시간", values: ["6"] }] });
  const sAllowed = allowedNumberSet(survey, computeStats(survey));
  check(sAllowed.has("5.5") && sAllowed.has("6.5") && sAllowed.has("7.5"), "C10 계급값(구간 가운데 값)은 아는 숫자다");
  const mean = verifyCalculations([
    { what: "평균", constants: [], expression: "(5.5*4 + 6.5*10 + 7.5*6) / 20", result: "6.6", unit: "시간" },
    { what: "표준편차", constants: [], expression: "√(((5.5-6.6)^2*4 + (6.5-6.6)^2*10 + (7.5-6.6)^2*6) / 20)", result: "0.70", unit: "시간" },
  ], sAllowed);
  check(mean.verified.length === 2, "C10 도수분포표의 평균과 표준편차를 검산한다", JSON.stringify(mean.rejected));
  check(stripSchoolName("테스트고2 스마트폰 사용별 수면 분포·표준편차 해석", "테스트고등학교") === "스마트폰 사용별 수면 분포·표준편차 해석", "C10 제목에서 학교 이름과 학년을 뺀다");
  check(stripSchoolName("실 길이에 따른 단진자 주기 측정", "테스트고등학교") === "실 길이에 따른 단진자 주기 측정", "C10 학교 이름이 없으면 그대로");
  const task = "우리 학년 학생들을 대상으로 스마트폰 사용 시간과 수면 시간을 설문 조사하고 평균과 표준편차를 구한다.";
  check(lines(STAGE.DRAFT, { collectionKind: K.SURVEY, taskDescription: task }).some((line) => /도수분포표/.test(line) && /닫힌 계급/.test(line)), "C10 평균·표준편차 과제의 설계서는 닫힌 계급의 도수분포표");
  check(!lines(STAGE.DRAFT, { collectionKind: K.MEASUREMENT, taskDescription: task }).some((line) => /닫힌 계급/.test(line)), "C10 측정 실험에는 붙지 않는다");
  check(lines(STAGE.FINAL, { collectionKind: K.SURVEY, taskDescription: task, studentData: survey }).some((line) => /계급값/.test(line) && /표준편차/.test(line)), "C10 최종 보고서는 계급값으로 평균·표준편차를 구한다");
  const out = finalizeStageOutput(STAGE.FINAL, { reportTitle: "테스트고2 스마트폰 사용별 수면 분포", sections: [], calculations: [], figures: [], recordDraft: [] }, { studentData: survey, schoolName: "테스트고등학교", taskDescription: task });
  check(out.parsed.reportTitle === "스마트폰 사용별 수면 분포", "C10 최종 제목에서 학교 이름이 빠진다", out.parsed.reportTitle);
}

// C11 운영 테스트 28: 도수분포표의 집단별 평균·표준편차는 코드가 구한다(AI가 6.59를 6.49로, 표준편차 자리에 분산을 적었다)
{
  const { stagePromptLines: lines, summaryForPrompt, COLLECTION: K } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const freq = normalizeStudentData({ measurementName: "응답 수", unit: "명", conditions: [
    { label: "스마트폰 0~3시간 · 수면 5~6시간", values: ["2"] }, { label: "스마트폰 0~3시간 · 수면 6~7시간", values: ["8"] },
    { label: "스마트폰 0~3시간 · 수면 7~8시간", values: ["12"] }, { label: "스마트폰 0~3시간 · 수면 8~9시간", values: ["6"] },
    { label: "스마트폰 3~6시간 · 수면 5~6시간", values: ["9"] }, { label: "스마트폰 3~6시간 · 수면 6~7시간", values: ["13"] },
    { label: "스마트폰 3~6시간 · 수면 7~8시간", values: ["8"] }, { label: "스마트폰 3~6시간 · 수면 8~9시간", values: ["2"] }] });
  const fs = computeStats(freq).frequency;
  check(fs.length === 2 && fs[0].group === "스마트폰 0~3시간" && fs[0].n === 28 && fs[0].mean === 7.29 && fs[0].sd === 0.86 && fs[1].mean === 6.59 && fs[1].sd === 0.88,
    "C11 집단별 평균·표준편차를 계급값으로 구한다", JSON.stringify(fs));
  check(JSON.stringify(summaryForPrompt(computeStats(freq))).includes("표준편차(계급값)"), "C11 AI에게 도수분포요약을 넘긴다");
  const fAllowed = allowedNumberSet(freq, computeStats(freq));
  check(fAllowed.has("7.29") && fAllowed.has("6.59") && fAllowed.has("0.88"), "C11 코드가 구한 값은 본문에 쓸 수 있다");
  const task = "스마트폰 사용 시간과 수면 시간을 설문 조사하고 평균과 표준편차를 구한다.";
  check(lines(STAGE.FINAL, { collectionKind: K.SURVEY, taskDescription: task, studentData: freq }).some((line) => /그대로 쓰고 다시 계산하지 않는다/.test(line)), "C11 AI는 그 값을 그대로 쓴다");
  check(computeStats(normalizeStudentData({ measurementName: "거품 높이", unit: "mm", conditions: [{ label: "10 °C", values: ["8", "7", "9"] }, { label: "40 °C", values: ["31", "29", "32"] }] })).frequency.length === 0, "C11 측정 실험에는 붙지 않는다");
}

// C12 운영 테스트 29(통합사회 인구 통계): 천 단위 쉼표, 집단별 기준, 비율 과제
{
  const { numbersIn, removeUnsupportedNumbers, stagePromptLines: lines, summaryForPrompt, COLLECTION: K } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(numbersIn("38,500명에서 57,600명으로, 0.72 M, 1,234.5").join("|") === "38500|57600|0.72|1234.5", "C12 천 단위 쉼표는 한 숫자다");
  check(removeUnsupportedNumbers("우리 지역은 2014년 38,500명에서 2023년 57,600명으로 늘었다.", new Set(["2014", "2023", "38500", "57600"])).removed === 0, "C12 쉼표 숫자 문장을 지우지 않는다");
  const pop = normalizeStudentData({ measurementName: "65세 이상 인구 수", unit: "명", conditions: [["우리 지역 2014년", "38500"], ["우리 지역 2023년", "57600"], ["비교 지역 2014년", "21300"], ["비교 지역 2023년", "27900"]].map(([label, value]) => ({ label, values: [value] })) });
  const rows = summaryForPrompt(computeStats(pop)).조건별결과;
  check(rows[3].집단 === "비교 지역" && rows[3].같은집단첫조건과의차이 === 6600 && rows[3].같은집단첫조건대비변화율 === 31, "C12 집단마다 자기 첫 조건과 견준다", JSON.stringify(rows[3]));
  check(allowedNumberSet(pop, computeStats(pop)).has("6600"), "C12 집단 기준 차이는 본문에 쓸 수 있다");
  const task = "통계청 자료를 활용하여 우리 지역의 최근 10년간 고령 인구 비율 변화를 조사하고 다른 지역과 비교한다.";
  const draftLines = lines(STAGE.DRAFT, { collectionKind: K.DATASET, taskDescription: task }).join("\n");
  check(/비율 자체/.test(draftLines) && /"우리 지역 · 2014년"/.test(draftLines), "C12 비율 과제의 설계서는 비율을 받고, 두 기준 조건은 가운뎃점으로 나눈다");
  check(stageSchemaProperties(STAGE.FINAL, { taskDescription: task }).calculations.minItems === 1, "C12 비율 과제는 계산 칸을 비울 수 없다");
  check(lines(STAGE.FINAL, { collectionKind: K.DATASET, taskDescription: task, studentData: pop }).some((line) => /같은집단첫조건과의차이/.test(line)), "C12 최종 보고서는 집단별 기준으로 견준다");
}

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

// C13 운영 테스트 31(통합사회 고령화): 본문에 우리 표의 항목 이름이 그대로 나왔고, 없는 과목 이름을 지어냈다.
{
  const { scrubInternalNames, removeUnknownSubjectNames } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const leak = scrubInternalNames("수준별 비교 지표로 본 같은 연도 격차는 2010년 3.3%p였다.");
  check(leak === "같은 기준끼리 견준 비교로 본 같은 연도 격차는 2010년 3.3%p였다.", "C13 「수준별 비교 지표」는 본문에 나오지 않는다", leak);
  check(scrubInternalNames("수준별비교에서도 반복이 없어 알 수 없음으로 처리했다.").startsWith("같은 기준끼리 견준 비교에서도"), "C13 붙여 쓴 항목 이름도 풀어 쓴다");
  // 운영 검사 2026-09-22(화학 중화 적정): 본문에 「0.1몰 매리터 수산화나트륨 표준용액」이 두 번 나왔다.
  // 단위 이름을 소리 나는 대로 옮겨 적은 말로, 교과서에도 없고 학생이 그대로 내기에는 이상하다.
  check(scrubInternalNames("0.1몰 매리터 수산화나트륨 표준용액을 썼다.") === "0.1 mol/L 수산화나트륨 표준용액을 썼다.",
    "C13 단위를 소리 나는 대로 적은 말은 기호로 바꿄다", scrubInternalNames("0.1몰 매리터 수산화나트륨 표준용액을 썼다."));
  // 운영 검사 2026-09-22(공통수학2 일사량): 표 머리글이 「일사량 (와트 매 제곱미터)」로 나왔다.
  // 나눗셈을 말로 쓴 단위는 교과서처럼 기호로 적는다.
  {
    const { symbolUnit } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
    check(symbolUnit("와트 매 제곱미터") === "W/m²", "C13 나눗셈 단위는 기호로 적는다", symbolUnit("와트 매 제곱미터"));
    check(symbolUnit("미터 매 초") === "m/s", "C13 m/s 도 마찬가지다", symbolUnit("미터 매 초"));
    check(symbolUnit("초") === "초" && symbolUnit("명") === "명", "C13 혹로 쓰는 초·명은 그대로 둔다");
    // 운영 검사 2026-09-22(지구시스템과학 기온): 표 머리글이 「(도 섭씨)」로 나왔다.
    check(symbolUnit("도 섭씨") === "°C", "C13 「도 섭씨」도 기호로 적는다", symbolUnit("도 섭씨"));
    check(scrubInternalNames("일사량은 와트 매 제곱미터 단위다.") === "일사량은 W/m² 단위다.", "C13 본문에서도 바꾸어 쓴다");
  }
  const keys = scrubInternalNames("조건별결과의 관찰메모와 첫조건과의차이, 같은집단첫조건대비변화율, 도수분포요약, 평균이높은순서를 보았다.");
  check(!/조건별결과|관찰메모|첫조건과의차이|같은집단첫조건대비변화율|도수분포요약|평균이높은순서/.test(keys) && keys.includes("조건별 결과") && keys.includes("같은 집단 첫 조건 대비 변화율"), "C13 한글 항목 이름은 모두 띄어 쓴 말로 바뀐다", keys);
  const madeUp = removeUnknownSubjectNames("이번 탐구는 통합사회 과목의 자료 해석이다.\n나아가 복지정책 과목에서 서비스 입지를 따지는 문제로 이어진다.");
  check(madeUp.removed === 1 && !madeUp.body.includes("복지정책") && madeUp.body.includes("통합사회 과목"), "C13 없는 과목 이름을 쓴 문장만 지운다", JSON.stringify(madeUp.body));
  const realOnes = removeUnknownSubjectNames("확률과 통계 과목의 표본 개념과 정보 과목의 데이터 처리, 화학 반응의 세계 과목까지 이어진다.\n이 과목에서 배운 개념과 사회 교과의 관점을 함께 썼다.\n교과서의 단원과 다른 과목의 개념도 보았다.");
  check(realOnes.removed === 0, "C13 실제 과목·교과군·「이 과목」은 그대로 둔다", JSON.stringify(realOnes.dropped));
  const roman = removeUnknownSubjectNames("물리학Ⅰ 과목과 영어 과목에서도 같은 방법을 쓴다.");
  check(roman.removed === 0, "C13 물리학Ⅰ처럼 숫자가 붙은 과목 이름도 실제 이름으로 본다", JSON.stringify(roman.dropped));
}

// C14 운영 테스트 32: 집단이 하나면 그래프 x축이 「우리 지역2000년」처럼 같은 말을 되풀이했다.
{
  const { buildFigures, trimSharedPrefix } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const cut = trimSharedPrefix(["우리 지역 · 2000년", "우리 지역 · 2012년", "우리 지역 · 2023년"]);
  check(cut.labels.join("|") === "2000년|2012년|2023년" && cut.shared === "우리 지역", "C14 모두 같은 앞부분은 축 이름에서 뺀다", JSON.stringify(cut));
  check(trimSharedPrefix(["우리 지역 · 2000년", "전국 · 2000년"]).shared === "", "C14 집단이 둘이면 그대로 둔다");
  check(trimSharedPrefix(["5 °C", "25 °C", "45 °C"]).shared === "", "C14 가운뎃점이 없는 조건은 그대로 둔다");
  const years = ["2000년", "2012년", "2016년", "2023년"];
  const oneGroup = normalizeStudentData({ measurementName: "고령 인구 비율", unit: "%", conditions: years.map((year, index) => ({ label: `우리 지역 · ${year}`, values: [String(9.8 + index * 4)] })) });
  const drawn = buildFigures([{ kind: "line", metric: "mean", conditionOrder: [], title: "연도별 추세", caption: "" }], computeStats(oneGroup));
  const chart = drawn.find((one) => one.kind === "line");
  check(chart.labels.join("|") === years.join("|"), "C14 꺾은선 x축은 연도만 남는다", JSON.stringify(chart.labels));
  check(chart.title.startsWith("우리 지역"), "C14 뗀 집단 이름은 그림 제목에 한 번 남는다", chart.title);
  const table = drawn.find((one) => one.kind === "table");
  check(table.rows[0][0] === "우리 지역 · 2000년", "C14 표의 조건 이름은 그대로 둔다", JSON.stringify(table.rows[0]));
}

// C15 운영 테스트 35(지구과학 진앙 거리): 116.8 km를 「117 km」로 적고, 그 117로 범위를 구해 65.6이 아닌 65.8이 되었다.
{
  const { tidyCalculatedNumbers } = await import("../../../admission_worker_skeleton/calc_check_v1.mjs");
  const one = verifyCalculations([{ what: "진앙 거리", constants: [], expression: "8 × 14.6", result: "117", unit: "km" }], new Set(["8", "14.6"]));
  check(one.verified.length === 1 && one.verified[0].result === "116.8" && one.verified[0].wrote === "117", "C15 소수를 버린 답은 지우지 않고 제 값으로 고친다", JSON.stringify(one.verified[0]));
  const fixed = tidyCalculatedNumbers("서남부 관측소는 117 km였다. 117명이 참여했다.", one.verified);
  check(fixed === "서남부 관측소는 116.8 km였다. 117명이 참여했다.", "C15 본문의 값도 단위가 붙은 자리만 고친다", fixed);
  const kept = verifyCalculations([{ what: "진앙 거리", constants: [], expression: "8 × 14.6", result: "116.8", unit: "km" }], new Set(["8", "14.6"]));
  check(kept.verified.length === 1, "C15 자릿수를 지킨 답은 그대로 통과한다", JSON.stringify(kept.rejected));
  const chained = verifyCalculations([
    { what: "진앙 거리", constants: [], expression: "8 × 14.6", result: "116.8", unit: "km" },
    { what: "범위", constants: [], expression: "117 - 51.2", result: "65.8", unit: "km" },
  ], new Set(["8", "14.6", "51.2"]));
  check(chained.verified.length === 1 && /출처 없는 숫자/.test(chained.rejected[0].why), "C15 반올림한 값(117)은 다음 식에 못 쓴다", JSON.stringify(chained.rejected[0]));
  const right = verifyCalculations([
    { what: "진앙 거리", constants: [], expression: "8 × 14.6", result: "116.8", unit: "km" },
    { what: "범위", constants: [], expression: "116.8 - 51.2", result: "65.6", unit: "km" },
  ], new Set(["8", "14.6", "51.2"]));
  check(right.verified.length === 2, "C15 정확한 값으로 이은 계산은 둘 다 통과한다", JSON.stringify(right.rejected));
  check(right.allowed.has("117"), "C15 본문에서 「약 117 km」라고 어림해 말하는 것은 그대로 둔다");
  const round = verifyCalculations([{ what: "학생 수", constants: [], expression: "120 ÷ 4", result: "30", unit: "명" }], new Set(["120", "4"]));
  check(round.verified.length === 1, "C15 답이 정말 정수면 정수로 적는다", JSON.stringify(round.rejected));
}

// C16 운영 테스트 36: 표 머리글이 「도달 시각 초 (초)」로 나왔다 — 값 이름에 단위가 또 들어갔다.
{
  const { dropUnitFromName } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(dropUnitFromName("도달 시각 초", "초") === "도달 시각", "C16 이름 끝의 단위는 뗀다", dropUnitFromName("도달 시각 초", "초"));
  check(dropUnitFromName("부피 (mL)", "mL") === "부피", "C16 괄호로 붙인 단위도 뗀다", dropUnitFromName("부피 (mL)", "mL"));
  check(dropUnitFromName("초", "초") === "초", "C16 이름이 단위뿐이면 그대로 둔다");
  check(dropUnitFromName("고령 인구 비율", "%") === "고령 인구 비율", "C16 단위가 없는 이름은 건드리지 않는다");
  check(dropUnitFromName("S-P 시간", "초") === "S-P 시간", "C16 이름 안에 단위가 없으면 그대로");
  const draft = finalizeStageOutput(STAGE.DRAFT, { sections: [], dataTemplate: { measurementName: "도달 시각 초", unit: "초", scaleGuide: "", trials: 3,
    conditions: ["서울 관측소", "대전 관측소"], referenceInputs: [] } }, { collectionKind: "measurement" });
  check(draft.extra.dataTemplate.measurementName === "도달 시각", "C16 설계서 단계에서 이름을 손본다", draft.extra.dataTemplate.measurementName);
  const late = normalizeStudentData({ measurementName: "도달 시각 초", unit: "초", conditions: [{ label: "서울", values: ["6.0"] }] });
  check(late.measurementName === "도달 시각", "C16 설계서에 이미 저장된 이름도 최종 단계에서 손본다", late.measurementName);
  const { buildFigures: figs } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const table = figs([], computeStats(late)).find((one) => one.kind === "table");
  check(table.columns[1] === "도달 시각 (초)", "C16 표 머리글에 단위가 한 번만 나온다", JSON.stringify(table.columns));
}

// C17 운영 테스트 38(물리 빗면): 학생은 시간만 적었는데 방법 절에 「스마트폰 카메라를 고정해 프레임률을 고정했다」가 들어갔다.
{
  const { removeUnnamedTools } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const made = removeUnnamedTools("레일 1.0 m 구간을 표시했다. 스마트폰 카메라를 고정해 프레임률을 고정했다. 조건마다 5회씩 쟀다.", "빨라서 멈추는 순간을 잡기 어려웠다");
  check(made.removed === 1 && !made.body.includes("스마트폰") && made.body.includes("5회씩 쟀다"), "C17 학생이 말한 적 없는 기구 문장만 지운다", made.body);
  const asked = removeUnnamedTools("스마트폰으로 촬영해 도달 시각을 읽었다.", "안내문: 스마트폰으로 촬영해 시간을 읽는다");
  check(asked.removed === 0, "C17 안내문이 그 기구를 쓰라고 했으면 그대로 둔다", asked.body);
  const said = removeUnnamedTools("영상을 다시 보며 시간을 확인했다.", "영상으로 다시 보니 출발이 늦었다");
  check(said.removed === 0, "C17 학생이 스스로 적은 기구도 그대로 둔다");
  const plain = removeUnnamedTools("초시계로 같은 기준에서 시간을 쟀다. 조건마다 5회 반복했다.", "");
  check(plain.removed === 0, "C17 기구를 못 박지 않은 방법 문장은 건드리지 않는다", plain.body);
}

// C18 루프 2: 대수의 「지수와 로그」·기하의 「삼각함수」 과제는 log·sin 없이는 계산을 한 줄도 검산할 수 없었다.
{
  const near = (value, want) => Math.abs(value - want) < 1e-6;
  check(near(evaluateExpression("log(100)"), 2) && near(evaluateExpression("log(8) ÷ log(2)"), 3), "C18 상용로그를 읽는다");
  check(near(evaluateExpression("ln(1)"), 0), "C18 자연로그를 읽는다");
  check(near(evaluateExpression("sin(30)"), 0.5) && near(evaluateExpression("sin(30°)"), 0.5), "C18 삼각함수의 각은 도로 읽고, °를 붙여도 같다");
  check(near(evaluateExpression("1.5 ÷ sin(30)"), 3), "C18 식 안에서 함께 쓴다");
  check(evaluateExpression("log(0)") === null && evaluateExpression("ln(0)") === null, "C18 정의되지 않는 로그는 계산하지 않는다");
  check(evaluateExpression("log 100") === null && evaluateExpression("abc(2)") === null && evaluateExpression("0.1 × 36 mL") === null, "C18 괄호 없는 함수와 낯선 글자는 여전히 막는다");
  check(near(evaluateExpression("0.1 × 36 ÷ 5"), 0.72) && near(evaluateExpression("√(16)"), 4), "C18 예전 식도 그대로 계산한다");
  const logRun = verifyCalculations([{ what: "감소율", constants: [], expression: "log(63.0 ÷ 75.0) ÷ log(2)", result: "-0.252", unit: "" }], new Set(["63", "75", "2"]));
  check(logRun.verified.length === 1, "C18 로그가 든 계산도 검산을 통과한다", JSON.stringify(logRun.rejected));
}

// C19 루프 7(확률과 통계): 계급 이름이 「4시간 이상 6시간 미만」이면 도수분포표로 못 알아봐
// 평균·표준편차를 엔진이 구해 주지 못했고, 과제가 구하라던 표준편차가 보고서에서 빠졌다.
{
  const make = (labels) => computeStats(normalizeStudentData({ measurementName: "인원수", unit: "명",
    conditions: labels.map((label, index) => ({ label, values: [[4, 9, 11, 6][index]] })) }));
  const words = make(["4시간 이상 6시간 미만", "6시간 이상 8시간 미만", "8시간 이상 10시간 미만", "10시간 이상 12시간 미만"]).frequency;
  check(words.length === 1 && words[0].mean === 8.27 && words[0].sd === 1.9, "C19 말로 적은 계급도 도수분포표로 읽는다", JSON.stringify(words));
  const mixed = make(["4시간 이상 6시간 미만", "6~8시간", "8~10시간", "10~12시간"]).frequency;
  check(mixed.length === 1 && mixed[0].mean === 8.27, "C19 물결표와 말이 섞여 있어도 읽는다", JSON.stringify(mixed));
  const marks = make(["4~6시간", "6~8시간", "8~10시간", "10~12시간"]).frequency;
  check(marks.length === 1 && marks[0].sd === 1.9, "C19 예전 물결표 계급도 그대로", JSON.stringify(marks));
  const notClasses = make(["남학생", "여학생", "기타", "무응답"]).frequency;
  check(notClasses.length === 0, "C19 계급이 아닌 조건은 도수분포로 보지 않는다", JSON.stringify(notClasses));
}

// C20 루프 8(공통수학2 집합): 사람 수에 소수점이 붙어 「15.0 + 17.0 − 8.00 = 24.0명」, 「0.000명」이 나왔다.
{
  const { tidyCalculatedNumbers: tidyCounts } = await import("../../../admission_worker_skeleton/calc_check_v1.mjs");
  const fixed = tidyCounts("왼쪽은 15.0 + 17.0 − 8.00 = 24.0명이고 차이는 0.000명이다. 평균 4.25점과 3.5명은 그대로.",
    [{ expression: "15.0 + 17.0 - 8.00", result: "24", unit: "명" }]);
  check(fixed === "왼쪽은 15 + 17 − 8 = 24명이고 차이는 0명이다. 평균 4.25점과 3.5명은 그대로.", "C20 세는 값의 소수점 0은 지우고, 뜻이 있는 소수는 남긴다", fixed);
  const other = tidyCounts("길이는 12.0 cm였다.", [{ expression: "12.0", result: "12", unit: "cm" }]);
  check(other === "길이는 12.0 cm였다.", "C20 세는 단위가 아니면 건드리지 않는다", other);
}

// C21 루프 4·9: 그래프 축이 「(센티미터)」, 기준값 단위가 「뉴턴」·「볼트」로 나왔다 — 교과서는 기호로 적는다.
{
  const { symbolUnit } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(symbolUnit("센티미터") === "cm" && symbolUnit("뉴턴") === "N" && symbolUnit("볼트") === "V" && symbolUnit("퍼센트") === "%", "C21 한글 단위 이름은 기호로 바꾼다");
  check(symbolUnit("센티미터(cm)") === "cm", "C21 둘 다 적었으면 기호만 남긴다");
  check(symbolUnit("초") === "초" && symbolUnit("도") === "도" && symbolUnit("명") === "명", "C21 초·도·명은 한글이 교과서 표기라 그대로 둔다");
  check(symbolUnit("cm") === "cm" && symbolUnit("") === "", "C21 이미 기호면 그대로");
  const data = normalizeStudentData({ measurementName: "늘어난 길이", unit: "센티미터",
    conditions: [{ label: "힘 0.50 N", values: ["2.0"] }], references: [{ label: "추 한 개의 무게", unit: "뉴턴", value: "0.50" }] });
  check(data.unit === "cm" && data.references[0].unit === "N", "C21 학생 자료의 단위와 기준값 단위 모두 기호로", JSON.stringify([data.unit, data.references[0].unit]));
  const draft = finalizeStageOutput(STAGE.DRAFT, { sections: [], dataTemplate: { measurementName: "늘어난 길이", unit: "센티미터", scaleGuide: "", trials: 3,
    conditions: ["힘 0.50 N", "힘 1.00 N"], referenceInputs: [{ label: "추 한 개의 무게", unit: "뉴턴" }] } }, { collectionKind: "measurement" });
  check(draft.extra.dataTemplate.unit === "cm" && draft.extra.dataTemplate.referenceInputs[0].unit === "N", "C21 설계서 단계에서 바꿔 화면에도 기호로 나간다", JSON.stringify(draft.extra.dataTemplate.unit));
}

// C22 루프 10(화학 반응의 세계): 수득률 91.603%를 「91.7%」로 적었는데 허용 오차 안이라 통과했다 — 계산값으로 바로잡는다.
{
  const { tidyCalculatedNumbers: tidyFix } = await import("../../../admission_worker_skeleton/calc_check_v1.mjs");
  const run = verifyCalculations([
    { what: "수득률", constants: [], expression: "0.24 ÷ 0.262 × 100", result: "91.7", unit: "%" },
    { what: "이론값", constants: [], expression: "0.50 × 44 ÷ 84", result: "0.262", unit: "g" },
    { what: "딱 맞는 답", constants: [], expression: "2 × 3", result: "6", unit: "개" },
  ], new Set(["0.24", "0.262", "100", "0.5", "44", "84", "2", "3"]));
  check(run.verified.length === 3 && run.verified[0].result === "91.6" && run.verified[0].wrote === "91.7", "C22 조금 어긋난 답은 계산값으로 바로잡는다", JSON.stringify(run.verified[0]));
  check(!run.verified[1].wrote && !run.verified[2].wrote, "C22 맞게 적은 답은 그대로 둔다", JSON.stringify([run.verified[1], run.verified[2]]));
  const body = tidyFix("수득률은 0.24 ÷ 0.262 × 100 = 91.7%였다.", run.verified);
  check(body === "수득률은 0.24 ÷ 0.262 × 100 = 91.6%였다.", "C22 본문의 값도 함께 바로잡는다", body);
  const wrong = verifyCalculations([{ what: "틀린 답", constants: [], expression: "2 × 3", result: "9", unit: "개" }], new Set(["2", "3"]));
  check(wrong.rejected[0]?.why === "답이 식과 다름", "C22 정말 틀린 답은 여전히 떨어진다", JSON.stringify(wrong.rejected));
}

// C23 루프 2·17: 문장이 지워진 자리에 「이 일관성은 …」처럼 가리킬 말이 없는 문장이 홀로 남았다.
{
  const { removeUnsupportedNumbers } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const ok = new Set(["2", "32", "22", "20", "68.8", "62.5"]);
  const out = removeUnsupportedNumbers("가설 2는 예측과 비슷할 것이었다. 예측값은 13.75명이었다. 이 일관성은 두 형질이 얽혀 있지 않다는 해석을 지지한다. 표본은 32명이었다.", ok);
  check(out.removed === 2 && !out.body.includes("이 일관성은") && out.body.includes("표본은 32명"), "C23 지운 문장을 가리키던 다음 문장도 함께 지운다", out.body);
  const keep = removeUnsupportedNumbers("이 결과는 표본이 32명이라 생긴 것이다. 비율은 62.5%였다.", ok);
  check(keep.removed === 0, "C23 앞 문장이 남아 있으면 그대로 둔다", keep.body);
}

// C24 남은 흠 세 가지: 지시어가 아닌 앞말 없는 문장, 정수에 붙은 .0, 제목의 준비물 종류.
{
  const { removeUnsupportedNumbers, generalizeThings, finalizeStageOutput: finish } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const { tidyCalculatedNumbers: tidyZero } = await import("../../../admission_worker_skeleton/calc_check_v1.mjs");
  const ok = new Set(["2", "120", "48"]);
  const cut = removeUnsupportedNumbers("가설 2를 보았다. 예측값은 13.75명이었다. 반면 표본은 120명이었다.", ok);
  check(cut.removed === 2 && !cut.body.includes("반면"), "C24 「반면 …」처럼 앞말에 매달린 문장도 지운다", cut.body);
  const keep = removeUnsupportedNumbers("표본은 120명이었다. 반면 다른 반은 48명이었다.", ok);
  check(keep.removed === 0, "C24 앞 문장이 남아 있으면 그대로 둔다", keep.body);
  const zero = tidyZero("열량은 12540.0 J였고 물 온도는 50.0 °C였다.", [{ expression: "4.18 × 100 × 30", result: "12540", unit: "J" }]);
  check(zero === "열량은 12540 J였고 물 온도는 50.0 °C였다.", "C24 큰 정수 답의 .0은 지우고 측정값의 .0은 남긴다", zero);
  const small = tidyZero("길이는 12.0 cm였다.", [{ expression: "6 × 2", result: "12", unit: "cm" }]);
  check(small === "길이는 12.0 cm였다.", "C24 작은 값의 .0은 학생이 잰 자릿수라 그대로 둔다", small);
  check(generalizeThings("경사로 테니스공과 머그컵 물", "") === "경사로 공과 컵 물", "C24 학생이 안 적은 준비물 종류는 흔한 말로");
  check(generalizeThings("테니스공을 굴렸다", "테니스공으로 했다") === "테니스공을 굴렸다", "C24 학생이 적었으면 그대로 둔다");
  const titled = finish(STAGE.FINAL, { sections: [{ title: "6. 결론", body: "테니스공이 굴러갔다." }], calculations: [], figures: [], recordDraft: [] },
    { studentData: normalizeStudentData({ measurementName: "거리", unit: "m", conditions: [{ label: "1초", values: ["0.25"] }] }), subject: "물리", taskDescription: "공을 굴려 거리를 잰다" });
  check(!titled.parsed.sections[0].body.includes("테니스공"), "C24 본문의 준비물 종류도 흔한 말로 바뀐다", titled.parsed.sections[0].body);
}

// C25 기준값의 용도(계산/비교) — 루프 5의 「눈높이 대비 오차율 800%」를 화면·스키마 차원에서 막는다.
{
  const { referenceUse, calculationTaskLines } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(referenceUse("", "눈높이") === "계산" && referenceUse("", "물의 비열") === "계산", "C25 식에 넣는 값은 계산용으로 본다");
  check(referenceUse("", "식초 병에 표시된 산도") === "비교" && referenceUse("", "이론값") === "비교", "C25 표시값·이론값은 견줄 값으로 본다");
  check(referenceUse("비교", "눈높이") === "비교", "C25 화면이 정해 준 용도가 먼저다");
  const draft = finalizeStageOutput(STAGE.DRAFT, { sections: [], dataTemplate: { measurementName: "고도각", unit: "도", scaleGuide: "", trials: 3,
    conditions: ["10 m", "15 m"], referenceInputs: [{ label: "눈높이", unit: "m", use: "계산" }, { label: "표시된 산도", unit: "%", use: "비교" }] } }, { collectionKind: "measurement" });
  check(draft.extra.dataTemplate.referenceInputs.map((one) => one.use).join("|") === "계산|비교", "C25 설계서 칸이 용도를 달고 화면으로 간다", JSON.stringify(draft.extra.dataTemplate.referenceInputs));
  const data = normalizeStudentData({ measurementName: "고도각", unit: "도", conditions: [{ label: "10 m", values: ["50.2"] }],
    references: [{ label: "눈높이", unit: "m", value: "1.50", use: "계산" }] });
  const lines = calculationTaskLines({ taskDescription: "tan으로 높이를 구한다" }, data).join(" ");
  check(lines.includes("[계산]") && lines.includes("오차율은 구하지 않는다"), "C25 계산용 기준값은 오차율을 구하지 않게 일러 준다", lines.slice(0, 120));
}

console.log(`\n${passed} checks passed`);
