// 안내문에서 단원을 얼마나 찾아내는지, 그리고 문턱을 낮추면 무엇이 무너지는지 전수로 잰다. ₩0.
//
// 화면은 단원 후보를 고를 때, 「안내문에서 읽었어요」라고 말할지 「저희가 골라 두었어요」라고
// 말할지를 점수로 가른다(unit_choice_picker_v1.js 의 fromTask). 지금 문턱은 **2점**이다 —
// 단원 이름이 통째로 있거나(2점), 단원 낱말이 둘 이상 맞아야 한다.
//
// 운영 검사 2026-09-22(인공지능 기초): 안내문이 「학습 데이터의 편향을 주제로」라고 또렷이
// 말했는데 화면은 「안내문에 주제가 없어서 저희가 골라 두었어요」라고 했다. 「편향」 하나만
// 맞아 1점이었기 때문이다. 학생이 보기에 이건 거짓말이다.
//
// 그렇다고 문턱을 1점으로 내리면, 「분석」·「자료」 같은 아무 데나 있는 말 하나로 엉뚱한 단원을
// 「안내문에서 읽었다」고 우기게 된다. 그래서 내려도 되는지를 **재고 나서** 정한다.
//
//   node tools/eval_unit_from_task.mjs [--show=20]
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const show = Number((process.argv.find((a) => a.startsWith("--show=")) || "").split("=")[1] || 0);
const corpus = join(repo, "public/keyword-engine/data/assessment/records/assessment_tasks.v1.jsonl");
const indexPath = join(repo, "public/keyword-engine/seed/engine-index/unit_choices.v1.json");
const pickerPath = join(repo, "public/keyword-engine/assets/js/unit_choice_picker_v1.js");

// 점수 매기는 법은 **화면이 쓰는 그 코드**를 그대로 떼어 와서 쓴다. 베껴 두면 화면을 고쳤을 때
// 여기가 옛 규칙으로 재고 있어도 아무도 모른다.
const source = readFileSync(pickerPath, "utf8");
const cut = source.match(/function hits\(row, task\) \{[\s\S]*?\n  \}/);
if (!cut) throw new Error("화면 코드에서 hits() 를 못 찾았습니다 — 함수 모양이 바뀌었는지 보세요.");
const hits = new Function(`${cut[0]}; return hits;`)();

// 지금 문턱이 정말 2점인지 확인한다. 화면이 바뀌었는데 여기가 옛 숫자로 말하면 안 된다.
if (!/const fromTask = \(Boolean\(found\) && plain\(row\.c\) === found\) \|\| score >= 2;/.test(source)) {
  throw new Error("화면의 fromTask 규칙이 바뀌었습니다 — 이 도구의 가정을 다시 맞추세요.");
}

const index = JSON.parse(readFileSync(indexPath, "utf8"));
const subjects = index.subjects || {};

// 학교 평가계획이 쓰는 과목 이름과 우리 화면의 이름이 다를 때가 있다. 「물리학」과 「물리」,
// 「통합과학」과 「통합과학1」은 같은 과목인데, 이름이 다르다고 재지 않으면 측정이 한쪽으로
// 기운다. 아래는 **같은 과목의 다른 표기**만 적은 것이다 — 다른 과목을 억지로 끌어오지 않는다.
const ALIAS = {
  "물리학": "물리", "물리학Ⅰ": "물리", "물리학I": "물리",
  "화학Ⅰ": "화학", "화학I": "화학",
  "생명과학Ⅰ": "생명과학", "생명과학I": "생명과학",
  "지구과학Ⅰ": "지구과학", "지구과학I": "지구과학",
  "통합과학": "통합과학1", "통합사회": "통합사회1",
  "과학탐구실험": "과학탐구실험1",
  "미적분": "미적분1", "공통국어": "공통국어1", "공통수학": "공통수학1",
  "공통영어": "영어", "공통영어1": "영어", "공통영어2": "영어",
};
const pick = (row) => {
  for (const name of [row.subject_raw, row.subject_standard]) {
    const one = String(name || "").trim();
    if (subjects[one]) return { name: one, list: subjects[one] };
    const alias = ALIAS[one];
    if (alias && subjects[alias]) return { name: alias, list: subjects[alias] };
  }
  return null;
};

const rows = [];
const rl = createInterface({ input: createReadStream(corpus, "utf8"), crlfDelay: Infinity });
for await (const line of rl) {
  const one = line.trim();
  if (!one) continue;
  try { rows.push(JSON.parse(one)); } catch { /* 깨진 줄은 센 다음 버린다 */ }
}

