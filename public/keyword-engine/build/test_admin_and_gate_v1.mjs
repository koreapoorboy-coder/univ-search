// 문을 달았는가, 그리고 관리 화면이 그 뒤에서만 열리는가.
//
// 이 파일이 지키는 것은 하나다: **이용권을 세어 놓고 문을 안 달면 그게 구멍이다.** 보고서를 만드는 길에
// 학생 코드가 반드시 지나가야 하고, 이름으로 학생을 찾는 일은 관리자 열쇠 뒤에서만 가능해야 한다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { emptyGrant } from "../../../admission_worker_skeleton/license_v1.mjs";

const here = (name) => new URL(name, import.meta.url);
const [worker, index, bridge, admin, join, folio] = await Promise.all([
  readFile(here("../../../admission_worker_skeleton/worker.js"), "utf8"),
  readFile(here("../index.html"), "utf8"),
  readFile(here("../assets/js/mini_worker_generate_bridge_v32.js"), "utf8"),
  readFile(here("../admin.html"), "utf8"),
  readFile(here("../join.html"), "utf8"),
  readFile(here("../portfolio.html"), "utf8"),
]);
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// G1: 문. 보고서를 만드는 모든 길이 학생 코드를 지나간다.
check(worker.includes("if (!input.studentCode)") && worker.includes("'NO_CODE'"),
  "G1 a report with no student code is refused outright");
check(worker.includes("학생 코드를 넣어 주세요. 코드가 없으면 먼저 발급받아야 해요."),
  "G1 and the student is told what to do about it");
check(worker.indexOf("if (!input.studentCode)") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
  "G1 the check happens before the model is called — refusing after we paid is our loss");
check(!/if \(env\.DB && input\.studentCode\)/.test(worker),
  "G1 the old 'only check when a code happens to be present' shape is gone — that was the hole");

// G2: 화면이 실제로 코드를 보낸다. 워커가 요구해도 화면이 안 보내면 아무도 못 쓴다.
check(index.includes('id="studentCode"'), "G2 the report page carries the field");
check(bridge.includes('studentCode: readValue("studentCode")'), "G2 the form reads it");
check(bridge.includes("studentCode: form.studentCode"), "G2 and the generate request sends it");
check(index.includes('localStorage.getItem(KEY)') && index.includes("keyword-engine:student-code"),
  "G2 the code is remembered across the three screens — the student types it once");
check(index.includes('new URLSearchParams(location.search).get("code")'),
  "G2 and a link carrying the code fills it in");

// G3: 가입은 열려 있고 사용은 잠겨 있다 — 대표님 설계.
check(worker.includes("let grant = emptyGrant();") && worker.includes("if (body?.joinCode) {"),
  "G3 signing up without a join code is allowed");
check(emptyGrant().maxUses === 0, "G3 and it grants zero uses — 0은 무제한이 아니라 아직 권한이 없는 것");
check(emptyGrant().licenseId === null && emptyGrant().expiresAt === "", "G3 with no licence and no clock running");
check(join.includes("없어도 가입은 됩니다"), "G3 the signup page says the join code is optional");
check(join.includes("아직 보고서를 만들 수 있는 권한이 없어요"),
  "G3 and a student with no grant is told so rather than shown a blank plan");

// G4: 전화번호는 뒤 4자리만. 미성년자 번호 전체를 보관하지 않는다.
check(join.includes('id="phoneTail"') && join.includes('maxlength="4"'), "G4 only the last four digits are asked for");
check(join.includes("번호 전체는 받지 않고, 문자도 보내지 않아요"), "G4 and it is said why, and what we will not do");
check(join.includes('$("phoneTail").value.replace(/\\D/g, "")'), "G4 anything that is not a digit is dropped");

// G5: 관리 화면은 열쇠 뒤에서만. 이름으로 학생을 찾는 일은 여기서만 가능하다.
for (const route of ["/admin/students", "/admin/licenses", "/license/issue", "/license/adjust", "/student/adjust"]) {
  const at = worker.indexOf(`url.pathname === '${route}'`);
  const guard = worker.indexOf("isAdmin(request, env)", at);
  check(at > 0 && guard > at && guard - at < 400, `G5 ${route} is behind the admin key`, `${at} → ${guard}`);
}
check(worker.includes("const key = String(env.ADMIN_KEY || '');") && worker.includes("if (!key) return false;"),
  "G5 and with no key configured every admin route stays shut — a blank key is not a pass");
check(worker.includes("diff |= sent.charCodeAt(at) ^ key.charCodeAt(at)"),
  "G5 the comparison does not stop at the first wrong character");

// G6: 관리 화면 자체.
check(admin.includes("sessionStorage") && !admin.includes("localStorage.setItem"),
  "G6 the admin key lives in the tab, not on the disk");
check(admin.includes('"x-admin-key"'), "G6 every call carries it");
check(["/license/issue", "/admin/licenses", "/admin/students", "/student/adjust", "/license/adjust"]
  .every((route) => admin.includes(route)), "G6 발급·목록·학생·조정이 한 화면에 있다");
check(admin.includes("권한 없는 학생만"), "G6 and the owner can filter to exactly the students waiting to be granted");
check(admin.includes("비우면 무제한") && admin.includes("이른 쪽이 이깁니다"),
  "G6 the two rules that decide money are written on the form itself");
check(admin.includes("var esc = function") && (admin.match(/esc\(/g) || []).length >= 20,
  "G6 every value is escaped — student names and academy names are user input");
check(!/<script[^>]+src=/i.test(admin), "G6 it loads nothing from outside");
// 브라우저에서 돌려 보고서야 나온 둘: 관리자 헤더가 CORS에 막혔고, 한글 열쇠는 fetch 자체를 터뜨렸다.
check(worker.includes("Content-Type, Authorization, x-admin-key"),
  "G6 the admin header is allowed through the preflight — without it the screen cannot call anything");
check(admin.includes("\\x20-\\x7E]/.test(adminKey)"),
  "G6 a key with Korean in it is refused on the page — a header cannot carry it and fetch throws");

// G7: 학생 화면은 관리 경로를 하나도 모른다.
check(!/admin\/students|admin\/licenses|license\/issue|license\/adjust|student\/adjust|x-admin-key/.test(join + folio),
  "G7 neither student screen knows an admin route exists");

console.log(`PASS admin and gate: ${passed}/${passed}`);
