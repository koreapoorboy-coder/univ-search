
window.__TOPIC_GENERATOR_VERSION = "v12.1-career-first-sync-fix";

(function(){

  function esc(v){
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

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

  function getBooksByCareer(career){
    const raw = String(career || "").trim();
    if (!raw) return [];
    if (CAREER_BOOK_MAP[raw]) return CAREER_BOOK_MAP[raw];

    const entries = Object.entries(CAREER_BOOK_MAP);
    const found = entries.find(([key]) => raw.includes(key) || key.includes(raw));
    return found ? found[1] : [];
  }

  function renderBooks(books){
    return books.map((b, i) => `
      <button
        type="button"
        class="book-chip ${i === 0 ? "is-active" : ""}"
        data-kind="book"
        data-value="${esc(b.id)}"
        data-title="${esc(b.title)}"
      >
        ${esc(b.title)}
      </button>
    `).join("");
  }

  function getSelectedBookTitle(root){
    const btn = root.querySelector(".book-chip[data-kind='book'].is-active");
    return btn?.getAttribute("data-title") || btn?.textContent?.trim() || "";
  }

  function bindInteractions(root){
    if (!root || root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    root.addEventListener("click", function(e){
      const chip = e.target.closest(".book-chip[data-kind='book']");
      if (!chip) return;

      root.querySelectorAll(".book-chip[data-kind='book']").forEach(btn => btn.classList.remove("is-active"));
      chip.classList.add("is-active");

      const result = root.querySelector(".book-result-box");
      if (result){
        const title = getSelectedBookTitle(root);
        result.innerHTML = `
          진로 → 도서 → 교과 개념 흐름으로 탐구가 생성됩니다.<br>
          <strong>선택된 도서:</strong> ${esc(title)}
        `;
      }
    });
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";

    if (!subject || !career){
      return "";
    }

    const books = getBooksByCareer(career);

    if (books.length === 0){
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
            ${renderBooks(books)}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">2. 교과 개념 연결</div>
          <div class="book-desc">
            선택한 도서와 ${esc(concept || "교과 개념")}을 연결하여 탐구를 진행합니다.
          </div>
        </div>

        <div class="book-result-box">
          진로 → 도서 → 교과 개념 흐름으로 탐구가 생성됩니다.<br>
          <strong>선택된 도서:</strong> ${esc(books[0].title)}
        </div>
      </div>
    `;

    setTimeout(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(bindInteractions);
    }, 0);

    return html;
  };

})();
