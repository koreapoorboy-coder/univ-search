let TOTAL_DATA = [];
let LAST_RESULTS = [];
let autoSearchTimer = null;

const OPEN_GROUP_DETAILS = new Set();
const OPEN_YEAR_DETAILS = new Set();

function $(id) {
  return document.getElementById(id);
}

function getValue(id) {
  return ($(id)?.value || "").trim();
}

function parseNum(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeValue(v, fallback = "-") {
  return v === undefined || v === null || v === "" ? fallback : v;
}

function hasValue(v) {
  return !(v === undefined || v === null || v === "");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[()[\]{}]/g, "")
    .trim()
    .toLowerCase();
}

function canonicalFilterValue(value) {
  const v = normalizeText(value);

  if (!v) return "all";
  if (["all", "전체"].includes(v)) return "all";
  if (["안정", "safe", "stable"].includes(v)) return "안정";
  if (["적정", "fit", "match"].includes(v)) return "적정";
  if (["상향", "up", "reach"].includes(v)) return "상향";
  if (["도전", "challenge"].includes(v)) return "도전";

  return value;
}

function boolValue(value) {
  if (typeof value === "boolean") return value;
  const text = normalizeText(value);
  return ["true", "1", "y", "yes", "있음", "필수", "required", "need"].includes(text);
}

function getRawValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return fallback;
}

function getRawNum(obj, keys) {
  return parseNum(getRawValue(obj, keys, null));
}

function normalizeDocumentIntensity(value) {
  const v = normalizeText(value);
  if (["상", "높음", "high"].includes(v)) return "상";
  if (["중상", "midhigh", "mid-high"].includes(v)) return "중상";
  if (["보통", "중", "normal", "medium"].includes(v)) return "보통";
  if (["완화", "낮음", "low"].includes(v)) return "완화";
  return String(value || "").trim() || "보통";
}

function normalizeTotalItem(item, index) {
  return {
    __index: index,
    year: String(getRawValue(item, ["year", "연도", "년도"], "")).trim(),

    university: String(getRawValue(item, ["university", "univ", "대학", "학교명"], "")).trim(),
    major: String(getRawValue(item, ["major", "학과", "모집단위"], "")).trim(),
    admission_name: String(getRawValue(item, ["admission_name", "전형명", "admission"], "")).trim(),

    group: String(getRawValue(item, ["group", "계열"], "")).trim(),

    grade_ref: getRawNum(item, ["grade_ref", "기준내신", "내신기준", "합격기준내신"]),
    grade_note: String(getRawValue(item, ["grade_note", "기준설명"], "")).trim(),

    document_intensity: normalizeDocumentIntensity(getRawValue(item, ["document_intensity", "서류강도"], "보통")),
    document_focus: String(getRawValue(item, ["document_focus", "서류중점", "평가포인트"], "")).trim(),
    activity_keywords: String(getRawValue(item, ["activity_keywords", "활동키워드", "키워드"], "")).trim(),

    interview: boolValue(getRawValue(item, ["interview", "면접"], false)),
    csat_min_required: boolValue(getRawValue(item, ["csat_min_required", "수능최저필수"], false)),
    csat_min_rule: String(getRawValue(item, ["csat_min_rule", "수능최저"], "")).trim(),

    competition_rate: String(getRawValue(item, ["competition_rate", "경쟁률"], "")).trim(),
    registered_count: getRawValue(item, ["registered_count", "모집인원"], ""),
    add_admit_count: getRawValue(item, ["add_admit_count", "추합인원", "추가합격", "충원인원"], ""),

    selection_note: String(getRawValue(item, ["selection_note", "전형주의사항"], "")).trim(),
    notes: String(getRawValue(item, ["notes", "비고"], "")).trim()
  };
}

