// 학생이 여는 화면. It holds a minor's name and school, so the checks here are mostly about what it must not do.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../portfolio.html", import.meta.url), "utf8");
const scripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi), (m) => m[1]).filter((s) => s.trim());
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

for (const source of scripts) new Function(source);
check(scripts.length === 1, "P1 the page carries its own script and no other", String(scripts.length));
check(!/<script[^>]+src=/i.test(html), "P1 and loads nothing from outside — this page shows a minor's name");

check(html.includes("/student/portfolio?code="), "P2 it asks the worker for the portfolio");
check(html.includes("encodeURIComponent(code)"), "P2 with the code encoded rather than pasted into the URL");
check(!/student\/register|student\/profile/.test(html), "P2 and it cannot issue or change a student record — reading only");

check(html.includes("var esc = function") && html.includes('"&": "&amp;"'), "P3 every value is escaped before it reaches the page");
const renderers = html.match(/\+ esc\(/g) || [];
check(renderers.length >= 15, "P3 and that is used throughout, not once", String(renderers.length));
check(!/innerHTML\s*=\s*[a-z]*\s*\+/i.test(html), "P3 nothing is concatenated straight into innerHTML");

check(!/적합도\s*\d|%|퍼센트|점수는|점\s*\//.test(html.replace(/점수가 아니라/g, "")), "P4 no percentage, no score — the fit is evidence");
check(html.includes("점수가 아니라"), "P4 and the page says so out loud");
check(html.includes("아직 안 닿은 곳"), "P4 an untouched department reads as an opening, not a failure");
check(html.includes("아직 닿은 보고서가 없어요"), "P4 a student with nothing yet is not told '대학 과목 0개가 닿아 있음'");
check(html.includes("row.touchedCount\n") || /row\.touchedCount\s*\n?\s*\?/.test(html),
  "P4 the count is only printed when there is something to count");

// The first live render printed the same two long report titles under every one of eight courses. Unreadable.
check(html.includes("닿게 한 보고서"), "P4b the reports behind a department are listed once, not under every course");
check(!/link\.reports.*\n?.*course\.title/.test(html) && html.includes("backing.indexOf(label) < 0"),
  "P4b and deduplicated before they are printed");
check(html.includes('label.slice(0, 46)') && html.includes("backing.slice(0, 4)"),
  "P4b long titles are trimmed and only a few are shown");
check(html.includes('"그 밖에 "') || html.includes("그 밖에 "), "P4b a department with many touched courses says how many are left over");

check(html.includes("AI에게는 보내지 않습니다"), "P5 the page states the name never goes to the model");
check(!/school_name|생활기록부를 불러|students\//.test(html), "P5 and it never reaches for the 생기부 source data");

check(html.includes('GRADE_ORDER = ["고1", "고2", "고3"]'), "P6 three years read in the order they happened");
check(html.includes('"기타"'), "P6 with a place for a report whose grade we do not know");
check(html.includes("생활기록부에 적을 문장 보기"), "P6 each report can open its 생기부 초안");
check(html.includes('lang="ko"') && html.includes("viewport"), "P6 it is a Korean page that works on a phone");

check(html.includes('URLSearchParams(location.search).get("code")'), "P7 a link with the code opens straight away");
check(html.includes('if (event.key === "Enter")'), "P7 and Enter works like the button");

console.log(`PASS portfolio page: ${passed}/${passed}`);
