// 참고 연구 재료 — ingredients_v1.mjs. 보고서는 조합이다: 교과 개념 + 학생 데이터가 몸통, 실제 연구는 배경 지식.
//
// 사용자 결정(2026-09-18): 연구는 이름을 드러내지 않고 학생의 설명에 녹아들며, 출처는 참고 문헌에만 들어간다.
// 따로 된 「교과 심화와 확장」 절도 없다(학교 양식에 없다). AI가 실제로 쓴 재료만 참고 문헌이 된다.
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
  check(/보고서의 핵심이 아니다/.test(lines) && /배경 지식/.test(lines) && /따로 절을 만들지 않는다/.test(lines),
    "I3 재료는 핵심이 아니고 배경 지식으로 녹인다, 따로 절 없음 — 몸통은 교과 개념과 학생 데이터(사용자 결정)");
  check(/본문에 대학 이름·학부·연구팀·저자 이름·연도를 쓰지 않는다/.test(lines) && /출처는 참고 문헌에 자동으로 들어간다/.test(lines),
    "I3 본문에 대학·저자 이름을 드러내지 않고, 출처는 참고 문헌에만");
  check(/recordDraft ③/.test(lines) && /이름 없이/.test(lines), "I3 세특 초안에는 넓힌 방향을 이름 없이 한 문장으로");
  // 운영 테스트(2026-09-18): 세특 초안에 「~라는 점을 확인함」 — 제목만 보았는데 읽은 것처럼 보였다.
  check(/"확인함"/.test(lines) && /학생은 제목만 보았다/.test(lines) && /탐구를 확장함/.test(lines), "I3 참고 연구는 '확인함'이 아니라 '찾아봄·확장함'으로");
  check(/반드시 usedIngredients에 넣는다/.test(lines) && /번호\(P1, R1\)는 본문에 쓰지 않는다/.test(lines), "I3 재료 내용을 썼으면 반드시 표시, 번호는 본문에 안 쓴다");
  const { scrubIngredientIds } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  // 2026-09-22에 바꿨다. 예전에는 맨몸의 R1 까지 지워 「R1에서도 다룬다」가 「에서도 다룬다」가 됐다.
  // 그 규칙이 학생 보고서의 변수 이름을 먹는 것을 운영 검사에서 보았다(아래 I8). 이제 괄호에
  // 든 번호만 지운다 — 맨몸 번호가 새면 「R1」 한 마디가 남을 뿐이고, 지우면 문장이 부서진다.
  check(scrubIngredientIds("이산화탄소를 전환하는 연구(P2)가 있었다. R1에서도 다룬다. P파와 S파.") === "이산화탄소를 전환하는 연구가 있었다. R1에서도 다룬다. P파와 S파.",
    "I3 괄호에 든 재료 번호만 지운다 — 맨몸 번호와 P파 같은 말은 그대로", scrubIngredientIds("이산화탄소를 전환하는 연구(P2)가 있었다. R1에서도 다룬다. P파와 S파."));
  check(/제목으로 알 수 있는 주제까지만/.test(lines) && /읽고 알게 된 내용처럼 쓰지 않는다/.test(lines), "I3 결과를 아는 척하지 말 것");
  check(ingredientPromptLines({ papers: [], research: [] }).length === 0, "I3 재료가 없으면 칸도 없다");
  const used = usedIngredients({ usedIngredients: ["P1", "R1", "P9", "x"] }, got);
  check(used.papers.length === 1 && used.research.length === 1, "I3 보내지 않은 번호(P9)는 버린다 — 지어낸 번호를 인용으로 만들지 않는다");
  const inspiration = inspirationOf(used);
  const cites = inspirationCitations(inspiration);
  check(cites.papers[0].journal === "학회지" && cites.papers[0].from === "3" && cites.web[0].url.includes("snu.ac.kr"), "I3 참고 자료 줄 모양으로 바뀐다");
  const guide = inspirationGuide(inspiration);
  check(guide.mode === "inspiration" && guide.routeLabel === "보고서가 참고한 연구" && guide.papers.length === 2 && guide.papers[0].line.startsWith("김 (2023)."), "I3 최종 보고서 화면의 '보고서가 참고한 연구'");
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
  check("usedIngredients" in stageSchemaProperties(STAGE.FINAL, input) && "usedIngredients" in stageSchemaProperties(STAGE.COMPLETE, input),
    "I5 재료를 보냈으면 최종·한 번에 끝나는 보고서의 답에 usedIngredients 칸");
  check(!("usedIngredients" in stageSchemaProperties(STAGE.FINAL, { collectionKind: COLLECTION.MEASUREMENT })), "I5 안 보냈으면 칸도 없다");
  // 비교 시험(2026-09-18): 아무 글자나 되는 칸을 긴 답 끝에 두었더니 AI가 빈 줄을 끝없이 찍다 5건 중 3건이 실패했다.
  const props = stageSchemaProperties(STAGE.FINAL, input);
  check(JSON.stringify(props.usedIngredients.items.enum) === JSON.stringify(["P1", "P2", "P3", "R1", "R2"].filter((id) => [...got.papers, ...got.research].some((one) => one.id === id)))
    && Object.keys(props)[0] === "usedIngredients", "I5 보낸 번호만 고를 수 있고(enum), 칸이 맨 앞", JSON.stringify(props.usedIngredients));
  check(worker.includes("...(stageProperties.usedIngredients ? { usedIngredients: stageProperties.usedIngredients } : {}),")
    && worker.indexOf("usedIngredients: stageProperties.usedIngredients") < worker.indexOf("reportTitle: { type: 'string', minLength: 8 }"),
    "I5 워커의 답 형식에서도 제목보다 앞 — AI는 칸 순서대로 쓴다");
  check(!("usedIngredients" in stageSchemaProperties(STAGE.DRAFT, input)), "I5 설계서(주제 잡기)에는 재료가 안 간다 — 교과 중심");
  const final = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], usedIngredients: ["P2", "R1"],
    sections: [{ title: "결론", body: "군집 개념은 하천 수변 식생 연구로 이어진다." }] },
    { ...input, studentData: { measurementName: "m", unit: "종", conditions: [{ label: "화단", values: [7, 9] }, { label: "운동장", values: [3, 2] }], sourceCards: [], sources: [] },
      referencePapers: [{ title: "낱말로 짝지은 논문", journal: "x", year: "2020" }] });
  const finalRefs = final.parsed.sections.find((s) => s.title === "참고 자료")?.body || "";
  check(finalRefs.includes("하천 수변 식생의 군집 분석") && finalRefs.includes("숲 토양 미생물") && !finalRefs.includes("낱말로 짝지은"),
    "I5 최종 보고서 참고 자료는 AI가 확장에 쓴 재료 — 낱말로 짝지은 논문은 안 쓴다", finalRefs);
  check(final.extra.inspiration.length === 2, "I5 최종 보고서 결과에 쓴 재료가 실린다(화면의 '교과 확장에 쓴 연구')");
  // 비교 시험(2026-09-18): 「(이윤미 외, 2024)」의 2024를 지어낸 숫자로 보고 문장을 지웠다 — 연구가 본문에서 사라졌다.
  const cited = finalizeStageOutput(STAGE.FINAL, { reportTitle: "t", figures: [], usedIngredients: ["P2"],
    sections: [{ title: "결론", body: "관련 연구를 찾아보니 하천 수변 식생의 군집을 다룬 연구(이, 2022)가 있었다. 기온은 35도였다." }] },
    { ...input, studentData: { measurementName: "m", unit: "종", conditions: [{ label: "화단", values: [7, 9] }, { label: "운동장", values: [3, 2] }], sourceCards: [], sources: [] } });
  const ext = cited.parsed.sections.find((s) => s.title === "결론").body;
  check(ext.includes("하천 수변 식생") && !ext.includes("(이, 2022)") && !ext.includes("35도"),
    "I5 인용 괄호(저자, 연도)는 본문에서 지우고 문장은 남긴다 — 출처는 참고 문헌에만. 지어낸 숫자 문장은 여전히 지운다", ext);
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
  check(worker.includes("input.ingredients = pickIngredients({") && worker.includes("if (input.reportStage !== STAGE.DRAFT && String(env.INGREDIENTS || '').toLowerCase() !== 'off') {"),
    "I6 워커가 확장을 쓰는 단계(설계서 말고)에서 재료를 고른다, 끄는 스위치가 있다");
  check(worker.includes("input.ingredients.research = (await aliveOnly(input.ingredients.research, { limit: 2 }))"), "I6 대학 글 재료는 보내기 전에 주소를 열어 본다");
  check(!bridge.includes("studentData.inspiration"), "I6 설계서에서 재료를 넘겨받지 않는다 — 최종 보고서가 직접 고른다");
  check(bridge.includes('if(block.mode === "inspiration")') && bridge.includes("보고서가 참고한 연구") && bridge.includes("본문에는 이름을 드러내지 않고 참고 자료에만"),
    "I6 사이트가 '보고서가 참고한 연구'를 그리고, 본문에는 이름이 없다고 알려 준다");
}

