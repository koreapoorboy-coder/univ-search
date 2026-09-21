// 과목마다 **논문 묶음**을 만든다. 학생 글로 논문을 찾는 자리(paper_route_v1.mjs)가 이걸 읽는다. ₩0.
//
// 전에는 개념마다 논문 3~8편을 미리 골라 두었다(kci_paper_index). 개념 이름으로 골랐으니, 학생이 무엇을
// 쓰든 같은 개념이면 같은 후보에서만 골랐다. 이제는 **학생 글이 검색어**다. 그러려면 과목의 논문을
// 통째로 들고 있어야 한다.
//
// 통째로는 너무 크다(통합사회 4만 편, 10MB). 그래서 **걸릴 수 없는 논문은 미리 뺀다.**
// 런타임 규칙은 '학생 글의 낱말 두 개가 제목에 함께'다. 학생 글의 낱말은 실제 수행평가 7,131건과
// 교육과정 축에서 온다고 보고, 그 낱말이 두 개도 안 걸리는 논문은 어떤 학생에게도 안 나온다고 본다.
// (그 밖의 낱말을 쓰는 학생은 놓친다 — 크기와 바꾼 값이다. 몇 편이 남는지 아래에 찍는다.)
//
//   node tools/build_paper_route.mjs           — 무엇이 들어가는지만 보여 준다
//   node tools/build_paper_route.mjs --write   — 실제로 만든다
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { taskWords, taskHit } from "../admission_worker_skeleton/univ_research_v1.mjs";
import { FRAME, isVerb } from "../admission_worker_skeleton/paper_route_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const CSV = process.argv.find((one) => /\.csv$/i.test(one))
  || "C:/Users/korea/Downloads/한국연구재단_KCI논문정보_20250825.csv";
const OUT_DIR = here("../public/keyword-engine/seed/paper-route/");
const TASKS = here("../public/keyword-engine/data/assessment/records/assessment_tasks.v1.jsonl");
const AXES = here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json");
const MAP = JSON.parse(await readFile(here("./subject_field_map_2026_09.json"), "utf8"));
// 새 길 전용 칸이 있으면 그것을 쓴다(route_why 에 까닭이 있다)
const FIELD_MAP = { ...MAP.subjects, ...(MAP.route_subjects || {}) };
const EXCLUDE = MAP.route_exclude || {};
const CORE = MAP.route_core || {};
// 제목에 이 말이 있으면 그 과목 묶음에서 뺀다. 분야만으로는 못 거르는 것이 있다 — 수학은 한글 제목
// 논문이 거의 다 수학교육 연구여서, 분야가 「자연과학 > 수학」이어도 학생이 쓸 수 없다.
const TITLE_OUT = MAP.route_title_exclude || {};

// 과목 → 계열. 수행평가 데이터의 subject_group 과 같은 이름이다.
const GROUP = {
  화학: "과학", 물리: "과학", 생명과학: "과학", 지구과학: "과학", "세포와 물질대사": "과학",
  "물질과 에너지": "과학", "역학과 에너지": "과학", "전자기와 양자": "과학", 지구시스템과학: "과학",
  통합과학1: "과학", 통합과학2: "과학", 과학탐구실험1: "과학", 과학탐구실험2: "과학",
  정보: "정보", 공통국어1: "국어", 공통국어2: "국어", 통합사회1: "사회", 통합사회2: "사회",
  영어: "영어", 한국사: "사회·역사·윤리",
  // 수학은 논문 묶음이 아예 없었다. 전수 검사에서 「단원은 정했는데 재료가 0개」인 566건 중 401건이
  // 수학이었다(공통수학1 128, 대수 98, 미적분1 77, 확률과 통계 56, 기하 42).
  공통수학1: "수학", 공통수학2: "수학", 대수: "수학", 미적분1: "수학", 기하: "수학", "확률과 통계": "수학",
};

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
const JOSA_TAIL = /(으로|에서|에게|의|가|이|은|는|을|를|에|와|과|도|로)$/;
const bare = (word) => { const cut = String(word || "").replace(JOSA_TAIL, ""); return cut.length >= 2 ? cut : String(word || ""); };
// 학생 글 → 찾는 말. 런타임(paperQuery)과 같은 길을 탄다.
const queryWords = (text) => [...taskWords(text)].map(bare).filter((word) => word.length >= 2 && !isVerb(word));

