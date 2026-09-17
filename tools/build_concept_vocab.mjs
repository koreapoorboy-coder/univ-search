// 개념마다 **논문이 쓰는 말**을 논문에서 배워 온다. 전수로 읽는다. AI를 쓰지 않으므로 ₩0이다.
//
// 왜 필요한가. 우리 개념 이름은 교과서 말이고(「효소와 대사 반응」), 논문은 학술 말을 쓴다
// (효소활성, 기질특이성, 활성도 측정). 그 사이를 나는 지금까지 정규식으로 이으려 했고, 하루 종일
// 같은 실패를 되풀이했다. 이을 것이 아니라 **배워 와야 한다.**
//
// **무엇을 배워 오는가.** 사용자가 논문을 넣는 까닭을 분명히 했다:
//   "우리는 그 논문의 전체를 쓰는 게 아니다. 수행평가에 포함된 부분만 인용한다.
//    관련 방법을 탐구하다가 관련 논문의 내용이 나왔고, 그것으로 데이터 수집이나 형태를 쓰는 것이다."
// 그러니 이어지는 지점은 **방법과 데이터의 모양**이다. 주제어(효소·대사)만 모으면 "같은 주제구나"로
// 끝나고, 방법어(활성도 측정·조건별 비교·흡광도)를 모아야 학생이 실제로 인용할 대목이 걸린다.
// 그래서 여기서는 **방법어를 버리지 않는다.** 다른 자리에서 '넓은 말'이라고 버리던 것들이다 —
// 거기서는 주제를 가리는 것이 일이었고, 여기서는 쓸 대목을 찾는 것이 일이다. 목적이 다르면 기준도 다르다.
//
// **어떻게 고르는가 — 들림(lift).**
// 그냥 많이 나오는 말을 고르면 그 분야에서 흔한 말이 다 올라온다(연구·분석·효과). 그래서
// **같은 분야 전체보다 이 개념에서 얼마나 더 자주 나오는가**를 본다. 분야 평균보다 크게 튀는 말이
// 그 개념을 가리키는 말이다.
//
//   node tools/build_concept_vocab.mjs           — 무엇이 뽑히는지만 보여 준다
//   node tools/build_concept_vocab.mjs --write   — 실제로 만든다
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { pointers, stem } from "../admission_worker_skeleton/univ_research_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const CSV = process.argv.find((one) => /\.csv$/i.test(one))
  || "C:/Users/korea/Downloads/한국연구재단_KCI논문정보_20250825.csv";
