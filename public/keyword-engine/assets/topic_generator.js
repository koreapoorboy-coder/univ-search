window.__TOPIC_GENERATOR_VERSION = "v4.1-selector-to-report-clean";

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

  function getAllowedPerspectives(keyword, career, routeType){
    const kp = getKeywordProfile(keyword);
    const cp = getCareerProfile(career);
    const candidate = intersectOrFallback(
      kp.perspectives || [],
      cp.perspectives || [],
      uniq([...(kp.perspectives || []), ...(cp.perspectives || [])])
    );
    const allowedByRoute = (seedData?.perspectives || [])
      .filter(p => (p.routes || []).includes(routeType))
      .map(p => p.name);
    return candidate.filter(v => allowedByRoute.includes(v)).slice(0, 6);
  }

  function getPerspectiveHint(name){
    return (seedData?.perspectives || []).find(p => p.name === name)?.hint || "";
  }

  function routeLabel(routeType){
    return seedData?.routeTypes?.[routeType]?.label || "탐구형";
  }

  function buildChips(items, kind, activeIndex){
    return items.map((item, idx) => {
      const label = item.name || item;
      const hint = item.hint || getPerspectiveHint(label) || "";
      return `
        <button type="button" class="topic-choice-chip ${idx === activeIndex ? "is-active" : ""}" data-kind="${esc(kind)}" data-value="${esc(label)}">
          <span class="topic-choice-main">${esc(label)}</span>
          ${hint ? `<span class="topic-choice-sub">${esc(hint)}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  function buildTitle(keyword, target, perspective, career){
    if (!keyword || !target || !perspective) return "";
    return `${keyword}을(를) ${target} 사례로 살펴보며 ${perspective} 중심으로 정리하기`;
  }

  function buildQuestion(keyword, target, perspective, career){
    const routeText = career ? `${career} 방향과 연결해` : "교과 개념과 연결해";
    return `${keyword}이(가) ${target} 사례에서 어떤 역할을 하며, ${perspective} 관점에서 무엇을 설명할 수 있을까? ${routeText}`;
  }

  function buildStructuredSummary({routeType, keyword, career, target, perspective}){
    const route = routeLabel(routeType);
    const targetHint = (seedData?.targets || []).find(t => t.name === target)?.hint || "";
    const perspectiveHint = getPerspectiveHint(perspective);
    const title = buildTitle(keyword, target, perspective, career);
    const question = buildQuestion(keyword, target, perspective, career);

    return {
      route,
      target,
      targetHint,
      perspective,
      perspectiveHint,
      title,
      question,
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

  function updateCardSummary(card, root){
    const routeType = card.getAttribute("data-route-type") || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const target = card.querySelector('.topic-choice-chip[data-kind="target"].is-active .topic-choice-main')?.textContent || "";
    const perspective = card.querySelector('.topic-choice-chip[data-kind="perspective"].is-active .topic-choice-main')?.textContent || "";
    const summary = buildStructuredSummary({ routeType, keyword, career, target, perspective });

    const routeEl = card.querySelector(".topic-summary-route");
    const targetEl = card.querySelector(".topic-summary-target");
    const targetHintEl = card.querySelector(".topic-summary-target-hint");
    const perspectiveEl = card.querySelector(".topic-summary-perspective");
    const perspectiveHintEl = card.querySelector(".topic-summary-perspective-hint");
    const titleEl = card.querySelector(".topic-summary-title");
    const questionEl = card.querySelector(".topic-summary-question");
    const payloadEl = card.querySelector(".topic-report-payload");

    if(routeEl) routeEl.textContent = summary.route;
    if(targetEl) targetEl.textContent = summary.target;
    if(targetHintEl) targetHintEl.textContent = summary.targetHint || "선택한 사례를 중심으로 조사";
    if(perspectiveEl) perspectiveEl.textContent = summary.perspective;
    if(perspectiveHintEl) perspectiveHintEl.textContent = summary.perspectiveHint || "선택한 시각으로 정리";
    if(titleEl) titleEl.textContent = summary.title;
    if(questionEl) questionEl.textContent = summary.question;
    if(payloadEl) payloadEl.value = summary.reportText;
  }

  function copyReportPayload(card){
    const payloadEl = card.querySelector(".topic-report-payload");
    const text = payloadEl?.value || "";
    if(!text) return;

    const taskDesc = $("taskDescription");
    if(taskDesc){
      const cleaned = (taskDesc.value || "").replace(/\n*\[보고서 생성용 입력값\][\s\S]*$/m, "").trim();
      taskDesc.value = cleaned ? `${cleaned}\n\n${text}` : text;
    }

    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(text).catch(() => {});
    }

    const notice = card.querySelector(".topic-copy-notice");
    if(notice){
      notice.textContent = "선택 내용이 수행평가 설명 칸에 깔끔하게 반영됐어요.";
      notice.style.display = "block";
      setTimeout(() => { notice.style.display = "none"; }, 1800);
    }
  }

  function cardHTML(routeType, keyword, career, targets, perspectives){
    const firstTarget = targets[0]?.name || targets[0] || "";
    const firstPerspective = perspectives[0] || "";
    const summary = buildStructuredSummary({
      routeType, keyword, career, target: firstTarget, perspective: firstPerspective
    });

    return `
      <div class="topic-combo-card" data-route-type="${esc(routeType)}">
        <div class="topic-combo-top">
          <div>
            <div class="topic-combo-label">${esc(routeLabel(routeType))}</div>
            <div class="topic-combo-desc">여기서는 보고서 문장을 억지로 만들지 않고, 보고서에 들어갈 핵심 재료를 먼저 정리해요.</div>
          </div>
          <div class="topic-combo-mini">MINI 입력값 준비</div>
        </div>

        <div class="topic-combo-section">
          <div class="topic-combo-section-title">1) 어떤 사례를 볼까?</div>
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

        <div class="topic-structured-box">
          <div class="topic-structured-head">
            <div class="topic-preview-label">보고서로 넘길 내용 요약</div>
            <div class="topic-structured-mini">선택값 구조화</div>
          </div>

          <div class="topic-structured-grid">
            <div class="topic-structured-item">
              <div class="topic-structured-label">탐구 방식</div>
              <div class="topic-structured-value topic-summary-route">${esc(summary.route)}</div>
            </div>

            <div class="topic-structured-item">
              <div class="topic-structured-label">사례</div>
              <div class="topic-structured-value topic-summary-target">${esc(summary.target)}</div>
              <div class="topic-structured-sub topic-summary-target-hint">${esc(summary.targetHint || "선택한 사례를 중심으로 조사")}</div>
            </div>

            <div class="topic-structured-item">
              <div class="topic-structured-label">관점</div>
              <div class="topic-structured-value topic-summary-perspective">${esc(summary.perspective)}</div>
              <div class="topic-structured-sub topic-summary-perspective-hint">${esc(summary.perspectiveHint || "선택한 시각으로 정리")}</div>
            </div>

            <div class="topic-structured-item">
              <div class="topic-structured-label">전공/확장 방향</div>
              <div class="topic-structured-value">${esc(career)}</div>
            </div>
          </div>

          <div class="topic-focus-box">
            <div class="topic-focus-item">
              <div class="topic-structured-label">추천 제목</div>
              <div class="topic-focus-value topic-summary-title">${esc(summary.title)}</div>
            </div>
            <div class="topic-focus-item">
              <div class="topic-structured-label">핵심 질문</div>
              <div class="topic-focus-value topic-summary-question">${esc(summary.question)}</div>
            </div>
          </div>

          <textarea class="topic-report-payload" style="display:none;">${esc(summary.reportText)}</textarea>

          <div class="topic-structured-help">이 값은 MINI가 보고서 초안을 만들 때 쓰기 좋은 입력 형식이에요. 선택값을 먼저 정리한 뒤, 자연스러운 문장화는 생성 단계에서 하게 됩니다.</div>

          <div class="topic-structured-actions">
            <button type="button" class="topic-apply-btn">선택한 내용으로 보고서 방향 정리</button>
            <div class="topic-copy-notice" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents(){
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", function(event){
      const chip = event.target.closest(".topic-choice-chip");
      if (chip){
        const card = chip.closest(".topic-combo-card");
        const root = chip.closest(".topic-suggestion-card");
        if(!card || !root) return;
        const kind = chip.getAttribute("data-kind");
        card.querySelectorAll(`.topic-choice-chip[data-kind="${kind}"]`).forEach(btn => btn.classList.remove("is-active"));
        chip.classList.add("is-active");
        updateCardSummary(card, root);
        return;
      }

      const applyBtn = event.target.closest(".topic-apply-btn");
      if(applyBtn){
        const card = applyBtn.closest(".topic-combo-card");
        if(card) copyReportPayload(card);
      }
    });
  }

  window.renderTopicSuggestionHTML = function(ctx){
    const keyword = ctx?.keyword || "";
    const career = ctx?.career || "";
    if(!keyword || !career) return "";

    bindEvents();
    if (!seedData) seedData = { routeTypes: {} };
    loadSeed();

    const targets = getAllowedTargets(keyword, career);
    const appliedPerspectives = getAllowedPerspectives(keyword, career, "applied");
    const comparePerspectives = getAllowedPerspectives(keyword, career, "compare");
    const majorPerspectives = getAllowedPerspectives(keyword, career, "major");

    const cardTargetsA = targets.slice(0, 4);
    const cardTargetsB = targets.slice(1, 5).concat(targets.slice(0, 1)).slice(0, 4);
    const cardTargetsC = targets.slice(2, 6).concat(targets.slice(0, 2)).slice(0, 4);

    const cards = [
      cardHTML("applied", keyword, career, cardTargetsA, appliedPerspectives.slice(0, 4)),
      cardHTML("compare", keyword, career, cardTargetsB, comparePerspectives.slice(0, 4)),
      cardHTML("major", keyword, career, cardTargetsC, majorPerspectives.slice(0, 4))
    ].join("");

    return `
      <div class="topic-suggestion-card" data-keyword="${esc(keyword)}" data-career="${esc(career)}">
        <div class="topic-suggestion-head">
          <h4>6. 이 개념으로 할 수 있는 탐구 방향 정리</h4>
          <div class="topic-suggestion-guide">MINI로 넘길 입력값 준비</div>
        </div>

        <p class="topic-suggestion-desc">여기서는 주제를 완성 문장으로 억지 생성하지 않고, <b>탐구 방식</b> / <b>사례</b> / <b>관점</b> / <b>전공 방향</b>을 정리해서 MINI가 자연스럽게 보고서 초안을 쓰기 좋은 상태로 만들어요.</p>

        <div class="topic-pick-guide">👉 각 카드에서 사례와 관점을 고른 뒤, <b>선택한 내용으로 보고서 방향 정리</b>를 누르면 수행평가 설명 칸에 깔끔한 입력값이 반영됩니다.</div>

        <div class="topic-combo-grid">${cards}</div>

        <div class="topic-tip-box">
          <div class="topic-tip-label">이번 단계의 역할</div>
          <p>6번은 완성 주제를 만드는 곳이 아니라, 보고서에 들어갈 핵심 선택값을 정리하는 단계예요. 문장 완성은 생성 단계에서 MINI가 하도록 역할을 나눴어요.</p>
        </div>
      </div>
    `;
  };
})();