// ── 1. 논문을 읽는다 ─────────────────────────────────────────────────────
const papers = [];
{
  const stream = createInterface({ input: createReadStream(CSV, { encoding: "utf8" }), crlfDelay: Infinity });
  let head = null;
  for await (const line of stream) {
    if (!line.trim()) continue;
    const parts = cells(line);
    if (!head) { head = parts.map((one) => one.replace(/^\uFEFF/, "").trim()); continue; }
    const get = (name) => parts[head.indexOf(name)] || "";
    const title = korean(get("논문명(국문)"), get("논문명(외국어)")).trim();
    if (!title) continue;
    const names = [get("저자"), get("공동저자")].join(";").split(/[;,·]/).map((one) => one.trim()).filter(Boolean);
    const who = !names.length ? "" : names.length > 2 ? `${names[0]} 외` : names.join(" · ");
    const from = get("시작페이지").trim();
    const to = get("끝페이지").trim();
    papers.push({
      title: title.slice(0, 200), who,
      year: get("발행년").trim(),
      journal: (korean(get("학술지명(국문)"), get("학술지명(외국어)")) || get("학술지명(국문)") || get("학술지명(외국어)")).trim(),
      volume: get("권").trim(), issue: get("호").trim(), pages: from && to ? `${from}-${to}` : "",
      field: get("주제분야").trim(),
      // 주제 재료로 GPT 에 보낸다(설계서 단계). 제목만으로는 무엇을 바꾸고 재는지 안 보일 때가 많다.
      keywords: (get("키워드(국문)") || "").split(/[,;]/).map((one) => one.trim()).filter(Boolean).slice(0, 4).join(", ").slice(0, 50),
    });
  }
}
console.log(`논문 ${papers.length.toLocaleString()}편 (한글 제목이 있는 것)`);

// ── 2. 제목의 틀 말 ────────────────────────────────────────────────────
// 틀 말 목록(FRAME)은 paper_route_v1.mjs 에 손으로 적어 둔다. 통계로만 가르려 했더니 둘 다 실패했다:
//   · 많이 나오는 것만 빼면       → 인공지능·알고리즘·소설·읽기가 빠져 정보·국어 묶음이 거의 빈다
//   · 분야에 고르게 퍼진 것만 빼면 → 기반·양상·시사점이 남는다(분야마다 문체가 달라 한쪽에 몰려 보인다)
// 그래서 여기서는 **검토용으로만** 찍는다: 흔한 말 가운데 틀 말 목록에 없는 것. 새 틀 말이 보이면 목록에 더한다.
const df = new Map();
for (const paper of papers) {
  for (const word of new Set(queryWords(paper.title))) df.set(word, (df.get(word) || 0) + 1);
}
const COMMON_AT = Math.round(papers.length * 0.004);
const isFrameWord = (word) => FRAME.has(word) || /^\d+$/.test(word);
const unlisted = [...df].filter(([word, n]) => n >= COMMON_AT && !isFrameWord(word)).sort((a, b) => b[1] - a[1]);
console.log(`\n흔하지만 틀 말 목록에 없는 말 ${unlisted.length}개 (제목 ${COMMON_AT}편 이상) — 내용 말로 남는다:`);
console.log("  " + unlisted.map(([word, n]) => `${word}(${n})`).join(" "));
const commonSet = new Set([...df.keys()].filter(isFrameWord));

// ── 3. 계열별 학생 낱말 ─────────────────────────────────────────────────
const vocab = new Map(Object.values(GROUP).map((one) => [one, new Set()]));
const taskLines = (await readFile(TASKS, "utf8")).split(/\r?\n/).filter(Boolean);
for (const line of taskLines) {
  let task;
  try { task = JSON.parse(line); } catch { continue; }
  const bag = vocab.get(task.subject_group);
  if (!bag) continue;
  for (const word of queryWords(`${task.raw_task_title || ""} ${task.raw_task_desc || ""}`)) bag.add(word);
}
const axes = JSON.parse(await readFile(AXES, "utf8")).axes || {};
for (const axis of Object.values(axes)) {
  const bag = vocab.get(GROUP[axis.subject]);
  if (!bag) continue;
  for (const word of queryWords(`${axis.concept} ${axis.title} ${axis.output} ${axis.why}`)) bag.add(word);
}
for (const [group, bag] of vocab) {
  for (const word of commonSet) bag.delete(word);
  console.log(`\n${group} 계열 학생 낱말 ${bag.size.toLocaleString()}개`);
}

// 손으로 지운 것은 여기서도 지운다(fix_kci_paper). 개념과 상관없이 제목으로 지운다 — 그 논문들은
// 어느 과제에 붙어도 글자만 같은 것이었다.
const drops = (JSON.parse(await readFile(here("./fix_kci_paper_2026_09.json"), "utf8")).drops || [])
  .map((one) => one.title.replace(/\s+/g, ""));
const dropped = (title) => drops.some((head) => title.replace(/\s+/g, "").startsWith(head));

// 이 제목에 이 계열 낱말이 **서로 다른 것으로** 몇 개 걸리는가. 런타임 distinctHits 와 같다.
function distinctCount(title, bag) {
  const seen = new Set();
  const body = title;
  const tokens = body.split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
  for (const one of tokens) {
    const cut = bare(one);
    if (bag.has(one)) seen.add(one);
    if (bag.has(cut)) seen.add(cut);
    // 세 글자 이상은 붙은 말 안에서도 찾는다(급성림프모구백혈병 ⊃ 백혈병)
    for (let from = 0; from < one.length; from += 1) {
      for (let len = 3; from + len <= one.length && len <= 10; len += 1) {
        const piece = one.slice(from, from + len);
        if (bag.has(piece)) seen.add(piece);
      }
    }
  }
  const hit = [...seen].filter((word) => taskHit(body, word)).sort((a, b) => b.length - a.length);
  const kept = [];
  for (const word of hit) if (!kept.some((one) => one.includes(word))) kept.push(word);
  return kept.length;
}

