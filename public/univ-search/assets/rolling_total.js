let TOTAL_DATA = [];
let LAST_RESULTS = [];
let autoSearchTimer = null;
let visibleResultCount = 5;
let DATA_READY = false;
let LOAD_ERROR = "";

const PAGE_SIZE = 5;
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
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()[\]{}\/\\·,.\-_:]/g, "")
    .trim();
}

function canonicalFilterValue(value) {
  const v = normalizeText(value);
  if (!v) return "전체";
  if (["전체", "all"].includes(v)) return "전체";
  if (["안정", "safe", "stable"].includes(v)) return "안정";
  if (["적정", "fit", "match"].includes(v)) return "적정";
  if (["상향", "up", "reach", "도전", "challenge"].includes(v)) return "상향";
  return "전체";
}

function canonicalGroupValue(value) {
  const v = normalizeText(value);

  if (!v) return "";
  if (["자연", "자연계", "자연계열", "이공", "이공계", "공학", "공학계열"].includes(v)) return "자연";
  if (["인문", "인문계", "인문계열", "사회", "어문"].includes(v)) return "인문";
  if (["상경", "상경계", "상경계열", "경영", "경제", "biz"].includes(v)) return "상경";
  if (["예체능", "예능", "체능", "미술", "음악", "체육"].includes(v)) return "예체능";
  if (["전체", "all"].includes(v)) return "전체";

  return String(value || "").trim();
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

function normalizeTotalItem(item, index) {
  const gradeCut9 = getRawNum(item, [
    "grade_cut_9",
    "grade9",
    "base_grade_9",
    "기준내신9",
    "원본9등급컷",
    "기준내신",
    "grade_ref"
  ]);

  const gradeCut5Avg = getRawNum(item, [
    "grade_cut_5_avg",
    "grade5Average",
    "base_grade_5_avg",
    "환산5등급컷",
    "grade_cut",
    "기준내신5"
  ]);

  const gradeCut5Conservative = getRawNum(item, [
    "grade_cut_5_conservative",
    "grade5Conservative",
    "base_grade_5_conservative",
    "환산5등급보수컷",
    "grade_cut_range_min"
  ]);

  const gradeCut5Relaxed = getRawNum(item, [
    "grade_cut_5_relaxed",
    "grade5Relaxed",
    "base_grade_5_relaxed",
    "환산5등급완화컷",
    "grade_cut_range_max"
  ]);

  return {
    __index: index,
    year: String(getRawValue(item, ["year", "연도", "년도"], "")).trim(),
    track: String(getRawValue(item, ["track", "전형구분"], "수시")).trim(),
    subtrack: String(getRawValue(item, ["subtrack", "세부전형"], "학생부종합")).trim(),

    university: String(getRawValue(item, ["university", "univ", "대학", "학교명"], "")).trim(),
    major: String(getRawValue(item, ["major", "학과", "모집단위"], "")).trim(),
    admission_name: String(getRawValue(item, ["admission_name", "전형명", "admission"], "")).trim(),

    group: canonicalGroupValue(getRawValue(item, ["group", "계열"], "")),
    region: String(getRawValue(item, ["region", "지역"], "")).trim(),

    grade_cut_9: gradeCut9,
    grade_cut_5_avg: gradeCut5Avg,
    grade_cut_5_conservative: gradeCut5Conservative,
    grade_cut_5_relaxed: gradeCut5Relaxed,

    csat_min_required: boolValue(getRawValue(item, ["csat_min_required", "수능최저필수"], false)),
    csat_min_rule: String(getRawValue(item, ["csat_min_rule", "수능최저"], "")).trim(),

    interview: boolValue(getRawValue(item, ["interview", "면접"], false)),
    document_type: String(getRawValue(item, ["document_type", "서류유형"], "")).trim(),

    competition_rate: String(getRawValue(item, ["competition_rate", "경쟁률"], "")).trim(),
    registered_count: getRawValue(item, ["registered_count", "모집인원"], ""),
    add_admit_count: getRawValue(item, ["add_admit_count", "추합인원", "추가합격", "충원인원"], ""),

    selection_note: String(getRawValue(item, ["selection_note", "전형주의사항"], "")).trim(),
    notes: String(getRawValue(item, ["notes", "비고", "메모", "grade_note"], "")).trim()
  };
}

async function loadData() {
  DATA_READY = false;
  LOAD_ERROR = "";

  const res = await fetch("data/rolling_total_data.json?v=20260312-1", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`학생부종합 데이터 파일을 불러오지 못했습니다. (${res.status})`);
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

  DATA_READY = true;
}

function getStudentInput() {
  const grade9 = parseNum(getValue("gradeAvg9"));
  const grade5 = parseNum(getValue("gradeAvg5"));

  if (grade9 != null && grade5 != null) {
    return {
      error: "9등급제와 5등급제 내신을 동시에 입력할 수 없습니다. 한 칸만 입력해주세요."
    };
  }

  if (grade9 != null) return { system: "9", grade: grade9 };
  if (grade5 != null) return { system: "5", grade: grade5 };

  return { system: null, grade: null };
}

function hasAnyStudentInput() {
  const input = getStudentInput();
  return input.grade != null;
}

function hasSearchSignal() {
  const keyword = normalizeText(getValue("keyword"));
  const groupFilterRaw = getValue("groupFilter");
  const groupFilter = groupFilterRaw === "all" ? "전체" : canonicalGroupValue(groupFilterRaw);
  return !!keyword || (groupFilter !== "전체" && groupFilter !== "" && groupFilter !== "all");
}

function hasLiveSignal() {
  return hasAnyStudentInput() || hasSearchSignal();
}

function setJudgementFilter(value) {
  const finalValue = canonicalFilterValue(value || "전체");

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

function getPreferredCutInfo(item, system) {
  if (system === "9" && item.grade_cut_9 != null) {
    return { label: "내신", value: item.grade_cut_9 };
  }

  if (system === "5" && item.grade_cut_5_avg != null) {
    return { label: "5등급 내신", value: item.grade_cut_5_avg };
  }

  return null;
}

function evaluateTotalRecord(studentInput, item) {
  const { system, grade } = studentInput;
  const cutInfo = getPreferredCutInfo(item, system);

  if (grade == null || !system || !cutInfo) {
    return {
      judgement: "판정 보류",
      diff: null,
      cutLabel: null,
      cutValue: null,
      summaryText: "학생 내신 또는 비교 기준 컷 정보가 없습니다."
    };
  }

  const cut = cutInfo.value;
  const diff = grade - cut;
  let judgement = "판정 보류";

  if (diff <= -0.15) judgement = "안정";
  else if (diff <= 0.15) judgement = "적정";
  else if (diff <= 0.55) judgement = "상향";
  else judgement = "판정 보류";

  const summaryText = `내신 ${grade.toFixed(2)} / ${cutInfo.label} ${cut.toFixed(2)} / ${
    diff <= 0 ? `${Math.abs(diff).toFixed(2)}등급 여유` : `${diff.toFixed(2)}등급 부족`
  }`;

  return {
    judgement,
    diff,
    cutLabel: cutInfo.label,
    cutValue: cut,
    summaryText
  };
}

function buildInfoSummary(item) {
  const parts = [];

  if (item.grade_cut_9 != null) parts.push(`내신 ${item.grade_cut_9.toFixed(2)}`);
  if (item.grade_cut_5_avg != null) parts.push(`5등급 변환기준 ${item.grade_cut_5_avg.toFixed(2)}`);
  if (hasValue(item.competition_rate)) parts.push(`경쟁률 ${item.competition_rate}`);
  if (item.csat_min_required) parts.push(`수능최저 ${safeValue(item.csat_min_rule, "있음")}`);
  else parts.push("수능최저 없음");

  return parts.join(" / ") || "전형 정보";
}

function judgementRank(label) {
  const map = {
    "안정": 1,
    "적정": 2,
    "상향": 3,
    "정보": 4,
    "판정 보류": 5
  };
  return map[label] ?? 99;
}

function judgementToneClass(label) {
  switch (label) {
    case "안정": return "is-safe";
    case "적정": return "is-fit";
    case "상향": return "is-up";
    default: return "";
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

  if (yearItems.every(x => x.analysis.judgement === "정보")) {
    return "정보";
  }

  if (yearItems.length === 1) return yearItems[0].analysis.judgement;

  const counts = {
    안정: yearItems.filter(x => x.analysis.judgement === "안정").length,
    적정: yearItems.filter(x => x.analysis.judgement === "적정").length,
    상향: yearItems.filter(x => x.analysis.judgement === "상향").length,
    보류: yearItems.filter(x => x.analysis.judgement === "판정 보류").length
  };

  if (counts.안정 >= 2) return "안정";
  if (counts.안정 + counts.적정 >= 2) return "적정";
  if (counts.상향 >= 1 || counts.적정 >= 1) return "상향";
  if (counts.보류 >= 1) return "판정 보류";
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
      return sum + (item.analysis.diff == null ? 999 : Math.abs(item.analysis.diff));
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

function renderStats(groupedList, hasGrade = true) {
  const statsBox = $("resultStats");
  if (!statsBox) return;

  const currentFilter = canonicalFilterValue(getValue("judgementFilter") || "전체");

  if (!hasGrade) {
    statsBox.innerHTML = `
      <button type="button" class="stat-chip is-active">전체 ${groupedList.length}</button>
    `;
    return;
  }

  const judgedList = groupedList.filter(item => ["안정", "적정", "상향"].includes(item.summaryJudgement));
  const safe = judgedList.filter(item => item.summaryJudgement === "안정").length;
  const fit = judgedList.filter(item => item.summaryJudgement === "적정").length;
  const up = judgedList.filter(item => item.summaryJudgement === "상향").length;

  statsBox.innerHTML = `
    <button type="button" class="stat-chip is-clickable ${currentFilter === "전체" ? "is-active" : ""}" data-filter="전체">전체 ${judgedList.length}</button>
    <button type="button" class="stat-chip stat-safe is-clickable ${currentFilter === "안정" ? "is-active" : ""}" data-filter="안정">안정 ${safe}</button>
    <button type="button" class="stat-chip stat-fit is-clickable ${currentFilter === "적정" ? "is-active" : ""}" data-filter="적정">적정 ${fit}</button>
    <button type="button" class="stat-chip stat-up is-clickable ${currentFilter === "상향" ? "is-active" : ""}" data-filter="상향">상향 ${up}</button>
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

function makeCutInfoCards(item) {
  const cards = [];

  if (item.grade_cut_9 != null) {
    cards.push(makeInfoCard("내신", item.grade_cut_9.toFixed(2)));
  }

  if (item.grade_cut_5_avg != null) {
    cards.push(makeInfoCard("5등급 변환기준", item.grade_cut_5_avg.toFixed(2)));
  }

  if (item.grade_cut_5_conservative != null && item.grade_cut_5_relaxed != null) {
    cards.push(
      makeInfoCard(
        "5등급 범위",
        `${item.grade_cut_5_conservative.toFixed(2)} ~ ${item.grade_cut_5_relaxed.toFixed(2)}`
      )
    );
  }

  return cards.join("");
}

function makeMetaChip(text) {
  return `<span class="meta-chip">${escapeHtml(text)}</span>`;
}

function makeLatestMetaChips(latest) {
  const chips = [];

  if (latest.grade_cut_9 != null) chips.push(makeMetaChip(`내신 ${latest.grade_cut_9.toFixed(2)}`));
  if (latest.grade_cut_5_avg != null) chips.push(makeMetaChip(`5등급 변환기준 ${latest.grade_cut_5_avg.toFixed(2)}`));
  if (latest.grade_cut_5_conservative != null && latest.grade_cut_5_relaxed != null) {
    chips.push(makeMetaChip(`5등급 범위 ${latest.grade_cut_5_conservative.toFixed(2)}~${latest.grade_cut_5_relaxed.toFixed(2)}`));
  }
  if (latest.csat_min_required) chips.push(makeMetaChip(`수능최저 ${safeValue(latest.csat_min_rule, "있음")}`));
  else chips.push(makeMetaChip("수능최저 없음"));
  if (hasValue(latest.competition_rate)) chips.push(makeMetaChip(`경쟁률 ${latest.competition_rate}`));
  if (hasValue(latest.add_admit_count)) chips.push(makeMetaChip(`추합인원 ${latest.add_admit_count}`));

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

  const csatText = item.csat_min_required ? safeValue(item.csat_min_rule, "있음") : "없음";
  const interviewText = item.interview ? "있음" : "없음";

  const infoCards = [
    makeCutInfoCards(item),
    hasValue(item.region) ? makeInfoCard("지역", item.region) : "",
    makeInfoCard("수능최저", csatText),
    makeInfoCard("면접", interviewText),
    hasValue(item.competition_rate) ? makeInfoCard("경쟁률", item.competition_rate) : "",
    hasValue(item.registered_count) ? makeInfoCard("모집인원", item.registered_count) : "",
    hasValue(item.add_admit_count) ? makeInfoCard("추합인원", item.add_admit_count) : ""
  ].join("");

  return `
    <div class="year-block">
      <button type="button" class="year-toggle" data-target="${yearDetailId}" data-year-key="${escapeHtml(yearDetailKey)}" aria-expanded="${isOpen ? "true" : "false"}">
        <span class="year-toggle-top">
          <span class="year-title">${escapeHtml(item.year)}</span>
          <span class="${badgeClass(item.analysis.judgement)}">${escapeHtml(item.analysis.judgement)}</span>
        </span>
        <span class="year-toggle-summary">${escapeHtml(item.analysis.summaryText)}</span>
      </button>

      <div class="year-body" id="${yearDetailId}" ${isOpen ? "" : "hidden"}>
        <div class="school-info-grid">${infoCards}</div>
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
  const groupLabel = latest.group || "계열 미입력";

  return `
    <article class="compact-card school-card" data-group-key="${escapeHtml(group.key)}">
      <div class="compact-top">
        <div class="compact-main">
          <span class="${badgeClass(group.summaryJudgement)}">${escapeHtml(group.summaryJudgement)}</span>
          <div class="compact-title-wrap">
            <div class="compact-title">${escapeHtml(group.university)} ${escapeHtml(group.major)}</div>
            <div class="compact-meta">${escapeHtml(group.admission_name)} · ${escapeHtml(groupLabel)} · 최근 기준 ${escapeHtml(latest.year)}</div>
          </div>
        </div>

        <button type="button" class="detail-toggle" data-target="${detailId}" data-group-key="${escapeHtml(group.key)}" aria-expanded="${isOpen ? "true" : "false"}">
          ${isOpen ? "연도닫기" : "연도보기"}
        </button>
      </div>

      <div class="compact-summary">
        <div class="summary-line"><strong>3개년 흐름</strong> ${escapeHtml(group.trendText || "데이터 없음")}</div>
        <div class="summary-side">${escapeHtml(group.summaryText || "")}</div>
      </div>

      <div class="meta-chip-row">${makeLatestMetaChips(latest)}</div>

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
      const value = canonicalFilterValue(tab.getAttribute("data-value") || "전체");
      setJudgementFilter(value);

      if (DATA_READY && hasLiveSignal()) {
        searchResults();
      }
    };
  });
}

function bindStatChips() {
  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const value = canonicalFilterValue(btn.getAttribute("data-filter") || "전체");
      setJudgementFilter(value);

      if (DATA_READY && hasLiveSignal()) {
        searchResults();
      }
    };
  });
}

function resetVisibleResultCount() {
  visibleResultCount = PAGE_SIZE;
}

function bindLoadMoreButton() {
  const btn = $("btnLoadMore");
  if (!btn) return;

  btn.onclick = () => {
    visibleResultCount += PAGE_SIZE;
    renderCurrentResults();
  };
}

function renderCurrentResults(hasGrade = hasAnyStudentInput()) {
  const total = LAST_RESULTS.length;

  if ($("resultCount")) {
    $("resultCount").textContent = `${hasGrade ? "조회 결과" : "검색 결과"} ${total}개 전형`;
  }

  if (!total) {
    $("resultList").innerHTML = `<div class="empty">조건에 맞는 결과가 없습니다.</div>`;
    return;
  }

  const visibleList = LAST_RESULTS.slice(0, visibleResultCount);
  syncOpenStatesWithResults(visibleList);

  const moreButtonHtml = total > visibleResultCount
    ? `
      <div class="load-more-wrap">
        <button type="button" class="load-more-btn" id="btnLoadMore">5개 더 보기 (${Math.min(visibleResultCount, total)} / ${total})</button>
      </div>
    `
    : "";

  $("resultList").innerHTML = visibleList.map(group => makeCard(group)).join("") + moreButtonHtml;

  bindDetailToggles();
  bindYearToggles();
  bindLoadMoreButton();
}

function compareGroups(a, b) {
  const rankDiff = judgementRank(a.summaryJudgement) - judgementRank(b.summaryJudgement);
  if (rankDiff !== 0) return rankDiff;

  const relevanceDiff = a.relevanceScore - b.relevanceScore;
  if (relevanceDiff !== 0) return relevanceDiff;

  const uniDiff = String(a.university || "").localeCompare(String(b.university || ""), "ko");
  if (uniDiff !== 0) return uniDiff;

  return String(a.major || "").localeCompare(String(b.major || ""), "ko");
}

function searchResults() {
  if (!DATA_READY) {
    if (LOAD_ERROR) {
      alert(`데이터 오류: ${LOAD_ERROR}`);
    } else {
      alert("데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
    }
    return;
  }

  const keyword = getValue("keyword");
  const keywordNorm = normalizeText(keyword);
  const groupFilterRaw = getValue("groupFilter");
  const groupFilter = groupFilterRaw === "all" ? "전체" : canonicalGroupValue(groupFilterRaw);
  const judgementFilter = canonicalFilterValue(getValue("judgementFilter") || "전체");
  const studentInput = getStudentInput();

  if (studentInput.error) {
    alert(studentInput.error);
    return;
  }

  const hasGrade = studentInput.grade != null;
  const hasKeywordOrFilter = !!keywordNorm || (groupFilter !== "전체" && groupFilter !== "all" && groupFilter !== "");

  if (!hasGrade && !hasKeywordOrFilter) {
    if ($("resultCount")) $("resultCount").textContent = "결과 없음";
    if ($("resultStats")) $("resultStats").innerHTML = "";
    if ($("resultList")) $("resultList").innerHTML = `<div class="empty">조건을 입력한 뒤 판정 보기를 눌러주세요.</div>`;
    LAST_RESULTS = [];
    resetVisibleResultCount();
    return;
  }

  let list = [...TOTAL_DATA];

  if (keywordNorm) {
    const tokens = keyword
      .split(/[\s,/]+/)
      .map(t => normalizeText(t))
      .filter(Boolean);

    list = list.filter(item => {
      const searchTarget = normalizeText(`${item.university || ""} ${item.major || ""} ${item.admission_name || ""}`);
      return tokens.every(token => searchTarget.includes(token));
    });
  }

  if (groupFilter !== "전체" && groupFilter !== "all" && groupFilter !== "") {
    list = list.filter(item => canonicalGroupValue(item.group) === groupFilter);
  }

  let groupedList = [];

  if (!hasGrade) {
    const infoList = list.map(item => ({
      ...item,
      analysis: {
        judgement: "정보",
        diff: null,
        cutLabel: null,
        cutValue: null,
        summaryText: buildInfoSummary(item)
      }
    }));

    groupedList = buildGroupedResults(infoList);
    groupedList.sort(compareGroups);

    resetVisibleResultCount();
    LAST_RESULTS = groupedList;
    renderStats(groupedList, false);
    renderCurrentResults(false);
    return;
  }

  const analyzedList = list.map(item => ({
    ...item,
    analysis: evaluateTotalRecord(studentInput, item)
  }));

  const allGroupedList = buildGroupedResults(analyzedList);
  const judgedList = allGroupedList.filter(item => ["안정", "적정", "상향"].includes(item.summaryJudgement));
  renderStats(allGroupedList, true);

  groupedList = judgementFilter === "전체"
    ? judgedList
    : judgedList.filter(item => item.summaryJudgement === judgementFilter);

  groupedList.sort(compareGroups);

  resetVisibleResultCount();
  LAST_RESULTS = groupedList;
  renderCurrentResults(true);
}

function scheduleAutoSearch() {
  if (autoSearchTimer) clearTimeout(autoSearchTimer);

  autoSearchTimer = setTimeout(() => {
    if (!DATA_READY) return;

    if (!hasLiveSignal()) {
      if ($("resultCount")) $("resultCount").textContent = "결과 없음";
      if ($("resultStats")) $("resultStats").innerHTML = "";
      if ($("resultList")) $("resultList").innerHTML = `<div class="empty">조건을 입력한 뒤 판정 보기를 눌러주세요.</div>`;
      LAST_RESULTS = [];
      resetVisibleResultCount();
      return;
    }

    searchResults();
  }, 180);
}

function preventNumberInputSideEffects() {
  ["gradeAvg9", "gradeAvg5"].forEach(id => {
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
  if ($("gradeAvg9")) $("gradeAvg9").value = "";
  if ($("gradeAvg5")) $("gradeAvg5").value = "";
  if ($("groupFilter")) $("groupFilter").value = "all";
  if ($("keyword")) $("keyword").value = "";

  setJudgementFilter("전체");
  LAST_RESULTS = [];
  OPEN_GROUP_DETAILS.clear();
  OPEN_YEAR_DETAILS.clear();
  resetVisibleResultCount();

  if ($("resultCount")) $("resultCount").textContent = "결과 없음";
  if ($("resultStats")) $("resultStats").innerHTML = "";
  if ($("resultList")) $("resultList").innerHTML = `<div class="empty">조건을 입력한 뒤 판정 보기를 눌러주세요.</div>`;
}

async function init() {
  try {
    await loadData();
    setJudgementFilter("전체");
    bindJudgementTabs();
    preventNumberInputSideEffects();

    if ($("btnSearch")) $("btnSearch").addEventListener("click", searchResults);
    if ($("btnReset")) $("btnReset").addEventListener("click", resetForm);

    ["keyword", "gradeAvg9", "gradeAvg5"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("input", scheduleAutoSearch);
        $(id).addEventListener("keydown", (e) => {
          if (e.key === "Enter") searchResults();
        });
      }
    });

    ["groupFilter"].forEach(id => {
      if ($(id)) $(id).addEventListener("change", scheduleAutoSearch);
    });
  } catch (err) {
    LOAD_ERROR = err.message || "알 수 없는 오류";
    console.error(err);
    if ($("resultCount")) $("resultCount").textContent = "데이터 오류";
    if ($("resultStats")) $("resultStats").innerHTML = "";
    if ($("resultList")) $("resultList").innerHTML = `<div class="empty">데이터 오류: ${escapeHtml(LOAD_ERROR)}</div>`;
  }
}

window.addEventListener("DOMContentLoaded", init);
