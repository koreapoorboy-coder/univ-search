// 고를 수 있는 과목은 **우리가 실제로 쓸 수 있는 과목**이어야 한다.
//
// 2026-09-22 오전. 국어(공통국어1·2)는 목록에 있었고 옆에 「준비 중입니다」라고만 적혀 있었다.
// 학생은 그래도 고를 수 있었고 보고서도 나왔다 — 그런데 「도서를 한 권 골라 읽고 서평을 작성하시오」
// 과제에 「AI 저작권 칼럼의 논증 타당성 평가」가 나왔다. 말과 목록이 어긋나 있었다.
//
// 2026-09-22 오후. 까닭을 찾아 고친 뒤 국어를 다시 열었다(test_report_sections_v1). 그래서 이 검사는
// 「국어를 빼라」가 아니라 **「목록에 있는 과목은 엔진이 쓸 수 있어야 한다」**를 지킨다 —
// 그것이 진짜 규칙이다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const notice = await readFile(new URL("../assets/js/subject_support_notice.js", import.meta.url), "utf8");
const conceptMap = JSON.parse(await readFile(new URL("../seed/textbook-v1/subject_concept_engine_map.json", import.meta.url), "utf8"));
const unitChoices = JSON.parse(await readFile(new URL("../seed/engine-index/unit_choices.v1.json", import.meta.url), "utf8"));

// 과목 드롭다운에 있는 것만 본다(과목 칸은 id="subject" 하나뿐이다).
const select = html.slice(html.indexOf('<select id="subject"'));
const body = select.slice(0, select.indexOf("</select>"));
const options = [...body.matchAll(/<option value="([^"]*)"/g)].map((one) => one[1]).filter(Boolean);

check(options.length >= 25, "과목 목록이 그대로 있다", String(options.length));

// L1: 「준비 중」이라고 적어 두고 고르게 두지 않는다. 둘 중 하나가 거짓말이 된다.
check(!/준비 중/.test(body), "L1 「준비 중」이라고 적어 두고 고르게 두지 않는다");
check(!/PENDING_LANGUAGE|pending_language/.test(notice), "L1 「준비 중」 갈래 자체가 화면 코드에 없다");
check(/확충 중/.test(notice), "L1 사례가 적은 과목의 「확충 중」 안내는 그대로 둔다");

// L2: 목록에 있는 과목은 모두 입력 문이 아는 이름이어야 한다. 모르면 학생이 그 자리에서 막힌다.
const intake = await readFile(new URL("../../../admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs", import.meta.url), "utf8");
const base64 = intake.match(/IMMUTABLE_SUBJECT_INVENTORY_BASE64\s*=\s*"([^"]+)"/)?.[1] || "";
const inventory = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
const known = new Set((inventory.rows || []).map((row) => row.subject_value));
const unknown = options.filter((name) => !known.has(name));
check(unknown.length === 0, "L2 고를 수 있는 과목은 모두 입력 문이 아는 이름이다", unknown.join(","));

// L3: 그리고 단원 사전이 있어야 한다. 사전이 없으면 학생에게 보여 줄 단원이 없고, 엔진은 과제 글을
// 어느 단원에도 걸지 못한 채 쓰게 된다.
const thin = options.filter((name) => {
  const units = Object.keys((conceptMap[name] || {}).concepts || {}).length;
  const rows = ((unitChoices.subjects || {})[name] || []).length;
  return units < 3 || rows < 3;
});
check(thin.length === 0, "L3 고를 수 있는 과목은 모두 단원 사전이 있다(3개 이상)", thin.join(","));

console.log(`PASS subject list: ${passed}/${passed}`);
