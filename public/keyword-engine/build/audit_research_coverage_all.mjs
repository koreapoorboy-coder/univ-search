// 대학 연구를 붙일 수 있는 자리를 **학년 전체**로 본다. 받아 둔 것을 다시 세는 것이라 ₩0이다.
//
// 앞서 잰 것을 겹친다.
//   · 「국가R&D 우수성과」 — 쉬운 말, 전국 대학  (.cache_ntis_goodresult.json)
//   · 「NTIS 국가R&D 과제」 — 어렵지만 양이 많음 (.cache_ntis_projects.json)
//
// **왜 학년으로 나누는가.** 지금까지 "고1이 읽을 수 있나"를 기준으로 말해 왔는데 그건 틀렸다.
// 이 프로그램은 1·2·3학년이 다 쓴다. 그리고 실제로 개념 152개는 이미 세 학년에 걸쳐 있다 —
// 잰 범위가 좁았던 게 아니라, **나눠서 보지 않은 것**이 빠진 일이었다.
//
// 과목 구분은 2022 개정 교육과정을 따른다(국가교육과정정보센터 기준).
//   공통과목   — 1학년이 다 듣는다
//   일반선택   — 주로 2학년
//   진로선택   — 주로 2~3학년, 3학년에 몰린다
// 학교마다 편성이 조금씩 다르므로 '주로'다. 구분 자체는 교육과정에 정해진 것이라 흔들리지 않는다.
//
//   node public/keyword-engine/build/audit_research_coverage_all.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const good = JSON.parse(await readFile(here("./.cache_ntis_goodresult.json"), "utf8"));
const proj = JSON.parse(await readFile(here("./.cache_ntis_projects.json"), "utf8"));
const OUT = process.argv.find((one) => /\.html$/i.test(one)) || "";

// 2022 개정 교육과정 과목 구분. 우리 개념 인덱스의 과목 이름 그대로 적는다.
const STAGE = {
  공통과목: ["공통국어1", "공통국어2", "공통수학1", "공통수학2", "통합과학1", "통합과학2",
    "통합사회1", "통합사회2", "과학탐구실험1", "과학탐구실험2"],
  일반선택: ["물리", "화학", "생명과학", "지구과학", "미적분1", "확률과 통계", "정보"],
  진로선택: ["세포와 물질대사", "물질과 에너지", "역학과 에너지", "전자기와 양자", "지구시스템과학", "기하"],
};
const WHEN = { 공통과목: "주로 1학년", 일반선택: "주로 2학년", 진로선택: "주로 2~3학년" };
const stageOf = (subject) => Object.keys(STAGE).find((key) => STAGE[key].includes(subject)) || "그 밖";

const words = (text) => String(text || "").split(/[^가-힣A-Za-z0-9]+/).filter((one) => one.length >= 2);
const JOSA = /(으로서|으로써|에서의|에게서|에서는|이라는|라는|으로|에서|에게|부터|까지|보다|과의|와의|의|가|이|은|는|을|를|에|도|만|와|과|로|랑)$/;
const stem = (word) => { const bare = String(word || "").replace(JOSA, ""); return bare.length >= 2 ? bare : String(word || ""); };
const NOT_POINTING = new Set([
  "자료", "분석", "이해", "활용", "적용", "탐구", "사례", "방법", "과정", "구성", "표현", "해석",
  "결론", "도출", "수집", "정리", "비교", "관찰", "조사", "평가", "발표", "작성", "판단", "검증",
  "변화", "구조", "성질", "관계", "특성", "현상", "문제", "해결", "기본", "기초", "개념", "원리",
  "체계", "시스템", "종류", "방식", "발전", "발견", "관점", "증거", "독립", "사건", "활동", "실험",
  "유용성", "필요성", "세계", "우리", "여러", "가지", "수용", "다양한", "새로운", "관련", "중심", "분야",
]);
const UNIV = /(대학교|대학(?!원생)|과학기술원|KAIST|POSTECH|UNIST|GIST|DGIST|산학협력단)/;
const SCHOOL = /(고등학교|중학교|초등학교)/;
const isUniv = (org) => UNIV.test(org) && !SCHOOL.test(org);

