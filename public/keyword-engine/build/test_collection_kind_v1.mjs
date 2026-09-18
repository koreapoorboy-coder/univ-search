// What the student will actually go and collect (admission_worker_skeleton/report_stages_v1.mjs).
// Measured against 3,440 real 수행평가 과제 whose kind is not in doubt: 48.2% → 86.7% (tools/eval_collection_kind.mjs).
// These cases are the ones the corpus showed us getting wrong, kept so they cannot come back.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COLLECTION, resolveCollectionKind } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const kindOf = (taskDescription, extra = {}) => resolveCollectionKind({ taskDescription, ...extra });
const is = (text, expected, label, extra = {}) => check(kindOf(text, extra) === expected, label, `${expected} 기대, ${kindOf(text, extra)} 나옴`);

// The five plain cases.
is("염화나트륨 농도에 따른 발아율을 실험으로 확인하시오.", COLLECTION.MEASUREMENT, "an experiment collects measurements");
is("우리 반 학생들에게 설문을 받아 응답을 정리하시오.", COLLECTION.SURVEY, "a survey collects answer counts");
is("공개된 통계 자료의 추이를 정리하고 해석하시오.", COLLECTION.DATASET, "a statistics task collects published figures");
is("관심 있는 사회 문제의 원인과 해결 방안을 조사해 정리하시오.", COLLECTION.READING, "a research task collects sources");
is("자신의 주장을 담은 논술문을 쓰시오.", COLLECTION.NONE, "an essay collects nothing");

// The subject name used to decide this: every task in 과학탐구실험 or 생명과학실험 came out as a measurement.
is("국내 공식 통계를 활용하여 5년 이상 연속된 자료를 수집하고 그래프로 변환해 경향을 분석하시오.", COLLECTION.DATASET,
  "a statistics task in 과학탐구실험 is not turned into an experiment by its subject name", { subject: "과학탐구실험", subjectGroup: "과학" });
is("작품을 읽고 서평을 작성하시오.", COLLECTION.NONE, "a 서평 in 생명과학실험 is still writing", { subject: "생명과학실험", subjectGroup: "과학" });

// An experiment that ends in an essay is still an experiment; an observation that ends in one is not.
is("화학 반응을 실험으로 관찰한 후 이를 적용하여 논술형 문제를 해결한다.", COLLECTION.MEASUREMENT,
  "an experiment with an essay attached is still an experiment");
is("스펙트럼을 관찰한 후 이를 적용하여 논술형 문제를 해결한다.", COLLECTION.NONE,
  "an observation graded as an essay answer collects nothing");

// Performance subjects: the corpus filed 배드민턴 숏서비스 and 드럼 연주 under reading before.
is("배드민턴 라켓을 이용하여 정해진 구역에 숏서비스 실시하기", COLLECTION.NONE, "a 실기 task collects nothing", { subject: "스포츠 문화" });
is("드럼 연주법을 익혀 악곡의 특징을 살려 연주한다.", COLLECTION.NONE, "playing an instrument collects nothing");
is("자신의 작품에 대해 비평의 준거에 따라 비평문을 쓴다.", COLLECTION.NONE, "a 비평문 collects nothing");
is("주제에 적합한 음악회 프로그램을 기획한다.", COLLECTION.NONE, "a music subject with no collecting words still collects nothing", { subjectGroup: "예술·체육" });
is("주어진 상황에 알맞은 의사소통 표현을 일본어로 말한다.", COLLECTION.NONE, "speaking a language collects nothing");

// Running a program and reading its results is the same work as measuring.
is("주어진 문제를 해결하기 위한 알고리즘을 작성하고 오류를 수정한다.", COLLECTION.MEASUREMENT, "a program's results are values to record");
is("공공 데이터 포털에서 주제를 골라 데이터를 분석해 시각화하시오.", COLLECTION.DATASET, "public data is a dataset even when code is involved");

// When the wording says nothing at all.
// 2026-09-18: 과학 과목이라도 과제 글에 단서가 없으면 실험으로 단정하지 않는다 — 「독서 및 글쓰기」, 「자유주제발표」까지
// 숫자 표를 채우는 과제가 됐다(전수 검사 384건). 가장 적게 요구하는 읽기 보고서로 둔다.
is("탐구 보고서를 작성하시오.", COLLECTION.READING, "a science task with no other clue is no longer assumed to be an experiment", { subjectGroup: "과학" });
is("독서 및 글쓰기 / 책의 내용을 적절하게 요약했는가?", COLLECTION.READING, "독서 및 글쓰기 in 지구과학 is not a measurement", { subjectGroup: "과학" });
is("뉴턴 운동 법칙 탐구하기 / 물체의 시간에 따른 속도 변화를 통해 운동을 분석", COLLECTION.MEASUREMENT, "a quantity changing with another is measured even without the word 실험", { subjectGroup: "과학" });
is("힘과 가속도의 관계 탐구", COLLECTION.MEASUREMENT, "A와 B의 관계 in science is measured", { subjectGroup: "과학" });
is("저항의 연결 / 저항의 직렬연결과 병렬연결에서 전류, 전위차, 전력을 비교할 수 있다.", COLLECTION.MEASUREMENT, "a series/parallel circuit task is measured", { subjectGroup: "과학" });
is("스펙트럼 관찰 / 스펙트럼 관찰 후 보고서를 작성하여 제출", COLLECTION.MEASUREMENT, "관찰 후 보고서 is an observation record", { subjectGroup: "과학" });
is("우리 학교 바이오 블리츠", COLLECTION.MEASUREMENT, "a school bioblitz counts species", { subjectGroup: "과학" });
is("기온 변화에 따른 생활 양식의 차이", COLLECTION.READING, "the same wording outside science is not a measurement", { subjectGroup: "사회" });
is("효소 탐구 보고서", COLLECTION.READING, "the site's guessed report mode no longer makes it an experiment", { subjectGroup: "과학", reportMode: "실험분석형" });
is("보고서를 작성하시오.", COLLECTION.READING, "anything else with no clue asks the least of the student", { subjectGroup: "국어" });

// The evaluator is part of the contract: the number has to stay checkable.
const evaluator = await readFile(new URL("../../../tools/eval_collection_kind.mjs", import.meta.url), "utf8");
check(evaluator.includes("function groundTruth") && evaluator.includes("raw_method_labels") && evaluator.includes("output_axis"),
  "the score is measured against the 평가방법 and 산출물 on real 평가계획, not against our own rules");
check(evaluator.includes("자료해석형 tag cannot be used"), "the evaluator records why the corpus's own 자료해석형 tag is not the ground truth");

console.log(`PASS collection kind: ${passed}/${passed}`);
