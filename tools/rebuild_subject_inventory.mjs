// **과목 목록 원본을 index.html 에서 다시 뽑는다.** ₩0.
//
// 이 목록은 지문(sha256)으로 잠겨 있고 화면과 워커가 같은 지문을 확인한다. 과목을 더하면 지문이 바뀌므로
// **세 곳을 함께** 고쳐야 한다: 목록 바이트 파일 · 워커 상수 · 화면 상수.
// 하나라도 어긋나면 모든 요청이 INVENTORY_VERSION_MISMATCH 로 막힌다.
//
// 뽑는 규칙은 목록 파일 자신이 적어 둔 그대로다:
//   source_path                public/keyword-engine/index.html
//   exact_extraction_locator   select#subject option[value][data-subject-group]
//   row_order                  subject_value 의 UTF-16 코드 단위 사전 순서
//   object_field_order         subject_value · subject_group · display_text
//   serialization              UTF-8 JSON, 두 칸 들여쓰기, LF, 끝 줄바꿈, BOM 없음
//
// **배포 순서가 평소와 반대다.** 화면이 새 판 이름을 보내면 워커가 그것을 알고 있어야 한다.
// 워커를 먼저 올리고 그다음 Pages 다. 반대로 하면 그 사이 요청이 전부 막힌다.
//
//   node tools/rebuild_subject_inventory.mjs           — 무엇이 달라지는지만 본다
//   node tools/rebuild_subject_inventory.mjs --write   — 세 곳을 다시 쓴다
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const HTML = 'public/keyword-engine/index.html';
const BYTES = 'admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs';
const WORKER = 'admission_worker_skeleton/simple_live_intake_v1.mjs';
const SCREEN = 'public/keyword-engine/assets/js/simple_live_intake_v1.js';

const sha = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

// ── 지금 목록 ────────────────────────────────────────────────
const old = JSON.parse(Buffer.from(
  /IMMUTABLE_SUBJECT_INVENTORY_BASE64 = "([^"]+)"/.exec(readFileSync(BYTES, 'utf8'))[1], 'base64').toString('utf8'));

// ── 화면에서 뽑는다 ──────────────────────────────────────────
const html = readFileSync(HTML, 'utf8');
const rows = [...html.matchAll(/<option value="([^"]+)" data-subject-group="([^"]+)">([^<]*)<\/option>/g)]
  .map((m) => ({ subject_value: m[1], subject_group: m[2], display_text: m[3] }));
// subject_value 의 UTF-16 코드 단위 사전 순서. 지역 규칙(localeCompare)을 쓰면 안 된다 — 기계마다 다르다.
rows.sort((a, b) => (a.subject_value < b.subject_value ? -1 : a.subject_value > b.subject_value ? 1 : 0));

const seen = new Set();
for (const row of rows) {
  if (seen.has(row.subject_value)) { console.error(`같은 과목이 두 번: ${row.subject_value}`); process.exit(1); }
  seen.add(row.subject_value);
}

const rowsSha = sha(JSON.stringify(rows));
const version = `subject-option-inventory-v2_${rowsSha}`;
const artifact = {
  ...old,
  inventory_version: version,
  row_count: rows.length,
  deterministic_source_rows_sha256: sha(JSON.stringify(rows.map((r) => [r.subject_value, r.subject_group]))),
  canonical_authority_rows_sha256: rowsSha,
  provenance: { ...old.provenance, source_sha256_at_freeze: sha(html) },
  rows,
};
const text = `${JSON.stringify(artifact, null, 2)}\n`;
const artifactSha = sha(text);

const gone = old.rows.filter((r) => !rows.some((n) => n.subject_value === r.subject_value));
const added = rows.filter((r) => !old.rows.some((n) => n.subject_value === r.subject_value));
console.log(`과목 ${old.row_count} → ${rows.length}`);
if (added.length) console.log(`  더함(${added.length}): ${added.map((r) => r.subject_value).join(' · ')}`);
if (gone.length) console.log(`  뺌(${gone.length}): ${gone.map((r) => r.subject_value).join(' · ')}`);
console.log(`  판 이름 ${old.inventory_version.slice(-12)} → ${version.slice(-12)}`);
if (!added.length && !gone.length && old.inventory_version === version) { console.log('\n그대로입니다.'); process.exit(0); }

if (!WRITE) { console.log('\n(보여 주기만 했습니다. --write 를 붙이세요.)'); process.exit(0); }

// ① 목록 바이트
writeFileSync(BYTES, `export const IMMUTABLE_SUBJECT_INVENTORY_BASE64 = "${Buffer.from(text, 'utf8').toString('base64')}";\n`, 'utf8');
// ② 워커 상수
let worker = readFileSync(WORKER, 'utf8');
for (const [key, value] of [['inventoryVersion', version], ['inventorySha256', artifactSha], ['rowsSha256', rowsSha]]) {
  const at = new RegExp(`(${key}: ")[^"]+(")`);
  if (!at.test(worker)) { console.error(`워커에서 ${key} 를 못 찾았습니다.`); process.exit(1); }
  worker = worker.replace(at, `$1${value}$2`);
}
worker = worker.replace(/(inventoryRows: )\d+/, `$1${rows.length}`);
writeFileSync(WORKER, worker, 'utf8');
// ③ 화면 상수
let screen = readFileSync(SCREEN, 'utf8');
const mark = /(const INVENTORY_VERSION = ")[^"]+(")/;
if (!mark.test(screen)) { console.error('화면에서 INVENTORY_VERSION 을 못 찾았습니다.'); process.exit(1); }
writeFileSync(SCREEN, screen.replace(mark, `$1${version}$2`), 'utf8');

console.log('\n세 곳을 다시 썼습니다. **워커를 먼저 배포하고 그다음 Pages 입니다.**');