// I8: 재료 번호를 지우다가 **학생 보고서의 변수 이름**을 먹으면 안 된다.
// 운영 검사 2026-09-22(공통수학1): 「tanθ=t를 놓고 P1=(g x^2)/(2v0^2)라 하면」이
// 「놓고 =(g x^2)…」로 나왔다. P1·P2 는 점, R1·R2 는 저항이다 — 수학·과학·정보에서 늘 쓴다.
{
  const { scrubIngredientIds } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  const keep = [
    ["저항 R1과 R2를 직렬로 연결하고 전류를 측정한다.", "R1"],
    ["두 점 P1(1,2)와 P2(3,4)를 지나는 직선의 방정식", "P1"],
    ["tanθ=t를 놓고 P1=(g x^2)/(2v0^2)라 하면", "P1"],
    ["압력 P1에서 P2로 변할 때 부피 변화를 본다.", "P2"],
  ];
  for (const [line, word] of keep) {
    check(scrubIngredientIds(line).includes(word), `I8 「${word}」은 학생의 변수이므로 지우지 않는다`, scrubIngredientIds(line));
  }
  // 괄호에 든 번호는 우리 표시다 — 이건 그대로 지운다.
  check(!/P2/.test(scrubIngredientIds("교과 확장 재료 (P2) 를 참고했다.")), "I8 괄호에 든 재료 번호는 지운다");
  check(!/[PR]\d/.test(scrubIngredientIds("[P1, R2] 에서 가져왔다.")), "I8 대괄호에 여러 개가 들어도 지운다");
  check(!/2024/.test(scrubIngredientIds("(홍의정 외, 2024) 연구를 보면")), "I8 본문의 인용 괄호는 그대로 지운다");
}

console.log(`\n${passed} checks passed`);
