window.__KEYWORD_ENGINE_VERSION = "admissions-v13-reference-seed";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const EXTENSION_LIBRARY_URL = "seed/extension_library_v2.json";
const STRUCTURE_SEED_URL = "seed/admission_subject_structure_seed.json";
const RECORD_PATTERN_LIBRARY_URL = "seed/record_pattern_library.json";
const ADMISSION_RULES_URL = "seed/admission_rules.json";
const MAJOR_KEYWORD_URL = "seed/major_keyword.json";
const PRIORITY_KEYWORD_URL = "seed/priority_keyword.json";
const ASSESSMENT_REFERENCE_URL = "seed/reference/assessment_reference_seed.json";

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


function containsAnyToken(value, tokens = []) {
  const norm = normalizeText(value || '');
  return tokens.some(token => {
    const t = normalizeText(token);
    return t && (norm.includes(t) || t.includes(norm));
  });
}

function isGrade1ResearchPriority(payload = {}) {
  const grade = String(payload.grade || '');
  if (!(grade.includes('1') || grade.includes('고1'))) return false;
  const tokens = ['이차전지', '배터리', '반도체', '신소재', '전기차', '전고체'];
  const combined = [payload.keyword, payload.major, payload.track].filter(Boolean).join(' ');
  return containsAnyToken(combined, tokens);
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
    "assessmentReferenceSection",
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
let majorKeywordCache = null;
let priorityKeywordCache = null;
let assessmentReferenceCache = null;

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

async function loadMajorKeywordMap() {
  if (majorKeywordCache) return majorKeywordCache;
  const response = await fetch(MAJOR_KEYWORD_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("전공 키워드 맵을 불러오지 못했습니다.");
  majorKeywordCache = await response.json();
  return majorKeywordCache;
}

async function loadPriorityKeywords() {
  if (priorityKeywordCache) return priorityKeywordCache;
  const response = await fetch(PRIORITY_KEYWORD_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("우선 키워드 파일을 불러오지 못했습니다.");
  priorityKeywordCache = await response.json();
  return priorityKeywordCache;
}

async function loadAssessmentReferenceSeed() {
  if (assessmentReferenceCache) return assessmentReferenceCache;
  try {
    const response = await fetch(ASSESSMENT_REFERENCE_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("assessment reference seed not found");
    assessmentReferenceCache = await response.json();
    return assessmentReferenceCache;
  } catch (error) {
    console.warn("assessment reference seed load skipped:", error);
    assessmentReferenceCache = {};
    return assessmentReferenceCache;
  }
}

function normalizeSubjectName(value) {
  const v = String(value || '').trim();
  const map = {
    '공통영어': '공통영어1',
    '공통수학': '공통수학1',
    '통합사회': '통합사회1',
    '공통국어': '공통국어1',
    '통합과학': '통합과학1',
    '과학탐구실험': '과학탐구실험1'
  };
  return map[v] || v;
}

function getAssessmentGradeBucket(payload = {}) {
  const grade = String(payload.grade || '');
  if (grade.includes('1') || grade.includes('고1')) return 'grade_1_semester_1';
  if (grade.includes('2') || grade.includes('고2')) return 'grade_2_semester_1';
  if (grade.includes('3') || grade.includes('고3')) return 'grade_3_semester_1';
  return 'grade_1_semester_1';
}

function modeKeyToLabel(key) {
  const labels = {
    research: '자료·조사형',
    analysis: '자료분석형',
    presentation: '발표형',
    experiment: '실험형'
  };
  return labels[key] || key;
}

function buildAssessmentReferenceContext(seed, payload = {}, apiData = {}, textbookMatches = [], structureMatches = []) {
  const bucketKey = getAssessmentGradeBucket(payload);
  const bucket = seed?.[bucketKey] || {};
  const subjectCandidates = [
    ...toArray(apiData?.result?.subjectLinks).map(normalizeSubjectName),
    ...toArray(textbookMatches).map(item => normalizeSubjectName(item.subject)),
    ...toArray(structureMatches[0]?.concept_links).map(normalizeSubjectName)
  ].filter(Boolean);

  const matchedSubjects = [...new Set(subjectCandidates.filter(subject => bucket[subject]))];
  const entries = matchedSubjects.map(subject => ({ subject, ...(bucket[subject] || {}) })).filter(item => item.subject);

  const mergedBias = { research: 0, analysis: 0, presentation: 0, experiment: 0 };
  entries.forEach(entry => {
    const bias = entry.reality_bias || {};
    Object.keys(mergedBias).forEach(key => {
      mergedBias[key] += Number(bias[key] || 0);
    });
  });

  const preferredOutputs = [...new Set(entries.flatMap(entry => toArray(entry.preferred_outputs)).filter(Boolean))];
  const hints = [...new Set(entries.flatMap(entry => toArray(entry.school_reality_hint)).filter(Boolean))];
  const commonActivities = [...new Set(entries.flatMap(entry => toArray(entry.common_activity_types)).filter(Boolean))];

  const orderedModes = Object.entries(mergedBias)
    .sort((a, b) => b[1] - a[1])
    .filter(([, value]) => value > 0)
    .map(([key]) => key);

  return {
    bucketKey,
    matchedSubjects,
    entries,
    mergedBias,
    preferredOutputs,
    hints,
    commonActivities,
    orderedModes
  };
}

function renderAssessmentReferenceSection(referenceContext) {
  const el = ensureDynamicSection('assessmentReferenceSection');
  if (!el) return;

  if (!referenceContext || !referenceContext.matchedSubjects || !referenceContext.matchedSubjects.length) {
    el.innerHTML = '';
    return;
  }

  const topModes = toArray(referenceContext.orderedModes).slice(0, 3).map(modeKeyToLabel);

  el.innerHTML = `
    <div class="textbook-box">
      <h3>수행평가 현실성 참고</h3>
      <div class="template-note">이 섹션은 학교 맞춤 고정값이 아니라, 현재 학년·과목에서 자주 보이는 수행 형식을 <b>reference_only</b>로 약하게 반영한 참고값입니다.</div>
      <div class="textbook-row">
        <b>참고 과목</b>
        <ul>${referenceContext.matchedSubjects.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
      </div>
      ${topModes.length ? `
      <div class="textbook-row">
        <b>자주 보이는 방식</b>
        <p>${escapeHtml(topModes.join(' → '))}</p>
      </div>` : ''}
      ${referenceContext.preferredOutputs.length ? `
      <div class="textbook-row">
        <b>자주 보이는 산출물</b>
        <ul>${referenceContext.preferredOutputs.slice(0, 6).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
      </div>` : ''}
      ${referenceContext.hints.length ? `
      <div class="textbook-row">
        <b>현실성 힌트</b>
        <ul>${referenceContext.hints.slice(0, 6).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  `;
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
    raw_basis_summary: patternMatch?.raw_basis_summary || "",
    source_examples_count: Number(patternMatch?.source_examples_count || 0),
    recommended_mode_order: toArray(patternMatch?.recommended_mode_order),
    observed_modes: patternMatch?.observed_modes || {},
    school_fit_note: patternMatch?.school_fit_note || "",
    mode_reason: toArray(patternMatch?.mode_reason),
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

            ${item.raw_basis_summary ? `
              <div class="textbook-row">
                <b>실제 학생부 보정 근거</b>
                <p>${escapeHtml(item.raw_basis_summary)}${item.source_examples_count ? ` (원문 예시 ${item.source_examples_count}건 반영)` : ""}</p>
              </div>` : ''}

            ${toArray(item.recommended_mode_order).length ? `
              <div class="textbook-row">
                <b>방식 우선순위</b>
                <p>${escapeHtml(buildModePriorityText(item))}</p>
              </div>` : ""}
            ${item.school_fit_note ? `
              <div class="textbook-row">
                <b>학교 현실 보정</b>
                <p>${escapeHtml(item.school_fit_note)}</p>
              </div>` : ""}
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


function normalizeModeKey(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (v.includes("실험") || v.includes("측정")) return "experiment";
  if (v.includes("데이터") || v.includes("그래프") || v.includes("통계") || v.includes("보고서") || v.includes("발표")) return "data_analysis";
  if (v.includes("설계") || v.includes("제작") || v.includes("시스템") || v.includes("프로젝트")) return "design";
  if (v.includes("모델링") || v.includes("시뮬레이션") || v.includes("수식")) return "modeling";
  if (v.includes("사회") || v.includes("윤리") || v.includes("정책") || v.includes("문제해결") || v.includes("논증") || v.includes("비평")) return "social_issue";
  return v;
}

function templateToMode(template) {
  const candidates = [
    template?.type,
    ...toArray(template?.method_tags),
    ...toArray(template?.thinking_tags),
    ...toArray(template?.outputs)
  ].map(normalizeModeKey).filter(Boolean);

  const preferred = ["experiment", "data_analysis", "design", "modeling", "social_issue"];
  for (const key of preferred) {
    if (candidates.includes(key)) return key;
  }

  const rawType = normalizeText(template?.type);
  if (rawType.includes("자유탐구")) return "data_analysis";
  return "data_analysis";
}

function getTopMode(structureMatches = []) {
  const top = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  return top && Array.isArray(top.recommended_mode_order) && top.recommended_mode_order.length
    ? top.recommended_mode_order[0]
    : "data_analysis";
}

function buildModePriorityText(structureMatch) {
  const order = toArray(structureMatch?.recommended_mode_order);
  if (!order.length) return "";
  const modeLabels = {
    data_analysis: "자료분석형",
    design: "설계·제작형",
    modeling: "모델링형",
    social_issue: "사회문제해결형",
    experiment: "실험형"
  };
  return order.slice(0, 3).map(key => modeLabels[key] || key).join(" → ");
}

function buildModeRecommendation(structureMatches = [], payload = {}) {
  const top = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const labels = {
    data_analysis: "자료·조사형",
    design: "설계·제작형",
    modeling: "모델링형",
    social_issue: "사회문제해결형",
    experiment: "실험형"
  };

  if (!top) {
    return {
      primary: "자료·조사형",
      secondary: ["설계·제작형", "모델링형"],
      reason: ["학교 현실을 고려하면 실험보다 자료 조사와 비교 해석이 기본값으로 더 안전하다."]
    };
  }

  let order = toArray(top.recommended_mode_order);
  let reason = [...toArray(top.mode_reason), top.school_fit_note].filter(Boolean);

  if (isGrade1ResearchPriority(payload)) {
    order = ['data_analysis', 'design', 'modeling', 'social_issue', 'experiment'];
    reason = [
      '1학년의 이차전지·반도체·신소재 주제는 실험보다 자료 조사와 비교 설명형이 더 자연스럽다.',
      '학교 현실상 바로 측정 실험으로 가기보다 기사·도표·기술 사례를 정리하는 방식이 안정적이다.',
      '개념 1~2개를 정확히 설명하고 장단점·안전성·활용성을 비교하는 흐름이 학생부에도 더 잘 남는다.'
    ];
  }

  return {
    primary: labels[order[0]] || "자료·조사형",
    secondary: order.slice(1, 3).map(key => labels[key] || key),
    reason: reason.slice(0, 3)
  };
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
  const templateMode = templateToMode(template);
  const modeOrder = toArray(context.modeOrder);
  const explicitStyle = normalizeText(context.style || "");
  const styleMode = normalizeModeKey(explicitStyle);

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
    if (explicitStyle && explicitStyle.includes(m)) score += 5;
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
    if (templateMode === "data_analysis" || templateMode === "modeling") score += 5;
  }

  if ((context.structureSignals || []).map(normalizeText).some(v => v.includes("질환") || v.includes("안전성"))) {
    if (templateMode === "data_analysis" || templateMode === "social_issue") score += 4;
  }

  if (modeOrder.length) {
    const rank = modeOrder.indexOf(templateMode);
    if (rank === 0) score += 14;
    else if (rank === 1) score += 8;
    else if (rank === 2) score += 4;
    else score -= 2;
  }

  if (!styleMode || styleMode === "data_analysis" || styleMode === "design" || styleMode === "modeling" || styleMode === "social_issue") {
    if (templateMode === "experiment") score -= 8;
  }

  if (isGrade1ResearchPriority(context)) {
    if (templateMode === "experiment") score -= 18;
    if (templateMode === "data_analysis") score += 14;
    if (templateMode === "design") score += 8;
    if (templateMode === "modeling") score += 5;
  }

  if (styleMode && templateMode === styleMode) score += 10;
  if (context.primaryMode && templateMode === context.primaryMode) score += 8;

  const assessmentBias = context.assessmentBias || {};
  if (templateMode === "data_analysis") score += Number(assessmentBias.analysis || 0) * 2 + Number(assessmentBias.research || 0);
  if (templateMode === "design") score += Number(assessmentBias.research || 0);
  if (templateMode === "social_issue") score += Number(assessmentBias.research || 0) + Number(assessmentBias.presentation || 0);
  if (templateMode === "modeling") score += Number(assessmentBias.analysis || 0);
  if (templateMode === "experiment") score += Number(assessmentBias.experiment || 0) * 1.5 - Number(assessmentBias.research || 0) * 0.5;

  const preferredOutputs = (context.assessmentPreferredOutputs || []).map(normalizeText);
  const templateOutputs = toArray(template.outputs).map(normalizeText);
  if (preferredOutputs.length && templateOutputs.some(v => preferredOutputs.some(p => v.includes(p) || p.includes(v)))) {
    score += 4;
  }

  return score;
}

async function getExtensionLibraryMatches(payload, apiData, textbookMatches, structureMatches = [], assessmentReferenceContext = null) {
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

    const topStructure = structureMatches[0] || null;
    const context = {
      keyword: payload.keyword,
      track: payload.track,
      major: payload.major,
      style: payload.style,
      subjectLinks: toArray(apiData?.result?.subjectLinks),
      textbookSubjects: textbookMatches.map(item => item.subject).filter(Boolean),
      textbookTopics: textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).filter(Boolean),
      structureSignals,
      modeOrder: toArray(topStructure?.recommended_mode_order),
      primaryMode: getTopMode(structureMatches),
      grade: payload.grade,
      assessmentBias: assessmentReferenceContext?.mergedBias || {},
      assessmentPreferredOutputs: assessmentReferenceContext?.preferredOutputs || []
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
              ${item.templateMode ? `<span>${escapeHtml(buildModePriorityText({ recommended_mode_order: [item.templateMode] }))}</span>` : ""}
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


/* ===== admissions-v9 structure major override ===== */

async function buildAdvancedSignals(payload) {
  try {
    const [majorMap, priorityMap] = await Promise.all([
      loadMajorKeywordMap(),
      loadPriorityKeywords()
    ]);

    const majorSeeds = toArray(majorMap?.[payload.major] || []);
    const prioritySeeds = toArray(priorityMap?.phase1_high_priority || []);
    const payloadTokens = [payload.keyword, payload.track, payload.major].flatMap(tokenize);

    const matchedMajorSeeds = majorSeeds.filter(seed => {
      const n = normalizeText(seed);
      return payloadTokens.some(token => token && (n.includes(token) || token.includes(n)));
    }).slice(0, 12);

    const matchedPrioritySeeds = prioritySeeds.filter(seed => {
      const n = normalizeText(seed);
      return payloadTokens.some(token => token && (n.includes(token) || token.includes(n)));
    }).slice(0, 10);

    return { matchedMajorSeeds, matchedPrioritySeeds };
  } catch (error) {
    console.warn('advanced signal load error:', error);
    return { matchedMajorSeeds: [], matchedPrioritySeeds: [] };
  }
}

function buildStructureSummary(topStructure, apiData, payload, textbookMatches) {
  const result = apiData?.result || {};
  if (!topStructure) {
    return {
      mainApproach: result.recommendedApproach || '비교 기준과 해석 기준을 먼저 세우는 기본 탐구형',
      outputFocus: toArray(result.subjectLinks).slice(0, 3),
      checkpoint: toArray(result.warnings).slice(0, 3)
    };
  }

  return {
    mainApproach: `${topStructure.structure_name}을 우선 적용하고 ${topStructure.record_pattern_label || '학생부 일반 패턴'}으로 현실 보정`,
    outputFocus: toArray(topStructure.good_output_forms).slice(0, 3),
    checkpoint: [...new Set([...toArray(topStructure.avoid_points), ...toArray(topStructure.grade_avoid)])].slice(0, 3)
  };
}

function renderSummarySection(apiData, payload, textbookMatches, structureMatches) {
  const el = ensureDynamicSection('summarySection');
  if (!el) return;
  const topStructure = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const summary = buildStructureSummary(topStructure, apiData, payload, textbookMatches);
  const modeRec = buildModeRecommendation(structureMatches, payload);
  el.innerHTML = `
    <h3>추천 설계 요약</h3>
    <div class="summary-strip">
      <div class="summary-mini">
        <b>우선 적용 구조</b>
        <p>${escapeHtml(summary.mainApproach)}</p>
      </div>
      <div class="summary-mini">
        <b>우선 추천 방식</b>
        <p>${escapeHtml(modeRec.primary)}</p>
        ${modeRec.secondary.length ? `<div class="mini-sub">차선 방식: ${escapeHtml(modeRec.secondary.join(' / '))}</div>` : ''}
      </div>
      <div class="summary-mini">
        <b>우선 산출물</b>
        ${renderBullets(summary.outputFocus)}
      </div>
      <div class="summary-mini">
        <b>먼저 피할 점</b>
        ${renderBullets(summary.checkpoint)}
      </div>
    </div>
    ${modeRec.reason.length ? `<div class="mode-reason-box"><b>왜 이 방식을 먼저 추천하나</b>${renderBullets(modeRec.reason)}</div>` : ''}
  `;
}

function renderResultCards(apiData, payload = null, textbookMatches = [], structureMatches = []) {
  const result = apiData.result || {};
  const topStructure = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const reasonText = topStructure
    ? `${result.reason || ''} 현재 추천은 ${topStructure.structure_name} 구조와 ${topStructure.record_pattern_label || '일반 학생부 패턴'}을 함께 반영했다.`.trim()
    : result.reason;
  const steps = topStructure && toArray(topStructure.process_steps).length
    ? toArray(topStructure.process_steps).slice(0, 5)
    : result.steps;
  const flow = topStructure
    ? [...new Set([
        ...toArray(topStructure.concept_links).slice(0, 3),
        ...toArray(topStructure.evidence_style).slice(0, 2)
      ])].map((item, index) => index < 3 ? `${item} 중심으로 전개` : item)
    : result.flow;
  const modeRec = buildModeRecommendation(structureMatches, payload);
  const approachText = topStructure
    ? `${modeRec.primary}을 1순위로 두고 ${topStructure.structure_name}을 기준으로 ${topStructure.core_question_frame}`
    : result.recommendedApproach;
  const extensionText = topStructure && toArray(topStructure.high_score_signals).length
    ? `${toArray(topStructure.high_score_signals).slice(0, 2).join(' / ')}까지 보이면 상위권 구조로 읽힌다.`
    : result.extension;
  const subjectLinks = [...new Set([
    ...toArray(result.subjectLinks),
    ...toArray(topStructure?.concept_links)
  ])].slice(0, 6);
  const warnings = [...new Set([
    ...toArray(result.warnings),
    ...toArray(topStructure?.avoid_points).slice(0, 3),
    ...toArray(topStructure?.grade_avoid).slice(0, 2)
  ])];

  $("reasonCard").innerHTML = `<h3>추천 이유</h3>${renderText(reasonText)}`;
  $("stepsCard").innerHTML = `<h3>탐구 진행 순서</h3>${renderBullets(steps)}`;
  $("flowCard").innerHTML = `<h3>활동 설계 흐름</h3>${renderBullets(flow)}`;
  $("approachCard").innerHTML = `<h3>추천 진행 방식</h3>${renderText(approachText)}`;
  $("extensionCard").innerHTML = `<h3>한 단계 더 확장하려면</h3>${renderText(extensionText)}`;
  $("subjectLinksCard").innerHTML = `<h3>관련 교과 연결</h3>${renderBullets(subjectLinks)}`;
  $("warningsCard").innerHTML = `<h3>주의할 점</h3>${renderBullets(warnings)}`;

  const badge = $("resultModeBadge");
  if (badge) badge.textContent = apiData.mode || 'ai';
}

async function getStructureMatches(payload, apiData, textbookMatches) {
  try {
    const [structureSeed, recordPatternLibrary, admissionRules, advancedSignals] = await Promise.all([
      loadStructureSeed(),
      loadRecordPatternLibrary(),
      loadAdmissionRules(),
      buildAdvancedSignals(payload)
    ]);

    const structureEntries = Array.isArray(structureSeed?.entries) ? structureSeed.entries : [];
    const recordPatterns = Array.isArray(recordPatternLibrary?.entries) ? recordPatternLibrary.entries : [];
    const clusterRule = selectClusterRule(payload, apiData, textbookMatches, admissionRules);
    const gradeModifier = getGradeModifier(payload, admissionRules);

    const boostedTextbookMatches = (textbookMatches || []).map(item => ({
      ...item,
      core_concepts: [...new Set([...toArray(item.core_concepts), ...advancedSignals.matchedMajorSeeds.slice(0, 4)])],
      topic_seeds: [...new Set([...toArray(item.topic_seeds), ...advancedSignals.matchedPrioritySeeds.slice(0, 4)])]
    }));

    const scoredStructures = structureEntries
      .map(entry => {
        let extra = 0;
        extra += scoreTokenList(advancedSignals.matchedMajorSeeds, toArray(entry.seed_keywords).flatMap(tokenize), 8, 4);
        extra += scoreTokenList(advancedSignals.matchedPrioritySeeds, toArray(entry.seed_keywords).flatMap(tokenize), 5, 2);
        const base = scoreStructureEntry(entry, payload, apiData, boostedTextbookMatches, clusterRule, gradeModifier);
        return { ...entry, _score: base + extra };
      })
      .filter(entry => entry._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);

    const scoredPatterns = recordPatterns
      .map(entry => {
        let extra = 0;
        extra += scoreTokenList(advancedSignals.matchedMajorSeeds, toArray(entry.fit_keywords).flatMap(tokenize), 6, 3);
        extra += scoreTokenList(advancedSignals.matchedPrioritySeeds, toArray(entry.fit_keywords).flatMap(tokenize), 4, 2);
        const base = scoreRecordPatternEntry(entry, payload, apiData, boostedTextbookMatches, clusterRule, gradeModifier);
        return { ...entry, _score: base + extra };
      })
      .filter(entry => entry._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);

    if (!scoredStructures.length && !scoredPatterns.length && !clusterRule && !gradeModifier) return [];

    const merged = [];
    const baseStructures = scoredStructures.length ? scoredStructures : [null];
    const basePatterns = scoredPatterns.length ? scoredPatterns : [null];

    for (const s of baseStructures) {
      for (const p of basePatterns) {
        const item = mergeStructureAndPattern(s, p, clusterRule, gradeModifier);
        item.major_signal_hits = advancedSignals.matchedMajorSeeds.slice(0, 5);
        item.priority_signal_hits = advancedSignals.matchedPrioritySeeds.slice(0, 5);
        item._score += item.major_signal_hits.length * 2 + item.priority_signal_hits.length;
        merged.push(item);
      }
    }

    return merged
      .sort((a, b) => b._score - a._score)
      .filter((item, index, arr) => arr.findIndex(v => v.structure_id === item.structure_id && v.record_pattern_label === item.record_pattern_label) === index)
      .slice(0, 3);
  } catch (error) {
    console.warn('structure matcher error:', error);
    return [];
  }
}

function renderStructureSection(structureMatches, payload) {
  const el = ensureDynamicSection('structureSection');
  if (!el) return;

  if (!Array.isArray(structureMatches) || !structureMatches.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div class="textbook-box">
      <h3>추천 구조 매칭</h3>
      <div class="textbook-list">
        ${structureMatches.map((item, idx) => `
          <div class="textbook-item structure-item">
            <div class="textbook-head">
              <strong>${escapeHtml(`${idx + 1}순위 · ${item.structure_name || ''}`)}</strong>
              <div class="inline-badges">
                ${item.record_pattern_label ? `<span>${escapeHtml(item.record_pattern_label)}</span>` : ''}
                ${item.cluster_label ? `<span>${escapeHtml(item.cluster_label)}</span>` : ''}
              </div>
            </div>

            <div class="score-line">구조 점수 ${escapeHtml(item._score || 0)}</div>

            <div class="textbook-row">
              <b>핵심 질문 틀</b>
              <p>${escapeHtml(item.core_question_frame || '')}</p>
            </div>

            <div class="textbook-row">
              <b>이 구조가 맞는 이유</b>
              <p>${escapeHtml(buildStructureWhyThisWorks(item, payload))}</p>
            </div>

            ${item.raw_basis_summary ? `
              <div class="textbook-row">
                <b>실제 학생부 보정 근거</b>
                <p>${escapeHtml(item.raw_basis_summary)}${item.source_examples_count ? ` (원문 예시 ${item.source_examples_count}건 반영)` : ""}</p>
              </div>` : ''}

            ${item.grade_depth_rule ? `
              <div class="textbook-row">
                <b>학년 보정</b>
                <p>${escapeHtml(item.grade_depth_rule)}</p>
              </div>` : ''}

            ${toArray(item.major_signal_hits).length ? `
              <div class="textbook-row">
                <b>전공 키워드 보정</b>
                <ul>${toArray(item.major_signal_hits).slice(0, 5).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}

            ${toArray(item.process_steps).length ? `
              <div class="textbook-row">
                <b>권장 전개 순서</b>
                <ul>${toArray(item.process_steps).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}

            ${toArray(item.good_output_forms).length ? `
              <div class="textbook-row">
                <b>잘 맞는 산출물</b>
                <ul>${toArray(item.good_output_forms).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}

            ${toArray(item.high_score_signals).length ? `
              <div class="textbook-row">
                <b>좋게 보이는 신호</b>
                <ul>${toArray(item.high_score_signals).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}

            ${toArray(item.avoid_points).length ? `
              <div class="textbook-row">
                <b>피해야 할 점</b>
                <ul>${toArray(item.avoid_points).slice(0, 4).map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}


function renderNumberedSteps(items = []) {
  const arr = toArray(items).filter(Boolean);
  if (!arr.length) return '<p class="muted">내용이 없습니다.</p>';
  return `<ol class="step-list">${arr.map((item, index) => `<li><span class="step-no">${index + 1}</span><span>${escapeHtml(item)}</span></li>`).join('')}</ol>`;
}

function buildTemplateStructurePreview(item) {
  const steps = toArray(item.executionSteps).slice(0, 3).map(step => String(step).replace(/[.。]$/, '').trim()).filter(Boolean);
  if (!steps.length) return '개념 정리 → 비교 기준 설정 → 결과 해석';
  return steps.join(' → ');
}

function buildTemplateOutputLabel(item) {
  const priority = String(item.outputPriorityNote || '').replace('우선 산출물은 ', '').replace(' 쪽이 더 안정적이다.', '').trim();
  if (priority) return priority;
  return '보고서 · 발표 자료';
}

function normalizeTemplateForAdmissions(item, payload, structureMatches) {
  const topStructure = Array.isArray(structureMatches) && structureMatches.length ? structureMatches[0] : null;
  const preferredOutputs = toArray(topStructure?.good_output_forms).map(normalizeText);
  const baseSubjects = [...new Set([...toArray(item?.subjects).slice(0, 3), ...toArray(topStructure?.concept_links).slice(0, 2)])];
  const templateMode = templateToMode(item);
  const modeLabelMap = {
    data_analysis: '자료·조사형',
    design: '설계·제작형',
    modeling: '모델링형',
    social_issue: '사회문제해결형',
    experiment: '실험형'
  };
  const executionSteps = buildTemplateExecutionSteps(item, payload, structureMatches);
  const outputPriorityNote = preferredOutputs.length ? `우선 산출물은 ${toArray(topStructure?.good_output_forms).slice(0, 2).join(', ')} 쪽이 더 안정적이다.` : '';
  return {
    title: item?.title || '',
    type: item?.type || '',
    templateMode,
    templateModeLabel: modeLabelMap[templateMode] || '자료·조사형',
    whyThisWorks: buildTemplateWhyThisWorks(item, payload, structureMatches),
    executionSteps,
    writeGuide: buildTemplateWriteGuide(item, payload, structureMatches),
    outputExample: buildTemplateOutputExample(item, payload, structureMatches),
    upgradePoint: buildTemplateUpgradePoint(item, payload, structureMatches),
    evaluationPoints: toArray(item?.evaluation_points).slice(0, 3),
    subjects: baseSubjects,
    outputPriorityNote,
    structurePreview: buildTemplateStructurePreview({ executionSteps }),
    quickOutput: buildTemplateOutputLabel({ subjects: baseSubjects, outputPriorityNote })
  };
}

function renderExtensionLibrarySection(matches, structureMatches = [], payload = null) {
  const el = $('extensionLibrarySection');
  if (!el) return;

  if (!Array.isArray(matches) || !matches.length || !payload) {
    el.innerHTML = '';
    return;
  }

  const normalized = matches.map(item => normalizeTemplateForAdmissions(item, payload, structureMatches));

  el.innerHTML = `
    <div class="textbook-box template-box">
      <h3>추천 활동 템플릿</h3>
      <div class="template-note">한눈에 구조가 보이도록 <b>방식 → 구조 → 바로 할 일 → 결과물</b> 순서로 정리했습니다.</div>
      <div class="textbook-list template-list">
        ${normalized.map((item, index) => `
          <div class="textbook-item template-item ${index === 0 ? 'template-item-primary' : ''}">
            <div class="textbook-head">
              <div>
                <strong>${index === 0 ? '1순위 추천 템플릿' : `${index + 1}순위 대안 템플릿`}</strong>
                <div class="template-title">${escapeHtml(item.title)}</div>
              </div>
              <div class="template-badges">
                <span class="template-badge template-badge-mode">${escapeHtml(item.templateModeLabel)}</span>
                ${item.type ? `<span class="template-badge">${escapeHtml(item.type)}</span>` : ''}
              </div>
            </div>

            <div class="template-summary-grid">
              <div class="template-summary-card">
                <b>핵심 구조</b>
                <p>${escapeHtml(item.structurePreview)}</p>
              </div>
              <div class="template-summary-card">
                <b>권장 산출물</b>
                <p>${escapeHtml(item.quickOutput)}</p>
              </div>
              <div class="template-summary-card">
                <b>왜 맞는가</b>
                <p>${escapeHtml(item.whyThisWorks)}</p>
              </div>
            </div>

            <div class="textbook-row">
              <b>학생이 바로 할 일</b>
              ${renderNumberedSteps(item.executionSteps)}
            </div>

            <div class="textbook-row template-two-col">
              <div>
                <b>보고서 문장 틀</b>
                <ul>${item.writeGuide.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>
              <div>
                <b>결과물 예시</b>
                <p>${escapeHtml(item.outputExample)}</p>
              </div>
            </div>

            ${item.outputPriorityNote ? `
              <div class="textbook-row template-callout">
                <b>산출물 우선순위</b>
                <p>${escapeHtml(item.outputPriorityNote)}</p>
              </div>` : ''}

            <div class="textbook-row template-callout-light">
              <b>한 단계 더 높이려면</b>
              <p>${escapeHtml(item.upgradePoint)}</p>
            </div>

            ${item.evaluationPoints.length ? `
              <div class="textbook-row">
                <b>평가 포인트</b>
                <ul>${item.evaluationPoints.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}

            ${item.subjects.length ? `
              <div class="textbook-row">
                <b>연결 과목</b>
                <ul>${item.subjects.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
              </div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function handleGenerate() {async function handleGenerate() {
  clearError();
  clearResults();

  try {
    const payload = getFormValues();
    validateInput(payload);
    setLoading(true);

    const apiData = await callGenerateAPI(payload);
    const textbookMatches = await getTextbookMatches(payload);
    const structureMatches = await getStructureMatches(payload, apiData, textbookMatches);
    const assessmentReferenceSeed = await loadAssessmentReferenceSeed();
    const assessmentReferenceContext = buildAssessmentReferenceContext(assessmentReferenceSeed, payload, apiData, textbookMatches, structureMatches);
    const extensionMatches = await getExtensionLibraryMatches(payload, apiData, textbookMatches, structureMatches, assessmentReferenceContext);

    window.__lastGenerateDebug = {
      payload,
      apiData,
      textbookMatches,
      structureMatches,
      assessmentReferenceContext,
      extensionMatches,
      version: window.__KEYWORD_ENGINE_VERSION || 'unknown'
    };

    renderResultCards(apiData, payload, textbookMatches, structureMatches);
    renderSummarySection(apiData, payload, textbookMatches, structureMatches);
    renderTextbookSection(textbookMatches);
    renderStructureSection(structureMatches, payload);
    renderAssessmentReferenceSection(assessmentReferenceContext);
    renderExtensionLibrarySection(extensionMatches, structureMatches, payload);

    const badge = $('resultModeBadge');
    if (badge) badge.textContent = 'admissions-v13-reference-seed';

    const resultWrap = $('resultSection');
    if (resultWrap) resultWrap.style.display = 'block';

    return window.__lastGenerateDebug;
  } catch (error) {
    console.error('handleGenerate error:', error);
    window.__lastGenerateDebug = {
      error: error?.message || String(error),
      version: window.__KEYWORD_ENGINE_VERSION || 'unknown'
    };
    showError(error.message || '생성 중 오류가 발생했습니다.');
    return window.__lastGenerateDebug;
  } finally {
    setLoading(false);
  }
}
