window.__TOPIC_GENERATOR_VERSION = "v20.0-concept-first-report-mode";

(function(){
  const BOOK_URLS = [
    "seed/book-engine/mini_book_engine_books_starter.json"
  ];
  const FILTER_URLS = [
    "seed/book-engine/book_recommendation_filter_mapping.json"
  ];
  const LOOKUP_URLS = [
    "seed/book-engine/archive/book_engine_lookup_70.json",
    "seed/book-engine/book_engine_lookup_70.json"
  ];
  const TOPIC_MATRIX_URLS = [
    "seed/textbook-v1/topic_matrix_seed.json",
    "seed/topic_matrix_seed.json"
  ];

  const DEFAULT_MODE_OPTIONS = [
    { id: "principle", label: "원리 파악형", desc: "핵심 개념이 왜 성립하는지 설명합니다." },
    { id: "compare", label: "비교 분석형", desc: "두 사례나 조건의 차이를 비교합니다." },
    { id: "data", label: "데이터 확장형", desc: "자료·수치·그래프를 해석하며 확장합니다." },
    { id: "application", label: "사례 적용형", desc: "실생활·산업 사례에 적용합니다." },
    { id: "major", label: "전공 확장형", desc: "희망 진로와 직접 연결해 정리합니다." }
  ];
  const DEFAULT_VIEW_OPTIONS = ["원리", "구조", "기능", "변화", "비교", "효율", "데이터"];

  let books = [];
  let filterMap = { subject_keyword_rules: [] };
  let lookup = { career_index: {}, subject_index: {}, theme_index: {} };
  let topicMatrix = null;
  let loaded = false;

  function esc(v){
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "");
  }

  function fuzzyIncludes(base, target){
    const a = normalize(base);
    const b = normalize(target);
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a);
  }

  function uniq(arr){
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  async function loadJSON(urls, fallback){
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        return await res.json();
      } catch (e) {
        // continue
      }
    }
    return fallback;
  }

  function detectCareerBucket(rawCareer){
    const career = String(rawCareer || "");
    if (!career) return "default";
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|고분자|금속)/.test(career)) return "materials";
    if (/(기계|자동차|로봇|항공|모빌리티)/.test(career)) return "mechanical";
    if (/(전기|전자|회로|통신|전파)/.test(career)) return "electronic";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터|보안|정보|통계|코딩|프로그래밍)/i.test(career)) return "it";
    if (/(간호|의학|의대|의예|치의|치과|한의|약학|보건|수의|생명|바이오|의료)/.test(career)) return "bio";
    if (/(환경|기후|지구|천문|우주|해양|지리)/.test(career)) return "env";
    if (/(경영|경제|회계|금융|마케팅|산업공학)/.test(career)) return "biz";
    if (/(행정|정치|법|사회|언론|미디어|철학|역사|국문|문학|교육)/.test(career)) return "humanities";
    return "default";
  }

  function tokenizeCareer(rawCareer){
    const career = String(rawCareer || "").trim();
    const tokens = [];
    career.split(/[\s,·/]+/).forEach(t => { if (t) tokens.push(t); });
    const expansions = {
      materials: ["신소재", "재료", "반도체", "배터리", "에너지", "화학공학"],
      mechanical: ["기계", "자동차", "로봇", "설계", "구조"],
      electronic: ["전자", "전기", "회로", "센서", "반도체"],
      it: ["컴퓨터", "소프트웨어", "데이터", "인공지능", "정보"],
      bio: ["생명", "바이오", "의학", "간호", "보건", "의료"],
      env: ["환경", "지구", "기후", "우주", "천문"],
      biz: ["경영", "경제", "산업", "최적화", "데이터"],
      humanities: ["사회", "윤리", "역사", "언어", "정책"]
    };
    const bucket = detectCareerBucket(career);
    return uniq(tokens.concat(expansions[bucket] || []));
  }

  function getMatchedRules(ctx){
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const keyword = ctx?.keyword || "";
    const rules = Array.isArray(filterMap?.subject_keyword_rules) ? filterMap.subject_keyword_rules : [];

    return rules.filter(rule => {
      const subjectOk = !Array.isArray(rule.subjects) || rule.subjects.length === 0 || rule.subjects.some(v => fuzzyIncludes(v, subject));
      const conceptOk = !Array.isArray(rule.concepts) || rule.concepts.length === 0 || rule.concepts.some(v => fuzzyIncludes(v, concept));
      const keywordOk = !Array.isArray(rule.keywords) || rule.keywords.length === 0 || rule.keywords.some(v => fuzzyIncludes(v, keyword));
      return subjectOk && conceptOk && keywordOk;
    });
  }

  function getCareerLookupCandidates(career){
    const entries = lookup?.career_index || {};
    const raw = String(career || "").trim();
    const result = [];
    Object.entries(entries).forEach(([key, list]) => {
      if (fuzzyIncludes(raw, key)) {
        (list || []).forEach(item => result.push(item));
      }
    });
    return result;
  }

  function getKeywordProfile(keyword){
    const profiles = topicMatrix?.keywordProfiles || {};
    const target = String(keyword || "").trim();
    const key = Object.keys(profiles).find(k => fuzzyIncludes(k, target));
    return key ? profiles[key] : null;
  }

  function getCareerProfile(career){
    const profiles = topicMatrix?.careerProfiles || {};
    const bucket = detectCareerBucket(career);
    const map = {
      materials: ["재료공학", "전자공학"],
      mechanical: ["기계공학"],
      electronic: ["전자공학", "재료공학"],
      it: ["정보"],
      bio: ["생명과학 탐구"],
      env: ["_default"],
      biz: ["_default"],
      humanities: ["_default"],
      default: ["_default"]
    };
    for (const key of map[bucket] || ["_default"]) {
      if (profiles[key]) return profiles[key];
    }
    return profiles._default || null;
  }

  function getBookThemeArray(book){
    return uniq([
      ...(book?.fit_keywords || []),
      ...(book?.broad_theme || []),
      ...(book?.book_keywords || [])
    ]);
  }

  function getBucketPatterns(bucket){
    const map = {
      materials: {
        major: /(재료|신소재|반도체|배터리|에너지|화학공학|고분자|금속|물리|화학)/,
        theme: /(재료|구조|측정|단위|원소|에너지|기술|과학방법|정량|데이터)/,
        avoid: /(의학|질병|환자|간호|수의|치과|동물병원)/
      },
      mechanical: {
        major: /(기계|자동차|로봇|항공|모빌리티|설계|구조|물리)/,
        theme: /(구조|역학|진동|측정|단위|시스템|에너지|기술|정량|데이터)/,
        avoid: /(의학|질병|환자|간호|수의|치과|동물병원)/
      },
      electronic: {
        major: /(전자|전기|회로|센서|반도체|통신|전파|물리)/,
        theme: /(센서|전류|측정|단위|시스템|에너지|데이터|정확도|기술)/,
        avoid: /(의학|질병|환자|간호|수의|치과|동물병원)/
      },
      it: {
        major: /(컴퓨터|소프트웨어|데이터|인공지능|정보|통계|보안|전자)/,
        theme: /(데이터|정보|구조|시스템|알고리즘|정량|분석|기술)/,
        avoid: /(의학|질병|환자|수의|치과)/
      },
      bio: {
        major: /(의학|의예|치의|약학|보건|간호|수의|생명|바이오)/,
        theme: /(생명|건강|질병|항상성|의학|생체|반응)/,
        avoid: /(전쟁|국가|정치 체제)/
      },
      env: {
        major: /(환경|지구|지리|천문|우주|기후|해양)/,
        theme: /(지구|환경|우주|천체|기후|시스템|데이터)/,
        avoid: /(의학|질병|환자)/
      },
      default: {
        major: /.^/,
        theme: /.^/,
        avoid: /.^/
      }
    };
    return map[bucket] || map.default;
  }

  function getBucketAlignment(book, bucket){
    const patterns = getBucketPatterns(bucket);
    const majors = book?.linked_majors || [];
    const themes = getBookThemeArray(book);
    const titleBag = `${book?.title || ""} ${book?.summary_short || ""}`;

    const majorHit = majors.some(v => patterns.major.test(v));
    const themeHit = themes.some(v => patterns.theme.test(v));
    const avoidHit = patterns.avoid.test(titleBag) || majors.some(v => patterns.avoid.test(v)) || themes.some(v => patterns.avoid.test(v));
    const bioHeavy = majors.length > 0 && majors.every(v => /(의학|의예|치의|약학|보건|간호|수의|생명|바이오)/.test(v));
    const professionSpecificBio = /(의사|수의사|치과의사|환자|동물 병원|동물병원|간호사)/.test(titleBag);
    const generalScience = majors.some(v => /(물리|화학|과학교육|천문|지구과학|수학)/.test(v));

    let score = 0;
    const reasons = [];

    if (majorHit) {
      score += 20;
      reasons.push("진로 적합 연결");
    }
    if (themeHit) {
      score += 10;
      reasons.push("개념 확장 적합");
    }

    if (["materials", "mechanical", "electronic", "it"].includes(bucket)) {
      if (bioHeavy && !majorHit) score -= 22;
      if (professionSpecificBio && !majorHit) score -= 28;
      if (avoidHit && !majorHit) score -= 18;
      if (generalScience && !bioHeavy) {
        score += 8;
        reasons.push("일반 과학 확장");
      }
    }

    if (bucket === "bio") {
      if (avoidHit && !majorHit) score -= 12;
    }

    return {
      score,
      reasons: uniq(reasons),
      majorHit,
      themeHit,
      bioHeavy,
      professionSpecificBio,
      generalScience
    };
  }

  function getRouteMatches(book, subject, concept, keyword){
    const routes = Array.isArray(book?.engine_subject_routes) ? book.engine_subject_routes : [];
    return routes.filter(route => {
      const subjectOk = fuzzyIncludes(route.subject, subject);
      const conceptOk = !concept || fuzzyIncludes(route.concept, concept);
      const keywordOk = !keyword || (Array.isArray(route.micro_keywords) && route.micro_keywords.some(k => fuzzyIncludes(k, keyword)));
      return subjectOk && conceptOk && keywordOk;
    });
  }

  function scoreBook(book, ctx){
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const keyword = ctx?.keyword || "";
    const career = ctx?.career || "";
    const bucket = detectCareerBucket(career);
    const careerTokens = tokenizeCareer(career);
    const matchedRules = getMatchedRules(ctx);
    const themes = getBookThemeArray(book);
    const routes = getRouteMatches(book, subject, concept, keyword);
    const bucketAlignment = getBucketAlignment(book, bucket);

    let score = 0;
    const reasons = [];

    if ((book.linked_subjects || []).some(v => fuzzyIncludes(v, subject))) {
      score += 16;
      reasons.push("과목 연결");
    }

    routes.forEach(route => {
      const exactConcept = fuzzyIncludes(route.concept, concept);
      const exactKeyword = Array.isArray(route.micro_keywords) && route.micro_keywords.some(k => fuzzyIncludes(k, keyword));
      if (exactConcept) score += 18;
      if (exactKeyword) score += 18;
      if (exactConcept && exactKeyword) reasons.push("개념-키워드 직접 연결");
    });

    if ((book.fit_keywords || []).some(v => fuzzyIncludes(v, keyword))) {
      score += 14;
      reasons.push("키워드 일치");
    }

    if (themes.some(v => fuzzyIncludes(v, keyword))) {
      score += 8;
    }

    if ((book.linked_majors || []).some(v => careerTokens.some(token => fuzzyIncludes(v, token)))) {
      score += 18;
      reasons.push("진로 직접 연결");
    }

    const lookupHits = getCareerLookupCandidates(career);
    if (lookupHits.some(item => item.book_id === book.book_id)) {
      score += 12;
      reasons.push("진로 추천 목록");
    }

    matchedRules.forEach(rule => {
      if ((rule.blocked_books || []).includes(book.book_id)) score -= 100;
      if ((rule.recommended_books || []).includes(book.book_id)) {
        score += 18;
        reasons.push("필터 추천");
      }
    });

    score += bucketAlignment.score;
    reasons.push(...bucketAlignment.reasons);

    if (["materials", "mechanical", "electronic", "it"].includes(bucket)) {
      const selectedBioConcept = /(생명|세포|항상성|자극|내부 환경|변화 대응)/.test(`${concept} ${keyword}`);
      if (selectedBioConcept && bucketAlignment.professionSpecificBio && !bucketAlignment.majorHit) {
        score -= 22;
      }
      if (selectedBioConcept && bucketAlignment.generalScience) {
        score += 8;
      }
    }

    if (!concept && !keyword) score -= 12;

    return { score, reasons: uniq(reasons).slice(0, 3), matchedRules, routes };
  }

  function getRecommendedBooks(ctx){
    if (!loaded || !Array.isArray(books) || books.length === 0) return [];
    const scored = books.map(book => {
      const meta = scoreBook(book, ctx);
      return {
        book,
        score: meta.score,
        reasons: meta.reasons,
        matchedRules: meta.matchedRules,
        routes: meta.routes
      };
    });

    const sorted = scored
      .filter(item => item.score > -30)
      .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title, 'ko'));

    const dedup = [];
    const seen = new Set();
    sorted.forEach(item => {
      if (!seen.has(item.book.book_id) && dedup.length < 8) {
        seen.add(item.book.book_id);
        dedup.push(item);
      }
    });

    return dedup;
  }

  function mapModeLabel(id){
    return (DEFAULT_MODE_OPTIONS.find(item => item.id === id) || {}).label || id;
  }

  function buildReportOptionMeta(ctx){
    const recommendations = getRecommendedBooks(ctx);
    const selected = recommendations.find(item => item.book.book_id === ctx?.selectedBook)?.book || recommendations[0]?.book || null;
    const matchedRules = getMatchedRules(ctx);
    const keywordProfile = getKeywordProfile(ctx?.keyword);
    const careerProfile = getCareerProfile(ctx?.career);

    const modeIds = uniq([
      ...matchedRules.flatMap(rule => rule.recommended_modes || []),
      ...(selected?.fit_modes || []),
      "principle",
      "compare",
      "data",
      "application",
      "major"
    ]).map(v => {
      if (v === "case") return "application";
      if (v === "career") return "major";
      return v;
    });

    const modeOptions = DEFAULT_MODE_OPTIONS.filter(item => modeIds.includes(item.id));
    if (!modeOptions.length) modeOptions.push(...DEFAULT_MODE_OPTIONS.slice(0, 3));

    const viewOptions = uniq([
      ...matchedRules.flatMap(rule => rule.recommended_views || []),
      ...(keywordProfile?.perspectives || []),
      ...(careerProfile?.perspectives || []),
      ...DEFAULT_VIEW_OPTIONS
    ]).slice(0, 8);

    return { selectedBook: selected, modeOptions, viewOptions };
  }

  function renderBookCard(item, active, index){
    const book = item.book;
    const reasonText = item.reasons.length ? item.reasons.join(" · ") : "과목 기준 추천";
    const subjectTag = (book.linked_subjects || [])[0] || "교과 연결";
    return `
      <button type="button" class="engine-book-card ${active ? "is-active" : ""} book-chip" data-kind="book" data-value="${esc(book.book_id)}" data-title="${esc(book.title)}">
        <div class="engine-book-order">${index + 1}</div>
        <div class="engine-book-main">
          <div class="engine-book-title">${esc(book.title)}</div>
          <div class="engine-book-meta">${esc(book.author || "저자 정보 없음")} · ${esc(subjectTag)}</div>
          <div class="engine-book-reason">${esc(reasonText)}</div>
        </div>
      </button>
    `;
  }

  function renderBookSummary(selectedBook, ctx){
    if (!selectedBook) {
      return `<div class="engine-empty">왼쪽에서 도서를 선택하면 요약이 보입니다.</div>`;
    }
    const meta = buildReportOptionMeta(ctx);
    const subjectTags = (selectedBook.linked_subjects || []).slice(0, 3).map(v => `<span class="engine-tag">${esc(v)}</span>`).join("");
    const majorTags = (selectedBook.linked_majors || []).slice(0, 3).map(v => `<span class="engine-tag subtle">${esc(v)}</span>`).join("");
    return `
      <div class="engine-summary-box">
        <div class="engine-summary-top">
          <div>
            <div class="engine-summary-title">${esc(selectedBook.title)}</div>
            <div class="engine-summary-meta">${esc(selectedBook.author || "")}</div>
          </div>
          <div class="engine-summary-badge">도서 선택 완료</div>
        </div>
        <p class="engine-summary-text">${esc(selectedBook.summary_short || "이 도서는 선택한 개념 키워드를 확장하는 데 적합합니다.")}</p>
        <div class="engine-tag-wrap">${subjectTags || ""}${majorTags || ""}</div>
        <div class="engine-summary-foot">이 도서를 바탕으로 보고서에 들어갈 근거와 확장 방향을 MINI에 전달합니다.</div>
      </div>
    `;
  }

  window.renderBookSelectionHTML = function(ctx){
    if (!ctx?.subject || !ctx?.career) {
      return `<div class="engine-empty">먼저 과목과 진로를 입력하세요.</div>`;
    }
    if (!ctx?.keyword) {
      return `<div class="engine-empty">먼저 개념과 키워드를 선택해야 도서 추천이 열립니다.</div>`;
    }
    if (!loaded) {
      return `<div class="engine-empty">도서 추천 데이터를 불러오는 중입니다.</div>`;
    }

    const recommendations = getRecommendedBooks(ctx);
    if (!recommendations.length) {
      return `<div class="engine-empty">현재 선택한 과목·진로·개념 키워드와 맞는 도서가 없습니다. 키워드를 바꾸거나 진로 표현을 조금 더 넓게 입력해 보세요.</div>`;
    }

    const selectedItem = recommendations.find(item => item.book.book_id === ctx.selectedBook) || recommendations[0];
    const selectedBook = selectedItem?.book || null;

    return `
      <div class="engine-book-layout">
        <div class="engine-book-list">
          <div class="engine-subtitle">4. 키워드와 맞는 도서 선택</div>
          <div class="engine-help">선택한 키워드와 연결성이 높은 도서부터 보여줍니다.</div>
          ${recommendations.slice(0, 6).map((item, index) => renderBookCard(item, selectedBook && item.book.book_id === selectedBook.book_id, index)).join("")}
        </div>
        <div class="engine-book-summary">
          <div class="engine-subtitle">선택 도서 요약</div>
          ${renderBookSummary(selectedBook, ctx)}
        </div>
      </div>
    `;
  };

  window.getReportOptionMeta = function(ctx){
    return buildReportOptionMeta(ctx || {});
  };

  window.getSelectedBookDetail = function(bookId){
    return books.find(book => book.book_id === bookId) || null;
  };

  async function init(){
    const [bookData, filterData, lookupData, matrixData] = await Promise.all([
      loadJSON(BOOK_URLS, []),
      loadJSON(FILTER_URLS, { subject_keyword_rules: [] }),
      loadJSON(LOOKUP_URLS, { career_index: {}, subject_index: {}, theme_index: {} }),
      loadJSON(TOPIC_MATRIX_URLS, null)
    ]);

    books = Array.isArray(bookData) ? bookData : [];
    filterMap = filterData || { subject_keyword_rules: [] };
    lookup = lookupData || { career_index: {}, subject_index: {}, theme_index: {} };
    topicMatrix = matrixData || null;
    loaded = true;
    window.__BOOK_ENGINE_DATA_READY__ = true;

    if (typeof window.__BOOK_ENGINE_REQUEST_RERENDER__ === "function") {
      window.__BOOK_ENGINE_REQUEST_RERENDER__();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