async function loadData() {
  const res = await fetch("data/rolling_total_data.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("학생부종합 데이터 파일을 불러오지 못했습니다.");
  }

  const json = await res.json();
  const rows = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.items)
        ? json.items
        : null;

  if (!Array.isArray(rows)) {
    throw new Error("학생부종합 데이터 형식이 올바르지 않습니다.");
  }

  TOTAL_DATA = rows
    .map((item, index) => normalizeTotalItem(item, index))
    .filter(item => item.university || item.major || item.admission_name);

  if (!TOTAL_DATA.length) {
    throw new Error("학생부종합 데이터는 불러왔지만 실제 행(row)이 없습니다.");
  }
}

function getStudentGrade() {
  return parseNum(getValue("gradeAvg"));
}

function hasAnyStudentInput() {
  return getStudentGrade() != null;
}

function setJudgementFilter(value) {
  const finalValue = canonicalFilterValue(value || "all");

  if ($("judgementFilter")) {
    $("judgementFilter").value = finalValue;
  }

  document.querySelectorAll(".judge-tab").forEach(btn => {
    const tabValue = canonicalFilterValue(btn.getAttribute("data-value") || "");
    btn.classList.toggle("is-active", tabValue === finalValue);
  });

  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    const chipValue = canonicalFilterValue(btn.getAttribute("data-filter") || "");
    btn.classList.toggle("is-active", chipValue === finalValue);
  });
}

function intensityPenalty(level) {
  switch (level) {
    case "상":
      return 0.10;
    case "중상":
      return 0.06;
    case "보통":
      return 0.03;
    case "완화":
      return 0;
    default:
      return 0.03;
  }
}

function formatGradeGap(diff) {
  if (diff == null) return "비교 불가";
  return diff <= 0
    ? `${Math.abs(diff).toFixed(2)}등급 우위`
    : `${diff.toFixed(2)}등급 열세`;
}

function evaluateTotalRecord(studentGrade, item) {
  const refGrade = item.grade_ref;

  if (studentGrade == null || refGrade == null) {
    return {
      judgement: "판정 보류",
      rawDiff: null,
      adjustedDiff: null,
      summaryText: "학생 내신 또는 기준 내신 정보가 없습니다."
    };
  }

  const rawDiff = studentGrade - refGrade;
  const penalty =
    intensityPenalty(item.document_intensity) +
    (item.interview ? 0.08 : 0) +
    (item.csat_min_required ? 0.10 : 0);

  const adjustedDiff = rawDiff + penalty;

  let judgement = "판정 보류";
  if (adjustedDiff <= -0.20) judgement = "안정";
  else if (adjustedDiff <= 0.08) judgement = "적정";
  else if (adjustedDiff <= 0.32) judgement = "상향";
  else if (adjustedDiff <= 0.58) judgement = "도전";
  else judgement = "판정 보류";

  const summaryText = `내신 ${studentGrade.toFixed(2)} / 기준내신 ${refGrade.toFixed(2)} / ${formatGradeGap(rawDiff)} · 면접/수능최저/서류강도 반영`;

  return {
    judgement,
    rawDiff,
    adjustedDiff,
    summaryText
  };
}

function judgementRank(label) {
  const map = {
    "안정": 1,
    "적정": 2,
    "상향": 3,
    "도전": 4,
    "판정 보류": 5
  };
  return map[label] ?? 99;
}

function judgementToneClass(label) {
  switch (label) {
    case "안정":
      return "is-safe";
    case "적정":
      return "is-fit";
    case "상향":
      return "is-up";
    case "도전":
      return "is-challenge";
    default:
      return "";
  }
}

function badgeClass(label) {
  const tone = judgementToneClass(label);
  return tone ? `badge ${tone}` : "badge";
}

function buildGroupKey(item) {
  return [
    normalizeText(item.university),
    normalizeText(item.major),
    normalizeText(item.admission_name)
  ].join("||");
}

function summarizeGroupJudgement(yearItems) {
  if (!yearItems.length) return "판정 보류";
  if (yearItems.length === 1) return yearItems[0].analysis.judgement;

  const counts = {
    안정: yearItems.filter(x => x.analysis.judgement === "안정").length,
    적정: yearItems.filter(x => x.analysis.judgement === "적정").length,
    상향: yearItems.filter(x => x.analysis.judgement === "상향").length,
    도전: yearItems.filter(x => x.analysis.judgement === "도전").length
  };

  if (counts.안정 >= 2) return "안정";
  if (counts.안정 + counts.적정 >= 2) return "적정";
  if (counts.상향 >= 1 || counts.적정 >= 1) return "상향";
  if (counts.도전 >= 1) return "도전";
  return "판정 보류";
}

