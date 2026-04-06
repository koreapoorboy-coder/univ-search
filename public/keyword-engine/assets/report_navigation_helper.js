
window.__REPORT_NAV_HELPER_VERSION = "v36-safe-addon";

(function(){
  function $(id){ return document.getElementById(id); }
  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function splitKeywords(raw){
    return String(raw || "")
      .split("+")
      .map(v => v.trim())
      .filter(Boolean);
  }
  function normalize(value){
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  }
  function containsAny(texts, patterns){
    const hay = texts.map(normalize).join(" ");
    return patterns.some(p => hay.includes(normalize(p)));
  }

  function inferTheme(subject, career, keywords){
    const texts = [subject, career, ...keywords];
    if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) return "health_policy";
    if (containsAny(texts, ["이차전지", "배터리", "전고체", "전극", "전해질"])) return "battery";
    if (containsAny(texts, ["반도체", "도핑", "트랜지스터", "웨이퍼", "EDS", "직류전압", "DC"])) return "semiconductor";
    if (containsAny(texts, ["인공지능", "데이터", "알고리즘", "AI"])) return "ai_data";
    if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) return "energy_materials";
    return "general";
  }

  function getPayload(){
    return {
      grade: $("grade")?.value?.trim() || "",
      subject: $("subject")?.value?.trim() || "",
      taskName: $("taskName")?.value?.trim() || "",
      career: $("career")?.value?.trim() || "",
      keyword: $("keyword")?.value?.trim() || ""
    };
  }

  function deriveGuide(payload){
    const keywords = splitKeywords(payload.keyword);
    const joined = keywords.join(" + ") || payload.keyword || "선택 키워드";
    const theme = inferTheme(payload.subject, payload.career, keywords);

    const data = {
      title: `${joined} 관련 보고서 작성 가이드`,
      summary: `이 보고서는 아래 순서대로 작성하면 완성됩니다. 먼저 개념을 정리하고, 사례를 연결한 뒤, 마지막에 배운 점과 진로 연결까지 쓰면 됩니다.`,
      intro: {
        task: "왜 이 주제를 선택했는지 씁니다.",
        tip: "교과서 개념을 배우다가 궁금증이 생겼다는 흐름으로 쓰면 가장 자연스럽습니다.",
        starter: "이번 탐구에서는 교과서에서 배운 개념을 확장하는 과정에서 궁금증이 생겨 해당 주제를 선택하게 되었다.",
        example: `${joined}와 관련된 개념을 배우면서 실제 사례에서는 이 내용이 어떻게 적용되는지 궁금해져 이 주제를 선택하게 되었다.`,
        pattern: "교과 개념 → 궁금증 → 주제 선택",
        record_hint: "탐구 주제 선택 이유가 드러나는 문장으로 작성하면 학생부 반영에 유리합니다."
      },
      body1: {
        task: "핵심 개념과 원리를 설명합니다.",
        tip: "정의 → 특징 → 왜 중요한지 순서로 쓰면 안정적입니다.",
        starter: "먼저 해당 개념은 ○○한 특징을 가지며, 이는 ○○한 상황에서 중요한 역할을 한다.",
        example: "먼저 이 개념은 핵심 원리를 설명하는 내용으로, 실제 사례를 이해하는 데 중요한 기준이 된다.",
        pattern: "정의 → 특징 → 의미",
        record_hint: "개념을 단순 나열하기보다 이해했다는 표현이 드러나게 작성하세요."
      },
      body2: {
        task: "실제 사례와 연결해 설명합니다.",
        tip: "실생활 사례나 산업 사례를 1개만 연결해도 충분합니다.",
        starter: "이러한 개념은 실제로 ○○한 사례에서 활용되며, 이를 통해 ○○한 결과를 만들어낸다.",
        example: `${joined}는 실제 사례와 연결할 수 있으며, 이를 통해 교과 개념이 현실에서 어떻게 활용되는지 설명할 수 있다.`,
        pattern: "개념 → 사례 → 결과",
        record_hint: "사례와 연결해 탐구 과정을 수행했다는 흐름이 보이도록 작성하세요."
      },
      conclusion: {
        task: "배운 점과 진로 연결을 씁니다.",
        tip: "‘이해하게 되었다’와 ‘진로와 연결된다’를 함께 넣으면 안정적입니다.",
        starter: "이번 탐구를 통해 해당 개념이 실제 상황에 어떻게 적용되는지 이해할 수 있었으며, 이는 향후 진로와도 연결된다고 생각한다.",
        example: `이번 탐구를 통해 ${joined}와 관련된 개념이 실제 사례에 적용되는 방식을 이해할 수 있었고, 이는 ${payload.career || "희망 진로"}와도 자연스럽게 연결된다고 느꼈다.`,
        pattern: "이해 → 적용 → 진로 연결",
        record_hint: "탐구 결과를 해석하고 진로와 연결된다는 표현이 포함되면 좋습니다."
      }
    };

    if (theme === "battery") {
      data.body1.example = "이차전지는 산화환원 반응을 통해 에너지를 저장하고 방출하는 장치이며, 구조와 소재 차이에 따라 성능이 달라진다.";
      data.body2.example = "예를 들어 전고체배터리는 전해질 구조의 차이 때문에 안전성과 효율 측면에서 기존 배터리와 구별된다.";
    } else if (theme === "semiconductor") {
      data.body1.example = "반도체는 전기적 성질을 조절할 수 있는 물질이며, 도핑이나 공정 조건에 따라 성능이 달라질 수 있다.";
      data.body2.example = "예를 들어 반도체 공정에서는 공정 조건과 재료 특성이 전기적 특성과 최종 성능에 직접적인 영향을 준다.";
    } else if (theme === "health_policy") {
      data.body1.example = "면역 반응은 외부 병원체로부터 몸을 보호하는 중요한 체계이며, 감염 예방과 건강관리 이해의 핵심 개념이 된다.";
      data.body2.example = "예를 들어 감염 예방은 개인 위생 관리뿐 아니라 공공 보건정책과도 연결되어 더 큰 효과를 낼 수 있다.";
    } else if (theme === "ai_data") {
      data.body1.example = "인공지능은 데이터를 바탕으로 패턴을 분석하고 결과를 예측하는 기술로, 다양한 분야에 적용된다.";
      data.body2.example = "예를 들어 의료, 산업, 교육 분야에서는 데이터를 활용한 AI 기술이 실제 문제 해결에 쓰이고 있다.";
    } else if (theme === "energy_materials") {
      data.body1.example = "에너지 전환 과정은 열역학 원리와 연결되며, 효율과 안전성을 이해하는 데 중요한 개념이 된다.";
      data.body2.example = "예를 들어 원자력발전에서는 발전 원리뿐 아니라 재료의 특성과 안정성까지 함께 고려해야 한다.";
    }

    return data;
  }

  function sectionHTML(title, data){
    return `
      <div class="report-nav-section">
        <div class="report-nav-title">${escapeHtml(title)}</div>
        <div class="report-nav-row"><b>할 일</b> : ${escapeHtml(data.task)}</div>
        <div class="report-nav-row report-nav-tip"><b>TIP</b> : ${escapeHtml(data.tip)}</div>
        <div class="report-nav-row"><b>시작 문장</b> : ${escapeHtml(data.starter)}</div>
        <div class="report-nav-row"><b>예시문</b> : ${escapeHtml(data.example)}</div>
        <div class="report-nav-row"><b>문장 구조</b> : ${escapeHtml(data.pattern)}</div>
        <div class="report-nav-row report-nav-hint"><b>학생부 반영 포인트</b> : ${escapeHtml(data.record_hint)}</div>
      </div>
    `;
  }

  function renderGuide(){
    const payload = getPayload();
    const guide = deriveGuide(payload);

    return `
      <div class="report-nav-card">
        <div class="report-nav-kicker">이대로 따라 쓰면 보고서 완성</div>
        <h3 class="report-nav-main-title">${escapeHtml(guide.title)}</h3>
        <p class="report-nav-summary">${escapeHtml(guide.summary)}</p>
        ${sectionHTML("도입", guide.intro)}
        ${sectionHTML("본문 1", guide.body1)}
        ${sectionHTML("본문 2", guide.body2)}
        ${sectionHTML("결론", guide.conclusion)}
        <div class="report-nav-check">
          ✔ 도입 작성 완료<br>
          ✔ 개념 설명 완료<br>
          ✔ 사례 연결 완료<br>
          ✔ 결론 작성 완료<br><br>
          → 이 4가지를 작성했다면 보고서는 완성입니다.
        </div>
      </div>
    `;
  }

  function ensureGuideMount(){
    const resultSection = $("resultSection");
    if (!resultSection) return null;

    let mount = $("reportNavigationGuide");
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = "reportNavigationGuide";
    mount.className = "report-navigation-guide-wrap";

    const contentOutputSection = $("contentOutputSection");
    if (contentOutputSection && contentOutputSection.parentNode) {
      contentOutputSection.parentNode.insertBefore(mount, contentOutputSection);
    } else {
      resultSection.prepend(mount);
    }
    return mount;
  }

  function applyGuide(){
    const resultSection = $("resultSection");
    if (!resultSection) return;

    const mount = ensureGuideMount();
    if (!mount) return;

    mount.innerHTML = renderGuide();
  }

  function waitAndApply(){
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const resultSection = $("resultSection");
      if (resultSection && resultSection.style.display !== "none") {
        applyGuide();
      }
      if (tries >= 20) clearInterval(timer);
    }, 250);
  }

  document.addEventListener("DOMContentLoaded", function(){
    const generateBtn = $("generateBtn");
    if (!generateBtn) return;
    generateBtn.addEventListener("click", function(){
      setTimeout(waitAndApply, 150);
    }, true);
  });
})();
