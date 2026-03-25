// engine_page_hook.js
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
  panel.style.padding = "20px";
  panel.style.border = "1px solid #d8dde6";
  panel.style.borderRadius = "18px";
  panel.style.background = "#fff";

  panel.innerHTML = `
    <h2 style="margin:0 0 14px;font-size:22px;font-weight:900">통합 엔진 결과</h2>
    <div id="integrated-engine-summary" style="margin:0 0 18px;line-height:1.8"></div>
    <div id="integrated-engine-extensions" style="margin:0 0 18px"></div>
    <div id="integrated-engine-cases" style="margin:0 0 18px"></div>
    <div id="integrated-engine-actions" style="margin:0 0 18px"></div>
    <details>
      <summary style="cursor:pointer;font-weight:700">원본 JSON 보기</summary>
      <pre id="integrated-engine-json" style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:12px;margin-top:10px"></pre>
    </details>
  `;
  return panel;
}

function renderSummary(summary = []) {
  return summary.length
    ? `<ul style="margin:0;padding-left:22px">${summary.map(x => `<li style="margin:6px 0">${x}</li>`).join("")}</ul>`
    : `요약 없음`;
}

function renderExtensions(items = []) {
  if (!items.length) return `<div>추천 없음</div>`;

  return `
    <div style="font-weight:900;font-size:20px;margin-bottom:10px">확장 탐구 설계</div>
    <div style="display:grid;gap:14px">
      ${items.map(item => `
        <div style="border:1px solid #e1e5ee;border-radius:16px;padding:16px;background:#fafbfd">
          <div style="font-weight:900;font-size:18px;margin-bottom:8px">${item.priority}. ${item.title}</div>
          <div style="margin-bottom:8px"><b>탐구 방향</b> · ${item.direction}</div>
          <div style="margin-bottom:8px"><b>왜 이 방향인가</b> · ${item.why_this}</div>
          <div style="margin-bottom:6px"><b>출발</b> · ${item.start}</div>
          <div style="margin-bottom:6px"><b>확장</b> · ${item.expand}</div>
          <div style="margin-bottom:6px"><b>심화</b> · ${item.deepen}</div>
          <div style="margin-bottom:8px"><b>완성</b> · ${item.complete}</div>
          <div style="margin-bottom:6px"><b>결과 형태</b></div>
          <ul style="margin:0 0 10px 0;padding-left:20px">
            ${(item.outputs || []).map(x => `<li>${x}</li>`).join("")}
          </ul>
          <div style="margin-bottom:6px"><b>기록될 포인트</b></div>
          <ul style="margin:0;padding-left:20px">
            ${(item.record_points || []).map(x => `<li>${x}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCases(items = []) {
  if (!items.length) return `<div>매칭 없음</div>`;
  return `
    <div style="font-weight:900;font-size:20px;margin-bottom:10px">유사 합격생 패턴</div>
    <div style="display:grid;gap:12px">
      ${items.map(item => `
        <div style="border:1px solid #e1e5ee;border-radius:16px;padding:14px;background:#fffdf8">
          <div style="font-weight:900;margin-bottom:6px">${item.university} ${item.major}</div>
          <div style="margin-bottom:6px"><b>참고 이유</b> · ${item.why_similar}</div>
          <div><b>활용 방식</b> · ${item.use_point}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderActions(items = []) {
  if (!items.length) return "";
  return `
    <div style="font-weight:900;font-size:20px;margin-bottom:10px">실행 계획</div>
    <div style="display:grid;gap:10px">
      ${items.map(item => `
        <div style="border:1px solid #e1e5ee;border-radius:14px;padding:12px;background:#f9fbff">
          <div style="font-weight:800">${item.step}. ${item.title}</div>
          <div style="margin-top:4px">${item.goal}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderResult(output) {
  document.getElementById("integrated-engine-summary").innerHTML = renderSummary(output?.summary || []);
  document.getElementById("integrated-engine-extensions").innerHTML = renderExtensions(output?.extension_recommendations || []);
  document.getElementById("integrated-engine-cases").innerHTML = renderCases(output?.admission_case_matches || []);
  document.getElementById("integrated-engine-actions").innerHTML = renderActions(output?.action_plan || []);
  document.getElementById("integrated-engine-json").textContent = JSON.stringify(output, null, 2);
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

  document.getElementById("integrated-engine-summary").textContent = "로딩 중...";
  document.getElementById("integrated-engine-extensions").textContent = "";
  document.getElementById("integrated-engine-cases").textContent = "";
  document.getElementById("integrated-engine-actions").textContent = "";
  document.getElementById("integrated-engine-json").textContent = "";

  const result = await runIntegratedStudent(studentId, {
    recordDetailPath: options.recordDetailPath || "../student/record_detail.json",
    rawRecordPath: options.rawRecordPath || "../student/school_record_raw.json",
    integratedIndexPath: options.integratedIndexPath || "../integrated_engine_index.json"
  });

  renderResult(result.output);
  return result;
}
