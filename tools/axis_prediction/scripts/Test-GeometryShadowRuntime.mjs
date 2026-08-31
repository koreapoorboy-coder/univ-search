import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const project = "C:/Users/user/projects/scshstudy";
const publicRoot = path.join(project, "public", "math-weakness-engine");
const registryPath = path.join(publicRoot, "data", "item_axes", "m2_geometry_properties.item_analysis_registry.shadow.v1.json");
const manifestPath = path.join(publicRoot, "manifest.json");
const enginePath = path.join(publicRoot, "assets", "math_weakness_engine.js");
const storePath = path.join(publicRoot, "assets", "math_axis_accumulation.js");
const workerPath = path.join(publicRoot, "worker_skeleton", "math_diagnosis_worker.js");
const d1SnapshotPath = "C:/Users/user/OneDrive/바탕 화면/csv.txt";
const outputPath = path.join(project, "tools", "axis_prediction", "outputs", "geometry_shadow_runtime_20260831", "B_geometry_shadow_runtime_test.v1.json");

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const rows = Object.values(registry.records ?? {});
const primary = rows.find((row) => row.record_role === "primary");
const alias = rows.find((row) => row.record_role === "alias");
const aliasPrimary = alias ? registry.records?.[alias.axes_ref_user_item_id] : null;
const requiredKeys = registry.coverage?.required_axis_keys ?? [];

assert(registry.record_count === 2340 && rows.length === 2340, `registry records=${rows.length}`);
assert(registry.coverage?.primary_records === 2265, `primary records=${registry.coverage?.primary_records}`);
assert(registry.coverage?.alias_records === 75, `alias records=${registry.coverage?.alias_records}`);
assert(registry.coverage?.missing_effective_axis_instances === 0, `missing effective axes=${registry.coverage?.missing_effective_axis_instances}`);
assert(registry.coverage?.runtime_eligible_records === 1980, `runtime eligible=${registry.coverage?.runtime_eligible_records}`);
assert(registry.coverage?.archived_registry_records === 360, `archived registry=${registry.coverage?.archived_registry_records}`);
assert(registry.coverage?.offline_qnorm_approved_unique === 1978, `approved qnorm unique=${registry.coverage?.offline_qnorm_approved_unique}`);
assert(registry.coverage?.offline_qnorm_approved_ambiguous === 2, `approved qnorm ambiguous=${registry.coverage?.offline_qnorm_approved_ambiguous}`);
assert(requiredKeys.length === 4, `required axis keys=${requiredKeys.length}`);
assert(Boolean(primary && alias && aliasPrimary), "primary/alias fixtures missing");
assert(aliasPrimary?.record_role === "primary" && !Object.hasOwn(alias ?? {}, "axes"), "alias contract invalid");
assert(registry.runtime_contract?.path_mode === "parallel_with_legacy", "parallel legacy contract missing");
assert(registry.runtime_contract?.legacy_diagnosis_preserved === true, "legacy preservation contract missing");
assert(registry.runtime_contract?.student_output === false && registry.runtime_contract?.diagnostic_authority === false, "shadow safety contract missing");
assert(manifest.shadow_runtime?.registries?.M2_GEOMETRY_PROPERTIES === "data/item_axes/m2_geometry_properties.item_analysis_registry.shadow.v1.json", "manifest geometry registry missing");

