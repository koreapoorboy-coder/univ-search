
window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v1.1-safe-addon";

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

  const state = { subject: "", concept: "", topic: "" };
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
        <h2 class="textbook-concept-title">과목 → 교과 개념 → 관련 주제 선택</h2>
        <p class="textbook-concept-desc">
          어려운 키워드 대신 수업에서 배운 개념부터 고르면 됩니다.
          과목을 선택하고, 교과 개념과 관련 주제를 누르면 키워드 입력칸에도 자동 반영됩니다.
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
            <h3>3. 이 개념으로 할 수 있는 주제</h3>
            <div class="textbook-guide">1개 선택</div>
          </div>
          <div id="textbookTopicButtons" class="textbook-buttons"></div>
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
    keywordInput.placeholder = "위 교과 개념/주제를 선택하면 자동으로 입력됩니다. 직접 입력도 가능합니다.";
  }

  function bindEvents(){
    const subjectEl = $("subject");
    if(subjectEl){
      subjectEl.addEventListener("change", function(){
        syncSubjectFromSelect();
        state.concept = "";
        state.topic = "";
        syncKeywordInput();
        renderAll();
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
          state.topic = "";
          renderAll();
          return;
        }
        if(action === "topic"){
          state.topic = state.topic === value ? "" : value;
          renderAll();
          syncKeywordInput();
        }
      });
    }
  }

  function syncSubjectFromSelect(){
    const raw = $("subject")?.value?.trim() || "";
    state.subject = findSubjectKey(raw);
  }

  function findSubjectKey(raw){
    if(!raw || !uiSeed) return "";
    const keys = Object.keys(uiSeed);
    const normalized = raw.replace(/\s+/g, "").toLowerCase();

    for(const key of keys){
      const nk = key.replace(/\s+/g, "").toLowerCase();
      if(nk === normalized || normalized.includes(nk) || nk.includes(normalized)) return key;
    }

    const aliasMap = {
      "통합과학": "통합과학1",
      "통합과학1": "통합과학1",
      "과학탐구실험1": "과학탐구실험1",
      "과학탐구실험2": "과학탐구실험2",
      "공통수학1": "공통수학1",
      "공통수학2": "공통수학2",
      "정보": "정보"
    };
    return aliasMap[raw] || "";
  }

  function getConceptList(subject){
    if(!subject || !uiSeed || !uiSeed[subject]) return [];
    const entry = uiSeed[subject];

    if(Array.isArray(entry.concepts)) return entry.concepts;

    if(Array.isArray(entry.concept_buttons)){
      return entry.concept_buttons
        .map(item => item && item.concept)
        .filter(Boolean);
    }

    if(Array.isArray(entry.concept_order)) return entry.concept_order;

    return [];
  }

  function renderAll(){
    renderSubjectSummary();
    renderConceptButtons();
    renderTopicButtons();
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
      <button
        type="button"
        class="textbook-btn ${state.concept === concept ? "active" : ""}"
        data-action="concept"
        data-value="${escapeHtml(concept)}"
      >${escapeHtml(concept)}</button>
    `).join("");
  }

  function renderTopicButtons(){
    const el = $("textbookTopicButtons");
    if(!el) return;

    if(!state.subject || !state.concept || !engineMap || !engineMap[state.subject] || !engineMap[state.subject][state.concept]){
      el.innerHTML = `<div class="textbook-empty">교과 개념을 선택하면 관련 주제가 나옵니다.</div>`;
      return;
    }

    const topics = engineMap[state.subject][state.concept].topics || [];
    if(!topics.length){
      el.innerHTML = `<div class="textbook-empty">등록된 관련 주제가 없습니다.</div>`;
      return;
    }

    el.innerHTML = topics.map(topic => `
      <button
        type="button"
        class="textbook-btn ${state.topic === topic ? "active" : ""}"
        data-action="topic"
        data-value="${escapeHtml(topic)}"
      >${escapeHtml(topic)}</button>
    `).join("");
  }

  function renderSelectionSummary(){
    const el = $("textbookSelectionSummary");
    if(!el) return;
    const parts = [state.subject, state.concept, state.topic].filter(Boolean);
    el.innerHTML = parts.length
      ? parts.map(part => `<span class="textbook-chip">${escapeHtml(part)}</span>`).join("")
      : "아직 선택하지 않았습니다.";
  }

  function syncKeywordInput(){
    const keywordInput = $("keyword");
    if(!keywordInput) return;
    if(state.topic){
      keywordInput.value = state.topic;
      keywordInput.dataset.autoFilled = "textbook-topic";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
