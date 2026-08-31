import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const project = "C:/Users/user/projects/scshstudy";
const toolsRoot = path.join(project, "tools", "axis_prediction");
const sourcePath = path.join(toolsRoot, "outputs", "geometry_axis_full_20260831", "B_geometry_axis_shadow2340.finalized.dry_run.v2.json");
const validationPath = path.join(toolsRoot, "outputs", "geometry_axis_full_20260831", "B_geometry_axis_shadow2340.finalized.validation.v2.json");
const specPath = path.join(toolsRoot, "B_geometry_axis_spec.v2.finalized.json");
const d1SnapshotPath = "C:/Users/user/OneDrive/바탕 화면/csv.txt";
const outputPath = path.join(project, "public", "math-weakness-engine", "data", "item_axes", "m2_geometry_properties.item_analysis_registry.shadow.v1.json");

const parseTsv = (text) => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
};
const hashObject = (value) => ({ algorithm: "sha256", value, basis: "normalized_item_content.v1" });
const sha256 = (body) => crypto.createHash("sha256").update(body).digest("hex");
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
const qnormV1 = (value) => String(value ?? "")
  .normalize("NFKC")
  .replace(/\s+/g, "")
  .replace(/\^/g, "")
  .replace(/[×·]/g, "*")
  .replace(/[−–]/g, "-")
  .replace(/[.,·、。]/g, "")
  .toLowerCase();
const liveStatusOf = (row) => {
  const batch = row.bulk_batch_id;
  if (batch.startsWith("SCSTUDY-TEST-")) return "archived";
  if (["SCSTUDY-2026-08-16-m2-geom-recovered", "SCSTUDY-2026-08-16-m2-geometry-properties-150-r2"].includes(batch)) return "archived";
  if (batch === "SCSTUDY-2026-08-16-m2-geom-07" && Number(row.question_no) >= 76) return "archived";
  return "approved";
};

const [sourceBody, validationBody, specBody, snapshotBody] = await Promise.all([
  fs.readFile(sourcePath),
  fs.readFile(validationPath),
  fs.readFile(specPath),
  fs.readFile(d1SnapshotPath),
]);
const source = JSON.parse(sourceBody.toString("utf8"));
const validation = JSON.parse(validationBody.toString("utf8"));
const spec = JSON.parse(specBody.toString("utf8"));
const snapshotRows = parseTsv(snapshotBody.toString("utf8"));
const snapshotById = new Map(snapshotRows.map((row) => [row.user_item_id, row]));
const snapshotByQnorm = new Map();
for (const row of snapshotRows.filter((item) => liveStatusOf(item) === "approved")) {
  const key = qnormV1(row.question_text);
  if (!key) continue;
  const group = snapshotByQnorm.get(key) ?? [];
  group.push(row);
  snapshotByQnorm.set(key, group);
}
const sourceRecords = Object.values(source.records ?? {});
const sourceById = new Map(sourceRecords.map((record) => [record.user_item_id, record]));
const records = {};
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const requiredAxisKeys = [
  "common.AX05_task_mode",
  "unit.M2_GEOMETRY_PROPERTIES.AXG01_state_change",
  "common.AX03_kind",
  "common.AX03_math_form",
];

check(source.status === "static_dry_run_finalized_after_independent_review", `unexpected source status: ${source.status}`);
check(validation.status === "PASS", `source validation status: ${validation.status}`);
check(spec.activation?.active === false, "axis spec must remain inactive outside Shadow");
check(spec.activation?.allowed_path === "static_shadow_dry_run_only", `unsafe axis spec path: ${spec.activation?.allowed_path}`);
check(sourceRecords.length === 2340, `source record count must be 2340, got ${sourceRecords.length}`);
check(sourceById.size === sourceRecords.length, "source user_item_id values are not unique");

