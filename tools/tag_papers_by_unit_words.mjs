// 새로 넣은 과목(영어·한국사)의 논문에 **단원 꼬리표**를 낱말로 단다. ₩0.
//
// 꼬리표는 원래 GPT 가 "이 논문이 이 단원 탐구의 근거가 되는가"를 읽고 달았다(kci_paper_index). 그런데
// 영어·한국사 단원은 2026-09-20 에 새로 넣었으므로 그 과목 논문에는 우리 단원을 가리키는 꼬리표가 하나도
// 없다 — 그래서 재료가 한 편도 안 간다.
//
// GPT 를 다시 돌리는 대신, **단원마다 그 단원만 쓰는 낱말**을 손으로 정해 제목·키워드에 있는지 본다.
// 흔한 낱말(주제·인물·평가·문화·분석)은 일부러 뺀다 — 그런 낱말로 달면 아무 논문이나 붙는다.
// 붙은 뒤에도 런타임은 학생 글의 낱말이 제목에 걸리는지 한 번 더 보고, 쓸지 말지는 AI 가 고른다.
//
//   node tools/tag_papers_by_unit_words.mjs           — 몇 편이 붙는지만 보여 준다
//   node tools/tag_papers_by_unit_words.mjs --write   — 실제로 단다
import { readFile, writeFile } from "node:fs/promises";

const here = (name) => new URL(name, import.meta.url);
const WRITE = process.argv.includes("--write");

// 단원 → 그 단원만 쓰는 낱말. 하나만 걸려도 꼬리표를 단다(낱말 자체가 좁다).
const WORDS = {
  영어: {
    "글의 주제와 요지 파악": ["주제 파악", "요지", "읽기 이해", "독해 이해", "요약하기", "summarization"],
    "세부 정보와 추론": ["읽기 전략", "독해 전략", "추론 능력", "reading comprehension", "읽기 능력"],
    "문단 쓰기와 에세이 구성": ["영작", "영어 쓰기", "에세이", "writing", "쓰기 지도", "작문"],
    "발표와 토론": ["영어 발표", "영어 토론", "말하기", "스피킹", "speaking", "발표 불안"],
    "어휘와 어법": ["어휘 학습", "영어 어휘", "어휘 지도", "문법 교육", "grammar", "vocabulary"],
    "영어권 문화 이해와 비교": ["문화 간", "상호문화", "영어권", "문화 교육", "intercultural"],
    "영미 문학 읽기와 감상": ["영미 문학", "영문학", "영어 소설", "원서", "literature", "셰익스피어"],
  },
  한국사: {
    "고대 국가의 형성과 발전": ["고구려", "백제", "신라", "발해", "가야", "고대사"],
    "고려의 통치 체제와 사회": ["고려", "무신", "몽골", "거란"],
    "조선의 건국과 통치 체제": ["조선 전기", "훈민정음", "경국대전", "성리학"],
    "조선 후기 사회와 경제 변동": ["조선 후기", "실학", "대동법", "장시", "서민 문화"],
    "개항과 근대 국가 수립 운동": ["개항", "갑오개혁", "동학", "독립협회", "대한제국", "의병"],
    "일제의 식민 지배와 민족 운동": ["일제", "식민", "3·1", "임시정부", "독립운동", "강점기"],
    "대한민국 정부 수립과 6·25 전쟁": ["6·25", "한국전쟁", "한국 전쟁", "분단", "정부 수립", "미군정"],
    "민주주의의 발전": ["4·19", "5·18", "민주화", "유신", "6월 민주"],
    "경제 성장과 사회 변화": ["경제 개발", "산업화", "새마을", "고도성장"],
    "평화 통일과 역사 갈등": ["통일 교육", "남북", "독도", "동북공정", "위안부", "역사 갈등"],
    "역사 탐구 방법과 사료 읽기": ["사료", "역사 교육", "역사교육", "역사 수업", "교과서 서술", "역사 인식"],
    "역사 인물과 사건의 평가": ["인물 학습", "역사 인물", "역사적 평가", "인물 탐구"],
    "문화유산과 역사 기억": ["문화재", "문화유산", "유네스코", "기억 문화", "기념관", "박물관 교육"],
  },
};

for (const [subject, units] of Object.entries(WORDS)) {
  const file = here(`../public/keyword-engine/seed/paper-route/${subject}.v1.json`);
  const pack = JSON.parse(await readFile(file, "utf8"));
  const list = Array.isArray(pack.units) ? [...pack.units] : [];
  const indexOfUnit = (name) => {
    const key = `${subject}::${name}`;
    const at = list.indexOf(key);
    if (at >= 0) return at;
    list.push(key);
    return list.length - 1;
  };
  let added = 0;
  const perUnit = {};
  for (const row of pack.rows || []) {
    const text = `${row[0] || ""} ${row[10] || ""}`;
    const hit = [];
    for (const [unit, words] of Object.entries(units)) {
      if (words.some((word) => text.includes(word))) hit.push(indexOfUnit(unit));
    }
    if (!hit.length) continue;
    const before = Array.isArray(row[8]) ? row[8] : [];
    const next = [...new Set([...before, ...hit])];
    if (next.length !== before.length) { added += 1; row[8] = next; }
    hit.forEach((at) => { perUnit[list[at]] = (perUnit[list[at]] || 0) + 1; });
  }
  pack.units = list;
  pack.note = `${pack.note || ""} 영어·한국사 단원 꼬리표는 tools/tag_papers_by_unit_words.mjs 가 낱말로 달았다(2026-09-20).`.trim();
  console.log(`${subject} — 꼬리표를 새로 단 논문 ${added}편 / 전체 ${(pack.rows || []).length}편`);
  Object.entries(perUnit).sort((a, b) => b[1] - a[1]).forEach(([unit, count]) => console.log(`   ${String(count).padStart(4)}  ${unit}`));
  if (WRITE) await writeFile(file, `${JSON.stringify(pack)}\n`, "utf8");
}
console.log(WRITE ? "다시 썼습니다." : "(보여 주기만 했습니다. 달려면 --write 를 붙이세요.)");
