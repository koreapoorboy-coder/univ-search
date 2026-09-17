// 개념 152개에 **대학 연구가 실제로 붙는지** 전수로 잰다. AI를 쓰지 않으므로 ₩0이다.
//
// 왜 재는가. 책을 붙일 때 배운 것이 있다 — 붙을 수 있는 자리를 다 세워 놓고 보지 않으면, 엉뚱하게 붙은
// 것을 아무도 모르고 넘어간다. 학생은 대학 연구를 읽지 않는다. 잘못 붙어도 모른다.
//
// 무엇을 보는가. 두 가지다.
//   **연결성** — 상위 과제의 제목이 이 개념에 정말 닿는가. 조사가 달라도 닿은 것으로 센다
//                (효소가 ⊃ 효소). 책 감사에서 이 처리를 안 해 멀쩡한 것을 위험이라 불렀던 적이 있다.
//   **실용성** — 그게 **대학**의 연구인가, 그리고 **최근**인가. 기업 과제와 20년 전 과제는
//                "네 탐구가 대학에서 이렇게 이어진다"는 말에 쓸 수 없다.
//
// 키가 아직 없어서 NTIS 공개 검색 화면을 읽는다. 사람이 152번 손으로 검색하는 것과 같은 일을 한 번만
// 한다. 개념당 한 번, 사이를 띄우고 차례로 부른다. 키가 나오면 OpenAPI로 갈아탄다.
//
//   node public/keyword-engine/build/audit_univ_research_all.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const OUT = process.argv.find((one) => /\.html$/i.test(one)) || "";
const FRESH = process.argv.includes("--fresh");
// 받아 온 것을 저장해 둔다. 세는 규칙은 몇 번이고 다시 볼 것이기 때문이다 — 그때마다 152번씩
// 다시 물어보는 것은 남의 서버에 할 짓이 아니다. 다시 받으려면 --fresh 를 붙인다.
const CACHE = here("./.cache_ntis_projects.json");
let cache = {};
if (!FRESH) { try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch (error) { cache = {}; } }
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const BASE = "https://www.ntis.go.kr/ThSearchProjectList.do?searchWord=";
const nap = (ms) => new Promise((done) => setTimeout(done, ms));

// 개념 이름을 **통째로** 넣는다. 재 보고 정한 것이다: 조각으로 끊는 것보다 통째가 정확했다.
//   '지구 시스템과 상호작용' → "기후변화에 따른 지구시스템 상호 작용 연구" (딱 맞음)
//   '대사 반응'(조각)        → "세포내 대사이상과 연관된 염증반응의 제어연구" (빗나감)
// NTIS가 말을 쪼개 찾고 관련도로 줄을 세우기 때문이다. KCI는 제목만 보므로 규칙이 다르다.
const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(axis);
}

const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
const norm = (value) => String(value || "").replace(/\s+/g, "");
const strip = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, " ").trim();

// 대학인가. '산학협력단'까지 대학으로 본다 — 교수 연구비는 거기로 들어간다.
const UNIV = /(대학교|대학(?!원생)|과학기술원|KAIST|POSTECH|UNIST|GIST|DGIST|산학협력단)/;
const SCHOOL = /(고등학교|중학교|초등학교)/;
const isUniv = (org) => UNIV.test(org) && !SCHOOL.test(org);

// 혼자서는 아무 주제도 가리키지 못하는 말. 이 말로 닿았다고 하면 아무 연구나 다 걸린다.
// 1차 전수에서 실제로 이렇게 걸린 것들이다:
//   「자료 수집·분석·결론 도출」 → "체육계열 내 여교수들의 삶에 대한 내러티브 연구" ('자료'·'분석')
//   「조건부확률과 사건의 독립」 → "공공부문 이직 연구" ('사건'·'독립')
const NOT_POINTING = new Set([
  "자료", "분석", "이해", "활용", "적용", "탐구", "사례", "방법", "과정", "구성", "표현", "해석",
  "결론", "도출", "수집", "정리", "비교", "관찰", "조사", "평가", "발표", "작성", "판단", "검증",
  "변화", "구조", "성질", "관계", "특성", "현상", "문제", "해결", "기본", "기초", "개념", "원리",
  "체계", "시스템", "종류", "방식", "발전", "발견", "관점", "증거", "독립", "사건", "활동", "실험",
  // 4차에서 더 나온 것들. 글자는 맞는데 뜻이 아무 상관 없이 걸렸다:
  //   「과학의 유용성과 필요성」 → "선제적 약물유전형 검사의 **유용성**과 비용-효과 분석"
  //   「자연 세계의 시간과 공간」 → "**시간과 공간** 변수에 의존하는 확률론적 편미분방정식"
  // 앞의 것은 '유용성'을 빼서 막았다. 뒤의 것은 못 막는다 — '시간'과 '공간'은 물리 「시간과 공간」
  // 에서는 진짜 주제어라 뺄 수 없다. **낱말로는 여기까지다.** 남는 것은 사람이 봐야 한다.
  "유용성", "필요성", "세계", "우리", "여러", "가지", "수용",
]);

