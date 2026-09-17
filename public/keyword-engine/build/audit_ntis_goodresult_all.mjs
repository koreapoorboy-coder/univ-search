// 「국가R&D 우수성과」가 개념에 붙는지 전수로 잰다. AI를 쓰지 않으므로 ₩0이다.
//
// 이게 지금까지 본 것 중 우리 자리에 제일 가깝다. 정부가 해마다 뽑는 「우수성과 100선」이 쌓인 것이라,
// **쉬운 말로 풀어 쓴 글**인데 **전국 대학·연구소가 다 들어 있다.**
//
//   NTIS 과제명    — "역 마이셀 템플레이트 방법에 의한 고분자 나노포러스 재료의 합성…"   (어렵다)
//   서울대 연구성과 — "탄소 중립 늦어지면 남극해 탄소 흡수능력 상실된다"                 (쉽다, 한 학교)
//   우수성과       — "감염성 진단에 새로운 지평을 연다! …" · 권석태 · 성균관대학교        (쉽다, 전국)
//
// 앞서 두 번 재면서 배운 것을 그대로 지킨다.
//   · 검색기마다 규칙이 다르다. 여기선 통째(7건)와 낱말(95건)이 둘 다 뜻이 있어 **둘 다 묻고 합친다.**
//   · **본문까지 훑어 나온 것은 거의 가짜다.** 제목에 개념 낱말이 보이는 것만 센다.
//     (서울대에서 「수열의 극한」에 "친환경 수소 생산 촉매"가 걸렸다.)
//
//   node public/keyword-engine/build/audit_ntis_goodresult_all.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const OUT = process.argv.find((one) => /\.html$/i.test(one)) || "";
const FRESH = process.argv.includes("--fresh");
const CACHE = here("./.cache_ntis_goodresult.json");
let cache = {};
if (!FRESH) { try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch (error) { cache = {}; } }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const BASE = "https://www.ntis.go.kr/ThSearchResultGoodresultList.do?searchWord=";
const nap = (ms) => new Promise((done) => setTimeout(done, ms));

const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(axis);
}

const strip = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, " ").trim();

const JOSA = /(으로서|으로써|에서의|에게서|에서는|이라는|라는|으로|에서|에게|부터|까지|보다|과의|와의|의|가|이|은|는|을|를|에|도|만|와|과|로|랑)$/;
const stem = (word) => { const bare = String(word || "").replace(JOSA, ""); return bare.length >= 2 ? bare : String(word || ""); };
const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
// 혼자서는 아무 주제도 가리키지 못하는 말. 앞의 두 감사에서 가짜를 만들어 낸 것들이다.
const NOT_POINTING = new Set([
  "자료", "분석", "이해", "활용", "적용", "탐구", "사례", "방법", "과정", "구성", "표현", "해석",
  "결론", "도출", "수집", "정리", "비교", "관찰", "조사", "평가", "발표", "작성", "판단", "검증",
  "변화", "구조", "성질", "관계", "특성", "현상", "문제", "해결", "기본", "기초", "개념", "원리",
  "체계", "시스템", "종류", "방식", "발전", "발견", "관점", "증거", "독립", "사건", "활동", "실험",
  "유용성", "필요성", "세계", "우리", "여러", "가지", "수용",
  // 이번에 나온 것. 꾸미는 말이라 아무 제목에나 들어 있다:
  //   「다양한 분야 독서와 홍보 표현」 → "**다양한** 시간 범위에 대한 시계열 데이터 패턴 분석"
  "다양한", "새로운", "관련", "중심", "분야", "여러가지",
]);

function pointers(concept, subject) {
  const kept = [];
  for (const raw of words(concept).map(stem)) {
    if (raw.length < 2) continue;
    if (NOT_POINTING.has(raw)) continue;
    if (raw.replace(/\s+/g, "") === String(subject || "").replace(/\s+/g, "")) continue;
    if (!kept.includes(raw)) kept.push(raw);
  }
  kept.sort((a, b) => b.length - a.length);
  return kept;
}

// 대학인가. 우수성과에는 출연연구기관도 섞인다(기상연구소·국립축산과학원). 둘 다 쓸모가 있지만,
// "네 탐구가 **대학**에서 이렇게 이어진다"는 말에는 대학이어야 한다. 그래서 따로 센다.
const UNIV = /(대학교|대학(?!원생)|과학기술원|KAIST|POSTECH|UNIST|GIST|DGIST|산학협력단)/;
const SCHOOL = /(고등학교|중학교|초등학교)/;
const isUniv = (org) => UNIV.test(org) && !SCHOOL.test(org);