let primaryCount = 0;
let aliasCount = 0;
let evidenceFailureCount = 0;
let qnormUniqueCount = 0;
let qnormAmbiguousCount = 0;
let runtimeEligibleCount = 0;
let archivedRegistryCount = 0;
for (const row of sourceRecords) {
  const d1 = snapshotById.get(row.user_item_id);
  if (!d1) {
    errors.push(`D1 snapshot row missing: ${row.user_item_id}`);
    continue;
  }
  if (row.unit_id !== "M2_GEOMETRY_PROPERTIES" || d1.unit_id !== row.unit_id) errors.push(`unit mismatch: ${row.user_item_id}`);
  const normalizedHash = normalizedItemContentV1Hash(d1);
  if (row.content_hash_basis !== "normalized_item_content.v1" || row.content_hash !== normalizedHash) errors.push(`normalized content_hash mismatch: ${row.user_item_id}`);
  if (row.profile_eligible !== false) errors.push(`profile_eligible must be false: ${row.user_item_id}`);
  if (liveStatusOf(d1) === "approved") {
    runtimeEligibleCount += 1;
    const qnormCandidates = snapshotByQnorm.get(qnormV1(d1.question_text)) ?? [];
    if (qnormCandidates.length === 1) qnormUniqueCount += 1;
    else if (qnormCandidates.length > 1) qnormAmbiguousCount += 1;
    else errors.push(`approved qnorm candidate missing: ${row.user_item_id}`);
  } else archivedRegistryCount += 1;

  if (row.record_role === "primary") {
    primaryCount += 1;
    const axisKeys = Object.keys(row.axes ?? {}).sort();
    if (JSON.stringify(axisKeys) !== JSON.stringify(requiredAxisKeys.slice().sort())) errors.push(`required axis keys mismatch: ${row.user_item_id}`);
    for (const [axisKey, axis] of Object.entries(row.axes ?? {})) {
      if (!axis || !["assessed", "unjudgeable"].includes(axis.state)) errors.push(`invalid axis state: ${row.user_item_id}/${axisKey}/${axis?.state}`);
      for (const evidence of axis?.evidence ?? []) {
        const text = evidence.source === "question" ? d1.question_text : evidence.source === "answer" ? d1.answer : evidence.source === "solution" ? d1.explanation : "";
        if (!evidence.quote || !String(text ?? "").includes(evidence.quote)) {
          evidenceFailureCount += 1;
          errors.push(`evidence quote mismatch: ${row.user_item_id}/${axisKey}/${evidence.source}`);
        }
      }
    }
    records[row.user_item_id] = {
      user_item_id: row.user_item_id,
      record_role: "primary",
      unit_id: row.unit_id,
      content_hash: hashObject(normalizedHash),
      analysis_version: "axis-def.m2-geometry-properties.v2.independent-final",
      review_state: "finalized_static_axis_set",
      profile_eligible: false,
      axes: row.axes,
    };
  } else if (row.record_role === "alias") {
    aliasCount += 1;
    const primary = sourceById.get(row.axes_ref_user_item_id);
    if (!primary || primary.record_role !== "primary" || primary.unit_id !== row.unit_id) errors.push(`invalid alias target: ${row.user_item_id}`);
    if (Object.hasOwn(row, "axes")) errors.push(`alias embeds axes: ${row.user_item_id}`);
    records[row.user_item_id] = {
      user_item_id: row.user_item_id,
      record_role: "alias",
      unit_id: row.unit_id,
      content_hash: hashObject(normalizedHash),
      analysis_version: "axis-def.m2-geometry-properties.v2.independent-final",
      review_state: "verified_alias_link",
      profile_eligible: false,
      axes_ref_user_item_id: row.axes_ref_user_item_id,
      link_basis: row.link_basis,
    };
  } else errors.push(`unknown record role: ${row.user_item_id}/${row.record_role}`);
}

