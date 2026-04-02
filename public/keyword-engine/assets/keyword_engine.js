window.__KEYWORD_ENGINE_VERSION = "admissions-v5";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const EXTENSION_LIBRARY_URL = "seed/extension_library_v2.json";

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function renderBullets(items) {
  const arr = toArray(items).filter(Boolean);
  if (!arr.length) return '<p class="muted">내용이 없습니다.</p>';
  return `<ul>${arr.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderText(value) {
  if (!value) return '<p class="muted">내용이 없습니다.</p>';
  return `<p>${escapeHtml(value)}</p>`;
}

function getFormValues() {
  return {
    keyword: $("keyword")?.value?.trim() || "",
    grade: $("grade")?.value?.trim() || "",
    track: $("track")?.value?.trim() || "",
    major: $("major")?.value?.trim() || "",
    activityLevel: $("activityLevel")?.value?.trim() || "",
    style: $("style")?.value?.trim() || ""
  };
}

function validateInput(data) {
  const required = [
    ["keyword", "키워드"],
    ["grade", "학년"],
    ["track", "관심 계열"],
    ["major", "희망 전공"]
  ];

  for (const [key, label] of required) {
    if (!data[key]) {
      throw new Error(`${label}을(를) 입력해 주세요.`);
    }
  }
}

function setLoading(isLoading) {
  const btn = $("generateBtn");
  const resetBtn = $("resetBtn");
  const loading = $("loadingMessage");

  if (btn) {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? "생성 중..." : "탐구 설계 생성";
  }
  if (resetBtn) resetBtn.disabled = isLoading;
  if (loading) loading.style.display = isLoading ? "block" : "none";
}

function showError(message) {
  const resultWrap = $("resultSection");
  const errorBox = $("errorMessage");
  if (errorBox) {
    errorBox.innerHTML = `<strong>오류</strong><br>${escapeHtml(message)}`;
    errorBox.style.display = "block";
  }
  if (resultWrap) resultWrap.style.display = "none";
}

function clearError() {
  const errorBox = $("errorMessage");
  if (errorBox) {
    errorBox.innerHTML = "";
    errorBox.style.display = "none";
  }
}

function clearResults() {
  const ids = [
    "reasonCard",
    "stepsCard",
    "flowCard",
    "approachCard",
    "extensionCard",
    "subjectLinksCard",
    "warningsCard",
    "textbookSection",
    "extensionLibrarySection"
  ];
  ids.forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = "";
  });
  const resultWrap = $("resultSection");
  if (resultWrap) resultWrap.style.display = "none";
}

async function callGenerateAPI(payload) {
  const response = await fetch(`${WORKER_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`응답을 해석할 수 없습니다. (${response.status})`);
  }

  if (!response.ok || data.ok === false) {
    const message =
      data?.data?.error?.message ||
      data?.error ||
      data?.message ||
      `요청 처리 중 오류가 발생했습니다. (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function getTextbookMatches(payload) {
  try {
    if (typeof window.matchTextbook !== "function") return [];

    const keywords = [payload.keyword, payload.track, payload.major].filter(Boolean);

    const result = await window.matchTextbook({
      keywords,
      category: payload.track,
      major: payload.major
    });

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.matches)) return result.matches;
    return [];
  } catch (error) {
    console.warn("textbook matcher error:", error);
    return [];
  }
}

function renderResultCards(apiData) {
  const result = apiData.result || {};

  $("reasonCard").innerHTML = `<h3>추천 이유</h3>${renderText(result.reason)}`;
  $("stepsCard").innerHTML = `<h3>탐구 진행 순서</h3>${renderBullets(result.steps)}`;
  $("flowCard").innerHTML = `<h3>활동 설계 흐름</h3>${renderBullets(result.flow)}`;
  $("approachCard").innerHTML = `<h3>추천 진행 방식</h3>${renderText(result.recommendedApproach)}`;
  $("extensionCard").innerHTML = `<h3>한 단계 더 확장하려면</h3>${renderText(result.extension)}`;
  $("subjectLinksCard").innerHTML = `<h3>관련 교과 연결</h3>${renderBullets(result.subjectLinks)}`;
  $("warningsCard").innerHTML = `<h3>주의할 점</h3>${renderBullets(result.warnings)}`;

  const badge = $("resultModeBadge");
  if (badge) badge.textContent = apiData.mode || "ai";

  const resultWrap = $("resultSection");
  if (resultWrap) resultWrap.style.display = "block";
}

function renderTextbookSection(matches) {
  const el = $("textbookSection");
  if (!el) return;

  if (!Array.isArray(matches) || !matches.length) {
    el.innerHTML = "";
    return;
  }

  const topMatches = matches.slice(0, 3);

  el.innerHTML = `
    <div class="textbook-box">
      <h3>관련 교과서 근거</h3>
      <div class="textbook-list">
        ${topMatches.map(item => {
          const subject = item.subject || "";
          const unit = item.unit || "";
          const subunit = item.subunit || item.name || "";
          const concepts = toArray(item.core_concepts || item.coreConcepts).slice(0, 5);
          const points = toArray(item.interpretation_points || item.interpretationPoints).slice(0, 3);
          const topics = toArray(item.topic_seeds || item.topicSeeds).slice(0, 3);

          return `
            <div class="textbook-item">
              <div class="textbook-head">
                <strong>${escapeHtml(subject)}</strong>
                ${unit ? `<span>› ${escapeHtml(unit)}</span>` : ""}
                ${subunit ? `<span>› ${escapeHtml(subunit)}</span>` : ""}
              </div>
              ${concepts.length ? `
                <div class="textbook-row">
                  <b>핵심 개념</b>
                  <ul>${concepts.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
              ${points.length ? `
                <div class="textbook-row">
                  <b>해석 포인트</b>
                  <ul>${points.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
              ${topics.length ? `
                <div class="textbook-row">
                  <b>탐구 씨앗</b>
                  <ul>${topics.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

async function loadExtensionLibrary() {
  const response = await fetch(EXTENSION_LIBRARY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("확장 활동 라이브러리를 불러오지 못했습니다.");
  return response.json();
}

function scoreExtensionTemplate(template, context) {
  let score = 0;

  const haystack = [
    context.keyword,
    context.track,
    context.major,
    ...(context.subjectLinks || []),
    ...(context.textbookSubjects || []),
    ...(context.textbookTopics || [])
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
    if ((context.subjectLinks || []).map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 6;
    if ((context.textbookSubjects || []).map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 4;
  });

  preferredMethods.forEach(method => {
    const m = normalizeText(method);
    if (normalizeText(context.style).includes(m)) score += 5;
    if (methodTags.map(normalizeText).some(item => item.includes(m) || m.includes(item))) score += 1;
  });

  themeTags.forEach(tag => {
    const t = normalizeText(tag);
    if (haystack.some(item => item.includes(t) || t.includes(item))) score += 3;
  });

  if (normalizeText(context.major).includes("컴퓨터") || normalizeText(context.major).includes("ai")) {
    if (template.type === "시뮬레이션형" || template.type === "모델링형") score += 8;
  }

  if (normalizeText(context.major).includes("화학공학") || normalizeText(context.major).includes("신소재") || normalizeText(context.track).includes("이공")) {
    if (template.type === "센서실험형" || template.type === "데이터분석형" || template.type === "모델링형") score += 4;
  }

  if (normalizeText(context.track).includes("보건") || normalizeText(context.major).includes("간호")) {
    if (template.type === "센서실험형" || template.type === "자유탐구형" || template.type === "비평탐구형") score += 2;
  }

  subjects.forEach(subject => {
    const s = normalizeText(subject);
    if ((context.subjectLinks || []).map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 2;
  });

  return score;
}

async function getExtensionLibraryMatches(payload, apiData, textbookMatches) {
  try {
    const library = await loadExtensionLibrary();
    const templates = Array.isArray(library?.templates) ? library.templates : [];
    if (!templates.length) return [];

    const context = {
      keyword: payload.keyword,
      track: payload.track,
      major: payload.major,
      style: payload.style,
      subjectLinks: toArray(apiData?.result?.subjectLinks),
      textbookSubjects: textbookMatches.map(item => item.subject).filter(Boolean),
      textbookTopics: textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).filter(Boolean)
    };

    return templates
      .map(template => ({ ...template, _score: scoreExtensionTemplate(template, context) }))
      .filter(template => template._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 3);
  } catch (error) {
    console.warn("extension library error:", error);
    return [];
  }
}

function renderExtensionLibrarySection(matches) {
  const el = $("extensionLibrarySection");
  if (!el) return;

  if (!Array.isArray(matches) || !matches.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="textbook-box">
      <h3>추천 활동 템플릿</h3>
      <div class="textbook-list">
        ${matches.map(item => `
          <div class="textbook-item">
            <div class="textbook-head">
              <strong>${escapeHtml(item.title || "")}</strong>
              ${item.type ? `<span>${escapeHtml(item.type)}</span>` : ""}
            </div>

            ${toArray(item.subjects).length ? `
              <div class="textbook-row">
                <b>연결 과목</b>
                <ul>${toArray(item.subjects).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.activity_flow).length ? `
              <div class="textbook-row">
                <b>권장 탐구 흐름</b>
                <ul>${toArray(item.activity_flow).slice(0, 5).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.outputs).length ? `
              <div class="textbook-row">
                <b>추천 산출물</b>
                <ul>${toArray(item.outputs).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.evaluation_points).length ? `
              <div class="textbook-row">
                <b>관찰 포인트</b>
                <ul>${toArray(item.evaluation_points).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${item.notes ? `
              <div class="textbook-row">
                <b>운영 메모</b>
                <p>${escapeHtml(item.notes)}</p>
              </div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function handleGenerate() {
  clearError();
  clearResults();

  try {
    const payload = getFormValues();
    validateInput(payload);
    setLoading(true);

    const apiData = await callGenerateAPI(payload);
    const textbookMatches = await getTextbookMatches(payload);
    const extensionMatches = await getExtensionLibraryMatches(payload, apiData, textbookMatches);

    renderResultCards(apiData);
    renderTextbookSection(textbookMatches);
    renderExtensionLibrarySection(extensionMatches);
  } catch (error) {
    showError(error.message || "생성 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}

function handleReset() {
  ["keyword", "grade", "track", "major", "activityLevel", "style"].forEach(id => {
    const el = $(id);
    if (el) el.value = "";
  });
  clearError();
  clearResults();
}

document.addEventListener("DOMContentLoaded", () => {
  $("generateBtn")?.addEventListener("click", handleGenerate);
  $("resetBtn")?.addEventListener("click", handleReset);
});

window.handleGenerate = handleGenerate;
window.handleReset = handleReset;




/* ===== admissions-v5 override patch ===== */

const ADMISSION_STRUCTURE_SEED_URLS = [
  "seed/core/admission_subject_structure_seed.json",
  "seed/admission_subject_structure_seed.json"
];

function dedupe(arr) {
  return Array.from(new Set((Array.isArray(arr) ? arr : []).filter(Boolean)));
}

async function loadAdmissionStructureSeed() {
  for (const url of ADMISSION_STRUCTURE_SEED_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.entries)) return data;
      }
    } catch (error) {
      console.warn("structure seed load error:", url, error);
    }
  }
  return { entries: [] };
}

function scoreStructureEntry(entry, context) {
  let score = 0;
  const haystack = [
    context.keyword,
    context.track,
    context.major,
    ...(context.subjectLinks || []),
    ...(context.textbookSubjects || []),
    ...(context.textbookTopics || [])
  ].map(normalizeText).filter(Boolean);

  const pieces = [
    entry.track,
    entry.subject,
    entry.structure_name,
    entry.when_to_use,
    entry.core_question_frame,
    ...toArray(entry.seed_keywords),
    ...toArray(entry.concept_links),
    ...toArray(entry.career_link_points)
  ].filter(Boolean);

  pieces.forEach(piece => {
    const p = normalizeText(piece);
    if (!p) return;
    if (haystack.some(item => item.includes(p) || p.includes(item))) score += 4;
  });

  if (normalizeText(entry.track).includes(normalizeText(context.major)) || normalizeText(context.major).includes(normalizeText(entry.track))) score += 8;
  if (normalizeText(entry.track).includes(normalizeText(context.track)) || normalizeText(context.track).includes(normalizeText(entry.track))) score += 4;

  return score;
}

async function getStructureMatches(payload, apiData, textbookMatches) {
  try {
    const seed = await loadAdmissionStructureSeed();
    const entries = Array.isArray(seed?.entries) ? seed.entries : [];
    if (!entries.length) return [];

    const context = {
      keyword: payload.keyword,
      track: payload.track,
      major: payload.major,
      subjectLinks: toArray(apiData?.result?.subjectLinks),
      textbookSubjects: textbookMatches.map(item => item.subject).filter(Boolean),
      textbookTopics: textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).filter(Boolean)
    };

    const ranked = entries
      .map(entry => ({ ...entry, _score: scoreStructureEntry(entry, context) }))
      .sort((a, b) => b._score - a._score);

    const positives = ranked.filter(entry => entry._score > 0).slice(0, 3);
    return positives.length ? positives : ranked.slice(0, 2);
  } catch (error) {
    console.warn("structure matching error:", error);
    return [];
  }
}

function firstStructure(structureMatches) {
  return Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
}

function buildAdmissionsReason(payload, apiData, textbookMatches, structureMatches) {
  const s = firstStructure(structureMatches);
  const concept = toArray(s?.concept_links)[0] || toArray(textbookMatches?.[0]?.core_concepts || textbookMatches?.[0]?.coreConcepts)[0] || payload.keyword;
  const question = s?.core_question_frame || `${payload.keyword}에서 어떤 차이가 성능 차이로 이어지는가?`;
  const signal = toArray(s?.high_score_signals)[0] || "비교 기준이 선명하고, 결과 해석에 교과 개념이 직접 연결되는지";
  return `${payload.grade} 학생이 ${payload.keyword}를 ${payload.major} 진로와 연결해 다룰 때는 흥미 설명보다 질문-비교-해석 구조가 먼저 보여야 한다. ${question}라는 질문으로 범위를 좁히고, ${concept}을(를) 기준 개념으로 잡으면 학생부에서 탐구 설계 능력과 교과 개념 적용력이 함께 드러난다. 특히 ${signal}가 보이면 단순 조사형이 아니라 입시에서 읽히는 탐구로 정리되기 쉽다.`;
}

function buildAdmissionsSteps(payload, textbookMatches, structureMatches) {
  const s = firstStructure(structureMatches);
  const process = toArray(s?.process_steps).slice(0, 4);
  const concepts = dedupe(textbookMatches.flatMap(item => toArray(item.core_concepts || item.coreConcepts))).slice(0, 2);
  const topics = dedupe(textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds))).slice(0, 2);
  const steps = dedupe([
    s?.core_question_frame ? `핵심 질문 설정: ${s.core_question_frame}` : `${payload.keyword}에서 비교할 핵심 질문을 한 문장으로 설정한다.`,
    process[0] || `${payload.keyword}와 관련된 교과 개념을 먼저 정리한다.`,
    process[1] || `비교 기준과 변수(소재, 조건, 결과값)를 분리해 설계한다.`,
    topics[0] || `자료 조사 또는 기초 실험으로 비교 대상 데이터를 확보한다.`,
    process[2] || `${concepts[0] || payload.keyword}을(를) 기준으로 결과를 해석한다.`,
    process[3] || `확장 질문이나 개선 방향까지 연결해 마무리한다.`
  ]);
  return steps.slice(0, 6);
}

function buildAdmissionsFlow(payload, structureMatches) {
  const s = firstStructure(structureMatches);
  return dedupe([
    "질문 설정 → 기준 설정 → 비교 → 해석 → 확장 순서로 가야 평가자가 구조를 바로 읽을 수 있다.",
    toArray(s?.high_score_signals)[0] || "결과 해석 문장에서 교과 개념이 직접 사용되어야 한다.",
    toArray(s?.high_score_signals)[1] || "단순 정보 나열보다 비교 기준과 판단 근거가 먼저 보여야 한다.",
    toArray(s?.career_link_points)[0] || `${payload.major} 진로와 연결되는 이유가 탐구 결과 해석 안에서 설명되어야 한다.`
  ]).slice(0, 4);
}

function buildAdmissionsApproach(payload, structureMatches, textbookMatches) {
  const s = firstStructure(structureMatches);
  const evidence = toArray(s?.evidence_style)[0] || "비교표·실험 기록·그래프";
  const output = toArray(s?.good_output_forms)[0] || "보고서";
  const concept = toArray(s?.concept_links)[0] || toArray(textbookMatches?.[0]?.core_concepts || textbookMatches?.[0]?.coreConcepts)[0] || payload.keyword;
  return `${concept}을(를) 해석 기준으로 먼저 고정한 뒤, 비교 기준과 변수를 분리해 ${evidence} 중심으로 자료를 쌓고 ${output}로 정리하는 방식이 가장 안정적이다. 수행평가에서는 '무엇을 조사했는가'보다 '어떤 기준으로 비교하고 어떻게 해석했는가'가 더 중요하다.`;
}

function buildAdmissionsExtension(payload, structureMatches) {
  const s = firstStructure(structureMatches);
  const axis = toArray(s?.extension_axes)[0] || "조건 변화·효율 차이·개선 아이디어";
  return `${axis} 축으로 한 단계 더 확장하면 단순 개념 이해를 넘어 비교·분석형 탐구로 올라갈 수 있다. 다음 단계에서는 결과 차이가 왜 발생했는지 원인 가설을 추가하고, ${payload.major} 진로와 연결되는 적용 사례까지 붙이면 학생부에서 활용도가 높아진다.`;
}

function buildAdmissionsSubjectLinks(payload, apiData, textbookMatches, structureMatches) {
  const s = firstStructure(structureMatches);
  return dedupe([
    ...toArray(apiData?.result?.subjectLinks),
    ...toArray(s?.concept_links).map(v => `${v} 해석 연결`),
    ...dedupe(textbookMatches.map(item => item.subject).filter(Boolean)).map(v => `${v} 교과 개념 적용`)
  ]).slice(0, 6);
}

function buildAdmissionsWarnings(payload, structureMatches) {
  const s = firstStructure(structureMatches);
  return dedupe([
    "자료를 많이 모으는 것보다 어떤 기준으로 해석할지를 먼저 정하는 것이 중요하다.",
    "원리만 길게 설명하고 비교 구조가 없으면 수행평가에서 강점이 약해질 수 있다.",
    "대학 수준 공정 이론이나 전문 수식을 무리하게 끌어오면 오히려 탐구의 자연스러움이 깨질 수 있다.",
    ...toArray(s?.avoid_points).slice(0, 2)
  ]).slice(0, 5);
}

function renderResultCards(apiData, payload, textbookMatches = [], structureMatches = []) {
  const reason = buildAdmissionsReason(payload, apiData, textbookMatches, structureMatches);
  const steps = buildAdmissionsSteps(payload, textbookMatches, structureMatches);
  const flow = buildAdmissionsFlow(payload, structureMatches);
  const approach = buildAdmissionsApproach(payload, structureMatches, textbookMatches);
  const extension = buildAdmissionsExtension(payload, structureMatches);
  const subjectLinks = buildAdmissionsSubjectLinks(payload, apiData, textbookMatches, structureMatches);
  const warnings = buildAdmissionsWarnings(payload, structureMatches);

  $("reasonCard").innerHTML = `<h3>추천 이유</h3>${renderText(reason)}`;
  $("stepsCard").innerHTML = `<h3>탐구 진행 순서</h3>${renderBullets(steps)}`;
  $("flowCard").innerHTML = `<h3>활동 설계 흐름</h3>${renderBullets(flow)}`;
  $("approachCard").innerHTML = `<h3>추천 진행 방식</h3>${renderText(approach)}`;
  $("extensionCard").innerHTML = `<h3>한 단계 더 확장하려면</h3>${renderText(extension)}`;
  $("subjectLinksCard").innerHTML = `<h3>관련 교과 연결</h3>${renderBullets(subjectLinks)}`;
  $("warningsCard").innerHTML = `<h3>주의할 점</h3>${renderBullets(warnings)}`;

  const badge = $("resultModeBadge");
  if (badge) badge.textContent = "admissions-v5";

  const resultWrap = $("resultSection");
  if (resultWrap) resultWrap.style.display = "block";
}

function renderTextbookSection(matches, structureMatches = []) {
  const el = $("textbookSection");
  if (!el) return;

  if (!Array.isArray(matches) || !matches.length) {
    el.innerHTML = "";
    return;
  }

  const s = firstStructure(structureMatches);
  const topMatches = matches.slice(0, 3);

  el.innerHTML = `
    <div class="textbook-box">
      <h3>관련 교과서 근거</h3>
      <div class="textbook-list">
        ${topMatches.map(item => {
          const subject = item.subject || "";
          const unit = item.unit || "";
          const subunit = item.subunit || item.name || "";
          const concepts = toArray(item.core_concepts || item.coreConcepts).slice(0, 4);
          const points = toArray(item.interpretation_points || item.interpretationPoints).slice(0, 2);
          const topics = toArray(item.topic_seeds || item.topicSeeds).slice(0, 2);
          const reasonLines = dedupe([
            s?.core_question_frame ? `이 단원은 "${s.core_question_frame}" 같은 질문으로 바로 연결하기 좋다.` : "",
            concepts[0] ? `${concepts[0]}을(를) 결과 해석의 기준 개념으로 잡기 좋다.` : "",
            topics[0] ? `${topics[0]}를 출발 질문으로 삼으면 탐구 흐름이 선명해진다.` : ""
          ]).filter(Boolean);

          return `
            <div class="textbook-item">
              <div class="textbook-head">
                <strong>${escapeHtml(subject)}</strong>
                ${unit ? `<span>› ${escapeHtml(unit)}</span>` : ""}
                ${subunit ? `<span>› ${escapeHtml(subunit)}</span>` : ""}
              </div>
              ${reasonLines.length ? `
                <div class="textbook-row">
                  <b>이 단원을 써야 하는 이유</b>
                  <ul>${reasonLines.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
              ${concepts.length ? `
                <div class="textbook-row">
                  <b>핵심 개념</b>
                  <ul>${concepts.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
              ${points.length ? `
                <div class="textbook-row">
                  <b>해석 포인트</b>
                  <ul>${points.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
              ${topics.length ? `
                <div class="textbook-row">
                  <b>바로 이어갈 탐구 질문</b>
                  <ul>${topics.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
                </div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderExtensionLibrarySection(matches, structureMatches = []) {
  const el = $("extensionLibrarySection");
  if (!el) return;

  if (!Array.isArray(matches) || !matches.length) {
    el.innerHTML = "";
    return;
  }

  const s = firstStructure(structureMatches);

  el.innerHTML = `
    <div class="textbook-box">
      <h3>추천 활동 템플릿</h3>
      <div class="textbook-list">
        ${matches.map(item => `
          <div class="textbook-item">
            <div class="textbook-head">
              <strong>${escapeHtml(item.title || "")}</strong>
              ${item.type ? `<span>${escapeHtml(item.type)}</span>` : ""}
            </div>

            <div class="textbook-row">
              <b>적용 포인트</b>
              <p>${escapeHtml(
                s?.structure_name
                  ? `${s.structure_name} 구조로 적용하면 이 템플릿이 훨씬 선명해진다.`
                  : "질문-비교-해석 구조를 먼저 세우고 적용하면 좋다."
              )}</p>
            </div>

            ${toArray(item.activity_flow).length ? `
              <div class="textbook-row">
                <b>바로 시작할 첫 단계</b>
                <ul>${toArray(item.activity_flow).slice(0, 3).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.outputs).length ? `
              <div class="textbook-row">
                <b>추천 산출물</b>
                <ul>${toArray(item.outputs).slice(0, 3).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.evaluation_points).length ? `
              <div class="textbook-row">
                <b>평가 포인트</b>
                <ul>${toArray(item.evaluation_points).slice(0, 3).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.subjects).length ? `
              <div class="textbook-row">
                <b>연결 과목</b>
                <ul>${toArray(item.subjects).slice(0, 3).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function handleGenerate() {
  clearError();
  clearResults();

  try {
    const payload = getFormValues();
    validateInput(payload);
    setLoading(true);

    const apiData = await callGenerateAPI(payload);
    const textbookMatches = await getTextbookMatches(payload);
    const structureMatches = await getStructureMatches(payload, apiData, textbookMatches);
    const extensionMatches = await getExtensionLibraryMatches(payload, apiData, textbookMatches);

    window.__lastGenerateDebug = {
      payload,
      apiData,
      textbookMatches,
      structureMatches,
      extensionMatches
    };

    renderResultCards(apiData, payload, textbookMatches, structureMatches);
    renderTextbookSection(textbookMatches, structureMatches);
    renderExtensionLibrarySection(extensionMatches, structureMatches);
  } catch (error) {
    console.error("handleGenerate error:", error);
    showError(error.message || "생성 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}
