import crypto from "node:crypto";
import fs from "node:fs/promises";

const root = "C:/Users/user/projects/scshstudy/tools/axis_prediction";
const fullDir = `${root}/outputs/geometry_axis_full_20260831`;
const reviewDir = `${root}/outputs/geometry_independent_review_20260831`;
const comparisonPath = `${reviewDir}/comparison/B_geometry_independent_review_382.comparison.v2.json`;
const keyPath = `${root}/.artifact_build/geometry_independent_review/B_geometry_independent_review_KEY.v1.json`;
const fullInputPath = `${fullDir}/B_geometry_axis_full2265.adjudicated.v1.json`;
const shadowInputPath = `${fullDir}/B_geometry_axis_shadow2340.dry_run.v1.json`;
const sourcePath = "C:/Users/user/OneDrive/바탕 화면/csv.txt";

const finalReviewPath = `${reviewDir}/B_geometry_independent_review_382.final_adjudication.v1.json`;
const fullOutputPath = `${fullDir}/B_geometry_axis_full2265.finalized.v2.json`;
const shadowOutputPath = `${fullDir}/B_geometry_axis_shadow2340.finalized.dry_run.v2.json`;
const validationPath = `${fullDir}/B_geometry_axis_shadow2340.finalized.validation.v2.json`;

const AX = {
  AX05_task_mode: "common.AX05_task_mode",
  AXG01_state_change: "unit.M2_GEOMETRY_PROPERTIES.AXG01_state_change",
  AX03_kind: "common.AX03_kind",
  AX03_math_form: "common.AX03_math_form",
};
const allowed = {
  AX05_task_mode: new Set(["calculation", "classification", "proof_completion"]),
  AXG01_state_change: new Set(["없음", "fold", "rotation", "moving_point", "iterative_construction"]),
  AX03_kind: new Set(["각", "길이", "넓이", "호", "원의 크기", "개수", "참거짓", "식", "자취", "도형명", "조건명", "좌표", "시간", "판정불가"]),
  AX03_math_form: new Set(["수치", "비", "식", "명제", "용어", "판정불가"]),
};