check(primaryCount === 2265, `primary count must be 2265, got ${primaryCount}`);
check(aliasCount === 75, `alias count must be 75, got ${aliasCount}`);
check(Object.keys(records).length === 2340, `registry count must be 2340, got ${Object.keys(records).length}`);
check(evidenceFailureCount === 0, `evidence failures=${evidenceFailureCount}`);
check(runtimeEligibleCount === 1980, `approved runtime eligible count must be 1980, got ${runtimeEligibleCount}`);
check(archivedRegistryCount === 360, `archived registry count must be 360, got ${archivedRegistryCount}`);

const axisStateCounts = { assessed: 0, unjudgeable: 0, missing: 0 };
for (const record of Object.values(records)) {
  const effective = record.record_role === "alias" ? records[record.axes_ref_user_item_id] : record;
  for (const key of requiredAxisKeys) {
    const axis = effective?.axes?.[key];
    if (!axis) axisStateCounts.missing += 1;
    else if (axis.state === "assessed") axisStateCounts.assessed += 1;
    else if (axis.state === "unjudgeable") axisStateCounts.unjudgeable += 1;
    else errors.push(`effective axis state invalid: ${record.user_item_id}/${key}/${axis.state}`);
  }
}
const expectedAxisInstances = Object.keys(records).length * requiredAxisKeys.length;
check(axisStateCounts.missing === 0, `effective missing axis instances=${axisStateCounts.missing}`);
check(axisStateCounts.assessed + axisStateCounts.unjudgeable === expectedAxisInstances, "effective axis instance total mismatch");

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

const registry = {
  schema_version: "item-analysis-registry.shadow.v1",
  generated_at: new Date().toISOString(),
  unit_id: "M2_GEOMETRY_PROPERTIES",
  unit_name: "도형의 성질",
  axis_spec_version: spec.axis_spec_version,
  source_schema_version: source.version,
  source_analysis_version: "axis-def.m2-geometry-properties.v2.independent-final",
  runtime_contract: {
    mode: "shadow",
    path_mode: "parallel_with_legacy",
    legacy_diagnosis_preserved: true,
    student_output: false,
    profile_eligible: false,
    diagnostic_authority: false,
    remediation_enabled: false,
    D1_item_axes_table_required: false,
  },
  coverage: {
    denominator: Object.keys(records).length,
    primary_records: primaryCount,
    alias_records: aliasCount,
    runtime_status_filter: "approved",
    runtime_eligible_records: runtimeEligibleCount,
    archived_registry_records: archivedRegistryCount,
    required_axis_key_count: requiredAxisKeys.length,
    required_axis_keys: requiredAxisKeys,
    expected_effective_axis_instances: expectedAxisInstances,
    assessed_effective_axis_instances: axisStateCounts.assessed,
    unjudgeable_effective_axis_instances: axisStateCounts.unjudgeable,
    missing_effective_axis_instances: axisStateCounts.missing,
    assessed_rate: axisStateCounts.missing === 0 ? 1 : (expectedAxisInstances - axisStateCounts.missing) / expectedAxisInstances,
    offline_qnorm_approved_unique: qnormUniqueCount,
    offline_qnorm_approved_ambiguous: qnormAmbiguousCount,
    live_status_basis: "Cloudflare D1 read-only queries on 2026-08-31: approved=1980, archived=368, pending=0; eight archived test rows are outside this registry.",
  },
  record_count: Object.keys(records).length,
  records,
};

const outputBody = `${JSON.stringify(registry, null, 2)}\n`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, outputBody, "utf8");
console.log(JSON.stringify({
  ok: true,
  outputPath,
  bytes: Buffer.byteLength(outputBody),
  sha256: sha256(outputBody),
  record_count: registry.record_count,
  primary_count: primaryCount,
  alias_count: aliasCount,
  offline_qnorm_unique: qnormUniqueCount,
  offline_qnorm_ambiguous: qnormAmbiguousCount,
  axis_state_counts: axisStateCounts,
  D1_written: false,
}, null, 2));
