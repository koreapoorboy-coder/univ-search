// 고를 수 있는 과목은 **우리가 실제로 쓸 수 있는 과목**이어야 한다.
//
// 2026-09-22 운영 검사. 국어(공통국어1·2)는 목록에 있었고 옆에 「준비 중입니다」라고만 적혀 있었다.
// 학생은 그래도 고를 수 있었고 보고서도 나왔다 — 그런데 그 보고서가 과제와 달랐다.
// 「도서를 한 권 골라 읽고 서평을 작성하시오」 과제에 「AI 저작권 칼럼의 논증 비교 분석」이 나왔다.
// 안 파는 것은 보여 주지 않는다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const notice = await readFile(new URL("../assets/js/subject_support_notice.js", import.meta.url), "utf8");

// 과목 드롭다운에 있는 것만 본다(과목 칸은 id="subject" 하나뿐이다).
const select = html.slice(html.indexOf('<select id="subject"'));
const options = [...select.slice(0, select.indexOf("</select>")).matchAll(/<option value="([^"]*)"/g)]
  .map((one) => one[1]).filter(Boolean);

check(options.length >= 25, "과목 목록이 그대로 있다", String(options.length));
check(!options.some((name) => /국어/.test(name)), "국어 과목은 고를 수 없다", options.filter((n) => /국어/.test(n)).join(","));
check(!/준비 중/.test(select.slice(0, select.indexOf("</select>"))), "「준비 중」이라고 적어 두고 고르게 두지 않는다");
check(!/PENDING_LANGUAGE|pending_language/.test(notice), "「준비 중」 갈래 자체가 화면 코드에 없다");
check(/확충 중/.test(notice), "사례가 적은 과목의 「확충 중」 안내는 그대로 둔다");

// 목록에 있는 과목은 모두 입력 문(simple_live_intake)이 아는 이름이어야 한다. 모르면 학생이 막힌다.
const intake = await readFile(new URL("../../../admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs", import.meta.url), "utf8");
const base64 = intake.match(/IMMUTABLE_SUBJECT_INVENTORY_BASE64\s*=\s*"([^"]+)"/)?.[1] || "";
const inventory = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
const known = new Set((inventory.rows || []).map((row) => row.subject_value));
const unknown = options.filter((name) => !known.has(name));
check(unknown.length === 0, "고를 수 있는 과목은 모두 입력 문이 아는 이름이다", unknown.join(","));

console.log(`PASS subject list: ${passed}/${passed}`);
