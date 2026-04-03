window.__KEYWORD_ENGINE_VERSION = "admissions-v14-task-first";
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
function renderBullets(items) {
  const arr = toArray(items).filter(Boolean);
  if (!arr.length) return '<p class="muted">내용이 없습니다.</p>';
  return `<ul>${arr.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}
function renderText(value) { return value ? `<p>${escapeHtml(value)}</p>` : '<p class="muted">내용이 없습니다.</p>'; }

function getFormValues() {
  const subject = $("subject")?.value?.trim() || "";
  const taskType = $("taskType")?.value?.trim() || "";
  const taskDescription = $("taskDescription")?.value?.trim() || "";
  const career = $("career")?.value?.trim() || "";
  const keyword = $("keyword")?.value?.trim() || "";
  const grade = $("grade")?.value?.trim() || "";
  return {
    subject, taskType, taskDescription, career, keyword, grade,
    // backward compatibility for worker
    major: career,
    track: career,
    style: taskType,
    activityLevel: grade
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
  ["reasonCard","stepsCard","flowCard","approachCard","extensionCard","subjectLinksCard","warningsCard","textbookSection","extensionLibrarySection","assessmentReferenceCard","taskSummaryCard"].forEach(id => {
    const el = $(id); if (el) el.innerHTML = "";
  });
  const resultWrap = $("resultSection"); if (resultWrap) resultWrap.style.display = "none";
  const inputSummary = $("inputSummary"); if (inputSummary) inputSummary.textContent = "";
}

async function callGenerateAPI(payload) {
  const workerPayload = {
    keyword: payload.keyword,
    grade: payload.grade,
    track: payload.track,
    major: payload.major,
    style: payload.style,
    activityLevel: payload.activityLevel,
    subject: payload.subject,
    taskType: payload.taskType,
    taskDescription: payload.taskDescription
  };
  const response = await fetch(`${WORKER_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workerPayload)
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
    const byGrade = seed?.grade_1_semester_1 || {};
    return byGrade[subjectKeyForReference(payload.subject)] || null;
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
  if (t.includes("데이터")) return "analysis";
  if (t.includes("시뮬") || t.includes("모델")) return "analysis";
  if (t.includes("제작") || t.includes("설계")) return "design";
  if (t.includes("정책") || t.includes("사회")) return "research";
  if (t.includes("자유탐구")) return "research";
  return "research";
}

