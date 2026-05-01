/* mini_worker_generate_bridge_v32.js
 * 기존 Cloudflare Worker(/collect, /generate)를 유지하면서
 * __BUILD_MINI_REPORT_PAYLOAD__ 전체 데이터를 /generate로 보내고,
 * Worker/MINI 응답을 화면에 실제 결과로 출력하는 브리지.
 */
(function(global){
  "use strict";

  const VERSION = "mini-worker-generate-bridge-v51-structured-book-and-writing-guide";
  const WORKER_BASE_URL = global.__KEYWORD_ENGINE_WORKER_BASE_URL || "https://curly-base-a1a9.koreapoorboy.workers.dev";
  const GENERATE_ENDPOINT = `${WORKER_BASE_URL}/generate`;
  const COLLECT_ENDPOINT = `${WORKER_BASE_URL}/collect`;

  global.__MINI_WORKER_GENERATE_BRIDGE_VERSION__ = VERSION;
  global.__MINI_WORKER_GENERATE_ENDPOINT__ = GENERATE_ENDPOINT;
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
      subject: readValue("subject"),
      taskName: readValue("taskName"),
      taskType: readValue("taskType"),
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
      if(el && String(el.textContent || "").trim()) return String(el.textContent || "").trim();
      if(el && String(el.value || "").trim()) return String(el.value || "").trim();
    }
    return "";
  }

  function hydrateMiniPayload(mini, form){
    const payload = JSON.parse(JSON.stringify(mini || {}));
    payload.selectionPayload = payload.selectionPayload || {};
    payload.reportGenerationContext = payload.reportGenerationContext || {};

    const s = payload.selectionPayload;
    s.subject = s.subject || form.subject || readValue("subject");
    s.department = s.department || form.career || readValue("career");
    s.selectedConcept = s.selectedConcept || getActiveText([
      ".concept-card.active .concept-title",
      ".concept-card.is-active .concept-title",
      ".concept-card.selected .concept-title",
      "[data-concept].active",
      "[data-concept].is-active",
      "[data-selected-concept]",
      "#selectedConcept",
      "input[name='selectedConcept']"
    ]);
    s.selectedRecommendedKeyword = s.selectedRecommendedKeyword || s.selectedKeyword || form.keyword || getActiveText([
      ".keyword-chip.active",
      ".keyword-chip.is-active",
      ".keyword-chip.selected",
      ".keyword-btn.active",
      ".keyword-btn.is-active",
      ".keyword-btn.selected",
      "[data-keyword].active",
      "[data-keyword].is-active",
      "#selectedKeyword",
      "input[name='selectedKeyword']"
    ]);
    s.selectedKeyword = s.selectedKeyword || s.selectedRecommendedKeyword;
    s.followupAxis = s.followupAxis || s.selectedFollowupAxis || getActiveText([
      ".followup-axis-card.active .axis-title",
      ".followup-axis-card.is-active .axis-title",
      ".followup-axis-card.selected .axis-title",
      ".axis-card.active .axis-title",
      ".axis-card.is-active .axis-title",
      ".axis-card.selected .axis-title",
      "[data-axis].active",
      "[data-axis].is-active",
      "#selectedFollowupAxis",
      "input[name='selectedFollowupAxis']"
    ]);
    s.selectedFollowupAxis = s.selectedFollowupAxis || s.followupAxis;
    s.axisLabel = s.axisLabel || compactAxis(s.selectedFollowupAxis || s.followupAxis);
    s.reportIntent = s.reportIntent || "학생용 수행평가 탐구보고서 생성";

    payload.reportGenerationContext.selectedBookContext =
      payload.reportGenerationContext.selectedBookContext ||
      payload.selectedBook?.selectedBookContext ||
      null;

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
        "선택 도서는 독후감이 아니라 근거 프레임, 비교 관점, 한계 논의, 결론 확장에 배치한다.",
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
      "3. 선택한 교과 개념, 추천 키워드, 후속 연계축, 선택 도서를 모두 설계서 안에서 역할이 보이게 반영한다.",
      "4. 학과명 자체를 제목이나 결론에 억지로 붙이지 말고, 학과에서 배우는 핵심 개념·이론·사고 과정을 탐구 기준으로 변환해 사용한다.",
      "5. 예: 컴퓨터공학과라면 '컴퓨터공학과에 관심이 있다'가 아니라 입력값, 조건문, 알고리즘, 데이터 처리, 시스템 설계, 오류 검증 같은 개념으로 연결한다.",
      "6. 도서는 독후감이 아니라 왜 이 자료를 여러 조건으로 보아야 하는지 설명하는 해석 렌즈로 안내한다.",
      "5. 내부 데이터명, payload, API, Worker, MINI 같은 표현은 학생 화면에 쓰지 않는다.",
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
      `선택 도서: ${book.title || ""}${book.author ? " / " + book.author : ""}`,
      "",
      "[학생이 선택한 설계 방향]",
      `전개 방식: ${choices.mode || ctx.reportMode || "선택값 기준"}`,
      `관점: ${choices.view || ctx.reportView || "선택값 기준"}`,
      `라인: ${choices.line || ctx.reportLine || "선택값 기준"}`,
      "",
      "[출력 형식]",
      "다음 구조로 작성하라. 단, 화면에는 학생이 바로 볼 수 있는 실행 지도 형태로 정리한다.",
      "1. 설계서 제목",
      "2. 오늘의 핵심 방향",
      "3. 1단계. 중심 질문 고르기",
      "4. 2단계. 자료 3개 찾기",
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
    const miniInstruction = buildMiniInstruction(form, mini, pattern);

    const s = mini.selectionPayload || {};
    const choice = getReportChoices(mini);

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
      selectedBookTitle: mini.selectedBook?.title || "",

      // 새 MINI 생성용 확장 필드
      mode: "mini_report_generation_v32",
      generationMode: "real_mini_report",
      prompt: miniInstruction,
      miniInstruction,
      mini_payload: mini,
      report_dataset_pattern: pattern,
      report_choices: choice,
      reportGenerationContext: mini.reportGenerationContext || {},
      selectedBook: mini.selectedBook || null,

      // Worker가 messages 형태를 받는 경우 대비
      messages: [
        { role: "system", content: "너는 고등학생이 바로 이해할 수 있는 쉬운 수행평가 탐구 설계서를 만드는 전문 도우미다. 완성문을 대신 쓰지 말고, 학생이 직접 고르고 채우는 로드맵을 제공한다." },
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
      ["selectedFollowupAxis", "4번 후속 연계축"],
      ["selectedBookTitle", "5번 선택 도서"]
    ];
    checks.forEach(([key, label]) => {
      if(!String(req[key] || "").trim()) missing.push(label);
    });

    const choices = req.report_choices || {};
    if(!String(choices.mode || "").trim()) missing.push("6번 보고서 전개 방식");
    if(!String(choices.view || "").trim()) missing.push("7번 보고서 관점");
    if(!String(choices.line || "").trim()) missing.push("8번 보고서 라인");

    return missing;
  }

  async function postJson(url, payload){
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data = null;
    try{ data = JSON.parse(text); }
    catch(e){ data = { ok: response.ok, text }; }
    if(!response.ok || data?.ok === false){
      const msg = data?.error || data?.message || data?.text || `요청 실패 (${response.status})`;
      throw new Error(msg);
    }
    return data;
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
    }
    return guide;
  }

  function buildStudentReportFromPayload(req, rawData){
    const s = req?.mini_payload?.selectionPayload || {};
    const resolved = getWorkerResolved(rawData);
    const book = req.selectedBook || req?.mini_payload?.selectedBook || {};
    const choices = req.report_choices || getReportChoices(req.mini_payload || {});
    const majorContext = getMajorContext(req);

    const subject = firstNonEmpty(s.subject, req.subject, resolved.subject, "선택 과목");
    const major = firstNonEmpty(majorContext?.display_name, s.department, req.career, resolved.major, resolved.track, "선택 진로 분야");
    const concept = firstNonEmpty(s.selectedConcept, req.selectedConcept, "선택 교과 개념");
    const keyword = firstNonEmpty(s.selectedKeyword, s.selectedRecommendedKeyword, req.selectedKeyword, req.keyword, resolved.keyword, "선택 키워드");
    const axisRaw = cleanDisplayText(firstNonEmpty(s.selectedFollowupAxis, s.followupAxis, req.selectedFollowupAxis, "선택 후속 연계축"));
    const axis = cleanDisplayText(compactAxis(axisRaw));
    const mode = firstNonEmpty(choices.mode, choices.modeLabel, s.reportMode, "전개 방식 선택값");
    const view = firstNonEmpty(choices.view, choices.viewLabel, s.reportView, "관점 선택값");
    const line = firstNonEmpty(choices.line, choices.lineLabel, s.reportLine, "라인 선택값");
    const bookTitle = firstNonEmpty(book.title, req.selectedBookTitle, "선택 도서");

    const allText = `${keyword} ${axisRaw} ${concept} ${major}`;
    const lens = deriveMajorLens(major, majorContext, allText);
    const bookGuide = deriveBookGuide(bookTitle, keyword, concept, axis, lens);
    const isWeather = /폭염|기후|재난|주의보|대기|환경|날씨|기상/.test(allText);
    const isComputer = /컴퓨터|소프트웨어|인공지능|AI|데이터사이언스|정보보호|프로그래밍|알고리즘|시스템|네트워크/i.test(`${major} ${lens.keywords.join(" ")}`);
    const isBio = /세포|생명|유전자|효소|대사|약물|면역|질병|의학|보건|간호/.test(allText + " " + major);
    const isEnergy = /물리|에너지|역학|전자기|파동|열|전기|배터리|전지/.test(allText + " " + major);

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
    let conceptUse = `${concept}에서 배운 핵심 말을 먼저 쉬운 말로 바꾸고, 내가 찾은 자료를 어떤 기준으로 해석할지 연결한다.`;
    let conceptExample = `${concept} 개념을 통해 자료를 단순한 정보가 아니라 판단 근거로 해석할 수 있다.`;

    if(isWeather && isComputer){
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

    const assemblyRows = [
      ["보고서 요소", "학생이 채울 내용", "보고서 위치"],
      ["내 질문", "지역·기간·대상·비교 기준을 넣어 바꾼 질문", "서론 마지막"],
      ["판단 기준", isComputer ? "입력값·조건문·오류 가능성" : "비교 기준·근거·한계", "본론 도입"],
      ["자료 3개", "공식 기준 + 실제 자료 + 비교/사례 자료", "본론 1~2"],
      ["비교 표", "자료 차이와 내가 해석한 이유", "본론 핵심"],
      ["결론", "내 기준의 장점·한계·보완 자료", "결론"]
    ];

    const questionRows = [
      ["질문 원형", "그대로 쓰지 말고 이렇게 바꾸기"],
      [q[0], "지역·기간·대상 중 하나를 넣는다"],
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
      ["2. 자료 해석 기준", "자료를 어떤 기준으로 읽을지 설명하기", isWeather ? "기온은 단순 숫자지만 실제 판단에서는 습도·체감온도·지속 시간까지 함께 봐야 한다는 점을 먼저 밝힌다." : conceptUse],
      ["3. 자료 분석", "표와 근거로 비교하기", "공식 기준·실제 자료·비교 자료를 표로 정리하고, 어떤 차이가 보였는지 한 줄 해석을 붙인다."],
      ["4. 전공 개념 활용", "내가 어떤 방식으로 판단했는지 보여주기", isComputer ? "입력값 → 조건문 → 판단 결과 → 오류 검증 순서로, 내가 어떤 기준으로 판단했는지 설명한다." : lens.process],
      ["5. 결론", "내 기준의 장단점 정리하기", "내가 세운 기준의 장점·한계·보완 자료·다음에 더 조사할 방향을 함께 쓴다."]
    ];

    const sections = [
      {title:"보고서 완성 그림", body:assemblyRows.map(r=>r.join(" | ")).join("\n")},
      {title:"1단계. 질문을 내 사례로 바꾸기", body:questionRows.map(r=>r.join(" | ")).join("\n")},
      {title:"2단계. 자료를 어디에 넣을지 정하기", body:dataPlanRows.map(r=>r.join(" | ")).join("\n")},
      {title:"3단계. 비교 표로 증명하기", body:tableRows.map(r=>r.join(" | ")).join("\n")},
      {title:"4단계. 문단별로 조립하기", body:paragraphRows.map(r=>r.join(" | ")).join("\n")},
      {title:"보고서 문장 구조", body:[
        "문단 1. 문제 제기 | 시작 문장: 내가 바꾼 질문을 먼저 쓰고, 왜 이 질문이 궁금해졌는지 밝힌다.",
        "문단 1. 문제 제기 | 꼭 넣을 내용: 한 가지 기준만으로는 부족하다고 느낀 이유를 짧게 쓴다.",
        `문단 2. 자료 해석 기준 | 시작 문장: ${isWeather ? "기온은 숫자 자료이지만 실제 판단에서는 다른 조건도 함께 봐야 한다." : "자료는 단순 정보가 아니라 어떤 기준으로 읽느냐에 따라 의미가 달라진다."}`,
        `문단 2. 자료 해석 기준 | 활용 예시: ${conceptExample}`,
        "문단 3. 자료 분석 | 쓰는 방법: [자료 1]·[자료 2]·[자료 3]을 표로 정리하고, 각 행마다 내가 본 차이를 한 줄씩 적는다.",
        "문단 3. 자료 분석 | 해석 포인트: 표에 보이는 차이를 근거로 ‘어떤 조건에서 판단이 달라지는지’를 설명한다.",
        isComputer ? "문단 4. 전공 개념 활용 | 쓰는 방법: 자료를 입력값으로 보고, 어떤 조건을 넣었을 때 판단 결과가 달라지는지 순서대로 설명한다." : `문단 4. 전공 개념 활용 | 쓰는 방법: ${lens.shortLabel} 관점으로 자료를 나누고 비교한 방식을 설명한다.`,
        "문단 5. 결론 | 꼭 넣을 내용: 내가 세운 기준의 장점, 부족한 점, 더 보면 좋은 자료를 함께 쓴다.",
        "문단 5. 결론 | 마무리 문장: 이번 탐구를 통해 어떤 기준이 더 설득력 있었는지와 다음 탐구 방향을 짧게 적는다."
      ].join("
")},
      {title:"도서·전공 개념 연결", body:[
        `1) 이 카드의 기준: 책 내용을 많이 쓰는 것이 아니라, 내 판단 기준을 왜 넓혀야 하는지 설명하는 데만 사용한다.`,
        `2) 책에서 가져올 핵심 한 줄: ${bookGuide.content}`,
        `3) 내 탐구에 적용하는 구조: ${bookGuide.topicLink}`,
        `4) 보고서에 넣는 위치: ${bookGuide.position}`,
        `5) 이렇게 활용하면 된다: ${bookGuide.sentence}`,
        `6) 전공 개념 활용: ${majorConnect}`,
        `7) 주의할 점: ${bookGuide.caution}`
      ].join("
")},
      {title:"제출 전 5분 점검", body:[
        "□ 질문 원형을 그대로 쓰지 않고 내 사례로 바꿨는가?",
        "□ 지역·기간·대상·비교 기준 중 하나 이상이 들어갔는가?",
        "□ 자료가 어느 문단에 들어갈지 정했는가?",
        "□ 표에 실제 자료와 내 해석이 함께 들어갔는가?",
        "□ 교과 개념을 자료 해석에 사용했는가?",
        "□ 학과 이름만 붙이지 않고 전공 개념을 사용했는가?",
        "□ 도서를 요약하지 않고 내 판단 기준을 넓히는 근거로 사용했는가?",
        "□ 결론에 한계와 다음 탐구 방향을 적었는가?"
      ].join("\n")}
    ];

    const text = [`설계서 제목\n${title}`, ...sections.map((sec, idx) => `${idx + 1}. ${sec.title}\n${sec.body}`)].join("\n\n");
    return {
      text,
      sections: [{title:"설계서 제목", body:title}, ...sections],
      title,
      source: "payload-major-concept-book-bridge-blueprint",
      note: "학생이 보고서의 구조를 따라가며 질문-자료-표-문단-도서 활용까지 채울 수 있도록 정리했습니다.",
      diagnostics: {
        mode,
        view,
        line,
        productMode: "major_concept_book_bridge_blueprint",
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
        @media (max-width: 820px){
          .mini-v43-head{grid-template-columns:1fr}
          .mini-v43-actions{justify-content:flex-start}
          .mini-v43-quick,.mini-v43-grid{grid-template-columns:1fr}
          .mini-v43-title{font-size:23px}
        }
      </style>

      <section class="mini-v43-result">
        <div class="mini-v43-head">
          <div>
            <div class="mini-v43-kicker">학생용 탐구 조립 지도</div>
            <h2 class="mini-v43-title">${escapeHtml(reportTitle)}</h2>
            <p class="mini-v43-sub">보고서가 어떻게 만들어지는지 한눈에 보이도록 정리했습니다. 질문을 내 사례로 바꾸고, 자료를 어느 문단에 넣을지 정한 뒤, 표와 결론으로 완성합니다.</p>
          </div>
          <div class="mini-v43-actions">
            <button type="button" id="miniV32CopyReportBtn">설계서 복사</button>
          </div>
        </div>

        <div class="mini-v43-quick">
          <div><b>STEP 1</b><span>질문을 내 사례로 바꾸기</span></div>
          <div><b>STEP 2</b><span>자료를 문단에 배치하기</span></div>
          <div><b>STEP 3</b><span>표와 결론으로 완성하기</span></div>
        </div>

        <div class="mini-v43-tags">
          <span>${escapeHtml(s.subject || req.subject)}</span>
          ${majorLensTag ? `<span>전공 개념: ${escapeHtml(majorLensTag)}</span>` : ""}
          ${majorKeywordTag ? `<span>핵심 키워드: ${escapeHtml(majorKeywordTag)}</span>` : ""}
          <span>${escapeHtml(s.selectedConcept || req.selectedConcept)}</span>
          <span>${escapeHtml(s.selectedKeyword || req.keyword)}</span>
          <span>${escapeHtml(compactAxis(s.selectedFollowupAxis || req.selectedFollowupAxis))}</span>
          ${book.title ? `<span>도서: ${escapeHtml(book.title)}</span>` : ""}
        </div>

        <div class="mini-v43-grid">
          ${sectionHtml}
        </div>
      </section>
    `;

    $("miniV32CopyReportBtn")?.addEventListener("click", () => navigator.clipboard?.writeText(sanitizedText));

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

      const data = await postJson(GENERATE_ENDPOINT, req);
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

    // v34~v36 또는 기존 keyword_engine.js가 먼저 click listener를 잡은 경우가 있어
    // 버튼 노드를 한 번 교체한 뒤 v46 핸들러만 다시 연결한다.
    if(btn.dataset.miniWorkerV49Bound === "1") return;
    const cleanBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(cleanBtn, btn);
    btn = cleanBtn;
    btn.dataset.miniWorkerV49Bound = "1";
    btn.dataset.miniWorkerV32Bound = "v49";
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
