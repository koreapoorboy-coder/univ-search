import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = "C:/Users/user/projects/scshstudy/tools/axis_prediction";
const sourcePath = "C:/Users/user/OneDrive/바탕 화면/csv.txt";
const shadowPath = path.join(root, "outputs", "geometry_axis_full_20260831", "B_geometry_axis_shadow2340.finalized.dry_run.v2.json");
const validationPath = path.join(root, "outputs", "geometry_axis_full_20260831", "B_geometry_axis_shadow2340.finalized.validation.v2.json");
const specPath = path.join(root, "B_geometry_axis_spec.v2.finalized.json");
const outputDir = path.join(root, "outputs", "geometry_d1_dryrun_20260831");
const resultPath = path.join(outputDir, "B_geometry_2340_D1_dryrun.v1.json");
const sqlPath = path.join(root, "B_geometry_2340_D1_readonly_dryrun.v1.sql");
const reportPath = path.join(root, "B_geometry_2340_D1_dryrun.v1.md");

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
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
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const parseTsv = (text) => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
};

const [sourceBuffer, shadowBuffer, validationBuffer, specBuffer] = await Promise.all([
  fs.readFile(sourcePath),
  fs.readFile(shadowPath),
  fs.readFile(validationPath),
  fs.readFile(specPath),
]);
const sourceRows = parseTsv(sourceBuffer.toString("utf8"));
const shadow = JSON.parse(shadowBuffer.toString("utf8"));
const priorValidation = JSON.parse(validationBuffer.toString("utf8"));
const spec = JSON.parse(specBuffer.toString("utf8"));

const errors = [];
const warnings = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const targetRecords = Object.values(shadow.records ?? {});
const sourceById = new Map(sourceRows.map((row) => [row.user_item_id, row]));
const targetById = new Map(targetRecords.map((record) => [record.user_item_id, record]));
const primaryRecords = targetRecords.filter((record) => record.record_role === "primary");
const aliasRecords = targetRecords.filter((record) => record.record_role === "alias");
const testRows = sourceRows.filter((row) => row.bulk_batch_id.startsWith("SCSTUDY-TEST-"));

check(sourceRows.length === 2348, `D1 snapshot count must be 2348, got ${sourceRows.length}`);
check(new Set(sourceRows.map((row) => row.user_item_id)).size === sourceRows.length, "D1 snapshot user_item_id values are not unique");
check(targetRecords.length === 2340, `shadow target count must be 2340, got ${targetRecords.length}`);
check(targetById.size === targetRecords.length, "shadow target user_item_id values are not unique");
check(primaryRecords.length === 2265, `primary count must be 2265, got ${primaryRecords.length}`);
check(aliasRecords.length === 75, `alias count must be 75, got ${aliasRecords.length}`);
check(testRows.length === 8, `excluded test record count must be 8, got ${testRows.length}`);
check(priorValidation.status === "PASS", "finalized shadow validation must be PASS");
check(spec.activation?.active === false, "geometry axis spec must remain inactive");
check(spec.activation?.allowed_path === "static_shadow_dry_run_only", "geometry axis spec path must remain static shadow dry-run only");

let foundCount = 0;
let unitMatchCount = 0;
let hashMatchCount = 0;
let profileEligibleFalseCount = 0;
let primaryAxisContractCount = 0;
let aliasReferenceValidCount = 0;
for (const record of targetRecords) {
  const row = sourceById.get(record.user_item_id);
  if (!row) {
    errors.push(`D1 snapshot missing user_item_id: ${record.user_item_id}`);
    continue;
  }
  foundCount += 1;
  if (row.unit_id === "M2_GEOMETRY_PROPERTIES" && record.unit_id === row.unit_id) unitMatchCount += 1;
  else errors.push(`unit mismatch: ${record.user_item_id}`);
  if (record.content_hash_basis === "normalized_item_content.v1" && normalizedItemContentV1Hash(row) === record.content_hash) hashMatchCount += 1;
  else errors.push(`normalized_item_content.v1 hash mismatch: ${record.user_item_id}`);
  if (record.profile_eligible === false) profileEligibleFalseCount += 1;
  else errors.push(`profile_eligible is not false: ${record.user_item_id}`);

  if (record.record_role === "primary") {
    const keys = Object.keys(record.axes ?? {}).sort();
    const expected = [
      "common.AX03_kind",
      "common.AX03_math_form",
      "common.AX05_task_mode",
      "unit.M2_GEOMETRY_PROPERTIES.AXG01_state_change",
    ].sort();
    if (JSON.stringify(keys) === JSON.stringify(expected)) primaryAxisContractCount += 1;
    else errors.push(`primary axis contract mismatch: ${record.user_item_id}`);
  } else if (record.record_role === "alias") {
    const target = targetById.get(record.axes_ref_user_item_id);
    if (target?.record_role === "primary" && !Object.hasOwn(record, "axes")) aliasReferenceValidCount += 1;
    else errors.push(`alias reference contract mismatch: ${record.user_item_id}`);
  } else errors.push(`unknown record_role: ${record.user_item_id}`);
}

