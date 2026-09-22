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

console.log(`PASS unit choice picker: ${passed}/${passed}`);
// 화면 코드가 400ms 지킴이 타이머를 계속 걸어 두기 때문에, 다 끝났으면 손으로 닫는다.
process.exit(0);