function buildGroupedResults(analyzedList) {
  const map = new Map();

  analyzedList.forEach(item => {
    const key = buildGroupKey(item);

    if (!map.has(key)) {
      map.set(key, {
        key,
        university: item.university,
        major: item.major,
        admission_name: item.admission_name,
        years: []
      });
    }

    map.get(key).years.push(item);
  });

  return Array.from(map.values()).map(group => {
    group.years.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));

    const latest = group.years[0];
    const summaryJudgement = summarizeGroupJudgement(group.years);

    const trendText = group.years
      .slice(0, 3)
      .map(item => `${item.year} ${item.analysis.judgement}`)
      .join(" / ");

    const relevanceScore = group.years.reduce((sum, item) => {
      return sum + (item.analysis.adjustedDiff == null ? 999 : Math.abs(item.analysis.adjustedDiff));
    }, 0) / group.years.length;

    return {
      ...group,
      latest,
      summaryJudgement,
      trendText,
      summaryText: latest.analysis.summaryText,
      relevanceScore
    };
  });
}

function renderStats(groupedList) {
  const statsBox = $("resultStats");
  if (!statsBox) return;

  const currentFilter = canonicalFilterValue(getValue("judgementFilter") || "all");

  const safe = groupedList.filter(item => item.summaryJudgement === "안정").length;
  const fit = groupedList.filter(item => item.summaryJudgement === "적정").length;
  const up = groupedList.filter(item => item.summaryJudgement === "상향").length;
  const challenge = groupedList.filter(item => item.summaryJudgement === "도전").length;
  const total = safe + fit + up + challenge;

  statsBox.innerHTML = `
    <button type="button" class="stat-chip is-clickable ${currentFilter === "all" ? "is-active" : ""}" data-filter="all">전체 ${total}</button>
    <button type="button" class="stat-chip stat-safe is-clickable ${currentFilter === "안정" ? "is-active" : ""}" data-filter="안정">안정 ${safe}</button>
    <button type="button" class="stat-chip stat-fit is-clickable ${currentFilter === "적정" ? "is-active" : ""}" data-filter="적정">적정 ${fit}</button>
    <button type="button" class="stat-chip stat-up is-clickable ${currentFilter === "상향" ? "is-active" : ""}" data-filter="상향">상향 ${up}</button>
    <button type="button" class="stat-chip is-clickable ${currentFilter === "도전" ? "is-active" : ""}" data-filter="도전">도전 ${challenge}</button>
  `;

  bindStatChips();
}

function makeInfoCard(label, value) {
  return `
    <div class="school-info-card">
      <div class="school-info-label">${escapeHtml(label)}</div>
      <div class="school-info-value">${escapeHtml(String(value))}</div>
    </div>
  `;
}

function makeMetaChip(text) {
  return `<span class="meta-chip">${escapeHtml(text)}</span>`;
}

function makeLatestMetaChips(latest) {
  const chips = [];

  if (latest.grade_ref != null) chips.push(makeMetaChip(`최근 기준내신 ${latest.grade_ref.toFixed(2)}`));
  if (latest.interview) chips.push(makeMetaChip("면접 있음"));
  else chips.push(makeMetaChip("면접 없음"));

  if (latest.csat_min_required) {
    chips.push(makeMetaChip(`수능최저 ${safeValue(latest.csat_min_rule, "있음")}`));
  } else {
    chips.push(makeMetaChip("수능최저 없음"));
  }

  if (hasValue(latest.document_intensity)) {
    chips.push(makeMetaChip(`서류강도 ${latest.document_intensity}`));
  }

  if (hasValue(latest.competition_rate)) {
    chips.push(makeMetaChip(`경쟁률 ${latest.competition_rate}`));
  }

  return chips.join("");
}

