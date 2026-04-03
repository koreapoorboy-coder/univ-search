window.__KEYWORD_ENGINE_VERSION = "admissions-v15-visual-ui";
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
  return {
    subject, taskType, taskDescription, career, keyword, grade,
    major: career, track: career, style: taskType, activityLevel: grade
  };
}

function validateInput(data) {
  const required = [
    ["subject", "과목"],
    ["taskType", "수행평가 형태"],
    ["career", "희망 진로"],
    ["keyword", "키워드"],
    ["grade", "학년"]
  ];
  for (const [key, label] of required) {
    if (!data[key]) throw new Error(`${label}을(를) 입력해 주세요.`);
  }
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
  ["mainDirection","mainDirectionReason","inputChips","modePriorityVisual","outputPriorityVisual","taskMapCard","reportFrameCard","doDontCard","textbookSection","assessmentReferenceCard","extensionLibrarySection","reasonCard","stepsCard","flowCard","subjectLinksCard","warningsCard"].forEach(id => {
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
      taskDescription: payload.taskDescription
    })
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`응답을 해석할 수 없습니다. (${response.status})`); }
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
  const map = {
    "공통국어": "공통국어1",
    "공통영어": "공통영어1",
    "수학": "공통수학1",
    "과학탐구실험": "과학탐구실험1",
    "통합과학": "통합과학1",
    "통합사회": "통합사회1"
  };
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
  const haystack = [
    context.keyword, context.subject, context.career, context.taskType, context.taskDescription,
    ...(context.subjectLinks || []), ...(context.textbookSubjects || []), ...(context.textbookTopics || [])
  ].map(normalizeText).filter(Boolean);

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

function renderPriorityVisual(modeBias = {}) {
  const entries = Object.entries(modeBias).sort((a,b) => b[1] - a[1]).slice(0,3);
  if (!entries.length) return `<p class="muted">참고 데이터가 없습니다.</p>`;
  return `<div class="summary-item-list">${
    entries.map((entry, idx) => `
      <div class="priority-row">
        <strong>${escapeHtml(entry[0])}</strong>
        <span class="priority-tag ${idx===1 ? "second" : idx===2 ? "third" : ""}">${idx===0 ? "1순위" : idx===1 ? "2순위" : "3순위"}</span>
      </div>
    `).join("")
  }</div>`;
}

function renderOutputVisual(outputs = []) {
  if (!outputs.length) return `<p class="muted">추천 결과물이 없습니다.</p>`;
  return `<div class="summary-item-list">${
    outputs.slice(0,3).map((v, idx) => `
      <div class="priority-row">
        <strong>${escapeHtml(v)}</strong>
        <span class="priority-tag ${idx===1 ? "second" : idx===2 ? "third" : ""}">${idx===0 ? "우선" : idx===1 ? "차선" : "보조"}</span>
      </div>
    `).join("")
  }</div>`;
}

