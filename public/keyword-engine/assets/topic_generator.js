window.__TOPIC_GENERATOR_VERSION = "v3.0-constrained-combo";

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

  async function loadSeed(){
    if (seedData) return seedData;
    try{
      const res = await fetch(SEED_URL, { cache: "no-store" });
      seedData = res.ok ? await res.json() : {};
    }catch{
      seedData = {};
    }
    return seedData;
  }

  function getKeywordProfile(keyword){
    return (seedData?.keywordProfiles?.[keyword]) || (seedData?.keywordProfiles?._default) || {};
  }

  function getCareerProfile(career){
    return (seedData?.careerProfiles?.[career]) || (seedData?.careerProfiles?._default) || {};
  }

  function getTargetsByCategories(categories){
    const allowed = new Set(categories || []);
    return (seedData?.targets || []).filter(item => allowed.has(item.category));
  }

  function intersectOrFallback(a, b, fallback){
    const setB = new Set((b || []).filter(Boolean));
    const result = (a || []).filter(v => setB.has(v));
    return result.length ? result : (fallback || a || []);
  }

  function getAllowedTargets(keyword, career){
    const kp = getKeywordProfile(keyword);
    const cp = getCareerProfile(career);

    const keywordCats = kp.categories || [];
    const careerCats = cp.categories || [];
    const mergedCats = uniq([...keywordCats, ...careerCats]);
    const targets = getTargetsByCategories(mergedCats);

    const starter = kp.starterExamples || [];
    const starterObjects = starter.map(name => (seedData.targets || []).find(t => t.name === name)).filter(Boolean);
    const combined = uniq([...starterObjects, ...targets].map(v => JSON.stringify(v))).map(v => JSON.parse(v));

    return combined.slice(0, 8);
  }

  function getAllowedPerspectives(keyword, career, routeType){
    const kp = getKeywordProfile(keyword);
    const cp = getCareerProfile(career);
    const candidate = intersectOrFallback(kp.perspectives || [], cp.perspectives || [], uniq([...(kp.perspectives || []), ...(cp.perspectives || [])]));
    const allowedByRoute = (seedData?.perspectives || []).filter(p => (p.routes || []).includes(routeType)).map(p => p.name);
    return candidate.filter(v => allowedByRoute.includes(v)).slice(0, 6);
  }

  function buildTopic(routeType, keyword, career, target, perspective){
    const route = seedData?.routeTypes?.[routeType] || {};
    const template = route.template || "{keyword}과 관련된 주제 만들기";
    return template
      .replaceAll("{keyword}", keyword || "이 개념")
      .replaceAll("{career}", career || "관심 전공")
      .replaceAll("{target}", target || "실제 사례")
      .replaceAll("{perspective}", perspective || "원리");
  }

  function buildChips(items, kind, activeIndex){
    return items.map((item, idx) => {
      const label = item.name || item;
      const hint = item.hint || "";
      return `
        <button type="button" class="topic-choice-chip ${idx === activeIndex ? "is-active" : ""}" data-kind="${esc(kind)}" data-value="${esc(label)}">
          <span class="topic-choice-main">${esc(label)}</span>
          ${hint ? `<span class="topic-choice-sub">${esc(hint)}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  function cardHTML(routeType, keyword, career, targets, perspectives){
    const route = seedData?.routeTypes?.[routeType] || {};
    const initTarget = targets[0]?.name || targets[0] || "실제 사례";
    const initPerspective = perspectives[0] || "원리";
    const preview = buildTopic(routeType, keyword, career, initTarget, initPerspective);

    return `
      <div class="topic-combo-card" data-route-type="${esc(routeType)}">
        <div class="topic-combo-top">
          <div>
            <div class="topic-combo-label">${esc(route.label || "탐구형")}</div>
            <div class="topic-combo-desc">${esc(route.description || "주제를 골라보세요.")}</div>
          </div>
          <div class="topic-combo-mini">연결되는 것만 추천</div>
        </div>

        <div class="topic-combo-section">
          <div class="topic-combo-section-title">1) 어떤 사례로 볼까?</div>
          <div class="topic-chip-wrap topic-chip-wrap--target">
            ${buildChips(targets, "target", 0)}
          </div>
        </div>

        <div class="topic-combo-section">
          <div class="topic-combo-section-title">2) 무엇을 중심으로 볼까?</div>
          <div class="topic-chip-wrap topic-chip-wrap--perspective">
            ${buildChips(perspectives, "perspective", 0)}
          </div>
        </div>

        <div class="topic-preview-box">
          <div class="topic-preview-label">자동 생성된 주제</div>
          <div class="topic-preview-text">${esc(preview)}</div>
        </div>

        <div class="topic-preview-help">이 카드에는 ${esc(keyword)}와 ${esc(career)}에 실제로 연결될 수 있는 사례만 보이게 했어요.</div>
      </div>
    `;
  }

  function updateCardPreview(card, root){
    const routeType = card.getAttribute("data-route-type") || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const selectedTarget = card.querySelector('.topic-choice-chip[data-kind="target"].is-active .topic-choice-main')?.textContent || "";
    const selectedPerspective = card.querySelector('.topic-choice-chip[data-kind="perspective"].is-active .topic-choice-main')?.textContent || "";
    const preview = buildTopic(routeType, keyword, career, selectedTarget, selectedPerspective);
    const previewText = card.querySelector(".topic-preview-text");
    if (previewText) previewText.textContent = preview;
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
      updateCardPreview(card, root);
    });
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const keyword = ctx?.keyword || "";
    const career = ctx?.career || "";
    if(!keyword || !career) return "";

    bindEvents();

    const fallback = {
      routeTypes: {
        applied: {label:"생활 적용형",description:"실생활 사례에 연결해요.",template:"{keyword}이(가) {target}에서 어떻게 활용되는지 {perspective} 중심으로 알아보기"},
        compare: {label:"비교형",description:"둘을 비교하는 주제예요.",template:"{keyword}과(와) 관련된 {target} 사례를 {perspective} 관점에서 비교해보기"},
        major: {label:"전공 연결형",description:"전공 방향으로 넓혀요.",template:"{career}에서 {target}를 다룰 때 {keyword}이(가) 어떤 역할을 하는지 {perspective} 중심으로 정리해보기"}
      }
    };
    if (!seedData) seedData = fallback;
    loadSeed();

    const targets = getAllowedTargets(keyword, career);
    const appliedPerspectives = getAllowedPerspectives(keyword, career, "applied");
    const comparePerspectives = getAllowedPerspectives(keyword, career, "compare");
    const majorPerspectives = getAllowedPerspectives(keyword, career, "major");

    const cards = [
      cardHTML("applied", keyword, career, targets.slice(0,4), appliedPerspectives.slice(0,4)),
      cardHTML("compare", keyword, career, targets.slice(1,5).concat(targets.slice(0,1)).slice(0,4), comparePerspectives.slice(0,4)),
      cardHTML("major", keyword, career, targets.slice(2,6).concat(targets.slice(0,2)).slice(0,4), majorPerspectives.slice(0,4))
    ].join("");

    return `
      <div class="topic-suggestion-card" data-keyword="${esc(keyword)}" data-career="${esc(career)}">
        <div class="topic-suggestion-head">
          <h4>6. 이 개념으로 할 수 있는 탐구 주제</h4>
          <div class="topic-suggestion-guide">이상한 조합이 안 나오게 개선</div>
        </div>

        <p class="topic-suggestion-desc">아무 단어나 섞어서 주제를 만드는 방식이 아니라, <b>${esc(keyword)}</b>와 <b>${esc(career)}</b>에 실제로 연결될 수 있는 사례만 먼저 골라 보여주도록 바꿨어요.</p>

        <div class="topic-pick-guide">👉 어렵게 생각하지 말고, 가장 관심 가는 사례 1개와 보고 싶은 관점 1개를 눌러보세요. 말이 자연스럽게 이어지는 주제만 나오게 했습니다.</div>

        <div class="topic-combo-grid">${cards}</div>

        <div class="topic-tip-box">
          <div class="topic-tip-label">왜 이전보다 더 자연스러워졌을까?</div>
          <p>키워드마다 연결 가능한 <b>사례 범위</b>와 <b>관점</b>을 따로 제한해서, 맞지 않는 조합은 처음부터 보이지 않게 만들었어요.</p>
        </div>
      </div>
    `;
  };
})();
