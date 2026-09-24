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

// **전수로 확인해 고른 표다(2026-09-24).**
//   KOSIS 전체 29,314개 → 이름으로 5,591개 → **하나씩 다 불러** 값이 오는 1,019개
//   → 설문·업무·무거운 주제를 뺀 494개 → 사람이 읽고 고른 27개.
// 5,591개 중 4,572개(82%)는 불러도 값이 안 온다 — 목록에만 있거나, 분류축이 둘 이상이라
// objL 을 더 줘야 하거나, 비교할 값이 모자란다. 이름만 보고 고르면 다섯에 넷이 빈 표다.
//
// 처음 이름 거르개(3,408개)는 좁았다 — 「합계출산율」·「생명표」·「이동자수」가 빠졌다.
// 넓혀서 다시 전수로 돌리니 값이 오는 표가 478 → 1,019개로 늘었다.
// 부르지 않은 23,723개도 과학·수학 낱말로 다시 훑었다. 남은 것은 설문뿐이다.
const TABLES = [
  { id: "pm25", name: "미세먼지(PM2.5) 월별 대기오염도(측정망별,시도별,도시별,측정지점별)", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200176", prdSe: "Y", count: 5,
    what: "도시별 초미세먼지 농도", itm: "ALL" },
  { id: "ozone", name: "오존 월별 대기오염도(측정망별,시도별,도시별,측정지점별)", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200074", prdSe: "Y", count: 5,
    what: "도시별 오존 농도", itm: "ALL" },
  { id: "no2", name: "이산화질소 월별 대기오염도(측정망별,시도별,도시별,측정지점별)", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200073", prdSe: "Y", count: 5,
    what: "도시별 이산화질소 농도", itm: "ALL" },
  { id: "weather", name: "[종관기상] 지점별 연·월 통계", org: "기상청", orgId: "141", tblId: "DT_14102_B001", prdSe: "Y", count: 5,
    what: "지점별 기상 관측값", itm: "ALL" },
  // 호소 수질은 지점이 많아 5년을 부르면 4만 셀 제한에 걸린다. 2년만 받는다.
  { id: "lakeWater", name: "호소의 수질현황", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_01_0100170", prdSe: "Y", count: 2,
    what: "호수·저수지 수질", itm: "ALL" },
  { id: "recycle", name: "폐기물 종류별 재활용현황", org: "환경부", orgId: "392", tblId: "DT_501", prdSe: "Y", count: 5,
    what: "폐기물 종류별 재활용", itm: "ALL" },
  { id: "population", name: "행정구역(시군구)별, 성별 인구수", org: "통계청", orgId: "101", tblId: "DT_1B040A3", prdSe: "Y", count: 5,
    what: "시·군·구별 인구수", itm: "ALL" },
  { id: "birth", name: "시군구/성/월별 출생", org: "통계청", orgId: "101", tblId: "DT_1B81A01", prdSe: "Y", count: 5,
    what: "시·군·구 월별 출생아 수", itm: "ALL" },
  { id: "eduCost", name: "학교급별  학생 1인당 월평균 사교육비", org: "통계청", orgId: "101", tblId: "DT_1PE201", prdSe: "Y", count: 5,
    what: "학교급별 1인당 월평균 사교육비", itm: "ALL" },
  { id: "eduCostDist", name: "월평균 사교육비 지출금액 구간 및 특성별  분포", org: "통계청", orgId: "101", tblId: "DT_1PE401", prdSe: "Y", count: 5,
    what: "사교육비 지출금액 구간별 분포", itm: "ALL" },
  { id: "fluShot", name: "시·군·구별 연간 인플루엔자 예방접종률", org: "질병관리청", orgId: "177", tblId: "DT_INFLUENZA", prdSe: "Y", count: 5,
    what: "시·군·구별 예방접종률", itm: "ALL" },
  { id: "infection", name: "감염병 군별 발생현황", org: "질병관리청", orgId: "177", tblId: "DT_117N_A00401", prdSe: "Y", count: 5,
    what: "감염병 군별 발생 건수", itm: "ALL" },
  { id: "fire", name: "화재장소에 대한 월별 화재현황", org: "소방청", orgId: "156", tblId: "DT_15601N_004", prdSe: "Y", count: 5,
    what: "화재 장소별 월별 발생 건수", itm: "ALL" },
  { id: "power", name: "행정구역별 용도별 판매전력량", org: "한국전력공사", orgId: "310", tblId: "DT_31002_A006", prdSe: "Y", count: 5,
    what: "지역별 용도별 판매전력량", itm: "ALL" },
  { id: "renewable", name: "신·재생에너지 발전량(비재생폐기물 제외, 2019년 4/4분기~)", org: "한국에너지공단", orgId: "337", tblId: "DT_337N_A002", prdSe: "Y", count: 5,
    what: "신·재생에너지 발전량", itm: "ALL" },
  { id: "internet", name: "인터넷 이용자수", org: "과학기술정보통신부", orgId: "127", tblId: "DT_MH002_MI002", prdSe: "Y", count: 5,
    what: "인터넷 이용자 수", itm: "ALL" },
  { id: "cpi", name: "소비자물가지수(2020=100)", org: "통계청", orgId: "101", tblId: "DT_1J22003", prdSe: "Y", count: 5,
    what: "연도별 소비자물가지수", itm: "ALL" },
  { id: "cpiRate", name: "연도별 소비자물가 등락률", org: "통계청", orgId: "101", tblId: "DT_1J22041", prdSe: "Y", count: 5,
    what: "연도별 물가 등락률", itm: "ALL" },
  // ── 2026-09-24 거르개를 넓혀 다시 전수 확인하고 더 넣은 표 ────────
  { id: "so2", name: "아황산가스 월별 대기오염도(측정망별,시도별,도시별,측정지점별)", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200071", prdSe: "Y", count: 5,
    what: "도시별 아황산가스 농도", itm: "ALL" },
  { id: "co", name: "일산화탄소 월별 대기오염도(측정망별,시도별,도시별,측정지점별)", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_03_0200075", prdSe: "Y", count: 5,
    what: "도시별 일산화탄소 농도", itm: "ALL" },
  // 하천수는 지점 179곳 × 항목 21개다. 5년을 부르면 4만 셀 제한에 걸린다.
  { id: "riverWater", name: "하천수의 수질현황-금강권역", org: "국립환경과학원", orgId: "106", tblId: "DT_106N_01_0100160", prdSe: "Y", count: 2,
    what: "하천 수질(금강권역)", itm: "ALL" },
  // 평년값(30년 평균)은 **넣지 않았다.** 값은 오지만 기간 코드가 「202010」으로 온다.
  // 그러면 보고서에 「2020년 10월 평년값」이라고 찍힌다 — 평년값은 어느 한 달의 값이 아니다.
  // 틀린 말이 되므로 뺀다. 기간 표기를 따로 다룰 수 있을 때 다시 본다.
  // 줄이 시각(1시~24시)이다. 하루 동안 전기를 언제 많이 쓰는지 바로 보인다.
  { id: "powerHour", name: "주택용 월별 1~24시 전력소비계수", org: "한국전력공사", orgId: "310", tblId: "DT_3664N_1", prdSe: "Y", count: 3,
    what: "주택용 시간대별 전력소비계수", itm: "ALL" },
  { id: "birthRate", name: "시군구/출생아수, 합계출산율", org: "통계청", orgId: "101", tblId: "DT_1B81A23", prdSe: "Y", count: 5,
    what: "시·군·구별 합계출산율", itm: "ALL" },
  // 생명표에는 **사망확률**과 기대여명이 있다. 확률·기대값 단원에 쓸 자료가 이것뿐이다.
  { id: "lifeTable", name: "완전생명표(1세별)", org: "통계청", orgId: "101", tblId: "DT_1B42", prdSe: "Y", count: 3,
    what: "나이별 사망확률과 기대여명", itm: "ALL" },
  { id: "migration", name: "시군구별 이동자수", org: "통계청", orgId: "101", tblId: "DT_1B26001_A01", prdSe: "Y", count: 5,
    what: "시·군·구별 이동자 수", itm: "ALL" },
  { id: "vital", name: "시군구/인구동태건수 및 동태율(출생,사망,혼인,이혼)", org: "통계청", orgId: "101", tblId: "DT_1B8000I", prdSe: "Y", count: 5,
    what: "시·군·구별 출생·사망률", itm: "ALL" },
];

