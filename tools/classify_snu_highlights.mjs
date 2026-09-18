// 서울대 연구성과 글마다 **뜻을 읽어** 꼬리표를 붙인다. GPT 를 쓴다 — 돈이 든다(마지막에 원으로 찍는다).
//
// 왜 GPT 인가. 낱말로 찾으면 글자만 같은 것이 걸렸다(전수로 재 봤다):
//   「수열의 극한」 → "고효율·저비용 수소 생산 전기화학 촉매"      (본문 어딘가의 '수열')
//   「극한」      → "자동차 배출 온실가스, 이제 '지문'으로 구별"
// GPT 는 글의 뜻을 안다. 그래서 **우리 교육과정 개념 152개 가운데 이 글이 이어지는 곳**을 고르게 한다.
// 한 번 붙여 두면 보고서를 만들 때는 꼬리표만 읽는다 — 그때는 ₩0 이다. 새 글만 다시 붙인다.
//
//   node tools/classify_snu_highlights.mjs --limit 40   — 시험으로 40건만
//   node tools/classify_snu_highlights.mjs              — 아직 안 붙인 글 전부
//
// 키는 환경 변수 OPENAI_API_KEY 에서 읽는다. 파일에 적지 않는다.
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const BOARD = here("../public/keyword-engine/build/.cache_snu_board.json");
const TAGS = here("../public/keyword-engine/build/.cache_snu_tags.json");
const AXES = here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json");
const MODEL = "gpt-5";
const WON = 1385;
const PRICE = { in: 1.25 / 1e6, out: 10 / 1e6 };   // gpt-5, 달러
const SINCE = "2019";                               // 이보다 오래된 글은 '요즘 대학 연구'라 부르기 어렵다
const BATCH = 20;
const arg = (name) => { const at = process.argv.indexOf(name); return at > 0 ? Number(process.argv[at + 1]) : 0; };
const LIMIT = arg("--limit");

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY 가 없습니다.");

// 개념 목록 — 번호로 고르게 한다. 이름을 그대로 쓰게 하면 철자를 조금씩 바꿔 와서 맞춰 볼 수가 없다.
const axes = JSON.parse(await readFile(AXES, "utf8")).axes || {};
const concepts = [];
for (const axis of Object.values(axes)) {
  const name = `${axis.subject}::${axis.concept}`;
  if (!concepts.includes(name)) concepts.push(name);
}

const board = JSON.parse(await readFile(BOARD, "utf8")).posts;
let tags = {};
try { tags = JSON.parse(await readFile(TAGS, "utf8")); } catch { tags = {}; }
let todo = Object.values(board).filter((one) => one.alive && one.date >= SINCE && !tags[one.id]);
todo.sort((a, b) => b.date.localeCompare(a.date));
if (LIMIT) todo = todo.slice(0, LIMIT);
console.log(`분류할 글 ${todo.length}건 (${SINCE}년 이후, 살아 있고, 아직 안 붙인 것) · 개념 ${concepts.length}개`);

const RULES = `너는 고등학교 교사다. 서울대학교가 홈페이지에 올린 연구 소개 글을 읽고, 우리 교육과정 개념 목록 가운데
**고등학생이 이 단원을 배우다가 이 연구로 자연스럽게 이어질 수 있는 곳**을 고른다.

규칙
- 글자가 같다고 고르지 않는다. 뜻이 이어져야 한다. (예: '지질'이 땅의 지질인지 몸의 지질(지방)인지 가린다)
- 이어지는 개념이 없으면 빈 배열로 둔다. 억지로 고르지 않는다. 대부분의 글은 0~2개다.
- 최대 3개. 가장 곧게 이어지는 것부터.
- 수학 개념은 연구가 그 수학을 **직접** 쓸 때만 고른다(예: 확률 모형, 미분방정식). '데이터를 분석했다'만으로는 안 된다.
- kind: 이 연구가 한 일 — 실험 / 관찰·측정 / 조사·분석 / 모형·계산 / 개발·설계 / 이론 중 하나
- level: 고등학생이 이 글의 요지를 이해할 수 있는가 — 쉬움 / 보통 / 어려움
- why: 왜 그 개념과 이어지는지 30자 안팎. 이어지는 개념이 없으면 빈 문자열.

개념 목록(번호: 과목::개념)
${concepts.map((name, at) => `${at + 1}: ${name}`).join("\n")}`;

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id", "concepts", "kind", "level", "why"],
        properties: {
          id: { type: "string" },
          concepts: { type: "array", items: { type: "integer" }, maxItems: 3 },
          kind: { type: "string", enum: ["실험", "관찰·측정", "조사·분석", "모형·계산", "개발·설계", "이론"] },
          level: { type: "string", enum: ["쉬움", "보통", "어려움"] },
          why: { type: "string" },
        },
      },
    },
  },
};

