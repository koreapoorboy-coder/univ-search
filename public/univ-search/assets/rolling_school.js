let SCHOOL_DATA = [];

async function loadData() {
  const res = await fetch("data/rolling_school_data.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("학생부교과 데이터 파일을 불러오지 못했습니다.");
  }
  SCHOOL_DATA = await res.json();
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

function getStudentGrade() {
  const gradeAvg = parseNum(getValue("gradeAvg"));
  const subjectGrade = parseNum(getValue("subjectGrade"));

  // 반영교과 평균이 있으면 우선 사용
  return subjectGrade ?? gradeAvg;
}

function evaluateSchoolRecord(studentGrade, item, csatExpected) {
  const diff = studentGrade - Number(item.grade_cut);

  // 수능최저가 있는 전형인데 사용자가 "불안"으로 선택한 경우
  if (item.csat_min_required && csatExpected === "no") {
    if (diff <= 0.10) return "최저 위험";
    if (diff <= 0.35) return "도전";
    return "판정 보류";
  }

  // 수능최저가 있는 전형인데 "가능"으로 본 경우
  if (item.csat_min_required && csatExpected === "yes") {
    if (diff <= -0.20) return "안정";
    if (diff <= 0.10) return "적정";
    if (diff <= 0.30) return "상향";
    if (diff <= 0.50) return "도전";
    return "판정 보류";
  }

  // 수능최저 여부를 전체로 둔 경우: 최저 있는 전형은 보수적으로 판단
  if (item.csat_min_required && csatExpected === "all") {
    if (diff <= -0.25) return "적정";
    if (diff <= 0.05) return "상향";
    if (diff <= 0.30) return "도전";
    return "판정 보류";
  }

  // 수능최저 없는 전형
  if (diff <= -0.20) return "안정";
  if (diff <= 0.10) return "적정";
  if (diff <= 0.30) return "상향";
  if (diff <= 0.50) return "도전";
  return "판정 보류";
}

function judgementRank(label) {
  const map = {
    "안정": 1,
    "적정": 2,
    "상향": 3,
    "도전": 4,
    "최저 위험": 5,
    "판정 보류": 6
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
    case "최저 위험":
      return "badge is-risk";
    default:
      return "badge";
  }
}

function makeCard(item) {
  const csatText = item.csat_min_required
    ? escapeHtml(item.csat_min_rule || "있음")
    : "없음";

  const interviewText = item.interview ? "있음" : "없음";
  const recommendText = item.recommendation_required ? "필요" : "불필요";

  return `
    <article class="result-card">
      <div class="row-top">
        <div>
          <h3>${escapeHtml(item.university)} ${escapeHtml(item.major)}</h3>
          <div class="small-line">${escapeHtml(item.admission_name)} · ${escapeHtml(item.group)} · ${escapeHtml(item.region)}</div>
        </div>
        <span class="${badgeClass(item.judgement)}">${escapeHtml(item.judgement)}</span>
      </div>

      <div class="meta-grid">
        <div><strong>교과 컷</strong> ${escapeHtml(item.grade_cut)}</div>
        <div><strong>합격권 범위</strong> ${escapeHtml(item.grade_cut_range_min)} ~ ${escapeHtml(item.grade_cut_range_max)}</div>
        <div><strong>반영교과</strong> ${escapeHtml(item.subject_rule)}</div>
        <div><strong>학년별 반영</strong> ${escapeHtml(item.school_year_rule)}</div>
        <div><strong>수능최저</strong> ${csatText}</div>
        <div><strong>면접</strong> ${interviewText}</div>
        <div><strong>추천서/추천인원</strong> ${recommendText}</div>
        <div><strong>모집년도</strong> ${escapeHtml(item.year)}</div>
      </div>

      ${item.notes ? `<p class="memo">${escapeHtml(item.notes)}</p>` : ""}
    </article>
  `;
}

function renderResults(list) {
  const resultCount = $("resultCount");
  const resultList = $("resultList");

  resultCount.textContent = `조회 결과 ${list.length}건`;

  if (!list.length) {
    resultList.innerHTML = `<div class="empty">조건에 맞는 결과가 없습니다.</div>`;
    return;
  }

  resultList.innerHTML = list.map(makeCard).join("");
}

function searchResults() {
  const keyword = getValue("keyword").toLowerCase();
  const groupFilter = getValue("groupFilter");
  const regionFilter = getValue("regionFilter");
  const csatExpected = getValue("csatExpected");

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

  if (regionFilter !== "all") {
    list = list.filter(item => item.region === regionFilter);
  }

  list = list.map(item => ({
    ...item,
    judgement: evaluateSchoolRecord(studentGrade, item, csatExpected)
  }));

  list.sort((a, b) => {
    const rankDiff = judgementRank(a.judgement) - judgementRank(b.judgement);
    if (rankDiff !== 0) return rankDiff;
    return Number(a.grade_cut) - Number(b.grade_cut);
  });

  renderResults(list);
}

function resetForm() {
  $("studentName").value = "";
  $("gradeAvg").value = "";
  $("subjectGrade").value = "";
  $("csatExpected").value = "all";
  $("groupFilter").value = "all";
  $("regionFilter").value = "all";
  $("keyword").value = "";
  $("resultCount").textContent = "결과 없음";
  $("resultList").innerHTML = `<div class="empty">조건을 입력한 뒤 판정 보기를 눌러주세요.</div>`;
}

async function init() {
  try {
    await loadData();

    $("btnSearch").addEventListener("click", searchResults);
    $("btnReset").addEventListener("click", resetForm);

    $("keyword").addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchResults();
    });

    $("gradeAvg").addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchResults();
    });

    $("subjectGrade").addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchResults();
    });
  } catch (err) {
    console.error(err);
    $("resultCount").textContent = "데이터 오류";
    $("resultList").innerHTML = `<div class="empty">데이터 파일을 불러오지 못했습니다. 경로를 확인해주세요.</div>`;
  }
}

window.addEventListener("DOMContentLoaded", init);
