/* mini_worker_generate_bridge_v32.js
 * 기존 Cloudflare Worker(/collect, /generate)를 유지하면서
 * __BUILD_MINI_REPORT_PAYLOAD__ 전체 데이터를 /generate로 보내고,
 * Worker/MINI 응답을 화면에 실제 결과로 출력하는 브리지.
 */
(function(global){
  "use strict";

  const VERSION = "mini-worker-generate-bridge-v34-worker-json-to-report-render";
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
      btn.textContent = isLoading ? "MINI 생성 중..." : "학생용 결과 생성";
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
      usagePurpose: readValue("usagePurpose") || "학생용 MINI 보고서 작성",
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
        reportIntent: "학생용 수행평가 탐구보고서 생성"
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
        "학생이 바로 제출할 수 있는 문단형 보고서로 작성한다.",
        "고등학생 수준을 넘는 전문 알고리즘·대학 수식은 개념 설명 중심으로 낮춘다."
      ]
    };
  }

  function buildMiniInstruction(form, mini, pattern){
    const s = mini.selectionPayload || {};
    const book = mini.selectedBook || {};
    const ctx = mini.reportGenerationContext || {};
    const choices = getReportChoices(mini);
    const sections = pattern.fixedSections || ctx.targetStructure || [];

    return [
      "너는 고등학생 수행평가 탐구보고서 작성 도우미다.",
      "아래 payload를 바탕으로 학생이 제출 가능한 완성형 보고서 초안을 작성하라.",
      "",
      "[절대 조건]",
      "1. 선택한 교과 개념, 추천 키워드, 4번 후속 연계축, 선택 도서를 반드시 반영한다.",
      "2. 보고서 예시 데이터셋(RPT001~RPT010)의 구조처럼 문단별 목적이 분명한 결과를 작성한다.",
      "3. 도서는 단순 독후감으로 요약하지 말고, 보고서의 근거 프레임·비교 관점·한계 논의·결론 확장에만 배치한다.",
      "4. 학생 화면에 내부 payload, API, prompt 같은 표현을 쓰지 않는다.",
      "5. 고등학생이 이해 가능한 문장으로 쓰되, 내용은 수행평가 제출용으로 구체화한다.",
      "",
      "[학생 기본 정보]",
      `학교: ${form.schoolName || "미입력"}`,
      `학년: ${form.grade || "미입력"}`,
      `과목: ${s.subject || form.subject || "미입력"}`,
      `수행평가명: ${form.taskName || "미입력"}`,
      `수행평가 형태: ${form.taskType || "미입력"}`,
      `희망 진로/학과: ${s.department || form.career || "미입력"}`,
      "",
      "[선택 흐름]",
      `교과 개념: ${s.selectedConcept || ""}`,
      `추천 키워드: ${s.selectedKeyword || s.selectedRecommendedKeyword || ""}`,
      `후속 연계축: ${compactAxis(s.selectedFollowupAxis || s.followupAxis || "")}`,
      `후속 연계축 원문: ${s.selectedFollowupAxis || s.followupAxis || ""}`,
      `선택 도서: ${book.title || ""}${book.author ? " / " + book.author : ""}`,
      "",
      "[학생이 선택한 보고서 구조]",
      `보고서 전개 방식: ${choices.mode || ctx.reportMode || "선택값 기준"}`,
      `보고서 관점: ${choices.view || ctx.reportView || "선택값 기준"}`,
      `보고서 라인: ${choices.line || ctx.reportLine || "선택값 기준"}`,
      "",
      "[보고서 데이터셋 반영 기준]",
      `적용 패턴: ${pattern.selectedPattern}`,
      `참고 리포트: ${(pattern.referenceReports || []).join(", ")}`,
      "필수 섹션: " + sections.join(" / "),
      "",
      "[출력 형식]",
      "다음 제목과 순서로 작성하라.",
      "1. 보고서 제목",
      ...sections.map((section, idx) => `${idx + 2}. ${section}`),
      "",
      "[문장 기준]",
      "- 각 섹션은 제목 + 2~5문장으로 작성한다.",
      "- '추천 주제'는 실제 보고서 제목으로 쓸 수 있게 1개를 제안한다.",
      "- '실제 적용 및 문제 해결 과정'은 단계형으로 쓴다.",
      "- '세특 문구 예시'는 교사가 그대로 복사하는 문장이 아니라, 학생 활동의 관찰 가능 요소 중심으로 2~3문장 제안한다.",
      "- '참고문헌 및 자료'에는 선택 도서와 기관/통계/기사/논문 자료 유형을 함께 제시한다."
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
        { role: "system", content: "너는 고등학생 수행평가 탐구보고서를 작성하는 전문 도우미다. 반드시 사용자가 제공한 payload와 보고서 데이터셋 구조를 반영한다." },
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
      ["selectedFollowupAxis", "4번 후속 연계축"]
    ];
    checks.forEach(([key, label]) => {
      if(!String(req[key] || "").trim()) missing.push(label);
    });
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

  function buildStudentReportFromPayload(req, rawData){
    const s = req?.mini_payload?.selectionPayload || {};
    const resolved = getWorkerResolved(rawData);
    const workerPattern = getWorkerPatternRule(rawData) || {};
    const pattern = req.report_dataset_pattern || {};
    const book = req.selectedBook || req?.mini_payload?.selectedBook || {};
    const bookUse = getSelectedBookUse(req) || {};
    const choices = req.report_choices || getReportChoices(req.mini_payload || {});

    const subject = firstNonEmpty(s.subject, req.subject, resolved.subject, "선택 과목");
    const major = firstNonEmpty(s.department, req.career, resolved.major, resolved.track, "선택 학과");
    const concept = firstNonEmpty(s.selectedConcept, req.selectedConcept, "선택 교과 개념");
    const keyword = firstNonEmpty(s.selectedKeyword, s.selectedRecommendedKeyword, req.selectedKeyword, req.keyword, resolved.keyword, "선택 키워드");
    const axisRaw = firstNonEmpty(s.selectedFollowupAxis, s.followupAxis, req.selectedFollowupAxis, "선택 후속 연계축");
    const axis = compactAxis(axisRaw);
    const mode = firstNonEmpty(choices.mode, s.reportMode, "보고서 전개 방식");
    const view = firstNonEmpty(choices.view, s.reportView, "보고서 관점");
    const line = firstNonEmpty(choices.line, s.reportLine, "보고서 라인");
    const patternName = firstNonEmpty(pattern.selectedPattern, workerPattern.label, "교과 개념-실제 사례 해석형");
    const refs = (pattern.referenceReports || []).join(", ") || "RPT001, RPT005";
    const bookTitle = firstNonEmpty(book.title, req.selectedBookTitle, "선택 도서");
    const bookUseText = firstNonEmpty(
      bookUse.useInReport,
      Array.isArray(bookUse.reportRoleLabels) ? bookUse.reportRoleLabels.join(", ") : "",
      "근거 프레임과 비교 관점으로 활용"
    );
    const topic = buildReportTitle(req, rawData);

    const problemContext = /폭염|기후|재난|주의보|대기|환경/.test(keyword + axisRaw)
      ? "일상에서 접하는 기상 정보와 경보 기준은 단순한 안내 문구가 아니라, 관측 자료와 판단 기준이 결합된 사회적 의사결정 결과이다."
      : /데이터|모델|그래프|측정|통계|예측/.test(keyword + axisRaw)
        ? "현상은 눈에 보이는 결과만으로 해석하기 어렵기 때문에, 자료를 수집하고 기준을 세워 판단하는 과정이 필요하다."
        : "교과 개념은 실제 문제 상황을 해석하고 해결 방향을 세울 때 의미가 분명해진다.";

    const principle = /데이터|모델|그래프|측정|통계|예측/.test(keyword + axisRaw)
      ? `${keyword}를 해석할 때 핵심은 관측값을 그대로 외우는 것이 아니라, 어떤 변수를 기준으로 삼고 어떤 조건에서 차이가 발생하는지 비교하는 것이다.`
      : `${keyword}는 ${concept}에서 다루는 핵심 개념을 실제 상황에 적용해 볼 수 있는 출발점이다.`;

    const process = [
      `1단계에서는 ${keyword}와 관련된 현상 또는 사례를 정하고, ${subject}에서 배운 ${concept} 개념과 연결한다.`,
      `2단계에서는 관측 자료, 기사, 기관 자료, 그래프 등 비교 가능한 근거를 모아 ${axis} 관점에서 정리한다.`,
      `3단계에서는 자료를 단순 나열하지 않고 기준을 세워 차이와 원인을 해석한다.`,
      `4단계에서는 ${major} 진로와 연결해 문제 해결 가능성, 한계, 추가 탐구 방향을 제시한다.`
    ];

    const sections = [
      {title:"보고서 제목", body:topic},
      {title:"중요성", body:`${problemContext} 따라서 이 보고서는 ${keyword}를 ${concept}의 교과 개념에서 출발해 ${axis}으로 확장하고, ${major} 관점에서 자료를 해석하는 방식으로 구성한다. 이 과정은 단순 설명형 보고서보다 학생의 개념 이해, 자료 해석력, 진로 연결성을 함께 보여줄 수 있다.`},
      {title:"추천 주제", body:topic},
      {title:"탐구 동기", body:`평소 ${keyword}가 실제 생활이나 사회 문제에서 어떻게 판단 기준으로 쓰이는지 궁금했다. 특히 ${subject}에서 배운 ${concept}이 단순 개념 암기가 아니라 실제 자료 해석과 연결될 수 있다는 점에 주목했다. 그래서 이 주제를 통해 ${major} 진로와 연결되는 탐구 흐름을 만들고자 했다.`},
      {title:"관련 키워드", body:`핵심 키워드는 ${keyword}, ${concept}, ${axis}, 자료 수집, 비교 기준, 판단 근거, 한계 분석이다. 이 키워드들은 개념 설명, 실제 사례 해석, 문제 해결 과정, 진로 확장 문단으로 나누어 보고서 전체의 흐름을 만든다.`},
      {title:"이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?", body:`${concept}은 ${subject}에서 배운 내용을 실제 문제와 연결하는 핵심 개념이다. ${keyword}를 이 개념으로 해석하면 학생이 단순히 사례를 조사한 것이 아니라, 교과 지식을 사용해 문제를 구조화하고 판단 기준을 세웠다는 점이 드러난다. 이는 생기부에서 교과 이해도, 자료 해석력, 진로 연계 탐구 역량으로 기록될 수 있다.`},
      {title:"이 개념이 무엇이며 어떤 원리인가?", body:`${principle} ${axis}은 이 개념을 다음 과목이나 심화 탐구로 확장하는 연결축이다. 따라서 보고서에서는 정의를 길게 나열하기보다, 실제 사례에서 어떤 변수와 조건을 보아야 하는지 설명하는 방식으로 원리를 정리한다.`},
      {title:"어떤 문제를 해결할 수 있고, 왜 중요한가?", body:`이 탐구는 ${keyword}와 관련된 현상을 더 정확하게 판단하는 문제와 연결된다. 특히 자료가 많아도 기준이 없으면 결론이 모호해질 수 있으므로, ${axis} 관점에서 기준을 세우는 것이 중요하다. 이런 방식은 ${major} 분야에서 문제를 분석하고 해결 방안을 설계하는 기본 사고 과정과도 이어진다.`},
      {title:"실제 적용 및 문제 해결 과정", body:process.join("\n")},
      {title:"교과목 연계 및 이론적 설명", body:`현재 과목인 ${subject}에서는 ${concept}을 통해 기본 원리를 정리한다. 이후 ${axisRaw} 흐름으로 확장하면 수학적 자료 해석, 과학적 측정, 정보 처리, 시각화 활동과 연결할 수 있다. 이때 ${major} 진로는 단순 배경이 아니라 자료를 어떻게 해석하고 어떤 기준으로 판단할지 정하는 관점으로 작용한다.`},
      {title:"선택 도서 활용", body:`선택 도서 『${bookTitle}』는 보고서의 중심을 독후감으로 바꾸기 위한 자료가 아니라, 탐구 관점을 넓히는 참고 근거로 활용한다. 이 책은 ${bookUseText} 위치에 배치하는 것이 적절하다. 따라서 본문에서는 도서 내용을 길게 요약하기보다, ${keyword}를 해석하는 기준이나 한계 논의, 결론 확장 부분에서 짧게 연결한다.`},
      {title:"심화 탐구 발전 방안", body:`후속 탐구에서는 ${keyword}와 관련된 사례를 2개 이상 비교하거나, 시간·지역·조건별 차이를 표나 그래프로 정리할 수 있다. 또한 ${axis} 관점에서 판단 기준을 직접 설정하고, 그 기준이 실제 문제 해결에 충분한지 검토하면 심화성이 높아진다. 마지막으로 ${major} 분야에서 이 문제가 어떻게 응용될 수 있는지 한계와 개선 방향까지 제시할 수 있다.`},
      {title:"느낀점", body:`이번 탐구를 통해 교과 개념은 교과서 안에서만 의미를 갖는 것이 아니라 실제 자료와 사례를 해석하는 기준이 될 수 있음을 알게 되었다. 특히 ${keyword}를 ${axis}으로 바라보니, 같은 현상도 어떤 기준을 세우느냐에 따라 결론이 달라질 수 있다는 점을 이해했다. 앞으로도 진로와 연결되는 문제를 단순 조사보다 근거 기반 분석으로 확장하고 싶다.`},
      {title:"세특 문구 예시", body:`${subject}의 ${concept} 개념을 바탕으로 ${keyword}를 탐구하며, 실제 사례와 자료를 ${axis} 관점에서 해석하려는 모습을 보임. 선택 도서와 기관 자료를 단순 요약하지 않고 비교 기준과 한계 논의에 활용하며, ${major} 진로와 연결해 문제 해결 가능성을 구체화함.`},
      {title:"참고문헌 및 자료", body:`선택 도서: 『${bookTitle}』. 추가 자료는 관련 기관 통계, 공공 데이터, 기사 자료, 그래프 자료, 교과서의 ${concept} 단원을 활용한다. 보고서에서는 출처별 역할을 구분해 도서는 관점 확장, 기관 자료는 근거, 그래프는 분석 자료로 배치한다.`}
    ];

    const text = sections.map((sec, idx) => `${idx + 1}. ${sec.title}\n${sec.body}`).join("\n\n");
    return {
      text,
      title: topic,
      source: "worker-json-normalized",
      note: "기존 Worker가 완성 본문 문자열이 아니라 구조 JSON을 반환해, 응답의 resolved/patternRule과 MINI payload를 결합해 제출형 보고서로 정리했습니다.",
      diagnostics: { patternName, referenceReports: refs, mode, view, line }
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
    const direct = normalizeGeneratedCandidate(data);
    if(direct && !looksLikeRawJsonText(direct)){
      return { text: direct, source: "worker-generated-text", fallback: false };
    }
    const composed = buildStudentReportFromPayload(req, data);
    return { text: composed.text, source: composed.source, fallback: true, note: composed.note, diagnostics: composed.diagnostics, title: composed.title };
  }

  function splitSections(text){
    const raw = String(text || "").trim();
    if(!raw) return [];
    const lines = raw.split(/\n+/).map(v => v.trim()).filter(Boolean);
    const out = [];
    let current = null;
    const titleRegex = /^(\d{1,2}[.)]\s*)?(.{1,45}?)(?:\s*[:：])$/;
    const numberedRegex = /^(\d{1,2}[.)]\s+)(.+)$/;

    lines.forEach(line => {
      if(numberedRegex.test(line) || titleRegex.test(line)){
        if(current) out.push(current);
        current = { title: line.replace(/^\d{1,2}[.)]\s*/, ""), body: "" };
      }else if(current){
        current.body += (current.body ? "\n" : "") + line;
      }else{
        current = { title: "MINI 생성 결과", body: line };
      }
    });
    if(current) out.push(current);
    return out;
  }

  function renderGeneratedReport(text, req, rawData, extraction){
    hideBuiltInResultShell();
    const root = ensureResultRoot();
    const sections = splitSections(text);
    const s = req.mini_payload?.selectionPayload || {};
    const pattern = req.report_dataset_pattern || {};
    const book = req.selectedBook || {};
    const isFallback = Boolean(extraction?.fallback);
    const sourceLabel = isFallback ? "Worker 응답 구조를 보고서 문장으로 정리한 결과" : "기존 Worker /generate가 반환한 MINI 생성 결과";

    const sectionHtml = sections.length ? sections.map(sec => `
      <article class="mini-v32-section">
        <h4>${escapeHtml(sec.title)}</h4>
        <p>${nl2br(sec.body)}</p>
      </article>
    `).join("") : `<article class="mini-v32-section"><p>${nl2br(text)}</p></article>`;

    root.innerHTML = `
      <style>
        .mini-v32-result{border:1px solid #b8cdfd;border-radius:18px;background:#fff;padding:22px;margin-top:18px;box-shadow:0 12px 28px rgba(50,87,180,.08)}
        .mini-v32-kicker{display:inline-flex;align-items:center;border-radius:999px;background:#eaf1ff;color:#2454d8;font-weight:800;font-size:12px;padding:6px 10px;margin-bottom:10px}
        .mini-v32-title{font-size:24px;line-height:1.35;margin:0 0 8px;color:#111827}
        .mini-v32-sub{font-size:13px;color:#526070;margin:0 0 16px}
        .mini-v32-tags{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 18px}
        .mini-v32-tags span{font-size:12px;border:1px solid #d5e0ff;background:#f6f8ff;border-radius:999px;padding:5px 9px;color:#2446a5}
        .mini-v32-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
        .mini-v32-card,.mini-v32-section{border:1px solid #dbe5ff;background:#fbfdff;border-radius:14px;padding:14px}
        .mini-v32-card h4,.mini-v32-section h4{font-size:14px;margin:0 0 8px;color:#111827}
        .mini-v32-card p,.mini-v32-section p{font-size:13px;line-height:1.7;margin:0;color:#263445;white-space:normal}
        .mini-v32-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin:10px 0 16px}
        .mini-v32-actions button{border:1px solid #c6d5ff;background:#fff;color:#2454d8;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}
        .mini-v32-actions button.primary{background:#2f5bff;color:#fff;border-color:#2f5bff}
        .mini-v32-raw{white-space:pre-wrap;font-size:12px;line-height:1.55;background:#0f172a;color:#e5edff;border-radius:12px;padding:14px;overflow:auto;max-height:420px}
        @media (max-width: 780px){.mini-v32-grid{grid-template-columns:1fr}}
      </style>

      <section class="mini-v32-result">
        <div class="mini-v32-kicker">MINI가 작성한 학생 제출형 보고서</div>
        <div class="mini-v32-actions">
          <button type="button" id="miniV32CopyReportBtn" class="primary">MINI 보고서 복사</button>
          <button type="button" id="miniV32CopyPayloadBtn">payload 복사</button>
        </div>
        <h2 class="mini-v32-title">${escapeHtml((sections[0]?.title && sections[0].title !== "MINI 생성 결과") ? sections[0].title : `${s.selectedKeyword || req.keyword} 기반 탐구보고서`)}</h2>
        <p class="mini-v32-sub">${escapeHtml(sourceLabel)}입니다.</p>
        <div class="mini-v32-tags">
          <span>${escapeHtml(s.subject || req.subject)}</span>
          <span>${escapeHtml(s.department || req.career)}</span>
          <span>${escapeHtml(s.selectedConcept || req.selectedConcept)}</span>
          <span>${escapeHtml(s.selectedKeyword || req.keyword)}</span>
          <span>${escapeHtml(compactAxis(s.selectedFollowupAxis || req.selectedFollowupAxis))}</span>
          ${book.title ? `<span>도서: ${escapeHtml(book.title)}</span>` : ""}
          <span>${escapeHtml(pattern.selectedPattern || "보고서 패턴")}</span>
        </div>

        <div class="mini-v32-grid">
          <div class="mini-v32-card">
            <h4>반영된 선택 구조</h4>
            <p>교과 개념: ${escapeHtml(s.selectedConcept || req.selectedConcept)}<br>
            추천 키워드: ${escapeHtml(s.selectedKeyword || req.keyword)}<br>
            후속 연계축: ${escapeHtml(compactAxis(s.selectedFollowupAxis || req.selectedFollowupAxis))}<br>
            선택 도서: ${escapeHtml(book.title || "선택 도서 없음")}</p>
          </div>
          <div class="mini-v32-card">
            <h4>보고서 데이터셋 반영 기준</h4>
            <p>패턴: ${escapeHtml(pattern.selectedPattern || "")}<br>
            참고 리포트: ${escapeHtml((pattern.referenceReports || []).join(", "))}<br>
            역할: 보고서 예시의 섹션 구조와 문장 기능을 MINI 생성 조건으로 사용</p>
          </div>
        </div>

        ${isFallback ? `<div class="mini-v32-card" style="margin:12px 0;border-color:#f0d28a;background:#fffdf4"><h4>생성 방식 안내</h4><p>${escapeHtml(extraction?.note || "Worker가 완성 본문 대신 구조 데이터를 반환해, 선택값과 응답 구조를 결합해 제출형 보고서로 정리했습니다.")}</p></div>` : ""}

        <div class="mini-v32-sections">
          ${sectionHtml}
        </div>

        <details style="margin-top:14px">
          <summary style="cursor:pointer;font-weight:800;color:#2454d8">운영/분석용 원본 응답 보기</summary>
          <pre class="mini-v32-raw">${escapeHtml(JSON.stringify(rawData, null, 2))}</pre>
        </details>
      </section>
    `;

    $("miniV32CopyReportBtn")?.addEventListener("click", () => navigator.clipboard?.writeText(text));
    $("miniV32CopyPayloadBtn")?.addEventListener("click", () => navigator.clipboard?.writeText(JSON.stringify(req, null, 2)));

    const finalTopic = $("finalTopic");
    if(finalTopic) finalTopic.textContent = (sections[0]?.title && sections[0].title !== "MINI 생성 결과") ? sections[0].title : `${s.selectedKeyword || req.keyword} 기반 MINI 보고서`;
    const topicSub = $("topicSub");
    if(topicSub) topicSub.textContent = "MINI/Worker가 payload를 받아 작성한 실제 보고서 결과입니다.";
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
      showError("MINI 보고서 생성 중 오류가 발생했습니다.", e.message || String(e));
      return false;
    }finally{
      setLoading(false);
    }
  }

  function bindGenerateButton(){
    const btn = $("generateBtn");
    if(!btn || btn.dataset.miniWorkerV32Bound === "1") return;
    btn.dataset.miniWorkerV32Bound = "1";

    // 기존 keyword_engine.js의 구형 handleGenerate보다 먼저 실행되도록 capture 단계에서 차단한다.
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
