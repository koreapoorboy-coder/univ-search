
const DATA_PATH = "./data";
const STORAGE_KEYS = {
  search: "keyword_engine_search_logs",
  interaction: "keyword_engine_interaction_logs",
  selection: "keyword_engine_selection_logs",
  consulting: "keyword_engine_consulting_logs"
};

let KEYWORD_LIBRARY = {};
let KEYWORD_ALIAS = {};
let CURRENT_SESSION = null;
let CURRENT_RESULTS = [];
let CURRENT_SEARCH_META = null;
let CURRENT_INTERACTION = null;

function generateSessionId() {
  return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function nowIso() {
  return new Date().toISOString();
}

async function loadJson(path, fallback) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (e) {
    return fallback;
  }
}

async function boot() {
  const [library, alias] = await Promise.all([
    loadJson(`${DATA_PATH}/keyword_library.json`, {}),
    loadJson(`${DATA_PATH}/keyword_alias.json`, {})
  ]);
  KEYWORD_LIBRARY = library || {};
  KEYWORD_ALIAS = alias || {};

  bindEvents();
  renderEmptyState("키워드를 입력하면 관련 탐구 설계 카드가 표시됩니다.");
}

function bindEvents() {
  document.getElementById("searchBtn").addEventListener("click", onSearch);
  document.getElementById("exportLogsBtn").addEventListener("click", exportLogs);
  document.getElementById("clearLogsBtn").addEventListener("click", clearLogs);
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSearch();
  });
}

function getFormData() {
  return {
    query_keyword: document.getElementById("searchInput").value.trim(),
    interest_track: document.getElementById("trackSelect").value.trim(),
    favorite_subjects: document.getElementById("subjectSelect").value ? [document.getElementById("subjectSelect").value.trim()] : [],
    school_level: document.getElementById("schoolLevelSelect").value.trim(),
    grade: document.getElementById("gradeSelect").value.trim(),
    career_interest: document.getElementById("careerInput").value.trim()
  };
}

function normalizeKeyword(keyword) {
  const raw = keyword.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (KEYWORD_LIBRARY[raw]) return raw;
  if (KEYWORD_ALIAS[raw]) return KEYWORD_ALIAS[raw];
  if (KEYWORD_ALIAS[lower]) return KEYWORD_ALIAS[lower];

  const direct = Object.keys(KEYWORD_LIBRARY).find((k) => k.toLowerCase() === lower);
  if (direct) return direct;

  const aliasKey = Object.keys(KEYWORD_ALIAS).find((k) => k.toLowerCase() === lower);
  if (aliasKey) return KEYWORD_ALIAS[aliasKey];

  // partial keyword scan
  const partial = Object.keys(KEYWORD_LIBRARY).find((k) => raw.includes(k) || k.includes(raw));
  if (partial) return partial;

  return raw;
}

function scorePlan(plan, keywordData, meta) {
  let score = 50;
  const text = [
    plan.type, plan.title, plan.core_design, plan.intent,
    ...(plan.result_examples || []),
    ...(plan.record_points || [])
  ].join(" ");

  if (meta.interest_track && (keywordData.recommended_for || []).some(v => textIncludes(v, meta.interest_track) || textIncludes(meta.interest_track, v))) score += 18;
  if (meta.favorite_subjects?.length && (keywordData.related_subjects || []).some(s => meta.favorite_subjects.includes(s))) score += 12;
  if (meta.career_interest && textIncludes(text, meta.career_interest)) score += 10;
  if (meta.query_keyword && textIncludes(text, meta.query_keyword)) score += 8;
  return score;
}

function textIncludes(a, b) {
  return String(a || "").toLowerCase().includes(String(b || "").toLowerCase());
}

function buildRecommendations(keyword, meta) {
  const item = KEYWORD_LIBRARY[keyword];
  if (!item) return [];

  return (item.plans || [])
    .map((plan, idx) => ({
      rank: idx + 1,
      keyword,
      score: scorePlan(plan, item, meta),
      ...plan
    }))
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));
}

function readLogs(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    return [];
  }
}

function writeLogs(key, payload) {
  const prev = readLogs(key);
  prev.push(payload);
  localStorage.setItem(key, JSON.stringify(prev));
}

