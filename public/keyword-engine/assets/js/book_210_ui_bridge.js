/* book_210_ui_bridge.js
 * 210권 도서 추천 화면 연결 브리지 v9
 * - report-role-engine 결과를 화면과 MINI payload에 연결
 */
(function(global){
  "use strict";
  const BRIDGE_VERSION = "book-210-ui-bridge-v24-hide-internal-book-label";
  global.__BOOK_210_UI_BRIDGE_VERSION__ = BRIDGE_VERSION;
  global.__BOOK_210_BRIDGE_LOADED_AT__ = new Date().toISOString();

  let master = null;
  let rules = null;
  let loading = null;
  let lastResult = null;
  let lastInputCtx = null;

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

  function buildRecommendationKey(ctx){
    ctx = ctx || {};
    return [
      ctx.subject || "",
      ctx.career || ctx.selectedMajor || "",
      ctx.concept || ctx.selectedConcept || "",
      ctx.keyword || ctx.selectedKeyword || "",
      ctx.followupAxisId || "",
      ctx.linkTrack || "",
      ctx.axisLabel || "",
      ctx.axisDomain || "",
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(",") : "",
      ctx.longitudinalPath || ""
    ].map(val).join("||");
  }

  function cloneCtx(ctx){
    const base = ctx || {};
    return {
      ...base,
      linkedSubjects: Array.isArray(base.linkedSubjects) ? base.linkedSubjects.slice() : []
    };
  }

  function getStableRenderContext(selectedBookValue){
    const stateCtx = getStateContext();
    const cached = (lastResult && lastResult.ctx) || lastInputCtx || stateCtx;
    const ctx = cloneCtx(cached);
    ctx.selectedBook = selectedBookValue || stateCtx.selectedBook || ctx.selectedBook || "";
    return ctx;
  }

  function syncSelectedBookFields(value, title){
    const state = global.__TEXTBOOK_HELPER_STATE__;
    if (state) {
      state.selectedBook = value || "";
      state.selectedBookTitle = title || "";
      state.reportMode = "";
      state.reportView = "";
      state.reportLine = "";
    }
    const idEl = document.getElementById("selectedBookId");
    if (idEl) idEl.value = value || "";
    const titleEl = document.getElementById("selectedBookTitle");
    if (titleEl) titleEl.value = title || value || "";
  }

  function renderBookAreaWithStableContext(ctx, reason){
    const el = document.getElementById("engineBookArea");
    if (!el) return false;
    if (!master) {
      ensureEngine().then(()=>renderBookAreaWithStableContext(ctx, reason || "stable-after-master"));
      return false;
    }
    try {
      global.__BOOK_210_IS_RENDERING__ = true;
      lastInputCtx = cloneCtx(ctx);
      el.innerHTML = global.renderBookSelectionHTML(ctx);
      el.setAttribute("data-book-210-render-key", buildRenderKey(ctx));
      global.__BOOK_210_FORCE_RENDERED_AT__ = new Date().toISOString();
      global.__BOOK_210_FORCE_RENDER_REASON__ = reason || "stable-book-selection";
      setTimeout(()=>{ global.__BOOK_210_IS_RENDERING__ = false; }, 120);
      return true;
    } catch(error){
      global.__BOOK_210_IS_RENDERING__ = false;
      console.error("book 210 stable render failed", error);
      return false;
    }
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

  function stripInternalBookLabels(text){
    return val(text)
      .replace(/BOOK[-_ ]?A\d+\s*/gi, "")
      .replace(/book[-_ ]?a\d+\s*/gi, "")
      .replace(/채널\s*용량\s*-\s*/g, "채널 용량 · ")
      .replace(/도서\s*잠금/g, "도서")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function renderBookCard(book, active, index, sectionType){
    const key = bookKey(book);
    const ctx = book.selectedBookContext || {};
    const role = arr(ctx.reportRoleLabels)[0] || (sectionType === "direct" ? "보고서 핵심 근거" : "보고서 확장 참고");
    const reason = stripInternalBookLabels(arr(book.matchReasons).join(" · ") || ctx.recommendationReason || role);
    const preview = stripInternalBookLabels(ctx.recommendationReason || book.summary || book.reportUse || "선택한 흐름에서 보고서 근거로 활용할 수 있습니다.");
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


  const BOOK_DETAIL_OVERRIDES = [
    {
      match: "20세기 수학의 다섯가지 황금률",
      about: [
        "20세기 수학의 주요 흐름을 통해 계산, 알고리즘, 판단, 문제 해결이 어떻게 연결되는지 보여주는 수학 교양서입니다.",
        "수학을 공식 암기나 계산 기술이 아니라 자료를 해석하고 판단 기준을 세우는 사고 체계로 이해하게 해 주는 책입니다.",
        "컴퓨터공학·데이터사이언스 관점에서는 알고리즘적 사고, 데이터 해석, 공정한 판단의 기준을 설명하는 근거로 활용할 수 있습니다."
      ],
      why: [
        "지수·로그 모델이나 데이터 예측을 다룰 때, 수학적 모델이 실제 판단과 예측에 어떤 기준을 제공하는지 설명할 수 있습니다.",
        "자료를 단순 계산값으로 끝내지 않고, 해석·오차·판단의 근거로 연결하는 보고서에 잘 맞습니다.",
        "선택한 개념을 컴퓨터공학의 알고리즘적 사고와 연결해 전공 적합성을 자연스럽게 보여줄 수 있습니다."
      ],
      focus: [
        "수학적 알고리즘이 문제 해결과 데이터 해석에서 어떤 역할을 하는지 확인합니다.",
        "계산 결과를 그대로 믿는 것이 아니라, 어떤 기준으로 판단해야 하는지에 주목합니다.",
        "보고서에서는 선택 개념의 원리 설명 뒤에 자료 해석 기준 또는 모델링 관점으로 연결합니다."
      ],
      keywords: ["계산과 알고리즘", "데이터 해석", "공정한 판단", "수학적 사고력", "문제해결", "모델링", "통계"]
    },
    {
      match: "카오스",
      about: [
        "예측하기 어려운 현상 속에서도 일정한 패턴과 구조를 찾을 수 있다는 관점을 보여주는 과학 교양서입니다.",
        "데이터 예측, 비선형 변화, 복잡계 현상을 설명할 때 단순한 원인-결과 관계만으로는 부족하다는 점을 이해하게 해 줍니다."
      ],
      why: [
        "데이터 예측 보고서에서 예측 가능성과 한계를 함께 논의할 수 있게 해 줍니다.",
        "지수·로그 모델처럼 변화 양상을 다루는 개념을 실제 복잡한 현상 해석으로 확장할 수 있습니다."
      ],
      focus: [
        "작은 조건 차이가 결과 해석에 어떤 영향을 주는지 확인합니다.",
        "모델이 설명할 수 있는 부분과 설명하기 어려운 부분을 구분합니다."
      ],
      keywords: ["카오스", "비선형 변화", "예측 한계", "데이터 패턴", "복잡계", "모델링"]
    },
    {
      match: "팩트풀니스",
      about: [
        "세계에 대한 판단이 통계 자료와 데이터 해석에 따라 어떻게 달라질 수 있는지 보여주는 데이터 리터러시 도서입니다.",
        "숫자와 그래프를 읽을 때 생기는 편향, 오해, 과장된 해석을 점검하는 데 적합합니다."
      ],
      why: [
        "데이터 예측이나 통계 기반 보고서에서 자료 해석의 정확성과 편향 문제를 다룰 수 있습니다.",
        "그래프와 수치를 보고 결론을 내릴 때 필요한 판단 기준을 설명하는 근거로 활용할 수 있습니다."
      ],
      focus: [
        "데이터가 실제보다 과장되거나 왜곡되어 읽히는 지점을 확인합니다.",
        "보고서의 한계와 오차, 판단 편향 논의에 연결합니다."
      ],
      keywords: ["데이터 리터러시", "통계", "편향", "자료 해석", "세계관", "그래프 해석"]
    },
    {
      match: "1984",
      about: [
        "감시와 통제 사회 속에서 개인의 자유, 언어, 진실, 사고가 어떻게 제한될 수 있는지를 보여주는 소설입니다.",
        "컴퓨터·데이터 계열에서는 기술의 원리보다 데이터 감시, 정보 통제, 알고리즘 권력의 사회적 의미를 확장할 때 적합합니다."
      ],
      why: [
        "직접 핵심 도서보다는 데이터 기술의 윤리, 감시사회, 개인정보 문제를 결론이나 한계에서 확장할 때 활용하는 것이 적절합니다.",
        "보고서가 기술 설명으로만 끝나지 않고 사회적 책임과 윤리 문제까지 연결되도록 도와줍니다."
      ],
      focus: [
        "정보와 언어가 통제될 때 개인의 판단이 어떻게 달라지는지 확인합니다.",
        "데이터 수집·분석 기술의 사회적 한계와 윤리 문제로 연결합니다."
      ],
      keywords: ["감시사회", "정보 통제", "개인 자유", "데이터 윤리", "권력", "언어와 사고"]
    },
    {
      match: "미디어의 이해",
      about: [
        "미디어가 단순한 전달 도구가 아니라 인간의 사고방식과 사회 구조를 바꾸는 환경이라는 관점을 제시하는 미디어 이론서입니다.",
        "디지털 플랫폼, 알고리즘 추천, 정보 전달 방식이 사람들의 판단에 미치는 영향을 설명할 때 활용할 수 있습니다."
      ],
      why: [
        "컴퓨터·데이터 보고서에서 기술이 사회적 소통 방식과 판단 구조를 어떻게 바꾸는지 확장할 수 있습니다.",
        "직접 원리 설명보다는 결론의 사회적 의미, 미디어 환경 변화, 플랫폼 영향 분석에 적합합니다."
      ],
      focus: [
        "기술이 정보를 전달하는 방식뿐 아니라 사람의 인식과 행동을 바꾸는 과정을 봅니다.",
        "보고서 결론에서 플랫폼·알고리즘·미디어 환경의 영향으로 확장합니다."
      ],
      keywords: ["미디어 환경", "플랫폼", "정보 전달", "알고리즘 추천", "디지털 사회", "인식 변화"]
    },
    {
      match: "감시와 처벌",
      about: [
        "근대 사회의 감시와 규율 시스템이 개인의 행동과 자유에 어떤 영향을 주는지 분석한 사회철학 고전입니다.",
        "디지털 감시, CCTV, 알고리즘 감시, 플랫폼 규율 문제를 비판적으로 바라보는 데 활용할 수 있습니다."
      ],
      why: [
        "컴퓨터·데이터 계열 보고서에서 기술의 편리성뿐 아니라 감시와 통제의 위험을 논의할 수 있습니다.",
        "확장 참고 도서로 사용하면 결론에서 데이터 기술의 윤리적 한계를 더 설득력 있게 제시할 수 있습니다."
      ],
      focus: [
        "감시가 사람의 행동을 어떻게 바꾸는지 확인합니다.",
        "알고리즘 감시와 플랫폼 사회의 규율 문제로 연결합니다."
      ],
      keywords: ["감시", "규율", "알고리즘 감시", "플랫폼 사회", "자유", "권력"]
    }
    ,
    {
      match: "부분과 전체",
      about: [
        "현대 물리학의 형성과 과학적 세계관의 변화를 다룬 과학 고전입니다.",
        "컴퓨터·데이터 계열에서는 개별 데이터나 신호를 전체 시스템 맥락에서 해석해야 한다는 관점을 설명할 때 활용할 수 있습니다.",
        "신호·용량 해석 축에서는 정보가 단독으로 존재하는 것이 아니라 관측 조건, 시스템 구조, 해석 기준 속에서 의미를 갖는다는 점을 보여주는 근거가 됩니다."
      ],
      why: [
        "신호·용량 해석 보고서에서 입력값 하나보다 시스템 전체 구조와 해석 조건이 중요하다는 관점을 제시할 수 있습니다.",
        "자료나 신호를 단순 수치로만 보지 않고, 측정 조건·관찰자·해석 틀과 연결해 설명할 수 있습니다.",
        "컴퓨터공학과의 정보 처리, 네트워크, 시스템 사고와 자연스럽게 연결됩니다."
      ],
      focus: [
        "부분 정보와 전체 구조의 관계를 어떻게 설명하는지 확인합니다.",
        "관측과 해석 조건이 결과 이해에 어떤 영향을 주는지 봅니다.",
        "보고서에서는 신호나 데이터가 시스템 안에서 어떻게 의미를 갖는지 설명하는 문단에 활용합니다."
      ],
      keywords: ["부분과 전체", "시스템 사고", "정보 해석", "관측 조건", "구조적 이해", "과학적 판단", "신호 해석"]
    },
    {
      match: "객관성의 칼날",
      about: [
        "과학이 객관성을 확보하기 위해 어떤 방법과 기준을 발전시켜 왔는지 설명하는 과학사·과학철학 도서입니다.",
        "데이터와 신호를 해석할 때 측정 기준, 검증 과정, 오류 가능성을 함께 고려해야 한다는 관점을 제공합니다."
      ],
      why: [
        "신호·용량 해석 축에서 측정값과 정보량을 그대로 받아들이지 않고, 어떤 기준으로 검증할지 설명할 수 있습니다.",
        "보고서의 분석 방법, 오차 점검, 객관적 판단 기준을 세우는 데 적합합니다.",
        "컴퓨터공학 보고서에서 알고리즘 결과나 데이터 해석의 신뢰성을 논의할 때 활용할 수 있습니다."
      ],
      focus: [
        "과학적 객관성이 어떤 절차와 기준을 통해 만들어지는지 확인합니다.",
        "데이터 해석에서 오류, 편향, 검증 기준을 어떻게 다룰지 봅니다.",
        "보고서에서는 신호·데이터 분석의 신뢰성 점검 문단에 활용합니다."
      ],
      keywords: ["객관성", "검증 기준", "측정 오류", "데이터 신뢰성", "과학적 방법", "판단 기준", "신호 분석"]
    },
    {
      match: "혼돈으로부터의 질서",
      about: [
        "복잡한 현상 속에서도 질서와 패턴이 어떻게 형성되는지 설명하는 과학 교양서입니다.",
        "변화 모델링과 예측·데이터 해석에서 단순한 선형 관계를 넘어 복잡한 패턴을 이해하는 데 도움을 줍니다."
      ],
      why: [
        "변화 모델링 축에서는 복잡한 변화 속 질서와 패턴을 찾는 관점으로 활용할 수 있습니다.",
        "예측·데이터 해석 축에서는 데이터가 불규칙해 보여도 구조와 경향을 찾는 분석 방향을 제시합니다."
      ],
      focus: [
        "불규칙한 변화 속에서 반복성, 패턴, 질서가 어떻게 드러나는지 확인합니다.",
        "보고서에서는 모델의 설명 가능성과 한계를 함께 정리할 때 활용합니다."
      ],
      keywords: ["복잡계", "질서", "패턴", "비선형 변화", "예측 한계", "모델링", "자료 해석"]
    },
    {
      match: "제3의 물결",
      about: [
        "정보화 사회로의 변화가 산업, 생활, 조직, 의사소통 방식을 어떻게 바꾸는지 설명하는 사회 변화 분석 도서입니다.",
        "컴퓨터·데이터 계열에서는 기술이 사회 구조와 정보 환경을 바꾸는 과정을 확장적으로 설명할 때 활용할 수 있습니다."
      ],
      why: [
        "신호·용량 해석 축에서는 정보 전달 기술이 사회의 소통 방식과 산업 구조를 어떻게 바꾸는지 확장할 수 있습니다.",
        "직접 원리 설명보다는 결론에서 정보사회, 네트워크 사회, 기술 변화의 의미를 논의할 때 적합합니다."
      ],
      focus: [
        "정보 기술이 사회 구조와 생활 방식을 바꾸는 과정을 확인합니다.",
        "보고서 결론에서 기술 원리와 사회 변화의 연결 지점을 정리합니다."
      ],
      keywords: ["정보사회", "기술 변화", "네트워크 사회", "산업 구조", "정보 전달", "사회 변화", "디지털 전환"]
    }

  ];

  function getBookDetailOverride(book){
    const title = val(book && book.title);
    if (!title) return null;
    return BOOK_DETAIL_OVERRIDES.find(item => title === item.match || title.includes(item.match) || item.match.includes(title)) || null;
  }

  const CORE_KEYWORD_STOPWORDS = new Set([
    "duplicate", "existing", "active", "card",
    "대표적", "대표", "도구가", "아니라", "통해", "흐름을", "이해", "단순",
    "다섯가지", "다섯 가지", "선택", "보고서", "활용", "연결", "관점",
    "핵심", "내용", "도서", "제공", "기반", "관련", "보강", "저자", "출판사",
    "공정한", "만남", "수학의", "수학이", "수학적", "철학의", "확률과", "계산",
    "대표적", "분석에", "가능성과", "창의성의", "마지막", "과정의", "의미"
  ]);

  function normalizeKeywordText(v){
    return val(v).replace(/\s+/g, " ").trim();
  }

  function cleanCoreKeywords(book, ctx){
    const override = getBookDetailOverride(book);
    const authorText = normalizeKeywordText(book && book.author).toLowerCase();
    const relatedSubjects = new Set(arr(book && book.relatedSubjects).map(normalizeKeywordText).filter(Boolean));
    const relatedMajors = new Set(arr(book && book.relatedMajors).map(normalizeKeywordText).filter(Boolean));
    const out = arr(override && override.keywords);

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
      if (/^[가-힣]{2,4}(의|이|은|는|을|를|과|와)$/.test(k)) return;
      if (k.length < 2) return;

      out.push(k);
    });

    const contextKeywords = [ctx && ctx.keyword, ctx && ctx.concept, ctx && ctx.subject]
      .map(normalizeKeywordText)
      .filter(k => k && !relatedSubjects.has(k) && !CORE_KEYWORD_STOPWORDS.has(k));

    return uniq(out.concat(contextKeywords)).slice(0, 10);
  }

  function buildStudentContentPoints(book){
    const override = getBookDetailOverride(book);
    if (override && override.about && override.about.length) return override.about;

    const points = [];

    arr(book && book.bookContentPoints).forEach(p => points.push(p));

    const summary = val(book && book.summary);
    if (summary) points.push(summary);

    const reportUse = val(book && book.reportUse);
    if (reportUse && reportUse !== summary) {
      points.push(reportUse.replace(/활용 가능[.]?$/g, "활용할 수 있는 책입니다."));
    }

    return uniq(points).filter(Boolean).slice(0, 3);
  }

  function buildBookWhyItems(book, sc, ctx, sectionType){
    const override = getBookDetailOverride(book);
    if (override && override.why && override.why.length) return override.why;

    const items = [];
    const concept = val(ctx && ctx.concept);
    const keyword = val(ctx && ctx.keyword);
    const axis = val((ctx && (ctx.axisLabel || ctx.followupAxisId || ctx.linkTrack)) || "");
    const title = val(book && book.title);

    if (sectionType === "direct") {
      items.push(`${title}은(는) 선택한 교과 개념을 보고서의 핵심 원리와 분석 기준으로 설명할 때 활용할 수 있습니다.`);
    } else {
      items.push(`${title}은(는) 핵심 원리 설명보다는 보고서의 비교, 한계, 사회적 의미 확장에 활용하기 좋습니다.`);
    }

    if (concept || keyword) {
      items.push(`${concept || "선택 개념"}${keyword ? " · " + keyword : ""} 흐름을 단순 주제 소개가 아니라 근거 있는 탐구 질문으로 바꾸는 데 도움을 줍니다.`);
    }

    if (axis) {
      items.push(`4번 후속 연계축인 ${axis} 방향과 연결해 보고서의 분석 관점을 구체화할 수 있습니다.`);
    }

    return uniq(items).filter(Boolean).slice(0, 3);
  }

  function buildReadingFocusItems(book, sc, ctx){
    const override = getBookDetailOverride(book);
    if (override && override.focus && override.focus.length) return override.focus;

    const items = [];
    const keyword = val(ctx && ctx.keyword);
    const concept = val(ctx && ctx.concept);
    const subjects = arr(book && book.relatedSubjects).slice(0, 3).join("·");

    if (concept) items.push(`책의 내용 중 ${concept}와 연결되는 원리, 사례, 판단 기준을 찾습니다.`);
    if (keyword) items.push(`${keyword}와 관련된 자료 해석, 비교, 모델링 관점이 있는지 확인합니다.`);
    if (subjects) items.push(`${subjects} 교과와 연결되는 부분을 표시해 보고서의 교과 근거로 사용합니다.`);
    if (!items.length) items.push("책의 핵심 주장, 사례, 한계점을 나누어 표시하며 읽습니다.");

    return uniq(items).filter(Boolean).slice(0, 3);
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
    const aboutItems = buildStudentContentPoints(book);
    const whyItems = buildBookWhyItems(book, sc, ctx, sectionType);
    const focusItems = buildReadingFocusItems(book, sc, ctx);
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
          ${listHTML(aboutItems, "책의 핵심 내용을 요약 중입니다.")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">이 책을 왜 쓰는가</div>
          ${listHTML(whyItems, "선택한 탐구 흐름과 연결되는 이유를 정리 중입니다.")}
        </div>

        <div class="engine-summary-section">
          <div class="engine-summary-section-title">읽을 때 확인할 부분</div>
          ${listHTML(focusItems, "보고서에 연결할 핵심 관점을 표시하며 읽습니다.")}
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


  function normalizeLockText(v){
    return val(v).toLowerCase().replace(/[·ㆍ/|,;:()[\]{}<>_\-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function isBookA1Context(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|데이터|정보|통계|알고리즘)/i.test(careerText);
    const isAlgebra = /대수/.test(subjectText);
    const isExpLogUse = /지수함수와\s*로그함수의\s*활용/.test(conceptText);
    const isDataPrediction = /데이터\s*예측/.test(keywordText);
    return !!(isComputer && isAlgebra && isExpLogUse && isDataPrediction);
  }

  function inferBookA1AxisLock(ctx){
    ctx = ctx || {};
    const axisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.axisLabel,
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    if (/(signal\s*capacity\s*interpretation|신호\s*용량|신호|용량|채널|정보량|통신|네트워크)/i.test(axisText)) {
      return "signal_capacity_interpretation";
    }
    if (/(future\s*prediction\s*data|prediction\s*data\s*interpretation|예측\s*데이터\s*해석|데이터\s*해석|자료\s*해석|통계\s*판단|편향\s*점검|예측\s*한계)/i.test(axisText)) {
      return "future_prediction_data";
    }
    if (/(real\s*world\s*change\s*modeling|real\s*life\s*change\s*modeling|실생활\s*변화|변화\s*모델링|생활\s*변화|현상\s*변화|함수\s*변화|변화율)/i.test(axisText)) {
      return "real_world_change_modeling";
    }
    return "";
  }

  function findBookForLock(title, result){
    const t = val(title);
    if (!t) return null;
    const fromResult = arr(result && result.directBooks).concat(arr(result && result.expansionBooks))
      .find(book => val(book && book.title) === t || val(book && book.title).includes(t));
    if (fromResult) return fromResult;
    const books = master && Array.isArray(master.books) ? master.books : [];
    return books.find(book => val(book && book.title) === t || val(book && book.title).includes(t)) || null;
  }

  function buildLockedBookContext(book, ctx, sectionType, axisId){
    const title = val(book && book.title);
    const axisLabelMap = {
      real_world_change_modeling: "실생활 변화 모델링 축",
      signal_capacity_interpretation: "신호·용량 해석 축",
      future_prediction_data: "예측·데이터 해석 축"
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const isDirect = sectionType === "direct";
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) A-1 ${axisLabel}에서 보고서 핵심 근거로 우선 배치한 도서입니다.`
        : `${title}은(는) A-1 ${axisLabel}에서 비교·한계·사회적 의미를 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`A-1 ${axisLabel} 도서 잠금`])),
      reportRole: isDirect ? ["analysisFrame", "conceptExplanation", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? ["자료·모델 해석 프레임", "개념 설명 근거", "한계 논의 근거"] : ["사회적 의미 확장", "비교 관점", "한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? "선택한 지수·로그 개념과 4번 후속축의 핵심 원리를 설명할 때 활용합니다." : "",
        analysisFrame: isDirect ? "자료 변화, 신호 구조, 예측 해석 중 선택 축에 맞는 분석 프레임으로 활용합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 사회·윤리·정보 환경 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "데이터 해석의 한계, 모델의 제약, 판단 편향을 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 정보사회, 기술 윤리, 사회적 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      }
    };
  }

  function cloneBookForA1Lock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    const cloned = {
      ...book,
      matchType: sectionType,
      matchScore: 5000 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`A-1 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서 잠금`])),
      selectedBookContext: buildLockedBookContext(book, ctx, sectionType, axisId),
      bookA1LockRank: rank,
      bookA1AxisLock: axisId
    };
    return cloned;
  }

  function applyBookA1AxisLock(result, ctx){
    if (!result || !isBookA1Context(ctx)) return result;
    const axisId = inferBookA1AxisLock(ctx);
    if (!axisId) return result;

    const directMap = {
      real_world_change_modeling: ["카오스", "20세기 수학의 다섯가지 황금률", "혼돈으로부터의 질서"],
      signal_capacity_interpretation: ["부분과 전체", "20세기 수학의 다섯가지 황금률", "객관성의 칼날"],
      future_prediction_data: ["팩트풀니스", "카오스", "혼돈으로부터의 질서"]
    };
    const expansionMap = {
      real_world_change_modeling: ["팩트풀니스", "객관성의 칼날", "부분과 전체", "미디어의 이해", "1984"],
      signal_capacity_interpretation: ["미디어의 이해", "제3의 물결", "1984", "감시와 처벌", "팩트풀니스"],
      future_prediction_data: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "부분과 전체", "미디어의 이해", "1984"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA1Lock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA1Lock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA1AxisLock: axisId,
        bookA1DirectTitles: directBooks.map(book => book.title),
        bookA1ExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA2SignalContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const axisIdText = normalizeLockText([ctx.followupAxisId, ctx.linkTrack, ctx.axisLabel, ctx.axisDomain].join(" "));
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|데이터|정보|통계|알고리즘)/i.test(careerText);
    const isAlgebra = /대수/.test(subjectText);
    const isExpLogUse = /지수함수와\s*로그함수의\s*활용/.test(conceptText);
    // v95 correction: 실제 3번 추천 키워드 목록에 존재하는 값만 기준으로 잠근다.
    // 현재 A-2의 실제 추천 키워드는 "채널 용량"이다.
    // "신호/정보량/네트워크"처럼 화면에 없는 설명용 표현으로는 A-2 잠금을 실행하지 않는다.
    const isSignalKeyword = /채널\s*용량/i.test(keywordText);
    const isSignalAxis = /(signal\s*capacity\s*interpretation|신호\s*용량\s*해석\s*축|신호\s*용량)/i.test(axisIdText);
    return !!(isComputer && isAlgebra && isExpLogUse && isSignalKeyword && isSignalAxis);
  }

  function buildLockedBookContextA2(book, ctx, sectionType, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabel = "신호·용량 해석 축";
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 정보량·신호 구조·시스템 해석을 설명하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 정보사회·미디어 환경·감시 윤리로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? ["신호·용량 원리 설명", "시스템 해석 프레임", "측정·해석 한계 논의"] : ["정보사회 확장", "미디어·플랫폼 비교", "기술 윤리 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? "채널 용량, 정보량, 신호 해석처럼 선택한 4번 축의 핵심 원리를 설명할 때 활용합니다." : "",
        analysisFrame: isDirect ? "신호가 시스템 안에서 전달·압축·해석되는 구조를 분석하는 프레임으로 활용합니다." : "",
        comparisonFrame: !isDirect ? "정보 전달 기술이 사회와 미디어 환경을 어떻게 바꾸는지 비교할 때 활용합니다." : "",
        limitationDiscussion: "신호·데이터 해석에서 생기는 정보 손실, 오차, 편향, 사회적 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 정보사회, 플랫폼, 감시, 기술 윤리 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA2Rank: rank
    };
  }

  function cloneBookForA2SignalLock(book, ctx, sectionType, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6100 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA2(book, ctx, sectionType, rank),
      bookA2SignalLock: true,
      bookA2SignalLockRank: rank
    };
  }

  function applyBookA2SignalLock(result, ctx){
    if (!result || !isBookA2SignalContext(ctx)) return result;

    const directTitles = ["20세기 수학의 다섯가지 황금률", "부분과 전체", "객관성의 칼날"];
    const expansionTitles = ["미디어의 이해", "제3의 물결", "1984", "감시와 처벌", "팩트풀니스"];

    const directBooks = directTitles.map((title, index) =>
      cloneBookForA2SignalLock(findBookForLock(title, result), ctx, "direct", index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = expansionTitles.map((title, index) =>
      cloneBookForA2SignalLock(findBookForLock(title, result), ctx, "expansion", index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA2SignalLock: true,
        bookA2DirectTitles: directBooks.map(book => book.title),
        bookA2ExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA2ChannelCapacityContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|데이터|정보|통계|알고리즘)/i.test(careerText);
    const isAlgebra = /대수/.test(subjectText);
    const isExpLogUse = /지수함수와\s*로그함수의\s*활용/.test(conceptText);

    // v103: 실제 화면에서는 '채널 용량'뿐 아니라 지수모델/로그모델/성장/감소 등에서도
    // 변화 모델링축·로그 스케일 해석 축·데이터 예측 축이 동일하게 열린다.
    // 기존처럼 '채널 용량'에만 도서 잠금을 걸면 다른 키워드에서 로그/데이터 축이
    // 팩트풀니스·카오스·혼돈 계열로 반복된다.
    // 따라서 대수+컴퓨터공학과+지수함수와 로그함수의 활용의 실제 추천 키워드 전체에
    // 4번 축별 도서 분화 잠금을 적용한다.
    const isExpLogKeyword = /(채널\s*용량|지수모델|로그모델|성장|감소|충전\s*증가|방사성\s*붕괴|별의\s*등급|실생활\s*적용|데이터\s*예측)/i.test(keywordText);
    return !!(isComputer && isAlgebra && isExpLogUse && isExpLogKeyword);
  }

  function inferBookA2ChannelAxis(ctx){
    ctx = ctx || {};
    const axisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel,
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    // 실제 화면 기준: 변화 모델링축 / 로그 스케일 해석 / 데이터 예측
    if (/(로그\s*스케일|로그\s*세케일|log\s*scale|로그\s*구조|역함수\s*해석|scale\s*interpretation)/i.test(axisText)) {
      return "log_scale_interpretation";
    }
    if (/(데이터\s*예측|예측\s*데이터|future\s*prediction|prediction\s*data|자료\s*예측|예측\s*해석)/i.test(axisText)) {
      return "data_prediction";
    }
    if (/(변화\s*모델링|실생활\s*변화|생활\s*변화|현상\s*변화|change\s*modeling|real\s*world\s*change|real\s*life\s*change)/i.test(axisText)) {
      return "change_modeling";
    }
    return "";
  }

  function buildLockedBookContextA2Channel(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      change_modeling: "변화 모델링축",
      log_scale_interpretation: "로그 스케일 해석 축",
      data_prediction: "데이터 예측 축"
    };
    const axisUseMap = {
      change_modeling: {
        direct: "채널 용량을 고정값이 아니라 입력·잡음·환경 변화에 따라 달라지는 모델로 해석하는 근거로 활용합니다.",
        role: ["변화 모델링 근거", "비선형 변화 해석", "모델 한계 논의"]
      },
      log_scale_interpretation: {
        direct: "로그 스케일이 큰 차이를 압축해 비교하게 해 주는 원리를 채널 용량·정보량 해석과 연결할 때 활용합니다.",
        role: ["로그 스케일 원리", "정보량 비교 프레임", "수학적 해석 근거"]
      },
      data_prediction: {
        direct: "자료를 근거로 예측하고 판단할 때 채널 용량·데이터 해석이 어떤 기준을 제공하는지 설명하는 근거로 활용합니다.",
        role: ["데이터 판단 근거", "예측 해석 프레임", "편향·한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.change_modeling;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 채널 용량·정보량 해석을 보고서 핵심 근거로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 사회적 의미·한계·비교 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["사회적 의미 확장", "기술·정보사회 비교", "윤리·한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 채널 용량을 변화·로그 스케일·데이터 예측 중 하나의 분석 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 사회·윤리·미디어 환경 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "채널 용량이나 데이터 해석에서 생기는 정보 손실, 모델 제약, 판단 편향을 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 정보사회, 미디어 환경, 기술 윤리, 사회적 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA2ChannelRank: rank,
      bookA2ChannelAxis: axisId
    };
  }

  function cloneBookForA2ChannelLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 7000 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA2Channel(book, ctx, sectionType, axisId, rank),
      bookA2ChannelLock: true,
      bookA2ChannelLockRank: rank,
      bookA2ChannelAxisLock: axisId
    };
  }

  function applyBookA2ChannelCapacityLock(result, ctx){
    if (!result || !isBookA2ChannelCapacityContext(ctx)) return result;
    const axisId = inferBookA2ChannelAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      change_modeling: ["카오스", "20세기 수학의 다섯가지 황금률", "혼돈으로부터의 질서"],
      log_scale_interpretation: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "객관성의 칼날"],
      // v105: 같은 데이터 예측 축을 반복 클릭할 때 어댑터 기본 점수/이전 캐시가 끼어들며
      // "경영학 콘서트"가 뒤늦게 직접 도서로 올라오는 현상을 막는다.
      // 현재 BOOK-A2 채널 용량 세트에서는 사용자 화면에서 확인된 안정 도서군
      // 팩트풀니스·카오스·혼돈으로부터의 질서를 직접 일치 도서로 고정한다.
      data_prediction: ["팩트풀니스", "카오스", "혼돈으로부터의 질서"]
    };
    const expansionMap = {
      change_modeling: ["팩트풀니스", "객관성의 칼날", "부분과 전체", "미디어의 이해", "1984"],
      log_scale_interpretation: ["카오스", "팩트풀니스", "부분과 전체", "미디어의 이해", "제3의 물결"],
      data_prediction: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "미디어의 이해", "1984", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA2ChannelLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA2ChannelLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA2ChannelCapacityLock: axisId,
        bookA2ChannelDirectTitles: directBooks.map(book => book.title),
        bookA2ChannelExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA3SequenceContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|데이터|정보|통계|알고리즘)/i.test(careerText);
    const isAlgebra = /대수/.test(subjectText);
    const isSequenceConcept = /등차수열과\s*등비수열/.test(conceptText);
    const isSequenceKeyword = /(등차수열|등비수열|일반항|공차|공비|규칙성|반복\s*규칙|패턴|증가\s*규칙|시계열|예측)/i.test(keywordText);
    return !!(isComputer && isAlgebra && isSequenceConcept && isSequenceKeyword);
  }

  function inferBookA3SequenceAxis(ctx){
    ctx = ctx || {};
    const axisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel,
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    if (/(반복\s*구조|알고리즘|sequence\s*algorithm|algorithm\s*loop|loop|반복\s*설계|절차)/i.test(axisText)) {
      return "sequence_algorithm_loop";
    }
    if (/(수열\s*모델링|모델링\s*예측|예측|시계열|trend|prediction|sequence\s*prediction|증가\s*추세)/i.test(axisText)) {
      return "sequence_prediction_model";
    }
    if (/(규칙|패턴|pattern|규칙성|일반항|탐색|search)/i.test(axisText)) {
      return "sequence_pattern_search";
    }
    return "";
  }

  function buildLockedBookContextA3Sequence(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      sequence_prediction_model: "수열 모델링·예측 축",
      sequence_algorithm_loop: "반복 구조·알고리즘 축",
      sequence_pattern_search: "규칙·패턴 탐색 축"
    };
    const axisUseMap = {
      sequence_prediction_model: {
        direct: "등차·등비수열의 일정한 증가 규칙을 시계열 변화, 추세 예측, 데이터 기반 판단과 연결할 때 활용합니다.",
        role: ["수열 모델링 근거", "시계열 예측 프레임", "증가 규칙 한계 논의"]
      },
      sequence_algorithm_loop: {
        direct: "반복되는 규칙을 절차화하고 알고리즘 구조로 해석하는 근거로 활용합니다.",
        role: ["반복 구조 설명", "알고리즘 사고 프레임", "절차화 한계 논의"]
      },
      sequence_pattern_search: {
        direct: "수열의 일반항, 공차·공비, 패턴 탐색을 통해 자료 속 규칙성을 찾아내는 근거로 활용합니다.",
        role: ["규칙성 탐색 근거", "패턴 해석 프레임", "일반화 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.sequence_prediction_model;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 수열의 반복 규칙과 컴퓨터공학적 사고를 보고서 핵심 근거로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 정보사회·의사결정·기술 윤리·비교 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["사회적 의미 확장", "기술·정보사회 비교", "윤리·한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 수열을 예측 모델, 반복 알고리즘, 패턴 탐색 중 하나의 분석 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 사회·기술·의사결정 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "수열 규칙을 현실 데이터나 알고리즘에 적용할 때 생기는 단순화, 예측 오차, 일반화 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 알고리즘 사고, 데이터 기반 의사결정, 정보사회 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA3SequenceRank: rank,
      bookA3SequenceAxis: axisId
    };
  }

  function cloneBookForA3SequenceLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6900 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA3Sequence(book, ctx, sectionType, axisId, rank),
      bookA3SequenceLock: true,
      bookA3SequenceLockRank: rank,
      bookA3SequenceAxisLock: axisId
    };
  }

  function applyBookA3SequenceLock(result, ctx){
    if (!result || !isBookA3SequenceContext(ctx)) return result;
    const axisId = inferBookA3SequenceAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      sequence_prediction_model: ["경영학 콘서트", "팩트풀니스", "20세기 수학의 다섯가지 황금률"],
      sequence_algorithm_loop: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "객관성의 칼날"],
      sequence_pattern_search: ["20세기 수학의 다섯가지 황금률", "카오스", "혼돈으로부터의 질서"]
    };
    const expansionMap = {
      sequence_prediction_model: ["카오스", "객관성의 칼날", "미디어의 이해", "1984", "감시와 처벌"],
      sequence_algorithm_loop: ["부분과 전체", "미디어의 이해", "1984", "제3의 물결", "팩트풀니스"],
      sequence_pattern_search: ["팩트풀니스", "경영학 콘서트", "부분과 전체", "미디어의 이해", "1984"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA3SequenceLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA3SequenceLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA3SequenceLock: axisId,
        bookA3SequenceDirectTitles: directBooks.map(book => book.title),
        bookA3SequenceExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA4InductionContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|데이터|정보|통계|알고리즘|프로그래밍|시스템)/i.test(careerText);
    const isAlgebra = /대수/.test(subjectText);
    const isInductionConcept = /수학적\s*귀납법/.test(conceptText);
    const isInductionKeyword = /(수학적\s*귀납법|명제|자연수|귀납\s*가정|귀납\s*단계|증명|반복\s*논리|재귀|알고리즘\s*정당성|검증)/i.test(keywordText);
    return !!(isComputer && isAlgebra && isInductionConcept && isInductionKeyword);
  }

  function inferBookA4InductionAxis(ctx){
    ctx = ctx || {};
    const axisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel,
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    if (/(재귀|알고리즘\s*정당성|재귀\s*검증|recursive|algorithm\s*validity|algorithm)/i.test(axisText)) {
      return "recursive_algorithm_validity";
    }
    if (/(반복\s*조건|조건\s*검증|조건\s*유지|검증표|iterative|condition\s*validation|validation)/i.test(axisText)) {
      return "iterative_condition_validation";
    }
    if (/(귀납\s*증명|논리\s*구조|수열\s*귀납|수열·귀납|수학적\s*증명|증명\s*구조|일반화|패턴\s*추론|proof|induction)/i.test(axisText)) {
      return "induction_proof_logic";
    }
    return "";
  }

  function buildLockedBookContextA4Induction(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      induction_proof_logic: "귀납 증명·논리 구조 축",
      recursive_algorithm_validity: "재귀·알고리즘 정당성 축",
      iterative_condition_validation: "반복 조건 검증 축"
    };
    const axisUseMap = {
      induction_proof_logic: {
        direct: "수학적 귀납법의 기초 단계, 귀납 가정, 귀납 단계를 구분해 명제가 왜 모든 자연수에서 성립하는지 설명할 때 활용합니다.",
        role: ["귀납 증명 구조", "논리 전개 근거", "증명 한계 논의"]
      },
      recursive_algorithm_validity: {
        direct: "재귀 호출이나 반복 알고리즘이 모든 단계에서 올바르게 작동함을 귀납적 사고로 정당화할 때 활용합니다.",
        role: ["재귀 구조 설명", "알고리즘 정당성", "반복 절차 한계 논의"]
      },
      iterative_condition_validation: {
        direct: "반복 단계마다 조건이 유지되는지 확인하고, 반례 가능성과 검증 기준을 정리할 때 활용합니다.",
        role: ["조건 유지 검증", "반례 점검 프레임", "일반화 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.induction_proof_logic;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 수학적 귀납법의 증명 구조와 컴퓨터공학적 검증 사고를 보고서 핵심 근거로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 과학적 사고, 정보사회, 기술 윤리, 비교 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["사회적 의미 확장", "과학·기술 관점 비교", "윤리·한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 수학적 귀납법을 증명 구조, 재귀 알고리즘 정당성, 반복 조건 검증 중 하나의 분석 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 과학·기술·사회 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "귀납 가정이 성립하는 범위, 반복 조건의 유지 여부, 현실 알고리즘 적용에서 생기는 예외와 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 알고리즘 검증, 과학적 증명 문화, 정보사회 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA4InductionRank: rank,
      bookA4InductionAxis: axisId
    };
  }

  function cloneBookForA4InductionLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6800 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA4Induction(book, ctx, sectionType, axisId, rank),
      bookA4InductionLock: true,
      bookA4InductionLockRank: rank,
      bookA4InductionAxisLock: axisId
    };
  }

  function applyBookA4InductionLock(result, ctx){
    if (!result || !isBookA4InductionContext(ctx)) return result;
    const axisId = inferBookA4InductionAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      induction_proof_logic: ["페르마의 마지막 정리", "20세기 수학의 다섯가지 황금률", "객관성의 칼날"],
      recursive_algorithm_validity: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "객관성의 칼날"],
      iterative_condition_validation: ["객관성의 칼날", "부분과 전체", "과학혁명의 구조"]
    };
    const expansionMap = {
      induction_proof_logic: ["부분과 전체", "과학혁명의 구조", "미디어의 이해", "1984", "팩트풀니스"],
      recursive_algorithm_validity: ["페르마의 마지막 정리", "과학혁명의 구조", "미디어의 이해", "제3의 물결", "1984"],
      iterative_condition_validation: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "팩트풀니스", "미디어의 이해", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA4InductionLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA4InductionLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA4InductionLock: axisId,
        bookA4InductionDirectTitles: directBooks.map(book => book.title),
        bookA4InductionExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA5CombinationContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(careerText);
    const isProbability = /확률과\s*통계/.test(subjectText);
    const isCombinationConcept = /순열과\s*조합/.test(conceptText);
    const isCombinationKeyword = /(순열|조합|경우의\s*수|중복순열|중복조합|배열|선택|경우\s*나누기|탐색|분기)/i.test(keywordText);
    return !!(isComputer && isProbability && isCombinationConcept && isCombinationKeyword);
  }

  function inferBookA5CombinationAxis(ctx){
    ctx = ctx || {};
    const axisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel,
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    // 실제 followup-axis 데이터 기준: 조합·알고리즘 구조 / 탐색·분기 설계 / 경우 비교·전략
    if (/(탐색|분기|search\s*branch|branch\s*design|선택\s*구조|조건\s*분기)/i.test(axisText)) {
      return "search_branch_design";
    }
    if (/(경우\s*비교|전략|strategy|comparison|전략\s*비교|해결\s*전략)/i.test(axisText)) {
      return "case_strategy_comparison";
    }
    if (/(조합|알고리즘\s*구조|combination\s*algorithm|algorithm\s*structure|경우의\s*수|선택.*배열)/i.test(axisText)) {
      return "combination_algorithm_structure";
    }
    return "";
  }

  function buildLockedBookContextA5Combination(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      combination_algorithm_structure: "조합·알고리즘 구조 축",
      search_branch_design: "탐색·분기 설계 축",
      case_strategy_comparison: "경우 비교·전략 축"
    };
    const axisUseMap = {
      combination_algorithm_structure: {
        direct: "순열과 조합의 선택·배열 구조를 알고리즘의 경우 생성, 후보 조합 구성, 탐색 구조로 설명할 때 활용합니다.",
        role: ["조합 구조 설명", "알고리즘 사고 프레임", "경우 생성 한계 논의"]
      },
      search_branch_design: {
        direct: "조건에 따라 경우를 나누고 탐색 경로를 설계하는 과정을 분기 구조와 의사결정 절차로 해석할 때 활용합니다.",
        role: ["탐색 분기 구조", "조건별 선택 프레임", "탐색 비용 한계 논의"]
      },
      case_strategy_comparison: {
        direct: "여러 경우를 비교해 어떤 전략이 더 타당한지 판단하고, 선택 기준과 근거를 보고서에서 설명할 때 활용합니다.",
        role: ["경우 비교 근거", "전략 선택 프레임", "판단 기준 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.combination_algorithm_structure;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 순열·조합의 경우 생성과 컴퓨터공학적 탐색 사고를 보고서 핵심 근거로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 정보사회, 의사결정, 기술 윤리, 비교 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["사회적 의미 확장", "정보사회 비교", "윤리·한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 순열과 조합을 조합 구조, 탐색 분기, 전략 비교 중 하나의 분석 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·의사결정·윤리 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "순열·조합을 현실 문제나 알고리즘 탐색에 적용할 때 생기는 경우 폭증, 계산 비용, 조건 단순화의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 알고리즘 탐색, 데이터 기반 의사결정, 정보사회 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA5CombinationRank: rank,
      bookA5CombinationAxis: axisId
    };
  }

  function cloneBookForA5CombinationLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6700 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA5Combination(book, ctx, sectionType, axisId, rank),
      bookA5CombinationLock: true,
      bookA5CombinationLockRank: rank,
      bookA5CombinationAxisLock: axisId
    };
  }

  function applyBookA5CombinationLock(result, ctx){
    if (!result || !isBookA5CombinationContext(ctx)) return result;
    const axisId = inferBookA5CombinationAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      combination_algorithm_structure: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "방법서설"],
      search_branch_design: ["경영학 콘서트", "20세기 수학의 다섯가지 황금률", "객관성의 칼날"],
      case_strategy_comparison: ["팩트풀니스", "경영학 콘서트", "부분과 전체"]
    };
    const expansionMap = {
      combination_algorithm_structure: ["객관성의 칼날", "신기관", "부분과 전체", "미디어의 이해", "1984"],
      search_branch_design: ["팩트풀니스", "부분과 전체", "제3의 물결", "미디어의 이해", "1984"],
      case_strategy_comparison: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "미디어의 이해", "1984", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA5CombinationLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA5CombinationLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA5CombinationLock: axisId,
        bookA5CombinationDirectTitles: directBooks.map(book => book.title),
        bookA5CombinationExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  global.renderBookSelectionHTML = function(ctx){
    ctx = ctx || {};
    lastInputCtx = cloneCtx(ctx);
    if (!ctx.subject || !ctx.career) return `<div class="engine-empty">먼저 과목과 학과를 입력하세요.</div>`;
    if (!ctx.concept || !ctx.keyword) return `<div class="engine-empty">먼저 3번 교과 개념과 추천 키워드를 선택해야 도서 추천이 열립니다.</div>`;
    if (!(ctx.followupAxisId || ctx.linkTrack || ctx.axisLabel)) return `<div class="engine-empty">먼저 4번 후속 연계축을 선택해야 5번 도서 추천이 열립니다.</div>`;
    if (!global.BookRecommendationAdapter) return `<div class="engine-empty">210권 도서 추천 어댑터를 불러오는 중입니다.</div>`;
    if (!master) {
      ensureEngine().then(()=>forceRenderBookArea("master-loaded"));
      return `<div class="engine-empty">210권 도서 추천 데이터를 불러오는 중입니다.</div>`;
    }

    const payload = buildPayload(ctx);
    const recommendationKey = buildRecommendationKey(ctx);
    let result = null;

    // 도서 선택 클릭은 "선택 도서"만 바꾸는 동작이어야 한다.
    // selectedBook 변경 때 추천 목록을 다시 계산하면, 다른 렌더러/캐시가 개입해
    // A-1 데이터 예측 축의 직접 도서가 부분과 전체·객관성의 칼날 계열로
    // 되돌아가는 현상이 발생할 수 있어, 선택 도서만 바뀐 경우 이전 추천 결과를 재사용한다.
    if (lastResult && lastResult.recommendationKey === recommendationKey && lastResult.result) {
      result = lastResult.result;
    } else {
      result = global.BookRecommendationAdapter.recommendBooks(payload, master.books, { directLimit: 3, expansionLimit: 5 });
    }

    // v93: A-1은 화면에서 4번 세 축이 반드시 다른 직접 일치 도서 3권으로 보여야 한다.
    // 어댑터/캐시/기존 평가 점수가 개입하더라도 UI 최종 단계에서 한 번 더 축별 도서군을 잠근다.
    result = applyBookA1AxisLock(result, ctx);
    result = applyBookA2SignalLock(result, ctx);
    result = applyBookA2ChannelCapacityLock(result, ctx);
    result = applyBookA3SequenceLock(result, ctx);
    result = applyBookA4InductionLock(result, ctx);
    result = applyBookA5CombinationLock(result, ctx);

    lastResult = { ctx: cloneCtx(ctx), payload, result, recommendationKey };
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
    let ctx = getStateContext();
    // v91.1: textbook helper state가 아직 전역에 노출되기 전이거나 비어 있으면,
    // renderBookSelectionHTML에 마지막으로 들어온 정상 context를 사용한다.
    // 첫 번째 4번 축 클릭 때 master 로딩 후 재렌더가 빈 context로 실패하는 문제를 막는다.
    if (!canForceRender(ctx) && lastInputCtx) {
      ctx = cloneCtx(lastInputCtx);
    }
    if (global.__BOOK_210_SUPPRESS_EXTERNAL_BOOK_RERENDER_UNTIL__ && Date.now() < global.__BOOK_210_SUPPRESS_EXTERNAL_BOOK_RERENDER_UNTIL__) {
      ctx = getStableRenderContext(ctx.selectedBook);
    }
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

      syncSelectedBookFields(value, title);

      global.__BOOK_210_LAST_CLICKED_BOOK__ = { value, title, at: new Date().toISOString() };
      global.__BOOK_210_SUPPRESS_EXTERNAL_BOOK_RERENDER_UNTIL__ = Date.now() + 1200;

      const stableCtx = getStableRenderContext(value);
      renderBookAreaWithStableContext(stableCtx, "bridge-book-click-summary-only");
    }, true);
  }


  function isMajorSearchLocked(){
    try {
      const lockUntil = Number(global.__MAJOR_SEARCH_LOCK_UNTIL__ || 0);
      if (lockUntil && Date.now() < lockUntil) return true;
      return !!(global.__MAJOR_SEARCH_IS_TYPING__ || global.__MAJOR_SEARCH_EDITING_LOCK__);
    } catch(e){
      return false;
    }
  }

  function installObserver(){
    if (global.__BOOK_210_BOOK_AREA_OBSERVER__) return;
    try {
      const observer = new MutationObserver(function(){
        if (isMajorSearchLocked()) return;
        if (global.__BOOK_210_IS_RENDERING__) return;
        if (global.__BOOK_210_SUPPRESS_EXTERNAL_BOOK_RERENDER_UNTIL__ && Date.now() < global.__BOOK_210_SUPPRESS_EXTERNAL_BOOK_RERENDER_UNTIL__) return;
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
