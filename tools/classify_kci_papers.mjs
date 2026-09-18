// KCI 논문마다 **뜻을 읽어** 고교 단원에 잇는다. GPT 를 쓴다 — 돈이 든다(끝에 원으로 찍는다).
//
// 제목 낱말 두 개로 고르면 약한 논문이 섞였다(운영 테스트 2026-09-18):
//   · 해수면 온도 과제에 「학생들의 기후변화 개념 이해 — 교육학 메타분석」 (「온난화」+「지구」)
//   · 판 구조 과제에 「비만 쥐에서 … 지질과 근육 대사」 (땅의 지질 ↔ 몸의 지질)
//   · 화학 결합 과제에 「공유 자전거 … 모형의 결합」
// GPT 는 제목·키워드·분야를 읽고 **이 논문이 고등학생의 어느 단원 탐구를 실제로 받쳐 줄 수 있는지** 고른다.
// 한 번 붙여 두면 보고서를 만들 때는 꼬리표만 읽는다(₩0). 새 논문만 다시 붙인다.
//
//   node tools/classify_kci_papers.mjs --limit 200 --model gpt-5        — 시험
//   node tools/classify_kci_papers.mjs --model gpt-5-mini --out <파일>   — 다른 모델로 따로 저장해 비교
//   node tools/classify_kci_papers.mjs                                    — 아직 안 붙인 논문 전부
//
// 키는 환경 변수 OPENAI_API_KEY 에서 읽는다.
import { createReadStream } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const here = (name) => new URL(name, import.meta.url);
const arg = (name, fallback = "") => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
const MODEL = arg("--model", "gpt-5");
const LIMIT = Number(arg("--limit", "0"));
const TAGS = arg("--out", "") ? new URL(`file:///${arg("--out")}`) : here("../public/keyword-engine/build/.cache_kci_tags.json");
const PICK = arg("--pick", "");   // 시험용: 이 파일에 적힌 제목들만
const CSV = "C:/Users/korea/Downloads/한국연구재단_KCI논문정보_20250825.csv";
const WON = 1385;
const PRICE = { "gpt-5": { in: 1.25e-6, out: 10e-6 }, "gpt-5-mini": { in: 0.25e-6, out: 2e-6 } }[MODEL] || { in: 1.25e-6, out: 10e-6 };
const BATCH = 40;
const LANES = Number(arg("--lanes", "8"));
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY 가 없습니다.");
const norm = (title) => String(title || "").replace(/\s+/g, "");

// 개념 목록(번호로 고르게 한다)
const axes = JSON.parse(await readFile(here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json"), "utf8")).axes || {};
const concepts = [];
for (const axis of Object.values(axes)) {
  const name = `${axis.subject}::${axis.concept}`;
  if (!concepts.includes(name)) concepts.push(name);
}

// 묶음에 든 논문(중복 뺌)
const dir = here("../public/keyword-engine/seed/paper-route/");
const wanted = new Map();
for (const file of await readdir(dir)) {
  if (!file.endsWith(".v1.json")) continue;
  const shard = JSON.parse(await readFile(new URL(file, dir), "utf8"));
  for (const row of shard.rows || []) if (!wanted.has(norm(row[0]))) wanted.set(norm(row[0]), { title: row[0] });
}

// 키워드·분야는 원본 CSV 에서
function cells(line) {
  const out = []; let now = ""; let quoted = false;
  for (let at = 0; at < line.length; at += 1) {
    const ch = line[at];
    if (quoted) { if (ch === '"' && line[at + 1] === '"') { now += '"'; at += 1; } else if (ch === '"') quoted = false; else now += ch; }
    else if (ch === '"') quoted = true; else if (ch === ",") { out.push(now); now = ""; } else now += ch;
  }
  out.push(now); return out;
}
{
  const stream = createInterface({ input: createReadStream(CSV, { encoding: "utf8" }), crlfDelay: Infinity });
  let head = null;
  for await (const line of stream) {
    if (!line.trim()) continue;
    const parts = cells(line);
    if (!head) { head = parts.map((one) => one.replace(/^\uFEFF/, "").trim()); continue; }
    const get = (name) => parts[head.indexOf(name)] || "";
    for (const title of [get("논문명(국문)"), get("논문명(외국어)")]) {
      const one = wanted.get(norm(title));
      if (one && !one.field) { one.field = get("주제분야").trim(); one.keywords = (get("키워드(국문)") || get("키워드(외국어)")).trim().slice(0, 160); }
    }
  }
}

let tags = {};
try { tags = JSON.parse(await readFile(TAGS, "utf8")); } catch { tags = {}; }
let todo = [...wanted.entries()].filter(([k]) => !tags[k]).map(([k, v]) => ({ k, ...v }));
if (PICK) {
  const titles = JSON.parse(await readFile(PICK, "utf8")).map(norm);
  const set = new Set(titles);
  todo = todo.filter((one) => set.has(one.k));
}
if (LIMIT) todo = todo.slice(0, LIMIT);
console.log(`모델 ${MODEL} · 분류할 논문 ${todo.length.toLocaleString()}편 (묶음 전체 ${wanted.size.toLocaleString()}편) · 개념 ${concepts.length}개`);

const RULES = `너는 고등학교 과학·사회·국어·정보 교사다. 한국 학술 논문의 제목·키워드·주제분야를 보고, 우리 교육과정 개념 목록 가운데
**고등학생이 그 단원의 수행평가 탐구를 할 때 이 논문을 실제 근거로 인용할 수 있는 곳**을 고른다.

규칙
- 글자가 같다고 고르지 않는다. 뜻이 같아야 한다. ('지질'이 땅인지 지방인지, '결합'이 화학 결합인지 모형 결합인지, '운동'이 물리의 운동인지 체육인지 가린다)
- 논문이 그 단원 **내용 자체**를 다뤄야 한다. 그 개념을 **가르치는 방법·학생 인식**을 연구한 교육학 논문은 그 개념 단원의 근거가 아니다 — 고르지 않는다.
- 고등학생의 탐구와 너무 먼 전문 연구(특정 질환 증례, 공정 최적화 등)는 이어지는 단원이 있어도 level 을 '어려움'으로 둔다.
- 이어지는 곳이 없으면 빈 배열. 억지로 고르지 않는다. 대부분은 0~2개다. 최대 3개, 가장 곧은 것부터.
- level: 고등학생이 초록을 읽고 요지를 쓸 수 있는가 — 쉬움 / 보통 / 어려움

개념 목록(번호: 과목::개념)
${concepts.map((name, at) => `${at + 1}: ${name}`).join("\n")}`;

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["n", "concepts", "level"],
    properties: { n: { type: "integer" }, concepts: { type: "array", items: { type: "integer" }, maxItems: 3 }, level: { type: "string", enum: ["쉬움", "보통", "어려움"] } },
  } } },
};

