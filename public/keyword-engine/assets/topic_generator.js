
window.__TOPIC_GENERATOR_VERSION = "v1.0";

(function(){
  function $(id){ return document.getElementById(id); }

  function generateTopics(keyword){
    return [
      `${keyword}을 활용한 실생활 사례 분석`,
      `${keyword} 개념을 적용한 탐구 실험 설계`,
      `${keyword}와 다른 교과 개념을 연결한 융합 탐구`
    ];
  }

  window.renderTopicSuggestions = function(keyword){
    const box = document.createElement("div");
    box.className = "topic-box";

    const topics = generateTopics(keyword);

    box.innerHTML = `
      <h3>6. 이 개념으로 할 수 있는 탐구 주제</h3>
      <ul>
        ${topics.map(t => `<li>${t}</li>`).join("")}
      </ul>
    `;

    const target = document.getElementById("textbookReasonBox");
    if(target){
      target.parentNode.appendChild(box);
    }
  };

})();
