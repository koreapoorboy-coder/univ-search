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
  const track = pickTrackFromTags(taggedStudent);

  if (!bestPattern) {
    return {
      current_position: `${track} 계열 관심은 확인되지만 전공 적합성의 핵심 축은 아직 정리 전`,
      strength_view: [
        "관심 분야와 활동 경험의 연결은 이미 확인됨",
        "초기 탐색 단계로서 진로 축을 구체화할 수 있는 재료는 확보됨"
      ],
      weakness_view: [
        "대표 활동 1~2개를 중심으로 기록을 선명하게 묶을 필요가 있음",
        "무엇을 했는지보다 무엇을 검증했고 어떻게 해석했는지까지 정리할 필요가 있음"
      ],
      coaching_message: `${track} 방향의 관심과 활동 경험은 확인된다. 다만 아직은 전공 적합성을 설명하는 핵심 축이 정리되기 전 단계이므로, 여러 활동을 넓게 제시하기보다 대표 탐구를 선정해 과정·근거·결론이 보이도록 정리하는 것이 우선이다.`
    };
  }

  const positionMap = {
    "데이터 분석형": `${track} 계열에서 데이터 해석 역량이 확인되는 상태`,
    "표현·논증형": `${track} 계열에서 해석·논증 역량이 확인되는 상태`,
    "강한 일관성형": `${track} 중심 전공 적합성이 구조적으로 형성된 상태`,
    "실험 설계형": `${track} 계열에서 탐구 설계 역량이 확인되는 상태`,
    "제작 구현형": `${track} 계열에서 실제 구현 역량이 확인되는 상태`
  };

  const strengthMap = {
    "데이터 분석형": [
      "자료 수집과 비교 분석을 통해 근거 기반 해석이 가능함",
      "데이터를 활용해 주제를 구조적으로 설명할 수 있음",
      "교과 개념을 수치·그래프·비교 결과와 연결할 가능성이 높음"
    ],
    "표현·논증형": [
      "주장을 근거와 함께 설명하는 해석 역량이 확인됨",
      "탐구 결과를 말이나 글로 구조화할 수 있음",
      "교과 개념을 자신의 관점으로 재해석하는 힘이 보임"
    ],
    "강한 일관성형": [
      "전공 방향성이 활동 전반에 일관되게 반영됨",
      "교과 개념이 실제 활동으로 확장되는 구조가 형성됨",
      "수행 기반 결과물이 존재하는 활동 구조가 확인됨"
    ],
    "실험 설계형": [
      "문제 설정과 변수 통제를 포함한 탐구 설계 역량이 확인됨",
      "실험 절차를 바탕으로 결과를 검증하는 흐름을 만들 수 있음",
      "교과 개념을 실제 탐구 과정으로 전환하는 힘이 보임"
    ],
    "제작 구현형": [
      "아이디어를 실제 제작·구현으로 연결한 수행 흔적이 확인됨",
      "설계와 실행을 바탕으로 전공 관심을 구체화한 경험이 있음",
      "문제 해결을 결과물 중심으로 보여줄 수 있는 강점이 있음"
    ]
  };

  const weaknessMap = {
    "데이터 분석형": [
      "분석 결과를 전공 관심과 연결해 해석하는 문장이 더 필요함",
      "데이터를 제시하는 수준을 넘어 비교 기준과 결론을 명확히 해야 함"
    ],
    "표현·논증형": [
      "설명은 좋지만 실제 수행 근거가 함께 제시되면 설득력이 더 높아짐",
      "주장과 근거를 탐구 결과와 연결하는 구조 보강이 필요함"
    ],
    "강한 일관성형": [
      "대표 탐구의 결과 해석이 부족함",
      "개별 활동을 하나의 연구 흐름으로 묶는 정리가 더 필요함"
    ],
    "실험 설계형": [
      "실험 결과 해석과 한계 분석이 함께 제시되면 완성도가 높아짐",
      "설계 과정이 실제 진로 방향과 어떻게 연결되는지 보강할 필요가 있음"
    ],
    "제작 구현형": [
      "결과물 소개를 넘어 설계 의도와 개선 과정을 정리해야 함",
      "구현 경험을 교과 개념 및 진로 축과 연결하는 설명이 더 필요함"
    ]
  };

  const currentPosition = positionMap[bestPattern.pattern_type]
    || `${track} 계열에서 ${bestPattern.pattern_type} 강점이 확인되는 상태`;

  const mappedStrengths = strengthMap[bestPattern.pattern_type]?.length
    ? strengthMap[bestPattern.pattern_type]
    : (bestPattern.strength_signals || []);

  const mappedWeaknesses = weaknessMap[bestPattern.pattern_type]?.length
    ? weaknessMap[bestPattern.pattern_type]
    : ((bestPattern.weakness_signals || []).length
      ? bestPattern.weakness_signals
      : [
          "대표 탐구 1개를 더 깊게 정리하면 상담 설명력이 높아짐",
          "선택과목과 활동의 연결 문장을 더 분명하게 남길 필요가 있음"
        ]);

  return {
    current_position: currentPosition,
    strength_view: mappedStrengths,
    weakness_view: mappedWeaknesses,
    coaching_message: `${track} 방향성은 단순 관심 수준을 넘어 교과·탐구·활동이 같은 축으로 반복되며 전공 적합성이 구조적으로 형성된 상태다. 다만 현재 평가는 활동의 양보다 대표 탐구의 완성도, 결과 해석의 명확성, 활동 간 연결 설명의 구조화가 좌우하므로 이 지점을 보강해야 합격 설명력이 높아진다.`
  };
}

