/* report_6_8_flow_bridge.js
 * v27: 학생용 6~8번 선택 UI 복구 + 운영자용 MINI payload 패널 분리
 * - 6번은 보고서 전개 방식 선택
 * - 7번은 보고서 관점 선택
 * - 8번은 보고서 라인 선택
 * - 내부 payload/targetStructure는 접힌 운영자용 영역으로만 제공
 */
(function(global){
  "use strict";

  const VERSION = "report-6-8-flow-bridge-v27-student-choice";
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

  const LINE_HELP = {
    basic: {
      id: "basic",
      title: "기본형",
      desc: "개념을 먼저 정리하고 사례와 느낀점으로 마무리하는 짧은 보고서 구조입니다.",
      fit: "처음 쓰는 학생 / 교과 개념 설명 중심",
      sections: ["추천 주제", "탐구 동기", "핵심 개념 정리", "교과 연계", "느낀점", "세특 문구"]
    },
    standard: {
      id: "standard",
      title: "확장형",
      desc: "교과 개념에 사례·도서·자료 중 하나를 붙여 수행평가 제출용으로 확장하는 구조입니다.",
      fit: "일반 수행평가 / 사례·자료·도서 확장",
      sections: ["중요성", "주제", "키워드", "탐구 동기", "개념 설명", "문제 해결", "적용 과정", "교과 연계", "심화 방안", "참고자료"]
    },
    advanced: {
      id: "advanced",
      title: "심화형",
      desc: "현재 과목, 후속 과목, 도서, 전공 연결까지 모두 반영하는 심화 보고서 구조입니다.",
      fit: "세특·심화탐구 / 후속 과목·진로 연결",
      sections: ["중요성", "추천 주제", "관련 키워드", "탐구 동기", "느낀점", "세특 문구", "개념의 생기부 연결", "원리 설명", "문제 해결 의미", "실제 적용", "교과목 연계", "심화 탐구", "참고문헌"]
    }
  };

  const VIEW_HELP = {
    "원리": { title:"원리 관점", desc:"왜 그런 현상이 일어나는지, 어떤 교과 개념이 작동하는지 중심으로 풀이합니다.", example:"핵심 개념 → 원리 → 선택 키워드 적용 순서로 정리" },
    "자료 해석": { title:"자료 해석 관점", desc:"수치, 그래프, 관측 자료를 해석해서 의미를 찾는 방식입니다.", example:"변수 설정 → 자료 해석 → 그래프 의미 → 한계" },
    "데이터": { title:"데이터 관점", desc:"자료 수집 방식과 해석 기준을 중심으로 결론을 만드는 방식입니다.", example:"데이터 출처와 변수, 비교 기준을 먼저 세우기" },
    "모델링": { title:"모델링 관점", desc:"복잡한 현상을 변수와 관계로 단순화해 설명합니다.", example:"현상 → 변수 → 관계 → 예측 또는 해석" },
    "한계": { title:"한계 관점", desc:"해결 방안이나 자료 해석의 조건, 오차, 적용 범위를 비판적으로 봅니다.", example:"가능성뿐 아니라 적용 조건과 한계를 함께 제시" },
    "비교": { title:"비교 관점", desc:"두 사례나 두 조건을 나란히 놓고 차이점과 공통점을 정리합니다.", example:"비교 기준 2~3개를 먼저 세운 뒤 차이 해석" },
    "사회적 의미": { title:"사회적 의미 관점", desc:"과학·기술 개념이 실제 사회 문제, 정책, 윤리와 연결되는 지점을 봅니다.", example:"기술 원리 → 사회 문제 → 대응 방향" },
    "진로 확장": { title:"진로 확장 관점", desc:"선택 학과와 직무에서 이 개념이 어떻게 쓰이는지 연결합니다.", example:"교과 개념 → 전공 문제 상황 → 후속 탐구" },
    "구조": { title:"구조 관점", desc:"대상이 어떤 요소로 이루어지고 각 요소가 어떻게 연결되는지 봅니다.", example:"구성 요소와 역할을 나누어 설명" },
    "기능": { title:"기능 관점", desc:"대상이 실제로 어떤 역할을 수행하는지 중심으로 정리합니다.", example:"작동 과정과 기능을 단계별로 설명" },
    "안정성": { title:"안정성 관점", desc:"시스템이나 구조가 안정적으로 유지되는 조건을 분석합니다.", example:"위험 요인과 안정 조건을 함께 제시" },
    "효율": { title:"효율 관점", desc:"같은 결과를 더 적은 자원·시간·에너지로 얻는 방식을 비교합니다.", example:"효율 기준을 세우고 대안을 비교" },
    "변화": { title:"변화 관점", desc:"시간이나 조건 변화에 따른 값과 상태의 변화를 해석합니다.", example:"전후 변화 또는 조건별 변화를 그래프로 해석" }
  };

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

  function hasSelectedBook(payload){
    const state = getState();
    return !!(payload && payload.selectedBook && (state.selectedBook || payload.selectedBook.title));
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

  function ensureStyle(){
    if (q("reportChoiceBridgeStyle")) return;
    const style = document.createElement("style");
    style.id = "reportChoiceBridgeStyle";
    style.textContent = `
      .report-choice-note { margin-top:10px; padding:12px 14px; border:1px solid #d9e4fb; border-radius:14px; background:#f8fbff; color:#47556e; font-size:13px; line-height:1.65; }
      .report-choice-preview { margin-top:12px; padding:14px; border:1px solid #d8e0ee; border-radius:16px; background:#fff; }
      .report-choice-preview-title { font-weight:900; color:#172033; margin-bottom:7px; font-size:15px; }
      .report-choice-preview-desc { color:#52617b; font-size:13px; line-height:1.65; }
      .report-choice-pillrow { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
      .report-choice-pill { display:inline-flex; align-items:center; border-radius:999px; padding:6px 9px; background:#edf3ff; color:#275fe8; font-size:12px; font-weight:900; }
      .report-choice-operator { margin-top:12px; border:1px dashed #b9c7e7; border-radius:14px; background:#fbfdff; padding:10px 12px; }
      .report-choice-operator > summary { cursor:pointer; font-weight:900; color:#334155; }
      .report-choice-operator-grid { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:10px; margin-top:10px; }
      .report-choice-operator-card { border:1px solid #e0e7f3; border-radius:12px; background:#fff; padding:10px; font-size:12px; color:#475569; line-height:1.55; }
      .report-choice-operator-title { font-weight:900; color:#111827; margin-bottom:5px; }
      .report-choice-pre { max-height:220px; overflow:auto; white-space:pre-wrap; background:#111827; color:#f8fafc; border-radius:12px; padding:10px; font-size:12px; line-height:1.55; margin-top:10px; }
      .report-choice-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .report-choice-btn { border:1px solid #b8c8ee; background:#fff; color:#275fe8; border-radius:999px; padding:8px 12px; font-size:12px; font-weight:900; cursor:pointer; }
      .report-choice-btn.primary { background:#2f66ff; color:#fff; border-color:#2f66ff; }
      @media (max-width:1100px){ .report-choice-operator-grid { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function buildContext(){
    const state = getState();
    const payload = getPayload();
    const s = payload?.selectionPayload || {};
    return {
      state,
      payload,
      subject: s.subject || state.subject || "",
      major: s.department || state.career || state.majorSelectedName || "",
      concept: s.selectedConcept || state.concept || "",
      keyword: s.selectedKeyword || s.selectedRecommendedKeyword || state.keyword || "",
      axis: s.selectedFollowupAxis || s.followupAxis || state.linkTrack || "",
      selectedBook: payload?.selectedBook || null,
      ctx: payload?.reportGenerationContext || {}
    };
  }

  function getMeta(ctx){
    const state = getState();
    if (typeof global.getReportOptionMeta === "function") {
      try {
        return global.getReportOptionMeta({
          subject: ctx.subject,
          career: ctx.major,
          selectedMajor: ctx.major,
          linkTrack: state.linkTrack || ctx.axis,
          followupAxisId: state.linkTrack || ctx.axis,
          concept: ctx.concept,
          keyword: ctx.keyword,
          selectedBook: state.selectedBook || ctx.selectedBook?.sourceId || ctx.selectedBook?.title || ""
        }) || {};
      } catch(error) {}
    }
    return {};
  }

  function modeOptions(ctx){
    const meta = getMeta(ctx);
    const base = arr(meta.modeOptions);
    const fallback = [
      { id: "principle", label: "원리 파악형", desc: "핵심 개념이 왜 성립하는지 설명합니다." },
      { id: "compare", label: "비교 분석형", desc: "두 사례나 조건의 차이를 비교합니다." },
      { id: "data", label: "데이터 확장형", desc: "자료·수치·그래프를 해석하며 확장합니다." },
      { id: "application", label: "사례 적용형", desc: "실생활·산업 사례에 적용합니다." },
      { id: "major", label: "전공 확장형", desc: "희망 진로와 직접 연결해 정리합니다." },
      { id: "book", label: "도서 근거형", desc: "선택 도서를 보고서 근거와 비교 관점으로 활용합니다." }
    ];
    const merged = [];
    const seen = new Set();
    base.concat(fallback).forEach(item => {
      if (!item || !item.id || seen.has(item.id)) return;
      seen.add(item.id);
      merged.push(item);
    });
    const priority = arr(ctx.ctx?.examplePattern?.modePriority);
    if (priority.length) {
      merged.sort((a,b) => {
        const ai = priority.includes(a.id) ? priority.indexOf(a.id) : 99;
        const bi = priority.includes(b.id) ? priority.indexOf(b.id) : 99;
        return ai - bi;
      });
    }
    return merged;
  }

  function recommendedModeId(ctx, options){
    const patternPriority = arr(ctx.ctx?.examplePattern?.modePriority);
    if (patternPriority.length) return patternPriority.find(id => options.some(o => o.id === id)) || options[0]?.id || "";
    const text = [ctx.axis, ctx.keyword, ctx.concept].join(" ");
    if (/데이터|data|그래프|모델|예측|통계|자료|시각화/.test(text)) return "data";
    if (/비교|차이|쟁점|한계|정책|윤리/.test(text)) return "compare";
    if (/사례|적용|해결|실험|측정|센서/.test(text)) return "application";
    if (/전공|공학|의학|약학|간호|컴퓨터/.test(text)) return "major";
    return "principle";
  }

  function renderModeArea(ctx){
    const el = q("engineModeButtons");
    if (!el) return;
    if (!hasSelectedBook(ctx.payload)) {
      el.innerHTML = `<div class="engine-empty">먼저 5번에서 도서를 선택해야 보고서 전개 방식을 고를 수 있습니다.</div>`;
      return;
    }
    const options = modeOptions(ctx);
    const recommended = recommendedModeId(ctx, options);
    const active = ctx.state.reportMode || "";
    const key = `${VERSION}:mode:${active}:${recommended}:${ctx.keyword}:${ctx.axis}:${ctx.selectedBook?.title || ""}:${options.map(o=>o.id).join(",")}`;
    if (el.getAttribute("data-report-choice-key") === key) return;
    el.setAttribute("data-report-choice-key", key);
    el.innerHTML = `
      <div class="engine-mode-grid">${options.map(option => `
        <button type="button" class="engine-mode-card ${active === option.id ? "is-active" : ""}" data-action="mode" data-value="${esc(option.id)}">
          <div class="engine-mode-title">${esc(option.label)} ${option.id === recommended ? '<span class="engine-mini-tag" style="margin-left:6px;">추천</span>' : ''}</div>
          <div class="engine-mode-desc">${esc(option.desc || "")}</div>
        </button>
      `).join("")}</div>
      <div class="report-choice-note">여기서 선택한 전개 방식은 MINI payload의 <b>reportMode</b>와 <b>targetStructure</b>를 바꿉니다. 같은 주제라도 원리형·데이터형·비교형을 다르게 고르면 보고서 문단 흐름이 달라집니다.</div>
    `;
  }

  function viewOptionsFor(ctx){
    const meta = getMeta(ctx);
    const base = arr(meta.viewOptions);
    const mode = ctx.state.reportMode || ctx.ctx?.reportChoices?.mode || "";
    const byMode = {
      principle: ["원리","구조","기능","한계"],
      data: ["자료 해석","데이터","모델링","한계"],
      compare: ["비교","한계","사회적 의미","원리"],
      application: ["사회적 의미","기능","효율","안정성"],
      major: ["진로 확장","기능","구조","한계"],
      book: ["한계","사회적 의미","원리","비교"]
    };
    const merged = [];
    const seen = new Set();
    (byMode[mode] || []).concat(base, ["원리","자료 해석","모델링","한계","비교","사회적 의미","진로 확장"]).forEach(item => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      merged.push(item);
    });
    return merged;
  }

  function renderViewArea(ctx){
    const el = q("engineViewButtons");
    if (!el) return;
    if (!hasSelectedBook(ctx.payload)) {
      el.innerHTML = `<div class="engine-empty">먼저 5번 도서를 선택해 주세요.</div>`;
      return;
    }
    if (!ctx.state.reportMode) {
      el.innerHTML = `<div class="engine-empty">먼저 6번에서 보고서 전개 방식을 선택하면 관점 선택이 열립니다.</div>`;
      return;
    }
    const options = viewOptionsFor(ctx);
    const active = ctx.state.reportView || "";
    const current = VIEW_HELP[active] || VIEW_HELP[options[0]] || { title:"관점 선택", desc:"보고서를 어떤 시선으로 정리할지 고릅니다.", example:"선택한 관점에 따라 세부 문장과 강조점이 바뀝니다." };
    const key = `${VERSION}:view:${ctx.state.reportMode}:${active}:${options.join(",")}`;
    if (el.getAttribute("data-report-choice-key") === key) return;
    el.setAttribute("data-report-choice-key", key);
    el.innerHTML = `
      <div class="engine-chip-wrap">${options.map(view => `
        <button type="button" class="engine-chip ${active === view ? "is-active" : ""}" data-action="view" data-value="${esc(view)}">${esc(view)}</button>
      `).join("")}</div>
      <div class="engine-view-guide">
        <div class="engine-view-guide-title">${esc(current.title)}</div>
        <div class="engine-view-guide-desc">${esc(current.desc)}</div>
        <div class="engine-view-guide-example">${esc(current.example)}</div>
      </div>
    `;
  }

  function recommendedLine(ctx){
    const mode = ctx.state.reportMode || "";
    const pattern = ctx.ctx?.examplePattern?.id || "";
    if (mode === "major" || pattern === "bio_mechanism" || pattern === "physics_energy_system") return "advanced";
    if (["data","compare","application","book"].includes(mode)) return "standard";
    return "basic";
  }

  function renderLineArea(ctx){
    const el = q("engineLineArea");
    if (!el) return;
    if (!hasSelectedBook(ctx.payload)) {
      el.innerHTML = `<div class="engine-empty">먼저 5번 도서를 선택해 주세요.</div>`;
      return;
    }
    if (!ctx.state.reportMode || !ctx.state.reportView) {
      el.innerHTML = `<div class="engine-empty">먼저 6번 전개 방식과 7번 관점을 선택하면 보고서 라인을 고를 수 있습니다.</div>`;
      return;
    }
    const entries = Object.values(LINE_HELP);
    const rec = recommendedLine(ctx);
    const active = ctx.state.reportLine || "";
    const current = LINE_HELP[active] || LINE_HELP[rec] || LINE_HELP.standard;
    const payloadSections = arr(ctx.ctx?.targetStructure);
    const previewSections = payloadSections.length ? payloadSections : current.sections;
    const key = `${VERSION}:line:${ctx.state.reportMode}:${ctx.state.reportView}:${active}:${rec}:${previewSections.join(">")}`;
    if (el.getAttribute("data-report-choice-key") === key) return;
    el.setAttribute("data-report-choice-key", key);
    el.innerHTML = `
      <div class="engine-mode-grid">${entries.map(item => `
        <button type="button" class="engine-mode-card ${active === item.id ? "is-active" : ""}" data-action="line" data-value="${esc(item.id)}">
          <div class="engine-mode-title">${esc(item.title)} ${item.id === rec ? '<span class="engine-mini-tag" style="margin-left:6px;">추천</span>' : ''}</div>
          <div class="engine-mode-desc">${esc(item.desc)}</div>
          <div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:700;">${esc(item.fit)}</div>
        </button>
      `).join("")}</div>
      <div class="engine-view-guide">
        <div class="engine-view-guide-title">${esc(current.title)} 보고서 라인</div>
        <div class="engine-view-guide-desc">${esc(current.desc)}</div>
        <div class="engine-view-guide-example">문단 흐름: ${current.sections.map((section, idx) => `${idx + 1}. ${section}`).join(" → ")}</div>
      </div>
      <div class="report-choice-preview">
        <div class="report-choice-preview-title">선택 결과 미리보기</div>
        <div class="report-choice-preview-desc">
          현재 선택: ${esc(ctx.state.reportMode || "-")} / ${esc(ctx.state.reportView || "-")} / ${esc(active || "라인 선택 대기")}<br>
          MINI에 전달될 구조: ${esc(previewSections.slice(0, 8).join(" → "))}${previewSections.length > 8 ? " ..." : ""}
        </div>
        <div class="report-choice-pillrow">
          <span class="report-choice-pill">${esc(ctx.ctx?.examplePattern?.label || "예시 패턴 대기")}</span>
          <span class="report-choice-pill">섹션 ${previewSections.length}개</span>
          <span class="report-choice-pill">${esc(ctx.ctx?.reportChoices?.modeLabel || "전개 방식 반영")}</span>
        </div>
      </div>
    `;
  }

  function operatorSummaryHTML(ctx){
    const p = ctx.payload || {};
    const gen = p.reportGenerationContext || {};
    const choices = gen.reportChoices || {};
    const sections = arr(gen.targetStructure);
    const bookUse = gen.selectedBookUse || {};
    return `
      <details class="report-choice-operator">
        <summary>운영/분석용 참고 보기 — 학생 화면에는 이 내용을 안내하지 않습니다</summary>
        <div class="report-choice-operator-grid">
          <div class="report-choice-operator-card">
            <div class="report-choice-operator-title">선택 흐름</div>
            과목: ${esc(ctx.subject || "-")}<br>
            학과: ${esc(ctx.major || "-")}<br>
            개념: ${esc(ctx.concept || "-")}<br>
            키워드: ${esc(ctx.keyword || "-")}<br>
            후속축: ${esc(ctx.axis || "-")}<br>
            도서: ${esc(ctx.selectedBook?.title || "-")}
          </div>
          <div class="report-choice-operator-card">
            <div class="report-choice-operator-title">6~8번 선택값</div>
            전개 방식: ${esc(choices.modeLabel || ctx.state.reportMode || "-")}<br>
            관점: ${esc(choices.viewLabel || ctx.state.reportView || "-")}<br>
            라인: ${esc(choices.lineLabel || ctx.state.reportLine || "-")}<br>
            예시 패턴: ${esc(gen.examplePattern?.label || "-")}<br>
            섹션 수: ${sections.length}
          </div>
          <div class="report-choice-operator-card">
            <div class="report-choice-operator-title">도서 활용 위치</div>
            ${esc(arr(bookUse.reportRoleLabels).join(" / ") || bookUse.recommendationReason || "-")}
          </div>
          <div class="report-choice-operator-card">
            <div class="report-choice-operator-title">targetStructure</div>
            ${esc(sections.join(" → ") || "-")}
          </div>
        </div>
        <div class="report-choice-actions">
          <button type="button" class="report-choice-btn primary" data-report-copy="payload">payload JSON 복사</button>
          <button type="button" class="report-choice-btn" data-report-copy="prompt">MINI 요청문 복사</button>
        </div>
        <details>
          <summary style="cursor:pointer; margin-top:10px; font-weight:800;">payload 원문 보기</summary>
          <pre class="report-choice-pre">${esc(JSON.stringify(p, null, 2))}</pre>
        </details>
      </details>
    `;
  }

  function buildMiniPrompt(ctx){
    const p = ctx.payload || {};
    const s = p.selectionPayload || {};
    const gen = p.reportGenerationContext || {};
    const choices = gen.reportChoices || {};
    return [
      "아래 payload를 기준으로 고등학생 수행평가용 MINI 보고서 초안을 작성해줘.",
      "",
      `과목: ${s.subject || "-"}`,
      `학과: ${s.department || "-"}`,
      `교과 개념: ${s.selectedConcept || "-"}`,
      `추천 키워드: ${s.selectedKeyword || s.selectedRecommendedKeyword || "-"}`,
      `후속 연계축: ${s.selectedFollowupAxis || s.followupAxis || "-"}`,
      `선택 도서: ${p.selectedBook?.title || "-"}`,
      `보고서 전개 방식: ${choices.modeLabel || s.reportMode || "-"}`,
      `보고서 관점: ${choices.viewLabel || s.reportView || "-"}`,
      `보고서 라인: ${choices.lineLabel || s.reportLine || "-"}`,
      "",
      "작성 구조:",
      arr(gen.targetStructure).map((name, idx) => `${idx + 1}. ${name}`).join("\n"),
      "",
      "작성 원칙:",
      arr(gen.writingRules).map(rule => `- ${rule}`).join("\n")
    ].join("\n");
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
    if (global.__REPORT_6_8_COPY_HANDLER_V27__) return;
    global.__REPORT_6_8_COPY_HANDLER_V27__ = true;
    document.addEventListener("click", async function(event){
      const btn = event.target && event.target.closest ? event.target.closest("[data-report-copy]") : null;
      if (!btn) return;
      event.preventDefault();
      const ctx = buildContext();
      const type = btn.getAttribute("data-report-copy");
      const text = type === "prompt" ? buildMiniPrompt(ctx) : JSON.stringify(ctx.payload, null, 2);
      await copyText(text);
      const old = btn.textContent;
      btn.textContent = "복사 완료";
      setTimeout(()=>{ btn.textContent = old; }, 1200);
    }, true);
  }

  function renderOperatorPanel(ctx){
    const payloadEl = q("engineMiniPayload");
    if (!payloadEl) return;
    if (!hasSelectedBook(ctx.payload)) {
      payloadEl.innerHTML = `<strong>MINI 전달 구조</strong><br>5번 도서 선택 후 운영/분석용 payload가 준비됩니다.`;
      return;
    }
    const key = `${VERSION}:operator:${ctx.state.reportMode}:${ctx.state.reportView}:${ctx.state.reportLine}:${ctx.keyword}:${ctx.axis}:${ctx.selectedBook?.title || ""}:${arr(ctx.ctx?.targetStructure).join(">")}`;
    if (payloadEl.getAttribute("data-report-choice-key") === key) return;
    payloadEl.setAttribute("data-report-choice-key", key);
    payloadEl.innerHTML = operatorSummaryHTML(ctx);
    const hidden = q("miniNavigationPayload");
    if (hidden && ctx.payload) hidden.value = JSON.stringify(ctx.payload);
  }

  function applyLocks(ctx){
    const readyBook = hasSelectedBook(ctx.payload);
    const blocks = [
      ["engineModeBlock", readyBook],
      ["engineViewBlock", readyBook && !!ctx.state.reportMode],
      ["engineLineBlock", readyBook && !!ctx.state.reportMode && !!ctx.state.reportView]
    ];
    blocks.forEach(([id, open]) => {
      const block = q(id);
      if (block) block.classList.toggle("locked", !open);
    });
  }

  let applying = false;
  function apply(){
    if (applying) return;
    if (!q("engineFlowSection")) return;
    applying = true;
    try {
      ensureStyle();
      installCopyHandlers();
      const ctx = buildContext();

      setStepHead(
        "engineModeBlock",
        "6. 보고서 전개 방식 선택",
        "같은 개념과 도서라도 어떻게 풀어 쓸지에 따라 보고서 방향이 달라집니다.",
        "원리 / 비교 / 데이터"
      );
      setStepHead(
        "engineViewBlock",
        "7. 보고서 관점 선택",
        "보고서를 어떤 시선으로 정리할지 마지막 관점을 고릅니다.",
        "관점 선택"
      );
      setStepHead(
        "engineLineBlock",
        "8. 보고서 라인 선택",
        "보고서를 어떤 순서와 비중으로 쓸지 뼈대를 고릅니다. 같은 주제라도 라인에 따라 결과물이 달라집니다.",
        "기본형 / 확장형 / 심화형"
      );

      applyLocks(ctx);
      renderModeArea(ctx);
      renderViewArea(ctx);
      renderLineArea(ctx);
      renderOperatorPanel(ctx);

      global.__REPORT_6_8_LAST_PAYLOAD__ = ctx.payload || null;
      global.__REPORT_6_8_LAST_BOOK_RESULT__ = getBookResult();
    } finally {
      setTimeout(()=>{ applying = false; }, 30);
    }
  }

  function boot(){
    apply();
    [250, 700, 1400].forEach(delay => setTimeout(apply, delay));
    try {
      const observer = new MutationObserver(function(){
        clearTimeout(global.__REPORT_6_8_APPLY_TIMER_V27__);
        global.__REPORT_6_8_APPLY_TIMER_V27__ = setTimeout(apply, 100);
      });
      observer.observe(document.body, { childList:true, subtree:true });
      global.__REPORT_6_8_OBSERVER_V27__ = observer;
    } catch(error) {}
  }

  global.__REPORT_6_8_APPLY__ = apply;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