function scoreExtensionTemplate(template, context) {
  let score = 0;
  const haystack = [
    context.keyword, context.subject, context.career, context.taskType, context.taskDescription,
    ...(context.subjectLinks || []), ...(context.textbookSubjects || []), ...(context.textbookTopics || [])
  ].map(normalizeText).filter(Boolean);

  const requiredKeywords = toArray(template.fit_conditions?.required_any_keywords);
  const preferredSubjects = toArray(template.fit_conditions?.preferred_subjects);
  const preferredMethods = toArray(template.fit_conditions?.preferred_methods);
  const themeTags = toArray(template.theme_tags);
  const methodTags = toArray(template.method_tags);
  const subjects = toArray(template.subjects);

  requiredKeywords.forEach(keyword => {
    const k = normalizeText(keyword);
    if (haystack.some(item => item.includes(k) || k.includes(item))) score += 8;
  });

  preferredSubjects.forEach(subject => {
    const s = normalizeText(subject);
    if ([context.subject, ...(context.subjectLinks || [])].map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 7;
  });

  preferredMethods.forEach(method => {
    const m = normalizeText(method);
    if ([context.taskType, context.taskDescription].map(normalizeText).some(item => item.includes(m) || m.includes(item))) score += 5;
    if (methodTags.map(normalizeText).some(item => item.includes(m) || m.includes(item))) score += 2;
  });

  themeTags.forEach(tag => {
    const t = normalizeText(tag);
    if (haystack.some(item => item.includes(t) || t.includes(item))) score += 3;
  });

  subjects.forEach(subject => {
    const s = normalizeText(subject);
    if ([context.subject, ...(context.subjectLinks || [])].map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 3;
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
    if (!templates.length) return [];

    const context = {
      keyword: payload.keyword,
      subject: payload.subject,
      career: payload.career,
      grade: payload.grade,
      taskType: payload.taskType,
      taskDescription: payload.taskDescription,
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

function renderResultCards(apiData, payload, assessmentReference) {
  const result = apiData.result || {};
  $("inputSummary").textContent = `${payload.subject} · ${payload.taskType} · ${payload.career} · ${payload.keyword} · ${payload.grade}`;
  $("taskSummaryCard").innerHTML = `
    <h3>이번 수행 입력 요약</h3>
    <ul>
      <li><strong>과목:</strong> ${escapeHtml(payload.subject)}</li>
      <li><strong>수행평가 형태:</strong> ${escapeHtml(payload.taskType)}</li>
      <li><strong>희망 진로:</strong> ${escapeHtml(payload.career)}</li>
      <li><strong>키워드:</strong> ${escapeHtml(payload.keyword)}</li>
      <li><strong>학년:</strong> ${escapeHtml(payload.grade)}</li>
      ${payload.taskDescription ? `<li><strong>수행 설명:</strong> ${escapeHtml(payload.taskDescription)}</li>` : ""}
    </ul>
  `;
  $("reasonCard").innerHTML = `<h3>추천 이유</h3>${renderText(result.reason)}`;
  $("stepsCard").innerHTML = `<h3>탐구 진행 순서</h3>${renderBullets(result.steps)}`;
  $("flowCard").innerHTML = `<h3>활동 설계 흐름</h3>${renderBullets(result.flow)}`;
  $("approachCard").innerHTML = `<h3>추천 진행 방식</h3>${renderText(result.recommendedApproach || payload.taskType)}`;
  $("extensionCard").innerHTML = `<h3>한 단계 더 확장하려면</h3>${renderText(result.extension)}`;
  $("subjectLinksCard").innerHTML = `<h3>관련 교과 연결</h3>${renderBullets(result.subjectLinks || [payload.subject])}`;
  $("warningsCard").innerHTML = `<h3>주의할 점</h3>${renderBullets(result.warnings)}`;

  $("assessmentReferenceCard").innerHTML = assessmentReference ? `
    <h3>수행평가 현실성 참고</h3>
    <p class="muted">reference_only 보정값입니다.</p>
    <ul>
      ${(assessmentReference.school_reality_hint || []).map(v => `<li>${escapeHtml(v)}</li>`).join("")}
    </ul>
  ` : `<h3>수행평가 현실성 참고</h3><p class="muted">참고 데이터가 없습니다.</p>`;

  const badge = $("resultModeBadge");
  if (badge) badge.textContent = apiData.mode || "task-first";
}

function renderTextbookSection(matches) {
  const el = $("textbookSection");
  if (!el) return;
  if (!Array.isArray(matches) || !matches.length) { el.innerHTML = ""; return; }

  const topMatches = matches.slice(0, 3);
  el.innerHTML = `
    <div class="textbook-box">
      <h3>관련 교과서 근거</h3>
      <div class="textbook-list">
        ${topMatches.map(item => {
          const concepts = toArray(item.core_concepts).slice(0, 5);
          const topics = toArray(item.topic_seeds).slice(0, 3);
          return `
            <div class="textbook-item">
              <div class="textbook-head">
                <strong>${escapeHtml(item.subject || "")}</strong>
                <span>${escapeHtml([item.unit, item.subunit].filter(Boolean).join(" › "))}</span>
              </div>
              <div class="textbook-row"><b>핵심 개념</b>${renderBullets(concepts)}</div>
              <div class="textbook-row"><b>탐구 씨앗</b>${renderBullets(topics)}</div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderExtensionLibrarySection(matches, assessmentReference) {
  const el = $("extensionLibrarySection");
  if (!el) return;
  if (!Array.isArray(matches) || !matches.length) { el.innerHTML = ""; return; }

  const modeOrder = Object.entries(assessmentReference?.reality_bias || {})
    .sort((a,b) => b[1] - a[1])
    .map(([k]) => k);

  el.innerHTML = `
    <div class="textbook-box">
      <h3>추천 활동 템플릿</h3>
      ${modeOrder.length ? `<ul class="mode-list">${modeOrder.map(v => `<li class="mode-chip">${escapeHtml(v)}</li>`).join("")}</ul>` : ""}
      <div class="textbook-list">
        ${matches.map((item, idx) => `
          <div class="textbook-item">
            <div class="textbook-head">
              <strong>${idx === 0 ? "1순위" : `${idx+1}순위`} · ${escapeHtml(item.title || "")}</strong>
              ${item.type ? `<span>${escapeHtml(item.type)}</span>` : ""}
            </div>
            <div class="textbook-row"><b>핵심 구조</b>${renderBullets(item.activity_flow?.slice(0,5) || [])}</div>
            <div class="textbook-row"><b>권장 산출물</b>${renderBullets(item.outputs?.slice(0,4) || [])}</div>
            <div class="textbook-row"><b>왜 맞는가</b><p>${escapeHtml(`현재 입력 조건과 수행평가 현실성 보정을 함께 반영했을 때 가장 자연스러운 템플릿입니다.`)}</p></div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
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
      payload, apiData, textbookMatches, extensionMatches, assessmentReference
    };

    renderResultCards(apiData, payload, assessmentReference);
    renderTextbookSection(textbookMatches);
    renderExtensionLibrarySection(extensionMatches, assessmentReference);

    const resultWrap = $("resultSection");
    if (resultWrap) resultWrap.style.display = "block";
    return window.__lastGenerateDebug;
  } catch (error) {
    console.error("handleGenerate error:", error);
    window.__lastGenerateDebug = { error: error?.message || String(error), version: window.__KEYWORD_ENGINE_VERSION || "unknown" };
    showError(error.message || "생성 중 오류가 발생했습니다.");
    return window.__lastGenerateDebug;
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