function sanitizeForId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function makeGroupDetailDomId(group) {
  return `total-group-detail-${sanitizeForId(group.key)}`;
}

function makeYearDetailKey(groupKey, item) {
  return `${groupKey}__${item.year || "year"}__${item.__index || ""}`;
}

function makeYearDetailDomId(group, item) {
  return `total-year-detail-${sanitizeForId(makeYearDetailKey(group.key, item))}`;
}

function syncOpenStatesWithResults(groupedList) {
  const validGroupKeys = new Set(groupedList.map(group => group.key));
  const validYearKeys = new Set();

  groupedList.forEach(group => {
    group.years.forEach(item => {
      validYearKeys.add(makeYearDetailKey(group.key, item));
    });
  });

  [...OPEN_GROUP_DETAILS].forEach(key => {
    if (!validGroupKeys.has(key)) OPEN_GROUP_DETAILS.delete(key);
  });

  [...OPEN_YEAR_DETAILS].forEach(key => {
    if (!validYearKeys.has(key)) OPEN_YEAR_DETAILS.delete(key);
  });
}

function makeYearBlock(group, item) {
  const yearDetailKey = makeYearDetailKey(group.key, item);
  const yearDetailId = makeYearDetailDomId(group, item);
  const isOpen = OPEN_YEAR_DETAILS.has(yearDetailKey);

  const infoCards = [
    item.grade_ref != null ? makeInfoCard("기준내신", item.grade_ref.toFixed(2)) : "",
    hasValue(item.document_intensity) ? makeInfoCard("서류강도", item.document_intensity) : "",
    hasValue(item.document_focus) ? makeInfoCard("서류중점", item.document_focus) : "",
    hasValue(item.activity_keywords) ? makeInfoCard("활동 키워드", item.activity_keywords) : "",
    makeInfoCard("면접", item.interview ? "있음" : "없음"),
    makeInfoCard("수능최저", item.csat_min_required ? safeValue(item.csat_min_rule, "있음") : "없음"),
    hasValue(item.competition_rate) ? makeInfoCard("경쟁률", item.competition_rate) : "",
    hasValue(item.registered_count) ? makeInfoCard("모집인원", item.registered_count) : "",
    hasValue(item.add_admit_count) ? makeInfoCard("추합인원", item.add_admit_count) : ""
  ].join("");

  return `
    <div class="year-block">
      <button
        type="button"
        class="year-toggle"
        data-target="${yearDetailId}"
        data-year-key="${escapeHtml(yearDetailKey)}"
        aria-expanded="${isOpen ? "true" : "false"}"
      >
        <span class="year-toggle-top">
          <span class="year-title">${escapeHtml(item.year)}</span>
          <span class="${badgeClass(item.analysis.judgement)}">${escapeHtml(item.analysis.judgement)}</span>
        </span>
        <span class="year-toggle-summary">${escapeHtml(item.analysis.summaryText)}</span>
      </button>

      <div class="year-body" id="${yearDetailId}" ${isOpen ? "" : "hidden"}>
        <div class="school-info-grid">
          ${infoCards}
        </div>

        ${safeValue(item.grade_note) !== "-" ? `<div class="detail-note"><strong>기준 설명</strong> ${escapeHtml(item.grade_note)}</div>` : ""}
        ${safeValue(item.selection_note) !== "-" ? `<div class="detail-note"><strong>전형 주의사항</strong> ${escapeHtml(item.selection_note)}</div>` : ""}
        ${item.notes ? `<div class="detail-note"><strong>비고</strong> ${escapeHtml(item.notes)}</div>` : ""}
      </div>
    </div>
  `;
}

