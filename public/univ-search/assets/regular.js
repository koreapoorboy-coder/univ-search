let REGULAR_DATA = [];

const DESKTOP_PAGE_SIZE = 5;
const MOBILE_PAGE_SIZE = 3;

function getPageSize() {
  return window.innerWidth <= 768 ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
}

let LAST_RESULTS = [];
let visibleCount = getPageSize();

async function loadData() {
  const res = await fetch("univ_search_data.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("정시 데이터 파일을 불러오지 못했습니다.");
  }
  REGULAR_DATA = await res.json();
}

function $(id) {
  return document.getElementById(id);
}

function getValue(id) {
  return ($(id)?.value || "").trim();
}

function parseNum(value) {
  const n = parseFloat(value);
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
    .replace(/[()]/g, "")
    .trim()
    .toLowerCase();
}

function getUnivName(item) {
  return item.univ ?? item.university ?? "";
}

function getMethodName(item) {
  const raw = item.ruleMode ?? item.method ?? "";
  if (raw === "each_subject_meets_cut") return "과목별 컷 충족";
  return raw || "기준 미표기";
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
  if ($("judgementFilter")) {
    $("judgementFilter").value = value;
  }

  document.querySelectorAll(".judge-tab").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-value") === value);
  });

  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-filter") === value);
  });
}
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

function badgeClass(label) {
  switch (label) {
    case "안정":
      return "badge is-safe";
    case "적정":
      return "badge is-fit";
    case "상향":
      return "badge is-up";
    case "도전":
      return "badge is-challenge";
    default:
      return "badge";
  }
}

function subchipClass(diff) {
  if (diff == null) return "subchip";
  return diff >= 0 ? "subchip is-pass" : "subchip is-fail";
}

function fillSelectOptions() {
  const yearSelect = $("yearFilter");
  const methodSelect = $("methodFilter");

  const years = [...new Set(REGULAR_DATA.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);
  const methods = [...new Set(REGULAR_DATA.map(item => getMethodName(item)).filter(Boolean))].sort();

  yearSelect.innerHTML =
    `<option value="all">전체</option>` +
    years.map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join("");

  methodSelect.innerHTML =
    `<option value="all">전체</option>` +
    methods.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
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
    group.years.sort((a, b) => Number(b.year) - Number(a.year));

    const latest = group.years[0];
    const summaryJudgement = summarizeGroupJudgement(group.years);

    const trendText = group.years
      .slice(0, 3)
      .map(item => `${item.year} ${item.analysis.judgement}`)
      .join(" / ");

    const summaryText = latest.analysis.shortageText;

    const avgRelevance =
      group.years.reduce((sum, item) => sum + item.analysis.relevanceScore, 0) / group.years.length;

    return {
      ...group,
      latest,
      groupLabel: latest.group || "",
      methodLabel: getMethodName(latest),
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

  return `
    <article class="compact-card">
      <div class="compact-top">
        <div class="compact-main">
          <span class="${badgeClass(group.summaryJudgement)}">${escapeHtml(group.summaryJudgement)}</span>
          <div class="compact-title-wrap">
            <div class="compact-title">${escapeHtml(group.univ)} ${escapeHtml(group.major)}</div>
            <div class="compact-meta">${escapeHtml(group.groupLabel)} · ${escapeHtml(group.methodLabel)} · 최근 기준 ${escapeHtml(latestYear)}</div>
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

      <div class="year-chip-row">
        ${group.years.map(item => `
          <span class="year-chip ${badgeClass(item.analysis.judgement)}">
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
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      const isHidden = panel.hasAttribute("hidden");

      if (isHidden) {
        panel.removeAttribute("hidden");
        btn.textContent = "연도닫기";
      } else {
        panel.setAttribute("hidden", "");
        btn.textContent = "연도보기";
      }
    });
  });
}

function bindYearToggles() {
  document.querySelectorAll(".year-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      const isHidden = panel.hasAttribute("hidden");

      if (isHidden) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });
  });
}

function bindStatChips() {
  document.querySelectorAll(".stat-chip.is-clickable").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const filterValue = btn.getAttribute("data-filter");
      setJudgementFilter(filterValue);

      if (hasAnyStudentInput()) {
        searchResults();
      }
    });
  });
}
}

