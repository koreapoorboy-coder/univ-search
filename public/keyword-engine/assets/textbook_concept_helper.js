window.__TEXTBOOK_CONCEPT_HELPER_VERSION = "v3.2-major-focus";

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

  const UI_SEED_URL = "seed/textbook-v1/subject_concept_ui_seed.json";
  const ENGINE_MAP_URL = "seed/textbook-v1/subject_concept_engine_map.json";

  const state = { subject: "", concept: "", keyword: "", career: "" };
  let uiSeed = null;
  let engineMap = null;

  async function init(){
    try{
      const [uiRes, engineRes] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }),
        fetch(ENGINE_MAP_URL, { cache: "no-store" })
      ]);
      if(!uiRes.ok || !engineRes.ok){
        console.warn("textbook concept seed load failed", uiRes.status, engineRes.status);
        return;
      }

      uiSeed = await uiRes.json();
      engineMap = await engineRes.json();

      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      renderAll();
      safeHideLegacyCareerBlock();
      setTimeout(safeHideLegacyCareerBlock, 500);
      setTimeout(safeHideLegacyCareerBlock, 1500);
    }catch(error){
      console.warn("textbook concept helper init error:", error);
    }
  }

  function injectUI(){
    const keywordInput = $("keyword");
    if(!keywordInput || $("textbookConceptSelectorSection")) return;

    const wrap = document.createElement("section");
    wrap.id = "textbookConceptSelectorSection";
    wrap.className = "textbook-concept-section";
    wrap.innerHTML = `
      <div class="textbook-concept-card">
        <div class="textbook-concept-kicker">수업 개념부터 고르면 더 이해하기 쉽습니다</div>
        <h2 class="textbook-concept-title">과목 → 교과 개념 → 교과 키워드 → 확장 방향 이해</h2>
        <p class="textbook-concept-desc">
          먼저 과목을 고르고, 그 안에서 수업 개념을 선택하세요.
          그다음 교과 키워드를 누르면 관련 진로/학과 연결까지 한눈에 볼 수 있습니다.
        </p>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>1. 과목 확인</h3>
            <div class="textbook-guide">현재 선택 과목 기준</div>
          </div>
          <div id="selectedSubjectSummary" class="textbook-selected-subject">먼저 과목을 선택하세요.</div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>2. 교과 개념 선택</h3>
            <div class="textbook-guide">1개 선택</div>
          </div>
          <div id="textbookConceptButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>3. 이 개념의 교과 키워드</h3>
            <div class="textbook-guide">1개 선택</div>
          </div>
          <div id="textbookKeywordButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>4. 이 키워드를 어떤 방향으로 확장할까?</h3>
            <div class="textbook-guide">아래에서 과목·전공 연결 설명</div>
          </div>
          <div id="textbookCareerButtons" class="textbook-buttons"></div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>5. 왜 이 키워드가 중요할까?</h3>
            <div class="textbook-guide">대학 전공까지 연결</div>
          </div>
          <div id="textbookReasonBox" class="textbook-reason-box">교과 키워드와 진로를 선택하면 수업 위치, 연결 과목, 대학 전공까지 함께 보여줍니다.</div>
        </div>

        <div class="textbook-block">
          <div class="textbook-head">
            <h3>현재 선택</h3>
            <div class="textbook-guide">자동 반영</div>
          </div>
          <div id="textbookSelectionSummary" class="textbook-selection-summary">아직 선택하지 않았습니다.</div>
        </div>
      </div>
    `;

    keywordInput.parentNode.insertBefore(wrap, keywordInput);
    keywordInput.placeholder = "위 교과 키워드를 선택하면 자동으로 입력됩니다. 직접 입력도 가능합니다.";
  }

  function bindEvents(){
    const subjectEl = $("subject");
    if(subjectEl){
      subjectEl.addEventListener("change", function(){
        syncSubjectFromSelect();
        state.concept = "";
        state.keyword = "";
        state.career = "";
        syncKeywordInput();
        syncCareerInput(false);
        renderAll();
        safeHideLegacyCareerBlock();
      });
    }

    const root = $("textbookConceptSelectorSection");
    if(root){
      root.addEventListener("click", function(event){
        const btn = event.target.closest(".textbook-btn");
        if(!btn) return;

        const action = btn.dataset.action;
        const value = btn.dataset.value || "";
        event.preventDefault();

        if(action === "concept"){
          state.concept = state.concept === value ? "" : value;
          state.keyword = "";
          state.career = "";
          syncKeywordInput();
          syncCareerInput(false);
          renderAll();
          return;
        }

        if(action === "keyword"){
          state.keyword = state.keyword === value ? "" : value;
          state.career = "";
          syncKeywordInput();
          syncCareerInput(false);
          renderAll();
          return;
        }

        if(action === "career"){
          state.career = state.career === value ? "" : value;
          syncCareerInput(!!state.career);
          renderAll();
        }
      });
    }
  }

  function getSubjectRawValue(){
    const el = $("subject");
    if(!el) return "";
    const value = (el.value || "").trim();
    const text = el.options && el.selectedIndex >= 0 ? (el.options[el.selectedIndex].text || "").trim() : "";
    return value || text || "";
  }

  function syncSubjectFromSelect(){
    const raw = getSubjectRawValue();
    state.subject = findSubjectKey(raw);
  }

  function findSubjectKey(raw){
    if(!raw || !uiSeed) return "";
    const keys = Object.keys(uiSeed);
    const cleaned = normalizeSubject(raw);

    for(const key of keys){
      const nk = normalizeSubject(key);
      if(nk === cleaned) return key;
    }
    for(const key of keys){
      const nk = normalizeSubject(key);
      if(cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    const aliasMap = {
      "통합과학": "통합과학1",
      "통합과학1": "통합과학1",
      "integratedscience1": "통합과학1",
      "과학탐구실험": "과학탐구실험1",
      "과학탐구실험1": "과학탐구실험1",
      "과학탐구실험2": "과학탐구실험2",
      "scienceinquiryexperiment1": "과학탐구실험1",
      "scienceinquiryexperiment2": "과학탐구실험2",
      "수학": "공통수학1",
      "공통수학1": "공통수학1",
      "공통수학2": "공통수학2",
      "commonmath1": "공통수학1",
      "commonmath2": "공통수학2",
      "정보": "정보",
      "information": "정보"
    };
    return aliasMap[cleaned] || "";
  }

  function normalizeSubject(v){
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/]/g, "")
      .toLowerCase();
  }

  function getConceptList(subject){
    if(!subject || !uiSeed || !uiSeed[subject]) return [];
    const entry = uiSeed[subject];
    if(Array.isArray(entry.concepts)) return entry.concepts;
    if(Array.isArray(entry.concept_buttons)){
      return entry.concept_buttons.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    if(Array.isArray(entry.concept_order)) return entry.concept_order;
    if(Array.isArray(entry.items)){
      return entry.items.map(item => item && (item.concept || item.label || item.name)).filter(Boolean);
    }
    return [];
  }

  function getConceptEntry(){
    if(!state.subject || !state.concept || !engineMap || !engineMap[state.subject]) return null;
    const subjectEntry = engineMap[state.subject];
    if(subjectEntry.concepts && subjectEntry.concepts[state.concept]) return subjectEntry.concepts[state.concept];
    return subjectEntry[state.concept] || null;
  }

  function stringArrayFrom(value){
    if(!value) return [];
    if(Array.isArray(value)) {
      return value.map(item => {
        if(typeof item === "string") return item;
        if(item && typeof item === "object"){
          return item.keyword || item.topic || item.name || item.subject || item.bridge || item.label || item.concept || item.title || "";
        }
        return "";
      }).filter(Boolean);
    }
    return [];
  }

  function unique(arr){
    return [...new Set((arr || []).filter(Boolean))];
  }

  function getKeywordList(entry){
    if(!entry) return [];
    return stringArrayFrom(entry.keywords || entry.micro_keywords || entry.core_keywords || entry.keyword_buttons);
  }

  function getCareerList(entry){
    if(!entry) return [];
    return stringArrayFrom(entry.career_bridges || entry.linked_career_bridge || entry.careers || entry.career_keywords);
  }

  function renderAll(){
    renderSubjectSummary();
    renderConceptButtons();
    renderKeywordButtons();
    renderCareerButtons();
    renderReasonBox();
    renderSelectionSummary();
  }

  function renderSubjectSummary(){
    const el = $("selectedSubjectSummary");
    if(el) el.textContent = state.subject || "먼저 과목을 선택하세요.";
  }

  function renderConceptButtons(){
    const el = $("textbookConceptButtons");
    if(!el) return;
    const concepts = getConceptList(state.subject);

    if(!state.subject){
      el.innerHTML = `<div class="textbook-empty">과목을 선택하면 교과 개념이 나옵니다.</div>`;
      return;
    }
    if(!concepts.length){
      el.innerHTML = `<div class="textbook-empty">등록된 교과 개념이 없습니다.</div>`;
      return;
    }

    el.innerHTML = concepts.map(concept => `
      <button type="button" class="textbook-btn ${state.concept === concept ? "active" : ""}"
        data-action="concept" data-value="${escapeHtml(concept)}">${escapeHtml(concept)}</button>
    `).join("");
  }

  function renderKeywordButtons(){
    const el = $("textbookKeywordButtons");
    if(!el) return;
    if(!state.subject || !state.concept){
      el.innerHTML = `<div class="textbook-empty">교과 개념을 선택하면 교과 키워드가 나옵니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);
    if(!keywords.length){
      el.innerHTML = `<div class="textbook-empty">등록된 교과 키워드가 없습니다.</div>`;
      return;
    }

    el.innerHTML = keywords.map(keyword => `
      <button type="button" class="textbook-btn ${state.keyword === keyword ? "active" : ""}"
        data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
    `).join("");
  }

  function renderCareerButtons(){
    const el = $("textbookCareerButtons");
    if(!el) return;
    if(!state.keyword){
      el.innerHTML = `<div class="textbook-empty">교과 키워드를 선택하면 이 키워드를 어떤 방향으로 확장할지 고를 수 있습니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const careers = getCareerList(entry);
    if(!careers.length){
      el.innerHTML = `<div class="textbook-empty">등록된 확장 방향 정보가 없습니다.</div>`;
      return;
    }

    el.innerHTML = careers.map(career => `
      <button type="button" class="textbook-btn ${state.career === career ? "active" : ""}"
        data-action="career" data-value="${escapeHtml(career)}">${escapeHtml(career)}</button>
    `).join("");
  }

  function renderReasonBox(){
    const el = $("textbookReasonBox");
    if(!el) return;

    if(!state.keyword){
      el.innerHTML = `<div class="textbook-empty">교과 키워드를 선택하면 수업 위치와 대학 전공 연결까지 쉽게 설명해 줍니다.</div>`;
      return;
    }
    if(!state.career){
      el.innerHTML = `<div class="textbook-empty">4번에서 하나를 선택하면 통합과학 단원, 연결 과목, 대학 전공까지 함께 보여줍니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const reason = buildReasonData(entry, state.keyword, state.career, state.subject, state.concept);

    el.innerHTML = `
      <div class="reason-card reason-card--major">
        <div class="reason-topline">${escapeHtml(reason.badge)}</div>
        <h4 class="reason-title">${escapeHtml(reason.title)}</h4>
        <p class="reason-lead">${escapeHtml(reason.lead)}</p>

        <div class="reason-major-summary">
          <div class="reason-mini-label">추천 전공 예시</div>
          <div class="reason-chip-list reason-chip-list--highlight">${reason.majorChips}</div>
        </div>

        <div class="reason-grid reason-grid--major">
          <div class="reason-mini-card">
            <div class="reason-mini-label">왜 연결돼?</div>
            <p>${escapeHtml(reason.why)}</p>
          </div>
          <div class="reason-mini-card">
            <div class="reason-mini-label">${escapeHtml(reason.schoolLabel)}</div>
            <p>${escapeHtml(reason.school)}</p>
          </div>
          <div class="reason-mini-card">
            <div class="reason-mini-label">연결되는 다른 과목은?</div>
            <div class="reason-chip-list">${reason.subjectChips}</div>
          </div>
          <div class="reason-mini-card">
            <div class="reason-mini-label">전공으로 더 가면?</div>
            <p>${escapeHtml(reason.majorLead)}</p>
          </div>
        </div>

        <div class="reason-example">
          <div class="reason-mini-label">이런 학생에게 잘 맞아요</div>
          <p>${escapeHtml(reason.fit)}</p>
        </div>
      </div>
    `;
  }

  function renderSelectionSummary(){
    const el = $("textbookSelectionSummary");
    if(!el) return;
    const parts = [state.subject, state.concept, state.keyword, state.career].filter(Boolean);
    el.innerHTML = parts.length
      ? parts.map(part => `<span class="textbook-chip">${escapeHtml(part)}</span>`).join("")
      : "아직 선택하지 않았습니다.";
  }

  function syncKeywordInput(){
    const keywordInput = $("keyword");
    if(!keywordInput) return;
    if(state.keyword){
      keywordInput.value = state.keyword;
      keywordInput.dataset.autoFilled = "textbook-keyword";
    } else if(keywordInput.dataset.autoFilled === "textbook-keyword"){
      keywordInput.value = "";
      keywordInput.dataset.autoFilled = "";
    }
  }

  function syncCareerInput(shouldFill){
    const careerInput = $("career");
    if(!careerInput) return;
    if(shouldFill && state.career){
      careerInput.value = state.career;
      careerInput.dataset.autoFilled = "textbook-career";
    } else if(careerInput.dataset.autoFilled === "textbook-career"){
      careerInput.value = "";
      careerInput.dataset.autoFilled = "";
    }
  }

  function buildReasonData(entry, keyword, career, subject, concept){
    const relatedSubjects = getRelatedSubjects(entry, subject, career);
    const relatedMajors = getRelatedMajors(keyword, career, relatedSubjects);

    return {
      badge: `${subject} · ${concept}`,
      title: `${keyword}을(를) 이렇게 확장해 볼 수 있어요`,
      lead: `${keyword}은(는) 교과서 속 개념이지만, 실제로는 다른 과목과 대학 전공까지 이어질 수 있는 출발점이에요.`,
      why: buildWhyText(keyword, career),
      schoolLabel: `${subject} 단원 연결`,
      school: buildSchoolText(subject, concept, keyword, entry),
      subjectChips: chipHtml(relatedSubjects),
      majorChips: chipHtml(relatedMajors),
      majorLead: buildMajorLeadText(relatedMajors),
      fit: buildFitText(keyword, career)
    };
  }

  function buildWhyText(keyword, career){
    const pair = `${keyword}|${career}`;
    const map = {
      "정밀 측정|물리학": "정밀 측정은 아주 작은 차이도 정확하게 재고 오차를 줄이는 힘과 연결돼요. 물리학은 실험과 관찰에서 정확한 수치가 중요해서 이 키워드와 잘 이어져요.",
      "위치 추적|지구과학": "위치 추적은 대상이 어디에 있고 어떻게 움직이는지 파악하는 힘과 연결돼요. 지구과학은 지진, 태풍, 행성 운동처럼 위치와 변화를 읽는 일이 많아서 잘 맞아요.",
      "위치 추적|정보": "위치 추적은 좌표와 데이터를 처리하는 힘과 연결돼요. 정보 분야에서는 GPS, 지도, 센서 데이터처럼 위치 정보를 계산하고 활용하는 일이 많아요.",
      "자극 반응|생명과학 탐구": "자극 반응은 생물이 환경 변화에 어떻게 반응하는지 이해하는 핵심 개념이에요. 생명과학 탐구는 이런 변화를 관찰하고 이유를 설명하는 활동과 바로 연결돼요.",
      "나트륨 이온|생명과학 탐구": "나트륨 이온은 신경 전달과 세포막 이동처럼 생명 현상을 설명할 때 자주 나오는 핵심 개념이에요. 그래서 생명과학 탐구와 자연스럽게 이어져요."
    };
    if(map[pair]) return map[pair];
    return `${keyword}은(는) ${career}와 관련된 현상을 관찰하고 해석할 때 자주 쓰이는 관점이에요. 교과서에서 배운 개념을 실제 문제에 연결해 보는 첫 단추라고 보면 돼요.`;
  }

  function buildSchoolText(subject, concept, keyword, entry){
    const lesson = entry && entry.lesson_focus ? entry.lesson_focus : "개념의 의미를 이해하고 실제 현상과 연결하는 흐름";
    return `${subject}의 ‘${concept}’에서 ${keyword}과(와) 이어지는 흐름을 배우게 돼요. 이 단원은 ${lesson}`;
  }

  function getRelatedSubjects(entry, subject, career){
    const horizontal = Array.isArray(entry && entry.horizontal_links) ? entry.horizontal_links.map(v => v && v.subject).filter(Boolean) : [];
    const vertical = Array.isArray(entry && entry.vertical_links) ? entry.vertical_links.map(v => v && v.subject).filter(Boolean) : [];
    const careerAsSubject = isSubjectLike(career) ? [career] : [];
    const cleaned = unique([...horizontal, ...vertical, ...careerAsSubject]).filter(v => v !== subject);
    return cleaned.slice(0, 6);
  }

  function isSubjectLike(value){
    return ["물리학","지구과학","정보","공통수학1","공통수학2","생명과학 탐구","과학 데이터 해석"].includes(value);
  }

  function getRelatedMajors(keyword, career, subjects){
    const key = `${keyword}|${career}`;
    const pairMap = {
      "정밀 측정|물리학": ["물리학과","기계공학과","전자공학과","반도체공학과","신소재공학과"],
      "위치 추적|지구과학": ["지구과학과","천문우주학과","환경공학과","해양학과","도시공학과"],
      "위치 추적|정보": ["컴퓨터공학과","소프트웨어학과","인공지능학과","전자공학과","항공우주공학과"],
      "자극 반응|생명과학 탐구": ["생명과학과","생명공학과","의생명공학과","간호학과","약학과"],
      "나트륨 이온|생명과학 탐구": ["생명과학과","생명공학과","의생명공학과","약학과","간호학과"]
    };
    if(pairMap[key]) return pairMap[key];

    const baseMap = {
      "물리학": ["물리학과","기계공학과","전자공학과","반도체공학과","천문우주학과"],
      "지구과학": ["지구과학과","천문우주학과","환경공학과","해양학과","지리학과"],
      "정보": ["컴퓨터공학과","소프트웨어학과","인공지능학과","데이터사이언스학과","전자공학과"],
      "공통수학1": ["수학과","통계학과","산업공학과","데이터사이언스학과","경제학과"],
      "공통수학2": ["수학과","통계학과","산업공학과","건축학과","도시공학과"],
      "생명과학 탐구": ["생명과학과","생명공학과","의생명공학과","간호학과","약학과"],
      "과학 데이터 해석": ["통계학과","데이터사이언스학과","산업공학과","환경공학과","물리학과"],
      "정밀 측정": ["물리학과","기계공학과","전자공학과","반도체공학과","신소재공학과"],
      "위치 추적": ["지구과학과","천문우주학과","항공우주공학과","컴퓨터공학과","도시공학과"],
      "생체 데이터": ["의공학과","생명과학과","생명공학과","간호학과","보건학과"],
      "건강 측정": ["간호학과","보건학과","의공학과","스포츠과학과","약학과"],
      "항상성 분석": ["생명과학과","생명공학과","간호학과","약학과","의예과"]
    };

    let results = [];
    if(baseMap[career]) results = results.concat(baseMap[career]);
    if(baseMap[keyword]) results = results.concat(baseMap[keyword]);
    (subjects || []).forEach(subject => {
      if(baseMap[subject]) results = results.concat(baseMap[subject].slice(0,2));
    });
    results = unique(results);
    return results.length ? results.slice(0, 6) : ["자연과학계열","공학계열","의생명계열"];
  }


  function buildMajorLeadText(majors){
    const list = (majors || []).filter(Boolean);
    if(!list.length) return "이 키워드는 자연과학·공학·의생명 계열 전공과 폭넓게 이어질 수 있어요.";
    if(list.length === 1) return `${list[0]}처럼 교과 개념을 실제 분석과 탐구로 확장하는 전공과 연결돼요.`;
    const top = list.slice(0, 3).join(", ");
    return `${top}처럼 교과 개념을 측정·해석·모델링으로 확장하는 전공과 이어질 수 있어요.`;
  }

  function buildFitText(keyword, career){
    const byCareer = {
      "물리학": "측정, 비교, 실험 결과 해석을 좋아하는 학생에게 잘 맞아요.",
      "지구과학": "위치 변화, 자연 현상 관찰, 지도나 우주에 관심 있는 학생에게 잘 맞아요.",
      "정보": "데이터를 구조화하고 계산하거나 디지털 도구를 활용하는 걸 좋아하는 학생에게 잘 맞아요.",
      "생명과학 탐구": "몸의 변화, 생명 현상, 실험과 관찰을 좋아하는 학생에게 잘 맞아요.",
      "과학 데이터 해석": "숫자와 그래프를 보고 의미를 찾는 걸 좋아하는 학생에게 잘 맞아요."
    };
    if(byCareer[career]) return byCareer[career];
    if(keyword.includes("측정")) return "정확하게 재고 비교하는 활동을 좋아하는 학생에게 잘 맞아요.";
    if(keyword.includes("추적")) return "움직임과 위치 변화를 따라가는 활동을 좋아하는 학생에게 잘 맞아요.";
    return `${keyword}처럼 개념을 외우는 데서 끝나지 않고, 다른 과목이나 전공까지 확장해 보고 싶은 학생에게 잘 맞아요.`;
  }

  function chipHtml(items){
    if(!items || !items.length) return `<span class="reason-chip muted-chip">연결 정보 준비 중</span>`;
    return items.map(item => `<span class="reason-chip">${escapeHtml(item)}</span>`).join("");
  }

  function safeHideLegacyCareerBlock(){
    try{
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4"));
      const target = headings.find(h => (h.textContent || "").includes("진로 → 학과 → 추천 키워드 선택"));
      if(!target) return;

      let block = target.closest("section, .card, .result-card, .side-card, .student-card, .analysis-card");
      if(!block) block = target.parentElement;
      if(!block || block.id === "textbookConceptSelectorSection") return;
      block.style.display = "none";
    }catch(error){
      console.warn("safeHideLegacyCareerBlock error:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
