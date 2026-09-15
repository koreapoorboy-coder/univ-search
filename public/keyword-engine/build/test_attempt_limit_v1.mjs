// 한 과제는 1회로 센다. 그러면 재생성은 공짜이고, 공짜인 것에 상한이 없으면 우리 돈이 샌다.
//
// 설계서 한 편이 ₩120~290이다. 5회권 학생이 한 과제를 열 번 다시 만들면 우리는 ₩1,200~2,900을 쓰고 1회를
// 받는다. 이 파일은 그 계산이 터지지 않게 지킨다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  countAttempts, issueStudentCode, loadPortfolio, resetAttempts, saveStudentReport,
} from "../../../admission_worker_skeleton/student_portfolio_v1.mjs";

const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
const admin = await readFile(new URL("../admin.html", import.meta.url), "utf8");
let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: (await import("node:crypto")).webcrypto });

function makeDb() {
  const students = new Map();
  const reports = [];
  let nextId = 1;
  const run = (sql, args) => {
    const text = sql.replace(/\s+/g, " ").trim();
    if (/^(CREATE|ALTER)/i.test(text)) return { results: [] };
    if (text.startsWith("SELECT MAX(serial)")) return { first: { last: students.size } };
    if (text.startsWith("INSERT INTO students")) {
      const keys = ["code", "serial", "name", "school_name", "entered_grade", "entered_year", "phone_tail", "track", "major",
        "license_id", "org_name", "max_uses", "expires_at"];
      const row = Object.fromEntries([["used_count", 0], ["enabled", 1], ...keys.map((key, at) => [key, args[at]])]);
      students.set(row.code, row);
      return {};
    }
    if (text.startsWith("SELECT * FROM students")) return { first: students.get(args[0]) || null };
    if (text.startsWith("INSERT INTO student_reports")) {
      const keys = ["student_code", "grade", "subject", "subject_group", "task_key", "concept", "keyword", "axis_id",
        "axis_title", "axis_next", "cross_subject", "report_stage", "collection_kind", "title", "case_tag",
        "variable_tag", "measure_tag", "record_draft"];
      reports.push(Object.fromEntries([["id", nextId++], ["attempts", 1], ...keys.map((key, at) => [key, args[at]])]));
      return {};
    }
    if (text.startsWith("SELECT id, attempts FROM student_reports")) {
      const hit = [...reports].reverse().find((r) => r.student_code === args[0] && r.task_key === args[1] && r.subject === args[2]);
      return { first: hit ? { id: hit.id, attempts: hit.attempts } : null };
    }
    if (text.startsWith("SELECT attempts FROM student_reports")) {
      const hit = [...reports].reverse().find((r) => r.student_code === args[0] && r.task_key === args[1] && r.subject === args[2]);
      return { first: hit ? { attempts: hit.attempts } : null };
    }
    if (text.startsWith("UPDATE student_reports SET attempts = 1")) {
      reports.filter((r) => r.student_code === args[0]).forEach((r) => { r.attempts = 1; });
      return {};
    }
    if (text.startsWith("UPDATE student_reports")) {
      const row = reports.find((r) => r.id === args[args.length - 1]);
      if (row) { row.attempts = (row.attempts || 1) + 1; row.title = args[10]; }
      return {};
    }
    if (text.startsWith("SELECT * FROM student_reports")) return { results: reports.filter((r) => r.student_code === args[0]) };
    throw new Error(`unexpected SQL: ${text.slice(0, 70)}`);
  };
  return {
    reports,
    prepare(sql) {
      let args = [];
      const api = {
        bind(...values) { args = values; return api; },
        async run() { return run(sql, args); },
        async first() { return run(sql, args).first ?? null; },
        async all() { return run(sql, args); },
      };
      return api;
    },
  };
}

