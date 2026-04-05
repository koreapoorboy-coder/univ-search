
window.__KEYWORD_ENGINE_VERSION = "admissions-v34-final-clean";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";

function $(id){ return document.getElementById(id); }
function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function createSessionId(){ return `session_${Date.now()}_${Math.random().toString(36).slice(2,10)}`; }

function setText(id, value){
  const el = $(id);
  if (el) el.textContent = value ?? "";
}
function setHTML(id, value){
  const el = $(id);
  if (el) el.innerHTML = value ?? "";
}
function showBlock(id, displayValue="block"){
  const el = $(id);
  if (el) el.style.display = displayValue;
}
function hideBlock(id){
  const el = $(id);
  if (el) el.style.display = "none";
}
function clearIfExists(ids){
  ids.forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = "";
  });
}
function ensureContentOutputSection(){
  let el = $("contentOutputSection");
  if (el) return el;
  const resultSection = $("resultSection");
  if (!resultSection) return null;
  el = document.createElement("div");
  el.id = "contentOutputSection";
  resultSection.appendChild(el);
  return el;
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

function getFormValues(){
  return {
    sessionId:createSessionId(),
    schoolName:$("schoolName")?.value?.trim()||"",
    grade:$("grade")?.value?.trim()||"",
    subject:$("subject")?.value?.trim()||"",
    taskName:$("taskName")?.value?.trim()||"",
    taskType:$("taskType")?.value?.trim()||"",
    usagePurpose:$("usagePurpose")?.value?.trim()||"",
    taskDescription:$("taskDescription")?.value?.trim()||"",
    career:$("career")?.value?.trim()||"",
    keyword:$("keyword")?.value?.trim()||"",
    major:$("career")?.value?.trim()||"",
    track:$("career")?.value?.trim()||""
  };
}

function validateInput(data){
  const required=[["schoolName","학교명"],["grade","학년"],["subject","과목"],["taskName","수행평가명"],["taskType","수행평가 형태"],["usagePurpose","사용 목적"],["career","희망 진로"],["keyword","키워드"]];
  for(const [key,label] of required){
    if(!data[key]) throw new Error(`${label}을(를) 입력해 주세요.`);
  }
}

function setLoading(isLoading){
  const btn=$("generateBtn"), resetBtn=$("resetBtn"), loading=$("loadingMessage");
  if(btn){ btn.disabled=isLoading; btn.textContent=isLoading?"생성 중...":"학생용 결과 생성"; }
  if(resetBtn) resetBtn.disabled=isLoading;
  if(loading) loading.style.display=isLoading?"block":"none";
}

function showError(message){
  setHTML("errorMessage", `<strong>오류</strong><br>${escapeHtml(message)}`);
  showBlock("errorMessage", "block");
  hideBlock("resultSection");
}
function clearError(){
  setHTML("errorMessage", "");
  hideBlock("errorMessage");
}

function hideLegacySections(){
  const ids = [
    "outputCard","reportFrameCard","doDontCard","inputSummaryCard","studentReport",
    "reasonCard","stepsCard","flowCard","subjectLinksCard","warningsCard",
    "assessmentReferenceCard","textbookSection","extensionLibrarySection"
  ];

  ids.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = "";
    el.style.display = "none";

    const wrappers = [
      el.closest(".quick-card"),
      el.closest(".student-card"),
      el.closest(".analysis-card"),
      el.closest(".result-card"),
      el.closest(".side-card"),
      el.closest(".card"),
      el.parentElement
    ].filter(Boolean);

    wrappers.forEach(w => {
      // hide only if this wrapper looks like a standalone block
      if (w && w.id !== "contentOutputSection" && w.id !== "resultSection") {
        w.style.display = "none";
      }
    });
  });

  // extra legacy headings/buttons that remained visible
  [
    "copyReportBtn",
    "analysisSection",
    "studentDraftSection",
    "analysisWrap",
    "studentDraftWrap"
  ].forEach(id => {
    const el = $(id);
    if (el) {
      const target = el.closest("section, .card, .result-card, div") || el;
      target.style.display = "none";
    }
  });

  // hard hide by visible text block patterns
  document.querySelectorAll("section, .card, .result-card, .quick-card, .student-card, .analysis-card, .side-card, .panel").forEach(node => {
    const text = (node.textContent || "").trim();
    if (!text) return;
    if (
      text.includes("학생 제출용 초안") ||
      text.includes("바로 쓸 수 있는 보고서") ||
      text.includes("운영/분석용 참고 보기") ||
      text.includes("보고서 복사")
    ) {
      node.style.display = "none";
    }
  });
}