function makeCard(group) {
  const detailId = makeGroupDetailDomId(group);
  const latest = group.latest;
  const isOpen = OPEN_GROUP_DETAILS.has(group.key);

  return `
    <article class="compact-card school-card" data-group-key="${escapeHtml(group.key)}">
      <div class="compact-top">
        <div class="compact-main">
          <span class="${badgeClass(group.summaryJudgement)}">${escapeHtml(group.summaryJudgement)}</span>
          <div class="compact-title-wrap">
            <div class="compact-title">${escapeHtml(group.university)} ${escapeHtml(group.major)}</div>
            <div class="compact-meta">${escapeHtml(group.admission_name)} · ${escapeHtml(latest.group)} · 최근 기준 ${escapeHtml(latest.year)}</div>
          </div>
        </div>

        <button
          type="button"
          class="detail-toggle"
          data-target="${detailId}"
          data-group-key="${escapeHtml(group.key)}"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          ${isOpen ? "연도닫기" : "연도보기"}
        </button>
      </div>

      <div class="compact-summary">
        <div class="summary-line"><strong>3개년 흐름</strong> ${escapeHtml(group.trendText || "데이터 없음")}</div>
        <div class="summary-side">${escapeHtml(group.summaryText || "")}</div>
      </div>

      <div class="meta-chip-row">
        ${makeLatestMetaChips(latest)}
      </div>

      <div class="year-chip-row">
        ${group.years.map(item => `
          <span class="year-chip ${judgementToneClass(item.analysis.judgement)}">
            ${escapeHtml(item.year)} ${escapeHtml(item.analysis.judgement)}
          </span>
        `).join("")}
      </div>

      <div class="detail-panel" id="${detailId}" ${isOpen ? "" : "hidden"}>
        <div class="year-block-list">
          ${group.years.map(item => makeYearBlock(group, item)).join("")}
        </div>
      </div>
    </article>
  `;
}

function bindDetailToggles() {
  document.querySelectorAll(".detail-toggle").forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const groupKey = btn.getAttribute("data-group-key");
      const panel = document.getElementById(targetId);
      if (!panel || !groupKey) return;

      const isHidden = panel.hasAttribute("hidden");

      if (isHidden) {
        panel.removeAttribute("hidden");
        btn.textContent = "연도닫기";
        btn.setAttribute("aria-expanded", "true");
        OPEN_GROUP_DETAILS.add(groupKey);
      } else {
        panel.setAttribute("hidden", "");
        btn.textContent = "연도보기";
        btn.setAttribute("aria-expanded", "false");
        OPEN_GROUP_DETAILS.delete(groupKey);
      }
    };
  });
}

function bindYearToggles() {
  document.querySelectorAll(".year-toggle").forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const yearKey = btn.getAttribute("data-year-key");
      const panel = document.getElementById(targetId);
      if (!panel || !yearKey) return;

      if (panel.hasAttribute("hidden")) {
        panel.removeAttribute("hidden");
        btn.setAttribute("aria-expanded", "true");
        OPEN_YEAR_DETAILS.add(yearKey);
      } else {
        panel.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", "false");
        OPEN_YEAR_DETAILS.delete(yearKey);
      }
    };
  });
}

function bindJudgementTabs() {
  document.querySelectorAll(".judge-tab").forEach(tab => {
    tab.onclick = () => {
      const value = canonicalFilterValue(tab.getAttribute("data-value") || "all");
      setJudgementFilter(value);

      if (hasAnyStudentInput()) {
        searchResults();
      }
    };
  });
}

function bindStatChips() {
  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const value = canonicalFilterValue(btn.getAttribute("data-filter") || "all");
      setJudgementFilter(value);

      if (hasAnyStudentInput()) {
        searchResults();
      }
    };
  });
}

function renderCurrentResults() {
  const total = LAST_RESULTS.length;

  if ($("resultCount")) {
    $("resultCount").textContent = `조회 결과 ${total}개 전형`;
  }

  if (!total) {
    $("resultList").innerHTML = `<div class="empty">조건에 맞는 결과가 없습니다.</div>`;
    return;
  }

  syncOpenStatesWithResults(LAST_RESULTS);

  $("resultList").innerHTML = LAST_RESULTS.map(group => makeCard(group)).join("");

  bindDetailToggles();
  bindYearToggles();
}

