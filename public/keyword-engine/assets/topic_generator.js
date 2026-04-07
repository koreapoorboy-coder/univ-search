window.__TOPIC_GENERATOR_VERSION = "v1.1-complete";

(function(){
  function esc(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function uniq(arr){
    return [...new Set((arr || []).filter(Boolean))];
  }

  function buildTopics(keyword, subject, concept, career){
    const base = uniq([
      `${keyword}이(가) 실생활에서 어떻게 활용되는지 분석하기`,
      `${keyword}을(를) ${subject} 개념과 연결해 탐구 주제로 바꾸기`,
      `${keyword}과(와) ${career}를 연결한 자료조사형 탐구 설계하기`
    ]);

    const pair = `${keyword}|${career}`;
    const custom = {
      "정밀 측정|물리학": [
        "정밀 측정이 필요한 실험 사례를 조사하고 오차를 줄이는 방법 비교하기",
        "센서와 측정 장비가 물리 실험에서 정확도를 높이는 원리 정리하기",
        "일상 속 측정 도구를 비교해 어떤 상황에서 더 정확한지 분석하기"
      ],
      "위치 추적|정보": [
        "GPS와 센서 데이터가 위치 추적에 어떻게 활용되는지 조사하기",
        "지도 앱의 위치 추적 원리를 좌표와 데이터 처리 관점에서 설명하기",
        "드론·자율주행에서 위치 추적 기술이 왜 중요한지 사례 분석하기"
      ],
      "위치 추적|지구과학": [
        "태풍 이동 경로 예측에 위치 추적 데이터가 어떻게 쓰이는지 조사하기",
        "지진 관측과 화산 감시에서 위치 정보가 왜 중요한지 정리하기",
        "행성 운동 관측에서 위치 추적이 어떤 역할을 하는지 사례 분석하기"
      ],
      "자극 반응|생명과학 탐구": [
        "생물이 빛·소리·온도 자극에 어떻게 반응하는지 사례 비교하기",
        "식물과 동물의 자극 반응 차이를 자료조사로 정리하기",
        "일상생활 속 자극 반응 사례를 생명과학 개념으로 설명하기"
      ],
      "나트륨 이온|생명과학 탐구": [
        "나트륨 이온이 신경 전달에서 어떤 역할을 하는지 조사하기",
        "세포막을 통한 이온 이동과 항상성의 관계를 정리하기",
        "운동 후 전해질 보충이 왜 필요한지 나트륨 이온 관점에서 설명하기"
      ],
      "속도 측정 카메라|물리학": [
        "속도 측정 카메라가 속도를 계산하는 원리를 조사하기",
        "속도 측정에 쓰이는 센서와 시간 측정 방법을 비교하기",
        "과속 단속 장치가 물리 개념과 어떻게 연결되는지 정리하기"
      ],
      "전자|기계공학": [
        "전자 개념이 기계 시스템과 어떤 방식으로 연결되는지 조사하기",
        "모터·센서·제어 장치에서 전자가 어떤 역할을 하는지 사례 분석하기",
        "일상 속 기계 장치에 전기·전자 원리가 어떻게 적용되는지 정리하기"
      ]
    };

    return uniq((custom[pair] || []).concat(base)).slice(0, 3);
  }

  function buildGuide(keyword, career){
    return `${keyword}을(를) 그대로 쓰기보다, 실제 사례·원리·비교 요소를 붙이면 수행평가 주제로 더 좋아져요. ${career} 방향으로 연결하면 탐구의 목적도 더 분명해집니다.`;
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const keyword = ctx?.keyword || "";
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";

    if(!keyword || !career) return "";

    const topics = buildTopics(keyword, subject, concept, career);
    const guide = buildGuide(keyword, career);

    return `
      <div class="topic-suggestion-card">
        <div class="topic-suggestion-head">
          <h4>6. 이 개념으로 할 수 있는 탐구 주제</h4>
          <div class="topic-suggestion-guide">바로 수행평가 주제로 연결</div>
        </div>

        <p class="topic-suggestion-desc">${esc(guide)}</p>
        <div class="topic-pick-guide">👉 위 3개 중 하나를 선택해서 바로 수행평가 주제로 써보세요.</div>

        <div class="topic-suggestion-list">
          ${topics.map((topic, idx) => `
            <div class="topic-item">
              <div class="topic-no">${idx + 1}</div>
              <div class="topic-text">${esc(topic)}</div>
            </div>
          `).join("")}
        </div>

        <div class="topic-tip-box">
          <div class="topic-tip-label">주제 잡는 팁</div>
          <p>${esc(concept)} 단원에서 배운 원리를 붙이고, ${esc(career)}와 연결되는 실제 사례를 넣으면 더 설득력 있는 주제가 됩니다.</p>
        </div>
      </div>
    `;
  };
})();
