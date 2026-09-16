// 읽을거리 추천 — 책과 공공데이터. 둘 다 규칙이 같다: **근거가 없으면 안 내놓는다.**
//
// 사용자의 걱정이 이 파일의 이유다. "책을 붙이면 무조건 붙이려 들고, 그러면 억지로 끼워 맞춘 보고서가
// 된다." 맞는 걱정이었고, 처음 잰 결과가 그대로였다 — 화학 반응식에 「국화와 칼」이 붙었다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildConceptCounts, buildWordCounts, matchBooks, MIN_SCORE, scoreBook, wantsBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";
import { datasetUrl, orgRank, pickRows, searchTerms, usable } from "../../../admission_worker_skeleton/public_data_v1.mjs";

const books = JSON.parse(await readFile(new URL("../seed/engine-index/book_match_index.v1.json", import.meta.url), "utf8")).books;
const terms = JSON.parse(await readFile(new URL("../seed/engine-index/public_data_terms.v1.json", import.meta.url), "utf8"));
const axisIndex = JSON.parse(await readFile(new URL("../seed/engine-index/longitudinal_axis_index.v1.json", import.meta.url), "utf8"));
const counts = buildWordCounts(books);
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// B1: 과목이 안 맞으면 탈락이다. 점수로 뒤집을 수 없어야 한다.
{
  const offSubject = scoreBook(books[0], { subject: "지구과학", terms: ["사회 구조와 권력", "전체주의"] }, counts);
  check(offSubject.score === 0 && offSubject.onSubject === false,
    "B1 a book not linked to the subject scores nothing at all, whatever else it shares");
}

// B2: 흔한 낱말로는 못 걸린다. 재 보니 억지는 전부 흔한 낱말로 걸린 것들이었다.
{
  const common = [...counts.entries()].filter(([, n]) => n > 100).map(([word]) => word);
  check(common.length > 0, "B2 some tag words really are everywhere", common.slice(0, 3).join(", "));
  check(MIN_SCORE === 6, "B2 and the bar is set above what one common word can reach", String(MIN_SCORE));
  const vague = matchBooks(books, { subject: "화학", concept: "물질의 양과 화학 반응식", keyword: "화학" }, 3, counts);
  check(!vague.some((b) => b.title.includes("국화와 칼")),
    "B2 화학 반응식에 「국화와 칼」이 다시 붙지 않는다 — 처음 잰 결과가 그것이었다", JSON.stringify(vague.map((b) => b.title)));
}

// B3: 수학 계산 단원에는 책을 안 붙인다. 이차함수에 「팩트풀니스」가 8점으로 붙었다.
{
  for (const subject of ["공통수학1", "공통수학2", "미적분1", "기하", "확률과 통계"]) {
    check(!wantsBooks(subject), `B3 ${subject} gets no books`);
    check(matchBooks(books, { subject, concept: "이차방정식과 이차함수", keyword: "그래프" }, 3, counts).length === 0,
      `B3 and asking anyway returns nothing for ${subject}`);
  }
  check(wantsBooks("지구과학") && wantsBooks("통합사회1"), "B3 the subjects that do work are untouched");
  check(!wantsBooks(""), "B3 no subject, no books");
}

// B4: 왜 걸렸는지를 댈 수 있어야 한다. 이유를 못 대는 추천은 억지와 구별되지 않는다.
{
  const found = matchBooks(books, { subject: "지구과학", concept: "태양계 천체의 관측과 운동", keyword: "관측" }, 3, counts);
  check(found.length > 0, "B4 지구과학 천체 단원에는 책이 있다", JSON.stringify(found.map((b) => b.title)));
  check(found.every((b) => b.why.length > 0), "B4 and every one of them names the word it matched on");
  check(found.some((b) => b.title.includes("코스모스")), "B4 코스모스가 나온다", JSON.stringify(found.map((b) => b.title)));
}

