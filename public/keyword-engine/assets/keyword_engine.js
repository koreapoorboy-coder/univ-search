window.__KEYWORD_ENGINE_VERSION = "seed-full-v1";
const WORKER_BASE_URL = "https://curly-base-a1a9.koreapoorboy.workers.dev";
const EXTENSION_LIBRARY_URL = "seed/extension_library_v2.json";
const GENERATION_BLOCKS_URL = "seed/core/generation_blocks.json";
const ADMISSION_RULES_URL = "seed/core/admission_rules.json";
const MAJOR_KEYWORD_URL = "seed/core/major_keyword.json";
const PRIORITY_KEYWORD_URL = "seed/core/priority_keyword.json";
const MAJOR_TEMPLATE_URL = "seed/core/major_template_seed.json";
const ADMISSION_CASE_URL = "seed/core/admission_case_seed.json";
const INTEGRATED_INDEX_URL = "seed/core/integrated_engine_index.json";

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


function dedupe(items) {
  return [...new Set(toArray(items).filter(Boolean))];
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
    ["major", "희망 진로"]
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


async function loadCoreEngines() {
  async function fetchOptionalJson(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.warn("optional seed load error:", url, error);
      return null;
    }
  }

  const [
    generationRes,
    admissionRes,
    majorKeyword,
    priorityKeyword,
    majorTemplate,
    admissionCase,
    integratedIndex
  ] = await Promise.all([
    fetch(GENERATION_BLOCKS_URL, { cache: "no-store" }),
    fetch(ADMISSION_RULES_URL, { cache: "no-store" }),
    fetchOptionalJson(MAJOR_KEYWORD_URL),
    fetchOptionalJson(PRIORITY_KEYWORD_URL),
    fetchOptionalJson(MAJOR_TEMPLATE_URL),
    fetchOptionalJson(ADMISSION_CASE_URL),
    fetchOptionalJson(INTEGRATED_INDEX_URL)
  ]);

  if (!generationRes.ok) throw new Error("generation_blocks.json을 불러오지 못했습니다.");
  if (!admissionRes.ok) throw new Error("admission_rules.json을 불러오지 못했습니다.");

  return {
    generation: await generationRes.json(),
    admission: await admissionRes.json(),
    majorKeyword,
    priorityKeyword,
    majorTemplate,
    admissionCase,
    integratedIndex
  };
}

