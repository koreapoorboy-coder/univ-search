// integrated_engine_bootstrap.js
// record_pattern_library까지 반영한 업그레이드 버전

import { loadIntegratedEngine, runBasicRecommendation } from "./integrated_engine_loader.js";

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function pickTrackFromTags(tags = {}) {
  const majors = tags.major_tags || [];
  const themes = tags.theme_tags || [];

  if (majors.includes("AI/SW")) return "AI·소프트웨어";
  if (majors.includes("신소재공학")) return "신소재공학";
  if (majors.includes("화학공학")) return "화학공학";
  if (majors.includes("생명공학")) return "생명공학";
  if (majors.includes("환경공학")) return "환경공학";
  if (majors.includes("의약학")) return "의약·보건";

  if (themes.includes("AI/SW")) return "AI·소프트웨어";
  if (themes.includes("화학/에너지")) return "화학·에너지";
  if (themes.includes("생명")) return "생명과학";
  if (themes.includes("환경") || themes.includes("기후")) return "환경·기후";
  return "융합 탐구";
}

function textContainsAny(text, words) {
  return (words || []).some(w => text.includes(w));
}

function buildStudentJoinedText(taggedStudent = {}) {
  return [
    ...(taggedStudent.theme_tags || []),
    ...(taggedStudent.method_tags || []),
    ...(taggedStudent.thinking_tags || []),
    ...(taggedStudent.major_tags || [])
  ].join(" ");
}

function scorePattern(pattern = {}, taggedStudent = {}) {
  const joined = buildStudentJoinedText(taggedStudent);
  let score = 0;

  const track = pattern.track || "";
  const patternType = pattern.pattern_type || "";

  if (track.includes("공학") && (taggedStudent.major_tags || []).includes("AI/SW")) score += 2;
  if (track.includes("생명") && (taggedStudent.theme_tags || []).includes("생명")) score += 2;
  if (track.includes("환경") && ((taggedStudent.theme_tags || []).includes("환경") || (taggedStudent.theme_tags || []).includes("기후"))) score += 2;
  if (track.includes("인문") && (taggedStudent.method_tags || []).includes("논증")) score += 2;

  if (patternType.includes("데이터") && (taggedStudent.method_tags || []).includes("데이터분석")) score += 3;
  if (patternType.includes("표현") && ((taggedStudent.method_tags || []).includes("발표/토론") || (taggedStudent.method_tags || []).includes("논증"))) score += 3;
  if (patternType.includes("강한 일관성") && (taggedStudent.major_tags || []).length > 0) score += 2;

  (pattern.core_features || []).forEach(x => {
    if (textContainsAny(joined, String(x).split(/[^0-9A-Za-z가-힣]+/).filter(Boolean))) score += 1;
  });
  (pattern.strength_signals || []).forEach(x => {
    if (textContainsAny(joined, String(x).split(/[^0-9A-Za-z가-힣]+/).filter(Boolean))) score += 1;
  });

  return score;
}

function pickRecordPattern(taggedStudent, recordPatterns = []) {
  const scored = (recordPatterns || []).map(p => ({ ...p, _score: scorePattern(p, taggedStudent) }))
    .sort((a, b) => b._score - a._score);
  return scored[0] || null;
}

function buildPatternInterpretation(bestPattern, taggedStudent) {
  if (!bestPattern) {
    return {
      current_position: "일반 학생부 비교 기준상 아직 뚜렷한 패턴 판정 전 단계",
      strength_view: ["패턴 비교 데이터가 더 쌓이면 현재 위치 판단이 더 정확해질 수 있음"],
      weakness_view: ["일반 학생부 비교 기준이 아직 충분히 매칭되지 않음"],
      coaching_message: "현재는 합격생 기준보다 일반 학생부 패턴 기준을 더 많이 쌓아 현실 보정을 강화하는 것이 좋다."
    };
  }

  return {
    current_position: `일반 학생부 비교 기준상 현재 기록은 '${bestPattern.pattern_type}' 패턴에 가장 가깝다.`,
    strength_view: bestPattern.strength_signals || [],
    weakness_view: bestPattern.weakness_signals || [],
    coaching_message: bestPattern.recommended_use || "일반 학생부 비교 기준으로 참고 가능"
  };
}