let usedIn = 0;
let usedOut = 0;
async function ask(batch) {
  const posts = batch.map((one) => `[${one.id}] ${one.title}\n  ${one.team}\n  ${(one.summary || one.body || "").slice(0, 220)}`).join("\n\n");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "system", content: RULES }, { role: "user", content: `글 ${batch.length}개:\n\n${posts}` }],
      reasoning: { effort: "low" },
      max_output_tokens: 12000,
      text: { format: { type: "json_schema", name: "snu_tags", schema: SCHEMA, strict: true } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || `OpenAI ${res.status}`);
  usedIn += body?.usage?.input_tokens || 0;
  usedOut += body?.usage?.output_tokens || 0;
  const message = (body?.output || []).find((item) => item?.type === "message");
  const text = message?.content?.find((part) => part?.type === "output_text")?.text || "";
  return JSON.parse(text).items || [];
}

// 네 줄로 동시에 묻는다(한 줄씩이면 787건에 40분이 넘는다). 파일 쓰기는 한 번에 하나씩.
const LANES = 4;
let saving = Promise.resolve();
let finished = 0;
const batches = [];
for (let at = 0; at < todo.length; at += BATCH) batches.push(todo.slice(at, at + BATCH));
async function lane() {
  while (batches.length) {
    const batch = batches.shift();
    let items = [];
    try { items = await ask(batch); } catch (error) { console.log(`  실패(다음에 다시 돌리면 이어서 한다): ${error.message}`); continue; }
    for (const item of items) {
      if (!board[item.id]) continue;   // 모르는 번호는 버린다
      tags[item.id] = {
        concepts: item.concepts.filter((n) => n >= 1 && n <= concepts.length).map((n) => concepts[n - 1]),
        kind: item.kind, level: item.level, why: String(item.why || "").slice(0, 80), model: MODEL,
      };
    }
    finished += batch.length;
    saving = saving.then(() => writeFile(TAGS, JSON.stringify(tags), "utf8"));
    await saving;
    const won = Math.round((usedIn * PRICE.in + usedOut * PRICE.out) * WON);
    console.log(`  ${finished}/${todo.length} · 누적 ₩${won}`);
  }
}
await Promise.all(Array.from({ length: LANES }, lane));

const won = (usedIn * PRICE.in + usedOut * PRICE.out) * WON;
console.log(`\n토큰: 입력 ${usedIn.toLocaleString()} · 출력 ${usedOut.toLocaleString()} → 이번 비용 약 ₩${Math.round(won).toLocaleString()}`);
const mine = todo.map((one) => ({ one, tag: tags[one.id] })).filter((x) => x.tag);
const linked = mine.filter((x) => x.tag.concepts.length);
console.log(`개념에 이어진 글 ${linked.length}/${mine.length}건`);
for (const { one, tag } of mine.slice(0, 60)) {
  console.log(`- ${one.title.slice(0, 50)}  [${tag.level}·${tag.kind}]`);
  console.log(`    → ${tag.concepts.join(" / ") || "(없음)"}${tag.why ? `  — ${tag.why}` : ""}`);
}