// B5: **개념에 흔한 말**로도 못 걸린다. 책에 흔한 말만 걸렀더니 이게 남아 있었다.
//
// 과학탐구실험2는 개념 여섯 개가 모두 "…탐구"로 끝난다. 그래서 「코스모스」가 '탐구' 한 낱말로 내진 설계와
// 구조 안정성에도, 첨단 센서에도 붙었다. 「의사와 수의사가 만나다」는 '비교'로 기본량과 단위에 붙었다.
// 세는 자리는 **그 과목 안**이다 — 전체에서 세면 '경제'가 여러 과목에 흔하다는 이유로 통합사회의 「넛지」까지
// 떨어진다. 152개 개념을 전부 재서 정했다.
{
  const conceptCounts = buildConceptCounts(axisIndex);
  // 실제 축에서 그대로 꺼내 쓴다 — 워커가 넘기는 값과 같아야 시험이 의미가 있다.
  const axisFor = (concept) => Object.values(axisIndex.axes).find((one) => one.concept === concept);
  const at = (subject, concept) => {
    const axis = axisFor(concept);
    return matchBooks(books, {
      subject, concept, keyword: String(axis?.output || "").split(/[,、·]/)[0].trim(), axisTitle: axis?.title,
    }, 3, counts, conceptCounts).map((b) => b.title);
  };

  const 탐구 = conceptCounts.get("과학탐구실험")?.get("탐구") || 0;
  check(탐구 > 2, "B5 '탐구'는 과학탐구실험 개념 여러 곳에 나온다 — 어느 개념인지 못 가린다", String(탐구));
  check(!at("과학탐구실험2", "내진 설계와 구조 안정성 탐구").includes("코스모스"),
    "B5 그래서 「코스모스」가 내진 설계에 붙지 않는다");
  check(!at("통합과학1", "기본량과 단위").includes("의사와 수의사가 만나다"),
    "B5 '비교' 하나로 기본량과 단위에 붙지도 않는다");

  // 과목 안에서 세기 때문에, 그 과목에서 뜻을 가리는 말은 그대로 산다.
  check(at("통합사회2", "시장경제와 지속가능발전").includes("넛지"),
    "B5 통합사회의 「넛지」는 남는다 — '경제'는 통합사회 안에서 개념을 가린다");
  check(at("지구과학", "태풍과 악기상").includes("날씨가 바꾼 세계의 역사"),
    "B5 태풍은 지구과학 안에서 한 개념만 가리키므로 그대로 걸린다");

  // 이 규칙이 없으면 다시 붙는다.
  const 내진 = axisFor("내진 설계와 구조 안정성 탐구");
  const 규칙없이 = matchBooks(books, {
    subject: "과학탐구실험2", concept: 내진.concept,
    keyword: String(내진.output || "").split(/[,、·]/)[0].trim(), axisTitle: 내진.title,
  }, 3, counts);
  check(규칙없이.some((b) => b.title.includes("코스모스")), "B5 규칙을 빼면 「코스모스」가 되돌아온다 — 이 시험이 지키는 것");
}

