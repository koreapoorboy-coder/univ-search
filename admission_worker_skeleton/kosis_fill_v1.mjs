// **KOSIS 표에서 학생이 낼 표를 뽑는다.** ₩0 — 씨앗 파일만 읽는다.
//
// 사용자 결정 2026-09-23: 학생이 공공데이터 포털에서 자료를 찾아 옮겨 적는 것은 너무 힘들다.
// 「우리가 완전한 보고서를 주고 학생이 읽고 참고할 자료를 주는」 쪽으로 간다.
//
// 그래서 **숫자를 우리가 채운다.** 다만 지어내지 않는다 —
//   · 숫자는 KOSIS 씨앗 파일의 값 **그대로**다. 고치거나 만들지 않는다.
//   · 표 이름·기관·조회일을 함께 넘긴다. 보고서 방법 절과 참고 자료에 그대로 들어간다.
//   · 그러므로 보고서는 「내가 쟀다」가 아니라 「통계청 ○○표에서 가져온 값」이 된다.
//     이것은 지어내기가 아니라 공개 자료 분석이고, 「자료해석형」 수행평가가 바라는 것이다.

const clean = (value, max = 40) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// 202409 → 2024년 9월 / 2024 → 2024년
function periodLabel(code) {
  const text = String(code || '').trim();
  if (/^\d{6}$/.test(text)) return `${text.slice(0, 4)}년 ${Number(text.slice(4))}월`;
  if (/^\d{4}$/.test(text)) return `${text}년`;
  return text;
}

// 합계·총계 줄은 학생 표의 조건으로 쓰지 않는다 — 비교가 안 된다.
const TOTAL = /^(전국|총계|합계|계|전체)$/;

export function findTable(seed, unitMap, concept) {
  const ids = (unitMap?.byConcept || {})[clean(concept, 60)] || [];
  for (const id of ids) {
    const table = (seed?.tables || []).find((one) => one.id === id);
    if (table && (table.rows || []).length) return table;
  }
  return null;
}

// 학생이 낼 표 한 장. 지역 몇 곳 × 기간 몇 개를 골라 조건을 만든다.
export function buildFilledTable(table, { areas = 3, periods = 4 } = {}) {
  if (!table || !(table.rows || []).length) return null;
  const rows = table.rows;
  const allPeriods = [...new Set(rows.map((one) => one.period))].sort();
  // 기간은 **고르게** 고른다 — 끝에서 넷을 자르면 최근 넉 달만 보게 된다.
  const step = Math.max(1, Math.floor(allPeriods.length / periods));
  const usePeriods = [];
  for (let at = 0; at < allPeriods.length && usePeriods.length < periods; at += step) usePeriods.push(allPeriods[at]);
  const last = allPeriods[allPeriods.length - 1];
  if (!usePeriods.includes(last) && usePeriods.length) usePeriods[usePeriods.length - 1] = last;

  // 지역은 **고른 기간 모두에 값이 있는 곳**만. 빈칸이 있으면 학생 표가 망가진다.
  const byArea = new Map();
  for (const one of rows) {
    if (!usePeriods.includes(one.period)) continue;
    if (TOTAL.test(one.area)) continue;
    const list = byArea.get(one.area) || new Map();
    if (!list.has(one.period)) list.set(one.period, one);
    byArea.set(one.area, list);
  }
  const useAreas = [...byArea.entries()]
    .filter(([, list]) => list.size === usePeriods.length)
    .slice(0, areas).map(([name]) => name);
  if (!useAreas.length || usePeriods.length < 2) return null;

  const conditions = [];
  for (const area of useAreas) {
    for (const period of usePeriods) {
      const hit = byArea.get(area).get(period);
      conditions.push({ label: `${clean(area, 20)} · ${periodLabel(period)}`, values: [String(hit.value)] });
    }
  }
  return {
    measurementName: clean(table.what, 40) || clean(table.name, 40),
    unit: clean(table.unit, 16),
    scaleGuide: `${table.org} 「${table.name}」에서 가져온 값이다. 조회일 ${table.accessed}.`,
    conditions,
    source: { name: table.name, org: table.org, accessed: table.accessed, tblId: table.tblId },
    note: `${table.org} 「${table.name}」, ${table.accessed} 조회`,
  };
}
