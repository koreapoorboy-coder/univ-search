(function () {
  "use strict";

  function unique(arr) { return [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))]; }
  function norm(v) {
    return String(v || "").toLowerCase().replace(/\s+/g, "").replace(/Ⅰ|ⅰ/g, "1").replace(/Ⅱ|ⅱ/g, "2");
  }
  function normalizeSubject(v) {
    const raw = norm(v).replace(/학$/g, "");
    const map = {
      "물리": "물리학", "물리1": "물리학", "물리학1": "물리학", "물리2": "물리학2", "물리학2": "물리학2",
      "화학": "화학", "화학1": "화학", "화학2": "화학2",
      "생명": "생명과학", "생명1": "생명과학", "생명과학1": "생명과학", "생명2": "생명과학2", "생명과학2": "생명과학2",
      "지구과학1": "지구과학", "지구과학2": "지구과학2",
      "미적분1": "미적분", "확률통계": "확률과통계", "인공지능": "정보"
    };
    return map[raw] || raw;
  }

  const GLOBAL_BLOCKED_SUBJECTS = ["공통국어","공통수학","공통수학1","공통수학2","공통영어","통합사회","통합과학","과학탐구실험","창의체험활동"].map(normalizeSubject);
  const SUBJECT_BRIDGE = {
    "공통수학1": ["대수", "기하"],
    "공통수학2": ["대수", "기하", "미적분"],
    "통합과학": ["물리학", "화학", "생명과학", "지구과학"],
    "물리학": ["물리학2", "기하", "미적분"],
    "물리학2": ["고급물리학", "미적분"],
    "화학": ["화학2", "고급화학", "생명과학"],
    "화학2": ["고급화학", "미적분"],
    "생명과학": ["생명과학2", "고급생명과학", "화학"],
    "생명과학2": ["고급생명과학", "화학2"],
    "대수": ["미적분", "기하", "확률과통계"],
    "미적분": ["기하", "고급물리학"],
    "정보": ["인공지능 기초", "데이터 과학"]
  };
  const TRACK_SUBJECT_HINTS = {
    "배터리": ["화학", "화학2", "고급화학", "물리학", "물리학2", "미적분"],
    "에너지": ["물리학", "물리학2", "화학", "화학2", "미적분"],
    "반도체": ["물리학", "물리학2", "미적분", "기하", "정보"],
    "전자": ["물리학", "물리학2", "미적분", "정보"],
    "ai": ["정보", "미적분", "확률과통계"],
    "데이터": ["확률과통계", "미적분", "정보"],
    "생명": ["생명과학", "생명과학2", "고급생명과학", "화학"],
    "의료": ["생명과학", "화학", "확률과통계"],
    "환경": ["화학", "지구과학", "생명과학"],
    "모빌리티": ["물리학", "물리학2", "미적분", "화학2"]
  };
  function bridgeTargetsFromMatch(matchSubject) { return SUBJECT_BRIDGE[normalizeSubject(matchSubject)] || []; }
  function buildTrackHints(extensionStudent) {
    const pool = [extensionStudent?.track, extensionStudent?.main_track, extensionStudent?.sub_track, extensionStudent?.selected_subjects_plan?.integrated_direction, extensionStudent?.selected_subjects_plan?.secondary_track].filter(Boolean).join(" ").toLowerCase();
    const out = new Set();
    for (const [k, values] of Object.entries(TRACK_SUBJECT_HINTS)) if (pool.includes(k)) values.forEach(v => out.add(normalizeSubject(v)));
    return [...out];
  }
  function normalizeRules(extensionStudent, rules) {
    const studentId = String(extensionStudent?.student_id || extensionStudent?.id || "");
    const source = rules?.students?.[studentId] || {};
    const globalDefaults = rules?.global_defaults || {};
    return {
      allowed: unique([...(source.allowed_extension_subjects || []), ...(globalDefaults.allowed_extension_subjects || [])]).map(normalizeSubject),
      blocked: unique([...(source.blocked_extension_subjects || []), ...(globalDefaults.blocked_extension_subjects || [])]).map(normalizeSubject),
      preferred: unique([...(source.preferred_extension_subjects || []), ...(globalDefaults.preferred_extension_subjects || [])]).map(normalizeSubject),
      main_track: source.main_track || globalDefaults.main_track || "",
      sub_track: source.sub_track || globalDefaults.sub_track || "",
      display_mode: source.display_mode || globalDefaults.display_mode || "diagnostic_first"
    };
  }
  function filterPlanSubjects(subjects, rules, trackHints) {
    const seen = new Set();
    return (subjects || []).filter(s => {
      const key = normalizeSubject(s.subject);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      if (GLOBAL_BLOCKED_SUBJECTS.includes(key)) return false;
      if (rules.blocked.includes(key)) return false;
      if (rules.allowed.length && !rules.allowed.includes(key)) return false;
      return true;
    }).map(s => ({ ...s, subject_key: normalizeSubject(s.subject), track_hit: trackHints.includes(normalizeSubject(s.subject)) }));
  }
  function subjectPlanScore(planSubject, matches, rules, trackHints) {
    const ps = normalizeSubject(planSubject);
    let score = 0;
    for (const m of (matches || [])) {
      const ms = normalizeSubject(m.subject || "");
      const targets = bridgeTargetsFromMatch(ms);
      if (targets.some(t => normalizeSubject(t) === ps)) score += (Number(m.score) || 0) + 12;
      if (ps === ms) score += (Number(m.score) || 0) + 8;
      const kws = unique(m.matched_keywords || []);
      if (ps.includes("화학") && kws.some(k => /실험|환경|물질|반응|전지|전해질|산화환원/.test(String(k)))) score += 7;
      if (ps.includes("생명") && kws.some(k => /생명|건강|면역|유전|미생물|대사/.test(String(k)))) score += 7;
      if (ps.includes("미적분") && kws.some(k => /변화|최적화|모형|곡선|효율/.test(String(k)))) score += 7;
      if (ps.includes("기하") && kws.some(k => /시각|공간|구조|관계|도식/.test(String(k)))) score += 6;
      if (ps.includes("정보") && kws.some(k => /데이터|알고리즘|ai|모델|코드/.test(String(k).toLowerCase()))) score += 7;
      if (ps.includes("물리") && kws.some(k => /에너지|유도|회로|전자|전력|운동/.test(String(k)))) score += 7;
    }
    if (trackHints.includes(ps)) score += 14;
    if (rules.preferred.includes(ps)) score += 12;
    return score;
  }
  function buildReason(plan, matches, rules, trackHints) {
    const reasons = [];
    const linked = [];
    const ps = normalizeSubject(plan.subject);
    for (const m of (matches || [])) {
      const targets = bridgeTargetsFromMatch(m.subject || "");
      if (targets.some(t => normalizeSubject(t) === ps) || normalizeSubject(m.subject || "") === ps) linked.push(m.subject);
    }
    if (linked.length) reasons.push(`현재 과목 ${unique(linked).join(", ")}과 직접 연결됩니다.`);
    if (trackHints.includes(ps)) reasons.push(`학생의 진로 축과 일치하는 우선 과목입니다.`);
    if (rules.preferred.includes(ps)) reasons.push(`학생별 우선 과목 규칙에 포함됩니다.`);
    if (plan.current_strength) reasons.push(plan.current_strength);
    if (plan.gap_point) reasons.push(`보완 포인트: ${plan.gap_point}`);
    return reasons.slice(0, 3);
  }
  function buildCoreRecommendation(plan) {
    const act = (plan.next_stage_activities || [])[0] || {};
    return {
      recommended_subject: plan.subject || "",
      top_activity_title: act.title || "",
      why: act.why_needed || plan.course_role || "",
      activity_detail: act.activity_detail || "",
      expected_change: act.expected_record_change || plan.admission_view || ""
    };
  }
  function generateRecommendations(matches, extensionStudent, rulesJson) {
    const plan = extensionStudent?.selected_subjects_plan;
    const subjects = Array.isArray(plan?.selection_subjects) ? plan.selection_subjects : [];
    const rules = normalizeRules(extensionStudent, rulesJson || {});
    const trackHints = buildTrackHints({ ...extensionStudent, main_track: rules.main_track, sub_track: rules.sub_track });
    const filtered = filterPlanSubjects(subjects, rules, trackHints);
    const scored = filtered.map(s => ({ ...s, auto_score: subjectPlanScore(s.subject, matches, rules, trackHints), auto_reasons: buildReason(s, matches, rules, trackHints), auto_core: buildCoreRecommendation(s) })).sort((a, b) => (b.auto_score || 0) - (a.auto_score || 0));
    return {
      integrated_direction: plan?.integrated_direction || extensionStudent?.track || rules.main_track || "",
      secondary_track: plan?.secondary_track || rules.sub_track || "",
      design_note: plan?.selection_design_note || "",
      rules_applied: rules,
      recommended_subjects: scored,
      visible_subjects: scored.slice(0, 3)
    };
  }
  window.StudentTextbookRecommendationEngine = { generateRecommendations, normalizeSubject, buildTrackHints };
})();