// ── 4. 과목 묶음 ───────────────────────────────────────────────────────
// GPT 꼬리표(tools/classify_kci_papers.mjs). 논문이 **고교 어느 단원의 근거가 되는지**를 뜻으로 읽은 것이다.
//   · 이어지는 단원이 없는 논문(교육학·간호 직무 등)은 묶음에서 뺀다
//   · 있는 논문은 단원 번호와 난이도를 싣는다 — 보고서를 만들 때 **그 보고서의 단원과 같을 때만** 붙인다
//   · 아직 꼬리표가 없는 논문은 그대로 둔다(낱말 규칙으로만 판단한다)
let TAGS = {};
try { TAGS = JSON.parse(await readFile(here("../public/keyword-engine/build/.cache_kci_tags.json"), "utf8")); } catch { TAGS = {}; }
const LEVEL = { 쉬움: "e", 보통: "m", 어려움: "h" };
let unlinked = 0;
let tagged = 0;
const shards = {};
let handDropped = 0;
for (const [subject, fields] of Object.entries(FIELD_MAP)) {
  const bag = vocab.get(GROUP[subject]);
  if (!bag) continue;
  const out = EXCLUDE[subject] || [];
  const badWords = TITLE_OUT[subject] || [];
  const inField = papers.filter((paper) => fields.some((one) => paper.field.startsWith(one))
    && !out.some((one) => paper.field.startsWith(one))
    && !badWords.some((word) => paper.title.includes(word)));
  const rows = [];
  const seen = new Set();
  const units = [];
  const unitAt = (name) => { let at = units.indexOf(name); if (at < 0) { units.push(name); at = units.length - 1; } return at; };
  for (const paper of inField) {
    const key = paper.title.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    if (dropped(paper.title)) { handDropped += 1; continue; }
    if (distinctCount(paper.title, bag) < 2) continue;
    seen.add(key);
    // 마지막 칸: 중심 학문이면 1. 지도에 중심이 안 적힌 과목은 전부 1이다(route_core_why).
    const core = !CORE[subject] || CORE[subject].some((one) => paper.field.startsWith(one)) ? 1 : 0;
    const tag = TAGS[key];
    if (tag && !tag.concepts.length) { unlinked += 1; continue; }   // 이어지는 고교 단원이 없다
    if (tag) tagged += 1;
    rows.push([paper.title, paper.who, paper.year, paper.journal, paper.volume, paper.issue, paper.pages, core,
      tag ? tag.concepts.map(unitAt) : null, tag ? LEVEL[tag.level] || "" : "", paper.keywords || ""]);
  }
  shards[subject] = { fields, inField: inField.length, rows, units, core: rows.filter((row) => row[7]).length };
}

console.log("\n과목별 묶음:");
for (const [subject, one] of Object.entries(shards)) {
  const size = Buffer.byteLength(JSON.stringify(one.rows), "utf8");
  console.log(`  ${subject.padEnd(10)} 분야 ${String(one.inField).padStart(6)}편 → 묶음 ${String(one.rows.length).padStart(6)}편 (중심 학문 ${String(one.core).padStart(5)})  ${(size / 1e6).toFixed(2)}MB`);
}
console.log(`손으로 지운 것 ${handDropped}편 · GPT 꼬리표로 뺀 것(이어지는 단원 없음) ${unlinked}편 · 꼬리표 붙은 줄 ${tagged}`);

if (process.argv.includes("--write")) {
  await mkdir(OUT_DIR, { recursive: true });
  const meta = {
    source: "한국연구재단 KCI논문정보 (공공데이터포털 15083283, 2024년 발행분)",
    license: "이용허락범위 제한 없음",
    built_at: new Date().toISOString().slice(0, 10),
  };
  for (const [subject, one] of Object.entries(shards)) {
    const file = new URL(`${subject.replace(/\s+/g, "_")}.v1.json`, OUT_DIR);
    await writeFile(file, JSON.stringify({
      version: "paper-route-v1", subject, ...meta,
      fields: one.fields,
      note: "한 줄 = [제목, 저자, 연도, 학술지, 권, 호, 쪽, 중심 학문(1/0), 단원 번호들(units 의 자리, 꼬리표가 없으면 null), 난이도(e/m/h)]. 학생 글의 낱말 두 개가 제목에 함께 있고, 꼬리표가 있으면 보고서의 단원과 같아야 나온다(paper_route_v1.mjs).",
      units: one.units,
      rows: one.rows,
    }), "utf8");
  }
  console.log(`\n${OUT_DIR.pathname.replace(/^\//, "")} 에 썼습니다.`);
} else {
  console.log("\n(보여 주기만 했습니다. 만들려면 --write 를 붙이세요.)");
}
