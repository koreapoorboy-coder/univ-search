// Builds the lookup that answers "which 고교 개념 does this 대학 전공 과목 sit on top of".
//
// The engine owns 24 subject maps with 162 concepts, and every concept carries the words it is made of —
// concept_name, core_focus, the axis short labels and the keyword signals. 3,688 words in all. A university
// course name is short (경영통계, 전자기학, 빅데이터분석과응용), so the link has to be made on those words rather
// than on anyone's opinion about what a course is "like".
//
// Usage (repo root): node tools/build_concept_term_index.mjs
// Output: public/keyword-engine/seed/engine-index/concept_term_index.v1.json
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const axisDir = join(repo, "public/keyword-engine/seed/followup-axis");
const outDir = join(repo, "public/keyword-engine/seed/engine-index");

const clip = (value, max) => String(value ?? "").trim().slice(0, max);
const split = (value) => String(value ?? "").split(/[,·/、]|\s{2,}/).map((part) => part.trim()).filter(Boolean);

// Words that appear in almost every course title and say nothing about which concept it rests on.
const EMPTY = new Set([
  "원론", "개론", "입문", "기초", "이해", "이론", "실무", "실습", "응용", "활용", "연습", "세미나", "특강",
  "관리", "시스템", "분석", "설계", "개발", "연구", "탐구", "학과", "전공", "과목", "학년", "학점",
  "일반", "종합", "심화", "고급", "현대", "최신", "캡스톤디자인", "졸업논문", "인턴십", "현장실습",
]);

const concepts = {};
const byTerm = new Map();
let subjects = 0;

for (const file of readdirSync(axisDir).filter((name) => name.endsWith("_concept_longitudinal_map.json"))) {
  let map;
  try { map = JSON.parse(readFileSync(join(axisDir, file), "utf8")); } catch { continue; }
  const subject = clip(map.subject_name, 30) || file.replace("_concept_longitudinal_map.json", "");
  subjects += 1;
  for (const concept of map.concept_longitudinal_map || []) {
    const name = clip(concept.concept_name || concept.concept_key, 60);
    if (!name) continue;
    const id = `${subject}::${name}`;
    if (concepts[id]) continue;

    const terms = new Set();
    for (const source of [concept.concept_name, concept.concept_key, concept.concept_label, concept.core_focus]) {
      for (const term of split(source)) terms.add(term);
    }
    const axes = concept.longitudinal_axes || concept.axes || [];
    for (const axis of axes) {
      for (const term of split(axis.axis_short)) terms.add(term);
      for (const signal of axis.keyword_signals || []) {
        for (const word of signal.keywords || []) terms.add(clip(word, 30));
      }
    }
    const list = [...terms].map((term) => clip(term, 30)).filter((term) => term.length >= 2 && !EMPTY.has(term));
    if (!list.length) continue;

    concepts[id] = {
      subject,
      concept: name,
      focus: clip(concept.core_focus, 200),
      // Where this concept already leads, so a matched course can be shown with the axis it belongs to.
      axes: axes.map((axis) => ({ title: clip(axis.axis_title, 60), domain: clip(axis.axis_domain, 20), next: (axis.next_subjects || []).map((s) => clip(s, 30)).slice(0, 6) })).slice(0, 5),
      terms: list,
    };
    for (const term of list) {
      if (!byTerm.has(term)) byTerm.set(term, new Set());
      byTerm.get(term).add(id);
    }
  }
}

// Over half the terms are phrases — "전자기 유도와 전자기파", "확률의 뜻과 기본 성질". A course is called 전자기학,
// so the phrase has to be indexed by its parts too or the two never meet. Parts count for less than the whole.
const PARTICLE = /(와|과|의|에서의|에|을|를|은|는|이|가|로|으로)$/;
// 통계적 → 통계, 규칙성 → 규칙. Without this a course called 경영통계 never reaches 확률과 통계's "통계적 추정".
const SUFFIX = /(적|성|화|론|법)$/;
const parts = new Map();
const addPart = (word, ids) => {
  if (word.length < 2 || EMPTY.has(word)) return;
  if (!parts.has(word)) parts.set(word, new Set());
  for (const id of ids) parts.get(word).add(id);
};
// Korean phrases are head-final: the last word is the general category (양자 *컴퓨터*, 확률의 기본 *성질*) and the
// ones before it carry what the phrase is actually about. Indexing the head made 컴퓨터프로그래밍 look like quantum
// computing, so only the modifiers are taken.
for (const [term, ids] of byTerm) {
  if (!/\s/.test(term)) continue;
  for (const raw of term.split(/\s+/).slice(0, -1)) {
    const word = raw.replace(PARTICLE, "");
    addPart(word, ids);
    const root = word.replace(SUFFIX, "");
    if (root !== word) addPart(root, ids);
  }
}

// The subject's own name is the strongest link there is: a course called 경영통계 belongs with 확률과 통계, and
// 미분방정식 with 미적분, however their concept words happen to fall.
const bySubject = new Map();
for (const [id, concept] of Object.entries(concepts)) {
  for (const raw of concept.subject.split(/\s+|과 /)) {
    const word = raw.replace(PARTICLE, "").replace(/[0-9IVXⅠⅡ]+$/, "");
    if (word.length < 2) continue;
    if (!bySubject.has(word)) bySubject.set(word, new Set());
    bySubject.get(word).add(id);
  }
}

// A word shared by many concepts says less about any one of them — the same weighting the axis index uses.
const terms = {};
const size = (term) => (term.length >= 4 ? 1.4 : term.length >= 3 ? 1.15 : 1);
for (const [term, ids] of byTerm) {
  terms[term] = [...ids].map((id) => [id, Math.round((100 / Math.sqrt(ids.size)) * size(term)) / 100]);
}
for (const [word, ids] of parts) {
  if (terms[word]) continue;
  terms[word] = [...ids].map((id) => [id, Math.round((100 / Math.sqrt(ids.size)) * size(word) * 0.6) / 100]);
}
// A subject-name hit lands on every concept in that subject, so it is deliberately weak per concept — enough to
// break a tie toward the right subject, not enough to decide a match on its own.
// A subject-name hit is not weakened by how many concepts that subject has — 경영통계 belongs with 확률과 통계
// whether that subject holds 4 concepts or 40. It lands on all of them equally and the concept words break the tie.
const subjectTerms = {};
for (const [word, ids] of bySubject) {
  const weight = Math.round(80 * size(word)) / 100;
  subjectTerms[word] = [...ids].map((id) => [id, weight]);
}

const out = {
  version: "concept-term-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "seed/followup-axis/*_concept_longitudinal_map.json",
  note: "고교 개념 → 그 개념을 이루는 낱말. 대학 전공 과목명을 이 낱말로 되짚어 어떤 고교 개념 위에 서 있는지 찾는다.",
  concepts,
  terms,
  subjectTerms,
};

mkdirSync(outDir, { recursive: true });
const path = join(outDir, "concept_term_index.v1.json");
writeFileSync(path, JSON.stringify(out), "utf8");
console.log(`과목 ${subjects} · 개념 ${Object.keys(concepts).length} · 낱말 ${Object.keys(terms).length} · 과목이름 ${Object.keys(subjectTerms).length}`);
console.log(`wrote ${path} (${Math.round(JSON.stringify(out).length / 1024)}KB)`);
