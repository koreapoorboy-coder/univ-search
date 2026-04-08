window.__TOPIC_GENERATOR_VERSION = "v14.0-book-catalog-driven";

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

  const CAREER_SEED = {
    science: {
      keywords: ["지구", "환경", "천문", "우주", "과학", "물리", "화학", "생명", "배터리", "반도체", "신소재", "에너지"],
      books: ["book_cosmos_intro", "book_science_history", "book_science_guide", "book_objectivity_blade"]
    },
    medical: {
      keywords: ["의학", "의료", "간호", "보건", "의생명", "의예", "약", "치", "한의"],
      books: ["book_doctorsignal", "book_medical_thinking", "book_science_guide"]
    },
    data: {
      keywords: ["컴퓨터", "소프트웨어", "ai", "인공지능", "데이터", "정보", "보안", "통계", "경영", "산업"],
      books: ["book_gyeongyeonghak", "book_1984", "book_science_guide", "book_objectivity_blade"]
    },
    society: {
      keywords: ["행정", "정치", "정책", "법", "사회", "경제", "윤리", "철학"],
      books: ["book_republic", "book_mokminsimseo", "book_tyranny_merit", "book_1984", "book_gwangjang"]
    },
    literature: {
      keywords: ["문학", "국어", "콘텐츠", "스토리", "심리", "상담", "교육", "예술"],
      books: ["book_demian", "book_galmaegi", "book_greek_tragedy", "book_genji", "book_gwangjang"]
    }
  };

  const SUBJECT_SEED = {
    "통합과학1": ["book_science_guide", "book_cosmos_intro", "book_science_history", "book_objectivity_blade"],
    "과학탐구실험1": ["book_objectivity_blade", "book_science_history", "book_science_guide"],
    "과학탐구실험2": ["book_objectivity_blade", "book_science_history", "book_science_guide"],
    "생명과학": ["book_doctorsignal", "book_medical_thinking", "book_science_guide"],
    "물리학": ["book_cosmos_intro", "book_science_history", "book_objectivity_blade"],
    "화학": ["book_science_history", "book_objectivity_blade", "book_science_guide"],
    "정보": ["book_gyeongyeonghak", "book_1984", "book_science_guide"],
    "공통수학1": ["book_gyeongyeonghak", "book_objectivity_blade", "book_science_guide"],
    "공통수학2": ["book_gyeongyeonghak", "book_objectivity_blade", "book_science_guide"],
    "통합사회": ["book_tyranny_merit", "book_1984", "book_republic", "book_mokminsimseo"],
    "공통국어": ["book_demian", "book_galmaegi", "book_gwangjang", "book_nanjangi"]
  };

  const runtime = {
    books: [],
    booksById: new Map(),
    subjectRules: [],
    careerRules: []
  };

  function normalizeText(value){
    return String(value || "").trim().toLowerCase();
  }

  function tokenize(value){
    return normalizeText(value)
      .replace(/[()\[\],.]/g, " ")
      .split(/\s+|\/|·|,|-/)
      .map(v => v.trim())
      .filter(Boolean);
  }

  function includesLoose(targetList, value){
    const needle = normalizeText(value);
    if (!needle || !Array.isArray(targetList)) return false;
    return targetList.some(item => {
      const current = normalizeText(item);
      return current && (current === needle || current.includes(needle) || needle.includes(current));
    });
  }

  function preloadData(){
    Promise.allSettled([
      fetch(BOOKS_URL, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(FILTER_MAP_URL, { cache: "no-store" }).then(r => r.ok ? r.json() : { subject_keyword_rules: [], career_rules: [] })
    ]).then(([booksRes, filterRes]) => {
      runtime.books = Array.isArray(booksRes.value) ? booksRes.value : [];
      runtime.booksById = new Map(runtime.books.map(book => [String(book.book_id || "").trim(), book]));
      runtime.subjectRules = Array.isArray(filterRes.value?.subject_keyword_rules) ? filterRes.value.subject_keyword_rules : [];
      runtime.careerRules = Array.isArray(filterRes.value?.career_rules) ? filterRes.value.career_rules : [];
    }).catch(error => {
      console.warn("topic generator preload failed:", error);
    });
  }

  function toBookObject(input){
    const id = String(input?.id || input?.book_id || input || "").trim();
    if (!id) return null;
    const fromCatalog = runtime.booksById.get(id);
    if (!fromCatalog) return { id, title: input?.title || id, author: input?.author || "" };
    return { id, title: fromCatalog.title || id, author: fromCatalog.author || "" };
  }

  function dedupeBooks(list){
    const out = [];
    const seen = new Set();
    list.forEach(item => {
      const book = toBookObject(item);
      if (!book || seen.has(book.id)) return;
      seen.add(book.id);
      out.push(book);
    });
    return out;
  }

  function getSubjectRules(subject, concept){
    return runtime.subjectRules.filter(rule => {
      if (!includesLoose(rule.subjects, subject)) return false;
      if (!concept) return true;
      if (!Array.isArray(rule.concepts) || rule.concepts.length === 0) return true;
      return includesLoose(rule.concepts, concept);
    });
  }

  function getCareerMatchedSeedBooks(career){
    const raw = String(career || "").trim();
    const tokens = tokenize(raw);
    const out = [];

    Object.values(CAREER_SEED).forEach(seed => {
      const hit = seed.keywords.some(keyword => {
        const k = normalizeText(keyword);
        return raw.toLowerCase().includes(k) || tokens.some(token => token.includes(k) || k.includes(token));
      });
      if (hit) {
        seed.books.forEach(id => out.push({ id }));
      }
    });

    runtime.careerRules.forEach(rule => {
      const matched = (rule.career_keywords || []).some(keyword => {
        const k = normalizeText(keyword);
        return raw.toLowerCase().includes(k) || tokens.some(token => token.includes(k) || k.includes(token));
      });
      if (matched) {
        (rule.preferred_books || []).forEach(id => out.push({ id }));
      }
    });

    return dedupeBooks(out);
  }

  function scoreBook(book, ctx, subjectRules, blockedSet){
    if (!book || blockedSet.has(book.book_id)) return -999;
    let score = 0;
    const careerRaw = String(ctx.career || "");
    const careerTokens = tokenize(careerRaw);

    if ((SUBJECT_SEED[ctx.subject] || []).includes(book.book_id)) score += 2;

    subjectRules.forEach(rule => {
      if ((rule.recommended_books || []).includes(book.book_id)) score += 6;
      if ((rule.blocked_books || []).includes(book.book_id)) score -= 100;
    });

    const majors = Array.isArray(book.linked_majors) ? book.linked_majors : [];
    const keywords = Array.isArray(book.fit_keywords) ? book.fit_keywords : [];
    const subjects = Array.isArray(book.linked_subjects) ? book.linked_subjects : [];

    if (subjects.some(s => normalizeText(s) === normalizeText(ctx.subject))) score += 2;

    careerTokens.forEach(token => {
      if (majors.some(m => normalizeText(m).includes(token) || token.includes(normalizeText(m)))) score += 4;
      if (keywords.some(k => normalizeText(k).includes(token) || token.includes(normalizeText(k)))) score += 3;
      if (normalizeText(book.title).includes(token)) score += 2;
    });

    if (careerRaw) {
      Object.values(CAREER_SEED).forEach(seed => {
        const hit = seed.keywords.some(keyword => careerRaw.toLowerCase().includes(normalizeText(keyword)));
        if (hit && seed.books.includes(book.book_id)) score += 5;
      });
    }

    return score;
  }

  function resolveBooks(subject, concept, career){
    const subjectRules = getSubjectRules(subject, concept);
    const blockedSet = new Set(subjectRules.flatMap(rule => Array.isArray(rule.blocked_books) ? rule.blocked_books : []));

    const seeded = dedupeBooks([
      ...(SUBJECT_SEED[subject] || []).map(id => ({ id })),
      ...getCareerMatchedSeedBooks(career),
      ...subjectRules.flatMap(rule => (rule.recommended_books || []).map(id => ({ id }))),
      ...runtime.books.map(book => ({ id: book.book_id }))
    ]);

    const scored = seeded
      .map(book => ({ book, score: scoreBook(runtime.booksById.get(book.id) || { book_id: book.id, title: book.title }, { subject, concept, career }, subjectRules, blockedSet) }))
      .filter(item => item.score > -50)
      .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title, "ko"));

    return {
      books: scored.slice(0, 6).map(item => item.book),
      matchingRules: subjectRules
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

    if (!subject || !career) return "";

    const { books, matchingRules } = resolveBooks(subject, concept, career);

    if (!books.length){
      return `
        <div class="book-puzzle-root">
          <div class="book-result-box">
            현재 이 진로와 연결되는 도서 데이터가 없습니다.
          </div>
        </div>
      `;
    }

    const html = `
      <div class="book-puzzle-root" data-career="${esc(career)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}">
        <h4>진로 기반 도서 추천</h4>

        <div class="book-step">
          <div class="book-step-label">1. 진로 기반 도서 선택</div>
          <div class="book-chip-wrap">
            ${renderBooks(books, selectedBook)}
          </div>
        </div>

        ${renderRuleGuide(matchingRules)}

        <div class="book-step">
          <div class="book-step-label">2. 교과 개념 연결</div>
          <div class="book-desc">
            선택한 도서와 ${esc(concept || "교과 개념")}을 연결하여 탐구를 진행합니다.
          </div>
        </div>

        <div class="book-result-box">
          진로 → 도서 → 교과 개념 흐름으로 탐구가 생성됩니다.<br>
          <strong>선택된 도서:</strong> ${esc(selectedBook ? (books.find(b => b.id === selectedBook)?.title || books[0]?.title || "") : (books[0]?.title || ""))}
        </div>
      </div>
    `;

    setTimeout(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(bindInteractions);
    }, 0);

    return html;
  };

  preloadData();
})();
