// 뿌리가 거짓말을 하지 않아야 한다.
//
// `univ-search.pages.dev` 는 2026-07-21부터 수학 취약유형 진단으로 **몰래 넘어갔다**. 그때는 그게 유일한
// 제품이었지만, 지금은 셋이고 탐구보고서가 그중 하나다. 학원에 주소를 건넸는데 수학 프로그램이 뜨는 일이
// 생기면 안 된다. 그렇다고 예전 주소를 저장해 둔 사람을 끊어 버려서도 안 된다.
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";

const root = await readFile(new URL("../../index.html", import.meta.url), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
const exists = async (path) => access(new URL(path, import.meta.url)).then(() => true, () => false);

// R1: 몰래 넘기지 않는다.
check(!/http-equiv=["']refresh["']/i.test(root), "R1 the root no longer redirects on a timer");
check(!/location\.replace|location\.href\s*=/.test(root), "R1 nor in script");
check(!/math-weakness-engine\/index\.html["'][^>]*>\s*$/.test(root.split("\n")[6] || ""), "R1 and math is not the only thing it knows");

// R2: 세 제품이 다 있고, 링크가 진짜 파일을 가리킨다.
const links = [...root.matchAll(/href="\.\/([^"]+)"/g)].map((m) => m[1]);
check(links.length >= 3, "R2 the root offers every product", links.join(" "));
for (const link of links) {
  check(await exists(`../../${link}`), `R2 ${link} exists`, link);
}
for (const app of ["keyword-engine/index.html", "math-weakness-engine/index.html", "univ-search/index.html"]) {
  check(links.includes(app), `R2 ${app} is listed`);
}
check(root.includes("탐구보고서 프로그램") && root.includes("수학 취약유형 진단") && root.includes("대학 지원 판독기"),
  "R2 each is named the way its own screen names it");

// R3: 예전 주소를 저장해 둔 사람이 끊기지 않는다.
check(root.includes("예전에 수학 취약유형 진단으로 바로 넘어갔습니다"),
  "R3 someone who bookmarked the old root is told where their thing went");

// R4: 학생이 쓰는 두 화면으로 바로 갈 수 있다.
check(links.includes("keyword-engine/join.html") && links.includes("keyword-engine/portfolio.html"),
  "R4 코드 받기와 내 기록은 제품 안으로 한 번 더 들어가지 않아도 된다");

// R5: 뿌리는 절대 깨지면 안 된다. 다른 파일에 기대지 않는다.
check(!/<link[^>]+stylesheet/i.test(root), "R5 the root pulls in no stylesheet — it must render even if everything else is broken");
check(!/<script[^>]+src=/i.test(root), "R5 and no script");
check(!/(?:href|src)="(https?:)?\/\//.test(root), "R5 and nothing cross-origin");
check(root.includes("#2458ff"), "R5 while still using the product's blue");
check(root.includes("@media (max-width: 560px)") && /name="viewport"/.test(root), "R5 and it works on a phone");

// R6: 여기서 생기부 원본으로 가는 길은 없다. 학생 자료는 공개 대상이 아니다.
check(!/students/.test(root), "R6 the root never points at public/students");

console.log(`PASS site root: ${passed}/${passed}`);