function clearResults(){
  clearIfExists([
    "finalMode","finalReason","finalTopic","topicSub","actionSteps","contentOutputSection"
  ]);
  hideLegacySections();
  hideBlock("resultSection");
}

async function callGenerateAPI(payload){
  const response = await fetch(`${WORKER_BASE_URL}/generate`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const text = await response.text();
  let data;
  try{
    data = JSON.parse(text);
  }catch{
    throw new Error(`응답을 해석할 수 없습니다. (${response.status})`);
  }
  if(!response.ok || data.ok === false){
    throw new Error(data?.error || data?.message || `요청 처리 중 오류가 발생했습니다. (${response.status})`);
  }
  return data;
}

function buildLocalContent(payload){
  const keywords = splitKeywords(payload.keyword);
  const joined = keywords.join(" + ") || payload.keyword;

  const subjectCards = deriveSubjectCards(payload.subject, payload.career, keywords);
  const quickPoints = deriveQuickPoints(payload.subject, payload.career, keywords);
  const steps = deriveActionSteps(payload.subject, payload.career, keywords);
  const flow = deriveReportFlow(payload.subject, payload.career, keywords);
  const books = deriveBooks(payload.career, keywords);
  const why = deriveWhy(payload.subject, payload.career, keywords);

  return {
    title: `[탐구주제] ${joined} 관련 교과 연결`,
    one_line_pick: `${joined}의 핵심 개념과 실제 적용을 중심으로 보기`,
    intro: `${joined}는 ${payload.subject} 교과 개념과 연결하기 좋고, ${payload.career} 진로와도 자연스럽게 이어질 수 있는 탐구 조합입니다.`,
    why_this_works: why,
    topic_options: [
      `${joined} 관련 교과 연결 탐구`,
      `${joined}의 핵심 개념과 실제 적용 중심 탐구`,
      `${joined} 관련 비교·해석형 탐구`
    ],
    subject_cards: subjectCards,
    quick_points: quickPoints,
    steps,
    report_flow: flow,
    books
  };
}

function deriveWhy(subject, career, keywords){
  const texts = [subject, career, ...keywords];
  if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) {
    return "개인 건강관리와 공공 보건을 함께 다룰 수 있어서, 학생도 이해하기 쉽고 진로 연결도 분명하게 보입니다.";
  }
  if (containsAny(texts, ["이차전지", "배터리", "전고체", "전극", "전해질"])) {
    return "구조 차이와 성능 차이를 같은 기준으로 비교하기 좋아서, 학생이 보고서 방향을 잡기 쉬운 공학형 주제입니다.";
  }
  if (containsAny(texts, ["반도체", "도핑", "트랜지스터", "웨이퍼"])) {
    return "부품·공정·원리로 나눠 설명할 수 있어 교과 개념 연결과 전공 적합성 표현이 쉽습니다.";
  }
  if (containsAny(texts, ["인공지능", "데이터", "알고리즘", "AI"])) {
    return "기술 원리와 실제 활용 사례를 함께 다룰 수 있어서, 학생이 실생활 예시를 붙이기 쉬운 주제입니다.";
  }
  if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) {
    return "과학 개념과 실제 산업 사례를 같이 설명할 수 있어서, 학생이 비교 기준을 세우고 전공 연결을 하기 쉬운 주제입니다.";
  }
  return "교과 개념과 실제 사례를 함께 다루면 학생이 보고서 방향을 잡기 쉬워지고, 진로 연결도 더 분명해집니다.";
}

