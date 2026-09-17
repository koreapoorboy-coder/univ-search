// 대학알리미 「대학별 학과정보」를 통째로 받아 둔다. AI를 쓰지 않으므로 ₩0이다.
//
// 이 API는 **검색이 안 된다.** 학교명·학과명으로 걸러 달라고 보내 봤지만 전부 무시하고 전체를 준다.
// 그래서 한 번 통째로 받아서 우리가 쓸 칸만 남긴다. 책 인덱스와 같은 방식이다.
//
// **svyYr(조사연도)가 필수다.** 안 넣으면 totalCount 가 0으로 온다 — 에러도 안 난다.
// 재 보고 알았다. 넣으면 60,919건이다.
//
// 키는 공공데이터포털 인증키 하나로 된다(공공데이터 목록조회에 쓰는 그 키). 코드에 적지 않는다.
//   set DATA_GO_KR_KEY=...   또는  node tools/fetch_school_major.mjs --key-file <파일>
//
//   node tools/fetch_school_major.mjs --key-file "C:/.../인증키 관련 데이터.txt"
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const OUT = here("../public/keyword-engine/build/.cache_school_major.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const BASE = "https://apis.data.go.kr/B340014/SchoolMajorInfoService/getSchoolMajorInfo";
const YEAR = process.argv.includes("--year") ? process.argv[process.argv.indexOf("--year") + 1] : "2025";
const nap = (ms) => new Promise((done) => setTimeout(done, ms));

async function findKey() {
  if (process.env.DATA_GO_KR_KEY) return process.env.DATA_GO_KR_KEY.trim();
  const at = process.argv.indexOf("--key-file");
  if (at > 0 && process.argv[at + 1]) {
    const raw = await readFile(process.argv[at + 1], "utf8");
    // '공공...: <키>' 또는 '일반 인증키' 다음 줄에 있는 긴 문자열을 찾는다.
    const found = /공공[^:\n]*:\s*([A-Za-z0-9%+/=_-]{20,})/.exec(raw)
      || /일반\s*인증키\s*\n\s*([A-Za-z0-9%+/=_-]{20,})/.exec(raw);
    if (found) return found[1].trim();
  }
  throw new Error('키를 못 찾았습니다. DATA_GO_KR_KEY 를 넣거나 --key-file 로 알려 주세요.');
}

// XML 엔티티를 풀어 준다. 안 풀면 학과 이름이 "Social Science &amp; AI융합학부"로 남는다.
// **원본이 두 번 감싸 놓은 줄이 있다**(&amp;amp;). 한 번만 풀면 &amp; 가 남는다. 안 바뀔 때까지 푼다.
const unescape = (value) => {
  let now = String(value);
  for (let turn = 0; turn < 3; turn += 1) {
    const next = once(now);
    if (next === now) break;
    now = next;
  }
  return now;
};
const once = (value) => String(value)
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, "&");
const text = (block, tag) => {
  const found = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return found ? unescape(found[1].replace(/\s+/g, " ").trim()) : "";
};
// 교과목과 진출 직업은 '|'로 이어 붙여 온다. 맨 앞에도 '|'가 붙어 오는 줄이 있다.
const pipe = (value) => String(value || "").split("|").map((one) => one.trim()).filter(Boolean);

function parse(xml) {
  const out = [];
  for (const hit of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const one = hit[1];
    const school = text(one, "schlNm");
    const major = text(one, "korMjrNm");
    if (!school || !major) continue;
    out.push({
      school, major,
      college: text(one, "clgNm"),
      group: text(one, "onsfSrsClftNm"),      // 계열
      degree: text(one, "pbnfDgriCrseDivNm"), // 학사 / 전문학사 …
      kind: text(one, "schlKndNm"),           // 대학교 / 전문대학 / 기능대학 …
      years: text(one, "lsnTrmNm"),
      quota: Number(text(one, "eschlPscpNum")) || 0,
      area: text(one, "mjrAreaNm"),
      courses: pipe(text(one, "edcCrseLtrCtnt")),
      jobs: pipe(text(one, "pwayEmplLtrCtnt")),
    });
  }
  return out;
}

const key = await findKey();
const ask = async (page, rows = 1000, tries = 3) => {
  const url = `${BASE}?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${rows}&type=xml&svyYr=${YEAR}`;
  for (let turn = 0; turn < tries; turn++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
      const body = await res.text();
      if (!res.ok) throw new Error(String(res.status));
      const err = /<errMsg>([^<]*)<\/errMsg>/.exec(body)?.[1];
      if (err) throw new Error(err);
      return { total: Number(/<totalCount>(\d+)<\/totalCount>/.exec(body)?.[1] || 0), rows: parse(body) };
    } catch (error) {
      if (turn === tries - 1) throw error;
      await nap(3000);
    }
  }
  return { total: 0, rows: [] };
};

const first = await ask(1);
const total = first.total;
const pages = Math.ceil(total / 1000);
console.log(`조사연도 ${YEAR} · 모두 ${total.toLocaleString()}건 · ${pages}쪽\n`);

const all = [...first.rows];
for (let page = 2; page <= pages; page += 1) {
  const got = await ask(page);
  all.push(...got.rows);
  process.stdout.write(`\r받는 중 ${page}/${pages}  (${all.length.toLocaleString()}건)      `);
  await nap(250);
}
process.stdout.write("\r" + " ".repeat(50) + "\r");

await writeFile(OUT, JSON.stringify({ year: YEAR, total, rows: all }), "utf8");

const count = (test) => all.filter(test).length;
console.log(`받았습니다: ${all.length.toLocaleString()}건\n`);
const kinds = {};
for (const one of all) kinds[one.kind] = (kinds[one.kind] || 0) + 1;
console.log("학교 종류별");
for (const [name, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${name.padEnd(14)} ${String(n).padStart(6)}`);
}
console.log(`\n학사 과정            ${count((one) => one.degree === "학사").toLocaleString()}`);
console.log(`교과목이 적힌 학과    ${count((one) => one.courses.length).toLocaleString()}`);
console.log(`진출 직업이 적힌 학과 ${count((one) => one.jobs.length).toLocaleString()}`);
console.log(`\n${OUT.pathname.replace(/^\//, "")}`);
