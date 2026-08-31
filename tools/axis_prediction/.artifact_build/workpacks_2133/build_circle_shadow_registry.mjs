import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const project = "C:\\Users\\user\\projects\\scshstudy";
const sourcePath = path.join(project, "tools", "axis_prediction", "generated", "m3_circle_properties.reference_axis_candidates.v4.integrated2133.json");
const overlayPath = path.join(project, "tools", "axis_prediction", "data", "m3_circle_properties.missing33_adjudication.v1.json");
const specPath = path.join(project, "public", "math-weakness-engine", "data", "item_axes", "item_axis_spec.v2.json");
const outputPath = path.join(project, "public", "math-weakness-engine", "data", "item_axes", "m3_circle_properties.item_analysis_registry.shadow.v1.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const overlay = JSON.parse(fs.readFileSync(overlayPath, "utf8"));
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const sourceRecords = Object.values(source.records ?? {});
const errors = [];
const records = {};
const requiredAxisKeys = Object.keys(spec.axes ?? {});

if (spec.axis_spec_version !== "item-axis-spec.v2" || spec.status !== "active_shadow_only") {
  errors.push(`active v2 spec required: ${spec.axis_spec_version}/${spec.status}`);
}
if (requiredAxisKeys.length !== 3) errors.push(`required extension axis count must be 3, got ${requiredAxisKeys.length}`);
if (overlay.unit_id !== "M3_CIRCLE_PROPERTIES" || overlay.record_count !== 33) {
  errors.push(`invalid adjudication overlay: ${overlay.unit_id}/${overlay.record_count}`);
}

for (const row of sourceRecords) {
  if (!row?.user_item_id || records[row.user_item_id]) {
    errors.push(`invalid or duplicate user_item_id: ${row?.user_item_id ?? "(missing)"}`);
    continue;
  }
  if (row.unit_id !== "M3_CIRCLE_PROPERTIES") errors.push(`wrong unit: ${row.user_item_id}`);
  if (row.profile_eligible !== false) errors.push(`profile_eligible must be false: ${row.user_item_id}`);
  const patch = overlay.records?.[row.user_item_id];
  const axes = { ...(row.axes ?? {}), ...(patch?.axes_patch ?? {}) };
  const missingKeys = requiredAxisKeys.filter((key) => !Object.hasOwn(axes, key));
  if (missingKeys.length) errors.push(`required axes missing: ${row.user_item_id} (${missingKeys.join(",")})`);
  for (const key of requiredAxisKeys) {
    const axis = axes[key];
    if (axis && !["assessed", "unjudgeable"].includes(axis.state)) errors.push(`invalid axis state: ${row.user_item_id}/${key}/${axis.state}`);
  }
  records[row.user_item_id] = {
    user_item_id: row.user_item_id,
    unit_id: row.unit_id,
    content_hash: row.content_hash,
    analysis_version: patch?.analysis_version ?? row.analysis_version,
    review_state: row.review_state,
    profile_eligible: false,
    axes,
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

const axisStateCounts = { assessed: 0, unjudgeable: 0, missing: 0 };
for (const row of Object.values(records)) {
  for (const key of requiredAxisKeys) {
    const axis = row.axes[key];
    if (!axis) axisStateCounts.missing++;
    else if (axis.state === "assessed") axisStateCounts.assessed++;
    else if (axis.state === "unjudgeable") axisStateCounts.unjudgeable++;
  }
}
const expectedAxisInstances = Object.keys(records).length * requiredAxisKeys.length;
if (axisStateCounts.missing !== 0) errors.push(`missing axis instances=${axisStateCounts.missing}`);
if (axisStateCounts.assessed + axisStateCounts.unjudgeable !== expectedAxisInstances) {
  errors.push(`axis instance total mismatch: ${axisStateCounts.assessed}+${axisStateCounts.unjudgeable}!=${expectedAxisInstances}`);
}

const overlayUnusedIds = Object.keys(overlay.records ?? {}).filter((id) => !records[id]);
if (overlayUnusedIds.length) errors.push(`overlay ids not found: ${overlayUnusedIds.join(",")}`);

const registry = {
  schema_version: "item-analysis-registry.shadow.v1",
  generated_at: new Date().toISOString(),
  unit_id: "M3_CIRCLE_PROPERTIES",
  axis_spec_version: spec.axis_spec_version,
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
  coverage: {
    denominator: Object.keys(records).length,
    required_axis_key_count: requiredAxisKeys.length,
    required_axis_keys: requiredAxisKeys,
    expected_axis_instances: expectedAxisInstances,
    assessed_axis_instances: axisStateCounts.assessed,
    unjudgeable_axis_instances: axisStateCounts.unjudgeable,
    missing_axis_instances: axisStateCounts.missing,
    validated_sample_linked: counts.validated_sample_linked ?? 0,
    validated_workpack_linked: counts.validated_workpack_linked ?? 0,
    validated_image_workpack_linked: counts.validated_image_workpack_linked ?? 0,
    unjudged: axisStateCounts.missing,
    assessed_total: Object.keys(records).length,
    assessed_rate: axisStateCounts.missing === 0 ? 1 : (expectedAxisInstances - axisStateCounts.missing) / expectedAxisInstances,
    unjudged_rate: expectedAxisInstances ? axisStateCounts.missing / expectedAxisInstances : 0,
  },
  adjudication: {
    overlay_schema_version: overlay.schema_version,
    record_count: overlay.record_count,
    axis_patch_count: overlay.axis_patch_count,
  },
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
  axis_state_counts: axisStateCounts,
}, null, 2)}\n`);
