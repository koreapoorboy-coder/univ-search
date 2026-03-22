(function () {
  "use strict";

  function unique(arr){ return [...new Set((Array.isArray(arr)?arr:[]).filter(Boolean))]; }
  function norm(v){ return String(v||"").toLowerCase().replace(/\s+/g,"").replace(/Ⅰ|ⅰ/g,"1").replace(/Ⅱ|ⅱ/g,"2"); }

  const SUBJECT_BRIDGE = {
    "공통수학1": ["대수","기하"],
    "공통수학2": ["대수","기하"],
    "통합과학": ["화학","생명과학","물리학"],
    "물리학": ["물리학","기하"],
    "물리학Ⅰ": ["물리학","기하"],
    "화학": ["화학","생명과학"],
    "화학Ⅰ": ["화학","생명과학"],
    "생명과학": ["생명과학","화학"],
    "생명과학Ⅰ": ["생명과학","화학"],
    "공통국어": ["문학"],
    "문학": ["문학"]
  };

  function bridgeTargetsFromMatch(matchSubject){
    const exact = SUBJECT_BRIDGE[matchSubject];
    if (exact) return exact;
    const n = norm(matchSubject);
    for (const [k,v] of Object.entries(SUBJECT_BRIDGE)) {
      if (n.includes(norm(k)) || norm(k).includes(n)) return v;
    }
    return [];
  }

  function subjectPlanScore(planSubject, matches){
    const ps = norm(planSubject);
    let score = 0;
    for (const m of (matches||[])) {
      const targets = bridgeTargetsFromMatch(m.subject || "");
      if (targets.some(t => ps.includes(norm(t)) || norm(t).includes(ps))) score += (Number(m.score)||0) + 10;
      if (ps.includes(norm(m.subject||"")) || norm(m.subject||"").includes(ps)) score += (Number(m.score)||0) + 6;
      const kws = unique(m.matched_keywords || []);
      if (ps.includes("화학") && kws.some(k => /실험|환경|물질|반응/.test(String(k)))) score += 6;
      if (ps.includes("생명") && kws.some(k => /생명|건강|면역|유전|미생물/.test(String(k)))) score += 6;
      if (ps.includes("대수") && kws.some(k => /구조|데이터|수치|논리|모형/.test(String(k)))) score += 6;
      if (ps.includes("기하") && kws.some(k => /시각|구조|관계|도식|정리/.test(String(k)))) score += 5;
      if (ps.includes("문학") && kws.some(k => /건강|환경|윤리|사회|비평/.test(String(k)))) score += 5;
    }
    return score;
  }

  function buildReason(plan, matches){
    const reasons = [];
    const linked = [];
    for (const m of (matches||[])) {
      const targets = bridgeTargetsFromMatch(m.subject || "");
      if (targets.some(t => norm(plan.subject).includes(norm(t)) || norm(t).includes(norm(plan.subject)))) {
        linked.push(m.subject);
      }
    }
    if (linked.length) reasons.push(`현재 과목 ${unique(linked).join(", ")}에서 다음 단계 과목으로 자연스럽게 확장됩니다.`);
    if (plan.current_strength) reasons.push(plan.current_strength);
    if (plan.gap_point) reasons.push(`보완 포인트: ${plan.gap_point}`);
    return reasons.slice(0,3);
  }

  function buildCoreRecommendation(plan){
    const act = (plan.next_stage_activities || [])[0] || {};
    return {
      recommended_subject: plan.subject || "",
      top_activity_title: act.title || "",
      why: act.why_needed || plan.course_role || "",
      activity_detail: act.activity_detail || "",
      expected_change: act.expected_record_change || plan.admission_view || ""
    };
  }

  function generateRecommendations(matches, extensionStudent){
    const plan = extensionStudent?.selected_subjects_plan;
    const subjects = Array.isArray(plan?.selection_subjects) ? plan.selection_subjects : [];
    const scored = subjects.map(s => ({
      ...s,
      auto_score: subjectPlanScore(s.subject, matches),
      auto_reasons: buildReason(s, matches),
      auto_core: buildCoreRecommendation(s)
    })).sort((a,b) => (b.auto_score||0) - (a.auto_score||0));
    return {
      integrated_direction: plan?.integrated_direction || "",
      secondary_track: plan?.secondary_track || "",
      design_note: plan?.selection_design_note || "",
      recommended_subjects: scored
    };
  }

  window.StudentTextbookRecommendationEngine = {
    generateRecommendations
  };
})();
