
window.__STUDENT_FOCUS_ADDON_VERSION = "v37-student-focused";

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

  function getPayload(){
    return {
      grade: $("grade")?.value?.trim() || "",
      subject: $("subject")?.value?.trim() || "",
      taskName: $("taskName")?.value?.trim() || "",
      career: $("career")?.value?.trim() || "",
      keyword: $("keyword")?.value?.trim() || ""
    };
  }

  function inferTheme(subject, career, keywords){
    const texts = [subject, career, ...keywords];
    if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) return "health_policy";
    if (containsAny(texts, ["이차전지", "배터리", "전고체", "전극", "전해질"])) return "battery";
    if (containsAny(texts, ["반도체", "도핑", "트랜지스터", "웨이퍼", "EDS", "직류전압", "DC"])) return "semiconductor";
    if (containsAny(texts, ["인공지능", "데이터", "알고리즘", "AI"])) return "ai_data";
    if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) return "energy_materials";
    if (containsAny(texts, ["기계", "설계", "생산 공정", "베르누이", "복합재료"])) return "mechanical_design";
    return "general";
  }

  function buildNaturalTopic(payload){
    const keywords = splitKeywords(payload.keyword);
    const theme = inferTheme(payload.subject, payload.career, keywords);

    if (theme === "health_policy") return "감염 예방과 면역 반응이 보건의료 정책과 연결되는 방식 탐구";
    if (theme === "battery") return "배터리 구조 차이가 성능과 안전성에 미치는 영향 탐구";
    if (theme === "semiconductor") return "반도체 공정과 전기적 특성이 결과 성능에 미치는 영향 탐구";
    if (theme === "ai_data") return "인공지능이 전기·기계 시스템 설계와 제어에 활용되는 방식 탐구";
    if (theme === "energy_materials") return "에너지 전환 과정에서 열역학과 재료가 성능에 미치는 영향 탐구";
    if (theme === "mechanical_design") return "생산 공정과 유체 원리, 재료 특성이 설계 결과에 미치는 영향 탐구";

    const joined = keywords.join(", ");
    return joined ? `${joined}가 실제 기술과 사례에 어떻게 연결되는지 탐구`
                  : "선택한 개념이 실제 사례와 어떻게 연결되는지 탐구";
  }

  function buildThreeSteps(payload){
    const keywords = splitKeywords(payload.keyword);
    const theme = inferTheme(payload.subject, payload.career, keywords);

    if (theme === "health_policy") {
      return [
        "면역 반응과 감염 예방 개념을 2줄 정도로 정리합니다.",
        "개인 건강관리 사례 1개와 공공 보건정책 사례 1개를 찾습니다.",
        "두 사례를 비교하고 보건의료 진로와 연결해 마무리합니다."
      ];
    }
    if (theme === "battery") {
      return [
        "비교할 배터리 2개와 핵심 개념 2개를 먼저 정리합니다.",
        "안전성·효율 기준으로 차이를 설명할 사례 1개를 찾습니다.",
        "구조 차이가 실제 성능에 어떤 영향을 주는지 결론으로 씁니다."
      ];
    }
    if (theme === "semiconductor") {
      return [
        "반도체 원리와 공정 개념을 짧게 정리합니다.",
        "공정이 전기적 특성이나 성능에 영향을 주는 사례 1개를 찾습니다.",
        "왜 이 탐구가 전자·반도체 진로와 연결되는지 결론에 씁니다."
      ];
    }
    if (theme === "ai_data") {
      return [
        "인공지능이 어떤 원리로 작동하는지 핵심 개념 2개를 정리합니다.",
        "전기·기계 분야에서 AI가 활용되는 사례 1개를 찾습니다.",
        "기술 적용 의미와 한계를 비교하며 마무리합니다."
      ];
    }
    if (theme === "energy_materials") {
      return [
        "열역학과 에너지 전환 개념을 먼저 정리합니다.",
        "발전 사례 또는 재료 적용 사례 1개를 찾습니다.",
        "효율과 안전성, 진로 연결 의미를 결론으로 씁니다."
      ];
    }
    if (theme === "mechanical_design") {
      return [
        "생산 공정·유체 원리·재료 특성 중 핵심 개념 2개를 정리합니다.",
        "설계 결과에 영향을 주는 실제 사례 1개를 찾습니다.",
        "개념과 사례를 연결해 기계공학 진로와 이어서 마무리합니다."
      ];
    }
    return [
      "핵심 개념 2개를 먼저 정리합니다.",
      "실제 사례 1개를 찾습니다.",
      "개념과 사례를 연결해 결론을 씁니다."
    ];
  }

  function buildGuide(payload){
    const keywords = splitKeywords(payload.keyword);
    const joined = keywords.join(" + ") || payload.keyword || "선택 키워드";
    const theme = inferTheme(payload.subject, payload.career, keywords);
    const naturalTitle = buildNaturalTopic(payload);
    const steps = buildThreeSteps(payload);

    const guide = {
      topic: naturalTitle,
      steps: steps,
      intro: {
        task: "왜 이 주제를 선택했는지 한두 문장으로 씁니다.",
        tip: "교과서 개념을 배우다가 궁금증이 생겼다는 흐름으로 쓰면 가장 자연스럽습니다.",
        starter: "이번 탐구에서는 교과서에서 배운 개념을 확장하는 과정에서 궁금증이 생겨 해당 주제를 선택하게 되었다.",
        example: `${joined}와 관련된 개념을 배우면서 실제 사례에서는 이 내용이 어떻게 적용되는지 궁금해져 이 주제를 선택하게 되었다.`
      },
      body1: {
        task: "핵심 개념과 원리를 설명합니다.",
        tip: "정의 → 특징 → 왜 중요한지 순서로 쓰면 안정적입니다.",
        starter: "먼저 해당 개념은 ○○한 특징을 가지며, 이는 ○○한 상황에서 중요한 역할을 한다.",
        example: "먼저 이 개념은 핵심 원리를 설명하는 내용으로, 실제 사례를 이해하는 데 중요한 기준이 된다."
      },
      body2: {
        task: "실제 사례와 연결해 설명합니다.",
        tip: "실생활 사례나 산업 사례를 1개만 연결해도 충분합니다.",
        starter: "이러한 개념은 실제로 ○○한 사례에서 활용되며, 이를 통해 ○○한 결과를 만들어낸다.",
        example: `${joined}는 실제 사례와 연결할 수 있으며, 이를 통해 교과 개념이 현실에서 어떻게 활용되는지 설명할 수 있다.`
      },
      conclusion: {
        task: "배운 점과 진로 연결을 씁니다.",
        tip: "‘이해하게 되었다’와 ‘진로와 연결된다’를 함께 넣으면 안정적입니다.",
        starter: "이번 탐구를 통해 해당 개념이 실제 상황에 어떻게 적용되는지 이해할 수 있었으며, 이는 향후 진로와도 연결된다고 생각한다.",
        example: `이번 탐구를 통해 ${joined}와 관련된 개념이 실제 사례에 적용되는 방식을 이해할 수 있었고, 이는 ${payload.career || "희망 진로"}와도 자연스럽게 연결된다고 느꼈다.`
      }
    };

    if (theme === "battery") {
      guide.body1.example = "이차전지는 산화환원 반응을 통해 에너지를 저장하고 방출하는 장치이며, 구조와 소재 차이에 따라 성능이 달라진다.";
      guide.body2.example = "예를 들어 전고체배터리는 전해질 구조의 차이 때문에 안전성과 효율 측면에서 기존 배터리와 구별된다.";
    } else if (theme === "semiconductor") {
      guide.body1.example = "반도체는 전기적 성질을 조절할 수 있는 물질이며, 도핑이나 공정 조건에 따라 성능이 달라질 수 있다.";
      guide.body2.example = "예를 들어 반도체 공정에서는 공정 조건과 재료 특성이 전기적 특성과 최종 성능에 직접적인 영향을 준다.";
    } else if (theme === "health_policy") {
      guide.body1.example = "면역 반응은 외부 병원체로부터 몸을 보호하는 중요한 체계이며, 감염 예방과 건강관리 이해의 핵심 개념이 된다.";
      guide.body2.example = "예를 들어 감염 예방은 개인 위생 관리뿐 아니라 공공 보건정책과도 연결되어 더 큰 효과를 낼 수 있다.";
    } else if (theme === "ai_data") {
      guide.body1.example = "인공지능은 데이터를 바탕으로 패턴을 분석하고 결과를 예측하는 기술로, 다양한 분야에 적용된다.";
      guide.body2.example = "예를 들어 전기·기계 시스템에서는 데이터를 활용한 AI 기술이 자동 제어와 최적화에 활용될 수 있다.";
    } else if (theme === "energy_materials") {
      guide.body1.example = "에너지 전환 과정은 열역학 원리와 연결되며, 효율과 안전성을 이해하는 데 중요한 개념이 된다.";
      guide.body2.example = "예를 들어 원자력발전에서는 발전 원리뿐 아니라 재료의 특성과 안정성까지 함께 고려해야 한다.";
    } else if (theme === "mechanical_design") {
      guide.body1.example = "생산 공정과 유체 원리, 재료 특성은 설계 결과와 성능을 설명하는 데 중요한 기준이 된다.";
      guide.body2.example = "예를 들어 설계 과정에서는 재료의 특성과 공정 조건, 유체 흐름이 실제 결과 품질에 영향을 줄 수 있다.";
    }

    return guide;
  }

  function sectionHTML(title, data){
    return `
      <div class="student-focus-section">
        <div class="student-focus-section-title">${escapeHtml(title)}</div>
        <div class="student-focus-line"><b>할 일</b> : ${escapeHtml(data.task)}</div>
        <div class="student-focus-line student-focus-tip"><b>TIP</b> : ${escapeHtml(data.tip)}</div>
        <div class="student-focus-line"><b>시작 문장</b> : ${escapeHtml(data.starter)}</div>
        <div class="student-focus-line"><b>예시문</b> : ${escapeHtml(data.example)}</div>
      </div>
    `;
  }

  function renderStudentFocusGuide(){
    const payload = getPayload();
    const guide = buildGuide(payload);

    return `
      <div class="student-focus-card">
        <div class="student-focus-kicker">학생용 핵심 가이드</div>

        <div class="student-focus-topic-card">
          <div class="student-focus-topic-label">추천 주제</div>
          <div class="student-focus-topic-text">${escapeHtml(guide.topic)}</div>
        </div>

        <div class="student-focus-steps-card">
          <div class="student-focus-steps-label">지금 할 일 3단계</div>
          <ol class="student-focus-steps-list">
            ${guide.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
        </div>

        <div class="student-focus-summary">
          이 보고서는 아래 순서대로 쓰면 됩니다. 도입 → 본문 1 → 본문 2 → 결론 순서로 따라오면 완성됩니다.
        </div>

        ${sectionHTML("도입", guide.intro)}
        ${sectionHTML("본문 1", guide.body1)}
        ${sectionHTML("본문 2", guide.body2)}
        ${sectionHTML("결론", guide.conclusion)}

        <div class="student-focus-check">
          ✔ 도입 작성 완료<br>
          ✔ 개념 설명 완료<br>
          ✔ 사례 연결 완료<br>
          ✔ 결론 작성 완료<br><br>
          → 이 4가지를 작성했다면 보고서는 완성입니다.
        </div>
      </div>
    `;
  }

  function ensureMount(){
    const resultSection = $("resultSection");
    if (!resultSection) return null;

    let mount = $("studentFocusGuide");
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = "studentFocusGuide";
    mount.className = "student-focus-guide-wrap";

    const reportNavigationGuide = $("reportNavigationGuide");
    const contentOutputSection = $("contentOutputSection");

    if (reportNavigationGuide && reportNavigationGuide.parentNode) {
      reportNavigationGuide.parentNode.insertBefore(mount, reportNavigationGuide);
    } else if (contentOutputSection && contentOutputSection.parentNode) {
      contentOutputSection.parentNode.insertBefore(mount, contentOutputSection);
    } else {
      resultSection.prepend(mount);
    }
    return mount;
  }

  function hideHeavySections(){
    const ids = ["reportNavigationGuide"];
    ids.forEach(id => {
      const el = $(id);
      if (el) el.style.display = "none";
    });

    document.querySelectorAll(".admission-spotlight-card, .admission-grid, .record-card").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll("h3, h2, h4").forEach(h => {
      const txt = (h.textContent || "").trim();
      if (txt === "주제 후보" || txt === "합격 포인트" || txt === "차별화 포인트") {
        const block = h.closest(".result-card, .content-output-card, section, div");
        if (block && block.id !== "studentFocusGuide") {
          block.style.display = "none";
        }
      }
    });
  }

  function applyGuide(){
    const resultSection = $("resultSection");
    if (!resultSection || resultSection.style.display === "none") return;

    const mount = ensureMount();
    if (!mount) return;

    mount.innerHTML = renderStudentFocusGuide();
    hideHeavySections();
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
      setTimeout(waitAndApply, 180);
    }, true);
  });
})();
