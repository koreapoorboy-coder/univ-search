/* mini_worker_generate_bridge_v32.js
 * 기존 Cloudflare Worker(/collect)는 유지하고,
 * 학생용 결과 생성(/generate)은 access-gateway의 /__mini/generate로 보낸다.
 * 이렇게 해야 접속/탐색은 차감하지 않고 학생용 결과 생성 버튼 클릭 시에만 1회 차감된다.
 */
(function(global){
  "use strict";

  const VERSION = "mini-worker-generate-bridge-v230-secondary-expansion-mini-draft-and-evidence-helper";
  const WORKER_BASE_URL = global.__KEYWORD_ENGINE_WORKER_BASE_URL || "https://curly-base-a1a9.koreapoorboy.workers.dev";
  const GENERATE_ENDPOINT = global.__KEYWORD_ENGINE_GENERATE_ENDPOINT || "/__mini/generate";
  const DIRECT_GENERATE_ENDPOINT = global.__KEYWORD_ENGINE_DIRECT_GENERATE_ENDPOINT || `${WORKER_BASE_URL}/generate`;
  const GENERATE_ENDPOINTS = Array.from(new Set([GENERATE_ENDPOINT, DIRECT_GENERATE_ENDPOINT].filter(Boolean)));
  const COLLECT_ENDPOINT = `${WORKER_BASE_URL}/collect`;

  global.__MINI_WORKER_GENERATE_BRIDGE_VERSION__ = VERSION;
  global.__MINI_WORKER_GENERATE_ENDPOINT__ = GENERATE_ENDPOINT;
  global.__MINI_WORKER_GENERATE_FALLBACK_ENDPOINT__ = DIRECT_GENERATE_ENDPOINT;
  global.__MINI_WORKER_GENERATE_ENDPOINTS__ = GENERATE_ENDPOINTS.slice();
  global.__MINI_WORKER_COLLECT_ENDPOINT__ = COLLECT_ENDPOINT;

  function $(id){ return document.getElementById(id); }
  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function nl2br(value){ return escapeHtml(value).replace(/\n/g,"<br>"); }
  function readValue(id){
    const el = $(id);
    if(!el) return "";
    return String(el.value ?? "").trim();
  }
  function show(el, display="block"){
    if(el) el.style.display = display;
  }
  function hide(el){
    if(el) el.style.display = "none";
  }
  function setLoading(isLoading){
    const btn = $("generateBtn");
    const resetBtn = $("resetBtn");
    const loading = $("loadingMessage");
    if(btn){
      btn.disabled = isLoading;
      btn.textContent = isLoading ? "실행 지도 생성 중..." : "탐구 실행 지도 생성";
    }
    if(resetBtn) resetBtn.disabled = isLoading;
    if(loading) loading.style.display = isLoading ? "block" : "none";
  }
  function clearError(){
    const el = $("errorMessage");
    if(el){
      el.innerHTML = "";
      el.style.display = "none";
    }
  }
  function showError(message, detail){
    const el = $("errorMessage");
    if(el){
      el.innerHTML = `<strong>오류</strong><br>${escapeHtml(message)}${detail ? `<pre class="mini-v32-error-detail">${escapeHtml(detail)}</pre>` : ""}`;
      el.style.display = "block";
    }else{
      alert(message);
    }
  }
  function ensureResultRoot(){
    const resultSection = $("resultSection");
    if(resultSection){
      resultSection.style.display = "grid";
    }
    let root = $("contentOutputSection");
    if(!root && resultSection){
      root = document.createElement("div");
      root.id = "contentOutputSection";
      resultSection.appendChild(root);
    }
    return root || document.body;
  }
  function createSessionId(){
    return `session_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
  }

  function getFormValues(){
    return {
      sessionId: createSessionId(),
      schoolName: readValue("schoolName"),
      grade: readValue("grade"),
      subjectGroup: readValue("subjectGroup"),
      subject: readValue("subject"),
      taskName: readValue("taskName") || [readValue("subject"), readValue("taskType") || "탐구보고서"].filter(Boolean).join(" "),
      taskType: readValue("taskType") || "탐구보고서",
      usagePurpose: readValue("usagePurpose") || "학생용 탐구 조립 지도 작성",
      taskDescription: readValue("taskDescription"),
      career: readValue("career"),
      keyword: readValue("keyword"),
      major: readValue("career"),
      track: readValue("career")
    };
  }

  function compactAxis(value){
    const raw = String(value || "").trim();
    if(!raw) return "";
    const m = raw.match(/^(.+?축)(?:\s|$)/);
    return m ? m[1].trim() : raw.split(/\s+/)[0] || raw;
  }

  function getActiveText(selectors){
    for(const sel of selectors){
      const el = document.querySelector(sel);
      if(el && String(el.getAttribute?.("data-value") || "").trim()) return String(el.getAttribute("data-value") || "").trim();
      if(el && String(el.getAttribute?.("data-title") || "").trim()) return String(el.getAttribute("data-title") || "").trim();
      if(el && String(el.textContent || "").trim()) return String(el.textContent || "").trim();
      if(el && String(el.value || "").trim()) return String(el.value || "").trim();
    }
    return "";
  }

  function cleanUiText(value){
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^(선택 개념|추천 키워드|후속 연계축|직접 일치 도서|확장 참고 도서)\s*[:：]?\s*/g, "")
      .replace(/\s*활동 예시:.*$/g, "")
      .trim();
  }

  function isWeakAxis(value){
    const v = String(value || "").trim();
    if(!v) return true;
    if(/^(physics|chemistry|biology|earth|science|math|data|subject|career|keyword|concept)$/i.test(v)) return true;
    if(/^[a-z0-9_-]+$/i.test(v) && !/[가-힣]/.test(v)) return true;
    return false;
  }

  function isWeakKeyword(value){
    const v = String(value || "").trim();
    if(!v) return true;
    if(v.split(/[,，]/).filter(Boolean).length >= 3) return true;
    return false;
  }

  function getBookLastResult(){
    try{ if(typeof window.__BOOK_210_GET_LAST_RESULT__ === "function") return window.__BOOK_210_GET_LAST_RESULT__(); }catch(e){}
    return window.__BOOK_210_LAST_RESULT__ || null;
  }

  function compactTrackTitle(text){
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if(!raw) return "";
    const m = raw.match(/^(.+?축)(?:\s|$)/);
    return cleanUiText(m ? m[1] : raw);
  }

  function getVisibleSelectionSnapshot(){
    const last = getBookLastResult();
    const ctx = last?.ctx || {};
    const subject = readValue("subject") || ctx.subject || "";
    const career = readValue("career") || ctx.career || ctx.department || ctx.selectedMajor || "";
    const concept = getActiveText([
      ".engine-concept-card.is-active[data-concept]",
      ".engine-concept-card.selected[data-concept]",
      ".engine-concept-card.active[data-concept]"
    ]) || ctx.concept || ctx.selectedConcept || "";
    const keyword = getActiveText([
      ".engine-chip.is-active[data-action='keyword'][data-value]",
      ".engine-chip.selected[data-action='keyword'][data-value]",
      ".engine-chip.active[data-action='keyword'][data-value]"
    ]) || ctx.keyword || ctx.selectedKeyword || "";
    const axisTitle = compactTrackTitle(
      getActiveText([
        ".engine-track-card.is-active .engine-track-title",
        ".engine-track-card.selected .engine-track-title",
        ".engine-track-card.active .engine-track-title"
      ]) || ctx.axisLabel || ctx.trackLabel || ctx.linkTrackLabel || ""
    );
    const axisId = getActiveText([
      ".engine-track-card.is-active[data-track]",
      ".engine-track-card.selected[data-track]",
      ".engine-track-card.active[data-track]"
    ]) || ctx.followupAxisId || ctx.linkTrack || "";
    const activeBook = document.querySelector(".engine-book-card.is-active[data-kind='book'], .book-chip.is-active[data-kind='book'], .engine-book-card.selected[data-kind='book'], .book-chip.selected[data-kind='book']");
    const clicked = window.__BOOK_210_LAST_CLICKED_BOOK__ || {};
    const bookValue = String(activeBook?.getAttribute?.("data-value") || clicked.value || ctx.selectedBook || readValue("selectedBookId") || "").trim();
    const bookTitle = cleanUiText(activeBook?.getAttribute?.("data-title") || clicked.title || ctx.selectedBookTitle || readValue("selectedBookTitle") || "");
    return { subject, career, concept: cleanUiText(concept), keyword: cleanUiText(keyword), axisTitle, axisId, bookValue, bookTitle, last };
  }

  function getBookUsageMode(){
    let raw = "";
    try { raw = String(global.__BOOK_USAGE_MODE__ || localStorage.getItem("ke.bookUsageMode.v222") || readValue("bookUsageMode") || "").trim(); } catch(error) { raw = String(global.__BOOK_USAGE_MODE__ || "").trim(); }
    if(!raw) return "";
    return /^(useBook|book|use|도서활용|도서 사용)$/i.test(raw) ? "useBook" : "noBook";
  }

  function hasBookSignal(snap, payload){
    return !!(payload?.selectedBook?.title || snap?.bookTitle || snap?.bookValue);
  }

  function shouldUseBookForSnap(snap, payload){
    const mode = getBookUsageMode();
    const hasBook = hasBookSignal(snap, payload);
    return hasBook && (mode === "useBook" || mode === "");
  }

  function hydrateSelectedBook(payload, snap){
    if(!shouldUseBookForSnap(snap, payload)){
      payload.selectedBook = null;
      payload.bookUsageMode = "noBook";
      payload.useBookInReport = false;
      return;
    }
    if(payload.selectedBook && payload.selectedBook.title) return;
    const result = snap.last?.result || null;
    const all = [].concat(result?.directBooks || [], result?.expansionBooks || []);
    const keys = [snap.bookValue, snap.bookTitle].filter(Boolean);
    let found = null;
    if(all.length && keys.length){
      found = all.find(b => {
        const candidates = [b.sourceId, b.bookId, String(b.managementNo || ""), b.title].map(v => String(v || "").trim());
        return keys.some(k => candidates.includes(k));
      }) || null;
    }
    if(!found && keys[0] && typeof window.getSelectedBookDetail === "function"){
      try{ found = window.getSelectedBookDetail(keys[0]); }catch(e){ found = null; }
    }
    if(found){
      payload.selectedBook = {
        ...found,
        title: found.title || snap.bookTitle || keys[0],
        author: found.author || "",
        selectedBookContext: found.selectedBookContext || found.miniUseGuide || null
      };
    }
  }

  function hydrateMiniPayload(mini, form){
    const payload = JSON.parse(JSON.stringify(mini || {}));
    payload.selectionPayload = payload.selectionPayload || {};
    payload.reportGenerationContext = payload.reportGenerationContext || {};

    const s = payload.selectionPayload;
    const snap = getVisibleSelectionSnapshot();
    s.subject = snap.subject || s.subject || form.subject || readValue("subject");
    s.department = snap.career || s.department || form.career || readValue("career");
    if(snap.concept) s.selectedConcept = snap.concept;
    else s.selectedConcept = s.selectedConcept || getActiveText([
      ".engine-concept-card.is-active[data-concept]",
      ".engine-concept-card.selected[data-concept]",
      ".engine-concept-card.active[data-concept]",
      "#selectedConcept",
      "input[name='selectedConcept']"
    ]);
    if(snap.keyword && !isWeakKeyword(snap.keyword)) s.selectedRecommendedKeyword = snap.keyword;
    else s.selectedRecommendedKeyword = (!isWeakKeyword(s.selectedRecommendedKeyword) ? s.selectedRecommendedKeyword : "") || (!isWeakKeyword(s.selectedKeyword) ? s.selectedKeyword : "") || (!isWeakKeyword(form.keyword) ? form.keyword : "") || getActiveText([
      ".engine-chip.is-active[data-action='keyword'][data-value]",
      ".engine-chip.selected[data-action='keyword'][data-value]",
      ".engine-chip.active[data-action='keyword'][data-value]"
    ]);
    s.selectedKeyword = s.selectedRecommendedKeyword || s.selectedKeyword || "";
    if(snap.axisTitle) s.followupAxis = snap.axisTitle;
    else if(isWeakAxis(s.followupAxis || s.selectedFollowupAxis)) s.followupAxis = snap.axisId || "";
    else s.followupAxis = s.followupAxis || s.selectedFollowupAxis || "";
    s.selectedFollowupAxis = s.followupAxis || s.selectedFollowupAxis || "";
    s.axisLabel = compactAxis(s.selectedFollowupAxis || s.followupAxis);
    s.reportIntent = s.reportIntent || "학생용 수행평가 탐구보고서 생성";

    hydrateSelectedBook(payload, snap);
    payload.bookUsageMode = payload.selectedBook ? "useBook" : "noBook";
    payload.useBookInReport = !!payload.selectedBook;
    payload.selectionPayload.bookUsageMode = payload.bookUsageMode;
    payload.selectionPayload.useBookInReport = payload.useBookInReport;
    payload.selectionPayload.evidenceSourcePolicy = payload.useBookInReport ? "도서+자료 선택형" : "도서 미사용 자료 중심형";

    payload.reportGenerationContext.selectedBookContext =
      payload.reportGenerationContext.selectedBookContext ||
      payload.selectedBook?.selectedBookContext ||
      null;
    payload.reportGenerationContext.selectedBookUse =
      payload.reportGenerationContext.selectedBookUse ||
      (payload.selectedBook?.selectedBookContext ? {
        title: payload.selectedBook.title,
        recommendationType: payload.selectedBook.selectedBookContext.recommendationType,
        recommendationReason: payload.selectedBook.selectedBookContext.recommendationReason,
        reportRole: payload.selectedBook.selectedBookContext.reportRole,
        reportRoleLabels: payload.selectedBook.selectedBookContext.reportRoleLabels,
        useInReport: payload.selectedBook.selectedBookContext.useInReport,
        miniInstruction: payload.selectedBook.selectedBookContext.miniInstruction,
        doNotUseAs: payload.selectedBook.selectedBookContext.doNotUseAs,
        bestFor: payload.selectedBook.selectedBookContext.bestFor
      } : null);

    let majorContext = payload.major_context || payload.reportGenerationContext.majorContext || null;
    if(!majorContext && typeof global.getMajorEngineSelectionData === "function"){
      try{ majorContext = global.getMajorEngineSelectionData(); }
      catch(e){ majorContext = null; }
    }
    if(!majorContext && global.__MAJOR_ENGINE_SELECTED__){
      majorContext = global.__MAJOR_ENGINE_SELECTED__;
    }
    if(majorContext){
      payload.major_context = majorContext;
      payload.reportGenerationContext.majorContext = majorContext;
    }

    return payload;
  }

  function buildMiniPayload(form){
    let mini = null;
    if(typeof global.__BUILD_MINI_REPORT_PAYLOAD__ === "function"){
      try{ mini = global.__BUILD_MINI_REPORT_PAYLOAD__(); }
      catch(e){ console.warn("mini payload builder failed:", e); }
    }
    return hydrateMiniPayload(mini || {
      version: "fallback-mini-payload-v32",
      source: "keyword-engine",
      selectionPayload: {
        subject: form.subject,
        department: form.career,
        selectedConcept: "",
        selectedRecommendedKeyword: form.keyword,
        selectedKeyword: form.keyword,
        followupAxis: "",
        selectedFollowupAxis: "",
        reportIntent: "학생 실행형 수행평가 탐구 설계서 생성"
      },
      selectedBook: null,
      reportGenerationContext: {}
    }, form);
  }

  function getReportChoices(mini){
    const ctx = mini?.reportGenerationContext || {};
    return ctx.reportChoices || {
      mode: mini?.selectionPayload?.reportMode || readValue("reportMode") || "",
      view: mini?.selectionPayload?.reportView || readValue("reportView") || "",
      line: mini?.selectionPayload?.reportLine || readValue("reportLine") || ""
    };
  }

  function buildReportDatasetPattern(mini){
    const s = mini?.selectionPayload || {};
    const axis = `${s.selectedFollowupAxis || s.followupAxis || ""}`;
    const kw = `${s.selectedKeyword || s.selectedRecommendedKeyword || ""}`;
    const text = `${axis} ${kw}`;
    let pattern = "교과 개념-실제 사례 해석형";
    let refs = ["RPT001", "RPT005"];

    if(/데이터|모델|그래프|통계|예측|시각|측정/.test(text)){
      pattern = "시스템·데이터 판단 기준형";
      refs = ["RPT001", "RPT005", "RPT010"];
    }else if(/기후|대기|해양|지구|환경|폭염|재난/.test(text)){
      pattern = "지구·환경 데이터 해석형";
      refs = ["RPT002", "RPT007"];
    }else if(/물리|에너지|역학|전자기|파동|열역학/.test(text)){
      pattern = "물리·에너지 시스템 해석형";
      refs = ["RPT003", "RPT008"];
    }else if(/세포|생명|유전자|효소|대사|약물|면역/.test(text)){
      pattern = "생명·분자 기전 해석형";
      refs = ["RPT004", "RPT009"];
    }else if(/사회|윤리|정책|규제|쟁점/.test(text)){
      pattern = "사회·정책 쟁점 분석형";
      refs = ["RPT006", "RPT010"];
    }

    return {
      version: "report-dataset-pattern-v32-rpt001-010",
      selectedPattern: pattern,
      referenceReports: refs,
      fixedSections: [
        "중요성",
        "추천 주제",
        "탐구 동기",
        "관련 키워드",
        "실제 적용 및 문제 해결 과정",
        "심화 탐구 발전 방안",
        "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?",
        "이 개념이 무엇이며 어떤 원리인가?",
        "어떤 문제를 해결할 수 있고, 왜 중요한가?",
        "교과목 연계 및 이론적 설명",
        "느낀점",
        "세특 문구 예시",
        "참고문헌 및 자료"
      ],
      writingPrinciples: [
        "단순 교과 설명이 아니라 실제 현상·사례·자료를 먼저 제시한다.",
        "선택한 4번 후속 연계축을 보고서의 해석 기준으로 사용한다.",
        "도서를 선택한 경우에만 도서를 근거 프레임, 비교 관점, 한계 논의, 결론 확장에 배치한다. 도서를 선택하지 않은 경우 공공자료·통계·기사·실험자료를 사용한다.",
        "완성문을 대신 써주지 말고, 학생이 직접 조사·분석·작성할 수 있는 실행형 설계서로 작성한다.",
        "중학생도 이해할 수 있을 정도로 짧고 쉬운 문장으로 쓴다. 어려운 전공 용어는 일상어로 풀어서 쓴다."
      ]
    };
  }

  function buildMiniInstruction(form, mini, pattern){
    const s = mini.selectionPayload || {};
    const book = mini.selectedBook || {};
    const ctx = mini.reportGenerationContext || {};
    const choices = getReportChoices(mini);

    return [
      "너는 고등학생이 바로 이해할 수 있는 쉬운 수행평가 탐구 설계서를 만드는 도우미다.",
      "아래 선택값을 바탕으로 완성 보고서를 대신 쓰지 말고, 학생이 직접 자료를 조사하고 자기 말로 보고서를 완성할 수 있는 실행형 로드맵을 작성하라.",
      "",
      "[절대 조건]",
      "1. 완성 문단을 길게 대신 써주지 않는다. 학생이 직접 채울 수 있는 질문, 자료 수집 계획, 비교 기준, 빈칸형 문장 틀을 제공한다.",
      "2. 같은 주제를 선택한 학생도 결과가 달라질 수 있도록 탐구 질문·조사 범위·비교 기준·결론 방향의 선택지를 반드시 제시한다.",
      "3. 선택한 교과 개념, 추천 키워드, 후속 연계축을 모두 설계서 안에서 역할이 보이게 반영한다.",
      "4. 도서 활용은 선택이다. 선택 도서가 없는 경우 책 제목, 독후감, 도서 요약을 강제로 넣지 않는다.",
      "5. 학과명 자체를 제목이나 결론에 억지로 붙이지 말고, 학과에서 배우는 핵심 개념·이론·사고 과정을 탐구 기준으로 변환해 사용한다.",
      "6. 예: 컴퓨터공학과라면 '컴퓨터공학과에 관심이 있다'가 아니라 입력값, 조건문, 알고리즘, 데이터 처리, 시스템 설계, 오류 검증 같은 개념으로 연결한다.",
      "7. 도서를 선택한 경우에만 독후감이 아니라 해석 렌즈로 안내하고, 도서 미사용형은 공공자료·통계·기사·실험자료 중심으로 안내한다.",
      "8. 내부 데이터명, payload, API, Worker, MINI 같은 표현은 학생 화면에 쓰지 않는다.",
      "",
      "[학생 기본 정보]",
      `학교: ${form.schoolName || "미입력"}`,
      `학년: ${form.grade || "미입력"}`,
      `과목: ${s.subject || form.subject || "미입력"}`,
      `수행평가명: ${form.taskName || "미입력"}`,
      `수행평가 형태: ${form.taskType || "미입력"}`,
      `진로 분야: ${s.department || form.career || "미입력"}`,
      "",
      "[선택 흐름]",
      `교과 개념: ${s.selectedConcept || ""}`,
      `추천 키워드: ${s.selectedKeyword || s.selectedRecommendedKeyword || ""}`,
      `후속 연계축: ${compactAxis(s.selectedFollowupAxis || s.followupAxis || "")}`,
      `도서 활용: ${mini.useBookInReport || mini.bookUsageMode === "useBook" ? ((book.title || "") + (book.author ? " / " + book.author : "")) : "사용하지 않음"}`,
      ...(ctx.secondaryExpansionContext ? [
        "",
        "[2차 확장 방향 선택 구조]",
        "1차 설계값을 바로 보고서로 쓰지 말고, 아래 확장 방향 중 하나를 학생이 다시 선택하게 하라.",
        `확장 방향 후보: ${(ctx.secondaryExpansionContext.paths || []).map(p => p.label).join(" / ")}`,
        `추천 확장 방향: ${((ctx.secondaryExpansionContext.paths || []).find(p => p.isRecommended) || {}).label || "자료 해석형"}`,
        "각 확장 방향마다 탐구 질문, 필요한 자료, 문단 구조, 학생 직접 입력칸, ChatGPT 재활용 프롬프트를 함께 제시하라."
      ] : []),
      ...(ctx.donggukPerformanceFrame ? [
        "",
        "[동국대 수행평가 영역명 기준 반영]",
        "핵심 공식: 수행평가 영역명 = 주제(내용) × 방법",
        `수행평가 영역명: ${ctx.donggukPerformanceFrame.performanceName || ""}`,
        `범주: ${ctx.donggukPerformanceFrame.subjectGroup || ""} / ${ctx.donggukPerformanceFrame.contentCategory || ""} × ${ctx.donggukPerformanceFrame.methodCategory || ""}`,
        `평가 의도: ${ctx.donggukPerformanceFrame.evaluationIntent || ""}`,
        `성취기준 해석: ${ctx.donggukPerformanceFrame.achievementFocus || ""}`
      ] : []),
      ...(ctx.performanceAssessment ? [
        "",
        "[6~8번 선택값의 수행평가 의미]",
        `6번 수행평가 방식: ${ctx.performanceAssessment.method?.reportModeLabel || choices.mode || ""}`,
        `7번 평가 관점·과정 증거: ${ctx.performanceAssessment.evidence?.reportViewLabel || choices.view || ""}`,
        `8번 결과물 수준: ${ctx.performanceAssessment.outputLevel?.reportLineLabel || choices.line || ""}`,
        `중복 방지 규칙: ${(ctx.performanceAssessment.dedupeRules || []).join(" / ")}`
      ] : []),
      "",
      "[학생이 선택한 설계 방향]",
      `수행평가 방식: ${choices.mode || ctx.reportMode || "선택값 기준"}`,
      `평가 관점·과정 증거: ${choices.view || ctx.reportView || "선택값 기준"}`,
      `결과물 수준: ${choices.line || ctx.reportLine || "선택값 기준"}`,
      `선택값 해석: ${ctx.reportChoiceBlueprint?.choiceSummary || "선택값을 보고서 전체에 반영"}`,
      `선택값에 따른 제목 방향: ${ctx.reportChoiceBlueprint?.title || "전개 방식·관점·라인에 따라 제목을 조정"}`,
      `선택값에 따른 비교 표 기준: ${(ctx.reportChoiceBlueprint?.tableRows?.[0] || []).join(" / ") || "선택 관점에 맞춰 표 항목 조정"}`,
      `6~8번 수행평가 작성 지시: ${(ctx.reportChoiceMiniDirective || []).join(" / ") || ctx.reportChoiceInstruction?.studentPreview || "전개 방식·관점·라인을 문단 구조에 반영"}`,
      "",
      "[출력 형식]",
      "다음 구조로 작성하라. 단, 화면에는 학생이 바로 볼 수 있는 실행 지도 형태로 정리한다.",
      "1. 설계서 제목",
      "2. 오늘의 핵심 방향",
      "3. 1단계. 중심 질문 고르기",
      "4. 2차 확장 방향 선택",
      "5. ChatGPT 2차 활용 프롬프트",
      "6. 2단계. 자료 3개 찾기",
      "5. 3단계. 비교 표 만들기",
      "6. 4단계. 보고서에 쓰기",
      "7. 내 말로 바꾸는 문장 틀",
      "8. 도서·진로 연결",
      "9. 제출 전 5분 점검"
    ].join("\n");
  }

  function buildWorkerRequest(){
    const form = getFormValues();
    const mini = buildMiniPayload(form);
    const pattern = buildReportDatasetPattern(mini);

    const s = mini.selectionPayload || {};
    const choice = getReportChoices(mini);

    const reqSubject = s.subject || form.subject || "";
    const reqSubjectGroup = form.subjectGroup || s.subjectGroup || "";
    const reqMajor = s.department || form.career || "";
    const reqConcept = s.selectedConcept || "";
    const reqKeyword = s.selectedKeyword || s.selectedRecommendedKeyword || form.keyword || "";
    const reqAxisRaw = s.selectedFollowupAxis || s.followupAxis || "";
    const reqAxis = compactAxis(reqAxisRaw);
    const reqMajorContext = mini.major_context || mini.reportGenerationContext?.majorContext || null;
    const reqLens = deriveMajorLens(reqMajor, reqMajorContext, `${reqKeyword} ${reqAxisRaw} ${reqConcept} ${reqMajor}`);
    const reqChoiceBlueprint = buildReportChoiceBlueprint({
      mode: choice.mode || s.reportMode,
      view: choice.view || s.reportView,
      line: choice.line || s.reportLine,
      keyword: reqKeyword,
      concept: reqConcept,
      axis: reqAxis,
      lens: reqLens,
      bookTitle: mini.selectedBook?.title || "",
      subject: reqSubject,
      subjectGroup: reqSubjectGroup,
      major: reqMajor
    });
    const reqPerformanceFrame = buildDonggukPerformanceFrame({
      subject: reqSubject,
      subjectGroup: reqSubjectGroup,
      concept: reqConcept,
      keyword: reqKeyword,
      axis: reqAxis,
      mode: choice.mode || s.reportMode,
      view: choice.view || s.reportView,
      line: choice.line || s.reportLine,
      major: reqMajor,
      lens: reqLens
    });
    mini.reportGenerationContext = mini.reportGenerationContext || {};
    mini.reportGenerationContext.reportChoiceBlueprint = reqChoiceBlueprint;
    mini.reportGenerationContext.donggukPerformanceFrame = reqPerformanceFrame;
    const existingPerformanceAssessment = mini.reportGenerationContext.performanceAssessment || {};
    mini.reportGenerationContext.performanceAssessment = {
      version: "dongguk-performance-assessment-v220-worker-subject-group",
      principle: "수행평가 영역명 = 주제(내용) × 방법",
      content: existingPerformanceAssessment.content || {
        source: "3번 교과 개념 + 추천 키워드",
        concept: reqConcept,
        keyword: reqKeyword,
        normalizedContent: `${reqConcept || "교과 개념"} / ${reqKeyword || "추천 키워드"}`
      },
      method: existingPerformanceAssessment.method || {
        source: "4번 후속 연계축 + 6번 수행평가 방식",
        followupAxis: reqAxis,
        reportMode: choice.mode || s.reportMode || "",
        reportModeLabel: reqChoiceBlueprint.modeLabel || choice.mode || ""
      },
      evidence: existingPerformanceAssessment.evidence || {
        source: "7번 평가 관점·과정 증거",
        reportView: choice.view || s.reportView || "",
        reportViewLabel: reqChoiceBlueprint.viewLabel || choice.view || ""
      },
      outputLevel: existingPerformanceAssessment.outputLevel || {
        source: "8번 결과물 수준",
        reportLine: choice.line || s.reportLine || "",
        reportLineLabel: reqChoiceBlueprint.lineLabel || choice.line || ""
      },
      generatedPerformanceName: reqPerformanceFrame.performanceName,
      generatedFocusQuestion: reqPerformanceFrame.focusQuestion,
      dedupeRules: existingPerformanceAssessment.dedupeRules || [
        "제목에서 같은 명사구를 반복하지 않는다.",
        "주제는 한 번만 제시하고 방법은 동사형으로 붙인다.",
        "학과명은 반복하지 말고 전공 사고방식으로 바꾼다."
      ]
    };
    mini.reportGenerationContext.secondaryExpansionContext = mini.reportGenerationContext.secondaryExpansionContext || buildFallbackSecondaryExpansionContext({
      subject: reqSubject,
      major: reqMajor,
      concept: reqConcept,
      keyword: reqKeyword,
      axis: reqAxis,
      mode: choice.mode || s.reportMode,
      view: choice.view || s.reportView,
      line: choice.line || s.reportLine,
      bookTitle: mini.selectedBook?.title || ""
    });

    mini.reportGenerationContext.reportChoiceMiniDirective = [
      `동국대 기준: 수행평가 영역명은 주제(내용) × 방법으로 해석한다.`,
      `6번 수행평가 방식은 ${reqChoiceBlueprint.modeLabel || choice.mode || "선택값"} 기준으로 영역명의 방법과 문단 흐름을 바꾼다.`,
      `7번 평가 관점·과정 증거는 ${reqChoiceBlueprint.viewLabel || choice.view || "선택 관점"} 기준으로 질문과 자료 표를 바꾼다.`,
      `8번 결과물 수준은 ${reqChoiceBlueprint.lineLabel || choice.line || "선택 라인"} 기준으로 분량과 깊이를 조정한다.`,
      `중복 방지: 제목·핵심 질문·결론에서 같은 명사구를 반복하지 않고 주제와 방법을 분리한다.`
    ];

    const miniInstruction = buildMiniInstruction(form, mini, pattern);

    return {
      // 기존 Worker 호환용 최상위 필드
      sessionId: form.sessionId,
      schoolName: form.schoolName,
      grade: form.grade,
      subject: s.subject || form.subject,
      taskName: form.taskName,
      taskType: form.taskType,
      usagePurpose: form.usagePurpose,
      taskDescription: form.taskDescription || miniInstruction,
      career: s.department || form.career,
      major: s.department || form.career,
      track: s.department || form.career,
      keyword: s.selectedKeyword || s.selectedRecommendedKeyword || form.keyword,
      selectedConcept: s.selectedConcept || "",
      selectedKeyword: s.selectedKeyword || s.selectedRecommendedKeyword || "",
      selectedFollowupAxis: s.selectedFollowupAxis || s.followupAxis || "",
      selectedBookTitle: (mini.useBookInReport || mini.bookUsageMode === "useBook") ? (mini.selectedBook?.title || "") : "",
      bookUsageMode: mini.bookUsageMode || mini.selectionPayload?.bookUsageMode || ((mini.selectedBook?.title) ? "useBook" : "noBook"),
      useBookInReport: !!(mini.useBookInReport || mini.selectionPayload?.useBookInReport),

      // 새 MINI 생성용 확장 필드
      mode: "mini_report_generation_v32",
      generationMode: "real_mini_report",
      prompt: miniInstruction,
      miniInstruction,
      mini_payload: mini,
      report_dataset_pattern: pattern,
      report_choices: choice,
      performance_assessment: mini.reportGenerationContext?.performanceAssessment || null,
      dongguk_performance_frame: mini.reportGenerationContext?.donggukPerformanceFrame || null,
      secondary_expansion_context: mini.reportGenerationContext?.secondaryExpansionContext || null,
      reportGenerationContext: mini.reportGenerationContext || {},
      selectedBook: mini.selectedBook || null,

      // Worker가 messages 형태를 받는 경우 대비
      messages: [
        { role: "system", content: "너는 고등학생이 바로 이해할 수 있는 쉬운 수행평가 탐구 설계서를 만드는 전문 도우미다. 완성문을 대신 쓰지 말고, 1차 설계값을 2차 확장 방향으로 분기시키고 학생이 직접 고르고 채우는 로드맵을 제공한다." },
        { role: "user", content: miniInstruction + "\n\n[원본 MINI PAYLOAD]\n" + JSON.stringify(mini, null, 2) }
      ]
    };
  }

  function buildCollectRequest(workerRequest){
    return {
      session_id: workerRequest.sessionId,
      collected_at: new Date().toISOString(),
      school_name: workerRequest.schoolName || "",
      grade: workerRequest.grade || "",
      subject: workerRequest.subject || "",
      task_name: workerRequest.taskName || "",
      task_type: workerRequest.taskType || "",
      usage_purpose: workerRequest.usagePurpose || "",
      career: workerRequest.career || "",
      link_track: workerRequest.selectedFollowupAxis || "",
      concept: workerRequest.selectedConcept || "",
      keyword: workerRequest.selectedKeyword || workerRequest.keyword || "",
      selected_book: workerRequest.selectedBookTitle || "",
      report_mode: workerRequest.report_choices?.mode || "",
      report_view: workerRequest.report_choices?.view || "",
      report_line: workerRequest.report_choices?.line || "",
      mini_payload: workerRequest.mini_payload,
      report_dataset_pattern: workerRequest.report_dataset_pattern,
      secondary_expansion_context: workerRequest.secondary_expansion_context,
      student_input: {
        session_id: workerRequest.sessionId,
        school_name: workerRequest.schoolName || "",
        grade: workerRequest.grade || "",
        subject: workerRequest.subject || "",
        task_name: workerRequest.taskName || "",
        task_type: workerRequest.taskType || "",
        career: workerRequest.career || "",
        selected_concept: workerRequest.selectedConcept || "",
        selected_keyword: workerRequest.selectedKeyword || workerRequest.keyword || "",
        linked_track: workerRequest.selectedFollowupAxis || "",
        selected_book_title: workerRequest.selectedBookTitle || "",
        report_mode: workerRequest.report_choices?.mode || "",
        report_view: workerRequest.report_choices?.view || "",
        report_line: workerRequest.report_choices?.line || ""
      }
    };
  }

  function validateRequest(req){
    const missing = [];
    const checks = [
      ["schoolName", "학교명"],
      ["grade", "학년"],
      ["subject", "과목"],
      ["taskName", "수행평가명"],
      ["taskType", "수행평가 형태"],
      ["career", "희망 진로/학과"],
      ["selectedConcept", "3번 교과 개념"],
      ["selectedKeyword", "3번 추천 키워드"],
      ["selectedFollowupAxis", "4번 후속 연계축"]
    ];
    checks.forEach(([key, label]) => {
      if(!String(req[key] || "").trim()) missing.push(label);
    });

    const choices = req.report_choices || {};
    if(!String(choices.mode || "").trim()) missing.push("6번 수행평가 방식");
    if(!String(choices.view || "").trim()) missing.push("7번 평가 관점·과정 증거");
    if(!String(choices.line || "").trim()) missing.push("8번 결과물 수준");

    return missing;
  }

  function makeHttpError(response, url, text, data){
    const isHtml = /<html[\s>]/i.test(String(text || ""));
    let msg = data?.error || data?.message || "";
    if(!msg && isHtml && response.status === 405){
      msg = `현재 접속 주소에서 생성 엔드포인트가 POST 요청을 받지 못했습니다. (${response.status})`;
    }
    if(!msg && isHtml){
      msg = `생성 엔드포인트가 HTML 오류 페이지를 반환했습니다. (${response.status})`;
    }
    if(!msg){
      msg = data?.text || `요청 실패 (${response.status})`;
    }
    const error = new Error(msg);
    error.status = response.status;
    error.url = url;
    error.rawText = text;
    error.data = data;
    error.isHtml = isHtml;
    return error;
  }


  function stringifyErrorForMiniFallback(error){
    const parts = [
      error?.message,
      error?.rawText,
      error?.data?.error,
      error?.data?.message,
      error?.data?.detail,
      error?.data?.details,
      error?.data?.text,
      error?.url
    ];
    return parts
      .map(v => typeof v === "string" ? v : (v == null ? "" : JSON.stringify(v)))
      .filter(Boolean)
      .join("\n");
  }

  function isMiniAssetFile404(error){
    const text = stringifyErrorForMiniFallback(error);
    return /Failed\s+to\s+load\s+asset\s+file/i.test(text)
      || /admission_grade_level_modifiers\.json/i.test(text)
      || /keyword_cluster_bridge\.json/i.test(text)
      || /raw_keyword\.json/i.test(text)
      || /subject_book_bridge\.json/i.test(text)
      || /textbook_(?:detail|ui_feed)_seed\.json/i.test(text)
      || /Failed\s+to\s+load\s+seed\s+file/i.test(text)
      || /seed\s+file.*404/i.test(text)
      || /asset\s+file.*404/i.test(text);
  }

  function isNetworkFetchError(error){
    const text = stringifyErrorForMiniFallback(error);
    const message = String(error?.message || "");
    return Boolean(error?.network)
      || Number(error?.status || 0) === 0
      || /Failed\s+to\s+fetch/i.test(text)
      || /NetworkError/i.test(text)
      || /Load\s+failed/i.test(text)
      || /CORS/i.test(text)
      || /TypeError/i.test(String(error?.name || "")) && /fetch/i.test(message);
  }

  function makeNetworkFetchError(fetchError, url){
    const err = new Error(fetchError?.message || "Failed to fetch");
    err.name = fetchError?.name || "NetworkFetchError";
    err.url = url;
    err.status = 0;
    err.network = true;
    err.cause = fetchError;
    err.rawText = `${fetchError?.name || "FetchError"}: ${fetchError?.message || "Failed to fetch"}`;
    return err;
  }

  function makeLocalGenerateFallbackResponse(error, endpoint){
    const reason = stringifyErrorForMiniFallback(error).slice(0, 500);
    const network = isNetworkFetchError(error);
    const asset = isMiniAssetFile404(error);
    return {
      ok: true,
      localFallback: true,
      source: network ? "local-payload-render-after-generate-network-fetch-failure" : "local-payload-render-after-generate-seed-or-asset-404",
      endpointTried: endpoint || error?.url || "",
      errorHandled: reason,
      message: network
        ? "원격 생성 엔진 연결 실패를 감지해, 현재 화면 선택값과 동국대 수행평가 구조 기반 로컬 실행 지도로 대체 렌더링했습니다."
        : (asset
          ? "원격 생성 엔진의 보조 seed/asset 파일 404를 감지해, 현재 화면 선택값과 동국대 수행평가 구조 기반 로컬 실행 지도로 대체 렌더링했습니다."
          : "원격 생성 엔진 오류를 감지해, 현재 화면 선택값과 동국대 수행평가 구조 기반 로컬 실행 지도로 대체 렌더링했습니다.")
    };
  }

  async function postJson(url, payload){
    let response;
    try{
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }catch(fetchError){
      throw makeNetworkFetchError(fetchError, url);
    }
    const text = await response.text();
    let data = null;
    try{ data = JSON.parse(text); }
    catch(e){ data = { ok: response.ok, text }; }
    if(!response.ok || data?.ok === false){
      throw makeHttpError(response, url, text, data);
    }
    return data;
  }

  function shouldTryGenerateFallback(error, endpoint, index){
    if(index >= GENERATE_ENDPOINTS.length - 1) return false;
    const status = Number(error?.status || 0);
    const isGatewayRelative = String(endpoint || "").startsWith("/");
    return isGatewayRelative && (status === 404 || status === 405 || error?.isHtml);
  }

  async function postGenerateJson(payload){
    let lastError = null;
    for(let i = 0; i < GENERATE_ENDPOINTS.length; i += 1){
      const endpoint = GENERATE_ENDPOINTS[i];
      try{
        const data = await postJson(endpoint, payload);
        global.__LAST_MINI_WORKER_GENERATE_ENDPOINT_USED__ = endpoint;
        return data;
      }catch(error){
        lastError = error;
        if(shouldTryGenerateFallback(error, endpoint, i) || (isNetworkFetchError(error) && i < GENERATE_ENDPOINTS.length - 1)){
          console.warn("v32 generate endpoint fallback:", endpoint, "→", GENERATE_ENDPOINTS[i + 1], error);
          continue;
        }
        if(isMiniAssetFile404(error) || isNetworkFetchError(error)){
          console.warn("v219 generate seed/asset/network fallback detected; render local mini guide instead:", error);
          global.__LAST_MINI_WORKER_GENERATE_ASSET_FALLBACK__ = { endpoint, error: stringifyErrorForMiniFallback(error) };
          return makeLocalGenerateFallbackResponse(error, endpoint);
        }
        throw error;
      }
    }
    if(lastError){
      if(isMiniAssetFile404(lastError) || isNetworkFetchError(lastError)){
        console.warn("v219 final generate seed/asset/network fallback detected; render local mini guide instead:", lastError);
        global.__LAST_MINI_WORKER_GENERATE_ASSET_FALLBACK__ = { endpoint: lastError?.url || "", error: stringifyErrorForMiniFallback(lastError) };
        return makeLocalGenerateFallbackResponse(lastError, lastError?.url || "");
      }
      if(lastError.isHtml && (lastError.status === 404 || lastError.status === 405)){
        throw new Error("탐구 실행 지도 생성 주소가 연결되지 않았습니다. access-gateway 주소 또는 Worker generate 엔드포인트를 확인해주세요.");
      }
      throw lastError;
    }
    throw new Error("탐구 실행 지도 생성 주소가 설정되지 않았습니다.");
  }


  function tryParseJsonText(value){
    if(typeof value !== "string") return null;
    const t = value.trim();
    if(!t || !/^[\[{]/.test(t)) return null;
    try{ return JSON.parse(t); }catch(e){ return null; }
  }

  function looksLikeRawJsonText(value){
    if(typeof value !== "string") return false;
    const t = value.trim();
    if(!t) return false;
    if(/^[\[{][\s\S]*[\]}]$/.test(t)) return true;
    return /"ok"\s*:|"patternRule"\s*:|"clusters"\s*:|"resolved"\s*:|"source"\s*:/.test(t);
  }

  function firstNonEmpty(){
    for(const v of arguments){
      if(typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }


  function cleanDisplayText(value){
    return String(value || "")
      .replace(/\b[a-z][a-z0-9-]*(?:_[a-z0-9-]+)+\b/gi, " ")
      .replace(/\b(?:physics|chemistry|biology|earth|science|math|data|subject|career|report|followup|axis|keyword|concept)\b/gi, " ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
  }

  function cleanReportLine(value){
    return String(value || "")
      .replace(/\b[a-z][a-z0-9-]*(?:_[a-z0-9-]+)+\b/gi, " ")
      .replace(/\b(?:MINI|payload|Worker|API|prompt)\b/gi, " ")
      .replace(/\b(?:physics|chemistry|biology|earth|science|math|data|subject|career|report|followup|axis|keyword|concept)\b/gi, " ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
  }

  function cleanReportText(value){
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map(cleanReportLine)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalizeGeneratedCandidate(value){
    if(value == null) return "";
    if(typeof value === "string"){
      const parsed = tryParseJsonText(value);
      if(parsed) return normalizeGeneratedCandidate(parsed);
      return value.trim();
    }
    if(typeof value === "object"){
      const candidates = [
        value.report,
        value.reportText,
        value.report_text,
        value.generatedReport,
        value.generated_report,
        value.finalReport,
        value.final_report,
        value.studentReport,
        value.student_report,
        value.content,
        value.text,
        value.output,
        value.generated,
        value.generatedText,
        value.answer,
        value.message,
        value.response,
        value.data?.report,
        value.data?.result,
        value.data?.content,
        value.data?.text,
        value.data?.output,
        value.data?.generatedReport,
        value.data?.studentReport,
        value.result?.report,
        value.result?.content,
        value.result?.text,
        value.result?.output,
        value.result?.generatedReport,
        value.result?.studentReport,
        value.openai?.choices?.[0]?.message?.content,
        value.choices?.[0]?.message?.content,
        value.choices?.[0]?.text
      ];
      for(const c of candidates){
        const out = normalizeGeneratedCandidate(c);
        if(out && !looksLikeRawJsonText(out)) return out;
      }
    }
    return "";
  }

  function getWorkerResolved(rawData){
    if(!rawData || typeof rawData !== "object") return {};
    return rawData.resolved || rawData.data?.resolved || rawData.result?.resolved || rawData.output?.resolved || {};
  }

  function getWorkerPatternRule(rawData){
    if(!rawData || typeof rawData !== "object") return null;
    return rawData.patternRule || rawData.pattern_rule || rawData.data?.patternRule || rawData.result?.patternRule || null;
  }

  function getSelectedBookUse(req){
    return req?.mini_payload?.reportGenerationContext?.selectedBookUse || req?.mini_payload?.selectedBook?.selectedBookContext || req?.selectedBook?.selectedBookContext || null;
  }

  function buildReportTitle(req, rawData){
    const s = req?.mini_payload?.selectionPayload || {};
    const kw = s.selectedKeyword || req.keyword || getWorkerResolved(rawData).keyword || "선택 키워드";
    const major = s.department || req.career || getWorkerResolved(rawData).major || "선택 학과";
    const view = req.report_choices?.view || s.reportView || "자료 해석";
    if(/판단|자료|데이터|모델|시스템/.test(`${req.selectedFollowupAxis} ${view}`)){
      return `${kw}를 자료로 해석해 ${major} 관점의 판단 기준 세우기`;
    }
    if(/비교/.test(view)) return `${kw}의 원리와 실제 사례를 비교해 ${major} 관점으로 해석하기`;
    if(/진로|전공/.test(view)) return `${kw}를 ${major} 진로 문제와 연결한 확장 탐구`;
    return `${kw}의 핵심 개념과 실제 적용을 중심으로 한 탐구보고서`;
  }

  function uniqClean(list){
    const seen = new Set();
    const out = [];
    (list || []).forEach(v => {
      const t = String(v || "").replace(/\s+/g, " ").trim();
      if(!t || seen.has(t)) return;
      seen.add(t);
      out.push(t);
    });
    return out;
  }

  function getMajorContext(req){
    const mini = req?.mini_payload || {};
    const ctx = mini.major_context || mini.reportGenerationContext?.majorContext || req?.major_context || null;
    if(ctx && (ctx.status === "resolved" || ctx.display_name || (ctx.core_keywords || []).length)) return ctx;
    if(typeof global.getMajorEngineSelectionData === "function"){
      try{
        const data = global.getMajorEngineSelectionData();
        if(data && (data.status === "resolved" || data.display_name || (data.core_keywords || []).length)) return data;
      }catch(e){}
    }
    return global.__MAJOR_ENGINE_SELECTED__ || null;
  }

  function deriveMajorLens(majorName, majorContext, allText){
    const rawKeywords = uniqClean([
      ...(majorContext?.core_keywords || []),
      ...(majorContext?.related_subject_hints || []),
      ...(majorContext?.inquiry_topics_raw || []).flatMap(v => String(v || "").split(/[·,\/]/)),
      majorName
    ]).slice(0, 12);
    const hay = `${majorName || ""} ${allText || ""} ${rawKeywords.join(" ")} ${majorContext?.major_intro || ""}`;
    const lens = {
      displayName: majorName || majorContext?.display_name || "선택 진로 분야",
      domainLabel: "자료 해석·판단 기준",
      shortLabel: "자료 기반 판단",
      process: "자료 수집 → 기준 설정 → 비교·해석 → 결론 검증",
      concepts: rawKeywords.length ? rawKeywords.slice(0, 6) : ["자료 수집", "비교 기준", "근거 해석", "문제 해결"],
      actions: ["자료를 모은다", "비교 기준을 세운다", "결과 차이를 해석한다", "한계를 점검한다"],
      warning: "학과명을 결론에 붙이는 방식이 아니라, 전공에서 쓰는 사고방식을 보고서의 분석 기준으로 사용한다."
    };

    if(/컴퓨터|소프트웨어|인공지능|AI|데이터사이언스|정보보호|프로그래밍|알고리즘|시스템|네트워크/i.test(hay)){
      lens.domainLabel = "데이터 처리·시스템 설계";
      lens.shortLabel = "입력값·조건문·알고리즘";
      lens.process = "입력값 정하기 → 조건문 만들기 → 판단 결과 비교 → 오류·예외 검증";
      lens.concepts = uniqClean(["입력값", "조건문", "알고리즘", "데이터 처리", "시스템 설계", "오류 검증", ...rawKeywords]).slice(0, 7);
      lens.actions = [
        "기온·습도·체감온도처럼 판단에 필요한 입력값을 정한다",
        "주의보를 내릴 조건을 조건문처럼 표현한다",
        "기준을 바꾸면 판단 결과가 어떻게 달라지는지 비교한다",
        "예외 상황과 오류 가능성을 찾아 기준을 보완한다"
      ];
    }else if(/간호|보건|의학|임상|치료|약학|생명|바이오|의공/i.test(hay)){
      lens.domainLabel = "위험 요인·근거 기반 판단";
      lens.shortLabel = "근거 기반 건강 판단";
      lens.process = "증상·현상 확인 → 위험 요인 분류 → 근거 자료 비교 → 예방·관리 방향 제안";
      lens.concepts = uniqClean(["위험 요인", "생체 반응", "예방", "근거 자료", "관리 기준", ...rawKeywords]).slice(0, 7);
      lens.actions = ["관련 현상의 원인과 조건을 구분한다", "위험 요인을 자료로 비교한다", "예방 또는 관리 기준을 제안한다", "개인차와 한계를 함께 쓴다"];
    }else if(/화학|신소재|재료|에너지|배터리|전지|반도체|전자|전기|기계|로봇/i.test(hay)){
      lens.domainLabel = "구조·성능·공정 최적화";
      lens.shortLabel = "공학적 설계 사고";
      lens.process = "구조·조건 파악 → 성능 지표 설정 → 조건 변화 비교 → 개선 방향 설계";
      lens.concepts = uniqClean(["구조", "성능", "효율", "안정성", "공정", "최적화", ...rawKeywords]).slice(0, 7);
      lens.actions = ["결과에 영향을 주는 조건을 찾는다", "성능이나 안정성 기준을 세운다", "조건 변화에 따른 차이를 비교한다", "개선 가능한 설계 방향을 제안한다"];
    }else if(/도시|건축|주거|환경|토목|지구환경|대기|기후/i.test(hay)){
      lens.domainLabel = "공간·환경 시스템 분석";
      lens.shortLabel = "공간·환경 설계 사고";
      lens.process = "현장 조건 확인 → 공간·환경 변수 설정 → 지역 차이 비교 → 개선 기준 제안";
      lens.concepts = uniqClean(["공간", "환경 변수", "안전", "쾌적성", "지역 차이", "인프라", ...rawKeywords]).slice(0, 7);
      lens.actions = ["지역이나 공간 조건을 구분한다", "환경 변수를 비교 기준으로 삼는다", "생활 영향과 위험을 함께 해석한다", "개선 기준을 제안한다"];
    }else if(/경영|경제|국제|통상|행정|정책|법|미디어|커뮤니케이션|심리/i.test(hay)){
      lens.domainLabel = "의사결정·사회적 영향 분석";
      lens.shortLabel = "사회적 판단 기준";
      lens.process = "문제 상황 확인 → 이해관계·자료 비교 → 판단 기준 설정 → 의사결정 방향 제안";
      lens.concepts = uniqClean(["의사결정", "이해관계", "자료 해석", "효과 분석", "사회적 영향", ...rawKeywords]).slice(0, 7);
      lens.actions = ["관련 집단과 영향을 구분한다", "판단 근거 자료를 비교한다", "사회적 효과와 한계를 함께 쓴다", "실행 가능한 의사결정 기준을 제안한다"];
    }
    lens.keywords = uniqClean(lens.concepts).slice(0, 7);
    return lens;
  }

  function makeMajorBridgeRows(lens, keyword){
    const rows = [
      [lens.keywords[0] || lens.shortLabel, "탐구 대상을 어떤 구조로 나눠 볼지 정하는 기준", `${keyword}를 하나의 사례가 아니라 여러 조건이 연결된 구조로 분해한다.`],
      [lens.keywords[1] || "기준 설정", "자료를 비교할 때 사용할 판단 기준", "무엇을 기준으로 위험·차이·효과를 판단할지 먼저 정한다."],
      [lens.keywords[2] || "자료 처리", "수집한 자료를 표·그래프·비교 항목으로 바꾸는 방법", "자료를 단순 나열하지 않고 비교 가능한 형태로 정리한다."],
      [lens.keywords[3] || "검증", "결론이 항상 맞는지 확인하는 장치", "예외 상황, 한계, 추가 자료 필요성을 마지막에 점검한다."]
    ];
    return rows;
  }


  function deriveBookGuide(bookTitle, keyword, concept, axis, lens){
    const title = cleanDisplayText(bookTitle || "선택 도서");
    const hay = `${title} ${keyword} ${concept} ${axis} ${(lens?.keywords || []).join(" ")}`;
    let guide = {
      reason: `『${title}』는 ${keyword}를 단순 사례로 끝내지 않고, “왜 이런 기준으로 보아야 하는가”를 설명해 주는 책이다. 보고서에서는 책 내용을 요약하기보다, 내 탐구 기준을 세우는 관점으로 사용한다.`,
      content: `책에서 가져올 핵심은 하나의 현상을 한쪽에서만 보지 않고, 원인·조건·관계·한계를 함께 살피는 태도이다.`,
      topicLink: `${keyword}를 볼 때도 한 가지 자료만으로 결론을 내리지 않고, 여러 조건을 비교해 더 설득력 있는 판단 기준을 세우는 방향으로 연결한다.`,
      position: `서론 끝에서는 “왜 이 기준이 필요한가”를 설명할 때, 결론에서는 “내 기준의 한계와 보완점”을 말할 때 짧게 넣는다.`,
      sentence: `『${title}』를 통해 하나의 현상은 단일한 기준만으로 판단하기 어렵다는 점을 생각하게 되었다. 그래서 이번 탐구에서는 ${keyword}를 ${axis} 관점에서 여러 자료와 조건으로 나누어 비교해 보았다.`,
      caution: `책의 줄거리나 감상을 길게 쓰지 말고, 내 탐구 기준을 세운 이유를 설명하는 근거로만 사용한다.`
    };

    if(/부분과\s*전체|part\s*and\s*whole|하이젠베르크/i.test(hay)){
      guide = {
        reason: `『부분과 전체』는 “부분 자료 하나만으로 전체를 판단해도 되는가?”라는 질문을 던질 때 쓰기 좋다. 이번 탐구도 ${keyword}를 단순히 하나의 수치로 판단하는 것이 충분한지 묻고 있으므로, 책의 관점이 탐구 출발점과 잘 맞는다.`,
        content: `책에서 가져올 부분은 하이젠베르크가 과학을 단순한 공식 암기가 아니라 관찰, 측정, 해석의 관계 속에서 이해해야 한다고 말하는 흐름이다. 핵심은 “측정값은 그 값이 나온 조건과 함께 보아야 한다”는 점이다.`,
        topicLink: `${keyword}도 기온처럼 눈에 보이는 한 가지 자료만으로 판단하면 부족할 수 있다. 습도, 체감온도, 지속 시간, 피해 사례처럼 여러 조건을 함께 볼 때 판단 기준이 더 설득력 있어진다는 방향으로 연결한다.`,
        position: `서론 마지막에 “왜 한 가지 기준만으로는 부족한가”를 설명할 때 넣거나, 결론에서 “내가 세운 기준의 한계와 보완점”을 말할 때 넣는다.`,
        sentence: `『부분과 전체』에서 과학적 판단은 하나의 값만 보는 것이 아니라 관찰 조건과 전체 관계 속에서 이루어진다는 점에 주목했다. 그래서 이번 탐구에서는 ${keyword}를 기온 하나가 아니라 습도, 체감온도, 지속 시간 같은 조건과 함께 비교해 보았다.`,
        caution: `이 책을 독후감처럼 요약하면 탐구와 멀어진다. “부분 자료만으로 전체를 판단하기 어렵다”는 관점 하나만 뽑아 내 기준을 세운 이유와 연결한다.`
      };
    }else if(/침묵의\s*봄|silent\s*spring|레이첼/i.test(hay)){
      guide = {
        reason: `『침묵의 봄』은 한 가지 사건이나 물질이 주변 환경 전체에 어떤 영향을 주는지 보여준다. ${keyword}를 단일 현상으로 보지 않고, 주변 조건과 장기적 영향을 함께 보려는 탐구에 적합하다.`,
        content: `책에서 가져올 부분은 환경 문제를 눈앞의 결과만이 아니라 생물, 토양, 물, 인간 생활이 이어진 전체 영향으로 보아야 한다는 관점이다.`,
        topicLink: `${keyword}도 한 번의 변화나 하나의 수치만으로 판단하지 않고, 누적 영향과 주변 조건까지 함께 보아야 한다는 방향으로 연결한다.`,
        position: `본론에서 피해 사례나 영향 범위를 설명한 뒤, 결론에서 “단일 기준보다 누적 영향과 관계를 함께 봐야 한다”는 근거로 짧게 사용한다.`,
        sentence: `『침묵의 봄』을 통해 하나의 환경 변화가 여러 대상에게 연쇄적으로 영향을 줄 수 있음을 알게 되었다. 그래서 이번 탐구에서도 ${keyword}를 단일 수치보다 관련 조건과 영향 범위를 함께 비교해 보았다.`,
        caution: `책의 역사적 배경을 길게 설명하기보다, 내 탐구가 왜 여러 조건을 함께 보려는지 설명하는 근거로 사용한다.`
      };
    }else if(/이기적\s*유전자|selfish\s*gene|도킨스/i.test(hay)){
      guide = {
        reason: `『이기적 유전자』는 생명 현상을 겉으로 보이는 결과가 아니라 정보, 조건, 선택의 관점에서 해석하게 해 준다. ${keyword}를 조건에 따라 달라지는 결과로 분석할 때 활용할 수 있다.`,
        content: `책에서 가져올 부분은 생명 현상을 개체의 의도보다 유전 정보, 선택 압력, 환경 조건의 관계로 설명하는 관점이다.`,
        topicLink: `${keyword}를 하나의 결과로만 보지 않고, 어떤 조건이 그 결과를 만들었는지 비교하는 방향으로 연결한다.`,
        position: `교과 개념을 설명한 뒤, 특정 현상을 어떤 기준으로 해석할 것인지 밝히는 문단에 사용한다.`,
        sentence: `『이기적 유전자』를 읽으며 생명 현상은 겉으로 보이는 결과보다 그 결과를 만든 정보와 조건을 함께 보아야 한다는 점에 주목했다. 그래서 이번 탐구에서는 ${keyword}를 조건 변화와 결과 차이의 관계로 정리했다.`,
        caution: `책 내용을 생명과학 지식 자랑처럼 쓰지 말고, 탐구에서 사용할 해석 기준 하나만 가져온다.`
      };
    }else if(/엔트로피|entropy|리프킨/i.test(hay)){
      guide = {
        reason: `『엔트로피』는 에너지와 사회 시스템을 효율, 손실, 한계의 관점에서 보게 해 준다. ${keyword}를 단순 결과가 아니라 조건과 한계를 가진 시스템으로 볼 때 활용할 수 있다.`,
        content: `책에서 가져올 부분은 어떤 시스템도 에너지를 쓰는 과정에서 손실과 한계를 가진다는 관점이다.`,
        topicLink: `${keyword}를 결과만 보지 않고, 어떤 조건에서 효율이 떨어지거나 한계가 생기는지 비교하는 방향으로 연결한다.`,
        position: `결론에서 내가 세운 기준의 한계, 또는 더 효율적인 개선 방향을 제안할 때 짧게 넣는다.`,
        sentence: `『엔트로피』를 통해 시스템은 항상 효율과 손실, 한계를 함께 가진다는 점을 생각하게 되었다. 그래서 이번 탐구에서는 ${keyword}를 결과만 보지 않고 조건과 한계까지 함께 비교했다.`,
        caution: `책의 철학적 내용을 길게 설명하지 말고, 효율·손실·한계라는 기준만 탐구에 연결한다.`
      };
    }else if(/팩트풀니스|factfulness|한스\s*로슬링/i.test(hay)){
      guide = {
        reason: `『팩트풀니스』는 감각적 인상보다 실제 자료와 비율을 확인하라는 관점을 제공한다. ${keyword}를 막연한 위험이나 인상으로 판단하지 않고 자료 기반으로 비교할 때 적합하다.`,
        content: `책에서 가져올 부분은 큰 숫자만 보지 말고 비율, 추세, 비교 대상을 함께 보아야 한다는 관점이다.`,
        topicLink: `${keyword}를 설명할 때도 단일 사례보다 기준값, 변화 추세, 비교 집단을 함께 확인하는 방향으로 연결한다.`,
        position: `자료 해석 기준을 세우는 문단이나 결론에서 “내 판단이 인상에 치우치지 않도록 보완했다”는 근거로 사용한다.`,
        sentence: `『팩트풀니스』를 통해 문제를 인상으로 단정하지 않고 실제 자료와 비율로 확인해야 한다는 점에 주목했다. 그래서 이번 탐구에서는 ${keyword}를 여러 자료와 비교 기준으로 나누어 판단했다.`,
        caution: `책의 사례를 길게 소개하지 말고, 자료를 확인하는 태도와 비교 기준만 가져온다.`
      };
    }else if(/생각에\s*관한\s*생각|thinking,?\s*fast|카너먼|kahneman/i.test(hay)){
      guide = {
        reason: `『생각에 관한 생각』은 사람이 빠른 판단을 할 때 편향이 생길 수 있음을 보여준다. ${keyword}를 판단할 때 기준과 예외를 따로 점검하는 탐구에 적합하다.`,
        content: `책에서 가져올 부분은 빠른 직관만으로 판단하면 오류가 생길 수 있고, 판단 기준을 명시적으로 확인해야 한다는 관점이다.`,
        topicLink: `${keyword}를 볼 때도 첫인상이나 단일 조건으로 결론을 내리지 않고, 입력값과 조건, 예외 상황을 나누어 확인하는 방향으로 연결한다.`,
        position: `전공 개념 활용 문단에서 판단 기준을 세우는 이유로 쓰거나, 결론에서 오류 가능성을 점검하는 근거로 사용한다.`,
        sentence: `『생각에 관한 생각』을 통해 빠른 판단에는 오류가 생길 수 있음을 알게 되었다. 그래서 이번 탐구에서는 ${keyword}를 한 가지 조건으로 단정하지 않고 기준과 예외를 나누어 검토했다.`,
        caution: `심리학 이론 설명으로 흐르지 말고, 내 판단 기준의 오류를 줄이는 장치로만 연결한다.`
      };
    }else if(/닥터스\s*씽킹|doctor'?s\s*thinking|그로프먼|groopman/i.test(hay)){
      guide = {
        reason: `『닥터스 씽킹』은 진단과 판단이 근거, 증상, 예외 확인을 통해 이루어진다는 점을 보여준다. ${keyword}를 건강·생명 현상과 연결할 때 활용하기 좋다.`,
        content: `책에서 가져올 부분은 판단 과정에서 증거를 확인하고, 처음 생각한 원인이 틀릴 가능성까지 점검해야 한다는 관점이다.`,
        topicLink: `${keyword}도 단일 원인으로 설명하지 않고 증상, 조건, 위험 요인, 예외를 함께 비교하는 방향으로 연결한다.`,
        position: `본론의 자료 분석 뒤나 결론에서 “판단 근거와 한계를 함께 보았다”는 설명으로 넣는다.`,
        sentence: `『닥터스 씽킹』을 통해 건강 문제를 판단할 때는 증거와 예외를 함께 확인해야 한다는 점을 알게 되었다. 그래서 이번 탐구에서는 ${keyword}의 원인과 조건을 자료로 비교했다.`,
        caution: `의학적 진단처럼 단정하지 말고, 학교 수준에서 자료를 비교해 위험 요인을 정리하는 방식으로만 활용한다.`
      };
    }else if(/미디어의\s*이해|understanding\s*media|맥루한|mcluhan/i.test(hay)){
      guide = {
        reason: `『미디어의 이해』는 같은 정보도 어떤 매체와 전달 방식으로 보이느냐에 따라 의미가 달라질 수 있음을 보여준다. ${keyword}를 정보 전달과 사회적 반응으로 분석할 때 적합하다.`,
        content: `책에서 가져올 부분은 매체가 단순 전달 통로가 아니라 사람들이 정보를 받아들이는 방식에 영향을 준다는 관점이다.`,
        topicLink: `${keyword}를 볼 때도 정보 내용뿐 아니라 전달 방식, 수용자 반응, 오해 가능성을 함께 비교하는 방향으로 연결한다.`,
        position: `자료 분석 문단에서 정보가 제시되는 방식의 차이를 설명하거나, 결론에서 전달 방식의 한계를 말할 때 사용한다.`,
        sentence: `『미디어의 이해』를 통해 정보는 전달 방식에 따라 다르게 받아들여질 수 있음을 생각했다. 그래서 이번 탐구에서는 ${keyword}를 내용뿐 아니라 전달 방식과 반응까지 함께 비교했다.`,
        caution: `미디어 이론을 길게 설명하지 말고, 정보 전달 방식이 판단에 미치는 영향만 가져온다.`
      };
    }else if(/경영학\s*콘서트|경영학콘서트/i.test(hay)){
      guide = {
        reason: `『경영학 콘서트』는 일상 문제를 비용, 선택, 효율, 위험 관리의 관점으로 해석하게 해 준다. ${keyword}를 의사결정 문제로 분석할 때 적합하다.`,
        content: `책에서 가져올 부분은 선택에는 비용과 편익, 위험과 기회가 함께 존재하므로 기준을 세워 판단해야 한다는 관점이다.`,
        topicLink: `${keyword}를 볼 때도 단순 선호가 아니라 비용, 편익, 위험, 지속 가능성을 비교해 의사결정 기준을 세우는 방향으로 연결한다.`,
        position: `본론에서 비교 기준을 세울 때나 결론에서 내가 선택한 기준의 장단점을 설명할 때 사용한다.`,
        sentence: `『경영학 콘서트』를 통해 선택은 단순한 취향이 아니라 비용, 편익, 위험을 함께 따지는 과정임을 알게 되었다. 그래서 이번 탐구에서는 ${keyword}를 여러 기준으로 비교해 판단했다.`,
        caution: `기업 사례를 길게 소개하지 말고, 의사결정 기준을 세우는 관점으로만 사용한다.`
      };
    }
    return guide;
  }


  function normalizeReportModeKey(value){
    const v = String(value || "").trim();
    const hay = v.toLowerCase();
    if(!v) return "standard";
    if(/data|데이터|자료|그래프|모델/.test(hay)) return "data";
    if(/compare|비교|대조/.test(hay)) return "compare";
    if(/application|사례|적용|실생활/.test(hay)) return "application";
    if(/major|전공|진로/.test(hay)) return "major";
    if(/book|도서|책|근거/.test(hay)) return "book";
    if(/principle|원리|과학/.test(hay)) return "principle";
    return hay;
  }

  function normalizeReportLineKey(value){
    const v = String(value || "").trim();
    const hay = v.toLowerCase();
    if(/advanced|심화/.test(hay)) return "advanced";
    if(/standard|확장/.test(hay)) return "standard";
    if(/basic|기본/.test(hay)) return "basic";
    return v || "standard";
  }

  function normalizeReportViewKey(value){
    const v = String(value || "").trim();
    if(!v) return "자료 해석";
    if(/conclusionExpansion/.test(v)) return "사회적 의미";
    if(/comparisonFrame/.test(v)) return "비교";
    if(/limitationDiscussion/.test(v)) return "한계";
    if(/analysisFrame|evidenceFrame/.test(v)) return "자료 해석";
    if(/conceptExplanation/.test(v)) return "원리";
    if(/careerExpansion/.test(v)) return "진로 확장";
    if(/데이터/.test(v)) return "데이터";
    if(/자료/.test(v)) return "자료 해석";
    if(/모델/.test(v)) return "모델링";
    if(/한계|오차|편향/.test(v)) return "한계";
    if(/비교|대조/.test(v)) return "비교";
    if(/사회|정책|윤리|의미/.test(v)) return "사회적 의미";
    if(/진로|전공/.test(v)) return "진로 확장";
    if(/원리/.test(v)) return "원리";
    if(/구조/.test(v)) return "구조";
    if(/기능/.test(v)) return "기능";
    if(/안정/.test(v)) return "안정성";
    if(/효율/.test(v)) return "효율";
    if(/변화/.test(v)) return "변화";
    return v;
  }

  function buildStudentFacingChoiceTableRows({ viewKey, viewProfile, modeProfile, lineProfile, keyword, concept, axis, lens, subject, major }){
    const k = keyword || "선택 키워드";
    const c = concept || "교과 개념";
    const a = axis || "선택 기준";
    const l = lens || { shortLabel:"자료 해석", process:"자료 수집 → 기준 설정 → 해석 → 한계 점검" };
    const subjectHay = `${subject || ""} ${c} ${k}`;
    const majorHay = `${major || ""} ${l.shortLabel || ""} ${(l.keywords || []).join(" ")}`;
    const isWeather = /폭염|기후|주의보|재난|체감온도|날씨|기상/i.test(`${subjectHay} ${a}`);
    const isComputer = /컴퓨터|소프트웨어|정보|알고리즘|AI|인공지능|데이터|시스템|오류|조건문/i.test(majorHay);
    const isHealth = /간호|보건|의학|생명|약학|바이오|건강|질병/i.test(`${majorHay} ${subjectHay}`);
    const isSpaceEnv = /환경|도시|건축|토목|공간|대기|기후/i.test(majorHay);
    const baseHeader = viewProfile?.table || ["비교 항목", "기준 자료", "실제 자료", "내 해석"];

    let rows;
    if(viewKey === "모델링"){
      rows = [
        baseHeader,
        ["입력 변수", isWeather ? "기온·습도·체감온도" : `${k}에 영향을 주는 핵심 조건`, isComputer ? "조건문에 넣을 입력값" : "결과를 바꾸는 변수", "어떤 값을 넣느냐에 따라 판단이 달라진다"],
        ["판단 규칙", "공식 기준 또는 교과 원리", "내가 단순화한 판단 흐름", "모델은 현실을 줄여서 보기 때문에 예외가 생긴다"],
        ["예상 결과", "기준에 따른 판단", "자료를 넣었을 때 달라진 결과", "예상과 실제 차이를 확인한다"],
        ["한계", "모델에 넣지 못한 조건", "추가로 필요한 자료", "다음 탐구에서 보완할 변수를 정한다"]
      ];
    }else if(viewKey === "한계"){
      rows = [
        baseHeader,
        ["가능한 판단", `${k}의 공식 기준으로 판단`, "실제 자료로 판단", "공식 기준이 설명하는 범위를 확인한다"],
        ["놓치는 점", "한 가지 기준이 설명하지 못하는 조건", isWeather ? "습도·지속 시간·취약 지역" : "개인차·지역차·조건차", "빠지는 조건이 있으면 결론이 약해진다"],
        ["보완 자료", "공공기관 기준", "사례·통계·전문기관 자료", "부족한 근거를 다른 자료로 보충한다"],
        ["결론 한계", "내 기준의 장점", "내 기준의 부족한 점", "끝에서 보완 방향을 함께 쓴다"]
      ];
    }else if(viewKey === "비교"){
      rows = [
        baseHeader,
        ["비교 기준", "조건 A", "조건 B", "두 조건의 차이를 먼저 정한다"],
        ["자료 차이", "공식 기준 또는 대표 사례", "지역·기간·대상별 실제 자료", "같은 주제라도 조건이 다르면 결과가 달라진다"],
        ["판단 결과", "한 기준으로 본 결론", "다른 기준을 넣은 결론", "어떤 기준이 더 설득력 있는지 판단한다"],
        ["보완점", "비교가 쉬운 장점", "비교가 놓치는 부분", "결론에서 비교 기준의 한계를 쓴다"]
      ];
    }else if(viewKey === "사회적 의미"){
      rows = [
        baseHeader,
        ["과학/자료 기준", `${c} 또는 공식 기준`, `${k} 관련 실제 자료`, "교과 기준이 생활 판단으로 바뀌는 지점을 본다"],
        ["생활 영향", "수치로 보이는 변화", isWeather ? "건강·이동·학습·노동 영향" : "개인·지역·집단에 미치는 영향", "자료가 실제 삶에서 어떤 의미인지 해석한다"],
        ["사회적 판단", "기준 충족 여부", "대응·정책·안내 필요성", "판단이 개인 문제가 아니라 사회적 선택과 연결된다"],
        ["결론 방향", "교과 개념 설명", "생활·사회 영향까지 포함", "보고서 결론을 실제 문제 해결로 확장한다"]
      ];
    }else if(viewKey === "진로 확장"){
      rows = [
        baseHeader,
        ["교과 개념", c, `${k}를 설명하는 기본 원리`, "교과에서 배운 내용을 출발점으로 둔다"],
        ["전공 개념", l.shortLabel || "전공 사고", l.process || "전공식 분석 과정", "학과명보다 사고 과정을 보여준다"],
        ["확장 자료", "교과서·공식 기준", "전공 소개·기술 기사·사례 자료", "전공에서 어떤 자료를 더 보는지 연결한다"],
        ["후속 방향", "현재 탐구의 결론", "다음에 더 확인할 변수", "탐구가 진로 활동으로 이어지게 만든다"]
      ];
    }else{
      rows = [
        baseHeader,
        ["판단 기준", `${k}의 공식 기준`, isComputer ? "입력값·조건문으로 바꾼 기준" : (isHealth ? "위험 요인·관리 기준" : (isSpaceEnv ? "공간·환경 변수 기준" : "내가 세운 비교 기준")), "기준을 숫자나 조건으로 분명히 만든다"],
        ["중심 자료", modeProfile?.dataRows?.[1]?.[0] || (isWeather ? "기온·습도·체감온도 자료" : "실제 자료"), lineProfile?.dataLabel || "자료 3개", "자료가 결론의 근거가 되도록 배치한다"],
        ["추가 변수", isWeather ? "체감온도·습도·지속 시간" : `${a}와 관련된 추가 조건`, isComputer ? "오류·예외 상황" : (isHealth ? "개인차·취약 요인" : (isSpaceEnv ? "지역·공간 차이" : "조건 차이")), "한 가지 자료로 부족한 이유를 설명한다"],
        ["결론 방향", "자료 차이 확인", viewProfile?.focus || "자료를 해석한다", "내가 선택한 기준의 장점과 한계를 함께 쓴다"]
      ];
    }
    return rows;
  }


  function makeStudentFacingChoicePhrases({ modeKey, viewKey, lineKey, modeProfile, viewProfile, lineProfile, keyword, concept, axis, lens, subject, major }){
    const k = keyword || "선택 키워드";
    const c = concept || "교과 개념";
    const l = lens || { shortLabel:"자료 기반 판단", process:"자료 수집 → 기준 설정 → 비교·해석 → 결론 검증" };
    const hay = `${subject || ""} ${major || ""} ${k} ${c} ${axis || ""} ${l.shortLabel || ""}`;
    const isWeather = /폭염|기후|주의보|재난|체감온도|날씨|기상/i.test(hay);
    const isComputer = /컴퓨터|소프트웨어|정보|알고리즘|AI|인공지능|데이터|시스템|오류|조건문/i.test(hay);
    const isEnv = /환경공학|환경|대기|기후|지구환경/i.test(hay);
    const isUrban = /도시|건축|주거|토목|인프라|공간/i.test(hay);
    const isHealth = /간호|보건|의학|임상|생명|약학|건강|질병/i.test(hay);
    const isBusiness = /경영|경제|마케팅|금융|회계|소비|시장/i.test(hay);
    let routeSummary = "자료를 비교해 판단 기준과 결론 방향을 정한다.";
    let modePlain = "자료를 비교해 판단 근거를 정리한다";
    if(modeKey === "principle"){ routeSummary = `${c}의 핵심 원리를 먼저 정리하고 실제 사례에 적용한다.`; modePlain = "원리를 먼저 설명하고 사례에 적용한다"; }
    else if(modeKey === "compare"){ routeSummary = `두 조건이나 사례를 비교해 ${k} 판단이 어떻게 달라지는지 확인한다.`; modePlain = "두 조건을 비교해 차이를 설명한다"; }
    else if(modeKey === "data"){ routeSummary = `수치·그래프·자료 출처를 추가해 ${k} 판단 기준을 넓힌다.`; modePlain = "수치와 그래프를 근거로 판단한다"; }
    else if(modeKey === "application"){ routeSummary = `실제 생활·지역 사례에 ${c} 개념을 적용해 설명한다.`; modePlain = "실제 사례에 교과 개념을 적용한다"; }
    else if(modeKey === "major"){ routeSummary = `${l.shortLabel} 사고방식으로 교과 개념을 전공 탐구로 확장한다.`; modePlain = `${l.shortLabel} 사고방식으로 확장한다`; }
    else if(modeKey === "book"){ routeSummary = `선택 도서를 기준을 넓히는 근거로 사용해 ${k}를 다시 본다.`; modePlain = "도서 관점으로 판단 기준을 넓힌다"; }
    let judgmentBasis = `${k}의 공식 기준과 실제 자료를 비교해 판단한다.`;
    let majorGuide = `${l.process || "자료 수집 → 기준 설정 → 비교·해석 → 결론 검증"} 흐름으로 자료를 정리한다.`;
    if(isWeather && isComputer){
      judgmentBasis = "기온·습도·체감온도를 입력값으로 두고, 조건을 바꿨을 때 판단 결과와 오류 가능성을 확인한다.";
      majorGuide = "자료를 입력값으로 정리한 뒤 조건문처럼 판단 기준을 세우고, 예외 상황에서 판단이 흔들리는지 점검한다.";
    }else if(isWeather && isEnv){
      judgmentBasis = "기온·습도·노출 시간·취약성을 환경 변수로 보고, 위험도와 저감 기준을 함께 확인한다.";
      majorGuide = "자료를 환경 변수로 나누어 위험 요인, 피해 가능성, 저감 방안을 순서대로 비교한다.";
    }else if(isWeather && isUrban){
      judgmentBasis = "기온 자료를 공간 구조, 녹지, 포장 면적, 인프라 조건과 함께 비교한다.";
      majorGuide = "지역별 공간 조건을 비교해 같은 기온에서도 생활 위험이 달라지는 이유를 설명한다.";
    }else if(isHealth){
      judgmentBasis = "생체 반응, 위험 요인, 관리 기준을 근거 자료로 나누어 판단한다.";
      majorGuide = "증상이나 현상을 관찰 기준으로 나누고, 위험 요인과 관리 방향을 근거 자료로 연결한다.";
    }else if(isBusiness){
      judgmentBasis = "비용, 편익, 위험을 함께 비교해 의사결정 기준을 세운다.";
      majorGuide = "선택 상황을 비용·편익·위험으로 나누고, 어떤 기준이 더 합리적인지 설명한다.";
    }else if(/공학|신소재|재료|전자|전기|기계|화학공학|반도체/i.test(hay)){
      judgmentBasis = "구조, 조건, 성능, 안정성을 비교해 개선 기준을 세운다.";
      majorGuide = "구조와 조건이 결과를 어떻게 바꾸는지 비교하고, 성능과 안정성의 균형을 설명한다.";
    }
    let dataDepthText = "공식 기준, 실제 자료, 비교·검증 자료를 순서대로 배치한다.";
    if(lineKey === "basic") dataDepthText = "공식 기준과 대표 사례 자료를 중심으로 간단히 배치한다.";
    if(lineKey === "advanced") dataDepthText = "공식 기준, 실제 자료, 한계 보완 자료를 함께 배치한다.";
    let tableGuide = viewProfile?.focus || "자료 차이를 근거로 내 해석을 정리한다.";
    if(viewKey === "자료 해석") tableGuide = "기준 자료와 실제 자료의 차이가 내 판단에 어떤 근거가 되는지 정리한다.";
    if(viewKey === "모델링") tableGuide = "입력 변수, 예상 결과, 모델 한계를 나누어 표로 정리한다.";
    if(viewKey === "한계") tableGuide = "가능한 판단과 놓치는 점, 보완 자료를 함께 표에 넣는다.";
    if(viewKey === "비교") tableGuide = "조건 A와 조건 B를 나누어 차이와 해석을 정리한다.";
    if(viewKey === "사회적 의미") tableGuide = "과학 기준이 생활·사회 영향으로 이어지는 지점을 표에 넣는다.";
    if(viewKey === "진로 확장") tableGuide = "교과 개념이 전공 개념으로 확장되는 과정을 표에 넣는다.";
    const paragraphGuide = `${modePlain}. ${tableGuide} ${dataDepthText}`;
    return { routeSummary, judgmentBasis, dataDepthText, tableGuide, paragraphGuide, majorGuide };
  }

  function buildReportChoiceBlueprint({ mode, view, line, keyword, concept, axis, lens, bookTitle, subject, major }){
    const modeKey = normalizeReportModeKey(mode);
    const viewKey = normalizeReportViewKey(view);
    const lineKey = normalizeReportLineKey(line);
    const k = keyword || "선택 키워드";
    const c = concept || "선택 교과 개념";
    const a = axis || "선택한 기준";
    const l = lens || { shortLabel:"자료 해석", process:"자료 수집 → 기준 설정 → 해석 → 한계 점검", keywords:["자료","기준","해석","한계"] };
    const book = bookTitle || "선택 도서";

    const modeProfiles = {
      principle: {
        label:"원리 과학형",
        title:`${k}, 어떤 원리 때문에 이런 기준이 필요할까?`,
        goal:`${c}의 원리를 먼저 설명하고, ${k} 사례가 그 원리와 어떻게 연결되는지 정리한다.`,
        focus:`${k}를 설명하는 핵심 원리는 무엇이고, 그 원리는 실제 판단 기준과 어떻게 이어질까?`,
        q:[`${k}를 설명하는 핵심 원리는 무엇일까?`, `${c} 개념을 적용하면 ${k}의 기준은 어떻게 이해될까?`, `원리 설명만으로 부족한 부분은 어떤 자료로 보완해야 할까?`],
        dataRows:[[`${c} 원리 설명 자료`, "교과서·수업 자료", "서론"], [`${k} 공식 기준 또는 사례`, "공공기관·전문기관 자료", "본론 1"], ["원리 적용의 한계 자료", "기사·실험·비교 사례", "본론 2"]],
        paragraph2:`${c}의 핵심 원리를 먼저 쉬운 말로 정리한 뒤, 그 원리가 ${k} 판단 기준으로 바뀌는 과정을 설명한다.`,
        conclusion:`그래서 나는 ${k}를 설명할 때 사례만 나열하기보다 ${c}의 원리와 실제 자료를 함께 보는 방식이 더 설득력 있다고 정리했다.`
      },
      compare: {
        label:"비교 분석형",
        title:`${k}, 기준을 바꾸면 판단은 어떻게 달라질까?`,
        goal:`두 사례나 두 조건을 정해 ${k}의 판단 결과가 어떻게 달라지는지 비교한다.`,
        focus:`${k}는 어떤 기준으로 비교할 때 차이가 가장 잘 드러날까?`,
        q:[`${k}를 두 기준으로 비교하면 판단 결과가 어떻게 달라질까?`, `조건 A와 조건 B에서 가장 큰 차이는 무엇일까?`, `내가 선택한 비교 기준은 어떤 장점과 한계를 가질까?`],
        dataRows:[["비교 기준 A 자료", "공식 기준·교과서·기관 자료", "서론"], ["비교 기준 B 자료", "공공데이터·통계·사례", "본론 1"], ["차이를 설명할 보조 자료", "기사·전문기관·보고서", "본론 2"]],
        paragraph2:`비교 기준을 먼저 세우고, ${k}를 한쪽 기준으로만 보았을 때와 다른 조건을 함께 보았을 때의 차이를 설명한다.`,
        conclusion:`그래서 나는 ${k}를 판단할 때 한 기준만 고정하기보다 비교 기준을 명확히 세우고 차이를 해석하는 방식이 더 설득력 있다고 정리했다.`
      },
      data: {
        label:"데이터 확장형",
        title:`${k}, 어떤 자료를 함께 볼 때 판단이 달라질까?`,
        goal:`${k}를 수치·자료·그래프 관점에서 해석하고, 변수와 자료 출처에 따라 결론이 어떻게 달라지는지 확인한다.`,
        focus:`${k}를 판단할 때 어떤 자료와 변수를 함께 보아야 할까?`,
        q:[`${k}를 판단할 때 어떤 자료와 변수를 함께 보아야 할까?`, `수치 자료나 그래프를 함께 보면 기존 판단은 어떻게 달라질까?`, `자료 출처나 변수 설정이 달라지면 결론의 한계는 무엇일까?`],
        dataRows:[[`${k}의 공식 기준 자료`, "공공기관·전문기관 자료", "서론"], ["수치·그래프 자료", "공공데이터·통계·관측 자료", "본론 1"], ["비교·검증 자료", "지역별·기간별·사례별 자료", "본론 2"]],
        paragraph2:`자료를 단순 설명으로 쓰지 않고, 변수·수치·그래프가 어떤 판단 근거가 되는지 먼저 밝힌다.`,
        conclusion:`그래서 나는 ${k}를 판단할 때 인상이나 단일 사례보다 자료 출처, 변수, 그래프 해석, 한계를 함께 보는 기준이 더 설득력 있다고 정리했다.`
      },
      application: {
        label:"사례 적용형",
        title:`${k}, 실제 사례에 적용하면 어떤 판단이 가능할까?`,
        goal:`${k}를 실제 생활·지역·학교 사례에 적용해 교과 개념이 문제 해결에 어떻게 쓰이는지 보여준다.`,
        focus:`${k}를 실제 사례에 적용하면 어떤 문제를 설명하거나 해결할 수 있을까?`,
        q:[`${k}를 실제 사례에 적용하면 어떤 문제가 보일까?`, `교과 개념을 적용하기 전과 후에 해석은 어떻게 달라질까?`, `실제 적용에서 생기는 한계와 보완점은 무엇일까?`],
        dataRows:[["적용할 실제 사례", "학교·지역·생활 사례·기사", "서론"], [`${c} 적용 자료`, "교과서·전문기관 자료", "본론 1"], ["적용 결과와 한계 자료", "보도자료·통계·비교 사례", "본론 2"]],
        paragraph2:`내가 고른 실제 사례를 먼저 제시하고, ${c} 개념이 그 사례의 어떤 부분을 설명하는지 연결한다.`,
        conclusion:`그래서 나는 ${k}를 실제 사례에 적용해 보면서 교과 개념이 문제를 설명하고 보완 방향을 찾는 기준이 될 수 있다고 정리했다.`
      },
      major: {
        label:"전공 확장형",
        title:`${k}, ${l.shortLabel} 관점으로 확장하면 무엇이 보일까?`,
        goal:`선택 학과명을 반복하지 않고, ${major || "선택 학과"}에서 쓰는 ${l.shortLabel} 사고방식으로 ${k}를 재해석한다.`,
        focus:`${k}를 ${major || "선택 학과"}의 ${l.shortLabel} 관점으로 보면 어떤 판단 기준이 필요할까?`,
        q:[`${k}를 ${l.shortLabel} 관점으로 보면 어떤 기준이 필요할까?`, `${l.process} 순서로 자료를 정리하면 결론은 어떻게 달라질까?`, `이 탐구를 후속 전공 탐구로 확장하려면 무엇을 더 확인해야 할까?`],
        dataRows:[["교과 개념 자료", "교과서·수업 자료", "서론"], [`${l.shortLabel} 관련 자료`, "전공 소개·기관 자료·기술 기사", "본론 1"], ["후속 탐구 자료", "논문 요약·공공데이터·사례 보고서", "본론 2"]],
        paragraph2:`학과명 자체를 쓰기보다 ${l.shortLabel} 관점에서 자료를 어떻게 나누고 해석할지 먼저 설명한다.`,
        conclusion:`그래서 나는 ${k}를 ${major || "선택 학과"}와 연결할 때 학과명보다 ${l.shortLabel} 사고방식을 활용하는 것이 더 설득력 있다고 정리했다.`
      },
      book: {
        label:"도서 근거형",
        title:`${k}, 『${book}』의 관점으로 다시 보면 어떤 기준이 필요할까?`,
        goal:`선택 도서를 줄거리 요약이 아니라 ${k}의 판단 기준을 넓히는 근거로 사용한다.`,
        focus:`『${book}』의 관점은 ${k}를 해석하는 기준을 어떻게 바꾸어 줄까?`,
        q:[`『${book}』의 관점은 ${k}를 해석하는 기준을 어떻게 바꾸어 줄까?`, `책의 관점을 적용하면 어떤 자료나 조건을 더 보게 될까?`, `도서 관점을 넣었을 때 결론의 장점과 한계는 무엇일까?`],
        dataRows:[["도서에서 가져올 관점", "선택 도서의 핵심 문장·관점", "서론"], [`${k} 관련 실제 자료`, "공공기관·통계·기사", "본론 1"], ["도서 관점으로 보완할 자료", "비교 사례·한계 자료", "본론 2"]],
        paragraph2:`도서 내용을 길게 요약하지 않고, ${k}를 왜 다른 기준으로 보아야 하는지 설명하는 근거로만 사용한다.`,
        conclusion:`그래서 나는 ${k}를 판단할 때 도서의 관점을 근거로 삼아 단일 기준보다 넓은 해석 기준을 세우는 것이 더 설득력 있다고 정리했다.`
      },
      standard: {
        label:"선택값 기준형",
        title:`${k}의 기준을 자료로 정리하면 무엇이 보일까?`,
        goal:`선택값에 맞춰 ${k}의 자료와 기준을 정리한다.`,
        focus:`${k}를 판단하려면 어떤 자료와 기준이 필요할까?`,
        q:[`${k}를 판단하려면 어떤 자료와 기준이 필요할까?`, `자료를 여러 개 비교하면 결론은 어떻게 달라질까?`, `내 기준의 한계와 보완점은 무엇일까?`],
        dataRows:[["기본 기준 자료", "교과서·공공기관", "서론"], ["실제 사례 자료", "통계·기사·공공데이터", "본론 1"], ["보완 자료", "전문기관·보고서", "본론 2"]],
        paragraph2:`자료를 어떤 기준으로 읽을지 먼저 정하고, 각 자료가 결론에서 어떤 역할을 하는지 설명한다.`,
        conclusion:`그래서 나는 ${k}를 판단할 때 자료와 기준, 한계를 함께 정리하는 방식이 더 설득력 있다고 정리했다.`
      }
    };
    const modeProfile = modeProfiles[modeKey] || modeProfiles.standard;

    const viewProfiles = {
      "자료 해석": { label:"자료 해석", table:["비교 항목", "기준 자료", "실제 자료", "내 해석"], focus:"수치와 출처가 판단에 어떤 근거가 되는지 해석한다." },
      "데이터": { label:"데이터", table:["비교 항목", "변수", "자료/그래프", "내 해석"], focus:"변수·수치·그래프를 근거로 결론을 만든다." },
      "모델링": { label:"모델링", table:["비교 항목", "입력 변수", "예상 결과", "모델 한계"], focus:"현상을 단순화해 입력값과 결과 관계로 정리한다." },
      "한계": { label:"한계", table:["비교 항목", "가능한 판단", "놓치는 점", "보완 자료"], focus:"자료나 기준이 놓치는 부분과 오차 가능성을 함께 쓴다." },
      "비교": { label:"비교", table:["비교 항목", "조건 A", "조건 B", "차이 해석"], focus:"두 조건·사례의 차이가 결론에 미치는 영향을 분석한다." },
      "사회적 의미": { label:"사회적 의미", table:["비교 항목", "과학/자료 기준", "생활·사회 영향", "내 해석"], focus:"교과 기준이 실제 생활·정책·윤리 문제와 어떻게 연결되는지 밝힌다." },
      "진로 확장": { label:"진로 확장", table:["비교 항목", "교과 개념", "전공 개념", "확장 방향"], focus:"교과 개념이 전공의 문제 해결 방식으로 확장되는 과정을 보여준다." },
      "원리": { label:"원리", table:["비교 항목", "핵심 원리", "적용 사례", "내 해석"], focus:"원리가 실제 사례에서 어떻게 작동하는지 설명한다." },
      "구조": { label:"구조", table:["비교 항목", "구성 요소", "관계", "내 해석"], focus:"대상을 여러 요소와 관계로 나누어 분석한다." },
      "기능": { label:"기능", table:["비교 항목", "역할", "작동 방식", "내 해석"], focus:"대상이 어떤 역할을 하고 어떻게 작동하는지 설명한다." },
      "안정성": { label:"안정성", table:["비교 항목", "안정 조건", "위험 조건", "보완 기준"], focus:"시스템이 안전하게 유지되기 위한 조건과 위험 요인을 본다." },
      "효율": { label:"효율", table:["비교 항목", "자원/시간", "결과", "효율 해석"], focus:"같은 결과를 더 적은 자원이나 시간으로 얻는 조건을 비교한다." },
      "변화": { label:"변화", table:["비교 항목", "이전 상태", "변화 후", "변화 원인"], focus:"시간이나 조건 변화에 따라 값이나 상태가 달라지는 흐름을 분석한다." }
    };
    const viewProfile = viewProfiles[viewKey] || viewProfiles["자료 해석"];

    const lineProfiles = {
      basic: { label:"기본형", dataLabel:"공식 기준과 대표 사례 자료", paragraphRule:"개념 설명과 대표 자료를 중심으로 간단히 정리한다.", extraRow:["라인", "기본형", "개념 설명 중심", "문단을 길게 늘리지 않는다"] },
      standard: { label:"확장형", dataLabel:"공식 기준·실제 수치·비교 검증 자료", paragraphRule:"자료, 표, 도서 연결을 모두 포함해 수행평가 제출용으로 정리한다.", extraRow:["라인", "확장형", "자료·도서·비교 기준", "본문에서 근거를 충분히 보여준다"] },
      advanced: { label:"심화형", dataLabel:"공식 기준·실제 수치·한계 보완 자료", paragraphRule:"한계와 후속 탐구 방향까지 포함해 심화 탐구처럼 정리한다.", extraRow:["라인", "심화형", "한계·후속 탐구", "결론에서 다음 탐구 방향을 제안한다"] }
    };
    const lineProfile = lineProfiles[lineKey] || lineProfiles.standard;

    const tableRows = buildStudentFacingChoiceTableRows({
      viewKey, viewProfile, modeProfile, lineProfile, keyword:k, concept:c, axis:a, lens:l, subject, major
    });
    const studentPhrases = makeStudentFacingChoicePhrases({
      modeKey, viewKey, lineKey, modeProfile, viewProfile, lineProfile, keyword:k, concept:c, axis:a, lens:l, subject, major
    });

    return {
      modeKey, viewKey, lineKey,
      modeLabel: modeProfile.label,
      viewLabel: viewProfile.label,
      lineLabel: lineProfile.label,
      title: modeProfile.title,
      goal: modeProfile.goal,
      focusQuestion: modeProfile.focus,
      q: modeProfile.q,
      dataRows: modeProfile.dataRows,
      tableRows,
      paragraphRule: lineProfile.paragraphRule,
      viewFocus: viewProfile.focus,
      routeSummary: studentPhrases.routeSummary,
      judgmentBasis: studentPhrases.judgmentBasis,
      dataDepthText: studentPhrases.dataDepthText,
      tableGuide: studentPhrases.tableGuide,
      paragraphGuide: studentPhrases.paragraphGuide,
      majorGuide: studentPhrases.majorGuide,
      paragraph2: modeProfile.paragraph2,
      conclusionSentence: modeProfile.conclusion,
      choiceSummary: studentPhrases.routeSummary,
      majorConnect: `전공 연결은 '${major || l.displayName || "선택 학과"}'라는 이름을 붙이는 것이 아니라, ${l.shortLabel} 사고방식으로 자료를 나누고 판단 기준을 세우는 것이다.`
    };
  }

  function applyReportChoiceBlueprint(current, blueprint){
    if(!blueprint) return current;
    const out = Object.assign({}, current);
    out.title = blueprint.title || out.title;
    out.goal = blueprint.goal || out.goal;
    out.focusQuestion = blueprint.focusQuestion || out.focusQuestion;
    out.q = Array.isArray(blueprint.q) && blueprint.q.length ? blueprint.q : out.q;
    out.dataRows = Array.isArray(blueprint.dataRows) && blueprint.dataRows.length ? blueprint.dataRows : out.dataRows;
    out.tableRows = Array.isArray(blueprint.tableRows) && blueprint.tableRows.length ? blueprint.tableRows : out.tableRows;
    out.majorConnect = blueprint.majorConnect || out.majorConnect;
    const paragraphFocus = blueprint.paragraph2 || blueprint.viewFocus || "자료를 해석하는 기준";
    out.conceptUse = `${out.conceptUse || ""} 이 문단에서는 ${paragraphFocus}을 중심으로 자료를 읽는다.`.replace(/^\s+/, "");
    out.conceptExample = `${out.conceptExample || ""} 예를 들어 표의 비교 항목을 바꾸면 같은 주제라도 결론의 근거가 달라진다.`.replace(/^\s+/, "");
    out.conclusionSentence = blueprint.conclusionSentence || out.conclusionSentence;
    return out;
  }


  function deriveSubjectLens(subject, concept, keyword){
    const hay = `${subject || ""} ${concept || ""} ${keyword || ""}`;
    const lens = {
      label: "자료 해석 기준",
      dataHint: "공식 자료·통계·사례 자료",
      conceptFrame: `${concept || "선택 교과 개념"}을 자료를 읽는 기준으로 바꾸어 사용한다.`,
      conceptUse: `${concept || "선택 교과 개념"}에서 배운 핵심 개념을 먼저 쉬운 말로 풀고, 그 개념으로 자료의 차이를 해석한다.`,
      conceptExample: `${concept || "선택 교과 개념"}은 자료를 단순 정보가 아니라 판단 근거로 해석하게 해 준다.`,
      sourceHints: ["교과서", "공공기관 자료", "통계·기사 자료"]
    };
    if(/통합과학|과학탐구실험|과학/i.test(hay)){
      lens.label = "측정값·조건·사회적 판단";
      lens.dataHint = "공식 기준·측정값·실제 사례";
      lens.conceptFrame = `${concept || "과학 개념"}을 측정값이 실제 판단 기준으로 바뀌는 과정과 연결한다.`;
      lens.conceptUse = "교과에서 배운 측정값, 조건, 상호작용 개념을 먼저 쓰고, 실제 자료가 어떤 판단 기준으로 쓰이는지 연결한다.";
      lens.conceptExample = `${concept || "과학 개념"}을 통해 숫자 자료가 사회적 판단, 안전 기준, 생활 문제와 연결될 수 있음을 설명한다.`;
      lens.sourceHints = ["기상청·질병관리청·환경부 등 공식 기준", "공공데이터·측정 자료", "지역별 사례·보도자료"];
    }else if(/정보|프로그래밍|알고리즘/i.test(hay)){
      lens.label = "입력·처리·조건 분기";
      lens.dataHint = "입력 데이터·조건 규칙·출력 결과";
      lens.conceptFrame = `${concept || "정보 개념"}을 입력값, 처리 과정, 출력 결과의 흐름으로 바꾸어 사용한다.`;
      lens.conceptUse = "교과에서 배운 입력·처리·출력 구조를 기준으로 자료가 어떻게 선택되고 결과가 어떻게 달라지는지 설명한다.";
      lens.conceptExample = `${concept || "정보 개념"}은 자료가 들어오고 조건을 거쳐 결과가 나오는 과정을 설명하는 기준이 된다.`;
      lens.sourceHints = ["서비스 사용 사례", "알고리즘 설명 자료", "비교 가능한 입력·출력 예시"];
    }else if(/생명과학|생명|간호|보건/i.test(hay)){
      lens.label = "생체 반응·조절·항상성";
      lens.dataHint = "생체 반응 자료·위험 요인·관리 기준";
      lens.conceptFrame = `${concept || "생명과학 개념"}을 몸의 반응, 조절 과정, 위험 요인 해석과 연결한다.`;
      lens.conceptUse = "교과에서 배운 생체 반응과 조절 개념을 먼저 쓰고, 실제 건강·생명 자료에서 어떤 조건이 결과를 바꾸는지 비교한다.";
      lens.conceptExample = `${concept || "생명과학 개념"}은 몸의 변화가 한 가지 원인이 아니라 여러 조건의 조절 결과임을 설명하는 기준이 된다.`;
      lens.sourceHints = ["질병관리청·보건 자료", "생리 반응 설명 자료", "위험 요인 비교 자료"];
    }else if(/화학|물질|반응|결합/i.test(hay)){
      lens.label = "구조·성질·반응 조건";
      lens.dataHint = "물질 구조·성질·조건 변화 자료";
      lens.conceptFrame = `${concept || "화학 개념"}을 물질의 구조, 성질, 반응 조건이 결과를 바꾸는 기준으로 사용한다.`;
      lens.conceptUse = "교과에서 배운 구조와 성질의 관계를 먼저 쓰고, 조건 변화가 성능이나 안정성에 어떤 차이를 만드는지 비교한다.";
      lens.conceptExample = `${concept || "화학 개념"}은 물질의 성질이 구조와 조건에 따라 달라진다는 점을 설명하는 기준이 된다.`;
      lens.sourceHints = ["물질 특성 자료", "실험 조건 비교 자료", "제품·소재 사례"];
    }else if(/수학|대수|미적분|기하|확률|통계/i.test(hay)){
      lens.label = "수치·비율·그래프 모델";
      lens.dataHint = "수치 자료·비율·그래프";
      lens.conceptFrame = `${concept || "수학 개념"}을 변화량, 비율, 그래프 해석 기준으로 사용한다.`;
      lens.conceptUse = "교과에서 배운 수식·그래프·비율 개념을 먼저 쓰고, 실제 자료를 비교 가능한 형태로 바꾸어 해석한다.";
      lens.conceptExample = `${concept || "수학 개념"}은 자료의 증가·감소, 차이, 경향을 설명하는 기준이 된다.`;
      lens.sourceHints = ["통계 자료", "그래프 자료", "비율·변화량 계산 자료"];
    }
    return lens;
  }


  function classifyDonggukSubjectFrame(subject, text){
    const hay = `${subject || ""} ${text || ""}`;
    if(/정보|프로그래밍|알고리즘|데이터|인공지능|AI|네트워크|보안/i.test(hay)) return { subjectGroup:"정보" };
    if(/수학|대수|미적분|기하|확률|통계|함수|그래프|벡터/i.test(hay)) return { subjectGroup:"수학" };
    if(/영어|English|독해|어휘|문법/i.test(hay)) return { subjectGroup:"영어" };
    if(/사회|한국사|통합사회|지리|역사|정치|행정|경제|윤리|인권|환경|법/i.test(hay)) return { subjectGroup:"사회" };
    if(/과학|물리|화학|생명|지구|통합과학|과학탐구실험|반도체|배터리|소재|유전|세포|화학반응/i.test(hay)) return { subjectGroup:"과학" };
    return { subjectGroup:"국어" };
  }

  function pickDonggukContentCategory(group, hay){
    const h = String(hay || "");
    if(group === "정보"){
      if(/인공지능|AI|머신러닝|추천|모델/i.test(h)) return "인공지능";
      if(/보안|암호|개인정보|윤리/i.test(h)) return "정보보안";
      if(/데이터|자료|통계|그래프|시각화|예측/i.test(h)) return "데이터";
      return "프로그램";
    }
    if(group === "수학"){
      if(/통계|자료|평균|표본|분산/i.test(h)) return "통계";
      if(/그래프|함수|로그|지수/i.test(h)) return /로그|지수/.test(h) ? "지수함수와 로그함수" : "함수와 그래프";
      if(/미분|변화율/i.test(h)) return "미분";
      if(/적분/i.test(h)) return "적분";
      return "주제";
    }
    if(group === "사회"){
      if(/지리|지역|도시|공간|기후/i.test(h)) return "지리";
      if(/정치|행정|정책|법|헌법|선거/i.test(h)) return "정치·행정";
      if(/경제|시장|금융|가격|비용|편익/i.test(h)) return "경제";
      if(/인권|불평등|평등/i.test(h)) return "인권";
      if(/환경|기후|탄소|생태/i.test(h)) return "환경";
      if(/자료|통계|근거/i.test(h)) return "자료";
      return "쟁점";
    }
    if(group === "과학"){
      if(/반도체|전기|전자|전류|전압|회로|트랜지스터/i.test(h)) return "전자기";
      if(/소재|물질|원자|분자|구조|결합|원소|주기율/i.test(h)) return "물질의 구성";
      if(/화학|반응|산화|환원|중화/i.test(h)) return "화학 반응";
      if(/세포|효소|항상성|생명/i.test(h)) return "세포와 물질대사";
      if(/유전|DNA/i.test(h)) return "유전";
      if(/환경|기후|탄소|생태/i.test(h)) return "환경";
      if(/자료|데이터|시뮬레이션/i.test(h)) return "자료";
      return "과학적 사고";
    }
    if(group === "영어"){
      if(/어휘|단어|표현/i.test(h)) return "어휘";
      if(/문법|구문|어법/i.test(h)) return "문법";
      if(/의견|주장|찬반/i.test(h)) return "의견";
      if(/문학|소설|영미/i.test(h)) return "문학";
      return "주제 및 정보";
    }
    if(/문학|서사|서정|작품|고전|소설|시/i.test(h)) return "문학";
    if(/비판|논증|주장|쟁점|의견|근거/i.test(h)) return "의견";
    if(/자료|정보|비교|신뢰성|타당성/i.test(h)) return "정보";
    if(/문법|언어|음운|규범/i.test(h)) return "언어";
    return "독서";
  }

  function pickDonggukMethodCategory(group, modeKey, viewKey, lineKey, hay){
    const h = `${modeKey || ""} ${viewKey || ""} ${lineKey || ""} ${hay || ""}`;
    if(group === "정보"){
      if(/프로그래밍|코딩|구현/i.test(h)) return "프로그래밍";
      if(/설계|모델링|구조|안정성|효율/i.test(h)) return "설계";
      if(/프로젝트|심화/.test(h)) return "프로젝트";
      return "분석";
    }
    if(group === "수학"){
      if(/그래프|시각화/.test(h)) return "그래프·시각화";
      if(/증명|추론|원리/.test(h)) return "추론·증명";
      if(/자료|데이터|통계|비교|분석/.test(h)) return "자료분석";
      return "탐구";
    }
    if(group === "사회"){
      if(/제안|대안|해결|정책/.test(h)) return "제안하기";
      if(/논술|비판|주장|한계/.test(h)) return "논술";
      return "탐구하기";
    }
    if(group === "과학"){
      if(/실험|변인|측정/.test(h)) return "실험평가";
      if(/추론|원리|설명/.test(h)) return "추론·설명";
      if(/자료|데이터|비교|분석|구조|성능|안정|효율/.test(h)) return "분석";
      return "탐구";
    }
    if(group === "영어") return /논술|비판|비교|의견/.test(h) ? "논술" : "글쓰기";
    if(/비평|논술|비판|비교/.test(h)) return "논술·비평";
    if(/토론/.test(h)) return "토의·토론";
    if(/발표|말하기/.test(h)) return "말하기";
    return "글쓰기";
  }

  function buildSpecificPerformancePlan({ keyword, concept, axis, major, lens, subjectGroup }){
    const k = cleanDisplayText(keyword || "선택 키워드");
    const c = cleanDisplayText(concept || "교과 개념");
    const hay = `${k} ${c} ${axis || ""} ${major || ""} ${(lens?.keywords || []).join(" ")}`;
    if(/반도체|소재|전자|전기|배터리|전지|공학|구조|성능|안정성/i.test(hay)){
      const hasEngineeringFrame = /구조|성능|안정성|효율|공정|소재/.test(k);
      const engineeringBase = hasEngineeringFrame ? k : `${k} 구조·성능·안정성`;
      const engineeringTitle = `${engineeringBase}은 어떤 조건에서 달라질까?`;
      const engineeringFocus = `${k}의 판단 기준에서 구조, 조건, 성능, 안정성을 함께 비교하면 결론이 어떻게 달라질까?`;
      const engineeringDataTitle = hasEngineeringFrame ? `${engineeringBase} 원리 자료` : `${engineeringBase} 구조·원리 자료`;
      return {
        base:engineeringBase,
        tail:"비교 분석하기",
        title:engineeringTitle,
        focus:engineeringFocus,
        questions:[`${engineeringBase}은 어떤 조건에서 달라질까?`, `효율만 볼 때와 안정성까지 함께 볼 때 판단 기준은 어떻게 달라질까?`, `더 적합한 설계나 소재를 고르려면 어떤 자료를 함께 확인해야 할까?`],
        dataRows:[[engineeringDataTitle, "교과서·전문기관·기술 설명 자료", "서론"], ["성능 지표 비교 자료", "제조사 스펙·논문 요약·기술 보고서", "본론 1"], ["안정성·한계 사례 자료", "산업 기사·실험 사례·전문 보고서", "본론 2"]],
        tableRows:[["비교 항목", "구조/조건", "성능/안정성 자료", "내 해석"], ["구조", "소재·결합·배열·공정 조건", "전기적 특성·열 특성", "구조 차이가 성능 차이를 만든다"], ["성능", "속도·효율·전도성", "측정값·그래프·스펙", "목적에 따라 중요한 성능 기준이 달라진다"], ["안정성", "열·전류·외부 조건", "오류·열화·수명 자료", "성능만 높아도 안정성이 낮으면 한계가 있다"], ["결론 방향", "선택 기준", "보완 자료", "성능과 안정성의 균형 기준을 제시한다"]],
        questionGuide:"소재·구조·공정 조건·성능 지표 중 하나를 넣어 질문을 구체화한다.",
        dataGuide:"공식 설명 자료 → 성능 지표 자료 → 안정성/한계 자료 순서로 배치한다.",
        conceptUse:`${c}을 단순 정의로 쓰지 않고, ${k}의 구조가 성능과 안정성으로 이어지는 이유를 설명하는 기준으로 사용한다.`,
        conceptExample:`예: 이 키워드는 이름만 쓰면 진로 키워드에 그치지만, 구조·성능·안정성 자료를 비교하면 공학적 판단 기준이 된다.`,
        conclusion:`그래서 나는 ${k}의 판단 기준에서 성능 수치 하나보다 구조, 조건, 안정성 자료를 함께 보는 방식이 더 설득력 있다고 정리했다.`
      };
    }
    if(/데이터|알고리즘|추천|인공지능|AI|프로그램|정보/i.test(hay)){
      return {
        base:`${k} 입력값·결과`, tail:"분석하기", title:`${k}은 어떤 입력값과 기준에 따라 결과가 달라질까?`,
        focus:`${k}의 결과를 바꾸는 입력값, 처리 기준, 오류 가능성을 비교하면 무엇이 보일까?`,
        questions:[`${k}은 어떤 입력값을 기준으로 결과를 바꿀까?`, `입력값이나 조건이 달라지면 결과와 오류 가능성은 어떻게 달라질까?`, `더 공정하고 정확한 결과를 위해 어떤 검증 기준이 필요할까?`],
        dataRows:[["입력값·조건 설명 자료", "서비스 설명·공개 자료·교과서", "서론"], ["출력 결과 비교 자료", "사용 예시·공공데이터·실험 결과", "본론 1"], ["오류·편향 사례 자료", "기사·연구 요약·정책 자료", "본론 2"]],
        tableRows:[["비교 항목", "입력값/조건", "출력 결과", "내 해석"], ["입력값", "선택 기록·수치·텍스트", "결과를 만드는 출발점", "입력 기준이 달라지면 결과도 달라진다"], ["처리 기준", "조건문·모델·가중치", "분류/추천/판단", "기준을 명확히 해야 오류를 줄일 수 있다"], ["오류 가능성", "누락·편향·예외", "잘못된 결과", "검증 자료가 필요하다"]],
        questionGuide:"입력값, 조건문, 출력 결과, 오류 가능성 중 하나를 넣어 질문을 구체화한다.", dataGuide:"입력 기준 → 결과 비교 → 오류·편향 사례 순서로 자료를 배치한다.",
        conceptUse:`${c}을 입력-처리-출력 구조로 바꾸어 ${k}의 판단 과정을 설명한다.`, conceptExample:`예: 같은 데이터라도 어떤 입력값과 조건을 쓰는지에 따라 결과가 달라진다.`, conclusion:`그래서 나는 ${k}를 판단할 때 결과만 보지 않고 입력값, 처리 기준, 오류 가능성을 함께 확인하는 기준이 더 설득력 있다고 정리했다.`
      };
    }
    return {
      base:`${k} ${c}`, tail: subjectGroup === "사회" ? "탐구하기" : "탐구 보고서 작성하기", title:`${k}, 어떤 기준으로 탐구하면 더 분명해질까?`,
      focus:`${k}를 ${axis || c || "선택 기준"} 관점으로 볼 때 어떤 자료와 기준이 필요할까?`,
      questions:[`${k}를 탐구할 때 핵심 기준은 무엇일까?`, `자료를 비교하면 어떤 차이가 드러날까?`, `내 결론의 한계와 보완점은 무엇일까?`],
      dataRows:[["기준 설명 자료", "교과서·공공기관 자료", "서론"], ["비교 중심 자료", "통계·기사·사례", "본론 1"], ["보완·한계 자료", "전문기관·보고서", "본론 2"]],
      tableRows:[["비교 항목", "기준 자료", "비교 자료", "내 해석"], ["핵심 기준", "교과 개념", "실제 사례", "개념이 사례 해석 기준이 된다"], ["자료 차이", "기준값", "실제값/사례", "차이를 근거로 결론을 만든다"], ["한계", "가능한 판단", "부족한 자료", "보완 방향을 제시한다"]],
      questionGuide:"대상, 비교 기준, 자료 종류, 한계 중 하나를 넣어 질문을 구체화한다.", dataGuide:"기준 자료 → 비교 자료 → 보완 자료 순서로 배치한다.",
      conceptUse:`${c}을 자료를 읽는 기준으로 바꾸어 사용한다.`, conceptExample:`예: 같은 자료라도 어떤 기준으로 읽는지에 따라 결론의 방향이 달라진다.`, conclusion:`그래서 나는 ${k}를 판단할 때 기준, 자료, 한계를 함께 보는 방식이 더 설득력 있다고 정리했다.`
    };
  }

  function buildDonggukPerformanceFrame({ subject, subjectGroup, concept, keyword, axis, mode, view, line, major, lens }){
    const modeKey = normalizeReportModeKey(mode);
    const viewKey = normalizeReportViewKey(view);
    const lineKey = normalizeReportLineKey(line);
    const hay = `${subject || ""} ${concept || ""} ${keyword || ""} ${axis || ""} ${major || ""} ${(lens?.keywords || []).join(" ")}`;
    const frame = classifyDonggukSubjectFrame(subject, hay);
    const uiGroup = String(subjectGroup || "").trim();
    const group = uiGroup || frame.subjectGroup;
    const contentCategory = pickDonggukContentCategory(group, hay);
    const methodCategory = pickDonggukMethodCategory(group, modeKey, viewKey, lineKey, hay);
    const specific = buildSpecificPerformancePlan({ keyword, concept, axis, major, lens, subjectGroup: group });
    const performanceName = `${specific.base} ${specific.tail}`.replace(/\s+/g," ").trim();
    const lineDepth = lineKey === "advanced" ? "심화형: 한계·후속 탐구까지 확장" : (lineKey === "basic" ? "기본형: 핵심 기준과 대표 자료 중심" : "확장형: 자료·도서·비교표까지 포함");
    return {
      subjectGroup: group, contentCategory, methodCategory, performanceName,
      evaluationIntent: `${group} 수행평가의 '${contentCategory} × ${methodCategory}' 구조로, ${concept || keyword || "교과 개념"}을 단순 설명하지 않고 ${specific.focus}를 확인하게 한다.`,
      achievementFocus: `무엇을: ${contentCategory} 범주의 ${keyword || concept || "탐구 주제"} / 어떻게: ${methodCategory} 방식으로 자료를 비교·해석 / 결과물: ${lineDepth}`,
      title: specific.title, focusQuestion: specific.focus, questions: specific.questions, dataRows: specific.dataRows, tableRows: specific.tableRows,
      questionGuide: specific.questionGuide, dataGuide: specific.dataGuide, conceptUse: specific.conceptUse, conceptExample: specific.conceptExample, conclusionSentence: specific.conclusion,
      modeKey, viewKey, lineKey, lineDepth
    };
  }

  function applyDonggukPerformanceFrame(current, frame){
    if(!frame) return current;
    const out = Object.assign({}, current);
    out.title = frame.title || out.title;
    out.goal = frame.evaluationIntent || out.goal;
    out.focusQuestion = frame.focusQuestion || out.focusQuestion;
    out.q = Array.isArray(frame.questions) && frame.questions.length ? frame.questions : out.q;
    out.dataRows = Array.isArray(frame.dataRows) && frame.dataRows.length ? frame.dataRows : out.dataRows;
    out.tableRows = Array.isArray(frame.tableRows) && frame.tableRows.length ? frame.tableRows : out.tableRows;
    out.conceptUse = frame.conceptUse || out.conceptUse;
    out.conceptExample = frame.conceptExample || out.conceptExample;
    out.conclusionSentence = frame.conclusionSentence || out.conclusionSentence;
    return out;
  }


  function buildFallbackSecondaryExpansionContext({ subject, major, concept, keyword, axis, mode, view, line, bookTitle }){
    const base = {
      subject: subject || "선택 과목",
      department: major || "선택 진로 분야",
      concept: concept || "선택 교과 개념",
      keyword: keyword || "선택 키워드",
      followupAxis: axis || "후속 연계축",
      reportMode: mode || "수행평가 방식",
      reportView: view || "평가 관점",
      reportLine: line || "결과물 수준",
      selectedBookTitle: bookTitle || ""
    };
    const pathData = [
      ["principle-analysis", "원리 분석형", `${base.keyword}는 ${base.concept}의 어떤 원리와 조건으로 설명할 수 있을까?`, "교과 개념 원리 → 작동 조건 → 사례 적용 → 한계", "교과서 개념·공식 설명·원리 적용 사례"],
      ["case-comparison", "사례 비교형", `${base.keyword}를 두 사례나 조건으로 비교하면 어떤 차이가 드러날까?`, "비교 기준 → 사례 A → 사례 B → 차이 해석", "사례 A·사례 B·비교 기준 자료"],
      ["data-evidence", "자료 해석형", `${base.keyword}는 자료에서 어떤 수치·변화·패턴으로 확인할 수 있을까?`, "자료 출처 → 변수·기준 → 자료 해석 → 자료 한계", "통계·그래프·기사·공공자료"],
      ["social-meaning", "사회적 의미형", `${base.keyword}는 실제 사회 문제나 공동체에 어떤 의미를 가질까?`, "문제 상황 → 영향 받는 대상 → 사회적 의미 → 대응 방향", "사회 쟁점·정책 자료·이해관계자 관점"],
      ["followup-inquiry", "후속 탐구형", `이번 탐구의 한계를 보완하려면 다음에는 무엇을 더 확인해야 할까?`, "현재 결론 → 부족한 점 → 추가 자료 → 다음 탐구", "현재 자료의 한계·추가 자료·후속 조사 계획"]
    ];
    let recommendedPathId = "data-evidence";
    const hay = `${mode} ${view} ${line} ${axis} ${keyword} ${concept}`;
    if(/원리|설명|구조|기능/.test(hay)) recommendedPathId = "principle-analysis";
    if(/비교|대조|차이/.test(hay)) recommendedPathId = "case-comparison";
    if(/자료|데이터|통계|그래프|측정|모델/.test(hay)) recommendedPathId = "data-evidence";
    if(/사회|윤리|정책|공동체|의미|쟁점/.test(hay)) recommendedPathId = "social-meaning";
    if(/심화|후속|한계|추가/.test(hay)) recommendedPathId = "followup-inquiry";
    return {
      version: "secondary-expansion-context-v228-fallback",
      purpose: "1차 설계값을 바탕으로 2차 확장 방향을 다시 선택하게 하여 보고서 중복성을 낮춘다.",
      principle: "1차 데이터 = 공통 뼈대 / 2차 확장 방향 = 분기점 / 학생 자료 = 개인화 근거 / 3차 초안 = 최종 문단화",
      sourceSelection: base,
      recommendedPathId,
      paths: pathData.map((row, idx) => ({
        rank: idx + 1,
        id: row[0],
        label: row[1],
        isRecommended: row[0] === recommendedPathId,
        question: row[2],
        paragraphStructure: row[3].split(" → "),
        evidenceTypes: row[4].split("·"),
        studentInput: ["내가 직접 찾은 자료 제목과 출처", "자료에서 확인한 핵심 내용", "내가 해석한 의미"],
        aiPromptGuide: `아래 1차 탐구 설계값을 바탕으로 '${row[1]}' 방향의 수행평가 보고서 초안 구조를 만들어줘. 보고서를 바로 완성하지 말고, 문단별 작성 방향과 내가 직접 채워야 할 자료·해석 칸을 제시해줘.`
      })),
      studentRequiredInputs: ["2차 확장 방향 1개", "직접 찾은 자료 제목과 출처", "자료에서 확인한 수치·사례·문장", "수업 개념과 연결한 내 설명", "결론에서 말할 내 해석"],
      aiReuseWorkflow: ["1차 설계값 연결성 점검", "2차 확장 방향 선택", "자료 찾기", "선택 방향 기반 초안 구조화", "학생 초안 첨삭"]
    };
  }

  function getSecondaryExpansionContext(req, fallbackArgs){
    const ctx = req?.mini_payload?.reportGenerationContext?.secondaryExpansionContext || req?.secondary_expansion_context || null;
    if(ctx && Array.isArray(ctx.paths) && ctx.paths.length) return ctx;
    return buildFallbackSecondaryExpansionContext(fallbackArgs || {});
  }

  function buildExpansionRows(expansion){
    const rows = [["선택", "확장 방향", "탐구 질문", "필요 자료", "보고서 구조"]];
    (expansion.paths || []).forEach(path => {
      rows.push([
        path.isRecommended ? "추천" : `선택 ${path.rank || ""}`,
        path.label || "확장 방향",
        path.question || "탐구 질문 만들기",
        (path.evidenceTypes || []).join("·") || "자료 직접 선택",
        (path.paragraphStructure || []).join(" → ") || "문단 구조 선택"
      ]);
    });
    return rows;
  }

  function buildAiReusePromptRows(expansion, baseSummary){
    const recommended = (expansion.paths || []).find(p => p.isRecommended) || (expansion.paths || [])[0] || {};
    const prompt1 = [
      "아래는 내가 수행평가 보고서를 쓰기 위해 만든 1차 탐구 설계값이야.",
      "보고서를 바로 써주지 말고, 교과 개념→추천 키워드→후속 연계축→자료/도서→결론 흐름이 자연스러운지 먼저 점검해줘.",
      "어색한 연결이 있으면 이유와 수정 방향을 알려줘.",
      baseSummary
    ].join("\n");
    const prompt2 = [
      `나는 2차 확장 방향으로 '${recommended.label || "자료 해석형"}'을 선택하려고 해.`,
      "아래 1차 탐구 설계값을 바탕으로 보고서 초안 구조를 만들어줘.",
      "조건: 보고서를 완성하지 말고 문단별 작성 방향, 필요한 자료, 내가 직접 채울 문장을 제시해줘.",
      "내가 직접 찾은 자료: [자료 제목/출처/핵심 내용/내 해석을 여기에 입력]",
      baseSummary
    ].join("\n");
    const prompt3 = [
      "아래는 내가 직접 쓴 수행평가 보고서 초안이야.",
      "새로 써주지 말고 첨삭만 해줘. 교과 개념, 탐구 질문, 자료 해석, 결론의 연결성을 중심으로 점검해줘.",
      "내 초안: [여기에 초안 붙여넣기]"
    ].join("\n");
    return [
      ["단계", "ChatGPT에 요청할 일", "복사해서 쓸 프롬프트 핵심"],
      ["1", "연결성 점검", prompt1],
      ["2", "선택 방향 기반 초안 구조화", prompt2],
      ["3", "학생 초안 첨삭", prompt3]
    ];
  }

  function deriveV54Scenario(ctx){
    const subject = ctx.subject || "";
    const major = ctx.major || "";
    const keyword = ctx.keyword || "선택 키워드";
    const concept = ctx.concept || "선택 교과 개념";
    const axis = ctx.axis || "선택한 기준";
    const allText = ctx.allText || "";
    const lens = ctx.lens || {process:"자료 수집 → 기준 설정 → 비교·해석 → 결론 검증", shortLabel:"자료 기반 판단"};
    const subjectLens = ctx.subjectLens || deriveSubjectLens(subject, concept, keyword);
    const hay = `${subject} ${major} ${keyword} ${concept} ${axis} ${allText} ${(lens.keywords || []).join(" ")}`;
    const scenario = {
      conclusionSentence: `그래서 나는 ${keyword}를 판단할 때 단일 자료보다 ${axis || subjectLens.label}을 함께 보는 기준이 더 설득력 있다고 정리했다.`
    };
    function base(title, goal, questions, dataRows, tableRows, majorConnect, conceptUse, conceptExample, conclusionSentence){
      return Object.assign(scenario, { title, goal, focusQuestion: questions[0], q: questions, dataRows, tableRows, majorConnect, conceptUse, conceptExample, conclusionSentence });
    }
    if(/폭염|기후|주의보|재난|체감온도|날씨/i.test(hay) && /컴퓨터|소프트웨어|정보|알고리즘|AI|인공지능|데이터/i.test(hay) && /침묵의\s*봄|silent\s*spring|레이첼/i.test(hay)){
      return base(
        `${keyword}, 기온 기준이 놓치는 피해 신호는 무엇일까?`,
        `기온·습도·체감온도뿐 아니라 취약 지역, 노출 시간, 피해 사례를 입력값으로 보고 ${keyword} 판단 기준의 누락 가능성을 검증한다.`,
        [`${keyword}는 기온 기준만으로 생활환경 피해를 충분히 설명할 수 있을까?`, `기온·습도·노출 시간·취약 지역·피해 사례를 함께 넣으면 판단 결과가 어떻게 달라질까?`, `자동 판단 시스템이 피해를 놓치지 않으려면 어떤 보조 입력값과 예외 조건이 필요할까?`],
        [[`${keyword}의 공식 발령 기준`, "기상청·재난안전 공식 자료", "서론"], ["기온·습도·체감온도·지속 시간 자료", "기상자료개방포털·공공데이터", "본론 1"], ["취약 지역·피해 사례·대응 안내 자료", "지자체·뉴스·보건/환경 자료", "본론 2"]],
        [["비교 항목", "기온 중심 기준", "환경·피해 조건까지 넣은 기준", "내 해석"], ["입력값", "최고기온·체감온도", "기온·습도·지속 시간·취약 지역·피해 사례", "판단에 들어가는 자료 범위가 넓어진다"], ["조건문", "기준 이상이면 주의보", "기준 이상 + 노출 시간/피해 신호가 있으면 위험도 상향", "공식 기준이 놓치는 예외 상황을 보완한다"], ["판단 결과", "발령 여부 중심", "실제 피해 가능성과 대응 우선순위까지 해석", "단순 알림보다 생활 위험 판단에 가까워진다"], ["오류 가능성", "피해가 커지는 지역을 놓칠 수 있음", "자료가 많아 기준이 복잡해짐", "누락 오류와 과잉 판단을 함께 점검한다"]],
        "전공 연결은 컴퓨터공학과 이름을 반복하는 것이 아니라, 폭염 관련 자료를 입력값으로 정하고 조건문·예외 조건·오류 검증을 통해 피해 신호를 놓치지 않는 판단 구조를 설계하는 것이다.",
        "통합과학에서 배운 측정값과 환경 조건 개념을 활용해 폭염주의보를 단일 수치가 아니라 여러 조건이 결합된 사회적 판단 기준으로 해석한다.",
        "예: 기온은 기본 입력값이지만, 습도·지속 시간·취약 지역·피해 사례를 함께 넣으면 같은 폭염주의보라도 실제 위험도 판단이 달라질 수 있다.",
        `그래서 나는 ${keyword}를 판단할 때 기온 기준만으로는 부족하며, 환경 조건과 피해 신호를 보조 입력값으로 함께 넣어야 더 설득력 있는 판단 기준이 된다고 정리했다.`
      );
    }
    if(/폭염|기후|주의보|재난|체감온도|날씨/i.test(hay) && /컴퓨터|소프트웨어|정보|알고리즘|AI|인공지능|데이터/i.test(hay) && /팩트풀니스|factfulness|로슬링/i.test(hay)){
      return base(
        `${keyword}, 체감보다 자료로 판단하면 결론이 달라질까?`,
        `인상이나 뉴스 사례만으로 위험을 단정하지 않고, 기준값·비율·추세·지역 비교를 입력값으로 정리해 ${keyword} 판단을 검증한다.`,
        [`${keyword}를 체감이나 단일 사례가 아니라 자료 비율로 보면 판단이 달라질까?`, `기준값·추세·지역별 비율을 함께 비교하면 위험도 해석은 어떻게 달라질까?`, `자료 기반 판단 시스템을 만들려면 어떤 입력값과 검증 기준이 필요할까?`],
        [[`${keyword} 공식 기준`, "기상청·재난안전 공식 자료", "서론"], ["지역별 발령 횟수·기간·체감온도 자료", "공공데이터·기상자료개방포털", "본론 1"], ["피해 수·인구 대비 비율·연도별 추세", "보건/재난 통계·지자체 자료", "본론 2"]],
        [["비교 항목", "사례 중심 판단", "비율·추세 중심 판단", "내 해석"], ["입력값", "인상적인 피해 사례", "발령 횟수·지속 기간·인구 대비 피해율", "큰 사건보다 비교 가능한 자료가 필요하다"], ["조건문", "피해 사례가 있으면 위험하다고 봄", "기준값과 비율이 함께 높을 때 위험도 상향", "감각적 판단을 자료 기준으로 보완한다"], ["판단 결과", "위험을 과장하거나 축소할 수 있음", "지역·기간별 차이를 설명할 수 있음", "판단의 설득력이 높아진다"], ["오류 가능성", "대표 사례에 끌릴 수 있음", "통계 수집 방식에 따라 차이 발생", "자료 출처와 비교 기준을 함께 써야 한다"]],
        "전공 연결은 컴퓨터공학과 이름을 붙이는 것이 아니라, 입력 데이터를 비교 가능한 값으로 바꾸고 조건문과 검증 기준으로 판단 오류를 줄이는 과정이다.",
        "통합과학의 측정과 자료 해석 개념을 활용해 폭염주의보를 감각적 위험이 아니라 비교 가능한 수치와 추세로 해석한다.",
        "예: 같은 폭염 피해라도 전체 인구 대비 비율, 발령 지속 기간, 지역별 체감온도와 함께 보면 판단의 의미가 달라질 수 있다.",
        `그래서 나는 ${keyword}를 판단할 때 인상적인 사례보다 기준값, 비율, 추세를 함께 보는 자료 기반 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/폭염|기후|주의보|재난|체감온도|날씨/i.test(hay) && /컴퓨터|소프트웨어|정보|알고리즘|AI|인공지능|데이터/i.test(hay) && /엔트로피|entropy|리프킨/i.test(hay)){
      return base(
        `${keyword}, 열이 쌓이는 조건까지 봐야 할까?`,
        `기온만이 아니라 열 축적, 포장 면적, 냉방 수요, 지속 시간을 입력값으로 보고 폭염 판단 기준의 한계를 분석한다.`,
        [`${keyword}는 순간 기온보다 열이 축적되는 조건을 함께 봐야 할까?`, `지속 시간·포장 면적·냉방 수요를 넣으면 위험 판단은 어떻게 달라질까?`, `시스템의 부담과 한계를 반영하려면 어떤 판단 조건이 필요할까?`],
        [[`${keyword} 공식 기준`, "기상청·재난안전 자료", "서론"], ["기온·열대야·지속 시간 자료", "기상자료개방포털", "본론 1"], ["전력 수요·도시 열섬·냉방 취약 사례", "공공데이터·지자체·기사", "본론 2"]],
        [["비교 항목", "순간 기온 기준", "열 축적·시스템 부담 기준", "내 해석"], ["입력값", "최고기온", "최고기온·지속 시간·열대야·전력 수요", "열이 쌓이는 흐름을 반영한다"], ["조건문", "기준 이상이면 주의", "기준 이상 상태가 지속되면 위험도 상향", "지속성과 누적 부담을 판단 조건에 넣는다"], ["판단 결과", "당일 위험 중심", "연속 폭염과 생활 시스템 부담까지 해석", "폭염의 한계를 더 넓게 설명한다"], ["오류 가능성", "누적 피로와 인프라 부담을 놓칠 수 있음", "자료 범위가 넓어 해석이 복잡함", "자료 범위를 명확히 제한해야 한다"]],
        "전공 연결은 입력값·조건문·오류 검증 구조를 사용해, 단일 기온보다 누적 조건과 시스템 부담을 함께 판단하는 절차를 설계하는 것이다.",
        "통합과학의 에너지와 시스템 관점을 활용해 폭염을 순간 수치가 아니라 열이 축적되고 생활 시스템에 부담을 주는 현상으로 해석한다.",
        "예: 최고기온이 같아도 열대야가 며칠 지속되거나 전력 수요가 급증하면 위험 판단은 달라질 수 있다.",
        `그래서 나는 ${keyword}를 판단할 때 순간 기온보다 열 축적과 시스템 부담 조건을 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/폭염|기후|주의보|재난|체감온도|날씨/i.test(hay) && /컴퓨터|소프트웨어|정보|알고리즘|AI|인공지능|데이터/i.test(hay)){
      return base(
        `${keyword}, 기온 하나만 보고 판단해도 될까?`,
        `기온·습도·체감온도를 입력값으로 보고, 어떤 조건을 기준으로 ${keyword}를 판단할지 직접 설계한다.`,
        [`${keyword}는 기온 하나만으로 판단해도 충분할까?`, `기온·습도·체감온도를 함께 보면 판단 결과가 어떻게 달라질까?`, `주의보를 자동으로 판단하는 시스템을 만든다면 어떤 입력값과 조건문이 필요할까?`],
        [[`${keyword}의 공식 발령 기준`, "기상청·공공기관 자료", "서론"], ["기온·습도·체감온도 자료", "기상자료개방포털·공공데이터", "본론 1"], ["폭염 피해 또는 주의 안내 사례", "뉴스·지자체·보도자료", "본론 2"]],
        [["비교 항목", "기온만 볼 때", "기온+습도/체감온도", "내 해석"], ["입력값", "최고기온", "기온·습도·체감온도", "판단에 필요한 자료가 늘어난다"], ["조건문", "기온이 기준 이상이면 주의", "체감온도와 지속 시간까지 확인", "조건이 세밀해진다"], ["판단 결과", "주의보 여부만 확인", "실제 위험 정도까지 해석", "단순 안내에서 위험 판단으로 확장된다"], ["오류 가능성", "습도·취약계층을 놓칠 수 있음", "자료가 많아 해석 기준이 복잡해짐", "기준의 장점과 한계를 함께 쓴다"]],
        "전공 연결은 컴퓨터공학과를 희망한다는 말이 아니라, 입력값을 정하고 조건문으로 판단하며 결과의 오류를 검증하는 구조를 보여주는 것이다.",
        "교과에서 배운 측정값과 조건 개념을 먼저 쓰고, 기온·습도·체감온도를 폭염 판단 시스템의 입력값으로 해석한다고 연결한다.",
        "예: 기온은 숫자 자료이지만, 사회에서는 폭염주의보를 내릴지 판단하는 기준이 된다. 그래서 이 탐구에서는 기온 하나가 아니라 습도·체감온도·지속 시간을 함께 보며 판단 기준을 세운다.",
        `그래서 나는 ${keyword}를 판단할 때 기온 하나보다 여러 입력값과 조건문을 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/폭염|기후|주의보|재난|체감온도|날씨/i.test(hay) && /환경공학|환경|대기|기후|지구환경/i.test(hay)){
      return base(
        `${keyword}는 어떤 환경 조건에서 위험도가 커질까?`,
        `온도·습도·노출 시간·취약 집단을 환경 변수로 보고, ${keyword}의 위험도를 낮출 기준을 세운다.`,
        [`${keyword}의 위험도는 어떤 환경 조건에서 커질까?`, `지역별 온도·습도·녹지 조건을 비교하면 위험 판단은 어떻게 달라질까?`, `위험을 줄이기 위해 어떤 환경 관리 기준이 필요할까?`],
        [[`${keyword} 공식 기준`, "기상청·행정안전부 자료", "서론"], ["지역별 기온·습도·열대야 자료", "기상자료개방포털·지자체 통계", "본론 1"], ["녹지·그늘·취약계층 피해 사례", "환경부·지자체·보도자료", "본론 2"]],
        [["비교 항목", "기상 조건", "환경 조건", "내 해석"], ["위험 요인", "기온·습도", "녹지 부족·포장 면적·노출 시간", "기상 자료만으로는 생활 위험을 모두 설명하기 어렵다"], ["피해 가능성", "주의보 발령 여부", "취약 집단·지역 차이", "같은 기온이어도 피해 수준은 다를 수 있다"], ["저감 방향", "안내 문자·주의보", "그늘·물 공급·쉼터·녹지", "환경 개선 기준이 필요하다"]],
        "전공 연결은 환경공학과 이름을 붙이는 것이 아니라, 오염·열·노출·취약성 같은 환경 변수를 비교해 위험을 줄이는 기준을 세우는 것이다.",
        "교과의 측정값과 시스템 개념을 활용해 폭염을 단순 날씨가 아니라 환경 조건과 생활 위험이 연결된 현상으로 해석한다.",
        "예: 같은 기온이라도 습도, 그늘, 포장 면적, 노출 시간이 다르면 실제 위험은 달라진다. 그래서 자료를 환경 변수로 나누어 비교한다.",
        `그래서 나는 ${keyword}를 판단할 때 기상 기준뿐 아니라 노출 환경과 저감 조건까지 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/폭염|기후|주의보|재난|체감온도|날씨/i.test(hay) && /도시|건축|주거|토목|인프라/i.test(hay)){
      return base(
        `${keyword}는 도시 공간에 따라 다르게 나타날까?`,
        `건물 밀도·포장 면적·그늘·녹지·이동 동선을 공간 변수로 보고, ${keyword}의 지역 차이를 비교한다.`,
        [`${keyword}는 도시 공간 구조에 따라 다르게 나타날까?`, `같은 기온이어도 녹지와 포장 면적이 다른 지역의 체감 위험은 어떻게 달라질까?`, `도시 설계에서 폭염 위험을 줄이려면 어떤 기준이 필요할까?`],
        [[`${keyword} 공식 기준`, "기상청·재난안전 자료", "서론"], ["지역별 기온·열섬·녹지 자료", "공공데이터·도시계획 자료", "본론 1"], ["그늘·쉼터·보행 환경 사례", "지자체 자료·현장 사진·기사", "본론 2"]],
        [["비교 항목", "주거·상업 밀집 지역", "녹지·수변 인접 지역", "내 해석"], ["공간 조건", "건물·포장 면적 높음", "그늘·녹지·수분 많음", "열이 쌓이는 조건이 다르다"], ["생활 위험", "보행·대기 시간 위험 증가", "체감 위험 완화 가능", "기온보다 공간 구조가 실제 위험을 바꿀 수 있다"], ["개선 기준", "쉼터·그늘 부족 확인", "녹지·그늘 연결성 확인", "도시 인프라 기준으로 결론을 제시한다"]],
        "전공 연결은 도시공학과 이름을 붙이는 것이 아니라, 공간 구조와 인프라 조건이 생활 위험을 어떻게 바꾸는지 비교하는 것이다.",
        "교과의 측정값 개념을 활용해 기온 자료를 도시 공간의 차이와 연결하고, 같은 수치가 다른 생활 위험으로 나타나는 이유를 설명한다.",
        "예: 같은 기온이라도 포장 면적이 넓고 그늘이 부족한 지역은 체감 위험이 커질 수 있다. 그래서 도시 공간 조건을 비교 기준으로 사용한다.",
        `그래서 나는 ${keyword}를 판단할 때 기온 수치뿐 아니라 공간 구조와 인프라 조건을 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/추천|알고리즘|개인화|필터|검색|랭킹/i.test(hay) && /컴퓨터|소프트웨어|정보|AI|인공지능|데이터/i.test(hay)){
      return base(
        `${keyword}은 어떤 입력값으로 결과를 다르게 만들까?`,
        `사용자 행동, 선택 기록, 조건값을 입력 데이터로 보고 ${keyword}의 출력 결과와 오류 가능성을 비교한다.`,
        [`${keyword}은 어떤 입력값을 기준으로 결과를 바꿀까?`, `입력값이 달라지면 추천 결과와 편향은 어떻게 달라질까?`, `공정한 추천을 위해 어떤 예외 처리와 검증 기준이 필요할까?`],
        [["추천 결과 예시", "플랫폼 사용 화면·공개 설명 자료", "서론"], ["입력값 비교 자료", "검색 기록·선호도·클릭 예시", "본론 1"], ["오류·편향 사례", "기사·연구 요약·서비스 정책", "본론 2"]],
        [["비교 항목", "입력값 A", "입력값 B", "내 해석"], ["사용자 행동", "클릭·시청 기록 중심", "검색어·관심 주제 중심", "무엇을 입력으로 삼는지에 따라 결과가 달라진다"], ["출력 결과", "비슷한 콘텐츠 반복", "새로운 콘텐츠 일부 노출", "추천의 정확성과 다양성이 충돌할 수 있다"], ["오류 가능성", "필터 버블", "관련 없는 추천", "예외 처리와 검증 기준이 필요하다"]],
        "전공 연결은 컴퓨터공학과 이름을 붙이는 것이 아니라, 입력 데이터·조건 규칙·출력 결과·오류 검증의 구조로 추천 과정을 해석하는 것이다.",
        "정보 교과의 입력·처리·출력 구조를 활용해 추천 알고리즘이 어떤 자료를 입력으로 삼고 어떤 조건을 거쳐 결과를 내는지 설명한다.",
        "예: 같은 사용자라도 입력값을 클릭 기록으로 볼 때와 검색어로 볼 때 추천 결과가 달라질 수 있다. 그래서 입력값과 조건을 나누어 비교한다.",
        `그래서 나는 ${keyword}을 판단할 때 결과만 보지 않고 입력값, 조건 규칙, 오류 가능성을 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/소비|가격|구매|시장|마케팅|브랜드|선택|비용|편익/i.test(hay) && /경영|경제|마케팅|금융|회계/i.test(hay)){
      return base(
        `${keyword}는 어떤 기준으로 합리적으로 판단할 수 있을까?`,
        `가격·만족·위험·지속 가능성을 비교해 소비나 경영 의사결정 기준을 세운다.`,
        [`${keyword}를 판단할 때 가격만 보면 충분할까?`, `비용·편익·위험을 함께 비교하면 선택 기준은 어떻게 달라질까?`, `더 합리적인 의사결정을 위해 어떤 자료가 필요할까?`],
        [["선택 상황 설명", "제품·서비스 사례·기사", "서론"], ["가격·성능·만족도 자료", "소비자원·통계·리뷰 비교", "본론 1"], ["위험·지속 가능성 자료", "기업 보고서·정책 자료·보도자료", "본론 2"]],
        [["비교 항목", "가격 중심 판단", "비용+편익+위험 판단", "내 해석"], ["비용", "구매 가격", "유지비·시간·기회비용", "보이는 비용과 숨은 비용을 나눈다"], ["편익", "즉시 만족", "성능·지속성·사회적 가치", "편익의 범위를 넓힌다"], ["위험", "불만족 가능성", "품질·환경·정보 비대칭", "의사결정의 한계를 함께 쓴다"]],
        "전공 연결은 경영학과 이름을 붙이는 것이 아니라, 비용·편익·위험을 비교해 의사결정 기준을 세우는 사고를 보여주는 것이다.",
        `${subjectLens.conceptUse}`,
        `${subjectLens.conceptExample}`,
        `그래서 나는 ${keyword}를 판단할 때 가격 하나보다 비용, 편익, 위험을 함께 비교하는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/체온|항상성|열|발열|생리|호르몬|통증|진통/i.test(hay) && /간호|보건|의학|임상/i.test(hay)){
      return base(
        `${keyword}은 몸의 어떤 조절 과정과 연결될까?`,
        `생체 반응, 위험 요인, 관리 기준을 비교해 ${keyword}을 근거 기반으로 설명한다.`,
        [`${keyword}은 몸의 어떤 조절 과정과 연결될까?`, `개인차와 환경 조건에 따라 반응은 어떻게 달라질까?`, `건강 관리를 위해 어떤 관찰 기준과 주의점이 필요할까?`],
        [["기본 생리 원리", "교과서·보건 자료", "서론"], ["위험 요인 자료", "질병관리청·의학 정보·통계", "본론 1"], ["관리·예방 기준", "보건교육 자료·병원 안내 자료", "본론 2"]],
        [["비교 항목", "정상 조절", "위험 상황", "내 해석"], ["생체 반응", "체온 유지·항상성", "발열·탈수·통증 등 변화", "몸은 조건에 따라 조절 반응을 보인다"], ["위험 요인", "일상 환경", "고온·수분 부족·개인차", "같은 조건도 사람에 따라 위험이 다르다"], ["관리 기준", "휴식·수분·관찰", "증상 지속 시 전문 도움", "단정 대신 근거와 한계를 함께 쓴다"]],
        "전공 연결은 간호학과 이름을 붙이는 것이 아니라, 생체 반응을 관찰하고 위험 요인을 분류하며 근거에 따라 관리 기준을 세우는 과정이다.",
        "생명과학의 항상성·조절 개념을 활용해 몸의 반응이 한 가지 원인이 아니라 여러 조건에 의해 달라진다는 점을 설명한다.",
        "예: 체온 조절은 단순히 덥다/춥다의 문제가 아니라 몸이 외부 환경 변화에 맞춰 균형을 유지하려는 과정이다. 그래서 위험 요인과 관리 기준을 함께 비교한다.",
        `그래서 나는 ${keyword}을 설명할 때 생체 반응, 위험 요인, 관리 기준을 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    if(/소재|물성|강도|전도|반도체|배터리|전지|고분자|결합/i.test(hay) && /신소재|재료|화학공학|화학|반도체|전자/i.test(hay)){
      return base(
        `${keyword}은 구조와 조건에 따라 어떻게 달라질까?`,
        `구조·물성·성능·안정성을 비교해 소재 선택과 개선 기준을 세운다.`,
        [`${keyword}은 물질의 구조와 조건에 따라 어떻게 달라질까?`, `성능과 안정성을 함께 보려면 어떤 자료를 비교해야 할까?`, `더 적합한 소재를 선택하려면 어떤 기준이 필요할까?`],
        [["소재의 기본 구조·성질", "교과서·소재 설명 자료", "서론"], ["물성 비교 자료", "제품 스펙·논문 요약·공공 자료", "본론 1"], ["성능·안정성 사례", "산업 기사·실험 자료·기술 보고서", "본론 2"]],
        [["비교 항목", "소재 A", "소재 B", "내 해석"], ["구조", "결합·배열 특징", "결합·배열 특징", "구조 차이가 물성 차이를 만든다"], ["물성", "강도·전도성·내열성", "강도·전도성·내열성", "목적에 따라 중요한 물성이 달라진다"], ["성능·안정성", "효율은 높지만 한계 존재", "안정성은 높지만 성능 제한", "성능과 안정성의 균형 기준이 필요하다"]],
        "전공 연결은 신소재공학과 이름을 붙이는 것이 아니라, 구조가 물성을 만들고 물성이 성능과 안정성으로 이어지는 관계를 비교하는 것이다.",
        "화학·과학 교과의 구조와 성질 개념을 활용해 물질의 미시적 구조가 실제 성능 차이로 이어지는 과정을 설명한다.",
        "예: 소재의 전도성이나 강도는 단순한 제품 특징이 아니라 원자 배열, 결합, 조건 변화와 연결된다. 그래서 구조-물성-성능의 흐름으로 비교한다.",
        `그래서 나는 ${keyword}을 판단할 때 성능 하나보다 구조, 물성, 안정성을 함께 보는 기준이 더 설득력 있다고 정리했다.`
      );
    }
    return Object.assign(scenario, {
      conceptUse: subjectLens.conceptUse,
      conceptExample: subjectLens.conceptExample,
      majorConnect: `전공 연결은 '${major}'라는 이름을 반복하는 것이 아니라, ${lens.shortLabel} 관점으로 자료를 나누고 비교해 판단 기준을 세우는 것이다.`
    });
  }

  function buildStudentReportFromPayload(req, rawData){
    const s = req?.mini_payload?.selectionPayload || {};
    const resolved = getWorkerResolved(rawData);
    const book = req.selectedBook || req?.mini_payload?.selectedBook || {};
    const choices = req.report_choices || getReportChoices(req.mini_payload || {});
    const majorContext = getMajorContext(req);

    const subject = firstNonEmpty(s.subject, req.subject, resolved.subject, "선택 과목");
    const subjectGroup = firstNonEmpty(req.subjectGroup, s.subjectGroup, classifyDonggukSubjectFrame(subject, "").subjectGroup, "");
    const major = firstNonEmpty(majorContext?.display_name, s.department, req.career, resolved.major, resolved.track, "선택 진로 분야");
    const concept = firstNonEmpty(s.selectedConcept, req.selectedConcept, "선택 교과 개념");
    const keyword = firstNonEmpty(s.selectedKeyword, s.selectedRecommendedKeyword, req.selectedKeyword, req.keyword, resolved.keyword, "선택 키워드");
    const axisRaw = cleanDisplayText(firstNonEmpty(s.selectedFollowupAxis, s.followupAxis, req.selectedFollowupAxis, "선택 후속 연계축"));
    const axis = cleanDisplayText(compactAxis(axisRaw));
    let mode = firstNonEmpty(choices.mode, choices.modeLabel, s.reportMode, "전개 방식 선택값");
    const view = firstNonEmpty(choices.view, choices.viewLabel, s.reportView, "관점 선택값");
    const line = firstNonEmpty(choices.line, choices.lineLabel, s.reportLine, "라인 선택값");
    const requestedBookMode = firstNonEmpty(req.bookUsageMode, s.bookUsageMode, req?.mini_payload?.bookUsageMode, "");
    const bookTitle = /useBook/i.test(requestedBookMode) ? firstNonEmpty(book.title, req.selectedBookTitle, "") : "";

    const expansion = getSecondaryExpansionContext(req, { subject, major, concept, keyword, axis: axisRaw, mode, view, line, bookTitle });
    const baseSummaryForAi = [
      `과목: ${subject}`,
      `진로/학과: ${major}`,
      `교과 개념: ${concept}`,
      `추천 키워드: ${keyword}`,
      `후속 연계축: ${axisRaw}`,
      `도서 활용: ${bookTitle || "사용하지 않음"}`,
      `수행평가 방식: ${mode}`,
      `평가 관점: ${view}`,
      `결과물 수준: ${line}`
    ].join("\n");

    const allText = `${keyword} ${axisRaw} ${concept} ${major}`;
    const lens = deriveMajorLens(major, majorContext, allText);
    const useBookInReport = !!bookTitle;
    if (mode === "book" && !useBookInReport) mode = "compare";
    const bookGuide = useBookInReport ? deriveBookGuide(bookTitle, keyword, concept, axis, lens) : null;
    const choiceBlueprint = buildReportChoiceBlueprint({ mode: (mode === "book" && !useBookInReport ? "compare" : mode), view, line, keyword, concept, axis, lens, bookTitle, subject, major });
    const isWeather = /폭염|기후|재난|주의보|대기|환경|날씨|기상/.test(allText);
    const isComputer = /컴퓨터|소프트웨어|인공지능|AI|데이터사이언스|정보보호|프로그래밍|알고리즘|시스템|네트워크/i.test(`${major} ${lens.keywords.join(" ")}`);
    const isBio = /세포|생명|유전자|효소|대사|약물|면역|질병|의학|보건|간호/.test(allText + " " + major);
    const isEnergy = /물리|에너지|역학|전자기|파동|열|전기|배터리|전지/.test(allText + " " + major);
    const subjectLens = deriveSubjectLens(subject, concept, keyword);
    const scenario = deriveV54Scenario({ subject, major, concept, keyword, axis, axisRaw, allText, lens, subjectLens });

    let title = `${keyword}는 어떤 기준으로 판단할 수 있을까?`;
    let goal = `${keyword}와 관련된 기준을 찾고, 실제 자료를 비교해 나만의 판단 기준을 만든다.`;
    let focusQuestion = `${keyword}를 판단하려면 어떤 자료와 기준이 필요할까?`;
    let q = [
      focusQuestion,
      `자료를 한 가지만 볼 때와 여러 자료를 함께 볼 때 결론은 어떻게 달라질까?`,
      `내가 세운 기준에는 어떤 장점과 한계가 있을까?`
    ];
    let dataRows = [
      [`${keyword}의 기본 기준`, "교과서·공식 기관", "서론"],
      ["비교 자료 1", "공공데이터·통계·기사", "본론 1"],
      ["비교 자료 2", "공공데이터·통계·기사", "본론 2"]
    ];
    let tableRows = [
      ["비교 항목", "자료 1", "자료 2", "내 해석"],
      ["기준", "공식 기준", "내가 세운 기준", "무엇이 다른가"],
      ["자료", "사례/수치 1", "사례/수치 2", "왜 차이가 나는가"],
      ["결론", "판단 A", "판단 B", "더 타당한 기준은 무엇인가"]
    ];
    let majorConnect = `전공 연결은 '${major}'라는 이름을 반복하는 것이 아니라, 이 분야에서 배우는 핵심 개념을 자료 해석 기준으로 사용하는 것이다.`;
    let conceptConnect = `${concept} 개념은 자료를 해석할 때 쓰는 기본 설명으로 사용한다.`;
    let conceptUse = subjectLens.conceptUse || `${concept}에서 배운 핵심 말을 먼저 쉬운 말로 바꾸고, 내가 찾은 자료를 어떤 기준으로 해석할지 연결한다.`;
    let conceptExample = subjectLens.conceptExample || `${concept} 개념을 통해 자료를 단순한 정보가 아니라 판단 근거로 해석할 수 있다.`;

    let conclusionSentence = scenario.conclusionSentence || `그래서 나는 ${keyword}를 판단할 때 한 가지 기준보다 여러 조건을 함께 보는 기준이 더 설득력 있다고 정리했다.`;

    if(scenario && scenario.title){
      title = scenario.title;
      goal = scenario.goal || goal;
      focusQuestion = scenario.focusQuestion || focusQuestion;
      q = scenario.q || q;
      dataRows = scenario.dataRows || dataRows;
      tableRows = scenario.tableRows || tableRows;
      majorConnect = scenario.majorConnect || majorConnect;
      conceptUse = scenario.conceptUse || conceptUse;
      conceptExample = scenario.conceptExample || conceptExample;
      conclusionSentence = scenario.conclusionSentence || conclusionSentence;
    }else if(isWeather && isComputer){
      title = `${keyword}, 기온 하나만 보고 판단해도 될까?`;
      goal = `기온·습도·체감온도를 입력값으로 보고, 어떤 조건을 기준으로 ${keyword}를 판단할지 직접 설계한다.`;
      focusQuestion = `${keyword}는 기온 하나만으로 판단해도 충분할까?`;
      q = [
        `${keyword}는 기온 하나만으로 판단해도 충분할까?`,
        `기온·습도·체감온도를 함께 보면 판단 결과가 어떻게 달라질까?`,
        `주의보를 자동으로 판단하는 시스템을 만든다면 어떤 입력값과 조건문이 필요할까?`
      ];
      dataRows = [
        [`${keyword}의 공식 발령 기준`, "기상청·공공기관 자료", "서론"],
        ["기온·습도·체감온도 자료", "기상자료개방포털·공공데이터", "본론 1"],
        ["폭염 피해 또는 주의 안내 사례", "뉴스·지자체·보도자료", "본론 2"]
      ];
      tableRows = [
        ["비교 항목", "기온만 볼 때", "기온+습도/체감온도", "내 해석"],
        ["입력값", "최고기온", "기온·습도·체감온도", "판단에 필요한 자료가 늘어난다"],
        ["조건문", "기온이 기준 이상이면 주의", "체감온도와 지속 시간까지 확인", "조건이 세밀해진다"],
        ["판단 결과", "주의보 여부만 확인", "실제 위험 정도까지 해석", "단순 안내에서 위험 판단으로 확장된다"],
        ["오류 가능성", "습도·취약계층을 놓칠 수 있음", "자료가 많아 해석 기준이 복잡해짐", "기준의 장점과 한계를 함께 쓴다"]
      ];
      majorConnect = "전공 연결은 컴퓨터공학과를 희망한다는 말이 아니라, 입력값을 정하고 조건문으로 판단하며 결과의 오류를 검증하는 구조를 보여주는 것이다.";
      conceptConnect = `${concept} 개념은 '측정값이 사회적 판단에 어떻게 쓰이는가'를 설명하는 부분에 넣는다.`;
      conceptUse = "교과에서 배운 '측정값은 사회적 판단에 쓰일 수 있다'는 내용을 먼저 쓰고, 기온·습도·체감온도를 폭염 판단 기준으로 해석한다고 연결한다.";
      conceptExample = "예: 기온은 숫자 자료이지만, 사회에서는 폭염주의보를 내릴지 판단하는 기준이 된다. 그래서 이 탐구에서는 기온 하나가 아니라 습도·체감온도·지속 시간을 함께 보며 판단 기준을 세운다.";
      conclusionSentence = `그래서 나는 ${keyword}를 판단할 때 기온 하나보다 여러 입력값과 조건문을 함께 보는 기준이 더 설득력 있다고 정리했다.`;
    }else if(isBio){
      title = `${keyword}, 어떤 근거로 설명할 수 있을까?`;
      goal = `${keyword}와 관련된 원인·조건·영향을 자료로 찾아보고, 어떤 근거가 설명에 필요한지 정리한다.`;
      focusQuestion = `${keyword}는 몸이나 생명 현상에서 어떤 변화와 연결될까?`;
      q = [
        `${keyword}는 몸이나 생명 현상에서 어떤 변화와 연결될까?`,
        `관련 자료를 비교하면 원인이나 조건을 어떻게 설명할 수 있을까?`,
        `예방·관리·개선 방향을 제안하려면 어떤 근거가 더 필요할까?`
      ];
    }else if(isEnergy){
      title = `${keyword}, 조건을 바꾸면 결과가 달라질까?`;
      goal = `${keyword}에 영향을 주는 조건을 찾고, 조건이 달라질 때 결과가 어떻게 바뀌는지 표로 정리한다.`;
      focusQuestion = `${keyword}의 결과를 바꾸는 조건은 무엇일까?`;
      q = [
        `${keyword}의 결과를 바꾸는 조건은 무엇일까?`,
        `조건을 다르게 하면 효율·안정성·성능은 어떻게 달라질까?`,
        `더 나은 결과를 얻기 위해 어떤 개선 방향을 생각할 수 있을까?`
      ];
    }

    const choiceAdjusted = applyReportChoiceBlueprint({
      title, goal, focusQuestion, q, dataRows, tableRows, majorConnect, conceptUse, conceptExample, conclusionSentence
    }, choiceBlueprint);
    title = choiceAdjusted.title;
    goal = choiceAdjusted.goal;
    focusQuestion = choiceAdjusted.focusQuestion;
    q = choiceAdjusted.q;
    dataRows = choiceAdjusted.dataRows;
    tableRows = choiceAdjusted.tableRows;
    majorConnect = choiceAdjusted.majorConnect;
    conceptUse = choiceAdjusted.conceptUse;
    conceptExample = choiceAdjusted.conceptExample;
    conclusionSentence = choiceAdjusted.conclusionSentence;

    const performanceFrame = buildDonggukPerformanceFrame({ subject, subjectGroup, concept, keyword, axis, mode, view, line, major, lens });
    const performanceAdjusted = applyDonggukPerformanceFrame({ title, goal, focusQuestion, q, dataRows, tableRows, majorConnect, conceptUse, conceptExample, conclusionSentence }, performanceFrame);
    title = performanceAdjusted.title;
    goal = performanceAdjusted.goal;
    focusQuestion = performanceAdjusted.focusQuestion;
    q = performanceAdjusted.q;
    dataRows = performanceAdjusted.dataRows;
    tableRows = performanceAdjusted.tableRows;
    conceptUse = performanceAdjusted.conceptUse;
    conceptExample = performanceAdjusted.conceptExample;
    conclusionSentence = performanceAdjusted.conclusionSentence;

    const performanceRows = [
      ["구분", "내용"],
      ["수행평가 영역명", performanceFrame.performanceName],
      ["동국대 범주", `${performanceFrame.subjectGroup} / ${performanceFrame.contentCategory} × ${performanceFrame.methodCategory}`],
      ["평가 의도", performanceFrame.evaluationIntent],
      ["성취기준 해석", performanceFrame.achievementFocus],
      ["보고서 핵심 질문", performanceFrame.focusQuestion]
    ];

    const assemblyRows = [
      ["보고서 요소", "학생이 채울 내용", "보고서 위치"],
      ["내 질문", performanceFrame.focusQuestion || "수행평가 영역명에 맞춰 바꾼 질문", "서론 마지막"],
      ["전개 방향", choiceBlueprint.routeSummary || choiceBlueprint.choiceSummary, "보고서 전체 방향"],
      ["판단 기준", choiceBlueprint.judgmentBasis || (isComputer ? "입력값·조건문·오류 가능성으로 판단 기준을 세운다" : "자료 차이를 근거로 판단 기준을 세운다"), "본론 도입"],
      ["자료 3개", performanceFrame.dataGuide || choiceBlueprint.dataDepthText || (choiceBlueprint.lineKey === "advanced" ? "공식 기준 + 실제 자료 + 한계 보완 자료" : (choiceBlueprint.lineKey === "basic" ? "공식 기준 + 대표 사례 자료" : "공식 기준 + 실제 자료 + 비교 검증 자료")), "본론 1~2"],
      ["비교 표", "자료 차이와 내가 해석한 이유", "본론 핵심"],
      ["결론", "내 기준의 장점·한계·보완 자료", "결론"]
    ];

    const questionRows = [
      ["질문 원형", "그대로 쓰지 말고 이렇게 바꾸기"],
      [q[0], performanceFrame.questionGuide || "대상·비교 기준·자료 종류 중 하나를 넣는다"],
      [q[1], "비교할 자료를 구체적으로 정한다"],
      [q[2], "판단 기준이나 조건을 직접 넣는다"]
    ];
    if(isWeather && isComputer){
      questionRows.push(["예시", "서울의 7월 폭염주의보는 기온과 체감온도를 함께 볼 때 판단이 달라질까?"]);
    }else{
      questionRows.push(["예시", `${keyword}를 ${axis || "선택한 기준"}으로 볼 때 어떤 조건에서 결과가 달라질까?`]);
    }

    const dataPlanRows = [
      ["자료", "보고서에서 하는 역할", "찾는 곳", "넣을 문단"],
      ...dataRows.map((r, i) => {
        const role = i === 0 ? "기준을 설명하는 근거" : (i === 1 ? "내 비교의 중심 자료" : "판단을 보완하는 사례");
        return [r[0], role, r[1], r[2]];
      })
    ];

    const paragraphRows = [
      ["문단", "역할", "학생이 실제로 채울 내용"],
      ["1. 문제 제기", "왜 이 질문을 선택했는지 밝히기", "내가 바꾼 질문 + 이 질문이 궁금해진 이유 + 왜 한 가지 기준으로는 부족하다고 느꼈는지"],
      ["2. 자료 해석 기준", "자료를 어떤 기준으로 읽을지 설명하기", conceptUse],
      ["3. 자료 분석", "표와 근거 비교하기", `${choiceBlueprint.tableRows[0].join(" / ")} 구조로 표를 만들고, ${choiceBlueprint.tableGuide || "자료 차이와 내가 해석한 이유를 한 줄씩 적는다."}`],
      ["4. 전공 개념 활용", "전공 개념으로 판단 과정 보여주기", choiceBlueprint.majorGuide || (isComputer ? "자료를 입력값으로 보고, 어떤 조건을 넣었을 때 판단 결과가 달라지는지 순서대로 설명한다." : `${lens.process} 흐름으로 자료를 나누고 비교한다.`)],
      ["5. 결론", "내 판단 정리하기", "표에서 확인한 결과를 한 문장으로 정리하고, 내가 세운 기준이 어떤 점에서 설득력 있었는지와 부족한 점을 쓴다."]
    ];

    const expansionRows = buildExpansionRows(expansion);
    const aiReusePromptRows = buildAiReusePromptRows(expansion, baseSummaryForAi);
    const aiReusePromptBody = aiReusePromptRows
      .map(row => row.map(cell => String(cell || "").replace(/\n+/g, " / ")).join(" | "))
      .join("\n");

    const sections = [
      {title:"동국대 수행평가 영역명 기준", body:performanceRows.map(r=>r.join(" | ")).join("\n")},
      {title:"보고서 완성 그림", body:assemblyRows.map(r=>r.join(" | ")).join("\n")},
      {title:"2차 확장 방향 선택", body:expansionRows.map(r=>r.join(" | ")).join("\n")},
      {title:"ChatGPT 2차 활용 프롬프트", body:aiReusePromptBody},
      {title:"1단계. 질문을 내 사례로 바꾸기", body:questionRows.map(r=>r.join(" | ")).join("\n")},
      {title:"2단계. 자료를 어디에 넣을지 정하기", body:dataPlanRows.map(r=>r.join(" | ")).join("\n")},
      {title:"3단계. 비교 표로 증명하기", body:tableRows.map(r=>r.join(" | ")).join("\n")},
      {title:"4단계. 문단별로 조립하기", body:paragraphRows.map(r=>r.join(" | ")).join("\n")},
      {title:"보고서 문장 구조", body:[
        "문단 1. 문제 제기 | 시작 문장: 내가 바꾼 질문을 먼저 쓰고, 왜 이 질문이 궁금해졌는지 밝힌다.",
        "문단 1. 문제 제기 | 꼭 넣을 내용: 한 가지 기준만으로는 부족하다고 느낀 이유를 짧게 쓴다.",
        `문단 2. 자료 해석 기준 | 시작 문장: 이번 보고서는 자료를 단순 정보로 나열하지 않고, 판단 근거가 되는 조건과 차이를 중심으로 읽는다.`,
        `문단 2. 자료 해석 기준 | 활용 예시: ${conceptExample}`,
        `문단 2. 자료 선택 기준 | ${choiceBlueprint.paragraphGuide || "공식 기준과 실제 자료, 보완 자료가 각각 어떤 근거가 되는지 먼저 정한다."}`,
        "문단 3. 자료 분석 | 쓰는 방법: [자료 1]·[자료 2]·[자료 3]을 표로 정리하고, 각 행마다 내가 본 차이를 한 줄씩 적는다.",
        "문단 3. 자료 분석 | 해석 포인트: 표에 보이는 차이를 근거로 ‘어떤 조건에서 판단이 달라지는지’를 설명한다.",
        isComputer ? "문단 4. 전공 개념 활용 | 쓰는 방법: 자료를 입력값으로 보고, 어떤 조건을 넣었을 때 판단 결과가 달라지는지 순서대로 설명한다." : `문단 4. 전공 개념 활용 | 쓰는 방법: ${lens.shortLabel} 관점으로 자료를 나누고 비교한 방식을 설명한다.`,
        "문단 5. 결론 | 꼭 넣을 내용: 표에서 확인한 결과 + 내가 선택한 기준이 설득력 있었던 이유 + 부족했던 점을 순서대로 쓴다.",
        `문단 5. 결론 | 마무리 문장: ${conclusionSentence}`
      ].join("\n")},
      {title: useBookInReport ? "도서·전공 개념 연결" : "자료·전공 개념 연결", body: useBookInReport ? [
        `1) 이 카드의 기준: 책 내용을 많이 쓰는 것이 아니라, 내 판단 기준을 왜 넓혀야 하는지 설명하는 데만 사용한다.`,
        `2) 책에서 가져올 핵심 한 줄: ${bookGuide.content}`,
        `3) 내 탐구에 적용하는 구조: ${bookGuide.topicLink}`,
        `4) 보고서에 넣는 위치: ${bookGuide.position}`,
        `5) 이렇게 활용하면 된다: ${bookGuide.sentence}`,
        `6) 전공 개념 활용: ${majorConnect}`,
        `7) 주의할 점: ${bookGuide.caution}`
      ].join("\n") : [
        `1) 이 카드의 기준: 도서 없이 공공자료·통계·기사·실험자료를 근거로 사용한다.`,
        `2) 가져올 핵심 자료: 공식 기준, 실제 수치, 비교 사례, 한계 자료 중 2~3개`,
        `3) 내 탐구에 적용하는 구조: 자료를 기준-비교-해석-한계 순서로 배치한다.`,
        `4) 보고서에 넣는 위치: 서론에는 기준 자료, 본론에는 비교 자료, 결론에는 한계 자료를 넣는다.`,
        `5) 이렇게 활용하면 된다: 책 요약 대신 자료 출처와 비교 기준을 분명히 쓰고, 표와 해석 문장으로 연결한다.`,
        `6) 전공 개념 활용: ${majorConnect}`,
        `7) 주의할 점: 참고문헌에 책 제목을 억지로 넣지 않는다.`
      ].join("\n")},
      {title:"제출 전 5분 점검", body:[
        "□ 질문 원형을 그대로 쓰지 않고 내 사례로 바꿨는가?",
        "□ 동국대식 수행평가 영역명처럼 ‘무엇을’과 ‘어떻게’가 모두 드러나는가?",
        "□ 자료가 어느 문단에 들어갈지 정했는가?",
        "□ 표에 실제 자료와 내 해석이 함께 들어갔는가?",
        "□ 자료를 단순 정보가 아니라 판단 기준으로 해석했는가?",
        "□ 학과 이름만 붙이지 않고 전공 개념을 사용했는가?",
        useBookInReport ? "□ 도서를 요약하지 않고 내 판단 기준을 넓히는 근거로 사용했는가?" : "□ 도서 대신 자료 출처와 비교 기준을 명확히 제시했는가?",
        "□ 결론에 표에서 확인한 결과, 내 기준의 장점, 부족한 점을 적었는가?"
      ].join("\n")}
    ];

    const text = [`설계서 제목\n${title}`, ...sections.map((sec, idx) => `${idx + 1}. ${sec.title}\n${sec.body}`)].join("\n\n");
    return {
      text,
      sections: [{title:"설계서 제목", body:title}, ...sections],
      title,
      source: "payload-secondary-expansion-blueprint-v228-1-render-fix-dongguk-performance-assessment",
      note: "학생이 보고서의 구조를 따라가며 질문-자료-표-문단-도서 활용까지 채울 수 있도록 정리했습니다.",
      diagnostics: {
        mode,
        view,
        line,
        productMode: "secondary_expansion_ai_reuse_blueprint_v229",
        secondaryExpansionContext: expansion,
        reportChoiceBlueprint: { modeKey: choiceBlueprint.modeKey, viewKey: choiceBlueprint.viewKey, lineKey: choiceBlueprint.lineKey, choiceSummary: choiceBlueprint.choiceSummary },
        donggukPerformanceFrame: performanceFrame,
        focusQuestion,
        majorLens: isComputer ? "입력값·조건문·오류 검증" : lens.shortLabel,
        majorKeywords: isComputer ? ["입력값", "조건문", "알고리즘", "오류 검증"] : lens.keywords.slice(0,4)
      }
    };
  }

  function hideBuiltInResultShell(){
    const resultSection = $("resultSection");
    if(!resultSection) return;
    [".student-top", ".action-card", ".student-grid", ".report-panel", ".details-panel"].forEach(sel => {
      resultSection.querySelectorAll(sel).forEach(el => { el.style.display = "none"; });
    });
  }

  function extractGeneratedText(data, req){
    // v47부터는 중심 질문을 그대로 제공하지 않고 학생이 지역·기간·대상·비교 기준으로 변형하도록 안내하며, 보고서 데이터형 문장 구조가 보이는
    // 학생용 탐구 조립 지도를 렌더링한다. Worker 응답은 resolved/pattern 진단과 로그 용도로만 보조 활용한다.
    const composed = buildStudentReportFromPayload(req, data);
    return { text: composed.text, sections: composed.sections, source: composed.source, fallback: true, note: composed.note, diagnostics: composed.diagnostics, title: composed.title };
  }

  const KNOWN_SECTION_TITLES = [
    "설계서 제목",
    "선택 기반 탐구 경로 요약",
    "최종 추천 탐구 방향",
    "학과 키워드 → 탐구 기준 변환",
    "학생이 선택할 탐구 질문 3개",
    "개인화 분기 선택지",
    "실제 조사 자료와 출처 계획",
    "자료 정리 표 양식",
    "보고서 목차 설계",
    "문단별 작성 가이드",
    "학생이 직접 채워 쓸 문장 시작 틀",
    "선택 도서 활용 방식",
    "교과 개념·진로 연결 포인트",
    "교과 개념·전공 개념 연결 포인트",
    "심화 확장 방향",
    "제출 전 체크리스트",
    "보고서 제목",
    "중요성",
    "탐구 주제",
    "탐구 동기",
    "관련 키워드",
    "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?",
    "이 개념이 무엇이며 어떤 원리인가?",
    "어떤 문제를 해결할 수 있고, 왜 중요한가?",
    "실제 적용 및 문제 해결 과정",
    "교과목 연계 및 이론적 설명",
    "선택 도서 활용",
    "심화 탐구 발전 방안",
    "느낀점",
    "느낀 점",
    "세특 문구 예시",
    "참고문헌 및 자료"
  ];

  function escapeRegex(value){
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function splitInlineHeading(value){
    const raw = String(value || "").trim().replace(/[:：]$/, "");
    for(const title of KNOWN_SECTION_TITLES){
      if(raw === title) return { title, body: "" };
      if(raw.startsWith(title + " ")){
        return { title, body: raw.slice(title.length).trim() };
      }
    }
    return { title: raw, body: "" };
  }

  function splitSections(text){
    const raw0 = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
    if(!raw0) return [];

    const headingAlternation = KNOWN_SECTION_TITLES.map(escapeRegex).join("|");
    const raw = raw0
      .replace(new RegExp("\\s+(?=\\d{1,2}[.)]\\s*(?:" + headingAlternation + "))", "g"), "\n")
      .replace(new RegExp("(?<!^)\\s+(?=(?:" + headingAlternation + ")\\s)", "g"), "\n");

    const blocks = raw.split(/\n(?=\d{1,2}[.)]\s*)/).map(v => v.trim()).filter(Boolean);
    const out = [];

    blocks.forEach(block => {
      const lines = block.split(/\n+/).map(v => v.trim()).filter(Boolean);
      if(!lines.length) return;
      const first = lines.shift();
      const numbered = first.match(/^\d{1,2}[.)]\s*(.+)$/);
      const head = splitInlineHeading(numbered ? numbered[1] : first);
      let body = [head.body].concat(lines).filter(Boolean).join("\n").trim();
      let title = head.title.trim();
      if(!title && body){ title = "보고서 내용"; }
      out.push({ title: title || "보고서 내용", body });
    });

    if(out.length <= 1){
      const lines = raw.split(/\n+/).map(v => v.trim()).filter(Boolean);
      const rebuilt = [];
      let current = null;
      lines.forEach(line => {
        const numbered = line.match(/^\d{1,2}[.)]\s*(.+)$/);
        const maybe = splitInlineHeading(numbered ? numbered[1] : line);
        const isHeading = !!numbered || KNOWN_SECTION_TITLES.includes(maybe.title);
        if(isHeading){
          if(current) rebuilt.push(current);
          current = { title: maybe.title, body: maybe.body || "" };
        }else if(current){
          current.body += (current.body ? "\n" : "") + line;
        }else{
          current = { title: "보고서 내용", body: line };
        }
      });
      if(current) rebuilt.push(current);
      if(rebuilt.length > out.length) return rebuilt;
    }

    return out;
  }


  function normalizeSectionTitle(value){
    return String(value || "")
      .replace(/^\d{1,2}[.)]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function dedupeSections(sections){
    const out = [];
    const seenExact = new Set();
    const seenRepeatTitle = new Set();
    const repeatSensitiveTitles = new Set([
      "탐구 동기",
      "관련 키워드",
      "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?",
      "이 개념이 무엇이며 어떤 원리인가?",
      "어떤 문제를 해결할 수 있고, 왜 중요한가?",
      "실제 적용 및 문제 해결 과정",
      "교과목 연계 및 이론적 설명",
      "선택 도서 활용",
      "심화 탐구 발전 방안",
      "느낀점",
      "세특 문구 예시",
      "참고문헌 및 자료"
    ]);

    (sections || []).forEach(sec => {
      const title = normalizeSectionTitle(sec?.title);
      const body = String(sec?.body || "").trim();
      if(!title && !body) return;

      const exactKey = `${title}::${body.replace(/\s+/g, " ").slice(0, 240)}`.toLowerCase();
      if(seenExact.has(exactKey)) return;

      if(repeatSensitiveTitles.has(title)){
        if(seenRepeatTitle.has(title)) return;
        seenRepeatTitle.add(title);
      }

      seenExact.add(exactKey);
      out.push({ title: title || "보고서 내용", body });
    });
    return out;
  }
  function isTableSection(sec){
    const lines = String(sec?.body || "").split(/\n/).map(v => v.trim()).filter(Boolean);
    return lines.length >= 2 && lines[0].includes("|") && lines[1].includes("|");
  }

  function renderTableFromText(body){
    const rows = String(body || "").split(/\n/).map(line => line.trim()).filter(Boolean).map(line => line.split("|").map(cell => cell.trim()));
    if(!rows.length) return "";
    const head = rows[0];
    const bodyRows = rows.slice(1);
    return `
      <div class="mini-v43-table-wrap">
        <table class="mini-v43-table">
          <thead><tr>${head.map(cell => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
          <tbody>
            ${bodyRows.map(row => `<tr>${head.map((_, i) => `<td>${escapeHtml(row[i] || "")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderLineList(body){
    const lines = String(body || "").split(/\n/).map(v => v.trim()).filter(Boolean);
    return lines.map(line => {
      if(/^□/.test(line)) return `<li class="mini-v43-check">${escapeHtml(line)}</li>`;
      if(/^(추천 질문|다른 선택|사용 방법|중심 질문|최종 목표|오늘 할 일|교과 개념 넣기|교과 개념 예시|왜 이 책인가\?|책에서 가져올 내용|내 주제와 연결되는 부분|보고서에 넣는 위치|이렇게 쓰면 자연스럽다|전공 개념은 이렇게 연결한다|주의할 점|이 책을 쓰는 이유|연결되는 책 내용|도서 연결 문장|전공 개념 연결|진로 연결 문장|교과 연결 문장|보고서에 쓰는 말|학생이 쓸 때 주의|이 카드의 기준|책에서 가져올 핵심 한 줄|내 탐구에 적용하는 구조|이렇게 활용하면 된다|전공 개념 활용|문단 1\. 문제 제기 \| 시작 문장|문단 1\. 문제 제기 \| 꼭 넣을 내용|문단 2\. 자료 해석 기준 \| 시작 문장|문단 2\. 자료 해석 기준 \| 활용 예시|문단 3\. 자료 분석 \| 쓰는 방법|문단 3\. 자료 분석 \| 해석 포인트|문단 4\. 전공 개념 활용 \| 쓰는 방법|문단 5\. 결론 \| 꼭 넣을 내용|문단 5\. 결론 \| 마무리 문장)/.test(line)){
        const parts = line.split(":");
        const label = parts.shift();
        return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(parts.join(":").trim())}</li>`;
      }
      return `<li>${escapeHtml(line)}</li>`;
    }).join("");
  }

  function renderMiniV43Section(sec, index){
    const title = normalizeSectionTitle(sec.title);
    const body = cleanReportText(sec.body);
    const isStep = /^\d단계/.test(title);
    const isCore = /오늘의 핵심 방향|보고서 완성 그림|탐구 조립 지도/.test(title);
    const isCheck = /제출 전/.test(title);
    const icon = isCore ? "★" : (isStep ? String(index) : (isCheck ? "✓" : "•"));
    const table = isTableSection({body}) ? renderTableFromText(body) : "";
    const content = table || `<ul class="mini-v43-list">${renderLineList(body)}</ul>`;
    return `
      <article class="mini-v43-card ${isCore ? "core" : ""} ${isStep ? "step" : ""} ${isCheck ? "check" : ""}">
        <div class="mini-v43-card-head">
          <span class="mini-v43-icon">${escapeHtml(icon)}</span>
          <h4>${escapeHtml(title)}</h4>
        </div>
        ${content}
      </article>
    `;
  }


  function getPathById(expansion, id){
    const paths = Array.isArray(expansion?.paths) ? expansion.paths : [];
    return paths.find(p => String(p.id) === String(id)) || paths.find(p => p.isRecommended) || paths[0] || null;
  }


  function getSecondaryPathContext(path, req){
    const s = req?.mini_payload?.selectionPayload || {};
    const ctx = req?.mini_payload?.reportGenerationContext || {};
    return {
      subject: firstNonEmpty(s.subject, req?.subject, "선택 과목"),
      major: firstNonEmpty(s.department, s.major, req?.major, req?.career, "선택 진로 분야"),
      concept: firstNonEmpty(s.selectedConcept, req?.selectedConcept, "선택 교과 개념"),
      keyword: firstNonEmpty(s.selectedKeyword, req?.keyword, "선택 키워드"),
      axis: compactAxis(firstNonEmpty(s.selectedFollowupAxis, req?.selectedFollowupAxis, "후속 연계축")),
      mode: firstNonEmpty(ctx.reportMode, req?.reportMode, "수행평가 방식"),
      view: firstNonEmpty(ctx.reportView, req?.reportView, "평가 관점"),
      line: firstNonEmpty(ctx.reportLine, req?.reportLine, "결과물 수준"),
      pathLabel: path?.label || "자료 해석형",
      question: path?.question || `${firstNonEmpty(s.selectedKeyword, req?.keyword, "선택 키워드")}는 어떤 기준으로 분석할 수 있을까?`,
      structure: Array.isArray(path?.paragraphStructure) ? path.paragraphStructure : ["기준", "자료", "해석", "한계"],
      evidenceTypes: Array.isArray(path?.evidenceTypes) ? path.evidenceTypes : ["자료 직접 선택"]
    };
  }

  function buildEvidenceFindingGuide(path, req){
    const c = getSecondaryPathContext(path, req);
    const label = String(c.pathLabel || "");
    let sourceTypes = [];
    let searchKeywords = [];
    let whatToCopy = [];
    let easySources = [];

    if(/원리/.test(label)){
      sourceTypes = ["교과서 개념 설명", "공공기관·전문기관 기술 설명", "공식 매뉴얼·제품 원리 소개", "원리 적용 사례 기사"];
      searchKeywords = [
        `${c.keyword} 원리 조건 사례`,
        `${c.concept} ${c.keyword} 구조 성능 안정성`,
        `${c.major} ${c.keyword} 작동 원리 사례`,
        `${c.keyword} 공공기관 설명 자료`
      ];
      whatToCopy = ["원리를 설명하는 문장 1개", "작동 조건이나 구조를 보여주는 표·그림", "실제 적용 사례 1개", "한계나 주의 조건 1개"];
      easySources = ["교과서/수업자료", "한국에너지공단·KOSIS·공공기관 설명자료", "제조사 기술 설명 페이지", "과학 기사·기술 해설 자료"];
    }else if(/사례|비교/.test(label)){
      sourceTypes = ["사례 A 자료", "사례 B 자료", "두 사례를 비교할 기준 자료", "차이가 나타나는 조건 자료"];
      searchKeywords = [
        `${c.keyword} 사례 비교`,
        `${c.keyword} 조건 차이 사례`,
        `${c.concept} 실제 적용 사례`,
        `${c.major} ${c.keyword} 사례 A 사례 B`
      ];
      whatToCopy = ["사례 A의 특징", "사례 B의 특징", "비교 기준 2~3개", "두 사례에서 차이가 난 이유"];
      easySources = ["기사 2개 비교", "공공기관 보고서", "기업·기관 사례 소개", "교과서 탐구 사례"];
    }else if(/자료|해석|데이터/.test(label)){
      sourceTypes = ["통계 자료", "그래프 자료", "기사 속 수치", "실험 결과표", "공공데이터"];
      searchKeywords = [
        `${c.keyword} 통계 그래프`,
        `${c.keyword} 변화 추이 자료`,
        `${c.concept} 수치 자료`,
        `${c.major} ${c.keyword} 공공데이터 기사`
      ];
      whatToCopy = ["가장 중요한 수치 1~2개", "증가·감소·차이가 보이는 지점", "비교 기준", "자료의 한계"];
      easySources = ["KOSIS 국가통계포털", "공공데이터포털", "정부·공공기관 보도자료", "기사 속 표·그래프"];
    }else if(/사회|의미|쟁점/.test(label)){
      sourceTypes = ["사회 문제 사례", "정책·제도 자료", "이해관계자 의견", "찬반 쟁점 기사"];
      searchKeywords = [
        `${c.keyword} 사회적 영향`,
        `${c.keyword} 정책 쟁점`,
        `${c.keyword} 장점 단점 사례`,
        `${c.major} ${c.keyword} 윤리 사회 문제`
      ];
      whatToCopy = ["문제가 되는 상황", "영향을 받는 대상", "정책·제도 대응", "내가 판단한 의미"];
      easySources = ["신문 기사", "정부 정책 자료", "공공기관 보고서", "전문가 칼럼·해설"];
    }else{
      sourceTypes = ["현재 자료의 한계", "추가로 필요한 자료", "후속 실험·조사 계획", "비교·검증 자료"];
      searchKeywords = [
        `${c.keyword} 한계 후속 연구`,
        `${c.keyword} 추가 실험 조사`,
        `${c.concept} 검증 자료`,
        `${c.major} ${c.keyword} 개선 방향`
      ];
      whatToCopy = ["현재 자료로 부족한 점", "다음에 확인할 변수", "추가 자료나 실험 계획", "예상되는 결과"];
      easySources = ["현재 사용한 자료의 보완 자료", "실험 설계 예시", "공공기관 자료", "후속 기사·보고서"];
    }

    return { sourceTypes, searchKeywords, whatToCopy, easySources };
  }

  function buildEvidenceGuideText(path, req){
    const c = getSecondaryPathContext(path, req);
    const g = buildEvidenceFindingGuide(path, req);
    return [
      `자료 찾기 가이드: ${c.pathLabel}`,
      `탐구 질문: ${c.question}`,
      "",
      "1. 먼저 찾을 자료 유형",
      ...g.sourceTypes.map((v,i)=>`${i+1}) ${v}`),
      "",
      "2. 그대로 검색해볼 문장",
      ...g.searchKeywords.map((v,i)=>`${i+1}) ${v}`),
      "",
      "3. 자료에서 가져올 것",
      ...g.whatToCopy.map((v,i)=>`${i+1}) ${v}`),
      "",
      "4. 학생이 입력칸에 채우는 방법",
      "- 자료 제목: 실제 자료의 제목을 그대로 적는다.",
      "- 출처: 기관명·기사명·교과서·보고서명을 적는다.",
      "- 자료 핵심 내용: 자료에서 확인한 수치·사례·문장을 1~2개 적는다.",
      "- 내 해석: 이 자료를 보고 내가 판단한 점을 한 문장으로 쓴다.",
      "",
      "주의: 실제 출처와 자료 내용을 모르면 임의로 만들지 말고, 검색어와 자료 유형만 먼저 정리한 뒤 다시 찾는다."
    ].join("\n");
  }

  function buildSecondaryMiniDraftPrompt(path, req, extra){
    const c = getSecondaryPathContext(path, req);
    const g = buildEvidenceFindingGuide(path, req);
    const book = req?.selectedBook || {};
    const hasEvidence = Boolean(String(extra?.evidenceTitle || "").trim() || String(extra?.evidenceSource || "").trim() || String(extra?.evidencePoint || "").trim() || String(extra?.studentView || "").trim());
    return [
      "아래 1차 탐구 설계값과 학생이 선택한 2차 확장 방향을 바탕으로 수행평가 보고서 초안을 생성해줘.",
      "단, 실제 자료 제목·출처·핵심 내용이 비어 있으면 절대 지어내지 말고 [학생 입력 필요]로 표시해줘.",
      "자료가 부족한 경우에는 먼저 자료 찾기 방향과 검색어를 제시한 뒤, 그 자료를 넣을 위치가 보이는 초안 구조를 만들어줘.",
      "고등학생 수행평가 수준을 넘는 대학 수준 내용은 피하고, 교과 개념과 학생 선택값의 연결성을 중심으로 작성해줘.",
      "동국대 수행평가 기준처럼 주제(내용)와 방법, 과정 증거가 문단 안에 드러나게 해줘.",
      "",
      "[1차 탐구 설계값]",
      `과목: ${c.subject}`,
      `진로/학과: ${c.major}`,
      `교과 개념: ${c.concept}`,
      `추천 키워드: ${c.keyword}`,
      `후속 연계축: ${c.axis}`,
      `수행평가 방식: ${c.mode}`,
      `평가 관점: ${c.view}`,
      `결과물 수준: ${c.line}`,
      `도서 활용: ${book?.title ? book.title : "도서 미사용 또는 공공자료 중심"}`,
      "",
      "[2차 확장 방향]",
      `확장 방향: ${c.pathLabel}`,
      `탐구 질문: ${c.question}`,
      `보고서 구조: ${c.structure.join(" → ")}`,
      `필요 자료 유형: ${c.evidenceTypes.join(" / ")}`,
      "",
      "[학생 입력 자료]",
      `자료 제목: ${String(extra?.evidenceTitle || "").trim() || "[학생 입력 필요]"}`,
      `출처: ${String(extra?.evidenceSource || "").trim() || "[학생 입력 필요]"}`,
      `자료 핵심 내용: ${String(extra?.evidencePoint || "").trim() || "[학생 입력 필요]"}`,
      `내 해석: ${String(extra?.studentView || "").trim() || "[학생 입력 필요]"}`,
      "",
      "[자료 입력이 부족할 때 참고할 검색어]",
      ...g.searchKeywords.map(v => `- ${v}`),
      "",
      "[출력 형식]",
      "1. 자료 준비 상태 진단",
      "2. 5문단 보고서 초안",
      "   - 1문단: 문제 제기와 교과 개념 연결",
      "   - 2문단: 기준과 자료 제시",
      "   - 3문단: 자료 분석과 내 해석",
      "   - 4문단: 선택한 2차 확장 방향 반영",
      "   - 5문단: 결론, 한계, 후속 탐구",
      "3. 학생이 실제로 고쳐야 할 부분 체크리스트",
      "",
      hasEvidence
        ? "학생 입력 자료를 최대한 반영하되, 부족한 부분은 [학생 보완 필요]로 표시해줘."
        : "학생 입력 자료가 거의 없으므로 완성형 보고서가 아니라 자료를 넣을 자리가 보이는 초안 구조로 만들어줘."
    ].join("\n");
  }

  function buildSecondaryMiniDraftRequest(path, req, extra){
    const prompt = buildSecondaryMiniDraftPrompt(path, req, extra);
    const c = getSecondaryPathContext(path, req);
    return {
      ...req,
      mode: "secondary_expansion_draft_generation_v230",
      generationMode: "secondary_expansion_mini_draft",
      prompt,
      miniInstruction: prompt,
      taskDescription: prompt,
      secondaryDraftRequest: {
        version: "secondary-expansion-mini-draft-v230",
        selectedExpansionPath: path || null,
        studentEvidence: extra || {},
        context: c
      },
      messages: [
        { role: "system", content: "너는 고등학생 수행평가 보고서를 대신 써주는 사람이 아니라, 학생의 1차 설계값과 2차 확장 방향을 읽고 개인화된 초안 구조를 만들어주는 도우미다. 실제 출처와 자료 내용은 절대 지어내지 않는다." },
        { role: "user", content: prompt }
      ]
    };
  }

  function buildSecondaryDraftText(path, req, extra){
    const s = req?.mini_payload?.selectionPayload || {};
    const ctx = req?.mini_payload?.reportGenerationContext || {};
    const book = req?.selectedBook || {};
    const subject = firstNonEmpty(s.subject, req?.subject, "선택 과목");
    const major = firstNonEmpty(s.department, s.major, req?.major, "선택 진로 분야");
    const concept = firstNonEmpty(s.selectedConcept, req?.selectedConcept, "선택 교과 개념");
    const keyword = firstNonEmpty(s.selectedKeyword, req?.keyword, "선택 키워드");
    const axis = compactAxis(firstNonEmpty(s.selectedFollowupAxis, req?.selectedFollowupAxis, "후속 연계축"));
    const mode = firstNonEmpty(ctx.reportMode, req?.reportMode, "수행평가 방식");
    const view = firstNonEmpty(ctx.reportView, req?.reportView, "평가 관점");
    const line = firstNonEmpty(ctx.reportLine, req?.reportLine, "결과물 수준");
    const pathLabel = path?.label || "자료 해석형";
    const question = path?.question || `${keyword}는 어떤 기준으로 분석할 수 있을까?`;
    const structure = Array.isArray(path?.paragraphStructure) ? path.paragraphStructure : ["기준", "자료", "해석", "한계"];
    const evidence = Array.isArray(path?.evidenceTypes) ? path.evidenceTypes.join("·") : "자료 직접 선택";
    const evidenceTitle = extra?.evidenceTitle?.trim() || "[학생이 찾은 자료 제목 입력]";
    const evidenceSource = extra?.evidenceSource?.trim() || "[출처 입력]";
    const evidencePoint = extra?.evidencePoint?.trim() || "[자료에서 확인한 핵심 수치·사례·문장 입력]";
    const studentView = extra?.studentView?.trim() || "[내가 해석한 의미 입력]";
    const bookLine = book?.title ? `선택 도서 '${book.title}'는 결론이나 한계 문단에서 관점을 넓히는 보조 근거로만 사용한다.` : "도서를 억지로 넣지 않고 공공자료·통계·기사·실험자료 중심으로 근거를 세운다.";

    return [
      `보고서 초안 생성 방향: ${pathLabel}`,
      `탐구 질문: ${question}`,
      "",
      "[1문단. 문제 제기]",
      `나는 ${subject}에서 배운 '${concept}' 개념을 바탕으로 '${keyword}'가 어떤 조건에서 달라지는지 확인하고자 한다. 특히 이번 보고서는 '${axis}' 흐름을 적용해 단순 설명이 아니라 판단 기준을 세우는 방식으로 전개한다.`,
      `이 주제를 ${major} 관점과 연결하면, 중요한 것은 전공명을 붙이는 것이 아니라 ${mode}에 맞게 자료를 나누고 ${view} 관점으로 해석하는 과정이다.`,
      "",
      "[2문단. 기준과 자료 제시]",
      `이번 초안의 2차 확장 방향은 '${pathLabel}'이다. 따라서 보고서의 중심 구조는 '${structure.join(" → ")}' 순서로 잡는다.`,
      `사용할 자료 유형은 ${evidence}이며, 우선 '${evidenceTitle}' 자료를 ${evidenceSource}에서 확인한다.`,
      `이 자료에서 확인한 핵심 내용은 ${evidencePoint}이다.`,
      "",
      "[3문단. 분석과 해석]",
      `자료를 단순히 소개하지 않고, '${concept}' 개념으로 읽어야 한다. 즉, 자료 속 차이·조건·수치·사례가 '${keyword}' 판단에 어떤 근거가 되는지 설명한다.`,
      `내 해석은 ${studentView}이다. 이 부분은 학생 본인이 실제 자료를 보고 자신의 말로 반드시 고쳐 써야 한다.`,
      "",
      "[4문단. 확장 방향 반영]",
      `선택한 '${pathLabel}' 방향에 맞춰, 본문에서는 ${structure.map((v,i)=>`${i+1}) ${v}`).join(" / ")} 순서가 드러나야 한다.`,
      `${bookLine}`,
      "",
      "[5문단. 결론과 후속 탐구]",
      `따라서 이번 탐구는 '${concept}'을 단순 정의하는 데서 끝나지 않고, '${keyword}'를 ${pathLabel} 방식으로 다시 해석해 보는 과정이다.`,
      `다만 현재 자료만으로는 모든 조건을 일반화하기 어렵기 때문에, 결론에는 내가 세운 기준의 장점과 부족한 점, 그리고 추가로 확인할 자료를 함께 제시한다.`,
      "",
      "[학생이 반드시 고쳐야 할 부분]",
      "1. [학생이 찾은 자료 제목 입력]을 실제 자료명으로 바꾸기",
      "2. [출처 입력]을 실제 출처로 바꾸기",
      "3. [자료에서 확인한 핵심 수치·사례·문장 입력]을 실제 내용으로 바꾸기",
      "4. [내가 해석한 의미 입력]을 자기 말로 쓰기",
      "5. 결론에 한계와 다음 탐구 방향을 1문장 이상 추가하기"
    ].join("\n");
  }

  function renderSecondaryDraftPanel(expansion, req){
    const paths = Array.isArray(expansion?.paths) ? expansion.paths : [];
    if(!paths.length) return "";
    const recommended = paths.find(p => p.isRecommended) || paths[0];
    const optionHtml = paths.map((path, idx) => {
      const checked = path.id === recommended.id ? "checked" : "";
      const evidence = Array.isArray(path.evidenceTypes) ? path.evidenceTypes.join(" · ") : "자료 직접 선택";
      const structure = Array.isArray(path.paragraphStructure) ? path.paragraphStructure.join(" → ") : "문단 구조 선택";
      return `
        <label class="mini-v43-expansion-option ${checked ? "is-selected" : ""}" data-mini-expansion-card="${escapeHtml(path.id || String(idx))}">
          <input type="radio" name="miniV229ExpansionPath" value="${escapeHtml(path.id || String(idx))}" ${checked}>
          <span class="mini-v43-expansion-title">${escapeHtml(path.label || "확장 방향")}${path.isRecommended ? " · 추천" : ""}</span>
          <span class="mini-v43-expansion-q">${escapeHtml(path.question || "탐구 질문 만들기")}</span>
          <span class="mini-v43-expansion-meta">필요 자료: ${escapeHtml(evidence)}</span>
          <span class="mini-v43-expansion-meta">보고서 구조: ${escapeHtml(structure)}</span>
        </label>
      `;
    }).join("");

    return `
      <article class="mini-v43-card core mini-v229-draft-panel" id="miniV229DraftPanel">
        <div class="mini-v43-card-head">
          <span class="mini-v43-icon">2</span>
          <h4>선택한 2차 확장 방향으로 보고서 초안 생성</h4>
        </div>
        <p class="mini-v229-help">위 2차 확장 방향 중 하나를 선택한 뒤, 학생이 직접 찾은 자료를 넣으면 mini가 아래에서 개인화된 보고서 초안을 다시 생성합니다. 자료를 아직 못 찾았으면 먼저 ‘자료 찾기 가이드’를 눌러 검색어와 자료 유형을 확인하세요.</p>
        <div class="mini-v43-expansion-options">${optionHtml}</div>

        <div class="mini-v230-helper-box">
          <div class="mini-v230-helper-title">자료를 못 찾겠다면 먼저 여기서 시작</div>
          <div class="mini-v230-helper-actions">
            <button type="button" id="miniV230ShowEvidenceGuideBtn">선택 방향에 맞는 자료 찾기 가이드</button>
            <button type="button" id="miniV230FillSourceHintsBtn">입력칸 힌트 채우기</button>
          </div>
          <div class="mini-v230-guide-output" id="miniV230EvidenceGuideOutput">확장 방향을 선택한 뒤 자료 찾기 가이드를 누르면, 검색어·자료 유형·입력 방법이 여기에 표시됩니다.</div>
        </div>

        <div class="mini-v229-input-grid">
          <label>자료 제목<input id="miniV229EvidenceTitle" type="text" placeholder="예: 실제 기사 제목, 공공 통계명, 실험 결과표명"></label>
          <label>출처<input id="miniV229EvidenceSource" type="text" placeholder="예: 교과서, 공공기관, 기사, 보고서, 실험 기록"></label>
          <label>자료 핵심 내용<textarea id="miniV229EvidencePoint" rows="3" placeholder="자료에서 확인한 수치·사례·문장. 모르면 자료 찾기 가이드를 먼저 누르세요."></textarea></label>
          <label>내 해석<textarea id="miniV229StudentView" rows="3" placeholder="이 자료를 보고 내가 판단한 점. 모르면 ‘어떤 점이 달라졌는지/비교되는지’를 한 문장으로 적으세요."></textarea></label>
        </div>
        <div class="mini-v229-actions">
          <button type="button" id="miniV229GenerateDraftBtn">mini로 보고서 초안 생성</button>
          <button type="button" id="miniV229CopyDraftBtn" disabled>초안 복사</button>
        </div>
        <div class="mini-v229-draft-output" id="miniV229DraftOutput">
          <b>초안 생성 대기</b><br>확장 방향을 선택하고 자료를 입력한 뒤 버튼을 누르세요. 자료가 부족하면 mini가 자료 후보와 검색어를 먼저 제시하도록 요청합니다.
        </div>
      </article>
    `;
  }

  function bindSecondaryDraftPanel(expansion, req){
    const panel = $("miniV229DraftPanel");
    if(!panel) return;
    const radios = Array.from(panel.querySelectorAll('input[name="miniV229ExpansionPath"]'));
    const output = $("miniV229DraftOutput");
    const generateBtn = $("miniV229GenerateDraftBtn");
    const copyBtn = $("miniV229CopyDraftBtn");
    const guideBtn = $("miniV230ShowEvidenceGuideBtn");
    const hintBtn = $("miniV230FillSourceHintsBtn");
    const guideOutput = $("miniV230EvidenceGuideOutput");

    function selectedPath(){
      const selectedId = (radios.find(r => r.checked) || radios[0] || {}).value;
      return getPathById(expansion, selectedId);
    }
    function syncCards(){
      radios.forEach(r => {
        const card = r.closest(".mini-v43-expansion-option");
        if(card) card.classList.toggle("is-selected", r.checked);
      });
    }
    radios.forEach(r => r.addEventListener("change", () => {
      syncCards();
      if(guideOutput) guideOutput.textContent = "확장 방향이 바뀌었습니다. 자료 찾기 가이드를 다시 눌러주세요.";
    }));
    syncCards();

    guideBtn?.addEventListener("click", () => {
      const path = selectedPath();
      const guide = buildEvidenceGuideText(path, req);
      global.__MINI_V230_EVIDENCE_GUIDE__ = guide;
      if(guideOutput) guideOutput.innerHTML = `<pre>${escapeHtml(guide)}</pre>`;
    });

    hintBtn?.addEventListener("click", () => {
      const path = selectedPath();
      const guide = buildEvidenceFindingGuide(path, req);
      const titleEl = $("miniV229EvidenceTitle");
      const sourceEl = $("miniV229EvidenceSource");
      const pointEl = $("miniV229EvidencePoint");
      const viewEl = $("miniV229StudentView");
      if(titleEl && !String(titleEl.value || "").trim()) titleEl.placeholder = `예: ${guide.sourceTypes[0] || "실제 자료 제목"}`;
      if(sourceEl && !String(sourceEl.value || "").trim()) sourceEl.placeholder = `예: ${guide.easySources[0] || "공공기관·기사·교과서"}`;
      if(pointEl && !String(pointEl.value || "").trim()) pointEl.placeholder = `예: ${guide.whatToCopy[0] || "자료에서 확인한 핵심 내용"}`;
      if(viewEl && !String(viewEl.value || "").trim()) viewEl.placeholder = "예: 이 자료를 보면 어떤 조건에서 차이가 생기는지 판단할 수 있다.";
      if(guideOutput){
        guideOutput.innerHTML = `<pre>${escapeHtml(buildEvidenceGuideText(path, req))}</pre>`;
      }
    });

    generateBtn?.addEventListener("click", async () => {
      const path = selectedPath();
      global.__MINI_SELECTED_EXPANSION_PATH__ = path;
      const extra = {
        evidenceTitle: $("miniV229EvidenceTitle")?.value || "",
        evidenceSource: $("miniV229EvidenceSource")?.value || "",
        evidencePoint: $("miniV229EvidencePoint")?.value || "",
        studentView: $("miniV229StudentView")?.value || ""
      };
      const miniDraftReq = buildSecondaryMiniDraftRequest(path, req, extra);
      global.__LAST_MINI_SECONDARY_DRAFT_REQUEST_V230__ = miniDraftReq;
      if(output){
        output.innerHTML = `<b>mini가 선택한 확장 방향과 학생 입력 자료를 읽고 초안을 생성 중입니다...</b><br><span class="mini-v230-muted">자료가 부족하면 실제 출처를 지어내지 않고 자료 후보·검색어·[학생 입력 필요] 표시가 포함됩니다.</span>`;
      }
      if(generateBtn) generateBtn.disabled = true;
      if(copyBtn) copyBtn.disabled = true;
      try{
        let draft = "";
        const data = await postGenerateJson(miniDraftReq);
        global.__LAST_MINI_SECONDARY_DRAFT_RESPONSE_V230__ = data;
        if(data?.localFallback){
          draft = buildSecondaryDraftText(path, req, extra)
            + "\n\n[안내] 원격 mini 생성 연결이 실패해 로컬 초안으로 대체했습니다. 실제 운영 주소에서는 mini가 이 요청을 다시 읽고 초안을 생성합니다.";
        }else{
          draft = normalizeGeneratedCandidate(data) || extractGeneratedText(data, miniDraftReq).text || "";
          if(!draft || looksLikeRawJsonText(draft)) draft = buildSecondaryDraftText(path, req, extra);
        }
        global.__MINI_GENERATED_SECONDARY_DRAFT__ = draft;
        if(output){
          output.innerHTML = `<pre>${escapeHtml(draft)}</pre>`;
          output.scrollIntoView({behavior:"smooth", block:"nearest"});
        }
        if(copyBtn) copyBtn.disabled = false;
      }catch(error){
        console.error("v230 secondary mini draft failed:", error);
        const fallbackDraft = buildSecondaryDraftText(path, req, extra)
          + `\n\n[안내] mini 초안 생성 중 오류가 발생해 로컬 초안으로 대체했습니다. 오류: ${error?.message || String(error)}`;
        global.__MINI_GENERATED_SECONDARY_DRAFT__ = fallbackDraft;
        if(output) output.innerHTML = `<pre>${escapeHtml(fallbackDraft)}</pre>`;
        if(copyBtn) copyBtn.disabled = false;
      }finally{
        if(generateBtn) generateBtn.disabled = false;
      }
    });

    copyBtn?.addEventListener("click", () => {
      const draft = global.__MINI_GENERATED_SECONDARY_DRAFT__ || "";
      if(draft) navigator.clipboard?.writeText(draft);
    });
  }

  function renderGeneratedReport(text, req, rawData, extraction){
    hideBuiltInResultShell();
    const root = ensureResultRoot();
    const sanitizedText = cleanReportText(text);
    const rawSections = Array.isArray(extraction?.sections) && extraction.sections.length
      ? extraction.sections.map(sec => ({ title: sec.title, body: cleanReportText(sec.body) }))
      : splitSections(sanitizedText);
    const sections = dedupeSections(rawSections);
    const s = req.mini_payload?.selectionPayload || {};
    const book = req.selectedBook || {};
    const titleSection = sections.find(sec => /^(보고서|설계서)\s*제목$/.test(normalizeSectionTitle(sec.title)));
    const reportTitle = firstNonEmpty(
      titleSection?.body?.split(/\n/)[0],
      extraction?.title,
      `${s.selectedKeyword || req.keyword || "선택 키워드"} 기반 탐구 설계`
    );

    const diag = extraction?.diagnostics || {};
    const focusQuestion = diag.focusQuestion || "";
    const majorKeywordTag = Array.isArray(diag.majorKeywords) && diag.majorKeywords.length ? diag.majorKeywords.slice(0,4).join(" · ") : "";
    const majorLensTag = diag.majorLens || "";
    const expansionForDraft = getSecondaryExpansionContext(req, {
      subject: s.subject || req.subject,
      major: s.department || s.major || req.major,
      concept: s.selectedConcept || req.selectedConcept,
      keyword: s.selectedKeyword || req.keyword,
      axis: s.selectedFollowupAxis || req.selectedFollowupAxis,
      mode: req.reportMode,
      view: req.reportView,
      line: req.reportLine,
      bookTitle: book.title || ""
    });

    const displaySections = sections
      .filter(sec => !/^(보고서|설계서)\s*제목$/.test(normalizeSectionTitle(sec.title)))
      .map(sec => {
        const title = normalizeSectionTitle(sec.title);
        return { title, body: sec.body };
      });

    const sectionHtml = displaySections.length
      ? displaySections.map((sec, i) => renderMiniV43Section(sec, i + 1)).join("")
      : `<article class="mini-v43-card core"><div class="mini-v43-card-head"><span class="mini-v43-icon">★</span><h4>탐구 설계</h4></div><ul class="mini-v43-list">${renderLineList(text)}</ul></article>`;

    root.style.display = "block";
    root.innerHTML = `
      <style>
        .mini-v43-result{border:1px solid #b8cdfd;border-radius:22px;background:linear-gradient(180deg,#ffffff 0%,#f7faff 100%);padding:24px;margin-top:18px;box-shadow:0 14px 32px rgba(50,87,180,.10)}
        .mini-v43-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;margin-bottom:18px}
        .mini-v43-kicker{display:inline-flex;align-items:center;border-radius:999px;background:#eaf1ff;color:#2454d8;font-weight:900;font-size:12px;padding:6px 11px;margin-bottom:10px}
        .mini-v43-title{font-size:27px;line-height:1.28;margin:0 0 8px;color:#0f172a;letter-spacing:-.02em}
        .mini-v43-sub{font-size:14px;color:#475569;margin:0;line-height:1.6}
        .mini-v43-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
        .mini-v43-actions button{border:1px solid #2f5bff;background:#2f5bff;color:#fff;border-radius:999px;padding:9px 14px;font-weight:900;cursor:pointer}
        .mini-v43-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0 18px}
        .mini-v43-quick div{border:1px solid #d8e3ff;background:#fff;border-radius:16px;padding:13px 14px;min-height:66px}
        .mini-v43-quick b{display:block;color:#2454d8;font-size:13px;margin-bottom:5px}
        .mini-v43-quick span{display:block;color:#1f2937;font-size:14px;font-weight:800;line-height:1.35}
        .mini-v43-tags{display:flex;flex-wrap:wrap;gap:7px;margin:4px 0 18px}
        .mini-v43-tags span{font-size:12px;border:1px solid #d5e0ff;background:#fff;border-radius:999px;padding:5px 9px;color:#2446a5}
        .mini-v43-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .mini-v43-card{border:1px solid #dbe5ff;background:#fff;border-radius:18px;padding:16px;box-shadow:0 6px 16px rgba(50,87,180,.045)}
        .mini-v43-card.core{grid-column:1/-1;background:#f4f8ff;border-color:#bcd0ff}
        .mini-v43-card.check{grid-column:1/-1}
        .mini-v43-card-head{display:flex;align-items:center;gap:8px;margin-bottom:9px}
        .mini-v43-icon{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#2f5bff;color:#fff;font-size:12px;font-weight:900;flex:0 0 auto}
        .mini-v43-card h4{font-size:16px;margin:0;color:#111827;letter-spacing:-.01em}
        .mini-v43-list{list-style:none;padding:0;margin:0;display:grid;gap:7px}
        .mini-v43-list li{font-size:14px;line-height:1.65;color:#243244;background:#f8fbff;border-radius:10px;padding:7px 9px}
        .mini-v43-list li strong{color:#173ea9}
        .mini-v43-check{font-weight:700}
        .mini-v43-table-wrap{overflow-x:auto}
        .mini-v43-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
        .mini-v43-table th{background:#eef4ff;color:#173ea9;text-align:left;padding:9px;border-top:1px solid #dbe5ff;border-bottom:1px solid #dbe5ff}
        .mini-v43-table td{padding:9px;border-bottom:1px solid #e5edff;color:#243244;vertical-align:top}
        .mini-v43-table th:first-child,.mini-v43-table td:first-child{border-left:1px solid #dbe5ff}
        .mini-v43-table th:last-child,.mini-v43-table td:last-child{border-right:1px solid #dbe5ff}
        .mini-v229-draft-panel{margin-top:4px}
        .mini-v229-help{font-size:14px;line-height:1.65;color:#475569;margin:0 0 12px}

        .mini-v230-helper-box{border:1px dashed #adc3ff;background:#f8fbff;border-radius:16px;padding:12px;margin:12px 0}
        .mini-v230-helper-title{font-size:13px;font-weight:900;color:#173ea9;margin-bottom:8px}
        .mini-v230-helper-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
        .mini-v230-helper-actions button{border:1px solid #8aa8ff;background:#fff;color:#2454d8;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;cursor:pointer}
        .mini-v230-guide-output{border:1px solid #e1e9ff;background:#fff;border-radius:12px;padding:10px;font-size:12px;line-height:1.6;color:#334155;max-height:260px;overflow:auto}
        .mini-v230-guide-output pre{white-space:pre-wrap;margin:0;font-family:inherit}
        .mini-v230-muted{font-size:12px;color:#64748b}
        .mini-v43-expansion-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:12px}
        .mini-v43-expansion-option{display:flex;flex-direction:column;gap:5px;border:1px solid #dbe5ff;background:#fff;border-radius:14px;padding:10px;cursor:pointer;min-height:138px}
        .mini-v43-expansion-option input{margin:0 0 2px}
        .mini-v43-expansion-option.is-selected{border-color:#2f5bff;background:#eef4ff;box-shadow:0 5px 14px rgba(47,91,255,.12)}
        .mini-v43-expansion-title{font-weight:900;color:#173ea9;font-size:13px}
        .mini-v43-expansion-q{font-weight:800;color:#1f2937;font-size:13px;line-height:1.45}
        .mini-v43-expansion-meta{font-size:12px;line-height:1.45;color:#64748b}
        .mini-v229-input-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
        .mini-v229-input-grid label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:900;color:#173ea9}
        .mini-v229-input-grid input,.mini-v229-input-grid textarea{border:1px solid #dbe5ff;border-radius:12px;padding:10px;font-size:13px;line-height:1.5;background:#fff;color:#111827;resize:vertical}
        .mini-v229-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
        .mini-v229-actions button{border:1px solid #2f5bff;background:#2f5bff;color:#fff;border-radius:999px;padding:10px 14px;font-weight:900;cursor:pointer}
        .mini-v229-actions button[disabled]{opacity:.45;cursor:not-allowed}
        .mini-v229-actions button#miniV229CopyDraftBtn{background:#fff;color:#2f5bff}
        .mini-v229-draft-output{border:1px solid #dbe5ff;background:#f8fbff;border-radius:14px;padding:12px;color:#243244;font-size:13px;line-height:1.65;max-height:460px;overflow:auto}
        .mini-v229-draft-output pre{white-space:pre-wrap;margin:0;font-family:inherit;line-height:1.7}
        @media (max-width: 1100px){.mini-v43-expansion-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media (max-width: 820px){
          .mini-v43-head{grid-template-columns:1fr}
          .mini-v43-actions{justify-content:flex-start}
          .mini-v43-quick,.mini-v43-grid,.mini-v43-expansion-options,.mini-v229-input-grid{grid-template-columns:1fr}
          .mini-v43-title{font-size:23px}
        }
      </style>

      <section class="mini-v43-result">
        <div class="mini-v43-head">
          <div>
            <div class="mini-v43-kicker">학생용 탐구 조립 지도</div>
            <h2 class="mini-v43-title">${escapeHtml(reportTitle)}</h2>
            <p class="mini-v43-sub">동국대식 수행평가 영역명처럼 주제(내용)와 방법, 과정 증거가 보이도록 정리했습니다. 1차 설계값을 바로 보고서로 쓰지 않고, 2차 확장 방향을 선택한 뒤 ChatGPT에 다시 활용할 수 있게 구성했습니다.</p>
          </div>
          <div class="mini-v43-actions">
            <button type="button" id="miniV32CopyReportBtn">설계서 복사</button>
          </div>
        </div>

        <div class="mini-v43-quick">
          <div><b>STEP 1</b><span>1차 설계값 확인하기</span></div>
          <div><b>STEP 2</b><span>2차 확장 방향 선택하기</span></div>
          <div><b>STEP 3</b><span>선택 방향으로 초안 구조화하기</span></div>
        </div>

        <div class="mini-v43-tags">
          <span>${escapeHtml(s.subject || req.subject)}</span>
          ${majorLensTag ? `<span>전공 개념: ${escapeHtml(majorLensTag)}</span>` : ""}
          ${majorKeywordTag ? `<span>핵심 키워드: ${escapeHtml(majorKeywordTag)}</span>` : ""}
          <span>${escapeHtml(s.selectedConcept || req.selectedConcept)}</span>
          <span>${escapeHtml(s.selectedKeyword || req.keyword)}</span>
          <span>${escapeHtml(compactAxis(s.selectedFollowupAxis || req.selectedFollowupAxis))}</span>
          ${diag.donggukPerformanceFrame?.performanceName ? `<span>수행평가 영역명: ${escapeHtml(diag.donggukPerformanceFrame.performanceName)}</span>` : ""}
          ${book.title ? `<span>도서: ${escapeHtml(book.title)}</span>` : ""}
        </div>

        <div class="mini-v43-grid">
          ${sectionHtml}
          ${renderSecondaryDraftPanel(expansionForDraft, req)}
        </div>
      </section>
    `;

    $("miniV32CopyReportBtn")?.addEventListener("click", () => navigator.clipboard?.writeText(sanitizedText));
    bindSecondaryDraftPanel(expansionForDraft, req);

    const builtInStudentReport = $("studentReport");
    if(builtInStudentReport) builtInStudentReport.innerHTML = "";
    hideBuiltInResultShell();
    setTimeout(hideBuiltInResultShell, 0);
    setTimeout(hideBuiltInResultShell, 80);

    const finalTopic = $("finalTopic");
    if(finalTopic) finalTopic.textContent = reportTitle;
    const topicSub = $("topicSub");
    if(topicSub) topicSub.textContent = "질문·자료·표·문단·결론의 흐름으로 정리한 탐구 조립 지도입니다.";
    const finalMode = $("finalMode");
    if(finalMode) finalMode.style.display = "none";
    const actionSteps = $("actionSteps");
    if(actionSteps) actionSteps.innerHTML = "";
  }

  async function handleGenerateV32(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    clearError();
    setLoading(true);

    try{
      const req = buildWorkerRequest();
      const missing = validateRequest(req);
      if(missing.length){
        showError("아직 선택되지 않은 항목이 있습니다.", missing.join(" / "));
        return false;
      }

      global.__LAST_MINI_WORKER_REQUEST_V32__ = req;

      // 기존 로그 수집은 유지하되, 실패해도 생성 자체는 막지 않는다.
      try{
        await postJson(COLLECT_ENDPOINT, buildCollectRequest(req));
      }catch(e){
        console.warn("v32 collect failed, continue generate:", e);
      }

      const data = await postGenerateJson(req);
      global.__LAST_MINI_WORKER_RESPONSE_V32__ = data;
      const extraction = extractGeneratedText(data, req);
      global.__LAST_MINI_WORKER_EXTRACTION_V34__ = extraction;
      renderGeneratedReport(extraction.text, req, data, extraction);
      return true;
    }catch(e){
      console.error("v32 generate failed:", e);
      showError("탐구 실행 지도 생성 중 오류가 발생했습니다.", e.message || String(e));
      return false;
    }finally{
      setLoading(false);
    }
  }

  function bindGenerateButton(){
    let btn = $("generateBtn");
    if(!btn) return;

    // v34~v56 또는 기존 keyword_engine.js가 먼저 click listener를 잡은 경우가 있어
    // 버튼 노드를 한 번 교체한 뒤 v58 핸들러만 다시 연결한다.
    if(btn.dataset.miniWorkerV219Bound === "1") return;
    const cleanBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(cleanBtn, btn);
    btn = cleanBtn;
    btn.dataset.miniWorkerV219Bound = "1";
    btn.dataset.miniWorkerV58Bound = "1";
    btn.dataset.miniWorkerV57Bound = "1";
    btn.dataset.miniWorkerV56Bound = "1";
    btn.dataset.miniWorkerV55Bound = "1";
    btn.dataset.miniWorkerV54Bound = "1";
    btn.dataset.miniWorkerV53Bound = "1";
    btn.dataset.miniWorkerV32Bound = "v220";
    btn.addEventListener("click", handleGenerateV32, true);
  }

  global.__BUILD_MINI_WORKER_REQUEST_V32__ = buildWorkerRequest;
  global.__BUILD_MINI_WORKER_REQUEST_V34__ = buildWorkerRequest;
  global.__RUN_MINI_WORKER_GENERATE_V32__ = handleGenerateV32;
  global.__RUN_MINI_WORKER_GENERATE_V34__ = handleGenerateV32;
  global.__DIAGNOSE_MINI_WORKER_V32__ = function(){
    const req = buildWorkerRequest();
    return {
      version: VERSION,
      workerBaseUrl: WORKER_BASE_URL,
      generateEndpoint: GENERATE_ENDPOINT,
      collectEndpoint: COLLECT_ENDPOINT,
      missing: validateRequest(req),
      request: req
    };
  };


  global.__DIAGNOSE_MINI_WORKER_V34__ = function(){
    const req = buildWorkerRequest();
    const last = global.__LAST_MINI_WORKER_RESPONSE_V32__ || null;
    const extraction = last ? extractGeneratedText(last, req) : null;
    return {
      version: VERSION,
      workerBaseUrl: WORKER_BASE_URL,
      generateEndpoint: GENERATE_ENDPOINT,
      collectEndpoint: COLLECT_ENDPOINT,
      missing: validateRequest(req),
      request: req,
      lastResponseKeys: last && typeof last === "object" ? Object.keys(last) : [],
      extractionSource: extraction?.source || null,
      usedFallback: extraction?.fallback || false
    };
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bindGenerateButton);
  }else{
    bindGenerateButton();
  }
})(typeof window !== "undefined" ? window : globalThis);
