// 개념마다 붙일 대학 연구를 **인덱스로 굳혀 둔다.**
//
// 보고서를 만들 때마다 NTIS에 물어보지 않는다. 이유가 셋이다.
//   · 연구는 하루 만에 안 바뀐다. 매번 물어볼 이유가 없다.
//   · 보고서를 만드는 길에 남의 서버를 끼워 넣으면, 그쪽이 느릴 때 우리 보고서가 늦는다.
//     (공공데이터에서 실제로 겪었다 — 6초를 넘겨 참고 자료가 비어 나갔다.)
//   · 키가 없어도 돌아간다. 책 인덱스와 같은 방식이다.
//
// 재료는 전수로 재면서 받아 둔 두 캐시다.
//   .cache_ntis_goodresult.json — 「국가R&D 우수성과」 (쉬운 말, 전국 대학)
//   .cache_ntis_projects.json   — 「NTIS 국가R&D 과제」 (어렵지만 양이 많음)
//
// 출처: 국가과학기술지식정보서비스(NTIS), 한국과학기술정보연구원.
// 같은 자료가 공공데이터포털에 공공누리 제1유형(출처표시)으로 공개되어 있다.
// **키가 나오면 공개 화면 대신 NTIS OpenAPI로 다시 받아 이 인덱스를 새로 만든다.** 그때 이 파일만 고치면 된다.
//
//   node tools/build_univ_research_index.mjs          — 무엇이 들어가는지만 보여 준다
//   node tools/build_univ_research_index.mjs --write  — 실제로 만든다
import { readFile, writeFile } from "node:fs/promises";
import { buildSpread, pickResearch } from "../admission_worker_skeleton/univ_research_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const build = (name) => here(`../public/keyword-engine/build/${name}`);
const axisIndex = JSON.parse(await readFile(here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const good = JSON.parse(await readFile(build(".cache_ntis_goodresult.json"), "utf8"));
const proj = JSON.parse(await readFile(build(".cache_ntis_projects.json"), "utf8"));
// 낱말 규칙으로는 못 거르는 것들. 손으로 지우고 까닭을 적어 둔다 — 책 태그 고칠 때와 같은 방식이다.
const fixes = JSON.parse(await readFile(here("./fix_univ_research_2026_09.json"), "utf8"));
const dropped = new Map();
for (const one of fixes.drops || []) {
  if (!dropped.has(one.concept)) dropped.set(one.concept, []);
  dropped.get(one.concept).push(one);
}
let handDropped = 0;
const OUT = here("../public/keyword-engine/seed/engine-index/univ_research_index.v1.json");

const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(axis);
}

// 우수성과 상세 주소. 목록에서 받은 techId 로 만든다.
const bestUrl = (id) => `https://www.ntis.go.kr/outcomes/tpopup/xtApplDtlInfoAction.do?cmd=best&techId=${id}&pageCode=TH_BEST_RST_DTL`;
const projUrl = (id) => `https://www.ntis.go.kr/project/pjtInfo.do?pjtId=${id}&pageCode=TH_TOTAL_PJT_DTL`;

const spread = buildSpread(axisIndex);
const index = {};
let filled = 0;
let fromBest = 0;
for (const axis of rows) {
  const key = `${axis.subject}::${axis.concept}`;
  const pool = [
    ...(good[key]?.items || []).map((one) => ({ ...one, kind: "best", url: one.url || bestUrl(one.id) })),
    ...(proj[key]?.projects || []).map((one) => ({ ...one, kind: "project", url: projUrl(one.id), summary: "" })),
  ];
  const bad = dropped.get(key) || [];
  // 손 고침은 **거르기 전에** 적용한다. 그래야 지운 자리에 다음 것이 올라온다.
  const clean = pool.filter((one) => {
    const hit = bad.find((drop) => String(one.title || "").replace(/\s+/g, "").startsWith(drop.title.replace(/\s+/g, "")));
    if (hit) handDropped += 1;
    return !hit;
  });
  const picked = pickResearch(clean, { concept: axis.concept, subject: axis.subject, limit: 2, spread });
  if (!picked.length) continue;
  filled += 1;
  if (picked[0].kind === "best") fromBest += 1;
  index[key] = picked;
}

const pack = {
  version: "univ-research-index-v1",
  built_at: new Date().toISOString().slice(0, 10),
  source: "국가과학기술지식정보서비스(NTIS) · 한국과학기술정보연구원",
  license: "공공누리 제1유형(출처표시)",
  note: "개념마다 대학 연구 최대 2건. 참고문헌이 아니라 「다음에 해 볼 것」에 붙는다 — 학생이 읽을 원문이 아니다.",
  concepts: index,
};

console.log(`개념 ${rows.length}개 가운데 ${filled}개에 대학 연구를 붙입니다 (${Math.round(filled / rows.length * 100)}%)`);
console.log(`  쉬운 글(우수성과)이 앞에 오는 자리: ${fromBest}개`);
console.log(`  어려운 글(과제)만 있는 자리:      ${filled - fromBest}개`);
console.log(`  빈 자리:                          ${rows.length - filled}개\n`);
for (const axis of rows.slice(0, 8)) {
  const got = index[`${axis.subject}::${axis.concept}`];
  if (!got) continue;
  console.log(`  ${axis.subject} / ${axis.concept}`);
  for (const one of got) console.log(`     ${one.kind === "best" ? "★" : "·"} ${one.title.slice(0, 56)} — ${one.org}`);
}

if (process.argv.includes("--write")) {
  await writeFile(OUT, JSON.stringify(pack, null, 2), "utf8");
  console.log(`\n${OUT.pathname.replace(/^\//, "")}`);
} else {
  console.log("\n(보여 주기만 했습니다. 만들려면 --write 를 붙이세요.)");
}
