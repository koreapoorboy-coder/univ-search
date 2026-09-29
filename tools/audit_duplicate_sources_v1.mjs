// **같은 단원 학생끼리 자료가 얼마나 겹치나.** ₩0.
//
// 이것이 이 제품에서 가장 큰 위험이다. 선생님이 두 학생 보고서를 나란히 놓으면 끝난다.
// 그런데 우리는 그동안 「책 붙는 비율 81%」 같은 숫자를 목표로 삼았다. 그건 붙이면 올라가는 숫자여서,
// 올리려 할수록 억지가 늘었다(사용자 지적 2026-09-30). **이 파일의 숫자를 목표로 쓴다.**
//
// 재는 법: 같은 단원 과제가 여러 건일 때 **으뜸 자료가 몇 %의 과제에 나오나**. 100% 면 그 단원
// 학생 전원이 같은 자료를 받는다는 뜻이다. 종류 수도 함께 센다 — 후보가 2종뿐이면 아무리 잘 섞어도
// 서른 명이 2종을 나눠 가질 뿐이다.
//
//   node tools/audit_duplicate_sources_v1.mjs <감사폴더> [<견줄폴더>]
import { readFileSync } from 'node:fs';

const [DIR, BEFORE] = process.argv.slice(2).filter((one) => !one.startsWith('-'));
if (!DIR) { console.log('감사 폴더를 주세요. 보기: node tools/audit_duplicate_sources_v1.mjs .audit_e1'); process.exit(1); }

const load = (dir) => {
  const rows = [];
  for (let part = 0; part < 6; part += 1) rows.push(...JSON.parse(readFileSync(`${dir}/rows_${part}.json`, 'utf8')).rows);
  return rows;
};
const 이름 = (value) => String(value).split(' · ')[0].split(' — ')[0].trim().slice(0, 70);

function 재기(dir) {
  const units = new Map();
  for (const row of load(dir)) {
    if (!row.subject || !row.concept) continue;
    const key = `${row.subject} · ${row.concept}`;
    if (!units.has(key)) units.set(key, { n: 0, 책: new Map(), 논문: new Map(), 통계: new Map() });
    const one = units.get(key);
    one.n += 1;
    for (const [field, bag] of [['books', one.책], ['papers', one.논문], ['datasets', one.통계]]) {
      for (const value of row[field] || []) {
        const name = 이름(value);
        bag.set(name, (bag.get(name) || 0) + 1);
      }
    }
  }
  return units;
}

const 으뜸비율 = (bag, n) => {
  const top = [...bag.values()].sort((a, b) => b - a)[0] || 0;
  return n ? top / n : 0;
};

function 요약(units, label) {
  // 과제가 여러 건인 단원만 본다 — 한 건뿐인 단원에는 겹칠 상대가 없다.
  const 볼것 = [...units].filter(([, one]) => one.n >= 5);
  console.log(`\n【${label}】 과제 5건 이상인 단원 ${볼것.length}개`);
  for (const [종류, 뽑기] of [['책', (o) => o.책], ['논문', (o) => o.논문], ['통계', (o) => o.통계]]) {
    const 있는것 = 볼것.filter(([, one]) => 뽑기(one).size > 0);
    if (!있는것.length) { console.log(`  ${종류.padEnd(4)} 나오는 단원이 없다`); continue; }
    const 평균겹침 = 있는것.reduce((sum, [, one]) => sum + 으뜸비율(뽑기(one), one.n), 0) / 있는것.length;
    const 평균종류 = 있는것.reduce((sum, [, one]) => sum + 뽑기(one).size, 0) / 있는것.length;
    const 전원같음 = 있는것.filter(([, one]) => 으뜸비율(뽑기(one), one.n) >= 0.99).length;
    console.log(`  ${종류.padEnd(4)} 단원 ${String(있는것.length).padStart(3)}개 · 으뜸이 ${String(Math.round(평균겹침 * 100)).padStart(3)}% 의 과제에 나온다`
      + ` · 종류 ${평균종류.toFixed(1)}종 · **전원이 같은 것을 받는 단원 ${전원같음}개**`);
  }
  return 볼것;
}

const units = 재기(DIR);
const 볼것 = 요약(units, DIR);
if (BEFORE) 요약(재기(BEFORE), BEFORE);

console.log('\n【가장 심한 단원 — 전원이 같은 책을 받는다】');
const 심한것 = 볼것.filter(([, one]) => one.책.size && 으뜸비율(one.책, one.n) >= 0.99)
  .sort((a, b) => b[1].n - a[1].n).slice(0, 15);
for (const [key, one] of 심한것) {
  const top = [...one.책].sort((a, b) => b[1] - a[1])[0];
  console.log(`  과제 ${String(one.n).padStart(3)}건 · 책 ${one.책.size}종 · ${key.padEnd(40)} ← 전원 「${top[0].slice(0, 30)}」`);
}
console.log('\n※ 후보 종류가 적으면 잘 섞어도 겹친다. 겹침을 줄이는 길은 두 가지뿐이다 —');
console.log('   ① 후보를 늘린다(책·논문을 더 넣는다)  ② 학생 보고서 내용으로 고른다(검수가 고른다).');
