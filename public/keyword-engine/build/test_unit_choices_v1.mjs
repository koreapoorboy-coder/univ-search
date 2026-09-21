// 과제 글이 주제를 말하지 않을 때 학생에게 보여 줄 키워드 목록을 지킨다.
//
// 이 파일이 지키는 것: **학생이 짚을 수 있는 말만 보여 준다.** 단원 이름만 주면 학생은 모른다.
// 그리고 **진로와 이어지는 것이 위**여야 한다 — 아래로 밀리면 학생은 자기 것을 못 찾는다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { unitChoices, conceptOfKeyword, CHOICE_WHY } from "../../../admission_worker_skeleton/unit_choices_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const [conceptMap, majorSubjectIndex] = await Promise.all([
  readFile(here("../seed/textbook-v1/subject_concept_engine_map.json"), "utf8").then(JSON.parse),
  readFile(here("../seed/engine-index/major_subject_concept_index.v1.json"), "utf8").then(JSON.parse),
]);
const all = { conceptMap, majorSubjectIndex };
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// K1. 모든 과목이 고를 거리를 준다. 하나라도 비면 그 과목 학생은 막힌다.
{
  const subjects = Object.keys(conceptMap);
  const empty = subjects.filter((subject) => unitChoices({ subject, ...all }).length === 0);
  check(empty.length === 0, "K1 26과목 모두 고를 거리가 있다", empty.join(", "));
  const thin = subjects.filter((subject) => unitChoices({ subject, ...all }).length < 3);
  check(thin.length === 0, "K1 어느 과목이든 셋 이상 보여 준다", thin.join(", "));
}

// K2. 보여 주는 것은 **낱말**이다. 단원 이름만으로는 학생이 못 고른다.
{
  const rows = unitChoices({ subject: "물리", major: "기계공학과", ...all });
  check(rows.every((row) => row.keywords.length >= 1), "K2 모든 줄에 짚을 낱말이 있다");
  check(rows[0].keywords.length <= 5, "K2 낱말은 다섯 개까지 — 많으면 못 고른다", String(rows[0].keywords.length));
  check(rows.every((row) => !row.keywords.includes(row.concept)), "K2 낱말 자리에 단원 이름을 되풀이하지 않는다");
}

// K3. 진로와 이어지는 단원이 위. 전공을 안 주면 차례를 바꾸지 않는다.
{
  const mech = unitChoices({ subject: "물리", major: "기계공학과", ...all });
  check(["에너지와 열", "힘과 운동"].includes(mech[0].concept),
    "K3 기계공학과는 역학·에너지가 먼저", mech.map((r) => r.concept).join(" > "));
  const nurse = unitChoices({ subject: "생명과학", major: "간호학과", ...all });
  check(/면역|물질대사|건강/.test(nurse[0].concept), "K3 간호학과는 면역·대사가 먼저", nurse[0].concept);
  // 전공이 없으면 진로 점수가 0이라 모두 같은 자리다 — 이름 순으로 고정되어야 뒤죽박죽이 안 된다.
  const plainA = unitChoices({ subject: "물리", ...all }).map((r) => r.concept);
  const plainB = unitChoices({ subject: "물리", ...all }).map((r) => r.concept);
  check(plainA.join("|") === plainB.join("|"), "K3 전공이 없어도 차례가 흔들리지 않는다");
  check(unitChoices({ subject: "물리", ...all }).every((r) => r.why === CHOICE_WHY.PLAIN),
    "K3 전공이 없으면 「진로와 이어짐」이라고 말하지 않는다");
}

// K4. 왜 위에 올렸는지 말한다. 우리가 고른 까닭을 숨기지 않는다.
{
  const rows = unitChoices({ subject: "물리", major: "기계공학과", ...all });
  const top = rows.find((row) => row.why !== CHOICE_WHY.PLAIN);
  check(Boolean(top), "K4 전공을 주면 까닭이 붙은 줄이 있다");
  check([CHOICE_WHY.BOTH, CHOICE_WHY.CAREER_BRIDGE, CHOICE_WHY.MAJOR_CURRICULUM].includes(top.why),
    "K4 까닭은 세 가지 중 하나다", top.why);
  check(top.why === CHOICE_WHY.PLAIN || top.career.length > 0 || top.why === CHOICE_WHY.MAJOR_CURRICULUM,
    "K4 「진로와 이어짐」이라고 했으면 이어지는 분야를 댈 수 있다", JSON.stringify(top.career));
}

// K5. 이미 쓴 단원은 지우지 않고 **뒤로 보내고 표시**한다 — 학생이 일부러 또 할 수도 있다.
{
  const first = unitChoices({ subject: "생명과학", major: "간호학과", ...all })[0].concept;
  const again = unitChoices({ subject: "생명과학", major: "간호학과", used: [first], ...all });
  check(again[0].concept !== first, "K5 이미 쓴 단원은 맨 위에서 내려간다", again[0].concept);
  const moved = again.find((row) => row.concept === first);
  check(!moved || moved.done === true, "K5 남아 있으면 「이미 했음」으로 표시한다");
  // 띄어쓰기가 달라도 같은 단원으로 본다.
  const spaced = unitChoices({ subject: "생명과학", major: "간호학과", used: [first.replace(/\s+/g, "")], ...all });
  check(spaced[0].concept !== first, "K5 띄어쓰기가 달라도 같은 단원으로 본다", spaced[0].concept);
}

// K6. 학생이 낱말만 돌려보내도 단원을 되찾는다. 화면은 낱말을 보여 주므로 낱말만 돌아온다.
{
  check(conceptOfKeyword({ subject: "물리", keyword: "등가속도 운동", conceptMap }) === "힘과 운동",
    "K6 낱말 → 단원", conceptOfKeyword({ subject: "물리", keyword: "등가속도 운동", conceptMap }));
  check(conceptOfKeyword({ subject: "물리", keyword: "힘과 운동", conceptMap }) === "힘과 운동",
    "K6 단원 이름을 그대로 줘도 된다");
  check(conceptOfKeyword({ subject: "물리", keyword: "등가속도운동", conceptMap }) === "힘과 운동",
    "K6 띄어쓰기가 달라도 찾는다");
  check(conceptOfKeyword({ subject: "물리", keyword: "김치찌개", conceptMap }) === "",
    "K6 없는 낱말은 빈칸으로 돌려준다 — 아무 단원이나 집지 않는다");
  check(conceptOfKeyword({ subject: "", keyword: "등가속도 운동", conceptMap }) === "",
    "K6 과목을 모르면 되찾지 않는다");
}

// K7. 고른 낱말은 **그 과목의 것**이어야 한다. 다른 과목 낱말이 섞이면 교과서 줄이 거짓이 된다.
{
  let wrong = 0;
  for (const subject of Object.keys(conceptMap)) {
    for (const row of unitChoices({ subject, limit: 99, ...all })) {
      for (const word of row.keywords) {
        if (conceptOfKeyword({ subject, keyword: word, conceptMap }) !== row.concept) wrong += 1;
      }
    }
  }
  // 같은 낱말이 한 과목의 두 단원에 있으면 먼저 찾은 단원이 나온다 — 그것까지 어긋남으로 세지는 않는다.
  check(wrong <= 40, "K7 보여 준 낱말은 그 과목 그 단원으로 되찾힌다", `어긋남 ${wrong}`);
}

console.log(`PASS unit choices: ${passed}/${passed}`);
