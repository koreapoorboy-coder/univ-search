// Admission-style recommendation engine with question generation
(function (global) {
  "use strict";

  function safeArray(v) { return Array.isArray(v) ? v : []; }
  function normalize(v) {
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
    const x = normalize(a), y = normalize(b);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
  }
  function uniqBySubject(items) {
    const seen = new Set();
    const out = [];
    safeArray(items).forEach(item => {
      const key = normalize(item?.subject || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }
  function blobFromMatches(matches) {
    return safeArray(matches).map(m => {
      return [
        m?.subject, m?.book_subject, m?.unit, m?.subunit,
        safeArray(m?.matched_keywords).join(" "),
        safeArray(m?.core_concepts).join(" ")
      ].join(" ");
    }).join(" \n ");
  }
  function detectConcepts(matches, conceptRules) {
    const blob = blobFromMatches(matches);
    const picked = [];
    Object.entries(conceptRules || {}).forEach(([key, rule]) => {
      const testBlob = [key, rule.concept, safeArray(rule.textbook_connection?.related_units).join(" ")].join(" ");
      const keywords = testBlob.split(/[\/\s,·]+/).filter(Boolean);
      const hit = keywords.some(k => k && blob.includes(k));
      if (hit) picked.push({ key, rule });
    });
    return picked.slice(0, 3);
  }
  function scoreSubject(subject, matches, studentRule) {
    const norm = normalize(subject);
    const blob = blobFromMatches(matches);
    let score = 0;
    if (safeArray(studentRule?.preferred_extension_subjects).some(s => subjectMatches(subject, s))) score += 20;
    if (/배터리|전지|산화환원|전해질|전고체/.test(blob)) {
      if (norm.includes("화학")) score += 12;
      if (norm.includes("고급화학")) score += 14;
    }
    if (/전자기|전류|전압|유도|에너지|회로/.test(blob) && norm.includes("물리")) score += 12;
    if (/그래프|변화율|미분|적분|함수|모델링/.test(blob) && norm.includes("미적분")) score += 12;
    if (/세포|항상성|유전|면역|대사/.test(blob) && norm.includes("생명")) score += 10;
    if (/건강|환경|윤리|사회|토론|글쓰기/.test(blob) && (norm.includes("문학") || norm.includes("국어"))) score += 8;
    return score;
  }
  function buildQuestionPack(subject, conceptHits) {
    const questions = [];
    conceptHits.forEach(hit => {
      safeArray(hit.rule.expansion_questions).forEach(q => questions.push(q));
    });
    return [...new Set(questions)].slice(0, 3);
  }
  function buildRoleSummary(subject, conceptHits) {
    const roles = [];
    conceptHits.forEach(hit => {
      const map = hit.rule.next_subject_roles || {};
      Object.entries(map).forEach(([subj, role]) => {
        if (subjectMatches(subject, subj)) roles.push(role);
      });
    });
    return roles[0] || "현재 기록의 핵심 개념을 다음 교과 언어로 확장해 읽는 역할";
  }
  function buildConceptList(conceptHits) {
    return conceptHits.map(hit => hit.rule.concept);
  }
  function buildTextbookLink(conceptHits) {
    const units = [];
    const links = [];
    conceptHits.forEach(hit => {
      safeArray(hit.rule.textbook_connection?.related_units).forEach(u => units.push(u));
      if (hit.rule.textbook_connection?.concept_link) links.push(hit.rule.textbook_connection.concept_link);
    });
    return {
      related_units: [...new Set(units)].slice(0, 4),
      concept_link: links[0] || ""
    };
  }
  function buildSchoolScenes(conceptHits) {
    const scenes = [];
    conceptHits.forEach(hit => {
      safeArray(hit.rule.school_scene).forEach(s => scenes.push(s));
    });
    return [...new Set(scenes)].slice(0, 3);
  }
  function filterSubjects(subjects, studentRule, globalDefaults) {
    const blocked = safeArray(globalDefaults?.blocked_extension_subjects).concat(safeArray(studentRule?.blocked_extension_subjects));
    const allowed = safeArray(studentRule?.allowed_extension_subjects);
    let filtered = safeArray(subjects).filter(s => !blocked.some(b => subjectMatches(s?.subject, b)));
    if (allowed.length) filtered = filtered.filter(s => allowed.some(a => subjectMatches(s?.subject, a)));
    return uniqBySubject(filtered);
  }
  function generateRecommendations(matches, extensionStudent, rules, studentId) {
    const studentRule = rules?.students?.[studentId] || {};
    const subjects = safeArray(extensionStudent?.selected_subjects_plan?.selection_subjects);
    const filtered = filterSubjects(subjects, studentRule, rules?.global_defaults);
    const conceptHits = detectConcepts(matches, rules?.concept_rules || {});
    const scored = filtered.map(s => {
      const subject = s?.subject || "";
      return {
        subject,
        auto_score: scoreSubject(subject, matches, studentRule),
        connection_concepts: buildConceptList(conceptHits),
        expansion_questions: buildQuestionPack(subject, conceptHits),
        next_subject_role: buildRoleSummary(subject, conceptHits),
        textbook_connection: buildTextbookLink(conceptHits),
        school_scene: buildSchoolScenes(conceptHits),
        auto_reasons: [
          studentRule?.main_track ? `현재 학생의 주된 진로 축인 '${studentRule.main_track}'과 연결성이 높음` : "",
          buildRoleSummary(subject, conceptHits),
          buildTextbookLink(conceptHits).concept_link || ""
        ].filter(Boolean).slice(0, 3)
      };
    }).sort((a, b) => (b.auto_score || 0) - (a.auto_score || 0));

    return {
      integrated_direction: extensionStudent?.selected_subjects_plan?.integrated_direction || studentRule?.main_track || "",
      secondary_track: extensionStudent?.selected_subjects_plan?.secondary_track || studentRule?.sub_track || "",
      recommended_subjects: scored.slice(0, 3)
    };
  }

  global.StudentTextbookRecommendationEngine = {
    generateRecommendations
  };
})(window);
