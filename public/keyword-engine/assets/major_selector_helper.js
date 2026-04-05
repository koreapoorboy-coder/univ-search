
window.__MAJOR_SELECTOR_HELPER_VERSION = "v31-career-major-keyword-click-fix";

(function(){
  const CAREER_SEED_URL = "seed/major-keyword-v30/career_selector_seed.json";
  const MAJOR_RESTRUCTURED_URL = "seed/major-keyword-v30/major_keyword_restructured.json";

  const state = {
    careerGroup: "",
    major: "",
    selectedKeywords: []
  };

  let careerSeed = null;
  let majorData = null;

  function $(id){ return document.getElementById(id); }
  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function uniq(arr){ return [...new Set((arr || []).filter(Boolean))]; }

  async function init(){
    try{
      const [careerRes, majorRes] = await Promise.all([
        fetch(CAREER_SEED_URL, { cache: "no-store" }),
        fetch(MAJOR_RESTRUCTURED_URL, { cache: "no-store" })
      ]);

      if(!careerRes.ok || !majorRes.ok){
        console.warn("major selector seed load failed", careerRes.status, majorRes.status);
        return;
      }

      careerSeed = await careerRes.json();
      majorData = await majorRes.json();

      injectSelectorUI();
      bindDelegatedClicks();
      bindGenerateGuard();
      renderAll();
    }catch(error){
      console.warn("major selector init error:", error);
    }
  }

  function injectSelectorUI(){
    const keywordInput = $("keyword");
    if(!keywordInput) return;
    if ($("majorSelectorSection")) return;

    const wrap = document.createElement("section");
    wrap.id = "majorSelectorSection";
    wrap.className = "major-selector-section";
    wrap.innerHTML = `
      <div class="major-selector-card">
        <div class="major-selector-kicker">키워드를 몰라도 선택할 수 있게 바꿨습니다</div>
        <h2 class="major-selector-title">진로 → 학과 → 추천 키워드 선택</h2>
        <p class="major-selector-desc">
          학생이 직접 키워드를 입력하지 않아도 됩니다.
          먼저 진로/계열을 고르고, 그다음 학과와 추천 키워드를 선택하면 됩니다.
        </p>

        <div class="selector-block">
          <div class="selector-head">
            <h3>1. 진로/계열 선택</h3>
            <div class="selector-guide">1개 선택</div>
          </div>
          <div id="careerGroupButtons" class="selector-buttons"></div>
        </div>

        <div class="selector-block">
          <div class="selector-head">
            <h3>2. 학과 선택</h3>
            <div class="selector-guide">1개 선택</div>
          </div>
          <div id="majorButtons" class="selector-buttons"></div>
        </div>

        <div class="selector-block">
          <div class="selector-head">
            <h3>3. 추천 키워드 선택</h3>
            <div class="selector-guide">최대 3개 선택</div>
          </div>
          <div id="recommendedKeywordButtons" class="selector-buttons"></div>
        </div>

        <div id="clusterKeywordArea" class="selector-cluster-wrap"></div>

        <div class="selected-keyword-box">
          <div class="selected-keyword-label">현재 선택된 키워드</div>
          <div id="selectedKeywordSummary" class="selected-keyword-summary">아직 선택하지 않았습니다.</div>
          <div class="selected-keyword-help">
            선택된 키워드는 아래 기존 키워드 입력칸에도 자동 반영됩니다.
          </div>
        </div>
      </div>
    `;

    keywordInput.parentNode.insertBefore(wrap, keywordInput);
    keywordInput.placeholder = "위 추천 키워드를 선택하면 자동으로 입력됩니다. 직접 입력도 가능합니다.";
  }

  function bindDelegatedClicks(){
    const root = $("majorSelectorSection");
    if(!root) return;

    root.addEventListener("click", function(event){
      const btn = event.target.closest(".selector-btn");
      if(!btn) return;

      const action = btn.dataset.action;
      const value = btn.dataset.value || "";
      if(!action) return;

      event.preventDefault();

      if(action === "career"){
        pickCareerGroup(value);
        return;
      }
      if(action === "major"){
        pickMajor(value);
        return;
      }
      if(action === "keyword"){
        toggleKeyword(value);
        return;
      }
    });
  }

  function renderAll(){
    renderCareerGroups();
    renderMajors();
    renderRecommendedKeywords();
    renderClusterKeywords();
    renderSelectedSummary();
    syncKeywordInput();
  }

  function renderCareerGroups(){
    const el = $("careerGroupButtons");
    if(!el || !careerSeed) return;

    const groups = Object.keys(careerSeed);
    el.innerHTML = groups.map(group => buttonHtml({
      label: group,
      active: state.careerGroup === group,
      action: "career",
      value: group
    })).join("");
  }

  function renderMajors(){
    const el = $("majorButtons");
    if(!el || !careerSeed) return;

    if(!state.careerGroup || !careerSeed[state.careerGroup]){
      el.innerHTML = `<div class="selector-empty">먼저 진로/계열을 선택하세요.</div>`;
      return;
    }

    const majors = Object.keys(careerSeed[state.careerGroup].majors || {});
    el.innerHTML = majors.map(major => buttonHtml({
      label: major,
      active: state.major === major,
      action: "major",
      value: major
    })).join("");
  }

  function renderRecommendedKeywords(){
    const el = $("recommendedKeywordButtons");
    if(!el || !careerSeed) return;

    if(!state.major || !state.careerGroup){
      el.innerHTML = `<div class="selector-empty">학과를 선택하면 추천 키워드가 나옵니다.</div>`;
      return;
    }

    const payload = careerSeed[state.careerGroup]?.majors?.[state.major];
    const keywords = payload?.recommended_keywords || [];

    if(!keywords.length){
      el.innerHTML = `<div class="selector-empty">추천 키워드가 없습니다.</div>`;
      return;
    }

    el.innerHTML = keywords.map(keyword => buttonHtml({
      label: keyword,
      active: state.selectedKeywords.includes(keyword),
      action: "keyword",
      value: keyword
    })).join("");
  }

  function renderClusterKeywords(){
    const el = $("clusterKeywordArea");
    if(!el || !majorData) return;

    if(!state.major || !majorData[state.major]){
      el.innerHTML = "";
      return;
    }

    const clusters = majorData[state.major].clusters || [];
    const topClusters = clusters
      .filter(cluster => cluster.keywords && cluster.keywords.length)
      .slice(0, 4);

    if(!topClusters.length){
      el.innerHTML = "";
      return;
    }

    el.innerHTML = `
      <div class="selector-block">
        <div class="selector-head">
          <h3>4. 더 세분화된 키워드 보기</h3>
          <div class="selector-guide">필요하면 추가 선택</div>
        </div>
        <div class="selector-cluster-grid">
          ${topClusters.map(cluster => `
            <div class="selector-cluster-card">
              <div class="selector-cluster-title">${escapeHtml(cluster.cluster_label)}</div>
              <div class="selector-buttons">
                ${(cluster.keywords || []).slice(0, 10).map(keyword => buttonHtml({
                  label: keyword,
                  active: state.selectedKeywords.includes(keyword),
                  action: "keyword",
                  value: keyword
                })).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderSelectedSummary(){
    const el = $("selectedKeywordSummary");
    if(!el) return;

    if(!state.selectedKeywords.length){
      el.textContent = "아직 선택하지 않았습니다.";
      return;
    }

    el.innerHTML = state.selectedKeywords.map(keyword =>
      `<span class="selected-chip">${escapeHtml(keyword)}</span>`
    ).join("");
  }

  function syncKeywordInput(){
    const input = $("keyword");
    if(!input) return;

    if(state.selectedKeywords.length){
      input.value = state.selectedKeywords.join(" + ");
      input.dataset.autoFilled = "true";
    } else if (input.dataset.autoFilled === "true") {
      input.value = "";
      input.dataset.autoFilled = "false";
    }
  }

  function buttonHtml({label, active, action, value}){
    return `
      <button
        type="button"
        class="selector-btn ${active ? "active" : ""}"
        data-action="${escapeHtml(action)}"
        data-value="${escapeHtml(value)}"
      >
        ${escapeHtml(label)}
      </button>
    `;
  }

  function pickCareerGroup(group){
    state.careerGroup = state.careerGroup === group ? "" : group;
    state.major = "";
    state.selectedKeywords = [];
    renderAll();
  }

  function pickMajor(major){
    state.major = state.major === major ? "" : major;
    state.selectedKeywords = [];
    renderAll();

    const careerInput = $("career");
    if(careerInput && state.major){
      careerInput.value = state.major;
    }
  }

  function toggleKeyword(keyword){
    const exists = state.selectedKeywords.includes(keyword);
    if(exists){
      state.selectedKeywords = state.selectedKeywords.filter(item => item !== keyword);
    }else{
      if(state.selectedKeywords.length >= 3) return;
      state.selectedKeywords = uniq([...state.selectedKeywords, keyword]);
    }
    renderAll();
  }

  function bindGenerateGuard(){
    const btn = $("generateBtn");
    if(!btn) return;

    btn.addEventListener("click", function(){
      const keywordInput = $("keyword");
      const careerInput = $("career");

      if(careerInput && !String(careerInput.value || "").trim() && state.major){
        careerInput.value = state.major;
      }

      if(keywordInput && !String(keywordInput.value || "").trim() && state.selectedKeywords.length){
        keywordInput.value = state.selectedKeywords.join(" + ");
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
