window.__TOPIC_GENERATOR_VERSION = "v13.0-career-first-filtered-sync";

(function(){

  function esc(v){
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  const FILTER_MAP_URL = "seed/book-engine/book_recommendation_filter_mapping.json";
  const BOOKS_URL = "seed/book-engine/mini_book_engine_books_starter.json";

  const CAREER_BOOK_MAP = {
    "지구환경": [
      { id: "book_cosmos_intro", title: "코스모스" },
      { id: "book_science_history", title: "과학혁명의 법칙" },
      { id: "book_science_guide", title: "과학의 눈으로 세상 읽기" }
    ],
    "환경 데이터": [
      { id: "book_science_guide", title: "과학의 눈으로 세상 읽기" },
      { id: "book_cosmos_intro", title: "코스모스" }
    ],
    "컴퓨터": [
      { id: "book_1984", title: "1984" },
      { id: "book_gyeongyeonghak", title: "경영학 콘서트" }
    ],
    "데이터": [
      { id: "book_gyeongyeonghak", title: "경영학 콘서트" },
      { id: "book_1984", title: "1984" }
    ],
    "의학": [
      { id: "book_doctorsignal", title: "닥터스 씽킹" },
      { id: "book_medical_thinking", title: "의학적 사고의 법칙" }
    ],
    "간호": [
      { id: "book_doctorsignal", title: "닥터스 씽킹" }
    ],
    "배터리": [
      { id: "book_science_guide", title: "과학의 눈으로 세상 읽기" },
      { id: "book_gyeongyeonghak", title: "경영학 콘서트" }
    ],
    "반도체": [
      { id: "book_gyeongyeonghak", title: "경영학 콘서트" },
      { id: "book_science_guide", title: "과학의 눈으로 세상 읽기" }
    ]
  };

  const runtime = {
    books: [],
    booksById: new Map(),
    filterRules: []
  };

  function preloadData(){
    Promise.allSettled([
      fetch(BOOKS_URL, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(FILTER_MAP_URL, { cache: "no-store" }).then(r => r.ok ? r.json() : { subject_keyword_rules: [] })
    ]).then(([booksRes, filterRes]) => {
      runtime.books = Array.isArray(booksRes.value) ? booksRes.value : [];
      runtime.booksById = new Map(runtime.books.map(book => [String(book.book_id || "").trim(), book]));
      const rules = filterRes.value?.subject_keyword_rules;
      runtime.filterRules = Array.isArray(rules) ? rules : [];
    }).catch(error => {
      console.warn("topic generator preload failed:", error);
    });
  }

  function getBooksByCareer(career){
    const raw = String(career || "").trim();
    if (!raw) return [];
    if (CAREER_BOOK_MAP[raw]) return CAREER_BOOK_MAP[raw];

    const entries = Object.entries(CAREER_BOOK_MAP);
    const found = entries.find(([key]) => raw.includes(key) || key.includes(raw));
    return found ? found[1] : [];
  }

  function normalizeText(value){
    return String(value || "").trim().toLowerCase();
  }

  function includesLoose(targetList, value){
    const needle = normalizeText(value);
    if (!needle || !Array.isArray(targetList)) return false;
    return targetList.some(item => {
      const current = normalizeText(item);
      return current && (current === needle || current.includes(needle) || needle.includes(current));
    });
  }

  function getMatchingRules(subject, concept, career){
    return runtime.filterRules.filter(rule => {
      const subjectOk = includesLoose(rule.subjects, subject);
      if (!subjectOk) return false;

      const conceptOk = !concept || !Array.isArray(rule.concepts) || rule.concepts.length === 0 || includesLoose(rule.concepts, concept);
      if (!conceptOk) return false;

      if (!career) return true;
      const recommendedViews = Array.isArray(rule.recommended_views) ? rule.recommended_views : [];
      const recommendedModes = Array.isArray(rule.recommended_modes) ? rule.recommended_modes : [];
      const careerLoose = normalizeText(career);
      return !!careerLoose || recommendedViews.length >= 0 || recommendedModes.length >= 0;
    });
  }

  function toBookObject(input){
    if (!input) return null;
    const id = String(input.id || input.book_id || "").trim();
    if (!id) return null;
    const fromCatalog = runtime.booksById.get(id);
    if (fromCatalog) {
      return {
        id,
        title: fromCatalog.title || input.title || id,
        author: fromCatalog.author || ""
      };
    }
    return {
      id,
      title: input.title || id,
      author: input.author || ""
    };
  }

  function dedupeBooks(list){
    const seen = new Set();
    const out = [];
    list.forEach(item => {
      const book = toBookObject(item);
      if (!book || seen.has(book.id)) return;
      seen.add(book.id);
      out.push(book);
    });
    return out;
  }

  function resolveBooks(subject, concept, career){
    const careerBooks = dedupeBooks(getBooksByCareer(career));
    const matchingRules = getMatchingRules(subject, concept, career);

    const recommendedFromRules = dedupeBooks(
      matchingRules.flatMap(rule => (Array.isArray(rule.recommended_books) ? rule.recommended_books : []).map(bookId => ({ id: bookId })))
    );

    const blockedBookIds = new Set(
      matchingRules.flatMap(rule => Array.isArray(rule.blocked_books) ? rule.blocked_books : [])
    );

    let merged = dedupeBooks([
      ...recommendedFromRules,
      ...careerBooks
    ]);

    if (blockedBookIds.size > 0) {
      merged = merged.filter(book => !blockedBookIds.has(book.id));
    }

    return {
      books: merged,
      matchingRules,
      blockedBookIds
    };
  }

  function renderBooks(books, selectedBook){
    return books.map((b, i) => {
      const active = selectedBook ? selectedBook === b.id : i === 0;
      return `
        <button
          type="button"
          class="book-chip ${active ? "is-active" : ""}"
          data-kind="book"
          data-value="${esc(b.id)}"
          data-title="${esc(b.title)}"
        >
          ${esc(b.title)}
        </button>
      `;
    }).join("");
  }

  function getSelectedBookTitle(root){
    const btn = root.querySelector(".book-chip[data-kind='book'].is-active");
    return btn?.getAttribute("data-title") || btn?.textContent?.trim() || "";
  }

  function updateResultBox(root){
    const result = root.querySelector(".book-result-box");
    if (!result) return;
    const title = getSelectedBookTitle(root);
    result.innerHTML = `
      진로 → 도서 → 교과 개념 흐름으로 탐구가 생성됩니다.<br>
      <strong>선택된 도서:</strong> ${esc(title)}
    `;
  }

  function bindInteractions(root){
    if (!root || root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    root.addEventListener("click", function(e){
      const chip = e.target.closest(".book-chip[data-kind='book']");
      if (!chip) return;

      root.querySelectorAll(".book-chip[data-kind='book']").forEach(btn => btn.classList.remove("is-active"));
      chip.classList.add("is-active");
      updateResultBox(root);

      const selectedBookId = chip.getAttribute("data-value") || "";
      const selectedBookTitle = chip.getAttribute("data-title") || chip.textContent?.trim() || "";

      if (window.__TEXTBOOK_HELPER_API__?.setSelectedBook) {
        window.__TEXTBOOK_HELPER_API__.setSelectedBook(selectedBookId, selectedBookTitle);
        return;
      }

      if (window.__TEXTBOOK_HELPER_STATE__) {
        window.__TEXTBOOK_HELPER_STATE__.selectedBook = selectedBookId;
        window.__TEXTBOOK_HELPER_STATE__.selectedBookTitle = selectedBookTitle;
      }
      if (typeof window.__TEXTBOOK_HELPER_RENDER__ === "function") {
        window.__TEXTBOOK_HELPER_RENDER__();
      }
    });
  }

  function renderRuleGuide(matchingRules){
    if (!Array.isArray(matchingRules) || matchingRules.length === 0) return "";

    const firstRule = matchingRules[0];
    const modes = Array.isArray(firstRule.recommended_modes) ? firstRule.recommended_modes.join(", ") : "";
    const views = Array.isArray(firstRule.recommended_views) ? firstRule.recommended_views.join(", ") : "";

    if (!modes && !views) return "";

    return `
      <div class="book-desc">
        추천 기준: ${views ? `관점 ${esc(views)}` : ""}${views && modes ? " / " : ""}${modes ? `방식 ${esc(modes)}` : ""}
      </div>
    `;
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";
    const selectedBook = ctx?.selectedBook || "";

    if (!subject || !career){
      return "";
    }

    const { books, matchingRules } = resolveBooks(subject, concept, career);

    if (books.length === 0){
      return `
        <div class="book-puzzle-root">
          <div class="book-result-box">
            현재 이 진로와 연결되는 도서 데이터가 없습니다.
          </div>
        </div>
      `;
    }

    const firstTitle = selectedBook
      ? (books.find(book => book.id === selectedBook)?.title || books[0].title)
      : books[0].title;

    const html = `
      <div class="book-puzzle-root" data-career="${esc(career)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}">
        <h4>진로 기반 도서 추천</h4>

        <div class="book-step">
          <div class="book-step-label">1. 진로 기반 도서 선택</div>
          <div class="book-chip-wrap">
            ${renderBooks(books, selectedBook)}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">2. 교과 개념 연결</div>
          <div class="book-desc">
            선택한 도서와 ${esc(concept || "교과 개념")}을 연결하여 탐구를 진행합니다.
          </div>
          ${renderRuleGuide(matchingRules)}
        </div>

        <div class="book-result-box">
          진로 → 도서 → 교과 개념 흐름으로 탐구가 생성됩니다.<br>
          <strong>선택된 도서:</strong> ${esc(firstTitle)}
        </div>
      </div>
    `;

    setTimeout(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(bindInteractions);
    }, 0);

    return html;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preloadData);
  } else {
    preloadData();
  }

})();
