// 서울대 연구성과 → 개념별 인덱스. ₩0 (꼬리표는 classify_snu_highlights.mjs 가 이미 붙여 두었다).
//
// 차례: sync_snu_highlights(달마다, ₩0) → classify_snu_highlights(새 글만, 돈) → 이 파일 → Pages 배포.
//
// 넣는 것: 살아 있고(alive), 2019년 이후이고, 꼬리표가 붙은 글.
// 넣는 자리: 글이 이어진 개념마다. 다만 GPT 가 **둘째·셋째로 고른 개념은 넓게 잡힌 것이 섞여 있다**
// (시험 40건에서 광반응 촉매를 「태양 에너지의 생성과 전환」에 이었다). 그래서
//   · 첫째 개념     → 넣는다
//   · 둘째·셋째 개념 → 고등학생이 읽을 만할 때(쉬움·보통)만 넣는다
// 공개 인덱스에는 제목·학부 교수팀·날짜·주소·꼬리표만 싣는다. 요약과 본문은 싣지 않는다(대학 글이다).
//
//   node tools/build_snu_research_index.mjs           — 보여 주기만
//   node tools/build_snu_research_index.mjs --write   — 만든다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const board = JSON.parse(await readFile(here("../public/keyword-engine/build/.cache_snu_board.json"), "utf8"));
const tags = JSON.parse(await readFile(here("../public/keyword-engine/build/.cache_snu_tags.json"), "utf8"));
const OUT = here("../public/keyword-engine/seed/engine-index/snu_research_index.v1.json");
const SINCE = "2019";
const PER_CONCEPT = 10;
const EASY = { 쉬움: 0, 보통: 1, 어려움: 2 };

const concepts = {};
let used = 0;
let skippedWide = 0;
for (const post of Object.values(board.posts)) {
  const tag = tags[post.id];
  if (!post.alive || !tag || post.date < SINCE || !tag.concepts?.length) continue;
  used += 1;
  tag.concepts.forEach((name, at) => {
    const primary = at === 0;
    if (!primary && tag.level === "어려움") { skippedWide += 1; return; }
    (concepts[name] ||= []).push({
      id: post.id, title: post.title, team: post.team, date: post.date, url: post.url,
      kind: tag.kind, level: tag.level, primary,
    });
  });
}
for (const name of Object.keys(concepts)) {
  concepts[name].sort((a, b) => (b.primary - a.primary) || (EASY[a.level] - EASY[b.level]) || b.date.localeCompare(a.date));
  concepts[name] = concepts[name].slice(0, PER_CONCEPT);
}

const names = Object.keys(concepts).sort();
console.log(`글 ${used}건 → 개념 ${names.length}개에 이어짐 (넓게 잡힌 둘째·셋째 중 어려운 것 ${skippedWide}건 뺌)`);
for (const name of names) {
  const list = concepts[name];
  console.log(`  ${name.padEnd(34)} ${list.length}건  예) ${list[0].title.slice(0, 40)} [${list[0].level}]`);
}

if (process.argv.includes("--write")) {
  await writeFile(OUT, JSON.stringify({
    version: "snu-research-index-v1",
    built_at: new Date().toISOString().slice(0, 10),
    source: "서울대학교 연구성과 https://www.snu.ac.kr/research/highlights",
    checked: board.checked,
    note: "참고 자료에 웹 자료로 붙는다(univ_web_v1.mjs). 넣기 직전에 주소를 열어 보고, 접속일을 적는다. 제목·학부 교수팀·날짜·주소만 싣는다.",
    concepts,
  }), "utf8");
  console.log(`\n${OUT.pathname.replace(/^\//, "")}`);
}
