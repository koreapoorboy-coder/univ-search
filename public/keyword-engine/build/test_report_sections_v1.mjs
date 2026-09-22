// 절 이름 하나가 보고서를 통째로 바꾼다.
//
// 운영 검사 2026-09-22(공통국어1 서평). 사이트가 「가설과 변인 설정」·「실험 조건 또는 자료 수집」이
// 든 뼈대를 보냈고, 그것이 우리 서평 틀(텍스트 이해 → 핵심 질문 → 근거 장면·문장 → …)을 밀어냈다.
// 모델은 빈 절을 채워야 하니 없는 실험을 지어냈다 — 책 한 권 읽고 쓰는 서평이 「인간 칼럼과 AI
// 칼럼을 모아 코딩해 비교하는 연구」가 되어 나왔다.
//
// 잴 것이 없는 과제에 실험 절을 주면, 모델이 할 수 있는 일은 지어내는 것뿐이다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STAGE, stageSections } from "../../../admission_worker_skeleton/report_stages_v1.mjs";
import { pickReportShape } from "../../../admission_worker_skeleton/report_shape_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const index = JSON.parse(await readFile(new URL("../seed/engine-index/report_shape_index.v1.json", import.meta.url), "utf8"));
// 사이트가 실제로 보내던 뼈대 두 가지.
const SCIENCE = ["탐구 질문", "교과 개념 정리", "가설과 변인 설정", "실험 조건 또는 자료 수집", "결과 정리", "자료 해석", "오차·한계 분석", "후속 탐구"];
const DATA = ["탐구 질문", "자료 출처와 분석 기준", "핵심 개념 정리", "자료 정리", "패턴 해석", "결론 도출", "한계와 보완"];

const sectionsFor = (base, site) => stageSections(STAGE.COMPLETE, {
  ...base, reportShape: pickReportShape(base, index), targetStructure: site,
});

// S1: 잴 것이 없는 과제(서평)에 과학 뼈대가 오면, 그것을 물리고 우리 틀을 쓴다.
{
  const base = { taskDescription: "진로 관련 도서를 한 권 골라 읽고 서평을 작성하시오.", subject: "공통국어1", subjectGroup: "국어", collectionKind: "none" };
  const out = sectionsFor(base, SCIENCE);
  check(!out.some((one) => /가설|변인|실험/.test(one)), "S1 잴 것이 없는데 실험 절을 주지 않는다", out.join(" · "));
  check(out.includes("텍스트 이해") && out.includes("근거 장면/문장"), "S1 서평에는 서평 틀을 쓴다", out.join(" · "));
}

// S2: 재는 과제는 그대로다 — 실험 절은 실험 보고서의 것이다.
{
  const base = { taskDescription: "역학 수레로 가속도를 측정하고 뉴턴 제2법칙을 검증하시오.", subject: "물리", subjectGroup: "과학", collectionKind: "measurement" };
  const out = sectionsFor(base, SCIENCE);
  check(out.join("|") === SCIENCE.join("|"), "S2 재는 과제에서는 사이트 뼈대를 그대로 쓴다", out.join(" · "));
}

// S3: 실험 절이 없는 뼈대는 잴 것이 없어도 그대로 쓴다 — 무턱대고 우리 틀로 바꾸지 않는다.
{
  const base = { taskDescription: "공공데이터에서 통계를 찾아 표로 정리하고 해석한다.", subject: "통합사회1", subjectGroup: "사회", collectionKind: "dataset" };
  const out = sectionsFor(base, DATA);
  check(out.join("|") === DATA.join("|"), "S3 실험 절이 없으면 사이트 뼈대를 건드리지 않는다", out.join(" · "));
}

// S4: 사이트가 아무것도 안 보내면 예전처럼 우리 틀을 쓴다.
{
  const base = { taskDescription: "진로 관련 도서를 한 권 골라 읽고 서평을 작성하시오.", subject: "공통국어1", subjectGroup: "국어", collectionKind: "none" };
  const out = sectionsFor(base, []);
  check(out.includes("텍스트 이해"), "S4 사이트가 안 보내도 서평 틀이 나온다", out.join(" · "));
}

console.log(`PASS report sections: ${passed}/${passed}`);
