// **이미 있는 단원에 낱말만 보탠다.** 단원은 더하지 않는다. ₩0.
//
// 교육과정 내용 요소는 학술어라(「사회현상을 이해하는 관점」) 학교 과제 글도 책 소개 글도 안 닿는다.
// 그래서 그 단원을 실제로 부르는 **짧은 말**을 보탠다. 단원 사전 두 곳을 함께 고친다.
//
//   node tools/add_unit_words_from_patch.mjs tools/add_units_social_extra_words_2026_09.json [--write]
import { readFile, writeFile } from 'node:fs/promises';

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes('--write');
const patch = JSON.parse(await readFile(process.argv[2], 'utf8'));
const SEED = '../public/keyword-engine/seed';

const bookPath = here(`${SEED}/textbook-v1/subject_concept_engine_map.json`);
const bookDoc = JSON.parse(await readFile(bookPath, 'utf8'));
const bookRoot = bookDoc.subjects || bookDoc;

let added = 0;
let missing = 0;
const axisFiles = new Map();
for (const [subject, byUnit] of Object.entries(patch.words || {})) {
  const entry = bookRoot[subject];
  if (!entry) { console.log(`  ✗ 교과서 지도에 없는 과목: ${subject}`); missing += 1; continue; }
  // 축 파일 이름은 교과서 지도가 모른다. 과목 이름으로 축 파일을 찾는다.
  for (const [unit, words] of Object.entries(byUnit)) {
    const concept = (entry.concepts || {})[unit];
    if (!concept) { console.log(`  ✗ 없는 단원: ${subject} · ${unit}`); missing += 1; continue; }
    const before = (concept.micro_keywords || []).length;
    concept.micro_keywords = [...new Set([...(concept.micro_keywords || []), ...words])];
    concept.core_concepts = [...new Set([...(concept.core_concepts || []), ...words])].slice(0, 12);
    added += concept.micro_keywords.length - before;
  }
}

// 축 파일도 같이 고친다 — inferConcept 는 축을 읽는다.
// 축 목록에는 어느 파일에서 왔는지가 없다. 파일을 다 열어 과목 이름으로 찾는다.
import { readdir } from 'node:fs/promises';
const dir = here(`${SEED}/followup-axis/`);
const fileOf = new Map();
for (const file of await readdir(dir)) {
  if (!file.endsWith('_concept_longitudinal_map.json')) continue;
  try {
    const doc = JSON.parse(await readFile(new URL(file, dir), 'utf8'));
    if (doc.subject_name) fileOf.set(doc.subject_name, file);
  } catch { /* 축 파일이 아니면 건너뛴다 */ }
}

for (const [subject, byUnit] of Object.entries(patch.words || {})) {
  const file = fileOf.get(subject);
  if (!file) continue;
  const path = here(`${SEED}/followup-axis/${file}`);
  const doc = axisFiles.get(file) || JSON.parse(await readFile(path, 'utf8'));
  axisFiles.set(file, doc);
  for (const [unit, words] of Object.entries(byUnit)) {
    const one = (doc.concept_longitudinal_map || []).find((x) => x.concept_name === unit);
    if (!one) continue;
    for (const axis of one.longitudinal_axes || []) {
      for (const signal of axis.keyword_signals || []) {
        signal.keywords = [...new Set([...(signal.keywords || []), ...words])];
      }
    }
  }
}

console.log(`낱말 ${added}개를 보탰다 · 못 찾은 자리 ${missing}개 · 축 파일 ${axisFiles.size}개`);
if (!WRITE) { console.log('\n(보여 주기만 했습니다. --write 를 붙이세요.)'); process.exit(0); }
await writeFile(bookPath, `${JSON.stringify(bookDoc, null, 2)}\n`, 'utf8');
for (const [file, doc] of axisFiles) {
  await writeFile(here(`${SEED}/followup-axis/${file}`), `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}
console.log('\n썼습니다. 이어서 build_axis_index.mjs --write 와 build_unit_choices_index.mjs --write 를 돌리세요.');
