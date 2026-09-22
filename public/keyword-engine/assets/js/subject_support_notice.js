(function(global){
  "use strict";

  const VERSION = "subject-support-notice-v1.3.0";
  const STORAGE_KEY = "ke.subjectSelectionLogs.v1";
  const THIN_SEED_NOTICE = "이 과목의 전용 참고 사례는 현재 확충 중입니다.\n보유 범위에서 결과를 제공하지만, 다른 과목보다 주제 다양성이 낮을 수 있습니다.";
  // 국어(공통국어1·2)는 **고를 수 없다.** 예전에는 목록에 두고 「준비 중입니다」라고만 적었는데,
  // 학생은 그래도 고를 수 있었고 보고서도 나왔다 — 그런데 그 보고서가 과제와 달랐다
  // (운영 검사 2026-09-22: 「도서를 읽고 서평」 과제에 「AI 저작권 칼럼 논증 비교」가 나왔다).
  // 안 파는 것은 보여 주지 않는다. 목록에서 뺐다(index.html).
  // 런타임 후보 30건 미만 과목. 기능은 정상 동작하며 안내만 표시한다.
  const THIN_SEED = new Set([
    "공통수학1", "공통수학2", "지구과학",
    "통합사회1", "통합사회2", "지구시스템과학",
    // 영어·한국사는 2026-09-20 에 단원 사전과 논문 묶음을 넣어 보고서가 만들어진다. 다만 이 과목 전용
    // 런타임 후보(assessment_seed_cross_axis)는 아직 0건이라 「확충 중」 안내를 보여 준다 — 「준비 중」이
    // 아니다. 되는 과목을 안 된다고 적어 두면 학생이 그냥 나간다.
    "영어", "한국사"
  ]);
  const HELD = new Set([...THIN_SEED]);
  const EXPECTED_COUNTS = {
    "영어": 0,
    "한국사": 0,
    "공통수학1": 1,
    "공통수학2": 1,
    "지구과학": 14,
    "통합사회2": 20,
    "통합사회1": 21,
    "지구시스템과학": 25
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
    notice.textContent = THIN_SEED_NOTICE;
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
    thinSeedSubjects: Array.from(THIN_SEED),
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
