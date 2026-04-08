
window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v4.0-book-flow-fixed";

(function () {
  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const UI_SEED_URL = "seed/textbook-v1/subject_concept_ui_seed.json";
  const ENGINE_MAP_URL = "seed/textbook-v1/subject_concept_engine_map.json";

  const state = {
    subject: "",
    concept: "",
    keyword: "",
    career: ""
  };

  let uiSeed = null;
  let engineMap = null;

  async function init() {
    try {
      const [uiRes, engineRes] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }),
        fetch(ENGINE_MAP_URL, { cache: "no-store" })
      ]);

      if (!uiRes.ok || !engineRes.ok) {
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
      setTimeout(safeHideLegacyCareerBlock, 400);
      setTimeout(safeHideLegacyCareerBlock, 1200);
    } catch (error) {
      console.warn("textbook concept helper init error:", error);
    }
  }

  function injectUI() {
    const keywordInput = $("keyword");
    if (!keywordInput || $("textbookConceptSelectorSection")) return;

    const wrap = document.createElement("section");
    wrap.id = "textbookConceptSelectorSection";
    wrap.className = "textbook-concept-section";
    wrap.innerHTML = `
      <div class="textbook-concept-card">
        <div class="textbook-concept-kicker">수업 개념에서 탐구 제목까지 바로 연결합니다</div>
        <h2 class="textbook-concept-title">과목 → 교과 개념 → 교과 키워드 → 탐구 방향 → 도서 기반 제목 생성</h2>
        <p class="textbook-concept-desc">
          먼저 과목과 개념을 고르고, 교과 키워드와 탐구 방향을 선택하세요.
          그다음 5번에서 도서를 바탕으로 탐구 보고서 제목이 자동 완성됩니다.
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
            <h3>4. 어떤 탐구 방향으로 확장할까?</h3>
            <div class="textbook-guide">탐구 방향 선택</div>
          </div>
          <div id="textbookCareerButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>5. 도서에서 시작하는 탐구 퍼즐</h3>
            <div class="textbook-guide">제목 자동 완성</div>
          </div>
          <div id="textbookReasonBox" class="textbook-reason-box">
            교과 키워드와 탐구 방향을 먼저 고르면, 아래에서 도서와 질문을 선택해 탐구 보고서 제목을 완성할 수 있습니다.
          </div>
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

  function bindEvents() {
    const subjectEl = $("subject");
    if (subjectEl) {
      subjectEl.addEventListener("change", function () {
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
    if (root) {
      root.addEventListener("click", function (event) {
        const btn = event.target.closest(".textbook-btn");
        if (!btn) return;

        const action = btn.dataset.action;
        const value = btn.dataset.value || "";
        event.preventDefault();

        if (action === "concept") {
          state.concept = state.concept === value ? "" : value;
          state.keyword = "";
          state.career = "";
          syncKeywordInput();
          syncCareerInput(false);
          renderAll();
          return;
        }

        if (action === "keyword") {
          state.keyword = state.keyword === value ? "" : value;
          state.career = "";
          syncKeywordInput();
          syncCareerInput(false);
          renderAll();
          return;
        }

        if (action === "career") {
          state.career = state.career === value ? "" : value;
          syncCareerInput(!!state.career);
          renderAll();
        }
      });
    }
  }

  function getSubjectRawValue() {
    const el = $("subject");
    if (!el) return "";
    const value = (el.value || "").trim();
    const text = el.options && el.selectedIndex >= 0 ? (el.options[el.selectedIndex].text || "").trim() : "";
    return value || text || "";
  }

  function syncSubjectFromSelect() {
    const raw = getSubjectRawValue();
    state.subject = findSubjectKey(raw);
  }

  function findSubjectKey(raw) {
    if (!raw || !uiSeed) return "";
    const keys = Object.keys(uiSeed);
    const cleaned = normalizeSubject(raw);

    for (const key of keys) {
      if (normalizeSubject(key) === cleaned) return key;
    }
    for (const key of keys) {
      const nk = normalizeSubject(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    const aliasMap = {
      "통합과학": "통합과학1",
      "통합과학1": "통합과학1",
      "과학탐구실험": "과학탐구실험1",
      "과학탐구실험1": "과학탐구실험1",
      "과학탐구실험2": "과학탐구실험2",
      "공통수학1": "공통수학1",
      "공통수학2": "공통수학2",
      "수학": "공통수학1",
      "정보": "정보",
      "화학": "화학",
      "생명과학": "생명과학",
      "물리학": "물리학",
      "통합사회": "통합사회",
      "공통국어": "공통국어",
      "공통영어": "공통영어"
    };
    return aliasMap[cleaned] || "";
  }

  function normalizeSubject(v) {
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/]/g, "")
      .toLowerCase();
  }

  function getConceptList(subject) {
    if (!subject || !uiSeed || !uiSeed[subject]) return [];
    const entry = uiSeed[subject];
    if (Array.isArray(entry.concepts)) return entry.concepts;
    if (Array.isArray(entry.concept_buttons)) {
      return entry.concept_buttons.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    if (Array.isArray(entry.concept_order)) return entry.concept_order;
    if (Array.isArray(entry.items)) {
      return entry.items.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    return [];
  }

  function getConceptEntry() {
    if (!state.subject || !state.concept || !engineMap || !engineMap[state.subject]) return null;
    const subjectEntry = engineMap[state.subject];
    if (subjectEntry.concepts && subjectEntry.concepts[state.concept]) return subjectEntry.concepts[state.concept];
    return subjectEntry[state.concept] || null;
  }

  function stringArrayFrom(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.keyword || item.topic || item.name || item.subject || item.bridge || item.label || item.concept || item.title || "";
        }
        return "";
      }).filter(Boolean);
    }
    return [];
  }

  function unique(arr) {
    return [...new Set((arr || []).filter(Boolean))];
  }

  function getKeywordList(entry) {
    if (!entry) return [];
    return stringArrayFrom(entry.keywords || entry.micro_keywords || entry.core_keywords || entry.keyword_buttons);
  }

  function getCareerList(entry) {
    if (!entry) return [];
    return stringArrayFrom(entry.career_bridges || entry.linked_career_bridge || entry.careers || entry.career_keywords);
  }

  function renderAll() {
    renderSubjectSummary();
    renderConceptButtons();
    renderKeywordButtons();
    renderCareerButtons();
    renderReasonBox();
    renderSelectionSummary();
  }

  function renderSubjectSummary() {
    const el = $("selectedSubjectSummary");
    if (el) el.textContent = state.subject || "먼저 과목을 선택하세요.";
  }

  function renderConceptButtons() {
    const el = $("textbookConceptButtons");
    if (!el) return;
    const concepts = getConceptList(state.subject);

    if (!state.subject) {
      el.innerHTML = `<div class="textbook-empty">과목을 선택하면 교과 개념이 나옵니다.</div>`;
      return;
    }
    if (!concepts.length) {
      el.innerHTML = `<div class="textbook-empty">등록된 교과 개념이 없습니다.</div>`;
      return;
    }

    el.innerHTML = concepts.map(concept => `
      <button type="button" class="textbook-btn ${state.concept === concept ? "active" : ""}"
        data-action="concept" data-value="${escapeHtml(concept)}">${escapeHtml(concept)}</button>
    `).join("");
  }

  function renderKeywordButtons() {
    const el = $("textbookKeywordButtons");
    if (!el) return;

    if (!state.subject || !state.concept) {
      el.innerHTML = `<div class="textbook-empty">교과 개념을 선택하면 교과 키워드가 나옵니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);

    if (!keywords.length) {
      el.innerHTML = `<div class="textbook-empty">등록된 교과 키워드가 없습니다.</div>`;
      return;
    }

    el.innerHTML = keywords.map(keyword => `
      <button type="button" class="textbook-btn ${state.keyword === keyword ? "active" : ""}"
        data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
    `).join("");
  }

  function renderCareerButtons() {
    const el = $("textbookCareerButtons");
    if (!el) return;

    if (!state.keyword) {
      el.innerHTML = `<div class="textbook-empty">교과 키워드를 선택하면 탐구 방향을 고를 수 있습니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const careers = getCareerList(entry);

    if (!careers.length) {
      el.innerHTML = `<div class="textbook-empty">등록된 탐구 방향 정보가 없습니다.</div>`;
      return;
    }

    el.innerHTML = careers.map(career => `
      <button type="button" class="textbook-btn ${state.career === career ? "active" : ""}"
        data-action="career" data-value="${escapeHtml(career)}">${escapeHtml(career)}</button>
    `).join("");
  }

  function renderReasonBox() {
    const el = $("textbookReasonBox");
    if (!el) return;

    if (!state.keyword) {
      el.innerHTML = `<div class="textbook-empty">교과 키워드를 먼저 선택하세요. 그러면 아래에 도서 기반 탐구 퍼즐이 열립니다.</div>`;
      return;
    }
    if (!state.career) {
      el.innerHTML = `<div class="textbook-empty">4번에서 탐구 방향을 하나 선택하면 도서 기반 탐구 퍼즐이 열립니다.</div>`;
      return;
    }

    const topicHtml = (window.renderTopicSuggestionHTML && typeof window.renderTopicSuggestionHTML === "function")
      ? window.renderTopicSuggestionHTML({
          keyword: state.keyword,
          subject: state.subject,
          concept: state.concept,
          career: state.career
        })
      : "";

    el.innerHTML = topicHtml || `<div class="textbook-empty">도서 기반 탐구 퍼즐을 불러오지 못했습니다.</div>`;
  }

  function renderSelectionSummary() {
    const el = $("textbookSelectionSummary");
    if (!el) return;

    const parts = [state.subject, state.concept, state.keyword, state.career].filter(Boolean);
    el.innerHTML = parts.length
      ? parts.map(item => `<span class="reason-chip">${escapeHtml(item)}</span>`).join("")
      : "아직 선택하지 않았습니다.";
  }

  function syncKeywordInput() {
    const input = $("keyword");
    if (!input) return;
    input.value = state.keyword || "";
  }

  function syncCareerInput(shouldWrite) {
    const input = $("career");
    if (!input) return;
    if (shouldWrite) {
      input.value = state.career || "";
    } else if (state.career === "") {
      input.value = "";
    }
  }

  function safeHideLegacyCareerBlock() {
    try {
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4"));
      const target = headings.find(h => (h.textContent || "").includes("진로 → 학과 → 추천 키워드 선택"));
      if (!target) return;

      let block = target.closest("section, .card, .result-card, .side-card, .student-card, .analysis-card");
      if (!block) block = target.parentElement;
      if (!block || block.id === "textbookConceptSelectorSection") return;
      block.style.display = "none";
    } catch (error) {
      console.warn("safeHideLegacyCareerBlock error:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

function chipHtmlWithDesc(arr){
  const map = {
    "수학과":"수식으로 원리 분석",
    "통계학과":"데이터 비교·해석",
    "물리학과":"전자·힘·에너지 연구",
    "기계공학과":"기계 시스템 설계",
    "컴퓨터공학과":"프로그램·데이터 처리"
  };
  return (arr||[]).map(v=>{
    const desc = map[v] ? ` (${map[v]})` : "";
    return `<span class="reason-chip">${v}${desc}</span>`;
  }).join("");
}

function chipHtmlSubject(arr){
  const map = {
    "공통수학1":"수치 계산·비교",
    "공통수학2":"수치 계산·비교",
    "물리학":"전자·힘·에너지 이해",
    "정보":"데이터 처리",
    "통합사회":"현상 해석"
  };
  return (arr||[]).map(v=>{
    const desc = map[v] ? ` (${map[v]})` : "";
    return `<span class="reason-chip">${v}${desc}</span>`;
  }).join("");
}
