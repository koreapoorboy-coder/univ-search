(function(global){
  "use strict";

  const VERSION = "subject-support-notice-v1.1.0";
  const STORAGE_KEY = "ke.subjectSelectionLogs.v1";
  const NOTICE_TEXT = "현재 과학·수학·정보 과목을 지원합니다.\n국어·영어 수행평가는 준비 중입니다.";
  const PENDING_LANGUAGE = new Set(["공통국어1", "공통국어2", "영어"]);
  const PENDING_NO_SEED = new Set(["한국사"]);
  const THIN_SEED = new Set(["공통수학1", "공통수학2", "지구과학"]);
  const HELD = new Set([...PENDING_LANGUAGE, ...PENDING_NO_SEED, ...THIN_SEED]);
  const EXPECTED_COUNTS = {
    "공통국어1": 0,
    "공통국어2": 0,
    "영어": 0,
    "한국사": 0,
    "공통수학1": 1,
    "공통수학2": 1,
    "지구과학": 14
  };

  global.__SUBJECT_SUPPORT_NOTICE_VERSION__ = VERSION;

  function $(id){ return document.getElementById(id); }
  function text(value){ return String(value == null ? "" : value).trim(); }
  function canonical(subject){
    const fn = global.__SUBJECT_ALIAS__?.toCanonicalSubject;
    return typeof fn === "function" ? fn(subject) : text(subject);
  }
  function createSessionId(){
    try{
      const key = "ke.subjectSelectionSession.v1";
      let id = sessionStorage.getItem(key);
      if(!id){
        id = `subject_session_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
        sessionStorage.setItem(key, id);
      }
      return id;
    }catch(error){
      return `subject_session_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
    }
  }
  function statusOf(subject){
    if(PENDING_LANGUAGE.has(subject)) return "pending_language_seed";
    if(PENDING_NO_SEED.has(subject)) return "pending_no_seed";
    if(THIN_SEED.has(subject)) return "thin_seed_pool";
    return "supported";
  }
  function ensureNotice(){
    let notice = $("subjectSupportNotice");
    if(notice) return notice;
    const select = $("subject");
    const label = select?.closest("label");
    if(!select || !label) return null;
    notice = document.createElement("div");
    notice.id = "subjectSupportNotice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.style.display = "none";
    notice.style.marginTop = "8px";
    notice.style.padding = "10px 12px";
    notice.style.borderRadius = "10px";
    notice.style.background = "#fff8e8";
    notice.style.border = "1px solid #ead59a";
    notice.style.fontSize = "0.9rem";
    notice.style.lineHeight = "1.5";
    notice.style.whiteSpace = "pre-line";
    label.appendChild(notice);
    return notice;
  }
  function renderNotice(subject){
    const notice = ensureNotice();
    if(!notice) return;
    if(!HELD.has(subject)){
      notice.textContent = "";
      notice.style.display = "none";
      return;
    }
    const baseNotice = PENDING_NO_SEED.has(subject)
      ? "현재 과학·수학·정보 과목을 지원합니다.\n한국사 수행평가는 준비 중입니다."
      : NOTICE_TEXT;
    const detail = THIN_SEED.has(subject)
      ? "\n선택한 세부 과목의 전용 시드는 현재 확충 중이며, 보유 시드 범위에서 결과를 제공합니다."
      : "";
    notice.textContent = baseNotice + detail;
    notice.style.display = "block";
  }
  function appendLocalLog(event){
    try{
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const list = Array.isArray(current) ? current : [];
      list.push(event);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-500)));
    }catch(error){
      console.warn("subject selection local log failed:", error);
    }
  }
  function remoteLog(event){
    const endpoint = global.__SUBJECT_SELECTION_LOG_ENDPOINT__
      || `${global.__KEYWORD_ENGINE_WORKER_BASE_URL || "https://curly-base-a1a9.koreapoorboy.workers.dev"}/collect`;
    const payload = {
      event_type: "subject_selection",
      collected_at: event.selectedAt,
      session_id: event.sessionId,
      school_name: text($("schoolName")?.value),
      grade: text($("grade")?.value),
      subject_group: event.subjectGroup,
      subject: event.uiSubject,
      canonical_subject: event.canonicalSubject,
      subject_support_status: event.supportStatus,
      expected_seed_count: event.expectedSeedCount,
      source: event.source,
      student_input: {
        session_id: event.sessionId,
        school_name: text($("schoolName")?.value),
        grade: text($("grade")?.value),
        subject: event.uiSubject,
        canonical_subject: event.canonicalSubject,
        subject_group: event.subjectGroup,
        event_type: "subject_selection"
      }
    };
    try{
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(error => console.warn("subject selection remote log failed:", error));
    }catch(error){
      console.warn("subject selection remote log failed:", error);
    }
  }

  let lastSignature = "";
  let lastAt = 0;
  function captureSelection(source){
    const uiSubject = text($("subject")?.value);
    if(!uiSubject) return;
    const subjectGroup = text($("subjectGroup")?.value);
    const signature = `${subjectGroup}|${uiSubject}`;
    const now = Date.now();
    if(signature === lastSignature && now - lastAt < 1200) return;
    lastSignature = signature;
    lastAt = now;

    const event = {
      version: VERSION,
      selectedAt: new Date(now).toISOString(),
      sessionId: createSessionId(),
      subjectGroup,
      uiSubject,
      canonicalSubject: canonical(uiSubject),
      supportStatus: statusOf(uiSubject),
      expectedSeedCount: Object.prototype.hasOwnProperty.call(EXPECTED_COUNTS, uiSubject) ? EXPECTED_COUNTS[uiSubject] : null,
      source: source || "subject_dropdown_change"
    };
    appendLocalLog(event);
    remoteLog(event);
    try{
      global.dispatchEvent(new CustomEvent("keyword-engine:subject-selection", { detail: event }));
    }catch(error){}
    global.__LAST_SUBJECT_SELECTION_EVENT__ = event;
  }

  function sync(source){
    const subject = text($("subject")?.value);
    renderNotice(subject);
    if(subject) captureSelection(source);
  }
  function install(){
    const select = $("subject");
    if(!select) return false;
    ensureNotice();
    if(select.dataset.subjectSupportNoticeInstalled !== "1"){
      select.addEventListener("change", () => sync("subject_dropdown_change"));
      select.dataset.subjectSupportNoticeInstalled = "1";
    }
    sync("subject_notice_initial_sync");
    return true;
  }

  global.__SUBJECT_SUPPORT__ = {
    version: VERSION,
    heldSubjects: Array.from(HELD),
    pendingLanguageSubjects: Array.from(PENDING_LANGUAGE),
    thinSeedSubjects: Array.from(THIN_SEED),
    noticeText: NOTICE_TEXT,
    readLocalLogs(){
      try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
      catch(error){ return []; }
    },
    captureSelection
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
  global.addEventListener("load", install);
  setTimeout(install, 150);
  setTimeout(install, 700);
})(window);
