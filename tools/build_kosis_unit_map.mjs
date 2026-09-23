// **단원 ↔ 통계표** 잇기. ₩0.
//
// 어느 표를 어느 단원에 쓸지는 **사람이 정한다.** 낱말로 이으면 「상용로그」에 물가지수가 붙는
// 식으로 엉뚱해진다 — 공공데이터 사전을 만들 때 이미 겪었다(「동적 평형 → 지하수 수질측정망」).
//
// 여기 적은 짝은 하나하나 뜻을 보고 정한 것이다:
//   · 모집단과 표본        ← 시·도별 인구수. 전국(모집단)과 시·도(부분)를 함께 본다.
//   · 상용로그             ← 소비자물가지수. 지수는 기준 100의 비율이고 로그로 견준다.
//   · 정적분의 활용        ← 물가 등락률. 해마다 변화율을 쌓으면 누적이 된다.
//   · 함수와 그래프        ← 미세먼지 월별. 달을 x, 농도를 y로 두면 바로 그래프다.
//   · 과학의 측정          ← 미세먼지. 측정망이 어떻게 재는지가 단원의 내용이다.
//
//   node tools/build_kosis_unit_map.mjs [--write]
import { readFileSync, writeFileSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const SEED = new URL("../public/keyword-engine/seed/engine-index/kosis_tables.v1.json", import.meta.url);
const OUT = new URL("../public/keyword-engine/seed/engine-index/kosis_unit_map.v1.json", import.meta.url);

// 단원 → 쓸 표(들). 앞에 적은 것이 먼저 쓰인다.
const MAP = {
  "모집단과 표본": ["population"],
  "확률의 뜻과 기본 성질": ["population"],
  "상용로그": ["cpi"],
  "지수함수와 로그함수의 활용": ["cpi", "cpiRate"],
  "정적분의 활용": ["cpiRate"],
  "함수와 그래프": ["pm25"],
  "데이터와 사회 변화": ["population", "cpiRate"],
  "데이터 수집과 전처리": ["pm25", "pm10"],
  "탐색적 데이터 분석과 시각화": ["pm25", "population"],
  "회귀와 예측 모델": ["cpi", "population"],
  "데이터와 기계학습": ["pm25", "cpi"],
  "과학의 측정과 우리 사회": ["pm25", "pm10"],
  "데이터 수집과 분석": ["pm25", "population"],
  "과학 기술 사회에서 빅데이터 활용": ["population", "pm25"],
  "자료와 통계로 읽는 과학": ["population", "cpi"],
};

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const known = new Set((seed.tables || []).map((one) => one.id));
const byConcept = {};
let linked = 0;
const missing = [];
for (const [concept, ids] of Object.entries(MAP)) {
  const kept = ids.filter((id) => known.has(id));
  for (const id of ids) if (!known.has(id)) missing.push(`${concept} → ${id}`);
  if (!kept.length) continue;
  byConcept[concept] = kept;
  linked += 1;
  const names = kept.map((id) => (seed.tables.find((one) => one.id === id) || {}).name || id);
  console.log(`  ${concept.padEnd(22)} ← ${names.join(" / ")}`);
}
console.log(`\n이은 단원 ${linked}개`);
if (missing.length) console.log(`  씨앗에 없는 표: ${missing.join(", ")}`);
if (WRITE) {
  writeFileSync(OUT, `${JSON.stringify({ version: "kosis-unit-map-v1", note: "어느 표를 어느 단원에 쓸지는 사람이 정한다. 낱말로 이으면 엉뚱해진다.", byConcept }, null, 1)}\n`, "utf8");
  console.log("이음 파일에 썼습니다.");
} else console.log("(보여 주기만 했습니다. --write 를 붙이세요.)");
