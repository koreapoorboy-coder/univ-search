// '다음에 해 볼 것' 블록이 실제로 어떻게 나오는지 본다. AI를 안 쓰므로 ₩0.
//
//   node public/keyword-engine/build/measure_next_step.mjs [키파일]
//
// 키를 주면 공공데이터까지 실제로 찾아 붙이고, 안 주면 축과 책만으로 만든다.
import { readFile } from "node:fs/promises";
import { buildWordCounts, matchBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";
import { findPublicData } from "../../../admission_worker_skeleton/public_data_v1.mjs";
import { buildNextStep, nextStepNote } from "../../../admission_worker_skeleton/next_step_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const books = JSON.parse(await readFile(here("../seed/engine-index/book_match_index.v1.json"), "utf8")).books;
const terms = JSON.parse(await readFile(here("../seed/engine-index/public_data_terms.v1.json"), "utf8"));
const counts = buildWordCounts(books);

const keyPath = process.argv[2];
let apiKey = "";
if (keyPath) {
  const file = await readFile(keyPath, "utf8");
  apiKey = (file.match(/공공[^:]*:\s*(\S+)/) || [])[1] || "";
}

const seen = new Set();
const cases = [];
for (const [axisId, axis] of Object.entries(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  cases.push({ axisId, subject: axis.subject, concept: axis.concept, axisTitle: axis.title });
}

let made = 0;
let withMaterial = 0;
const show = new Set(["지구과학", "통합과학2", "물리", "통합사회1", "생명과학", "확률과 통계", "공통수학1"]);
let shown = 0;

for (const one of cases) {
  const found = matchBooks(books, one, 2, counts);
  const datasets = apiKey ? await findPublicData(one, terms, apiKey, { limit: 2 }) : [];
  const step = buildNextStep({ axis: { axisId: one.axisId }, axisIndex, books: found, datasets });
  if (!step) continue;
  made += 1;
  if (step.books.length || step.datasets.length) withMaterial += 1;
  if (show.has(one.subject) && shown < 10 && (step.books.length || step.datasets.length)) {
    shown += 1;
    console.log(`\n■ ${one.subject} / ${one.concept}`);
    console.log(`  ${nextStepNote(step)}`);
    console.log(`  [${step.axisTitle}]  ${step.why}`);
    for (const act of step.activities) console.log(`   · ${act}`);
    for (const book of step.books) console.log(`   📖 ${book.title} (${book.author})`);
    for (const row of step.datasets) console.log(`   📊 ${row.title} — ${row.org}`);
    if (step.nextSubjects.length) console.log(`   → 이어지는 과목: ${step.nextSubjects.join(" · ")}`);
  }
}

console.log(`\n\n블록이 만들어진 개념: ${made}/${cases.length} (${Math.round((made / cases.length) * 100)}%)`);
console.log(`그중 자료까지 붙은 것: ${withMaterial} (${Math.round((withMaterial / made) * 100)}%)`);
console.log(`나머지 ${made - withMaterial}개는 할 일만 나오고, 그래도 블록은 성립합니다 — 자료는 수단일 뿐입니다.`);
