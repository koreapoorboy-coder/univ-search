
window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v3.3-student-friendly";

(function(){
  function $(id){ return document.getElementById(id); }
  function escapeHtml(v){ return String(v||""); }

  function buildStudentBlock(keyword){
    return `
      <div class="reason-card">
        <h4>${keyword}은(는) 어디에 쓰일까?</h4>

        <div class="reason-section">
          <b>추천 전공</b>
          <div class="chips">
            <span>수학과 (수식으로 분석)</span>
            <span>통계학과 (데이터 해석)</span>
            <span>컴퓨터공학과 (계산/프로그램)</span>
          </div>
        </div>

        <div class="reason-section">
          <b>왜 중요할까?</b>
          <p>${keyword}은(는) 실제로 데이터를 정확하게 측정하고 비교할 때 쓰이는 개념이에요.</p>
        </div>

        <div class="reason-section">
          <b>통합과학1에서는?</b>
          <p>과학의 측정과 우리 사회 단원에서 활용돼요.</p>
        </div>

        <div class="reason-section">
          <b>같이 보면 좋은 과목</b>
          <div class="chips">
            <span>공통수학1</span>
            <span>물리학</span>
            <span>정보</span>
          </div>
        </div>

        <div class="reason-section highlight">
          <b>쉽게 말하면</b>
          <p>“숫자를 정확하게 재고 비교하는 능력”과 연결돼요.</p>
        </div>

        <div class="reason-section highlight2">
          <b>이런 학생에게 잘 맞아요</b>
          <p>실험, 측정, 숫자 비교를 좋아하는 학생</p>
        </div>
      </div>
    `;
  }

  window.renderStudentFriendly = function(keyword){
    const box = document.getElementById("textbookReasonBox");
    if(box) box.innerHTML = buildStudentBlock(keyword);
  }

})();
