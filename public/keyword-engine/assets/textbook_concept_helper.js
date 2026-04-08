window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v5.1-career-first-locked";

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
    career: "",
    concept: "",
    keyword: "",
    selectedBook: "",
    selectedBookTitle: ""
  };

  window.__TEXTBOOK_HELPER_STATE__ = state;

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
      syncCareerFromInput();
      renderAll();
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
        <div class="textbook-concept-kicker">순서대로 선택해야 다음 단계가 열립니다</div>
        <h2 class="textbook-concept-title">과목 → 진로 → 도서 → 교과 개념 → 교과 키워드</h2>
        <p class="textbook-concept-desc">
          학생은 위에서 아래로 순서대로만 선택합니다.
          앞 단계가 완료되어야 다음 단계가 열리도록 잠금 구조로 설계했습니다.
        </p>

        <div class="textbook-block" data-step="1">
          <div class="textbook-head">
            <h3>1. 과목 확인</h3>
            <div class="textbook-guide">현재 선택 과목 기준</div>
          </div>
          <div id="selectedSubjectSummary" class="textbook-selected-subject">먼저 과목을 선택하세요.</div>
        </div>

        <div class="textbook-block" data-step="2">
          <div class="textbook-head">
            <h3>2. 희망 진로 확인</h3>
            <div class="textbook-guide">진로 입력값 기준</div>
          </div>
          <div id="selectedCareerSummary" class="textbook-selected-subject">먼저 희망 진로를 입력하세요.</div>
        </div>

        <div class="textbook-block" data-step="3">
          <div class="textbook-head">
            <h3>3. 진로 기반 추천 도서</h3>
            <div class="textbook-guide">도서 먼저 선택</div>
          </div>
          <div id="textbookReasonBox" class="textbook-reason-box">과목과 희망 진로를 먼저 입력하면 추천 도서가 열립니다.</div>
        </div>

        <div class="textbook-block" data-step="4">
          <div class="textbook-head">
            <h3>4. 연결할 교과 개념 선택</h3>
            <div class="textbook-guide">도서 선택 후 열림</div>
          </div>
          <div id="textbookConceptButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block" data-step="5">
          <div class="textbook-head">
            <h3>5. 이 개념의 교과 키워드</h3>
            <div class="textbook-guide">개념 선택 후 열림</div>
          </div>
          <div id="textbookKeywordButtons" class="textbook-buttons"></div>
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
    keywordInput.placeholder = "위에서 교과 키워드를 선택하면 자동으로 입력됩니다. 직접 입력도 가능합니다.";
  }

  function bindEvents() {
    const subjectEl = $("subject");
    if (subjectEl) {
      subjectEl.addEventListener("change", function () {
        syncSubjectFromSelect();
        state.concept = "";
        state.keyword = "";
        state.selectedBook = "";
        state.selectedBookTitle = "";
        renderAll();
      });
    }

    const careerEl = $("career");
    if (careerEl) {
      careerEl.addEventListener("input", function () {
        syncCareerFromInput();
        state.selectedBook = "";
        state.selectedBookTitle = "";
        state.concept = "";
        state.keyword = "";
        renderAll();
      });
      careerEl.addEventListener("change", function () {
        syncCareerFromInput();
        state.selectedBook = "";
        state.selectedBookTitle = "";
        state.concept = "";
        state.keyword = "";
        renderAll();
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
          if (!isStepEnabled(4)) return;
          state.concept = state.concept === value ? "" : value;
          state.keyword = "";
          syncKeywordInput();
          renderAll();
          return;
        }

        if (action === "keyword") {
          if (!isStepEnabled(5)) return;
          state.keyword = state.keyword === value ? "" : value;
          syncKeywordInput();
          renderAll();
        }
      });

      root.addEventListener("click", function (event) {
        const bookBtn = event.target.closest(".book-chip[data-kind='book']");
        if (!bookBtn) return;
        if (!isStepEnabled(3)) return;
        state.selectedBook = bookBtn.getAttribute("data-value") || "";
        state.selectedBookTitle = bookBtn.getAttribute("data-title") || bookBtn.textContent.trim() || "";
        state.concept = "";
        state.keyword = "";
        syncKeywordInput();
        setTimeout(renderAll, 20);
      });
    }
  }

  function syncSubjectFromSelect() {
    const el = $("subject");
    const raw = el ? ((el.value || "").trim() || (el.options?.[el.selectedIndex]?.text || "").trim()) : "";
    state.subject = findSubjectKey(raw);
  }

  function syncCareerFromInput() {
    const el = $("career");
    state.career = (el?.value || "").trim();
  }

  function normalizeSubject(v) {
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/]/g, "")
      .toLowerCase();
  }

  function findSubjectKey(raw) {
    if (!raw || !uiSeed) return "";
    const cleaned = normalizeSubject(raw);
    const keys = Object.keys(uiSeed);

    for (const key of keys) {
      if (normalizeSubject(key) === cleaned) return key;
    }
    for (const key of keys) {
      const nk = normalizeSubject(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }
    return "";
  }

  function getConceptList(subject) {
    if (!subject || !uiSeed || !uiSeed[subject]) return [];
    const entry = uiSeed[subject];
    if (Array.isArray(entry.concepts)) return entry.concepts;
    if (Array.isArray(entry.concept_buttons)) {
      return entry.concept_buttons.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    if (Array.isArray(entry.concept_order)) return entry.concept_order;
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
    if (!Array.isArray(value)) return [];
    return value.map(item => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        return item.keyword || item.topic || item.name || item.subject || item.bridge || item.label || item.concept || item.title || "";
      }
      return "";
    }).filter(Boolean);
  }

  function getKeywordList(entry) {
    if (!entry) return [];
    return stringArrayFrom(entry.keywords || entry.micro_keywords || entry.core_keywords || entry.keyword_buttons);
  }

  function isStepEnabled(step) {
    if (step === 1) return true;
    if (step === 2) return !!state.subject;
    if (step === 3) return !!state.subject && !!state.career;
    if (step === 4) return !!state.subject && !!state.career && !!state.selectedBook;
    if (step === 5) return !!state.subject && !!state.career && !!state.selectedBook && !!state.concept;
    return false;
  }

  function applyStepLocks() {
    const blocks = document.querySelectorAll("#textbookConceptSelectorSection .textbook-block[data-step]");
    blocks.forEach(block => {
      const step = Number(block.getAttribute("data-step") || "0");
      const enabled = isStepEnabled(step);
      block.classList.toggle("locked-step", !enabled);
    });
  }

  function renderAll() {
    renderSubjectSummary();
    renderCareerSummary();
    renderBookArea();
    renderConceptButtons();
    renderKeywordButtons();
    renderSelectionSummary();
    applyStepLocks();
  }

  function renderSubjectSummary() {
    const el = $("selectedSubjectSummary");
    if (el) el.textContent = state.subject || "먼저 과목을 선택하세요.";
  }

  function renderCareerSummary() {
    const el = $("selectedCareerSummary");
    if (el) el.textContent = state.career || "먼저 희망 진로를 입력하세요.";
  }

  function renderBookArea() {
    const el = $("textbookReasonBox");
    if (!el) return;

    if (!isStepEnabled(3)) {
      el.innerHTML = `<div class="textbook-empty">과목과 희망 진로를 먼저 입력하면 추천 도서가 열립니다.</div>`;
      return;
    }

    const topicHtml = (window.renderTopicSuggestionHTML && typeof window.renderTopicSuggestionHTML === "function")
      ? window.renderTopicSuggestionHTML({
          subject: state.subject,
          concept: state.concept,
          keyword: state.keyword,
          career: state.career
        })
      : "";

    el.innerHTML = topicHtml || `<div class="textbook-empty">추천 도서 영역을 불러오지 못했습니다.</div>`;

    setTimeout(() => {
      if (state.selectedBook) {
        const btns = el.querySelectorAll(".book-chip[data-kind='book']");
        btns.forEach(btn => {
          const match = btn.getAttribute("data-value") === state.selectedBook;
          btn.classList.toggle("is-active", match);
        });
      }
    }, 10);
  }

  function renderConceptButtons() {
    const el = $("textbookConceptButtons");
    if (!el) return;

    if (!isStepEnabled(4)) {
      el.innerHTML = `<div class="textbook-empty">먼저 추천 도서를 선택해야 교과 개념 선택이 열립니다.</div>`;
      return;
    }

    const concepts = getConceptList(state.subject);
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

    if (!isStepEnabled(5)) {
      el.innerHTML = `<div class="textbook-empty">먼저 교과 개념을 선택해야 교과 키워드 선택이 열립니다.</div>`;
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

  function renderSelectionSummary() {
    const el = $("textbookSelectionSummary");
    if (!el) return;
    const parts = [state.subject, state.career, state.selectedBookTitle || state.selectedBook, state.concept, state.keyword].filter(Boolean);

    el.innerHTML = parts.length
      ? parts.map(item => `<span class="reason-chip">${escapeHtml(item)}</span>`).join("")
      : "아직 선택하지 않았습니다.";
  }

  function syncKeywordInput() {
    const input = $("keyword");
    if (!input) return;
    input.value = state.keyword || "";
  }

  window.__TEXTBOOK_HELPER_RENDER__ = renderAll;

  document.addEventListener("DOMContentLoaded", init);
})();
