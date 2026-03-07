let SCHOOL_DATA = [];
let LAST_RESULTS = [];
let autoSearchTimer = null;

/* 열림 상태 유지 */
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

  if (!v) return "안정";
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

function normalizeSchoolItem(item, index) {
  const gradeCut9 = getRawNum(item, [
    "grade_cut_9",
    "grade9",
    "원본9등급컷",
    "original_grade_cut",
    "original_cut_70"
  ]);

  const gradeCut5Avg = getRawNum(item, [
    "grade_cut_5_avg",
    "grade5Average",
    "환산5등급컷",
    "grade_cut",
    "cut_70",
    "70컷",
    "70%컷",
    "기준컷",
    "교과컷"
  ]);

  const gradeCut5Conservative = getRawNum(item, [
    "grade_cut_5_conservative",
    "grade5Conservative",
    "환산5등급보수컷",
    "grade_cut_range_min"
  ]);

  const gradeCut5Relaxed = getRawNum(item, [
    "grade_cut_5_relaxed",
    "grade5Relaxed",
    "환산5등급완화컷",
    "grade_cut_range_max"
  ]);

  return {
    __index: index,
    year: String(getRawValue(item, ["year", "연도", "년도"], "")).trim(),
    track: String(getRawValue(item, ["track", "전형구분"], "수시")).trim(),
    subtrack: String(getRawValue(item, ["subtrack", "세부전형"], "학생부교과")).trim(),

    university: String(getRawValue(item, ["university", "univ", "대학", "학교명"], "")).trim(),
    major: String(getRawValue(item, ["major", "학과", "모집단위"], "")).trim(),
    admission_name: String(getRawValue(item, ["admission_name", "전형명", "admission"], "")).trim(),

    group: String(getRawValue(item, ["group", "계열"], "")).trim(),
    region: String(getRawValue(item, ["region", "지역"], "")).trim(),

    grade_cut_9: gradeCut9,
    grade_cut_5_avg: gradeCut5Avg,
    grade_cut_5_conservative: gradeCut5Conservative,
    grade_cut_5_relaxed: gradeCut5Relaxed,

    /* 기존 호환용 */
    cut_70: gradeCut5Avg,

    subject_rule: String(getRawValue(item, ["subject_rule", "반영교과"], "")).trim(),
    school_year_rule: String(getRawValue(item, ["school_year_rule", "학년반영"], "")).trim(),

    csat_min_required: boolValue(getRawValue(item, ["csat_min_required", "수능최저필수"], false)),
    csat_min_rule: String(getRawValue(item, ["csat_min_rule", "수능최저"], "")).trim(),

    interview: boolValue(getRawValue(item, ["interview", "면접"], false)),
    recommendation_required: boolValue(getRawValue(item, ["recommendation_required", "추천필요"], false)),

    competition_rate: String(getRawValue(item, ["competition_rate", "경쟁률"], "")).trim(),
    registered_count: getRawValue(item, ["registered_count", "모집인원"], ""),
    add_admit_count: getRawValue(item, ["add_admit_count", "추합인원", "추가합격", "충원인원"], ""),

    selection_note: String(getRawValue(item, ["selection_note", "전형주의사항"], "")).trim(),
    notes: String(getRawValue(item, ["notes", "비고", "메모"], "")).trim()
  };
}

async function loadData() {
  const res = await fetch("data/rolling_school_data.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("학생부교과 데이터 파일을 불러오지 못했습니다.");
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
    throw new Error("학생부교과 데이터 형식이 올바르지 않습니다.");
  }

  SCHOOL_DATA = rows
    .map((item, index) => normalizeSchoolItem(item, index))
    .filter(item => item.university || item.major || item.admission_name);

  if (!SCHOOL_DATA.length) {
    throw new Error("학생부교과 데이터는 불러왔지만 실제 행(row)이 없습니다.");
  }
}

function getStudentGrade() {
  const gradeAvg = parseNum(getValue("gradeAvg"));
  const subjectGrade = parseNum(getValue("subjectGrade"));
  return subjectGrade ?? gradeAvg;
}

