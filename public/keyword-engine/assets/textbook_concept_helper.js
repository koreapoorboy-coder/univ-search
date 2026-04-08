window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v5.0-career-first-ui";

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
      syncCareerFromInput();
      renderAll();
      setTimeout(renderAll, 300);
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
        <div class="textbook-concept-kicker">과목과 진로를 먼저 잡고, 그다음 도서와 교과 연결로 들어갑니다</div>
        <h2 class="textbook-concept-title">과목 → 진로 → 도서 → 교과 개념/키워드 연결</h2>
        <p class="textbook-concept-desc">
          먼저 과목과 희망 진로를 잡고, 그 진로에 맞는 도서를 추천받습니다.
          그다음 선택한 방향에 맞춰 교과 개념과 키워드를 연결하는 흐름으로 사용합니다.
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
            <h3>2. 희망 진로 확인</h3>
            <div class="textbook-guide">진로 입력값 기준</div>
          </div>
          <div id="selectedCareerSummary" class="textbook-selected-subject">먼저 희망 진로를 입력하세요.</div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>3. 진로 기반 추천 도서</h3>
            <div class="textbook-guide">도서 먼저 선택</div>
          </div>
          <div id="textbookReasonBox" class="textbook-reason-box">과목과 희망 진로를 먼저 입력하면 아래에 추천 도서가 열립니다.</div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>4. 연결할 교과 개념 선택</h3>
            <div class="textbook-guide">1개 선택</div>
          </div>
          <div id="textbookConceptButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>5. 이 개념의 교과 키워드</h3>
            <div class="textbook-guide">1개 선택</div>
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
        renderAll();
      });
    }

    const careerEl = $("career");
    if (careerEl) {
      careerEl.addEventListener("input", function () {
        syncCareerFromInput();
        renderAll();
      });
      careerEl.addEventListener("change", function () {
        syncCareerFromInput();
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
          state.concept = state.concept === value ? "" : value;
          state.keyword = "";
          syncKeywordInput();
          renderAll();
          return;
        }

        if (action === "keyword") {
          state.keyword = state.keyword === value ? "" : value;
          syncKeywordInput();
          renderAll();
        }
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

  function renderAll() {
    renderSubjectSummary();
    renderCareerSummary();
    renderBookArea();
    renderConceptButtons();
    renderKeywordButtons();
    renderSelectionSummary();
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

    if (!state.subject) {
      el.innerHTML = `<div class="textbook-empty">먼저 과목을 선택하세요.</div>`;
      return;
    }
    if (!state.career) {
      el.innerHTML = `<div class="textbook-empty">희망 진로를 입력하면 진로 기반 추천 도서가 열립니다.</div>`;
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
  }

  function renderConceptButtons() {
    const el = $("textbookConceptButtons");
    if (!el) return;

    if (!state.subject) {
      el.innerHTML = `<div class="textbook-empty">과목을 선택하면 연결할 교과 개념이 나옵니다.</div>`;
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

    if (!state.concept) {
      el.innerHTML = `<div class="textbook-empty">도서와 연결할 교과 개념을 선택하면 교과 키워드가 나옵니다.</div>`;
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
    const parts = [state.subject, state.career, state.concept, state.keyword].filter(Boolean);

    el.innerHTML = parts.length
      ? parts.map(item => `<span class="reason-chip">${escapeHtml(item)}</span>`).join("")
      : "아직 선택하지 않았습니다.";
  }

  function syncKeywordInput() {
    const input = $("keyword");
    if (!input) return;
    input.value = state.keyword || "";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