function buildSummary(taggedStudent, basic, patternInterp) {
  const track = pickTrackFromTags(taggedStudent);
  const firstExt = basic.matchedExtensions?.[0];
  const firstCase = basic.matchedCases?.[0];

  return [
    `이 학생은 ${track} 방향의 탐구를 실제 수행 활동으로 연결하기 좋은 구조를 갖고 있다.`,
    firstExt
      ? `가장 먼저 검토할 확장 방향은 "${firstExt.title}" 계열 탐구이다.`
      : `우선은 학생 원문 태그를 더 정교하게 잡은 뒤 확장 방향을 좁히는 것이 좋다.`,
    firstCase
      ? `합격생 비교 기준으로는 ${firstCase.university} ${firstCase.major} 유형의 패턴과 일부 맞닿아 있다.`
      : `합격생 비교는 태그 정교화 이후 더 정확해질 수 있다.`,
    patternInterp?.current_position || "일반 학생부 비교 기준은 아직 판정 전 단계이다."
  ];
}

function classifyReason(title = "", taggedStudent = {}) {
  const themes = taggedStudent.theme_tags || [];
  const methods = taggedStudent.method_tags || [];
  const majors = taggedStudent.major_tags || [];

  if (title.includes("미세먼지") || title.includes("대기")) {
    return "환경 데이터를 단순 해석하는 수준을 넘어, 변수 비교·패턴 분석·개선 방안 설계까지 이어지는 연구 흐름을 만들 수 있기 때문";
  }
  if (title.includes("신소재")) {
    return "공학 탐구를 소재·기술 변화의 맥락으로 넓힐 수 있기 때문";
  }
  if (title.includes("안전사고") || title.includes("장치")) {
    return "제작·설계형 활동으로 실제 구현 역량을 드러내기 좋기 때문";
  }
  if (majors.includes("AI/SW")) return "AI·소프트웨어 관심을 데이터·설계형 탐구로 이어가기 좋기 때문";
  if (majors.includes("환경공학")) return "환경 문제를 데이터 기반으로 해석하고 해결 아이디어까지 연결할 수 있기 때문";
  if (themes.includes("생명")) return "생명과학적 이해를 데이터·모델링 또는 실험형 탐구로 발전시키기 좋기 때문";
  if (methods.includes("실험")) return "이미 보유한 실험 경험을 더 구조화된 탐구로 바꾸기 좋기 때문";
  return "현재 기록에서 드러난 관심 축과 수행 방식이 자연스럽게 이어질 수 있기 때문";
}