function onSearch() {
  const meta = getFormData();
  if (!meta.query_keyword) {
    alert("키워드를 입력해 주세요.");
    return;
  }

  const normalized = normalizeKeyword(meta.query_keyword);
  const keywordData = KEYWORD_LIBRARY[normalized];

  CURRENT_SESSION = generateSessionId();
  CURRENT_SEARCH_META = {
    session_id: CURRENT_SESSION,
    ...meta,
    normalized_keyword: normalized,
    searched_at: nowIso(),
    engine_version: "keyword_engine_v1_localstorage"
  };
  writeLogs(STORAGE_KEYS.search, CURRENT_SEARCH_META);

  if (!keywordData) {
    renderSummary(null, normalized, meta);
    renderEmptyState(`'${meta.query_keyword}'에 대한 결과가 없습니다. 다른 키워드나 유사어로 검색해 보세요.`);
    return;
  }

  CURRENT_RESULTS = buildRecommendations(normalized, meta);
  CURRENT_INTERACTION = {
    session_id: CURRENT_SESSION,
    query_keyword: meta.query_keyword,
    normalized_keyword: normalized,
    recommended_cards: CURRENT_RESULTS.map(({ rank, keyword, score, type, title }) => ({
      rank, keyword, score, plan_type: type, title
    })),
    first_clicked_card: null,
    clicked_cards: [],
    followup_keywords_clicked: [],
    copy_clicked: false,
    save_clicked: false,
    started_at: nowIso()
  };

  renderSummary(keywordData, normalized, meta);
  renderResults(CURRENT_RESULTS, keywordData.related_keywords || []);
}

function renderSummary(item, keyword, meta) {
  const summaryRoot = document.getElementById("summarySection");
  summaryRoot.innerHTML = "";
  if (!item) return;

  const tpl = document.getElementById("summaryTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector("h2").textContent = `${keyword} 탐구 설계 추천`;
  node.querySelector(".chip").textContent = meta.interest_track ? `${meta.interest_track} 중심 추천` : "공용 추천";

  const metaTags = node.querySelector(".meta-tags");
  const tags = [
    ...(item.category || []),
    ...(item.related_subjects || []).map(v => `${v} 연계`),
    ...(item.recommended_for || []).slice(0, 2).map(v => `${v} 추천`)
  ];
  tags.forEach(tag => {
    const span = document.createElement("span");
    span.className = "meta-tag";
    span.textContent = tag;
    metaTags.appendChild(span);
  });

  const followup = node.querySelector(".followup-list");
  (item.related_keywords || []).forEach(kw => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "followup-btn";
    btn.textContent = kw;
    btn.addEventListener("click", () => {
      if (CURRENT_INTERACTION) {
        CURRENT_INTERACTION.followup_keywords_clicked.push(kw);
      }
      document.getElementById("searchInput").value = kw;
      onSearch();
    });
    followup.appendChild(btn);
  });

  summaryRoot.appendChild(node);
}