// **닿았다고 부르는 기준.** 1차로 재 보고 고친 자리다.
//
// 처음에는 한쪽이 다른 쪽을 품으면 닿은 것으로 쳤다(효소 ⊂ 효소의). 그랬더니 이런 게 걸렸다:
//   미적분1 「수열의 극한」 → "**극한**환경에 따른 액적 충돌에 대한 다중물리현상 분석"
// '극한'이 '극한환경'에 들어 있을 뿐, 뜻은 아무 상관이 없다. 책을 붙일 때와 똑같은 함정이다.
//
// 그래서 **조사만 떼고 정확히 맞춘다.** 조사는 정해진 목록이라 안전하다. 품는 것은 더 이상 안 친다.
// 이러면 '반응식'처럼 붙어 만든 말은 놓친다. 놓치는 쪽이 낫다 — 잘못 붙은 연구가 생활기록부에
// 남는 것보다는.
const JOSA = /(으로서|으로써|에서의|에게서|에서는|이라는|라는|으로|에서|에게|부터|까지|보다|과의|와의|의|가|이|은|는|을|를|에|도|만|와|과|로|랑)$/;
const stem = (word) => {
  const bare = String(word || "").replace(JOSA, "");
  return bare.length >= 2 ? bare : String(word || "");
};
// 조사를 뗀 뒤에도 **한 글자 접미사**까지는 같은 말로 본다. 2차로 재 보고 더한 자리다.
//   지구과학 「판 구조와 암석 변화」 → "동아시아 **암석권**-연약권 … 지진학적 구조와 물성" (딱 맞음)
//   통합과학2 「생태계평형」        → "습지의 **평형성** 유지를 위한 …"                    (딱 맞음)
// 둘 다 조사가 아니라 접미사(권·성)가 붙은 말이라 정확히 맞추기로는 놓쳤다. 한 글자까지만 봐주면
// '극한'이 '극한환경'(두 글자 더)에 걸리는 일은 여전히 막힌다 — 그게 이 규칙의 경계다.
const touches = (word, aim) => {
  const bare = stem(word);
  if (aim.has(bare) || aim.has(word)) return true;
  for (const one of aim) {
    if (one.length < 2) continue;
    if (bare.startsWith(one) && bare.length <= one.length + 1) return true;
    // 반대쪽도 본다. 개념이 붙여 쓴 말일 때가 있다. 3차로 재 보고 더했다.
    //   통합과학2 「생태계평형」      → "습지의 **평형** 유지를 위한 …"        (생태계평형 ⊃ 평형)
    //   확률과 통계 「이항분포와 정규분포」 → "… 패턴 통계량의 **확률 분포**와 응용" (정규분포 ⊃ 분포)
    // 세 글자까지만 봐준다. 그리고 넓은 말이면 안 친다 — 그게 1차에서 아무 연구나 걸리게 한 원인이다.
    if (!NOT_POINTING.has(bare) && one.includes(bare) && one.length - bare.length <= 3) return true;
  }
  return false;
};


