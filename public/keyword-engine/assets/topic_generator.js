
window.__TOPIC_GENERATOR_VERSION = "v12-career-first-flow";

(function(){

function esc(v){
  return String(v||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

const CAREER_BOOK_MAP = {
  "지구환경": ["코스모스","과학혁명의 법칙","과학의 눈으로 세상 읽기"],
  "환경 데이터": ["과학의 눈으로 세상 읽기","코스모스"],
  "컴퓨터": ["1984","경영학 콘서트"],
  "데이터": ["경영학 콘서트","1984"],
  "의학": ["닥터스 씽킹","의학적 사고의 법칙"],
  "간호": ["닥터스 씽킹"]
};

function getBooksByCareer(career){
  return CAREER_BOOK_MAP[career] || [];
}

window.renderTopicSuggestionHTML = function(ctx){
  const subject = ctx?.subject || "";
  const concept = ctx?.concept || "";
  const career = ctx?.career || "";

  if(!subject || !career){
    return "";
  }

  const books = getBooksByCareer(career);

  if(books.length === 0){
    return `
      <div class="book-puzzle-root">
        <div class="book-result-box">
          현재 이 진로와 연결되는 도서 데이터가 없습니다.
        </div>
      </div>
    `;
  }

  return `
    <div class="book-puzzle-root">
      <h4>진로 기반 도서 추천</h4>

      <div class="book-step">
        <div class="book-step-label">1. 진로 기반 도서 선택</div>
        <div class="book-chip-wrap">
          ${books.map((b,i)=>`
            <button class="book-chip ${i===0?"is-active":""}">
              ${esc(b)}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="book-step">
        <div class="book-step-label">2. 교과 개념 연결</div>
        <div class="book-desc">
          선택한 도서와 ${esc(concept)} 개념을 연결하여 탐구를 진행합니다.
        </div>
      </div>

      <div class="book-result-box">
        진로 → 도서 → 교과 개념 흐름으로 탐구가 생성됩니다.
      </div>
    </div>
  `;
};

})();