function renderEmptyState(message) {
  document.getElementById("resultsSection").innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderResults(results) {
  const root = document.getElementById("resultsSection");
  root.innerHTML = "";

  if (!results.length) {
    renderEmptyState("추천 결과가 없습니다.");
    return;
  }

  results.forEach((result, index) => {
    const tpl = document.getElementById("resultTemplate");
    const node = tpl.content.firstElementChild.cloneNode(true);

    node.querySelector(".plan-type").textContent = result.type;
    node.querySelector(".plan-title").textContent = result.title;
    node.querySelector(".core-design").textContent = result.core_design || "";
    node.querySelector(".intent").textContent = result.intent || "";
    node.querySelector(".problem-definition").textContent = result.problem_definition || "";
    node.querySelector(".analysis-design").textContent = result.analysis_design || "";
    node.querySelector(".advanced-design").textContent = result.advanced_design || "";
    node.querySelector(".conclusion-design").textContent = result.conclusion_design || "";
    node.querySelector(".why-recommended").textContent = result.why_recommended || "";

    fillList(node.querySelector(".result-examples"), result.result_examples || []);
    fillList(node.querySelector(".record-points"), result.record_points || []);

    node.querySelector(".copy-btn").addEventListener("click", async () => {
      const text = buildCardText(result);
      try {
        await navigator.clipboard.writeText(text);
        if (CURRENT_INTERACTION) CURRENT_INTERACTION.copy_clicked = true;
        alert("내용이 복사되었습니다.");
      } catch (e) {
        alert("복사에 실패했습니다.");
      }
    });

    node.querySelector(".select-btn").addEventListener("click", () => {
      logCardClick(result, index);
      writeLogs(STORAGE_KEYS.selection, {
        session_id: CURRENT_SESSION,
        query_keyword: CURRENT_SEARCH_META?.query_keyword || "",
        normalized_keyword: CURRENT_SEARCH_META?.normalized_keyword || "",
        final_selected_plan: {
          keyword: result.keyword,
          plan_type: result.type,
          title: result.title
        },
        selection_reason: ["학생이 화면에서 직접 선택"],
        selected_followup_keywords: CURRENT_INTERACTION?.followup_keywords_clicked || [],
        selected_at: nowIso()
      });
      alert("선택 기록이 저장되었습니다.");
    });

    node.querySelector(".consult-btn").addEventListener("click", () => {
      logCardClick(result, index);
      writeLogs(STORAGE_KEYS.consulting, {
        session_id: CURRENT_SESSION,
        consulting_requested: true,
        consulting_requested_at: nowIso(),
        pre_consulting_keyword: CURRENT_SEARCH_META?.query_keyword || "",
        pre_consulting_selected_plan: {
          keyword: result.keyword,
          plan_type: result.type,
          title: result.title
        },
        consulting_status: "requested"
      });
      alert("상담 연결 기록이 저장되었습니다.");
    });

    node.addEventListener("mouseenter", () => startDwell(index, result));
    node.addEventListener("mouseleave", () => endDwell(index));

    root.appendChild(node);
  });

  root.insertAdjacentHTML("beforeend", `<p class="notice">현재 구조는 브라우저 localStorage에 로그를 저장합니다. 나중에 '로그 내보내기'로 JSON을 받을 수 있습니다.</p>`);
}

function fillList(el, items) {
  el.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function buildCardText(result) {
  const sections = [
    `[${result.type}] ${result.title}`,
    `핵심 탐구 설계: ${result.core_design || ""}`,
    `설계 의도: ${result.intent || ""}`,
    `문제 정의: ${result.problem_definition || ""}`,
    `분석 설계: ${result.analysis_design || ""}`,
    `심화 설계: ${result.advanced_design || ""}`,
    `결론 설계: ${result.conclusion_design || ""}`,
    `완성 결과 예시: ${(result.result_examples || []).join(", ")}`,
    `학생부에 드러날 내용: ${(result.record_points || []).join(", ")}`,
    `추천 이유: ${result.why_recommended || ""}`
  ];
  return sections.join("\n");
}

function startDwell(index, result) {
  if (!CURRENT_INTERACTION) return;
  const exists = CURRENT_INTERACTION.clicked_cards.find(v => v.rank === result.rank && !v.dwell_end);
  if (exists) return;
  logCardClick(result, index, false);
}

function endDwell(index) {
  if (!CURRENT_INTERACTION) return;
  const last = [...CURRENT_INTERACTION.clicked_cards].reverse().find(v => !v.dwell_end);
  if (!last) return;
  last.dwell_end = nowIso();
  last.dwell_seconds = Math.max(1, Math.floor((Date.now() - last._startedMs) / 1000));
  delete last._startedMs;
}

function logCardClick(result, index, setFirst = true) {
  if (!CURRENT_INTERACTION) return;

  const clickData = {
    rank: result.rank,
    keyword: result.keyword,
    plan_type: result.type,
    title: result.title,
    clicked_at: nowIso(),
    dwell_start: nowIso(),
    _startedMs: Date.now()
  };

  CURRENT_INTERACTION.clicked_cards.push(clickData);
  if (setFirst && !CURRENT_INTERACTION.first_clicked_card) {
    CURRENT_INTERACTION.first_clicked_card = {
      rank: result.rank,
      plan_type: result.type,
      title: result.title,
      clicked_at: clickData.clicked_at
    };
  }
}

function exportLogs() {
  if (CURRENT_INTERACTION) {
    // finalize any open dwell
    CURRENT_INTERACTION.clicked_cards.forEach(item => {
      if (!item.dwell_end && item._startedMs) {
        item.dwell_end = nowIso();
        item.dwell_seconds = Math.max(1, Math.floor((Date.now() - item._startedMs) / 1000));
        delete item._startedMs;
      }
    });
    CURRENT_INTERACTION.ended_at = nowIso();
    const prev = readLogs(STORAGE_KEYS.interaction);
    const exists = prev.some(v => v.session_id === CURRENT_INTERACTION.session_id);
    if (!exists) writeLogs(STORAGE_KEYS.interaction, CURRENT_INTERACTION);
  }

  const bundle = {
    exported_at: nowIso(),
    search_logs: readLogs(STORAGE_KEYS.search),
    interaction_logs: readLogs(STORAGE_KEYS.interaction),
    selection_logs: readLogs(STORAGE_KEYS.selection),
    consulting_logs: readLogs(STORAGE_KEYS.consulting)
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keyword_engine_logs_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearLogs() {
  if (!confirm("브라우저에 저장된 로그를 모두 지울까요?")) return;
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  alert("로그가 초기화되었습니다.");
}

window.addEventListener("beforeunload", () => {
  if (!CURRENT_INTERACTION) return;
  CURRENT_INTERACTION.clicked_cards.forEach(item => {
    if (!item.dwell_end && item._startedMs) {
      item.dwell_end = nowIso();
      item.dwell_seconds = Math.max(1, Math.floor((Date.now() - item._startedMs) / 1000));
      delete item._startedMs;
    }
  });
  CURRENT_INTERACTION.ended_at = nowIso();
  const prev = readLogs(STORAGE_KEYS.interaction);
  const exists = prev.some(v => v.session_id === CURRENT_INTERACTION.session_id);
  if (!exists) writeLogs(STORAGE_KEYS.interaction, CURRENT_INTERACTION);
});

boot();