const today = new Date().toISOString().slice(0, 10);
const UNIT_FIX = { pm25: "㎍/㎥", pm10: "㎍/㎥" };

// 표 하나에 단위가 다른 항목이 섞이면 KOSIS 가 단위를 비워 두거나 두 개를 이어 붙여 준다.
//   · 생명표: 「기대여명」만 「년」이고 「사망확률」·「생존자」는 빈칸이다.
//   · 합계출산율: 두 항목 모두 「명 가임여자 1명당 명」으로 온다 — 두 단위를 이어 붙인 것이다.
// 보고서에 단위가 틀리면 틀린 말이 된다. 항목별로 사람이 적어 준다.
const ITEM_UNIT = {
  lifeTable: [[/^사망확률/, "확률"], [/^기대여명/, "년"], [/^(생존자|사망자|정지인구)/, "명"], [/^총생존년수/, "년"]],
  birthRate: [[/^합계출산율$/, "가임여자 1명당 명"], [/^출생아수$/, "명"]],
  powerHour: [[/./, "계수"]],
};

// 「출생건수 (명)」처럼 항목 이름 끝에 단위가 붙어 오는 표가 있다. 꺼내서 단위로 쓴다.
const UNIT_WORD = /^(명|건|가구|세대|개|개소|대|%|천명당|백명당|년|일|시간|원|천원|만원|백만원|톤|㎜|℃|명\/㎢)$/;

