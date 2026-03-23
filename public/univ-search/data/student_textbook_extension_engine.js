// Auto-augmented extension engine
(function (global) {
  "use strict";

  function safeArray(v) { return Array.isArray(v) ? v : []; }
  function safeString(v) { return String(v || ""); }

  function norm(v) {
    return safeString(v)
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
    const x = norm(a), y = norm(b);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
  }

  function getRuleSet(rules, studentRule) {
    const setName = studentRule?.rule_set || "";
    if (setName && rules?.rule_sets?.[setName]?.concept_rules) {
      return rules.rule_sets[setName].concept_rules;
    }
    return rules?.concept_rules || {};
  }

  function flattenStudentEvidence(detailStudent) {
    const years = safeArray(detailStudent?.years);
    return years.flatMap(y => safeArray(y?.subjects).map(s => ({ year: y?.year || "", ...s })));
  }

  function findSubjectEvidence(detailStudent, subjectName) {
    const subjects = flattenStudentEvidence(detailStudent);
    return subjects.filter(s => {
      const blob = [s.subject, safeArray(s.activity_framework).join(" "), safeArray(s.evaluation_priority).join(" "), safeArray(s.inquiry_flow).map(v => v?.title || v).join(" ")].join(" ");
      return subjectMatches(s.subject, subjectName) || blob.includes(subjectName);
    });
  }

  function collectEvidenceKeywords(subjectEvidence) {
    const out = [];
    safeArray(subjectEvidence).forEach(s => {
      safeArray(s.activity_framework).forEach(v => out.push(v));
      safeArray(s.evaluation_priority).forEach(v => out.push(v));
      safeArray(s.inquiry_flow).forEach(v => out.push(v?.title || v));
      if (s.subject_goal_focus) out.push(s.subject_goal_focus);
      if (s.current_activity_basis) out.push(s.current_activity_basis);
    });
    return [...new Set(out.filter(Boolean))];
  }

  function extractConceptMatches(keywords, rules, studentRule) {
    const ruleSet = getRuleSet(rules, studentRule);
    const nk = safeArray(keywords).map(norm);
    const hits = [];
    Object.keys(ruleSet).forEach(key => {
      const nkey = norm(key);
      if (nk.some(v => v.includes(nkey) || nkey.includes(v))) hits.push(key);
    });
    return hits;
  }

  function buildCurrentStrength(subjectEvidence, extSubject) {
    if (extSubject?.current_strength) return extSubject.current_strength;
    const first = safeArray(subjectEvidence)[0] || {};
    return first.current_activity_basis || first.subject_goal_focus || "현재 기록에서 개념을 구조적으로 읽어내는 기반이 확인됨";
  }

  function buildImprovePoint(subjectEvidence, extSubject) {
    if (extSubject?.gap_point) return extSubject.gap_point;
    const blob = collectEvidenceKeywords(subjectEvidence).join(" ");
    if (/실험|변인|통제/.test(blob)) return "현재 기록의 해석 강점을 실제 데이터·조건 비교 관점까지 확장하면 연결성이 더 강해질 수 있음";
    if (/그래프|변화율|모델링/.test(blob)) return "모델링 감각이 보이므로 실제 사례와 연결한 해석 경험이 추가되면 설계의 깊이가 더 살아날 수 있음";
    return "현재 기록의 개념 이해를 실제 사례·비교 해석과 연결하면 확장성이 더 분명해질 수 있음";
  }

  function buildRecordEvidence(subjectEvidence, extSubject) {
    const arr = [];
    safeArray(subjectEvidence).forEach(s => {
      safeArray(s.activity_framework).slice(0,2).forEach(v => arr.push(v));
      safeArray(s.evaluation_priority).slice(0,1).forEach(v => arr.push(v));
      safeArray(s.inquiry_flow).slice(0,1).forEach(v => arr.push(v?.title || v));
    });
    if (!arr.length && extSubject?.current_evidence) arr.push(extSubject.current_evidence);
    return [...new Set(arr.filter(Boolean))].slice(0,4);
  }

  function buildTextbookConnection(conceptMatches, rules, studentRule) {
    const ruleSet = getRuleSet(rules, studentRule);
    const units = [];
    const concepts = [];
    const links = [];
    conceptMatches.forEach(key => {
      const rule = ruleSet[key] || {};
      safeArray(rule?.textbook_connection?.related_units).forEach(v => units.push(v));
      safeArray(rule?.textbook_connection?.core_concepts).forEach(v => concepts.push(v));
      if (rule?.textbook_connection?.concept_link) links.push(rule.textbook_connection.concept_link);
    });
    return {
      related_units: [...new Set(units)].slice(0,4),
      core_concepts: [...new Set(concepts)].slice(0,4),
      concept_link: links[0] || ""
    };
  }

  function buildExpansionDirections(conceptMatches, rules, studentRule, subjectName) {
    const ruleSet = getRuleSet(rules, studentRule);
    const out = [];
    conceptMatches.forEach(key => {
      const rule = ruleSet[key] || {};
      safeArray(rule.expansion_directions || rule.expansion_questions).forEach(v => out.push(v));
    });
    if (!out.length) {
      if (subjectMatches(subjectName, "문학")) {
        out.push("현재 기록의 과학·환경 주제를 해석과 논증의 언어로 바꾸는 방향으로 이어질 수 있음");
      } else if (subjectMatches(subjectName, "화학")) {
        out.push("현재 기록의 건강·환경 이슈를 물질 반응과 조건 변화의 관점으로 읽는 방향으로 이어질 수 있음");
      } else if (subjectMatches(subjectName, "생명")) {
        out.push("현재 기록의 건강·생명 이슈를 구조와 기능, 조절의 관점으로 읽는 방향으로 이어질 수 있음");
      } else {
        out.push("현재 기록에서 드러난 개념을 다음 과목의 해석 틀로 이어 읽는 방향으로 확장될 수 있음");
      }
    }
    return [...new Set(out)].slice(0,3);
  }

  function buildExecutionPlan(conceptMatches, rules, studentRule, subjectName) {
    const ruleSet = getRuleSet(rules, studentRule);
    const out = [];
    conceptMatches.forEach(key => {
      const rule = ruleSet[key] || {};
      safeArray(rule.execution_plan).forEach(v => out.push(v));
    });
    if (!out.length) {
      if (subjectMatches(subjectName, "문학")) {
        out.push("과학·환경 주제를 자료 해석 → 쟁점 정리 → 관점 비교 순으로 구조화해 볼 수 있음");
        out.push("수업·발표·토론에서 기존 과학 탐구 내용을 가치 판단의 언어로 전환해 볼 수 있음");
      } else if (subjectMatches(subjectName, "화학")) {
        out.push("물질 변화, 조건 변화, 결과 차이를 비교하는 관점으로 정리해 볼 수 있음");
      } else if (subjectMatches(subjectName, "생명")) {
        out.push("구조-기능-조절 흐름으로 개념을 묶어 읽는 방식으로 확장해 볼 수 있음");
      } else {
        out.push("현재 기록의 핵심 개념을 다음 과목의 언어로 다시 구조화해 볼 수 있음");
      }
    }
    return [...new Set(out)].slice(0,3);
  }

  function buildQuestions(conceptMatches, rules, studentRule, subjectName) {
    const ruleSet = getRuleSet(rules, studentRule);
    const out = [];
    conceptMatches.forEach(key => {
      const rule = ruleSet[key] || {};
      safeArray(rule.expansion_questions).forEach(v => out.push(v));
    });
    if (!out.length) {
      if (subjectMatches(subjectName, "문학")) {
        out.push("현재 기록의 과학 주제를 글과 토론의 언어로 바꾸면 어떤 쟁점이 드러나는가?");
      } else if (subjectMatches(subjectName, "화학")) {
        out.push("현재 기록의 건강·환경 문제를 물질 변화와 조건 차이의 관점으로 읽으면 무엇이 핵심이 되는가?");
      } else {
        out.push("현재 기록에서 반복된 개념을 다음 과목의 핵심 질문으로 바꾸면 무엇이 되는가?");
      }
    }
    return [...new Set(out)].slice(0,3);
  }

  function buildOutputStructure(subjectName) {
    if (subjectMatches(subjectName, "문학")) {
      return [
        "문제 제기: 현재 기록의 과학·환경 이슈를 한 문장으로 정리",
        "관점 정리: 사실·가치 판단·쟁점 비교",
        "표현 방식: 글쓰기, 발표, 토론 구조로 전환"
      ];
    }
    if (subjectMatches(subjectName, "화학")) {
      return [
        "문제 제기: 물질 변화나 반응 조건의 차이 정리",
        "핵심 개념: 반응, 구조, 조건, 결과 연결",
        "정리 방식: 비교형 보고서 또는 발표 구조"
      ];
    }
    return [
      "문제 제기",
      "핵심 개념 정리",
      "비교 또는 해석 중심 정리"
    ];
  }

  function buildSchoolScene(conceptMatches, rules, studentRule) {
    const ruleSet = getRuleSet(rules, studentRule);
    const out = [];
    conceptMatches.forEach(key => {
      const rule = ruleSet[key] || {};
      safeArray(rule.school_scene).forEach(v => out.push(v));
    });
    if (!out.length) {
      out.push("수업 개념 설명에서 기존 기록의 탐구 소재를 연결해 볼 수 있음");
      out.push("발표나 수행평가에서 비교·해석의 틀로 확장해 볼 수 있음");
    }
    return [...new Set(out)].slice(0,3);
  }

  function buildRecordPoints(conceptMatches, subjectName) {
    const out = [];
    if (subjectMatches(subjectName, "문학")) {
      out.push("과학·환경 주제를 논증과 해석의 언어로 바꾸는 힘으로 읽힐 수 있음");
      out.push("자료와 쟁점을 연결해 자신의 관점을 구조화하는 사고가 드러날 수 있음");
    } else if (subjectMatches(subjectName, "화학")) {
      out.push("조건 변화와 결과 차이를 구조적으로 해석하는 역량으로 읽힐 수 있음");
    } else {
      out.push("현재 기록의 개념을 다음 과목의 해석 틀로 전환하는 힘으로 읽힐 수 있음");
    }
    return [...new Set(out)].slice(0,3);
  }

  function buildAdmissionPoint(subjectName) {
    if (subjectMatches(subjectName, "문학")) {
      return "문학에서는 단순 감상보다, 현재 기록의 과학·환경 이슈를 근거와 관점의 언어로 전환해 읽는 힘이 더 중요하게 해석될 수 있음";
    }
    if (subjectMatches(subjectName, "화학")) {
      return "화학에서는 개념 암기보다, 조건 변화와 물질 반응을 실제 문제와 연결해 해석하는 능력이 중요하게 읽힐 수 있음";
    }
    return "현재 기록을 다음 과목의 개념 언어로 재구성하는 해석력이 평가 포인트로 작용할 수 있음";
  }

  function augmentExtensionStudent(detailStudent, extStudent, rules, studentRule) {
    const plan = extStudent?.selected_subjects_plan || {};
    const subjects = safeArray(plan.selection_subjects).map(s => {
      const subjectEvidence = findSubjectEvidence(detailStudent, s.subject);
      const keywords = collectEvidenceKeywords(subjectEvidence);
      const conceptMatches = extractConceptMatches(keywords, rules, studentRule);

      return {
        ...s,
        current_strength: buildCurrentStrength(subjectEvidence, s),
        gap_point: buildImprovePoint(subjectEvidence, s),
        current_record_evidence: buildRecordEvidence(subjectEvidence, s),
        textbook_connection: buildTextbookConnection(conceptMatches, rules, studentRule),
        expansion_directions: buildExpansionDirections(conceptMatches, rules, studentRule, s.subject),
        execution_plan: buildExecutionPlan(conceptMatches, rules, studentRule, s.subject),
        exploration_questions: buildQuestions(conceptMatches, rules, studentRule, s.subject),
        output_structure: buildOutputStructure(s.subject),
        school_scene: buildSchoolScene(conceptMatches, rules, studentRule),
        record_points: buildRecordPoints(conceptMatches, s.subject),
        admission_view: s.admission_view || buildAdmissionPoint(s.subject),
        matched_concepts: conceptMatches.slice(0,4)
      };
    });

    return {
      ...extStudent,
      selected_subjects_plan: {
        ...plan,
        selection_subjects: subjects
      }
    };
  }

  function getStudentRule(rules, studentId) {
    return rules?.students?.[studentId] || {};
  }

  global.StudentTextbookExtensionEngine = {
    augmentExtensionStudent,
    getStudentRule
  };
})(window);
