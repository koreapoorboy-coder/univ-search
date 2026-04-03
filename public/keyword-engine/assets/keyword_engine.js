window.__KEYWORD_ENGINE_VERSION = "admissions-v7-structure";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const EXTENSION_LIBRARY_URL = "seed/extension_library_v2.json";
const STRUCTURE_SEED_URL = "seed/admission_subject_structure_seed.json";
const RECORD_PATTERN_LIBRARY_URL = "seed/record_pattern_library.json";
const ADMISSION_RULES_URL = "seed/admission_rules.json";

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

function tokenize(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return [...new Set(raw.split(/[\/,|·ㆍ>]+|\s+/).map(normalizeText).filter(v => v && v.length >= 2))];
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

function ensureDynamicSection(id, title = "") {
  let el = $(id);
  if (el) return el;

  const anchor = $("extensionLibrarySection") || $("resultSection");
  if (!anchor || !anchor.parentNode) return null;

  el = document.createElement("div");
  el.id = id;
  el.className = "result-card result-card-wide";
  if (title) {
    el.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
  }
  anchor.parentNode.insertBefore(el, anchor);
  return el;
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
    "structureSection",
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

function renderResultCards(apiData, payload = null, textbookMatches = [], structureMatches = []) {
  const result = apiData.result || {};
  const topStructure = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const reasonText = topStructure
    ? `${result.reason || ""} 현재 추천은 ${topStructure.structure_name} 구조를 우선 반영했다.`.trim()
    : result.reason;
  const steps = topStructure && toArray(topStructure.process_steps).length
    ? toArray(topStructure.process_steps).slice(0, 5)
    : result.steps;
  const warnings = [...new Set([
    ...toArray(result.warnings),
    ...toArray(topStructure?.avoid_points).slice(0, 2)
  ])];

  $("reasonCard").innerHTML = `<h3>추천 이유</h3>${renderText(reasonText)}`;
  $("stepsCard").innerHTML = `<h3>탐구 진행 순서</h3>${renderBullets(steps)}`;
  $("flowCard").innerHTML = `<h3>활동 설계 흐름</h3>${renderBullets(result.flow)}`;
  $("approachCard").innerHTML = `<h3>추천 진행 방식</h3>${renderText(result.recommendedApproach)}`;
  $("extensionCard").innerHTML = `<h3>한 단계 더 확장하려면</h3>${renderText(result.extension)}`;
  $("subjectLinksCard").innerHTML = `<h3>관련 교과 연결</h3>${renderBullets(result.subjectLinks)}`;
  $("warningsCard").innerHTML = `<h3>주의할 점</h3>${renderBullets(warnings)}`;

  const badge = $("resultModeBadge");
  if (badge) badge.textContent = apiData.mode || "ai";
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

let extensionLibraryCache = null;
let structureSeedCache = null;
let recordPatternCache = null;
let admissionRulesCache = null;

async function loadExtensionLibrary() {
  if (extensionLibraryCache) return extensionLibraryCache;
  const response = await fetch(EXTENSION_LIBRARY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("확장 활동 라이브러리를 불러오지 못했습니다.");
  extensionLibraryCache = await response.json();
  return extensionLibraryCache;
}

async function loadStructureSeed() {
  if (structureSeedCache) return structureSeedCache;
  const response = await fetch(STRUCTURE_SEED_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("구조 seed를 불러오지 못했습니다.");
  structureSeedCache = await response.json();
  return structureSeedCache;
}

async function loadRecordPatternLibrary() {
  if (recordPatternCache) return recordPatternCache;
  const response = await fetch(RECORD_PATTERN_LIBRARY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("학생부 보정 라이브러리를 불러오지 못했습니다.");
  recordPatternCache = await response.json();
  return recordPatternCache;
}

async function loadAdmissionRules() {
  if (admissionRulesCache) return admissionRulesCache;
  const response = await fetch(ADMISSION_RULES_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("입시 규칙 파일을 불러오지 못했습니다.");
  admissionRulesCache = await response.json();
  return admissionRulesCache;
}

function buildContextTokens(payload, apiData, textbookMatches) {
  return [
    ...tokenize(payload.keyword),
    ...tokenize(payload.track),
    ...tokenize(payload.major),
    ...tokenize(payload.grade),
    ...toArray(apiData?.result?.subjectLinks).flatMap(tokenize),
    ...textbookMatches.flatMap(item => tokenize(item.subject)),
    ...textbookMatches.flatMap(item => tokenize(item.unit)),
    ...textbookMatches.flatMap(item => tokenize(item.subunit)),
    ...textbookMatches.flatMap(item => toArray(item.core_concepts).flatMap(tokenize)),
    ...textbookMatches.flatMap(item => toArray(item.topic_seeds).flatMap(tokenize))
  ].filter(Boolean);
}

function scoreTokenList(list, contextTokens, exactWeight, partialWeight) {
  let score = 0;
  const normalizedList = toArray(list).flatMap(tokenize).filter(Boolean);

  normalizedList.forEach(seed => {
    contextTokens.forEach(token => {
      if (!seed || !token) return;
      if (seed === token) score += exactWeight;
      else if (seed.includes(token) || token.includes(seed)) score += partialWeight;
    });
  });
  return score;
}

function selectClusterRule(payload, apiData, textbookMatches, admissionRules) {
  const rules = Array.isArray(admissionRules?.cluster_rules) ? admissionRules.cluster_rules : [];
  if (!rules.length) return null;

  const contextTokens = buildContextTokens(payload, apiData, textbookMatches);
  const ranked = rules
    .map(rule => ({
      ...rule,
      _score:
        scoreTokenList(rule.label, contextTokens, 10, 4) +
        scoreTokenList(rule.recurring_links, contextTokens, 8, 4) +
        scoreTokenList(rule.recurring_methods, contextTokens, 7, 3) +
        scoreTokenList(rule.engine_rule, contextTokens, 3, 1)
    }))
    .filter(rule => rule._score > 0)
    .sort((a, b) => b._score - a._score);

  return ranked[0] || null;
}

function getGradeModifier(payload, admissionRules) {
  const key = String(payload?.grade || '').trim();
  if (!key) return null;
  const modifiers = admissionRules?.grade_level_modifiers || {};
  return modifiers[key] || modifiers[key.replace('학년', '')] || null;
}

function scoreStructureEntry(entry, payload, apiData, textbookMatches, clusterRule = null, gradeModifier = null) {
  const contextTokens = buildContextTokens(payload, apiData, textbookMatches);
  let score = 0;

  score += scoreTokenList(entry.seed_keywords, contextTokens, 14, 7);
  score += scoreTokenList(entry.concept_links, contextTokens, 10, 5);
  score += scoreTokenList(entry.track, contextTokens, 12, 6);
  score += scoreTokenList(entry.subject, contextTokens, 12, 6);
  score += scoreTokenList(entry.when_to_use, contextTokens, 4, 2);

  const payloadGrade = normalizeText(payload.grade);
  if (payloadGrade && tokenize(entry.grade).includes(payloadGrade)) score += 6;

  const payloadMajor = normalizeText(payload.major);
  if (payloadMajor && tokenize(entry.track).includes(payloadMajor)) score += 4;

  if (clusterRule) {
    score += scoreTokenList(clusterRule.label, tokenize(entry.track).concat(tokenize(entry.when_to_use)), 6, 3);
    score += scoreTokenList(clusterRule.recurring_links, toArray(entry.concept_links).flatMap(tokenize), 5, 2);
    score += scoreTokenList(clusterRule.recurring_methods, toArray(entry.evidence_style).flatMap(tokenize), 5, 2);
  }

  if (gradeModifier) {
    score += scoreTokenList(gradeModifier.recommended_methods, toArray(entry.evidence_style).flatMap(tokenize), 4, 2);
    score += scoreTokenList(gradeModifier.avoid, toArray(entry.avoid_points).flatMap(tokenize), 2, 1);
  }

  return score;
}

function scoreRecordPatternEntry(entry, payload, apiData, textbookMatches, clusterRule = null, gradeModifier = null) {
  const contextTokens = buildContextTokens(payload, apiData, textbookMatches);
  let score = 0;
  score += scoreTokenList(entry.fit_keywords, contextTokens, 12, 6);
  score += scoreTokenList(entry.fit_subjects, contextTokens, 10, 5);
  score += scoreTokenList(entry.track, contextTokens, 8, 4);
  score += scoreTokenList(entry.preferred_styles, [normalizeText(payload.style)], 8, 4);

  const payloadGrade = normalizeText(payload.grade);
  if (payloadGrade && toArray(entry.grade).map(normalizeText).includes(payloadGrade)) score += 8;
  score += Number(entry.weight || 0);

  if (clusterRule) {
    score += scoreTokenList(clusterRule.recurring_links, toArray(entry.fit_subjects).flatMap(tokenize), 4, 2);
    score += scoreTokenList(clusterRule.recurring_methods, toArray(entry.preferred_styles).flatMap(tokenize), 4, 2);
  }

  if (gradeModifier) {
    score += scoreTokenList(gradeModifier.recommended_methods, toArray(entry.preferred_styles).flatMap(tokenize), 4, 2);
    score += scoreTokenList(gradeModifier.avoid, toArray(entry.avoid_points).flatMap(tokenize), 1, 1);
  }

  return score;
}

function mergeStructureAndPattern(structureMatch, patternMatch, clusterRule = null, gradeModifier = null) {
  return {
    structure_id: structureMatch?.structure_id || patternMatch?.pattern_id || "fallback_structure",
    structure_name: structureMatch?.structure_name || patternMatch?.label || "기본 비교-해석형",
    track: structureMatch?.track || toArray(patternMatch?.track)[0] || clusterRule?.label || "",
    subject: structureMatch?.subject || toArray(patternMatch?.fit_subjects)[0] || "",
    cluster_label: clusterRule?.label || "",
    grade_depth_rule: gradeModifier?.depth_rule || "",
    grade_recommended_methods: toArray(gradeModifier?.recommended_methods),
    grade_avoid: toArray(gradeModifier?.avoid),
    core_question_frame: structureMatch?.core_question_frame || "이 주제를 어떤 기준으로 비교하고 어떻게 해석할 수 있는가?",
    process_steps: toArray(structureMatch?.process_steps).length
      ? toArray(structureMatch.process_steps)
      : toArray(patternMatch?.recommended_structure),
    concept_links: [...new Set([...toArray(structureMatch?.concept_links), ...toArray(clusterRule?.recurring_links).slice(0,2)])],
    evidence_style: [...new Set([...toArray(structureMatch?.evidence_style), ...toArray(clusterRule?.recurring_methods).slice(0,2)])],
    good_output_forms: [...new Set([...toArray(structureMatch?.good_output_forms), ...toArray(patternMatch?.outputs)])],
    high_score_signals: [...new Set([
      ...toArray(structureMatch?.high_score_signals),
      ...toArray(patternMatch?.student_record_signals)
    ])],
    avoid_points: [...new Set([
      ...toArray(structureMatch?.avoid_points),
      ...toArray(patternMatch?.avoid_points),
      ...toArray(gradeModifier?.avoid)
    ])],
    record_pattern_label: patternMatch?.label || "",
    _structure_score: structureMatch?._score || 0,
    _pattern_score: patternMatch?._score || 0,
    _cluster_score: clusterRule?._score || 0,
    _score: (structureMatch?._score || 0) + (patternMatch?._score || 0) + Math.min(clusterRule?._score || 0, 18)
  };
}

async function getStructureMatches(payload, apiData, textbookMatches) {
  try {
    const structureSeed = await loadStructureSeed();
    const recordPatternLibrary = await loadRecordPatternLibrary();
    const admissionRules = await loadAdmissionRules();

    const structureEntries = Array.isArray(structureSeed?.entries) ? structureSeed.entries : [];
    const recordPatterns = Array.isArray(recordPatternLibrary?.entries) ? recordPatternLibrary.entries : [];
    const clusterRule = selectClusterRule(payload, apiData, textbookMatches, admissionRules);
    const gradeModifier = getGradeModifier(payload, admissionRules);

    const scoredStructures = structureEntries
      .map(entry => ({ ...entry, _score: scoreStructureEntry(entry, payload, apiData, textbookMatches, clusterRule, gradeModifier) }))
      .filter(entry => entry._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 3);

    const scoredPatterns = recordPatterns
      .map(entry => ({ ...entry, _score: scoreRecordPatternEntry(entry, payload, apiData, textbookMatches, clusterRule, gradeModifier) }))
      .filter(entry => entry._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 3);

    if (!scoredStructures.length && !scoredPatterns.length && !clusterRule && !gradeModifier) return [];

    const baseStructures = scoredStructures.length ? scoredStructures : [null];
    const basePatterns = scoredPatterns.length ? scoredPatterns : [null];

    const merged = [];
    for (const s of baseStructures) {
      for (const p of basePatterns) {
        merged.push(mergeStructureAndPattern(s, p, clusterRule, gradeModifier));
      }
    }

    return merged
      .sort((a, b) => b._score - a._score)
      .filter((item, index, arr) => arr.findIndex(v => v.structure_id === item.structure_id && v.record_pattern_label === item.record_pattern_label) === index)
      .slice(0, 3);
  } catch (error) {
    console.warn("structure matcher error:", error);
    return [];
  }
}

function buildStructureWhyThisWorks(structureMatch, payload) {
  const structureName = structureMatch?.structure_name || "기본 비교-해석형";
  const patternLabel = structureMatch?.record_pattern_label || "학생부 현실 보정";
  const cluster = structureMatch?.cluster_label ? `${structureMatch.cluster_label} 계열 관점` : "진로 관점";
  return `${structureName}을 중심으로 ${patternLabel}과 ${cluster}을 함께 반영하면 ${payload.keyword}를 단순 설명이 아니라 고등학생 수행평가에 맞는 흐름으로 정리할 수 있다.`;
}

function renderStructureSection(structureMatches, payload) {
  const el = ensureDynamicSection("structureSection");
  if (!el) return;

  if (!Array.isArray(structureMatches) || !structureMatches.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="textbook-box">
      <h3>추천 구조 매칭</h3>
      <div class="textbook-list">
        ${structureMatches.map(item => `
          <div class="textbook-item structure-item">
            <div class="textbook-head">
              <strong>${escapeHtml(item.structure_name || "")}</strong>
              <div class="inline-badges">
                ${item.record_pattern_label ? `<span>${escapeHtml(item.record_pattern_label)}</span>` : ""}
                ${item.cluster_label ? `<span>${escapeHtml(item.cluster_label)}</span>` : ""}
              </div>
            </div>

            <div class="score-line">구조 점수 ${escapeHtml(item._score || 0)}</div>

            <div class="textbook-row">
              <b>핵심 질문 틀</b>
              <p>${escapeHtml(item.core_question_frame || "")}</p>
            </div>

            <div class="textbook-row">
              <b>이 구조가 맞는 이유</b>
              <p>${escapeHtml(buildStructureWhyThisWorks(item, payload))}</p>
            </div>

            ${item.grade_depth_rule ? `
              <div class="textbook-row">
                <b>학년 보정</b>
                <p>${escapeHtml(item.grade_depth_rule)}</p>
              </div>` : ""}

            ${toArray(item.process_steps).length ? `
              <div class="textbook-row">
                <b>권장 전개 순서</b>
                <ul>${toArray(item.process_steps).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.good_output_forms).length ? `
              <div class="textbook-row">
                <b>잘 맞는 산출물</b>
                <ul>${toArray(item.good_output_forms).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.high_score_signals).length ? `
              <div class="textbook-row">
                <b>좋게 보이는 신호</b>
                <ul>${toArray(item.high_score_signals).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}

            ${toArray(item.avoid_points).length ? `
              <div class="textbook-row">
                <b>피해야 할 점</b>
                <ul>${toArray(item.avoid_points).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
              </div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function scoreExtensionTemplate(template, context) {
  let score = 0;

  const haystack = [
    context.keyword,
    context.track,
    context.major,
    ...(context.subjectLinks || []),
    ...(context.textbookSubjects || []),
    ...(context.textbookTopics || []),
    ...(context.structureSignals || [])
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
    if (methodTags.map(normalizeText).some(item => item.includes(m) || m.includes(item))) score += 2;
  });

  themeTags.forEach(tag => {
    const t = normalizeText(tag);
    if (haystack.some(item => item.includes(t) || t.includes(item))) score += 3;
  });

  subjects.forEach(subject => {
    const s = normalizeText(subject);
    if ((context.subjectLinks || []).map(normalizeText).some(item => item.includes(s) || s.includes(item))) score += 2;
  });

  if ((context.structureSignals || []).map(normalizeText).some(v => v.includes("데이터") || v.includes("효율"))) {
    if (template.type === "데이터분석형" || template.type === "시뮬레이션형") score += 4;
  }

  if ((context.structureSignals || []).map(normalizeText).some(v => v.includes("질환") || v.includes("안전성"))) {
    if (template.type === "자유탐구형" || template.type === "비평탐구형" || template.type === "데이터분석형") score += 3;
  }

  return score;
}

async function getExtensionLibraryMatches(payload, apiData, textbookMatches, structureMatches = []) {
  try {
    const library = await loadExtensionLibrary();
    const templates = Array.isArray(library?.templates) ? library.templates : [];
    if (!templates.length) return [];

    const structureSignals = structureMatches.length ? [
      structureMatches[0].structure_name,
      ...toArray(structureMatches[0].concept_links),
      ...toArray(structureMatches[0].evidence_style),
      ...toArray(structureMatches[0].record_pattern_label)
    ] : [];

    const context = {
      keyword: payload.keyword,
      track: payload.track,
      major: payload.major,
      style: payload.style,
      subjectLinks: toArray(apiData?.result?.subjectLinks),
      textbookSubjects: textbookMatches.map(item => item.subject).filter(Boolean),
      textbookTopics: textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).filter(Boolean),
      structureSignals
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

function buildTemplateWhyThisWorks(item, payload, structureMatches) {
  const s = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  if (s?.structure_name) {
    return `${s.structure_name} 구조를 따라가면 비교 기준과 해석 기준이 먼저 보이기 때문에 ${payload.keyword}가 설명형이 아니라 설계형 탐구로 정리된다.`;
  }
  return `${payload.keyword}를 단순 설명이 아니라 비교-해석 구조로 정리할 수 있어 수행평가에서 구조가 선명하게 읽힌다.`;
}

function buildTemplateExecutionSteps(item, payload, structureMatches) {
  const s = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  if (toArray(s?.process_steps).length) {
    return toArray(s.process_steps).slice(0, 5).map(step => `${step}`);
  }

  const title = normalizeText(item?.title || "");
  const keyword = payload.keyword || "주제";
  const major = payload.major || "희망 진로";

  if (title.includes("데이터")) {
    return [
      `${keyword}와 관련된 공개 데이터나 기사 자료를 2~3개 수집한다.`,
      `비교할 지표를 먼저 정하고 표로 정리한다.`,
      `기간·조건·사례별 차이를 그래프나 비교표로 나타낸다.`,
      `차이가 나타난 이유를 교과 개념으로 해석한다.`,
      `${major} 진로와 연결되는 시사점을 한 문장으로 정리한다.`
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
  const s = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const keyword = payload.keyword || "주제";

  if (s?.structure_name?.includes("안전성") || toArray(s?.avoid_points).some(v => normalizeText(v).includes("의학"))) {
    return [
      `"${keyword}와 관련된 생리 기전 또는 작용 원리를 먼저 정리하였다"라고 시작한다.`,
      `"사례 차이를 안전성·영향 요소 기준으로 비교하였다"라고 연결한다.`,
      `"환자 또는 보건 현장에서의 의미를 해석하였다"로 마무리한다.`
    ];
  }

  return [
    `"${keyword} 관련 사례를 동일 기준으로 비교하였다"라고 시작한다.`,
    `"차이를 교과 개념으로 해석하였다"라고 결과를 연결한다.`,
    `"이 과정에서 탐구 설계 및 개념 적용 능력이 드러났다"로 마무리한다.`
  ];
}

function buildTemplateOutputExample(item, payload, structureMatches) {
  const s = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const keyword = payload.keyword || "주제";
  const major = payload.major || "희망 진로";

  if (s?.structure_name) {
    return `${keyword}를 ${s.structure_name} 구조로 정리하여 비교 기준과 해석 기준을 선명하게 제시하고, 이를 통해 ${major} 진로와 연결되는 탐구 설계 역량을 드러냄.`;
  }

  return `${keyword} 관련 사례를 동일 기준으로 비교하고 이를 교과 개념으로 해석하여 결과 의미를 설명함으로써 탐구 설계 역량을 드러냄.`;
}

function buildTemplateUpgradePoint(item, payload, structureMatches) {
  const s = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  if (toArray(s?.avoid_points).some(v => normalizeText(v).includes("비교기준"))) {
    return "비교 기준을 한 개 더 추가하고 결과 차이의 원인 가설까지 붙이면 수행평가 완성도가 높아진다.";
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
    const textbookMatches = await getTextbookMatches(payload);
    const structureMatches = await getStructureMatches(payload, apiData, textbookMatches);
    const extensionMatches = await getExtensionLibraryMatches(payload, apiData, textbookMatches, structureMatches);

    window.__lastGenerateDebug = {
      payload,
      apiData,
      textbookMatches,
      structureMatches,
      extensionMatches,
      version: window.__KEYWORD_ENGINE_VERSION || "unknown"
    };

    renderResultCards(apiData);
    renderTextbookSection(textbookMatches);
    renderStructureSection(structureMatches, payload);
    renderExtensionLibrarySection(extensionMatches, structureMatches, payload);

    const badge = $("resultModeBadge");
    if (badge) badge.textContent = "admissions-v7-structure";

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
window.getStructureMatches = getStructureMatches;
