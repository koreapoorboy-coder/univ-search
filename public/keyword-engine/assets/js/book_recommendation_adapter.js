/* book_recommendation_adapter.js
 * 210권 도서 추천 어댑터 v1.1 path-fix
 * 수정 목적:
 * - /keyword-engine 고정 경로 때문에 GitHub Pages/Cloudflare에서 404가 나는 문제 해결
 * - 현재 실행 위치, script 위치, GitHub repo 경로를 자동 탐색해서 master JSON을 로드
 * - 기존 3번·4번 로직은 수정하지 않음
 */
(function (global) {
  "use strict";

  const MASTER_FILE = "book_source_master_210.json";

  function toText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(toText).join(" ");
    if (typeof value === "object") return Object.values(value).map(toText).join(" ");
    return String(value);
  }

  function normalize(value) {
    return toText(value).toLowerCase().replace(/\s+/g, " ").trim();
  }

  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function includesAny(haystack, needles) {
    const h = normalize(haystack);
    return (needles || []).some(function (n) {
      const v = normalize(n);
      return v && h.indexOf(v) >= 0;
    });
  }

  function stripFile(pathname) {
    if (!pathname) return "/";
    if (pathname.endsWith("/")) return pathname;
    return pathname.replace(/\/[^/]*$/, "/");
  }

  function trimTrailingSlash(path) {
    return String(path || "").replace(/\/+$/, "");
  }

  function buildBaseCandidates() {
    const candidates = [];

    function add(base) {
      base = trimTrailingSlash(base);
      if (base && !candidates.includes(base)) candidates.push(base);
    }

    const loc = global.location;
    const pathname = loc ? loc.pathname : "";

    // 1) 현재 URL 안에 keyword-engine이 이미 있으면 그 앞까지를 base로 사용
    // 예: /univ-search/keyword-engine/index.html -> /univ-search/keyword-engine
    const keywordMatch = pathname.match(/^(.*?\/keyword-engine)(?:\/|$)/);
    if (keywordMatch) add(keywordMatch[1]);

    // 2) 현재 페이지 기준 상대 경로 후보
    // 예: /keyword-engine/index.html에서 실행 중이면 ./data/books가 맞을 수 있음
    const currentDir = stripFile(pathname);
    add(currentDir.replace(/\/$/, ""));
    add(currentDir.replace(/\/assets\/js\/?$/, ""));
    add(currentDir.replace(/\/seed\/book_210_stage2\/?$/, ""));

    // 3) 현재 로드된 script src에서 역산
    const scripts = global.document ? Array.from(global.document.scripts || []) : [];
    scripts.forEach(function (script) {
      const src = script && script.src ? script.src : "";
      if (!src) return;
      try {
        const u = new URL(src, loc ? loc.href : undefined);
        const p = u.pathname;
        const m = p.match(/^(.*?\/keyword-engine)\/assets\/js\/book_recommendation_adapter\.js(?:\?.*)?$/);
        if (m) add(m[1]);
        const m2 = p.match(/^(.*?\/keyword-engine)\/assets\/js\/[^/]+$/);
        if (m2) add(m2[1]);
      } catch (e) {}
    });

    // 4) 배포 환경별 고정 후보
    add("/keyword-engine");
    add("/univ-search/keyword-engine");
    add("/univ-search/public/keyword-engine");
    add("/public/keyword-engine");

    // 5) 상대 후보
    add("./keyword-engine");
    add("./public/keyword-engine");
    add("../keyword-engine");
    add("../public/keyword-engine");
    add(".");

    return candidates;
  }

  async function tryFetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, status: res.status, url: url };
    }

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    // 404 페이지가 HTML로 오는 경우를 명확히 방지
    if (/^\s*</.test(text)) {
      return {
        ok: false,
        status: "HTML_INSTEAD_OF_JSON",
        url: url,
        contentType: contentType
      };
    }

    try {
      const data = JSON.parse(text);
      return { ok: true, status: res.status, url: url, data: data };
    } catch (e) {
      return {
        ok: false,
        status: "JSON_PARSE_ERROR",
        url: url,
        error: e.message,
        preview: text.slice(0, 120)
      };
    }
  }

  async function resolveBookEngineBase(options) {
    options = options || {};
    const explicit = options.base || global.BOOK_ENGINE_BASE;
    const candidates = explicit ? [explicit].concat(buildBaseCandidates()) : buildBaseCandidates();
    const tried = [];

    for (const base of uniq(candidates)) {
      const url = trimTrailingSlash(base) + "/data/books/" + MASTER_FILE;
      try {
        const result = await tryFetchJson(url);
        tried.push({ base: base, url: url, status: result.status });

        if (
          result.ok &&
          result.data &&
          Number(result.data.totalBooks) === 210 &&
          Array.isArray(result.data.books)
        ) {
          global.BOOK_ENGINE_BASE = trimTrailingSlash(base);
          global.BOOK_SOURCE_MASTER_210 = result.data;
          return {
            base: global.BOOK_ENGINE_BASE,
            url: url,
            master: result.data,
            tried: tried
          };
        }
      } catch (e) {
        tried.push({ base: base, url: url, status: "FETCH_ERROR", error: e.message });
      }
    }

    const err = new Error("210권 도서 master 경로를 찾지 못했습니다.");
    err.tried = tried;
    throw err;
  }

  async function loadBookMaster(options) {
    // 하위 호환: 문자열 URL이 들어오면 직접 URL로 처리
    if (typeof options === "string") {
      const result = await tryFetchJson(options);
      if (!result.ok) {
        const err = new Error("도서 master 로드 실패: " + result.status);
        err.detail = result;
        throw err;
      }
      global.BOOK_SOURCE_MASTER_210 = result.data;
      return result.data;
    }

    const resolved = await resolveBookEngineBase(options || {});
    return resolved.master;
  }

  function collectPayloadTerms(payload) {
    payload = payload || {};
    const subject = payload.subject || payload.selectedSubject || payload.course || "";
    const department = payload.department || payload.major || payload.selectedDepartment || "";
    const selectedConcept = payload.selectedConcept || payload.concept || payload.step3Concept || "";
    const selectedKeyword = payload.selectedRecommendedKeyword || payload.recommendedKeyword || payload.keyword || payload.step3Keyword || "";
    const axis = payload.followupAxis || payload.axis || payload.axisPayload || payload.step4Axis || "";
    const reportIntent = payload.reportIntent || payload.reportMode || "";

    return {
      subject: subject,
      department: department,
      selectedConcept: selectedConcept,
      selectedKeyword: selectedKeyword,
      axis: axis,
      reportIntent: reportIntent,
      strongTerms: uniq([selectedConcept, selectedKeyword].concat(
        Array.isArray(axis) ? axis : [axis]
      ).map(toText).filter(Boolean)),
      weakTerms: uniq([subject, department, reportIntent].map(toText).filter(Boolean))
    };
  }

  function hasRequiredPayload(terms) {
    // 학과만으로 추천되는 것을 막기 위해 개념/추천키워드/후속축 중 하나 이상이 있어야 한다.
    return !!(normalize(terms.selectedConcept) || normalize(terms.selectedKeyword) || normalize(terms.axis));
  }

  function scoreBook(book, terms) {
    const bookText = normalize([
      book.title,
      (book.titleAliases || []).join(" "),
      book.author,
      (book.relatedSubjects || []).join(" "),
      (book.relatedMajors || []).join(" "),
      (book.keywords || []).join(" "),
      book.summary,
      book.reportUse,
      book.searchText
    ].join(" "));

    let score = 0;
    const reasons = [];

    if (includesAny(bookText, [terms.selectedConcept])) {
      score += 40;
      reasons.push("3번 선택 개념 직접 연결");
    }
    if (includesAny(bookText, [terms.selectedKeyword])) {
      score += 35;
      reasons.push("추천 키워드 직접 연결");
    }
    if (includesAny(bookText, [terms.axis])) {
      score += 30;
      reasons.push("4번 후속 연계축 연결");
    }
    if (includesAny((book.relatedMajors || []).join(" ") + " " + bookText, [terms.department])) {
      score += 15;
      reasons.push("학과/전공군 보조 연결");
    }
    if (includesAny((book.relatedSubjects || []).join(" ") + " " + bookText, [terms.subject])) {
      score += 10;
      reasons.push("과목/교과군 보조 연결");
    }
    if (includesAny(bookText, [terms.reportIntent])) {
      score += 5;
      reasons.push("보고서 방향 보조 연결");
    }

    const direct = (
      score >= 45 &&
      (includesAny(bookText, [terms.selectedConcept]) ||
       includesAny(bookText, [terms.selectedKeyword]) ||
       includesAny(bookText, [terms.axis]))
    );

    return {
      score: score,
      reasons: reasons,
      type: direct ? "direct" : (score >= 20 ? "expansion" : "none")
    };
  }

  function recommendBooks(payload, books, options) {
    options = options || {};
    books = books || (global.BOOK_SOURCE_MASTER_210 && global.BOOK_SOURCE_MASTER_210.books) || [];
    const terms = collectPayloadTerms(payload);

    if (!hasRequiredPayload(terms)) {
      return {
        directBooks: [],
        expansionBooks: [],
        selectedBookSummary: null,
        inheritedPayload: payload || {},
        warning: "도서 추천은 학과 단독 추천으로 실행하지 않습니다. 3번 선택 개념, 추천 키워드, 4번 후속 연계축 중 하나 이상이 필요합니다."
      };
    }

    const scored = books.map(function (book) {
      const s = scoreBook(book, terms);
      return Object.assign({}, book, {
        matchScore: s.score,
        matchType: s.type,
        matchReasons: s.reasons,
        directMatchReason: s.reasons.join(" · "),
        expansionReason: s.type === "expansion" ? s.reasons.join(" · ") : ""
      });
    }).filter(function (book) {
      return book.matchType !== "none";
    }).sort(function (a, b) {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.managementNo - b.managementNo;
    });

    const directLimit = options.directLimit || 3;
    const expansionLimit = options.expansionLimit || 5;

    const directBooks = scored.filter(function (b) { return b.matchType === "direct"; }).slice(0, directLimit);
    const directIds = new Set(directBooks.map(function (b) { return b.sourceId; }));
    const expansionBooks = scored.filter(function (b) {
      return b.matchType === "expansion" && !directIds.has(b.sourceId);
    }).slice(0, expansionLimit);

    return {
      directBooks: directBooks,
      expansionBooks: expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || null,
      inheritedPayload: payload || {},
      terms: terms
    };
  }

  global.BookRecommendationAdapter = {
    collectPayloadTerms: collectPayloadTerms,
    recommendBooks: recommendBooks,
    loadBookMaster: loadBookMaster,
    resolveBookEngineBase: resolveBookEngineBase,
    buildBaseCandidates: buildBaseCandidates
  };
})(typeof window !== "undefined" ? window : globalThis);
