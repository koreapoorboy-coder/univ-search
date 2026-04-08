window.__TOPIC_GENERATOR_VERSION = "v9.0-book-mini-complete";

(function(){
  const BOOKS_URL = "seed/book-engine/mini_book_engine_books_starter.json";
  const PROMPT_URL = "mini/mini_generation_prompt.txt";
  const FALLBACK_BOOKS = [{"book_id": "book_1984", "title": "1984", "author": "조지 오웰", "summary_short": "감시와 통제, 언어 조작을 통해 사회 시스템이 개인을 어떻게 제한하는지 다루는 작품", "book_keywords": ["감시", "통제", "언어", "권력", "사회 시스템"], "starter_questions": ["감시 사회는 어디까지 허용될 수 있는가?", "언어가 사고를 바꿀 수 있는가?", "기술은 사회를 더 안전하게 만드는가, 더 통제하게 만드는가?"], "linked_subjects": ["통합사회", "정보", "공통국어"], "linked_majors": ["사회학과", "행정학과", "컴퓨터공학과"], "fit_keywords": ["감시", "통제", "시스템", "정보 처리", "데이터", "구조"], "fit_modes": ["compare", "career", "case"]}, {"book_id": "book_galmaegi", "title": "갈매기", "author": "안톤 체호프", "summary_short": "인물의 욕망과 좌절, 예술관의 충돌을 통해 감정과 관계를 탐구하는 작품", "book_keywords": ["욕망", "감정", "관계", "예술", "무의식"], "starter_questions": ["예술적 이상과 현실적 제약은 어떻게 충돌하는가?", "인물의 감정 변화는 어떤 계기로 나타나는가?", "관계 속 상처는 선택에 어떤 영향을 주는가?"], "linked_subjects": ["문학", "공통국어", "심리학 기초"], "linked_majors": ["심리학과", "국어국문학과", "연극영화과"], "fit_keywords": ["감정", "관계", "심리", "표현", "변화", "갈등"], "fit_modes": ["compare", "case", "career"]}, {"book_id": "book_gyeongyeonghak", "title": "경영학 콘서트", "author": "장영재", "summary_short": "데이터와 시스템 사고로 기업 의사결정 구조와 효율 문제를 설명하는 책", "book_keywords": ["데이터", "의사결정", "효율", "시스템", "최적화"], "starter_questions": ["데이터 기반 의사결정은 기업에 어떤 변화를 만드는가?", "효율을 높이는 시스템은 항상 공정한가?", "ESG 전략은 기업 성과와 어떤 관계가 있는가?"], "linked_subjects": ["정보", "수학", "경제"], "linked_majors": ["경영학과", "산업공학과", "통계학과"], "fit_keywords": ["데이터", "효율", "분석", "구조", "시스템", "최적화"], "fit_modes": ["case", "application", "career", "compare"]}, {"book_id": "book_doctorsignal", "title": "닥터스 씽킹", "author": "제롬 그루프만", "summary_short": "의사의 사고 과정과 진단 오류, 판단의 편향을 다루는 책", "book_keywords": ["진단", "오류", "판단", "편향", "증거"], "starter_questions": ["의사의 판단에서 오류는 왜 생기는가?", "증거 기반 판단은 어떻게 더 나은 결정을 돕는가?", "데이터와 직관은 어떤 관계인가?"], "linked_subjects": ["생명과학", "통계", "정보", "윤리"], "linked_majors": ["의예과", "간호학과", "보건행정학과"], "fit_keywords": ["자극 반응", "판단", "반응", "오류", "증거", "항상성", "생명"], "fit_modes": ["case", "career", "compare"]}, {"book_id": "book_demian", "title": "데미안", "author": "헤르만 헤세", "summary_short": "자아 발견과 성장, 내면의 갈등을 통해 정체성을 찾아가는 과정을 다룬 작품", "book_keywords": ["자아", "성장", "정체성", "갈등", "선택"], "starter_questions": ["자아를 찾아가는 과정에서 사회 규범은 어떤 영향을 주는가?", "성장은 왜 갈등을 통해 이루어지는가?", "진짜 나를 찾는다는 것은 무엇을 의미하는가?"], "linked_subjects": ["문학", "윤리", "심리학 기초"], "linked_majors": ["심리학과", "철학과", "교육학과"], "fit_keywords": ["성장", "변화", "갈등", "정체성", "심리", "선택"], "fit_modes": ["compare", "career", "application"]}];
  const FALLBACK_PROMPT = "[ROLE]\n너는 교과 개념-도서-수행평가-진로 연결 데이터를 읽고,\n학생 제출형 탐구 제목과 보고서 초안을 생성하는 엔진이다.\n\n[INPUT RULE]\n- 반드시 입력 JSON만 기준으로 해석한다.\n- 입력에 없는 비약적 결론은 만들지 않는다.\n- connection_points의 근거를 우선 사용한다.\n- 제목은 고등학생 수행평가 제출 수준의 자연스러운 한국어로 만든다.\n\n[OUTPUT RULE]\n1. 탐구 제목 3안\n2. 가장 적합한 제목 1안\n3. 제목 선택 이유 3줄\n4. 학생 제출형 보고서 초안(서론-본론-결론)\n5. 생기부 반영형 요약 문장 2안";
  let bookSeed = null;
  let promptText = FALLBACK_PROMPT;
  let listenersBound = false;

  function $(id) { return document.getElementById(id); }

  async function loadBooks(){
    if (bookSeed) return bookSeed;
    try {
      const res = await fetch(BOOKS_URL, { cache: "no-store" });
      if (res.ok) {
        bookSeed = await res.json();
        return bookSeed;
      }
    } catch (e) {}
    bookSeed = FALLBACK_BOOKS;
    return bookSeed;
  }

  async function loadPrompt(){
    try {
      const res = await fetch(PROMPT_URL, { cache: "no-store" });
      if (res.ok) {
        promptText = await res.text();
      }
    } catch (e) {}
    return promptText;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function normalizeText(v) {
    return String(v || "").replace(/\s+/g, "").toLowerCase();
  }

  function getBooks() {
    return bookSeed || FALLBACK_BOOKS;
  }

  function getCurrentBook(root) {
    const bookId = root.querySelector('.book-chip[data-kind="book"].is-active')?.getAttribute("data-value");
    return getBooks().find(b => b.book_id === bookId) || getBooks()[0];
  }

  function modeLabel(mode) {
    const map = {
      case: "사례 조사",
      compare: "비교 탐구",
      application: "응용 탐구",
      career: "진로 연결"
    };
    return map[mode] || "사례 조사";
  }

  function modeHelp(mode) {
    const map = {
      case: "실제 사례를 찾아보는 방식",
      compare: "둘의 차이를 비교해 보는 방식",
      application: "배운 개념이 어디에 쓰이는지 보는 방식",
      career: "관심 진로와 연결해 보는 방식"
    };
    return map[mode] || "실제 사례를 찾아보는 방식";
  }

  function keywordFitsBook(keyword, book) {
    const nk = normalizeText(keyword);
    const fitKeywords = (book.fit_keywords || []).map(normalizeText);
    const bookKeywords = (book.book_keywords || []).map(normalizeText);
    return fitKeywords.some(k => nk.includes(k) || k.includes(nk)) ||
           bookKeywords.some(k => nk.includes(k) || k.includes(nk));
  }

  function sortBooksByKeyword(keyword) {
    return [...getBooks()].sort((a, b) => {
      const aScore = keywordFitsBook(keyword, a) ? 1 : 0;
      const bScore = keywordFitsBook(keyword, b) ? 1 : 0;
      return bScore - aScore;
    });
  }

  function buildConnectionPoints(keyword, book, mode, career) {
    return {
      concept_to_book: [
        {
          strength: keywordFitsBook(keyword, book) ? "high" : "medium",
          reason: `${keyword}은(는) 도서 '${book.title}'의 핵심 문제의식과 연결될 수 있는 출발점이다.`
        }
      ],
      book_to_task: [
        {
          strength: ((book.fit_modes || []).includes(mode)) ? "high" : "medium",
          reason: `'${book.title}'의 질문 구조는 ${modeLabel(mode)} 방식으로 전개하기에 적합하다.`
        }
      ],
      task_to_career: [
        {
          strength: "high",
          reason: `${modeLabel(mode)} 방식은 ${career}와(과) 연결되는 탐구 결과를 만들기에 적합하다.`
        }
      ]
    };
  }

  function buildAllowedNavigation(book) {
    return {
      recommended_questions: book.starter_questions || [],
      recommended_cases: (book.book_keywords || []).slice(0, 3),
      recommended_views: ["원리", "구조", "기능", "비교", "변화", "영향"],
      recommended_modes: ["사례 조사", "비교 탐구", "응용 탐구", "진로 연결"]
    };
  }

  function buildFinalTitle(payload) {
    if (payload.task_context.performance_task_mode === "사례 조사") {
      return `『${payload.book_context.title}』의 "${payload.book_context.selected_question}"를 바탕으로 ${payload.student_context.textbook_keyword}을(를) 사례 조사하기`;
    }
    if (payload.task_context.performance_task_mode === "비교 탐구") {
      return `『${payload.book_context.title}』의 "${payload.book_context.selected_question}"를 바탕으로 ${payload.student_context.textbook_keyword}을(를) 비교 탐구하기`;
    }
    if (payload.task_context.performance_task_mode === "응용 탐구") {
      return `『${payload.book_context.title}』의 문제의식을 바탕으로 ${payload.student_context.textbook_keyword}이(가) ${payload.career_context.target_career} 방향에서 어떻게 적용되는지 탐구하기`;
    }
    return `『${payload.book_context.title}』의 "${payload.book_context.selected_question}"를 바탕으로 ${payload.student_context.textbook_keyword}을(를) ${payload.career_context.target_career}와 연결해 탐구하기`;
  }

  function buildMiniPayload(root) {
    const book = getCurrentBook(root);
    const mode = root.querySelector('.book-chip[data-kind="mode"].is-active')?.getAttribute("data-value") || "case";
    const question = root.querySelector('.book-chip[data-kind="question"].is-active')?.getAttribute("data-value") || (book.starter_questions?.[0] || "");
    const subject = root.getAttribute("data-subject") || "";
    const concept = root.getAttribute("data-concept") || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const taskType = $("taskType")?.value || "탐구 보고서";
    const taskDesc = $("taskDescription")?.value || "";

    const payload = {
      source_type: "book_textbook_navigation",
      student_context: {
        school_level: $("grade")?.value || "",
        subject: subject,
        textbook_concept: concept,
        textbook_keyword: keyword
      },
      book_context: {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        summary_short: book.summary_short,
        book_keywords: book.book_keywords || [],
        starter_questions: book.starter_questions || [],
        selected_question: question
      },
      task_context: {
        performance_task_mode: modeLabel(mode),
        task_output_type: taskType,
        task_constraints: taskDesc ? [taskDesc] : []
      },
      career_context: {
        target_career: career,
        linked_majors: book.linked_majors || []
      },
      connection_points: buildConnectionPoints(keyword, book, mode, career),
      allowed_navigation: buildAllowedNavigation(book),
      mini_generation_rules: {
        must_include: [
          "도서의 문제의식",
          "교과 개념 또는 키워드",
          "수행평가 방식",
          "학생 진로 연결"
        ],
        must_avoid: [
          "입력에 없는 비약적 결론",
          "대학 수준 과도한 전문용어",
          "도서와 무관한 사례 확장"
        ],
        output_requests: [
          "탐구 제목 3안",
          "가장 적합한 제목 1안",
          "학생 제출형 보고서 초안",
          "생기부 반영형 요약 문장"
        ]
      }
    };
    payload.final_title = buildFinalTitle(payload);
    return payload;
  }

  function buildMiniBlock(payload) {
    return `[MINI_REPORT_INPUT_JSON]\n${JSON.stringify(payload, null, 2)}\n\n[MINI_REPORT_PROMPT]\n${promptText}`;
  }

  function updateQuestions(root) {
    const book = getCurrentBook(root);
    const wrap = root.querySelector(".book-question-wrap");
    if (!wrap) return;
    wrap.innerHTML = (book.starter_questions || []).map((q, i) => `
      <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="question" data-value="${esc(q)}">${esc(q)}</button>
    `).join("");
  }

  function updateResult(root) {
    const payload = buildMiniPayload(root);
    const titleEl = root.querySelector(".book-final-title");
    if (titleEl) titleEl.textContent = payload.final_title;
    const jsonEl = root.querySelector(".book-mini-payload");
    if (jsonEl) jsonEl.value = buildMiniBlock(payload);
  }

  function applyToTaskDescription(root) {
    const taskDesc = $("taskDescription");
    const payloadText = root.querySelector(".book-mini-payload")?.value || "";
    if (!taskDesc || !payloadText) return;

    const cleaned = (taskDesc.value || "")
      .replace(/\n*\[MINI_REPORT_INPUT_JSON\][\s\S]*$/m, "")
      .trim();

    taskDesc.value = cleaned ? `${cleaned}\n\n${payloadText}` : payloadText;

    const notice = root.querySelector(".book-copy-notice");
    if (notice) {
      notice.textContent = "MINI용 JSON 입력값이 수행평가 설명 칸에 반영됐어요.";
      notice.style.display = "block";
      setTimeout(() => notice.style.display = "none", 2200);
    }
  }

  function bindEvents() {
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", function(event) {
      const chip = event.target.closest(".book-chip");
      if (chip) {
        const root = chip.closest(".book-puzzle-root");
        if (!root) return;
        if (chip.classList.contains("is-active")) return;

        const kind = chip.getAttribute("data-kind");
        root.querySelectorAll(`.book-chip[data-kind="${kind}"]`).forEach(btn => btn.classList.remove("is-active"));
        chip.classList.add("is-active");

        if (kind === "book") {
          updateQuestions(root);
        }
        updateResult(root);
        return;
      }

      const btn = event.target.closest(".book-apply-btn");
      if (btn) {
        const root = btn.closest(".book-puzzle-root");
        if (root) applyToTaskDescription(root);
      }
    });
  }

  window.renderTopicSuggestionHTML = function(ctx) {
    const keyword = ctx?.keyword || "";
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";
    if (!keyword || !career) return "";

    bindEvents();

    loadPrompt();
    loadBooks().then(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(root => {
        const sorted = sortBooksByKeyword(keyword);
        const bookWrap = root.querySelector(".book-book-wrap");
        if (bookWrap) {
          bookWrap.innerHTML = sorted.map((b, i) => `
            <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="book" data-value="${esc(b.book_id)}">${esc(b.title)}</button>
          `).join("");
        }
        updateQuestions(root);
        updateResult(root);
      });
    });

    const sorted = sortBooksByKeyword(keyword);
    const firstBook = sorted[0];
    const initialPayload = {
      source_type: "book_textbook_navigation",
      student_context: {
        school_level: $("grade")?.value || "",
        subject: subject,
        textbook_concept: concept,
        textbook_keyword: keyword
      },
      book_context: {
        book_id: firstBook.book_id,
        title: firstBook.title,
        author: firstBook.author,
        summary_short: firstBook.summary_short,
        book_keywords: firstBook.book_keywords || [],
        starter_questions: firstBook.starter_questions || [],
        selected_question: firstBook.starter_questions?.[0] || ""
      },
      task_context: {
        performance_task_mode: "사례 조사",
        task_output_type: $("taskType")?.value || "탐구 보고서",
        task_constraints: []
      },
      career_context: {
        target_career: career,
        linked_majors: firstBook.linked_majors || []
      },
      connection_points: buildConnectionPoints(keyword, firstBook, "case", career),
      allowed_navigation: buildAllowedNavigation(firstBook),
      mini_generation_rules: {
        must_include: ["도서의 문제의식", "교과 개념 또는 키워드", "수행평가 방식", "학생 진로 연결"],
        must_avoid: ["입력에 없는 비약적 결론", "대학 수준 과도한 전문용어", "도서와 무관한 사례 확장"],
        output_requests: ["탐구 제목 3안", "가장 적합한 제목 1안", "학생 제출형 보고서 초안", "생기부 반영형 요약 문장"]
      }
    };
    initialPayload.final_title = buildFinalTitle(initialPayload);

    return `
      <div class="book-puzzle-root" data-keyword="${esc(keyword)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}" data-career="${esc(career)}">
        <div class="book-puzzle-head">
          <h4>5. 도서에서 시작하는 탐구 퍼즐</h4>
          <div class="book-puzzle-guide">연결점만 만들고, 추론은 MINI가 합니다</div>
        </div>

        <p class="book-puzzle-desc">시스템은 교과 개념, 도서, 수행평가 방식, 진로의 연결점만 구조화합니다. 최종 제목과 보고서 해석은 MINI가 담당합니다.</p>

        <div class="book-step">
          <div class="book-step-label">1. 시작 도서 선택</div>
          <div class="book-chip-wrap book-book-wrap">
            ${sorted.map((b, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="book" data-value="${esc(b.book_id)}">${esc(b.title)}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">2. 도서 기반 시작 질문 선택</div>
          <div class="book-chip-wrap book-question-wrap">
            ${(firstBook.starter_questions || []).map((q, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="question" data-value="${esc(q)}">${esc(q)}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">3. 수행평가 방식 선택</div>
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

        <textarea class="book-mini-payload" style="display:none;">${esc(buildMiniBlock(initialPayload))}</textarea>
        <button type="button" class="book-apply-btn">보고서 만들기</button>
        <div class="book-copy-notice" style="display:none;"></div>
      </div>
    `;
  };
})();
