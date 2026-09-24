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
  // ── 수학 ─────────────────────────────────────────
  "모집단과 표본": ["population", "vital#조출생률"],
  "확률의 뜻과 기본 성질": ["lifeTable#사망확률(전체)", "fire"],
  "통계적 추정": ["eduCostDist", "birthRate#합계출산율"],
  "상용로그": ["cpi"],
  "지수함수와 로그함수의 활용": ["cpi", "population"],
  "정적분의 활용": ["cpiRate", "power"],
  "함수와 그래프": ["pm25", "weather"],
  "수열의 합": ["power", "migration#순이동"],


  // 2026-09-24 새 표로 열린 단원
  "함수의 극한과 연속": ["lifeTable#기대여명(전체)", "cpi"],

  // ── 정보 ─────────────────────────────────────────
  "데이터와 사회 변화": ["internet", "population"],
  "데이터 수집과 전처리": ["pm25", "weather"],
  "탐색적 데이터 분석과 시각화": ["powerHour", "pm25"],
  "회귀와 예측 모델": ["cpi", "birthRate#합계출산율"],
  "군집과 연관 분석": ["migration#순이동", "population"],
  "데이터 과학 프로젝트": ["fire", "infection"],
  "데이터와 기계학습": ["powerHour", "pm25"],
  "인공지능 융합 프로젝트": ["fire", "internet"],
  "자료와 정보의 분석": ["internet", "eduCost"],
  "지식·정보 사회와 정보 문화": ["internet"],

  // ── 과학 ─────────────────────────────────────────
  "과학의 측정과 우리 사회": ["pm25", "so2"],
  "데이터 수집과 분석": ["pm25", "weather#평균기온"],
  "자료와 통계로 읽는 과학": ["vital#조출생률", "population"],
  "과학 기술 사회에서 빅데이터 활용": ["pm25", "internet"],
  "지구 환경 변화": ["weather#평균기온", "pm25"],
  "지구의 기후 변화": ["weather#평균기온"],
  "날씨의 변화": ["weather#평균기온"],
  "대기·해양 순환과 기후": ["weather#평균기온"],
  "생물과 환경": ["riverWater#용존산소DO", "pm25"],
  "생태계평형": ["lakeWater#용존산소DO", "riverWater#용존산소DO"],
  "지구 환경 변화와 인간 생활": ["so2", "pm25"],
  "발전과 에너지원": ["power", "renewable"],
  "에너지 효율과 신재생 에너지": ["renewable", "powerHour"],
  "태양 에너지의 생성과 전환": ["weather#합계수평면일사", "renewable"],
  "산과 염기": ["lakeWater#수소이온농도", "riverWater#수소이온농도"],
  "산 염기와 중화 반응": ["riverWater#수소이온농도", "so2"],
  "면역과 백신": ["fluShot", "infection"],
  "물질대사와 건강": ["fluShot"],
  "첨단 센서와 디지털 정보 탐구": ["pm25", "weather#평균기온"],
  "생활 자료를 활용한 과학적 의사결정 탐구": ["fire", "co"],
  "충격을 줄이는 방법과 안전장치 탐구": ["fire"],
  "과학 기술과 미래 사회": ["internet", "renewable"],
  "에너지와 환경": ["powerHour", "power"],
  "연소와 우리 생활": ["co", "so2"],
  "기체의 성질": ["so2", "co"],
  "물의 순환과 수질": ["riverWater#생물화학적산소요구량BOD", "lakeWater#용존산소DO"],
};

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const known = new Set((seed.tables || []).map((one) => one.id));
const byConcept = {};
let linked = 0;
const missing = [];
// 「표id#항목」이면 항목까지 사람이 정한 것이다 —
// 항목을 자동으로 고르면 「산과 염기」에 수온이 붙었다. pH 여야 한다.
const tableOf = (entry) => String(entry).split("#")[0];
for (const [concept, ids] of Object.entries(MAP)) {
  const kept = ids.filter((id) => known.has(tableOf(id)));
  for (const id of ids) if (!known.has(tableOf(id))) missing.push(`${concept} → ${id}`);
  if (!kept.length) continue;
  byConcept[concept] = kept;
  linked += 1;
  const names = kept.map((id) => (seed.tables.find((one) => one.id === tableOf(id)) || {}).name || id);
  console.log(`  ${concept.padEnd(22)} ← ${names.join(" / ")}`);
}
console.log(`\n이은 단원 ${linked}개`);
if (missing.length) console.log(`  씨앗에 없는 표: ${missing.join(", ")}`);
if (WRITE) {
  writeFileSync(OUT, `${JSON.stringify({ version: "kosis-unit-map-v1", note: "어느 표를 어느 단원에 쓸지는 사람이 정한다. 낱말로 이으면 엉뚱해진다.", byConcept }, null, 1)}\n`, "utf8");
  console.log("이음 파일에 썼습니다.");
} else console.log("(보여 주기만 했습니다. --write 를 붙이세요.)");
