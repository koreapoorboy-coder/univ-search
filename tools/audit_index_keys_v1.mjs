// **자료를 붙여 둔 단원 이름이 실제로 있는 이름인가.** ₩0.
//
// 단원 이름을 한 글자라도 다르게 적으면 그 줄은 **영원히 읽히지 않는다.** 그런데 파일은 멀쩡해 보이고,
// 감사에도 안 걸린다(그 단원으로 오는 과제가 없으니 아무 일도 안 일어난다). 그래서 사람이 「이 단원에는
// 자료가 있다」고 믿게 된다.
//
// 2026-09-28 처음 재 보니 아홉 줄이 그랬다:
//   서울대 연구  확률과 통계::중복순열과 중복조합 (실제 이름은 「순열과 조합」)          1건
//   통계표 짝    함수의 극한과 연속 / 연소와 우리 생활 / 기체의 성질 / 물의 순환과 수질  8건
// 2015 교육과정 단원 이름으로 적은 것으로 보인다. 지금 과정에는 없는 이름이다.
//
//   node tools/audit_index_keys_v1.mjs        — 읽히지 않는 항목만
//   node tools/audit_index_keys_v1.mjs --all  — 파일마다 몇 개인지도
import { readFileSync } from 'node:fs';

const here = (name) => new URL(name, import.meta.url);
const SEED = here('../public/keyword-engine/seed/engine-index/');
const ALL = process.argv.includes('--all');
const read = (name) => JSON.parse(readFileSync(new URL(name, SEED), 'utf8'));

const axes = read('longitudinal_axis_index.v1.json').axes || {};
const 과목단원 = new Set(Object.values(axes).map((one) => `${one.subject || ''}::${one.concept || ''}`));
const 단원만 = new Set(Object.values(axes).map((one) => one.concept).filter(Boolean));
const 바른 = (value) => String(value || '').replace(/[\s·]/g, '');
const 띄어쓰기만 = (name, 전체) => [...전체].filter((one) => 바른(one) === 바른(name));

// [보여 줄 이름, 파일, 그 안의 어디, 키에 과목이 붙어 있나]
const 볼것 = [
  ['서울대 연구', 'snu_research_index.v1.json', (j) => j.concepts, true],
  ['대학 과제 연구', 'univ_research_index.v1.json', (j) => j.concepts, true],
  ['공공데이터 낱말', 'public_data_terms.v1.json', (j) => j.byConcept, false],
  ['통계표 짝', 'kosis_unit_map.v1.json', (j) => j.byConcept, false],
];

let 합 = 0;
for (const [이름, file, pick, 과목포함] of 볼것) {
  let index;
  try { index = pick(read(file)) || {}; } catch { console.log(`${이름}: 파일을 못 읽었습니다 (${file})`); continue; }
  const keys = Object.keys(index).filter((k) => (index[k] || []).length);
  const 목록 = 과목포함 ? 과목단원 : 단원만;
  const 죽은 = keys.filter((k) => !목록.has(k));
  합 += 죽은.reduce((sum, k) => sum + index[k].length, 0);
  if (ALL || 죽은.length) {
    console.log(`\n[${이름}] 단원 ${keys.length}개 · 읽히지 않는 이름 ${죽은.length}개`);
  }
  for (const k of 죽은) {
    const 비슷 = 띄어쓰기만(k, 목록);
    console.log(`  ✗ ${k} (자료 ${index[k].length}건)${비슷.length ? `  → 띄어쓰기만 다름: 「${비슷.join('」 「')}」` : ''}`);
  }
}
console.log(`\n읽히지 않는 자료 모두 ${합}건${합 ? ' — 이름을 고치거나 지워야 합니다.' : ' — 깨끗합니다.'}`);
process.exitCode = 합 ? 1 : 0;
