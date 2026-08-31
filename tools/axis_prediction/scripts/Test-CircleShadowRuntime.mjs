import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const project = "C:\\Users\\user\\projects\\scshstudy";
const publicRoot = path.join(project, "public", "math-weakness-engine");
const registryPath = path.join(publicRoot, "data", "item_axes", "m3_circle_properties.item_analysis_registry.shadow.v1.json");
const specPath = path.join(publicRoot, "data", "item_axes", "item_axis_spec.v2.json");
const manifestPath = path.join(publicRoot, "manifest.json");
const enginePath = path.join(publicRoot, "assets", "math_weakness_engine.js");
const storePath = path.join(publicRoot, "assets", "math_axis_accumulation.js");
const workerPath = path.join(publicRoot, "worker_skeleton", "math_diagnosis_worker.js");
const d1InputPath = path.join(project, "tools", "axis_prediction", "generated", "m3_circle_properties.axis_input.d1.v1.json");
const outputPath = path.join(project, "tools", "axis_prediction", "outputs", "circle_shadow_runtime_20260828", "B_circle_shadow_runtime_test.v1.json");

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const registryRows = Object.values(registry.records ?? {});
const assessed = registryRows.find((row) => Object.keys(row.axes ?? {}).length > 0);
const requiredAxisKeys = Object.keys(spec.axes ?? {});
const missingAxisRows = registryRows.filter((row) => requiredAxisKeys.some((key) => !Object.hasOwn(row.axes ?? {}, key)));
assert(Boolean(assessed), "assessed registry fixture missing");
assert(spec.axis_spec_version === "item-axis-spec.v2" && spec.status === "active_shadow_only", "active v2 axis spec missing");
assert(requiredAxisKeys.length === 3, `required reference axis keys=${requiredAxisKeys.length}`);
assert(missingAxisRows.length === 0, `registry rows with missing required axes=${missingAxisRows.length}`);
assert(registry.coverage?.missing_axis_instances === 0, `registry missing_axis_instances=${registry.coverage?.missing_axis_instances}`);
assert(registry.coverage?.expected_axis_instances === 6504, `registry expected_axis_instances=${registry.coverage?.expected_axis_instances}`);
assert(manifest.shadow_runtime?.diagnostic_authority === false, "manifest diagnostic_authority gate missing");
assert(manifest.shadow_runtime?.axis_spec === "data/item_axes/item_axis_spec.v2.json", "manifest active axis spec path missing");

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
engine.shadowRuntime = {
  enabled: true,
  mode: "shadow",
  student_output: false,
  profile_eligible: false,
  diagnostic_authority: false,
  remediation_enabled: false,
  registries: { M3_CIRCLE_PROPERTIES: "data/item_axes/m3_circle_properties.item_analysis_registry.shadow.v1.json" },
};

const unsafeEngine = new Engine(".");
unsafeEngine.loaded = true;
unsafeEngine.shadowRuntime = {
  enabled: true,
  mode: "shadow",
  student_output: false,
  profile_eligible: false,
  diagnostic_authority: true,
  remediation_enabled: false,
  registries: { M3_CIRCLE_PROPERTIES: "data/item_axes/m3_circle_properties.item_analysis_registry.shadow.v1.json" },
};
await unsafeEngine.ensureShadowRegistries(["M3_CIRCLE_PROPERTIES"]);
assert(Object.keys(unsafeEngine.shadowRegistryRecordById).length === 0, "unsafe diagnostic authority config loaded Shadow registry");

