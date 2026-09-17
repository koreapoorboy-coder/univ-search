// 대학이 **자기 홈페이지에 쉬운 말로 풀어 쓴 연구 소개**가 개념에 붙는지 전수로 잰다. ₩0이다.
//
// 사용자가 서울대 「연구성과」 게시판을 짚었다. NTIS와는 물건이 다르다:
//   NTIS 과제명   — "역 마이셀 템플레이트 방법에 의한 고분자 나노포러스 재료의 합성 및 효소고정화…"
//   서울대 연구성과 — "탄소 중립 늦어지면 남극해 탄소 흡수능력 상실된다"
// 뒤엣것은 고1이 읽을 수 있다. 기자에게 보내려고 쓴 글이라서다. 교수 이름과 학부도 붙어 있다.
//
// 그래서 물어볼 것은 하나다. **우리 개념 152개 가운데 몇 개가 여기에 걸리는가.**
// 서울대 게시판은 101쪽(약 1,200건)이다. NTIS(과제 수십만 건)보다 훨씬 작으니, 좋은 글이라도
// 안 걸리는 개념이 많을 것이다. 얼마나 많은지는 재 봐야 안다.
//
//   node public/keyword-engine/build/audit_snu_highlights_all.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const OUT = process.argv.find((one) => /\.html$/i.test(one)) || "";
const FRESH = process.argv.includes("--fresh");
const CACHE = here("./.cache_snu_highlights.json");
let cache = {};
if (!FRESH) { try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch (error) { cache = {}; } }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
// sc=y 는 검색 켜기, qt=b 는 제목+내용. 게시판 자체 검색이라 학교 통합검색과 다르다 —
// 통합검색에 '효소'를 넣으면 0건이지만, 이 게시판 검색에는 13건이 나온다.
const BASE = "https://www.snu.ac.kr/research/highlights?sc=y&qt=b&q=";
const nap = (ms) => new Promise((done) => setTimeout(done, ms));

const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(axis);
}

const strip = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, " ").trim();

// 글 하나: 제목 + 학부·교수 + 요약이 한 덩어리로 들어 있다. 앞의 '더보기'는 글이 아니라 안내다.
function parseItems(html) {
  const out = [];
  const seenId = new Set();
  const re = /href="\/research\/highlights\?md=v&(?:amp;)?bbsidx=(\d+)"[^>]*>([\s\S]{0,900}?)<\/a>/g;
  let hit;
  while ((hit = re.exec(html))) {
    const id = hit[1];
    if (seenId.has(id)) continue;
    const text = strip(hit[2]);
    if (!text || text === "더보기 >" || text.length < 10) continue;
    seenId.add(id);
    // 「제목 · 학부 교수팀 · 요약」 차례로 붙어 있다. 교수 이름이 든 조각을 찾아 가른다.
    const at = text.search(/[가-힣]{2,10}(?:대학원|대학|학부|학과|연구소|병원)\s*[가-힣]{2,4}\s*교수/);
    const title = at > 0 ? text.slice(0, at).trim() : text.slice(0, 80).trim();
    const rest = at > 0 ? text.slice(at) : "";
    const who = rest ? rest.split(/\s{2,}|(?<=교수(?:팀|\s*연구팀)?)\s/)[0].trim() : "";
    out.push({ id, title, who: who.slice(0, 40), text: text.slice(0, 300) });
  }
  return out;
}