function pickWithSeed(items, seedKey, count = 1) {
  const arr = toArray(items).filter(Boolean);
  if (!arr.length || count <= 0) return [];
  const seed = normalizeText(seedKey || "seed").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const out = [];
  for (let i = 0; i < arr.length && out.length < Math.min(count, arr.length); i += 1) {
    const idx = (seed + i * 3) % arr.length;
    const candidate = arr[idx];
    if (!out.includes(candidate)) out.push(candidate);
  }
  for (const item of arr) {
    if (out.length >= Math.min(count, arr.length)) break;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function inferEngineTrack(payload = {}, apiResult = {}, textbookMatches = [], extensionMatches = [], admissionRules = {}) {
  const joined = normalizeText([
    payload.track,
    payload.major,
    payload.keyword,
    ...toArray(apiResult.subjectLinks),
    ...textbookMatches.map(item => item.subject),
    ...extensionMatches.flatMap(item => toArray(item.subjects))
  ].join(" "));

  const major = normalizeText(payload.major);
  const track = normalizeText(payload.track);

  if (major.includes("간호") || track.includes("보건") || major.includes("의료")) return "보건·의료";
  if (major.includes("ai") || major.includes("컴퓨터") || major.includes("소프트웨어") || track.includes("sw")) return "AI·SW";
  if (major.includes("화학") || major.includes("신소재") || major.includes("배터리") || major.includes("재료")) return "화학";
  if (major.includes("생명") || joined.includes("생명과학")) return "생명과학";
  if (track.includes("환경") || joined.includes("환경") || joined.includes("에너지")) return "환경·에너지";
  if (track.includes("인문") || track.includes("언어")) return "인문·언어";
  if (track.includes("사회")) return "사회";
  if (track.includes("공학") || major.includes("공학") || joined.includes("물리")) return "공학";

  const clusters = toArray(admissionRules?.cluster_rules);
  const match = clusters.find(cluster => {
    const label = normalizeText(cluster?.label);
    return label && (joined.includes(label) || label.includes(joined));
  });
  if (match?.label === "AI·SW·공학") return "AI·SW";
  if (match?.label === "간호·보건") return "보건·의료";
  if (match?.label === "언어·인문") return "인문·언어";
  if (match?.label === "신소재·공학") return "화학";
  if (match?.label === "첨단융합·이공") return "공학";

  return "공학";
}


function mapGradeKey(grade) {
  const raw = String(grade || "").trim();
  const map = {
    "1학년": "고1",
    "2학년": "고2",
    "3학년": "고3",
    "고1": "고1",
    "고2": "고2",
    "고3": "고3"
  };
  return map[raw] || raw;
}

function mapStyleKey(style) {
  const raw = String(style || "").trim();
  const map = {
    "실험형": "실험형",
    "보고서형": "조사·보고서형",
    "사례분석형": "조사·보고서형",
    "시뮬레이션형": "데이터 분석형",
    "데이터 분석형": "데이터 분석형",
    "조사·보고서형": "조사·보고서형",
    "토론·사회문제형": "토론·사회문제형",
    "제작·설계형": "제작·설계형"
  };
  return map[raw] || raw;
}

function mapActivityLevelKey(level) {
  const raw = String(level || "").trim();
  const map = {
    "초기": "시작 전",
    "기초": "1회 탐구 경험 있음",
    "심화": "교과 연계 활동 해봄",
    "시작 전": "시작 전",
    "1회 탐구 경험 있음": "1회 탐구 경험 있음",
    "교과 연계 활동 해봄": "교과 연계 활동 해봄",
    "심화 탐구 경험 있음": "심화 탐구 경험 있음"
  };
  return map[raw] || raw;
}

function normalizeSubjectLinks(list) {
  const map = {
    "물리": "물리학",
    "생명": "생명과학",
    "정보과": "정보"
  };
  return dedupe(toArray(list).map(v => map[String(v).trim()] || String(v).trim()).filter(Boolean));
}


function shuffleArray(arr, seedKey = "") {
  const copy = [...toArray(arr)];
  const seed = normalizeText(seedKey).split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || Math.floor(Math.random() * 10000);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = (seed + i * 17) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickVariant(options, seedKey = "") {
  const arr = toArray(options).filter(Boolean);
  if (!arr.length) return "";
  const seed = normalizeText(seedKey).split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || Math.floor(Math.random() * 10000);
  return arr[seed % arr.length];
}

function createDiversificationKey(payload = {}) {
  return [
    payload.keyword,
    payload.major,
    payload.grade,
    payload.style,
    Date.now().toString().slice(-5),
    Math.random().toString(36).slice(2, 7)
  ].join("|");
}


function buildReasonSentence(payload, reasonParts, diversifyKey = "") {
  const grade = payload.grade || "고등학생";
  const major = payload.major || payload.track || "관심 진로";
  const majorNorm = normalizeText(major);
  const joined = dedupe(reasonParts).filter(Boolean);

  const intros = [
    `${grade} 단계에서는 ${payload.keyword}를 너무 넓게 벌리기보다 학생 수준에서 끝까지 밀고 갈 수 있는 구조를 먼저 확보하는 편이 안전하다.`,
    `${grade} 수준에서 ${payload.keyword}를 설계할 때는 범위를 넓히기보다 비교 기준이 보이는 구조부터 잡는 편이 훨씬 유리하다.`,
    `${grade} 단계에서는 ${payload.keyword}를 큰 주제로 풀어내기보다 학생이 직접 정리하고 해석할 수 있는 범위로 묶는 것이 먼저다.`
  ];

  let strategies = [
    "비교 기준을 먼저 세우고 교과 개념으로 해석하는 구조를 만들면 진로 연계성이 가장 선명하게 드러난다.",
    "교과 개념을 바탕으로 차이를 설명하는 방식으로 가야 진로 방향과의 연결이 자연스럽게 보인다.",
    "조사 자체보다 비교·해석 구조를 분명히 잡아야 진로 연결 흐름이 살아난다."
  ];

  if (majorNorm.includes("화학공학")) {
    strategies = [
      "반응 원리·소재 차이·효율 비교를 한 흐름으로 묶을 수 있어 화학공학 진로와 연결되는 탐구 구조를 만들기 좋다.",
      "전지 성능 차이를 반응과 효율 관점으로 설명할 수 있어 화학공학 진로와 연결되는 구조를 잡기 쉽다.",
      "소재–반응–효율이라는 세 기준으로 묶기 좋기 때문에 화학공학 진로 연계성이 드러나기 쉽다."
    ];
  } else if (majorNorm.includes("신소재")) {
    strategies = [
      "구조와 물성 차이를 성능 비교로 연결할 수 있어 재료·신소재 진로와 이어지는 탐구 흐름을 만들기 좋다.",
      "소재 변화가 성능 차이로 이어지는 구조가 분명해 재료·신소재 진로 연결성이 드러나기 좋다.",
      "물성-구조-응용을 한 흐름으로 정리할 수 있어 신소재 계열 진로와 자연스럽게 이어진다."
    ];
  } else if (majorNorm.includes("컴퓨터") || majorNorm.includes("ai")) {
    strategies = [
      "입력-처리-결과 비교 구조로 정리하면 데이터·AI 진로와 연결되는 분석형 탐구로 발전시키기 좋다.",
      "지표를 정하고 차이를 해석하는 구조로 바꾸면 데이터 기반 진로와 연결하기 좋다.",
      "결과 해석 기준을 먼저 세우면 AI·데이터 진로로 이어지는 분석형 탐구 구조가 잘 보인다."
    ];
  } else if (majorNorm.includes("간호") || majorNorm.includes("의료")) {
    strategies = [
      "원리 이해를 실제 건강·안전 문제로 연결할 수 있어 보건·의료 진로 연계성이 드러나기 좋다.",
      "개념을 실제 안전성과 연결할 수 있어 보건·의료 진로 방향을 설명하기 좋다.",
      "원리-사례-안전성 판단 구조로 확장하기 쉬워 의료 계열 진로와의 연결이 자연스럽다."
    ];
  }

  const body = joined.length ? ` ${pickVariant([
    joined.join(" "),
    joined.slice(0, 2).join(" ") + (joined.length > 2 ? "를 중심으로 구조를 잡으면 된다." : ""),
    joined.join(" ") + "를 바탕으로 탐구 축을 세우는 방식이 적절하다."
  ], diversifyKey + "|reason-body")}` : "";

  return `${pickVariant(intros, diversifyKey + "|reason-intro")}${body} ${pickVariant(strategies, diversifyKey + "|reason-strategy")}`.trim();
}

function buildApproachSentence(payload, methods, textbookMatches, diversifyKey = "") {
  const subject = normalizeSubjectLinks(textbookMatches.map(item => item.subject))[0] || payload.track || "관련 교과";
  const style = payload.style || "자료 비교";
  const styleNorm = normalizeText(style);

  if (styleNorm.includes("실험")) {
    return pickVariant([
      `${subject} 개념을 바탕으로 조건을 나누고 결과 차이를 기록하는 방식으로 가야 한다. 그래야 단순 흥미가 아니라 비교·해석 중심 탐구로 보이기 쉽다.`,
      `${subject} 개념을 기준으로 조건을 나누고 결과 변화를 기록해야 한다. 이 흐름이 가장 선명하다.`,
      `${subject} 개념을 바탕으로 조건 차이를 설계하고 결과 해석을 붙이는 방식이 가장 안정적이다.`
    ], diversifyKey + "|approach-exp");
  }
  if (styleNorm.includes("보고서") || styleNorm.includes("사례")) {
    return pickVariant([
      `${subject} 개념을 기준으로 사례를 고르고, 비교 기준을 먼저 세운 뒤 해석 문장을 붙이는 방식으로 가야 한다.`,
      `${subject} 개념을 바탕으로 사례를 분류하고 차이를 해석하는 방식이 가장 감점 위험이 낮다.`,
      `${subject} 개념을 기준으로 사례를 비교·정리하고 핵심 차이를 설명하는 흐름으로 가야 한다.`
    ], diversifyKey + "|approach-report");
  }
  if (styleNorm.includes("시뮬레이션") || styleNorm.includes("데이터")) {
    return pickVariant([
      `${subject} 개념을 기준으로 지표를 정하고 수치 차이를 해석하는 방식으로 가야 한다. 그래야 결과가 분석형 탐구로 보인다.`,
      `${subject} 개념을 바탕으로 지표를 먼저 정하고 데이터 차이를 설명하는 구조가 가장 적절하다.`,
      `${subject} 개념을 기준으로 수치 비교와 해석을 붙이면 분석형 탐구 흐름이 가장 선명해진다.`
    ], diversifyKey + "|approach-data");
  }
  return pickVariant([
    `${subject} 개념을 바탕으로 자료 비교와 조건 분석 중심으로 설계하면 탐구 흐름이 가장 선명해진다.`,
    `${subject} 개념을 기준으로 비교 요소를 먼저 세우고 자료를 해석하는 방식이 가장 안정적이다.`,
    `${subject} 개념을 중심축으로 두고 비교-해석 구조를 만드는 편이 가장 자연스럽다.`
  ], diversifyKey + "|approach-default");
}

function buildExtensionSentence(payload, items, textbookMatches, diversifyKey = "") {
  const topic = textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).find(Boolean);
  const major = payload.major || payload.track || "관심 진로";
  const joined = dedupe(items).filter(Boolean).slice(0, 3);

  const tails = topic ? [
    `${topic}처럼 교과서에 바로 연결되는 질문으로 좁혀 가면 탐구가 훨씬 단단해지고, 이후 ${major} 진로와의 연결도 자연스럽게 설명할 수 있다.`,
    `${topic}처럼 교과서에 붙는 질문으로 좁히면 탐구의 완성도가 올라가고, ${major} 진로와 이어지는 설명도 쉬워진다.`,
    `${topic}를 기준으로 질문을 더 좁히면 탐구가 단단해지고 진로 연계성도 훨씬 선명해진다.`
  ] : [
    `확장은 범위를 넓히는 것보다 비교 요소를 더 정교하게 만드는 방향이 훨씬 유리하고, 그 과정이 진로 연계성 설명에도 도움이 된다.`,
    `확장은 새 주제를 추가하기보다 비교 기준을 한 단계 더 세밀하게 만드는 쪽이 훨씬 안정적이다.`,
    `확장은 범위 확장보다 해석 기준을 정교하게 만드는 방향으로 가야 진로 연결이 더 잘 보인다.`
  ];

  return dedupe([...joined, pickVariant(tails, diversifyKey + "|extension")]).join(" ");
}


function inferExtensionTag(payload = {}, textbookMatches = [], extensionMatches = []) {
  const joined = normalizeText([
    payload.keyword,
    payload.major,
    payload.track,
    ...textbookMatches.flatMap(item => toArray(item.topic_seeds)),
    ...extensionMatches.flatMap(item => toArray(item.theme_tags))
  ].join(" "));

  if (joined.includes("윤리") || joined.includes("안전") || joined.includes("개인정보")) return "윤리";
  if (joined.includes("정책") || joined.includes("제도")) return "정책";
  if (joined.includes("데이터") || joined.includes("통계") || joined.includes("그래프")) return "데이터";
  if (joined.includes("실험") || joined.includes("전압") || joined.includes("측정") || joined.includes("전류")) return "실험";
  if (joined.includes("제작") || joined.includes("설계") || joined.includes("모형")) return "제작";
  if (joined.includes("사회") || joined.includes("문제") || joined.includes("환경")) return "사회문제";
  return "데이터";
}

function getGenerationSection(generation, sectionName) {
  return generation?.blocks?.[sectionName] || generation?.[sectionName] || {};
}


function extractSeedEntries(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.templates)) return data.templates;
  if (Array.isArray(data.majors)) return data.majors;
  if (Array.isArray(data.cases)) return data.cases;
  if (typeof data === "object") {
    return Object.values(data).flatMap(value => Array.isArray(value) ? value : (value && typeof value === "object" ? [value] : []));
  }
  return [];
}

