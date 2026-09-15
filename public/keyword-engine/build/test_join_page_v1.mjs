// 가입 화면. A code is issued here and can never be recovered by name, so most of these checks are about
// what the page collects, what it warns, and what it refuses to do.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const join = await readFile(new URL("../join.html", import.meta.url), "utf8");
const folio = await readFile(new URL("../portfolio.html", import.meta.url), "utf8");
const scripts = Array.from(join.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi), (m) => m[1]).filter((s) => s.trim());
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

for (const source of scripts) new Function(source);
check(scripts.length === 1 && !/<script[^>]+src=/i.test(join), "J1 the page carries its own script and loads nothing from outside");
check(join.includes('lang="ko"') && join.includes("viewport"), "J1 it is a Korean page that works on a phone");

// J2b: 등록 코드가 학원을 정한다. 학생이 '미래학원'과 '미래 학원'을 갈라 놓을 수 없어야 한다.
check(/id="joinCode"/.test(join) && join.includes("등록 코드"), "J2b the join code from the academy is the first thing asked");
check(join.includes("/license/check?joinCode="), "J2b and is checked before the student fills the rest in");
check(join.includes("남은 자리 ") && join.includes("자리가 다 찼어요"), "J2b the student sees the academy and whether a seat is left");
check(!/학원 이름|학원명/.test(join.replace(/학원에서 받은|학원에 문의|다니는 학원/g, "")),
  "J2b the academy name is never typed by the student");
check(join.includes('joinCode: joinCode'), "J2b and the code travels with the signup");
check(join.includes('!/^ac-[a-z2-9]{6}$/.test(joinCode)'), "J2b a signup without a join code never reaches the server");
check(join.includes("다니는 고등학교") && join.includes("수행평가를 내주는 학교"),
  "J2b the high school is still asked, and it is said why — the engine needs the school that sets the task");

// J2c: 무엇을 샀는지 발급 즉시 보여 준다. 몇 회인지 모르고 쓰기 시작하면 안 된다.
check(join.includes("function planLine"), "J2c the plan is shown with the code");
check(join.includes('"보고서 " + data.maxUses + "회"') && join.includes("보고서 횟수 제한 없음"),
  "J2c 횟수와 무제한을 둘 다 말한다");
check(join.includes('String(data.expiresAt).slice(0, 10) + "까지"'), "J2c 그리고 언제까지인지");

// J2d: 코드를 잃으면 이용권까지 못 쓴다. 즐겨찾기가 제일 확실하고, 그다음이 문의다.
check(join.includes("즐겨찾기 해 두세요"), "J2d the surest recovery is a bookmark — the code is in the URL");
check(join.includes("학원에 문의해 주세요"), "J2d and a lost code is answered by the academy, not by a public form");
check(!/이름.{0,10}학교.{0,10}찾/.test(join), "J2d there is no lookup by name and school — that would open any minor's record");

// J2: 사용자가 받겠다고 한 네 가지.
check(/id="name"/.test(join), "J2 이름");
check(/id="school"/.test(join), "J2 학교 이름");
check(join.includes('["고1", "고2", "고3"]'), "J2 학년");
check(join.includes("공학계열") && join.includes("예체능계열"), "J2 진로 계열");
check(join.includes("아직 못 정했어요"), "J2 and a student who has not decided is a real answer, not a blank");
check(join.includes('state.track === "아직 못 정했어요" ? "" : state.track'),
  "J2 which is sent as empty rather than as a fake 계열 the engine would try to match");
check(/id="major"/.test(join) && join.includes("안 정했으면 비워 두세요"), "J2 학과 is optional and says so");

// J3: 코드는 이름으로 되찾을 수 없다. That is a deliberate hole in the recovery story, so the page must say it.
check(join.includes("이름으로는 다시 찾아 줄 수 없어요"), "J3 the page says the code cannot be recovered by name");
check(join.includes("남의 이름만 알아도"), "J3 and says why — a name lookup would open any minor's three years");
check(join.includes("이 코드를 꼭 적어 두세요"), "J3 with the instruction that follows from it");
check(!/\/student\/portfolio\?code=[^"']*name=/.test(join), "J3 and it never puts a name in a URL");

// J4: 잃어버리지 않게 기기가 대신 기억한다 — 저장을 막아 둔 브라우저에서도 화면은 돌아야 한다.
check(join.includes("localStorage.setItem") && join.includes("localStorage.getItem"), "J4 the code is kept on the device");
check((join.match(/try \{/g) || []).length >= 2, "J4 every storage touch is wrapped — a private window throws on access",
  String((join.match(/try \{/g) || []).length));
check(join.includes("이 기기에서 이미 코드를 받았어요"), "J4 a second signup on the same device is warned about first");
check(join.includes("앞의 코드에 그대로 남습니다"), "J4 and told what happens to the reports already written");
check(folio.includes('localStorage.getItem("keyword-engine:student-code")'), "J4 내 기록 화면도 같은 코드를 기억한다");
check(folio.includes('href="join.html"'), "J4 and the two screens point at each other");

// J5: 화면이 할 수 있는 일은 코드 발급 하나뿐이다.
check(join.includes("/student/register"), "J5 it registers");
check(!/student\/profile|student\/portfolio\?|student\/adjust|license\/issue/.test(join.replace(/portfolio\.html\?code=/g, "")),
  "J5 and does not edit, read, or hand out anything else");
check(join.includes("var esc = function") && (join.match(/esc\(/g) || []).length >= 4,
  "J5 every value is escaped before it reaches the page — a name is user input");
check(join.includes("AI에게는 보내지 않습니다"), "J5 the name-never-goes-to-the-model rule is stated here too");

// J6: 버튼을 두 번 눌러 코드가 두 개 생기는 일이 없어야 한다.
check(join.includes('$("goBtn").disabled = true'), "J6 the button is locked while the code is being made");
check((join.match(/\$\("goBtn"\)\.disabled = false/g) || []).length >= 2,
  "J6 and unlocked again on both a refusal and a network failure");

console.log(`PASS join page: ${passed}/${passed}`);
