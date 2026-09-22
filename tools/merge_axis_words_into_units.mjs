// 이미 손으로 골라 둔 낱말을 **단원 목록 쪽으로 옮겨 붙인다.** ₩0. 새로 지어내는 말은 하나도 없다.
//
// 사전이 두 벌이다.
//   · 축 사전(seed/followup-axis/…)          — 단원마다 낱말이 붙어 있다. 오래 손봐 온 것이다.
//   · 단원 목록의 바탕(textbook-v1/…)        — 학생에게 보여 줄 단원 후보를 여기서 만든다.
//
// 그런데 두 벌이 서로 모른다. 축 사전에만 있는 낱말이 1,600개가 넘는데, 학생 화면의 단원 목록은
// 그것을 못 쓴다. 그래서 안내문이 주제를 또렷이 말해도 단원을 못 찾는다.
//
//   전수로 재 보니 안내문에서 단원을 찾아내는 비율이 **26.7%** 였다(2026-09-22).
//   네 과제 중 셋은 「저희가 골라 두었어요」로 간다.
//
// 이 도구는 축 사전의 낱말을 단원 목록 쪽에 **더하기만** 한다. 지우지 않는다.
//
//   node tools/merge_axis_words_into_units.mjs
//   node tools/merge_axis_words_into_units.mjs --write
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const AXIS_DIR = new URL("../public/keyword-engine/seed/followup-axis/", import.meta.url);
const MAP = new URL("../public/keyword-engine/seed/textbook-v1/subject_concept_engine_map.json", import.meta.url);

// 낱말 하나가 아무 글에나 걸리면 안 된다. 한 글자는 버리고, 너무 긴 설명조도 버린다.
const usable = (word) => typeof word === "string"
  && word.trim().length >= 2
  && word.trim().length <= 14
  && !/[.?!]$/.test(word.trim());

const axisWords = new Map();   // 과목 → 단원 → 낱말들
for (const name of readdirSync(AXIS_DIR).filter((one) => one.endsWith("_concept_longitudinal_map.json"))) {
  const doc = JSON.parse(await readFile(new URL(name, AXIS_DIR), "utf8"));
  const subject = doc.subject_name;
  if (!subject) continue;
  for (const concept of doc.concept_longitudinal_map || []) {
    const words = [];
    for (const axis of concept.longitudinal_axes || []) {
      if (!axis || typeof axis !== "object") continue;
      for (const signal of axis.keyword_signals || []) {
        if (signal && typeof signal === "object") words.push(...(signal.keywords || []).filter(usable));
      }
    }
    if (!words.length) continue;
    const byConcept = axisWords.get(subject) || new Map();
    byConcept.set(concept.concept_name, [...new Set(words.map((one) => one.trim()))]);
    axisWords.set(subject, byConcept);
  }
}

const doc = JSON.parse(await readFile(MAP, "utf8"));
let added = 0;
let touched = 0;
const unmatched = [];

for (const [subject, byConcept] of axisWords) {
  const body = doc[subject];
  if (!body) { unmatched.push(subject); continue; }
  for (const [concept, words] of byConcept) {
    const entry = (body.concepts || {})[concept];
    if (!entry) { unmatched.push(`${subject}::${concept}`); continue; }
    const before = (entry.micro_keywords || []).length;
    entry.micro_keywords = [...new Set([...(entry.micro_keywords || []), ...words])];
    const gain = entry.micro_keywords.length - before;
    if (gain) { added += gain; touched += 1; }
  }
}

console.log(`손댄 단원 ${touched}개 · 더한 낱말 ${added}개`);
if (unmatched.length) console.log(`  짝을 못 찾은 것 ${unmatched.length}개: ${unmatched.slice(0, 6).join(", ")}…`);
if (WRITE) {
  await writeFile(MAP, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log("\n다시 썼습니다. 이어서 node tools/build_unit_choices_index.mjs --write 를 돌리세요.");
} else {
  console.log("\n(보여 주기만 했습니다. --write 를 붙이세요.)");
}