const manual = {
  RV014: { AX03_math_form: ["판정불가", "증명 빈칸에 도형명·합동조건·선분명이 함께 있어 단일 표현 형식으로 고정할 수 없음"] },
  RV040: { AX03_kind: ["조건명", "외심을 구성하는 조건을 고르는 문항"] },
  RV041: { AX03_math_form: ["용어", "평행사변형이 되는 조건명을 고르는 문항"] },
  RV043: { AX03_kind: ["판정불가", "각과 길이를 더한 혼합 차원 목표"] },
  RV044: { AX03_kind: ["길이", "등식의 빈칸에 들어갈 선분명을 고름"], AX03_math_form: ["용어", "정답 표현은 선분명"] },
  RV052: { AX03_math_form: ["용어", "평행사변형 조건명을 보기에서 고름"] },
  RV075: { AX03_kind: ["판정불가", "길이와 각을 뺀 혼합 차원 목표"] },
  RV084: { AX03_kind: ["판정불가", "각과 길이를 더한 혼합 차원 목표"] },
  RV086: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV090: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV108: { AX03_math_form: ["용어", "증명된 평행사변형 성질의 이름을 고름"] },
  RV112: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV115: { AX03_math_form: ["판정불가", "증명 빈칸에 선분 관계와 도형명이 함께 있음"] },
  RV136: { AX03_kind: ["조건명", "같은 거리의 위치를 정하는 구성 조건을 고름"] },
  RV138: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV144: { AX05_task_mode: ["classification", "증명에 사용되지 않은 항목을 분류해 고르는 문항"] },
  RV148: { AX03_math_form: ["용어", "직사각형이 되는 조건명을 고름"] },
  RV163: { AX03_math_form: ["용어", "등식의 빈칸에 들어갈 선분명을 고름"] },
  RV175: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV191: { AX03_kind: ["식", "개수 a,b,c를 결합한 a-b+c의 값을 최종 목표로 함"] },
  RV224: { AX03_kind: ["판정불가", "빈칸에 선분명과 수 계수가 함께 있음"], AX03_math_form: ["판정불가", "용어와 수식 요소가 함께 있는 복합 빈칸"] },
  RV225: { AX03_math_form: ["용어", "등식의 빈칸에 들어갈 선분명을 고름"] },
  RV227: { AX03_kind: ["판정불가", "각과 길이를 더한 혼합 차원 목표"] },
  RV231: { AX03_math_form: ["용어", "평행사변형 조건을 보기에서 고름"] },
  RV235: { AX03_math_form: ["용어", "직사각형 조건을 보기에서 고름"] },
  RV241: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV243: { AX03_kind: ["길이", "빈칸이 모두 선분명을 가리킴"], AX03_math_form: ["용어", "정답 표현은 선분명"] },
  RV268: { AX03_math_form: ["용어", "평행사변형 조건을 보기에서 고름"] },
  RV276: { AX03_kind: ["길이", "길이 등식의 빈칸에 들어갈 변을 고름"] },
  RV324: { AX03_math_form: ["판정불가", "빈칸에 선분 관계와 도형명이 함께 있음"] },
  RV332: { AX03_kind: ["조건명", "원의 중심을 찾는 구성 조건을 고름"] },
  RV349: { AX03_kind: ["조건명", "설명에 사용된 조건 중 제외할 것을 고름"] },
  RV376: { AX03_math_form: ["판정불가", "빈칸에 선분 관계와 도형명이 함께 있음"] },
  RV382: { AX03_math_form: ["판정불가", "빈칸에 선분명과 사각형명이 함께 있음"] },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
function normalizedItemContentV1Hash(row) {
  const normalize = (value) => value === null || value === undefined
    ? null
    : String(value).normalize("NFC").replace(/\r\n?|\n/g, "\n").replace(/\s+/gu, " ").trim();
  const fields = [row?.unit_id, row?.question_text, row?.answer, row?.explanation].map(normalize);
  if (fields[1] === "") return null;
  const chunks = [Buffer.from("normalized_item_content.v1", "utf8"), Buffer.from([0])];
  for (const field of fields) {
    const length = Buffer.alloc(4);
    if (field === null) { length.writeUInt32BE(0xffffffff); chunks.push(length); continue; }
    const bytes = Buffer.from(field, "utf8");
    length.writeUInt32BE(bytes.length); chunks.push(length, bytes);
  }
  return crypto.createHash("sha256").update(Buffer.concat(chunks)).digest("hex");
}
const normalize = (axis, value) => {
  if (value == null) return "";
  const raw = String(value).trim();
  if (raw.startsWith("판정불가")) return "판정불가";
  if (axis === "AXG01_state_change") return raw.split("|").map((token) => token.trim()).filter(Boolean).sort().join("|") || "없음";
  return raw;
};

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function axisValue(axisObject, axis) {
  if (!axisObject || axisObject.state === "unjudgeable") return "판정불가";
  if (axisObject.state !== "assessed") return "";
  if (axis === "AXG01_state_change") return Array.isArray(axisObject.value) && axisObject.value.length ? axisObject.value.slice().sort().join("|") : "없음";
  return normalize(axis, axisObject.value);
}

function sourceTexts(source) {
  return [
    ["question", String(source.question_text ?? "")],
    ["answer", String(source.answer ?? "")],
    ["solution", String(source.explanation ?? "")],
  ];
}

function firstMatch(source, patterns, preferredSources = ["question", "answer", "solution"]) {
  const byName = new Map(sourceTexts(source));
  for (const sourceName of preferredSources) {
    const text = byName.get(sourceName) ?? "";
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[0]) return { source: sourceName, quote: match[0] };
    }
  }
  const fallback = String(source.question_text ?? "").slice(0, 40);
  if (!fallback) throw new Error(`${source.user_item_id}: no evidence text`);
  return { source: "question", quote: fallback };
}

