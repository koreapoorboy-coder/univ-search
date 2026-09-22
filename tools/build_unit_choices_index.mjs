// 학생 화면이 읽을 **단원 고르기 목록**을 만든다. ₩0.
//
// 왜 필요한가. 지금 화면은 주제 칸에 **과목 이름**을 보낸다(keyword: "물리"). 엔진은 무엇을 탐구할지
// 모르는 채로 쓰고, 그래서 같은 과제를 두 번 돌리면 「보호필름 정전기」와 「투명 전극 저항」처럼
// 완전히 다른 주제가 나온다(유료 확인 2026-09-21). 단원을 알아낸 과제도 마찬가지다 — 단원만 알고
// 주제는 비어 있다.
//
// 그래서 학생에게 **낱말 몇 개를 보여 주고 짚게 한다.** 단원 이름은 학생이 모르지만, 자기 수업에서
// 「등가속도 운동」을 배웠는지는 안다.
//
// 이 파일은 그 목록을 화면이 바로 쓸 수 있게 줄여 둔다. 원본(subject_concept_engine_map)은 428KB라
// 화면이 통째로 받기에는 크다.
//
// 차례를 정하는 재료 셋:
//   · 전공 → 단원   major_subject_concept_index (대학 33곳 교육과정)
//   · 단원 → 진로   linked_career_bridge (단원마다 손으로 적어 둔 것)
//   · **계열 → 단원** 여기서 새로 만든다. 전공이 계열로 묶여 있으므로(공학 11·사회 7·자연 6·
//     의약 4·인문 3·예체능 2), 그 계열 전공들이 가리키는 단원을 모으면 된다. 자율전공·미정 학생은
//     전공이 없지만 계열은 반드시 고르므로, 이 표가 있어야 빈손으로 오는 학생이 없다.
//
//   node tools/build_unit_choices_index.mjs           — 무엇이 들어가는지만 보여 준다
//   node tools/build_unit_choices_index.mjs --write   — 실제로 쓴다
import { readFile, writeFile } from "node:fs/promises";
import { expandMajorTerms } from "../admission_worker_skeleton/upload_analysis_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");
const SEED = "../public/keyword-engine/seed";
const read = (path) => readFile(here(`${SEED}/${path}`), "utf8").then(JSON.parse);

const conceptMap = await read("textbook-v1/subject_concept_engine_map.json");
const majorSubject = await read("engine-index/major_subject_concept_index.v1.json");
const majorCurriculum = await read("engine-index/major_curriculum_index.v1.json");
const patch = JSON.parse(await readFile(here("./fix_career_bridge_2026_09.json"), "utf8"));

const majors = Object.keys(majorCurriculum.majors || {});
const groupOf = {};
for (const [name, body] of Object.entries(majorCurriculum.majors || {})) groupOf[name] = body.group || "";
const terms = Object.fromEntries(majors.map((one) => [one, expandMajorTerms(one).map((x) => x.term)]));

const out = {};
let units = 0;
let withCareer = 0;
let patched = 0;
const perGroup = {};

for (const [subject, body] of Object.entries(conceptMap)) {
  const rows = [];
  for (const [concept, one] of Object.entries(body.concepts || {})) {
    units += 1;
    // 원래 적힌 진로 칸 + 손으로 더한 것. **지우지 않고 더하기만** 한다.
    const extra = ((patch.add || {})[subject] || {})[concept] || [];
    if (extra.length) patched += 1;
    const bridge = [...new Set([...(one.linked_career_bridge || []), ...extra])]
      .map((x) => String(x || "").trim()).filter(Boolean);

    // 이 단원에 닿는 전공. 두 길이 있는데 **성격이 다르므로 나눠 둔다.**
    //   · 진로 칸(bridge) — 단원마다 손으로 적은 것이라 **주제에 가깝다**
    //   · 대학 교육과정 — 그 전공이 배우는 과목이라 넓다
    // 기계공학과 학생에게 「물질의 전기적 특성」(전공 수업에 전기공학이 있어서)보다 「힘과 운동」이
    // 먼저여야 한다. 그래서 진로 칸으로 걸린 것을 따로 남겨 위로 올린다.
    const byBridge = majors.filter((name) => bridge.some((word) => terms[name].some((t) => word.includes(t) || t.includes(word))));
    const byCourse = majors.filter((name) => {
      const cell = (majorSubject.majors || {})[name] || {};
      return ((cell[subject] || {}).concepts || []).includes(concept);
    });
    const reach = [...new Set([...byBridge, ...byCourse])];
    if (reach.length) withCareer += 1;
    const groups = [...new Set(reach.map((name) => groupOf[name]).filter(Boolean))];
    groups.forEach((g) => { perGroup[g] = (perGroup[g] || 0) + 1; });

    rows.push({
      c: concept,
      // 학생이 짚을 낱말. 다섯 개까지 — 더 보여 주면 고르지 못한다.
      k: (one.micro_keywords || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 5),
      // 화면에 보여 주는 것은 다섯 개까지지만, **안내문과 맞춰 보는 것은 더 많이** 본다.
      // 운영 검사 2026-09-22: 「매체·광고·뉴스·표현 전략」을 사전에 더했는데도 여섯째부터라 잘려 나가,
      // 매체 비평 과제가 그 단원을 못 찾았다. 보이는 것과 맞춰 보는 것은 다른 일이다.
      w: (one.micro_keywords || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 40),
      // 학생 말로 쓴 탐구 질문 한 줄(있으면).
      t: String((one.student_topics || [])[0] || "").trim().slice(0, 160),
      // 이 단원에 닿는 전공과 계열. b 는 그 가운데 **진로 칸으로 걸린 전공**이다(주제에 더 가깝다).
      m: reach,
      b: byBridge,
      g: groups,
    });
  }
  out[subject] = rows.filter((row) => row.k.length);
}

console.log(`과목 ${Object.keys(out).length}개 · 단원 ${units}개`);
console.log(`  진로/전공이 닿는 단원 ${withCareer} (${Math.round((withCareer / units) * 100)}%)`);
console.log(`  손으로 진로를 더한 단원 ${patched}`);
console.log(`  계열별로 닿는 단원 수: ${Object.entries(perGroup).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log();
for (const [subject, rows] of Object.entries(out)) {
  const none = rows.filter((row) => !row.m.length).length;
  console.log(`  ${subject.padEnd(14)} 단원 ${String(rows.length).padStart(3)} · 전공이 안 닿는 단원 ${String(none).padStart(2)}${none ? "" : "  ✓"}`);
}

if (WRITE) {
  const body = {
    version: "unit-choices-v1",
    built_at: new Date().toISOString().slice(0, 10),
    note: "학생에게 보여 줄 단원별 낱말. c=단원, k=짚을 낱말, t=탐구 질문, m=닿는 전공, g=닿는 계열. tools/build_unit_choices_index.mjs 가 만든다.",
    groups: Object.fromEntries(Object.entries(groupOf).map(([k, v]) => [k, v])),
    subjects: out,
  };
  const path = here(`${SEED}/engine-index/unit_choices.v1.json`);
  await writeFile(path, `${JSON.stringify(body)}\n`, "utf8");
  const size = (await readFile(path, "utf8")).length;
  console.log(`\n썼습니다: seed/engine-index/unit_choices.v1.json (${(size / 1024).toFixed(0)}KB)`);
} else {
  console.log("\n(보여 주기만 했습니다. 쓰려면 --write 를 붙이세요.)");
}