// **개념 이름을 통째로 넣으면 안 된다.** 재 보고 알았다.
//   「효소와 대사 반응」 → 0건
//   「효소」            → 13건
// 이 게시판 검색은 넣은 낱말이 **다 들어간 글**만 준다(AND). NTIS는 반대로 쪼개서 찾아 주므로
// 통째가 나았다. 검색기마다 규칙이 다르다 — 그래서 같은 질문을 두 곳에 똑같이 하면 안 된다.
const JOSA = /(으로서|으로써|에서의|에게서|에서는|이라는|라는|으로|에서|에게|부터|까지|보다|과의|와의|의|가|이|은|는|을|를|에|도|만|와|과|로|랑)$/;
const stem = (word) => { const bare = String(word || "").replace(JOSA, ""); return bare.length >= 2 ? bare : String(word || ""); };
const NOT_POINTING = new Set([
  "자료", "분석", "이해", "활용", "적용", "탐구", "사례", "방법", "과정", "구성", "표현", "해석",
  "결론", "도출", "수집", "정리", "비교", "관찰", "조사", "평가", "발표", "작성", "판단", "검증",
  "변화", "구조", "성질", "관계", "특성", "현상", "문제", "해결", "기본", "기초", "개념", "원리",
  "체계", "시스템", "종류", "방식", "발전", "발견", "관점", "증거", "독립", "사건", "활동", "실험",
  "유용성", "필요성", "세계", "우리", "여러", "가지", "수용",
]);
const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
function queriesFor(concept, subject) {
  const kept = [];
  for (const raw of words(concept).map(stem)) {
    if (raw.length < 2) continue;
    if (NOT_POINTING.has(raw)) continue;
    if (raw.replace(/\s+/g, "") === String(subject || "").replace(/\s+/g, "")) continue;
    if (!kept.includes(raw)) kept.push(raw);
  }
  // 긴 낱말이 더 정확하다. '화학 평형'이 '평형'보다 낫다.
  kept.sort((a, b) => b.length - a.length);
  return kept.slice(0, 2);
}

