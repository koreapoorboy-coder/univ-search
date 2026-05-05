/* book_210_ui_bridge.js
 * 210권 도서 추천 화면 연결 브리지 v9
 * - report-role-engine 결과를 화면과 MINI payload에 연결
 */
(function(global){
  "use strict";
  const BRIDGE_VERSION = "book-210-ui-bridge-v13-summary-book-intro-restored";
  global.__BOOK_210_UI_BRIDGE_VERSION__ = BRIDGE_VERSION;
  global.__BOOK_210_BRIDGE_LOADED_AT__ = new Date().toISOString();

  let master = null;
  let rules = null;
  let loading = null;
  let lastResult = null;

  function esc(v){
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function arr(v){ return Array.isArray(v) ? v.filter(Boolean) : []; }
  function val(v){ return String(v || "").trim(); }
  function uniq(list){ return Array.from(new Set((list || []).filter(Boolean))); }

  async function ensureEngine(){
    if (master) return master;
    if (loading) return loading;
    if (!global.BookRecommendationAdapter) return null;
    loading = Promise.all([
      global.BookRecommendationAdapter.loadBookMaster(),
      global.BookRecommendationAdapter.loadRules ? global.BookRecommendationAdapter.loadRules() : Promise.resolve(null)
    ]).then(([m, r]) => {
      master = m;
      rules = r;
      global.BOOK_SOURCE_MASTER_210 = m;
      return m;
    }).catch(error => {
      console.error("book 210 role engine load failed", error);
      return null;
    });
    return loading;
  }

  function requestEngineRerender(){
    if (typeof global.__BOOK_ENGINE_REQUEST_RERENDER__ === "function") {
      try { global.__BOOK_ENGINE_REQUEST_RERENDER__(); return true; } catch(e){}
    }
    if (typeof global.__TEXTBOOK_HELPER_RENDER__ === "function") {
      try { global.__TEXTBOOK_HELPER_RENDER__(); return true; } catch(e){}
    }
    return false;
  }

  function getStateContext(){
    const state = global.__TEXTBOOK_HELPER_STATE__ || {};
    return {
      subject: state.subject || "",
      career: state.career || state.selectedMajor || "",
      linkTrack: state.linkTrack || state.followupAxisId || "",
      followupAxisId: state.linkTrack || state.followupAxisId || "",
      concept: state.concept || state.selectedConcept || "",
      keyword: state.keyword || state.selectedKeyword || "",
      selectedBook: state.selectedBook || "",
      axisLabel: state.axisLabel || state.trackLabel || state.linkTrackLabel || "",
      axisDomain: state.axisDomain || "",
      linkedSubjects: Array.isArray(state.linkedSubjects) ? state.linkedSubjects : [],
      activityExample: state.activityExample || "",
      longitudinalPath: state.longitudinalPath || ""
    };
  }

  function canRender(ctx){
    return !!(ctx && ctx.subject && ctx.career && ctx.concept && ctx.keyword && (ctx.followupAxisId || ctx.linkTrack || ctx.axisLabel));
  }

  function buildPayload(ctx){
    const axisText = uniq([
      ctx.axisLabel,
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisDomain,
      ...(Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects : []),
      ctx.longitudinalPath
    ].map(val)).join(" ");

    return {
      subject: ctx.subject || "",
      department: ctx.career || "",
      selectedConcept: ctx.concept || "",
      selectedRecommendedKeyword: ctx.keyword || "",
      followupAxis: axisText,
      axisPayload: {
        id: ctx.followupAxisId || ctx.linkTrack || "",
        label: ctx.axisLabel || "",
        domain: ctx.axisDomain || "",
        linkedSubjects: arr(ctx.linkedSubjects),
        activityExample: ctx.activityExample || "",
        longitudinalPath: ctx.longitudinalPath || ""
      },
      reportIntent: "보고서 근거 도서"
    };
  }

  function bookKey(book){
    return val(book && (book.sourceId || book.bookId || book.book_id || book.managementNo));
  }

  function findBook(bookId){
    const id = val(bookId);
    if (!id || !master || !Array.isArray(master.books)) return null;
    return master.books.find(book => [book.sourceId, book.bookId, String(book.managementNo), book.title].map(val).includes(id)) || null;
  }

  function getCurrentEvaluatedBook(bookId){
    if (!lastResult) return null;
    const all = (lastResult.result.directBooks || []).concat(lastResult.result.expansionBooks || []);
    return all.find(book => [bookKey(book), book.title].includes(val(bookId))) || null;
  }

  function renderBookCard(book, active, index, sectionType){
    const key = bookKey(book);
    const ctx = book.selectedBookContext || {};
    const role = arr(ctx.reportRoleLabels)[0] || (sectionType === "direct" ? "보고서 핵심 근거" : "보고서 확장 참고");
    const reason = arr(book.matchReasons).join(" · ") || ctx.recommendationReason || role;
    const preview = ctx.recommendationReason || book.summary || book.reportUse || "선택한 흐름에서 보고서 근거로 활용할 수 있습니다.";
    return `
      <button type="button" class="engine-book-card ${active ? "is-active" : ""} book-chip" data-kind="book" data-value="${esc(key)}" data-title="${esc(book.title)}">
        <div class="engine-book-order">${index + 1}</div>
        <div class="engine-book-main">
          <div class="engine-book-title">${esc(book.title)}</div>
          <div class="engine-book-meta">${esc(book.author || "저자 정보 없음")} · ${esc(role)}</div>
          <div class="engine-book-preview">${esc(preview)}</div>
          <div class="engine-book-reason">${esc(reason)} · ${sectionType === "direct" ? "직접 일치" : "확장 참고"}</div>
        </div>
      </button>
    `;
  }

  function listHTML(items, fallback){
    items = arr(items).filter(Boolean).slice(0, 6);
    if (!items.length) return `<div class="engine-summary-empty">${esc(fallback || "보강 중입니다.")}</div>`;
    return `<ul class="engine-summary-list">${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }
  function tagHTML(items, fallback){
    items = arr(items).filter(Boolean).slice(0, 10);
    if (!items.length && fallback) items = [fallback];
    return `<div class="engine-tag-wrap">${items.map(k => `<span class="engine-tag subtle">${esc(k)}</span>`).join("")}</div>`;
  }

  const CORE_KEYWORD_STOPWORDS = new Set([
    "duplicate", "existing", "active", "card",
    "대표적", "대표", "도구가", "아니라", "통해", "흐름을", "이해", "단순",
    "다섯가지", "다섯 가지", "선택", "보고서", "활용", "연결", "관점",
    "핵심", "내용", "도서", "제공", "기반", "관련", "보강", "저자", "출판사"
  ]);

  function normalizeKeywordText(v){
    return val(v).replace(/\s+/g, " ").trim();
  }

  function cleanCoreKeywords(book, ctx){
    const authorText = normalizeKeywordText(book && book.author).toLowerCase();
    const relatedSubjects = new Set(arr(book && book.relatedSubjects).map(normalizeKeywordText).filter(Boolean));
    const relatedMajors = new Set(arr(book && book.relatedMajors).map(normalizeKeywordText).filter(Boolean));
    const out = [];

    arr(book && book.keywords).forEach(raw => {
      const k = normalizeKeywordText(raw);
      if (!k) return;

      const lower = k.toLowerCase();
      if (CORE_KEYWORD_STOPWORDS.has(k) || CORE_KEYWORD_STOPWORDS.has(lower)) return;
      if (/^\d{2,4}$/.test(k)) return;
      if (/^\d+\s*세기$/.test(k)) return;
      if (/^\d+\s*년대$/.test(k)) return;
      if (/^[0-9.]+$/.test(k)) return;
      if (/[\/\|]/.test(k)) return;
      if (authorText && authorText.includes(lower)) return;
      if (relatedSubjects.has(k)) return;
      if (relatedMajors.has(k)) return;
      if (/학과$/.test(k) || /교육과$/.test(k) || /공학과$/.test(k)) return;
      if (k.length < 2) return;

      out.push(k);
    });

    const contextKeywords = [ctx && ctx.keyword, ctx && ctx.concept, ctx && ctx.subject]
      .map(normalizeKeywordText)
      .filter(k => k && !relatedSubjects.has(k) && !CORE_KEYWORD_STOPWORDS.has(k));

    return uniq(out.concat(contextKeywords)).slice(0, 10);
  }

  function buildStudentContentPoints(book){
    const points = [];

    // 내담자가 책을 읽지 않아도 "무슨 책인지" 먼저 파악할 수 있도록
    // 책 자체의 간단한 성격만 남긴다. 연결 교과/선택 흐름/보고서 역할은
    // 아래 별도 영역에서 처리하므로 이 섹션에는 넣지 않는다.
    arr(book && book.bookContentPoints).forEach(p => points.push(p));

    const summary = val(book && book.summary);
    if (summary) points.push(summary);

    return uniq(points).filter(Boolean).slice(0, 3);
  }

  function buildStudentReportUseItems(book, sc){
    const use = sc.useInReport || {};
    const items = [
      use.intro,
      use.conceptExplanation,
      use.analysisFrame,
      use.comparisonFrame,
      use.limitationDiscussion,
      use.conclusionExpansion
    ].filter(Boolean);

    if (items.length) return items;

    const roles = arr(sc.reportRoleLabels);
    if (roles.length) {
      return roles.map(r => r + "로 활용할 수 있습니다.");
    }

    return ["선택한 개념과 후속 연계축을 설명하는 참고 관점으로 활용할 수 있습니다."];
  }

  function renderBookSummary(book, ctx, sectionType){
    if (!book) return `<div class="engine-empty">왼쪽에서 도서를 선택하면 요약이 보입니다.</div>`;

    const sc = book.selectedBookContext || {};
    const badge = sectionType === "direct" ? "직접 일치 도서" : "확장 참고 도서";
    const useItems = buildStudentReportUseItems(book, sc);
    const keywords = cleanCoreKeywords(book, ctx);

    return `
      <div class="engine-summary-box">
        <div class="engine-summary-top">
          <div>
            <div class="engine-summary-title">${esc(book.title)}</div>
            <div class="engine-summary-meta">${esc(book.author || "")}</div>
          </div>
          <div class="engine-summary-badge">${esc(badge)}</div>
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">이 책은 어떤 책인가</div>
          ${listHTML(buildStudentContentPoints(book), "책의 핵심 내용을 요약 중입니다.")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">보고서에서 활용할 수 있는 방식</div>
          ${listHTML(useItems, "분석 관점 또는 결론 확장 부분에서 활용할 수 있습니다.")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">이 책의 핵심 키워드</div>
          ${tagHTML(keywords, ctx.keyword || "핵심 키워드")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">관련 교과</div>
          ${tagHTML(book.relatedSubjects || [], ctx.subject || "선택 과목")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">관련 학과</div>
          ${tagHTML(book.relatedMajors || [], ctx.career || "선택 학과")}
        </div>
      </div>
    `;
  }


  global.renderBookSelectionHTML = function(ctx){
    ctx = ctx || {};
    if (!ctx.subject || !ctx.career) return `<div class="engine-empty">먼저 과목과 학과를 입력하세요.</div>`;
    if (!ctx.concept || !ctx.keyword) return `<div class="engine-empty">먼저 3번 교과 개념과 추천 키워드를 선택해야 도서 추천이 열립니다.</div>`;
    if (!(ctx.followupAxisId || ctx.linkTrack || ctx.axisLabel)) return `<div class="engine-empty">먼저 4번 후속 연계축을 선택해야 5번 도서 추천이 열립니다.</div>`;
    if (!global.BookRecommendationAdapter) return `<div class="engine-empty">210권 도서 추천 어댑터를 불러오는 중입니다.</div>`;
    if (!master) {
      ensureEngine().then(()=>forceRenderBookArea("master-loaded"));
      return `<div class="engine-empty">210권 도서 추천 데이터를 불러오는 중입니다.</div>`;
    }

    const payload = buildPayload(ctx);
    const result = global.BookRecommendationAdapter.recommendBooks(payload, master.books, { directLimit: 3, expansionLimit: 5 });
    lastResult = { ctx, payload, result };
    global.__BOOK_210_LAST_RESULT__ = lastResult;

    const direct = result.directBooks || [];
    const expansion = result.expansionBooks || [];
    const all = direct.concat(expansion);

    if (!all.length) {
      return `<div class="engine-empty">현재 선택한 전공군·개념·후속 연계축에 맞는 도서가 아직 충분하지 않습니다. 키워드나 연계축을 바꿔 보세요.</div>`;
    }

    const selected = all.find(book => [bookKey(book), book.title].includes(val(ctx.selectedBook))) || all[0];
    const selectedSection = direct.some(book => bookKey(book) === bookKey(selected)) ? "direct" : "expansion";

    const directHTML = direct.length
      ? direct.map((book, index) => renderBookCard(book, bookKey(book) === bookKey(selected), index, "direct")).join("")
      : `<div class="engine-empty">직접 일치 도서가 부족합니다. 확장 참고 도서를 확인하세요.</div>`;

    const expansionHTML = expansion.length ? `
      <div style="margin-top:18px;">
        <div class="engine-subtitle">확장 참고 도서</div>
        <div class="engine-help">핵심 도서는 아니지만, 보고서의 비교·한계·사회적 의미 확장에 활용할 수 있는 도서입니다.</div>
        ${expansion.map((book, index) => renderBookCard(book, bookKey(book) === bookKey(selected), index, "expansion")).join("")}
      </div>
    ` : "";

    return `
      <div class="engine-book-layout">
        <div class="engine-book-list">
          <div class="engine-subtitle">직접 일치 도서</div>
          <div class="engine-help">전공군·교과 개념·후속 연계축이 모두 맞아 보고서 핵심 근거로 쓸 수 있는 도서입니다.</div>
          ${directHTML}
          ${expansionHTML}
        </div>
        <div class="engine-book-summary">
          <div class="engine-subtitle">선택 도서 요약</div>
          ${renderBookSummary(selected, ctx, selectedSection)}
        </div>
      </div>
    `;
  };

  global.getSelectedBookDetail = function(bookId){
    const evaluated = getCurrentEvaluatedBook(bookId);
    const raw = evaluated || findBook(bookId);
    if (!raw) return null;
    return {
      ...raw,
      book_id: bookKey(raw),
      source_book_uid: raw.sourceId || "",
      title: raw.title || "",
      author: raw.author || "",
      summary_short: raw.summary || raw.reportUse || "",
      book_core_summary: raw.summary || raw.reportUse || "",
      linked_subjects: raw.relatedSubjects || [],
      linked_majors: raw.relatedMajors || [],
      fit_keywords: raw.keywords || [],
      selectedBookContext: raw.selectedBookContext || null,
      miniUseGuide: raw.selectedBookContext || null
    };
  };

  global.getReportOptionMeta = function(ctx){
    const selected = global.getSelectedBookDetail(ctx && ctx.selectedBook);
    const roles = selected && selected.selectedBookContext ? selected.selectedBookContext.reportRole || [] : [];
    const modeOptions = [
      { id: "principle", label: "원리 파악형", desc: "핵심 개념이 왜 성립하는지 설명합니다." },
      { id: "compare", label: "비교 분석형", desc: "두 사례나 조건의 차이를 비교합니다." },
      { id: "data", label: "데이터 확장형", desc: "자료·수치·그래프를 해석하며 확장합니다." },
      { id: "application", label: "사례 적용형", desc: "실생활·산업 사례에 적용합니다." },
      { id: "major", label: "전공 확장형", desc: "희망 진로와 직접 연결해 정리합니다." }
    ];
    const viewOptions = ["원리", "자료 해석", "모델링", "한계", "비교", "사회적 의미", "진로 확장"].concat(roles);
    return { selectedBook: selected, modeOptions, viewOptions, reportLines: ["기본형","확장형","심화형"], recommendedLine: roles.includes("conclusionExpansion") ? "확장형" : "기본형" };
  };

  function getStateContext(){
    const state = global.__TEXTBOOK_HELPER_STATE__ || {};
    return {
      subject: state.subject || "",
      career: state.career || state.selectedMajor || "",
      linkTrack: state.linkTrack || state.followupAxisId || "",
      followupAxisId: state.linkTrack || state.followupAxisId || "",
      concept: state.concept || state.selectedConcept || "",
      keyword: state.keyword || state.selectedKeyword || "",
      selectedBook: state.selectedBook || "",
      axisLabel: state.axisLabel || state.trackLabel || state.linkTrackLabel || "",
      axisDomain: state.axisDomain || "",
      linkedSubjects: Array.isArray(state.linkedSubjects) ? state.linkedSubjects : [],
      activityExample: state.activityExample || "",
      longitudinalPath: state.longitudinalPath || ""
    };
  }

  function canForceRender(ctx){
    return !!(ctx && ctx.subject && ctx.career && ctx.concept && ctx.keyword && (ctx.followupAxisId || ctx.linkTrack || ctx.axisLabel));
  }


  function buildRenderKey(ctx){
    return [
      ctx.subject || "",
      ctx.career || "",
      ctx.concept || "",
      ctx.keyword || "",
      ctx.followupAxisId || "",
      ctx.linkTrack || "",
      ctx.axisLabel || "",
      ctx.selectedBook || ""
    ].join("||");
  }

  function forceRenderBookArea(reason){
    const el = document.getElementById("engineBookArea");
    if (!el) return false;
    const ctx = getStateContext();
    global.__BOOK_210_FORCE_RENDER_CONTEXT__ = ctx;
    if (!canForceRender(ctx)) return false;
    if (!master) {
      ensureEngine().then(()=>forceRenderBookArea("master-loaded-after-force"));
      return false;
    }

    const renderKey = buildRenderKey(ctx);
    if (el.getAttribute("data-book-210-render-key") === renderKey && global.__BOOK_210_LAST_RESULT__) {
      return true;
    }

    try {
      global.__BOOK_210_IS_RENDERING__ = true;
      el.innerHTML = global.renderBookSelectionHTML(ctx);
      el.setAttribute("data-book-210-render-key", renderKey);
      global.__BOOK_210_FORCE_RENDERED_AT__ = new Date().toISOString();
      global.__BOOK_210_FORCE_RENDER_REASON__ = reason || "";
      setTimeout(()=>{ global.__BOOK_210_IS_RENDERING__ = false; }, 80);
      return true;
    } catch(error){
      global.__BOOK_210_IS_RENDERING__ = false;
      console.error("book 210 force render failed", error);
      return false;
    }
  }


  function installBridgeBookClickHandler(){
    if (global.__BOOK_210_BOOK_CLICK_HANDLER__) return;
    global.__BOOK_210_BOOK_CLICK_HANDLER__ = true;

    document.addEventListener("click", function(event){
      const btn = event.target && event.target.closest ? event.target.closest(".book-chip[data-kind='book']") : null;
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      const value = btn.getAttribute("data-value") || "";
      const title = btn.getAttribute("data-title") || "";
      const state = global.__TEXTBOOK_HELPER_STATE__;

      if (state) {
        state.selectedBook = value;
        state.selectedBookTitle = title;
        state.reportMode = "";
        state.reportView = "";
        state.reportLine = "";
      }

      global.__BOOK_210_LAST_CLICKED_BOOK__ = { value, title, at: new Date().toISOString() };
      const el = document.getElementById("engineBookArea");
      if (el) el.removeAttribute("data-book-210-render-key");

      forceRenderBookArea("bridge-book-click");
    }, true);
  }


  function installObserver(){
    if (global.__BOOK_210_BOOK_AREA_OBSERVER__) return;
    try {
      const observer = new MutationObserver(function(){
        if (global.__BOOK_210_IS_RENDERING__) return;
        if (!document.getElementById("engineBookArea")) return;
        if (canForceRender(getStateContext())) {
          clearTimeout(global.__BOOK_210_FORCE_RENDER_TIMER__);
          global.__BOOK_210_FORCE_RENDER_TIMER__ = setTimeout(()=>forceRenderBookArea("mutation-observer"), 180);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      global.__BOOK_210_BOOK_AREA_OBSERVER__ = observer;
    } catch(e){}
  }

  global.__BOOK_210_GET_LAST_RESULT__ = function(){ return lastResult; };
  global.__BOOK_210_FORCE_RENDER__ = function(){ return forceRenderBookArea("manual-console"); };

  installBridgeBookClickHandler();
  installObserver();
  ensureEngine().then(()=>{
    [100, 300, 700, 1200].forEach(delay => setTimeout(()=>forceRenderBookArea("init-" + delay), delay));
    if (typeof global.__BOOK_ENGINE_REQUEST_RERENDER__ === "function") {
      try { global.__BOOK_ENGINE_REQUEST_RERENDER__(); } catch(e){}
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ installBridgeBookClickHandler(); installObserver(); });
  }
})(typeof window !== "undefined" ? window : globalThis);
