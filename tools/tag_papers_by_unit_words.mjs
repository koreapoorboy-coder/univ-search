// 새로 넣은 과목(영어·한국사)의 논문에 **단원 꼬리표**를 낱말로 단다. ₩0.
//
// 꼬리표는 원래 GPT 가 "이 논문이 이 단원 탐구의 근거가 되는가"를 읽고 달았다(kci_paper_index). 그런데
// 영어·한국사 단원은 2026-09-20 에 새로 넣었으므로 그 과목 논문에는 우리 단원을 가리키는 꼬리표가 하나도
// 없다 — 그래서 재료가 한 편도 안 간다.
//
// GPT 를 다시 돌리는 대신, **단원마다 그 단원만 쓰는 낱말**을 손으로 정해 제목·키워드에 있는지 본다.
// 흔한 낱말(주제·인물·평가·문화·분석)은 일부러 뺀다 — 그런 낱말로 달면 아무 논문이나 붙는다.
// 붙은 뒤에도 런타임은 학생 글의 낱말이 제목에 걸리는지 한 번 더 보고, 쓸지 말지는 AI 가 고른다.
//
//   node tools/tag_papers_by_unit_words.mjs           — 몇 편이 붙는지만 보여 준다
//   node tools/tag_papers_by_unit_words.mjs --write   — 실제로 단다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");

// 단원 → 그 단원만 쓰는 낱말. 하나만 걸려도 꼬리표를 단다(낱말 자체가 좁다).
// build_paper_route.mjs 가 이 표를 가져다 쓴다. 묶음을 다시 만들 때마다 꼬리표가 같이 붙어야 한다 —
// 2026-09-21 에 수학을 넣으려고 묶음을 다시 만들었더니 여기서 단 꼬리표가 지워졌고, 영어 267건·
// 한국사 142건이 재료 없는 보고서가 됐다(전수 검사 69% → 53%).
import { WORDS } from "./unit_word_tags.mjs";


for (const [subject, units] of Object.entries(WORDS)) {
  const file = here(`../public/keyword-engine/seed/paper-route/${subject}.v1.json`);
  const pack = JSON.parse(await readFile(file, "utf8"));
  const list = Array.isArray(pack.units) ? [...pack.units] : [];
  const indexOfUnit = (name) => {
    const key = `${subject}::${name}`;
    const at = list.indexOf(key);
    if (at >= 0) return at;
    list.push(key);
    return list.length - 1;
  };
  let added = 0;
  const perUnit = {};
  for (const row of pack.rows || []) {
    const text = `${row[0] || ""} ${row[10] || ""}`;
    const hit = [];
    for (const [unit, words] of Object.entries(units)) {
      if (words.some((word) => text.includes(word))) hit.push(indexOfUnit(unit));
    }
    if (!hit.length) continue;
    const before = Array.isArray(row[8]) ? row[8] : [];
    const next = [...new Set([...before, ...hit])];
    if (next.length !== before.length) { added += 1; row[8] = next; }
    hit.forEach((at) => { perUnit[list[at]] = (perUnit[list[at]] || 0) + 1; });
  }
  pack.units = list;
  pack.note = `${pack.note || ""} 영어·한국사 단원 꼬리표는 tools/tag_papers_by_unit_words.mjs 가 낱말로 달았다(2026-09-20).`.trim();
  console.log(`${subject} — 꼬리표를 새로 단 논문 ${added}편 / 전체 ${(pack.rows || []).length}편`);
  Object.entries(perUnit).sort((a, b) => b[1] - a[1]).forEach(([unit, count]) => console.log(`   ${String(count).padStart(4)}  ${unit}`));
  if (WRITE) await writeFile(file, `${JSON.stringify(pack)}\n`, "utf8");
}
console.log(WRITE ? "다시 썼습니다." : "(보여 주기만 했습니다. 달려면 --write 를 붙이세요.)");
