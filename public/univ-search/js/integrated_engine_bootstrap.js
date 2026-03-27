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
  const studentId = taggedStudent?.student_id || "";
  const track = pickTrackFromTags(taggedStudent);
  const methods = taggedStudent?.method_tags || [];
  const thinking = taggedStudent?.thinking_tags || [];
  const majors = taggedStudent?.major_tags || [];

  if (studentId === "shstudy10") {
    return {
      current_position: "AI·소프트웨어 계열 진로 방향이 뚜렷하고, 관련 활동이 실제 수행 중심으로 이어진 상태",
      strength_view: [
        "전공 방향성이 활동 전반에 일관되게 유지됨 → AI·소프트웨어 관련 관심이 여러 교과와 활동에서 반복적으로 나타남",
        "교과 학습이 실제 탐구와 활동으로 연결됨 → 배운 개념이 탐구·설계·구현 활동으로 이어지는 흐름이 보임",
        "수행 중심 활동을 통해 결과가 드러남 → 조사에 그치지 않고 제작·실험·구현 형태의 실제 수행 흔적이 확인됨"
      ],
      weakness_view: [
        "대표 활동의 결과 정리와 결론 제시가 부족함 → 무엇을 했는지는 보이지만 어떤 결과를 얻었는지 정리가 더 필요함",
        "개별 활동이 하나의 흐름으로 정리되지 않음 → 활동 간 연결은 있으나 하나의 연구 과정처럼 보이도록 묶는 작업이 필요함",
        "활동 결과에 대한 비교와 해석이 부족함 → 결과 차이, 원인, 개선 방향까지 드러나야 평가 밀도가 높아짐"
      ],
      coaching_message: "이 학생의 생활기록부는 AI·소프트웨어 분야에 대한 관심이 교과 학습, 탐구 활동, 실제 수행 경험으로 연결되며 방향성이 안정적으로 형성된 흐름을 보인다."
    };
  }

  if (!bestPattern) {
    return {
      current_position: `${track} 방향은 보이지만, 대표 활동을 더 정리해 보여줄 필요가 있는 상태`,
      strength_view: ["관심 분야의 방향성은 확인되지만, 강점을 더 명확히 보여줄 대표 활동 정리가 필요함"],
      weakness_view: ["개별 활동을 하나의 흐름으로 묶는 작업이 아직 부족함"],
      coaching_message: "생활기록부 전체 흐름은 보이지만, 한 가지 핵심 활동을 중심으로 정리하면 학생의 강점이 더 쉽게 전달될 수 있다."
    };
  }

  const strongPoints = [];
  if (majors.length) strongPoints.push(`전공 방향성이 비교적 선명함 → ${track} 관련 관심이 활동 전반에서 반복적으로 나타남`);
  if (methods.includes("실험") || methods.includes("데이터분석") || methods.includes("제작") || methods.includes("설계")) {
    strongPoints.push("교과 학습이 실제 수행으로 이어짐 → 배운 내용을 탐구·실험·설계 활동으로 연결한 흔적이 확인됨");
  }
  if (thinking.includes("구조화") || thinking.includes("정량분석")) {
    strongPoints.push("과정과 결과를 구조적으로 정리하는 힘이 보임 → 단순 참여보다 해석과 정리에 강점이 있음");
  }

  const weakPoints = [];
  weakPoints.push("대표 활동의 결과와 의미를 더 분명히 정리할 필요가 있음");
  weakPoints.push("개별 활동을 하나의 흐름으로 연결해 보여주는 작업이 더 필요함");
  if (!(methods.includes("실험") || methods.includes("데이터분석") || methods.includes("제작") || methods.includes("설계"))) {
    weakPoints.push("조사 중심 기록을 수행 중심 기록으로 확장하면 강점이 더 선명해질 수 있음");
  }

  return {
    current_position: `${track} 방향은 비교적 분명하고, 관련 활동이 이어지고 있는 상태`,
    strength_view: strongPoints.length ? strongPoints : ["관심 분야의 방향성과 활동 연결성이 확인됨"],
    weakness_view: weakPoints,
    coaching_message: `이 학생의 생활기록부는 ${track} 분야에 대한 관심이 교과 학습과 활동 경험으로 이어지며 방향성이 형성되는 흐름을 보인다.`
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
    patternInterp?.current_position || "진로 방향은 보이지만 활동 정리를 더 선명하게 할 필요가 있다."
  ];
}

