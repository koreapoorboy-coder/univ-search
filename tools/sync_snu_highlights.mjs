// 서울대 「연구성과」 게시판을 우리 쪽에 맞춰 둔다. 달마다 한 번 돌린다. ₩0 (AI를 안 부른다).
//
// 사용자가 짚은 걱정이 이 파일의 이유다: 보고서 참고 자료에 대학 홈페이지 주소를 넣었는데 그 글이 나중에
// 사라지면 곤란하다. 대학 게시판은 KCI(1년에 한 번)와 달리 계속 바뀐다. 그래서:
//   · 새 글      → 더한다
//   · 사라진 글  → 404 로 확인되면 표시하고, 인덱스에서 뺀다
//   · 살아 있는 글 → 날짜와 함께 마지막 확인일을 적어 둔다
// (보고서를 만드는 순간에도 워커가 주소를 한 번 더 연다. 이 파일은 달마다 하는 정리다.)
//
// 게시판 모양(2026-09-18에 확인):
//   목록 https://www.snu.ac.kr/research/highlights?page=N — 한 쪽 12건, 101쪽. 제목·학부 교수팀·요약. 날짜 없음.
//   상세 ...?md=v&bbsidx=ID — <p class="date">2026. 9. 15.</p>. 없는 글은 HTTP 404.
//
//   node tools/sync_snu_highlights.mjs           — 새 글 찾기 + 알던 글이 살아 있는지 확인
//   node tools/sync_snu_highlights.mjs --full    — 목록 101쪽을 처음부터 끝까지 다시 읽는다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const CACHE = here("../public/keyword-engine/build/.cache_snu_board.json");
const FULL = process.argv.includes("--full");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const LIST = (page) => `https://www.snu.ac.kr/research/highlights?page=${page}`;
export const POST = (id) => `https://www.snu.ac.kr/research/highlights?md=v&bbsidx=${id}`;
const nap = (ms) => new Promise((done) => setTimeout(done, ms));
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜

const decode = (text) => String(text || "")
  .replace(/<[^>]*>/g, " ").replace(/&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

async function get(url, tries = 3) {
  for (let turn = 0; turn < tries; turn += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" }, signal: AbortSignal.timeout(20000) });
      return { status: res.status, html: res.status === 200 ? await res.text() : "" };
    } catch (error) {
      if (turn === tries - 1) return { status: 0, html: "", error: String(error?.message || error) };
      await nap(2000);
    }
  }
  return { status: 0, html: "" };
}

// 목록 한 쪽 → 글들
function parseList(html) {
  const out = [];
  const start = html.indexOf('<div class="board-research">');
  if (start < 0) return out;
  const body = html.slice(start);
  for (const block of body.split('<div class="col-md-4 col-sm-6">').slice(1)) {
    const id = /bbsidx=(\d+)/.exec(block)?.[1];
    const title = decode(/<div class="title">([\s\S]*?)<\/div>/.exec(block)?.[1]);
    if (!id || !title) continue;
    out.push({
      id, title,
      team: decode(/<div class="research-team">([\s\S]*?)<\/div>/.exec(block)?.[1]),
      summary: decode(/<div class="summary">([\s\S]*?)<\/div>/.exec(block)?.[1]).slice(0, 300),
    });
  }
  return out;
}

// 상세 → 날짜와 본문 앞부분(분류에만 쓴다. 공개 인덱스에는 넣지 않는다)
function parsePost(html) {
  const raw = /<p class="date">([\s\S]*?)<\/p>/.exec(html)?.[1] || "";
  const m = /(20\d\d)\.\s*(\d{1,2})\.\s*(\d{1,2})/.exec(raw);
  const date = m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : "";
  const at = html.indexOf("<!-- 게시글 본문 -->");
  const body = at > 0 ? decode(html.slice(at, at + 6000).replace(/<script[\s\S]*?<\/script>/g, "")).slice(0, 500) : "";
  return { date, body };
}

let cache = { posts: {} };
try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch { cache = { posts: {} }; }
const posts = cache.posts || {};
const known = new Set(Object.keys(posts));

// 1. 목록 — 새 글 찾기. 달마다 돌 때는 **알던 글만 있는 쪽**이 나오면 멈춘다(새 글은 앞쪽에 쌓인다).
const found = [];
let page = 1;
for (; page <= 300; page += 1) {
  const { status, html } = await get(LIST(page));
  if (status !== 200) { console.log(`목록 ${page}쪽 실패 (${status})`); break; }
  const items = parseList(html);
  if (!items.length) break;
  const fresh = items.filter((one) => !known.has(one.id));
  found.push(...fresh);
  if (!FULL && known.size && !fresh.length) break;
  await nap(300);
}
console.log(`목록 ${page - 1}쪽을 읽었습니다. 새 글 ${found.length}건`);

// 2. 상세 — 새 글은 날짜를 읽고, 알던 글은 살아 있는지 확인한다.
const todo = [...found.map((one) => ({ ...one, fresh: true })), ...[...known].map((id) => ({ id }))];
let gone = 0;
let back = 0;
let failed = 0;
let done = 0;
async function work(one) {
  const { status, html } = await get(POST(one.id));
  const was = posts[one.id] || {};
  if (status === 200) {
    const { date, body } = parsePost(html);
    posts[one.id] = {
      ...was, ...(one.fresh ? { title: one.title, team: one.team, summary: one.summary, firstSeen: today } : {}),
      id: one.id, url: POST(one.id), date: date || was.date || "", body: body || was.body || "",
      alive: true, lastChecked: today,
    };
    if (was.alive === false) back += 1;
    delete posts[one.id].goneAt;
  } else if (status === 404) {
    if (was.alive !== false) gone += 1;
    posts[one.id] = { ...was, id: one.id, alive: false, goneAt: was.goneAt || today, lastChecked: today };
  } else {
    failed += 1;   // 서버가 잠깐 안 될 때 — 살아 있는지 모르면 **바꾸지 않는다**
  }
  done += 1;
  if (done % 200 === 0) console.log(`  상세 ${done}/${todo.length}`);
}
const lanes = 3;
for (let at = 0; at < todo.length; at += lanes) {
  await Promise.all(todo.slice(at, at + lanes).map(work));
  await nap(250);
}

cache = { source: "https://www.snu.ac.kr/research/highlights", checked: today, posts };
await writeFile(CACHE, JSON.stringify(cache), "utf8");
const all = Object.values(posts);
const alive = all.filter((one) => one.alive);
console.log(`\n서울대 연구성과: 전체 ${all.length}건 · 살아 있음 ${alive.length}건`);
console.log(`이번에: 새 글 ${found.length} · 사라짐 ${gone} · 되살아남 ${back} · 확인 실패 ${failed}(그대로 둠)`);
const years = {};
for (const one of alive) years[one.date.slice(0, 4) || "?"] = (years[one.date.slice(0, 4) || "?"] || 0) + 1;
console.log("연도별:", Object.entries(years).sort().map(([y, n]) => `${y} ${n}`).join(" · "));
