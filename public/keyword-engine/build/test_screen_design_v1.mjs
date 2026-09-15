// 네 화면이 한 제품처럼 보이는가.
//
// 가입·기록·관리 화면은 각자 자기 색과 자기 모서리를 들고 있었다. 파란색만 해도 본 화면은 #2458ff, 이쪽은
// #2f5bd7이어서 같은 제품인데 다른 제품처럼 보였다. 이 파일은 그 어긋남이 다시 생기는 것을 막는다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");
const [base, shared, join, folio, admin, index] = await Promise.all([
  read("../assets/keyword_engine.css"),
  read("../assets/student_screens.css"),
  read("../join.html"),
  read("../portfolio.html"),
  read("../admin.html"),
  read("../index.html"),
]);
const pages = { join, portfolio: folio, admin };
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// D1: 토큰은 본 화면에서 가져온 값 그대로여야 한다. 한 군데서만 고칠 수 있어야 한다는 뜻이다.
const tokenOf = (css, name) => (css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`)) || [])[1]?.trim();
for (const token of ["--primary", "--text", "--muted", "--line", "--primary-soft", "--accent", "--danger", "--radius"]) {
  check(tokenOf(shared, token) === tokenOf(base, token),
    `D1 ${token} is the same value the main screen uses`, `${tokenOf(shared, token)} vs ${tokenOf(base, token)}`);
}
check(tokenOf(shared, "--primary") === "#2458ff", "D1 and that value is the product's blue", tokenOf(shared, "--primary"));

// D2: 세 화면이 그 한 장을 쓴다. 각자 자기 색을 다시 선언하면 다시 갈라진다.
for (const [name, html] of Object.entries(pages)) {
  check(html.includes('href="assets/student_screens.css'), `D2 ${name} loads the shared sheet`);
  const own = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
  check(!/--primary\s*:|--line\s*:|--radius\s*:|--text\s*:/.test(own),
    `D2 ${name} does not redeclare a shared token`, own.slice(0, 80));
  check(!/#2f5bd7|#2458ff/i.test(own), `D2 ${name} writes no raw blue of its own`);
  check(own.length < 2600, `D2 ${name}'s own rules stay small — anything reusable belongs in the sheet`, String(own.length));
}

// D3: 같은 곳이라고 알아볼 수 있어야 하고, 막다른 길이 아니어야 한다.
for (const [name, html] of Object.entries(pages)) {
  check(html.includes('class="hero-badge" href="index.html"'), `D3 ${name} carries the badge and it leads back`);
  check(html.includes("RNY 탐구보고서 프로그램"), `D3 ${name} carries the product name`);
  check(/<div class="page( wide)?">/.test(html), `D3 ${name} uses the shared page frame`);
  check(html.includes('class="hero"') && /<h1>/.test(html), `D3 ${name} has one heading in the same place`);
}
check(index.includes("RNY 탐구보고서 프로그램"), "D3 and it is the same name the main screen shows");

// D4: 밖에서 아무것도 안 불러온다. 미성년자 이름이 있는 화면이다.
for (const [name, html] of Object.entries(pages)) {
  const urls = [...html.matchAll(/(?:href|src)="(https?:)?\/\/[^"]+"/g)].map((m) => m[0]);
  check(urls.length === 0, `D4 ${name} loads nothing cross-origin`, urls.join(" "));
  check(!/<script[^>]+src=/i.test(html), `D4 ${name} pulls in no script at all`);
}

// D5: 폰에서 읽힌다. 학생은 폰으로 연다.
check(shared.includes("@media (max-width: 560px)"), "D5 the sheet has a phone breakpoint");
check(shared.includes(".scroll") && shared.includes("overflow-x: auto"),
  "D5 a wide table scrolls inside its own box, not the whole page");
check(shared.includes("min-width: 780px") && shared.includes("table"), "D5 and the table keeps its columns readable while it does");
for (const [name, html] of Object.entries(pages)) {
  check(/name="viewport"/.test(html), `D5 ${name} declares a viewport`);
}
check(!/style="[^"]*width:\s*\d{3,}px/.test(join + folio + admin), "D5 nothing is pinned to a fixed pixel width");

// D6: 코드는 옮겨 적는 값이다. 모양이 다른 글자로 또렷하게.
check(shared.includes(".code-big") && shared.includes("ui-monospace"), "D6 an issued code is shown in a monospaced face");
check(join.includes('class="code-big"'), "D6 and the signup screen uses it for the code it hands over");

console.log(`PASS screen design: ${passed}/${passed}`);
