// 도서 과제를 **전수로** 센다. ₩0 — AI 를 부르지 않고 과제 글만 읽는다.
//
// 2026-09-22 에 도서 흠 셋을 고쳤다. 그 셋이 실제 과제 7,131건에서 각각 몇 건에 닿는지,
// 그리고 새로 둔 「책을 고르기 전에는 못 만든다」 문이 **막다른 길**을 만들지 않는지 본다.
//
// 막다른 길이란 이런 것이다 — 안내문이 책 한 권을 정하라고 시켜서 생성을 막았는데, 정작 도서
// 단계가 안 열려 학생이 책을 고를 수가 없는 경우. 그러면 학생은 아무것도 못 하고 나간다.
//
//   node tools/audit_book_tasks.mjs
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const corpus = fileURLToPath(new URL("../public/keyword-engine/data/assessment/records/assessment_tasks.v1.json", import.meta.url));

// 화면과 워커가 쓰는 것과 같은 말들(decision_flow_v1 의 BOOK_REQUIRED_RE / BOOK_TEXT_RE,
// report_stages_v1 의 BOOK_IS_SUBJECT). 여기서 따로 고치면 셋이 어긋나므로 같이 고쳐야 한다.
const BOOK_REQUIRED = /서평|독후|독서\s*감상|책을\s*읽고|도서를\s*읽고|도서를?\s*(한\s*권|선정|골라)|책을?\s*(한\s*권|선정|골라)/;
const BOOK_SIGNAL = /독서|도서|책|서평|독후|저자|문헌/;

const taskText = (row) => [row.raw_task_title, row.raw_task_desc, row.raw_method_text]
  .map((one) => String(one || "")).join(" ");

let total = 0;
const required = [];
let signal = 0;
const deadEnd = [];
const bySubject = new Map();
const byGroup = new Map();

const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);

const lines = createInterface({ input: createReadStream(corpus, "utf8"), crlfDelay: Infinity });
for await (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let row;
  try { row = JSON.parse(trimmed); } catch { continue; }
  total += 1;
  const text = taskText(row);
  const hasSignal = BOOK_SIGNAL.test(text);
  if (hasSignal) signal += 1;
  if (!BOOK_REQUIRED.test(text)) continue;
  required.push(row);
  bump(bySubject, row.subject_standard || row.subject_raw || "?");
  bump(byGroup, row.subject_group || "?");
  if (!hasSignal) deadEnd.push(row);
}

const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
console.log(`전체 수행평가 과제 ${total.toLocaleString()}건\n`);
console.log(`① 도서 신호가 있어 **도서 단계가 열리는** 과제 : ${signal.toLocaleString()}건 (${pct(signal)})`);
console.log(`   → 고친 흠(화면에서 고른 책이 워커까지 안 가던 것)이 닿는 범위다.`);
console.log(`② 책 한 권이 **과제의 대상**인 과제           : ${required.length.toLocaleString()}건 (${pct(required.length)})`);
console.log(`   → 책을 고르기 전에는 못 만들게 막고, 보고서 전체가 그 책을 다루게 한다.\n`);

console.log(`막다른 길(막았는데 책을 고를 수 없는 과제) : ${deadEnd.length}건`);
if (deadEnd.length) {
  console.log("  ** 학생이 여기서 멈춘다. 도서 신호 낱말을 넓혀야 한다. **");
  deadEnd.slice(0, 10).forEach((row) => console.log(`   - ${row.subject_standard || row.subject_raw} | ${taskText(row).slice(0, 70)}`));
} else {
  console.log("  좋다 — 막은 과제는 모두 도서 단계가 함께 열린다.");
}

const top = (map, limit) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
console.log("\n책이 대상인 과제 — 과목군별");
top(byGroup, 8).forEach(([name, count]) => console.log(`  ${String(name).padEnd(12)} ${count}`));
console.log("\n책이 대상인 과제 — 과목별(상위 10)");
top(bySubject, 10).forEach(([name, count]) => console.log(`  ${String(name).padEnd(16)} ${count}`));