function buildSummary(taggedStudent, basic, patternInterp) {
  const track = pickTrackFromTags(taggedStudent);
  const firstExt = basic.matchedExtensions?.[0];
  const firstCase = basic.matchedCases?.[0];

  return [
    `현재 학생부는 ${track} 계열 전공 적합성이 단순 관심 수준을 넘어 구조적으로 형성되고 있는 흐름으로 해석된다.`,
    firstExt
      ? `우선 보강 과제는 활동 추가가 아니라 "${firstExt.title}" 계열 대표 탐구를 중심으로 과정·결과·해석을 정리해 설명력을 높이는 것이다.`
      : `우선 보강 과제는 활동 수를 늘리기보다 대표 활동 1~2개를 중심으로 과정·결과·해석을 정리해 설명력을 높이는 것이다.`,
    firstCase
      ? `합격생 비교 관점에서는 ${firstCase.university} ${firstCase.major} 유형처럼 전공 방향성과 실제 수행 경험이 연결되는 구조를 참고할 수 있다.`
      : `합격생 비교 이전에 먼저 현재 학생 기록 안에서 어떤 활동을 대표 탐구로 설정할지 정리하는 것이 우선이다.`,
    patternInterp?.current_position
      ? `현재 위치는 "${patternInterp.current_position}"으로 판단되며, 핵심 과제는 전공 적합성 확보 이후 합격 설명력을 완성하는 단계로 넘어가는 것이다.`
      : "현재 위치는 아직 대표 패턴이 확정되기 전 단계로 판단된다."
  ];
}

