/* report_6_8_flow_bridge.js
 * v235: 학생용 결과물 수준 선택지 정리 + 내부 생성 문구 비노출
 * - 6번은 수행평가 방식(방법) + 보고서 전개 방식 선택
 * - 7번은 평가 관점·과정 증거 선택
 * - 8번은 결과물 수준/보고서 라인 선택
 * - 내부 payload/targetStructure는 접힌 운영자용 영역으로만 제공
 */
(function(global){
  "use strict";

  const VERSION = "report-6-8-flow-bridge-v235-two-depth-student-clean";
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


  const ROLE_VIEW_ALIASES = {
    analysisFrame: "자료 해석",
    evidenceFrame: "자료 해석",
    conceptExplanation: "원리",
    comparisonFrame: "비교",
    limitationDiscussion: "한계",
    conclusionExpansion: "사회적 의미",
    careerExpansion: "진로 확장",
    socialMeaning: "사회적 의미"
  };

  const MODE_DIRECTIVES = {
    principle: {
      title: "원리 파악형",
      intent: "교과 개념의 원리를 설명하는 방식으로 수행 과정을 구성합니다.",
      mini: "교과 개념 설명 → 원리 작동 과정 → 선택 키워드 적용 → 한계 또는 확장 순서로 작성한다.",
      table: "원리 / 적용 사례 / 확인 자료 / 내 해석"
    },
    compare: {
      title: "비교 분석형",
      intent: "두 사례·조건·관점을 비교 기준에 따라 분석하는 수행 방식입니다.",
      mini: "비교 기준 설정 → 조건 A/B 비교 → 차이 해석 → 내 판단 기준 제시 순서로 작성한다.",
      table: "비교 기준 / 조건 A / 조건 B / 차이 해석"
    },
    data: {
      title: "데이터 확장형",
      intent: "자료·수치·그래프를 근거로 해석하는 수행 방식입니다.",
      mini: "변수 설정 → 자료 출처 확인 → 그래프·표 해석 → 자료 한계 점검 순서로 작성한다.",
      table: "변수 / 자료 출처 / 그래프·수치 / 해석"
    },
    application: {
      title: "사례 적용형",
      intent: "교과 개념을 실제 사례나 문제 상황에 적용하는 수행 방식입니다.",
      mini: "현실 사례 제시 → 교과 원리 적용 → 해결 과정 → 적용 한계 순서로 작성한다.",
      table: "사례 / 적용 개념 / 해결 과정 / 한계"
    },
    major: {
      title: "전공 확장형",
      intent: "교과 개념을 전공·진로 문제 상황으로 확장하는 수행 방식입니다.",
      mini: "교과 개념 → 전공 문제 상황 → 전공식 분석 기준 → 후속 탐구 순서로 작성한다.",
      table: "교과 개념 / 전공 개념 / 적용 자료 / 후속 탐구"
    },
    book: {
      title: "도서 근거형",
      intent: "선택 도서를 독후감이 아니라 수행 과정의 근거·관점 자료로 사용하는 방식입니다.",
      mini: "탐구 질문 → 도서 관점 → 개념 재해석 → 결론 확장 순서로 작성한다.",
      table: "도서 관점 / 교과 개념 / 적용 사례 / 결론 확장"
    }
  };

  function normalizeViewName(input){
    const raw = val(input);
    if (!raw) return "";
    if (ROLE_VIEW_ALIASES[raw]) return ROLE_VIEW_ALIASES[raw];
    if (/conclusionExpansion|사회|정책|윤리|의미/.test(raw)) return "사회적 의미";
    if (/comparisonFrame|비교|대조/.test(raw)) return "비교";
    if (/limitationDiscussion|한계|오차|편향|제약/.test(raw)) return "한계";
    if (/analysisFrame|evidenceFrame|자료|근거/.test(raw)) return "자료 해석";
    if (/conceptExplanation|원리/.test(raw)) return "원리";
    if (/careerExpansion|진로|전공/.test(raw)) return "진로 확장";
    if (/모델/.test(raw)) return "모델링";
    if (/데이터/.test(raw)) return "데이터";
    return raw;
  }

  function modeDirective(mode){
    return MODE_DIRECTIVES[mode] || MODE_DIRECTIVES.principle;
  }

  function lineDirective(line){
    const profile = LINE_HELP[line] || LINE_HELP.standard;
    if (profile.id === "advanced") return `${profile.title}: 한계·후속 탐구·진로 확장까지 포함합니다.`;
    return `${profile.title}: 자료·도서·사례를 붙여 수행평가 제출용으로 확장합니다.`;
  }

  function normalizeLineId(input){
    const raw = val(input);
    if (!raw || raw === "basic" || raw === "기본형" || raw === "일반형") return "standard";
    if (raw === "확장형") return "standard";
    if (raw === "심화형") return "advanced";
    return raw;
  }

  function buildMeaningPreview(ctx, lineId){
    const mode = ctx.state.reportMode || ctx.ctx?.reportChoices?.mode || "principle";
    const view = normalizeViewName(ctx.state.reportView || ctx.ctx?.reportChoices?.view || "");
    const line = normalizeLineId(lineId || ctx.state.reportLine || ctx.ctx?.reportChoices?.line || "standard");
    const m = modeDirective(mode);
    const v = VIEW_HELP[view] || { title: view || "과정 증거 선택", desc: "선택한 관점에 맞춰 보고서 강조점을 조정합니다.", example: "선택 관점에 따라 질문·자료·결론 방향을 바꿉니다." };
    return {
      modeLabel: m.title,
      viewLabel: v.title || view,
      lineLabel: (LINE_HELP[line] || LINE_HELP.standard).title,
      modeInstruction: m.mini,
      viewInstruction: `${v.title || view}: ${v.desc || "선택 관점에 맞춰 분석합니다."}`,
      lineInstruction: lineDirective(line),
      tableFrame: m.table
    };
  }

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

  function getSelectedBookFallback(payload){
    const state = getState();
    if (payload && payload.selectedBook && (payload.selectedBook.title || payload.selectedBook.sourceId || payload.selectedBook.managementNo)) return payload.selectedBook;
    if (state && state.selectedBook) return state.selectedBook;
    if (global.__BOOK_210_LAST_CLICKED_BOOK__) return global.__BOOK_210_LAST_CLICKED_BOOK__;
    const r = getBookResult();
    const candidates = [
      r?.selectedBook,
      r?.book,
      r?.lastSelectedBook,
      r?.result?.selectedBook,
      r?.result?.lastSelectedBook,
      r?.result?.clickedBook,
      r?.result?.activeBook
    ];
    for (const b of candidates){
      if (b && (b.title || b.sourceId || b.managementNo)) return b;
    }
    const domBook = document.querySelector("[data-book-selected=\"1\"], .book-card.is-active, .book-card.active, .book-card.selected, .book-210-card.is-active, .book-210-card.active, .book-210-card.selected, [data-book-id].is-active, [data-book-id].active, [data-book-id].selected");
    if (domBook){
      const title = domBook.getAttribute("data-title") || domBook.getAttribute("data-book-title") || (domBook.querySelector(".book-title, .engine-book-title, h4, h3")?.textContent || "").trim();
      const id = domBook.getAttribute("data-book-id") || domBook.getAttribute("data-source-id") || domBook.getAttribute("data-management-no") || "";
      if (title || id) return { title, sourceId:id, managementNo:id, fromDom:true };
    }
    return null;
  }

  function hasSelectedBook(payload){
    return !!getSelectedBookFallback(payload);
  }

  function getBookUsageMode(ctx){
    const hasBook = !!(ctx && ctx.selectedBook);
    let raw = "";
    try { raw = String(global.__BOOK_USAGE_MODE__ || localStorage.getItem("ke.bookUsageMode.v222") || "").trim(); } catch(error) { raw = String(global.__BOOK_USAGE_MODE__ || "").trim(); }
    if (!raw) raw = hasBook ? "useBook" : "noBook";
    if (/^(useBook|book|use|도서활용|도서 사용)$/i.test(raw)) return hasBook ? "useBook" : "needBook";
    return "noBook";
  }

  function shouldUseBook(ctx){
    return getBookUsageMode(ctx) === "useBook" && !!(ctx && ctx.selectedBook);
  }

  function setBookUsageMode(mode){
    const next = mode === "useBook" ? "useBook" : "noBook";
    global.__BOOK_USAGE_MODE__ = next;
    try { localStorage.setItem("ke.bookUsageMode.v222", next); } catch(error) {}
  }

  function renderBookUsageToggle(ctx){
    const mode = getBookUsageMode(ctx);
    const hasBook = !!ctx.selectedBook;
    const bookTitle = ctx.selectedBook?.title || "선택 도서";
    const useActive = mode === "useBook";
    const noActive = mode !== "useBook";
    return `
      <div class="report-choice-book-toggle" data-book-usage-box="1">
        <div class="report-choice-book-toggle-title">5번 도서 활용 여부</div>
        <div class="report-choice-book-toggle-row">
          <button type="button" class="report-choice-book-toggle-btn ${noActive ? "is-active" : ""}" data-action="book-usage" data-value="noBook">도서 없이 진행</button>
          <button type="button" class="report-choice-book-toggle-btn ${useActive ? "is-active" : ""}" data-action="book-usage" data-value="useBook" ${hasBook ? "" : "disabled"}>선택 도서 활용${hasBook ? `: ${esc(bookTitle)}` : ""}</button>
        </div>
        <div class="report-choice-book-toggle-desc">
          ${hasBook ? "도서를 활용해도 되고, 도서 없이 공공자료·통계·기사·실험자료 중심으로 수행평가를 설계할 수도 있습니다." : "도서를 넣지 않는 수행평가는 ‘도서 없이 진행’을 선택한 상태로 6~8번을 바로 설계합니다. 도서가 필요한 수행평가라면 5번에서 책을 선택하면 됩니다."}
        </div>
      </div>
    `;
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
      .report-choice-book-toggle { margin-bottom:12px; padding:12px 14px; border:1px solid #d9e4fb; border-radius:16px; background:#f8fbff; }
      .report-choice-book-toggle-title { font-weight:900; color:#172033; margin-bottom:8px; }
      .report-choice-book-toggle-row { display:flex; flex-wrap:wrap; gap:8px; }
      .report-choice-book-toggle-btn { border:1px solid #b8c8ee; background:#fff; color:#275fe8; border-radius:999px; padding:8px 12px; font-size:12px; font-weight:900; cursor:pointer; }
      .report-choice-book-toggle-btn.is-active { background:#2f66ff; color:#fff; border-color:#2f66ff; }
      .report-choice-book-toggle-desc { margin-top:8px; color:#52617b; font-size:13px; line-height:1.55; }
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
    const selectedBook = getSelectedBookFallback(payload);
    return {
      state,
      payload,
      subject: s.subject || state.subject || "",
      major: s.department || state.career || state.majorSelectedName || "",
      concept: s.selectedConcept || state.concept || "",
      keyword: s.selectedKeyword || s.selectedRecommendedKeyword || state.keyword || "",
      axis: s.selectedFollowupAxis || s.followupAxis || state.linkTrack || "",
      selectedBook: selectedBook || null,
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
    if (!shouldUseBook(ctx)) {
      return merged.filter(item => item.id !== "book");
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
    const options = modeOptions(ctx);
    const recommended = recommendedModeId(ctx, options);
    const active = ctx.state.reportMode || "";
    const key = `${VERSION}:mode:${active}:${recommended}:${ctx.keyword}:${ctx.axis}:${ctx.selectedBook?.title || ""}:${getBookUsageMode(ctx)}:${options.map(o=>o.id).join(",")}`;
    if (el.getAttribute("data-report-choice-key") === key) return;
    el.setAttribute("data-report-choice-key", key);
    el.innerHTML = `
      ${renderBookUsageToggle(ctx)}
      <div class="engine-mode-grid">${options.map(option => {
        const guide = modeDirective(option.id);
        return `
        <button type="button" class="engine-mode-card ${active === option.id ? "is-active" : ""}" data-action="mode" data-value="${esc(option.id)}">
          <div class="engine-mode-title">${esc(option.label)} ${option.id === recommended ? '<span class="engine-mini-tag" style="margin-left:6px;">추천</span>' : ''}</div>
          <div class="engine-mode-desc">${esc(guide.intent || option.desc || "")}</div>
          <div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:800;">보고서 작성 흐름: ${esc(guide.mini)}</div>
        </button>
      `}).join("")}</div>
      <div class="report-choice-note">6번은 단어 태그가 아니라 <b>수행평가 방법</b>입니다. 도서 활용은 선택값이며, 도서를 사용하지 않는 경우 공공자료·통계·기사·실험자료 중심으로 보고서 구조를 잡습니다.</div>
    `;
  }

  function viewOptionsFor(ctx){
    const meta = getMeta(ctx);
    const base = arr(meta.viewOptions).map(normalizeViewName);
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
    (byMode[mode] || []).concat(base, ["원리","자료 해석","모델링","한계","비교","사회적 의미","진로 확장"])
      .map(normalizeViewName)
      .forEach(item => {
        if (!item || seen.has(item)) return;
        seen.add(item);
        merged.push(item);
      });
    return merged;
  }

  function renderViewArea(ctx){
    const el = q("engineViewButtons");
    if (!el) return;
    if (!ctx.state.reportMode) {
      el.innerHTML = `<div class="engine-empty">먼저 6번에서 수행평가 방식을 선택하면 평가 관점·과정 증거 선택이 열립니다.</div>`;
      return;
    }
    const options = viewOptionsFor(ctx);
    const active = normalizeViewName(ctx.state.reportView || "");
    const current = VIEW_HELP[active] || VIEW_HELP[options[0]] || { title:"과정 증거 선택", desc:"보고서를 어떤 시선으로 정리할지 고릅니다.", example:"선택한 관점에 따라 세부 문장과 강조점이 바뀝니다." };
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
        <div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:800;">평가 관점 반영: ${esc((current.title || active || "선택 관점") + "을 중심으로 질문·자료 표·결론 방향을 조정합니다.")}</div>
      </div>
    `;
  }

  function recommendedLine(ctx){
    const mode = ctx.state.reportMode || "";
    const pattern = ctx.ctx?.examplePattern?.id || "";
    if (mode === "major" || pattern === "bio_mechanism" || pattern === "physics_energy_system") return "advanced";
    return "standard";
  }

  function renderLineArea(ctx){
    const el = q("engineLineArea");
    if (!el) return;
    if (!ctx.state.reportMode || !ctx.state.reportView) {
      el.innerHTML = `<div class="engine-empty">먼저 6번 전개 방식과 7번 관점을 선택하면 결과물 라인을 고를 수 있습니다.</div>`;
      return;
    }
    const entries = [LINE_HELP.standard, LINE_HELP.advanced];
    const rec = normalizeLineId(recommendedLine(ctx));
    const active = normalizeLineId(ctx.state.reportLine || "");
    const current = LINE_HELP[active] || LINE_HELP[rec] || LINE_HELP.standard;
    const meaning = buildMeaningPreview(ctx, active || rec);
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
      <div class="report-choice-note">확장형과 심화형 중 하나를 선택하면 선택한 결과물 수준은 보고서 초안의 분량과 깊이에만 반영됩니다. 별도의 내부 작성 지시문은 학생 화면에 표시하지 않습니다.</div>
    `;
  }

  function operatorSummaryHTML(ctx){
    const p = ctx.payload || {};
    const gen = p.reportGenerationContext || {};
    const choices = gen.reportChoices || {};
    const lineLabel = choices.lineLabel || (normalizeLineId(ctx.state.reportLine) === "advanced" ? "심화형" : "확장형");
    return `
      <div class="report-choice-preview" style="display:none;">
        <div class="report-choice-preview-title">선택 요약</div>
        <div class="report-choice-preview-desc">
          전개 방식: ${esc(choices.modeLabel || ctx.state.reportMode || "-")}<br>
          평가 관점: ${esc(choices.viewLabel || normalizeViewName(ctx.state.reportView) || "-")}<br>
          결과물 수준: ${esc(lineLabel || "확장형")}
        </div>
      </div>
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
      `도서 활용: ${shouldUseBook(ctx) ? (p.selectedBook?.title || "선택 도서") : "사용하지 않음"}`,
      `수행평가 방식: ${choices.modeLabel || s.reportMode || "-"}`,
      `평가 관점·과정 증거: ${choices.viewLabel || normalizeViewName(s.reportView) || "-"}`,
      `결과물 수준: ${choices.lineLabel || s.reportLine || "-"}`,
      "",
      "2차 확장 방향:",
      arr(gen.secondaryExpansionContext?.paths).map((path, idx) => `${idx + 1}. ${path.label}: ${path.question}`).join("\n"),
      "",
      "수행평가 영역명과 연결되는 작성 구조:",
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
      const bookUsageBtn = event.target && event.target.closest ? event.target.closest("[data-action='book-usage']") : null;
      if (bookUsageBtn) {
        event.preventDefault();
        setBookUsageMode(bookUsageBtn.getAttribute("data-value") || "noBook");
        try { if (global.MiniReportPayloadBuilder && typeof global.MiniReportPayloadBuilder.buildMiniPayload === "function") global.__REPORT_6_8_LAST_PAYLOAD__ = global.MiniReportPayloadBuilder.buildMiniPayload(); } catch(e) {}
        apply();
        return;
      }
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
    const key = `${VERSION}:operator:${ctx.state.reportMode}:${ctx.state.reportView}:${ctx.state.reportLine}:${ctx.keyword}:${ctx.axis}:${ctx.selectedBook?.title || ""}:${getBookUsageMode(ctx)}:${arr(ctx.ctx?.targetStructure).join(">")}`;
    if (payloadEl.getAttribute("data-report-choice-key") === key) return;
    payloadEl.setAttribute("data-report-choice-key", key);
    payloadEl.innerHTML = operatorSummaryHTML(ctx);
    const hidden = q("miniNavigationPayload");
    if (hidden && ctx.payload) hidden.value = JSON.stringify(ctx.payload);
  }

  function applyLocks(ctx){
    const readyBase = !!(ctx.subject && ctx.concept && ctx.keyword && ctx.axis);
    const blocks = [
      ["engineModeBlock", readyBase],
      ["engineViewBlock", readyBase && !!ctx.state.reportMode],
      ["engineLineBlock", readyBase && !!ctx.state.reportMode && !!ctx.state.reportView]
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
        "6. 수행평가 방식 선택",
        "같은 교과 개념이라도 어떤 방법으로 수행했는지에 따라 수행평가 영역명과 보고서 방향이 달라집니다. 도서 활용은 선택입니다.",
        "설명하기 / 비교 분석하기 / 자료 분석하기"
      );
      setStepHead(
        "engineViewBlock",
        "7. 평가 관점·과정 증거 선택",
        "자료 해석, 비교, 한계 점검처럼 생활기록부에 남길 사고 과정의 증거를 고릅니다.",
        "과정 증거 선택"
      );
      setStepHead(
        "engineLineBlock",
        "8. 결과물 수준 선택",
        "수행평가 제출용 확장형 또는 심화 탐구형 중 선택합니다.",
        "확장형 / 심화형"
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
  global.__DIAGNOSE_REPORT_6_8_V33__ = function(){
    const ctx = buildContext();
    return { version: VERSION, bookUsageMode: getBookUsageMode(ctx), useBook: shouldUseBook(ctx), hasSelectedBook: hasSelectedBook(ctx.payload), selectedBook: ctx.selectedBook, reportMode: ctx.state.reportMode || "", reportView: normalizeViewName(ctx.state.reportView || ""), reportLine: ctx.state.reportLine || "", payload: ctx.payload };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