const observedInput = {
  attempts: [{
    question_no: "1",
    unit_id: "M3_CIRCLE_PROPERTIES",
    response_status: "WRONG_COMPLETE",
    student_work_text: "중심을 잘못 잡고 x=55라고 계산했다.",
    registered_item_link: { status: "verified" },
    registered_item_ref: {
      user_item_id: assessed.user_item_id,
      unit_id: assessed.unit_id,
      content_hash: assessed.content_hash,
      concept_ids: ["TEST_CIRCLE_CONCEPT"],
    },
    failed_steps: [{
      failed_step_id: "FS_TEST",
      certainty: "확실",
      evidence: { quote: "x=55", source: "student_work_text", interpretation: "계산 결과 오류" },
    }],
  }],
};
const observed = await engine.analyzeShadow(observedInput);
const observedRow = observed.observations[0];
assert(observed.summary.recordable_count === 1, `recordable_count=${observed.summary.recordable_count}`);
assert(observedRow.analysis_state === "observed", `observed analysis_state=${observedRow.analysis_state}`);
assert(observedRow.item_link.status === "verified", `observed item_link=${observedRow.item_link.status}`);
assert(observedRow.failed_steps.length === 1, `failed_steps=${observedRow.failed_steps.length}`);
assert(observedRow.student_output === false && observedRow.profile_eligible === false && observedRow.diagnostic_authority === false, "shadow output/profile/authority gate failed");
assert(observedRow.remediation_eligible === false && observed.remediation_enabled === false, "remediation gate failed");
assert(!Object.hasOwn(observed, "student_view") && !Object.hasOwn(observedRow, "student_view"), "student_view leaked into shadow result");

const invalidHashInput = JSON.parse(JSON.stringify(observedInput));
invalidHashInput.attempts[0].registered_item_ref.content_hash.value = "0".repeat(64);
const invalidHash = await engine.analyzeShadow(invalidHashInput);
assert(invalidHash.observations[0].item_link.status === "invalid", "content hash mismatch was not invalid");
assert(!Object.hasOwn(invalidHash.observations[0].item_link, "user_item_id"), "invalid link retained user_item_id");

const omittedWorkInput = JSON.parse(JSON.stringify(observedInput));
delete omittedWorkInput.attempts[0].student_work_text;
delete omittedWorkInput.attempts[0].failed_steps;
const omittedWork = await engine.analyzeShadow(omittedWorkInput);
assert(omittedWork.observations[0].analysis_state === "unresolved", "omitted work must be unresolved");
assert(omittedWork.observations[0].student_work_observation.reason === "work_field_omitted", "omitted work reason mismatch");

const attached = engine.attachShadowObservations(observedInput.attempts, observed);
assert(Boolean(attached[0].shadow_analysis), "shadow_analysis was not attached for storage");
assert(!Object.hasOwn(attached[0].shadow_analysis, "item_axes"), "full item_axes duplicated into attempt storage");
assert(attached[0].shadow_analysis.student_output === false, "stored shadow student_output gate missing");

