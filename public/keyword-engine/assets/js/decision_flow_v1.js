(function(global){
  "use strict";

  const VERSION = "decision-flow-v1.0.0-three-decisions";
  const BOOK_TEXT_RE = /독서|도서|책|서평|독후|저자|문헌/;
  const REPORT_MODES = [
    "자료해석형","연구보고서형","실험분석형","연구설계형","논증형","개념해석형",
    "원리적용형","독서비평형","창작설계형","문제설계형","발표논증형","표현발표형",
    "글쓰기논술형","풀이비교형","사회문제분석형","정책제안형","변인탐구형",
    "산출물제작형","프로그래밍구현형","학습과정관찰형","사회문제탐구형",
    "탐구보고서형","실험보고서형","비평분석형","외국어문화탐구형"
  ];
  const METHODS = ["자료해석형","보고서작성형","실험실습형","논술형","논증형","토의토론형","구술발표형","포트폴리오형","프로젝트형"];
  const OUTPUTS = ["탐구보고서","실험보고서","연구노트","자료분석지","논술문","논설문","비평문","발표자료","포트폴리오","활동지","산출물","기획서","설계도","에세이"];
  const STRUCTURE_LABELS = {
    structure_research_design:"연구 설계형",
    structure_experiment_analysis:"실험 분석형",
    structure_data_interpretation:"자료 해석형",
    structure_modeling_analysis:"모델링 분석형",
    structure_problem_design:"문제 설계형",
    structure_solution_comparison:"풀이 비교형",
    structure_social_problem_analysis:"사회문제 분석형",
    structure_policy_proposal:"정책 제안형",
    structure_reading_criticism:"독서 비평형",
    structure_argumentation:"논증형",
    structure_media_analysis:"매체 분석형",
    structure_programming_implementation:"프로그래밍 구현형",
    structure_creative_design:"창작·산출물 설계형",
    structure_research_report:"연구보고서형",
    structure_principle_application:"원리 적용형",
    structure_concept_interpretation:"개념 해석형",
    structure_practical_reflection:"과정 성찰형"
  };

  const state = {
    version: VERSION,
    preview: null,
    finalContext: null,
    confirmed: false,
    blocked: false,
    override: null,
    category: "",
    categoryLabel: "",
    bookSignal: false,
    bookMode: "noBook",
    bookTitle: "",
    signature: "",
    busy: false
  };
  global.__DECISION_FLOW_STATE__ = state;
  global.__DECISION_FLOW_VERSION__ = VERSION;

  function $(id){ return document.getElementById(id); }
  function text(v){ return String(v == null ? "" : v).trim(); }
  function uniq(arr){ return Array.from(new Set((arr || []).filter(Boolean))); }
  function first(arr, fallback=""){ return Array.isArray(arr) && arr.length ? arr[0] : fallback; }
  function canonicalSubject(value){
    const fn = global.__SUBJECT_ALIAS__?.toCanonicalSubject;
    return typeof fn === "function" ? fn(value) : text(value);
  }
  function inferSubjectGroup(subject){
    const selected = $("subject")?.selectedOptions?.[0];
    const fromOption = text(selected?.dataset?.subjectGroup);
    if(fromOption) return fromOption;
    const s = text(subject);
    if(/국어|문학|독서|화법|작문|언어|매체/.test(s)) return "국어";
    if(/영어/.test(s)) return "영어";
    if(/수학|대수|미적분|기하|확률|통계/.test(s)) return "수학";
    if(/사회|한국사|역사|지리|윤리|정치|경제|법|문화/.test(s)) return "사회";
    if(/과학|물리|화학|생명|생물|지구|역학|전자기|양자|물질|세포/.test(s)) return "과학";
    if(/정보|프로그래밍|알고리즘|데이터|인공지능/.test(s)) return "정보";
    return "";
  }
  function taskTitleFromGuide(guide, subject){
    const line = text(guide).split(/\r?\n/).map(text).find(Boolean) || "";
    if(line) return line.slice(0, 120);
    return subject ? `${subject} 탐구보고서` : "탐구보고서";
  }
  function buildPayload(includeCategory=true){
    const subject = text($("subject")?.value);
    const guide = text($("taskDescription")?.value);
    const group = inferSubjectGroup(subject);
    const category = includeCategory ? state.category : "";
    return {
      subject,
      canonicalSubject: canonicalSubject(subject),
      subjectGroup: group,
      taskName: taskTitleFromGuide(guide, subject),
      taskDescription: guide,
      taskType: "탐구보고서",
      career: category,
      major: category,
      track: category,
      keyword: text($("keyword")?.value),
      interpretationOverride: state.override || null
    };
  }
  function syncHiddenBase(){
    const subject = text($("subject")?.value);
    const guide = text($("taskDescription")?.value);
    const group = inferSubjectGroup(subject);
    if($("subjectGroup")) $("subjectGroup").value = group;
    if($("taskName")) $("taskName").value = taskTitleFromGuide(guide, subject);
    if($("career")) $("career").value = state.category;
    if($("selectedBookTitle")) $("selectedBookTitle").value = state.bookMode === "useBook" ? state.bookTitle : "";
    if($("bookUsageMode")) $("bookUsageMode").value = state.bookMode;
  }
  function setProgress(step){
    document.querySelectorAll("[data-progress]").forEach(el => {
      const name = el.getAttribute("data-progress");
      const order = {subject:1,interpretation:2,category:3};
      el.classList.toggle("is-active", name === step);
      el.classList.toggle("is-complete", order[name] < order[step]);
    });
  }
  function setStatus(message, busy=false){
    const el = $("interpretStatus");
    if(el) el.textContent = message;
    const btn = $("interpretBtn");
    if(btn){ btn.disabled = busy; btn.textContent = busy ? "해석 중..." : "지금 해석하기"; }
  }
  function setOptions(select, values, selected){
    if(!select) return;
    select.innerHTML = "";
    values.forEach(item => {
      const value = typeof item === "string" ? item : item.value;
      const label = typeof item === "string" ? item : item.label;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    if(selected && values.some(item => (typeof item === "string" ? item : item.value) === selected)) select.value = selected;
  }
  function deriveView(mode, structureId){
    const bag = `${mode} ${structureId}`;
    if(/실험|자료|데이터/.test(bag)) return "자료 해석";
    if(/논증|비평|정책|사회/.test(bag)) return "비교";
    if(/모델/.test(bag)) return "모델링";
    if(/창작|산출물|프로그래밍/.test(bag)) return "기능";
    return "원리";
  }
  function deriveKeyword(context, guide, subject){
    const seed = context?.cross_axis?.seedMatch?.seed || {};
    const concepts = context?.cross_axis?.topic?.subjectConcepts || [];
    const candidate = text(seed.sourceTitle || seed.label || first(concepts,""));
    if(candidate) return candidate.slice(0,100);
    const cleaned = text(guide).replace(/평가방법.*$/s, "").split(/[/.]/)[0].trim();
    return cleaned.slice(0,100) || subject;
  }
  function contextLists(context){
    const interpreter = context?.interpreter || {};
    const route = context?.assessment_route || {};
    const cross = context?.cross_axis || {};
    const modes = uniq(interpreter.reportModes || [route.recommendedReportMode]);
    const outputs = uniq(interpreter.outputAxes || [route.recommendedOutput]);
    const methods = uniq(interpreter.methodAxes || [route.recommendedMethod]);
    const sections = uniq(cross?.structure?.sections || route.reportSections || []);
    const structureId = text(interpreter.structureId || cross?.structure?.id || "structure_research_report");
    return { modes, outputs, methods, sections, structureId };
  }
  function applyContextToHidden(context){
    const lists = contextLists(context);
    const concept = first(context?.cross_axis?.topic?.subjectConcepts, text($("subject")?.value));
    const keyword = deriveKeyword(context, $("taskDescription")?.value, $("subject")?.value);
    if($("selectedConcept")) $("selectedConcept").value = concept;
    if($("keyword")) $("keyword").value = keyword;
    if($("reportMode")) $("reportMode").value = first(lists.modes,"연구보고서형");
    if($("reportView")) $("reportView").value = deriveView(first(lists.modes,""), lists.structureId);
    if($("reportLine")) $("reportLine").value = lists.structureId;
    syncHiddenBase();
  }
  function renderSections(sections){
    const root = $("interpretedSections");
    if(!root) return;
    root.innerHTML = "";
    (sections || []).forEach(section => {
      const chip = document.createElement("span");
      chip.textContent = section;
      root.appendChild(chip);
    });
  }
  function renderInterpretation(context){
    const card = $("interpretationCard");
    if(!card) return;
    const blocked = context?.reportTarget === false || context?.blocked;
    state.blocked = !!blocked;
    card.hidden = false;
    card.classList.toggle("decision-blocked", !!blocked);
    const lists = contextLists(context);
    $("interpretedModes").textContent = lists.modes.join(" · ") || "일반형";
    $("interpretedOutputs").textContent = lists.outputs.join(" · ") || "탐구보고서";
    renderSections(lists.sections);
    const badge = $("interpretationBadge");
    const fallback = !!context?.interpreter?.fallbackActive;
    if(badge) badge.textContent = blocked ? "보고서 비대상" : (fallback ? "일반형 폴백" : "자동 판정");
    const notice = $("interpretationNotice");
    const noticeText = blocked
      ? (context?.interpreter?.notice || "이 과제는 실기·수행 중심이라 탐구보고서 형태가 아닙니다.\n보고서형 과제 안내문을 넣어주세요.")
      : (context?.interpreter?.fallbackNotice || context?.student_output?.interpreter_notice || "");
    if(notice){ notice.textContent = noticeText; notice.hidden = !noticeText; }
    const actions = $("interpretationActions");
    if(actions) actions.hidden = !!blocked;
    $("interpretationCorrection").hidden = true;
    $("categoryStep").hidden = true;
    $("bookStep").hidden = true;
    $("generateBtn").hidden = true;
    $("generateBtn").disabled = true;
    if(blocked){
      setProgress("interpretation");
      setStatus("보고서형 과제 안내문을 입력하면 다시 해석합니다.");
    }else{
      setProgress("interpretation");
      setStatus("해석 결과를 확인해 주세요.");
      populateCorrection(context);
    }
  }
  function populateCorrection(context){
    const lists = contextLists(context);
    setOptions($("correctionMethod"), uniq([...lists.methods,...METHODS]), first(lists.methods,"보고서작성형"));
    setOptions($("correctionOutput"), uniq([...lists.outputs,...OUTPUTS]), first(lists.outputs,"탐구보고서"));
    setOptions($("correctionMode"), uniq([...lists.modes,...REPORT_MODES]), first(lists.modes,"연구보고서형"));
    const catalog = global.AssessmentKeywordBridge?.getStructureCatalog?.() || {};
    const structures = Object.keys(catalog).length
      ? Object.keys(catalog).map(id => ({value:id,label:STRUCTURE_LABELS[id] || id}))
      : Object.keys(STRUCTURE_LABELS).map(id => ({value:id,label:STRUCTURE_LABELS[id]}));
    setOptions($("correctionStructure"), structures, lists.structureId);
  }
  function setConfirmed(confirmed){
    state.confirmed = !!confirmed;
    if(!confirmed){
      $("categoryStep").hidden = true;
      $("bookStep").hidden = true;
      $("generateBtn").hidden = true;
      return;
    }
    $("categoryStep").hidden = false;
    setProgress("category");
    updateBookAndGenerate();
    $("categoryStep").scrollIntoView({behavior:"smooth",block:"center"});
  }
  function determineBookSignal(context){
    const lists = contextLists(context);
    return !!context?.interpreter?.bookSignal
      || BOOK_TEXT_RE.test(text($("taskDescription")?.value))
      || lists.outputs.some(v => BOOK_TEXT_RE.test(v));
  }
  function updateBookAndGenerate(){
    const hasCategory = !!state.category;
    const context = state.finalContext || state.preview;
    state.bookSignal = determineBookSignal(context);
    const bookStep = $("bookStep");
    if(bookStep) bookStep.hidden = !(state.confirmed && hasCategory && state.bookSignal);
    const readyBook = state.bookMode !== "useBook" || !!text(state.bookTitle);
    const btn = $("generateBtn");
    if(btn){
      btn.hidden = !(state.confirmed && hasCategory);
      btn.disabled = !(state.confirmed && hasCategory && readyBook && !state.busy && !state.blocked);
    }
  }
  async function resolveContext(includeCategory){
    if(!global.AssessmentKeywordBridge) throw new Error("수행평가 해석기를 불러오지 못했습니다.");
    await global.AssessmentKeywordBridge.ready();
    return global.AssessmentKeywordBridge.resolve(buildPayload(includeCategory));
  }
  async function previewInterpretation(force=false){
    const subject = text($("subject")?.value);
    const guide = text($("taskDescription")?.value);
    syncHiddenBase();
    if(!subject || !guide){
      if(force) setStatus(!subject ? "과목을 먼저 선택해 주세요." : "수행평가 안내문이나 과제명을 입력해 주세요.");
      return;
    }
    const signature = JSON.stringify([subject,guide,state.override]);
    if(!force && signature === state.signature && state.preview) return;
    state.signature = signature;
    state.busy = true;
    setStatus("안내문을 해석하고 있습니다.", true);
    try{
      const context = await resolveContext(false);
      state.preview = context;
      state.finalContext = null;
      state.confirmed = false;
      state.category = "";
      state.categoryLabel = "";
      if($("career")) $("career").value = "";
      document.querySelectorAll("[data-category]").forEach(btn => btn.classList.remove("is-active"));
      applyContextToHidden(context);
      renderInterpretation(context);
    }catch(error){
      console.error("decision flow interpretation failed", error);
      setStatus(error.message || "안내문 해석 중 오류가 발생했습니다.");
    }finally{
      state.busy = false;
      setStatus(state.blocked ? "보고서형 과제 안내문을 입력하면 다시 해석합니다." : (state.preview ? "해석 결과를 확인해 주세요." : "다시 시도해 주세요."));
    }
  }
  async function refreshWithCategory(){
    if(!state.category || !state.confirmed) return;
    state.busy = true;
    updateBookAndGenerate();
    try{
      const context = await resolveContext(true);
      state.finalContext = context;
      state.blocked = context?.reportTarget === false || context?.blocked;
      applyContextToHidden(context);
    }catch(error){
      console.error("decision flow category refresh failed", error);
    }finally{
      state.busy = false;
      updateBookAndGenerate();
    }
  }
  function markStale(){
    clearTimeout(global.__DECISION_FLOW_PREVIEW_TIMER__);
    state.preview = null;
    state.finalContext = null;
    state.confirmed = false;
    state.blocked = false;
    state.category = "";
    state.categoryLabel = "";
    state.override = null;
    state.signature = "";
    $("interpretationCard").hidden = true;
    $("categoryStep").hidden = true;
    $("bookStep").hidden = true;
    $("generateBtn").hidden = true;
    $("generateBtn").disabled = true;
    document.querySelectorAll("[data-category]").forEach(btn => btn.classList.remove("is-active"));
    syncHiddenBase();
    setProgress("subject");
    setStatus("안내문 입력이 멈추면 자동으로 해석합니다.");
    if(text($("subject")?.value) && text($("taskDescription")?.value)){
      global.__DECISION_FLOW_PREVIEW_TIMER__ = setTimeout(() => previewInterpretation(false), 650);
    }
  }
  function resetFlow(){
    clearTimeout(global.__DECISION_FLOW_PREVIEW_TIMER__);
    Object.assign(state,{preview:null,finalContext:null,confirmed:false,blocked:false,override:null,category:"",categoryLabel:"",bookSignal:false,bookMode:"noBook",bookTitle:"",signature:"",busy:false});
    ["subject","taskDescription","career","keyword","selectedConcept","selectedBookTitle","reportMode","reportView","reportLine"].forEach(id => { if($(id)) $(id).value = ""; });
    if($("subjectGroup")) $("subjectGroup").value = "";
    if($("taskName")) $("taskName").value = "";
    if($("bookUsageMode")) $("bookUsageMode").value = "noBook";
    $("interpretationCard").hidden = true;
    $("categoryStep").hidden = true;
    $("bookStep").hidden = true;
    $("bookTitleField").hidden = true;
    $("generateBtn").hidden = true;
    $("generateBtn").disabled = true;
    document.querySelectorAll("[data-category],[data-book-mode]").forEach(btn => btn.classList.remove("is-active"));
    document.querySelector('[data-book-mode="noBook"]')?.classList.add("is-active");
    setProgress("subject");
    setStatus("과목과 안내문을 입력하면 자동으로 해석합니다.");
    $("resultSection").style.display = "none";
  }
  function install(){
    const subject = $("subject");
    const guide = $("taskDescription");
    if(!subject || !guide) return;
    subject.addEventListener("change", markStale);
    guide.addEventListener("input", markStale);
    $("interpretBtn")?.addEventListener("click", () => previewInterpretation(true));
    $("confirmInterpretationBtn")?.addEventListener("click", () => setConfirmed(true));
    $("editInterpretationBtn")?.addEventListener("click", () => { $("interpretationCorrection").hidden = false; });
    $("cancelCorrectionBtn")?.addEventListener("click", () => { state.override = null; $("interpretationCorrection").hidden = true; });
    $("applyCorrectionBtn")?.addEventListener("click", async () => {
      state.override = {
        methodAxes:[text($("correctionMethod")?.value)],
        outputAxes:[text($("correctionOutput")?.value)],
        reportModes:[text($("correctionMode")?.value)],
        structureId:text($("correctionStructure")?.value)
      };
      state.signature = "";
      await previewInterpretation(true);
    });
    document.querySelectorAll("[data-category]").forEach(btn => btn.addEventListener("click", async () => {
      state.category = text(btn.getAttribute("data-category"));
      state.categoryLabel = text(btn.getAttribute("data-label"));
      document.querySelectorAll("[data-category]").forEach(other => other.classList.toggle("is-active", other === btn));
      syncHiddenBase();
      await refreshWithCategory();
      updateBookAndGenerate();
    }));
    document.querySelectorAll("[data-book-mode]").forEach(btn => btn.addEventListener("click", () => {
      state.bookMode = text(btn.getAttribute("data-book-mode")) === "useBook" ? "useBook" : "noBook";
      document.querySelectorAll("[data-book-mode]").forEach(other => other.classList.toggle("is-active", other === btn));
      $("bookTitleField").hidden = state.bookMode !== "useBook";
      if(state.bookMode === "noBook") state.bookTitle = "";
      syncHiddenBase();
      updateBookAndGenerate();
    }));
    $("bookTitleInput")?.addEventListener("input", e => {
      state.bookTitle = text(e.target.value);
      syncHiddenBase();
      updateBookAndGenerate();
    });
    const reset = $("resetBtn");
    if(reset){
      const clean = reset.cloneNode(true);
      reset.parentNode.replaceChild(clean, reset);
      clean.addEventListener("click", resetFlow);
    }
    syncHiddenBase();
    setProgress("subject");
  }

  global.__DECISION_FLOW__ = {
    version: VERSION,
    state,
    buildPayload,
    previewInterpretation,
    refreshWithCategory,
    reset: resetFlow,
    getContext(){ return state.finalContext || state.preview; }
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})(window);
