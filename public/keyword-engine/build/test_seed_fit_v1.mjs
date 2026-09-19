// 참고 사례가 학생 과제를 끌고 가지 못하게 — seed_fit_v1.mjs.
//
// 운영 사이트 테스트(2026-09-18): 지구과학 해수면 온도 과제에 원전 냉각 사례가 골라져, 블로그 제목이 키워드로
// 들어가고 사례 내용이 프롬프트에 들어가 보고서가 원전 냉각 보고서가 됐다. 여기 있는 예는 그때 나온 것이다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cleanKeyword, isBlogTitle, seedFit, seedFitsTask, SEED_FIT_MIN } from "../../../admission_worker_skeleton/seed_fit_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const lf = (text) => String(text).split("\r\n").join("\n");
const worker = lf(await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8"));
const adapter = lf(await readFile(here("../assets/js/decision_flow_payload_adapter.js"), "utf8"));
const bridge = lf(await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8"));
const html = lf(await readFile(here("../index.html"), "utf8"));
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const BLOG = "[원자력/지구 과학] 기후변화가 초래하는 원전 냉각 위기 통합과학 물리 일반고 세특 보고서 추천";
const TASK = "[지구과학 수행평가] 기후 변화 탐구 보고서 작성하기 / 우리나라 주변 바다의 해수면 온도 자료를 찾아 연도별 변화를 그래프로 나타내고, 지구 온난화와 관련지어 기후 변화의 경향과 영향을 해석한다.";
const NUCLEAR = "기후변화로 인한 해수 온도 상승이 원전 냉각수·설계해수온도·열교환기 성능·수명연장 판단에 미치는 영향을 열역학과 지구과학 데이터로 분석하는 원자력·에너지·환경 융합 탐구";

// S1: 블로그 제목은 키워드가 아니다.
{
  check(isBlogTitle(BLOG) && cleanKeyword(BLOG) === "", "S1 운영 테스트에서 들어온 블로그 제목을 키워드로 받지 않는다");
  for (const one of ["[화학/진로] 차세대 배터리 전구체 합성 혁신 분석 자사고 특목고 세특 보고서 추천",
    "[자동차공학/기계공학] 자연흡기 vs 터보, 공기공급의 과학 엔진 일반고 탐구 보고서 추천"]) {
    check(cleanKeyword(one) === "", `S1 같은 모양의 다른 제목도 — ${one.slice(0, 24)}…`);
  }
  for (const one of ["사과 갈변", "효소 활성 온도", "지구 온난화 · 해수면 온도 · 기후 변화", "mRNA 백신"]) {
    check(cleanKeyword(one) === one, `S1 보통 키워드는 그대로 — ${one}`);
  }
}

// S2: 사례가 과제와 맞는지.
{
  const bad = seedFit(NUCLEAR, TASK);
  check(bad < SEED_FIT_MIN && !seedFitsTask(NUCLEAR, TASK), "S2 원전 냉각 사례는 해수면 온도 과제와 맞지 않는다", bad.toFixed(2));
  const good = "우리나라 주변 해수면 온도의 장기 변화를 기후 변화와 지구 온난화 자료로 해석하는 탐구";
  check(seedFitsTask(good, TASK), "S2 맞는 사례는 통과한다", seedFit(good, TASK).toFixed(2));
  check(!seedFitsTask("", TASK) && !seedFitsTask(good, ""), "S2 비어 있으면 맞지 않는 것으로 친다");
}

// S3: 워커 — 키워드 정리와 사례 확인이 실제로 걸려 있다.
{
  check(worker.includes("import { cleanKeyword, seedFitsTask } from './seed_fit_v1.mjs';"), "S3 워커가 모듈을 쓴다");
  check(/keyword: keywordOf\(payload\?\.keyword, payload\?\.selectedKeyword, selection\.selectedKeyword\) \|\| concept \|\| subject,/.test(worker),
    "S3 키워드는 정리해서 받고, 비면 개념 → 과목으로 물러선다(필수 입력이 비지 않게)");
  check(/selectedKeyword: keywordOf\(payload\?\.selectedKeyword, selection\.selectedKeyword, payload\?\.keyword\) \|\| concept,/.test(worker),
    "S3 selectedKeyword 도 같다");
  check(/const seed = !seedLabel \|\| seedFitsTask\(seedLabel, taskText\(input\)\) \? rawSeed : \{\};/.test(worker),
    "S3 사례 이름이 있으면, 과제와 맞을 때만 사례 내용(기초·심화 주제, 피할 것)을 프롬프트에 넣는다");
  // 예전 화면은 사례 이름을 안 보냈다(access_gateway 의 9월 11일 실제 요청). 그때 다 빼 버리면 좋은 사례까지 잃는다.
  check(worker.includes("사례 이름이 없으면(예전 화면이 보낸 요청) 따질 수가 없으므로 예전처럼 넣는다"),
    "S3 사례 이름이 없으면 예전처럼 넣는다 — 모르는 것을 '안 맞음'으로 치지 않는다");
}

// S4: 사이트 — 블로그 제목 대신 과제에서 뽑은 개념.
{
  const line = adapter.split("\n").find((one) => one.includes("const selectedKeyword ="));
  check(Boolean(line) && !/sourceTitle|selectionKeywordBasis|legacyGeneratedTitle/.test(line), "S4 사이트가 사례 제목을 키워드로 쓰지 않는다", line);
  check(/taskConcepts/.test(line) && adapter.includes("cross?.topic?.subjectConcepts"), "S4 대신 과제에서 뽑은 개념을 쓴다");
  check(!/keyword: cleanReportPhrase\(firstNonEmpty\([^)]*seed\.sourceTitle/.test(bridge), "S4 화면의 키워드 대비책에도 사례 제목이 없다");
  check(html.includes("decision_flow_payload_adapter.js?v=v3_social_humanities"), "S4 어댑터 캐시 표식을 올렸다 — 안 올리면 학생 브라우저가 옛 파일을 쓴다");
}

console.log(`\n${passed} checks passed`);