function roadmapByTitle(title = "", taggedStudent = {}) {
  const subjectHint = taggedStudent.subject || "";
  if (title.includes("미세먼지") || title.includes("대기")) {
    return {
      direction: "환경 데이터를 기반으로 미세먼지 발생 조건을 분석하고, 변수에 따른 변화 패턴을 설명하는 탐구",
      start: "미세먼지는 어떤 조건에서 증가하는가를 핵심 질문으로 두고, 시간·계절·기온·풍속 등의 변수를 기준으로 문제를 정의한다.",
      expand: "공공 데이터 또는 측정 데이터를 활용해 조건별 미세먼지 변화를 비교하고, 그래프와 표로 패턴을 시각화한다.",
      deepen: "도출된 패턴을 바탕으로 증가 원인을 설명하고, 조건에 따른 차이를 해석하는 단계까지 연결한다.",
      complete: "조건에 따른 변화 차이와 그 원인을 구조적으로 정리하고, 해석 중심으로 결론을 도출한다.",
      outputs: ["조건별 미세먼지 수치 비교 그래프", "시간대·계절별 변화 정리표", "분석 결과가 담긴 탐구 보고서", "발표용 슬라이드"],
      record_points: ["변수 설정과 비교 기준을 스스로 만든 과정", "데이터를 기반으로 패턴을 해석한 내용", "조건에 따른 결과 차이를 설명한 과정"]
    };
  }

  if (title.includes("신소재")) {
    return {
      direction: "기술 변화 속에서 신소재의 역할과 적용 가능성을 해석하는 공학 연결형 탐구",
      start: "신소재가 실제 산업이나 생활에서 어떤 문제를 해결했는지 대표 사례를 정리하며 탐구 질문을 설정한다.",
      expand: "기존 소재와 새로운 소재를 성질·효율·안전성 기준으로 비교하고 차이를 표로 정리한다.",
      deepen: "배터리, 센서, 로봇 부품 등 자신의 관심 분야와 연결되는 응용 사례를 좁혀 해석한다.",
      complete: "왜 이 소재가 필요했는지, 어떤 장점과 한계가 있는지까지 정리해 공학적 의미를 설명한다.",
      outputs: ["기존 소재와 신소재 비교표", "적용 사례 정리 자료", "해석 중심 탐구 보고서", "발표용 요약 자료"],
      record_points: ["비교 기준을 세워 사례를 정리한 과정", "과학 개념을 실제 기술에 연결한 내용", "소재 변화의 의미와 한계를 해석한 과정"]
    };
  }

  if (title.includes("안전사고") || title.includes("장치")) {
    return {
      direction: "센서나 장치를 활용해 문제 상황을 직접 측정하고 해결 방안을 설계하는 구현형 탐구",
      start: "실생활 안전 문제나 측정 상황을 하나 정하고, 어떤 조건에서 문제가 발생하는지 구조적으로 정리한다.",
      expand: "센서 활용, 경고 장치, 자동 제어 요소 중 필요한 기능을 골라 구조를 설계하거나 데이터를 직접 측정한다.",
      deepen: "간단한 회로, 모형, 프로그램, 동작 시뮬레이션 중 가능한 방식으로 해결 아이디어를 구체화한다.",
      complete: "설계한 장치가 어떤 문제를 해결하는지, 실제 적용 시 한계와 개선 방향은 무엇인지 함께 정리한다.",
      outputs: ["센서 측정 데이터 정리표", "장치 구조도 또는 회로 스케치", "설계 보고서", "시연 자료 또는 프로토타입 설명서"],
      record_points: ["문제 상황을 분석하고 조건을 설정한 과정", "직접 측정하거나 설계한 수행 경험", "해결 아이디어를 구조화한 내용", "한계와 개선 방향까지 정리한 태도"]
    };
  }

  return {
    direction: `${subjectHint || "교과"}에서 출발해 질문을 만들고 결과까지 정리하는 확장 탐구`,
    start: "현재 과목에서 다룬 개념 중 관심 주제를 하나 고른 뒤, 왜 궁금한지 질문으로 정리한다.",
    expand: "자료 조사, 데이터 분석, 실험, 제작 중 가능한 방법을 골라 탐구 절차를 설계한다.",
    deepen: "진로와 연결되는 응용 사례를 붙여 탐구 범위를 좁히고 비교 기준을 만든다.",
    complete: "과정, 근거, 해석이 드러나도록 결과를 정리하고 보고서나 발표 자료로 마무리한다.",
    outputs: ["탐구 질문과 절차가 정리된 활동 계획서", "결과와 해석이 담긴 탐구 보고서", "발표 자료 또는 요약 포스터"],
    record_points: ["질문을 만들고 방법을 선택한 과정", "수집한 자료를 바탕으로 해석한 내용", "결과를 정리하고 의미를 설명한 과정"]
  };
}


