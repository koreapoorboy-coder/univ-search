// 대학 연구 소개 글(서울대 연구성과)을 참고 자료와 「다음에 해 볼 것」에 붙인다 — univ_web_v1.mjs.
//
// 사용자가 짚은 걱정이 이 파일의 이유다: 참고 자료에 넣은 대학 홈페이지 글이 나중에 사라지면 곤란하다.
// 세 겹으로 막는다 — 달마다 정리(sync) · 넣기 직전에 열어 보기 · 접속일 적기. 그리고 참고 자료는
// 보고서 내용을 받쳐야 하므로, 개념만 같은 글은 참고 자료가 아니라 「다음에 해 볼 것」으로 간다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { accessDate, aliveOnly, asResearch, checkAlive, pickUnivWeb, webLine } from "../../../admission_worker_skeleton/univ_web_v1.mjs";
import { referencesBody } from "../../../admission_worker_skeleton/references_v1.mjs";
import { finalizeStageOutput, normalizeStudentData, STAGE } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const worker = (await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8")).replace(/\r\n/g, "\n");
const index = JSON.parse(await readFile(here("../seed/engine-index/snu_research_index.v1.json"), "utf8"));
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const post = (over = {}) => ({ id: "175802", title: "쉽게 분해되는 mRNA '고리'로 바꿔 세포공장 생산성 높여", team: "화학생물공학부 서상우 교수팀",
  date: "2026-09-15", url: "https://www.snu.ac.kr/research/highlights?md=v&bbsidx=175802", level: "보통", primary: true, ...over });
const answer = (status) => async () => ({ status, body: { cancel: async () => {} } });

// U1: 넣기 직전에 연다. 열리지 않으면 넣지 않는다.
{
  check(await checkAlive(post().url, { fetchImpl: answer(200) }), "U1 200 이면 산 글");
  check(!(await checkAlive(post().url, { fetchImpl: answer(404) })), "U1 404 면 사라진 글 — 넣지 않는다");
  check(!(await checkAlive(post().url, { fetchImpl: answer(302) })), "U1 다른 곳으로 넘기면 넣지 않는다 — 그 글이 아닐 수 있다");
  check(!(await checkAlive(post().url, { fetchImpl: async () => { throw new Error("timeout"); } })), "U1 시간이 넘으면 넣지 않는다");
  check(!(await checkAlive("http://www.snu.ac.kr/x", { fetchImpl: answer(200) })) && !(await checkAlive("", { fetchImpl: answer(200) })),
    "U1 https 주소가 아니면 넣지 않는다");
  let calls = 0;
  const alive = await aliveOnly([post({ url: "https://a/1" }), post({ url: "https://a/2" }), post({ url: "https://a/3" })], {
    limit: 1, fetchImpl: async (url) => { calls += 1; return { status: url.endsWith("1") ? 404 : 200, body: null }; },
  });
  check(alive.length === 1 && alive[0].url === "https://a/2" && calls === 2, "U1 첫 글이 사라졌으면 다음 글을 연다 — 필요한 만큼만");
  calls = 0;
  await aliveOnly(Array.from({ length: 9 }, (_, i) => post({ url: `https://a/${i}` })), { limit: 1, fetchImpl: async () => { calls += 1; return { status: 404 }; } });
  check(calls === 3, "U1 다 사라졌어도 셋까지만 연다 — 보고서가 느려지지 않게", String(calls));
}

// U2: 접속일을 적는다. 제출 뒤에 글이 사라져도 인용은 올바르다.
{
  check(accessDate(new Date("2026-09-18T20:00:00Z")) === "2026.09.19", "U2 접속일은 한국 날짜");
  const line = webLine({ ...post(), org: "서울대학교", accessed: "2026.09.18" });
  check(line === "서울대학교 (2026). 쉽게 분해되는 mRNA '고리'로 바꿔 세포공장 생산성 높여. 서울대학교 연구성과(화학생물공학부 서상우 교수팀). "
    + "https://www.snu.ac.kr/research/highlights?md=v&bbsidx=175802 (접속일: 2026.09.18)", "U2 웹 자료 인용 줄", line);
  check(webLine({ title: "가" }) === "" && webLine({ url: "https://x" }) === "", "U2 제목이나 주소가 없으면 줄을 안 만든다");
}

// U3: 참고 자료는 **과제 내용을 받쳐야** 한다. 개념만 같은 글은 참고 자료가 아니다.
{
  const battery = post({ title: "저비용 망간 기반 LMR 배터리, 전기차용 대형 셀 적용 가능성 높였다" });
  const task = "사과 갈변 산화·환원 반응 비타민C 데치기 실험";
  check(pickUnivWeb([battery], task, { skip: "산화와 환원", strict: true }).length === 0,
    "U3 「사과 갈변」 보고서의 참고 자료에 배터리 기사는 안 들어간다 (실제 테스트에서 나온 예)");
  check(pickUnivWeb([battery], task, { skip: "산화와 환원" }).length === 1,
    "U3 「다음에 해 볼 것」에는 들어간다 — 이 단원이 대학에서 어떻게 이어지는지 보여 주는 자리");
  const mrna = post();
  check(pickUnivWeb([battery, mrna], "mRNA 백신의 원리와 세포", { strict: true })[0]?.id === "175802", "U3 과제 낱말이 제목에 걸리면 참고 자료가 된다");
  const r = asResearch(mrna);
  check(r.org === "서울대학교" && r.lead === "화학생물공학부 서상우 교수팀" && r.year === "2026" && r.url.startsWith("https://"),
    "U3 「다음에 해 볼 것」 칸 모양으로 바뀐다");
}

// U4: 참고 자료 절에서의 자리 — 학생 자료 → 논문 → 대학 글 → 공개 자료 → 교과서.
{
  const lines = referencesBody({
    cards: [{ title: "부엌의 화학자", type: "도서" }],
    papers: [{ title: "논문 제목", author: "김", year: "2024", journal: "학회지" }],
    web: [{ ...post(), org: "서울대학교", accessed: "2026.09.18" }],
    datasets: [{ title: "공개 자료", org: "기관", id: "15000000" }],
    textbook: "가 교과서 · 나 단원",
  }).split("\n");
  check(lines.length === 5, "U4 다섯 줄", String(lines.length));
  check(lines[1].includes("학회지") && lines[2].includes("서울대학교 연구성과") && lines[3].includes("data.go.kr"),
    "U4 논문 → 대학 글 → 공개 자료 순서", lines.join(" | "));
  const built = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], sections: [{ title: "결론", body: "비타민C 처리가 갈변을 가장 늦췄다." }] }, {
    studentData: normalizeStudentData({ measurementName: "m", unit: "점", conditions: [{ label: "A", values: [1, 2] }, { label: "B", values: [2, 3] }] }),
    taskDescription: "", subject: "통합과학2", referenceWeb: [{ ...post(), org: "서울대학교", accessed: "2026.09.18" }],
  });
  const refs = (built.parsed?.sections || []).find((one) => /참고 자료/.test(one.title))?.body || "";
  check(refs.includes("(접속일: 2026.09.18)"), "U4 최종 보고서의 참고 자료 절에 실제로 붙는다 — 끝에서부터 본다", refs);
}

