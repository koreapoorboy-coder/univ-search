// 개념마다 붙일 **KCI 논문**을 인덱스로 굳혀 둔다. AI를 쓰지 않으므로 ₩0이다.
//
// 재료는 공공데이터포털 파일 데이터 「한국연구재단_KCI논문정보」(CSV, 이용허락 제한 없음)다.
// 사용자가 받아서 Downloads 에 둔다. 저장소에는 넣지 않는다 — 87MB이고, 우리 방식은 원본이 아니라
// 인덱스만 커밋한다.
//
// **왜 API가 아니라 파일인가.** data.go.kr 의 KCI API 넷을 다 열어 재 봤는데 전부 못 쓴다:
// 검색 파라미터가 없고, numOfRows 를 뭘 주든 한 쪽에 10줄만 오고, 30쪽쯤에서 페이징이 끊긴다
// (230만 건 가운데 300건). 파일만이 전체를 준다.
//
// **주소를 못 붙인다. 그래도 참고 자료가 된다.**
// KCI 논문 상세 쪽은 로그인 없이 초록이 통째로 보인다(다섯 편을 열어 확인했다). 학생이 제목으로
// 검색하면 찾아서 읽을 수 있다. 실제 학술 인용도 주소 없이 서지사항만 적는다. 파일에 논문 번호가
// 없어 링크는 못 만들지만, 서지사항이 정확하면 찾을 수 있다 — 그래서 서지사항을 정확히 적는다.
// 다만 **'여기서 무엇을 얻었다'는 쓰지 않는다.** 학생이 아직 안 읽었기 때문이다. 공공데이터와 같다.
//
//   node tools/build_kci_paper_index.mjs           — 무엇이 들어가는지만 보여 준다
//   node tools/build_kci_paper_index.mjs --write   — 실제로 만든다
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { buildSpread, courseTouches, pointers, wantsResearch } from "../admission_worker_skeleton/univ_research_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const CSV = process.argv.find((one) => /\.csv$/i.test(one))
  || "C:/Users/korea/Downloads/한국연구재단_KCI논문정보_20250825.csv";
