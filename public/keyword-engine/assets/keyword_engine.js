
window.__KEYWORD_ENGINE_VERSION = "admissions-v29-button-personalized";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";

function $(id){return document.getElementById(id);}
function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function createSessionId(){return `session_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;}

const selectionState = {
  direction: "",
  compareTargets: [],
  compareAxes: [],
  emphasis: ""
};

function resetSelectionState(){
  selectionState.direction = "";
  selectionState.compareTargets = [];
  selectionState.compareAxes = [];
  selectionState.emphasis = "";
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
  const resultWrap=$("resultSection"), errorBox=$("errorMessage");
  if(errorBox){ errorBox.innerHTML=`<strong>오류</strong><br>${escapeHtml(message)}`; errorBox.style.display="block"; }
  if(resultWrap) resultWrap.style.display="none";
}
function clearError(){ const e=$("errorMessage"); if(e){ e.innerHTML=""; e.style.display="none"; } }

function clearResults(){
  ["finalMode","finalReason","finalTopic","topicSub","actionSteps","outputCard","reportFrameCard","doDontCard","inputSummaryCard","studentReport","reasonCard","stepsCard","flowCard","subjectLinksCard","warningsCard","assessmentReferenceCard","textbookSection","extensionLibrarySection","contentOutputSection"].forEach(id=>{
    const el=$(id); if(el) el.innerHTML="";
  });
  resetSelectionState();
  const resultWrap=$("resultSection"); if(resultWrap) resultWrap.style.display="none";
}

async function callGenerateAPI(payload){
  const response=await fetch(`${WORKER_BASE_URL}/generate`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const text=await response.text();
  let data;
  try{ data=JSON.parse(text); }catch{ throw new Error(`응답을 해석할 수 없습니다. (${response.status})`); }
  if(!response.ok||data.ok===false){
    throw new Error(data?.error || data?.message || `요청 처리 중 오류가 발생했습니다. (${response.status})`);
  }
  return data;
}

function toggleSingle(key, value){
  selectionState[key] = selectionState[key] === value ? "" : value;
  refreshSelectionUI();
}

function toggleMulti(key, value, maxCount){
  const arr = selectionState[key];
  const exists = arr.includes(value);
  if (exists) {
    selectionState[key] = arr.filter(v => v !== value);
  } else {
    if (arr.length >= maxCount) return;
    selectionState[key] = [...arr, value];
  }
  refreshSelectionUI();
}

function buttonClass(active){
  return active ? "pick-btn active" : "pick-btn";
}

function renderButtonGroup(title, values, key, mode, maxCount=1){
  const items = (values || []).map(value => {
    const active = mode === "single"
      ? selectionState[key] === value
      : selectionState[key].includes(value);

    const handler = mode === "single"
      ? `toggleSingle('${key}', '${escapeForAttr(value)}')`
      : `toggleMulti('${key}', '${escapeForAttr(value)}', ${maxCount})`;

    return `<button type="button" class="${buttonClass(active)}" onclick="${handler}">${escapeHtml(value)}</button>`;
  }).join("");

  const guide = mode === "multi" ? `<div class="pick-guide">최대 ${maxCount}개 선택</div>` : `<div class="pick-guide">1개 선택</div>`;

  return `
    <div class="pick-block">
      <div class="pick-head">
        <h4>${escapeHtml(title)}</h4>
        ${guide}
      </div>
      <div class="pick-buttons">${items}</div>
    </div>
  `;
}

function escapeForAttr(value){
  return String(value).replace(/'/g, "\'");
}

function buildPersonalGuide(options){
  const direction = selectionState.direction || "탐구 방향을 먼저 정하기";
  const targets = selectionState.compareTargets.length ? selectionState.compareTargets.join(", ") : "비교 대상 2개 선택";
  const axes = selectionState.compareAxes.length ? selectionState.compareAxes.join(", ") : "비교 기준 3개 선택";
  const emphasis = selectionState.emphasis || "강조 포인트 1개 선택";

  const introStarter = (options.intro_starters || [])[0] || "이번 주제를 선택한 이유는";
  const bodyStarter = (options.body_starters || [])[0] || "먼저 핵심 개념을 보면";
  const conclusionStarter = (options.conclusion_starters || [])[0] || "이번 탐구를 통해";

  return `
    <div class="personal-guide-card">
      <div class="content-headline-badge">학생마다 다르게 쓰게 만드는 개인화 설계</div>
      <h3>내 선택 결과</h3>
      <div class="personal-summary">
        <div><b>탐구 방향</b> : ${escapeHtml(direction)}</div>
        <div><b>비교 대상</b> : ${escapeHtml(targets)}</div>
        <div><b>비교 기준</b> : ${escapeHtml(axes)}</div>
        <div><b>강조 포인트</b> : ${escapeHtml(emphasis)}</div>
      </div>

      <h3>보고서 작성 가이드</h3>
      <div class="guide-section">
        <h4>도입</h4>
        <ul>
          <li>왜 이 주제를 선택했는지 2~3문장으로 정리하기</li>
          <li>실생활 사례 또는 뉴스 1개 포함하기</li>
          <li>내 진로와 왜 연결되는지 한 문장 넣기</li>
        </ul>
        <div class="starter-box"><b>문장 시작 예시</b> : ${escapeHtml(introStarter)} ...</div>
      </div>

      <div class="guide-section">
        <h4>본문</h4>
        <ul>
          <li>${escapeHtml(targets)}를 중심으로 비교하기</li>
          <li>${escapeHtml(axes)} 기준에서 차이가 나는 이유 설명하기</li>
          <li>교과 개념을 최소 1~2개 연결하기</li>
        </ul>
        <div class="starter-box"><b>문장 시작 예시</b> : ${escapeHtml(bodyStarter)} ...</div>
      </div>

      <div class="guide-section">
        <h4>결론</h4>
        <ul>
          <li>가장 중요하다고 본 기준 1개 정리하기</li>
          <li>탐구 후 바뀐 생각이나 배운 점 쓰기</li>
          <li>${escapeHtml(emphasis)} 관점으로 마무리하기</li>
        </ul>
        <div class="starter-box"><b>문장 시작 예시</b> : ${escapeHtml(conclusionStarter)} ...</div>
      </div>
    </div>
  `;
}

function renderContentOutput(content, selectionOptions){
  if(!content) return "";
  const subjectConnection = Array.isArray(content.subject_connection) ? content.subject_connection : [];
  const researchPoints = Array.isArray(content.research_points) ? content.research_points : [];
  const deepening = Array.isArray(content.deepening) ? content.deepening : [];
  const reportFlow = Array.isArray(content.report_flow) ? content.report_flow : [];
  const topicOptions = Array.isArray(content.topic_options) ? content.topic_options : [];
  const books = Array.isArray(content.recommended_books) ? content.recommended_books : [];

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

      <h3>교과 연결</h3>
      <div class="content-section-list">
        ${subjectConnection.map(item => `
          <div class="content-section-item">
            <div class="content-section-title">${escapeHtml(item.section_title || "")}</div>
            <div><b>관련 개념</b> : ${(item.concepts || []).map(escapeHtml).join(", ")}</div>
            <div><b>탐구 포인트</b> : ${(item.points || []).map(escapeHtml).join(" / ")}</div>
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

      <div class="pick-layout">
        ${renderButtonGroup("1. 탐구 방향 선택", selectionOptions.direction_buttons || [], "direction", "single")}
        ${renderButtonGroup("2. 비교 대상 선택", selectionOptions.compare_target_buttons || [], "compareTargets", "multi", 2)}
        ${renderButtonGroup("3. 비교 기준 선택", selectionOptions.compare_axis_buttons || [], "compareAxes", "multi", 3)}
        ${renderButtonGroup("4. 강조 포인트 선택", selectionOptions.emphasis_buttons || [], "emphasis", "single")}
      </div>

      <div id="personalGuideSection">
        ${buildPersonalGuide(selectionOptions)}
      </div>
    </div>
  `;
}

function refreshSelectionUI(){
  const root = window.__currentContentRoot;
  if(!root) return;
  root.innerHTML = renderContentOutput(window.__currentContentData, window.__currentSelectionOptions);
}

function renderStudentView(payload, apiData){
  const engine = apiData.engine_output || {};
  $("finalMode").textContent = engine.route || "탐구 추천";
  $("finalReason").textContent = `${payload.schoolName} · ${payload.taskName} 기준으로 보면 이 방향이 가장 자연스럽습니다.`;
  $("finalTopic").textContent = engine.focus || `${payload.keyword}의 핵심 개념과 실제 적용`;
  $("topicSub").textContent = `${payload.subject} · ${payload.career} 기준으로 구성된 결과입니다.`;
  $("actionSteps").innerHTML = (engine.workflow || []).slice(0,3).map((step,idx)=>`<div class="step-item"><div class="step-no">${idx+1}</div><div>${escapeHtml(step)}</div></div>`).join("");

  const root = $("contentOutputSection");
  window.__currentContentRoot = root;
  window.__currentContentData = apiData.content || {};
  window.__currentSelectionOptions = apiData.selection_options || {};
  root.innerHTML = renderContentOutput(window.__currentContentData, window.__currentSelectionOptions);

  $("resultSection").style.display = "grid";
}

async function handleGenerate(){
  clearError(); clearResults();
  try{
    const payload=getFormValues();
    validateInput(payload);
    setLoading(true);
    const apiData=await callGenerateAPI(payload);
    renderStudentView(payload, apiData);
    return apiData;
  }catch(error){
    showError(error.message||"생성 중 오류가 발생했습니다.");
  }finally{
    setLoading(false);
  }
}

function handleReset(){
  ["schoolName","grade","subject","taskName","taskType","usagePurpose","taskDescription","career","keyword"].forEach(id=>{
    const el=$(id); if(el) el.value="";
  });
  clearError(); clearResults();
}

document.addEventListener("DOMContentLoaded",()=>{
  $("generateBtn")?.addEventListener("click",handleGenerate);
  $("resetBtn")?.addEventListener("click",handleReset);
});

window.handleGenerate=handleGenerate;
window.handleReset=handleReset;
window.toggleSingle=toggleSingle;
window.toggleMulti=toggleMulti;