function parseItems(html) {
  const out = [];
  const seenId = new Set();
  // 제목 <a> 뒤에 listDetail 이 둘 온다. 첫째는 연도·연구자·기관·분야, 둘째는 쉬운 말 요약이다.
  const re = /techId=([A-Za-z0-9-]+)[^>]*class="announce subject-txt"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,2600}?)<div class="detail-group">/g;
  let hit;
  while ((hit = re.exec(html))) {
    const id = hit[1];
    if (seenId.has(id)) continue;
    const title = strip(hit[2]);
    if (!title) continue;
    seenId.add(id);
    const blocks = [...hit[3].matchAll(/<div class="listDetail">([\s\S]*?)<\/div>\s*<\/div>/g)].map((one) => one[1]);
    const facts = blocks[0] ? [...blocks[0].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((one) => strip(one[1])) : [];
    const summary = blocks[1] ? strip([...blocks[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((one) => one[1]).join(" ")) : "";
    out.push({
      id, title,
      year: facts[0] || "", lead: facts[1] || "", org: facts[2] || "", field: facts[3] || "",
      summary: summary.slice(0, 220),
      url: `https://www.ntis.go.kr/outcomes/tpopup/xtApplDtlInfoAction.do?cmd=best&techId=${id}&pageCode=TH_BEST_RST_DTL`,
    });
    if (out.length >= 12) break;
  }
  return out;
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
      const count = /data-category="rgoodresult"[^>]*>\s*[^<]*<span>\((\d[\d,]*)\)<\/span>/.exec(html);
      return { total: Number((count?.[1] || "0").replace(/,/g, "")), items: parseItems(html) };
    } catch (error) {
      if (turn === tries - 1) return { total: 0, items: [], failed: String(error?.message || error) };
      await nap(2500);
    }
  }
  return { total: 0, items: [], failed: "?" };
}

const touches = (word, aim) => {
  const bare = stem(word);
  if (aim.has(bare) || aim.has(word)) return true;
  for (const one of aim) {
    if (one.length < 2) continue;
    if (bare.startsWith(one) && bare.length <= one.length + 1) return true;
    if (!NOT_POINTING.has(bare) && one.includes(bare) && one.length - bare.length <= 3) return true;
  }
  return false;
};

const audit = [];
let done = 0;
let fetched = 0;
for (const axis of rows) {
  const key = `${axis.subject}::${axis.concept}`;
  const aimList = pointers(axis.concept, axis.subject);
  let found = cache[key];
  if (!found) {
    // 통째로 한 번, 제일 또렷한 낱말로 한 번. 둘을 합친다.
    const asked = [axis.concept, aimList[0]].filter(Boolean).filter((one, at, all) => all.indexOf(one) === at);
    const seenId = new Set();
    const items = [];
    let total = 0;
    let failed = "";
    for (const one of asked) {
      const got = await ask(one);
      if (got.failed) failed = got.failed;
      total = Math.max(total, got.total);
      for (const it of got.items) {
        if (seenId.has(it.id)) continue;
        seenId.add(it.id);
        items.push(it);
      }
      fetched += 1;
      await nap(700);
    }
    found = { total, items, asked, failed };
    cache[key] = found;
  }
  const aim = new Set(aimList);
  // 제목에 개념 낱말이 보이는 것만 센다. 학생도 제목을 보고 고른다 — 제목에 안 보이면 안 이어진다.
  const real = (found.items || []).filter((one) => words(one.title).some((word) => touches(word, aim)));
  const univ = real.filter((one) => isUniv(one.org));
  audit.push({
    subject: axis.subject, concept: axis.concept,
    total: found.total || 0, loose: (found.items || []).length, count: real.length, univ: univ.length,
    asked: found.asked || [], failed: found.failed || "",
    items: (univ.length ? univ : real).slice(0, 3),
    best: univ[0] || real[0] || null,
  });
  done += 1;
  process.stdout.write(`\r재는 중 ${done}/${rows.length}  ${axis.subject} / ${axis.concept}                    `);
}
process.stdout.write("\r" + " ".repeat(78) + "\r");
if (fetched) await writeFile(CACHE, JSON.stringify(cache), "utf8");

const many = audit.filter((one) => one.univ >= 2);
const few = audit.filter((one) => one.univ === 1 || (one.univ === 0 && one.count >= 1));
const none = audit.filter((one) => one.count === 0);

