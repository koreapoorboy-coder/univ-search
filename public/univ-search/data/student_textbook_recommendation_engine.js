// Recommendation engine: concept match + noise filtering
(function (global) {
  "use strict";

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function normText(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/Ⅰ|ⅰ/g, "1")
      .replace(/Ⅱ|ⅱ/g, "2")
      .replace(/Ⅲ|ⅲ/g, "3")
      .replace(/물리학/g, "물리")
      .replace(/생명과학/g, "생명")
      .replace(/지구과학/g, "지구");
  }

  function subjectMatches(a, b) {
    const x = normText(a);
    const y = normText(b);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
  }

  function uniqBySubject(items) {
    const seen = new Set();
    const out = [];
    safeArray(items).forEach(item => {
      const key = normText(item?.subject || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  function getRuleSet(rules) {
    return rules?.concept_rules || rules || {};
  }

  function extractConceptMatches(matches, rules) {
    const ruleSet = getRuleSet(rules);
    const blobs = safeArray(matches).map(m => [
      m?.unit || "",
      m?.subunit || "",
      ...safeArray(m?.matched_keywords),
      ...safeArray(m?.core_concepts)
    ].join(" "));
    const normalizedBlobs = blobs.map(normText);

    const found = [];
    Object.keys(ruleSet).forEach(ruleKey => {
      const nk = normText(ruleKey);
      if (normalizedBlobs.some(b => b.includes(nk))) {
        found.push(ruleKey);
      }
    });
    return found;
  }

  function scoreConcepts(concepts, rules, subject) {
    const ruleSet = getRuleSet(rules);
    const s = normText(subject);
    let score = 0;

    concepts.forEach(key => {
      const rule = ruleSet[key] || {};
      const roles = safeArray(rule.next_subject_roles);

      if (roles.some(r => subjectMatches(r, subject))) score += 18;
      if (s.includes("화학") && /산화환원|전지|전해질|전고체/.test(key)) score += 10;
      if (s.includes("물리") && /전자기|전류|전압|유도|에너지/.test(key)) score += 10;
      if (s.includes("미적분") && /변화율|그래프|함수|미분|적분/.test(key)) score += 10;
      if (s.includes("생명") && /세포막|물질이동|유전|항상성/.test(normText(key))) score += 10;
    });

    return score;
  }

  function subjectPlanScore(subject, matches) {
    const subjectNorm = normText(subject);
    let score = 0;

    safeArray(matches).forEach(m => {
      const mSubject = normText(m?.subject || m?.book_subject || "");
      const blob = `${m?.unit || ""} ${m?.subunit || ""} ${safeArray(m?.matched_keywords).join(" ")} ${safeArray(m?.core_concepts).join(" ")}`;

      if (subjectMatches(subjectNorm, mSubject)) score += 35;

      if (/배터리|전지|충방전|전해질|산화환원|전고체/.test(blob)) {
        if (subjectNorm.includes("화학")) score += 12;
        if (subjectNorm.includes("고급화학")) score += 14;
      }
      if (/전자기|전류|전압|회로|유도|에너지|전력/.test(blob)) {
        if (subjectNorm.includes("물리")) score += 12;
      }
      if (/그래프|변화율|미분|적분|함수|모델링|최적화/.test(blob)) {
        if (subjectNorm.includes("미적분") || subjectNorm.includes("대수") || subjectNorm.includes("기하")) score += 12;
      }
      if (/세포|유전|항상성|대사|효소|세포막|물질이동/.test(blob)) {
        if (subjectNorm.includes("생명")) score += 12;
        if (subjectNorm.includes("화학")) score += 6;
      }
      if (/환경|건강|오염|미세플라스틱/.test(blob)) {
        if (subjectNorm.includes("화학")) score += 8;
        if (subjectNorm.includes("생명")) score += 8;
        if (subjectNorm.includes("문학")) score += 2;
      }
    });

    return score;
  }

  function buildReason(subjectPlan, matches, studentRule, conceptMatches) {
    const reasons = [];
    const subject = subjectPlan?.subject || "";

    if (studentRule?.main_track) {
      reasons.push(`현재 학생의 주된 진로 축인 '${studentRule.main_track}'과 연결성이 높음`);
    }
    if (studentRule?.sub_track) {
      reasons.push(`보조 진로 축인 '${studentRule.sub_track}'과 함께 읽을 수 있음`);
    }
    if (conceptMatches.length) {
      reasons.push(`현재 기록에서 ${conceptMatches.slice(0, 3).join(", ")} 개념과 연결됨`);
    }

    const relatedMatches = safeArray(matches).filter(m =>
      subjectMatches(subject, m?.subject || m?.book_subject || "")
    );

    if (relatedMatches.length) {
      const top = relatedMatches
        .slice(0, 2)
        .map(m => m?.unit || m?.chapter)
        .filter(Boolean);

      if (top.length) {
        reasons.push(`교과서 단원 기준으로 ${top.join(", ")}와 자연스럽게 연결될 수 있음`);
      }
    }

    return reasons.slice(0, 3);
  }

  function buildCoreRecommendation(subjectPlan) {
    const subject = subjectPlan?.subject || "";
    const role = subjectPlan?.course_role || "";
    if (role) return { top_activity_title: role };

    if (subjectMatches(subject, "미적분")) {
      return { top_activity_title: "데이터 변화와 시스템 해석을 수학적으로 구조화하는 중심 과목" };
    }
    if (subjectMatches(subject, "물리2") || subjectMatches(subject, "물리Ⅱ") || subjectMatches(subject, "물리학Ⅱ")) {
      return { top_activity_title: "에너지 흐름과 전기전자 시스템을 이해하는 핵심 과목" };
    }
    if (subjectMatches(subject, "화학") || subjectMatches(subject, "화학2") || subjectMatches(subject, "화학Ⅱ")) {
      return { top_activity_title: "물질 반응과 전지 개념을 심화하는 핵심 과목" };
    }
    if (subjectMatches(subject, "고급화학")) {
      return { top_activity_title: "소재와 공정, 안정성을 더 깊게 다루는 심화 과목" };
    }
    if (subjectMatches(subject, "생명")) {
      return { top_activity_title: "생명 현상과 건강 문제를 체계적으로 확장하는 과목" };
    }
    if (subjectMatches(subject, "문학")) {
      return { top_activity_title: "과학·환경 주제를 글과 토론의 관점으로 해석하는 보조 과목" };
    }
    if (subjectMatches(subject, "대수")) {
      return { top_activity_title: "데이터와 규칙성을 수학적으로 정리하는 기초 과목" };
    }

    return { top_activity_title: "현재 기록과 연결 가능한 확장 과목" };
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

  function buildConceptPayload(conceptMatches, rules, subject) {
    const ruleSet = getRuleSet(rules);
    const matched = [];
    const questions = [];
    const roles = [];
    const units = [];
    const scenes = [];

    conceptMatches.forEach(key => {
      const rule = ruleSet[key] || {};
      const nextRoles = safeArray(rule.next_subject_roles);

      if (!nextRoles.length || nextRoles.some(r => subjectMatches(r, subject))) {
        matched.push(key);
        safeArray(rule.expansion_questions).forEach(v => questions.push(v));
        nextRoles.forEach(v => roles.push(v));
        safeArray(rule.textbook_connection?.related_units).forEach(v => units.push(v));
        safeArray(rule.school_scene).forEach(v => scenes.push(v));
      }
    });

    return {
      matched_concepts: [...new Set(matched)].slice(0, 4),
      expansion_questions: [...new Set(questions)].slice(0, 3),
      next_subject_roles: [...new Set(roles)].slice(0, 3),
      textbook_connection: {
        related_units: [...new Set(units)].slice(0, 4)
      },
      school_scene: [...new Set(scenes)].slice(0, 3)
    };
  }

  function filterNoise(items, studentRule) {
    const preferred = safeArray(studentRule?.preferred_extension_subjects);

    return safeArray(items).filter(item => {
      if (preferred.some(p => subjectMatches(item.subject, p))) return true;
      if ((item.auto_score || 0) >= 10) return true;
      if (safeArray(item.matched_concepts).length) return true;
      return false;
    });
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

    const conceptMatches = extractConceptMatches(matches, rules);

    const scored = filtered.map(s => {
      const baseScore = subjectPlanScore(s?.subject, matches);
      const conceptScore = scoreConcepts(conceptMatches, rules, s?.subject);
      const ruleBonus = s?.rule_bonus || 0;
      const payload = buildConceptPayload(conceptMatches, rules, s?.subject);
      const total = baseScore + conceptScore + ruleBonus;

      return {
        ...s,
        auto_score: total,
        auto_reasons: buildReason(s, matches, studentRule, payload.matched_concepts),
        auto_core: buildCoreRecommendation(s),
        matched_concepts: payload.matched_concepts,
        expansion_questions: payload.expansion_questions,
        next_subject_roles: payload.next_subject_roles,
        textbook_connection: payload.textbook_connection,
        school_scene: payload.school_scene
      };
    });

    const compact = filterNoise(scored, studentRule)
      .sort((a, b) => (b.auto_score || 0) - (a.auto_score || 0));

    return {
      integrated_direction: plan?.integrated_direction || studentRule?.main_track || "",
      secondary_track: plan?.secondary_track || studentRule?.sub_track || "",
      design_note: plan?.selection_design_note || "",
      recommended_subjects: compact.slice(0, 3)
    };
  }

  global.StudentTextbookRecommendationEngine = {
    normalizeSubjectName: normText,
    subjectMatches,
    subjectPlanScore,
    buildReason,
    buildCoreRecommendation,
    applyStudentRules,
    generateRecommendations
  };
})(window);
