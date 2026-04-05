
window.__KEYWORD_ENGINE_VERSION = "admissions-v23-structured-output";
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
    track:$("career")?.value?.trim()||"",
    style:$("taskType")?.value?.trim()||"",
    activityLevel:$("grade")?.value?.trim()||""
  };
}

function validateInput(data){
  const required=[
    ["schoolName","학교명"],["grade","학년"],["subject","과목"],["taskName","수행평가명"],
    ["taskType","수행평가 형태"],["usagePurpose","사용 목적"],["career","희망 진로"],["keyword","키워드"]
  ];
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
  ["resultSection","coreReasonSection","researchFlowSection","assessmentFitSection","extensionSection","actionGuideSection"]
    .forEach(id=>{ const el=$(id); if(el) el.innerHTML=""; });
  if($("resultSection")) $("resultSection").style.display="none";
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

async function sendCollectionLog(log) {
  try {
    const response = await fetch(`${WORKER_BASE_URL}/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log)
    });
    const data = await response.json().catch(() => ({}));
    window.__collectResponse = data;
    return data;
  } catch (error) {
    window.__collectResponse = { ok: false, error: String(error.message || error) };
    return window.__collectResponse;
  }
}

function renderList(title, items){
  const list=(items||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("");
  return `<div class="result-card"><h3>${escapeHtml(title)}</h3><ul>${list}</ul></div>`;
}

function renderStudentOutput(payload, apiData){
  const student = apiData.student_output || {};
  const engine = apiData.engine_output || {};

  const core = student.core_reason || {};
  const flow = student.research_flow || {};
  const fit = student.assessment_fit || {};
  const extension = student.extension || {};
  const action = student.action_guide || {};

  $("coreReasonSection").innerHTML = `
    <div class="result-card">
      <h2>핵심 추천</h2>
      <p><b>${escapeHtml(core.headline || "")}</b></p>
      <p>${escapeHtml(core.summary || "")}</p>
      <div class="mini-block"><b>추천 주제</b><div>${escapeHtml(core.topic || "")}</div></div>
      <div class="mini-block"><b>주제 후보</b><ul>${(core.topic_candidates||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div>
    </div>
  `;

  $("researchFlowSection").innerHTML = `
    <div class="result-card">
      <h2>탐구 구조</h2>
      <div class="mini-block"><b>실행 순서</b><ol>${(flow.steps||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ol></div>
      <div class="mini-block"><b>비교 기준</b><div>${(flow.comparison_axes||[]).map(escapeHtml).join(" / ")}</div></div>
      <div class="mini-block"><b>핵심 개념</b><div>${(flow.core_concepts||[]).map(escapeHtml).join(" / ")}</div></div>
      <div class="mini-block"><b>엔진 루트</b><div>${escapeHtml(engine.route || "")}</div></div>
    </div>
  `;

  $("assessmentFitSection").innerHTML = `
    <div class="result-card">
      <h2>수행평가 적합성</h2>
      <p>${escapeHtml(fit.fit_summary || "")}</p>
      <div class="mini-block"><b>추천 결과물</b><div>${(fit.preferred_outputs||[]).map(escapeHtml).join(" + ")}</div></div>
      <div class="mini-block"><b>학교 현실 참고</b><ul>${(fit.school_reality_hint||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div>
    </div>
  `;

  $("extensionSection").innerHTML = `
    <div class="result-card">
      <h2>확장 방향</h2>
      <ul>${(extension.ideas||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>
      <div class="mini-block"><b>결론 방향</b><div>${escapeHtml(extension.conclusion_direction || "")}</div></div>
    </div>
  `;

  $("actionGuideSection").innerHTML = `
    <div class="result-card">
      <h2>실행 가이드</h2>
      <div class="mini-block"><b>작성 포인트</b><ul>${(action.writing_points||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div>
      <div class="mini-block"><b>반드시 포함</b><ul>${(action.must_include||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div>
      <div class="mini-block"><b>피해야 할 점</b><ul>${(action.avoid||[]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div>
    </div>
  `;

  if($("resultSection")) $("resultSection").style.display="grid";

  window.__engineCollectionLog = {
    session_id: payload.sessionId,
    timestamp: new Date().toISOString(),
    school_name: payload.schoolName,
    grade: payload.grade,
    subject: payload.subject,
    task_name: payload.taskName,
    task_type: payload.taskType,
    task_description: payload.taskDescription,
    career: payload.career,
    keyword: payload.keyword,
    usage_purpose: payload.usagePurpose,
    engine_output: apiData.engine_output || {},
    student_output: apiData.student_output || {}
  };
}

async function handleGenerate(){
  clearError(); clearResults();
  try{
    const payload=getFormValues();
    validateInput(payload);
    setLoading(true);
    const apiData=await callGenerateAPI(payload);
    window.__lastGenerateDebug={version:window.__KEYWORD_ENGINE_VERSION,payload,apiData};
    renderStudentOutput(payload, apiData);
    await sendCollectionLog(window.__engineCollectionLog);
    return window.__lastGenerateDebug;
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
