// KCI 논문 — 학생이 **열어서 읽을 수 있는** 것만 참고 자료가 된다.
//
// 참고 자료에 논문을 붙이기로 했다. 그런데 유료 논문을 적어 주면 지어내기를 자동화하는 것과 같다 —
// 입학사정관이 "읽어 봤어요?" 하면 바로 드러난다. KCI 응답에는 원문공개여부(orte-org-yn)와 주소가 있다.
// 그 둘을 조건으로 건다. 이 파일은 그 조건이 실제로 지켜지는지만 본다.
//
// 응답 모양은 kci.go.kr의 'KCI Open API 명세서'를 그대로 옮겨 만들었다. 키가 있어야 실제로 부를 수
// 있으므로, **진짜 응답으로 잰 것이 아니다.** 키가 오면 한 번 재고 이 파일을 고쳐야 한다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findPapers, indexPaperLine, paperLine, paperQueries, parsePapers, pickPapers } from "../../../admission_worker_skeleton/kci_v1.mjs";
import { referencesBody } from "../../../admission_worker_skeleton/references_v1.mjs";
import { finalizeStageOutput, normalizeStudentData, STAGE } from "../../../admission_worker_skeleton/report_stages_v1.mjs";

const worker = (await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const index = JSON.parse(await readFile(new URL("../seed/engine-index/kci_paper_index.v1.json", import.meta.url), "utf8"));
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const record = (over = {}) => {
  const it = {
    title: "효소 활성에 미치는 온도의 영향", author2: "", journal: "한국생물교육학회지",
    year: "2021", volume: "49", issue: "3", fpage: "301", lpage: "312",
    open: "Y", url: "https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002740000",
    cited: "3", ...over,
  };
  return `<record>
    <journalInfo>
      <journal-name><![CDATA[${it.journal}]]></journal-name>
      <publisher-name><![CDATA[한국생물교육학회]]></publisher-name>
      <pub-year>${it.year}</pub-year><pub-mon>09</pub-mon>
      <volume>${it.volume}</volume><issue>${it.issue}</issue>
    </journalInfo>
    <articleInfo article-id="ART002740000">
      <article-categories><![CDATA[자연과학]]></article-categories>
      <title-group>
        <article-title lang="original"><![CDATA[${it.title}]]></article-title>
        <article-title lang="english"><![CDATA[Effects of Temperature]]></article-title>
      </title-group>
      <author-group>
        <author english="Hong Gildong"><![CDATA[홍길동(서울대학교)]]></author>
        ${it.author2 ? `<author><![CDATA[${it.author2}]]></author>` : ""}
      </author-group>
      <abstract-group>
        <abstract lang="original"><![CDATA[온도를 달리하여 효소의 반응 속도를 측정하였다.]]></abstract>
      </abstract-group>
      <fpage>${it.fpage}</fpage><lpage>${it.lpage}</lpage>
      <orte-open-yn>${it.open}</orte-open-yn>
      <doi>10.0000/TEST.2021.49.3.301</doi>
      <uci>I410-ECN-0102</uci>
      <citation-count kci="${it.cited}" wos="0"/>
      <url>${it.url}</url>
      <verified>Y</verified>
    </articleInfo>
  </record>`;
};
const wrap = (inner) => `<?xml version="1.0" encoding="UTF-8"?>
<MetaData><inputData><apiCode>articleSearch</apiCode></inputData>
<outputData><result><total>2</total></result>${inner}</outputData></MetaData>`;

// G1: 무엇으로 찾을 것인가. 개념 이름을 통째로 넣으면 0건이 된다 — 조각으로 끊는다.
{
  const chem = paperQueries("동적 평형과 화학 평형");
  check(chem.includes("화학 평형") && chem.includes("동적 평형"), "G1 개념을 조각으로 끊는다", chem.join("·"));
  check(chem[0].length >= chem[chem.length - 1].length, "G1 긴 조각이 앞이다 — 더 정확하다", chem.join("·"));
  check(paperQueries("효소와 대사 반응").includes("대사 반응"), "G1 '효소와 대사 반응' → '대사 반응'");
  check(paperQueries("") .length === 0, "G1 개념이 없으면 안 찾는다 — 과목 이름으로 내려가지 않는다");
  // 혼자서는 아무 주제도 가리키지 못하는 말로 찾으면 온갖 분야가 다 걸린다.
  check(!paperQueries("자료의 분석과 해석").includes("분석"), "G1 '분석' 같은 넓은 말로는 안 찾는다");
  check(paperQueries("가나다라마바사아자차카").length <= 2, "G1 검색어는 많아야 둘 — 호출이 늘면 느려진다");
}

// G2: 응답 읽기. CDATA·원어 제목·저자 소속을 명세대로 읽는다.
{
  const rows = parsePapers(wrap(record()));
  check(rows.length === 1, "G2 한 건을 읽는다", String(rows.length));
  const it = rows[0];
  check(it.title === "효소 활성에 미치는 온도의 영향", "G2 원어 제목을 쓴다 — 영어 제목이 아니다", it.title);
  check(it.authors[0] === "홍길동", "G2 저자는 '홍길동(서울대학교)'로 온다 — 소속을 떼고 이름만", it.authors[0]);
  check(it.journal === "한국생물교육학회지" && it.year === "2021" && it.volume === "49", "G2 학술지·연도·권");
  check(it.open === "Y" && it.url.includes("kci.go.kr"), "G2 원문공개여부와 주소를 읽는다");
  check(it.cited === 3, "G2 피인용 횟수는 속성에 들어 있다", String(it.cited));
  check(it.abstract.includes("반응 속도"), "G2 초록도 읽어 둔다");
  // 실제로 키 없이 불러서 받은 응답이다. 에러는 resultMsg로 온다.
  const real = `<?xml version="1.0" encoding="UTF-8"?><MetaData><inputData><apiCode>articleSearch</apiCode></inputData>`
    + `<outputData><result><resultMsg>필수 요청 파라미터가 없음 =&gt; key</resultMsg></result></outputData></MetaData>`;
  check(parsePapers(real).length === 0, "G2 에러 응답은 0건이다 — 등록되지 않은 key, 사용기간 종료도 같은 모양");
  check(parsePapers("").length === 0 && parsePapers(null).length === 0, "G2 빈 응답도 0건");
}

// G3: **이 파일에서 제일 중요한 규칙.** 학생이 못 여는 논문은 참고 자료가 아니다.
{
  const closed = parsePapers(wrap(record({ open: "N", title: "닫힌 논문" })));
  check(pickPapers(closed).length === 0, "G3 원문이 안 열린 논문은 버린다 — 학생이 못 읽는다");
  const noUrl = parsePapers(wrap(record({ url: "", title: "주소 없는 논문" })));
  check(pickPapers(noUrl).length === 0, "G3 주소가 없으면 버린다 — '어디서 봤다'고 말할 수 없다");
  const many = parsePapers(wrap([record(), record()].join("")));
  check(pickPapers(many).length === 1, "G3 같은 논문이 두 번 걸려도 한 번만");
  const mixed = parsePapers(wrap([
    record({ title: "오래된 것", year: "2014" }),
    record({ title: "닫힌 새 것", year: "2025", open: "N" }),
    record({ title: "열린 새 것", year: "2023" }),
  ].join("")));
  const picked = pickPapers(mixed, 2);
  check(picked.length === 2 && picked[0].title === "열린 새 것", "G3 최근 것이 앞이다", picked.map((o) => o.title).join("·"));
  check(!picked.some((o) => o.title === "닫힌 새 것"), "G3 최근이어도 안 열리면 안 쓴다");
  check(pickPapers(null).length === 0, "G3 아무것도 없으면 아무것도 안 내놓는다");
}

// G4: 참고 자료 한 줄. 저자(연도). 제목. 학술지, 권(호), 쪽. — 주소
{
  const line = paperLine(parsePapers(wrap(record()))[0]);
  check(line.startsWith("홍길동 (2021)."), "G4 저자와 연도가 앞", line);
  check(line.includes("한국생물교육학회지, 49(3), 301-312."), "G4 학술지·권(호)·쪽", line);
  check(line.includes("— https://"), "G4 주소가 반드시 붙는다 — 이게 이 줄을 적어도 되는 조건이다", line);
  check(!/얻은|여기서/.test(line), "G4 '여기서 무엇을 얻었다'고 쓰지 않는다 — 학생이 아직 안 읽었다");
  const three = paperLine({ title: "가", authors: ["김", "이", "박"], year: "2020" });
  check(three.startsWith("김 외 (2020)."), "G4 셋 이상이면 '외'", three);
  check(paperLine({ title: "가", authors: ["김", "이"] }).startsWith("김 · 이."), "G4 둘이면 둘 다 적는다");
  check(paperLine({ title: "" }) === "" && paperLine(null) === "", "G4 제목이 없으면 줄을 안 만든다");
}

// G5: 키가 없으면 **부르지도 않는다.** 키는 워커 비밀로만 들어간다.
{
  let called = 0;
  const spy = async (url) => { called++; return { ok: true, text: async () => wrap(record()) }; };
  check((await findPapers({ concept: "효소와 대사 반응" }, "", { fetchImpl: spy })).length === 0, "G5 키가 없으면 빈 배열");
  check(called === 0, "G5 키가 없으면 호출조차 안 한다", String(called));
  check((await findPapers({ concept: "" }, "KEY", { fetchImpl: spy })).length === 0, "G5 개념이 없어도 안 부른다");
  check(called === 0, "G5 개념이 없으면 호출 0회", String(called));

  const urls = [];
  const ok = async (url) => { urls.push(url); return { ok: true, text: async () => wrap(record()) }; };
  const found = await findPapers({ concept: "효소와 대사 반응" }, "MY-KEY", { fetchImpl: ok, limit: 2 });
  check(found.length === 1, "G5 찾으면 돌려준다", String(found.length));
  check(urls[0].includes("apiCode=articleSearch") && urls[0].includes("key=MY-KEY"), "G5 명세대로 부른다", urls[0]);
  check(urls[0].includes(encodeURIComponent("대사 반응")), "G5 title 에 검색어가 들어간다", urls[0]);
  check(urls[0].startsWith("https://open.kci.go.kr/po/openapi/openApiSearch.kci"), "G5 명세에 적힌 주소", urls[0]);

  // 실패해도 보고서는 그대로 나가야 한다.
  const dead = async () => { throw new Error("네트워크"); };
  check((await findPapers({ concept: "효소" }, "KEY", { fetchImpl: dead })).length === 0, "G5 실패하면 조용히 0건");
  const bad = async () => ({ ok: false, text: async () => "" });
  check((await findPapers({ concept: "효소" }, "KEY", { fetchImpl: bad })).length === 0, "G5 응답이 나쁘면 0건");
}

// G6: 참고 자료에서의 자리. 학생이 적은 것 → 논문 → 공개 자료 → 교과서.
{
  const papers = pickPapers(parsePapers(wrap(record())));
  const card = { title: "부엌의 화학자", type: "도서 · 라파엘 오몽", take: "온도가 녹는 정도를 바꾼다는 걸 알았다" };
  const data = [{ title: "화학사고정보", org: "화학물질안전원", id: "15048783" }];
  const body = referencesBody({ cards: [card], papers, datasets: data, textbook: "생명과학Ⅰ 교과서 · 효소와 대사 반응 단원" });
  const lines = body.split(String.fromCharCode(10));
  check(lines.length === 4, "G6 학생 자료 + 논문 + 공개 자료 + 교과서", String(lines.length));
  check(lines[0].includes("부엌의 화학자"), "G6 학생이 실제로 본 것이 맨 앞");
  check(lines[1].includes("한국생물교육학회지"), "G6 논문은 학생 자료 뒤", lines[1]);
  check(lines[2].includes("data.go.kr"), "G6 공개 자료는 논문 뒤", lines[2]);
  check(lines[3].includes("교과서"), "G6 교과서는 마지막");
  check(referencesBody({ cards: [card], textbook: "가 교과서 · 나 단원" }).split(String.fromCharCode(10)).length === 2,
    "G6 논문이 없으면 예전과 같다");
}

// G7: **끝에서부터 본다.** 앞서 buildReferencesBody 를 빠뜨려 공개 자료가 보고서에 안 붙은 적이 있다.
{
  const papers = pickPapers(parsePapers(wrap(record())));
  const whole = finalizeStageOutput(STAGE.FINAL, { sections: [{ title: "결론", body: "끝." }] }, {
    subject: "생명과학", textbookCitation: "생명과학Ⅰ 교과서 · 효소와 대사 반응 단원",
    referencePapers: papers, referenceDatasets: [],
    studentData: normalizeStudentData({
      conditions: [{ label: "가", values: ["1", "2"] }, { label: "나", values: ["3", "4"] }],
    }),
  });
  const built = whole.parsed.sections.find((one) => /참고 자료/.test(one.title))?.body || "";
  check(built.includes("한국생물교육학회지"), "G7 최종 보고서의 참고 자료 절에 실제로 붙는다", built);
  check(built.includes("kci.go.kr"), "G7 주소까지 붙는다 — 학생이 열어 확인할 수 있다", built);
}

// G8: 워커는 **인덱스에서** 논문을 꺼낸다. 남의 서버를 보고서 만드는 길에 끼우지 않는다.
{
  check(worker.includes("kciPaperIndex: 'engine-index/kci_paper_index.v1.json'"), "G8 워커가 논문 인덱스를 읽는다");
  check(worker.includes("input.referencePapers = []"), "G8 못 찾아도 빈 배열로 시작한다");
  check(worker.indexOf("input.referencePapers") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "G8 AI를 부르기 전에 찾아 둔다 — 그래야 참고 자료 절이 쓸 수 있다");
  check(!/findPapers\(/.test(worker),
    "G8 KCI 를 보고서마다 부르지 않는다 — 공공데이터포털 KCI API 는 검색이 없고 한 쪽에 10줄만 준다");
  check(/reportStage !== STAGE\.DRAFT[\s\S]{0,400}kciPaperIndex/.test(worker),
    "G8 1단계(설계서)에서는 안 붙인다 — 그때는 아직 개념이 흔들린다");
  // 개념 이름이 교육과정 단원 이름과 다를 때가 있다. 대학 연구에서 겪은 그대로다.
  check(/for \(const name of \[reportConcept, axisConceptName\(seedPack, reportAxis\)\]/.test(worker),
    "G8 개념 이름으로 못 찾으면 축의 단원 이름으로 한 번 더 찾는다");
}

// G9: 인덱스에서 온 줄. **주소가 없다.** 그래도 찾을 수 있게 서지사항을 정확히 적는다.
{
  const row = { title: "국어 폐쇄음의 음향적 특성과 음운 현상", author: "홍길동", with: "김철수",
    journal: "한국어학", year: "2024", volume: "12", issue: "3", from: "1", to: "20" };
  const line = indexPaperLine(row);
  check(line === "홍길동 · 김철수 (2024). 국어 폐쇄음의 음향적 특성과 음운 현상. 한국어학, 12(3), 1-20.",
    "G9 저자·연도·제목·학술지·권(호)·쪽", line);
  check(!/http/.test(line), "G9 주소가 없다 — 파일 자료에 논문 번호가 없다");
  check(indexPaperLine({ title: "가", author: "김", with: "이, 박" }).startsWith("김 외."),
    "G9 셋 이상이면 '외'");
  check(indexPaperLine({ title: "" }) === "" && indexPaperLine(null) === "", "G9 제목이 없으면 줄이 없다");
  // 참고 자료 절에 실제로 들어간다.
  const body = referencesBody({ papers: [row], textbook: "공통국어1 교과서 · 음운 변동과 국어 규범 단원" });
  check(body.split(String.fromCharCode(10))[0].includes("한국어학"), "G9 참고 자료 첫 줄이 논문", body);
  check(index.version === "kci-paper-index-v1" && Object.keys(index.concepts).length >= 20,
    "G9 인덱스가 있고 개념 20개 이상에 붙는다", String(Object.keys(index.concepts || {}).length));
  check(index.license.includes("제한 없음"), "G9 이용허락을 적어 둔다");
}

console.log(`\n${passed} checks passed`);
