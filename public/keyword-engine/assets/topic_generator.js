window.__TOPIC_GENERATOR_VERSION = "v6.0-single-puzzle";

(function(){
  const SEED_URL = "seed/textbook-v1/topic_matrix_seed.json";
  let seedData = null;
  let listenersBound = false;

  function $(id){ return document.getElementById(id); }

  function esc(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
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

  function uniq(arr){
    return [...new Set((arr || []).filter(Boolean))];
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
    const mergedCats = uniq([...(kp.categories || []), ...(cp.categories || [])]);
    const targets = getTargetsByCategories(mergedCats);
    const starters = (kp.starterExamples || [])
      .map(name => (seedData.targets || []).find(t => t.name === name))
      .filter(Boolean);

    const final = [];
    for(const item of [...starters, ...targets]){
      if(!item?.name) continue;
      if(!final.some(v => v.name === item.name)) final.push(item);
    }
    return final.slice(0, 8);
  }

  function getAllowedPerspectives(keyword, career){
    const kp = getKeywordProfile(keyword);
    const cp = getCareerProfile(career);
    return intersectOrFallback(
      kp.perspectives || [],
      cp.perspectives || [],
      uniq([...(kp.perspectives || []), ...(cp.perspectives || [])])
    ).slice(0, 6);
  }

  function getPerspectiveHint(name){
    return (seedData?.perspectives || []).find(p => p.name === name)?.hint || "";
  }

  function getTargetHint(name){
    return (seedData?.targets || []).find(t => t.name === name)?.hint || "";
  }

  function buildStructuredSummary({routeType, keyword, career, target, perspective}){
    const routeMap = {
      applied: "생활 연결",
      compare: "비교하기",
      major: "전공 연결"
    };
    const route = routeMap[routeType] || "탐구";
    const targetHint = getTargetHint(target);
    const perspectiveHint = getPerspectiveHint(perspective);
    const title = `${keyword}을(를) ${target} 사례로 살펴보며 ${perspective} 중심으로 정리하기`;
    const question = `${keyword}이(가) ${target} 사례에서 어떤 역할을 하며, ${perspective} 관점에서 무엇을 설명할 수 있을까? ${career} 방향과 연결해 보기`;

    return {
      route, target, targetHint, perspective, perspectiveHint, title, question,
      reportText:
`[보고서 생성용 입력값]
탐구 방식: ${route}
핵심 키워드: ${keyword}
연결 전공/방향: ${career}
사례: ${target}
사례 설명: ${targetHint || "-"}
관점: ${perspective}
관점 설명: ${perspectiveHint || "-"}
추천 제목: ${title}
핵심 질문: ${question}

위 내용을 바탕으로 학생용 수행평가 보고서 초안을 자연스럽게 작성해줘.
문체는 고등학생 수준에 맞추고, 서론-본론-결론 흐름이 보이게 정리해줘.`
    };
  }

  function chipHTML(items, kind){
    return items.map((item, idx) => {
      const label = item.name || item;
      const hint = item.hint || getPerspectiveHint(label) || "";
      return `
        <button type="button" class="puzzle-chip ${idx === 0 ? "is-active" : ""}" data-kind="${esc(kind)}" data-value="${esc(label)}">
          <span class="puzzle-chip-main">${esc(label)}</span>
          ${hint ? `<span class="puzzle-chip-sub">${esc(hint)}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  function updateSummary(root){
    const routeType = root.querySelector('.puzzle-chip[data-kind="route"].is-active')?.getAttribute("data-value") || "applied";
    const target = root.querySelector('.puzzle-chip[data-kind="target"].is-active .puzzle-chip-main')?.textContent || "";
    const perspective = root.querySelector('.puzzle-chip[data-kind="perspective"].is-active .puzzle-chip-main')?.textContent || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const summary = buildStructuredSummary({routeType, keyword, career, target, perspective});

    root.querySelector(".puzzle-summary-route").textContent = summary.route;
    root.querySelector(".puzzle-summary-target").textContent = summary.target;
    root.querySelector(".puzzle-summary-target-hint").textContent = summary.targetHint || "선택한 사례를 중심으로 조사";
    root.querySelector(".puzzle-summary-perspective").textContent = summary.perspective;
    root.querySelector(".puzzle-summary-perspective-hint").textContent = summary.perspectiveHint || "선택한 시각으로 정리";
    root.querySelector(".puzzle-summary-title").textContent = summary.title;
    root.querySelector(".puzzle-summary-question").textContent = summary.question;
    root.querySelector(".puzzle-report-payload").value = summary.reportText;
  }

  function applyToTaskDescription(root){
    const text = root.querySelector(".puzzle-report-payload")?.value || "";
    if(!text) return;
    const taskDesc = $("taskDescription");
    if(taskDesc){
      const cleaned = (taskDesc.value || "").replace(/\n*\[보고서 생성용 입력값\][\s\S]*$/m, "").trim();
      taskDesc.value = cleaned ? `${cleaned}\n\n${text}` : text;
    }
    const notice = root.querySelector(".puzzle-copy-notice");
    if(notice){
      notice.textContent = "선택한 내용이 수행평가 설명 칸에 반영됐어요.";
      notice.style.display = "block";
      setTimeout(() => { notice.style.display = "none"; }, 1800);
    }
  }

  function bindEvents(){
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", function(event){
      const chip = event.target.closest(".puzzle-chip");
      if (chip){
        const root = chip.closest(".single-puzzle-root");
        if(!root) return;
        if (chip.classList.contains("is-active")) return;
        const kind = chip.getAttribute("data-kind");
        root.querySelectorAll(`.puzzle-chip[data-kind="${kind}"]`).forEach(btn => btn.classList.remove("is-active"));
        chip.classList.add("is-active");
        updateSummary(root);
        return;
      }

      const applyBtn = event.target.closest(".puzzle-apply-btn");
      if(applyBtn){
        const root = applyBtn.closest(".single-puzzle-root");
        if(root) applyToTaskDescription(root);
      }
    });
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const keyword = ctx?.keyword || "";
    const career = ctx?.career || "";
    if(!keyword || !career) return "";

    bindEvents();
    if (!seedData) seedData = {};
    loadSeed();

    const targets = getAllowedTargets(keyword, career).slice(0, 6);
    const perspectives = getAllowedPerspectives(keyword, career).slice(0, 6);

    const firstTarget = targets[0]?.name || targets[0] || "";
    const firstPerspective = perspectives[0] || "";
    const firstSummary = buildStructuredSummary({
      routeType: "applied", keyword, career, target: firstTarget, perspective: firstPerspective
    });

    return `
      <div class="topic-suggestion-card single-puzzle-root" data-keyword="${esc(keyword)}" data-career="${esc(career)}">
        <div class="topic-suggestion-head">
          <h4>6. 조각 맞추기로 탐구 방향 정하기</h4>
          <div class="topic-suggestion-guide">학생용 퍼즐 선택 UI</div>
        </div>

        <p class="topic-suggestion-desc">긴 설명 카드를 읽는 대신, 아래에서 <b>질문</b> / <b>사례</b> / <b>관점</b>을 하나씩 골라 탐구 방향을 맞춰 보세요.</p>

        <div class="topic-pick-guide">👉 정답은 없어요. 가장 관심 가는 조합을 골라보면 됩니다.</div>

        <div class="puzzle-step">
          <div class="puzzle-step-label">1. 어떤 질문으로 더 살펴볼까?</div>
          <div class="puzzle-chip-wrap">
            <button type="button" class="puzzle-chip is-active" data-kind="route" data-value="applied"><span class="puzzle-chip-main">어디에 쓰일까?</span></button>
            <button type="button" class="puzzle-chip" data-kind="route" data-value="compare"><span class="puzzle-chip-main">무엇이 다를까?</span></button>
            <button type="button" class="puzzle-chip" data-kind="route" data-value="major"><span class="puzzle-chip-main">어떤 진로와 이어질까?</span></button>
          </div>
        </div>

        <div class="puzzle-step">
          <div class="puzzle-step-label">2. 어떤 사례를 고를까?</div>
          <div class="puzzle-chip-wrap">
            ${chipHTML(targets, "target")}
          </div>
        </div>

        <div class="puzzle-step">
          <div class="puzzle-step-label">3. 무엇을 중심으로 볼까?</div>
          <div class="puzzle-chip-wrap">
            ${chipHTML(perspectives, "perspective")}
          </div>
        </div>

        <div class="puzzle-result-box">
          <div class="puzzle-result-head">
            <div class="puzzle-result-title">선택 결과</div>
            <div class="puzzle-result-mini">보고서로 넘길 내용</div>
          </div>

          <div class="puzzle-result-grid">
            <div class="puzzle-result-item">
              <div class="puzzle-result-label">탐구 방식</div>
              <div class="puzzle-result-value puzzle-summary-route">${esc(firstSummary.route)}</div>
            </div>
            <div class="puzzle-result-item">
              <div class="puzzle-result-label">사례</div>
              <div class="puzzle-result-value puzzle-summary-target">${esc(firstSummary.target)}</div>
              <div class="puzzle-result-sub puzzle-summary-target-hint">${esc(firstSummary.targetHint || "선택한 사례를 중심으로 조사")}</div>
            </div>
            <div class="puzzle-result-item">
              <div class="puzzle-result-label">관점</div>
              <div class="puzzle-result-value puzzle-summary-perspective">${esc(firstSummary.perspective)}</div>
              <div class="puzzle-result-sub puzzle-summary-perspective-hint">${esc(firstSummary.perspectiveHint || "선택한 시각으로 정리")}</div>
            </div>
            <div class="puzzle-result-item">
              <div class="puzzle-result-label">전공/확장 방향</div>
              <div class="puzzle-result-value">${esc(career)}</div>
            </div>
          </div>

          <div class="puzzle-focus-box">
            <div class="puzzle-focus-item">
              <div class="puzzle-result-label">추천 제목</div>
              <div class="puzzle-focus-value puzzle-summary-title">${esc(firstSummary.title)}</div>
            </div>
            <div class="puzzle-focus-item">
              <div class="puzzle-result-label">핵심 질문</div>
              <div class="puzzle-focus-value puzzle-summary-question">${esc(firstSummary.question)}</div>
            </div>
          </div>

          <textarea class="puzzle-report-payload" style="display:none;">${esc(firstSummary.reportText)}</textarea>

          <div class="puzzle-result-help">완성 문장을 억지로 보여주는 대신, MINI가 잘 이해할 수 있는 입력값으로 먼저 정리해요.</div>
          <div class="puzzle-result-actions">
            <button type="button" class="puzzle-apply-btn">선택한 내용으로 보고서 방향 정리</button>
            <div class="puzzle-copy-notice" style="display:none;"></div>
          </div>
        </div>

        <div class="topic-tip-box">
          <div class="topic-tip-label">왜 이렇게 바꿨을까?</div>
          <p>학생은 긴 카드 설명보다 하나씩 고르는 구조를 더 쉽게 느껴요. 그래서 6번을 카드 읽기형이 아니라, 조각 맞추기처럼 선택하는 구조로 바꿨어요.</p>
        </div>
      </div>
    `;
  };
})();
