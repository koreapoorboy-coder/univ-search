/* report_6_8_flow_bridge.js
 * v26: 6번 보고서 구조 설계 → 7번 MINI payload → 8번 최종 출력 흐름 보정 브리지
 * 기존 1~5번/도서 추천 로직은 건드리지 않고, __BUILD_MINI_REPORT_PAYLOAD__ 결과를 화면에 연결한다.
 */
(function(global){
  "use strict";

  const VERSION = "report-6-8-flow-bridge-v26-mini-output";
  global.__REPORT_6_8_FLOW_BRIDGE_VERSION__ = VERSION;

  const q = (id) => document.getElementById(id);
  const arr = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
  const val = (v) => String(v == null ? "" : v).trim();
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  function getState(){
    return global.__TEXTBOOK_HELPER_STATE__ || {};
  }

  function getPayload(){
    if (typeof global.__BUILD_MINI_REPORT_PAYLOAD__ === "function") {
      try { return global.__BUILD_MINI_REPORT_PAYLOAD__(); } catch(error) { console.warn("MINI payload build failed", error); }
    }
    return null;
  }

  function getBookResult(){
    if (typeof global.__BOOK_210_GET_LAST_RESULT__ === "function") {
      try { return global.__BOOK_210_GET_LAST_RESULT__(); } catch(error) {}
    }
    return null;
  }

  function selectedBookReady(payload){
    const state = getState();
    return !!(payload && payload.selectedBook && (state.selectedBook || payload.selectedBook.title));
  }

  function compactObjectText(obj, fallback){
    if (!obj) return fallback || "-";
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) return obj.join(" / ") || (fallback || "-");
    if (typeof obj === "object") {
      return Object.entries(obj)
        .filter(([, value]) => value != null && String(value).trim() !== "")
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .slice(0, 6)
        .join(" / ") || (fallback || "-");
    }
    return String(obj);
  }

  function inferReportMode(payload){
    const axis = val(payload?.selectionPayload?.followupAxis).toLowerCase();
    const keyword = val(payload?.selectionPayload?.selectedRecommendedKeyword).toLowerCase();
    const hay = `${axis} ${keyword}`;
    if (/데이터|data|그래프|시각화|모델|예측|통계|수치|자료/.test(hay)) return "data";
    if (/비교|대조|차이|한계|쟁점/.test(hay)) return "compare";
    if (/실험|측정|센서|검증|관찰/.test(hay)) return "application";
    if (/전공|공학|의학|약학|간호|환경|컴퓨터|반도체/.test(hay)) return "major";
    return "principle";
  }

  function inferReportView(payload){
    const axis = val(payload?.selectionPayload?.followupAxis);
    const keyword = val(payload?.selectionPayload?.selectedRecommendedKeyword);
    const hay = `${axis} ${keyword}`;
    if (/데이터|시각화|그래프|예측|모델|통계|자료/.test(hay)) return "자료 해석";
    if (/측정|센서|진단|실험|검증|관찰/.test(hay)) return "측정·검증";
    if (/소재|반도체|물성|공정|소자/.test(hay)) return "설계·응용";
    if (/윤리|사회|정책|환경|기후|재난/.test(hay)) return "문제 해결";
    return "원리";
  }

  function inferReportLine(payload){
    const target = arr(payload?.reportGenerationContext?.targetStructure);
    if (target.length >= 13) return "mini-13-section";
    return "mini-standard";
  }

  function ensureProgressState(payload){
    const state = getState();
    if (!selectedBookReady(payload)) return false;
    let changed = false;
    if (!state.reportMode) { state.reportMode = inferReportMode(payload); changed = true; }
    if (!state.reportView) { state.reportView = inferReportView(payload); changed = true; }
    if (!state.reportLine) { state.reportLine = inferReportLine(payload); changed = true; }
    return changed;
  }

  function ensureStyle(){
    if (q("reportBridgeStyle")) return;
    const style = document.createElement("style");
    style.id = "reportBridgeStyle";
    style.textContent = `
      .report-bridge-grid { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:12px; margin-top:12px; }
      .report-bridge-grid.three { grid-template-columns: repeat(3,minmax(0,1fr)); }
      .report-bridge-card { border:1px solid #d8e0ee; border-radius:16px; background:#fff; padding:14px; }
      .report-bridge-card.strong { border-color:#b9cbf3; background:#f8fbff; }
      .report-bridge-title { font-size:15px; font-weight:900; color:#172033; margin-bottom:6px; }
      .report-bridge-desc { font-size:13px; line-height:1.65; color:#52617b; }
      .report-bridge-kv { display:grid; grid-template-columns: 120px 1fr; gap:7px 10px; font-size:13px; line-height:1.55; color:#465570; }
      .report-bridge-kv b { color:#172033; }
      .report-bridge-list { margin:8px 0 0; padding-left:18px; color:#47556e; font-size:13px; line-height:1.65; }
      .report-bridge-pillrow { display:flex; flex-wrap:wrap; gap:7px; margin-top:8px; }
      .report-bridge-pill { display:inline-flex; padding:6px 9px; border-radius:999px; background:#edf3ff; color:#2f5be8; font-size:12px; font-weight:800; }
      .report-bridge-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .report-bridge-btn { border:1px solid #b8c8ee; background:#fff; color:#275fe8; border-radius:999px; padding:9px 12px; font-size:13px; font-weight:900; cursor:pointer; }
      .report-bridge-btn.primary { background:#2f66ff; color:#fff; border-color:#2f66ff; }
      .report-bridge-pre { margin-top:10px; max-height:260px; overflow:auto; white-space:pre-wrap; background:#111827; color:#f8fafc; border-radius:14px; padding:12px; font-size:12px; line-height:1.55; }
      .report-bridge-check { display:flex; align-items:flex-start; gap:8px; padding:8px 0; font-size:13px; color:#47556e; }
      .report-bridge-check:before { content:'✓'; display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:999px; background:#eaf2ff; color:#2563eb; font-weight:900; flex:0 0 18px; }
      .report-bridge-muted { color:#6b7890; font-size:12px; line-height:1.55; margin-top:6px; }
      @media (max-width:1100px){ .report-bridge-grid, .report-bridge-grid.three { grid-template-columns:1fr; } .report-bridge-kv { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function setStepHead(blockId, title, copy, guide){
    const block = q(blockId);
    if (!block) return;
    const titleEl = block.querySelector(".engine-step-title");
    const copyEl = block.querySelector(".engine-step-copy");
    const guideEl = block.querySelector(".engine-step-guide");
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    if (guideEl) guideEl.textContent = guide;
  }

  function renderKey(payload){
    const state = getState();
    return [
      VERSION,
      payload?.createdAt ? "payload" : "no-payload",
      payload?.selectionPayload?.subject,
      payload?.selectionPayload?.department,
      payload?.selectionPayload?.selectedConcept,
      payload?.selectionPayload?.selectedRecommendedKeyword,
      payload?.selectionPayload?.followupAxis,
      payload?.selectedBook?.sourceId || payload?.selectedBook?.managementNo || payload?.selectedBook?.title,
      state.reportMode,
      state.reportView,
      state.reportLine
    ].map(v => val(v)).join("||");
  }

  function selectionSummaryHTML(payload){
    const s = payload?.selectionPayload || {};
    const b = payload?.selectedBook || {};
    return `
      <div class="report-bridge-kv">
        <b>과목</b><span>${esc(s.subject || "-")}</span>
        <b>학과</b><span>${esc(s.department || "-")}</span>
        <b>교과 개념</b><span>${esc(s.selectedConcept || "-")}</span>
        <b>추천 키워드</b><span>${esc(s.selectedRecommendedKeyword || "-")}</span>
        <b>후속 연계축</b><span>${esc(s.followupAxis || "-")}</span>
        <b>선택 도서</b><span>${esc(b.title || "-")}</span>
      </div>
    `;
  }

  function sectionCardsHTML(payload){
    const ctx = payload?.reportGenerationContext || {};
    const target = arr(ctx.targetStructure);
    const purposes = ctx.sectionPurpose || {};
    const templates = ctx.sectionTemplates || {};
    if (!target.length) return `<div class="engine-empty">보고서 구조 데이터가 아직 없습니다.</div>`;
    return `<div class="report-bridge-grid">${target.map((name, idx) => {
      const purpose = purposes[name] || templates[name]?.prompt || "선택 흐름에 맞춰 작성 방향을 보강합니다.";
      return `<div class="report-bridge-card">
        <div class="report-bridge-title">${idx + 1}. ${esc(name)}</div>
        <div class="report-bridge-desc">${esc(purpose)}</div>
      </div>`;
    }).join("")}</div>`;
  }

  function axisRuleHTML(payload){
    const ctx = payload?.reportGenerationContext || {};
    const axisRule = ctx.axisDevelopmentRule;
    const keywordFrame = ctx.keywordReportFrame;
    const bookUse = ctx.selectedBookUse || {};
    const use = bookUse.useInReport || {};
    const roleLabels = arr(bookUse.reportRoleLabels);
    const useItems = Object.entries(use).filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`);
    return `
      <div class="report-bridge-grid three">
        <div class="report-bridge-card strong">
          <div class="report-bridge-title">축 기반 전개 규칙</div>
          <div class="report-bridge-desc">${esc(compactObjectText(axisRule, "선택 후속축에 맞춘 전개 규칙을 적용합니다."))}</div>
        </div>
        <div class="report-bridge-card strong">
          <div class="report-bridge-title">키워드 보고서 프레임</div>
          <div class="report-bridge-desc">${esc(compactObjectText(keywordFrame, "선택 키워드 중심으로 보고서 질문을 좁힙니다."))}</div>
        </div>
        <div class="report-bridge-card strong">
          <div class="report-bridge-title">선택 도서 활용 위치</div>
          <div class="report-bridge-desc">${esc(roleLabels.join(" / ") || bookUse.recommendationReason || "보고서 근거·비교·확장에 배치합니다.")}</div>
          ${useItems.length ? `<ul class="report-bridge-list">${useItems.slice(0,5).map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}
        </div>
      </div>
    `;
  }

  function renderStep6(payload){
    const el = q("engineModeButtons");
    if (!el) return;
    if (!selectedBookReady(payload)) {
      el.innerHTML = `<div class="engine-empty">먼저 5번에서 도서를 선택하면 6번 보고서 구조 설계가 열립니다.</div>`;
      return;
    }
    const key = renderKey(payload) + "::step6";
    if (el.getAttribute("data-report-bridge-key") === key) return;
    el.setAttribute("data-report-bridge-key", key);
    el.innerHTML = `
      <div class="report-bridge-card strong">
        <div class="report-bridge-title">선택 흐름 요약</div>
        ${selectionSummaryHTML(payload)}
        <div class="report-bridge-muted">6번은 보고서 형식을 새로 만드는 단계가 아니라, 3번 교과 개념·키워드와 4번 후속 연계축, 5번 선택 도서를 상속해 목차를 고정하는 단계입니다.</div>
      </div>
      <div style="margin-top:14px;" class="engine-subtitle">보고서 목표 구조</div>
      ${sectionCardsHTML(payload)}
      ${axisRuleHTML(payload)}
    `;
  }

  function buildMiniPrompt(payload){
    const s = payload?.selectionPayload || {};
    const ctx = payload?.reportGenerationContext || {};
    const book = payload?.selectedBook || {};
    return [
      "아래 payload를 기준으로 고등학생 수행평가용 MINI 보고서 초안을 작성해줘.",
      "",
      `과목: ${s.subject || "-"}`,
      `학과: ${s.department || "-"}`,
      `교과 개념: ${s.selectedConcept || "-"}`,
      `추천 키워드: ${s.selectedRecommendedKeyword || "-"}`,
      `후속 연계축: ${s.followupAxis || "-"}`,
      `선택 도서: ${book.title || "-"}`,
      "",
      "작성 구조:",
      arr(ctx.targetStructure).map((name, idx) => `${idx + 1}. ${name}`).join("\n"),
      "",
      "작성 원칙:",
      arr(ctx.writingRules).map(rule => `- ${rule}`).join("\n")
    ].join("\n");
  }

  function payloadStatusHTML(payload){
    const s = payload?.selectionPayload || {};
    const checks = [
      ["선택 과목", s.subject],
      ["선택 학과", s.department],
      ["선택 교과 개념", s.selectedConcept],
      ["선택 추천 키워드", s.selectedRecommendedKeyword],
      ["선택 후속 연계축", s.followupAxis],
      ["선택 도서", payload?.selectedBook?.title],
      ["targetStructure 13개 항목", arr(payload?.reportGenerationContext?.targetStructure).length >= 13],
      ["selectedBookUse", payload?.reportGenerationContext?.selectedBookUse]
    ];
    return `<div class="report-bridge-grid">${checks.map(([label, ok]) => `
      <div class="report-bridge-check">${esc(label)}: ${ok ? "준비됨" : "대기"}</div>
    `).join("")}</div>`;
  }

  function renderStep7(payload){
    const el = q("engineViewButtons");
    if (!el) return;
    if (!selectedBookReady(payload)) {
      el.innerHTML = `<div class="engine-empty">먼저 5번 도서를 선택하고 6번 구조를 확인하면 MINI payload를 생성할 수 있습니다.</div>`;
      return;
    }
    const json = JSON.stringify(payload, null, 2);
    const prompt = buildMiniPrompt(payload);
    const key = renderKey(payload) + "::step7";
    if (el.getAttribute("data-report-bridge-key") === key) return;
    el.setAttribute("data-report-bridge-key", key);
    el.innerHTML = `
      <div class="report-bridge-card strong">
        <div class="report-bridge-title">MINI payload 생성 상태</div>
        <div class="report-bridge-desc">이 단계는 학생 화면용 설명이 아니라, MINI가 보고서 초안을 만들 때 사용할 구조 데이터를 확인·복사하는 단계입니다.</div>
        ${payloadStatusHTML(payload)}
        <div class="report-bridge-actions">
          <button type="button" class="report-bridge-btn primary" data-report-copy="payload">payload JSON 복사</button>
          <button type="button" class="report-bridge-btn" data-report-copy="prompt">MINI 요청문 복사</button>
          <button type="button" class="report-bridge-btn" data-report-refresh="1">payload 새로고침</button>
        </div>
        <details style="margin-top:12px;">
          <summary class="report-bridge-title" style="cursor:pointer; margin-bottom:0;">운영자용 payload 미리보기</summary>
          <pre class="report-bridge-pre" data-report-payload-json>${esc(json)}</pre>
        </details>
        <pre class="report-bridge-pre" data-report-prompt style="display:none;">${esc(prompt)}</pre>
      </div>
    `;
    const hidden = q("miniNavigationPayload");
    if (hidden) hidden.value = json;
  }

  function finalReportOutlineHTML(payload){
    const s = payload?.selectionPayload || {};
    const ctx = payload?.reportGenerationContext || {};
    const book = payload?.selectedBook || {};
    const axis = s.followupAxis || "후속 연계축";
    const keyword = s.selectedRecommendedKeyword || "선택 키워드";
    const concept = s.selectedConcept || "교과 개념";
    const major = s.department || "희망 학과";
    const title = `${keyword}를 ${axis} 관점에서 해석한 ${major} 연계 탐구`;
    const sections = arr(ctx.targetStructure);
    return `
      <div class="report-bridge-card strong">
        <div class="report-bridge-title">최종 보고서 제목 예시</div>
        <div class="report-bridge-desc" style="font-size:15px; color:#172033; font-weight:800;">${esc(title)}</div>
      </div>
      <div class="report-bridge-grid">
        <div class="report-bridge-card">
          <div class="report-bridge-title">보고서 본문</div>
          <ul class="report-bridge-list">
            ${sections.slice(0, 8).map((name, idx) => `<li>${idx + 1}. ${esc(name)}: ${esc(concept)} → ${esc(keyword)} → ${esc(axis)} 흐름으로 작성</li>`).join("")}
          </ul>
        </div>
        <div class="report-bridge-card">
          <div class="report-bridge-title">세특 문구 예시</div>
          <div class="report-bridge-desc">${esc(concept)}을 바탕으로 ${esc(keyword)}를 분석하고, ${esc(axis)} 관점에서 자료 해석과 전공 연계를 수행함. 선택 도서 『${esc(book.title || "선택 도서")}』를 단순 독후감이 아닌 보고서 근거와 확장 관점으로 활용함.</div>
        </div>
        <div class="report-bridge-card">
          <div class="report-bridge-title">심화 탐구 발전 방안</div>
          <ul class="report-bridge-list">
            <li>선택 키워드와 후속 연계축을 기준으로 추가 변수 또는 비교 대상을 설정한다.</li>
            <li>관련 교과의 그래프·자료·실험 결과 중 하나를 근거로 연결한다.</li>
            <li>${esc(major)}에서 실제로 다루는 문제 상황으로 결론을 확장한다.</li>
          </ul>
        </div>
        <div class="report-bridge-card">
          <div class="report-bridge-title">참고문헌 및 자료</div>
          <ul class="report-bridge-list">
            <li>선택 도서: ${esc(book.title || "-")} ${book.author ? ` / ${esc(book.author)}` : ""}</li>
            <li>교과 자료: ${esc(s.subject || "선택 과목")} 교과 개념 ${esc(concept)}</li>
            <li>추가 자료: 관련 기관 자료, 통계/그래프 자료, 전공 소개 자료를 보조 근거로 활용</li>
          </ul>
        </div>
      </div>
    `;
  }

  function renderStep8(payload){
    const el = q("engineLineArea");
    if (!el) return;
    if (!selectedBookReady(payload)) {
      el.innerHTML = `<div class="engine-empty">MINI payload가 준비되면 최종 출력 흐름을 확인할 수 있습니다.</div>`;
      return;
    }
    const key = renderKey(payload) + "::step8";
    if (el.getAttribute("data-report-bridge-key") === key) return;
    el.setAttribute("data-report-bridge-key", key);
    el.innerHTML = `
      <div class="report-bridge-card strong">
        <div class="report-bridge-title">최종 출력 흐름</div>
        <div class="report-bridge-desc">8번은 실제 보고서 생성 화면으로 넘기기 전, 최종 산출물이 어떤 묶음으로 출력될지 보여주는 단계입니다.</div>
        <div class="report-bridge-pillrow">
          <span class="report-bridge-pill">보고서 본문</span>
          <span class="report-bridge-pill">세특 문구 예시</span>
          <span class="report-bridge-pill">심화 탐구 발전 방안</span>
          <span class="report-bridge-pill">참고문헌 및 자료</span>
          <span class="report-bridge-pill">MINI payload 확인/복사</span>
        </div>
      </div>
      ${finalReportOutlineHTML(payload)}
    `;
  }

  async function copyText(text){
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch(error) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch(e) {}
      ta.remove();
      return true;
    }
  }

  function installCopyHandlers(){
    if (global.__REPORT_6_8_COPY_HANDLER__) return;
    global.__REPORT_6_8_COPY_HANDLER__ = true;
    document.addEventListener("click", async function(event){
      const copyBtn = event.target && event.target.closest ? event.target.closest("[data-report-copy]") : null;
      const refreshBtn = event.target && event.target.closest ? event.target.closest("[data-report-refresh]") : null;
      if (copyBtn) {
        event.preventDefault();
        const payload = getPayload();
        const type = copyBtn.getAttribute("data-report-copy");
        const text = type === "prompt" ? buildMiniPrompt(payload) : JSON.stringify(payload, null, 2);
        await copyText(text);
        const old = copyBtn.textContent;
        copyBtn.textContent = "복사 완료";
        setTimeout(()=>{ copyBtn.textContent = old; }, 1200);
      }
      if (refreshBtn) {
        event.preventDefault();
        apply(true);
      }
    }, true);
  }

  let applying = false;
  function apply(force){
    if (applying) return;
    const flow = q("engineFlowSection");
    if (!flow) return;
    const payload = getPayload();
    ensureStyle();
    installCopyHandlers();

    setStepHead(
      "engineModeBlock",
      "6. 보고서 구조 설계",
      "선택한 교과 개념·키워드·후속 연계축·도서를 상속해 보고서 목차와 섹션별 작성 방향을 설계합니다.",
      "targetStructure / sectionPurpose"
    );
    setStepHead(
      "engineViewBlock",
      "7. MINI 보고서 초안 payload 생성",
      "MINI가 보고서 초안을 만들 수 있도록 선택 흐름과 보고서 생성 규칙을 payload로 묶습니다.",
      "payload 생성 / 복사"
    );
    setStepHead(
      "engineLineBlock",
      "8. 최종 보고서 출력 흐름",
      "보고서 본문, 세특 문구, 심화 탐구 발전, 참고문헌 출력 묶음을 확인합니다.",
      "최종 출력"
    );

    if (payload) ensureProgressState(payload);

    const readyForReport = selectedBookReady(payload);
    ["engineModeBlock", "engineViewBlock", "engineLineBlock"].forEach(function(id){
      const block = q(id);
      if (block) block.classList.toggle("locked", !readyForReport);
    });

    applying = true;
    try {
      renderStep6(payload);
      renderStep7(payload);
      renderStep8(payload);
      const hidden = q("miniNavigationPayload");
      if (hidden && payload) hidden.value = JSON.stringify(payload);
      global.__REPORT_6_8_LAST_PAYLOAD__ = payload || null;
      global.__REPORT_6_8_LAST_BOOK_RESULT__ = getBookResult();
      if (force && typeof global.__TEXTBOOK_HELPER_RENDER__ === "function") {
        setTimeout(()=>{ try { global.__TEXTBOOK_HELPER_RENDER__(); } catch(e){} }, 0);
      }
    } finally {
      setTimeout(()=>{ applying = false; }, 20);
    }
  }

  function boot(){
    apply(false);
    [300, 800, 1500].forEach(delay => setTimeout(()=>apply(false), delay));
    try {
      const observer = new MutationObserver(function(){
        clearTimeout(global.__REPORT_6_8_APPLY_TIMER__);
        global.__REPORT_6_8_APPLY_TIMER__ = setTimeout(()=>apply(false), 120);
      });
      observer.observe(document.body, { childList:true, subtree:true });
      global.__REPORT_6_8_OBSERVER__ = observer;
    } catch(error) {}
  }

  global.__REPORT_6_8_APPLY__ = apply;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
