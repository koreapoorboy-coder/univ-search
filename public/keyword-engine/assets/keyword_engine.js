window.__KEYWORD_ENGINE_VERSION = "admissions-v6";
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




/* ===== admissions-v6 template action patch ===== */

function buildTemplateWhyThisWorks(item, payload, structureMatches) {
  const s = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  if (s?.structure_name) {
    return `${s.structure_name} 구조로 적용하면 비교 기준과 해석 기준이 먼저 보이기 때문에 수행평가에서 탐구 설계 능력과 개념 적용력이 함께 드러난다.`;
  }
  return `${payload.keyword}를 단순 설명이 아니라 비교-해석 구조로 정리할 수 있어 수행평가에서 구조가 선명하게 읽힌다.`;
}

function buildTemplateExecutionSteps(item, payload, structureMatches) {
  const title = normalizeText(item?.title || "");
  const keyword = payload.keyword || "주제";
  const major = payload.major || "희망 진로";

  if (title.includes("산화") || title.includes("환원") || title.includes("실험")) {
    return [
      `${keyword}와 연결되는 반응 쌍 또는 비교 대상을 2~3개 정한다.`,
      `각 반응 또는 소재의 차이를 볼 기준(전도성, 반응성, 효율 등)을 먼저 정한다.`,
      `간단한 실험 또는 자료 조사로 동일 기준의 결과를 기록한다.`,
      `결과 차이를 전기화학 또는 산화·환원 개념으로 해석한다.`,
      `${major} 진로와 연결되는 의미를 한 문장으로 정리한다.`
    ];
  }

  if (title.includes("빅데이터") || title.includes("데이터")) {
    return [
      `${keyword}와 관련된 공개 데이터나 기사 자료를 2~3개 수집한다.`,
      `비교할 지표를 먼저 정하고 표로 정리한다.`,
      `기간·조건·사례별 차이를 그래프나 비교표로 나타낸다.`,
      `차이가 나타난 이유를 교과 개념으로 해석한다.`,
      `${major} 진로와 연결되는 시사점을 한 문장으로 정리한다.`
    ];
  }

  if (title.includes("신소재") || title.includes("구조")) {
    return [
      `${keyword}와 연결되는 소재 사례를 2~3개 선정한다.`,
      `각 소재의 구조·기능·장단점을 동일 기준으로 비교한다.`,
      `비교표를 바탕으로 어떤 특성이 성능 차이로 이어지는지 정리한다.`,
      `결과를 화학 또는 물리 개념으로 해석한다.`,
      `${major} 진로와 연결되는 활용 가능성을 한 문장으로 정리한다.`
    ];
  }

  return [
    `${keyword}와 관련된 비교 대상 2~3개를 정한다.`,
    `비교 기준과 해석 기준을 먼저 세운다.`,
    `자료 조사 또는 간단한 실험으로 결과를 정리한다.`,
    `차이를 교과 개념으로 해석한다.`,
    `${major} 진로와 연결되는 의미를 한 문장으로 정리한다.`
  ];
}

function buildTemplateWriteGuide(item, payload, structureMatches) {
  const title = normalizeText(item?.title || "");
  const keyword = payload.keyword || "주제";

  if (title.includes("산화") || title.includes("환원") || title.includes("실험")) {
    return [
      `"${keyword}와 관련된 반응 또는 소재를 동일 기준으로 비교하였다"처럼 출발 문장을 쓴다.`,
      `"A가 B보다 더 높게 나타난 이유는 전자 이동 또는 반응 효율 차이로 볼 수 있다"처럼 결과를 해석한다.`,
      `"이 과정에서 비교 기준 설정과 개념 적용 능력이 드러났다"로 마무리한다.`
    ];
  }

  if (title.includes("빅데이터") || title.includes("데이터")) {
    return [
      `"자료를 수집한 뒤 비교 지표를 기준으로 표를 재구성하였다"라고 쓴다.`,
      `"지표 차이는 에너지 효율 또는 조건 차이로 해석할 수 있다"처럼 결과 의미를 연결한다.`,
      `"데이터를 근거로 시사점을 정리한 점이 탐구 설계 역량으로 이어진다"로 마무리한다.`
    ];
  }

  if (title.includes("신소재") || title.includes("구조")) {
    return [
      `"소재별 구조와 기능을 동일 기준으로 비교하였다"라고 쓴다.`,
      `"구조 차이가 성능 차이로 이어진다는 점을 교과 개념으로 해석하였다"라고 연결한다.`,
      `"비교 결과를 활용 사례와 연결해 진로 연계성을 드러냈다"로 마무리한다.`
    ];
  }

  return [
    `"${keyword} 관련 사례를 비교하였다"라고 시작한다.`,
    `"차이를 교과 개념으로 해석하였다"라고 결과를 연결한다.`,
    `"이 과정에서 탐구 설계 및 개념 적용 능력이 드러났다"로 마무리한다.`
  ];
}

function buildTemplateOutputExample(item, payload, structureMatches) {
  const title = normalizeText(item?.title || "");
  const keyword = payload.keyword || "주제";
  const major = payload.major || "희망 진로";

  if (title.includes("산화") || title.includes("환원") || title.includes("실험")) {
    return `${keyword} 관련 반응 또는 소재 차이를 비교하고 이를 전기화학 개념으로 해석하여 성능 차이를 설명함으로써 ${major} 진로와 연결되는 탐구 설계 역량을 드러냄.`;
  }

  if (title.includes("빅데이터") || title.includes("데이터")) {
    return `${keyword} 관련 데이터를 비교 지표 중심으로 재구성하고 이를 교과 개념으로 해석하여 결과 차이를 설명함으로써 자료 분석 및 해석 역량을 드러냄.`;
  }

  if (title.includes("신소재") || title.includes("구조")) {
    return `${keyword}와 연결되는 소재 사례를 비교하고 구조·기능 차이를 교과 개념으로 해석하여 활용 가능성을 설명함으로써 진로 연계 탐구 역량을 드러냄.`;
  }

  return `${keyword} 관련 사례를 동일 기준으로 비교하고 이를 교과 개념으로 해석하여 결과 의미를 설명함으로써 탐구 설계 역량을 드러냄.`;
}

