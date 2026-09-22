// 학생이 짚은 단원은 끝까지 학생의 것이어야 한다 (assets/js/unit_choice_picker_v1.js).
//
// 운영 검사 2026-09-22, 통합사회1. 학생이 「인구 변화 · 저출산 · 고령화」를 손으로 짚은 뒤
// 전공에서 행정학과를 골랐더니, 목록 차례가 다시 매겨지면서 맨 위가 자동으로 다시 골라졌다.
// 학생이 짚은 단원은 「사회 정의와 불평등」으로 조용히 바뀌었고, conceptPicked 는 true 로
// 남아 있었다 — **우리가 고른 것을 학생이 고른 것처럼** 워커에 알린 것이다. 워커는 그 값을
// 믿고 과제 글이 말한 단원까지 밀어낸다.
//
// 화면 코드라서 진짜 브라우저가 없지만, 이 파일이 쓰는 만큼의 DOM 만 흉내 내어 실제로 돌린다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// ── 아주 작은 DOM ───────────────────────────────────────────────────────────
class Elem {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this._class = "";
    this._text = "";
    this._handlers = {};
    this.parentNode = null;
    this.hidden = false;
    this.value = "";
    this.type = "";
    this.id = "";
    this.classList = {
      add: (name) => { if (!this._class.split(/\s+/).includes(name)) this._class = `${this._class} ${name}`.trim(); },
      remove: (name) => { this._class = this._class.split(/\s+/).filter((one) => one && one !== name).join(" "); },
      contains: (name) => this._class.split(/\s+/).includes(name),
    };
  }
  get className() { return this._class; }
  set className(value) { this._class = String(value || ""); }
  get textContent() { return this._text || this.children.map((one) => one.textContent).join("\n"); }
  set textContent(value) { this._text = String(value ?? ""); this.children = []; }
  set innerHTML(value) { if (!value) { this.children = []; this._text = ""; } }
  appendChild(child) { child.parentNode = this; this.children.push(child); if (child.id) byId.set(child.id, child); return child; }
  insertBefore(child) { return this.appendChild(child); }
  setAttribute(name, value) { if (name.startsWith("data-")) this.dataset[name.slice(5)] = value; }
  addEventListener(name, fn) { (this._handlers[name] = this._handlers[name] || []).push(fn); }
  dispatchEvent() { return true; }
  click() { (this._handlers.click || []).forEach((fn) => fn({ target: this })); }
  closest() { return null; }
  querySelectorAll(selector) {
    const want = String(selector).replace(/^\./, "");
    const out = [];
    const walk = (node) => { for (const one of node.children) { if (one._class.split(/\s+/).includes(want)) out.push(one); walk(one); } };
    walk(this);
    return out;
  }
  get offsetParent() { return this.parentNode; }
}

const byId = new Map();
const makeField = (id) => { const el = new Elem("input"); el.id = id; byId.set(id, el); return el; };
const anchor = makeField("interpretationActions");
anchor.parentNode = new Elem("div");
makeField("interpretedModes");
makeField("subject").value = "통합사회1";
makeField("selectedConcept");
makeField("keyword");
makeField("conceptPicked");
makeField("taskDescription");
makeField("correctionMethod");
makeField("methodPicked");
makeField("subjectGroup");

let activeMajor = null;   // #majorStep 에서 눌린 단추 (없으면 null)

