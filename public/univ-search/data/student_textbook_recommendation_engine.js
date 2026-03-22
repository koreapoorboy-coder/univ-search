// Admission-oriented recommendation engine (rules-aware, concept_rules compatible)
(function (global) {
  "use strict";

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function normalizeText(v) {
    return String(v || "").trim();
  }

  function normalizeSubjectName(v) {
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
    const x = normalizeSubjectName(a);
    const y = normalizeSubjectName(b);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
  }

  function uniqBySubject(items) {
    const seen = new Set();
    const out = [];

    safeArray(items).forEach(function (item) {
      const key = normalizeSubjectName(item && item.subject);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });

    return out;
  }

  function getRuleSet(rules) {
    if (rules && typeof rules === "object" && rules.concept_rules && typeof rules.concept_rules === "object") {
      return rules.concept_rules;
    }
    return rules || {};
  }

  function collectKeywordPool(matches, extensionStudent, studentRule) {
    const pool = [];

    safeArray(matches).forEach(function (m) {
      pool.push(m && m.unit);
      pool.push(m && m.subunit);
      safeArray(m && m.matched_keywords).forEach(function (k) { pool.push(k); });
      safeArray(m && m.core_concepts).forEach(function (k) { pool.push(k); });
      pool.push(m && m.subject);
      pool.push(m && m.book_subject);
    });

    const plan = extensionStudent && extensionStudent.selected_subjects_plan;
    safeArray(plan && plan.selection_subjects).forEach(function (s) {
      pool.push(s && s.subject);
      pool.push(s && s.course_role);
      safeArray(s && s.current_evidence).forEach(function (e) { pool.push(e); });
      pool.push(s && s.current_strength);
      pool.push(s && s.gap_point);
    });

    safeArray(studentRule && studentRule.allowed_extension_subjects).forEach(function (s) { pool.push(s); });
    pool.push(studentRule && studentRule.main_track);
    pool.push(studentRule && studentRule.sub_track);
    pool.push(studentRule && studentRule.career_label);

    return pool.map(normalizeText).filter(Boolean).join(" ");
  }

  function findMatchedConceptRules(ruleSet, keywordBlob) {
    const found = [];
    Object.keys(ruleSet || {}).forEach(function (ruleKey) {
      const rule = ruleSet[ruleKey] || {};
      const aliases = safeArray(rule.aliases);
      const candidates = [ruleKey].concat(aliases).filter(Boolean);
      const matched = candidates.some(function (term) {
        return keywordBlob.indexOf(String(term)) >= 0;
      });
      if (matched) {
        found.push({
          key: ruleKey,
          rule: rule
        });
      }
    });
    return found;
  }

  function buildConceptSummary(conceptMatches) {
    return conceptMatches.slice(0, 3).map(function (item) {
      return item.rule.concept || item.key;
    });
  }

  function buildExpansionQuestions(conceptMatches) {
    const out = [];
    conceptMatches.forEach(function (item) {
      safeArray(item.rule.expansion_questions).forEach(function (q) {
        if (q && out.indexOf(q) === -1) out.push(q);
      });
    });
    return out.slice(0, 3);
  }

  function buildNextSubjectRole(subject, conceptMatches) {
    const roles = [];
    conceptMatches.forEach(function (item) {
      const map = item.rule.next_subject_roles || {};
      Object.keys(map).forEach(function (k) {
        if (subjectMatches(subject, k)) {
          roles.push(map[k]);
        }
      });
    });
    return roles[0] || "현재 기록을 다음 과목의 개념·해석 관점으로 이어 읽는 역할";
  }

  function buildTextbookConnection(conceptMatches) {
    const relatedUnits = [];
    const conceptLinks = [];

    conceptMatches.forEach(function (item) {
      const tc = item.rule.textbook_connection || {};
      safeArray(tc.related_units).forEach(function (u) {
        if (u && relatedUnits.indexOf(u) === -1) relatedUnits.push(u);
      });
      if (tc.concept_link && conceptLinks.indexOf(tc.concept_link) === -1) {
        conceptLinks.push(tc.concept_link);
      }
    });

    return {
      related_units: relatedUnits.slice(0, 4),
      concept_link: conceptLinks[0] || "현재 기록이 교과서 개념 축과 연결되는 방식으로 읽을 수 있음"
    };
  }

  function buildSchoolScene(conceptMatches) {
    const scenes = [];
    conceptMatches.forEach(function (item) {
      safeArray(item.rule.school_scene).forEach(function (s) {
        if (s && scenes.indexOf(s) === -1) scenes.push(s);
      });
    });
    return scenes.slice(0, 3);
  }

  function subjectPlanScore(subject, matches, conceptMatches, studentRule) {
    const subjectNorm = normalizeSubjectName(subject);
    let score = 0;

    safeArray(matches).forEach(function (m) {
      const mSubject = normalizeSubjectName((m && (m.subject || m.book_subject)) || "");
      const blob = [m && m.unit, m && m.subunit]
        .concat(safeArray(m && m.matched_keywords))
        .concat(safeArray(m && m.core_concepts))
        .join(" ");

      if (subjectMatches(subjectNorm, mSubject)) score += 35;

      if (/배터리|전지|충방전|전해질|산화환원|전고체/.test(blob)) {
        if (subjectNorm.includes("화학")) score += 12;
        if (subjectNorm.includes("고급화학")) score += 14;
      }
      if (/전자기|전류|전압|회로|유도|에너지|전력/.test(blob)) {
        if (subjectNorm.includes("물리")) score += 12;
      }
      if (/그래프|변화율|미분|적분|함수|모델링|최적화/.test(blob)) {
        if (subjectNorm.includes("미적분")) score += 12;
      }
      if (/세포|유전|항상성|대사|효소/.test(blob)) {
        if (subjectNorm.includes("생명")) score += 10;
      }
      if (/환경|오염|건강|보건|미세플라스틱/.test(blob)) {
        if (subjectNorm.includes("문학") || subjectNorm.includes("화법") || subjectNorm.includes("언어")) score += 6;
      }
    });

    conceptMatches.forEach(function (item) {
      const roles = item.rule.next_subject_roles || {};
      Object.keys(roles).forEach(function (s) {
        if (subjectMatches(subject, s)) score += 16;
      });
    });

    if (studentRule && safeArray(studentRule.preferred_extension_subjects).some(function (p) { return subjectMatches(subject, p); })) {
      score += 20;
    }

    return score;
  }

  function buildReason(subjectPlan, matches, studentRule, conceptMatches) {
    const reasons = [];
    const subject = subjectPlan && subjectPlan.subject;

    if (studentRule && studentRule.main_track) {
      reasons.push("현재 학생의 주된 진로 축인 '" + studentRule.main_track + "'과 연결성이 높음");
    }
    if (studentRule && studentRule.sub_track) {
      reasons.push("보조 진로 축인 '" + studentRule.sub_track + "'과 함께 읽을 수 있음");
    }

    const relatedMatches = safeArray(matches).filter(function (m) {
      return subjectMatches(subject, m && (m.subject || m.book_subject || ""));
    });
    if (relatedMatches.length) {
      const top = relatedMatches.slice(0, 2).map(function (m) {
        return m && (m.unit || m.chapter);
      }).filter(Boolean);
      if (top.length) {
        reasons.push("교과서 단원 기준으로 " + top.join(", ") + "와 자연스럽게 연결될 수 있음");
      }
    }

    if (conceptMatches.length) {
      const concepts = buildConceptSummary(conceptMatches);
      if (concepts.length) {
        reasons.push("현재 기록의 핵심 개념인 '" + concepts.join(" / ") + "'을(를) 다음 과목에서 더 분명하게 읽을 수 있음");
      }
    }

    return reasons.slice(0, 3);
  }

  function buildCoreRecommendation(subjectPlan, conceptMatches) {
    const subject = subjectPlan && subjectPlan.subject;
    return {
      top_activity_title: buildNextSubjectRole(subject, conceptMatches)
    };
  }

  function applyGlobalDefaults(subjects, rules) {
    const blocked = safeArray(rules && rules.global_defaults && rules.global_defaults.blocked_extension_subjects);
    return safeArray(subjects).filter(function (s) {
      return !blocked.some(function (b) { return subjectMatches(s && s.subject, b); });
    });
  }

  function applyStudentRules(subjects, studentRule) {
    const blocked = safeArray(studentRule && studentRule.blocked_extension_subjects);
    const allowed = safeArray(studentRule && studentRule.allowed_extension_subjects);

    let filtered = safeArray(subjects).filter(function (s) {
      return !blocked.some(function (b) { return subjectMatches(s && s.subject, b); });
    });

    if (allowed.length) {
      filtered = filtered.filter(function (s) {
        return allowed.some(function (a) { return subjectMatches(s && s.subject, a); });
      });
    }

    return filtered;
  }

  function getStudentRule(rules, studentId) {
    return (rules && rules.students && rules.students[studentId]) || {};
  }

  function generateRecommendations(matches, extensionStudent, rules, studentId) {
    const studentRule = getStudentRule(rules, studentId);
    const plan = (extensionStudent && extensionStudent.selected_subjects_plan) || {};
    const subjects = safeArray(plan.selection_subjects);
    const ruleSet = getRuleSet(rules);

    const keywordBlob = collectKeywordPool(matches, extensionStudent, studentRule);
    const conceptMatches = findMatchedConceptRules(ruleSet, keywordBlob);

    let filtered = applyGlobalDefaults(subjects, rules);
    filtered = applyStudentRules(filtered, studentRule);
    filtered = uniqBySubject(filtered);

    const scored = filtered.map(function (s) {
      const total = subjectPlanScore(s && s.subject, matches, conceptMatches, studentRule);
      return Object.assign({}, s, {
        auto_score: total,
        auto_reasons: buildReason(s, matches, studentRule, conceptMatches),
        auto_core: buildCoreRecommendation(s, conceptMatches),
        matched_concepts: buildConceptSummary(conceptMatches),
        expansion_questions: buildExpansionQuestions(conceptMatches),
        next_subject_role: buildNextSubjectRole(s && s.subject, conceptMatches),
        textbook_connection: buildTextbookConnection(conceptMatches),
        school_scene: buildSchoolScene(conceptMatches)
      });
    }).sort(function (a, b) {
      return (b.auto_score || 0) - (a.auto_score || 0);
    });

    return {
      integrated_direction: plan.integrated_direction || studentRule.main_track || "",
      secondary_track: plan.secondary_track || studentRule.sub_track || "",
      design_note: plan.selection_design_note || "",
      recommended_subjects: scored.slice(0, 3)
    };
  }

  global.StudentTextbookRecommendationEngine = {
    normalizeSubjectName: normalizeSubjectName,
    subjectMatches: subjectMatches,
    generateRecommendations: generateRecommendations
  };
})(window);
