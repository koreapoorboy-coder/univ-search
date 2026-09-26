// 논문 — 학생이 낸 길 위의 표지판(paper_route_v1.mjs).
//
// 사용자가 방향을 바꿨다: 낱말로 논문을 찾지 말고 **수행평가의 구조로 틀을 잡고, 그 틀로 검색 명령을 짓는다.**
// 이 파일은 그 다섯 걸음이 지켜지는지 본다: ① 틀 ② 칸 ③ 명령 ④ 판단 ⑤ 안내.
// 여기 적힌 틀린 예는 전부 **실제 수행평가 전수 검사**(audit_paper_route_all.mjs)에서 나온 것이다.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  citationRow, fitPaper, FRAME, guideBlock, guideLine, josa, paperQuery, routeOf, routePapers, routedPaperLine,
  shardFile, TASK_FRAME, taskSlots, unitsMeet, unpack,
} from "../../../admission_worker_skeleton/paper_route_v1.mjs";
import { indexPaperLine } from "../../../admission_worker_skeleton/kci_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const worker = (await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8")).replace(/\r\n/g, "\n");
const bridge = (await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8")).replace(/\r\n/g, "\n");
const fieldMap = JSON.parse(await readFile(here("../../../tools/subject_field_map_2026_09.json"), "utf8"));
const drops = JSON.parse(await readFile(here("../../../tools/fix_kci_paper_2026_09.json"), "utf8")).drops;
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const row = (title, core = 1) => [title, "김 외", "2024", "학회지", "3", "2", "10-20", core];

// P1: ① 틀 — 수행평가 유형이 길을 정한다.
{
  check(routeOf("실험분석형") === "change" && routeOf(["자료해석형", "논증형"]) === "change", "P1 실험·자료 해석은 '바꾸고 재기'");
  check(routeOf("논증형") === "claim" && routeOf("사회문제분석형") === "claim", "P1 논증·사회문제는 '주장'");
  check(routeOf("원리적용형") === "explain" && routeOf("") === "explain" && routeOf("모르는형") === "explain",
    "P1 모르면 '설명' — 가장 조심스러운 말을 하는 길");
  check(routeOf("structure_experiment_analysis") === "change" && routeOf("structure_argumentation") === "claim",
    "P1 보고서 구조 이름(structure_*)으로 와도 읽는다");
}

// P2: ② 칸 — 학생 글에서 바꾸는 것·재는 것을 뽑는다.
{
  const one = taskSlots("온도에 따른 효소의 활성 변화를 측정하여 최적 온도를 찾는다");
  check(one.change.includes("온도") && one.measure.includes("효소") && one.measure.includes("활성"),
    "P2 'A에 따른 B의 C' → 바꾸는 것 A, 재는 것 B·C", JSON.stringify(one));
  check(taskSlots("빛의 세기를 달리하여 광합성 속도를 측정한다").change.includes("세기"), "P2 'A를 달리하여' → 바꾸는 것");
  check(taskSlots("걸린 시간을 측정한다").measure.includes("시간"), "P2 'A를 측정' → 재는 것");
  check(!taskSlots("온도에 따른 변화").measure.includes("변화"), "P2 '변화'는 칸의 이름이지 값이 아니다");
  check(taskSlots("보고서를 작성한다").change.length === 0, "P2 칸이 없으면 비워 둔다 — 지어내지 않는다");
}

// P3: ③ 명령 — 틀 말·평가 틀 말·과목 이름·동사는 찾는 말이 못 된다.
{
  const q = paperQuery("[12화학Ⅱ01-01] 평가요소: 분량의 적합성, 논리성 배점 20점. 기체의 온도와 압력을 측정하여 분석한다",
    "실험분석형", { subject: "화학", anchor: "기체 압력" });
  for (const bad of ["평가요소", "적합성", "논리성", "배점", "20점", "측정하여", "화학", "12화학Ⅱ01"]) {
    check(!q.words.includes(bad), `P3 '${bad}'는 찾는 말이 아니다`, q.words.join("·"));
  }
  check(q.words.includes("기체") && q.words.includes("압력"), "P3 내용 말은 남는다", q.words.join("·"));
  check(q.center.join("·") === "기체·압력", "P3 중심은 과제 제목·키워드에서 온다", q.center.join("·"));
  check(q.need === 2, "P3 제목에 **함께** 있어야 하는 수는 둘");
  const live = paperQuery("기후변화가 초래하는 영향을 해석하는 보고서", "자료해석형", { subject: "지구과학", anchor: "기후변화가 초래하는 원전 냉각 위기" });
  check(!live.center.includes("초래하") && !live.words.includes("초래하"), "P3 '~하'로 끝나는 동사 조각(초래하)은 중심이 못 된다 — 운영 테스트에서 나온 것", live.center.join("·"));
  check(FRAME.has("연구") && FRAME.has("미치는") && !FRAME.has("인공지능") && !FRAME.has("소설"),
    "P3 논문 제목의 틀 말은 빼되 흔한 주제어(인공지능·소설)는 남긴다");
  check(TASK_FRAME.has("포트폴리오") && TASK_FRAME.has("수행평가") && !TASK_FRAME.has("기후") && !TASK_FRAME.has("데이터"),
    "P3 평가 틀 말은 빼되 여러 과목에 나오는 내용 말(기후·데이터)은 남긴다");
  const inte = paperQuery("화학 결합의 종류", "원리적용형", { subject: "통합과학1", anchor: "화학 결합" });
  check(inte.center.includes("화학"), "P3 통합과학에서 '화학'은 내용이다 — 그 학생 과목 이름만 뺀다", inte.center.join("·"));
}

// P4~P6: ④ 판단. 틀린 예는 실제 전수 검사에서 나온 것이다.
{
  const pick = (titles, text, anchor, subject = "통합과학1", mode = "실험분석형") =>
    routePapers(titles.map((one) => (Array.isArray(one) ? one : row(one))), text, mode, { subject, anchor, limit: 3 }).picked.map((one) => one.title);
  // 둘이 함께
  check(pick(["자폐스펙트럼장애 유아의 발달"], "빛의 스펙트럼 관찰하기", "스펙트럼 관찰").length === 0,
    "P4 낱말 하나('스펙트럼')로는 안 붙는다 — 자폐스펙트럼장애");
  // 중심 칸을 다 채워야
  check(pick(["공유 자전거 운영 효율화를 위한 수요예측 및 최적화 모형의 결합"], "화학 결합의 종류에 따른 성질 비교", "화학 결합").length === 0,
    "P5 「화학 결합」에 '결합' 하나로 공유 자전거 모형이 붙지 않는다");
  check(pick(["소프트 웨어러블 로봇을 통한 인체 운동의 가속"], "중력 가속도 측정 실험 자유 낙하 운동", "중력 가속").length === 0,
    "P5 「중력 가속도」에 '가속' 하나로 로봇 논문이 붙지 않는다");
  check(pick(["브로민화수은 승화공정에서 온도-농도 대류현상"], "가역 반응에서의 동적 평형과 온도 농도", "화학 평형 평형 상수", "화학").length === 0,
    "P5 「화학 평형」에 '온도+농도'로 대류 논문이 붙지 않는다 — 중심과 무관");
  const good = pick(["발광다이오드 파장과 광량에 따른 Chlorella vulgaris의 광합성 색소 함량 및 조성 변화"],
    "광합성 색소 분리 실험: 빛의 세기에 따른 광합성 색소 함량 변화를 측정한다", "광합성 색소 분리", "생명과학");
  check(good.length === 1, "P5 중심 칸을 다 채우면 붙는다 — 광합성 색소 분리 → 클로렐라 광합성 색소 함량");
  check(pick(["조선 세종대 앙부일구의 특징"], "조선 시대의 해시계인 앙부일구 원리 탐구하기", "앙부일구").length === 1,
    "P5 중심 낱말이 하나뿐이면 그 하나 + 다른 낱말 하나로 붙는다 — 앙부일구 + 조선");
  check(pick(["세종대 앙부일구의 특징"], "앙부일구 원리 탐구하기 해시계", "앙부일구").length === 0,
    "P5 그래도 제목에 학생 낱말이 하나뿐이면 안 붙는다");
  check(pick(["조선 세종대 앙부일구의 특징"], "조선 시대의 해시계인 앙부일구 원리 탐구하기", "").length === 0,
    "P5 중심(과제 제목·키워드·개념)이 비면 아무것도 안 붙인다");
  // 과목 안에서 흔한 말 둘은 우연히 겹친다
  const many = Array.from({ length: 60 }, (_, i) => row(`지역 문제 사례 ${i}`));
  const got = routePapers([...many, row("지역 문제와 도시재생")], "지역 문제 탐구 도시재생", "사회문제분석형",
    { subject: "통합사회1", anchor: "지역 문제 도시재생", limit: 3 });
  check(got.picked.every((one) => one.title.includes("도시재생")), "P6 과목 안에서 흔한 말 둘('지역+문제')만으로는 안 붙는다",
    got.picked.map((one) => one.title).join(" / "));
  // 중심 학문이 앞
  const order = routePapers([row("회로 설계와 전기 소자", 0), row("전기 회로의 저항", 1)], "전기 회로 실험", "실험분석형",
    { subject: "물리", anchor: "전기 회로", limit: 2 }).picked.map((one) => one.title);
  check(order[0] === "전기 회로의 저항", "P6 같은 증거면 중심 학문(물리학) 논문이 주변 분야(전자공학)보다 앞", order.join(" / "));
}

// P7: ⑤ 안내서 — 어느 칸에 쓰라고 말하되, 논문에 무엇이 있다고 단정하지 않는다.
{
  check(josa("광합성", "과", "와") === "광합성과" && josa("효소", "과", "와") === "효소와" && josa("DNA", "을", "를") === "DNA를",
    "P7 받침에 맞춰 조사를 붙인다");
  const change = guideLine({ hits: ["광합성", "색소"], change: "세기", measure: "색소" }, "change");
  check(change.includes("「광합성」과 「색소」") && change.includes("세기를 어떤 범위로 바꾸고 색소를 어떻게 쟀는지"),
    "P7 바꾸고 재는 탐구 — 조건과 측정 방법의 근거로", change);
  check(guideLine({ hits: ["자연", "보존"] }, "claim").includes("주장의 근거나 반론"), "P7 주장하는 탐구 — 근거나 반론으로");
  check(guideLine({ hits: ["전사", "번역"] }, "explain").includes("설명을 받치는 근거"), "P7 설명하는 탐구 — 설명을 받치는 근거로");
  for (const route of ["change", "claim", "explain"]) {
    const line = guideLine({ hits: ["가", "나"] }, route);
    check(line.startsWith("제목으로 보아") && line.includes("초록에서"), `P7 ${route}: 제목만 안다고 밝히고 초록에서 확인하라고 한다`);
    check(!/(얻었|밝혔|증명|보여 준다|확인했)/.test(line), `P7 ${route}: 논문 내용을 단정하지 않는다`, line);
  }
}

// P8: 화면과 참고 자료로 나가는 모양.
{
  const picked = [{ ...unpack(row("효소 활성에 미치는 온도")), fit: { hits: ["효소", "온도"] }, guide: "안내" }];
  const block = guideBlock({ route: "change", center: ["효소", "온도"] }, picked);
  check(block.routeLabel === "바꾸고 재는 탐구" && block.papers[0].line.startsWith("김 외 (2024). 효소 활성에 미치는 온도."),
    "P8 설계서 묶음: 길 이름과 논문 줄", block.papers[0].line);
  check(guideBlock({ route: "change" }, []) === null, "P8 붙은 논문이 없으면 묶음도 없다 — 빈 칸을 그리지 않는다");
  const line = indexPaperLine(citationRow(picked[0]));
  check(line === "김 외 (2024). 효소 활성에 미치는 온도. 학회지, 3(2), 10-20.", "P8 최종 보고서 참고 자료 줄은 옛 줄과 같은 모양", line);
  check(routedPaperLine(picked[0]) === line, "P8 설계서의 줄과 참고 자료의 줄이 같다 — 학생이 같은 논문으로 알아본다");
  check(shardFile("세포와 물질대사") === "paper-route/세포와_물질대사.v1.json" && shardFile("") === "", "P8 과목 → 묶음 파일 이름");
  // shardFile 은 아무 과목에나 이름을 만들어 준다. 묶음이 없는 과목(대수·미적분1·기하…)은 Pages 가
  // 404 대신 화면(HTML)을 200 으로 돌려주므로, 워커가 content-type 을 보고 물러서야 한다. 안 그러면
  // json 읽다 터지고 재료 단계가 통째로 날아가 **서울대 연구까지** 빠진다.
  check(worker.includes("res.ok && kind.includes('json')"),
    "P8 묶음이 없는 과목은 HTML 을 json 으로 읽지 않는다");
}

// P9: 과목 묶음 — 실제 파일.
{
  const subjects = Object.keys({ ...fieldMap.subjects, ...(fieldMap.route_subjects || {}) });
  // 2026-09-20: 영어·한국사 단원 자료를 넣고 두 과목의 논문 묶음도 만들었다(18 → 20).
  // 2026-09-21: 확률과 통계를 더했다(20 → 21). 나머지 수학 다섯 과목(공통수학1·2, 대수, 미적분1,
  // 기하)은 **일부러 안 만든다** — KCI 에 한글 제목 수학 논문이 387편뿐이고 대부분 수학교육 연구라,
  // 「초등학교 1학년 다문화학생들의 수 세기 분석」 같은 것이 고등학생 보고서에 붙는다. 붙일 것이
  // 없는 것보다 엉뚱한 것이 붙는 쪽이 나쁘다.
    // 2026-09-21: 단원 사전이 아예 없던 다섯 과목(인공지능 기초·데이터 과학·융합과학 탐구·과학과제
  // 연구·화학 반응의 세계)에 사전을 만들면서 논문 묶음도 같이 만들었다(21 → 26). 단원만 더하면
  // 재료가 없어 오히려 나빠진다 — 과학탐구실험에서 겪었다.
  // 2026-09-26: 「생물의 유전」도 이름만 있고 단원 사전이 없던 과목이었다(26 → 27).
  // 교육과정 별책9와 미래엔 교사용 교과서로 단원 6개를 만들면서 묶음도 같이 만들었다.
  check(subjects.length === 27, "P9 묶음을 만들 과목 27개", String(subjects.length));
  const pureMath = ["공통수학1", "공통수학2", "대수", "미적분1", "기하"];
  check(pureMath.every((one) => !subjects.includes(one)),
    "P9 순수 수학 다섯 과목은 묶음을 만들지 않는다",
    pureMath.filter((one) => subjects.includes(one)).join(", "));
  let total = 0;
  for (const subject of subjects) {
    const file = here(`../seed/${shardFile(subject)}`);
    const size = (await stat(file)).size;
    // 2.6MB → 2.8MB (2026-09-18): 주제 재료로 AI에게 보낼 키워드 칸(4개·50자)이 붙었다. 워커가 한 번 읽고 들고 있다.
    check(size < 2.8e6, `P9 ${subject} 묶음이 2.8MB 아래 — 보고서마다 읽는다`, String(size));
    const shard = JSON.parse(await readFile(file, "utf8"));
    total += shard.rows.length;
    check(shard.license.includes("제한 없음") && shard.rows.every((one) => one.length === 8 || one.length === 10 || one.length === 11),
      `P9 ${subject}: 이용허락과 한 줄 8칸(꼬리표 +2, 키워드 +1)`);
    const heads = drops.map((one) => one.title.replace(/\s+/g, ""));
    check(!shard.rows.some((one) => heads.some((head) => String(one[0]).replace(/\s+/g, "").startsWith(head))),
      `P9 ${subject}: 손으로 지운 논문이 다시 들어오지 않았다`);
  }
  check(total > 50000, "P9 묶음 전체", String(total));
  // 실제 묶음으로 한 번
  const bio = JSON.parse(await readFile(here(`../seed/${shardFile("통합과학2")}`), "utf8")).rows;
  const real = routePapers(bio, "광합성 색소 분리 실험: 빛의 세기에 따른 광합성 색소 함량 변화를 측정한다", "실험분석형",
    { subject: "통합과학2", anchor: "광합성 색소 분리" });
  check(real.picked.some((one) => one.title.includes("광합성 색소")), "P9 실제 묶음에서 광합성 색소 논문을 찾는다",
    real.picked.map((one) => one.title).join(" / "));
}

// P12: GPT 꼬리표 — 논문이 **이 보고서의 단원과 같을 때만**. (tools/classify_kci_papers.mjs)
{
  const table = ["생명과학::물질대사와 건강", "지구과학::판 구조와 암석 변화", "화학::산화와 환원"];
  const rows = [
    ["중강도 운동을 실시한 비만 쥐에서 정향 투여가 지질과 근육 대사에 미치는 영향", "김", "2024", "j", "1", "1", "1-2", 1, [0], "m"],
    ["판 경계에서 일어나는 지진과 화산 활동의 지질학적 해석", "이", "2024", "j", "1", "1", "1-2", 1, [1], "e"],
  ];
  const text = "판의 경계에서 일어나는 지진과 화산 활동의 지질 현상 탐구";
  const got = routePapers(rows, text, "개념해석형", { subject: "지구과학", anchor: "지진 화산 지질", units: ["지구과학::판 구조와 암석 변화"], table }).picked.map((one) => one.title);
  check(got.length === 1 && got[0].startsWith("판 경계"), "P12 판 구조 보고서에 '지질'이 같은 비만 쥐 논문은 안 붙는다 — 꼬리표의 단원이 다르다", got.join(" / "));
  const noUnit = routePapers(rows, text, "개념해석형", { subject: "지구과학", anchor: "지진 화산 지질", units: [], table }).picked.length;
  check(noUnit >= 1, "P12 보고서의 단원을 모르면 꼬리표로 막지 않는다(낱말 규칙만)");
  check(unitsMeet(["화학::산화와 환원"], ["통합과학2::산화와 환원"]) && !unitsMeet(["생명과학::물질대사와 건강"], ["지구과학::판 구조와 암석 변화"]),
    "P12 과목이 달라도 단원 이름이 같으면 같은 단원이다");
  const easy = routePapers([["판 경계 지진 화산 연구 A", "가", "2024", "j", "", "", "", 1, [1], "h"], ["판 경계 지진 화산 연구 B", "나", "2023", "j", "", "", "", 1, [1], "e"]],
    text, "개념해석형", { subject: "지구과학", anchor: "지진 화산", units: ["지구과학::판 구조와 암석 변화"], table }).picked.map((one) => one.title);
  check(easy[0].endsWith("B"), "P12 같은 증거면 고등학생이 읽기 쉬운 논문이 앞", easy.join(" / "));
  check(/units,\s*table: shard\.units,/.test(worker) && worker.includes("const units = [reportConcept, axisConceptName(seedPack, reportAxis)]"),
    "P12 워커가 보고서의 단원과 묶음의 단원 목록을 넘긴다");
}

// P10: 워커 — 설계서엔 안내서, 최종 보고서엔 참고 자료. AI에게는 안 간다.
{
  check(worker.includes("import { citationRow, contentWords, guideBlock, routePapers, shardFile } from './paper_route_v1.mjs';"), "P10 워커가 새 길을 쓴다");
  // 2026-09-18 사용자 결정: 논문은 교과 확장 재료다(ingredients_v1). 낱말 규칙은 재료를 꺼 두었을 때의 대비책으로만 남는다.
  check(/input\.referencePapers = picked\.map\(citationRow\);/.test(worker) && worker.includes("paperGuide = inspirationGuide(result?.inspiration)"),
    "P10 최종 보고서에는 AI가 확장에 쓴 연구(재료를 꺼 두면 예전 낱말 규칙)");
  check(worker.includes("...(stage !== STAGE.DRAFT ? ingredientPromptLines(input.ingredients) : [])"),
    "P10 재료는 확장을 쓰는 단계에만 AI에게 간다 — 설계서(주제 잡기)는 교과 중심");
  check(/bookChoices,\s*paperGuide,/.test(worker), "P10 응답에 paperGuide 가 실린다");
  check(worker.indexOf("routePapers(shard.rows") > 0 && worker.indexOf("routePapers(shard.rows") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "P10 AI를 부르기 전에 찾는다 — 참고 자료 절이 쓸 수 있게");
  const at = worker.indexOf("function buildPrompt(");
  const body = worker.slice(at, worker.indexOf("\nfunction ", at + 50));
  check(!/paperGuide|referencePapers|routePapers/.test(body), "P10 프롬프트에는 논문이 안 들어간다 — 보고서가 논문에 맞춰 휘면 끼워 맞추기다");
  check(/paper route failed/.test(worker), "P10 못 찾아도 보고서는 나간다");
  check(/axisForConcept\(seedPack\.axisIndex, input\.subject,\s*inferConcept\(input\.subject, \[reportConcept, taskText\(input\)\]\.join\(' '\), seedPack\.axisIndex\)\)/.test(worker),
    "P10 개념 이름이 단원 이름과 다르면(지구 온난화 ↔ 지구의 기후 변화) 과제 글로 단원을 다시 추정한다 — 운영 테스트에서 나온 것");
}

// P11: 화면 — 참고 도서 바로 위, 접힌 칸, 고르는 칸이 아니다.
{
  const start = bridge.indexOf("  function renderPaperGuide(block){");
  const end = bridge.indexOf("\n  // 참고 도서 고르기.", start);
  check(start > 0 && end > start, "P11 화면에 논문 길잡이 칸이 있다");
  const source = bridge.slice(start, end);
  const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const render = new Function("escapeHtml", `${source}\nreturn renderPaperGuide;`)(escapeHtml);
  const html = render({ routeLabel: "바꾸고 재는 탐구", center: ["효소"], papers: [{ line: "김 (2024). <i>x</i>.", guide: "안내 <img>" }] });
  check(html.includes("&lt;i&gt;x&lt;/i&gt;") && !html.includes("<i>x</i>") && !html.includes("<img>"), "P11 논문 줄과 안내는 이스케이프한다");
  check(html.includes("<details") && !html.includes("<details open"), "P11 평소에는 접어 둔다 — 설계서 화면을 덮지 않는다");
  check(!/type="radio"|type="checkbox"/.test(html), "P11 고르는 칸이 아니다 — 논문은 AI에게 가지 않는다");
  check(html.includes("kci.go.kr") && html.includes("초록"), "P11 어디서 무엇을 확인하면 되는지 적는다");
  check(render(null) === "" && render({ papers: [] }) === "", "P11 논문이 없으면 칸을 안 그린다");
  const call = bridge.indexOf("${renderPaperGuide(rawData?.paperGuide)}");
  check(call > 0 && call < bridge.indexOf('${stage === "experiment_draft" ? renderCollectionPanel'), "P11 참고 도서 바로 위에 그린다");
}

console.log(`\n${passed} checks passed`);
