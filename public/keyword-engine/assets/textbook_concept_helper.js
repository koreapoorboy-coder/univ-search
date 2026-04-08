window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v20.0-concept-first-report-mode";

(function () {
  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const UI_SEED_URL = "seed/textbook-v1/subject_concept_ui_seed.json";
  const ENGINE_MAP_URL = "seed/textbook-v1/subject_concept_engine_map.json";
  const TOPIC_MATRIX_URL = "seed/textbook-v1/topic_matrix_seed.json";

  const state = {
    subject: "",
    career: "",
    concept: "",
    keyword: "",
    selectedBook: "",
    selectedBookTitle: "",
    reportMode: "",
    reportView: ""
  };

  let uiSeed = null;
  let engineMap = null;
  let topicMatrix = null;

  function normalize(v) {
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "")
      .toLowerCase();
  }

  function fuzzyIncludes(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
  }

  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  async function init() {
    try {
      const [uiRes, engineRes, matrixRes] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }),
        fetch(ENGINE_MAP_URL, { cache: "no-store" }),
        fetch(TOPIC_MATRIX_URL, { cache: "no-store" }).catch(() => null)
      ]);

      if (!uiRes.ok || !engineRes.ok) {
        console.warn("textbook concept seed load failed", uiRes.status, engineRes.status);
        return;
      }

      uiSeed = await uiRes.json();
      engineMap = await engineRes.json();
      topicMatrix = matrixRes && matrixRes.ok ? await matrixRes.json() : null;

      injectStyles();
      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      syncCareerFromInput();
      renderAll();
    } catch (error) {
      console.warn("textbook concept helper init error:", error);
    }
  }

  function injectStyles() {
    if ($("engineFlowStyles")) return;
    const style = document.createElement("style");
    style.id = "engineFlowStyles";
    style.textContent = `
      .engine-flow-wrap { margin-top: 18px; }
      .engine-flow-card {
        border: 1px solid #d9e1f2;
        border-radius: 22px;
        background: #fff;
        padding: 22px;
        box-shadow: 0 12px 30px rgba(16, 24, 40, .04);
      }
      .engine-flow-kicker {
        display: inline-flex;
        padding: 6px 12px;
        border-radius: 999px;
        background: #edf5ff;
        color: #1f6fe5;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .engine-flow-title {
        margin: 0;
        font-size: 29px;
        line-height: 1.35;
        font-weight: 800;
        color: #172033;
      }
      .engine-flow-desc {
        margin: 10px 0 0;
        color: #51607a;
        line-height: 1.65;
        font-size: 15px;
      }
      .engine-status-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 12px;
        margin-top: 22px;
      }
      .engine-status-box {
        border: 1px solid #d8e0ee;
        border-radius: 16px;
        padding: 14px 16px;
        background: #fbfcff;
      }
      .engine-status-label {
        font-size: 12px;
        color: #6d7c93;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .engine-status-value {
        font-size: 18px;
        color: #172033;
        font-weight: 800;
        word-break: keep-all;
      }
      .engine-step-block {
        margin-top: 16px;
        border: 1px solid #d8e0ee;
        border-radius: 20px;
        padding: 18px;
        background: #fff;
      }
      .engine-step-block.locked {
        opacity: .55;
        background: #fbfcfe;
      }
      .engine-step-head {
        display:flex;
        justify-content: space-between;
        align-items:flex-start;
        gap: 12px;
        margin-bottom: 14px;
      }
      .engine-step-title {
        margin:0;
        font-size: 22px;
        color:#172033;
        font-weight:800;
      }
      .engine-step-guide {
        color:#6d7c93;
        font-size:13px;
        font-weight:700;
        white-space:nowrap;
      }
      .engine-step-copy {
        color:#5b6880;
        font-size:14px;
        line-height:1.6;
      }
      .engine-concept-grid {
        display:grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .engine-concept-card {
        border: 1px solid #d5deef;
        background:#fff;
        border-radius: 16px;
        padding: 16px;
        text-align:left;
        cursor:pointer;
        transition: all .18s ease;
      }
      .engine-concept-card:hover { border-color:#b6c7ef; transform: translateY(-1px); }
      .engine-concept-card.is-active { border-color:#2764ff; box-shadow: 0 0 0 2px rgba(39, 100, 255, .08); background:#f7faff; }
      .engine-concept-name { font-size:17px; font-weight:800; color:#172033; }
      .engine-concept-tags, .engine-chip-wrap, .engine-tag-wrap { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .engine-mini-tag, .engine-chip, .engine-tag {
        display:inline-flex; align-items:center; gap:4px; padding:7px 11px; border-radius:999px;
        background:#f1f5fd; color:#304666; font-size:13px; font-weight:700; border:1px solid transparent;
      }
      button.engine-chip { cursor:pointer; }
      button.engine-chip:hover { border-color:#b8c8ee; }
      button.engine-chip.is-active { background:#2f66ff; color:#fff; }
      .engine-mini-tag.subtle, .engine-tag.subtle { background:#f7f9fd; color:#61708c; }
      .engine-subgrid {
        display:grid;
        grid-template-columns: 1.15fr .85fr;
        gap: 16px;
        margin-top: 14px;
      }
      .engine-panel {
        border:1px solid #e0e6f3;
        border-radius:16px;
        padding:16px;
        background:#fbfcff;
      }
      .engine-subtitle { font-size:16px; font-weight:800; color:#172033; margin-bottom:6px; }
      .engine-help { color:#6b7890; font-size:13px; line-height:1.55; }
      .engine-empty {
        padding: 18px;
        border-radius: 16px;
        background:#f7f9fd;
        color:#6a7891;
        font-size:14px;
        line-height:1.6;
        border:1px dashed #d8e0ee;
      }
      .engine-book-layout { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
      .engine-book-list, .engine-book-summary { min-height: 100%; }
      .engine-book-card {
        width:100%; display:flex; gap:14px; text-align:left; padding:14px; border-radius:16px; border:1px solid #d5deef; background:#fff; margin-top:10px; cursor:pointer;
      }
      .engine-book-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-book-order {
        width:28px; height:28px; flex:0 0 28px; border-radius:999px; background:#edf3ff; color:#2f66ff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:2px;
      }
      .engine-book-title { font-size:18px; font-weight:800; color:#172033; }
      .engine-book-meta { margin-top:4px; color:#66748c; font-size:13px; }
      .engine-book-reason { margin-top:8px; color:#1d2d49; font-size:14px; font-weight:700; }
      .engine-summary-box { background:#fff; border:1px solid #d5deef; border-radius:16px; padding:16px; min-height:100%; }
      .engine-summary-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .engine-summary-title { font-size:22px; font-weight:800; color:#172033; }
      .engine-summary-meta { margin-top:4px; color:#66748c; font-size:14px; }
      .engine-summary-badge {
        padding:6px 10px; border-radius:999px; background:#edf5ff; color:#2563eb; font-size:12px; font-weight:800; white-space:nowrap;
      }
      .engine-summary-text { color:#33435f; font-size:15px; line-height:1.7; margin:14px 0 0; }
      .engine-summary-foot { margin-top:14px; color:#61708c; font-size:13px; line-height:1.55; }
      .engine-mode-grid {
        display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:12px; margin-top:12px;
      }
      .engine-mode-card {
        border:1px solid #d5deef; background:#fff; border-radius:16px; padding:14px; text-align:left; cursor:pointer;
      }
      .engine-mode-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-mode-title { font-size:16px; font-weight:800; color:#172033; }
      .engine-mode-desc { color:#66748c; font-size:13px; line-height:1.55; margin-top:6px; }
      .engine-selection-box { margin-top:18px; border:1px solid #d8e0ee; border-radius:20px; padding:18px; background:#f8fbff; }
      .engine-selection-title { margin:0 0 10px; font-size:20px; font-weight:800; color:#172033; }
      .engine-selection-payload { margin-top:12px; padding:14px 16px; border-radius:16px; background:#fff; border:1px dashed #d6deef; color:#33435f; font-size:14px; line-height:1.7; }
      .engine-selection-payload strong { color:#172033; }
      @media (max-width: 1100px) {
        .engine-status-row, .engine-book-layout, .engine-subgrid, .engine-mode-grid, .engine-concept-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    if ($("engineFlowSection")) return;

    const formGrid = document.querySelector(".form-grid");
    const actions = document.querySelector(".actions");
    if (!formGrid || !actions) return;

    const section = document.createElement("section");
    section.id = "engineFlowSection";
    section.className = "engine-flow-wrap";
    section.innerHTML = `
      <div class="engine-flow-card">
        <div class="engine-flow-kicker">MINI로 보고서 초안을 만들기 위한 선택 흐름</div>
        <h2 class="engine-flow-title">과목 → 진로 → 개념 키워드 → 도서 → 보고서 방식 → 관점</h2>
        <p class="engine-flow-desc">질문을 만들기보다, MINI가 보고서를 만들 수 있도록 연결 데이터를 정확히 모으는 구조로 바꿨습니다. 먼저 교과 개념 키워드를 정하고, 그 키워드를 확장해 줄 도서를 고른 다음, 보고서 전개 방식과 관점을 선택합니다.</p>

        <div class="engine-status-row">
          <div class="engine-status-box">
            <div class="engine-status-label">1. 과목</div>
            <div id="engineSubjectSummary" class="engine-status-value">선택 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">2. 진로</div>
            <div id="engineCareerSummary" class="engine-status-value">입력 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">현재 진행 상태</div>
            <div id="engineProgressSummary" class="engine-status-value">개념 키워드 선택 대기</div>
          </div>
        </div>

        <div id="engineConceptBlock" class="engine-step-block" data-step="3">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">3. 진로와 맞는 교과 개념 키워드 선택</h3>
              <div class="engine-step-copy">과목과 진로를 바탕으로 먼저 교과 개념을 고르고, 그 안에서 보고서의 핵심 키워드를 선택합니다.</div>
            </div>
            <div class="engine-step-guide">개념 → 키워드</div>
          </div>
          <div class="engine-subgrid">
            <div class="engine-panel">
              <div class="engine-subtitle">개념 고르기</div>
              <div id="engineConceptCards"></div>
            </div>
            <div class="engine-panel">
              <div class="engine-subtitle">키워드 고르기</div>
              <div id="engineKeywordButtons"></div>
            </div>
          </div>
        </div>

        <div id="engineBookBlock" class="engine-step-block" data-step="4">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">4. 키워드와 맞는 도서 선택</h3>
              <div class="engine-step-copy">선택한 키워드를 근거로 확장하기 좋은 도서를 고릅니다. 도서는 보고서의 참고 근거와 확장 프레임 역할을 합니다.</div>
            </div>
            <div class="engine-step-guide">도서 선택</div>
          </div>
          <div id="engineBookArea"></div>
        </div>

        <div id="engineModeBlock" class="engine-step-block" data-step="5">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">5. 보고서 전개 방식 선택</h3>
              <div class="engine-step-copy">같은 개념과 도서라도 어떻게 풀어 쓸지에 따라 보고서 방향이 달라집니다.</div>
            </div>
            <div class="engine-step-guide">원리 / 비교 / 데이터</div>
          </div>
          <div id="engineModeButtons"></div>
        </div>

        <div id="engineViewBlock" class="engine-step-block" data-step="6">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">6. 보고서 관점 선택</h3>
              <div class="engine-step-copy">보고서를 어떤 시선으로 정리할지 마지막 관점을 고릅니다.</div>
            </div>
            <div class="engine-step-guide">관점 선택</div>
          </div>
          <div id="engineViewButtons"></div>
        </div>

        <div class="engine-selection-box">
          <h3 class="engine-selection-title">현재 선택 요약</h3>
          <div id="engineSelectionSummary"></div>
          <div id="engineMiniPayload" class="engine-selection-payload"></div>
        </div>
      </div>
    `;

    actions.parentNode.insertBefore(section, actions);

    const keywordInput = $("keyword");
    if (keywordInput) {
      keywordInput.readOnly = true;
      keywordInput.placeholder = "아래에서 교과 개념 키워드를 선택하면 자동 입력됩니다.";
      const label = keywordInput.closest("label");
      const span = label ? label.querySelector("span") : null;
      if (span) span.textContent = "선택 키워드(자동 반영)";
    }

    injectHiddenInput("selectedConcept");
    injectHiddenInput("selectedBookId");
    injectHiddenInput("selectedBookTitle");
    injectHiddenInput("reportMode");
    injectHiddenInput("reportView");
    injectHiddenInput("miniNavigationPayload");
  }

  function injectHiddenInput(id) {
    if ($(id)) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.id = id;
    const actions = document.querySelector(".actions");
    if (actions && actions.parentNode) {
      actions.parentNode.insertBefore(input, actions);
    }
  }

  function bindEvents() {
    const subjectEl = $("subject");
    if (subjectEl) {
      subjectEl.addEventListener("change", function () {
        syncSubjectFromSelect();
        clearFrom("concept");
        renderAll();
      });
    }

    const careerEl = $("career");
    if (careerEl) {
      ["input", "change"].forEach(evt => {
        careerEl.addEventListener(evt, function () {
          syncCareerFromInput();
          clearFrom("concept");
          renderAll();
        });
      });
    }

    document.addEventListener("click", function (event) {
      const conceptCard = event.target.closest(".engine-concept-card");
      if (conceptCard && isStepEnabled(3)) {
        const value = conceptCard.getAttribute("data-concept") || "";
        state.concept = value;
        state.keyword = "";
        state.selectedBook = "";
        state.selectedBookTitle = "";
        state.reportMode = "";
        state.reportView = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const keywordBtn = event.target.closest(".engine-chip[data-action='keyword']");
      if (keywordBtn && isStepEnabled(3)) {
        state.keyword = keywordBtn.getAttribute("data-value") || "";
        state.selectedBook = "";
        state.selectedBookTitle = "";
        state.reportMode = "";
        state.reportView = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const bookBtn = event.target.closest(".book-chip[data-kind='book']");
      if (bookBtn && isStepEnabled(4)) {
        state.selectedBook = bookBtn.getAttribute("data-value") || "";
        state.selectedBookTitle = bookBtn.getAttribute("data-title") || "";
        state.reportMode = "";
        state.reportView = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const modeCard = event.target.closest(".engine-mode-card[data-action='mode']");
      if (modeCard && isStepEnabled(5)) {
        state.reportMode = modeCard.getAttribute("data-value") || "";
        state.reportView = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const viewBtn = event.target.closest(".engine-chip[data-action='view']");
      if (viewBtn && isStepEnabled(6)) {
        state.reportView = viewBtn.getAttribute("data-value") || "";
        syncOutputFields();
        renderAll();
      }
    });

    window.__BOOK_ENGINE_REQUEST_RERENDER__ = renderAll;
    window.__TEXTBOOK_HELPER_STATE__ = state;
    window.__TEXTBOOK_HELPER_RENDER__ = renderAll;
    window.getMiniNavigationSelectionData = buildMiniPayload;
  }

  function clearFrom(stepName) {
    if (stepName === "concept") {
      state.concept = "";
      state.keyword = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      syncOutputFields();
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

  function findSubjectKey(raw) {
    if (!raw || !uiSeed) return "";
    const cleaned = normalize(raw);
    const keys = Object.keys(uiSeed);
    for (const key of keys) {
      if (normalize(key) === cleaned) return key;
    }
    for (const key of keys) {
      const nk = normalize(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }
    return "";
  }

  function getSubjectConceptEntries(subject) {
    const entry = engineMap?.[subject];
    const concepts = entry?.concepts || {};
    return Object.entries(concepts).map(([concept, value]) => ({ concept, value }));
  }

  function detectCareerBucket(career) {
    const text = String(career || "");
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|고분자|금속)/.test(text)) return "materials";
    if (/(기계|자동차|로봇|항공|모빌리티)/.test(text)) return "mechanical";
    if (/(전기|전자|회로|센서|통신)/.test(text)) return "electronic";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터|보안|정보|통계)/i.test(text)) return "it";
    if (/(간호|의학|의예|치의|약학|보건|수의|생명|바이오|의료)/.test(text)) return "bio";
    if (/(환경|기후|지구|우주|천문|해양|지리)/.test(text)) return "env";
    return "default";
  }

  function getCareerProfileKey(career) {
    const bucket = detectCareerBucket(career);
    const map = {
      materials: "재료공학",
      mechanical: "기계공학",
      electronic: "전자공학",
      it: "정보",
      bio: "생명과학 탐구",
      env: "_default",
      default: "_default"
    };
    return map[bucket] || "_default";
  }

  function scoreConcept(concept, entry) {
    const career = state.career || "";
    const bucket = detectCareerBucket(career);
    const textBag = [
      concept,
      ...(entry?.micro_keywords || []),
      ...(entry?.linked_career_bridge || []),
      ...(entry?.core_concepts || [])
    ].join(" ");

    let score = 0;
    const reasons = [];

    if (bucket === "materials") {
      if (/(물질|규칙성|원소|주기율|측정|단위|역학|구조|안정성|에너지|재료)/.test(textBag)) { score += 16; reasons.push("재료·구조 연결"); }
      if (/(세포|항상성|생명|자극)/.test(textBag)) score -= 12;
    }
    if (bucket === "mechanical") {
      if (/(역학|구조|하중|진동|측정|단위|시스템)/.test(textBag)) { score += 16; reasons.push("기계·구조 연결"); }
      if (/(세포|항상성|생명)/.test(textBag)) score -= 10;
    }
    if (bucket === "electronic") {
      if (/(측정|센서|단위|시스템|원소|규칙성|에너지)/.test(textBag)) { score += 15; reasons.push("전자·센서 연결"); }
      if (/(세포|항상성|생명)/.test(textBag)) score -= 10;
    }
    if (bucket === "it") {
      if (/(측정|데이터|단위|시스템|정량|표준)/.test(textBag)) { score += 15; reasons.push("데이터 해석 연결"); }
    }
    if (bucket === "bio") {
      if (/(세포|항상성|생명|건강|자극|내부 환경)/.test(textBag)) { score += 18; reasons.push("생명·건강 연결"); }
    }
    if (bucket === "env") {
      if (/(지구|천체|대기권|수권|지구계|환경|우주)/.test(textBag)) { score += 18; reasons.push("지구·환경 연결"); }
    }

    if ((entry?.linked_career_bridge || []).some(v => fuzzyIncludes(v, career))) {
      score += 12;
      reasons.push("진로 브리지 일치");
    }

    const profile = topicMatrix?.careerProfiles?.[getCareerProfileKey(career)];
    if (profile && Array.isArray(profile.categories)) {
      const combined = textBag;
      if (profile.categories.some(cat => fuzzyIncludes(combined, cat))) score += 8;
    }

    return { score, reasons: uniq(reasons) };
  }

  function getRankedConcepts() {
    return getSubjectConceptEntries(state.subject)
      .map(({ concept, value }) => ({ concept, value, ...scoreConcept(concept, value) }))
      .sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept, 'ko'));
  }

  function getConceptEntry() {
    if (!state.subject || !state.concept) return null;
    return engineMap?.[state.subject]?.concepts?.[state.concept] || null;
  }

  function getKeywordList(entry) {
    return uniq([...(entry?.micro_keywords || []), ...(entry?.core_concepts || [])]);
  }

  function isStepEnabled(step) {
    if (step === 1) return true;
    if (step === 2) return !!state.subject;
    if (step === 3) return !!state.subject && !!state.career;
    if (step === 4) return !!state.subject && !!state.career && !!state.concept && !!state.keyword;
    if (step === 5) return isStepEnabled(4) && !!state.selectedBook;
    if (step === 6) return isStepEnabled(5) && !!state.reportMode;
    return false;
  }

  function renderAll() {
    renderStatus();
    renderConceptArea();
    renderBookArea();
    renderModeArea();
    renderViewArea();
    renderSelectionSummary();
    applyLocks();
    syncOutputFields();
  }

  function renderStatus() {
    const subjectEl = $("engineSubjectSummary");
    const careerEl = $("engineCareerSummary");
    const progressEl = $("engineProgressSummary");
    if (subjectEl) subjectEl.textContent = state.subject || "선택 전";
    if (careerEl) careerEl.textContent = state.career || "입력 전";

    let progress = "개념 키워드 선택 대기";
    if (state.subject && state.career && !state.keyword) progress = "개념/키워드 선택 중";
    if (state.keyword && !state.selectedBook) progress = "도서 선택 대기";
    if (state.selectedBook && !state.reportMode) progress = "보고서 방식 선택 대기";
    if (state.reportMode && !state.reportView) progress = "보고서 관점 선택 대기";
    if (state.reportView) progress = "MINI 전달 데이터 준비 완료";
    if (progressEl) progressEl.textContent = progress;
  }

  function renderConceptArea() {
    const conceptWrap = $("engineConceptCards");
    const keywordWrap = $("engineKeywordButtons");
    if (!conceptWrap || !keywordWrap) return;

    if (!isStepEnabled(3)) {
      conceptWrap.innerHTML = `<div class="engine-empty">먼저 과목과 진로를 정해야 교과 개념 추천이 열립니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">개념을 먼저 선택하면 그 안의 키워드가 열립니다.</div>`;
      return;
    }

    const ranked = getRankedConcepts();
    if (!ranked.length) {
      conceptWrap.innerHTML = `<div class="engine-empty">등록된 교과 개념 데이터가 없습니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">등록된 키워드 데이터가 없습니다.</div>`;
      return;
    }

    conceptWrap.innerHTML = `<div class="engine-concept-grid">${ranked.slice(0, 6).map(item => {
      const tags = getKeywordList(item.value).slice(0, 4).map(tag => `<span class="engine-mini-tag">${escapeHtml(tag)}</span>`).join("");
      const why = item.reasons[0] || "교과 개념 추천";
      return `
        <button type="button" class="engine-concept-card ${state.concept === item.concept ? "is-active" : ""}" data-concept="${escapeHtml(item.concept)}">
          <div class="engine-concept-name">${escapeHtml(item.concept)}</div>
          <div class="engine-help" style="margin-top:8px;">${escapeHtml(why)}</div>
          <div class="engine-concept-tags">${tags}</div>
        </button>
      `;
    }).join("")}</div>`;

    if (!state.concept) {
      keywordWrap.innerHTML = `<div class="engine-empty">왼쪽에서 개념을 먼저 고르면 해당 개념의 키워드가 열립니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);
    if (!keywords.length) {
      keywordWrap.innerHTML = `<div class="engine-empty">이 개념에 연결된 키워드가 없습니다.</div>`;
      return;
    }

    keywordWrap.innerHTML = `
      <div class="engine-help">선택 개념: <strong>${escapeHtml(state.concept)}</strong></div>
      <div class="engine-chip-wrap">${keywords.map(keyword => `
        <button type="button" class="engine-chip ${state.keyword === keyword ? "is-active" : ""}" data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
      `).join("")}</div>
    `;
  }

  function renderBookArea() {
    const el = $("engineBookArea");
    if (!el) return;
    if (!isStepEnabled(4)) {
      el.innerHTML = `<div class="engine-empty">먼저 개념과 키워드를 선택해야 도서 추천이 열립니다.</div>`;
      return;
    }
    if (!window.renderBookSelectionHTML) {
      el.innerHTML = `<div class="engine-empty">도서 추천 기능을 불러오는 중입니다.</div>`;
      return;
    }
    el.innerHTML = window.renderBookSelectionHTML({
      subject: state.subject,
      career: state.career,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    });
  }

  function renderModeArea() {
    const el = $("engineModeButtons");
    if (!el) return;
    if (!isStepEnabled(5)) {
      el.innerHTML = `<div class="engine-empty">먼저 도서를 선택해야 보고서 전개 방식을 고를 수 있습니다.</div>`;
      return;
    }
    const meta = window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    }) : { modeOptions: [] };
    const options = meta.modeOptions || [];
    el.innerHTML = `<div class="engine-mode-grid">${options.map(option => `
      <button type="button" class="engine-mode-card ${state.reportMode === option.id ? "is-active" : ""}" data-action="mode" data-value="${escapeHtml(option.id)}">
        <div class="engine-mode-title">${escapeHtml(option.label)}</div>
        <div class="engine-mode-desc">${escapeHtml(option.desc)}</div>
      </button>
    `).join("")}</div>`;
  }

  function renderViewArea() {
    const el = $("engineViewButtons");
    if (!el) return;
    if (!isStepEnabled(6)) {
      el.innerHTML = `<div class="engine-empty">먼저 보고서 전개 방식을 선택해야 관점 선택이 열립니다.</div>`;
      return;
    }
    const meta = window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    }) : { viewOptions: [] };
    const options = meta.viewOptions || [];
    el.innerHTML = `<div class="engine-chip-wrap">${options.map(view => `
      <button type="button" class="engine-chip ${state.reportView === view ? "is-active" : ""}" data-action="view" data-value="${escapeHtml(view)}">${escapeHtml(view)}</button>
    `).join("")}</div>`;
  }

  function applyLocks() {
    [3,4,5,6].forEach(step => {
      const block = document.querySelector(`.engine-step-block[data-step="${step}"]`);
      if (block) block.classList.toggle("locked", !isStepEnabled(step));
    });
  }

  function renderSelectionSummary() {
    const el = $("engineSelectionSummary");
    const payloadEl = $("engineMiniPayload");
    if (!el || !payloadEl) return;

    const chips = [
      state.subject,
      state.career,
      state.concept,
      state.keyword,
      state.selectedBookTitle || state.selectedBook,
      getModeLabel(state.reportMode),
      state.reportView
    ].filter(Boolean).map(v => `<span class="engine-tag">${escapeHtml(v)}</span>`).join("");

    el.innerHTML = chips || `<div class="engine-empty">아직 MINI로 넘길 선택 데이터가 없습니다.</div>`;

    const payload = buildMiniPayload();
    payloadEl.innerHTML = `
      <strong>MINI 전달 구조</strong><br>
      과목: ${escapeHtml(payload.student_context.subject || "-")}<br>
      진로: ${escapeHtml(payload.student_context.career || "-")}<br>
      교과 개념: ${escapeHtml(payload.concept_context.concept || "-")}<br>
      교과 키워드: ${escapeHtml(payload.concept_context.keyword || "-")}<br>
      도서: ${escapeHtml(payload.book_context.title || "-")}<br>
      보고서 방식: ${escapeHtml(payload.report_context.mode_label || "-")}<br>
      보고서 관점: ${escapeHtml(payload.report_context.view || "-")}
    `;
  }

  function getModeLabel(id) {
    const labelMap = {
      principle: "원리 파악형",
      compare: "비교 분석형",
      data: "데이터 확장형",
      application: "사례 적용형",
      major: "전공 확장형"
    };
    return labelMap[id] || id || "";
  }

  function syncOutputFields() {
    const keywordInput = $("keyword");
    if (keywordInput) keywordInput.value = state.keyword || "";
    if ($("selectedConcept")) $("selectedConcept").value = state.concept || "";
    if ($("selectedBookId")) $("selectedBookId").value = state.selectedBook || "";
    if ($("selectedBookTitle")) $("selectedBookTitle").value = state.selectedBookTitle || "";
    if ($("reportMode")) $("reportMode").value = state.reportMode || "";
    if ($("reportView")) $("reportView").value = state.reportView || "";
    if ($("miniNavigationPayload")) $("miniNavigationPayload").value = JSON.stringify(buildMiniPayload());
  }

  function buildMiniPayload() {
    const bookDetail = window.getSelectedBookDetail ? window.getSelectedBookDetail(state.selectedBook) : null;
    return {
      student_context: {
        subject: state.subject,
        career: state.career
      },
      concept_context: {
        concept: state.concept,
        keyword: state.keyword
      },
      book_context: {
        book_id: state.selectedBook,
        title: state.selectedBookTitle,
        author: bookDetail?.author || "",
        summary_short: bookDetail?.summary_short || ""
      },
      report_context: {
        mode: state.reportMode,
        mode_label: getModeLabel(state.reportMode),
        view: state.reportView
      },
      task_context: {
        task_name: $("taskName")?.value || "",
        task_type: $("taskType")?.value || "",
        usage_purpose: $("usagePurpose")?.value || "",
        task_description: $("taskDescription")?.value || ""
      }
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
