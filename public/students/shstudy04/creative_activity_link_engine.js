(function(){
  "use strict";
  function unique(arr){return [...new Set((Array.isArray(arr)?arr:[]).filter(Boolean))];}
  function norm(v){return String(v||"").toLowerCase().replace(/\s+/g,"").replace(/Ⅰ|ⅰ/g,"1").replace(/Ⅱ|ⅱ/g,"2");}

  function scoreActivity(activity, planSubjects){
    let score = 0;
    const reasons = [];
    const links = Array.isArray(activity.selected_subject_links) ? activity.selected_subject_links : [];
    const continuity = Array.isArray(activity.continuity_tags) ? activity.continuity_tags : [];
    const matchedSubjects = [];

    planSubjects.forEach(ps => {
      const psn = norm(ps.subject || ps);
      links.forEach(link => {
        const lsn = norm(link.subject || "");
        if(!lsn) return;
        if(psn.includes(lsn) || lsn.includes(psn)){
          score += 20;
          matchedSubjects.push(link.subject);
          reasons.push(`${link.subject} 선택과목과 직접 연결됨`);
          if(link.why) reasons.push(link.why);
        }
      });
    });

    if(continuity.length){
      score += Math.min(continuity.length * 3, 12);
      reasons.push(`연속 활동 축: ${continuity.join(", ")}`);
    }

    if(activity.connection_focus){
      score += 8;
      reasons.push(activity.connection_focus);
    }

    return {
      ...activity,
      connection_score: score,
      matched_subjects: unique(matchedSubjects),
      connection_reasons: unique(reasons)
    };
  }

  function buildCreativeLinkage(data){
    const plan = data.selected_subjects_plan || {};
    const planSubjects = Array.isArray(plan.selection_subjects) ? plan.selection_subjects : [];
    const activities = Array.isArray(data.creative_activities) ? data.creative_activities : [];
    const scored = activities.map(a => scoreActivity(a, planSubjects))
      .sort((a,b) => (b.connection_score||0) - (a.connection_score||0));
    return {
      integrated_direction: plan.integrated_direction || "",
      secondary_track: plan.secondary_track || "",
      selection_subjects: planSubjects,
      activities: scored
    };
  }

  window.CreativeActivityLinkEngine = { buildCreativeLinkage };
})();
