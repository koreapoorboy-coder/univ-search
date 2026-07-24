(function(global){
  "use strict";
  const VERSION = "decision-flow-payload-adapter-v1.0.0";
  global.__DECISION_FLOW_PAYLOAD_ADAPTER_VERSION__ = VERSION;

  function $(id){ return document.getElementById(id); }
  function text(v){ return String(v == null ? "" : v).trim(); }
  function read(id){ return text($(id)?.value); }
  function first(arr, fallback=""){ return Array.isArray(arr) && arr.length ? arr[0] : fallback; }
  function categoryLabel(id){ return ({engineering:"공학계열",natural:"자연과학계열",medical:"의약·보건계열"})[id] || id; }

  function build(){
    const state = global.__DECISION_FLOW_STATE__ || {};
    const connection = state.finalContext || state.preview || null;
    const cross = connection?.cross_axis || {};
    const structure = cross.structure || {id:read("reportLine") || "structure_research_report",sections:[]};
    const reportMode = read("reportMode") || connection?.assessment_route?.recommendedReportMode || "연구보고서형";
    const reportView = read("reportView") || "원리";
    const method = first(connection?.interpreter?.methodAxes, connection?.assessment_route?.recommendedMethod || "보고서작성형");
    const output = first(connection?.interpreter?.outputAxes, connection?.assessment_route?.recommendedOutput || "탐구보고서");
    const selectedConcept = read("selectedConcept") || first(cross?.topic?.subjectConcepts, read("subject"));
    const selectedKeyword = read("keyword") || cross?.seedMatch?.seed?.sourceTitle || cross?.topic?.generatedTitle || selectedConcept;
    const category = read("career");
    const bookTitle = state.bookMode === "useBook" ? text(state.bookTitle || read("selectedBookTitle")) : "";
    const autoAxis = `${categoryLabel(category)} 교과 확장 축`;
    const selectedBook = bookTitle ? {title:bookTitle,author:"",source:"student_selected_from_assignment_signal"} : null;

    return {
      version: VERSION,
      source: "decision_flow",
      selectionPayload: {
        subject: read("subject"),
        subjectGroup: read("subjectGroup"),
        department: category,
        departmentLabel: categoryLabel(category),
        selectedConcept,
        selectedRecommendedKeyword: selectedKeyword,
        selectedKeyword,
        followupAxis: autoAxis,
        selectedFollowupAxis: autoAxis,
        reportMode,
        reportView,
        reportLine: structure.id,
        structureId: structure.id,
        reportIntent: "수행평가 안내문 자동 해석 기반 완성 보고서 생성"
      },
      selectedBook,
      bookUsageMode: selectedBook ? "useBook" : "noBook",
      useBookInReport: !!selectedBook,
      reportGenerationContext: {
        decisionFlow: {
          version: VERSION,
          interpretationConfirmed: !!state.confirmed,
          interpretationOverride: state.override || null,
          selectedCategory: category,
          selectedCategoryLabel: categoryLabel(category),
          bookSignal: !!state.bookSignal,
          bookMode: state.bookMode || "noBook"
        },
        reportChoices: {
          mode: reportMode,
          modeLabel: reportMode,
          view: reportView,
          viewLabel: reportView,
          line: structure.id,
          lineLabel: structure.id,
          structureId: structure.id
        },
        targetStructure: structure.sections || [],
        structureId: structure.id,
        assessmentSeedCrossAxis: cross,
        performanceAssessment: {
          version: "assessment-auto-interpretation-v1",
          content: {source:"수행평가 안내문 자동 해석",concept:selectedConcept,keyword:selectedKeyword},
          method: {source:"task_interpreter_rules",reportMode,methodAxis:method},
          evidence: {source:"자동 평가 관점",reportView},
          outputLevel: {source:"structure_id",structureId:structure.id,sections:structure.sections || [],outputAxis:output},
          assessmentKeywordConnection: connection,
          runtimeEvidence: connection?.runtime_evidence || null,
          matchedAssessmentRoute: connection?.assessment_route || null
        },
        majorUsePolicy: cross?.majorPolicy || null,
        selectedBookContext: selectedBook
      }
    };
  }

  global.__BUILD_MINI_REPORT_PAYLOAD__ = build;
  global.getMiniNavigationSelectionData = function(){
    const p = build();
    return {
      student_context:{concept:p.selectionPayload.selectedConcept},
      track_context:{label:p.selectionPayload.selectedFollowupAxis},
      concept_context:{concept:p.selectionPayload.selectedConcept,keyword:p.selectionPayload.selectedKeyword},
      book_context:p.selectedBook || {},
      report_context:{mode:p.selectionPayload.reportMode,view:p.selectionPayload.reportView,line:p.selectionPayload.reportLine},
      decision_flow:p.reportGenerationContext.decisionFlow
    };
  };
})(window);
