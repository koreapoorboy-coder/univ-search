// 읽을거리 추천 — 책과 공공데이터. 둘 다 규칙이 같다: **근거가 없으면 안 내놓는다.**
//
// 사용자의 걱정이 이 파일의 이유다. "책을 붙이면 무조건 붙이려 들고, 그러면 억지로 끼워 맞춘 보고서가
// 된다." 맞는 걱정이었고, 처음 잰 결과가 그대로였다 — 화학 반응식에 「국화와 칼」이 붙었다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildWordCounts, matchBooks, MIN_SCORE, scoreBook, wantsBooks } from "../../../admission_worker_skeleton/book_match_v1.mjs";
import { datasetUrl, orgRank, pickRows, searchTerms, usable } from "../../../admission_worker_skeleton/public_data_v1.mjs";

const books = Object.values(JSON.parse(await readFile(new URL("../seed/book-engine/mini_book_engine_books_starter.json", import.meta.url), "utf8")));
const terms = JSON.parse(await readFile(new URL("../data/public_data_terms.v1.json", import.meta.url), "utf8"));
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
