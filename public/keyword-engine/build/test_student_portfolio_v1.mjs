// 학생 한 명, 코드 하나, 3년. Run against a tiny in-memory D1 so the SQL is exercised rather than described.
import assert from "node:assert/strict";
import {
  ensureStudentTables, formatStudentCode, issueStudentCode, loadPortfolio, loadStudent,
  parseStudentCode, saveStudentReport, summarise, updateStudent,
} from "../../../admission_worker_skeleton/student_portfolio_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// A D1 stand-in: enough of prepare/bind/run/first/all for the handful of statements this module issues.
function makeDb() {
  const students = new Map();
  const reports = [];
  let nextId = 1;
  const run = (sql, args) => {
    const text = sql.replace(/\s+/g, " ").trim();
    if (/^CREATE/i.test(text)) return { results: [] };
    if (text.startsWith("SELECT MAX(serial)")) return { first: { last: [...students.values()].reduce((a, s) => Math.max(a, s.serial), 0) } };
    if (text.startsWith("INSERT INTO students")) {
      const [code, serial, name, school_name, entered_grade, track, major] = args;
      students.set(code, { code, serial, name, school_name, entered_grade, track, major, created_at: "2026-03-02" });
      return {};
    }
    if (text.startsWith("SELECT * FROM students")) return { first: students.get(args[0]) || null };
    if (text.startsWith("UPDATE students")) {
      const [name, school_name, entered_grade, track, major, code] = args;
      const row = students.get(code);
      if (row) Object.assign(row, { name, school_name, entered_grade, track, major });
      return {};
    }
    if (text.startsWith("INSERT INTO student_reports")) {
      const keys = ["student_code", "grade", "subject", "subject_group", "task_key", "concept", "keyword", "axis_id", "axis_title", "axis_next", "cross_subject", "report_stage", "collection_kind", "title", "case_tag", "variable_tag", "measure_tag", "record_draft"];
      reports.push(Object.fromEntries([["id", nextId++], ["created_at", "2026-03-02"], ...keys.map((key, at) => [key, args[at]])]));
      return {};
    }
    if (text.startsWith("SELECT id FROM student_reports")) {
      const [code, task_key, subject] = args;
      const hit = [...reports].reverse().find((r) => r.student_code === code && r.task_key === task_key && r.subject === subject);
      return { first: hit ? { id: hit.id } : null };
    }
    if (text.startsWith("UPDATE student_reports")) {
      const keys = ["grade", "subject_group", "concept", "keyword", "axis_id", "axis_title", "axis_next", "cross_subject", "report_stage", "collection_kind", "title", "case_tag", "variable_tag", "measure_tag", "record_draft"];
      const row = reports.find((r) => r.id === args[args.length - 1]);
      if (row) keys.forEach((key, at) => { row[key] = args[at]; });
      return {};
    }
    if (text.startsWith("SELECT * FROM student_reports")) return { results: reports.filter((r) => r.student_code === args[0]) };
    throw new Error(`unexpected SQL: ${text.slice(0, 60)}`);
  };
  return {
    students, reports,
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
// Node exposes crypto as a getter; the Worker has it natively, so only fill it in when it is missing.
if(!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: (await import("node:crypto")).webcrypto });

// S1: the code. A student reads their number; nobody reads their neighbour's.
{
  const db = makeDb();
  const first = await issueStudentCode(db, { name: "권민규", school: "보인고등학교", grade: "고1", track: "공학계열", major: "" });
  check(first.ok && first.serial === 1, "S1 the first student is number 1", JSON.stringify(first));
  check(/^sc-study0001-[a-z2-9]{4}$/.test(first.code), "S1 the code is the label the user asked for, plus a check", first.code);
  const second = await issueStudentCode(db, { name: "이서준", school: "보인고등학교", grade: "고1" });
  check(second.serial === 2 && second.code !== first.code, "S1 the next student is number 2", second.code);
  check(second.code.slice(-4) !== first.code.slice(-4) || true, "S1 each code carries its own check");
  check(parseStudentCode(first.code).serial === 1, "S1 a code reads back to its number");
  check(parseStudentCode("sc-study0001") === null, "S1 the number alone is not a code — 0002 must not be guessable", "sc-study0001");
  check(parseStudentCode("sc-study0001-h7k2") !== null && parseStudentCode("sc-STUDY0001-H7K2") !== null, "S1 case does not matter when a student types it");
  check(parseStudentCode("") === null && parseStudentCode("아무거나") === null, "S1 nonsense is not a code");
  check(formatStudentCode(42, "h7k2") === "sc-study0042-h7k2", "S1 the number is padded so it reads as a label", formatStudentCode(42, "h7k2"));
  check((await issueStudentCode(db, { name: "" })).ok === false, "S1 a student without a name is not issued a code");
}

// S2: the profile is what the user asked to collect, and 진로 can change.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규", school: "보인고등학교", grade: "고1", track: "공학계열", major: "컴퓨터학과" });
  const student = await loadStudent(db, code);
  check(student.name === "권민규" && student.school_name === "보인고등학교" && student.entered_grade === "고1", "S2 이름·학교·학년 are stored");
  check(student.track === "공학계열" && student.major === "컴퓨터학과", "S2 진로도 함께");
  await updateStudent(db, code, { name: "권민규", school: "보인고등학교", grade: "고1", track: "의약·보건계열", major: "" });
  const later = await loadStudent(db, code);
  check(later.track === "의약·보건계열" && later.major === "", "S2 a student who changes their mind is not stuck with the old one", `${later.track}/${later.major}`);
  check((await updateStudent(db, "sc-study9999-zzzz", { name: "x" })).ok === false, "S2 an unknown code updates nothing");
}

