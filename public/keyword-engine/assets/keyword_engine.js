window.__KEYWORD_ENGINE_VERSION = "admissions-v18-input-logging";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const EXTENSION_LIBRARY_URL = "seed/extension_library_v2.json";
const ASSESSMENT_REFERENCE_URL = "seed/reference/assessment_reference_seed.json";

function $(id){return document.getElementById(id);}
function escapeHtml(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");}
function toArray(value){return Array.isArray(value)?value:(value==null?[]:[value]);}
function normalizeText(value){return String(value??"").trim().toLowerCase().replace(/\s+/g,"");}
function createSessionId(){return `session_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;}

function getFormValues(){
  const schoolName=$("schoolName")?.value?.trim()||"";
  const grade=$("grade")?.value?.trim()||"";
  const subject=$("subject")?.value?.trim()||"";
  const taskName=$("taskName")?.value?.trim()||"";
  const taskType=$("taskType")?.value?.trim()||"";
  const usagePurpose=$("usagePurpose")?.value?.trim()||"";
  const taskDescription=$("taskDescription")?.value?.trim()||"";
  const career=$("career")?.value?.trim()||"";
  const keyword=$("keyword")?.value?.trim()||"";
  return {sessionId:createSessionId(),schoolName,grade,subject,taskName,taskType,usagePurpose,taskDescription,career,keyword,major:career,track:career,style:taskType,activityLevel:grade};
}
function validateInput(data){
  const required=[["schoolName","학교명"],["grade","학년"],["subject","과목"],["taskName","수행평가명"],["taskType","수행평가 형태"],["usagePurpose","사용 목적"],["career","희망 진로"],["keyword","키워드"]];
  for(const [key,label] of required){ if(!data[key]) throw new Error(`${label}을(를) 입력해 주세요.`); }
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
function clearError(){ const e=$("errorMessage"); if(e){e.innerHTML=""; e.style.display="none";} }
function clearResults(){
  ["finalMode","finalReason","finalTopic","topicSub","actionSteps","outputCard","reportFrameCard","doDontCard","inputSummaryCard","studentReport","reasonCard","stepsCard","flowCard","subjectLinksCard","warningsCard","assessmentReferenceCard","textbookSection","extensionLibrarySection"].forEach(id=>{const el=$(id); if(el) el.innerHTML="";});
  const resultWrap=$("resultSection"); if(resultWrap) resultWrap.style.display="none";
}
async function callGenerateAPI(payload){
  const response=await fetch(`${WORKER_BASE_URL}/generate`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      schoolName:payload.schoolName,grade:payload.grade,subject:payload.subject,taskName:payload.taskName,taskType:payload.taskType,
      usagePurpose:payload.usagePurpose,taskDescription:payload.taskDescription,career:payload.career,keyword:payload.keyword,
      track:payload.track,major:payload.major,style:payload.style,activityLevel:payload.activityLevel,sessionId:payload.sessionId
    })
  });
  const text=await response.text();
  let data;
  try{ data=JSON.parse(text); }catch{ throw new Error(`응답을 해석할 수 없습니다. (${response.status})`); }
  if(!response.ok||data.ok===false){ throw new Error(data?.data?.error?.message || data?.error || data?.message || `요청 처리 중 오류가 발생했습니다. (${response.status})`); }
  return data;
}
async function getTextbookMatches(payload){
  try{
    if(typeof window.matchTextbook!=="function") return [];
    const keywords=[payload.keyword,payload.subject,payload.career,payload.taskDescription,payload.taskName].filter(Boolean);
    const result=await window.matchTextbook({keywords,category:payload.subject,major:payload.career});
    return Array.isArray(result?.matches)?result.matches:[];
  }catch(error){ console.warn("textbook matcher error:",error); return []; }
}
async function loadAssessmentReferenceSeed(){
  const response=await fetch(ASSESSMENT_REFERENCE_URL,{cache:"no-store"});
  if(!response.ok) throw new Error("assessment_reference_seed.json을 불러오지 못했습니다.");
  return response.json();
}
function subjectKeyForReference(subject){
  const map={"공통국어":"공통국어1","공통영어":"공통영어1","수학":"공통수학1","과학탐구실험":"과학탐구실험1","통합과학":"통합과학1","통합사회":"통합사회1"};
  return map[subject]||subject;
}
async function getAssessmentReference(payload){
  try{
    const seed=await loadAssessmentReferenceSeed();
    return (seed?.grade_1_semester_1||{})[subjectKeyForReference(payload.subject)]||null;
  }catch(error){ console.warn("assessment reference error:",error); return null; }
}
async function loadExtensionLibrary(){
  const response=await fetch(EXTENSION_LIBRARY_URL,{cache:"no-store"});
  if(!response.ok) throw new Error("확장 활동 라이브러리를 불러오지 못했습니다.");
  return response.json();
}
function typeToMode(typeText=""){
  const t=normalizeText(typeText);
  if(t.includes("실험")) return "experiment";
  if(t.includes("데이터")||t.includes("시뮬")||t.includes("모델")) return "analysis";
  if(t.includes("제작")||t.includes("설계")) return "design";
  return "research";
}
function scoreExtensionTemplate(template,context){
  let score=0;
  const haystack=[context.keyword,context.subject,context.career,context.taskType,context.taskDescription,context.taskName,context.usagePurpose,...(context.subjectLinks||[]),...(context.textbookSubjects||[]),...(context.textbookTopics||[])].map(normalizeText).filter(Boolean);
  toArray(template.fit_conditions?.required_any_keywords).forEach(keyword=>{const k=normalizeText(keyword); if(haystack.some(item=>item.includes(k)||k.includes(item))) score+=8;});
  toArray(template.fit_conditions?.preferred_subjects).forEach(subject=>{const s=normalizeText(subject); if([context.subject,...(context.subjectLinks||[])].map(normalizeText).some(item=>item.includes(s)||s.includes(item))) score+=7;});
  toArray(template.fit_conditions?.preferred_methods).forEach(method=>{const m=normalizeText(method); if([context.taskType,context.taskDescription,context.taskName].map(normalizeText).some(item=>item.includes(m)||m.includes(item))) score+=5;});
  toArray(template.theme_tags).forEach(tag=>{const t=normalizeText(tag); if(haystack.some(item=>item.includes(t)||t.includes(item))) score+=3;});
  const mode=typeToMode(template.type);
  const bias=context.assessmentReference?.reality_bias||{};
  score+=Number(bias[mode]||0);
  const desc=normalizeText(context.taskDescription);
  if(desc.includes("실험어려움")||desc.includes("실험불가")||desc.includes("실험은어려움")){
    if(mode==="experiment") score-=5;
    if(mode==="research"||mode==="analysis") score+=3;
  }
  if(normalizeText(context.grade).includes("고1")){
    if(["이차전지","반도체","신소재"].some(k=>normalizeText(context.keyword).includes(normalizeText(k)))){
      if(mode==="experiment") score-=4;
      if(mode==="research"||mode==="analysis") score+=4;
    }
  }
  return score;
}
async function getExtensionLibraryMatches(payload,apiData,textbookMatches,assessmentReference){
  try{
    const library=await loadExtensionLibrary();
    const templates=Array.isArray(library?.templates)?library.templates:[];
    const context={keyword:payload.keyword,subject:payload.subject,career:payload.career,grade:payload.grade,taskType:payload.taskType,taskDescription:payload.taskDescription,taskName:payload.taskName,usagePurpose:payload.usagePurpose,subjectLinks:toArray(apiData?.result?.subjectLinks),textbookSubjects:textbookMatches.map(item=>item.subject).filter(Boolean),textbookTopics:textbookMatches.flatMap(item=>toArray(item.topic_seeds||item.topicSeeds)).filter(Boolean),assessmentReference};
    return templates.map(template=>({...template,_score:scoreExtensionTemplate(template,context),_mode:typeToMode(template.type)})).filter(template=>template._score>0).sort((a,b)=>b._score-a._score).slice(0,3);
  }catch(error){ console.warn("extension library error:",error); return []; }
}
function routeByPurposeAndContext(payload, assessmentReference){
  const purpose=payload.usagePurpose;
  const bias=assessmentReference?.reality_bias||{};
  const topMode=Object.entries(bias).sort((a,b)=>b[1]-a[1])[0]?.[0]||"research";
  let route="자료조사형 비교";
  if(purpose.includes("발표")) route="발표형 비교";
  else if(purpose.includes("생기부")) route="교과연계 확장";
  else if(purpose.includes("구조")) route="구조설계형";
  else if(purpose.includes("방향")) route="탐구방향 점검형";
  else if(topMode==="analysis") route="자료분석형 비교";
  else if(topMode==="design") route="설계형 아이디어";
  return route;
}
function generateVariableDesign(payload, assessmentReference, textbookMatches){
  const route=routeByPurposeAndContext(payload, assessmentReference);
  const subject=payload.subject, keyword=payload.keyword, career=payload.career, purpose=payload.usagePurpose;
  const focusPool={
    "통합과학":["구조 차이","성능 차이","안전성 비교","실생활 활용성"],
    "화학":["반응 원리","소재 특성","전지 구조 차이","효율 비교"],
    "정보":["데이터 수집 방식","시스템 적용","알고리즘 활용","센서 연계"],
    "통합사회":["사회적 영향","환경 문제","정책 비교","산업 구조"],
    "공통국어":["자료 해석","매체 표현","쟁점 비교","비판적 분석"],
    "공통영어":["핵심 내용 비교","사례 정리","설명 방식","자료 읽기"],
    "수학":["모델링","그래프 해석","변화 비교","수치 분석"]
  };
  const comparePool={
    "통합과학":["구조","성능","안전성","활용성"],
    "화학":["반응성","효율","안정성","소재 특성"],
    "정보":["정확도","속도","적용성","확장성"],
    "통합사회":["효과","한계","사회 영향","환경성"],
    "공통국어":["표현 방식","핵심 논지","자료 활용","설득력"],
    "공통영어":["핵심 내용","표현 특징","설명 방식","정보 전달"],
    "수학":["변수","그래프","증가·감소","활용성"]
  };
  const conceptPool=textbookMatches.flatMap(item=>toArray(item.core_concepts)).slice(0,6);
  const focusBase=focusPool[subject]||["핵심 차이","활용성","구조","분석"];
  const compareBase=comparePool[subject]||["특징","장점","한계","활용성"];
  const keywordHash=[...keyword].reduce((acc,ch)=>acc+ch.charCodeAt(0),0);
  const careerHash=[...career].reduce((acc,ch)=>acc+ch.charCodeAt(0),0);
  const seed=keywordHash+careerHash+(purpose.length*7);
  const focus=focusBase[seed % focusBase.length];
  const comparisonAxes=[compareBase[seed % compareBase.length],compareBase[(seed+1)%compareBase.length],compareBase[(seed+2)%compareBase.length]].filter((v,i,arr)=>arr.indexOf(v)===i);
  const coreConcepts=conceptPool.length?conceptPool.slice(0,3):[`${subject} 핵심 개념`,`${keyword} 관련 개념`];
  const conclusionDirection=purpose.includes("생기부")?`${career} 진로와 연결되는 교과 확장성으로 마무리`:purpose.includes("발표")?`비교 결과를 한 문장으로 정리해 발표하기`:`${career} 진로와 연결되는 실제 의미로 마무리`;
  return {route,focus:`${keyword}의 ${focus}을(를) 중심으로 보기`,comparison_axes:comparisonAxes,core_concepts:coreConcepts,conclusion_direction:conclusionDirection,workflow:["개념 정리","비교 기준 설정","자료 정리","결론 도출"]};
}
function buildStudentReport(payload, apiData, assessmentReference, variableDesign){
  const result=apiData.result||{};
  const topic=result.finalDecision?.topic||`${payload.keyword}를 ${payload.subject} 개념과 연결해 비교·분석하기`;
  const reason=result.reason||`${payload.subject} 과목에서 ${payload.keyword}를 다루면서 ${payload.career} 진로와 연결할 수 있는 방향으로 탐구를 설계했다.`;
  const warnings=toArray(result.warnings).slice(0,2);
  const reportFrame=toArray(result.reportFrame).length?toArray(result.reportFrame):["탐구 동기","교과 개념 정리","비교 또는 자료 분석","결론"];
  const axisText=variableDesign.comparison_axes.join(" / ");
  const conceptText=variableDesign.core_concepts.join(" / ");
  return `
    <h4>1. 주제</h4>
    <p>${escapeHtml(topic)}</p>
    <h4>2. 주제 선정 동기</h4>
    <p>${escapeHtml(payload.subject)} 과목의 개념을 바탕으로 ${escapeHtml(payload.career)} 진로와 연결되는 탐구를 하고자 했다. 특히 ${escapeHtml(payload.keyword)}는 실생활과 연관성이 높고 비교·분석이 가능해 수행평가 주제로 적합하다고 판단했다.</p>
    <h4>3. 탐구 방향</h4>
    <ul>
      <li>${escapeHtml(variableDesign.focus)}</li>
      <li>${escapeHtml(variableDesign.conclusion_direction)}</li>
    </ul>
    <h4>4. 비교 기준</h4>
    <p>${escapeHtml(axisText)}</p>
    <h4>5. 연결 교과 개념</h4>
    <p>${escapeHtml(conceptText)}</p>
    <h4>6. 보고서 작성 순서</h4>
    <ul>${reportFrame.map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>
    <h4>7. 결론 방향</h4>
    <p>${escapeHtml(reason)}</p>
    <h4>8. 작성할 때 주의할 점</h4>
    <ul>${warnings.map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>
  `;
}
function buildCopyText(){
  const report=$("studentReport");
  if(!report) return "";
  return report.innerText.replace(/\n{3,}/g,"\n\n").trim();
}
function renderStudentView(payload, apiData, textbookMatches, extensionMatches, assessmentReference){
  const result=apiData.result||{};
  const variableDesign=generateVariableDesign(payload, assessmentReference, textbookMatches);
  $("finalMode").textContent=variableDesign.route;
  $("finalReason").textContent=`${payload.schoolName} · ${payload.taskName} 기준으로 보면 ${variableDesign.route}이(가) 가장 자연스럽습니다.`;
  $("finalTopic").textContent=variableDesign.focus;
  $("topicSub").textContent=`이번 결과는 ${payload.subject} · ${payload.career} · ${payload.usagePurpose} 조합을 반영해 다르게 설계된 버전입니다.`;
  $("actionSteps").innerHTML=variableDesign.workflow.slice(0,3).map((step,idx)=>`<div class="step-item"><div class="step-no">${idx+1}</div><div>${escapeHtml(step)}</div></div>`).join("");
  const outputs=toArray(assessmentReference?.preferred_outputs).slice(0,2);
  $("outputCard").innerHTML=`<h3>제출물 형태</h3><div class="mini-block-list"><div class="mini-item"><b>우선 제출</b><div>${escapeHtml(outputs[0]||"비교표 + 보고서")}</div></div><div class="mini-item"><b>같이 넣으면 좋음</b><div>${escapeHtml(outputs[1]||"비교표")}</div></div></div>`;
  $("reportFrameCard").innerHTML=`<h3>설계 변수</h3><div class="frame-list"><div class="frame-item"><b>루트</b><div>${escapeHtml(variableDesign.route)}</div></div><div class="frame-item"><b>초점</b><div>${escapeHtml(variableDesign.focus)}</div></div><div class="frame-item"><b>비교 기준</b><div>${escapeHtml(variableDesign.comparison_axes.join(", "))}</div></div><div class="frame-item"><b>결론 방향</b><div>${escapeHtml(variableDesign.conclusion_direction)}</div></div></div>`;
  const doList=toArray(assessmentReference?.school_reality_hint).slice(0,2);
  const dontList=toArray(result.warnings).slice(0,2);
  $("doDontCard").innerHTML=`<h3>바로 체크</h3><div class="do-dont-wrap"><div class="do-box"><h4>이렇게 쓰면 됨</h4><ul>${(doList.length?doList:["비교 기준을 먼저 정하기","자료를 표로 정리하기"]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div><div class="dont-box"><h4>이건 피하기</h4><ul>${(dontList.length?dontList:["자료 없이 주장만 쓰기","주제를 너무 크게 잡기"]).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul></div></div>`;
  $("inputSummaryCard").innerHTML=`<h3>수집되는 입력 데이터</h3><div class="mini-block-list"><div class="mini-item"><b>학교 / 학년</b><div>${escapeHtml(payload.schoolName)} / ${escapeHtml(payload.grade)}</div></div><div class="mini-item"><b>과목 / 수행평가명</b><div>${escapeHtml(payload.subject)} / ${escapeHtml(payload.taskName)}</div></div><div class="mini-item"><b>형태 / 사용 목적</b><div>${escapeHtml(payload.taskType)} / ${escapeHtml(payload.usagePurpose)}</div></div><div class="mini-item"><b>진로 / 키워드</b><div>${escapeHtml(payload.career)} / ${escapeHtml(payload.keyword)}</div></div></div>`;
  $("studentReport").innerHTML=buildStudentReport(payload, apiData, assessmentReference, variableDesign);
  $("reasonCard").innerHTML=`<h3>추천 이유</h3><p>${escapeHtml(result.reason||"")}</p>`;
  $("stepsCard").innerHTML=`<h3>탐구 순서</h3><ul>${toArray(result.steps).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("flowCard").innerHTML=`<h3>설계 흐름</h3><ul>${toArray(result.flow).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("subjectLinksCard").innerHTML=`<h3>연결 교과</h3><ul>${variableDesign.core_concepts.map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("warningsCard").innerHTML=`<h3>주의할 점</h3><ul>${toArray(result.warnings).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("assessmentReferenceCard").innerHTML=assessmentReference?`<h3>수행평가 현실 참고</h3><p class="muted">reference_only 보정값</p><ul>${toArray(assessmentReference.school_reality_hint).map(v=>`<li>${escapeHtml(v)}</li>`).join("")}</ul>`:`<h3>수행평가 현실 참고</h3><p class="muted">참고 데이터가 없습니다.</p>`;
  if(textbookMatches.length){
    const item=textbookMatches[0];
    $("textbookSection").innerHTML=`<h3>교과 근거</h3><ul><li>${escapeHtml([item.subject,item.unit,item.subunit].filter(Boolean).join(" › "))}</li><li>${escapeHtml(toArray(item.core_concepts).slice(0,4).join(", "))}</li></ul>`;
  }else{
    $("textbookSection").innerHTML=`<h3>교과 근거</h3><p class="muted">매칭 결과가 없습니다.</p>`;
  }
  if(extensionMatches.length){
    $("extensionLibrarySection").innerHTML=`<h3>차선 템플릿</h3><ul>${extensionMatches.map((item,idx)=>`<li>${escapeHtml(`${idx+1}순위 · ${item.title||""}`)}</li>`).join("")}</ul>`;
  }else{
    $("extensionLibrarySection").innerHTML=`<h3>차선 템플릿</h3><p class="muted">추가 템플릿이 없습니다.</p>`;
  }
  window.__engineCollectionLog={session_id:payload.sessionId,timestamp:new Date().toISOString(),school_name:payload.schoolName,grade:payload.grade,subject:payload.subject,task_name:payload.taskName,task_type:payload.taskType,task_description:payload.taskDescription,career:payload.career,keyword:payload.keyword,usage_purpose:payload.usagePurpose,engine_output:variableDesign};
}
async function handleGenerate(){
  clearError(); clearResults();
  try{
    const payload=getFormValues();
    validateInput(payload);
    setLoading(true);
    const apiData=await callGenerateAPI(payload);
    const textbookMatches=await getTextbookMatches(payload);
    const assessmentReference=await getAssessmentReference(payload);
    const extensionMatches=await getExtensionLibraryMatches(payload,apiData,textbookMatches,assessmentReference);
    window.__lastGenerateDebug={version:window.__KEYWORD_ENGINE_VERSION,payload,apiData,textbookMatches,assessmentReference,extensionMatches};
    renderStudentView(payload, apiData, textbookMatches, extensionMatches, assessmentReference);
    $("resultSection").style.display="grid";
    return window.__lastGenerateDebug;
  }catch(error){
    console.error("handleGenerate error:",error);
    showError(error.message||"생성 중 오류가 발생했습니다.");
  }finally{
    setLoading(false);
  }
}
function handleReset(){
  ["schoolName","grade","subject","taskName","taskType","usagePurpose","taskDescription","career","keyword"].forEach(id=>{const el=$(id); if(el) el.value="";});
  clearError(); clearResults();
}
async function handleCopyReport(){
  const text=buildCopyText();
  if(!text) return;
  try{ await navigator.clipboard.writeText(text); alert("보고서를 복사했어요."); }
  catch{ alert("복사에 실패했어요. 직접 선택해서 복사해 주세요."); }
}
document.addEventListener("DOMContentLoaded",()=>{
  $("generateBtn")?.addEventListener("click",handleGenerate);
  $("resetBtn")?.addEventListener("click",handleReset);
  $("copyReportBtn")?.addEventListener("click",handleCopyReport);
});
window.handleGenerate=handleGenerate;
window.handleReset=handleReset;
