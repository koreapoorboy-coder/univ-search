window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v6.0-layout-refresh";

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

      injectLayoutStyles();
      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      syncCareerFromInput();
      renderAll();
    } catch (error) {
      console.warn("textbook concept helper init error:", error);
    }
  }

  function injectLayoutStyles() {
    if (document.getElementById("textbookConceptRefreshStyles")) return;
    const style = document.createElement("style");
    style.id = "textbookConceptRefreshStyles";
    style.textContent = `
      #textbookConceptSelectorSection{margin-top:18px}
      #textbookConceptSelectorSection .textbook-concept-card{border:1px solid #dbe4f6;border-radius:24px;padding:22px;background:linear-gradient(180deg,#fbfcff 0%,#f7f9ff 100%)}
      #textbookConceptSelectorSection .textbook-concept-kicker{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;background:#e9f7ef;color:#1d8f5a;font-size:12px;font-weight:700;margin-bottom:10px}
      #textbookConceptSelectorSection .textbook-concept-title{margin:0;font-size:24px;line-height:1.35;color:#1b2744}
      #textbookConceptSelectorSection .textbook-concept-desc{margin:10px 0 0;font-size:14px;line-height:1.7;color:#5a6682}
      #textbookConceptSelectorSection .textbook-status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}
      #textbookConceptSelectorSection .textbook-status-card{background:#fff;border:1px solid #dfe6f6;border-radius:16px;padding:14px 16px;min-height:86px}
      #textbookConceptSelectorSection .textbook-status-label{font-size:12px;font-weight:700;color:#50607f}
      #textbookConceptSelectorSection .textbook-status-value{margin-top:8px;font-size:15px;line-height:1.55;color:#1c2845;font-weight:700}
      #textbookConceptSelectorSection .textbook-main-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,0.7fr);gap:14px;margin-top:14px}
      #textbookConceptSelectorSection .textbook-bottom-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
      #textbookConceptSelectorSection .textbook-block{background:#fff;border:1px solid #dfe6f6;border-radius:18px;padding:16px}
      #textbookConceptSelectorSection .textbook-block.locked-step{opacity:.6;background:#f7f9fd}
      #textbookConceptSelectorSection .textbook-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      #textbookConceptSelectorSection .textbook-head h3{margin:0;font-size:17px;color:#1b2744}
      #textbookConceptSelectorSection .textbook-guide{font-size:11px;font-weight:700;color:#6a7896;background:#f3f6fc;border-radius:999px;padding:5px 8px;white-space:nowrap}
      #textbookConceptSelectorSection .textbook-helper-note{border:1px dashed #d8e1f4;border-radius:16px;padding:14px;background:#fbfcff}
      #textbookConceptSelectorSection .textbook-helper-note-title{font-size:13px;font-weight:800;color:#24406c;margin-bottom:6px}
      #textbookConceptSelectorSection .textbook-helper-note-desc{font-size:13px;line-height:1.65;color:#56627d}
      #textbookConceptSelectorSection .textbook-empty{font-size:13px;line-height:1.65;color:#64708a}
      #textbookConceptSelectorSection .textbook-buttons{display:flex;flex-wrap:wrap;gap:8px}
      #textbookConceptSelectorSection .textbook-btn{border:1px solid #d7def0;background:#fff;border-radius:999px;padding:9px 12px;font-size:13px;font-weight:700;color:#2f3d5b;cursor:pointer}
      #textbookConceptSelectorSection .textbook-btn.active{border-color:#2f5bff;background:#eef3ff;color:#2041c9}
      #textbookConceptSelectorSection .textbook-selection-summary{display:flex;flex-wrap:wrap;gap:8px}
      #textbookConceptSelectorSection .reason-chip{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef3ff;color:#284ac8;font-size:12px;font-weight:700}
      #textbookConceptSelectorSection .textbook-reason-box{min-height:330px}
      @media (max-width: 1100px){
        #textbookConceptSelectorSection .textbook-main-grid{grid-template-columns:1fr}
      }
      @media (max-width: 860px){
        #textbookConceptSelectorSection .textbook-status-grid,
        #textbookConceptSelectorSection .textbook-bottom-grid{grid-template-columns:1fr}
        #textbookConceptSelectorSection .textbook-concept-card{padding:18px}
        #textbookConceptSelectorSection .textbook-concept-title{font-size:20px}
      }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const keywordInput = $("keyword");
    if (!keywordInput || $("textbookConceptSelectorSection")) return;

    const formPanel = keywordInput.closest(".form-panel");
    const actions = formPanel ? formPanel.querySelector(".actions") : null;

    const wrap = document.createElement("section");
    wrap.id = "textbookConceptSelectorSection";
    wrap.className = "textbook-concept-section";
    wrap.innerHTML = `
      <div class="textbook-concept-card">
        <div class="textbook-concept-kicker">순서대로 선택하면 다음 단계가 열립니다</div>
        <h2 class="textbook-concept-title">과목 · 진로 · 도서를 먼저 고르고,<br>그다음 교과 개념과 키워드를 연결합니다.</h2>
        <p class="textbook-concept-desc">학생은 위에서 아래로 순서대로만 선택합니다. 도서 선택까지 끝나면 아래에서 교과 개념과 키워드를 눌러 탐구 방향을 구체화할 수 있습니다.</p>

        <div class="textbook-status-grid">
          <div class="textbook-status-card">
            <div class="textbook-status-label">1. 과목 확인</div>
            <div id="selectedSubjectSummary" class="textbook-status-value">먼저 과목을 선택하세요.</div>
          </div>
          <div class="textbook-status-card">
            <div class="textbook-status-label">2. 희망 진로 확인</div>
            <div id="selectedCareerSummary" class="textbook-status-value">먼저 희망 진로를 입력하세요.</div>
          </div>
          <div class="textbook-status-card">
            <div class="textbook-status-label">현재 선택</div>
            <div id="textbookSelectionSummary" class="textbook-selection-summary">아직 선택하지 않았습니다.</div>
          </div>
        </div>

        <div class="textbook-main-grid">
          <div class="textbook-block" data-step="3">
            <div class="textbook-head">
              <h3>3. 진로 기반 추천 도서</h3>
              <div class="textbook-guide">도서 먼저 선택</div>
            </div>
            <div id="textbookReasonBox" class="textbook-reason-box">과목과 희망 진로를 먼저 입력하면 추천 도서가 열립니다.</div>
          </div>
          <div class="textbook-block">
            <div class="textbook-head">
              <h3>선택 안내</h3>
              <div class="textbook-guide">사용 팁</div>
            </div>
            <div class="textbook-helper-note">
              <div class="textbook-helper-note-title">이 순서로 보면 편합니다</div>
              <div class="textbook-helper-note-desc">도서는 <strong>진로와 연결성</strong>이 높은 것부터 고르고, 그다음 아래에서 <strong>교과 개념</strong>을 선택한 뒤 마지막에 <strong>교과 키워드</strong>를 눌러 탐구 범위를 좁히면 됩니다.</div>
            </div>
          </div>
        </div>

        <div class="textbook-bottom-grid">
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
        </div>
      </div>
    `;

    if (formPanel) {
      formPanel.insertBefore(wrap, actions || null);
    } else {
      keywordInput.parentNode.insertBefore(wrap, keywordInput.parentNode.nextSibling);
    }

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
        if (!bookBtn || !isStepEnabled(3)) return;
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
          career: state.career,
          selectedBook: state.selectedBook
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
      : `<div class="textbook-empty">아직 선택하지 않았습니다.</div>`;
  }

  function syncKeywordInput() {
    const input = $("keyword");
    if (!input) return;
    input.value = state.keyword || "";
  }

  window.__TEXTBOOK_HELPER_RENDER__ = renderAll;

  document.addEventListener("DOMContentLoaded", init);
})();
