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
      .replace(/미적분/g, "미적분")
      .replace(/공통수학1/g, "공통수학")
      .replace(/공통수학2/g, "공통수학");
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

  function subjectPlanScore(subject, matches) {
    const subjectNorm = normalizeSubjectName(subject);
    let score = 0;

    safeArray(matches).forEach(m => {
      const mSubject = normalizeSubjectName(m?.subject || m?.book_subject || "");
      const unit = String(m?.unit || m?.chapter || "");
      const keywords = safeArray(m?.keywords).join(" ");

      if (subjectMatches(subjectNorm, mSubject)) score += 35;

      if (/배터리|전지|충방전|전해질|산화환원/.test(unit + " " + keywords)) {
        if (subjectNorm.includes("화학")) score += 12;
        if (subjectNorm.includes("고급화학")) score += 14;
      }

      if (/전자기|전류|전압|회로|유도|에너지/.test(unit + " " + keywords)) {
        if (subjectNorm.includes("물리")) score += 12;
      }

      if (/그래프|변화율|미분|적분|함수|모델링|최적화/.test(unit + " " + keywords)) {
        if (subjectNorm.includes("미적분")) score += 12;
      }

      if (/세포|유전|항상성|대사|효소/.test(unit + " " + keywords)) {
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
      const top = relatedMatches.slice(0, 2).map(m => m?.unit || m?.chapter).filter(Boolean);
      if (top.length) {
        reasons.push(`교과서 단원 기준으로 ${top.join(", ")}와 자연스럽게 연결될 수 있음`);
      }
    }

    if (subjectMatches(subject, "미적분")) {
      reasons.push("그래프, 변화율, 모델링 해석을 실제 데이터 이해와 연결하는 데 유리함");
    } else if (subjectMatches(subject, "물리Ⅱ") || subjectMatches(subject, "물리2") || subjectMatches(subject, "물리학Ⅱ")) {
      reasons.push("에너지 전환, 전류·전압, 전자기 개념을 시스템 관점으로 확장하기 좋음");
    } else if (subjectMatches(subject, "화학Ⅱ") || subjectMatches(subject, "화학2")) {
      reasons.push("전지 반응, 물질 변화, 산화환원 흐름을 심화해서 읽어낼 수 있음");
    } else if (subjectMatches(subject, "고급화학")) {
      reasons.push("소재·구조·안정성처럼 심화 화학 개념과 산업 응용을 함께 보기 좋음");
    } else if (subjectMatches(subject, "생명과학")) {
      reasons.push("생명 현상을 체계적으로 해석하는 흐름과 연결될 수 있음");
    }

    return reasons.slice(0, 3);
  }

  function buildCoreRecommendation(subjectPlan) {
    const subject = subjectPlan?.subject || "";
    const role = subjectPlan?.course_role || "";

    if (role) return role;

    if (subjectMatches(subject, "미적분")) {
      return "데이터 변화와 시스템 해석을 수학적으로 구조화하는 중심 과목";
    }
    if (subjectMatches(subject, "물리Ⅱ") || subjectMatches(subject, "물리2") || subjectMatches(subject, "물리학Ⅱ")) {
      return "에너지 흐름과 전기전자 시스템을 이해하는 핵심 과목";
    }
    if (subjectMatches(subject, "화학Ⅱ") || subjectMatches(subject, "화학2")) {
      return "전지 반응과 물질 변화를 심화하는 핵심 과목";
    }
    if (subjectMatches(subject, "고급화학")) {
      return "소재와 공정, 안정성을 더 깊게 다루는 심화 과목";
    }
    if (subjectMatches(subject, "생명과학")) {
      return "생명 현상을 체계적으로 확장하는 과목";
    }

    return "현재 기록과 연결 가능한 확장 과목";
  }

  function applyGlobalDefaults(subjects, rules) {
    const blocked = safeArray(rules?.global_defaults?.blocked_extension_subjects);

    return safeArray(subjects).filter(s =>
      !blocked.some(b => subjectMatches(s?.subject, b))
    );
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

  function getStudentRule(rules, studentId) {
    return rules?.students?.[studentId] || {};
  }

  function generateRecommendations(matches, extensionStudent, rules, studentId) {
    const studentRule = getStudentRule(rules, studentId);
    const plan = extensionStudent?.selected_subjects_plan || {};
    const subjects = safeArray(plan?.selection_subjects);

    let filtered = applyGlobalDefaults(subjects, rules);
    filtered = applyStudentRules(filtered, studentRule);
    filtered = uniqBySubject(filtered);

    const scored = filtered.map(s => {
      const baseScore = subjectPlanScore(s?.subject, matches);
      const ruleBonus = s?.rule_bonus || 0;
      const total = baseScore + ruleBonus;

      return {
        ...s,
        auto_score: total,
        auto_reasons: buildReason(s, matches, studentRule),
        auto_core: buildCoreRecommendation(s)
      };
    }).sort((a, b) => (b.auto_score || 0) - (a.auto_score || 0));

    return {
      integrated_direction: plan?.integrated_direction || studentRule?.main_track || "",
      secondary_track: plan?.secondary_track || studentRule?.sub_track || "",
      design_note: plan?.selection_design_note || "",
      recommended_subjects: scored.slice(0, 3)
    };
  }

  global.StudentTextbookRecommendationEngine = {
    normalizeSubjectName,
    subjectMatches,
    subjectPlanScore,
    buildReason,
    buildCoreRecommendation,
    applyStudentRules,
    generateRecommendations
  };
})(window);
