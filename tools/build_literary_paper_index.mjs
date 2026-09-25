// **읽은 작품 이름으로 찾는 문학 논문 색인.** AI를 쓰지 않으므로 ₩0.
//
// 왜 만드는가(2026-09-25 전수 측정). 국어·영어 과제 620건 중 213건(34.4%)은 학교 안내문이
// **작품 이름을 말하지 않는다** — 「사전에 작품은 선정해 놓고」, 「단편소설들을 읽고」.
// 출판사 교과서를 전부 모아도 어느 작품인지 알 수 없다. 아는 사람은 학생뿐이다.
// 그래서 학생에게 한 줄 물어보고, **그 이름으로 논문을 찾는다.** 이 색인이 그 찾을 곳이다.
//
// 재료는 이미 쓰고 있는 공공데이터포털 파일 「한국연구재단_KCI논문정보」다(이용허락 제한 없음).
// 개념별 색인(build_kci_paper_index.mjs)과 다른 점: **개념이 아니라 작품 이름으로 찾는다.**
// 그래서 낱말 규칙으로 미리 고르지 않고, 문학 분야 논문을 그대로 담아 둔다.
//
//   node tools/build_literary_paper_index.mjs            — 무엇이 들어가는지만 본다
//   node tools/build_literary_paper_index.mjs --write     — 실제로 만든다
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const WRITE = process.argv.includes("--write");
const CSV = process.argv.find((one) => /\.csv$/i.test(one))
  || "C:/Users/korea/Downloads/한국연구재단_KCI논문정보_20250825.csv";
const OUT = new URL("../public/keyword-engine/seed/engine-index/literary_papers.v1.json", import.meta.url);

// 담을 분야. **문학 분야만** 담는다. 「기타인문학」은 3,265편인데 문학이 아닌 것이 섞여 있다.
const KEEP = [
  "인문학 > 한국어와문학",
  "인문학 > 문학",
  "인문학 > 영어와문학",
];

function cells(line) {
  const out = [];
  let now = "";
  let quoted = false;
  for (let at = 0; at < line.length; at += 1) {
    const ch = line[at];
    if (quoted) {
      if (ch === '"' && line[at + 1] === '"') { now += '"'; at += 1; }
      else if (ch === '"') quoted = false;
      else now += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(now); now = ""; }
    else now += ch;
  }
  out.push(now);
  return out;
}
const HANGUL = /[가-힣]/g;
const korean = (...values) => values.find((one) => (String(one || "").match(HANGUL) || []).length >= 2) || "";

const rows = [];
const seen = new Set();
let read = 0;
let head = null;
const stream = createInterface({ input: createReadStream(CSV, { encoding: "utf8" }), crlfDelay: Infinity });
for await (const line of stream) {
  if (!line.trim()) continue;
  const parts = cells(line);
  if (!head) { head = parts.map((one) => one.replace(/^\uFEFF/, "").trim()); continue; }
  read += 1;
  const get = (name) => parts[head.indexOf(name)] || "";
  const field = get("주제분야").trim();
  if (!KEEP.some((one) => field.startsWith(one))) continue;
  const title = korean(get("논문명(국문)"), get("논문명(외국어)")).trim();
  if (!title) continue;                        // 한글 제목이 없으면 학생이 찾아 읽을 수 없다
  const key = title.replace(/\s+/g, "");
  if (seen.has(key)) continue;
  seen.add(key);
  // 칸 순서는 paper-route 조각과 같게 둔다 — 같은 자리에서 같은 뜻이면 읽는 코드가 하나로 준다.
  rows.push([
    title.slice(0, 200),
    get("저자").trim(),
    get("발행년").trim(),
    (korean(get("학술지명(국문)"), get("학술지명(외국어)")) || get("학술지명(국문)") || get("학술지명(외국어)")).trim(),
    get("권").trim(),
    get("호").trim(),
    [get("시작페이지").trim(), get("끝페이지").trim()].filter(Boolean).join("-"),
    korean(get("키워드(국문)"), get("키워드(외국어)")).trim(),
  ]);
}

const out = {
  version: "literary-papers-v1",
  note: "읽은 작품 이름으로 찾는 문학 논문. 학생이 적은 작품·작가 이름이 제목이나 키워드에 있으면 붙인다.",
  source: "공공데이터포털 한국연구재단_KCI논문정보 (이용허락 제한 없음)",
  builtAt: new Date().toISOString().slice(0, 10),
  fields: ["title", "author", "year", "journal", "volume", "issue", "pages", "keywords"],
  rows,
};
const json = `${JSON.stringify(out)}\n`;
console.log(`읽은 논문 ${read.toLocaleString()}편 → 문학 분야 ${rows.length.toLocaleString()}편 · ${(json.length / 1024 / 1024).toFixed(2)}MB`);

// **찾아지는지 먼저 본다.** 고등학교에서 흔히 읽는 작가·작품으로 재 본다.
const WORKS = ["김유정", "이효석", "황순원", "현진건", "채만식", "박완서", "이청준", "조세희", "윤동주", "백석",
  "정지용", "김소월", "서정주", "김수영", "한강", "춘향전", "홍길동전", "구운몽", "심청전", "메밀꽃 필 무렵",
  "운수 좋은 날", "소나기", "동백꽃", "날개", "광장", "난쟁이가 쏘아올린 작은 공", "허생전", "양반전", "무정", "삼대"];
const hay = rows.map((r) => `${r[0]} ${r[7]}`);
let hit = 0;
for (const work of WORKS) {
  const n = hay.filter((one) => one.includes(work)).length;
  if (n) hit += 1;
  console.log(`  ${n ? "✔" : "✗"} ${work.padEnd(16)} ${n}편`);
}
console.log(`\n작가·작품 ${WORKS.length}개 중 논문이 걸리는 것 ${hit}개 (${((hit / WORKS.length) * 100).toFixed(0)}%)`);
if (WRITE) { await writeFile(OUT, json, "utf8"); console.log("\n색인을 적었습니다."); }
else console.log("\n(보여 주기만 했습니다. --write 를 붙이세요.)");