// B6: **무엇을 하는가**를 가리키는 말로는 못 걸린다.
//
// 실제 수행평가 1537건에 다 붙여 보고 찾았다. 남은 억지가 전부 이런 말로 걸려 있었다 —
// 「페르마의 마지막 정리」가 '문제'로 정보의 알고리즘 설계에, 「닥터스 씽킹」이 '사례'로 선조들의
// 과학 기술에, 「경영학 콘서트」가 '자료'로 인권 보장과 헌법에 붙었다.
//
// 두 갈래다. '사례'·'문제'는 **개념 이름에 있어도** 못 쓴다 — 이름에 있다고 주제가 되지 않는다.
// '자료'·'분석'은 개념 이름에 있을 때만 쓴다 — 정보의 '자료와 정보의 분석'에서는 그게 주제다.
{
  const conceptCounts = buildConceptCounts(axisIndex);
  const axisFor2 = (concept) => Object.values(axisIndex.axes).find((one) => one.concept === concept);
  const at = (subject, concept) => {
    const axis = axisFor2(concept);
    return matchBooks(books, {
      subject, concept, keyword: String(axis?.output || "").split(/[,、·]/)[0].trim(), axisTitle: axis?.title,
    }, 6, counts, conceptCounts).map((b) => b.title);
  };
  check(!at("정보", "추상화와 문제 분해").includes("페르마의 마지막 정리"),
    "B6 '문제'는 개념 이름에 있어도 못 쓴다 — 수학책이 알고리즘 설계에 붙었다");
  check(!at("과학탐구실험1", "우리 선조들의 과학 기술 발전 사례 찾기").includes("닥터스 씽킹"),
    "B6 '사례'도 마찬가지 — 진료 이야기가 선조들의 과학 기술에 붙었다");
  check(!at("통합사회2", "인권 보장과 헌법").includes("경영학 콘서트"),
    "B6 '자료'는 개념 이름에 없으면 못 쓴다");

  // 여기서 막으면 안 되는 것들. 낱말마다 무엇이 사라지는지 하나씩 재고 정했다.
  check(at("정보", "자료와 정보의 분석").includes("팩트풀니스"),
    "B6 그래도 '자료와 정보의 분석'에는 「팩트풀니스」가 남는다 — 거기선 그게 주제다");
  check(at("통합과학2", "산화와 환원").includes("세상은 온통 화학이야"),
    "B6 '반응'은 안 막는다 — 막으면 산화와 환원이 빈다");
  check(at("통합과학1", "생명 시스템").includes("생명의 도약"),
    "B6 '현상'도 안 막는다 — 막으면 생명 시스템이 빈다");
  check(at("과학탐구실험1", "과학사에서 동시 발견으로 이룬 과학 발전 추적하기").includes("부분과 전체"),
    "B6 '과학사'도 안 막는다 — 과학사 단원에서는 그게 주제다");
}

// B7: **국어가 가장 어려운 자리다.** 개념 이름끼리 말이 겹친다.
//
// 국어 12개 개념을 전수로 펼쳐 보고 찾았다. 축 이름과 산출물에 '글쓰기'·'성찰'·'소통'·'문장'·'토론'이
// 깔려 있어서, 아무 국어 책이나 아무 개념에 붙었다 — 「대통령의 글쓰기」가 교술 갈래에, 「마의 산」이
// 교술 갈래에, 「철학적 탐구」가 화법 단원에, 「유시민의 글쓰기 특강」이 소설 구조 분석에.
{
  const conceptCounts = buildConceptCounts(axisIndex);
  const axisFor3 = (concept) => Object.values(axisIndex.axes).find((one) => one.concept === concept);
  const at = (subject, concept) => {
    const axis = axisFor3(concept);
    return matchBooks(books, {
      subject, concept, keyword: String(axis?.output || "").split(/[,、·]/)[0].trim(), axisTitle: axis?.title,
    }, 6, counts, conceptCounts).map((b) => b.title);
  };
  const 교술 = at("공통국어1", "교술 갈래와 성찰적 표현");
  check(!교술.includes("대통령의 글쓰기") && !교술.includes("마의 산"),
    "B7 '글쓰기'·'성찰'이 축 이름에 있다고 아무 책이나 교술 갈래에 붙지 않는다", JSON.stringify(교술));
  check(!at("공통국어1", "서사·극 갈래와 이야기 구성").includes("유시민의 글쓰기 특강"),
    "B7 '구성'은 개념 이름에 있어도 못 쓴다 — 글쓰기 책이 소설 구조 분석에 붙었다");
  check(!at("공통국어1", "공동체 의사소통과 공감").includes("철학적 탐구"),
    "B7 '소통' 하나로 비트겐슈타인이 화법 단원에 붙지 않는다");
  check(!at("공통국어2", "과학 기술과 인간·미래 사회 성찰").includes("어떻게 읽을 것인가"),
    "B7 '토론' 하나로 독서법 책이 기술 윤리 단원에 붙지 않는다");

  // 막았어도 제자리는 지킨다. 개념 이름에 있을 때는 그대로 쓴다.
  check(at("공통국어1", "사회적 쟁점 글쓰기와 문장 구성").includes("유시민의 글쓰기 특강"),
    "B7 글쓰기가 주제인 개념에는 글쓰기 책이 그대로 있다");
  check(at("공통국어1", "비판적 읽기와 토론").includes("어떻게 읽을 것인가"),
    "B7 토론이 주제인 개념도 마찬가지");
  check(at("공통국어2", "과학 기술과 인간·미래 사회 성찰").includes("마의 산"),
    "B7 '성찰'이 개념 이름에 있는 곳에는 남는다");

  // 그리고 빈 자리를 책으로 채웠다. 규칙으로 자르기만 하면 국어가 비어 버린다.
  for (const [subject, concept, title] of [
    ["공통국어1", "교술 갈래와 성찰적 표현", "월든"],
    ["공통국어1", "음운 변동과 국어 규범", "한글의 탄생"],
    ["공통국어1", "공동체 의사소통과 공감", "비폭력대화"],
  ]) check(at(subject, concept).includes(title), `B7 ${concept} 에는 「${title}」이 들어갔다`, JSON.stringify(at(subject, concept)));
}

