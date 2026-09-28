// **단원에 붙은 자료가 한 쪽으로 쏠렸는지 본다.** ₩0.
//
// 감사(audit_engine_full)의 「살펴보기:연구_낱말안겹침」은 **글자 안에 든 겹침**만 잡는다
// (「친환경적」의 「환경」). 그래서 낱말이 온전히 겹치면 그냥 지나간다. 실전에서 이렇게 새어 나갔다:
//
//   물리 · 힘과 운동 ← 웨어러블 로봇 / 개미 입자 군집 / 소프트 로봇 / 소프트젤 액추에이터 /
//                    문어다리 변환 / 엑소 슈트 / 제비 둥지 / 지문 / 인공 근육 구동기 / 점핑 로봇
//
// 열 건이 전부 로봇·생체모방이다. 구슬 충돌·진자·낙하 실험에 이것이 붙는다. 그런데 「강력한 **힘**을
// 낸다」처럼 단원 낱말이 온전히 들어 있어 감사는 한 건도 잡지 않았다(2026-09-28 확인).
//
// 그래서 다른 각도로 본다. **단원 이름에 없는 낱말이 목록의 여러 건에 되풀이되면**, 그 단원의 자료는
// 한 분야로 쏠린 것이다. 쏠림 자체가 흠은 아니다 — 「광합성과 세포 호흡」에 엽록소 형광 연구가 여럿
// 붙는 것은 맞다. 그래서 **흠이라고 하지 않고 사람이 볼 목록으로 내놓는다.** 판단은 사람이 한다.
//
//   node tools/audit_material_drift_v1.mjs            — 쏠린 단원을 쏠린 정도 순으로
//   node tools/audit_material_drift_v1.mjs --all       — 자료가 붙은 단원 전부
//   node tools/audit_material_drift_v1.mjs --min 3     — 되풀이 문턱을 바꿔서
import { readFileSync } from 'node:fs';

const here = (name) => new URL(name, import.meta.url);
const arg = (name, fallback) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
const MIN = Number(arg('--min', '3'));      // 몇 건에 되풀이되면 쏠림으로 볼까
const ALL = process.argv.includes('--all');
const SEED = here('../public/keyword-engine/seed/engine-index/');

// 아무 연구 제목에나 나오는 말. 쏠림의 증거가 못 된다.
const 흔한말 = new Set(['개발', '연구', '기술', '규명', '분석', '제안', '최초', '세계', '방법', '평가', '설계',
  '활용', '이용', '기반', '향상', '성능', '특성', '구현', '적용', '가능', '통한', '위한', '새로운', '고효율',
  '차세대', '초고속', '대규모', '시스템', '모델', '플랫폼', '메커니즘', '가지', '사용', '변화', '효과', '결과',
  '국내', '국제', '한국', '서울대', '교수', '연구팀', '공동', '학부', '대학원', '이상', '이하', '동안']);

const 낱말 = (text) => String(text || '')
  .split(/[^가-힣A-Za-z0-9]+/)
  .filter((one) => /[가-힣]/.test(one) && one.length >= 2 && !흔한말.has(one));

function 쏠림(unit, titles) {
  const 단원말 = new Set(낱말(unit.replace(/^[^:]*::/, '')));
  const 셈 = new Map();
  for (const title of titles) {
    // 한 제목 안에서 같은 말이 여러 번 나와도 한 번으로 센다.
    for (const word of new Set(낱말(title))) {
      if (단원말.has(word)) continue;                 // 단원 이름에 있는 말은 쏠림이 아니다
      if ([...단원말].some((one) => one.includes(word) || word.includes(one))) continue;
      셈.set(word, (셈.get(word) || 0) + 1);
    }
  }
  const 되풀이 = [...셈.entries()].filter(([, n]) => n >= Math.min(MIN, titles.length)).sort((a, b) => b[1] - a[1]);
  // 단원 낱말이 제목에 한 번도 안 나오는 건수 — 이것이 크면 자료가 단원에서 멀다.
  const 단원말없음 = titles.filter((t) => { const w = new Set(낱말(t)); return ![...단원말].some((one) => w.has(one) || [...w].some((x) => x.includes(one))); }).length;
  return { 되풀이, 단원말없음 };
}

const 묶음 = [
  ['서울대 연구', JSON.parse(readFileSync(new URL('snu_research_index.v1.json', SEED), 'utf8')).concepts],
  ['대학 과제 연구', JSON.parse(readFileSync(new URL('univ_research_index.v1.json', SEED), 'utf8')).concepts],
];

for (const [이름, index] of 묶음) {
  const 줄 = [];
  for (const [unit, list] of Object.entries(index)) {
    const titles = (list || []).map((one) => String(one?.title || '')).filter(Boolean);
    if (titles.length < 2) continue;
    const { 되풀이, 단원말없음 } = 쏠림(unit, titles);
    const 점수 = (되풀이[0]?.[1] || 0) * 2 + 단원말없음;
    if (!ALL && !되풀이.length && 단원말없음 < titles.length) continue;
    줄.push({ unit, titles, 되풀이, 단원말없음, 점수 });
  }
  줄.sort((a, b) => b.점수 - a.점수);
  console.log(`\n══════ ${이름} — 사람이 볼 단원 ${줄.length}개 (자료가 둘 이상인 단원 가운데) ══════`);
  for (const one of 줄) {
    const 쏠린말 = one.되풀이.slice(0, 3).map(([w, n]) => `${w}×${n}`).join(' · ');
    console.log(`\n[${one.unit}] ${one.titles.length}건 · 단원 낱말이 없는 제목 ${one.단원말없음}건${쏠린말 ? ` · 되풀이: ${쏠린말}` : ''}`);
    for (const t of one.titles) console.log(`    ${t.slice(0, 84)}`);
  }
}