function buildTemplateUpgradePoint(item, payload, structureMatches) {
  const title = normalizeText(item?.title || "");
  if (title.includes("산화") || title.includes("환원") || title.includes("실험")) {
    return "온도·시간·전해질 조건 중 하나를 추가해 결과 차이가 왜 발생했는지 원인 가설까지 붙이면 상위권 탐구로 올라간다.";
  }
  if (title.includes("빅데이터") || title.includes("데이터")) {
    return "비교 지표를 한 개 더 추가하거나 기간별 변화까지 보면 단순 정리가 아니라 분석형 탐구로 확장된다.";
  }
  if (title.includes("신소재") || title.includes("구조")) {
    return "기존 소재와 대체 소재를 한 번 더 비교해 개선 방향까지 제시하면 진로 연계성이 더 강해진다.";
  }
  return "변수 한 개를 더 추가하거나 결과 차이의 원인 가설까지 붙이면 수행평가 완성도가 높아진다.";
}

function normalizeTemplateForAdmissions(item, payload, structureMatches) {
  return {
    title: item?.title || "",
    type: item?.type || "",
    whyThisWorks: buildTemplateWhyThisWorks(item, payload, structureMatches),
    executionSteps: buildTemplateExecutionSteps(item, payload, structureMatches),
    writeGuide: buildTemplateWriteGuide(item, payload, structureMatches),
    outputExample: buildTemplateOutputExample(item, payload, structureMatches),
    upgradePoint: buildTemplateUpgradePoint(item, payload, structureMatches),
    evaluationPoints: toArray(item?.evaluation_points).slice(0, 3),
    subjects: toArray(item?.subjects).slice(0, 3)
  };
}

function renderExtensionLibrarySection(matches, structureMatches = [], payload = null) {
  const el = $("extensionLibrarySection");
  if (!el) return;

  if (!Array.isArray(matches) || !matches.length || !payload) {
    el.innerHTML = "";
    return;
  }

  const normalized = matches.map(item => normalizeTemplateForAdmissions(item, payload, structureMatches));

  el.innerHTML = `
    <div class="textbook-box">
      <h3>추천 활동 템플릿</h3>
      <div class="textbook-list">
        ${normalized.map(item => `
          <div class="textbook-item">
            <div class="textbook-head">
              <strong>${escapeHtml(item.title)}</strong>
              ${item.type ? `<span>${escapeHtml(item.type)}</span>` : ""}
            </div>

            <div class="textbook-row">
              <b>왜 이 템플릿이 유리한가</b>
              <p>${escapeHtml(item.whyThisWorks)}</p>
            </div>

            <div class="textbook-row">
              <b>학생이 바로 할 일</b>
              <ul>${item.executionSteps.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
            </div>

            <div class="textbook-row">
              <b>보고서에 쓰는 방식</b>
              <ul>${item.writeGuide.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
            </div>

            <div class="textbook-row">
              <b>결과물 예시</b>
              <p>${escapeHtml(item.outputExample)}</p>
            </div>

            <div class="textbook-row">
              <b>한 단계 더 높이려면</b>
              <p>${escapeHtml(item.upgradePoint)}</p>
            </div>

            ${item.evaluationPoints.length ? `
              <div class="textbook-row">
                <b>평가 포인트</b>
                <ul>${item.evaluationPoints.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${item.subjects.length ? `
              <div class="textbook-row">
                <b>연결 과목</b>
                <ul>${item.subjects.map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
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
    const textbookMatches = typeof getTextbookMatches === "function"
      ? await getTextbookMatches(payload)
      : [];
    const structureMatches = typeof getStructureMatches === "function"
      ? await getStructureMatches(payload, apiData, textbookMatches)
      : [];
    const extensionMatches = typeof getExtensionLibraryMatches === "function"
      ? await getExtensionLibraryMatches(payload, apiData, textbookMatches)
      : [];

    window.__lastGenerateDebug = {
      payload,
      apiData,
      textbookMatches,
      structureMatches,
      extensionMatches,
      version: window.__KEYWORD_ENGINE_VERSION || "unknown"
    };

    if (typeof renderResultCards === "function") {
      renderResultCards(apiData, payload, textbookMatches, structureMatches);
    }
    if (typeof renderTextbookSection === "function") {
      renderTextbookSection(textbookMatches, structureMatches);
    }
    if (typeof renderExtensionLibrarySection === "function") {
      renderExtensionLibrarySection(extensionMatches, structureMatches, payload);
    }

    const badge = $("resultModeBadge");
    if (badge) badge.textContent = "admissions-v6";

    const resultWrap = $("resultSection");
    if (resultWrap) resultWrap.style.display = "block";

    return window.__lastGenerateDebug;
  } catch (error) {
    console.error("handleGenerate error:", error);
    window.__lastGenerateDebug = {
      error: error?.message || String(error),
      version: window.__KEYWORD_ENGINE_VERSION || "unknown"
    };
    showError(error.message || "생성 중 오류가 발생했습니다.");
    return window.__lastGenerateDebug;
  } finally {
    setLoading(false);
  }
}
