// 주제 재료 — ingredients_v1.mjs. 보고서는 조합이다: 교과 단원 + 실제 연구(논문·대학 연구 소개).
//
// 사용자 결정(2026-09-18): 논문은 보고서 끝에 자동으로 붙는 목록이 아니라 **주제를 잡을 때의 재료**다.
// AI가 설계서를 쓰며 실제로 쓴 재료만 참고 자료가 된다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ingredientPromptLines, inspirationCitations, inspirationGuide, inspirationOf, normalizeInspiration, pickIngredients, usedIngredients }
  from "../../../admission_worker_skeleton/ingredients_v1.mjs";
import { finalizeStageOutput, stageSchemaProperties, STAGE, COLLECTION } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

const worker = (await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const bridge = (await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const table = ["생명과학::생태계의 물질 순환과 상호 작용", "생명과학::유전자와 염색체"];
// [제목, 저자, 연도, 학술지, 권, 호, 쪽, 중심, 단원 번호, 난이도, 키워드]
const row = (title, who, year, unit, level = "m", keywords = "") => [title, who, year, "학회지", "1", "2", "3-9", 1, unit === null ? null : [unit], level, keywords];
const rows = [
  row("도시 녹지의 식물 군집 구조와 종 다양성", "김", "2023", 0, "e", "방형구, 중요치, 종 다양성"),
  row("하천 수변 식생의 군집 분석", "이", "2022", 0, "m", "군집, 피도"),
  row("초지 생태계의 탄소 순환", "박", "2021", 0, "m", "탄소"),
  row("유전자 발현 조절 기작", "최", "2024", 1, "m", "유전자"),        // 다른 단원
  row("식물 군집의 고해상도 원격 탐사", "정", "2024", 0, "h", "원격탐사"),  // 어려움
  row("꼬리표 없는 군집 논문", "한", "2024", null, "", ""),              // 꼬리표 없음
];
const snu = [
  { title: "숲 토양 미생물 군집의 다양성", team: "생명과학부 A 교수팀", date: "2025-01-02", url: "https://www.snu.ac.kr/research/highlights?md=v&bbsidx=1" },
  { title: "전혀 다른 글", team: "B", date: "2024-01-01", url: "https://www.snu.ac.kr/research/highlights?md=v&bbsidx=2" },
];
const task = "[생명과학] 방형구법으로 학교 화단의 식물 군집 조사 / 밀도·빈도·피도로 중요치를 구해 종 다양성을 비교한다";
const units = ["생명과학::생태계의 물질 순환과 상호 작용"];

// I1: 후보 고르기
{
  const got = pickIngredients({ rows, table, units, taskText: task, subject: "생명과학", snu, random: () => 0.5 });
  const titles = got.papers.map((p) => p.title);
  check(titles[0] === "도시 녹지의 식물 군집 구조와 종 다양성", "I1 과제에 가장 가까운 논문이 첫째(키워드까지 본다)", titles.join(" / "));
  check(!titles.includes("유전자 발현 조절 기작"), "I1 다른 단원 논문은 재료가 아니다");
  check(!titles.some((t) => /원격 탐사/.test(t)), "I1 어려운 연구는 재료로 안 준다");
  check(!titles.some((t) => /꼬리표 없는/.test(t)), "I1 단원 꼬리표가 없는 논문은 재료가 아니다 — GPT가 단원 근거로 읽은 것만");
  check(got.papers.every((p, i) => p.id === `P${i + 1}`) && got.research[0]?.id === "R1", "I1 번호가 붙는다(P1…, R1…)");
  check(got.research[0].title.startsWith("숲 토양 미생물 군집"), "I1 대학 글도 과제에 가까운 것이 앞");
  check(pickIngredients({ rows, table, units: [], taskText: task, subject: "생명과학" }).papers.length === 0, "I1 단원을 모르면 논문 재료는 없다");
}

// I2: 조합이 달라진다 — 같은 과제라도 무작위 몫이 다르면 다른 재료
{
  const many = Array.from({ length: 20 }, (_, i) => row(`식물 군집 연구 ${i}`, `저자${i}`, "2022", 0, "m", "군집"));
  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const sets = new Set();
  for (let i = 0; i < 6; i += 1) sets.add(pickIngredients({ rows: many, table, units, taskText: task, subject: "생명과학", random: rand }).papers.map((p) => p.title).join("|"));
  check(sets.size >= 4, "I2 여섯 번 고르면 재료 묶음이 넷 이상 다르다 — 학생마다 다른 조합", String(sets.size));
  const first = pickIngredients({ rows: many, table, units, taskText: task, subject: "생명과학", random: rand }).papers.slice(0, 2).map((p) => p.title);
  check(first.length === 2, "I2 가장 가까운 둘은 늘 들어간다");
}

// I3: AI에게 보내는 칸과 돌아오는 번호
{
  const got = pickIngredients({ rows, table, units, taskText: task, subject: "생명과학", snu, random: () => 0.5 });
  const lines = ingredientPromptLines(got).join("\n");
  check(lines.includes("P1. 도시 녹지의 식물 군집 구조와 종 다양성") && lines.includes("키워드: 방형구, 중요치, 종 다양성"), "I3 제목과 키워드를 보낸다");
  check(/결과·수치·결론을 아는 것처럼 쓰지 않는다/.test(lines) && /대상·장소·방법은 그대로/.test(lines), "I3 결과를 아는 척하지 말 것, 과제가 정한 것은 그대로");
  check(ingredientPromptLines({ papers: [], research: [] }).length === 0, "I3 재료가 없으면 칸도 없다");
  const used = usedIngredients({ usedIngredients: ["P1", "R1", "P9", "x"] }, got);
  check(used.papers.length === 1 && used.research.length === 1, "I3 보내지 않은 번호(P9)는 버린다 — 지어낸 번호를 인용으로 만들지 않는다");
  const inspiration = inspirationOf(used);
  const cites = inspirationCitations(inspiration);
  check(cites.papers[0].journal === "학회지" && cites.papers[0].from === "3" && cites.web[0].url.includes("snu.ac.kr"), "I3 참고 자료 줄 모양으로 바뀐다");
  const guide = inspirationGuide(inspiration);
  check(guide.mode === "inspiration" && guide.papers.length === 2 && guide.papers[0].line.startsWith("김 (2023)."), "I3 설계서 화면의 '이 설계가 참고한 연구'");
  check(inspirationGuide([]) === null, "I3 쓴 재료가 없으면 칸을 안 그린다");
}

// I4: 학생 브라우저를 거쳐 돌아온 것은 다시 다듬는다
{
  const back = normalizeInspiration([
    { kind: "paper", title: "가", journal: "나", year: "2024" },
    { kind: "research", title: "다", url: "https://evil.example/x" },
    { kind: "paper", title: "", journal: "x" },
    ...Array.from({ length: 6 }, () => ({ kind: "paper", title: "라", journal: "마" })),
  ]);
  check(back.length === 4 && back[0].title === "가" && back[1].title === "라", "I4 제목 없는 것을 먼저 버리고, 그다음 넷까지만", JSON.stringify(back));
  check(!back.some((one) => one.kind === "research"), "I4 서울대 주소가 아닌 대학 글은 버린다");
}

// I5: 답 형식과 마무리
{
  const got = pickIngredients({ rows, table, units, taskText: task, subject: "생명과학", snu, random: () => 0.5 });
  const input = { collectionKind: COLLECTION.MEASUREMENT, ingredients: got, subject: "생명과학", textbookCitation: "생명과학 교과서 · 생태계 단원" };
  check("usedIngredients" in stageSchemaProperties(STAGE.DRAFT, input), "I5 재료를 보냈으면 답에 usedIngredients 칸");
  check(!("usedIngredients" in stageSchemaProperties(STAGE.DRAFT, { collectionKind: COLLECTION.MEASUREMENT })), "I5 안 보냈으면 칸도 없다");
  check(!("usedIngredients" in stageSchemaProperties(STAGE.FINAL, input)), "I5 최종 보고서에는 재료를 안 보낸다");
  const draft = finalizeStageOutput(STAGE.DRAFT, { reportTitle: "t", sections: [{ title: "연구 질문", body: "?" }], usedIngredients: ["P2"],
    dataTemplate: { conditions: ["화단", "운동장"], trials: 3, measurementName: "종수", unit: "종", scaleGuide: "센다" } }, input);
  check(draft.extra.inspiration.length === 1 && draft.extra.inspiration[0].title === "하천 수변 식생의 군집 분석", "I5 설계서 결과에 쓴 재료가 실린다");
  const one = finalizeStageOutput(STAGE.COMPLETE, { reportTitle: "t", usedIngredients: ["P1"], sections: [{ title: "결론", body: "가" }] },
    { ...input, referencePapers: [{ title: "낱말로 짝지은 논문", journal: "x", year: "2020" }] }).parsed.sections;
  const refs = one.find((s) => s.title === "참고 자료")?.body || "";
  check(refs.includes("도시 녹지의 식물 군집") && !refs.includes("낱말로 짝지은"), "I5 한 번에 끝나는 보고서는 AI가 쓴 재료가 참고 자료 — 낱말로 짝지은 논문은 안 쓴다", refs);
}

// I7: 제목에 '교과서'가 든 논문도 참고 자료에 남는다 — 뭉뚱그린 교과서 줄로 보여 지워졌다(전수 검사 2026-09-18).
{
  const { referencesBody } = await import("../../../admission_worker_skeleton/references_v1.mjs");
  const body = referencesBody({
    papers: [{ title: "언어 네트워크 분석을 활용한 통합사회 교과서의 행복 개념 분석", author: "이윤미 외", year: "2024", journal: "지역과 지리" }],
    textbook: "통합사회1 교과서 · 통합적 관점과 행복 단원",
    fallbackBody: "통합사회 교과서 관련 단원",
  });
  check(body.includes("통합사회 교과서의 행복 개념 분석") && body.includes("통합사회1 교과서 · 통합적 관점과 행복 단원") && !body.includes("관련 단원"),
    "I7 서지 줄은 남기고 뭉뚱그린 교과서 줄만 갈아 끼운다", body);
}

// I6: 워커와 사이트
{
  check(worker.includes("input.ingredients = pickIngredients({"), "I6 워커가 설계서·한 번에 끝나는 보고서에서 재료를 고른다");
  check(worker.includes("input.ingredients.research = (await aliveOnly(input.ingredients.research, { limit: 2 }))"), "I6 대학 글 재료는 보내기 전에 주소를 열어 본다");
  check(worker.includes("inspiration: normalizeInspiration(payload?.studentData?.inspiration)"), "I6 최종 보고서 요청의 재료를 다시 다듬어 받는다");
  check(bridge.includes("studentData.inspiration = Array.isArray(draft.result?.inspiration)"), "I6 사이트가 설계서의 재료를 최종 보고서 요청에 돌려보낸다");
  check(bridge.includes('if(block.mode === "inspiration")') && bridge.includes("이 설계가 참고한 연구"), "I6 사이트가 '이 설계가 참고한 연구'를 그린다");
}

console.log(`\n${passed} checks passed`);
