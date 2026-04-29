/* book_engine_quick_check.js
 * 브라우저 콘솔에서 아래 한 줄로 실행 가능:
 * const s=document.createElement('script');s.src='/keyword-engine/assets/js/book_engine_quick_check.js';document.head.appendChild(s);
 */
(async function () {
  try {
    if (!window.BookRecommendationAdapter) {
      throw new Error("BookRecommendationAdapter가 아직 로드되지 않았습니다. book_recommendation_adapter.js를 먼저 로드하세요.");
    }

    const resolved = await BookRecommendationAdapter.resolveBookEngineBase();
    const master = resolved.master;

    const payload = {
      subject: "통합과학",
      department: "환경공학과",
      selectedConcept: "에너지 전환",
      selectedRecommendedKeyword: "지속가능성",
      followupAxis: "기후 위기와 에너지 시스템"
    };

    const result = BookRecommendationAdapter.recommendBooks(payload, master.books);
    const blocked = BookRecommendationAdapter.recommendBooks({
      subject: "통합과학",
      department: "환경공학과"
    }, master.books);

    console.log("✅ 도서 엔진 경로:", resolved.base);
    console.log("✅ 총 도서 수:", master.totalBooks);
    console.table(result.directBooks.map(b => ({
      구분: "직접",
      번호: b.managementNo,
      제목: b.title,
      점수: b.matchScore,
      근거: b.matchReasons.join(" / ")
    })));
    console.table(result.expansionBooks.map(b => ({
      구분: "확장",
      번호: b.managementNo,
      제목: b.title,
      점수: b.matchScore,
      근거: b.matchReasons.join(" / ")
    })));
    console.log("✅ 학과 단독 방어:", {
      warning: blocked.warning,
      directCount: blocked.directBooks.length,
      expansionCount: blocked.expansionBooks.length
    });
  } catch (e) {
    console.error("❌ 도서 엔진 점검 실패:", e);
  }
})();