function deriveSubjectCards(subject, career, keywords){
  const texts = [subject, career, ...keywords];

  if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) {
    return [
      {
        title: `${subject} : 감염병 예방과 면역 반응`,
        concepts: ["면역 반응", "항상성", "병원체와 방어 작용", "예방의 의미"],
        points: ["감염이 퍼지는 과정을 간단히 정리하기", "면역 반응이 왜 필요한지 설명하기"]
      },
      {
        title: `${subject} : 개인 건강관리와 공공 보건`,
        concepts: ["예방", "건강 정책", "보건의료 체계", "사회적 대응"],
        points: ["개인 예방과 공공 보건의 차이를 비교하기", "정책이 감염 예방에 어떤 역할을 하는지 정리하기"]
      }
    ];
  }

  if (containsAny(texts, ["이차전지", "배터리", "전고체", "전극", "전해질"])) {
    return [
      {
        title: `${subject} : 산화환원과 전지`,
        concepts: ["산화환원", "전극", "전해질", "전지의 작동 원리"],
        points: ["전지가 어떻게 작동하는지 짧게 설명하기", "배터리 구조 차이를 같은 기준으로 비교하기"]
      },
      {
        title: `${subject} : 소재 특성과 성능`,
        concepts: ["소재", "안전성", "효율", "에너지 저장"],
        points: ["소재 변화가 성능에 주는 영향 정리하기", "안전성과 효율을 함께 비교하기"]
      }
    ];
  }

  if (containsAny(texts, ["반도체", "도핑", "트랜지스터", "웨이퍼"])) {
    return [
      {
        title: `${subject} : 반도체의 기본 원리`,
        concepts: ["도체·반도체", "전류 흐름", "도핑", "전기적 특성"],
        points: ["반도체가 왜 필요한지 설명하기", "도핑이 성질을 어떻게 바꾸는지 정리하기"]
      },
      {
        title: `${subject} : 반도체 부품과 공정`,
        concepts: ["트랜지스터", "회로", "웨이퍼", "공정"],
        points: ["부품 역할을 간단히 구분하기", "공정이 결과 성능에 미치는 영향 연결하기"]
      }
    ];
  }

  if (containsAny(texts, ["인공지능", "데이터", "알고리즘", "AI"])) {
    return [
      {
        title: `${subject} : 데이터와 알고리즘`,
        concepts: ["데이터 처리", "알고리즘", "패턴 인식", "판단 기준"],
        points: ["데이터가 어떤 방식으로 활용되는지 설명하기", "알고리즘이 결과를 만드는 과정을 정리하기"]
      },
      {
        title: `${subject} : AI의 실제 적용`,
        concepts: ["인공지능", "자동화", "의사결정", "사회적 영향"],
        points: ["AI 적용 사례 1~2개 연결하기", "기술 장점과 한계를 비교하기"]
      }
    ];
  }

  if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) {
    return [
      {
        title: `${subject} : 에너지 전환과 열역학`,
        concepts: ["에너지 전환", "열역학 기본 법칙", "효율", "열 손실"],
        points: ["에너지가 어떻게 변환되는지 정리하기", "효율 차이가 생기는 이유를 설명하기"]
      },
      {
        title: `${subject} : 원자력발전과 재료`,
        concepts: ["발전 원리", "열 전달", "재료 특성", "고분자 재료"],
        points: ["원자력발전이 어떻게 이루어지는지 간단히 설명하기", "재료가 실제 성능과 안전성에 어떤 영향을 주는지 연결하기"]
      }
    ];
  }

  return [
    {
      title: `${subject} : 핵심 개념 정리`,
      concepts: ["핵심 개념", "원리", "사례 연결", "교과 개념 적용"],
      points: ["먼저 교과 개념을 짧게 정리하기", "선택 키워드와 연결되는 사례를 붙이기"]
    },
    {
      title: `${subject} : 비교와 해석`,
      concepts: ["비교 기준", "차이점", "의미 해석", "활용 가능성"],
      points: ["비교 기준 2~3개 세우기", "차이가 나는 이유를 교과 개념으로 설명하기"]
    }
  ];
}

function deriveQuickPoints(subject, career, keywords){
  const texts = [subject, career, ...keywords];
  if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) {
    return [
      "감염이 일어나는 과정과 예방 방법을 함께 정리하기",
      "면역 반응이 왜 중요한지 개인 건강관리 관점에서 설명하기",
      "개인 예방과 공공 보건정책의 차이를 비교하기",
      "정책 사례 1개를 붙여 실제 적용 의미를 해석하기"
    ];
  }
  if (containsAny(texts, ["이차전지", "배터리", "전고체"])) {
    return [
      "비교할 배터리 2개를 먼저 정하기",
      "안전성·효율·활용성 기준으로 차이를 정리하기",
      "구조 차이가 성능 차이로 이어지는 이유 설명하기",
      "전기차나 에너지 저장 사례와 연결하기"
    ];
  }
  if (containsAny(texts, ["반도체"])) {
    return [
      "반도체가 필요한 이유를 먼저 정리하기",
      "도핑이나 트랜지스터 역할을 핵심만 설명하기",
      "부품·공정·활용으로 나눠 구조화하기",
      "실생활 전자기기와 연결하기"
    ];
  }
  if (containsAny(texts, ["인공지능", "데이터", "AI"])) {
    return [
      "AI가 사용하는 데이터와 알고리즘을 구분하기",
      "활용 사례 1~2개 붙이기",
      "장점과 한계를 같은 기준으로 비교하기",
      "사회적 영향 또는 진로 연결 의미 정리하기"
    ];
  }
  if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) {
    return [
      "원자력발전이 어떻게 에너지를 만드는지 먼저 정리하기",
      "열역학 법칙이 실제 발전 효율과 어떻게 연결되는지 설명하기",
      "고분자 재료가 실제 설비나 안전성에 어떤 의미가 있는지 붙이기",
      "에너지공학 진로와 연결되는 이유를 마지막에 정리하기"
    ];
  }
  return [
    "핵심 개념을 먼저 2~3개 정리하기",
    "비교하거나 해석할 사례를 1~2개 고르기",
    "교과 개념으로 차이를 설명하기",
    "진로와 연결되는 이유를 마지막에 정리하기"
  ];
}