const OUT = here("../public/keyword-engine/seed/engine-index/kci_paper_index.v1.json");
const axisIndex = JSON.parse(await readFile(here("../public/keyword-engine/seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));

// 한 줄을 칸으로 가른다. 따옴표 안의 쉼표는 가르지 않는다.
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
// 「논문명(국문)」이 늘 한글은 아니다. 원어 제목이 영어면 거기에 영어가 들어 있고 한글은 (외국어) 칸에 있다.
// 키워드도 국문/외국어가 뒤바뀐 줄이 있다. 그래서 **한글이 든 쪽을 고른다.**
const korean = (...values) => values.find((one) => (String(one || "").match(HANGUL) || []).length >= 2) || "";

// **과목마다 볼 주제분야를 정해 둔다.** 이게 이 파일에서 제일 크게 달라진 자리다.
//
// 전에는 대분류(자연과학·의약학)까지만 봤다. 그래서 「산과 염기」에 한의학 "산과학"(産科學)이
// 붙었다 — 대분류가 '의약학'이라 통과했고, 낱말로는 '산'과 '과학'이 맞았다.
// KCI 주제분야는 772종의 계층이다. 「자연과학 > 화학」으로 좁히면 11만 편이 2,349편이 되고,
// 산과학은 애초에 들어오지 않는다. **낱말 규칙이 떠안던 일을 분류가 대신한다.**
const FIELD_MAP = JSON.parse(await readFile(here("./subject_field_map_2026_09.json"), "utf8")).subjects;
function fieldFits(subject, field) {
  const allow = FIELD_MAP[String(subject || "")];
  if (!allow) return false;                 // 사전에 없는 과목(수학)은 아예 안 붙인다
  const area = String(field || "").trim();
  if (!area) return false;                  // 분야가 없으면 가릴 수가 없다
  return allow.some((one) => area.startsWith(one));
}

// 논문 제목에만 흔한 말. 개념 쪽에서 미리 빼 둔다.
//   「현대의 원자 모형과 전자 배치」 → "산지사찰 사동중정형 **배치**의 **현대**적 변화"
//   「화학 반응에서의 동적 평형」   → "복행 후 항공기 **동적 반응** 및 안정성"
const PAPER_NOISE = new Set(["현대", "배치", "동적", "모형", "특성", "영향", "효과", "개선", "제안", "연구"]);

// 닿았다고 부르는 기준은 **교과목과 같은 것**을 쓴다. 조사를 안 떼고, 학문 접미사만 봐준다.
// 연구 제목에 쓰던 느슨한 규칙(반대쪽 품기)을 여기 쓰면 '광합성'이 "콜레스테롤 **합성**"에 걸린다.
const hits = (text, aim) => [...aim].filter((word) => courseTouches(text, new Set([word])));

const rows = [];
const seen = new Set();
for (const axis of Object.values(axisIndex.axes || {})) {
  const key = `${axis.subject}::${axis.concept}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push(axis);
}
// 낱말 규칙으로 못 거른 것은 손으로 지운다. 책·연구·학과와 같은 방식이다.
const drops = new Map();
for (const one of (JSON.parse(await readFile(here("./fix_kci_paper_2026_09.json"), "utf8")).drops || [])) {
  if (!drops.has(one.concept)) drops.set(one.concept, []);
  drops.get(one.concept).push(one.title.replace(/\s+/g, ""));
}

const spread = buildSpread(axisIndex);
// **여기는 지금까지보다 훨씬 엄해야 한다.** 11만 편에서 낱말 하나로 찾으면 뭐든 걸린다:
//   「급수」        → "중국 4대 피아노 **급수** 시험교재에 수록된 민요 소재 창작 작품 연구"
//   「수열의 극한」   → "**극한** 현상 모델링"
//   「물질 이동」    → "신체제기 가극단의 **이동**과 조선"
// NTIS 때는 그쪽이 관련도로 줄을 세워 상위 10건만 봤다. 여기는 우리가 11만 건을 직접 걸러야 한다.
// 그래서 **개념 낱말이 제목에 둘 이상** 보여야 붙인다. 가리키는 말이 하나뿐인 개념(「급수」)은
// 근거가 너무 얇아 아예 안 붙인다.
const aims = rows.map((axis) => {
  const aim = new Set(pointers(axis.concept, axis.subject).filter((one) => !PAPER_NOISE.has(one)));
  return { axis, key: `${axis.subject}::${axis.concept}`, aim, sharp: new Set([...aim].filter((one) => (spread.get(one) || 1) < 3)) };
}).filter((one) => wantsResearch(one.axis.subject) && one.aim.size >= 2);

let read = 0;
let handDropped = 0;
let usable = 0;
const found = new Map(aims.map((one) => [one.key, []]));
const stream = createInterface({ input: createReadStream(CSV, { encoding: "utf8" }), crlfDelay: Infinity });
let head = null;
for await (const line of stream) {
  if (!line.trim()) continue;
  const parts = cells(line);
  if (!head) { head = parts.map((one) => one.replace(/^\uFEFF/, "").trim()); continue; }
  read += 1;
  const get = (name) => parts[head.indexOf(name)] || "";
  const title = korean(get("논문명(국문)"), get("논문명(외국어)"));
  if (!title) continue;                                   // 한글 제목이 없으면 학생이 읽을 수 없다
  const keywords = korean(get("키워드(국문)"), get("키워드(외국어)"));
  const field = get("주제분야");
  usable += 1;
  const paper = {
    title: title.trim().slice(0, 200),
    author: get("저자").trim(),
    with: get("공동저자").trim(),
    // 학술지명은 한글이 없는 것도 많다("Laboratory Medicine Online"). 없으면 있는 대로 쓴다 —
    // 빈칸으로 두면 참고 자료 줄에 학술지가 사라진다. 실제로 그렇게 나갔다.
    journal: (korean(get("학술지명(국문)"), get("학술지명(외국어)"))
      || get("학술지명(국문)") || get("학술지명(외국어)")).trim(),
    year: get("발행년").trim(),
    volume: get("권").trim(), issue: get("호").trim(),
    from: get("시작페이지").trim(), to: get("끝페이지").trim(),
    field: field.trim(), keywords: keywords.trim(),
  };
  const hay = `${title} ${keywords}`;
  for (const one of aims) {
    if (!fieldFits(one.axis.subject, field)) continue;
    // 제목에 개념 낱말이 **둘 이상** 보여야 한다. 하나로는 11만 건에서 아무거나 걸린다.
    const inTitle = hits(title, one.aim);
    const inKeyword = hits(keywords, one.aim);
    // **키워드는 논문이 스스로 밝힌 주제어다**(99%에 있다). 제목보다 곧은 신호다.
    // 분야로 이미 좁혔으므로, 제목에 둘 또는 '제목 하나 + 키워드 하나'면 받아들인다.
    const both = new Set([...inTitle, ...inKeyword]);
    if (inTitle.length < 2 && !(inTitle.length >= 1 && both.size >= 2)) continue;
    // 그중 하나는 이 개념만의 또렷한 말이어야 한다.
    if (one.sharp.size && ![...both].some((word) => one.sharp.has(word))) continue;
    const bad = drops.get(one.key) || [];
    if (bad.some((head) => paper.title.replace(/\s+/g, "").startsWith(head))) { handDropped += 1; continue; }
    const score = inTitle.length * 3 + inKeyword.length * 2;
    found.get(one.key).push({ ...paper, score });
  }
}

const index = {};
let filled = 0;
for (const one of aims) {
  const list = found.get(one.key) || [];
  if (!list.length) continue;
  list.sort((a, b) => b.score - a.score || a.title.length - b.title.length);
  const seenTitle = new Set();
  const picked = [];
  for (const paper of list) {
    const key = paper.title.replace(/\s+/g, "");
    if (seenTitle.has(key)) continue;
    seenTitle.add(key);
    const { score, ...rest } = paper;   // 키워드는 과제문 맞추기에 쓰므로 남긴다
    picked.push(rest);
    if (picked.length >= 8) break;   // 고르는 일은 런타임에 과제문을 보고 한다
  }
  index[one.key] = picked;
  filled += 1;
}

console.log(`읽은 줄 ${read.toLocaleString()} · 한글 제목이 있는 줄 ${usable.toLocaleString()}`);
console.log(`개념 ${rows.length}개 가운데 ${filled}개에 논문을 붙입니다 (${Math.round(filled / rows.length * 100)}%)\n`);
let shown = 0;
for (const one of aims) {
  const got = index[one.key];
  if (!got) continue;
  shown += 1;
  console.log(`  ${one.key}`);
  for (const paper of got) console.log(`     ${paper.title.slice(0, 62)} — ${paper.journal} ${paper.year}`);
}

if (process.argv.includes("--write")) {
  await writeFile(OUT, JSON.stringify({
    version: "kci-paper-index-v1",
    built_at: new Date().toISOString().slice(0, 10),
    source: "한국연구재단 KCI논문정보 (공공데이터포털 15083283, 2024년 발행분)",
    license: "이용허락범위 제한 없음",
    note: "참고 자료에 서지사항으로 붙는다. 주소는 없다 — 학생이 kci.go.kr 에서 제목으로 찾으면 초록을 로그인 없이 읽을 수 있다. '여기서 무엇을 얻었다'는 쓰지 않는다.",
    concepts: index,
  }, null, 2), "utf8");
  console.log(`\n${OUT.pathname.replace(/^\//, "")}`);
} else {
  console.log("\n(보여 주기만 했습니다. 만들려면 --write 를 붙이세요.)");
}