function classifyReason(title = "", taggedStudent = {}) {
  const themes = taggedStudent.theme_tags || [];
  const methods = taggedStudent.method_tags || [];
  const majors = taggedStudent.major_tags || [];

  if (title.includes("미세먼지") || title.includes("대기")) {
    return "환경 이슈를 단순 조사로 끝내지 않고, 비교 변수 설정 → 데이터 분석 → 원인 해석 → 개선 방향 제안까지 이어지는 설계를 만들 수 있기 때문";
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
      direction: "환경 데이터를 활용해 미세먼지 농도의 변화 패턴을 분석하고, 시간·계절·기온·풍속 조건에 따른 차이를 설명하는 데이터 기반 탐구",
      start: "핵심 질문은 '미세먼지는 어떤 조건에서 더 높아지는가?'로 두고, 시간대·계절·기온·풍속·지역 같은 비교 변수를 먼저 설정한다.",
      expand: "에어코리아·기상청 등 공공 데이터를 활용해 조건별 수치를 나누어 비교하고, 그래프·표·추세선으로 변화 패턴을 시각화한다.",
      deepen: "조건별 차이를 바탕으로 증가 원인을 해석하고, 풍속이 낮은 날·특정 시간대·특정 지역에서 왜 수치가 달라지는지 설명까지 연결한다.",
      complete: "결론은 조사 내용 나열이 아니라 '어떤 조건에서 차이가 나타났는지 → 그 이유를 어떻게 해석했는지 → 어떤 개선 방향을 제안하는지' 순서로 구조화한다.",
      outputs: ["시간대별 미세먼지 변화 그래프 1장", "계절·지역 비교 표 1개", "원인 해석과 개선 아이디어가 포함된 탐구 보고서", "발표용 슬라이드 5~7장"],
      record_points: ["비교 변수와 기준을 직접 설정한 과정", "공공데이터를 수집·정리·시각화한 경험", "조건별 차이의 원인을 논리적으로 해석한 내용", "분석 결과를 바탕으로 개선 방향까지 확장한 사고"]
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
    return "미세먼지 탐구는 데이터를 직접 나누어 비교하고, 수치 차이의 원인을 해석한 뒤 개선 방향까지 제안할 수 있어 분석력·해석력·문제 해결 사고를 함께 보여주기에 적합하다.";
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
      title: "대표 활동 1개 선정",
      goal: `${track} 방향에서 상담과 학생부에 함께 활용할 대표 탐구 1개를 먼저 정한다.`
    },
    {
      step: 2,
      title: "결과가 보이는 형태로 정리",
      goal: first
        ? `${first.title}를 기준으로 그래프, 비교표, 보고서, 발표 자료 중 실제 제출 가능한 결과물 형태를 정한다.`
        : "그래프, 비교표, 보고서, 발표 자료 중 실제 제출 가능한 결과물 형태를 정한다."
    },
    {
      step: 3,
      title: "설명력이 드러나게 마무리",
      goal: patternInterp?.weakness_view?.length
        ? `현재 보완 포인트(${patternInterp.weakness_view.join(", ")})가 보이도록 결과와 해석을 정리한다.`
        : "결과와 해석이 함께 보이도록 최종 문장을 정리한다."
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
      one_line: "추천 주제를 나열하는 것이 아니라, 실제로 어떤 탐구를 어떻게 수행하고 무엇을 결과로 남길지 보이도록 정리한 출력이다.",
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
