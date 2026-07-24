window.__ASSESSMENT_KEYWORD_BRIDGE_HELPER_VERSION__ = "v1.0.0-runtime-connected";

(function(global){
  "use strict";

  const BRIDGE_URLS = [
    "data/assessment/bridge/assessment_keyword_bridge.v1.json",
    "./data/assessment/bridge/assessment_keyword_bridge.v1.json"
  ];

  let bridgeData = null;
  let loadPromise = null;
  let lastContext = null;

  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .replace(/[Ⅰ]/g,"1")
      .replace(/[Ⅱ]/g,"2")
      .replace(/[Ⅲ]/g,"3")
      .replace(/[^0-9a-z가-힣]+/g,"");
  }

  function uniq(values){
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function firstValue(items, fallback){
    const item = Array.isArray(items) ? items.find(v => v && (v.value || typeof v === "string")) : null;
    return item ? (item.value || item) : fallback;
  }

  function topValues(items, limit){
    return (Array.isArray(items) ? items : [])
      .slice(0, limit || 5)
      .map(item => item?.value || item)
      .filter(Boolean);
  }

  async function fetchFirst(urls){
    let lastError = null;
    for(const url of urls){
      try{
        const response = await fetch(url, { cache: "no-store" });
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      }catch(error){
        lastError = error;
      }
    }
    throw lastError || new Error("assessment keyword bridge load failed");
  }

  function load(){
    if(bridgeData) return Promise.resolve(bridgeData);
    if(loadPromise) return loadPromise;
    loadPromise = fetchFirst(BRIDGE_URLS).then(data => {
      bridgeData = data || {};
      global.__ASSESSMENT_KEYWORD_BRIDGE_DATA_READY__ = true;
      return bridgeData;
    }).catch(error => {
      console.warn("assessment keyword bridge load failed:", error);
      global.__ASSESSMENT_KEYWORD_BRIDGE_DATA_READY__ = false;
      return null;
    });
    return loadPromise;
  }

  function findKeywordRoute(rawKeyword, rawCareer){
    if(!bridgeData) return null;
    const routes = bridgeData.keyword_routes || {};
    const aliases = bridgeData.keyword_aliases || {};
    const raw = String(rawKeyword || "").trim();
    const career = String(rawCareer || "").trim();
    const aliasTarget = aliases[raw] || aliases[raw.toLowerCase()] || raw;
    if(routes[aliasTarget]) return { key: aliasTarget, route: routes[aliasTarget], match: "exact" };

    const target = normalize(aliasTarget);
    if(target){
      const exactKey = Object.keys(routes).find(key => normalize(key) === target);
      if(exactKey) return { key: exactKey, route: routes[exactKey], match: "normalized" };
      const partialKey = Object.keys(routes).find(key => {
        const nk = normalize(key);
        return nk.length >= 2 && target.length >= 2 && (nk.includes(target) || target.includes(nk));
      });
      if(partialKey) return { key: partialKey, route: routes[partialKey], match: "partial" };
    }

    const careerTarget = normalize(career);
    if(careerTarget){
      const careerKey = Object.keys(routes).find(key => {
        const route = routes[key] || {};
        return (route.majors || []).some(major => {
          const nm = normalize(major);
          return nm && (careerTarget.includes(nm) || nm.includes(careerTarget));
        });
      });
      if(careerKey) return { key: raw || careerKey, route: routes[careerKey], match: "career-fallback" };
    }
    return null;
  }

  function findSubjectRoute(rawSubject){
    if(!bridgeData) return null;
    const routes = bridgeData.subject_routes || {};
    const raw = String(rawSubject || "").trim();
    if(routes[raw]) return { key: raw, route: routes[raw], match: "exact" };
    const target = normalize(raw);
    const aliases = bridgeData.subject_aliases || {};
    const key = Object.keys(routes).find(subject => {
      if(normalize(subject) === target) return true;
      return (aliases[subject] || []).some(alias => normalize(alias) === target);
    });
    if(key) return { key, route: routes[key], match: "alias" };
    return null;
  }

  function inferTaskRules(payload){
    if(!bridgeData) return [];
    const text = normalize([
      payload?.taskName,
      payload?.taskType,
      payload?.taskDescription,
      payload?.assessmentTitle,
      payload?.assessmentDescription
    ].filter(Boolean).join(" "));
    if(!text) return [];
    return (bridgeData.task_interpreter_rules || []).filter(rule =>
      (rule.match_terms || []).some(term => text.includes(normalize(term)))
    ).slice(0,4);
  }

  function selectCompatible(primary, preferred, fallback){
    const p = topValues(primary, 10);
    const pref = Array.isArray(preferred) ? preferred : [];
    const direct = p.find(value => pref.includes(value));
    return direct || p[0] || pref[0] || fallback;
  }

  function buildFallbackKeywordRoute(keyword, subjectGroup){
    return {
      keyword: keyword || "선택 키워드",
      major_count: 0,
      majors: [],
      major_groups: ["기타"],
      primary_cluster: "other",
      primary_cluster_label: "기타·직접검토",
      recommended_subject_groups: subjectGroup ? [subjectGroup] : ["과학","수학","사회","정보","국어","영어"],
      preferred_methods: ["자료해석형","보고서작성형","조사탐구형"],
      preferred_outputs: ["탐구보고서","자료분석지","발표자료"],
      preferred_report_modes: ["자료해석형","연구보고서형","개념해석형"],
      assessment_focus: "교과 개념과 실제 사례를 비교 기준·자료·근거 중심으로 연결",
      topic_noun: "핵심 개념과 적용",
      recommended_evidence: "사례 비교표·근거 자료",
      route_confidence: "fallback"
    };
  }

  function taskAction(taskType){
    if(/실험/.test(taskType)) return "조건을 나누어 측정·비교하고 결과를 해석";
    if(/자료|조사/.test(taskType)) return "자료를 동일한 기준으로 비교하고 차이의 원인을 해석";
    if(/발표/.test(taskType)) return "핵심 근거를 표·그래프·사례로 구조화하여 설명";
    return "교과 개념으로 원인과 결과를 분석하고 후속 질문으로 확장";
  }

  function scoreConnection(keywordMatch, subjectMatch, taskRoute, keywordRoute, subjectGroup, inferredRules){
    let score = 20;
    if(keywordMatch === "exact") score += 25;
    else if(keywordMatch === "normalized") score += 22;
    else if(keywordMatch === "partial") score += 16;
    else if(keywordMatch === "career-fallback") score += 10;
    if(subjectMatch === "exact") score += 20;
    else if(subjectMatch === "alias") score += 16;
    if(taskRoute) score += 15;
    if((keywordRoute.recommended_subject_groups || []).includes(subjectGroup)) score += 12;
    if((inferredRules || []).length) score += 5;
    if(keywordRoute.active_library) score += 3;
    return Math.min(100, score);
  }

  function buildContext(payload){
    if(!bridgeData) return null;
    const subjectInput = String(payload?.subject || payload?.selectedSubject || "").trim();
    const subjectGroupInput = String(payload?.subjectGroup || payload?.selectedSubjectGroup || "").trim();
    const taskType = String(payload?.taskType || payload?.outputType || "탐구보고서").trim() || "탐구보고서";
    const rawKeyword = String(payload?.selectedKeyword || payload?.selectedRecommendedKeyword || payload?.keyword || "").trim();
    const career = String(payload?.career || payload?.department || payload?.major || "").trim();
    const concept = String(payload?.selectedConcept || payload?.concept || subjectInput || "교과 개념").trim();

    const keywordMatch = findKeywordRoute(rawKeyword, career);
    const subjectMatch = findSubjectRoute(subjectInput);
    const keywordRoute = keywordMatch?.route || buildFallbackKeywordRoute(rawKeyword, subjectGroupInput);
    const subjectRoute = subjectMatch?.route || (bridgeData.subject_group_routes || {})[subjectGroupInput] || null;
    const subjectGroup = subjectRoute?.canonical_subject_group || subjectGroupInput || (keywordRoute.recommended_subject_groups || [])[0] || "";
    const taskRoute = (bridgeData.task_output_routes || {})[taskType] || (bridgeData.task_output_routes || {})["탐구보고서"] || null;
    const inferredRules = inferTaskRules(payload);

    const inferredMethods = uniq(inferredRules.flatMap(rule => rule.method_axis || []));
    const inferredOutputs = uniq(inferredRules.flatMap(rule => rule.output_axis || []));
    const inferredModes = uniq(inferredRules.flatMap(rule => rule.report_mode || []));
    const inferredSections = uniq(inferredRules.flatMap(rule => rule.required_sections || []));

    const specificTaskType = ["실험보고서","자료조사 보고서","발표보고서"].includes(taskType);
    const taskPrimaryMethod = firstValue(taskRoute?.dominant_methods, "");
    const taskPrimaryOutput = firstValue(taskRoute?.dominant_outputs, "");
    const recommendedMethod = specificTaskType
      ? (taskPrimaryMethod || inferredMethods[0] || keywordRoute.preferred_methods?.[0] || "보고서작성형")
      : (inferredMethods[0] || taskPrimaryMethod || keywordRoute.preferred_methods?.[0] || "보고서작성형");
    const recommendedOutput = specificTaskType
      ? (taskPrimaryOutput || inferredOutputs[0] || keywordRoute.preferred_outputs?.[0] || taskType)
      : (inferredOutputs[0] || taskPrimaryOutput || keywordRoute.preferred_outputs?.[0] || taskType);
    const recommendedMode = inferredModes[0] || firstValue(taskRoute?.dominant_report_modes, "") || keywordRoute.preferred_report_modes?.[0] || "자료해석형";
    const rubricFocus = uniq([
      ...topValues(subjectRoute?.dominant_rubric_tags, 5),
      ...topValues(taskRoute?.dominant_rubric_tags, 5)
    ]).slice(0,6);
    const evidenceTypes = uniq([
      keywordRoute.recommended_evidence,
      ...topValues(subjectRoute?.dominant_outputs, 3),
      ...topValues(taskRoute?.dominant_outputs, 3)
    ]).slice(0,5);
    const reportSections = inferredSections.length ? inferredSections : [
      "탐구 질문",
      "교과 개념과 이론적 배경",
      "비교 기준·변인·자료 수집 방법",
      "핵심 결과와 해석",
      "한계·개선·후속 탐구"
    ];

    const keywordLabel = keywordMatch?.key || rawKeyword || "선택 키워드";
    const subjectLabel = subjectMatch?.key || subjectInput || subjectGroup || "선택 과목";
    const action = taskAction(taskType);
    const topicNoun = keywordRoute.topic_noun || "핵심 개념과 적용";
    const focus = keywordRoute.assessment_focus || "교과 개념과 실제 자료를 연결";
    const score = scoreConnection(keywordMatch?.match, subjectMatch?.match, taskRoute, keywordRoute, subjectGroup, inferredRules);

    const topicOptions = uniq([
      `${subjectLabel} 개념으로 분석한 ${keywordLabel}의 ${topicNoun}: ${action}`,
      `${keywordLabel}의 ${topicNoun}가 실제 성능·현상에 미치는 영향과 평가 기준 비교`,
      `${keywordLabel} 관련 자료에서 나타나는 조건별 차이를 ${concept || subjectLabel} 개념으로 해석`,
      `${keywordLabel}의 한계와 개선 방향을 ${recommendedMethod}으로 검증하는 ${taskType}`
    ]).slice(0,4);

    const recordSentence = `${subjectLabel}의 ${concept || "핵심 개념"}을 바탕으로 ${keywordLabel}의 ${topicNoun}를 탐구하고, ${recommendedMethod}을 통해 자료를 비교·해석하여 ${rubricFocus.slice(0,3).join("·") || "근거 제시와 결과 해석"} 역량을 드러냄.`;

    const context = {
      version: "assessment-keyword-connection-context-v1.0.0",
      connected: true,
      generatedAt: new Date().toISOString(),
      input: {
        subjectGroup: subjectGroupInput,
        subject: subjectInput,
        taskType,
        taskName: payload?.taskName || "",
        taskDescription: payload?.taskDescription || "",
        career,
        concept,
        keyword: rawKeyword
      },
      match: {
        keyword: keywordLabel,
        keywordMatchType: keywordMatch?.match || "fallback",
        subject: subjectLabel,
        subjectMatchType: subjectMatch?.match || "group-fallback",
        subjectGroup,
        inferredRuleIds: inferredRules.map(rule => rule.rule_id),
        connectionScore: score
      },
      assessment_route: {
        keywordCluster: keywordRoute.primary_cluster,
        keywordClusterLabel: keywordRoute.primary_cluster_label,
        majorGroups: keywordRoute.major_groups || [],
        relatedMajors: keywordRoute.majors || [],
        assessmentFocus: focus,
        recommendedMethod,
        recommendedOutput,
        recommendedReportMode: recommendedMode,
        recommendedEvidence: evidenceTypes,
        rubricFocus,
        reportSections,
        avoidModes: uniq([
          ...topValues(subjectRoute?.avoid_modes, 4),
          ...topValues(taskRoute?.avoid_modes, 4)
        ]).slice(0,6)
      },
      runtime_evidence: {
        baselineSchoolCount: bridgeData.source_baseline?.school_count || 0,
        baselineRecordCount: bridgeData.source_baseline?.record_count || 0,
        baselineSourceCount: bridgeData.source_baseline?.source_count || 0,
        latestSchool: bridgeData.source_baseline?.latest_school || "",
        subjectEvidenceRecordCount: subjectRoute?.evidence_record_count || 0,
        subjectEvidenceSchoolCount: subjectRoute?.source_school_count || 0,
        taskEvidenceRecordCount: taskRoute?.evidence_record_count || 0,
        taskEvidenceSchoolCount: taskRoute?.source_school_count || 0,
        dominantMethods: topValues(subjectRoute?.dominant_methods, 5),
        dominantOutputs: topValues(subjectRoute?.dominant_outputs, 5),
        dominantRubrics: topValues(subjectRoute?.dominant_rubric_tags, 6),
        schoolNamesExposed: false
      },
      student_output: {
        title: `${keywordLabel} × ${subjectLabel} 수행평가 연결 결과`,
        one_line_pick: topicOptions[0],
        intro: `키워드의 전공·탐구 축과 실제 ${subjectLabel} 수행평가 기록의 방법·산출물·채점요소를 교차해 주제를 구성했습니다.`,
        position: `${recommendedMode} · ${recommendedMethod} · ${recommendedOutput}`,
        why_this_works: `${focus}. 수행평가 안내문과 결과물 유형을 함께 해석했기 때문에 단순 진로 조사형이 아니라 평가 가능한 과정과 근거가 남습니다.`,
        admission_points: [
          `${concept || subjectLabel} 개념을 키워드 설명에 실제로 사용`,
          `${recommendedMethod}에 맞는 비교 기준·변인·자료를 설정`,
          `${rubricFocus.slice(0,3).join("·") || "근거 제시·자료 분석·결과 해석"}이 보이는 과정 기록`,
          `결론에서 한계와 후속 탐구를 분리하여 제시`
        ],
        differentiation: `같은 ${keywordLabel}를 선택해도 ${subjectLabel}, ${taskType}, 안내문에 따라 방법·산출물·채점요소가 달라지므로 주제가 자동으로 분기됩니다.`,
        record_sentence: recordSentence,
        topic_options: topicOptions,
        subject_cards: [
          {
            title: `${subjectLabel}에서 직접 사용할 개념`,
            concepts: uniq([concept, ...topValues(subjectRoute?.dominant_content_axes, 4)]).slice(0,5),
            points: [`${keywordLabel}를 설명하는 핵심 원리 정리`, `조건·자료·결과의 관계를 ${subjectLabel} 개념으로 해석`]
          },
          {
            title: `${taskType}에서 남겨야 할 평가 증거`,
            concepts: rubricFocus.slice(0,5),
            points: [`${recommendedMethod} 수행 과정 기록`, `${recommendedOutput}에 표·그래프·비교 기준·결론을 포함`]
          }
        ],
        quick_points: [
          `비교할 대상 또는 조건을 2개 이상 정하기`,
          `${keywordRoute.recommended_evidence || "자료와 근거"}를 같은 기준으로 정리하기`,
          `${concept || subjectLabel} 개념으로 차이가 생긴 이유 설명하기`,
          `${rubricFocus.slice(0,3).join("·") || "근거·분석·해석"}이 결과물에 보이도록 작성하기`
        ],
        report_flow: reportSections,
        books: [],
        steps: [
          `수행평가 안내문에서 요구 동사와 결과물 확인`,
          `${keywordLabel}를 ${subjectLabel} 개념과 연결할 비교 기준 설정`,
          `${recommendedOutput}에 자료·해석·한계·후속 탐구 정리`
        ],
        assessment_basis: {
          connectionScore: score,
          baseline: `${bridgeData.source_baseline?.school_count || 0}개교 · ${bridgeData.source_baseline?.record_count || 0}개 수행평가 기록`,
          subjectEvidence: `${subjectLabel} 연결 기록 ${subjectRoute?.evidence_record_count || 0}개 / 출처 학교 ${subjectRoute?.source_school_count || 0}개`,
          taskEvidence: `${taskType} 연결 기록 ${taskRoute?.evidence_record_count || 0}개 / 출처 학교 ${taskRoute?.source_school_count || 0}개`,
          method: recommendedMethod,
          output: recommendedOutput,
          rubrics: rubricFocus,
          privacyRule: "학교명은 추천 기준에 사용하지 않고 출처 검증용으로만 보관"
        }
      }
    };

    lastContext = context;
    global.__ASSESSMENT_KEYWORD_LAST_CONTEXT__ = context;
    return context;
  }

  async function resolve(payload){
    await load();
    return buildContext(payload);
  }

  function resolveSync(payload){
    if(!bridgeData) return null;
    return buildContext(payload);
  }

  global.AssessmentKeywordBridge = {
    version: "v1.0.0-runtime-connected",
    ready: load,
    resolve,
    resolveSync,
    getLastContext: () => lastContext,
    getData: () => bridgeData
  };

  load();
})(window);
