// **단원마다 학생이 무엇을 받고 무엇을 못 받나.** ₩0.
//
// 오늘까지 「이 단원은 교과서만 나간다」를 하나씩 손으로 찾아냈다(수학 4단원 83건, 물리 재료 쏠림,
// 한 번에 끝나는 과제의 책 0권 1,657건). 그때마다 다른 방법으로 셌고, 표가 없어서 전체를 못 봤다.
// 이 도구가 한 장으로 만든다 — 어느 단원에서 학생이 빈손으로 나가는지.
//
// 감사 결과 폴더(audit_engine_full_v1 이 만든 rows_*.json)를 읽는다. 유료 호출은 없다.
//
//   node tools/audit_material_coverage_v1.mjs .audit_b1              — 빈손인 단원부터
//   node tools/audit_material_coverage_v1.mjs .audit_b1 --all        — 단원 전부
//   node tools/audit_material_coverage_v1.mjs .audit_b1 --csv > x.csv — 표로 저장
import { readdirSync, readFileSync } from 'node:fs';

const DIR = process.argv.find((one) => /^\.?[\w.\\/-]*audit[\w.-]*$/.test(one) && !one.startsWith('--')) || '.audit_b1';
const ALL = process.argv.includes('--all');
const CSV = process.argv.includes('--csv');

const rows = [];
for (const file of readdirSync(DIR)) {
  if (!/^rows_\d+\.json$/.test(file)) continue;
  rows.push(...JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')).rows);
}

// 단원마다 모은다. 같은 단원에 과제가 여럿이면 「한 번이라도 받았나」로 센다 —
// 과제문이 다르면 붙는 것도 달라지므로, 「이 단원에서 받을 길이 있나」를 보는 것이 맞다.
const 단원 = new Map();
for (const r of rows) {
  const key = `${r.subject || '?'}::${r.concept || '(단원 못 정함)'}`;
  if (!단원.has(key)) 단원.set(key, { 과제: 0, 논문: 0, 연구: 0, 책: 0, 공공데이터: 0, 교과서: 0, 빈손: 0 });
  const one = 단원.get(key);
  one.과제 += 1;
  if ((r.ingredients?.papers || 0) > 0) one.논문 += 1;
  if ((r.ingredients?.research || 0) > 0) one.연구 += 1;
  if ((r.books || []).length) one.책 += 1;
  if ((r.datasets || []).length) one.공공데이터 += 1;
  if ((r.refs || []).some((line) => /교과서/.test(line))) one.교과서 += 1;
  const 받은것 = (r.ingredients?.papers || 0) + (r.ingredients?.research || 0) + (r.books || []).length + (r.datasets || []).length;
  if (!받은것) one.빈손 += 1;
}

const 줄 = [...단원.entries()].map(([key, one]) => {
  const [subject, concept] = key.split('::');
  const 빈손비율 = one.빈손 / one.과제;
  return { subject, concept, ...one, 빈손비율 };
});

if (CSV) {
  console.log('과목,단원,과제수,논문,연구,책,공공데이터,교과서,빈손');
  for (const one of 줄.sort((a, b) => a.subject.localeCompare(b.subject) || a.concept.localeCompare(b.concept))) {
    console.log([one.subject, one.concept, one.과제, one.논문, one.연구, one.책, one.공공데이터, one.교과서, one.빈손]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
} else {
  const 빈손단원 = 줄.filter((one) => one.빈손 === one.과제);
  const 반이상 = 줄.filter((one) => one.빈손비율 >= 0.5 && one.빈손 < one.과제);
  console.log(`단원 ${줄.length}개 · 과제 ${rows.length}건\n`);
  console.log(`【교과서만 나가는 단원】 ${빈손단원.length}개 · 과제 ${빈손단원.reduce((s, o) => s + o.과제, 0)}건`);
  for (const one of 빈손단원.sort((a, b) => b.과제 - a.과제)) {
    console.log(`  ${String(one.과제).padStart(4)}건 · ${one.subject} · ${one.concept}`);
  }
  console.log(`\n【절반 이상이 빈손인 단원】 ${반이상.length}개`);
  for (const one of 반이상.sort((a, b) => b.빈손 - a.빈손).slice(0, ALL ? 999 : 15)) {
    console.log(`  ${String(one.빈손).padStart(4)}/${String(one.과제).padEnd(4)} 빈손 · ${one.subject} · ${one.concept}`
      + `  (논문 ${one.논문} 연구 ${one.연구} 책 ${one.책} 데이터 ${one.공공데이터})`);
  }
  const 합 = 줄.reduce((s, o) => ({ 과제: s.과제 + o.과제, 논문: s.논문 + o.논문, 연구: s.연구 + o.연구,
    책: s.책 + o.책, 공공데이터: s.공공데이터 + o.공공데이터, 교과서: s.교과서 + o.교과서, 빈손: s.빈손 + o.빈손 }),
    { 과제: 0, 논문: 0, 연구: 0, 책: 0, 공공데이터: 0, 교과서: 0, 빈손: 0 });
  const 백 = (n) => `${String(n).padStart(5)} (${String(Math.round(n / 합.과제 * 100)).padStart(3)}%)`;
  console.log('\n【전체에서 학생이 받는 것】');
  console.log(`  논문      ${백(합.논문)}`);
  console.log(`  대학 연구  ${백(합.연구)}`);
  console.log(`  책        ${백(합.책)}`);
  console.log(`  공공데이터 ${백(합.공공데이터)}`);
  console.log(`  교과서     ${백(합.교과서)}`);
  console.log(`  빈손      ${백(합.빈손)}   ← 교과서 한 줄만 들고 나간다`);
}