async function ask(word, tries = 2) {
  for (let turn = 0; turn < tries; turn++) {
    try {
      const res = await fetch(BASE + encodeURIComponent(word), {
        headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();
      // 검색 결과가 한 쪽을 넘는지. 넘으면 12건보다 많다는 뜻이다.
      const more = /highlights\?[^"]*page=2/.test(html);
      return { items: parseItems(html), more };
    } catch (error) {
      if (turn === tries - 1) return { items: [], more: false, failed: String(error?.message || error) };
      await nap(2500);
    }
  }
  return { items: [], more: false, failed: "?" };
}

const audit = [];
let done = 0;
let fetched = 0;
for (const axis of rows) {
  const key = `${axis.subject}::${axis.concept}`;
  let found = cache[key];
  if (!found) {
    const asked = queriesFor(axis.concept, axis.subject);
    const seenId = new Set();
    const items = [];
    let more = false;
    let failed = "";
    for (const one of asked) {
      const got = await ask(one);
      if (got.failed) failed = got.failed;
      if (got.more) more = true;
      for (const it of got.items) {
        if (seenId.has(it.id)) continue;
        seenId.add(it.id);
        items.push({ ...it, by: one });
      }
      fetched += 1;
      await nap(700);
    }
    found = { items, more, failed, asked };
    cache[key] = found;
  }
  // **본문까지 훑어 나온 것은 거의 가짜다.** 낱말로 물으니 87%가 걸렸는데 보니 이랬다:
  //   「수열의 극한」   → "고효율·저비용으로 친환경 수소 생산 가능한 전기화학 촉매 개발"
  //   「화학과 우리 생활」 → "도시 녹지 많은 지역 거주하면 심혈관질환 사망 위험 낮아"
  // 보도자료 본문은 길어서 '물질'·'생활'·'세포' 같은 말이 어디에나 들어 있다. 그래서 **제목**에
  // 개념 낱말이 보이는 것만 센다. 학생도 제목을 보고 고를 테니, 제목에 안 보이면 이어지지 않는다.
  const aim = new Set(queriesFor(axis.concept, axis.subject));
  const real = found.items.filter((one) => {
    const inTitle = words(one.title).map(stem);
    return inTitle.some((w) => aim.has(w) || [...aim].some((a) => w.startsWith(a) && w.length <= a.length + 1));
  });
  audit.push({
    subject: axis.subject, concept: axis.concept,
    count: real.length, loose: found.items.length, more: !!found.more, failed: found.failed || "",
    asked: found.asked || [],
    best: real[0] || null, items: real.slice(0, 3),
  });
  done += 1;
  process.stdout.write(`\r재는 중 ${done}/${rows.length}  ${axis.subject} / ${axis.concept}                    `);
}
process.stdout.write("\r" + " ".repeat(78) + "\r");
if (fetched) await writeFile(CACHE, JSON.stringify(cache), "utf8");

const many = audit.filter((one) => one.count >= 3);
const few = audit.filter((one) => one.count >= 1 && one.count < 3);
const none = audit.filter((one) => one.count === 0);

console.log(`개념 ${audit.length}개를 서울대 「연구성과」 게시판에 전수로 물어봤습니다 (AI 안 씀 · ₩0)\n`);
console.log(`  잘 나옴  (3건 이상): ${many.length}개 (${Math.round(many.length / audit.length * 100)}%)`);
console.log(`  조금 나옴 (1~2건):  ${few.length}개`);
console.log(`  없음:               ${none.length}개 (${Math.round(none.length / audit.length * 100)}%)\n`);

console.log("■ 잘 나오는 자리 (앞 15개)\n");
for (const one of many.slice(0, 15)) {
  console.log(`  ${one.subject} / ${one.concept}  — 제목에 보이는 것 ${one.count}건 (본문까지 치면 ${one.loose}건)  (물어본 말: ${one.asked.join("·")})`);
  if (one.best) console.log(`     → ${one.best.title.slice(0, 66)}  [${one.best.who}]`);
}
console.log("\n■ 하나도 없는 자리 (앞 25개)\n");
for (const one of none.slice(0, 25)) console.log(`  ${one.subject} / ${one.concept}  (물어본 말: ${one.asked.join("·") || "없음"})`);
if (none.length > 25) console.log(`  … 그리고 ${none.length - 25}개 더`);

if (OUT) {
  const e = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const card = (one, kind) => `<div class="card ${kind}">
    <div class=c>${e(one.subject)} / <b>${e(one.concept)}</b><span>제목 ${one.count}건 / 본문까지 ${one.loose}건 · 물어본 말: ${e(one.asked.join(" · "))}</span></div>
    ${one.items.map((it) => `<div class=p><b>${e(it.title)}</b>${it.who ? ` <span class=m>${e(it.who)}</span>` : ""}</div>`).join("")
      || `<div class="p m">나오는 글이 없습니다</div>`}
  </div>`;
  await writeFile(OUT, `<!doctype html><meta charset=utf-8><title>대학이 쉬운 말로 쓴 연구 소개가 붙는가</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--red:#c0392b;--amber:#b7791f;--ok:#2d7a4f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 28px;font-size:14px}
h2{font-size:17px;margin:36px 0 10px;padding-top:20px;border-top:1px solid var(--line)}
.note{color:var(--dim);font-size:13.5px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;align-items:baseline}
.big{font-size:30px;font-weight:700;letter-spacing:-.5px}
.card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:11px 14px;margin:0 0 8px}
.card.none{border-left-color:var(--red)}.card.few{border-left-color:var(--amber)}.card.many{border-left-color:var(--ok)}
.card .c{font-size:13.5px;color:var(--dim)}.card .c b{color:var(--ink);font-size:14.5px}
.card .c span{float:right;font-size:12px}
.card .p{font-size:13.5px;background:#f7f8fa;border-radius:6px;padding:6px 9px;margin-top:5px}
.card .m{color:var(--dim);font-size:12.5px}
</style><div class=wrap>
<h1>대학이 쉬운 말로 쓴 연구 소개가 개념에 붙는지 전수로 쟀습니다</h1>
<p class=sub>서울대학교 「연구성과」 게시판 · 개념 ${audit.length}개 · AI를 쓰지 않았습니다 (₩0) · ${new Date().toLocaleDateString("ko-KR")}</p>
<div class=box>
<div><span class=big style="color:var(--ok)">${many.length}</span><div class=note>잘 나옴 (3건+)</div></div>
<div><span class=big style="color:var(--amber)">${few.length}</span><div class=note>조금 (1~2건)</div></div>
<div><span class=big style="color:var(--red)">${none.length}</span><div class=note>없음</div></div></div>
<p>NTIS 과제명은 심사용이라 어렵습니다. 이 글들은 <b>기자에게 보내려고 쓴 글</b>이라 고1이 읽을 수 있습니다.
대신 한 학교 것이라 양이 적습니다 — 약 1,200건입니다.</p>
<h2>잘 나옴 ${many.length}개</h2>
${many.map((one) => card(one, "many")).join("\n")}
<h2>조금 나옴 ${few.length}개</h2>
${few.map((one) => card(one, "few")).join("\n")}
<h2>없음 ${none.length}개</h2>
${none.map((one) => card(one, "none")).join("\n")}
</div>`, "utf8");
  console.log(`\n${OUT}`);
}
