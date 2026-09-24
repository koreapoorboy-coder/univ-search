// 씨앗 표에서 학생 표를 뽑을 때 **엉뚱한 값이 섞이지 않는지** 본다. ₩0.
//
// 2026-09-24 에 찾은 흠 네 개를 잡아 둔다:
//   ① 한 표에 항목이 서른 개 넘게 섞여 있는데(종관기상) 항목을 고르지 않고 첫 줄을 집었다.
//      그래서 「최고기온일자 = 2021-08-05」 같은 **날짜**가 숫자 자리에 들어갈 수 있었다.
//   ② 기간을 앞에서 잡고 마지막만 최신으로 바꾸어 2021·2022·2023·**2025** 처럼 한 해가 빠졌다.
//   ③ 「시도평균」·「총발전량」은 합계인데 조건 줄로 들어갔다.
//   ④ KOSIS 값이 3715049.16314 로 와서 학생 표에 소수 열한 자리가 찍혔다.
import { readFileSync } from 'node:fs';
import { findTable, buildFilledTable } from '../../../admission_worker_skeleton/kosis_fill_v1.mjs';

const seed = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/kosis_tables.v1.json', 'utf8'));
const unitMap = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/kosis_unit_map.v1.json', 'utf8'));
const concepts = Object.keys(unitMap.byConcept || {});
let fail = 0;
const bad = (why) => { console.log(`  ✗ ${why}`); fail += 1; };

if (concepts.length < 44) bad(`이은 단원이 ${concepts.length}개뿐이다`);

for (const concept of concepts) {
  const table = findTable(seed, unitMap, concept);
  if (!table) { bad(`${concept} — 표를 못 찾는다`); continue; }
  const filled = buildFilledTable(table, { areas: 3, periods: 4 });
  if (!filled) { bad(`${concept} — 표를 못 만든다`); continue; }

  for (const row of filled.conditions) {
    // ① 숫자가 아닌 값(날짜 등)이 값 자리에 오면 안 된다
    if (!/^-?[\d,]+(\.\d+)?$/.test(row.values[0])) bad(`${concept} — 숫자가 아닌 값 ${row.values[0]}`);
    // ④ 소수 네 자리를 넘기면 안 된다
    // 0.0022 ppm 처럼 작은 값은 소수 네 자리가 맞다. 다섯 자리부터 너무 길다.
    if (/\.\d{5,}/.test(row.values[0])) bad(`${concept} — 소수가 너무 길다 ${row.values[0]}`);
    // ③ 합계 줄이 조건으로 오면 안 된다
    const area = row.label.split(' · ')[0];
    if (/^(전국|총계|합계|계|전체|소계)$|평균$|^총|①/.test(area)) bad(`${concept} — 합계 줄 ${area}`);
  }

  // ② 해가 이어져야 한다 — 고른 기간의 간격이 모두 같아야 한다
  const years = [...new Set(filled.conditions.map((one) => one.label.split(' · ')[1]))];
  const nums = years.map((one) => Number(String(one).replace(/[^0-9]/g, '')));
  const gaps = [...new Set(nums.slice(1).map((one, at) => one - nums[at]))];
  if (gaps.length > 1) bad(`${concept} — 기간 간격이 들쭉날쭉하다 ${years.join(',')}`);

  // 자료원은 보고서 참고 자료에 그대로 들어간다. 객체가 문자열 자리에 오면 [object Object] 가 찍힌다.
  if (typeof filled.note !== 'string' || !filled.note.includes('조회')) bad(`${concept} — 자료원 글이 없다`);
  if (!filled.unit) bad(`${concept} — 단위가 없다`);
}

// 단원이 항목을 정해 준 것은 그 항목이 나와야 한다
const PINNED = [
  ['산과 염기', '수소이온농도', 'pH'],
  ['생태계평형', '용존산소DO', 'mg/L'],
  ['날씨의 변화', '평균기온', '℃'],
  ['태양 에너지의 생성과 전환', '합계수평면일사', ''],
];
for (const [concept, item, unit] of PINNED) {
  const filled = buildFilledTable(findTable(seed, unitMap, concept), { areas: 3, periods: 4 });
  if (!filled) { bad(`${concept} — 표가 없다`); continue; }
  if (!filled.measurementName.includes(item)) bad(`${concept} — ${item} 이 아니라 ${filled.measurementName}`);
  if (unit && filled.unit !== unit) bad(`${concept} — 단위가 ${unit} 이 아니라 ${filled.unit}`);
}

// 미세먼지는 ㎍/㎥ 다. KOSIS 는 부모 표 단위를 그대로 주어 ppm 으로 온다.
for (const id of ['pm25', 'pm10']) {
  const table = (seed.tables || []).find((one) => one.id === id);
  if (table && table.unit !== '㎍/㎥') bad(`${id} 단위가 ${table.unit} 다`);
}

if (fail) { console.log(`
실패 ${fail}건`); process.exit(1); }
console.log(`통과 — 단원 ${concepts.length}개 모두 값이 숫자이고 합계 줄이 없고 기간이 이어진다`);
