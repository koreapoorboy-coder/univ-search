window.__TEXTBOOK_CONCEPT_HELPER_VERSION = 'v90.1-pure-chemistry-axis-q3';
window.__TEXTBOOK_CONCEPT_HELPER_VERSION__ = window.__TEXTBOOK_CONCEPT_HELPER_VERSION;

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

  const ASSET_VERSION_QUERY = "v90_1_pure_chemistry_axis_q3";
  const addAssetVersion = (url) => `${url}${String(url).includes("?") ? "&" : "?"}v=${ASSET_VERSION_QUERY}`;
  const UI_SEED_URL = addAssetVersion(`${DATA_SOURCE_POLICY.runtimeUi}subject_concept_ui_seed.json`);
  const ENGINE_MAP_URL = addAssetVersion(`${DATA_SOURCE_POLICY.runtimeUi}subject_concept_engine_map.json`);
  const TOPIC_MATRIX_URL = addAssetVersion(`${DATA_SOURCE_POLICY.runtimeUi}topic_matrix_seed.json`);
  const FOLLOWUP_SUBJECT_URL = addAssetVersion(`${DATA_SOURCE_POLICY.followupAxis}subject_bridge_point.json`);
  const FOLLOWUP_MAJOR_URL = addAssetVersion(`${DATA_SOURCE_POLICY.followupAxis}major_followup_axis.json`);

  const SUBJECT_NAME_ALIASES = Object.freeze({
    "과학탐구실험 1": "과학탐구실험1",
    "과탐실험1": "과학탐구실험1",
    "과탐 실험1": "과학탐구실험1",
    "과학 탐구 실험1": "과학탐구실험1",
    "과학탐구실험 2": "과학탐구실험2",
    "과탐실험2": "과학탐구실험2",
    "과탐 실험2": "과학탐구실험2",
    "과학 탐구 실험2": "과학탐구실험2",
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
    "공통국어 2": "공통국어2",
    "국어2": "공통국어2",
    "국어 2": "공통국어2",
    "공통 국어2": "공통국어2",
    "공통 국어 2": "공통국어2",
    "통합사회": "통합사회1",
    "통합사회 1": "통합사회1",
    "통합사회 2": "통합사회2",
    "통합사회II": "통합사회2",
    "통합사회Ⅱ": "통합사회2",
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
    "통합과학1": addAssetVersion("seed/followup-axis/integrated_science1_concept_longitudinal_map.json"),
    "통합과학2": addAssetVersion("seed/followup-axis/integrated_science2_concept_longitudinal_map.json"),
    "공통수학1": addAssetVersion("seed/followup-axis/common_math1_concept_longitudinal_map.json"),
    "공통수학2": addAssetVersion("seed/followup-axis/common_math2_concept_longitudinal_map.json"),
    "정보": addAssetVersion("seed/followup-axis/info_concept_longitudinal_map.json"),
    "통합사회1": addAssetVersion("seed/followup-axis/integrated_society1_concept_longitudinal_map.json"),
    "통합사회": addAssetVersion("seed/followup-axis/integrated_society1_concept_longitudinal_map.json"),
    "공통국어1": addAssetVersion("seed/followup-axis/common_korean1_concept_longitudinal_map.json"),
    "공통국어2": addAssetVersion("seed/followup-axis/common_korean2_concept_longitudinal_map.json"),
    "통합사회2": addAssetVersion("seed/followup-axis/integrated_society2_concept_longitudinal_map.json"),
    "과학탐구실험1": addAssetVersion("seed/followup-axis/science_inquiry1_concept_longitudinal_map.json"),
    "과학탐구실험2": addAssetVersion("seed/followup-axis/science_inquiry2_concept_longitudinal_map.json"),
    "대수": addAssetVersion("seed/followup-axis/algebra_concept_longitudinal_map.json"),
    "확률과 통계": addAssetVersion("seed/followup-axis/probability_statistics_concept_longitudinal_map.json"),
    "미적분1": addAssetVersion("seed/followup-axis/calculus1_concept_longitudinal_map.json"),
    "기하": addAssetVersion("seed/followup-axis/geometry_concept_longitudinal_map.json"),
    "물리": addAssetVersion("seed/followup-axis/physics1_concept_longitudinal_map.json"),
    "물리학": addAssetVersion("seed/followup-axis/physics1_concept_longitudinal_map.json"),
    "물리학Ⅰ": addAssetVersion("seed/followup-axis/physics1_concept_longitudinal_map.json"),
    "화학": addAssetVersion("seed/followup-axis/chemistry1_concept_longitudinal_map.json"),
    "화학Ⅰ": addAssetVersion("seed/followup-axis/chemistry1_concept_longitudinal_map.json"),
    "화학1": addAssetVersion("seed/followup-axis/chemistry1_concept_longitudinal_map.json"),
    "생명과학": addAssetVersion("seed/followup-axis/life_science_concept_longitudinal_map.json"),
    "생명과학Ⅰ": addAssetVersion("seed/followup-axis/life_science_concept_longitudinal_map.json"),
    "생명과학1": addAssetVersion("seed/followup-axis/life_science_concept_longitudinal_map.json"),
    "지구과학": addAssetVersion("seed/followup-axis/earth_science_concept_longitudinal_map.json"),
    "지구과학Ⅰ": addAssetVersion("seed/followup-axis/earth_science_concept_longitudinal_map.json"),
    "지구과학1": addAssetVersion("seed/followup-axis/earth_science_concept_longitudinal_map.json"),
    "역학과 에너지": addAssetVersion("seed/followup-axis/mechanics_energy_concept_longitudinal_map.json"),
    "역학과에너지": addAssetVersion("seed/followup-axis/mechanics_energy_concept_longitudinal_map.json"),
    "전자기와 양자": addAssetVersion("seed/followup-axis/electromagnetism_quantum_concept_longitudinal_map.json"),
    "전자기와양자": addAssetVersion("seed/followup-axis/electromagnetism_quantum_concept_longitudinal_map.json"),
    "물질과 에너지": addAssetVersion("seed/followup-axis/matter_energy_concept_longitudinal_map.json"),
    "물질과에너지": addAssetVersion("seed/followup-axis/matter_energy_concept_longitudinal_map.json"),
    "세포와 물질대사": addAssetVersion("seed/followup-axis/cell_metabolism_concept_longitudinal_map.json"),
    "세포와물질대사": addAssetVersion("seed/followup-axis/cell_metabolism_concept_longitudinal_map.json"),
    "지구시스템과학": addAssetVersion("seed/followup-axis/earth_system_science_concept_longitudinal_map.json"),
    "지구시스템 과학": addAssetVersion("seed/followup-axis/earth_system_science_concept_longitudinal_map.json")
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

  // v89.0 D3-lock: 화면 최종 렌더 단계에서도 데이터사이언스/통계 계열의
  // 대표 개념 순서가 점수 정렬이나 기존 컴퓨터공학형 가드에 의해 다시 섞이지 않도록 한다.
  function isSameConceptName(a, b) {
    return normalize(a) === normalize(b) || fuzzyIncludes(a, b);
  }

  function pickConceptItemsByForcedOrder(ranked, forced) {
    if (!Array.isArray(ranked) || !ranked.length || !Array.isArray(forced) || !forced.length) return ranked || [];
    const used = new Set();
    const forcedItems = [];
    forced.forEach(name => {
      const foundIndex = ranked.findIndex((item, idx) => !used.has(idx) && isSameConceptName(item?.concept || "", name));
      if (foundIndex >= 0) {
        used.add(foundIndex);
        forcedItems.push(ranked[foundIndex]);
      }
    });
    const forcedConcepts = new Set(forcedItems.map(item => item.concept));
    const others = ranked.filter(item => !forcedConcepts.has(item.concept));
    return uniq([...forcedItems, ...others]);
  }

  function getDataScienceForcedConceptOrderForSubject() {
    if (!isDataScienceMajorSelectedContext()) return [];
    if (state.subject === "확률과 통계") {
      return ["확률변수와 확률분포", "이항분포와 정규분포", "통계적 추정"];
    }
    if (state.subject === "정보") {
      return ["자료와 정보의 분석", "알고리즘 설계와 분석", "추상화와 문제 분해"];
    }
    if (state.subject === "대수") {
      return ["지수함수와 로그함수의 활용", "로그함수의 뜻과 그래프", "등차수열과 등비수열"];
    }
    if (state.subject === "미적분1" || state.subject === "미적분Ⅰ" || state.subject === "미적분") {
      return ["도함수의 활용", "정적분의 활용", "수열의 극한"];
    }
    return [];
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


  function isMajorSearchEditingLocked() {
    try {
      const lockUntil = Number(window.__MAJOR_SEARCH_LOCK_UNTIL__ || 0);
      if (lockUntil && Date.now() < lockUntil) return true;
      if (window.__MAJOR_SEARCH_EDITING_LOCK__) return true;
      return !!window.__MAJOR_SEARCH_IS_TYPING__;
    } catch (error) {
      return false;
    }
  }

  function getMajorPanelResolvedName() {
    try {
      const blocked = /관련 학과|표준화|찾지 못했|전공 후보|학과명을|먼저 고르세요|입력 전/;
      const titleNodes = Array.from(document.querySelectorAll('#engineCareerSummary, .major-engine-title, .major-engine-candidate.is-selected .major-engine-candidate-title, [data-major-select].is-selected'));
      const names = titleNodes
        .map(node => String(node.textContent || node.getAttribute?.('data-major-select') || '').replace(/\s+/g, ' ').trim())
        .filter(text => text && !blocked.test(text));
      const strong = names.find(text => /(학과|학부|전공|공학|의예|약학|간호|교육|컴퓨터|소프트웨어|정보|데이터|AI|인공지능|반도체|신소재|환경|경영|경제|심리|생명|화학|물리|수학|국어|에너지)/.test(text));
      return strong || names[0] || '';
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
    const inputText = getCareerInputText();
    const inputNorm = normalize(inputText || '');
    let globalDetail = null;
    let snapshotDetail = null;
    let panelName = '';
    try { globalDetail = getMajorGlobalDetail(); } catch (error) {}
    try { snapshotDetail = derivePreviewDetailFromPayload(getMajorEngineSnapshot()); } catch (error) {}
    try { panelName = getMajorPanelResolvedName(); } catch (error) {}

    const selectedName = (globalDetail?.display_name || snapshotDetail?.display_name || state.majorSelectedName || panelName || state.career || '').trim();
    const selectedNorm = normalize(selectedName || '');
    const confirmedName = String(window.__MAJOR_SEARCH_CONFIRMED_NAME__ || '').trim();
    const confirmedNorm = normalize(confirmedName || '');
    const isTyping = !!window.__MAJOR_SEARCH_IS_TYPING__;

    // v66: 학과 검색창에 새 글자를 입력하는 동안에는 이전 선택 학과(예: 컴퓨터공학과)를
    // 화면 요약과 4번 연계축이 계속 물고 있으면 안 된다. 현재 입력값을 우선한다.
    if (inputText && isTyping && (!confirmedNorm || inputNorm !== confirmedNorm)) return inputText;
    if (inputText && selectedNorm && inputNorm && inputNorm !== selectedNorm && (!confirmedNorm || inputNorm !== confirmedNorm)) return inputText;

    return (globalDetail?.display_name || snapshotDetail?.display_name || state.majorSelectedName || panelName || state.career || inputText || '').trim();
  }

  function syncMajorSelectionDetail(detail) {
    const rawCareer = getCareerInputText();
    const rawNorm = normalize(rawCareer || '');
    const explicitDetail = detail && detail.display_name ? detail : null;
    const isTyping = !!window.__MAJOR_SEARCH_IS_TYPING__;
    const confirmedName = String(window.__MAJOR_SEARCH_CONFIRMED_NAME__ || '').trim();
    const confirmedNorm = normalize(confirmedName || '');

    // v75: 4번 이후 단계에서 학과 검색창을 다시 누른 직후에는
    // 기존 DOM 스캔/4번 재계산을 멈춘다. 후보 학과가 확정된 이벤트(detail)만 통과시킨다.
    if (isMajorSearchEditingLocked() && !explicitDetail) {
      if (rawCareer) state.career = rawCareer;
      state.majorSelectedName = '';
      state.majorCoreKeywords = [];
      state.majorComparison = null;
      return;
    }

    // v66: 입력 중에는 major helper의 이전 확정값을 사용하지 않는다.
    // 예: 기존 선택이 컴퓨터공학과인 상태에서 간호를 치면 즉시 간호 기준으로 표시하고,
    // 후보 클릭 전까지는 majorSelectedName을 비워 둔다.
    if (rawCareer && isTyping && !explicitDetail && (!confirmedNorm || rawNorm !== confirmedNorm)) {
      state.career = rawCareer;
      state.majorSelectedName = '';
      state.majorCoreKeywords = [];
      state.majorComparison = null;
      return;
    }

    const globalDetail = getMajorGlobalDetail();
    const snapshotDetail = derivePreviewDetailFromPayload(getMajorEngineSnapshot());
    const panelName = getMajorPanelResolvedName();
    const fallback = explicitDetail || globalDetail || snapshotDetail || (panelName ? { display_name: panelName, core_keywords: [], comparison: null } : null);
    let resolvedName = (fallback?.display_name || panelName || '').trim();
    const resolvedNorm = normalize(resolvedName || '');

    if (rawCareer && resolvedName && rawNorm && resolvedNorm && rawNorm !== resolvedNorm && (!confirmedNorm || rawNorm !== confirmedNorm)) {
      state.career = rawCareer;
      state.majorSelectedName = '';
      state.majorCoreKeywords = [];
      state.majorComparison = null;
      return;
    }

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

    const after = {
      career: state.career || '',
      major: state.majorSelectedName || '',
      core: Array.isArray(state.majorCoreKeywords) ? state.majorCoreKeywords.join('|') : ''
    };
    return before.career !== after.career || before.major !== after.major || before.core !== after.core;
  }

  let majorBridgeRenderTimer = null;
  let majorBridgeLastRenderedKey = "";

  function getMajorBridgeRenderKey() {
    return [state.subject || "", state.career || "", state.majorSelectedName || ""].join("||");
  }

  function scheduleBridgeRender(delay = 180) {
    if (isMajorSearchEditingLocked()) return;
    const nextKey = getMajorBridgeRenderKey();
    if (nextKey === majorBridgeLastRenderedKey && majorBridgeRenderTimer) return;
    clearTimeout(majorBridgeRenderTimer);
    majorBridgeRenderTimer = setTimeout(function () {
      majorBridgeRenderTimer = null;
      majorBridgeLastRenderedKey = getMajorBridgeRenderKey();
      renderAll();
    }, delay);
  }

  function isTypingInMajorSearch() {
    const active = document.activeElement;
    if (!active) return false;
    if (active.id === "career") return true;
    const placeholder = String(active.getAttribute?.("placeholder") || "");
    const name = String(active.getAttribute?.("name") || "").toLowerCase();
    return /학과|진로|전공/.test(placeholder) || name.includes("major") || name.includes("career");
  }

  function startMajorBridgePolling() {
    if (window.__TEXTBOOK_MAJOR_BRIDGE_POLLING_V33_20__) return;
    window.__TEXTBOOK_MAJOR_BRIDGE_POLLING_V33_20__ = true;
    setInterval(function () {
      if (isMajorSearchEditingLocked()) return;
      const changed = syncMajorBridgeState();
      if (changed && !isTypingInMajorSearch()) scheduleBridgeRender(260);
    }, 900);
  }

  function scheduleMajorPreviewSync() {
    const refresh = function () {
      if (isMajorSearchEditingLocked()) return;
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
      careerEl.addEventListener("input", function () {
        syncCareerFromInput();
        state.majorSelectedName = "";
        state.majorCoreKeywords = [];
        state.majorComparison = null;
        // v66: 학과 검색 입력 중에는 3~8번 전체 재렌더를 예약하지 않는다.
        // 후보 클릭 또는 change 확정 때만 후속 연계축을 다시 계산한다.
        renderStatus();
        syncOutputFields();
      });
      careerEl.addEventListener("change", function () {
        if (isMajorSearchEditingLocked()) {
          renderStatus();
          syncOutputFields();
          return;
        }
        syncCareerFromInput();
        state.linkTrackSource = state.linkTrackSource || "";
        scheduleMajorPreviewSync();
        scheduleBridgeRender(80);
      });
    }

    window.addEventListener("major-engine-input-preview", function (event) {
      const raw = String(event?.detail?.raw || $("career")?.value || "").trim();
      if (!raw) return;
      state.career = raw;
      state.majorSelectedName = "";
      state.majorCoreKeywords = [];
      state.majorComparison = null;
      renderStatus();
      syncOutputFields();
    });

    window.addEventListener("major-engine-selection-changed", function (event) {
      const detail = event?.detail || null;
      const prevMajor = state.majorSelectedName || state.career || "";
      const nextMajor = String(detail?.display_name || "").trim();
      const majorChanged = !!nextMajor && normalize(prevMajor || "") !== normalize(nextMajor || "");

      // v76: 학과가 확정 변경되면 3번 추천 개념/키워드부터 다시 계산해야 한다.
      // 이전 학과에서 고른 concept/keyword/linkTrack/book/report 선택값을 남기면
      // 4번만 새 학과처럼 보이고 실제 출발점은 이전 학과인 상태가 된다.
      if (majorChanged) {
        clearFrom("major");
        majorBridgeLastRenderedKey = "";
      }

      syncMajorSelectionDetail(detail);
      if (detail && detail.display_name) {
        scheduleBridgeRender(majorChanged ? 20 : 80);
      } else {
        renderStatus();
        syncOutputFields();
      }
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
        renderAfterKeywordSelectionFast();
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
      // 학과 검색창은 전용 리스너에서 debounce 처리한다. 여기서 다시 전체 렌더하면 입력 지연이 커진다.
      if (target.id === 'career' || isTypingInMajorSearch()) return;
      const before = state.career || '';
      syncSubjectFromSelect();
      syncMajorSelectionDetail(null);
      if (!state.keyword) renderCareerKeywordPreview();
      const after = state.career || '';
      if (before !== after) {
        scheduleBridgeRender(180);
      }
    }, true);

    document.addEventListener('change', function (event) {
      const target = event.target;
      if (!target || !target.matches || !target.matches('input, textarea, select')) return;
      if ((target.id === 'career' || isTypingInMajorSearch()) && isMajorSearchEditingLocked()) return;
      syncSubjectFromSelect();
      syncMajorSelectionDetail(null);
      if (!state.keyword) renderCareerKeywordPreview();
      scheduleBridgeRender(80);
    }, true);

    try {
      let mutationTimer = null;
      const observer = new MutationObserver(function () {
        if (isMajorSearchEditingLocked() || isTypingInMajorSearch()) return;
        clearTimeout(mutationTimer);
        mutationTimer = setTimeout(function () {
          if (syncMajorBridgeState()) scheduleBridgeRender(140);
        }, 180);
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
    if (stepName === "major") {
      state.concept = "";
      state.keyword = "";
      state.linkTrack = "";
      state.linkTrackSource = "";
      state.selectedBook = "";
      state.selectedBookTitle = "";
      state.reportMode = "";
      state.reportView = "";
      state.reportLine = "";
      state.showAllConcepts = false;
      syncOutputFields();
      return;
    }
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


  function getSubjectRuntimeKeys(subject) {
    const raw = String(subject || "").trim();
    const canonical = getCanonicalSubjectName(raw);
    const resolvedFromRaw = raw ? findSubjectKey(raw) : "";
    const resolvedFromCanonical = canonical ? findSubjectKey(canonical) : "";
    return uniq([raw, canonical, resolvedFromRaw, resolvedFromCanonical].filter(Boolean));
  }

  function getEngineSubjectEntry(subject) {
    const keys = getSubjectRuntimeKeys(subject);
    for (const key of keys) {
      const entry = engineMap?.[key];
      if (entry && entry.concepts && Object.keys(entry.concepts || {}).length) return entry;
    }
    const canonical = getCanonicalSubjectName(subject);
    const targetKeys = keys.length ? keys : [canonical, subject].filter(Boolean);
    const engineKeys = engineMap ? Object.keys(engineMap) : [];
    for (const key of engineKeys) {
      if (targetKeys.some(target => fuzzyIncludes(key, target))) {
        const entry = engineMap?.[key];
        if (entry && entry.concepts && Object.keys(entry.concepts || {}).length) return entry;
      }
    }
    return null;
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
    // v85 step3-4 stabilizer: followup-axis data uses several newer domains.
    // Map them back to the legacy 5~8 report/book track buckets so selecting a 4번 axis
    // never leaves downstream book/report routing with an empty track id.
    if (/^(data|data_visual|math|math_data|info|programming|encoding|signal_media|compression_transfer|smart_service|policy_issue|inquiry|inquiry_method)$/.test(domain)) return "physics";
    if (/^(engineering|energy|biomedical)$/.test(domain)) return "physics";
    if (/^(medical|health)$/.test(domain)) return "biology";
    if (/^(social|social_policy|public_policy|civic_participation|ethics|ethics_communication|law_civics|communication|media|korean)$/.test(domain)) return "biology";
    return "";
  }

  function getFollowupSubjectEntry(subject) {
    if (!subject || !Array.isArray(subjectBridgePoint)) return null;
    const keys = getSubjectRuntimeKeys(subject);
    return subjectBridgePoint.find(item => keys.some(key => fuzzyIncludes(item?.subject_name, key))) || null;
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


  function normalizeAxisDomain(domain) {
    const value = String(domain || "").trim().toLowerCase();
    const map = {
      earth: "earth_env",
      earthenv: "earth_env",
      environment: "earth_env",
      climate: "earth_env",
      info: "info",
      information: "info",
      statistics: "data",
      math: "data",
      system: "physics",
      physics: "physics",
      engineering: "engineering",
      electronics: "electronics",
      energy: "energy",
      urban: "urban",
      spatial: "urban",
      space: "urban",
      biology: "biology",
      bio: "biology",
      chemical: "chemistry",
      chemistry: "chemistry",
      chem: "chemistry",
      material: "engineering",
      materials: "engineering",
      material_science: "engineering",
      bio_chemistry: "chemistry",
      food_science: "biology",
      health: "health",
      medical: "health",
      decision: "decision",
      risk: "decision",
      business: "business",
      social: "social_policy",
      social_policy: "social_policy"
    };
    return map[value] || value;
  }

  function getAxisDomainForRouting(axisLike) {
    const raw = axisLike?.axis_domain || axisLike?.axisDomain || axisLike?.domain || "";
    const normalized = normalizeAxisDomain(raw);
    if (normalized) return normalized;
    const text = [
      axisLike?.axis_title || axisLike?.title || "",
      axisLike?.short || axisLike?.axis_short || "",
      ...(Array.isArray(axisLike?.next_subjects) ? axisLike.next_subjects : []),
      ...(Array.isArray(axisLike?.linkedSubjects) ? axisLike.linkedSubjects : [])
    ].join(" ");
    if (/도시|공간|생활권|인프라|교통|녹지|열섬|포장|주거/.test(text)) return "urban";
    if (/지구|환경|기후|대기|해양|체감온도|습도/.test(text)) return "earth_env";
    if (/자료|데이터|통계|그래프|수리|모델링|예측|비교/.test(text)) return "data";
    if (/정보|알고리즘|프로그래밍|입력|출력|조건문/.test(text)) return "info";
    if (/화학|물질|재료|소재|결합|분자|원소|주기|물성|고분자|금속|세라믹|표면|점성|분산력|수소 결합/.test(text)) return "chemistry";
    if (/전자|소자|회로|신호|통신|센서|전자장치/.test(text)) return "electronics";
    if (/에너지|전환|저장|효율|신재생|전력|배터리/.test(text)) return "energy";
    if (/물리|시스템|장치|역학|전자기|속도|전류|전압/.test(text)) return "physics";
    if (/생명|건강|간호|보건|의학|생체|온열|질환|취약/.test(text)) return "health";
    if (/경영|경제|의사결정|비용|편익|위험 관리|우선순위/.test(text)) return "decision";
    return "";
  }

  function detectMajorRoutingBucket(text) {
    const t = String(text || "").trim();
    if (!t) return "default";
    if (/(반도체공학|반도체시스템|반도체|나노반도체|시스템반도체)/.test(t)) return "semiconductor";
    if (/(기계공학|기계|자동차공학|자동차|모빌리티|항공우주공학|항공|로봇공학|로봇|메카트로닉스|기계설계|생산공학|열유체|냉동공조)/.test(t)) return "mechanical";
    if (/(전자공학|전기전자|전기공학|전자전기|회로|센서|통신|전파|임베디드)/.test(t)) return "electronics";
    if (/(신소재|재료공학|재료|소재|고분자|금속|세라믹|나노소재)/.test(t)) return "materials";
    if (/(화학공학|화공|공업화학|응용화학|화학생명공학)/.test(t)) return "chemeng";
    if (/(에너지공학|신재생에너지|에너지시스템|에너지|전력|배터리)/.test(t)) return "energy";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터사이언스|정보보호|정보|보안|프로그래밍|통계)/i.test(t)) return "it";
    if (/(도시공학|도시설계|도시계획|도시|건축|토목|공간|교통|인프라|주거|생활권|녹지|열섬|조경)/.test(t)) return "urban";
    if (/(환경공학|환경|기후|대기|지구|해양|생태|자원|에너지환경|지리)/.test(t)) return "env";
    if (/(간호|의학|의예|보건|약학|치의|수의|생명|바이오|의생명|재활|치위생|의료)/.test(t)) return "health";
    if (/(경영|경제|회계|무역|마케팅|금융|창업|산업공학|경영정보|MIS)/.test(t)) return "business";
    if (/(전기|전자|회로|센서|통신|기계|자동차|로봇|항공|모빌리티|배터리)/.test(t)) return "engineering";
    return "default";
  }

  function cleanMajorRoutingString(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/(컴퓨터공학과\s*){2,}/g, "컴퓨터공학과 ")
      .replace(/(반도체공학과\s*){2,}/g, "반도체공학과 ")
      .replace(/(전자공학과\s*){2,}/g, "전자공학과 ")
      .replace(/(신소재공학과\s*){2,}/g, "신소재공학과 ")
      .replace(/(화학공학과\s*){2,}/g, "화학공학과 ")
      .replace(/(에너지공학과\s*){2,}/g, "에너지공학과 ")
      .trim();
  }

  function getPrimaryMajorRoutingText() {
    const candidates = [
      state.majorSelectedName || "",
      (typeof getEffectiveCareerName === "function" ? getEffectiveCareerName() : "") || "",
      state.career || "",
      (typeof getCareerInputText === "function" ? getCareerInputText() : "") || "",
      (typeof getMajorPanelResolvedName === "function" ? getMajorPanelResolvedName() : "") || ""
    ].map(cleanMajorRoutingString).filter(Boolean);
    const majorLike = candidates.find(text => /(학과|학부|전공|공학|반도체|컴퓨터|소프트웨어|인공지능|데이터|간호|환경|도시|경영|경제|전자|전기|신소재|재료|화학)/.test(text));
    return majorLike || candidates[0] || "";
  }

  function inferDisplayMajorName(text) {
    const t = cleanMajorRoutingString(text || getPrimaryMajorRoutingText() || getMajorRoutingText());
    const rules = [
      [/반도체공학과|반도체시스템공학과|반도체|시스템반도체/, "반도체공학과"],
      [/신소재공학과|신소재|재료공학과|재료|소재/, "신소재공학과"],
      [/기계공학과|기계공학|기계|자동차공학과|자동차|항공우주공학과|항공|로봇공학과|로봇|메카트로닉스|열유체|냉동공조/, "기계공학과"],
      [/전자공학과|전기전자공학과|전자전기공학과|전자|전기전자|회로|센서|통신/, "전자공학과"],
      [/화학공학과|화공|화학생명공학|공업화학/, "화학공학과"],
      [/에너지공학과|에너지공학|신재생에너지|에너지시스템|에너지/, "에너지공학과"],
      [/생명공학과|의생명공학과|생명공학|의생명|바이오공학|분자생명|유전공학|세포공학|생명과학과/, "생명공학과"],
      [/컴퓨터공학과|컴퓨터|소프트웨어/, "컴퓨터공학과"],
      [/인공지능학과|인공지능|AI/, "인공지능학과"],
      [/데이터사이언스학과|데이터사이언스|빅데이터|데이터/, "데이터사이언스학과"],
      [/환경공학과|환경/, "환경공학과"],
      [/도시공학과|도시/, "도시공학과"],
      [/간호학과|간호/, "간호학과"],
      [/경영학과|경영/, "경영학과"],
      [/경제학과|경제/, "경제학과"]
    ];
    for (const [re, label] of rules) if (re.test(t)) return label;
    const match = t.match(/[가-힣A-Za-z0-9·]+(?:학과|학부|전공)/);
    return match ? match[0] : (t.split(" ")[0] || "학과");
  }

  function getMajorRoutingText() {
    const primary = getPrimaryMajorRoutingText();
    return [
      primary,
      state.career || "",
      state.majorSelectedName || "",
      (typeof getMajorTextBag === "function" ? getMajorTextBag() : "") || ""
    ].map(cleanMajorRoutingString).join(" ").trim();
  }

  function buildMajorRoutingProfile(text) {
    const primaryText = getPrimaryMajorRoutingText();
    const routingText = cleanMajorRoutingString(text || primaryText || getMajorRoutingText() || state.career || state.majorSelectedName || "");
    const bucket = detectMajorRoutingBucket(primaryText || routingText);
    const majorName = inferDisplayMajorName(primaryText || routingText);
    const profiles = {
      semiconductor: {
        bucket: "semiconductor",
        lens: "반도체 물성·소자 작동·재료 구조",
        directAxisDomains: ["engineering", "chemistry", "physics", "electronics"],
        bridgeAxisDomains: ["energy", "data", "info", "math"],
        resultKeywords: ["반도체", "전기적 성질", "도핑", "전자 이동", "소자 작동", "재료 구조"]
      },
      electronics: {
        bucket: "electronics",
        lens: "전자 이동·회로·소자 시스템",
        directAxisDomains: ["electronics", "engineering", "physics"],
        bridgeAxisDomains: ["chemistry", "energy", "data", "info", "math"],
        resultKeywords: ["전자 이동", "전류", "회로", "소자", "신호", "장치 구조"]
      },
      mechanical: {
        bucket: "mechanical",
        lens: "운동·힘·열·진동·기계 시스템 설계",
        directAxisDomains: ["physics", "engineering", "mechanical"],
        bridgeAxisDomains: ["data", "math", "info", "energy", "electronics"],
        resultKeywords: ["힘과 운동", "벡터", "열효율", "진동", "시뮬레이션", "기계 설계"]
      },
      materials: {
        bucket: "materials",
        lens: "원자 배열·결합·물성·소재 설계",
        directAxisDomains: ["chemistry", "engineering", "materials"],
        bridgeAxisDomains: ["physics", "data", "info"],
        resultKeywords: ["원자 배열", "결정 구조", "결합 방식", "물성", "소재 설계", "재료 선택"]
      },
      chemeng: {
        bucket: "chemeng",
        lens: "물질 변화·반응 조건·공정·소재 제조",
        directAxisDomains: ["chemistry"],
        bridgeAxisDomains: ["engineering", "energy", "data", "physics"],
        resultKeywords: ["물질 변화", "반응 조건", "공정", "화학적 처리", "소재 제조", "제어 조건"]
      },
      energy: {
        bucket: "energy",
        lens: "에너지 전환·저장·효율·시스템 설계",
        directAxisDomains: ["energy", "engineering", "physics", "chemistry"],
        bridgeAxisDomains: ["data", "electronics", "info"],
        resultKeywords: ["에너지 전환", "저장 효율", "전력", "배터리", "신재생", "시스템 설계"]
      },
      bioengineering: {
        bucket: "bioengineering",
        lens: "유전 정보·세포 시스템·효소 반응·바이오공정",
        directAxisDomains: ["biology", "chemistry", "engineering"],
        bridgeAxisDomains: ["data", "health", "info"],
        resultKeywords: ["DNA", "유전자", "세포막", "효소", "대사 경로", "바이오공정"]
      },
      it: {
        bucket: "it",
        lens: "입력값·조건문·오류 검증",
        directAxisDomains: ["data", "info", "math"],
        bridgeAxisDomains: ["physics", "engineering", "earth_env"],
        resultKeywords: ["입력값", "조건문", "판단 결과", "오류 가능성", "예외 상황", "알고리즘"]
      },
      env: {
        bucket: "env",
        lens: "환경 변수·노출·취약성·저감 기준",
        directAxisDomains: ["earth_env", "environment", "climate"],
        bridgeAxisDomains: ["data", "chemistry", "physics", "engineering"],
        resultKeywords: ["환경 변수", "노출 시간", "취약성", "위험도", "피해 가능성", "저감 기준"]
      },
      urban: {
        bucket: "urban",
        lens: "공간 구조·도시 열섬·녹지·인프라",
        directAxisDomains: ["urban", "spatial", "earth_env", "environment"],
        bridgeAxisDomains: ["data", "physics", "engineering"],
        resultKeywords: ["공간 구조", "도시 열섬", "녹지", "포장 면적", "생활권 차이", "인프라"]
      },
      health: {
        bucket: "health",
        lens: "생체 반응·위험 요인·관리 기준",
        directAxisDomains: ["biology", "health"],
        bridgeAxisDomains: ["data", "chemistry", "earth_env", "environment", "physics"],
        resultKeywords: ["항상성", "생체 반응", "증상 관찰", "위험 요인", "관리 기준", "간호적 판단"]
      },
      business: {
        bucket: "business",
        lens: "비용·편익·의사결정·위험 관리",
        directAxisDomains: ["decision", "business", "social_policy", "data"],
        bridgeAxisDomains: ["earth_env", "environment", "info", "math", "statistics"],
        resultKeywords: ["비용", "편익", "선택 기준", "위험 관리", "의사결정", "시장 반응"]
      },
      engineering: {
        bucket: "engineering",
        lens: "공학 시스템·설계 조건·검증",
        directAxisDomains: ["physics", "engineering", "chemistry"],
        bridgeAxisDomains: ["data", "info", "earth_env"],
        resultKeywords: ["구조", "시스템", "설계 조건", "검증", "성능", "안정성"]
      }
    };
    const profile = profiles[bucket] || {
      bucket: "default",
      lens: "교과 개념 기반 종단 연결",
      directAxisDomains: [],
      bridgeAxisDomains: [],
      resultKeywords: []
    };
    return { ...profile, majorName };
  }

  function getAxisRelationByMajorProfile(profile, axisLike) {
    const domain = getAxisDomainForRouting(axisLike);
    if (!profile || profile.bucket === "default") return null;
    const direct = (profile.directAxisDomains || []).map(normalizeAxisDomain);
    const bridge = (profile.bridgeAxisDomains || []).map(normalizeAxisDomain);
    if (direct.includes(domain)) {
      return {
        type: "direct",
        label: "직접 연계 강함",
        score: 12,
        message: `${profile.majorName || state.career}와 바로 이어지는 축입니다.`
      };
    }
    if (bridge.includes(domain)) {
      return {
        type: "bridge",
        label: "역량 브리지",
        score: 6,
        message: `${profile.majorName || state.career}와 직접 일치하지 않아도 역량 연결이 가능한 축입니다.`
      };
    }
    return {
      type: "general",
      label: "보조 확장",
      score: 0,
      message: `${profile.majorName || state.career}와 직접 연결은 약하지만 보조 자료로 활용할 수 있는 축입니다.`
    };
  }

  function getMajorRoutingAxisBoost(axisLike) {
    const profile = buildMajorRoutingProfile(getMajorRoutingText());
    const domain = getAxisDomainForRouting(axisLike);
    if (!profile || profile.bucket === "default") return 0;
    const direct = (profile.directAxisDomains || []).map(normalizeAxisDomain);
    const bridge = (profile.bridgeAxisDomains || []).map(normalizeAxisDomain);
    if (direct.includes(domain)) return 22;
    if (bridge.includes(domain)) {
      if (profile.bucket === "urban" && (domain === "physics" || domain === "engineering")) return 4;
      if (profile.bucket === "it" && domain === "earth_env") return 2;
      if (profile.bucket === "business" && domain === "earth_env") return 10;
      return 8;
    }
    return 0;
  }

  function isHeatwaveFollowupContext() {
    const text = [state.subject || "", state.concept || "", state.keyword || ""].join(" ");
    return /통합과학1/.test(text) && /과학의 측정과 우리 사회/.test(text) && /(폭염|폭염주의보|기온|체감온도|습도|열섬|그늘|녹지|포장 면적|생활환경|취약 계층|취약계층|온열|무더위)/.test(text);
  }

  function getHeatwaveAxisContextBoost(axisLike) {
    if (!isHeatwaveFollowupContext()) return 0;
    const profile = buildMajorRoutingProfile(getMajorRoutingText());
    const domain = getAxisDomainForRouting(axisLike);

    // v77 lock rule:
    // 폭염주의보는 같은 키워드라도 학과 렌즈에 따라 1순위 축이 확실히 달라져야 한다.
    // 기존 priority(물리=1, 데이터=2, 환경=3)가 너무 강해서 도시/간호/경영 맥락이 흔들리던 문제를 여기서 보정한다.
    if (profile.bucket === "it") {
      if (domain === "data" || domain === "info") return 260;
      if (domain === "earth_env") return 30;
      if (domain === "physics") return -40;
      return 0;
    }
    if (profile.bucket === "env") {
      if (domain === "earth_env") return 270;
      if (domain === "data") return 55;
      if (domain === "physics") return -45;
      return 0;
    }
    if (profile.bucket === "urban") {
      if (domain === "urban") return 360;
      if (domain === "earth_env") return 140;
      if (domain === "data") return 60;
      if (domain === "physics" || domain === "engineering") return -80;
      return 0;
    }
    if (profile.bucket === "health") {
      if (domain === "health" || domain === "biology") return 360;
      if (domain === "earth_env") return 75;
      if (domain === "data") return 55;
      if (domain === "physics" || domain === "engineering") return -80;
      return 0;
    }
    if (profile.bucket === "business") {
      if (domain === "decision" || domain === "business") return 340;
      if (domain === "data" || domain === "info") return 120;
      if (domain === "earth_env") return 70;
      if (domain === "physics" || domain === "engineering") return -80;
      return 0;
    }
    if (domain === "earth_env") return 24;
    if (domain === "data") return 10;
    return 0;
  }

  function isSemiconductorFollowupContext() {
    const text = [state.subject || "", state.concept || "", state.keyword || ""].join(" ");
    return /통합과학1/.test(text) && /(물질 구성과 분류|규칙성 발견과 주기율표)/.test(text) && /(반도체|도핑|전기 전도성|재료 성질|원소|금속|비금속|원자|주기율|원소 배열)/.test(text);
  }

  function getSemiconductorAxisContextBoost(axisLike) {
    if (!isSemiconductorFollowupContext()) return 0;
    const profile = buildMajorRoutingProfile(getPrimaryMajorRoutingText() || getMajorRoutingText());
    const domain = getAxisDomainForRouting(axisLike);

    // v77 lock rule:
    // 반도체 키워드는 학과별로 1순위 축이 갈라져야 한다.
    // - 반도체공학과: 화학·물질 구조 분석 또는 재료·소자 기초
    // - 신소재공학과: 화학·물질 구조 분석
    // - 전자공학과: 재료·소자 기초 또는 물리·시스템 해석
    // - 화학공학과: 화학·물질 구조 분석
    if (profile.bucket === "electronics") {
      if (domain === "electronics") return 430;
      if (domain === "engineering") return 330;
      if (domain === "physics") return 260;
      if (domain === "chemistry") return 65;
      if (domain === "energy") return 40;
      if (domain === "data" || domain === "info") return -50;
      return 0;
    }
    if (profile.bucket === "materials") {
      if (domain === "chemistry") return 340;
      if (domain === "engineering") return 165;
      if (domain === "physics") return 35;
      if (domain === "data" || domain === "info") return -50;
      return 0;
    }
    if (profile.bucket === "chemeng") {
      if (domain === "chemistry") return 360;
      if (domain === "engineering") return 105;
      if (domain === "physics") return 20;
      if (domain === "data" || domain === "info") return -55;
      return 0;
    }
    if (profile.bucket === "semiconductor") {
      if (domain === "chemistry") return 300;
      if (domain === "engineering") return 295;
      if (domain === "physics") return 145;
      if (domain === "data" || domain === "info") return -45;
      return 0;
    }
    if (profile.bucket === "energy") {
      if (domain === "energy") return 460;
      if (domain === "engineering") return 310;
      if (domain === "physics") return 240;
      if (domain === "chemistry") return 220;
      if (domain === "electronics") return 95;
      if (domain === "data" || domain === "info") return -35;
      return 0;
    }
    if (profile.bucket === "engineering") {
      if (domain === "engineering") return 220;
      if (domain === "physics") return 160;
      if (domain === "chemistry") return 80;
      if (domain === "energy") return 120;
      if (domain === "data" || domain === "info") return -35;
      return 0;
    }
    return 0;
  }

  function getLockedFollowupAxisOrderBoost(axisLike) {
    const domain = getAxisDomainForRouting(axisLike);
    const profile = buildMajorRoutingProfile(getPrimaryMajorRoutingText() || getMajorRoutingText());
    if (isHeatwaveFollowupContext()) {
      const order = {
        it: { data: 900, info: 880, earth_env: 120, physics: -160, engineering: -160 },
        env: { earth_env: 900, data: 160, physics: -150, engineering: -140 },
        urban: { urban: 980, earth_env: 430, data: 180, physics: -180, engineering: -170 },
        health: { health: 980, biology: 960, earth_env: 180, data: 150, physics: -180, engineering: -170 },
        business: { decision: 980, business: 960, data: 360, info: 220, earth_env: 160, physics: -180, engineering: -170 }
      };
      return (order[profile.bucket] && Object.prototype.hasOwnProperty.call(order[profile.bucket], domain)) ? order[profile.bucket][domain] : 0;
    }
    if (isSemiconductorFollowupContext()) {
      const order = {
        semiconductor: { chemistry: 980, engineering: 970, electronics: 760, physics: 360, energy: 180, data: -160, info: -160 },
        materials: { chemistry: 980, engineering: 460, physics: 120, data: -160, info: -160 },
        electronics: { electronics: 1000, engineering: 940, physics: 820, chemistry: 220, energy: 120, data: -160, info: -160 },
        chemeng: { chemistry: 980, engineering: 280, energy: 120, physics: 80, data: -160, info: -160 },
        energy: { energy: 1000, engineering: 720, physics: 560, chemistry: 520, electronics: 240, data: -120, info: -120 },
        engineering: { engineering: 760, physics: 600, chemistry: 240, data: -120, info: -120 }
      };
      return (order[profile.bucket] && Object.prototype.hasOwnProperty.call(order[profile.bucket], domain)) ? order[profile.bucket][domain] : 0;
    }
    return 0;
  }


  function makeContextFollowupAxis(seed) {
    const relationMeta = getAxisCareerRelationMeta(state.subject, {
      axis_domain: seed.axisDomain,
      axis_title: seed.title,
      next_subjects: seed.linkedSubjects || []
    });
    return {
      id: seed.id,
      title: seed.title,
      short: seed.short,
      nextSubject: (seed.linkedSubjects || []).join(" / "),
      desc: seed.desc,
      reason: relationMeta.message,
      relationLabel: relationMeta.label,
      relationType: relationMeta.type,
      easy: seed.easy || seed.desc,
      axisDomain: seed.axisDomain,
      extensionKeywords: seed.extensionKeywords || [],
      keywordSignals: [],
      activityExamples: seed.activityExamples || [],
      linkedSubjects: seed.linkedSubjects || [],
      grade2NextSubjects: seed.linkedSubjects || [],
      recordContinuityPoint: `${state.subject}의 ${state.concept} 개념을 ${seed.title}으로 연결하는 종단 확장 포인트`,
      isPrimary: false,
      __relationScore: relationMeta.score,
      __priority: seed.priority || 4,
      __contextAxis: true
    };
  }

  function addContextualFollowupAxes(axes) {
    const list = Array.isArray(axes) ? [...axes] : [];
    const profile = buildMajorRoutingProfile(getMajorRoutingText());
    const hasDomain = (...domains) => list.some(axis => domains.includes(getAxisDomainForRouting(axis)));
    const pushIfMissing = (seed, ...domains) => {
      if (!hasDomain(...domains)) list.push(makeContextFollowupAxis(seed));
    };

    // v88.5 H2-lock: 간호학과 + 화학 + '화학 반응에서의 동적 평형'은
    // 공정/평형 일반 축보다 체액 pH·완충·항상성·건강 관리 축을 먼저 보여준다.
    // 기존 JSON 축을 새로 지우지 않고, 간호/보건 맥락에서만 선택 후보를 보강한다.
    try {
      const isChemSubject = /^(화학|화학Ⅰ|화학1)$/.test(String(state.subject || ""));
      const isNursingChem = isChemSubject && typeof getChemistry1MajorKind === "function" && getChemistry1MajorKind() === "nursing";
      const isAcidBaseConcept = /화학 반응에서의 동적 평형/.test(String(state.concept || ""));
      const kw = String(state.keyword || "");
      const isHealthAcidBaseKeyword = /pH|완충|완충 용액|산|염기|중화|체액|혈액|혈액 pH|건강 지표|농도|수질/.test(kw);
      if (isNursingChem && isAcidBaseConcept && isHealthAcidBaseKeyword) {
        const pushUniqueContextAxis = (seed) => {
          if (!list.some(axis => String(axis.id || axis.axis_id || "") === seed.id)) {
            list.push(makeContextFollowupAxis(seed));
          }
        };
        pushUniqueContextAxis({
          id: "body_fluid_buffer_homeostasis_axis",
          title: "체액 pH·완충 항상성 축",
          short: "체액 pH·완충",
          axisDomain: "health",
          priority: 1,
          linkedSubjects: ["생명과학", "세포와 물질대사", "보건", "간호학과"],
          desc: "산·염기와 완충 용액 개념을 혈액 pH, 체액 조절, 내부 환경 유지와 연결해 해석하는 방향입니다.",
          easy: "혈액 pH와 완충 작용, 체액 조절, 내부 환경 유지 사례 정리",
          activityExamples: ["혈액 pH가 좁은 범위로 유지되는 이유 정리", "완충 용액과 체액 항상성 연결 카드 만들기", "산·염기 변화가 인체 조절에 미치는 영향 비교"]
        });
        pushUniqueContextAxis({
          id: "acid_base_health_management_axis",
          title: "산염기·건강 관리 축",
          short: "산염기·건강",
          axisDomain: "health",
          priority: 2,
          linkedSubjects: ["화학", "생명과학", "보건", "간호학과"],
          desc: "pH, 중화, 산·염기 판단을 생활 건강, 체액 균형, 간호·보건 관리 기준과 연결하는 방향입니다.",
          easy: "생활 용액 pH 비교, 산염기 균형, 건강 관리 기준 정리",
          activityExamples: ["생활 용액 pH를 건강·안전 기준과 비교", "중화 반응을 응급·생활 보건 상황과 연결", "체액 균형 관리 기준 조사"]
        });
        pushUniqueContextAxis({
          id: "health_ph_data_interpretation_axis",
          title: "건강 지표·pH 데이터 해석 축",
          short: "pH 데이터·건강 지표",
          axisDomain: "data",
          priority: 3,
          linkedSubjects: ["확률과 통계", "생명과학", "보건", "화학"],
          desc: "pH나 농도 자료를 표·그래프로 정리해 건강 지표와 간호·보건 판단으로 연결하는 방향입니다.",
          easy: "pH 측정값 비교표, 건강 지표 그래프, 자료 기반 판단 보고서",
          activityExamples: ["pH 측정값을 표와 그래프로 정리", "정상 범위와 이상 범위 비교", "자료 기반 건강 관리 판단 기준 제안"]
        });
      }
    } catch (error) {}

    // v89.4 F3-lock: 환경공학과 + 통합과학2의 '지구 환경 변화' 계열은
    // 기존 일반 축(지구 환경 변화 해석 / 생물 변천 환경 추론 / 증거자료 연표 해석)만 보이면
    // 환경공학 선택지로는 너무 약하다. 4번 후보를 기후·환경 영향, 위험 대응,
    // 자료 기반 환경 관리 방향으로 보강한다.
    try {
      const subjectText = String(state.subject || "");
      const conceptText = String(state.concept || "");
      const keywordText = String(state.keyword || "");
      const majorText = [
        state.career || "",
        state.majorSelectedName || "",
        getEffectiveCareerName?.() || "",
        getCareerInputText?.() || "",
        getMajorPanelResolvedName?.() || "",
        getMajorTextBag?.() || ""
      ].join(" ").replace(/\s+/g, " ").trim();
      const bucket = detectCareerBucket(majorText);
      const isEnvMajor = /(환경공학과|환경공학|환경과학|환경생태|기후환경|지구환경|탄소중립|수질|대기|폐기물|환경|기후)/.test(majorText) || bucket === "env";
      const isIntegratedScience2 = /통합과학2|통합과학Ⅱ/.test(subjectText);
      const isEarthEnvChangeConcept = /지구 환경 변화|지구 환경 변화와 인간 생활/.test(conceptText);
      const isF1Keyword = !keywordText || /지구 환경 변화|기후 변화|환경 변화|환경 재해|환경 문제|탄소중립|온실가스|인간 생활|대응|사회적 영향|정책|생물 변천|증거자료|연표/.test(keywordText);

      if (isIntegratedScience2 && isEnvMajor && isEarthEnvChangeConcept && isF1Keyword) {
        const pushUniqueContextAxis = (seed) => {
          if (!list.some(axis => String(axis.id || axis.axis_id || "") === seed.id)) {
            list.push(makeContextFollowupAxis(seed));
          }
        };
        pushUniqueContextAxis({
          id: "env_climate_impact_response_axis",
          title: "기후·환경 영향 분석 축",
          short: "기후·환경 영향",
          axisDomain: "earth_env",
          priority: -30,
          linkedSubjects: ["지구시스템과학", "통합사회1", "환경", "확률과 통계"],
          desc: "지구 환경 변화 개념을 기후 변화, 생활환경 변화, 온실가스, 환경 재해의 영향 분석으로 연결하는 방향입니다.",
          easy: "기후 변화 원인·영향 비교, 생활환경 변화 사례 정리, 환경 문제 영향 분석 보고서",
          activityExamples: ["기후 변화가 인간 생활에 미치는 영향 비교표", "온실가스와 생활환경 변화 자료 해석", "지역별 환경 변화 사례 조사"]
        });
        pushUniqueContextAxis({
          id: "env_risk_response_management_axis",
          title: "환경 위험·대응 관리 축",
          short: "위험 대응·관리",
          axisDomain: "earth_env",
          priority: -29,
          linkedSubjects: ["지구시스템과학", "통합사회1", "환경", "공통국어1"],
          desc: "환경 변화 자료를 환경 재해, 위험 대응, 적응 전략, 정책 제안과 연결해 환경공학형 문제 해결로 확장하는 방향입니다.",
          easy: "환경 재해 대응 전략, 위험 요인 분류, 적응·완화 정책 제안",
          activityExamples: ["폭염·침수·대기오염 위험 대응 카드 정리", "환경 변화 대응 전략 비교", "지역 환경 위험 저감 방안 제안"]
        });
        pushUniqueContextAxis({
          id: "env_data_monitoring_axis",
          title: "환경 자료·모니터링 축",
          short: "자료·모니터링",
          axisDomain: "data",
          priority: -28,
          linkedSubjects: ["확률과 통계", "정보", "지구시스템과학", "환경"],
          desc: "환경 변화 자료를 표·그래프·시계열로 정리해 환경 지표와 모니터링 기준으로 해석하는 방향입니다.",
          easy: "기온·강수·대기질 자료 그래프, 환경 지표 비교, 자료 기반 모니터링 보고서",
          activityExamples: ["기후·대기질 자료 그래프화", "환경 지표 변화 추세 분석", "자료 기반 환경 관리 기준 제안"]
        });
      }
    } catch (error) {}

    if (isHeatwaveFollowupContext()) {
      if (profile.bucket === "urban") {
        pushIfMissing({
          id: "measurement_urban_spatial",
          title: "도시·공간 환경 분석 축",
          short: "도시·열섬·생활권",
          axisDomain: "urban",
          priority: 1,
          linkedSubjects: ["지구과학", "지구시스템과학", "통합사회1", "한국지리 탐구"],
          desc: "폭염주의보 자료를 도시 열섬, 녹지, 포장 면적, 생활권 차이와 연결해 해석하는 방향입니다.",
          easy: "지역별 기온·체감온도 비교, 녹지·포장 면적 자료 해석, 생활권별 폭염 위험 비교",
          activityExamples: ["도시 열섬 자료 비교", "녹지·포장 면적과 체감온도 관계 정리", "생활권별 폭염 대응 기준 제안"]
        }, "urban");
      }

      if (profile.bucket === "health") {
        pushIfMissing({
          id: "measurement_health_risk",
          title: "생명·건강 위험 해석 축",
          short: "온열질환·취약 대상",
          axisDomain: "health",
          priority: 1,
          linkedSubjects: ["생명과학", "세포와 물질대사", "보건", "확률과 통계"],
          desc: "폭염주의보 자료를 체온 조절, 온열질환, 취약 대상 관찰과 건강 관리 기준으로 연결하는 방향입니다.",
          easy: "온열질환 위험 요인 정리, 취약 대상별 관리 기준 비교, 폭염 대응 건강 자료 보고서",
          activityExamples: ["체온 조절과 온열질환 위험 요인 정리", "노약자·야외근로자 등 취약 대상 관리 기준 비교", "폭염 대응 간호·보건 안내 자료 구성"]
        }, "health", "biology");
      }

      if (profile.bucket === "business") {
        pushIfMissing({
          id: "measurement_decision_risk",
          title: "의사결정·위험 관리 축",
          short: "비용·편익·우선순위",
          axisDomain: "decision",
          priority: 1,
          linkedSubjects: ["통합사회1", "확률과 통계", "경제", "정보"],
          desc: "폭염주의보 자료를 위험 관리, 대응 우선순위, 비용·편익, 의사결정 기준으로 연결하는 방향입니다.",
          easy: "폭염 대응 우선순위 비교, 비용·편익 기준 정리, 의사결정 표 작성",
          activityExamples: ["냉방 지원 정책의 비용·편익 비교", "위험도 기준에 따른 대응 우선순위 설계", "자료 기반 의사결정 표 작성"]
        }, "decision", "business");
      }
    }

    if (isSemiconductorFollowupContext()) {
      if (profile.bucket === "electronics") {
        pushIfMissing({
          id: "semiconductor_electronic_device_system",
          title: "전자·소자 시스템 분석 축",
          short: "회로·신호·전자장치",
          axisDomain: "electronics",
          priority: 1,
          linkedSubjects: ["전자기와 양자", "물리", "정보"],
          desc: "반도체를 전자 이동, 회로, 센서, 신호 처리, 장치 구조와 연결해 해석하는 방향입니다.",
          easy: "전자 이동과 회로 작동, 센서·신호 처리, 반도체 소자 구조 비교",
          activityExamples: ["반도체 소자 작동 원리 정리", "센서와 신호 처리 사례 비교", "회로 속 반도체 역할 보고서"]
        }, "electronics");
      }
      if (profile.bucket === "energy") {
        pushIfMissing({
          id: "semiconductor_energy_conversion_storage",
          title: "에너지·소재 변환 축",
          short: "전환·저장·효율",
          axisDomain: "energy",
          priority: 1,
          linkedSubjects: ["물질과 에너지", "전자기와 양자", "화학"],
          desc: "반도체·소재 개념을 에너지 전환, 저장 효율, 전력 시스템, 신재생 에너지 활용과 연결하는 방향입니다.",
          easy: "에너지 변환 효율 비교, 저장 장치 소재 특성 정리, 전력·신재생 시스템 연결",
          activityExamples: ["반도체 소재와 태양전지 효율 비교", "배터리·전력 저장 소재 특성 정리", "에너지 변환 장치의 물질 특성 보고서"]
        }, "energy");
      }
    }

    return list;
  }


  function getStep34AxisStabilizerBoost(axis) {
    const majorText = [state.career || "", getMajorTextBag(), state.majorSelectedName || ""].join(" ").trim();
    const bucket = detectCareerBucket(majorText || state.career || "");
    const subject = String(state.subject || "");
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    const domain = normalizeAxisDomain(axis?.axisDomain || axis?.axis_domain || "").toLowerCase();
    const axisText = [domain, axis?.title || axis?.axis_title || "", axis?.short || axis?.axis_short || "", axis?.desc || axis?.why || "", ...(Array.isArray(axis?.linkedSubjects) ? axis.linkedSubjects : []), ...(Array.isArray(axis?.next_subjects) ? axis.next_subjects : [])].join(" ");
    const bag = [subject, concept, keyword, axisText].join(" ");
    let score = 0;

    const domainIs = (...values) => values.includes(domain);
    const axisHas = (...values) => values.some(value => new RegExp(value).test(axisText));
    const bagHas = (...values) => values.some(value => new RegExp(value).test(bag));

    // 전공군별 4번 축 1순위 안정화
    if (bucket === "it") {
      if (domainIs("info", "programming", "data", "data_visual", "math", "math_data", "encoding", "signal_media", "compression_transfer")) score += 24;
      if (axisHas("알고리즘|프로그래밍|데이터|정보|부호화|압축|전송|시각화|예측|자동화")) score += 12;
      if (domainIs("biology", "medical", "health", "earth_env", "environment")) score -= 8;
    } else if (bucket === "mechanical") {
      if (domainIs("engineering", "physics", "data")) score += 22;
      if (axisHas("운동|역학|구조|설계|제어|센서|충돌|안전|시뮬레이션|궤도|열역학")) score += 12;
      if (domainIs("biology", "health", "medical", "social_policy")) score -= 8;
    } else if (bucket === "electronic") {
      if (domainIs("engineering", "physics", "data", "info", "signal_media", "biomedical")) score += 22;
      if (axisHas("전기|전자|회로|신호|센서|장치|통신|전력|반도체|소자|전자기")) score += 12;
    } else if (bucket === "materials") {
      if (domainIs("chemistry", "engineering", "physics", "energy")) score += 22;
      if (axisHas("물질|재료|소재|결합|분자|원소|주기|공정|반응|에너지|소자")) score += 12;
      if (domainIs("biology", "health", "medical") && !/바이오|생명|제약|식품/.test(majorText)) score -= 6;
    } else if (bucket === "bio") {
      if (domainIs("biology", "medical", "biomedical", "health", "chemistry", "data")) score += 22;
      if (axisHas("세포|생명|대사|효소|건강|영양|면역|의료|진단|바이오|약물|수용체")) score += 12;
      if (domainIs("engineering") && /의공|의료기기|바이오메디컬/.test(majorText)) score += 16;
      if (domainIs("earth_env", "environment") && !/환경|보건환경|생태/.test(majorText)) score -= 6;
    } else if (bucket === "env") {
      if (domainIs("earth_env", "environment", "earth", "data", "energy", "social_policy")) score += 22;
      if (axisHas("지구|환경|기후|해양|대기|수권|탄소|재난|지속가능|에너지")) score += 12;
      if (domainIs("medical", "health") && !/보건|환경보건/.test(majorText)) score -= 8;
    } else if (bucket === "urban") {
      if (domainIs("engineering", "earth_env", "environment", "data", "social_policy")) score += 18;
      if (axisHas("도시|공간|구조|설계|교통|환경|재난|데이터|지속가능")) score += 12;
    } else if (bucket === "business") {
      if (domainIs("data", "data_visual", "math_data", "social_policy", "public_policy", "info", "smart_service")) score += 18;
      if (axisHas("데이터|의사결정|시장|정책|지표|비교|시각화|정보구조")) score += 12;
    }

    // 키워드별 미세 분기: 같은 개념 안에서 모든 키워드가 같은 4번 축으로 고정되는 현상 완화
    if (bagHas("알고리즘|프로그래밍|자동화|코드|입력|출력|재귀|탐색|정렬")) {
      if (domainIs("programming", "info", "data", "math_data")) score += 18;
    }
    if (bagHas("데이터|그래프|통계|분포|확률|표본|시각화|예측|모델")) {
      if (domainIs("data", "data_visual", "math_data", "info")) score += 18;
    }
    if (bagHas("센서|측정|전류|전압|회로|신호|전자기|유도|파동|통신")) {
      if (domainIs("engineering", "physics", "data", "signal_media", "biomedical")) score += 18;
    }
    if (bagHas("힘|운동|충돌|하중|구조|진동|열|에너지|궤도|안전장치")) {
      if (domainIs("physics", "engineering", "data", "energy")) score += 18;
    }
    if (bagHas("원소|주기율|결합|분자|이온|산화|환원|기체|혼합|조성|공정")) {
      if (domainIs("chemistry", "engineering", "environment", "data")) score += 18;
    }
    if (bagHas("세포|효소|대사|막|수송|건강|면역|유전자|질병|진단|약물")) {
      if (domainIs("biology", "medical", "biomedical", "health", "chemistry", "data")) score += 18;
    }
    if (bagHas("환경|기후|해양|대기|탄소|생태|지구|재난|지속가능|오염")) {
      if (domainIs("earth_env", "environment", "earth", "data", "energy", "social_policy")) score += 18;
    }

    // v87 M-pack lock: 신소재공학과/재료계열은 3번 추천 키워드 선택 후 4번 축이
    // 생명·의료·사회 축으로 밀리지 않도록, 기존 JSON에 존재하는 축의 정렬 점수만 보정한다.
    const isMMaterialsContext = bucket === "materials" || /(신소재공학과|재료공학과|신소재|재료|나노소재|고분자|금속|세라믹|소재)/.test(majorText);
    if (isMMaterialsContext && (/통합과학1|화학|물질과 에너지|전자기와 양자/.test(subject))) {
      const axisKey = [String(axis?.id || axis?.axis_id || ""), axisText].join(" ");
      const boostAxis = (pattern, amount) => {
        if (pattern.test(axisKey)) score += amount;
      };
      const suppressAxis = (pattern, amount) => {
        if (pattern.test(axisKey)) score -= amount;
      };

      if (subject === "통합과학1") {
        if (/물질 구성과 분류/.test(concept)) {
          boostAxis(/matter_chemistry_structure|화학·물질 구조 분석 축|화학.*물질 구조/, 170);
          boostAxis(/matter_material_design|재료·소자 기초 축|재료.*소자/, 150);
          boostAxis(/matter_data_classification|분류·기준 모델링 축|분류.*모델링/, 80);
        }
        if (/규칙성 발견과 주기율표/.test(concept)) {
          boostAxis(/chemistry_prediction|화학·성질 예측 축|성질 예측/, 170);
          boostAxis(/material_design_foundation|재료·소자 설계 기초 축|재료.*소자 설계/, 150);
          boostAxis(/pattern_classification_modeling|패턴·분류 모델링 축|패턴.*분류/, 82);
        }
      }

      if (/^화학|화학Ⅰ|화학1$/.test(subject)) {
        if (/화학 결합/.test(concept)) {
          boostAxis(/bond_structure_axis|결합 구조 해석 축|결합 구조/, 190);
          boostAxis(/material_property_design_axis|물성·소재 설계 축|물성.*소재/, 185);
          boostAxis(/bio_molecular_interaction_axis|분자 상호작용·용해 축|분자 상호작용|용해/, 80);
          suppressAxis(/bio_environment_ion_axis|life_material_application_axis|환경·생체|생활·생체/, 80);
        }
        if (/원소의 주기적 성질/.test(concept)) {
          boostAxis(/material_selection_axis|재료 선택·설계 축|재료 선택|설계/, 185);
          boostAxis(/periodic_property_axis|주기율·성질 예측 축|주기율.*성질/, 180);
          boostAxis(/bio_environment_ion_axis|환경·생체 이온 해석 축|이온 해석/, 60);
        }
        if (/분자의 구조와 성질/.test(concept)) {
          boostAxis(/molecular_shape_axis|분자 구조·극성 축|분자 구조|극성/, 180);
          boostAxis(/intermolecular_force_axis|분자 사이 힘·물성 축|분자 사이 힘|물성/, 170);
          suppressAxis(/life_material_application_axis|생활·생체 물질 적용 축|생활·생체/, 120);
        }
      }

      if (/물질과 에너지/.test(subject)) {
        if (/액체의 물성과 분자 간 힘/.test(concept)) {
          if (/표면 장력|점성|코팅|세정|접착|소재|고분자/.test(keyword)) {
            boostAxis(/material_property_design_axis|소재 물성 설계 축|소재 물성|물성 설계/, 210);
            boostAxis(/intermolecular_force_axis|분자 간 힘·물성 해석 축|분자 간 힘/, 150);
          } else {
            boostAxis(/intermolecular_force_axis|분자 간 힘·물성 해석 축|분자 간 힘/, 195);
            boostAxis(/material_property_design_axis|소재 물성 설계 축|소재 물성|물성 설계/, 185);
          }
          suppressAxis(/drug_solubility_axis|food_processing_axis|bio_fluid_axis|약물|식품|생명·용액/, 180);
        }
      }

      if (/전자기와 양자/.test(subject)) {
        if (/양자와 물질의 상호작용/.test(concept)) {
          if (/광전 효과|레이저|광센서|광자|LED|밴드갭|반도체|소재|나노소재|에너지 준위|원자 스펙트럼/.test(keyword)) {
            boostAxis(/optical_material_application_axis|광·소재 응용 축|광.*소재/, 220);
            boostAxis(/semiconductor_material_design_axis|반도체·소재 설계 축|반도체.*소재/, 200);
            boostAxis(/quantum_device_analysis_axis|양자·소자 해석 축|양자.*소자/, 130);
          }
          suppressAxis(/quantum_information_computing_axis|quantum_technology_society_axis|양자 정보|사회 적용/, 140);
        }
        if (/전기장과 자기장/.test(concept)) {
          boostAxis(/sensor_device_application_axis|센서·장치 응용 축|센서.*장치/, 170);
          boostAxis(/field_particle_analysis_axis|장·입자 해석 축|장·입자/, 160);
          boostAxis(/measurement_data_visual_axis|측정 데이터·시각화 축|측정 데이터/, 100);
          suppressAxis(/medical_field_sensor_axis|의료 센서·영상 응용 축|의료.*영상|의료.*센서/, 180);
        }
      }
    }

    // v86 A-pack lock: 기존 followup-axis 데이터 안에서만 컴퓨터공학과 + 대수/정보의 4번 축 정렬을 고정한다.
    // 새 축이나 새 키워드를 만들지 않고, 현재 JSON에 존재하는 axis_id/axis_title만 가산한다.
    const isAComputerContext = bucket === "it" || /(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|게임|앱|웹|네트워크)/i.test(majorText);
    if (isAComputerContext && (subject === "대수" || subject === "정보")) {
      const axisKey = [String(axis?.id || axis?.axis_id || ""), axisText].join(" ");
      const boostAxis = (pattern, amount) => {
        if (pattern.test(axisKey)) score += amount;
      };

      if (subject === "대수") {
        if (/지수함수와 로그함수의 활용/.test(concept)) {
          // v87 A-1 lock: 기존 3개 축만 사용해 키워드 성격별 1순위를 고정한다.
          // - 채널 용량: 신호·용량 해석 축
          // - 충전 증가: 예측·데이터 해석 축
          // - 지수/로그 모델, 성장/감소, 방사성 붕괴, 별의 등급, 실생활 적용: 실생활 변화 모델링 축
          if (/채널 용량/.test(keyword)) {
            boostAxis(/signal_capacity_interpretation|신호·용량 해석 축|신호·용량/, 104);
            boostAxis(/future_prediction_data|예측·데이터 해석 축|예측·데이터/, 64);
            boostAxis(/real_world_change_modeling|실생활 변화 모델링 축|변화 모델링/, 42);
          } else if (/충전 증가/.test(keyword)) {
            boostAxis(/future_prediction_data|예측·데이터 해석 축|예측·데이터/, 104);
            boostAxis(/real_world_change_modeling|실생활 변화 모델링 축|변화 모델링/, 72);
            boostAxis(/signal_capacity_interpretation|신호·용량 해석 축|신호·용량/, 38);
          } else if (/로그모델/.test(keyword)) {
            boostAxis(/real_world_change_modeling|실생활 변화 모델링 축|변화 모델링/, 142);
            boostAxis(/signal_capacity_interpretation|신호·용량 해석 축|신호·용량/, 50);
            boostAxis(/future_prediction_data|예측·데이터 해석 축|예측·데이터/, 52);
          } else if (/성장|감소/.test(keyword)) {
            boostAxis(/real_world_change_modeling|실생활 변화 모델링 축|변화 모델링/, 118);
            boostAxis(/future_prediction_data|예측·데이터 해석 축|예측·데이터/, 66);
            boostAxis(/signal_capacity_interpretation|신호·용량 해석 축|신호·용량/, 30);
          } else {
            boostAxis(/real_world_change_modeling|실생활 변화 모델링 축|변화 모델링/, 104);
            boostAxis(/future_prediction_data|예측·데이터 해석 축|예측·데이터/, 56);
            boostAxis(/signal_capacity_interpretation|신호·용량 해석 축|신호·용량/, 32);
          }
        }
        if (/등차수열과 등비수열/.test(concept)) {
          if (/반복 규칙|패턴|규칙성/.test(keyword)) {
            boostAxis(/sequence_algorithm_loop|반복 구조·알고리즘 축|반복 구조/, 96);
            boostAxis(/sequence_prediction_model|수열 모델링·예측 축|수열 예측/, 72);
            boostAxis(/sequence_pattern_search|규칙·패턴 탐색 축|패턴 탐색/, 58);
          } else {
            boostAxis(/sequence_prediction_model|수열 모델링·예측 축|수열 예측/, 94);
            boostAxis(/sequence_algorithm_loop|반복 구조·알고리즘 축|반복 구조/, 72);
            boostAxis(/sequence_pattern_search|규칙·패턴 탐색 축|패턴 탐색/, 56);
          }
        }
        if (/수학적 귀납법/.test(concept)) {
          if (/재귀|반복 논리|알고리즘 정당성/.test(keyword)) {
            boostAxis(/recursive_algorithm_validity|재귀·알고리즘 정당성 축|재귀 검증/, 98);
            boostAxis(/induction_proof_logic|귀납 증명·논리 구조 축|귀납 증명/, 70);
            boostAxis(/iterative_condition_validation|반복 조건 검증 축|조건 검증/, 56);
          } else {
            boostAxis(/induction_proof_logic|귀납 증명·논리 구조 축|귀납 증명/, 96);
            boostAxis(/recursive_algorithm_validity|재귀·알고리즘 정당성 축|재귀 검증/, 74);
            boostAxis(/iterative_condition_validation|반복 조건 검증 축|조건 검증/, 50);
          }
        }
      }

      if (subject === "정보") {
        if (/자료와 정보의 분석/.test(concept)) {
          if (/정렬|탐색|검색|데이터베이스|구조/.test(keyword)) {
            boostAxis(/database|데이터베이스·정보구조 축|정보구조/, 96);
            boostAxis(/data_visual|데이터 수집·시각화 축|시각화/, 60);
            boostAxis(/data_decision|데이터 해석·의사결정 축|의사결정/, 50);
          } else if (/의미 있는 정보|예측|판단|의사결정/.test(keyword)) {
            boostAxis(/data_decision|데이터 해석·의사결정 축|의사결정/, 96);
            boostAxis(/data_visual|데이터 수집·시각화 축|시각화/, 60);
            boostAxis(/database|데이터베이스·정보구조 축|정보구조/, 50);
          } else {
            boostAxis(/data_visual|데이터 수집·시각화 축|시각화/, 92);
            boostAxis(/database|데이터베이스·정보구조 축|정보구조/, 68);
            boostAxis(/data_decision|데이터 해석·의사결정 축|의사결정/, 54);
          }
        }
        if (/추상화와 문제 분해/.test(concept)) {
          boostAxis(/problem_design|문제 구조화·알고리즘 설계 축|구조화/, 94);
          boostAxis(/math_modeling|수리 모델링 확장 축|모델링/, 68);
          boostAxis(/process_optimization|시스템 설계·절차 최적화 축|절차 설계/, 58);
        }
        if (/알고리즘 설계와 분석/.test(concept)) {
          if (/정렬|탐색|이진 탐색|순차 탐색|버블 정렬|선택 정렬/.test(keyword)) {
            boostAxis(/search_sort|탐색·정렬 구현 축|탐색·정렬/, 98);
            boostAxis(/algo_opt|알고리즘 최적화 축|최적화/, 74);
            boostAxis(/data_prediction|데이터 처리·예측 축|예측 처리/, 54);
          } else {
            boostAxis(/algo_opt|알고리즘 최적화 축|최적화/, 96);
            boostAxis(/search_sort|탐색·정렬 구현 축|탐색·정렬/, 72);
            boostAxis(/data_prediction|데이터 처리·예측 축|예측 처리/, 56);
          }
        }
        if (/프로그래밍과 자동화/.test(concept)) {
          if (/조건문|반복문|리스트|리스트 내포/.test(keyword)) {
            boostAxis(/logic_control|논리·제어 확장 축|조건·반복/, 98);
            boostAxis(/programming_impl|프로그래밍 구현 축|코드 구현/, 72);
            boostAxis(/automation_sim|자동화·시뮬레이션 축|자동화/, 58);
          } else if (/random 모듈|turtle 그래픽|자동화|시뮬레이션/.test(keyword)) {
            boostAxis(/automation_sim|자동화·시뮬레이션 축|자동화/, 98);
            boostAxis(/programming_impl|프로그래밍 구현 축|코드 구현/, 70);
            boostAxis(/logic_control|논리·제어 확장 축|조건·반복/, 56);
          } else {
            boostAxis(/programming_impl|프로그래밍 구현 축|코드 구현/, 96);
            boostAxis(/logic_control|논리·제어 확장 축|조건·반복/, 72);
            boostAxis(/automation_sim|자동화·시뮬레이션 축|자동화/, 58);
          }
        }
        if (/컴퓨팅 시스템과 네트워크/.test(concept)) {
          if (/센서|피지컬 컴퓨팅|회로|임베디드|장치/.test(keyword)) {
            boostAxis(/embedded_control|센서·임베디드 제어 축|센서 제어/, 96);
            boostAxis(/network_system|시스템·네트워크 구조 축|네트워크 구조/, 68);
            boostAxis(/platform_security|협업 플랫폼·보안 운영 축|플랫폼 보안/, 50);
          } else if (/보안|계정|접근 권한|플랫폼|협업 도구/.test(keyword)) {
            boostAxis(/platform_security|협업 플랫폼·보안 운영 축|플랫폼 보안/, 96);
            boostAxis(/network_system|시스템·네트워크 구조 축|네트워크 구조/, 68);
            boostAxis(/embedded_control|센서·임베디드 제어 축|센서 제어/, 48);
          } else {
            boostAxis(/network_system|시스템·네트워크 구조 축|네트워크 구조/, 94);
            boostAxis(/embedded_control|센서·임베디드 제어 축|센서 제어/, 60);
            boostAxis(/platform_security|협업 플랫폼·보안 운영 축|플랫폼 보안/, 52);
          }
        }
      }
    }

    // v88.8 D1-lock: 데이터사이언스/통계 계열은 4번 후보가 프로그래밍/공학 일반 축으로만 몰리지 않고
    // 데이터 분포·표본·추정·시각화·의사결정 축이 먼저 보이도록 보정한다.
    if (isDataScienceMajorSelectedContext()) {
      const axisKey = [String(axis?.id || axis?.axis_id || ""), axisText].join(" ");
      const boostAxis = (pattern, amount) => { if (pattern.test(axisKey)) score += amount; };
      const suppressAxis = (pattern, amount) => { if (pattern.test(axisKey)) score -= amount; };
      if (/확률과 통계/.test(subject)) {
        if (/확률변수와 확률분포/.test(concept)) {
          boostAxis(/distribution_modeling_axis|데이터 분포·모델링 축|분포.*모델링/, 260);
          boostAxis(/statistical_indicator_interpretation_axis|통계 지표 해석 축|통계 지표|기댓값|분산|표준편차/, 230);
          boostAxis(/data_visualization_distribution_axis|데이터 시각화 축|시각화|그래프/, 210);
          suppressAxis(/expected_value_decision_axis|의사결정|게임|조합|경우의 수/, 90);
        }
        if (/이항분포와 정규분포/.test(concept)) {
          boostAxis(/distribution_prediction_model_axis|분포 모델·예측 축|분포.*예측/, 260);
          boostAxis(/standardization_comparison_axis|표준화·비교 분석 축|표준화.*비교|표준화/, 230);
          boostAxis(/data_based_decision_axis|데이터 기반 의사결정 축|데이터 기반|의사결정/, 205);
          suppressAxis(/model_approximation_axis|근사|게임|조합|경우의 수/, 80);
        }
        if (/통계적 추정/.test(concept)) {
          boostAxis(/sampling_estimation_design_axis|표본·추정 설계 축|표본.*추정|표본 설계/, 260);
          boostAxis(/confidence_interval_error_axis|신뢰구간·오차 해석 축|신뢰구간|추정 오차|표준오차/, 235);
          boostAxis(/model_evaluation_uncertainty_axis|모델 평가 축|모델 평가|불확실성/, 210);
          suppressAxis(/data_decision_support_axis|경제|경영|사회/, 70);
        }
        if (/모집단과 표본/.test(concept)) {
          boostAxis(/sampling_design_axis|표본 설계·자료 수집 축|표본 설계/, 180);
          boostAxis(/sampling_error_reliability_axis|표본오차·신뢰도 축|신뢰도/, 160);
          boostAxis(/survey_data_interpretation_axis|조사 데이터 해석 축|조사 데이터/, 120);
        }
        if (/조건부확률과 사건의 독립/.test(concept)) {
          boostAxis(/data_classification_prediction_axis|데이터 분류·예측 판단 축|분류.*예측/, 170);
          boostAxis(/conditional_decision_risk_axis|조건부 판단·리스크 해석 축|조건부 판단/, 150);
          boostAxis(/independence_validation_axis|독립성 검증 축|독립성/, 120);
        }
        suppressAxis(/충돌|기계|소재|의료|간호|공정|부식|회로|안전 설계/, 110);
      }
      if (subject === "정보") {
        if (/자료와 정보의 분석/.test(concept)) {
          boostAxis(/data_visual|데이터 수집·시각화 축|시각화/, 180);
          boostAxis(/database|데이터베이스·정보구조 축|정보구조/, 160);
          boostAxis(/data_decision|데이터 해석·의사결정 축|의사결정/, 150);
        }
        if (/알고리즘 설계와 분석/.test(concept)) {
          boostAxis(/algo_opt|알고리즘 최적화 축|최적화/, 160);
          boostAxis(/search_sort|탐색·정렬 구현 축|탐색·정렬/, 150);
          boostAxis(/data_prediction|데이터 처리·예측 축|예측 처리/, 140);
        }
        if (/추상화와 문제 분해/.test(concept)) {
          boostAxis(/problem_design|문제 구조화·알고리즘 설계 축|구조화/, 160);
          boostAxis(/math_modeling|수리 모델링 확장 축|모델링/, 150);
          boostAxis(/process_optimization|시스템 설계·절차 최적화 축|절차 설계/, 110);
        }
      }
      if (/대수/.test(subject)) {
        if (/지수함수와 로그함수의 활용/.test(concept)) {
          boostAxis(/data_change_modeling_axis|변화 모델링 축|변화 모델링/, 240);
          boostAxis(/log_scale_data_interpretation_axis|로그 스케일 해석 축|로그 스케일/, 220);
          boostAxis(/data_prediction_trend_axis|데이터 예측 축|데이터 예측|예측/, 205);
          suppressAxis(/signal_capacity_interpretation|신호·용량|회로|전자|반도체/, 100);
        }
      }
      if (/미적분1/.test(subject)) {
        if (/도함수의 활용/.test(concept)) {
          boostAxis(/optimization_gradient_axis|변화율·최적화 축|변화율.*최적화|최적화/, 240);
          boostAxis(/model_sensitivity_analysis_axis|모델 민감도 분석 축|민감도/, 220);
          boostAxis(/data_prediction_rate_axis|데이터 기반 예측 축|데이터.*예측|예측/, 205);
          suppressAxis(/tangent_graph_axis|접선|motion_rate_mechanics_axis|기계|운동 변화율/, 95);
        }
        if (/정적분의 활용/.test(concept)) {
          boostAxis(/accumulated_data_model_axis|누적 데이터 해석 축|누적 데이터/, 235);
          boostAxis(/numerical_approximation_simulation_axis|수치 근사·시뮬레이션 축|수치 근사/, 215);
          boostAxis(/distribution_area_interpretation_axis|분포 면적·확률 해석 축|분포 면적|확률/, 195);
          suppressAxis(/work_energy_accumulation_axis|일·에너지|기계/, 90);
        }
      }
    }

    return score;
  }

  function getCareerAxisBoost(axis) {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const concept = state.concept || "";
    const text = [state.keyword || "", concept, axis?.title || axis?.axis_title || "", axis?.short || "", axis?.axisDomain || axis?.axis_domain || ""].join(" ");
    const bucket = detectCareerBucket(majorText || state.career || "");
    const domain = normalizeAxisDomain(axis?.axisDomain || axis?.axis_domain || "").toLowerCase();
    let score = 0;
    score += getMajorRoutingAxisBoost(axis);
    score += getHeatwaveAxisContextBoost(axis);
    score += getSemiconductorAxisContextBoost(axis);
    score += getStep34AxisStabilizerBoost(axis);

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
    const keys = getSubjectRuntimeKeys(state.subject);
    for (const key of keys) {
      if (conceptLongitudinalMaps[key]) return conceptLongitudinalMaps[key];
    }
    const values = Object.values(conceptLongitudinalMaps || {});
    return values.find(map => keys.some(key => fuzzyIncludes(map?.subject_name, key))) || null;
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
    const displayCareerName = inferDisplayMajorName(careerText || getPrimaryMajorRoutingText());

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

    const profileRelation = getAxisRelationByMajorProfile(buildMajorRoutingProfile(getMajorRoutingText() || careerText), axisLike);
    if (profileRelation) return profileRelation;

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
        message: `${displayCareerName}와 바로 이어지는 축입니다.`
      };
    }
    if (type === "bridge") {
      return {
        type,
        label: "역량 브리지",
        score: 6,
        message: `${displayCareerName}와 직접 일치하지 않아도 역량 연결이 가능한 축입니다.`
      };
    }
    return {
      type: "general",
      label: "일반 탐구",
      score: 0,
      message: `${displayCareerName}와 직접 매핑이 약해도 탐구 확장용으로 활용 가능한 축입니다.`
    };
  }


  function buildConceptMappedAxes(entry) {
    const axes = entry && Array.isArray(entry.longitudinal_axes)
      ? entry.longitudinal_axes
      : (entry && Array.isArray(entry.axes) ? entry.axes : []);
    if (!entry || !axes.length) return [];
    return axes.map(axis => {
      const relationMeta = getAxisCareerRelationMeta(state.subject, axis);
      return {
        id: axis.axis_id,
        title: axis.axis_title,
        short: axis.axis_short || entry.concept_label || state.concept,
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



  function isChemistry1PureChemistryContext(mappedEntry) {
    try {
      const isChemSubject = /^(화학|화학Ⅰ|화학1)$/.test(String(state.subject || ""));
      if (!isChemSubject) return false;
      const majorText = [
        state.career || "",
        state.majorSelectedName || "",
        getEffectiveCareerName?.() || "",
        getCareerInputText?.() || "",
        getMajorPanelResolvedName?.() || "",
        typeof getMajorTextBag === "function" ? getMajorTextBag() : ""
      ].join(" ").replace(/\s+/g, " ").trim();
      const majorKind = (typeof getChemistry1MajorKind === "function" ? getChemistry1MajorKind() : "");
      const isPureChemistryMajor = majorKind === "chemistry" || /(^|[^공])화학과|응용화학과|화학생명학과|화학전공/.test(majorText);
      if (!isPureChemistryMajor) return false;
      const conceptText = [
        state.concept || "",
        mappedEntry?.concept_name || "",
        mappedEntry?.concept_label || ""
      ].join(" ").replace(/\s+/g, " ").trim();
      return /현대의 원자 모형과 전자 배치|화학 결합|분자의 구조와 성질|물질의 양과 화학 반응식|화학 반응에서의 동적 평형|화학 반응과 열의 출입|탄소 화합물의 유용성|원소의 주기적 성질|원자의 구조/.test(conceptText);
    } catch (error) {
      return false;
    }
  }

  function buildChemistry1PureChemistryForcedAxes() {
    const conceptText = String(state.concept || "");
    const keywordText = String(state.keyword || "");
    const make = (seed, index) => {
      const axis = makeContextFollowupAxis(seed);
      return {
        ...axis,
        relationType: "direct",
        relationLabel: "직접 연계 강함",
        reason: "화학과의 기초 화학 탐구와 바로 이어지는 축입니다.",
        __priority: index + 1,
        __relationScore: 44,
        __score: 1120 - index
      };
    };
    const atomElectronAxis = {
      id: "pure_chem_atom_electron_axis",
      title: "원자 구조·전자 배치 해석 축",
      short: "원자 구조·전자 배치",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자", "화학과"],
      desc: "원자 모형, 에너지 준위, 오비탈, 전자 배치를 원소의 성질과 스펙트럼 해석으로 연결하는 방향입니다.",
      easy: "전자 배치와 에너지 준위를 바탕으로 원소의 성질·스펙트럼을 비교하는 보고서",
      activityExamples: ["전자 배치와 주기율표 위치 비교", "에너지 준위와 선 스펙트럼 해석", "오비탈 모형 기반 원소 성질 정리"]
    };
    const periodicSpectrumAxis = {
      id: "pure_chem_periodic_spectrum_axis",
      title: "주기성·스펙트럼 분석 축",
      short: "주기성·스펙트럼",
      axisDomain: "chemistry",
      priority: 2,
      linkedSubjects: ["화학", "전자기와 양자", "물리", "화학과"],
      desc: "전자 배치와 유효 핵전하를 원소의 주기적 성질, 이온화 에너지, 선 스펙트럼 비교로 확장하는 방향입니다.",
      easy: "주기율표 위치에 따른 이온화 에너지·원자 반지름·스펙트럼 차이를 정리하는 보고서",
      activityExamples: ["주기별 이온화 에너지 변화 그래프", "스펙트럼 자료 비교", "전자 배치와 원소 성질 연결"]
    };
    const bondStructureAxis = {
      id: "pure_chem_bond_structure_axis",
      title: "결합 구조·전자쌍 해석 축",
      short: "결합 구조·전자쌍",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자", "화학과"],
      desc: "원자가 전자, 이온 결합, 공유 결합, 전기음성도 개념을 결합 구조와 전자쌍 배치 해석으로 연결하는 방향입니다.",
      easy: "루이스 전자점식과 전기음성도 차이로 결합 종류와 분자 구조를 비교하는 보고서",
      activityExamples: ["결합 종류 판별표 작성", "전기음성도와 결합 극성 비교", "루이스 구조와 전자쌍 배치 해석"]
    };
    const molecularPropertyAxis = {
      id: "pure_chem_molecular_property_axis",
      title: "분자 구조·물성 예측 축",
      short: "분자 구조·물성",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "생명과학", "화학과"],
      desc: "전자쌍 반발, 결합각, 극성, 분자 사이 힘을 끓는점·용해도·물성 예측으로 확장하는 방향입니다.",
      easy: "분자 구조와 극성, 수소 결합 여부에 따라 끓는점·용해도 차이를 비교하는 보고서",
      activityExamples: ["분자 구조 모형 비교", "극성과 용해도 관계 정리", "분자 사이 힘과 끓는점 차이 분석"]
    };
    const stoichAxis = {
      id: "pure_chem_stoichiometry_quant_axis",
      title: "정량·반응식 분석 축",
      short: "정량·반응식",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "확률과 통계", "물질과 에너지", "화학과"],
      desc: "몰, 화학식량, 반응식 계수비를 정량 계산과 실험 오차 분석으로 연결하는 방향입니다.",
      easy: "몰 계산, 반응식 계수비, 수득률과 오차 요인을 정리하는 정량 분석 보고서",
      activityExamples: ["반응식 계수비 계산", "몰 농도·희석 계산", "수득률과 오차 원인 분석"]
    };
    const equilibriumAxis = {
      id: "pure_chem_equilibrium_acidbase_axis",
      title: "평형·산염기 해석 축",
      short: "평형·산염기",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "확률과 통계", "화학과"],
      desc: "동적 평형, 평형 이동, pH, 산·염기 개념을 반응 조건 변화와 평형 해석으로 연결하는 방향입니다.",
      easy: "농도·온도·pH 변화가 평형과 반응 진행 방향에 미치는 영향을 정리하는 보고서",
      activityExamples: ["평형 이동 조건 비교", "pH와 중화 반응 해석", "완충 용액 사례 조사"]
    };
    const thermoRedoxAxis = {
      id: "pure_chem_thermo_redox_axis",
      title: "산화환원·열화학 해석 축",
      short: "산화환원·열화학",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자", "화학과"],
      desc: "산화수, 전자 이동, 전지, 반응열을 에너지 출입과 화학 반응의 방향성 해석으로 연결하는 방향입니다.",
      easy: "산화수 변화와 전자 이동, 발열·흡열 반응을 비교해 에너지 변화를 설명하는 보고서",
      activityExamples: ["산화수 변화 추적", "전지 반응의 전자 이동 정리", "발열·흡열 반응 에너지 비교"]
    };
    const organicAxis = {
      id: "pure_chem_organic_structure_axis",
      title: "유기 구조·작용기 해석 축",
      short: "유기 구조·작용기",
      axisDomain: "chemistry",
      priority: 2,
      linkedSubjects: ["화학", "생명과학", "세포와 물질대사", "화학과"],
      desc: "탄소 화합물과 작용기를 유기 분자의 구조, 성질, 생활 속 활용 사례로 연결하는 방향입니다.",
      easy: "작용기별 구조와 성질, 활용 사례를 비교하는 유기 화학 기초 보고서",
      activityExamples: ["작용기별 성질 비교", "탄소 화합물 구조식 정리", "생활 속 유기 물질 사례 분석"]
    };


    // v90.1 Q3-lock: 화학과 대표 3개(화학 결합/원소의 주기적 성질/분자의 구조와 성질)는
    // 응용 전공축이 아니라 순수 화학 원리축 3개가 직접 뜨도록 별도 후보를 둔다.
    const pureChemBondInterpretAxis = {
      id: "pure_chem_bond_interpret_axis",
      title: "결합 구조 해석 축",
      short: "결합 구조 해석",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자", "화학과"],
      desc: "공유 결합, 이온 결합, 원자가 전자, 전기음성도를 결합 형성과 구조 해석으로 연결하는 방향입니다.",
      easy: "결합 종류와 전기음성도 차이를 기준으로 결합 구조를 비교하는 보고서",
      activityExamples: ["공유 결합과 이온 결합 비교", "전기음성도 차이로 결합 극성 판단", "루이스 전자점식 기반 결합 구조 정리"]
    };
    const pureChemElectronPairMoleculeAxis = {
      id: "pure_chem_electron_pair_molecule_axis",
      title: "전자쌍·분자 구조 해석 축",
      short: "전자쌍·분자 구조",
      axisDomain: "chemistry",
      priority: 2,
      linkedSubjects: ["화학", "물질과 에너지", "전자기와 양자", "화학과"],
      desc: "공유 전자쌍과 비공유 전자쌍의 배치를 분자 구조, 결합각, 극성 판단으로 확장하는 방향입니다.",
      easy: "전자쌍 배치와 분자 구조를 연결해 극성 여부를 판단하는 보고서",
      activityExamples: ["전자쌍 배치 모형 그리기", "결합각과 분자 구조 비교", "극성 분자와 무극성 분자 판별"]
    };
    const pureChemBondPropertyPredictAxis = {
      id: "pure_chem_bond_property_predict_axis",
      title: "결합과 물성 예측 축",
      short: "결합·물성 예측",
      axisDomain: "chemistry",
      priority: 3,
      linkedSubjects: ["화학", "물질과 에너지", "화학과"],
      desc: "결합 종류와 분자 구조를 녹는점, 끓는점, 전도성, 용해도 같은 물성 예측으로 연결하는 방향입니다.",
      easy: "결합 특성에 따라 물질의 물성이 달라지는 이유를 비교하는 보고서",
      activityExamples: ["결합 종류별 물성 비교표", "전도성·녹는점 차이 분석", "용해도와 결합 특성 연결"]
    };
    const pureChemPeriodicityPredictAxis = {
      id: "pure_chem_periodicity_predict_axis",
      title: "주기율·성질 예측 축",
      short: "주기율·성질 예측",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "전자기와 양자", "물질과 에너지", "화학과"],
      desc: "주기율표 위치와 주기성을 바탕으로 원자 반지름, 이온화 에너지, 전기음성도 변화를 예측하는 방향입니다.",
      easy: "주기율표 위치에 따른 원소 성질 변화를 그래프와 표로 해석하는 보고서",
      activityExamples: ["주기별 이온화 에너지 변화 그래프", "원자 반지름 변화 비교", "전기음성도 변화와 결합 경향 정리"]
    };
    const pureChemAtomicPropertyCompareAxis = {
      id: "pure_chem_atomic_property_compare_axis",
      title: "원자 구조·성질 비교 축",
      short: "원자 구조·성질 비교",
      axisDomain: "chemistry",
      priority: 2,
      linkedSubjects: ["화학", "전자기와 양자", "화학과"],
      desc: "유효 핵전하, 전자 배치, 원자 반지름을 서로 다른 원소의 성질 차이와 비교하는 방향입니다.",
      easy: "전자 배치와 유효 핵전하가 원소 성질 차이를 만드는 과정을 비교하는 보고서",
      activityExamples: ["같은 주기 원소의 성질 비교", "전자 배치와 이온화 에너지 연결", "유효 핵전하 변화 해석"]
    };
    const pureChemElementBondTrendAxis = {
      id: "pure_chem_element_bond_trend_axis",
      title: "원소 성질과 결합 경향 분석 축",
      short: "원소 성질·결합 경향",
      axisDomain: "chemistry",
      priority: 3,
      linkedSubjects: ["화학", "물질과 에너지", "화학과"],
      desc: "금속성, 비금속성, 전기음성도 같은 원소 성질을 이온 결합·공유 결합 형성 경향과 연결하는 방향입니다.",
      easy: "원소의 주기적 성질이 결합 종류와 물질 성질에 어떻게 이어지는지 정리하는 보고서",
      activityExamples: ["금속성과 비금속성 비교", "전기음성도와 결합 유형 연결", "원소 성질에 따른 화합물 형성 경향 분석"]
    };
    const pureChemMolecularStructurePropertyAxis = {
      id: "pure_chem_molecular_structure_property_axis",
      title: "분자 구조·물성 예측 축",
      short: "분자 구조·물성 예측",
      axisDomain: "chemistry",
      priority: 1,
      linkedSubjects: ["화학", "물질과 에너지", "화학과"],
      desc: "분자 구조, 결합각, 극성을 끓는점, 녹는점, 용해도 같은 물성 예측으로 연결하는 방향입니다.",
      easy: "분자 구조와 극성이 물성 차이로 이어지는 과정을 비교하는 보고서",
      activityExamples: ["분자 모형과 물성 비교", "극성 여부에 따른 용해도 비교", "분자 구조와 끓는점 차이 분석"]
    };
    const pureChemIntermolecularInteractionAxis = {
      id: "pure_chem_intermolecular_interaction_axis",
      title: "분자 간 힘·상호작용 축",
      short: "분자 간 힘·상호작용",
      axisDomain: "chemistry",
      priority: 2,
      linkedSubjects: ["화학", "물질과 에너지", "화학과"],
      desc: "수소 결합, 분산력, 쌍극자-쌍극자 힘을 분자 사이 상호작용과 물성 차이로 확장하는 방향입니다.",
      easy: "분자 간 힘의 종류에 따라 끓는점·점성·용해도가 달라지는 이유를 정리하는 보고서",
      activityExamples: ["분자 간 힘 종류별 비교", "수소 결합 유무와 끓는점 비교", "상호작용 세기와 물성 차이 해석"]
    };
    const pureChemSolubilityPolarityAxis = {
      id: "pure_chem_solubility_polarity_axis",
      title: "용해도·극성 해석 축",
      short: "용해도·극성",
      axisDomain: "chemistry",
      priority: 3,
      linkedSubjects: ["화학", "물질과 에너지", "화학과"],
      desc: "분자의 극성과 용매의 성질을 용해도 차이, 친수성·소수성, 혼합 가능성 해석으로 연결하는 방향입니다.",
      easy: "극성 분자와 무극성 분자의 용해도 차이를 용매 성질과 함께 설명하는 보고서",
      activityExamples: ["극성/무극성 분자의 용해도 비교", "물과 기름의 혼합성 해석", "용매 선택 기준 정리"]
    };

    // 대표 3개 개념은 개념명을 우선한다. 같은 키워드(예: 전기음성도)가 다른 개념에도 쓰여도
    // 선택한 3번 개념의 방향성이 4번 후보군을 결정하도록 고정한다.
    if (/화학 결합/.test(conceptText)) {
      return [make(pureChemBondInterpretAxis, 0), make(pureChemElectronPairMoleculeAxis, 1), make(pureChemBondPropertyPredictAxis, 2)];
    }
    if (/원소의 주기적 성질/.test(conceptText)) {
      return [make(pureChemPeriodicityPredictAxis, 0), make(pureChemAtomicPropertyCompareAxis, 1), make(pureChemElementBondTrendAxis, 2)];
    }
    if (/분자의 구조와 성질/.test(conceptText)) {
      return [make(pureChemMolecularStructurePropertyAxis, 0), make(pureChemIntermolecularInteractionAxis, 1), make(pureChemSolubilityPolarityAxis, 2)];
    }
    if (/현대의 원자 모형과 전자 배치|원자의 구조/.test(conceptText) || /오비탈|전자 배치|에너지 준위|선 스펙트럼|양자수/.test(keywordText)) {
      return [make(atomElectronAxis, 0), make(periodicSpectrumAxis, 1), make(pureChemPeriodicityPredictAxis, 2)];
    }
    if (/원자가 전자|공유 결합|이온 결합|전기음성도|결합의 극성|루이스|비공유 전자쌍/.test(keywordText)) {
      return [make(pureChemBondInterpretAxis, 0), make(pureChemElectronPairMoleculeAxis, 1), make(pureChemBondPropertyPredictAxis, 2)];
    }
    if (/이온화 에너지|주기율|원자 반지름|금속성|비금속성|유효 핵전하/.test(keywordText)) {
      return [make(pureChemPeriodicityPredictAxis, 0), make(pureChemAtomicPropertyCompareAxis, 1), make(pureChemElementBondTrendAxis, 2)];
    }
    if (/분자 구조|분자의 극성|수소 결합|분자 사이 힘|끓는점|용해도|결합각|쌍극자/.test(keywordText)) {
      return [make(pureChemMolecularStructurePropertyAxis, 0), make(pureChemIntermolecularInteractionAxis, 1), make(pureChemSolubilityPolarityAxis, 2)];
    }
    if (/물질의 양과 화학 반응식/.test(conceptText) || /몰|화학식량|분자량|반응식|계수비|수율|정량|농도|희석/.test(keywordText)) {
      return [make(stoichAxis, 0), make(equilibriumAxis, 1), make(thermoRedoxAxis, 2)];
    }
    if (/화학 반응에서의 동적 평형/.test(conceptText) || /동적 평형|평형 이동|가역|pH|산|염기|완충|중화/.test(keywordText)) {
      return [make(equilibriumAxis, 0), make(stoichAxis, 1), make(thermoRedoxAxis, 2)];
    }
    if (/화학 반응과 열의 출입/.test(conceptText) || /산화|환원|전자 이동|전지|반응열|발열|흡열|엔탈피/.test(keywordText)) {
      return [make(thermoRedoxAxis, 0), make(equilibriumAxis, 1), make(stoichAxis, 2)];
    }
    if (/탄소 화합물의 유용성/.test(conceptText) || /탄소 화합물|고분자|작용기|의약품|플라스틱|유기/.test(keywordText)) {
      return [make(organicAxis, 0), make(molecularPropertyAxis, 1), make(stoichAxis, 2)];
    }
    return [make(atomElectronAxis, 0), make(bondStructureAxis, 1), make(molecularPropertyAxis, 2)];
  }


  function isChemistry1FoodContext(mappedEntry) {
    try {
      const isChemSubject = /^(화학|화학Ⅰ|화학1)$/.test(String(state.subject || ""));
      if (!isChemSubject) return false;
      if (typeof getChemistry1MajorKind !== "function" || getChemistry1MajorKind() !== "food") return false;
      const conceptText = [
        state.concept || "",
        mappedEntry?.concept_name || "",
        mappedEntry?.concept_label || ""
      ].join(" ").replace(/\s+/g, " ").trim();
      return /탄소 화합물의 유용성|분자의 구조와 성질|화학 반응에서의 동적 평형|물질의 양과 화학 반응식|화학 반응과 열의 출입/.test(conceptText);
    } catch (error) {
      return false;
    }
  }

  function buildChemistry1FoodForcedAxes() {
    const conceptText = String(state.concept || "");
    const keywordText = String(state.keyword || "");
    const make = (seed, index) => {
      const axis = makeContextFollowupAxis(seed);
      return {
        ...axis,
        relationType: "direct",
        relationLabel: "직접 연계 강함",
        reason: "식품영양/식품공학과와 바로 이어지는 축입니다.",
        __priority: index + 1,
        __relationScore: 42,
        __score: 1100 - index
      };
    };
    const nutrientAxis = {
      id: "food_nutrient_structure_axis",
      title: "식품 성분·영양 구조 해석 축",
      short: "식품 성분·영양 구조",
      axisDomain: "biology",
      priority: 1,
      linkedSubjects: ["화학", "생명과학", "세포와 물질대사", "식품영양학과"],
      desc: "탄수화물, 단백질, 지질, 작용기와 같은 탄소 화합물 개념을 식품 성분과 영양소 구조 분석으로 연결하는 방향입니다.",
      easy: "식품 성분표를 바탕으로 탄수화물·단백질·지질 구조와 기능을 비교하는 보고서",
      activityExamples: ["식품 성분표에서 주요 영양소 분류", "탄수화물·단백질·지질 구조 비교", "작용기와 식품 성분 기능 연결"]
    };
    const propertyAxis = {
      id: "food_solubility_texture_axis",
      title: "식품 물성·용해도 해석 축",
      short: "식품 물성·용해도",
      axisDomain: "chemistry",
      priority: 2,
      linkedSubjects: ["화학", "물질과 에너지", "생명과학", "식품공학과"],
      desc: "분자 구조, 극성, 수소 결합, 분자 사이 힘을 식품의 용해도, 점성, 유화, 수분 보유와 연결하는 방향입니다.",
      easy: "수분·점성·유화·용해도 같은 식품 물성을 분자 구조와 연결해 해석하는 보고서",
      activityExamples: ["극성과 용해도 비교", "식품의 점성·유화 사례 조사", "수소 결합과 수분 보유 특성 연결"]
    };
    const phAxis = {
      id: "food_ph_preservation_axis",
      title: "식품 pH·보존 안정성 축",
      short: "pH·보존 안정성",
      axisDomain: "biology",
      priority: 1,
      linkedSubjects: ["화학", "세포와 물질대사", "생명과학", "식품영양학과"],
      desc: "pH, 산·염기, 완충, 평형 개념을 식품 산도, 발효, 미생물 성장, 보존 안정성과 연결하는 방향입니다.",
      easy: "pH 변화가 식품 보존성·발효·품질 변화에 미치는 영향을 정리하는 보고서",
      activityExamples: ["식품별 pH 비교표 작성", "발효 식품 산도 변화 조사", "pH와 미생물 성장 조건 연결"]
    };
    const quantAxis = {
      id: "food_concentration_quant_axis",
      title: "식품 농도·정량 분석 축",
      short: "농도·정량 분석",
      axisDomain: "chemistry",
      priority: 3,
      linkedSubjects: ["화학", "확률과 통계", "생명과학", "식품공학과"],
      desc: "몰 농도, 희석, 용액, 정량 분석 개념을 당도·염도·시료 분석과 연결하는 방향입니다.",
      easy: "당도·염도·농도 계산과 시료 분석 오차를 정리하는 보고서",
      activityExamples: ["희석 배율과 농도 계산", "당도·염도 측정값 비교", "시료 분석 오차 요인 정리"]
    };
    const heatAxis = {
      id: "food_heat_quality_axis",
      title: "식품 열처리·품질 변화 축",
      short: "열처리·품질 변화",
      axisDomain: "chemistry",
      priority: 3,
      linkedSubjects: ["화학", "물질과 에너지", "생명과학", "식품공학과"],
      desc: "발열·흡열, 산화·환원, 온도 조건을 식품 저장, 갈변, 열처리와 품질 변화로 연결하는 방향입니다.",
      easy: "가열·냉각·산화 조건에 따른 식품 품질 변화를 분석하는 보고서",
      activityExamples: ["저장 온도와 품질 변화 비교", "갈변 반응 사례 조사", "열처리와 안정성 조건 정리"]
    };
    if (/화학 반응에서의 동적 평형/.test(conceptText) || /pH|산도|완충|발효|부패|미생물|보존/.test(keywordText)) {
      return [make(phAxis, 0), make(nutrientAxis, 1), make(quantAxis, 2)];
    }
    if (/분자의 구조와 성질/.test(conceptText) || /용해도|극성|수소 결합|유화|점성|수분|물성/.test(keywordText)) {
      return [make(propertyAxis, 0), make(nutrientAxis, 1), make(phAxis, 2)];
    }
    if (/물질의 양과 화학 반응식/.test(conceptText) || /농도|희석|정량|당도|염도|시료/.test(keywordText)) {
      return [make(quantAxis, 0), make(nutrientAxis, 1), make(propertyAxis, 2)];
    }
    if (/화학 반응과 열의 출입/.test(conceptText) || /가열|냉각|갈변|산화|열|저장/.test(keywordText)) {
      return [make(heatAxis, 0), make(phAxis, 1), make(propertyAxis, 2)];
    }
    return [make(nutrientAxis, 0), make(propertyAxis, 1), make(phAxis, 2)];
  }

  function isChemistry1PharmacyContext(mappedEntry) {
    try {
      const isChemSubject = /^(화학|화학Ⅰ|화학1)$/.test(String(state.subject || ""));
      if (!isChemSubject) return false;
      if (typeof getChemistry1MajorKind !== "function" || getChemistry1MajorKind() !== "pharmacy") return false;
      const conceptText = [
        state.concept || "",
        mappedEntry?.concept_name || "",
        mappedEntry?.concept_label || ""
      ].join(" ").replace(/\s+/g, " ").trim();
      return /탄소 화합물의 유용성|분자의 구조와 성질|화학 반응에서의 동적 평형|물질의 양과 화학 반응식/.test(conceptText);
    } catch (error) {
      return false;
    }
  }

  function buildChemistry1PharmacyForcedAxes() {
    const conceptText = String(state.concept || "");
    const keywordText = String(state.keyword || "");
    const make = (seed, index) => {
      const axis = makeContextFollowupAxis(seed);
      return {
        ...axis,
        relationType: "direct",
        relationLabel: "직접 연계 강함",
        reason: "약학과와 바로 이어지는 축입니다.",
        __priority: index + 1,
        __relationScore: 42,
        __score: 1100 - index
      };
    };
    const drugStructureAxis = {
      id: "drug_structure_function_axis",
      title: "의약품 구조·작용기 해석 축",
      short: "의약품 구조·작용기",
      axisDomain: "health",
      priority: 1,
      linkedSubjects: ["화학", "세포와 물질대사", "생명과학", "약학과"],
      desc: "탄소 화합물과 작용기 개념을 의약품 구조, 생체 분자, 약물 작용 원리와 연결하는 방향입니다.",
      easy: "의약품 구조식의 작용기 표시, 친수성·소수성 비교, 약물 작용 원리 정리",
      activityExamples: ["대표 의약품 구조식에서 작용기 찾기", "작용기와 물성·흡수 가능성 연결", "의약품 구조와 생체 분자 상호작용 비교"]
    };
    const solubilityAxis = {
      id: "drug_solubility_absorption_axis",
      title: "약물 용해도·흡수 해석 축",
      short: "용해도·흡수",
      axisDomain: "health",
      priority: 2,
      linkedSubjects: ["화학", "세포와 물질대사", "생명과학", "약학과"],
      desc: "분자 구조, 극성, 수소 결합, 분자 사이 힘을 약물 용해도, 세포막 통과, 흡수 과정과 연결하는 방향입니다.",
      easy: "극성·수소 결합에 따른 용해도 비교, 약물 흡수 조건 정리",
      activityExamples: ["극성과 용해도 관계 비교표", "친수성·소수성 약물의 흡수 조건 비교", "분자 사이 힘과 제형 특성 연결"]
    };
    const dosageAxis = {
      id: "dosage_concentration_quant_axis",
      title: "투약 농도·정량 계산 축",
      short: "농도·정량 계산",
      axisDomain: "chemistry",
      priority: 3,
      linkedSubjects: ["화학", "확률과 통계", "생명과학", "약학과"],
      desc: "몰, 몰 농도, 희석, 반응식 개념을 투약 농도, 용액 조제, 정량 분석으로 연결하는 방향입니다.",
      easy: "몰 농도와 희석 계산, 투약 농도 비교, 정량 분석 오차 정리",
      activityExamples: ["희석 배율과 농도 계산표 작성", "투약 농도 변화 시뮬레이션", "정량 분석 오차 요인 정리"]
    };
    const phStabilityAxis = {
      id: "drug_ph_stability_axis",
      title: "약물 pH·안정성 해석 축",
      short: "pH·약물 안정성",
      axisDomain: "health",
      priority: 1,
      linkedSubjects: ["화학", "생명과학", "세포와 물질대사", "약학과"],
      desc: "pH, 완충 용액, 동적 평형 개념을 약물 안정성, 체액 환경, 제형 조건과 연결하는 방향입니다.",
      easy: "pH 변화와 약물 안정성, 완충 용액, 체액 환경 비교 보고서",
      activityExamples: ["pH 조건에 따른 약물 안정성 사례 조사", "완충 용액과 체액 pH 연결", "제형 안정성에 영향을 주는 조건 정리"]
    };
    const bufferAxis = {
      id: "body_fluid_buffer_homeostasis_axis",
      title: "체액 pH·완충 항상성 축",
      short: "체액 pH·완충",
      axisDomain: "health",
      priority: 2,
      linkedSubjects: ["화학", "생명과학", "보건", "약학과"],
      desc: "산·염기와 완충 용액을 혈액 pH, 체액 조절, 약물 작용 환경과 연결해 해석하는 방향입니다.",
      easy: "혈액 pH, 완충 작용, 체액 조절과 약물 작용 환경 정리",
      activityExamples: ["혈액 pH 유지 범위 조사", "완충 용액 원리 카드 만들기", "체액 환경과 약물 작용 조건 연결"]
    };
    if (/화학 반응에서의 동적 평형/.test(conceptText) || /pH|완충|산|염기|중화|안정성|체액/.test(keywordText)) {
      return [make(phStabilityAxis, 0), make(bufferAxis, 1), make(dosageAxis, 2)];
    }
    if (/물질의 양과 화학 반응식/.test(conceptText) || /몰|농도|희석|정량|투약|용량/.test(keywordText)) {
      return [make(dosageAxis, 0), make(drugStructureAxis, 1), make(solubilityAxis, 2)];
    }
    if (/분자의 구조와 성질/.test(conceptText) || /용해도|극성|수소 결합|흡수|세포막|제형/.test(keywordText)) {
      return [make(solubilityAxis, 0), make(drugStructureAxis, 1), make(dosageAxis, 2)];
    }
    return [make(drugStructureAxis, 0), make(solubilityAxis, 1), make(dosageAxis, 2)];
  }


  function isElectronicsEngineeringSelectedContext() {
    try {
      const selectedMajorText = [
        state.majorSelectedName || "",
        state.career || "",
        getEffectiveCareerName?.() || "",
        getCareerInputText?.() || "",
        getMajorPanelResolvedName?.() || ""
      ].join(" ").replace(/\s+/g, " ").trim();
      const compact = selectedMajorText.replace(/\s+/g, "");
      const has = (pattern) => pattern.test(selectedMajorText) || pattern.test(compact);
      if (!selectedMajorText) return false;
      if (has(/반도체공학과|반도체|나노반도체|시스템반도체|반도체시스템/)) return false;
      if (has(/신소재공학과|재료공학과|신소재|재료|소재|고분자|세라믹|금속/)) return false;
      if (has(/기계공학과|기계|자동차|항공|로봇|메카트로닉스|모빌리티/)) return false;
      if (has(/화학공학과|화공|에너지공학과|배터리|이차전지|생명|바이오|간호|보건|약학|식품|환경/)) return false;
      return has(/전자공학과|전기전자공학과|전자전기공학과|전기공학과|정보통신공학과|통신공학과|전파공학과|제어계측공학과|임베디드|회로|전자공학|전기전자|전자전기|전기공학|정보통신|통신공학|전파공학|제어계측/);
    } catch (error) {
      return false;
    }
  }

  function pickForcedConceptItems(ranked, forced) {
    const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
    const others = ranked.filter(item => !forced.includes(item.concept));
    return uniq([...forcedItems, ...others]).slice(0, 3);
  }

  function isElectronicsEngineeringAxisContext(mappedEntry) {
    if (!isElectronicsEngineeringSelectedContext()) return false;
    const subjectText = String(state.subject || "").replace(/\s+/g, "");
    const conceptText = [state.concept || "", mappedEntry?.concept_name || "", mappedEntry?.concept_label || ""].join(" ").replace(/\s+/g, " ").trim();
    if (/^(물리|물리학|물리학Ⅰ|물리학1)$/.test(subjectText) && /물질의 전기적 특성|물질의 자기적 특성|파동의 성질과 활용/.test(conceptText)) return true;
    if (/^(전자기와양자|전자기와양자|고등전자기와양자)$/.test(subjectText) && /전기장과 자기장|전자기 유도와 전자기파|양자와 물질의 상호작용/.test(conceptText)) return true;
    if (/^정보$/.test(subjectText) && /컴퓨팅 시스템과 네트워크|프로그래밍과 자동화|자료와 정보의 표현|자료와 정보의 분석/.test(conceptText)) return true;
    return false;
  }

  function buildElectronicsEngineeringForcedAxes(mappedEntry) {
    const conceptText = [state.concept || "", mappedEntry?.concept_name || "", mappedEntry?.concept_label || ""].join(" ").replace(/\s+/g, " ").trim();
    const keywordText = String(state.keyword || "").replace(/\s+/g, " ").trim();
    const hit = (...values) => values.some(value => fuzzyIncludes(keywordText, value) || fuzzyIncludes(value, keywordText));
    const make = (seed, index) => {
      const axis = makeContextFollowupAxis(seed);
      return {
        ...axis,
        relationType: "direct",
        relationLabel: "직접 연계 강함",
        reason: "전자공학·전기전자 계열과 바로 이어지는 축입니다.",
        __priority: index + 1,
        __relationScore: 40,
        __score: 1000 - index
      };
    };
    const circuitAxis = {
      id: "electronics_signal_circuit_axis",
      title: "전기 신호·회로 응용 축",
      short: "신호·회로",
      axisDomain: "electronics",
      priority: 1,
      linkedSubjects: ["전자기와 양자", "정보", "미적분1"],
      desc: "전류, 전압, 저항, 전위차 개념을 전기 신호 해석과 회로 구성 원리로 연결하는 방향입니다.",
      easy: "전압·전류 변화 그래프, 회로 조건 비교, 신호 흐름 해석",
      activityExamples: ["전압·전류 변화 그래프 해석", "간단한 회로 조건 비교", "센서 신호의 회로 전달 과정 정리"]
    };
    const deviceAxis = {
      id: "electronics_device_sensor_axis",
      title: "전자소자·센서 장치 축",
      short: "소자·센서",
      axisDomain: "electronics",
      priority: 2,
      linkedSubjects: ["전자기와 양자", "물리", "정보"],
      desc: "전기적 특성, 자기장, 광전 효과를 센서, 전자소자, 측정 장치의 작동 원리로 확장하는 방향입니다.",
      easy: "센서 구조, 전자소자 작동, 측정 신호 변환 과정 정리",
      activityExamples: ["홀 센서 작동 원리 카드", "LED·광센서 원리 비교", "센서 신호 변환 흐름도 작성"]
    };
    const commAxis = {
      id: "electronics_communication_signal_axis",
      title: "통신 신호·주파수 해석 축",
      short: "통신·주파수",
      axisDomain: "signal_media",
      priority: 3,
      linkedSubjects: ["전자기와 양자", "정보", "확률과 통계"],
      desc: "파동, 전자기파, 주파수 개념을 통신 신호, 안테나, 데이터 전송 원리로 연결하는 방향입니다.",
      easy: "전자기파와 통신 신호, 주파수·대역폭, 신호 전송 과정 정리",
      activityExamples: ["전자기파 통신 활용 사례 조사", "주파수와 데이터 전송 관계 정리", "무선 통신 신호 흐름도 작성"]
    };
    const embeddedAxis = {
      id: "electronics_embedded_network_axis",
      title: "임베디드·네트워크 제어 축",
      short: "임베디드·제어",
      axisDomain: "info",
      priority: 4,
      linkedSubjects: ["정보", "물리", "전자기와 양자"],
      desc: "컴퓨팅 시스템과 네트워크 개념을 센서 입력, 제어 알고리즘, 임베디드 장치 연결로 확장하는 방향입니다.",
      easy: "센서 입력-처리-출력, 네트워크 연결, 제어 흐름 정리",
      activityExamples: ["센서-제어-출력 흐름도 작성", "임베디드 장치 네트워크 구조 정리", "간단한 자동화 제어 알고리즘 설계"]
    };
    const powerAxis = {
      id: "electronics_power_induction_axis",
      title: "전자기 유도·전력 응용 축",
      short: "유도·전력",
      axisDomain: "energy",
      priority: 5,
      linkedSubjects: ["전자기와 양자", "물질과 에너지", "물리"],
      desc: "전자기 유도, 코일, 변압기 개념을 전력 변환과 전력전자 시스템으로 연결하는 방향입니다.",
      easy: "유도 전류, 변압기, 전력 변환 효율 비교",
      activityExamples: ["전자기 유도 실험 결과 해석", "변압기 원리와 전력 손실 조사", "무선 충전 원리 보고서"]
    };
    const quantumAxis = {
      id: "electronics_quantum_device_axis",
      title: "광센서·양자소자 응용 축",
      short: "광센서·소자",
      axisDomain: "physics",
      priority: 6,
      linkedSubjects: ["전자기와 양자", "물리", "화학"],
      desc: "광전 효과, 에너지 준위, 밴드갭 개념을 LED, 광센서, 양자소자의 작동 원리로 연결하는 방향입니다.",
      easy: "LED·광센서 원리, 밴드갭, 전자 전이 비교 정리",
      activityExamples: ["LED와 광센서 작동 비교", "에너지 준위와 빛 방출 과정 정리", "양자소자 활용 사례 조사"]
    };

    if (/컴퓨팅 시스템과 네트워크|프로그래밍과 자동화|자료와 정보의 표현|자료와 정보의 분석/.test(conceptText)) {
      if (hit("센서", "네트워크", "임베디드", "제어", "자동화", "시스템", "통신")) return [make(embeddedAxis, 0), make(commAxis, 1), make(circuitAxis, 2)];
      return [make(embeddedAxis, 0), make(circuitAxis, 1), make(commAxis, 2)];
    }
    if (/파동의 성질과 활용/.test(conceptText)) return [make(commAxis, 0), make(circuitAxis, 1), make(embeddedAxis, 2)];
    if (/물질의 전기적 특성/.test(conceptText)) {
      if (hit("반도체", "소자", "센서", "전기 전도성")) return [make(deviceAxis, 0), make(circuitAxis, 1), make(embeddedAxis, 2)];
      return [make(circuitAxis, 0), make(deviceAxis, 1), make(embeddedAxis, 2)];
    }
    if (/물질의 자기적 특성/.test(conceptText)) return [make(deviceAxis, 0), make(powerAxis, 1), make(circuitAxis, 2)];
    if (/전자기 유도와 전자기파/.test(conceptText)) {
      if (hit("전자기파", "안테나", "통신", "주파수", "무선 통신", "데이터 전송")) return [make(commAxis, 0), make(powerAxis, 1), make(circuitAxis, 2)];
      return [make(powerAxis, 0), make(commAxis, 1), make(circuitAxis, 2)];
    }
    if (/전기장과 자기장/.test(conceptText)) return [make(deviceAxis, 0), make(circuitAxis, 1), make(embeddedAxis, 2)];
    if (/양자와 물질의 상호작용/.test(conceptText)) return [make(quantumAxis, 0), make(deviceAxis, 1), make(commAxis, 2)];
    return [make(circuitAxis, 0), make(deviceAxis, 1), make(commAxis, 2)];
  }

  function isIntegratedScience2EnvironmentEngineeringF1Context(mappedEntry) {
    try {
      const subjectText = String(state.subject || "").replace(/\s+/g, "");
      if (!/^(통합과학2|통합과학Ⅱ|통합과학II)$/.test(subjectText)) return false;

      let statusMajorText = "";
      try {
        statusMajorText = String($("engineCareerSummary")?.textContent || "").replace(/\s+/g, " ").trim();
        if (/입력 전|선택 전|대기|찾지 못했/.test(statusMajorText)) statusMajorText = "";
      } catch (error) {}

      const selectedMajorText = [
        statusMajorText || "",
        state.majorSelectedName || "",
        getEffectiveCareerName?.() || "",
        getCareerInputText?.() || "",
        getMajorPanelResolvedName?.() || "",
        state.career || ""
      ].join(" ").replace(/\s+/g, " ").trim();

      const isExactEnvironmentEngineering = /(환경공학과|환경공학|환경과학|기후환경|지구환경|탄소중립|대기환경|수질|폐기물|환경보건)/.test(selectedMajorText);
      const isClearlyUrbanCivil = /(도시공학과|도시공학|건축공학과|건축공학|토목공학과|토목공학|건설환경공학과|교통공학과|공간정보)/.test(selectedMajorText);
      if (!isExactEnvironmentEngineering || isClearlyUrbanCivil) return false;

      const conceptText = [
        state.concept || "",
        mappedEntry?.concept_name || "",
        mappedEntry?.concept_label || ""
      ].join(" ").replace(/\s+/g, " ").trim();
      if (!/지구\s*환경\s*변화|지구 환경 변화와 인간 생활/.test(conceptText)) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  function buildIntegratedScience2EnvironmentF1ForcedAxes() {
    const make = (seed, index) => {
      const axis = makeContextFollowupAxis(seed);
      return {
        ...axis,
        relationType: "direct",
        relationLabel: "직접 연계 강함",
        reason: "환경공학과와 바로 이어지는 축입니다.",
        __priority: index + 1,
        __relationScore: 40,
        __score: 1000 - index
      };
    };
    return [
      make({
        id: "env_climate_impact_analysis_axis",
        title: "기후·환경 영향 분석 축",
        short: "기후·환경 영향",
        axisDomain: "earth_env",
        priority: 1,
        linkedSubjects: ["지구시스템과학", "통합사회1", "환경", "확률과 통계"],
        desc: "지구 환경 변화 개념을 기후 변화, 온실가스, 생활환경 변화, 지역별 환경 영향 분석으로 연결하는 방향입니다.",
        easy: "기후 변화 원인·영향 비교, 온실가스 자료 해석, 생활환경 변화 사례 분석 보고서",
        activityExamples: ["기후 변화가 인간 생활에 미치는 영향 비교표", "온실가스와 생활환경 변화 자료 해석", "지역별 환경 변화 사례 조사"]
      }, 0),
      make({
        id: "env_risk_response_management_axis",
        title: "환경 위험·대응 관리 축",
        short: "위험 대응·관리",
        axisDomain: "earth_env",
        priority: 2,
        linkedSubjects: ["지구시스템과학", "통합사회1", "환경", "공통국어1"],
        desc: "환경 변화 자료를 폭염, 침수, 대기오염 같은 환경 위험 대응과 적응 전략 제안으로 확장하는 방향입니다.",
        easy: "환경 위험 요인 분류, 대응 전략 비교, 지역 환경 위험 저감 방안 제안",
        activityExamples: ["폭염·침수·대기오염 위험 대응 카드 정리", "환경 변화 대응 전략 비교", "지역 환경 위험 저감 방안 제안"]
      }, 1),
      make({
        id: "env_data_monitoring_axis",
        title: "환경 자료·모니터링 축",
        short: "자료·모니터링",
        axisDomain: "data",
        priority: 3,
        linkedSubjects: ["확률과 통계", "정보", "지구시스템과학", "환경"],
        desc: "환경 변화 자료를 표·그래프·시계열로 정리해 환경 지표와 모니터링 기준으로 해석하는 방향입니다.",
        easy: "기온·강수·대기질 자료 그래프, 환경 지표 비교, 자료 기반 모니터링 보고서",
        activityExamples: ["기후·대기질 자료 그래프화", "환경 지표 변화 추세 분석", "자료 기반 환경 관리 기준 제안"]
      }, 2)
    ];
  }

  function getFollowupAxisCandidates() {
    if (!state.subject || !state.concept || !state.keyword) return [];

    const mappedEntry = getConceptLongitudinalEntry();

    // v89.8 EL1-lock: 전자공학/전기전자/통신 계열은 물리·전자기와 양자·정보에서
    // 회로/센서/통신/임베디드 축을 직접 반환해 반도체·컴퓨터·일반 물리 축으로 밀리지 않게 한다.
    if (isElectronicsEngineeringAxisContext(mappedEntry)) {
      return buildElectronicsEngineeringForcedAxes(mappedEntry);
    }

    // v89.9 Q1-lock: 화학과 + 화학은 공학/의약/식품 응용축이 아니라
    // 원자·결합·분자 구조·정량·평형·열화학 중심의 순수 화학 축을 직접 반환한다.
    if (isChemistry1PureChemistryContext(mappedEntry)) {
      return buildChemistry1PureChemistryForcedAxes();
    }

    // v89.7 G1-lock: 식품영양/식품공학과 + 화학은 식품 성분·물성·pH·농도 분석 축을 직접 반환해
    // 약학/생명/화공 일반 축으로 다시 밀리는 것을 막는다.
    if (isChemistry1FoodContext(mappedEntry)) {
      return buildChemistry1FoodForcedAxes();
    }

    // v89.6 P1-lock: 약학과 + 화학은 의약품 구조/용해도/pH/농도 계산 축을 직접 반환해
    // 신소재·화공·간호 일반 축으로 다시 밀리는 것을 막는다.
    if (isChemistry1PharmacyContext(mappedEntry)) {
      return buildChemistry1PharmacyForcedAxes();
    }

    // v89.5 F4-lock: 환경공학과 + 통합과학2 + 지구 환경 변화 계열은
    // 기존 mappedEntry의 일반 지질/연표형 축이 최종 3개를 다시 차지하는 문제가 있었다.
    // 이 조합에서는 4번 후보를 환경공학형 3개 축으로 직접 반환해 화면 후보군을 확정한다.
    if (isIntegratedScience2EnvironmentEngineeringF1Context(mappedEntry)) {
      return buildIntegratedScience2EnvironmentF1ForcedAxes();
    }

    if (mappedEntry) {
      const mappedAxes = addContextualFollowupAxes(buildConceptMappedAxes(mappedEntry)).map(axis => {
        let score = 100 - (axis.__priority * 12);
        score += getCareerAxisBoost(axis);
        score += getMajorAxisBoost(axis);
        score += Number(axis.__relationScore || 0);
        score += getMappedKeywordAxisBoost(mappedEntry, axis);
        score += getCellMetabolismHardAxisBoost(axis);
        score += getElectromagnetismQuantumHardAxisBoost(axis);
        score += getMatterEnergyHardAxisBoost(axis);
        score += getChemistry1HardAxisBoost(axis);
        score += getEarthSystemScienceForcedAxisBoost(axis);
        score += getEarthSystemScienceHardAxisBoost(axis);
        score += getEnvironmentUrbanHardAxisBoost(axis);
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
      score += getLockedFollowupAxisOrderBoost(seed);
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
      "사회적 쟁점 글쓰기와 문장 구성": "쟁점·주장·문장",
      "매체 비평과 비판적 수용": "매체·비판·검증",
      "공동 보고서 글쓰기와 자료 활용": "자료·보고서·협업",
      "과학 기술과 인간·미래 사회 성찰": "기술·윤리·미래",
      "다양한 분야 독서와 홍보 표현": "독서·홍보·표현"
    };
    return map[concept] || "";
  }

  function getSubjectConceptEntries(subject) {
    const canonical = getCanonicalSubjectName(subject);
    let entry = getEngineSubjectEntry(subject || canonical);
    if ((!entry || !entry.concepts || !Object.keys(entry.concepts || {}).length) && isInfoSubjectName(subject || canonical)) {
      ensureInfoFallbackSeeds();
      entry = engineMap?.['정보'] || INFO_FALLBACK_ENGINE_MAP;
    }
    const concepts = entry?.concepts || {};
    return Object.entries(concepts).map(([concept, value]) => ({ concept, value }));
  }

  function getIntegratedScience1PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);

    if (!majorText) {
      return ["과학의 측정과 우리 사회", "규칙성 발견과 주기율표", "기본량과 단위", "자연 세계의 시간과 공간", "물질 구성과 분류", "지구시스템", "역학 시스템", "생명 시스템"];
    }

    // v69: 반도체/소자 계열은 통합과학1에서 센서·측정 축으로만 들어가면 안 된다.
    // 먼저 물질 구성·주기율표 쪽 개념을 보여야, 이후 키워드 "반도체"를 골라
    // 화학·소재/물리·시스템 후속 연계축으로 정상 이동할 수 있다.
    if (/(반도체|반도체공학|소자|칩|웨이퍼|도핑|집적회로|파운드리|공정|밴드갭)/.test(majorText)) {
      return ["물질 구성과 분류", "규칙성 발견과 주기율표", "기본량과 단위", "과학의 측정과 우리 사회", "역학 시스템", "자연 세계의 시간과 공간", "지구시스템", "생명 시스템"];
    }

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍)/i.test(majorText) || bucket === "it") {
      return ["과학의 측정과 우리 사회", "규칙성 발견과 주기율표", "자연 세계의 시간과 공간", "기본량과 단위", "역학 시스템", "지구시스템", "물질 구성과 분류", "생명 시스템"];
    }
    if (/(전자|전기|회로|센서|통신)/.test(majorText) || bucket === "electronic") {
      return ["기본량과 단위", "과학의 측정과 우리 사회", "역학 시스템", "규칙성 발견과 주기율표", "물질 구성과 분류", "자연 세계의 시간과 공간", "지구시스템", "생명 시스템"];
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

    // v89.3 F2-lock: 환경공학/도시공학 계열은 생태·바이오 일반 분기보다 먼저 판별한다.
    // "환경공학과" 화면 텍스트에 생태/생물 단어가 함께 섞이면 기존 생명·바이오 분기로 끌려가
    // `진화와 생물다양성`이 1번으로 뜨는 문제가 있어, 실제 선택 학과를 우선한다.
    const f2SelectedMajorText = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ").trim();
    const f2IsUrban = /(도시공학과|도시공학|도시계획|도시설계|건축공학|건축|토목공학|토목|건설환경|토목환경|교통공학|교통|인프라|주거|조경|공간정보)/.test(f2SelectedMajorText) || bucket === "urban";
    const f2IsEnvironment = /(환경공학과|환경공학|환경과학|환경생태|기후환경|지구환경|탄소중립|수질|대기|폐기물|환경보건|생태공학)/.test(f2SelectedMajorText) || bucket === "env";
    const f2IsSafety = /(안전공학과|안전공학|재난안전|방재|소방|위험도|방재공학)/.test(f2SelectedMajorText);

    if (f2IsUrban) {
      return ["지구 환경 변화와 인간 생활", "에너지 효율과 신재생 에너지", "과학 기술과 미래 사회", "생물과 환경", "생태계평형", "지구 환경 변화", "발전과 에너지원", "과학 기술 사회에서 빅데이터 활용", "과학 관련 사회적 쟁점과 과학 윤리", "산과 염기", "산화와 환원", "물질 변화에서 에너지의 출입", "진화와 생물다양성", "태양 에너지의 생성과 전환", "과학의 유용성과 필요성"];
    }
    if (f2IsEnvironment) {
      return ["지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형", "지구 환경 변화", "에너지 효율과 신재생 에너지", "과학 기술 사회에서 빅데이터 활용", "과학 관련 사회적 쟁점과 과학 윤리", "산과 염기", "산화와 환원", "물질 변화에서 에너지의 출입", "발전과 에너지원", "태양 에너지의 생성과 전환", "진화와 생물다양성", "과학의 유용성과 필요성", "과학 기술과 미래 사회"];
    }
    if (f2IsSafety) {
      return ["지구 환경 변화와 인간 생활", "과학 기술과 미래 사회", "과학 관련 사회적 쟁점과 과학 윤리", "생물과 환경", "생태계평형", "지구 환경 변화", "에너지 효율과 신재생 에너지", "발전과 에너지원", "과학 기술 사회에서 빅데이터 활용", "산과 염기", "산화와 환원", "물질 변화에서 에너지의 출입", "진화와 생물다양성", "태양 에너지의 생성과 전환", "과학의 유용성과 필요성"];
    }

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
    const defaultSequence = ["매체 비평과 비판적 수용", "공동 보고서 글쓰기와 자료 활용", "과학 기술과 인간·미래 사회 성찰", "다양한 분야 독서와 홍보 표현"];
    if (!majorText) return defaultSequence;
    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it") {
      return ["매체 비평과 비판적 수용", "공동 보고서 글쓰기와 자료 활용", "과학 기술과 인간·미래 사회 성찰", "다양한 분야 독서와 홍보 표현"];
    }
    if (/(경영|경제|행정|정치|사회|심리|미디어|교육|법|국제|언론|광고|홍보)/.test(majorText)) {
      return ["매체 비평과 비판적 수용", "공동 보고서 글쓰기와 자료 활용", "다양한 분야 독서와 홍보 표현", "과학 기술과 인간·미래 사회 성찰"];
    }
    if (/(간호|의학|보건|생명|바이오|약학|수의|의료|화학|환경)/.test(majorText)) {
      return ["공동 보고서 글쓰기와 자료 활용", "과학 기술과 인간·미래 사회 성찰", "매체 비평과 비판적 수용", "다양한 분야 독서와 홍보 표현"];
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

    if (isDataScienceMajorSelectedContext()) {
      return [
        "자료와 정보의 분석",
        "알고리즘 설계와 분석",
        "추상화와 문제 분해",
        "자료와 정보의 표현",
        "프로그래밍과 자동화",
        "컴퓨팅 시스템과 네트워크",
        "지식·정보 사회와 정보 문화"
      ];
    }

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
    // v89.2 F1-lock: 환경공학/도시·토목·건축 계열은 통합과학2에서
    // 생태 일반보다 생활환경·기후위험·공간/에너지 설계가 먼저 보여야 한다.
    if (/(도시공학|도시계획|도시설계|건축|토목|건설환경|토목환경|교통|인프라|주거|조경|공간)/.test(majorText) || bucket === "urban") {
      return ["지구 환경 변화와 인간 생활", "에너지 효율과 신재생 에너지", "과학 기술과 미래 사회", "생물과 환경", "생태계평형", "지구 환경 변화", "발전과 에너지원", "과학 기술 사회에서 빅데이터 활용", "과학 관련 사회적 쟁점과 과학 윤리", "자연환경과 인간의 공존", "산과 염기", "산화와 환원", "물질 변화에서 에너지의 출입", "진화와 생물다양성", "태양 에너지의 생성과 전환"];
    }
    if (/(환경공학|환경과학|환경생태|기후환경|지구환경|탄소중립|수질|대기|폐기물|생태|환경|기후|지구|천문|우주|해양|지리)/.test(majorText) || bucket === "env") {
      return ["지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형", "지구 환경 변화", "에너지 효율과 신재생 에너지", "진화와 생물다양성", "발전과 에너지원", "태양 에너지의 생성과 전환", "과학 기술 사회에서 빅데이터 활용", "과학의 유용성과 필요성", "과학 관련 사회적 쟁점과 과학 윤리", "산과 염기", "산화와 환원", "물질 변화에서 에너지의 출입", "과학 기술과 미래 사회"];
    }

    return defaultSequence;
  }


  function getEnvironmentUrbanHardAxisBoost(axis) {
    const subjectText = String(state.subject || "");
    if (!/(통합과학2|통합과학Ⅱ|지구시스템과학|지구과학|통합사회1|통합사회2|통합사회)/.test(subjectText)) return 0;
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag() || ""].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const isUrban = /(도시공학|도시계획|도시설계|건축|토목|건설환경|토목환경|교통|인프라|주거|생활권|녹지|열섬|조경|공간정보)/.test(majorText) || bucket === "urban";
    const isEnv = /(환경공학|환경과학|환경생태|기후환경|지구환경|탄소중립|수질|대기|폐기물|생태|환경|기후)/.test(majorText) || bucket === "env";
    const isSafety = /(안전공학|재난안전|방재|소방|재난|위험도|방재공학)/.test(majorText);
    if (!isUrban && !isEnv && !isSafety) return 0;

    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || ""),
      Array.isArray(axis?.keywordSignals) ? axis.keywordSignals.join(" ") : ""
    ].join(" ");
    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword) || axisText.includes(value));

    let boost = 0;

    if (/지구 환경 변화와 인간 생활|미래와 지속가능한 삶|자연환경과 인간의 공존/.test(concept)) {
      if (isEnv && hit("기후 변화", "환경 문제", "탄소중립", "온실가스", "수질", "대기", "폐기물", "지속가능", "환경 변화")) {
        if (/환경|기후|지속가능|위험|대응|정책|환경 문제|sustainable|climate/i.test(axisText)) boost = Math.max(boost, 420);
      }
      if (isUrban && hit("도시", "생활 공간", "교통", "인프라", "열섬", "침수", "녹지", "주거", "공간", "지역")) {
        if (/도시|공간|지역|생활|인프라|위험|설계|기획|공간 자료|지역 기획|미래 사회|sustainable/i.test(axisText)) boost = Math.max(boost, 420);
      }
      if (isSafety && hit("재난", "위험도", "침수", "폭염", "태풍", "강수량", "방재", "대응")) {
        if (/재난|위험|대응|방재|예측|소통/i.test(axisText)) boost = Math.max(boost, 450);
      }
    }

    if (/생물과 환경|생태계평형|진화와 생물다양성/.test(concept)) {
      if (isEnv && hit("생태", "생물다양성", "환경 요인", "보전", "복원", "수질", "서식지", "생태계")) {
        if (/환경 요인|환경 변화|보전|복원|지속가능|생태 관리|환경|수질|서식지/i.test(axisText)) boost = Math.max(boost, 430);
        if (/biology|생명·환경 해석 축|생명 다양성 해석/i.test(axisText) && !/환경|보전|생태 관리|환경 요인/i.test(axisText)) boost = Math.max(boost - 120, 0);
      }
      if (isUrban && hit("녹지", "생태", "열섬", "도시", "공원", "보전", "서식지")) {
        if (/생태|환경|관리|설계|지속가능|녹지|도시/i.test(axisText)) boost = Math.max(boost, 330);
      }
    }

    if (/에너지 효율과 신재생 에너지|발전과 에너지원|과학 기술과 미래 사회/.test(concept)) {
      if (isUrban && hit("에너지 효율", "신재생", "스마트", "센서", "자동화", "도시", "건물", "전력", "교통")) {
        if (/효율|지속가능|공학 설계|센서|시스템|미래|자동화|에너지/i.test(axisText)) boost = Math.max(boost, 360);
      }
      if (isEnv && hit("신재생", "탄소중립", "에너지 전환", "발전", "효율", "지역 에너지")) {
        if (/효율|지속가능|에너지|자원|사회 영향|정책/i.test(axisText)) boost = Math.max(boost, 360);
      }
    }

    if (/판 구조와 지구 내부|판 구조와 암석 변화|태풍과 악기상|날씨의 변화/.test(concept)) {
      if ((isUrban || isSafety) && hit("지진", "지반", "내진", "태풍", "침수", "강수량", "방재", "구조 안전", "위험도")) {
        if (/재난|안전|방재|지구물리|구조|지반|위험|예보/i.test(axisText)) boost = Math.max(boost, 420);
      }
    }

    return boost;
  }


  function getElectromagnetismQuantumHardAxisBoost(axis) {
    if (!isElectromagnetismQuantumSubject()) return 0;
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    if (!concept || !keyword) return 0;

    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || "")
    ].join(" ");
    const kind = getElectromagnetismQuantumMajorKind();
    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));

    let boost = 0;

    // 전자공학/전기전자: 전자기 유도 키워드는 일반 신호 해석보다 전력·통신/회로 응용을 우선한다.
    if (/전자기 유도와 전자기파/.test(concept)) {
      if ((kind === "electronics" || kind === "electrical") && hit("전자기 유도", "유도 전류", "유도 기전력", "렌츠 법칙", "패러데이 법칙", "변압기", "발전기", "전자기파", "안테나", "통신", "주파수")) {
        if (/power_communication_application_axis|전력·통신 응용 축|전력|통신/.test(axisText)) boost = Math.max(boost, 360);
        if (/electromagnetic_signal_axis|전자기 신호 해석 축/.test(axisText)) boost = Math.max(boost, 120);
      }
      if (kind === "computing" && hit("신호 데이터", "데이터 전송", "무선 통신", "주파수", "신호", "스펙트럼")) {
        if (/signal_data_visual_axis|신호 데이터·시각화 축|신호 데이터/.test(axisText)) boost = Math.max(boost, 360);
      }
      if (kind === "energy" && hit("발전기", "변압기", "전력", "전력 송전", "효율", "전자기 유도")) {
        if (/energy_power_axis|에너지 전환·송전 축|에너지|송전|power_communication_application_axis|전력·통신 응용 축/.test(axisText)) boost = Math.max(boost, 360);
      }
    }

    // 반도체: 광전 효과/에너지 준위도 '양자 일반'보다 반도체·소자 설계가 먼저다.
    if (/양자와 물질의 상호작용/.test(concept)) {
      if (kind === "semiconductor" && hit("광전 효과", "에너지 준위", "반도체", "밴드갭", "LED", "전자 전이", "태양전지", "터널 효과", "양자 터널링", "소자")) {
        if (/semiconductor_material_design_axis|반도체·소재 설계 축|반도체.*소재|소재 설계/.test(axisText)) boost = Math.max(boost, 380);
        if (/quantum_device_analysis_axis|양자·소자 해석 축/.test(axisText)) boost = Math.max(boost, 120);
      }

      // 신소재: 광전 효과는 양자 원리보다 광·소재 응용을 더 먼저 보여준다.
      if (kind === "materials" && hit("광전 효과", "레이저", "광센서", "광자", "에너지 준위", "원자 스펙트럼", "반도체", "밴드갭", "LED")) {
        if (/optical_material_application_axis|광·소재 응용 축|광.*소재|광소재/.test(axisText)) boost = Math.max(boost, 420);
        if (/semiconductor_material_design_axis|반도체·소재 설계 축/.test(axisText)) boost = Math.max(boost, 300);
        if (/quantum_device_analysis_axis|양자·소자 해석 축/.test(axisText)) boost = Math.max(boost, 240);
      }

      if (kind === "computing" && hit("양자 컴퓨터", "큐비트", "중첩", "양자 암호", "양자 정보", "보안")) {
        if (/quantum_information_computing_axis|양자 정보·컴퓨팅 축|양자 정보|컴퓨팅/.test(axisText)) boost = Math.max(boost, 380);
      }
    }

    // 의공학: 센서/MRI/생체 신호는 일반 센서·장치보다 의료 센서·영상 응용이 1순위다.
    if (/전기장과 자기장/.test(concept) || /전자기 유도와 전자기파/.test(concept) || /양자와 물질의 상호작용/.test(concept)) {
      if (kind === "biomedical" && hit("센서", "MRI", "의료 영상", "생체 신호", "전극", "자기장", "전위차", "검출", "영상 데이터", "광센서")) {
        if (/medical_field_sensor_axis|의료 센서·영상 응용 축|의료.*센서|의료.*영상/.test(axisText)) boost = Math.max(boost, 380);
        if (/sensor_device_application_axis|센서·장치 응용 축|센서·장치/.test(axisText)) boost = Math.max(boost, 120);
      }
    }

    return boost;
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
      const lifeDiagnosticGeneKeyword = /(유전자\s*검사|정밀의학|돌연변이|질병|진단|유전\s*질환)/.test(keyword);
      if (lifeDiagnosticGeneKeyword
        && (fuzzyIncludes(state.subject, "생명과학") || fuzzyIncludes(state.subject, "생명과학Ⅰ") || fuzzyIncludes(state.subject, "생명과학1"))
        && /유전자와 염색체/.test(concept)
        && /genetic_information_axis|유전 정보 해석 축|유전 정보/.test([axisId, axisTitle, axisDomain].join(" "))) {
        return;
      }
      const signalKeywords = Array.isArray(signal?.keywords) ? signal.keywords : [];
      if (!signalKeywords.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword))) return;
      const boost = Number(signal?.boost || 0);
      if (Number.isFinite(boost)) best = Math.max(best, boost);
    });

    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));
    let fallback = 0;



    // v34.20 electromagnetism-quantum keyword-level axis split:
    // 전자기와 양자는 같은 3개 개념 안에서도 학과와 추천 키워드에 따라 4번 축이 달라져야 한다.
    if (isElectromagnetismQuantumSubject()) {
      const axisText = [axisId, axisTitle, axisDomain, String(axis?.short || axis?.axis_short || "")].join(" ");
      const kind = getElectromagnetismQuantumMajorKind();
      const isElectrical = kind === "electrical";
      const isElectronics = kind === "electronics";
      const isSemi = kind === "semiconductor";
      const isMaterials = kind === "materials";
      const isBiomedical = kind === "biomedical";
      const isComputing = kind === "computing";
      const isEnergy = kind === "energy";
      const isPhysics = kind === "physics";

      if (/전기장과 자기장/.test(concept)) {
        if (hit("전기장", "전위", "전위차", "등전위면", "전하 분포", "점전하", "쿨롱 법칙", "전류", "자기장", "로런츠 힘", "하전 입자")) {
          if (/field_particle_analysis_axis|장·입자 해석 축|장-입자|장·입자/.test(axisText)) fallback = Math.max(fallback, isPhysics ? 140 : 118);
        }
        if (hit("센서", "전자석", "코일", "홀 효과", "전기 신호", "생체 신호", "전극", "MRI", "의료 영상", "자기장")) {
          // v34.21: 의공학과에서는 일반 센서·장치보다 의료 센서·영상 축이 먼저 와야 한다.
          if (/medical_field_sensor_axis|의료 센서·영상 응용 축|의료|영상/.test(axisText)) fallback = Math.max(fallback, isBiomedical ? 160 : 110);
          if (/sensor_device_application_axis|센서·장치 응용 축|센서|장치/.test(axisText)) fallback = Math.max(fallback, isBiomedical ? 128 : (isElectrical || isElectronics || isSemi ? 132 : 112));
        }
        if (hit("측정 데이터", "센서 데이터", "시각화", "신호 처리", "데이터", "그래프")) {
          if (/measurement_data_visual_axis|측정 데이터·시각화 축|데이터|시각화/.test(axisText)) fallback = Math.max(fallback, isComputing ? 142 : 108);
        }
      }

      if (/전자기 유도와 전자기파/.test(concept)) {
        if (hit("전자기 유도", "자기선속", "유도 전류", "렌츠 법칙", "패러데이 법칙", "유도 기전력")) {
          if (/power_communication_application_axis|전력·통신 응용 축|전력|통신/.test(axisText)) fallback = Math.max(fallback, isElectronics ? 150 : 118);
          if (/electromagnetic_signal_axis|전자기 신호 해석 축|전자기 신호/.test(axisText)) fallback = Math.max(fallback, isPhysics ? 128 : (isElectronics ? 124 : 116));
        }
        if (hit("발전기", "변압기", "전력", "전력 송전", "효율", "코일", "전력전자", "전자기 유도")) {
          if (/power_communication_application_axis|전력·통신 응용 축|전력|통신|energy_power_axis|에너지 전환·송전 축/.test(axisText)) fallback = Math.max(fallback, (isElectrical || isEnergy) ? 148 : (isElectronics ? 150 : 118));
        }
        if (hit("전자기파", "안테나", "통신", "주파수", "무선 통신", "데이터 전송", "신호", "신호 데이터", "노이즈", "스펙트럼")) {
          if (/signal_data_visual_axis|신호 데이터·시각화 축|신호 데이터/.test(axisText)) fallback = Math.max(fallback, isComputing ? 146 : (isElectronics ? 136 : 112));
          if (/power_communication_application_axis|전력·통신 응용 축|통신/.test(axisText)) fallback = Math.max(fallback, isElectronics ? 140 : 112);
        }
        if (hit("MRI", "의료 영상", "생체 신호", "검출", "영상 데이터")) {
          if (/medical_field_sensor_axis|의료 센서·영상 응용 축|의료|영상|센서/.test(axisText)) fallback = Math.max(fallback, isBiomedical ? 146 : 108);
        }
      }

      if (/양자와 물질의 상호작용/.test(concept)) {
        if (hit("반도체", "밴드갭", "소자", "LED", "태양전지", "나노소자", "터널 효과", "양자 터널링")) {
          if (/semiconductor_material_design_axis|반도체·소재 설계 축|반도체|소재/.test(axisText)) fallback = Math.max(fallback, (isSemi || isMaterials) ? 150 : 124);
          if (/quantum_device_analysis_axis|양자·소자 해석 축|양자.*소자/.test(axisText)) fallback = Math.max(fallback, isSemi ? 136 : 118);
        }
        if (hit("광전 효과", "에너지 준위", "원자 스펙트럼", "보어 모형", "광자", "전자 전이", "파동-입자", "불연속 스펙트럼", "양자")) {
          // v34.21: 반도체공학과는 광전 효과도 소자/밴드 설계로, 신소재공학과는 광·소재 응용으로 우선 연결한다.
          if (/semiconductor_material_design_axis|반도체·소재 설계 축|반도체|소재/.test(axisText)) fallback = Math.max(fallback, isSemi ? 154 : (isMaterials ? 128 : 108));
          if (/optical_material_application_axis|광·소재 응용 축|광.*소재|광소재/.test(axisText)) fallback = Math.max(fallback, isMaterials ? 154 : (isSemi ? 130 : 108));
          if (/quantum_device_analysis_axis|양자·소자 해석 축|양자.*소자/.test(axisText)) fallback = Math.max(fallback, isPhysics ? 140 : ((isSemi || isMaterials) ? 130 : 118));
        }
        if (hit("양자 컴퓨터", "양자 암호", "큐비트", "중첩", "측정", "양자 정보", "양자 알고리즘", "보안")) {
          if (/quantum_information_computing_axis|양자 정보·컴퓨팅 축|양자 정보|컴퓨팅/.test(axisText)) fallback = Math.max(fallback, isComputing ? 152 : 122);
          if (/quantum_technology_society_axis|양자 기술·사회 적용 축|양자 기술/.test(axisText)) fallback = Math.max(fallback, 108);
        }
        if (hit("광센서", "의료 영상", "레이저", "방사선 검출", "영상 데이터", "진단 장치")) {
          if (/medical_field_sensor_axis|의료 센서·영상 응용 축|의료|영상|센서/.test(axisText)) fallback = Math.max(fallback, isBiomedical ? 142 : 106);
        }
      }
    }

    // v33.52 earth science keyword-level axis split:
    // 지구과학 추천 키워드가 4번 축으로 갈 때, 학과군과 키워드 성격을 함께 반영한다.
    // 목적: 오른쪽 추천 키워드는 달라졌는데 4번 첫 카드가 의미 없이 고정되는 현상을 막는다.
    if (fuzzyIncludes(state.subject, "지구과학") || fuzzyIncludes(state.subject, "지구과학Ⅰ") || fuzzyIncludes(state.subject, "지구과학1")) {
      const axisText = [axisId, axisTitle, axisDomain, String(axis?.short || axis?.axis_short || "")].join(" ");
      const kind = getEarthScienceMajorKind();
      const isData = kind === "data";
      const isAtmosphere = kind === "atmosphere";
      const isEnvironment = kind === "environment";
      const isOcean = kind === "ocean";
      const isAstronomy = kind === "astronomy";
      const isCivil = kind === "civil";
      const isDisaster = kind === "disaster";
      const isGeo = kind === "geoscience";

      if (/해수의 성질/.test(concept)) {
        if (hit("수온", "염분", "밀도", "용존 산소", "수온 염분도", "혼합층", "수온 약층")) {
          if (/ocean_property_axis|해양 성질 해석 축|해양 성질/.test(axisText)) fallback = Math.max(fallback, 112);
        }
        if (hit("수질", "해양 산성화", "해양 생물", "환경 변화")) {
          if (/marine_environment_application_axis|해양·환경 응용 축|해양 환경/.test(axisText)) fallback = Math.max(fallback, isEnvironment ? 124 : 96);
        }
        if (hit("관측 자료", "해수 데이터", "그래프", "시각화", "자료 분석")) {
          if (/ocean_data_visual_axis|해양 데이터 시각화 축|데이터/.test(axisText)) fallback = Math.max(fallback, isData ? 132 : 98);
        }
      }

      if (/해수의 순환/.test(concept)) {
        if (hit("해류", "표층 순환", "심층 순환", "열염 순환", "난류", "한류", "수괴", "용승")) {
          if (/ocean_circulation_axis|해양 순환 해석 축|해양 순환/.test(axisText)) fallback = Math.max(fallback, 112);
        }
        if (hit("기후 변화", "탄소 저장", "엘니뇨", "라니냐", "어장", "해양 자원", "생태계")) {
          if (/climate_ocean_application_axis|기후·해양 응용 축|기후.*해양/.test(axisText)) fallback = Math.max(fallback, (isEnvironment || isOcean) ? 126 : 100);
        }
        if (hit("순환 모형", "시뮬레이션", "지도", "모델링", "그래프", "자료 분석")) {
          if (/circulation_data_model_axis|순환 데이터 모델링 축|데이터 모델링/.test(axisText)) fallback = Math.max(fallback, isData ? 132 : 96);
        }
      }

      if (/날씨의 변화/.test(concept)) {
        if (hit("기압", "고기압", "저기압", "바람", "전선", "기단", "기압 경도력")) {
          if (/weather_data_axis|기상 자료 해석 축|기상 자료/.test(axisText)) fallback = Math.max(fallback, isData ? 76 : 118);
        }
        if (hit("일기도", "위성 영상", "레이더 영상", "강수대", "기상 자료")) {
          if (/weather_data_axis|기상 자료 해석 축|기상 자료/.test(axisText)) fallback = Math.max(fallback, isData ? 82 : 120);
          if (/weather_visualization_axis|기상 데이터 시각화 축|기상 데이터/.test(axisText)) fallback = Math.max(fallback, isData ? 138 : 88);
        }
        if (hit("기상 데이터", "시계열", "강수량", "그래프", "자료 분석", "예측 모형")) {
          if (/weather_visualization_axis|기상 데이터 시각화 축|기상 데이터/.test(axisText)) fallback = Math.max(fallback, isData ? 144 : 104);
        }
        if (hit("날씨 예측", "예보", "경보", "재난", "안전")) {
          if (/forecast_disaster_axis|예보·재난 응용 축|예보.*재난/.test(axisText)) fallback = Math.max(fallback, (isAtmosphere || isDisaster) ? 124 : 104);
        }
      }

      if (/태풍과 악기상/.test(concept)) {
        if (hit("태풍", "열대 저기압", "태풍의 눈", "잠열", "해수면 온도", "기압 분포", "풍속", "강수량", "집중 호우")) {
          if (/severe_weather_axis|악기상 재난 해석 축|악기상/.test(axisText)) fallback = Math.max(fallback, 120);
        }
        if (hit("경보", "방재", "피해", "도시 침수", "재난 예방", "안전", "대피")) {
          if (/safety_prevention_axis|안전·방재 응용 축|방재/.test(axisText)) fallback = Math.max(fallback, (isCivil || isDisaster) ? 134 : 104);
        }
        if (hit("태풍 경로", "위성 영상", "시뮬레이션", "데이터", "예측 모형", "그래프")) {
          if (/severe_weather_axis|악기상 재난 해석 축/.test(axisText)) fallback = Math.max(fallback, isData ? 92 : 116);
          if (/climate_risk_communication_axis|기후위기 소통 축|기후위기/.test(axisText)) fallback = Math.max(fallback, 80);
        }
      }

      if (/지구의 기후 변화/.test(concept)) {
        if (hit("기후 변화", "온실 효과", "온실기체", "이산화탄소", "엘니뇨", "라니냐", "남방진동")) {
          if (/climate_system_axis|기후 시스템 해석 축|기후 시스템/.test(axisText)) fallback = Math.max(fallback, 122);
        }
        if (hit("탄소중립", "재생에너지", "기후 대응", "지속가능", "환경 정책")) {
          if (/sustainability_axis|환경·지속가능 응용 축|지속가능/.test(axisText)) fallback = Math.max(fallback, isEnvironment ? 134 : 102);
        }
        if (hit("기후 데이터", "기온 변화", "해수면 상승", "그래프", "통계", "예측 모형", "시계열")) {
          if (/climate_data_prediction_axis|기후 데이터 예측 축|기후 데이터/.test(axisText)) fallback = Math.max(fallback, isData ? 142 : 108);
        }
      }

      if (/지층과 지질시대/.test(concept)) {
        if (hit("지층", "화석", "상대 연령", "절대 연령", "부정합", "퇴적암", "층서", "지질 기록")) {
          if (/geologic_record_axis|지질 기록 해석 축|지질 기록/.test(axisText)) fallback = Math.max(fallback, 120);
        }
        if (hit("지질시대", "대멸종", "환경 변화", "생물 변화")) {
          if (/earth_history_axis|지구 역사 응용 축|지구 역사/.test(axisText)) fallback = Math.max(fallback, isGeo ? 120 : 102);
        }
        if (hit("방사성 동위 원소", "자료", "비교", "표본", "분석")) {
          if (/fossil_data_axis|화석·연대 자료 분석 축|연대 자료/.test(axisText)) fallback = Math.max(fallback, isData ? 126 : 98);
        }
      }

      if (/판 구조와 암석 변화/.test(concept)) {
        if (hit("판 구조론", "판 경계", "해양저 확장", "섭입", "발산 경계", "수렴 경계", "지진", "화산")) {
          if (/tectonic_axis|지각 변동 해석 축|지각 변동/.test(axisText)) fallback = Math.max(fallback, 122);
        }
        if (hit("지반", "지질도", "재난", "안전", "화산재", "피해", "방재", "자원")) {
          if (/resource_disaster_axis|자원·재난 응용 축|재난 응용/.test(axisText)) fallback = Math.max(fallback, (isCivil || isDisaster) ? 136 : 102);
        }
        if (hit("화성암", "변성암", "암석 순환", "고지자기", "지질공원")) {
          if (/rock_cycle_axis|암석·자원 순환 분석 축|암석/.test(axisText)) fallback = Math.max(fallback, isGeo ? 124 : 100);
        }
      }

      if (/태양계 천체의 관측과 운동/.test(concept)) {
        if (hit("관측", "케플러 법칙", "행성", "위성", "위상 변화", "공전", "망원경")) {
          if (/astronomy_observation_axis|천체 관측 해석 축|천체 관측/.test(axisText)) fallback = Math.max(fallback, 124);
        }
        if (hit("궤도", "위성", "항법", "탐사", "거리", "주기")) {
          if (/space_navigation_axis|우주항법 응용 축|우주항법/.test(axisText)) fallback = Math.max(fallback, isAstronomy ? 120 : 96);
        }
        if (hit("관측 자료", "천체 데이터", "데이터", "그래프", "모델링")) {
          if (/space_data_model_axis|관측 데이터 모델링 축|데이터 모델링/.test(axisText)) fallback = Math.max(fallback, isData ? 136 : 104);
        }
      }

      if (/별의 특성과 진화/.test(concept)) {
        if (hit("별의 밝기", "겉보기 등급", "절대 등급", "표면 온도", "H-R도", "주계열성", "적색거성", "백색왜성", "초신성")) {
          if (/stellar_evolution_axis|항성 진화 해석 축|항성 진화/.test(axisText)) fallback = Math.max(fallback, 124);
        }
        if (hit("스펙트럼", "핵융합", "질량", "파장", "복사")) {
          if (/astrophysics_bridge_axis|천체물리 연결 축|천체물리/.test(axisText)) fallback = Math.max(fallback, isAstronomy ? 122 : 104);
        }
        if (hit("데이터", "그래프", "분류", "시각화", "자료 비교")) {
          if (/spectrum_data_axis|스펙트럼 데이터 분석 축|데이터 분석/.test(axisText)) fallback = Math.max(fallback, isData ? 136 : 98);
        }
      }

      if (/은하와 우주의 진화/.test(concept)) {
        if (hit("외부 은하", "은하 분류", "적색 편이", "허블 법칙", "우주 팽창", "빅뱅", "우주 배경 복사")) {
          if (/cosmic_structure_axis|우주 구조 해석 축|우주 구조/.test(axisText)) fallback = Math.max(fallback, 124);
        }
        if (hit("우주 데이터", "거리", "속도", "그래프", "데이터", "비교")) {
          if (/cosmic_data_axis|우주 데이터 응용 축|우주 데이터/.test(axisText)) fallback = Math.max(fallback, isData ? 138 : 104);
        }
        if (hit("모형", "가설", "우주 기원", "논쟁", "발표")) {
          if (/cosmic_inquiry_communication_axis|우주 관측·모형화 축|모형화/.test(axisText)) fallback = Math.max(fallback, 108);
        }
      }
    }

    // v34.10 mechanics-energy keyword-level axis split:
    // 역학과 에너지는 같은 3개 개념 안에서도 학과와 추천 키워드에 따라 4번 축이 달라져야 한다.
    if (state.subject === "역학과 에너지" || state.subject === "역학과에너지") {
      const axisText = [axisId, axisTitle, axisDomain, String(axis?.short || axis?.axis_short || "")].join(" ");
      const kind = getMechanicsEnergyMajorKind();
      const isData = kind === "data";
      const isCivil = kind === "civil";
      const isArch = kind === "architecture";
      const isAero = kind === "aerospace";
      const isAuto = kind === "automotive";
      const isMech = kind === "mechanical";
      const isEnergy = kind === "energy";

      if (/시공간과 운동/.test(concept)) {
        if (hit("벡터", "벡터의 합성", "벡터의 분해", "포물선 운동", "등속 원운동", "구심력", "구심 가속도", "운동량")) {
          if (/advanced_mechanics_analysis_axis|고급 역학 해석 축|역학 해석/.test(axisText)) fallback = Math.max(fallback, (isMech || isAuto || isCivil || isArch) ? 132 : 112);
        }
        if (hit("케플러 법칙", "인공위성", "행성", "중력", "탈출 속도", "궤도")) {
          if (/orbit_space_application_axis|우주·궤도 응용 축|우주 궤도/.test(axisText)) fallback = Math.max(fallback, isAero ? 142 : 112);
        }
        if (hit("운동 데이터", "시뮬레이션", "모델링", "그래프", "위치-시간", "속도-시간", "센서 데이터", "자료 분석")) {
          if (/motion_data_simulation_axis|운동 데이터·시뮬레이션 축|시뮬레이션/.test(axisText)) fallback = Math.max(fallback, isData ? 146 : 112);
        }
      }

      if (/열과 에너지/.test(concept)) {
        if (hit("이상 기체", "내부 에너지", "열역학 제1법칙", "열역학 제2법칙", "열역학", "엔트로피", "상태 변화")) {
          if (/thermodynamics_analysis_axis|열역학 해석 축|열역학/.test(axisText)) fallback = Math.max(fallback, 122);
        }
        if (hit("효율", "열효율", "열기관", "냉각", "단열", "열교환", "열손실", "열전달", "건물 에너지", "냉난방")) {
          if (/process_efficiency_design_axis|공정·효율 설계 축|효율 설계/.test(axisText)) fallback = Math.max(fallback, (isMech || isAuto || isArch || isEnergy) ? 138 : 116);
        }
        if (hit("전력 소비", "온실가스", "에너지 절약", "탄소 배출", "신재생 에너지", "열 데이터", "온도 센서", "그래프", "자료 분석")) {
          if (/energy_environment_data_axis|에너지·환경 데이터 축|환경 에너지/.test(axisText)) fallback = Math.max(fallback, (isData || isEnergy) ? 132 : 104);
        }
      }

      if (/탄성파와 소리/.test(concept)) {
        if (hit("지진파", "진동", "공진", "감쇠", "구조 안전", "내진", "탄성파")) {
          if (/structure_vibration_seismic_axis|구조 진동·내진 해석 축|내진/.test(axisText)) fallback = Math.max(fallback, (isCivil || isArch) ? 148 : 116);
        }
        if (hit("단진동", "파장", "진동수", "도플러 효과", "정상파", "공명", "주파수")) {
          if (/wave_signal_analysis_axis|파동·신호 해석 축|파동 신호/.test(axisText)) fallback = Math.max(fallback, 122);
        }
        if (hit("초음파", "의료 진단", "음향 센서", "소음 저감", "스피커", "소음")) {
          if (/acoustic_medical_device_axis|음향·의료 장치 응용 축|음향 장치/.test(axisText)) fallback = Math.max(fallback, 120);
        }
        if (hit("파형", "그래프", "스펙트럼", "데이터", "센서", "센서 데이터", "신호 처리")) {
          if (/signal_data_visualization_axis|신호 데이터 시각화 축|신호 데이터/.test(axisText)) fallback = Math.max(fallback, isData ? 142 : 110);
        }
      }
    }


    // v33.36 geometry keyword-level axis split: prevent every keyword in one geometry concept from falling into the same default axis.
    if (state.subject === "기하") {
      const axisText = [axisId, axisTitle, axisDomain, String(axis?.short || axis?.axis_short || "")].join(" ");
      if (/벡터의 성분과 내적/.test(concept)) {
        if (hit("내적", "방향 유사도", "코사인 유사도", "정규화", "유사도")) {
          if (/vector_similarity_model_axis|벡터·유사도|유사도 모델/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("성분", "벡터의 크기", "각", "방향", "그래픽스", "그래픽", "벡터 해석")) {
          if (/graphics_vector_axis|그래픽·물리 벡터|그래픽 벡터/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("투영", "거리", "공간 계산")) {
          if (/projection_space_calc_axis|투영·공간 계산|투영 계산/.test(axisText)) fallback = Math.max(fallback, 72);
        }
      }
      if (/공간좌표와 구의 방정식/.test(concept)) {
        if (hit("공간좌표", "3차원 좌표", "좌표", "그래픽스", "그래픽", "공간 데이터")) {
          if (/coordinate_3d_graphics_axis|3차원 좌표·그래픽스|좌표.*그래픽스/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("구의 방정식", "중심", "반지름", "거리", "충돌 판정", "센서 범위")) {
          if (/sensor_range_collision_axis|센서 범위·충돌 판정|충돌 판정/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("위치 추적", "공간 데이터", "내분점", "중점", "좌표 데이터")) {
          if (/position_tracking_spatial_data_axis|위치 추적·공간 데이터|공간 데이터/.test(axisText)) fallback = Math.max(fallback, 72);
        }
      }
      if (/이차곡선과 자취 해석/.test(concept)) {
        if (hit("쌍곡선", "위치 추정", "신호", "거리 조건")) {
          if (/signal_position_estimation_axis|신호·위치 추정|위치 추정/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("포물선", "타원", "초점", "반사 성질", "궤도")) {
          if (/reflection_orbit_interpretation_axis|반사·궤도 해석|궤도/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("자취", "표준형", "점근선", "그래프", "곡선", "설계")) {
          if (/curve_design_visualization_axis|곡선·설계 시각화|설계 시각화/.test(axisText)) fallback = Math.max(fallback, 72);
        }
      }
      if (/평면벡터와 벡터의 연산/.test(concept)) {
        if (hit("벡터", "벡터의 덧셈", "벡터의 뺄셈", "실수배", "이동")) {
          if (/movement_direction_modeling_axis|이동·방향 모델링|이동.*방향/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("방향", "크기", "합성", "힘", "물리량")) {
          if (/physical_quantity_force_vector_axis|물리량·힘 벡터|힘 벡터/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("위치벡터", "좌표", "경로", "알고리즘", "경로 계산")) {
          if (/algorithmic_path_calculation_axis|알고리즘 경로 계산|경로 계산/.test(axisText)) fallback = Math.max(fallback, 72);
        }
      }
      if (/공간도형과 정사영·위치 관계/.test(concept)) {
        if (hit("정사영", "투영", "3D 모델링", "입체도형")) {
          if (/projection_3d_modeling_axis|투영·3D 모델링|3D 모델링/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("직선과 평면", "수직", "평행", "거리", "구조 해석", "설계")) {
          if (/structure_design_interpretation_axis|구조·설계 해석|설계 해석/.test(axisText)) fallback = Math.max(fallback, 72);
        }
        if (hit("삼수선 정리", "평면 결정", "수직 관계", "위치 관계")) {
          if (/position_relation_proof_axis|위치 관계 증명|관계 증명/.test(axisText)) fallback = Math.max(fallback, 72);
        }
      }
    }



    // v33.40 chemistry1 keyword-level axis hard split: make chemical bonding keywords branch instead of all falling into material-property axis.
    if (fuzzyIncludes(state.subject, "화학") || fuzzyIncludes(state.subject, "화학Ⅰ") || fuzzyIncludes(state.subject, "화학1")) {
      const axisText = [axisId, axisTitle, axisDomain, String(axis?.short || axis?.axis_short || "")].join(" ");
      const chemistryKindForAxis = (typeof getChemistry1MajorKind === "function" ? getChemistry1MajorKind() : "");
      if (chemistryKindForAxis === "bioengineering") {
        if (/탄소 화합물의 유용성|분자의 구조와 성질|화학 결합/.test(concept) && hit("탄소 화합물", "고분자", "단백질", "아미노산", "생체 분자", "분자 구조", "수소 결합", "공유 결합", "분자 상호작용", "친수성", "소수성")) {
          if (/bio_molecule|생체 분자 구조|bio_molecular_interaction_axis|분자 상호작용/.test(axisText)) fallback = Math.max(fallback, 156);
          if (/cell_engineering|세포·대사 심화|genetic_bioengineering|유전 정보·바이오공학/.test(axisText)) fallback = Math.max(fallback, 118);
        }
        if (/화학 반응에서의 동적 평형/.test(concept) && hit("동적 평형", "pH", "완충", "산", "염기", "효소 반응", "대사 조건", "반응 조건")) {
          if (/enzyme_drug|효소·수용체·약물 작용|cell_engineering|세포·대사 심화|metabolic_reaction_analysis_axis|효소 반응/.test(axisText)) fallback = Math.max(fallback, 145);
          if (/bio_molecule|생체 분자 구조/.test(axisText)) fallback = Math.max(fallback, 112);
        }
      }
      if (/화학 결합/.test(concept)) {
        if (hit("원자가 전자", "이온 결합", "공유 결합", "루이스 전자점식", "비공유 전자쌍", "전자쌍", "결합 종류 판별", "결합 종류", "팔전자 규칙")) {
          if (/bond_structure_axis|결합 구조 해석|결합 구조|전자 분포/.test(axisText)) fallback = Math.max(fallback, 96);
          if (/material_property_design_axis|물성·소재 설계|물성 설계/.test(axisText)) fallback = Math.max(fallback, 6);
        }
        if (hit("결합의 극성", "전기음성도", "극성 판단", "분자 모형 해석", "분자 모형", "극성 분자", "무극성 분자", "전도성", "녹는점", "끓는점", "물성", "소재", "재료")) {
          if (/material_property_design_axis|물성·소재 설계|물성 설계|물성 예측/.test(axisText)) fallback = Math.max(fallback, 96);
          if (/bond_structure_axis|결합 구조 해석|결합 구조/.test(axisText)) fallback = Math.max(fallback, 8);
        }
        if (hit("용해", "수소 결합", "생체 분자", "분자 간 힘", "분자 상호작용")) {
          if (/bio_molecular_interaction_axis|분자 상호작용·용해|분자 상호작용/.test(axisText)) fallback = Math.max(fallback, 96);
          if (/material_property_design_axis|물성·소재 설계|물성 설계/.test(axisText)) fallback = Math.max(fallback, 8);
        }
      }
    }


    // v33.43 life science keyword-level axis split:
    // 3번 오른쪽 추천 키워드마다 4번 후속 연계축 1순위가 실제 의미에 맞게 갈라지도록 보정한다.
    // 핵심: 같은 생명과학 개념 안에서도 DNA / 바이오 데이터 / 유전자 검사 / 복제·전사·번역 / 백신 등이 같은 4번 축으로 고정되지 않게 한다.
    if (fuzzyIncludes(state.subject, "생명과학") || fuzzyIncludes(state.subject, "생명과학Ⅰ") || fuzzyIncludes(state.subject, "생명과학1")) {
      const axisText = [axisId, axisTitle, axisDomain, String(axis?.short || axis?.axis_short || "")].join(" ");
      const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ");
      const isNursingHealth = /(간호|보건|임상병리|의료|재활|물리치료|작업치료)/.test(majorText);
      const isMedical = /(의예|의학|의료|임상|치의|한의|수의|병리)/.test(majorText);
      const isPharmacy = /(약학|제약|신약|약물|약대|화공)/.test(majorText);
      const isBioEng = /(생명공학|의생명|바이오|생명과학|유전공학|분자생명|생명정보|바이오헬스|바이오메디컬)/.test(majorText);
      const isFoodNutrition = /(식품영양|영양|식품|조리|푸드|운동처방|운동재활)/.test(majorText);
      const isEnv = /(환경공학|환경생태|생태|환경|기후|해양|산림|자원|농생명)/.test(majorText);
      const isBioInfo = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|통계|알고리즘|바이오인포매틱스|생명정보|헬스케어)/i.test(majorText);

      if (isBioEng) {
        if (/유전자와 염색체/.test(concept) && hit("DNA", "유전자", "염색체", "염기 서열", "복제", "전사", "번역", "단백질 합성", "유전체")) {
          if (/genetic_bioengineering|유전 정보·바이오공학|유전 정보.*바이오공학/.test(axisText)) fallback = Math.max(fallback, 165);
          if (/genetic_information_axis|유전 정보 해석 축/.test(axisText)) fallback = Math.max(fallback, 120);
          if (/gene_expression_protein_axis|유전자 발현·단백질 합성 축/.test(axisText)) fallback = Math.max(fallback, 118);
        }
        if (/생명과학의 이해/.test(concept) && hit("생명 시스템", "세포", "항상성", "바이오 기술", "생체 모방", "응용")) {
          if (/genetic_bioengineering|유전 정보·바이오공학|bio_convergence_intro_axis|바이오 융합/.test(axisText)) fallback = Math.max(fallback, 132);
          if (/life_system_intro_axis|생명 시스템 이해 축/.test(axisText)) fallback = Math.max(fallback, 112);
        }
        if (/물질대사와 에너지/.test(concept) && hit("ATP", "세포 호흡", "광합성", "효소", "대사 경로", "에너지 전환", "대사 조절", "바이오공정")) {
          if (/cell_engineering|세포·대사 심화|cell_energy_axis|세포 에너지|cell_culture_bioprocess_axis|세포 배양/.test(axisText)) fallback = Math.max(fallback, 150);
          if (/genetic_bioengineering|유전 정보·바이오공학/.test(axisText)) fallback = Math.max(fallback, 115);
        }
      }

      if (/유전자와 염색체/.test(concept)) {
        if (hit("DNA", "유전자", "염색체", "유전 정보") && !hit("유전자 검사", "정밀의학", "돌연변이", "질병", "진단", "유전 질환")) {
          if (/genetic_information_axis|유전 정보 해석 축|유전 정보/.test(axisText)) fallback = Math.max(fallback, 96);
          if (/bio_data_bridge_axis|바이오 데이터 연결 축/.test(axisText)) fallback = Math.max(fallback, isBioInfo ? 18 : 6);
        }
        if (hit("염기 서열", "유전체", "바이오 데이터", "생명 정보", "시퀀싱", "서열 데이터", "데이터")) {
          if (/bio_data_bridge_axis|바이오 데이터 연결 축|바이오 데이터/.test(axisText)) fallback = Math.max(fallback, 98);
          if (/genetic_information_axis|유전 정보 해석 축/.test(axisText)) fallback = Math.max(fallback, 12);
        }
        if (hit("복제", "전사", "번역", "단백질 합성", "형질 발현", "발현")) {
          if (/gene_expression_protein_axis|유전자 발현·단백질 합성 축|단백질 합성/.test(axisText)) fallback = Math.max(fallback, 98);
          if (/genetic_information_axis|유전 정보 해석 축/.test(axisText)) fallback = Math.max(fallback, 10);
        }
        if (hit("유전자 검사", "정밀의학", "돌연변이", "질병", "진단", "유전 질환")) {
          if (/genetic_diagnosis_precision_axis|유전 진단·정밀의학 축|질병·진단/.test(axisText)) fallback = Math.max(fallback, (isNursingHealth || isMedical) ? 160 : 140);
          if (/genetic_ethics_axis|유전 윤리·사회 축|유전 윤리/.test(axisText)) fallback = Math.max(fallback, 16);
          if (/bio_data_bridge_axis|바이오 데이터 연결 축/.test(axisText)) fallback = Math.max(fallback, isBioInfo ? 18 : 8);
        }
        if (hit("유전자 편집", "개인정보", "생명 윤리", "윤리", "차별", "정보 보호")) {
          if (/genetic_ethics_axis|유전 윤리·사회 축|유전 윤리/.test(axisText)) fallback = Math.max(fallback, 100);
          if (/genetic_diagnosis_precision_axis|유전 진단·정밀의학 축/.test(axisText)) fallback = Math.max(fallback, 10);
        }
      }

      if (/물질대사와 에너지/.test(concept)) {
        if (hit("효소", "기질", "반응 속도", "촉매", "효소 반응", "약물 대사")) {
          if (/cell_energy_axis|세포 에너지 해석 축|효소/.test(axisText)) fallback = Math.max(fallback, isPharmacy ? 102 : (isNursingHealth ? 70 : 96));
          if (/health_nutrition_application_axis|건강·영양 응용 축/.test(axisText)) fallback = Math.max(fallback, (isNursingHealth || isFoodNutrition) ? 126 : 8);
        }
        if (hit("ATP", "ADP", "세포 호흡", "광합성", "에너지 전환", "물질대사", "대사 경로")) {
          if (/cell_energy_axis|세포 에너지 해석 축/.test(axisText)) fallback = Math.max(fallback, isNursingHealth ? 76 : 98);
          if (/health_nutrition_application_axis|건강·영양 응용 축/.test(axisText)) fallback = Math.max(fallback, (isNursingHealth || isFoodNutrition) ? 120 : 6);
        }
        if (hit("영양소", "식단", "칼로리", "탄수화물", "지방", "단백질", "운동", "포도당")) {
          if (/health_nutrition_application_axis|건강·영양 응용 축|건강 영양/.test(axisText)) fallback = Math.max(fallback, 100);
          if (/cell_energy_axis|세포 에너지 해석 축/.test(axisText)) fallback = Math.max(fallback, 8);
        }
        if (hit("탄소 순환", "생태계", "산소", "에너지 흐름")) {
          if (/bioenergy_environment_axis|생명·환경 에너지 축|생명 환경/.test(axisText)) fallback = Math.max(fallback, 96);
        }
      }

      if (/물질대사와 건강/.test(concept)) {
        if (hit("혈당", "인슐린", "당뇨병", "고혈압", "대사성 질환", "비만", "질병")) {
          if (/metabolic_health_axis|건강 대사 분석 축|대사 건강/.test(axisText)) fallback = Math.max(fallback, (isNursingHealth || isMedical) ? 104 : 98);
        }
        if (hit("생활 습관", "예방", "관리", "식단", "운동", "보건")) {
          if (/public_health_habit_axis|보건·생활습관 설계 축|생활습관/.test(axisText)) fallback = Math.max(fallback, 98);
        }
        if (hit("건강 데이터", "혈당 데이터", "측정", "모니터링", "데이터")) {
          if (/health_data_monitor_axis|건강 데이터 모니터링 축|건강 데이터/.test(axisText)) fallback = Math.max(fallback, isBioInfo ? 104 : 96);
        }
      }

      if (/신경 자극 전도와 전달/.test(concept)) {
        if (hit("뉴런", "막전위", "활동 전위", "이온 이동", "전도", "자극")) {
          if (/neural_signal_axis|신경 신호 해석 축|신경 신호/.test(axisText)) fallback = Math.max(fallback, 98);
        }
        if (hit("시냅스", "전달", "신경전달물질", "수용체", "약물", "반응 시간")) {
          if (/bio_signal_application_axis|생체 정보 응용 축|생체 정보/.test(axisText)) fallback = Math.max(fallback, (isPharmacy || isBioInfo) ? 104 : 96);
          if (/neural_signal_axis|신경 신호 해석 축/.test(axisText)) fallback = Math.max(fallback, 10);
        }
        if (hit("행동", "감각", "학습", "심리", "반응")) {
          if (/neuro_psychology_bridge_axis|신경·행동 연결 축|신경 행동/.test(axisText)) fallback = Math.max(fallback, 96);
        }
      }

      if (/신경계와 항상성/.test(concept)) {
        if (hit("항상성", "호르몬", "체온 조절", "혈당 조절", "피드백", "내부 환경", "인슐린")) {
          if (/homeostasis_control_axis|항상성 조절 해석 축|항상성/.test(axisText)) fallback = Math.max(fallback, (isNursingHealth || isMedical) ? 104 : 98);
        }
        if (hit("중추 신경계", "말초 신경계", "자율 신경", "감각", "반응")) {
          if (/health_monitoring_axis|인체 조절 데이터 축|인체 조절/.test(axisText)) fallback = Math.max(fallback, 96);
        }
        if (hit("건강 관리", "생활 습관", "측정", "건강 데이터", "의사결정")) {
          if (/healthcare_decision_axis|건강 관리 의사결정 축/.test(axisText)) fallback = Math.max(fallback, 98);
        }
      }

      if (/면역과 백신/.test(concept)) {
        if (hit("항원", "항체", "면역 반응", "선천 면역", "후천 면역", "면역 기억")) {
          if (/immune_response_axis|면역 반응 해석 축|면역 반응/.test(axisText)) fallback = Math.max(fallback, 100);
        }
        if (hit("백신", "병원체", "감염", "예방", "진단", "집단 면역")) {
          if (/infection_prevention_axis|감염병 예방 응용 축|감염병 예방/.test(axisText)) fallback = Math.max(fallback, (isNursingHealth || isMedical) ? 104 : 98);
        }
        if (hit("접종", "공중보건", "사회", "윤리", "안전성")) {
          if (/bioethics_vaccine_axis|의생명 윤리 판단 축|의생명 윤리/.test(axisText)) fallback = Math.max(fallback, 96);
        }
      }

      if (/생태계의 물질 순환과 상호 작용/.test(concept)) {
        if (hit("생태계", "먹이 그물", "상호 작용", "개체군", "생태계 평형")) {
          if (/ecosystem_analysis_axis|생태계 해석 축|생태계/.test(axisText)) fallback = Math.max(fallback, isEnv ? 104 : 98);
        }
        if (hit("물질 순환", "탄소 순환", "질소 순환", "자원", "환경", "오염")) {
          if (/environment_resource_application_axis|환경·자원 응용 축|환경 자원/.test(axisText)) fallback = Math.max(fallback, isEnv ? 106 : 98);
        }
        if (hit("데이터", "변동", "모델링", "네트워크", "지표", "예측")) {
          if (/ecosystem_data_decision_axis|생태 데이터 판단 축|생태 데이터/.test(axisText)) fallback = Math.max(fallback, isBioInfo ? 104 : 96);
        }
      }

      if (/진화와 생물 다양성/.test(concept)) {
        if (hit("진화", "자연선택", "분류", "계통수", "종 다양성")) {
          if (/evolution_diversity_axis|진화·분류 해석 축|진화/.test(axisText)) fallback = Math.max(fallback, 98);
        }
        if (hit("생물 다양성", "생물 자원", "보전", "멸종", "자원")) {
          if (/bio_resource_application_axis|생물 자원 응용 축|생물 자원/.test(axisText)) fallback = Math.max(fallback, isEnv ? 104 : 96);
        }
        if (hit("비교 분석", "데이터", "분류 데이터", "계통")) {
          if (/evolution_data_communication_axis|진화 데이터 소통 축|진화 데이터/.test(axisText)) fallback = Math.max(fallback, isBioInfo ? 104 : 96);
        }
      }
    }


    if (fuzzyIncludes(state.subject, "통합사회1") || fuzzyIncludes(state.subject, "통합사회")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|플랫폼|네트워크)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/생활 공간 변화와 지역 이해/.test(concept)) {
        if (hit("정보화", "네트워크", "통신 발달", "교통 발달", "공간 압축", "정보 격차")) {
          if (/mobility_network_society/.test(axisId) || /교통·네트워크 사회 축/.test(axisTitle) || axisDomain === "info") fallback = Math.max(fallback, isItMajor ? 58 : 48);
          if (/spatial_data_local_planning/.test(axisId) || /공간 자료·지역 기획 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 14);
        }
        if (hit("지역 조사", "지역 발전", "지역 변화", "생활 공간", "도시 문제")) {
          if (/spatial_data_local_planning/.test(axisId) || /공간 자료·지역 기획 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 54 : 46);
          if (/urban_regional_change_analysis/.test(axisId) || /도시·지역 변화 분석 축/.test(axisTitle) || axisDomain === "social_policy") fallback = Math.max(fallback, 12);
        }
      }
      if (/시장 경제와 금융 생활/.test(concept)) {
        if (hit("합리적 선택", "기회비용", "시장 참여자", "효율성", "가계", "기업", "정부", "경제 윤리")) {
          if (/market_structure_decision/.test(axisId) || /시장 구조·경제 의사결정 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 54 : 48);
        }
        if (hit("금융 자산", "자산 관리", "생애 주기", "위험 관리")) {
          if (/finance_life_design/.test(axisId) || /금융 생활·자산 관리 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 50 : 46);
        }
        if (hit("무역", "국제 분업", "자유 무역", "보호 무역", "상호 의존")) {
          if (/trade_interdependence_analysis/.test(axisId) || /무역·상호의존 해석 축/.test(axisTitle) || axisDomain === "social_policy") fallback = Math.max(fallback, 46);
        }
      }
      if (/미래와 지속 가능한 삶/.test(concept)) {
        if (hit("인구 변화", "저출산", "고령화", "인구 이동", "자원", "자원 분포", "소비 실태", "지속 가능한 발전", "지속 가능성")) {
          if (/population_resource_sustainability/.test(axisId) || /인구·자원·지속가능성 축/.test(axisTitle) || axisDomain === "earth_env") fallback = Math.max(fallback, isItMajor ? 52 : 48);
        }
        if (hit("미래 직업", "미래 사회", "미래 지구촌", "삶의 방향", "공동체")) {
          if (/future_society_design/.test(axisId) || /미래 사회 설계 축/.test(axisTitle) || axisDomain === "social_policy") fallback = Math.max(fallback, isItMajor ? 52 : 46);
        }
      }
      if (/통합적 관점과 행복/.test(concept)) {
        if (hit("시간적 관점", "공간적 관점", "사회적 관점", "윤리적 관점", "통합적 사고력")) {
          if (/social_issue_integrated_analysis/.test(axisId) || /사회문제 통합해석 축/.test(axisTitle) || axisDomain === "social_policy") fallback = Math.max(fallback, 48);
        }
        if (hit("행복 지수", "삶의 질", "객관적 기준", "주관적 기준")) {
          if (/quality_of_life_data_axis/.test(axisId) || /삶의 질 지표 해석 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 48 : 42);
        }
      }
    }

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


    if (fuzzyIncludes(state.subject, "과학탐구실험1")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/자료 수집·분석·결론 도출/.test(concept)) {
        if (hit("자료 수집", "분석", "그래프", "표", "데이터", "평균", "비교", "경향")) {
          if (/data_collection_analysis/.test(axisId) || /자료 수집·분석 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 56 : 46);
          if (/error_interpretation_validation/.test(axisId) || /오차 해석·검증 축/.test(axisTitle) || axisDomain === "experimental_design") fallback = Math.max(fallback, 10);
        }
        if (hit("오차", "신뢰도", "검증", "정확도", "정밀도", "보정")) {
          if (/error_interpretation_validation/.test(axisId) || /오차 해석·검증 축/.test(axisTitle) || axisDomain === "experimental_design") fallback = Math.max(fallback, isItMajor ? 54 : 46);
          if (/data_collection_analysis/.test(axisId) || /자료 수집·분석 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 10);
        }
        if (hit("결론", "근거", "해석", "증거 기반 설명")) {
          if (/conclusion_argumentation_reporting/.test(axisId) || /결론 도출·논증 축/.test(axisTitle) || axisDomain === "communication") fallback = Math.max(fallback, 50);
          if (/data_collection_analysis/.test(axisId) || /자료 수집·분석 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 10);
        }
      }
      if (/가설 설정과 탐구 설계/.test(concept)) {
        if (hit("가설", "조작변인", "통제변인", "종속변인", "변인", "대조 실험")) {
          if (/hypothesis_variable_design/.test(axisId) || /가설·변인 설계 축/.test(axisTitle) || axisDomain === "inquiry_method") fallback = Math.max(fallback, isItMajor ? 56 : 48);
          if (/procedure_reproducibility/.test(axisId) || /절차 설계·재현성 축/.test(axisTitle) || axisDomain === "experimental_design") fallback = Math.max(fallback, 12);
        }
        if (hit("실험 설계", "탐구 절차", "절차", "순서", "도구", "기구", "안전")) {
          if (/procedure_reproducibility/.test(axisId) || /절차 설계·재현성 축/.test(axisTitle) || axisDomain === "experimental_design") fallback = Math.max(fallback, 52);
          if (/hypothesis_variable_design/.test(axisId) || /가설·변인 설계 축/.test(axisTitle) || axisDomain === "inquiry_method") fallback = Math.max(fallback, 10);
        }
        if (hit("예상 결과", "그래프", "패턴")) {
          if (/logic_prediction_modeling/.test(axisId) || /논리 예측·모델링 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 52 : 44);
        }
      }
      if (/문제 인식과 탐구 질문 설정/.test(concept)) {
        if (hit("문제 인식", "탐구 질문", "질문 설정", "궁금증", "탐구 주제", "탐구 목적")) {
          if (/inquiry_question_design/.test(axisId) || /탐구 질문 설계 축/.test(axisTitle) || axisDomain === "inquiry_method") fallback = Math.max(fallback, isItMajor ? 54 : 46);
        }
        if (hit("주제", "범위", "구체화", "생활 속 현상", "관찰", "사례")) {
          if (/phenomenon_observation_subject_link/.test(axisId) || /현상 관찰·교과 연결 축/.test(axisTitle) || axisDomain === "observation") fallback = Math.max(fallback, 48);
        }
      }
      if (/탐구 보고서 작성/.test(concept)) {
        if (hit("보고서", "구성", "서론", "결과", "결론", "탐구 주제", "탐구 목적", "탐구 문제")) {
          if (/report_writing_structure/.test(axisId) || /탐구 보고서 구조화 축/.test(axisTitle) || axisDomain === "communication") fallback = Math.max(fallback, 52);
        }
        if (hit("발표", "슬라이드", "그래프", "시각화", "포스터", "카드뉴스")) {
          if (/visual_presentation_design/.test(axisId) || /시각화·발표 설계 축/.test(axisTitle) || axisDomain === "presentation") fallback = Math.max(fallback, isItMajor ? 50 : 42);
        }
      }
    }


    if (fuzzyIncludes(state.subject, "과학탐구실험2")) {
      const isItMajor = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|센서|자동화)/i.test([state.career || "", getMajorTextBag()].join(" "));
      if (/첨단 센서와 디지털 정보 탐구/.test(concept)) {
        if (hit("센서", "입력", "출력", "측정", "신호", "자동화", "제어", "장치", "시스템")) {
          if (/sensor_system_engineering/.test(axisId) || /센서·시스템 설계 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, isItMajor ? 58 : 48);
          if (/digital_information_processing/.test(axisId) || /디지털 정보 처리 축/.test(axisTitle) || axisDomain === "information") fallback = Math.max(fallback, 16);
        }
        if (hit("디지털 정보", "데이터", "저장", "전송", "디지털", "코드", "압축", "기록", "통신")) {
          if (/digital_information_processing/.test(axisId) || /디지털 정보 처리 축/.test(axisTitle) || axisDomain === "information") fallback = Math.max(fallback, isItMajor ? 58 : 48);
          if (/sensor_system_engineering/.test(axisId) || /센서·시스템 설계 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 14);
        }
        if (hit("스마트홈", "스마트시티", "생활", "활용")) {
          if (/smart_life_application/.test(axisId) || /스마트 생활 적용 축/.test(axisTitle) || axisDomain === "life") fallback = Math.max(fallback, 44);
        }
      }

      if (/생활 자료를 활용한 과학적 의사결정 탐구/.test(concept)) {
        if (hit("그래프", "통계", "설문", "자료", "시각화", "수집", "정리", "분석")) {
          if (/daily_life_data_analysis/.test(axisId) || /생활 데이터 해석 축/.test(axisTitle) || axisDomain === "statistics") fallback = Math.max(fallback, isItMajor ? 56 : 48);
          if (/evidence_based_decision/.test(axisId) || /근거 기반 판단 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, 14);
        }
        if (hit("근거", "선택", "판단", "의사결정", "비교", "장단점", "기준", "합리적")) {
          if (/evidence_based_decision/.test(axisId) || /근거 기반 판단 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 54 : 48);
          if (/daily_life_data_analysis/.test(axisId) || /생활 데이터 해석 축/.test(axisTitle) || axisDomain === "statistics") fallback = Math.max(fallback, 12);
        }
      }

      if (/첨단 과학 기술의 사회 적용 탐구/.test(concept)) {
        if (hit("인공지능", "로봇", "바이오", "우주", "반도체", "산업", "미래 사회", "변화")) {
          if (/future_technology_application/.test(axisId) || /미래 기술·응용 해석 축/.test(axisTitle) || axisDomain === "technology") fallback = Math.max(fallback, isItMajor ? 56 : 46);
          if (/technology_society_ethics/.test(axisId) || /과학기술·사회·윤리 축/.test(axisTitle) || axisDomain === "ethics") fallback = Math.max(fallback, 14);
        }
        if (hit("윤리", "위험", "책임", "규제", "부작용", "찬반", "쟁점", "토론", "사회 영향")) {
          if (/technology_society_ethics/.test(axisId) || /과학기술·사회·윤리 축/.test(axisTitle) || axisDomain === "ethics") fallback = Math.max(fallback, isItMajor ? 54 : 48);
          if (/future_technology_application/.test(axisId) || /미래 기술·응용 해석 축/.test(axisTitle) || axisDomain === "technology") fallback = Math.max(fallback, 12);
        }
      }

      if (/생체 신호와 건강 데이터 탐구/.test(concept)) {
        if (hit("심박수", "체온", "호흡", "혈압", "맥박", "건강 상태", "운동", "휴식", "스트레스")) {
          if (/biomedical_signal_analysis/.test(axisId) || /생체 신호·건강 해석 축/.test(axisTitle) || axisDomain === "biology") fallback = Math.max(fallback, 52);
        }
        if (hit("그래프", "기록", "앱", "추적", "패턴", "비교", "평균", "변화량")) {
          if (/health_data_visualization/.test(axisId) || /건강 데이터 시각화 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 54 : 46);
        }
        if (hit("웨어러블", "스마트워치", "센서", "헬스케어")) {
          if (/digital_healthcare_application/.test(axisId) || /디지털 헬스케어 적용 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, isItMajor ? 54 : 44);
        }
      }

      if (/내진 설계와 구조 안정성 탐구/.test(concept)) {
        if (hit("내진", "면진", "제진", "구조", "하중", "건물", "교량", "설계 개선", "보강")) {
          if (/seismic_structure_engineering/.test(axisId) || /내진 구조·설계 축/.test(axisTitle) || axisDomain === "engineering") fallback = Math.max(fallback, 52);
        }
        if (hit("진동", "주기", "공진", "지진파", "흔들림", "파동", "진폭", "주파수")) {
          if (/vibration_wave_analysis/.test(axisId) || /진동·파동 해석 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 50);
        }
      }

      if (/충격을 줄이는 방법과 안전장치 탐구/.test(concept)) {
        if (hit("에어백", "헬멧", "범퍼", "안전벨트", "충격 흡수", "구조", "설계", "재료", "완충")) {
          if (/impact_safety_engineering/.test(axisId) || /충돌·안전 설계 축/.test(axisTitle) || axisDomain === "physics") fallback = Math.max(fallback, 52);
        }
        if (hit("속도", "감속", "그래프", "데이터", "측정", "기준", "비교", "수치", "모델")) {
          if (/collision_data_modeling/.test(axisId) || /충격 데이터·모델링 축/.test(axisTitle) || axisDomain === "data") fallback = Math.max(fallback, isItMajor ? 54 : 46);
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


  function getScienceInquiry1PreferredConceptSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "문제 인식과 탐구 질문 설정",
      "가설 설정과 탐구 설계",
      "자료 수집·분석·결론 도출",
      "탐구 보고서 작성",
      "갈릴레이의 경사면 실험과 낙하 운동",
      "멘델레예프의 주기율표 만들기",
      "과학의 단위 및 도량형의 역사 추적하기",
      "과학사에서 동시 발견으로 이룬 과학 발전 추적하기",
      "우리 선조들의 과학 기술 발전 사례 찾기"
    ];

    if (!majorText) return defaultSequence;

    if (/(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it") {
      return [
        "자료 수집·분석·결론 도출",
        "가설 설정과 탐구 설계",
        "문제 인식과 탐구 질문 설정",
        "탐구 보고서 작성",
        "과학의 단위 및 도량형의 역사 추적하기",
        "갈릴레이의 경사면 실험과 낙하 운동",
        "멘델레예프의 주기율표 만들기",
        "과학사에서 동시 발견으로 이룬 과학 발전 추적하기",
        "우리 선조들의 과학 기술 발전 사례 찾기"
      ];
    }
    if (/(전자|전기|회로|센서|통신|반도체|로봇|임베디드|제어)/.test(majorText) || bucket === "electronic") {
      return [
        "가설 설정과 탐구 설계",
        "자료 수집·분석·결론 도출",
        "갈릴레이의 경사면 실험과 낙하 운동",
        "과학의 단위 및 도량형의 역사 추적하기",
        "탐구 보고서 작성",
        "문제 인식과 탐구 질문 설정",
        "멘델레예프의 주기율표 만들기",
        "과학사에서 동시 발견으로 이룬 과학 발전 추적하기",
        "우리 선조들의 과학 기술 발전 사례 찾기"
      ];
    }
    if (/(간호|의학|보건|수의|약학|생명|바이오|의료|임상|화학|신소재|재료|환경|기후)/.test(majorText) || bucket === "bio" || bucket === "materials" || bucket === "env") {
      return [
        "가설 설정과 탐구 설계",
        "자료 수집·분석·결론 도출",
        "문제 인식과 탐구 질문 설정",
        "탐구 보고서 작성",
        "멘델레예프의 주기율표 만들기",
        "과학의 단위 및 도량형의 역사 추적하기",
        "갈릴레이의 경사면 실험과 낙하 운동",
        "과학사에서 동시 발견으로 이룬 과학 발전 추적하기",
        "우리 선조들의 과학 기술 발전 사례 찾기"
      ];
    }

    return defaultSequence;
  }



  function isScienceInquiry2ComputerMajorContext() {
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function getScienceInquiry2PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "생활 자료를 활용한 과학적 의사결정 탐구",
      "첨단 센서와 디지털 정보 탐구",
      "첨단 과학 기술의 사회 적용 탐구",
      "생체 신호와 건강 데이터 탐구",
      "충격을 줄이는 방법과 안전장치 탐구",
      "내진 설계와 구조 안정성 탐구"
    ];

    if (!majorText) return defaultSequence;

    if (isScienceInquiry2ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it") {
      return [
        "첨단 센서와 디지털 정보 탐구",
        "생활 자료를 활용한 과학적 의사결정 탐구",
        "첨단 과학 기술의 사회 적용 탐구",
        "생체 신호와 건강 데이터 탐구",
        "내진 설계와 구조 안정성 탐구",
        "충격을 줄이는 방법과 안전장치 탐구"
      ];
    }

    if (/(전자|전기|회로|센서|통신|반도체|로봇|임베디드|제어)/.test(majorText) || bucket === "electronic") {
      return [
        "첨단 센서와 디지털 정보 탐구",
        "내진 설계와 구조 안정성 탐구",
        "충격을 줄이는 방법과 안전장치 탐구",
        "첨단 과학 기술의 사회 적용 탐구",
        "생활 자료를 활용한 과학적 의사결정 탐구",
        "생체 신호와 건강 데이터 탐구"
      ];
    }

    if (/(간호|의학|보건|수의|약학|생명|바이오|의료|임상)/.test(majorText) || bucket === "bio") {
      return [
        "생체 신호와 건강 데이터 탐구",
        "생활 자료를 활용한 과학적 의사결정 탐구",
        "첨단 센서와 디지털 정보 탐구",
        "첨단 과학 기술의 사회 적용 탐구",
        "충격을 줄이는 방법과 안전장치 탐구",
        "내진 설계와 구조 안정성 탐구"
      ];
    }

    if (/(건축|토목|도시|기계|재난|안전|구조)/.test(majorText)) {
      return [
        "내진 설계와 구조 안정성 탐구",
        "충격을 줄이는 방법과 안전장치 탐구",
        "첨단 센서와 디지털 정보 탐구",
        "생활 자료를 활용한 과학적 의사결정 탐구",
        "첨단 과학 기술의 사회 적용 탐구",
        "생체 신호와 건강 데이터 탐구"
      ];
    }

    return defaultSequence;
  }


  function isAlgebraComputerMajorContext() {
    if (isDataScienceMajorSelectedContext()) return false;
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function getAlgebraPreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "거듭제곱과 거듭제곱근",
      "지수의 확장",
      "로그의 뜻과 성질",
      "상용로그",
      "지수함수의 뜻과 그래프",
      "로그함수의 뜻과 그래프",
      "지수함수와 로그함수의 활용",
      "등차수열과 등비수열",
      "수열의 합",
      "수학적 귀납법"
    ];

    if (!majorText) return defaultSequence;

    if (isDataScienceMajorSelectedContext()) {
      return [
        "지수함수와 로그함수의 활용",
        "로그함수의 뜻과 그래프",
        "등차수열과 등비수열",
        "수열의 합",
        "수학적 귀납법",
        "지수함수의 뜻과 그래프",
        "로그의 뜻과 성질",
        "상용로그",
        "지수의 확장",
        "거듭제곱과 거듭제곱근"
      ];
    }

    if (isAlgebraComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(majorText) || bucket === "it") {
      return [
        "지수함수와 로그함수의 활용",
        "등차수열과 등비수열",
        "수학적 귀납법",
        "수열의 합",
        "로그함수의 뜻과 그래프",
        "지수함수의 뜻과 그래프",
        "로그의 뜻과 성질",
        "상용로그",
        "지수의 확장",
        "거듭제곱과 거듭제곱근"
      ];
    }

    if (/(전자|전기|회로|센서|통신|반도체|로봇|임베디드|제어|신호)/.test(majorText) || bucket === "electronic") {
      return [
        "지수함수와 로그함수의 활용",
        "로그의 뜻과 성질",
        "상용로그",
        "지수함수의 뜻과 그래프",
        "로그함수의 뜻과 그래프",
        "지수의 확장",
        "거듭제곱과 거듭제곱근"
      ];
    }

    if (/(기계|자동차|항공|모빌리티|물리|에너지|화학|생명|보건|간호|의학|바이오|환경|기후|지구)/.test(majorText) || bucket === "mechanical" || bucket === "bio" || bucket === "env" || bucket === "materials") {
      return [
        "지수함수의 뜻과 그래프",
        "지수함수와 로그함수의 활용",
        "로그함수의 뜻과 그래프",
        "상용로그",
        "로그의 뜻과 성질",
        "지수의 확장",
        "거듭제곱과 거듭제곱근"
      ];
    }

    return defaultSequence;
  }


  function isCalculus1ComputerMajorContext() {
    if (isDataScienceMajorSelectedContext()) return false;
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|최적화)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function getCalculus1PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "수열의 극한",
      "급수",
      "여러 가지 함수의 미분",
      "여러 가지 미분법",
      "도함수의 활용",
      "여러 가지 적분법",
      "정적분의 활용"
    ];
    if (!majorText) return defaultSequence;
    if (isDataScienceMajorSelectedContext()) {
      return [
        "도함수의 활용",
        "정적분의 활용",
        "수열의 극한",
        "급수",
        "여러 가지 함수의 미분",
        "여러 가지 미분법",
        "여러 가지 적분법"
      ];
    }
    if (isCalculus1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|최적화)/i.test(majorText) || bucket === "it") {
      return [
        "도함수의 활용",
        "여러 가지 함수의 미분",
        "수열의 극한",
        "정적분의 활용",
        "급수",
        "여러 가지 미분법",
        "여러 가지 적분법"
      ];
    }
    if (/(전자|전기|회로|센서|통신|반도체|로봇|제어|신호|물리|기계|항공|모빌리티)/.test(majorText) || bucket === "electronic" || bucket === "mechanical") {
      return [
        "도함수의 활용",
        "여러 가지 함수의 미분",
        "정적분의 활용",
        "여러 가지 미분법",
        "여러 가지 적분법",
        "수열의 극한",
        "급수"
      ];
    }
    if (/(통계|데이터|금융|경제|경영|보험|사회|보건|의학|바이오|환경)/.test(majorText) || bucket === "bio" || bucket === "env") {
      return [
        "정적분의 활용",
        "수열의 극한",
        "급수",
        "도함수의 활용",
        "여러 가지 함수의 미분",
        "여러 가지 미분법",
        "여러 가지 적분법"
      ];
    }
    return defaultSequence;
  }

  function isDataScienceMajorSelectedContext() {
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(데이터사이언스학과|데이터사이언스|데이터과학|빅데이터|데이터분석|데이터공학|AI데이터|인공지능데이터|통계학과|응용통계|산업데이터|정보통계|수리데이터|데이터애널리틱스|데이터 분석)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*(데이터사이언스학과|통계학과|빅데이터)/.test(bodyText) || /학과\s*(데이터사이언스학과|통계학과|빅데이터)/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function isProbabilityStatisticsComputerMajorContext() {
    if (isDataScienceMajorSelectedContext()) return false;
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function getProbabilityStatisticsPreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "순열과 조합",
      "이항정리",
      "확률의 뜻과 기본 성질",
      "조건부확률과 사건의 독립",
      "확률변수와 확률분포",
      "이항분포와 정규분포",
      "모집단과 표본",
      "통계적 추정"
    ];

    if (!majorText) return defaultSequence;

    if (isDataScienceMajorSelectedContext()) {
      return [
        "확률변수와 확률분포",
        "이항분포와 정규분포",
        "통계적 추정",
        "모집단과 표본",
        "조건부확률과 사건의 독립",
        "확률의 뜻과 기본 성질",
        "순열과 조합",
        "이항정리"
      ];
    }

    if (isProbabilityStatisticsComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(majorText) || bucket === "it") {
      return [
        "순열과 조합",
        "조건부확률과 사건의 독립",
        "확률변수와 확률분포",
        "이항분포와 정규분포",
        "통계적 추정",
        "모집단과 표본",
        "이항정리",
        "확률의 뜻과 기본 성질"
      ];
    }

    if (/(경영|경제|금융|무역|사회|행정|심리|교육|언론|미디어|보건|간호|의학|바이오)/.test(majorText) || bucket === "bio") {
      return [
        "통계적 추정",
        "모집단과 표본",
        "이항분포와 정규분포",
        "확률변수와 확률분포",
        "조건부확률과 사건의 독립",
        "확률의 뜻과 기본 성질",
        "순열과 조합",
        "이항정리"
      ];
    }

    return defaultSequence;
  }

  function isIntegratedSociety1ComputerMajorContext() {
    const primaryText = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");

    let visibleMajorText = "";
    try {
      const nodes = Array.from(document.querySelectorAll('.top-summary-card, .summary-card, .major-engine-title, .major-engine-candidate.is-selected, [data-major-select], [data-selected-major], [data-major-name]'));
      visibleMajorText = nodes.map(node => String(node.textContent || node.getAttribute?.('data-major-select') || node.getAttribute?.('data-selected-major') || node.getAttribute?.('data-major-name') || '')).join(' ');
      if (!visibleMajorText) visibleMajorText = String(document.body?.innerText || '').slice(0, 5000);
    } catch (error) {}

    const text = `${primaryText} ${visibleMajorText}`;
    return /(컴퓨터공학|컴퓨터|소프트웨어|AI|인공지능|데이터|정보보호|정보보안|정보통신|프로그래밍|통계|네트워크|플랫폼|웹|앱|게임)/i.test(text);
  }

  function getIntegratedSociety1PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "통합적 관점과 행복",
      "자연환경과 인간의 공존",
      "생활 공간 변화와 지역 이해",
      "인권 보장과 시민 참여",
      "시장 경제와 금융 생활",
      "사회 정의와 불평등",
      "문화 다양성과 세계화",
      "미래와 지속 가능한 삶"
    ];

    if (!majorText) return defaultSequence;

    if (isIntegratedSociety1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|플랫폼|네트워크)/i.test(majorText) || bucket === "it") {
      return [
        "생활 공간 변화와 지역 이해",
        "시장 경제와 금융 생활",
        "미래와 지속 가능한 삶",
        "통합적 관점과 행복",
        "인권 보장과 시민 참여",
        "사회 정의와 불평등",
        "문화 다양성과 세계화",
        "자연환경과 인간의 공존"
      ];
    }

    if (/(환경|기후|지구|도시|건축|토목|지역|지리|해양)/.test(majorText) || bucket === "env") {
      return [
        "자연환경과 인간의 공존",
        "생활 공간 변화와 지역 이해",
        "미래와 지속 가능한 삶",
        "통합적 관점과 행복",
        "사회 정의와 불평등",
        "시장 경제와 금융 생활",
        "문화 다양성과 세계화",
        "인권 보장과 시민 참여"
      ];
    }

    if (/(경영|경제|금융|무역|국제|통상|회계|세무|소비자)/.test(majorText)) {
      return [
        "시장 경제와 금융 생활",
        "미래와 지속 가능한 삶",
        "문화 다양성과 세계화",
        "통합적 관점과 행복",
        "사회 정의와 불평등",
        "생활 공간 변화와 지역 이해",
        "인권 보장과 시민 참여",
        "자연환경과 인간의 공존"
      ];
    }

    if (/(법|행정|정치|사회복지|교육|언론|미디어|국제관계|외교)/.test(majorText)) {
      return [
        "인권 보장과 시민 참여",
        "사회 정의와 불평등",
        "문화 다양성과 세계화",
        "통합적 관점과 행복",
        "미래와 지속 가능한 삶",
        "시장 경제와 금융 생활",
        "생활 공간 변화와 지역 이해",
        "자연환경과 인간의 공존"
      ];
    }

    return defaultSequence;
  }


  function getIntegratedSociety2PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "인권 보장과 헌법",
      "사회 정의와 불평등",
      "시장경제와 지속가능발전",
      "세계화와 평화",
      "미래와 지속가능한 삶"
    ];

    if (!majorText) return defaultSequence;

    if (isIntegratedSociety1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|플랫폼|네트워크|알고리즘)/i.test(majorText) || bucket === "it") {
      return [
        "미래와 지속가능한 삶",
        "시장경제와 지속가능발전",
        "인권 보장과 헌법",
        "세계화와 평화",
        "사회 정의와 불평등"
      ];
    }

    if (/(경영|경제|금융|무역|국제|통상|회계|세무|소비자|물류|플랫폼)/.test(majorText)) {
      return [
        "시장경제와 지속가능발전",
        "세계화와 평화",
        "미래와 지속가능한 삶",
        "사회 정의와 불평등",
        "인권 보장과 헌법"
      ];
    }

    if (/(법|행정|정치|사회복지|교육|언론|미디어|국제관계|외교|경찰)/.test(majorText)) {
      return [
        "인권 보장과 헌법",
        "사회 정의와 불평등",
        "세계화와 평화",
        "미래와 지속가능한 삶",
        "시장경제와 지속가능발전"
      ];
    }

    if (/(환경|기후|지구|도시|건축|토목|지역|지리|해양|에너지)/.test(majorText) || bucket === "env") {
      return [
        "미래와 지속가능한 삶",
        "시장경제와 지속가능발전",
        "세계화와 평화",
        "사회 정의와 불평등",
        "인권 보장과 헌법"
      ];
    }

    return defaultSequence;
  }


  function isGeometryComputerMajorContext() {
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|그래픽|그래픽스|공간정보|로봇|자율주행|메타버스|영상|비전)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }



  function isLifeScienceComputerMajorContext() {
    const localBag = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag() || ""].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|바이오인포매틱스|생명정보|신경망|뉴럴|센서|헬스케어)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }


  function getLifeScienceExactMajorText() {
    const exactParts = [];
    try {
      const summary = String($("engineCareerSummary")?.textContent || "").replace(/s+/g, " ").trim();
      if (summary && !/입력 전|선택 전|대기|찾지 못했|추천/.test(summary)) exactParts.push(summary);
    } catch (error) {}
    try {
      const input = String(getCareerInputText?.() || "").replace(/s+/g, " ").trim();
      if (input && !/입력 전|선택 전|대기|찾지 못했|추천/.test(input)) exactParts.push(input);
    } catch (error) {}
    [state.majorSelectedName, getEffectiveCareerName?.(), getMajorPanelResolvedName?.(), state.career].forEach(value => {
      const text = String(value || "").replace(/s+/g, " ").trim();
      if (text && !/입력 전|선택 전|대기|찾지 못했|추천/.test(text)) exactParts.push(text);
    });
    return uniq(exactParts).join(" ").trim();
  }

  function getLifeScienceMajorKind() {
    const exact = getLifeScienceExactMajorText();
    if (/(^|s)(생명공학과|생명공학|의생명공학|유전공학|분자생명|생명정보학|생명정보|바이오공학|바이오테크|바이오메디컬)(s|$)/.test(exact)) return "bioengineering";
    if (/(^|s)(간호학과|간호|보건|재활|물리치료|작업치료|임상병리)(s|$)/.test(exact)) return "nursing";
    if (/(^|s)(약학과|약학|제약|신약|약물|약대|화공)(s|$)/.test(exact)) return "pharmacy";
    if (/(^|s)(식품영양학과|식품영양|영양|식품|조리|푸드|운동처방|운동재활)(s|$)/.test(exact)) return "food";
    if (/(^|s)(환경공학과|환경생태학과|환경공학|환경생태|생태|환경|기후|해양|산림|자원|농생명)(s|$)/.test(exact)) return "environment";
    if (/(^|s)(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|바이오인포매틱스|신경망|뉴럴|센서|헬스케어)(s|$)/i.test(exact)) return "computer";

    let mixed = exact;
    try { mixed += " " + String(document.body?.innerText || "").replace(/s+/g, " "); } catch (error) {}
    if (/2.s*학과s*생명공학과|학과s*생명공학과/.test(mixed)) return "bioengineering";
    if (/2.s*학과s*간호학과|학과s*간호학과/.test(mixed)) return "nursing";
    if (/2.s*학과s*약학과|학과s*약학과/.test(mixed)) return "pharmacy";
    if (/2.s*학과s*식품영양학과|학과s*식품영양학과/.test(mixed)) return "food";
    if (/2.s*학과s*환경공학과|학과s*환경공학과|2.s*학과s*환경생태학과|학과s*환경생태학과/.test(mixed)) return "environment";
    if (/2.s*학과s*컴퓨터공학과|학과s*컴퓨터공학과/.test(mixed)) return "computer";
    return "";
  }

  function isLifeScienceBioengineeringMajorContext() {
    return getLifeScienceMajorKind() === "bioengineering";
  }

  function getLifeSciencePreferredConceptSequence() {
    // v33.47 life-science selected-major guard:
    // 일부 학과 프로필/화면 텍스트에 식품·환경·보건 키워드가 함께 섞이면
    // 생명공학과가 식품/보건 일반 분기로 밀리는 문제가 있어, 상단 상태 카드의 실제 선택 학과를 우선 읽는다.
    let statusMajorText = "";
    try {
      statusMajorText = String($("engineCareerSummary")?.textContent || "").replace(/\s+/g, " ").trim();
      if (/입력 전|선택 전|대기/.test(statusMajorText)) statusMajorText = "";
    } catch (error) {}
    const majorTextRaw = [statusMajorText || "", state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    let visibleMajorText = "";
    try {
      visibleMajorText = String(document.body?.innerText || "").replace(/\s+/g, " ");
    } catch (error) {}
    const majorText = [majorTextRaw, visibleMajorText].join(" ").trim();
    const selectedMajorText = [statusMajorText || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || ""].join(" ").trim();
    const bucket = detectCareerBucket(majorTextRaw || majorText);
    const defaultSequence = ["생명과학의 이해", "물질대사와 에너지", "물질대사와 건강", "생태계의 물질 순환과 상호 작용", "신경 자극 전도와 전달", "신경계와 항상성", "면역과 백신", "유전자와 염색체", "생식과 생명의 연속성", "진화와 생물 다양성"];
    if (!majorTextRaw && !visibleMajorText) return defaultSequence;

    const exactMajorKind = getLifeScienceMajorKind();
    if (exactMajorKind === "bioengineering") {
      return ["유전자와 염색체", "생명과학의 이해", "물질대사와 에너지", "면역과 백신", "신경 자극 전도와 전달", "생식과 생명의 연속성", "진화와 생물 다양성", "신경계와 항상성", "물질대사와 건강", "생태계의 물질 순환과 상호 작용"];
    }
    if (exactMajorKind === "nursing") {
      return ["물질대사와 건강", "신경계와 항상성", "면역과 백신", "물질대사와 에너지", "신경 자극 전도와 전달", "생명과학의 이해", "유전자와 염색체", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (exactMajorKind === "pharmacy") {
      return ["물질대사와 에너지", "면역과 백신", "신경 자극 전도와 전달", "물질대사와 건강", "유전자와 염색체", "신경계와 항상성", "생명과학의 이해", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (exactMajorKind === "food") {
      return ["물질대사와 에너지", "물질대사와 건강", "신경계와 항상성", "생태계의 물질 순환과 상호 작용", "생명과학의 이해", "면역과 백신", "진화와 생물 다양성", "유전자와 염색체", "신경 자극 전도와 전달", "생식과 생명의 연속성"];
    }
    if (exactMajorKind === "environment") {
      return ["생태계의 물질 순환과 상호 작용", "진화와 생물 다양성", "생명과학의 이해", "물질대사와 에너지", "물질대사와 건강", "유전자와 염색체", "면역과 백신", "신경계와 항상성", "신경 자극 전도와 전달", "생식과 생명의 연속성"];
    }
    if (exactMajorKind === "computer") {
      return ["유전자와 염색체", "신경 자극 전도와 전달", "신경계와 항상성", "생태계의 물질 순환과 상호 작용", "진화와 생물 다양성", "생명과학의 이해", "물질대사와 건강", "면역과 백신", "물질대사와 에너지", "생식과 생명의 연속성"];
    }

    // v33.48 life science exact-major guard is above. Legacy mixed-text guard remains as fallback.
    // v33.44 life science major-order guard:
    // 화면 본문/학과 프로필 안의 다른 학과명이 섞여 들어와도, 상단에서 실제 선택한 학과가 먼저 이기도록 한다.
    const explicitMajorText = majorTextRaw;
    const visibleTopMajor = visibleMajorText;
    const topNursing = /(2\.\s*학과\s*간호학과|학과\s*간호학과)/.test(visibleTopMajor);
    const topBioEng = /(2\.\s*학과\s*생명공학과|학과\s*생명공학과)/.test(visibleTopMajor);
    const topPharmacy = /(2\.\s*학과\s*약학과|학과\s*약학과)/.test(visibleTopMajor);
    const topFoodNutrition = /(2\.\s*학과\s*식품영양학과|학과\s*식품영양학과)/.test(visibleTopMajor);
    const topEnv = /(2\.\s*학과\s*환경공학과|학과\s*환경공학과|2\.\s*학과\s*환경생태학과|학과\s*환경생태학과)/.test(visibleTopMajor);
    const selectedNursing = /(간호학과|간호|보건|재활|물리치료|작업치료|임상병리)/.test(selectedMajorText);
    const selectedBioEng = /(생명공학과|생명공학|의생명공학|유전공학|분자생명|생명정보학|바이오공학|바이오테크|바이오메디컬)/.test(selectedMajorText);
    const selectedPharmacy = /(약학과|약학|제약|신약|약물|약대|화공)/.test(selectedMajorText);
    const selectedFoodNutrition = /(식품영양학과|식품영양|영양|식품|조리|푸드|운동처방|운동재활)/.test(selectedMajorText);
    const selectedEnv = /(환경공학과|환경생태학과|환경공학|환경생태|생태|환경|기후|해양|산림|자원|농생명)/.test(selectedMajorText);

    if (topNursing || selectedNursing || /(간호학과|간호|보건|재활|물리치료|작업치료|임상병리)/.test(explicitMajorText)) {
      return ["물질대사와 건강", "신경계와 항상성", "면역과 백신", "물질대사와 에너지", "신경 자극 전도와 전달", "생명과학의 이해", "유전자와 염색체", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (topPharmacy || selectedPharmacy || /(약학과|약학|제약|신약|약물|약대|화공)/.test(explicitMajorText)) {
      return ["물질대사와 에너지", "면역과 백신", "신경 자극 전도와 전달", "물질대사와 건강", "유전자와 염색체", "신경계와 항상성", "생명과학의 이해", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (topFoodNutrition || selectedFoodNutrition || /(식품영양학과|식품영양|영양|식품|조리|푸드|운동처방|운동재활)/.test(explicitMajorText)) {
      return ["물질대사와 에너지", "물질대사와 건강", "신경계와 항상성", "생태계의 물질 순환과 상호 작용", "생명과학의 이해", "면역과 백신", "진화와 생물 다양성", "유전자와 염색체", "신경 자극 전도와 전달", "생식과 생명의 연속성"];
    }
    if (topEnv || selectedEnv || /(환경공학과|환경생태학과|환경공학|환경생태|생태|환경|기후|해양|산림|자원|농생명)/.test(explicitMajorText) || bucket === "env") {
      return ["생태계의 물질 순환과 상호 작용", "진화와 생물 다양성", "생명과학의 이해", "물질대사와 에너지", "물질대사와 건강", "유전자와 염색체", "면역과 백신", "신경계와 항상성", "신경 자극 전도와 전달", "생식과 생명의 연속성"];
    }
    // 생명공학과는 major profile 안에 환경/생태 키워드가 함께 들어오는 경우가 있어 환경 branch보다 먼저 판별하되,
    // 실제 상단 선택값이 간호/약학/식품/환경이면 위 분기가 먼저 처리한다.
    if (topBioEng || selectedBioEng || /(생명공학과|생명공학|의생명공학|유전공학|분자생명|생명정보학|바이오공학|바이오테크|바이오메디컬)/.test(explicitMajorText)) {
      return ["유전자와 염색체", "생명과학의 이해", "물질대사와 에너지", "면역과 백신", "신경 자극 전도와 전달", "생식과 생명의 연속성", "진화와 생물 다양성", "신경계와 항상성", "물질대사와 건강", "생태계의 물질 순환과 상호 작용"];
    }

    if (isLifeScienceComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|바이오인포매틱스|생명정보|신경망|뉴럴|센서|헬스케어)/i.test(majorText) || bucket === "it") {
      return ["유전자와 염색체", "신경 자극 전도와 전달", "신경계와 항상성", "생태계의 물질 순환과 상호 작용", "진화와 생물 다양성", "생명과학의 이해", "물질대사와 건강", "면역과 백신", "물질대사와 에너지", "생식과 생명의 연속성"];
    }
    if (/(식품영양|영양|식품|조리|푸드|운동처방|운동재활)/.test(majorText)) {
      return ["물질대사와 에너지", "물질대사와 건강", "신경계와 항상성", "생태계의 물질 순환과 상호 작용", "생명과학의 이해", "면역과 백신", "진화와 생물 다양성", "유전자와 염색체", "신경 자극 전도와 전달", "생식과 생명의 연속성"];
    }
    if (/(약학|제약|신약|약물|약대|화공)/.test(majorText)) {
      return ["물질대사와 에너지", "면역과 백신", "신경 자극 전도와 전달", "물질대사와 건강", "유전자와 염색체", "신경계와 항상성", "생명과학의 이해", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (/(의예|의학|의료|임상|치의|한의|수의|병리)/.test(majorText)) {
      return ["면역과 백신", "신경계와 항상성", "물질대사와 건강", "유전자와 염색체", "신경 자극 전도와 전달", "물질대사와 에너지", "생식과 생명의 연속성", "생명과학의 이해", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (/(간호|보건|재활|물리치료|작업치료|임상병리)/.test(majorText)) {
      return ["물질대사와 건강", "신경계와 항상성", "면역과 백신", "물질대사와 에너지", "신경 자극 전도와 전달", "생명과학의 이해", "유전자와 염색체", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용"];
    }
    if (/(환경공학|환경생태|생태|환경|기후|해양|산림|자원|농생명)/.test(majorText) || bucket === "env") {
      return ["생태계의 물질 순환과 상호 작용", "진화와 생물 다양성", "생명과학의 이해", "물질대사와 에너지", "물질대사와 건강", "유전자와 염색체", "면역과 백신", "신경계와 항상성", "신경 자극 전도와 전달", "생식과 생명의 연속성"];
    }
    if (/(간호|의학|보건|약학|수의|의료|임상|바이오|생명|제약|식품|화공)/.test(majorText) || bucket === "bio") {
      return ["물질대사와 건강", "면역과 백신", "신경계와 항상성", "물질대사와 에너지", "유전자와 염색체", "생명과학의 이해", "생식과 생명의 연속성", "진화와 생물 다양성", "생태계의 물질 순환과 상호 작용", "신경 자극 전도와 전달"];
    }

    return defaultSequence;
  }


  function getChemistry1MajorTextBundle() {
    // 1학년 이후 선택과목은 화면 전체 텍스트에 교과어가 섞여 학과 분기가 흔들릴 수 있어
    // 상단 상태값/선택 학과명/입력값만 우선으로 모아 판별한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}
    return uniq(parts).join(" ").replace(/\s+/g, " ").trim();
  }

  function isChemistry1BioengineeringSelectedContext() {
    // v88.3 B3-lock:
    // 생명공학과 + 화학에서 getMajorTextBag/profile 안의 반도체·전자·소재 키워드가
    // 최종 추천 개념을 다시 덮어쓰는 문제가 있어, 화면 상단의 실제 선택 학과를 최우선으로 판별한다.
    const selectedParts = [];
    const push = (value) => {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중|추천 개념/.test(text)) return;
      selectedParts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(getEffectiveCareerName?.() || ""); } catch (error) {}
    try { push(getCareerInputText?.() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName?.() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
    } catch (error) {}

    const selectedText = selectedParts.join(" ").replace(/\s+/g, " ").trim();
    const selectedCompact = selectedText.replace(/\s+/g, "");
    const bioPattern = /(생명공학과|생명공학|의생명공학과|의생명공학|바이오공학|분자생명|유전공학|세포공학|바이오테크|생명과학과|생명과학)/;
    const otherExactPattern = /(화학공학과|화공|공업화학|에너지공학과|신소재공학과|재료공학과|반도체공학과|전자공학과|전기공학과|약학과|식품영양학과|환경공학과|간호학과)/;
    if (bioPattern.test(selectedText) || bioPattern.test(selectedCompact)) {
      if (!otherExactPattern.test(selectedText) || /생명공학과|생명공학|의생명공학|바이오공학/.test(selectedText + selectedCompact)) return true;
    }

    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      const bodyCompact = bodyText.replace(/\s+/g, "");
      // 상태 카드/상단 요약에 실제로 '학과 생명공학과'가 찍힌 경우만 body fallback 사용.
      if (/학과\s*[:：]?\s*생명공학과/.test(bodyText) || /2\.\s*학과\s*생명공학과/.test(bodyText) || /학과생명공학과/.test(bodyCompact) || /2\.학과생명공학과/.test(bodyCompact)) return true;
    } catch (error) {}
    return false;
  }

  function getChemistry1MajorKind() {
    if (isChemistry1BioengineeringSelectedContext()) return "bioengineering";
    const rawText = getChemistry1MajorTextBundle();
    const text = String(rawText || "").replace(/\s+/g, " ").trim();
    const compact = text.replace(/\s+/g, "");
    const has = (pattern) => pattern.test(text) || pattern.test(compact);

    // 정확한 학과명 우선: 화학공학/에너지공학은 기존 materials 버킷으로 빨려 들어가면 안 된다.
    if (has(/화학공학과|화공|공업화학|화공생명공학|화학생명공학|화학생물공학|공정|공정시스템/)) return "chemical_engineering";
    if (has(/에너지공학과|에너지공학|에너지시스템|신재생에너지|수소에너지|배터리|이차전지|전지/)) return "energy";
    // v88.4 H1-lock: 간호/보건 계열은 화면 안의 생명·바이오·의료 키워드 때문에
    // 생명공학/반도체형 화학 대표 개념으로 밀리지 않도록 별도 분기한다.
    if (has(/간호학과|간호|보건학과|보건관리|임상병리|방사선|물리치료|작업치료|언어치료|응급구조|재활|의료|의학/)) return "nursing";
    // v88.2 B2-lock: 생명공학과는 화면/프로필에 '바이오소재·생체재료' 같은 단어가 섞여도
    // 신소재(materials)나 반도체/전자형 화학 대표 개념으로 밀리면 안 된다.
    if (has(/생명공학과|의생명공학과|생명공학|의생명공학|바이오공학|분자생명|유전공학|세포공학|바이오테크|생명과학과|생명과학/)) return "bioengineering";
    // v89.7 G1-lock: 식품영양/식품공학 계열은 화학에서 식품 성분·물성·pH·농도 중심으로 분기한다.
    if (has(/식품공학과|식품영양학과|식품공학|식품영양|식품|영양|조리|푸드|발효|식품생명/)) return "food";
    if (typeof isMaterialsMajorSelectedContext === "function" && isMaterialsMajorSelectedContext()) return "materials";
    if (has(/신소재공학과|재료공학과|신소재|재료|나노소재|고분자|금속|세라믹|소재/)) return "materials";
    if (has(/반도체공학과|반도체|나노반도체|시스템반도체|소자공학|전자소자/)) return "semiconductor";
    if (has(/전자공학과|전기전자|전기공학과|전자전기|회로|센서|통신|전파|임베디드/)) return "electronics";
    if (has(/약학과|약학|약대|제약|신약|약물|의약|바이오제약/)) return "pharmacy";
    if (has(/환경공학과|환경공학|대기환경|보건환경|환경보건|환경에너지|기후환경|환경과학|환경/)) return "environment";
    if (has(/화학과|응용화학|화학생명|화학/)) return "chemistry";
    if (has(/컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터사이언스|데이터|정보|통계/)) return "data";
    return "default";
  }


  function isChemistry1ComputerMajorContext() {
    // v88.2 B2-lock: 생명공학과는 생명정보/바이오 데이터/센서 같은 단어가 있어도
    // 컴퓨터·반도체·전자형 화학 대표 개념으로 끌려가면 안 된다.
    if (getChemistry1MajorKind() === "bioengineering" || getChemistry1MajorKind() === "nursing" || getChemistry1MajorKind() === "pharmacy" || getChemistry1MajorKind() === "food") return false;

    // v87.3 M-lock: 신소재/재료계열은 화면 내 '전자 배치' 같은 교과어 때문에
    // 반도체·전자형 화학 대표 개념으로 끌려가면 안 된다.
    if (typeof isMaterialsMajorSelectedContext === "function" && isMaterialsMajorSelectedContext()) return false;

    const selectedMajorBag = [
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      state.career || ""
    ].join(" ");
    if (/(신소재공학과|재료공학과|신소재|재료|나노소재|고분자|금속|세라믹|소재)/.test(selectedMajorBag)
      && !/(반도체공학과|반도체|전자공학과|전자|전기|소자)/.test(selectedMajorBag)) return false;

    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|반도체|전자|전기|통신|네트워크|센서|임베디드|하드웨어|소자)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function getChemistry1PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "화학과 우리 생활",
      "탄소 화합물의 유용성",
      "물질의 양과 화학 반응식",
      "원자의 구조",
      "현대의 원자 모형과 전자 배치",
      "원소의 주기적 성질",
      "화학 결합",
      "분자의 구조와 성질",
      "화학 반응에서의 동적 평형",
      "화학 반응과 열의 출입"
    ];
    const chemistryMajorKind = getChemistry1MajorKind();
    if (!majorText && chemistryMajorKind === "default") return defaultSequence;
    if (chemistryMajorKind === "chemical_engineering") {
      return [
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "화학 반응에서의 동적 평형",
        "분자의 구조와 성질",
        "탄소 화합물의 유용성",
        "화학 결합",
        "원소의 주기적 성질",
        "현대의 원자 모형과 전자 배치",
        "화학과 우리 생활"
      ];
    }
    if (chemistryMajorKind === "energy") {
      return [
        "화학 반응과 열의 출입",
        "물질의 양과 화학 반응식",
        "화학 반응에서의 동적 평형",
        "화학 결합",
        "원소의 주기적 성질",
        "분자의 구조와 성질",
        "현대의 원자 모형과 전자 배치",
        "탄소 화합물의 유용성",
        "화학과 우리 생활"
      ];
    }
    if (chemistryMajorKind === "bioengineering") {
      return [
        "탄소 화합물의 유용성",
        "분자의 구조와 성질",
        "화학 반응에서의 동적 평형",
        "화학 결합",
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "원자의 구조",
        "원소의 주기적 성질",
        "화학과 우리 생활"
      ];
    }
    if (chemistryMajorKind === "nursing") {
      return [
        "탄소 화합물의 유용성",
        "화학 반응에서의 동적 평형",
        "분자의 구조와 성질",
        "물질의 양과 화학 반응식",
        "화학과 우리 생활",
        "화학 반응과 열의 출입",
        "화학 결합",
        "원자의 구조",
        "원소의 주기적 성질"
      ];
    }
    // v89.6 P1-lock: 약학/제약 계열은 화학에서 전자배치·주기율표형으로 끌려가면 안 된다.
    // 의약품 구조, 분자 구조·용해도, pH·완충/안정성, 농도 정량 계산을 우선한다.
    if (chemistryMajorKind === "pharmacy") {
      return [
        "탄소 화합물의 유용성",
        "분자의 구조와 성질",
        "화학 반응에서의 동적 평형",
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "화학 결합",
        "원자의 구조",
        "원소의 주기적 성질",
        "현대의 원자 모형과 전자 배치",
        "화학과 우리 생활"
      ];
    }
    // v89.7 G1-lock: 식품영양/식품공학 계열의 화학 대표 개념은
    // 식품 성분(탄수화물·단백질·지질) → 분자 구조·물성 → pH·보존 안정성 흐름을 우선한다.
    if (chemistryMajorKind === "food") {
      return [
        "탄소 화합물의 유용성",
        "분자의 구조와 성질",
        "화학 반응에서의 동적 평형",
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "화학과 우리 생활",
        "화학 결합",
        "원자의 구조",
        "원소의 주기적 성질",
        "현대의 원자 모형과 전자 배치"
      ];
    }
    // v90.0 Q2-lock: 화학과는 전자배치 단독보다 결합-주기성-분자구조 흐름을 대표 3개로 고정한다.
    // 이후 2차 디테일링에서 전자배치/정량/평형/열화학은 보조 확장 개념으로 다룬다.
    if (chemistryMajorKind === "chemistry") {
      return [
        "화학 결합",
        "원소의 주기적 성질",
        "분자의 구조와 성질",
        "현대의 원자 모형과 전자 배치",
        "물질의 양과 화학 반응식",
        "화학 반응에서의 동적 평형",
        "화학 반응과 열의 출입",
        "원자의 구조",
        "탄소 화합물의 유용성",
        "화학과 우리 생활"
      ];
    }
    if (chemistryMajorKind === "materials") {
      return [
        "화학 결합",
        "원소의 주기적 성질",
        "분자의 구조와 성질",
        "현대의 원자 모형과 전자 배치",
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "탄소 화합물의 유용성",
        "화학과 우리 생활"
      ];
    }
    if (isChemistry1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|반도체|전자|전기|통신|네트워크|센서|임베디드|하드웨어|소자)/i.test(majorText) || bucket === "it" || bucket === "electronic") {
      return [
        "현대의 원자 모형과 전자 배치",
        "원소의 주기적 성질",
        "화학 결합",
        "원자의 구조",
        "분자의 구조와 성질",
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "탄소 화합물의 유용성",
        "화학 반응에서의 동적 평형",
        "화학과 우리 생활"
      ];
    }
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|화공|고분자|금속)/.test(majorText) || bucket === "materials") {
      return [
        "화학 결합",
        "원소의 주기적 성질",
        "분자의 구조와 성질",
        "현대의 원자 모형과 전자 배치",
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "탄소 화합물의 유용성",
        "화학과 우리 생활"
      ];
    }
    return defaultSequence;
  }

  function isPhysicsComputerMajorContext() {
    const localBag = [
      state.career || "",
      state.majorSelectedName || "",
      getEffectiveCareerName() || "",
      getCareerInputText() || "",
      getMajorPanelResolvedName() || "",
      getMajorTextBag() || ""
    ].join(" ");
    if (/(컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|반도체|전자|전기|통신|네트워크|센서|임베디드|하드웨어|로봇|자율주행|그래픽|게임)/i.test(localBag)) return true;
    try {
      const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ");
      if (/2\.\s*학과\s*컴퓨터공학과/.test(bodyText) || /학과\s*컴퓨터공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }

  function getPhysics1PreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "힘과 운동",
      "에너지와 열",
      "물질의 전기적 특성",
      "물질의 자기적 특성",
      "파동의 성질과 활용",
      "빛과 물질의 이중성",
      "시간과 공간"
    ];
    if (!majorText) return defaultSequence;
    if (isPhysicsComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|반도체|전자|전기|통신|네트워크|센서|임베디드|하드웨어|로봇|자율주행|그래픽|게임)/i.test(majorText) || bucket === "it") {
      return [
        "물질의 전기적 특성",
        "파동의 성질과 활용",
        "물질의 자기적 특성",
        "빛과 물질의 이중성",
        "힘과 운동",
        "에너지와 열",
        "시간과 공간"
      ];
    }
    if (/(전자|전기|반도체|통신|센서|로봇|제어)/.test(majorText) || bucket === "electronic") {
      return [
        "물질의 전기적 특성",
        "물질의 자기적 특성",
        "파동의 성질과 활용",
        "빛과 물질의 이중성",
        "에너지와 열",
        "힘과 운동",
        "시간과 공간"
      ];
    }
    if (/(기계|자동차|항공|모빌리티|건축|토목|물리|에너지)/.test(majorText) || bucket === "mechanical") {
      return [
        "힘과 운동",
        "에너지와 열",
        "물질의 자기적 특성",
        "파동의 성질과 활용",
        "물질의 전기적 특성",
        "빛과 물질의 이중성",
        "시간과 공간"
      ];
    }
    return defaultSequence;
  }

  function getGeometryPreferredConceptSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const defaultSequence = [
      "이차곡선과 자취 해석",
      "평면벡터와 벡터의 연산",
      "벡터의 성분과 내적",
      "공간도형과 정사영·위치 관계",
      "공간좌표와 구의 방정식"
    ];
    if (!majorText) return defaultSequence;
    if (isGeometryComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|그래픽|그래픽스|공간정보|로봇|자율주행|메타버스|영상|비전)/i.test(majorText) || bucket === "it") {
      return [
        "벡터의 성분과 내적",
        "공간좌표와 구의 방정식",
        "이차곡선과 자취 해석",
        "평면벡터와 벡터의 연산",
        "공간도형과 정사영·위치 관계"
      ];
    }
    if (/(건축|토목|도시|공간|설계|기계|자동차|항공|로봇|구조|디자인)/.test(majorText) || bucket === "mechanical") {
      return [
        "공간도형과 정사영·위치 관계",
        "공간좌표와 구의 방정식",
        "벡터의 성분과 내적",
        "평면벡터와 벡터의 연산",
        "이차곡선과 자취 해석"
      ];
    }
    return defaultSequence;
  }



  function isMechanicalEngineeringMajorSelectedContext() {
    // v88.6 C1-lock: 기계/로봇/자동차/항공 계열은 선택 학과명을 우선해
    // 3번 대표 개념과 4번 후속축이 IT/전자/보건 축으로 끌려가는 것을 막는다.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중|추천/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName?.() || ""); } catch (error) {}
    try { push(getCareerInputText?.() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName?.() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}

    const selectedText = Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
    const selectedCompact = selectedText.replace(/\s+/g, '');
    const mechanicalPattern = /기계공학과|기계공학|기계설계|생산공학|열유체|냉동공조|자동차공학과|자동차|모빌리티|항공우주공학과|항공우주|항공공학|항공|로봇공학과|로봇|메카트로닉스/;
    const electronicOnlyPattern = /전자공학과|전기공학과|전기전자|반도체공학과|통신공학과|임베디드|회로/;
    if ((mechanicalPattern.test(selectedText) || mechanicalPattern.test(selectedCompact))
      && !(electronicOnlyPattern.test(selectedText) || electronicOnlyPattern.test(selectedCompact))) return true;

    try {
      const bodyText = String(document.body?.innerText || '').replace(/\s+/g, ' ');
      const bodyCompact = bodyText.replace(/\s+/g, '');
      if (/2\.\s*학과\s*(기계공학과|로봇공학과|자동차공학과|항공우주공학과)|학과\s*(기계공학과|로봇공학과|자동차공학과|항공우주공학과)/.test(bodyText)) return true;
      if (/2\.학과(기계공학과|로봇공학과|자동차공학과|항공우주공학과)|학과(기계공학과|로봇공학과|자동차공학과|항공우주공학과)/.test(bodyCompact)) return true;
    } catch (error) {}
    return false;
  }


  function isMaterialsMajorSelectedContext() {
    // v87 M2-lock: 신소재/재료계열은 화면 전체 텍스트보다 상단 실제 선택 학과를 우선한다.
    // 3번 대표 개념과 4번 후속 연계축이 반도체/전자/의료 보조축으로 끌려가는 것을 막기 위한 최소 가드.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중|추천/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName?.() || ""); } catch (error) {}
    try { push(getCareerInputText?.() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName?.() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}

    const selectedText = Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
    const selectedCompact = selectedText.replace(/\s+/g, '');
    const bioEngineeringPattern = /생명공학과|의생명공학과|생명공학|의생명공학|바이오공학|분자생명|유전공학|세포공학|바이오테크|생명과학과|생명과학/;
    if (bioEngineeringPattern.test(selectedText) || bioEngineeringPattern.test(selectedCompact)) return false;
    const materialPattern = /신소재공학과|재료공학과|신소재|재료|나노소재|고분자|금속|세라믹|소재/;
    const semiconductorOnlyPattern = /반도체공학과|나노반도체|시스템반도체|반도체시스템|전자소자/;
    if ((materialPattern.test(selectedText) || materialPattern.test(selectedCompact))
      && !(semiconductorOnlyPattern.test(selectedText) || semiconductorOnlyPattern.test(selectedCompact))) return true;

    try {
      const bodyText = String(document.body?.innerText || '').replace(/\s+/g, ' ');
      const bodyCompact = bodyText.replace(/\s+/g, '');
      if (/2\.\s*학과\s*(신소재공학과|재료공학과|나노소재공학과|고분자공학과)|학과\s*(신소재공학과|재료공학과|나노소재공학과|고분자공학과)/.test(bodyText)) return true;
      if (/2\.학과(신소재공학과|재료공학과|나노소재공학과|고분자공학과)|학과(신소재공학과|재료공학과|나노소재공학과|고분자공학과)/.test(bodyCompact)) return true;
      if (/신소재공학과/.test(bodyText) && !/반도체공학과/.test(bodyText)) return true;
    } catch (error) {}
    return false;
  }


  function isElectromagnetismQuantumSubject() {
    return state.subject === "전자기와 양자" || state.subject === "전자기와양자" || state.subject === "고등 전자기와 양자";
  }

  function getElectromagnetismQuantumMajorTextBundle() {
    // 전자기와 양자는 화면 전체를 읽으면 '전자기/양자/전기장' 같은 교과 단어가 섞여
    // 모든 학과가 양자 또는 전자기 기본값으로 수렴하기 쉽다. 실제 선택 학과명 중심으로만 판별한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}
    return Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
  }

  function getElectromagnetismQuantumMajorKind() {
    const rawText = getElectromagnetismQuantumMajorTextBundle();
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    const compact = text.replace(/\s+/g, '');
    const has = (pattern) => pattern.test(text) || pattern.test(compact);

    // 정확한 학과명 우선. 교과 키워드의 '전자기/양자'에 끌려가지 않게 한다.
    if (isMaterialsMajorSelectedContext()) return "materials";
    if (has(/반도체공학과|반도체|나노반도체|시스템반도체|반도체시스템|소자공학|전자소자/)) return "semiconductor";
    if (has(/신소재공학과|재료공학과|신소재|재료|나노소재|금속|고분자|소재/)) return "materials";
    if (has(/의공학과|바이오메디컬공학|생체의공|의료공학|의료기기|방사선|영상의학|의료영상/)) return "biomedical";
    if (has(/컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터사이언스|데이터|정보|정보보안|보안|암호|양자컴퓨터|양자정보/)) return "computing";
    if (has(/전기전자공학과|전기전자|전자전기|전기공학과|전기공학|전력|전력전자|에너지전기/)) return "electrical";
    if (has(/전자공학과|전자공학|통신공학|정보통신|전파공학|회로|통신|RF|안테나/)) return "electronics";
    if (has(/에너지공학과|에너지공학|신재생에너지|전력에너지|에너지시스템|배터리|이차전지|전지|태양전지/)) return "energy";
    if (has(/물리학과|응용물리|물리|광학|양자물리|나노과학/)) return "physics";
    return "default";
  }

  function getElectromagnetismQuantumPreferredConceptSequence() {
    const kind = getElectromagnetismQuantumMajorKind();
    const defaultSequence = ["전기장과 자기장", "전자기 유도와 전자기파", "양자와 물질의 상호작용"];
    if (kind === "electrical") return ["전자기 유도와 전자기파", "전기장과 자기장", "양자와 물질의 상호작용"];
    if (kind === "electronics") return ["전자기 유도와 전자기파", "양자와 물질의 상호작용", "전기장과 자기장"];
    if (kind === "semiconductor") return ["양자와 물질의 상호작용", "전기장과 자기장", "전자기 유도와 전자기파"];
    if (kind === "materials") return ["양자와 물질의 상호작용", "전기장과 자기장", "전자기 유도와 전자기파"];
    if (kind === "physics") return ["전기장과 자기장", "양자와 물질의 상호작용", "전자기 유도와 전자기파"];
    if (kind === "biomedical") return ["전기장과 자기장", "전자기 유도와 전자기파", "양자와 물질의 상호작용"];
    if (kind === "computing") return ["양자와 물질의 상호작용", "전자기 유도와 전자기파", "전기장과 자기장"];
    if (kind === "energy") return ["전자기 유도와 전자기파", "전기장과 자기장", "양자와 물질의 상호작용"];
    return defaultSequence;
  }

  function getElectromagnetismQuantumPreferredKeywordSequence() {
    const concept = state.concept || "";
    const kind = getElectromagnetismQuantumMajorKind();
    const isElectrical = kind === "electrical";
    const isElectronics = kind === "electronics";
    const isSemi = kind === "semiconductor";
    const isMaterials = kind === "materials";
    const isBiomedical = kind === "biomedical";
    const isComputing = kind === "computing";
    const isEnergy = kind === "energy";
    const isPhysics = kind === "physics";

    if (/전기장과 자기장/.test(concept)) {
      if (isBiomedical) return ["MRI", "자기장", "생체 신호", "센서", "전극", "전위차", "전기 신호", "의료 영상", "로런츠 힘", "전기장", "자기장", "측정 데이터"];
      if (isSemi || isMaterials) return ["전기장", "전하 이동", "전위차", "전하 분포", "자기장", "로런츠 힘", "홀 효과", "센서", "소자", "전류", "등전위면", "전위"];
      if (isElectrical || isElectronics || isEnergy) return ["전기장", "전위차", "전하 분포", "전류", "자기장", "로런츠 힘", "코일", "센서", "전자석", "전기 신호", "등전위면", "전위"];
      if (isComputing) return ["센서 데이터", "전기 신호", "자기장", "전류", "전위차", "로런츠 힘", "측정 데이터", "시각화", "전기장", "센서", "신호 처리"];
      if (isPhysics) return ["전기장", "자기장", "로런츠 힘", "전위", "등전위면", "점전하", "쿨롱 법칙", "하전 입자", "전하 분포", "자기력선"];
      return ["전기장", "자기장", "로런츠 힘", "전위차", "전위", "전하 분포", "센서", "전류", "자기력선"];
    }

    if (/전자기 유도와 전자기파/.test(concept)) {
      if (isElectrical || isEnergy) return ["전자기 유도", "자기선속", "유도 전류", "렌츠 법칙", "발전기", "변압기", "코일", "전력 송전", "전자기파", "효율", "전력", "유도 기전력"];
      if (isElectronics) return ["전자기파", "안테나", "통신", "주파수", "전자기 유도", "유도 전류", "렌츠 법칙", "코일", "신호", "무선 통신", "데이터 전송", "스펙트럼"];
      if (isComputing) return ["전자기파", "신호", "통신", "주파수", "무선 통신", "데이터 전송", "안테나", "신호 데이터", "노이즈", "전자기 유도", "센서", "시각화"];
      if (isBiomedical) return ["전자기파", "의료 영상", "MRI", "센서", "신호", "주파수", "전자기 유도", "코일", "생체 신호", "검출", "영상 데이터"];
      if (isPhysics) return ["전자기 유도", "자기선속", "유도 전류", "렌츠 법칙", "패러데이 법칙", "전자기파", "변하는 자기장", "변하는 전기장", "파동", "스펙트럼"];
      return ["전자기 유도", "자기선속", "유도 전류", "렌츠 법칙", "전자기파", "발전기", "변압기", "통신", "신호"];
    }

    if (/양자와 물질의 상호작용/.test(concept)) {
      if (isSemi) return ["반도체", "밴드갭", "에너지 준위", "광전 효과", "터널 효과", "양자 터널링", "전자 전이", "소자", "LED", "태양전지", "센서", "나노소자"];
      if (isMaterials) return ["광전 효과", "에너지 준위", "밴드갭", "반도체", "레이저", "LED", "태양전지", "소재", "전자 전이", "원자 스펙트럼", "나노소재", "광소재"];
      if (isComputing) return ["양자 컴퓨터", "양자 암호", "큐비트", "중첩", "측정", "양자 정보", "보안", "양자 알고리즘", "터널 효과", "광자", "양자 센서", "반도체"];
      if (isElectronics || isElectrical) return ["광전 효과", "반도체", "에너지 준위", "밴드갭", "소자", "센서", "LED", "광센서", "전자 전이", "원자 스펙트럼", "양자", "태양전지"];
      if (isBiomedical) return ["광센서", "의료 영상", "레이저", "광전 효과", "센서", "방사선 검출", "에너지 준위", "스펙트럼", "영상 데이터", "진단 장치"];
      if (isPhysics) return ["광전 효과", "에너지 준위", "원자 스펙트럼", "보어 모형", "광자", "파동-입자 이중성", "양자", "전자 전이", "불연속 스펙트럼", "반도체"];
      return ["광전 효과", "에너지 준위", "반도체", "밴드갭", "원자 스펙트럼", "보어 모형", "양자", "센서", "소자"];
    }
    return [];
  }



  function isEarthSystemScienceSubject() {
    const text = String(state.subject || "").replace(/\s+/g, "").trim();
    return text === "지구시스템과학" || /지구시스템과학/.test(text);
  }

  function getEarthSystemMajorTextBundle() {
    // 지구시스템과학은 화면 전체를 읽으면 '대기/해양/판/지구' 같은 교과어가 섞여
    // 학과 분기가 약해진다. 실제 선택 학과명과 입력창/상단 상태값만 우선 사용한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try { push(getMajorTextBag() || ""); } catch (error) {}
    return uniq(parts).join(" ").trim();
  }

  function getEarthSystemMajorKind() {
    const majorText = getEarthSystemMajorTextBundle();
    // 실제 major_catalog_198에 존재하는 학과명 기준 우선 판별
    if (/(천문우주학과)/.test(majorText)) return "astronomy";
    if (/(대기과학과)/.test(majorText)) return "atmosphere";
    if (/(해양학과|해양공학과|조선해양공학과)/.test(majorText)) return "ocean";
    if (/(안전공학과)/.test(majorText)) return "safety";
    if (/(토목공학과|토목환경공학과|건설환경공학과|건축공학과)/.test(majorText)) return "civil";
    if (/(컴퓨터공학과|데이터사이언스학과|소프트웨어학과|인공지능학과|정보보호학과|통계학과)/.test(majorText)) return "data";
    if (/(지구환경과학과|지리학과)/.test(majorText)) return "geoscience";
    if (/(환경공학과|도시공학과)/.test(majorText)) return "environment";
    if (/(에너지공학과)/.test(majorText)) return "energy";
    if (/(생명과학과|생명공학과)/.test(majorText)) return "biology";
    return "";
  }

  function getEarthSystemSciencePreferredConceptSequence() {
    const kind = getEarthSystemMajorKind();
    const defaultSequence = ["대기·해양 순환과 기후", "지구 탄생과 시스템 진화", "판 구조와 지구 내부"];
    if (kind === "geoscience") return ["판 구조와 지구 내부", "지구 탄생과 시스템 진화", "대기·해양 순환과 기후"];
    if (kind === "environment") return ["대기·해양 순환과 기후", "지구 탄생과 시스템 진화", "판 구조와 지구 내부"];
    if (kind === "atmosphere") return ["대기·해양 순환과 기후", "지구 탄생과 시스템 진화", "판 구조와 지구 내부"];
    if (kind === "ocean") return ["대기·해양 순환과 기후", "지구 탄생과 시스템 진화", "판 구조와 지구 내부"];
    if (kind === "safety") return ["판 구조와 지구 내부", "대기·해양 순환과 기후", "지구 탄생과 시스템 진화"];
    if (kind === "civil") return ["판 구조와 지구 내부", "대기·해양 순환과 기후", "지구 탄생과 시스템 진화"];
    if (kind === "data") return ["대기·해양 순환과 기후", "판 구조와 지구 내부", "지구 탄생과 시스템 진화"];
    if (kind === "astronomy") return ["지구 탄생과 시스템 진화", "판 구조와 지구 내부", "대기·해양 순환과 기후"];
    if (kind === "energy") return ["판 구조와 지구 내부", "지구 탄생과 시스템 진화", "대기·해양 순환과 기후"];
    if (kind === "biology") return ["지구 탄생과 시스템 진화", "대기·해양 순환과 기후", "판 구조와 지구 내부"];
    return defaultSequence;
  }

  function getEarthSystemSciencePreferredKeywordSequence() {
    const concept = String(state.concept || "");
    const kind = getEarthSystemMajorKind();
    const isEnv = kind === "environment";
    const isAtmos = kind === "atmosphere";
    const isOcean = kind === "ocean";
    const isSafety = kind === "safety";
    const isCivil = kind === "civil";
    const isData = kind === "data";
    const isAstro = kind === "astronomy";
    const isGeo = kind === "geoscience";
    const isEnergy = kind === "energy";
    const isBio = kind === "biology";

    if (/대기·해양 순환과 기후/.test(concept)) {
      if (isAtmos) return ["단열 변화", "대기 안정도", "기압 경도력", "전향력", "편서풍 파동", "바람의 종류", "기압", "강수 과정", "기상 자료", "대기 자료", "밀도류", "해일", "조석"];
      if (isOcean) return ["밀도류", "해파", "해일", "조석", "해양 순환", "수온", "염분", "해양 재난", "연안 변화", "기후", "편서풍 파동", "단열 변화"];
      if (isEnv) return ["기후 데이터", "기후 변화", "대기 안정도", "강수량", "해양 순환", "해일", "밀도류", "온실가스", "대기 조성", "기온 변화", "재난 대응", "시계열"];
      if (isSafety) return ["해일", "강수량", "기후 재난", "대기 안정도", "편서풍 파동", "재난 대응", "예보", "위험도", "해양 재난", "단열 변화"];
      if (isData) return ["기후 데이터", "시계열", "그래프", "예측 모델", "강수량", "기온 변화", "해양 데이터", "기상 자료", "대기 안정도", "밀도류", "자료 분석", "시각화"];
      return ["단열 변화", "대기 안정도", "기압 경도력", "전향력", "편서풍 파동", "밀도류", "해파", "해일", "조석", "기후 데이터", "강수량", "해양 순환"];
    }

    if (/판 구조와 지구 내부/.test(concept)) {
      if (isSafety) return ["지진", "지진파", "P파", "S파", "화산", "재난 대응", "위험도", "내진", "판 경계", "수렴 경계", "지반", "관측 자료"];
      if (isCivil) return ["지반", "내진", "지진파", "판 경계", "지질 구조", "수렴 경계", "보존 경계", "암석권", "구조 안전", "P파", "S파", "관측 자료"];
      if (isData) return ["지진파 데이터", "P파", "S파", "도달 시간", "그래프", "모델링", "관측 자료", "진앙 거리", "시각화", "판 경계", "지진"];
      if (isGeo || isEnergy) return ["판 구조론", "지진파", "P파", "S파", "외핵", "내핵", "맨틀 대류", "플룸", "해양저 확장", "수렴 경계", "발산 경계", "고지자기"];
      return ["판 구조론", "플룸", "지진파", "P파", "S파", "외핵", "내핵", "맨틀 대류", "해양저 확장", "판 경계"];
    }

    if (/지구 탄생과 시스템 진화/.test(concept)) {
      if (isAstro) return ["태양계 성운", "성운설", "원시 태양", "미행성체", "원시 행성", "원시 지구", "분화", "행성 형성", "원시 대기", "원시 해양", "시간축", "모형"];
      if (isEnv || isBio) return ["탄소 순환", "산소 순환", "지구시스템", "대기 조성 변화", "원시 대기", "원시 해양", "생물권", "광합성 생물", "환경 변화", "남세균", "순환도"];
      if (isData) return ["시간축", "연표", "그래프", "시각화", "지구시스템", "탄소 순환", "산소 순환", "데이터", "환경 변화", "모델링"];
      return ["태양계 성운", "원시 지구", "성운설", "미행성체", "분화", "원시 대기", "원시 해양", "탄소 순환", "산소 순환", "지구시스템"];
    }

    return [];
  }


  function getEarthSystemScienceForcedAxisId() {
    if (!isEarthSystemScienceSubject()) return "";
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "").replace(/\s+/g, " ").trim();
    if (!concept || !keyword) return "";
    const has = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));

    // v34.27 earth-system keyword split lock:
    // 추천 키워드가 4번 축 우선순위를 직접 바꾸도록, 학과 보정보다 강한 키워드-축 매핑을 먼저 건다.
    if (/대기·해양 순환과 기후/.test(concept)) {
      if (has("기후 데이터", "시계열", "그래프", "예측 모델", "예측 모형", "자료 분석", "시각화", "해양 데이터", "기상 데이터", "데이터")) return "climate_data_prediction_axis";
      if (has("해일", "기후 재난", "재난 대응", "위험도", "예보", "강수량", "기후 변화", "온실가스", "환경 변화")) return "climate_disaster_application_axis";
      if (has("단열 변화", "대기 안정도", "기압 경도력", "전향력", "편서풍 파동", "바람의 종류", "기압", "밀도류", "해파", "조석", "해양 순환", "대기 조성")) return "atmosphere_ocean_analysis_axis";
    }

    if (/판 구조와 지구 내부/.test(concept)) {
      if (has("지진파 데이터", "도달 시간", "그래프", "모델링", "관측 자료", "진앙 거리", "시각화", "데이터")) return "seismic_data_modeling_axis";
      if (has("지진", "화산", "지진파", "P파", "S파", "내진", "지반", "재난 대응", "구조 안전", "위험도")) return "disaster_geophysics_application_axis";
      if (has("판 구조론", "플룸", "외핵", "내핵", "맨틀", "맨틀 대류", "해양저 확장", "발산 경계", "수렴 경계", "보존 경계", "고지자기")) return "geology_internal_structure_axis";
    }

    if (/지구 탄생과 시스템 진화/.test(concept)) {
      if (has("시간축", "연표", "그래프", "시각화", "데이터", "모델링")) return "earth_history_data_visual_axis";
      if (has("탄소 순환", "산소 순환", "지구시스템", "대기 조성", "대기 조성 변화", "생물권", "광합성 생물", "환경 변화", "남세균", "순환도")) return "carbon_climate_biosystem_axis";
      if (has("태양계 성운", "성운설", "원시 태양", "미행성체", "원시 행성", "원시 지구", "분화", "행성 형성", "원시 대기", "원시 해양")) return "planet_system_evolution_axis";
    }

    return "";
  }

  function getEarthSystemScienceForcedAxisBoost(axis) {
    const forcedId = getEarthSystemScienceForcedAxisId();
    if (!forcedId) return 0;
    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || "")
    ].join(" ");
    if (axisText.includes(forcedId)) return 900;
    const titleById = {
      atmosphere_ocean_analysis_axis: /대기·해양 자료 해석 축|대기·해양/i,
      climate_disaster_application_axis: /기후·재난 응용 축|기후·재난/i,
      climate_data_prediction_axis: /기후 데이터 예측·시각화 축|기후 데이터/i,
      geology_internal_structure_axis: /지질·지구 내부 해석 축|지구 내부/i,
      disaster_geophysics_application_axis: /재난·지구물리 응용 축|재난·지구물리/i,
      seismic_data_modeling_axis: /지진파 데이터·모델링 축|지진파 데이터/i,
      planet_system_evolution_axis: /행성·환경 진화 해석 축|행성 진화/i,
      carbon_climate_biosystem_axis: /탄소·기후·생명 시스템 연결 축|탄소 순환/i,
      earth_history_data_visual_axis: /지구 역사 데이터·시각화 축|지구 역사 데이터/i
    };
    return titleById[forcedId]?.test(axisText) ? 900 : 0;
  }

  function getEarthSystemScienceHardAxisBoost(axis) {
    const forcedBoost = getEarthSystemScienceForcedAxisBoost(axis);
    if (forcedBoost) return forcedBoost;
    if (!isEarthSystemScienceSubject()) return 0;
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    if (!concept || !keyword) return 0;

    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || "")
    ].join(" ");
    const kind = getEarthSystemMajorKind();
    const hit = (...values) => values.some(value => keyword.includes(value) || axisText.includes(value));

    if (/대기·해양 순환과 기후/.test(concept)) {
      if ((kind === "data") && hit("기후 데이터", "시계열", "그래프", "예측 모델", "시각화", "자료 분석")) {
        return /기후 데이터|예측|시각화|data|climate_data/i.test(axisText) ? 160 : 0;
      }
      if ((kind === "environment") && hit("기후 데이터", "기후 변화", "온실가스", "강수량", "재난 대응")) {
        return /기후|재난|환경|climate|disaster/i.test(axisText) ? 150 : 0;
      }
      if ((kind === "atmosphere") && hit("단열 변화", "대기 안정도", "기압 경도력", "전향력", "편서풍 파동", "바람")) {
        return /대기|해양 자료|자료 해석|atmosphere|ocean/i.test(axisText) ? 150 : 0;
      }
      if ((kind === "ocean") && hit("밀도류", "해파", "해일", "조석", "해양")) {
        return /대기|해양 자료|해양|ocean|해석/i.test(axisText) ? 150 : 0;
      }
      if ((kind === "safety") && hit("해일", "기후 재난", "재난", "위험도", "예보")) {
        return /재난|disaster|응용/i.test(axisText) ? 170 : 0;
      }
    }

    if (/판 구조와 지구 내부/.test(concept)) {
      if ((kind === "safety" || kind === "civil") && hit("지진", "지진파", "P파", "S파", "내진", "지반", "화산")) {
        return /재난|지구물리|disaster|응용|지질|내부/i.test(axisText) ? 170 : 0;
      }
      if (kind === "data" && hit("지진파 데이터", "도달 시간", "그래프", "모델링", "관측 자료")) {
        return /데이터|모델링|data|지진파/i.test(axisText) ? 170 : 0;
      }
      if ((kind === "geoscience" || kind === "energy") && hit("판 구조론", "플룸", "외핵", "내핵", "맨틀")) {
        return /지질|지구 내부|geology|structure/i.test(axisText) ? 150 : 0;
      }
    }

    if (/지구 탄생과 시스템 진화/.test(concept)) {
      if (kind === "astronomy" && hit("태양계 성운", "성운설", "원시 태양", "미행성체", "행성")) {
        return /행성|환경 진화|planet|evolution/i.test(axisText) ? 170 : 0;
      }
      if ((kind === "environment" || kind === "biology") && hit("탄소 순환", "산소 순환", "지구시스템", "대기 조성", "생물권")) {
        return /탄소|기후|생명|biosystem|climate/i.test(axisText) ? 160 : 0;
      }
      if (kind === "data" && hit("시간축", "연표", "그래프", "시각화", "데이터")) {
        return /데이터|시각화|data|history/i.test(axisText) ? 160 : 0;
      }
    }

    return 0;
  }


  function isMatterEnergySubjectName(value) {
    const text = String(value || "").replace(/\s+/g, "").trim();
    return text === "물질과에너지" || text === "MatterandEnergy";
  }


  function isCellMetabolismSubject() {
    const s = String(state.subject || "").replace(/\s+/g, "");
    return s === "세포와물질대사" || /세포와물질대사/.test(s);
  }

  function getCellMetabolismMajorTextBundle() {
    // 세포와 물질대사는 화면 전체를 읽으면 '광합성/효소/세포막' 같은 교과어가 섞여
    // 학과 분기가 약해진다. 실제 선택 학과명과 입력창/상단 상태값만 우선 사용한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}
    return Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
  }

  function getCellMetabolismMajorKind() {
    const rawText = getCellMetabolismMajorTextBundle();
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    const compact = text.replace(/\s+/g, '');
    const has = (pattern) => pattern.test(text) || pattern.test(compact);

    // 정확한 학과명 우선. 생명공학/의생명은 환경·식품 일반보다 먼저 판별한다.
    if (has(/컴퓨터공학과|소프트웨어|AI|인공지능|데이터사이언스|데이터|정보|통계|생명정보|바이오인포매틱스|시뮬레이션|모델링/)) return "data";
    if (has(/생명공학과|의생명공학과|의생명공학|생명공학|바이오공학|분자생명|유전공학|세포공학|바이오헬스|바이오메디컬|생명과학과|생명과학/)) return "bioengineering";
    if (has(/약학과|약학|약대|제약|신약|약물|의약|바이오제약/)) return "pharmacy";
    if (has(/의예과|의학과|의대|의예|의학|의료|임상병리|보건|간호학과|간호|치의예|치의학/)) return "medical";
    if (has(/식품공학과|식품영양학과|식품공학|식품영양|식품|영양|발효|미생물|푸드/)) return "food";
    if (has(/환경공학과|환경공학|환경생태|환경과학|환경보건|기후환경|생태|농생명|산림|해양생명|환경/)) return "environment";
    if (has(/에너지공학과|에너지공학|신재생에너지|바이오에너지|수소에너지|탄소중립|에너지시스템/)) return "energy";
    if (has(/화학과|생화학|화학|화학생명|응용화학/)) return "chemistry";
    return "default";
  }

  function getCellMetabolismPreferredConceptSequence() {
    const kind = getCellMetabolismMajorKind();
    const defaultSequence = ["세포의 구조와 물질 이동", "효소와 대사 반응", "광합성과 세포 호흡"];
    if (kind === "bioengineering") return ["세포의 구조와 물질 이동", "효소와 대사 반응", "광합성과 세포 호흡"];
    if (kind === "medical") return ["세포의 구조와 물질 이동", "효소와 대사 반응", "광합성과 세포 호흡"];
    if (kind === "pharmacy") return ["효소와 대사 반응", "세포의 구조와 물질 이동", "광합성과 세포 호흡"];
    if (kind === "food") return ["효소와 대사 반응", "광합성과 세포 호흡", "세포의 구조와 물질 이동"];
    if (kind === "environment") return ["광합성과 세포 호흡", "효소와 대사 반응", "세포의 구조와 물질 이동"];
    if (kind === "energy") return ["광합성과 세포 호흡", "효소와 대사 반응", "세포의 구조와 물질 이동"];
    if (kind === "chemistry") return ["효소와 대사 반응", "세포의 구조와 물질 이동", "광합성과 세포 호흡"];
    if (kind === "data") return ["세포의 구조와 물질 이동", "광합성과 세포 호흡", "효소와 대사 반응"];
    return defaultSequence;
  }

  function getCellMetabolismPreferredKeywordSequence() {
    const concept = state.concept || "";
    const kind = getCellMetabolismMajorKind();
    const isBio = kind === "bioengineering";
    const isMedical = kind === "medical";
    const isPharmacy = kind === "pharmacy";
    const isFood = kind === "food";
    const isEnv = kind === "environment";
    const isEnergy = kind === "energy";
    const isChem = kind === "chemistry";
    const isData = kind === "data";

    if (/세포의 구조와 물질 이동/.test(concept)) {
      if (isBio) return ["세포막", "막단백질", "선택적 투과", "능동 수송", "인지질 이중층", "세포 소기관", "세포 배양", "세포막 투과성", "확산", "삼투", "Na-K 펌프", "막 수송"];
      if (isMedical) return ["세포막", "삼투", "선택적 투과", "체액", "세포막 투과성", "확산", "능동 수송", "약물 전달", "적혈구", "수분 균형", "막단백질", "세포 소기관"];
      if (isPharmacy) return ["세포막", "막단백질", "약물 전달", "선택적 투과", "확산", "능동 수송", "수용체", "세포막 투과성", "인지질 이중층", "삼투", "흡수", "수송체"];
      if (isData) return ["세포 이미지", "세포 소기관", "세포 데이터", "분류", "모델링", "세포막 투과성", "그래프", "확산", "삼투", "이미지 분석", "시뮬레이션"];
      return ["세포막", "인지질 이중층", "선택적 투과", "막단백질", "확산", "삼투", "능동 수송", "세포 소기관", "미토콘드리아", "엽록체", "세포막 투과성"];
    }

    if (/효소와 대사 반응/.test(concept)) {
      if (isPharmacy) return ["효소", "저해제", "기질 특이성", "반응 속도", "활성화 에너지", "대사 경로", "약물 대사", "효소 저해", "최적 pH", "최적 온도", "기질", "대사 조절"];
      if (isFood) return ["효소", "발효", "최적 pH", "최적 온도", "기질 특이성", "반응 속도", "식품 공정", "미생물", "활성화 에너지", "대사 경로", "효소 활성"];
      if (isMedical) return ["효소", "대사 조절", "반응 속도", "최적 pH", "최적 온도", "체온", "소화", "대사 질환", "활성화 에너지", "저해제", "건강 지표"];
      if (isBio) return ["효소", "기질", "기질 특이성", "활성화 에너지", "대사 경로", "피드백 조절", "효소-기질 복합체", "저해제", "반응 속도", "대사 조절"];
      if (isChem) return ["효소", "활성화 에너지", "반응 속도", "촉매", "기질", "기질 특이성", "최적 pH", "최적 온도", "저해제", "대사 반응"];
      if (isData) return ["반응 속도", "효소 활성 데이터", "그래프", "모델링", "최적 pH", "최적 온도", "효소", "대사 경로", "피드백 조절", "데이터 비교"];
      return ["효소", "기질", "기질 특이성", "활성화 에너지", "반응 속도", "저해제", "최적 pH", "최적 온도", "대사 경로", "발효"];
    }

    if (/광합성과 세포 호흡/.test(concept)) {
      if (isEnv) return ["광합성", "탄소 고정", "탄소 순환", "이산화탄소", "세포 호흡", "ATP", "엽록체", "미토콘드리아", "생태계", "환경 정화", "바이오매스"];
      if (isEnergy) return ["ATP", "세포 호흡", "광합성", "바이오에너지", "에너지 효율", "탄소 고정", "전자 전달계", "미토콘드리아", "엽록체", "생성량", "효율 비교"];
      if (isFood) return ["세포 호흡", "발효", "ATP", "포도당", "효모", "미생물", "광합성", "당 생성", "대사 경로", "식품 저장", "품질 변화"];
      if (isData) return ["ATP", "대사 경로", "데이터", "그래프", "모델링", "세포 호흡", "광합성", "효율", "생성량", "비교 분석", "시뮬레이션"];
      return ["광합성", "세포 호흡", "ATP", "엽록체", "미토콘드리아", "명반응", "탄소 고정", "포도당", "전자 전달계", "에너지 전환"];
    }

    return [];
  }

  function getCellMetabolismHardAxisBoost(axis) {
    if (!isCellMetabolismSubject()) return 0;
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    if (!concept || !keyword) return 0;
    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || "")
    ].join(" ");
    const kind = getCellMetabolismMajorKind();
    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));
    let boost = 0;

    if (kind === "bioengineering") {
      if (/세포의 구조와 물질 이동/.test(concept) && hit("세포막", "막단백질", "선택적 투과", "능동 수송", "세포 배양", "세포 소기관", "인지질 이중층", "확산", "삼투")) {
        if (/cell_engineering|세포·대사 심화|cell_system_transport_axis|세포 시스템|cell_culture_bioprocess_axis|세포 배양/.test(axisText)) boost = Math.max(boost, 520);
        if (/phase_biomaterial|물질 상태·생체 재료|bio_molecule|생체 분자 구조/.test(axisText)) boost = Math.max(boost, 250);
      }
      if (/효소와 대사 반응/.test(concept) && hit("효소", "기질", "기질 특이성", "반응 속도", "대사 경로", "피드백 조절", "활성화 에너지", "저해제")) {
        if (/cell_engineering|세포·대사 심화|metabolic_reaction_analysis_axis|효소 반응|enzyme_drug|효소·수용체/.test(axisText)) boost = Math.max(boost, 520);
        if (/bio_molecule|생체 분자 구조/.test(axisText)) boost = Math.max(boost, 230);
      }
      if (/광합성과 세포 호흡/.test(concept) && hit("ATP", "세포 호흡", "광합성", "전자 전달계", "대사 경로", "에너지 전환", "바이오에너지")) {
        if (/cell_engineering|세포·대사 심화|energy_conversion_analysis_axis|생명 에너지 전환/.test(axisText)) boost = Math.max(boost, 500);
        if (/bioenergy_efficiency_axis|바이오에너지/.test(axisText)) boost = Math.max(boost, 260);
      }
    }

    if (/세포의 구조와 물질 이동/.test(concept)) {
      // v34.26 cell-metabolism keyword split:
      // 생명공학과에서는 같은 '세포의 구조와 물질 이동' 개념 안에서도
      // 세포막/수송/수용체/소기관/데이터 키워드가 서로 다른 4번 축을 열어야 한다.
      if (hit("세포막", "인지질 이중층", "선택적 투과", "막 구조", "세포막 구조")) {
        if (/cell_system_transport_axis|세포 시스템·물질 이동 해석 축|세포 시스템|물질 이동/.test(axisText)) boost = Math.max(boost, (kind === "bioengineering" || kind === "medical" || kind === "pharmacy") ? 460 : 330);
        if (/membrane_transport_gradient_axis|막수송·농도 기울기 해석 축|농도 기울기|막수송/.test(axisText)) boost = Math.max(boost, 135);
      }
      if (hit("확산", "삼투", "능동 수송", "Na-K 펌프", "나트륨-칼륨 펌프", "농도 기울기", "막 수송", "수송")) {
        if (/membrane_transport_gradient_axis|막수송·농도 기울기 해석 축|농도 기울기|막수송/.test(axisText)) boost = Math.max(boost, 470);
        if (/cell_system_transport_axis|세포 시스템·물질 이동 해석 축|세포 시스템|물질 이동/.test(axisText)) boost = Math.max(boost, 210);
        if (/bio_medical_transport_axis|의약·영양 전달 응용 축|의약|전달/.test(axisText)) boost = Math.max(boost, (kind === "medical" || kind === "pharmacy") ? 390 : 150);
      }
      if (hit("막단백질", "수용체", "채널", "운반체", "세포 신호", "신호 전달", "리간드", "수송체")) {
        if (/receptor_signal_application_axis|세포 신호·수용체 응용 축|수용체|세포 신호/.test(axisText)) boost = Math.max(boost, (kind === "bioengineering" || kind === "pharmacy" || kind === "medical") ? 470 : 300);
        if (/cell_system_transport_axis|세포 시스템·물질 이동 해석 축|세포 시스템|물질 이동/.test(axisText)) boost = Math.max(boost, 190);
      }
      if (hit("세포 소기관", "소기관", "미토콘드리아", "엽록체", "리보솜", "핵", "세포 기능")) {
        if (/organelle_function_axis|세포 소기관 기능 해석 축|소기관/.test(axisText)) boost = Math.max(boost, (kind === "bioengineering" || kind === "medical") ? 455 : 300);
        if (/cell_system_transport_axis|세포 시스템·물질 이동 해석 축/.test(axisText)) boost = Math.max(boost, 160);
      }
      if (hit("세포 배양", "세포주", "배양 조건", "무균 조작", "배지", "세포공학")) {
        if (/cell_culture_bioprocess_axis|세포 배양·공정 응용 축|세포 배양|배양/.test(axisText)) boost = Math.max(boost, kind === "bioengineering" ? 480 : 300);
      }
      if (hit("약물 전달", "흡수", "체액", "수분 균형", "투석", "영양소 이동", "투과성")) {
        if (/bio_medical_transport_axis|의약·영양 전달 응용 축|의약|전달/.test(axisText)) boost = Math.max(boost, (kind === "medical" || kind === "pharmacy") ? 450 : 210);
      }
      if (hit("세포 이미지", "세포 데이터", "분류", "모델링", "그래프", "시뮬레이션", "이미지 분석", "투과성 실험")) {
        if (/membrane_data_experiment_axis|세포 데이터·투과성 실험 축|데이터|실험/.test(axisText)) boost = Math.max(boost, kind === "data" ? 470 : (kind === "bioengineering" ? 360 : 210));
      }
    }

    if (/효소와 대사 반응/.test(concept)) {
      if (hit("효소", "기질", "기질 특이성", "활성화 에너지", "반응 속도", "대사 경로", "피드백 조절")) {
        if (/metabolic_reaction_analysis_axis|효소 반응·대사 조절 해석 축|대사 반응|효소/.test(axisText)) boost = Math.max(boost, (kind === "bioengineering" || kind === "chemistry") ? 400 : 280);
      }
      if (hit("저해제", "약물 대사", "효소 저해", "약물", "대사 조절")) {
        if (/drug_enzyme_axis|약물 작용·효소 반응 해석 축|약물|의약/.test(axisText)) boost = Math.max(boost, kind === "pharmacy" ? 440 : 190);
      }
      if (hit("발효", "미생물", "식품 공정", "최적 pH", "최적 온도", "효소 활성")) {
        if (/fermentation_bioprocess_axis|식품 발효·공정 응용 축|발효|공정/.test(axisText)) boost = Math.max(boost, kind === "food" ? 430 : 190);
        if (/health_condition_control_axis|건강·조건 조절 해석 축|조건|건강/.test(axisText)) boost = Math.max(boost, kind === "medical" ? 390 : 160);
      }
      if (hit("효소 활성 데이터", "그래프", "모델링", "데이터 비교")) {
        if (/enzyme_data_model_axis|효소 데이터·모델링 축|데이터|모델링/.test(axisText)) boost = Math.max(boost, kind === "data" ? 410 : 170);
      }
    }

    if (/광합성과 세포 호흡/.test(concept)) {
      if (hit("광합성", "탄소 고정", "탄소 순환", "이산화탄소", "환경 정화", "바이오매스")) {
        if (/carbon_environment_axis|탄소 순환·환경 정화 응용 축|탄소|환경/.test(axisText)) boost = Math.max(boost, kind === "environment" ? 440 : 190);
      }
      if (hit("ATP", "세포 호흡", "전자 전달계", "에너지 효율", "바이오에너지", "효율 비교")) {
        if (/energy_conversion_analysis_axis|생명 에너지 전환 해석 축|에너지 전환/.test(axisText)) boost = Math.max(boost, (kind === "bioengineering" || kind === "medical") ? 360 : 220);
        if (/bioenergy_efficiency_axis|바이오에너지·효율 응용 축|바이오에너지|효율/.test(axisText)) boost = Math.max(boost, kind === "energy" ? 430 : 190);
      }
      if (hit("대사 경로", "데이터", "그래프", "모델링", "생성량", "비교 분석", "시뮬레이션")) {
        if (/metabolic_data_model_axis|생명 데이터·대사 모델링 축|데이터|모델링/.test(axisText)) boost = Math.max(boost, kind === "data" ? 430 : 180);
      }
      if (hit("발효", "효모", "미생물", "식품 저장", "품질 변화")) {
        if (/fermentation_bioprocess_axis|식품 발효·공정 응용 축|발효|공정/.test(axisText)) boost = Math.max(boost, kind === "food" ? 420 : 180);
      }
    }
    return boost;
  }

  function isMatterEnergySubject() {
    return isMatterEnergySubjectName(state.subject || "");
  }

  function getMatterEnergyMajorTextBundle() {
    // 물질과 에너지는 화면 전체를 읽으면 '액체/기체/혼합' 교과어가 섞여 학과 분기가 약해진다.
    // 실제 선택 학과명과 입력창/상단 상태값만 우선 사용한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}
    return Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
  }

  function getMatterEnergyMajorKind() {
    const rawText = getMatterEnergyMajorTextBundle();
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    const compact = text.replace(/\s+/g, '');
    const has = (pattern) => pattern.test(text) || pattern.test(compact);

    // 정확한 학과명 우선. 화학공학은 '화학과'보다 먼저, 환경공학은 '공학' 일반보다 먼저 본다.
    if (isMaterialsMajorSelectedContext()) return "materials";
    if (has(/화학공학과|화공|공업화학|화공생명공학|화학생물공학|공정|공정시스템/)) return "chemical_engineering";
    if (has(/환경공학과|환경공학|대기환경|보건환경|환경보건|환경에너지|기후환경|환경과학|환경/)) return "environment";
    if (has(/식품공학과|식품영양학과|식품공학|식품영양|식품|영양|조리|푸드/)) return "food";
    if (has(/약학과|약학|약대|제약|신약|약물|의약|바이오제약/)) return "pharmacy";
    if (has(/신소재공학과|재료공학과|신소재|재료|나노소재|고분자|금속|세라믹|소재/)) return "materials";
    if (has(/에너지공학과|에너지공학|에너지시스템|신재생에너지|수소에너지|배터리|이차전지|전지/)) return "energy";
    if (has(/기계공학과|기계|자동차|항공|열유체|냉동공조|공조|로봇|메카트로닉스/)) return "mechanical";
    if (has(/화학과|응용화학|화학생명|화학/)) return "chemistry";
    if (has(/컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터사이언스|데이터|정보|통계/)) return "data";
    return "default";
  }

  function getMatterEnergyPreferredConceptSequence() {
    const kind = getMatterEnergyMajorKind();
    const defaultSequence = ["액체의 물성과 분자 간 힘", "기체 상태와 법칙", "혼합 기체와 조성"];
    if (kind === "chemical_engineering") return ["기체 상태와 법칙", "혼합 기체와 조성", "액체의 물성과 분자 간 힘"];
    if (kind === "chemistry") return ["액체의 물성과 분자 간 힘", "기체 상태와 법칙", "혼합 기체와 조성"];
    if (kind === "materials") return ["액체의 물성과 분자 간 힘", "기체 상태와 법칙", "혼합 기체와 조성"];
    if (kind === "environment") return ["혼합 기체와 조성", "기체 상태와 법칙", "액체의 물성과 분자 간 힘"];
    if (kind === "food") return ["액체의 물성과 분자 간 힘", "기체 상태와 법칙", "혼합 기체와 조성"];
    if (kind === "energy") return ["기체 상태와 법칙", "혼합 기체와 조성", "액체의 물성과 분자 간 힘"];
    if (kind === "pharmacy") return ["액체의 물성과 분자 간 힘", "기체 상태와 법칙", "혼합 기체와 조성"];
    if (kind === "mechanical") return ["기체 상태와 법칙", "혼합 기체와 조성", "액체의 물성과 분자 간 힘"];
    if (kind === "data") return ["기체 상태와 법칙", "혼합 기체와 조성", "액체의 물성과 분자 간 힘"];
    return defaultSequence;
  }

  function getMatterEnergyPreferredKeywordSequence() {
    const concept = state.concept || "";
    const kind = getMatterEnergyMajorKind();
    const isChemEng = kind === "chemical_engineering";
    const isChemistry = kind === "chemistry";
    const isMaterials = kind === "materials";
    const isEnv = kind === "environment";
    const isFood = kind === "food";
    const isEnergy = kind === "energy";
    const isPharmacy = kind === "pharmacy";
    const isMechanical = kind === "mechanical";
    const isData = kind === "data";

    if (/기체 상태와 법칙/.test(concept)) {
      if (isChemEng) return ["이상 기체 방정식", "압력", "부피", "온도", "몰수", "보일 법칙", "샤를 법칙", "반응 조건", "공정", "압축", "그래프", "데이터"];
      if (isEnergy || isMechanical) return ["압력", "부피", "온도", "이상 기체 방정식", "압축", "열기관", "냉매", "에너지 효율", "보일 법칙", "샤를 법칙", "상태 변화", "그래프"];
      if (isData) return ["압력 데이터", "온도 데이터", "그래프", "모델링", "이상 기체 방정식", "압력", "부피", "온도", "예측", "센서"];
      return ["압력", "부피", "온도", "몰수", "보일 법칙", "샤를 법칙", "이상 기체 방정식", "기체 상수", "절대 온도", "상태 변화"];
    }

    if (/혼합 기체와 조성/.test(concept)) {
      if (isEnv) return ["대기", "이산화탄소", "온실가스", "공기질", "오염", "산소", "질소", "기체 조성", "부분 압력", "몰분율", "달톤 법칙", "가스 센서"];
      if (isChemEng || isEnergy) return ["기체 조성", "부분 압력", "몰분율", "달톤 법칙", "혼합 기체", "공정 가스", "기체 분리", "산소", "질소", "LPG", "조성 분석", "센서"];
      if (isData) return ["조성 데이터", "센서", "농도 측정", "그래프", "부분 압력", "몰분율", "기체 조성", "공기질", "예측", "자료 분석"];
      return ["부분 압력", "전체 압력", "달톤 법칙", "몰분율", "기체 조성", "혼합 기체", "공기 조성", "산소", "질소", "이산화탄소"];
    }

    if (/액체의 물성과 분자 간 힘/.test(concept)) {
      if (isMaterials) return ["수소 결합", "분산력", "분자 간 힘", "표면 장력", "점성", "끓는점", "증기 압력", "코팅", "소재", "접착", "세정", "고분자"];
      if (isPharmacy) return ["수소 결합", "분자 간 힘", "용해도", "증기 압력", "끓는점", "분산력", "약물", "제형", "흡수", "용액", "체액", "확산"];
      if (isFood) return ["수소 결합", "물", "수분", "끓는점", "증기 압력", "점성", "표면 장력", "분자 간 힘", "식품 물성", "가공", "유화", "용액"];
      if (isChemEng) return ["분자 간 힘", "수소 결합", "증기 압력", "끓는점", "점성", "표면 장력", "분리 공정", "용매", "코팅", "세정"];
      if (isChemistry) return ["분자 간 힘", "수소 결합", "분산력", "쌍극자", "끓는점", "증기 압력", "점성", "표면 장력", "용액", "물성"];
      return ["분자 간 힘", "수소 결합", "분산력", "쌍극자", "끓는점", "증기 압력", "점성", "표면 장력", "용액"];
    }

    return [];
  }

  function getMatterEnergyHardAxisBoost(axis) {
    if (!isMatterEnergySubject()) return 0;
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    if (!concept || !keyword) return 0;
    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || "")
    ].join(" ");
    const kind = getMatterEnergyMajorKind();
    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));
    let boost = 0;

    if (/기체 상태와 법칙/.test(concept)) {
      if (hit("압력", "부피", "온도", "몰수", "보일 법칙", "샤를 법칙", "이상 기체 방정식", "PV=nRT")) {
        // 화학공학은 공정 조건, 에너지·기계는 기체 상태/열역학 해석을 먼저 보여준다.
        if (/gas_state_thermo_axis|기체 상태·열역학 해석 축|기체 상태/.test(axisText)) {
          boost = Math.max(boost, (kind === "energy" || kind === "mechanical") ? 430 : (kind === "chemistry" ? 360 : 150));
        }
        if (/process_reaction_condition_axis|공정·반응 조건 해석 축|공정|반응 조건/.test(axisText)) {
          boost = Math.max(boost, kind === "chemical_engineering" ? 430 : ((kind === "energy" || kind === "mechanical") ? 180 : 120));
        }
      }
      if (hit("공정", "반응 조건", "압축", "냉매", "열기관", "에너지 효율", "냉각", "상태 변화")) {
        if (/gas_state_thermo_axis|기체 상태·열역학 해석 축|기체 상태/.test(axisText)) boost = Math.max(boost, (kind === "energy" || kind === "mechanical") ? 410 : 150);
        if (/process_reaction_condition_axis|공정·반응 조건 해석 축|공정|반응 조건/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 390 : ((kind === "energy" || kind === "mechanical") ? 260 : 140));
      }
      if (hit("그래프", "데이터", "측정", "센서", "예측", "모델링")) {
        if (/measurement_modeling_axis|측정 데이터·모델링 축|데이터|모델링/.test(axisText)) boost = Math.max(boost, kind === "data" ? 360 : 150);
      }
    }

    if (/혼합 기체와 조성/.test(concept)) {
      if (hit("부분 압력", "달톤 법칙", "몰분율", "기체 조성", "혼합 기체")) {
        // 환경공학은 조성 계산 자체보다 대기 조성·오염 해석을 먼저 보이게 한다.
        if (/mixed_gas_composition_axis|혼합 기체 조성 해석 축|조성/.test(axisText)) boost = Math.max(boost, (kind === "chemistry" || kind === "chemical_engineering") ? 360 : (kind === "environment" ? 120 : 150));
        if (/atmosphere_pollution_axis|대기 조성·오염 분석 축|대기|오염/.test(axisText)) boost = Math.max(boost, kind === "environment" ? 430 : 130);
      }
      if (hit("대기", "이산화탄소", "온실가스", "공기질", "오염", "산소", "질소", "환경")) {
        if (/atmosphere_pollution_axis|대기 조성·오염 분석 축|대기|오염/.test(axisText)) boost = Math.max(boost, kind === "environment" ? 430 : 150);
      }
      if (hit("센서", "농도 측정", "가스 누출", "경보기", "안전", "조성 데이터", "그래프")) {
        if (/gas_sensor_safety_axis|가스 센서·안전 응용 축|센서|안전/.test(axisText)) boost = Math.max(boost, kind === "data" ? 340 : 170);
      }
    }

    if (/액체의 물성과 분자 간 힘/.test(concept)) {
      if (hit("수소 결합", "분산력", "쌍극자", "분자 간 힘", "증기 압력", "끓는점")) {
        if (/intermolecular_force_axis|분자 간 힘·물성 해석 축|분자 간 힘/.test(axisText)) boost = Math.max(boost, kind === "materials" ? 360 : (kind === "chemistry" ? 360 : 150));
        if (/material_property_design_axis|소재 물성 설계 축|소재/.test(axisText)) boost = Math.max(boost, kind === "materials" ? 420 : 130);
        if (/drug_solubility_axis|약물 물성·용해도 해석 축|약물|용해도/.test(axisText)) boost = Math.max(boost, kind === "pharmacy" ? 390 : 125);
        if (/food_processing_axis|식품 물성·가공 응용 축|식품|가공/.test(axisText)) boost = Math.max(boost, kind === "food" ? 390 : 125);
      }
      if (hit("표면 장력", "점성", "코팅", "세정", "접착", "소재", "고분자")) {
        if (/material_property_design_axis|소재 물성 설계 축|소재/.test(axisText)) boost = Math.max(boost, kind === "materials" ? 390 : ((kind === "chemical_engineering") ? 250 : 150));
      }
      if (hit("용해도", "약물", "제형", "흡수", "용액", "체액", "확산")) {
        if (/drug_solubility_axis|약물 물성·용해도 해석 축|약물|용해도/.test(axisText)) boost = Math.max(boost, kind === "pharmacy" ? 390 : 145);
        if (/bio_fluid_axis|생명·용액 환경 해석 축|생명|용액/.test(axisText)) boost = Math.max(boost, 150);
      }
      if (hit("식품", "수분", "물", "가공", "점성", "유화", "끓는점", "증기 압력")) {
        if (/food_processing_axis|식품 물성·가공 응용 축|식품|가공/.test(axisText)) boost = Math.max(boost, kind === "food" ? 390 : 145);
      }
    }

    return boost;
  }


  function getMechanicsEnergyMajorTextBundle() {
    // 역학과 에너지는 화면 전체를 읽으면 개념 카드의 '운동/열/소리' 단어가 섞여
    // 모든 공학계열이 같은 기본값으로 수렴하기 쉽다. 실제 선택 학과명 중심으로만 판별한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기|후속 연계축 선택 중/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}
    return Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
  }

  function getMechanicsEnergyMajorKind() {
    const rawText = getMechanicsEnergyMajorTextBundle();
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    const compact = text.replace(/\s+/g, '');
    const has = (pattern) => pattern.test(text) || pattern.test(compact);

    // 정확한 학과명 우선. '운동/열/소리' 같은 교과 키워드에 끌려가지 않게 한다.
    if (has(/항공우주공학과|항공우주|우주공학|항공공학|항공|우주/)) return "aerospace";
    if (has(/자동차공학과|자동차|모빌리티|미래자동차|차량|자율주행/)) return "automotive";
    if (has(/건축공학과|건축공학|건축설비|건축환경|건축/)) return "architecture";
    if (has(/토목공학과|토목|건설|도시공학|도시|지반|교량|구조공학/)) return "civil";
    if (has(/컴퓨터공학과|컴퓨터|소프트웨어|AI|인공지능|데이터사이언스|데이터|정보|시뮬레이션|모델링/)) return "data";
    if (has(/기계공학과|기계|로봇|메카트로닉스|기계설계|생산공학/)) return "mechanical";
    if (has(/에너지공학|신재생|화학공학|환경공학|에너지/)) return "energy";
    return "default";
  }

  function getMechanicsEnergyPreferredConceptSequence() {
    const kind = getMechanicsEnergyMajorKind();
    const defaultSequence = ["시공간과 운동", "열과 에너지", "탄성파와 소리"];
    if (kind === "aerospace") return ["시공간과 운동", "열과 에너지", "탄성파와 소리"];
    if (kind === "automotive") return ["시공간과 운동", "열과 에너지", "탄성파와 소리"];
    if (kind === "mechanical") return ["시공간과 운동", "열과 에너지", "탄성파와 소리"];
    if (kind === "architecture") return ["탄성파와 소리", "열과 에너지", "시공간과 운동"];
    if (kind === "civil") return ["탄성파와 소리", "시공간과 운동", "열과 에너지"];
    if (kind === "data") return ["시공간과 운동", "탄성파와 소리", "열과 에너지"];
    if (kind === "energy") return ["열과 에너지", "시공간과 운동", "탄성파와 소리"];
    return defaultSequence;
  }

  function getMechanicsEnergyPreferredKeywordSequence() {
    const concept = state.concept || "";
    const kind = getMechanicsEnergyMajorKind();
    const isData = kind === "data";
    const isAero = kind === "aerospace";
    const isAuto = kind === "automotive";
    const isMech = kind === "mechanical";
    const isCivil = kind === "civil";
    const isArch = kind === "architecture";
    const isEnergy = kind === "energy";

    if (/시공간과 운동/.test(concept)) {
      if (isAero) return ["케플러 법칙", "인공위성", "등속 원운동", "구심력", "구심 가속도", "포물선 운동", "벡터", "벡터의 분해", "탈출 속도", "운동 데이터", "시뮬레이션", "모델링"];
      if (isData) return ["운동 데이터", "시뮬레이션", "모델링", "그래프", "위치-시간", "속도-시간", "벡터", "포물선 운동", "등속 원운동", "케플러 법칙", "센서 데이터", "자료 분석"];
      if (isCivil || isArch) return ["벡터", "벡터의 합성", "벡터의 분해", "하중", "힘의 평형", "구조 안정", "포물선 운동", "그래프", "모델링", "스칼라량", "운동 데이터"];
      if (isAuto || isMech) return ["벡터", "벡터의 합성", "벡터의 분해", "포물선 운동", "등속 원운동", "구심력", "구심 가속도", "운동량", "운동 데이터", "시뮬레이션", "모델링", "스칼라량"];
      return ["벡터", "포물선 운동", "등속 원운동", "케플러 법칙", "구심력", "구심 가속도", "운동 데이터", "시뮬레이션", "모델링"];
    }

    if (/열과 에너지/.test(concept)) {
      if (isArch) return ["열전달", "전도", "복사", "대류", "단열", "열팽창", "열손실", "열효율", "건물 에너지", "냉난방", "엔트로피", "이상 기체 법칙"];
      if (isAuto || isMech) return ["열전달", "열효율", "열기관", "냉각", "내부 에너지", "이상 기체 법칙", "열역학 제1법칙", "열역학", "엔트로피", "전도", "대류", "복사"];
      if (isEnergy) return ["열효율", "열기관", "열전달", "에너지 절약", "전력 소비", "탄소 배출", "온실가스", "신재생 에너지", "엔트로피", "열역학 제1법칙"];
      if (isData) return ["열 데이터", "온도 센서", "그래프", "시뮬레이션", "열손실", "열효율", "전력 소비", "자료 분석", "전도", "대류", "복사"];
      return ["열전달", "전도", "대류", "복사", "열팽창", "이상 기체 법칙", "열효율", "엔트로피"];
    }

    if (/탄성파와 소리/.test(concept)) {
      if (isCivil || isArch) return ["지진파", "탄성파", "진동", "공진", "단진동", "감쇠", "구조 안전", "내진", "정상파", "종파", "횡파", "센서 데이터"];
      if (isData) return ["파형", "센서 데이터", "그래프", "스펙트럼", "주파수", "데이터", "신호 처리", "단진동", "도플러 효과", "정상파", "탄성파"];
      if (isAuto || isMech || isAero) return ["진동", "단진동", "공진", "탄성파", "감쇠", "도플러 효과", "주파수", "정상파", "센서 데이터", "소음", "파형", "그래프"];
      return ["단진동", "탄성파", "도플러 효과", "정상파", "공진", "파형", "주파수", "센서 데이터"];
    }

    return [];
  }


  function getEarthScienceMajorTextBundle() {
    // 지구과학은 화면 전체 텍스트를 읽으면 개념 카드의 '천체/해수/기후' 단어가 섞여
    // 모든 학과가 천문/해양/환경처럼 오판되는 문제가 생긴다.
    // 따라서 실제 선택 학과명과 입력창/상단 상태값만 사용한다.
    const parts = [];
    const push = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (!text || /입력 전|선택 전|도서 선택 대기|선택 대기/.test(text)) return;
      parts.push(text);
    };
    try { push($("engineCareerSummary")?.textContent || ""); } catch (error) {}
    try { push(state.majorSelectedName || ""); } catch (error) {}
    try { push(state.career || ""); } catch (error) {}
    try { push(getEffectiveCareerName() || ""); } catch (error) {}
    try { push(getCareerInputText() || ""); } catch (error) {}
    try { push(getMajorPanelResolvedName() || ""); } catch (error) {}
    try {
      const detail = getMajorGlobalDetail?.();
      push(detail?.display_name || "");
      if (Array.isArray(detail?.aliases)) detail.aliases.slice(0, 4).forEach(push);
    } catch (error) {}
    return Array.from(new Set(parts)).join(' ').replace(/\s+/g, ' ').trim();
  }

  function getEarthScienceMajorKind() {
    const rawText = getEarthScienceMajorTextBundle();
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    const compact = text.replace(/\s+/g, '');
    const has = (pattern) => pattern.test(text) || pattern.test(compact);

    // 정확한 학과명 우선. 환경/천체/해수 같은 교과 개념 단어에 끌려가지 않게 한다.
    // 주의: 대기과학과의 "대기"는 waiting 상태값이 아니라 atmosphere 전공명이다.
    if (has(/천문우주학과|천문우주|천문학과|우주과학과|우주공학과|항공우주공학과|물리천문학부|천체/)) return "astronomy";
    if (has(/대기과학과|대기과학|기상학과|기상|기후과학과|기후학과/)) return "atmosphere";
    if (has(/해양학과|해양과학과|해양생명|해양수산|해양공학|수산생명|해양/)) return "ocean";
    if (has(/재난안전공학과|재난안전|방재공학과|방재|안전공학과|소방방재|소방|재난/)) return "disaster";
    if (has(/토목공학과|토목|건축공학과|건축공학|도시공학과|도시공학|건설|지반|측량|공간정보/)) return "civil";
    if (has(/컴퓨터공학과|컴퓨터|소프트웨어학과|소프트웨어|AI|인공지능|데이터사이언스|데이터|정보통계|통계|GIS|지리정보|공간데이터|빅데이터/)) return "data";
    if (has(/지구환경과학과|지구환경과학|지구과학과|지질학과|지질|자원공학과|광물|에너지자원|지구시스템/)) return "geoscience";
    if (has(/환경공학과|환경생태학과|환경공학|환경생태|생태|환경|지속가능|에너지환경|기후에너지|탄소중립/)) return "environment";
    return "default";
  }

  function getEarthSciencePreferredConceptSequence() {
    const kind = getEarthScienceMajorKind();
    const defaultSequence = [
      "해수의 성질",
      "해수의 순환",
      "날씨의 변화",
      "태풍과 악기상",
      "지구의 기후 변화",
      "지층과 지질시대",
      "판 구조와 암석 변화",
      "태양계 천체의 관측과 운동",
      "별의 특성과 진화",
      "은하와 우주의 진화"
    ];

    if (kind === "environment") {
      return ["지구의 기후 변화", "해수의 순환", "태풍과 악기상", "해수의 성질", "날씨의 변화", "판 구조와 암석 변화", "지층과 지질시대", "태양계 천체의 관측과 운동", "별의 특성과 진화", "은하와 우주의 진화"];
    }
    if (kind === "atmosphere") {
      return ["날씨의 변화", "태풍과 악기상", "지구의 기후 변화", "해수의 순환", "해수의 성질", "태양계 천체의 관측과 운동", "판 구조와 암석 변화", "지층과 지질시대", "별의 특성과 진화", "은하와 우주의 진화"];
    }
    if (kind === "ocean") {
      return ["해수의 성질", "해수의 순환", "지구의 기후 변화", "태풍과 악기상", "날씨의 변화", "지층과 지질시대", "판 구조와 암석 변화", "태양계 천체의 관측과 운동", "별의 특성과 진화", "은하와 우주의 진화"];
    }
    if (kind === "astronomy") {
      return ["태양계 천체의 관측과 운동", "별의 특성과 진화", "은하와 우주의 진화", "지구의 기후 변화", "날씨의 변화", "해수의 순환", "판 구조와 암석 변화", "지층과 지질시대", "해수의 성질", "태풍과 악기상"];
    }
    if (kind === "geoscience") {
      return ["판 구조와 암석 변화", "지층과 지질시대", "지구의 기후 변화", "해수의 순환", "해수의 성질", "날씨의 변화", "태풍과 악기상", "태양계 천체의 관측과 운동", "별의 특성과 진화", "은하와 우주의 진화"];
    }
    if (kind === "disaster") {
      return ["태풍과 악기상", "날씨의 변화", "판 구조와 암석 변화", "지구의 기후 변화", "해수의 순환", "지층과 지질시대", "해수의 성질", "태양계 천체의 관측과 운동", "별의 특성과 진화", "은하와 우주의 진화"];
    }
    if (kind === "civil") {
      return ["판 구조와 암석 변화", "지층과 지질시대", "태풍과 악기상", "날씨의 변화", "지구의 기후 변화", "해수의 성질", "해수의 순환", "태양계 천체의 관측과 운동", "별의 특성과 진화", "은하와 우주의 진화"];
    }
    if (kind === "data") {
      return ["날씨의 변화", "지구의 기후 변화", "은하와 우주의 진화", "태양계 천체의 관측과 운동", "해수의 순환", "해수의 성질", "별의 특성과 진화", "태풍과 악기상", "판 구조와 암석 변화", "지층과 지질시대"];
    }
    return defaultSequence;
  }

  function getEarthSciencePreferredKeywordSequence() {
    const concept = state.concept || "";
    const kind = getEarthScienceMajorKind();

    // v33.52 지구과학 추천 키워드 정리 원칙
    // 1) 오른쪽 추천 키워드는 개념 카드에 붙은 원자료를 무작위로 보여주지 않고, 학과군별로 4번 축이 분화되도록 정렬한다.
    // 2) 너무 넓은 표현은 뒤로 보내고, 학생이 눌렀을 때 4번 축이 명확하게 갈라지는 키워드를 앞에 둔다.
    // 3) 컴퓨터/데이터 계열은 관측자료·시계열·예측모형이 앞으로 오도록 별도 정렬한다.

    if (/해수의 성질/.test(concept)) {
      if (kind === "data") return ["관측 자료", "수온 염분도", "그래프", "수온", "염분", "밀도", "용존 산소", "해수 데이터", "시각화", "자료 분석", "혼합층", "수온 약층"];
      if (kind === "environment") return ["수온", "염분", "용존 산소", "수질", "해양 산성화", "해양 생물", "밀도", "혼합층", "수온 약층", "관측 자료", "해수 데이터", "환경 변화"];
      if (kind === "ocean") return ["수온", "염분", "밀도", "용존 산소", "혼합층", "수온 약층", "심해층", "수온 염분도", "표층 수온", "표층 염분", "관측 자료", "해수 데이터"];
      return ["수온", "염분", "밀도", "용존 산소", "혼합층", "수온 약층", "심해층", "수온 염분도", "표층 수온", "표층 염분", "관측 자료", "해수 데이터"];
    }

    if (/해수의 순환/.test(concept)) {
      if (kind === "data") return ["순환 모형", "시뮬레이션", "지도", "해류", "표층 순환", "심층 순환", "열염 순환", "그래프", "모델링", "엘니뇨", "라니냐", "자료 분석"];
      if (kind === "environment") return ["기후 변화", "탄소 저장", "엘니뇨", "라니냐", "해류", "열염 순환", "표층 순환", "심층 순환", "용승", "어장", "해양 자원", "생태계"];
      if (kind === "ocean") return ["해류", "표층 순환", "심층 순환", "열염 순환", "난류", "한류", "수괴", "용승", "엘니뇨", "라니냐", "순환 모형", "기후 변화"];
      return ["표층 순환", "심층 순환", "열염 순환", "해류", "난류", "한류", "수괴", "용승", "엘니뇨", "라니냐", "순환 모형", "기후 변화"];
    }

    if (/날씨의 변화/.test(concept)) {
      if (kind === "data") return ["기상 데이터", "위성 영상", "레이더 영상", "일기도", "시계열", "강수량", "예측 모형", "그래프", "자료 분석", "기압", "바람", "날씨 예측"];
      if (kind === "atmosphere") return ["일기도", "위성 영상", "레이더 영상", "기압", "고기압", "저기압", "바람", "전선", "기단", "강수대", "기상 데이터", "날씨 예측"];
      if (kind === "disaster") return ["위성 영상", "레이더 영상", "강수량", "날씨 예측", "예보", "경보", "저기압", "기압", "바람", "일기도", "재난", "안전"];
      return ["기압", "고기압", "저기압", "바람", "전선", "기단", "일기도", "위성 영상", "레이더 영상", "강수대", "기상 데이터", "날씨 예측"];
    }

    if (/태풍과 악기상/.test(concept)) {
      if (kind === "data") return ["태풍 경로", "위성 영상", "강수량", "풍속", "기압 분포", "예측 모형", "시뮬레이션", "데이터", "그래프", "해수면 온도", "태풍", "집중 호우"];
      if (kind === "disaster" || kind === "civil") return ["태풍", "집중 호우", "태풍 경로", "강풍", "풍속", "기압 분포", "경보", "방재", "피해", "도시 침수", "해수면 온도", "재난 예방"];
      return ["태풍", "열대 저기압", "태풍의 눈", "잠열", "해수면 온도", "기압 분포", "풍속", "강수량", "집중 호우", "악기상", "경보", "방재"];
    }

    if (/지구의 기후 변화/.test(concept)) {
      if (kind === "data") return ["기후 데이터", "기온 변화", "이산화탄소", "해수면 상승", "그래프", "통계", "예측 모형", "시계열", "온실 효과", "기후 변화", "엘니뇨", "라니냐"];
      if (kind === "environment" || kind === "atmosphere") return ["기후 변화", "온실 효과", "온실기체", "이산화탄소", "탄소중립", "해수면 상승", "엘니뇨", "라니냐", "남방진동", "기후 데이터", "재생에너지", "기후 대응"];
      return ["기후 변화", "온실 효과", "온실기체", "이산화탄소", "엘니뇨", "라니냐", "남방진동", "해수면 상승", "기후 데이터", "탄소중립", "예측 모형", "기후 대응"];
    }

    if (/지층과 지질시대/.test(concept)) {
      if (kind === "geoscience" || kind === "civil") return ["지층", "화석", "상대 연령", "절대 연령", "부정합", "퇴적암", "층서", "지질시대", "방사성 동위 원소", "지질 기록", "환경 변화", "대멸종"];
      return ["지층", "화석", "상대 연령", "절대 연령", "지질시대", "부정합", "퇴적암", "방사성 동위 원소", "환경 변화", "대멸종", "지질 기록", "생물 변화"];
    }

    if (/판 구조와 암석 변화/.test(concept)) {
      if (kind === "civil" || kind === "disaster") return ["판 구조론", "지진", "화산", "판 경계", "지반", "지질도", "재난", "안전", "화산재", "피해", "방재", "암석 순환"];
      if (kind === "geoscience") return ["판 구조론", "판 경계", "해양저 확장", "섭입", "발산 경계", "수렴 경계", "화성암", "변성암", "암석 순환", "고지자기", "지질도", "지질공원"];
      return ["판 구조론", "판 경계", "지진", "화산", "해양저 확장", "섭입", "화성암", "변성암", "암석 순환", "지질도", "지질공원", "재난"];
    }

    if (/태양계 천체의 관측과 운동/.test(concept)) {
      if (kind === "astronomy" || kind === "data") return ["관측", "케플러 법칙", "행성", "위성", "위상 변화", "궤도", "공전", "망원경", "주기", "거리", "관측 자료", "천체 데이터"];
      return ["행성", "위성", "위상 변화", "케플러 법칙", "관측", "공전", "궤도", "망원경", "주기", "거리", "관측 자료", "천체 데이터"];
    }

    if (/별의 특성과 진화/.test(concept)) {
      if (kind === "astronomy" || kind === "data") return ["H-R도", "스펙트럼", "별의 밝기", "표면 온도", "겉보기 등급", "절대 등급", "질량", "핵융합", "주계열성", "적색거성", "백색왜성", "초신성"];
      return ["별의 밝기", "겉보기 등급", "절대 등급", "스펙트럼", "표면 온도", "H-R도", "주계열성", "적색거성", "백색왜성", "질량", "핵융합", "별의 진화"];
    }

    if (/은하와 우주의 진화/.test(concept)) {
      if (kind === "astronomy" || kind === "data") return ["적색 편이", "허블 법칙", "우주 팽창", "빅뱅", "외부 은하", "은하 분류", "우주 배경 복사", "거리", "속도", "그래프", "우주 데이터", "암흑 물질"];
      return ["외부 은하", "은하 분류", "적색 편이", "허블 법칙", "우주 팽창", "빅뱅", "우주 배경 복사", "암흑 물질", "암흑 에너지", "우주 데이터", "우주 진화"];
    }

    return [];
  }

  function getPreferredConceptSequence() {
    if (isEarthSystemScienceSubject()) {
      return getEarthSystemSciencePreferredConceptSequence();
    }
    if (isCellMetabolismSubject()) {
      return getCellMetabolismPreferredConceptSequence();
    }
    if (isMatterEnergySubject()) {
      return getMatterEnergyPreferredConceptSequence();
    }
    if (isElectromagnetismQuantumSubject()) {
      return getElectromagnetismQuantumPreferredConceptSequence();
    }
    if (state.subject === "역학과 에너지" || state.subject === "역학과에너지") {
      return getMechanicsEnergyPreferredConceptSequence();
    }

    if (state.subject === "역학과 에너지" || state.subject === "역학과에너지") {
      const forced = getMechanicsEnergyPreferredConceptSequence().slice(0, 3);
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "지구과학" || state.subject === "지구과학Ⅰ" || state.subject === "지구과학1") {
      return getEarthSciencePreferredConceptSequence();
    }
    if (state.subject === "생명과학" || state.subject === "생명과학Ⅰ" || state.subject === "생명과학1") {
      return getLifeSciencePreferredConceptSequence();
    }
    if (state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") {
      return getChemistry1PreferredConceptSequence();
    }
    if (state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") {
      const chemPreferred = getChemistry1PreferredKeywordSequence();
      if (chemPreferred.length) return chemPreferred;
    }
    if (state.subject === "물리" || state.subject === "물리학" || state.subject === "물리학Ⅰ") {
      return getPhysics1PreferredConceptSequence();
    }
    if (state.subject === "미적분1") {
      return getCalculus1PreferredConceptSequence();
    }
    if (state.subject === "기하") {
      return getGeometryPreferredConceptSequence();
    }
    if (state.subject === "대수") {
      return getAlgebraPreferredConceptSequence();
    }
    if (state.subject === "확률과 통계") {
      return getProbabilityStatisticsPreferredConceptSequence();
    }
    if (state.subject === "통합사회1" || state.subject === "통합사회") {
      return getIntegratedSociety1PreferredConceptSequence();
    }
    if (state.subject === "통합사회2") {
      return getIntegratedSociety2PreferredConceptSequence();
    }
    if (state.subject === "통합과학1") {
      return getIntegratedScience1PreferredConceptSequence();
    }


    if (state.subject === "통합과학2") {
      return getIntegratedScience2PreferredConceptSequence();
    }
    if (state.subject === "과학탐구실험1") {
      return getScienceInquiry1PreferredConceptSequence();
    }
    if (state.subject === "과학탐구실험2") {
      return getScienceInquiry2PreferredConceptSequence();
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


  function getAlgebraPreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = isAlgebraComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(majorText) || bucket === "it";

    if (isDataScienceMajorSelectedContext()) {
      if (/지수함수와 로그함수의 활용/.test(concept)) return ["지수모델", "로그모델", "성장", "감소", "예측", "스케일 변환", "데이터 추세", "실생활 적용", "방사성 붕괴"];
      if (/로그함수의 뜻과 그래프/.test(concept)) return ["로그함수", "스케일 변환", "그래프 대칭", "증가", "점근선", "역함수", "데이터 변환", "로그 스케일"];
      if (/등차수열과 등비수열/.test(concept)) return ["등차수열", "등비수열", "일반항", "증가 규칙", "반복 규칙", "패턴", "시계열", "예측"];
      if (/수열의 합/.test(concept)) return ["누적합", "부분합", "시그마", "합 공식", "누적 데이터", "누적 변화", "반복 계산", "집계"];
      if (/수학적 귀납법/.test(concept)) return ["수학적 귀납법", "명제", "귀납 가정", "귀납 단계", "반복 논리", "알고리즘 정당성", "재귀", "검증"];
    }

    if (isIt) {
      if (/지수함수와 로그함수의 활용/.test(concept)) return ["지수모델", "성장", "감소", "충전 증가", "채널 용량", "로그모델", "방사성 붕괴", "별의 등급", "실생활 적용"];
      if (/등차수열과 등비수열/.test(concept)) return ["등차수열", "등비수열", "일반항", "공차", "공비", "규칙성", "반복 규칙", "패턴", "증가 규칙"];
      if (/수열의 합/.test(concept)) return ["시그마", "합", "부분합", "누적합", "합 공식", "등차수열의 합", "등비수열의 합", "반복 계산", "누적 데이터"];
      if (/수학적 귀납법/.test(concept)) return ["수학적 귀납법", "명제", "자연수", "귀납 가정", "귀납 단계", "증명", "반복 논리", "재귀", "알고리즘 정당성"];
      if (/로그함수의 뜻과 그래프/.test(concept)) return ["로그함수", "역함수", "그래프 대칭", "점근선", "정의역", "치역", "증가", "스케일 변환"];
      if (/지수함수의 뜻과 그래프/.test(concept)) return ["지수함수", "그래프", "증가", "감소", "점근선", "정의역", "치역", "밑의 범위"];
      if (/로그의 뜻과 성질/.test(concept)) return ["로그", "로그의 성질", "지수-로그 변환", "밑의 변환", "밑", "진수", "상용로그"];
      if (/상용로그/.test(concept)) return ["상용로그", "로그표", "자리수", "근삿값", "규모 비교"];
      if (/지수의 확장/.test(concept)) return ["정수 지수", "유리수 지수", "실수 지수", "지수법칙", "밑의 조건", "식 변형", "대소 비교"];
      if (/거듭제곱과 거듭제곱근/.test(concept)) return ["거듭제곱", "거듭제곱근", "n제곱근", "근호", "실수인 근", "밑", "지수"];
    }

    return [];
  }

  function getProbabilityStatisticsPreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = !isDataScienceMajorSelectedContext() && (isProbabilityStatisticsComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|정보보호|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크)/i.test(majorText) || bucket === "it");

    if (isDataScienceMajorSelectedContext()) {
      if (/확률변수와 확률분포/.test(concept)) return ["확률분포", "확률변수", "기댓값", "분산", "표준편차", "평균", "분포 비교", "그래프", "데이터", "예측", "모델링"];
      if (/이항분포와 정규분포/.test(concept)) return ["정규분포", "이항분포", "표준화", "표준정규분포", "근사", "분포 비교", "평균", "표준편차", "성공 확률", "예측 모델"];
      if (/통계적 추정/.test(concept)) return ["통계적 추정", "표본평균", "모평균", "신뢰구간", "추정 오차", "표준오차", "신뢰도", "데이터 해석", "모델 평가", "의사결정"];
      if (/모집단과 표본/.test(concept)) return ["모집단", "표본", "표본추출", "표본오차", "대표성", "무작위 추출", "편향", "자료 수집", "신뢰도", "조사 데이터"];
      if (/조건부확률과 사건의 독립/.test(concept)) return ["조건부확률", "독립", "종속", "사건", "베이즈", "예측", "분류", "판단", "위험", "의사결정"];
      if (/확률의 뜻과 기본 성질/.test(concept)) return ["표본공간", "사건", "확률", "상대도수", "반복 시행", "불확실성", "데이터", "모델링"];
      if (/순열과 조합/.test(concept)) return ["조합", "순열", "경우의 수", "선택", "배열", "탐색", "분기", "추천 조합"];
      if (/이항정리/.test(concept)) return ["이항정리", "이항계수", "파스칼의 삼각형", "계수", "패턴", "조합", "규칙 일반화"];
    }

    if (isIt) {
      if (/순열과 조합/.test(concept)) return ["순열", "조합", "경우의 수", "중복순열", "중복조합", "배열", "선택", "경우 나누기", "탐색", "분기"];
      if (/이항정리/.test(concept)) return ["이항정리", "이항계수", "파스칼의 삼각형", "계수", "전개식", "계수 비교", "패턴", "배열", "조합"];
      if (/확률의 뜻과 기본 성질/.test(concept)) return ["표본공간", "사건", "확률", "상대도수", "반복 시행", "시행", "결과", "불확실성", "확률의 덧셈정리"];
      if (/조건부확률과 사건의 독립/.test(concept)) return ["조건부확률", "독립", "종속", "사건", "확률의 곱셈정리", "기대값", "판단", "위험", "의사결정", "베이즈"];
      if (/확률변수와 확률분포/.test(concept)) return ["확률변수", "확률분포", "기댓값", "분산", "표준편차", "평균", "그래프", "분포", "예측", "데이터"];
      if (/이항분포와 정규분포/.test(concept)) return ["이항분포", "정규분포", "표준화", "표준정규분포", "근사", "분포 비교", "그래프", "성공 확률", "평균", "표준편차"];
      if (/모집단과 표본/.test(concept)) return ["모집단", "표본", "표본추출", "표본오차", "대표성", "무작위 추출", "편향", "조사", "자료 수집", "신뢰도"];
      if (/통계적 추정/.test(concept)) return ["통계적 추정", "표본평균", "모평균", "신뢰구간", "추정", "추정 오차", "신뢰도", "표준오차", "데이터 해석", "의사결정"];
    }

    return [];
  }


  function getIntegratedSociety1PreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = isIntegratedSociety1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|플랫폼|네트워크)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/생활 공간 변화와 지역 이해/.test(concept)) return ["정보화", "네트워크", "통신 발달", "교통 발달", "공간 압축", "정보 격차", "지역 조사", "지역 변화", "도시 문제", "생활 공간"];
      if (/시장 경제와 금융 생활/.test(concept)) return ["합리적 선택", "기회비용", "효율성", "시장 참여자", "자산 관리", "위험 관리", "금융 자산", "무역", "상호 의존", "경제 윤리"];
      if (/미래와 지속 가능한 삶/.test(concept)) return ["미래 사회", "미래 직업", "지속 가능한 발전", "지속 가능성", "자원", "소비 실태", "인구 변화", "저출산", "고령화", "공동체"];
      if (/통합적 관점과 행복/.test(concept)) return ["통합적 사고력", "시간적 관점", "공간적 관점", "사회적 관점", "윤리적 관점", "행복 지수", "삶의 질", "문제 해결"];
      if (/인권 보장과 시민 참여/.test(concept)) return ["인권", "현대 인권", "시민 참여", "민주 시민", "헌법", "차별", "국제 인권", "해결 방안"];
      if (/사회 정의와 불평등/.test(concept)) return ["공정성", "불평등", "소득 격차", "기회 불평등", "사회 정의", "분배", "해결 노력"];
    }

    return [];
  }



  function getIntegratedSociety2PreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = isIntegratedSociety1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹|플랫폼|네트워크|알고리즘)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/미래와 지속가능한 삶/.test(concept)) return ["미래 사회", "인공지능", "자동화", "디지털 전환", "기술 변화", "미래 직업", "인구 변화", "지속가능성", "기후 위기", "탄소중립"];
      if (/시장경제와 지속가능발전/.test(concept)) return ["시장경제", "가격", "수요", "공급", "합리적 선택", "소비자", "생산자", "금융", "소비", "지속가능발전", "ESG", "공정무역"];
      if (/세계화와 평화/.test(concept)) return ["세계화", "상호의존", "국제 분업", "무역", "교류", "국제기구", "문화 다양성", "세계시민", "갈등", "평화"];
      if (/인권 보장과 헌법/.test(concept)) return ["헌법", "기본권", "자유권", "평등권", "사회권", "권리 충돌", "시민 참여", "인권", "정보 인권", "개인정보"];
      if (/사회 정의와 불평등/.test(concept)) return ["공정성", "사회 정의", "불평등", "소득 격차", "기회 불평등", "복지", "정책", "디지털 격차"];
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

  function getInfoPreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it";

    if (isDataScienceMajorSelectedContext()) {
      if (/자료와 정보의 분석/.test(concept)) return ["자료 분석", "자료 수집", "비교 기준", "시각화", "정렬", "탐색", "의미 있는 정보", "데이터베이스", "분석 과정", "의사결정"];
      if (/알고리즘 설계와 분석/.test(concept)) return ["효율성", "성능 비교", "탐색", "정렬", "이진 탐색", "수행 시간", "반복", "예측 처리", "알고리즘 최적화"];
      if (/추상화와 문제 분해/.test(concept)) return ["문제 분해", "조건 분석", "모델링", "현재 상태", "목표 상태", "작은 문제로 나누기", "변수", "기준 설정"];
      if (/자료와 정보의 표현/.test(concept)) return ["디지털 정보", "자료 표현", "부호화", "표현 방식 선택", "데이터 변환", "저장", "전송"];
      if (/프로그래밍과 자동화/.test(concept)) return ["Python", "변수 설계", "조건문", "반복문", "리스트", "자료 처리", "자동화", "데이터 처리"];
      if (/컴퓨팅 시스템과 네트워크/.test(concept)) return ["네트워크", "공유", "협업", "데이터 전송", "플랫폼", "보안", "컴퓨팅 네트워크 환경"];
      if (/지식·정보 사회와 정보 문화/.test(concept)) return ["정보 윤리", "데이터 윤리", "개인정보", "정보 보호", "디지털 시민성", "공유와 협업"];
    }

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


  function getScienceInquiry1PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/자료 수집·분석·결론 도출/.test(concept)) return ["자료 수집", "분석", "그래프", "표", "데이터", "결론", "증거 기반 설명", "오차", "신뢰도", "평균", "비교", "경향"];
      if (/가설 설정과 탐구 설계/.test(concept)) return ["가설", "조작변인", "통제변인", "종속변인", "변인", "대조 실험", "탐구 절차", "실험 설계", "예상 결과", "그래프", "패턴"];
      if (/문제 인식과 탐구 질문 설정/.test(concept)) return ["문제 인식", "탐구 질문", "질문 설정", "탐구 주제", "탐구 목적", "주제", "범위", "구체화"];
      if (/탐구 보고서 작성/.test(concept)) return ["보고서", "구성", "탐구 주제", "탐구 목적", "탐구 문제", "결과 및 토의", "결론 및 제언", "그래프", "시각화", "발표"];
      if (/과학의 단위 및 도량형의 역사 추적하기/.test(concept)) return ["단위", "도량형", "표준", "표준화", "공통 기준", "측정값", "환산", "비교"];
      if (/갈릴레이의 경사면 실험과 낙하 운동/.test(concept)) return ["경사면 실험", "낙하 운동", "속도", "시간", "거리", "그래프", "데이터", "오차", "비교", "분석"];
      if (/멘델레예프의 주기율표 만들기/.test(concept)) return ["주기율표", "원소 배열", "규칙성", "분류", "패턴", "예측", "원자 번호"];
    }

    return [];
  }



  function getScienceInquiry2PreferredKeywordSequence() {
    const majorText = [state.career || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|게임|앱|웹)/i.test(majorText) || bucket === "it";

    if (isIt) {
      if (/첨단 센서와 디지털 정보 탐구/.test(concept)) return ["센서", "디지털 정보", "데이터", "측정", "신호", "입력", "출력", "자동화", "제어", "시스템", "저장", "전송", "통신", "코드"];
      if (/생활 자료를 활용한 과학적 의사결정 탐구/.test(concept)) return ["자료", "그래프", "통계", "설문", "수집", "정리", "분석", "비교", "기준", "근거", "판단", "의사결정", "시각화"];
      if (/첨단 과학 기술의 사회 적용 탐구/.test(concept)) return ["인공지능", "로봇", "반도체", "미래 사회", "사회 영향", "윤리", "책임", "위험", "규제", "찬반", "쟁점", "토론"];
      if (/생체 신호와 건강 데이터 탐구/.test(concept)) return ["심박수", "체온", "호흡", "혈압", "맥박", "건강 데이터", "그래프", "앱", "센서", "스마트워치", "패턴", "비교"];
      if (/내진 설계와 구조 안정성 탐구/.test(concept)) return ["내진", "면진", "제진", "구조", "진동", "주기", "공진", "지진파", "센서", "데이터", "설계 개선"];
      if (/충격을 줄이는 방법과 안전장치 탐구/.test(concept)) return ["충돌", "충격", "감속", "에어백", "헬멧", "범퍼", "안전벨트", "충격 흡수", "그래프", "데이터", "측정", "모델"];
    }

    return [];
  }

  function getCalculus1PreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = isCalculus1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|게임|앱|웹|네트워크|최적화)/i.test(majorText) || bucket === "it";
    const isMechanical = isMechanicalEngineeringMajorSelectedContext() || /(기계공학과|기계|자동차|모빌리티|항공|로봇|메카트로닉스|열유체|냉동공조)/.test(majorText) || bucket === "mechanical";
    // v88.8 D1-lock: 데이터사이언스/통계 계열은 변화율·누적량·수렴을
    // 모델 학습, 예측, 데이터 해석과 연결하는 키워드를 먼저 노출한다.
    if (isDataScienceMajorSelectedContext()) {
      if (/도함수의 활용/.test(concept)) return ["변화율", "최적화", "극값", "최댓값", "최솟값", "그래프 개형", "모델 오차", "학습률", "예측 모델", "의사결정"];
      if (/정적분의 활용/.test(concept)) return ["누적량", "면적", "리만 합", "수치 근사", "누적 데이터", "분포 면적", "모델링", "시뮬레이션"];
      if (/수열의 극한/.test(concept)) return ["수렴", "발산", "장기 변화", "반복", "수열", "극한", "모델 안정성", "수렴 판정"];
      if (/급수/.test(concept)) return ["급수", "부분합", "누적", "무한합", "수렴", "발산", "오차", "근사"];
      if (/여러 가지 함수의 미분/.test(concept)) return ["도함수", "지수함수 미분", "로그함수 미분", "변화율", "표준 극한", "모델 변화", "데이터 변환"];
    }

    // v88.7 C2-lock: 기계계열 미적분1은 컴퓨터/데이터형 키워드가 아니라
    // 변화율·속도·가속도·누적량·일/에너지처럼 기계 시스템 해석에 필요한 키워드를 먼저 노출한다.
    if (isMechanical) {
      if (/도함수의 활용/.test(concept)) return ["변화율", "속도", "가속도", "최적화", "극값", "최댓값", "최솟값", "접선", "그래프 개형", "제어", "시뮬레이션", "기계 시스템"];
      if (/여러 가지 함수의 미분/.test(concept)) return ["도함수", "삼각함수 미분", "지수함수 미분", "로그함수 미분", "변화율", "진동 모델", "신호 변화", "실수 e", "자연로그", "표준 극한"];
      if (/정적분의 활용/.test(concept)) return ["이동거리", "누적량", "일", "에너지", "면적", "부피", "리만 합", "수치 근사", "시뮬레이션", "유량", "누적 변화"];
    }
    if (isIt) {
      if (/도함수의 활용/.test(concept)) return ["변화율", "최적화", "극값", "접선", "증가", "감소", "최댓값", "최솟값", "그래프 개형", "의사결정"];
      if (/여러 가지 함수의 미분/.test(concept)) return ["도함수", "지수함수 미분", "로그함수 미분", "삼각함수 미분", "실수 e", "자연로그", "변화율", "표준 극한"];
      if (/수열의 극한/.test(concept)) return ["수열", "극한", "수렴", "발산", "반복", "장기 변화", "등비수열", "수렴 판정"];
      if (/정적분의 활용/.test(concept)) return ["누적량", "넓이", "부피", "이동거리", "리만 합", "면적", "모델링", "수치 근사"];
      if (/급수/.test(concept)) return ["급수", "부분합", "등비급수", "무한합", "수렴", "발산", "누적", "프랙털"];
      if (/여러 가지 미분법/.test(concept)) return ["합성함수 미분", "연쇄법칙", "곱의 미분", "몫의 미분", "변화율 계산", "모델 변화", "매개변수"];
      if (/여러 가지 적분법/.test(concept)) return ["부정적분", "정적분", "치환적분", "부분적분", "적분 계산", "함수 변환", "누적 계산"];
    }
    return [];
  }





  function getLifeSciencePreferredKeywordSequence() {
    let statusMajorText = "";
    try {
      statusMajorText = String($("engineCareerSummary")?.textContent || "").replace(/\s+/g, " ").trim();
      if (/입력 전|선택 전|대기/.test(statusMajorText)) statusMajorText = "";
    } catch (error) {}
    const majorText = [statusMajorText || "", state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isNursingHealth = /(간호학과|간호|보건|임상병리|의료|재활|물리치료|작업치료)/.test(majorText);
    const isBioEngMajor = /(생명공학과|생명공학|의생명|바이오|생명과학|유전공학|분자생명|생명정보|바이오헬스|바이오메디컬)/.test(majorText);
    const isIt = isLifeScienceComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|통계|알고리즘|시뮬레이션|모델링|바이오인포매틱스|생명정보|신경망|뉴럴|센서|헬스케어)/i.test(majorText) || bucket === "it";
    if (isNursingHealth) {
      if (/물질대사와 건강/.test(concept)) return ["혈당", "인슐린", "당뇨병", "고혈압", "대사 증후군", "건강 데이터", "생활 습관", "예방", "비만", "콜레스테롤"];
      if (/신경계와 항상성/.test(concept)) return ["항상성", "호르몬", "체온 조절", "혈당 조절", "피드백", "중추 신경계", "말초 신경계", "자율 신경", "건강 관리", "의사결정"];
      if (/면역과 백신/.test(concept)) return ["병원체", "항원", "항체", "백신", "면역 반응", "면역 기억", "감염", "예방", "집단 면역", "공중보건"];
      if (/물질대사와 에너지/.test(concept)) return ["영양소", "ATP", "세포 호흡", "효소", "대사 경로", "에너지 전환", "포도당", "반응 속도", "기질", "ADP"];
      if (/신경 자극 전도와 전달/.test(concept)) return ["뉴런", "시냅스", "막전위", "활동 전위", "신경전달물질", "수용체", "자극", "전도", "전달", "반응 시간"];
      if (/유전자와 염색체/.test(concept)) return ["유전자 검사", "정밀의학", "돌연변이", "유전 질환", "DNA", "염색체", "유전자", "염기 서열", "유전 정보", "개인정보"];
    }
    if (isBioEngMajor) {
      if (/유전자와 염색체/.test(concept)) return ["DNA", "유전자", "염색체", "염기 서열", "복제", "전사", "번역", "단백질 합성", "바이오 데이터", "유전자 검사", "유전체", "정밀의학"];
      if (/생명과학의 이해/.test(concept)) return ["생명 시스템", "세포", "항상성", "생명 현상", "바이오 기술", "생체 모방", "탐구 대상", "구성 단계", "시스템", "응용"];
      if (/물질대사와 에너지/.test(concept)) return ["ATP", "세포 호흡", "광합성", "효소", "대사 경로", "에너지 전환", "피드백 조절", "반응 속도", "바이오공정", "대사 조절"];
      if (/면역과 백신/.test(concept)) return ["항원", "항체", "면역 반응", "백신", "면역 기억", "병원체", "진단", "감염", "바이오의약", "안전성"];
      if (/진화와 생물 다양성/.test(concept)) return ["진화", "자연선택", "생물 다양성", "계통수", "종 다양성", "생물 자원", "분류", "비교 분석"];
    }
    if (isIt) {
      if (/유전자와 염색체/.test(concept)) return ["DNA", "유전 정보", "유전자", "염색체", "정보 저장", "염기 서열", "형질 발현", "돌연변이", "유전 정보 해석", "생명 정보"];
      if (/신경 자극 전도와 전달/.test(concept)) return ["뉴런", "막전위", "활동 전위", "시냅스", "자극", "전도", "전달", "이온 이동", "신호 전달", "반응 시간"];
      if (/신경계와 항상성/.test(concept)) return ["중추 신경계", "말초 신경계", "체온 조절", "혈당 조절", "항상성", "피드백", "조절", "감각", "반응", "내부 환경"];
      if (/생태계의 물질 순환과 상호 작용/.test(concept)) return ["생태계", "물질 순환", "에너지 흐름", "개체군", "상호 작용", "먹이 그물", "개체군 변동", "생태계 평형", "모델링", "네트워크"];
      if (/생명과학의 이해/.test(concept)) return ["생물의 특징", "세포", "물질대사", "항상성", "구성 단계", "시스템", "생명 현상", "데이터 관찰"];
      if (/물질대사와 에너지/.test(concept)) return ["물질대사", "ATP", "광합성", "세포 호흡", "에너지 전환", "효소", "대사 경로", "반응 속도"];
      if (/면역과 백신/.test(concept)) return ["병원체", "선천 면역", "항원", "항체", "백신", "면역 반응", "감염", "데이터 추적"];
      if (/물질대사와 건강/.test(concept)) return ["대사성 질환", "당뇨병", "고혈압", "예방과 관리", "건강 데이터", "혈당", "생활 습관"];
      if (/진화와 생물 다양성/.test(concept)) return ["진화", "자연선택", "분류", "생물 다양성", "계통수", "종 다양성", "비교 분석"];
      if (/생식과 생명의 연속성/.test(concept)) return ["감수 분열", "생식 세포", "수정", "생명의 연속성", "염색체 분리", "유전적 다양성"];
    }
    return [];
  }


  function getChemistry1PreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const chemistryMajorKind = getChemistry1MajorKind();
    const isChemEng = chemistryMajorKind === "chemical_engineering";
    const isEnergy = chemistryMajorKind === "energy";
    const isMaterials = chemistryMajorKind === "materials";
    const isBioEng = chemistryMajorKind === "bioengineering";
    const isNursing = chemistryMajorKind === "nursing";
    const isPharmacy = chemistryMajorKind === "pharmacy";
    const isFood = chemistryMajorKind === "food";
    const isChemistryMajor = chemistryMajorKind === "chemistry";
    const isIt = isChemistry1ComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|반도체|전자|전기|통신|네트워크|센서|임베디드|하드웨어|소자)/i.test(majorText) || bucket === "it" || bucket === "electronic" || chemistryMajorKind === "semiconductor" || chemistryMajorKind === "electronics";
    if (isFood) {
      if (/탄소 화합물의 유용성/.test(concept)) return ["탄수화물", "단백질", "지질", "아미노산", "당", "식품 성분", "영양소", "작용기", "고분자", "식품 첨가물", "분자 구조", "생체 분자"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자 구조", "분자의 극성", "수소 결합", "분자 사이 힘", "용해도", "친수성", "소수성", "유화", "점성", "식품 물성", "수분", "보존성"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["pH", "완충 용액", "산", "염기", "중화", "식품 보존", "발효", "산도", "부패", "미생물", "보존 안정성", "품질 변화"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "몰 농도", "희석", "농도", "식품 분석", "정량 분석", "당도", "염도", "시료", "오차", "용액", "농도 계산"];
      if (/화학 반응과 열의 출입/.test(concept)) return ["발열 반응", "흡열 반응", "반응열", "가열", "냉각", "갈변", "산화", "환원", "저장 온도", "품질 변화", "열 안정성"];
      if (/화학과 우리 생활/.test(concept)) return ["식품", "영양", "첨가물", "보존료", "산도", "당도", "염도", "생활 화학", "안전", "표시 기준"];
    }
    if (isChemistryMajor) {
      if (/현대의 원자 모형과 전자 배치/.test(concept)) return ["에너지 준위", "오비탈", "전자 배치 작성", "선 스펙트럼", "보어 모형", "주 양자수", "방위 양자수", "전자 스핀", "쌓음 원리", "파울리 배타 원리", "훈트 규칙", "원소 성질"];
      if (/원자의 구조/.test(concept)) return ["전자", "원자핵", "양성자", "중성자", "원자 번호", "질량수", "동위원소", "평균 원자량", "원자 모형", "질량 분석"];
      if (/원소의 주기적 성질/.test(concept)) return ["주기율표", "유효 핵전하", "이온화 에너지", "원자 반지름", "이온 반지름", "전기음성도", "금속성", "비금속성", "족", "주기", "주기성 비교"];
      if (/화학 결합/.test(concept)) return ["원자가 전자", "공유 결합", "이온 결합", "전기음성도", "결합의 극성", "루이스 전자점식", "비공유 전자쌍", "분자 모형", "결합각", "전자쌍 반발", "결합 종류 판별"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자 구조", "전자쌍 반발", "결합각", "분자의 극성", "쌍극자", "분자 사이 힘", "수소 결합", "끓는점", "용해도", "구조식", "물성 예측"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "아보가드로수", "화학식량", "분자량", "몰 질량", "화학 반응식", "계수비", "반응물", "생성물", "수율", "정량 분석", "오차"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["동적 평형", "가역 반응", "정반응", "역반응", "평형 이동", "농도", "온도", "압력", "pH", "산", "염기", "완충 용액"];
      if (/화학 반응과 열의 출입/.test(concept)) return ["산화", "환원", "산화수", "전자 이동", "전지", "반응열", "발열 반응", "흡열 반응", "중화 반응", "엔탈피", "에너지 출입"];
      if (/탄소 화합물의 유용성/.test(concept)) return ["탄소 화합물", "작용기", "고분자", "플라스틱", "에탄올", "아세트산", "공유 결합", "분자 구조", "유기 물질", "생활 화학"];
    }
    if (isPharmacy) {
      if (/탄소 화합물의 유용성/.test(concept)) return ["의약품", "작용기", "탄소 화합물", "고분자", "약물 구조", "생체 분자", "단백질", "아미노산", "지질", "친수성", "소수성", "분자 구조"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자 구조", "분자의 극성", "수소 결합", "분자 사이 힘", "용해도", "친수성", "소수성", "약물 흡수", "세포막", "제형", "수용체", "분자 상호작용"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["pH", "완충 용액", "산", "염기", "중화", "약물 안정성", "체액", "혈액 pH", "평형 이동", "농도", "반응 조건", "제형 안정성"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "몰 농도", "희석", "용액", "투약 농도", "정량 분석", "시료", "오차", "화학 반응식", "계수비", "용량", "농도 계산"];
      if (/화학 반응과 열의 출입/.test(concept)) return ["반응열", "발열 반응", "흡열 반응", "안정성", "산화", "환원", "분해", "보관 조건", "온도", "반응 속도"];
      if (/화학 결합/.test(concept)) return ["공유 결합", "수소 결합", "이온 결합", "전기음성도", "결합의 극성", "작용기", "약물 구조", "분자 상호작용"];
    }
    if (isNursing) {
      if (/탄소 화합물의 유용성/.test(concept)) return ["탄소 화합물", "의약품", "고분자", "단백질", "아미노산", "탄수화물", "지질", "생체 분자", "작용기", "분자 구조", "생활 화학", "인체 적용"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["pH", "완충 용액", "산", "염기", "중화", "체액", "혈액 pH", "평형 이동", "농도", "반응 조건", "수질", "건강 지표"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자 구조", "분자의 극성", "수소 결합", "분자 사이 힘", "용해도", "친수성", "소수성", "약물 흡수", "세포막", "생체 분자", "물성"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "몰 농도", "희석", "용액", "투약 농도", "정량 분석", "시료", "오차", "화학 반응식", "계수비"];
      if (/화학과 우리 생활/.test(concept)) return ["생활 화학", "의약품", "소독", "세정", "식품", "안전", "농도", "환경 보건", "건강", "자료 조사"];
    }
    if (isBioEng) {
      if (/탄소 화합물의 유용성/.test(concept)) return ["탄소 화합물", "고분자", "단백질", "아미노산", "탄수화물", "지질", "생체 분자", "작용기", "분자 구조", "바이오 소재", "분자 상호작용"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자 구조", "분자의 극성", "분자 사이 힘", "수소 결합", "단백질 구조", "생체 분자", "용해도", "친수성", "소수성", "물성"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["동적 평형", "pH", "완충 용액", "산", "염기", "효소 반응", "대사 조건", "평형 이동", "세포 환경", "반응 조건"];
      if (/화학 결합/.test(concept)) return ["공유 결합", "수소 결합", "이온 결합", "전기음성도", "결합의 극성", "생체 분자", "단백질", "분자 상호작용", "분자 모형"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "몰 농도", "희석", "반응식", "수율", "농도", "시료", "오차", "정량 분석"];
    }
    if (isChemEng) {
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "화학 반응식", "계수비", "몰 질량", "수율", "생산량", "공정", "효율", "몰 농도", "희석", "오차", "그래프"];
      if (/화학 반응과 열의 출입/.test(concept)) return ["반응 엔탈피", "발열 반응", "흡열 반응", "열량", "중화 반응", "산화", "환원", "산화수", "전자 이동", "전지", "효율", "안전"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["동적 평형", "가역 반응", "정반응", "역반응", "pH", "산", "염기", "중화", "완충", "공정", "최적화", "수율"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자 구조", "분자의 극성", "분자 사이 힘", "끓는점", "용해도", "물성", "용매", "분리 공정"];
      if (/탄소 화합물의 유용성/.test(concept)) return ["탄소 화합물", "고분자", "플라스틱", "에탄올", "아세트산", "공유 결합", "분자 구조", "공정"];
    }
    if (isEnergy) {
      if (/화학 반응과 열의 출입/.test(concept)) return ["산화", "환원", "산화수", "전자 이동", "전지", "배터리", "전극", "충전", "방전", "발열 반응", "흡열 반응", "열량"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "화학 반응식", "계수비", "수율", "효율", "반응물", "생성물", "몰 질량", "공정 계산"];
      if (/화학 반응에서의 동적 평형/.test(concept)) return ["동적 평형", "농도", "압력", "온도", "평형 이동", "공정", "수율", "최적화"];
      if (/화학 결합/.test(concept)) return ["원자가 전자", "이온 결합", "공유 결합", "전기음성도", "전도성", "전극 소재", "결합의 극성"];
    }
    if (isMaterials) {
      if (/화학 결합/.test(concept)) return ["원자가 전자", "공유 결합", "이온 결합", "전기음성도", "결합의 극성", "루이스 전자점식", "비공유 전자쌍", "결합 종류 판별", "극성 판단", "분자 모형 해석", "전도성", "녹는점"];
      if (/원소의 주기적 성질/.test(concept)) return ["이온화 에너지", "금속", "원자 반지름", "전기음성도", "주기율표", "유효 핵전하", "비금속", "주기성 비교", "이온 반지름", "재료 선택", "족", "주기"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자의 극성", "분자 사이 힘", "끓는점", "전자쌍 반발", "결합각", "쌍극자", "수소 결합", "구조식", "용해도", "물성", "비대칭"];
      if (/현대의 원자 모형과 전자 배치/.test(concept)) return ["에너지 준위", "오비탈", "전자 배치 작성", "선 스펙트럼", "오비탈 해석", "전자 스핀", "쌓음 원리", "파울리 배타 원리", "훈트 규칙"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "반응식", "계수", "몰 질량", "화학식량", "분자량", "비율", "공정 계산"];
      if (/화학 반응과 열의 출입/.test(concept)) return ["반응열", "발열 반응", "흡열 반응", "에너지 출입", "산화", "환원", "소재 반응", "열 안정성"];
    }
    if (isIt) {
      if (/현대의 원자 모형과 전자 배치/.test(concept)) return ["에너지 준위", "오비탈", "전자 배치 작성", "오비탈 해석", "선 스펙트럼", "보어 모형", "주 양자수", "방위 양자수", "전자 스핀", "쌓음 원리", "파울리 배타 원리", "훈트 규칙"];
      if (/원소의 주기적 성질/.test(concept)) return ["주기율표", "유효 핵전하", "이온화 에너지", "원자 반지름", "금속", "비금속", "주기성 비교", "가려막기 효과", "이온 반지름", "주기", "족"];
      if (/화학 결합/.test(concept)) return ["원자가 전자", "공유 결합", "이온 결합", "전기음성도", "결합의 극성", "루이스 전자점식", "비공유 전자쌍", "결합 종류 판별", "극성 판단", "분자 모형 해석"];
      if (/원자의 구조/.test(concept)) return ["전자", "원자핵", "양성자", "중성자", "원자 번호", "질량수", "동위원소", "평균 원자량"];
      if (/분자의 구조와 성질/.test(concept)) return ["분자의 구조", "전자쌍 반발", "결합각", "분자의 극성", "쌍극자", "구조식", "수소 결합", "분자 사이 힘"];
      if (/물질의 양과 화학 반응식/.test(concept)) return ["몰", "아보가드로수", "화학식량", "분자량", "반응식", "계수", "몰 질량", "비율"];
      if (/화학 반응과 열의 출입/.test(concept)) return ["산화", "환원", "중화 반응", "반응열", "발열 반응", "흡열 반응", "에너지 출입"];
    }
    return [];
  }


  function getChemistry1HardAxisBoost(axis) {
    if (!(state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1")) return 0;
    const concept = String(state.concept || "");
    const keyword = String(state.keyword || "");
    if (!concept || !keyword) return 0;
    const axisText = [
      String(axis?.id || axis?.axis_id || ""),
      String(axis?.title || axis?.axis_title || ""),
      String(axis?.short || axis?.axis_short || ""),
      String(axis?.axisDomain || axis?.axis_domain || "")
    ].join(" ");
    const kind = getChemistry1MajorKind();
    const hit = (...values) => values.some(value => fuzzyIncludes(keyword, value) || fuzzyIncludes(value, keyword));
    let boost = 0;

    if (kind === "food") {
      if (/탄소 화합물의 유용성/.test(concept) && hit("탄수화물", "단백질", "지질", "아미노산", "당", "식품 성분", "영양소", "작용기", "식품 첨가물")) {
        if (/food_nutrient_structure_axis|식품 성분|영양 구조/.test(axisText)) boost = Math.max(boost, 760);
        if (/food_solubility_texture_axis|식품 물성|용해도/.test(axisText)) boost = Math.max(boost, 560);
        if (/health_nutrition_application_axis|건강·영양 응용 축|영양/.test(axisText)) boost = Math.max(boost, 420);
      }
      if (/분자의 구조와 성질/.test(concept) && hit("분자 구조", "분자의 극성", "수소 결합", "분자 사이 힘", "용해도", "친수성", "소수성", "유화", "점성", "식품 물성", "수분")) {
        if (/food_solubility_texture_axis|식품 물성|용해도/.test(axisText)) boost = Math.max(boost, 780);
        if (/food_nutrient_structure_axis|식품 성분|영양 구조/.test(axisText)) boost = Math.max(boost, 560);
        if (/intermolecular_force_axis|분자 간 힘/.test(axisText)) boost = Math.max(boost, 360);
      }
      if (/화학 반응에서의 동적 평형/.test(concept) && hit("pH", "완충", "산", "염기", "중화", "식품 보존", "발효", "산도", "부패", "미생물", "보존 안정성")) {
        if (/food_ph_preservation_axis|식품 pH|보존 안정성/.test(axisText)) boost = Math.max(boost, 800);
        if (/food_concentration_quant_axis|식품 농도|정량 분석/.test(axisText)) boost = Math.max(boost, 520);
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost -= 120;
      }
      if (/물질의 양과 화학 반응식/.test(concept) && hit("몰", "몰 농도", "희석", "농도", "식품 분석", "정량 분석", "당도", "염도", "시료", "농도 계산")) {
        if (/food_concentration_quant_axis|식품 농도|정량 분석/.test(axisText)) boost = Math.max(boost, 790);
        if (/stoichiometry_axis|화학량론 해석 축|화학량론/.test(axisText)) boost = Math.max(boost, 320);
      }
      if (/화학 반응과 열의 출입/.test(concept) && hit("발열", "흡열", "가열", "냉각", "갈변", "산화", "환원", "저장 온도", "품질 변화", "열 안정성")) {
        if (/food_heat_quality_axis|식품 열처리|품질 변화/.test(axisText)) boost = Math.max(boost, 780);
      }
    }

    if (kind === "pharmacy") {
      if (/탄소 화합물의 유용성/.test(concept) && hit("의약품", "작용기", "약물 구조", "탄소 화합물", "생체 분자", "친수성", "소수성")) {
        if (/drug_structure_function_axis|의약품 구조|작용기/.test(axisText)) boost = Math.max(boost, 760);
        if (/drug_solubility_absorption_axis|약물 용해도|흡수/.test(axisText)) boost = Math.max(boost, 620);
        if (/organic_structure_axis|유기 물질 구조 해석 축|유기 물질/.test(axisText)) boost = Math.max(boost, 420);
      }
      if (/분자의 구조와 성질/.test(concept) && hit("분자 구조", "분자의 극성", "수소 결합", "분자 사이 힘", "용해도", "친수성", "소수성", "약물 흡수", "세포막", "제형")) {
        if (/drug_solubility_absorption_axis|약물 용해도|흡수/.test(axisText)) boost = Math.max(boost, 760);
        if (/drug_structure_function_axis|의약품 구조|작용기/.test(axisText)) boost = Math.max(boost, 610);
        if (/bio_molecular_interaction_axis|분자 상호작용|bio_molecule|생체 분자/.test(axisText)) boost = Math.max(boost, 420);
      }
      if (/화학 반응에서의 동적 평형/.test(concept) && hit("pH", "완충", "완충 용액", "산", "염기", "중화", "약물 안정성", "체액", "혈액 pH", "제형 안정성")) {
        if (/drug_ph_stability_axis|약물 pH|약물 안정성|pH·약물 안정성/.test(axisText)) boost = Math.max(boost, 780);
        if (/body_fluid_buffer_homeostasis_axis|체액 pH|완충 항상성/.test(axisText)) boost = Math.max(boost, 660);
        if (/dosage_concentration_quant_axis|투약 농도|농도·정량/.test(axisText)) boost = Math.max(boost, 520);
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost -= 300;
        if (/equilibrium_analysis_axis|평형 이동 해석 축|평형 이동/.test(axisText)) boost -= 120;
      }
      if (/물질의 양과 화학 반응식/.test(concept) && hit("몰", "몰 농도", "희석", "용액", "투약 농도", "정량 분석", "시료", "용량", "농도 계산")) {
        if (/dosage_concentration_quant_axis|투약 농도|농도·정량/.test(axisText)) boost = Math.max(boost, 780);
        if (/stoichiometry_axis|화학량론 해석 축|화학량론/.test(axisText)) boost = Math.max(boost, 430);
        if (/experiment_analysis_axis|실험 설계·분석 축|실험 설계|분석/.test(axisText)) boost = Math.max(boost, 350);
      }
    }

    if (kind === "nursing") {
      if (/탄소 화합물의 유용성/.test(concept) && hit("탄소 화합물", "의약품", "단백질", "아미노산", "탄수화물", "지질", "생체 분자", "생활 화학")) {
        if (/organic_structure_axis|유기 물질 구조 해석 축|유기 물질/.test(axisText)) boost = Math.max(boost, 380);
        if (/bio_material_application_axis|바이오·소재 응용 축|소재 응용|bio_molecule|생체 분자 구조/.test(axisText)) boost = Math.max(boost, 340);
        if (/health_nutrition_application_axis|건강·영양 응용 축|건강/.test(axisText)) boost = Math.max(boost, 250);
      }
      if (/화학 반응에서의 동적 평형/.test(concept) && hit("pH", "완충", "완충 용액", "산", "염기", "중화", "체액", "혈액 pH", "수질", "건강 지표", "농도")) {
        if (/body_fluid_buffer_homeostasis_axis|체액 pH·완충 항상성 축|체액 pH|완충 항상성/.test(axisText)) boost = Math.max(boost, 720);
        if (/acid_base_health_management_axis|산염기·건강 관리 축|산염기·건강|건강 관리/.test(axisText)) boost = Math.max(boost, 680);
        if (/health_ph_data_interpretation_axis|건강 지표·pH 데이터 해석 축|pH 데이터|건강 지표/.test(axisText)) boost = Math.max(boost, 620);
        if (/homeostasis_control_axis|항상성 조절 해석 축|항상성/.test(axisText)) boost = Math.max(boost, 560);
        if (/healthcare_decision_axis|건강 관리 의사결정 축/.test(axisText)) boost = Math.max(boost, 520);
        if (/acid_base_environment_axis|산염기·환경 조절 축|산염기|환경 조절/.test(axisText)) boost = Math.max(boost, 180);
        if (/equilibrium_analysis_axis|평형 이동 해석 축|평형 이동/.test(axisText)) boost -= 120;
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost -= 260;
      }
      if (/분자의 구조와 성질/.test(concept) && hit("분자 구조", "분자의 극성", "수소 결합", "분자 사이 힘", "용해도", "친수성", "소수성", "약물 흡수", "세포막", "생체 분자")) {
        if (/bio_molecular_interaction_axis|분자 상호작용·용해|분자 상호작용|bio_molecule|생체 분자 구조/.test(axisText)) boost = Math.max(boost, 390);
        if (/bio_medical_transport_axis|의약·영양 전달 응용 축|의약|전달/.test(axisText)) boost = Math.max(boost, 310);
      }
      if (/물질의 양과 화학 반응식/.test(concept) && hit("몰", "몰 농도", "희석", "용액", "투약 농도", "정량 분석", "시료", "오차")) {
        if (/stoichiometry_axis|화학량론 해석 축|화학량론/.test(axisText)) boost = Math.max(boost, 300);
        if (/experiment_analysis_axis|실험 설계·분석 축|실험 설계|분석/.test(axisText)) boost = Math.max(boost, 290);
      }
    }

    if (kind === "chemistry") {
      if (/현대의 원자 모형과 전자 배치|원자의 구조|원소의 주기적 성질/.test(concept) && hit("에너지 준위", "오비탈", "전자 배치", "선 스펙트럼", "양자수", "이온화 에너지", "주기율표")) {
        if (/pure_chem_atom_electron_axis|원자 구조|전자 배치/.test(axisText)) boost = Math.max(boost, 820);
        if (/pure_chem_periodic_spectrum_axis|주기성|스펙트럼/.test(axisText)) boost = Math.max(boost, 690);
      }
      if (/화학 결합/.test(concept) && hit("원자가 전자", "공유 결합", "이온 결합", "전기음성도", "결합의 극성", "루이스", "전자쌍")) {
        if (/pure_chem_bond_structure_axis|결합 구조|전자쌍/.test(axisText)) boost = Math.max(boost, 820);
        if (/pure_chem_molecular_property_axis|분자 구조|물성/.test(axisText)) boost = Math.max(boost, 640);
      }
      if (/분자의 구조와 성질/.test(concept) && hit("분자 구조", "극성", "수소 결합", "분자 사이 힘", "끓는점", "용해도", "결합각")) {
        if (/pure_chem_molecular_property_axis|분자 구조|물성/.test(axisText)) boost = Math.max(boost, 820);
        if (/pure_chem_bond_structure_axis|결합 구조|전자쌍/.test(axisText)) boost = Math.max(boost, 560);
      }
      if (/물질의 양과 화학 반응식/.test(concept) && hit("몰", "화학식량", "분자량", "반응식", "계수비", "수율", "정량", "농도")) {
        if (/pure_chem_stoichiometry_quant_axis|정량|반응식/.test(axisText)) boost = Math.max(boost, 820);
      }
      if (/화학 반응에서의 동적 평형/.test(concept) && hit("동적 평형", "평형 이동", "pH", "산", "염기", "완충", "중화")) {
        if (/pure_chem_equilibrium_acidbase_axis|평형|산염기/.test(axisText)) boost = Math.max(boost, 820);
      }
      if (/화학 반응과 열의 출입/.test(concept) && hit("산화", "환원", "전자 이동", "전지", "반응열", "발열", "흡열", "엔탈피")) {
        if (/pure_chem_thermo_redox_axis|산화환원|열화학/.test(axisText)) boost = Math.max(boost, 820);
      }
      if (/탄소 화합물의 유용성/.test(concept) && hit("탄소 화합물", "작용기", "고분자", "유기", "분자 구조")) {
        if (/pure_chem_organic_structure_axis|유기 구조|작용기/.test(axisText)) boost = Math.max(boost, 780);
      }
    }

    if (/물질의 양과 화학 반응식/.test(concept)) {
      if (hit("몰", "몰 질량", "화학식량", "원자량", "분자량", "화학 반응식", "계수비", "입자 수", "비율")) {
        if (/stoichiometry_axis|화학량론 해석 축|화학량론/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 390 : 330);
        if (/process_calculation_axis|공정 계산 응용 축|공정 계산/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 310 : 170);
      }
      if (hit("수율", "생산량", "시약", "공정", "효율", "농도", "희석", "용액")) {
        if (/process_calculation_axis|공정 계산 응용 축|공정 계산/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 440 : 230);
        if (/stoichiometry_axis|화학량론 해석 축|화학량론/.test(axisText)) boost = Math.max(boost, 270);
      }
      if (hit("실험", "오차", "데이터", "비교", "그래프")) {
        if (/experiment_analysis_axis|실험 설계·분석 축|실험 설계|분석/.test(axisText)) boost = Math.max(boost, 240);
      }
    }

    if (/화학 반응에서의 동적 평형/.test(concept)) {
      if (hit("동적 평형", "가역 반응", "정반응", "역반응", "평형", "농도", "압력", "온도")) {
        if (/equilibrium_analysis_axis|평형 이동 해석 축|평형 이동/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 390 : (kind === "nursing" ? 95 : 330));
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 330 : (kind === "nursing" ? 0 : 170));
      }
      if (hit("산", "염기", "pH", "중화", "지시약", "수질", "토양", "체액", "완충")) {
        if (/acid_base_environment_axis|산염기·환경 조절 축|산염기|환경 조절/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 380 : (kind === "nursing" ? 150 : 330));
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 240 : (kind === "nursing" ? 0 : 120));
      }
      if (hit("수율", "생산", "공정", "최적화")) {
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 440 : (kind === "nursing" ? 0 : 220));
      }
      if (kind === "nursing") {
        if (/process_optimization_axis|공정 최적화 축|공정 최적화/.test(axisText)) boost -= 300;
        if (/equilibrium_analysis_axis|평형 이동 해석 축|평형 이동/.test(axisText) && hit("pH", "완충", "완충 용액", "산", "염기", "중화", "체액", "혈액 pH", "수질", "건강 지표")) boost -= 180;
        if (/acid_base_environment_axis|산염기·환경 조절 축|환경 조절/.test(axisText) && hit("체액", "혈액 pH", "완충", "완충 용액", "건강 지표")) boost -= 90;
      }
    }

    if (/화학 반응과 열의 출입/.test(concept)) {
      if (hit("산화", "환원", "산화수", "전자 이동", "전지", "배터리", "전극", "충전", "방전")) {
        if (/electrochemistry_battery_axis|전기화학·배터리 기초 축|전기화학|배터리/.test(axisText)) boost = Math.max(boost, (kind === "energy" || kind === "chemical_engineering") ? 450 : 330);
      }
      if (hit("발열 반응", "흡열 반응", "중화 반응", "반응 엔탈피", "열량", "에너지", "온도 변화", "흡수")) {
        if (/thermochemistry_axis|열화학·반응 에너지 축|열화학|반응 에너지/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 410 : 340);
        if (/energy_safety_axis|에너지·안전 판단 축|에너지|안전/.test(axisText)) boost = Math.max(boost, kind === "energy" ? 260 : 180);
      }
      if (hit("연소", "안전", "폭발", "효율", "연료")) {
        if (/energy_safety_axis|에너지·안전 판단 축|에너지|안전/.test(axisText)) boost = Math.max(boost, 330);
      }
    }

    if (/탄소 화합물의 유용성/.test(concept)) {
      if (hit("고분자", "플라스틱", "의약품", "탄소 화합물", "공유 결합", "분자 구조")) {
        if (/organic_structure_axis|유기 물질 구조 해석 축|유기 물질/.test(axisText)) boost = Math.max(boost, 330);
        if (/bio_material_application_axis|바이오·소재 응용 축|소재 응용/.test(axisText)) boost = Math.max(boost, kind === "chemical_engineering" ? 270 : 190);
      }
    }

    return boost;
  }

  function getPhysics1PreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = isPhysicsComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|반도체|전자|전기|통신|네트워크|센서|임베디드|하드웨어|로봇|자율주행|그래픽|게임)/i.test(majorText) || bucket === "it" || bucket === "electronic";
    const isMechanical = isMechanicalEngineeringMajorSelectedContext() || /(기계공학과|기계|자동차|모빌리티|항공|로봇|메카트로닉스|열유체|냉동공조)/.test(majorText) || bucket === "mechanical";
    // v88.7 C2-lock: 기계공학과 + 물리는 전자/IT형 키워드보다
    // 힘·운동·열·진동·시뮬레이션 키워드를 우선 노출한다.
    if (isMechanical) {
      if (/힘과 운동/.test(concept)) return ["속도", "가속도", "운동 그래프 해석", "뉴턴 운동 법칙", "힘", "운동량", "충격량", "힘의 평형", "토크", "제어", "시뮬레이션", "기계 시스템"];
      if (/에너지와 열/.test(concept)) return ["열효율", "열기관", "냉각", "열 관리", "열전달", "마찰열", "에너지 전환", "일", "운동 에너지", "내부 에너지", "시스템 효율", "엔진"];
      if (/파동의 성질과 활용/.test(concept)) return ["진동", "공진", "감쇠", "소음", "주파수", "파장", "파동의 속력", "센서", "신호", "스펙트럼", "진동 제어", "기계 진동"];
    }
    if (isIt) {
      if (/물질의 전기적 특성/.test(concept)) return ["전하", "전기력", "원자 구조", "스펙트럼", "전자", "전기장", "반도체", "소자", "회로", "센서 신호"];
      if (/파동의 성질과 활용/.test(concept)) return ["진동수", "파장", "파동의 속력", "파동", "주파수", "신호", "통신", "대역폭", "데이터 전송", "간섭"];
      if (/물질의 자기적 특성/.test(concept)) return ["전류", "자기장", "전자석", "자성", "코일", "모터", "제어", "저장장치", "전류-자기장 관계"];
      if (/빛과 물질의 이중성/.test(concept)) return ["광전 효과", "광자", "빛의 입자설", "빛의 파동설", "센서", "광센서", "양자", "반도체 소자"];
      if (/힘과 운동/.test(concept)) return ["속도", "가속도", "운동 그래프 해석", "뉴턴 운동 법칙", "운동량", "충격량", "시뮬레이션", "제어"];
      if (/에너지와 열/.test(concept)) return ["일", "운동 에너지", "역학적 에너지 보존", "열효율", "에너지 전환", "열 관리", "냉각", "시스템 효율"];
      if (/시간과 공간/.test(concept)) return ["시간 지연", "광속 불변", "동시성 불일치", "정밀 시간", "GPS", "동기화", "상대성 원리"];
    }
    return [];
  }

  function getGeometryPreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    const bucket = detectCareerBucket(majorText);
    const concept = state.concept || "";
    const isIt = isGeometryComputerMajorContext() || /(컴퓨터|소프트웨어|AI|인공지능|데이터|정보|보안|프로그래밍|알고리즘|시뮬레이션|모델링|게임|그래픽|그래픽스|공간정보|로봇|자율주행|메타버스|영상|비전)/i.test(majorText) || bucket === "it";
    if (isIt) {
      if (/벡터의 성분과 내적/.test(concept)) return ["내적", "성분", "좌표", "벡터의 크기", "각", "방향 유사도", "코사인 유사도", "투영", "정규화", "거리"];
      if (/공간좌표와 구의 방정식/.test(concept)) return ["공간좌표", "3차원 좌표", "구의 방정식", "중심", "반지름", "거리", "위치 추적", "충돌 판정", "그래픽스", "공간 데이터"];
      if (/이차곡선과 자취 해석/.test(concept)) return ["쌍곡선", "위치 추정", "신호", "포물선", "타원", "초점", "자취", "거리 조건", "반사 성질", "궤도"];
      if (/평면벡터와 벡터의 연산/.test(concept)) return ["벡터", "벡터의 덧셈", "벡터의 뺄셈", "실수배", "위치벡터", "방향", "크기", "이동", "경로", "합성"];
      if (/공간도형과 정사영·위치 관계/.test(concept)) return ["정사영", "투영", "직선과 평면", "수직", "평행", "거리", "입체도형", "평면 결정", "3D 모델링", "구조 해석"];
    }
    const isMechanical = isMechanicalEngineeringMajorSelectedContext() || /(기계공학과|기계|자동차|모빌리티|항공|로봇|메카트로닉스|구조|설계)/.test(majorText) || bucket === "mechanical";
    // v88.7 C2-lock: 기계계열 기하는 벡터·힘 분해·구조 모델링 키워드를 우선 노출한다.
    if (isMechanical) {
      if (/평면벡터와 벡터의 연산/.test(concept)) return ["벡터", "벡터의 합성", "벡터의 분해", "힘의 합성", "힘의 분해", "방향", "크기", "이동", "경로", "기계 운동"];
      if (/벡터의 성분과 내적/.test(concept)) return ["성분", "내적", "방향", "각", "힘의 분해", "일", "투영", "벡터의 크기", "구조 해석", "운동 모델링"];
      if (/공간도형과 정사영·위치 관계/.test(concept)) return ["정사영", "투영", "직선과 평면", "수직", "평행", "거리", "입체도형", "3D 모델링", "구조 해석", "설계 조건"];
    }
    return [];
  }

  function getIntegratedScience1PreferredKeywordSequence() {
    const majorText = [state.career || "", state.majorSelectedName || "", getEffectiveCareerName() || "", getCareerInputText() || "", getMajorPanelResolvedName() || "", getMajorTextBag()].join(" ").trim();
    if (!/(반도체|반도체공학|소자|칩|웨이퍼|도핑|집적회로|파운드리|공정|밴드갭)/.test(majorText)) return [];
    const concept = state.concept || "";
    if (/물질 구성과 분류/.test(concept)) {
      return ["반도체", "도핑", "전기 전도성", "재료 성질", "원소", "금속", "비금속", "분류 기준", "구조와 성질의 관계"];
    }
    if (/규칙성 발견과 주기율표/.test(concept)) {
      return ["반도체", "원소 배열", "성질 예측", "주기성", "원자 번호", "재료공학", "소자", "밴드갭", "예측 모델"];
    }
    if (/기본량과 단위/.test(concept)) {
      return ["전류", "전압", "전기 전도성", "측정 표준", "단위 환산", "공학 계산", "반도체", "측정 기준"];
    }
    if (/과학의 측정과 우리 사회/.test(concept)) {
      return ["반도체", "센서", "측정값 비교", "디지털 데이터", "공정 조건", "오차 기준", "측정 표준"];
    }
    return ["반도체", "소자", "도핑", "전기 전도성", "재료 성질", "공정 조건"];
  }

  function getPreferredKeywordSequence() {
    if (state.subject === "통합과학1") {
      const isci1Preferred = getIntegratedScience1PreferredKeywordSequence();
      if (isci1Preferred.length) return isci1Preferred;
    }
    if (isEarthSystemScienceSubject()) {
      const earthSystemPreferred = getEarthSystemSciencePreferredKeywordSequence();
      if (earthSystemPreferred.length) return earthSystemPreferred;
    }
    if (isCellMetabolismSubject()) {
      const cellPreferred = getCellMetabolismPreferredKeywordSequence();
      if (cellPreferred.length) return cellPreferred;
    }
    if (isMatterEnergySubject()) {
      const matterPreferred = getMatterEnergyPreferredKeywordSequence();
      if (matterPreferred.length) return matterPreferred;
    }
    if (isElectromagnetismQuantumSubject()) {
      const eqPreferred = getElectromagnetismQuantumPreferredKeywordSequence();
      if (eqPreferred.length) return eqPreferred;
    }
    if (state.subject === "역학과 에너지" || state.subject === "역학과에너지") {
      const mechanicsPreferred = getMechanicsEnergyPreferredKeywordSequence();
      if (mechanicsPreferred.length) return mechanicsPreferred;
    }
    if (state.subject === "지구과학" || state.subject === "지구과학Ⅰ" || state.subject === "지구과학1") {
      const earthPreferred = getEarthSciencePreferredKeywordSequence();
      if (earthPreferred.length) return earthPreferred;
    }
    if (state.subject === "생명과학" || state.subject === "생명과학Ⅰ" || state.subject === "생명과학1") {
      const lifePreferred = getLifeSciencePreferredKeywordSequence();
      if (lifePreferred.length) return lifePreferred;
    }
    if (state.subject === "물리" || state.subject === "물리학" || state.subject === "물리학Ⅰ") {
      const physicsPreferred = getPhysics1PreferredKeywordSequence();
      if (physicsPreferred.length) return physicsPreferred;
    }
    if (state.subject === "미적분1") {
      const calculusPreferred = getCalculus1PreferredKeywordSequence();
      if (calculusPreferred.length) return calculusPreferred;
    }
    if (state.subject === "기하") {
      const geometryPreferred = getGeometryPreferredKeywordSequence();
      if (geometryPreferred.length) return geometryPreferred;
    }
    if (state.subject === "대수") {
      const algebraPreferred = getAlgebraPreferredKeywordSequence();
      if (algebraPreferred.length) return algebraPreferred;
    }
    if (state.subject === "확률과 통계") {
      const psPreferred = getProbabilityStatisticsPreferredKeywordSequence();
      if (psPreferred.length) return psPreferred;
    }
    if (state.subject === "통합사회1" || state.subject === "통합사회") {
      const isoc1Preferred = getIntegratedSociety1PreferredKeywordSequence();
      if (isoc1Preferred.length) return isoc1Preferred;
    }
    if (state.subject === "통합사회2") {
      const isoc2Preferred = getIntegratedSociety2PreferredKeywordSequence();
      if (isoc2Preferred.length) return isoc2Preferred;
    }
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
    if (state.subject === "정보") {
      const infoPreferred = getInfoPreferredKeywordSequence();
      if (infoPreferred.length) return infoPreferred;
    }
    if (state.subject === "통합과학2") {
      const is2Preferred = getIntegratedScience2PreferredKeywordSequence();
      if (is2Preferred.length) return is2Preferred;
    }
    if (state.subject === "과학탐구실험1") {
      const si1Preferred = getScienceInquiry1PreferredKeywordSequence();
      if (si1Preferred.length) return si1Preferred;
    }
    if (state.subject === "과학탐구실험2") {
      const si2Preferred = getScienceInquiry2PreferredKeywordSequence();
      if (si2Preferred.length) return si2Preferred;
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
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|화공|고분자|금속|소재|세라믹|나노)/.test(text)) return "materials";
    if (/(기계|자동차|로봇|항공|모빌리티|메카트로닉스|조선|해양공학|제어|산업기계)/.test(text)) return "mechanical";
    if (/(전기|전자|회로|센서|통신|전파|임베디드|의공|의료기기|바이오메디컬)/.test(text)) return "electronic";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터|보안|정보|통계|게임|앱|웹|네트워크|빅데이터)/i.test(text)) return "it";
    if (/(도시공학|도시설계|도시계획|도시|건축|토목|공간|교통|인프라|주거|생활권|녹지|열섬|조경)/.test(text)) return "urban";
    if (/(생명공학과|생명공학|의생명공학|바이오공학|분자생명|유전공학|세포공학|생명과학과|바이오테크|바이오헬스)/.test(text)) return "bio";
    if (/(간호|의학|의예|치의|약학|보건|수의|생명|바이오|의료|임상|재활|물리치료|작업치료|언어치료|방사선|응급구조|제약|식품영양)/.test(text)) return "bio";
    if (/(환경|기후|지구|우주|천문|해양|지리|소방|방재|안전|재난)/.test(text)) return "env";
    if (/(경영|경제|회계|무역|마케팅|금융|창업|산업공학|산업경영|경영정보|MIS|행정|정책)/.test(text)) return "business";
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
      urban: "_default",
      env: "_default",
      business: "_default",
      default: "_default"
    };
    return map[bucket] || "_default";
  }

  function scoreConcept(concept, entry) {
    const career = getEffectiveCareerName() || state.career || "";
    const majorText = getMajorTextBag();
    const bucket = detectCareerBucket([career, majorText, state.majorSelectedName || ""].join(" "));
    const track = getResolvedTrackId() || "";
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
    const dataScienceForced = getDataScienceForcedConceptOrderForSubject();
    if (dataScienceForced.length) return pickConceptItemsByForcedOrder(ranked, dataScienceForced);
    const preferred = getPreferredConceptSequence();
    const preferredItems = preferred.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
    const others = ranked.filter(item => !preferred.includes(item.concept));
    return uniq([...preferredItems, ...others]);
  }

  function getPrimaryConcepts(ranked) {
    if (!Array.isArray(ranked) || !ranked.length) return [];
    const preferred = getPreferredConceptSequence();

    // v89.3 F2-lock: 통합과학2 환경공학/도시·토목·건축 대표 3개 최종 고정.
    // 점수 계산에서 생태/바이오 키워드가 강하게 잡혀도 화면 최종 3개는 검수 기준을 따른다.
    const f2PrimarySubject = String(state.subject || "").replace(/\s+/g, "");
    if (/^(통합과학2|통합과학Ⅱ|통합과학II)$/.test(f2PrimarySubject)) {
      const f2PrimaryMajorText = [
        state.career || "",
        state.majorSelectedName || "",
        getEffectiveCareerName() || "",
        getCareerInputText() || "",
        getMajorPanelResolvedName() || "",
        getMajorTextBag() || ""
      ].join(" ").trim();
      const f2PrimaryIsUrban = /(도시공학과|도시공학|도시계획|도시설계|건축공학|건축|토목공학|토목|건설환경|토목환경|교통공학|교통|인프라|주거|조경|공간정보)/.test(f2PrimaryMajorText);
      const f2PrimaryIsEnv = /(환경공학과|환경공학|환경과학|환경생태|기후환경|지구환경|탄소중립|수질|대기|폐기물|환경보건|생태공학)/.test(f2PrimaryMajorText);
      const f2PrimaryIsSafety = /(안전공학과|안전공학|재난안전|방재|소방|위험도|방재공학)/.test(f2PrimaryMajorText);
      let forced = [];
      if (f2PrimaryIsUrban) {
        forced = ["지구 환경 변화와 인간 생활", "에너지 효율과 신재생 에너지", "과학 기술과 미래 사회"];
      } else if (f2PrimaryIsEnv) {
        forced = ["지구 환경 변화와 인간 생활", "생물과 환경", "생태계평형"];
      } else if (f2PrimaryIsSafety) {
        forced = ["지구 환경 변화와 인간 생활", "과학 기술과 미래 사회", "과학 관련 사회적 쟁점과 과학 윤리"];
      }
      if (forced.length) {
        const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
        const others = ranked.filter(item => !forced.includes(item.concept));
        return uniq([...forcedItems, ...others]).slice(0, 3);
      }
    }

    // v89.8 EL1-lock: 전자공학/전기전자/통신 계열 대표 3개 최종 고정.
    // 반도체/컴퓨터형 가드에 끌리지 않도록 실제 선택 학과가 전자계열일 때만 적용한다.
    if (isElectronicsEngineeringSelectedContext() && (state.subject === "물리" || state.subject === "물리학" || state.subject === "물리학Ⅰ" || state.subject === "물리학1")) {
      return pickForcedConceptItems(ranked, ["물질의 전기적 특성", "물질의 자기적 특성", "파동의 성질과 활용"]);
    }

    if (isElectronicsEngineeringSelectedContext() && isElectromagnetismQuantumSubject()) {
      return pickForcedConceptItems(ranked, ["전자기 유도와 전자기파", "전기장과 자기장", "양자와 물질의 상호작용"]);
    }

    if (isElectronicsEngineeringSelectedContext() && state.subject === "정보") {
      return pickForcedConceptItems(ranked, ["컴퓨팅 시스템과 네트워크", "프로그래밍과 자동화", "자료와 정보의 표현"]);
    }

    // v88.6 C1-lock: 기계공학과 대표 검수용 고급 선택과목 3개 노출.
    // 1학년 이후 과목은 화면 점수 필터가 다른 계열 키워드에 끌리는 경우가 있어,
    // 실제 존재하는 개념명만 선제 고정한다.
    if (isMechanicalEngineeringMajorSelectedContext() && (state.subject === "물리" || state.subject === "물리학" || state.subject === "물리학Ⅰ" || state.subject === "물리학1")) {
      const forced = ["힘과 운동", "에너지와 열", "파동의 성질과 활용"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (isMechanicalEngineeringMajorSelectedContext() && (state.subject === "기하" || state.subject === "고등 기하")) {
      const forced = ["평면벡터와 벡터의 연산", "벡터의 성분과 내적", "공간도형과 정사영·위치 관계"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (isMechanicalEngineeringMajorSelectedContext() && (state.subject === "미적분1" || state.subject === "미적분Ⅰ" || state.subject === "미적분")) {
      const forced = ["도함수의 활용", "여러 가지 함수의 미분", "정적분의 활용"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    // v87 M2-lock: 신소재공학과 대표 검수용 강제 3개 노출.
    // 기존 점수 필터가 먼저 적용되면 물질과 에너지/전자기와 양자의 핵심 개념이 화면에 안 뜨는 경우가 있어,
    // 실제 존재하는 3개 개념만 순서 고정하고 나머지 구조는 그대로 둔다.
    if (isMaterialsMajorSelectedContext() && isMatterEnergySubject()) {
      const forced = ["액체의 물성과 분자 간 힘", "기체 상태와 법칙", "혼합 기체와 조성"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (isMaterialsMajorSelectedContext() && isElectromagnetismQuantumSubject()) {
      const forced = ["양자와 물질의 상호작용", "전기장과 자기장", "전자기 유도와 전자기파"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "통합사회1" || state.subject === "통합사회") && isIntegratedSociety1ComputerMajorContext()) {
      const forced = [
        "생활 공간 변화와 지역 이해",
        "시장 경제와 금융 생활",
        "미래와 지속 가능한 삶"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "통합사회2" && isIntegratedSociety1ComputerMajorContext()) {
      const forced = [
        "미래와 지속가능한 삶",
        "시장경제와 지속가능발전",
        "인권 보장과 헌법"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "미적분1" && !isDataScienceMajorSelectedContext() && isCalculus1ComputerMajorContext()) {
      const forced = [
        "도함수의 활용",
        "여러 가지 함수의 미분",
        "수열의 극한"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "대수" && !isDataScienceMajorSelectedContext() && isAlgebraComputerMajorContext()) {
      const forced = [
        "지수함수와 로그함수의 활용",
        "등차수열과 등비수열",
        "수학적 귀납법"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }


    // v88.9 D2-lock: 데이터사이언스/통계학과는 컴퓨터공학형 순열·조합 우선 가드보다
    // 분포·정규분포·추정 중심 대표 개념 3개가 최종 화면에서 먼저 이기도록 고정한다.
    const dataScienceForced = getDataScienceForcedConceptOrderForSubject();
    if (dataScienceForced.length) {
      return pickConceptItemsByForcedOrder(ranked, dataScienceForced).slice(0, 3);
    }

    
if (state.subject === "확률과 통계" && !isDataScienceMajorSelectedContext() && isProbabilityStatisticsComputerMajorContext()) {
      const forced = [
        "순열과 조합",
        "조건부확률과 사건의 독립",
        "확률변수와 확률분포"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }


    if (state.subject === "과학탐구실험2" && isScienceInquiry2ComputerMajorContext()) {
      const forced = [
        "첨단 센서와 디지털 정보 탐구",
        "생활 자료를 활용한 과학적 의사결정 탐구",
        "첨단 과학 기술의 사회 적용 탐구"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }




    // v90.0 Q2-lock: 화학과 + 화학 대표 3개 최종 고정.
    // 화면의 교과어(전자, 소재, 공정 등)에 끌려 전자배치형/소재형 순서로 바뀌는 것을 차단한다.
    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && getChemistry1MajorKind() === "chemistry") {
      const forced = [
        "화학 결합",
        "원소의 주기적 성질",
        "분자의 구조와 성질"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && getChemistry1MajorKind() === "bioengineering") {
      const forced = [
        "탄소 화합물의 유용성",
        "분자의 구조와 성질",
        "화학 반응에서의 동적 평형"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && getChemistry1MajorKind() === "nursing") {
      const forced = [
        "탄소 화합물의 유용성",
        "화학 반응에서의 동적 평형",
        "분자의 구조와 성질"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && getChemistry1MajorKind() === "chemical_engineering") {
      const forced = [
        "물질의 양과 화학 반응식",
        "화학 반응과 열의 출입",
        "화학 반응에서의 동적 평형"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && getChemistry1MajorKind() === "energy") {
      const forced = [
        "화학 반응과 열의 출입",
        "물질의 양과 화학 반응식",
        "화학 반응에서의 동적 평형"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (isMatterEnergySubject() && getMatterEnergyMajorKind() === "chemical_engineering") {
      const forced = ["기체 상태와 법칙", "혼합 기체와 조성", "액체의 물성과 분자 간 힘"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (isMatterEnergySubject() && getMatterEnergyMajorKind() === "energy") {
      const forced = ["기체 상태와 법칙", "혼합 기체와 조성", "액체의 물성과 분자 간 힘"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (isCellMetabolismSubject() && getCellMetabolismMajorKind() === "medical") {
      const forced = ["세포의 구조와 물질 이동", "효소와 대사 반응", "광합성과 세포 호흡"];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && isMaterialsMajorSelectedContext()) {
      const forced = [
        "화학 결합",
        "원소의 주기적 성질",
        "분자의 구조와 성질"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if ((state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") && isChemistry1ComputerMajorContext()) {
      const forced = [
        "현대의 원자 모형과 전자 배치",
        "원소의 주기적 성질",
        "화학 결합"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "기하" && isGeometryComputerMajorContext()) {
      const forced = [
        "벡터의 성분과 내적",
        "공간좌표와 구의 방정식",
        "이차곡선과 자취 해석"
      ];
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "지구과학" || state.subject === "지구과학Ⅰ" || state.subject === "지구과학1") {
      const forced = getEarthSciencePreferredConceptSequence().slice(0, 3);
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "생명과학" || state.subject === "생명과학Ⅰ" || state.subject === "생명과학1") {
      const forced = getLifeSciencePreferredConceptSequence().slice(0, 3);
      const forcedItems = forced.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      const others = ranked.filter(item => !forced.includes(item.concept));
      return uniq([...forcedItems, ...others]).slice(0, 3);
    }

    if (state.subject === "통합사회1" || state.subject === "통합사회" || state.subject === "통합사회2" || state.subject === "통합과학1" || state.subject === "통합과학2" || state.subject === "과학탐구실험1" || state.subject === "과학탐구실험2" || state.subject === "공통수학1" || state.subject === "공통수학2" || state.subject === "정보" || state.subject === "공통국어1" || state.subject === "공통국어" || state.subject === "공통국어2" || state.subject === "대수" || state.subject === "확률과 통계" || state.subject === "미적분1" || state.subject === "기하" || state.subject === "생명과학" || state.subject === "생명과학Ⅰ" || state.subject === "생명과학1" || state.subject === "화학" || state.subject === "화학Ⅰ" || state.subject === "화학1") {
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
    const entry = getEngineSubjectEntry(state.subject);
    const concepts = entry?.concepts || {};
    if (concepts[state.concept]) return concepts[state.concept];
    const matchedKey = Object.keys(concepts).find(key => fuzzyIncludes(key, state.concept));
    return matchedKey ? concepts[matchedKey] : null;
  }

  function getKeywordList(entry) {
    let base = uniq([...(entry?.micro_keywords || []), ...(entry?.core_concepts || [])]);
    const preferred = getPreferredKeywordSequence();
    // v69: 통합과학1 + 반도체 계열에서는 원본 교과 키워드에 "반도체"가 없어도
    // 검수 흐름상 반도체 키워드를 선택할 수 있어야 한다.
    // 단, 전체 과목 데이터에 주입하지 않고 현재 선택 개념·학과 맥락에서만 보강한다.
    if (state.subject === "통합과학1" && preferred.length && /(반도체|소자|도핑|전기 전도성|밴드갭)/.test(preferred.join(" "))) {
      base = uniq([...preferred, ...base]);
    }
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


  function syncKeywordActiveButtons() {
    try {
      document.querySelectorAll(".engine-chip[data-action='keyword']").forEach(btn => {
        const value = btn.getAttribute("data-value") || "";
        btn.classList.toggle("is-active", value === state.keyword);
      });
    } catch (error) {}
  }

  function renderAfterKeywordSelectionFast() {
    // v33.40 performance fix: keyword clicks only need 4~8 downstream refresh, not full 3번 concept-grid rebuild.
    renderStatus();
    syncKeywordActiveButtons();
    renderTrackArea();
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
    const effectiveCareerName = getEffectiveCareerName();
    const displayCareerName = inferDisplayMajorName(effectiveCareerName || state.career || state.majorSelectedName || "");
    if (!state.career && effectiveCareerName) state.career = effectiveCareerName;
    if (subjectEl) subjectEl.textContent = state.subject || "선택 전";
    if (careerEl) careerEl.textContent = (effectiveCareerName || state.career || state.majorSelectedName) ? displayCareerName : "입력 전";

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
    const displayCareerName = inferDisplayMajorName(state.career || state.majorSelectedName || getPrimaryMajorRoutingText());
    const guide = state.career
      ? `먼저 <strong>${escapeHtml(state.concept || '현재 교과 개념')}</strong>이 어디로 이어지는지 보고, <strong>${escapeHtml(displayCareerName)}</strong> 입력은 그 축의 우선순위만 조정합니다.`
      : `지금은 <strong>${escapeHtml(state.concept || '현재 교과 개념')}</strong>에서 갈 수 있는 종단 연결을 먼저 펼쳐 보여줍니다. 학과를 입력하면 이 축들의 우선순위가 바뀝니다.`;
    el.innerHTML = `
      <div class="engine-help">${guide}</div>
      ${autoHint ? `<div class="engine-help" style="margin-top:8px; color:#275fe8; font-weight:700;">${escapeHtml(autoHint)}</div>` : ''}
      <div class="engine-track-grid">${options.map((item, index) => `
        <button type="button" class="engine-track-card ${state.linkTrack === item.id ? "is-active" : ""}" data-track="${escapeHtml(item.id)}">
          <div class="engine-track-top">
            <div class="engine-track-title">${escapeHtml(item.title)} ${item.relationLabel ? `<span class="engine-mini-tag" style="margin-left:6px;">${escapeHtml(item.relationLabel)}</span>` : ''}</div>
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
    let primaryConcepts = getPrimaryConcepts(ranked);
    let displayConcepts = getDisplayConcepts(ranked);
    if ((state.subject === "생명과학" || state.subject === "생명과학Ⅰ" || state.subject === "생명과학1") && !state.showAllConcepts) {
      const forcedLife = getLifeSciencePreferredConceptSequence().slice(0, 3);
      const forcedItems = forcedLife.map(name => ranked.find(item => item.concept === name)).filter(Boolean);
      if (forcedItems.length) {
        const others = ranked.filter(item => !forcedLife.includes(item.concept));
        primaryConcepts = uniq([...forcedItems, ...others]).slice(0, 3);
        displayConcepts = primaryConcepts;
      }
    }
    if (isDataScienceMajorSelectedContext() && !state.showAllConcepts) {
      const forcedDataScience = getDataScienceForcedConceptOrderForSubject();
      if (forcedDataScience.length) {
        primaryConcepts = pickConceptItemsByForcedOrder(ranked, forcedDataScience).slice(0, 3);
        displayConcepts = primaryConcepts;
      }
    }
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
      if (!state.concept || !state.keyword) {
        el.innerHTML = `<div class="engine-empty">먼저 3번 교과 개념과 추천 키워드를 선택해야 도서 추천이 열립니다.</div>`;
      } else if (!state.linkTrack) {
        el.innerHTML = `<div class="engine-empty">먼저 4번 후속 연계축을 선택해야 5번 도서 추천이 열립니다.</div>`;
      } else {
        el.innerHTML = `<div class="engine-empty">도서 추천을 준비 중입니다.</div>`;
      }
      return;
    }
    if (!window.renderBookSelectionHTML) {
      el.innerHTML = `<div class="engine-empty">210권 도서 추천 기능을 불러오는 중입니다.</div>`;
      return;
    }
    const trackMeta = getTrackMeta(state.linkTrack) || {};
    el.innerHTML = window.renderBookSelectionHTML({
      subject: state.subject,
      career: state.career || state.majorSelectedName || ($("career")?.value || ""),
      selectedMajor: state.majorSelectedName || state.career || ($("career")?.value || ""),
      linkTrack: getResolvedTrackId() || state.linkTrack,
      followupAxisId: state.linkTrack,
      axisLabel: trackMeta.title || trackMeta.label || state.linkTrack,
      axisDomain: trackMeta.axisDomain || trackMeta.axis_domain || "",
      linkedSubjects: trackMeta.linkedSubjects || trackMeta.linked_subjects || [],
      activityExample: (trackMeta.activityExamples || [])[0] || "",
      longitudinalPath: trackMeta.recordContinuityPoint || "",
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
      performanceFix: 'major-search-debounce-v33.20',
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