// B8: **실제 과제가 가장 많이 서는 자리**를 채웠다.
//
// 실제 수행평가 7131건에 다 붙여 보니, 책이 없는데 과제가 132건이나 서는 자리가 있었다 —
// 화학 '화학과 우리 생활'이다. 걸림돌은 데이터였다: 「세상은 온통 화학이야」가 바로 그 책인데
// 태그에 '일상'이라 적혀 있고 교육과정은 '생활'이라 쓴다. 같은 뜻인데 글자가 달라서 안 붙었다.
{
  const conceptCounts = buildConceptCounts(axisIndex);
  const axisFor4 = (subject, concept) => Object.values(axisIndex.axes)
    .find((one) => one.subject === subject && one.concept === concept);
  const at = (subject, concept) => {
    const axis = axisFor4(subject, concept);
    return matchBooks(books, {
      subject, concept, keyword: String(axis?.output || "").split(/[,、·]/)[0].trim(), axisTitle: axis?.title,
    }, 6, counts, conceptCounts).map((b) => b.title);
  };
  const daily = at("화학", "화학과 우리 생활");
  check(daily.length >= 3, "B8 화학과 우리 생활이 더 이상 비어 있지 않다", JSON.stringify(daily));
  check(daily.includes("세상은 온통 화학이야"),
    "B8 '일상'만 적혀 있던 책이 이제 걸린다 — 교육과정은 '생활'이라 쓴다");
  check(daily.includes("역사를 바꾼 17가지 화학 이야기"), "B8 생활·산업 화학 책이 들어갔다");
  check(at("화학", "탄소 화합물의 유용성").includes("탄소 문명"), "B8 탄소 단원도 채웠다");

  // 채운다고 아무거나 넣지 않는다. 근거가 없으면 여전히 비워 둔다.
  check(at("화학", "화학 반응에서의 동적 평형").length === 0,
    "B8 동적 평형은 그대로 비워 둔다 — 맞는 책이 없으면 안 넣는다",
    JSON.stringify(at("화학", "화학 반응에서의 동적 평형")));
}

