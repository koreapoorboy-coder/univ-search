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

// KOSIS 값이 3715049.16314 처럼 온다. 학생 표에 그대로 쓸 수 없다.
// 반올림은 지어내기가 아니다 — 자리만 줄인다. 큰 수는 정수, 작은 수는 소수 두 자리까지.
function tidyNumber(text) {
  const raw = String(text ?? '').trim();
  if (!/^-?\d+\.\d{4,}$/.test(raw)) return raw;
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  const places = Math.abs(value) >= 1000 ? 0 : Math.abs(value) >= 1 ? 2 : 4;
  return String(Number(value.toFixed(places)));
}

const clean = (value, max = 40) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// 202409 → 2024년 9월 / 2024 → 2024년
function periodLabel(code) {
  const text = String(code || '').trim();
  if (/^\d{6}$/.test(text)) return `${text.slice(0, 4)}년 ${Number(text.slice(4))}월`;
  if (/^\d{4}$/.test(text)) return `${text}년`;
  return text;
}

// 합계·총계 줄은 학생 표의 조건으로 쓰지 않는다 — 비교가 안 된다.
// 「시도평균」·「총발전량」·「신재생에너지 총발전량①+②」도 합계다 — 비교할 것이 아니다.
const TOTAL = /^(전국|총계|합계|계|전체|소계)$|평균$|^총|①|전년|증감/;

// 항목 이름이 「계」·「합계」·「총계:…」면 비교가 안 된다. 다른 항목이 있으면 그것을 쓴다.
const AGG_ITEM = /(^|:)\s*(총계|합계|계|전체|평 ?균|소계)\s*$/;
const isNumberish = (value) => /^-?[\d,]+(\.\d+)?$/.test(String(value ?? '').trim());

// 한 표에 항목이 서른 개 넘게 섞인 것이 있다(종관기상: 평균기온·강수량·최고기온**일자**…).
// 항목을 고르지 않고 첫 줄을 집으면 단위가 다른 값이나 날짜가 숫자 자리에 들어간다.
// 그래서 항목을 **하나** 고른다: 숫자이고, 합계가 아니고, 표 단위와 맞고, 값이 많은 것.
function pickItem(rows, tableUnit, wanted) {
  const byItem = new Map();
  for (const one of rows) {
    const name = clean(one.item, 40);
    const box = byItem.get(name) || { name, unit: clean(one.unit, 16), numbers: 0, total: 0, at: byItem.size };
    box.total += 1;
    if (isNumberish(one.value)) box.numbers += 1;
    byItem.set(name, box);
  }
  // 단원이 항목을 정해 주었으면 그것을 쓴다.
  if (wanted && byItem.has(clean(wanted, 40))) return byItem.get(clean(wanted, 40));
  const all = [...byItem.values()].filter((one) => one.total && one.numbers / one.total >= 0.9);
  if (!all.length) return null;
  const plain = all.filter((one) => !AGG_ITEM.test(one.name));
  const pool = plain.length ? plain : all;
  const unit = clean(tableUnit, 16);
  const fits = unit ? pool.filter((one) => !one.unit || one.unit === unit) : pool;
  const use = (fits.length ? fits : pool).slice();
  use.sort((a, b) => (b.numbers - a.numbers) || (a.at - b.at));
  return use[0];
}

export function findTable(seed, unitMap, concept) {
  const ids = (unitMap?.byConcept || {})[clean(concept, 60)] || [];
  for (const entry of ids) {
    // 「표id#항목」이면 어느 항목을 쓸지도 사람이 정한 것이다.
    const [id, wanted] = String(entry).split("#");
    const table = (seed?.tables || []).find((one) => one.id === id);
    if (table && (table.rows || []).length) return wanted ? { ...table, preferItem: wanted } : table;
  }
  return null;
}

// 학생이 낼 표 한 장. 지역 몇 곳 × 기간 몇 개를 골라 조건을 만든다.
// 「지점별 기상 관측값」만으로는 무엇을 잰 것인지 모른다. 고른 항목을 붙여 준다.
function itemName(table, item) {
  const base = clean(table.what, 40) || clean(table.name, 40);
  const name = clean(item?.name, 24);
  if (!name || AGG_ITEM.test(name) || base.includes(name)) return base;
  return clean(`${base} — ${name}`, 60);
}

export function buildFilledTable(table, { areas = 3, periods = 4 } = {}) {
  if (!table || !(table.rows || []).length) return null;
  const rows = table.rows;
  const item = pickItem(rows, table.unit, table.preferItem);
  const rowsOfItem = item ? rows.filter((one) => clean(one.item, 40) === item.name) : rows;
  const allPeriods = [...new Set(rowsOfItem.map((one) => one.period))].sort();
  // 기간은 고르게, 그리고 **끝에서** 잡는다.
  // 앞에서 잡으면 마지막 하나만 최신으로 바꾸게 되어 2021·2022·2023·2025처럼 한 해가 빠졌다.
  const gap = Math.max(1, Math.floor((allPeriods.length - 1) / Math.max(1, periods - 1)));
  const usePeriods = [];
  for (let at = allPeriods.length - 1; at >= 0 && usePeriods.length < periods; at -= gap) usePeriods.unshift(allPeriods[at]);

  // 지역은 **고른 기간 모두에 값이 있는 곳**만. 빈칸이 있으면 학생 표가 망가진다.
  const byArea = new Map();
  for (const one of rowsOfItem) {
    if (!usePeriods.includes(one.period)) continue;
    if (TOTAL.test(one.area)) continue;
    // 숫자가 아닌 값은 넣지 않는다. 빈칸이 생기면 그 지역은 아래에서 빠진다.
    if (!isNumberish(one.value)) continue;
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
      conditions.push({ label: `${clean(area, 20)} · ${periodLabel(period)}`, values: [tidyNumber(hit.value)] });
    }
  }
  return {
    measurementName: itemName(table, item),
    unit: clean(item?.unit, 16) || clean(table.unit, 16),
    scaleGuide: `${table.org} 「${table.name}」에서 가져온 값이다. 조회일 ${table.accessed}.`,
    conditions,
    source: { name: table.name, org: table.org, accessed: table.accessed, tblId: table.tblId },
    note: `${table.org} 「${table.name}」, ${table.accessed} 조회`,
  };
}