function deriveActionSteps(subject, career, keywords){
  const texts = [subject, career, ...keywords];
  if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) {
    return ["감염·면역 핵심 개념 정리", "개인 예방과 공공 보건 비교", "정책 사례 1개 연결하기"];
  }
  if (containsAny(texts, ["이차전지", "배터리", "전고체"])) {
    return ["비교할 배터리 2개 정하기", "안전성·효율 기준 세우기", "구조 차이를 성능과 연결하기"];
  }
  if (containsAny(texts, ["반도체"])) {
    return ["핵심 부품 1~2개 정리", "원리와 공정 연결", "실생활 기기 사례 붙이기"];
  }
  if (containsAny(texts, ["인공지능", "데이터", "AI"])) {
    return ["핵심 개념 정리", "활용 사례 1~2개 연결", "장점·한계 비교하기"];
  }
  if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) {
    return ["발전 원리 핵심 정리", "열역학 법칙과 효율 연결", "재료 의미를 사례와 연결하기"];
  }
  return ["핵심 개념 정리", "교과 단원 연결", "사례 비교 또는 자료 해석"];
}

function deriveReportFlow(subject, career, keywords){
  const texts = [subject, career, ...keywords];
  if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료", "WHO"])) {
    return [
      "감염 예방과 면역 반응의 의미를 짧게 정리한다.",
      "개인 건강관리와 공공 보건정책을 비교한다.",
      "정책 또는 사례 1개를 붙여 실제 적용 의미를 해석한다.",
      "보건의료 진로와 연결되는 이유를 정리한다."
    ];
  }
  if (containsAny(texts, ["이차전지", "배터리", "전고체"])) {
    return [
      "전지의 기본 작동 원리를 짧게 정리한다.",
      "비교할 배터리 종류를 2개 이상 정한다.",
      "안전성·효율 기준으로 차이를 분석한다.",
      "실제 활용 사례와 진로 연결 의미를 정리한다."
    ];
  }
  if (containsAny(texts, ["반도체"])) {
    return [
      "반도체가 어떤 역할을 하는지 짧게 정리한다.",
      "핵심 원리나 공정을 1~2개 골라 설명한다.",
      "부품·공정·활용 사례를 연결한다.",
      "전자·반도체 진로와의 연결 의미를 정리한다."
    ];
  }
  if (containsAny(texts, ["인공지능", "데이터", "AI"])) {
    return [
      "핵심 개념을 짧게 정리한다.",
      "활용 사례 1~2개를 고른다.",
      "장점과 한계를 같은 기준으로 비교한다.",
      "기술과 진로 연결 의미를 정리한다."
    ];
  }
  if (containsAny(texts, ["원자력", "원자력발전", "열역학", "고분자"])) {
    return [
      "원자력발전의 기본 원리를 짧게 정리한다.",
      "열역학 법칙이 실제 발전 효율과 어떻게 연결되는지 설명한다.",
      "고분자 재료가 실제 장치나 안전성과 어떻게 연결되는지 해석한다.",
      "에너지공학 진로와 연결되는 의미를 정리한다."
    ];
  }
  return [
    "핵심 개념을 정리한다.",
    "비교할 기준을 세운다.",
    "사례를 연결해 분석한다.",
    "결론을 정리한다."
  ];
}

