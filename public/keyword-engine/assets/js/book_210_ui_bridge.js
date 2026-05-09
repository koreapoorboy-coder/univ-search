/* book_210_ui_bridge.js
 * 210권 도서 추천 화면 연결 브리지 v9
 * - report-role-engine 결과를 화면과 MINI payload에 연결
 */
(function(global){
  "use strict";
  const BRIDGE_VERSION = "book-210-ui-bridge-v35-a25-chemistry-food-book-lock-v155";
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

    // v110: 4번 축명은 activityExample/longitudinalPath보다 우선한다.
    // 기존 v109는 전체 ctx를 한 문자열로 합친 뒤 '탐색/분기'를 먼저 검사해서,
    // 실제 축명이 '조합·알고리즘 구조 축'이어도 설명문 안의 '탐색' 단어 때문에
    // search_branch_design 도서군으로 밀리는 문제가 있었다.
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 followup-axis 데이터 기준: 조합·알고리즘 구조 / 탐색·분기 설계 / 경우 비교·전략
      // '조합·알고리즘 구조' 축 설명에는 탐색이라는 단어가 함께 들어갈 수 있으므로
      // 조합·알고리즘 구조를 탐색·분기보다 먼저 판정한다.
      if (/(조합|알고리즘\s*구조|combination\s*algorithm|algorithm\s*structure|경우의\s*수|선택.*배열)/i.test(text)) {
        return "combination_algorithm_structure";
      }
      if (/(경우\s*비교|전략|strategy|comparison|전략\s*비교|해결\s*전략)/i.test(text)) {
        return "case_strategy_comparison";
      }
      if (/(탐색|분기|search\s*branch|branch\s*design|선택\s*구조|조건\s*분기)/i.test(text)) {
        return "search_branch_design";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
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


  function isBookA6ConditionalProbabilityContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터)/i.test(careerText);
    const isProbability = /확률과\s*통계/.test(subjectText);
    const isConditionalConcept = /조건부\s*확률과\s*사건의\s*독립/.test(conceptText);
    const isConditionalKeyword = /(조건부\s*확률|조건부확률|독립|종속|사건|확률의\s*곱셈정리|기대값|판단|위험|의사결정|베이즈|조건|전환|분류|예측)/i.test(keywordText);
    return !!(isComputer && isProbability && isConditionalConcept && isConditionalKeyword);
  }

  function inferBookA6ConditionalProbabilityAxis(ctx){
    ctx = ctx || {};

    // v113: 실제 followup-axis 데이터 기준으로 재잠금.
    // 조건부확률과 사건의 독립 + 컴퓨터공학과 화면 4번 축은
    // 데이터 분류·예측 판단 / 독립성 검증 / 조건부 판단·리스크 해석 계열이다.
    // 추정 축명(조건부확률 구조, 사건 관계 분석, 확률 논리 모델링)은 사용하지 않는다.
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      if (/(data_classification_prediction_axis|데이터\s*분류|분류\s*[·ㆍ]?\s*예측|예측\s*판단|데이터\s*판단|classification\s*prediction)/i.test(text)) {
        return "data_classification_prediction";
      }
      if (/(independence_validation_axis|독립성\s*검증|독립\s*검증|독립\s*[·ㆍ]?\s*종속|independence\s*validation)/i.test(text)) {
        return "independence_validation";
      }
      if (/(conditional_decision_risk_axis|조건부\s*판단|조건부\s*확률|리스크|위험|의사결정|conditional\s*decision|risk)/i.test(text)) {
        return "conditional_decision_risk";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA6ConditionalProbability(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      data_classification_prediction: "데이터 분류·예측 판단 축",
      independence_validation: "독립성 검증 축",
      conditional_decision_risk: "조건부 판단·리스크 해석 축"
    };
    const axisUseMap = {
      data_classification_prediction: {
        direct: "조건부확률과 독립·종속 개념을 데이터 분류 기준, 추천·예측 판단 구조로 설명할 때 활용합니다.",
        role: ["데이터 분류 기준", "예측 판단 프레임", "조건별 분류 한계 논의"]
      },
      independence_validation: {
        direct: "두 사건이 서로 영향을 주는지 독립성과 종속성 기준으로 검증하고, 판단 오류를 분석할 때 활용합니다.",
        role: ["독립성 검증", "종속 관계 분석", "검증 기준 한계 논의"]
      },
      conditional_decision_risk: {
        direct: "조건이 달라질 때 확률 판단과 리스크 의사결정이 어떻게 달라지는지 비교할 때 활용합니다.",
        role: ["조건부 판단", "리스크 비교", "의사결정 기준 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.data_classification_prediction;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 조건부확률과 사건의 독립을 컴퓨터공학적 판단·분류·예측 구조로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 데이터 판단, 정보사회, 기술 윤리, 의사결정 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "의사결정 비교", "윤리·한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 조건부확률을 데이터 분류·예측 판단, 독립성 검증, 조건부 판단·리스크 해석 중 하나의 분석 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·의사결정·윤리 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "조건부확률을 현실 데이터나 알고리즘 판단에 적용할 때 생기는 조건 누락, 표본 편향, 독립성 가정 오류를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 조건부 판단, 데이터 기반 분류, 알고리즘 의사결정의 사회적 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA6ConditionalProbabilityRank: rank,
      bookA6ConditionalProbabilityAxis: axisId
    };
  }

  function cloneBookForA6ConditionalProbabilityLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6600 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA6ConditionalProbability(book, ctx, sectionType, axisId, rank),
      bookA6ConditionalProbabilityLock: true,
      bookA6ConditionalProbabilityLockRank: rank,
      bookA6ConditionalProbabilityAxisLock: axisId
    };
  }

  function applyBookA6ConditionalProbabilityLock(result, ctx){
    if (!result || !isBookA6ConditionalProbabilityContext(ctx)) return result;
    const axisId = inferBookA6ConditionalProbabilityAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      data_classification_prediction: ["팩트풀니스", "경영학 콘서트", "객관성의 칼날"],
      independence_validation: ["객관성의 칼날", "부분과 전체", "페르마의 마지막 정리"],
      conditional_decision_risk: ["경영학 콘서트", "팩트풀니스", "20세기 수학의 다섯가지 황금률"]
    };
    const expansionMap = {
      data_classification_prediction: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "미디어의 이해", "1984", "감시와 처벌"],
      independence_validation: ["팩트풀니스", "방법서설", "신기관", "미디어의 이해", "1984"],
      conditional_decision_risk: ["객관성의 칼날", "부분과 전체", "제3의 물결", "미디어의 이해", "1984"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA6ConditionalProbabilityLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA6ConditionalProbabilityLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA6ConditionalProbabilityLock: axisId,
        bookA6ConditionalProbabilityDirectTitles: directBooks.map(book => book.title),
        bookA6ConditionalProbabilityExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA7DistributionContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터)/i.test(careerText);
    const isProbability = /확률과\s*통계/.test(subjectText);
    // 실제 3번 화면명 기준: "확률변수와 확률분포". 사용자가 오타로 입력한 "확률변수화"도 방어한다.
    const isDistributionConcept = /(확률변수|확률변수화)\s*와\s*확률분포/.test(conceptText);
    const isDistributionKeyword = /(확률변수|확률분포|기댓값|기대값|분산|표준편차|평균|그래프|분포|예측|데이터|모델링|확률\s*모형|확률모형)/i.test(keywordText);
    return !!(isComputer && isProbability && isDistributionConcept && isDistributionKeyword);
  }

  function inferBookA7DistributionAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // v113: 실제 followup-axis 데이터 기준.
      // 확률변수와 확률분포 + 컴퓨터공학과 화면 4번 축은
      // 데이터 분포·모델링 / 통계 지표 해석 / 데이터 시각화 계열이다.
      if (/(distribution_modeling_axis|데이터\s*분포|분포\s*[·ㆍ]?\s*모델링|분포\s*모델|data\s*distribution|distribution\s*modeling)/i.test(text)) {
        return "data_distribution_modeling";
      }
      if (/(statistical_indicator_interpretation_axis|통계\s*지표|지표\s*해석|기댓값|기대값|분산|표준편차|평균|statistical\s*indicator)/i.test(text)) {
        return "statistical_indicator_interpretation";
      }
      if (/(data_visualization_distribution_axis|데이터\s*시각화|시각화|그래프|분포\s*그래프|visualization|graph)/i.test(text)) {
        return "data_visualization_distribution";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA7Distribution(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      data_distribution_modeling: "데이터 분포·모델링 축",
      statistical_indicator_interpretation: "통계 지표 해석 축",
      data_visualization_distribution: "데이터 시각화 축"
    };
    const axisUseMap = {
      data_distribution_modeling: {
        direct: "확률변수와 확률분포를 데이터 구조화와 모델링의 기초로 설명할 때 활용합니다.",
        role: ["데이터 분포 모델링", "확률변수 구조화", "모델 가정 한계 논의"]
      },
      statistical_indicator_interpretation: {
        direct: "기댓값·분산·표준편차를 데이터의 중심과 변동성을 설명하는 통계 지표로 해석할 때 활용합니다.",
        role: ["통계 지표 해석", "중심·퍼짐 비교", "평균 중심 해석 한계 논의"]
      },
      data_visualization_distribution: {
        direct: "분포를 표와 그래프로 시각화해 패턴, 이상값, 중심과 퍼짐을 비교할 때 활용합니다.",
        role: ["분포 시각화", "그래프 비교", "시각화 해석 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.data_distribution_modeling;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 확률변수와 확률분포를 컴퓨터공학의 데이터 구조화·예측·모델링 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 데이터 판단, 정보사회, 기술 윤리, 의사결정 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "의사결정 비교", "윤리·한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 확률변수와 확률분포를 데이터 분포·모델링, 통계 지표 해석, 데이터 시각화 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·의사결정·윤리 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "확률분포를 현실 데이터나 알고리즘 예측에 적용할 때 생기는 표본 편향, 분포 가정 오류, 평균만 보는 해석의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 확률 기반 예측, 데이터 의사결정, 알고리즘 판단의 사회적 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA7DistributionRank: rank,
      bookA7DistributionAxis: axisId
    };
  }

  function cloneBookForA7DistributionLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6500 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA7Distribution(book, ctx, sectionType, axisId, rank),
      bookA7DistributionLock: true,
      bookA7DistributionLockRank: rank,
      bookA7DistributionAxisLock: axisId
    };
  }

  function applyBookA7DistributionLock(result, ctx){
    if (!result || !isBookA7DistributionContext(ctx)) return result;
    const axisId = inferBookA7DistributionAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      data_distribution_modeling: ["팩트풀니스", "경영학 콘서트", "20세기 수학의 다섯가지 황금률"],
      statistical_indicator_interpretation: ["경영학 콘서트", "팩트풀니스", "객관성의 칼날"],
      data_visualization_distribution: ["팩트풀니스", "객관성의 칼날", "부분과 전체"]
    };
    const expansionMap = {
      data_distribution_modeling: ["카오스", "혼돈으로부터의 질서", "미디어의 이해", "1984", "감시와 처벌"],
      statistical_indicator_interpretation: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "제3의 물결", "미디어의 이해", "1984"],
      data_visualization_distribution: ["경영학 콘서트", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "1984", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA7DistributionLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA7DistributionLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA7DistributionLock: axisId,
        bookA7DistributionDirectTitles: directBooks.map(book => book.title),
        bookA7DistributionExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA8InfoDataAnalysisContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터)/i.test(careerText);
    const isInfo = /^정보$/.test(subjectText) || /정보/.test(subjectText);
    const isDataAnalysisConcept = /자료와\s*정보의\s*분석/.test(conceptText);
    // 실제 정보 과목 데이터 기준 키워드만 사용한다.
    const isDataAnalysisKeyword = /(자료\s*수집|자료\s*분석|비교\s*기준|표|그래프|시각화|데이터베이스|구조화|정렬|탐색|검색|빅데이터|의미\s*있는\s*정보|예측|판단|의사결정|데이터)/i.test(keywordText);
    return !!(isComputer && isInfo && isDataAnalysisConcept && isDataAnalysisKeyword);
  }

  function inferBookA8InfoDataAnalysisAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 정보 과목 followup-axis 기준:
      // 자료와 정보의 분석 → 데이터 수집·시각화 / 데이터베이스·정보구조 / 데이터 해석·의사결정.
      if (/(database|데이터베이스|정보구조|정보\s*구조|구조화|정렬|탐색|검색)/i.test(text)) {
        return "database_information_structure";
      }
      if (/(data_decision|데이터\s*해석|해석\s*[·ㆍ]?\s*의사결정|의사결정|예측|판단|의미\s*있는\s*정보)/i.test(text)) {
        return "data_interpretation_decision";
      }
      if (/(data_visual|데이터\s*수집|수집\s*[·ㆍ]?\s*시각화|시각화|그래프|표|visual|graph)/i.test(text)) {
        return "data_collection_visualization";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA8InfoDataAnalysis(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      data_collection_visualization: "데이터 수집·시각화 축",
      database_information_structure: "데이터베이스·정보구조 축",
      data_interpretation_decision: "데이터 해석·의사결정 축"
    };
    const axisUseMap = {
      data_collection_visualization: {
        direct: "자료를 수집하고 표·그래프로 바꾸어 의미 있는 정보로 해석하는 과정을 설명할 때 활용합니다.",
        role: ["자료 수집·정리", "시각화 해석", "그래프 해석 한계 논의"]
      },
      database_information_structure: {
        direct: "자료를 항목화하고 저장·검색·정렬 가능한 정보 구조로 설계하는 과정을 설명할 때 활용합니다.",
        role: ["정보 구조 설계", "정렬·탐색 기준", "데이터 구조 한계 논의"]
      },
      data_interpretation_decision: {
        direct: "분석한 데이터를 근거로 판단과 선택 기준을 세우는 의사결정 과정을 설명할 때 활용합니다.",
        role: ["데이터 해석", "의사결정 기준", "판단 편향·한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.data_collection_visualization;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 자료와 정보의 분석을 컴퓨터공학의 데이터 처리·구조화·판단 과정으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 정보사회, 데이터 윤리, 기술 활용의 사회적 의미를 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "데이터 윤리 비교", "기술 활용 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 자료와 정보의 분석을 데이터 수집·시각화, 데이터베이스·정보구조, 데이터 해석·의사결정 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·윤리·플랫폼 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "자료 분석 과정에서 생기는 수집 기준의 편향, 구조화 방식의 한계, 시각화·판단 오류를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 데이터 활용의 사회적 책임, 개인정보, 정보 격차, 알고리즘 판단 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA8InfoDataAnalysisRank: rank,
      bookA8InfoDataAnalysisAxis: axisId
    };
  }

  function cloneBookForA8InfoDataAnalysisLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6400 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA8InfoDataAnalysis(book, ctx, sectionType, axisId, rank),
      bookA8InfoDataAnalysisLock: true,
      bookA8InfoDataAnalysisLockRank: rank,
      bookA8InfoDataAnalysisAxisLock: axisId
    };
  }

  function applyBookA8InfoDataAnalysisLock(result, ctx){
    if (!result || !isBookA8InfoDataAnalysisContext(ctx)) return result;
    const axisId = inferBookA8InfoDataAnalysisAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      data_collection_visualization: ["팩트풀니스", "객관성의 칼날", "부분과 전체"],
      database_information_structure: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "객관성의 칼날"],
      data_interpretation_decision: ["경영학 콘서트", "팩트풀니스", "객관성의 칼날"]
    };
    const expansionMap = {
      data_collection_visualization: ["경영학 콘서트", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "1984", "감시와 처벌"],
      database_information_structure: ["페르마의 마지막 정리", "방법서설", "미디어의 이해", "제3의 물결", "1984"],
      data_interpretation_decision: ["부분과 전체", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "1984", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA8InfoDataAnalysisLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA8InfoDataAnalysisLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA8InfoDataAnalysisLock: axisId,
        bookA8InfoDataAnalysisDirectTitles: directBooks.map(book => book.title),
        bookA8InfoDataAnalysisExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA9InfoAlgorithmContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터)/i.test(careerText);
    const isInfo = /^정보$/.test(subjectText) || /정보/.test(subjectText);
    const isAlgorithmConcept = /알고리즘\s*설계와\s*분석/.test(conceptText);
    // 실제 정보 과목 데이터 기준 키워드만 사용한다.
    const isAlgorithmKeyword = /(알고리즘|효율성|성능\s*비교|수행\s*시간|최적화|버블\s*정렬|선택\s*정렬|순차\s*탐색|이진\s*탐색|정렬|탐색|순차|선택|반복|규칙|예측|데이터\s*처리)/i.test(keywordText);
    return !!(isComputer && isInfo && isAlgorithmConcept && isAlgorithmKeyword);
  }

  function inferBookA9InfoAlgorithmAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 정보 과목 followup-axis 기준:
      // 알고리즘 설계와 분석 → 알고리즘 최적화 / 탐색·정렬 구현 / 데이터 처리·예측.
      if (/(search_sort|탐색\s*[·ㆍ]?\s*정렬|탐색|정렬|버블|선택\s*정렬|이진\s*탐색|순차\s*탐색)/i.test(text)) {
        return "search_sort_implementation";
      }
      if (/(data_prediction|데이터\s*처리|처리\s*[·ㆍ]?\s*예측|예측\s*처리|예측|규칙|반복\s*구조)/i.test(text)) {
        return "data_processing_prediction";
      }
      if (/(algo_opt|알고리즘\s*최적화|최적화|효율성|성능\s*비교|수행\s*시간)/i.test(text)) {
        return "algorithm_optimization";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA9InfoAlgorithm(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      algorithm_optimization: "알고리즘 최적화 축",
      search_sort_implementation: "탐색·정렬 구현 축",
      data_processing_prediction: "데이터 처리·예측 축"
    };
    const axisUseMap = {
      algorithm_optimization: {
        direct: "같은 문제를 여러 알고리즘으로 해결했을 때 수행 시간과 효율성이 달라지는 이유를 설명할 때 활용합니다.",
        role: ["알고리즘 효율 비교", "최적화 기준 설정", "성능 비교 한계 논의"]
      },
      search_sort_implementation: {
        direct: "자료를 찾고 정렬하는 절차를 단계별 구현 흐름과 비교 기준으로 설명할 때 활용합니다.",
        role: ["탐색·정렬 절차", "구현 흐름 비교", "탐색 기준 한계 논의"]
      },
      data_processing_prediction: {
        direct: "반복 규칙과 조건 구조를 데이터 처리 및 간단한 예측 절차로 연결해 설명할 때 활용합니다.",
        role: ["데이터 처리 흐름", "예측 기준 설정", "규칙 기반 판단 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.algorithm_optimization;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 알고리즘 설계와 분석을 컴퓨터공학의 효율성·구현·예측 절차로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 알고리즘 활용의 사회적 의미, 정보사회, 기술 윤리 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "알고리즘 윤리 비교", "기술 활용 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 알고리즘 설계와 분석을 알고리즘 최적화, 탐색·정렬 구현, 데이터 처리·예측 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·윤리·플랫폼 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "알고리즘을 현실 문제에 적용할 때 생기는 입력 조건 제한, 계산 비용, 데이터 편향, 성능 지표 단순화의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 알고리즘 효율성과 정보사회, 자동화 의사결정, 기술 윤리 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA9InfoAlgorithmRank: rank,
      bookA9InfoAlgorithmAxis: axisId
    };
  }

  function cloneBookForA9InfoAlgorithmLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6300 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA9InfoAlgorithm(book, ctx, sectionType, axisId, rank),
      bookA9InfoAlgorithmLock: true,
      bookA9InfoAlgorithmLockRank: rank,
      bookA9InfoAlgorithmAxisLock: axisId
    };
  }

  function applyBookA9InfoAlgorithmLock(result, ctx){
    if (!result || !isBookA9InfoAlgorithmContext(ctx)) return result;
    const axisId = inferBookA9InfoAlgorithmAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      algorithm_optimization: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "페르마의 마지막 정리"],
      search_sort_implementation: ["20세기 수학의 다섯가지 황금률", "방법서설", "객관성의 칼날"],
      data_processing_prediction: ["경영학 콘서트", "팩트풀니스", "카오스"]
    };
    const expansionMap = {
      algorithm_optimization: ["부분과 전체", "방법서설", "미디어의 이해", "1984", "제3의 물결"],
      search_sort_implementation: ["페르마의 마지막 정리", "부분과 전체", "미디어의 이해", "1984", "감시와 처벌"],
      data_processing_prediction: ["혼돈으로부터의 질서", "객관성의 칼날", "미디어의 이해", "1984", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA9InfoAlgorithmLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA9InfoAlgorithmLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA9InfoAlgorithmLock: axisId,
        bookA9InfoAlgorithmDirectTitles: directBooks.map(book => book.title),
        bookA9InfoAlgorithmExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA10InfoProgrammingContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|자동화)/i.test(careerText);
    const isInfo = /^정보$/.test(subjectText) || /정보/.test(subjectText);
    const isProgrammingConcept = /프로그래밍\s*과\s*자동화/.test(conceptText);
    // 실제 정보 과목 데이터 기준 키워드만 사용한다.
    const isProgrammingKeyword = /(python|파이썬|프로그래밍|코드|원시\s*코드|변수\s*설계|입력\s*과\s*출력|입력|출력|함수|조건문|반복문|리스트|리스트\s*내포|random\s*모듈|랜덤|turtle\s*그래픽|터틀|자동화|시뮬레이션)/i.test(keywordText);
    return !!(isComputer && isInfo && isProgrammingConcept && isProgrammingKeyword);
  }

  function inferBookA10InfoProgrammingAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 정보 과목 followup-axis 기준:
      // 프로그래밍과 자동화 → 프로그래밍 구현 / 논리·제어 확장 / 자동화·시뮬레이션.
      if (/(logic_control|논리\s*[·ㆍ]?\s*제어|제어\s*확장|조건\s*[·ㆍ]?\s*반복|조건문|반복문|분기|리스트)/i.test(text)) {
        return "logic_control";
      }
      if (/(automation_sim|자동화\s*[·ㆍ]?\s*시뮬레이션|자동화|시뮬레이션|random|랜덤|turtle|터틀|그래픽)/i.test(text)) {
        return "automation_sim";
      }
      if (/(programming_impl|프로그래밍\s*구현|코드\s*구현|python|파이썬|변수|입력|출력|함수|원시\s*코드)/i.test(text)) {
        return "programming_impl";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA10InfoProgramming(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      programming_impl: "프로그래밍 구현 축",
      logic_control: "논리·제어 확장 축",
      automation_sim: "자동화·시뮬레이션 축"
    };
    const axisUseMap = {
      programming_impl: {
        direct: "입력-처리-출력 구조와 변수 설계를 실제 코드 구현 흐름으로 설명할 때 활용합니다.",
        role: ["코드 구현 흐름", "변수·입출력 설계", "구현 조건 한계 논의"]
      },
      logic_control: {
        direct: "조건문과 반복문이 문제 해결 절차를 어떻게 제어하고 분기시키는지 설명할 때 활용합니다.",
        role: ["조건·반복 구조", "제어 흐름 비교", "논리 설계 한계 논의"]
      },
      automation_sim: {
        direct: "반복 작업을 자동화하거나 random·turtle 등을 활용해 간단한 시뮬레이션을 구성하는 과정을 설명할 때 활용합니다.",
        role: ["자동화 절차", "시뮬레이션 설계", "실행 결과 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.programming_impl;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 프로그래밍과 자동화를 컴퓨터공학의 구현·제어·자동화 과정으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 자동화 기술의 사회적 의미, 정보사회, 기술 윤리 관점을 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "자동화 윤리 비교", "기술 활용 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 프로그래밍과 자동화를 프로그래밍 구현, 논리·제어 확장, 자동화·시뮬레이션 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·윤리·플랫폼 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "프로그램을 현실 문제에 적용할 때 생기는 입력 조건 제한, 코드 구조 단순화, 자동화 오류, 실행 결과 해석의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 프로그래밍 자동화와 정보사회, 자동화 의사결정, 기술 윤리 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA10InfoProgrammingRank: rank,
      bookA10InfoProgrammingAxis: axisId
    };
  }

  function cloneBookForA10InfoProgrammingLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6200 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA10InfoProgramming(book, ctx, sectionType, axisId, rank),
      bookA10InfoProgrammingLock: true,
      bookA10InfoProgrammingLockRank: rank,
      bookA10InfoProgrammingAxisLock: axisId
    };
  }

  function applyBookA10InfoProgrammingLock(result, ctx){
    if (!result || !isBookA10InfoProgrammingContext(ctx)) return result;
    const axisId = inferBookA10InfoProgrammingAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      programming_impl: ["20세기 수학의 다섯가지 황금률", "방법서설", "객관성의 칼날"],
      logic_control: ["객관성의 칼날", "20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리"],
      automation_sim: ["경영학 콘서트", "카오스", "혼돈으로부터의 질서"]
    };
    const expansionMap = {
      programming_impl: ["부분과 전체", "미디어의 이해", "1984", "제3의 물결", "감시와 처벌"],
      logic_control: ["부분과 전체", "방법서설", "미디어의 이해", "1984", "감시와 처벌"],
      automation_sim: ["팩트풀니스", "객관성의 칼날", "미디어의 이해", "1984", "제3의 물결"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA10InfoProgrammingLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA10InfoProgrammingLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA10InfoProgrammingLock: axisId,
        bookA10InfoProgrammingDirectTitles: directBooks.map(book => book.title),
        bookA10InfoProgrammingExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA11InfoAbstractionContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|시스템)/i.test(careerText);
    const isInfo = /^정보$/.test(subjectText) || /정보/.test(subjectText);
    const isAbstractionConcept = /추상화\s*와\s*문제\s*분해/.test(conceptText);
    // 실제 정보 과목 데이터 기준 키워드만 사용한다.
    const isAbstractionKeyword = /(문제\s*분해|조건\s*분석|현재\s*상태|목표\s*상태|작은\s*문제|모델링|핵심\s*요소|변수|기준\s*설정|불필요한\s*요소|추상화|구조화|절차|최적화)/i.test(keywordText);
    return !!(isComputer && isInfo && isAbstractionConcept && isAbstractionKeyword);
  }

  function inferBookA11InfoAbstractionAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 정보 과목 followup-axis 기준:
      // 추상화와 문제 분해 → 문제 구조화·알고리즘 설계 / 수리 모델링 확장 / 시스템 설계·절차 최적화.
      if (/(problem_design|문제\s*구조화|알고리즘\s*설계|구조화|문제\s*분해|작은\s*문제|조건\s*분석)/i.test(text)) {
        return "problem_design_algorithm";
      }
      if (/(math_modeling|수리\s*모델링|모델링\s*확장|모델링|변수|핵심\s*요소|추상화)/i.test(text)) {
        return "mathematical_modeling_extension";
      }
      if (/(process_optimization|시스템\s*설계|절차\s*최적화|절차\s*설계|최적화|현재\s*상태|목표\s*상태|불필요한\s*요소)/i.test(text)) {
        return "system_process_optimization";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA11InfoAbstraction(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      problem_design_algorithm: "문제 구조화·알고리즘 설계 축",
      mathematical_modeling_extension: "수리 모델링 확장 축",
      system_process_optimization: "시스템 설계·절차 최적화 축"
    };
    const axisUseMap = {
      problem_design_algorithm: {
        direct: "복잡한 문제를 작은 조건과 절차로 나누고, 이를 알고리즘 설계 흐름으로 정리할 때 활용합니다.",
        role: ["문제 분해 구조", "알고리즘 설계 흐름", "조건 단순화 한계 논의"]
      },
      mathematical_modeling_extension: {
        direct: "현실 문제에서 핵심 요소와 변수를 추출해 수학적 모델로 단순화하는 과정을 설명할 때 활용합니다.",
        role: ["핵심 요소 추출", "수리 모델링", "모델 가정 한계 논의"]
      },
      system_process_optimization: {
        direct: "현재 상태와 목표 상태를 비교해 절차를 설계하고 시스템 흐름을 최적화하는 과정을 설명할 때 활용합니다.",
        role: ["시스템 절차 설계", "최적화 기준 설정", "절차 단순화 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.problem_design_algorithm;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 추상화와 문제 분해를 컴퓨터공학의 구조화·모델링·절차 설계 과정으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 문제 해결 과정의 사회적 의미, 정보사회, 기술 활용의 한계를 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "문제 해결 관점 비교", "기술 활용 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 추상화와 문제 분해를 문제 구조화·알고리즘 설계, 수리 모델링 확장, 시스템 설계·절차 최적화 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·윤리·플랫폼 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "문제를 추상화하고 분해하는 과정에서 생기는 조건 누락, 과도한 단순화, 모델 가정 오류, 절차 최적화의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 문제 해결 자동화, 시스템 설계, 정보사회와 기술 윤리 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA11InfoAbstractionRank: rank,
      bookA11InfoAbstractionAxis: axisId
    };
  }

  function cloneBookForA11InfoAbstractionLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6100 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA11InfoAbstraction(book, ctx, sectionType, axisId, rank),
      bookA11InfoAbstractionLock: true,
      bookA11InfoAbstractionLockRank: rank,
      bookA11InfoAbstractionAxisLock: axisId
    };
  }

  function applyBookA11InfoAbstractionLock(result, ctx){
    if (!result || !isBookA11InfoAbstractionContext(ctx)) return result;
    const axisId = inferBookA11InfoAbstractionAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      problem_design_algorithm: ["20세기 수학의 다섯가지 황금률", "방법서설", "객관성의 칼날"],
      mathematical_modeling_extension: ["20세기 수학의 다섯가지 황금률", "카오스", "부분과 전체"],
      system_process_optimization: ["경영학 콘서트", "부분과 전체", "객관성의 칼날"]
    };
    const expansionMap = {
      problem_design_algorithm: ["페르마의 마지막 정리", "부분과 전체", "미디어의 이해", "1984", "감시와 처벌"],
      mathematical_modeling_extension: ["혼돈으로부터의 질서", "경영학 콘서트", "미디어의 이해", "1984", "제3의 물결"],
      system_process_optimization: ["20세기 수학의 다섯가지 황금률", "방법서설", "미디어의 이해", "1984", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA11InfoAbstractionLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA11InfoAbstractionLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA11InfoAbstractionLock: axisId,
        bookA11InfoAbstractionDirectTitles: directBooks.map(book => book.title),
        bookA11InfoAbstractionExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }



  function isBookA12InfoRepresentationContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|시스템|미디어|통신)/i.test(careerText);
    const isInfo = /^정보$/.test(subjectText) || /정보/.test(subjectText);
    const isRepresentationConcept = /자료\s*와\s*정보\s*의\s*표현/.test(conceptText);
    // 실제 정보 과목 데이터 기준 키워드만 사용한다.
    const isRepresentationKeyword = /(디지털\s*정보|자료\s*표현|부호화|아날로그\s*정보|모스\s*부호|표현\s*방식|데이터\s*변환|저장|전송|압축|용량|표본화|양자화|샘플링|이미지|소리|영상|미디어|문자\s*코드|ASCII|유니코드)/i.test(keywordText);
    return !!(isComputer && isInfo && isRepresentationConcept && isRepresentationKeyword);
  }

  function inferBookA12InfoRepresentationAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 정보 과목 followup-axis 기준:
      // 자료와 정보의 표현 → 디지털 표현·부호화 / 신호·미디어 처리 기초 / 압축·전송 설계.
      if (/(encoding|디지털\s*표현|부호화|자료\s*표현|표현\s*체계|모스\s*부호|문자\s*코드|ASCII|유니코드|아날로그|디지털)/i.test(text)) {
        return "digital_encoding";
      }
      if (/(signal_media|신호|미디어\s*처리|표본화|양자화|샘플링|이미지|소리|영상|미디어)/i.test(text)) {
        return "signal_media_processing";
      }
      if (/(compression_transfer|압축|전송|저장|용량|정보량|전달\s*효율|파일)/i.test(text)) {
        return "compression_transfer_design";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA12InfoRepresentation(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      digital_encoding: "디지털 표현·부호화 축",
      signal_media_processing: "신호·미디어 처리 기초 축",
      compression_transfer_design: "압축·전송 설계 축"
    };
    const axisUseMap = {
      digital_encoding: {
        direct: "아날로그 정보를 약속된 디지털 표현 체계와 부호화 규칙으로 바꾸는 과정을 설명할 때 활용합니다.",
        role: ["디지털 표현 원리", "부호화 규칙 해석", "표현 방식의 한계 논의"]
      },
      signal_media_processing: {
        direct: "이미지·소리·영상 같은 미디어 신호가 디지털 데이터로 바뀌는 과정을 설명할 때 활용합니다.",
        role: ["신호 변환 과정", "미디어 데이터 해석", "표본화·양자화 한계 논의"]
      },
      compression_transfer_design: {
        direct: "정보를 저장·전송하기 위해 용량, 압축, 전달 효율을 비교하는 과정을 설명할 때 활용합니다.",
        role: ["정보량과 용량 비교", "압축·전송 설계", "효율성과 손실 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.digital_encoding;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 자료와 정보의 표현을 컴퓨터공학의 디지털 표현·신호 처리·전송 효율 과정으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 정보 표현 기술의 사회적 의미, 미디어 환경, 디지털 윤리로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "미디어 환경 비교", "디지털 표현 윤리 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 자료와 정보의 표현을 디지털 표현·부호화, 신호·미디어 처리, 압축·전송 설계 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·미디어·보안 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "정보를 표현하고 전송하는 과정에서 생기는 손실, 왜곡, 표현 방식의 선택, 압축 효율과 해석 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 디지털 정보 표현, 미디어 환경, 정보 전달 윤리와 기술 활용 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA12InfoRepresentationRank: rank,
      bookA12InfoRepresentationAxis: axisId
    };
  }

  function cloneBookForA12InfoRepresentationLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6120 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA12InfoRepresentation(book, ctx, sectionType, axisId, rank),
      bookA12InfoRepresentationLock: true,
      bookA12InfoRepresentationLockRank: rank,
      bookA12InfoRepresentationAxisLock: axisId
    };
  }

  function applyBookA12InfoRepresentationLock(result, ctx){
    if (!result || !isBookA12InfoRepresentationContext(ctx)) return result;
    const axisId = inferBookA12InfoRepresentationAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      digital_encoding: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "페르마의 마지막 정리"],
      signal_media_processing: ["미디어의 이해", "부분과 전체", "객관성의 칼날"],
      compression_transfer_design: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "경영학 콘서트"]
    };
    const expansionMap = {
      digital_encoding: ["미디어의 이해", "1984", "감시와 처벌", "제3의 물결", "부분과 전체"],
      signal_media_processing: ["1984", "감시와 처벌", "제3의 물결", "팩트풀니스", "경영학 콘서트"],
      compression_transfer_design: ["미디어의 이해", "1984", "감시와 처벌", "팩트풀니스", "객관성의 칼날"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA12InfoRepresentationLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA12InfoRepresentationLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA12InfoRepresentationLock: axisId,
        bookA12InfoRepresentationDirectTitles: directBooks.map(book => book.title),
        bookA12InfoRepresentationExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }



  function isBookA13InfoSystemNetworkContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|시스템|통신|임베디드|보안)/i.test(careerText);
    const isInfo = /^정보$/.test(subjectText) || /정보/.test(subjectText);
    const isSystemNetworkConcept = /컴퓨팅\s*시스템\s*과\s*네트워크/.test(conceptText);
    // 실제 정보 과목 데이터 기준 키워드만 사용한다.
    const isSystemNetworkKeyword = /(컴퓨팅\s*시스템|운영\s*체제|네트워크|서버|클라이언트|프로토콜|인터넷|ip|주소|보안|계정|접근\s*권한|플랫폼|협업\s*도구|센서|피지컬\s*컴퓨팅|회로|임베디드|장치|입출력\s*장치|마이크로컨트롤러|데이터\s*전송|통신)/i.test(keywordText);
    return !!(isComputer && isInfo && isSystemNetworkConcept && isSystemNetworkKeyword);
  }

  function inferBookA13InfoSystemNetworkAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 정보 과목 followup-axis 기준:
      // 컴퓨팅 시스템과 네트워크 → 시스템·네트워크 구조 / 센서·임베디드 제어 / 협업 플랫폼·보안 운영.
      if (/(network_system|시스템\s*·\s*네트워크|시스템.*네트워크|네트워크\s*구조|서버|클라이언트|프로토콜|통신)/i.test(text)) {
        return "system_network_structure";
      }
      if (/(embedded_control|센서\s*·\s*임베디드|센서.*임베디드|센서\s*제어|피지컬\s*컴퓨팅|회로|임베디드|장치)/i.test(text)) {
        return "sensor_embedded_control";
      }
      if (/(platform_security|협업\s*플랫폼|보안\s*운영|플랫폼.*보안|계정|접근\s*권한|보안|협업\s*도구)/i.test(text)) {
        return "platform_security_operation";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA13InfoSystemNetwork(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      system_network_structure: "시스템·네트워크 구조 축",
      sensor_embedded_control: "센서·임베디드 제어 축",
      platform_security_operation: "협업 플랫폼·보안 운영 축"
    };
    const axisUseMap = {
      system_network_structure: {
        direct: "컴퓨팅 시스템이 여러 구성 요소와 네트워크 연결을 통해 데이터를 주고받는 구조를 설명할 때 활용합니다.",
        role: ["시스템 구성 요소", "네트워크 연결 구조", "데이터 흐름의 한계 논의"]
      },
      sensor_embedded_control: {
        direct: "센서와 임베디드 장치가 입력값을 받아 제어·출력으로 연결되는 과정을 설명할 때 활용합니다.",
        role: ["센서 입력 구조", "임베디드 제어 흐름", "장치 제어 한계 논의"]
      },
      platform_security_operation: {
        direct: "협업 플랫폼과 계정·접근 권한·보안 운영이 정보 시스템의 안정성에 어떤 영향을 주는지 설명할 때 활용합니다.",
        role: ["플랫폼 운영 구조", "접근 권한 관리", "보안·윤리 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.system_network_structure;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 컴퓨팅 시스템과 네트워크를 구조·제어·운영 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 네트워크 사회, 플랫폼 운영, 보안 윤리로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["정보사회 확장", "플랫폼 운영 비교", "보안 윤리 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 컴퓨팅 시스템과 네트워크를 시스템·네트워크 구조, 센서·임베디드 제어, 협업 플랫폼·보안 운영 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·미디어·감시·보안 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "컴퓨팅 시스템과 네트워크가 데이터 흐름, 장치 제어, 접근 권한, 보안 운영에서 갖는 한계와 오류 가능성을 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 네트워크 사회, 플랫폼 운영, 정보 보안, 디지털 윤리 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA13InfoSystemNetworkRank: rank,
      bookA13InfoSystemNetworkAxis: axisId
    };
  }

  function cloneBookForA13InfoSystemNetworkLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6130 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA13InfoSystemNetwork(book, ctx, sectionType, axisId, rank),
      bookA13InfoSystemNetworkLock: true,
      bookA13InfoSystemNetworkLockRank: rank,
      bookA13InfoSystemNetworkAxisLock: axisId
    };
  }

  function applyBookA13InfoSystemNetworkLock(result, ctx){
    if (!result || !isBookA13InfoSystemNetworkContext(ctx)) return result;
    const axisId = inferBookA13InfoSystemNetworkAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      system_network_structure: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"],
      sensor_embedded_control: ["부분과 전체", "카오스", "혼돈으로부터의 질서"],
      platform_security_operation: ["객관성의 칼날", "경영학 콘서트", "미디어의 이해"]
    };
    const expansionMap = {
      system_network_structure: ["미디어의 이해", "1984", "감시와 처벌", "제3의 물결", "경영학 콘서트"],
      sensor_embedded_control: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "미디어의 이해", "1984", "제3의 물결"],
      platform_security_operation: ["1984", "감시와 처벌", "제3의 물결", "부분과 전체", "팩트풀니스"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA13InfoSystemNetworkLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA13InfoSystemNetworkLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA13InfoSystemNetworkLock: axisId,
        bookA13InfoSystemNetworkDirectTitles: directBooks.map(book => book.title),
        bookA13InfoSystemNetworkExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }



  function isBookA14CalculusDerivativeContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|최적화)/i.test(careerText);
    const isCalculus = /^미적분1$|^미적분Ⅰ$|^미적분$/.test(subjectText) || /미적분/.test(subjectText);
    const isDerivativeConcept = /도함수의\s*활용/.test(conceptText);
    // 실제 미적분1 + 컴퓨터공학과 데이터 기준 키워드만 사용한다.
    const isDerivativeKeyword = /(변화율|최적화|극값|접선|증가|감소|최댓값|최솟값|그래프\s*개형|의사결정|도함수|기울기|민감도|예측)/i.test(keywordText);
    return !!(isComputer && isCalculus && isDerivativeConcept && isDerivativeKeyword);
  }

  function inferBookA14CalculusDerivativeAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // 실제 미적분1 followup-axis 데이터 기준:
      // 도함수의 활용 → 변화율·최적화 / 모델 민감도 분석 / 데이터 기반 예측 / 운동 변화율·기계 모델링.
      if (/(motion_rate_mechanics|운동\s*변화율|기계\s*모델링|기계|속도|가속도|운동)/i.test(text)) {
        return "motion_rate_mechanics";
      }
      if (/(optimization_gradient|변화율\s*[·ㆍ]?\s*최적화|변화율.*최적화|최적화|극값|최댓값|최솟값|증가|감소)/i.test(text)) {
        return "rate_optimization";
      }
      if (/(model_sensitivity|모델\s*민감도|민감도|모델.*변화|오차|파라미터|매개변수)/i.test(text)) {
        return "model_sensitivity";
      }
      if (/(data_prediction_rate|데이터\s*기반\s*예측|데이터.*예측|예측|의사결정|추세)/i.test(text)) {
        return "data_based_prediction";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA14CalculusDerivative(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      rate_optimization: "변화율·최적화 축",
      model_sensitivity: "모델 민감도 분석 축",
      data_based_prediction: "데이터 기반 예측 축",
      motion_rate_mechanics: "운동 변화율·기계 모델링 축"
    };
    const axisUseMap = {
      rate_optimization: {
        direct: "도함수의 부호와 극값을 이용해 함수 변화와 최적 조건을 찾는 과정을 설명할 때 활용합니다.",
        role: ["변화율 해석", "최적 조건 설정", "극값 판단 한계 논의"]
      },
      model_sensitivity: {
        direct: "입력값이나 조건이 조금 바뀔 때 모델 결과가 얼마나 달라지는지 변화율 관점으로 설명할 때 활용합니다.",
        role: ["모델 민감도 해석", "조건 변화 비교", "예측 오차 한계 논의"]
      },
      data_based_prediction: {
        direct: "데이터의 변화 흐름을 도함수와 그래프 개형으로 읽고 이후 값을 예측하는 과정을 설명할 때 활용합니다.",
        role: ["데이터 변화 추세", "예측 기준 설정", "의사결정 한계 논의"]
      },
      motion_rate_mechanics: {
        direct: "도함수로 속도·가속도처럼 시간에 따른 운동 변화율을 해석하고 기계 시스템 모델링으로 확장할 때 활용합니다.",
        role: ["운동 변화율 해석", "기계 모델링 연결", "시뮬레이션 한계 논의"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.rate_optimization;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 도함수의 활용을 변화율·최적화·예측 판단 과정으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 데이터 기반 의사결정, 모델링 한계, 기술 활용의 사회적 의미로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["기술사회 확장", "모델링 한계 비교", "데이터 의사결정 윤리 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 도함수의 활용을 변화율·최적화, 모델 민감도 분석, 데이터 기반 예측, 운동 변화율·기계 모델링 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 데이터 윤리·기술사회·의사결정 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "도함수 기반 해석이 실제 데이터와 모델링에서 갖는 오차, 민감도, 조건 변화의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 최적화 알고리즘, 데이터 기반 의사결정, 예측 모델의 책임 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA14CalculusDerivativeRank: rank,
      bookA14CalculusDerivativeAxis: axisId
    };
  }

  function cloneBookForA14CalculusDerivativeLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6140 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA14CalculusDerivative(book, ctx, sectionType, axisId, rank),
      bookA14CalculusDerivativeLock: true,
      bookA14CalculusDerivativeLockRank: rank,
      bookA14CalculusDerivativeAxisLock: axisId
    };
  }

  function applyBookA14CalculusDerivativeLock(result, ctx){
    if (!result || !isBookA14CalculusDerivativeContext(ctx)) return result;
    const axisId = inferBookA14CalculusDerivativeAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      rate_optimization: ["20세기 수학의 다섯가지 황금률", "경영학 콘서트", "객관성의 칼날"],
      model_sensitivity: ["카오스", "혼돈으로부터의 질서", "부분과 전체"],
      data_based_prediction: ["팩트풀니스", "경영학 콘서트", "카오스"],
      motion_rate_mechanics: ["카오스", "혼돈으로부터의 질서", "부분과 전체"]
    };
    const expansionMap = {
      rate_optimization: ["팩트풀니스", "부분과 전체", "방법서설", "미디어의 이해", "1984"],
      model_sensitivity: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "경영학 콘서트", "제3의 물결", "1984"],
      data_based_prediction: ["객관성의 칼날", "부분과 전체", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "감시와 처벌"],
      motion_rate_mechanics: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "경영학 콘서트", "미디어의 이해", "1984"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA14CalculusDerivativeLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA14CalculusDerivativeLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA14CalculusDerivativeLock: axisId,
        bookA14CalculusDerivativeDirectTitles: directBooks.map(book => book.title),
        bookA14CalculusDerivativeExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }



  function isBookA15CalculusFunctionDerivativeContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|최적화|신호)/i.test(careerText);
    const isCalculus = /^미적분1$|^미적분Ⅰ$|^미적분$/.test(subjectText) || /미적분/.test(subjectText);
    const isConcept = /여러\s*가지\s*함수의\s*미분/.test(conceptText);
    const isKeyword = !keywordText || /(도함수|지수함수\s*미분|로그함수\s*미분|삼각함수\s*미분|실수\s*e|자연로그|변화율|표준\s*극한|신호|주기|미분)/i.test(keywordText);
    return !!(isComputer && isCalculus && isConcept && isKeyword);
  }

  function inferBookA15CalculusFunctionDerivativeAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";
      // 실제 미적분1 followup-axis 데이터 기준:
      // 여러 가지 함수의 미분 → 함수 변화율 해석 / 지수·로그 변화 모델링 / 삼각함수·신호 변화.
      if (/(trig_signal_derivative|삼각함수\s*[·ㆍ]?\s*신호|삼각함수.*신호|신호\s*[·ㆍ]?\s*주기|신호|주기|진동|파형|삼각함수)/i.test(text)) {
        return "trig_signal_change";
      }
      if (/(exponential_log_derivative|지수\s*[·ㆍ]?\s*로그\s*변화|지수.*로그.*모델링|지수함수|로그함수|자연로그|실수\s*e|e\^|log)/i.test(text)) {
        return "exp_log_change_model";
      }
      if (/(function_derivative_rate|함수\s*변화율|변화율\s*해석|도함수|미분계수|기울기|함수.*변화)/i.test(text)) {
        return "function_rate_interpretation";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA15CalculusFunctionDerivative(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      function_rate_interpretation: "함수 변화율 해석 축",
      exp_log_change_model: "지수·로그 변화 모델링 축",
      trig_signal_change: "삼각함수·신호 변화 축"
    };
    const axisUseMap = {
      function_rate_interpretation: {
        direct: "여러 함수의 도함수를 이용해 입력 변화에 따른 출력 변화율을 해석하고 그래프 변화 구조를 설명할 때 활용합니다.",
        role: ["함수 변화율 해석", "그래프 변화 구조", "미분 모델 한계 논의"]
      },
      exp_log_change_model: {
        direct: "지수함수와 로그함수의 미분을 이용해 증가·감소 속도, 스케일 변환, 모델 변화 구조를 설명할 때 활용합니다.",
        role: ["지수·로그 변화 모델", "스케일 변환 해석", "모델 민감도 논의"]
      },
      trig_signal_change: {
        direct: "삼각함수 미분을 주기·진동·신호 변화 해석과 연결해 컴퓨터공학의 신호 처리 기초로 확장할 때 활용합니다.",
        role: ["주기 변화 해석", "신호 변화 연결", "미디어·데이터 처리 확장"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.function_rate_interpretation;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 여러 가지 함수의 미분을 변화율·모델링·신호 해석 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 기술사회, 데이터 해석, 정보 전달의 의미로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["기술사회 확장", "데이터 해석 비교", "정보 전달 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 여러 가지 함수의 미분을 함수 변화율 해석, 지수·로그 변화 모델링, 삼각함수·신호 변화 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·미디어·데이터 해석 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "미분 기반 모델이 실제 데이터·신호·변화 현상에서 갖는 오차와 해석 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 신호 처리, 데이터 모델링, 정보 전달과 기술 활용의 사회적 의미로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA15CalculusFunctionDerivativeRank: rank,
      bookA15CalculusFunctionDerivativeAxis: axisId
    };
  }

  function cloneBookForA15CalculusFunctionDerivativeLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6150 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA15CalculusFunctionDerivative(book, ctx, sectionType, axisId, rank),
      bookA15CalculusFunctionDerivativeLock: true,
      bookA15CalculusFunctionDerivativeLockRank: rank,
      bookA15CalculusFunctionDerivativeAxisLock: axisId
    };
  }

  function applyBookA15CalculusFunctionDerivativeLock(result, ctx){
    if (!result || !isBookA15CalculusFunctionDerivativeContext(ctx)) return result;
    const axisId = inferBookA15CalculusFunctionDerivativeAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      function_rate_interpretation: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "경영학 콘서트"],
      exp_log_change_model: ["20세기 수학의 다섯가지 황금률", "카오스", "혼돈으로부터의 질서"],
      trig_signal_change: ["미디어의 이해", "부분과 전체", "카오스"]
    };
    const expansionMap = {
      function_rate_interpretation: ["팩트풀니스", "부분과 전체", "방법서설", "1984", "미디어의 이해"],
      exp_log_change_model: ["객관성의 칼날", "경영학 콘서트", "부분과 전체", "미디어의 이해", "제3의 물결"],
      trig_signal_change: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "1984", "제3의 물결", "감시와 처벌"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA15CalculusFunctionDerivativeLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA15CalculusFunctionDerivativeLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA15CalculusFunctionDerivativeLock: axisId,
        bookA15CalculusFunctionDerivativeDirectTitles: directBooks.map(book => book.title),
        bookA15CalculusFunctionDerivativeExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA16CalculusSequenceLimitContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|수렴|반복)/i.test(careerText);
    const isCalculus = /^미적분1$|^미적분Ⅰ$|^미적분$/.test(subjectText) || /미적분/.test(subjectText);
    const isConcept = /수열의\s*극한/.test(conceptText);
    const isKeyword = !keywordText || /(수열|극한|수렴|발산|반복|장기\s*변화|등비수열|수렴\s*판정|안정성|알고리즘)/i.test(keywordText);
    return !!(isComputer && isCalculus && isConcept && isKeyword);
  }

  function inferBookA16CalculusSequenceLimitAxis(ctx){
    ctx = ctx || {};
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";
      // 실제 미적분1 followup-axis 데이터 기준:
      // 수열의 극한 → 수렴·장기 예측 / 반복·알고리즘 수렴.
      if (/(iterative_algorithm|반복\s*[·ㆍ]?\s*알고리즘\s*수렴|반복.*알고리즘|알고리즘\s*수렴|반복\s*수렴|반복|알고리즘)/i.test(text)) {
        return "iterative_algorithm_convergence";
      }
      if (/(sequence_convergence_prediction|수렴\s*[·ㆍ]?\s*장기\s*예측|수렴.*예측|장기\s*예측|수렴|발산|장기\s*변화)/i.test(text)) {
        return "sequence_long_term_prediction";
      }
      return "";
    };

    return resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
  }

  function buildLockedBookContextA16CalculusSequenceLimit(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      sequence_long_term_prediction: "수렴·장기 예측 축",
      iterative_algorithm_convergence: "반복·알고리즘 수렴 축"
    };
    const axisUseMap = {
      sequence_long_term_prediction: {
        direct: "수열의 수렴과 발산을 장기 변화, 안정화 과정, 예측 모델의 한계와 연결해 설명할 때 활용합니다.",
        role: ["수렴·발산 해석", "장기 변화 예측", "모델 안정성 논의"]
      },
      iterative_algorithm_convergence: {
        direct: "반복 계산이 특정 값으로 가까워지는 과정을 알고리즘 수렴과 절차 안정성 관점으로 설명할 때 활용합니다.",
        role: ["반복 구조 해석", "알고리즘 수렴", "절차 안정성 검토"]
      }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.sequence_long_term_prediction;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 수열의 극한을 장기 변화·반복 알고리즘·수렴 판단 과정으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 데이터 예측, 알고리즘 판단, 기술 활용의 한계로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["기술사회 확장", "예측 모델 비교", "알고리즘 판단 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 수열의 극한을 수렴·장기 예측 또는 반복·알고리즘 수렴 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 데이터 예측·알고리즘 판단·사회적 활용 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "수열의 극한과 반복 알고리즘이 실제 예측·계산 과정에서 갖는 수렴 조건과 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 장기 예측, 알고리즘 안정성, 데이터 기반 의사결정의 책임 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA16CalculusSequenceLimitRank: rank,
      bookA16CalculusSequenceLimitAxis: axisId
    };
  }

  function cloneBookForA16CalculusSequenceLimitLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6160 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA16CalculusSequenceLimit(book, ctx, sectionType, axisId, rank),
      bookA16CalculusSequenceLimitLock: true,
      bookA16CalculusSequenceLimitLockRank: rank,
      bookA16CalculusSequenceLimitAxisLock: axisId
    };
  }

  function applyBookA16CalculusSequenceLimitLock(result, ctx){
    if (!result || !isBookA16CalculusSequenceLimitContext(ctx)) return result;
    const axisId = inferBookA16CalculusSequenceLimitAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      sequence_long_term_prediction: ["팩트풀니스", "경영학 콘서트", "카오스"],
      iterative_algorithm_convergence: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "객관성의 칼날"]
    };
    const expansionMap = {
      sequence_long_term_prediction: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "부분과 전체", "미디어의 이해", "1984"],
      iterative_algorithm_convergence: ["부분과 전체", "방법서설", "카오스", "경영학 콘서트", "팩트풀니스"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA16CalculusSequenceLimitLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA16CalculusSequenceLimitLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA16CalculusSequenceLimitLock: axisId,
        bookA16CalculusSequenceLimitDirectTitles: directBooks.map(book => book.title),
        bookA16CalculusSequenceLimitExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }




  function isBookA17GeometryComputerContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|데이터|그래픽|그래픽스|공간정보|비전|자율주행)/i.test(careerText);
    const isGeometry = /^기하$|고등\s*기하/.test(subjectText) || /기하/.test(subjectText);
    const isConcept = /(벡터의\s*성분과\s*내적|공간좌표와\s*구의\s*방정식|이차곡선과\s*자취\s*해석)/.test(conceptText);
    const isKeyword = !keywordText || /(내적|성분|좌표|벡터|크기|각|방향\s*유사도|코사인\s*유사도|투영|정규화|거리|공간좌표|3차원|구의\s*방정식|중심|반지름|위치\s*추적|충돌\s*판정|그래픽스|공간\s*데이터|쌍곡선|위치\s*추정|신호|포물선|타원|초점|자취|반사\s*성질|궤도)/i.test(keywordText);
    return !!(isComputer && isGeometry && isConcept && isKeyword);
  }

  function inferBookA17GeometryAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");

    // v126 A18 geometry axis active-lock:
    // 일부 환경에서는 4번 축 버튼을 눌러도 book bridge ctx에 axisLabel이 늦게 들어와
    // 벡터 개념의 첫 축(vector_similarity_model)으로 계속 fallback되는 문제가 있었다.
    // 따라서 도서 추천을 만들 때 현재 화면에서 active 된 4번 카드의 data-track/title을 최우선으로 읽는다.
    const getVisibleActiveGeometryAxisText = function(){
      const parts = [];
      const push = function(value){
        const text = normalizeLockText(value || "");
        if (!text) return;
        if (/입력 전|선택 전|대기|찾지 못했|추천|도서 선택/.test(text)) return;
        parts.push(text);
      };
      try {
        const nodes = document.querySelectorAll(
          ".engine-track-card.is-active, .engine-track-card[aria-pressed='true'], .engine-track-card.selected, [data-track].is-active"
        );
        nodes.forEach(function(node){
          push(node.getAttribute("data-track"));
          push(node.getAttribute("data-axis"));
          push(node.getAttribute("data-axis-id"));
          push(node.querySelector && node.querySelector(".engine-track-title") ? node.querySelector(".engine-track-title").textContent : "");
          push(node.querySelector && node.querySelector(".engine-track-short") ? node.querySelector(".engine-track-short").textContent : "");
          push(node.textContent || "");
        });
      } catch (error) {}
      return parts.join(" ");
    };

    const visibleAxisText = normalizeLockText(getVisibleActiveGeometryAxisText());
    const primaryAxisText = normalizeLockText([
      visibleAxisText,
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));

    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));

    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";

      // concept-specific axis labels first to avoid generic words like 그래픽스 / 거리 / 자취 being over-matched.
      // 벡터의 성분과 내적
      if (/(vector_similarity_model_axis|벡터\s*[·ㆍ]?\s*유사도\s*모델링|벡터.*유사도|코사인\s*유사도|정규화|방향\s*유사도)/i.test(text)) return "vector_similarity_model";
      if (/(graphics_vector_axis|그래픽\s*[·ㆍ]?\s*물리\s*벡터|그래픽.*벡터|물리\s*벡터)/i.test(text)) return "graphics_physics_vector";
      if (/(projection_space_calc_axis|투영\s*[·ㆍ]?\s*공간\s*계산|투영.*공간|공간\s*계산|투영)/i.test(text)) return "projection_space_calculation";

      // 공간좌표와 구의 방정식
      if (/(three_d_coordinate_graphics_axis|3차원\s*좌표\s*[·ㆍ]?\s*그래픽스|3차원.*그래픽|3d\s*좌표)/i.test(text)) return "three_d_coordinate_graphics";
      if (/(sensor_collision_range_axis|sensor_range_collision_axis|센서\s*범위\s*[·ㆍ]?\s*충돌\s*판정|센서.*충돌|충돌\s*판정|범위\s*충돌)/i.test(text)) return "sensor_range_collision";
      if (/(location_space_data_axis|position_tracking_axis|위치\s*추적\s*[·ㆍ]?\s*공간\s*데이터|위치.*공간\s*데이터|위치\s*추적|공간\s*데이터)/i.test(text)) return "location_tracking_space_data";

      // 이차곡선과 자취 해석 - actual on-screen axis labels
      if (/(conic_structure_analysis_axis|이차곡선\s*구조\s*해석|이차곡선\s*구조)/i.test(text)) return "conic_structure_analysis";
      if (/(locus_condition_analysis_axis|자취\s*[·ㆍ]?\s*조건\s*분석|자취.*조건\s*분석)/i.test(text)) return "locus_condition_analysis";
      if (/(coordinate_geometry_modeling_axis|좌표기하\s*모델링|좌표기하)/i.test(text)) return "coordinate_geometry_modeling";

      // legacy fallback labels for earlier variants
      if (/(signal_position_model_axis|signal_location_model_axis|신호\s*[·ㆍ]?\s*위치\s*추정\s*모델|신호.*위치\s*추정|위치\s*추정|쌍곡선)/i.test(text)) return "conic_structure_analysis";
      if (/(reflection_orbit_axis|반사\s*[·ㆍ]?\s*궤도\s*해석|반사.*궤도|반사\s*성질|궤도|초점)/i.test(text)) return "locus_condition_analysis";
      if (/(curve_design_visualization_axis|curve_design_visual_axis|곡선\s*[·ㆍ]?\s*설계\s*시각화|곡선.*시각화|설계\s*시각화)/i.test(text)) return "coordinate_geometry_modeling";

      // final generic fallback uses concept text only if axis-specific label is absent.
      return "";
    };

    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    // 축 정보가 늦게 들어오는 초기 렌더에서도 개념별 첫 축으로 안전하게 고정한다.
    if (/벡터의\s*성분과\s*내적/.test(conceptText)) return "vector_similarity_model";
    if (/공간좌표와\s*구의\s*방정식/.test(conceptText)) return "three_d_coordinate_graphics";
    if (/이차곡선과\s*자취\s*해석/.test(conceptText)) return "conic_structure_analysis";
    return "";
  }

  function buildLockedBookContextA17Geometry(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      vector_similarity_model: "벡터·유사도 모델링 축",
      graphics_physics_vector: "그래픽·물리 벡터 해석 축",
      projection_space_calculation: "투영·공간 계산 축",
      three_d_coordinate_graphics: "3차원 좌표·그래픽스 축",
      sensor_range_collision: "센서 범위·충돌 판정 축",
      location_tracking_space_data: "위치 추적·공간 데이터 축",
      conic_structure_analysis: "이차곡선 구조 해석 축",
      locus_condition_analysis: "자취·조건 분석 축",
      coordinate_geometry_modeling: "좌표기하 모델링 축",
      signal_position_estimation: "이차곡선 구조 해석 축",
      reflection_orbit_analysis: "자취·조건 분석 축",
      curve_design_visualization: "좌표기하 모델링 축"
    };
    const axisUseMap = {
      vector_similarity_model: { direct: "벡터의 성분과 내적을 데이터의 방향 유사도, 코사인 유사도, 정규화 개념과 연결해 설명할 때 활용합니다.", role: ["벡터 유사도", "데이터 모델링", "정규화 해석"] },
      graphics_physics_vector: { direct: "벡터의 크기와 방향을 그래픽스·물리량 해석으로 연결해 물체 이동, 조명 방향, 힘의 합성을 설명할 때 활용합니다.", role: ["그래픽 벡터", "방향·크기 해석", "물리량 연결"] },
      projection_space_calculation: { direct: "내적과 투영을 이용해 거리, 방향 성분, 공간 계산 과정을 수학적으로 설명할 때 활용합니다.", role: ["투영 계산", "거리 해석", "공간 계산"] },
      three_d_coordinate_graphics: { direct: "공간좌표와 구의 방정식을 3차원 좌표계, 그래픽스, 객체 위치 표현의 기초로 설명할 때 활용합니다.", role: ["3차원 좌표", "그래픽스 기초", "공간 표현"] },
      sensor_range_collision: { direct: "구의 중심과 반지름을 센서 범위, 충돌 판정, 객체 간 거리 조건으로 해석할 때 활용합니다.", role: ["센서 범위", "충돌 판정", "거리 조건"] },
      location_tracking_space_data: { direct: "공간 좌표 자료를 위치 추적, 공간 데이터, 이동 경로 분석과 연결해 설명할 때 활용합니다.", role: ["위치 추적", "공간 데이터", "경로 분석"] },
      conic_structure_analysis: { direct: "포물선·타원·쌍곡선의 정의와 방정식을 구조적으로 해석해 초점, 거리 조건, 곡선의 성질을 설명할 때 활용합니다.", role: ["이차곡선 구조", "방정식 해석", "거리 조건"] },
      locus_condition_analysis: { direct: "점이 만족하는 조건을 자취와 방정식으로 바꾸어 해석하고, 조건 변화에 따른 도형 이동을 설명할 때 활용합니다.", role: ["자취 분석", "조건 해석", "방정식 변환"] },
      coordinate_geometry_modeling: { direct: "도형의 위치와 조건을 좌표와 방정식으로 모델링해 그래프 표현, 설계, 시각화와 연결할 때 활용합니다.", role: ["좌표 모델링", "그래프 연결", "도형 표현"] },
      signal_position_estimation: { direct: "포물선·타원·쌍곡선의 정의와 방정식을 구조적으로 해석해 초점, 거리 조건, 곡선의 성질을 설명할 때 활용합니다.", role: ["이차곡선 구조", "방정식 해석", "거리 조건"] },
      reflection_orbit_analysis: { direct: "점이 만족하는 조건을 자취와 방정식으로 바꾸어 해석하고, 조건 변화에 따른 도형 이동을 설명할 때 활용합니다.", role: ["자취 분석", "조건 해석", "방정식 변환"] },
      curve_design_visualization: { direct: "도형의 위치와 조건을 좌표와 방정식으로 모델링해 그래프 표현, 설계, 시각화와 연결할 때 활용합니다.", role: ["좌표 모델링", "그래프 연결", "도형 표현"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.vector_similarity_model;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 기하 개념을 컴퓨터공학의 데이터·그래픽스·공간 모델링 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 시각화, 기술사회, 시스템 설계의 의미로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["기술사회 확장", "시각화 관점 비교", "모델링 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 기하 개념을 벡터 유사도, 3차원 좌표, 충돌 판정, 위치 추정, 그래픽 시각화 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·시각화·시스템 설계 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "기하 기반 모델이 실제 데이터·그래픽스·공간 정보 처리에서 갖는 오차, 단순화, 조건 설정의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 컴퓨터 그래픽스, 공간 데이터, 센서 시스템, 위치 추정 기술의 활용 방향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA17GeometryRank: rank,
      bookA17GeometryAxis: axisId
    };
  }

  function cloneBookForA17GeometryLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6170 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA17Geometry(book, ctx, sectionType, axisId, rank),
      bookA17GeometryLock: true,
      bookA17GeometryLockRank: rank,
      bookA17GeometryAxisLock: axisId
    };
  }

  function applyBookA17GeometryLock(result, ctx){
    if (!result || !isBookA17GeometryComputerContext(ctx)) return result;
    const axisId = inferBookA17GeometryAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      vector_similarity_model: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "부분과 전체"],
      graphics_physics_vector: ["부분과 전체", "카오스", "객관성의 칼날"],
      projection_space_calculation: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "객관성의 칼날"],
      three_d_coordinate_graphics: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "객관성의 칼날"],
      sensor_range_collision: ["객관성의 칼날", "부분과 전체", "카오스"],
      location_tracking_space_data: ["경영학 콘서트", "팩트풀니스", "객관성의 칼날"],
      conic_structure_analysis: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "객관성의 칼날"],
      locus_condition_analysis: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "페르마의 마지막 정리"],
      coordinate_geometry_modeling: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "객관성의 칼날"],
      signal_position_estimation: ["20세기 수학의 다섯가지 황금률", "페르마의 마지막 정리", "객관성의 칼날"],
      reflection_orbit_analysis: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "페르마의 마지막 정리"],
      curve_design_visualization: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "객관성의 칼날"]
    };
    const expansionMap = {
      vector_similarity_model: ["팩트풀니스", "부분과 전체", "미디어의 이해", "1984", "제3의 물결"],
      graphics_physics_vector: ["객관성의 칼날", "미디어의 이해", "혼돈으로부터의 질서", "경영학 콘서트", "1984"],
      projection_space_calculation: ["부분과 전체", "방법서설", "카오스", "경영학 콘서트", "미디어의 이해"],
      three_d_coordinate_graphics: ["미디어의 이해", "경영학 콘서트", "카오스", "1984", "제3의 물결"],
      sensor_range_collision: ["혼돈으로부터의 질서", "경영학 콘서트", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "1984"],
      location_tracking_space_data: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "미디어의 이해", "1984", "감시와 처벌"],
      conic_structure_analysis: ["부분과 전체", "미디어의 이해", "경영학 콘서트", "1984", "제3의 물결"],
      locus_condition_analysis: ["부분과 전체", "방법서설", "미디어의 이해", "경영학 콘서트", "1984"],
      coordinate_geometry_modeling: ["미디어의 이해", "경영학 콘서트", "카오스", "1984", "제3의 물결"],
      signal_position_estimation: ["부분과 전체", "미디어의 이해", "경영학 콘서트", "1984", "제3의 물결"],
      reflection_orbit_analysis: ["부분과 전체", "방법서설", "미디어의 이해", "경영학 콘서트", "1984"],
      curve_design_visualization: ["미디어의 이해", "경영학 콘서트", "카오스", "1984", "제3의 물결"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA17GeometryLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA17GeometryLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA17GeometryLock: axisId,
        bookA17GeometryDirectTitles: directBooks.map(book => book.title),
        bookA17GeometryExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  function isBookA18PhysicsComputerContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    const subjectText = normalizeLockText(ctx.subject || "");
    const conceptText = normalizeLockText(ctx.concept || "");
    const keywordText = normalizeLockText(ctx.keyword || "");
    const isComputer = /(컴퓨터|소프트웨어|인공지능|ai|데이터|정보|보안|프로그래밍|알고리즘|네트워크|통신|임베디드|센서|그래픽|그래픽스|시뮬레이션|제어|반도체|전자|전기)/i.test(careerText);
    const isPhysics = /^(물리|물리학|물리학Ⅰ|물리학1)$/.test(subjectText) || /물리/.test(subjectText);
    const isConcept = /(물질의\s*전기적\s*특성|파동의\s*성질과\s*활용|물질의\s*자기적\s*특성|빛과\s*물질의\s*이중성|힘과\s*운동|에너지와\s*열|시간과\s*공간)/.test(conceptText);
    const isKeyword = !keywordText || /(전하|전기력|원자\s*구조|스펙트럼|전자|전기장|반도체|소자|회로|센서\s*신호|진동수|파장|파동의\s*속력|파동|주파수|신호|통신|대역폭|데이터\s*전송|간섭|전류|자기장|전자석|자성|코일|모터|제어|저장장치|광전\s*효과|광자|빛의\s*입자설|빛의\s*파동설|광센서|양자|속도|가속도|운동\s*그래프|뉴턴|운동량|충격량|시뮬레이션|열효율|에너지|열\s*관리|냉각|시스템\s*효율|GPS|동기화|시간\s*지연)/i.test(keywordText);
    return !!(isComputer && isPhysics && isConcept && isKeyword);
  }

  function inferBookA18PhysicsAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");
    const getVisibleActivePhysicsAxisText = function(){
      const parts = [];
      const push = function(value){
        const text = normalizeLockText(value || "");
        if (!text) return;
        if (/입력 전|선택 전|대기|찾지 못했|추천|도서 선택/.test(text)) return;
        parts.push(text);
      };
      try {
        const nodes = document.querySelectorAll(
          ".engine-track-card.is-active, .engine-track-card[aria-pressed='true'], .engine-track-card.selected, [data-track].is-active"
        );
        nodes.forEach(function(node){
          push(node.getAttribute("data-track"));
          push(node.getAttribute("data-axis"));
          push(node.getAttribute("data-axis-id"));
          push(node.querySelector && node.querySelector(".engine-track-title") ? node.querySelector(".engine-track-title").textContent : "");
          push(node.querySelector && node.querySelector(".engine-track-short") ? node.querySelector(".engine-track-short").textContent : "");
          push(node.textContent || "");
        });
      } catch (error) {}
      return parts.join(" ");
    };
    const primaryAxisText = normalizeLockText([
      getVisibleActivePhysicsAxisText(),
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel,
      ctx.trackLabel,
      ctx.linkTrackLabel
    ].join(" "));
    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath
    ].join(" "));
    const resolveFromText = function(text){
      text = normalizeLockText(text || "");
      if (!text) return "";
      // 물질의 전기적 특성 / 파동 / 물리-컴퓨터 4번 축 보정
      // v127.1: 실제 4번 화면에는 v127 설명용 축명 대신 기존 전자/임베디드 축명이 나올 수 있다.
      // 특히 electronics_embedded_network_axis는 그대로 두면 concept fallback으로 1번 축 도서군이 반복되므로
      // 현재 선택 교과 개념 기준으로 가장 가까운 물리 도서 축에 명시 매핑한다.
      if (/(electronics_embedded_network_axis|임베디드\s*[·ㆍ]?\s*네트워크\s*제어|임베디드|네트워크\s*제어)/i.test(text)) {
        if (/파동의\s*성질과\s*활용/.test(conceptText)) return "data_bandwidth";
        if (/물질의\s*전기적\s*특성/.test(conceptText)) return "sensor_measurement_signal";
        if (/물질의\s*자기적\s*특성/.test(conceptText)) return "electromagnet_control";
        if (/빛과\s*물질의\s*이중성/.test(conceptText)) return "optical_information";
        if (/힘과\s*운동/.test(conceptText)) return "mechanical_motion_control";
        if (/에너지와\s*열/.test(conceptText)) return "thermal_management_hardware";
        if (/시간과\s*공간/.test(conceptText)) return "time_sync_network";
        return "sensor_measurement_signal";
      }
      // 물질의 전기적 특성
      if (/(electric_signal_circuit_axis|electronics_signal_circuit_axis|전기\s*신호\s*[·ㆍ]?\s*회로|신호\s*[·ㆍ]?\s*회로|회로\s*기초|전압|전류|회로)/i.test(text)) return "electric_signal_circuit";
      if (/(semiconductor_device_axis|electronics_device_sensor_axis|반도체\s*[·ㆍ]?\s*소자|전자소자|소자\s*이해|반도체)/i.test(text)) return "semiconductor_device";
      if (/(sensor_measurement_signal_axis|센서\s*[·ㆍ]?\s*측정\s*신호|센서\s*신호|측정\s*신호|센서)/i.test(text)) return "sensor_measurement_signal";
      // 파동의 성질과 활용
      if (/(signal_communication_axis|electronics_communication_signal_axis|신호\s*[·ㆍ]?\s*통신\s*해석|통신\s*신호|신호\s*통신|주파수\s*해석)/i.test(text)) return "signal_communication";
      if (/(data_bandwidth_axis|데이터\s*전송\s*[·ㆍ]?\s*대역폭|대역폭|전송\s*속도|데이터\s*전송)/i.test(text)) return "data_bandwidth";
      if (/(wave_visualization_axis|파동\s*시각화\s*[·ㆍ]?\s*분석|파동\s*분석|시각화\s*분석)/i.test(text)) return "wave_visualization";
      // 물질의 자기적 특성
      if (/(current_magnetic_system_axis|전류\s*[·ㆍ]?\s*자기장\s*시스템|전류\s*자기장|자기장\s*시스템)/i.test(text)) return "current_magnetic_system";
      if (/(electromagnet_control_axis|전자석\s*[·ㆍ]?\s*제어\s*장치|전자석\s*제어|제어\s*장치|액추에이터)/i.test(text)) return "electromagnet_control";
      if (/(magnetic_storage_material_axis|자성\s*[·ㆍ]?\s*저장장치|자성\s*저장|저장장치|자기\s*저장)/i.test(text)) return "magnetic_storage_material";
      // 빛과 물질의 이중성
      if (/(photoelectric_sensor_axis|광전\s*효과\s*[·ㆍ]?\s*센서|광전\s*센서|이미지\s*센서|빛\s*검출)/i.test(text)) return "photoelectric_sensor";
      if (/(quantum_device_axis|electronics_quantum_device_axis|양자\s*[·ㆍ]?\s*반도체\s*소자|양자\s*소자|반도체\s*소자)/i.test(text)) return "quantum_device";
      if (/(optical_information_axis|빛\s*정보\s*처리|광\s*정보|이미지\s*처리|광통신)/i.test(text)) return "optical_information";
      // 힘과 운동
      if (/(motion_data_simulation_axis|운동\s*데이터\s*[·ㆍ]?\s*시뮬레이션|운동\s*시뮬레이션|운동\s*그래프)/i.test(text)) return "motion_data_simulation";
      if (/(collision_safety_axis|충돌\s*[·ㆍ]?\s*안전\s*설계|충돌\s*안전|충격량|운동량)/i.test(text)) return "collision_safety";
      if (/(mechanical_motion_control_axis|기계\s*운동\s*[·ㆍ]?\s*제어\s*모델링|기계\s*운동|제어\s*모델링)/i.test(text)) return "mechanical_motion_control";
      // 에너지와 열 / 시간과 공간도 화면에 나올 경우 안전 매칭
      if (/(energy_efficiency_system_axis|에너지\s*효율\s*[·ㆍ]?\s*시스템|에너지\s*효율|시스템\s*효율)/i.test(text)) return "energy_efficiency_system";
      if (/(thermal_management_hardware_axis|열\s*관리\s*[·ㆍ]?\s*하드웨어|열\s*관리|냉각)/i.test(text)) return "thermal_management_hardware";
      if (/(heat_engine_cooling_design_axis|열기관\s*[·ㆍ]?\s*냉각\s*설계|열기관|냉각\s*설계)/i.test(text)) return "heat_engine_cooling_design";
      if (/(time_sync_network_axis|시간\s*동기화\s*[·ㆍ]?\s*네트워크|시간\s*동기화|네트워크\s*동기화|GPS)/i.test(text)) return "time_sync_network";
      if (/(relativity_measurement_axis|상대성\s*[·ㆍ]?\s*정밀\s*측정|정밀\s*측정|시간\s*지연|광속)/i.test(text)) return "relativity_measurement";
      return "";
    };
    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    if (/물질의\s*전기적\s*특성/.test(conceptText)) return "electric_signal_circuit";
    if (/파동의\s*성질과\s*활용/.test(conceptText)) return "signal_communication";
    if (/물질의\s*자기적\s*특성/.test(conceptText)) return "current_magnetic_system";
    if (/빛과\s*물질의\s*이중성/.test(conceptText)) return "photoelectric_sensor";
    if (/힘과\s*운동/.test(conceptText)) return "motion_data_simulation";
    if (/에너지와\s*열/.test(conceptText)) return "energy_efficiency_system";
    if (/시간과\s*공간/.test(conceptText)) return "time_sync_network";
    return "";
  }

  function buildLockedBookContextA18Physics(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      electric_signal_circuit: "전기 신호·회로 기초 축",
      semiconductor_device: "반도체·소자 이해 축",
      sensor_measurement_signal: "센서·측정 신호 축",
      signal_communication: "신호·통신 해석 축",
      data_bandwidth: "데이터 전송·대역폭 축",
      wave_visualization: "파동 시각화·분석 축",
      current_magnetic_system: "전류·자기장 시스템 축",
      electromagnet_control: "전자석·제어 장치 축",
      magnetic_storage_material: "자성·저장장치 이해 축",
      photoelectric_sensor: "광전 효과·센서 축",
      quantum_device: "양자·반도체 소자 축",
      optical_information: "빛 정보 처리 축",
      motion_data_simulation: "운동 데이터·시뮬레이션 축",
      collision_safety: "충돌·안전 설계 축",
      mechanical_motion_control: "기계 운동·제어 모델링 축",
      energy_efficiency_system: "에너지 효율·시스템 축",
      thermal_management_hardware: "열 관리·하드웨어 축",
      heat_engine_cooling_design: "열기관·냉각 설계 축",
      time_sync_network: "시간 동기화·네트워크 축",
      relativity_measurement: "상대성·정밀 측정 축"
    };
    const axisUseMap = {
      electric_signal_circuit: { direct: "전하·전기력·전기장 개념을 회로 신호와 전압·전류 흐름으로 연결해 설명할 때 활용합니다.", role: ["전기 신호", "회로 기초", "물리-정보 연결"] },
      semiconductor_device: { direct: "원자 구조와 전기적 특성을 반도체 소자, 전자 이동, 센서 작동 원리와 연결할 때 활용합니다.", role: ["반도체 소자", "전자 이동", "센서 원리"] },
      sensor_measurement_signal: { direct: "물리량을 전기 신호로 바꾸는 센서와 측정값 해석 과정을 설명할 때 활용합니다.", role: ["센서 신호", "측정 데이터", "오차 해석"] },
      signal_communication: { direct: "파장·진동수·주파수를 신호와 통신 구조로 연결해 설명할 때 활용합니다.", role: ["신호 통신", "주파수 해석", "정보 전송"] },
      data_bandwidth: { direct: "주파수·대역폭을 데이터 전송량과 네트워크 전송 조건으로 해석할 때 활용합니다.", role: ["대역폭", "데이터 전송", "네트워크 조건"] },
      wave_visualization: { direct: "파동의 주기성과 간섭 양상을 그래프·시각화·자료 분석으로 설명할 때 활용합니다.", role: ["파동 시각화", "그래프 해석", "분석 모델"] },
      current_magnetic_system: { direct: "전류와 자기장의 관계를 시스템 구조와 장치 동작 원리로 설명할 때 활용합니다.", role: ["전류-자기장", "시스템 구조", "장치 원리"] },
      electromagnet_control: { direct: "전자석, 모터, 스위치, 제어 장치의 입력-출력 구조를 설명할 때 활용합니다.", role: ["전자석 제어", "모터", "자동화 장치"] },
      magnetic_storage_material: { direct: "자성 물질과 저장장치 원리를 정보 저장 및 하드웨어 구조로 연결할 때 활용합니다.", role: ["자성 저장", "저장장치", "하드웨어"] },
      photoelectric_sensor: { direct: "광전 효과를 빛 검출, 광센서, 이미지 센서의 작동 원리로 연결할 때 활용합니다.", role: ["광전 센서", "이미지 센서", "빛 검출"] },
      quantum_device: { direct: "빛의 입자성과 양자 개념을 반도체 소자와 양자 기술의 기초로 설명할 때 활용합니다.", role: ["양자 소자", "반도체", "에너지 준위"] },
      optical_information: { direct: "빛을 정보로 처리하는 광통신, 이미지 처리, 광센서 데이터 해석으로 확장할 때 활용합니다.", role: ["빛 정보", "광통신", "이미지 처리"] },
      motion_data_simulation: { direct: "속도·가속도·운동 그래프를 시뮬레이션과 운동 데이터 모델링으로 연결할 때 활용합니다.", role: ["운동 데이터", "시뮬레이션", "그래프 해석"] },
      collision_safety: { direct: "운동량과 충격량을 충돌 조건, 안전 설계, 힘-시간 그래프 해석으로 연결할 때 활용합니다.", role: ["충돌 안전", "운동량", "충격량"] },
      mechanical_motion_control: { direct: "운동 법칙을 기계 장치의 제어 조건과 움직임 예측 모델로 연결할 때 활용합니다.", role: ["기계 운동", "제어 모델", "운동 예측"] },
      energy_efficiency_system: { direct: "에너지 전환과 효율을 컴퓨팅 시스템, 전력 소비, 하드웨어 효율 문제와 연결할 때 활용합니다.", role: ["에너지 효율", "시스템", "전력 소비"] },
      thermal_management_hardware: { direct: "열 관리와 냉각 조건을 하드웨어 성능, 발열, 시스템 안정성과 연결할 때 활용합니다.", role: ["열 관리", "하드웨어", "냉각"] },
      heat_engine_cooling_design: { direct: "열기관과 냉각 설계를 에너지 손실과 장치 설계 조건으로 해석할 때 활용합니다.", role: ["열기관", "냉각 설계", "에너지 손실"] },
      time_sync_network: { direct: "시간 동기화와 정밀 시간을 네트워크, GPS, 분산 시스템의 기초 조건으로 연결할 때 활용합니다.", role: ["시간 동기화", "네트워크", "GPS"] },
      relativity_measurement: { direct: "상대성, 시간 지연, 정밀 측정 개념을 통신·위치 추적의 측정 한계로 연결할 때 활용합니다.", role: ["상대성", "정밀 측정", "측정 한계"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.electric_signal_circuit;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 물리 개념을 컴퓨터공학의 회로·신호·센서·네트워크·시뮬레이션 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 정보사회, 기술 활용, 시스템 한계, 윤리적 쟁점으로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["기술사회 확장", "활용 관점 비교", "시스템 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 물리 개념을 전기 신호, 통신, 센서, 저장장치, 광정보, 시뮬레이션 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·기술 활용·윤리 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "물리 모델이 실제 컴퓨터 시스템과 통신·센서·하드웨어 환경에서 갖는 오차, 단순화, 조건 설정의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 센서, 네트워크, 하드웨어, 정보사회, 기술 윤리 문제로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA18PhysicsRank: rank,
      bookA18PhysicsAxis: axisId
    };
  }

  function cloneBookForA18PhysicsLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6180 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA18Physics(book, ctx, sectionType, axisId, rank),
      bookA18PhysicsLock: true,
      bookA18PhysicsLockRank: rank,
      bookA18PhysicsAxisLock: axisId
    };
  }

  function applyBookA18PhysicsLock(result, ctx){
    if (!result || !isBookA18PhysicsComputerContext(ctx)) return result;
    const axisId = inferBookA18PhysicsAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      electric_signal_circuit: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"],
      semiconductor_device: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"],
      sensor_measurement_signal: ["객관성의 칼날", "팩트풀니스", "경영학 콘서트"],
      signal_communication: ["미디어의 이해", "부분과 전체", "20세기 수학의 다섯가지 황금률"],
      data_bandwidth: ["20세기 수학의 다섯가지 황금률", "경영학 콘서트", "객관성의 칼날"],
      wave_visualization: ["카오스", "혼돈으로부터의 질서", "객관성의 칼날"],
      current_magnetic_system: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"],
      electromagnet_control: ["경영학 콘서트", "부분과 전체", "카오스"],
      magnetic_storage_material: ["객관성의 칼날", "부분과 전체", "미디어의 이해"],
      photoelectric_sensor: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"],
      quantum_device: ["부분과 전체", "객관성의 칼날", "페르마의 마지막 정리"],
      optical_information: ["미디어의 이해", "20세기 수학의 다섯가지 황금률", "객관성의 칼날"],
      motion_data_simulation: ["카오스", "혼돈으로부터의 질서", "부분과 전체"],
      collision_safety: ["부분과 전체", "객관성의 칼날", "경영학 콘서트"],
      mechanical_motion_control: ["카오스", "경영학 콘서트", "혼돈으로부터의 질서"],
      energy_efficiency_system: ["경영학 콘서트", "부분과 전체", "객관성의 칼날"],
      thermal_management_hardware: ["부분과 전체", "카오스", "객관성의 칼날"],
      heat_engine_cooling_design: ["경영학 콘서트", "혼돈으로부터의 질서", "부분과 전체"],
      time_sync_network: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "부분과 전체"],
      relativity_measurement: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"]
    };
    const expansionMap = {
      electric_signal_circuit: ["미디어의 이해", "1984", "제3의 물결", "팩트풀니스", "감시와 처벌"],
      semiconductor_device: ["미디어의 이해", "경영학 콘서트", "팩트풀니스", "1984", "제3의 물결"],
      sensor_measurement_signal: ["부분과 전체", "미디어의 이해", "1984", "감시와 처벌", "제3의 물결"],
      signal_communication: ["1984", "제3의 물결", "팩트풀니스", "감시와 처벌", "경영학 콘서트"],
      data_bandwidth: ["미디어의 이해", "1984", "제3의 물결", "팩트풀니스", "부분과 전체"],
      wave_visualization: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "미디어의 이해", "경영학 콘서트", "1984"],
      current_magnetic_system: ["카오스", "혼돈으로부터의 질서", "경영학 콘서트", "미디어의 이해", "1984"],
      electromagnet_control: ["객관성의 칼날", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "1984", "제3의 물결"],
      magnetic_storage_material: ["20세기 수학의 다섯가지 황금률", "경영학 콘서트", "팩트풀니스", "1984", "감시와 처벌"],
      photoelectric_sensor: ["미디어의 이해", "경영학 콘서트", "팩트풀니스", "1984", "제3의 물결"],
      quantum_device: ["20세기 수학의 다섯가지 황금률", "카오스", "미디어의 이해", "1984", "제3의 물결"],
      optical_information: ["부분과 전체", "팩트풀니스", "1984", "감시와 처벌", "제3의 물결"],
      motion_data_simulation: ["20세기 수학의 다섯가지 황금률", "객관성의 칼날", "경영학 콘서트", "미디어의 이해", "1984"],
      collision_safety: ["카오스", "혼돈으로부터의 질서", "팩트풀니스", "미디어의 이해", "1984"],
      mechanical_motion_control: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "제3의 물결"],
      energy_efficiency_system: ["팩트풀니스", "미디어의 이해", "제3의 물결", "1984", "감시와 처벌"],
      thermal_management_hardware: ["경영학 콘서트", "혼돈으로부터의 질서", "미디어의 이해", "팩트풀니스", "제3의 물결"],
      heat_engine_cooling_design: ["객관성의 칼날", "20세기 수학의 다섯가지 황금률", "미디어의 이해", "팩트풀니스", "제3의 물결"],
      time_sync_network: ["미디어의 이해", "1984", "제3의 물결", "감시와 처벌", "팩트풀니스"],
      relativity_measurement: ["미디어의 이해", "카오스", "혼돈으로부터의 질서", "1984", "제3의 물결"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA18PhysicsLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA18PhysicsLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA18PhysicsLock: axisId,
        bookA18PhysicsDirectTitles: directBooks.map(book => book.title),
        bookA18PhysicsExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }



  // v150 CHEM-IT/ELECTRONICS-real-axis-lock: 화학+컴퓨터/전자/전기전자/반도체 계열은 실제 chemistry1_concept_longitudinal_map.json의
  // 4번 축명/axis_id만 기준으로 5번 도서 매칭을 잠근다.
  // 주의: 화학과 전용 pure_chem_* 축(예: 원자 구조·전자 배치 해석 축)은 컴퓨터·전자·반도체 화면 기준으로 사용하지 않는다.
  function isBookA19ChemistryComputerContext(ctx){
    ctx = ctx || {};
    const subjectText = normalizeLockText(ctx.subject || "");
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    const conceptText = normalizeLockText(ctx.concept || "");
    const isChemistry = /화학/.test(subjectText);
    const isComputer = /(컴퓨터공학과|컴퓨터공학|컴퓨터|소프트웨어|인공지능|ai|데이터|정보|정보보안|정보통신|프로그래밍|알고리즘|네트워크|시스템|전자공학과|전자공학|전기전자|전자전기|전기공학|전자|전기|반도체공학과|반도체공학|반도체|시스템반도체|소자|회로|센서|통신|임베디드|하드웨어)/i.test(careerText);
    const isTargetConcept = /(현대의\s*원자\s*모형과\s*전자\s*배치|원소의\s*주기적\s*성질|화학\s*결합)/.test(conceptText);
    return !!(isChemistry && isComputer && isTargetConcept);
  }

  function inferBookA19ChemistryComputerAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel
    ].join(" "));
    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath,
      ctx.keyword
    ].join(" "));
    const resolveFromText = (text) => {
      if (!text) return "";
      // 현대의 원자 모형과 전자 배치 - 실제 JSON 축명
      if (/(electron\s*configuration\s*axis|전자배치\s*스펙트럼|전자\s*배치\s*스펙트럼|전자배치|스펙트럼)/i.test(text)) return "electron_configuration_spectrum";
      if (/(light\s*energy\s*transition\s*axis|에너지\s*준위\s*빛\s*해석|에너지\s*준위|빛\s*해석|선\s*스펙트럼|전이)/i.test(text)) return "light_energy_transition";
      if (/(semiconductor\s*electronic\s*material\s*axis|소재\s*전자\s*구조\s*응용|전자\s*구조\s*응용|소재\s*전자\s*구조|반도체|전자\s*구조)/i.test(text)) return "semiconductor_electronic_material";
      // 원소의 주기적 성질 - 실제 JSON 축명
      if (/(periodic\s*property\s*axis|주기율\s*성질\s*예측|주기율|주기성|성질\s*예측)/i.test(text)) return "periodic_property";
      if (/(material\s*selection\s*axis|재료\s*선택\s*설계|재료\s*선택|소재\s*선택)/i.test(text)) return "material_selection";
      if (/(bio\s*environment\s*ion\s*axis|환경\s*생체\s*이온\s*해석|생체\s*이온|환경\s*이온|이온\s*해석)/i.test(text)) return "bio_environment_ion";
      // 화학 결합 - 실제 JSON 축명
      if (/(bond\s*structure\s*axis|결합\s*구조\s*해석|결합\s*구조)/i.test(text)) return "bond_structure";
      if (/(material\s*property\s*design\s*axis|물성\s*소재\s*설계|물성\s*설계|소재\s*설계)/i.test(text)) return "material_property_design";
      if (/(bio\s*molecular\s*interaction\s*axis|분자\s*상호작용\s*용해|분자\s*상호작용|용해)/i.test(text)) return "bio_molecular_interaction";
      return "";
    };
    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    if (/현대의\s*원자\s*모형과\s*전자\s*배치/.test(conceptText)) return "electron_configuration_spectrum";
    if (/원소의\s*주기적\s*성질/.test(conceptText)) return "periodic_property";
    if (/화학\s*결합/.test(conceptText)) return "bond_structure";
    return "";
  }

  function buildLockedBookContextA19ChemistryComputer(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      electron_configuration_spectrum: "전자배치·스펙트럼 축",
      light_energy_transition: "에너지 준위·빛 해석 축",
      semiconductor_electronic_material: "소재·전자 구조 응용 축",
      periodic_property: "주기율·성질 예측 축",
      material_selection: "재료 선택·설계 축",
      bio_environment_ion: "환경·생체 이온 해석 축",
      bond_structure: "결합 구조 해석 축",
      material_property_design: "물성·소재 설계 축",
      bio_molecular_interaction: "분자 상호작용·용해 축"
    };
    const axisUseMap = {
      electron_configuration_spectrum: { direct: "전자 배치와 스펙트럼을 컴퓨터·전자·반도체 계열의 신호 해석, 데이터 표현, 측정 근거로 연결할 때 활용합니다.", role: ["전자배치", "스펙트럼", "신호 해석"] },
      light_energy_transition: { direct: "에너지 준위와 빛의 흡수·방출을 광센서, 디스플레이, 광정보 처리의 기초 원리로 설명할 때 활용합니다.", role: ["에너지 준위", "빛 해석", "광정보"] },
      semiconductor_electronic_material: { direct: "원자·전자 구조를 반도체 소재, 전자 소자, 회로·하드웨어 작동 조건으로 연결할 때 활용합니다.", role: ["전자 구조", "반도체 소재", "하드웨어 기초"] },
      periodic_property: { direct: "주기율표 위치와 원소 성질 변화를 소재 선택과 전자적 특성 예측의 기준으로 설명할 때 활용합니다.", role: ["주기율", "성질 예측", "소재 판단"] },
      material_selection: { direct: "원소의 성질 차이를 전도성, 안정성, 소자 소재 선택 기준으로 확장할 때 활용합니다.", role: ["재료 선택", "전도성", "소재 설계"] },
      bio_environment_ion: { direct: "이온 성질과 전하 이동을 센서, 환경 데이터, 생체 신호 측정 조건으로 연결할 때 활용합니다.", role: ["이온 해석", "센서", "측정 데이터"] },
      bond_structure: { direct: "결합 구조를 물질의 안정성, 전자 이동, 하드웨어 소재의 기본 성질로 설명할 때 활용합니다.", role: ["결합 구조", "전자 이동", "소재 안정성"] },
      material_property_design: { direct: "결합 종류와 구조 차이를 전도성, 내구성, 소재 물성 예측으로 연결할 때 활용합니다.", role: ["물성 예측", "소재 설계", "전도성"] },
      bio_molecular_interaction: { direct: "분자 상호작용과 용해 조건을 바이오센서, 생체 데이터 측정, 인터페이스 재료로 확장할 때 활용합니다.", role: ["분자 상호작용", "용해", "바이오센서"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.electron_configuration_spectrum;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 화학 개념을 컴퓨터·전자·반도체 계열의 신호·소자·소재·데이터 해석 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 기술사회, 정보 처리, 소재 활용, 시스템 한계로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["기술사회 확장", "활용 관점 비교", "시스템 한계 논의"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 화학 개념을 전자 배치, 스펙트럼, 에너지 준위, 소재 선택, 결합 구조, 물성 예측 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 정보사회·소재 활용·기술 윤리 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "화학 원리를 컴퓨터·전자·반도체 계열의 소자·센서·데이터 처리 맥락에 적용할 때 생기는 단순화, 측정 오차, 소재 조건의 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 반도체, 센서, 광정보, 하드웨어 소재, 데이터 측정 기술의 활용 방향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA19ChemistryComputerRank: rank,
      bookA19ChemistryComputerAxis: axisId
    };
  }

  function cloneBookForA19ChemistryComputerLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6190 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`선택한 후속 연계축 기준 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA19ChemistryComputer(book, ctx, sectionType, axisId, rank),
      bookA19ChemistryComputerLock: true,
      bookA19ChemistryComputerLockRank: rank,
      bookA19ChemistryComputerAxisLock: axisId
    };
  }

  function isBookA19ChemistryElectronicsContext(ctx){
    ctx = ctx || {};
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    return /(전자공학과|전자공학|전자공|전기전자|전자전기|전기공학과|전기공학|전기공|반도체공학과|반도체공학|반도체|시스템반도체|소자|회로|센서|통신|임베디드|하드웨어)/i.test(careerText);
  }

  function applyBookA19ChemistryComputerLock(result, ctx){
    if (!result || !isBookA19ChemistryComputerContext(ctx)) return result;
    const axisId = inferBookA19ChemistryComputerAxis(ctx);
    if (!axisId) return result;

    const directMapBase = {
      electron_configuration_spectrum: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      light_energy_transition: ["부분과 전체", "객관성의 칼날", "20세기 수학의 다섯가지 황금률"],
      semiconductor_electronic_material: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      periodic_property: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "팩트풀니스"],
      material_selection: ["같기도 하고 아니 같기도 하고", "경영학 콘서트", "객관성의 칼날"],
      bio_environment_ion: ["팩트풀니스", "객관성의 칼날", "같기도 하고 아니 같기도 하고"],
      bond_structure: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      material_property_design: ["같기도 하고 아니 같기도 하고", "경영학 콘서트", "객관성의 칼날"],
      bio_molecular_interaction: ["부분과 전체", "같기도 하고 아니 같기도 하고", "객관성의 칼날"]
    };
    const directMapElectronics = {
      ...directMapBase,
      // v151: 전자공학과·전기공학과·반도체공학과는 컴퓨터공학과 잠금값을 유지하되,
      // 빛/에너지 준위와 화학 결합 3축은 전자소자·소재·측정 관점에 맞게 별도 분기한다.
      light_energy_transition: ["부분과 전체", "같기도 하고 아니 같기도 하고", "20세기 수학의 다섯가지 황금률"],
      bond_structure: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      material_property_design: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "부분과 전체"],
      bio_molecular_interaction: ["객관성의 칼날", "팩트풀니스", "같기도 하고 아니 같기도 하고"]
    };
    const directMap = isBookA19ChemistryElectronicsContext(ctx) ? directMapElectronics : directMapBase;
    const expansionMap = {
      electron_configuration_spectrum: ["20세기 수학의 다섯가지 황금률", "미디어의 이해", "팩트풀니스", "제3의 물결", "1984"],
      light_energy_transition: ["미디어의 이해", "코스모스", "시간의 역사", "팩트풀니스", "제3의 물결"],
      semiconductor_electronic_material: ["미디어의 이해", "경영학 콘서트", "팩트풀니스", "제3의 물결", "1984"],
      periodic_property: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "미디어의 이해", "경영학 콘서트", "제3의 물결"],
      material_selection: ["부분과 전체", "팩트풀니스", "미디어의 이해", "제3의 물결", "1984"],
      bio_environment_ion: ["미디어의 이해", "경영학 콘서트", "감시와 처벌", "제3의 물결", "1984"],
      bond_structure: ["20세기 수학의 다섯가지 황금률", "미디어의 이해", "팩트풀니스", "제3의 물결", "1984"],
      material_property_design: ["부분과 전체", "팩트풀니스", "미디어의 이해", "제3의 물결", "1984"],
      bio_molecular_interaction: ["팩트풀니스", "미디어의 이해", "경영학 콘서트", "제3의 물결", "1984"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA19ChemistryComputerLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA19ChemistryComputerLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA19ChemistryComputerLock: axisId,
        bookA19ChemistryComputerDirectTitles: directBooks.map(book => book.title),
        bookA19ChemistryComputerElectronicsMode: isBookA19ChemistryElectronicsContext(ctx),
        bookA19ChemistryComputerExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  // v152 CHEM-MATERIALS-lock: 화학+신소재/재료계열은 컴퓨터·전자계열과 다른 실제 대표 3번
  // (화학 결합 / 원소의 주기적 성질 / 분자의 구조와 성질) 기준으로 5번 도서 매칭을 잠근다.
  // 4번 축은 chemistry1_concept_longitudinal_map.json의 실제 축명만 사용한다.
  function isBookA20ChemistryMaterialsContext(ctx){
    ctx = ctx || {};
    const subjectText = normalizeLockText(ctx.subject || "");
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    const conceptText = normalizeLockText(ctx.concept || "");
    const isChemistry = /화학/.test(subjectText);
    const isMaterials = /(신소재공학과|신소재공학|신소재|재료공학과|재료공학|재료|소재|나노소재|고분자공학|고분자|금속공학|금속|세라믹|섬유공학|섬유)/i.test(careerText);
    const isTargetConcept = /(화학\s*결합|원소의\s*주기적\s*성질|분자의\s*구조와\s*성질)/.test(conceptText);
    return !!(isChemistry && isMaterials && isTargetConcept);
  }

  function inferBookA20ChemistryMaterialsAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel
    ].join(" "));
    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath,
      ctx.keyword
    ].join(" "));
    const resolveFromText = (text) => {
      if (!text) return "";
      // 화학 결합 - 실제 JSON 축명
      if (/(bond\s*structure\s*axis|결합\s*구조\s*해석|결합\s*구조)/i.test(text)) return "bond_structure";
      if (/(material\s*property\s*design\s*axis|물성\s*소재\s*설계|물성\s*설계|소재\s*설계|재료\s*물성)/i.test(text)) return "material_property_design";
      if (/(bio\s*molecular\s*interaction\s*axis|분자\s*상호작용\s*용해|분자\s*상호작용|용해)/i.test(text)) return "bio_molecular_interaction";
      // 원소의 주기적 성질 - 실제 JSON 축명
      if (/(periodic\s*property\s*axis|주기율\s*성질\s*예측|주기율|주기성|성질\s*예측)/i.test(text)) return "periodic_property";
      if (/(material\s*selection\s*axis|재료\s*선택\s*설계|재료\s*선택|소재\s*선택)/i.test(text)) return "material_selection";
      if (/(bio\s*environment\s*ion\s*axis|환경\s*생체\s*이온\s*해석|생체\s*이온|환경\s*이온|이온\s*해석)/i.test(text)) return "bio_environment_ion";
      // 분자의 구조와 성질 - 실제 JSON 축명
      if (/(molecular\s*shape\s*axis|분자\s*구조\s*극성|분자\s*구조|극성\s*축)/i.test(text)) return "molecular_shape";
      if (/(intermolecular\s*force\s*axis|분자\s*사이\s*힘\s*물성|분자\s*사이\s*힘|분자간\s*힘|물성\s*축)/i.test(text)) return "intermolecular_force";
      if (/(life\s*material\s*application\s*axis|생활\s*생체\s*물질\s*적용|생활\s*생체|생체\s*물질)/i.test(text)) return "life_material_application";
      return "";
    };
    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    if (/화학\s*결합/.test(conceptText)) return "bond_structure";
    if (/원소의\s*주기적\s*성질/.test(conceptText)) return "material_selection";
    if (/분자의\s*구조와\s*성질/.test(conceptText)) return "molecular_shape";
    return "";
  }

  function buildLockedBookContextA20ChemistryMaterials(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      bond_structure: "결합 구조 해석 축",
      material_property_design: "물성·소재 설계 축",
      bio_molecular_interaction: "분자 상호작용·용해 축",
      periodic_property: "주기율·성질 예측 축",
      material_selection: "재료 선택·설계 축",
      bio_environment_ion: "환경·생체 이온 해석 축",
      molecular_shape: "분자 구조·극성 축",
      intermolecular_force: "분자 사이 힘·물성 축",
      life_material_application: "생활·생체 물질 적용 축"
    };
    const axisUseMap = {
      bond_structure: { direct: "이온 결합·공유 결합·금속 결합의 구조 차이를 소재 안정성, 전도성, 결정 구조 해석의 출발점으로 설명할 때 활용합니다.", role: ["결합 구조", "소재 안정성", "구조-성질 연결"] },
      material_property_design: { direct: "미시적 결합 방식이 녹는점, 전도성, 강도, 내구성 같은 거시적 물성으로 이어지는 과정을 소재 설계 기준으로 설명할 때 활용합니다.", role: ["물성 예측", "소재 설계", "전도성·강도"] },
      bio_molecular_interaction: { direct: "분자 상호작용과 용해 조건을 고분자, 코팅, 접착, 바이오소재의 계면 특성으로 확장할 때 활용합니다.", role: ["분자 상호작용", "용해", "계면·바이오소재"] },
      periodic_property: { direct: "주기율표 위치와 이온화 에너지, 전기음성도, 금속성을 바탕으로 원소 성질을 예측할 때 활용합니다.", role: ["주기율", "성질 예측", "원소 비교"] },
      material_selection: { direct: "원소의 주기적 성질을 금속·비금속, 전도성, 안정성, 반응성 차이에 따른 재료 선택 기준으로 확장할 때 활용합니다.", role: ["재료 선택", "원소 성질", "소재 설계"] },
      bio_environment_ion: { direct: "금속 이온과 환경·생체 조건을 부식, 오염, 생체적합성, 센서 소재 판단으로 연결할 때 활용합니다.", role: ["이온 해석", "환경·생체", "소재 안정성"] },
      molecular_shape: { direct: "분자 구조와 극성을 소재의 배열, 표면 특성, 친수성·소수성 판단으로 연결할 때 활용합니다.", role: ["분자 구조", "극성", "표면 특성"] },
      intermolecular_force: { direct: "분자 사이 힘을 끓는점, 점성, 용해도, 접착성, 코팅 성능 같은 소재 물성 차이로 설명할 때 활용합니다.", role: ["분자 사이 힘", "물성", "코팅·접착"] },
      life_material_application: { direct: "생활·생체 물질 적용 관점에서 고분자, 생체재료, 친환경 소재의 활용성과 한계를 비교할 때 활용합니다.", role: ["생활 소재", "생체재료", "활용성 비교"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.material_property_design;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 화학 개념을 신소재·재료계열의 구조-물성-소재 설계 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 소재 활용, 기술사회, 환경 영향, 생체 적용으로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["소재 활용 확장", "응용 관점 비교", "기술·환경 한계"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 화학 개념을 결합 구조, 주기성, 분자 구조, 분자 사이 힘, 소재 선택 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 소재 활용·환경 영향·생체 적용 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "화학 개념을 실제 소재 설계에 적용할 때 생기는 조건 의존성, 측정 오차, 공정 한계, 환경 영향을 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 신소재, 고분자, 금속·세라믹, 친환경 소재, 생체재료 활용 방향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA20ChemistryMaterialsRank: rank,
      bookA20ChemistryMaterialsAxis: axisId
    };
  }

  function cloneBookForA20ChemistryMaterialsLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6170 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`신소재·재료계열 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA20ChemistryMaterials(book, ctx, sectionType, axisId, rank),
      bookA20ChemistryMaterialsLock: true,
      bookA20ChemistryMaterialsLockRank: rank,
      bookA20ChemistryMaterialsAxisLock: axisId
    };
  }

  function applyBookA20ChemistryMaterialsLock(result, ctx){
    if (!result || !isBookA20ChemistryMaterialsContext(ctx)) return result;
    const axisId = inferBookA20ChemistryMaterialsAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      bond_structure: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      material_property_design: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "부분과 전체"],
      bio_molecular_interaction: ["부분과 전체", "같기도 하고 아니 같기도 하고", "객관성의 칼날"],
      periodic_property: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "팩트풀니스"],
      material_selection: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      bio_environment_ion: ["객관성의 칼날", "팩트풀니스", "같기도 하고 아니 같기도 하고"],
      molecular_shape: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      intermolecular_force: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "부분과 전체"],
      life_material_application: ["부분과 전체", "팩트풀니스", "같기도 하고 아니 같기도 하고"]
    };
    const expansionMap = {
      bond_structure: ["혼돈으로부터의 질서", "카오스", "20세기 수학의 다섯가지 황금률", "팩트풀니스", "미디어의 이해"],
      material_property_design: ["혼돈으로부터의 질서", "카오스", "경영학 콘서트", "팩트풀니스", "미디어의 이해"],
      bio_molecular_interaction: ["팩트풀니스", "혼돈으로부터의 질서", "경영학 콘서트", "미디어의 이해", "1984"],
      periodic_property: ["20세기 수학의 다섯가지 황금률", "부분과 전체", "미디어의 이해", "경영학 콘서트", "제3의 물결"],
      material_selection: ["혼돈으로부터의 질서", "카오스", "경영학 콘서트", "팩트풀니스", "미디어의 이해"],
      bio_environment_ion: ["부분과 전체", "미디어의 이해", "경영학 콘서트", "감시와 처벌", "제3의 물결"],
      molecular_shape: ["20세기 수학의 다섯가지 황금률", "혼돈으로부터의 질서", "카오스", "팩트풀니스", "미디어의 이해"],
      intermolecular_force: ["혼돈으로부터의 질서", "카오스", "경영학 콘서트", "팩트풀니스", "미디어의 이해"],
      life_material_application: ["미디어의 이해", "경영학 콘서트", "제3의 물결", "감시와 처벌", "1984"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA20ChemistryMaterialsLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA20ChemistryMaterialsLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA20ChemistryMaterialsLock: axisId,
        bookA20ChemistryMaterialsDirectTitles: directBooks.map(book => book.title),
        bookA20ChemistryMaterialsExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  // v153 CHEM-CHEMENG-lock: 화학+화학공학/화공생명/에너지 계열은 실제 chemistry1_concept_longitudinal_map.json의
  // 화학공정 대표 3번(물질의 양과 화학 반응식 / 화학 반응과 열의 출입 / 화학 반응에서의 동적 평형) 기준으로 5번 도서 매칭을 잠근다.
  // 4번 축은 실제 JSON 축명만 사용한다.
  function isBookA21ChemistryChemicalEngineeringContext(ctx){
    ctx = ctx || {};
    const subjectText = normalizeLockText(ctx.subject || "");
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    const conceptText = normalizeLockText(ctx.concept || "");
    const isChemistry = /화학/.test(subjectText);
    const isChemEng = /(화학공학과|화학공학|화공생명공학과|화공생명공학|화학생명공학|화학생물공학|공업화학|화공|공정시스템|공정|에너지공학과|에너지공학|에너지시스템|신재생에너지|수소에너지)/i.test(careerText);
    const isTargetConcept = /(물질의\s*양과\s*화학\s*반응식|화학\s*반응과\s*열의\s*출입|화학\s*반응에서의\s*동적\s*평형)/.test(conceptText);
    return !!(isChemistry && isChemEng && isTargetConcept);
  }

  function inferBookA21ChemistryChemicalEngineeringAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel
    ].join(" "));
    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath,
      ctx.keyword
    ].join(" "));
    const resolveFromText = (text) => {
      if (!text) return "";
      // 물질의 양과 화학 반응식 - 실제 JSON 축명
      if (/(stoichiometry\s*axis|화학량론\s*해석|화학량론|정량\s*반응식|반응식\s*분석)/i.test(text)) return "stoichiometry";
      if (/(process\s*calculation\s*axis|공정\s*계산\s*응용|공정\s*계산|수율|생산량)/i.test(text)) return "process_calculation";
      if (/(experiment\s*analysis\s*axis|실험\s*설계\s*분석|실험\s*분석|오차\s*분석)/i.test(text)) return "experiment_analysis";
      // 화학 반응과 열의 출입 - 실제 JSON 축명
      if (/(thermochemistry\s*axis|열화학\s*반응\s*에너지|열화학|반응\s*에너지|엔탈피)/i.test(text)) return "thermochemistry";
      if (/(electrochemistry\s*battery\s*axis|전기화학\s*배터리\s*기초|전기화학|배터리|전지)/i.test(text)) return "electrochemistry_battery";
      if (/(energy\s*safety\s*axis|에너지\s*안전\s*판단|에너지\s*안전|안전\s*판단)/i.test(text)) return "energy_safety";
      // 화학 반응에서의 동적 평형 - 실제 JSON 축명 중 화학공정형 3축
      if (/(equilibrium\s*analysis\s*axis|평형\s*이동\s*해석|평형\s*해석|평형\s*이동)/i.test(text)) return "equilibrium_analysis";
      if (/(acid\s*base\s*environment\s*axis|산염기\s*환경\s*조절|산염기|환경\s*조절|pH)/i.test(text)) return "acid_base_environment";
      if (/(process\s*optimization\s*axis|공정\s*최적화|공정\s*제어|최적화)/i.test(text)) return "process_optimization";
      return "";
    };
    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    if (/물질의\s*양과\s*화학\s*반응식/.test(conceptText)) return "stoichiometry";
    if (/화학\s*반응과\s*열의\s*출입/.test(conceptText)) return "thermochemistry";
    if (/화학\s*반응에서의\s*동적\s*평형/.test(conceptText)) return "equilibrium_analysis";
    return "";
  }

  function buildLockedBookContextA21ChemistryChemicalEngineering(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      stoichiometry: "화학량론 해석 축",
      process_calculation: "공정 계산 응용 축",
      experiment_analysis: "실험 설계·분석 축",
      thermochemistry: "열화학·반응 에너지 축",
      electrochemistry_battery: "전기화학·배터리 기초 축",
      energy_safety: "에너지·안전 판단 축",
      equilibrium_analysis: "평형 이동 해석 축",
      acid_base_environment: "산염기·환경 조절 축",
      process_optimization: "공정 최적화 축"
    };
    const axisUseMap = {
      stoichiometry: { direct: "몰, 계수비, 수율, 반응물·생성물의 양적 관계를 화학공정의 정량 계산 기준으로 설명할 때 활용합니다.", role: ["화학량론", "계수비", "수율 계산"] },
      process_calculation: { direct: "반응식 계산을 생산량, 수율, 효율, 공정 조건 판단으로 확장할 때 활용합니다.", role: ["공정 계산", "생산량", "효율 판단"] },
      experiment_analysis: { direct: "실험값, 오차, 농도·희석 계산을 공정 데이터 검증과 실험 설계 관점으로 해석할 때 활용합니다.", role: ["실험 설계", "오차 분석", "데이터 검증"] },
      thermochemistry: { direct: "발열·흡열, 반응열, 엔탈피를 반응 에너지와 열관리 조건으로 설명할 때 활용합니다.", role: ["열화학", "반응 에너지", "열관리"] },
      electrochemistry_battery: { direct: "산화·환원과 전자 이동을 전지, 배터리, 전극 반응의 기초 원리로 연결할 때 활용합니다.", role: ["전기화학", "배터리", "전자 이동"] },
      energy_safety: { direct: "반응 에너지, 연소, 발열 위험을 공정 안전과 에너지 효율 판단으로 확장할 때 활용합니다.", role: ["에너지 안전", "공정 위험", "효율"] },
      equilibrium_analysis: { direct: "농도·온도·압력 변화에 따른 평형 이동을 반응 진행 방향과 수율 변화로 설명할 때 활용합니다.", role: ["평형 이동", "반응 조건", "수율"] },
      acid_base_environment: { direct: "산·염기, pH, 중화 조건을 수질·환경 조절과 공정 조건 제어로 연결할 때 활용합니다.", role: ["산염기", "pH", "환경 조절"] },
      process_optimization: { direct: "평형 조건과 반응 조건 제어를 생산 수율, 공정 최적화, 효율 향상 관점으로 설명할 때 활용합니다.", role: ["공정 최적화", "조건 제어", "수율 향상"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.process_calculation;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 화학 개념을 화학공학·공정·에너지 시스템의 정량 계산과 조건 제어 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 공정 안전, 환경 영향, 에너지 효율, 산업적 활용으로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["공정 확장", "환경·안전 비교", "산업 적용 한계"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 화학 개념을 화학량론, 열화학, 전기화학, 평형 이동, 공정 최적화 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 공정 안전·환경 영향·에너지 효율 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "고등학교 화학 개념을 실제 화학공정에 적용할 때 생기는 규모 차이, 조건 제어 한계, 수율·안전·환경 변수의 복합성을 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 화학공정, 에너지 전환, 배터리, 환경 관리, 산업 생산 시스템으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA21ChemistryChemicalEngineeringRank: rank,
      bookA21ChemistryChemicalEngineeringAxis: axisId
    };
  }

  function cloneBookForA21ChemistryChemicalEngineeringLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6160 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`화학공학·공정계열 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA21ChemistryChemicalEngineering(book, ctx, sectionType, axisId, rank),
      bookA21ChemistryChemicalEngineeringLock: true,
      bookA21ChemistryChemicalEngineeringLockRank: rank,
      bookA21ChemistryChemicalEngineeringAxisLock: axisId
    };
  }

  function applyBookA21ChemistryChemicalEngineeringLock(result, ctx){
    if (!result || !isBookA21ChemistryChemicalEngineeringContext(ctx)) return result;
    const axisId = inferBookA21ChemistryChemicalEngineeringAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      stoichiometry: ["객관성의 칼날", "20세기 수학의 다섯가지 황금률", "같기도 하고 아니 같기도 하고"],
      process_calculation: ["공학이란 무엇인가", "경영학 콘서트", "객관성의 칼날"],
      experiment_analysis: ["객관성의 칼날", "팩트풀니스", "경영학 콘서트"],
      thermochemistry: ["엔트로피", "부분과 전체", "객관성의 칼날"],
      electrochemistry_battery: ["같기도 하고 아니 같기도 하고", "부분과 전체", "객관성의 칼날"],
      energy_safety: ["엔트로피", "침묵의 봄", "공학이란 무엇인가"],
      equilibrium_analysis: ["객관성의 칼날", "같기도 하고 아니 같기도 하고", "20세기 수학의 다섯가지 황금률"],
      acid_base_environment: ["침묵의 봄", "팩트풀니스", "객관성의 칼날"],
      process_optimization: ["경영학 콘서트", "공학이란 무엇인가", "객관성의 칼날"]
    };
    const expansionMap = {
      stoichiometry: ["공학이란 무엇인가", "경영학 콘서트", "팩트풀니스", "엔트로피", "침묵의 봄"],
      process_calculation: ["20세기 수학의 다섯가지 황금률", "팩트풀니스", "엔트로피", "침묵의 봄", "제3의 물결"],
      experiment_analysis: ["20세기 수학의 다섯가지 황금률", "공학이란 무엇인가", "엔트로피", "침묵의 봄", "부분과 전체"],
      thermochemistry: ["공학이란 무엇인가", "경영학 콘서트", "침묵의 봄", "팩트풀니스", "카오스"],
      electrochemistry_battery: ["엔트로피", "경영학 콘서트", "침묵의 봄", "미디어의 이해", "제3의 물결"],
      energy_safety: ["팩트풀니스", "경영학 콘서트", "부분과 전체", "제3의 물결", "오래된 미래"],
      equilibrium_analysis: ["공학이란 무엇인가", "경영학 콘서트", "엔트로피", "팩트풀니스", "침묵의 봄"],
      acid_base_environment: ["공학이란 무엇인가", "엔트로피", "오래된 미래", "제3의 물결", "부분과 전체"],
      process_optimization: ["20세기 수학의 다섯가지 황금률", "팩트풀니스", "엔트로피", "침묵의 봄", "제3의 물결"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA21ChemistryChemicalEngineeringLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA21ChemistryChemicalEngineeringLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA21ChemistryChemicalEngineeringLock: axisId,
        bookA21ChemistryChemicalEngineeringDirectTitles: directBooks.map(book => book.title),
        bookA21ChemistryChemicalEngineeringExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }


  // v154 CHEM-BIOENGINEERING-lock: 화학+생명공학/바이오메디컬/생명과학 계열은 실제 chemistry1_concept_longitudinal_map.json의
  // 생명·바이오 대표 3번(탄소 화합물의 유용성 / 분자의 구조와 성질 / 화학 반응에서의 동적 평형) 기준으로 5번 도서 매칭을 잠근다.
  // 4번 축은 실제 JSON 축명만 사용하며, 화면에 없는 임의 축명을 만들지 않는다.
  function isBookA22ChemistryBioengineeringContext(ctx){
    ctx = ctx || {};
    const subjectText = normalizeLockText(ctx.subject || "");
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    const conceptText = normalizeLockText(ctx.concept || "");
    const isChemistry = /화학/.test(subjectText);
    const isBioEng = /(생명공학과|생명공학|생명과학과|생명과학|바이오메디컬공학과|바이오메디컬|의생명공학|바이오공학|분자생명|유전공학|세포공학|바이오테크|바이오헬스)/i.test(careerText);
    const excludeOther = /(화학공학과|화공생명공학과|화공|화학공학|약학과|제약공학과|식품공학과|식품생명공학과|식품영양학과|간호학과|보건|환경공학과|신소재공학과|고분자공학과|반도체공학과|전자공학과|전기공학과)/i.test(careerText);
    const isTargetConcept = /(탄소\s*화합물의\s*유용성|분자의\s*구조와\s*성질|화학\s*반응에서의\s*동적\s*평형)/.test(conceptText);
    return !!(isChemistry && isBioEng && !excludeOther && isTargetConcept);
  }

  function inferBookA22ChemistryBioengineeringAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel
    ].join(" "));
    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath,
      ctx.keyword
    ].join(" "));
    const resolveFromText = (text) => {
      if (!text) return "";
      // 탄소 화합물의 유용성 - 실제 JSON 축명
      if (/(organic\s*structure\s*axis|유기\s*물질\s*구조\s*해석|유기\s*구조|탄소\s*골격|작용기)/i.test(text)) return "organic_structure";
      if (/(bio\s*material\s*application\s*axis|바이오\s*소재\s*응용|바이오·소재\s*응용|바이오\s*소재|생체\s*분자|고분자)/i.test(text)) return "bio_material_application";
      if (/(safety\s*impact\s*axis|생활\s*안전\s*영향|안전\s*영향|유해성|노출|환경호르몬)/i.test(text)) return "safety_impact";
      // 분자의 구조와 성질 - 실제 JSON 축명
      if (/(molecular\s*shape\s*axis|분자\s*구조\s*극성|분자\s*구조·극성|분자\s*구조|극성\s*축|전자쌍\s*반발|결합각)/i.test(text)) return "molecular_shape";
      if (/(intermolecular\s*force\s*axis|분자\s*사이\s*힘\s*물성|분자\s*사이\s*힘·물성|분자\s*간\s*힘|수소\s*결합|용해도)/i.test(text)) return "intermolecular_force";
      if (/(life\s*material\s*application\s*axis|생활\s*생체\s*물질\s*적용|생활·생체\s*물질\s*적용|생체\s*물질|세포막|생활\s*적용)/i.test(text)) return "life_material_application";
      // 화학 반응에서의 동적 평형 - 실제 JSON 축명 전체 대응
      if (/(body\s*fluid\s*buffer\s*homeostasis\s*axis|체액\s*pH\s*완충\s*항상성|체액\s*pH|완충\s*항상성|혈액\s*pH)/i.test(text)) return "body_fluid_buffer";
      if (/(acid\s*base\s*health\s*management\s*axis|산염기\s*건강\s*관리|산염기·건강\s*관리|건강\s*관리)/i.test(text)) return "acid_base_health";
      if (/(health\s*ph\s*data\s*interpretation\s*axis|건강\s*지표\s*pH\s*데이터\s*해석|pH\s*데이터|건강\s*지표)/i.test(text)) return "health_ph_data";
      if (/(equilibrium\s*analysis\s*axis|평형\s*이동\s*해석|평형\s*해석|르샤틀리에)/i.test(text)) return "equilibrium_analysis";
      if (/(acid\s*base\s*environment\s*axis|산염기\s*환경\s*조절|산염기·환경\s*조절|환경\s*조절|수질)/i.test(text)) return "acid_base_environment";
      if (/(process\s*optimization\s*axis|공정\s*최적화|공정\s*제어|최적화)/i.test(text)) return "process_optimization";
      return "";
    };
    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    if (/탄소\s*화합물의\s*유용성/.test(conceptText)) return "bio_material_application";
    if (/분자의\s*구조와\s*성질/.test(conceptText)) return "life_material_application";
    if (/화학\s*반응에서의\s*동적\s*평형/.test(conceptText)) return "body_fluid_buffer";
    return "";
  }

  function buildLockedBookContextA22ChemistryBioengineering(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      organic_structure: "유기 물질 구조 해석 축",
      bio_material_application: "바이오·소재 응용 축",
      safety_impact: "생활 안전·영향 축",
      molecular_shape: "분자 구조·극성 축",
      intermolecular_force: "분자 사이 힘·물성 축",
      life_material_application: "생활·생체 물질 적용 축",
      body_fluid_buffer: "체액 pH·완충 항상성 축",
      acid_base_health: "산염기·건강 관리 축",
      health_ph_data: "건강 지표·pH 데이터 해석 축",
      equilibrium_analysis: "평형 이동 해석 축",
      acid_base_environment: "산염기·환경 조절 축",
      process_optimization: "공정 최적화 축"
    };
    const axisUseMap = {
      organic_structure: { direct: "탄소 골격, 작용기, 구조식을 유기 물질의 성질 차이와 연결해 설명할 때 활용합니다.", role: ["탄소 골격", "작용기", "유기 구조"] },
      bio_material_application: { direct: "탄소 화합물과 고분자·생체 분자 구조를 바이오 소재와 생명공학 응용 사례로 확장할 때 활용합니다.", role: ["생체 분자", "바이오 소재", "응용 사례"] },
      safety_impact: { direct: "생활 화학물질의 유용성과 유해성, 노출 위험, 환경 영향을 함께 판단할 때 활용합니다.", role: ["생활 안전", "유해성", "환경 영향"] },
      molecular_shape: { direct: "분자 구조, 결합각, 극성을 생체 분자의 구조적 차이와 기능 해석으로 연결할 때 활용합니다.", role: ["분자 구조", "극성", "구조 기능"] },
      intermolecular_force: { direct: "수소 결합, 분자 사이 힘, 용해도를 단백질·세포막·생체 물질의 물성 차이로 설명할 때 활용합니다.", role: ["분자 사이 힘", "용해도", "물성"] },
      life_material_application: { direct: "분자 구조와 극성을 생체막, 생활 소재, 바이오 물질 적용 사례와 연결할 때 활용합니다.", role: ["생체 물질", "세포막", "생활 적용"] },
      body_fluid_buffer: { direct: "pH, 완충 용액, 산염기 평형을 체액 환경과 세포 항상성 유지 원리로 설명할 때 활용합니다.", role: ["체액 pH", "완충", "항상성"] },
      acid_base_health: { direct: "산·염기와 pH 조건을 세포 환경, 효소 활성, 건강 관리 기준으로 연결할 때 활용합니다.", role: ["산염기", "세포 환경", "건강 관리"] },
      health_ph_data: { direct: "pH와 농도 측정값을 생명 현상 자료 해석과 건강 지표 비교로 정리할 때 활용합니다.", role: ["pH 데이터", "건강 지표", "자료 해석"] },
      equilibrium_analysis: { direct: "동적 평형과 조건 변화를 생화학 반응의 방향성, 대사 조건 변화로 해석할 때 활용합니다.", role: ["동적 평형", "조건 변화", "생화학 반응"] },
      acid_base_environment: { direct: "pH, 산염기, 완충 작용을 수질·생체 환경 조절 문제로 확장할 때 활용합니다.", role: ["산염기", "환경 조절", "생체 환경"] },
      process_optimization: { direct: "평형 조건과 반응 조건 제어를 바이오공정의 수율과 조건 최적화 관점으로 설명할 때 활용합니다.", role: ["바이오공정", "조건 제어", "최적화"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.bio_material_application;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 화학 개념을 생체 분자·세포 환경·바이오 소재 응용 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 생명공학의 윤리, 안전성, 환경 영향, 기술 적용 한계로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["바이오 확장", "안전·윤리 비교", "적용 한계"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 화학 개념을 생체 분자 구조, 분자 상호작용, pH·완충, 바이오 소재 응용 중 하나의 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 생명공학 안전성·윤리·환경 영향 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "고등학교 화학 개념을 생명공학 사례에 적용할 때 생체 내 조건, 변수 통제, 안전성, 윤리적 판단이 함께 필요하다는 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 생체 분자, 바이오 소재, 세포 환경, 바이오공정, 건강·환경 영향으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA22ChemistryBioengineeringRank: rank,
      bookA22ChemistryBioengineeringAxis: axisId
    };
  }

  function cloneBookForA22ChemistryBioengineeringLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6180 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`생명공학·바이오계열 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA22ChemistryBioengineering(book, ctx, sectionType, axisId, rank),
      bookA22ChemistryBioengineeringLock: true,
      bookA22ChemistryBioengineeringLockRank: rank,
      bookA22ChemistryBioengineeringAxisLock: axisId
    };
  }

  function applyBookA22ChemistryBioengineeringLock(result, ctx){
    if (!result || !isBookA22ChemistryBioengineeringContext(ctx)) return result;
    const axisId = inferBookA22ChemistryBioengineeringAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      organic_structure: ["같기도 하고 아니 같기도 하고", "부분과 전체", "이중나선"],
      bio_material_application: ["이중나선", "이기적 유전자", "같기도 하고 아니 같기도 하고"],
      safety_impact: ["침묵의 봄", "팩트풀니스", "객관성의 칼날"],
      molecular_shape: ["같기도 하고 아니 같기도 하고", "부분과 전체", "이중나선"],
      intermolecular_force: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "부분과 전체"],
      life_material_application: ["이중나선", "부분과 전체", "객관성의 칼날"],
      body_fluid_buffer: ["부분과 전체", "객관성의 칼날", "같기도 하고 아니 같기도 하고"],
      acid_base_health: ["객관성의 칼날", "팩트풀니스", "침묵의 봄"],
      health_ph_data: ["객관성의 칼날", "팩트풀니스", "20세기 수학의 다섯가지 황금률"],
      equilibrium_analysis: ["객관성의 칼날", "같기도 하고 아니 같기도 하고", "20세기 수학의 다섯가지 황금률"],
      acid_base_environment: ["침묵의 봄", "팩트풀니스", "객관성의 칼날"],
      process_optimization: ["공학이란 무엇인가", "경영학 콘서트", "객관성의 칼날"]
    };
    const expansionMap = {
      organic_structure: ["이기적 유전자", "종의 기원", "객관성의 칼날", "신약의 탄생", "침묵의 봄"],
      bio_material_application: ["부분과 전체", "신약의 탄생", "종의 기원", "객관성의 칼날", "침묵의 봄"],
      safety_impact: ["오래된 미래", "우리 시대의 동물 해방", "사피엔스", "이기적 유전자", "공학이란 무엇인가"],
      molecular_shape: ["이기적 유전자", "신약의 탄생", "객관성의 칼날", "침묵의 봄", "종의 기원"],
      intermolecular_force: ["이중나선", "신약의 탄생", "침묵의 봄", "팩트풀니스", "종의 기원"],
      life_material_application: ["같기도 하고 아니 같기도 하고", "신약의 탄생", "침묵의 봄", "이기적 유전자", "팩트풀니스"],
      body_fluid_buffer: ["이중나선", "신약의 탄생", "팩트풀니스", "침묵의 봄", "종의 기원"],
      acid_base_health: ["부분과 전체", "이중나선", "신약의 탄생", "종의 기원", "공학이란 무엇인가"],
      health_ph_data: ["부분과 전체", "이중나선", "신약의 탄생", "공학이란 무엇인가", "침묵의 봄"],
      equilibrium_analysis: ["부분과 전체", "이중나선", "공학이란 무엇인가", "팩트풀니스", "침묵의 봄"],
      acid_base_environment: ["부분과 전체", "이중나선", "공학이란 무엇인가", "오래된 미래", "종의 기원"],
      process_optimization: ["부분과 전체", "팩트풀니스", "이중나선", "침묵의 봄", "종의 기원"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA22ChemistryBioengineeringLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA22ChemistryBioengineeringLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA22ChemistryBioengineeringLock: axisId,
        bookA22ChemistryBioengineeringDirectTitles: directBooks.map(book => book.title),
        bookA22ChemistryBioengineeringExpansionTitles: expansionBooks.map(book => book.title)
      }
    };
  }



  // v155 CHEM-FOOD-lock: 화학+식품공학/식품생명공학/식품영양 계열은 실제 textbook_concept_helper.js의
  // 식품 전용 4번 축(식품 성분·영양 구조 / 식품 물성·용해도 / 식품 pH·보존 안정성 / 식품 농도·정량 분석 / 식품 열처리·품질 변화) 기준으로 5번 도서 매칭을 잠근다.
  // 실제 데이터에 존재하는 학과명만 대상으로 하며, 3번·4번 구조는 건드리지 않는다.
  function isBookA23ChemistryFoodContext(ctx){
    ctx = ctx || {};
    const subjectText = normalizeLockText(ctx.subject || "");
    const careerText = normalizeLockText([ctx.career, ctx.selectedMajor, ctx.department].join(" "));
    const conceptText = normalizeLockText(ctx.concept || "");
    const isChemistry = /화학/.test(subjectText);
    const isFood = /(식품공학과|식품공학|식품생명공학과|식품생명공학|식품영양학과|식품영양|영양)/i.test(careerText);
    const excludeOther = /(생명공학과|생명과학과|바이오메디컬공학과|화학공학과|화공생명공학과|제약공학과|약학과|화장품공학과|환경공학과|신소재공학과|고분자공학과)/i.test(careerText);
    const isTargetConcept = /(탄소\s*화합물의\s*유용성|분자의\s*구조와\s*성질|화학\s*반응에서의\s*동적\s*평형|물질의\s*양과\s*화학\s*반응식|화학\s*반응과\s*열의\s*출입)/.test(conceptText);
    return !!(isChemistry && isFood && !excludeOther && isTargetConcept);
  }

  function inferBookA23ChemistryFoodAxis(ctx){
    ctx = ctx || {};
    const conceptText = normalizeLockText(ctx.concept || "");
    const primaryAxisText = normalizeLockText([
      ctx.followupAxisId,
      ctx.linkTrack,
      ctx.axisLabel
    ].join(" "));
    const secondaryAxisText = normalizeLockText([
      ctx.axisDomain,
      Array.isArray(ctx.linkedSubjects) ? ctx.linkedSubjects.join(" ") : "",
      ctx.activityExample,
      ctx.longitudinalPath,
      ctx.keyword
    ].join(" "));
    const resolveFromText = (text) => {
      if (!text) return "";
      if (/(food\s*nutrient\s*structure\s*axis|식품\s*성분\s*영양\s*구조\s*해석|식품\s*성분|영양\s*구조|탄수화물|단백질|지질|영양소)/i.test(text)) return "food_nutrient_structure";
      if (/(food\s*solubility\s*texture\s*axis|식품\s*물성\s*용해도\s*해석|식품\s*물성|용해도|점성|유화|수분\s*보유)/i.test(text)) return "food_solubility_texture";
      if (/(food\s*ph\s*preservation\s*axis|식품\s*pH\s*보존\s*안정성|pH\s*보존|보존\s*안정성|산도|발효|부패|미생물)/i.test(text)) return "food_ph_preservation";
      if (/(food\s*concentration\s*quant\s*axis|식품\s*농도\s*정량\s*분석|농도\s*정량|당도|염도|희석|시료\s*분석)/i.test(text)) return "food_concentration_quant";
      if (/(food\s*heat\s*quality\s*axis|식품\s*열처리\s*품질\s*변화|열처리|품질\s*변화|갈변|가열|냉각|산화)/i.test(text)) return "food_heat_quality";
      return "";
    };
    let axisId = resolveFromText(primaryAxisText) || resolveFromText(secondaryAxisText);
    if (axisId) return axisId;
    if (/탄소\s*화합물의\s*유용성/.test(conceptText)) return "food_nutrient_structure";
    if (/분자의\s*구조와\s*성질/.test(conceptText)) return "food_solubility_texture";
    if (/화학\s*반응에서의\s*동적\s*평형/.test(conceptText)) return "food_ph_preservation";
    if (/물질의\s*양과\s*화학\s*반응식/.test(conceptText)) return "food_concentration_quant";
    if (/화학\s*반응과\s*열의\s*출입/.test(conceptText)) return "food_heat_quality";
    return "";
  }

  function buildLockedBookContextA23ChemistryFood(book, ctx, sectionType, axisId, rank){
    const title = val(book && book.title);
    const isDirect = sectionType === "direct";
    const axisLabelMap = {
      food_nutrient_structure: "식품 성분·영양 구조 해석 축",
      food_solubility_texture: "식품 물성·용해도 해석 축",
      food_ph_preservation: "식품 pH·보존 안정성 축",
      food_concentration_quant: "식품 농도·정량 분석 축",
      food_heat_quality: "식품 열처리·품질 변화 축"
    };
    const axisUseMap = {
      food_nutrient_structure: { direct: "탄수화물, 단백질, 지질, 작용기를 식품 성분표와 영양소 구조 분석으로 연결할 때 활용합니다.", role: ["식품 성분", "영양 구조", "작용기"] },
      food_solubility_texture: { direct: "분자 구조, 극성, 수소 결합, 분자 사이 힘을 용해도·점성·유화·수분 보유 같은 식품 물성으로 설명할 때 활용합니다.", role: ["식품 물성", "용해도", "분자 사이 힘"] },
      food_ph_preservation: { direct: "pH, 산염기, 완충, 평형 개념을 식품 산도, 발효, 미생물 성장, 보존 안정성과 연결할 때 활용합니다.", role: ["식품 pH", "보존 안정성", "발효"] },
      food_concentration_quant: { direct: "몰 농도, 희석, 정량 분석을 당도·염도·시료 분석과 측정 오차 해석으로 연결할 때 활용합니다.", role: ["농도 계산", "정량 분석", "측정 오차"] },
      food_heat_quality: { direct: "발열·흡열, 산화·환원, 온도 조건을 열처리, 갈변, 저장 안정성, 품질 변화로 설명할 때 활용합니다.", role: ["열처리", "품질 변화", "산화"] }
    };
    const axisLabel = axisLabelMap[axisId] || val(ctx && ctx.axisLabel) || "선택 후속 연계축";
    const axisUse = axisUseMap[axisId] || axisUseMap.food_nutrient_structure;
    const baseContext = book && book.selectedBookContext ? book.selectedBookContext : {};
    return {
      ...baseContext,
      title,
      author: book && book.author || "",
      recommendationType: sectionType,
      recommendationReason: isDirect
        ? `${title}은(는) ${axisLabel}에서 화학 개념을 식품 성분·물성·pH·농도·열처리 중 하나의 식품 분석 관점으로 설명할 때 활용하는 직접 일치 도서입니다.`
        : `${title}은(는) ${axisLabel}에서 식품 안전성, 건강 영향, 공정 관리, 사회적 식생활 문제로 확장하는 참고 도서입니다.`,
      matchReasons: uniq(arr(baseContext.matchReasons).concat([`${axisLabel} ${isDirect ? "직접 일치" : "확장 참고"} 도서`])),
      reportRole: isDirect ? ["conceptExplanation", "analysisFrame", "limitationDiscussion"] : ["conclusionExpansion", "comparisonFrame", "limitationDiscussion"],
      reportRoleLabels: isDirect ? axisUse.role : ["식품 안전", "건강 영향", "품질 관리"],
      useInReport: {
        conceptExplanation: isDirect ? axisUse.direct : "",
        analysisFrame: isDirect ? "선택한 4번 축에 맞춰 화학 개념을 식품 성분, 물성, pH·보존성, 농도·정량, 열처리 품질 변화 중 하나의 분석 프레임으로 구체화합니다." : "",
        comparisonFrame: !isDirect ? "직접 도서와 다른 식품 안전, 건강 영향, 소비자 선택, 품질 관리 관점을 비교할 때 활용합니다." : "",
        limitationDiscussion: "고등학교 화학 개념을 식품 사례에 적용할 때 실제 식품은 혼합물이며 저장 조건, 조리 과정, 미생물, 개인 건강 상태 같은 변수가 함께 작동한다는 한계를 논의할 때 활용합니다.",
        conclusionExpansion: !isDirect ? "결론에서 식품 품질, 보존 안정성, 영양 구조, 안전성, 식생활 데이터 해석으로 확장할 때 활용합니다." : ""
      },
      connectionToPayload: {
        subject: ctx && ctx.subject || "",
        department: ctx && ctx.career || "",
        selectedConcept: ctx && ctx.concept || "",
        selectedKeyword: ctx && ctx.keyword || "",
        followupAxis: axisLabel
      },
      bookA23ChemistryFoodRank: rank,
      bookA23ChemistryFoodAxis: axisId
    };
  }

  function cloneBookForA23ChemistryFoodLock(book, ctx, sectionType, axisId, rank){
    if (!book) return null;
    return {
      ...book,
      matchType: sectionType,
      matchScore: 6180 - rank * 10,
      matchReasons: uniq(arr(book.matchReasons).concat([`식품계열 ${sectionType === "direct" ? "직접 일치" : "확장 참고"} 도서`])),
      selectedBookContext: buildLockedBookContextA23ChemistryFood(book, ctx, sectionType, axisId, rank),
      bookA23ChemistryFoodLock: true,
      bookA23ChemistryFoodLockRank: rank,
      bookA23ChemistryFoodAxisLock: axisId
    };
  }

  function applyBookA23ChemistryFoodLock(result, ctx){
    if (!result || !isBookA23ChemistryFoodContext(ctx)) return result;
    const axisId = inferBookA23ChemistryFoodAxis(ctx);
    if (!axisId) return result;

    const directMap = {
      food_nutrient_structure: ["같기도 하고 아니 같기도 하고", "이중나선", "팩트풀니스"],
      food_solubility_texture: ["같기도 하고 아니 같기도 하고", "객관성의 칼날", "부분과 전체"],
      food_ph_preservation: ["객관성의 칼날", "팩트풀니스", "침묵의 봄"],
      food_concentration_quant: ["객관성의 칼날", "20세기 수학의 다섯가지 황금률", "팩트풀니스"],
      food_heat_quality: ["엔트로피", "침묵의 봄", "객관성의 칼날"]
    };
    const expansionMap = {
      food_nutrient_structure: ["왜 세계의 절반은 굶주리는가", "이기적 유전자", "침묵의 봄", "오래된 미래", "사피엔스"],
      food_solubility_texture: ["팩트풀니스", "침묵의 봄", "공학이란 무엇인가", "경영학 콘서트", "엔트로피"],
      food_ph_preservation: ["같기도 하고 아니 같기도 하고", "부분과 전체", "왜 세계의 절반은 굶주리는가", "오래된 미래", "공학이란 무엇인가"],
      food_concentration_quant: ["경영학 콘서트", "같기도 하고 아니 같기도 하고", "왜 세계의 절반은 굶주리는가", "공학이란 무엇인가", "부분과 전체"],
      food_heat_quality: ["같기도 하고 아니 같기도 하고", "경영학 콘서트", "팩트풀니스", "공학이란 무엇인가", "오래된 미래"]
    };

    const directBooks = arr(directMap[axisId]).map((title, index) =>
      cloneBookForA23ChemistryFoodLock(findBookForLock(title, result), ctx, "direct", axisId, index + 1)
    ).filter(Boolean);

    const directIds = new Set(directBooks.map(book => bookKey(book)));
    const expansionBooks = arr(expansionMap[axisId]).map((title, index) =>
      cloneBookForA23ChemistryFoodLock(findBookForLock(title, result), ctx, "expansion", axisId, index + 1)
    ).filter(book => book && !directIds.has(bookKey(book))).slice(0, 5);

    if (!directBooks.length) return result;

    return {
      ...result,
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || result.selectedBookSummary || null,
      debug: {
        ...(result.debug || {}),
        bookA23ChemistryFoodLock: axisId,
        bookA23ChemistryFoodDirectTitles: directBooks.map(book => book.title),
        bookA23ChemistryFoodExpansionTitles: expansionBooks.map(book => book.title)
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
    result = applyBookA6ConditionalProbabilityLock(result, ctx);
    result = applyBookA7DistributionLock(result, ctx);
    result = applyBookA8InfoDataAnalysisLock(result, ctx);
    result = applyBookA9InfoAlgorithmLock(result, ctx);
    result = applyBookA10InfoProgrammingLock(result, ctx);
    result = applyBookA11InfoAbstractionLock(result, ctx);
    result = applyBookA12InfoRepresentationLock(result, ctx);
    result = applyBookA13InfoSystemNetworkLock(result, ctx);
    result = applyBookA14CalculusDerivativeLock(result, ctx);
    result = applyBookA15CalculusFunctionDerivativeLock(result, ctx);
    result = applyBookA16CalculusSequenceLimitLock(result, ctx);
    result = applyBookA17GeometryLock(result, ctx);
    result = applyBookA18PhysicsLock(result, ctx);
    result = applyBookA19ChemistryComputerLock(result, ctx);
    result = applyBookA20ChemistryMaterialsLock(result, ctx);
    result = applyBookA21ChemistryChemicalEngineeringLock(result, ctx);
    result = applyBookA22ChemistryBioengineeringLock(result, ctx);
    result = applyBookA23ChemistryFoodLock(result, ctx);

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
