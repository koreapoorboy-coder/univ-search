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

function percentileDiff(student, cut) {
  if (student == null || cut == null || cut === "") return null;
  return Number(student) - Number(cut);
}

function englishDiff(studentGrade, cutGrade) {
  if (studentGrade == null || cutGrade == null || cutGrade === "") return null;
  return Number(cutGrade) - Number(studentGrade);
}

function evaluateRegular(item, student) {
  const diffs = [];

  const korDiff = percentileDiff(student.kor, item.cut_kor);
  const mathDiff = percentileDiff(student.math, item.cut_math);
  const inq1Diff = percentileDiff(student.inq1, item.cut_inq1);
  const inq2Diff = percentileDiff(student.inq2, item.cut_inq2);
  const engDiff = englishDiff(student.engGrade, item.cut_eng_grade);

  if (korDiff != null) diffs.push(korDiff);
  if (mathDiff != null) diffs.push(mathDiff);
  if (inq1Diff != null) diffs.push(inq1Diff);
  if (inq2Diff != null) diffs.push(inq2Diff);

  // 영어는 등급 차이이므로 영향력을 조금 작게 반영
  if (engDiff != null) diffs.push(engDiff * 2);

  if (!diffs.length) return "판정 보류";

  const minDiff = Math.min(...diffs);
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  // 한 과목이라도 크게 부족하면 보수적으로 판정
  if (minDiff <= -8) return "판정 보류";
  if (minDiff <= -5) return "도전";

  if (avgDiff >= 4 && minDiff >= 1) return "안정";
  if (avgDiff >= 1.5 && minDiff >= -1) return "적정";
  if (avgDiff >= -1.5 && minDiff >= -3) return "상향";
  if (avgDiff >= -4) return "도전";
  return "판정 보류";
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

function safeValue(v, fallback = "-") {
  return v === undefined || v === null || v === "" ? fallback : v;
}

function fillSelectOptions() {
  const yearSelect = $("yearFilter");
  const methodSelect = $("methodFilter");

  const years = [...new Set(REGULAR_DATA.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);
  const methods = [...new Set(REGULAR_DATA.map(item => item.method).filter(Boolean))].sort();

  yearSelect.innerHTML = `<option value="all">전체</option>` +
    years.map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join("");

  methodSelect.innerHTML = `<option value="all">전체</option>` +
    methods.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
}

function makeCard(item) {
  return `
    <article class="result-card">
      <div class="row-top">
        <div>
          <h3>${escapeHtml(item.university)} ${escapeHtml(item.major)}</h3>
          <div class="small-line">
            ${escapeHtml(safeValue(item.method))} · ${escapeHtml(safeValue(item.group))} · ${escapeHtml(safeValue(item.region))}
          </div>
        </div>
        <span class="${badgeClass(item.judgement)}">${escapeHtml(item.judgement)}</span>
      </div>

      <div class="meta-grid">
        <div><strong>모집년도</strong> ${escapeHtml(safeValue(item.year))}</div>
        <div><strong>전형방식</strong> ${escapeHtml(safeValue(item.method))}</div>
        <div><strong>국어 컷</strong> ${escapeHtml(safeValue(item.cut_kor))}</div>
        <div><strong>수학 컷</strong> ${escapeHtml(safeValue(item.cut_math))}</div>
        <div><strong>탐1 컷</strong> ${escapeHtml(safeValue(item.cut_inq1))}</div>
        <div><strong>탐2 컷</strong> ${escapeHtml(safeValue(item.cut_inq2))}</div>
        <div><strong>영어 컷</strong> ${escapeHtml(safeValue(item.cut_eng_grade))}</div>
        <div><strong>비고</strong> ${escapeHtml(safeValue(item.note, "없음"))}</div>
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
  const regionFilter = getValue("regionFilter");
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
      const univ = String(item.university || "").toLowerCase();
      const major = String(item.major || "").toLowerCase();
      const method = String(item.method || "").toLowerCase();
      return univ.includes(keyword) || major.includes(keyword) || method.includes(keyword);
    });
  }

  if (groupFilter !== "all") {
    list = list.filter(item => item.group === groupFilter);
  }

  if (regionFilter !== "all") {
    list = list.filter(item => item.region === regionFilter);
  }

  if (yearFilter !== "all") {
    list = list.filter(item => String(item.year) === String(yearFilter));
  }

  if (methodFilter !== "all") {
    list = list.filter(item => item.method === methodFilter);
  }

  list = list.map(item => ({
    ...item,
    judgement: evaluateRegular(item, student)
  }));

  list.sort((a, b) => {
    const rankDiff = judgementRank(a.judgement) - judgementRank(b.judgement);
    if (rankDiff !== 0) return rankDiff;
    return String(a.university || "").localeCompare(String(b.university || ""), "ko");
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
  $("regionFilter").value = "all";
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
      $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") searchResults();
      });
    });
  } catch (err) {
    console.error(err);
    $("resultCount").textContent = "데이터 오류";
    $("resultList").innerHTML = `<div class="empty">정시 데이터 파일을 불러오지 못했습니다. 경로와 파일명을 확인해주세요.</div>`;
  }
}

window.addEventListener("DOMContentLoaded", init);