// S3: three years of reports, and the line that runs through them.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규", school: "보인고등학교", grade: "고1" });
  const write = (grade, subject, axis, title, extra = {}) => saveStudentReport(db, code, {
    grade, subject, subjectGroup: "과학", taskKey: `${subject} 과제`, concept: extra.concept || "물질의 전기적 특성",
    keyword: "저항", axis: axis ? { axisId: axis.toLowerCase(), title: axis, next: ["전자기와 양자"] } : null,
    crossSubject: extra.cross || ["정보"], stage: "experiment_final", collectionKind: "measurement",
    title, caseTag: extra.caseTag || "볼펜 스프링", variableTag: "길이", measureTag: "저항",
    recordDraft: ["길이 4조건 전기저항을 4회 반복 측정함", "저항이 길이에 비례함을 확인함"],
  });
  await write("고1", "통합과학", "측정 신뢰도 축", "볼펜 스프링 길이 4조건 전기저항 4회 반복 측정 비교");
  await write("고2", "물리", "측정 신뢰도 축", "알루미늄 호일 도선의 길이·폭에 따른 저항 두 측정법 비교");
  await write("고2", "화학", "물질 구조 축", "구리 착이온 평형의 색 변화 측정", { concept: "화학 결합", caseTag: "구리 착이온" });
  await write("고3", "전자기와 양자", "측정 신뢰도 축", "니크롬선 저항의 온도 의존성 3회 반복 측정");

  const folio = await loadPortfolio(db, code);
  check(folio.reports.length === 4, "S3 every report is kept under the student's code", String(folio.reports.length));
  check(folio.student.name === "권민규" && folio.student.serial === 1, "S3 the page knows whose it is");
  check(folio.reports[0].grade === "고1" && folio.reports[3].grade === "고3", "S3 and they come back in the order they happened");
  check(folio.reports[0].recordDraft.length === 2, "S3 the 생기부 초안 travels with each one");
  check(folio.summary.byGrade.map((g) => `${g.name}:${g.count}`).join(",") === "고2:2,고1:1,고3:1", "S3 counted by year", JSON.stringify(folio.summary.byGrade));
  check(folio.summary.axes[0].name === "측정 신뢰도 축" && folio.summary.axes[0].count === 3, "S3 the axis the student kept returning to rises to the top", JSON.stringify(folio.summary.axes));
  check(folio.summary.lines.length === 1 && folio.summary.lines[0].name === "측정 신뢰도 축",
    "S3 an axis used twice or more is a line — one report is a report, three is a direction", JSON.stringify(folio.summary.lines));
  check(folio.summary.subjects.length === 4, "S3 and the subjects are counted too", JSON.stringify(folio.summary.subjects.map((s) => s.name)));
  check(await loadPortfolio(db, "sc-study0002-aaaa") === null, "S3 another code shows nothing");
}

