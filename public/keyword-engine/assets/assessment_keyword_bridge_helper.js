window.__ASSESSMENT_KEYWORD_BRIDGE_HELPER_VERSION__ = "v2.3.0-task-interpreter-max-match";

(function(global){
  "use strict";

  const BRIDGE_URLS = [
    "data/assessment/bridge/assessment_keyword_bridge.v1.json",
    "./data/assessment/bridge/assessment_keyword_bridge.v1.json"
  ];
  const CROSS_AXIS_URLS = [
    "data/assessment/bridge/assessment_seed_cross_axis.v2.json",
    "./data/assessment/bridge/assessment_seed_cross_axis.v2.json"
  ];

  let bridgeData = null;
  let crossAxisData = null;
  let loadPromise = null;
  let lastContext = null;
  const TASK_FALLBACK_NOTICE = "입력한 과제 유형과 정확히 맞는 규칙이 없어 과목 기본값을 바탕으로 일반형으로 잡았습니다.";
  const NON_REPORT_NOTICE = "이 과제는 실기·수행 중심이라 탐구보고서 형태가 아닙니다.\n보고서형 과제 안내문을 넣어주세요.";
  const NON_REPORT_TERMS = ["연주","실기","랠리","스트로크","체력","참여도","던지기","경기","시합"];
  const TASK_LOG_STORAGE_KEY = "ke.assessmentTaskInterpreterLogs.v1";

  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .replace(/[Ⅰ]/g,"1")
      .replace(/[Ⅱ]/g,"2")
      .replace(/[Ⅲ]/g,"3")
      .replace(/[^0-9a-z가-힣]+/g,"");
  }

  function toCanonicalSubject(value){
    const raw = String(value == null ? "" : value).trim();
    const converter = global.__SUBJECT_ALIAS__?.toCanonicalSubject;
    return raw && typeof converter === "function" ? converter(raw) : raw;
  }

  function normalizeMajor(value){
    return String(value || "")
      .replace(/#U([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .toLowerCase()
      .replace(/[\s()\-_/·.,]+/g, "")
      .replace(/(?:관련)?계열$/g, "");
  }

  function intersectAny(a, b){
    const right = new Set(b || []);
    return (a || []).some(value => right.has(value));
  }

  function tokenize(value){
    return Array.from(new Set(String(value || "")
      .toLowerCase()
      .replace(/[Ⅰ]/g,"1")
      .replace(/[Ⅱ]/g,"2")
      .replace(/[Ⅲ]/g,"3")
      .split(/[^0-9a-z가-힣]+/)
      .map(v => v.trim())
      .filter(v => v.length >= 2 && !/^(선택|탐구|보고서|관련|대한|활용|분석|과목|수행평가)$/.test(v))));
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
    throw lastError || new Error("runtime load failed");
  }

  function load(){
    if(bridgeData && crossAxisData) return Promise.resolve({ bridgeData, crossAxisData });
    if(loadPromise) return loadPromise;
    loadPromise = Promise.all([
      fetchFirst(BRIDGE_URLS),
      fetchFirst(CROSS_AXIS_URLS)
    ]).then(([bridge, cross]) => {
      bridgeData = bridge || {};
      crossAxisData = cross || {};
      global.__ASSESSMENT_KEYWORD_BRIDGE_DATA_READY__ = true;
      global.__ASSESSMENT_SEED_CROSS_AXIS_READY__ = true;
      return { bridgeData, crossAxisData };
    }).catch(error => {
      console.warn("assessment/seed cross-axis runtime load failed:", error);
      global.__ASSESSMENT_KEYWORD_BRIDGE_DATA_READY__ = false;
      global.__ASSESSMENT_SEED_CROSS_AXIS_READY__ = false;
      return null;
    });
    return loadPromise;
  }

  // Department/career is intentionally excluded from keyword fallback.
  function findKeywordRoute(rawKeyword){
    if(!bridgeData) return null;
    const routes = bridgeData.keyword_routes || {};
    const aliases = bridgeData.keyword_aliases || {};
    const raw = String(rawKeyword || "").trim();
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
    return null;
  }

  function findSubjectRoute(rawSubject){
    if(!bridgeData) return null;
    const routes = bridgeData.subject_routes || {};
    const uiRaw = String(rawSubject || "").trim();
    const raw = toCanonicalSubject(uiRaw);
    if(routes[raw]) return { key: raw, route: routes[raw], match: raw === uiRaw ? "exact" : "ui-alias" };
    const target = normalize(raw);
    const aliases = bridgeData.subject_aliases || {};
    const key = Object.keys(routes).find(subject => {
      if(normalize(subject) === target) return true;
      return (aliases[subject] || []).some(alias => normalize(alias) === target);
    });
    if(key) return { key, route: routes[key], match: "alias" };
    return null;
  }

  function effectiveTaskName(payload){
    const raw = String(payload?.taskName || payload?.assessmentTitle || "").trim();
    const subject = String(payload?.subject || payload?.selectedSubject || "").trim();
    const taskType = String(payload?.taskType || payload?.outputType || "").trim();
    const synthetic = [subject, taskType].filter(Boolean).join(" ").trim();
    return raw && synthetic && normalize(raw) === normalize(synthetic) ? "" : raw;
  }

  function rawTaskText(payload){
    return [
      effectiveTaskName(payload),
      payload?.taskDescription,
      payload?.assessmentDescription
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function inferTaskRule(payload){
    const text = rawTaskText(payload);
    const rules = bridgeData?.task_interpreter_rules || [];
    if(!text){
      return { matched:false, rule:null, matchCount:0, matchedTerms:[], fallbackActive:true, fallbackNotice:TASK_FALLBACK_NOTICE };
    }
    let best = null;
    rules.forEach((rule, index) => {
      const matchedTerms = (rule.match_terms || []).filter(term => text.includes(String(term || "").toLowerCase()));
      if(!matchedTerms.length) return;
      const candidate = { rule, index, matchCount:matchedTerms.length, matchedTerms };
      if(!best || candidate.matchCount > best.matchCount) best = candidate;
    });
    if(!best){
      return { matched:false, rule:null, matchCount:0, matchedTerms:[], fallbackActive:true, fallbackNotice:TASK_FALLBACK_NOTICE };
    }
    return {
      matched:true,
      rule:best.rule,
      matchCount:best.matchCount,
      matchedTerms:best.matchedTerms,
      fallbackActive:false,
      fallbackNotice:""
    };
  }

  function detectNonReportTask(payload, taskMatch){
    const text = rawTaskText(payload);
    const matchedTerm = NON_REPORT_TERMS.find(term => text.includes(term)) || "";
    const reasons = taskMatch?.reasons || [];
    const strongRecordMatch = Number(taskMatch?.score || 0) >= 50
      && reasons.some(reason => /수행평가명|안내문/.test(String(reason || "")));
    const recordBlocked = taskMatch?.record?.isTopicGenerating === false && strongRecordMatch;
    return {
      blocked: recordBlocked || !!matchedTerm,
      reason: recordBlocked ? "record_flag_false" : (matchedTerm ? "performance_term" : ""),
      matchedTerm,
      notice: NON_REPORT_NOTICE
    };
  }

  function appendTaskInterpreterLocalLog(event){
    try{
      const current = JSON.parse(localStorage.getItem(TASK_LOG_STORAGE_KEY) || "[]");
      const list = Array.isArray(current) ? current : [];
      list.push(event);
      localStorage.setItem(TASK_LOG_STORAGE_KEY, JSON.stringify(list.slice(-500)));
    }catch(error){
      console.warn("assessment task interpreter local log failed:", error);
    }
  }

  function logTaskInterpreterEvent(payload, interpretation, nonReport){
    if(!interpretation?.fallbackActive && !nonReport?.blocked) return;
    const event = {
      version:"assessment-task-interpreter-log-v1",
      eventType:nonReport?.blocked ? "assessment_non_report_task" : "assessment_task_interpreter_fallback",
      collectedAt:new Date().toISOString(),
      subject:String(payload?.subject || payload?.selectedSubject || ""),
      taskName:String(payload?.taskName || payload?.assessmentTitle || ""),
      taskDescription:String(payload?.taskDescription || payload?.assessmentDescription || ""),
      fallbackActive:!!interpretation?.fallbackActive,
      fallbackNotice:interpretation?.fallbackNotice || "",
      nonReportBlocked:!!nonReport?.blocked,
      nonReportReason:nonReport?.reason || "",
      nonReportMatchedTerm:nonReport?.matchedTerm || ""
    };
    const signature = JSON.stringify([event.eventType,event.subject,event.taskName,event.taskDescription]);
    if(global.__LAST_TASK_INTERPRETER_LOG_SIGNATURE__ === signature) return;
    global.__LAST_TASK_INTERPRETER_LOG_SIGNATURE__ = signature;
    appendTaskInterpreterLocalLog(event);
    const endpoint = global.__TASK_INTERPRETER_LOG_ENDPOINT__
      || `${global.__KEYWORD_ENGINE_WORKER_BASE_URL || "https://curly-base-a1a9.koreapoorboy.workers.dev"}/collect`;
    const body = {
      event_type:event.eventType,
      collected_at:event.collectedAt,
      subject:event.subject,
      task_name:event.taskName,
      task_description:event.taskDescription,
      interpreter_fallback:event.fallbackActive,
      interpreter_notice:event.fallbackNotice,
      non_report_task:event.nonReportBlocked,
      non_report_reason:event.nonReportReason,
      non_report_matched_term:event.nonReportMatchedTerm,
      student_input:{
        subject:event.subject,
        task_name:event.taskName,
        task_description:event.taskDescription,
        event_type:event.eventType
      }
    };
    try{
      fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),keepalive:true})
        .catch(error => console.warn("assessment task interpreter remote log failed:", error));
    }catch(error){
      console.warn("assessment task interpreter remote log failed:", error);
    }
  }

  function buildFallbackKeywordRoute(keyword, subjectGroup){
    return {
      keyword: keyword || "선택 키워드",
      major_count: 0,
      majors: [],
      major_groups: [],
      primary_cluster: "other",
      primary_cluster_label: "교과·수행평가 직접 연결",
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
    if(/문제|풀이/.test(taskType)) return "조건을 재구성하고 풀이 과정과 오류 가능성을 비교";
    return "교과 개념으로 원인과 결과를 분석하고 후속 질문으로 확장";
  }

  function subjectTaskCandidates(subject){
    if(!crossAxisData) return [];
    const map = crossAxisData.tasksBySubject || {};
    const key = normalize(toCanonicalSubject(subject));
    if(map[key]) return map[key];
    const keys = Object.keys(map).filter(k => k && key && (k.includes(key) || key.includes(k))).slice(0,8);
    return keys.flatMap(k => map[k] || []);
  }

  function textOverlapScore(a, b, maxScore){
    const ta = tokenize(a);
    const tb = new Set(tokenize(b));
    if(!ta.length || !tb.size) return 0;
    const hits = ta.filter(token => tb.has(token) || Array.from(tb).some(other => token.includes(other) || other.includes(token))).length;
    return Math.min(maxScore, Math.round((hits / Math.max(ta.length, 1)) * maxScore));
  }

  function matchTaskRecord(payload, subjectInput){
    const candidates = subjectTaskCandidates(subjectInput);
    if(!candidates.length) return null;
    const school = normalize(payload?.schoolName || payload?.school || "");
    const grade = String(payload?.grade || "").replace(/[^0-9]/g, "");
    const title = effectiveTaskName(payload);
    const description = String(payload?.taskDescription || payload?.assessmentDescription || "").trim();
    const type = String(payload?.taskType || payload?.outputType || "").trim();
    const titleNorm = normalize(title);
    let best = null;

    for(const task of candidates){
      let score = 25; // subject bucket match
      const reasons = ["과목 일치"];
      const taskTitleNorm = normalize(task.title);
      if(school && normalize(task.school) === school){ score += 20; reasons.push("학교 내부 일치"); }
      if(grade && String(task.grade || "") === grade){ score += 8; reasons.push("학년 일치"); }
      if(titleNorm && taskTitleNorm === titleNorm){ score += 37; reasons.push("수행평가명 정확 일치"); }
      else if(titleNorm && (taskTitleNorm.includes(titleNorm) || titleNorm.includes(taskTitleNorm))){ score += 28; reasons.push("수행평가명 부분 일치"); }
      else if(title){
        const overlap = textOverlapScore(title, task.title, 24);
        score += overlap;
        if(overlap >= 8) reasons.push("수행평가명 핵심어 일치");
      }
      if(description){
        const overlap = textOverlapScore(description, task.description, 10);
        score += overlap;
        if(overlap >= 4) reasons.push("안내문 핵심어 일치");
      }
      if(type && (task.outputAxis || []).some(v => normalize(v).includes(normalize(type)) || normalize(type).includes(normalize(v)))){
        score += 5;
        reasons.push("산출물 형태 일치");
      }
      if(!best || score > best.score) best = { task, score: Math.min(100, score), reasons };
    }
    return best && best.score >= 35 ? best : null;
  }

  function seedSubjectScore(seed, subject){
    const target = normalize(toCanonicalSubject(subject));
    if(!target) return 0;
    const exactBestForSubject = (seed.subjects || []).some(v => normalize(v) === target);
    if(exactBestForSubject) return 45;
    const normalizedExact = (seed.normalizedSubjects || []).some(v => normalize(v) === target);
    if(normalizedExact) return 38;
    const alias = (seed.subjectAliases || []).some(v => normalize(v) === target);
    if(alias) return 34;
    const partial = uniq([...(seed.subjects || []), ...(seed.normalizedSubjects || []), ...(seed.subjectAliases || [])])
      .some(v => {
        const n = normalize(v);
        return n && (n.includes(target) || target.includes(n));
      });
    return partial ? 25 : 0;
  }

  function collectSubjectSeedCandidates(seeds, subject){
    const uiRaw = String(subject || "").trim();
    const raw = toCanonicalSubject(uiRaw);
    const target = normalize(raw);
    if(!target) return { candidates: [], mode: "none" };
    const exact = (seeds || []).filter(seed => (seed.subjects || []).some(v => String(v || "").trim() === raw));
    if(exact.length) return { candidates: exact, mode: raw === uiRaw ? "bestForSubjects-literal-exact" : "bestForSubjects-ui-alias-exact" };
    const bestForNormalized = (seeds || []).filter(seed => (seed.subjects || []).some(v => normalize(v) === target));
    if(bestForNormalized.length) return { candidates: bestForNormalized, mode: "bestForSubjects-normalized-fallback" };
    const normalized = (seeds || []).filter(seed => (seed.normalizedSubjects || []).some(v => normalize(v) === target));
    if(normalized.length) return { candidates: normalized, mode: "normalizedSubjects-exact" };
    const aliases = (seeds || []).filter(seed => (seed.subjectAliases || []).some(v => normalize(v) === target));
    if(aliases.length) return { candidates: aliases, mode: "subjectAliases-exact" };
    return {
      candidates: (seeds || []).filter(seed => seedSubjectScore(seed, subject) > 0),
      mode: "subject-partial-fallback"
    };
  }

  function seedContentScore(seed, payload, task){
    const selectedKeyword = String(payload?.selectedKeyword || payload?.selectedRecommendedKeyword || payload?.keyword || "");
    const selectedConcept = String(payload?.selectedConcept || payload?.concept || "");
    const selectedAxis = String(payload?.selectedFollowupAxis || payload?.followupAxis || "");
    const seedText = [
      seed.label,
      seed.sourceTitle,
      seed.patternType,
      ...(seed.axisTriggers || []),
      ...(seed.writingKeywords || []),
      seed.topic?.formula,
      seed.topic?.basic,
      seed.topic?.expanded,
      seed.topic?.deep,
      seed.report?.problem,
      seed.report?.conceptRole,
      seed.report?.analysisMethod
    ].filter(Boolean).join(" ");

    const keywordScore = textOverlapScore(selectedKeyword, seedText, 30);
    const axisScore = textOverlapScore(selectedAxis, seedText, 8);
    const conceptScore = textOverlapScore(selectedConcept, seedText, 5);
    const taskScore = textOverlapScore(`${task?.title || ""} ${task?.description || ""}`, seedText, 4);
    const keywordTokens = tokenize(selectedKeyword);
    const seedTokens = new Set(tokenize(seedText));
    const directHits = keywordTokens.filter(token => seedTokens.has(token) || Array.from(seedTokens).some(other => token.includes(other) || other.includes(token))).length;
    const directBonus = directHits >= 3 ? 8 : (directHits >= 2 ? 4 : 0);
    const keywordNorm = normalize(selectedKeyword);
    const exactBonus = keywordNorm && normalize(seedText).includes(keywordNorm) ? 8 : 0;
    return Math.min(45, keywordScore + axisScore + conceptScore + taskScore + directBonus + exactBonus);
  }

  function resolveMajorProfile(career){
    const matching = crossAxisData?.majorMatching || {};
    const key = normalizeMajor(career);
    const aliasRow = matching.aliases?.[key] || null;
    let categoryId = (aliasRow?.categoryIds || [])[0] || "";
    if(!categoryId) categoryId = matching.categoryAliases?.[key] || "";
    return {
      raw: String(career || ""),
      key,
      canonicalIds: aliasRow?.canonicalIds || [],
      categoryIds: aliasRow?.categoryIds || (categoryId ? [categoryId] : []),
      categoryId,
      categoryName: matching.categories?.[categoryId]?.name || ""
    };
  }

  function seedMajorMatchInfo(seed, majorProfile, fallbackActive){
    const normalizedMajors = seed.majorNormalizedKeys || (seed.majors || []).map(normalizeMajor).filter(Boolean);
    const exactByRawKey = !!majorProfile.key && normalizedMajors.includes(majorProfile.key);
    const exactByCanonical = intersectAny(seed.majorCanonicalIds || [], majorProfile.canonicalIds || []);
    const exactMatch = exactByRawKey || exactByCanonical;
    const categoryMatch = !!majorProfile.categoryId && (seed.majorCategories || []).includes(majorProfile.categoryId);
    const tier = exactMatch ? "exact" : ((!fallbackActive && categoryMatch) ? "category" : "other");
    const rank = tier === "exact" ? 2 : (tier === "category" ? 1 : 0);
    const score = tier === "exact" ? 5 : (tier === "category" ? 3 : 0);
    return { exactMatch, categoryMatch, tier, rank, score };
  }

  function matchContentSeed(payload, subjectInput, matchedTask){
    if(!crossAxisData) return null;
    const allSeeds = crossAxisData.seeds || [];
    const subjectPool = collectSubjectSeedCandidates(allSeeds, subjectInput);
    const candidates = subjectPool.candidates;
    if(!candidates.length) return null;

    const career = String(payload?.career || payload?.department || payload?.major || "");
    const majorProfile = resolveMajorProfile(career);
    const threshold = Number(crossAxisData?.majorMatching?.thinCategoryThreshold || 10);
    const categoryMatchCount = majorProfile.categoryId
      ? candidates.filter(seed => (seed.majorCategories || []).includes(majorProfile.categoryId)).length
      : 0;
    const fallbackActive = !!majorProfile.categoryId && categoryMatchCount < threshold;
    const fallbackPromptInstruction = fallbackActive
      ? String(crossAxisData?.majorMatching?.fallbackPromptInstruction || "")
      : "";

    const ranked = candidates.map(seed => {
      const subjectScore = seedSubjectScore(seed, subjectInput);
      const contentScore = seedContentScore(seed, payload, matchedTask);
      const methodScore = matchedTask && (matchedTask.reportModes || []).length ? 5 : 0;
      const coreScore = subjectScore + contentScore + methodScore;
      const major = seedMajorMatchInfo(seed, majorProfile, fallbackActive);
      return {
        seed,
        score: Math.min(100, coreScore + major.score),
        coreScore,
        subjectScore,
        contentScore,
        methodScore,
        majorTieBreakScore: major.score,
        majorTier: major.tier,
        majorRank: major.rank,
        majorExactMatch: major.exactMatch,
        majorCategoryMatch: major.categoryMatch
      };
    }).sort((a, b) => {
      if(b.majorRank !== a.majorRank) return b.majorRank - a.majorRank;
      if(b.coreScore !== a.coreScore) return b.coreScore - a.coreScore;
      if(b.contentScore !== a.contentScore) return b.contentScore - a.contentScore;
      return String(a.seed?.id || "").localeCompare(String(b.seed?.id || ""));
    });

    const best = ranked[0];
    const second = ranked[1];
    best.secondSeedId = second?.seed?.id || "";
    best.confidence = best.score >= 75 ? "high" : (best.score >= 55 ? "medium" : "low");
    best.subjectCandidateCount = candidates.length;
    best.subjectCandidateMode = subjectPool.mode;
    best.requestedMajor = majorProfile.raw;
    best.requestedMajorCategory = majorProfile.categoryId;
    best.requestedMajorCategoryName = majorProfile.categoryName;
    best.categoryMatchCount = categoryMatchCount;
    best.thinCategoryThreshold = threshold;
    best.fallbackActive = fallbackActive;
    best.fallbackPromptInstruction = fallbackPromptInstruction;
    return best;
  }

  function inferSubjectConcepts(subject, task, fallbackConcept){
    const text = `${subject || ""} ${task?.title || ""} ${task?.description || ""} ${fallbackConcept || ""}`;
    const dictionaries = [
      "조건부확률","베이즈 정리","사건의 독립성","사건의 배반성","확률변수","확률분포","기댓값","표준편차",
      "함수","수열","미분","적분","극한","행렬","벡터","경우의 수",
      "산화·환원","화학 평형","반응 속도","결정 구조","이온 이동","에너지 전환","항상성","효소","유전",
      "힘의 평형","운동량","에너지 보존","전자기 유도","파동","기후 변화","지구 시스템",
      "알고리즘","데이터 처리","조건문","모델링","통계적 추정"
    ];
    const found = dictionaries.filter(term => normalize(text).includes(normalize(term)));
    if(found.length) return found.slice(0,4);
    return fallbackConcept ? [fallbackConcept] : [subject || "교과 개념"];
  }

  function chooseSeedTopic(seed, task){
    if(!seed) return "";
    const modes = task?.reportModes || [];
    const topics = seed.studentTopics || [];
    const deep = topics.find(v => /심화/.test(v?.level || ""))?.title || seed.topic?.deep;
    const expanded = topics.find(v => /확장/.test(v?.level || ""))?.title || seed.topic?.expanded;
    const basic = topics.find(v => /기본/.test(v?.level || ""))?.title || seed.topic?.basic;
    if(modes.some(v => /문제설계|모델링|연구설계/.test(v))) return deep || expanded || basic || seed.label;
    if(modes.some(v => /자료해석|비교|실험/.test(v))) return expanded || deep || basic || seed.label;
    return basic || expanded || deep || seed.label;
  }

  function composeCrossAxisTitle(subjectLabel, conceptList, keywordLabel, task, seed){
    const concepts = (conceptList || []).filter(Boolean).slice(0,3).join("·") || subjectLabel;
    const rawKeyword = String(keywordLabel || "").trim();
    const genericKeyword = /^(발전|에너지|환경|영향|변화|데이터|자료|측정|시스템|기술|과학|사회|문제|구조|성능|탐구)$/;
    const seedTopic = chooseSeedTopic(seed, task);
    const selectedTarget = rawKeyword && !genericKeyword.test(rawKeyword) ? rawKeyword : "";
    const seedTarget = String(seed?.sourceTitle || seedTopic || seed?.label || "")
      .replace(/\s*탐구\s*$/g, "")
      .replace(/\s*보고서\s*$/g, "")
      .replace(/^.*?활용한\s*/g, "")
      .trim();
    const target = selectedTarget || seedTarget || rawKeyword || "탐구 대상";
    if(/화력/.test(target) && /재생에너지|태양광|풍력/.test(target)){
      return "화력발전과 재생에너지 발전의 환경 영향 및 공급 안정성 비교";
    }
    if(/양극재/.test(target) && /이차전지|배터리/.test(target)){
      return "이차전지 양극재의 구조·성능·안정성·경제성 비교";
    }
    const modes = task?.reportModes || [];
    if(modes.some(v => /문제설계|풀이비교/.test(v))){
      if(/경보|진단|판정/.test(target)) return `${target}의 오경보·미탐지 조건 재구성: ${concepts}을 중심으로`;
      return `${target}의 조건 재구성과 풀이 비교: ${concepts}을 중심으로`;
    }
    if(modes.some(v => /실험/.test(v))){
      return `${target}의 조건별 변화를 ${concepts}으로 해석하고 결과의 신뢰도와 한계를 분석`;
    }
    if(modes.some(v => /자료해석|비교/.test(v))){
      return `${target}의 자료·조건 변화를 ${concepts}으로 해석하고 판단 기준을 분석`;
    }
    return `${target}을 ${concepts}으로 설명하고 적용 조건과 개선 방향을 분석`;
  }

  function buildCrossAxis(payload, subjectLabel, keywordLabel, concept){
    if(!crossAxisData) return null;
    const taskMatch = matchTaskRecord(payload, subjectLabel);
    const task = taskMatch?.task || null;
    const seedMatch = matchContentSeed(payload, subjectLabel, task);
    const seed = seedMatch?.seed || null;
    const structureId = task?.structureId || "structure_research_report";
    const structureSections = (crossAxisData.structures || {})[structureId] || [
      "연구 질문","이론적 배경","탐구 방법","분석 결과","결과 해석과 고찰","결론","한계와 후속 탐구","느낀 점","참고자료"
    ];
    const concepts = inferSubjectConcepts(subjectLabel, task, concept);
    const generatedTitle = composeCrossAxisTitle(subjectLabel, concepts, keywordLabel, task, seed);
    const careerTask = /진로|학과|직업|전공/.test(`${task?.title || ""} ${task?.description || ""}`);
    const avoidModes = uniq([
      ...(task?.avoidModes || []),
      ...(seed?.topic?.badPatterns || []),
      ...(seed?.report?.avoid || []),
      ...(seed?.quality?.mustNotDo || []),
      ...(crossAxisData.globalAvoidPatterns || [])
    ]).slice(0,20);
    const topicOptions = uniq([
      generatedTitle,
      seed?.topic?.basic,
      seed?.topic?.expanded,
      seed?.topic?.deep,
      ...(seed?.studentTopics || []).map(v => v?.title)
    ]).filter(Boolean).slice(0,6);

    return {
      version: crossAxisData.version || "assessment-seed-cross-axis-v2.0.0",
      connected: !!(task || seed),
      priorityPolicy: crossAxisData.priorityPolicy || {},
      taskMatch: taskMatch ? {
        score: taskMatch.score,
        reasons: taskMatch.reasons,
        internalSchoolMatched: taskMatch.reasons.includes("학교 내부 일치"),
        record: {
          id: task.id,
          grade: task.grade,
          subject: task.subject,
          subjectGroup: task.subjectGroup,
          title: task.title,
          description: task.description,
          weight: task.weight,
          rawMethods: task.rawMethods || [],
          contentAxis: task.contentAxis || [],
          methodAxis: task.methodAxis || [],
          outputAxis: task.outputAxis || [],
          rubricAxis: task.rubricAxis || [],
          reportModes: task.reportModes || [],
          topicFormula: task.topicFormula,
          structureId,
          avoidModes: task.avoidModes || [],
          isTopicGenerating: task.isTopicGenerating,
          numericConstraints: task.numericConstraints || []
        }
      } : null,
      seedMatch: seedMatch ? {
        seedId: seed.id,
        score: seedMatch.score,
        confidence: seedMatch.confidence,
        subjectScore: seedMatch.subjectScore,
        contentScore: seedMatch.contentScore,
        methodScore: seedMatch.methodScore,
        majorTieBreakScore: seedMatch.majorTieBreakScore,
        majorTier: seedMatch.majorTier,
        majorExactMatch: seedMatch.majorExactMatch,
        majorCategoryMatch: seedMatch.majorCategoryMatch,
        subjectCandidateCount: seedMatch.subjectCandidateCount,
        subjectCandidateMode: seedMatch.subjectCandidateMode,
        requestedMajorCategory: seedMatch.requestedMajorCategory,
        requestedMajorCategoryName: seedMatch.requestedMajorCategoryName,
        categoryMatchCount: seedMatch.categoryMatchCount,
        thinCategoryThreshold: seedMatch.thinCategoryThreshold,
        fallbackActive: seedMatch.fallbackActive,
        fallbackPromptInstruction: seedMatch.fallbackPromptInstruction,
        secondSeedId: seedMatch.secondSeedId,
        seed: {
          id: seed.id,
          category: seed.category,
          label: seed.label,
          sourceTitle: seed.sourceTitle,
          patternType: seed.patternType,
          majorCategories: seed.majorCategories || [],
          axisTriggers: seed.axisTriggers || [],
          topic: seed.topic || {},
          report: seed.report || {},
          quality: seed.quality || {},
          sources: seed.sources || {},
          studentTopics: seed.studentTopics || []
        }
      } : null,
      topic: {
        generatedTitle,
        options: topicOptions,
        subjectConcepts: concepts,
        taskFormula: task?.topicFormula || "",
        seedFormula: seed?.topic?.formula || "",
        objectSource: seed ? "real_seed" : "selected_keyword",
        methodSource: task ? "real_assessment_record" : "aggregated_assessment_route"
      },
      structure: {
        id: structureId,
        sections: structureSections
      },
      constraints: {
        rawTaskDescription: task?.description || "",
        numericConstraints: task?.numericConstraints || [],
        requiredOutputs: task?.outputAxis || [],
        rubricFocus: task?.rubricAxis || [],
        avoidModes
      },
      majorPolicy: {
        selectedCareer: String(payload?.career || payload?.department || payload?.major || ""),
        selectedCategoryId: seedMatch?.requestedMajorCategory || "",
        selectedCategoryName: seedMatch?.requestedMajorCategoryName || "",
        explicitCareerTask: careerTask,
        usedInCoreTopic: careerTask,
        candidatePolicy: "과목 일치 시드를 전량 유지하고 학과 정확일치 > 계열 일치 > 기타 순으로 정렬",
        subjectCandidateCount: seedMatch?.subjectCandidateCount || 0,
        categoryMatchCount: seedMatch?.categoryMatchCount || 0,
        selectedSeedTier: seedMatch?.majorTier || "other",
        exactMajorMatch: !!seedMatch?.majorExactMatch,
        categoryMatch: !!seedMatch?.majorCategoryMatch,
        fallbackActive: !!seedMatch?.fallbackActive,
        thinCategoryThreshold: seedMatch?.thinCategoryThreshold || 10,
        fallbackPromptInstruction: seedMatch?.fallbackPromptInstruction || "",
        tieBreakScore: seedMatch?.majorTieBreakScore || 0,
        maximumWeight: 5,
        allowedUses: careerTask ? ["수행평가가 진로 탐구를 직접 요구하므로 본문 반영"] : ["시드 후보 정렬", "고찰 마지막 확장 1문장", "후속 탐구 후보"],
        forbiddenUses: careerTask ? [] : ["제목", "핵심 탐구 질문", "본론 비교 기준", "핵심 결론", "키워드 자동 대체"]
      },
      sourceBaseline: crossAxisData.sourceBaseline || {}
    };
  }

  function scoreConnection(keywordMatch, subjectMatch, taskRoute, keywordRoute, subjectGroup, inferredRules, crossAxis){
    let score = 15;
    if(keywordMatch === "exact") score += 20;
    else if(keywordMatch === "normalized") score += 18;
    else if(keywordMatch === "partial") score += 12;
    if(subjectMatch === "exact") score += 20;
    else if(subjectMatch === "ui-alias") score += 20;
    else if(subjectMatch === "alias") score += 16;
    if(taskRoute) score += 10;
    if((keywordRoute.recommended_subject_groups || []).includes(subjectGroup)) score += 10;
    if((inferredRules || []).length) score += 5;
    if(crossAxis?.taskMatch) score += 10;
    if(crossAxis?.seedMatch) score += 10;
    // Major never contributes to the core connection score.
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

    const keywordMatch = findKeywordRoute(rawKeyword);
    const subjectMatch = findSubjectRoute(subjectInput);
    const keywordRoute = keywordMatch?.route || buildFallbackKeywordRoute(rawKeyword, subjectGroupInput);
    const subjectRoute = subjectMatch?.route || (bridgeData.subject_group_routes || {})[subjectGroupInput] || null;
    const subjectGroup = subjectRoute?.canonical_subject_group || subjectGroupInput || (keywordRoute.recommended_subject_groups || [])[0] || "";
    const taskRoute = (bridgeData.task_output_routes || {})[taskType] || (bridgeData.task_output_routes || {})["탐구보고서"] || null;
    const taskInterpretation = inferTaskRule(payload);
    const inferredRule = taskInterpretation.rule;
    const inferredMethods = uniq(inferredRule?.method_axis || []);
    const inferredOutputs = uniq(inferredRule?.output_axis || []);
    const inferredModes = uniq(inferredRule?.report_mode || []);
    const inferredSections = uniq(inferredRule?.required_sections || []);

    const keywordLabel = rawKeyword || keywordMatch?.key || "선택 키워드";
    const canonicalSubjectInput = toCanonicalSubject(subjectInput);
    const subjectLabel = subjectMatch?.key || canonicalSubjectInput || subjectGroup || "선택 과목";
    // Seed lookup must use the selected subject's canonical name, not a broader subject-route key.
    const crossAxis = buildCrossAxis({ ...payload, career }, canonicalSubjectInput || subjectLabel, keywordLabel, concept);
    const exactTask = crossAxis?.taskMatch?.record || null;
    const nonReportTask = detectNonReportTask(payload, crossAxis?.taskMatch || null);
    logTaskInterpreterEvent(payload, taskInterpretation, nonReportTask);

    if(nonReportTask.blocked){
      const blockedContext = {
        version:"assessment-keyword-cross-axis-context-v2.3.0",
        connected:true,
        generatedAt:new Date().toISOString(),
        reportTarget:false,
        blocked:true,
        input:{
          subject:subjectInput,
          taskName:payload?.taskName || "",
          taskDescription:payload?.taskDescription || ""
        },
        interpreter:{
          matched:taskInterpretation.matched,
          ruleId:taskInterpretation.rule?.rule_id || "",
          matchCount:taskInterpretation.matchCount,
          matchedTerms:taskInterpretation.matchedTerms,
          fallbackActive:taskInterpretation.fallbackActive,
          fallbackNotice:taskInterpretation.fallbackNotice,
          reportTarget:false,
          blockedReason:nonReportTask.reason,
          blockedTerm:nonReportTask.matchedTerm,
          notice:nonReportTask.notice
        },
        cross_axis:crossAxis,
        student_output:{
          title:"탐구보고서 생성 대상 확인",
          one_line_pick:nonReportTask.notice,
          intro:"실기·참여·경기 수행 자체를 평가하는 과제는 보고서 주제를 억지로 만들지 않습니다.",
          position:"보고서 생성 보류",
          why_this_works:"학교가 요구한 과제 형태를 왜곡하지 않고, 보고서형 안내문이 들어왔을 때만 탐구 구조를 생성합니다.",
          interpreter_notice:nonReportTask.notice,
          admission_points:[],
          differentiation:"",
          record_sentence:"",
          topic_options:[],
          report_flow:[],
          books:[]
        }
      };
      lastContext = blockedContext;
      global.__ASSESSMENT_KEYWORD_LAST_CONTEXT__ = blockedContext;
      global.__ASSESSMENT_SEED_CROSS_AXIS_LAST_CONTEXT__ = crossAxis;
      return blockedContext;
    }

    const specificTaskType = ["실험보고서","자료조사 보고서","발표보고서"].includes(taskType);
    const taskPrimaryMethod = firstValue(taskRoute?.dominant_methods, "");
    const taskPrimaryOutput = firstValue(taskRoute?.dominant_outputs, "");
    const subjectPrimaryMethod = firstValue(subjectRoute?.dominant_methods, "");
    const subjectPrimaryOutput = firstValue(subjectRoute?.dominant_outputs, "");
    const subjectPrimaryMode = firstValue(subjectRoute?.dominant_report_modes, "");
    const recommendedMethod = exactTask?.methodAxis?.[0] || (taskInterpretation.fallbackActive
      ? (subjectPrimaryMethod || taskPrimaryMethod || keywordRoute.preferred_methods?.[0] || "보고서작성형")
      : (specificTaskType
        ? (taskPrimaryMethod || inferredMethods[0] || keywordRoute.preferred_methods?.[0] || "보고서작성형")
        : (inferredMethods[0] || taskPrimaryMethod || keywordRoute.preferred_methods?.[0] || "보고서작성형")));
    const recommendedOutput = exactTask?.outputAxis?.[0] || (taskInterpretation.fallbackActive
      ? (subjectPrimaryOutput || taskPrimaryOutput || keywordRoute.preferred_outputs?.[0] || taskType)
      : (specificTaskType
        ? (taskPrimaryOutput || inferredOutputs[0] || keywordRoute.preferred_outputs?.[0] || taskType)
        : (inferredOutputs[0] || taskPrimaryOutput || keywordRoute.preferred_outputs?.[0] || taskType)));
    const recommendedMode = exactTask?.reportModes?.[0] || (taskInterpretation.fallbackActive
      ? (subjectPrimaryMode || firstValue(taskRoute?.dominant_report_modes, "") || keywordRoute.preferred_report_modes?.[0] || "자료해석형")
      : (inferredModes[0] || firstValue(taskRoute?.dominant_report_modes, "") || keywordRoute.preferred_report_modes?.[0] || "자료해석형"));
    const rubricFocus = uniq([
      ...(exactTask?.rubricAxis || []),
      ...topValues(subjectRoute?.dominant_rubric_tags, 5),
      ...topValues(taskRoute?.dominant_rubric_tags, 5)
    ]).slice(0,8);
    const evidenceTypes = uniq([
      keywordRoute.recommended_evidence,
      ...(crossAxis?.seedMatch?.seed?.sources?.requiredEvidence || []),
      ...topValues(subjectRoute?.dominant_outputs, 3),
      ...topValues(taskRoute?.dominant_outputs, 3)
    ]).slice(0,7);
    const reportSections = crossAxis?.structure?.sections?.length ? crossAxis.structure.sections : (inferredSections.length ? inferredSections : [
      "탐구 질문","교과 개념과 이론적 배경","비교 기준·변인·자료 수집 방법","핵심 결과와 해석","한계·개선·후속 탐구"
    ]);

    const action = taskAction(taskType);
    const topicNoun = keywordRoute.topic_noun || "핵심 개념과 적용";
    const focus = exactTask
      ? `${exactTask.contentAxis?.slice(0,3).join("·") || "교과 개념"}을 ${exactTask.methodAxis?.slice(0,2).join("·") || recommendedMethod} 방식으로 수행하고 ${exactTask.outputAxis?.slice(0,2).join("·") || recommendedOutput}에 근거를 남김`
      : (keywordRoute.assessment_focus || "교과 개념과 실제 자료를 연결");
    const score = scoreConnection(keywordMatch?.match, subjectMatch?.match, taskRoute, keywordRoute, subjectGroup, inferredRule ? [inferredRule] : [], crossAxis);

    const crossTopicOptions = crossAxis?.topic?.options || [];
    const topicOptions = uniq([
      crossAxis?.topic?.generatedTitle,
      ...crossTopicOptions,
      `${subjectLabel} 개념으로 분석한 ${keywordLabel}의 ${topicNoun}: ${action}`,
      `${keywordLabel} 관련 자료에서 나타나는 조건별 차이를 ${concept || subjectLabel} 개념으로 해석`
    ]).filter(Boolean).slice(0,6);

    const recordSentence = `${subjectLabel}의 ${concept || "핵심 개념"}을 바탕으로 ${keywordLabel}을 탐구하고, ${recommendedMethod} 과정에서 자료·조건·결과를 비교하여 ${rubricFocus.slice(0,3).join("·") || "근거 제시와 결과 해석"} 역량을 드러냄.`;

    const context = {
      version: "assessment-keyword-cross-axis-context-v2.3.0",
      connected: true,
      generatedAt: new Date().toISOString(),
      priorityPolicy: crossAxis?.priorityPolicy || {
        assessmentRequirement: 35,
        subjectConcept: 30,
        selectedKeywordAndContentSeed: 20,
        methodAndOutput: 10,
        majorCareerTieBreak: 5
      },
      input: {
        subjectGroup: subjectGroupInput,
        subject: subjectInput,
        canonicalSubject: toCanonicalSubject(subjectInput),
        taskType,
        taskName: payload?.taskName || "",
        taskDescription: payload?.taskDescription || "",
        grade: payload?.grade || "",
        career,
        concept,
        keyword: rawKeyword
      },
      match: {
        keyword: keywordLabel,
        keywordMatchType: keywordMatch?.match || "fallback",
        subject: subjectLabel,
        uiSubject: subjectInput,
        canonicalSubject: toCanonicalSubject(subjectInput),
        subjectMatchType: subjectMatch?.match || "group-fallback",
        subjectGroup,
        inferredRuleIds: inferredRule ? [inferredRule.rule_id] : [],
        exactTaskId: exactTask?.id || "",
        seedId: crossAxis?.seedMatch?.seedId || "",
        connectionScore: score,
        majorScoreIncludedInCore: false
      },
      interpreter: {
        matched: taskInterpretation.matched,
        ruleId: inferredRule?.rule_id || "",
        matchCount: taskInterpretation.matchCount,
        matchedTerms: taskInterpretation.matchedTerms,
        fallbackActive: taskInterpretation.fallbackActive,
        fallbackNotice: taskInterpretation.fallbackNotice,
        reportTarget: true,
        matchingStrategy: "max_match_terms",
        tieBreak: "rules_array_order_first"
      },
      assessment_route: {
        keywordCluster: keywordRoute.primary_cluster,
        keywordClusterLabel: keywordRoute.primary_cluster_label,
        majorGroups: [],
        relatedMajors: [],
        assessmentFocus: focus,
        recommendedMethod,
        recommendedOutput,
        recommendedReportMode: recommendedMode,
        recommendedEvidence: evidenceTypes,
        rubricFocus,
        reportSections,
        avoidModes: crossAxis?.constraints?.avoidModes || uniq([
          ...topValues(subjectRoute?.avoid_modes, 4),
          ...topValues(taskRoute?.avoid_modes, 4)
        ]).slice(0,8)
      },
      cross_axis: crossAxis,
      runtime_evidence: {
        baselineSchoolCount: bridgeData.source_baseline?.school_count || 0,
        baselineRecordCount: bridgeData.source_baseline?.record_count || 0,
        baselineSourceCount: bridgeData.source_baseline?.source_count || 0,
        latestSchool: bridgeData.source_baseline?.latest_school || "",
        subjectEvidenceRecordCount: subjectRoute?.evidence_record_count || 0,
        subjectEvidenceSchoolCount: subjectRoute?.source_school_count || 0,
        taskEvidenceRecordCount: taskRoute?.evidence_record_count || 0,
        taskEvidenceSchoolCount: taskRoute?.source_school_count || 0,
        exactTaskMatched: !!exactTask,
        seedMatched: !!crossAxis?.seedMatch,
        seedCount: crossAxis?.sourceBaseline?.seedCount || 0,
        topicFormulaCount: crossAxis?.sourceBaseline?.topicFormulaCount || 0,
        structureCount: crossAxis?.sourceBaseline?.structureCount || 0,
        schoolNamesExposed: false
      },
      student_output: {
        title: `${subjectLabel} 수행평가 × 보고서 내용 시드 교차 결과`,
        one_line_pick: topicOptions[0],
        intro: `${taskInterpretation.fallbackActive ? taskInterpretation.fallbackNotice + " " : ""}실제 ${subjectLabel} 수행평가의 방법·산출물·제약과 실제 보고서 내용 시드를 교차해 주제를 구성했습니다. 학과 정보는 제목과 핵심 질문을 만들지 않고 과목 후보를 유지한 상태에서 정확일치·계열일치 순 정렬과 후속 탐구에만 제한적으로 사용합니다.`,
        interpreter_notice: taskInterpretation.fallbackActive ? taskInterpretation.fallbackNotice : "",
        position: `${recommendedMode} · ${recommendedMethod} · ${recommendedOutput}`,
        why_this_works: `${focus}. 수행평가 원문 제약과 내용 시드의 교과 적합성을 함께 사용하므로 단순 진로 조사나 개념 나열로 흐르지 않습니다.`,
        admission_points: [
          `${concept || subjectLabel} 개념을 실제 분석 도구로 사용`,
          `${recommendedMethod}에 맞는 비교 기준·변인·자료를 설정`,
          `${rubricFocus.slice(0,3).join("·") || "근거 제시·자료 분석·결과 해석"}이 보이는 과정 기록`,
          `원문에 수량·문항·산출물 제약이 있으면 그대로 준수`
        ],
        differentiation: `같은 키워드라도 실제 수행평가의 structure_id·원문 제약·산출물과 선택 과목에 따라 제목과 본문 구조가 달라집니다.`,
        record_sentence: recordSentence,
        topic_options: topicOptions,
        report_flow: reportSections,
        books: [],
        assessment_basis: {
          connectionScore: score,
          taskMatched: !!exactTask,
          seedMatched: !!crossAxis?.seedMatch,
          taskFormula: crossAxis?.topic?.taskFormula || "",
          seedId: crossAxis?.seedMatch?.seedId || "",
          structureId: crossAxis?.structure?.id || "",
          numericConstraints: crossAxis?.constraints?.numericConstraints || [],
          method: recommendedMethod,
          output: recommendedOutput,
          rubrics: rubricFocus,
          majorPolicy: crossAxis?.majorPolicy || {},
          privacyRule: "학교명은 내부 일치 확인에만 사용하고 학생 결과에는 노출하지 않음"
        }
      }
    };

    lastContext = context;
    global.__ASSESSMENT_KEYWORD_LAST_CONTEXT__ = context;
    global.__ASSESSMENT_SEED_CROSS_AXIS_LAST_CONTEXT__ = crossAxis;
    return context;
  }

  async function resolve(payload){
    await load();
    return buildContext(payload);
  }

  function resolveSync(payload){
    if(!bridgeData || !crossAxisData) return null;
    return buildContext(payload);
  }

  global.AssessmentKeywordBridge = {
    version: "v2.3.0-task-interpreter-max-match",
    ready: load,
    resolve,
    resolveSync,
    getLastContext: () => lastContext,
    getData: () => bridgeData,
    getCrossAxisData: () => crossAxisData,
    toCanonicalSubject,
    inferTaskRule,
    readTaskInterpreterLogs(){
      try{ return JSON.parse(localStorage.getItem(TASK_LOG_STORAGE_KEY) || "[]"); }
      catch(error){ return []; }
    }
  };

  load();
})(window);
