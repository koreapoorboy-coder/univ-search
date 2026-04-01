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
    .replace(/\"/g, "&quot;")
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

function dedupe(items) {
  return [...new Set(toArray(items).filter(Boolean))];
}

function renderBullets(items, emptyText = "내용이 없습니다.") {
  const arr = toArray(items).filter(Boolean);
  if (!arr.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return `<ul class="bullet-list">${arr.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
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
  ["topSummary", "subjectShell"].forEach(id => {
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
    if (["센서실험형", "데이터분석형", "모델링형", "디지털측정형"].includes(template.type)) score += 4;
  }

  if (normalizeText(context.track).includes("보건") || normalizeText(context.major).includes("간호")) {
    if (["센서실험형", "자유탐구형", "비평탐구형"].includes(template.type)) score += 2;
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

    const ranked = templates
      .map(template => ({ ...template, _score: scoreExtensionTemplate(template, context) }))
      .sort((a, b) => b._score - a._score);

    const positives = ranked.filter(template => template._score > 0).slice(0, 3);
    return positives.length ? positives : ranked.slice(0, 3);
  } catch (error) {
    console.warn("extension library error:", error);
    return [];
  }
}

function inferPrimarySubject(payload, apiResult, textbookMatches, extensionMatches) {
  const subjectPool = [
    ...textbookMatches.map(item => item.subject),
    ...toArray(apiResult.subjectLinks),
    ...extensionMatches.flatMap(item => toArray(item.subjects))
  ].filter(Boolean);

  const normalizedPool = subjectPool.map(normalizeText);

  if (normalizedPool.some(v => v.includes("물리"))) return "물리학";
  if (normalizedPool.some(v => v.includes("화학"))) return "화학";
  if (normalizedPool.some(v => v.includes("생명"))) return "생명과학";
  if (normalizedPool.some(v => v.includes("정보") || v.includes("컴퓨터"))) return "정보";
  if (normalizedPool.some(v => v.includes("지구"))) return "지구과학";

  const major = normalizeText(payload.major);
  if (major.includes("간호") || major.includes("생명")) return "생명과학";
  if (major.includes("화학") || major.includes("배터리") || major.includes("신소재")) return "화학";
  if (major.includes("전기") || major.includes("전자") || major.includes("기계") || major.includes("로봇")) return "물리학";
  if (major.includes("컴퓨터") || major.includes("인공지능") || major.includes("ai")) return "정보";
  return payload.track || "탐구 설계";
}

function buildSubjectDescription(payload, subject) {
  const parts = [payload.keyword, payload.major].filter(Boolean).join(" · ");
  const byStyle = payload.style ? `${payload.style.replace("형", "")} 접근을 바탕으로` : "탐구 활동을 바탕으로";
  return `${parts}를 ${byStyle} 실제 교과 개념과 연결해 해석하고, 결과 차이를 비교할 수 있도록 설계한 ${subject} 중심 탐구입니다.`;
}

function buildStrengthText(payload, apiResult, textbookMatches) {
  const concepts = dedupe(textbookMatches.flatMap(item => toArray(item.core_concepts))).slice(0, 3);
  const conceptText = concepts.length ? `${concepts.join(", ")} 같은 핵심 개념과 연결될 여지가 크다.` : "교과 개념과 전공 관심사를 연결할 출발점이 분명하다.";
  return `${payload.keyword}와 ${payload.major} 관심사가 분명하고, ${payload.grade} 수준에서 ${conceptText}`;
}

function buildImproveText(payload, apiResult, extensionMatches) {
  const firstTemplate = extensionMatches[0];
  const flow = toArray(apiResult.flow).slice(0, 2).join(", ");
  if (firstTemplate) {
    return `${firstTemplate.title}처럼 조건 변화와 결과 차이를 남기는 정량 기록이 들어가면 탐구의 설득력이 더 강해진다.`;
  }
  if (flow) {
    return `${flow}처럼 과정과 결과를 단계별로 남기면 단순 관심 표현이 아니라 실제 탐구 경험으로 보이게 만들 수 있다.`;
  }
  return "관심 주제를 말하는 데서 멈추지 않고, 조건 비교와 결과 해석을 남기는 탐구 기록이 필요하다.";
}

function buildEvidenceList(payload, apiResult, textbookMatches, extensionMatches) {
  const evidence = [];
  evidence.push(`입력 키워드: ${payload.keyword}`);
  evidence.push(`희망 전공/계열: ${payload.major} / ${payload.track}`);

  const subjects = dedupe([
    ...toArray(apiResult.subjectLinks),
    ...textbookMatches.map(item => item.subject)
  ]).slice(0, 3);
  if (subjects.length) {
    evidence.push(`이 탐구가 연결되는 교과: ${subjects.join(", ")}`);
  }

  const firstTopic = textbookMatches.flatMap(item => toArray(item.topic_seeds)).find(Boolean);
  if (firstTopic) {
    evidence.push(`교과서 기반 탐구 출발점: ${firstTopic}`);
  }

  const firstTemplate = extensionMatches[0]?.title;
  if (firstTemplate) {
    evidence.push(`추천 활동 예시 연결: ${firstTemplate}`);
  }

  return evidence.slice(0, 4);
}

function buildPlanCards(payload, apiResult, extensionMatches, textbookMatches) {
  const fallbackFlows = toArray(apiResult.flow);
  const fallbackSteps = toArray(apiResult.steps);
  const textbookTopics = textbookMatches.flatMap(item => toArray(item.topic_seeds));

  if (extensionMatches.length) {
    return extensionMatches.slice(0, 3).map((item, index) => ({
      title: item.title || `추천 활동 ${index + 1}`,
      why: toArray(item.evaluation_points)[0]
        ? `${toArray(item.evaluation_points)[0]}를 보여주기에 좋은 활동이다.`
        : `${payload.major} 관심사를 실제 탐구 흐름으로 바꾸기에 적합하다.`,
      activity: toArray(item.activity_flow).length
        ? toArray(item.activity_flow).slice(0, 3).join(" → ")
        : fallbackFlows.slice(0, 3).join(" → "),
      point: toArray(item.outputs)[0]
        ? `${toArray(item.outputs)[0]} 형태로 결과를 남기면 기록화하기 좋다.`
        : (textbookTopics[index] || `${payload.keyword}를 교과 개념과 연결해 결과 차이를 설명할 수 있다.`)
    }));
  }

  return [0, 1].map(index => ({
    title: fallbackSteps[index] || `추천 탐구 설계 ${index + 1}`,
    why: `${payload.keyword}를 ${payload.major} 방향으로 확장하기 좋은 기본 구조다.`,
    activity: fallbackFlows.slice(0, 3).join(" → ") || "탐구 질문 설정 → 자료/실험 설계 → 결과 정리",
    point: textbookTopics[index] || "교과 개념을 연결해 결과를 설명하면 탐구의 완성도가 올라간다."
  }));
}

function buildSummary(payload, apiResult, subject) {
  const reason = apiResult.reason || `${payload.keyword}를 ${payload.major} 방향으로 확장하는 탐구입니다.`;
  return {
    title: `${payload.keyword} 탐구는 ${subject} 해석으로 끌어올리는 방향이 좋습니다.`,
    desc: reason
  };
}

function renderTopSummary(payload, apiData, subject) {
  const el = $("topSummary");
  if (!el) return;

  const summary = buildSummary(payload, apiData.result || {}, subject);
  el.innerHTML = `
    <div class="summary-kicker">한 줄 총평</div>
    <div class="summary-title">${escapeHtml(summary.title)}</div>
    <p class="summary-desc">${escapeHtml(summary.desc)}</p>
  `;
}

function renderSubjectShell(payload, apiData, textbookMatches, extensionMatches) {
  const el = $("subjectShell");
  if (!el) return;

  const result = apiData.result || {};
  const subject = inferPrimarySubject(payload, result, textbookMatches, extensionMatches);
  const subjectDesc = buildSubjectDescription(payload, subject);
  const strengthText = buildStrengthText(payload, result, textbookMatches);
  const improveText = buildImproveText(payload, result, extensionMatches);
  const evidenceList = buildEvidenceList(payload, result, textbookMatches, extensionMatches);
  const planCards = buildPlanCards(payload, result, extensionMatches, textbookMatches);

  el.innerHTML = `
    <div class="subject-head">
      <div>
        <h3 class="subject-title">${escapeHtml(subject)}</h3>
        <p class="subject-desc">${escapeHtml(subjectDesc)}</p>
      </div>
      <div class="subject-tag">${escapeHtml(payload.major)} 설계</div>
    </div>

    <div class="mini-grid">
      <div class="mini-card good">
        <div class="mini-label">현재 강점</div>
        <div class="mini-body">${escapeHtml(strengthText)}</div>
      </div>
      <div class="mini-card warn">
        <div class="mini-label">보완 관점</div>
        <div class="mini-body">${escapeHtml(improveText)}</div>
      </div>
    </div>

    <div class="evidence-box">
      <h4 class="section-title">현재 입력 기준 해석 근거</h4>
      ${renderBullets(evidenceList)}
    </div>

    <div class="planner-box">
      <h4 class="section-title">세부 실행 설계</h4>
      <div class="planner-grid">
        ${planCards.map(card => `
          <div class="plan-card">
            <div class="plan-title">${escapeHtml(card.title)}</div>
            <div class="plan-block">
              <b>왜 추천하나</b>
              <p>${escapeHtml(card.why)}</p>
            </div>
            <div class="plan-block">
              <b>활동 내용</b>
              <p>${escapeHtml(card.activity)}</p>
            </div>
            <div class="plan-block">
              <b>기대되는 연결 포인트</b>
              <p>${escapeHtml(card.point)}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    ${renderTextbookSection(textbookMatches, result)}
    ${renderTemplateSection(extensionMatches)}

    <div class="evidence-box">
      <h4 class="section-title">총합 메모</h4>
      <p class="summary-desc">${escapeHtml(buildClosingMemo(payload, result, textbookMatches, extensionMatches))}</p>
    </div>
  `;
}

function renderTextbookSection(matches, result) {
  if (!Array.isArray(matches) || !matches.length) return "";

  const topMatches = matches.slice(0, 3);
  return `
    <div class="textbook-box">
      <h4 class="section-title">이 탐구의 교과서 근거</h4>
      <div class="textbook-list">
        ${topMatches.map(item => {
          const subject = item.subject || "";
          const unit = item.unit || "";
          const subunit = item.subunit || item.name || "";
          const concepts = toArray(item.core_concepts || item.coreConcepts).slice(0, 4);
          const points = toArray(item.interpretation_points || item.interpretationPoints).slice(0, 2);
          const topics = toArray(item.topic_seeds || item.topicSeeds).slice(0, 2);

          return `
            <div class="textbook-item">
              <div class="textbook-head">
                <strong>${escapeHtml(subject)}</strong>
                ${unit ? `<span class="pill">${escapeHtml(unit)}</span>` : ""}
                ${subunit ? `<span class="pill">${escapeHtml(subunit)}</span>` : ""}
              </div>
              ${concepts.length ? `
                <div class="plan-block">
                  <b>핵심 개념</b>
                  ${renderBullets(concepts)}
                </div>` : ""}
              ${points.length ? `
                <div class="plan-block">
                  <b>왜 연결되나</b>
                  ${renderBullets(points)}
                </div>` : ""}
              ${topics.length ? `
                <div class="plan-block">
                  <b>바로 이어갈 탐구 씨앗</b>
                  ${renderBullets(topics)}
                </div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderTemplateSection(matches) {
  if (!Array.isArray(matches) || !matches.length) return "";

  return `
    <div class="template-box">
      <h4 class="section-title">바로 적용 가능한 활동 예시</h4>
      <div class="template-list">
        ${matches.slice(0, 3).map(item => `
          <div class="template-item">
            <div class="template-head">
              <strong>${escapeHtml(item.title || "")}</strong>
              ${item.type ? `<span class="pill">${escapeHtml(item.type)}</span>` : ""}
            </div>
            <p class="summary-desc">${escapeHtml(toArray(item.notes)[0] || "실행 시 조건 비교와 결과 해석 중심으로 정리하면 좋습니다.")}</p>
            <div class="meta-strip">
              ${toArray(item.subjects).slice(0, 3).map(v => `<span class="meta-chip">${escapeHtml(v)}</span>`).join("")}
              ${toArray(item.outputs).slice(0, 2).map(v => `<span class="meta-chip">산출물: ${escapeHtml(v)}</span>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function buildClosingMemo(payload, result, textbookMatches, extensionMatches) {
  const subjectText = dedupe(textbookMatches.map(item => item.subject)).slice(0, 2).join(", ");
  const template = extensionMatches[0]?.title;
  if (template && subjectText) {
    return `${payload.keyword}를 단순 관심 수준에서 끝내지 않고, ${subjectText} 개념을 바탕으로 ${template} 같은 활동으로 구체화하면 탐구의 방향과 기록 포인트가 함께 살아납니다.`;
  }
  return `${payload.keyword} 탐구는 무엇을 좋아하는지보다 어떻게 비교하고 해석했는지가 더 중요합니다. 조건 변화, 결과 차이, 교과 개념 연결이 함께 보이도록 정리하는 것이 핵심입니다.`;
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
    const subject = inferPrimarySubject(payload, apiData.result || {}, textbookMatches, extensionMatches);

    renderTopSummary(payload, apiData, subject);
    renderSubjectShell(payload, apiData, textbookMatches, extensionMatches);

    const badge = $("resultModeBadge");
    if (badge) badge.textContent = apiData.mode || "ai";

    const resultWrap = $("resultSection");
    if (resultWrap) resultWrap.style.display = "block";
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
