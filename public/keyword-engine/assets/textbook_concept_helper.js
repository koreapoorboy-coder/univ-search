
window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v3.0-reason-readable";

(function(){
  function $(id){ return document.getElementById(id); }
  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  const UI_SEED_URL = "seed/textbook-v1/subject_concept_ui_seed.json";
  const ENGINE_MAP_URL = "seed/textbook-v1/subject_concept_engine_map.json";

  const state = { subject: "", concept: "", keyword: "", career: "" };
  let uiSeed = null;
  let engineMap = null;

  async function init(){
    try{
      const [uiRes, engineRes] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }),
        fetch(ENGINE_MAP_URL, { cache: "no-store" })
      ]);
      if(!uiRes.ok || !engineRes.ok){
        console.warn("textbook concept seed load failed", uiRes.status, engineRes.status);
        return;
      }

      uiSeed = await uiRes.json();
      engineMap = await engineRes.json();

      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      renderAll();
      safeHideLegacyCareerBlock();
      setTimeout(safeHideLegacyCareerBlock, 500);
      setTimeout(safeHideLegacyCareerBlock, 1500);
    }catch(error){
      console.warn("textbook concept helper init error:", error);
    }
  }

  function injectUI(){
    const keywordInput = $("keyword");
    if(!keywordInput || $("textbookConceptSelectorSection")) return;

    const wrap = document.createElement("section");
    wrap.id = "textbookConceptSelectorSection";
    wrap.className = "textbook-concept-section";
    wrap.innerHTML = `
      <div class="textbook-concept-card">
        <div class="textbook-concept-kicker">수업 개념부터 고르면 더 이해하기 쉽습니다</div>
        <h2 class="textbook-concept-title">과목 → 교과 개념 → 교과 키워드 → 진로 연결</h2>
        <p class="textbook-concept-desc">
          먼저 과목을 고르고, 그 안에서 수업 개념을 선택하세요.
          그다음 교과 키워드를 누르면 관련 진로/학과 연결까지 한눈에 볼 수 있습니다.
        </p>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>1. 과목 확인</h3>
            <div class="textbook-guide">현재 선택 과목 기준</div>
          </div>
          <div id="selectedSubjectSummary" class="textbook-selected-subject">먼저 과목을 선택하세요.</div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>2. 교과 개념 선택</h3>
            <div class="textbook-guide">1개 선택</div>
          </div>
          <div id="textbookConceptButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>3. 이 개념의 교과 키워드</h3>
            <div class="textbook-guide">1개 선택</div>
          </div>
          <div id="textbookKeywordButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>4. 이 키워드와 연결되는 진로/학과</h3>
            <div class="textbook-guide">선택 가능</div>
          </div>
          <div id="textbookCareerButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>5. 왜 이 키워드가 이 진로와 연결될까?</h3>
            <div class="textbook-guide">쉬운 설명</div>
          </div>
          <div id="textbookReasonBox" class="textbook-reason-box">교과 키워드와 진로를 선택하면 쉽게 풀어 설명해 줍니다.</div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>현재 선택</h3>
            <div class="textbook-guide">자동 반영</div>
          </div>
          <div id="textbookSelectionSummary" class="textbook-selection-summary">아직 선택하지 않았습니다.</div>
        </div>
      </div>
    `;

    keywordInput.parentNode.insertBefore(wrap, keywordInput);
    keywordInput.placeholder = "위 교과 키워드를 선택하면 자동으로 입력됩니다. 직접 입력도 가능합니다.";
  }

  function bindEvents(){
    const subjectEl = $("subject");
    if(subjectEl){
      subjectEl.addEventListener("change", function(){
        syncSubjectFromSelect();
        state.concept = "";
        state.keyword = "";
        state.career = "";
        syncKeywordInput();
        syncCareerInput(false);
        renderAll();
        safeHideLegacyCareerBlock();
      });
    }

    const root = $("textbookConceptSelectorSection");
    if(root){
      root.addEventListener("click", function(event){
        const btn = event.target.closest(".textbook-btn");
        if(!btn) return;

        const action = btn.dataset.action;
        const value = btn.dataset.value || "";
        event.preventDefault();

        if(action === "concept"){
          state.concept = state.concept === value ? "" : value;
          state.keyword = "";
          state.career = "";
          syncKeywordInput();
          syncCareerInput(false);
          renderAll();
          return;
        }

        if(action === "keyword"){
          state.keyword = state.keyword === value ? "" : value;
          state.career = "";
          syncKeywordInput();
          syncCareerInput(false);
          renderAll();
          return;
        }

        if(action === "career"){
          state.career = state.career === value ? "" : value;
          syncCareerInput(!!state.career);
          renderAll();
        }
      });
    }
  }

  function getSubjectRawValue(){
    const el = $("subject");
    if(!el) return "";
    const value = (el.value || "").trim();
    const text = el.options && el.selectedIndex >= 0 ? (el.options[el.selectedIndex].text || "").trim() : "";
    return value || text || "";
  }

  function syncSubjectFromSelect(){
    const raw = getSubjectRawValue();
    state.subject = findSubjectKey(raw);
  }

  function findSubjectKey(raw){
    if(!raw || !uiSeed) return "";
    const keys = Object.keys(uiSeed);
    const cleaned = normalizeSubject(raw);

    for(const key of keys){
      const nk = normalizeSubject(key);
      if(nk === cleaned) return key;
    }
    for(const key of keys){
      const nk = normalizeSubject(key);
      if(cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    const aliasMap = {
      "통합과학": "통합과학1",
      "통합과학1": "통합과학1",
      "integratedscience1": "통합과학1",
      "과학탐구실험": "과학탐구실험1",
      "과학탐구실험1": "과학탐구실험1",
      "과학탐구실험2": "과학탐구실험2",
      "scienceinquiryexperiment1": "과학탐구실험1",
      "scienceinquiryexperiment2": "과학탐구실험2",
      "수학": "공통수학1",
      "공통수학1": "공통수학1",
      "공통수학2": "공통수학2",
      "commonmath1": "공통수학1",
      "commonmath2": "공통수학2",
      "정보": "정보",
      "information": "정보"
    };
    return aliasMap[cleaned] || "";
  }

  function normalizeSubject(v){
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/]/g, "")
      .toLowerCase();
  }

  function getConceptList(subject){
    if(!subject || !uiSeed || !uiSeed[subject]) return [];
    const entry = uiSeed[subject];
    if(Array.isArray(entry.concepts)) return entry.concepts;
    if(Array.isArray(entry.concept_buttons)){
      return entry.concept_buttons.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    if(Array.isArray(entry.concept_order)) return entry.concept_order;
    if(Array.isArray(entry.items)){
      return entry.items.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    return [];
  }

  function getConceptEntry(){
    if(!state.subject || !state.concept || !engineMap || !engineMap[state.subject]) return null;
    const subjectEntry = engineMap[state.subject];
    if(subjectEntry.concepts && subjectEntry.concepts[state.concept]) return subjectEntry.concepts[state.concept];
    return subjectEntry[state.concept] || null;
  }

  function stringArrayFrom(value){
    if(!value) return [];
    if(Array.isArray(value)) {
      return value.map(item => {
        if(typeof item === "string") return item;
        if(item && typeof item === "object"){
          return item.keyword || item.topic || item.name || item.subject || item.bridge || item.label || item.concept || item.title || "";
        }
        return "";
      }).filter(Boolean);
    }
    return [];
  }

  function getKeywordList(entry){
    if(!entry) return [];
    return stringArrayFrom(entry.keywords || entry.micro_keywords || entry.core_keywords || entry.keyword_buttons);
  }

  function getCareerList(entry){
    if(!entry) return [];
    return stringArrayFrom(entry.career_bridges || entry.linked_career_bridge || entry.careers || entry.career_keywords);
  }

  function renderAll(){
    renderSubjectSummary();
    renderConceptButtons();
    renderKeywordButtons();
    renderCareerButtons();
    renderReasonBox();
    renderSelectionSummary();
  }

  function renderSubjectSummary(){
    const el = $("selectedSubjectSummary");
    if(el) el.textContent = state.subject || "먼저 과목을 선택하세요.";
  }

  function renderConceptButtons(){
    const el = $("textbookConceptButtons");
    if(!el) return;
    const concepts = getConceptList(state.subject);

    if(!state.subject){
      el.innerHTML = `<div class="textbook-empty">과목을 선택하면 교과 개념이 나옵니다.</div>`;
      return;
    }
    if(!concepts.length){
      el.innerHTML = `<div class="textbook-empty">등록된 교과 개념이 없습니다.</div>`;
      return;
    }

    el.innerHTML = concepts.map(concept => `
      <button type="button" class="textbook-btn ${state.concept === concept ? "active" : ""}"
        data-action="concept" data-value="${escapeHtml(concept)}">${escapeHtml(concept)}</button>
    `).join("");
  }

  function renderKeywordButtons(){
    const el = $("textbookKeywordButtons");
    if(!el) return;
    if(!state.subject || !state.concept){
      el.innerHTML = `<div class="textbook-empty">교과 개념을 선택하면 교과 키워드가 나옵니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);
    if(!keywords.length){
      el.innerHTML = `<div class="textbook-empty">등록된 교과 키워드가 없습니다.</div>`;
      return;
    }

    el.innerHTML = keywords.map(keyword => `
      <button type="button" class="textbook-btn ${state.keyword === keyword ? "active" : ""}"
        data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
    `).join("");
  }

  function renderCareerButtons(){
    const el = $("textbookCareerButtons");
    if(!el) return;
    if(!state.keyword){
      el.innerHTML = `<div class="textbook-empty">교과 키워드를 선택하면 관련 진로/학과 연결이 나옵니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const careers = getCareerList(entry);
    if(!careers.length){
      el.innerHTML = `<div class="textbook-empty">등록된 진로/학과 연결이 없습니다.</div>`;
      return;
    }

    el.innerHTML = careers.map(career => `
      <button type="button" class="textbook-btn ${state.career === career ? "active" : ""}"
        data-action="career" data-value="${escapeHtml(career)}">${escapeHtml(career)}</button>
    `).join("");
  }

  function renderReasonBox(){
    const el = $("textbookReasonBox");
    if(!el) return;

    if(!state.keyword){
      el.innerHTML = `<div class="textbook-empty">교과 키워드를 선택하면 이 키워드가 왜 중요한지 쉽게 설명해 줍니다.</div>`;
      return;
    }
    if(!state.career){
      el.innerHTML = `<div class="textbook-empty">진로/학과를 선택하면 “왜 연결되는지”를 학생 눈높이로 풀어 보여줍니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const reason = buildReasonData(entry, state.keyword, state.career, state.subject, state.concept);

    el.innerHTML = `
      <div class="reason-card">
        <div class="reason-topline">${escapeHtml(reason.badge)}</div>
        <h4 class="reason-title">${escapeHtml(reason.title)}</h4>
        <p class="reason-lead">${escapeHtml(reason.lead)}</p>

        <div class="reason-grid">
          <div class="reason-mini-card">
            <div class="reason-mini-label">왜 연결돼?</div>
            <p>${escapeHtml(reason.why)}</p>
          </div>
          <div class="reason-mini-card">
            <div class="reason-mini-label">학교 공부에서는?</div>
            <p>${escapeHtml(reason.school)}</p>
          </div>
          <div class="reason-mini-card">
            <div class="reason-mini-label">진로에서는?</div>
            <p>${escapeHtml(reason.careerUse)}</p>
          </div>
        </div>

        <div class="reason-example">
          <div class="reason-mini-label">이렇게 이해하면 쉬워요</div>
          <p>${escapeHtml(reason.example)}</p>
        </div>
      </div>
    `;
  }

  function renderSelectionSummary(){
    const el = $("textbookSelectionSummary");
    if(!el) return;
    const parts = [state.subject, state.concept, state.keyword, state.career].filter(Boolean);
    el.innerHTML = parts.length
      ? parts.map(part => `<span class="textbook-chip">${escapeHtml(part)}</span>`).join("")
      : "아직 선택하지 않았습니다.";
  }

  function syncKeywordInput(){
    const keywordInput = $("keyword");
    if(!keywordInput) return;
    if(state.keyword){
      keywordInput.value = state.keyword;
      keywordInput.dataset.autoFilled = "textbook-keyword";
    } else if(keywordInput.dataset.autoFilled === "textbook-keyword"){
      keywordInput.value = "";
      keywordInput.dataset.autoFilled = "";
    }
  }

  function syncCareerInput(shouldFill){
    const careerInput = $("career");
    if(!careerInput) return;
    if(shouldFill && state.career){
      careerInput.value = state.career;
      careerInput.dataset.autoFilled = "textbook-career";
    } else if(careerInput.dataset.autoFilled === "textbook-career"){
      careerInput.value = "";
      careerInput.dataset.autoFilled = "";
    }
  }

  function buildReasonData(entry, keyword, career, subject, concept){
    const bridges = stringArrayFrom(entry && (entry.linked_career_bridge || entry.career_bridges)).slice(0, 3);
    const horizontal = Array.isArray(entry && entry.horizontal_links) ? entry.horizontal_links : [];
    const vertical = Array.isArray(entry && entry.vertical_links) ? entry.vertical_links : [];

    const bridgeText = bridges.length
      ? bridges.map(makeBridgePhrase).join(", ")
      : "관찰하고 해석하는 힘";

    const horizontalText = horizontal.length
      ? `${horizontal[0].subject || "다른 교과"}에서 ${(horizontal[0].concept || "관련 개념")}을 다룰 때 함께 이어져요.`
      : `${subject} 수업에서 배운 내용을 실제 사례에 연결해 보는 출발점이 됩니다.`;

    const verticalText = vertical.length
      ? `${vertical[0].subject || "다음 단계 학습"}처럼 더 전문적인 내용으로 이어질 수 있어요.`
      : `${career}처럼 실제 분야로 확장해 볼 수 있는 기초 개념이에요.`;

    return {
      badge: `${subject} · ${concept}`,
      title: `${keyword}이(가) ${career}와 연결되는 이유`,
      lead: `${keyword}은(는) 단순한 단어가 아니라, ${career}에서 자주 쓰는 생각 방식과 연결되는 교과 키워드예요.`,
      why: `${career}에서는 ${bridgeText}이 중요해요. 그래서 ${keyword}을(를) 이해하면 해당 분야의 문제를 더 정확하게 보고 설명할 수 있어요.`,
      school: `${concept} 단원에서 ${keyword}을(를) 배우는 이유는 개념을 외우는 데서 끝나는 게 아니라, 실제 현상을 설명하는 기준으로 쓰기 위해서예요. ${horizontalText}`,
      careerUse: `${career}에서는 ${keyword}과(와) 비슷한 원리로 자료를 해석하거나 변화를 관찰하고, 결과를 설명하는 일이 많아요. ${verticalText}`,
      example: buildExample(keyword, career)
    };
  }

  function makeBridgePhrase(bridge){
    const map = {
      "정밀 측정":"정확하게 재고 오차를 줄이는 능력",
      "위치 추적":"어디에 있고 어떻게 움직이는지 파악하는 능력",
      "과학 데이터 해석":"숫자와 변화를 읽어 의미를 찾는 능력",
      "생체 데이터":"몸에서 나오는 정보를 읽고 해석하는 능력",
      "건강 측정":"몸 상태를 수치로 확인하는 능력",
      "항상성 분석":"몸이 균형을 유지하는 과정을 보는 능력",
      "생명과학 탐구":"생명 현상을 관찰하고 이유를 설명하는 능력",
      "공통수학1":"수치와 관계를 식으로 정리하는 능력",
      "정보":"자료를 구조화하고 처리하는 능력",
      "물리학":"현상을 측정하고 원리로 설명하는 능력",
      "지구과학":"자연 현상을 관찰하고 위치·변화를 해석하는 능력"
    };
    return map[bridge] || `${bridge}과 관련된 이해`;
  }

  function buildExample(keyword, career){
    const pair = `${keyword}|${career}`;
    const specific = {
      "정밀 측정|물리학":"예를 들어 실험에서 길이·시간·속도를 정확히 재야 결과를 믿을 수 있듯, 물리학은 ‘정확하게 재는 힘’이 핵심이에요.",
      "위치 추적|지구과학":"예를 들어 지진 위치나 태풍 이동 경로를 파악할 때처럼, 지구과학은 ‘어디서 어떤 변화가 일어나는지’ 추적하는 힘이 중요해요.",
      "위치 추적|정보":"예를 들어 GPS나 지도 앱이 현재 위치를 계산하듯, 정보 분야는 위치 데이터를 처리하고 활용하는 일이 많아요.",
      "자극 반응|생명과학 탐구":"예를 들어 생물이 빛, 소리, 온도 변화에 어떻게 반응하는지 살펴보면 생명 현상을 탐구하는 기본 질문이 만들어져요.",
      "나트륨 이온|생명과학 탐구":"예를 들어 신경세포가 신호를 전달할 때 나트륨 이온의 이동이 중요하듯, 생명과학은 몸속 변화의 원리를 이런 개념으로 설명해요."
    };
    if(specific[pair]) return specific[pair];
    return `예를 들어 ${career}에서는 ${keyword}과(와) 연결된 원리로 현상을 설명하거나 자료를 해석하는 상황을 자주 만나게 돼요. 그래서 이 키워드를 알면 “왜 그런가?”를 더 잘 설명할 수 있어요.`;
  }

  function safeHideLegacyCareerBlock(){
    try{
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4"));
      const target = headings.find(h => (h.textContent || "").includes("진로 → 학과 → 추천 키워드 선택"));
      if(!target) return;

      let block = target.closest("section, .card, .result-card, .side-card, .student-card, .analysis-card");
      if(!block) block = target.parentElement;
      if(!block || block.id === "textbookConceptSelectorSection") return;
      block.style.display = "none";
    }catch(error){
      console.warn("safeHideLegacyCareerBlock error:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