function parseProjects(html) {
  const out = [];
  const seenTitle = new Set();
  // 과제 목록 화면의 한 줄: 제목 <a> 바로 뒤에 info-txt 가 붙는다.
  // 차례는 (과제번호) · 기준연도 · 사업명 · 연구책임자 · 수행기관 · 부처명 · 연구비다.
  const re = /pjtInfo\.do\?pjtId=(\d+)[^>]*class="announce subject-txt"[^>]*>([\s\S]*?)<\/a>\s*<div class="info-txt">([\s\S]*?)<\/div>/g;
  let hit;
  while ((hit = re.exec(html))) {
    const title = strip(hit[2]);
    if (!title) continue;
    // **같은 과제가 연도만 바꿔 여러 번 올라와 있다.** 「화학 평형」은 1~3위가 전부 같은 과제였다.
    // 공공데이터에서 겪은 것과 같다. 제목으로 한 번만 센다.
    const key = norm(title);
    if (seenTitle.has(key)) continue;
    seenTitle.add(key);
    const spans = [...hit[3].matchAll(/<span class="(txt[^"]*)"[^>]*>([\s\S]*?)<\/span>/g)]
      // periodYr 은 화면에 숨겨 둔 연구기간 칸이다. 세면 차례가 하나씩 밀린다.
      .filter((one) => !/periodYr/.test(one[1])).map((one) => strip(one[2]));
    out.push({
      id: hit[1], title,
      year: spans[1] || "", program: spans[2] || "", lead: spans[3] || "", org: spans[4] || "",
    });
    if (out.length >= 10) break;
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
      const count = /data-category="project"[^>]*>\s*과제\s*<span>\((\d[\d,]*)\)<\/span>/.exec(html);
      return {
        total: Number((count?.[1] || "0").replace(/,/g, "")),
        projects: parseProjects(html),
      };
    } catch (error) {
      if (turn === tries - 1) return { total: 0, projects: [], failed: String(error?.message || error) };
      await nap(2500);
    }
  }
  return { total: 0, projects: [], failed: "?" };
}

const THIS_YEAR = new Date().getFullYear();
const audit = [];
let done = 0;
let fetched = 0;
for (const axis of rows) {
  const key = `${axis.subject}::${axis.concept}`;
  let found = cache[key];
  if (!found) {
    found = await ask(axis.concept);
    cache[key] = found;
    fetched += 1;
    await nap(700);
  }
  // 이 개념을 실제로 가리키는 말만 남긴다. 과목 이름과 넓은 말은 뺀다.
  // **개념 쪽에서도 조사를 뗀다.** 이걸 안 해서 「지층과 지질시대」가 '지층과'로 남았고,
  // "지층 탄성파 속도 정보 도출" 같은 딱 맞는 연구를 못 찾았다고 셌다.
  const aim = new Set(words(axis.concept).map(stem)
    .filter((one) => one.length >= 2)
    .filter((one) => norm(one) !== norm(axis.subject))
    .filter((one) => !NOT_POINTING.has(one)));
  const univ = found.projects.filter((one) => isUniv(one.org));
  // 연결성 — 상위 과제 제목이 이 개념에 닿는가.
  const linked = univ.filter((one) => words(one.title).some((word) => touches(word, aim)));
  // 실용성 — 최근 10년 안의 대학 과제. 20년 전 과제로는 "지금 이렇게 이어진다"고 말할 수 없다.
  const fresh = linked.filter((one) => Number(one.year) >= THIS_YEAR - 10);
  audit.push({
    subject: axis.subject, concept: axis.concept,
    total: found.total, failed: found.failed || "",
    projects: found.projects, univ: univ.length, linked: linked.length, fresh: fresh.length,
    best: fresh[0] || linked[0] || univ[0] || found.projects[0] || null,
  });
  done += 1;
  process.stdout.write(`\r재는 중 ${done}/${rows.length}  ${axis.subject} / ${axis.concept}                    `);
  await nap(700);
}
process.stdout.write("\r" + " ".repeat(78) + "\r");
// 받아 온 것을 저장한다. 세는 규칙은 몇 번이고 다시 볼 것이고, 그때마다 152번씩 다시 물어보는 것은
// 남의 서버에 할 짓이 아니다. 실제로 규칙을 두 번 고치는 동안 두 번을 헛되이 다시 받았다.
if (fetched) await writeFile(CACHE, JSON.stringify(cache), "utf8");

const solid = audit.filter((one) => one.fresh >= 2);
const okay = audit.filter((one) => one.fresh === 1 || (one.fresh === 0 && one.linked >= 1));
const empty = audit.filter((one) => one.linked === 0);
const broke = audit.filter((one) => one.failed);

console.log(`개념 ${audit.length}개를 NTIS 공개 검색으로 전수로 쟀습니다 (AI 안 씀 · ₩0)\n`);
console.log(`  탄탄함  (최근 대학 연구가 둘 이상 닿음):  ${solid.length}개 (${Math.round(solid.length / audit.length * 100)}%)`);
console.log(`  쓸 만함 (하나만 닿거나 옛 연구):          ${okay.length}개`);
console.log(`  빔      (닿는 대학 연구가 없음):          ${empty.length}개 (${Math.round(empty.length / audit.length * 100)}%)`);
if (broke.length) console.log(`  못 물어봄:                                ${broke.length}개`);