const excludedIdsInTarget = testRows.filter((row) => targetById.has(row.user_item_id));
check(excludedIdsInTarget.length === 0, `test records entered target: ${excludedIdsInTarget.length}`);
const nonTestRowsOutsideTarget = sourceRows.filter((row) => !row.bulk_batch_id.startsWith("SCSTUDY-TEST-") && !targetById.has(row.user_item_id));
check(nonTestRowsOutsideTarget.length === 0, `non-test D1 rows outside target: ${nonTestRowsOutsideTarget.length}`);

const sourceNewestUpdatedAt = sourceRows.map((row) => row.updated_at).filter(Boolean).sort().at(-1) ?? null;
const sourceOldestUpdatedAt = sourceRows.map((row) => row.updated_at).filter(Boolean).sort().at(0) ?? null;
const sourceStat = await fs.stat(sourcePath);

// Keep each VALUES CTE small enough to paste into the D1 console independently.
const chunkSize = 585;
const chunks = [];
for (let index = 0; index < targetRecords.length; index += chunkSize) chunks.push(targetRecords.slice(index, index + chunkSize));
const sqlSections = chunks.map((records, index) => {
  const values = records.map((record) => `  (${q(record.user_item_id)})`).join(",\n");
  return `-- ${index + 3}-${index + 1}) 대상 청크 ${index + 1}/${chunks.length}: ID·단원 대조
WITH expected(user_item_id) AS (
VALUES
${values}
), joined AS (
  SELECT e.user_item_id,
         u.id AS found_id,
         u.unit_id
  FROM expected e
  LEFT JOIN user_items u ON u.id = e.user_item_id
)
SELECT
  ${index + 1} AS chunk_no,
  COUNT(*) AS expected_count,
  SUM(CASE WHEN found_id IS NOT NULL THEN 1 ELSE 0 END) AS found_count,
  SUM(CASE WHEN found_id IS NULL THEN 1 ELSE 0 END) AS missing_count,
  SUM(CASE WHEN found_id IS NOT NULL AND unit_id <> 'M2_GEOMETRY_PROPERTIES' THEN 1 ELSE 0 END) AS wrong_unit_count
FROM joined;

-- 통과 기준: expected_count=${records.length}, found_count=${records.length}, 나머지 두 오류 수=0.
`;
});

const sql = `-- 도형의 성질 최종 축 2,340건 D1 읽기 전용 dry-run v1
-- 생성일: 2026-08-31
-- 실제 저장 금지: 이 파일은 SELECT와 CTE만 포함합니다.
-- 청크 1~4를 각각 실행해 모두 통과하는지 확인합니다.

-- 1) 단원 전체 센티널
SELECT
  COUNT(*) AS total,
  COUNT(DISTINCT id) AS unique_ids,
  SUM(CASE WHEN id IS NULL OR TRIM(id) = '' THEN 1 ELSE 0 END) AS blank_ids,
  MIN(updated_at) AS oldest_updated_at,
  MAX(updated_at) AS newest_updated_at
FROM user_items
WHERE unit_id = 'M2_GEOMETRY_PROPERTIES';

-- 기대값: total=2348, unique_ids=2348, blank_ids=0.

-- 1-1) 해시 입력의 NULL·빈 문자열과 운영 상태 센티널
SELECT
  SUM(CASE WHEN answer IS NULL THEN 1 ELSE 0 END) AS answer_null,
  SUM(CASE WHEN answer IS NOT NULL AND answer = '' THEN 1 ELSE 0 END) AS answer_empty,
  SUM(CASE WHEN explanation IS NULL THEN 1 ELSE 0 END) AS explanation_null,
  SUM(CASE WHEN explanation IS NOT NULL AND explanation = '' THEN 1 ELSE 0 END) AS explanation_empty,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
  SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
FROM user_items
WHERE unit_id = 'M2_GEOMETRY_PROPERTIES';

-- 2026-08-31 실측: answer_null=0, answer_empty=1, explanation_null=0,
-- explanation_empty=443, pending=0, approved=1980, archived=368.

-- 2) 승인되지 않은 별도 축 테이블·뷰 존재 여부
SELECT name, type
FROM sqlite_master
WHERE type IN ('table', 'view')
  AND name IN ('item_axes', 'item_analysis_registry', 'user_item_analysis', 'failed_steps')
ORDER BY name;

-- 기대값: 0행.

${sqlSections.join("\n")}
`;
const executableSql = sql.replace(/^\s*--.*$/gm, "");
check(!/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE|UPSERT|TRUNCATE)\b/i.test(executableSql), "generated SQL contains a mutating statement");