// U5: 인덱스 — 공개 파일에는 제목·학부 교수팀·날짜·주소·꼬리표만.
{
  const all = Object.values(index.concepts).flat();
  check(Object.keys(index.concepts).length >= 60 && all.length >= 300, "U5 개념 60개 넘게, 글 300건 넘게",
    `${Object.keys(index.concepts).length} / ${all.length}`);
  check(all.every((one) => one.url.startsWith("https://www.snu.ac.kr/research/highlights?md=v&bbsidx=") && /^20\d\d-\d\d-\d\d$/.test(one.date)),
    "U5 모든 글에 서울대 주소와 날짜");
  check(all.every((one) => one.date >= "2019"), "U5 2019년 이후 글만 — '요즘 대학 연구'");
  check(all.every((one) => !("summary" in one) && !("body" in one)), "U5 요약·본문은 싣지 않는다 — 대학이 쓴 글이다");
  check(all.every((one) => one.primary || one.level !== "어려움"), "U5 둘째·셋째로 이어진 글 가운데 어려운 것은 뺐다 — 넓게 잡힌 것이 섞여 있다");
}

// U6: 워커 — 참고 자료는 엄격, 다음 걸음은 느슨. 둘 다 주소를 연다. AI에게는 안 간다.
{
  check(worker.includes("snuResearchIndex: 'engine-index/snu_research_index.v1.json'"), "U6 워커가 서울대 인덱스를 싣는다");
  check(/pickUnivWeb\(list, taskText\(input\), \{ limit: 3, skip: name, strict: true \}\)/.test(worker), "U6 참고 자료는 strict");
  check(/aliveOnly\(ranked, \{ limit: 1 \}\)/.test(worker) && /aliveOnly\(univWebPool/.test(worker), "U6 참고 자료와 다음 걸음 둘 다 주소를 열어 본다");
  check(/accessed/.test(worker) && worker.includes("accessDate()"), "U6 접속일을 붙인다");
  const at = worker.indexOf("function buildPrompt(");
  const body = worker.slice(at, worker.indexOf("\nfunction ", at + 50));
  check(!/referenceWeb|snuResearch|univWeb/.test(body), "U6 프롬프트에는 안 들어간다");
}

console.log(`\n${passed} checks passed`);