function evidenceFor(source, axis, value) {
  if (axis === "AXG01_state_change" && value === "없음") return [];
  if (value === "판정불가") return [firstMatch(source, [/x\s*\+\s*y/, /y\s*-\s*x/, /\(가\)~\(마\)/, /옳지 않은 것은/, /빈칸/])];
  const patterns = {
    AX05_task_mode: {
      calculation: [/구하시오/, /값을 구/, /몇\s*(?:개|쌍|초)/, /계산/],
      classification: [/옳지 않은/, /옳은 것/, /알맞은/, /이용할 수 있는/, /조건/, /사용되지 않는/, /말할 수 없는/],
      proof_completion: [/증명하는 과정/, /설명하는 과정/, /증명하려고/, /□ 안에 들어갈/, /\(가\)~\(마\)/],
    },
    AX03_kind: {
      "각": [/∠/, /각의 크기/, /°/], "길이": [/길이/, /cm/, /선분/], "넓이": [/넓이/, /cm\^?2/, /㎠/],
      "호": [/호/], "원의 크기": [/반지름/, /지름/], "개수": [/개수/, /몇 쌍/, /a개/],
      "참거짓": [/옳지 않은/, /옳은 것/, /사용되지 않는/, /말할 수 없는/], "식": [/a-b\+c/, /x\s*\+\s*y/, /y\s*-\s*x/, /값을 구/],
      "자취": [/자취/], "도형명": [/도형/, /사각형/, /삼각형/], "조건명": [/조건/, /성질/, /이용할 수 있는/],
      "좌표": [/좌표/], "시간": [/몇 초/, /시간/],
    },
    AX03_math_form: {
      "수치": [/.+/], "비": [/비/], "식": [/a-b\+c/, /x\s*\+\s*y/, /y\s*-\s*x/, /□/],
      "명제": [/옳지 않은/, /옳은 것/, /사용되지 않는/, /말할 수 없는/], "용어": [/조건/, /성질/, /중심/, /선분/, /도형/, /알맞은/],
    },
  };
  const selected = patterns[axis]?.[value] ?? [/.+/];
  const sources = axis === "AX03_math_form" && value === "수치" ? ["answer", "question", "solution"] : ["question", "answer", "solution"];
  return [firstMatch(source, selected, sources)];
}

function makeAxis(source, axis, value, rationale) {
  if (value === "판정불가") {
    return { state: "unjudgeable", reason: rationale || "independent_review_unresolved_target", evidence: evidenceFor(source, axis, value) };
  }
  if (axis === "AXG01_state_change") {
    const values = value === "없음" ? [] : value.split("|").filter(Boolean);
    return { state: "assessed", value: values, certainty: "확실", evidence: evidenceFor(source, axis, value) };
  }
  return { state: "assessed", value, certainty: "확실", evidence: evidenceFor(source, axis, value) };
}

function summarize(records) {
  const summary = {};
  for (const [short, key] of Object.entries(AX)) {
    const values = {};
    let assessed = 0;
    let unjudgeable = 0;
    let empty = 0;
    let multi = 0;
    for (const record of Object.values(records)) {
      const axis = record.candidate_axes[key];
      if (axis.state === "unjudgeable") { unjudgeable += 1; continue; }
      assessed += 1;
      if (Array.isArray(axis.value)) {
        if (axis.value.length === 0) empty += 1;
        if (axis.value.length > 1) multi += 1;
        for (const value of axis.value) values[value] = (values[value] ?? 0) + 1;
      } else values[axis.value] = (values[axis.value] ?? 0) + 1;
    }
    summary[short] = { assessed, unjudgeable, empty, multi, values: Object.fromEntries(Object.entries(values).sort()) };
  }
  return summary;
}