// These are metadata-only discrepancies in the pre-review spec. The actual allowed values and record contract are unchanged.
const finalDistribution = shadow.summary?.axis_distribution ?? {};
if (JSON.stringify(spec.axes?.["common.AX05_task_mode"]?.full_distribution) !== JSON.stringify(finalDistribution.AX05_task_mode?.values)) {
  warnings.push("geometry spec full_distribution for AX05_task_mode predates the independent final review");
}
if (JSON.stringify(spec.common_value_extensions?.["common.AX03_kind"]?.measured_counts_after_review) !== JSON.stringify(Object.fromEntries(["도형명", "조건명", "좌표", "시간"].map((key) => [key, finalDistribution.AX03_kind?.values?.[key] ?? 0])))) {
  warnings.push("geometry spec extension counts for AX03_kind predate the independent final review");
}

const result = {
  schema_version: "geometry-d1-readonly-dryrun.v1",
  generated_at: new Date().toISOString(),
  status: errors.length === 0 ? "pass" : "fail",
  execution_mode: "read_only_offline_snapshot",
  D1_written: false,
  runtime_changed: false,
  student_output_changed: false,
  storage_contract: {
    phase_1_axis_source_of_truth: "static JSON item-analysis registry candidate",
    separate_D1_item_axes_table: false,
    shadow_observation_store: "axis_records.attempts JSON",
  },
  inputs: {
    d1_snapshot: { path: sourcePath, sha256: sha256(sourceBuffer), row_count: sourceRows.length, file_last_write_time: sourceStat.mtime.toISOString(), oldest_updated_at: sourceOldestUpdatedAt, newest_updated_at: sourceNewestUpdatedAt },
    shadow_candidate: { path: shadowPath, sha256: sha256(shadowBuffer), record_count: targetRecords.length },
    finalized_validation: { path: validationPath, sha256: sha256(validationBuffer), status: priorValidation.status },
    axis_spec: { path: specPath, sha256: sha256(specBuffer), active: spec.activation?.active },
  },
  result: {
    source_rows: sourceRows.length,
    excluded_test_rows: testRows.length,
    target_records: targetRecords.length,
    primary_records: primaryRecords.length,
    alias_records: aliasRecords.length,
    found_in_snapshot: foundCount,
    unit_match: unitMatchCount,
    content_hash_match: hashMatchCount,
    profile_eligible_false: profileEligibleFalseCount,
    primary_axis_contract_match: primaryAxisContractCount,
    alias_reference_contract_match: aliasReferenceValidCount,
    non_test_rows_outside_target: nonTestRowsOutsideTarget.length,
  },
  live_readonly_sql: { path: sqlPath, sha256: sha256(Buffer.from(sql, "utf8")), chunk_count: chunks.length, chunk_sizes: chunks.map((chunk) => chunk.length), mutating_statement_count: 0 },
  live_D1_observation: {
    observed_at: "2026-08-31",
    execution: "Cloudflare D1 Console read-only SELECT",
    total: 2348,
    answer_null: 0,
    answer_empty: 1,
    explanation_null: 0,
    explanation_empty: 443,
    pending: 0,
    approved: 1980,
    archived: 368,
  },
  proposed_write: { insert_count: 0, update_count: 0, delete_count: 0 },
  warnings,
  errors,
};

const metadataNote = warnings.length === 0
  ? "독립 검수 후 축 명세의 분포 요약도 최종 2,340건 결과와 동기화했다. 문항 레코드·축 값 계약·설명용 메타데이터 모두 경고 없이 통과했다."
  : `문항 레코드와 축 값 계약은 통과했지만 설명용 메타데이터 경고 ${warnings.length}건이 남았다. 운영 레지스트리 생성 전에 최종 분포로 동기화해야 한다.`;

