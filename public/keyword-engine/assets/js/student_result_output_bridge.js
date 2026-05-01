/* student_result_output_bridge.js
 * v30: 학생 선택형 6~8번 + 보고서 예시 데이터셋 패턴 반영 + 기존 generate 이벤트 완전 가드
 */
(function(global){
  "use strict";

  const VERSION = "student-result-output-bridge-v30-dataset-pattern-result";
  global.__STUDENT_RESULT_OUTPUT_BRIDGE_VERSION__ = VERSION;
  global.__REPORT_DATASET_PATTERN_LIBRARY_VERSION__ = "report-pattern-library-v30-from-RPT001-010";

  const MODE = {
    principle: "원리 파악형",
    compare: "비교 분석형",
    data: "데이터 확장형",
    application: "사례 적용형",
    major: "전공 확장형",
    book: "도서 근거형"
  };
  const LINE = { basic: "기본형", standard: "확장형", advanced: "심화형" };
  const AXIS = {
    measurement_data_modeling: "수리·데이터 모델링 축",
    physics_system: "물리·시스템 해석 축",
    earth_environment_data: "지구·환경 데이터 해석 축",
    science_measurement: "과학 방법·측정 일반 축"
  };

  const LIB = {
    version: "report-pattern-library-v30-from-RPT001-010",
    fixedSectionOrder: [
      "중요성", "추천 주제", "관련 키워드", "탐구 동기", "느낀점", "세특 문구 예시",
      "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?", "이 개념이 무엇이며 어떤 원리인가?",
      "어떤 문제를 해결할 수 있고, 왜 중요한가?", "실제 적용 및 문제 해결 과정",
      "교과목 연계 및 이론적 설명", "심화 탐구 발전 방안", "참고 문헌 및 자료"
    ],
    patternGroups: {
      system_data_prevention: {
        label: "시스템·데이터 예방형", exampleReportIds: ["RPT-001", "RPT-005"],
        signals: ["AI","IoT","데이터","모델링","센서","위험","예측","컴퓨터","스마트","측정"],
        preferredModes: ["data","application","major"],
        problemFrame: "현상을 단순 설명하지 않고, 자료 수집·판단 기준·예측 또는 예방 시스템으로 연결한다.",
        writingMove: "문제 상황 → 측정 자료 → 판단 기준 → 시스템적 해결 방안 → 한계와 개선",
        sectionTone: "사례와 데이터를 함께 제시하고, 학생이 왜 이 기준을 선택했는지 드러낸다.",
        processSteps: ["관찰하거나 수집할 데이터를 정한다", "데이터를 해석할 기준을 세운다", "위험·변화·차이를 판단한다", "예방 또는 개선 방향을 제안한다"],
        keywordHints: ["데이터 수집","판단 기준","예측","시스템","피드백","한계"]
      },
      earth_climate_data: {
        label: "지구·기후 데이터 해석형", exampleReportIds: ["RPT-003"],
        signals: ["기후","해양","대기","지구","폭염","기상","해수","순환","환경","시계열","주의보"],
        preferredModes: ["data","principle","application"],
        problemFrame: "관측 자료와 시간에 따른 변화를 해석해 환경 변화의 원인·영향·대응을 연결한다.",
        writingMove: "교과 개념 → 관측 자료 → 변화 해석 → 지역/사회 영향 → 대응 방향",
        sectionTone: "그래프·기준값·관측값을 활용하되, 교과 개념과 실제 생활 문제를 분리하지 않는다.",
        processSteps: ["관련 현상과 관측 지표를 정한다", "자료가 변하는 조건을 확인한다", "변화가 생활 또는 지역 문제로 이어지는 과정을 설명한다", "후속 탐구에서 비교할 변수를 제안한다"],
        keywordHints: ["관측 자료","시계열","기준값","지역 차이","대응","예측"]
      },
      physics_energy_system: {
        label: "물리·에너지 시스템 해석형", exampleReportIds: ["RPT-008"],
        signals: ["물리","에너지","열","전력","핵","원자력","SMR","힘","운동","시스템"],
        preferredModes: ["principle","application","data"],
        problemFrame: "물리 원리에서 출발해 장치·시스템·안전성·기술 적용으로 확장한다.",
        writingMove: "원리 설명 → 조건 변화 → 장치/시스템 적용 → 안전성·효율 해석",
        sectionTone: "수식이나 원리를 단독으로 제시하지 않고, 실제 장치나 기술 문제와 연결한다.",
        processSteps: ["핵심 물리 원리를 정의한다", "원리가 작동하는 조건을 나눈다", "실제 시스템에서의 적용 장면을 설명한다", "효율·안전성·한계를 정리한다"],
        keywordHints: ["원리","조건","효율","안전성","장치","시스템"]
      },
      sustainability_material_design: {
        label: "지속가능·소재/공정 설계형", exampleReportIds: ["RPT-002","RPT-006"],
        signals: ["지속가능","소재","공정","재활용","촉매","환경","신소재","탄소","화학","자원"],
        preferredModes: ["application","compare","major"],
        problemFrame: "물질·소재·자원 문제를 원리와 공정 관점에서 분석하고 개선안을 설계한다.",
        writingMove: "문제 인식 → 물질/소재 원리 → 공정 또는 활용 방식 → 지속가능성 평가",
        sectionTone: "개념 설명 뒤에 반드시 개선 기준과 적용 가능성을 제시한다.",
        processSteps: ["해결할 자원·소재 문제를 정한다", "관련 물질의 성질을 설명한다", "공정 또는 활용 방식을 비교한다", "지속가능성 기준으로 평가한다"],
        keywordHints: ["소재 특성","공정","재활용","효율","환경성","개선안"]
      },
      bio_mechanism: {
        label: "생명·분자 기전 해석형", exampleReportIds: ["RPT-007"],
        signals: ["생명","세포","유전자","단백질","분자","신경","시냅스","의생명","약학","기전"],
        preferredModes: ["principle","major","application"],
        problemFrame: "생명 현상을 분자·세포·시스템 수준으로 나누어 원리와 응용 가능성을 설명한다.",
        writingMove: "현상 관찰 → 세포/분자 기전 → 기능 변화 → 질환·응용 연결",
        sectionTone: "개념을 암기식으로 나열하지 않고, 구조와 기능의 관계를 중심으로 설명한다.",
        processSteps: ["현상을 먼저 제시한다", "관여하는 구조나 분자를 정리한다", "기능 변화가 나타나는 과정을 설명한다", "질환·치료·응용 가능성과 연결한다"],
        keywordHints: ["기전","구조","기능","조절","질환","응용"]
      },
      social_policy_issue: {
        label: "사회·정책 쟁점 분석형", exampleReportIds: ["RPT-004","RPT-009","RPT-010"],
        signals: ["정책","사회","행정","복지","정치","법","윤리","공공","갈등","거버넌스"],
        preferredModes: ["compare","application","major"],
        problemFrame: "사회 문제를 원인·이해관계·제도적 대응으로 나누어 분석한다.",
        writingMove: "문제 제기 → 원인 구조 → 이해관계/쟁점 → 해결 기준 → 제도적 제안",
        sectionTone: "찬반 나열이 아니라 비교 기준과 판단 근거를 먼저 제시한다.",
        processSteps: ["문제 상황을 구체화한다", "이해관계와 원인을 나눈다", "비교 기준을 세운다", "현실적인 개선 방향을 제시한다"],
        keywordHints: ["쟁점","비교 기준","이해관계","제도","윤리","개선안"]
      }
    },
    sectionRoleMap: {
      "중요성": "보고서 도입부에서 주제의 사회·기술적 중요성을 제시한다.",
      "추천 주제": "최종 보고서 제목 또는 주제명으로 사용한다.",
      "관련 키워드": "개념 설명 및 문제 해결 과정에서 반복적으로 사용할 핵심 용어를 정리한다.",
      "탐구 동기": "교과 수업의 의문이 실제 문제로 확장되는 과정을 제시한다.",
      "느낀점": "탐구 후 진로 의식과 학습 태도를 정리한다.",
      "세특 문구 예시": "교과 개념·과정·결과 중심의 생활기록부 문장으로 변형한다.",
      "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?": "생기부 연결성 및 진로 적합성을 설명한다.",
      "이 개념이 무엇이며 어떤 원리인가?": "핵심 개념의 원리를 설명한다.",
      "어떤 문제를 해결할 수 있고, 왜 중요한가?": "문제 상황과 해결 필요성을 제시한다.",
      "실제 적용 및 문제 해결 과정": "단계별 문제 해결 흐름을 제시한다.",
      "교과목 연계 및 이론적 설명": "교과 간 융합 연결을 설명한다.",
      "심화 탐구 발전 방안": "추가 탐구 주제와 발전 방향을 제시한다.",
      "참고 문헌 및 자료": "도서·논문·기관 자료 등 보고서 근거를 제시한다."
    }
  };

  const $ = (id) => document.getElementById(id);
  const val = (v) => String(v == null ? "" : v).trim();
  const arr = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  const norm = (v) => val(v).toLowerCase().replace(/\s+/g," ");
  const form = (id) => val($(id)?.value);
  const activeAttr = (selector, attr) => val(document.querySelector(selector)?.getAttribute?.(attr));
  const activeText = (selector) => val(document.querySelector(selector)?.textContent).replace(/\s+/g," ");

  function cleanAxis(raw){
    const v = val(raw);
    if (!v) return "";
    const token = v.split(/\s+/).find(x => AXIS[x]);
    if (token) return AXIS[token];
    const byId = AXIS[v];
    if (byId) return byId;
    const m = v.match(/[가-힣A-Za-z0-9·\/\- ]+축/);
    return m ? m[0].trim() : v;
  }

  function shortAxisId(raw){
    const v = val(raw);
    if (!v) return "";
    const token = v.split(/\s+/).find(x => AXIS[x]);
    if (token) return token;
    if (AXIS[v]) return v;
    if (/데이터|모델링|통계|자료/.test(v)) return "measurement_data_modeling";
    if (/물리|시스템|에너지|역학/.test(v)) return "physics_system";
    if (/지구|기후|환경|해양|대기/.test(v)) return "earth_environment_data";
    return "science_measurement";
  }

  function domSelection(){
    const axisFromTitle = activeText(".engine-track-card.is-active .engine-track-title");
    const mode = form("reportMode") || activeAttr(".engine-mode-card.is-active[data-action='mode']", "data-value");
    const view = form("reportView") || activeAttr(".engine-chip.is-active[data-action='view']", "data-value");
    const line = form("reportLine") || activeAttr(".engine-mode-card.is-active[data-action='line']", "data-value");
    const axis = form("linkedTrack") || activeAttr(".engine-track-card.is-active[data-track]", "data-track") || axisFromTitle;
    return {
      subject: form("subject"),
      department: form("career"),
      selectedConcept: form("selectedConcept") || activeAttr(".engine-concept-card.is-active[data-concept]", "data-concept"),
      selectedKeyword: form("keyword") || activeAttr(".engine-chip.is-active[data-action='keyword'][data-value]", "data-value"),
      selectedFollowupAxis: cleanAxis(axisFromTitle || axis),
      followupAxis: cleanAxis(axisFromTitle || axis),
      followupAxisId: shortAxisId(axis),
      selectedBookTitle: form("selectedBookTitle"),
      selectedBookId: form("selectedBookId"),
      reportMode: mode,
      reportView: view,
      reportLine: line
    };
  }

  function getRawPayload(){
    try {
      if (typeof global.__BUILD_MINI_REPORT_PAYLOAD__ === "function") return global.__BUILD_MINI_REPORT_PAYLOAD__() || {};
    } catch(e) { console.warn("MINI payload build failed", e); }
    return {};
  }

  function selectedBookFromResult(p, dom){
    if (p?.selectedBook) return p.selectedBook;
    const st = global.__TEXTBOOK_HELPER_STATE__ || {};
    let r = null;
    try { r = typeof global.__BOOK_210_GET_LAST_RESULT__ === "function" ? global.__BOOK_210_GET_LAST_RESULT__() : null; } catch(e) {}
    const all = arr(r?.result?.directBooks).concat(arr(r?.result?.expansionBooks));
    const selected = val(st.selectedBook || dom.selectedBookId || dom.selectedBookTitle);
    const found = all.find(b => [b.sourceId, b.bookId, String(b.managementNo || ""), b.title].map(val).includes(selected));
    return found || (dom.selectedBookTitle ? { title: dom.selectedBookTitle, sourceId: dom.selectedBookId } : null);
  }

  function hydratePayload(){
    const p = getRawPayload();
    const dom = domSelection();
    const s = Object.assign({}, p.selectionPayload || {});
    s.subject = val(s.subject) || dom.subject;
    s.department = val(s.department) || dom.department;
    s.selectedConcept = val(s.selectedConcept) || dom.selectedConcept;
    s.selectedRecommendedKeyword = val(s.selectedRecommendedKeyword) || val(s.selectedKeyword) || dom.selectedKeyword;
    s.selectedKeyword = val(s.selectedKeyword) || s.selectedRecommendedKeyword;
    s.followupAxis = cleanAxis(val(s.followupAxis) || dom.followupAxis || dom.selectedFollowupAxis);
    s.selectedFollowupAxis = cleanAxis(val(s.selectedFollowupAxis) || s.followupAxis || dom.selectedFollowupAxis);
    s.followupAxisId = val(s.followupAxisId) || dom.followupAxisId || shortAxisId(s.followupAxis);
    s.reportMode = val(s.reportMode) || dom.reportMode;
    s.reportView = val(s.reportView) || dom.reportView;
    s.reportLine = val(s.reportLine) || dom.reportLine;
    s.reportModeLabel = MODE[s.reportMode] || val(s.reportModeLabel) || s.reportMode;
    s.reportLineLabel = LINE[s.reportLine] || val(s.reportLineLabel) || s.reportLine;

    p.selectionPayload = s;
    p.selectedBook = selectedBookFromResult(p, dom);
    p.reportGenerationContext = p.reportGenerationContext || {};
    p.reportGenerationContext.reportChoices = Object.assign({}, p.reportGenerationContext.reportChoices || {}, {
      mode: s.reportMode,
      modeLabel: s.reportModeLabel,
      view: s.reportView,
      viewLabel: s.reportView,
      line: s.reportLine,
      lineLabel: s.reportLineLabel || LINE[s.reportLine] || s.reportLine,
      isComplete: !!(s.reportMode && s.reportView && s.reportLine)
    });
    return p;
  }

  function getContext(){
    const p = hydratePayload();
    const s = p.selectionPayload || {};
    const book = p.selectedBook || {};
    const c = {
      payload: p,
      subject: val(s.subject),
      major: val(s.department),
      concept: val(s.selectedConcept),
      keyword: val(s.selectedKeyword || s.selectedRecommendedKeyword),
      axis: cleanAxis(s.selectedFollowupAxis || s.followupAxis),
      axisId: val(s.followupAxisId) || shortAxisId(s.selectedFollowupAxis || s.followupAxis),
      book: val(book.title || domSelection().selectedBookTitle),
      bookContext: book.selectedBookContext || {},
      mode: val(s.reportMode),
      view: val(s.reportView),
      line: val(s.reportLine),
      modeLabel: MODE[s.reportMode] || val(s.reportModeLabel) || s.reportMode,
      lineLabel: LINE[s.reportLine] || val(s.reportLineLabel) || s.reportLine
    };
    c.pattern = pickPattern(c);
    c.sections = buildSections(c);
    c.title = makeTitle(c);
    c.payload.reportGenerationContext = enhanceReportContext(c);
    c.payload.selectionPayload = Object.assign({}, c.payload.selectionPayload, {
      selectedKeyword: c.keyword,
      selectedFollowupAxis: c.axis,
      reportMode: c.mode,
      reportView: c.view,
      reportLine: c.line
    });
    return c;
  }

  function pickPattern(c){
    const hay = norm([c.subject,c.major,c.concept,c.keyword,c.axis,c.axisId,c.mode,c.view].join(" "));
    let best = null;
    Object.entries(LIB.patternGroups).forEach(([id, group]) => {
      let score = 0;
      arr(group.signals).forEach(signal => { if (hay.includes(norm(signal))) score += 3; });
      arr(group.preferredModes).forEach((m, i) => { if (m === c.mode) score += 4 - i; });
      if (id.includes("earth") && /폭염|기후|주의보|대기|지구|환경/.test(hay)) score += 8;
      if (id.includes("system") && /컴퓨터|데이터|모델링|센서|ai|정보/.test(hay)) score += 6;
      if (id.includes("physics") && /물리|에너지|힘|열|전력/.test(hay)) score += 7;
      if (id.includes("bio") && /생명|세포|유전자|약학|의학/.test(hay)) score += 7;
      if (id.includes("material") && /소재|화학|공정|촉매|재료/.test(hay)) score += 7;
      if (id.includes("social") && /사회|정책|윤리|행정|복지|법/.test(hay)) score += 7;
      if (!best || score > best.score) best = Object.assign({ id, score }, group);
    });
    return best || Object.assign({ id:"system_data_prevention", score:0 }, LIB.patternGroups.system_data_prevention);
  }

  function makeTitle(c){
    if (c.mode === "data") return `${c.keyword}를 자료로 해석해 ${c.major} 관점의 판단 기준 세우기`;
    if (c.mode === "compare") return `${c.keyword}의 기준을 비교해 ${c.concept}의 적용 차이 분석하기`;
    if (c.mode === "application") return `${c.keyword}를 실제 사례에 적용해 ${c.concept}의 의미 설명하기`;
    if (c.mode === "major") return `${c.concept}에서 출발한 ${c.major} 연계 탐구: ${c.keyword}의 활용 가능성`;
    if (c.mode === "book") return `『${c.book}』의 관점으로 확장한 ${c.keyword} 탐구`;
    return `${c.keyword}의 핵심 원리와 실제 적용 중심 탐구`;
  }

  function buildSections(c){
    const standard = ["중요성","추천 주제","관련 키워드","탐구 동기","이 개념이 무엇이며 어떤 원리인가?","어떤 문제를 해결할 수 있고, 왜 중요한가?","실제 적용 및 문제 해결 과정","교과목 연계 및 이론적 설명","심화 탐구 발전 방안","참고 문헌 및 자료"];
    const basic = ["추천 주제","탐구 동기","이 개념이 무엇이며 어떤 원리인가?","실제 적용 및 문제 해결 과정","느낀점","참고 문헌 및 자료"];
    const advanced = ["중요성","추천 주제","관련 키워드","탐구 동기","이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?","이 개념이 무엇이며 어떤 원리인가?","어떤 문제를 해결할 수 있고, 왜 중요한가?","실제 적용 및 문제 해결 과정","교과목 연계 및 이론적 설명","심화 탐구 발전 방안","세특 문구 예시","참고 문헌 및 자료"];
    let sections = c.line === "basic" ? basic : c.line === "advanced" ? advanced : standard;
    if (c.mode === "data") sections = moveNearFront(sections, ["관련 키워드","실제 적용 및 문제 해결 과정","심화 탐구 발전 방안"]);
    if (c.mode === "compare") sections = moveNearFront(sections, ["관련 키워드","어떤 문제를 해결할 수 있고, 왜 중요한가?"]);
    if (c.mode === "book") sections = moveNearFront(sections, ["추천 주제","탐구 동기","참고 문헌 및 자료"]);
    return sections;
  }

  function moveNearFront(sections, targets){
    const head = sections.filter(s => ["중요성","추천 주제","탐구 동기"].includes(s));
    const boosted = targets.filter(t => sections.includes(t) && !head.includes(t));
    const seen = new Set(head.concat(boosted));
    return head.concat(boosted).concat(sections.filter(s => !seen.has(s)));
  }

  function enhanceReportContext(c){
    const base = Object.assign({}, c.payload.reportGenerationContext || {});
    const sectionPurpose = Object.assign({}, base.sectionPurpose || {});
    c.sections.forEach(sec => { sectionPurpose[sec] = LIB.sectionRoleMap[sec] || `${sec} 항목은 선택값에 맞춰 작성한다.`; });
    return Object.assign(base, {
      reportPatternLibraryVersion: LIB.version,
      reportChoices: {
        mode: c.mode, modeLabel: c.modeLabel,
        view: c.view, viewLabel: c.view,
        line: c.line, lineLabel: c.lineLabel,
        isComplete: !!(c.mode && c.view && c.line)
      },
      targetStructure: c.sections,
      sectionPurpose,
      examplePattern: {
        id: c.pattern.id,
        label: c.pattern.label,
        exampleReportIds: c.pattern.exampleReportIds,
        studentUse: c.pattern.problemFrame,
        writingMove: c.pattern.writingMove,
        modePriority: c.pattern.preferredModes
      },
      writingRules: arr(base.writingRules).concat([
        `보고서 예시 데이터셋의 '${c.pattern.label}' 패턴을 원문 복사가 아니라 구조 참고로만 사용한다.`,
        `선택한 6번 전개 방식 '${c.modeLabel}', 7번 관점 '${c.view}', 8번 라인 '${c.lineLabel}'에 맞춰 문단 순서와 강조점을 바꾼다.`
      ])
    });
  }

  function missing(c){
    const out = [];
    if (!form("schoolName")) out.push("학교명");
    if (!form("grade")) out.push("학년");
    if (!c.subject) out.push("과목");
    if (!form("taskName")) out.push("활동 과제 이름");
    if (!form("taskType")) out.push("결과물 유형");
    if (!c.major) out.push("학과");
    if (!c.concept) out.push("3번 교과 개념");
    if (!c.keyword) out.push("3번 추천 키워드");
    if (!c.axis) out.push("4번 후속 연계축");
    if (!c.book) out.push("5번 도서");
    if (!c.mode) out.push("6번 보고서 전개 방식");
    if (!c.view) out.push("7번 보고서 관점");
    if (!c.line) out.push("8번 보고서 라인");
    return out;
  }

  function sectionBody(sec, c){
    const P = c.pattern;
    const hints = arr(P.keywordHints).slice(0, 5).join(", ");
    const steps = arr(P.processSteps);
    if (sec === "중요성") return `${c.keyword}는 ${c.subject}의 ${c.concept}을 실제 문제로 옮겨 볼 수 있는 지점이다. ${P.label}에서는 ${P.problemFrame} 따라서 이 보고서는 단순한 개념 정리가 아니라 ${c.major} 관점에서 판단 기준과 적용 가능성을 함께 보여주는 방향으로 구성한다.`;
    if (sec === "추천 주제") return c.title;
    if (sec === "관련 키워드") return `${c.keyword}, ${c.concept}, ${c.axis}, ${hints}를 핵심어로 잡는다. 키워드는 나열하지 않고 '개념어-자료어-문제해결어'로 나누어 본문에서 반복 사용한다.`;
    if (sec === "탐구 동기") return `${c.subject}에서 ${c.concept}을 배우며 이 개념이 실제 생활이나 사회 문제에서 어떻게 판단 기준으로 쓰이는지 궁금해졌다. 특히 ${c.keyword}를 ${c.view || "선택 관점"} 관점으로 보면 ${c.major} 진로와 연결되는 탐구 흐름을 만들 수 있다고 보았다.`;
    if (sec === "느낀점") return `이번 탐구를 통해 교과 개념은 외워야 할 정의가 아니라 실제 문제를 해석하는 도구가 될 수 있음을 확인했다. ${c.modeLabel}으로 정리하면서 같은 주제라도 자료, 사례, 비교 기준을 어떻게 세우느냐에 따라 보고서의 깊이가 달라진다는 점을 알게 되었다.`;
    if (sec === "세특 문구 예시") return `${c.concept}과 관련한 ${c.keyword}를 주제로 ${c.modeLabel} 보고서를 구성하고, ${c.axis} 방향에서 자료·사례·개념을 연결하여 ${c.major} 진로와의 관련성을 탐색함. 선택 도서 『${c.book}』를 단순 요약이 아니라 분석 관점의 근거로 활용함.`;
    if (sec.includes("왜 알아야")) return `${c.concept}은 ${c.subject}의 학습 내용을 생활 문제와 연결하는 핵심 개념이다. ${c.keyword}와 연결하면 교과에서 배운 원리가 실제 판단, 문제 해결, 진로 확장으로 이어지는 과정을 생활기록부에 과정 중심으로 남길 수 있다.`;
    if (sec.includes("무엇이며")) return `${c.concept}의 핵심은 현상을 설명할 기준을 세우는 것이다. 먼저 ${c.keyword}의 의미를 정의하고, 그 값이나 현상이 어떤 조건에서 달라지는지 설명한 뒤, ${c.axis}과 연결되는 원리를 정리한다.`;
    if (sec.includes("어떤 문제")) return `${P.problemFrame} 이 주제는 ${c.keyword}를 통해 현재 문제를 발견하고, ${c.view || "선택 관점"} 관점에서 해결 필요성을 설명할 수 있다는 점에서 중요하다.`;
    if (sec.includes("실제 적용")) return steps.map((s, i) => `${i + 1}) ${s}`).join(" → ") + `. 이 과정에서 선택 도서 『${c.book}』는 사례를 해석하거나 한계를 비교하는 보조 근거로 활용한다.`;
    if (sec.includes("교과목 연계")) return `${c.subject}의 ${c.concept}에서 출발해 ${c.axis}으로 확장한다. 후속 탐구에서는 ${c.major}에서 사용하는 자료 해석, 모델링, 사례 적용, 비교 기준 설정 방식과 연결해 문단을 구성한다.`;
    if (sec.includes("심화 탐구")) return `${c.keyword}와 관련된 실제 자료 2개 이상을 비교하거나, 지역·시간·조건별 차이를 표나 그래프로 정리한다. 이후 ${P.writingMove} 흐름에 맞춰 한계와 개선 방향까지 제안하면 심화 탐구로 발전할 수 있다.`;
    if (sec.includes("참고")) return `선택 도서 『${c.book}』, ${c.subject} 교과서의 ${c.concept} 관련 단원, 공공기관·학술자료·통계/그래프 자료를 함께 사용한다. 도서는 독후감처럼 요약하지 않고 보고서의 사례·비교·한계 논의에 배치한다.`;
    return `${sec}에서는 ${c.keyword}를 ${c.view || "선택 관점"} 관점으로 정리하고, ${P.label}의 전개 방식에 맞게 교과 개념과 실제 사례를 연결한다.`;
  }

  function reportText(c){
    return [
      `[탐구주제] ${c.title}`,
      `과목: ${c.subject}`,
      `학과: ${c.major}`,
      `교과 개념: ${c.concept}`,
      `추천 키워드: ${c.keyword}`,
      `후속 연계축: ${c.axis}`,
      `선택 도서: ${c.book}`,
      `보고서 선택 구조: ${c.modeLabel} / ${c.view} / ${c.lineLabel}`,
      `참고 패턴: ${c.pattern.label} (${arr(c.pattern.exampleReportIds).join(", ")})`,
      "",
      ...c.sections.map((s, i) => `${i + 1}. ${s}\n${sectionBody(s, c)}`)
    ].join("\n\n");
  }

  function miniPrompt(c){
    return [
      "아래 학생 선택값과 payload를 기준으로 고등학생 수행평가용 MINI 보고서 초안을 작성해줘.",
      "보고서 예시 원문을 복사하지 말고, 예시 데이터셋의 섹션 역할과 전개 흐름만 참고해줘.",
      "",
      reportText(c),
      "",
      "[MINI payload]",
      JSON.stringify(c.payload || {}, null, 2)
    ].join("\n");
  }

  function ensureStyle(){
    if ($("studentResultV30Style")) return;
    const style = document.createElement("style");
    style.id = "studentResultV30Style";
    style.textContent = `
      #studentFinalOutputV30{margin-top:18px}.student-final-v30{border:1px solid #cfe0ff;border-radius:22px;background:#fff;box-shadow:0 16px 44px rgba(15,23,42,.06);padding:20px}.student-final-head-v30{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e8eefb;padding-bottom:16px;margin-bottom:16px}.student-final-kicker-v30{display:inline-flex;border-radius:999px;background:#edf4ff;color:#275fe8;padding:6px 10px;font-size:12px;font-weight:900}.student-final-title-v30{margin:10px 0 8px;font-size:24px;line-height:1.35;color:#111827;font-weight:950}.student-final-sub-v30{color:#52617b;line-height:1.65;font-size:14px;margin:0}.student-final-actions-v30{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.student-final-btn-v30{border:1px solid #b8c8ee;background:#fff;color:#275fe8;border-radius:999px;padding:9px 13px;font-size:13px;font-weight:900;cursor:pointer}.student-final-btn-v30.primary{background:#2f66ff;color:#fff;border-color:#2f66ff}.student-final-grid-v30{display:grid;grid-template-columns:1fr 1fr;gap:14px}.student-final-card-v30{border:1px solid #dbe6fb;border-radius:18px;background:#fbfdff;padding:15px}.student-final-card-v30 h4{margin:0 0 9px;color:#172033;font-size:15px}.student-final-card-v30 p,.student-final-card-v30 li{color:#44546f;font-size:13px;line-height:1.75}.student-final-card-v30 ul,.student-final-card-v30 ol{margin:8px 0 0;padding-left:20px}.student-final-card-v30.full{grid-column:1/-1}.student-chiprow-v30{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.student-chip-v30{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;background:#eef4ff;color:#275fe8;font-size:12px;font-weight:900}.student-section-list-v30{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}.student-section-item-v30{border:1px solid #e0e8f7;background:#fff;border-radius:14px;padding:12px}.student-section-item-v30 strong{display:block;color:#111827;margin-bottom:5px;font-size:14px}.student-section-item-v30 span{color:#475569;font-size:13px;line-height:1.75}.student-alert-v30{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:14px;padding:12px 14px;line-height:1.65;font-size:13px;margin-top:12px}.student-operator-v30{margin-top:14px;border:1px dashed #b9c7e7;border-radius:14px;background:#fbfdff;padding:10px 12px}.student-operator-v30 summary{cursor:pointer;font-weight:900;color:#334155}.student-pre-v30{max-height:260px;overflow:auto;white-space:pre-wrap;background:#111827;color:#f8fafc;border-radius:12px;padding:12px;font-size:12px;line-height:1.55;margin-top:10px}@media(max-width:900px){.student-final-grid-v30{grid-template-columns:1fr}.student-final-head-v30{flex-direction:column}.student-final-actions-v30{justify-content:flex-start}}`;
    document.head.appendChild(style);
  }

  function showError(list){
    const msg = `아직 선택되지 않은 항목이 있습니다: ${list.join(", ")}`;
    const e = $("errorMessage");
    if (e) { e.innerHTML = `<strong>확인 필요</strong><br>${esc(msg)}`; e.style.display = "block"; }
    else alert(msg);
  }
  function hideError(){ const e=$("errorMessage"); if(e){ e.innerHTML=""; e.style.display="none"; } }

  function render(c){
    const result = $("resultSection");
    if (!result) return;
    result.style.display = "block";
    Array.from(result.children).forEach(ch => { if (ch.id !== "studentFinalOutputV30") ch.style.display = "none"; });
    $("studentFinalOutputV28")?.remove();
    let mount = $("studentFinalOutputV30");
    if (!mount) { mount = document.createElement("div"); mount.id = "studentFinalOutputV30"; result.appendChild(mount); }
    const roles = arr(c.payload?.reportGenerationContext?.selectedBookUse?.reportRoleLabels || c.bookContext.reportRoleLabels).join(" / ");
    mount.innerHTML = `<div class="student-final-v30">
      <div class="student-final-head-v30"><div><div class="student-final-kicker-v30">학생용 최종 보고서 설계 결과</div><h2 class="student-final-title-v30">${esc(c.title)}</h2><p class="student-final-sub-v30">선택한 <b>${esc(c.modeLabel)}</b> · <b>${esc(c.view)}</b> · <b>${esc(c.lineLabel)}</b> 구조와 보고서 예시 데이터셋의 <b>${esc(c.pattern.label)}</b> 패턴을 반영했습니다.</p><div class="student-chiprow-v30"><span class="student-chip-v30">${esc(c.subject)}</span><span class="student-chip-v30">${esc(c.major)}</span><span class="student-chip-v30">${esc(c.concept)}</span><span class="student-chip-v30">${esc(c.keyword)}</span><span class="student-chip-v30">${esc(c.axis)}</span><span class="student-chip-v30">『${esc(c.book)}』</span></div></div><div class="student-final-actions-v30"><button type="button" class="student-final-btn-v30 primary" data-v30-copy="report">보고서 구조 복사</button><button type="button" class="student-final-btn-v30" data-v30-copy="prompt">MINI 요청문 복사</button><button type="button" class="student-final-btn-v30" data-v30-copy="payload">payload 복사</button></div></div>
      <div class="student-final-grid-v30">
        <div class="student-final-card-v30"><h4>보고서 선택 구조</h4><ul><li>전개 방식: ${esc(c.modeLabel)}</li><li>관점: ${esc(c.view)}</li><li>라인: ${esc(c.lineLabel)}</li><li>참고 패턴: ${esc(c.pattern.label)} / ${esc(arr(c.pattern.exampleReportIds).join(", "))}</li></ul></div>
        <div class="student-final-card-v30"><h4>선택 도서 활용 위치</h4><p>『${esc(c.book)}』는 단순 독후감용이 아니라 본문 근거, 비교 관점, 한계 논의에 배치합니다.</p><p>${esc(roles || c.bookContext.recommendationReason || "선택 도서의 핵심 관점을 보고서 해석 근거로 활용합니다.")}</p></div>
        <div class="student-final-card-v30 full"><h4>보고서 본문 구조</h4><div class="student-section-list-v30">${c.sections.map((s,i)=>`<div class="student-section-item-v30"><strong>${i+1}. ${esc(s)}</strong><span>${esc(sectionBody(s,c))}</span></div>`).join("")}</div></div>
        <div class="student-final-card-v30"><h4>세특 문구 예시</h4><p>${esc(sectionBody("세특 문구 예시", c))}</p></div>
        <div class="student-final-card-v30"><h4>심화 탐구 발전 방안</h4><ul>${arr(c.pattern.processSteps).map(step=>`<li>${esc(step)}</li>`).join("")}<li>${esc(c.keyword)} 관련 실제 자료를 2개 이상 비교한다.</li></ul></div>
        <div class="student-final-card-v30 full"><h4>참고문헌 및 자료</h4><ul><li>선택 도서: 『${esc(c.book)}』</li><li>${esc(c.subject)} 교과서: ${esc(c.concept)} 관련 단원</li><li>추가 자료: 공공기관 통계, 기사, 그래프, 학술자료 중 1개 이상</li></ul><div class="student-alert-v30">중복 방지 기준: 같은 주제라도 6번 전개 방식, 7번 관점, 8번 라인을 바꾸면 섹션 순서·문장 기능·강조점이 달라져야 합니다.</div></div>
      </div>
      <details class="student-operator-v30"><summary>운영/분석용 MINI payload 보기</summary><pre class="student-pre-v30">${esc(JSON.stringify(c.payload || {}, null, 2))}</pre></details>
    </div>`;
    global.__STUDENT_RESULT_OUTPUT_LAST_CONTEXT__ = c;
    const hidden = $("miniNavigationPayload");
    if (hidden) hidden.value = JSON.stringify(c.payload || {});
    setTimeout(()=>mount.scrollIntoView({behavior:"smooth",block:"start"}), 40);
  }

  async function copy(text){
    try { await navigator.clipboard.writeText(text); return true; }
    catch(e){ const t=document.createElement("textarea"); t.value=text; document.body.appendChild(t); t.select(); try{document.execCommand("copy");}catch(x){} t.remove(); return true; }
  }

  function onCopy(e){
    const b = e.target.closest?.("[data-v30-copy]");
    if (!b) return;
    const c = global.__STUDENT_RESULT_OUTPUT_LAST_CONTEXT__;
    if (!c) return;
    e.preventDefault(); e.stopPropagation();
    const type = b.getAttribute("data-v30-copy");
    const text = type === "payload" ? JSON.stringify(c.payload || {}, null, 2) : type === "prompt" ? miniPrompt(c) : reportText(c);
    copy(text).then(()=>{ const old=b.textContent; b.textContent="복사 완료"; setTimeout(()=>{ b.textContent=old; }, 1200); });
  }

  function generate(e){
    const btn = e?.target?.closest?.("#generateBtn") || (e?.currentTarget?.id === "generateBtn" ? e.currentTarget : null);
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    ensureStyle();
    hideError();
    const c = getContext();
    const m = missing(c);
    global.__REPORT_RESULT_V30_LAST_DEBUG__ = { context: c, missing: m, dom: domSelection() };
    if (m.length) { showError(m); return false; }
    render(c);
    return false;
  }

  function replaceGenerateButton(){
    const old = $("generateBtn");
    if (!old || old.getAttribute("data-v30-guard") === "1") return;
    const clone = old.cloneNode(true);
    clone.setAttribute("data-v30-guard", "1");
    old.parentNode.replaceChild(clone, old);
    clone.addEventListener("click", generate, true);
    clone.addEventListener("click", generate, false);
  }

  function boot(){
    ensureStyle();
    replaceGenerateButton();
    document.addEventListener("click", generate, true);
    document.addEventListener("click", onCopy, true);
  }

  global.__RENDER_STUDENT_FINAL_OUTPUT_V30__ = function(){
    const c = getContext();
    const m = missing(c);
    global.__REPORT_RESULT_V30_LAST_DEBUG__ = { context: c, missing: m, dom: domSelection() };
    if (m.length) return { ok:false, missing:m, debug:global.__REPORT_RESULT_V30_LAST_DEBUG__ };
    render(c);
    return { ok:true, context:c };
  };
  global.__DIAGNOSE_REPORT_SELECTION_V30__ = function(){
    const c = getContext();
    const m = missing(c);
    return { version: VERSION, missing:m, selection:c.payload.selectionPayload, context:c, dom:domSelection() };
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
