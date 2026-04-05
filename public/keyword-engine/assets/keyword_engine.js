
window.__KEYWORD_ENGINE_VERSION = "admissions-v32-null-safe";
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
  if(el) el.textContent = value ?? "";
}
function setHTML(id, value){
  const el = $(id);
  if(el) el.innerHTML = value ?? "";
}
function showBlock(id, displayValue="block"){
  const el = $(id);
  if(el) el.style.display = displayValue;
}
function hideBlock(id){
  const el = $(id);
  if(el) el.style.display = "none";
}
function ensureContentOutputSection(){
  let el = $("contentOutputSection");
  if(el) return el;

  const resultSection = $("resultSection");
  if(resultSection){
    el = document.createElement("div");
    el.id = "contentOutputSection";
    resultSection.appendChild(el);
    return el;
  }
  return null;
}
function clearIfExists(ids){
  ids.forEach(id => {
    const el = $(id);
    if(el) el.innerHTML = "";
  });
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

function clearResults(){
  clearIfExists([
    "finalMode","finalReason","finalTopic","topicSub","actionSteps",
    "outputCard","reportFrameCard","doDontCard","inputSummaryCard",
    "studentReport","reasonCard","stepsCard","flowCard","subjectLinksCard",
    "warningsCard","assessmentReferenceCard","textbookSection","extensionLibrarySection",
    "contentOutputSection"
  ]);
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

function renderStepList(steps){
  return (steps || []).slice(0,3).map((step,idx)=>`
    <div class="step-item">
      <div class="step-no">${idx+1}</div>
      <div>${escapeHtml(step)}</div>
    </div>
  `).join("");
}

function renderContentOutput(content, selectionOptions){
  if(!content) return "";

  const subjectConnection = Array.isArray(content.subject_connection) ? content.subject_connection : [];
  const researchPoints = Array.isArray(content.research_points) ? content.research_points : [];
  const deepening = Array.isArray(content.deepening) ? content.deepening : [];
  const reportFlow = Array.isArray(content.report_flow) ? content.report_flow : [];
  const topicOptions = Array.isArray(content.topic_options) ? content.topic_options : [];
  const books = Array.isArray(content.recommended_books) ? content.recommended_books : [];

  const buttonGroup = (typeof window.renderMajorSelectorButtonGroup === "function")
    ? window.renderMajorSelectorButtonGroup(selectionOptions)
    : "";

  const personalGuide = (typeof window.renderMajorSelectorGuide === "function")
    ? window.renderMajorSelectorGuide(selectionOptions)
    : "";

  return `
    <div class="result-card content-output-card">
      <div class="content-headline-badge">이렇게 잡으면 더 직관적입니다</div>
      <h2>${escapeHtml(content.title || "콘텐츠형 탐구 결과")}</h2>
      <div class="content-one-pick">
        <div class="content-one-pick-label">추천 1순위 주제</div>
        <div class="content-one-pick-text">${escapeHtml(content.one_line_pick || "")}</div>
      </div>
      <p class="content-intro">${escapeHtml(content.intro || "")}</p>

      <div class="content-why-box">
        <b>왜 이 방향이 좋은가</b>
        <div>${escapeHtml(content.why_this_works || "")}</div>
      </div>

      <h3>주제 후보</h3>
      <ul>${topicOptions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h3>교과서에서 직접 쓸 개념</h3>
      <div class="content-section-list">
        ${subjectConnection.map(item => `
          <div class="content-section-item">
            <div class="content-section-title">${escapeHtml(item.section_title || "")}</div>
            <div><b>관련 개념</b> : ${(item.concepts || []).map(escapeHtml).join(", ")}</div>
            <div><b>바로 쓸 포인트</b> : ${(item.points || []).map(escapeHtml).join(" / ")}</div>
          </div>
        `).join("")}
      </div>

      <h3>바로 쓸 탐구 포인트</h3>
      <ul>${researchPoints.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h3>보고서 흐름</h3>
      <ol>${reportFlow.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>

      <h3>심화 방향</h3>
      <ul>${deepening.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h3>추천 도서</h3>
      <ul>${books.map(book => `<li>${escapeHtml(book.title || "")} (${escapeHtml(book.author || "")})${book.use_for ? ` - ${escapeHtml(book.use_for)}` : ""}</li>`).join("")}</ul>

      ${buttonGroup}
      ${personalGuide}
    </div>
  `;
}

function renderStudentView(payload, apiData){
  const engine = apiData.engine_output || {};

  setText("finalMode", engine.route || "탐구 추천");
  setText("finalReason", `${payload.schoolName} · ${payload.taskName} 기준으로 보면 이 방향이 가장 자연스럽습니다.`);
  setText("finalTopic", engine.focus || `${payload.keyword}의 핵심 개념과 실제 적용`);
  setText("topicSub", `${payload.subject} · ${payload.career} 기준으로 구성된 결과입니다.`);
  setHTML("actionSteps", renderStepList(engine.workflow || []));

  const root = ensureContentOutputSection();
  if(root){
    window.__currentContentRoot = root;
    window.__currentContentData = apiData.content || {};
    window.__currentSelectionOptions = apiData.selection_options || {};
    root.innerHTML = renderContentOutput(window.__currentContentData, window.__currentSelectionOptions);
  }

  showBlock("resultSection", "grid");
}

async function handleGenerate(){
  clearError();
  clearResults();
  try{
    const payload = getFormValues();
    validateInput(payload);
    setLoading(true);
    const apiData = await callGenerateAPI(payload);
    renderStudentView(payload, apiData);
    return apiData;
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