let noSubject = 0;
const seen = [];
for (const row of rows) {
  const found = pick(row);
  if (!found || !found.list.length) { noSubject += 1; continue; }
  const list = found.list;
  const task = `${row.raw_task_title || ""} ${row.raw_task_desc || ""}`.trim();
  if (!task) { noSubject += 1; continue; }
  const scored = list.map((one) => ({ concept: one.c, ...hits(one, task) }))
    .sort((a, b) => (b.score - a.score) || a.concept.localeCompare(b.concept, "ko"));
  const top = scored[0];
  const tie = scored.filter((one) => one.score === top.score && top.score > 0).length;
  seen.push({ subject: found.name, group: row.subject_group || "", task, top, tie, best: top.score });
}

const total = seen.length;
const at = (t) => seen.filter((one) => one.best >= t).length;
const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

console.log(`과제 ${rows.length}건 중 단원 목록이 있는 과목 ${total}건으로 잽니다 (목록 없는 과목·빈 안내문 ${noSubject}건 제외).\n`);
console.log("문턱별로 「안내문에서 읽었어요」라고 말하게 되는 비율");
for (const t of [1, 2, 3]) console.log(`  ${t}점 이상 : ${String(at(t)).padStart(5)}건  ${pct(at(t))}${t === 2 ? "   ← 지금" : ""}`);


// 갈래별로도 본다. 과목마다 안내문이 단원을 얼마나 또렷이 말하는지가 다르다.
console.log("\n== 갈래별 (지금 문턱 2점 기준)");
for (const name of [...new Set(seen.map((one) => one.group))].filter(Boolean).sort()) {
  const mine = seen.filter((one) => one.group === name);
  const read = mine.filter((one) => one.best >= 2).length;
  const some = mine.filter((one) => one.best === 1).length;
  const at100 = (n) => `${((n / mine.length) * 100).toFixed(0)}%`;
  console.log(`  ${name.padEnd(12)} ${String(mine.length).padStart(5)}건 중 읽어냄 ${String(read).padStart(4)} (${at100(read)}) · 걸렸지만 못 좁힘 ${String(some).padStart(4)} (${at100(some)})`);
}
// 문턱을 1점으로 내리면 새로 「읽었다」고 말하게 되는 과제들. 이것들이 믿을 만한가가 핵심이다.
const flips = seen.filter((one) => one.best === 1);
const tied = flips.filter((one) => one.tie > 1);
const oneWord = flips.map((one) => (one.top.matched[0] || ""));
const short = oneWord.filter((w) => w.length <= 3).length;
console.log(`\n1점으로 내리면 새로 「읽었다」고 말하는 과제 ${flips.length}건 (${pct(flips.length)})`);
console.log(`  그중 맨 위 단원이 다른 단원과 동점이라 사실상 찍기 : ${tied.length}건 (${((tied.length / Math.max(1, flips.length)) * 100).toFixed(1)}%)`);
console.log(`  맞은 낱말이 세 글자 이하(「분석」·「자료」 같은 말)    : ${short}건 (${((short / Math.max(1, flips.length)) * 100).toFixed(1)}%)`);

// 낱말의 **흔함**을 재는 편이 낫다. 글자 수는 좋은 잣대가 아니다 — 「편향」·「효소」는 두 글자인데
// 또렷하고, 「평가」·「정리」도 두 글자인데 아무 데나 있다. 대신 그 낱말을 가진 단원이 온 과목을
// 통틀어 몇 개인지를 센다. 한 단원에만 있는 말이면 그 말이 나왔을 때 단원을 짚아도 된다.
const spread = new Map();
for (const list of Object.values(subjects)) {
  for (const one of list) {
    for (const w of new Set(one.w || one.k || [])) spread.set(w, (spread.get(w) || 0) + 1);
  }
}

// 동점이 아니고, 맞은 낱말이 온 과목을 통틀어 한 단원에만 있는 말일 때만 1점을 믿는 규칙.
const safe = flips.filter((one) => one.tie === 1 && spread.get(one.top.matched[0] || "") === 1);
console.log(`\n「동점 아님 + 그 낱말이 한 단원에만 있는 말」일 때만 1점을 믿으면`);
console.log(`  새로 읽어내는 과제 : ${safe.length}건 (${pct(safe.length)})`);
console.log(`  합계 비율         : ${pct(at(2) + safe.length)}  (지금 ${pct(at(2))})`);

const words = new Map();
for (const one of flips) { const w = one.top.matched[0] || "(단원 이름)"; words.set(w, (words.get(w) || 0) + 1); }
console.log(`\n1점을 만든 낱말 많은 차례 (상위 15개)`);
for (const [w, n] of [...words].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(4)}건  ${w}`);

if (show) {
  console.log(`\n눈으로 볼 보기 ${show}건 (새 규칙에 걸린 것)`);
  for (const one of safe.slice(0, show)) {
    console.log(`  · [${one.subject}] 「${one.top.matched[0]}」 → ${one.top.concept}`);
    console.log(`      ${one.task.slice(0, 90)}`);
  }
}