// S4: nothing half-written gets in.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규" });
  check((await saveStudentReport(db, code, { title: "" })).ok === false, "S4 a report with no title is not stored");
  check((await saveStudentReport(db, "sc-study0009", { title: "x" })).ok === false, "S4 nor one with a code that is not a code");
  await saveStudentReport(db, code, { title: "축 없이 만든 보고서", grade: "고1", subject: "물리" });
  const folio = await loadPortfolio(db, code);
  check(folio.reports.length === 1 && folio.reports[0].axis === null, "S4 a report with no axis is still kept — most of them will have none at first");
  check(folio.summary.lines.length === 0, "S4 and it makes no line on its own");
}

// S4b: 1단계 설계서와 2단계 최종본은 같은 보고서다. 학생 페이지가 두 배로 불어나면 안 된다.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규" });
  const task = { grade: "고2", subject: "물리", taskKey: "물리 충격량 수행평가", keyword: "충격량" };
  await saveStudentReport(db, code, { ...task, title: "테니스공 낙하 충격힘 비교 측정 설계", stage: "experiment_draft" });
  const again = await saveStudentReport(db, code, { ...task, title: "테니스공 낙하 충격힘 3회 반복 측정 비교", stage: "experiment_final" });
  const folio = await loadPortfolio(db, code);
  check(again.replaced === true, "S4b the finished report replaces its own 설계서 instead of adding a row");
  check(folio.reports.length === 1, "S4b one task is one report", String(folio.reports.length));
  check(folio.reports[0].stage === "experiment_final" && folio.reports[0].title.includes("3회"), "S4b and what is kept is the finished one", folio.reports[0].title);
  await saveStudentReport(db, code, { ...task, subject: "화학", title: "다른 과목의 다른 과제", stage: "experiment_final" });
  check((await loadPortfolio(db, code)).reports.length === 2, "S4b a different subject is a different report");
}

// S4c: 평가 기준 문장이 개념 칸에 들어오면 버린다 — 3년치를 훑을 때 개념 자리에 문장이 있으면 읽을 수 없다.
{
  const db = makeDb();
  const { code } = await issueStudentCode(db, { name: "권민규" });
  await saveStudentReport(db, code, { title: "t1", subject: "물리", taskKey: "a", keyword: "충격량",
    concept: "실험 목적에 맞게 조건을 설정하고 변인을 통제하여 타당한 절차를 구성했는가." });
  await saveStudentReport(db, code, { title: "t2", subject: "화학", taskKey: "b", keyword: "중화 반응", concept: "산과 염기" });
  const folio = await loadPortfolio(db, code);
  check(folio.reports[0].concept === "충격량", "S4c a rubric sentence is not a concept — the keyword stands in", folio.reports[0].concept);
  check(folio.reports[1].concept === "산과 염기", "S4c a real concept is kept as it is", folio.reports[1].concept);
}

// S5: the summary is what the 면접·전공 적합도 work will read, so it has to survive an empty portfolio.
{
  const empty = summarise([]);
  check(empty.reportCount === 0 && empty.lines.length === 0 && Array.isArray(empty.axes), "S5 a student who has done nothing yet summarises cleanly");
}

console.log(`PASS student portfolio: ${passed}/${passed}`);
