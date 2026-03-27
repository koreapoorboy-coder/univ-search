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
  panel.style.padding = "18px";
  panel.style.border = "1px solid #d8dde6";
  panel.style.borderRadius = "20px";
  panel.style.background = "linear-gradient(180deg,#ffffff 0%,#fbfcff 100%)";
  panel.style.boxShadow = "0 8px 24px rgba(15,23,42,.04)";

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-weight:800;color:#5b6b85;letter-spacing:.04em;margin-bottom:4px">INTEGRATED ENGINE</div>
        <h2 style="margin:0;font-size:24px;font-weight:900;color:#182131">통합 엔진 결과</h2>
      </div>
      <button id="integrated-engine-toggle"
        style="border:1px solid #111;background:#111;color:#fff;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer">
        통합 엔진 결과 보기
      </button>
    </div>

    <div id="integrated-engine-body" style="display:none;margin-top:18px">
      <div id="integrated-engine-summary" style="margin:0 0 20px;line-height:1.8"></div>
      <div id="integrated-engine-pattern" style="margin:0 0 20px"></div>
      <div id="integrated-engine-extensions" style="margin:0 0 20px"></div>
      <div id="integrated-engine-cases" style="margin:0 0 20px"></div>
      <div id="integrated-engine-actions" style="margin:0 0 20px"></div>
      <details>
        <summary style="cursor:pointer;font-weight:700">원본 JSON 보기</summary>
        <pre id="integrated-engine-json" style="white-space:pre-wrap;background:#f6f8fb;padding:12px;border-radius:12px;margin-top:10px;border:1px solid #e7ebf2"></pre>
      </details>
    </div>
  `;

  const btn = panel.querySelector("#integrated-engine-toggle");
  const body = panel.querySelector("#integrated-engine-body");

  btn.addEventListener("click", () => {
    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    btn.textContent = isOpen ? "통합 엔진 결과 보기" : "통합 엔진 결과 접기";
  });

  return panel;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBulletList(items = [], emptyText = "내용 없음") {
  return items.length
    ? `<ul style="margin:0;padding-left:20px;line-height:1.7">${items
        .map((x) => `<li style="margin:6px 0">${escapeHtml(x)}</li>`)
        .join("")}</ul>`
    : `<div style="color:#6b7280">${escapeHtml(emptyText)}</div>`;
}

function renderSummary(summary = []) {
  return `
    <div style="border:1px solid #e6ebf2;border-radius:18px;padding:18px;background:#ffffff">
      <div style="font-weight:900;font-size:20px;margin-bottom:10px;color:#172033">핵심 요약</div>
      ${renderBulletList(summary, "요약 없음")}
    </div>
  `;
}

function renderPatternBox(item = {}) {
  if (!item || !item.current_position) return "";

  const diagnosis = item.current_position || "판정 정보 없음";
  const oneLine = item.coaching_message || "해석 정보 없음";
  const strengths = item.strength_view || [];
  const weaknesses = item.weakness_view || [];

  return `
    <div style="border:1px solid #dbe4f0;border-radius:20px;padding:18px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px">
        <div>
          <div style="font-size:12px;font-weight:800;color:#5b6b85;letter-spacing:.04em;margin-bottom:4px">PATTERN POSITION</div>
          <div style="font-weight:900;font-size:22px;color:#172033">현재 위치 진단</div>
        </div>
        <div style="display:inline-flex;align-items:center;border:1px solid #c7d5e8;background:#fff;border-radius:999px;padding:8px 14px;font-weight:800;color:#17324f">
          ${escapeHtml(diagnosis)}
        </div>
      </div>

      <div style="border:1px solid #dfe8f5;background:#ffffff;border-radius:16px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:800;color:#5b6b85;margin-bottom:6px">한 줄 해석</div>
        <div style="font-size:15px;line-height:1.8;color:#1f2937;font-weight:700">${escapeHtml(oneLine)}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
        <div style="border:1px solid #d8e7db;border-radius:16px;padding:16px;background:#f8fff9">
          <div style="font-weight:900;font-size:18px;color:#15603a;margin-bottom:10px">강점</div>
          ${renderBulletList(strengths, "강점 요소 없음")}
        </div>
        <div style="border:1px solid #f1dfc8;border-radius:16px;padding:16px;background:#fffaf4">
          <div style="font-weight:900;font-size:18px;color:#9a5a11;margin-bottom:10px">보완 포인트</div>
          ${renderBulletList(weaknesses, "보완 요소 없음")}
        </div>
      </div>
    </div>
  `;
}

function renderExtensions(items = []) {
  if (!items.length) {
    return `
      <div style="border:1px solid #e6ebf2;border-radius:20px;padding:20px;background:#fff">
        <div style="font-weight:900;font-size:22px;margin-bottom:8px;color:#172033">확장 탐구 설계</div>
        <div style="color:#6b7280">추천 없음</div>
      </div>
    `;
  }

  return `
    <div>
      <div style="font-weight:900;font-size:22px;margin-bottom:12px;color:#172033">확장 탐구 설계</div>
      <div style="display:grid;gap:16px">
        ${items.map((item) => {
          const consultantComment = item.consultant_comment || `${item.title || '이 탐구'}는 단순 활동 추가용이 아니라, 현재 생활기록부의 관심 축을 대표 탐구로 정리해 설명력을 높이는 설계안이다.`;
          return `
          <div style="border:1px solid #dbe4f0;border-radius:22px;padding:18px;background:linear-gradient(180deg,#fcfdff 0%,#f7faff 100%)">
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
              <div style="font-weight:900;font-size:20px;color:#182131">${escapeHtml(item.priority)}. ${escapeHtml(item.title)}</div>
              <div style="font-size:12px;font-weight:800;color:#5b6b85;letter-spacing:.04em">CONSULTING DESIGN</div>
            </div>

            <div style="display:grid;grid-template-columns:1.3fr .9fr;gap:12px;margin-bottom:12px">
              <div style="border:1px solid #e4ebf5;border-radius:16px;padding:14px;background:#fff">
                <div style="font-size:13px;font-weight:800;color:#5b6b85;margin-bottom:6px">핵심 탐구 설계</div>
                <div style="font-size:16px;line-height:1.8;font-weight:700;color:#1f2937">${escapeHtml(item.direction || '')}</div>
              </div>
              <div style="border:1px solid #e4ebf5;border-radius:16px;padding:14px;background:#fff">
                <div style="font-size:13px;font-weight:800;color:#5b6b85;margin-bottom:6px">설계 의도</div>
                <div style="line-height:1.8;color:#1f2937">${escapeHtml(item.why_this || '')}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-bottom:12px">
              ${[
                ['문제 정의', item.start],
                ['분석 설계', item.expand],
                ['심화 설계', item.deepen],
                ['결론 설계', item.complete],
              ].map(([label, value]) => `
                <div style="border:1px solid #e4ebf5;border-radius:16px;padding:14px;background:#fff">
                  <div style="font-size:13px;font-weight:800;color:#5b6b85;margin-bottom:7px">${label}</div>
                  <div style="line-height:1.8;color:#1f2937">${escapeHtml(value || '')}</div>
                </div>`).join('')}
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px">
              <div style="border:1px solid #e4ebf5;border-radius:16px;padding:14px;background:#fff">
                <div style="font-weight:800;margin-bottom:8px;color:#182131">예상 산출물</div>
                ${renderBulletList(item.outputs || [], '산출물 없음')}
              </div>
              <div style="border:1px solid #e4ebf5;border-radius:16px;padding:14px;background:#fff">
                <div style="font-weight:800;margin-bottom:8px;color:#182131">학생부 반영 포인트</div>
                ${renderBulletList(item.record_points || [], '반영 포인트 없음')}
              </div>
            </div>

            <div style="border:1px solid #d7e6dc;border-radius:16px;padding:14px;background:#f8fff9">
              <div style="font-size:13px;font-weight:800;color:#46604b;margin-bottom:6px">컨설턴트 해설</div>
              <div style="line-height:1.8;color:#1f2937">${escapeHtml(consultantComment)}</div>
            </div>
          </div>`
        }).join('')}
      </div>
    </div>
  `;
}

function renderCases(items = []) {
  if (!items.length) {
    return `
      <div style="border:1px solid #e6ebf2;border-radius:18px;padding:18px;background:#fff">
        <div style="font-weight:900;font-size:20px;margin-bottom:8px">유사 합격생 패턴</div>
        <div style="color:#6b7280">매칭 없음</div>
      </div>
    `;
  }

  return `
    <div>
      <div style="font-weight:900;font-size:20px;margin-bottom:10px;color:#172033">유사 합격생 패턴</div>
      <div style="display:grid;gap:12px">
        ${items
          .map(
            (item) => `
          <div style="border:1px solid #e1e5ee;border-radius:16px;padding:14px;background:#fffdf8">
            <div style="font-weight:900;margin-bottom:8px;font-size:17px;color:#182131">${escapeHtml(item.university)} ${escapeHtml(item.major)}</div>
            <div style="margin-bottom:6px;line-height:1.7"><b>참고 이유</b> · ${escapeHtml(item.why_similar || "")}</div>
            <div style="line-height:1.7"><b>활용 방식</b> · ${escapeHtml(item.use_point || "")}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderActions(items = []) {
  if (!items.length) return "";
  return `
    <div>
      <div style="font-weight:900;font-size:20px;margin-bottom:10px;color:#172033">실행 계획</div>
      <div style="display:grid;gap:10px">
        ${items
          .map(
            (item) => `
          <div style="border:1px solid #e1e5ee;border-radius:14px;padding:12px;background:#f9fbff">
            <div style="font-weight:800;color:#182131">${escapeHtml(item.step)}. ${escapeHtml(item.title)}</div>
            <div style="margin-top:4px;line-height:1.7">${escapeHtml(item.goal || "")}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderResult(output) {
  document.getElementById("integrated-engine-summary").innerHTML = renderSummary(output?.summary || []);
  document.getElementById("integrated-engine-pattern").innerHTML = renderPatternBox(output?.current_pattern_position || {});
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

  document.getElementById("integrated-engine-summary").innerHTML = `
    <div style="border:1px solid #e6ebf2;border-radius:18px;padding:18px;background:#fff">로딩 중...</div>
  `;
  document.getElementById("integrated-engine-pattern").textContent = "";
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