function pointers(concept, subject) {
  const kept = [];
  for (const raw of words(concept).map(stem)) {
    if (raw.length < 2 || NOT_POINTING.has(raw)) continue;
    if (raw.replace(/\s+/g, "") === String(subject || "").replace(/\s+/g, "")) continue;
    if (!kept.includes(raw)) kept.push(raw);
  }
  return kept;
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
const onTopic = (title, aim) => words(title).some((word) => touches(word, aim));

const THIS_YEAR = new Date().getFullYear();
const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(axis);
}

const audit = rows.map((axis) => {
  const key = `${axis.subject}::${axis.concept}`;
  const aim = new Set(pointers(axis.concept, axis.subject));
  // 우수성과 — 쉬운 말. 대학 것만 센다.
  const g = (good[key]?.items || []).filter((one) => onTopic(one.title, aim) && isUniv(one.org));
  // NTIS 과제 — 어렵다. 대학 + 최근 10년.
  const p = (proj[key]?.projects || []).filter((one) =>
    isUniv(one.org) && onTopic(one.title, aim) && Number(one.year) >= THIS_YEAR - 10);
  return {
    subject: axis.subject, concept: axis.concept, stage: stageOf(axis.subject),
    good: g, proj: p,
    // 쉬운 것이 먼저다. 없으면 어려운 것으로 내려간다. 둘 다 없으면 안 붙인다.
    pick: g[0] || p[0] || null,
    from: g.length ? "우수성과" : p.length ? "NTIS 과제" : "",
  };
});

const count = (list, test) => list.filter(test).length;
const covered = (one) => one.good.length > 0 || one.proj.length > 0;

console.log(`개념 ${audit.length}개 · 학년 전체 · 받아 둔 것을 다시 셌습니다 (AI 안 씀 · ₩0)\n`);
const head = "구분        과목   개념   우수성과만  과제만  둘 다   붙는다   빈다";
console.log(head);
console.log("-".repeat(head.length + 8));
const order = ["공통과목", "일반선택", "진로선택", "그 밖"];
const bands = [];
for (const stage of order) {
  const list = audit.filter((one) => one.stage === stage);
  if (!list.length) continue;
  const subjects = new Set(list.map((one) => one.subject)).size;
  const onlyGood = count(list, (one) => one.good.length && !one.proj.length);
  const onlyProj = count(list, (one) => !one.good.length && one.proj.length);
  const both = count(list, (one) => one.good.length && one.proj.length);
  const ok = count(list, covered);
  bands.push({ stage, list, subjects, onlyGood, onlyProj, both, ok });
  console.log(`${(stage + "(" + WHEN[stage] + ")").padEnd(20)}${String(subjects).padStart(3)}${String(list.length).padStart(6)}`
    + `${String(onlyGood).padStart(9)}${String(onlyProj).padStart(9)}${String(both).padStart(7)}`
    + `${String(ok).padStart(8)} (${Math.round(ok / list.length * 100)}%)${String(list.length - ok).padStart(6)}`);
}
const all = count(audit, covered);
console.log(`\n합계 — 붙는다 ${all}개 (${Math.round(all / audit.length * 100)}%) · 빈다 ${audit.length - all}개`);
console.log(`  우수성과로 붙는 것: ${count(audit, (one) => one.good.length)}개`);
console.log(`  과제로만 붙는 것:   ${count(audit, (one) => !one.good.length && one.proj.length)}개`);

for (const band of bands) {
  const blank = band.list.filter((one) => !covered(one));
  console.log(`\n■ ${band.stage} — 빈 자리 ${blank.length}개`);
  for (const one of blank) console.log(`   ${one.subject} / ${one.concept}`);
}