const [comparison, key, fullInput, shadowInput, sourceRows] = await Promise.all([
  fs.readFile(comparisonPath, "utf8").then(JSON.parse),
  fs.readFile(keyPath, "utf8").then(JSON.parse),
  fs.readFile(fullInputPath, "utf8").then(JSON.parse),
  fs.readFile(shadowInputPath, "utf8").then(JSON.parse),
  fs.readFile(sourcePath, "utf8").then(parseTsv),
]);
const sourceById = new Map(sourceRows.map((row) => [row.user_item_id, row]));
const disagreementById = new Map(comparison.disagreement_cases.map((record) => [record.case_id, record]));

const basisCounts = {};
const finalRecords = [];
for (const keyRecord of key.records) {
  const caseId = keyRecord.blind_case_id;
  const disagreement = disagreementById.get(caseId);
  const finalValues = {};
  const axisBasis = {};
  const rationale = {};
  const reviewerValues = {};
  for (const axis of Object.keys(AX)) {
    let gpt;
    let claude;
    let codex;
    if (disagreement) {
      gpt = normalize(axis, disagreement.axes[axis].gpt);
      claude = normalize(axis, disagreement.axes[axis].claude);
      codex = normalize(axis, disagreement.axes[axis].codex);
    } else {
      codex = normalize(axis, keyRecord.codex_values[axis]);
      gpt = codex;
      claude = codex;
    }
    reviewerValues[axis] = { gpt, claude, codex };
    let value;
    let basis;
    if (gpt === claude && claude === codex) { value = gpt; basis = "unanimous_3"; }
    else if (gpt === claude) { value = gpt; basis = "reviewer_consensus"; }
    else if (gpt === codex) { value = gpt; basis = "gpt_plus_codex"; }
    else if (claude === codex) { value = claude; basis = "claude_plus_codex"; }
    else {
      const entry = manual[caseId]?.[axis];
      if (!entry) throw new Error(`manual adjudication missing: ${caseId} ${axis} (${gpt}/${claude}/${codex})`);
      [value, rationale[axis]] = entry;
      basis = "codex_manual_rule";
    }
    const valid = axis === "AXG01_state_change"
      ? value.split("|").every((token) => allowed[axis].has(token))
      : allowed[axis].has(value);
    if (!valid) throw new Error(`invalid final value: ${caseId} ${axis}=${value}`);
    finalValues[axis] = value;
    axisBasis[axis] = basis;
    basisCounts[basis] = (basisCounts[basis] ?? 0) + 1;
  }
  finalRecords.push({
    case_id: caseId,
    user_item_id: keyRecord.user_item_id,
    origin: keyRecord.origin,
    final_values: finalValues,
    axis_basis: axisBasis,
    rationale,
    reviewer_values: reviewerValues,
  });
}

if (finalRecords.length !== 382) throw new Error(`final review count ${finalRecords.length}`);
const full = clone(fullInput);
full.version = "geometry-axis-full2265.finalized.v2";
full.status = "finalized_after_independent_gpt_claude_codex_review";
full.generated_from = [...(Array.isArray(full.generated_from) ? full.generated_from : [full.generated_from].filter(Boolean)), comparisonPath, keyPath];
for (const [id, record] of Object.entries(full.records)) {
  const source = sourceById.get(id);
  if (!source) throw new Error(`content hash source missing: ${id}`);
  record.content_hash = normalizedItemContentV1Hash(source);
  record.content_hash_basis = "normalized_item_content.v1";
}