function buildExtensionComment(title = "", taggedStudent = {}) {
  const majors = taggedStudent.major_tags || [];
  if (title.includes("미세먼지") || title.includes("대기")) {
    return "미세먼지 탐구는 환경 문제를 단순 조사로 끝내지 않고, 데이터를 비교하고 원인을 해석한 뒤 해결 방향까지 제시할 수 있어 학생의 분석력과 문제 해결 과정을 함께 보여주기에 적합하다.";
  }
  if (title.includes("센서") || title.includes("측정") || title.includes("장치") || title.includes("안전사고")) {
    return "이 탐구는 직접 측정하거나 장치를 설계하는 과정이 포함되므로, 자료 조사형 활동보다 실제 수행 능력과 구현 역량을 더 분명하게 보여주기에 적합하다.";
  }
  if (title.includes("신소재")) {
    return "신소재 탐구는 과학 개념을 실제 기술 변화와 연결해 해석할 수 있어, 관심 분야를 단순 흥미가 아니라 공학적 이해로 발전시키는 데 유리하다.";
  }
  if (majors.includes("AI/SW")) {
    return "이 탐구는 AI·소프트웨어 관심을 문제 정의, 데이터 해석, 설계 과정으로 연결해 활동의 방향성과 전공 관심을 함께 보여주기에 적합하다.";
  }
  return "이 탐구는 현재 학생의 관심 주제를 하나의 대표 활동으로 정리하고, 과정·결과·해석을 생활기록부에 더 분명하게 남기기에 적합하다.";
}

function buildExtensionRecommendations(taggedStudent, basic) {
  const items = (basic.matchedExtensions || []).slice(0, 3);
  return items.map((x, i) => {
    const roadmap = roadmapByTitle(x.title, taggedStudent);
    return {
      priority: i + 1,
      title: x.title,
      direction: roadmap.direction,
      why_this: classifyReason(x.title, taggedStudent),
      start: roadmap.start,
      expand: roadmap.expand,
      deepen: roadmap.deepen,
      complete: roadmap.complete,
      outputs: roadmap.outputs,
      record_points: roadmap.record_points,
      consultant_comment: buildExtensionComment(x.title, taggedStudent)
    };
  });
}

function explainCase(caseItem = {}, taggedStudent = {}) {
  const majors = taggedStudent.major_tags || [];
  if ((caseItem.major || "").includes("생물") || (caseItem.major || "").includes("생명")) {
    return "데이터·탐구 기반 활동을 생명과학적 해석과 연결하는 패턴을 참고할 수 있다.";
  }
  if ((caseItem.major || "").includes("전파") || (caseItem.major || "").includes("통신")) {
    return "공학·정보·센서·시스템 설계 축을 연결하는 방식이 참고된다.";
  }
  if ((caseItem.major || "").includes("화학공학")) {
    return "과학 개념을 실제 문제 해결형 탐구로 확장하는 방식이 참고된다.";
  }
  if (majors.includes("AI/SW")) {
    return "AI·소프트웨어 관심을 구현·설계 활동으로 보여주는 방식이 참고된다.";
  }
  return "활동의 방향성과 전공 연결성을 정리하는 기준 사례로 활용할 수 있다.";
}

function buildAdmissionMatches(taggedStudent, basic) {
  return (basic.matchedCases || []).slice(0, 3).map(x => ({
    university: x.university,
    major: x.major,
    why_similar: explainCase(x, taggedStudent),
    use_point: "같은 학과를 목표로 한다기보다, 어떤 활동 구조와 연결 방식을 참고할지 보는 용도로 활용"
  }));
}

function buildEvaluationInterpretation(taggedStudent = {}, basic = {}) {
  const evidence = taggedStudent.evidence_tags || [];
  const methods = taggedStudent.method_tags || [];
  const thinking = taggedStudent.thinking_tags || [];

  const academic = methods.includes("데이터분석") || thinking.includes("정량분석")
    ? "교과 개념을 분석과 해석으로 연결하는 학업 수행력이 보인다."
    : "기본 학업 수행은 보이지만 분석 근거를 더 분명히 드러내면 좋다.";

  const career = (taggedStudent.major_tags || []).length
    ? "진로 방향은 비교적 보이지만, 한 축을 중심으로 더 선명하게 묶으면 좋다."
    : "진로 방향 태그가 약하므로 전공 연결 키워드를 더 분명히 잡을 필요가 있다.";

  const community = evidence.includes("객관적 사실")
    ? "기록의 신뢰도는 나쁘지 않지만 협업·소통 장면은 별도 보강하면 좋다."
    : "활동 증거는 있으나 협업·공동체 맥락은 추가 보강이 필요하다.";

  const overall = basic.diagnostics?.length
    ? basic.diagnostics.join(" / ")
    : "현재 기록은 탐구 수행의 방향성은 있으나, 해석 문장을 더 명확히 만드는 보강이 필요하다.";

  return { academic, career, community, overall };
}

