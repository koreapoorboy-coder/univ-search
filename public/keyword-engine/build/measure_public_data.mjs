// 붙이기 전에 잰다. 공공데이터가 실제로 쓸 만한 것이 나오는지, 진짜 API로 확인한다.
//
//   node public/keyword-engine/build/measure_public_data.mjs <키파일> [--all]
//
// AI는 안 쓰므로 ₩0이다. 공공데이터 API는 호출 한도가 넉넉하지만, 개념마다 두 번씩 부르므로 천천히 돈다.
import { readFile } from "node:fs/promises";
import { findPublicData, searchTerms } from "../../../admission_worker_skeleton/public_data_v1.mjs";

const [, , keyPath] = process.argv;
if (!keyPath) { console.error("쓰는 법: node measure_public_data.mjs <키가 적힌 파일> [--all]"); process.exit(1); }
const keyFile = await readFile(keyPath, "utf8");
const apiKey = (keyFile.match(/공공[^:]*:\s*(\S+)/) || [])[1] || "";
if (!apiKey) { console.error("파일에서 공공데이터 키를 못 찾았습니다."); process.exit(1); }

const terms = JSON.parse(await readFile(new URL("../data/public_data_terms.v1.json", import.meta.url), "utf8"));
const axisIndex = JSON.parse(await readFile(new URL("../seed/engine-index/longitudinal_axis_index.v1.json", import.meta.url), "utf8"));

const seen = new Set();
const cases = [];
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  cases.push({ subject: axis.subject, concept: axis.concept });
}

console.log(`개념 ${cases.length}개 · 실제 공공데이터 API\n`);
let hit = 0;
let noTerms = 0;
const bySubject = new Map();
const show = process.argv.includes("--all");

for (const one of cases) {
  const queries = searchTerms(terms, one);
  if (!queries.length) { noTerms += 1; }
  const found = queries.length ? await findPublicData(one, terms, apiKey, { limit: 3 }) : [];
  if (found.length) hit += 1;
  const at = bySubject.get(one.subject) || { total: 0, hit: 0 };
  at.total += 1;
  if (found.length) at.hit += 1;
  bySubject.set(one.subject, at);
  if (found.length && (show || hit <= 14)) {
    console.log(`· ${one.subject} / ${one.concept}   [${queries.join(", ")}]`);
    for (const row of found) console.log(`    ${row.title}  —  ${row.org}`);
  }
}

console.log(`\n과목별`);
for (const [subject, at] of [...bySubject.entries()].sort((a, b) => (b[1].hit / b[1].total) - (a[1].hit / a[1].total))) {
  const rate = Math.round((at.hit / at.total) * 100);
  console.log(`  ${subject.padEnd(14)} ${"█".repeat(Math.round(rate / 5)).padEnd(20, "·")} ${String(rate).padStart(3)}%  (${at.hit}/${at.total})`);
}
console.log(`\n전체: ${hit}/${cases.length} 개념에서 자료가 나옴 (${Math.round((hit / cases.length) * 100)}%)`);
console.log(`검색어가 아예 없는 개념: ${noTerms}개 — 사전에 말을 더하면 줄어듭니다`);
