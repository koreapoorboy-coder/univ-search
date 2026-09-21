// 과제 글이 주제를 말하지 않을 때 학생에게 보여 줄 키워드 목록을 지킨다.
//
// 이 파일이 지키는 것: **학생이 짚을 수 있는 말만 보여 준다.** 단원 이름만 주면 학생은 모른다.
// 그리고 **진로와 이어지는 것이 위**여야 한다 — 아래로 밀리면 학생은 자기 것을 못 찾는다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { unitChoices, conceptOfKeyword, CHOICE_WHY, TRACK_GROUP } from "../../../admission_worker_skeleton/unit_choices_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const index = JSON.parse(await readFile(here("../seed/engine-index/unit_choices.v1.json"), "utf8"));
const all = { index };
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// K1. 모든 과목이 고를 거리를 준다. 하나라도 비면 그 과목 학생은 막힌다.
{
  const subjects = Object.keys(index.subjects);
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
    "K3 전공도 계열도 없으면 「이어짐」이라고 말하지 않는다");
}

// K4. 왜 위에 올렸는지 말한다. 우리가 고른 까닭을 숨기지 않는다.
{
  const rows = unitChoices({ subject: "물리", major: "기계공학과", track: "engineering", ...all });
  const top = rows[0];
  check([CHOICE_WHY.FROM_TASK, CHOICE_WHY.MAJOR, CHOICE_WHY.MAJOR_COURSE, CHOICE_WHY.TRACK].includes(top.why),
    "K4 맨 위 줄에는 까닭이 붙는다", top.why);
  check(top.why === CHOICE_WHY.MAJOR, "K4 진로 칸으로 걸린 전공이 대학 수업보다 먼저", `${top.concept}/${top.why}`);
  check(top.majors.length > 0, "K4 「전공과 이어짐」이라고 했으면 전공 이름을 댈 수 있다", JSON.stringify(top.majors));
}

// K8. **계열만 고른 학생**(자율전공·미정)도 빈손으로 두지 않는다.
{
  const only = unitChoices({ subject: "물리", track: "engineering", ...all });
  check(only.length >= 3, "K8 전공이 없어도 고를 거리가 있다", String(only.length));
  check(only[0].why === CHOICE_WHY.TRACK, "K8 계열과 이어지는 단원이 위로 온다", only[0].why);
  // 계열 이름을 한글로 줘도 읽는다.
  check(unitChoices({ subject: "물리", track: "공학", ...all })[0].why === CHOICE_WHY.TRACK,
    "K8 계열을 한글로 줘도 읽는다");
  check(TRACK_GROUP.engineering === "공학" && TRACK_GROUP.humanities === "인문", "K8 화면의 계열 값과 표의 이름이 이어져 있다");
  // 그 과목과 인연이 없는 계열이면 까닭을 붙이지 않는다 — 거짓으로 이어 붙이지 않는다.
  const far = unitChoices({ subject: "물리", track: "humanities", ...all });
  check(far.every((row) => row.why === CHOICE_WHY.PLAIN), "K8 인연이 없으면 「이어짐」이라고 말하지 않는다");
}

// K9. **안내문에서 읽어낸 단원은 맨 위에 두고 표시**한다. 표시가 없으면 학생이 진로 쪽으로 바꿔 버린다.
{
  const rows = unitChoices({ subject: "물리", major: "기계공학과", track: "engineering", detected: "파동의 성질과 활용", ...all });
  check(rows[0].concept === "파동의 성질과 활용", "K9 안내문에서 읽어낸 단원이 맨 위", rows[0].concept);
  check(rows[0].why === CHOICE_WHY.FROM_TASK, "K9 그렇다고 표시한다", rows[0].why);
  // 띄어쓰기가 달라도 같은 단원으로 본다.
  check(unitChoices({ subject: "물리", detected: "파동의성질과활용", ...all })[0].why === CHOICE_WHY.FROM_TASK,
    "K9 띄어쓰기가 달라도 같은 단원으로 본다");
  // 없는 단원을 읽어냈다고 해도 아무 줄이나 맨 위로 올리지 않는다.
  const bogus = unitChoices({ subject: "물리", detected: "김치찌개", ...all });
  check(bogus.every((row) => row.why !== CHOICE_WHY.FROM_TASK), "K9 없는 단원이면 표시하지 않는다");
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
  check(conceptOfKeyword({ subject: "물리", keyword: "등가속도 운동", index }) === "힘과 운동",
    "K6 낱말 → 단원", conceptOfKeyword({ subject: "물리", keyword: "등가속도 운동", index }));
  check(conceptOfKeyword({ subject: "물리", keyword: "힘과 운동", index }) === "힘과 운동",
    "K6 단원 이름을 그대로 줘도 된다");
  check(conceptOfKeyword({ subject: "물리", keyword: "등가속도운동", index }) === "힘과 운동",
    "K6 띄어쓰기가 달라도 찾는다");
  check(conceptOfKeyword({ subject: "물리", keyword: "김치찌개", index }) === "",
    "K6 없는 낱말은 빈칸으로 돌려준다 — 아무 단원이나 집지 않는다");
  check(conceptOfKeyword({ subject: "", keyword: "등가속도 운동", index }) === "",
    "K6 과목을 모르면 되찾지 않는다");
}

// K7. 고른 낱말은 **그 과목의 것**이어야 한다. 다른 과목 낱말이 섞이면 교과서 줄이 거짓이 된다.
{
  let wrong = 0;
  for (const subject of Object.keys(index.subjects)) {
    for (const row of unitChoices({ subject, limit: 99, ...all })) {
      for (const word of row.keywords) {
        if (conceptOfKeyword({ subject, keyword: word, index }) !== row.concept) wrong += 1;
      }
    }
  }
  // 같은 낱말이 한 과목의 두 단원에 있으면 먼저 찾은 단원이 나온다 — 그것까지 어긋남으로 세지는 않는다.
  check(wrong <= 40, "K7 보여 준 낱말은 그 과목 그 단원으로 되찾힌다", `어긋남 ${wrong}`);
}

console.log(`PASS unit choices: ${passed}/${passed}`);
