// Upgraded recommendation engine
(function (global) {
  "use strict";

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function normalizeSubjectName(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/Ⅰ|ⅰ/g, "1")
      .replace(/Ⅱ|ⅱ/g, "2")
      .replace(/Ⅲ|ⅲ/g, "3")
      .replace(/물리학/g, "물리")
      .replace(/화학/g, "화학")
      .replace(/생명과학/g, "생명")
      .replace(/지구과학/g, "지구")
      .replace(/미적분/g, "미적분");
  }

  function subjectMatches(a, b) {
    const x = normalizeSubjectName(a);
    const y = normalizeSubjectName(b);
    return x === y || x.includes(y) || y.includes(x);
  }

  function uniqBySubject(items) {
    const seen = new Set();
    const out = [];

    safeArray(items).forEach(item => {
      const key = normalizeSubjectName(item?.subject || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });

    return out;
  }

  function applyStudentRules(subjects, studentRule) {
    const blocked = safeArray(studentRule?.blocked_extension_subjects);
    const allowed = safeArray(studentRule?.allowed_extension_subjects);
    const preferred = safeArray(studentRule?.preferred_extension_subjects);

    let filtered = safeArray(subjects).filter(s =>
      !blocked.some(b => subjectMatches(s?.subject, b))
    );

    if (allowed.length) {
      filtered = filtered.filter(s =>
        allowed.some(a => subjectMatches(s?.subject, a))
      );
    }

    filtered = filtered.map(s => {
      let bonus = 0;
      if (preferred.some(p => subjectMatches(s?.subject, p))) bonus += 20;
      return { ...s, rule_bonus: bonus };
    });

    return filtered;
  }

  function subjectPlanScore(subject, matches) {
    const subjectNorm = normalizeSubjectName(subject);
    let score = 0;

    safeArray(matches).forEach(m => {
      const sourceText = [
        m?.subject || "",
        m?.book_subject || "",
        m?.unit || "",
        m?.chapter || "",
        safeArray(m?.keywords).join(" ")
      ].join(" ");

      if (subjectMatches(subjectNorm, m?.subject || m?.book_subject || "")) score += 35;

      if (/배터리|전지|충방전|전해질|산화환원/.test(sourceText)) {
        if (subjectNorm.includes("화학")) score += 12;
        if (subjectNorm.includes("고급화학")) score += 14;
      }
      if (/전자기|전류|전압|회로|유도|에너지/.test(sourceText)) {
        if (subjectNorm.includes("물리")) score += 12;
      }
      if (/그래프|변화율|미분|적분|함수|모델링|최적화/.test(sourceText)) {
        if (subjectNorm.includes("미적분")) score += 12;
      }
      if (/세포|유전|항상성|대사|효소/.test(sourceText)) {
        if (subjectNorm.includes("생명")) score += 10;
      }
    });

    return score;
  }

  function buildReason(subjectPlan, matches, studentRule) {
    const reasons = [];
    const subject = subjectPlan?.subject || "";

    if (studentRule?.main_track) {
      reasons.push(`현재 학생의 주된 진로 축인 '${studentRule.main_track}'과 연결성이 높음`);
    }
    if (studentRule?.sub_track) {
      reasons.push(`보조 진로 축인 '${studentRule.sub_track}'과 함께 읽을 수 있음`);
    }

    const relatedMatches = safeArray(matches).filter(m =>
      subjectMatches(subject, m?.subject || m?.book_subject || "")
    );

    if (relatedMatches.length) {
      const topUnits = relatedMatches.slice(0, 2).map(m => m?.unit || m?.chapter).filter(Boolean);
      if (topUnits.length) {
        reasons.push(`교과서 단원 기준으로 ${topUnits.join(", ")}와 자연스럽게 연결될 수 있음`);
      }
    }

    return reasons.slice(0, 3);
  }

  function buildCoreRecommendation(subjectPlan) {
    const subject = subjectPlan?.subject || "";
    if (subjectMatches(subject, "미적분")) return "수학 기반 모델링 핵심 과목";
    if (subjectMatches(subject, "물리Ⅱ") || subjectMatches(subject, "물리학Ⅱ")) return "에너지·전기 시스템 핵심 과목";
    if (subjectMatches(subject, "화학Ⅱ")) return "전지·물질 반응 핵심 과목";
    if (subjectMatches(subject, "고급화학")) return "소재·공정 심화 과목";
    if (subjectMatches(subject, "생명과학")) return "생명 시스템 해석 확장 과목";
    return "현재 기록과 연결 가능한 확장 과목";
  }

  function generateRecommendations(matches, extensionStudent, rules, studentId) {
    const studentRule = rules?.students?.[studentId] || {};
    const subjects = safeArray(extensionStudent?.selected_subjects_plan?.selection_subjects);

    const filtered = uniqBySubject(applyStudentRules(subjects, studentRule));

    const scored = filtered.map(s => {
      const total = subjectPlanScore(s?.subject, matches) + (s?.rule_bonus || 0);
      return {
        ...s,
        auto_score: total,
        auto_reasons: buildReason(s, matches, studentRule),
        auto_core: buildCoreRecommendation(s)
      };
    }).sort((a, b) => (b.auto_score || 0) - (a.auto_score || 0));

    return scored.slice(0, 3);
  }

  global.StudentTextbookRecommendationEngine = {
    normalizeSubjectName,
    subjectMatches,
    applyStudentRules,
    subjectPlanScore,
    buildReason,
    buildCoreRecommendation,
    generateRecommendations
  };
})(window);
