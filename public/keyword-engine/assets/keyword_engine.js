window.__KEYWORD_ENGINE_VERSION = "admissions-v16-conclusion-first";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const EXTENSION_LIBRARY_URL = "seed/extension_library_v2.json";
const ASSESSMENT_REFERENCE_URL = "seed/reference/assessment_reference_seed.json";

function $(id) { return document.getElementById(id); }
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function toArray(value) { return Array.isArray(value) ? value : (value == null ? [] : [value]); }
function normalizeText(value) { return String(value ?? "").trim().toLowerCase().replace(/\s+/g, ""); }

function getFormValues() {
  const subject = $("subject")?.value?.trim() || "";
  const taskType = $("taskType")?.value?.trim() || "";
  const taskDescription = $("taskDescription")?.value?.trim() || "";
  const career = $("career")?.value?.trim() || "";
  const keyword = $("keyword")?.value?.trim() || "";
  const grade = $("grade")?.value?.trim() || "";
  return { subject, taskType, taskDescription, career, keyword, grade, major: career, track: career, style: taskType, activityLevel: grade };
}
function validateInput(data) {
  const required = [["subject","과목"],["taskType","수행평가 형태"],["career","희망 진로"],["keyword","키워드"],["grade","학년"]];
  for (const [key, label] of required) if (!data[key]) throw new Error(`${label}을(를) 입력해 주세요.`);
}
function setLoading(isLoading) {
  const btn = $("generateBtn"), resetBtn = $("resetBtn"), loading = $("loadingMessage");
  if (btn) { btn.disabled = isLoading; btn.textContent = isLoading ? "생성 중..." : "탐구 설계 생성"; }
  if (resetBtn) resetBtn.disabled = isLoading;
  if (loading) loading.style.display = isLoading ? "block" : "none";
}
function showError(message) {
  const resultWrap = $("resultSection"), errorBox = $("errorMessage");
  if (errorBox) { errorBox.innerHTML = `<strong>오류</strong><br>${escapeHtml(message)}`; errorBox.style.display = "block"; }
  if (resultWrap) resultWrap.style.display = "none";
}
function clearError() {
  const errorBox = $("errorMessage");
  if (errorBox) { errorBox.innerHTML = ""; errorBox.style.display = "none"; }
}
function clearResults() {
  ["finalMode","finalReason","finalTopic","topicSub","actionSteps","outputCard","reportFrameCard","doDontCard","inputSummaryCard","reasonCard","stepsCard","flowCard","subjectLinksCard","warningsCard","assessmentReferenceCard","textbookSection","extensionLibrarySection"].forEach(id => {
    const el = $(id); if (el) el.innerHTML = "";
  });
  const resultWrap = $("resultSection"); if (resultWrap) resultWrap.style.display = "none";
}

