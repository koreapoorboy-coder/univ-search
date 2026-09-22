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
const DEBATE = ["쟁점 정리", "찬반 근거 비교", "자기 주장", "반론 검토", "재반박"];
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
  // 재는 과제는 실제로는 두 단계로 간다(설계서 → 최종). 여기서 보는 것은 **실험 절이 살아
  // 남는가** 하나다 — 재는 과제에서 가설이나 실험 조건을 빼면 보고서가 성립하지 않는다.
  for (const one of SCIENCE) check(out.includes(one), `S2 재는 과제의 「${one}」 절은 남는다`, out.join(" · "));
}

// S3: 실험 절이 없는 뼈대는 잴 것이 없어도 그대로 쓴다 — 무턱대고 우리 틀로 바꾸지 않는다.
{
  const base = { taskDescription: "공공데이터에서 통계를 찾아 표로 정리하고 해석한다.", subject: "통합사회1", subjectGroup: "사회", collectionKind: "dataset" };
  const out = sectionsFor(base, DATA);
  for (const one of DATA) check(out.includes(one), `S3 자료 과제의 「${one}」 절은 남는다`, out.join(" · "));
}

// S4: 사이트가 아무것도 안 보내면 예전처럼 우리 틀을 쓴다.
{
  const base = { taskDescription: "진로 관련 도서를 한 권 골라 읽고 서평을 작성하시오.", subject: "공통국어1", subjectGroup: "국어", collectionKind: "none" };
  const out = sectionsFor(base, []);
  check(out.includes("텍스트 이해"), "S4 사이트가 안 보내도 서평 틀이 나온다", out.join(" · "));
}

// S5: 실험 절이 아니어도, **과제와 안 맞는 뼈대**는 우리 틀에 자리를 내준다.
// 운영 검사 2026-09-22(2회차): 화학 서평이 「쟁점 정리 → 찬반 근거 비교 → 반론 검토 → 재반박」으로,
// 이차곡선 설명 보고서가 「찬반」으로 나왔다. 찬반이 없는 과제에 찬반 절을 주면 학생은 없는
// 반대 의견을 지어내야 한다.
{
  const base = { taskDescription: "화학 분야 도서를 한 권 골라 읽고 서평을 작성하시오.", subject: "화학", subjectGroup: "과학", collectionKind: "none" };
  const out = sectionsFor(base, DEBATE);
  check(out.includes("텍스트 이해"), "S5 서평에는 서평 틀을 쓴다", out.join(" · "));
  check(!out.some((one) => /찬반|재반박/.test(one)), "S5 찬반이 없는 과제에 찬반 절을 주지 않는다", out.join(" · "));

  const policy = { taskDescription: "불평등 문제의 원인을 분석하고 해결 방안을 정책 제안서로 작성하시오.", subject: "통합사회2", subjectGroup: "사회", collectionKind: "none" };
  const made = sectionsFor(policy, DEBATE);
  check(made.some((one) => /정책|대안/.test(one)), "S5 정책 제안 과제에는 정책 틀이 온다", made.join(" · "));
}

// S6: 학생이 「다르게 잡을래요」로 손수 고쳤으면 그 말이 먼저다.
{
  const base = { taskDescription: "화학 분야 도서를 한 권 골라 읽고 서평을 작성하시오.", subject: "화학", subjectGroup: "과학", collectionKind: "none", methodPicked: true };
  const out = sectionsFor(base, DEBATE);
  check(out.join("|") === DEBATE.join("|"), "S6 학생이 고쳤으면 그 뼈대를 그대로 쓴다", out.join(" · "));
}

console.log(`PASS report sections: ${passed}/${passed}`);