const document = {
  readyState: "complete",
  head: new Elem("head"),
  body: new Elem("body"),
  createElement: (tag) => new Elem(tag),
  getElementById: (id) => byId.get(id) || null,
  addEventListener: () => {},
  querySelector: (selector) => {
    const text = String(selector);
    if (/#majorStep/.test(text)) return activeMajor;
    const id = text.match(/^#([\w-]+)$/)?.[1];
    if (id) return byId.get(id) || null;
    return null;
  },
  querySelectorAll: () => [],
};
document.body.appendChild = (child) => { if (child.id) byId.set(child.id, child); child.parentNode = document.body; document.body.children.push(child); return child; };
document.head.appendChild = (child) => child;

const indexUrl = new URL("../seed/engine-index/unit_choices.v1.json", import.meta.url);
const indexDoc = JSON.parse(await readFile(indexUrl, "utf8"));

const window = {
  document,
  MutationObserver: class { observe() {} },
  CustomEvent: class { constructor(name, init) { this.type = name; Object.assign(this, init); } },
  Event: class { constructor(name) { this.type = name; } },
  fetch: async () => ({ ok: true, json: async () => indexDoc }),
  dispatchEvent: () => true,
  setTimeout,
  addEventListener: () => {},
};
window.window = window;
globalThis.document = document;
globalThis.MutationObserver = window.MutationObserver;
globalThis.CustomEvent = window.CustomEvent;
globalThis.Event = window.Event;
globalThis.fetch = window.fetch;
globalThis.window = window;

// ── 화면 코드를 그대로 돌린다 ───────────────────────────────────────────────
const source = await readFile(new URL("../assets/js/unit_choice_picker_v1.js", import.meta.url), "utf8");
new Function("window", "document", "MutationObserver", "CustomEvent", "Event", "fetch", "setTimeout", source)(
  window, document, window.MutationObserver, window.CustomEvent, window.Event, window.fetch, setTimeout);

const picker = window.__UNIT_CHOICE__;
check(Boolean(picker && picker.show), "화면 코드가 올라온다");

const state = () => ({
  concept: byId.get("selectedConcept").value,
  keyword: byId.get("keyword").value,
  picked: byId.get("conceptPicked").value,
});
const rowsOnScreen = () => anchor.parentNode.querySelectorAll("uc-item");

// P1: 아무것도 안 눌렀으면 맨 위가 골라져 있고, 「학생이 골랐다」고 말하지 않는다.
let rows = await picker.show({ subject: "통합사회1", major: "", track: "사회" });
check(rows.length > 1, "단원 후보가 여러 개 나온다", String(rows.length));
check(state().concept === rows[0].concept, "맨 위가 미리 골라져 있다", state().concept);
check(state().picked === "false", "미리 골라 둔 것은 학생이 고른 것이 아니다", state().picked);

// P2: 학생이 두 번째 줄을 손으로 짚는다.
const second = rows[1];
rowsOnScreen()[1].click();
check(state().concept === second.concept, "짚은 단원이 들어간다", state().concept);
check(state().picked === "true", "그때는 학생이 골랐다고 말한다", state().picked);

// P3: 그다음 전공을 고른다 — 차례가 바뀌어도 학생이 짚은 단원은 그대로다. (이 검사가 막는 흠)
activeMajor = new Elem("button");
activeMajor.dataset.major = "행정학과";
const reranked = await picker.show({ subject: "통합사회1", major: "행정학과", track: "사회" });
check(reranked[0].concept !== second.concept, "전공을 고르면 차례가 실제로 바뀐다", reranked[0].concept);
check(state().concept === second.concept, "그래도 학생이 짚은 단원이 남는다", state().concept);
check(state().picked === "true", "그리고 그것은 여전히 학생이 고른 것이다", state().picked);
const on = rowsOnScreen().filter((one) => one.classList.contains("is-on"));
check(on.length === 1 && on[0].textContent.includes(second.concept), "화면에도 그 줄이 켜져 있다", on.map((o) => o.textContent).join("|"));

// P4: 과목이 바뀌어 짚은 단원이 사라지면, 더는 「학생이 골랐다」고 말하지 않는다.
byId.get("subject").value = "물리";
const other = await picker.show({ subject: "물리", major: "", track: "자연" });
check(other.length > 0, "다른 과목에도 후보가 있다", String(other.length));
check(state().concept === other[0].concept, "새 과목의 맨 위가 골라진다", state().concept);
check(state().picked === "false", "사라진 선택을 학생이 고른 것처럼 말하지 않는다", state().picked);

// P5: 안내문 글자만으로도 맞는 단원을 찾아 맨 위에 둔다.
// 2026-09-22 운영 검사: 물리 「역학 수레 … 가속도를 측정 … 뉴턴 운동 제2법칙」 과제에
// 자기장·전기·빛의 이중성·상대성·열 다섯 줄이 떴다. 「힘과 운동」은 ㄱㄴㄷ 순으로 맨 끝이라
// 다섯 줄 밖으로 밀려 아예 보이지 않았다.
byId.get("taskDescription").value = "역학 수레에 작용하는 힘을 달리하며 가속도를 측정하고, 힘과 가속도의 관계를 그래프로 나타내어 뉴턴 운동 제2법칙을 검증하시오.";
const physics = await picker.show({ subject: "물리", major: "", track: "" });
check(physics[0].concept === "힘과 운동", "안내문이 말한 단원이 맨 위에 온다", physics[0].concept);
check(physics[0].why === "task", "그리고 안내문에서 읽었다고 말한다", physics[0].why);
check(state().concept === "힘과 운동", "그 단원이 미리 골라져 있다", state().concept);

// P6: 안내문에 단서가 없으면 예전처럼 둔다 — 억지로 하나를 고르지 않는다.
byId.get("taskDescription").value = "탐구 보고서를 작성하시오.";
const blank = await picker.show({ subject: "물리", major: "", track: "" });
check(blank.every((row) => row.why !== "task"), "단서가 없으면 안내문에서 읽었다고 말하지 않는다",
  blank.map((r) => r.why).join(","));

// P7: 학생에게 보여 주는 「무엇을 채우게 돼요」는 **워커와 같은 규칙**에서 나와야 한다.
// 2026-09-22 운영 검사: 생명과학 「우리 반 학생들을 대상으로 … 설문으로 조사」 과제에 화면은
// 「공개된 자료를 찾아 표에 옮기게 돼요」라고 적었고, 워커는 설문으로 잡았다. 학생에게 한 말과
// 실제가 달랐다.
{
  const source = await readFile(new URL("../assets/js/unit_choice_picker_v1.js", import.meta.url), "utf8");
  check(/__COLLECTION_KIND__/.test(source), "화면은 함께 쓰는 규칙을 부른다");
  const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
  check(/collection_kind_v1\.js/.test(page) && /__COLLECTION_KIND__/.test(page), "그 규칙이 화면에 실려 있다");

  const { resolveCollectionKind } = await import("../assets/js/collection_kind_v1.js");
  const { resolveCollectionKind: fromWorker } = await import("../../../admission_worker_skeleton/report_stages_v1.mjs");
  check(resolveCollectionKind === fromWorker, "워커가 쓰는 것과 같은 함수다");

  const survey = "우리 반 학생들을 대상으로 수면 시간과 아침 식사 여부 등 생활 습관을 설문으로 조사하고, 응답을 표로 정리하여 항목 사이의 관계를 해석한 보고서를 작성하시오.";
  check(resolveCollectionKind({ taskDescription: survey, subject: "생명과학", subjectGroup: "과학", reportMode: "자료해석형" }) === "survey",
    "설문 과제는 보고서 유형 배지가 무엇이든 설문이다");
}

// P8: 「다르게 잡을래요」는 학생이 **실제로 누른** 때에만 앞선다.
// correctionMethod 칸에는 우리가 읽어 낸 값이 미리 들어 있다. 그것을 학생의 말로 치면 과제 글이
// 통째로 밀린다 — 생명과학 설문 과제가 「자료해석형」 배지 때문에 공개 자료로 뒤집혔다.
{
  const { resolveCollectionKind, COLLECTION } = await import("../assets/js/collection_kind_v1.js");
  window.__COLLECTION_KIND__ = { resolve: resolveCollectionKind, COLLECTION };
  byId.get("taskDescription").value = "우리 반 학생들을 대상으로 수면 시간과 아침 식사 여부 등 생활 습관을 설문으로 조사하고, 응답을 표로 정리한다.";
  byId.get("subjectGroup").value = "과학";
  byId.get("interpretedModes").textContent = "자료해석형";
  byId.get("correctionMethod").value = "자료해석형";
  byId.get("methodPicked").value = "";
  check(picker.fillKind() === "survey", "미리 채워 둔 값은 학생의 말이 아니다", picker.fillKind());
  byId.get("methodPicked").value = "true";
  check(picker.fillKind() === "dataset", "학생이 직접 고치면 그 말이 먼저다", picker.fillKind());
}

// P9: 과제가 바뀌면 앞 과제의 선택을 버린다.
// 2026-09-22 운영 검사(5번 생명과학 설문 → 6번 지구과학 별의 등급): 「처음부터 다시」를 누르고
// 새 과목·새 안내문을 넣었는데 목록에 앞 과제의 단원(면역과 백신)이 그대로 있었고, 숨은 칸도
// 「병원체 / 면역과 백신」을 물고 있었다. 두 과제의 보고서 유형이 똑같이 「자료해석형」이라
// 화면을 지켜보는 쪽이 글자 변화를 못 봤기 때문이다.
{
  byId.get("taskDescription").value = "우리 반 학생들에게 설문을 받아 응답을 정리하시오.";
  byId.get("subject").value = "생명과학";
  const first = await picker.show({ subject: "생명과학", major: "", track: "" });
  rowsOnScreen()[1].click();
  check(state().picked === "true", "앞 과제에서 학생이 하나 짚었다", state().picked);
  const held = state().concept;

  byId.get("taskDescription").value = "천문 자료에서 별 네 개의 겉보기 등급과 절대 등급을 찾아 표로 정리한다.";
  byId.get("subject").value = "지구과학";
  const next = await picker.show({ subject: "지구과학", major: "", track: "" });
  check(next.length > 0 && next.every((row) => row.concept !== held), "새 과제 목록에 앞 과제의 단원은 없다", held);
  check(state().concept !== held, "숨은 칸도 앞 과제를 물고 있지 않다", state().concept);
  check(state().picked === "false", "새 과제에서는 학생이 아직 아무것도 고르지 않았다", state().picked);

  // 「처음부터 다시」가 부르는 길
  picker.forget();
  check(state().concept === "" && state().keyword === "" && state().picked === "false",
    "처음부터 다시를 누르면 단원 선택이 비워진다", JSON.stringify(state()));
}

console.log(`PASS unit choice picker: ${passed}/${passed}`);
// 화면 코드가 400ms 지킴이 타이머를 계속 걸어 두기 때문에, 다 끝났으면 손으로 닫는다.
process.exit(0);
