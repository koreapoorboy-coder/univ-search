// engine_page_hook.js
// record_detail.html / record_detail_extension.html 같은 기존 페이지에서
// student_id를 읽어 통합 엔진 결과를 페이지에 주입하는 공용 훅

import { runIntegratedStudent } from "./integrated_student_runner.js";

function getStudentIdFromUrl() {
  const qs = new URLSearchParams(window.location.search);
  return qs.get("student_id") || qs.get("id") || "";
}

function createDefaultPanel() {
  let panel = document.getElementById("integrated-engine-panel");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.id = "integrated-engine-panel";
  panel.style.margin = "20px 0";
  panel.style.padding = "16px";
  panel.style.border = "1px solid #ddd";
  panel.style.borderRadius = "16px";
  panel.style.background = "#fff";

  panel.innerHTML = `
    <h2 style="margin:0 0 10px;font-size:20px">통합 엔진 결과</h2>
    <div id="integrated-engine-summary" style="margin:0 0 12px;line-height:1.7"></div>
    <div id="integrated-engine-extensions" style="margin:0 0 12px"></div>
    <div id="integrated-engine-cases" style="margin:0 0 12px"></div>
    <details>
      <summary style="cursor:pointer;font-weight:700">원본 JSON 보기</summary>
      <pre id="integrated-engine-json" style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:12px;margin-top:10px"></pre>
    </details>
  `;
  return panel;
}

function renderResult(output) {
  const summaryEl = document.getElementById("integrated-engine-summary");
  const extEl = document.getElementById("integrated-engine-extensions");
  const caseEl = document.getElementById("integrated-engine-cases");
  const jsonEl = document.getElementById("integrated-engine-json");

  const summary = Array.isArray(output?.summary) ? output.summary : [];
  summaryEl.innerHTML = summary.length
    ? `<ul style="margin:0;padding-left:18px">${summary.map(x => `<li>${x}</li>`).join("")}</ul>`
    : `요약 없음`;

  const exts = Array.isArray(output?.extension_recommendations) ? output.extension_recommendations : [];
  extEl.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px">확장활동 추천</div>
    ${exts.length ? `
      <ul style="margin:0;padding-left:18px">
        ${exts.map(x => `<li><b>${x.title}</b> — ${x.reason || ""}</li>`).join("")}
      </ul>` : `추천 없음`}
  `;

  const cases = Array.isArray(output?.admission_case_matches) ? output.admission_case_matches : [];
  caseEl.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px">유사 합격생 패턴</div>
    ${cases.length ? `
      <ul style="margin:0;padding-left:18px">
        ${cases.map(x => `<li><b>${x.university || ""} ${x.major || ""}</b> — ${x.match_reason || ""}</li>`).join("")}
      </ul>` : `매칭 없음`}
  `;

  jsonEl.textContent = JSON.stringify(output, null, 2);
}

export async function mountIntegratedEngineResult(options = {}) {
  const studentId = options.studentId || getStudentIdFromUrl();
  if (!studentId) throw new Error("student_id not found in URL");

  const mountSelector = options.mountSelector || "main, .main, .wrap, body";
  const mountTarget = document.querySelector(mountSelector) || document.body;
  const panel = createDefaultPanel();

  if (!panel.parentElement) {
    mountTarget.prepend(panel);
  }

  const summaryEl = document.getElementById("integrated-engine-summary");
  const extEl = document.getElementById("integrated-engine-extensions");
  const caseEl = document.getElementById("integrated-engine-cases");
  const jsonEl = document.getElementById("integrated-engine-json");

  summaryEl.textContent = "로딩 중...";
  extEl.textContent = "";
  caseEl.textContent = "";
  jsonEl.textContent = "";

  const result = await runIntegratedStudent(studentId, {
    recordDetailPath: options.recordDetailPath || "../student/record_detail.json",
    rawRecordPath: options.rawRecordPath || "../student/school_record_raw.json",
    integratedIndexPath: options.integratedIndexPath || "../integrated_engine_index.json"
  });

  renderResult(result.output);
  return result;
}