function searchResults() {
  const keyword = getValue("keyword").toLowerCase();
  const groupFilter = getValue("groupFilter");
  const judgementFilter = canonicalFilterValue(getValue("judgementFilter") || "all");
  const studentGrade = getStudentGrade();

  if (studentGrade == null) {
    alert("전체 내신 평균을 입력해주세요.");
    return;
  }

  let list = [...TOTAL_DATA];

  if (keyword) {
    list = list.filter(item => {
      const univ = String(item.university || "").toLowerCase();
      const major = String(item.major || "").toLowerCase();
      const admission = String(item.admission_name || "").toLowerCase();
      return univ.includes(keyword) || major.includes(keyword) || admission.includes(keyword);
    });
  }

  if (groupFilter !== "all") {
    list = list.filter(item => item.group === groupFilter);
  }

  const analyzedList = list.map(item => ({
    ...item,
    analysis: evaluateTotalRecord(studentGrade, item)
  }));

  const allGroupedList = buildGroupedResults(analyzedList);

  renderStats(allGroupedList);

  let groupedList = [...allGroupedList];

  groupedList = groupedList.filter(item =>
    ["안정", "적정", "상향", "도전"].includes(item.summaryJudgement)
  );

  if (judgementFilter !== "all") {
    groupedList = groupedList.filter(item => item.summaryJudgement === judgementFilter);
  }

  groupedList.sort((a, b) => {
    const rankDiff = judgementRank(a.summaryJudgement) - judgementRank(b.summaryJudgement);
    if (rankDiff !== 0) return rankDiff;

    const relevanceDiff = a.relevanceScore - b.relevanceScore;
    if (relevanceDiff !== 0) return relevanceDiff;

    return String(a.university || "").localeCompare(String(b.university || ""), "ko");
  });

  LAST_RESULTS = groupedList;
  renderCurrentResults();
}

function scheduleAutoSearch() {
  if (autoSearchTimer) {
    clearTimeout(autoSearchTimer);
  }

  autoSearchTimer = setTimeout(() => {
    if (hasAnyStudentInput()) {
      searchResults();
    }
  }, 180);
}

function preventNumberInputSideEffects() {
  ["gradeAvg"].forEach(id => {
    const el = $(id);
    if (!el) return;

    el.addEventListener("wheel", (e) => {
      if (document.activeElement === el) {
        e.preventDefault();
        el.blur();
      }
    }, { passive: false });

    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      }
    });
  });
}

function resetForm() {
  if ($("gradeAvg")) $("gradeAvg").value = "";
  if ($("groupFilter")) $("groupFilter").value = "all";
  if ($("keyword")) $("keyword").value = "";

  setJudgementFilter("all");

  LAST_RESULTS = [];
  OPEN_GROUP_DETAILS.clear();
  OPEN_YEAR_DETAILS.clear();

  if ($("resultCount")) $("resultCount").textContent = "결과 없음";
  if ($("resultStats")) $("resultStats").innerHTML = "";
  if ($("resultList")) {
    $("resultList").innerHTML = `<div class="empty">조건을 입력한 뒤 판정 보기를 눌러주세요.</div>`;
  }
}

async function init() {
  try {
    await loadData();

    setJudgementFilter("all");
    bindJudgementTabs();
    preventNumberInputSideEffects();

    if ($("btnSearch")) $("btnSearch").addEventListener("click", searchResults);
    if ($("btnReset")) $("btnReset").addEventListener("click", resetForm);

    ["keyword", "gradeAvg"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("input", scheduleAutoSearch);
        $(id).addEventListener("keydown", (e) => {
          if (e.key === "Enter") searchResults();
        });
      }
    });

    if ($("groupFilter")) {
      $("groupFilter").addEventListener("change", scheduleAutoSearch);
    }
  } catch (err) {
    console.error(err);
    if ($("resultCount")) $("resultCount").textContent = "데이터 오류";
    if ($("resultStats")) $("resultStats").innerHTML = "";
    if ($("resultList")) {
      $("resultList").innerHTML = `<div class="empty">데이터 파일을 불러오지 못했습니다. 경로를 확인해주세요.</div>`;
    }
  }
}

window.addEventListener("DOMContentLoaded", init);