function deriveBooks(career, keywords){
  const texts = [career, ...keywords];
  if (containsAny(texts, ["감염", "면역", "백신", "보건", "의료"])) {
    return ["의학은 몸을 어떻게 살리는가 (제임스 햄블린) - 건강 관리와 의료 의사결정 이해"];
  }
  if (containsAny(texts, ["이차전지", "배터리", "전고체"])) {
    return ["배터리 전쟁 (루카스 베드나르스키) - 산업 맥락과 기술 발전 흐름 이해"];
  }
  if (containsAny(texts, ["반도체"])) {
    return ["반도체 제국의 미래 - 반도체 산업과 기술 흐름 이해"];
  }
  if (containsAny(texts, ["인공지능", "데이터", "AI"])) {
    return ["AI 2041 - 인공지능 기술과 사회 변화 이해"];
  }
  if (containsAny(texts, ["원자력", "원자력발전", "열역학"])) {
    return ["에너지 전환과 미래 발전 기술 관련 교양 과학 도서 1권을 선택해 실제 사례와 연결해 보기"];
  }
  return ["교양 과학 도서 1권을 선택해 실제 사례와 연결해 보기"];
}

function renderStepList(steps){
  return (steps || []).slice(0,3).map((step,idx)=>`
    <div class="step-item">
      <div class="step-no">${idx+1}</div>
      <div>${escapeHtml(step)}</div>
    </div>
  `).join("");
}

function renderContentOutput(content){
  return `
    <div class="result-card content-output-card">
      <div class="content-headline-badge">이렇게 잡으면 더 직관적입니다</div>
      <h2>${escapeHtml(content.title)}</h2>

      <div class="content-one-pick">
        <div class="content-one-pick-label">추천 1순위 주제</div>
        <div class="content-one-pick-text">${escapeHtml(content.one_line_pick)}</div>
      </div>

      <p class="content-intro">${escapeHtml(content.intro)}</p>

      <div class="content-why-box">
        <b>왜 이 방향이 좋은가</b>
        <div>${escapeHtml(content.why_this_works)}</div>
      </div>

      <h3>주제 후보</h3>
      <ul>${(content.topic_options || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h3>교과서에서 직접 쓸 개념</h3>
      <div class="content-section-list">
        ${(content.subject_cards || []).map(item => `
          <div class="content-section-item">
            <div class="content-section-title">${escapeHtml(item.title)}</div>
            <div><b>관련 개념</b> : ${(item.concepts || []).map(escapeHtml).join(", ")}</div>
            <div><b>바로 쓸 포인트</b> : ${(item.points || []).map(escapeHtml).join(" / ")}</div>
          </div>
        `).join("")}
      </div>

      <h3>바로 쓸 탐구 포인트</h3>
      <ul>${(content.quick_points || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h3>보고서 흐름</h3>
      <ol>${(content.report_flow || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>

      <h3>추천 도서</h3>
      <ul>${(content.books || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderStudentView(payload){
  const content = buildLocalContent(payload);

  // keep only the useful top summary card
  hideBlock("finalMode");
  setText("finalReason", "");
  setText("finalTopic", content.one_line_pick);
  setText("topicSub", `${payload.subject} · ${payload.career} 기준으로 가장 읽기 쉬운 방향으로 다시 정리한 결과입니다.`);
  setHTML("actionSteps", renderStepList(content.steps));

  const root = ensureContentOutputSection();
  if (root) root.innerHTML = renderContentOutput(content);

  hideLegacySections();
  showBlock("resultSection", "grid");
}

async function handleGenerate(){
  clearError();
  clearResults();
  try{
    const payload = getFormValues();
    validateInput(payload);

    setLoading(true);

    // keep worker call for compatibility/logging, but render from local unified logic
    try { await callGenerateAPI(payload); } catch (e) { console.warn("generate api fallback:", e); }

    renderStudentView(payload);
    return true;
  }catch(error){
    console.error("handleGenerate error:", error);
    showError(error.message || "생성 중 오류가 발생했습니다.");
  }finally{
    setLoading(false);
  }
}

function handleReset(){
  ["schoolName","grade","subject","taskName","taskType","usagePurpose","taskDescription","career","keyword"].forEach(id=>{
    const el=$(id); if(el) el.value="";
  });
  clearError();
  clearResults();
}

document.addEventListener("DOMContentLoaded",()=>{
  $("generateBtn")?.addEventListener("click", handleGenerate);
  $("resetBtn")?.addEventListener("click", handleReset);
});
window.handleGenerate = handleGenerate;
window.handleReset = handleReset;
