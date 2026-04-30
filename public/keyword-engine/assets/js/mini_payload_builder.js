/* mini_payload_builder.js
 * MINI 보고서 생성용 payload builder v1
 */
(function(global){
  "use strict";

  const BUILDER_VERSION = "mini-payload-builder-v1";
  global.__MINI_PAYLOAD_BUILDER_VERSION__ = BUILDER_VERSION;

  const REPORT_CONTEXT_RULES = {
  "version": "report-generation-context-v1",
  "createdAt": "2026-04-30T08:29:15",
  "principle": "학생이 선택한 과목·학과·개념·키워드·후속축·도서를 바탕으로 수행평가 보고서의 문단 구조와 작성 방향을 MINI에 전달한다.",
  "defaultOutputType": "수행평가 탐구보고서",
  "defaultDepthLevel": "고등학생 심화 탐구형",
  "defaultWritingStyle": "교과 개념 → 실제 문제 → 자료 해석/모델링 → 전공 확장 → 심화 탐구",
  "defaultTargetStructure": [
    "중요성",
    "추천 주제",
    "관련 키워드",
    "탐구 동기",
    "느낀점",
    "세특 문구 예시",
    "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?",
    "이 개념이 무엇이며 어떤 원리인가?",
    "어떤 문제를 해결할 수 있고, 왜 중요한가?",
    "실제 적용 및 문제 해결 과정",
    "교과목 연계 및 이론적 설명",
    "심화 탐구 발전 방안",
    "참고문헌 및 자료"
  ],
  "sectionPurpose": {
    "중요성": "선택 주제가 현재 사회·기술·전공 분야에서 왜 중요한지 제시한다.",
    "추천 주제": "학생의 선택 흐름을 바탕으로 보고서 제목을 제안한다.",
    "관련 키워드": "핵심 개념·기술·자료 해석 요소를 정리한다.",
    "탐구 동기": "교과 수업에서 생긴 질문이 실제 문제로 확장되는 흐름을 작성한다.",
    "느낀점": "탐구 과정에서 깨달은 점과 진로 의식을 연결한다.",
    "세특 문구 예시": "교과 개념 활용, 자료 해석, 전공 연계, 문제 해결력을 드러내는 문장으로 작성한다.",
    "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?": "선택 개념의 진로·학업적 의미를 설명한다.",
    "이 개념이 무엇이며 어떤 원리인가?": "핵심 원리를 고등학생 수준에서 구체적으로 설명한다.",
    "어떤 문제를 해결할 수 있고, 왜 중요한가?": "현실 문제와 해결 필요성을 연결한다.",
    "실제 적용 및 문제 해결 과정": "원리→현상→문제→해결 방안의 단계적 과정을 제시한다.",
    "교과목 연계 및 이론적 설명": "관련 교과 개념을 단순 나열이 아니라 이론적 연결로 설명한다.",
    "심화 탐구 발전 방안": "다음 단계에서 탐구할 수 있는 구체적 확장 주제를 제안한다.",
    "참고문헌 및 자료": "도서, 논문, 기관 자료, 기사 등을 보고서 근거로 제시한다."
  },
  "miniWritingRules": [
    "도서는 단순 독후감으로 요약하지 않는다.",
    "선택 도서는 보고서의 근거 프레임, 비교 관점, 한계 논의, 결론 확장에 배치한다.",
    "학과와 직접 맞지 않는 확장 참고 도서는 본문 핵심 이론이 아니라 결론 확장 또는 비교 관점으로 제한한다.",
    "학생 수준을 넘는 대학원급 수식·전문 알고리즘은 설명 중심으로 낮추어 작성한다.",
    "교과 개념 → 실제 문제 → 해결 과정 → 교과 연계 → 심화 방안의 흐름을 유지한다.",
    "참고문헌은 보고서 내용과 연결되는 방식으로만 사용한다."
  ]
};
  const SECTION_TEMPLATES = {
  "version": "report-section-templates-v1",
  "templates": {
    "중요성": {
      "prompt": "{keyword}는 {department}와 연결될 때 단순한 교과 개념이 아니라 실제 기술·사회 문제를 해결하는 핵심 주제로 확장된다.",
      "requiredInputs": [
        "keyword",
        "department",
        "axis"
      ]
    },
    "추천 주제": {
      "prompt": "{keyword}를 {axis} 관점에서 해석하여 {department}와 연결되는 탐구 주제를 제안한다.",
      "titlePattern": "{keyword}와 {department}의 연결: {axis} 기반 탐구"
    },
    "탐구 동기": {
      "prompt": "수업에서 배운 {concept}이 실제 {keyword} 문제와 어떻게 이어지는지 질문을 만들고, 이를 {department} 관점에서 탐구하게 된 이유를 서술한다."
    },
    "느낀점": {
      "prompt": "탐구를 통해 교과 개념이 실제 문제 해결과 연결된다는 점, 그리고 진로 분야에서 어떤 역량이 필요한지 깨달은 점을 쓴다."
    },
    "세특 문구 예시": {
      "prompt": "{concept}을 바탕으로 {keyword}를 분석하고, {axis} 관점에서 자료 해석과 전공 연계를 수행한 점을 드러낸다."
    },
    "이 개념이 무엇이며 어떤 원리인가?": {
      "prompt": "{concept}의 핵심 원리를 고등학생이 이해할 수 있는 수준으로 설명하고, {keyword}와 연결되는 과학적·수학적 원리를 제시한다."
    },
    "어떤 문제를 해결할 수 있고, 왜 중요한가?": {
      "prompt": "{keyword}가 실제로 어떤 문제를 만들고, {department} 관점에서 왜 해결해야 하는지 설명한다."
    },
    "실제 적용 및 문제 해결 과정": {
      "prompt": "문제 상황을 단계별로 나누고, {axis}에 맞춰 자료 수집·해석·모델링·검증·해결 방안을 제시한다."
    },
    "교과목 연계 및 이론적 설명": {
      "prompt": "{subject}를 중심으로 수학, 과학, 정보, 사회 교과가 어떻게 연결되는지 설명한다."
    },
    "심화 탐구 발전 방안": {
      "prompt": "현재 보고서를 바탕으로 더 깊게 확장할 수 있는 실험, 자료 분석, 비교 연구, 전공 심화 주제를 제안한다."
    },
    "참고문헌 및 자료": {
      "prompt": "선택 도서와 추가 자료가 보고서의 어느 부분에 사용되는지 역할 중심으로 정리한다."
    }
  }
};
  const AXIS_RULES = {
  "version": "axis-report-development-rules-v1",
  "axisRules": {
    "math_data_modeling": {
      "name": "수리·데이터 모델링 축",
      "writingPattern": "현상 관찰 → 변수 설정 → 자료 수집 → 수리/통계 모델링 → 예측 또는 해석 → 한계 논의",
      "bestSections": [
        "실제 적용 및 문제 해결 과정",
        "교과목 연계 및 이론적 설명",
        "심화 탐구 발전 방안"
      ],
      "dataExamples": [
        "측정값",
        "시계열 자료",
        "그래프",
        "통계 지표",
        "모델 예측값"
      ],
      "avoidPattern": "수치 자료 없이 현상 설명만 나열하지 않는다."
    },
    "physics_system": {
      "name": "물리·시스템 해석 축",
      "writingPattern": "물리 원리 → 시스템 구조 → 에너지/신호/오차 발생 → 제어·보정 방식 → 실제 기술 적용",
      "bestSections": [
        "이 개념이 무엇이며 어떤 원리인가?",
        "실제 적용 및 문제 해결 과정",
        "교과목 연계 및 이론적 설명"
      ],
      "dataExamples": [
        "에너지 전달",
        "오차",
        "센서 입력",
        "측정값",
        "시스템 반응"
      ],
      "avoidPattern": "기술 명칭만 나열하고 물리 원리를 설명하지 않는 방식은 피한다."
    },
    "earth_environment_data": {
      "name": "지구·환경 데이터 해석 축",
      "writingPattern": "환경 현상 → 관측 자료 → 원인 분석 → 사회·기술적 영향 → 대응 방안 → 확장 탐구",
      "bestSections": [
        "중요성",
        "어떤 문제를 해결할 수 있고, 왜 중요한가?",
        "심화 탐구 발전 방안"
      ],
      "dataExamples": [
        "기온",
        "습도",
        "강수량",
        "대기질",
        "위성 자료",
        "지역별 비교 자료"
      ],
      "avoidPattern": "환경 문제를 감상문처럼 쓰지 않고 자료와 원인 분석을 포함한다."
    },
    "generic_science_method": {
      "name": "과학 방법·측정 일반 축",
      "writingPattern": "측정 필요성 → 측정 기준 → 오차와 한계 → 해석 방식 → 객관성 확보 방안",
      "bestSections": [
        "이 개념이 무엇이며 어떤 원리인가?",
        "교과목 연계 및 이론적 설명",
        "느낀점"
      ],
      "dataExamples": [
        "측정 기준",
        "오차",
        "표준",
        "관찰 결과",
        "비교 자료"
      ],
      "avoidPattern": "측정을 단순 기록으로만 설명하지 않고 해석 기준과 한계를 함께 다룬다."
    }
  }
};
  const KEYWORD_RULES = {
  "version": "keyword-report-frame-rules-v1",
  "genericKeywordFrames": {
    "폭염": {
      "problemContext": "폭염은 단순 기상 현상이 아니라 측정 기준, 예측 모델, 도시 구조, 사회적 대응 체계가 함께 작동하는 복합 문제이다.",
      "possibleTopicDirections": [
        "폭염주의보 기준과 실제 체감 위험의 차이",
        "기상 데이터 기반 폭염 예측 모델의 한계",
        "도시 열섬과 폭염 경보 시스템의 개선"
      ],
      "relatedData": [
        "기온",
        "습도",
        "체감온도",
        "온열질환자 수",
        "도시 열섬",
        "지역별 경보 발령 횟수"
      ]
    },
    "측정": {
      "problemContext": "측정은 단순한 숫자 기록이 아니라 현상을 해석하고 판단하는 기준을 만드는 과정이다.",
      "possibleTopicDirections": [
        "측정 기준이 달라질 때 결과 해석이 어떻게 달라지는가",
        "오차와 표준이 과학적 판단에 미치는 영향",
        "센서 데이터의 신뢰성과 실제 의사결정"
      ],
      "relatedData": [
        "오차",
        "표준",
        "반복 측정",
        "센서값",
        "기준값"
      ]
    },
    "데이터": {
      "problemContext": "데이터는 실제 문제를 수치화해 분석하고 예측하는 근거이지만, 수집 방식과 해석 기준에 따라 결론이 달라질 수 있다.",
      "possibleTopicDirections": [
        "데이터 기반 예측 모델의 가능성과 한계",
        "자료 해석에서 생기는 편향과 오차",
        "전공 분야에서 데이터가 의사결정에 활용되는 방식"
      ],
      "relatedData": [
        "표본",
        "그래프",
        "상관관계",
        "모델",
        "예측값",
        "오차"
      ]
    }
  }
};

  function val(v){ return String(v || "").trim(); }
  function arr(v){ return Array.isArray(v) ? v.filter(Boolean) : []; }
  function normalize(v){ return String(v || "").toLowerCase().replace(/\s+/g, " ").trim(); }

  function getState(){
    return global.__TEXTBOOK_HELPER_STATE__ || {};
  }

  function getBookResult(){
    return typeof global.__BOOK_210_GET_LAST_RESULT__ === "function"
      ? global.__BOOK_210_GET_LAST_RESULT__()
      : null;
  }

  function getSelectedBookFromResult(result, state){
    if (!result || !result.result) return null;
    const all = arr(result.result.directBooks).concat(arr(result.result.expansionBooks));
    const selected = val(state.selectedBook);
    if (selected) {
      return all.find(b => [b.sourceId, b.bookId, String(b.managementNo), b.title].map(val).includes(selected)) || all[0] || null;
    }
    return all[0] || null;
  }

  function inferAxisRule(result, payload){
    const axisProfile = result?.result?.debug?.axisProfile || "";
    const axisRules = AXIS_RULES.axisRules || {};
    if (axisRules[axisProfile]) return { id: axisProfile, ...axisRules[axisProfile] };

    const text = normalize([payload.followupAxis, payload.selectedRecommendedKeyword].join(" "));
    for (const [id, rule] of Object.entries(axisRules)) {
      if ((rule.name && text.includes(normalize(rule.name))) || (rule.bestSections || []).some(s => text.includes(normalize(s)))) {
        return { id, ...rule };
      }
    }
    return { id: "generic_science_method", ...(axisRules.generic_science_method || {}) };
  }

  function inferKeywordFrame(payload){
    const text = normalize([payload.selectedRecommendedKeyword, payload.selectedConcept].join(" "));
    const frames = KEYWORD_RULES.genericKeywordFrames || {};
    for (const [key, frame] of Object.entries(frames)) {
      if (text.includes(normalize(key))) return { keywordKey: key, ...frame };
    }
    return null;
  }

  function buildReportGenerationContext(basePayload, selectedBook, result){
    const axisRule = inferAxisRule(result, basePayload);
    const keywordFrame = inferKeywordFrame(basePayload);
    const selectedBookContext = selectedBook?.selectedBookContext || null;

    return {
      reportOutputType: REPORT_CONTEXT_RULES.defaultOutputType,
      depthLevel: REPORT_CONTEXT_RULES.defaultDepthLevel,
      writingStyle: REPORT_CONTEXT_RULES.defaultWritingStyle,
      targetStructure: REPORT_CONTEXT_RULES.defaultTargetStructure,
      sectionPurpose: REPORT_CONTEXT_RULES.sectionPurpose,
      sectionTemplates: SECTION_TEMPLATES.templates,
      axisDevelopmentRule: axisRule,
      keywordReportFrame: keywordFrame,
      selectedBookContext,
      selectedBookUse: selectedBookContext ? {
        title: selectedBookContext.title,
        recommendationType: selectedBookContext.recommendationType,
        recommendationReason: selectedBookContext.recommendationReason,
        reportRole: selectedBookContext.reportRole,
        reportRoleLabels: selectedBookContext.reportRoleLabels,
        useInReport: selectedBookContext.useInReport,
        miniInstruction: selectedBookContext.miniInstruction,
        doNotUseAs: selectedBookContext.doNotUseAs,
        bestFor: selectedBookContext.bestFor
      } : null,
      writingRules: REPORT_CONTEXT_RULES.miniWritingRules
    };
  }

  function buildMiniPayload(overrides){
    const state = getState();
    const result = getBookResult();
    const payload = result?.payload || {
      subject: state.subject || "",
      department: state.career || state.selectedMajor || "",
      selectedConcept: state.concept || state.selectedConcept || "",
      selectedRecommendedKeyword: state.keyword || state.selectedKeyword || "",
      followupAxis: state.axisLabel || state.linkTrack || state.followupAxisId || "",
      reportIntent: "보고서 근거 도서"
    };

    const selectedBook = getSelectedBookFromResult(result, state);

    const miniPayload = {
      version: BUILDER_VERSION,
      createdAt: new Date().toISOString(),
      source: "keyword-engine",
      selectionPayload: {
        subject: payload.subject || "",
        department: payload.department || "",
        selectedConcept: payload.selectedConcept || "",
        selectedRecommendedKeyword: payload.selectedRecommendedKeyword || "",
        selectedKeyword: payload.selectedRecommendedKeyword || "",
        followupAxis: payload.followupAxis || "",
        selectedFollowupAxis: payload.followupAxis || "",
        reportIntent: payload.reportIntent || ""
      },
      selectedBook: selectedBook ? {
        managementNo: selectedBook.managementNo,
        sourceId: selectedBook.sourceId,
        title: selectedBook.title,
        author: selectedBook.author,
        recommendationType: selectedBook.matchType,
        matchScore: selectedBook.matchScore,
        bookDomains: selectedBook.bookDomains || [],
        matchReasons: selectedBook.matchReasons || [],
        selectedBookContext: selectedBook.selectedBookContext || null
      } : null,
      reportGenerationContext: buildReportGenerationContext(payload, selectedBook, result),
      rawBookResultDebug: result?.result?.debug || null
    };

    return Object.assign(miniPayload, overrides || {});
  }

  global.MiniReportPayloadBuilder = {
    version: BUILDER_VERSION,
    buildMiniPayload,
    buildReportGenerationContext,
    getCurrentState: getState
  };

  global.__BUILD_MINI_REPORT_PAYLOAD__ = buildMiniPayload;
})(typeof window !== "undefined" ? window : globalThis);
