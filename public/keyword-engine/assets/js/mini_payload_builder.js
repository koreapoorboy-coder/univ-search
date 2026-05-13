/* mini_payload_builder.js
 * v27: 학생 선택형 6~8번(전개 방식/관점/라인)을 MINI payload에 반영
 * - 3·4·5번 선택값은 유지
 * - 보고서 예시 누적 데이터의 구조 패턴을 반영해 targetStructure/sectionPurpose가 선택에 따라 달라지도록 보정
 */
(function(global){
  "use strict";

  const BUILDER_VERSION = "mini-payload-builder-v236-two-depth-no-basic-visible";
  global.__MINI_PAYLOAD_BUILDER_VERSION__ = BUILDER_VERSION;

  const REPORT_CONTEXT_RULES = {
    version: "report-generation-context-v2",
    createdAt: "2026-04-30T09:10:00",
    principle: "학생이 선택한 과목·학과·개념·키워드·후속축·도서와 6~8번 보고서 선택값을 바탕으로 수행평가 보고서의 문단 구조와 작성 방향을 MINI에 전달한다.",
    defaultOutputType: "수행평가 탐구보고서",
    defaultDepthLevel: "고등학생 심화 탐구형",
    defaultWritingStyle: "교과 개념 → 실제 문제 → 자료/사례/원리 해석 → 전공 확장 → 심화 탐구",
    canonicalSections: [
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
    miniWritingRules: [
      "도서 활용은 선택 사항이다. 도서를 선택하지 않은 수행평가는 공공자료·통계·기사·실험자료 중심으로 구성한다.",
      "선택 도서를 사용하는 경우에만 도서를 근거 프레임, 비교 관점, 한계 논의, 결론 확장에 배치한다.",
      "학과와 직접 맞지 않는 확장 참고 도서는 본문 핵심 이론이 아니라 결론 확장 또는 비교 관점으로 제한한다.",
      "학생 수준을 넘는 대학원급 수식·전문 알고리즘은 설명 중심으로 낮추어 작성한다.",
      "교과 개념 → 실제 문제 → 해결 과정 → 교과 연계 → 심화 방안의 흐름을 유지한다.",
      "6번 수행평가 방식, 7번 평가 관점·과정 증거, 8번 결과물 수준 선택값에 따라 같은 주제라도 수행평가 영역명·평가 의도·자료 역할·문단 구조가 달라지도록 한다.",
      "참고문헌은 보고서 내용과 연결되는 방식으로만 사용한다."
    ]
  };

  const MODE_PROFILES = {
    principle: {
      id: "principle",
      label: "원리 파악형",
      writingStyle: "교과 개념 → 핵심 원리 → 사례 연결 → 한계/확장",
      focusSentence: "개념이 왜 성립하는지 먼저 설명하고, 선택 키워드를 원리 적용 사례로 확장한다.",
      sectionBoost: ["이 개념이 무엇이며 어떤 원리인가?", "교과목 연계 및 이론적 설명", "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?"],
      avoid: "사례만 나열하고 핵심 개념 설명이 빠지지 않도록 한다."
    },
    compare: {
      id: "compare",
      label: "비교 분석형",
      writingStyle: "비교 기준 설정 → 사례/조건 비교 → 차이 해석 → 판단 기준 제시",
      focusSentence: "두 조건·사례·관점의 차이를 비교 기준에 따라 분석한다.",
      sectionBoost: ["어떤 문제를 해결할 수 있고, 왜 중요한가?", "실제 적용 및 문제 해결 과정", "심화 탐구 발전 방안"],
      avoid: "좋다/나쁘다식 결론이 아니라 비교 기준을 먼저 세운다."
    },
    data: {
      id: "data",
      label: "데이터 확장형",
      writingStyle: "현상 관찰 → 변수 설정 → 자료 수집 → 그래프/모델 해석 → 한계 논의",
      focusSentence: "선택 키워드를 수치·자료·그래프·모델로 해석하고 결론의 근거를 만든다.",
      sectionBoost: ["실제 적용 및 문제 해결 과정", "교과목 연계 및 이론적 설명", "심화 탐구 발전 방안"],
      avoid: "데이터라는 단어만 쓰지 말고 어떤 변수와 자료를 볼지 제시한다."
    },
    application: {
      id: "application",
      label: "사례 적용형",
      writingStyle: "현실 문제 정의 → 교과 원리 적용 → 해결 과정 → 적용 한계",
      focusSentence: "교과 개념이 실제 문제 해결 과정에서 어떻게 쓰이는지 단계적으로 보여준다.",
      sectionBoost: ["어떤 문제를 해결할 수 있고, 왜 중요한가?", "실제 적용 및 문제 해결 과정", "느낀점"],
      avoid: "사례 소개에서 끝나지 않고 개념이 사례 안에서 작동하는 지점을 설명한다."
    },
    major: {
      id: "major",
      label: "전공 확장형",
      writingStyle: "교과 개념 → 전공 문제 상황 → 전공 기술/직무 연결 → 후속 탐구",
      focusSentence: "선택 학과에서 다루는 문제와 연결해 진로 적합성을 드러낸다.",
      sectionBoost: ["이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?", "교과목 연계 및 이론적 설명", "심화 탐구 발전 방안"],
      avoid: "전공명을 붙이는 데서 끝나지 않고 실제 전공 문제 상황을 제시한다."
    },
    book: {
      id: "book",
      label: "도서 근거형",
      writingStyle: "교과 질문 → 도서의 관점/근거 → 개념 재해석 → 보고서 결론",
      focusSentence: "도서를 독후감이 아니라 보고서 논지의 근거 또는 비교 관점으로 활용한다.",
      sectionBoost: ["추천 주제", "느낀점", "참고문헌 및 자료"],
      avoid: "도서 줄거리 요약으로 흐르지 않게 선택 개념과 연결된 부분만 사용한다."
    }
  };

  const VIEW_PROFILES = {
    "원리": { label: "원리 관점", focus: "왜 그런 현상이 일어나는지, 어떤 교과 개념이 작동하는지 중심으로 설명한다." },
    "자료 해석": { label: "자료 해석 관점", focus: "수치·그래프·관측 자료를 근거로 의미를 해석한다." },
    "데이터": { label: "데이터 관점", focus: "변수, 자료 출처, 그래프, 모델 결과를 중심으로 결론을 만든다." },
    "모델링": { label: "모델링 관점", focus: "현상을 단순화해 변수와 관계식, 예측 구조로 정리한다." },
    "한계": { label: "한계 관점", focus: "해결 방안이나 자료 해석의 조건, 오차, 적용 범위를 비판적으로 제시한다." },
    "비교": { label: "비교 관점", focus: "두 사례·조건·방법의 공통점과 차이를 기준에 따라 분석한다." },
    "사회적 의미": { label: "사회적 의미 관점", focus: "기술·과학 개념이 실제 사회 문제, 정책, 윤리와 어떻게 연결되는지 설명한다." },
    "진로 확장": { label: "진로 확장 관점", focus: "선택 학과와 직무에서 이 개념이 어떻게 쓰이는지 연결한다." },
    "구조": { label: "구조 관점", focus: "대상이 어떤 요소로 구성되고 각 요소가 어떤 관계를 맺는지 분석한다." },
    "기능": { label: "기능 관점", focus: "대상이 수행하는 역할과 작동 과정을 중심으로 설명한다." },
    "안정성": { label: "안정성 관점", focus: "시스템이 흔들리지 않고 유지되기 위한 조건과 위험 요인을 분석한다." },
    "효율": { label: "효율 관점", focus: "같은 결과를 더 적은 자원·시간·에너지로 얻는 방식을 비교한다." },
    "변화": { label: "변화 관점", focus: "시간·조건 변화에 따라 값이나 상태가 어떻게 달라지는지 해석한다." }
  };


  const ROLE_VIEW_ALIASES = {
    analysisFrame: "자료 해석",
    evidenceFrame: "자료 해석",
    conceptExplanation: "원리",
    comparisonFrame: "비교",
    limitationDiscussion: "한계",
    conclusionExpansion: "사회적 의미",
    careerExpansion: "진로 확장",
    socialMeaning: "사회적 의미"
  };

  function normalizeReportViewValue(input){
    const raw = val(input);
    if (!raw) return "";
    if (ROLE_VIEW_ALIASES[raw]) return ROLE_VIEW_ALIASES[raw];
    if (/conclusionExpansion|사회|정책|윤리|의미/.test(raw)) return "사회적 의미";
    if (/comparisonFrame|비교|대조/.test(raw)) return "비교";
    if (/limitationDiscussion|한계|오차|편향|제약/.test(raw)) return "한계";
    if (/analysisFrame|evidenceFrame|자료|근거/.test(raw)) return "자료 해석";
    if (/conceptExplanation|원리/.test(raw)) return "원리";
    if (/careerExpansion|진로|전공/.test(raw)) return "진로 확장";
    if (/모델/.test(raw)) return "모델링";
    if (/데이터/.test(raw)) return "데이터";
    return raw;
  }

  const LINE_PROFILES = {
    standard: {
      id: "standard",
      label: "확장형",
      targetStructure: ["중요성", "추천 주제", "관련 키워드", "탐구 동기", "이 개념이 무엇이며 어떤 원리인가?", "어떤 문제를 해결할 수 있고, 왜 중요한가?", "실제 적용 및 문제 해결 과정", "교과목 연계 및 이론적 설명", "심화 탐구 발전 방안", "참고문헌 및 자료"],
      outputGoal: "수행평가 제출용으로 가장 안정적인 10섹션 보고서",
      structureRule: "교과 개념과 실제 문제를 연결하고 자료·사례·도서 중 하나를 근거로 확장한다."
    },
    advanced: {
      id: "advanced",
      label: "심화형",
      targetStructure: REPORT_CONTEXT_RULES.canonicalSections,
      outputGoal: "세특·심화탐구까지 연결 가능한 13섹션 보고서",
      structureRule: "교과 개념, 문제 해결, 이론적 연결, 심화 탐구, 참고문헌을 모두 포함한다."
    }
  };


  const SECONDARY_EXPANSION_PATHS = [
    {
      id: "principle-analysis",
      label: "원리 분석형",
      shortLabel: "원리",
      purpose: "교과 개념이 왜 작동하는지 원리와 조건을 먼저 설명하는 방향",
      evidenceTypes: ["교과서 개념 정리", "공식 설명 자료", "원리 적용 사례"],
      structure: ["개념 원리", "작동 조건", "사례 적용", "한계"],
      studentInput: ["수업에서 배운 핵심 개념", "원리가 드러나는 사례", "내가 이해한 원리 설명"]
    },
    {
      id: "case-comparison",
      label: "사례 비교형",
      shortLabel: "비교",
      purpose: "두 사례·조건·관점을 비교해 차이와 판단 기준을 만드는 방향",
      evidenceTypes: ["사례 A", "사례 B", "비교 기준 자료"],
      structure: ["비교 기준", "사례 A", "사례 B", "차이 해석"],
      studentInput: ["비교할 대상 2개", "비교 기준", "차이를 해석한 내 생각"]
    },
    {
      id: "data-evidence",
      label: "자료 해석형",
      shortLabel: "자료",
      purpose: "통계·기사·실험값·그래프를 근거로 해석하고 결론을 검증하는 방향",
      evidenceTypes: ["통계 자료", "그래프 또는 표", "기사·공공자료"],
      structure: ["자료 출처", "변수·기준", "자료 해석", "자료 한계"],
      studentInput: ["자료 제목과 출처", "자료에서 확인한 수치", "내가 해석한 의미"]
    },
    {
      id: "social-meaning",
      label: "사회적 의미형",
      shortLabel: "사회",
      purpose: "교과 개념을 윤리·정책·공동체 영향·사회 문제와 연결하는 방향",
      evidenceTypes: ["사회 쟁점 사례", "정책·제도 자료", "이해관계자 관점"],
      structure: ["문제 상황", "영향 받는 대상", "사회적 의미", "대응 방향"],
      studentInput: ["관련 사회 문제", "영향을 받는 대상", "내가 생각한 대응 방향"]
    },
    {
      id: "followup-inquiry",
      label: "후속 탐구형",
      shortLabel: "후속",
      purpose: "현재 탐구의 한계를 찾고 다음 실험·조사·비교로 이어가는 방향",
      evidenceTypes: ["현재 자료의 한계", "추가로 필요한 자료", "후속 실험·조사 계획"],
      structure: ["현재 결론", "부족한 점", "추가 자료", "다음 탐구"],
      studentInput: ["현재 탐구에서 부족한 점", "추가로 확인하고 싶은 자료", "다음 탐구 질문"]
    }
  ];

  const SECTION_TEMPLATES = {
    "중요성": { prompt: "{keyword}는 {department}와 연결될 때 단순한 교과 개념이 아니라 실제 기술·사회 문제를 해결하는 핵심 주제로 확장된다." },
    "추천 주제": { prompt: "{keyword}를 {axis} 관점에서 해석하여 {department}와 연결되는 탐구 주제를 제안한다.", titlePattern: "{keyword}와 {department}의 연결: {axis} 기반 탐구" },
    "관련 키워드": { prompt: "선택 개념, 키워드, 후속 연계축에서 보고서에 실제 사용할 개념어·자료어·전공어를 구분해 제시한다." },
    "탐구 동기": { prompt: "수업에서 배운 {concept}이 실제 {keyword} 문제와 어떻게 이어지는지 질문을 만들고, 이를 {department} 관점에서 탐구하게 된 이유를 서술한다." },
    "느낀점": { prompt: "탐구를 통해 교과 개념이 실제 문제 해결과 연결된다는 점, 그리고 진로 분야에서 어떤 역량이 필요한지 깨달은 점을 쓴다." },
    "세특 문구 예시": { prompt: "{concept}을 바탕으로 {keyword}를 분석하고, {axis} 관점에서 자료 해석과 전공 연계를 수행한 점을 드러낸다." },
    "이 개념을 왜 알아야 하며, 생기부와 어떻게 연결되는가?": { prompt: "선택 개념이 학생의 과목 선택, 후속 탐구, 진로 적합성과 어떻게 연결되는지 설명한다." },
    "이 개념이 무엇이며 어떤 원리인가?": { prompt: "{concept}의 핵심 원리를 고등학생이 이해할 수 있는 수준으로 설명하고, {keyword}와 연결되는 과학적·수학적 원리를 제시한다." },
    "어떤 문제를 해결할 수 있고, 왜 중요한가?": { prompt: "{keyword}가 실제로 어떤 문제를 만들고, {department} 관점에서 왜 해결해야 하는지 설명한다." },
    "실제 적용 및 문제 해결 과정": { prompt: "문제 상황을 단계별로 나누고, {axis}에 맞춰 자료 수집·해석·모델링·검증·해결 방안을 제시한다." },
    "교과목 연계 및 이론적 설명": { prompt: "{subject}를 중심으로 수학, 과학, 정보, 사회 교과가 어떻게 연결되는지 설명한다." },
    "심화 탐구 발전 방안": { prompt: "현재 보고서를 바탕으로 더 깊게 확장할 수 있는 실험, 자료 분석, 비교 연구, 전공 심화 주제를 제안한다." },
    "참고문헌 및 자료": { prompt: "선택 도서와 추가 자료가 보고서의 어느 부분에 사용되는지 역할 중심으로 정리한다." }
  };

  const AXIS_RULES = {
    math_data_modeling: {
      name: "수리·데이터 모델링 축",
      writingPattern: "현상 관찰 → 변수 설정 → 자료 수집 → 수리/통계 모델링 → 예측 또는 해석 → 한계 논의",
      bestSections: ["실제 적용 및 문제 해결 과정", "교과목 연계 및 이론적 설명", "심화 탐구 발전 방안"],
      dataExamples: ["측정값", "시계열 자료", "그래프", "통계 지표", "모델 예측값"],
      avoidPattern: "수치 자료 없이 현상 설명만 나열하지 않는다."
    },
    physics_system: {
      name: "물리·시스템 해석 축",
      writingPattern: "물리 원리 → 시스템 구조 → 에너지/신호/오차 발생 → 제어·보정 방식 → 실제 기술 적용",
      bestSections: ["이 개념이 무엇이며 어떤 원리인가?", "실제 적용 및 문제 해결 과정", "교과목 연계 및 이론적 설명"],
      dataExamples: ["에너지 전달", "오차", "센서 입력", "측정값", "시스템 반응"],
      avoidPattern: "기술 명칭만 나열하고 물리 원리를 설명하지 않는 방식은 피한다."
    },
    earth_environment_data: {
      name: "지구·환경 데이터 해석 축",
      writingPattern: "환경 현상 → 관측 자료 → 원인 분석 → 사회·기술적 영향 → 대응 방안 → 확장 탐구",
      bestSections: ["중요성", "어떤 문제를 해결할 수 있고, 왜 중요한가?", "심화 탐구 발전 방안"],
      dataExamples: ["기온", "습도", "강수량", "대기질", "위성 자료", "지역별 비교 자료"],
      avoidPattern: "환경 문제를 감상문처럼 쓰지 않고 자료와 원인 분석을 포함한다."
    },
    generic_science_method: {
      name: "과학 방법·측정 일반 축",
      writingPattern: "측정 필요성 → 측정 기준 → 오차와 한계 → 해석 방식 → 객관성 확보 방안",
      bestSections: ["이 개념이 무엇이며 어떤 원리인가?", "교과목 연계 및 이론적 설명", "느낀점"],
      dataExamples: ["측정 기준", "오차", "표준", "관찰 결과", "비교 자료"],
      avoidPattern: "측정을 단순 기록으로만 설명하지 않고 해석 기준과 한계를 함께 다룬다."
    }
  };

  const KEYWORD_RULES = {
    폭염: {
      problemContext: "폭염은 단순 기상 현상이 아니라 측정 기준, 예측 모델, 도시 구조, 사회적 대응 체계가 함께 작동하는 복합 문제이다.",
      possibleTopicDirections: ["폭염주의보 기준과 실제 체감 위험의 차이", "기상 데이터 기반 폭염 예측 모델의 한계", "도시 열섬과 폭염 경보 시스템의 개선"],
      relatedData: ["기온", "습도", "체감온도", "온열질환자 수", "도시 열섬", "지역별 경보 발령 횟수"]
    },
    측정: {
      problemContext: "측정은 단순한 숫자 기록이 아니라 현상을 해석하고 판단하는 기준을 만드는 과정이다.",
      possibleTopicDirections: ["측정 기준이 달라질 때 결과 해석이 어떻게 달라지는가", "오차와 표준이 과학적 판단에 미치는 영향", "센서 데이터의 신뢰성과 실제 의사결정"],
      relatedData: ["오차", "표준", "반복 측정", "센서값", "기준값"]
    },
    데이터: {
      problemContext: "데이터는 실제 문제를 수치화해 분석하고 예측하는 근거이지만, 수집 방식과 해석 기준에 따라 결론이 달라질 수 있다.",
      possibleTopicDirections: ["데이터 기반 예측 모델의 가능성과 한계", "자료 해석에서 생기는 편향과 오차", "전공 분야에서 데이터가 의사결정에 활용되는 방식"],
      relatedData: ["표본", "그래프", "상관관계", "모델", "예측값", "오차"]
    }
  };

  const EXAMPLE_PATTERNS = {
    version: "report-example-pattern-rules-v27",
    patternGroups: {
      system_data_prevention: {
        label: "시스템·데이터 예방형",
        fitSignals: ["AI","IoT","데이터","모델링","스마트","센서","위험","붕괴","예측","컴퓨터","공학"],
        modePriority: ["data","application","major"],
        exampleReportIds: ["RPT-001","RPT-005"],
        studentUse: "문제 상황을 데이터로 관찰하고, 변수·기준·모델을 세워 예방 또는 최적화 방안을 제시하는 구조"
      },
      sustainability_material_design: {
        label: "지속가능·소재/공정 설계형",
        fitSignals: ["지속가능","환경","소재","공정","촉매","재활용","업사이클링","화학","에너지","신소재"],
        modePriority: ["application","compare","major"],
        exampleReportIds: ["RPT-002","RPT-006"],
        studentUse: "물질·소재·자원 문제를 원리와 공정 관점에서 분석하고 개선안을 설계하는 구조"
      },
      earth_climate_data: {
        label: "지구·기후 데이터 해석형",
        fitSignals: ["기후","해양","대기","지구","환경","순환","기상","폭염","해수","데이터"],
        modePriority: ["data","principle","application"],
        exampleReportIds: ["RPT-003"],
        studentUse: "관측 자료와 시계열 변화를 해석하여 환경 변화의 원인·영향·대응을 연결하는 구조"
      },
      bio_mechanism: {
        label: "생명·분자 기전 해석형",
        fitSignals: ["생명","신경","분자","단백질","유전자","의생명","약학","세포","시냅스","기전"],
        modePriority: ["principle","major","application"],
        exampleReportIds: ["RPT-007"],
        studentUse: "생명 현상을 분자·세포·시스템 수준으로 나누어 원리와 질환/응용 가능성을 설명하는 구조"
      },
      physics_energy_system: {
        label: "물리·에너지 시스템 해석형",
        fitSignals: ["물리","에너지","원자력","핵","SMR","기계","전력","열","반응","시스템"],
        modePriority: ["principle","application","data"],
        exampleReportIds: ["RPT-008"],
        studentUse: "물리 원리에서 출발해 장치·시스템·안전성·기술 적용으로 확장하는 구조"
      },
      social_policy_issue: {
        label: "사회·정책 쟁점 분석형",
        fitSignals: ["정책","사회","행정","복지","정치","법","윤리","공공","거버넌스","갈등"],
        modePriority: ["compare","application","major"],
        exampleReportIds: ["RPT-004","RPT-009","RPT-010"],
        studentUse: "현실 쟁점을 원인·이해관계·제도·대안으로 나누어 분석하는 구조"
      }
    }
  };

  function val(v){ return String(v == null ? "" : v).trim(); }
  function arr(v){ return Array.isArray(v) ? v.filter(Boolean) : []; }
  function normalize(v){ return String(v || "").toLowerCase().replace(/\s+/g, " ").trim(); }

  function readDomValue(id){
    const el = global.document?.getElementById?.(id);
    return val(el?.value || "");
  }

  function readActiveAttr(selector, attr){
    const el = global.document?.querySelector?.(selector);
    return val(el?.getAttribute?.(attr) || "");
  }

  function readActiveText(selector){
    const el = global.document?.querySelector?.(selector);
    return val(el?.textContent || "");
  }

  function readActiveValue(selectors, attr){
    for (const selector of selectors || []) {
      const el = global.document?.querySelector?.(selector);
      if (!el) continue;
      const byAttr = attr ? val(el.getAttribute?.(attr) || "") : "";
      if (byAttr) return byAttr;
      const byData = val(el.getAttribute?.("data-value") || el.getAttribute?.("data-title") || "");
      if (byData) return byData;
      const byText = val(el.textContent || el.value || "");
      if (byText) return byText;
    }
    return "";
  }

  function cleanUiText(value){
    return val(value)
      .replace(/\s+/g, " ")
      .replace(/^(선택 개념|추천 키워드|후속 연계축|직접 일치 도서|확장 참고 도서)\s*[:：]?\s*/g, "")
      .replace(/\s*활동 예시:.*$/g, "")
      .trim();
  }

  function isWeakAxis(value){
    const v = val(value);
    if (!v) return true;
    if (/^(physics|chemistry|biology|earth|science|math|data|subject|career|keyword|concept)$/i.test(v)) return true;
    if (/^[a-z0-9_-]+$/i.test(v) && !/[가-힣]/.test(v)) return true;
    return false;
  }

  function isWeakKeyword(value){
    const v = val(value);
    if (!v) return true;
    // 학과 추천 키워드 미리보기는 쉼표로 길게 들어가므로 3번 추천 키워드로 쓰면 안 된다.
    if (v.split(/[,，]/).filter(Boolean).length >= 3) return true;
    return false;
  }


  function inferSubjectFromVisibleSelection(input){
    const concept = val(input?.concept || input?.selectedConcept || "");
    const keyword = val(input?.keyword || input?.selectedKeyword || "");
    const axis = val(input?.axisLabel || input?.followupAxis || input?.linkTrack || "");
    const joined = `${concept} ${keyword} ${axis}`;
    if (!joined.trim()) return "";

    // 화면 선택값이 3번/4번에는 정상인데, 상단 subject select 값이 이전 과목으로 남는 경우가 있다.
    // payload/worker에는 실제 선택 개념과 후속축이 속한 과목을 우선 전달한다.
    const rules = [
      { subject: "미적분1", re: /(도함수|미분|수열의\s*극한|함수의\s*미분|변화율|최적화|민감도|수렴|운동\s*변화율|기계\s*모델링)/ },
      { subject: "기하", re: /(벡터|내적|공간좌표|구의\s*방정식|이차곡선|자취|투영|3차원|그래픽스|충돌\s*판정|위치\s*추적|궤도|곡선)/ },
      { subject: "확률과 통계", re: /(순열|조합|조건부\s*확률|조건부확률|사건의\s*독립|독립성|확률변수|확률분포|기댓값|분산|통계|경우의\s*수)/ },
      { subject: "대수", re: /(지수함수|로그함수|등차수열|등비수열|수학적\s*귀납법|귀납|채널\s*용량|로그\s*스케일|수열\s*모델링)/ },
      { subject: "정보", re: /(자료와\s*정보|정보의\s*표현|알고리즘|프로그래밍|자동화|추상화|문제\s*분해|컴퓨팅\s*시스템|네트워크|데이터베이스|부호화|압축|전송|센서|임베디드|보안)/ }
    ];
    const hit = rules.find(rule => rule.re.test(joined));
    return hit ? hit.subject : "";
  }

  function getBookLastResult(){
    try {
      if (typeof global.__BOOK_210_GET_LAST_RESULT__ === "function") return global.__BOOK_210_GET_LAST_RESULT__();
    } catch(e){}
    return global.__BOOK_210_LAST_RESULT__ || null;
  }

  function getActiveSelectionSnapshot(){
    const last = getBookLastResult();
    const ctx = last?.ctx || {};
    const activeConcept = readActiveValue([
      ".engine-concept-card.is-active[data-concept]",
      ".engine-concept-card.selected[data-concept]",
      ".engine-concept-card.active[data-concept]"
    ], "data-concept") || ctx.concept || ctx.selectedConcept || "";
    const activeKeyword = readActiveValue([
      ".engine-chip.is-active[data-action='keyword'][data-value]",
      ".engine-chip.selected[data-action='keyword'][data-value]",
      ".engine-chip.active[data-action='keyword'][data-value]"
    ], "data-value") || ctx.keyword || ctx.selectedKeyword || "";
    const activeTrackId = readActiveValue([
      ".engine-track-card.is-active[data-track]",
      ".engine-track-card.selected[data-track]",
      ".engine-track-card.active[data-track]"
    ], "data-track") || ctx.followupAxisId || ctx.linkTrack || "";
    const activeTrackTitle = compactTrackTitle(readActiveText(".engine-track-card.is-active .engine-track-title"))
      || compactTrackTitle(readActiveText(".engine-track-card.selected .engine-track-title"))
      || compactTrackTitle(readActiveText(".engine-track-card.active .engine-track-title"))
      || ctx.axisLabel || ctx.trackLabel || ctx.linkTrackLabel || "";
    const activeBookEl = global.document?.querySelector?.(".engine-book-card.is-active[data-kind='book'], .book-chip.is-active[data-kind='book'], .engine-book-card.selected[data-kind='book'], .book-chip.selected[data-kind='book']");
    const clickedBook = global.__BOOK_210_LAST_CLICKED_BOOK__ || {};
    const activeBookValue = val(activeBookEl?.getAttribute?.("data-value") || clickedBook.value || ctx.selectedBook || readDomValue("selectedBookId"));
    const activeBookTitle = val(activeBookEl?.getAttribute?.("data-title") || clickedBook.title || ctx.selectedBookTitle || readDomValue("selectedBookTitle"));
    const cleanConcept = cleanUiText(activeConcept);
    const cleanKeyword = cleanUiText(activeKeyword);
    const cleanAxisLabel = cleanUiText(activeTrackTitle);
    const inferredSubject = inferSubjectFromVisibleSelection({
      concept: cleanConcept,
      keyword: cleanKeyword,
      axisLabel: cleanAxisLabel,
      linkTrack: activeTrackId
    });
    return {
      subject: inferredSubject || ctx.subject || readDomValue("subject") || "",
      subjectGroup: readDomValue("subjectGroup") || "",
      career: readDomValue("career") || ctx.career || ctx.department || ctx.selectedMajor || "",
      concept: cleanConcept,
      keyword: cleanKeyword,
      linkTrack: activeTrackId,
      followupAxisId: activeTrackId,
      axisLabel: cleanAxisLabel,
      selectedBook: activeBookValue,
      selectedBookTitle: cleanUiText(activeBookTitle)
    };
  }

  function compactTrackTitle(text){
    const v = val(text).replace(/\s+/g, " ");
    if (!v) return "";
    const m = v.match(/^[^0-9\n]+?축/);
    return val(m ? m[0] : v.replace(/\s*1순위.*$/,"").replace(/\s*직접 연계.*$/,""));
  }

  function getDomState(){
    const snap = getActiveSelectionSnapshot();
    const hiddenConcept = readDomValue("selectedConcept");
    const hiddenKeyword = readDomValue("keyword");
    const hiddenTrack = readDomValue("linkedTrack");
    return {
      subjectGroup: snap.subjectGroup || readDomValue("subjectGroup"),
      subject: snap.subject || readDomValue("subject"),
      career: snap.career || readDomValue("career"),
      majorSelectedName: snap.career || readDomValue("career"),
      concept: snap.concept || hiddenConcept,
      selectedConcept: snap.concept || hiddenConcept,
      keyword: snap.keyword || (!isWeakKeyword(hiddenKeyword) ? hiddenKeyword : ""),
      selectedKeyword: snap.keyword || (!isWeakKeyword(hiddenKeyword) ? hiddenKeyword : ""),
      linkTrack: snap.linkTrack || hiddenTrack,
      followupAxisId: snap.followupAxisId || hiddenTrack,
      axisLabel: snap.axisLabel || (!isWeakAxis(hiddenTrack) ? hiddenTrack : ""),
      selectedBook: snap.selectedBook || readDomValue("selectedBookId"),
      selectedBookTitle: snap.selectedBookTitle || readDomValue("selectedBookTitle"),
      reportMode: readDomValue("reportMode"),
      reportView: readDomValue("reportView"),
      reportLine: readDomValue("reportLine")
    };
  }

  function mergeState(base, dom){
    const out = { ...(base || {}) };
    Object.keys(dom || {}).forEach(k => {
      const v = val(dom[k]);
      if (v) out[k] = v;
    });
    return out;
  }

  function getState(){
    return mergeState(global.__TEXTBOOK_HELPER_STATE__ || {}, getDomState());
  }

  function getBookResult(){
    return typeof global.__BOOK_210_GET_LAST_RESULT__ === "function"
      ? global.__BOOK_210_GET_LAST_RESULT__()
      : null;
  }

  function getSelectedBookFromResult(result, state){
    const all = arr(result?.result?.directBooks).concat(arr(result?.result?.expansionBooks));
    const selected = val(state.selectedBook || state.selectedBookTitle);
    const clicked = global.__BOOK_210_LAST_CLICKED_BOOK__ || {};
    const clickedValue = val(clicked.value || clicked.title);
    const activeTitle = val(state.selectedBookTitle);
    const keys = [selected, clickedValue, activeTitle].filter(Boolean);

    if (all.length) {
      if (keys.length) {
        const found = all.find(b => {
          const candidates = [b.sourceId, b.bookId, String(b.managementNo || ""), b.title].map(val);
          return keys.some(k => candidates.includes(k));
        });
        if (found) return found;
      }
      return all[0] || null;
    }

    const fallbackKey = keys[0];
    if (fallbackKey && typeof global.getSelectedBookDetail === "function") {
      try {
        const detail = global.getSelectedBookDetail(fallbackKey);
        if (detail) return {
          ...detail,
          sourceId: detail.sourceId || detail.source_book_uid || detail.book_id || fallbackKey,
          title: detail.title || activeTitle || fallbackKey,
          author: detail.author || "",
          selectedBookContext: detail.selectedBookContext || detail.miniUseGuide || null
        };
      } catch(e){}
    }
    return null;
  }

  function inferAxisRule(result, payload){
    const axisProfile = result?.result?.debug?.axisProfile || "";
    if (AXIS_RULES[axisProfile]) return { id: axisProfile, ...AXIS_RULES[axisProfile] };

    const text = normalize([payload.followupAxis, payload.selectedRecommendedKeyword, payload.selectedConcept].join(" "));
    for (const [id, rule] of Object.entries(AXIS_RULES)) {
      if ((rule.name && text.includes(normalize(rule.name))) || id.split("_").some(piece => piece && text.includes(piece))) {
        return { id, ...rule };
      }
    }
    return { id: "generic_science_method", ...AXIS_RULES.generic_science_method };
  }

  function inferKeywordFrame(payload){
    const text = normalize([payload.selectedRecommendedKeyword, payload.selectedConcept, payload.followupAxis].join(" "));
    for (const [key, frame] of Object.entries(KEYWORD_RULES)) {
      if (text.includes(normalize(key))) return { keywordKey: key, ...frame };
    }
    return {
      keywordKey: payload.selectedRecommendedKeyword || "generic",
      problemContext: `${payload.selectedRecommendedKeyword || "선택 키워드"}는 ${payload.selectedConcept || "선택 개념"}을 실제 문제로 확장하는 출발점이다.`,
      possibleTopicDirections: [
        `${payload.selectedRecommendedKeyword || "선택 키워드"} 관련 교과 개념 탐구`,
        `${payload.selectedRecommendedKeyword || "선택 키워드"} 실제 사례 분석`,
        `${payload.selectedRecommendedKeyword || "선택 키워드"} 관련 비교·해석 탐구`
      ],
      relatedData: ["핵심 개념", "원리", "사례", "비교 기준", "전공 연결"]
    };
  }

  function inferExamplePattern(payload, axisRule, reportChoices){
    const hay = normalize([
      payload.subject,
      payload.department,
      payload.selectedConcept,
      payload.selectedRecommendedKeyword,
      payload.followupAxis,
      axisRule?.name,
      reportChoices?.mode
    ].join(" "));
    let best = null;
    let bestScore = -1;
    for (const [id, group] of Object.entries(EXAMPLE_PATTERNS.patternGroups)) {
      let score = 0;
      arr(group.fitSignals).forEach(sig => {
        if (hay.includes(normalize(sig))) score += 2;
      });
      if (arr(group.modePriority).includes(reportChoices?.mode)) score += 3;
      if (reportChoices?.mode === "data" && id.includes("data")) score += 2;
      if (reportChoices?.mode === "compare" && id.includes("policy")) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = { id, ...group, score };
      }
    }
    return best || { id: "system_data_prevention", ...EXAMPLE_PATTERNS.patternGroups.system_data_prevention, score: 0 };
  }

  function normalizeReportLineValue(input){
    const raw = val(input);
    if (!raw || raw === "basic" || raw === "기본형" || raw === "일반형") return "standard";
    if (raw === "확장형") return "standard";
    if (raw === "심화형") return "advanced";
    return raw;
  }

  function getReportChoices(state){
    const mode = val(state.reportMode) || "";
    const rawView = val(state.reportView) || "";
    const view = normalizeReportViewValue(rawView);
    const line = normalizeReportLineValue(state.reportLine);
    return {
      mode,
      modeLabel: MODE_PROFILES[mode]?.label || mode || "",
      view,
      viewLabel: VIEW_PROFILES[view]?.label || view || "",
      rawView,
      line,
      lineLabel: LINE_PROFILES[line]?.label || line || "",
      isComplete: !!(mode && rawView && line)
    };
  }

  function fallbackModeFromAxis(payload, axisRule){
    const hay = normalize([payload.followupAxis, payload.selectedRecommendedKeyword, axisRule?.name].join(" "));
    if (/데이터|data|모델|그래프|시각화|예측|통계|자료/.test(hay)) return "data";
    if (/비교|쟁점|차이|정책|사회|윤리|한계/.test(hay)) return "compare";
    if (/사례|적용|해결|공정|센서|측정|실험/.test(hay)) return "application";
    if (/전공|공학|의학|약학|간호|컴퓨터|반도체/.test(hay)) return "major";
    return "principle";
  }

  function fallbackViewFromMode(mode){
    if (mode === "data") return "자료 해석";
    if (mode === "compare") return "비교";
    if (mode === "application") return "사회적 의미";
    if (mode === "major") return "진로 확장";
    if (mode === "book") return "한계";
    return "원리";
  }

  function fallbackLineFromMode(mode){
    if (["data","compare","application"].includes(mode)) return "standard";
    if (mode === "major") return "advanced";
    return "standard";
  }

  function completeReportChoices(reportChoices, payload, axisRule){
    const mode = reportChoices.mode || fallbackModeFromAxis(payload, axisRule);
    const view = reportChoices.view || fallbackViewFromMode(mode);
    const line = reportChoices.line || fallbackLineFromMode(mode);
    return {
      mode,
      modeLabel: MODE_PROFILES[mode]?.label || mode,
      view,
      viewLabel: VIEW_PROFILES[view]?.label || view,
      line,
      lineLabel: LINE_PROFILES[line]?.label || line,
      isComplete: reportChoices.isComplete,
      wasAutoCompleted: !reportChoices.isComplete
    };
  }

  function applyModeOrdering(structure, modeProfile){
    const boost = arr(modeProfile?.sectionBoost);
    if (!boost.length) return structure;
    const keep = structure.filter(s => !boost.includes(s));
    const front = boost.filter(s => structure.includes(s));
    const leading = structure.filter(s => ["중요성","추천 주제","관련 키워드","탐구 동기"].includes(s));
    const leadingSet = new Set(leading);
    const finalFront = leading.concat(front.filter(s => !leadingSet.has(s)));
    const finalSet = new Set(finalFront);
    return finalFront.concat(keep.filter(s => !finalSet.has(s)));
  }

  function buildTargetStructure(reportChoices){
    const lineProfile = LINE_PROFILES[reportChoices.line] || LINE_PROFILES.standard;
    const modeProfile = MODE_PROFILES[reportChoices.mode] || MODE_PROFILES.principle;
    return applyModeOrdering(arr(lineProfile.targetStructure), modeProfile);
  }

  function fillTemplate(text, payload){
    return val(text)
      .replaceAll("{subject}", payload.subject || "선택 과목")
      .replaceAll("{department}", payload.department || "선택 학과")
      .replaceAll("{concept}", payload.selectedConcept || "선택 개념")
      .replaceAll("{keyword}", payload.selectedRecommendedKeyword || "선택 키워드")
      .replaceAll("{axis}", payload.followupAxis || "후속 연계축");
  }

  function buildSectionPurpose(targetStructure, payload, reportChoices, axisRule, keywordFrame, examplePattern){
    const modeProfile = MODE_PROFILES[reportChoices.mode] || MODE_PROFILES.principle;
    const viewProfile = VIEW_PROFILES[reportChoices.view] || { focus: `${reportChoices.view || "선택 관점"}으로 보고서를 정리한다.` };
    const lineProfile = LINE_PROFILES[reportChoices.line] || LINE_PROFILES.standard;
    const sectionPurpose = {};
    targetStructure.forEach(name => {
      const base = fillTemplate(SECTION_TEMPLATES[name]?.prompt || `${name} 항목은 선택 흐름에 맞춰 작성한다.`, payload);
      sectionPurpose[name] = `${base} ${modeProfile.focusSentence} ${viewProfile.focus}`;
    });
    sectionPurpose["__report_choice_rule__"] = `${lineProfile.label} / ${modeProfile.label} / ${viewProfile.label || reportChoices.view} 선택값을 반영해 문단 수와 강조점을 조정한다.`;
    sectionPurpose["__example_pattern__"] = `${examplePattern.label}: ${examplePattern.studentUse}`;
    if (keywordFrame?.problemContext) sectionPurpose["__keyword_problem_context__"] = keywordFrame.problemContext;
    if (axisRule?.writingPattern) sectionPurpose["__axis_writing_pattern__"] = axisRule.writingPattern;
    return sectionPurpose;
  }


  function buildReportChoiceInstruction(reportChoices, targetStructure){
    const modeProfile = MODE_PROFILES[reportChoices.mode] || MODE_PROFILES.principle;
    const viewProfile = VIEW_PROFILES[reportChoices.view] || { label: reportChoices.view || "선택 관점", focus: "선택 관점에 맞춰 질문·자료·결론 방향을 조정한다." };
    const lineProfile = LINE_PROFILES[reportChoices.line] || LINE_PROFILES.standard;
    const sections = arr(targetStructure);
    const modeInstruction = `${modeProfile.label}: ${modeProfile.writingStyle}. ${modeProfile.focusSentence}`;
    const viewInstruction = `${viewProfile.label || reportChoices.view}: ${viewProfile.focus}`;
    const lineInstruction = `${lineProfile.label}: ${lineProfile.outputGoal}. ${lineProfile.structureRule}`;
    const miniDirective = [
      `동국대 기준: 수행평가 영역명은 주제(내용) × 방법으로 해석한다.`,
      `6번 수행평가 방식(${modeProfile.label})은 영역명의 방법과 보고서 전개 논리로 반영한다: ${modeProfile.writingStyle}.`,
      `7번 평가 관점·과정 증거(${viewProfile.label || reportChoices.view})는 질문·자료 표·결론의 해석 렌즈로 유지한다: ${viewProfile.focus}.`,
      `8번 결과물 수준(${lineProfile.label})은 문단 수와 깊이를 결정한다: ${lineProfile.outputGoal}.`,
      `targetStructure는 ${sections.length}개 섹션으로 구성하며, 같은 키워드가 제목·질문·결론에 반복되지 않도록 주제와 방법을 분리한다.`
    ];
    return {
      modeInstruction,
      viewInstruction,
      lineInstruction,
      miniDirective,
      choiceSummary: `${modeProfile.label} + ${viewProfile.label || reportChoices.view} + ${lineProfile.label}`,
      studentPreview: `${modeProfile.label}으로 수행하고, ${viewProfile.label || reportChoices.view}을 과정 증거로 삼아, ${lineProfile.label} 수준으로 작성합니다.`
    };
  }

  function hasRealSelectedBook(book){
    return !!(book && (book.title || book.sourceId || book.managementNo));
  }

  function getBookUsageMode(selectedBook){
    let raw = "";
    try { raw = val(global.__BOOK_USAGE_MODE__ || localStorage.getItem("ke.bookUsageMode.v222") || readDomValue("bookUsageMode")); } catch(error) { raw = val(global.__BOOK_USAGE_MODE__); }
    if (!raw) raw = hasRealSelectedBook(selectedBook) ? "useBook" : "noBook";
    if (/^(useBook|book|use|도서활용|도서 사용)$/i.test(raw)) return hasRealSelectedBook(selectedBook) ? "useBook" : "noBook";
    return "noBook";
  }

  function shouldUseBook(selectedBook){
    return getBookUsageMode(selectedBook) === "useBook" && hasRealSelectedBook(selectedBook);
  }


  function buildSecondaryExpansionContext(basePayload, reportChoices, axisRule, keywordFrame, selectedBookContext){
    const concept = basePayload.selectedConcept || "선택 교과 개념";
    const keyword = basePayload.selectedRecommendedKeyword || basePayload.selectedKeyword || "선택 키워드";
    const axis = basePayload.followupAxis || basePayload.selectedFollowupAxis || "후속 연계축";
    const department = basePayload.department || "선택 진로 분야";
    const subject = basePayload.subject || "선택 과목";
    const modeLabel = reportChoices.modeLabel || reportChoices.mode || "수행평가 방식";
    const viewLabel = reportChoices.viewLabel || reportChoices.view || "평가 관점";
    const lineLabel = reportChoices.lineLabel || reportChoices.line || "결과물 수준";
    const bookTitle = selectedBookContext && selectedBookContext.title ? selectedBookContext.title : "";

    const textForRecommend = `${modeLabel} ${viewLabel} ${lineLabel} ${axis} ${keyword} ${concept}`;
    let recommendedPathId = "data-evidence";
    if(/원리|설명|구조|기능/.test(textForRecommend)) recommendedPathId = "principle-analysis";
    if(/비교|대조|차이/.test(textForRecommend)) recommendedPathId = "case-comparison";
    if(/자료|데이터|통계|그래프|측정|모델/.test(textForRecommend)) recommendedPathId = "data-evidence";
    if(/사회|윤리|정책|공동체|의미|쟁점/.test(textForRecommend)) recommendedPathId = "social-meaning";
    if(/심화|후속|한계|추가/.test(textForRecommend)) recommendedPathId = "followup-inquiry";

    const paths = SECONDARY_EXPANSION_PATHS.map((path, index) => {
      const question = path.id === "principle-analysis"
        ? `${keyword}는 ${concept}의 어떤 원리와 조건으로 설명할 수 있을까?`
        : path.id === "case-comparison"
          ? `${keyword}를 두 사례나 조건으로 비교하면 어떤 차이가 드러날까?`
          : path.id === "data-evidence"
            ? `${keyword}는 자료에서 어떤 수치·변화·패턴으로 확인할 수 있을까?`
            : path.id === "social-meaning"
              ? `${keyword}는 실제 사회 문제나 공동체에 어떤 의미를 가질까?`
              : `이번 탐구의 한계를 보완하려면 다음에는 무엇을 더 확인해야 할까?`;
      return {
        rank: index + 1,
        id: path.id,
        label: path.label,
        shortLabel: path.shortLabel,
        isRecommended: path.id === recommendedPathId,
        purpose: path.purpose,
        question,
        evidenceTypes: path.evidenceTypes,
        paragraphStructure: path.structure,
        studentInput: path.studentInput,
        reportDifferentiation: `${path.label}을 선택하면 같은 1차 설계값이라도 질문, 자료, 본론 구조, 결론 방향이 달라진다.`,
        aiPromptGuide: [
          `아래 1차 탐구 설계값을 바탕으로 '${path.label}' 방향의 수행평가 보고서 초안 구조를 만들어줘.`,
          "보고서를 바로 완성하지 말고, 문단별 작성 방향과 내가 직접 채워야 할 자료·해석 칸을 제시해줘.",
          `반드시 ${concept}, ${keyword}, ${axis}의 연결 이유가 보이게 해줘.`
        ].join(" ")
      };
    });

    return {
      version: "secondary-expansion-context-v228",
      purpose: "1차 선택값을 그대로 보고서로 만들지 않고, 2차 확장 방향을 학생이 다시 선택하게 하여 중복성을 낮추는 구조",
      principle: "1차 데이터 = 공통 뼈대 / 2차 확장 방향 = 분기점 / 학생 자료 = 개인화 근거 / 3차 초안 = 최종 문단화",
      sourceSelection: { subject, department, concept, keyword, followupAxis: axis, reportMode: modeLabel, reportView: viewLabel, reportLine: lineLabel, selectedBookTitle: bookTitle },
      recommendedPathId,
      paths,
      studentRequiredInputs: [
        "내가 선택할 2차 확장 방향 1개",
        "내가 직접 찾은 자료 제목과 출처",
        "자료에서 확인한 수치·사례·문장",
        "수업에서 배운 교과 개념과 연결한 내 설명",
        "보고서 결론에서 말하고 싶은 나의 해석"
      ],
      aiReuseWorkflow: [
        "1단계: 1차 설계값의 연결성 점검",
        "2단계: 2차 확장 방향 1개 선택",
        "3단계: 선택 방향에 맞는 자료 찾기",
        "4단계: ChatGPT에는 보고서 대필이 아니라 선택 방향 기반 초안 구조화를 요청",
        "5단계: 학생 초안 작성 후 첨삭 요청"
      ]
    };
  }

  function buildPerformanceAssessmentContext(basePayload, reportChoices, targetStructure, axisRule, keywordFrame){
    const modeProfile = MODE_PROFILES[reportChoices.mode] || MODE_PROFILES.principle;
    const viewProfile = VIEW_PROFILES[reportChoices.view] || { label: reportChoices.view || "평가 관점", focus: "자료 해석 과정이 드러나도록 한다." };
    const lineProfile = LINE_PROFILES[reportChoices.line] || LINE_PROFILES.standard;
    const concept = basePayload.selectedConcept || "선택 교과 개념";
    const keyword = basePayload.selectedRecommendedKeyword || basePayload.selectedKeyword || "선택 키워드";
    const axis = basePayload.followupAxis || basePayload.selectedFollowupAxis || "후속 연계축";
    return {
      version: "dongguk-performance-assessment-v222-book-optional",
      principle: "수행평가 영역명 = 주제(내용) × 방법",
      content: {
        source: "3번 교과 개념 + 추천 키워드",
        concept,
        keyword,
        normalizedContent: `${concept} / ${keyword}`
      },
      method: {
        source: "4번 후속 연계축 + 6번 수행평가 방식",
        followupAxis: axis,
        reportMode: reportChoices.mode,
        reportModeLabel: reportChoices.modeLabel,
        methodInstruction: modeProfile.writingStyle
      },
      evidence: {
        source: "7번 평가 관점·과정 증거",
        reportView: reportChoices.view,
        reportViewLabel: reportChoices.viewLabel,
        evidenceFocus: viewProfile.focus
      },
      outputLevel: {
        source: "8번 결과물 수준",
        reportLine: reportChoices.line,
        reportLineLabel: reportChoices.lineLabel,
        structureRule: lineProfile.structureRule,
        sectionCount: arr(targetStructure).length
      },
      dataRole: {
        axisWritingPattern: axisRule?.writingPattern || "자료를 기준-비교-해석-한계 순서로 사용한다.",
        keywordProblemContext: keywordFrame?.problemContext || "선택 키워드를 실제 문제로 확장한다.",
        bookPolicy: basePayload.useBookInReport ? "선택 도서를 참고자료의 근거·관점으로 사용한다." : "도서를 강제로 넣지 않고 공공자료·통계·기사·실험자료를 근거로 사용한다."
      },
      dedupeRules: [
        "제목에서 같은 명사구를 반복하지 않는다.",
        "주제(내용)는 한 번만 제시하고, 방법은 동사형으로 붙인다.",
        "학과명은 반복하지 말고 전공 사고방식으로 바꾼다.",
        "수행평가 방식과 평가 관점을 분리해 MINI에 전달한다."
      ],
      miniInstruction: `주제는 ${concept}·${keyword}에서 가져오고, 방법은 ${reportChoices.modeLabel}으로, 과정 증거는 ${reportChoices.viewLabel}으로 구성한다.`
    };
  }

  function buildReportGenerationContext(basePayload, selectedBook, result){
    const rawChoices = getReportChoices(getState());
    const axisRule = inferAxisRule(result, basePayload);
    const reportChoices = completeReportChoices(rawChoices, basePayload, axisRule);
    const keywordFrame = inferKeywordFrame(basePayload);
    const examplePattern = inferExamplePattern(basePayload, axisRule, reportChoices);
    const useBookInReport = shouldUseBook(selectedBook);
    basePayload.useBookInReport = useBookInReport;
    basePayload.bookUsageMode = useBookInReport ? "useBook" : "noBook";
    const selectedBookContext = useBookInReport ? (selectedBook?.selectedBookContext || null) : null;
    const targetStructure = buildTargetStructure(reportChoices);
    const sectionPurpose = buildSectionPurpose(targetStructure, basePayload, reportChoices, axisRule, keywordFrame, examplePattern);
    const choiceInstruction = buildReportChoiceInstruction(reportChoices, targetStructure);
    const performanceAssessment = buildPerformanceAssessmentContext(basePayload, reportChoices, targetStructure, axisRule, keywordFrame);
    const secondaryExpansionContext = buildSecondaryExpansionContext(basePayload, reportChoices, axisRule, keywordFrame, selectedBookContext);
    const modeProfile = MODE_PROFILES[reportChoices.mode] || MODE_PROFILES.principle;
    const lineProfile = LINE_PROFILES[reportChoices.line] || LINE_PROFILES.standard;
    const viewProfile = VIEW_PROFILES[reportChoices.view] || null;

    return {
      reportOutputType: REPORT_CONTEXT_RULES.defaultOutputType,
      bookUsageMode: useBookInReport ? "useBook" : "noBook",
      useBookInReport,
      evidenceSourcePolicy: useBookInReport ? "도서+자료 선택형" : "도서 미사용 자료 중심형",
      depthLevel: REPORT_CONTEXT_RULES.defaultDepthLevel,
      writingStyle: modeProfile.writingStyle || REPORT_CONTEXT_RULES.defaultWritingStyle,
      targetStructure,
      sectionPurpose,
      sectionTemplates: SECTION_TEMPLATES,
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
      reportChoices,
      performanceAssessment,
      secondaryExpansionContext,
      secondaryExpansionMode: "path-selection-before-draft",
      reportChoiceInstruction: choiceInstruction,
      reportChoiceMiniDirective: choiceInstruction.miniDirective,
      reportModeProfile: modeProfile,
      reportViewProfile: viewProfile,
      reportLineProfile: lineProfile,
      examplePattern,
      reportExamplePatternVersion: EXAMPLE_PATTERNS.version,
      writingRules: REPORT_CONTEXT_RULES.miniWritingRules.concat(choiceInstruction.miniDirective).concat([
        useBookInReport ? "선택 도서를 참고문헌과 해석 관점에 반영한다." : "도서를 선택하지 않은 수행평가이므로 도서명·책 요약·독후감 표현을 강제로 넣지 않는다.",
        useBookInReport ? "참고문헌에는 선택 도서와 필요한 자료를 함께 배치한다." : "참고자료에는 공공기관 자료, 통계, 기사, 실험자료, 교과서 자료를 중심으로 배치한다.",
        `수행평가 방식은 '${reportChoices.modeLabel}'로 작성한다.`,
        `평가 관점·과정 증거는 '${reportChoices.viewLabel}'을 중심으로 유지한다.`,
        `결과물 수준은 '${reportChoices.lineLabel}' 구조를 따른다.`,
        `참고 패턴은 '${examplePattern.label}' 유형을 따르되, 원문을 복사하지 않고 선택 개념·키워드에 맞게 재구성한다.`,
        "1차 설계값을 바로 완성 보고서로 만들지 말고, 2차 확장 방향 후보를 제시한 뒤 학생이 선택한 방향에 맞춰 초안을 구조화한다.",
        "2차 확장 방향은 원리 분석형, 사례 비교형, 자료 해석형, 사회적 의미형, 후속 탐구형 중에서 선택하게 한다."
      
      ]),
      operatorOnly: {
        payloadUse: "이 객체는 학생 화면 출력이 아니라 MINI 보고서 생성을 위한 내부 구조 데이터이다.",
        sourceExampleData: "report_dataset_stage2_RPT001_010.xlsx 기반 패턴"
      }
    };
  }

  function buildMiniPayload(overrides){
    const state = getState();
    const result = getBookResult();
    const rawPayload = result?.payload || {};
    const payload = {
      ...rawPayload,
      subject: val(rawPayload.subject) || state.subject || "",
      department: val(rawPayload.department) || state.career || state.selectedMajor || state.majorSelectedName || "",
      selectedConcept: val(rawPayload.selectedConcept) || state.concept || state.selectedConcept || "",
      selectedRecommendedKeyword: val(rawPayload.selectedRecommendedKeyword) || state.keyword || state.selectedKeyword || "",
      followupAxis: val(rawPayload.followupAxis) || state.axisLabel || state.linkTrack || state.followupAxisId || "",
      reportIntent: val(rawPayload.reportIntent) || "수행평가 탐구 설계"
    };

    const strong = getActiveSelectionSnapshot();
    if (strong.subject) payload.subject = strong.subject;
    if (strong.career) payload.department = strong.career;
    if (strong.concept) payload.selectedConcept = strong.concept;
    if (strong.keyword && !isWeakKeyword(strong.keyword)) payload.selectedRecommendedKeyword = strong.keyword;
    if (strong.axisLabel) payload.followupAxis = strong.axisLabel;
    else if (isWeakAxis(payload.followupAxis) && strong.linkTrack) payload.followupAxis = strong.linkTrack;

    const candidateBook = getSelectedBookFromResult(result, { ...state, ...strong });
    const useBookInReport = shouldUseBook(candidateBook);
    const selectedBook = useBookInReport ? candidateBook : null;
    const rawChoices = getReportChoices(state);

    const miniPayload = {
      version: BUILDER_VERSION,
      createdAt: new Date().toISOString(),
      source: "keyword-engine",
      selectionPayload: {
        subjectGroup: state.subjectGroup || strong.subjectGroup || readDomValue("subjectGroup") || "",
        bookUsageMode: useBookInReport ? "useBook" : "noBook",
        useBookInReport,
        evidenceSourcePolicy: useBookInReport ? "도서+자료 선택형" : "도서 미사용 자료 중심형",
        subject: payload.subject || "",
        department: payload.department || "",
        selectedConcept: payload.selectedConcept || "",
        selectedRecommendedKeyword: payload.selectedRecommendedKeyword || "",
        selectedKeyword: payload.selectedRecommendedKeyword || "",
        followupAxis: payload.followupAxis || "",
        selectedFollowupAxis: payload.followupAxis || "",
        reportIntent: payload.reportIntent || "",
        reportMode: rawChoices.mode,
        reportModeLabel: rawChoices.modeLabel,
        performanceMethod: rawChoices.modeLabel,
        reportView: rawChoices.view,
        reportViewLabel: rawChoices.viewLabel,
        performanceEvidence: rawChoices.viewLabel,
        reportLine: rawChoices.line,
        reportLineLabel: rawChoices.lineLabel,
        performanceOutputLevel: rawChoices.lineLabel
      },
      selectedBook: selectedBook ? {
        managementNo: selectedBook.managementNo,
        sourceId: selectedBook.sourceId,
        title: selectedBook.title,
        author: selectedBook.author,
        recommendationType: selectedBook.matchType || selectedBook.recommendationType,
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
    getCurrentState: getState,
    getReportChoiceProfiles: function(){ return { mode: MODE_PROFILES, view: VIEW_PROFILES, line: LINE_PROFILES }; }
  };

  global.__BUILD_MINI_REPORT_PAYLOAD__ = buildMiniPayload;
})(typeof window !== "undefined" ? window : globalThis);
