/* book_recommendation_adapter.js
 * 210권 도서 추천 어댑터 v1
 * 원칙: 학과 단독 추천 금지. 3번 선택 개념 + 추천 키워드 + 4번 후속 연계축 payload를 상속해 5번 도서 추천을 생성한다.
 */
(function (global) {
  "use strict";

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

  async function loadBookMaster(url) {
    const res = await fetch(url || "./data/books/book_source_master_210.json");
    if (!res.ok) throw new Error("도서 master 로드 실패: " + res.status);
    const data = await res.json();
    global.BOOK_SOURCE_MASTER_210 = data;
    return data;
  }

  global.BookRecommendationAdapter = {
    collectPayloadTerms: collectPayloadTerms,
    recommendBooks: recommendBooks,
    loadBookMaster: loadBookMaster
  };
})(typeof window !== "undefined" ? window : globalThis);
