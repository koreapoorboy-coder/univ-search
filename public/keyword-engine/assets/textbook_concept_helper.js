window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v3.0-structure-fix";

(function(){
  function $(id){ return document.getElementById(id); }
  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
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
      hardHideLegacyCareerBlock();
      setTimeout(hardHideLegacyCareerBlock, 300);
      setTimeout(hardHideLegacyCareerBlock, 1200);
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
            <h3>현재 선택</h3>
            <div class="textbook-guide">자동 반영</div>
          </div>
          <div id="textbookSelectionSummary" class="textbook-selection-summary">아직 선택하지 않았습니다.</div>
        </div>
      </div>
    `;

    const keywordLabel = keywordInput.closest("label");
    if(keywordLabel && keywordLabel.parentNode){
      keywordLabel.parentNode.insertBefore(wrap, keywordLabel);
    }else{
      keywordInput.parentNode.insertBefore(wrap, keywordInput);
    }
    keywordInput.placeholder = "위 교과 키워드를 선택하면 자동으로 입력됩니다. 직접 입력도 가능합니다.";
  }

  function bindEvents(){
    const subjectEl = $("subject");
    if(subjectEl){
      subjectEl.addEventListener("change", function(){
        syncSubjectFromSelect();
        resetBelowSubject();
        renderAll();
      });
    }

    const keywordInput = $("keyword");
    if(keywordInput){
      keywordInput.addEventListener("input", function(){
        if(keywordInput.dataset.autoFilled !== "textbook-keyword"){
          state.keyword = keywordInput.value.trim();
          state.career = "";
          syncCareerInput(false);
          renderSelectionSummary();
          renderCareerButtons();
        }
      });
    }

    const careerInput = $("career");
    if(careerInput){
      careerInput.addEventListener("input", function(){
        if(careerInput.dataset.autoFilled !== "textbook-career"){
          state.career = careerInput.value.trim();
          renderSelectionSummary();
        }
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

  function resetBelowSubject(){
    state.concept = "";
    state.keyword = "";
    state.career = "";
    syncKeywordInput();
    syncCareerInput(false);
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

    const cleaned = normalizeSubject(raw);
    const aliasMap = {
      "통합과학": "통합과학1",
      "통합과학1": "통합과학1",
      "integratedscience": "통합과학1",
      "integratedscience1": "통합과학1",
      "과학탐구실험": "과학탐구실험1",
      "과학탐구실험1": "과학탐구실험1",
      "과학탐구실험2": "과학탐구실험2",
      "scienceinquiryexperiment": "과학탐구실험1",
      "scienceinquiryexperiment1": "과학탐구실험1",
      "scienceinquiryexperiment2": "과학탐구실험2",
      "수학": "공통수학1",
      "공통수학": "공통수학1",
      "공통수학1": "공통수학1",
      "공통수학2": "공통수학2",
      "commonmath": "공통수학1",
      "commonmath1": "공통수학1",
      "commonmath2": "공통수학2",
      "정보": "정보",
      "information": "정보"
    };

    if(aliasMap[cleaned]) return aliasMap[cleaned];

    const keys = Object.keys(uiSeed);
    for(const key of keys){
      if(normalizeSubject(key) === cleaned) return key;
    }
    for(const key of keys){
      const nk = normalizeSubject(key);
      if(cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    return "";
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

    if(Array.isArray(entry.concept_buttons)){
      return entry.concept_buttons
        .map(item => item && (item.concept || item.label || item.name))
        .filter(Boolean);
    }
    if(Array.isArray(entry.concept_order)) return entry.concept_order;
    if(Array.isArray(entry.concepts)) return entry.concepts;
    if(Array.isArray(entry.items)){
      return entry.items.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    return [];
  }

  function getSubjectEntry(){
    if(!state.subject || !engineMap) return null;
    return engineMap[state.subject] || null;
  }

  function getConceptEntry(){
    const subjectEntry = getSubjectEntry();
    if(!subjectEntry || !state.concept) return null;

    if(subjectEntry.concepts && subjectEntry.concepts[state.concept]){
      return subjectEntry.concepts[state.concept];
    }
    if(subjectEntry[state.concept]){
      return subjectEntry[state.concept];
    }
    return null;
  }

  function stringArrayFrom(value){
    if(!value) return [];
    if(Array.isArray(value)){
      return value.map(item => {
        if(typeof item === "string") return item;
        if(item && typeof item === "object"){
          return item.keyword || item.topic || item.name || item.subject || item.bridge || item.label || item.concept || item.connection_point || "";
        }
        return "";
      }).filter(Boolean);
    }
    return [];
  }

  function uniq(arr){
    return [...new Set((arr || []).filter(Boolean))];
  }

  function getKeywordList(entry){
    if(!entry) return [];
    return uniq(stringArrayFrom(
      entry.micro_keywords || entry.keywords || entry.core_keywords || entry.keyword_buttons
    ));
  }

  function getCareerList(entry){
    if(!entry) return [];
    const direct = stringArrayFrom(
      entry.linked_career_bridge || entry.career_bridges || entry.careers || entry.career_keywords
    );
    const horizontal = stringArrayFrom(entry.horizontal_links);
    const vertical = stringArrayFrom(entry.vertical_links);
    return uniq([...direct, ...horizontal, ...vertical]);
  }

  function renderAll(){
    renderSubjectSummary();
    renderConceptButtons();
    renderKeywordButtons();
    renderCareerButtons();
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

  function hardHideLegacyCareerBlock(){
    const legacy = $("majorSelectorSection");
    if(legacy) legacy.remove();
    document.querySelectorAll(".major-selector-section").forEach(node => node.remove());
  }

  document.addEventListener("DOMContentLoaded", init);
})();