let changedAxisInstances = 0;
let changedRecords = 0;
for (const finalRecord of finalRecords) {
  const target = full.records[finalRecord.user_item_id];
  const source = sourceById.get(finalRecord.user_item_id);
  if (!target || !source) throw new Error(`source target missing: ${finalRecord.case_id}`);
  let changed = false;
  for (const [short, keyName] of Object.entries(AX)) {
    const before = axisValue(target.candidate_axes[keyName], short);
    const after = finalRecord.final_values[short];
    if (before !== after) {
      target.candidate_axes[keyName] = makeAxis(source, short, after, finalRecord.rationale[short]);
      changed = true;
      changedAxisInstances += 1;
    }
  }
  if (changed) changedRecords += 1;
  target.independent_review = {
    status: "finalized",
    case_id: finalRecord.case_id,
    basis: "gpt_claude_codex_382.v1",
    changed_from_previous: changed,
  };
}
full.summary = {
  ...full.summary,
  independent_review_records: 382,
  independent_review_changed_records: changedRecords,
  independent_review_changed_axis_instances: changedAxisInstances,
  axis_distribution: summarize(full.records),
};
full.review_basis = {
  ...(full.review_basis ?? {}),
  independent_review: {
    gpt_file: "B_geometry_independent_review_382_GPT (1) (1).xlsx",
    claude_file: "B_geometry_independent_review_382_Claude (1).xlsx",
    records: 382,
    alias_links_confirmed: 75,
    basis_counts: basisCounts,
    rule: "3자 중 2자 이상 일치 시 채택; 세 값이 모두 다르면 문항·정답·해설과 확정 규칙으로 Codex 최종 판정",
  },
};

const shadow = clone(shadowInput);
shadow.version = "geometry-axis-shadow2340.finalized.dry_run.v2";
shadow.status = "static_dry_run_finalized_after_independent_review";
for (const [id, record] of Object.entries(shadow.records)) {
  const contentSource = sourceById.get(id);
  if (!contentSource) throw new Error(`shadow content hash source missing: ${id}`);
  record.content_hash = normalizedItemContentV1Hash(contentSource);
  record.content_hash_basis = "normalized_item_content.v1";
  if (record.record_role === "primary") {
    const source = full.records[id];
    if (!source) throw new Error(`shadow primary absent from full: ${id}`);
    record.axes = clone(source.candidate_axes);
    record.profile_eligible = false;
  } else {
    delete record.axes;
    record.profile_eligible = false;
  }
}
shadow.summary = {
  primary_records: Object.values(shadow.records).filter((record) => record.record_role === "primary").length,
  alias_records: Object.values(shadow.records).filter((record) => record.record_role === "alias").length,
  shadow_records: Object.keys(shadow.records).length,
  profile_eligible_true: Object.values(shadow.records).filter((record) => record.profile_eligible === true).length,
  axis_distribution: summarize(full.records),
};

const evidenceFailures = [];
const schemaFailures = [];
const contentHashFailures = [];
for (const [id, record] of Object.entries(full.records)) {
  const source = sourceById.get(id);
  if (!source) { schemaFailures.push(`${id}: source missing`); continue; }
  const textBySource = new Map(sourceTexts(source));
  if (record.content_hash_basis !== "normalized_item_content.v1" || record.content_hash !== normalizedItemContentV1Hash(source)) contentHashFailures.push(id);
  for (const [short, keyName] of Object.entries(AX)) {
    const axis = record.candidate_axes[keyName];
    if (!axis) { schemaFailures.push(`${id}: ${short} missing`); continue; }
    if (axis.state === "unjudgeable") {
      if (!["AX03_kind", "AX03_math_form"].includes(short)) schemaFailures.push(`${id}: ${short} unexpected unjudgeable`);
    } else if (axis.state === "assessed") {
      const values = short === "AXG01_state_change" ? (axis.value.length ? axis.value : ["없음"]) : [axis.value];
      if (values.some((value) => !allowed[short].has(value))) schemaFailures.push(`${id}: ${short} invalid value ${JSON.stringify(axis.value)}`);
    } else schemaFailures.push(`${id}: ${short} invalid state ${axis.state}`);
    for (const evidence of axis.evidence ?? []) {
      const sourceText = textBySource.get(evidence.source) ?? "";
      if (!evidence.quote || !sourceText.includes(evidence.quote)) evidenceFailures.push(`${id}:${short}:${evidence.source}:${evidence.quote}`);
    }
  }
}

