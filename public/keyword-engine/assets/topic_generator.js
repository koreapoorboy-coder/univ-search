window.__TOPIC_GENERATOR_VERSION = "v2.0-combo-ui";

(function(){
  const SEED_URL = "seed/textbook-v1/topic_matrix_seed.json";
  let seedData = null;
  let listenersBound = false;

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

  function loadSeed(){
    if (seedData) return Promise.resolve(seedData);
    return fetch(SEED_URL, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        seedData = data || { commonTargets: [], commonPerspectives: [], routeTypes: {} };
        return seedData;
      })
      .catch(() => {
        seedData = { commonTargets: [], commonPerspectives: [], routeTypes: {} };
        return seedData;
      });
  }

  function pickList(keyword, career, field){
    const common = seedData?.[field === "targets" ? "commonTargets" : "commonPerspectives"] || [];
    const byKeyword = seedData?.keywordOverrides?.[keyword]?.[field] || [];
    const byCareer = seedData?.careerOverrides?.[career]?.[field] || [];
    return uniq([...byKeyword, ...byCareer, ...common]).slice(0, 8);
  }

  function buildTopic(routeType, keyword, career, target, perspective){
    const template = seedData?.routeTypes?.[routeType]?.template || "{keyword}을(를) 활용한 탐구 주제 만들기";
    return template
      .replaceAll("{keyword}", keyword || "이 개념")
      .replaceAll("{career}", career || "관심 전공")
      .replaceAll("{target}", target || "실제 사례")
      .replaceAll("{perspective}", perspective || "원리");
  }

  function cardHTML(routeType, keyword, subject, concept, career, targets, perspectives){
    const route = seedData?.routeTypes?.[routeType] || {};
    const initTarget = targets[0] || "실제 사례";
    const initPerspective = perspectives[0] || "원리";
    const preview = buildTopic(routeType, keyword, career, initTarget, initPerspective);

    return `
      <div class="topic-combo-card" data-route-type="${esc(routeType)}">
        <div class="topic-combo-top">
          <div>
            <div class="topic-combo-label">${esc(route.label || "탐구형")}</div>
            <div class="topic-combo-desc">${esc(route.description || "주제를 골라보세요.")}</div>
          </div>
          <div class="topic-combo-mini">중복 줄이는 선택형</div>
        </div>

        <div class="topic-combo-section">
          <div class="topic-combo-section-title">1) 무엇을 중심으로 볼까?</div>
          <div class="topic-chip-wrap topic-chip-wrap--target">
            ${targets.map((item, idx) => `
              <button type="button" class="topic-choice-chip ${idx === 0 ? "is-active" : ""}" data-kind="target" data-value="${esc(item)}">${esc(item)}</button>
            `).join("")}
          </div>
        </div>

        <div class="topic-combo-section">
          <div class="topic-combo-section-title">2) 어떤 시각으로 볼까?</div>
          <div class="topic-chip-wrap topic-chip-wrap--perspective">
            ${perspectives.map((item, idx) => `
              <button type="button" class="topic-choice-chip ${idx === 0 ? "is-active" : ""}" data-kind="perspective" data-value="${esc(item)}">${esc(item)}</button>
            `).join("")}
          </div>
        </div>

        <div class="topic-preview-box">
          <div class="topic-preview-label">자동 생성된 주제</div>
          <div class="topic-preview-text">${esc(preview)}</div>
        </div>

        <div class="topic-preview-help">같은 키워드를 골라도 선택하는 대상과 시각이 달라지면 주제가 달라집니다.</div>
      </div>
    `;
  }

  function bindEvents(){
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", function(event){
      const chip = event.target.closest(".topic-choice-chip");
      if (!chip) return;

      const card = chip.closest(".topic-combo-card");
      const root = chip.closest(".topic-suggestion-card");
      if (!card || !root) return;

      const kind = chip.getAttribute("data-kind");
      card.querySelectorAll(`.topic-choice-chip[data-kind="${kind}"]`).forEach(btn => btn.classList.remove("is-active"));
      chip.classList.add("is-active");

      const routeType = card.getAttribute("data-route-type") || "";
      const keyword = root.getAttribute("data-keyword") || "";
      const career = root.getAttribute("data-career") || "";

      const selectedTarget = card.querySelector('.topic-choice-chip[data-kind="target"].is-active')?.getAttribute("data-value") || "";
      const selectedPerspective = card.querySelector('.topic-choice-chip[data-kind="perspective"].is-active')?.getAttribute("data-value") || "";
      const preview = buildTopic(routeType, keyword, career, selectedTarget, selectedPerspective);

      const previewText = card.querySelector(".topic-preview-text");
      if (previewText) previewText.textContent = preview;
    });
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const keyword = ctx?.keyword || "";
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";

    if(!keyword || !career) return "";

    bindEvents();

    const fallbackSeed = {
      commonTargets: ["실생활 물건", "기술 사례", "장치", "재료", "기기"],
      commonPerspectives: ["원리", "구조", "기능", "비교"],
      routeTypes: {
        applied: { label: "생활 적용형", description: "실생활에 연결하는 주제예요.", template: "{keyword}이(가) {target}에서 어떻게 쓰이는지 {perspective} 중심으로 알아보기" },
        compare: { label: "비교형", description: "둘을 비교하는 주제예요.", template: "{keyword}과(와) 관련된 {target} 사례를 {perspective} 관점에서 비교해보기" },
        major: { label: "전공 연결형", description: "{career} 방향으로 넓히는 주제예요.", template: "{career}에서 {target}를 다룰 때 {keyword}이(가) 어떤 역할을 하는지 {perspective} 중심으로 정리해보기" }
      }
    };

    if (!seedData) seedData = fallbackSeed;

    const targets = pickList(keyword, career, "targets");
    const perspectives = pickList(keyword, career, "perspectives");

    const routeTypes = ["applied", "compare", "major"];
    const cards = routeTypes.map(routeType => {
      const shiftedTargets = routeType === "compare" ? targets.slice(1).concat(targets.slice(0,1)) : (routeType === "major" ? targets.slice(2).concat(targets.slice(0,2)) : targets);
      const shiftedPerspectives = routeType === "compare" ? perspectives.slice(1).concat(perspectives.slice(0,1)) : (routeType === "major" ? perspectives.slice(2).concat(perspectives.slice(0,2)) : perspectives);
      return cardHTML(routeType, keyword, subject, concept, career, shiftedTargets.slice(0,4), shiftedPerspectives.slice(0,4));
    }).join("");

    loadSeed();

    return `
      <div class="topic-suggestion-card" data-keyword="${esc(keyword)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}" data-career="${esc(career)}">
        <div class="topic-suggestion-head">
          <h4>6. 이 개념으로 할 수 있는 탐구 주제</h4>
          <div class="topic-suggestion-guide">조합형 주제 생성 UI</div>
        </div>

        <p class="topic-suggestion-desc">주제를 그대로 주는 대신, <b>탐구 대상</b>과 <b>보는 시각</b>을 직접 골라서 주제를 만들게 했어요. 같은 키워드를 골라도 결과가 달라져서 중복이 줄어듭니다.</p>

        <div class="topic-pick-guide">👉 각 카드에서 버튼을 눌러보면 주제가 바로 바뀝니다. 3개 중 마음에 드는 방향을 골라 수행평가 주제로 쓰면 됩니다.</div>

        <div class="topic-combo-grid">
          ${cards}
        </div>

        <div class="topic-tip-box">
          <div class="topic-tip-label">6번을 확장하려면 어떤 데이터가 필요할까?</div>
          <p><b>탐구 유형</b>(생활 적용형/비교형/전공 연결형), <b>탐구 대상</b>(배터리·자동차·센서 등), <b>탐구 관점</b>(구조·기능·정확도·비교 등) 데이터가 많을수록 중복이 줄어듭니다.</p>
        </div>
      </div>
    `;
  };
})();
