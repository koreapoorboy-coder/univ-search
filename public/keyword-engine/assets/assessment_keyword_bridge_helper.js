window.__ASSESSMENT_KEYWORD_BRIDGE_HELPER_VERSION__ = "v2.9.0-model-h-runtime";

(function(global){
  "use strict";

  const RUNTIME_SELECTION_POLICY = "POLICY_A_BASELINE";
  const DEFAULT_SELECTION_MODEL = "H";
  const LEGACY_SELECTION_MODEL = "LEGACY";

  function normalizeSelectionModel(value){
    return String(value || "").trim().toUpperCase() === LEGACY_SELECTION_MODEL
      ? LEGACY_SELECTION_MODEL
      : DEFAULT_SELECTION_MODEL;
  }

  function runtimeSelectionModel(){
    return normalizeSelectionModel(global.__ASSESSMENT_SELECTION_MODEL__);
  }

  const BRIDGE_URLS = [
    "data/assessment/bridge/assessment_keyword_bridge.v1.json",
    "./data/assessment/bridge/assessment_keyword_bridge.v1.json"
  ];
  const CROSS_AXIS_URLS = [
    "data/assessment/bridge/assessment_seed_cross_axis.v2.json",
    "./data/assessment/bridge/assessment_seed_cross_axis.v2.json"
  ];
  const CONCEPT_MAP_URLS = [
    "seed/textbook-v1/subject_concept_engine_map.json",
    "./seed/textbook-v1/subject_concept_engine_map.json"
  ];
  const CONCEPT_SEGMENT_URLS = [
    "seed/textbook-data/textbook_flattened_segments_v1.json",
    "./seed/textbook-data/textbook_flattened_segments_v1.json"
  ];

  let bridgeData = null;
  let crossAxisData = null;
  let conceptMapData = null;
  let conceptSegmentData = null;
  let conceptDictCache = null;
  let loadPromise = null;
  let lastContext = null;
  let seedVocabularyCache = null;
  const DIAGNOSTIC_TOP_N = 10;
  const DIAGNOSTIC_FULL_ARRAY = false;
  const TASK_FALLBACK_NOTICE = "입력한 과제 유형과 정확히 맞는 규칙이 없어 과목 기본값을 바탕으로 일반형으로 잡았습니다.";
  const NON_REPORT_NOTICE = "이 과제는 실기·수행 중심이라 탐구보고서 형태가 아닙니다.\n보고서형 과제 안내문을 넣어주세요.";
  const NON_REPORT_TERMS = ["연주","실기","랠리","스트로크","체력","참여도","던지기","경기","시합"];
  const TASK_LOG_STORAGE_KEY = "ke.assessmentTaskInterpreterLogs.v1";
  const BOOK_SIGNAL_RE = /독서|도서|책|서평|독후|저자|문헌/;
  const GUIDE_KEYWORD_STOP_TERMS = new Set(["탐구보고서","보고서","수행평가","과제","탐구","분석","자료"]);
  const LEGACY_CONCEPT_TERMS = [
    "조건부확률","베이즈 정리","사건의 독립성","사건의 배반성","확률변수","확률분포","기댓값","표준편차",
    "함수","수열","미분","적분","극한","행렬","벡터","경우의 수",
    "산화·환원","화학 평형","반응 속도","결정 구조","이온 이동","에너지 전환","항상성","효소","유전",
    "힘의 평형","운동량","에너지 보존","전자기 유도","파동","기후 변화","지구 시스템",
    "알고리즘","데이터 처리","조건문","모델링","통계적 추정"
  ];
  const CONCEPT_STOP_TERMS = new Set([
    "분석","탐구","자료","변화","관계","조건","결과","문제","적용","비교","설명","이해","활용",
    "조사","발표","작성","과정","방법","원리","특성","구조","기준","사례","영향","대상","내용",
    "확인","제시","선택","실험","관찰","측정","계산","표현","정리","평가","토론","보고서","그래프","표",
    "전개","전략","근거","설계"
  ]);
  const CONCEPT_FALLBACK_ENABLED = true;
  const CONCEPT_FALLBACK = {
    "융합과학 탐구":["통합과학1","통합과학2","화학","생명과학","물리"],
    "과학과제 연구":["과학탐구실험1","과학탐구실험2"],
    "화학 반응의 세계":["화학"],
    "생물의 유전":["생명과학","세포와 물질대사"],
    "데이터 과학":["정보","확률과 통계"],
    "인공지능 기초":["정보"]
  };
  const STRUCTURE_BY_REPORT_MODE = {
    "연구설계형":"structure_research_design",
    "실험분석형":"structure_experiment_analysis",
    "실험보고서형":"structure_experiment_analysis",
    "변인탐구형":"structure_experiment_analysis",
    "자료해석형":"structure_data_interpretation",
    "데이터해석형":"structure_data_interpretation",
    "모델링형":"structure_modeling_analysis",
    "문제설계형":"structure_problem_design",
    "풀이비교형":"structure_solution_comparison",
    "사회문제분석형":"structure_social_problem_analysis",
    "사회문제탐구형":"structure_social_problem_analysis",
    "정책제안형":"structure_policy_proposal",
    "독서비평형":"structure_reading_criticism",
    "외국어문화탐구형":"structure_reading_criticism",
    "논증형":"structure_argumentation",
    "발표논증형":"structure_argumentation",
    "글쓰기논술형":"structure_argumentation",
    "비평분석형":"structure_argumentation",
    "매체분석형":"structure_media_analysis",
    "프로그래밍구현형":"structure_programming_implementation",
    "창작설계형":"structure_creative_design",
    "산출물제작형":"structure_creative_design",
    "표현발표형":"structure_creative_design",
    "연구보고서형":"structure_research_report",
    "탐구보고서형":"structure_research_report",
    "원리적용형":"structure_principle_application",
    "개념해석형":"structure_concept_interpretation",
    "학습과정관찰형":"structure_practical_reflection"
  };

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
    if(bridgeData && crossAxisData && global.__SUBJECT_CONCEPT_LOAD_SETTLED__) {
      return Promise.resolve({ bridgeData, crossAxisData, conceptMapData, conceptSegmentData });
    }
    if(loadPromise) return loadPromise;

    global.__SUBJECT_CONCEPT_MAP_READY__ = false;
    global.__SUBJECT_CONCEPT_SEGMENTS_READY__ = false;
    global.__SUBJECT_CONCEPT_LOAD_SETTLED__ = false;

    // Concept assets are optional. Their failure must never disable the core bridge/cross-axis runtime.
    const conceptLoad = Promise.all([
      fetchFirst(CONCEPT_MAP_URLS).catch(error => {
        console.warn("subject concept map load failed:", error);
        return null;
      }),
      fetchFirst(CONCEPT_SEGMENT_URLS).catch(error => {
        console.warn("subject concept segments load failed:", error);
        return null;
      })
    ]).then(([map, segments]) => {
      conceptMapData = map && typeof map === "object" ? map : null;
      conceptSegmentData = segments && typeof segments === "object" ? segments : null;
      conceptDictCache = null;
      global.__SUBJECT_CONCEPT_MAP_READY__ = !!conceptMapData;
      global.__SUBJECT_CONCEPT_SEGMENTS_READY__ = !!conceptSegmentData;
      global.__SUBJECT_CONCEPT_LOAD_SETTLED__ = true;
      return { conceptMapData, conceptSegmentData };
    }).catch(error => {
      // Each fetch is already fail-open; this is a final defensive guard.
      console.warn("subject concept auxiliary load failed:", error);
      conceptMapData = null;
      conceptSegmentData = null;
      conceptDictCache = null;
      global.__SUBJECT_CONCEPT_MAP_READY__ = false;
      global.__SUBJECT_CONCEPT_SEGMENTS_READY__ = false;
      global.__SUBJECT_CONCEPT_LOAD_SETTLED__ = true;
      return { conceptMapData: null, conceptSegmentData: null };
    });

    loadPromise = Promise.all([
      fetchFirst(BRIDGE_URLS),
      fetchFirst(CROSS_AXIS_URLS)
    ]).then(async ([bridge, cross]) => {
      bridgeData = bridge || {};
      crossAxisData = cross || {};
      global.__ASSESSMENT_KEYWORD_BRIDGE_DATA_READY__ = true;
      global.__ASSESSMENT_SEED_CROSS_AXIS_READY__ = true;
      await conceptLoad;
      return { bridgeData, crossAxisData, conceptMapData, conceptSegmentData };
    }).catch(async error => {
      console.warn("assessment/seed cross-axis runtime load failed:", error);
      global.__ASSESSMENT_KEYWORD_BRIDGE_DATA_READY__ = false;
      global.__ASSESSMENT_SEED_CROSS_AXIS_READY__ = false;
      await conceptLoad;
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

  function buildSeedVocabulary(seeds){
    const vocab = new Set();
    (seeds || []).forEach(seed => {
      [ ...(seed.axisTriggers || []), ...(seed.writingKeywords || []) ].forEach(term => {
        const text = String(term || "").trim();
        if(text.length >= 2 && !GUIDE_KEYWORD_STOP_TERMS.has(text)) vocab.add(text);
      });
    });
    return Array.from(vocab);
  }

  function containsGuideTerm(text, term){
    if(term.length > 2) return text.includes(term);
    let from = 0;
    while(from < text.length){
      const index = text.indexOf(term, from);
      if(index < 0) return false;
      const before = index > 0 ? text[index - 1] : "";
      if(!before || !/[0-9A-Za-z가-힣]/.test(before)) return true;
      from = index + 1;
    }
    return false;
  }

  function getSeedVocabulary(){
    if(!seedVocabularyCache) seedVocabularyCache = buildSeedVocabulary(crossAxisData?.seeds || []);
    return seedVocabularyCache;
  }

  function extractGuideKeywords(guideText, vocab, limit){
    const text = String(guideText || "");
    if(!text) return [];
    const hits = (vocab || []).filter(term => containsGuideTerm(text, term));
    hits.sort((a, b) => (b.length - a.length) || a.localeCompare(b));
    return uniq(hits).slice(0, limit || 8);
  }

  function readInterpretationOverride(payload){
    const raw = payload?.interpretationOverride || payload?.interpreterOverride || null;
    if(!raw || typeof raw !== "object") return null;
    const reportModes = uniq(raw.reportModes || raw.report_mode || []);
    const methodAxes = uniq(raw.methodAxes || raw.method_axis || []);
    const outputAxes = uniq(raw.outputAxes || raw.output_axis || []);
    const structureId = String(raw.structureId || raw.structure_id || "").trim();
    if(!reportModes.length && !methodAxes.length && !outputAxes.length && !structureId) return null;
    return { reportModes, methodAxes, outputAxes, structureId };
  }

  function structureCatalog(){
    return crossAxisData?.structures || {};
  }

  function chooseStructureId(task, interpretation, payload){
    const override = readInterpretationOverride(payload);
    if(override?.structureId && structureCatalog()[override.structureId]) return override.structureId;
    if(task?.structureId && structureCatalog()[task.structureId]) return task.structureId;
    const modes = interpretation?.rule?.report_mode || [];
    for(const mode of modes){
      const id = STRUCTURE_BY_REPORT_MODE[mode];
      if(id && structureCatalog()[id]) return id;
    }
    return "structure_research_report";
  }

  function hasBookSignal(payload, outputAxes){
    const text = rawTaskText(payload);
    return BOOK_SIGNAL_RE.test(text) || (outputAxes || []).some(value => BOOK_SIGNAL_RE.test(String(value || "")));
  }

  function inferTaskRule(payload){
    const override = readInterpretationOverride(payload);
    if(override){
      const sections = override.structureId ? (structureCatalog()[override.structureId] || []) : [];
      return {
        matched:true,
        rule:{
          rule_id:"student_correction_override",
          match_terms:[],
          report_mode:override.reportModes,
          method_axis:override.methodAxes,
          output_axis:override.outputAxes,
          required_sections:sections
        },
        matchCount:0,
        matchedTerms:[],
        fallbackActive:false,
        fallbackNotice:"",
        overrideActive:true,
        structureId:override.structureId
      };
    }
    const text = rawTaskText(payload);
    const rules = bridgeData?.task_interpreter_rules || [];
    if(!text){
      return { matched:false, rule:null, matchCount:0, matchedTerms:[], fallbackActive:true, fallbackNotice:TASK_FALLBACK_NOTICE, overrideActive:false };
    }
    let best = null;
    rules.forEach((rule, index) => {
      const matchedTerms = (rule.match_terms || []).filter(term => text.includes(String(term || "").toLowerCase()));
      if(!matchedTerms.length) return;
      const candidate = { rule, index, matchCount:matchedTerms.length, matchedTerms };
      if(!best || candidate.matchCount > best.matchCount) best = candidate;
    });
    if(!best){
      return { matched:false, rule:null, matchCount:0, matchedTerms:[], fallbackActive:true, fallbackNotice:TASK_FALLBACK_NOTICE, overrideActive:false };
    }
    return {
      matched:true,
      rule:best.rule,
      matchCount:best.matchCount,
      matchedTerms:best.matchedTerms,
      fallbackActive:false,
      fallbackNotice:"",
      overrideActive:false
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

  function seedContentScoreDetail(seed, payload, task){
    const selectedKeyword = String(payload?.selectedKeyword || payload?.selectedRecommendedKeyword || payload?.keyword || "");
    const keywordSource = String(payload?.keywordSource || "");
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
      seed.topic?.baseTopic,
      seed.topic?.coreQuestion,
      seed.topic?.summary,
      ...(seed.topic?.recommendedTopics || []),
      ...(seed.topic?.inquiryQuestions || []),
      ...(seed.topic?.inquiryFlow || []),
      ...(seed.topic?.keywords || []),
      seed.topic?.choiceGuide,
      seed.topic?.levels?.basic,
      seed.topic?.levels?.intermediate,
      seed.topic?.levels?.advanced,
      seed.report?.importance,
      seed.report?.problem,
      seed.report?.conceptRole,
      seed.report?.corePattern,
      seed.report?.analysisMethod,
      ...(seed.report?.paragraphBlueprint || []),
      ...(seed.report?.titleOptions || []),
      ...(seed.report?.outputGuidance || []),
      ...(seed.report?.quantitativeGuidance || []),
      ...(seed.quality?.mustInclude || []),
      ...(seed.quality?.mustNotDo || []),
      seed.quality?.connectionCheck,
      seed.quality?.evaluatorView,
      seed.quality?.levelGuide,
      seed.quality?.duplicateGuard,
      seed.quality?.qualityTarget,
      ...(seed.quality?.safetyGuards || []),
      ...(seed.quality?.rubricGuidance || [])
    ].filter(Boolean).join(" ");

    const keywordWeight = keywordSource === "derived_from_guide" ? 22 : 30;
    const keywordScore = textOverlapScore(selectedKeyword, seedText, keywordWeight);
    const axisScore = textOverlapScore(selectedAxis, seedText, 8);
    const conceptScore = textOverlapScore(selectedConcept, seedText, 5);
    const taskScore = textOverlapScore(rawTaskText(payload), seedText, 10);
    const keywordTokens = tokenize(selectedKeyword);
    const seedTokens = new Set(tokenize(seedText));
    const directHits = keywordTokens.filter(token => seedTokens.has(token) || Array.from(seedTokens).some(other => token.includes(other) || other.includes(token))).length;
    const directBonus = directHits >= 3 ? 8 : (directHits >= 2 ? 4 : 0);
    const keywordNorm = normalize(selectedKeyword);
    const exactBonus = keywordNorm && normalize(seedText).includes(keywordNorm) ? 8 : 0;
    const seedVocabulary = new Set([ ...(seed.axisTriggers || []), ...(seed.writingKeywords || []) ]);
    const guideVocabularyHits = keywordSource === "derived_from_guide"
      ? uniq(payload?.derivedKeywords || []).filter(term => seedVocabulary.has(term)).length
      : 0;
    const guideVocabularyBonus = Math.min(16, guideVocabularyHits * 4);
    const raw = keywordScore + axisScore + conceptScore + taskScore + directBonus + exactBonus + guideVocabularyBonus;
    return {
      total: Math.min(45, raw),
      raw,
      capped: raw > 45,
      parts: {
        keywordScore,
        axisScore,
        conceptScore,
        taskScore,
        directBonus,
        exactBonus,
        guideVocabularyBonus
      },
      keywordWeight
    };
  }

  function seedContentScore(seed, payload, task){
    return seedContentScoreDetail(seed, payload, task).total;
  }

  function evidenceValues(values){
    return (values || []).flat(Infinity).filter(value => value !== null && value !== undefined && String(value).trim());
  }

  function seedEvidenceFields(seed){
    return {
      core: evidenceValues([
        seed.label,
        seed.sourceTitle,
        seed.axisTriggers,
        seed.writingKeywords,
        seed.topic?.keywords,
        seed.topic?.coreQuestion,
        seed.topic?.baseTopic,
        seed.topic?.summary,
        seed.topic?.recommendedTopics,
        seed.topic?.inquiryQuestions
      ]),
      method: evidenceValues([
        seed.topic?.inquiryFlow,
        seed.topic?.choiceGuide,
        seed.report?.problem,
        seed.report?.conceptRole,
        seed.report?.analysisMethod,
        seed.report?.titleOptions,
        seed.report?.outputGuidance,
        seed.report?.quantitativeGuidance
      ]),
      student: evidenceValues((seed.studentTopics || []).map(row => row?.title || row?.topic || ""))
    };
  }

  function evidenceTokens(value, allowSelectedSingleChar){
    const tokens = uniq(tokenize(value).flatMap(token => {
      const stripped = token.replace(/(?:으로|에서|에게|까지|부터|처럼|보다|로|과|와|을|를|은|는|이|가|의|에|도|만)$/u, "");
      return stripped.length >= 2 && stripped !== token ? [token, stripped] : [token];
    }));
    if(!allowSelectedSingleChar) return tokens;
    const selectedSingles = String(value || "")
      .toLowerCase()
      .split(/[^0-9a-z가-힣]+/)
      .filter(token => /^(몰|힘|열|일)$/.test(token));
    return uniq([...tokens, ...selectedSingles]);
  }

  function createEvidenceDocument(seed){
    const fields = seedEvidenceFields(seed);
    const fieldRows = [];
    const groups = {};
    Object.entries(fields).forEach(([group, values]) => {
      const rows = values.map(value => ({
        value: String(value),
        tokens: evidenceTokens(value, false)
      }));
      fieldRows.push(...rows.map(row => ({ ...row, group })));
      groups[group] = {
        text: values.join(" "),
        tokens: new Set(rows.flatMap(row => row.tokens))
      };
    });
    return {
      seed,
      fields: fieldRows,
      groups,
      tokens: new Set(fieldRows.flatMap(row => row.tokens))
    };
  }

  function createEvidenceContext(candidates){
    const documents = (candidates || []).map(createEvidenceDocument);
    const documentFrequency = new Map();
    documents.forEach(document => {
      document.tokens.forEach(token => documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1));
    });
    const candidateCount = documents.length;
    const idf = token => {
      if(candidateCount <= 1) return 1;
      const value = 1 + Math.log((candidateCount + 1) / ((documentFrequency.get(token) || 0) + 1));
      return Math.min(4, Math.max(1, value));
    };
    return { documents, documentFrequency, candidateCount, idf };
  }

  function sequenceHitCount(input, documentText){
    const tokens = evidenceTokens(input, false);
    if(tokens.length < 2) return 0;
    const docTokens = evidenceTokens(documentText, false);
    const docPairs = new Set(docTokens.slice(0, -1).map((token, index) => `${token}\u0000${docTokens[index + 1]}`));
    const inputPairs = uniq(tokens.slice(0, -1).map((token, index) => `${token}\u0000${tokens[index + 1]}`));
    return inputPairs.filter(pair => docPairs.has(pair)).length;
  }

  function seedContentScoreV3Detail(document, payload, context){
    const selectedKeyword = String(payload?.selectedKeyword || payload?.selectedRecommendedKeyword || payload?.keyword || "");
    const keywordSource = String(payload?.keywordSource || "");
    const derivedKeywords = uniq(payload?.derivedKeywords || []);
    const guide = rawTaskText(payload);
    const selectedConcept = String(payload?.selectedConcept || payload?.concept || "");
    const selectedAxis = String(payload?.selectedFollowupAxis || payload?.followupAxis || "");
    const directKeywordTokens = evidenceTokens(selectedKeyword, false);
    const derivedTokens = evidenceTokens(derivedKeywords.join(" "), false);
    const keywordTokens = keywordSource === "derived_from_guide"
      ? uniq([...directKeywordTokens, ...derivedTokens])
      : directKeywordTokens;
    const guideTokens = evidenceTokens(guide, false);
    const conceptTokens = evidenceTokens(selectedConcept, true);
    const axisTokens = evidenceTokens(selectedAxis, true);
    const allInputTokens = uniq([...keywordTokens, ...guideTokens, ...conceptTokens, ...axisTokens]);
    const matchedTokens = allInputTokens.filter(token => document.tokens.has(token));
    const keywordHits = keywordTokens.filter(token => document.tokens.has(token));
    const guideHits = guideTokens.filter(token => document.tokens.has(token));
    const conceptAxisHits = uniq([...conceptTokens, ...axisTokens]).filter(token => document.tokens.has(token));
    const keywordMultiplier = keywordSource === "derived_from_guide" ? 1.8 : 5;
    const keywordEvidenceScore = Math.min(20, keywordHits.reduce((sum, token) => sum + context.idf(token) * keywordMultiplier, 0));
    const guideContributions = guideHits.map(token => {
      const core = document.groups.core.tokens.has(token) ? 1 : 0;
      const method = document.groups.method.tokens.has(token) ? 0.6 : 0;
      const student = document.groups.student.tokens.has(token) ? 0.9 : 0;
      return context.idf(token) * Math.max(core, method, student);
    }).sort((a, b) => b - a).slice(0, 8);
    const guideEvidenceScore = Math.min(13, guideContributions.reduce((sum, value) => sum + value * 1.2, 0));
    const conceptAxisEvidenceScore = Math.min(6, conceptAxisHits.reduce((sum, token) => sum + context.idf(token) * 1.5, 0));
    const phraseInputs = uniq([selectedKeyword, ...derivedKeywords, guide, selectedConcept, selectedAxis].filter(Boolean));
    const phraseHitCount = Math.min(4, phraseInputs.reduce((sum, input) => {
      const bestGroupHit = Math.max(...Object.values(document.groups).map(group => sequenceHitCount(input, group.text)), 0);
      return sum + Math.min(2, bestGroupHit);
    }, 0));
    const phraseEvidenceScore = Math.min(4, phraseHitCount);
    const matchedGroups = Object.entries(document.groups)
      .filter(([, group]) => matchedTokens.some(token => group.tokens.has(token)))
      .map(([group]) => group);
    const evidenceDiversityBonus = matchedGroups.length >= 3 ? 2 : (matchedGroups.length >= 2 ? 1 : 0);
    const raw = keywordEvidenceScore + guideEvidenceScore + conceptAxisEvidenceScore + phraseEvidenceScore + evidenceDiversityBonus;
    const matchedFields = document.fields.filter(field => matchedTokens.some(token => field.tokens.includes(token)));
    const rareEvidenceScore = matchedTokens.reduce((sum, token) => sum + Math.max(0, context.idf(token) - 1), 0);
    return {
      total: Math.min(45, Math.round(raw * 100) / 100),
      raw: Math.round(raw * 100) / 100,
      capped: raw > 45,
      evidenceHitCount: matchedTokens.length,
      evidenceFieldCount: matchedFields.length,
      rareEvidenceScore: Math.round(rareEvidenceScore * 100) / 100,
      phraseEvidenceScore,
      guideEvidenceScore: Math.round(guideEvidenceScore * 100) / 100,
      keywordEvidenceScore: Math.round(keywordEvidenceScore * 100) / 100,
      conceptAxisEvidenceScore: Math.round(conceptAxisEvidenceScore * 100) / 100,
      evidenceDiversityBonus,
      matchedTokens: matchedTokens.slice(0, 12),
      matchedGroups,
      parts: {
        keywordEvidenceScore: Math.round(keywordEvidenceScore * 100) / 100,
        guideEvidenceScore: Math.round(guideEvidenceScore * 100) / 100,
        conceptAxisEvidenceScore: Math.round(conceptAxisEvidenceScore * 100) / 100,
        phraseEvidenceScore,
        evidenceDiversityBonus
      }
    };
  }

  function methodScoreDetail(matchedTask){
    if(!matchedTask) return { score: 0, reason: "no_task_match", modeCount: 0 };
    const modes = matchedTask.reportModes || [];
    if(!modes.length) return { score: 0, reason: "task_without_report_modes", modeCount: 0 };
    return { score: 5, reason: "matched", modeCount: modes.length };
  }

  function resolveDecisionStage(a, b){
    if(!b) return "single_candidate";
    if(a.majorRank !== b.majorRank) return "majorRank";
    if(a.coreScore !== b.coreScore) return "coreScore";
    if(a.contentScore !== b.contentScore) return "contentScore";
    return "seedId_alphabetical";
  }

  function resolveDecisionStageV3(a, b){
    if(!b) return "single_candidate";
    if(a.rankingScore !== b.rankingScore) return "rankingScore";
    if(a.contentScoreV3 !== b.contentScoreV3) return "contentScoreV3";
    if(a.evidenceHitCount !== b.evidenceHitCount) return "evidenceHitCount";
    if(a.rareEvidenceScore !== b.rareEvidenceScore) return "rareEvidenceScore";
    if(a.phraseEvidenceScore !== b.phraseEvidenceScore) return "phraseEvidenceScore";
    if(a.guideEvidenceScore !== b.guideEvidenceScore) return "guideEvidenceScore";
    if(a.evidenceFieldCount !== b.evidenceFieldCount) return "evidenceFieldCount";
    return "seedId_alphabetical";
  }

  function countTiedWithTop(ranked){
    const a = ranked[0];
    if(!a) return 0;
    return ranked.filter(v =>
      v.majorRank === a.majorRank &&
      v.coreScore === a.coreScore &&
      v.contentScore === a.contentScore
    ).length;
  }

  function diagnosticCandidate(row, index){
    return {
      rank: index + 1,
      seedId: row.seed?.id || "",
      label: row.seed?.label || "",
      score: row.score,
      coreScore: row.coreScore,
      subjectScore: row.subjectScore,
      contentScore: row.contentScore,
      rankingScore: row.rankingScore,
      contentScoreV3: row.contentScoreV3,
      legacyContentScore: row.legacyContentScore,
      effectiveMajorBonus: row.effectiveMajorBonus,
      evidenceHitCount: row.evidenceHitCount,
      evidenceFieldCount: row.evidenceFieldCount,
      rareEvidenceScore: row.rareEvidenceScore,
      phraseEvidenceScore: row.phraseEvidenceScore,
      guideEvidenceScore: row.guideEvidenceScore,
      keywordEvidenceScore: row.keywordEvidenceScore,
      conceptAxisEvidenceScore: row.conceptAxisEvidenceScore,
      matchedEvidenceTokens: row.contentDetailV3.matchedTokens,
      matchedEvidenceGroups: row.contentDetailV3.matchedGroups,
      contentRaw: row.contentDetail.raw,
      contentCapped: row.contentDetail.capped,
      contentParts: { ...row.contentDetail.parts },
      methodScore: row.methodScore,
      methodReason: row.methodDetail.reason,
      majorTieBreakScore: row.majorTieBreakScore,
      majorTier: row.majorTier,
      majorRank: row.majorRank,
      majorExactMatch: row.majorExactMatch,
      majorCategoryMatch: row.majorCategoryMatch
    };
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

  function createModelHMajorContext(candidates, majorProfile){
    const rows = (candidates || []).map(seed => {
      const normalizedMajors = seed.majorNormalizedKeys || (seed.majors || []).map(normalizeMajor).filter(Boolean);
      const exactByRawKey = !!majorProfile.key && normalizedMajors.includes(majorProfile.key);
      const exactByCanonical = intersectAny(seed.majorCanonicalIds || [], majorProfile.canonicalIds || []);
      const exactMatch = exactByRawKey || exactByCanonical;
      const categoryMatch = !!majorProfile.categoryId && (seed.majorCategories || []).includes(majorProfile.categoryId);
      return { seed, exactMatch, categoryMatch };
    });
    const total = rows.length;
    const categoryHolders = rows.filter(row => row.categoryMatch).length;
    const exactHolders = rows.filter(row => row.exactMatch).length;
    const exactWithinCategory = rows.filter(row => row.exactMatch && row.categoryMatch).length;
    const categoryCoverage = total ? categoryHolders / total : 0;
    const exactCoverage = total ? exactHolders / total : 0;
    const exactWithinCategoryCoverage = categoryHolders
      ? exactWithinCategory / categoryHolders
      : (total ? exactHolders / total : 0);
    return {
      rows: new Map(rows.map(row => [row.seed, row])),
      categoryCoverage,
      exactCoverage,
      exactWithinCategoryCoverage
    };
  }

  function modelHMajorBonus(seed, context){
    const row = context.rows.get(seed) || { exactMatch:false, categoryMatch:false };
    const categoryComponent = row.categoryMatch ? 3 * (1 - context.categoryCoverage) : 0;
    const exactComponent = row.exactMatch ? 2 * (1 - context.exactWithinCategoryCoverage) : 0;
    return {
      score: Math.min(5, categoryComponent + exactComponent),
      categoryComponent,
      exactComponent,
      categoryCoverage: context.categoryCoverage,
      exactCoverage: context.exactCoverage,
      exactWithinCategoryCoverage: context.exactWithinCategoryCoverage
    };
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
    const evidenceContext = createEvidenceContext(candidates);
    const evidenceDocumentBySeed = new Map(evidenceContext.documents.map(document => [document.seed, document]));
    const modelHMajorContext = createModelHMajorContext(candidates, majorProfile);
    const selectionModel = runtimeSelectionModel();

    const scored = candidates.map(seed => {
      const subjectScore = seedSubjectScore(seed, subjectInput);
      const legacyContentDetail = seedContentScoreDetail(seed, payload, matchedTask);
      const contentDetailV3 = seedContentScoreV3Detail(evidenceDocumentBySeed.get(seed), payload, evidenceContext);
      const contentScoreV3 = contentDetailV3.total;
      const contentScore = contentScoreV3;
      const methodDetail = methodScoreDetail(matchedTask);
      const methodScore = methodDetail.score;
      const coreScore = subjectScore + contentScore + methodScore;
      const major = seedMajorMatchInfo(seed, majorProfile, fallbackActive);
      const modelHMajor = modelHMajorBonus(seed, modelHMajorContext);
      const legacyMajorBonus = major.exactMatch ? 5 : (major.categoryMatch ? 3 : 0);
      const effectiveMajorBonus = selectionModel === LEGACY_SELECTION_MODEL
        ? legacyMajorBonus
        : modelHMajor.score;
      return {
        seed,
        score: Math.min(100, coreScore + effectiveMajorBonus),
        coreScore,
        subjectScore,
        contentScore,
        contentScoreV3,
        legacyContentScore: legacyContentDetail.total,
        contentDetail: contentDetailV3,
        contentDetailV3,
        legacyContentDetail,
        methodScore,
        methodDetail,
        rankingScore: contentScoreV3 + effectiveMajorBonus,
        effectiveMajorBonus,
        legacyMajorBonus,
        modelHMajorBonus: modelHMajor.score,
        modelHCategoryComponent: modelHMajor.categoryComponent,
        modelHExactComponent: modelHMajor.exactComponent,
        categoryCoverage: modelHMajor.categoryCoverage,
        exactCoverage: modelHMajor.exactCoverage,
        exactWithinCategoryCoverage: modelHMajor.exactWithinCategoryCoverage,
        evidenceHitCount: contentDetailV3.evidenceHitCount,
        evidenceFieldCount: contentDetailV3.evidenceFieldCount,
        rareEvidenceScore: contentDetailV3.rareEvidenceScore,
        phraseEvidenceScore: contentDetailV3.phraseEvidenceScore,
        guideEvidenceScore: contentDetailV3.guideEvidenceScore,
        keywordEvidenceScore: contentDetailV3.keywordEvidenceScore,
        conceptAxisEvidenceScore: contentDetailV3.conceptAxisEvidenceScore,
        majorTieBreakScore: effectiveMajorBonus,
        majorTier: major.tier,
        majorRank: major.rank,
        majorExactMatch: major.exactMatch,
        majorCategoryMatch: major.categoryMatch
      };
    });
    const modelHRanked = [...scored].sort((a, b) => {
      const aRankingScore = a.contentScoreV3 + a.modelHMajorBonus;
      const bRankingScore = b.contentScoreV3 + b.modelHMajorBonus;
      if(bRankingScore !== aRankingScore) return bRankingScore - aRankingScore;
      if(b.contentScoreV3 !== a.contentScoreV3) return b.contentScoreV3 - a.contentScoreV3;
      if(b.evidenceHitCount !== a.evidenceHitCount) return b.evidenceHitCount - a.evidenceHitCount;
      if(b.rareEvidenceScore !== a.rareEvidenceScore) return b.rareEvidenceScore - a.rareEvidenceScore;
      if(b.phraseEvidenceScore !== a.phraseEvidenceScore) return b.phraseEvidenceScore - a.phraseEvidenceScore;
      if(b.guideEvidenceScore !== a.guideEvidenceScore) return b.guideEvidenceScore - a.guideEvidenceScore;
      if(b.evidenceFieldCount !== a.evidenceFieldCount) return b.evidenceFieldCount - a.evidenceFieldCount;
      return String(a.seed?.id || "").localeCompare(String(b.seed?.id || ""));
    });
    const legacyRanked = [...scored].sort((a, b) => {
      const aRankingScore = a.contentScoreV3 + a.legacyMajorBonus;
      const bRankingScore = b.contentScoreV3 + b.legacyMajorBonus;
      if(bRankingScore !== aRankingScore) return bRankingScore - aRankingScore;
      if(b.contentScoreV3 !== a.contentScoreV3) return b.contentScoreV3 - a.contentScoreV3;
      if(b.evidenceHitCount !== a.evidenceHitCount) return b.evidenceHitCount - a.evidenceHitCount;
      if(b.rareEvidenceScore !== a.rareEvidenceScore) return b.rareEvidenceScore - a.rareEvidenceScore;
      if(b.phraseEvidenceScore !== a.phraseEvidenceScore) return b.phraseEvidenceScore - a.phraseEvidenceScore;
      if(b.guideEvidenceScore !== a.guideEvidenceScore) return b.guideEvidenceScore - a.guideEvidenceScore;
      if(b.evidenceFieldCount !== a.evidenceFieldCount) return b.evidenceFieldCount - a.evidenceFieldCount;
      return String(a.seed?.id || "").localeCompare(String(b.seed?.id || ""));
    });
    const ranked = selectionModel === LEGACY_SELECTION_MODEL ? legacyRanked : modelHRanked;
    ranked.forEach(row => {
      row.effectiveMajorBonus = selectionModel === LEGACY_SELECTION_MODEL
        ? row.legacyMajorBonus : row.modelHMajorBonus;
      row.rankingScore = row.contentScoreV3 + row.effectiveMajorBonus;
      row.majorTieBreakScore = row.effectiveMajorBonus;
      row.score = Math.min(100, row.coreScore + row.effectiveMajorBonus);
    });
    /*
     * Model H and Legacy intentionally share the same fixed Policy A candidate
     * pool and content evidence. Only the major bonus and resulting order differ.
     */
    const selectedRanked = ranked;

    const best = selectedRanked[0];
    const second = selectedRanked[1];
    const legacyBest = legacyRanked[0];
    const modelHBest = modelHRanked[0];
    const fullArrayEnabled = DIAGNOSTIC_FULL_ARRAY || global.__SCORE_DIAGNOSTIC_FULL__ === true;
    const diagnosticRows = fullArrayEnabled ? ranked : ranked.slice(0, DIAGNOSTIC_TOP_N);
    const topScore = best?.score ?? 0;
    const secondScore = second?.score ?? null;
    const signedScoreGap = second ? topScore - secondScore : null;
    best.scoreDiagnostics = {
      version: "patch3-score-rework-v1",
      runtimeSelectionPolicy: RUNTIME_SELECTION_POLICY,
      runtimeSelectionModel: selectionModel,
      fallbackSelectionModel: LEGACY_SELECTION_MODEL,
      modelHSeedId: modelHBest?.seed?.id || "",
      candidateCount: candidates.length,
      candidateMode: subjectPool.mode,
      decisionStage: resolveDecisionStage(best, second),
      decisionStageV3: resolveDecisionStageV3(best, second),
      legacySeedId: legacyBest?.seed?.id || "",
      seedChangedFromPatch2: (legacyBest?.seed?.id || "") !== (best?.seed?.id || ""),
      irreducibleTie: resolveDecisionStageV3(best, second) === "seedId_alphabetical",
      tiedWithTopCount: countTiedWithTop(ranked),
      topScore,
      secondScore,
      scoreGap: second ? Math.abs(signedScoreGap) : null,
      signedScoreGap,
      subjectScoreConstant: new Set(ranked.map(v => v.subjectScore)).size <= 1,
      methodScoreConstant: new Set(ranked.map(v => v.methodScore)).size <= 1,
      contentCapHitCount: ranked.filter(v => v.contentScore >= 45).length,
      contentTruncationCount: ranked.filter(v => v.contentDetail.capped).length,
      keywordWeight: best?.contentDetail?.keywordWeight || 0,
      methodScoreReason: best?.methodDetail?.reason || "no_task_match",
      methodScoreModeCount: best?.methodDetail?.modeCount || 0,
      majorFallbackActive: fallbackActive,
      fullArrayEnabled,
      returnedCandidateCount: diagnosticRows.length,
      topCandidates: diagnosticRows.map(diagnosticCandidate)
    };
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
    best.keywordSource = String(payload?.keywordSource || "");
    best.selectedKeyword = String(payload?.selectedKeyword || payload?.selectedRecommendedKeyword || payload?.keyword || "");
    return best;
  }

  const KOREAN_PARTICLE_CHARS = "을를이가은는의로와과에서도만나수";
  const SINGLE_CHAR_CONTEXT_PATTERNS = {
    "항": /(?:다항식|계수|상수항|일차항|이차항|항의|항을|항끼리)/,
    "힘": /(?:힘의\s*평형|힘과\s*운동|힘이\s*작용|힘을\s*받|알짜힘|마찰력|중력|탄성력)/,
    "산": /(?:산과\s*염기|산·염기|산의\s*세기|산성|산을\s*넣|산이\s*해리)/,
    "밑": /(?:로그의\s*밑|밑이|밑을|밑의|공통로그)/,
    "합": /(?:수열의\s*합|합의\s*공식|합을\s*구|부분합|시그마)/,
    "각": /(?:각의\s*크기|각도|끼인각|두\s*벡터가\s*이루는\s*각|방향각)/,
    "일": /(?:일과\s*에너지|일의\s*양|일을\s*한|일률|역학적\s*일|힘.{0,12}거리)/,
    "몰": /(?:몰\s*농도|몰수비|몰\s*질량|몰의\s*수|몰을|몰이|몰당|한계\s*반응물)/,
    "족": /(?:원소의\s*족|같은\s*족|족의\s*성질|주기율표.{0,12}족)/
  };

  function normalizeTextParts(parts){
    return (parts || [])
      .map(value => normalize(value))
      .filter(Boolean)
      .join("|");
  }

  function countSingleCharHits(rawText, term){
    const ch = String(term || "").trim();
    if(ch.length !== 1) return 0;
    const text = String(rawText || "");
    const escaped = ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(^|[^가-힣])${escaped}(?=$|[^가-힣]|[${KOREAN_PARTICLE_CHARS}])`,
      "g"
    );
    const matched = text.match(re);
    if(!matched) return 0;
    const contextPattern = SINGLE_CHAR_CONTEXT_PATTERNS[ch];
    if(!contextPattern) return matched.length;
    return contextPattern.test(text) ? matched.length : 0;
  }

  function subjectNameForms(subjectLabel){
    const raw = String(subjectLabel || "").trim();
    const forms = new Set();
    const push = value => {
      const n = normalize(value);
      if(n.length >= 2) forms.add(n);
    };
    push(raw);
    push(toCanonicalSubject(raw));
    push(raw.replace(/[0-9Ⅰ-Ⅲ]+$/g, ""));
    push(toCanonicalSubject(raw).replace(/[0-9Ⅰ-Ⅲ]+$/g, ""));
    return [...forms].sort((a, b) => b.length - a.length);
  }

  function escapeRegex(value){
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function rawTermPattern(value){
    const tokens = String(value || "").trim().split(/[^0-9A-Za-z가-힣]+/).filter(Boolean);
    if(!tokens.length) return "";
    return tokens.map(escapeRegex).join("[\\s·,._\\-/()]*");
  }

  function findRawRanges(rawText, value){
    const pattern = rawTermPattern(value);
    if(!pattern) return [];
    const re = new RegExp(pattern, "gi");
    const ranges = [];
    let match;
    while((match = re.exec(String(rawText || ""))) !== null){
      ranges.push([match.index, match.index + match[0].length]);
      if(!match[0].length) re.lastIndex += 1;
    }
    return ranges;
  }

  function subjectNameSurfaceForms(subjectLabel){
    const raw = String(subjectLabel || "").trim();
    const canonical = toCanonicalSubject(raw);
    return uniq([
      raw,
      canonical,
      raw.replace(/[0-9Ⅰ-Ⅲ]+$/g, ""),
      canonical.replace(/[0-9Ⅰ-Ⅲ]+$/g, "")
    ]).filter(value => normalize(value).length >= 2);
  }

  function blockedRawNameRanges(rawText, forms){
    return (forms || []).flatMap(form => findRawRanges(rawText, form));
  }

  function countRawConceptHits(rawText, rawTerm, ranges){
    const term = String(rawTerm || "").trim();
    if(normalize(term).length < 2) return 0;
    let hits = 0;
    for(const [start, end] of findRawRanges(rawText, term)){
      const insideName = ranges.some(([nameStart, nameEnd]) => start >= nameStart && end <= nameEnd);
      if(!insideName) hits += 1;
    }
    return hits;
  }


  function blockedNameRanges(normText, forms){
    const ranges = [];
    for(const form of forms){
      let from = 0;
      while(from <= normText.length){
        const at = normText.indexOf(form, from);
        if(at < 0) break;
        ranges.push([at, at + form.length]);
        from = at + 1;
      }
    }
    return ranges;
  }

  function countConceptHits(normText, normTerm, ranges){
    if(!normTerm || normTerm.length < 2) return 0;
    let from = 0;
    let hits = 0;
    while(from <= normText.length){
      const at = normText.indexOf(normTerm, from);
      if(at < 0) break;
      const end = at + normTerm.length;
      const insideName = ranges.some(([start, stop]) => at >= start && end <= stop);
      if(!insideName) hits += 1;
      from = at + 1;
    }
    return hits;
  }

  function conceptOverlaps(list, candidate){
    const n = normalize(candidate);
    if(!n) return true;
    return list.some(current => {
      const c = normalize(current);
      return c === n || c.includes(n) || n.includes(c);
    });
  }

  function conceptDisplayLabel(value){
    const text = String(value || "").trim();
    if(!text.includes(",")) return text;
    return text.split(",")[0].trim() || text;
  }

  function keepConceptTerm(term, source){
    const raw = String(term || "").trim();
    const n = normalize(raw);
    if(!n) return false;
    if(n.length < 2 && !(raw.length === 1 && (source === "concept_name" || source === "core_concept"))) return false;
    if(CONCEPT_STOP_TERMS.has(raw)) return false;
    for(const stop of CONCEPT_STOP_TERMS){
      if(normalize(stop) === n) return false;
    }
    return true;
  }

  function createConceptRow(){
    return {
      parents:new Map(),
      terms:new Map(),
      entries:[]
    };
  }

  function addConceptTerm(map, subject, term, parent, source){
    const sub = String(subject || "").trim();
    const raw = String(term || "").trim();
    const n = normalize(raw);
    if(!sub || !keepConceptTerm(raw, source) || !n) return;
    const row = map[sub] || (map[sub] = createConceptRow());
    const current = row.terms.get(n);
    // Prefer the longer, more descriptive surface form for equivalent normalized terms.
    if(!current || raw.length > current.term.length){
      row.terms.set(n, {
        term:raw,
        normalized:n,
        source:source || "textbook_dictionary",
        single:n.length === 1,
        direct:true,
        fallbackSources:[]
      });
    }
    if(parent && !row.parents.has(n)) row.parents.set(n, String(parent).trim());
  }

  function mergeConceptRows(target, source, sourceSubject){
    if(!target || !source) return;
    source.terms.forEach((entry, n) => {
      const current = target.terms.get(n);
      const fallbackSources = uniq([
        ...(current?.fallbackSources || []),
        ...(entry?.fallbackSources || []),
        sourceSubject
      ]);
      if(!current){
        target.terms.set(n, {
          ...entry,
          direct:false,
          fallbackSources
        });
      }else{
        target.terms.set(n, {
          ...current,
          direct:current.direct !== false,
          fallbackSources
        });
      }
    });
    source.parents.forEach((parent, n) => {
      if(!target.parents.has(n)) target.parents.set(n, parent);
    });
  }

  function finalizeConceptRow(row){
    if(!row) return row;
    row.entries = Array.from(row.terms.values())
      .filter(entry => entry && entry.normalized)
      .sort((a, b) => (b.normalized.length - a.normalized.length) || a.term.localeCompare(b.term));
    return row;
  }

  function buildConceptDictionary(){
    const map = {};

    Object.keys(conceptMapData || {}).forEach(subject => {
      const concepts = conceptMapData?.[subject]?.concepts || {};
      Object.keys(concepts).forEach(conceptName => {
        const concept = concepts[conceptName] || {};
        addConceptTerm(map, subject, conceptName, conceptName, "concept_name");
        (concept.core_concepts || []).forEach(term => addConceptTerm(map, subject, term, conceptName, "core_concept"));
        (concept.micro_keywords || []).forEach(term => addConceptTerm(map, subject, term, conceptName, "micro_keyword"));
      });
    });

    ((conceptSegmentData || {}).segments || []).forEach(segment => {
      const subject = String(segment?.subject_name || "").trim();
      const parent = segment?.chapter_title || segment?.segment_title || segment?.unit_title || "";
      ["concept_tags","problem_tags"].forEach(key => {
        (segment?.[key] || []).forEach(term => addConceptTerm(map, subject, term, parent, key));
      });
      ((segment?.mini_subject_context || {}).report_seed_keywords || []).forEach(term => {
        addConceptTerm(map, subject, term, parent, "report_seed_keyword");
      });
    });

    if(CONCEPT_FALLBACK_ENABLED){
      Object.keys(CONCEPT_FALLBACK).forEach(subject => {
        const row = map[subject] || (map[subject] = createConceptRow());
        CONCEPT_FALLBACK[subject].forEach(sourceSubject => mergeConceptRows(row, map[sourceSubject], sourceSubject));
      });
    }

    Object.keys(map).forEach(subject => finalizeConceptRow(map[subject]));
    return map;
  }

  function getConceptDictionary(rawSubject){
    if(!conceptDictCache) conceptDictCache = buildConceptDictionary();
    const subject = String(rawSubject || "").trim();
    return conceptDictCache[subject] || null;
  }

  function inferSubjectConcepts(subject, task, fallbackConcept, payload){
    const guideRawParts = [
      effectiveTaskName(payload),
      payload?.taskDescription,
      payload?.assessmentDescription,
      payload?.selectedConcept,
      ...(payload?.derivedKeywords || [])
    ].filter(Boolean);
    const recordRawParts = [
      task?.title,
      task?.description,
      ...(task?.rubricAxis || [])
    ].filter(Boolean);
    const rawGuideText = guideRawParts.join("␞");
    const rawRecordText = recordRawParts.join("␞");
    const rawMatchText = [...guideRawParts, ...recordRawParts].join("␞");
    const dict = getConceptDictionary(subject);
    const nameForms = subjectNameSurfaceForms(subject);
    const nameRanges = blockedRawNameRanges(rawMatchText, nameForms);
    const guideNameRanges = blockedRawNameRanges(rawGuideText, nameForms);
    const recordNameRanges = blockedRawNameRanges(rawRecordText, nameForms);

    const legacyEvidence = new Map();
    const legacyMatches = LEGACY_CONCEPT_TERMS.filter(term => {
      const n = normalize(term);
      const totalHits = countRawConceptHits(rawMatchText, term, nameRanges);
      if(totalHits <= 0) return false;
      legacyEvidence.set(n, {
        guideHits:countRawConceptHits(rawGuideText, term, guideNameRanges),
        recordHits:countRawConceptHits(rawRecordText, term, recordNameRanges)
      });
      return true;
    });

    if(dict && rawMatchText){
      const hits = [];
      for(const entry of dict.entries || []){
        const totalHits = entry.single
          ? countSingleCharHits(rawMatchText, entry.term)
          : countRawConceptHits(rawMatchText, entry.term, nameRanges);
        if(totalHits <= 0) continue;
        const guideHits = entry.single
          ? countSingleCharHits(rawGuideText, entry.term)
          : countRawConceptHits(rawGuideText, entry.term, guideNameRanges);
        const recordHits = entry.single
          ? countSingleCharHits(rawRecordText, entry.term)
          : countRawConceptHits(rawRecordText, entry.term, recordNameRanges);
        hits.push({ ...entry, guideHits, recordHits });
      }
      if(hits.length){
        const uniqueHits = [];
        const seen = new Set();
        hits.forEach(entry => {
          if(seen.has(entry.normalized)) return;
          seen.add(entry.normalized);
          uniqueHits.push(entry);
        });
        const matchedTerms = uniqueHits.map(entry => entry.term);
        const parentStats = new Map();
        uniqueHits.forEach(entry => {
          const parent = dict.parents.get(entry.normalized);
          if(!parent) return;
          const stat = parentStats.get(parent) || { count:0, specificity:0, strong:false };
          stat.count += 1;
          stat.specificity += entry.normalized.length;
          if(entry.source === "concept_name" || entry.source === "core_concept") stat.strong = true;
          parentStats.set(parent, stat);
        });
        const parentConcepts = Array.from(parentStats.entries())
          .sort((a, b) => (b[1].count - a[1].count) || (Number(b[1].strong) - Number(a[1].strong)) || (b[1].specificity - a[1].specificity) || a[0].localeCompare(b[0]))
          .map(([parent]) => parent);
        const firstParent = parentConcepts[0] || "";
        const firstParentStat = firstParent ? parentStats.get(firstParent) : null;
        // A single broad micro/skill tag must not drag an unrelated chapter title into the student-facing topic.
        const primaryParent = firstParentStat && (firstParentStat.count >= 2 || firstParentStat.strong) ? firstParent : "";
        const displayTerms = [];
        uniqueHits.forEach(entry => {
          if(displayTerms.length >= 2) return;
          const parent = dict.parents.get(entry.normalized) || "";
          if(primaryParent && parent && parent !== primaryParent) return;
          if(conceptOverlaps(displayTerms, entry.term)) return;
          if(primaryParent && normalize(primaryParent).includes(entry.normalized)) return;
          displayTerms.push(conceptDisplayLabel(entry.term));
        });
        legacyMatches.forEach(term => {
          if(displayTerms.length >= 3) return;
          if(conceptOverlaps(displayTerms, term)) return;
          displayTerms.push(conceptDisplayLabel(term));
        });
        const parentLabel = conceptDisplayLabel(primaryParent || matchedTerms[0] || "");
        const displayList = [...displayTerms];
        if(parentLabel && !conceptOverlaps(displayList, parentLabel)){
          displayList.push(parentLabel);
        }
        const finalList = displayList.slice(0, 4);
        const allMatchedTerms = uniq([...matchedTerms, ...legacyMatches]);
        const guideEvidence = uniqueHits.some(entry => entry.guideHits > 0) || legacyMatches.some(term => (legacyEvidence.get(normalize(term))?.guideHits || 0) > 0);
        const recordEvidence = uniqueHits.some(entry => entry.recordHits > 0) || legacyMatches.some(term => (legacyEvidence.get(normalize(term))?.recordHits || 0) > 0);
        const fallbackSourceSubjects = uniq(uniqueHits.flatMap(entry => entry.fallbackSources || []));
        const fallbackHitCount = uniqueHits.filter(entry => (entry.fallbackSources || []).length > 0 && entry.direct === false).length;
        const fallbackOnlyVerdict = uniqueHits.length > 0 && fallbackHitCount === uniqueHits.length && legacyMatches.length === 0;
        return {
          list:finalList,
          detail:{
            conceptName:primaryParent,
            conceptDisplayName:parentLabel,
            matchedTerms:allMatchedTerms.slice(0,8),
            parentConcepts:parentConcepts.slice(0,3),
            termCount:allMatchedTerms.length,
            source:legacyMatches.length ? "textbook_plus_legacy" : "textbook_concept_dictionary",
            confidence:allMatchedTerms.length >= 3 ? "high" : "medium",
            evidenceScope:guideEvidence && recordEvidence ? "both" : (guideEvidence ? "guide" : (recordEvidence ? "record" : "none")),
            fallbackMergeEnabled:CONCEPT_FALLBACK_ENABLED,
            fallbackDerived:fallbackOnlyVerdict,
            fallbackHitCount,
            fallbackSourceSubjects
          }
        };
      }
    }

    if(legacyMatches.length){
      const guideEvidence = legacyMatches.some(term => (legacyEvidence.get(normalize(term))?.guideHits || 0) > 0);
      const recordEvidence = legacyMatches.some(term => (legacyEvidence.get(normalize(term))?.recordHits || 0) > 0);
      return {
        list:legacyMatches.slice(0,4).map(conceptDisplayLabel),
        detail:{
          conceptName:"",
          conceptDisplayName:"",
          matchedTerms:legacyMatches.slice(0,8),
          parentConcepts:[],
          termCount:legacyMatches.length,
          source:"legacy_dictionary",
          confidence:"medium",
          evidenceScope:guideEvidence && recordEvidence ? "both" : (guideEvidence ? "guide" : (recordEvidence ? "record" : "none")),
          fallbackMergeEnabled:CONCEPT_FALLBACK_ENABLED,
          fallbackDerived:false,
          fallbackHitCount:0,
          fallbackSourceSubjects:[]
        }
      };
    }

    return {
      list:fallbackConcept ? [fallbackConcept] : [subject || "교과 개념"],
      detail:{
        conceptName:"",
        conceptDisplayName:"",
        matchedTerms:[],
        parentConcepts:[],
        termCount:0,
        source:"subject_fallback",
        confidence:"low",
        evidenceScope:"none",
        fallbackMergeEnabled:CONCEPT_FALLBACK_ENABLED,
        fallbackDerived:false,
        fallbackHitCount:0,
        fallbackSourceSubjects:[]
      }
    };
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

  function directionalParticle(value){
    const text = String(value || "").trim();
    const last = text.charAt(text.length - 1);
    const code = last.charCodeAt(0);
    if(code >= 0xAC00 && code <= 0xD7A3){
      const jong = (code - 0xAC00) % 28;
      return jong === 0 || jong === 8 ? "로" : "으로";
    }
    return "으로";
  }

  function composeCrossAxisTitle(subjectLabel, conceptList, keywordLabel, task, seed){
    const concepts = (conceptList || []).filter(Boolean).slice(0,3).join("·") || subjectLabel;
    const conceptsWithParticle = `${concepts}${directionalParticle(concepts)}`;
    const rawKeyword = String(keywordLabel || "").trim();
    const genericKeyword = /^(발전|에너지|환경|영향|변화|데이터|자료|측정|시스템|기술|과학|사회|문제|구조|성능|탐구)$/;
    const seedTopic = (seed?.topic?.recommendedTopics || [])[0] || chooseSeedTopic(seed, task);
    const selectedTarget = rawKeyword && !genericKeyword.test(rawKeyword) ? rawKeyword : "";
    const seedTarget = String(seed?.sourceTitle || seedTopic || seed?.label || "")
      .replace(/\s*(?:탐구\s*)?보고서\s*$/g, "")
      .replace(/\s*탐구\s*$/g, "")
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
      return `${target}의 조건별 변화를 ${conceptsWithParticle} 해석하고 결과의 신뢰도와 한계를 분석`;
    }
    if(modes.some(v => /자료해석|비교/.test(v))){
      return `${target}의 자료·조건 변화를 ${conceptsWithParticle} 해석하고 판단 기준을 분석`;
    }
    return `${target}을 ${conceptsWithParticle} 설명하고 적용 조건과 개선 방향을 분석`;
  }

  function titleQualityFlags(title, subjectLabel, composerFlags){
    const value = String(title || "").trim();
    const flags = [];
    if(!value) flags.push("EMPTY");
    if([...value].length > 70) flags.push("OVER_70");
    if(/선택 키워드|탐구 대상|교과 개념|미입력|undefined|null/i.test(value)) flags.push("PLACEHOLDER");
    if(/\b(?:major|seed)_[0-9A-Za-z가-힣_-]+\b/i.test(value)) flags.push("INTERNAL_ID");
    const subject = String(subjectLabel || "").trim();
    if(subject && new RegExp(`${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:으?로)\\s*(?:설명|분석|해석)`).test(value)){
      flags.push("SUBJECT_PSEUDO_CONCEPT");
    }
    const titleTokens = value.normalize("NFKC").match(/[A-Za-z0-9가-힣]+/g) || [];
    if(titleTokens.some((token, index) => index > 0 && token === titleTokens[index - 1])) flags.push("ADJACENT_REPEAT");
    const criticalComposerFlags = new Set(["EMPTY","OVER_70","PLACEHOLDER","SUBJECT_PSEUDO_CONCEPT","ADJACENT_REPEAT","CAREER_TERM","INTERNAL_ID","PARTICLE_DUPLICATION","SEED_BAD_PATTERN"]);
    for(const flag of (composerFlags || [])){
      if(criticalComposerFlags.has(flag)) flags.push(flag);
    }
    return uniq(flags);
  }

  function safeGeneralTitle(taskDescription, subjectLabel){
    const subjectNorm = normalize(subjectLabel);
    const words = uniq(String(taskDescription || "").normalize("NFKC").match(/[A-Za-z0-9가-힣]+/g) || [])
      .filter(word => word.length >= 2 && normalize(word) !== subjectNorm)
      .slice(0,4);
    const object = words.join(" ") || `${subjectLabel || "수행평가"} 핵심 내용`;
    return `${object}: 주요 특징과 적용 조건 분석`;
  }

  function buildCrossAxis(payload, subjectLabel, keywordLabel, concept, taskInterpretation){
    if(!crossAxisData) return null;
    const taskMatch = matchTaskRecord(payload, subjectLabel);
    const task = taskMatch?.task || null;
    const seedMatch = matchContentSeed(payload, subjectLabel, task);
    const seed = seedMatch?.seed || null;
    const structureId = chooseStructureId(task, taskInterpretation, payload);
    const structureSections = (crossAxisData.structures || {})[structureId] || (crossAxisData.structures || {}).structure_research_report || [
      "연구 질문","선행 자료 검토","방법 설계","자료 수집","분석 결과","결론","참고문헌과 후속 탐구"
    ];
    const conceptResult = inferSubjectConcepts(payload?.subject || subjectLabel, task, concept, payload);
    const concepts = conceptResult.list;
    const titleKeyword = payload?.keywordSource === "derived_from_guide" ? "" : keywordLabel;
    const legacyGeneratedTitle = composeCrossAxisTitle(subjectLabel, concepts, titleKeyword, task, seed);
    const selectionKeywordBasis = String(
      (titleKeyword && !/선택 키워드|미입력|undefined|null/i.test(titleKeyword) ? titleKeyword : "")
      || seed?.sourceTitle
      || legacyGeneratedTitle
      || concept
      || ""
    ).trim();
    let generatedTitle = "";
    let titleComposerVersion = "PATCH6_TITLE_COMPOSER_V2";
    let titleTemplateId = "";
    let titleType = "";
    let titleConfidence = "LOW";
    let titleEvidence = {};
    let titleFallbackUsed = false;
    let titleFallbackReason = "";
    let titleValidationFlags = [];
    try{
      const composer = global.MiniTitleComposerV2;
      if(!composer || typeof composer.compose !== "function") throw new Error("TITLE_COMPOSER_UNAVAILABLE");
      const composed = composer.compose({
        subject: String(payload?.subject || subjectLabel),
        taskDescription: String(payload?.taskDescription || payload?.assessmentDescription || task?.description || ""),
        task_interpreter: taskInterpretation || {},
        subjectConcepts: concepts,
        conceptDetail: conceptResult.detail || {},
        selectedSeedId: seed?.id || "",
        seed: {topic: seed?.topic || {}, report: seed?.report || {}},
        keywordLabel: titleKeyword,
        legacyGeneratedTitle
      }) || {};
      titleTemplateId = String(composed.templateId || "");
      titleType = String(composed.titleType || "");
      titleConfidence = String(composed.confidence || "LOW");
      titleEvidence = composed.evidence || {};
      titleFallbackUsed = !!composed.fallbackUsed;
      titleFallbackReason = String(composed.fallbackReason || "");
      titleValidationFlags = titleQualityFlags(composed.title, String(payload?.subject || subjectLabel), composed.validationFlags);
      if(titleValidationFlags.length) throw new Error("TITLE_COMPOSER_INVALID_RESULT");
      generatedTitle = String(composed.title || "").trim();
    }catch(error){
      titleFallbackUsed = true;
      titleFallbackReason = titleFallbackReason || String(error?.message || "TITLE_COMPOSER_ERROR");
      const legacyFlags = titleQualityFlags(legacyGeneratedTitle, String(payload?.subject || subjectLabel), []);
      if(!legacyFlags.length){
        generatedTitle = legacyGeneratedTitle;
        titleTemplateId = "LEGACY_QUALITY_CUT";
        titleValidationFlags = [];
      }else{
        generatedTitle = safeGeneralTitle(String(payload?.taskDescription || payload?.assessmentDescription || task?.description || ""), subjectLabel);
        titleTemplateId = "GENERAL_SAFE_RUNTIME";
        titleFallbackReason = `${titleFallbackReason}:SAFE_GENERAL`;
        titleValidationFlags = titleQualityFlags(generatedTitle, String(payload?.subject || subjectLabel), []);
      }
    }
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
      seed?.topic?.baseTopic,
      seed?.topic?.coreQuestion,
      seed?.topic?.basic,
      seed?.topic?.expanded,
      seed?.topic?.deep,
      ...(seed?.topic?.recommendedTopics || []),
      ...(seed?.topic?.inquiryQuestions || []),
      ...(seed?.studentTopics || []).map(v => v?.title)
    ]).filter(Boolean).slice(0,6);

    const crossAxisResult = {
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
        keywordSource: seedMatch.keywordSource || "",
        selectedKeyword: seedMatch.selectedKeyword || "",
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
        legacyGeneratedTitle,
        generatedTitle,
        titleComposerVersion,
        titleTemplateId,
        titleType,
        titleConfidence,
        titleEvidence,
        titleFallbackUsed,
        titleFallbackReason,
        titleValidationFlags,
        selectionKeywordBasis,
        options: topicOptions,
        subjectConcepts: concepts,
        conceptDetail: conceptResult.detail,
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
    Object.defineProperty(crossAxisResult, "__scoreDiagnostics", {
      value: seedMatch?.scoreDiagnostics || null,
      enumerable: false,
      configurable: false,
      writable: false
    });
    return crossAxisResult;
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
    let rawKeyword = String(payload?.selectedKeyword || payload?.selectedRecommendedKeyword || payload?.keyword || "").trim();
    let keywordSource = rawKeyword ? "student_selected" : "";
    let derivedKeywords = [];
    if(!rawKeyword){
      derivedKeywords = extractGuideKeywords(rawTaskText(payload), getSeedVocabulary(), 8);
      if(derivedKeywords.length){
        rawKeyword = derivedKeywords.join(" ");
        keywordSource = "derived_from_guide";
      }
    }
    const scoringPayload = { ...payload, selectedKeyword: rawKeyword, keywordSource, derivedKeywords };
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
    const crossAxis = buildCrossAxis({ ...scoringPayload, career }, canonicalSubjectInput || subjectLabel, keywordLabel, concept, taskInterpretation);
    const scoreDiagnostics = crossAxis?.__scoreDiagnostics || null;
    const exactTask = crossAxis?.taskMatch?.record || null;
    const nonReportTask = detectNonReportTask(payload, crossAxis?.taskMatch || null);
    logTaskInterpreterEvent(payload, taskInterpretation, nonReportTask);

    if(nonReportTask.blocked){
      const blockedContext = {
        version:"assessment-keyword-cross-axis-context-v2.5.0",
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
          notice:nonReportTask.notice,
          reportModes:inferredModes,
          methodAxes:inferredMethods,
          outputAxes:inferredOutputs,
          structureId:crossAxis?.structure?.id || "",
          structureSections:crossAxis?.structure?.sections || [],
          bookSignal:hasBookSignal(payload, inferredOutputs),
          overrideActive:!!taskInterpretation.overrideActive
        },
        score_diagnostics:scoreDiagnostics,
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

    const overrideActive = !!taskInterpretation.overrideActive;
    const specificTaskType = ["실험보고서","자료조사 보고서","발표보고서"].includes(taskType);
    const taskPrimaryMethod = firstValue(taskRoute?.dominant_methods, "");
    const taskPrimaryOutput = firstValue(taskRoute?.dominant_outputs, "");
    const subjectPrimaryMethod = firstValue(subjectRoute?.dominant_methods, "");
    const subjectPrimaryOutput = firstValue(subjectRoute?.dominant_outputs, "");
    const subjectPrimaryMode = firstValue(subjectRoute?.dominant_report_modes, "");
    const recommendedMethod = overrideActive
      ? (inferredMethods[0] || "보고서작성형")
      : (exactTask?.methodAxis?.[0] || (taskInterpretation.fallbackActive
        ? (subjectPrimaryMethod || taskPrimaryMethod || keywordRoute.preferred_methods?.[0] || "보고서작성형")
        : (specificTaskType
          ? (taskPrimaryMethod || inferredMethods[0] || keywordRoute.preferred_methods?.[0] || "보고서작성형")
          : (inferredMethods[0] || taskPrimaryMethod || keywordRoute.preferred_methods?.[0] || "보고서작성형"))));
    const recommendedOutput = overrideActive
      ? (inferredOutputs[0] || taskType)
      : (exactTask?.outputAxis?.[0] || (taskInterpretation.fallbackActive
        ? (subjectPrimaryOutput || taskPrimaryOutput || keywordRoute.preferred_outputs?.[0] || taskType)
        : (specificTaskType
          ? (taskPrimaryOutput || inferredOutputs[0] || keywordRoute.preferred_outputs?.[0] || taskType)
          : (inferredOutputs[0] || taskPrimaryOutput || keywordRoute.preferred_outputs?.[0] || taskType))));
    const recommendedMode = overrideActive
      ? (inferredModes[0] || "연구보고서형")
      : (exactTask?.reportModes?.[0] || (taskInterpretation.fallbackActive
        ? (subjectPrimaryMode || firstValue(taskRoute?.dominant_report_modes, "") || keywordRoute.preferred_report_modes?.[0] || "자료해석형")
        : (inferredModes[0] || firstValue(taskRoute?.dominant_report_modes, "") || keywordRoute.preferred_report_modes?.[0] || "자료해석형")));
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
    const reportSections = crossAxis?.structure?.sections?.length
      ? crossAxis.structure.sections
      : ((crossAxisData?.structures || {}).structure_research_report || ["연구 질문","선행 자료 검토","방법 설계","자료 수집","분석 결과","결론","참고문헌과 후속 탐구"]);

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
      version: "assessment-keyword-cross-axis-context-v2.5.0",
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
        keyword: rawKeyword,
        keywordSource,
        derivedKeywords
      },
      match: {
        keyword: keywordLabel,
        keywordSource,
        derivedKeywords,
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
        tieBreak: "rules_array_order_first",
        reportModes: inferredModes,
        methodAxes: inferredMethods,
        outputAxes: inferredOutputs,
        structureId: crossAxis?.structure?.id || "",
        structureSections: reportSections,
        bookSignal: hasBookSignal(payload, uniq([...(exactTask?.outputAxis || []), ...inferredOutputs])),
        overrideActive
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
        structureId: crossAxis?.structure?.id || "",
        recommendedEvidence: evidenceTypes,
        rubricFocus,
        reportSections,
        avoidModes: crossAxis?.constraints?.avoidModes || uniq([
          ...topValues(subjectRoute?.avoid_modes, 4),
          ...topValues(taskRoute?.avoid_modes, 4)
        ]).slice(0,8)
      },
      score_diagnostics: scoreDiagnostics,
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
    version: "v2.9.0-model-h-runtime",
    ready: load,
    resolve,
    resolveSync,
    getSelectionPolicy: () => RUNTIME_SELECTION_POLICY,
    getSelectionModel: runtimeSelectionModel,
    setSelectionModel(value){
      global.__ASSESSMENT_SELECTION_MODEL__ = normalizeSelectionModel(value);
      return runtimeSelectionModel();
    },
    buildSeedVocabulary,
    extractGuideKeywords,
    getLastContext: () => lastContext,
    getData: () => bridgeData,
    getCrossAxisData: () => crossAxisData,
    getConceptMapData: () => conceptMapData,
    getConceptSegmentData: () => conceptSegmentData,
    getConceptDictionary,
    inferSubjectConcepts,
    toCanonicalSubject,
    inferTaskRule,
    getStructureCatalog: () => ({ ...(crossAxisData?.structures || {}) }),
    getStructureIdForReportMode: mode => STRUCTURE_BY_REPORT_MODE[String(mode || "")] || "structure_research_report",
    readTaskInterpreterLogs(){
      try{ return JSON.parse(localStorage.getItem(TASK_LOG_STORAGE_KEY) || "[]"); }
      catch(error){ return []; }
    }
  };

  load();
})(window);