// T1: 같은 과제를 다시 만들면 세어 둔다. 보통 흐름(설계서 → 최종)은 2다.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규", grade: "고2" });
  const write = (title, stage) => saveStudentReport(db, code, {
    grade: "고2", subject: "물리", taskKey: "물리 충격량 수행평가", keyword: "충격량", title, stage,
  });
  check(await countAttempts(db, code, "물리 충격량 수행평가", "물리") === 0, "T1 아무것도 안 만들었으면 0");
  await write("설계서", "experiment_draft");
  check(await countAttempts(db, code, "물리 충격량 수행평가", "물리") === 1, "T1 설계서 하나면 1");
  const again = await write("최종본", "experiment_final");
  check(again.attempts === 2, "T1 최종본이 덮어쓰면 2 — 보통 흐름이 여기까지다", String(again.attempts));
  await write("다시 만든 설계서", "experiment_draft");
  await write("또 다시", "experiment_draft");
  check(await countAttempts(db, code, "물리 충격량 수행평가", "물리") === 4, "T1 다시 만들 때마다 올라간다");
  check((await loadPortfolio(db, code)).reports.length === 1, "T1 그래도 보고서는 여전히 한 편이다 — 세는 것과 쌓는 것은 다르다");
}

// T2: 다른 과제는 따로 센다. 한 과제에서 막혔다고 다른 과제까지 막히면 안 된다.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규", grade: "고2" });
  await saveStudentReport(db, code, { subject: "물리", taskKey: "과제A", title: "t1" });
  await saveStudentReport(db, code, { subject: "물리", taskKey: "과제A", title: "t2" });
  await saveStudentReport(db, code, { subject: "물리", taskKey: "과제B", title: "t3" });
  check(await countAttempts(db, code, "과제A", "물리") === 2, "T2 과제 A는 2");
  check(await countAttempts(db, code, "과제B", "물리") === 1, "T2 과제 B는 1");
  check(await countAttempts(db, code, "과제C", "물리") === 0, "T2 안 한 과제는 0");
  check(await countAttempts(db, code, "과제A", "화학") === 0, "T2 같은 과제명이라도 과목이 다르면 다른 과제다");
  check(await countAttempts(db, "sc-study0009-zzzz", "과제A", "물리") === 0, "T2 다른 학생 것은 안 센다");
  check(await countAttempts(db, code, "", "물리") === 0, "T2 과제 이름이 없으면 셀 것도 없다");
}

// T3: 막힌 학생을 풀어 줄 수 있다. 진짜로 고장 나서 못 쓴 경우가 있다.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규", grade: "고2" });
  for (let at = 0; at < 5; at += 1) await saveStudentReport(db, code, { subject: "물리", taskKey: "과제A", title: `t${at}` });
  check(await countAttempts(db, code, "과제A", "물리") === 5, "T3 다섯 번이면 5");
  await resetAttempts(db, code);
  check(await countAttempts(db, code, "과제A", "물리") === 1, "T3 풀어 주면 1로 돌아간다");
  check((await resetAttempts(db, "코드아님")).ok === false, "T3 코드가 아니면 아무것도 안 푼다");
}

// T4: 상한은 모델을 부르기 전에 본다. 뒤에서 막으면 이미 돈을 쓴 뒤다.
{
  check(worker.includes("const MAX_ATTEMPTS_PER_TASK = 5;"), "T4 상한이 한 자리에 적혀 있다");
  check(worker.includes("if (tries >= MAX_ATTEMPTS_PER_TASK)") && worker.includes("'TOO_MANY_TRIES'"),
    "T4 상한을 넘으면 거절한다");
  check(worker.indexOf("countAttempts(env.DB") < worker.indexOf("callOpenAIWithRetry(prompt, env, input)"),
    "T4 그리고 그 판단은 모델을 부르기 전에 끝난다");
  check(worker.includes("다른 과제로 해 보거나 학원에 문의해 주세요"),
    "T4 막힌 학생에게 다음에 무엇을 할지 말해 준다");
  check(/tries \}, 429\)/.test(worker), "T4 상태 코드는 429 — 권한이 없는 것이 아니라 너무 자주 한 것이다");
}

// T5: 관리 화면에서 풀어 준다.
{
  check(admin.includes("재시도 풀기") && admin.includes("resetAttempts: true"), "T5 관리 화면에 푸는 버튼이 있다");
  check(admin.includes("남은 횟수는 그대로입니다"), "T5 그리고 푸는 것이 충전이 아니라는 것을 말해 준다");
}

console.log(`PASS attempt limit: ${passed}/${passed}`);