let usedIn = 0; let usedOut = 0;
async function ask(batch) {
  const list = batch.map((one, at) => `[${at + 1}] ${one.title}\n  분야: ${one.field || "-"} · 키워드: ${one.keywords || "-"}`).join("\n");
  for (let turn = 0; turn < 3; turn += 1) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "system", content: RULES }, { role: "user", content: `논문 ${batch.length}편:\n${list}` }],
        reasoning: { effort: "low" }, max_output_tokens: 16000,
        text: { format: { type: "json_schema", name: "kci_tags", schema: SCHEMA, strict: true } },
      }),
    });
    const body = await res.json();
    if (!res.ok) { if (turn < 2) { await new Promise((ok) => setTimeout(ok, 3000)); continue; } throw new Error(body?.error?.message || `OpenAI ${res.status}`); }
    usedIn += body?.usage?.input_tokens || 0;
    usedOut += body?.usage?.output_tokens || 0;
    const message = (body?.output || []).find((item) => item?.type === "message");
    return JSON.parse(message?.content?.find((part) => part?.type === "output_text")?.text || "{}").items || [];
  }
  return [];
}

const batches = [];
for (let at = 0; at < todo.length; at += BATCH) batches.push(todo.slice(at, at + BATCH));
let finished = 0;
let saving = Promise.resolve();
async function lane() {
  while (batches.length) {
    const batch = batches.shift();
    let items = [];
    try { items = await ask(batch); } catch (error) { console.log(`  실패(다시 돌리면 이어서 한다): ${error.message}`); continue; }
    const answered = new Set();
    for (const item of items) {
      const one = batch[item.n - 1];
      if (!one) continue;
      answered.add(one.k);
      tags[one.k] = { concepts: item.concepts.filter((n) => n >= 1 && n <= concepts.length).map((n) => concepts[n - 1]), level: item.level, model: MODEL };
    }
    // 답에서 **빠진** 논문 — 시험 200편에서 GPT-5 는 이어지는 단원이 없는 논문(교육학·간호 직무 등)을
    // 빈 배열 대신 아예 빼고 답했다. 빠진 것은 '이어지는 단원 없음'으로 적는다(omitted 로 표시해 둔다).
    if (items.length) {
      for (const one of batch) if (!answered.has(one.k)) tags[one.k] = { concepts: [], level: "", omitted: true, model: MODEL };
    }
    finished += batch.length;
    saving = saving.then(() => writeFile(TAGS, JSON.stringify(tags), "utf8"));
    await saving;
    if (finished % 400 < BATCH || !batches.length) {
      console.log(`  ${finished.toLocaleString()}/${todo.length.toLocaleString()} · 누적 ₩${Math.round((usedIn * PRICE.in + usedOut * PRICE.out) * WON).toLocaleString()}`);
    }
  }
}
await Promise.all(Array.from({ length: LANES }, lane));
const won = (usedIn * PRICE.in + usedOut * PRICE.out) * WON;
console.log(`\n토큰 입력 ${usedIn.toLocaleString()} · 출력 ${usedOut.toLocaleString()} → 약 ₩${Math.round(won).toLocaleString()} (편당 ₩${(won / Math.max(1, finished)).toFixed(2)})`);
