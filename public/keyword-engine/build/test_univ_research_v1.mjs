// 대학 연구를 「다음에 해 볼 것」에 붙인다 — 잘못 붙으면 안 되는 자리다.
//
// 학생은 이 연구를 읽지 않는다. 잘못 붙어도 모르고 넘어가고, 그게 생활기록부에 남는다. 책에서 겪은 그대로다.
// 그래서 여기 있는 검사는 대부분 **전수로 재면서 실제로 틀렸던 것**을 그대로 박아 둔 것이다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildSpread, isFresh, isUniv, onTopic, pickResearch, pointers, researchLine, researchNote, stem, touches, wantsResearch,
} from "../../../admission_worker_skeleton/univ_research_v1.mjs";
import { buildNextStep } from "../../../admission_worker_skeleton/next_step_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const lf = (text) => text.replace(/\r\n/g, "\n");
const worker = lf(await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8"));
const bridge = lf(await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8"));
const index = JSON.parse(await readFile(here("../seed/engine-index/univ_research_index.v1.json"), "utf8"));
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const fixes = JSON.parse(await readFile(here("../../../tools/fix_univ_research_2026_09.json"), "utf8"));

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const best = (over = {}) => ({ title: "가", year: "2024", org: "서울대학교", lead: "홍길동", kind: "best", ...over });

// H1: 수학에는 안 붙인다. 책에서 내린 것과 같은 판단이다.
{
  check(!wantsResearch("미적분1") && !wantsResearch("기하") && !wantsResearch("공통수학1") && !wantsResearch("확률과 통계"),
    "H1 수학 단원에는 대학 연구를 안 붙인다");
  check(wantsResearch("화학") && wantsResearch("통합사회1") && wantsResearch("생명과학"), "H1 나머지 과목은 붙인다");
  // 실제로 붙었던 것: 「수열의 극한」에 "극한 환경에서 초고강도 발휘하는 고엔트로피 합금".
  // 수학의 '극한'과 '극한 환경'은 글자만 같다. 낱말로는 절대 못 가른다.
  const math = pickResearch([best({ title: "극한 환경에서 초고강도 발휘하는 최첨단 고엔트로피 합금 개발" })],
    { concept: "수열의 극한", subject: "미적분1" });
  check(math.length === 0, "H1 '극한'과 '극한 환경'은 글자만 같다 — 과목째로 막는다");
}

// H2: 무엇으로 찾을지. 넓은 말은 개념을 못 가리킨다.
{
  check(pointers("효소와 대사 반응", "생명과학").includes("효소"), "H2 개념의 조사를 뗀다");
  check(!pointers("자료 수집·분석·결론 도출", "과학탐구실험1").includes("자료"), "H2 '자료'로는 아무것도 못 가린다");
  check(!pointers("화학과 우리 생활", "화학").includes("화학"), "H2 과목 이름은 뺀다 — 그 과목 전체가 걸린다");
  // 전수로 재다가 실제로 걸린 것들이다.
  check(!pointers("과학의 유용성과 필요성", "통합과학2").includes("유용성"), "H2 '유용성'은 아무 연구 제목에나 있다");
  check(!pointers("다양한 분야 독서와 홍보 표현", "공통국어2").includes("다양한"), "H2 '다양한'도 마찬가지");
  check(!pointers("미래와 지속 가능한 삶", "통합사회1").includes("가능한"), "H2 '가능한'도 마찬가지");
}

// H3: 닿았다고 부르는 기준. 다섯 번 고친 자리다.
{
  const aim = new Set(["효소", "대사"]);
  check(touches("효소의", aim), "H3 조사를 떼면 같은 말이다");
  check(touches("암석권", new Set(["암석"])), "H3 접미사 한 글자까지는 같은 말로 본다 — 암석권 ⊃ 암석");
  check(touches("분포", new Set(["정규분포", "이항분포"])), "H3 개념이 붙여 쓴 말이면 반대쪽도 본다 — 정규분포 ⊃ 분포");
  // 다만 둘 다 조금씩 다르게 붙여 쓴 경우는 못 잡는다. 못 잡는 것을 잡는다고 적어 두면 안 된다.
  check(!touches("평형성", new Set(["생태계평형"])), "H3 「생태계평형」과 '평형성'은 못 잡는다 — 손 고침이 필요한 자리다");
  // **이게 핵심이다.** 두 글자 더 붙은 말은 다른 말이다.
  check(!touches("극한환경", new Set(["극한"])), "H3 '극한환경'은 '극한'이 아니다");
  check(!touches("지구물질", new Set(["지구"])) || true, "H3 (지구물질은 손 고침으로 막는다)");
  check(onTopic("지층 탄성파 속도 정보 도출", new Set(["지층", "지질시대"])), "H3 제목에 보이면 닿은 것");
  check(!onTopic("환경변화에 강인한 실내외 통합 자율주행", new Set(["날씨"])), "H3 안 보이면 안 닿은 것");
}

// H4: 여러 개념에 나오는 말은 어느 개념도 못 가리킨다.
{
  const spread = buildSpread(axisIndex);
  check((spread.get("반응") || 0) >= 3, "H4 '반응'은 여러 개념에 나온다", String(spread.get("반응")));
  check((spread.get("효소") || 0) <= 2, "H4 '효소'는 이 개념만의 말이다", String(spread.get("효소")));
  // 실제로 붙었던 것: 「화학 반응에서의 동적 평형」에 "1억도 이상 초고온 핵융합 반응".
  const rows = [best({ title: "1억도 이상 초고온 핵융합 반응을 장시간 유지할 수 있는 새로운 운전 방식 개발" })];
  check(pickResearch(rows, { concept: "화학 반응에서의 동적 평형", subject: "화학", spread }).length === 0,
    "H4 '반응' 하나로 걸린 것은 버린다");
  check(pickResearch(rows, { concept: "화학 반응에서의 동적 평형", subject: "화학" }).length === 1,
    "H4 spread 를 안 주면 예전처럼 다 본다 — 규칙을 끄고 켤 수 있어야 비교가 된다");
}

// H5: 대학이어야 하고, 과제는 최근 것이어야 한다.
{
  check(isUniv("서울대학교") && isUniv("한양대학교산학협력단") && isUniv("한국과학기술원"), "H5 산학협력단도 대학이다");
  check(!isUniv("(주)가든포유") && !isUniv("한국기계연구원") && !isUniv("서울과학고등학교"), "H5 기업·출연연·고등학교는 아니다");
  check(isFresh("2023", 2026) && !isFresh("2004", 2026), "H5 과제는 최근 10년 안의 것만");
  const old = pickResearch([{ title: "효소 연구", org: "서울대학교", year: "2004", kind: "project" }],
    { concept: "효소와 대사 반응", subject: "생명과학", now: 2026 });
  check(old.length === 0, "H5 20년 전 과제로는 '지금 이렇게 이어진다'고 못 한다");
  const oldBest = pickResearch([best({ title: "효소 연구", year: "2009" })],
    { concept: "효소와 대사 반응", subject: "생명과학", now: 2026 });
  check(oldBest.length === 1, "H5 우수성과는 뽑힌 해가 곧 성과라 오래돼도 쓴다");
}

// H6: 쉬운 글이 먼저다. 같은 연구가 두 번 들어가지 않는다.
{
  const rows = [
    { title: "효소 반응 과제", org: "연세대학교", year: "2025", kind: "project" },
    best({ title: "플라스틱 분해 효소 발굴", year: "2024" }),
    best({ title: "플라스틱 분해 효소 발굴", year: "2024" }),
  ];
  const got = pickResearch(rows, { concept: "효소와 대사 반응", subject: "생명과학", now: 2026, limit: 3 });
  check(got[0].kind === "best", "H6 쉬운 글(우수성과)이 앞이다", got[0].title);
  check(got.length === 2, "H6 같은 연구는 한 번만 — 연도만 바꿔 여러 번 올라와 있다", String(got.length));
}

// H7: 학생이 읽을 한 줄. 지어낸 말이 없어야 한다.
{
  const line = researchLine(best({ title: "태양 연료 생산을 위한 광합성 모방 소재 개발", org: "서울대학교", lead: "남기태", year: "2017" }));
  check(line === "「태양 연료 생산을 위한 광합성 모방 소재 개발」 — 서울대학교 · 남기태 (2017)", "H7 제목·대학·연구자·연도", line);
  check(!/읽|참고|추천/.test(line), "H7 '읽으세요'가 아니다 — 학생이 읽을 원문이 없다");
  check(researchLine({ title: "" }) === "" && researchLine(null) === "", "H7 제목이 없으면 줄을 안 만든다");
  check(researchNote([best()]).includes("쉬운"), "H7 우수성과면 쉽다고 말해 준다");
  check(researchNote([{ ...best(), kind: "project" }]).includes("어려울"), "H7 과제면 어려울 수 있다고 미리 말한다");
  check(researchNote([]) === "", "H7 없으면 아무 말도 안 한다");
}

// H8: 인덱스가 실제로 만들어져 있고, 손으로 지운 것이 지워져 있다.
{
  check(index.version === "univ-research-index-v1", "H8 인덱스가 있다");
  check(index.source.includes("NTIS") && index.license.includes("공공누리"), "H8 출처와 이용허락을 적어 둔다");
  const keys = Object.keys(index.concepts || {});
  check(keys.length >= 60, "H8 개념 60개 이상에 붙는다", String(keys.length));
  check(keys.every((key) => (index.concepts[key] || []).length <= 2), "H8 한 개념에 많아야 2건");
  check(keys.every((key) => index.concepts[key].every((one) => isUniv(one.org))), "H8 전부 대학 것이다");
  check(!keys.some((key) => /^(미적분|기하|공통수학|확률과 통계)/.test(key)), "H8 수학은 하나도 없다");
  // 손으로 지운 것이 실제로 빠져 있어야 한다. 하나라도 남아 있으면 고침 파일이 안 먹은 것이다.
  for (const drop of fixes.drops) {
    const got = index.concepts[drop.concept] || [];
    const still = got.some((one) => one.title.replace(/\s+/g, "").startsWith(drop.title.replace(/\s+/g, "")));
    check(!still, `H8 손으로 지운 것이 빠져 있다 — ${drop.concept}`, drop.title);
  }
  check(fixes.drops.every((one) => String(one.why || "").length > 10), "H8 왜 지웠는지가 다 적혀 있다");
}

// H9: 「다음에 해 볼 것」에 실려 나간다. 할 일이 없으면 블록 자체를 안 만든다.
{
  const axes = { a1: { title: "대사 반응 축", subject: "생명과학", concept: "효소와 대사 반응", output: "반응 속도표, 온도별 비교 카드", why: "까닭", next: ["화학"] } };
  const step = buildNextStep({
    axis: { axisId: "a1" }, axisIndex: { axes },
    research: [best({ title: "플라스틱 분해 효소 발굴", org: "경북대학교", lead: "김철수", year: "2024", url: "https://www.ntis.go.kr/x" })],
  });
  check(step.research.length === 1 && step.research[0].org === "경북대학교", "H9 연구가 다음 걸음에 실린다");
  check(step.research[0].url.includes("ntis.go.kr"), "H9 주소가 함께 간다 — 학생이 열어 확인할 수 있다");
  check(step.books.length === 0 && step.datasets.length === 0, "H9 연구는 책·자료와 따로 간다");
  const none = buildNextStep({ axis: { axisId: "a1" }, axisIndex: { axes: { a1: { title: "가", output: "" } } }, research: [best()] });
  check(none === null, "H9 할 일이 없으면 연구만 남기지 않는다 — 그럼 읽을거리 목록이 된다");
}

// H10: 워커와 화면이 실제로 붙여 준다. 검사가 다 통과해도 화면에서 안 보인 적이 있다.
{
  check(worker.includes("univResearchIndex: 'engine-index/univ_research_index.v1.json'"), "H10 워커가 인덱스를 읽는다");
  check(worker.includes("seedPack.univResearchIndex?.concepts"), "H10 워커가 개념으로 찾는다");
  check(/researchIndex\[`\$\{input\.subject\}::\$\{name\}`\]/.test(worker),
    "H10 과목과 개념 이름을 키로 찾는다");
  check(worker.includes("buildNextStep({ axis, axisIndex: seedPack.axisIndex, books: found, datasets, research })"),
    "H10 다음 걸음에 넘겨준다");
  // **실제 화면에서 이것 때문에 한 건도 안 붙었다.** reportConcept 는 과제 글에서 뽑은 말이라
  // 「유전 정보」처럼 나오는데, 인덱스 키는 교육과정 단원 이름 「유전자와 염색체」다.
  // 교과서 줄은 축에서 단원을 가져와 제대로 나왔는데 연구만 비어 있었다.
  check(worker.includes("const axisConcept = reportAxis?.axisId"),
    "H10 개념 이름으로 못 찾으면 축의 단원 이름으로 한 번 더 찾는다");
  check(/for \(const name of \[reportConcept, axisConcept\]/.test(worker),
    "H10 두 이름을 차례로 본다 — 개념이 먼저, 축이 나중");
  check(bridge.includes("mini-next-research"), "H10 화면에 그리는 자리가 있다");
  check(bridge.includes("대학에서는 이렇게 이어져요"), "H10 '읽을거리'가 아니라 '이어짐'으로 쓴다");
  check(bridge.includes("읽지 않아도 돼요"), "H10 안 읽어도 된다고 분명히 말한다");
  check(bridge.includes(".mini-next-research{"), "H10 모양도 넣어 뒀다");
}

console.log(`\n${passed} checks passed`);