const OUT = here("../public/keyword-engine/seed/engine-index/concept_vocab.v1.json");
const axisIndex = JSON.parse(await readFile(here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const MAP_FILE = JSON.parse(await readFile(here("./subject_field_map_2026_09.json"), "utf8"));
// **어휘를 배울 때는 더 좁게 본다.** 고를 때는 낱말 두 개와 손 검수가 받쳐 주지만, 배울 때는
// 씨앗이 조금만 섞여도 사전 전체가 오염된다 — 생명과학에 의약학을 넣었더니 「세포의 구조와 물질
// 이동」 어휘가 '시신경염·수초희소돌기아교세포당단백질'이 되었다. 의약학이 생물학보다 열 배 많다.
const FIELD_MAP = { ...MAP_FILE.subjects, ...(MAP_FILE.vocab_subjects || {}) };

function cells(line) {
  const out = [];
  let now = "";
  let quoted = false;
  for (let at = 0; at < line.length; at += 1) {
    const ch = line[at];
    if (quoted) {
      if (ch === '"' && line[at + 1] === '"') { now += '"'; at += 1; }
      else if (ch === '"') quoted = false;
      else now += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(now); now = ""; }
    else now += ch;
  }
  out.push(now);
  return out;
}

const HANGUL = /[가-힣]/g;
const korean = (...values) => values.find((one) => (String(one || "").match(HANGUL) || []).length >= 2) || "";

// 키워드는 쉼표·세미콜론·가운뎃점으로 이어져 온다. 마침표로 끝나는 줄도 있다.
function splitKeywords(raw) {
  return String(raw || "")
    .split(/[,;·ㆍ、|/]+/)
    .map((one) => one.replace(/[.\s]+$/, "").trim())
    .filter((one) => one.length >= 2 && one.length <= 20 && (one.match(HANGUL) || []).length >= 2);
}

// 방법·데이터의 모양을 가리키는 말인가. **이런 말이 학생이 인용할 대목으로 이어진다.**
const METHOD = /^(측정|분석|평가|관찰|실험|조사|비교|검사|진단|예측|모형화|모델링|시뮬레이션|산출|추정|검출|정량화|측정법|분석법|관측|계측|탐지|판별|분류|추적)$/;
// 제목에서 "앞말 + 방법말"을 뽑는다. "활성도 측정", "조건별 비교", "함량 분석".
const NOT_HEAD = /^(연구|논문|위한|통한|대한|따른|관한|이용|활용|중심|결과|영향|효과|방안|사례|고찰|검토|제안|개발)$/;
function methodPhrases(title) {
  const out = [];
  const toks = String(title || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
  for (let at = 1; at < toks.length; at += 1) {
    const tail = stem(toks[at]);
    if (!METHOD.test(tail)) continue;
    const head = stem(toks[at - 1]);
    if (head.length < 2 || NOT_HEAD.test(head)) { out.push(tail); continue; }
    out.push(`${head} ${tail}`);
  }
  return out;
}

const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!FIELD_MAP[axis.subject]) continue;          // 수학처럼 사전에 없는 과목은 건너뛴다
  rows.push({ axis, key, aim: new Set(pointers(axis.concept, axis.subject)) });
}

// 개념마다: 이 개념 논문의 키워드 세기 / 같은 분야 전체의 키워드 세기
const mine = new Map(rows.map((one) => [one.key, new Map()]));
const mineTotal = new Map(rows.map((one) => [one.key, 0]));
const mineMethod = new Map(rows.map((one) => [one.key, new Map()]));
const fieldCount = new Map();                      // 과목 → (키워드 → 편수)
const fieldTotal = new Map();
for (const one of rows) {
  if (!fieldCount.has(one.axis.subject)) { fieldCount.set(one.axis.subject, new Map()); fieldTotal.set(one.axis.subject, 0); }
}

const bump = (table, word) => table.set(word, (table.get(word) || 0) + 1);
const inField = (subject, field) => (FIELD_MAP[subject] || []).some((one) => String(field || "").startsWith(one));

// **분야가 좁으면 씨앗 규칙을 느슨하게 해도 된다.**
//
// 오염은 넓은 분야에서 생겼다 — 생명과학에 의약학(14,010편)을 넣었을 때 '세포' 하나로 의학 논문이
// 전부 씨앗이 되었다. 그런데 「자연과학 > 화학」은 358편뿐이고, 그 안에서 '분자'가 든 논문은
// 그냥 화학 논문이다. 분야가 이미 가려 주면 낱말 하나로도 안전하다.
//
// 그리고 우리 쪽 사정도 있다. KCI 2024년 한 해치에 자연과학은 6,939편뿐이라(전체의 6%),
// 낱말 둘을 요구하면 과학 개념은 씨앗이 열 몇 편에 그친다. 그걸로는 어휘라고 할 수 없다.
const NARROW = 3000;
async function countFields() {
  const total = new Map();
  let first = null;
  const rl = createInterface({ input: createReadStream(CSV, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = cells(line);
    if (!first) { first = parts.map((one) => one.replace(/^﻿/, "").trim()); continue; }
    const field = parts[first.indexOf("주제분야")] || "";
    for (const subject of Object.keys(FIELD_MAP)) {
      if (inField(subject, field)) total.set(subject, (total.get(subject) || 0) + 1);
    }
  }
  return total;
}
const fieldSize = await countFields();
console.log("과목마다 볼 수 있는 편수 (좁으면 씨앗 규칙을 느슨하게 한다)");
for (const [s, n] of [...fieldSize].sort((a, b) => a[1] - b[1])) {
  console.log(`  ${s.padEnd(16)} ${String(n).padStart(6)}  ${n < NARROW ? "좁음 → 낱말 1개" : "넓음 → 낱말 2개"}`);
}
console.log("");

let read = 0;
let head = null;
const stream = createInterface({ input: createReadStream(CSV, { encoding: "utf8" }), crlfDelay: Infinity });
for await (const line of stream) {
  if (!line.trim()) continue;
  const parts = cells(line);
  if (!head) { head = parts.map((one) => one.replace(/^\uFEFF/, "").trim()); continue; }
  read += 1;
  const get = (name) => parts[head.indexOf(name)] || "";
  const title = korean(get("논문명(국문)"), get("논문명(외국어)"));
  const keywords = splitKeywords(korean(get("키워드(국문)"), get("키워드(외국어)")));
  if (!title || !keywords.length) continue;
  const field = get("주제분야");
  const words = new Set([...title.split(/[^가-힣A-Za-z0-9]+/).map(stem), ...keywords]);

  const subjectsHere = new Set();
  for (const one of rows) {
    if (!inField(one.axis.subject, field)) continue;
    subjectsHere.add(one.axis.subject);
    // 씨앗: 개념을 가리키는 말이 제목이나 키워드에 하나라도 있으면 이 개념의 논문으로 본다.
    // 여기서는 느슨해도 된다 — 어휘를 모으는 일이라, 몇 편 섞여도 들림(lift)이 걸러 준다.
    // 씨앗은 **개념을 가리키는 말이 둘 이상** 보여야 한다. 하나로는 '세포'가 든 의학 논문이 전부
    // 씨앗이 된다. 느슨하게 두고 들림(lift)으로 거르려 했는데, 씨앗 자체가 딴 분야면 소용이 없다.
    const seedHits = [...one.aim].filter((word) =>
      words.has(word) || title.includes(word) || keywords.some((k) => k.includes(word)));
    const need = (fieldSize.get(one.axis.subject) || 0) < NARROW ? 1 : 2;
    if (seedHits.length < Math.min(need, one.aim.size)) continue;
    const table = mine.get(one.key);
    for (const word of new Set(keywords)) bump(table, word);
    // **방법어는 키워드에 거의 없다.** 논문 키워드는 주제어 위주다("효소활성","온도"). 방법은
    // 제목에 나온다 — "~의 활성도 측정", "조건별 비교". 한 낱말("측정")보다 앞말을 붙인
    // 두 낱말("활성도 측정")이 학생에게 쓸모가 있다.
    for (const phrase of new Set(methodPhrases(title))) bump(mineMethod.get(one.key), phrase);
    mineTotal.set(one.key, mineTotal.get(one.key) + 1);
  }
  for (const subject of subjectsHere) {
    const table = fieldCount.get(subject);
    for (const word of new Set(keywords)) bump(table, word);
    fieldTotal.set(subject, fieldTotal.get(subject) + 1);
  }
  if (read % 20000 === 0) process.stdout.write(`\r읽는 중 ${read.toLocaleString()}편        `);
}
process.stdout.write("\r" + " ".repeat(40) + "\r");

const vocab = {};
let filled = 0;
for (const one of rows) {
  const table = mine.get(one.key);
  const papers = mineTotal.get(one.key);
  // **씨앗이 얇으면 싣지 않는다.** 15편에서 뽑은 '어휘'는 어휘가 아니라 우연이다 — 실제로
  // '분자동역학' 한 낱말이 화학·역학 시스템·액체의 물성 세 개념에 똑같이 올라왔다.
  // 이 저장소의 방식대로, 없는 것은 비워 둔다.
  if (papers < 30) continue;
  const field = fieldCount.get(one.axis.subject);
  const fieldN = fieldTotal.get(one.axis.subject) || 1;
  const scored = [];
  // 방법어: 이 개념 논문 제목에 실제로 얼마나 나왔는가로 고른다. 들림(lift)으로 재면 안 된다 —
  // 방법어는 그 분야 전체에도 흔한 것이 정상이라 전부 떨어진다.
  const methodScored = [...mineMethod.get(one.key)]
    .filter(([, n]) => n >= Math.max(2, Math.round(papers * 0.03)))
    .sort((a, b) => b[1] - a[1]).map(([word]) => word);
  // 문턱은 씨앗 수에 맞춘다. 씨앗이 20편인데 4편을 요구하면 20%여야 하고, 씨앗이 800편이면
  // 4편은 0.5%다 — 같은 숫자가 전혀 다른 뜻이 된다. 자연과학은 논문이 적어 이걸 안 맞추면 다 떨어진다.
  const floor = Math.max(3, Math.round(papers * 0.02));
  for (const [word, count] of table) {
    if (count < floor) continue;
    const hereRate = count / papers;
    const thereRate = (field.get(word) || count) / fieldN;
    const lift = hereRate / Math.max(thereRate, 1 / fieldN);
    const method = METHOD.test(word);
    // **방법어는 들림으로 거르지 않는다.** 방법어는 그 분야 전체에도 흔한 것이 정상이다 —
    // '측정'·'분석'은 어느 개념에서나 쓴다. 들림으로 재면 전부 떨어져서, 정작 사용자가 원한
    // 것(학생이 인용할 대목)이 하나도 안 남는다. 방법어는 **이 개념에서 실제로 얼마나 쓰였는가**로
    // 고른다. 주제어는 그 개념만의 말이어야 하므로 들림으로 고른다. 목적이 다르면 기준도 다르다.
    if (method) {
      if (hereRate < 0.04) continue;
    } else if (lift < 1.8) continue;
    scored.push({ word, count, lift: Number(lift.toFixed(2)), rate: Number(hereRate.toFixed(3)), method });
  }
  scored.sort((a, b) => (b.method ? b.rate : b.lift / 10) - (a.method ? a.rate : a.lift / 10) || b.count - a.count);
  if (!scored.length && !methodScored.length) continue;
  filled += 1;
  vocab[one.key] = {
    papers,
    topic: scored.slice(0, 24).map((x) => x.word),
    method: methodScored.slice(0, 12),
  };
}

console.log(`논문 ${read.toLocaleString()}편을 전수로 읽었습니다 (AI 안 씀 · ₩0)`);
console.log(`개념 ${rows.length}개 가운데 ${filled}개에 어휘가 모였습니다\n`);
let shown = 0;
for (const one of rows) {
  const got = vocab[one.key];
  if (!got) continue;
  shown += 1;
  console.log(`  ${one.key}  (씨앗 ${got.papers}편)`);
  console.log(`     주제어: ${got.topic.slice(0, 10).join(" · ") || "(없음)"}`);
  console.log(`     방법어: ${got.method.slice(0, 8).join(" · ") || "(없음)"}`);
}

if (process.argv.includes("--write")) {
  await writeFile(OUT, JSON.stringify({
    version: "concept-vocab-v1",
    built_at: new Date().toISOString().slice(0, 10),
    source: "한국연구재단 KCI논문정보 (공공데이터포털 15083283, 2024년 발행분 111,576편 전수)",
    note: "개념마다 논문이 쓰는 말. 주제어는 '같은 주제인가'를, 방법어는 '학생이 인용할 대목이 있는가'를 가린다. 논문 전체가 아니라 수행평가에 닿는 대목만 쓰기 때문에 방법어가 중요하다.",
    limit: "**과학 개념에는 어휘가 안 모인다.** KCI 2024년 한 해치에 자연과학은 6,939편(6%)뿐이다. 씨앗 30편 미만은 싣지 않는다. 과학 어휘는 NTIS 우수성과·과제 요약문에서 배워 오는 것이 맞다.",
    concepts: vocab,
  }, null, 2), "utf8");
  console.log(`\n${OUT.pathname.replace(/^\//, "")}`);
} else {
  console.log("\n(보여 주기만 했습니다. 만들려면 --write 를 붙이세요.)");
}