function classifyReason(title = "", taggedStudent = {}) {
  const themes = taggedStudent.theme_tags || [];
  const methods = taggedStudent.method_tags || [];
  const majors = taggedStudent.major_tags || [];

  if (title.includes("미세먼지") || title.includes("대기")) {
    return "환경 데이터 해석 경험과 공학적 문제 해결 방향을 함께 확장할 수 있기 때문";
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
      direction: "환경 데이터 기반 문제 해결 탐구",
      start: "교과에서 다룬 환경·오염 개념과 미세먼지 관련 기사·공공자료를 정리해 핵심 질문을 한 문장으로 설정한다.",
      expand: "시간대·지역·날씨 조건에 따른 미세먼지 변화를 공공 데이터로 수집해 그래프와 표로 비교 분석한다.",
      deepen: "센서 측정, 간이 예측 모델, 저감 아이디어 같은 공학적 해결 방향을 붙여 탐구를 심화한다.",
      complete: "결론에서는 무엇을 봤는가보다 어떤 조건을 비교했고 어떤 해석에 도달했는가를 중심으로 정리한다.",
      outputs: ["데이터 분석 보고서", "그래프/표 시각화 자료", "발표 자료 또는 포스터"],
      record_points: ["데이터 수집과 조건별 비교 분석", "변수 설정 및 결과 해석", "문제 해결 아이디어 도출"]
    };
  }

  if (title.includes("신소재")) {
    return {
      direction: "기술 변화와 소재의 역할을 연결하는 탐구",
      start: "신소재가 실제 산업·생활에서 어떤 문제를 해결했는지 사례를 2~3개 정리한다.",
      expand: "기존 소재와 새로운 소재를 성질·효율·안전성 기준으로 비교한다.",
      deepen: "센서, 배터리, 로봇 부품, 의료 소재 등 자신의 진로와 연결되는 응용 분야를 좁혀 탐구한다.",
      complete: "단순 사례 나열이 아니라 왜 이 소재가 필요했는가와 어떤 한계가 남는가까지 정리한다.",
      outputs: ["비교 분석 보고서", "기술 변화 정리표", "응용 분야 발표 자료"],
      record_points: ["비교 기준 설정", "과학·공학 개념의 실제 적용", "기술 변화에 대한 해석"]
    };
  }

  if (title.includes("안전사고") || title.includes("장치")) {
    return {
      direction: "제작·설계형 문제 해결 탐구",
      start: "실생활 안전 문제를 하나 정하고 사고가 일어나는 원인을 구조적으로 정리한다.",
      expand: "센서, 경고, 자동 정지, 충격 흡수 같은 요소 중 1~2개를 골라 장치 구조를 스케치한다.",
      deepen: "간단한 회로·모형·프로그램 설계 또는 동작 시뮬레이션까지 연결한다.",
      complete: "장치가 해결하는 문제, 한계, 개선 방향을 함께 정리해 설계의 완성도를 높인다.",
      outputs: ["설계 보고서", "구조도/스케치", "시연 자료 또는 프로토타입 설명서"],
      record_points: ["문제 정의와 구조 분석", "설계 과정과 수정 포인트", "기술적 해결 시도"]
    };
  }

  return {
    direction: `${subjectHint || "교과"} 기반 확장 탐구`,
    start: "현재 과목에서 다룬 개념 중 관심 주제를 하나 고른 뒤 왜 궁금한지 질문으로 정리한다.",
    expand: "자료 조사, 데이터 분석, 실험, 제작 중 가능한 방법을 골라 탐구 절차를 설계한다.",
    deepen: "진로와 연결되는 응용 사례를 붙여 탐구 범위를 좁히고 비교 기준을 만든다.",
    complete: "과정·근거·해석이 드러나도록 결과를 정리하고 발표 또는 보고서 형태로 마무리한다.",
    outputs: ["탐구보고서", "발표 자료"],
    record_points: ["질문 생성", "수행 방법 선택", "근거 기반 해석"]
  };
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
      record_points: roadmap.record_points
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
      title: "대표 탐구 1개 선정",
      goal: `${track} 방향에서 가장 설명력이 높은 활동 1개를 대표 탐구로 확정하고, 문제 설정 이유를 한 문장으로 정리한다.`
    },
    {
      step: 2,
      title: "수행 구조 구체화",
      goal: first
        ? `${first.title}를 기준으로 자료 조사·데이터 분석·실험·설계 중 실제 수행 가능한 방식을 선택하고, 과정과 비교 기준을 미리 설계한다.`
        : "자료 조사·데이터 분석·실험 중 실제 수행 가능한 방식을 정하고, 과정과 비교 기준을 미리 설계한다."
    },
    {
      step: 3,
      title: "합격 설명력 보강",
      goal: patternInterp?.weakness_view?.length
        ? `현재 보완이 필요한 지점(${patternInterp.weakness_view.join(", ")})을 중심으로 결과 해석, 결론, 활동 간 연결 설명을 정리한다.`
        : "현재 위치 판단을 더 선명하게 만들 수 있도록 결과 해석과 활동 간 연결 설명을 보강한다."
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
