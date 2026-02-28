let REGULAR_DATA = [];

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
      shortageText: "입력된 점수와 비교할 수 있는 과목이 없습니다."
    };
  }

  const scoreDiffs = used.map(s => {
    if (s.type === "grade") return s.diff * 2;
    return s.diff;
  });

  const minDiff = Math.min(...scoreDiffs);
  const avgDiff = scoreDiffs.reduce((a, b) => a + b, 0) / scoreDiffs.length;

  let judgement = "판정 보류";
  if (minDiff <= -8) judgement = "판정 보류";
  else if (minDiff <= -5) judgement = "도전";
  else if (avgDiff >= 4 && minDiff >= 1) judgement = "안정";
  else if (avgDiff >= 1.5 && minDiff >= -1) judgement = "적정";
  else if (avgDiff >= -1.5 && minDiff >= -3) judgement = "상향";
  else if (avgDiff >= -4) judgement = "도전";
  else judgement = "판정 보류";

  const shortages = used.filter(s => s.diff < 0);
  let shortageText = "";

  if (!shortages.length) {
    shortageText = "전 입력 과목이 기준 이상입니다.";
  } else {
    shortageText = shortages.map(s => {
      if (s.type === "grade") {
        return `${s.label} ${Math.abs(s.diff)}등급 부족`;
      }
      return `${s.label} ${Math.abs(s.diff).toFixed(1)}p 부족`;
    }).join(", ");
  }

  return {
    judgement,
    subjects,
    shortageText
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

function subjectStatusClass(diff) {
  if (diff == null) return "subchip";
  if (diff >= 0) return "subchip is-pass";
  return "subchip is-fail";
}

function formatSubjectLine(s) {
  if (s.student == null || s.cut == null || s.cut === "") {
    return `
      <div class="subject-row">
        <span class="subject-name">${escapeHtml(s.label)}</span>
        <span class="subject-score">입력 없음</span>
        <span class="subject-cut">컷 ${escapeHtml(safeValue(s.cut))}</span>
        <span class="subchip">비교 불가</span>
      </div>
    `;
  }

  let diffText = "";
  if (s.type === "grade") {
    if (s.diff >= 0) diffText = `${s.diff}등급 여유`;
    else diffText = `${Math.abs(s.diff)}등급 부족`;
  } else {
    if (s.diff >= 0) diffText = `${s.diff.toFixed(1)}p 여유`;
    else diffText = `${Math.abs(s.diff).toFixed(1)}p 부족`;
  }

  return `
    <div class="subject-row">
      <span class="subject-name">${escapeHtml(s.label)}</span>
      <span class="subject-score">내 점수 ${escapeHtml(s.student)}</span>
      <span class="subject-cut">컷 ${escapeHtml(s.cut)}</span>
      <span class="${subjectStatusClass(s.diff)}">${escapeHtml(diffText)}</span>
    </div>
  `;
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

function makeCard(item) {
  const univName = getUnivName(item);
  const methodName = getMethodName(item);
  const analysis = item.analysis;

  return `
    <article class="result-card">
      <div class="row-top">
        <div>
          <h3>${escapeHtml(univName)}</h3>
          <div class="major-line">${escapeHtml(safeValue(item.major))}</div>
          <div class="small-line">${escapeHtml(safeValue(item.group))} · ${escapeHtml(methodName)} · ${escapeHtml(safeValue(item.year))}</div>
        </div>
        <span class="${badgeClass(analysis.judgement)}">${escapeHtml(analysis.judgement)}</span>
      </div>

      <div class="shortage-box">
        <strong>부족/충족 요약</strong>
        <div>${escapeHtml(analysis.shortageText)}</div>
      </div>

      <div class="subject-list">
        ${analysis.subjects.map(formatSubjectLine).join("")}
      </div>

      <div class="note-line">
        <strong>비고</strong> ${escapeHtml(safeValue(item.note, "없음"))}
      </div>
    </article>
  `;
}

function renderResults(list) {
  $("resultCount").textContent = `조회 결과 ${list.length}건`;

  if (!list.length) {
    $("resultList").innerHTML = `<div class="empty">조건에 맞는 결과가 없습니다.</div>`;
    return;
  }

  $("resultList").innerHTML = list.map(makeCard).join("");
}

function searchResults() {
  const keyword = getValue("keyword").toLowerCase();
  const groupFilter = getValue("groupFilter");
  const yearFilter = getValue("yearFilter");
  const methodFilter = getValue("methodFilter");

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

  let list = [...REGULAR_DATA];

  if (keyword) {
    list = list.filter(item => {
      const univ = String(getUnivName(item) || "").toLowerCase();
      const major = String(item.major || "").toLowerCase();
      const method = String(getMethodName(item) || "").toLowerCase();
      return univ.includes(keyword) || major.includes(keyword) || method.includes(keyword);
    });
  }

  if (groupFilter !== "all") {
    list = list.filter(item => item.group === groupFilter);
  }

  if (yearFilter !== "all") {
    list = list.filter(item => String(item.year) === String(yearFilter));
  }

  if (methodFilter !== "all") {
    list = list.filter(item => getMethodName(item) === methodFilter);
  }

  list = list.map(item => ({
    ...item,
    analysis: analyzeRegular(item, student)
  }));

  list.sort((a, b) => {
    const rankDiff = judgementRank(a.analysis.judgement) - judgementRank(b.analysis.judgement);
    if (rankDiff !== 0) return rankDiff;
    return String(getUnivName(a) || "").localeCompare(String(getUnivName(b) || ""), "ko");
  });

  renderResults(list);
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
  $("resultCount").textContent = "결과 없음";
  $("resultList").innerHTML = `<div class="empty">점수를 입력한 뒤 판정 보기를 눌러주세요.</div>`;
}

async function init() {
  try {
    await loadData();
    fillSelectOptions();

    $("btnSearch").addEventListener("click", searchResults);
    $("btnReset").addEventListener("click", resetForm);

    ["keyword", "kor", "math", "inq1", "inq2"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("keydown", (e) => {
          if (e.key === "Enter") searchResults();
        });
      }
    });
  } catch (err) {
    console.error(err);
    $("resultCount").textContent = "데이터 오류";
    $("resultList").innerHTML = `<div class="empty">정시 데이터 파일을 불러오지 못했습니다. 경로와 파일명을 확인해주세요.</div>`;
  }
}

window.addEventListener("DOMContentLoaded", init);
