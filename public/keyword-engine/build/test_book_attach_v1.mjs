// 수행평가에 첨부하는 참고 도서.
//
// 학교에서 구두로 "책을 읽고 수행평가에 첨부해라" 하는 경우가 있다. 사용자가 책 데이터를 넣은 이유가
// 그것이다 — 부록이 아니라 **이번 보고서에 쓰이는 자료**다.
//
// 전제가 하나 더 있다: **학생은 책을 읽을 시간이 없다.** 그래서 우리가 그 책이 무엇을 다루는지 미리
// 정리해 두었다. 그건 그 책의 실제 내용이라 인용은 사실이다. 다만 **읽은 소감은 학생만 쓸 수 있다** —
// 모델이 지어내면 그 순간 거짓이 된다. 이 파일이 지키는 선이 거기다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildConceptCounts, buildMajorCounts, buildWordCounts, inferConcept, majorHit, matchBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";
import { bookBlock, bookRules, pickedBook } from "../../../admission_worker_skeleton/report_stages_v1.mjs";
import { axisForConcept } from "../../../admission_worker_skeleton/next_step_v1.mjs";
import { referencesBody, sourceLine } from "../../../admission_worker_skeleton/references_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const books = JSON.parse(await readFile(here("../seed/engine-index/book_match_index.v1.json"), "utf8")).books;
const axisIndex = JSON.parse(await readFile(here("../seed/engine-index/longitudinal_axis_index.v1.json"), "utf8"));
const lf = (text) => String(text).split("\r\n").join("\n");
const worker = lf(await readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8"));
const bridge = lf(await readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8"));
const stages = lf(await readFile(here("../../../admission_worker_skeleton/report_stages_v1.mjs"), "utf8"));
// 이 저장소는 CRLF와 LF가 섞여 있다. 줄바꿈 때문에 시험이 깨지면 시험이 거짓말을 하는 것이다.
const counts = buildWordCounts(books);
const conceptCounts = buildConceptCounts(axisIndex);
const majorCounts = buildMajorCounts(books);
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const axisFor = (concept) => Object.values(axisIndex.axes).find((one) => one.concept === concept);
const pick = (subject, concept, major) => {
  const axis = axisFor(concept);
  return matchBooks(books, {
    subject, concept, major,
    keyword: String(axis?.output || "").split(/[,、·]/)[0].trim(), axisTitle: axis?.title,
  }, 6, counts, conceptCounts, majorCounts);
};

// A1: 진로는 **순서를 바꿀 뿐 문턱이 아니다.** 진로를 아직 안 정한 학생에게도 책은 나와야 한다.
{
  const none = pick("화학", "원자의 구조", "");
  const mine = pick("화학", "원자의 구조", "화학공학과");
  check(none.length > 0, "A1 진로를 안 적어도 책이 나온다", JSON.stringify(none.map((b) => b.title)));
  check(mine.length > 0 && mine.some((b) => b.forMajor), "A1 진로를 적으면 그 학과를 가리키는 책이 표시된다",
    JSON.stringify(mine.map((b) => `${b.title}:${b.forMajor || "-"}`)));
  check(mine[0].score > none.find((b) => b.title === mine[0].title)?.score,
    "A1 그리고 점수가 올라가 앞으로 온다 — 문턱이 아니라 순서다");
  check(mine.length >= none.length, "A1 진로를 적었다고 책이 줄어들지는 않는다");
}

// A1b: **진로가 없는 학생**이 이 기능의 기본값이다. 고등학생 상당수가 아직 안 정했다.
//
// 처음에 나는 학과 배지를 진로를 적은 학생에게만 보여 주고 있었다 — 정작 길잡이가 필요한 쪽에
// 가려 놓은 꼴이었다. 진로가 없으면 그 학과 목록이 **이 책이 이어지는 방향**이 된다.
{
  const none = pick("화학", "원소의 주기적 성질", "");
  check(none.length >= 3, "A1b 진로가 없어도 책이 그대로 나온다", String(none.length));
  check(none.every((b) => b.majors.length > 0), "A1b 그리고 책마다 어느 쪽 책인지 보여 준다",
    JSON.stringify(none.map((b) => b.majors)));
  check(none.every((b) => !b.forMajor), "A1b 다만 '네 진로와 맞다'고는 말하지 않는다 — 진로를 모른다");
  check(none.every((b) => b.majors.every((m) => (majorCounts.get(m.replace(/\s+/g, "")) || 0) <= 40)),
    "A1b 방향으로 쓰는 학과도 흔한 것은 뺀다 — 철학과로는 아무 방향도 안 가리킨다");
  const mine = pick("화학", "원소의 주기적 성질", "화학공학과");
  check(mine.every((b) => b.majors.length > 0) && mine.some((b) => b.majors.includes(b.forMajor)),
    "A1b 진로를 적으면 그중 하나가 별표로 바뀔 뿐, 목록은 그대로다");
  check(bridge.includes("이 책이 이어지는 방향"), "A1b 화면이 진로 없는 학생에게 그렇게 설명한다");
  check(/mini-book-m em\.on/.test(bridge), "A1b 맞는 학과만 파랗고 나머지는 회색이다");
}

// A2: **흔한 학과로는 못 가린다.** '철학과'는 80권에, '사회학과'는 74권에 붙어 있다. 낱말과 같은 규칙이다.
{
  const common = [...majorCounts.entries()].filter(([, n]) => n > 40).map(([m]) => m);
  check(common.length > 0, "A2 정말로 아무 책에나 붙어 있는 학과가 있다", common.slice(0, 4).join(", "));
  const one = books.find((b) => (b.majors || []).some((m) => m.replace(/\s+/g, "") === common[0]));
  check(majorHit(one, common[0], majorCounts) === "", `A2 ${common[0]}로는 안 걸린다 — 그 말로 걸린 추천은 아무 말도 안 한 것이다`);
  check(majorHit({ majors: ["화학공학과"] }, "화학공학과", majorCounts) === "화학공학과", "A2 드문 학과는 그대로 걸린다");
  check(majorHit({ majors: ["화학공학과"] }, "", majorCounts) === "", "A2 진로를 안 적으면 아무것도 안 걸린다");
}

// A3: 학생이 읽을 시간이 없다. **그 책이 무엇을 다루는지**가 같이 내려가야 한다.
{
  const found = pick("화학", "원자의 구조", "화학과");
  check(found.every((b) => Array.isArray(b.points)), "A3 책마다 내용 조각이 딸려 온다");
  check(found.some((b) => b.points.length >= 2), "A3 그리고 비어 있지 않다",
    JSON.stringify(found.map((b) => b.points.length)));
  check(books.every((b) => !(b.points || []).some((one) => one.length > 140)), "A3 한 줄이 너무 길지 않다");
}

// A3b: **제목만 보고는 무슨 책인지 모른다.**
//
// 사용자가 화면을 보고 짚었다: "책을 봐도 이 책이 무슨 책인지 몰라." 맞는 말이었다 — 한 줄 소개가
// 242권 전부에 있는데 화면이 그걸 안 쓰고 있었다. 지금은 **고르기 전에** 한 줄 소개가 보이고,
// **고른 뒤에** 다루는 내용이 펼쳐진다. 여섯 권을 다 펼쳐 놓으면 아무도 안 읽는다.
{
  check(books.every((b) => (b.summary || "").length >= 10), "A3b 242권 모두 한 줄 소개가 있다");
  const found = pick("화학", "원자의 구조", "화학공학과");
  check(found.length > 3, "A3b 셋보다 많이 나온다 — 선택권이 너무 좁았다", String(found.length));
  check(found.length <= 6, "A3b 다만 여섯을 넘지 않는다", String(found.length));
  check(found.every((b) => b.summary), "A3b 후보마다 한 줄 소개가 딸려 온다");
  check(bridge.includes('class="mini-book-s"'), "A3b 화면이 고르기 전에 그 소개를 보여 준다");
  // 쉬운 말이어야 한다. 학생은 책을 안 읽으므로 이 한 줄이 아는 전부다.
  const PROMO = /학과|연결성이 높다|확장하기 좋은|탐구로 확장|확장할 수 있는 도서|수행평가형/;
  const onScreen = books.filter((b) => (b.points || []).length || b.summary);
  check(!found.some((b) => PROMO.test(b.summary)),
    "A3b 소개에 '○○학과와 연결성이 높다' 같은 우리 쪽 홍보문구가 없다",
    JSON.stringify(found.filter((b) => PROMO.test(b.summary)).map((b) => b.title)));
  check(found.every((b) => b.summary.length <= 60), "A3b 그리고 한 줄에 들어간다",
    JSON.stringify(found.map((b) => b.summary.length)));
  check(!found.some((b) => (b.points || []).some((one) => PROMO.test(one))),
    "A3b 펼쳐지는 내용에도 홍보문구가 안 섞인다");
  check(onScreen.length > 200, "A3b 그 걸러내기는 전체 책에 적용된다", String(onScreen.length));
  check(/\.mini-book-d\{[^}]*display:none/.test(bridge), "A3b 다루는 내용은 처음엔 접혀 있다");
  check(bridge.includes(".mini-book:has(input:checked) .mini-book-d{display:block}"),
    "A3b 고르면 펼쳐진다");
  check(bridge.includes("그 책에 무슨 내용이 있는지 펼쳐집니다"), "A3b 학생에게 그렇게 말해 준다");
  // 한 권이 두 줄을 넘으면 여섯 권이 화면을 덮는다. 학과 배지는 제목 줄 오른쪽에 붙인다.
  check(/\.mini-book-m\{display:inline-flex[^}]*margin-left:auto/.test(bridge),
    "A3b 학과는 제목 줄 오른쪽에 붙어 줄을 더 차지하지 않는다");
  check(/\.mini-book-m em\{[^}]*slice/.test(bridge) === false && bridge.includes("(book.majors || []).slice(0, 2)"),
    "A3b 학과는 둘까지만 — 셋을 달면 제목이 밀린다");
  check(/\.mini-book-take\{display:none\}/.test(bridge), "A3b 한 줄 쓰는 칸도 책을 골라야 나온다");
  check(/\}, 6, buildWordCounts\(bookList\)/.test(worker), "A3b 워커도 여섯 권까지 내려보낸다");
}

// A3c: **책은 선택 사항이다.** 그러면 평소에는 자리를 차지하면 안 된다.
//
// 사용자가 짚었다: "책은 선택사항이잖아." 맞는 말이었다 — 선생님이 시키지 않은 대부분의 학생에게는
// 필요 없는 칸인데 여섯 권을 늘 펼쳐 두면 설계서 화면이 그것에 덮인다. 평소에는 한 줄로 접어 둔다.
{
  check(/return `\s*<details class="mini-book-pick">/.test(bridge),
    "A3c 평소에는 접혀 있다 — 한 줄만 보인다");
  check(bridge.includes("선택 · 이 주제와 이어지는 책 ${list.length}권"),
    "A3c 접힌 줄이 몇 권 있는지와 선택임을 말한다");
  // "선생님이 첨부하라고 하셨나요?"는 묻는 형태라 하라는 말로 읽힌다. 그냥 이름만 단다.
  check(/<summary>참고 도서/.test(bridge), "A3c 이름은 그냥 '참고 도서'다");
  // 주석이 아니라 **화면에 찍히는 곳**만 본다. 규칙을 적어 둔 주석까지 걸리면 시험이 자기 말을 문다.
  const summaryTag = bridge.slice(bridge.indexOf("<summary>"), bridge.indexOf("</summary>") + 10);
  check(!/[?？]/.test(summaryTag), "A3c 접힌 줄이 물음표로 떠밀지 않는다", summaryTag);
  check(!/선생님/.test(summaryTag), "A3c 선생님 이야기는 접힌 줄에 안 쓴다 — 시켰다는 전제가 된다", summaryTag);
  check(bridge.includes("넣어도 되고 안 넣어도 돼요"), "A3c 안 넣어도 된다고 먼저 말한다");
  check(!/<details class="mini-book-pick"[^>]*open/.test(bridge), "A3c 처음부터 펼쳐져 있지 않다");
  check(bridge.includes('value="" checked'), "A3c 열어 봐도 기본은 '안 넣을래요'다");
  check(/\.mini-book-pick>summary\{[^}]*cursor:pointer/.test(bridge), "A3c 누를 수 있게 보인다");
  check(/\.mini-book-pick>summary::-webkit-details-marker\{display:none\}/.test(bridge),
    "A3c 브라우저 기본 삼각형 대신 우리 표시를 쓴다");
}

// A3d: **이 개념에 쓸 문장이 앞으로 온다.**
//
// 붙을 수 있는 모든 경우 240가지를 전수로 재다가 찾았다. 책은 개념으로 고르는데 보고서에 넘기는
// 문장은 그냥 앞에서 잘랐다 — 지구과학 '지구의 기후 변화'에 「대멸종 연대기」가 붙는 건 맞는데,
// 넘어가는 문장은 "각 대멸종의 원인을 지층에 남은 화학 흔적으로 추적한다"였다. 좋은 책이 엉뚱한
// 문장을 들고 갔다. 학생은 그걸 자료 카드에 담고, 모델은 그걸 이론적 배경에 인용한다.
{
  const axis = axisFor("지구의 기후 변화");
  const got = matchBooks(books, {
    subject: "지구과학", concept: axis.concept, axisTitle: axis.title,
    keyword: String(axis.output || "").split(/[,、·]/)[0].trim(),
  }, 6, counts, conceptCounts, majorCounts);
  const climate = got.find((b) => b.title === "6도의 멸종");
  check(/기온|해양|빙하|기후/.test(climate.points[0]),
    "A3d 기후 개념에는 기후를 말하는 문장이 먼저 온다", climate.points[0]);
  check(climate.onConcept >= 1, "A3d 그리고 몇 개가 닿는지를 함께 돌려준다", String(climate.onConcept));

  // 점수가 같으면 쓸 문장이 있는 책이 앞이다. 학생은 위에서부터 고른다.
  const same = got.filter((b) => b.score === got[0].score);
  for (let i = 1; i < same.length; i++) {
    check(same[i - 1].onConcept >= same[i].onConcept,
      "A3d 점수가 같으면 쓸 문장이 많은 책이 앞이다",
      JSON.stringify(same.map((b) => `${b.title}:${b.onConcept}`)));
  }

  // 없는 것을 지어내지 않는다. 닿는 문장이 하나도 없어도 원래 문장은 그대로 남는다.
  //
  // 「대멸종 연대기」가 이 자리에서 지층 문장을 들고 가던 것을 보고, 그 책의 내용 조각에 기후 문장을
  // 더했다(고기후를 실제로 다루는 책이다). 그러니 이제는 0이 아니다 — 시험이 그 변화를 잡아냈다.
  const empty = books.find((b) => (b.points || []).length && !b.points.some((one) => /기후|기온|해양/.test(one)));
  check(Boolean(empty), "A3d 닿는 문장이 없는 책도 내용 조각은 그대로 갖고 있다");
  check(got.every((b) => b.points.length > 0), "A3d 후보는 모두 보여 줄 내용이 있다");
}

// A3e: **실제 화면으로 돌려 보고 찾은 버그 둘.**
//
// 코드만 읽어서는 안 보였다. "실생활 활용 사례 화학 탐구 글쓰기" 과제를 브라우저에서 끝까지
// 돌려 보니 참고 도서 칸이 아예 안 나왔다. 까닭이 둘이었다.
{
  // 하나. 이 칸을 자료 수집 패널 **안에만** 넣었는데, 그 패널은 experiment_draft 에서만 그려진다.
  // 학교가 책을 시키는 과제는 대개 글쓰기·논술형이라 가장 필요한 자리에서 빠져 있었다.
  check(/stage === "experiment_draft" \? renderCollectionPanel\(stageResult, rawData\?\.bookChoices\) : renderBookPick\(rawData\?\.bookChoices\)/.test(bridge),
    "A3e 자료 수집 패널이 없는 단계에서도 참고 도서 칸은 나온다");

  // 둘. 이 흐름에는 학생이 교과 개념을 고르는 단계가 없다. selectedConcept 가 빈칸으로 와서
  // 책이 한 권도 안 나왔다. 그럴 때는 우리가 이미 고른 축의 개념을 쓴다.
  check(worker.includes("const careerConcept = careerAxis?.axisId ?"),
    "A3e 개념이 비면 축의 개념을 대신 쓴다");
  check(/concept: reportConcept/.test(worker),
    "A3e 학생이 고른 개념이 있으면 그것이 먼저다");

  // 개념 없이도 책이 나오는지 실제로 재 본다.
  const axis = axisFor("화학과 우리 생활");
  const byAxis = matchBooks(books, {
    subject: "화학", concept: axis.concept, axisTitle: axis.title,
    keyword: String(axis.output || "").split(/[,、·]/)[0].trim(),
  }, 6, counts, conceptCounts, majorCounts);
  check(byAxis.length >= 3, "A3e 축의 개념만으로도 책이 나온다", String(byAxis.length));
}

// A3f: **개념이 없을 때 과제 문구에서 찾는다.**
//
// 실제 화면에는 학생이 교과 개념을 고르는 단계가 없다. 브라우저로 돌려 보니 selectedConcept 가
// 빈칸이었고, 축은 화학 과제인데 통합사회1·미적분1로 잡혔다. 그래서 책이 한 권도 안 나왔다.
{
  const task = "화학 교과 학습 요소를 깊이 있게 탐색한 후 실생활 활용 사례 화학 탐구 글쓰기를 실시한다."
    + " 생활 속에서 화학이 쓰이는 사례(비누·세제, 나일론 같은 합성 섬유)를 하나 골라 원리를 설명하고 보고서로 제출한다.";
  // 흔한 낱말(생활·사례·탐구)만으로는 단원을 정하지 않는다 — 전수 검사(2026-09-19)에서 「발표」 한 낱말로 단원이 잡혔다.
  check(inferConcept("화학", "화학 교과 학습 요소를 탐색한 후 생활 속 사례로 탐구 글쓰기를 한다.", axisIndex) === "",
    "A3f 흔한 낱말만 있으면 고르지 않는다", inferConcept("화학", "화학 교과 학습 요소를 탐색한 후 생활 속 사례로 탐구 글쓰기를 한다.", axisIndex));
  check(inferConcept("화학", task, axisIndex) === "화학과 우리 생활",
    "A3f 과제 문구에서 개념을 찾아낸다", inferConcept("화학", task, axisIndex));
  // 아무 개념이나 집으면 아무 책이나 붙는다. 겹치는 낱말이 없으면 안 고른다.
  check(inferConcept("화학", "zzz qqq", axisIndex) === "", "A3f 겹치는 낱말이 없으면 고르지 않는다");
  check(inferConcept("", task, axisIndex) === "", "A3f 과목을 모르면 고를 수 없다");
  check(inferConcept("화학", "", axisIndex) === "", "A3f 글이 없어도 마찬가지");
  // 다른 과목의 개념을 집지 않는다.
  check(inferConcept("지구과학", "태풍 경로와 악기상 재난 사례를 비교한다", axisIndex) === "태풍과 악기상",
    "A3f 과목 안에서만 고른다", inferConcept("지구과학", "태풍 경로와 악기상 재난 사례를 비교한다", axisIndex));
  check(worker.includes("const reportConcept = (namedConcept && isUnitName(namedConcept) ? namedConcept : '') || listedUnit || guessedConcept || namedConcept || careerConcept"),
    "A3f 학생이 고른 단원 → 화면 목록의 단원 → 과제 문구 → (단원 이름이 아닌) 고른 낱말 → 축의 개념 차례로 쓴다");
  check(/이 탐구가 \*\*앞으로 갈 곳\*\*이라 과제가 선 자리와 다르다/.test(worker),
    "A3f 축은 앞으로 갈 곳이라 과제가 선 자리와 다르다 — 까닭을 적어 둔다");
  // 그리고 **개념 자리에 과목 이름이 온다.** 화면이 selectedConcept 로 '화학'을 보냈다.
  // 빈칸이 아니어서 대비책이 안 걸렸고, '화학'은 과목 이름이라 점수에서 빠져 책이 0권이 됐다.
  check(/const namedConcept = String\(input\.selectedConcept \|\| ''\)[\s\S]{0,160}\? '' : input\.selectedConcept/.test(worker),
    "A3f 개념 자리에 과목 이름이 오면 없는 것으로 친다");

  // **책과 '다음에 해 볼 것'이 같은 자리를 가리켜야 한다.**
  //
  // 최종 보고서를 실제로 만들어 보니, 커피 추출 보고서에 '화학량론 해석 축'이 붙어 "몰비 계산,
  // 반응식 계수 해석"을 하라고 나왔다. 책은 과제 문구로 고쳤는데 이쪽은 아직 축을 쓰고 있었다.
  check(/const reportAxis = axisForConcept\(seedPack\.axisIndex, input\.subject, reportConcept\)\s*\|\| axisForConcept\([\s\S]{0,160}inferConcept\([\s\S]{0,120}\)\)\s*\|\| careerAxis;/.test(worker),
    "A3f 이 보고서가 선 개념의 축을 찾는다 — 이름이 어긋나면 과제 글로 한 번 더(지구 온난화 ↔ 지구의 기후 변화)");
  check(/const axis = reportAxis;/.test(worker),
    "A3f '다음에 해 볼 것'도 그 축을 쓴다 — 책과 같은 자리다");
  check(axisForConcept(axisIndex, "화학", "화학과 우리 생활")?.title === "생활 화학 적용 축",
    "A3f 개념으로 축을 찾아낸다");
  check(axisForConcept(axisIndex, "화학", "없는 개념") === null, "A3f 없는 개념이면 없다");
  check(axisForConcept(axisIndex, "", "") === null, "A3f 빈값에도 터지지 않는다");
}

// A4: 고른 책은 **자료 카드 한 장**이 된다. 거기서부터는 이미 있는 길을 탄다.
{
  const card = { title: "사라진 스푼", type: "도서 · 샘 킨", point: "원소가 자리를 얻는 기준이 원자에 있다.", take: "주기율표를 읽는 법을 알았다" };
  check(pickedBook({ sourceCards: [{ title: "기사", type: "기사" }, card] })?.title === "사라진 스푼",
    "A4 자료 카드 중에서 책을 찾아낸다");
  check(pickedBook({ sourceCards: [{ title: "기사", type: "기사" }] }) === null, "A4 책이 없으면 없다");
  check(pickedBook(null) === null, "A4 카드가 없어도 터지지 않는다");
  check(sourceLine(card) === "사라진 스푼 (도서 · 샘 킨) — 주기율표를 읽는 법을 알았다",
    "A4 참고 자료 절에 괄호가 겹치지 않게 찍힌다", sourceLine(card));
  check(referencesBody({ cards: [card], textbook: "화학 교과서 · 원자의 구조 단원" }).split("\n").length === 2,
    "A4 책이 먼저, 교과서가 마지막 한 줄");
}

// A5: **읽은 소감은 모델이 못 쓴다.** 여기가 이 기능의 선이다.
{
  const card = { title: "사라진 스푼", type: "도서 · 샘 킨", point: "원소가 자리를 얻는 기준이 원자에 있다.", take: "" };
  const rules = bookRules(card).join("\n");
  check(rules.includes("이론적 배경"), "A5 책은 이론적 배경에 녹여 쓴다 — 절을 따로 만들지 않는다");
  check(/읽은 경험이나 감상은 쓰지 않는다/.test(rules), "A5 읽은 경험과 감상은 못 쓴다");
  check(/지어내지 않는다/.test(rules), "A5 우리가 준 내용 밖으로 나가지 못한다");
  check(/책을 주제로 만들지 않는다/.test(rules), "A5 보고서의 주제는 그대로다");
  check(bookRules(null).length === 0 && bookBlock(null).length === 0, "A5 책이 없으면 규칙도 안 붙는다");
  check(bookBlock(card).join("\n").includes("학생이 적지 않음"),
    "A5 학생이 한 줄을 안 썼으면 '안 적음'이라고 알려 준다 — 빈칸을 모델이 채우면 안 된다");
  check(bookBlock(card).join("\n").includes('"지은이": "샘 킨"'), "A5 지은이를 카드에서 바르게 떼어 낸다");
}

// A6: 워커와 화면이 실제로 이어져 있는가.
{
  check(worker.includes("bookChoices") && /bookChoices,\n/.test(worker), "A6 워커가 설계서 응답에 책 후보를 담는다");
  check(/input\.reportStage === STAGE\.DRAFT[\s\S]{0,2600}buildMajorCounts/.test(worker),
    "A6 설계서 단계에서, 진로까지 넣어 고른다");
  check(/major: input\.major \|\| input\.track/.test(worker), "A6 학과가 없으면 계열이라도 쓴다");
  check(bridge.includes("renderBookPick") && bridge.includes("renderCollectionPanel(stageResult, rawData?.bookChoices)"),
    "A6 화면이 그 후보를 받아 그린다");
  check(/collectBookCard\(panel\), \.\.\.collectRefCards\(panel\)/.test(bridge),
    "A6 고른 책이 자료 카드 맨 앞에 붙는다");
  check(/const bookCard = collectBookCard\(panel\);/.test(bridge), "A6 읽기 보고서에서도 책을 센다");
  check(bridge.includes("고른 책은 <b>참고 자료</b>에 들어가고"), "A6 학생이 이 칸이 무엇에 쓰이는지 알 수 있다");
  check(bridge.includes("읽어 두세요"), "A6 그리고 내용은 읽어 두라고 말한다 — 선생님이 물어볼 수 있다");
  check(bridge.includes('value="" checked'), "A6 기본값은 '안 넣을래요'다 — 억지로 붙이지 않는다");
}

// A7: 책은 여전히 **설계서 프롬프트에 안 간다.** 학생이 고르기 전에 모델이 알면 보고서가 그쪽으로 휜다.
{
  check(worker.indexOf("let bookChoices") > worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "A7 후보는 모델을 부른 뒤에 고른다");
  // 응답 객체에 bookChoices 와 promptPreview 가 나란히 있어서 글자 거리로 재면 안 된다. 프롬프트를 만드는
  // 파일이 책 후보를 아예 모르는지를 본다.
  check(!stages.includes("bookChoices"), "A7 프롬프트를 만드는 곳은 책 후보를 아예 모른다");
  check(stages.includes("pickedBook"), "A7 프롬프트에 들어가는 것은 **학생이 고른 뒤**의 자료 카드뿐이다");
}

console.log(`PASS book attach: ${passed}/${passed}`);
