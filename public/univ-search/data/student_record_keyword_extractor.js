
(function () {
  "use strict";

  function unique(arr) { return [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))]; }
  function collectTextDeep(node, out) {
    if (node == null) return;
    if (Array.isArray(node)) return node.forEach(v => collectTextDeep(v, out));
    if (typeof node === "object") return Object.values(node).forEach(v => collectTextDeep(v, out));
    const t = String(node).trim();
    if (t) out.push(t);
  }

  function extractYearBundle(student, currentYearIdx = 0) {
    const years = Array.isArray(student?.years) ? student.years : [];
    const year = years[currentYearIdx] || years[0] || {};
    return {
      yearLabel: year?.year || year?.grade || year?.label || `${currentYearIdx + 1}학년`,
      subjects: Array.isArray(year?.subjects) ? year.subjects : []
    };
  }

  function detectTrackKeywords(corpus) {
    const text = String(corpus || "");
    const out = [];
    if (/배터리|이차전지|전고체|에너지|전기차|전기전자|리튬|전지|전해|열폭주/.test(text)) out.push("배터리","에너지","전기전자");
    if (/생명|의학|의생명|세포|유전|면역|항상성|단백질|효소|대사/.test(text)) out.push("생명·의생명");
    if (/환경|기후|지구|해양|재해|탄소|지질|대기/.test(text)) out.push("환경·지구");
    if (/AI|ai|인공지능|정보|보안|알고리즘|데이터|행렬|모델링/.test(text)) out.push("AI·정보·보안");
    if (/반도체|전자기|회로|전자|광학|파동|소자|디스플레이/.test(text)) out.push("반도체·전자");
    return unique(out);
  }

  function detectStyleKeywords(corpus) {
    const text = String(corpus || "");
    const out = [];
    if (/실험|측정|변인|관찰|전해|반응|검증|조작|배양/.test(text)) out.push("실험형");
    if (/데이터|그래프|해석|통계|시각화|수치|경향/.test(text)) out.push("데이터형");
    if (/시스템|설계|구조|모델|최적화|회로|입력|출력/.test(text)) out.push("시스템형");
    if (/윤리|사회|책임|시민|영향|안전|지속가능/.test(text)) out.push("윤리·사회형");
    return unique(out);
  }

  async function buildStudentInputFromRecord(student, options = {}) {
    const idx = Number(options.currentYearIdx ?? 0);
    const { yearLabel, subjects } = extractYearBundle(student, idx);
    const selectedSubjects = unique(subjects.map(s => s.subject || s.subject_name).filter(Boolean));
    const rawTexts = [];
    subjects.forEach(subject => collectTextDeep(subject, rawTexts));
    const corpus = rawTexts.join(" ");
    const activityKeywords = unique(rawTexts.flatMap(v => String(v).split(/[,·/()\s]+/)).filter(v => v && v.length >= 2)).slice(0, 60);
    return {
      student_id: student?.student_id || student?.id || "",
      selected_subjects: selectedSubjects,
      track_keywords: detectTrackKeywords(corpus),
      style_keywords: detectStyleKeywords(corpus),
      activity_keywords: activityKeywords,
      raw_keyword_pool: rawTexts.slice(0, 200),
      source_mode: "record_raw_text",
      year_label: yearLabel,
      year_index: idx
    };
  }

  window.StudentRecordKeywordExtractor = { buildStudentInputFromRecord };
})();