async function callGenerateAPI(payload) {
  const response = await fetch(`${WORKER_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: payload.keyword,
      grade: payload.grade,
      track: payload.track,
      major: payload.major,
      style: payload.style,
      activityLevel: payload.activityLevel,
      subject: payload.subject,
      taskType: payload.taskType,
      taskDescription: payload.taskDescription,
      career: payload.career
    })
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`응답을 해석할 수 없습니다. (${response.status})`); }
  if (!response.ok || data.ok === false) {
    throw new Error(data?.data?.error?.message || data?.error || data?.message || `요청 처리 중 오류가 발생했습니다. (${response.status})`);
  }
  return data;
}

async function getTextbookMatches(payload) {
  try {
    if (typeof window.matchTextbook !== "function") return [];
    const keywords = [payload.keyword, payload.subject, payload.career, payload.taskDescription].filter(Boolean);
    const result = await window.matchTextbook({ keywords, category: payload.subject, major: payload.career });
    return Array.isArray(result?.matches) ? result.matches : [];
  } catch (error) {
    console.warn("textbook matcher error:", error);
    return [];
  }
}
async function loadAssessmentReferenceSeed() {
  const response = await fetch(ASSESSMENT_REFERENCE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("assessment_reference_seed.json을 불러오지 못했습니다.");
  return response.json();
}
function subjectKeyForReference(subject) {
  const map = { "공통국어": "공통국어1", "공통영어": "공통영어1", "수학": "공통수학1", "과학탐구실험": "과학탐구실험1", "통합과학": "통합과학1", "통합사회": "통합사회1" };
  return map[subject] || subject;
}
async function getAssessmentReference(payload) {
  try {
    const seed = await loadAssessmentReferenceSeed();
    return (seed?.grade_1_semester_1 || {})[subjectKeyForReference(payload.subject)] || null;
  } catch (error) {
    console.warn("assessment reference error:", error);
    return null;
  }
}
async function loadExtensionLibrary() {
  const response = await fetch(EXTENSION_LIBRARY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("확장 활동 라이브러리를 불러오지 못했습니다.");
  return response.json();
}
function typeToMode(typeText = "") {
  const t = normalizeText(typeText);
  if (t.includes("실험")) return "experiment";
  if (t.includes("데이터") || t.includes("시뮬") || t.includes("모델")) return "analysis";
  if (t.includes("제작") || t.includes("설계")) return "design";
  return "research";
}
function scoreExtensionTemplate(template, context) {
  let score = 0;
  const haystack = [context.keyword, context.subject, context.career, context.taskType, context.taskDescription, ...(context.subjectLinks || []), ...(context.textbookSubjects || []), ...(context.textbookTopics || [])].map(normalizeText).filter(Boolean);

  toArray(template.fit_conditions?.required_any_keywords).forEach(keyword => {
    const k = normalizeText(keyword);
    if (haystack.some(item => item.includes(k) || k.includes(item))) score += 8;
  });
  toArray(template.fit_conditions?.preferred_subjects).forEach(subject => {
    const s = normalizeText(subject);
    if ([context.subject, ...(context.subjectLinks || [])].map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 7;
  });
  toArray(template.fit_conditions?.preferred_methods).forEach(method => {
    const m = normalizeText(method);
    if ([context.taskType, context.taskDescription].map(normalizeText).some(item => item.includes(m) || m.includes(item))) score += 5;
  });
  toArray(template.theme_tags).forEach(tag => {
    const t = normalizeText(tag);
    if (haystack.some(item => item.includes(t) || t.includes(item))) score += 3;
  });

  const mode = typeToMode(template.type);
  const bias = context.assessmentReference?.reality_bias || {};
  score += Number(bias[mode] || 0);

  const desc = normalizeText(context.taskDescription);
  if (desc.includes("실험어려움") || desc.includes("실험불가") || desc.includes("실험은어려움")) {
    if (mode === "experiment") score -= 5;
    if (mode === "research" || mode === "analysis") score += 3;
  }
  if (normalizeText(context.grade).includes("고1")) {
    if (["이차전지","반도체","신소재"].some(k => normalizeText(context.keyword).includes(normalizeText(k)))) {
      if (mode === "experiment") score -= 4;
      if (mode === "research" || mode === "analysis") score += 4;
    }
  }
  return score;
}
async function getExtensionLibraryMatches(payload, apiData, textbookMatches, assessmentReference) {
  try {
    const library = await loadExtensionLibrary();
    const templates = Array.isArray(library?.templates) ? library.templates : [];
    const context = {
      keyword: payload.keyword, subject: payload.subject, career: payload.career, grade: payload.grade,
      taskType: payload.taskType, taskDescription: payload.taskDescription,
      subjectLinks: toArray(apiData?.result?.subjectLinks),
      textbookSubjects: textbookMatches.map(item => item.subject).filter(Boolean),
      textbookTopics: textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).filter(Boolean),
      assessmentReference
    };
    return templates
      .map(template => ({ ...template, _score: scoreExtensionTemplate(template, context), _mode: typeToMode(template.type) }))
      .filter(template => template._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 3);
  } catch (error) {
    console.warn("extension library error:", error);
    return [];
  }
}

function defaultFinalDecision(payload, assessmentReference) {
  const bias = assessmentReference?.reality_bias || {};
  const topMode = Object.entries(bias).sort((a,b) => b[1]-a[1])[0]?.[0] || "research";
  const modeMap = {
    research: "자료조사형 비교 보고서",
    analysis: "자료분석형 비교 보고서",
    design: "설계형 아이디어 보고서",
    experiment: "실험형 비교 보고서"
  };
  return {
    mode: modeMap[topMode] || "자료조사형 비교 보고서",
    topic: `${payload.keyword}를 ${payload.subject} 개념과 연결해 비교·분석하기`,
    action: [
      "비교 대상 2개 정하기",
      "비교 기준 3개 정하기",
      "보고서 틀에 맞춰 정리하기"
    ]
  };
}

function renderConclusion(payload, apiData, assessmentReference) {
  const result = apiData.result || {};
  const finalDecision = result.finalDecision || defaultFinalDecision(payload, assessmentReference);

  $("finalMode").textContent = finalDecision.mode || "자료조사형 비교 보고서";
  $("finalReason").textContent = result.reason || `${payload.subject}와 ${payload.taskType}에 가장 맞는 방식으로 정리했습니다.`;
  $("finalTopic").textContent = finalDecision.topic || `${payload.keyword} 관련 비교 주제`;
  $("topicSub").textContent = `이번 수행에서는 이 주제 1개로 먼저 가는 것이 가장 안전합니다.`;

  const actions = toArray(finalDecision.action).slice(0,3);
  $("actionSteps").innerHTML = actions.map((step, idx) => `
    <div class="step-item">
      <div class="step-no">${idx+1}</div>
      <div>${escapeHtml(step)}</div>
    </div>
  `).join("");
}

function renderQuickCards(payload, apiData, textbookMatches, extensionMatches, assessmentReference) {
  const result = apiData.result || {};
  const finalDecision = result.finalDecision || defaultFinalDecision(payload, assessmentReference);

  const outputs = toArray(assessmentReference?.preferred_outputs).slice(0,2);
  $("outputCard").innerHTML = `
    <h3>제출물 형태</h3>
    <div class="mini-block-list">
      <div class="mini-item"><b>우선 제출</b><div>${escapeHtml(outputs[0] || "비교표 + 보고서")}</div></div>
      <div class="mini-item"><b>함께 넣으면 좋음</b><div>${escapeHtml(outputs[1] || "비교표")}</div></div>
    </div>
  `;

  const reportFrame = toArray(result.reportFrame).length ? toArray(result.reportFrame) : ["탐구 동기","교과 개념 정리","비교 또는 자료 분석","결론"];
  $("reportFrameCard").innerHTML = `
    <h3>보고서 틀</h3>
    <div class="frame-list">
      ${reportFrame.slice(0,4).map((item, idx) => `<div class="frame-item"><b>${idx+1}</b><div>${escapeHtml(item)}</div></div>`).join("")}
    </div>
  `;

  const doList = toArray(assessmentReference?.school_reality_hint).slice(0,2);
  const dontList = toArray(result.warnings).slice(0,2);
  $("doDontCard").innerHTML = `
    <h3>바로 체크</h3>
    <div class="do-dont-wrap">
      <div class="do-box">
        <h4>이렇게 하면 됨</h4>
        <ul>${(doList.length ? doList : ["비교 기준을 먼저 정하기","자료를 표로 정리하기"]).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
      </div>
      <div class="dont-box">
        <h4>이건 피하기</h4>
        <ul>${(dontList.length ? dontList : ["자료 없이 주장만 쓰기","주제를 너무 크게 잡기"]).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
      </div>
    </div>
  `;

  $("inputSummaryCard").innerHTML = `
    <h3>이번 입력</h3>
    <div class="mini-block-list">
      <div class="mini-item"><b>과목</b><div>${escapeHtml(payload.subject)}</div></div>
      <div class="mini-item"><b>수행 형태</b><div>${escapeHtml(payload.taskType)}</div></div>
      <div class="mini-item"><b>진로</b><div>${escapeHtml(payload.career)}</div></div>
      <div class="mini-item"><b>키워드 / 학년</b><div>${escapeHtml(payload.keyword)} / ${escapeHtml(payload.grade)}</div></div>
    </div>
  `;
}

function renderDetailCards(payload, apiData, textbookMatches, extensionMatches, assessmentReference) {
  const result = apiData.result || {};

  $("reasonCard").innerHTML = `<h3>추천 이유</h3><p>${escapeHtml(result.reason || "")}</p>`;
  $("stepsCard").innerHTML = `<h3>탐구 순서</h3><ul>${toArray(result.steps).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("flowCard").innerHTML = `<h3>설계 흐름</h3><ul>${toArray(result.flow).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("subjectLinksCard").innerHTML = `<h3>연결 교과</h3><ul>${toArray(result.subjectLinks).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("warningsCard").innerHTML = `<h3>주의할 점</h3><ul>${toArray(result.warnings).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;

  $("assessmentReferenceCard").innerHTML = assessmentReference ? `
    <h3>수행평가 현실 참고</h3>
    <p class="muted">reference_only 보정값</p>
    <ul>${toArray(assessmentReference.school_reality_hint).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
  ` : `<h3>수행평가 현실 참고</h3><p class="muted">참고 데이터가 없습니다.</p>`;

  if (textbookMatches.length) {
    const item = textbookMatches[0];
    $("textbookSection").innerHTML = `
      <h3>교과 근거</h3>
      <ul>
        <li>${escapeHtml([item.subject, item.unit, item.subunit].filter(Boolean).join(" › "))}</li>
        <li>${escapeHtml(toArray(item.core_concepts).slice(0,4).join(", "))}</li>
      </ul>
    `;
  } else {
    $("textbookSection").innerHTML = `<h3>교과 근거</h3><p class="muted">매칭 결과가 없습니다.</p>`;
  }

  if (extensionMatches.length) {
    $("extensionLibrarySection").innerHTML = `
      <h3>차선 템플릿</h3>
      <ul>${extensionMatches.map((item, idx) => `<li>${escapeHtml(`${idx+1}순위 · ${item.title || ""}`)}</li>`).join("")}</ul>
    `;
  } else {
    $("extensionLibrarySection").innerHTML = `<h3>차선 템플릿</h3><p class="muted">추가 템플릿이 없습니다.</p>`;
  }
}

async function handleGenerate() {
  clearError(); clearResults();
  try {
    const payload = getFormValues();
    validateInput(payload);
    setLoading(true);

    const apiData = await callGenerateAPI(payload);
    const textbookMatches = await getTextbookMatches(payload);
    const assessmentReference = await getAssessmentReference(payload);
    const extensionMatches = await getExtensionLibraryMatches(payload, apiData, textbookMatches, assessmentReference);

    window.__lastGenerateDebug = {
      version: window.__KEYWORD_ENGINE_VERSION,
      payload, apiData, textbookMatches, assessmentReference, extensionMatches
    };

    renderConclusion(payload, apiData, assessmentReference);
    renderQuickCards(payload, apiData, textbookMatches, extensionMatches, assessmentReference);
    renderDetailCards(payload, apiData, textbookMatches, extensionMatches, assessmentReference);

    $("resultSection").style.display = "grid";
    return window.__lastGenerateDebug;
  } catch (error) {
    console.error("handleGenerate error:", error);
    showError(error.message || "생성 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}

function handleReset() {
  ["subject","taskType","taskDescription","career","keyword","grade"].forEach(id => {
    const el = $(id); if (el) el.value = "";
  });
  clearError(); clearResults();
}

document.addEventListener("DOMContentLoaded", () => {
  $("generateBtn")?.addEventListener("click", handleGenerate);
  $("resetBtn")?.addEventListener("click", handleReset);
});
window.handleGenerate = handleGenerate;
window.handleReset = handleReset;