const storage = new Map();
const localStorage = { getItem: (key) => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
const storeContext = vm.createContext({ window: {}, console, fetch: async () => ({ ok: true }), localStorage, crypto: globalThis.crypto, performance: globalThis.performance, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(storePath, "utf8"), storeContext, { filename: storePath });
const store = storeContext.window.MathAxisStore;
const storedRecord = await store.buildRecord({
  studentCode: "SC-STUDY-999",
  scope: {},
  profileEligible: false,
  observedAxes: [],
  attempts: [
    { question_no: "1", unit_id: "M3_CIRCLE_PROPERTIES", response_status: "UNKNOWN", shadow_analysis: attached[0].shadow_analysis },
    { question_no: "2", unit_id: "M3_CIRCLE_PROPERTIES", response_status: "WRONG_COMPLETE", student_work_text: "" },
  ],
});
assert(storedRecord.schema_version === 2, `axis record schema_version=${storedRecord.schema_version}`);
assert(storedRecord.profile_eligible === false, "shadow-only record profile gate missing");
assert(!Object.hasOwn(storedRecord.attempts[0], "student_work_text"), "omitted student_work_text was synthesized");
assert(Object.hasOwn(storedRecord.attempts[1], "student_work_text") && storedRecord.attempts[1].student_work_text === "", "explicit empty student_work_text was not preserved");
assert(storedRecord.attempts[0].shadow_analysis.recordable === true, "recordable shadow was not preserved");
store.save(storedRecord);
assert(store.listByStudent("SC-STUDY-999").length === 0, "shadow-only record leaked into student profile list");
assert(store.students().length === 0, "shadow-only student leaked into student index");

const workerSource = fs.readFileSync(workerPath, "utf8");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(`${workerSource}\nexport { normalizedItemContentV1Hash };`).toString("base64")}`);
const d1Input = JSON.parse(fs.readFileSync(d1InputPath, "utf8"));
const d1Item = d1Input.items.find((item) => item.user_item_id === assessed.user_item_id);
assert(Boolean(d1Item), "D1 hash fixture missing");
const workerHash = d1Item ? await workerModule.normalizedItemContentV1Hash(d1Item) : null;
assert(workerHash === assessed.content_hash.value, `worker normalized hash mismatch: ${workerHash}`);
assert(workerSource.includes("WHERE status=?1 AND unit_id=?2 ORDER BY id LIMIT ?3 OFFSET ?4"), "worker shadow query is not paginated");
assert(workerSource.includes("M3_CIRCLE_PROPERTIES: 'pending'"), "circle pending status boundary missing");
assert(workerSource.includes("SHADOW_ITEM_PAGE_SIZE = 1000"), "worker shadow pagination size missing");
assert(workerSource.includes("linkAttemptsToShadowItems"), "worker shadow linker missing");
assert(workerSource.includes("!TYPE_FREE_SHADOW_UNIT_IDS.has(a.unit_id)"), "type-free shadow attempts still enter legacy item matcher");
assert(workerSource.includes("const TYPE_FREE_SHADOW_UNIT_IDS = new Set(['M3_CIRCLE_PROPERTIES'])"), "circle-only type-free boundary missing");
assert(workerSource.includes("'M2_GEOMETRY_PROPERTIES'"), "geometry parallel Shadow unit missing");

const indexSource = fs.readFileSync(path.join(publicRoot, "index.html"), "utf8");
assert(indexSource.includes("extractionWithoutShadowInternals"), "student downstream sanitization missing");
assert(!/engineDiagnosis\s*=.*shadowObservation/.test(indexSource), "shadow merged into engineDiagnosis");
assert(workerSource.includes("category_stage: 'shadow_type_free'"), "circle unit does not bypass problem type assignment");
assert(workerSource.includes("problem_type_id: ''"), "type-free shadow rows do not clear problem_type_id");
let inlineScriptCount = 0;
for (const htmlName of ["index.html", "hybrid.html"]) {
  const html = fs.readFileSync(path.join(publicRoot, htmlName), "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).filter((body) => body.trim());
  for (const body of scripts) { new vm.Script(body, { filename: `${htmlName}:inline` }); inlineScriptCount++; }
}

const result = {
  ok: errors.length === 0,
  validator: "Test-CircleShadowRuntime.mjs",
  registry_records: registryRows.length,
  observed_fixture: { item_id: assessed?.user_item_id, analysis_state: observedRow?.analysis_state, failed_steps: observedRow?.failed_steps?.length },
  invalid_hash_state: invalidHash.observations[0].item_link.status,
  omitted_work_reason: omittedWork.observations[0].student_work_observation.reason,
  required_axis_keys: requiredAxisKeys,
  missing_axis_registry_records: missingAxisRows.length,
  expected_axis_instances: registry.coverage?.expected_axis_instances,
  assessed_axis_instances: registry.coverage?.assessed_axis_instances,
  unjudgeable_axis_instances: registry.coverage?.unjudgeable_axis_instances,
  stored_schema_version: storedRecord.schema_version,
  profile_hidden: store.listByStudent("SC-STUDY-999").length === 0,
  worker_hash_match: workerHash === assessed.content_hash.value,
  inline_scripts_syntax_checked: inlineScriptCount,
  student_output: false,
  diagnostic_authority_fail_closed: Object.keys(unsafeEngine.shadowRegistryRecordById).length === 0,
  D1_written: false,
  errors,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...result, outputPath }, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
