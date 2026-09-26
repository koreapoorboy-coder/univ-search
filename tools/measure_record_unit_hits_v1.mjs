// **생활기록부 세특 문장이 우리 단원 사전에 얼마나 걸리나.** ₩0 — 사전만 본다.
//
// 3년을 이어 쓰려면 2학년 학생이 1학년 세특을 한 번 넣어야 한다(사장님 결정 2026-09-26).
// 그때 AI를 쓰지 않고 우리 사전(단원 371개 · 낱말 3,306개)으로 「무슨 단원을 건드렸나」를
// 뽑을 수 있는지 먼저 재 본다. 안 걸리면 사전을 손봐야 한다.
//
// **학생 글은 화면에 찍지 않는다.** 세특은 미성년자의 개인정보다. 세는 것만 찍는다 —
// 몇 줄이 걸렸나, 어느 단원으로 걸렸나, 어느 과목이 안 걸리나.
//
//   node tools/measure_record_unit_hits_v1.mjs [--miss]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const SHOW_MISS = process.argv.includes('--miss');
const { siteSubject } = await import(new URL('./site_subject.mjs', import.meta.url));
const { inferConcept } = await import(new URL('../admission_worker_skeleton/book_match_v1.mjs', import.meta.url));
const axisIndex = JSON.parse(readFileSync(`${ROOT}public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json`, 'utf8'));

const base = `${ROOT}public/students`;
const folders = readdirSync(base).filter((name) => statSync(`${base}/${name}`).isDirectory());
const rows = [];
for (const folder of folders) {
  const path = `${base}/${folder}/school_record_raw.json`;
  if (!existsSync(path)) continue;
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const one = doc[Object.keys(doc)[0]] || {};
  for (const row of one.rows || []) {
    if (!/세특|세부능력/.test(`${row.category || ''} ${row.item || ''}`)) continue;
    const text = String(row.text || '');
    if (text.length < 30) continue;
    rows.push({ folder, term: row.term || '', subject: String(row.subject || '').trim(), text });
  }
}

let hit = 0;
const byUnit = new Map();
const missSubjects = new Map();
const noSite = new Map();
for (const row of rows) {
  const site = siteSubject(row.subject) || '';
  if (!site) {
    noSite.set(row.subject, (noSite.get(row.subject) || 0) + 1);
    continue;
  }
  const unit = inferConcept(site, row.text, axisIndex) || '';
  if (unit) {
    hit += 1;
    const key = `${site}::${unit}`;
    byUnit.set(key, (byUnit.get(key) || 0) + 1);
  } else {
    missSubjects.set(site, (missSubjects.get(site) || 0) + 1);
  }
}

const servable = rows.length - [...noSite.values()].reduce((a, b) => a + b, 0);
console.log(`세특 ${rows.length}줄 (학생 ${folders.length}명)`);
console.log(`  우리가 받는 과목의 줄  ${servable}줄`);
console.log(`  단원이 나온 줄        ${hit}줄  (${servable ? Math.round((hit / servable) * 100) : 0}%)`);
console.log(`  단원이 안 나온 줄      ${servable - hit}줄`);
console.log(`\n걸린 단원 ${byUnit.size}가지:`);
for (const [key, n] of [...byUnit.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(2)}줄  ${key}`);
if (missSubjects.size) {
  console.log(`\n단원이 안 나온 과목:`);
  for (const [name, n] of [...missSubjects.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(2)}줄  ${name}`);
}
if (noSite.size) {
  console.log(`\n화면에 없는 과목(예체능·제2외국어·창체 등) ${[...noSite.values()].reduce((a, b) => a + b, 0)}줄:`);
  if (SHOW_MISS) for (const [name, n] of [...noSite.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(2)}줄  ${name}`);
}