function renderTaskMapCard(payload, apiData) {
  const steps = toArray(apiData?.result?.steps).slice(0,4);
  $("taskMapCard").innerHTML = `
    <h3 class="card-title"><span class="icon-dot"></span>한눈에 보는 수행 구조</h3>
    <div class="step-flow">
      ${steps.map((step, idx) => `
        <div class="step-box">
          <div class="step-no">${idx+1}</div>
          <div>${escapeHtml(step)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderReportFrameCard(payload, textbookMatches, extensionMatches) {
  const concepts = textbookMatches.flatMap(x => toArray(x.core_concepts)).slice(0,4);
  const outputs = extensionMatches[0]?.outputs?.slice(0,4) || [];
  const compareBase = payload.keyword ? [`${payload.keyword}의 기본 개념`, `${payload.keyword} 관련 사례 비교`, `결과 해석`, `결론`] : [`개념 정리`, `사례 비교`, `자료 해석`, `결론`];
  $("reportFrameCard").innerHTML = `
    <h3 class="card-title"><span class="icon-dot"></span>보고서 틀</h3>
    <div class="frame-grid">
      <div class="frame-item"><b>1. 도입</b><div>${escapeHtml(compareBase[0])}</div></div>
      <div class="frame-item"><b>2. 핵심 비교</b><div>${escapeHtml(compareBase[1])}</div></div>
      <div class="frame-item"><b>3. 교과 개념 연결</b><div>${escapeHtml(concepts.join(", ") || "관련 교과 개념 정리")}</div></div>
      <div class="frame-item"><b>4. 마무리</b><div>${escapeHtml(outputs[0] || compareBase[3])}</div></div>
    </div>
  `;
}

function renderDoDontCard(payload, assessmentReference) {
  const hints = toArray(assessmentReference?.school_reality_hint);
  const doList = hints.length ? hints : ["교과 개념을 먼저 정리하기", "자료 비교 기준을 먼저 세우기"];
  const dontList = [
    "대학 수준 이론으로 너무 깊게 들어가기",
    "실험이 어려운데 실험형으로 억지 확장하기",
    "자료 없이 주장만 길게 쓰기"
  ];
  $("doDontCard").innerHTML = `
    <h3 class="card-title"><span class="icon-dot"></span>바로 보이는 체크포인트</h3>
    <div class="do-dont-grid">
      <div class="do-box">
        <h4>이렇게 하면 좋아요</h4>
        <ul>${doList.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
      </div>
      <div class="dont-box">
        <h4>이건 피하세요</h4>
        <ul>${dontList.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function renderTextbookSection(matches) {
  const el = $("textbookSection");
  if (!matches.length) { el.innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>교과 근거</h3><p class="muted">매칭 결과가 없습니다.</p>`; return; }
  const item = matches[0];
  el.innerHTML = `
    <h3 class="card-title"><span class="icon-dot"></span>교과 근거</h3>
    <div class="textbook-mini">
      <div class="mini-block"><b>과목/단원</b><div>${escapeHtml([item.subject, item.unit, item.subunit].filter(Boolean).join(" › "))}</div></div>
      <div class="mini-block"><b>핵심 개념</b><div>${escapeHtml(toArray(item.core_concepts).slice(0,4).join(", "))}</div></div>
      <div class="mini-block"><b>탐구 씨앗</b><div>${escapeHtml(toArray(item.topic_seeds).slice(0,2).join(" / "))}</div></div>
    </div>
  `;
}

function renderAssessmentReferenceCard(assessmentReference) {
  $("assessmentReferenceCard").innerHTML = assessmentReference ? `
    <h3 class="card-title"><span class="icon-dot"></span>수행평가 현실 참고</h3>
    <div class="reference-mini">
      <div class="mini-block"><b>자주 보이는 방식</b><div>${escapeHtml(toArray(assessmentReference.common_activity_types).join(", "))}</div></div>
      <div class="mini-block"><b>권장 결과물</b><div>${escapeHtml(toArray(assessmentReference.preferred_outputs).join(", "))}</div></div>
      <div class="mini-block"><b>현실 힌트</b><ul>${toArray(assessmentReference.school_reality_hint).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul></div>
    </div>
  ` : `<h3 class="card-title"><span class="icon-dot"></span>수행평가 현실 참고</h3><p class="muted">참고 데이터가 없습니다.</p>`;
}

function renderExtensionLibrarySection(matches) {
  const el = $("extensionLibrarySection");
  if (!matches.length) {
    el.innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>추천 템플릿</h3><p class="muted">추천 템플릿이 없습니다.</p>`;
    return;
  }
  el.innerHTML = `
    <h3 class="card-title"><span class="icon-dot"></span>추천 템플릿</h3>
    <div class="template-mini">
      ${matches.map((item, idx) => `
        <div class="mini-block">
          <b>${idx === 0 ? "1순위" : `${idx+1}순위`} · ${escapeHtml(item.title || "")}</b>
          <div>${escapeHtml(item.type || "")}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBottomCards(apiData) {
  const result = apiData.result || {};
  $("reasonCard").innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>왜 이 방향인가</h3><p>${escapeHtml(result.reason || "")}</p>`;
  $("stepsCard").innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>탐구 순서</h3><ul>${toArray(result.steps).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("flowCard").innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>설계 흐름</h3><ul>${toArray(result.flow).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("subjectLinksCard").innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>연결 교과</h3><ul>${toArray(result.subjectLinks).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
  $("warningsCard").innerHTML = `<h3 class="card-title"><span class="icon-dot"></span>주의할 점</h3><ul>${toArray(result.warnings).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
}

function renderTopSummary(payload, apiData, assessmentReference, extensionMatches) {
  const bestMode = Object.entries(assessmentReference?.reality_bias || {}).sort((a,b) => b[1]-a[1])[0]?.[0] || "research";
  $("mainDirection").textContent = `${payload.subject}에서 ${payload.keyword}를 ${payload.taskType}로 설계`;
  $("mainDirectionReason").textContent = `이 입력에서는 ${bestMode} 중심 접근이 가장 자연스럽고, ${payload.grade} 수준에서 무리 없이 연결하기 좋습니다.`;
  $("inputChips").innerHTML = [payload.subject, payload.taskType, payload.career, payload.keyword, payload.grade].filter(Boolean).map(v => `<span class="chip">${escapeHtml(v)}</span>`).join("");
  $("modePriorityVisual").innerHTML = renderPriorityVisual(assessmentReference?.reality_bias || {});
  $("outputPriorityVisual").innerHTML = renderOutputVisual(toArray(assessmentReference?.preferred_outputs).concat(extensionMatches[0]?.outputs || []));
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

    renderTopSummary(payload, apiData, assessmentReference, extensionMatches);
    renderTaskMapCard(payload, apiData);
    renderReportFrameCard(payload, textbookMatches, extensionMatches);
    renderDoDontCard(payload, assessmentReference);
    renderTextbookSection(textbookMatches);
    renderAssessmentReferenceCard(assessmentReference);
    renderExtensionLibrarySection(extensionMatches);
    renderBottomCards(apiData);

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
