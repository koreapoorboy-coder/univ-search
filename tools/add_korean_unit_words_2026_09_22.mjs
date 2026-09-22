// 국어 단원에 **학생 안내문에 실제로 쓰이는 말**을 더한다. ₩0.
//
// 운영 검사 2026-09-22(국어 3회차). 단원 사전은 이미 있었는데, 단원을 가리키는 낱말이 교과서 용어
// 쪽으로만 치우쳐 있어서 안내문과 안 맞았다.
//
//   「현대 소설 한 편을 읽고 … 감상문을 쓰시오」  → 「서사·극 갈래」가 셋째 줄로 밀림
//   「매체 자료 … 표현 전략 … 수용자」            → 「매체 비평과 비판적 수용」이 넷째(끝) 줄로 밀림
//
// 사전에 「소설·감상문」, 「매체·광고·뉴스·표현 전략·수용자」가 없었기 때문이다. 선생님은 교과서
// 용어(복합양식성)가 아니라 학생 말(광고, 뉴스, 표현 전략)로 안내문을 쓴다.
//
// 더하는 낱말은 **실제 안내문에 쓰이는 말**만 고른다. 지어낸 말은 넣지 않는다.
//
//   node tools/add_korean_unit_words_2026_09_22.mjs
//   node tools/add_korean_unit_words_2026_09_22.mjs --write
import { readFile, writeFile } from "node:fs/promises";

const WRITE = process.argv.includes("--write");
const MAP = new URL("../public/keyword-engine/seed/textbook-v1/subject_concept_engine_map.json", import.meta.url);

const ADD = {
  공통국어1: {
    "서사·극 갈래와 이야기 구성": ["소설", "감상문", "심리 변화", "인물의 선택", "희곡"],
    "서정 갈래와 시적 표현": ["시", "시 감상", "화자의 정서"],
    "교술 갈래와 성찰적 표현": ["수필", "기행문", "성찰 글쓰기"],
    "비판적 읽기와 토론": ["서평", "비평문", "논설문", "기사", "칼럼"],
    "문학·독서와 주체적 수용": ["독서", "독후감", "작품 감상", "도서"],
    "사회적 쟁점 글쓰기와 문장 구성": ["논술문", "찬반", "쟁점 토론"],
  },
  공통국어2: {
    "매체 비평과 비판적 수용": ["매체", "매체 자료", "광고", "뉴스", "표현 전략", "수용자", "카드뉴스", "영상"],
    "다양한 분야 독서와 홍보 표현": ["서평", "독후 활동", "독서 기록"],
    "공동 보고서 글쓰기와 자료 활용": ["보고서", "모둠", "조사 보고서"],
  },
};

const doc = JSON.parse(await readFile(MAP, "utf8"));
let touched = 0;
let added = 0;
const missing = [];

for (const [subject, units] of Object.entries(ADD)) {
  const body = doc[subject];
  if (!body) { missing.push(subject); continue; }
  for (const [name, words] of Object.entries(units)) {
    if (!words.length) continue;
    const entry = body.concepts?.[name];
    if (!entry) { missing.push(`${subject}::${name}`); continue; }
    const before = (entry.micro_keywords || []).length;
    // **지우지 않고 더하기만** 한다. 원래 있던 교과서 용어는 그대로 둔다.
    entry.micro_keywords = [...new Set([...(entry.micro_keywords || []), ...words])];
    added += entry.micro_keywords.length - before;
    touched += 1;
    console.log(`  ${subject} · ${name} : ${before} → ${entry.micro_keywords.length}`);
  }
}

console.log(`\n손댄 단원 ${touched}개 · 더한 낱말 ${added}개`);
if (missing.length) console.log(`  못 찾음: ${missing.join(", ")}`);
if (WRITE) {
  await writeFile(MAP, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log("\n다시 썼습니다. 이어서 node tools/build_unit_choices_index.mjs --write 를 돌리세요.");
} else {
  console.log("\n(보여 주기만 했습니다. --write 를 붙이세요.)");
}
