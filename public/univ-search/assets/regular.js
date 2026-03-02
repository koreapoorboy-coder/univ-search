let REGULAR_DATA = [];

const DESKTOP_PAGE_SIZE = 5;
const MOBILE_PAGE_SIZE = 3;

let LAST_RESULTS = [];
let visibleCount = getPageSize();
let autoSearchTimer = null;

function getPageSize() {
  return window.innerWidth <= 768 ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
}

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

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[()[\]{}]/g, "")
    .trim()
    .toLowerCase();
}

function canonicalFilterValue(value) {
  const v = normalizeText(value);

  if (!v) return "핵심";
  if (["all", "전체"].includes(v)) return "all";
  if (["안정", "stable", "safe"].includes(v)) return "안정";
  if (["적정", "fit", "match"].includes(v)) return "적정";
  if (["상향", "reach", "up"].includes(v)) return "상향";
  if (["도전", "challenge"].includes(v)) return "도전";
  if (["핵심", "핵심합", "core"].includes(v)) return "핵심";

  return value;
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

function formatCompetitionRate(value) {
  if (value === undefined || value === null || value === "") return "-";
  const text = String(value).trim();
  if (!text) return "-";
  return text.includes(":") ? text : `${text}:1`;
}

function formatAddAdmitCount(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${value}명`;
}

function normalizeRegularItem(item, index) {
  return {
    __index: index,
    id: getRawValue(item, ["id", "ID"], `row-${index + 1}`),

    year: String(getRawValue(item, ["year", "연도", "년도"], "")).trim(),
    univ: String(getRawValue(item, ["univ", "university", "대학", "학교명"], "")).trim(),
    major: String(getRawValue(item, ["major", "department", "학과", "모집단위"], "")).trim(),
    group: String(getRawValue(item, ["group", "군", "모집군", "계열"], "")).trim(),

    ruleMode: String(getRawValue(item, ["ruleMode", "rule_mode", "판정방식"], "")).trim(),
    method: String(getRawValue(item, ["method", "전형방법", "기준"], "")).trim(),
    note: String(getRawValue(item, ["note", "비고", "remark"], "")).trim(),

    competition_rate: String(
      getRawValue(item, ["competition_rate", "competitionRate", "경쟁률"], "")
    ).trim(),

    add_admit_count: getRawValue(
      item,
      ["add_admit_count", "addAdmitCount", "추가합격", "추가합격인원", "추합인원", "충원인원"],
      ""
    ),

    cut_kor: getRawNum(item, ["cut_kor", "kor_cut", "korCut", "국어컷", "cut_korean"]),
    cut_math: getRawNum(item, ["cut_math", "math_cut", "mathCut", "수학컷"]),
    cut_inq1: getRawNum(item, ["cut_inq1", "inq1_cut", "inq1Cut", "탐1컷", "탐구1컷"]),
    cut_inq2: getRawNum(item, ["cut_inq2", "inq2_cut", "inq2Cut", "탐2컷", "탐구2컷"]),
    cut_eng_grade: getRawNum(item, ["cut_eng_grade", "eng_grade_cut", "engGradeCut", "영어컷", "영어등급컷"]),

    raw: item
  };
}

async function loadData() {
  const dataUrl = new URL("univ_search_data.json", window.location.href).toString();
  const res = await fetch(dataUrl, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`정시 데이터 파일을 불러오지 못했습니다. (${res.status}) ${dataUrl}`);
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
    throw new Error("정시 데이터 형식이 올바르지 않습니다. 배열(Array) 또는 { data: [] } 형식이어야 합니다.");
  }

  REGULAR_DATA = rows
    .map((item, index) => normalizeRegularItem(item, index))
    .filter(item => item.univ || item.major);

  console.log("[regular] loaded rows:", REGULAR_DATA.length, REGULAR_DATA.slice(0, 5));

  if (!REGULAR_DATA.length) {
    throw new Error("정시 데이터는 불러왔지만 실제 행(row)이 0개입니다.");
  }
}

function getUnivName(item) {
  return item.univ ?? item.university ?? "";
}

function getMethodName(item) {
  const raw = item.ruleMode || item.method || "";
  if (!raw) return "기준 미표기";
  if (raw === "each_subject_meets_cut") return "과목별 컷 충족";
  return String(raw).trim();
}

function percentileDiff(student, cut) {
  if (student == null || cut == null || cut === "") return null;
  return Number(student) - Number(cut);
}

function englishDiff(studentGrade, cutGrade) {
  if (studentGrade == null || cutGrade == null || cutGrade === "") return null;
  return Number(cutGrade) - Number(studentGrade);
}

function formatDiff(diff, type) {
  if (diff == null) return "비교 불가";

  if (type === "grade") {
    return diff >= 0 ? `${diff}등급 여유` : `${Math.abs(diff)}등급 부족`;
  }

  return diff >= 0 ? `${diff.toFixed(1)}p 여유` : `${Math.abs(diff).toFixed(1)}p 부족`;
}

function hasAnyStudentInput() {
  return [
    parseNum(getValue("kor")),
    parseNum(getValue("math")),
    parseNum(getValue("inq1")),
    parseNum(getValue("inq2")),
    parseNum(getValue("engGrade"))
  ].some(v => v != null);
}

function setJudgementFilter(value) {
  const finalValue = canonicalFilterValue(value || "핵심");

  if ($("judgementFilter")) {
    $("judgementFilter").value = finalValue;
  }

  document.querySelectorAll(".judge-tab").forEach(btn => {
    const tabValue = canonicalFilterValue(
      btn.getAttribute("data-value") ||
      btn.getAttribute("data-filter") ||
      btn.getAttribute("data-judge") ||
      ""
    );
    btn.classList.toggle("is-active", tabValue === finalValue);
  });

  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    const chipValue = canonicalFilterValue(btn.getAttribute("data-filter") || "");
    btn.classList.toggle("is-active", chipValue === finalValue);
  });
}

function analyzeRegular(item, student) {
  const subjects = [
    {
      key: "kor",
      label: "국어",
      student: student.kor,
      cut: item.cut_kor,
      diff: percentileDiff(student.kor, item.cut_kor),
      type: "percentile"
    },
    {
      key: "math",
      label: "수학",
      student: student.math,
      cut: item.cut_math,
      diff: percentileDiff(student.math, item.cut_math),
      type: "percentile"
    },
    {
      key: "inq1",
      label: "탐1",
      student: student.inq1,
      cut: item.cut_inq1,
      diff: percentileDiff(student.inq1, item.cut_inq1),
      type: "percentile"
    },
    {
      key: "inq2",
      label: "탐2",
      student: student.inq2,
      cut: item.cut_inq2,
      diff: percentileDiff(student.inq2, item.cut_inq2),
      type: "percentile"
    },
    {
      key: "eng",
      label: "영어",
      student: student.engGrade,
      cut: item.cut_eng_grade,
      diff: englishDiff(student.engGrade, item.cut_eng_grade),
      type: "grade"
    }
  ];

  const used = subjects.filter(s => s.student != null && s.cut != null && s.cut !== "");

  if (!used.length) {
    return {
      judgement: "판정 보류",
      subjects,
      shortageText: "입력된 점수와 비교할 수 있는 과목이 없습니다.",
      shortageCount: 99,
      avgDiff: -999,
      relevanceScore: 9999
    };
  }

  const scoreDiffs = used.map(s => (s.type === "grade" ? s.diff * 2 : s.diff));
  const minDiff = Math.min(...scoreDiffs);
  const avgDiff = scoreDiffs.reduce((a, b) => a + b, 0) / scoreDiffs.length;

  const shortages = used.filter(s => s.diff < 0);
  const shortageCount = shortages.length;
  const allMeet = used.every(s => s.diff >= 0);

  let shortageText = "";
  if (!shortages.length) {
    shortageText = "전 과목 충족";
  } else {
    shortageText = shortages
      .map(s => `${s.label} ${formatDiff(s.diff, s.type).replace(" 부족", "")} 부족`)
      .join(", ");
  }

  let judgement = "판정 보류";

  if (allMeet) {
    if (avgDiff >= 2.5 && minDiff >= 1) {
      judgement = "안정";
    } else {
      judgement = "적정";
    }
  } else if (shortageCount === 1 && minDiff >= -2) {
    judgement = "상향";
  } else if (shortageCount <= 2 && minDiff >= -5) {
    judgement = "도전";
  } else {
    judgement = "판정 보류";
  }

  const shortageMagnitude = shortages.reduce((sum, s) => {
    if (s.type === "grade") return sum + Math.abs(s.diff) * 2;
    return sum + Math.abs(s.diff);
  }, 0);

  const relevanceScore = allMeet
    ? Math.abs(avgDiff)
    : Math.abs(avgDiff) + shortageMagnitude + shortageCount * 1.5;

  return {
    judgement,
    subjects,
    shortageText,
    shortageCount,
    avgDiff,
    relevanceScore
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

function subchipClass(diff) {
  if (diff == null) return "subchip";
  return diff >= 0 ? "subchip is-pass" : "subchip is-fail";
}

function fillSelectOptions() {
  const groupSelect = $("groupFilter");
  const methodSelect = $("methodFilter");

  const methods = [...new Set(REGULAR_DATA.map(item => getMethodName(item)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));

  if (groupSelect) {
    groupSelect.innerHTML = `
      <option value="all">전체</option>
      <option value="인문">인문</option>
      <option value="자연">자연</option>
    `;
  }

  if (methodSelect) {
    methodSelect.innerHTML =
      `<option value="all">전체</option>` +
      methods.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  }
}

function buildGroupKey(item) {
  return [
    normalizeText(getUnivName(item)),
    normalizeText(item.major)
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
        univ: getUnivName(item),
        major: item.major || "",
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

    const summaryText = latest?.analysis?.shortageText || "";

    const avgRelevance =
      group.years.reduce((sum, item) => sum + item.analysis.relevanceScore, 0) / group.years.length;

    return {
      ...group,
      latest,
      groupLabel: latest?.group || "",
      methodLabel: getMethodName(latest || {}),
      summaryJudgement,
      trendText,
      summaryText,
      relevanceScore: avgRelevance
    };
  });
}

function makeSubjectDetailRow(s) {
  const studentText = s.student == null ? "입력 없음" : s.student;
  const cutText = safeValue(s.cut);
  const diffText = formatDiff(s.diff, s.type);

  return `
    <div class="detail-row">
      <div class="detail-subject">${escapeHtml(s.label)}</div>
      <div class="detail-val">내 ${escapeHtml(studentText)}</div>
      <div class="detail-val">컷 ${escapeHtml(cutText)}</div>
      <div class="${subchipClass(s.diff)}">${escapeHtml(diffText)}</div>
    </div>
  `;
}

function makeYearBlock(item, groupIndex, yearIndex) {
  const yearDetailId = `year-detail-${groupIndex}-${yearIndex}`;
  const competitionText = formatCompetitionRate(item.competition_rate);
  const addAdmitText = formatAddAdmitCount(item.add_admit_count);

  return `
    <div class="year-block">
      <button type="button" class="year-toggle" data-target="${yearDetailId}">
        <span class="year-toggle-top">
          <span class="year-title">${escapeHtml(item.year)}</span>
          <span class="${badgeClass(item.analysis.judgement)}">${escapeHtml(item.analysis.judgement)}</span>
        </span>
        <span class="year-toggle-summary">${escapeHtml(item.analysis.shortageText)}</span>
      </button>

      <div class="year-body" id="${yearDetailId}" hidden>
        <div class="year-meta-row">
          <span class="meta-chip">경쟁률 ${escapeHtml(competitionText)}</span>
          <span class="meta-chip">추가합격 ${escapeHtml(addAdmitText)}</span>
        </div>

        <div class="detail-grid">
          ${item.analysis.subjects.map(makeSubjectDetailRow).join("")}
        </div>

        <div class="detail-note"><strong>비고</strong> ${escapeHtml(safeValue(item.note, "없음"))}</div>
      </div>
    </div>
  `;
}

function makeCard(group, index) {
  const detailId = `group-detail-${index}`;
  const latestYear = group.latest?.year ?? "-";
  const latestCompetition = formatCompetitionRate(group.latest?.competition_rate);
  const latestAddAdmit = formatAddAdmitCount(group.latest?.add_admit_count);

  return `
    <article class="compact-card">
      <div class="compact-top">
        <div class="compact-main">
          <span class="${badgeClass(group.summaryJudgement)}">${escapeHtml(group.summaryJudgement)}</span>
          <div class="compact-title-wrap">
            <div class="compact-title">${escapeHtml(group.univ)} ${escapeHtml(group.major)}</div>
            <div class="compact-meta">${escapeHtml(group.groupLabel || "군 미표기")} · ${escapeHtml(group.methodLabel)} · 최근 기준 ${escapeHtml(latestYear)}</div>
          </div>
        </div>

        <button type="button" class="detail-toggle" data-target="${detailId}">
          연도보기
        </button>
      </div>

      <div class="compact-summary">
        <div class="summary-line"><strong>3개년 흐름</strong> ${escapeHtml(group.trendText || "데이터 없음")}</div>
        <div class="summary-side">${escapeHtml(group.summaryText || "")}</div>
      </div>

      <div class="meta-chip-row">
        <span class="meta-chip">최근 경쟁률 ${escapeHtml(latestCompetition)}</span>
        <span class="meta-chip">최근 추가합격 ${escapeHtml(latestAddAdmit)}</span>
      </div>

      <div class="year-chip-row">
        ${group.years.map(item => `
          <span class="year-chip ${judgementToneClass(item.analysis.judgement)}">
            ${escapeHtml(item.year)} ${escapeHtml(item.analysis.judgement)}
          </span>
        `).join("")}
      </div>

      <div class="detail-panel" id="${detailId}" hidden>
        <div class="year-block-list">
          ${group.years.map((item, yearIndex) => makeYearBlock(item, index, yearIndex)).join("")}
        </div>
      </div>
    </article>
  `;
}

function bindDetailToggles() {
  document.querySelectorAll(".detail-toggle").forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      if (!panel) return;

      const isHidden = panel.hasAttribute("hidden");

      if (isHidden) {
        panel.removeAttribute("hidden");
        btn.textContent = "연도닫기";
      } else {
        panel.setAttribute("hidden", "");
        btn.textContent = "연도보기";
      }
    };
  });
}

function bindYearToggles() {
  document.querySelectorAll(".year-toggle").forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      if (!panel) return;

      if (panel.hasAttribute("hidden")) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    };
  });
}

function bindStatChips() {
  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const filterValue = canonicalFilterValue(btn.getAttribute("data-filter") || "핵심");
      setJudgementFilter(filterValue);

      if (hasAnyStudentInput()) {
        searchResults({ silent: true });
      }
    };
  });
}

function renderStats(groupedList) {
  const statsBox = $("resultStats");
  if (!statsBox) return;

  const currentFilter = canonicalFilterValue(getValue("judgementFilter") || "핵심");

  const safe = groupedList.filter(item => item.summaryJudgement === "안정").length;
  const fit = groupedList.filter(item => item.summaryJudgement === "적정").length;
  const up = groupedList.filter(item => item.summaryJudgement === "상향").length;
  const totalCore = safe + fit + up;

  statsBox.innerHTML = `
    <button type="button" class="stat-chip stat-safe is-clickable ${currentFilter === "안정" ? "is-active" : ""}" data-filter="안정">안정 ${safe}</button>
    <button type="button" class="stat-chip stat-fit is-clickable ${currentFilter === "적정" ? "is-active" : ""}" data-filter="적정">적정 ${fit}</button>
    <button type="button" class="stat-chip stat-up is-clickable ${currentFilter === "상향" ? "is-active" : ""}" data-filter="상향">상향 ${up}</button>
    <button type="button" class="stat-chip is-clickable ${currentFilter === "핵심" ? "is-active" : ""}" data-filter="핵심">핵심합 ${totalCore}</button>
  `;

  bindStatChips();
}

function renderCurrentResults() {
  const total = LAST_RESULTS.length;
  const shown = Math.min(visibleCount, total);

  if ($("resultCount")) {
    $("resultCount").textContent = `조회 결과 ${total}개 학과 · 현재 ${shown}개 표시`;
  }

  if (!total) {
    if ($("resultList")) {
      $("resultList").innerHTML = `<div class="empty">조건에 맞는 결과가 없습니다.</div>`;
    }
    return;
  }

  const visibleItems = LAST_RESULTS.slice(0, shown);
  let html = visibleItems.map((group, idx) => makeCard(group, idx)).join("");

  if (shown < total) {
    html += `
      <div class="load-more-wrap">
        <button type="button" id="btnLoadMore" class="secondary load-more-btn">
          더 보기 (${shown}/${total})
        </button>
      </div>
    `;
  }

  if ($("resultList")) {
    $("resultList").innerHTML = html;
  }

  bindDetailToggles();
  bindYearToggles();

  const loadMoreBtn = $("btnLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.onclick = () => {
      visibleCount += getPageSize();
      renderCurrentResults();
    };
  }
}

function bindJudgementTabs() {
  document.querySelectorAll(".judge-tab").forEach(tab => {
    tab.onclick = () => {
      const value = canonicalFilterValue(
        tab.getAttribute("data-value") ||
        tab.getAttribute("data-filter") ||
        tab.getAttribute("data-judge") ||
        "핵심"
      );

      setJudgementFilter(value);

      if (hasAnyStudentInput()) {
        searchResults({ silent: true });
      }
    };
  });
}

function searchResults() {
  const keyword = getValue("keyword").toLowerCase();
  const groupFilter = getValue("groupFilter") || "all";
  const methodFilter = getValue("methodFilter") || "all";
  const judgementFilter = canonicalFilterValue(getValue("judgementFilter") || "핵심");

  const kor = parseNum(getValue("kor"));
  const math = parseNum(getValue("math"));
  const inq1 = parseNum(getValue("inq1"));
  const inq2 = parseNum(getValue("inq2"));
  const engGrade = parseNum(getValue("engGrade"));

  const student = { kor, math, inq1, inq2, engGrade };

  if (!hasAnyStudentInput()) {
    LAST_RESULTS = [];
    visibleCount = getPageSize();
    renderStats([]);

    if ($("resultCount")) $("resultCount").textContent = "결과 없음";
    if ($("resultList")) {
      $("resultList").innerHTML = `<div class="empty">국어/수학/탐구/영어 중 최소 1개 이상 입력하면 자동으로 결과가 표시됩니다.</div>`;
    }
    return;
  }

  let baseList = [...REGULAR_DATA];

  if (keyword) {
    baseList = baseList.filter(item => {
      const univ = String(getUnivName(item) || "").toLowerCase();
      const major = String(item.major || "").toLowerCase();
      const method = String(getMethodName(item) || "").toLowerCase();
      return univ.includes(keyword) || major.includes(keyword) || method.includes(keyword);
    });
  }

  if (groupFilter !== "all") {
    baseList = baseList.filter(item => String(item.group) === String(groupFilter));
  }

  if (methodFilter !== "all") {
    baseList = baseList.filter(item => getMethodName(item) === methodFilter);
  }

  const analyzedList = baseList.map(item => ({
    ...item,
    analysis: analyzeRegular(item, student)
  }));

  const allGroupedList = buildGroupedResults(analyzedList);
  renderStats(allGroupedList);

  let groupedList = [...allGroupedList];

  if (judgementFilter === "핵심") {
    groupedList = groupedList.filter(item =>
      ["안정", "적정", "상향"].includes(item.summaryJudgement)
    );
  } else if (judgementFilter !== "all") {
    groupedList = groupedList.filter(item => item.summaryJudgement === judgementFilter);
  }

  groupedList.sort((a, b) => {
    const rankDiff = judgementRank(a.summaryJudgement) - judgementRank(b.summaryJudgement);
    if (rankDiff !== 0) return rankDiff;

    const relevanceDiff = a.relevanceScore - b.relevanceScore;
    if (relevanceDiff !== 0) return relevanceDiff;

    const yearDiff = Number(b.latest?.year || 0) - Number(a.latest?.year || 0);
    if (yearDiff !== 0) return yearDiff;

    return String(a.univ || "").localeCompare(String(b.univ || ""), "ko");
  });

  LAST_RESULTS = groupedList;
  visibleCount = getPageSize();
  renderCurrentResults();
}

function scheduleAutoSearch() {
  if (autoSearchTimer) {
    clearTimeout(autoSearchTimer);
  }

  autoSearchTimer = setTimeout(() => {
    searchResults();
  }, 180);
}

function preventNumberInputSideEffects() {
  ["kor", "math", "inq1", "inq2"].forEach(id => {
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
  if ($("groupFilter")) $("groupFilter").value = "all";
  if ($("kor")) $("kor").value = "";
  if ($("math")) $("math").value = "";
  if ($("inq1")) $("inq1").value = "";
  if ($("inq2")) $("inq2").value = "";
  if ($("engGrade")) $("engGrade").value = "";
  if ($("methodFilter")) $("methodFilter").value = "all";
  if ($("keyword")) $("keyword").value = "";

  setJudgementFilter("핵심");

  LAST_RESULTS = [];
  visibleCount = getPageSize();

  renderStats([]);

  if ($("resultCount")) $("resultCount").textContent = "결과 없음";
  if ($("resultList")) {
    $("resultList").innerHTML = `<div class="empty">국어/수학/탐구/영어 중 최소 1개 이상 입력하면 자동으로 결과가 표시됩니다.</div>`;
  }
}

async function init() {
  try {
    await loadData();
    fillSelectOptions();
    setJudgementFilter("핵심");
    bindJudgementTabs();
    resetForm();
    preventNumberInputSideEffects();

    ["kor", "math", "inq1", "inq2", "keyword"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("input", scheduleAutoSearch);
      }
    });

    if ($("engGrade")) {
      $("engGrade").addEventListener("change", scheduleAutoSearch);
    }

    ["groupFilter", "methodFilter"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("change", scheduleAutoSearch);
      }
    });

    window.addEventListener("resize", () => {
      if (!LAST_RESULTS.length) return;

      if (visibleCount < getPageSize()) {
        visibleCount = getPageSize();
      }

      renderCurrentResults();
    });
  } catch (err) {
    console.error("[regular init error]", err);

    if ($("resultCount")) $("resultCount").textContent = "데이터 오류";
    if ($("resultStats")) $("resultStats").innerHTML = "";

    if ($("resultList")) {
      $("resultList").innerHTML = `
        <div class="empty">
          정시 데이터 파일을 불러오지 못했습니다.<br>
          경로/파일명/JSON 구조를 확인해주세요.<br><br>
          <small>${escapeHtml(err.message || "알 수 없는 오류")}</small>
        </div>
      `;
    }
  }
}

window.addEventListener("DOMContentLoaded", init);