function renderStats(groupedList) {
  const statsBox = $("resultStats");
  if (!statsBox) return;

  if (!groupedList.length) {
    statsBox.innerHTML = "";
    return;
  }

  const currentFilter = getValue("judgementFilter") || "핵심";

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

  $("resultCount").textContent = `조회 결과 ${total}개 학과 · 현재 ${shown}개 표시`;

  if (!total) {
    $("resultList").innerHTML = `<div class="empty">조건에 맞는 결과가 없습니다.</div>`;
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

  $("resultList").innerHTML = html;

  bindDetailToggles();
  bindYearToggles();

  const loadMoreBtn = $("btnLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      visibleCount += getPageSize();
      renderCurrentResults();
    });
  }
}

function bindJudgementTabs() {
  const tabs = document.querySelectorAll(".judge-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const value = tab.getAttribute("data-value");
      setJudgementFilter(value);

      if (hasAnyStudentInput()) {
        searchResults();
      }
    });
  });
}

function searchResults() {
  const keyword = getValue("keyword").toLowerCase();
  const groupFilter = getValue("groupFilter");
  const yearFilter = getValue("yearFilter");
  const methodFilter = getValue("methodFilter");
  const judgementFilter = getValue("judgementFilter") || "핵심";

  const kor = parseNum(getValue("kor"));
  const math = parseNum(getValue("math"));
  const inq1 = parseNum(getValue("inq1"));
  const inq2 = parseNum(getValue("inq2"));
  const engGrade = parseNum(getValue("engGrade"));

  const student = { kor, math, inq1, inq2, engGrade };

  if (kor == null && math == null && inq1 == null && inq2 == null && engGrade == null) {
    alert("국어/수학/탐구/영어 중 최소 1개 이상 입력해주세요.");
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
    baseList = baseList.filter(item => item.group === groupFilter);
  }

  if (yearFilter !== "all") {
    baseList = baseList.filter(item => String(item.year) === String(yearFilter));
  }

  if (methodFilter !== "all") {
    baseList = baseList.filter(item => getMethodName(item) === methodFilter);
  }

  const analyzedList = baseList.map(item => ({
    ...item,
    analysis: analyzeRegular(item, student)
  }));

  let groupedList = buildGroupedResults(analyzedList);

  renderStats(groupedList);

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

    return String(a.univ || "").localeCompare(String(b.univ || ""), "ko");
  });

  LAST_RESULTS = groupedList;
  visibleCount = getPageSize();
  renderCurrentResults();
}

function resetForm() {
  $("studentName").value = "";
  $("groupFilter").value = "all";
  $("kor").value = "";
  $("math").value = "";
  $("inq1").value = "";
  $("inq2").value = "";
  $("engGrade").value = "";
  $("yearFilter").value = "all";
  $("methodFilter").value = "all";
  $("keyword").value = "";

  setJudgementFilter("핵심");

  LAST_RESULTS = [];
  visibleCount = getPageSize();

  $("resultCount").textContent = "결과 없음";
  if ($("resultStats")) $("resultStats").innerHTML = "";
  $("resultList").innerHTML = `<div class="empty">점수를 입력한 뒤 판정 보기를 눌러주세요.</div>`;
}

async function init() {
  try {
    await loadData();
    fillSelectOptions();
    setJudgementFilter("핵심");
    bindJudgementTabs();

    $("btnSearch").addEventListener("click", searchResults);
    $("btnReset").addEventListener("click", resetForm);

    ["keyword", "kor", "math", "inq1", "inq2"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("keydown", (e) => {
          if (e.key === "Enter") searchResults();
        });
      }
    });

    if ($("engGrade")) {
      $("engGrade").addEventListener("change", () => {
        if (hasAnyStudentInput()) searchResults();
      });
    }

    ["groupFilter", "yearFilter", "methodFilter"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("change", () => {
          if (hasAnyStudentInput()) searchResults();
        });
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
    console.error(err);
    $("resultCount").textContent = "데이터 오류";
    if ($("resultStats")) $("resultStats").innerHTML = "";
    $("resultList").innerHTML = `<div class="empty">정시 데이터 파일을 불러오지 못했습니다. 경로와 파일명을 확인해주세요.</div>`;
  }
}

window.addEventListener("DOMContentLoaded", init);
