// Reading a student's past 보고서 or 생활기록부 (admission_worker_skeleton/upload_analysis_v1.mjs).
// The upload is checked by size, nothing personal survives the analysis, and the draft is only told to continue
// the topic when the upload and the task actually share ground.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DOC, UPLOAD_LIMITS, analysisPromptLines, analysisSchema, checkUpload, priorWorkPromptLines, sanitizeAnalysis,
  scrubPersonal, sharesGround,
} from "../../../admission_worker_skeleton/upload_analysis_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };

const file = (name, type, size) => ({ name, type, size });
const MB = 1024 * 1024;

// The student meets a size limit, not a file count: a 생활기록부 can run to many pages.
check(checkUpload([file("보고서.pdf", "application/pdf", 2 * MB)]) === "", "a normal upload passes");
check(checkUpload([]) !== "", "an empty upload is refused");
check(checkUpload([file("큰파일.pdf", "application/pdf", 11 * MB)]).includes("10MB"), "one oversized file is refused by size",
  checkUpload([file("큰파일.pdf", "application/pdf", 11 * MB)]));
check(checkUpload(Array.from({ length: 12 }, (_, i) => file(`p${i}.jpg`, "image/jpeg", 2 * MB))).includes("20MB"),
  "many photos are refused on the total, not the count");
check(checkUpload(Array.from({ length: 14 }, (_, i) => file(`p${i}.jpg`, "image/jpeg", MB))) === "",
  "fourteen photos inside the total are fine — a 생활기록부 has many pages");
check(checkUpload([file("보고서.hwp", "application/x-hwp", MB)]).includes("PDF와 사진"), "a file we cannot read is refused with a reason");
check(UPLOAD_LIMITS.types.includes("application/pdf") && UPLOAD_LIMITS.types.includes("image/jpeg"), "PDFs and photos are both accepted");

// Nothing personal may survive, but the scrub must not eat ordinary words.
check(scrubPersonal("풍생고등학교 이지훈 학생이 조사한 내용") === "조사한 내용", "a school and a name are removed",
  scrubPersonal("풍생고등학교 이지훈 학생이 조사한 내용"));
check(scrubPersonal("김민수 선생님의 지도로 진행함") === "지도로 진행함", "a teacher's name is removed");
check(scrubPersonal("그리고 참고 자료를 비교함") === "그리고 참고 자료를 비교함", "ordinary words survive the scrub",
  scrubPersonal("그리고 참고 자료를 비교함"));
check(scrubPersonal("확률과 통계 과목에서 자료를 해석함") === "확률과 통계 과목에서 자료를 해석함", "a subject name survives the scrub");

const rawRecord = {
  docType: "record",
  docTypeReason: "학년별 세부능력특기사항이 이어져 있음",
  subjectGuess: "생명과학",
  gradeGuess: "고2",
  level: "고2 수준",
  report: { title: "버려질 값", question: "", concepts: [], method: "", findings: "", limits: "", nextSteps: [] },
  record: {
    activitySummary: "풍생고등학교에서 1학년 때는 환경 주제를 조사했고 2학년에는 효소 실험으로 옮겨감.",
    repeatedInterests: ["효소", "환경", "", "식품"],
    strongSides: ["자료 비교가 꼼꼼함"],
    thinSides: ["수치 분석이 거의 없음"],
  },
  reportLines: [
    { title: "효소 활성의 온도 의존성 정량 비교", subject: "생명과학", why: "효소 관심이 2년째 이어짐", step: "문헌 정리 → 변인 통제 실험" },
    { title: "", subject: "", why: "제목이 없어 버려져야 함", step: "" },
  ],
};
const record = sanitizeAnalysis(rawRecord);
check(record.docType === DOC.RECORD && record.report === null, "a record analysis carries no report fields");
check(!record.record.activitySummary.includes("풍생고"), "the school never reaches the stored analysis", record.record.activitySummary);
check(record.record.repeatedInterests.length === 3, "empty interests are dropped", record.record.repeatedInterests.join(","));
check(record.reportLines.length === 1 && record.reportLines[0].step.includes("변인 통제"), "a report line without a title is dropped");