// KOSIS 가 값 끝에 별표를 붙여 보낸다(「0.0029*」) — 주석 표시다.
// 별표가 붙은 채로 보고서에 들어가면 숫자가 아니게 된다. 숫자만 남긴다.
const cleanValue = (value) => String(value ?? "").trim().replace(/[*※†]+$/, "").trim();

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
      .map((row) => ({ area: clean(row.C1_NM, 30), period: clean(row.PRD_DE, 10), item: clean(row.ITM_NM, 40), value: cleanValue(row.DT), unit: clean(row.UNIT_NM, 16) }));
  } catch (error) { console.log(`  건너뜀 ${one.name} — ${String(error).slice(0, 50)}`); continue; }
  if (!rows.length) { console.log(`  건너뜀 ${one.name} — 값이 없다`); continue; }
  // **파일이 커지면 워커가 매번 내려받느라 느려진다.** 학생 표는 지역 3~4곳 × 기간 3~4개면
  // 충분하다. 지역을 앞에서부터 40곳까지만 남긴다 — 시·도와 큰 시·군·구가 먼저 온다.
  const areaOrder = [...new Set(rows.map((row) => row.area))].slice(0, 40);
  const areaSet = new Set(areaOrder);
  rows = rows.filter((row) => areaSet.has(row.area));
  // KOSIS 가 부모 표(대기오염도)의 단위를 그대로 준다 — 미세먼지가 ppm 으로 온다.
  // 미세먼지는 ㎍/㎥ 다. 보고서에 ppm 이 찍히면 틀린 말이 된다. 이산화질소는 진짜 ppm 이다.
  if (UNIT_FIX[one.id]) for (const row of rows) row.unit = UNIT_FIX[one.id];
  for (const row of rows) {
    // 항목 이름 끝의 「(명)」을 단위로 옮긴다
    const tail = /\(([^()]{1,12})\)\s*$/.exec(row.item);
    if (tail && UNIT_WORD.test(tail[1].trim())) { row.unit = tail[1].trim(); row.item = row.item.slice(0, tail.index).trim(); }
    const rules = ITEM_UNIT[one.id] || [];
    for (const [pattern, unit] of rules) if (pattern.test(row.item)) { row.unit = unit; break; }
  }
  // 표 단위는 **가장 많이 쓰인** 단위다. 첫 줄을 쓰면 섞인 표에서 엉뚱한 것이 잡힌다.
  const tally = new Map();
  for (const row of rows) if (row.unit) tally.set(row.unit, (tally.get(row.unit) || 0) + 1);
  const units = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  out.tables.push({ id: one.id, name: one.name, org: one.org, what: one.what,
    orgId: one.orgId, tblId: one.tblId, prdSe: one.prdSe, unit: units[0] || "", accessed: today, rows });
  console.log(`  ${one.name} — ${rows.length}줄 · 단위 ${units.join("/") || "없음"}`);
}

console.log(`\n표 ${out.tables.length}개 · 줄 ${out.tables.reduce((n, one) => n + one.rows.length, 0).toLocaleString()}개`);
if (WRITE) { writeFileSync(OUT, `${JSON.stringify(out)}\n`, "utf8"); console.log("씨앗 파일에 썼습니다."); }
else console.log("(보여 주기만 했습니다. --write 를 붙이세요.)");
