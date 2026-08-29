import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const project = "C:\\Users\\user\\projects\\scshstudy";
const sourcePath = path.join(project, "tools", "axis_prediction", "generated", "m3_circle_properties.reference_axis_candidates.v4.integrated2133.json");
const outputPath = path.join(project, "public", "math-weakness-engine", "data", "item_axes", "m3_circle_properties.item_analysis_registry.shadow.v1.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceRecords = Object.values(source.records ?? {});
const errors = [];
const records = {};

for (const row of sourceRecords) {
  if (!row?.user_item_id || records[row.user_item_id]) {
    errors.push(`invalid or duplicate user_item_id: ${row?.user_item_id ?? "(missing)"}`);
    continue;
  }
  if (row.unit_id !== "M3_CIRCLE_PROPERTIES") errors.push(`wrong unit: ${row.user_item_id}`);
  if (row.profile_eligible !== false) errors.push(`profile_eligible must be false: ${row.user_item_id}`);
  if (!Object.keys(row.axes ?? {}).length) errors.push(`assessed axes missing: ${row.user_item_id}`);
  records[row.user_item_id] = {
    user_item_id: row.user_item_id,
    unit_id: row.unit_id,
    content_hash: row.content_hash,
    analysis_version: row.analysis_version,
    review_state: row.review_state,
    profile_eligible: false,
    axes: row.axes ?? {},
  };
}

const counts = Object.values(records).reduce((acc, row) => {
  acc[row.review_state] = (acc[row.review_state] ?? 0) + 1;
  return acc;
}, {});
if (Object.keys(records).length !== 2168) errors.push(`record count must be 2168, got ${Object.keys(records).length}`);
if (counts.validated_sample_linked !== 35) errors.push(`validated_sample_linked=${counts.validated_sample_linked}`);
if (counts.validated_workpack_linked !== 1129) errors.push(`validated_workpack_linked=${counts.validated_workpack_linked}`);
if (counts.validated_image_workpack_linked !== 1004) errors.push(`validated_image_workpack_linked=${counts.validated_image_workpack_linked}`);
if ((counts.unjudged ?? 0) !== 0) errors.push(`unjudged=${counts.unjudged}`);

const registry = {
  schema_version: "item-analysis-registry.shadow.v1",
  generated_at: new Date().toISOString(),
  unit_id: "M3_CIRCLE_PROPERTIES",
  source_schema_version: source.schema_version,
  source_analysis_version: source.analysis_version,
  runtime_contract: {
    mode: "shadow",
    student_output: false,
    profile_eligible: false,
    diagnostic_authority: false,
    remediation_enabled: false,
    D1_item_axes_table_required: false,
  },
  coverage: source.coverage,
  record_count: Object.keys(records).length,
  review_state_counts: counts,
  records,
};

if (errors.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const body = `${JSON.stringify(registry, null, 2)}\n`;
fs.writeFileSync(outputPath, body, "utf8");
process.stdout.write(`${JSON.stringify({
  ok: true,
  outputPath,
  record_count: registry.record_count,
  review_state_counts: counts,
  bytes: Buffer.byteLength(body),
  sha256: crypto.createHash("sha256").update(body).digest("hex"),
}, null, 2)}\n`);
