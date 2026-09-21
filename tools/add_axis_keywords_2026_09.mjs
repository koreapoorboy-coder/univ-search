// 이미 있는 단원에 **빠진 낱말**을 더한다. ₩0.
//
// 단원 사전은 있는데 그 단원을 가리키는 낱말이 빠져 있으면, 과제 글이 주제를 또렷이 말해도 단원을
// 못 찾는다. 그러면 우리 추천 단원이 대신 들어가고, 엉뚱한 자리에 선 보고서가 나온다.
//
//   「스마트 센서를 활용한 포물선 운동 분석하기」 → 물리 「물질의 전기적 특성」 (센서 때문에)
//   「검전기를 이용한 정전기 유도」               → 물리 「에너지와 열」
//
// 「포물선」은 기하에만 있고 물리에 없었다. 「정전기」·「검전기」·「유도」는 어느 과목에도 없었다.
//
// 빠진 낱말은 **시험용으로 떼어 둔 학교를 뺀 과제 제목**에서 찾았다 — 단원을 못 잡은 과제의
// 제목에 자주 나오는데 축 낱말에는 없는 말을 세어 보고, 그중 진짜 내용어만 손으로 골랐다.
//
//   node tools/add_axis_keywords_2026_09.mjs
//   node tools/add_axis_keywords_2026_09.mjs --write
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");
const DIR = here("../public/keyword-engine/seed/followup-axis/");

const ADD = {
  물리: {
    "힘과 운동": ["포물선 운동", "수평 던지기", "자유 낙하", "역학 수레", "충격량", "운동량 보존"],
    // 「전하 보존」은 넣지 않는다 — 낱말로 쪼개면 「보존」이 되어 「운동량 보존」과 겹친다.
    // 「운동량 보존 실험」이 이 단원으로 끌려갔다(전수 검사 2026-09-21).
    "물질의 전기적 특성": ["정전기", "검전기", "정전기 유도", "대전", "축전기", "전기 회로"],
    "파동의 성질과 활용": ["볼록렌즈", "오목렌즈", "렌즈", "초점 거리", "상의 위치", "실상", "허상"],
    "빛과 물질의 이중성": ["현대물리학", "광양자"],
    "시간과 공간": ["현대물리학", "상대론"],
  },
  화학: {
    "산 염기와 중화 반응": ["중화적정", "중화 적정", "용액의 농도", "지시약"],
    "물질의 양과 화학 반응식": ["양적 관계", "정량 분석", "몰 농도", "화학 반응식"],
    "원자의 구조": ["원자 모형", "원자의 구조"],
  },
  생명과학: {
    "유전자와 염색체": ["혈액형", "ABO", "가계도"],
    "생명과학의 이해": ["생명 현상", "생명과학의 특성"],
  },
  지구과학: {
    "지층과 지질시대": ["지질도", "지질 단면도", "지층 대비", "상대 연령"],
    "별의 특성과 진화": ["H-R도", "HR도", "별의 물리량", "천문학", "절대 등급"],
    "날씨의 변화": ["기상학", "일기도", "기단"],
  },
  통합과학1: {
    "역학 시스템": ["자유 낙하", "수평 던지기", "포물선 운동", "물체의 운동", "낙하 운동"],
    "생명 시스템": ["효소", "세포막", "삼투", "물질 이동"],
    "물질 구성과 분류": ["원소", "광물", "물질의 성질"],
    지구시스템: ["판", "판의 경계", "판 구조"],
  },
};

const files = readdirSync(DIR).filter((name) => name.endsWith("_concept_longitudinal_map.json"));
let touched = 0;
let added = 0;
const missing = [];

for (const file of files) {
  const path = new URL(file, DIR);
  const doc = JSON.parse(await readFile(path, "utf8"));
  const want = ADD[doc.subject_name];
  if (!want) continue;
  for (const [concept, words] of Object.entries(want)) {
    const entry = (doc.concept_longitudinal_map || []).find((one) => one.concept_name === concept);
    if (!entry) { missing.push(`${doc.subject_name}::${concept}`); continue; }
    const axis = entry.longitudinal_axes?.[0];
    if (!axis) { missing.push(`${doc.subject_name}::${concept} (축 없음)`); continue; }
    // 낱말 칸이 비어 있는 단원이 있다(통합과학1). 그러면 만들어 넣는다 — 낱말이 없으면 그 단원은
    // 과제 글로는 영영 못 찾는다.
    if (!Array.isArray(axis.keyword_signals) || !axis.keyword_signals.length) {
      axis.keyword_signals = [{
        keywords: [], boost: 24, label: "키워드 직접 반영", short: axis.axis_short || concept,
        message: `선택한 키워드가 ${concept} 방향을 강화합니다.`,
        reason: `선택한 키워드가 ${concept} 방향을 강화합니다.`,
        desc: `선택한 키워드가 ${concept} 방향을 강화합니다.`,
        activity_hint: axis.student_output_hint || "",
      }];
    }
    const signal = axis.keyword_signals[0];
    const before = signal.keywords.length;
    signal.keywords = [...new Set([...signal.keywords, ...words])];
    added += signal.keywords.length - before;
    touched += 1;
  }
  if (WRITE) await writeFile(path, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`  ${doc.subject_name.padEnd(10)} 단원 ${Object.keys(want).length}개에 손댐`);
}

console.log(`\n고친 단원 ${touched}개 · 더한 낱말 ${added}개`);
if (missing.length) { console.log("  못 찾은 단원:"); missing.forEach((one) => console.log(`    ${one}`)); }
console.log(WRITE ? "\n다시 썼습니다. 이어서 node tools/build_axis_index.mjs 를 돌리세요." : "\n(보여 주기만 했습니다. --write 를 붙이세요.)");