if (OUT) {
  const e = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const card = (one) => {
    const kind = one.good.length ? "good" : one.proj.length ? "proj" : "none";
    const it = one.pick;
    return `<div class="card ${kind}">
      <div class=c>${e(one.subject)} / <b>${e(one.concept)}</b>
        <span>${one.from ? e(one.from) : "없음"} · 우수성과 ${one.good.length} · 과제 ${one.proj.length}</span></div>
      ${it ? `<div class=p><b>${e(it.title)}</b>
        <div class=m>${e(it.year)} · <b>${e(it.org)}</b>${it.lead ? ` · ${e(it.lead)}` : ""}</div>
        ${it.summary ? `<div class=s>${e(it.summary)}</div>` : ""}</div>` : `<div class="p m">붙일 연구가 없습니다</div>`}
    </div>`;
  };
  const band = (b) => `<h2>${b.stage} <span class=note>${WHEN[b.stage]} · 과목 ${b.subjects}개 · 개념 ${b.list.length}개 ·
    붙는다 ${b.ok}개 (${Math.round(b.ok / b.list.length * 100)}%)</span></h2>
    <p class=note>우수성과만 ${b.onlyGood} · 과제만 ${b.onlyProj} · 둘 다 ${b.both} · 빈다 ${b.list.length - b.ok}</p>
    ${b.list.slice().sort((x, y) => (y.good.length + y.proj.length) - (x.good.length + x.proj.length)).map(card).join("\n")}`;
  await writeFile(OUT, `<!doctype html><meta charset=utf-8><title>학년 전체 · 대학 연구가 붙는 자리</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--red:#c0392b;--amber:#b7791f;--ok:#2d7a4f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 24px;font-size:14px}
h2{font-size:18px;margin:38px 0 4px;padding-top:22px;border-top:1px solid var(--line)}
h2 .note{font-weight:400}
.note{color:var(--dim);font-size:13.5px}
table{border-collapse:collapse;width:100%;margin:16px 0 8px;font-size:13.5px;background:#fff}
th,td{border:1px solid var(--line);padding:7px 9px;text-align:right}
th:first-child,td:first-child{text-align:left}
th{background:#f4f5f7;font-weight:600}
.card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:11px 14px;margin:0 0 8px}
.card.none{border-left-color:var(--red)}.card.proj{border-left-color:var(--amber)}.card.good{border-left-color:var(--ok)}
.card .c{font-size:13.5px;color:var(--dim)}.card .c b{color:var(--ink);font-size:14.5px}
.card .c span{float:right;font-size:12px}
.card .p{font-size:13.5px;background:#f7f8fa;border-radius:6px;padding:7px 10px;margin-top:6px}
.card .m{color:var(--dim);font-size:12.5px}
.card .s{color:#4b5563;font-size:12.5px;margin-top:3px}
</style><div class=wrap>
<h1>대학 연구가 붙는 자리 — 학년 전체</h1>
<p class=sub>개념 ${audit.length}개 · 2022 개정 교육과정 구분 · 받아 둔 것을 다시 셌습니다 (₩0) · ${new Date().toLocaleDateString("ko-KR")}</p>
<p>쉬운 글(<b>우수성과</b>)이 먼저고, 없으면 <b>NTIS 과제</b>로 내려갑니다. 둘 다 없으면 붙이지 않습니다.
대학 연구는 참고문헌이 아니라 <b>「다음에 해 볼 것」</b>에 들어갑니다 — 학생이 읽을 원문이 아니기 때문입니다.</p>
<table><tr><th>구분</th><th>언제</th><th>과목</th><th>개념</th><th>우수성과만</th><th>과제만</th><th>둘 다</th><th>붙는다</th><th>빈다</th></tr>
${bands.map((b) => `<tr><td>${b.stage}</td><td>${WHEN[b.stage]}</td><td>${b.subjects}</td><td>${b.list.length}</td>
<td>${b.onlyGood}</td><td>${b.onlyProj}</td><td>${b.both}</td>
<td><b>${b.ok}</b> (${Math.round(b.ok / b.list.length * 100)}%)</td><td>${b.list.length - b.ok}</td></tr>`).join("")}
<tr><th>합계</th><th></th><th>${new Set(audit.map((o) => o.subject)).size}</th><th>${audit.length}</th>
<th>${count(audit, (o) => o.good.length && !o.proj.length)}</th><th>${count(audit, (o) => !o.good.length && o.proj.length)}</th>
<th>${count(audit, (o) => o.good.length && o.proj.length)}</th>
<th>${all} (${Math.round(all / audit.length * 100)}%)</th><th>${audit.length - all}</th></tr></table>
${bands.map(band).join("\n")}
</div>`, "utf8");
  console.log(`\n${OUT}`);
}
