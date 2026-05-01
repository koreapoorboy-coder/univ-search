/* mini_worker_generate_bridge_v32.js
 * 기존 Cloudflare Worker(/collect, /generate)를 유지하면서
 * __BUILD_MINI_REPORT_PAYLOAD__ 전체 데이터를 /generate로 보내고,
 * Worker/MINI 응답을 화면에 실제 결과로 출력하는 브리지.
 */
(function(global){
  "use strict";

  const VERSION = "mini-worker-generate-bridge-v41-major-keyword-lens-blueprint";
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
      btn.textContent = isLoading ? "설계서 생성 중..." : "학생용 설계서 생성";
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
      usagePurpose: readValue("usagePurpose") || "학생 실행형 탐구 설계서 작성",
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
        "고등학생 수준을 넘는 전문 알고리즘·대학 수식은 개념 설명 중심으로 낮춘다."
      ]
    };
  }

  function buildMiniInstruction(form, mini, pattern){
    const s = mini.selectionPayload || {};
    const book = mini.selectedBook || {};
    const ctx = mini.reportGenerationContext || {};
    const choices = getReportChoices(mini);

    return [
      "너는 고등학생 수행평가 탐구 설계서를 만드는 도우미다.",
      "아래 선택값을 바탕으로 완성 보고서를 대신 쓰지 말고, 학생이 직접 자료를 조사하고 자기 말로 보고서를 완성할 수 있는 실행형 로드맵을 작성하라.",
      "",
      "[절대 조건]",
      "1. 완성 문단을 길게 대신 써주지 않는다. 학생이 직접 채울 수 있는 질문, 자료 수집 계획, 비교 기준, 빈칸형 문장 틀을 제공한다.",
      "2. 같은 주제를 선택한 학생도 결과가 달라질 수 있도록 탐구 질문·조사 범위·비교 기준·결론 방향의 선택지를 반드시 제시한다.",
      "3. 선택한 교과 개념, 추천 키워드, 후속 연계축, 선택 도서를 모두 설계서 안에서 역할이 보이게 반영한다.",
      "4. 학과명 자체를 제목이나 결론에 억지로 붙이지 말고, 학과에서 배우는 핵심 키워드·개념을 탐구 기준으로 변환해 사용한다.",
      "5. 예: 컴퓨터공학과라면 '컴퓨터공학과 관점'이 아니라 시스템, 알고리즘, 데이터 처리, 조건 분기, 모델링, 검증 같은 개념으로 연결한다.",
      "6. 도서는 독후감이 아니라 탐구 관점, 비교 기준, 한계 논의, 결론 확장에 쓰는 방식으로 안내한다.",
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
      "다음 구조로 작성하라.",
      "1. 설계서 제목",
      "2. 선택 기반 탐구 경로 요약",
      "3. 학과 키워드 → 탐구 기준 변환",
      "4. 최종 추천 탐구 방향",
      "5. 학생이 선택할 탐구 질문 3개",
      "6. 개인화 분기 선택지",
      "7. 실제 조사 자료와 출처 계획",
      "8. 자료 정리 표 양식",
      "9. 보고서 목차 설계",
      "10. 문단별 작성 가이드",
      "11. 학생이 직접 채워 쓸 문장 시작 틀",
      "12. 선택 도서 활용 방식",
      "13. 교과 개념·전공 개념 연결 포인트",
      "14. 심화 확장 방향",
      "15. 제출 전 체크리스트"
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
        { role: "system", content: "너는 고등학생 수행평가 탐구 설계서를 만드는 전문 도우미다. 완성문을 대신 쓰지 말고, 학생이 직접 조사·분석·작성할 수 있는 로드맵을 제공한다." },
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
      lens.shortLabel = "시스템·알고리즘 사고";
      lens.process = "입력 자료 수집 → 변수 설정 → 조건 분기 → 판단 결과 → 오류·한계 검증";
      lens.concepts = uniqClean(["시스템", "알고리즘", "데이터 처리", "조건 분기", "모델링", "검증", ...rawKeywords]).slice(0, 7);
      lens.actions = [
        "현상을 입력 자료와 판단 기준으로 나눈다",
        "어떤 변수를 기준으로 삼을지 정한다",
        "단일 기준과 복합 기준의 결과 차이를 비교한다",
        "판단 기준이 틀릴 수 있는 예외 상황을 찾는다"
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

  function buildStudentReportFromPayload(req, rawData){
    const s = req?.mini_payload?.selectionPayload || {};
    const resolved = getWorkerResolved(rawData);
    const workerPattern = getWorkerPatternRule(rawData) || {};
    const pattern = req.report_dataset_pattern || {};
    const book = req.selectedBook || req?.mini_payload?.selectedBook || {};
    const bookUse = getSelectedBookUse(req) || {};
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
    const patternName = firstNonEmpty(pattern.selectedPattern, workerPattern.label, "교과 개념-실제 사례 해석형");
    const bookTitle = firstNonEmpty(book.title, req.selectedBookTitle, "선택 도서");
    const bookUseText = firstNonEmpty(
      bookUse.useInReport,
      Array.isArray(bookUse.reportRoleLabels) ? bookUse.reportRoleLabels.join(", ") : "",
      "탐구 관점과 한계 논의"
    );

    const allText = `${keyword} ${axisRaw} ${concept} ${major}`;
    const lens = deriveMajorLens(major, majorContext, allText);
    const bridgeRows = makeMajorBridgeRows(lens, keyword);

    const isWeather = /폭염|기후|재난|주의보|대기|환경|날씨|기상/.test(allText);
    const isData = /데이터|모델|그래프|통계|예측|시각|측정|수리|자료|판단/.test(allText + " " + lens.keywords.join(" "));
    const isBio = /세포|생명|유전자|효소|대사|약물|면역|질병|의학|보건|간호/.test(allText + " " + lens.keywords.join(" "));
    const isEnergy = /물리|에너지|역학|전자기|파동|열|전기|배터리|전지/.test(allText + " " + lens.keywords.join(" "));
    const isPolicy = /사회|윤리|정책|규제|쟁점|공공|법|경제/.test(allText + " " + lens.keywords.join(" "));

    const title = `${keyword}의 판단 기준을 ${lens.domainLabel} 관점으로 설계하기`;

    let direction = `${keyword}를 단순한 사례 조사 주제가 아니라, ${subject}의 ${concept} 개념으로 해석하고 ${axis}과 ${lens.shortLabel}을 함께 사용해 판단 기준을 설계한다.`;
    if(isWeather && /시스템|알고리즘|데이터|조건 분기|모델링/.test(lens.keywords.join(" "))){
      direction = `${keyword}를 단순한 기상 정보가 아니라, 관측 자료가 입력되고 기준에 따라 위험 판단이 이루어지는 시스템 사례로 분석한다. 학생은 기온·습도·체감온도 같은 변수를 비교해 어떤 조건에서 판단 결과가 달라지는지 설명한다.`;
    }else if(isWeather){
      direction = `${keyword}를 단순한 기상 정보가 아니라, 관측 자료와 발령 기준이 결합된 사회적 판단 사례로 보고 ${concept}와 ${axis} 관점에서 분석한다.`;
    }else if(isData){
      direction = `${keyword}를 자료 수집, 변수 설정, 비교 기준, 판단 결과의 흐름으로 나누어 해석하고 ${lens.shortLabel}에서 필요한 기준 설계와 검증 과정으로 연결한다.`;
    }else if(isBio){
      direction = `${keyword}를 생명 현상의 단순 설명이 아니라 원인, 조건, 반응, 결과의 흐름으로 해석하고 근거 기반 판단과 연결한다.`;
    }else if(isEnergy){
      direction = `${keyword}를 물리적 원리와 실제 시스템의 관계로 보고, 측정값과 조건 변화가 결과에 미치는 영향을 ${lens.shortLabel}으로 분석한다.`;
    }else if(isPolicy){
      direction = `${keyword}를 사회적 쟁점으로만 보지 않고, 근거 자료와 판단 기준이 의사결정에 어떻게 반영되는지 분석한다.`;
    }

    const q = [];
    if(isWeather && /시스템|알고리즘|데이터|조건 분기|모델링/.test(lens.keywords.join(" "))){
      q.push(`${keyword}를 판단하기 위해 어떤 자료를 입력값으로 삼아야 하며, 어떤 조건이 기준값이 되는가?`);
      q.push(`기온만 기준으로 삼을 때와 습도·체감온도까지 함께 고려할 때 판단 결과는 어떻게 달라지는가?`);
      q.push(`이 판단 기준을 간단한 조건 분기나 절차도로 표현한다면 어떤 예외와 한계가 생기는가?`);
    }else if(isWeather){
      q.push(`${keyword}는 어떤 기준으로 판단되며, 그 기준은 실제 위험을 충분히 설명하는가?`);
      q.push(`기온, 습도, 체감온도처럼 서로 다른 자료를 함께 보면 판단 결과는 어떻게 달라지는가?`);
      q.push(`같은 ${keyword} 상황이라도 지역, 시간대, 생활환경에 따라 위험도는 어떻게 달라질 수 있는가?`);
    }else if(isData){
      q.push(`${keyword}를 판단하기 위해 어떤 자료를 수집하고 어떤 변수를 기준으로 삼아야 하는가?`);
      q.push(`단일 기준과 복합 기준으로 분석했을 때 결론은 어떻게 달라지는가?`);
      q.push(`${lens.shortLabel} 관점에서 이 문제를 간단한 판단 모델이나 분류 기준으로 표현할 수 있는가?`);
    }else if(isBio){
      q.push(`${keyword}와 관련된 현상은 어떤 조건에서 달라지며, 그 원인은 무엇인가?`);
      q.push(`자료나 사례를 비교했을 때 공통적으로 드러나는 반응 과정 또는 위험 요인은 무엇인가?`);
      q.push(`이 탐구 결과를 예방, 진단, 관리, 설명 중 어떤 방향으로 활용할 수 있는가?`);
    }else if(isEnergy){
      q.push(`${keyword} 현상을 설명하는 핵심 물리량 또는 조건은 무엇인가?`);
      q.push(`조건을 바꾸면 측정값이나 결과가 어떻게 달라지는가?`);
      q.push(`${lens.shortLabel} 관점에서 효율, 안정성, 예측 가능성 중 어떤 기준을 중심으로 해석할 수 있는가?`);
    }else if(isPolicy){
      q.push(`${keyword}와 관련된 판단 기준은 어떤 근거 자료를 바탕으로 만들어지는가?`);
      q.push(`서로 다른 이해관계자나 집단에 따라 문제 해석은 어떻게 달라지는가?`);
      q.push(`자료 기반 판단과 사회적 가치 판단을 어떻게 함께 고려할 수 있는가?`);
    }else{
      q.push(`${keyword}는 ${concept} 개념으로 어떻게 설명할 수 있는가?`);
      q.push(`실제 사례나 자료를 비교하면 어떤 차이와 원인이 드러나는가?`);
      q.push(`${lens.shortLabel}으로 연결했을 때 이 주제는 어떤 문제 해결 가능성을 보여주는가?`);
    }

    const dataPlan = [];
    if(isWeather){
      dataPlan.push([`${keyword}의 공식 기준`, "기상청·공공기관 자료", "서론과 교과 개념 연결"]);
      dataPlan.push(["일별 기온·습도·체감온도 자료", "기상자료개방포털·공공데이터", "본론의 표·그래프 분석"]);
      dataPlan.push(["지역별 또는 시간대별 차이", "지자체 자료·뉴스·통계", "비교 분석 문단"]);
      dataPlan.push(["피해 사례 또는 대응 정책", "보도자료·기관 보고서", "결론의 사회적 의미 확장"]);
    }else if(isData){
      dataPlan.push(["핵심 현상을 보여주는 원자료", "공공데이터·기관 통계·관찰 자료", "분석 대상 설정"]);
      dataPlan.push(["비교할 변수 2~3개", "표본 자료·측정값·그래프", "기준 설정과 비교"]);
      dataPlan.push(["기준을 적용한 결과", "직접 만든 표·그래프", "판단 과정 설명"]);
      dataPlan.push(["오차·한계 사례", "기사·보고서·추가 통계", "한계와 개선 방향"]);
    }else{
      dataPlan.push([`${keyword}의 기본 사례`, "교과서·기관 자료·기사", "탐구 배경 설명"]);
      dataPlan.push([`${concept}와 연결되는 근거 자료`, "교과서 단원·실험 자료·통계", "교과 개념 설명"]);
      dataPlan.push(["비교 가능한 사례 2개", "뉴스·논문 요약·공공 자료", "본론 비교 분석"]);
      dataPlan.push([`${lens.shortLabel}과 연결되는 활용 사례`, "학과 소개·진로 자료·산업 사례", "결론과 확장"]);
    }

    const branch = [
      `탐구 질문 선택: A안은 기준의 타당성, B안은 자료 비교, C안은 ${lens.shortLabel} 적용 중심으로 선택한다.`,
      `조사 범위 선택: 지역 1곳을 깊게 볼지, 지역 2~3곳을 비교할지 먼저 정한다.`,
      `비교 기준 선택: 단일 기준, 복합 기준, 시간 변화, 집단 차이 중 하나를 주된 분석 기준으로 삼는다.`,
      `결론 방향 선택: 원인 설명형, 기준 개선형, 시스템 제안형, 사회적 대응형 중 하나로 마무리한다.`
    ];

    const tableText = [
      "정리 항목 | 학생이 채울 내용 | 보고서 활용 위치",
      `${keyword}의 기준 또는 정의 | 공식 기준을 직접 적기 | 서론`,
      `입력 자료 또는 관찰 자료 | 수치·사례·관찰 내용 입력 | 본론 1`,
      `비교 변수 | 기온/습도/시간/지역/집단 등 조건 입력 | 본론 2`,
      `판단 결과 | 기준 적용 후 달라지는 점 해석 | 본론 3`,
      `${lens.shortLabel} 연결 | 어떤 기준·절차·검증이 필요한지 정리 | 결론`
    ];

    const outline = [
      `Ⅰ. 탐구 동기: ${keyword}를 처음 어떻게 보았고, 왜 기준이나 자료로 다시 보게 되었는지 쓴다.`,
      `Ⅱ. 교과 개념 연결: ${subject}의 ${concept}가 이 주제를 설명하는 데 어떤 역할을 하는지 정리한다.`,
      `Ⅲ. 자료 수집과 비교: 학생이 직접 찾은 자료를 표나 그래프로 정리하고 차이를 설명한다.`,
      `Ⅳ. 전공 개념 적용: ${lens.keywords.slice(0,3).join("·")} 개념을 사용해 판단 기준, 절차, 검증 가능성 중 하나를 분석한다.`,
      `Ⅴ. 결론과 한계: 내가 세운 기준의 의미와 한계, 추가 탐구 방향을 제시한다.`
    ];

    const paragraphGuide = [
      "서론 문단: 주제 소개보다 '왜 이 기준을 다시 보게 되었는가'를 중심으로 쓴다.",
      "개념 문단: 교과서 정의를 그대로 옮기지 말고, 내가 분석할 자료와 연결되는 개념만 고른다.",
      "분석 문단: 자료를 나열하지 말고, 비교 기준을 먼저 말한 뒤 표·그래프·사례를 해석한다.",
      `전공 연결 문단: 학과명을 붙이지 말고 ${lens.keywords.slice(0,4).join("·")} 같은 개념이 왜 필요한지 설명한다.`,
      "결론 문단: 정답을 단정하지 말고, 내가 세운 기준의 장점과 한계를 함께 쓴다."
    ];

    const templates = [
      `처음에는 ${keyword}를 ________로만 생각했다. 그러나 자료를 찾아보니 이 주제는 ________을 기준으로 판단되는 문제라는 점을 알게 되었다.`,
      `${subject}의 ${concept} 개념은 이 탐구에서 ________을 설명하는 데 활용할 수 있다. 특히 내가 비교한 자료에서는 ________ 차이가 드러났다.`,
      `나는 자료를 정리할 때 ________을 기준으로 삼았다. 그 이유는 이 기준이 ${keyword}의 ________을 더 잘 보여준다고 판단했기 때문이다.`,
      `${lens.shortLabel} 관점에서 이 탐구는 ________와 연결된다. 단순히 사례를 조사한 것이 아니라, 자료를 바탕으로 ________을 판단하는 과정이라는 점에서 의미가 있다.`,
      `다만 이번 탐구에는 ________라는 한계가 있다. 후속 탐구에서는 ________ 자료를 추가해 기준의 타당성을 더 확인하고 싶다.`
    ];

    const bookGuide = [
      `『${bookTitle}』는 보고서의 중심 내용을 대신하는 책 요약 자료가 아니라, 탐구 관점을 넓히는 보조 근거로 사용한다.`,
      `활용 위치는 ${bookUseText} 부분이 적절하다.`,
      `본문에서는 책 내용을 길게 소개하지 말고, '${keyword}를 단일 원인으로 보지 않고 여러 조건의 관계로 해석한다'는 관점처럼 한 문장 수준으로 연결한다.`,
      `도서 연결 문장은 결론 또는 한계 문단에 배치하면 억지 독후감처럼 보이지 않는다.`
    ];

    const connect = [
      `교과 개념: ${concept}는 탐구의 설명 기준이다. 교과서 개념을 외운 흔적보다 실제 자료를 해석하는 데 사용한 흔적이 보여야 한다.`,
      `후속 연계축: ${axis}은 탐구의 분석 방식이다. 자료를 어떤 기준으로 나누고 비교할지 정하는 역할을 한다.`,
      `전공 개념: ${lens.displayName}이라는 학과명보다 ${lens.keywords.slice(0,5).join("·")} 같은 학습 개념을 보고서의 해석 기준으로 사용한다.`,
      `선택 구조: ${mode} / ${view} / ${line} 선택값은 보고서의 전개 방식, 해석 관점, 결론 방향을 정하는 기준으로 사용한다.`
    ];

    const advanced = [
      `기본형: 자료 2개를 비교해 ${keyword}의 판단 기준을 설명한다.`,
      `심화형: 자료 3개 이상을 표·그래프로 정리하고, 기준을 바꾸었을 때 결론이 어떻게 달라지는지 비교한다.`,
      `전공형: ${lens.process} 흐름으로 보고서를 재구성해 기준 설계 능력을 드러낸다.`,
      `확장형: 한계 요인을 추가해 '내 기준이 항상 맞는가'를 검토한다.`
    ];

    const checklist = [
      "선택한 탐구 질문 1개가 보고서 전체를 관통하는가?",
      "자료 출처를 최소 2종 이상 확보했는가?",
      "표나 그래프에 들어갈 수치 또는 사례가 실제로 있는가?",
      "교과 개념이 정의 설명에서 끝나지 않고 자료 해석에 쓰였는가?",
      "학과명을 억지로 붙이지 않고 전공 키워드가 분석 기준으로 사용되었는가?",
      "선택 도서가 독후감처럼 길게 들어가지 않았는가?",
      "결론에 한계와 후속 탐구가 포함되어 있는가?"
    ];

    const bridgeTable = [
      "학과 키워드 | 보고서에서의 역할 | 학생이 실제로 할 일",
      ...bridgeRows.map(row => row.join(" | "))
    ];

    const sections = [
      {title:"설계서 제목", body:title},
      {title:"선택 기반 탐구 경로 요약", body:`과목은 ${subject}, 진로 분야는 ${major}, 교과 개념은 ${concept}, 추천 키워드는 ${keyword}, 후속 연계축은 ${axis}이다. 이 설계서는 완성 보고서를 대신 제공하는 것이 아니라, 학생이 직접 자료를 찾고 비교 기준을 세워 자기 보고서로 완성하도록 안내한다. 핵심은 '${major} 관점'이라는 표현을 반복하는 것이 아니라 ${lens.keywords.slice(0,4).join("·")} 같은 전공 학습 키워드를 탐구 기준으로 바꾸는 것이다.`},
      {title:"학과 키워드 → 탐구 기준 변환", body:`전공 렌즈: ${lens.shortLabel}\n분석 흐름: ${lens.process}\n\n${bridgeTable.join("\n")}`},
      {title:"최종 추천 탐구 방향", body:direction},
      {title:"학생이 선택할 탐구 질문 3개", body:q.map((v,i)=>`${String.fromCharCode(65+i)}안. ${v}`).join("\n") + "\n\n권장: 세 질문 중 1개만 최종 질문으로 고른 뒤, 나머지는 비교 관점이나 한계 문단에 보조적으로 사용한다."},
      {title:"개인화 분기 선택지", body:branch.join("\n")},
      {title:"실제 조사 자료와 출처 계획", body:dataPlan.map(row=>`- ${row[0]}: ${row[1]}에서 찾고, ${row[2]}에 사용한다.`).join("\n")},
      {title:"자료 정리 표 양식", body:tableText.join("\n")},
      {title:"보고서 목차 설계", body:outline.join("\n")},
      {title:"문단별 작성 가이드", body:paragraphGuide.join("\n")},
      {title:"학생이 직접 채워 쓸 문장 시작 틀", body:templates.join("\n")},
      {title:"선택 도서 활용 방식", body:bookGuide.join("\n")},
      {title:"교과 개념·전공 개념 연결 포인트", body:connect.join("\n")},
      {title:"심화 확장 방향", body:advanced.join("\n")},
      {title:"제출 전 체크리스트", body:checklist.map(v=>`□ ${v}`).join("\n")}
    ];

    const text = sections.map((sec, idx) => `${idx + 1}. ${sec.title}\n${sec.body}`).join("\n\n");
    return {
      text,
      sections,
      title,
      source: "payload-blueprint-major-keyword-lens",
      note: "학과명을 억지로 붙이지 않고 학과 키워드와 학습 개념을 탐구 기준으로 변환했습니다.",
      diagnostics: {
        patternName,
        mode,
        view,
        line,
        productMode: "student_research_blueprint",
        majorLens: lens.shortLabel,
        majorKeywords: lens.keywords,
        majorProcess: lens.process
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
    // v41부터는 Worker가 완성문을 반환하더라도 화면에는 동일 문장 대량 생성 위험이 낮은
    // 학생 실행형 탐구 설계서를 렌더링한다. Worker 응답은 resolved/pattern 진단과 로그 용도로만 보조 활용한다.
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
      `${s.selectedKeyword || req.keyword || "선택 키워드"} 기반 탐구보고서`
    );

    const diag = extraction?.diagnostics || {};
    const majorKeywordTag = Array.isArray(diag.majorKeywords) && diag.majorKeywords.length ? diag.majorKeywords.slice(0,4).join(" · ") : "";
    const majorLensTag = diag.majorLens || "";

    const displaySections = sections
      .filter(sec => !/^(보고서|설계서)\s*제목$/.test(normalizeSectionTitle(sec.title)))
      .map(sec => {
        const title = normalizeSectionTitle(sec.title);
        const cleanTitle = title === "추천 주제" ? "탐구 주제" : (title === "느낀점" ? "느낀 점" : title);
        return { title: cleanTitle, body: sec.body };
      });

    const sectionHtml = displaySections.length ? displaySections.map(sec => `
      <article class="mini-v32-section">
        <h4>${escapeHtml(sec.title)}</h4>
        <p>${nl2br(sec.body)}</p>
      </article>
    `).join("") : `<article class="mini-v32-section"><p>${nl2br(text)}</p></article>`;

    root.style.display = "block";
    root.innerHTML = `
      <style>
        .mini-v32-result{border:1px solid #b8cdfd;border-radius:18px;background:#fff;padding:22px;margin-top:18px;box-shadow:0 12px 28px rgba(50,87,180,.08)}
        .mini-v32-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
        .mini-v32-kicker{display:inline-flex;align-items:center;border-radius:999px;background:#eaf1ff;color:#2454d8;font-weight:800;font-size:12px;padding:6px 10px;margin-bottom:10px}
        .mini-v32-title{font-size:24px;line-height:1.35;margin:0 0 8px;color:#111827}
        .mini-v32-sub{font-size:13px;color:#526070;margin:0 0 16px}
        .mini-v32-tags{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 18px}
        .mini-v32-tags span{font-size:12px;border:1px solid #d5e0ff;background:#f6f8ff;border-radius:999px;padding:5px 9px;color:#2446a5}
        .mini-v32-section{border:1px solid #dbe5ff;background:#fbfdff;border-radius:14px;padding:15px;margin-bottom:10px}
        .mini-v32-section h4{font-size:14px;margin:0 0 8px;color:#111827}
        .mini-v32-section p{font-size:13px;line-height:1.75;margin:0;color:#263445;white-space:normal}
        .mini-v32-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin:0 0 12px}
        .mini-v32-actions button{border:1px solid #c6d5ff;background:#fff;color:#2454d8;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}
        .mini-v32-actions button.primary{background:#2f5bff;color:#fff;border-color:#2f5bff}
        @media (max-width: 780px){.mini-v32-head{display:block}.mini-v32-actions{justify-content:flex-start}}
      </style>

      <section class="mini-v32-result">
        <div class="mini-v32-head">
          <div>
            <div class="mini-v32-kicker">학생 실행형 탐구 설계서</div>
            <h2 class="mini-v32-title">${escapeHtml(reportTitle)}</h2>
            <p class="mini-v32-sub">선택한 교과 개념·추천 키워드·후속 연계축·도서를 바탕으로, 학과명보다 학과 핵심 키워드를 탐구 기준으로 바꾸어 정리한 실행 가이드입니다.</p>
          </div>
          <div class="mini-v32-actions">
            <button type="button" id="miniV32CopyReportBtn" class="primary">설계서 복사</button>
          </div>
        </div>

        <div class="mini-v32-tags">
          <span>${escapeHtml(s.subject || req.subject)}</span>
          <span>진로 분야: ${escapeHtml(s.department || req.career)}</span>
          ${majorLensTag ? `<span>전공 렌즈: ${escapeHtml(majorLensTag)}</span>` : ""}
          ${majorKeywordTag ? `<span>전공 키워드: ${escapeHtml(majorKeywordTag)}</span>` : ""}
          <span>${escapeHtml(s.selectedConcept || req.selectedConcept)}</span>
          <span>${escapeHtml(s.selectedKeyword || req.keyword)}</span>
          <span>${escapeHtml(compactAxis(s.selectedFollowupAxis || req.selectedFollowupAxis))}</span>
          ${book.title ? `<span>도서: ${escapeHtml(book.title)}</span>` : ""}
        </div>

        <div class="mini-v32-sections">
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
    if(topicSub) topicSub.textContent = "선택한 교과 개념·키워드·후속 연계축·도서가 반영된 탐구 설계 결과입니다.";
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
      showError("설계서 생성 중 오류가 발생했습니다.", e.message || String(e));
      return false;
    }finally{
      setLoading(false);
    }
  }

  function bindGenerateButton(){
    let btn = $("generateBtn");
    if(!btn) return;

    // v34~v36 또는 기존 keyword_engine.js가 먼저 click listener를 잡은 경우가 있어
    // 버튼 노드를 한 번 교체한 뒤 v41 핸들러만 다시 연결한다.
    if(btn.dataset.miniWorkerV41Bound === "1") return;
    const cleanBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(cleanBtn, btn);
    btn = cleanBtn;
    btn.dataset.miniWorkerV41Bound = "1";
    btn.dataset.miniWorkerV32Bound = "v41";
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