const report = `# 도형의 성질 최종 축 2,340건 D1 이관 dry-run v1

- 작성일: 2026-08-31
- 결과: **${errors.length === 0 ? "통과" : "실패"}**
- 실제 D1 쓰기: **0건**
- 학생 화면·프로필·처방 변경: **없음**

## 1. 이관 방식

원의 성질과 같은 1단계 계약을 사용한다. 문항별 축 정본은 정적 JSON 후보이며, 별도 item_axes·item_analysis_registry·user_item_analysis·failed_steps D1 테이블을 만들지 않는다. 학생 풀이에서 생긴 Shadow 관측만 기존 axis_records.attempts JSON에 저장하는 구조다.

이번 dry-run은 정적 후보가 현재 D1 추출본의 user_items.id·unit_id·content_hash를 정확히 가리키는지만 확인했다. 정적 레지스트리의 운영 경로 반영은 다음 별도 게이트다.

## 2. 전량 대조 결과

| 항목 | 결과 |
|---|---:|
| D1 추출본 전체 | ${sourceRows.length} |
| 테스트·스모크 제외 | ${testRows.length} |
| Shadow 대상 | ${targetRecords.length} |
| 원본(primary) | ${primaryRecords.length} |
| 별칭(alias) | ${aliasRecords.length} |
| D1 ID 존재 | ${foundCount} |
| 단원 일치 | ${unitMatchCount} |
| normalized_item_content.v1 재계산 일치 | ${hashMatchCount} |
| profile_eligible=false | ${profileEligibleFalseCount} |
| 원본 4축 계약 일치 | ${primaryAxisContractCount} |
| 별칭 참조 계약 일치 | ${aliasReferenceValidCount} |
| 비테스트 누락 | ${nonTestRowsOutsideTarget.length} |
| 오류 | ${errors.length} |

별칭 75건은 축을 복제하지 않고 각자의 content_hash와 axes_ref_user_item_id만 가진다. 참조 대상은 모두 2,265개 원본 중 하나다.

## 3. D1 읽기 전용 SQL

B_geometry_2340_D1_readonly_dryrun.v1.sql은 SELECT와 CTE만 포함한다. 콘솔 입력 크기를 줄이기 위해 2,340건을 ${chunks.length}개 청크(${chunks.map((chunk) => chunk.length).join("+")})로 나눴다.

- 단원 센티널 기대값: 전체 2,348, 고유 ID 2,348, 빈 ID 0
- 금지된 별도 축 테이블·뷰: 0행
- 각 청크: 누락 0, 단원 불일치 0

오프라인 D1 추출본에서는 위 조건이 전부 통과했다. D1의 기존 content_hash 컬럼은 qnorm.v1 중복검사용이므로 축 해시와 비교하지 않는다. 축 전용 normalized_item_content.v1 해시는 unit_id·question_text·answer·explanation에서 별도로 재계산해 2,340건 전부 확인했다. SQL을 라이브 D1에서 실행해도 쓰기는 발생하지 않는다.

운영 D1 읽기 전용 실측은 다음과 같다.

| 항목 | 결과 |
|---|---:|
| answer NULL / 빈 문자열 | 0 / 1 |
| explanation NULL / 빈 문자열 | 0 / 443 |
| pending | 0 |
| approved | 1,980 |
| archived | 368 |

따라서 도형의 성질 Shadow 운영 조회는 approved 문항만 대상으로 한다. archived 368건 중 8건은 테스트 문항이며, 나머지 360건은 정적 레지스트리에 보관하되 현재 조회에는 쓰지 않는다.

## 4. 경고와 해석

${metadataNote}

## 5. 결론

- D1 INSERT 예정: **0건**
- D1 UPDATE 예정: **0건**
- D1 DELETE 예정: **0건**
- 정적 Shadow 후보로 연결 가능한 문항: **${targetRecords.length}건**
- 다음 게이트: 정적 레지스트리 생성 및 Shadow 조회 경로 확장

실제 D1과 기존 학생 화면은 전혀 변경하지 않았다.
`;

await fs.mkdir(outputDir, { recursive: true });
await Promise.all([
  fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"),
  fs.writeFile(sqlPath, sql, "utf8"),
  fs.writeFile(reportPath, report, "utf8"),
]);

console.log(JSON.stringify({
  status: result.status,
  source_rows: sourceRows.length,
  target_records: targetRecords.length,
  primary_records: primaryRecords.length,
  alias_records: aliasRecords.length,
  found_in_snapshot: foundCount,
  unit_match: unitMatchCount,
  content_hash_match: hashMatchCount,
  warnings: warnings.length,
  errors: errors.length,
  resultPath,
  sqlPath,
  reportPath,
}, null, 2));

if (errors.length) process.exitCode = 1;
