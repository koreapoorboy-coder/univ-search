// 책이 **과제의 대상**이면 책 없이 보고서를 만들지 않는다.
//
// 운영 검사 2026-09-22, 공통국어1 서평 — 두 번 다 같은 일이 벌어졌다.
// 안내문은 「진로 관련 도서를 한 권 골라 읽고 서평을 작성하시오」인데, 도서 단계의 기본값이
// 「도서 없이 진행」이라 학생이 아무것도 안 누르면 책 없는 보고서가 나왔다. 그리고 두 번 다
// 책이 아니라 신문 칼럼을 다루는 글이 나왔다 — 학생이 내면 과제 미이행이다.
//
// 「참고 도서」처럼 곁들이는 과제와는 구분한다. 그런 과제에서는 예전처럼 건너뛸 수 있어야 한다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const flow = await readFile(new URL("../assets/js/decision_flow_v1.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

check(/BOOK_REQUIRED_RE/.test(flow), "책이 꼭 필요한 과제를 가리는 규칙이 있다");
check(/bookRequiredNote/.test(flow) && /id="bookRequiredNote"/.test(html), "못 만들 때 까닭을 적을 자리가 있다");
check(/이 과제는 책을 한 권 정해야 해요/.test(flow), "그 까닭이 학생 말로 적혀 있다");

// 규칙 자체를 실제로 돌려 본다.
const source = flow.match(/const BOOK_REQUIRED_RE = (\/[^\n]+\/);/)?.[1];
check(Boolean(source), "규칙을 꺼내 볼 수 있다");
const rule = eval(source);   // eslint-disable-line no-eval -- 화면 코드의 규칙을 그대로 돌려 본다

const mustBook = [
  "진로 관련 도서를 한 권 골라 읽고 서평을 작성하시오.",
  "읽은 책에 대한 독후감을 제출한다.",
  "자유롭게 도서를 선정하여 독서 감상문을 쓴다.",
  "책을 읽고 인상 깊은 장면을 중심으로 글을 쓴다.",
];
for (const text of mustBook) check(rule.test(text), `책이 대상인 과제로 본다: ${text.slice(0, 18)}…`);

const mayBook = [
  "우리 지역의 사회 문제를 공공데이터로 분석하시오. 참고 도서를 활용해도 좋다.",
  "역학 수레로 가속도를 측정하고 뉴턴 제2법칙을 검증하시오.",
  "관심 있는 주제의 영어 기사를 세 편 찾아 읽고 요약하시오.",
];
for (const text of mayBook) check(!rule.test(text), `곁들이는 과제는 그대로 둔다: ${text.slice(0, 18)}…`);

// B2: 책이 대상이면 **보고서도 그 책을 다뤄야** 한다. 화면이 책을 고르게 하는 것만으로는 모자랐다 —
// 한 번에 쓰는 보고서에는 도서 규칙이 닿지 않아, 책을 골라도 신문 칼럼 분석이 나왔다.
{
  const { bookIsSubject, bookRules } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(bookIsSubject({ taskDescription: "진로 관련 도서를 한 권 골라 읽고 서평을 작성하시오." }),
    "B2 워커도 같은 과제를 「책이 대상」으로 본다");
  check(!bookIsSubject({ taskDescription: "공공데이터를 분석하시오. 참고 도서를 활용해도 좋다." }),
    "B2 곁들이는 도서는 대상이 아니다");

  const book = { title: "아픔이 길이 되려면", type: "도서 · 김승섭" };
  const asSubject = bookRules(book, true).join(" ");
  check(/보고서 전체가 이 책을 다룬다/.test(asSubject), "B2 대상일 때는 보고서 전체가 그 책을 다룬다", asSubject.slice(0, 80));
  check(/다른 소재로 바꾸지 않는다/.test(asSubject), "B2 다른 소재로 갈아타지 못하게 막는다");
  check(/지어내지 않는다/.test(asSubject), "B2 줄거리·인용을 지어내지 못하게 막는다");

  const asSource = bookRules(book, false).join(" ");
  check(/책을 주제로 만들지 않는다/.test(asSource), "B2 곁들이는 도서일 때의 규칙은 그대로다");

  const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
  check(/bookIsSubject\(input\)/.test(worker), "B2 한 번에 쓰는 보고서에도 그 규칙이 닿는다");
}

// B3: 화면에서 고른 도서가 **워커까지 가야** 한다.
// 운영 검사 2026-09-22: 화면에는 책 이름이 보이는데 보내는 값은 빈 칸이었다. 보내는 쪽이 숨은 칸이
// 아니라 창의 값(__BOOK_USAGE_MODE__)과 localStorage 를 먼저 보는데, 이 화면이 그것을 안 고쳤다.
// 도서를 쓰는 과제 전부가 같은 길을 탄다 — 국어만의 일이 아니다.
{
  check(/__BOOK_USAGE_MODE__ = state\.bookMode/.test(flow), "B3 도서 사용 여부를 창의 값에도 적는다");
  check(/ke\.bookUsageMode\.v222/.test(flow), "B3 저장해 둔 값도 함께 고친다");
  const bridge = await readFile(new URL("../assets/js/mini_worker_generate_bridge_v32.js", import.meta.url), "utf8");
  check(/__BOOK_USAGE_MODE__/.test(bridge), "B3 보내는 쪽이 그 값을 본다(그래서 맞춰야 한다)");
}

console.log(`PASS book required: ${passed}/${passed}`);
