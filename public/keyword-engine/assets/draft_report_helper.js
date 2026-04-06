
window.__DRAFT_REPORT_ADDON_VERSION = "v38-draft-report";

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
    if (containsAny(texts, ["건축", "콘크리트", "미세먼지", "친환경", "단열"])) return "architecture_environment";
    return "general";
  }

  function getThemeData(payload){
    const keywords = splitKeywords(payload.keyword);
    const theme = inferTheme(payload.subject, payload.career, keywords);
    const joined = keywords.join(", ") || payload.keyword || "선택 키워드";

    const common = {
      title: `${joined}와 관련된 개념이 실제 사례에 어떻게 연결되는지 탐구`,
      introExample: `${joined}와 관련된 개념을 배우면서 실제 사례에서는 이 내용이 어떻게 적용되는지 궁금해져 이 주제를 선택하게 되었다.`,
      body1Example: "먼저 이 개념은 핵심 원리를 설명하는 내용으로, 실제 사례를 이해하는 데 중요한 기준이 된다.",
      body2Example: `${joined}는 실제 사례와 연결할 수 있으며, 이를 통해 교과 개념이 현실에서 어떻게 활용되는지 설명할 수 있다.`,
      conclusionExample: `이번 탐구를 통해 ${joined}와 관련된 개념이 실제 사례에 적용되는 방식을 이해할 수 있었고, 이는 ${payload.career || "희망 진로"}와도 자연스럽게 연결된다고 느꼈다.`,
      options1: ["실생활 사례 1개", "산업 사례 1개", "기술 적용 사례 1개"],
      options2: ["효율이 높아진다", "정확도가 향상된다", "안정성이 높아진다"],
      options3: [payload.career || "희망 진로", "관련 공학 분야", "관련 기술 분야"]
    };

    if (theme === "battery") {
      return {
        title: "배터리 구조 차이가 성능과 안전성에 미치는 영향 탐구",
        introExample: "배터리 구조와 소재를 배우면서 실제 제품에서는 이러한 차이가 성능과 안전성에 어떻게 이어지는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "이차전지는 산화환원 반응을 통해 에너지를 저장하고 방출하는 장치이며, 전극과 전해질 구조에 따라 성능이 달라진다.",
        body2Example: "예를 들어 전고체배터리는 전해질 구조의 차이 때문에 안전성과 효율 측면에서 기존 배터리와 구별될 수 있다.",
        conclusionExample: "이번 탐구를 통해 배터리 구조 차이가 실제 성능과 안전성에 큰 영향을 준다는 점을 이해할 수 있었고, 이는 신소재·에너지 분야 진로와도 연결된다고 느꼈다.",
        options1: ["리튬이온 배터리", "전고체배터리", "전기차 배터리 관리 시스템"],
        options2: ["안전성이 높아진다", "에너지 효율이 좋아진다", "수명이 길어진다"],
        options3: ["신소재공학", "에너지공학", "전기전자공학"]
      };
    }

    if (theme === "semiconductor") {
      return {
        title: "반도체 공정과 전기적 특성이 결과 성능에 미치는 영향 탐구",
        introExample: "반도체 원리와 공정을 배우면서 실제 공정 조건이 전기적 특성과 성능에 어떻게 영향을 주는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "반도체는 전기적 성질을 조절할 수 있는 물질이며, 도핑과 공정 조건에 따라 성능이 달라질 수 있다.",
        body2Example: "예를 들어 반도체 공정에서는 재료 특성과 공정 조건이 전기적 특성과 최종 성능에 직접적인 영향을 준다.",
        conclusionExample: "이번 탐구를 통해 반도체 원리와 공정이 실제 성능과 밀접하게 연결된다는 점을 이해할 수 있었고, 이는 전자·반도체 분야 진로와도 자연스럽게 이어진다고 느꼈다.",
        options1: ["도핑 공정", "웨이퍼 공정", "EDS 공정"],
        options2: ["전기적 특성이 달라진다", "최종 성능이 향상된다", "공정 품질이 안정된다"],
        options3: ["반도체공학", "전자공학", "신소재공학"]
      };
    }

    if (theme === "ai_data") {
      return {
        title: "인공지능이 전기·기계 시스템 설계와 제어에 활용되는 방식 탐구",
        introExample: "인공지능과 데이터 처리 개념을 배우면서 실제 전기·기계 시스템에서는 이러한 기술이 어떻게 적용되는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "인공지능은 데이터를 바탕으로 패턴을 분석하고 결과를 예측하는 기술로, 다양한 분야에 적용된다.",
        body2Example: "예를 들어 전기·기계 시스템에서는 데이터를 활용한 AI 기술이 자동 제어와 최적화에 활용될 수 있다.",
        conclusionExample: "이번 탐구를 통해 인공지능이 실제 기술 시스템 안에서 중요한 역할을 한다는 점을 이해할 수 있었고, 이는 AI·SW 및 공학 계열 진로와도 연결된다고 느꼈다.",
        options1: ["스마트 공장 자동화 시스템", "자율주행 제어 시스템", "전기차 배터리 관리 시스템"],
        options2: ["작업 정확도가 높아진다", "에너지 효율이 좋아진다", "시스템 제어가 더 안정된다"],
        options3: ["인공지능학과", "전기전자공학", "기계공학"]
      };
    }

    if (theme === "health_policy") {
      return {
        title: "감염 예방과 면역 반응이 보건의료 정책과 연결되는 방식 탐구",
        introExample: "감염 예방과 면역 반응 개념을 배우면서 실제 보건의료 정책에서는 이러한 내용이 어떻게 연결되는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "면역 반응은 외부 병원체로부터 몸을 보호하는 중요한 체계이며, 감염 예방과 건강관리 이해의 핵심 개념이 된다.",
        body2Example: "예를 들어 감염 예방은 개인 위생 관리뿐 아니라 공공 보건정책과도 연결되어 더 큰 효과를 낼 수 있다.",
        conclusionExample: "이번 탐구를 통해 감염 예방과 면역 반응이 개인 건강관리뿐 아니라 사회적 보건 체계와도 연결된다는 점을 이해할 수 있었고, 이는 보건의료 분야 진로와도 이어진다고 느꼈다.",
        options1: ["손 위생 관리", "백신 정책", "학교 방역 지침"],
        options2: ["예방 효과가 높아진다", "감염 확산을 줄일 수 있다", "건강관리 체계가 더 안정된다"],
        options3: ["간호학과", "보건행정학과", "의료 관련 분야"]
      };
    }

    if (theme === "energy_materials") {
      return {
        title: "에너지 전환 과정에서 열역학과 재료가 성능에 미치는 영향 탐구",
        introExample: "에너지 전환과 열역학 개념을 배우면서 실제 발전 시스템에서는 재료와 원리가 어떻게 연결되는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "에너지 전환 과정은 열역학 원리와 연결되며, 효율과 안전성을 이해하는 데 중요한 개념이 된다.",
        body2Example: "예를 들어 발전 시스템에서는 재료의 특성과 열 손실 관리가 실제 성능과 효율에 영향을 줄 수 있다.",
        conclusionExample: "이번 탐구를 통해 에너지 전환 원리와 재료 특성이 실제 성능에 영향을 준다는 점을 이해할 수 있었고, 이는 에너지공학 분야 진로와도 연결된다고 느꼈다.",
        options1: ["원자력발전 사례", "열효율 개선 사례", "에너지 저장 시스템"],
        options2: ["효율이 높아진다", "안전성이 향상된다", "열 손실이 줄어든다"],
        options3: ["에너지공학", "기계공학", "신소재공학"]
      };
    }

    if (theme === "mechanical_design") {
      return {
        title: "생산 공정과 유체 원리, 재료 특성이 설계 결과에 미치는 영향 탐구",
        introExample: "생산 공정과 유체 원리, 재료 특성 개념을 배우면서 실제 설계 결과에는 이 요소들이 어떻게 영향을 주는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "생산 공정과 유체 원리, 재료 특성은 설계 결과와 성능을 설명하는 데 중요한 기준이 된다.",
        body2Example: "예를 들어 설계 과정에서는 재료의 특성과 공정 조건, 유체 흐름이 실제 결과 품질에 영향을 줄 수 있다.",
        conclusionExample: "이번 탐구를 통해 생산 공정과 재료, 유체 원리가 실제 설계 성능과 연결된다는 점을 이해할 수 있었고, 이는 기계공학 분야 진로와도 자연스럽게 이어진다고 느꼈다.",
        options1: ["스마트 공장 생산 공정", "유체 흐름 설계 사례", "복합재료 적용 사례"],
        options2: ["설계 품질이 높아진다", "효율적인 생산이 가능해진다", "구조 안정성이 좋아진다"],
        options3: ["기계공학", "산업공학", "자동차공학"]
      };
    }

    if (theme === "architecture_environment") {
      return {
        title: "건축 재료와 환경 기술이 실제 설계에 적용되는 방식 탐구",
        introExample: "건축 재료와 환경 기술 개념을 배우면서 실제 건축 설계에서는 이러한 요소가 어떻게 적용되는지 궁금해져 이 주제를 선택하게 되었다.",
        body1Example: "건축 재료와 환경 기술은 건물의 성능과 지속가능성을 설명하는 중요한 요소가 된다.",
        body2Example: "예를 들어 친환경 건축에서는 재료의 특성과 환경 기술 적용이 실제 에너지 절감과 미세먼지 저감에 영향을 줄 수 있다.",
        conclusionExample: "이번 탐구를 통해 건축 재료와 환경 기술이 실제 설계 결과에 영향을 준다는 점을 이해할 수 있었고, 이는 건축학 관련 진로와도 연결된다고 느꼈다.",
        options1: ["친환경 콘크리트 사례", "미세먼지 저감 건축 사례", "에너지 절감 설계 사례"],
        options2: ["환경 성능이 좋아진다", "에너지 절감 효과가 높아진다", "건축물 활용성이 향상된다"],
        options3: ["건축학과", "건축공학과", "환경공학과"]
      };
    }

    return common;
  }

  function buildDraftHTML(payload){
    const data = getThemeData(payload);
    return `
      <div class="draft-report-card">
        <div class="draft-report-kicker">바로 제출용 초안</div>
        <div class="draft-report-title">${escapeHtml(data.title)}</div>

        <div class="draft-report-body">
          <p><b>도입</b><br>${escapeHtml(data.introExample)}</p>

          <p><b>본문 1</b><br>${escapeHtml(data.body1Example)}</p>

          <p><b>본문 2</b><br>예를 들어, <span class="draft-placeholder" id="draftOpt1">${escapeHtml(data.options1[0])}</span>에서는 해당 개념이 활용될 수 있으며, 이를 통해 <span class="draft-placeholder" id="draftOpt2">${escapeHtml(data.options2[0])}</span>.</p>

          <p><b>결론</b><br>이번 탐구를 통해 해당 개념이 실제 사례에 적용되는 방식을 이해할 수 있었고, 이는 <span class="draft-placeholder" id="draftOpt3">${escapeHtml(data.options3[0])}</span>와도 자연스럽게 연결된다고 느꼈다.</p>
        </div>

        <div class="draft-options-grid">
          <div class="draft-option-card">
            <div class="draft-option-title">수정 포인트 1. 사례 고르기</div>
            <div class="draft-option-help">아래 중 하나를 고르면 본문 2 문장에 바로 반영됩니다.</div>
            <div class="draft-option-buttons" data-target="draftOpt1">
              ${data.options1.map(v => `<button type="button" class="draft-option-btn">${escapeHtml(v)}</button>`).join("")}
            </div>
          </div>

          <div class="draft-option-card">
            <div class="draft-option-title">수정 포인트 2. 효과 고르기</div>
            <div class="draft-option-help">아래 중 하나를 고르면 본문 2 문장에 바로 반영됩니다.</div>
            <div class="draft-option-buttons" data-target="draftOpt2">
              ${data.options2.map(v => `<button type="button" class="draft-option-btn">${escapeHtml(v)}</button>`).join("")}
            </div>
          </div>

          <div class="draft-option-card">
            <div class="draft-option-title">수정 포인트 3. 진로 연결 고르기</div>
            <div class="draft-option-help">아래 중 하나를 고르면 결론 문장에 바로 반영됩니다.</div>
            <div class="draft-option-buttons" data-target="draftOpt3">
              ${data.options3.map(v => `<button type="button" class="draft-option-btn">${escapeHtml(v)}</button>`).join("")}
            </div>
          </div>
        </div>

        <div class="draft-final-tip">
          위 3가지만 고르면 보고서 초안이 바로 완성됩니다.
        </div>
      </div>
    `;
  }

  function ensureMount(){
    const resultSection = $("resultSection");
    if (!resultSection) return null;

    let mount = $("draftReportGuide");
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = "draftReportGuide";
    mount.className = "draft-report-wrap";

    const studentFocusGuide = $("studentFocusGuide");
    const reportNavigationGuide = $("reportNavigationGuide");
    const contentOutputSection = $("contentOutputSection");

    if (studentFocusGuide && studentFocusGuide.parentNode) {
      studentFocusGuide.parentNode.insertBefore(mount, studentFocusGuide);
    } else if (reportNavigationGuide && reportNavigationGuide.parentNode) {
      reportNavigationGuide.parentNode.insertBefore(mount, reportNavigationGuide);
    } else if (contentOutputSection && contentOutputSection.parentNode) {
      contentOutputSection.parentNode.insertBefore(mount, contentOutputSection);
    } else {
      resultSection.prepend(mount);
    }
    return mount;
  }

  function hideOtherGuideBlocks(){
    ["studentFocusGuide", "reportNavigationGuide"].forEach(id => {
      const el = $(id);
      if (el) el.style.display = "none";
    });

    document.querySelectorAll(".admission-spotlight-card, .admission-grid, .record-card").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll("h3, h2, h4").forEach(h => {
      const txt = (h.textContent || "").trim();
      if (txt === "주제 후보" || txt === "합격 포인트" || txt === "차별화 포인트" || txt === "교과서에서 직접 쓸 개념" || txt === "바로 쓸 탐구 포인트" || txt === "탐구 설계 단계" || txt === "추천 도서") {
        const block = h.closest(".result-card, .content-output-card, section, div");
        if (block && block.id !== "draftReportGuide") {
          block.style.display = "none";
        }
      }
    });
  }

  function bindOptions(root){
    root.querySelectorAll(".draft-option-buttons").forEach(group => {
      group.addEventListener("click", function(event){
        const btn = event.target.closest(".draft-option-btn");
        if (!btn) return;

        const targetId = group.getAttribute("data-target");
        const target = document.getElementById(targetId);
        if (target) target.textContent = btn.textContent.trim();

        group.querySelectorAll(".draft-option-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  function applyDraftGuide(){
    const resultSection = $("resultSection");
    if (!resultSection || resultSection.style.display === "none") return;

    const payload = getPayload();
    const mount = ensureMount();
    if (!mount) return;

    mount.innerHTML = buildDraftHTML(payload);
    bindOptions(mount);
    hideOtherGuideBlocks();
  }

  function waitAndApply(){
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const resultSection = $("resultSection");
      if (resultSection && resultSection.style.display !== "none") {
        applyDraftGuide();
      }
      if (tries >= 20) clearInterval(timer);
    }, 250);
  }

  document.addEventListener("DOMContentLoaded", function(){
    const generateBtn = $("generateBtn");
    if (!generateBtn) return;
    generateBtn.addEventListener("click", function(){
      setTimeout(waitAndApply, 220);
    }, true);
  });
})();
