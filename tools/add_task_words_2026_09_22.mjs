// 안내문에 실제로 쓰이는 말을 단원에 더한다. ₩0. 지어낸 말은 없다.
//
// 축 사전의 낱말을 옮겨 붙여 26.7% → 41.2% 가 됐다(안내문에서 단원을 찾아내는 비율).
// 남은 것을 눈으로 읽어 보니, 못 찾는 과제는 두 갈래였다.
//
//   ① 안내문이 아예 단원을 안 말한다 — 「자유 주제로 탐구 보고서를 작성한다」, 「프로젝트」.
//      이건 채워도 못 찾는다. 찾았다고 말하면 거짓말이 된다.
//   ② 말하는데 우리 사전에 그 말이 없다 — 「고려 사료 탐구」, 「프로그래밍 실습」, 「빅데이터 분석」,
//      「문화유산 홍보물」, 「역사 답사 계획서」.
//
// 여기서는 ②만 채운다. 아래 낱말은 모두 **실제 수행평가 안내문에서 읽은 말**이다.
//
//   node tools/add_task_words_2026_09_22.mjs
//   node tools/add_task_words_2026_09_22.mjs --write
import { readFile, writeFile } from "node:fs/promises";

const WRITE = process.argv.includes("--write");
const MAP = new URL("../public/keyword-engine/seed/textbook-v1/subject_concept_engine_map.json", import.meta.url);

const ADD = {
  정보: {
    "알고리즘 설계와 분석": ["알고리즘", "순서도", "정렬", "탐색", "시간 복잡도", "문제 분해"],
    "프로그래밍과 자동화": ["프로그래밍", "프로그램 작성", "파이썬", "코딩", "실습", "명령어", "디버깅", "자동화"],
    "자료와 정보의 분석": ["빅데이터", "데이터 분석", "데이터 시각화", "공공데이터", "표와 그래프"],
    "지식·정보 사회와 정보 문화": ["디지털 문화", "정보 윤리", "개인정보", "디지털 기술", "인공지능 사회"],
    "컴퓨팅 시스템과 네트워크": ["컴퓨팅 시스템", "네트워크", "하드웨어", "운영체제", "피지컬 컴퓨팅"],
  },
  한국사: {
    "역사 탐구 방법과 사료 읽기": ["사료 탐구", "사료 분석", "사료 해석", "역사 탐구", "답사", "답사 계획", "역사 신문"],
    "문화유산과 역사 기억": ["문화유산", "유네스코", "홍보물", "기억과 기념", "역사 기억"],
    "고려의 통치 체제와 사회": ["고려", "고려 시대", "무신 정권", "귀족 사회"],
    "조선의 건국과 통치 체제": ["조선", "조선 전기", "훈민정음", "성리학"],
    "조선 후기 사회와 경제 변동": ["조선 후기", "실학", "상품 화폐 경제", "신분제 변동"],
    "개항과 근대 국가 수립 운동": ["개항", "근대", "갑오개혁", "독립협회", "대한제국"],
    "일제의 식민 지배와 민족 운동": ["일제", "식민 지배", "독립운동", "3·1 운동", "임시정부"],
    "민주주의의 발전": ["민주화", "4·19", "5·18", "6월 민주 항쟁", "민주주의"],
  },
  화학: {
    "화학과 우리 생활": ["화학의 유용성", "생활 속 화학", "화학과 진로", "현대 화학", "화학 독서"],
    "화학 반응에서의 동적 평형": ["동적 평형", "가역 반응", "평형 상수", "르샤틀리에"],
    "화학 반응과 열의 출입": ["발열 반응", "흡열 반응", "열의 출입", "반응열"],
    "탄소 화합물의 유용성": ["탄소 화합물", "메테인", "에탄올", "아세트산", "작용기"],
  },
  생명과학: {
    "생명과학의 이해": ["생명 현상", "생명과학의 특성", "생명과학과 진로", "융합 탐구"],
    "생태계의 물질 순환과 상호 작용": ["생태계", "먹이 사슬", "물질 순환", "에너지 흐름", "개체군", "군집"],
    "진화와 생물 다양성": ["진화", "자연 선택", "생물 다양성", "종 분화"],
  },
  대수: {
    "지수함수와 로그함수의 활용": ["지수함수 활용", "로그함수 활용", "실생활 모델링", "복리", "반감기"],
    "수열의 합": ["수열의 합", "시그마", "계차수열"],
    "등차수열과 등비수열": ["등차수열", "등비수열", "일반항", "점화식"],
  },
};

const doc = JSON.parse(await readFile(MAP, "utf8"));
let added = 0;
let touched = 0;
const missing = [];

for (const [subject, units] of Object.entries(ADD)) {
  const body = doc[subject];
  if (!body) { missing.push(subject); continue; }
  for (const [name, words] of Object.entries(units)) {
    const entry = (body.concepts || {})[name];
    if (!entry) { missing.push(`${subject}::${name}`); continue; }
    const before = (entry.micro_keywords || []).length;
    entry.micro_keywords = [...new Set([...(entry.micro_keywords || []), ...words])];
    const gain = entry.micro_keywords.length - before;
    if (gain) { added += gain; touched += 1; }
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
