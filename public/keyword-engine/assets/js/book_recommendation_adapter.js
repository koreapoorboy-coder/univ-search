/* book_recommendation_adapter.js
 * 210권 도서 추천 어댑터 v1.5 token-fallback-fix
 *
 * 수정 목적:
 * - "디지털 데이터", "센서·측정·데이터", "물리-시스템 해석 축"처럼
 *   책 데이터에 완전 문장으로 들어 있지 않은 선택값도 토큰 단위로 매칭
 * - 3번 선택 개념 / 추천 키워드 / 4번 후속 연계축이 있을 때만 추천
 * - 학과 단독 추천 방어 유지
 * - 기존 3번·4번 로직 수정 없음
 */
(function (global) {
  "use strict";

  const ADAPTER_VERSION = "v1.5-token-fallback-fix";
  const MASTER_FILE = "book_source_master_210.json";
  global.BOOK_ADAPTER_VERSION = ADAPTER_VERSION;

  const STOP_TOKENS = new Set([
    "과학", "사회", "우리", "기반", "후속", "연계", "해석", "선택", "개념",
    "키워드", "보고서", "탐구", "축", "직접", "확장", "추천", "교과", "학과"
  ]);

  function toText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(toText).join(" ");
    if (typeof value === "object") return Object.values(value).map(toText).join(" ");
    return String(value);
  }

  function normalize(value) {
    return toText(value).toLowerCase().replace(/[·ㆍ/|,;:()[\]{}<>]/g, " ").replace(/\s+/g, " ").trim();
  }

  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function tokenize(value) {
    const text = normalize(value);
    return uniq((text.match(/[가-힣A-Za-z0-9]+/g) || [])
      .map(v => v.trim())
      .filter(v => v.length >= 2 && !STOP_TOKENS.has(v)));
  }

  function includesAny(haystack, needles) {
    const h = normalize(haystack);
    return (needles || []).some(function (n) {
      const v = normalize(n);
      return v && h.indexOf(v) >= 0;
    });
  }

  function tokenHits(haystack, tokens) {
    const h = normalize(haystack);
    return uniq((tokens || []).filter(t => t && h.indexOf(normalize(t)) >= 0));
  }

  function trimTrailingSlash(path) {
    return String(path || "").replace(/\/+$/, "");
  }

  function stripFile(pathname) {
    if (!pathname) return "/";
    if (pathname.endsWith("/")) return pathname;
    return pathname.replace(/\/[^/]*$/, "/");
  }

  function buildBaseCandidates() {
    const candidates = [];

    function add(base) {
      base = trimTrailingSlash(base);
      if (base && !candidates.includes(base)) candidates.push(base);
    }

    const loc = global.location;
    const pathname = loc ? loc.pathname : "";

    const keywordMatch = pathname.match(/^(.*?\/keyword-engine)(?:\/|$)/);
    if (keywordMatch) add(keywordMatch[1]);

    const currentDir = stripFile(pathname);
    add(currentDir.replace(/\/$/, ""));
    add(currentDir.replace(/\/assets\/js\/?$/, ""));
    add(currentDir.replace(/\/seed\/book_210_stage2\/?$/, ""));

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

    add("/keyword-engine");
    add("/univ-search/keyword-engine");
    add("/univ-search/public/keyword-engine");
    add("/public/keyword-engine");
    add("./keyword-engine");
    add("./public/keyword-engine");
    add("../keyword-engine");
    add("../public/keyword-engine");
    add(".");

    return candidates;
  }

  async function tryFetchJson(url) {
    const bust = (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(ADAPTER_VERSION) + "&t=" + Date.now();
    const res = await fetch(url + bust, { cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status, url: url };

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (/^\s*</.test(text)) {
      return { ok: false, status: "HTML_INSTEAD_OF_JSON", url: url, contentType: contentType };
    }

    try {
      return { ok: true, status: res.status, url: url, data: JSON.parse(text) };
    } catch (e) {
      return { ok: false, status: "JSON_PARSE_ERROR", url: url, error: e.message, preview: text.slice(0, 120) };
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

        if (result.ok && result.data && Number(result.data.totalBooks) === 210 && Array.isArray(result.data.books)) {
          global.BOOK_ENGINE_BASE = trimTrailingSlash(base);
          global.BOOK_SOURCE_MASTER_210 = result.data;
          return { base: global.BOOK_ENGINE_BASE, url: url, master: result.data, tried: tried };
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

    const conceptTokens = tokenize(selectedConcept);
    const keywordTokens = tokenize(selectedKeyword);
    const axisTokens = tokenize(axis);
    const strongTokens = uniq(conceptTokens.concat(keywordTokens, axisTokens));

    return {
      subject: subject,
      department: department,
      selectedConcept: selectedConcept,
      selectedKeyword: selectedKeyword,
      axis: axis,
      reportIntent: reportIntent,
      conceptTokens: conceptTokens,
      keywordTokens: keywordTokens,
      axisTokens: axisTokens,
      strongTokens: strongTokens,
      strongTerms: uniq([selectedConcept, selectedKeyword].concat(Array.isArray(axis) ? axis : [axis]).map(toText).filter(Boolean)),
      weakTerms: uniq([subject, department, reportIntent].map(toText).filter(Boolean))
    };
  }

  function hasRequiredPayload(terms) {
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

    const conceptHit = includesAny(bookText, [terms.selectedConcept]);
    const keywordHit = includesAny(bookText, [terms.selectedKeyword]);
    const axisHit = includesAny(bookText, [terms.axis]);

    const conceptTokenHits = tokenHits(bookText, terms.conceptTokens);
    const keywordTokenHits = tokenHits(bookText, terms.keywordTokens);
    const axisTokenHits = tokenHits(bookText, terms.axisTokens);

    const majorHit = includesAny((book.relatedMajors || []).join(" ") + " " + bookText, [terms.department]);
    const subjectHit = includesAny((book.relatedSubjects || []).join(" ") + " " + bookText, [terms.subject]);
    const reportHit = includesAny(bookText, [terms.reportIntent]);

    if (conceptHit) {
      score += 40;
      reasons.push("3번 선택 개념 직접 연결");
    } else if (conceptTokenHits.length) {
      score += Math.min(24, conceptTokenHits.length * 8);
      reasons.push("3번 선택 개념 토큰 연결: " + conceptTokenHits.slice(0, 3).join(", "));
    }

    if (keywordHit) {
      score += 35;
      reasons.push("추천 키워드 직접 연결");
    } else if (keywordTokenHits.length) {
      score += Math.min(36, keywordTokenHits.length * 18);
      reasons.push("추천 키워드 토큰 연결: " + keywordTokenHits.slice(0, 3).join(", "));
    }

    if (axisHit) {
      score += 30;
      reasons.push("4번 후속 연계축 직접 연결");
    } else if (axisTokenHits.length) {
      score += Math.min(30, axisTokenHits.length * 10);
      reasons.push("4번 후속 연계축 토큰 연결: " + axisTokenHits.slice(0, 3).join(", "));
    }

    if (majorHit) {
      score += 15;
      reasons.push("학과/전공군 보조 연결");
    }
    if (subjectHit) {
      score += 10;
      reasons.push("과목/교과군 보조 연결");
    }
    if (reportHit) {
      score += 5;
      reasons.push("보고서 방향 보조 연결");
    }

    const strongDirectHit = conceptHit || keywordHit || axisHit || keywordTokenHits.length > 0 || axisTokenHits.length > 0 || conceptTokenHits.length >= 2;
    const strongTokenHitCount = uniq(conceptTokenHits.concat(keywordTokenHits, axisTokenHits)).length;

    // 강한 토큰이 하나라도 있으면 직접 일치 후보.
    // 단, 점수가 너무 낮은 단일 일반 토큰은 제외하기 위해 18점 이상을 요구한다.
    const direct = strongDirectHit && score >= 18;

    return {
      score: score,
      reasons: reasons,
      strongDirectHit: strongDirectHit,
      strongTokenHitCount: strongTokenHitCount,
      type: direct ? "direct" : (score >= 18 ? "expansion" : "none")
    };
  }

  function isDirectReason(book) {
    if (book.strongDirectHit) return true;
    return (book.matchReasons || []).some(function (reason) {
      return String(reason).indexOf("직접 연결") >= 0 || String(reason).indexOf("토큰 연결") >= 0;
    });
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
        adapterVersion: ADAPTER_VERSION,
        warning: "도서 추천은 학과 단독 추천으로 실행하지 않습니다. 3번 선택 개념, 추천 키워드, 4번 후속 연계축 중 하나 이상이 필요합니다."
      };
    }

    const scored = books.map(function (book) {
      const s = scoreBook(book, terms);
      const decorated = Object.assign({}, book, {
        matchScore: s.score,
        matchType: s.type,
        strongDirectHit: s.strongDirectHit,
        strongTokenHitCount: s.strongTokenHitCount,
        matchReasons: s.reasons,
        directMatchReason: s.reasons.join(" · "),
        expansionReason: "",
        adapterVersion: ADAPTER_VERSION
      });
      if (decorated.matchType === "expansion") {
        decorated.expansionReason = decorated.matchReasons.join(" · ");
      }
      return decorated;
    }).filter(function (book) {
      return book.matchType !== "none";
    }).sort(function (a, b) {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if ((b.strongTokenHitCount || 0) !== (a.strongTokenHitCount || 0)) return (b.strongTokenHitCount || 0) - (a.strongTokenHitCount || 0);
      return a.managementNo - b.managementNo;
    });

    const directLimit = options.directLimit || 3;
    const expansionLimit = options.expansionLimit || 5;

    const directBooks = scored.filter(function (b) {
      return b.matchType === "direct" || isDirectReason(b);
    }).slice(0, directLimit);

    const directIds = new Set(directBooks.map(function (b) { return b.sourceId; }));

    const expansionBooks = scored.filter(function (b) {
      return !directIds.has(b.sourceId) && !isDirectReason(b) && b.matchScore >= 18;
    }).slice(0, expansionLimit);

    return {
      directBooks: directBooks,
      expansionBooks: expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || null,
      inheritedPayload: payload || {},
      terms: terms,
      adapterVersion: ADAPTER_VERSION,
      debug: {
        scoredCount: scored.length,
        directCandidateCount: scored.filter(isDirectReason).length,
        strongTokens: terms.strongTokens
      }
    };
  }

  global.BookRecommendationAdapter = {
    version: ADAPTER_VERSION,
    collectPayloadTerms: collectPayloadTerms,
    recommendBooks: recommendBooks,
    loadBookMaster: loadBookMaster,
    resolveBookEngineBase: resolveBookEngineBase,
    buildBaseCandidates: buildBaseCandidates
  };
})(typeof window !== "undefined" ? window : globalThis);