function hasAnyStudentInput() {
  return getStudentGrade() != null;
}

function setJudgementFilter(value) {
  const finalValue = canonicalFilterValue(value || "안정");

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

function getPreferredCutInfo(item) {
  const cut = item.grade_cut_5_avg ?? item.cut_70;
  if (cut != null) {
    return { label: "5등급 변환컷", value: cut };
  }
  return null;
}

function evaluateSchoolRecord(studentGrade, item) {
  const cutInfo = getPreferredCutInfo(item);

  if (studentGrade == null || !cutInfo) {
    return {
      judgement: "판정 보류",
      diff: null,
      cutLabel: null,
      cutValue: null,
      summaryText: "학생 내신 또는 5등급 변환컷 정보가 없습니다."
    };
  }

  const cut = cutInfo.value;
  const diff = studentGrade - cut;
  let judgement = "판정 보류";

  if (item.csat_min_required) {
    if (diff <= -0.35) judgement = "안정";
    else if (diff <= -0.10) judgement = "적정";
    else if (diff <= 0.15) judgement = "상향";
    else if (diff <= 0.40) judgement = "도전";
    else judgement = "판정 보류";
  } else {
    if (diff <= -0.20) judgement = "안정";
    else if (diff <= 0.10) judgement = "적정";
    else if (diff <= 0.30) judgement = "상향";
    else if (diff <= 0.50) judgement = "도전";
    else judgement = "판정 보류";
  }

  const summaryText = `내신 ${studentGrade.toFixed(2)} / ${cutInfo.label} ${cut.toFixed(2)} / ${
    diff <= 0
      ? `${Math.abs(diff).toFixed(2)}등급 여유`
      : `${diff.toFixed(2)}등급 부족`
  }`;

  return {
    judgement,
    diff,
    cutLabel: cutInfo.label,
    cutValue: cut,
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

function renderStats(groupedList) {
  const statsBox = $("resultStats");
  if (!statsBox) return;

  const currentFilter = canonicalFilterValue(getValue("judgementFilter") || "안정");

  const safe = groupedList.filter(item => item.summaryJudgement === "안정").length;
  const fit = groupedList.filter(item => item.summaryJudgement === "적정").length;
  const up = groupedList.filter(item => item.summaryJudgement === "상향").length;
  const challenge = groupedList.filter(item => item.summaryJudgement === "도전").length;

  statsBox.innerHTML = `
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

function makeCutInfoCards(item) {
  const cards = [];

  if (item.grade_cut_9 != null) {
    cards.push(makeInfoCard("70%컷(원본)", item.grade_cut_9.toFixed(2)));
  }

  if (item.grade_cut_5_avg != null) {
    cards.push(makeInfoCard("5등급 변환컷", item.grade_cut_5_avg.toFixed(2)));
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

  if (latest.grade_cut_9 != null) {
    chips.push(makeMetaChip(`70%컷 ${latest.grade_cut_9.toFixed(2)}`));
  }

  if (latest.grade_cut_5_avg != null) {
    chips.push(makeMetaChip(`5등급 변환컷 ${latest.grade_cut_5_avg.toFixed(2)}`));
  }

  if (latest.grade_cut_5_conservative != null && latest.grade_cut_5_relaxed != null) {
    chips.push(
      makeMetaChip(
        `5등급 범위 ${latest.grade_cut_5_conservative.toFixed(2)}~${latest.grade_cut_5_relaxed.toFixed(2)}`
      )
    );
  }

  if (latest.csat_min_required) {
    chips.push(makeMetaChip(`수능최저 ${safeValue(latest.csat_min_rule, "있음")}`));
  } else {
    chips.push(makeMetaChip("수능최저 없음"));
  }

  if (hasValue(latest.competition_rate)) {
    chips.push(makeMetaChip(`경쟁률 ${latest.competition_rate}`));
  }

  if (hasValue(latest.add_admit_count)) {
    chips.push(makeMetaChip(`추합인원 ${latest.add_admit_count}`));
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
  return `school-group-detail-${sanitizeForId(group.key)}`;
}

function makeYearDetailKey(groupKey, item) {
  return `${groupKey}__${item.year || "year"}__${item.__index || ""}`;
}

function makeYearDetailDomId(group, item) {
  return `school-year-detail-${sanitizeForId(makeYearDetailKey(group.key, item))}`;
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

  const csatText = item.csat_min_required
    ? safeValue(item.csat_min_rule, "있음")
    : "없음";

  const interviewText = item.interview ? "있음" : "없음";
  const recommendText = item.recommendation_required ? "필요" : "불필요";

  const infoCards = [
    makeCutInfoCards(item),
    hasValue(item.subject_rule) ? makeInfoCard("반영교과", item.subject_rule) : "",
    hasValue(item.school_year_rule) ? makeInfoCard("학년 반영", item.school_year_rule) : "",
    hasValue(item.region) ? makeInfoCard("지역", item.region) : "",
    makeInfoCard("수능최저", csatText),
    makeInfoCard("면접", interviewText),
    makeInfoCard("추천 필요", recommendText),
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
      const value = canonicalFilterValue(tab.getAttribute("data-value") || "안정");
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
      const value = canonicalFilterValue(btn.getAttribute("data-filter") || "안정");
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
  const judgementFilter = canonicalFilterValue(getValue("judgementFilter") || "안정");

  const studentGrade = getStudentGrade();

  if (studentGrade == null) {
    alert("전체 내신 평균 또는 반영교과 평균을 입력해주세요.");
    return;
  }

  let list = [...SCHOOL_DATA];

  if (keyword) {
    list = list.filter(item => {
      const univ = String(item.university || "").toLowerCase();
      const major = String(item.major || "").toLowerCase();
      const admission = String(item.admission_name || "").toLowerCase();

      return (
        univ.includes(keyword) ||
        major.includes(keyword) ||
        admission.includes(keyword)
      );
    });
  }

  if (groupFilter !== "all") {
    list = list.filter(item => item.group === groupFilter);
  }

  const analyzedList = list.map(item => ({
    ...item,
    analysis: evaluateSchoolRecord(studentGrade, item)
  }));

  const allGroupedList = buildGroupedResults(analyzedList);

  renderStats(allGroupedList);

  let groupedList = [...allGroupedList];

  groupedList = groupedList.filter(item =>
    ["안정", "적정", "상향", "도전"].includes(item.summaryJudgement)
  );

  groupedList = groupedList.filter(item => item.summaryJudgement === judgementFilter);

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
  ["gradeAvg", "subjectGrade"].forEach(id => {
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
  if ($("subjectGrade")) $("subjectGrade").value = "";
  if ($("groupFilter")) $("groupFilter").value = "all";
  if ($("keyword")) $("keyword").value = "";

  setJudgementFilter("안정");

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

    setJudgementFilter("안정");
    bindJudgementTabs();
    preventNumberInputSideEffects();

    if ($("btnSearch")) $("btnSearch").addEventListener("click", searchResults);
    if ($("btnReset")) $("btnReset").addEventListener("click", resetForm);

    ["keyword", "gradeAvg", "subjectGrade"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("input", scheduleAutoSearch);
        $(id).addEventListener("keydown", (e) => {
          if (e.key === "Enter") searchResults();
        });
      }
    });

    ["groupFilter"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("change", scheduleAutoSearch);
      }
    });
  } catch (err) {
    console.error(err);
    if ($("resultCount")) $("resultCount").textContent = "데이터 오류";
    if ($("resultStats")) $("resultStats").innerHTML = "";
    if ($("resultList")) {
      $("resultList").innerHTML = `<div class="empty">데이터 오류: ${escapeHtml(err.message || "알 수 없는 오류")}</div>`;
    }
  }
}

window.addEventListener("DOMContentLoaded", init);
