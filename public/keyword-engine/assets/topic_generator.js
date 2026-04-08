window.__TOPIC_GENERATOR_VERSION = "v7.0-json-mini-connected";

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

  function routeLabel(routeType){
    const map = {
      applied: "사례 조사",
      compare: "비교 탐구",
      application: "응용 탐구",
      major: "진로 연결"
    };
    return map[routeType] || "사례 조사";
  }

  function routePrompt(routeType){
    const map = {
      applied: "실제 사례를 찾아보는 방식",
      compare: "둘의 차이를 비교해 보는 방식",
      application: "배운 개념이 어디에 쓰이는지 보는 방식",
      major: "관심 있는 전공과 연결해 보는 방식"
    };
    return map[routeType] || "실제 사례를 찾아보는 방식";
  }

  function buildPayload({routeType, keyword, subject, concept, career, target, perspective}){
    const payload = {
      exploration_mode: routeType,
      exploration_mode_label: routeLabel(routeType),
      exploration_mode_help: routePrompt(routeType),
      subject: subject || "",
      concept: concept || "",
      core_keyword: keyword || "",
      target_case: target || "",
      target_case_hint: getTargetHint(target) || "",
      analysis_view: perspective || "",
      analysis_view_hint: getPerspectiveHint(perspective) || "",
      linked_career: career || ""
    };

    payload.result_line = `${payload.target_case}를 ${payload.analysis_view} 관점에서 ${payload.exploration_mode_label} 방식으로 ${payload.core_keyword} 탐구하기`;
    payload.recommended_title = `${payload.core_keyword}을(를) ${payload.target_case} 사례로 살펴보며 ${payload.analysis_view} 중심으로 정리하기`;
    payload.core_question = `${payload.core_keyword}이(가) ${payload.target_case} 사례에서 어떤 역할을 하며, ${payload.analysis_view} 관점에서 무엇을 설명할 수 있을까? ${payload.linked_career} 방향과 연결해 보기`;

    return payload;
  }

  function buildMiniBlock(payload){
    const jsonText = JSON.stringify(payload, null, 2);
    return `[MINI_REPORT_INPUT_JSON]
${jsonText}

[MINI_REPORT_INSTRUCTION]
위 JSON만 기준으로 고등학생 수준의 수행평가 보고서 초안을 작성해줘.
조건:
1. JSON에 없는 내용은 임의로 크게 확장하지 말 것
2. 서론-본론-결론 흐름이 보이게 쓸 것
3. 문장은 학생이 제출 가능한 자연스러운 한국어로 작성할 것
4. 사례, 관점, 진로 연결이 본문에 드러나게 할 것`;
  }

  function chipHTML(items, kind, selectedIndex=0){
    return items.map((item, idx) => {
      const label = item.name || item;
      const hint = item.hint || getPerspectiveHint(label) || "";
      return `
        <button type="button" class="puzzle-chip ${idx === selectedIndex ? "is-active" : ""}" data-kind="${esc(kind)}" data-value="${esc(label)}">
          <span class="puzzle-chip-main">${esc(label)}</span>
          ${hint ? `<span class="puzzle-chip-sub">${esc(hint)}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  function getCurrentPayload(root){
    const routeType = root.querySelector('.puzzle-chip[data-kind="route"].is-active')?.getAttribute("data-value") || "applied";
    const target = root.querySelector('.puzzle-chip[data-kind="target"].is-active .puzzle-chip-main')?.textContent || "";
    const perspective = root.querySelector('.puzzle-chip[data-kind="perspective"].is-active .puzzle-chip-main')?.textContent || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const subject = root.getAttribute("data-subject") || "";
    const concept = root.getAttribute("data-concept") || "";
    const career = root.getAttribute("data-career") || "";
    return buildPayload({routeType, keyword, subject, concept, career, target, perspective});
  }

  function updateSummary(root){
    const payload = getCurrentPayload(root);
    root.querySelector(".puzzle-result-line").textContent = payload.result_line;
    root.querySelector(".puzzle-json-preview").textContent = JSON.stringify(payload, null, 2);
    root.querySelector(".puzzle-report-payload").value = buildMiniBlock(payload);
  }

  function applyToTaskDescription(root){
    const text = root.querySelector(".puzzle-report-payload")?.value || "";
    if(!text) return;

    const taskDesc = $("taskDescription");
    if(taskDesc){
      const cleaned = (taskDesc.value || "")
        .replace(/\n*\[MINI_REPORT_INPUT_JSON\][\s\S]*$/m, "")
        .trim();
      taskDesc.value = cleaned ? `${cleaned}\n\n${text}` : text;
    }

    const notice = root.querySelector(".puzzle-copy-notice");
    if(notice){
      notice.textContent = "JSON 입력값이 수행평가 설명 칸에 반영됐어요. 이제 학생용 결과 생성을 누르면 됩니다.";
      notice.style.display = "block";
      setTimeout(() => { notice.style.display = "none"; }, 2200);
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
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";
    if(!keyword || !career) return "";

    bindEvents();
    if (!seedData) seedData = {};
    loadSeed();

    const targets = getAllowedTargets(keyword, career).slice(0, 6);
    const perspectives = getAllowedPerspectives(keyword, career).slice(0, 6);
    const firstPayload = buildPayload({
      routeType: "applied",
      keyword,
      subject,
      concept,
      career,
      target: targets[0]?.name || targets[0] || "",
      perspective: perspectives[0] || ""
    });

    return `
      <div class="topic-suggestion-card single-puzzle-root" data-keyword="${esc(keyword)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}" data-career="${esc(career)}">
        <div class="topic-suggestion-head">
          <h4>5. 탐구 퍼즐 맞추기</h4>
          <div class="topic-suggestion-guide">제목 자동 생성</div>
        </div>

        <p class="topic-suggestion-desc">아래에서 탐구 방식, 사례, 관점을 하나씩 고르면 탐구 보고서 제목이 바로 만들어집니다.</p>

        <div class="topic-pick-guide">👉 조합을 다 고르면 아래에 탐구 보고서 제목이 자동으로 완성됩니다.</div>

        <div class="puzzle-step">
          <div class="puzzle-step-label">1. 먼저, 어떤 방식으로 탐구할까?</div>
          <div class="puzzle-chip-wrap">
            <button type="button" class="puzzle-chip is-active" data-kind="route" data-value="applied">
              <span class="puzzle-chip-main">사례 조사</span>
              <span class="puzzle-chip-sub">실제 사례를 찾아보는 방식</span>
            </button>
            <button type="button" class="puzzle-chip" data-kind="route" data-value="compare">
              <span class="puzzle-chip-main">비교 탐구</span>
              <span class="puzzle-chip-sub">둘의 차이를 비교해 보는 방식</span>
            </button>
            <button type="button" class="puzzle-chip" data-kind="route" data-value="application">
              <span class="puzzle-chip-main">응용 탐구</span>
              <span class="puzzle-chip-sub">배운 개념이 어디에 쓰이는지 보는 방식</span>
            </button>
            <button type="button" class="puzzle-chip" data-kind="route" data-value="major">
              <span class="puzzle-chip-main">진로 연결</span>
              <span class="puzzle-chip-sub">관심 전공과 연결해 보는 방식</span>
            </button>
          </div>
        </div>

        <div class="puzzle-step">
          <div class="puzzle-step-label">2. 어떤 사례로 볼까?</div>
          <div class="puzzle-chip-wrap">
            ${chipHTML(targets, "target", 0)}
          </div>
        </div>

        <div class="puzzle-step">
          <div class="puzzle-step-label">3. 어떤 관점으로 볼까?</div>
          <div class="puzzle-chip-wrap">
            ${chipHTML(perspectives, "perspective", 0)}
          </div>
        </div>

        <div class="puzzle-result-box">
          <div class="puzzle-result-title">자동 생성 탐구 제목</div>
          <div class="puzzle-result-line">${esc(firstPayload.result_line)}</div>
        </div>

        <textarea class="puzzle-report-payload" style="display:none;">${esc(buildMiniBlock(firstPayload))}</textarea>

        <button type="button" class="puzzle-apply-btn">보고서 만들기</button>
        <div class="puzzle-copy-notice" style="display:none;"></div>
      </div>
    `;
  };
})();