function buildActionPlan(taggedStudent, extensionRecs, patternInterp) {
  const first = extensionRecs[0];
  const track = pickTrackFromTags(taggedStudent);
  return [
    {
      step: 1,
      title: "핵심 탐구 축 1개 확정",
      goal: `${track} 방향에서 가장 먼저 할 탐구 주제를 1개로 좁힌다.`
    },
    {
      step: 2,
      title: "수행 방법 결정",
      goal: first
        ? `${first.title}를 기준으로 데이터 분석·실험·설계 중 실제 가능한 방식을 선택한다.`
        : "자료 조사 / 데이터 분석 / 실험 중 실제 수행 가능한 방식을 고른다."
    },
    {
      step: 3,
      title: "일반 학생부 패턴 보정",
      goal: patternInterp?.weakness_view?.length
        ? `현재 약점으로 읽히는 요소(${patternInterp.weakness_view.join(", ")})를 보완하는 방향으로 결과를 정리한다.`
        : "일반 학생부 비교 기준을 바탕으로 현실적인 보완 포인트를 점검한다."
    }
  ];
}

export async function bootIntegratedEngine(taggedStudent, options = {}) {
  const integratedIndexPath = options.integratedIndexPath || "../integrated_engine_index.json";
  const engine = await loadIntegratedEngine(integratedIndexPath);
  const basic = runBasicRecommendation(taggedStudent, engine);

  const recordPatternLayer = engine?.layerData?.record_pattern_library;
  const patternLibrary = recordPatternLayer?.active_pattern_library?.data?.patterns || [];
  const bestPattern = pickRecordPattern(taggedStudent, patternLibrary);
  const patternInterp = buildPatternInterpretation(bestPattern, taggedStudent);

  const extensionRecs = buildExtensionRecommendations(taggedStudent, basic);
  const caseMatches = buildAdmissionMatches(taggedStudent, basic);

  return {
    student_id: taggedStudent?.student_id || "",
    summary: buildSummary(taggedStudent, basic, patternInterp),
    record_diagnosis: {
      one_line: "현재 화면은 추천 이름보다 어떻게 수행할지, 그리고 일반 학생부와 비교해 어떤 패턴에 가까운지가 보이도록 재구성된 출력이다.",
      strengths: uniq([
        ...(taggedStudent?.theme_tags || []),
        ...(taggedStudent?.method_tags || []),
        ...(patternInterp?.strength_view || [])
      ]).slice(0, 6),
      limits: uniq([
        "추천 주제를 그대로 쓰기보다 학교에서 실제 수행 가능한 범위로 축소 필요",
        "한 번에 많은 주제를 벌리기보다 1~2개를 깊게 가져가는 것이 유리",
        ...((patternInterp?.weakness_view || []).slice(0, 3))
      ])
    },
    current_pattern_position: patternInterp,
    curriculum_check: {
      fit: "점검 완료",
      selected_subjects_comment: "현재 선택과목은 진로 방향과 연결 가능성이 있다. 다만 주제를 한 축으로 더 모아주면 해석이 선명해진다.",
      sequence_comment: "교과 선택은 유지하되, 이후 탐구는 데이터형/설계형/실험형 중 하나로 중심을 잡는 것이 좋다."
    },
    extension_recommendations: extensionRecs,
    admission_case_matches: caseMatches,
    evaluation_interpretation: buildEvaluationInterpretation(taggedStudent, basic),
    action_plan: buildActionPlan(taggedStudent, extensionRecs, patternInterp),
    report_design: extensionRecs.slice(0, 2).map(x => ({
      topic: x.title,
      method: x.expand,
      output: x.outputs.join(" / ")
    })),
    notes: "교사가 작성하는 문장을 대신 만드는 것이 아니라, 학생이 실제로 할 수 있는 수행 방식과 결과 형태, 그리고 일반 학생부 비교 기준상 현재 위치가 보이도록 설계한 출력"
  };
}