console.log("\n■ 빔 — 이 개념에는 대학 연구를 붙일 수 없습니다\n");
for (const one of empty) {
  console.log(`  ${one.subject} / ${one.concept}  (과제 ${one.total.toLocaleString()}건 · 대학 ${one.univ}건)`);
  if (one.best) console.log(`     상위: ${one.best.title.slice(0, 60)} — ${one.best.org}`);
}

console.log("\n■ 탄탄함 — 붙일 수 있습니다 (앞 12개만)\n");
for (const one of solid.slice(0, 12)) {
  console.log(`  ${one.subject} / ${one.concept}  (과제 ${one.total.toLocaleString()}건)`);
  console.log(`     → ${one.best.title.slice(0, 64)}`);
  console.log(`        ${one.best.year} · ${one.best.org}${one.best.lead ? ` · ${one.best.lead}` : ""}`);
}

if (OUT) {
  const e = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const card = (one, kind) => `<div class="card ${kind}">
    <div class=c>${e(one.subject)} / <b>${e(one.concept)}</b>
      <span>과제 ${one.total.toLocaleString()}건 · 대학 ${one.univ}/${one.projects.length}</span></div>
    ${one.best ? `<div class=p><b>${e(one.best.title)}</b><br><span class=m>${e(one.best.year)} · ${e(one.best.org)}${one.best.lead ? ` · ${e(one.best.lead)}` : ""}</span></div>` : `<div class=p class=m>닿는 과제가 없습니다</div>`}
  </div>`;
  await writeFile(OUT, `<!doctype html><meta charset=utf-8><title>개념마다 대학 연구가 붙는가</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--red:#c0392b;--amber:#b7791f;--ok:#2d7a4f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 28px;font-size:14px}
h2{font-size:17px;margin:36px 0 10px;padding-top:20px;border-top:1px solid var(--line)}
.note{color:var(--dim);font-size:13.5px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;align-items:baseline}
.big{font-size:30px;font-weight:700;letter-spacing:-.5px}
.card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:11px 14px;margin:0 0 8px}
.card.empty{border-left-color:var(--red)}.card.okay{border-left-color:var(--amber)}.card.solid{border-left-color:var(--ok)}
.card .c{font-size:13.5px;color:var(--dim)}.card .c b{color:var(--ink);font-size:14.5px}
.card .c span{float:right;font-size:12px}
.card .p{font-size:13.5px;background:#f7f8fa;border-radius:6px;padding:7px 10px;margin-top:6px}
.card .m{color:var(--dim);font-size:12.5px}
</style><div class=wrap>
<h1>개념마다 대학 연구가 붙는지 전수로 쟀습니다</h1>
<p class=sub>개념 ${audit.length}개 · NTIS 공개 검색 · AI를 쓰지 않았습니다 (₩0) · ${new Date().toLocaleDateString("ko-KR")}</p>
<div class=box>
<div><span class=big style="color:var(--ok)">${solid.length}</span><div class=note>탄탄함</div></div>
<div><span class=big style="color:var(--amber)">${okay.length}</span><div class=note>쓸 만함</div></div>
<div><span class=big style="color:var(--red)">${empty.length}</span><div class=note>빔</div></div></div>
<p>대학 연구는 <b>참고문헌이 아니라 「다음에 해 볼 것」</b>에 들어갑니다. 학생이 읽을 원문이 없기 때문입니다.
대신 "네 탐구가 대학에서 어떻게 이어지는지"는 지어내지 않고 사실로 말할 수 있습니다.</p>
<h2>빔 ${empty.length}개 <span class=note>대학 연구를 붙일 수 없습니다</span></h2>
${empty.map((one) => card(one, "empty")).join("\n")}
<h2>쓸 만함 ${okay.length}개 <span class=note>하나만 닿거나, 10년보다 오래된 연구입니다</span></h2>
${okay.map((one) => card(one, "okay")).join("\n")}
<h2>탄탄함 ${solid.length}개</h2>
${solid.map((one) => card(one, "solid")).join("\n")}
</div>`, "utf8");
  console.log(`\n${OUT}`);
}
