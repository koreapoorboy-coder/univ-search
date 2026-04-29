/* book_210_ui_bridge.js
 * 210권 도서 추천 화면 연결 브리지 v3
 * - 4번 활동 예시의 "구조/비교/분석" 같은 일반어를 도서 매칭 payload에서 제외
 * - 선택 도서 요약을 기존 상세 카드형 구조로 복구
 */
(function(global){
  "use strict";
  const BRIDGE_VERSION = "book-210-ui-bridge-v5-late-override";
  global.__BOOK_210_UI_BRIDGE_VERSION__ = BRIDGE_VERSION;
  global.__BOOK_210_BRIDGE_LOADED_AT__ = new Date().toISOString();

  const DEFAULT_MODE_OPTIONS = [
    { id: "principle", label: "원리 파악형", desc: "핵심 개념이 왜 성립하는지 설명합니다." },
    { id: "compare", label: "비교 분석형", desc: "두 사례나 조건의 차이를 비교합니다." },
    { id: "data", label: "데이터 확장형", desc: "자료·수치·그래프를 해석하며 확장합니다." },
    { id: "application", label: "사례 적용형", desc: "실생활·산업 사례에 적용합니다." },
    { id: "major", label: "전공 확장형", desc: "희망 진로와 직접 연결해 정리합니다." }
  ];
  const DEFAULT_VIEW_OPTIONS = ["원리", "구조", "기능", "변화", "비교", "효율", "데이터", "사회적 의미"];

  let master = null;
  let masterLoading = null;
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

  function requestEngineRerender(reason){
    if (typeof global.__BOOK_ENGINE_REQUEST_RERENDER__ === "function") {
      try {
        global.__BOOK_ENGINE_REQUEST_RERENDER__();
        return true;
      } catch(e) {
        console.warn("book 210 bridge rerender failed", reason || "", e);
      }
    }
    if (typeof global.__TEXTBOOK_HELPER_RENDER__ === "function") {
      try {
        global.__TEXTBOOK_HELPER_RENDER__();
        return true;
      } catch(e) {
        console.warn("book 210 bridge helper render failed", reason || "", e);
      }
    }
    return false;
  }

  function rerenderSoon(reason){
    [50, 180, 450, 900, 1500].forEach(function(delay){
      setTimeout(function(){ requestEngineRerender(reason || "book-210-bridge"); }, delay);
    });
  }

  async function ensureMaster(){
    if (master) return master;
    if (masterLoading) return masterLoading;
    if (!global.BookRecommendationAdapter || typeof global.BookRecommendationAdapter.loadBookMaster !== "function") {
      return null;
    }
    masterLoading = global.BookRecommendationAdapter.loadBookMaster()
      .then(function(data){
        master = data;
        global.BOOK_SOURCE_MASTER_210 = data;
        rerenderSoon();
        return data;
      })
      .catch(function(error){
        console.error("book 210 master load failed", error);
        return null;
      });
    return masterLoading;
  }

  function buildPayload(ctx){
    ctx = ctx || {};
    // 중요: activityExample에는 "구조, 비교, 분석"처럼 너무 일반적인 단어가 많아 도서 매칭을 오염시킨다.
    // 따라서 5번 도서 추천 payload에서는 제외하고, 요약 카드의 보고서 활용 문구에서만 사용한다.
    const axisText = uniq([
      ctx.axisLabel,
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisDomain,
      ...arr(ctx.linkedSubjects),
      ctx.longitudinalPath
    ].map(val)).join(" ");

    return {
      subject: ctx.subject || "",
      department: ctx.selectedMajor || ctx.career || "",
      selectedConcept: ctx.concept || ctx.selectedConcept || "",
      selectedRecommendedKeyword: ctx.keyword || ctx.selectedKeyword || "",
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
    return val(book && (book.sourceId || book.bookId || book.book_id || book.source_book_uid || book.managementNo));
  }

  function findBook(bookId){
    const id = val(bookId);
    if (!id || !master || !Array.isArray(master.books)) return null;
    return master.books.find(function(book){
      return [book.sourceId, book.bookId, book.book_id, book.source_book_uid, String(book.managementNo), book.title].map(val).includes(id);
    }) || null;
  }

  function toLegacyBook(book){
    if (!book) return null;
    return {
      ...book,
      book_id: bookKey(book),
      source_book_uid: book.sourceId || book.source_book_uid || "",
      title: book.title || "",
      author: book.author || "",
      summary_short: book.summary || book.reportUse || "",
      book_core_summary: book.summary || book.reportUse || "",
      linked_subjects: arr(book.relatedSubjects),
      linked_majors: arr(book.relatedMajors),
      related_subjects_highschool: arr(book.relatedSubjects),
      related_majors: arr(book.relatedMajors),
      fit_keywords: arr(book.keywords),
      core_keywords: arr(book.keywords),
      book_keywords: arr(book.keywords),
      book_content_points: arr(book.bookContentPoints).length ? arr(book.bookContentPoints) : [book.summary, book.reportUse].filter(Boolean),
      report_modes: arr(book.fitModes).length ? arr(book.fitModes) : ["principle", "compare", "data", "application", "major"],
      fit_modes: arr(book.fitModes).length ? arr(book.fitModes) : ["principle", "compare", "data", "application", "major"],
      perspectives: arr(book.keywords).slice(0, 4).concat(["원리", "비교", "사회적 의미"]),
      report_lines: ["기본형", "확장형", "심화형"],
      question_seeds: arr(book.starterQuestions).length ? arr(book.starterQuestions) : [book.reportUse || book.summary || "이 도서를 근거로 선택 키워드와 후속 연계축을 어떻게 설명할 수 있을까?"],
      selection_summary: book.summary || book.reportUse || ""
    };
  }

  function renderBookCard(book, active, index, sectionType){
    const key = bookKey(book);
    const badge = sectionType === "direct" ? "직접 일치" : "확장 참고";
    const reason = arr(book.matchReasons).join(" · ") || (sectionType === "direct" ? "선택 키워드 직접 연결" : "보고서 확장 참고");
    const subjectTag = arr(book.relatedSubjects)[0] || arr(book.relatedThemes)[0] || "교과 연결";
    const preview = book.summary || book.reportUse || "선택한 개념·키워드·후속 연계축과 연결해 보고서 근거로 활용할 수 있습니다.";
    return `
      <button type="button" class="engine-book-card ${active ? "is-active" : ""} book-chip" data-kind="book" data-value="${esc(key)}" data-title="${esc(book.title)}">
        <div class="engine-book-order">${index + 1}</div>
        <div class="engine-book-main">
          <div class="engine-book-title">${esc(book.title)}</div>
          <div class="engine-book-meta">${esc(book.author || "저자 정보 없음")} · ${esc(subjectTag)}</div>
          <div class="engine-book-preview">${esc(preview)}</div>
          <div class="engine-book-reason">${esc(reason)} · ${esc(badge)}</div>
        </div>
      </button>
    `;
  }

  function listHTML(items, fallback){
    items = arr(items).slice(0, 5);
    if (!items.length) return `<div class="engine-summary-empty">${esc(fallback || "보강 중입니다.")}</div>`;
    return `<ul class="engine-summary-list">${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }

  function tagHTML(items, fallback){
    items = arr(items).slice(0, 10);
    if (!items.length && fallback) items = [fallback];
    return `<div class="engine-tag-wrap">${items.map(k => `<span class="engine-tag subtle">${esc(k)}</span>`).join("")}</div>`;
  }

  function renderBookSummary(book, ctx, sectionType){
    if (!book) return `<div class="engine-empty">왼쪽에서 도서를 선택하면 요약이 보입니다.</div>`;
    const badge = sectionType === "expansion" ? "확장 참고 도서" : "직접 일치 도서";
    const keywords = arr(book.keywords).slice(0, 10);
    const subjects = arr(book.relatedSubjects).slice(0, 8);
    const majors = arr(book.relatedMajors).slice(0, 8);
    const reasons = arr(book.matchReasons);
    const contentPoints = arr(book.bookContentPoints).length ? arr(book.bookContentPoints) : [book.summary, book.reportUse].filter(Boolean);
    const reportTopics = arr(book.reportExpansionTopics).length ? arr(book.reportExpansionTopics) : arr(book.advancedQuestions);

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
          <div class="engine-summary-section-title">이 책은 어떤 내용인가</div>
          <p class="engine-summary-text">${esc(book.summary || book.reportUse || "도서 요약을 보강 중입니다.")}</p>
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">도서 내용</div>
          ${listHTML(contentPoints, "도서의 핵심 내용을 보강 중입니다.")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">선택 흐름과 연결된 근거</div>
          ${reasons.length ? listHTML(reasons) : `<div class="engine-summary-empty">선택 키워드와 후속 연계축 기준으로 추천되었습니다.</div>`}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">책의 접근 방식 / 형태</div>
          <p class="engine-summary-note">${esc(book.reportUse || "보고서의 근거 자료와 확장 관점으로 활용할 수 있습니다.")}</p>
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">추천 보고서 전개 방식</div>
          ${listHTML(reportTopics, ctx.activityExample || "선택 개념을 도서의 관점으로 해석해 보고서의 근거를 확장할 수 있습니다.")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">이 책의 핵심 키워드</div>
          ${tagHTML(keywords, ctx.keyword || "핵심 키워드")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">연결 가능한 교과 개념</div>
          ${tagHTML([ctx.concept || "선택 개념"].concat(subjects), ctx.concept || "선택 개념")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">관련 교과</div>
          ${tagHTML(subjects, ctx.subject || "선택 과목")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">관련 학과</div>
          ${tagHTML(majors, ctx.career || "선택 학과")}
        </div>
      </div>
    `;
  }

  function renderLoading(message){
    ensureMaster();
    return `<div class="engine-empty">${esc(message || "210권 도서 추천 데이터를 불러오는 중입니다.")}</div>`;
  }

  global.renderBookSelectionHTML = function(ctx){
    ctx = ctx || {};
    if (!ctx.subject || !ctx.career) return `<div class="engine-empty">먼저 과목과 학과를 입력하세요.</div>`;
    if (!ctx.concept || !ctx.keyword) return `<div class="engine-empty">먼저 3번 교과 개념과 추천 키워드를 선택해야 도서 추천이 열립니다.</div>`;
    if (!(ctx.followupAxisId || ctx.linkTrack || ctx.axisLabel)) return `<div class="engine-empty">먼저 4번 후속 연계축을 선택해야 5번 도서 추천이 열립니다.</div>`;
    if (!global.BookRecommendationAdapter) return `<div class="engine-empty">210권 도서 추천 어댑터를 불러오는 중입니다.</div>`;
    if (!master) return renderLoading();

    const payload = buildPayload(ctx);
    const result = global.BookRecommendationAdapter.recommendBooks(payload, master.books, { directLimit: 3, expansionLimit: 5 });
    lastResult = { ctx, payload, result };
    global.__BOOK_210_LAST_RESULT__ = lastResult;

    const direct = result.directBooks || [];
    const expansion = result.expansionBooks || [];
    const all = direct.concat(expansion);
    if (!all.length) return `<div class="engine-empty">현재 선택한 개념·키워드·후속 연계축에 맞는 도서가 아직 충분하지 않습니다. 키워드나 연계축을 바꿔 보세요.</div>`;

    const selected = all.find(book => [bookKey(book), book.title].includes(val(ctx.selectedBook))) || all[0];
    const selectedSection = direct.some(book => bookKey(book) === bookKey(selected)) ? "direct" : "expansion";

    const directHTML = direct.length
      ? direct.map((book, index) => renderBookCard(book, bookKey(book) === bookKey(selected), index, "direct")).join("")
      : `<div class="engine-empty">직접 일치 도서가 부족합니다. 확장 참고 도서를 확인하세요.</div>`;

    const expansionHTML = expansion.length ? `
      <div style="margin-top:18px;">
        <div class="engine-subtitle">확장 참고 도서</div>
        <div class="engine-help">직접 일치 도서보다 우선순위는 낮지만, 보고서의 비교·사회적 의미·확장 관점에 활용할 수 있는 도서입니다.</div>
        ${expansion.map((book, index) => renderBookCard(book, bookKey(book) === bookKey(selected), index, "expansion")).join("")}
      </div>
    ` : "";

    return `
      <div class="engine-book-layout">
        <div class="engine-book-list">
          <div class="engine-subtitle">직접 일치 도서</div>
          <div class="engine-help">3번 선택 개념·추천 키워드·4번 후속 연계축과 직접 연결되는 도서만 먼저 보여줍니다.</div>
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
    return toLegacyBook(findBook(bookId));
  };

  global.getReportOptionMeta = function(ctx){
    const selected = toLegacyBook(findBook(ctx && ctx.selectedBook));
    const modeOptions = DEFAULT_MODE_OPTIONS.slice();
    const viewOptions = uniq([
      ...(selected ? arr(selected.perspectives) : []),
      ...(ctx && ctx.keyword ? [ctx.keyword] : []),
      ...DEFAULT_VIEW_OPTIONS
    ]).slice(0, 8);
    const reportLines = ["기본형", "확장형", "심화형"];
    const recommendedLine = (ctx && ["data", "compare", "application"].includes(ctx.reportMode)) ? "확장형" : "기본형";
    return { selectedBook: selected, modeOptions, viewOptions, reportLines, recommendedLine };
  };

  global.__BOOK_210_GET_LAST_RESULT__ = function(){ return lastResult; };

  // late-override patch:
  // 이 파일은 topic_generator/textbook helper 이후에 로드되어야 하며,
  // 로드 즉시 기존 5번 도서 영역을 210권 브리지 렌더러로 다시 그린다.
  rerenderSoon("bridge-loaded");

  ensureMaster().then(function(){
    rerenderSoon("master-loaded");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      ensureMaster().then(function(){ rerenderSoon("dom-loaded"); });
    });
  } else {
    rerenderSoon("dom-already-ready");
  }
})(typeof window !== "undefined" ? window : globalThis);
