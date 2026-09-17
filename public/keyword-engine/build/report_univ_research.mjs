// 지금 학생 화면에 실제로 붙는 것을 전부 한 장에 펼친다. AI를 쓰지 않으므로 ₩0이다.
//
// 인덱스는 JSON이라 눈으로 읽기 어렵다. 잘못 붙은 것은 **읽어 봐야** 보인다 — 이 저장소에서
// 여러 번 그렇게 잡았다. 그래서 개념 하나하나에 무엇이 붙었는지 그대로 펼쳐 놓는다.
//
//   node public/keyword-engine/build/report_univ_research.mjs [나갈파일.html]
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const index = JSON.parse(await readFile(here("../seed/engine-index/univ_research_index.v1.json"), "utf8"));
const OUT = process.argv.find((one) => /\.html$/i.test(one)) || "";

const STAGE = {
  공통과목: ["공통국어1", "공통국어2", "공통수학1", "공통수학2", "통합과학1", "통합과학2",
    "통합사회1", "통합사회2", "과학탐구실험1", "과학탐구실험2"],
  일반선택: ["물리", "화학", "생명과학", "지구과학", "미적분1", "확률과 통계", "정보"],
  진로선택: ["세포와 물질대사", "물질과 에너지", "역학과 에너지", "전자기와 양자", "지구시스템과학", "기하"],
};
const WHEN = { 공통과목: "주로 1학년", 일반선택: "주로 2학년", 진로선택: "주로 2~3학년" };
const stageOf = (subject) => Object.keys(STAGE).find((key) => STAGE[key].includes(subject)) || "그 밖";

const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push({ ...axis, key, stage: stageOf(axis.subject), found: index.concepts[key] || [] });
}

const has = rows.filter((one) => one.found.length);
const hasMajor = rows.filter((one) => one.found.some((two) => two.major));
const blank = rows.filter((one) => !one.found.length);

console.log(`개념 ${rows.length}개\n`);
console.log(`  대학 연구가 붙는다      ${has.length}개 (${Math.round(has.length / rows.length * 100)}%)`);
console.log(`  학과까지 붙는다        ${hasMajor.length}개`);
console.log(`  빈 자리               ${blank.length}개`);

for (const stage of ["공통과목", "일반선택", "진로선택"]) {
  const list = rows.filter((one) => one.stage === stage);
  const ok = list.filter((one) => one.found.length).length;
  console.log(`  · ${stage}(${WHEN[stage]}) ${ok}/${list.length}`);
}

if (OUT) {
  const e = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const card = (one) => {
    const kind = !one.found.length ? "none" : one.found.some((t) => t.major) ? "major" : "res";
    return `<div class="card ${kind}">
      <div class=c>${e(one.subject)} / <b>${e(one.concept)}</b><span>${e(one.title || "")}</span></div>
      ${one.found.map((two) => `<div class=p>
        <b>${e(two.title)}</b>
        <div class=m>${e(two.org)}${two.lead ? ` · ${e(two.lead)}` : ""}${two.year ? ` · ${e(two.year)}` : ""}
          ${two.kind === "best" ? '<i class=tag>우수성과</i>' : '<i class="tag dim">국가R&amp;D 과제</i>'}</div>
        ${two.summary ? `<div class=s>${e(two.summary)}</div>` : ""}
        ${two.major ? `<div class=mj><b>${e(two.major.name)}</b>에서 배워요 · ${e((two.major.courses || []).join(" · "))}
          ${(two.major.jobs || []).length ? `<span>졸업 후 — ${e(two.major.jobs.join(" · "))}</span>` : ""}</div>` : ""}
      </div>`).join("") || `<div class="p m">붙일 연구가 없습니다</div>`}
    </div>`;
  };
  const band = (stage) => {
    const list = rows.filter((one) => one.stage === stage);
    const ok = list.filter((one) => one.found.length).length;
    const mj = list.filter((one) => one.found.some((t) => t.major)).length;
    return `<h2>${stage} <span class=note>${WHEN[stage]} · 개념 ${list.length}개 · 연구 ${ok}개 · 학과까지 ${mj}개</span></h2>
      ${list.slice().sort((a, b) => b.found.length - a.found.length).map(card).join("\n")}`;
  };
  await writeFile(OUT, `<!doctype html><meta charset=utf-8><title>학생 화면에 붙는 대학 연구</title><style>
:root{--ink:#1c1c1e;--dim:#6b6b70;--line:#e3e3e6;--bg:#fbfbfc;--red:#c0392b;--amber:#b7791f;--ok:#2d7a4f;--blue:#2458ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Malgun Gothic","맑은 고딕",system-ui,sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--dim);margin:0 0 24px;font-size:14px}
h2{font-size:18px;margin:38px 0 10px;padding-top:22px;border-top:1px solid var(--line)}
h2 .note{font-weight:400}.note{color:var(--dim);font-size:13.5px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;align-items:baseline}
.big{font-size:30px;font-weight:700;letter-spacing:-.5px}
.card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:11px 14px;margin:0 0 8px}
.card.none{border-left-color:var(--red)}.card.res{border-left-color:var(--amber)}.card.major{border-left-color:var(--ok)}
.card .c{font-size:13.5px;color:var(--dim)}.card .c b{color:var(--ink);font-size:14.5px}
.card .c span{float:right;font-size:12px}
.card .p{font-size:13.5px;background:#f7f8fa;border-radius:6px;padding:8px 10px;margin-top:6px}
.card .m{color:var(--dim);font-size:12.5px}
.card .s{color:#4b5563;font-size:12.5px;margin-top:4px}
.tag{font-style:normal;font-size:11px;background:#e8f0ff;color:var(--blue);border-radius:4px;padding:1px 5px;margin-left:4px}
.tag.dim{background:#f1f2f4;color:#8b8f98}
.mj{margin-top:6px;padding:6px 9px;background:#fff;border:1px solid var(--line);border-radius:7px;font-size:12.5px}
.mj b{color:var(--blue)}.mj span{display:block;color:var(--dim);font-size:12px;margin-top:2px}
</style><div class=wrap>
<h1>지금 학생 화면에 붙는 대학 연구</h1>
<p class=sub>개념 ${rows.length}개 · 「다음에 해 볼 것」에 들어갑니다 · 출처 ${e(index.source)} · ${index.built_at}</p>
<div class=box>
<div><span class=big style="color:var(--ok)">${hasMajor.length}</span><div class=note>학과까지 붙음</div></div>
<div><span class=big style="color:var(--amber)">${has.length - hasMajor.length}</span><div class=note>연구만 붙음</div></div>
<div><span class=big style="color:var(--red)">${blank.length}</span><div class=note>빈 자리</div></div></div>
<p>대학 연구는 <b>참고문헌이 아닙니다.</b> 학생이 읽을 원문이 없기 때문입니다. 대신 지어낸 말이 아니라
국가 연구개발 기록 그대로라, 진로를 물었을 때 대답할 거리가 됩니다.
학과는 <b>그 학과의 개설 교과목에 이 개념이 실제로 들어 있을 때만</b> 붙습니다.</p>
${["공통과목", "일반선택", "진로선택"].map(band).join("\n")}
</div>`, "utf8");
  console.log(`\n${OUT}`);
}
