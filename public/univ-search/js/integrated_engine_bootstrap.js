// integrated_engine_bootstrap.js
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

function buildSummary(taggedStudent, basic) {
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
      : `합격생 비교는 태그 정교화 이후 더 정확해질 수 있다.`
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
      complete: "결론에서는 '무슨 현상이 있었는가'보다 '어떤 조건을 비교했고 어떤 해석에 도달했는가'를 중심으로 정리한다.",
      outputs: [
        "데이터 분석 보고서",
        "그래프/표 시각화 자료",
        "발표 자료 또는 포스터"
      ],
      record_points: [
        "데이터 수집과 조건별 비교 분석",
        "변수 설정 및 결과 해석",
        "문제 해결 아이디어 도출"
      ]
    };
  }

  if (title.includes("신소재")) {
    return {
      direction: "기술 변화와 소재의 역할을 연결하는 탐구",
      start: "신소재가 실제 산업·생활에서 어떤 문제를 해결했는지 사례를 2~3개 정리한다.",
      expand: "기존 소재와 새로운 소재를 성질·효율·안전성 기준으로 비교한다.",
      deepen: "센서, 배터리, 로봇 부품, 의료 소재 등 자신의 진로와 연결되는 응용 분야를 좁혀 탐구한다.",
      complete: "단순 사례 나열이 아니라 '왜 이 소재가 필요했는가'와 '어떤 한계가 남는가'까지 정리한다.",
      outputs: [
        "비교 분석 보고서",
        "기술 변화 정리표",
        "응용 분야 발표 자료"
      ],
      record_points: [
        "비교 기준 설정",
        "과학·공학 개념의 실제 적용",
        "기술 변화에 대한 해석"
      ]
    };
  }

  if (title.includes("안전사고") || title.includes("장치")) {
    return {
      direction: "제작·설계형 문제 해결 탐구",
      start: "실생활 안전 문제를 하나 정하고 사고가 일어나는 원인을 구조적으로 정리한다.",
      expand: "센서, 경고, 자동 정지, 충격 흡수 같은 요소 중 1~2개를 골라 장치 구조를 스케치한다.",
      deepen: "간단한 회로·모형·프로그램 설계 또는 동작 시뮬레이션까지 연결한다.",
      complete: "장치가 해결하는 문제, 한계, 개선 방향을 함께 정리해 설계의 완성도를 높인다.",
      outputs: [
        "설계 보고서",
        "구조도/스케치",
        "시연 자료 또는 프로토타입 설명서"
      ],
      record_points: [
        "문제 정의와 구조 분석",
        "설계 과정과 수정 포인트",
        "기술적 해결 시도"
      ]
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

function buildActionPlan(taggedStudent, extensionRecs) {
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
      title: "결과 형태 준비",
      goal: "보고서, 그래프, 발표자료 중 학교에서 실제 제출 가능한 형태로 준비한다."
    }
  ];
}

export async function bootIntegratedEngine(taggedStudent, options = {}) {
  const integratedIndexPath = options.integratedIndexPath || "../integrated_engine_index.json";
  const engine = await loadIntegratedEngine(integratedIndexPath);
  const basic = runBasicRecommendation(taggedStudent, engine);

  const extensionRecs = buildExtensionRecommendations(taggedStudent, basic);
  const caseMatches = buildAdmissionMatches(taggedStudent, basic);

  return {
    student_id: taggedStudent?.student_id || "",
    summary: buildSummary(taggedStudent, basic),
    record_diagnosis: {
      one_line: "현재 화면은 '추천 이름'보다 '어떻게 수행할지'가 보이도록 재구성된 출력이다.",
      strengths: uniq([
        ...(taggedStudent?.theme_tags || []),
        ...(taggedStudent?.method_tags || [])
      ]).slice(0, 5),
      limits: [
        "추천 주제를 그대로 쓰기보다 학교에서 실제 수행 가능한 범위로 축소 필요",
        "한 번에 많은 주제를 벌리기보다 1~2개를 깊게 가져가는 것이 유리"
      ]
    },
    curriculum_check: {
      fit: "점검 완료",
      selected_subjects_comment: "현재 선택과목은 진로 방향과 연결 가능성이 있다. 다만 주제를 한 축으로 더 모아주면 해석이 선명해진다.",
      sequence_comment: "교과 선택은 유지하되, 이후 탐구는 데이터형/설계형/실험형 중 하나로 중심을 잡는 것이 좋다."
    },
    extension_recommendations: extensionRecs,
    admission_case_matches: caseMatches,
    evaluation_interpretation: buildEvaluationInterpretation(taggedStudent, basic),
    action_plan: buildActionPlan(taggedStudent, extensionRecs),
    report_design: extensionRecs.slice(0, 2).map(x => ({
      topic: x.title,
      method: x.expand,
      output: x.outputs.join(" / ")
    })),
    notes: "교사가 작성하는 문장을 대신 만드는 것이 아니라, 학생이 실제로 할 수 있는 수행 방식과 결과 형태가 보이도록 설계한 출력"
  };
}
