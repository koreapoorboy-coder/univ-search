// Admission recommendation engine - fixed keyword matching
(function (global) {
  "use strict";

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function normalizeText(v) {
    return String(v || "").toLowerCase().replace(/\s+/g, "");
  }

  function normalizeSubjectName(v) {
    return normalizeText(v)
      .replace(/Ⅰ|ⅰ/g, "1")
      .replace(/Ⅱ|ⅱ/g, "2")
      .replace(/Ⅲ|ⅲ/g, "3")
      .replace(/물리학/g, "물리")
      .replace(/생명과학/g, "생명")
      .replace(/지구과학/g, "지구");
  }

  function subjectMatches(a, b) {
    const x = normalizeSubjectName(a);
    const y = normalizeSubjectName(b);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
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

  function collectKeywordPool(matches, subjectPlan) {
    const subject = subjectPlan?.subject || "";
    const pool = [];

    safeArray(matches).forEach(m => {
      const mSubject = m?.subject || m?.book_subject || "";
      if (!subjectMatches(subject, mSubject)) return;

      safeArray(m?.matched_keywords).forEach(v => pool.push(String(v || "")));
      safeArray(m?.core_concepts).forEach(v => pool.push(String(v || "")));
      if (m?.unit) pool.push(String(m.unit));
      if (m?.subunit) pool.push(String(m.subunit));
    });

    return pool.filter(Boolean);
  }

  function matchConceptRules(keywordPool, rules) {
    const ruleSet = rules?.concept_rules || rules || {};
    const normalizedKeywords = keywordPool.map(v => normalizeText(v));
    const matched = [];

    Object.keys(ruleSet).forEach(ruleKey => {
      const normalizedRuleKey = normalizeText(ruleKey);
      const hit = normalizedKeywords.some(k =>
        k.includes(normalizedRuleKey) || normalizedRuleKey.includes(k)
      );
      if (hit) {
        matched.push({ key: ruleKey, rule: ruleSet[ruleKey] });
      }
    });

    return matched;
  }

  function subjectPlanScore(subjectPlan, matches, rules) {
    const subject = subjectPlan?.subject || "";
    let score = 0;

    safeArray(matches).forEach(m => {
      const mSubject = m?.subject || m?.book_subject || "";
      if (subjectMatches(subject, mSubject)) score += 15;
    });

    const keywordPool = collectKeywordPool(matches, subjectPlan);
    const conceptHits = matchConceptRules(keywordPool, rules);
    score += conceptHits.length * 12;

    if (subjectMatches(subject, "화학") || subjectMatches(subject, "화학2") || subjectMatches(subject, "화학Ⅱ")) {
      if (conceptHits.some(h => /산화환원|전지|세포막|물질이동/.test(h.key))) score += 8;
    }
    if (subjectMatches(subject, "생명") || subjectMatches(subject, "생명과학")) {
      if (conceptHits.some(h => /세포막|항상성|면역|대사/.test(h.key))) score += 8;
    }
    if (subjectMatches(subject, "대수") || subjectMatches(subject, "미적분")) {
      if (conceptHits.some(h => /변화율|그래프|모델링|데이터/.test(h.key))) score += 8;
    }
    if (subjectMatches(subject, "문학")) {
      if (conceptHits.some(h => /윤리|환경|건강|사회/.test(h.key))) score += 5;
    }

    return score;
  }

  function buildReason(subjectPlan, matches, studentRule, rules) {
    const reasons = [];
    const keywordPool = collectKeywordPool(matches, subjectPlan);
    const conceptHits = matchConceptRules(keywordPool, rules);

    if (studentRule?.main_track) {
      reasons.push(`현재 학생의 주된 진로 축인 '${studentRule.main_track}'과 연결성이 높음`);
    }
    if (conceptHits.length) {
      reasons.push(`${conceptHits.slice(0, 2).map(h => h.key).join(", ")} 개념과 현재 기록이 연결됨`);
    } else {
      reasons.push("현재 기록을 다음 과목의 개념·해석 관점으로 이어 읽는 역할");
    }

    return reasons.slice(0, 3);
  }

  function buildCoreRecommendation(subjectPlan, matches, rules) {
    const keywordPool = collectKeywordPool(matches, subjectPlan);
    const conceptHits = matchConceptRules(keywordPool, rules);

    if (conceptHits.length) {
      const first = conceptHits[0]?.rule || {};
      return {
        top_activity_title: first?.concept || "현재 기록과 연결 가능한 확장 과목",
        matched_concepts: conceptHits.map(h => h.key).slice(0, 4),
        expansion_questions: safeArray(first?.expansion_questions).slice(0, 3),
        next_subject_roles: safeArray(first?.next_subject_roles).slice(0, 3),
        textbook_connection: first?.textbook_connection || {},
        school_scene: safeArray(first?.school_scene).slice(0, 3)
      };
    }

    return {
      top_activity_title: "현재 기록을 다음 과목의 개념·해석 관점으로 이어 읽는 역할",
      matched_concepts: [],
      expansion_questions: [],
      next_subject_roles: [],
      textbook_connection: {},
      school_scene: []
    };
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
      const baseScore = subjectPlanScore(s, matches, rules);
      const ruleBonus = s?.rule_bonus || 0;
      const autoCore = buildCoreRecommendation(s, matches, rules);

      return {
        ...s,
        auto_score: baseScore + ruleBonus,
        auto_reasons: buildReason(s, matches, studentRule, rules),
        auto_core: autoCore,
        matched_concepts: autoCore.matched_concepts || [],
        expansion_questions: autoCore.expansion_questions || [],
        next_subject_roles: autoCore.next_subject_roles || [],
        textbook_connection: autoCore.textbook_connection || {},
        school_scene: autoCore.school_scene || []
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
    applyStudentRules,
    generateRecommendations
  };
})(window);