const report = sanitizeAnalysis({
  docType: "report", docTypeReason: "", subjectGuess: "통합과학", gradeGuess: "고1", level: "고1 수준",
  report: { title: "세제 종류에 따른 얼룩 제거", question: "어떤 세제가 잘 지우는가?", concepts: ["효소", "계면활성제"], method: "세 조건 비교", findings: "효소 세제가 높았다", limits: "반복이 1회뿐", nextSteps: ["온도까지 함께 바꾸기"] },
  record: { activitySummary: "버려질 값", repeatedInterests: [], strongSides: [], thinSides: [] },
  reportLines: [],
});
check(report.record === null && report.report.concepts.length === 2, "a report analysis carries no record fields");

// Same ground continues the topic; different ground continues the method instead. Both are stated to the model.
const task = { taskDescription: "효소의 작용 조건을 알아보는 탐구 보고서", selectedConcept: "효소와 온도", subject: "생명과학" };
check(sharesGround(report, task), "an upload about the same concept shares ground");
check(!sharesGround(report, { taskDescription: "조선 후기 신분제 변화를 조사하시오", subject: "한국사" }), "an unrelated task does not share ground");
const sameLines = priorWorkPromptLines(report, true).join("\n");
const otherLines = priorWorkPromptLines(report, false).join("\n");
check(sameLines.includes("종단 탐구") && sameLines.includes("한 단계 깊게"), "sharing ground means continuing the topic");
check(otherLines.includes("억지로 잇지 않는다") && otherLines.includes("탐구 방법"), "different ground means continuing the method only",
  otherLines.slice(-90));
check(sameLines.includes('"지난 보고서"라는 말을 쓰지 않는다'), "the report never mentions the upload out loud");
check(priorWorkPromptLines(null, true).length === 0, "no upload means no extra instructions");

const schema = analysisSchema();
check(schema.docType.enum.join() === "report,record,other", "the model must say which kind of document it read");
check(schema.reportLines.maxItems === 4 && schema.reportLines.items.required.join() === "title,subject,why,step",
  "every proposed report line says what it is, where, why and what deepens");
const prompt = analysisPromptLines({ targetLevel: "고3~대학 1학년 수준" }).join("\n");
check(prompt.includes("사람 이름, 학교 이름") && prompt.includes("옮기지 않는다"), "the model is told to leave names behind");
check(prompt.includes("고3~대학 1학년 수준"), "the proposed lines aim at this student's level");
check(prompt.includes("억지로 잇지 않는다"), "the model is told not to force an unrelated link");
check(prompt.includes("색도계") && prompt.includes("통계 검정") && prompt.includes("평균과 흔들림"),
  "the proposals stay inside what a student and this engine can actually do");

const worker = await readFile(new URL("../../../admission_worker_skeleton/worker.js", import.meta.url), "utf8");
check(worker.includes("url.pathname === '/analyze-upload'"), "the Worker serves the upload analysis as its own action");
check(worker.includes("input_file") && worker.includes("input_image"), "PDFs and photos are both sent to the model");
check(worker.includes("CREATE TABLE IF NOT EXISTS student_uploads"), "the analysis is stored so the corpus grows");
const uploadTable = worker.slice(worker.indexOf("CREATE TABLE IF NOT EXISTS student_uploads"), worker.indexOf("async function saveUploadAnalysis"));
check(!/raw_text|transcript|full_text|file_data/.test(uploadTable) && worker.includes("JSON.stringify(analysis)"),
  "only the derived analysis is stored, never the transcription", uploadTable.slice(0, 80));

check(worker.includes("priorWorkPromptLines(input.priorWork, sharesGround(input.priorWork, input))"),
  "what the student already did reaches the draft instructions");
check(worker.includes("input.priorWork = trustedPayload?.priorWork ? sanitizeAnalysis(trustedPayload.priorWork) : null"),
  "the analysis is sanitised again when it comes back through the browser");

console.log(`PASS upload analysis: ${passed}/${passed}`);