const fetchStub = async (url) => {
  const relative = String(url).replace(/^\.\/+/, "");
  const filePath = path.join(publicRoot, relative);
  if (!fs.existsSync(filePath)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(filePath, "utf8")) };
};
const context = vm.createContext({ window: {}, console, fetch: fetchStub, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(enginePath, "utf8"), context, { filename: enginePath });
const Engine = context.window.MathWeaknessEngine;
const engine = new Engine(".");
engine.loaded = true;
engine.shadowRuntime = manifest.shadow_runtime;

const makeAttempt = (record, conceptId) => ({
  question_no: "1",
  unit_id: "M2_GEOMETRY_PROPERTIES",
  problem_type_id: "M2_GEOM_PT001",
  response_status: "WRONG_COMPLETE",
  student_work_text: "사각형의 성질을 잘못 적용해서 x=20이라고 계산했다.",
  registered_item_link: { status: "verified" },
  registered_item_ref: {
    user_item_id: record.user_item_id,
    unit_id: record.unit_id,
    content_hash: record.content_hash,
    concept_ids: [conceptId],
  },
  failed_steps: [{
    failed_step_id: "FS_GEOM_TEST",
    certainty: "확실",
    evidence: { quote: "x=20", source: "student_work_text", interpretation: "계산 결과 오류" },
  }],
});

const primaryResult = await engine.analyzeShadow({ attempts: [makeAttempt(primary, "TEST_GEOM_PRIMARY")] });
const primaryObs = primaryResult.observations[0];
assert(primaryObs.item_link.status === "verified", `primary link=${primaryObs.item_link.status}`);
assert(primaryObs.analysis_state === "observed", `primary state=${primaryObs.analysis_state}`);
assert(Object.keys(primaryObs.item_axes ?? {}).length === 4, `primary axes=${Object.keys(primaryObs.item_axes ?? {}).length}`);
assert(primaryObs.item_axes_ref?.user_item_id === primary.user_item_id, "primary item_axes_ref mismatch");
assert(!primaryObs.item_axes_ref?.effective_axes_user_item_id, "primary unexpectedly has effective alias ref");

const aliasResult = await engine.analyzeShadow({ attempts: [makeAttempt(alias, "TEST_GEOM_ALIAS")] });
const aliasObs = aliasResult.observations[0];
assert(aliasObs.item_link.status === "verified", `alias link=${aliasObs.item_link.status}`);
assert(aliasObs.analysis_state === "observed", `alias state=${aliasObs.analysis_state}`);
assert(Object.keys(aliasObs.item_axes ?? {}).length === 4, `alias effective axes=${Object.keys(aliasObs.item_axes ?? {}).length}`);
assert(aliasObs.item_axes_ref?.user_item_id === alias.user_item_id, "alias own item id was not preserved");
assert(aliasObs.item_axes_ref?.effective_axes_user_item_id === alias.axes_ref_user_item_id, "alias effective axes ref mismatch");

const invalidAliasInput = { attempts: [makeAttempt(alias, "TEST_GEOM_ALIAS")] };
invalidAliasInput.attempts[0].registered_item_ref.content_hash = { ...alias.content_hash, value: "0".repeat(64) };
const invalidAlias = await engine.analyzeShadow(invalidAliasInput);
assert(invalidAlias.observations[0].item_link.status === "invalid", "alias content hash mismatch did not fail closed");

const attached = engine.attachShadowObservations([makeAttempt(alias, "TEST_GEOM_ALIAS")], aliasResult);
assert(Boolean(attached[0].shadow_analysis), "geometry shadow_analysis was not attached");
assert(!Object.hasOwn(attached[0].shadow_analysis, "item_axes"), "geometry axes duplicated into stored attempt");
assert(attached[0].problem_type_id === "M2_GEOM_PT001", "legacy problem_type_id was changed by Shadow");

const storage = new Map();
const localStorage = { getItem: (key) => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
const storeContext = vm.createContext({ window: {}, console, fetch: async () => ({ ok: true }), localStorage, crypto: globalThis.crypto, performance: globalThis.performance, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(storePath, "utf8"), storeContext, { filename: storePath });
const store = storeContext.window.MathAxisStore;
const stored = await store.buildRecord({ studentCode: "SC-STUDY-GEOM-TEST", scope: {}, profileEligible: false, observedAxes: [], attempts: attached });
store.save(stored);
assert(stored.profile_eligible === false, "geometry shadow-only storage profile gate missing");
assert(store.listByStudent("SC-STUDY-GEOM-TEST").length === 0, "geometry shadow-only record leaked to profile");

const workerSource = fs.readFileSync(workerPath, "utf8");
assert(workerSource.includes("const SHADOW_UNIT_IDS = new Set(['M3_CIRCLE_PROPERTIES', 'M2_GEOMETRY_PROPERTIES'])"), "geometry observation unit boundary missing");
assert(workerSource.includes("const TYPE_FREE_SHADOW_UNIT_IDS = new Set(['M3_CIRCLE_PROPERTIES'])"), "type-free boundary includes the wrong unit");
assert(workerSource.includes("!TYPE_FREE_SHADOW_UNIT_IDS.has(a.unit_id)"), "legacy matcher boundary does not preserve geometry");
assert(workerSource.includes("if (TYPE_FREE_SHADOW_UNIT_IDS.has(unitId))"), "stage2 type-free boundary missing");
assert(workerSource.includes("WHERE status=?1 AND unit_id=?2 ORDER BY id LIMIT ?3 OFFSET ?4"), "read-only status linker query changed");
assert(workerSource.includes("M2_GEOMETRY_PROPERTIES: 'approved'"), "geometry approved status boundary missing");
const shadowLinkerSource = workerSource.slice(workerSource.indexOf("async function fetchShadowItems"), workerSource.indexOf("async function runStagedEngineAdapter"));
assert(!/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(shadowLinkerSource.replace(/^\s*\/\/.*$/gm, "")), "Shadow linker contains a mutating statement");

const parseTsv = (text) => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split("\t")[index] ?? ""])));
};
const d1Rows = parseTsv(fs.readFileSync(d1SnapshotPath, "utf8"));
const d1Primary = d1Rows.find((row) => row.user_item_id === primary.user_item_id);
assert(Boolean(d1Primary), "worker linker D1 fixture missing");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(`${workerSource}\nexport { linkAttemptsToShadowItems };`).toString("base64")}`);
const fakeDb = (rowsForQuery) => ({
  prepare: () => ({
    bind: (_status, _unitId, limit, offset) => ({ all: async () => ({ results: rowsForQuery.slice(offset, offset + limit) }) }),
  }),
});
const workerRow = d1Primary ? {
  id: d1Primary.user_item_id,
  unit_id: d1Primary.unit_id,
  concept_ids: "[]",
  question_text: d1Primary.question_text,
  answer: d1Primary.answer,
  explanation: d1Primary.explanation,
} : null;
const linkedAttempt = [{ question_no: "1", unit_id: "M2_GEOMETRY_PROPERTIES", question_text: workerRow?.question_text }];
const linkedStats = workerRow ? await workerModule.linkAttemptsToShadowItems({ env: { AXIS_DB: fakeDb([workerRow]) }, attempts: linkedAttempt }) : null;
assert(linkedStats?.verified_count === 1 && linkedAttempt[0].registered_item_link?.status === "verified", "worker geometry exact linker failed");
assert(linkedAttempt[0].registered_item_ref?.content_hash?.value === primary.content_hash.value, "worker geometry normalized hash mismatch");
const ambiguousAttempt = [{ question_no: "1", unit_id: "M2_GEOMETRY_PROPERTIES", question_text: workerRow?.question_text }];
const ambiguousRows = workerRow ? [workerRow, { ...workerRow, id: "AMBIGUOUS-FIXTURE" }] : [];
const ambiguousStats = workerRow ? await workerModule.linkAttemptsToShadowItems({ env: { AXIS_DB: fakeDb(ambiguousRows) }, attempts: ambiguousAttempt }) : null;
assert(ambiguousStats?.ambiguous_count === 1 && ambiguousAttempt[0].registered_item_link?.status === "ambiguous", "worker geometry ambiguity fail-closed missing");

for (const htmlName of ["index.html", "hybrid.html"]) {
  const html = fs.readFileSync(path.join(publicRoot, htmlName), "utf8");
  assert(html.includes("extractionWithoutShadowInternals"), `${htmlName} downstream Shadow sanitization missing`);
  assert(!/engineDiagnosis\s*=.*shadowObservation/.test(html), `${htmlName} merges Shadow into engineDiagnosis`);
}

const result = {
  ok: errors.length === 0,
  validator: "Test-GeometryShadowRuntime.mjs",
  registry_records: rows.length,
  primary_records: registry.coverage?.primary_records,
  alias_records: registry.coverage?.alias_records,
  effective_axis_instances: registry.coverage?.expected_effective_axis_instances,
  missing_effective_axis_instances: registry.coverage?.missing_effective_axis_instances,
  primary_fixture: { user_item_id: primary?.user_item_id, linked: primaryObs?.item_link?.status, axes: Object.keys(primaryObs?.item_axes ?? {}).length },
  alias_fixture: { user_item_id: alias?.user_item_id, linked: aliasObs?.item_link?.status, effective_axes_user_item_id: aliasObs?.item_axes_ref?.effective_axes_user_item_id },
  invalid_alias_hash_state: invalidAlias.observations[0].item_link.status,
  legacy_problem_type_preserved: attached[0].problem_type_id === "M2_GEOM_PT001",
  worker_link_verified: linkedAttempt[0].registered_item_link?.status,
  worker_ambiguous_state: ambiguousAttempt[0].registered_item_link?.status,
  student_output: false,
  profile_hidden: store.listByStudent("SC-STUDY-GEOM-TEST").length === 0,
  D1_written: false,
  errors,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputPath }, null, 2));
if (!result.ok) process.exitCode = 1;