// D1: 공공데이터는 **개념에 달린 말만** 쓴다. 과목으로 내려가면 한 과목의 모든 개념에 같은 자료가 붙는다.
{
  check(!terms.bySubject, "D1 the subject-level fallback is gone — 화학의 모든 개념에 먹는샘물 수질검사가 붙었다");
  check(searchTerms(terms, { concept: "원자의 구조", subject: "화학" }).length === 0,
    "D1 a concept with no terms of its own gets nothing, even though 화학 has plenty elsewhere");
  check(searchTerms(terms, { concept: "태풍과 악기상" }).includes("태풍"), "D1 a concept that does have terms uses them");
  check(searchTerms(terms, {}).length === 0, "D1 and no concept means no search");
}

// D2: 낱말은 좁아야 한다. 넓은 말은 아무 자료나 물어 온다.
{
  const words = [...new Set(Object.values(terms.byConcept).flat())];
  for (const vague of ["통계", "공공데이터", "정보화", "안전", "인구", "고용", "복지"]) {
    check(!words.includes(vague), `D2 ${vague} was measured and dropped — it pulled in anything`);
  }
  for (const wrong of ["화산", "전파", "스마트폰", "도서관"]) {
    check(!words.includes(wrong), `D2 ${wrong} was dropped — it matched inside другие words (영화산업, 조기경보 전파…)`.replace("другие", "other"));
  }
  check(words.includes("태풍") && words.includes("지진") && words.includes("전자파"),
    "D2 the words that measured well are kept");
}

// D3: 0건인 말은 사전에 없다. 재 보고 확인한 것만 남겼다.
{
  const words = [...new Set(Object.values(terms.byConcept).flat())];
  for (const empty of ["기후변화", "생물다양성", "인터넷이용", "희귀질환", "산림탄소", "독서실태"]) {
    check(!words.includes(empty), `D3 ${empty} returned nothing from the real API and is not in the file`);
  }
}

// D4: 행정 업무용 자료는 참고 자료가 아니고, 지자체 자료는 뒤로 간다.
{
  check(usable({ title: "대기오염집중측정소 대기오염측정자료" }, terms), "D4 a real measurement dataset is usable");
  check(!usable({ title: "공동주택하자담보책임기간정보제공서비스" }, terms), "D4 an administrative one is not");
  check(!usable({ title: "○○시 정보화교육 정보" }, terms), "D4 nor a local training course listing");
  check(!usable({ title: "" }, terms) && !usable(null, terms), "D4 and an empty row is not a dataset");

  const central = orgRank({ org_nm: "기상청" }, terms);
  const other = orgRank({ org_nm: "한국무슨무슨원" }, terms);
  const local = orgRank({ org_nm: "경기도 광명시" }, terms);
  check(central < other && other < local, "D4 중앙기관 → 그 밖 → 지자체 순서", `${central} < ${other} < ${local}`);
}

// D5: 같은 자료가 연도만 바꿔 여러 번 올라와 있다. 한 번만 센다.
{
  const rows = [
    { title: "한국환경공단_에어코리아_대기오염정보_20240101", org_nm: "한국환경공단", list_id: "1" },
    { title: "한국환경공단_에어코리아_대기오염정보_20250101", org_nm: "한국환경공단", list_id: "2" },
    { title: "대기오염집중측정소 대기오염측정자료", org_nm: "국립환경과학원", list_id: "3" },
  ];
  const picked = pickRows(rows, terms, 3);
  check(picked.length === 2, "D5 the same dataset with a different date is one dataset", JSON.stringify(picked.map((p) => p.title)));
  check(picked.every((p) => !/_\d{8}$/.test(p.title)), "D5 and the date is not shown to the student");
  check(picked[0].org === "국립환경과학원", "D5 중앙기관이 앞", picked[0].org);
}

// D6: 학생이 열어 볼 수 있어야 한다. 그게 이 기능의 전부다.
{
  check(datasetUrl("15077093") === "https://www.data.go.kr/data/15077093/openapi.do", "D6 each dataset links to its own page");
  check(datasetUrl("") === "https://www.data.go.kr", "D6 and a row with no id still goes somewhere real");
}

console.log(`PASS suggestions: ${passed}/${passed}`);