function stringifySeedEntry(entry) {
  try {
    return JSON.stringify(entry);
  } catch (error) {
    return String(entry ?? "");
  }
}

function scoreSeedEntry(entry, payload = {}) {
  const text = normalizeText(stringifySeedEntry(entry));
  let score = 0;
  [payload.major, payload.track, payload.keyword].filter(Boolean).forEach(token => {
    const norm = normalizeText(token);
    if (norm && text.includes(norm)) score += 3;
  });
  return score;
}

function pickBestSeedEntries(data, payload = {}, limit = 2) {
  return extractSeedEntries(data)
    .map(entry => ({ entry, score: scoreSeedEntry(entry, payload) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.entry);
}

function pullSeedPhrases(entry, keys = []) {
  if (!entry || typeof entry !== "object") return [];
  const phrases = [];
  keys.forEach(key => {
    const value = entry[key];
    if (typeof value === "string") phrases.push(value);
    if (Array.isArray(value)) phrases.push(...value.filter(v => typeof v === "string"));
  });
  return dedupe(phrases);
}

function buildSeedSignals(coreEngines = {}, payload = {}) {
  const majorEntries = pickBestSeedEntries(coreEngines.majorKeyword, payload, 2);
  const priorityEntries = pickBestSeedEntries(coreEngines.priorityKeyword, payload, 2);
  const templateEntries = pickBestSeedEntries(coreEngines.majorTemplate, payload, 2);
  const caseEntries = pickBestSeedEntries(coreEngines.admissionCase, payload, 2);

  const learningKeywords = dedupe([
    ...majorEntries.flatMap(entry => pullSeedPhrases(entry, ["keywords", "learning_keywords", "core_keywords", "problem_solving_keywords"])),
    ...templateEntries.flatMap(entry => pullSeedPhrases(entry, ["keywords", "learning_keywords", "core_keywords", "problem_solving_keywords"]))
  ]);

  const careerLinks = dedupe([
    ...majorEntries.flatMap(entry => pullSeedPhrases(entry, ["career_paths", "career_links", "jobs", "career_direction"])),
    ...templateEntries.flatMap(entry => pullSeedPhrases(entry, ["career_paths", "career_links", "jobs", "career_direction"]))
  ]);

  const subjectHints = dedupe([
    ...majorEntries.flatMap(entry => pullSeedPhrases(entry, ["subjects", "related_subjects", "subject_links"])),
    ...templateEntries.flatMap(entry => pullSeedPhrases(entry, ["subjects", "related_subjects", "subject_links"])),
    ...priorityEntries.flatMap(entry => pullSeedPhrases(entry, ["subjects", "related_subjects", "subject_links"]))
  ]);

  const strategyHints = dedupe([
    ...priorityEntries.flatMap(entry => pullSeedPhrases(entry, ["priority_keywords", "strategy", "strategy_keywords", "focus_keywords"])),
    ...caseEntries.flatMap(entry => pullSeedPhrases(entry, ["best_pattern", "high_score_pattern", "focus_keywords", "strategy_keywords"])),
    ...templateEntries.flatMap(entry => pullSeedPhrases(entry, ["strategy", "best_pattern", "high_score_pattern"]))
  ]);

  const cautionHints = dedupe([
    ...caseEntries.flatMap(entry => pullSeedPhrases(entry, ["penalty_pattern", "avoid", "warning_points", "caution_points"])),
    ...priorityEntries.flatMap(entry => pullSeedPhrases(entry, ["avoid", "warning_points", "caution_points"]))
  ]);

  return {
    learningKeywords: learningKeywords.slice(0, 6),
    careerLinks: careerLinks.slice(0, 4),
    subjectHints: subjectHints.slice(0, 5),
    strategyHints: strategyHints.slice(0, 6),
    cautionHints: cautionHints.slice(0, 4)
  };
}


function buildHybridResult(payload, apiData, coreEngines, textbookMatches, extensionMatches, diversifyKey = "") {
  const apiResult = apiData?.result || {};
  const generation = coreEngines?.generation || {};
  const admission = coreEngines?.admission || {};
  const seedSignals = buildSeedSignals(coreEngines, payload);

  const gradeKey = mapGradeKey(payload.grade);
  const styleKey = mapStyleKey(payload.style);
  const activityLevelKey = mapActivityLevelKey(payload.activityLevel);

  const engineTrack = inferEngineTrack(payload, apiResult, textbookMatches, extensionMatches, admission);
  const extensionTag = inferExtensionTag(payload, textbookMatches, extensionMatches);

  const reasonSection = getGenerationSection(generation, "reason");
  const stepSection = getGenerationSection(generation, "steps");
  const flowSection = getGenerationSection(generation, "flow");
  const extensionSection = getGenerationSection(generation, "extension");
  const warningSection = getGenerationSection(generation, "warning");

  const seedKey = [payload.keyword, payload.major, gradeKey, styleKey, engineTrack, diversifyKey].join("|");
  const majorNorm = normalizeText(payload.major);

  const reasonParts = dedupe([
    ...pickWithSeed(reasonSection?.blocks?.common, seedKey + "|reason-common", 1),
    ...pickWithSeed(reasonSection?.blocks?.track?.[engineTrack], seedKey + "|reason-track", 1),
    ...pickWithSeed(reasonSection?.blocks?.grade?.[gradeKey], seedKey + "|reason-grade", 1),
    ...pickWithSeed(reasonSection?.blocks?.style?.[styleKey], seedKey + "|reason-style", 1),
    ...pickWithSeed(seedSignals.strategyHints, seedKey + "|seed-strategy", 2),
    ...pickWithSeed(seedSignals.learningKeywords, seedKey + "|seed-learning", 1)
  ]);

  const textbookTopicPool = shuffleArray(textbookMatches.flatMap(item => toArray(item.topic_seeds || item.topicSeeds)).filter(Boolean), seedKey + "|topic-pool");
  const textbookConceptPool = shuffleArray(textbookMatches.flatMap(item => toArray(item.core_concepts || item.coreConcepts)).filter(Boolean), seedKey + "|concept-pool");
  const textbookTopicPicks = textbookTopicPool.slice(0, 2);
  const textbookConceptPicks = textbookConceptPool.slice(0, 2);

  let customStepOptions = [];
  if (majorNorm.includes("화학공학")) {
    customStepOptions = [
      `${payload.keyword}를 소재 차이·반응 원리·효율 비교라는 세 기준으로 나눠 질문을 먼저 설계한다.`,
      `${payload.keyword}를 소재·반응·효율 세 축으로 분해해 무엇을 비교할지 먼저 정한다.`,
      `${payload.keyword}를 소재 변화, 반응 해석, 효율 비교라는 세 틀로 구조화해 질문을 세운다.`
    ];
  } else if (majorNorm.includes("신소재")) {
    customStepOptions = [
      `${payload.keyword}를 구조·물성·응용 가능성이라는 세 기준으로 나눠 질문을 먼저 설계한다.`,
      `${payload.keyword}를 구조 차이, 물성 변화, 응용 장면 비교로 나눠 탐구 질문을 잡는다.`,
      `${payload.keyword}를 구조·물성·성능이라는 세 틀로 나눠 비교 질문을 만든다.`
    ];
  } else if (majorNorm.includes("컴퓨터") || majorNorm.includes("ai")) {
    customStepOptions = [
      `${payload.keyword}를 입력 데이터·처리 방식·결과 비교 구조로 바꿔 질문을 먼저 설계한다.`,
      `${payload.keyword}를 입력, 처리, 출력 비교 틀로 바꿔 해석 기준을 먼저 만든다.`,
      `${payload.keyword}를 데이터-처리-결과 구조로 나눠 비교 질문을 만든다.`
    ];
  } else if (majorNorm.includes("간호") || majorNorm.includes("의료")) {
    customStepOptions = [
      `${payload.keyword}를 원리 이해·사례 비교·안전성 판단 구조로 바꿔 질문을 먼저 설계한다.`,
      `${payload.keyword}를 원리, 사례, 안전성이라는 세 기준으로 정리해 질문을 잡는다.`,
      `${payload.keyword}를 이해-비교-판단 구조로 나눠 보건 맥락에서 질문을 만든다.`
    ];
  }

  const seedStepOptions = seedSignals.learningKeywords.map(item => `${item}을(를) 해석 기준에 포함해 비교 구조를 더 선명하게 만든다.`);
  const topicStepOptions = textbookTopicPicks.map(topic => `${topic}를 중심 질문으로 잡고 비교 기준을 먼저 세운다.`);
  const conceptStepOptions = textbookConceptPicks.map(concept => `${concept} 같은 핵심 개념을 결과 해석 문장에 직접 연결한다.`);

  const steps = dedupe([
    pickVariant(customStepOptions, seedKey + "|custom-step"),
    ...topicStepOptions,
    ...pickWithSeed(stepSection?.blocks?.common, seedKey + "|steps-common", 2),
    ...pickWithSeed(stepSection?.blocks?.style?.[styleKey], seedKey + "|steps-style", 2),
    ...pickWithSeed(stepSection?.blocks?.grade?.[gradeKey], seedKey + "|steps-grade", 1),
    ...pickWithSeed(seedStepOptions, seedKey + "|seed-step", 2),
    ...conceptStepOptions
  ]).slice(0, 7);

  const flowLead = pickVariant([
    `비교 기준을 먼저 세운 뒤 자료를 해석하면 탐구 흐름이 가장 선명해진다.`,
    `기준 없이 자료를 모으기보다 비교 틀을 먼저 정해야 탐구 구조가 선명해진다.`,
    `무엇을 비교할지 먼저 정하고 자료를 해석해야 탐구 흐름이 흔들리지 않는다.`
  ], seedKey + "|flow-lead");

  const flow = dedupe([
    flowLead,
    ...pickWithSeed(flowSection?.blocks?.track?.[engineTrack], seedKey + "|flow-track", 1),
    ...pickWithSeed(flowSection?.blocks?.activity_level?.[activityLevelKey], seedKey + "|flow-level", 1),
    ...pickWithSeed(flowSection?.blocks?.common, seedKey + "|flow-common", 1),
    ...pickWithSeed(seedSignals.strategyHints, seedKey + "|flow-strategy", 1)
  ]).slice(0, 4);

  const extensionItems = dedupe([
    ...pickWithSeed(extensionSection?.blocks?.common, seedKey + "|extension-common", 1),
    ...pickWithSeed(extensionSection?.blocks?.tag?.[extensionTag], seedKey + "|extension-tag", 1),
    ...pickWithSeed(extensionSection?.blocks?.track?.[engineTrack], seedKey + "|extension-track", 1),
    ...pickWithSeed(seedSignals.careerLinks, seedKey + "|extension-career", 1),
    ...pickWithSeed(seedSignals.learningKeywords, seedKey + "|extension-learning", 1)
  ]).filter(Boolean);

  const warnings = dedupe([
    ...pickWithSeed(warningSection?.blocks?.common, seedKey + "|warning-common", 1),
    ...pickWithSeed(warningSection?.blocks?.grade?.[gradeKey], seedKey + "|warning-grade", 1),
    ...pickWithSeed(warningSection?.blocks?.style?.[styleKey], seedKey + "|warning-style", 1),
    ...pickWithSeed(warningSection?.blocks?.control, seedKey + "|warning-control", 1),
    ...toArray(admission?.grade_level_modifiers?.[gradeKey]?.avoid).slice(0, 1),
    ...pickWithSeed(seedSignals.cautionHints, seedKey + "|warning-seed", 1)
  ]).slice(0, 5).map(item => {
    const text = String(item || "");
    if (text.includes("대학 전공 수준 수식 전개")) {
      return pickVariant([
        "대학 수준 수식 전개로 가기보다 고교 교과 개념 안에서 비교·해석 구조를 잡는 편이 훨씬 안전하다.",
        "대학 수준 수식으로 밀기보다 고교 교과 개념 안에서 차이를 설명하는 편이 더 안정적이다.",
        "고교 수준을 벗어난 수식 전개보다 교과 개념 안에서 비교·해석을 정리하는 편이 낫다."
      ], seedKey + "|warning-math");
    }
    if (text.includes("대학 1학년 이상 개념") || text.includes("대학 1학년 이상 수준")) {
      return pickVariant([
        "대학 1학년 이상 개념을 억지로 끌어오면 오히려 탐구의 자연스러움이 깨질 수 있다.",
        "대학 개념을 무리하게 끌어오면 탐구의 논리 흐름이 흔들릴 수 있다.",
        "과도한 대학 개념 차용은 오히려 탐구의 설득력을 떨어뜨릴 수 있다."
      ], seedKey + "|warning-college");
    }
    return text;
  });

  const subjectLinks = normalizeSubjectLinks([
    ...toArray(apiResult.subjectLinks),
    ...textbookMatches.map(item => item.subject),
    ...extensionMatches.flatMap(item => toArray(item.subjects)),
    ...seedSignals.subjectHints
  ]).slice(0, 6).filter((item, idx, arr) => {
    if (item === "화학" && (arr.includes("화학 I") || arr.includes("화학Ⅰ"))) return false;
    if (item === "물리" && arr.includes("물리학")) return false;
    return true;
  });

  const recommendedMethods = dedupe([
    ...toArray(admission?.grade_level_modifiers?.[gradeKey]?.recommended_methods).slice(0, 2),
    payload.style || "",
    ...pickWithSeed(seedSignals.strategyHints, seedKey + "|approach-strategy", 1)
  ]).filter(Boolean);

  return {
    reason: buildReasonSentence(payload, reasonParts, seedKey),
    steps,
    flow,
    recommendedApproach: buildApproachSentence(payload, recommendedMethods, textbookMatches, seedKey),
    extension: buildExtensionSentence(payload, extensionItems, textbookMatches, seedKey),
    subjectLinks,
    warnings
  };
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

    const [apiData, coreEngines] = await Promise.all([
      callGenerateAPI(payload),
      loadCoreEngines()
    ]);

    const textbookMatches = await getTextbookMatches(payload);
    const extensionMatches = await getExtensionLibraryMatches(payload, apiData, textbookMatches);

    const diversifyKey = createDiversificationKey(payload);
    const hybridResult = buildHybridResult(payload, apiData, coreEngines, textbookMatches, extensionMatches, diversifyKey);
    const hybridApiData = {
      ...apiData,
      mode: "hybrid",
      result: hybridResult
    };

    renderResultCards(hybridApiData);
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
