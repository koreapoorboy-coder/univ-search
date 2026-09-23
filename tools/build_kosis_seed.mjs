// KOSIS 통계표를 **한 번 받아 씨앗 파일로 저장**한다.
//
// 왜 미리 받아 두나.
//   · 학생이 보고서를 만들 때마다 부르면 느리고, 분당 호출 제한에 걸린다(KOSIS 공지 2026-07-09).
//   · 씨앗으로 두면 **전수 감사가 된다** — 같은 입력이면 같은 숫자가 나온다.
//   · 논문 6만 편·책 242권과 같은 방식이다.
//
// 여기 들어가는 숫자는 **전부 KOSIS가 준 값 그대로**다. 우리가 만들거나 고치지 않는다.
// 표 이름·기관·조회일을 함께 적는다 — 보고서 참고 자료에 그대로 들어간다.
//
//   node tools/build_kosis_seed.mjs            (보여 주기만)
//   node tools/build_kosis_seed.mjs --write
import { readFileSync, writeFileSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const KEY_FILE = "C:/Users/korea/OneDrive/바탕 화면/인증키 .txt";
const OUT = new URL("../public/keyword-engine/seed/engine-index/kosis_tables.v1.json", import.meta.url);

const lines = readFileSync(KEY_FILE, "utf8").split("\n").map((one) => one.trim());
const KEY = (lines[lines.findIndex((one) => /kosis/i.test(one)) + 1] || "").trim();
if (!KEY) { console.error("인증키 파일에서 KOSIS 키를 못 찾았습니다."); process.exit(1); }

// 실제로 불러서 값이 오는 것만 넣는다(2026-09-23 확인). 축이 복잡한 표는 나중에.
const TABLES = [
  { id: "population", name: "행정구역(시군구)별, 성별 인구수", org: "통계청", orgId: "101", tblId: "DT_1B040A3", prdSe: "Y", count: 5,
    what: "시·도별 총인구수", itm: "T20" },
  { id: "pm25", name: "미세먼지(PM2.5) 월별 도시별 대기오염도", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200145", prdSe: "M", count: 12,
    what: "도시별 월평균 초미세먼지 농도", itm: "ALL" },
  { id: "pm10", name: "미세먼지(PM10) 월별 도시별 대기오염도", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200045", prdSe: "M", count: 12,
    what: "도시별 월평균 미세먼지 농도", itm: "ALL" },
  { id: "cpi", name: "소비자물가지수(2020=100)", org: "통계청", orgId: "101", tblId: "DT_1J22003", prdSe: "Y", count: 10,
    what: "연도별 소비자물가지수", itm: "ALL" },
  { id: "cpiRate", name: "연도별 소비자물가 등락률", org: "통계청", orgId: "101", tblId: "DT_1J22041", prdSe: "Y", count: 10,
    what: "연도별 물가 등락률", itm: "ALL" },
];

const today = new Date().toISOString().slice(0, 10);
const clean = (value, max = 60) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const out = { version: "kosis-tables-v1", fetchedAt: today,
  note: "KOSIS 공유서비스에서 받은 값 그대로다. 우리가 만들거나 고치지 않는다. 표 이름·기관·조회일은 보고서 참고 자료에 그대로 쓴다.",
  tables: [] };

for (const one of TABLES) {
  const url = `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${encodeURIComponent(KEY)}`
    + `&itmId=${one.itm}&objL1=ALL&format=json&jsonVD=Y&prdSe=${one.prdSe}&newEstPrdCnt=${one.count}&orgId=${one.orgId}&tblId=${one.tblId}`;
  let rows = [];
  try {
    const body = await (await fetch(url, { signal: AbortSignal.timeout(30000) })).json();
    if (!Array.isArray(body)) { console.log(`  건너뜀 ${one.name} — ${JSON.stringify(body).slice(0, 70)}`); continue; }
    rows = body.filter((row) => row?.DT !== undefined && row.DT !== null && String(row.DT).trim() !== "" && String(row.DT) !== "-")
      .map((row) => ({ area: clean(row.C1_NM, 30), period: clean(row.PRD_DE, 10), item: clean(row.ITM_NM, 40), value: String(row.DT).trim(), unit: clean(row.UNIT_NM, 16) }));
  } catch (error) { console.log(`  건너뜀 ${one.name} — ${String(error).slice(0, 50)}`); continue; }
  if (!rows.length) { console.log(`  건너뜀 ${one.name} — 값이 없다`); continue; }
  const units = [...new Set(rows.map((row) => row.unit).filter(Boolean))];
  out.tables.push({ id: one.id, name: one.name, org: one.org, what: one.what,
    orgId: one.orgId, tblId: one.tblId, prdSe: one.prdSe, unit: units[0] || "", accessed: today, rows });
  console.log(`  ${one.name} — ${rows.length}줄 · 단위 ${units.join("/") || "없음"}`);
}

console.log(`\n표 ${out.tables.length}개 · 줄 ${out.tables.reduce((n, one) => n + one.rows.length, 0).toLocaleString()}개`);
if (WRITE) { writeFileSync(OUT, `${JSON.stringify(out)}\n`, "utf8"); console.log("씨앗 파일에 썼습니다."); }
else console.log("(보여 주기만 했습니다. --write 를 붙이세요.)");
