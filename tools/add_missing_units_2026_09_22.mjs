// 단원 사전에 **빠져 있던 단원 세 개**를 더한다. ₩0.
//
// 운영 검사 2026-09-22(7번, 공통수학2). 과제 글이 「자료를 함수로 나타내고 그래프를 그려…」라고
// 또렷이 말하는데, 학생에게 보여 준 단원 후보는 도형의 이동·원의 방정식·평면좌표 셋뿐이었다.
// 「함수와 그래프」가 목록에 아예 없었다.
//
// 까닭은 사전이 두 벌이기 때문이다. 축 사전(followup-axis)에는 다섯 단원이 다 있는데, 단원 목록을
// 만드는 쪽(textbook-v1/subject_concept_engine_map.json)에는 셋만 있었다. 두 벌을 맞춰 보니
// 엔진 전체에서 빠진 단원은 **정확히 셋**이었다:
//
//   공통수학2 · 집합과 명제
//   공통수학2 · 함수와 그래프
//   대수      · 삼각함수
//
// 셋 다 학교에서 크게 다루는 단원이다. 여기 적는 낱말은 축 사전에 이미 있던 것과 교과서 차례에서
// 가져왔다 — 새로 지어낸 것이 아니다.
//
//   node tools/add_missing_units_2026_09_22.mjs
//   node tools/add_missing_units_2026_09_22.mjs --write
import { readFile, writeFile } from "node:fs/promises";

const WRITE = process.argv.includes("--write");
const MAP = new URL("../public/keyword-engine/seed/textbook-v1/subject_concept_engine_map.json", import.meta.url);

const ADD = {
  공통수학2: {
    "집합과 명제": {
      unit: "집합과 명제",
      lesson_focus: "집합의 연산과 명제의 참·거짓을 기호로 나타내고, 조건과 결론의 관계를 따진다.",
      core_concepts: ["집합", "집합의 연산", "명제", "조건", "필요충분조건"],
      micro_keywords: ["집합", "부분집합", "합집합", "교집합", "여집합", "명제", "역과 대우", "필요충분조건"],
      student_topics: [
        "겹치는 것과 겹치지 않는 것을 나누면 무엇이 더 잘 보일까?",
        "「~이면 ~이다」가 참인지 아닌지는 무엇으로 가릴까?",
        "조건을 바꿔 말하면 왜 참·거짓이 달라질까?",
      ],
      linked_activity_types: ["분류정리형", "논증형", "규칙발견형"],
      linked_career_bridge: ["자료 분류", "조건 설계", "논리 회로", "규칙 기반 판단", "데이터 조건 검색"],
      horizontal_links: [
        { subject: "정보", concept: "조건문과 논리 연산",
          evaluation_focus: "조건과 결론의 관계를 논리 연산으로 바꾸어 설명할 수 있는가",
          inquiry_extension: "조건을 표로 정리해 참·거짓을 모두 따져 보기" },
        { subject: "통합사회1", concept: "개념의 범위와 분류",
          evaluation_focus: "사회 현상을 나누는 기준을 집합의 말로 설명할 수 있는가",
          inquiry_extension: "같은 자료를 기준을 바꿔 두 번 나누어 보기" },
      ],
    },
    "함수와 그래프": {
      unit: "함수와 그래프",
      lesson_focus: "대응 관계를 함수로 나타내고, 그래프의 모양·이동·교점으로 문제를 해석한다.",
      core_concepts: ["함수", "정의역과 치역", "합성함수", "역함수", "유리함수와 무리함수"],
      micro_keywords: ["함수", "그래프", "정의역", "치역", "합성함수", "역함수", "일대일대응", "그래프의 이동", "교점"],
      student_topics: [
        "생활 속 자료를 함수로 나타내면 무엇을 더 말할 수 있을까?",
        "그래프가 옮겨 가면 식의 어디가 바뀔까?",
        "두 그래프가 만나는 점은 문제에서 무엇을 뜻할까?",
      ],
      linked_activity_types: ["모델링형", "시각화형", "문제해결형"],
      linked_career_bridge: ["자료 모델링", "추세 예측", "요금제 비교", "설계 곡선", "알고리즘 입력과 출력"],
      horizontal_links: [
        { subject: "정보", concept: "입력과 출력의 대응",
          evaluation_focus: "입력과 출력의 관계를 함수로 설명할 수 있는가",
          inquiry_extension: "같은 자료를 표·식·그래프 세 가지로 옮겨 보기" },
        { subject: "통합과학1", concept: "양 사이의 관계 그래프",
          evaluation_focus: "두 양의 관계를 그래프의 모양으로 해석할 수 있는가",
          inquiry_extension: "측정한 값을 그래프로 그려 어떤 함수에 가까운지 견주기" },
      ],
    },
  },
  대수: {
    삼각함수: {
      unit: "삼각함수",
      lesson_focus: "각을 회전으로 보고 사인·코사인·탄젠트의 값과 그래프의 주기성을 다룬다.",
      core_concepts: ["일반각과 호도법", "삼각함수", "삼각함수의 그래프", "주기", "삼각함수의 활용"],
      micro_keywords: ["호도법", "사인", "코사인", "탄젠트", "주기", "진폭", "삼각함수의 그래프", "사인법칙", "코사인법칙"],
      student_topics: [
        "되풀이되는 현상을 하나의 식으로 나타낼 수 있을까?",
        "주기와 진폭이 바뀌면 그래프의 무엇이 달라질까?",
        "직접 잴 수 없는 거리를 각으로 구할 수 있을까?",
      ],
      linked_activity_types: ["모델링형", "측정해석형", "시각화형"],
      linked_career_bridge: ["파동 해석", "신호 처리", "구조 설계", "측량", "주기 현상 예측"],
      horizontal_links: [
        { subject: "물리", concept: "파동의 성질과 활용",
          evaluation_focus: "되풀이되는 현상을 주기와 진폭으로 설명할 수 있는가",
          inquiry_extension: "소리나 빛의 되풀이되는 값을 재어 그래프로 견주기" },
        { subject: "지구과학", concept: "태양계 천체의 관측과 운동",
          evaluation_focus: "되풀이되는 천체 현상을 주기로 설명할 수 있는가",
          inquiry_extension: "관측 자료의 되풀이 간격을 재어 주기를 구해 보기" },
      ],
    },
  },
};

const doc = JSON.parse(await readFile(MAP, "utf8"));
let added = 0;
const already = [];
for (const [subject, units] of Object.entries(ADD)) {
  const body = doc[subject];
  if (!body) { console.log(`  ${subject}: 과목이 없다 — 건너뜀`); continue; }
  body.concepts = body.concepts || {};
  for (const [name, entry] of Object.entries(units)) {
    if (body.concepts[name]) { already.push(`${subject}::${name}`); continue; }
    body.concepts[name] = entry;
    added += 1;
    console.log(`  + ${subject} · ${name} (낱말 ${entry.micro_keywords.length}개)`);
  }
}

console.log(`\n더한 단원 ${added}개`);
if (already.length) console.log(`  이미 있던 것: ${already.join(", ")}`);
if (WRITE) {
  await writeFile(MAP, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log("\n다시 썼습니다. 이어서 node tools/build_unit_choices_index.mjs --write 를 돌리세요.");
} else {
  console.log("\n(보여 주기만 했습니다. --write 를 붙이세요.)");
}
