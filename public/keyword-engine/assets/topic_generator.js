window.__TOPIC_GENERATOR_VERSION = "v8.0-book-puzzle-connected";

(function(){
  const BOOKS_URL = "seed/book-engine/mini_book_engine_books_starter.json";
  const FALLBACK_BOOKS = [{"book_id": "book_1984", "title": "1984", "author": "조지 오웰", "summary_short": "감시와 통제, 언어 조작을 통해 사회가 개인의 사고를 어떻게 제한하는지 다루는 작품", "book_keywords": ["감시", "통제", "언어", "권력", "사회 시스템"], "starter_questions": ["감시 사회는 어디까지 허용될 수 있는가?", "언어가 사고를 바꿀 수 있는가?", "기술은 사회를 더 안전하게 만드는가, 더 통제하게 만드는가?"], "linked_subjects": ["통합사회", "정보", "공통국어"], "linked_majors": ["사회학과", "행정학과", "컴퓨터공학과"]}, {"book_id": "book_galmaegi", "title": "갈매기", "author": "안톤 체호프", "summary_short": "인물의 욕망과 좌절, 예술관의 충돌을 통해 감정과 관계를 탐구하는 작품", "book_keywords": ["욕망", "감정", "관계", "예술", "무의식"], "starter_questions": ["예술적 이상과 현실적 제약은 어떻게 충돌하는가?", "인물의 감정 변화는 어떤 계기로 나타나는가?", "관계 속 상처는 선택에 어떤 영향을 주는가?"], "linked_subjects": ["문학", "공통국어", "심리학 기초"], "linked_majors": ["심리학과", "국어국문학과", "연극영화과"]}, {"book_id": "book_gyeongyeonghak", "title": "경영학 콘서트", "author": "장영재", "summary_short": "데이터와 시스템 사고로 기업의 의사결정 구조와 효율 문제를 설명하는 책", "book_keywords": ["데이터", "의사결정", "효율", "시스템", "최적화"], "starter_questions": ["데이터 기반 의사결정은 기업에 어떤 변화를 만드는가?", "효율을 높이는 시스템은 항상 공정한가?", "ESG 전략은 기업 성과와 어떤 관계가 있는가?"], "linked_subjects": ["정보", "수학", "경제"], "linked_majors": ["경영학과", "산업공학과", "통계학과"]}, {"book_id": "book_doctorsignal", "title": "닥터스 씽킹", "author": "제롬 그루프만", "summary_short": "의사의 사고 과정과 진단 오류, 판단의 편향을 다루는 책", "book_keywords": ["진단", "오류", "판단", "편향", "증거"], "starter_questions": ["의사의 판단에서 오류는 왜 생기는가?", "증거 기반 판단은 어떻게 더 나은 결정을 돕는가?", "데이터와 직관은 어떤 관계인가?"], "linked_subjects": ["생명과학", "통계", "정보", "윤리"], "linked_majors": ["의예과", "간호학과", "보건행정학과"]}, {"book_id": "book_demian", "title": "데미안", "author": "헤르만 헤세", "summary_short": "자아 발견과 성장, 내면의 갈등을 통해 정체성을 찾아가는 과정을 다룬 작품", "book_keywords": ["자아", "성장", "정체성", "갈등", "선택"], "starter_questions": ["자아를 찾아가는 과정에서 사회 규범은 어떤 영향을 주는가?", "성장은 왜 갈등을 통해 이루어지는가?", "진짜 나를 찾는다는 것은 무엇을 의미하는가?"], "linked_subjects": ["문학", "윤리", "심리학 기초"], "linked_majors": ["심리학과", "철학과", "교육학과"]}];
  let bookSeed = null;
  let listenersBound = false;

  function $(id){ return document.getElementById(id); }

  async function loadBooks(){
    if (bookSeed) return bookSeed;
    try {
      const res = await fetch(BOOKS_URL, { cache: "no-store" });
      if(res.ok){
        bookSeed = await res.json();
        return bookSeed;
      }
    } catch(e) {}
    bookSeed = FALLBACK_BOOKS;
    return bookSeed;
  }

  function esc(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function modeLabel(mode){
    const map = {
      case: "사례 조사",
      compare: "비교 탐구",
      application: "응용 탐구",
      career: "진로 연결"
    };
    return map[mode] || "사례 조사";
  }

  function getCurrentBook(root){
    const bookId = root.querySelector('.book-chip[data-kind="book"].is-active')?.getAttribute("data-value");
    const books = bookSeed || FALLBACK_BOOKS;
    return books.find(b => b.book_id === bookId) || books[0];
  }

  function createTitle(payload){
    if(payload.mode === "case"){
      return `『${payload.book_title}』의 "${payload.book_question}"를 바탕으로 ${payload.keyword}을(를) 사례 조사하기`;
    }
    if(payload.mode === "compare"){
      return `『${payload.book_title}』의 "${payload.book_question}"를 바탕으로 ${payload.keyword}을(를) 비교 탐구하기`;
    }
    if(payload.mode === "application"){
      return `『${payload.book_title}』의 문제의식을 바탕으로 ${payload.keyword}이(가) ${payload.career} 방향에서 어떻게 적용되는지 탐구하기`;
    }
    return `『${payload.book_title}』의 "${payload.book_question}"를 바탕으로 ${payload.keyword}을(를) ${payload.career}와 연결해 탐구하기`;
  }

  function buildPayload(root){
    const book = getCurrentBook(root);
    const question = root.querySelector('.book-chip[data-kind="question"].is-active')?.getAttribute("data-value") || (book.starter_questions?.[0] || "");
    const mode = root.querySelector('.book-chip[data-kind="mode"].is-active')?.getAttribute("data-value") || "case";
    const keyword = root.getAttribute("data-keyword") || "";
    const subject = root.getAttribute("data-subject") || "";
    const concept = root.getAttribute("data-concept") || "";
    const career = root.getAttribute("data-career") || "";

    const payload = {
      source_type: "book_centered_inquiry",
      book_id: book.book_id,
      book_title: book.title,
      book_author: book.author,
      book_summary_short: book.summary_short,
      book_keywords: book.book_keywords || [],
      book_question: question,
      subject,
      concept,
      keyword,
      mode,
      mode_label: modeLabel(mode),
      linked_career: career,
      linked_subjects_from_book: book.linked_subjects || [],
      linked_majors_from_book: book.linked_majors || []
    };

    payload.final_title = createTitle(payload);
    return payload;
  }

  function miniBlock(payload){
    return `[MINI_REPORT_INPUT_JSON]\n${JSON.stringify(payload, null, 2)}\n\n[MINI_REPORT_INSTRUCTION]\n위 JSON만 기준으로 고등학생 수준의 독서 기반 수행평가 보고서 초안을 작성해줘.\n조건:\n1. 도서의 문제의식이 서론에 드러날 것\n2. 선택한 질문과 교과 키워드가 본문에서 연결될 것\n3. linked_career가 결론 또는 확장 방향에 드러날 것\n4. 과장 없이 학생 제출형 문장으로 쓸 것`;
  }

  function renderQuestions(root){
    const book = getCurrentBook(root);
    const wrap = root.querySelector(".book-question-wrap");
    if(!wrap) return;
    wrap.innerHTML = (book.starter_questions || []).map((q, i) => `
      <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="question" data-value="${esc(q)}">${esc(q)}</button>
    `).join("");
  }

  function updateResult(root){
    const payload = buildPayload(root);
    const titleEl = root.querySelector(".book-final-title");
    const textarea = root.querySelector(".book-mini-payload");
    if(titleEl) titleEl.textContent = payload.final_title;
    if(textarea) textarea.value = miniBlock(payload);
  }

  function applyToTaskDescription(root){
    const taskDesc = $("taskDescription");
    const payloadText = root.querySelector(".book-mini-payload")?.value || "";
    if(!taskDesc || !payloadText) return;

    const cleaned = (taskDesc.value || "").replace(/\n*\[MINI_REPORT_INPUT_JSON\][\s\S]*$/m, "").trim();
    taskDesc.value = cleaned ? `${cleaned}\n\n${payloadText}` : payloadText;

    const notice = root.querySelector(".book-copy-notice");
    if(notice){
      notice.textContent = "도서 기반 JSON이 수행평가 설명 칸에 반영됐어요.";
      notice.style.display = "block";
      setTimeout(() => { notice.style.display = "none"; }, 2200);
    }
  }

  function bindEvents(){
    if(listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", function(event){
      const chip = event.target.closest(".book-chip");
      if(chip){
        const root = chip.closest(".book-puzzle-root");
        if(!root) return;
        const kind = chip.getAttribute("data-kind");
        if(chip.classList.contains("is-active")) return;

        root.querySelectorAll(`.book-chip[data-kind="${kind}"]`).forEach(btn => btn.classList.remove("is-active"));
        chip.classList.add("is-active");

        if(kind === "book"){
          renderQuestions(root);
        }
        updateResult(root);
        return;
      }

      const btn = event.target.closest(".book-apply-btn");
      if(btn){
        const root = btn.closest(".book-puzzle-root");
        if(root) applyToTaskDescription(root);
      }
    });
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const keyword = ctx?.keyword || "";
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";

    if(!keyword || !career) return "";
    bindEvents();

    const books = bookSeed || FALLBACK_BOOKS;
    const firstBook = books[0];
    const initialPayload = {
      source_type: "book_centered_inquiry",
      book_id: firstBook.book_id,
      book_title: firstBook.title,
      book_author: firstBook.author,
      book_summary_short: firstBook.summary_short,
      book_keywords: firstBook.book_keywords || [],
      book_question: firstBook.starter_questions?.[0] || "",
      subject,
      concept,
      keyword,
      mode: "case",
      mode_label: "사례 조사",
      linked_career: career,
      linked_subjects_from_book: firstBook.linked_subjects || [],
      linked_majors_from_book: firstBook.linked_majors || []
    };
    initialPayload.final_title = createTitle(initialPayload);

    loadBooks().then(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(root => {
        renderQuestions(root);
        updateResult(root);
      });
    });

    return `
      <div class="book-puzzle-root" data-keyword="${esc(keyword)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}" data-career="${esc(career)}">
        <div class="book-puzzle-head">
          <h4>5. 도서에서 시작하는 탐구 퍼즐</h4>
          <div class="book-puzzle-guide">도서 → 질문 → 탐구 제목 완성</div>
        </div>

        <p class="book-puzzle-desc">학생이 책 전체를 읽지 않아도 되도록, 도서를 고르면 시스템이 질문과 연결 방향을 먼저 제공해 줍니다.</p>

        <div class="book-step">
          <div class="book-step-label">1. 먼저, 어떤 도서에서 시작할까?</div>
          <div class="book-chip-wrap">
            ${books.map((b, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="book" data-value="${esc(b.book_id)}">${esc(b.title)}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">2. 이 도서에서 어떤 질문으로 시작할까?</div>
          <div class="book-chip-wrap book-question-wrap">
            ${(firstBook.starter_questions || []).map((q, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="question" data-value="${esc(q)}">${esc(q)}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">3. 어떤 방식으로 탐구할까?</div>
          <div class="book-chip-wrap">
            <button type="button" class="book-chip is-active" data-kind="mode" data-value="case">사례 조사</button>
            <button type="button" class="book-chip" data-kind="mode" data-value="compare">비교 탐구</button>
            <button type="button" class="book-chip" data-kind="mode" data-value="application">응용 탐구</button>
            <button type="button" class="book-chip" data-kind="mode" data-value="career">진로 연결</button>
          </div>
        </div>

        <div class="book-result-box">
          <div class="book-result-label">자동 생성 탐구 보고서 제목</div>
          <div class="book-final-title">${esc(initialPayload.final_title)}</div>
        </div>

        <textarea class="book-mini-payload" style="display:none;">${esc(miniBlock(initialPayload))}</textarea>
        <button type="button" class="book-apply-btn">보고서 만들기</button>
        <div class="book-copy-notice" style="display:none;"></div>
      </div>
    `;
  };
})();
