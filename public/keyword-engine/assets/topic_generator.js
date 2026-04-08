window.__TOPIC_GENERATOR_VERSION = "v14.0-engine70-layout-match-fix";

(function () {
  function esc(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const BOOKS_URLS = [
    "seed/book-engine/mini_book_engine_books_starter.json"
  ];

  const LOOKUP_URLS = [
    "seed/book-engine/archive/book_engine_lookup_70.json",
    "seed/book-engine/book_engine_lookup_70.json"
  ];

  const FILTER_URLS = [
    "seed/book-engine/book_recommendation_filter_mapping.json"
  ];

  const dataStore = {
    books: [],
    bookMap: new Map(),
    lookup: {
      career_index: {},
      subject_index: {},
      theme_index: {}
    },
    rules: [],
    loaded: false,
    loading: false,
    failed: false
  };

  const CAREER_ALIAS_MAP = {
    "신소재공학": ["신소재공학", "신소재", "재료공학", "재료", "소재", "금속", "세라믹", "고분자", "나노소재", "전자재료", "반도체", "배터리", "화학", "물리"],
    "재료공학": ["재료공학", "재료", "신소재", "소재", "금속", "세라믹", "고분자", "나노소재", "전자재료", "반도체", "배터리", "화학", "물리"],
    "반도체공학": ["반도체공학", "반도체", "전자재료", "재료", "신소재", "전자", "전기", "물리", "화학"],
    "화학공학": ["화학공학", "화학", "공정", "촉매", "에너지", "재료", "배터리", "반도체"],
    "기계공학": ["기계공학", "기계", "설계", "열역학", "재료", "모터", "로봇", "물리"],
    "전기전자공학": ["전기전자공학", "전기", "전자", "회로", "반도체", "센서", "전력", "배터리", "물리"],
    "컴퓨터": ["컴퓨터", "소프트웨어", "프로그래밍", "개발", "코딩", "IT", "정보", "보안", "데이터", "AI", "인공지능"],
    "소프트웨어": ["소프트웨어", "프로그래밍", "개발", "코딩", "컴퓨터", "AI", "인공지능", "데이터"],
    "인공지능": ["인공지능", "AI", "데이터", "머신러닝", "딥러닝", "알고리즘", "컴퓨터"],
    "데이터": ["데이터", "통계", "분석", "AI", "인공지능", "컴퓨터", "정보"],
    "간호": ["간호", "보건", "의료", "건강", "생명", "의학"],
    "의학": ["의학", "의료", "보건", "건강", "생명", "간호", "약학"],
    "약학": ["약학", "의약", "신약", "약물", "보건", "의학", "생명"],
    "생명": ["생명", "생명과학", "의학", "간호", "약학", "유전", "세포", "바이오"],
    "화학": ["화학", "재료", "배터리", "반도체", "에너지", "환경"],
    "물리": ["물리", "공학", "전자", "전기", "반도체", "우주", "천체"],
    "배터리": ["배터리", "에너지", "전기", "화학", "재료", "전지"],
    "반도체": ["반도체", "전자", "전기", "재료", "공학", "정보"],
    "환경": ["환경", "지구", "기후", "생태", "에너지", "지속가능"],
    "경영": ["경영", "경제", "기업", "마케팅", "ESG", "산업", "데이터"],
    "경제": ["경제", "경영", "금융", "시장", "무역", "정책"],
    "심리": ["심리", "상담", "감정", "행동", "관계", "인간"],
    "행정": ["행정", "정책", "공공", "사회", "국가", "법"],
    "법": ["법", "정책", "국가", "권리", "윤리", "행정", "사회"],
    "교육": ["교육", "학습", "학교", "발달", "심리", "아동"],
    "역사": ["역사", "문화", "사회", "철학", "국가"],
    "철학": ["철학", "윤리", "사상", "사회", "문학"],
    "문학": ["문학", "국어", "사회", "윤리", "철학", "언어"]
  };

  function injectCompactStyles() {
    if (document.getElementById("topicGeneratorCompactStyles")) return;
    const style = document.createElement("style");
    style.id = "topicGeneratorCompactStyles";
    style.textContent = `
      .book-puzzle-root{display:block}
      .book-chooser-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,0.8fr);gap:14px}
      .book-step{margin:0}
      .book-step-label{font-weight:800;font-size:14px;margin-bottom:8px;color:#1f2a44}
      .book-step-hint{font-size:12px;color:#5f6b85;margin-bottom:10px}
      .book-chip-wrap{display:flex !important;flex-direction:column !important;gap:10px !important;grid-template-columns:none !important}
      .book-chip{display:flex !important;align-items:flex-start;gap:10px;width:100%;text-align:left;padding:14px;border:1px solid #d8e0f5;border-radius:16px;background:#fff;box-sizing:border-box;transition:border-color .15s ease, transform .15s ease, background .15s ease}
      .book-chip:hover{border-color:#9bb2ff;transform:translateY(-1px)}
      .book-chip.is-active{border-color:#2f5bff;background:#eef3ff;box-shadow:0 0 0 1px rgba(47,91,255,.05)}
      .book-chip-rank{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:999px;background:#eef2ff;color:#3652d9;font-size:12px;font-weight:700;margin-top:1px}
      .book-chip.is-active .book-chip-rank{background:#2f5bff;color:#fff}
      .book-chip-body{min-width:0;display:block;flex:1}
      .book-chip-title{display:block;font-size:15px;font-weight:800;color:#1e2d50;line-height:1.35}
      .book-chip-meta{display:block;font-size:12px;color:#6a7690;line-height:1.45;margin-top:4px}
      .book-chip-why{display:block;font-size:12px;color:#33405f;line-height:1.45;margin-top:6px}
      .book-result-box{border:1px solid #d8e0f5;border-radius:16px;padding:16px;background:#fff;height:100%;box-sizing:border-box}
      .book-result-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .book-result-title{font-size:16px;font-weight:800;color:#1e2d50}
      .book-result-badge{font-size:11px;color:#3652d9;background:#eef2ff;border-radius:999px;padding:4px 8px;white-space:nowrap}
      .book-selected-desc{font-size:13px;line-height:1.7;color:#33405f;margin:0 0 10px}
      .book-mini-list{display:flex;flex-direction:column;gap:7px;margin-top:6px}
      .book-mini-item{font-size:12px;line-height:1.6;color:#4b5875}
      .book-reason-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 10px}
      .book-reason-tag{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#f3f6fb;color:#44516c;font-size:11px;font-weight:700}
      .book-inline-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
      .book-inline-tag{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#f6f8fc;color:#5d6985;font-size:11px;font-weight:700}
      .book-empty-note{font-size:13px;line-height:1.7;color:#4b5875}
      @media (max-width: 980px){
        .book-chooser-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()\[\]{}'"`~!@#$%^&*+=|\\:;,.<>/?_-]/g, "");
  }

  function unique(items) {
    return Array.from(new Set((items || []).filter(Boolean)));
  }

  function splitCareerTokens(raw) {
    const base = String(raw || "").trim();
    if (!base) return [];

    const direct = base
      .split(/[>,/|·ㆍ+]+|\s+/)
      .map(v => v.trim())
      .filter(Boolean);

    const expanded = [base, ...direct];

    Object.entries(CAREER_ALIAS_MAP).forEach(([key, aliases]) => {
      if (base.includes(key)) {
        expanded.push(key, ...aliases);
      }
    });

    direct.forEach(token => {
      Object.entries(CAREER_ALIAS_MAP).forEach(([key, aliases]) => {
        if (token.includes(key) || key.includes(token)) {
          expanded.push(key, ...aliases);
        }
      });
    });

    return unique(expanded);
  }


  function hasAnyToken(text, tokens) {
    const source = normalize(text);
    return (tokens || []).some(token => source.includes(normalize(token)));
  }

  function detectCareerProfile(signals) {
    const joined = (signals || []).join(" ");
    if (hasAnyToken(joined, ["신소재", "재료", "소재", "금속", "세라믹", "고분자", "나노", "전자재료", "반도체", "배터리", "화학공학", "기계공학", "전기전자", "전자공학"])) {
      return "engineering_materials";
    }
    if (hasAnyToken(joined, ["의학", "의료", "간호", "치과", "치의", "약학", "수의", "보건", "생명", "바이오"])) {
      return "bio_medical";
    }
    if (hasAnyToken(joined, ["컴퓨터", "소프트웨어", "AI", "인공지능", "데이터", "프로그래밍"])) {
      return "computing";
    }
    return "general";
  }

  function applyCareerProfileScore(book, profile) {
    const majors = book.linked_majors || [];
    const subjects = book.linked_subjects || [];
    const themes = book.broad_theme || [];
    let score = 0;
    const reasons = [];

    if (profile === "engineering_materials") {
      if (textIncludesLoose(majors, ["물리학과", "화학과", "산업공학과", "천문학과", "물리천문학과", "물리천문학부", "지구과학과", "과학교육과"])) {
        score += 24; reasons.push("공학 기초 연결");
      }
      if (textIncludesLoose(subjects, ["물리학", "화학", "공통수학1", "공통수학2", "정보", "통합과학1", "과학탐구실험1", "과학탐구실험2"])) {
        score += 18; reasons.push("물리·화학 연결");
      }
      if (textIncludesLoose(themes, ["과학방법과객관성", "우주와자연", "미디어와정보", "경제와경영"])) {
        score += 8; reasons.push("과학 확장성");
      }
      if (textIncludesLoose(majors, ["의예과", "간호학과", "치의예과", "수의예과", "약학과", "보건행정학과", "생명과학과", "생명공학과"])) {
        score -= 28; reasons.push("진로 거리 있음");
      }
      if (textIncludesLoose(subjects, ["생명과학"]) && !textIncludesLoose(subjects, ["물리학", "화학"])) {
        score -= 14; reasons.push("생명과학 편중");
      }
    } else if (profile === "bio_medical") {
      if (textIncludesLoose(majors, ["의예과", "간호학과", "치의예과", "수의예과", "약학과", "생명과학과", "생명공학과"])) {
        score += 18; reasons.push("의생명 진로 연결");
      }
      if (textIncludesLoose(subjects, ["생명과학", "통합과학1", "화학", "윤리문제탐구"])) {
        score += 12; reasons.push("의생명 과목 연결");
      }
    } else if (profile === "computing") {
      if (textIncludesLoose(majors, ["컴퓨터공학과", "데이터사이언스학과", "산업공학과", "정보", "미디어커뮤니케이션학과"])) {
        score += 18; reasons.push("컴퓨팅 진로 연결");
      }
      if (textIncludesLoose(subjects, ["정보", "공통수학1", "공통수학2"])) {
        score += 12; reasons.push("정보 과목 연결");
      }
    }

    return { score, reasons };
  }

  function textIncludesLoose(haystackList, needle) {
    if (!needle) return false;
    const nn = normalize(needle);
    return (haystackList || []).some(item => {
      const ni = normalize(item);
      return ni && (ni.includes(nn) || nn.includes(ni));
    });
  }

  function fetchJsonWithFallback(urls) {
    return (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          return await res.json();
        } catch (error) {}
      }
      return null;
    })();
  }

  function triggerHelperRender() {
    if (typeof window.__TEXTBOOK_HELPER_RENDER__ === "function") {
      setTimeout(() => window.__TEXTBOOK_HELPER_RENDER__(), 0);
    }
  }

  async function loadEngineData() {
    if (dataStore.loaded || dataStore.loading) return;
    dataStore.loading = true;

    try {
      const [books, lookup, filterMap] = await Promise.all([
        fetchJsonWithFallback(BOOKS_URLS),
        fetchJsonWithFallback(LOOKUP_URLS),
        fetchJsonWithFallback(FILTER_URLS)
      ]);

      dataStore.books = Array.isArray(books) ? books : [];
      dataStore.bookMap = new Map(dataStore.books.map(book => [book.book_id, book]));
      dataStore.lookup = lookup && typeof lookup === "object" ? lookup : {
        career_index: {},
        subject_index: {},
        theme_index: {}
      };
      dataStore.rules = Array.isArray(filterMap?.subject_keyword_rules)
        ? filterMap.subject_keyword_rules
        : [];
      dataStore.loaded = dataStore.books.length > 0;
      dataStore.failed = !dataStore.loaded;
    } catch (error) {
      dataStore.failed = true;
    } finally {
      dataStore.loading = false;
      triggerHelperRender();
    }
  }

  injectCompactStyles();
  loadEngineData();

  function ensureScore(map, bookId) {
    if (!map.has(bookId)) {
      map.set(bookId, { bookId, score: 0, reasons: [] });
    }
    return map.get(bookId);
  }

  function addScore(map, bookId, delta, reason) {
    if (!bookId || !dataStore.bookMap.has(bookId)) return;
    const entry = ensureScore(map, bookId);
    entry.score += delta;
    if (reason && !entry.reasons.includes(reason)) entry.reasons.push(reason);
  }

  function addLookupEntries(map, entries, delta, reason) {
    (entries || []).forEach(entry => addScore(map, entry?.book_id || entry?.bookId, delta, reason));
  }

  function getLookupByFuzzyKey(index, signals) {
    const results = [];
    const keys = Object.keys(index || {});

    signals.forEach(signal => {
      const ns = normalize(signal);
      keys.forEach(key => {
        const nk = normalize(key);
        if (!nk) return;
        if (nk === ns) {
          results.push({ key, entries: index[key], weight: 90 });
          return;
        }
        if (nk.includes(ns) || ns.includes(nk)) {
          results.push({ key, entries: index[key], weight: 60 });
        }
      });
    });

    return results;
  }

  function scoreByBookContent(map, ctx, signals) {
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const keyword = ctx?.keyword || "";
    const profile = detectCareerProfile(signals);

    dataStore.books.forEach(book => {
      let score = 0;
      const reasons = [];

      if (subject && textIncludesLoose(book.linked_subjects, subject)) {
        score += 18;
        reasons.push("과목 연결");
      }

      if (concept && Array.isArray(book.engine_subject_routes)) {
        const routeHit = book.engine_subject_routes.some(route => {
          const subjectOk = !subject || normalize(route.subject) === normalize(subject);
          const conceptOk = normalize(route.concept).includes(normalize(concept)) || normalize(concept).includes(normalize(route.concept));
          return subjectOk && conceptOk;
        });
        if (routeHit) {
          score += 28;
          reasons.push("교과 개념 연결");
        }
      }

      if (!concept && subject && Array.isArray(book.engine_subject_routes)) {
        const routeSubjectHit = book.engine_subject_routes.some(route => normalize(route.subject) === normalize(subject));
        if (routeSubjectHit) {
          score += 12;
          reasons.push("과목 라우트 연결");
        }
      }

      signals.forEach(signal => {
        if (textIncludesLoose(book.linked_majors, signal)) {
          score += 42;
          reasons.push("진로 직접 연결");
        }
        if (textIncludesLoose(book.fit_keywords, signal)) {
          score += 24;
          reasons.push("키워드 일치");
        }
        if (textIncludesLoose(book.broad_theme, signal)) {
          score += 16;
          reasons.push("주제 연결");
        }
        if (normalize(book.title).includes(normalize(signal))) {
          score += 12;
          reasons.push("도서명 유사");
        }
        if (normalize(book.summary_short).includes(normalize(signal))) {
          score += 8;
          reasons.push("소개문 연결");
        }
        if (Array.isArray(book.engine_subject_routes)) {
          const bridgeHit = book.engine_subject_routes.some(route => textIncludesLoose(route.career_bridge, signal));
          if (bridgeHit) {
            score += 14;
            reasons.push("진로 브리지 연결");
          }
        }
      });

      if (keyword && textIncludesLoose(book.fit_keywords, keyword)) {
        score += 20;
        reasons.push("교과 키워드 연결");
      }

      const profileAdjust = applyCareerProfileScore(book, profile);
      if (profileAdjust.score) {
        score += profileAdjust.score;
        profileAdjust.reasons.forEach(reason => {
          if (!reasons.includes(reason)) reasons.push(reason);
        });
      }

      if (score > 0) {
        const entry = ensureScore(map, book.book_id);
        entry.score += score;
        reasons.forEach(reason => {
          if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
        });
      }
    });
  }

  function getMatchedRules(ctx) {
    return dataStore.rules.filter(rule => {
      const subjectOk = !Array.isArray(rule.subjects) || !rule.subjects.length
        ? true
        : (!!ctx?.subject && textIncludesLoose(rule.subjects, ctx.subject));

      const conceptOk = !Array.isArray(rule.concepts) || !rule.concepts.length
        ? true
        : (!!ctx?.concept && textIncludesLoose(rule.concepts, ctx.concept));

      const keywordOk = !Array.isArray(rule.keywords) || !rule.keywords.length
        ? true
        : (!!ctx?.keyword && textIncludesLoose(rule.keywords, ctx.keyword));

      return subjectOk && conceptOk && keywordOk;
    });
  }

  function applyRuleScores(map, ctx) {
    const rules = getMatchedRules(ctx);
    rules.forEach(rule => {
      (rule.recommended_books || []).forEach(bookId => addScore(map, bookId, 30, "추천 규칙 일치"));
      (rule.blocked_books || []).forEach(bookId => addScore(map, bookId, -120, "차단 규칙"));
    });
  }

  function addSubjectFallback(map, subject) {
    if (!subject) return;

    const exact = dataStore.lookup?.subject_index?.[subject];
    if (Array.isArray(exact)) {
      addLookupEntries(map, exact, 10, "과목 기본 추천");
      return;
    }

    Object.entries(dataStore.lookup?.subject_index || {}).forEach(([key, entries]) => {
      if (normalize(key) === normalize(subject) || normalize(key).includes(normalize(subject)) || normalize(subject).includes(normalize(key))) {
        addLookupEntries(map, entries, 10, "과목 기본 추천");
      }
    });
  }

  function resolveRecommendedBooks(ctx, limit = 5) {
    const career = String(ctx?.career || "").trim();
    const subject = String(ctx?.subject || "").trim();
    const signals = splitCareerTokens(career);
    const profile = detectCareerProfile(signals);
    const scoreMap = new Map();

    getLookupByFuzzyKey(dataStore.lookup?.career_index || {}, signals).forEach(hit => {
      addLookupEntries(scoreMap, hit.entries, hit.weight, "진로 인덱스 연결");
    });

    addSubjectFallback(scoreMap, subject);
    scoreByBookContent(scoreMap, ctx, signals);
    applyRuleScores(scoreMap, ctx);

    const resolved = Array.from(scoreMap.values())
      .filter(entry => entry.score > 0)
      .map(entry => {
        const book = dataStore.bookMap.get(entry.bookId);
        return {
          ...book,
          _score: entry.score,
          _reasons: entry.reasons.slice(0, 3)
        };
      })
      .sort((a, b) => b._score - a._score || a.title.localeCompare(b.title, "ko"));

    if (resolved.length) return resolved.slice(0, limit);

    const subjectFallback = dataStore.books.filter(book => textIncludesLoose(book.linked_subjects, subject));
    if (subjectFallback.length) {
      const filtered = profile === "engineering_materials"
        ? subjectFallback.filter(book => !textIncludesLoose(book.linked_majors, ["의예과", "간호학과", "치의예과", "수의예과", "약학과"]))
        : subjectFallback;
      return (filtered.length ? filtered : subjectFallback)
        .slice(0, limit)
        .map(book => ({ ...book, _score: 1, _reasons: ["과목 연결"] }));
    }

    return [];
  }

  function trimText(text, maxLength) {
    const value = String(text || "").trim();
    if (!value) return "";
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
  }

  function renderBooks(books) {
    return books.map((book, index) => {
      const subject = (book.linked_subjects || [])[0] || "연결 과목";
      const why = unique([...(book._reasons || []), ...((book.broad_theme || []).slice(0, 1))]).slice(0, 2).join(" · ");
      return `
        <button
          type="button"
          class="book-chip ${book.__selected ? "is-active" : ""}"
          data-kind="book"
          data-value="${esc(book.book_id)}"
          data-title="${esc(book.title)}"
        >
          <span class="book-chip-rank">${index + 1}</span>
          <span class="book-chip-body">
            <span class="book-chip-title">${esc(book.title)}</span>
            <span class="book-chip-meta">${esc(book.author || "저자 정보 없음")} · ${esc(subject)}</span>
            ${why ? `<span class="book-chip-why">${esc(why)}</span>` : ""}
          </span>
        </button>
      `;
    }).join("");
  }

  function renderReasonTags(book) {
    const items = unique([
      ...(book?._reasons || []),
      ...((book?.broad_theme || []).slice(0, 2))
    ]).slice(0, 4);

    if (!items.length) return "";

    return `
      <div class="book-reason-tags">
        ${items.map(item => `<span class="book-reason-tag">${esc(item)}</span>`).join("")}
      </div>
    `;
  }

  function renderInlineTags(values) {
    const items = (values || []).filter(Boolean).slice(0, 4);
    if (!items.length) return "";
    return `<div class="book-inline-tags">${items.map(item => `<span class="book-inline-tag">${esc(item)}</span>`).join("")}</div>`;
  }

  function renderSelectedBookSummary(book) {
    if (!book) return "";

    const question = (book.starter_questions || [])[0] || "현재 과목과 진로를 연결해 탐구 질문으로 확장할 수 있습니다.";
    const subjectText = (book.linked_subjects || []).slice(0, 3);
    const majorText = (book.linked_majors || []).slice(0, 3);

    return `
      <div class="book-selected-wrap">
        <div class="book-result-head">
          <div class="book-result-title">${esc(book.title)}</div>
          <div class="book-result-badge">선택 완료</div>
        </div>
        <div class="book-selected-desc">${esc(trimText(book.summary_short || "현재 과목·진로와 연결해 탐구 주제로 확장할 수 있는 도서입니다.", 92))}</div>
        ${renderReasonTags(book)}
        <div class="book-mini-list">
          <div class="book-mini-item"><strong>탐구 질문</strong> · ${esc(trimText(question, 72))}</div>
          ${subjectText.length ? `<div class="book-mini-item"><strong>연결 과목</strong>${renderInlineTags(subjectText)}</div>` : ""}
          ${majorText.length ? `<div class="book-mini-item"><strong>연결 진로</strong>${renderInlineTags(majorText)}</div>` : ""}
        </div>
      </div>
    `;
  }

  function syncSelectedBookToHelper(book) {
    if (!book || !window.__TEXTBOOK_HELPER_STATE__) return;
    window.__TEXTBOOK_HELPER_STATE__.selectedBook = book.book_id || "";
    window.__TEXTBOOK_HELPER_STATE__.selectedBookTitle = book.title || "";
  }

  function bindInteractions(root) {
    if (!root || root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    root.addEventListener("click", function (event) {
      const chip = event.target.closest(".book-chip[data-kind='book']");
      if (!chip) return;

      root.querySelectorAll(".book-chip[data-kind='book']").forEach(btn => btn.classList.remove("is-active"));
      chip.classList.add("is-active");

      const selectedBook = dataStore.bookMap.get(chip.getAttribute("data-value") || "");
      syncSelectedBookToHelper(selectedBook);

      const result = root.querySelector(".book-result-box");
      if (result) result.innerHTML = renderSelectedBookSummary(selectedBook);

      if (typeof window.__TEXTBOOK_HELPER_RENDER__ === "function") {
        setTimeout(() => window.__TEXTBOOK_HELPER_RENDER__(), 20);
      }
    });
  }


  function resolveSelectedBookFromContext(ctx, books) {
    const preferredId = String(
      ctx?.selectedBook ||
      window.__TEXTBOOK_HELPER_STATE__?.selectedBook ||
      ""
    ).trim();

    if (!preferredId) return books[0] || null;
    return books.find(book => String(book.book_id || "") === preferredId) || books[0] || null;
  }

  function renderLoadingBox() {
    return `
      <div class="book-puzzle-root">
        <div class="book-result-box"><div class="book-empty-note">도서 추천 데이터를 불러오는 중입니다.</div></div>
      </div>
    `;
  }

  function renderEmptyBox(message) {
    return `
      <div class="book-puzzle-root">
        <div class="book-result-box"><div class="book-empty-note">${esc(message)}</div></div>
      </div>
    `;
  }

  window.renderTopicSuggestionHTML = function (ctx) {
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";

    if (!subject || !career) return "";

    loadEngineData();

    if (!dataStore.loaded) return renderLoadingBox();

    const books = resolveRecommendedBooks(ctx, 6);
    if (!books.length) return renderEmptyBox("현재 이 진로와 연결되는 도서 데이터가 없습니다.");

    const selectedBook = resolveSelectedBookFromContext(ctx, books);
    if (!ctx?.selectedBook && !window.__TEXTBOOK_HELPER_STATE__?.selectedBook) {
      syncSelectedBookToHelper(selectedBook);
    }

    const html = `
      <div class="book-puzzle-root" data-career="${esc(career)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}">
        <div class="book-chooser-grid">
          <div class="book-step">
            <div class="book-step-label">1. 추천 도서 선택</div>
            <div class="book-step-hint">진로와 과목 연결도가 높은 책부터 보여줍니다. 제목을 누르면 바로 아래 요약이 바뀝니다.</div>
            <div class="book-chip-wrap">
              ${renderBooks(books.map(book => ({ ...book, __selected: selectedBook && book.book_id === selectedBook.book_id })))}
            </div>
          </div>

          <div class="book-step">
            <div class="book-step-label">2. 선택 도서 요약</div>
            <div class="book-result-box">
              ${renderSelectedBookSummary(selectedBook)}
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(bindInteractions);
    }, 0);

    return html;
  };
})();
