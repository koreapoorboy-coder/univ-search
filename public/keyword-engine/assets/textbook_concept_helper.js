window.__TEXTBOOK_CONCEPT_HELPER_VERSION = 'v33.18-korean-major-bridge-lock';

(function () {
  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 구조 정리 기준
  // - 교과 원본 SSOT: seed/textbook-data/
  // - 3번 화면 런타임 데이터: seed/textbook-v1/
  // - 4번 종단 연결/브리지 데이터: seed/followup-axis/
  //
  // 실무 원칙:
  // 1) 과목 수정은 textbook-data부터
  // 2) 화면 반영은 textbook-v1 갱신 후 확인
  // 3) 후속 연계축은 followup-axis에서 별도 관리
  const DATA_SOURCE_POLICY = Object.freeze({
    sourceOfTruth: "seed/textbook-data/",
    runtimeUi: "seed/textbook-v1/",
    followupAxis: "seed/followup-axis/"
  });

  const ASSET_VERSION_QUERY = "v33_18_korean_major_bridge_lock";
  const addAssetVersion = (url) => `${url}${String(url).includes("?") ? "&" : "?"}v=${ASSET_VERSION_QUERY}`;
  const UI_SEED_URL = addAssetVersion(`${DATA_SOURCE_POLICY.runtimeUi}subject_concept_ui_seed.json`);
  const ENGINE_MAP_URL = addAssetVersion(`${DATA_SOURCE_POLICY.runtimeUi}subject_concept_engine_map.json`);
  const TOPIC_MATRIX_URL = addAssetVersion(`${DATA_SOURCE_POLICY.runtimeUi}topic_matrix_seed.json`);
  const FOLLOWUP_SUBJECT_URL = addAssetVersion(`${DATA_SOURCE_POLICY.followupAxis}subject_bridge_point.json`);
  const FOLLOWUP_MAJOR_URL = addAssetVersion(`${DATA_SOURCE_POLICY.followupAxis}major_followup_axis.json`);

  const SUBJECT_NAME_ALIASES = Object.freeze({
    "정보과목": "정보",
    "정보 교과": "정보",
    "Information": "정보",
    "information": "정보",
    "INFO": "정보",
    "info": "정보",
    "공통국어": "공통국어1",
    "국어1": "공통국어1",
    "국어 1": "공통국어1",
    "공통 국어1": "공통국어1",
    "공통 국어 1": "공통국어1",
    "통합사회": "통합사회1",
    "통합사회 1": "통합사회1",
    "통합사회I": "통합사회1",
    "통합사회Ⅰ": "통합사회1",
    "물리학": "물리",
    "물리학1": "물리",
    "물리학 1": "물리",
    "물리학I": "물리",
    "물리학Ⅰ": "물리",
    "화학학": "화학",
    "화학1": "화학",
    "화학 1": "화학",
    "화학I": "화학",
    "화학Ⅰ": "화학",
    "생명과학1": "생명과학",
    "생명과학 1": "생명과학",
    "생명과학I": "생명과학",
    "생명과학Ⅰ": "생명과학",
    "지구과학1": "지구과학",
    "지구과학 1": "지구과학",
    "지구과학I": "지구과학",
    "지구과학Ⅰ": "지구과학",
    "역학과에너지": "역학과 에너지",
    "고등 역학과 에너지": "역학과 에너지",
    "고등학교 역학과 에너지": "역학과 에너지",
    "전자기와양자": "전자기와 양자",
    "고등 전자기와 양자": "전자기와 양자",
    "고등학교 전자기와 양자": "전자기와 양자",
    "물질과에너지": "물질과 에너지",
    "고등 물질과 에너지": "물질과 에너지",
    "고등학교 물질과 에너지": "물질과 에너지",
    "세포와물질대사": "세포와 물질대사",
    "고등 세포와 물질대사": "세포와 물질대사",
    "고등학교 세포와 물질대사": "세포와 물질대사",
    "지구시스템과학": "지구시스템과학",
    "지구시스템 과학": "지구시스템과학",
    "고등 지구시스템과학": "지구시스템과학",
    "고등학교 지구시스템과학": "지구시스템과학"
  });
  const SUBJECT_CONCEPT_LONGITUDINAL_URLS = {
    "통합과학1": "seed/followup-axis/integrated_science1_concept_longitudinal_map.json",
    "통합과학2": "seed/followup-axis/integrated_science2_concept_longitudinal_map.json",
    "공통수학1": "seed/followup-axis/common_math1_concept_longitudinal_map.json",
    "공통수학2": "seed/followup-axis/common_math2_concept_longitudinal_map.json",
    "정보": addAssetVersion("seed/followup-axis/info_concept_longitudinal_map.json"),
    "통합사회1": "seed/followup-axis/integrated_society1_concept_longitudinal_map.json",
    "통합사회": "seed/followup-axis/integrated_society1_concept_longitudinal_map.json",
    "공통국어1": "seed/followup-axis/common_korean1_concept_longitudinal_map.json",
    "공통국어2": "seed/followup-axis/common_korean2_concept_longitudinal_map.json",
    "통합사회2": "seed/followup-axis/integrated_society2_concept_longitudinal_map.json",
    "과학탐구실험1": "seed/followup-axis/science_inquiry1_concept_longitudinal_map.json",
    "과학탐구실험2": "seed/followup-axis/science_inquiry2_concept_longitudinal_map.json",
    "대수": "seed/followup-axis/algebra_concept_longitudinal_map.json",
    "확률과 통계": "seed/followup-axis/probability_statistics_concept_longitudinal_map.json",
    "미적분1": "seed/followup-axis/calculus1_concept_longitudinal_map.json",
    "기하": "seed/followup-axis/geometry_concept_longitudinal_map.json",
    "물리": "seed/followup-axis/physics1_concept_longitudinal_map.json",
    "물리학": "seed/followup-axis/physics1_concept_longitudinal_map.json",
    "물리학Ⅰ": "seed/followup-axis/physics1_concept_longitudinal_map.json",
    "화학": "seed/followup-axis/chemistry1_concept_longitudinal_map.json",
    "화학Ⅰ": "seed/followup-axis/chemistry1_concept_longitudinal_map.json",
    "화학1": "seed/followup-axis/chemistry1_concept_longitudinal_map.json",
    "생명과학": "seed/followup-axis/life_science_concept_longitudinal_map.json",
    "생명과학Ⅰ": "seed/followup-axis/life_science_concept_longitudinal_map.json",
    "생명과학1": "seed/followup-axis/life_science_concept_longitudinal_map.json",
    "지구과학": "seed/followup-axis/earth_science_concept_longitudinal_map.json",
    "지구과학Ⅰ": "seed/followup-axis/earth_science_concept_longitudinal_map.json",
    "지구과학1": "seed/followup-axis/earth_science_concept_longitudinal_map.json",
    "역학과 에너지": "seed/followup-axis/mechanics_energy_concept_longitudinal_map.json",
    "역학과에너지": "seed/followup-axis/mechanics_energy_concept_longitudinal_map.json",
    "전자기와 양자": "seed/followup-axis/electromagnetism_quantum_concept_longitudinal_map.json",
    "전자기와양자": "seed/followup-axis/electromagnetism_quantum_concept_longitudinal_map.json",
    "물질과 에너지": "seed/followup-axis/matter_energy_concept_longitudinal_map.json",
    "물질과에너지": "seed/followup-axis/matter_energy_concept_longitudinal_map.json",
    "세포와 물질대사": "seed/followup-axis/cell_metabolism_concept_longitudinal_map.json",
    "세포와물질대사": "seed/followup-axis/cell_metabolism_concept_longitudinal_map.json"
  }

  const state = {
    subject: "",
    career: "",
    linkTrack: "",
    concept: "",
    keyword: "",
    selectedBook: "",
    selectedBookTitle: "",
    reportMode: "",
    reportView: "",
    reportLine: "",
    majorSelectedName: "",
    majorCoreKeywords: [],
    majorComparison: null,
    linkTrackSource: "",
    showAllConcepts: false
  };

  const REPORT_LINE_HELP = {
    basic: {
      id: "basic",
      title: "기본형",
      desc: "고1 학생이 처음 쓰기 좋은 구조입니다. 개념을 먼저 설명하고, 도서를 참고로 간단히 넓혀 마무리합니다.",
      fit: "처음 쓰는 학생 / 교과 개념 설명 중심",
      sections: [
        "주제 선정 이유",
        "교과 개념 설명",
        "도서로 넓히기",
        "정리와 느낀 점"
      ]
    },
    standard: {
      id: "standard",
      title: "확장형",
      desc: "수행평가에서 가장 많이 쓰는 구조입니다. 교과 개념을 설명하고, 도서·사례·데이터 중 하나를 넣어 확장합니다.",
      fit: "일반 수행평가 / 비교·데이터·사례 확장",
      sections: [
        "주제 선정 이유",
        "교과 개념 설명",
        "도서·사례·데이터 확장",
        "분석과 해석",
        "결론 및 후속 연결"
      ]
    },
    advanced: {
      id: "advanced",
      title: "심화형",
      desc: "고2~고3 심화 탐구용 구조입니다. 현재 과목과 후속 과목, 진로를 함께 연결해 깊이 있게 정리합니다.",
      fit: "심화 탐구 / 후속 과목·진로 연결",
      sections: [
        "주제 선정 이유",
        "현재 과목의 핵심 개념 설명",
        "후속 과목 연결",
        "도서·자료 근거 확장",
        "분석과 한계",
        "추가 탐구 계획"
      ]
    }
  };

  const VIEW_HELP = {
    "구조": {
      title: "구조 관점",
      desc: "대상이 무엇으로 이루어져 있고, 각 부분이 어떻게 연결되어 있는지 중심으로 정리합니다.",
      example: "예: 센서가 어떤 구성 요소로 이루어지고, 각 요소가 어떤 역할을 나누는지 설명하기"
    },
    "기능": {
      title: "기능 관점",
      desc: "대상이 실제로 무엇을 하는지, 어떤 역할을 수행하는지 중심으로 설명합니다.",
      example: "예: 온도 센서가 왜 필요한지, 측정 과정에서 어떤 기능을 하는지 정리하기"
    },
    "안정성": {
      title: "안정성 관점",
      desc: "쉽게 흔들리거나 무너지지 않고 일정한 상태를 유지하는 조건을 중심으로 봅니다.",
      example: "예: 구조물이 왜 안정적으로 버텨야 하는지, 흔들림과 충격에 어떻게 대응하는지 설명하기"
    },
    "효율": {
      title: "효율 관점",
      desc: "같은 결과를 내기 위해 시간·에너지·비용을 얼마나 덜 쓰는지에 초점을 둡니다.",
      example: "예: 같은 장치라도 에너지를 덜 쓰고 더 정확하게 작동하는 방법 비교하기"
    },
    "비교": {
      title: "비교 관점",
      desc: "두 대상이나 두 조건을 나란히 놓고 차이점과 공통점을 정리합니다.",
      example: "예: 두 종류의 센서나 두 실험 조건을 비교해 어떤 점이 다른지 설명하기"
    },
    "원리": {
      title: "원리 관점",
      desc: "왜 그런 현상이 일어나는지, 어떤 과학 개념이 작동하는지 중심으로 풀이합니다.",
      example: "예: 산화가 왜 일어나는지, 온도 센서가 어떤 원리로 값을 읽는지 설명하기"
    },
    "변화": {
      title: "변화 관점",
      desc: "시간이 지나면서 값이나 상태가 어떻게 달라지는지 흐름 중심으로 정리합니다.",
      example: "예: 온도 변화에 따라 재료의 성질이나 측정값이 어떻게 달라지는지 설명하기"
    },
    "데이터": {
      title: "데이터 관점",
      desc: "수치, 그래프, 측정값을 해석해서 의미를 찾는 방식으로 정리합니다.",
      example: "예: 측정 데이터를 그래프로 보고, 어떤 경향이 나타나는지 해석하기"
    }
  };


  const TRACK_HELP = {
    physics: {
      id: "physics",
      title: "물리 연계",
      short: "힘·운동·센서",
      nextSubject: "고2 물리학",
      desc: "힘, 운동, 전류, 센서, 구조 안정성처럼 물리학으로 이어지는 방향입니다.",
      easy: "기계, 반도체, 센서, 구조 쪽 보고서에 잘 맞아요."
    },
    chemistry: {
      id: "chemistry",
      title: "화학 연계",
      short: "원소·재료·반응",
      nextSubject: "고2 화학",
      desc: "원소, 물질 성질, 산화·환원, 재료 변화처럼 화학으로 이어지는 방향입니다.",
      easy: "신소재, 배터리, 재료 성질 쪽 보고서에 잘 맞아요."
    },
    biology: {
      id: "biology",
      title: "생명과학 연계",
      short: "생명·건강·반응",
      nextSubject: "고2 생명과학",
      desc: "세포, 항상성, 생체 반응, 건강 데이터처럼 생명과학으로 이어지는 방향입니다.",
      easy: "의학, 간호, 생명, 바이오 쪽 보고서에 잘 맞아요."
    },
    earth: {
      id: "earth",
      title: "지구과학 연계",
      short: "환경·기후·지구",
      nextSubject: "고2 지구과학",
      desc: "환경, 기후, 지구 시스템, 관측 데이터처럼 지구과학으로 이어지는 방향입니다.",
      easy: "환경, 기후, 우주, 지구 시스템 쪽 보고서에 잘 맞아요."
    }
  };

  let uiSeed = null;
  let engineMap = null;
  let topicMatrix = null;
  let subjectBridgePoint = [];
  let majorFollowupAxis = [];
  let conceptLongitudinalMaps = {};

  window.__TEXTBOOK_CONCEPT_HELPER_DIAG__ = function () {
    const subject = state?.subject || "";
    const engineKeys = engineMap ? Object.keys(engineMap) : [];
    return {
      version: window.__TEXTBOOK_CONCEPT_HELPER_VERSION,
      subject,
      hasInfoEngine: !!(engineMap && engineMap["정보"] && engineMap["정보"].concepts),
      infoConceptCount: engineMap && engineMap["정보"] && engineMap["정보"].concepts ? Object.keys(engineMap["정보"].concepts).length : 0,
      hasInfoUi: !!(uiSeed && uiSeed["정보"]),
      engineKeySample: engineKeys.slice(0, 30)
    };
  };


  const INFO_FALLBACK_UI_SEED = {
  "meta": {
    "subject_kr": "정보",
    "subject_en": "Information",
    "publisher": "Cmas",
    "curriculum": "2015 Revised Curriculum",
    "source_name": "information_structure_db",
    "version": "0.2.0-cross-evaluation"
  },
  "concept_order": [
    "지식·정보 사회와 정보 문화",
    "자료와 정보의 표현",
    "자료와 정보의 분석",
    "추상화와 문제 분해",
    "알고리즘 설계와 분석",
    "프로그래밍과 자동화",
    "컴퓨팅 시스템과 네트워크"
  ],
  "concept_buttons": [
    {
      "concept": "지식·정보 사회와 정보 문화",
      "unit": "정보 문화",
      "student_topics": [
        "정보 사회에서 필요한 태도와 역량은 무엇일까?",
        "디지털 환경에서는 왜 정보 윤리와 정보 보호가 중요할까?",
        "정보 문화 소양은 다른 과목 학습에도 어떻게 도움이 될까?"
      ],
      "core_preview": [
        "정보 문화",
        "지식·정보 사회",
        "정보 문화 소양",
        "정보 윤리"
      ]
    },
    {
      "concept": "자료와 정보의 표현",
      "unit": "자료와 정보",
      "student_topics": [
        "정보는 왜 약속된 표현 방식이 있어야 전달될까?",
        "아날로그 정보를 디지털로 바꾸는 이유는 무엇일까?",
        "같은 정보도 표현 방식에 따라 왜 다르게 보일까?"
      ],
      "core_preview": [
        "자료",
        "정보",
        "표현 체계",
        "디지털 변환"
      ]
    },
    {
      "concept": "자료와 정보의 분석",
      "unit": "자료와 정보",
      "student_topics": [
        "자료를 그냥 모으는 것과 분석하는 것은 왜 다를까?",
        "의미 있는 정보는 어떻게 만들어질까?",
        "문제 해결에 필요한 자료는 어떤 기준으로 모아야 할까?"
      ],
      "core_preview": [
        "자료 수집",
        "자료 분석",
        "정보 구성",
        "의미 도출"
      ]
    },
    {
      "concept": "추상화와 문제 분해",
      "unit": "문제 해결과 프로그래밍",
      "student_topics": [
        "복잡한 문제는 왜 바로 풀기보다 먼저 단순화해야 할까?",
        "중요한 요소만 남기는 추상화는 어떻게 이루어질까?",
        "문제 분해는 왜 실제 문제 해결을 더 쉽게 만들까?"
      ],
      "core_preview": [
        "추상화",
        "문제 이해",
        "문제 분해",
        "모델링"
      ]
    },
    {
      "concept": "알고리즘 설계와 분석",
      "unit": "문제 해결과 프로그래밍",
      "student_topics": [
        "같은 문제도 왜 알고리즘에 따라 효율이 달라질까?",
        "정렬과 탐색은 왜 데이터를 빠르게 처리하게 해 줄까?",
        "반복과 선택 구조는 어떤 문제에서 특히 유용할까?"
      ],
      "core_preview": [
        "알고리즘",
        "순차 구조",
        "선택 구조",
        "반복 구조"
      ]
    },
    {
      "concept": "프로그래밍과 자동화",
      "unit": "문제 해결과 프로그래밍",
      "student_topics": [
        "사람의 언어와 컴퓨터 언어는 왜 번역 과정이 필요할까?",
        "프로그래밍은 어떻게 반복되는 문제를 자동화할까?",
        "좋은 프로그램은 왜 변수와 흐름 설계가 중요할까?"
      ],
      "core_preview": [
        "프로그래밍 언어",
        "고급 언어",
        "저급 언어",
        "컴파일러"
      ]
    },
    {
      "concept": "컴퓨팅 시스템과 네트워크",
      "unit": "컴퓨팅 시스템",
      "student_topics": [
        "네트워크는 왜 단순 연결을 넘어 협업의 기반이 될까?",
        "컴퓨팅 시스템은 어떻게 정보를 공유하고 유통할까?",
        "협업적 문제 해결에는 왜 네트워크 환경이 중요할까?"
      ],
      "core_preview": [
        "컴퓨팅 시스템",
        "네트워크",
        "공유",
        "유통"
      ]
    }
  ]
};

  const INFO_FALLBACK_ENGINE_MAP = {
  "meta": {
    "subject_kr": "정보",
    "subject_en": "Information",
    "publisher": "Cmas",
    "curriculum": "2015 Revised Curriculum",
    "source_name": "information_structure_db",
    "version": "0.2.0-cross-evaluation"
  },
  "concepts": {
    "지식·정보 사회와 정보 문화": {
      "unit": "정보 문화",
      "lesson_focus": "지식·정보 사회의 특징을 이해하고 사회 구성원으로서 정보 문화 소양을 기른다.",
      "core_concepts": [
        "정보 문화",
        "지식·정보 사회",
        "정보 문화 소양",
        "정보 윤리",
        "디지털 시민성"
      ],
      "micro_keywords": [
        "지식·정보 사회",
        "사회 구성원",
        "정보 문화 소양",
        "정보 윤리 의식",
        "정보 보호",
        "정보 기술 활용",
        "디지털 의사소통",
        "공유와 협업"
      ],
      "student_topics": [
        "정보 사회에서 필요한 태도와 역량은 무엇일까?",
        "디지털 환경에서는 왜 정보 윤리와 정보 보호가 중요할까?",
        "정보 문화 소양은 다른 과목 학습에도 어떻게 도움이 될까?"
      ],
      "linked_activity_types": [
        "사례 분석형",
        "토론형",
        "생활 적용형"
      ],
      "linked_career_bridge": [
        "디지털 시민성",
        "정보 윤리",
        "정보 보호",
        "협업 문화"
      ],
      "horizontal_links": [
        {
          "subject": "통합사회1",
          "concept": "사회 구성원과 규범",
          "evaluation_focus": "정보 사회의 규범과 시민적 책임을 설명할 수 있는가",
          "inquiry_extension": "디지털 시민성 사례를 사회 규범과 함께 분석하기"
        },
        {
          "subject": "국어",
          "concept": "정보 해석과 의사소통",
          "evaluation_focus": "정보를 올바르게 해석하고 근거 있게 전달할 수 있는가",
          "inquiry_extension": "가짜 정보와 신뢰 가능한 정보를 구분해 설명하기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "정보 심화/인공지능 기초",
          "connection_point": "디지털 시민성과 기술 활용 태도의 심화"
        }
      ]
    },
    "자료와 정보의 표현": {
      "unit": "자료와 정보",
      "lesson_focus": "아날로그 정보를 디지털로 변환하고 약속된 표현 체계를 통해 정보를 전달하는 방식을 이해한다.",
      "core_concepts": [
        "자료",
        "정보",
        "표현 체계",
        "디지털 변환",
        "부호화"
      ],
      "micro_keywords": [
        "아날로그 정보",
        "디지털 정보",
        "모스부호",
        "표현의 약속",
        "자료 표현",
        "부호화",
        "표현 방식 선택"
      ],
      "student_topics": [
        "정보는 왜 약속된 표현 방식이 있어야 전달될까?",
        "아날로그 정보를 디지털로 바꾸는 이유는 무엇일까?",
        "같은 정보도 표현 방식에 따라 왜 다르게 보일까?"
      ],
      "linked_activity_types": [
        "표현 변환형",
        "자료 해석형",
        "문제 해결형"
      ],
      "linked_career_bridge": [
        "데이터 표현",
        "디지털 신호",
        "정보 전달",
        "암호와 부호"
      ],
      "horizontal_links": [
        {
          "subject": "통합과학1",
          "concept": "센서와 디지털 정보",
          "evaluation_focus": "과학 측정값이 어떻게 디지털 정보로 표현되는지 설명할 수 있는가",
          "inquiry_extension": "온도·속도·소리 데이터를 디지털 정보 관점으로 정리하기"
        },
        {
          "subject": "공통수학1",
          "concept": "수치화",
          "evaluation_focus": "현상을 수치와 규칙으로 바꾸어 표현할 수 있는가",
          "inquiry_extension": "생활 자료를 수치 데이터로 바꾸어 표로 나타내기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "정보/인공지능 기초",
          "connection_point": "데이터 표현과 처리의 심화"
        },
        {
          "grade": "2학년",
          "subject": "과학탐구실험2",
          "connection_point": "센서 데이터와 디지털 정보 탐구로 확장"
        }
      ]
    },
    "자료와 정보의 분석": {
      "unit": "자료와 정보",
      "lesson_focus": "문제 해결을 위해 필요한 자료를 수집하고 분석하여 의미 있는 정보로 구성하는 과정을 이해한다.",
      "core_concepts": [
        "자료 수집",
        "자료 분석",
        "정보 구성",
        "의미 도출",
        "문제 해결"
      ],
      "micro_keywords": [
        "자료 수집",
        "자료 분석",
        "컴퓨팅 도구",
        "의미 있는 정보",
        "분석 과정",
        "정렬",
        "탐색",
        "비교 기준"
      ],
      "student_topics": [
        "자료를 그냥 모으는 것과 분석하는 것은 왜 다를까?",
        "의미 있는 정보는 어떻게 만들어질까?",
        "문제 해결에 필요한 자료는 어떤 기준으로 모아야 할까?"
      ],
      "linked_activity_types": [
        "데이터분석형",
        "비교판단형",
        "도구활용형"
      ],
      "linked_career_bridge": [
        "데이터 분석",
        "정보 관리",
        "컴퓨팅 도구 활용",
        "문제 해결"
      ],
      "horizontal_links": [
        {
          "subject": "공통수학1",
          "concept": "표와 그래프 해석",
          "evaluation_focus": "자료를 표·그래프로 정리하고 비교·분석할 수 있는가",
          "inquiry_extension": "생활 자료를 표와 그래프로 정리하고 패턴 해석하기"
        },
        {
          "subject": "통합과학1",
          "concept": "측정 데이터 분석",
          "evaluation_focus": "과학 실험·측정 자료를 정보 분석 관점에서 다룰 수 있는가",
          "inquiry_extension": "센서 측정값을 수집·분석하여 결론 도출하기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "과학탐구실험2",
          "connection_point": "생활 자료와 건강·환경 데이터 분석 탐구로 연결"
        },
        {
          "grade": "2학년",
          "subject": "정보 심화",
          "connection_point": "데이터 처리와 분석 알고리즘 심화"
        }
      ]
    },
    "추상화와 문제 분해": {
      "unit": "문제 해결과 프로그래밍",
      "lesson_focus": "복잡한 문제를 이해하고 분석하여 핵심 요소만 남기고 구조화하는 추상화 과정을 익힌다.",
      "core_concepts": [
        "추상화",
        "문제 이해",
        "문제 분해",
        "모델링",
        "구조화"
      ],
      "micro_keywords": [
        "현재 상태",
        "목표 상태",
        "조건 분석",
        "불필요한 요소 제거",
        "작은 문제로 나누기",
        "모델",
        "모델링",
        "비상 대피도"
      ],
      "student_topics": [
        "복잡한 문제는 왜 바로 풀기보다 먼저 단순화해야 할까?",
        "중요한 요소만 남기는 추상화는 어떻게 이루어질까?",
        "문제 분해는 왜 실제 문제 해결을 더 쉽게 만들까?"
      ],
      "linked_activity_types": [
        "문제구조화형",
        "모델링형",
        "프로젝트형"
      ],
      "linked_career_bridge": [
        "컴퓨팅 사고",
        "문제 구조화",
        "모델링",
        "프로젝트 설계"
      ],
      "horizontal_links": [
        {
          "subject": "과학탐구실험1",
          "concept": "탐구 설계",
          "evaluation_focus": "탐구 문제를 핵심 요소 중심으로 구조화할 수 있는가",
          "inquiry_extension": "과학 탐구 주제를 현재 상태-목표 상태-조건으로 정리하기"
        },
        {
          "subject": "공통수학1",
          "concept": "조건 정리와 구조화",
          "evaluation_focus": "문제의 조건을 체계적으로 정리하고 경우를 나눌 수 있는가",
          "inquiry_extension": "복잡한 상황을 표나 도식으로 구조화해 보기"
        },
        {
          "subject": "통합사회1",
          "concept": "현실 문제의 구조 분석",
          "evaluation_focus": "생활 속 문제를 사회적 맥락까지 고려해 구조화할 수 있는가",
          "inquiry_extension": "학교 안전 문제를 정보·사회 관점에서 분석하기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "융합과학 탐구",
          "connection_point": "프로젝트 문제 정의와 연구 설계의 기초로 연결"
        },
        {
          "grade": "2학년",
          "subject": "정보 심화",
          "connection_point": "알고리즘 설계 전 추상화 단계의 정교화"
        }
      ]
    },
    "알고리즘 설계와 분석": {
      "unit": "문제 해결과 프로그래밍",
      "lesson_focus": "문제 해결 절차를 순차·선택·반복 구조로 설계하고 수행 시간 관점에서 분석한다.",
      "core_concepts": [
        "알고리즘",
        "순차 구조",
        "선택 구조",
        "반복 구조",
        "수행 시간",
        "정렬",
        "탐색"
      ],
      "micro_keywords": [
        "순차",
        "선택",
        "반복",
        "버블 정렬",
        "선택 정렬",
        "순차 탐색",
        "이진 탐색",
        "성능 비교",
        "효율성"
      ],
      "student_topics": [
        "같은 문제도 왜 알고리즘에 따라 효율이 달라질까?",
        "정렬과 탐색은 왜 데이터를 빠르게 처리하게 해 줄까?",
        "반복과 선택 구조는 어떤 문제에서 특히 유용할까?"
      ],
      "linked_activity_types": [
        "알고리즘설계형",
        "효율비교형",
        "문제해결형"
      ],
      "linked_career_bridge": [
        "알고리즘 사고",
        "효율성 분석",
        "자동화 설계",
        "컴퓨팅 문제 해결"
      ],
      "horizontal_links": [
        {
          "subject": "공통수학1",
          "concept": "경우의 수와 절차적 사고",
          "evaluation_focus": "문제 해결 절차를 논리적 순서로 설계할 수 있는가",
          "inquiry_extension": "경우의 수 문제를 알고리즘 흐름으로 바꾸어 보기"
        },
        {
          "subject": "과학탐구실험1",
          "concept": "탐구 절차 설계",
          "evaluation_focus": "탐구 실험 절차를 순차·선택·반복 구조로 설명할 수 있는가",
          "inquiry_extension": "실험 절차를 순서도 형태로 표현하기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "정보 심화/프로그래밍",
          "connection_point": "자료구조와 알고리즘 심화로 연결"
        }
      ]
    },
    "프로그래밍과 자동화": {
      "unit": "문제 해결과 프로그래밍",
      "lesson_focus": "프로그래밍 언어와 번역 과정을 이해하고 변수를 활용해 문제 해결을 자동화한다.",
      "core_concepts": [
        "프로그래밍 언어",
        "고급 언어",
        "저급 언어",
        "컴파일러",
        "인터프리터",
        "변수",
        "제어 구조",
        "자동화"
      ],
      "micro_keywords": [
        "Python",
        "기계어",
        "어셈블리어",
        "원시 코드",
        "언어 번역 프로그램",
        "변수 설계",
        "입력과 출력",
        "반복문",
        "조건문",
        "random 모듈",
        "turtle 그래픽",
        "리스트",
        "리스트 내포"
      ],
      "student_topics": [
        "사람의 언어와 컴퓨터 언어는 왜 번역 과정이 필요할까?",
        "프로그래밍은 어떻게 반복되는 문제를 자동화할까?",
        "좋은 프로그램은 왜 변수와 흐름 설계가 중요할까?"
      ],
      "linked_activity_types": [
        "프로그래밍실습형",
        "자동화형",
        "시각화형"
      ],
      "linked_career_bridge": [
        "소프트웨어 개발",
        "자동화",
        "프로그래밍",
        "컴퓨터 공학"
      ],
      "horizontal_links": [
        {
          "subject": "공통수학1",
          "concept": "반복 계산과 구조화",
          "evaluation_focus": "수학적 규칙이나 반복 계산을 코드로 구현할 수 있는가",
          "inquiry_extension": "경우의 수 계산이나 수열 규칙을 간단한 프로그램으로 구현하기"
        },
        {
          "subject": "통합과학1",
          "concept": "측정 데이터 자동 처리",
          "evaluation_focus": "과학 데이터를 코드로 정리·출력하는 기초 사고를 보이는가",
          "inquiry_extension": "센서 데이터나 실험 결과를 출력하는 간단한 코드 설계하기"
        },
        {
          "subject": "미술",
          "concept": "그래픽과 알고리즘",
          "evaluation_focus": "알고리즘을 시각적 결과물로 표현할 수 있는가",
          "inquiry_extension": "turtle을 이용한 도형·패턴 그리기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "정보 심화/AI 기초",
          "connection_point": "코딩, 자동화, 데이터 처리의 심화"
        },
        {
          "grade": "2학년",
          "subject": "공학 관련 탐구",
          "connection_point": "프로그래밍 기반 문제 해결 프로젝트로 확장"
        }
      ]
    },
    "컴퓨팅 시스템과 네트워크": {
      "unit": "컴퓨팅 시스템",
      "lesson_focus": "컴퓨팅 시스템과 네트워크 기반에서 정보를 공유·유통·소통하는 구조를 이해한다.",
      "core_concepts": [
        "컴퓨팅 시스템",
        "네트워크",
        "공유",
        "유통",
        "소통",
        "협업"
      ],
      "micro_keywords": [
        "컴퓨팅 네트워크 환경",
        "지식 공동체",
        "학습 공동체",
        "공유",
        "의사소통",
        "협업",
        "네트워크 기반 문제 해결"
      ],
      "student_topics": [
        "네트워크는 왜 단순 연결을 넘어 협업의 기반이 될까?",
        "컴퓨팅 시스템은 어떻게 정보를 공유하고 유통할까?",
        "협업적 문제 해결에는 왜 네트워크 환경이 중요할까?"
      ],
      "linked_activity_types": [
        "시스템이해형",
        "협업형",
        "사례분석형"
      ],
      "linked_career_bridge": [
        "네트워크",
        "정보 시스템",
        "협업 도구",
        "디지털 소통"
      ],
      "horizontal_links": [
        {
          "subject": "통합과학1",
          "concept": "시스템과 상호작용",
          "evaluation_focus": "컴퓨팅 시스템도 여러 요소가 상호작용하는 시스템임을 설명할 수 있는가",
          "inquiry_extension": "지구시스템과 컴퓨팅 시스템의 공통 구조 비교하기"
        },
        {
          "subject": "국어",
          "concept": "디지털 의사소통",
          "evaluation_focus": "네트워크 환경에서 적절한 소통과 협업 방식을 설명할 수 있는가",
          "inquiry_extension": "온라인 협업 규칙과 의사소통 원칙 정리하기"
        }
      ],
      "vertical_links": [
        {
          "grade": "2학년",
          "subject": "정보 심화",
          "connection_point": "네트워크와 시스템 구조 이해의 심화"
        },
        {
          "grade": "2학년",
          "subject": "공학 관련 탐구",
          "connection_point": "스마트 시스템과 IoT 탐구로 확장"
        }
      ]
    }
  }
};

  const INFO_FALLBACK_LONGITUDINAL_MAP = {
  "subject_name": "정보",
  "version": "v3.4.7-information-refined-fixed",
  "policy": {
    "priority_rule": [
      "먼저 교과 개념별 종단 연결 후보를 제시한다",
      "학과 입력 전에는 가능한 종단축 전체를 보여준다",
      "학과 입력 후에는 축을 제거하지 않고 우선순위만 재정렬한다",
      "키워드는 다음 단계에서 같은 개념 안의 세부 정렬·설명 보정에 사용한다"
    ],
    "keyword_refinement_rule": "같은 개념 안에서는 추천 키워드가 4번 후속 연계축의 점수, 짧은 라벨, 설명 문구, 활동 예시를 미세 조정한다."
  },
  "concept_longitudinal_map": [
    {
      "concept_name": "지식·정보 사회와 정보 문화",
      "concept_label": "정보 문화",
      "core_focus": "정보 사회, 디지털 시민성, 정보 윤리, 정보 보호, 협업 문화, 기술 변화",
      "longitudinal_axes": [
        {
          "axis_id": "info_ethics",
          "axis_title": "디지털 시민성·정보윤리 축",
          "axis_short": "디지털 윤리",
          "axis_domain": "info_ethics",
          "priority": 1,
          "next_subjects": [
            "통합사회2",
            "공통국어2",
            "정보"
          ],
          "why": "정보 사회에서 책임 있는 참여와 정보 보호 원칙을 중심으로 탐구를 확장하는 축",
          "student_output_hint": "디지털 시민성 사례를 비교하고 정보 윤리 기준을 정리하기",
          "keyword_signals": [
            {
              "keywords": [
                "정보 윤리",
                "디지털 시민성",
                "정보 보호",
                "개인정보",
                "저작권",
                "사이버 폭력"
              ],
              "short": "디지털 윤리",
              "desc": "정보 윤리와 권리 보호를 중심으로 정보 사회의 책임 있는 참여 방식을 해석하는 축",
              "activity_hint": "플랫폼·저작권·개인정보 사례를 비교해 윤리 기준표 만들기",
              "boost": 24
            },
            {
              "keywords": [
                "사회 구성원",
                "협업",
                "공유",
                "의사소통"
              ],
              "short": "협업 문화",
              "desc": "공동체 안에서 정보 공유와 디지털 소통 규칙을 해석하는 축",
              "activity_hint": "온라인 협업 규칙과 바람직한 소통 사례를 정리하기",
              "boost": 14
            }
          ]
        },
        {
          "axis_id": "smart_service",
          "axis_title": "스마트 사회·서비스 분석 축",
          "axis_short": "스마트 사회",
          "axis_domain": "smart_service",
          "priority": 2,
          "next_subjects": [
            "통합과학2",
            "확률과 통계",
            "정보"
          ],
          "why": "AI·IoT·플랫폼 서비스가 사회를 바꾸는 방식을 구조적으로 이해하는 축",
          "student_output_hint": "스마트 기기·플랫폼 서비스가 생활을 바꾸는 사례를 분석하기",
          "keyword_signals": [
            {
              "keywords": [
                "AI",
                "인공지능",
                "IoT",
                "스마트",
                "플랫폼",
                "서비스"
              ],
              "short": "스마트 사회",
              "desc": "지능형 서비스와 연결 기술이 사회 구조를 어떻게 바꾸는지 분석하는 축",
              "activity_hint": "AI·IoT 기반 생활 서비스 사례를 기능별로 비교하기",
              "boost": 22
            },
            {
              "keywords": [
                "기술 변화",
                "미래 직업",
                "자동화"
              ],
              "short": "미래 변화",
              "desc": "기술 변화가 직업과 일상에 미치는 영향을 전망하는 축",
              "activity_hint": "자동화와 미래 직업 변화를 표로 정리하기",
              "boost": 16
            }
          ]
        },
        {
          "axis_id": "policy_issue",
          "axis_title": "정보 정책·사회 쟁점 해석 축",
          "axis_short": "사회 쟁점",
          "axis_domain": "policy_issue",
          "priority": 3,
          "next_subjects": [
            "통합사회2",
            "공통국어2",
            "확률과 통계"
          ],
          "why": "디지털 격차, 알고리즘 편향, 가짜 정보 같은 사회 쟁점을 근거 중심으로 해석하는 축",
          "student_output_hint": "정보 기술 관련 사회 쟁점을 찬반 근거로 구조화하기",
          "keyword_signals": [
            {
              "keywords": [
                "가짜뉴스",
                "허위 정보",
                "알고리즘 편향",
                "디지털 격차",
                "정책",
                "법"
              ],
              "short": "사회 쟁점",
              "desc": "정보 기술이 만드는 사회 문제와 제도적 대응을 해석하는 축",
              "activity_hint": "디지털 격차나 알고리즘 편향 사례를 원인-영향-대응으로 정리하기",
              "boost": 24
            }
          ]
        }
      ]
    },
    {
      "concept_name": "자료와 정보의 표현",
      "concept_label": "정보 표현",
      "core_focus": "아날로그와 디지털, 진법, 문자 코드, 표본화, 양자화, 압축, 전송",
      "longitudinal_axes": [
        {
          "axis_id": "encoding",
          "axis_title": "디지털 표현·부호화 축",
          "axis_short": "부호화",
          "axis_domain": "encoding",
          "priority": 1,
          "next_subjects": [
            "공통수학1",
            "정보",
            "통합과학1"
          ],
          "why": "정보를 약속된 규칙으로 표현하고 부호화하는 과정을 중심으로 확장하는 축",
          "student_output_hint": "아날로그 자료를 디지털 규칙으로 바꾸는 과정을 단계별로 설명하기",
          "keyword_signals": [
            {
              "keywords": [
                "아날로그",
                "디지털",
                "자료 표현",
                "표현의 약속"
              ],
              "short": "표현 변환",
              "desc": "아날로그 정보를 디지털 규칙으로 바꾸는 표현 체계를 이해하는 축",
              "activity_hint": "같은 정보를 그림·문자·이진 표현으로 바꾸어 비교하기",
              "boost": 20
            },
            {
              "keywords": [
                "모스부호",
                "문자 코드",
                "ASCII",
                "유니코드",
                "부호화"
              ],
              "short": "부호화",
              "desc": "문자와 신호를 코드 체계로 표현하는 원리를 해석하는 축",
              "activity_hint": "문자 코드와 부호화 규칙을 예시 데이터로 설명하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "signal_media",
          "axis_title": "신호·미디어 처리 기초 축",
          "axis_short": "신호 처리",
          "axis_domain": "signal_media",
          "priority": 2,
          "next_subjects": [
            "통합과학1",
            "물리",
            "정보"
          ],
          "why": "소리·빛·이미지 같은 신호를 디지털 정보로 바꾸고 다루는 기초 축",
          "student_output_hint": "소리·이미지 데이터가 디지털 정보로 바뀌는 흐름을 정리하기",
          "keyword_signals": [
            {
              "keywords": [
                "표본화",
                "양자화",
                "샘플링"
              ],
              "short": "신호 처리",
              "desc": "연속적인 신호를 디지털 데이터로 바꾸는 처리 과정을 이해하는 축",
              "activity_hint": "소리나 이미지가 디지털 파일이 되는 과정을 도식화하기",
              "boost": 24
            },
            {
              "keywords": [
                "이미지",
                "소리",
                "영상",
                "미디어"
              ],
              "short": "미디어 처리",
              "desc": "미디어 정보를 디지털 신호로 다루는 기초 축",
              "activity_hint": "이미지·소리·영상 파일의 표현 차이를 비교하기",
              "boost": 14
            }
          ]
        },
        {
          "axis_id": "compression_transfer",
          "axis_title": "압축·전송 설계 축",
          "axis_short": "압축·전송",
          "axis_domain": "compression_transfer",
          "priority": 3,
          "next_subjects": [
            "정보",
            "전자기와 양자",
            "공통수학2"
          ],
          "why": "효율적인 저장과 전달을 위해 정보 크기와 전송 방식을 설계하는 축",
          "student_output_hint": "같은 자료를 압축 전후로 비교하며 전달 효율을 설명하기",
          "keyword_signals": [
            {
              "keywords": [
                "압축",
                "전송",
                "저장",
                "용량"
              ],
              "short": "압축·전송",
              "desc": "정보량과 저장·전송 효율을 함께 고려하는 축",
              "activity_hint": "파일 압축 전후의 장단점을 비교하고 전달 효율을 설명하기",
              "boost": 22
            }
          ]
        }
      ]
    },
    {
      "concept_name": "자료와 정보의 분석",
      "concept_label": "데이터 분석",
      "core_focus": "자료 수집, 구조화, 정렬, 탐색, 비교, 데이터베이스, 시각화, 의사결정",
      "longitudinal_axes": [
        {
          "axis_id": "data_visual",
          "axis_title": "데이터 수집·시각화 축",
          "axis_short": "시각화",
          "axis_domain": "data_visual",
          "priority": 1,
          "next_subjects": [
            "확률과 통계",
            "통합과학2",
            "정보"
          ],
          "why": "자료를 수집하고 정리해 시각적으로 해석 가능한 정보로 바꾸는 축",
          "student_output_hint": "생활 자료를 표와 그래프로 바꾸어 의미를 설명하기",
          "keyword_signals": [
            {
              "keywords": [
                "자료 수집",
                "자료 분석",
                "비교 기준",
                "표",
                "그래프",
                "시각화"
              ],
              "short": "시각화",
              "desc": "자료를 구조화하고 시각적으로 표현해 해석하는 축",
              "activity_hint": "생활 데이터를 표·그래프·인포그래픽으로 바꾸어 비교하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "database",
          "axis_title": "데이터베이스·정보구조 축",
          "axis_short": "정보구조",
          "axis_domain": "database",
          "priority": 2,
          "next_subjects": [
            "정보",
            "공통수학1",
            "통합사회2"
          ],
          "why": "자료를 체계적으로 저장·검색·관리하는 구조를 이해하는 축",
          "student_output_hint": "자료를 항목별로 분류해 데이터베이스 구조로 설계하기",
          "keyword_signals": [
            {
              "keywords": [
                "데이터베이스",
                "구조화",
                "정렬",
                "탐색",
                "검색"
              ],
              "short": "정보구조",
              "desc": "자료를 항목화하고 효율적으로 저장·검색하는 구조를 이해하는 축",
              "activity_hint": "관심 주제를 항목별 데이터베이스 표로 설계하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "data_decision",
          "axis_title": "데이터 해석·의사결정 축",
          "axis_short": "의사결정",
          "axis_domain": "data_decision",
          "priority": 3,
          "next_subjects": [
            "확률과 통계",
            "통합사회2",
            "정보"
          ],
          "why": "분석한 자료를 근거로 판단과 선택을 내리는 사고로 확장하는 축",
          "student_output_hint": "분석 결과를 근거로 합리적 선택 기준을 제시하기",
          "keyword_signals": [
            {
              "keywords": [
                "빅데이터",
                "의미 있는 정보",
                "예측",
                "판단",
                "의사결정"
              ],
              "short": "의사결정",
              "desc": "데이터를 해석해 예측과 판단으로 연결하는 축",
              "activity_hint": "데이터 기반으로 선택 기준을 세우고 결론을 제시하기",
              "boost": 22
            }
          ]
        }
      ]
    },
    {
      "concept_name": "추상화와 문제 분해",
      "concept_label": "문제 분해",
      "core_focus": "현재 상태, 목표 상태, 조건 분석, 핵심 요소 추출, 문제 분해, 모델링",
      "longitudinal_axes": [
        {
          "axis_id": "problem_design",
          "axis_title": "문제 구조화·알고리즘 설계 축",
          "axis_short": "구조화",
          "axis_domain": "problem_design",
          "priority": 1,
          "next_subjects": [
            "공통수학1",
            "정보",
            "통합과학1"
          ],
          "why": "복잡한 문제를 단계와 조건으로 나누어 해결 절차를 설계하는 축",
          "student_output_hint": "생활 문제를 단계별 흐름도로 나누어 해결 절차를 설계하기",
          "keyword_signals": [
            {
              "keywords": [
                "현재 상태",
                "목표 상태",
                "조건 분석",
                "작은 문제로 나누기",
                "문제 분해"
              ],
              "short": "문제 구조화",
              "desc": "문제를 조건과 단계로 나누어 해결 흐름을 설계하는 축",
              "activity_hint": "일상 문제를 입력-처리-출력 흐름으로 나누어 설계하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "math_modeling",
          "axis_title": "수리 모델링 확장 축",
          "axis_short": "모델링",
          "axis_domain": "math_modeling",
          "priority": 2,
          "next_subjects": [
            "공통수학1",
            "공통수학2",
            "통합과학2"
          ],
          "why": "핵심 요소만 남겨 수학적·논리적 모델로 단순화하는 축",
          "student_output_hint": "현상을 변수와 조건으로 줄여 간단한 모델로 표현하기",
          "keyword_signals": [
            {
              "keywords": [
                "모델",
                "모델링",
                "핵심 요소",
                "불필요한 요소 제거"
              ],
              "short": "모델링",
              "desc": "복잡한 현상을 핵심 변수만 남겨 모델로 표현하는 축",
              "activity_hint": "교실·생활 상황을 변수 중심 모델로 단순화하기",
              "boost": 22
            }
          ]
        },
        {
          "axis_id": "process_optimization",
          "axis_title": "시스템 설계·절차 최적화 축",
          "axis_short": "절차 설계",
          "axis_domain": "process_optimization",
          "priority": 3,
          "next_subjects": [
            "정보",
            "통합과학2",
            "확률과 통계"
          ],
          "why": "여러 단계의 절차를 비교하고 더 효율적인 구조로 고치는 축",
          "student_output_hint": "동일한 문제를 다른 절차로 풀고 더 효율적인 구조를 비교하기",
          "keyword_signals": [
            {
              "keywords": [
                "절차",
                "흐름도",
                "효율",
                "개선"
              ],
              "short": "절차 설계",
              "desc": "문제 해결 과정을 비교하고 더 효율적인 절차를 선택하는 축",
              "activity_hint": "비상 대피도나 주문 과정을 흐름도로 만들고 개선점 찾기",
              "boost": 18
            }
          ]
        }
      ]
    },
    {
      "concept_name": "알고리즘 설계와 분석",
      "concept_label": "알고리즘",
      "core_focus": "순차·선택·반복, 정렬, 탐색, 효율성, 성능 비교, 예측",
      "longitudinal_axes": [
        {
          "axis_id": "algo_opt",
          "axis_title": "알고리즘 최적화 축",
          "axis_short": "최적화",
          "axis_domain": "algo_opt",
          "priority": 1,
          "next_subjects": [
            "공통수학1",
            "정보",
            "확률과 통계"
          ],
          "why": "알고리즘의 효율성과 수행 과정을 비교해 더 나은 방법을 찾는 축",
          "student_output_hint": "같은 문제를 여러 알고리즘으로 풀고 효율을 비교하기",
          "keyword_signals": [
            {
              "keywords": [
                "효율성",
                "성능 비교",
                "수행 시간",
                "최적화"
              ],
              "short": "최적화",
              "desc": "알고리즘의 효율을 비교해 더 적절한 방식을 고르는 축",
              "activity_hint": "정렬 방법별 수행 과정을 비교해 장단점을 표로 정리하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "search_sort",
          "axis_title": "탐색·정렬 구현 축",
          "axis_short": "탐색·정렬",
          "axis_domain": "search_sort",
          "priority": 2,
          "next_subjects": [
            "정보",
            "공통수학1",
            "공통수학2"
          ],
          "why": "자료를 탐색하고 정렬하는 절차를 구현 중심으로 확장하는 축",
          "student_output_hint": "정렬·탐색 절차를 순서도나 코드로 구현하기",
          "keyword_signals": [
            {
              "keywords": [
                "버블 정렬",
                "선택 정렬",
                "순차 탐색",
                "이진 탐색",
                "정렬",
                "탐색"
              ],
              "short": "탐색·정렬",
              "desc": "정렬과 탐색 절차를 구현하고 비교하는 축",
              "activity_hint": "버블 정렬과 이진 탐색을 단계별 그림 또는 코드로 표현하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "data_prediction",
          "axis_title": "데이터 처리·예측 축",
          "axis_short": "예측 처리",
          "axis_domain": "data_prediction",
          "priority": 3,
          "next_subjects": [
            "확률과 통계",
            "통합과학2",
            "정보"
          ],
          "why": "규칙과 반복 구조를 데이터 처리와 간단한 예측 문제로 확장하는 축",
          "student_output_hint": "반복 구조를 활용해 규칙을 찾고 예측값을 제안하기",
          "keyword_signals": [
            {
              "keywords": [
                "순차",
                "선택",
                "반복",
                "규칙",
                "예측"
              ],
              "short": "예측 처리",
              "desc": "반복과 조건 구조를 데이터 처리 및 예측 문제에 적용하는 축",
              "activity_hint": "반복 패턴이 있는 자료에서 다음 값을 예측하는 절차를 설계하기",
              "boost": 18
            }
          ]
        }
      ]
    },
    {
      "concept_name": "프로그래밍과 자동화",
      "concept_label": "프로그래밍",
      "core_focus": "프로그래밍 언어, 변수, 입출력, 조건문, 반복문, 리스트, 함수, 자동화",
      "longitudinal_axes": [
        {
          "axis_id": "programming_impl",
          "axis_title": "프로그래밍 구현 축",
          "axis_short": "코드 구현",
          "axis_domain": "programming_impl",
          "priority": 1,
          "next_subjects": [
            "정보",
            "공통수학1",
            "통합과학1"
          ],
          "why": "문제 해결 절차를 실제 코드로 구현하고 실행 결과를 확인하는 축",
          "student_output_hint": "입력-처리-출력 구조를 코드로 작성하고 결과를 확인하기",
          "keyword_signals": [
            {
              "keywords": [
                "Python",
                "변수 설계",
                "입력과 출력",
                "함수",
                "원시 코드"
              ],
              "short": "코드 구현",
              "desc": "입력과 처리 과정을 코드로 구현하는 기본 축",
              "activity_hint": "간단한 계산이나 분류 문제를 Python 코드로 구현하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "logic_control",
          "axis_title": "논리·제어 확장 축",
          "axis_short": "조건·반복",
          "axis_domain": "logic_control",
          "priority": 2,
          "next_subjects": [
            "공통수학1",
            "통합과학1",
            "정보"
          ],
          "why": "조건과 반복 구조를 활용해 논리적 제어와 분기 설계를 확장하는 축",
          "student_output_hint": "조건문과 반복문으로 제어 흐름을 설계하기",
          "keyword_signals": [
            {
              "keywords": [
                "조건문",
                "반복문",
                "리스트",
                "리스트 내포"
              ],
              "short": "조건·반복",
              "desc": "분기와 반복 구조를 통해 문제 해결 절차를 제어하는 축",
              "activity_hint": "조건문·반복문을 이용해 점수 처리나 목록 정리 프로그램 만들기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "automation_sim",
          "axis_title": "자동화·시뮬레이션 축",
          "axis_short": "자동화",
          "axis_domain": "automation_sim",
          "priority": 3,
          "next_subjects": [
            "통합과학1",
            "물리",
            "정보"
          ],
          "why": "코드를 이용해 자동화, 간단한 시뮬레이션, 시각적 결과물을 만드는 축",
          "student_output_hint": "반복되는 작업을 자동화하거나 시각적 결과를 출력하기",
          "keyword_signals": [
            {
              "keywords": [
                "random 모듈",
                "turtle 그래픽",
                "자동화",
                "시뮬레이션"
              ],
              "short": "자동화",
              "desc": "프로그래밍을 활용해 자동 실행과 간단한 시뮬레이션으로 확장하는 축",
              "activity_hint": "무작위 실험이나 도형 그리기 자동화 프로그램 만들기",
              "boost": 22
            }
          ]
        }
      ]
    },
    {
      "concept_name": "컴퓨팅 시스템과 네트워크",
      "concept_label": "시스템·네트워크",
      "core_focus": "컴퓨팅 시스템, 네트워크, 공유, 협업, 통신 구조, 센서, 피지컬 컴퓨팅",
      "longitudinal_axes": [
        {
          "axis_id": "network_system",
          "axis_title": "시스템·네트워크 구조 축",
          "axis_short": "네트워크 구조",
          "axis_domain": "network_system",
          "priority": 1,
          "next_subjects": [
            "전자기와 양자",
            "통합과학1",
            "정보"
          ],
          "why": "컴퓨팅 시스템과 네트워크가 연결·공유·유통을 가능하게 하는 구조를 이해하는 축",
          "student_output_hint": "컴퓨팅 시스템과 네트워크 구성 요소의 역할을 도식화하기",
          "keyword_signals": [
            {
              "keywords": [
                "네트워크",
                "공유",
                "의사소통",
                "협업",
                "통신"
              ],
              "short": "네트워크 구조",
              "desc": "네트워크 기반으로 정보가 연결·유통되는 구조를 해석하는 축",
              "activity_hint": "네트워크에서 정보가 이동하는 경로를 그림으로 설명하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "embedded_control",
          "axis_title": "센서·임베디드 제어 축",
          "axis_short": "센서 제어",
          "axis_domain": "embedded_control",
          "priority": 2,
          "next_subjects": [
            "통합과학1",
            "물리",
            "전자기와 양자"
          ],
          "why": "센서와 피지컬 컴퓨팅을 활용해 실제 장치 제어로 확장하는 축",
          "student_output_hint": "센서 입력을 받아 동작하는 장치 구조를 설계하기",
          "keyword_signals": [
            {
              "keywords": [
                "센서",
                "피지컬 컴퓨팅",
                "회로",
                "임베디드",
                "장치"
              ],
              "short": "센서 제어",
              "desc": "센서 데이터를 받아 장치를 제어하는 구조로 확장하는 축",
              "activity_hint": "빛·온도 센서를 활용한 장치 제어 아이디어를 설계하기",
              "boost": 24
            }
          ]
        },
        {
          "axis_id": "platform_security",
          "axis_title": "협업 플랫폼·보안 운영 축",
          "axis_short": "플랫폼 보안",
          "axis_domain": "platform_security",
          "priority": 3,
          "next_subjects": [
            "통합사회2",
            "공통국어2",
            "정보"
          ],
          "why": "협업 플랫폼 운영과 보안, 계정 관리, 안전한 소통 환경 설계로 이어지는 축",
          "student_output_hint": "플랫폼 협업 환경에서 필요한 보안 원칙을 정리하기",
          "keyword_signals": [
            {
              "keywords": [
                "보안",
                "계정",
                "접근 권한",
                "플랫폼",
                "협업 도구"
              ],
              "short": "플랫폼 보안",
              "desc": "협업 환경을 안전하게 운영하기 위한 보안 원칙을 해석하는 축",
              "activity_hint": "학교 협업 플랫폼에 필요한 보안 규칙과 관리 원칙을 정리하기",
              "boost": 20
            }
          ]
        }
      ]
    }
  ]
};

  function ensureInfoRuntimeSeed() {
    if (!uiSeed || typeof uiSeed !== "object" || Array.isArray(uiSeed)) uiSeed = {};
    if (!engineMap || typeof engineMap !== "object" || Array.isArray(engineMap)) engineMap = {};
    if (!conceptLongitudinalMaps || typeof conceptLongitudinalMaps !== "object" || Array.isArray(conceptLongitudinalMaps)) conceptLongitudinalMaps = {};

    const infoAliases = ["정보", "정보과목", "정보 교과", "Information", "information", "INFO", "info"];
    infoAliases.forEach((name) => {
      if (!uiSeed[name]) uiSeed[name] = INFO_FALLBACK_UI_SEED;
      if (!engineMap[name]) engineMap[name] = INFO_FALLBACK_ENGINE_MAP;
      if (!conceptLongitudinalMaps[name]) conceptLongitudinalMaps[name] = INFO_FALLBACK_LONGITUDINAL_MAP;
    });
  }

  function normalize(v) {
    return String(v || "")
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "")
      .toLowerCase();
  }

  function fuzzyIncludes(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
  }

  function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }


  function getCanonicalSubjectName(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (SUBJECT_NAME_ALIASES[raw]) return SUBJECT_NAME_ALIASES[raw];

    const cleaned = normalize(raw);
    for (const [alias, canonical] of Object.entries(SUBJECT_NAME_ALIASES)) {
      if (normalize(alias) === cleaned) return canonical;
    }
    return raw;
  }

  function applySubjectAliasesToMap(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return source;
    const cloned = { ...source };

    Object.entries(SUBJECT_NAME_ALIASES).forEach(([alias, canonical]) => {
      if (canonical in cloned && !(alias in cloned)) cloned[alias] = cloned[canonical];
      if (alias in cloned && !(canonical in cloned)) cloned[canonical] = cloned[alias];
    });

    return cloned;
  }

  async function loadSubjectConceptLongitudinalMaps() {
    const result = {};
    const entries = Object.entries(SUBJECT_CONCEPT_LONGITUDINAL_URLS || {});
    await Promise.all(entries.map(async ([subjectName, url]) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        result[subjectName] = await res.json();
      } catch (error) {
        console.warn("subject concept longitudinal map load skipped:", subjectName, error);
      }
    }));
    return result;
  }

  function isInfoSubjectName(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    const canonical = getCanonicalSubjectName(raw);
    return normalize(raw) === normalize('정보') || normalize(canonical) === normalize('정보') || /^(info|information)$/i.test(raw);
  }

  function ensureInfoFallbackSeeds() {
    try {
      if (!uiSeed || typeof uiSeed !== 'object' || Array.isArray(uiSeed)) uiSeed = {};
      if (!engineMap || typeof engineMap !== 'object' || Array.isArray(engineMap)) engineMap = {};
      if (!uiSeed['정보']) uiSeed['정보'] = INFO_FALLBACK_UI_SEED;
      if (!engineMap['정보'] || !engineMap['정보'].concepts || !Object.keys(engineMap['정보'].concepts || {}).length) {
        engineMap['정보'] = INFO_FALLBACK_ENGINE_MAP;
      }
      if (!conceptLongitudinalMaps || typeof conceptLongitudinalMaps !== 'object' || Array.isArray(conceptLongitudinalMaps)) conceptLongitudinalMaps = {};
      if (!conceptLongitudinalMaps['정보'] || !Array.isArray(conceptLongitudinalMaps['정보']?.concepts)) {
        conceptLongitudinalMaps['정보'] = INFO_FALLBACK_LONGITUDINAL_MAP;
      }
    } catch (error) {
      console.warn('info fallback seed merge failed:', error);
    }
  }

  async function init() {
    try {
      const [uiRes, engineRes, matrixRes, followupSubjectRes, followupMajorRes, loadedConceptMaps] = await Promise.all([
        fetch(UI_SEED_URL, { cache: "no-store" }),
        fetch(ENGINE_MAP_URL, { cache: "no-store" }),
        fetch(TOPIC_MATRIX_URL, { cache: "no-store" }).catch(() => null),
        fetch(FOLLOWUP_SUBJECT_URL, { cache: "no-store" }).catch(() => null),
        fetch(FOLLOWUP_MAJOR_URL, { cache: "no-store" }).catch(() => null),
        loadSubjectConceptLongitudinalMaps()
      ]);

      if (!uiRes.ok || !engineRes.ok) {
        console.warn("textbook concept seed load fallback mode", uiRes.status, engineRes.status);
      }

      uiSeed = applySubjectAliasesToMap(uiRes.ok ? await uiRes.json() : {});
      engineMap = applySubjectAliasesToMap(engineRes.ok ? await engineRes.json() : {});
      topicMatrix = matrixRes && matrixRes.ok ? await matrixRes.json() : null;
      subjectBridgePoint = followupSubjectRes && followupSubjectRes.ok ? await followupSubjectRes.json() : [];
      majorFollowupAxis = followupMajorRes && followupMajorRes.ok ? await followupMajorRes.json() : [];
      conceptLongitudinalMaps = applySubjectAliasesToMap(loadedConceptMaps || {});
      ensureInfoRuntimeSeed();

      injectStyles();
      injectUI();
      bindEvents();
      syncSubjectFromSelect();
      syncCareerFromInput();
      renderCareerKeywordPreview();
      renderAll();
      startMajorBridgePolling();
      renderUploadSummary();
    } catch (error) {
      console.warn("textbook concept helper init error:", error);
    }
  }

  function injectStyles() {
    if ($("engineFlowStyles")) return;
    const style = document.createElement("style");
    style.id = "engineFlowStyles";
    style.textContent = `
      .engine-flow-wrap { margin-top: 18px; }
      .engine-flow-card {
        border: 1px solid #d9e1f2;
        border-radius: 22px;
        background: #fff;
        padding: 22px;
        box-shadow: 0 12px 30px rgba(16, 24, 40, .04);
      }
      .engine-flow-kicker {
        display: inline-flex;
        padding: 6px 12px;
        border-radius: 999px;
        background: #edf5ff;
        color: #1f6fe5;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .engine-flow-title {
        margin: 0;
        font-size: 29px;
        line-height: 1.35;
        font-weight: 800;
        color: #172033;
      }
      .engine-flow-desc {
        margin: 10px 0 0;
        color: #51607a;
        line-height: 1.65;
        font-size: 15px;
      }
      .engine-status-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 12px;
        margin-top: 22px;
      }
      .engine-status-box {
        border: 1px solid #d8e0ee;
        border-radius: 16px;
        padding: 14px 16px;
        background: #fbfcff;
      }
      .engine-status-label {
        font-size: 12px;
        color: #6d7c93;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .engine-status-value {
        font-size: 18px;
        color: #172033;
        font-weight: 800;
        word-break: keep-all;
      }
      .engine-step-block {
        margin-top: 16px;
        border: 1px solid #d8e0ee;
        border-radius: 20px;
        padding: 18px;
        background: #fff;
      }
      .engine-step-block.locked {
        opacity: .55;
        background: #fbfcfe;
      }
      .engine-step-head {
        display:flex;
        justify-content: space-between;
        align-items:flex-start;
        gap: 12px;
        margin-bottom: 14px;
      }
      .engine-step-title {
        margin:0;
        font-size: 22px;
        color:#172033;
        font-weight:800;
      }
      .engine-step-guide {
        color:#6d7c93;
        font-size:13px;
        font-weight:700;
        white-space:nowrap;
      }
      .engine-step-copy {
        color:#5b6880;
        font-size:14px;
        line-height:1.6;
      }
      .engine-concept-grid {
        display:grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .engine-concept-card {
        border: 1px solid #d5deef;
        background:#fff;
        border-radius: 16px;
        padding: 16px;
        text-align:left;
        cursor:pointer;
        transition: all .18s ease;
      }
      .engine-concept-card:hover { border-color:#b6c7ef; transform: translateY(-1px); }
      .engine-concept-card.is-active { border-color:#2764ff; box-shadow: 0 0 0 2px rgba(39, 100, 255, .08); background:#f7faff; }
      .engine-concept-card.is-secondary { background:#ffffff; }
      .engine-concept-toggle-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-top:12px;
        padding-top:10px;
        border-top:1px dashed #d9e2f2;
      }
      .engine-concept-toggle-help { color:#6b7890; font-size:13px; line-height:1.5; }
      .engine-concept-toggle-btn {
        border:1px solid #cfdaf0;
        background:#f8fbff;
        color:#2b5de8;
        border-radius:999px;
        padding:8px 13px;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
        white-space:nowrap;
      }
      .engine-concept-toggle-btn:hover { border-color:#91a9e8; background:#eef4ff; }
      .engine-concept-name { font-size:17px; font-weight:800; color:#172033; }
      .engine-concept-tags, .engine-chip-wrap, .engine-tag-wrap { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .engine-mini-tag, .engine-chip, .engine-tag {
        display:inline-flex; align-items:center; gap:4px; padding:7px 11px; border-radius:999px;
        background:#f1f5fd; color:#304666; font-size:13px; font-weight:700; border:1px solid transparent;
      }
      button.engine-chip { cursor:pointer; }
      button.engine-chip:hover { border-color:#b8c8ee; }
      button.engine-chip.is-active { background:#2f66ff; color:#fff; }
      .engine-mini-tag.subtle, .engine-tag.subtle { background:#f7f9fd; color:#61708c; }
      .engine-subgrid {
        display:grid;
        grid-template-columns: 1.15fr .85fr;
        gap: 16px;
        margin-top: 14px;
      }
      .engine-panel {
        border:1px solid #e0e6f3;
        border-radius:16px;
        padding:16px;
        background:#fbfcff;
      }
      .engine-track-grid {
        display:grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap:12px;
        margin-top: 12px;
      }
      .engine-track-card {
        border:1px solid #d5deef;
        border-radius:16px;
        background:#fff;
        padding:16px;
        text-align:left;
        cursor:pointer;
        transition: all .18s ease;
      }
      .engine-track-card:hover { border-color:#b6c7ef; transform:translateY(-1px); }
      .engine-track-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-track-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
      .engine-track-title { font-size:18px; font-weight:800; color:#172033; }
      .engine-track-short { display:inline-flex; padding:6px 10px; border-radius:999px; background:#eef4ff; color:#265ae8; font-size:12px; font-weight:700; }
      .engine-track-next { margin-top:10px; color:#51607a; font-size:13px; font-weight:700; }
      .engine-track-desc { margin-top:8px; color:#5f6d86; font-size:13px; line-height:1.6; }
      .engine-auto-row { margin-top:12px; display:flex; justify-content:flex-end; }
      .engine-auto-btn {
        border:1px dashed #b8c8ee; background:#f8fbff; color:#275fe8; border-radius:999px;
        padding:10px 14px; font-size:13px; font-weight:800; cursor:pointer;
      }
      .engine-subtitle { font-size:16px; font-weight:800; color:#172033; margin-bottom:6px; }
      .engine-help { color:#6b7890; font-size:13px; line-height:1.55; }
      .engine-empty {
        padding: 18px;
        border-radius: 16px;
        background:#f7f9fd;
        color:#6a7891;
        font-size:14px;
        line-height:1.6;
        border:1px dashed #d8e0ee;
      }
      .engine-book-layout { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
      .engine-book-list, .engine-book-summary { min-height: 100%; }
      .engine-book-card {
        width:100%; display:flex; gap:14px; text-align:left; padding:14px; border-radius:16px; border:1px solid #d5deef; background:#fff; margin-top:10px; cursor:pointer;
      }
      .engine-book-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-book-order {
        width:28px; height:28px; flex:0 0 28px; border-radius:999px; background:#edf3ff; color:#2f66ff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:2px;
      }
      .engine-book-title { font-size:18px; font-weight:800; color:#172033; }
      .engine-book-meta { margin-top:4px; color:#66748c; font-size:13px; }
      .engine-book-reason { margin-top:8px; color:#1d2d49; font-size:14px; font-weight:700; }
      .engine-summary-box { background:#fff; border:1px solid #d5deef; border-radius:16px; padding:16px; min-height:100%; }
      .engine-summary-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .engine-summary-title { font-size:22px; font-weight:800; color:#172033; }
      .engine-summary-meta { margin-top:4px; color:#66748c; font-size:14px; }
      .engine-summary-badge {
        padding:6px 10px; border-radius:999px; background:#edf5ff; color:#2563eb; font-size:12px; font-weight:800; white-space:nowrap;
      }
      .engine-summary-text { color:#33435f; font-size:15px; line-height:1.7; margin:14px 0 0; }
      .engine-summary-foot { margin-top:14px; color:#61708c; font-size:13px; line-height:1.55; }
      .engine-mode-grid {
        display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:12px; margin-top:12px;
      }
      .engine-mode-card {
        border:1px solid #d5deef; background:#fff; border-radius:16px; padding:14px; text-align:left; cursor:pointer;
      }
      .engine-mode-card.is-active { border-color:#2764ff; box-shadow:0 0 0 2px rgba(39,100,255,.08); background:#f7faff; }
      .engine-mode-title { font-size:16px; font-weight:800; color:#172033; }
      .engine-mode-desc { color:#66748c; font-size:13px; line-height:1.55; margin-top:6px; }
      .engine-selection-box { margin-top:18px; border:1px solid #d8e0ee; border-radius:20px; padding:18px; background:#f8fbff; }
      .engine-flow-kicker, .engine-flow-title, .engine-flow-desc, .engine-selection-box { display:none; }
      .engine-selection-title { margin:0 0 10px; font-size:20px; font-weight:800; color:#172033; }
      .engine-selection-payload { margin-top:12px; padding:14px 16px; border-radius:16px; background:#fff; border:1px dashed #d6deef; color:#33435f; font-size:14px; line-height:1.7; }
      .engine-selection-payload strong { color:#172033; }
      .engine-view-guide {
        margin-top: 14px;
        padding: 14px 16px;
        border: 1px solid #d8e0ee;
        border-radius: 16px;
        background: #fbfcff;
      }
      .engine-view-guide-title {
        font-size: 15px;
        font-weight: 800;
        color: #172033;
        margin-bottom: 6px;
      }
      .engine-view-guide-desc {
        color: #47556e;
        font-size: 14px;
        line-height: 1.65;
      }
      .engine-view-guide-example {
        margin-top: 8px;
        color: #67758d;
        font-size: 13px;
        line-height: 1.6;
      }

      .engine-upload-panel {
        margin-top: 16px;
        border: 1px solid #d8e0ee;
        border-radius: 20px;
        padding: 18px;
        background: #fff;
      }
      .engine-upload-grid {
        display:grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap:14px;
        margin-top:12px;
      }
      .engine-upload-grid label {
        display:flex;
        flex-direction:column;
        gap:8px;
      }
      .engine-upload-grid label span {
        font-size:14px;
        font-weight:800;
        color:#172033;
      }
      .engine-file-input {
        border:1px dashed #b8c8ee;
        border-radius:14px;
        padding:12px;
        background:#fbfcff;
      }
      .engine-upload-help {
        color:#67758d;
        font-size:13px;
        line-height:1.6;
      }
      .engine-file-list {
        margin-top:10px;
        padding:12px 14px;
        border:1px dashed #d8e0ee;
        border-radius:14px;
        background:#fbfcff;
        color:#44526c;
        font-size:13px;
        line-height:1.7;
      }
      .engine-pill-checks { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
      .engine-pill-check {
        display:inline-flex; align-items:center; gap:6px; padding:8px 10px; border-radius:999px; background:#f3f6fc; font-size:13px; color:#304666; font-weight:700;
      }
      .engine-pill-check input { accent-color:#2563eb; }
      .engine-student-note {
        margin-top:10px;
        color:#5e6d87;
        font-size:13px;
        line-height:1.65;
      }

      @media (max-width: 1100px) {
        .engine-status-row, .engine-book-layout, .engine-subgrid, .engine-mode-grid, .engine-concept-grid, .engine-track-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    if ($("engineFlowSection")) return;

    const formGrid = document.querySelector(".form-grid");
    const actions = document.querySelector(".actions");
    if (!formGrid || !actions) return;

    const section = document.createElement("section");
    section.id = "engineFlowSection";
    section.className = "engine-flow-wrap";
    section.innerHTML = `
      <div class="engine-flow-card">
        <div class="engine-flow-kicker">학생이 직접 선택해서 MINI 보고서를 만드는 흐름</div>
        <h2 class="engine-flow-title">과목 → 학과 검색 → 후속 연계축 → 추천 개념·키워드 → 도서 → 보고서 방식 → 관점</h2>
        <p class="engine-flow-desc">학생이 학과명만 알아도 선택할 수 있도록, 학과 검색 다음에 먼저 <strong>후속 연계축</strong>을 고르고 그 축에 맞는 추천 개념과 키워드를 보여주는 구조입니다. 고1은 고2 과목, 고2는 고3 심화 과목과의 연결까지 생각하며 선택할 수 있습니다.</p>

        <div class="engine-status-row">
          <div class="engine-status-box">
            <div class="engine-status-label">1. 과목</div>
            <div id="engineSubjectSummary" class="engine-status-value">선택 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">2. 학과</div>
            <div id="engineCareerSummary" class="engine-status-value">입력 전</div>
          </div>
          <div class="engine-status-box">
            <div class="engine-status-label">현재 진행 상태</div>
            <div id="engineProgressSummary" class="engine-status-value">연계 축 선택 대기</div>
          </div>
        </div>

        <div id="engineTrackBlock" class="engine-step-block" data-step="3">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">3. 후속 연계축 선택</h3>
              <div class="engine-step-copy">학과에서 중요하게 보는 축과 현재 선택 과목이 만나는 지점을 먼저 고릅니다. 이 단계는 보고서 형식을 확정하는 것이 아니라, 다음 학년까지 이어질 확장 방향을 정하는 단계입니다.</div>
            </div>
            <div class="engine-step-guide">수학 / 정보 / 데이터 / 과학</div>
          </div>
          <div id="engineTrackArea"></div>
        </div>

        <div id="engineConceptBlock" class="engine-step-block" data-step="4">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">4. 연계 축에 맞는 추천 개념·키워드 선택</h3>
              <div class="engine-step-copy">선택한 연계 축에 맞는 추천 개념을 먼저 보고, 그 안에서 보고서 핵심 키워드를 고릅니다.</div>
            </div>
            <div class="engine-step-guide">추천 개념 → 추천 키워드</div>
          </div>
          <div class="engine-subgrid">
            <div class="engine-panel">
              <div class="engine-subtitle">추천 개념 고르기</div>
              <div id="engineConceptCards"></div>
            </div>
            <div class="engine-panel">
              <div class="engine-subtitle">추천 키워드 고르기</div>
              <div id="engineKeywordButtons"></div>
            </div>
          </div>
        </div>

        <div id="engineBookBlock" class="engine-step-block" data-step="5">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">5. 직접 일치 / 확장 참고 도서 선택</h3>
              <div class="engine-step-copy">선택한 키워드와 직접 맞는 도서를 먼저 보고, 부족하면 보고서 확장에 참고할 도서를 봅니다. 도서는 보고서의 근거와 확장 프레임 역할을 합니다.</div>
            </div>
            <div class="engine-step-guide">도서 선택</div>
          </div>
          <div id="engineBookArea"></div>
        </div>

        <div id="engineModeBlock" class="engine-step-block" data-step="6">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">6. 보고서 전개 방식 선택</h3>
              <div class="engine-step-copy">같은 개념과 도서라도 어떻게 풀어 쓸지에 따라 보고서 방향이 달라집니다.</div>
            </div>
            <div class="engine-step-guide">원리 / 비교 / 데이터</div>
          </div>
          <div id="engineModeButtons"></div>
        </div>

        <div id="engineViewBlock" class="engine-step-block" data-step="7">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">7. 보고서 관점 선택</h3>
              <div class="engine-step-copy">보고서를 어떤 시선으로 정리할지 마지막 관점을 고릅니다.</div>
            </div>
            <div class="engine-step-guide">관점 선택</div>
          </div>
          <div id="engineViewButtons"></div>
        </div>

        <div id="engineLineBlock" class="engine-step-block" data-step="8">
          <div class="engine-step-head">
            <div>
              <h3 class="engine-step-title">8. 보고서 라인 선택</h3>
              <div class="engine-step-copy">보고서를 어떤 순서와 비중으로 쓸지 뼈대를 고릅니다. 같은 주제라도 라인에 따라 결과물이 달라집니다.</div>
            </div>
            <div class="engine-step-guide">기본형 / 확장형 / 심화형</div>
          </div>
          <div id="engineLineArea"></div>
        </div>

        <div class="engine-selection-box">
          <h3 class="engine-selection-title">현재 선택 요약</h3>
          <div id="engineSelectionSummary"></div>
          <div id="engineMiniPayload" class="engine-selection-payload"></div>
        </div>
      </div>
    `;

    actions.parentNode.insertBefore(section, actions);

    const keywordInput = $("keyword");
    if (keywordInput) {
      keywordInput.readOnly = true;
      keywordInput.placeholder = "아래에서 교과 개념 키워드를 선택하면 자동 입력됩니다.";
      const label = keywordInput.closest("label");
      const span = label ? label.querySelector("span") : null;
      if (span) span.textContent = "선택 키워드(자동 반영)";
    }

    normalizeBaseLabels();
    augmentTaskOptions();
    cleanupMinimalForm();

    const flowCard = section.querySelector(".engine-flow-card");
    const conceptBlock = section.querySelector("#engineConceptBlock");
    const trackBlock = section.querySelector("#engineTrackBlock");
    if (flowCard && conceptBlock && trackBlock) {
      flowCard.insertBefore(conceptBlock, trackBlock);

      const conceptTitle = conceptBlock.querySelector(".engine-step-title");
      const conceptCopy = conceptBlock.querySelector(".engine-step-copy");
      const conceptGuide = conceptBlock.querySelector(".engine-step-guide");
      if (conceptTitle) conceptTitle.textContent = "3. 교과 개념·키워드 선택";
      if (conceptCopy) conceptCopy.textContent = "먼저 현재 과목 안에서 어떤 교과 개념과 키워드로 출발할지 고릅니다. 종단 연결성은 이 선택을 바탕으로 열립니다.";
      if (conceptGuide) conceptGuide.textContent = "교과 개념 → 핵심 키워드";

      const trackTitle = trackBlock.querySelector(".engine-step-title");
      const trackCopy = trackBlock.querySelector(".engine-step-copy");
      const trackGuide = trackBlock.querySelector(".engine-step-guide");
      if (trackTitle) trackTitle.textContent = "4. 교과 개념 기반 후속 연계축 선택";
      if (trackCopy) trackCopy.textContent = "선택한 교과 개념이 다음 학년 과목으로 어떻게 이어지는지 먼저 보고, 학과 입력은 그 축의 우선순위를 조정하는 데만 사용합니다.";
      if (trackGuide) trackGuide.textContent = "종단 연결 → 학과 보정";
    }

    injectHiddenInput("linkedTrack");
    injectHiddenInput("selectedConcept");
    injectHiddenInput("selectedBookId");
    injectHiddenInput("selectedBookTitle");
    injectHiddenInput("reportMode");
    injectHiddenInput("reportView");
    injectHiddenInput("reportLine");
    injectHiddenInput("miniNavigationPayload");
    injectHiddenInput("engineCollectionPayload");
  }

  function injectHiddenInput(id) {
    if ($(id)) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.id = id;
    const actions = document.querySelector(".actions");
    if (actions && actions.parentNode) {
      actions.parentNode.insertBefore(input, actions);
    }
  }

  function normalizeBaseLabels() {
    const taskName = $("taskName");
    const taskType = $("taskType");
    const taskDescription = $("taskDescription");
    const usagePurpose = $("usagePurpose");

    const taskNameSpan = taskName?.closest("label")?.querySelector("span");
    const taskTypeSpan = taskType?.closest("label")?.querySelector("span");
    const taskDescSpan = taskDescription?.closest("label")?.querySelector("span");
    const usageSpan = usagePurpose?.closest("label")?.querySelector("span");

    if (taskNameSpan) taskNameSpan.textContent = "활동 과제 이름";
    if (taskTypeSpan) taskTypeSpan.textContent = "결과물 유형";
    if (taskDescSpan) taskDescSpan.textContent = "선생님 안내문";
    if (usageSpan) usageSpan.textContent = "사용 목적";

    if (taskName) taskName.placeholder = "예: 과학 탐구 보고서, 동아리 주제 발표, 자율활동 기록 정리";
    const careerInput = $("career");
    const careerSpan = careerInput?.closest("label")?.querySelector("span");
    if (careerSpan) careerSpan.textContent = "학과 검색";
    if (careerInput) careerInput.placeholder = "예: 컴퓨터, 반도체, 간호, 신소재, 환경";
    if (taskDescription) taskDescription.placeholder = "예: 교과 개념과 연결한 자료조사형 보고서, 실험은 어렵고 발표 포함 / 동아리에서 실제 사례 조사 중심";
  }


  function cleanupMinimalForm() {
    const usagePurpose = $("usagePurpose");
    const keywordInput = $("keyword");
    const taskType = $("taskType");
    const taskDescription = $("taskDescription");
    const careerInput = $("career");

    const usageLabel = usagePurpose?.closest("label");
    if (usageLabel) usageLabel.style.display = "none";

    const keywordLabel = keywordInput?.closest("label");
    if (keywordLabel) keywordLabel.style.display = "none";
    if (keywordInput && keywordInput.type !== "hidden") {
      keywordInput.type = "hidden";
    }

    const careerSpan = careerInput?.closest("label")?.querySelector("span");
    if (careerSpan) careerSpan.textContent = "학과 검색";
    if (careerInput) careerInput.placeholder = "예: 컴퓨터, 반도체, 간호, 신소재, 환경";

    const taskTypeSpan = taskType?.closest("label")?.querySelector("span");
    if (taskTypeSpan) taskTypeSpan.textContent = "결과물 유형";

    const taskDescSpan = taskDescription?.closest("label")?.querySelector("span");
    if (taskDescSpan) taskDescSpan.textContent = "선생님 안내문";
  }

  function ensureSelectOption(selectEl, value, label) {
    if (!selectEl) return;
    const exists = Array.from(selectEl.options || []).some(opt => (opt.value || opt.textContent || "").trim() === value);
    if (!exists) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label || value;
      selectEl.appendChild(option);
    }
  }

  function augmentTaskOptions() {
    const taskType = $("taskType");
    const usagePurpose = $("usagePurpose");

    [
      ["탐구보고서", "탐구보고서"],
      ["실험보고서", "실험보고서"],
      ["자료조사 보고서", "자료조사 보고서"],
      ["발표보고서", "발표보고서"]
    ].forEach(([value, label]) => ensureSelectOption(taskType, value, label));

    [
      "동아리 주제 정리",
      "자율활동 주제 설계",
      "진로활동 확장",
      "세특 참고 초안"
    ].forEach(v => ensureSelectOption(usagePurpose, v, v));
  }

  function injectGeneralContextPanel() {
    // 최소 입력 폼 운영을 위해 현재는 추가 패널을 생성하지 않습니다.
    return;
    if ($("engineGeneralContextPanel")) return;
    const formGrid = document.querySelector(".form-grid");
    const actions = document.querySelector(".actions");
    if (!formGrid || !actions || !actions.parentNode) return;

    const panel = document.createElement("div");
    panel.id = "engineGeneralContextPanel";
    panel.className = "engine-context-panel";
    panel.innerHTML = `
      <div class="engine-context-head">
        <div>
          <h3 class="engine-context-title">학생 입력 정보</h3>
          <div class="engine-context-copy">학생은 쉬운 질문에 답하고, 엔진은 그 답을 MINI와 Cloudflare가 쓰기 좋은 구조 데이터로 바꿉니다.</div>
        </div>
        <div class="engine-step-guide">수행평가 / 동아리 / 자율활동 공통</div>
      </div>
      <div class="engine-context-grid">
        <label>
          <span>이 글을 어디에 쓰나요?</span>
          <select id="activityArea">
            <option value="">선택</option>
            <option value="수행평가">수행평가</option>
            <option value="동아리 활동">동아리 활동</option>
            <option value="자율활동">자율활동</option>
            <option value="진로활동">진로활동</option>
            <option value="세특 참고">세특 참고</option>
          </select>
        </label>
        <label>
          <span>어떤 결과물이 필요하나요?</span>
          <select id="outputGoal">
            <option value="">선택</option>
            <option value="탐구보고서">탐구보고서</option>
            <option value="실험보고서">실험보고서</option>
            <option value="자료조사 보고서">자료조사 보고서</option>
            <option value="발표보고서">발표보고서</option>
          </select>
        </label>
        <label>
          <span>원하는 길이는 어느 정도인가요?</span>
          <select id="lengthLevel">
            <option value="">선택</option>
            <option value="짧게">짧게</option>
            <option value="보통">보통</option>
            <option value="깊게">깊게</option>
          </select>
        </label>
        <label>
          <span>혼자 하나요, 같이 하나요?</span>
          <select id="workStyle">
            <option value="">선택</option>
            <option value="개인">개인</option>
            <option value="모둠">모둠</option>
            <option value="개인+발표">개인+발표</option>
            <option value="모둠+발표">모둠+발표</option>
          </select>
        </label>
        <label class="full">
          <span>선생님 조건이 있나요?</span>
          <div class="engine-check-grid">
            <label class="engine-check-item"><input type="checkbox" id="ctx_presentation">발표 포함</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_experiment">실험 가능</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_research">자료조사 중심</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_graph">그래프 필요</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_table">표 필요</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_concept">교과 개념 반드시 포함</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_book">도서 활용 포함</label>
            <label class="engine-check-item"><input type="checkbox" id="ctx_compare">비교 대상 포함</label>
          </div>
          <div class="engine-context-note">잘 모르겠으면 비워도 괜찮아요. 체크한 조건만 반영해서 더 정확하게 맞춰줍니다.</div>
        </label>
        <label class="full">
          <span>선생님이 준 설명 그대로 붙여넣기</span>
          <textarea id="teacherFocus" placeholder="예: 교과 개념을 반드시 2개 이상 넣기 / 실제 사례 포함 / 발표 시간 3분 내외"></textarea>
        </label>
        <label class="full">
          <span>이미 생각한 키워드나 넣고 싶은 내용</span>
          <textarea id="studentSeed" placeholder="예: 배터리 열폭주 사례를 넣고 싶어요 / 반도체와 센서를 연결해 보고 싶어요"></textarea>
        </label>
      </div>
    `;

    const uploadPanel = document.createElement("div");
    uploadPanel.id = "engineUploadPanel";
    uploadPanel.className = "engine-upload-panel";
    uploadPanel.innerHTML = `
      <div class="engine-context-head">
        <div>
          <h3 class="engine-context-title">참고 자료 업로드</h3>
          <div class="engine-context-copy">예전 보고서나 생활기록부 PDF가 있으면 올려 주세요. 엔진이 키워드, 이미 쓴 방향, 중복 위험을 구조 데이터로 바꿔 쓰게 됩니다.</div>
        </div>
        <div class="engine-step-guide">PDF / 이미지 가능</div>
      </div>
      <div class="engine-upload-grid">
        <label>
          <span>이전에 쓴 보고서 / 발표 자료</span>
          <input id="pastReportFile" class="engine-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple />
          <div class="engine-upload-help">예: 예전 탐구 보고서, 발표 자료, 포스터 초안</div>
        </label>
        <label>
          <span>생활기록부 / 활동 기록 자료</span>
          <input id="recordFile" class="engine-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple />
          <div class="engine-upload-help">예: 생활기록부 일부, 세특 발췌본, 활동 기록 PDF</div>
        </label>
        <label class="full">
          <span>업로드 자료로 무엇을 도와드릴까요?</span>
          <div class="engine-pill-checks">
            <label class="engine-pill-check"><input type="checkbox" id="src_extract_keywords">키워드 추출</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_find_used_topics">이미 쓴 주제 파악</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_reduce_duplication">중복 줄이기</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_adjust_track">연계 축 추천 보정</label>
            <label class="engine-pill-check"><input type="checkbox" id="src_adjust_books">도서 추천 보정</label>
          </div>
          <div class="engine-student-note">자료가 없으면 그냥 넘어가도 됩니다. 자료가 있으면 결과를 더 개인화하기 좋습니다.</div>
        </label>
        <label class="full">
          <span>업로드 자료 요약</span>
          <div id="engineUploadSummary" class="engine-file-list">아직 업로드한 자료가 없습니다.</div>
        </label>
      </div>
    `;

    actions.parentNode.insertBefore(panel, actions);
    actions.parentNode.insertBefore(uploadPanel, actions);
  }

  function getContextFieldIds() {
    return [
      "schoolName", "grade", "subject", "taskName", "taskType", "usagePurpose", "taskDescription",
      "activityArea", "outputGoal", "lengthLevel", "workStyle", "teacherFocus", "studentSeed",
      "ctx_presentation", "ctx_experiment", "ctx_research", "ctx_graph", "ctx_table", "ctx_concept", "ctx_book", "ctx_compare",
      "pastReportFile", "recordFile", "src_extract_keywords", "src_find_used_topics", "src_reduce_duplication", "src_adjust_track", "src_adjust_books"
    ];
  }

  function getStructuredConstraints() {
    const checks = [
      ["presentation_included", $("ctx_presentation")?.checked, "발표 포함"],
      ["experiment_possible", $("ctx_experiment")?.checked, "실험 가능"],
      ["research_only", $("ctx_research")?.checked, "자료조사 중심"],
      ["graph_needed", $("ctx_graph")?.checked, "그래프 필요"],
      ["table_needed", $("ctx_table")?.checked, "표 필요"],
      ["concept_required", $("ctx_concept")?.checked, "교과 개념 반드시 포함"],
      ["book_required", $("ctx_book")?.checked, "도서 활용 포함"],
      ["comparison_needed", $("ctx_compare")?.checked, "비교 대상 포함"]
    ];
    const flags = {};
    const labels = [];
    checks.forEach(([key, checked, label]) => {
      flags[key] = !!checked;
      if (checked) labels.push(label);
    });
    return { flags, labels };
  }

  function getSelectedSourceGoals() {
    const pairs = [
      ["extract_keywords", $("src_extract_keywords")?.checked, "키워드 추출"],
      ["find_used_topics", $("src_find_used_topics")?.checked, "이미 쓴 주제 파악"],
      ["reduce_duplication", $("src_reduce_duplication")?.checked, "중복 줄이기"],
      ["adjust_track", $("src_adjust_track")?.checked, "연계 축 추천 보정"],
      ["adjust_books", $("src_adjust_books")?.checked, "도서 추천 보정"]
    ];
    const flags = {};
    const labels = [];
    pairs.forEach(([key, checked, label]) => {
      flags[key] = !!checked;
      if (checked) labels.push(label);
    });
    return { flags, labels };
  }

  function fileMetaList(inputId, sourceType) {
    const input = $(inputId);
    const files = Array.from(input?.files || []);
    return files.map(file => ({
      source_type: sourceType,
      name: file.name || "",
      size: Number(file.size || 0),
      mime_type: file.type || "",
      last_modified: Number(file.lastModified || 0)
    }));
  }

  function formatBytes(n) {
    const value = Number(n || 0);
    if (!value) return "0KB";
    if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + "MB";
    return Math.max(1, Math.round(value / 1024)) + "KB";
  }

  function renderUploadSummary() {
    const box = $("engineUploadSummary");
    if (!box) return;
    const files = [
      ...fileMetaList("pastReportFile", "past_report"),
      ...fileMetaList("recordFile", "student_record")
    ];
    const goals = getSelectedSourceGoals().labels;
    if (!files.length) {
      box.innerHTML = "아직 업로드한 자료가 없습니다.";
      return;
    }
    const lines = files.map(file => `• ${escapeHtml(file.name)} (${escapeHtml(formatBytes(file.size))}) / ${escapeHtml(file.source_type === "past_report" ? "예전 보고서" : "생활기록부/활동 자료")}`);
    if (goals.length) {
      lines.push(`<br><strong>활용 목적</strong>: ${escapeHtml(goals.join(", "))}`);
    }
    box.innerHTML = lines.join("<br>");
  }

  function bindContextInputs() {
    getContextFieldIds().forEach(id => {
      const el = $(id);
      if (!el) return;
      const evt = el.tagName === "TEXTAREA" || el.tagName === "INPUT" ? "input" : "change";
      el.addEventListener(evt, function () {
        syncOutputFields();
        renderUploadSummary();
        renderSelectionSummary();
      });
      if (el.type === "checkbox") {
        el.addEventListener("change", function () {
          syncOutputFields();
          renderSelectionSummary();
        });
      }
    });
  }

  function getMajorEngineSnapshot() {
    try {
      return typeof window.getMajorEngineSelectionData === "function"
        ? (window.getMajorEngineSelectionData() || null)
        : null;
    } catch (error) {
      console.warn("major snapshot read failed:", error);
      return null;
    }
  }

  function derivePreviewDetailFromPayload(payload) {
    if (!payload) return null;
    if (payload.status === "resolved") {
      return {
        display_name: payload.display_name || "",
        core_keywords: Array.isArray(payload.core_keywords) ? payload.core_keywords.slice(0, 8) : [],
        comparison: payload.comparison || null
      };
    }
    if ((payload.status === "ambiguous" || payload.status === "not_found") && Array.isArray(payload.suggestions) && payload.suggestions.length) {
      const first = payload.suggestions.find(item => Array.isArray(item?.keywords) && item.keywords.length) || payload.suggestions[0];
      return {
        display_name: first?.display_name || "",
        core_keywords: Array.isArray(first?.keywords) ? first.keywords.slice(0, 8) : [],
        comparison: null
      };
    }
    return null;
  }

  function renderCareerKeywordPreview() {
    const keywordInput = $("keyword");
    if (!keywordInput) return;
    if (state.keyword) {
      keywordInput.value = state.keyword;
      keywordInput.placeholder = "교과 개념 키워드가 자동 입력된 상태입니다.";
      return;
    }
    syncMajorSelectionDetail(null);
    const preview = Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords.slice(0, 5).join(', ') : '';
    keywordInput.value = preview || '';
    keywordInput.placeholder = preview
      ? "전공 키워드 미리보기가 자동 반영된 상태입니다. 아래에서 교과 개념을 고르면 최종 키워드로 바뀝니다."
      : "학과를 고르면 먼저 전공 키워드가 보이고, 아래에서 교과 개념을 고르면 최종 키워드가 바뀝니다.";
  }

  function getMajorPanelResolvedName() {
    try {
      const title = document.querySelector('.major-engine-title')?.textContent?.trim() || '';
      if (!title) return '';
      if (/관련 학과|표준화|찾지 못했|전공 후보|학과명을/.test(title)) return '';
      return title;
    } catch (error) {
      return '';
    }
  }

  function getMajorGlobalDetail() {
    try {
      const data = window.__MAJOR_ENGINE_SELECTED__ || null;
      if (data && data.display_name) return data;
    } catch (error) {}
    return null;
  }

  function inferMajorNameFromVisibleDom() {
    const candidates = [];
    const add = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (text) candidates.push(text);
    };
    try {
      const panel = document.getElementById('majorEngineSummary');
      if (panel && panel.style.display !== 'none') {
        add(panel.querySelector('.major-engine-title')?.textContent || '');
        const panelText = panel.textContent || '';
        const explicit = panelText.match(/(컴퓨터공학과|소프트웨어학과|인공지능학과|정보보호학과|데이터사이언스학과|통계학과|전자공학과|반도체공학과|신소재공학과|간호학과|생명과학과|환경공학과|경영학과|경제학과|심리학과|미디어커뮤니케이션학과)/);
        if (explicit) add(explicit[1]);
      }
    } catch (error) {}
    try { add(document.getElementById('career')?.value || ''); } catch (error) {}
    const blocked = /관련 학과|표준화|찾지 못했|전공 후보|학과명을|입력 전|선택 전/;
    return candidates.find(value => !blocked.test(value) && looksLikeMajorInput(value)) || '';
  }

  function hardSyncCareerFromDom() {
    const effective = inferMajorNameFromVisibleDom();
    if (effective) {
      state.career = effective;
      if (!state.majorSelectedName && /학과|전공|공학|컴퓨터|소프트웨어|정보|데이터|인공지능|AI|반도체|간호|신소재|환경|경영|경제|심리|생명|화학|물리|수학|국어|교육/.test(effective)) {
        state.majorSelectedName = effective;
      }
    }
    return effective;
  }

  function getCareerInputCandidates() {
    const seen = new Set();
    const list = [];
    const add = (el) => {
      if (!el || seen.has(el)) return;
      seen.add(el);
      list.push(el);
    };
    add($('career'));
    document.querySelectorAll('input, textarea').forEach(el => {
      const id = String(el.id || '').toLowerCase();
      const name = String(el.name || '').toLowerCase();
      const placeholder = String(el.getAttribute('placeholder') || '');
      if (id === 'career' || name.includes('career') || name.includes('major') || /학과|진로|전공|컴퓨터|반도체|간호|신소재|환경/.test(placeholder)) add(el);
    });
    document.querySelectorAll('input[type="text"], input:not([type]), textarea').forEach(add);
    return list;
  }

  function looksLikeMajorInput(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    if (/(학교|고등학교|보고서|발표|탐구|수행평가|선생님|자료조사|실험|활동)/.test(text) && !/(학과|공학|컴퓨터|소프트웨어|정보|데이터|AI|인공지능|반도체|간호|신소재|환경|경영|경제|심리|생명|화학|물리|수학|국어|교육|건축|도시|전자|기계|의학|약학)/.test(text)) return false;
    return /(학과|공학|컴퓨터|소프트웨어|정보|데이터|AI|인공지능|반도체|간호|신소재|환경|경영|경제|심리|생명|화학|물리|수학|국어|교육|건축|도시|전자|전기|기계|의학|약학|보건|미디어|콘텐츠|사회|정치|행정|법|통계)/.test(text);
  }

  function getCareerInputText() {
    const candidates = getCareerInputCandidates();
    const primary = $('career');
    const primaryValue = (primary?.value || '').trim();
    if (primaryValue) return primaryValue;

    const explicit = candidates
      .map(el => (el?.value || '').trim())
      .find(value => looksLikeMajorInput(value));
    if (explicit) return explicit;

    try {
      const lastRaw = String(window.__MAJOR_ENGINE_LAST_RAW__ || window.__MAJOR_ENGINE_LAST_INPUT__ || '').trim();
      if (lastRaw) return lastRaw;
    } catch (error) {}

    return '';
  }

  function getEffectiveCareerName() {
    const globalDetail = getMajorGlobalDetail();
    const snapshotDetail = derivePreviewDetailFromPayload(getMajorEngineSnapshot());
    const panelName = getMajorPanelResolvedName();
    const domName = inferMajorNameFromVisibleDom();
    return (globalDetail?.display_name || snapshotDetail?.display_name || state.majorSelectedName || panelName || state.career || domName || getCareerInputText() || '').trim();
  }

  function syncMajorSelectionDetail(detail) {
    const globalDetail = getMajorGlobalDetail();
    const snapshotDetail = derivePreviewDetailFromPayload(getMajorEngineSnapshot());
    const panelName = getMajorPanelResolvedName();
    const fallback = detail || globalDetail || snapshotDetail || (panelName ? { display_name: panelName, core_keywords: [], comparison: null } : null);
    const rawCareer = getCareerInputText();
    const resolvedName = (fallback?.display_name || panelName || '').trim();

    if (resolvedName) state.majorSelectedName = resolvedName;
    state.majorCoreKeywords = Array.isArray(fallback?.core_keywords) ? fallback.core_keywords.slice(0, 8) : (state.majorCoreKeywords || []);
    state.majorComparison = fallback?.comparison || state.majorComparison || null;

    const nextCareer = resolvedName || panelName || rawCareer;
    if (nextCareer) state.career = nextCareer;

    if (!state.linkTrack && state.subject && state.career) {
      const autoTrack = getAutoTrackDetail();
      if (autoTrack?.id) {
        state.linkTrack = autoTrack.id;
        state.linkTrackSource = 'auto';
      }
    }
  }

  function syncMajorBridgeState() {
    const before = {
      career: state.career || '',
      major: state.majorSelectedName || '',
      core: Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords.join('|') : ''
    };

    syncMajorSelectionDetail(null);
    hardSyncCareerFromDom();

    const after = {
      career: state.career || '',
      major: state.majorSelectedName || '',
      core: Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords.join('|') : ''
    };
    return before.career !== after.career || before.major !== after.major || before.core !== after.core;
  }

  function startMajorBridgePolling() {
    if (window.__TEXTBOOK_MAJOR_BRIDGE_POLLING_V33_16__) return;
    window.__TEXTBOOK_MAJOR_BRIDGE_POLLING_V33_16__ = true;
    setInterval(function () {
      const changed = syncMajorBridgeState();
      if (changed) renderAll();
    }, 350);
  }

  function scheduleMajorPreviewSync() {
    const refresh = function () {
      try {
        if (typeof window.__MAJOR_ENGINE_RENDER__ === "function") {
          window.__MAJOR_ENGINE_RENDER__();
        }
      } catch (error) {
        console.warn("major render refresh failed:", error);
      }
      syncMajorSelectionDetail(null);
      if (!state.keyword) {
        renderCareerKeywordPreview();
      }
      syncOutputFields();
    };
    [0, 80, 220].forEach(delay => setTimeout(refresh, delay));
  }

  function bindEvents() {
    const subjectEl = $("subject");
    if (subjectEl) {
      subjectEl.addEventListener("change", function () {
        syncSubjectFromSelect();
        state.showAllConcepts = false;
        clearFrom("concept");
        renderAll();
      });
    }

    const careerEl = $("career");
    if (careerEl) {
      ["input", "change"].forEach(evt => {
        careerEl.addEventListener(evt, function () {
          syncCareerFromInput();
          state.linkTrackSource = state.linkTrackSource || "";
          renderAll();
          scheduleMajorPreviewSync();
        });
      });
    }

    window.addEventListener("major-engine-selection-changed", function (event) {
      syncMajorSelectionDetail(event?.detail || null);
      renderAll();
    });

    document.addEventListener("click", function (event) {
      const conceptToggleBtn = event.target.closest(".engine-concept-toggle-btn[data-action='concept-display-toggle']");
      if (conceptToggleBtn && isStepEnabled(3)) {
        state.showAllConcepts = !state.showAllConcepts;
        syncOutputFields();
        renderAll();
        return;
      }

      const autoTrackBtn = event.target.closest(".engine-auto-btn[data-action='auto-track']");
      if (autoTrackBtn && isStepEnabled(4)) {
        const topTrack = getTrackOptions()[0];
        clearFrom("track");
        state.linkTrack = topTrack ? topTrack.id : "";
        state.linkTrackSource = topTrack ? 'auto' : '';
        syncOutputFields();
        renderAll();
        return;
      }

      const trackCard = event.target.closest(".engine-track-card");
      if (trackCard && isStepEnabled(4)) {
        const nextTrack = trackCard.getAttribute("data-track") || "";
        clearFrom("track");
        state.linkTrack = nextTrack;
        state.linkTrackSource = 'manual';
        syncOutputFields();
        renderAll();
        return;
      }

      const conceptCard = event.target.closest(".engine-concept-card");
      if (conceptCard && isStepEnabled(3)) {
        const value = conceptCard.getAttribute("data-concept") || "";
        state.concept = value;
        state.keyword = "";
        clearFrom("track");
        syncOutputFields();
        renderAll();
        return;
      }

      const keywordBtn = event.target.closest(".engine-chip[data-action='keyword']");
      if (keywordBtn && isStepEnabled(3)) {
        state.keyword = keywordBtn.getAttribute("data-value") || "";
        clearFrom("track");
        syncOutputFields();
        renderAll();
        return;
      }

      const bookBtn = event.target.closest(".book-chip[data-kind='book']");
      if (bookBtn && isStepEnabled(5)) {
        state.selectedBook = bookBtn.getAttribute("data-value") || "";
        state.selectedBookTitle = bookBtn.getAttribute("data-title") || "";
        state.reportMode = "";
        state.reportView = "";
        state.reportLine = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const modeCard = event.target.closest(".engine-mode-card[data-action='mode']");
      if (modeCard && isStepEnabled(6)) {
        state.reportMode = modeCard.getAttribute("data-value") || "";
        state.reportView = "";
        syncOutputFields();
        renderAll();
        return;
      }

      const viewBtn = event.target.closest(".engine-chip[data-action='view']");
      if (viewBtn && isStepEnabled(7)) {
        state.reportView = viewBtn.getAttribute("data-value") || "";
        syncOutputFields();
        renderAll();
        return;
      }

      const lineCard = event.target.closest(".engine-mode-card[data-action='line']");
      if (lineCard && isStepEnabled(8)) {
        state.reportLine = lineCard.getAttribute("data-value") || "";
        syncOutputFields();
        renderAll();
        return;
      }
    });

    document.addEventListener('input', function (event) {
      const target = event.target;
      if (!target || !target.matches || !target.matches('input, textarea, select')) return;
      const before = state.career || '';
      syncSubjectFromSelect();
      syncMajorSelectionDetail(null);
      if (!state.keyword) renderCareerKeywordPreview();
      const after = state.career || '';
      if (before !== after || target.id === 'career') {
        setTimeout(renderAll, 0);
      }
    }, true);

    document.addEventListener('change', function (event) {
      const target = event.target;
      if (!target || !target.matches || !target.matches('input, textarea, select')) return;
      syncSubjectFromSelect();
      syncMajorSelectionDetail(null);
      if (!state.keyword) renderCareerKeywordPreview();
      setTimeout(renderAll, 0);
    }, true);

    try {
      const observer = new MutationObserver(function () {
        if (syncMajorBridgeState()) renderAll();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (error) {}

    bindContextInputs();

    window.__BOOK_ENGINE_REQUEST_RERENDER__ = renderAll;
    window.__TEXTBOOK_HELPER_STATE__ = state;
    window.__TEXTBOOK_HELPER_RENDER__ = renderAll;
    window.getMiniNavigationSelectionData = buildMiniPayload;
    window.getEngineCollectionPayload = buildEngineCollectionPayload;
    window.getEngineCollectionFormData = buildEngineCollectionFormData;
  }

  function buildEngineCollectionPayload() {
    const mini = buildMiniPayload();
    return {
      collected_at: new Date().toISOString(),
      student_input: {
        school_name: $("schoolName")?.value || "",
        grade: $("grade")?.value || "",
        subject: state.subject || $("subject")?.value || "",
        career: state.career || $("career")?.value || "",
        task_name: $("taskName")?.value || "",
        task_type: $("taskType")?.value || "",
        usage_purpose: $("usagePurpose")?.value || "",
        task_description: $("taskDescription")?.value || "",
        linked_track: state.linkTrack || "",
        selected_concept: state.concept || "",
        selected_keyword: state.keyword || "",
        selected_book_id: state.selectedBook || "",
        selected_book_title: state.selectedBookTitle || "",
        report_mode: state.reportMode || "",
        report_view: state.reportView || "",
        report_line: state.reportLine || "",
        activity_area: $("activityArea")?.value || "",
        output_goal: $("outputGoal")?.value || "",
        length_level: $("lengthLevel")?.value || "",
        work_style: $("workStyle")?.value || "",
        teacher_focus: $("teacherFocus")?.value || "",
        student_seed: $("studentSeed")?.value || ""
      },
      source_materials: {
        files: [
          ...fileMetaList("pastReportFile", "past_report"),
          ...fileMetaList("recordFile", "student_record")
        ],
        source_goals: getSelectedSourceGoals().flags,
        source_goal_labels: getSelectedSourceGoals().labels
      },
      mini_payload: mini
    };
  }

  function buildEngineCollectionFormData() {
    const payload = buildEngineCollectionPayload();
    const fd = new FormData();
    fd.append("payload", JSON.stringify(payload));
    Array.from($("pastReportFile")?.files || []).forEach(file => fd.append("past_report_files", file));
    Array.from($("recordFile")?.files || []).forEach(file => fd.append("record_files", file));
    return fd;
  }

  function clearFrom(stepName) {
    if (stepName === "track") {
      state.linkTrack = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      state.reportLine = "";
      syncOutputFields();
      return;
    }
    if (stepName === "concept") {
      state.concept = "";
      state.keyword = "";
      state.linkTrack = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      state.reportLine = "";
      syncOutputFields();
    }
  }

  function syncSubjectFromSelect() {
    const el = $("subject");
    const raw = el ? ((el.value || "").trim() || (el.options?.[el.selectedIndex]?.text || "").trim()) : "";
    state.subject = getCanonicalSubjectName(findSubjectKey(raw) || raw);
    if (state.subject === "통합사회") state.subject = "통합사회1";
  }

  function syncCareerFromInput() {
    const el = $("career");
    state.career = (el?.value || "").trim();
    syncMajorSelectionDetail(null);
    if (!state.keyword) renderCareerKeywordPreview();
  }

  function findSubjectKey(raw) {
    if (!raw) return "";
    const canonicalRaw = getCanonicalSubjectName(raw);
    const cleaned = normalize(canonicalRaw);
    if (cleaned === normalize("통합사회")) return "통합사회1";

    const seedKeys = uiSeed ? Object.keys(uiSeed) : [];
    for (const key of seedKeys) {
      if (normalize(key) === cleaned) return key;
    }
    for (const key of seedKeys) {
      const nk = normalize(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    const engineKeys = engineMap ? Object.keys(engineMap) : [];
    for (const key of engineKeys) {
      if (normalize(key) === cleaned) return key;
    }
    for (const key of engineKeys) {
      const nk = normalize(key);
      if (cleaned.includes(nk) || nk.includes(cleaned)) return key;
    }

    return raw;
  }


  function getResolvedTrackId() {
    const meta = getTrackMeta(state.linkTrack);
    return mapAxisDomainToLegacyTrack(meta?.axisDomain || meta?.id || state.linkTrack || "");
  }

  function mapAxisDomainToLegacyTrack(axisDomain) {
    const domain = String(axisDomain || "").trim().toLowerCase();
    if (!domain) return "";
    if (domain === "chemistry") return "chemistry";
    if (domain === "physics") return "physics";
    if (domain === "biology") return "biology";
    if (domain === "earth" || domain === "earth_env" || domain === "environment") return "earth";
    if (domain === "data") return "physics";
    if (domain === "math") return "physics";
    if (domain === "info") return "physics";
    if (domain === "social_policy") return "biology";
    return "";
  }

  function getFollowupSubjectEntry(subject) {
    if (!subject || !Array.isArray(subjectBridgePoint)) return null;
    return subjectBridgePoint.find(item => fuzzyIncludes(item?.subject_name, subject)) || null;
  }

  function getConceptTextBag() {
    const entry = getConceptEntry();
    const followupEntry = getFollowupSubjectEntry(state.subject);
    const followupKeywords = Array.isArray(followupEntry?.bridge_points)
      ? followupEntry.bridge_points.flatMap(point => point?.bridge_keywords || [])
      : [];
    return [
      state.subject || "",
      state.concept || "",
      state.keyword || "",
      ...(entry?.core_concepts || []),
      ...(entry?.micro_keywords || []),
      ...(entry?.linked_career_bridge || []),
      ...followupKeywords
    ].join(" ");
  }

  function getConceptDrivenNextSubjects() {
    const followupEntry = getFollowupSubjectEntry(state.subject);
    const fromFollowup = Array.isArray(followupEntry?.bridge_points)
      ? followupEntry.bridge_points.flatMap(point => point?.next_subject_candidates || [])
      : [];
    const conceptBag = getConceptTextBag();

    const subjectMap = [
      { domain: "data", subjects: ["대수", "확률과 통계", "정보"], regex: /(측정|단위|자료|데이터|그래프|정량|오차|패턴|규칙|함수|모델|정보|분석)/ },
      { domain: "physics", subjects: ["물리", "역학과 에너지", "전자기와 양자"], regex: /(측정|단위|힘|운동|에너지|전류|전압|센서|시스템|벡터|구조|안정성|회로|장치)/ },
      { domain: "chemistry", subjects: ["화학", "물질과 에너지", "전자기와 양자"], regex: /(물질|원소|주기율|결합|산화|환원|분자|이온|재료|구성|성질|규칙성|화학)/ },
      { domain: "biology", subjects: ["생명과학", "세포와 물질대사", "화학"], regex: /(생명|항상성|세포|대사|효소|호흡|광합성|면역|건강|조절|생체)/ },
      { domain: "earth_env", subjects: ["지구과학", "지구시스템과학", "확률과 통계"], regex: /(지구|환경|기후|천체|우주|대기|해양|순환|지질|시공간|관측)/ },
      { domain: "engineering", subjects: ["기하", "물리", "역학과 에너지"], regex: /(공간|좌표|벡터|정사영|입체|구조|모형|설계)/ }
    ];

    const inferred = subjectMap
      .filter(item => item.regex.test(conceptBag))
      .flatMap(item => item.subjects);

    return uniq([...fromFollowup, ...inferred]);
  }

  function getConceptDrivenAxisSeeds() {
    return [
      {
        id: "data_math",
        title: "수리·데이터 모델링 축",
        short: "대수·확통·정보",
        axisDomain: "data",
        linkedSubjects: ["대수", "확률과 통계", "정보"],
        extensionKeywords: ["데이터", "정량 분석", "모델링"],
        activityExamples: ["데이터 비교", "그래프 해석", "패턴 분석"],
        desc: "선택한 교과 개념을 수치화·비교·예측 관점으로 확장하는 방향입니다.",
        pattern: /(측정|단위|자료|데이터|그래프|정량|오차|패턴|규칙|함수|모델|정보|분석)/
      },
      {
        id: "physics_system",
        title: "물리·시스템 해석 축",
        short: "물리·역학·전자기",
        axisDomain: "physics",
        linkedSubjects: ["물리", "역학과 에너지", "전자기와 양자"],
        extensionKeywords: ["힘", "운동", "에너지"],
        activityExamples: ["센서 원리 설명", "시스템 구조 분석", "운동·에너지 해석"],
        desc: "현재 개념을 힘·운동·전기·시스템 원리로 이어서 해석하는 방향입니다.",
        pattern: /(측정|단위|힘|운동|에너지|전류|전압|센서|시스템|벡터|구조|안정성|회로|장치)/
      },
      {
        id: "chem_material",
        title: "화학·재료 분석 축",
        short: "화학·물질·재료",
        axisDomain: "chemistry",
        linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자"],
        extensionKeywords: ["물질", "결합", "성질"],
        activityExamples: ["재료 성질 비교", "결합 구조 설명", "반응 조건 분석"],
        desc: "물질 구성과 성질, 결합과 반응을 바탕으로 재료·화학 방향으로 확장하는 축입니다.",
        pattern: /(물질|원소|주기율|결합|산화|환원|분자|이온|재료|구성|성질|규칙성|화학)/
      },
      {
        id: "bio_cell",
        title: "생명·세포 심화 축",
        short: "생명·세포·대사",
        axisDomain: "biology",
        linkedSubjects: ["생명과학", "세포와 물질대사", "화학"],
        extensionKeywords: ["생명", "세포", "대사"],
        activityExamples: ["생명 시스템 설명", "세포 수준 원리 정리", "건강 반응 해석"],
        desc: "생명 현상과 세포 수준 원리를 중심으로 건강·생명과학 방향으로 확장하는 축입니다.",
        pattern: /(생명|항상성|세포|대사|효소|호흡|광합성|면역|건강|조절|생체)/
      },
      {
        id: "earth_env",
        title: "지구·환경 해석 축",
        short: "지구·기후·환경",
        axisDomain: "earth_env",
        linkedSubjects: ["지구과학", "지구시스템과학", "확률과 통계"],
        extensionKeywords: ["환경", "기후", "순환"],
        activityExamples: ["기후 자료 비교", "지구 시스템 정리", "환경 변화 해석"],
        desc: "지구 시스템과 환경 변화, 관측 자료 해석으로 이어지는 축입니다.",
        pattern: /(지구|환경|기후|천체|우주|대기|해양|순환|지질|시공간|관측)/
      },
      {
        id: "space_structure",
        title: "공간·구조 모델링 축",
        short: "기하·구조·설계",
        axisDomain: "engineering",
        linkedSubjects: ["기하", "물리", "역학과 에너지"],
        extensionKeywords: ["좌표", "공간", "벡터"],
        activityExamples: ["공간 구조 분석", "정사영·좌표 모델링", "설계 조건 비교"],
        desc: "공간도형, 좌표, 벡터와 같은 구조적 사고로 확장하는 축입니다.",
        pattern: /(공간|좌표|벡터|정사영|입체|구조|모형|설계)/
      }
    ];
  }

  function getCareerAxisBoost(axis) {
    const bucket = detectCareerBucket(state.career || "");
    const domain = String(axis?.axisDomain || axis?.axis_domain || "").toLowerCase();
    let score = 0;

    if (state.subject === "공통국어1" || state.subject === "공통국어") {
      if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText)) {
        if (/비판적 읽기와 토론/.test(concept)) {
          if (/근거|타당성|반론|재반론|토론|입론|쟁점|주장/.test(text)) score += 28;
          if (/비판적 읽기|자료 검증|출처|신뢰성|관점 비교|해결 방안/.test(text)) score += 24;
        }
        if (/사회적 쟁점 글쓰기와 문장 구성/.test(concept)) {
          if (/사회적 쟁점|주장|근거|개요|글쓰기|논증/.test(text)) score += 28;
          if (/문장 구성|표현 선택|수정|퇴고|문법 요소|규범/.test(text)) score += 22;
        }
        if (/음운 변동과 국어 규범/.test(concept) && /음운|교체|탈락|축약|첨가|발음 규칙|국어 규범|표준 발음|정확한 표현/.test(text)) score += 24;
        if (/공동체 의사소통과 공감/.test(concept) && /의사소통|공감|배려|상호작용|협력|소통/.test(text)) score += 18;
      }
    }
    if (bucket === "it") {
      if (domain === "data" || domain === "info") score += 16;
      if (domain === "engineering") score += 10;
      if (domain === "physics") score += 5;
    } else if (bucket === "electronic") {
      if (domain === "physics") score += 14;
      if (domain === "engineering") score += 10;
      if (domain === "chemistry") score += 8;
      if (domain === "data" || domain === "info") score += 4;
    } else if (bucket === "materials") {
      if (domain === "chemistry") score += 14;
      if (domain === "engineering") score += 8;
      if (domain === "physics") score += 8;
    } else if (bucket === "mechanical") {
      if (domain === "physics") score += 14;
      if (domain === "engineering") score += 12;
      if (domain === "data" || domain === "info") score += 4;
    } else if (bucket === "bio") {
      if (domain === "biology") score += 14;
      if (domain === "chemistry") score += 6;
      if (domain === "data") score += 3;
    } else if (bucket === "env") {
      if (domain === "earth_env" || domain === "environment" || domain === "earth") score += 16;
      if (domain === "data") score += 5;
      if (domain === "engineering") score += 4;
    }
    return score;
  }

  function getMajorAxisBoost(axis) {
    if (!state.majorSelectedName || !Array.isArray(majorFollowupAxis)) return 0;
    const matches = majorFollowupAxis.filter(item =>
      item && item.active !== false &&
      fuzzyIncludes(item.major_name, state.majorSelectedName) &&
      fuzzyIncludes(item.base_subject, state.subject)
    );
    let score = 0;
    matches.forEach(item => {
      const linked = Array.isArray(item.linked_subjects) ? item.linked_subjects : [];
      if (linked.some(subject => axis.linkedSubjects.some(linkedSubject => fuzzyIncludes(linkedSubject, subject)))) {
        score += item.is_primary ? 14 : 8;
      }
      if (item.axis_domain && item.axis_domain === axis.axisDomain) {
        score += item.is_primary ? 10 : 5;
      }
    });
    return score;
  }


  function getCurrentConceptLongitudinalMap() {
    if (!state.subject || !conceptLongitudinalMaps) return null;
    if (conceptLongitudinalMaps[state.subject]) return conceptLongitudinalMaps[state.subject];
    const values = Object.values(conceptLongitudinalMaps || {});
    return values.find(map => fuzzyIncludes(map?.subject_name, state.subject)) || null;
  }

  function getConceptLongitudinalEntry() {
    const currentMap = getCurrentConceptLongitudinalMap();
    if (!state.subject || !state.concept || !currentMap) return null;
    const items = Array.isArray(currentMap.concept_longitudinal_map)
      ? currentMap.concept_longitudinal_map
      : [];
    return items.find(item => fuzzyIncludes(item.concept_name, state.concept)) || null;
  }
  function getAxisCareerRelationMeta(subjectName, axisLike) {
    const careerText = [
      state.career || "",
      state.majorSelectedName || "",
      ...(Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords : []),
      state.majorComparison?.group_label || "",
      state.majorComparison?.selected_focus || ""
    ].join(" ").trim();

    if (!careerText) {
      return {
        type: "none",
        label: "",
        score: 0,
        message: "학과를 입력하면 이 축의 우선순위만 달라집니다."
      };
    }

    const subjectText = String(subjectName || state.subject || "");
    const axisText = [
      axisLike?.axis_domain || axisLike?.axisDomain || "",
      axisLike?.axis_title || axisLike?.title || "",
      ...(Array.isArray(axisLike?.next_subjects) ? axisLike.next_subjects : []),
      ...(Array.isArray(axisLike?.linkedSubjects) ? axisLike.linkedSubjects : [])
    ].join(" ");

    let type = "general";

    if (/공통국어|국어|문학|독서와 작문|독서와작문|매체 의사소통|매체의사소통/.test(subjectText)) {
      if (/(국어국문|국문|문예창작|문학|국어교육|언론|신문방송|미디어|콘텐츠|광고홍보|출판|작가|스토리|문화콘텐츠)/.test(careerText)) {
        type = "direct";
      } else if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|기계|공학|생명|화학|간호|의학|경영|경제|법|행정|정치|심리|사회|교육|디자인)/.test(careerText)) {
        type = "bridge";
      }
    } else if (/통합사회|사회/.test(subjectText)) {
      if (/(정치|행정|사회|경영|경제|무역|국제|지리|법|교육|언론|미디어|사회복지|심리|도시|환경)/.test(careerText)) {
        type = "direct";
      } else if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|기계|공학|생명|화학|간호|의학|건축)/.test(careerText)) {
        type = "bridge";
      }
    } else if (/정보/.test(subjectText)) {
      if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|로봇|전기|통신|디지털|AI)/i.test(careerText)) {
        type = "direct";
      } else if (/(경영|경제|산업|미디어|디자인|교육|심리|사회|생명|화학|환경|수학)/.test(careerText)) {
        type = "bridge";
      }
    } else {
      const domain = String(axisLike?.axis_domain || axisLike?.axisDomain || "").toLowerCase();
      if ((/physics|engineering/.test(domain) || /물리|역학|기하|전자기/.test(axisText)) && /(기계|전자|전기|반도체|로봇|자동차|항공|공학|컴퓨터|소프트웨어|정보)/.test(careerText)) {
        type = "direct";
      } else if ((/chemistry/.test(domain) || /화학|물질|재료/.test(axisText)) && /(화학|신소재|재료|고분자|배터리|생명|바이오|제약|화공|식품)/.test(careerText)) {
        type = "direct";
      } else if ((/biology/.test(domain) || /생명|세포|건강/.test(axisText)) && /(생명|바이오|간호|의학|보건|수의|약학|임상)/.test(careerText)) {
        type = "direct";
      } else if ((/earth|environment/.test(domain) || /환경|기후|지구/.test(axisText)) && /(환경|기후|지구|에너지|해양|천문|우주)/.test(careerText)) {
        type = "direct";
      } else if ((/data|info|math/.test(domain) || /데이터|통계|정보|수리/.test(axisText)) && /(컴퓨터|소프트웨어|인공지능|데이터|정보|경영|경제|통계)/.test(careerText)) {
        type = "direct";
      } else if (/(컴퓨터|소프트웨어|인공지능|데이터|정보|전자|반도체|기계|공학|경영|경제|심리|사회|교육|디자인|환경|생명|간호|의학)/.test(careerText)) {
        type = "bridge";
      }
    }

    if (type === "direct") {
      return {
        type,
        label: "직접 연계 강함",
        score: 12,
        message: `${state.career}와 바로 이어지는 축입니다.`
      };
    }
    if (type === "bridge") {
      return {
        type,
        label: "역량 브리지",
        score: 6,
        message: `${state.career}와 직접 일치하지 않아도 역량 연결이 가능한 축입니다.`
      };
    }
    return {
      type: "general",
      label: "일반 탐구",
      score: 0,
      message: `${state.career}와 직접 매핑이 약해도 탐구 확장용으로 활용 가능한 축입니다.`
    };
  }


  function buildConceptMappedAxes(entry) {
    if (!entry || !Array.isArray(entry.longitudinal_axes)) return [];
    return entry.longitudinal_axes.map(axis => {
      const relationMeta = getAxisCareerRelationMeta(state.subject, axis);
      return {
        id: axis.axis_id,
        title: axis.axis_title,
        short: entry.concept_label || state.concept,
        nextSubject: Array.isArray(axis.next_subjects) ? axis.next_subjects.join(" / ") : "",
        desc: axis.why || "",
        reason: relationMeta.message,
        relationLabel: relationMeta.label,
        relationType: relationMeta.type,
        easy: axis.student_output_hint || "",
        axisDomain: axis.axis_domain || "",
        extensionKeywords: [],
        keywordSignals: Array.isArray(axis.keyword_signals) ? axis.keyword_signals : [],
        activityExamples: axis.student_output_hint ? [axis.student_output_hint] : [],
        linkedSubjects: Array.isArray(axis.next_subjects) ? axis.next_subjects : [],
        grade2NextSubjects: Array.isArray(axis.next_subjects) ? axis.next_subjects : [],
        recordContinuityPoint: `${state.subject}의 ${entry.concept_name} 개념을 다음 과목으로 연결하는 종단 확장 포인트`,
        isPrimary: Number(axis.priority || 99) === 1,
        __relationScore: relationMeta.score,
        __priority: Number(axis.priority || 99)
      };
    });
  }

  function getFollowupAxisCandidates() {
    if (!state.subject || !state.concept || !state.keyword) return [];

    const mappedEntry = getConceptLongitudinalEntry();
    if (mappedEntry) {
      const mappedAxes = buildConceptMappedAxes(mappedEntry).map(axis => {
        let score = 100 - (axis.__priority * 12);
        score += getCareerAxisBoost(axis);
        score += getMajorAxisBoost(axis);
        score += Number(axis.__relationScore || 0);
        score += getMappedKeywordAxisBoost(mappedEntry, axis);
        return { ...axis, __score: score };
      });

      return mappedAxes
        .sort((a, b) => b.__score - a.__score || a.__priority - b.__priority || a.title.localeCompare(b.title, "ko"))
        .slice(0, 3);
    }

    const conceptBag = getConceptTextBag();
    const nextSubjects = getConceptDrivenNextSubjects();
    const seeds = getConceptDrivenAxisSeeds();

    const scored = seeds.map(seed => {
      let score = 0;
      if (seed.pattern.test(conceptBag)) score += 18;
      if (seed.linkedSubjects.some(subject => nextSubjects.some(next => fuzzyIncludes(subject, next)))) score += 16;
      score += getCareerAxisBoost(seed);
      score += getMajorAxisBoost(seed);
      const relationMeta = getAxisCareerRelationMeta(state.subject, seed);
      score += relationMeta.score;

      return {
        id: seed.id,
        title: seed.title,
        short: seed.short,
        nextSubject: seed.linkedSubjects.join(" / "),
        desc: `${state.concept} 개념을 바탕으로 ${seed.desc}`,
        reason: relationMeta.message,
        relationLabel: relationMeta.label,
        relationType: relationMeta.type,
        easy: seed.desc,
        axisDomain: seed.axisDomain,
        extensionKeywords: seed.extensionKeywords,
        activityExamples: seed.activityExamples,
        linkedSubjects: seed.linkedSubjects,
        grade2NextSubjects: seed.linkedSubjects,
        recordContinuityPoint: `${state.subject}의 ${state.concept} 개념을 다음 과목으로 연결하는 종단 확장 포인트`,
        isPrimary: score >= 26,
        __score: score
      };
    });

    const filtered = scored
      .filter(item => item.__score > 0)
      .sort((a, b) => b.__score - a.__score || a.title.localeCompare(b.title, "ko"));

    return filtered.slice(0, 3);
  }


function getSelectedFollowupAxisDetail(trackId) {
    if (!trackId) return null;
    return getFollowupAxisCandidates().find(item => item.id === trackId) || null;
  }


  function getTrackOptions() {
    const followupCandidates = getFollowupAxisCandidates();
    if (followupCandidates.length) return followupCandidates;

    const bucket = detectCareerBucket(state.career || "");
    const base = [
      { ...TRACK_HELP.physics, score: 4, axisDomain: "physics", linkedSubjects: ["물리", "역학과 에너지", "전자기와 양자"] },
      { ...TRACK_HELP.chemistry, score: 4, axisDomain: "chemistry", linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자"] },
      { ...TRACK_HELP.biology, score: 4, axisDomain: "biology", linkedSubjects: ["생명과학", "세포와 물질대사", "화학"] },
      { ...TRACK_HELP.earth, score: 4, axisDomain: "earth_env", linkedSubjects: ["지구과학", "지구시스템과학", "확률과 통계"] }
    ];

    base.forEach(item => {
      item.score += getCareerAxisBoost(item);
      if (bucket === "mechanical" && item.id === "physics") item.score += 6;
      if (bucket === "materials" && item.id === "chemistry") item.score += 6;
      if (bucket === "bio" && item.id === "biology") item.score += 6;
      if (bucket === "env" && item.id === "earth") item.score += 6;
    });

    return base
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item,
        nextSubject: (item.linkedSubjects || []).join(" / "),
        extensionKeywords: [],
        activityExamples: [],
        grade2NextSubjects: item.linkedSubjects || [],
        recordContinuityPoint: "현재 개념과 가장 가까운 후속 과목 방향",
        reason: getTrackReason(item)
      }));
  }


function getTrackMeta(trackId) {
    const followup = getSelectedFollowupAxisDetail(trackId);
    if (followup) return followup;
    return TRACK_HELP[trackId] || null;
  }

  function getConceptFriendlyLabel(concept) {
    const map = {
      "과학의 측정과 우리 사회": "센서·측정·데이터",
      "규칙성 발견과 주기율표": "원소·배열·예측",
      "기본량과 단위": "전류·시간·길이",
      "물질 구성과 분류": "재료·원소·구조",
      "자연 세계의 시간과 공간": "관측·규모·시공간",
      "생명 시스템": "생명·건강·반응",
      "역학 시스템": "힘·운동·안정성",
      "지구시스템": "환경·기후·지구",
      "다항식의 연산": "식·구조·연산",
      "나머지정리와 인수분해": "구조 분해·조건",
      "복소수와 이차방정식": "해의 확장·방정식",
      "이차방정식과 이차함수": "그래프·변화·모델링",
      "여러 가지 방정식과 부등식": "조건·범위·판단",
      "경우의 수, 순열, 조합": "선택·배열·탐색",
      "행렬과 행렬의 연산": "자료 배열·구조 처리",
      "평면좌표와 직선의 방정식": "좌표·직선·모델링",
      "원의 방정식": "원·범위·곡선 설계",
      "도형의 이동": "좌표 변환·그래픽",
      "지식·정보 사회와 정보 문화": "정보 문화·윤리",
      "자료와 정보의 표현": "디지털 표현·부호화",
      "자료와 정보의 분석": "데이터 분석·해석",
      "추상화와 문제 분해": "문제 분해·모델링",
      "알고리즘 설계와 분석": "알고리즘·효율성",
      "프로그래밍과 자동화": "코드 구현·자동화",
      "컴퓨팅 시스템과 네트워크": "시스템·네트워크",
      "서정 갈래와 시적 표현": "시·정서·표현",
      "서사·극 갈래와 이야기 구성": "이야기·갈등·구성",
      "교술 갈래와 성찰적 표현": "관찰·성찰·설명",
      "음운 변동과 국어 규범": "언어 규칙·규범",
      "공동체 의사소통과 공감": "소통·공감·상호작용",
      "문학·독서와 주체적 수용": "독서·성찰·수용",
      "비판적 읽기와 토론": "근거·검증·토론",
      "사회적 쟁점 글쓰기와 문장 구성": "쟁점·주장·문장"
    };
    return map[concept] || "";
  }

  function getSubjectConceptEntries(subject) {
    const canonical = getCanonicalSubjectName(subject);
    const resolved = findSubjectKey(canonical) || canonical;
    let entry = engineMap?.[subject] || engineMap?.[canonical] || engineMap?.[resolved];
    if ((!entry || !entry.concepts || !Object.keys(entry.concepts || {}).length) && isInfoSubjectName(subject || canonical || resolved)) {
      ensureInfoFallbackSeeds();
      entry = engineMap?.['정보'] || INFO_FALLBACK_ENGINE_MAP;
    }
    const concepts = entry?.concepts || {};
    return Object.entries(concepts).map(([concept, value]) => ({ concept, value }));
  }

  function getIntegratedScience1PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);

    if (!majorText) {
      return ["과학의 측정과 우리 사회", "규칙성 발견과 주기율표", "기본량과 단위", "자연 세계의 시간과 공간", "물질 구성과 분류", "지구시스템", "역학 시스템", "생명 시스템"];
    }

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍)/i.test(majorText) || bucket === "it") {
      return ["과학의 측정과 우리 사회", "규칙성 발견과 주기율표", "자연 세계의 시간과 공간", "기본량과 단위", "역학 시스템", "지구시스템", "물질 구성과 분류", "생명 시스템"];
    }
    if (/(전자|전기|회로|센서|통신|반도체)/.test(majorText) || bucket === "electronic") {
      return ["과학의 측정과 우리 사회", "기본량과 단위", "역학 시스템", "규칙성 발견과 주기율표", "자연 세계의 시간과 공간", "물질 구성과 분류", "지구시스템", "생명 시스템"];
    }
    if (/(기계|자동차|로봇|항공|모빌리티)/.test(majorText) || bucket === "mechanical") {
      return ["역학 시스템", "기본량과 단위", "과학의 측정과 우리 사회", "자연 세계의 시간과 공간", "규칙성 발견과 주기율표", "물질 구성과 분류", "지구시스템", "생명 시스템"];
    }
    if (/(신소재|재료|배터리|에너지|화학공학|고분자|금속)/.test(majorText) || bucket === "materials") {
      return ["규칙성 발견과 주기율표", "물질 구성과 분류", "기본량과 단위", "과학의 측정과 우리 사회", "역학 시스템", "자연 세계의 시간과 공간", "지구시스템", "생명 시스템"];
    }
    if (/(간호|의학|보건|수의|약학|생명|바이오|의료|임상)/.test(majorText) || bucket === "bio") {
      return ["생명 시스템", "과학의 측정과 우리 사회", "물질 구성과 분류", "기본량과 단위", "규칙성 발견과 주기율표", "지구시스템", "자연 세계의 시간과 공간", "역학 시스템"];
    }
    if (/(환경|기후|지구|천문|우주|해양)/.test(majorText) || bucket === "env") {
      return ["지구시스템", "자연 세계의 시간과 공간", "과학의 측정과 우리 사회", "기본량과 단위", "물질 구성과 분류", "규칙성 발견과 주기율표", "역학 시스템", "생명 시스템"];
    }

    return ["과학의 측정과 우리 사회", "기본량과 단위", "규칙성 발견과 주기율표", "자연 세계의 시간과 공간", "물질 구성과 분류", "지구시스템", "역학 시스템", "생명 시스템"];
  }


  function getCommonMath1PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "다항식의 연산",
      "나머지정리와 인수분해",
      "복소수와 이차방정식",
      "이차방정식과 이차함수",
      "여러 가지 방정식과 부등식",
      "경우의 수, 순열, 조합",
      "행렬과 행렬의 연산"
    ];

    if (!majorText) return defaultSequence;

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test(majorText) || bucket === "it") {
      return [
        "이차방정식과 이차함수",
        "행렬과 행렬의 연산",
        "경우의 수, 순열, 조합",
        "여러 가지 방정식과 부등식",
        "다항식의 연산",
        "나머지정리와 인수분해",
        "복소수와 이차방정식"
      ];
    }
    if (/(전자|전기|회로|센서|통신|반도체|로봇)/.test(majorText) || bucket === "electronic") {
      return ["이차방정식과 이차함수", "행렬과 행렬의 연산", "복소수와 이차방정식", "여러 가지 방정식과 부등식", "경우의 수, 순열, 조합", "다항식의 연산", "나머지정리와 인수분해"];
    }
    if (/(기계|자동차|항공|모빌리티|에너지시스템)/.test(majorText) || bucket === "mechanical") {
      return ["이차방정식과 이차함수", "여러 가지 방정식과 부등식", "행렬과 행렬의 연산", "복소수와 이차방정식", "경우의 수, 순열, 조합", "다항식의 연산", "나머지정리와 인수분해"];
    }
    if (/(신소재|재료|배터리|에너지|화학공학|고분자|금속|화공)/.test(majorText) || bucket === "materials") {
      return ["여러 가지 방정식과 부등식", "이차방정식과 이차함수", "복소수와 이차방정식", "다항식의 연산", "나머지정리와 인수분해", "행렬과 행렬의 연산", "경우의 수, 순열, 조합"];
    }
    if (/(간호|의학|보건|수의|약학|생명|바이오|의료|임상)/.test(majorText) || bucket === "bio") {
      return ["경우의 수, 순열, 조합", "여러 가지 방정식과 부등식", "이차방정식과 이차함수", "다항식의 연산", "나머지정리와 인수분해", "행렬과 행렬의 연산", "복소수와 이차방정식"];
    }
    if (/(환경|기후|지구|천문|우주|해양|지리|도시)/.test(majorText) || bucket === "env") {
      return ["이차방정식과 이차함수", "여러 가지 방정식과 부등식", "경우의 수, 순열, 조합", "행렬과 행렬의 연산", "다항식의 연산", "나머지정리와 인수분해", "복소수와 이차방정식"];
    }

    return defaultSequence;
  }

  function getCommonMath2PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "평면좌표와 직선의 방정식",
      "원의 방정식",
      "도형의 이동"
    ];

    if (!majorText) return defaultSequence;

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|그래픽|시뮬레이션)/i.test(majorText) || bucket === "it") {
      return [
        "평면좌표와 직선의 방정식",
        "도형의 이동",
        "원의 방정식"
      ];
    }
    if (/(전자|전기|회로|센서|통신|반도체|로봇)/.test(majorText) || bucket === "electronic") {
      return ["원의 방정식", "평면좌표와 직선의 방정식", "도형의 이동"];
    }
    if (/(기계|자동차|항공|모빌리티|건축|토목|도시|공간|설계)/.test(majorText) || bucket === "mechanical") {
      return ["평면좌표와 직선의 방정식", "도형의 이동", "원의 방정식"];
    }
    if (/(환경|기후|지구|천문|우주|해양|지리)/.test(majorText) || bucket === "env") {
      return ["평면좌표와 직선의 방정식", "원의 방정식", "도형의 이동"];
    }

    return defaultSequence;
  }



  function getCommonKorean1PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = ["서정 갈래와 시적 표현", "서사·극 갈래와 이야기 구성", "교술 갈래와 성찰적 표현", "음운 변동과 국어 규범", "공동체 의사소통과 공감", "문학·독서와 주체적 수용", "비판적 읽기와 토론", "사회적 쟁점 글쓰기와 문장 구성"];
    if (!majorText) return defaultSequence;
    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it") return ["비판적 읽기와 토론", "사회적 쟁점 글쓰기와 문장 구성", "음운 변동과 국어 규범", "공동체 의사소통과 공감", "문학·독서와 주체적 수용", "교술 갈래와 성찰적 표현", "서사·극 갈래와 이야기 구성", "서정 갈래와 시적 표현"];
    if (/(경영|경제|행정|정치|사회|심리|미디어|교육|법|국제|언론)/.test(majorText)) return ["비판적 읽기와 토론", "사회적 쟁점 글쓰기와 문장 구성", "공동체 의사소통과 공감", "문학·독서와 주체적 수용", "교술 갈래와 성찰적 표현", "음운 변동과 국어 규범", "서사·극 갈래와 이야기 구성", "서정 갈래와 시적 표현"];
    if (/(간호|의학|보건|생명|바이오|약학|수의|의료)/.test(majorText)) return ["비판적 읽기와 토론", "사회적 쟁점 글쓰기와 문장 구성", "교술 갈래와 성찰적 표현", "공동체 의사소통과 공감", "문학·독서와 주체적 수용", "음운 변동과 국어 규범", "서정 갈래와 시적 표현", "서사·극 갈래와 이야기 구성"];
    return defaultSequence;
  }

  function getCommonKorean2PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "매체 비평과 비판적 수용",
      "공동 보고서 글쓰기와 자료 활용",
      "과학 기술과 인간·미래 사회 성찰",
      "다양한 분야 독서와 홍보 표현"
    ];
    if (!majorText) return defaultSequence;
    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|미디어|콘텐츠)/i.test(majorText) || bucket === "it") {
      return ["매체 비평과 비판적 수용", "공동 보고서 글쓰기와 자료 활용", "과학 기술과 인간·미래 사회 성찰", "다양한 분야 독서와 홍보 표현"];
    }
    if (/(경영|경제|행정|정치|사회|심리|미디어|교육|법|국제|언론|광고|홍보)/.test(majorText)) {
      return ["매체 비평과 비판적 수용", "다양한 분야 독서와 홍보 표현", "공동 보고서 글쓰기와 자료 활용", "과학 기술과 인간·미래 사회 성찰"];
    }
    if (/(간호|의학|보건|생명|바이오|약학|수의|의료|환경|기후|공학)/.test(majorText)) {
      return ["과학 기술과 인간·미래 사회 성찰", "공동 보고서 글쓰기와 자료 활용", "매체 비평과 비판적 수용", "다양한 분야 독서와 홍보 표현"];
    }
    return defaultSequence;
  }

  function getInfoPreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "지식·정보 사회와 정보 문화",
      "자료와 정보의 표현",
      "자료와 정보의 분석",
      "추상화와 문제 분해",
      "알고리즘 설계와 분석",
      "프로그래밍과 자동화",
      "컴퓨팅 시스템과 네트워크"
    ];

    if (!majorText) return defaultSequence;

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it") {
      return [
        "알고리즘 설계와 분석",
        "프로그래밍과 자동화",
        "자료와 정보의 분석",
        "추상화와 문제 분해",
        "자료와 정보의 표현",
        "컴퓨팅 시스템과 네트워크",
        "지식·정보 사회와 정보 문화"
      ];
    }
    if (/(전자|전기|회로|센서|통신|반도체|로봇|임베디드|제어)/.test(majorText) || bucket === "electronic") {
      return [
        "컴퓨팅 시스템과 네트워크",
        "프로그래밍과 자동화",
        "자료와 정보의 표현",
        "알고리즘 설계와 분석",
        "자료와 정보의 분석",
        "추상화와 문제 분해",
        "지식·정보 사회와 정보 문화"
      ];
    }
    if (/(기계|자동차|항공|모빌리티|로봇|스마트팩토리)/.test(majorText) || bucket === "mechanical") {
      return [
        "프로그래밍과 자동화",
        "추상화와 문제 분해",
        "알고리즘 설계와 분석",
        "컴퓨팅 시스템과 네트워크",
        "자료와 정보의 분석",
        "자료와 정보의 표현",
        "지식·정보 사회와 정보 문화"
      ];
    }
    if (/(경영|경제|통계|심리|사회|행정|정책|미디어|마케팅)/.test(majorText)) {
      return [
        "자료와 정보의 분석",
        "지식·정보 사회와 정보 문화",
        "자료와 정보의 표현",
        "알고리즘 설계와 분석",
        "추상화와 문제 분해",
        "프로그래밍과 자동화",
        "컴퓨팅 시스템과 네트워크"
      ];
    }
    if (/(환경|기후|지구|도시|건축|보건|간호|의학|생명|바이오)/.test(majorText) || bucket === "env" || bucket === "bio") {
      return [
        "자료와 정보의 분석",
        "추상화와 문제 분해",
        "지식·정보 사회와 정보 문화",
        "프로그래밍과 자동화",
        "알고리즘 설계와 분석",
        "자료와 정보의 표현",
        "컴퓨팅 시스템과 네트워크"
      ];
    }

    return defaultSequence;
  }


  function getIntegratedScience2PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "과학 기술 사회에서 빅데이터 활용",
      "에너지 효율과 신재생 에너지",
      "발전과 에너지원",
      "과학 기술과 미래 사회",
      "태양 에너지의 생성과 전환",
      "지구 환경 변화와 인간 생활",
      "산화와 환원",
      "물질 변화에서 에너지의 출입",
      "생물과 환경",
      "진화와 생물다양성",
      "생태계평형",
      "산과 염기",
      "지구 환경 변화",
      "과학의 유용성과 필요성",
      "과학 관련 사회적 쟁점과 과학 윤리"
    ];

    if (!majorText) return defaultSequence;

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test(majorText) || bucket === "it") {
      return [
        "과학 기술 사회에서 빅데이터 활용",
        "과학 기술과 미래 사회",
        "발전과 에너지원",
        "에너지 효율과 신재생 에너지",
        "태양 에너지의 생성과 전환",
        "과학의 유용성과 필요성",
        "과학 관련 사회적 쟁점과 과학 윤리",
        "물질 변화에서 에너지의 출입",
        "지구 환경 변화와 인간 생활",
        "산화와 환원",
        "생물과 환경",
        "생태계평형",
        "진화와 생물다양성",
        "산과 염기",
        "지구 환경 변화"
      ];
    }
    if (/(전자|전기|회로|센서|통신|반도체|로봇)/.test(majorText) || bucket === "electronic") {
      return ["발전과 에너지원", "과학 기술과 미래 사회", "에너지 효율과 신재생 에너지", "태양 에너지의 생성과 전환", "산화와 환원", "과학 기술 사회에서 빅데이터 활용", "물질 변화에서 에너지의 출입", "과학의 유용성과 필요성", "산과 염기", "지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형", "진화와 생물다양성", "지구 환경 변화", "과학 관련 사회적 쟁점과 과학 윤리"];
    }
    if (/(기계|자동차|항공|모빌리티|에너지시스템)/.test(majorText) || bucket === "mechanical") {
      return ["발전과 에너지원", "에너지 효율과 신재생 에너지", "태양 에너지의 생성과 전환", "물질 변화에서 에너지의 출입", "과학 기술과 미래 사회", "과학 기술 사회에서 빅데이터 활용", "산화와 환원", "과학의 유용성과 필요성", "지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형", "산과 염기", "진화와 생물다양성", "지구 환경 변화", "과학 관련 사회적 쟁점과 과학 윤리"];
    }
    if (/(신소재|재료|배터리|에너지|화학공학|고분자|금속|화공)/.test(majorText) || bucket === "materials") {
      return ["산화와 환원", "물질 변화에서 에너지의 출입", "발전과 에너지원", "에너지 효율과 신재생 에너지", "산과 염기", "태양 에너지의 생성과 전환", "과학 기술과 미래 사회", "과학 기술 사회에서 빅데이터 활용", "과학의 유용성과 필요성", "지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형", "진화와 생물다양성", "지구 환경 변화", "과학 관련 사회적 쟁점과 과학 윤리"];
    }
    if (/(간호|의학|보건|수의|약학|생명|바이오|의료|임상)/.test(majorText) || bucket === "bio") {
      return ["진화와 생물다양성", "생물과 환경", "생태계평형", "산과 염기", "과학 기술 사회에서 빅데이터 활용", "지구 환경 변화", "지구 환경 변화와 인간 생활", "물질 변화에서 에너지의 출입", "산화와 환원", "과학의 유용성과 필요성", "과학 관련 사회적 쟁점과 과학 윤리", "에너지 효율과 신재생 에너지", "발전과 에너지원", "과학 기술과 미래 사회", "태양 에너지의 생성과 전환"];
    }
    if (/(환경|기후|지구|천문|우주|해양|지리|도시)/.test(majorText) || bucket === "env") {
      return ["지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형", "지구 환경 변화", "에너지 효율과 신재생 에너지", "진화와 생물다양성", "발전과 에너지원", "태양 에너지의 생성과 전환", "과학 기술 사회에서 빅데이터 활용", "과학의 유용성과 필요성", "과학 관련 사회적 쟁점과 과학 윤리", "산과 염기", "산화와 환원", "물질 변화에서 에너지의 출입", "과학 기술과 미래 사회"];
    }

    return defaultSequence;
  }

  function getMappedKeywordAxisBoost(entry, axis) {
    const concept = String(entry?.concept_name || state.concept || "");
    const keyword = String(state.keyword || "");
    if (!concept || !keyword) return 0;

    const axisId = String(axis?.id || axis?.axis_id || "");
    const axisTitle = String(axis?.title || axis?.axis_title || "");
    const axisDomain = String(axis?.axisDomain || axis?.axis_domain || "");
    const keywordSignals = entry?.keyword_signals && typeof entry.keyword_signals === "object"
      ? entry.keyword_signals
      : {};
    let best = 0;

    Object.entries(keywordSignals).forEach(([keywordLike, axisScores]) => {
      if (!fuzzyIncludes(keywordLike, keyword) && !fuzzyIncludes(keyword, keywordLike)) return;
      if (typeof axisScores === "number") {
        best = Math.max(best, axisScores);
        return;
      }
      if (axisScores && typeof axisScores === "object") {
        const score = Number(axisScores[axisId] ?? axisScores[axisTitle] ?? axisScores[axisDomain] ?? 0);
        best = Math.max(best, score);
      }
    });

    const axisKeywordSignals = Array.isArray(axis?.keywordSignals)
      ? axis.keywordSignals
      : (Array.isArray(axis?.keyword_signals) ? axis.keyword_signals : []);
    axisKeywordSignals.forEach(signal => {
      const signalKeywords = Array.isArray(signal?.keywords) ? signal.keywords : [];
      if (!signalKeywords.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword))) return;
      const boost = Number(signal?.boost || 0);
      if (Number.isFinite(boost)) best = Math.max(best, boost);
    });

    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));
    let fallback = 0;

    if (fuzzyIncludes(state.subject, "통합과학1")) {
      if (/과학의 측정과 우리 사회/.test(concept)) {
        if (hit("온도 센서", "속도 측정 카메라", "전자저울", "냉난방기 가동 전후 변화", "위치별 온도 차이", "센서", "측정 도구")) {
          if (/measurement_physics_system/.test(axisId) || /물리·시스템 해석 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 46);
          if (/measurement_data_modeling/.test(axisId) || /수리·데이터 모델링 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 4);
        }
        if (hit("미세먼지 농도", "데시벨", "소음 규제")) {
          if (/measurement_environment_data/.test(axisId) || /지구·환경 데이터 해석 축/.test(axisTitle) || axisDomain === "earth_env") fallback = Math.max(fallback, 50);
          if (/measurement_data_modeling/.test(axisId) || /수리·데이터 모델링 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 4);
        }
      }

      if (/자연 세계의 시간과 공간/.test(concept)) {
        if (hit("물 분자", "수소 원자", "나트륨 이온")) {
          if (/physics_scale_analysis/.test(axisId) || /물리·규모 해석 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 52);
          if (/scale_structure_modeling/.test(axisId) || /공간·좌표 모델링 축/.test(axisTitle) || axisDomain === "engineering" || axisDomain === "data") fallback = Math.max(fallback, 8);
        }
        if (hit("관측 범위 확장", "천체", "세슘 원자 시계")) {
          if (/earth_observation_scale/.test(axisId) || /지구·우주 관측 축/.test(axisTitle) || axisDomain === "earth_env") fallback = Math.max(fallback, 34);
        }
      }

      if (/규칙성 발견과 주기율표/.test(concept)) {
        if (hit("주기성", "성질 예측", "원자 번호", "원소 배열")) {
          if (/chemistry_prediction/.test(axisId) || /화학·성질 예측 축/.test(axisTitle) || axisDomain === "chemistry") fallback = Math.max(fallback, 40);
          if (/pattern_classification_modeling/.test(axisId) || /패턴·분류 모델링 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 10);
        }
      }
    }

    if (fuzzyIncludes(state.subject, "통합과학2")) {
      if (/과학 기술 사회에서 빅데이터 활용/.test(concept)) {
        if (hit("빅데이터", "데이터", "분석", "예측", "패턴", "데이터 분석")) {
          if (/data_prediction_interpretation/.test(axisId) || /데이터 예측·해석 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 52);
          if (/info_automation_application/.test(axisId) || /정보·자동화 응용 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, 8);
        }
        if (hit("자동화", "시스템", "처리", "활용")) {
          if (/info_automation_application/.test(axisId) || /정보·자동화 응용 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, 50);
          if (/data_prediction_interpretation/.test(axisId) || /데이터 예측·해석 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 10);
        }
      }
      if (/과학 기술과 미래 사회/.test(concept)) {
        if (hit("센서", "시스템", "제어", "연결")) {
          if (/sensor_system_application/.test(axisId) || /센서·시스템 응용 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 52);
          if (/automation_future_design/.test(axisId) || /자동화·미래 설계 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 8);
        }
        if (hit("미래 기술", "자동화", "로봇", "미래 사회")) {
          if (/automation_future_design/.test(axisId) || /자동화·미래 설계 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 50);
          if (/sensor_system_application/.test(axisId) || /센서·시스템 응용 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 8);
        }
      }
      if (/발전과 에너지원/.test(concept)) {
        if (hit("발전 방식", "발전", "에너지원", "비교", "장단점")) {
          if (/power_generation_comparison/.test(axisId) || /발전 시스템 비교 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 50);
          if (/resource_social_impact/.test(axisId) || /자원·사회 영향 축/.test(axisTitle) || axisDomain === "environment") fallback = Math.max(fallback, 6);
        }
        if (hit("지속가능성", "사회·환경 영향", "환경 영향", "자원")) {
          if (/resource_social_impact/.test(axisId) || /자원·사회 영향 축/.test(axisTitle) || axisDomain === "environment") fallback = Math.max(fallback, 48);
          if (/energy_policy_choice/.test(axisId) || /에너지 선택·정책 축/.test(axisTitle) || axisDomain === "social") fallback = Math.max(fallback, 8);
        }
      }
      if (/에너지 효율과 신재생 에너지/.test(concept)) {
        if (hit("신재생 에너지", "장치", "설계", "활용")) {
          if (/engineering_design_extension/.test(axisId) || /공학 설계 확장 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 50);
          if (/efficiency_sustainability/.test(axisId) || /효율·지속가능성 축/.test(axisTitle) || axisDomain === "environment") fallback = Math.max(fallback, 8);
        }
        if (hit("에너지 효율", "효율", "절감", "지속가능성")) {
          if (/efficiency_sustainability/.test(axisId) || /효율·지속가능성 축/.test(axisTitle) || axisDomain === "environment") fallback = Math.max(fallback, 48);
          if (/engineering_design_extension/.test(axisId) || /공학 설계 확장 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 8);
        }
      }
    }


    if (fuzzyIncludes(state.subject, "공통수학2")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|그래픽|시뮬레이션)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/평면좌표와 직선의 방정식/.test(concept)) {
        if (hit("좌표", "좌표평면", "내분점", "거리 공식")) {
          if (/coordinate_geometry_interpretation/.test(axisId) || /좌표·기하 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, isItMajor ? 54 : 46);
          if (/motion_position_modeling_base/.test(axisId) || /위치·운동 모델링 기초 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 12);
        }
        if (hit("기울기", "직선의 방정식", "평행", "수직", "일치", "y=mx+n", "Ax+By+C=0")) {
          if (/coordinate_geometry_interpretation/.test(axisId) || /좌표·기하 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 50);
          if (/design_drawing_coordinate_application/.test(axisId) || /도면·설계 좌표 적용 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, isItMajor ? 22 : 14);
        }
      }
      if (/도형의 이동/.test(concept)) {
        if (hit("이동 전후 좌표", "좌표 변화", "식의 치환", "직선 이동", "원 이동")) {
          if (/coordinate_transform_graphics/.test(axisId) || /좌표 변환·그래픽 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, isItMajor ? 56 : 42);
          if (/transformation_symmetry_analysis/.test(axisId) || /변환·대칭 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 14);
        }
        if (hit("평행이동 벡터", "x축 대칭", "y축 대칭", "원점 대칭", "대칭이동")) {
          if (/transformation_symmetry_analysis/.test(axisId) || /변환·대칭 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 48);
          if (/coordinate_transform_graphics/.test(axisId) || /좌표 변환·그래픽 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, isItMajor ? 24 : 10);
        }
      }
      if (/원의 방정식/.test(concept)) {
        if (hit("반지름", "중심좌표", "원과 직선", "접선의 방정식")) {
          if (/sensor_range_curve_design/.test(axisId) || /센서 범위·곡선 설계 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, isItMajor ? 52 : 30);
          if (/circle_geometry_reasoning/.test(axisId) || /도형 관계·기하 추론 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 18);
        }
        if (hit("원의 방정식", "x²+y²=r²", "판별식", "한 점에서 만남", "두 점에서 만남", "만나지 않음")) {
          if (/circle_geometry_reasoning/.test(axisId) || /도형 관계·기하 추론 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 48);
          if (/orbit_rotation_modeling_base/.test(axisId) || /회전·궤도 모델링 기초 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 12);
        }
      }
    }


    if (fuzzyIncludes(state.subject, "공통수학1")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/이차방정식과 이차함수/.test(concept)) {
        if (hit("그래프 해석", "함수와 방정식의 관계", "최댓값", "최솟값", "꼭짓점 좌표", "축")) {
          if (isItMajor && (/math_modeling_visualization/.test(axisId) || /수리 모델링·시각화 축/.test(axisTitle) || axisDomain === "data")) fallback = Math.max(fallback, 56);
          if (/graph_change_interpretation/.test(axisId) || /그래프·변화 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, isItMajor ? 18 : 46);
          if (/physics_motion_graph_bridge/.test(axisId) || /물리 운동 그래프 연결 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 10);
        }
      }
      if (/행렬과 행렬의 연산/.test(concept)) {
        if (hit("행과 열", "자료 배열", "표 데이터", "행렬")) {
          if (/matrix_data_structure_processing/.test(axisId) || /데이터 구조·행렬 처리 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 54);
          if (/information_visualization_operation/.test(axisId) || /정보·시각화 연산 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, 12);
        }
        if (hit("행렬의 연산", "효율적 처리", "연산 규칙")) {
          if (/engineering_calculation_system/.test(axisId) || /공학 계산·시스템 표현 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 50);
          if (/matrix_data_structure_processing/.test(axisId) || /데이터 구조·행렬 처리 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 16);
        }
      }
      if (/경우의 수, 순열, 조합/.test(concept)) {
        if (hit("순열", "조합", "순서 고려", "순서 미고려", "배열")) {
          if (/algorithm_search_structure/.test(axisId) || /알고리즘·탐색 구조 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, 54);
          if (/probability_statistics_inference/.test(axisId) || /확률·통계 추론 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 12);
        }
        if (hit("경우 나누기", "계산 전략", "선택", "경우의 수")) {
          if (/probability_statistics_inference/.test(axisId) || /확률·통계 추론 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 48);
          if (/algorithm_search_structure/.test(axisId) || /알고리즘·탐색 구조 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, 14);
        }
      }
      if (/여러 가지 방정식과 부등식/.test(concept)) {
        if (hit("조건 해석", "해집합", "범위 판단")) {
          if (/condition_range_interpretation/.test(axisId) || /조건·범위 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 48);
          if (/measurement_threshold_modeling/.test(axisId) || /기준·허용범위 모델링 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 10);
        }
        if (hit("연립일차부등식", "이차부등식", "연립이차부등식")) {
          if (/optimization_decision_extension/.test(axisId) || /최적화·의사결정 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 50);
          if (/condition_range_interpretation/.test(axisId) || /조건·범위 해석 축/.test(axisTitle) || axisDomain === "math") fallback = Math.max(fallback, 12);
        }
      }
    }



    if (fuzzyIncludes(state.subject, "공통국어1") || fuzzyIncludes(state.subject, "공통국어")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/비판적 읽기와 토론/.test(concept)) {
        if (hit("근거", "타당성", "반론", "재반론", "토론", "입론", "주장", "쟁점")) {
          if (/argument_discussion/.test(axisId) || /논증·토론 축/.test(axisTitle) || axisDomain === "communication") fallback = Math.max(fallback, isItMajor ? 56 : 48);
          if (/evidence_verification_analysis/.test(axisId) || /자료 검증·쟁점 분석 축/.test(axisTitle) || axisDomain === "inquiry") fallback = Math.max(fallback, 14);
        }
        if (hit("비판적 읽기", "자료 검증", "출처", "신뢰성", "관점 비교", "해결 방안")) {
          if (/evidence_verification_analysis/.test(axisId) || /자료 검증·쟁점 분석 축/.test(axisTitle) || axisDomain === "inquiry") fallback = Math.max(fallback, isItMajor ? 54 : 46);
          if (/critical_interpretation_extension/.test(axisId) || /비판 해석 확장 축/.test(axisTitle) || axisDomain === "social") fallback = Math.max(fallback, 16);
        }
      }
      if (/사회적 쟁점 글쓰기와 문장 구성/.test(concept)) {
        if (hit("사회적 쟁점", "주장", "근거", "개요", "글쓰기", "논증")) {
          if (/argumentative_writing/.test(axisId) || /주장 글쓰기 축/.test(axisTitle) || axisDomain === "korean") fallback = Math.max(fallback, isItMajor ? 54 : 48);
          if (/public_media_expression/.test(axisId) || /공공·매체 표현 축/.test(axisTitle) || axisDomain === "media") fallback = Math.max(fallback, 14);
        }
        if (hit("문장 구성", "표현 선택", "수정", "퇴고", "문법 요소", "규범")) {
          if (/sentence_revision_editing/.test(axisId) || /문장 점검·수정 축/.test(axisTitle) || axisDomain === "communication") fallback = Math.max(fallback, isItMajor ? 52 : 46);
          if (/argumentative_writing/.test(axisId) || /주장 글쓰기 축/.test(axisTitle) || axisDomain === "korean") fallback = Math.max(fallback, 12);
        }
      }
      if (/음운 변동과 국어 규범/.test(concept)) {
        if (hit("음운", "교체", "탈락", "축약", "첨가", "발음 규칙", "국어 규범")) {
          if (/language_norm_inquiry/.test(axisId) || /언어 규범 탐구 축/.test(axisTitle) || axisDomain === "korean") fallback = Math.max(fallback, isItMajor ? 52 : 48);
          if (/accurate_expression/.test(axisId) || /정확한 표현 축/.test(axisTitle) || axisDomain === "communication") fallback = Math.max(fallback, 12);
        }
        if (hit("표준 발음", "정확한 표현", "언어생활")) {
          if (/accurate_expression/.test(axisId) || /정확한 표현 축/.test(axisTitle) || axisDomain === "communication") fallback = Math.max(fallback, 50);
          if (/language_life_application/.test(axisId) || /언어생활 적용 축/.test(axisTitle) || axisDomain === "social") fallback = Math.max(fallback, 12);
        }
      }
    }
    if (fuzzyIncludes(state.subject, "정보")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/알고리즘 설계와 분석/.test(concept)) {
        if (hit("효율성", "성능 비교", "수행 시간", "최적화")) {
          if (/algo_opt/.test(axisId) || /알고리즘 최적화 축/.test(axisTitle) || axisDomain === "algo_opt") fallback = Math.max(fallback, isItMajor ? 56 : 48);
          if (/search_sort/.test(axisId) || /탐색·정렬 구현 축/.test(axisTitle) || axisDomain === "search_sort") fallback = Math.max(fallback, 12);
        }
        if (hit("이진 탐색", "순차 탐색", "버블 정렬", "선택 정렬", "정렬", "탐색")) {
          if (/search_sort/.test(axisId) || /탐색·정렬 구현 축/.test(axisTitle) || axisDomain === "search_sort") fallback = Math.max(fallback, isItMajor ? 56 : 48);
          if (/algo_opt/.test(axisId) || /알고리즘 최적화 축/.test(axisTitle) || axisDomain === "algo_opt") fallback = Math.max(fallback, 14);
        }
      }
      if (/프로그래밍과 자동화/.test(concept)) {
        if (hit("Python", "변수 설계", "입력과 출력", "코드", "프로그래밍")) {
          if (/programming_impl/.test(axisId) || /프로그래밍 구현 축/.test(axisTitle) || axisDomain === "programming_impl") fallback = Math.max(fallback, 54);
          if (/logic_control/.test(axisId) || /논리·제어 확장 축/.test(axisTitle) || axisDomain === "logic_control") fallback = Math.max(fallback, 12);
        }
        if (hit("조건문", "반복문", "리스트", "리스트 내포")) {
          if (/logic_control/.test(axisId) || /논리·제어 확장 축/.test(axisTitle) || axisDomain === "logic_control") fallback = Math.max(fallback, 54);
          if (/programming_impl/.test(axisId) || /프로그래밍 구현 축/.test(axisTitle) || axisDomain === "programming_impl") fallback = Math.max(fallback, 12);
        }
        if (hit("자동화", "random 모듈", "turtle 그래픽")) {
          if (/automation_sim/.test(axisId) || /자동화·시뮬레이션 축/.test(axisTitle) || axisDomain === "automation_sim") fallback = Math.max(fallback, 54);
          if (/programming_impl/.test(axisId) || /프로그래밍 구현 축/.test(axisTitle) || axisDomain === "programming_impl") fallback = Math.max(fallback, 10);
        }
      }
      if (/자료와 정보의 분석/.test(concept)) {
        if (hit("자료 수집", "자료 분석", "비교 기준", "분석 과정", "컴퓨팅 도구")) {
          if (/data_visual/.test(axisId) || /데이터 수집·시각화 축/.test(axisTitle) || axisDomain === "data_visual") fallback = Math.max(fallback, 54);
          if (/data_decision/.test(axisId) || /데이터 해석·의사결정 축/.test(axisTitle) || axisDomain === "data_decision") fallback = Math.max(fallback, 12);
        }
        if (hit("정렬", "탐색", "구조화", "정보 관리")) {
          if (/database/.test(axisId) || /데이터베이스·정보구조 축/.test(axisTitle) || axisDomain === "database") fallback = Math.max(fallback, 52);
          if (/data_visual/.test(axisId) || /데이터 수집·시각화 축/.test(axisTitle) || axisDomain === "data_visual") fallback = Math.max(fallback, 10);
        }
        if (hit("의미 있는 정보", "예측", "의사결정", "빅데이터")) {
          if (/data_decision/.test(axisId) || /데이터 해석·의사결정 축/.test(axisTitle) || axisDomain === "data_decision") fallback = Math.max(fallback, 52);
          if (/data_visual/.test(axisId) || /데이터 수집·시각화 축/.test(axisTitle) || axisDomain === "data_visual") fallback = Math.max(fallback, 10);
        }
      }
      if (/추상화와 문제 분해/.test(concept)) {
        if (hit("문제 분해", "조건 분석", "현재 상태", "목표 상태", "작은 문제로 나누기")) {
          if (/problem_design/.test(axisId) || /문제 구조화·알고리즘 설계 축/.test(axisTitle) || axisDomain === "problem_design") fallback = Math.max(fallback, 52);
        }
        if (hit("모델", "모델링", "핵심 요소")) {
          if (/math_modeling/.test(axisId) || /수리 모델링 확장 축/.test(axisTitle) || axisDomain === "math_modeling") fallback = Math.max(fallback, 50);
        }
      }
      if (/자료와 정보의 표현/.test(concept)) {
        if (hit("디지털 정보", "자료 표현", "부호화", "아날로그 정보", "모스부호")) {
          if (/encoding/.test(axisId) || /디지털 표현·부호화 축/.test(axisTitle) || axisDomain === "encoding") fallback = Math.max(fallback, 52);
        }
      }
      if (/컴퓨팅 시스템과 네트워크/.test(concept)) {
        if (hit("네트워크", "공유", "의사소통", "협업", "컴퓨팅 네트워크 환경")) {
          if (/network_system/.test(axisId) || /시스템·네트워크 구조 축/.test(axisTitle) || axisDomain === "network_system") fallback = Math.max(fallback, 52);
        }
      }
    }

    return Math.max(best, fallback);
  }

  function getMajorGroupLabel() {
    return String(state.majorComparison?.group_label || "");
  }

  function getMajorTextBag() {
    return [
      getEffectiveCareerName() || "",
      inferMajorNameFromVisibleDom() || "",
      getCareerInputText() || "",
      state.majorSelectedName || "",
      ...(Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords : []),
      state.majorComparison?.group_label || "",
      state.majorComparison?.selected_focus || ""
    ].join(" ");
  }

  function getTrackReason(item) {
    const label = getMajorGroupLabel();
    const majorText = getMajorTextBag();
    if (/반도체|신소재|전자|소자/.test(majorText) && item.id === 'physics') return '반도체·소자 구조를 이해하기 쉬운 축';
    if (/반도체|신소재|전자|소자|재료|제약|화공|식품|고분자/.test(majorText) && item.id === 'chemistry') return '재료·반응·성질을 연결하기 쉬운 축';
    if (label.includes('환자 진료') && item.id === 'biology') return '인체 반응·건강 데이터를 연결하기 쉬운 축';
    if (label.includes('회복 지원') && item.id === 'biology') return '신체 기능 회복과 생명 반응을 설명하기 쉬운 축';
    if (label.includes('국제 이슈') && item.id === 'earth') return '환경·자원·지구 시스템 이슈와 연결하기 쉬운 축';
    if (label.includes('기업 운영') && item.id === 'chemistry') return '소재·제품·산업 사례를 붙이기 쉬운 축';
    if (label.includes('실험·기술 응용') && item.id === 'chemistry') return '실험·공정·응용 기술을 연결하기 쉬운 축';
    if (label.includes('기초 생명과학') && item.id === 'biology') return '생명 현상의 원리를 설명하기 쉬운 축';
    if (label.includes('의료기기') && item.id === 'physics') return '장비·센서·측정 원리를 설명하기 쉬운 축';
    if (label.includes('환경') && item.id === 'earth') return '환경·기후 변화를 바로 연결하기 쉬운 축';
    return item.easy || '';
  }

  function getPreferredConceptSequence() {
    if (state.subject === "통합과학1") {
      return getIntegratedScience1PreferredConceptSequence();
    }


    if (state.subject === "통합과학2") {
      return getIntegratedScience2PreferredConceptSequence();
    }
    if (state.subject === "공통수학1") {
      return getCommonMath1PreferredConceptSequence();
    }
    if (state.subject === "공통수학2") {
      return getCommonMath2PreferredConceptSequence();
    }
    if (state.subject === "정보") {
      return getInfoPreferredConceptSequence();
    }
    if (state.subject === "공통국어1" || state.subject === "공통국어") {
      return getCommonKorean1PreferredConceptSequence();
    }
    if (state.subject === "공통국어2") {
      return getCommonKorean2PreferredConceptSequence();
    }

    const majorText = getMajorTextBag();
    const track = getResolvedTrackId() || '';

    if (/반도체|신소재|전자|소자|회로|센서|재료/.test(majorText)) {
      if (track === 'chemistry') return ['물질 구성과 분류', '규칙성 발견과 주기율표', '과학의 측정과 우리 사회', '기본량과 단위', '역학 시스템'];
      if (track === 'physics') return ['기본량과 단위', '과학의 측정과 우리 사회', '역학 시스템', '물질 구성과 분류', '규칙성 발견과 주기율표'];
    }

    if (/간호|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|재활|의학|의료/.test(majorText)) {
      if (track === 'biology') return ['생명 시스템', '과학의 측정과 우리 사회', '기본량과 단위', '물질 구성과 분류'];
      if (track === 'physics') return ['과학의 측정과 우리 사회', '기본량과 단위', '역학 시스템', '생명 시스템'];
      if (track === 'chemistry') return ['물질 구성과 분류', '과학의 측정과 우리 사회', '생명 시스템'];
    }

    if (/생명과학|바이오|제약|화공|식품|발효|미생물/.test(majorText)) {
      if (track === 'chemistry') return ['물질 구성과 분류', '규칙성 발견과 주기율표', '생명 시스템', '과학의 측정과 우리 사회'];
      if (track === 'biology') return ['생명 시스템', '물질 구성과 분류', '과학의 측정과 우리 사회'];
    }

    if (/국제|통상|무역|경영|관광|호텔/.test(majorText)) {
      if (track === 'earth') return ['지구시스템', '과학의 측정과 우리 사회', '기본량과 단위'];
      if (track === 'chemistry') return ['과학의 측정과 우리 사회', '물질 구성과 분류', '기본량과 단위'];
    }

    if (/환경|기후|지구|해양|천문|우주/.test(majorText)) {
      if (track === 'earth') return ['지구시스템', '자연 세계의 시간과 공간', '과학의 측정과 우리 사회'];
      if (track === 'chemistry') return ['과학의 측정과 우리 사회', '물질 구성과 분류', '지구시스템'];
    }

    return [];
  }


  function getCommonKorean1PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it";
    if (isIt) {
      if (/비판적 읽기와 토론/.test(concept)) return ["근거", "타당성", "반론", "토론", "비판적 읽기", "쟁점", "주장", "입론", "재반론", "해결 방안"];
      if (/사회적 쟁점 글쓰기와 문장 구성/.test(concept)) return ["사회적 쟁점", "주장", "근거", "개요", "문장 구성", "표현 선택", "수정", "문법 요소"];
      if (/음운 변동과 국어 규범/.test(concept)) return ["음운", "교체", "탈락", "축약", "첨가", "표준 발음", "발음 규칙", "국어 규범", "정확한 표현"];
      if (/공동체 의사소통과 공감/.test(concept)) return ["의사소통", "공감", "배려", "상호작용", "협력", "소통"];
    }
    return [];
  }

  function getCommonKorean2PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|미디어|콘텐츠)/i.test(majorText) || bucket === "it";
    if (isIt) {
      if (/매체 비평과 비판적 수용/.test(concept)) return ["신뢰성", "타당성", "관점", "의도", "공정성", "표현 전략", "디지털", "온라인", "콘텐츠", "팩트체크", "자료 검증"];
      if (/공동 보고서 글쓰기와 자료 활용/.test(concept)) return ["자료 활용", "출처", "근거", "보고서 구성", "협업", "역할 분담", "인용", "표와 그래프", "자료 정리"];
      if (/과학 기술과 인간·미래 사회 성찰/.test(concept)) return ["과학 기술", "미래 사회", "인간", "윤리", "인공지능", "기술 영향", "사회 변화", "문제 해결"];
      if (/다양한 분야 독서와 홍보 표현/.test(concept)) return ["정보 전달", "독자", "홍보 문구", "핵심 메시지", "표현 전략", "카드뉴스", "콘텐츠 구성"];
    }
    return [];
  }

  function getInfoPreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/알고리즘 설계와 분석/.test(concept)) return ["효율성", "성능 비교", "이진 탐색", "정렬", "탐색", "순차 탐색", "선택 정렬", "버블 정렬", "수행 시간", "반복", "선택", "순차"];
      if (/프로그래밍과 자동화/.test(concept)) return ["Python", "변수 설계", "조건문", "반복문", "입력과 출력", "리스트", "리스트 내포", "random 모듈", "turtle 그래픽", "자동화"];
      if (/자료와 정보의 분석/.test(concept)) return ["자료 분석", "자료 수집", "비교 기준", "정렬", "탐색", "의미 있는 정보", "컴퓨팅 도구", "분석 과정"];
      if (/추상화와 문제 분해/.test(concept)) return ["문제 분해", "조건 분석", "현재 상태", "목표 상태", "모델링", "작은 문제로 나누기", "불필요한 요소 제거"];
      if (/자료와 정보의 표현/.test(concept)) return ["디지털 정보", "자료 표현", "부호화", "아날로그 정보", "모스부호", "표현 방식 선택"];
      if (/컴퓨팅 시스템과 네트워크/.test(concept)) return ["네트워크", "공유", "의사소통", "협업", "컴퓨팅 네트워크 환경", "네트워크 기반 문제 해결"];
      if (/지식·정보 사회와 정보 문화/.test(concept)) return ["정보 윤리", "정보 보호", "디지털 시민성", "정보 기술 활용", "공유와 협업", "디지털 의사소통"];
    }

    if (/(전자|전기|회로|센서|통신|반도체|로봇|임베디드|제어)/.test(majorText) || bucket === "electronic") {
      if (/컴퓨팅 시스템과 네트워크/.test(concept)) return ["네트워크", "컴퓨팅 네트워크 환경", "공유", "의사소통", "협업"];
      if (/프로그래밍과 자동화/.test(concept)) return ["자동화", "조건문", "반복문", "입력과 출력", "변수 설계", "Python"];
      if (/자료와 정보의 표현/.test(concept)) return ["디지털 정보", "부호화", "자료 표현", "표현 방식 선택"];
    }

    return [];
  }


  function getCommonMath1PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/이차방정식과 이차함수/.test(concept)) return ["그래프 해석", "함수와 방정식의 관계", "최댓값", "최솟값", "꼭짓점 좌표", "축", "이차함수", "이차방정식"];
      if (/행렬과 행렬의 연산/.test(concept)) return ["행과 열", "자료 배열", "표 데이터", "행렬", "행렬의 연산", "효율적 처리", "연산 규칙"];
      if (/경우의 수, 순열, 조합/.test(concept)) return ["순열", "조합", "순서 고려", "순서 미고려", "경우 나누기", "계산 전략", "선택", "배열"];
      if (/여러 가지 방정식과 부등식/.test(concept)) return ["조건 해석", "해집합", "범위 판단", "연립일차부등식", "이차부등식", "연립이차부등식"];
      if (/다항식의 연산/.test(concept)) return ["전개", "분배법칙", "정리", "곱셈", "나눗셈", "몫", "나머지", "동류항"];
      if (/나머지정리와 인수분해/.test(concept)) return ["구조 분해", "인수", "인수분해", "다항식의 나눗셈", "나머지", "해의 조건", "항등식의 성질"];
      if (/복소수와 이차방정식/.test(concept)) return ["판별식", "해의 존재", "방정식 해석", "근", "계수", "복소수", "허수", "허근"];
    }

    if (/(전자|전기|반도체|기계|로봇|공학|환경|기후|지구)/.test(majorText)) {
      if (/이차방정식과 이차함수/.test(concept)) return ["그래프 해석", "최댓값", "최솟값", "꼭짓점 좌표", "축", "함수와 방정식의 관계"];
      if (/여러 가지 방정식과 부등식/.test(concept)) return ["조건 해석", "범위 판단", "해집합", "이차부등식", "연립일차부등식"];
      if (/행렬과 행렬의 연산/.test(concept)) return ["행과 열", "자료 배열", "표 데이터", "연산 규칙", "효율적 처리"];
    }

    return [];
  }


  function getCommonMath2PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|그래픽|시뮬레이션)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/평면좌표와 직선의 방정식/.test(concept)) return ["좌표", "기울기", "거리 공식", "직선의 방정식", "평행", "수직", "내분점", "좌표평면", "Ax+By+C=0", "y=mx+n"];
      if (/도형의 이동/.test(concept)) return ["이동 전후 좌표", "좌표 변화", "식의 치환", "평행이동 벡터", "직선 이동", "원 이동", "x축 대칭", "y축 대칭", "원점 대칭"];
      if (/원의 방정식/.test(concept)) return ["중심좌표", "반지름", "원과 직선", "접선의 방정식", "원의 방정식", "판별식", "기울기", "x²+y²=r²"];
    }

    if (/(전자|전기|회로|센서|통신|반도체|로봇)/.test(majorText) || bucket === "electronic") {
      if (/원의 방정식/.test(concept)) return ["반지름", "중심좌표", "원과 직선", "접선의 방정식", "기울기", "판별식"];
      if (/평면좌표와 직선의 방정식/.test(concept)) return ["좌표", "거리 공식", "기울기", "평행", "수직", "직선의 방정식"];
      if (/도형의 이동/.test(concept)) return ["이동 전후 좌표", "좌표 변화", "직선 이동", "원 이동", "평행이동 벡터"];
    }

    return [];
  }



  function getIntegratedScience2PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test(majorText) || bucket === "it";
    if (isIt) {
      if (/과학 기술 사회에서 빅데이터 활용/.test(concept)) return ["빅데이터", "데이터", "분석", "예측", "패턴", "자동화", "시스템", "처리", "활용", "사회 문제"];
      if (/과학 기술과 미래 사회/.test(concept)) return ["미래 기술", "자동화", "로봇", "센서", "시스템", "제어", "연결", "기술 영향", "사회 변화"];
      if (/발전과 에너지원/.test(concept)) return ["발전 방식", "비교", "장단점", "에너지원", "발전", "지속가능성", "사회·환경 영향", "환경 영향"];
      if (/에너지 효율과 신재생 에너지/.test(concept)) return ["에너지 효율", "효율", "신재생 에너지", "장치", "설계", "절감", "지속가능성", "활용"];
      if (/태양 에너지의 생성과 전환/.test(concept)) return ["전환", "활용 원리", "태양광", "장치", "복사", "에너지 흐름", "태양 에너지"];
    }
    if (/(환경|기후|지구|해양|도시)/.test(majorText) || bucket === "env") {
      if (/지구 환경 변화와 인간 생활/.test(concept)) return ["기후 변화", "환경 재해", "인간 생활", "대응 전략", "사회적 영향", "정책"];
      if (/생물과 환경/.test(concept)) return ["환경 요인", "자료 해석", "조건 비교", "그래프", "생태계", "서식지"];
      if (/생태계평형/.test(concept)) return ["생태계평형", "안정성", "변화 요인", "회복", "교란", "대응"];
    }
    if (/(간호|의학|보건|생명|바이오|수의|약학)/.test(majorText) || bucket === "bio") {
      if (/진화와 생물다양성/.test(concept)) return ["생물다양성", "진화", "적응", "변이", "보전", "서식지"];
      if (/생물과 환경/.test(concept)) return ["상호작용", "생물과 환경", "개체군", "군집", "환경 요인"];
      if (/생태계평형/.test(concept)) return ["생태계평형", "먹이 관계", "물질 순환", "안정성", "회복"];
      if (/산과 염기/.test(concept)) return ["pH", "산", "염기", "중화", "생활 화학", "산성·염기성"];
    }
    if (/(신소재|재료|배터리|화학공학|고분자|금속|반도체)/.test(majorText) || bucket === "materials") {
      if (/산화와 환원/.test(concept)) return ["전자 이동", "산화", "환원", "산화수", "부식", "부식 방지", "산화·환원 활용"];
      if (/물질 변화에서 에너지의 출입/.test(concept)) return ["에너지 출입", "발열", "흡열", "온도 변화", "효율 분석", "생활 장치 원리"];
      if (/산과 염기/.test(concept)) return ["pH", "중화", "지시약", "산", "염기", "환경 정화"];
    }
    return [];
  }

  function getPreferredKeywordSequence() {
    if (state.subject === "공통수학1") {
      const cm1Preferred = getCommonMath1PreferredKeywordSequence();
      if (cm1Preferred.length) return cm1Preferred;
    }
    if (state.subject === "공통수학2") {
      const cm2Preferred = getCommonMath2PreferredKeywordSequence();
      if (cm2Preferred.length) return cm2Preferred;
    }
    if (state.subject === "공통국어1" || state.subject === "공통국어") {
      const ck1Preferred = getCommonKorean1PreferredKeywordSequence();
      if (ck1Preferred.length) return ck1Preferred;
    }
    if (state.subject === "공통국어2") {
      const ck2Preferred = getCommonKorean2PreferredKeywordSequence();
      if (ck2Preferred.length) return ck2Preferred;
    }
    if (state.subject === "정보") {
      const infoPreferred = getInfoPreferredKeywordSequence();
      if (infoPreferred.length) return infoPreferred;
    }
    if (state.subject === "통합과학2") {
      const is2Preferred = getIntegratedScience2PreferredKeywordSequence();
      if (is2Preferred.length) return is2Preferred;
    }
    const majorText = getMajorTextBag();
    const track = getResolvedTrackId() || '';
    const concept = state.concept || '';
    if (/반도체|신소재|전자|소자|회로|센서|재료/.test(majorText)) {
      if (track === 'chemistry') {
        if (/물질 구성과 분류/.test(concept)) return ['원소', '원자', '분자', '이온', '물질 구성', '분류 기준', '금속', '비금속', '산화', '환원', '성질 비교'];
        if (/규칙성 발견과 주기율표/.test(concept)) return ['원자 번호', '주기율표', '원소 배열', '성질 예측', '금속', '비금속', '주기성', '족 구조', '규칙성'];
        if (/과학의 측정과 우리 사회/.test(concept)) return ['측정', '측정 표준', '정밀 측정', '센서', '디지털 데이터', '데이터 분석', '그래프 해석', '측정 도구', '오차', '단위', '수치 비교', '온도 센서'];
        return ['원소', '원자', '분자', '이온', '물질 구성', '분류 기준', '원자 번호', '주기율표', '원소 배열', '성질 예측', '재료 성질', '구조와 성질의 관계'];
      }
      if (track === 'physics') {
        if (/기본량과 단위|과학의 측정과 우리 사회/.test(concept)) return ['측정', '측정 표준', '정밀 측정', '센서', '전류', '전압', '시간', '길이', '질량', '단위', '디지털 정보', '데이터 분석'];
        return ['전류', '전압', '시간', '길이', '질량', '힘', '센서', '측정', '측정 표준', '정밀 측정', '디지털 정보', '구조 안정성'];
      }
    }
    if (/간호|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|재활|의학|의료/.test(majorText)) {
      if (track === 'biology') return ['생명 시스템', '항상성', '조절', '반응', '내부 환경 유지', '생체 데이터', '건강 측정'];
      if (track === 'physics') return ['측정', '센서', '측정 표준', '기본량', '유도량', '시간', '길이', '정밀 측정', '데이터 분석'];
    }
    if (/생명과학|바이오|제약|화공|식품|발효|미생물/.test(majorText)) {
      if (track === 'chemistry') {
        if (/물질 구성과 분류/.test(concept)) return ['원소', '분자', '이온', '물질 구성', '분류 기준', '구조와 성질의 관계', '재료 성질'];
        if (/규칙성 발견과 주기율표/.test(concept)) return ['원자 번호', '주기율표', '원소 배열', '성질 예측', '주기성', '족 구조'];
        return ['원소', '분자', '이온', '물질 구성', '분류 기준', '재료 성질', '구조와 성질의 관계'];
      }
      if (track === 'biology') return ['생명 시스템', '항상성', '조절', '반응', '생체 데이터'];
    }
    return [];
  }

  function getKeywordPriority(keyword, entry) {
    const majorText = getMajorTextBag();
    const track = getResolvedTrackId() || '';
    const concept = state.concept || '';
    const text = `${keyword} ${(entry?.unit || '')} ${concept}`;
    let score = 0;

    if (state.subject === "공통수학2") {
      if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|그래픽|시뮬레이션)/i.test(majorText)) {
        if (/평면좌표와 직선의 방정식/.test(concept) && /좌표|좌표평면|기울기|직선의 방정식|평행|수직|내분점|거리 공식|y=mx\+n|Ax\+By\+C=0/.test(text)) score += 28;
        if (/도형의 이동/.test(concept) && /이동 전후 좌표|좌표 변화|식의 치환|평행이동 벡터|직선 이동|원 이동|x축 대칭|y축 대칭|원점 대칭/.test(text)) score += 30;
        if (/원의 방정식/.test(concept) && /중심좌표|반지름|원과 직선|접선의 방정식|원의 방정식|판별식|x²\+y²=r²/.test(text)) score += 24;
      }
    }

    if (state.subject === "공통수학1") {
      if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test(majorText)) {
        if (/이차방정식과 이차함수/.test(concept) && /그래프 해석|함수와 방정식의 관계|최댓값|최솟값|꼭짓점 좌표|축/.test(text)) score += 26;
        if (/행렬과 행렬의 연산/.test(concept) && /행과 열|자료 배열|표 데이터|행렬|행렬의 연산|효율적 처리|연산 규칙/.test(text)) score += 28;
        if (/경우의 수, 순열, 조합/.test(concept) && /순열|조합|순서 고려|순서 미고려|경우 나누기|계산 전략|선택|배열/.test(text)) score += 26;
        if (/여러 가지 방정식과 부등식/.test(concept) && /조건 해석|해집합|범위 판단|연립일차부등식|이차부등식|연립이차부등식/.test(text)) score += 20;
      }
    }

    if (state.subject === "통합과학2") {
      if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계)/i.test(majorText)) {
        if (/과학 기술 사회에서 빅데이터 활용/.test(concept) && /빅데이터|데이터|분석|예측|패턴|자동화|시스템|처리|활용/.test(text)) score += 26;
        if (/과학 기술과 미래 사회/.test(concept) && /미래 기술|자동화|로봇|센서|시스템|제어|연결/.test(text)) score += 24;
        if (/발전과 에너지원/.test(concept) && /발전 방식|비교|장단점|에너지원|발전|지속가능성/.test(text)) score += 20;
        if (/에너지 효율과 신재생 에너지/.test(concept) && /에너지 효율|효율|신재생 에너지|장치|설계|절감|지속가능성/.test(text)) score += 20;
      }
    }

    if (/반도체|신소재|전자|소자|회로|센서|재료/.test(majorText)) {
      if (track === 'chemistry' && /과학의 측정과 우리 사회/.test(concept)) {
        if (/측정|센서|표준|정밀|단위|데이터|그래프|오차|전자저울|온도|수치/.test(text)) score += 28;
        if (/미세먼지|데시벨|소음|난방|규제|실린더|부피 읽기/.test(text)) score -= 28;
      }
      if (track === 'chemistry' && /규칙성 발견과 주기율표/.test(concept)) {
        if (/원자 번호|주기율표|원소 배열|성질 예측|금속|비금속|족|주기성|규칙성/.test(text)) score += 24;
        if (/멘델레예프|과학사|표 구성|모델 형성/.test(text)) score += 8;
      }
      if (track === 'chemistry' && /물질 구성과 분류/.test(concept)) {
        if (/원소|원자|분자|이온|물질 구성|분류 기준|금속|비금속|산화|환원|성질 비교/.test(text)) score += 24;
      }
      if (track === 'physics' && /기본량과 단위|과학의 측정과 우리 사회/.test(concept)) {
        if (/측정|센서|전류|전압|정밀|표준|단위|데이터|그래프|오차/.test(text)) score += 24;
        if (/미세먼지|데시벨|소음|난방/.test(text)) score -= 20;
      }
    }

    if (/간호|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|재활|의학|의료/.test(majorText)) {
      if (track === 'physics' && /과학의 측정과 우리 사회|기본량과 단위/.test(concept)) {
        if (/측정|센서|표준|데이터|정밀|기본량|유도량/.test(text)) score += 18;
        if (/데시벨|난방|미세먼지/.test(text)) score -= 12;
      }
      if (track === 'biology' && /생명 시스템/.test(concept)) {
        if (/항상성|조절|반응|내부 환경|생체 데이터|건강/.test(text)) score += 18;
      }
    }

    if (/생명과학|바이오|제약|화공|식품|발효|미생물/.test(majorText)) {
      if (track === 'chemistry' && /물질 구성과 분류|규칙성 발견과 주기율표/.test(concept)) {
        if (/원소|분자|이온|주기율표|원자 번호|구조와 성질|재료 성질/.test(text)) score += 18;
      }
      if (track === 'biology' && /생명 시스템/.test(concept)) {
        if (/항상성|조절|반응|생체 데이터|세포/.test(text)) score += 18;
      }
    }

    return score;
  }

  function getAutoTrackDetail() {
    const options = getTrackOptions();
    return options[0] || null;
  }

  function detectCareerBucket(career) {
    const text = String(career || "");
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|고분자|금속)/.test(text)) return "materials";
    if (/(기계|자동차|로봇|항공|모빌리티)/.test(text)) return "mechanical";
    if (/(전기|전자|회로|센서|통신)/.test(text)) return "electronic";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터|보안|정보|통계)/i.test(text)) return "it";
    if (/(간호|의학|의예|치의|약학|보건|수의|생명|바이오|의료)/.test(text)) return "bio";
    if (/(환경|기후|지구|우주|천문|해양|지리)/.test(text)) return "env";
    return "default";
  }

  function getCareerProfileKey(career) {
    const bucket = detectCareerBucket(career);
    const map = {
      materials: "재료공학",
      mechanical: "기계공학",
      electronic: "전자공학",
      it: "정보",
      bio: "생명과학 탐구",
      env: "_default",
      default: "_default"
    };
    return map[bucket] || "_default";
  }

  function scoreConcept(concept, entry) {
    const career = getEffectiveCareerName() || state.career || "";
    const bucket = detectCareerBucket(career);
    const track = getResolvedTrackId() || "";
    const majorText = getMajorTextBag();
    const preferred = getPreferredConceptSequence();
    const textBag = [
      concept,
      entry?.unit || "",
      ...(entry?.micro_keywords || []),
      ...(entry?.linked_career_bridge || []),
      ...(entry?.core_concepts || [])
    ].join(" ");

    const bioStrong = /(세포|항상성|생명 시스템|생명 유지|생체 데이터|건강 측정|자극 반응|내부 환경)/.test(textBag);
    const mechStrong = /(역학 시스템|구조 안정성|하중 전달|진동 제어|운동|힘|전류|전압|센서|단위|측정|구조물|내진 설계)/.test(textBag);
    const elecStrong = /(전류|전압|전기|전자|회로|센서|디지털 정보|측정 도구|정밀 측정)/.test(textBag);
    const dataStrong = /(데이터 분석|그래프 해석|정량 분석|측정값 비교|디지털 데이터|표준|자료)/.test(textBag);
    const envStrong = /(지구시스템|지구 시스템|천체|대기권|수권|지구계|우주|기후|환경 측정|지구과학 탐구|위성|관측)/.test(textBag);
    const chemStrong = /(물질 구성|물질 분류|원소 배열|주기율|산화|염기|결합|분류 기준|금속|이온|분자|재료 변화|원소|자연에 존재하는 원소)/.test(textBag);
    const scaleStrong = /(시간 규모|공간 규모|미시 세계|거시 세계|관측 범위 확장|정밀 측정)/.test(textBag);

    const hasBio = bioStrong;
    const hasMech = mechStrong || dataStrong;
    const hasElec = elecStrong || dataStrong;
    const hasData = dataStrong;
    const hasEnv = envStrong;
    const hasChem = chemStrong;

    let score = 0;
    const reasons = [];

    if (bucket === "materials") {
      if (/(물질|규칙성|원소|주기율|측정|단위|역학|구조|안정성|에너지|재료)/.test(textBag)) { score += 16; reasons.push("진로 연결"); }
      if (hasBio && !hasMech && !hasChem) score -= 26;
      if (scaleStrong && !hasChem && !hasElec && !hasMech) score -= 16;
    }
    if (bucket === "mechanical") {
      if (hasMech) { score += 16; reasons.push("진로 연결"); }
      if (hasBio && !hasMech) score -= 28;
      if (scaleStrong && !hasMech) score -= 10;
    }
    if (bucket === "electronic" || bucket === "it") {
      if (hasElec || hasData) { score += 15; reasons.push("진로 연결"); }
      if (hasBio && !hasElec && !hasData) score -= 22;
      if (scaleStrong && !hasElec && !hasData) score -= 10;
    }
    if (bucket === "bio") {
      if (hasBio) { score += 16; reasons.push("진로 연결"); }
      if (hasMech && !hasBio) score -= 10;
    }
    if (bucket === "env") {
      if (hasEnv) { score += 16; reasons.push("진로 연결"); }
      if (scaleStrong) score += 8;
    }

    if (track === "physics") {
      if (hasMech || hasElec || hasData) { score += 14; reasons.push("물리 연계 추천"); }
      if (hasBio && !hasMech) score -= 12;
      if (/반도체|신소재|전자|소자/.test(majorText) && /기본량과 단위|과학의 측정과 우리 사회|역학 시스템/.test(concept)) score += 18;
      if (/반도체|신소재|전자|소자/.test(majorText) && /자연 세계의 시간과 공간/.test(concept)) score -= 18;
    }
    if (track === "chemistry") {
      if (hasChem) { score += 14; reasons.push("화학 연계 추천"); }
      if (hasBio && !hasChem) score -= 10;
      if (/반도체|신소재|전자|소자|재료/.test(majorText) && /물질 구성과 분류|규칙성 발견과 주기율표|과학의 측정과 우리 사회/.test(concept)) score += 18;
      if (/반도체|신소재|전자|소자|재료/.test(majorText) && /자연 세계의 시간과 공간|생명 시스템/.test(concept)) score -= 18;
      if (/제약|화공|식품|발효|미생물/.test(majorText) && /물질 구성과 분류|규칙성 발견과 주기율표|생명 시스템/.test(concept)) score += 10;
    }
    if (track === "biology") {
      if (hasBio) { score += 14; reasons.push("생명과학 연계 추천"); }
      if ((hasMech || hasChem) && !hasBio) score -= 8;
      if (/간호|보건관리|임상병리|의학|의료|생명|바이오/.test(majorText) && /생명 시스템|과학의 측정과 우리 사회/.test(concept)) score += 12;
    }
    if (track === "earth") {
      if (hasEnv) { score += 22; reasons.push("지구과학 연계 추천"); }
      if (hasBio && !hasEnv) score -= 18;
      if (hasChem && !hasEnv) score -= 10;
      if (hasMech && !hasEnv) score -= 8;
      if (/국제|환경|기후|지구|우주/.test(majorText) && /지구시스템|자연 세계의 시간과 공간|과학의 측정과 우리 사회/.test(concept)) score += 12;
    }

    if ((entry?.linked_career_bridge || []).some(v => fuzzyIncludes(v, career))) {
      score += 10;
      reasons.push("진로 브리지 일치");
    }

    const prefIndex = preferred.indexOf(concept);
    if (prefIndex >= 0) {
      score += 30 - (prefIndex * 4);
      reasons.unshift("전공 맞춤 추천");
    }

    const profile = topicMatrix?.careerProfiles?.[getCareerProfileKey(career)];
    if (profile && Array.isArray(profile.categories)) {
      const combined = textBag;
      if (profile.categories.some(cat => fuzzyIncludes(combined, cat))) score += 6;
    }

    return { score, reasons: uniq(reasons) };
  }

  function getRankedConcepts() {
    return getSubjectConceptEntries(state.subject)
      .map(({ concept, value }) => ({ concept, value, ...scoreConcept(concept, value) }))
      .sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept, 'ko'));
  }

  function getOrderedConceptsForAll(ranked) {
    if (!Array.isArray(ranked) || !ranked.length) return [];
    const preferred = getPreferredConceptSequence();
    const preferredItems = preferred.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
    const others = ranked.filter(item => !preferred.includes(item.concept));
    return uniq([...preferredItems, ...others]);
  }

  function getPrimaryConcepts(ranked) {
    if (!Array.isArray(ranked) || !ranked.length) return [];
    const preferred = getPreferredConceptSequence();

    if (state.subject === "통합과학1" || state.subject === "통합과학2" || state.subject === "공통수학1" || state.subject === "공통수학2" || state.subject === "정보" || state.subject === "공통국어1" || state.subject === "공통국어2" || state.subject === "공통국어") {
      return getOrderedConceptsForAll(ranked).slice(0, 3);
    }

    const topScore = ranked[0]?.score ?? 0;
    let filtered = ranked.filter(item => item.score >= topScore - 12 && item.score > -18);

    if (preferred.length) {
      const preferredItems = preferred.map(name => filtered.find(item => item.concept === name)).filter(Boolean);
      const others = filtered.filter(item => !preferred.includes(item.concept));
      filtered = [...preferredItems, ...others];
    }

    if (state.linkTrack === "earth") {
      const envFirst = filtered.filter(item => /(지구|천체|대기|수권|우주|기후|관측)/.test(item.concept + ' ' + ((item.value?.core_concepts || []).join(' ')) + ' ' + ((item.value?.micro_keywords || []).join(' '))));
      const others = filtered.filter(item => !envFirst.includes(item));
      filtered = [...envFirst, ...others];
    }

    if (filtered.length < 3) {
      const fallback = preferred.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !fallback.includes(item));
      filtered = [...fallback, ...others];
    }
    return uniq(filtered).slice(0, 3);
  }

  function getDisplayConcepts(ranked) {
    if (!Array.isArray(ranked) || !ranked.length) return [];
    return state.showAllConcepts ? getOrderedConceptsForAll(ranked) : getPrimaryConcepts(ranked);
  }

  function getConceptEntry() {
    if (!state.subject || !state.concept) return null;
    return engineMap?.[state.subject]?.concepts?.[state.concept] || null;
  }

  function getKeywordList(entry) {
    const base = uniq([...(entry?.micro_keywords || []), ...(entry?.core_concepts || [])]);
    const preferred = getPreferredKeywordSequence();
    const preferredIndex = new Map(preferred.map((item, idx) => [item, idx]));
    return base
      .map((keyword, index) => ({
        keyword,
        index,
        preferredScore: preferredIndex.has(keyword) ? (1000 - preferredIndex.get(keyword) * 10) : 0,
        customScore: getKeywordPriority(keyword, entry)
      }))
      .sort((a, b) => (b.preferredScore + b.customScore) - (a.preferredScore + a.customScore) || a.index - b.index)
      .map(item => item.keyword);
  }

  function isStepEnabled(step) {
    if (step === 1) return true;
    if (step === 2) return !!state.subject;
    if (step === 3) return !!state.subject;
    if (step === 4) return isStepEnabled(3) && !!state.concept && !!state.keyword;
    if (step === 5) return isStepEnabled(4) && !!state.linkTrack;
    if (step === 6) return isStepEnabled(5) && !!state.selectedBook;
    if (step === 7) return isStepEnabled(6) && !!state.reportMode;
    if (step === 8) return isStepEnabled(7) && !!state.reportView;
    return false;
  }

  function renderAll() {
    syncMajorBridgeState();
    hardSyncCareerFromDom();
    renderStatus();
    renderTrackArea();
    renderConceptArea();
    renderBookArea();
    renderModeArea();
    renderViewArea();
    renderReportLineArea();
    renderSelectionSummary();
    applyLocks();
    syncOutputFields();
  }

  function renderStatus() {
    const subjectEl = $("engineSubjectSummary");
    const careerEl = $("engineCareerSummary");
    const progressEl = $("engineProgressSummary");
    if (subjectEl) subjectEl.textContent = state.subject || "선택 전";
    const effectiveCareerForStatus = getEffectiveCareerName();
    if (effectiveCareerForStatus) state.career = effectiveCareerForStatus;
    if (careerEl) careerEl.textContent = effectiveCareerForStatus || "입력 전";

    let progress = "교과 개념 선택 대기";
    if (state.subject && !state.concept) progress = "교과 개념 선택 중";
    if (state.concept && !state.keyword) progress = "핵심 키워드 선택 중";
    if (state.keyword && !state.linkTrack) progress = "후속 연계축 선택 중";
    if (state.linkTrack && !state.selectedBook) progress = "도서 선택 대기";
    if (state.selectedBook && !state.reportMode) progress = "보고서 방식 선택 대기";
    if (state.reportMode && !state.reportView) progress = "보고서 관점 선택 대기";
    if (state.reportView && !state.reportLine) progress = "보고서 라인 선택 대기";
    if (state.reportLine) progress = "MINI 전달 데이터 준비 완료";
    if (progressEl) progressEl.textContent = progress;
  }

  function renderTrackArea() {
    const el = $("engineTrackArea");
    if (!el) return;
    if (!isStepEnabled(4)) {
      el.innerHTML = `<div class="engine-empty">먼저 현재 과목에서 출발할 교과 개념과 핵심 키워드를 고르면, 그 개념이 이어지는 후속 과목 축이 열립니다.</div>`;
      return;
    }
    const options = getTrackOptions();
    if (!options.length) {
      el.innerHTML = `<div class="engine-empty">현재 선택한 교과 개념과 키워드에 연결된 후속 과목 축이 아직 준비되지 않았습니다.</div>`;
      return;
    }
    const recommended = options[0];
    const autoHint = recommended?.reason || recommended?.easy || '';
    const guide = state.career
      ? `먼저 <strong>${escapeHtml(state.concept || '현재 교과 개념')}</strong>이 어디로 이어지는지 보고, <strong>${escapeHtml(state.career)}</strong> 입력은 그 축의 우선순위만 조정합니다.`
      : `지금은 <strong>${escapeHtml(state.concept || '현재 교과 개념')}</strong>에서 갈 수 있는 종단 연결을 먼저 펼쳐 보여줍니다. 학과를 입력하면 이 축들의 우선순위가 바뀝니다.`;
    el.innerHTML = `
      <div class="engine-help">${guide}</div>
      ${autoHint ? `<div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:700;">${escapeHtml(autoHint)}</div>` : ''}
      <div class="engine-track-grid">${options.map((item, index) => `
        <button type="button" class="engine-track-card ${state.linkTrack === item.id ? "is-active" : ""}" data-track="${escapeHtml(item.id)}">
          <div class="engine-track-top">
            <div class="engine-track-title">${escapeHtml(item.title)} ${index === 0 ? '<span class="engine-mini-tag" style="margin-left:6px;">1순위</span>' : ''} ${item.relationLabel ? `<span class="engine-mini-tag" style="margin-left:6px;">${escapeHtml(item.relationLabel)}</span>` : ''}</div>
            <div class="engine-track-short">${escapeHtml(item.short)}</div>
          </div>
          <div class="engine-track-next">연결 과목: ${escapeHtml(item.nextSubject || "-")}</div>
          <div class="engine-track-desc">${escapeHtml(item.desc || "")}</div>
          ${Array.isArray(item.activityExamples) && item.activityExamples.length ? `<div class="engine-track-desc" style="margin-top:6px;">활동 예시: ${escapeHtml(item.activityExamples.slice(0,2).join(', '))}</div>` : ''}
          <div class="engine-track-desc" style="margin-top:6px; color:#275fe8; font-weight:700;">${escapeHtml(item.reason || item.easy || "")}</div>
        </button>
      `).join("")}</div>
      <div class="engine-auto-row">
        <button type="button" class="engine-auto-btn" data-action="auto-track">잘 모르겠어요 → 대표 종단축 자동 선택</button>
      </div>
    `;
  }

  function renderConceptArea() {
    const conceptWrap = $("engineConceptCards");
    const keywordWrap = $("engineKeywordButtons");
    if (!conceptWrap || !keywordWrap) return;

    if (!isStepEnabled(3)) {
      conceptWrap.innerHTML = `<div class="engine-empty">먼저 과목을 선택해야 추천 교과 개념이 열립니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">교과 개념을 먼저 고르면 해당 개념의 핵심 키워드가 열립니다.</div>`;
      return;
    }

    const ranked = getRankedConcepts();
    const primaryConcepts = getPrimaryConcepts(ranked);
    const displayConcepts = getDisplayConcepts(ranked);
    const allConcepts = getOrderedConceptsForAll(ranked);
    const primaryConceptNames = new Set(primaryConcepts.map(item => item.concept));
    const canShowAllConcepts = allConcepts.length > primaryConcepts.length;
    if (!displayConcepts.length) {
      conceptWrap.innerHTML = `<div class="engine-empty">등록된 교과 개념 데이터가 없습니다.</div>`;
      keywordWrap.innerHTML = `<div class="engine-empty">등록된 키워드 데이터가 없습니다.</div>`;
      return;
    }

    const conceptToggleHtml = canShowAllConcepts ? `
      <div class="engine-concept-toggle-row">
        <div class="engine-concept-toggle-help">
          ${state.showAllConcepts
            ? `전체 교과 개념 ${allConcepts.length}개를 펼친 상태입니다. 추천 개념 외에도 학생이 원하는 개념을 직접 선택할 수 있습니다.`
            : `현재는 학과 기준 추천 개념 3개만 먼저 보여줍니다. 다른 개념으로 탐구하고 싶으면 전체 개념을 펼쳐서 선택하면 됩니다.`}
        </div>
        <button type="button" class="engine-concept-toggle-btn" data-action="concept-display-toggle">
          ${state.showAllConcepts ? "추천 개념만 보기" : `다른 교과 개념 보기 (${allConcepts.length}개)`}
        </button>
      </div>
    ` : "";

    conceptWrap.innerHTML = `<div class="engine-concept-grid">${displayConcepts.map(item => {
      const tags = getKeywordList(item.value).slice(0, 4).map(tag => `<span class="engine-mini-tag">${escapeHtml(tag)}</span>`).join("");
      const why = item.reasons[0] || "추천 개념";
      const alias = getConceptFriendlyLabel(item.concept);
      const isPrimary = primaryConceptNames.has(item.concept);
      return `
        <button type="button" class="engine-concept-card ${state.concept === item.concept ? "is-active" : ""} ${isPrimary ? "" : "is-secondary"}" data-concept="${escapeHtml(item.concept)}">
          <div class="engine-concept-name">${escapeHtml(item.concept)} ${state.showAllConcepts ? `<span class="engine-mini-tag" style="margin-left:6px;">${isPrimary ? "추천" : "직접 선택"}</span>` : ""}</div>
          ${alias ? `<div class="engine-help" style="margin-top:6px; color:#275fe8; font-weight:700;">${escapeHtml(alias)}</div>` : ""}
          <div class="engine-help" style="margin-top:8px;">${escapeHtml(why)}</div>
          <div class="engine-concept-tags">${tags}</div>
        </button>
      `;
    }).join("")}</div>${conceptToggleHtml}`;

    if (!state.concept) {
      keywordWrap.innerHTML = `<div class="engine-empty">왼쪽에서 교과 개념을 먼저 고르면 해당 개념의 키워드가 열립니다.</div>`;
      return;
    }

    const entry = getConceptEntry();
    const keywords = getKeywordList(entry);
    if (!keywords.length) {
      keywordWrap.innerHTML = `<div class="engine-empty">이 개념에 연결된 키워드가 없습니다.</div>`;
      return;
    }

    keywordWrap.innerHTML = `
      <div class="engine-help">선택 개념: <strong>${escapeHtml(state.concept)}</strong> · 아래 키워드를 고르면 그 개념이 이어질 후속 과목 축이 열립니다.</div>
      <div class="engine-chip-wrap">${keywords.map(keyword => `
        <button type="button" class="engine-chip ${state.keyword === keyword ? "is-active" : ""}" data-action="keyword" data-value="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
      `).join("")}</div>
    `;
  }

  function renderBookArea() {
    const el = $("engineBookArea");
    if (!el) return;
    if (!isStepEnabled(5)) {
      el.innerHTML = `<div class="engine-empty">먼저 교과 개념 기반 후속 연계축을 선택해야 도서 추천이 열립니다.</div>`;
      return;
    }
    if (!window.renderBookSelectionHTML) {
      el.innerHTML = `<div class="engine-empty">도서 추천 기능을 불러오는 중입니다.</div>`;
      return;
    }
    el.innerHTML = window.renderBookSelectionHTML({
      subject: state.subject,
      career: state.career,
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    });
  }

  function renderBookArea() {
    const el = $("engineBookArea");
    if (!el) return;
    if (!isStepEnabled(4)) {
      el.innerHTML = `<div class="engine-empty">먼저 개념과 키워드를 선택해야 도서 추천이 열립니다.</div>`;
      return;
    }
    if (!window.renderBookSelectionHTML) {
      el.innerHTML = `<div class="engine-empty">도서 추천 기능을 불러오는 중입니다.</div>`;
      return;
    }
    el.innerHTML = window.renderBookSelectionHTML({
      subject: state.subject,
      career: state.career,
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    });
  }

  function renderModeArea() {
    const el = $("engineModeButtons");
    if (!el) return;
    if (!isStepEnabled(6)) {
      el.innerHTML = `<div class="engine-empty">먼저 도서를 선택해야 보고서 전개 방식을 고를 수 있습니다.</div>`;
      return;
    }
    const meta = window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    }) : { modeOptions: [] };
    const options = meta.modeOptions || [];
    el.innerHTML = `<div class="engine-mode-grid">${options.map(option => `
      <button type="button" class="engine-mode-card ${state.reportMode === option.id ? "is-active" : ""}" data-action="mode" data-value="${escapeHtml(option.id)}">
        <div class="engine-mode-title">${escapeHtml(option.label)}</div>
        <div class="engine-mode-desc">${escapeHtml(option.desc)}</div>
      </button>
    `).join("")}</div>`;
  }

  function getRecommendedReportLine() {
    const grade = ($("grade")?.value || "").trim();
    const taskType = ($("taskType")?.value || "").trim();
    if (state.reportMode === "major") return "advanced";
    if (grade === "고3") return "advanced";
    if (grade === "고2" && ["data","compare","application"].includes(state.reportMode)) return "standard";
    if (taskType.includes("실험") || taskType.includes("발표") || ["data","compare","application"].includes(state.reportMode)) return "standard";
    if (grade === "고2") return "standard";
    return "basic";
  }

  function renderReportLineArea() {
    const el = $("engineLineArea");
    if (!el) return;
    if (!isStepEnabled(8)) {
      el.innerHTML = `<div class="engine-empty">먼저 보고서 관점을 선택해야 보고서 라인이 열립니다.</div>`;
      return;
    }
    if (!state.reportLine) {
      state.reportLine = getRecommendedReportLine();
    }
    const entries = Object.values(REPORT_LINE_HELP);
    const recommended = getRecommendedReportLine();
    const current = REPORT_LINE_HELP[state.reportLine] || REPORT_LINE_HELP[recommended] || entries[0];
    el.innerHTML = `
      <div class="engine-mode-grid">${entries.map(item => `
        <button type="button" class="engine-mode-card ${state.reportLine === item.id ? "is-active" : ""}" data-action="line" data-value="${escapeHtml(item.id)}">
          <div class="engine-mode-title">${escapeHtml(item.title)} ${item.id === recommended ? '<span class="engine-mini-tag" style="margin-left:6px;">추천</span>' : ''}</div>
          <div class="engine-mode-desc">${escapeHtml(item.desc)}</div>
          <div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:700;">${escapeHtml(item.fit)}</div>
        </button>
      `).join("")}</div>
      <div class="engine-view-guide">
        <div class="engine-view-guide-title">${escapeHtml(current.title)} 보고서 라인</div>
        <div class="engine-view-guide-desc">${escapeHtml(current.desc)}</div>
        <div class="engine-view-guide-example">문단 흐름: ${current.sections.map((section, idx) => `${idx + 1}. ${section}`).join(' → ')}</div>
      </div>
    `;
  }

  function renderViewArea() {
    const el = $("engineViewButtons");
    if (!el) return;
    if (!isStepEnabled(7)) {
      el.innerHTML = `<div class="engine-empty">먼저 보고서 전개 방식을 선택해야 관점 선택이 열립니다.</div>`;
      return;
    }
    const meta = window.getReportOptionMeta ? window.getReportOptionMeta({
      subject: state.subject,
      career: state.career,
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      concept: state.concept,
      keyword: state.keyword,
      selectedBook: state.selectedBook
    }) : { viewOptions: [] };
    const options = meta.viewOptions || [];
    const selectedView = state.reportView || options[0] || "";
    const viewMeta = VIEW_HELP[selectedView] || {
      title: `${selectedView || "관점"} 설명`,
      desc: "이 관점은 보고서를 어떤 시선으로 풀어갈지 정하는 선택입니다.",
      example: "예: 선택한 개념과 도서를 이 시선으로 다시 정리해 보세요."
    };
    el.innerHTML = `
      <div class="engine-chip-wrap">${options.map(view => `
        <button type="button" class="engine-chip ${state.reportView === view ? "is-active" : ""}" data-action="view" data-value="${escapeHtml(view)}">${escapeHtml(view)}</button>
      `).join("")}</div>
      <div class="engine-view-guide">
        <div class="engine-view-guide-title">${escapeHtml(viewMeta.title)}</div>
        <div class="engine-view-guide-desc">${escapeHtml(viewMeta.desc)}</div>
        <div class="engine-view-guide-example">${escapeHtml(viewMeta.example)}</div>
      </div>
    `;
  }

  function applyLocks() {
    [3,4,5,6,7,8].forEach(step => {
      const block = document.querySelector(`.engine-step-block[data-step="${step}"]`);
      if (block) block.classList.toggle("locked", !isStepEnabled(step));
    });
  }

  function renderSelectionSummary() {
    const el = $("engineSelectionSummary");
    const payloadEl = $("engineMiniPayload");
    if (!el || !payloadEl) return;

    const payload = buildMiniPayload();
    const chips = [
      state.subject,
      state.career,
      getTrackMeta(state.linkTrack)?.title || "",
      state.concept,
      state.keyword,
      state.selectedBookTitle || state.selectedBook,
      getModeLabel(state.reportMode),
      state.reportView,
      getReportLineLabel(state.reportLine),
      payload.activity_context.activity_area,
      payload.activity_context.output_goal
    ].filter(Boolean).map(v => `<span class="engine-tag">${escapeHtml(v)}</span>`).join("");

    el.innerHTML = chips || `<div class="engine-empty">아직 MINI로 넘길 선택 데이터가 없습니다.</div>`;

    payloadEl.innerHTML = `
      <strong>MINI 전달 구조</strong><br>
      학교/학년: ${escapeHtml(payload.student_context.school_name || "-")} / ${escapeHtml(payload.student_context.grade || "-")}<br>
      과목: ${escapeHtml(payload.student_context.subject || "-")}<br>
      학과: ${escapeHtml(payload.student_context.career || "-")}<br>
      활용 영역: ${escapeHtml(payload.activity_context.activity_area || "-")}<br>
      최종 결과물: ${escapeHtml(payload.activity_context.output_goal || "-")}<br>
      기본 결과물: ${escapeHtml(payload.task_context.task_type || "-")}<br>
      연계 축: ${escapeHtml(payload.track_context.label || "-")}<br>
      축 도메인: ${escapeHtml(payload.track_context.axis_domain || payload.track_context.legacy_track || "-")}<br>
      종단 포인트: ${escapeHtml(payload.track_context.record_continuity_point || "-")}<br>
      교과 개념: ${escapeHtml(payload.concept_context.concept || "-")}<br>
      교과 키워드: ${escapeHtml(payload.concept_context.keyword || "-")}<br>
      도서: ${escapeHtml(payload.book_context.title || "-")}<br>
      보고서 방식: ${escapeHtml(payload.report_context.mode_label || "-")}<br>
      보고서 관점: ${escapeHtml(payload.report_context.view || "-")}<br>
      보고서 라인: ${escapeHtml(payload.report_context.line_label || "-")}<br>
      문단 흐름: ${escapeHtml((payload.report_context.frame_sections || []).join(' → ') || "-")}<br>
      조건: ${escapeHtml((payload.activity_context.constraint_labels || []).join(', ') || "없음")}<br>
      교사 안내: ${escapeHtml(payload.activity_context.teacher_focus || "-")}<br>
      학생 메모: ${escapeHtml(payload.activity_context.student_seed || "-")}
    `;
  }

  function getModeLabel(id) {
    const labelMap = {
      principle: "원리 파악형",
      compare: "비교 분석형",
      data: "데이터 확장형",
      application: "사례 적용형",
      major: "전공 확장형"
    };
    return labelMap[id] || id || "";
  }

  function getReportLineLabel(id) {
    return REPORT_LINE_HELP[id]?.title || id || "";
  }

  function syncOutputFields() {
    const keywordInput = $("keyword");
    if (keywordInput) {
      if (state.keyword) {
        keywordInput.value = state.keyword || "";
      } else {
        renderCareerKeywordPreview();
      }
    }
    if ($("linkedTrack")) $("linkedTrack").value = state.linkTrack || "";
    if ($("selectedConcept")) $("selectedConcept").value = state.concept || "";
    if ($("selectedBookId")) $("selectedBookId").value = state.selectedBook || "";
    if ($("selectedBookTitle")) $("selectedBookTitle").value = state.selectedBookTitle || "";
    if ($("reportMode")) $("reportMode").value = state.reportMode || "";
    if ($("reportView")) $("reportView").value = state.reportView || "";
    if ($("reportLine")) $("reportLine").value = state.reportLine || "";
    if ($("miniNavigationPayload")) $("miniNavigationPayload").value = JSON.stringify(buildMiniPayload());
  }

  function buildMiniPayload() {
    const bookDetail = window.getSelectedBookDetail ? window.getSelectedBookDetail(state.selectedBook) : null;
    const lineMeta = REPORT_LINE_HELP[state.reportLine] || REPORT_LINE_HELP[getRecommendedReportLine()] || REPORT_LINE_HELP.basic;
    const constraints = getStructuredConstraints();
    return {
      student_context: {
        school_name: $("schoolName")?.value || "",
        grade: $("grade")?.value || "",
        subject: state.subject,
        career: state.career
      },
      activity_context: {
        activity_area: $("activityArea")?.value || "",
        output_goal: $("outputGoal")?.value || "",
        length_level: $("lengthLevel")?.value || "",
        work_style: $("workStyle")?.value || "",
        constraint_flags: constraints.flags,
        constraint_labels: constraints.labels,
        teacher_focus: $("teacherFocus")?.value || "",
        student_seed: $("studentSeed")?.value || ""
      },
      track_context: {
        id: state.linkTrack,
        label: getTrackMeta(state.linkTrack)?.title || "",
        next_subject: getTrackMeta(state.linkTrack)?.nextSubject || "",
        legacy_track: getResolvedTrackId() || "",
        axis_domain: getTrackMeta(state.linkTrack)?.axisDomain || "",
        extension_keywords: getTrackMeta(state.linkTrack)?.extensionKeywords || [],
        activity_examples: getTrackMeta(state.linkTrack)?.activityExamples || [],
        record_continuity_point: getTrackMeta(state.linkTrack)?.recordContinuityPoint || ""
      },
      concept_context: {
        concept: state.concept,
        keyword: state.keyword
      },
      book_context: {
        book_id: state.selectedBook,
        title: state.selectedBookTitle,
        author: bookDetail?.author || "",
        summary_short: bookDetail?.summary_short || ""
      },
      major_compare_context: {
        selected_major: state.majorSelectedName || '',
        comparison_group: state.majorComparison?.group_label || '',
        selected_focus: state.majorComparison?.selected_focus || '',
        peer_majors: Array.isArray(state.majorComparison?.peers) ? state.majorComparison.peers.slice(0,3).map(peer => ({
          display_name: peer.display_name || '',
          track_category: peer.track_category || '',
          focus: peer.focus || ''
        })) : []
      },
      report_context: {
        mode: state.reportMode,
        mode_label: getModeLabel(state.reportMode),
        view: state.reportView,
        line_id: lineMeta.id,
        line_label: lineMeta.title,
        line_fit: lineMeta.fit,
        frame_sections: lineMeta.sections,
        frame: {
          intro: lineMeta.sections[0] || "",
          body1: lineMeta.sections[1] || "",
          body2: lineMeta.sections[2] || "",
          body3: lineMeta.sections[3] || "",
          conclusion: lineMeta.sections[lineMeta.sections.length - 1] || ""
        }
      },
      task_context: {
        task_name: $("taskName")?.value || "",
        task_type: $("taskType")?.value || "",
        usage_purpose: $("usagePurpose")?.value || "",
        task_description: $("taskDescription")?.value || "",
        output_goal: $("outputGoal")?.value || "",
        activity_area: $("activityArea")?.value || "",
        length_level: $("lengthLevel")?.value || "",
        work_style: $("workStyle")?.value || "",
        constraints: constraints.labels,
        teacher_focus: $("teacherFocus")?.value || "",
        student_seed: $("studentSeed")?.value || ""
      }
    };
  }


  window.__TEXTBOOK_MAJOR_BRIDGE_DIAG__ = function () {
    return {
      version: window.__TEXTBOOK_CONCEPT_HELPER_VERSION || '',
      inputCareer: getCareerInputText(),
      stateCareer: state.career || '',
      stateMajor: state.majorSelectedName || '',
      panelMajor: getMajorPanelResolvedName(),
      globalMajor: getMajorGlobalDetail()?.display_name || '',
      snapshotMajor: derivePreviewDetailFromPayload(getMajorEngineSnapshot())?.display_name || '',
      effectiveCareer: getEffectiveCareerName(),
      scannedCareerInput: getCareerInputText(),
      scannedCareerCandidates: getCareerInputCandidates().map(el => ({ id: el.id || '', name: el.name || '', value: el.value || '', placeholder: el.getAttribute('placeholder') || '' })).slice(0, 8),
      subject: state.subject || '',
      concept: state.concept || ''
    };
  };

  document.addEventListener("DOMContentLoaded", init);
})();
