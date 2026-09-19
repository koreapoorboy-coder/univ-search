// 교과 단원 지도 — 빠진 단원과 단원 고르기(2026-09-19).
//
// 운영 테스트에서 「식초 아세트산 중화 적정」 과제의 교과서 줄이 「화학 반응과 열의 출입」으로 나왔다. 화학 지도에
// 「산 염기와 중화 반응」, 「산화 환원 반응」이 따로 없었고, 대수 지도는 칸 이름(axes)이 달라 통째로 빠져 있었다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inferConcept } from "../../../admission_worker_skeleton/book_match_v1.mjs";

const index = JSON.parse(await readFile(new URL("../seed/engine-index/longitudinal_axis_index.v1.json", import.meta.url), "utf8"));
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const units = (subject) => new Set(Object.values(index.axes).filter((axis) => axis.subject === subject).map((axis) => axis.concept));

check(units("화학").has("산 염기와 중화 반응") && units("화학").has("산화 환원 반응"), "M1 화학에 중화·산화환원 단원이 따로 있다");
check(units("대수").size >= 11 && units("대수").has("삼각함수") && units("대수").has("로그의 뜻과 성질"), "M1 대수 단원이 들어온다(원본의 axes 칸도 읽는다)", String(units("대수").size));
check(units("공통수학2").has("집합과 명제") && units("공통수학2").has("함수와 그래프"), "M1 공통수학2에 집합과 명제, 함수와 그래프");

const cases = [
  ["화학", "중화 반응의 양적 관계 실험 / 식초에 들어 있는 아세트산의 함량을 수산화나트륨 표준 용액으로 적정하여 구하고 표시된 산도와 비교한다.", "산 염기와 중화 반응"],
  ["화학", "금속의 반응성 비교 실험 / 여러 금속을 금속 이온 용액에 넣어 산화 환원 반응이 일어나는지 관찰하고 산화수 변화로 설명한다.", "산화 환원 반응"],
  ["화학", "발열 반응과 흡열 반응의 열 출입 측정 / 손난로와 냉각팩의 온도 변화를 측정한다.", "화학 반응과 열의 출입"],
  ["공통수학2", "명제의 역과 대우를 이용한 증명 탐구 / 생활 속 명제를 찾아 필요조건과 충분조건을 분석한다.", "집합과 명제"],
  ["대수", "삼각함수를 이용한 주기 현상 모델링 / 기온이나 조석의 주기 변화를 삼각함수 그래프로 나타낸다.", "삼각함수"],
  ["생명과학", "방형구법을 활용한 식물 군집 조사 / 밀도·빈도·피도로 중요치를 구해 군집 구조와 종 다양성을 비교한다.", "생태계의 물질 순환과 상호 작용"],
  ["지구과학", "우리나라 주변 바다의 해수면 온도 자료로 지구 온난화와 기후 변화의 경향을 해석한다.", "지구의 기후 변화"],
];
for (const [subject, text, want] of cases) {
  check(inferConcept(subject, text, index) === want, `M2 ${subject}: ${want}`, inferConcept(subject, text, index));
}
// 조사가 붙어도(식초에·적정하여) 맞고, 과목 이름('화학')은 단원을 가르는 데 쓰지 않는다.
check(inferConcept("화학", "화학 수행평가", index) === "", "M2 과목 이름과 '수행평가'만으로는 단원을 정하지 않는다");

console.log(`\n${passed} checks passed`);