const aliasRecords = Object.values(shadow.records).filter((record) => record.record_role === "alias");
const validation = {
  version: "geometry-axis-shadow2340.finalized.validation.v2",
  status: "PASS",
  static_only: true,
  d1_write_performed: false,
  runtime_write_performed: false,
  counts: {
    full_primary_records: Object.keys(full.records).length,
    shadow_records: Object.keys(shadow.records).length,
    aliases: aliasRecords.length,
    independent_review_records: finalRecords.length,
    changed_records: changedRecords,
    changed_axis_instances: changedAxisInstances,
  },
  checks: {
    full_primary_2265: Object.keys(full.records).length === 2265,
    shadow_2340: Object.keys(shadow.records).length === 2340,
    aliases_75: aliasRecords.length === 75,
    review_382: finalRecords.length === 382,
    alias_refs_valid: aliasRecords.every((record) => shadow.records[record.axes_ref_user_item_id]?.record_role === "primary"),
    aliases_have_no_embedded_axes: aliasRecords.every((record) => !record.axes),
    profile_eligible_false: Object.values(shadow.records).every((record) => record.profile_eligible === false),
    schema_failures_zero: schemaFailures.length === 0,
    evidence_failures_zero: evidenceFailures.length === 0,
    normalized_content_hash_failures_zero: contentHashFailures.length === 0,
  },
  failures: { schema: schemaFailures.slice(0, 100), evidence: evidenceFailures.slice(0, 100), content_hash: contentHashFailures.slice(0, 100) },
  basis_counts: basisCounts,
  axis_distribution: summarize(full.records),
};
if (!Object.values(validation.checks).every(Boolean)) validation.status = "FAIL";

const finalReview = {
  version: "geometry-independent-review-382.final-adjudication.v1",
  status: validation.status === "PASS" ? "finalized" : "validation_failed",
  unit_id: "M2_GEOMETRY_PROPERTIES",
  review_counts: {
    records: finalRecords.length,
    aliases_confirmed_same_semantics: 75,
    gpt_claude_all_four_agree: comparison.comparison.reviewer_all_four_agree,
    gpt_claude_disagreement_cases: comparison.comparison.reviewer_all_four_disagree_cases,
    all_three_all_four_agree: comparison.comparison.all_three_all_four_agree,
    changed_records: changedRecords,
    changed_axis_instances: changedAxisInstances,
  },
  basis_counts: basisCounts,
  manual_rule_axis_instances: basisCounts.codex_manual_rule ?? 0,
  manual_rule_definitions: Object.values(manual).reduce((sum, axes) => sum + Object.keys(axes).length, 0),
  prohibited_uses: ["student_profile_output", "diagnostic_remediation", "d1_write_without_separate_gate"],
  records: finalRecords,
};

await Promise.all([
  fs.writeFile(finalReviewPath, `${JSON.stringify(finalReview, null, 2)}\n`),
  fs.writeFile(fullOutputPath, `${JSON.stringify(full, null, 2)}\n`),
  fs.writeFile(shadowOutputPath, `${JSON.stringify(shadow, null, 2)}\n`),
  fs.writeFile(validationPath, `${JSON.stringify(validation, null, 2)}\n`),
]);

console.log(JSON.stringify({
  finalReviewPath,
  fullOutputPath,
  shadowOutputPath,
  validationPath,
  status: validation.status,
  review_counts: finalReview.review_counts,
  basis_counts: basisCounts,
  manual_rule_axis_instances: finalReview.manual_rule_axis_instances,
  manual_rule_definitions: finalReview.manual_rule_definitions,
  checks: validation.checks,
  axis_distribution: validation.axis_distribution,
}, null, 2));
