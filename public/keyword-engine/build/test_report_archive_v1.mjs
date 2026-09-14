// AI가 쓴 것이 남아야 우리가 고친다. This table is meant to be read for years, so the checks are about what
// gets in (everything), what never gets in (names), and whether a one-time report can be claimed later.
import assert from "node:assert/strict";
import {
  archiveRow, attachToStudent, costKrw, saveReportOutput, scrubForArchive,
} from "../../../admission_worker_skeleton/report_archive_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

// D1 stand-in: enough of prepare/bind/run/first for this module's statements.
function makeDb() {
  const rows = [];
  let nextId = 1;
  const run = (sql, args) => {
    const text = sql.replace(/\s+/g, " ").trim();
    if (/^CREATE/i.test(text)) return {};
    if (text.startsWith("INSERT INTO report_outputs")) {
      const columns = text.slice(text.indexOf("(") + 1, text.indexOf(")")).split(",").map((name) => name.trim());
      rows.push(Object.fromEntries([["id", nextId++], ...columns.map((name, at) => [name, args[at]])]));
      return {};
    }
    if (text.startsWith("SELECT * FROM report_outputs")) {
      const hit = [...rows].reverse().find((row) => row.report_id === args[0]);
      return { first: hit || null };
    }
    if (text.startsWith("UPDATE report_outputs")) {
      const row = rows.find((item) => item.report_id === args[1]);
      if (row) row.student_code = args[0];
      return {};
    }
    throw new Error(`unexpected SQL: ${text.slice(0, 60)}`);
  };
  return {
    rows,
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

const input = {
  studentCode: "", schoolName: "보인고등학교", grade: "고2", subject: "물리", subjectGroup: "과학",
  track: "공학계열", major: "전기전자공학부", taskDescription: "탐구 보고서를 작성하시오.",
  selectedKeyword: "저항", selectedConcept: "물질의 전기적 특성", reportStage: "experiment_final",
  collectionKind: "measurement", careerAxes: [{ axisId: "measure", title: "측정 신뢰도 축" }],
  crossSubject: { partners: [{ subject: "정보" }, { subject: "기하" }] },
  majorPath: { mode: "curriculum" }, reportShape: { structure: "structure_experiment_report" },
};
const result = {
  reportTitle: "니크롬선 저항의 온도 의존성 3회 반복 측정",
  탐구질문: "온도가 오르면 저항은 어떻게 변하는가.",
  탐구결과: "40도에서 80도까지 저항이 12% 증가했다.",
  결론: "금속 도선의 저항은 온도에 비례해 커진다.",
  recordDraft: ["온도 4조건 저항을 3회 반복 측정함", "저항이 온도에 비례함을 확인함"],
  combination: { caseTag: "니크롬선", variableTag: "온도", measureTag: "저항" },
  figures: [{ kind: "bar" }],
};
const meta = { reportId: "r-test-1", taskKey: "물리 저항 수행평가", model: "gpt-5", source: "openai",
  usage: { input_tokens: 8000, output_tokens: 6000, reasoning_tokens: 2000 }, tookMs: 95000 };

// A1: 본문이 남는다 — 지금까지 사라지던 절반.
{
  const row = archiveRow(input, result, meta);
  const body = JSON.parse(row.body_json);
  check(body.length === 3, "A1 every written section is kept", JSON.stringify(body.map((s) => s.key)));
  check(body.some((s) => s.text.includes("12% 증가")), "A1 with the sentences as the model wrote them");
  check(!body.some((s) => s.key === "figures" || s.key === "combination" || s.key === "recordDraft"),
    "A1 and only the writing — charts and tags have their own columns");
  check(row.body_chars > 0 && row.section_count === 3, "A1 counted so a sweep can ask about length without parsing",
    `${row.section_count} / ${row.body_chars}`);
  check(row.title.includes("니크롬선") && row.record_draft.split("\n").length === 2, "A1 제목과 생기부 초안도 함께");
}

// A2: 입력도 같은 줄에 있어야 한다. 무엇을 넣었을 때 이렇게 나왔는지가 한 줄에 없으면 고칠 수가 없다.
{
  const row = archiveRow(input, result, meta);
  check(row.subject === "물리" && row.grade === "고2" && row.track === "공학계열", "A2 who it was for");
  check(row.report_stage === "experiment_final" && row.collection_kind === "measurement", "A2 which path it took");
  check(row.report_structure === "structure_experiment_report" && row.major_path === "curriculum", "A2 which structure and which route");
  check(row.axis_title === "측정 신뢰도 축" && row.cross_subject === "정보, 기하", "A2 which axis and which crossing");
  check(row.case_tag === "니크롬선" && row.variable_tag === "온도", "A2 and the case it settled on");
}

// A3: 값이 남는다 — 얼마가 들었고 얼마나 걸렸는지.
{
  const row = archiveRow(input, result, meta);
  check(row.input_tokens === 8000 && row.output_tokens === 6000, "A3 tokens are recorded");
  check(row.cost_krw === Math.round(((8000 / 1e6) * 1.25 + (6000 / 1e6) * 10) * 1385),
    "A3 and the cost in 원, from the gpt-5 price", String(row.cost_krw));
  check(row.took_ms === 95000 && row.model === "gpt-5" && row.source === "openai", "A3 with the model and how long it took");
  check(costKrw({ input_tokens: 100, output_tokens: 100 }, "gpt-4.1") === 0,
    "A3 a model whose price we do not know records tokens and leaves the cost at 0 rather than guessing");
  check(costKrw(null, "gpt-5") === 0, "A3 no usage, no cost");
}

// A4: 이름은 안 남는다. 학생이 자유 입력 칸에 무엇을 적을지 우리는 모른다.
{
  check(scrubForArchive("이름: 권민규") === "이름: ○○○", "A4 a labelled name is removed", scrubForArchive("이름: 권민규"));
  check(scrubForArchive("작성자 : 이서준 드림").startsWith("작성자 : ○○○"), "A4 whatever the label");
  check(scrubForArchive("보인고등학교 2학년") === "○○학교 2학년", "A4 a school name too");
  check(scrubForArchive("참고 문헌을 정리했다") === "참고 문헌을 정리했다",
    "A4 and a narrow rule — a wide one ate 참고 the last time this was tried");
  const row = archiveRow({ ...input, taskDescription: "학생: 권민규. 보인고등학교 수행평가." }, result, meta);
  check(!row.task_description.includes("권민규") && !row.task_description.includes("보인고"),
    "A4 the scrub runs on what is stored, not only on what we ask the model", row.task_description);
}

// A5: 코드가 없어도 남는다 — 1회성 학생이 다수이고, 고쳐야 할 것은 그 보고서들에도 들어 있다.
{
  const db = makeDb();
  const saved = await saveReportOutput(db, input, result, meta);
  check(saved.ok && db.rows.length === 1, "A5 a report by a student with no code is still kept");
  check(db.rows[0].student_code === null, "A5 with no owner", String(db.rows[0].student_code));
  await saveReportOutput(db, { ...input, studentCode: "SC-Study0007-ab2c" }, result, { ...meta, reportId: "r-test-2" });
  check(db.rows[1].student_code === "sc-study0007-ab2c", "A5 and a code is carried when there is one");
  check((await saveReportOutput(db, input, { recordDraft: [] }, meta)).ok === false,
    "A5 a result with nothing written in it is not worth a row");
  check(db.rows.length === 2, "A5 so nothing was added for it");
}

// A6: 마음을 바꾼 학생은 그때 붙일 수 있다.
{
  const db = makeDb();
  await saveReportOutput(db, input, result, meta);
  const linked = await attachToStudent(db, "r-test-1", "sc-study0009-qq44");
  check(linked.ok && db.rows[0].student_code === "sc-study0009-qq44", "A6 a one-time report can be claimed later");
  check(linked.row.title.includes("니크롬선"), "A6 and comes back with what is needed to file it");
  check((await attachToStudent(db, "r-nope", "sc-study0009-qq44")).ok === false, "A6 an unknown report attaches to nothing");
  check((await attachToStudent(db, "r-test-1", "")).ok === false, "A6 and so does an empty code");
}

console.log(`PASS report archive: ${passed}/${passed}`);