console.log(`개념 ${audit.length}개를 「국가R&D 우수성과」에 전수로 물어봤습니다 (AI 안 씀 · ₩0)\n`);
console.log(`  잘 나옴  (대학 연구 둘 이상): ${many.length}개 (${Math.round(many.length / audit.length * 100)}%)`);
console.log(`  조금 나옴 (하나 또는 출연연): ${few.length}개`);
console.log(`  없음:                        ${none.length}개 (${Math.round(none.length / audit.length * 100)}%)\n`);

console.log("■ 잘 나오는 자리 (앞 15개)\n");
for (const one of many.slice(0, 15)) {
  console.log(`  ${one.subject} / ${one.concept}  — 대학 ${one.univ}건 (제목 ${one.count} / 받아온 ${one.loose} / 전체 ${one.total.toLocaleString()})`);
  if (one.best) console.log(`     → ${one.best.title.slice(0, 62)}  [${one.best.year} · ${one.best.org} · ${one.best.lead}]`);
}
console.log("\n■ 하나도 없는 자리 (앞 25개)\n");
for (const one of none.slice(0, 25)) console.log(`  ${one.subject} / ${one.concept}  (물어본 말: ${one.asked.join(" · ")})`);
if (none.length > 25) console.log(`  … 그리고 ${none.length - 25}개 더`);

if (OUT) {
  const e = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const card = (one, kind) => `<div class="card ${kind}">
    <div class=c>${e(one.subject)} / <b>${e(one.concept)}</b>
      <span>대학 ${one.univ}건 · 제목에 보임 ${one.count} · 받아온 ${one.loose}</span></div>
    ${one.items.map((it) => `<div class=p><b>${e(it.title)}</b>
      <div class=m>${e(it.year)} · <b>${e(it.org)}</b> · ${e(it.lead)}${it.field ? ` · ${e(it.field)}` : ""}</div>
      ${it.summary ? `<div class=s>${e(it.summary)}</div>` : ""}</div>`).join("")
      || `<div class="p m">제목에 개념이 보이는 성과가 없습니다</div>`}
  </div>`;
  await writeFile(OUT, `<!doctype html><meta charset=utf-8><title>국가R&D 우수성과가 개념에 붙는가</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--red:#c0392b;--amber:#b7791f;--ok:#2d7a4f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 28px;font-size:14px}
h2{font-size:17px;margin:36px 0 10px;padding-top:20px;border-top:1px solid var(--line)}
.note{color:var(--dim);font-size:13.5px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;align-items:baseline}
.big{font-size:30px;font-weight:700;letter-spacing:-.5px}
.card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:11px 14px;margin:0 0 8px}
.card.none{border-left-color:var(--red)}.card.few{border-left-color:var(--amber)}.card.many{border-left-color:var(--ok)}
.card .c{font-size:13.5px;color:var(--dim)}.card .c b{color:var(--ink);font-size:14.5px}
.card .c span{float:right;font-size:12px}
.card .p{font-size:13.5px;background:#f7f8fa;border-radius:6px;padding:7px 10px;margin-top:6px}
.card .m{color:var(--dim);font-size:12.5px}
.card .s{color:#4b5563;font-size:12.5px;margin-top:3px}
</style><div class=wrap>
<h1>국가R&D 우수성과가 개념에 붙는지 전수로 쟀습니다</h1>
<p class=sub>개념 ${audit.length}개 · 정부가 해마다 뽑는 「우수성과 100선」의 누적본 · AI를 쓰지 않았습니다 (₩0) · ${new Date().toLocaleDateString("ko-KR")}</p>
<div class=box>
<div><span class=big style="color:var(--ok)">${many.length}</span><div class=note>잘 나옴</div></div>
<div><span class=big style="color:var(--amber)">${few.length}</span><div class=note>조금 나옴</div></div>
<div><span class=big style="color:var(--red)">${none.length}</span><div class=note>없음</div></div></div>
<p>이 글들은 <b>쉬운 말로 풀어 쓴 연구 소개</b>입니다. 그러면서 <b>전국 대학·연구소</b>가 다 들어 있습니다.
대학 연구는 참고문헌이 아니라 <b>「다음에 해 볼 것」</b>에 들어갑니다 — 학생이 읽을 원문이 아니기 때문입니다.</p>
<h2>잘 나옴 ${many.length}개 <span class=note>대학 연구가 둘 이상</span></h2>
${many.map((one) => card(one, "many")).join("\n")}
<h2>조금 나옴 ${few.length}개 <span class=note>하나뿐이거나, 대학이 아닌 연구기관</span></h2>
${few.map((one) => card(one, "few")).join("\n")}
<h2>없음 ${none.length}개</h2>
${none.map((one) => card(one, "none")).join("\n")}
</div>`, "utf8");
  console.log(`\n${OUT}`);
}
