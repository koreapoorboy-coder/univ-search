/* book_recommendation_adapter.js
 * 210권 도서 추천 어댑터 v2.2 BOOK-A guard
 *
 * 원칙:
 * - 책 추천이 아니라 보고서 근거 도서 선택 엔진으로 작동한다.
 * - 1차 전공군 필터 → 2차 도서 도메인 필터 → 3차 보고서 역할 적합성 → 4차 키워드/후속축 보조 점수
 * - MINI에 selectedBookContext 형태로 "왜/어디에/어떻게" 쓸지 넘긴다.
 */
(function(global){
  "use strict";

  const ADAPTER_VERSION = "v2.4-axis-id-hard-split";
  const MASTER_FILE = "book_source_master_210.json";
  const RULE_FILE = "book_recommendation_rules_v22.json";
  global.BOOK_ADAPTER_VERSION = ADAPTER_VERSION;

  const FALLBACK_RULES = {
    "version": "book-report-role-rules-v22-book-a-guard",
    "createdAt": "2026-05-05T10:30:00",
    "principle": "도서 추천은 단어 매칭이 아니라 보고서 내 역할 기반으로 분류한다.",
    "majorGroups": {
      "engineering_information": {
        "patterns": [
          "컴퓨터",
          "소프트웨어",
          "정보",
          "데이터",
          "인공지능",
          "AI",
          "통계",
          "산업공학"
        ],
        "directDomains": [
          "engineering_information",
          "engineering_data",
          "engineering_physics_math",
          "science_method"
        ],
        "expansionDomains": [
          "science_history",
          "science_philosophy",
          "environment_social",
          "environment_energy"
        ],
        "excludedDomains": [
          "medical_life",
          "medical_health",
          "social_business",
          "social_policy",
          "humanities_literature",
          "arts_culture"
        ]
      },
      "engineering_semiconductor": {
        "patterns": [
          "반도체",
          "전자",
          "전기",
          "신소재",
          "재료",
          "기계",
          "로봇",
          "공학"
        ],
        "directDomains": [
          "engineering_semiconductor",
          "engineering_physics_math",
          "engineering_data",
          "science_method",
          "environment_energy"
        ],
        "expansionDomains": [
          "science_history",
          "science_philosophy"
        ],
        "excludedDomains": [
          "medical_life",
          "medical_health",
          "social_business",
          "social_policy",
          "humanities_literature",
          "arts_culture"
        ]
      },
      "environment_energy": {
        "patterns": [
          "환경",
          "에너지",
          "기후",
          "도시",
          "지구"
        ],
        "directDomains": [
          "environment_energy",
          "environment_social",
          "engineering_data",
          "science_method",
          "engineering_physics_math"
        ],
        "expansionDomains": [
          "science_history",
          "science_philosophy",
          "social_policy"
        ],
        "excludedDomains": [
          "medical_health",
          "humanities_literature",
          "arts_culture"
        ]
      },
      "medical_life": {
        "patterns": [
          "의학",
          "의예",
          "간호",
          "보건",
          "약학",
          "생명",
          "생명공학",
          "수의",
          "치의"
        ],
        "directDomains": [
          "medical_life",
          "medical_health",
          "bio_science",
          "science_method"
        ],
        "expansionDomains": [
          "science_philosophy",
          "engineering_data",
          "social_policy"
        ],
        "excludedDomains": [
          "social_business",
          "humanities_literature",
          "arts_culture"
        ]
      },
      "social_business": {
        "patterns": [
          "경영",
          "경제",
          "사회",
          "정치",
          "법",
          "행정",
          "교육",
          "심리"
        ],
        "directDomains": [
          "social_business",
          "social_policy",
          "humanities_social",
          "science_philosophy"
        ],
        "expansionDomains": [
          "engineering_data",
          "environment_social"
        ],
        "excludedDomains": [
          "medical_health"
        ]
      },
      "humanities": {
        "patterns": [
          "국문",
          "문학",
          "사학",
          "역사",
          "철학",
          "윤리",
          "문화",
          "예술"
        ],
        "directDomains": [
          "humanities_literature",
          "humanities_social",
          "arts_culture",
          "science_philosophy"
        ],
        "expansionDomains": [
          "social_policy",
          "science_history"
        ],
        "excludedDomains": []
      }
    },
    "domainOverrideByTitle": {
      "닥터스 씽킹": {
        "domains": [
          "medical_health",
          "medical_life"
        ],
        "bestFor": [
          "의학계열",
          "간호보건계열",
          "생명과학계열"
        ],
        "avoidDirectFor": [
          "engineering_information",
          "engineering_semiconductor"
        ],
        "expansionOnlyIf": [
          "진단",
          "의료 AI",
          "의사결정 오류",
          "판단 편향",
          "의료 데이터"
        ],
        "doNotUseAs": "컴퓨터공학·반도체공학의 기술/측정/모델링 직접 근거 도서로 사용하지 않는다."
      },
      "위대하고 위험한 약 이야기": {
        "domains": [
          "medical_life",
          "medical_health",
          "bio_science"
        ],
        "bestFor": [
          "약학계열",
          "생명과학계열",
          "의학계열"
        ],
        "avoidDirectFor": [
          "engineering_information",
          "engineering_semiconductor"
        ],
        "expansionOnlyIf": [
          "약물",
          "신약",
          "의료 데이터",
          "생명 윤리"
        ],
        "doNotUseAs": "컴퓨터공학·반도체공학의 직접 도서로 사용하지 않는다."
      },
      "부분과 전체": {
        "domains": [
          "engineering_physics_math",
          "science_method",
          "science_philosophy"
        ],
        "bestFor": [
          "물리학",
          "공학계열",
          "수학·데이터 계열"
        ],
        "reportRoles": [
          "conceptExplanation",
          "analysisFrame",
          "limitationDiscussion"
        ],
        "triggers": [
          "측정",
          "관찰",
          "물리",
          "시스템",
          "모델링",
          "과학의 측정"
        ]
      },
      "객관성의 칼날": {
        "domains": [
          "science_method",
          "science_history",
          "science_philosophy"
        ],
        "bestFor": [
          "자연과학",
          "공학계열",
          "사회과학 방법론"
        ],
        "reportRoles": [
          "analysisFrame",
          "comparisonFrame",
          "limitationDiscussion"
        ],
        "triggers": [
          "측정",
          "객관성",
          "표준",
          "과학사",
          "과학적 판단"
        ]
      },
      "엔트로피": {
        "domains": [
          "environment_energy",
          "engineering_physics_math"
        ],
        "bestFor": [
          "환경공학",
          "에너지공학",
          "물리학"
        ],
        "reportRoles": [
          "conceptExplanation",
          "analysisFrame",
          "conclusionExpansion"
        ],
        "triggers": [
          "에너지",
          "열역학",
          "시스템",
          "환경",
          "지속가능성"
        ],
        "avoidDirectFor": [
          "engineering_information"
        ]
      },
      "혼돈으로부터의 질서": {
        "domains": [
          "engineering_physics_math",
          "science_method"
        ],
        "bestFor": [
          "수학",
          "물리학",
          "컴퓨터공학",
          "데이터과학"
        ],
        "reportRoles": [
          "analysisFrame",
          "limitationDiscussion"
        ],
        "triggers": [
          "혼돈",
          "카오스",
          "모델링",
          "시스템",
          "예측"
        ]
      },
      "페르마의 마지막 정리": {
        "domains": [
          "engineering_physics_math"
        ],
        "bestFor": [
          "수학",
          "컴퓨터공학",
          "데이터과학"
        ],
        "reportRoles": [
          "analysisFrame",
          "conceptExplanation"
        ],
        "triggers": [
          "수리",
          "수학",
          "증명",
          "모델링",
          "논리"
        ]
      },
      "코스모스": {
        "domains": [
          "science_method",
          "science_history",
          "environment_energy"
        ],
        "bestFor": [
          "물리학",
          "천문학",
          "지구과학",
          "공학계열"
        ],
        "reportRoles": [
          "intro",
          "conclusionExpansion"
        ],
        "triggers": [
          "우주",
          "지구",
          "기후",
          "과학적 관점"
        ],
        "avoidDirectFor": [
          "engineering_information"
        ]
      },
      "침묵의 봄": {
        "domains": [
          "environment_energy",
          "environment_social",
          "bio_science"
        ],
        "bestFor": [
          "환경공학",
          "화학",
          "생명과학"
        ],
        "reportRoles": [
          "comparisonFrame",
          "conclusionExpansion",
          "limitationDiscussion"
        ],
        "triggers": [
          "환경",
          "화학물질",
          "생태계",
          "위험",
          "사회적 영향"
        ],
        "avoidDirectFor": [
          "engineering_information"
        ]
      },
      "총, 균, 쇠": {
        "domains": [
          "environment_social",
          "science_history"
        ],
        "bestFor": [
          "지리",
          "환경",
          "사회과학"
        ],
        "reportRoles": [
          "comparisonFrame",
          "conclusionExpansion"
        ],
        "triggers": [
          "기후",
          "환경",
          "지리",
          "문명",
          "사회적 확장"
        ],
        "avoidDirectFor": [
          "engineering_information",
          "engineering_semiconductor"
        ]
      },
      "경영학 콘서트": {
        "domains": [
          "social_business",
          "engineering_data"
        ],
        "bestFor": [
          "경영학",
          "산업공학",
          "데이터분석"
        ],
        "reportRoles": [
          "application",
          "comparisonFrame"
        ],
        "triggers": [
          "데이터",
          "마케팅",
          "의사결정",
          "최적화"
        ],
        "avoidDirectFor": [
          "engineering_semiconductor"
        ]
      },
      "공정하다는 착각": {
        "domains": [
          "social_policy",
          "humanities_social"
        ],
        "bestFor": [
          "사회학",
          "교육학",
          "정치외교",
          "윤리"
        ],
        "reportRoles": [
          "conclusionExpansion",
          "comparisonFrame"
        ],
        "triggers": [
          "공정",
          "능력주의",
          "불평등"
        ],
        "avoidDirectFor": [
          "engineering_information",
          "engineering_semiconductor"
        ]
      },
      "20세기 수학의 다섯가지 황금률": {
        "domains": [
          "engineering_information",
          "engineering_data",
          "engineering_physics_math"
        ],
        "bestFor": [
          "컴퓨터공학과",
          "데이터사이언스학과",
          "인공지능학과",
          "통계학과",
          "수학과"
        ],
        "reportRoles": [
          "conceptExplanation",
          "analysisFrame",
          "limitationDiscussion"
        ],
        "triggers": [
          "수학",
          "알고리즘",
          "통계",
          "데이터",
          "모델링",
          "예측",
          "확률",
          "함수",
          "계산"
        ],
        "doNotUseAs": "감시사회·문학적 비판 중심 확장 도서가 아니라, 데이터·알고리즘·수학적 모델링의 직접 근거 도서로 우선 사용한다."
      },
      "카오스": {
        "domains": [
          "engineering_data",
          "engineering_physics_math",
          "science_method"
        ],
        "bestFor": [
          "컴퓨터공학과",
          "데이터사이언스학과",
          "물리학과",
          "수학과"
        ],
        "reportRoles": [
          "analysisFrame",
          "limitationDiscussion",
          "conceptExplanation"
        ],
        "triggers": [
          "카오스",
          "혼돈",
          "예측",
          "모델링",
          "시스템",
          "데이터",
          "그래프",
          "비선형"
        ],
        "doNotUseAs": "단순 과학 고전 요약이 아니라, 예측 가능성·모델 한계·데이터 변동성 분석 근거로 사용한다."
      },
      "팩트풀니스": {
        "domains": [
          "engineering_data",
          "science_method"
        ],
        "bestFor": [
          "데이터사이언스학과",
          "컴퓨터공학과",
          "통계학과",
          "경영학과",
          "미디어커뮤니케이션학과"
        ],
        "reportRoles": [
          "analysisFrame",
          "limitationDiscussion",
          "comparisonFrame"
        ],
        "triggers": [
          "데이터",
          "통계",
          "자료",
          "편향",
          "리터러시",
          "세계관",
          "시각화"
        ],
        "doNotUseAs": "데이터 자체 분석 없이 단순 사회 비평 도서로만 사용하지 않는다."
      },
      "1984": {
        "domains": [
          "science_philosophy"
        ],
        "bestFor": [
          "컴퓨터공학과",
          "정보보호학과",
          "미디어커뮤니케이션학과",
          "사회학과"
        ],
        "reportRoles": [
          "conclusionExpansion",
          "limitationDiscussion",
          "comparisonFrame"
        ],
        "triggers": [
          "감시",
          "통제",
          "정보",
          "디지털",
          "네트워크",
          "정보 윤리",
          "플랫폼"
        ],
        "doNotUseAs": "데이터 예측·로그모델·신호 용량의 직접 원리 도서로 사용하지 않고, 감시사회·정보윤리 확장 도서로 사용한다."
      },
      "미디어의 이해": {
        "domains": [
          "science_philosophy"
        ],
        "bestFor": [
          "미디어커뮤니케이션학과",
          "컴퓨터공학과",
          "정보사회 관련 전공"
        ],
        "reportRoles": [
          "conclusionExpansion",
          "analysisFrame",
          "comparisonFrame"
        ],
        "triggers": [
          "미디어",
          "플랫폼",
          "정보",
          "네트워크",
          "디지털",
          "인공지능",
          "기술 환경"
        ],
        "doNotUseAs": "알고리즘·데이터 모델링 직접 근거로 고정하지 않고, 정보 환경과 매체 구조 확장 관점으로 사용한다."
      },
      "감시와 처벌": {
        "domains": [
          "science_philosophy"
        ],
        "bestFor": [
          "정보보호학과",
          "컴퓨터공학과",
          "사회학과",
          "법학과"
        ],
        "reportRoles": [
          "conclusionExpansion",
          "limitationDiscussion",
          "comparisonFrame"
        ],
        "triggers": [
          "감시",
          "알고리즘",
          "플랫폼",
          "디지털",
          "정보보호",
          "규율",
          "시스템"
        ],
        "doNotUseAs": "컴퓨터공학의 수리·모델링 직접 도서가 아니라 디지털 감시와 윤리 확장 도서로 사용한다."
      },
      "제3의 물결": {
        "domains": [
          "science_philosophy",
          "science_history"
        ],
        "bestFor": [
          "컴퓨터공학과",
          "정보사회 관련 전공",
          "사회학과",
          "경영학과"
        ],
        "reportRoles": [
          "conclusionExpansion",
          "comparisonFrame",
          "application"
        ],
        "triggers": [
          "정보화",
          "기술",
          "지식 사회",
          "혁신",
          "디지털",
          "공동체"
        ],
        "doNotUseAs": "데이터 예측의 직접 수리 근거가 아니라 정보화 사회의 변화와 확장 관점으로 사용한다."
      }
    },
    "reportRoleDefinitions": {
      "intro": "문제의식과 탐구 필요성을 제시하는 도입부 근거",
      "conceptExplanation": "선택 개념을 설명하는 핵심 이론/원리 근거",
      "analysisFrame": "자료·사례·현상을 분석하는 관점 제공",
      "comparisonFrame": "비교 기준이나 대조 관점 제공",
      "limitationDiscussion": "자료 해석의 한계·오차·판단 편향 논의",
      "conclusionExpansion": "보고서 결론에서 사회적 의미나 진로 확장으로 연결",
      "application": "실생활·산업·진로 사례 적용"
    },
    "axisProfiles": {
      "math_data_modeling": {
        "label": "수리·데이터 모델링 축",
        "patterns": [
          "수리",
          "데이터",
          "모델링",
          "통계",
          "알고리즘",
          "예측",
          "시뮬레이션",
          "그래프",
          "자료"
        ],
        "preferredDomains": [
          "engineering_information",
          "engineering_data",
          "engineering_physics_math",
          "science_method"
        ],
        "expansionDomains": [
          "science_philosophy",
          "science_history",
          "environment_energy"
        ],
        "titleBoost": [
          "20세기 수학의 다섯가지 황금률",
          "페르마의 마지막 정리",
          "카오스",
          "팩트풀니스"
        ],
        "titleDemote": [
          "엔트로피",
          "코스모스",
          "침묵의 봄",
          "총, 균, 쇠",
          "1984",
          "감시와 처벌",
          "미디어의 이해",
          "제3의 물결",
          "부분과 전체"
        ],
        "reportRolePriority": [
          "analysisFrame",
          "limitationDiscussion",
          "conceptExplanation"
        ]
      },
      "signal_network_capacity": {
        "label": "신호·네트워크·용량 해석 축",
        "patterns": [
          "신호",
          "채널",
          "용량",
          "네트워크",
          "통신",
          "전송",
          "정보량",
          "정보 시스템",
          "컴퓨팅",
          "데이터 전송"
        ],
        "preferredDomains": [
          "engineering_information",
          "engineering_data",
          "engineering_physics_math",
          "science_method"
        ],
        "expansionDomains": [
          "science_philosophy",
          "science_history"
        ],
        "titleBoost": [
          "부분과 전체",
          "20세기 수학의 다섯가지 황금률",
          "객관성의 칼날",
          "미디어의 이해"
        ],
        "titleDemote": [
          "카오스",
          "혼돈으로부터의 질서",
          "팩트풀니스",
          "엔트로피",
          "코스모스",
          "침묵의 봄",
          "총, 균, 쇠",
          "1984",
          "감시와 처벌"
        ],
        "reportRolePriority": [
          "conceptExplanation",
          "analysisFrame",
          "limitationDiscussion",
          "application"
        ]
      },
      "physics_system": {
        "label": "물리·시스템 해석 축",
        "patterns": [
          "물리",
          "시스템",
          "센서",
          "측정",
          "속도",
          "카메라",
          "에너지",
          "전자기",
          "양자",
          "오차"
        ],
        "preferredDomains": [
          "engineering_physics_math",
          "science_method",
          "science_philosophy",
          "environment_energy"
        ],
        "expansionDomains": [
          "science_history",
          "engineering_data"
        ],
        "titleBoost": [
          "부분과 전체",
          "엔트로피",
          "객관성의 칼날",
          "혼돈으로부터의 질서",
          "코스모스"
        ],
        "titleDemote": [
          "총, 균, 쇠",
          "침묵의 봄",
          "경영학 콘서트"
        ],
        "reportRolePriority": [
          "conceptExplanation",
          "analysisFrame",
          "limitationDiscussion"
        ]
      },
      "earth_environment_data": {
        "label": "지구·환경 데이터 해석 축",
        "patterns": [
          "지구",
          "환경",
          "기후",
          "폭염",
          "생태",
          "대기",
          "기상",
          "지속가능",
          "에너지",
          "사회적 영향"
        ],
        "preferredDomains": [
          "environment_energy",
          "environment_social",
          "science_method",
          "science_history"
        ],
        "expansionDomains": [
          "engineering_data",
          "science_philosophy",
          "social_policy"
        ],
        "titleBoost": [
          "엔트로피",
          "침묵의 봄",
          "총, 균, 쇠",
          "코스모스",
          "객관성의 칼날"
        ],
        "titleDemote": [
          "페르마의 마지막 정리",
          "부분과 전체"
        ],
        "reportRolePriority": [
          "conclusionExpansion",
          "analysisFrame",
          "comparisonFrame"
        ]
      },
      "information_society_ethics": {
        "label": "정보사회·디지털 윤리 확장 축",
        "patterns": [
          "감시",
          "플랫폼",
          "정보 윤리",
          "디지털 시민성",
          "정보 보호",
          "정보사회",
          "지식 정보 사회",
          "미디어",
          "기술 윤리",
          "정보 문화"
        ],
        "preferredDomains": [
          "science_philosophy",
          "science_history",
          "engineering_information"
        ],
        "expansionDomains": [
          "engineering_data",
          "social_policy"
        ],
        "titleBoost": [
          "1984",
          "감시와 처벌",
          "미디어의 이해",
          "제3의 물결"
        ],
        "titleDemote": [
          "엔트로피",
          "페르마의 마지막 정리",
          "코스모스",
          "침묵의 봄"
        ],
        "reportRolePriority": [
          "conclusionExpansion",
          "limitationDiscussion",
          "comparisonFrame"
        ]
      },
      "generic_science_method": {
        "label": "과학 방법·측정 일반 축",
        "patterns": [
          "측정",
          "표준",
          "관찰",
          "객관성",
          "과학적 판단"
        ],
        "preferredDomains": [
          "science_method",
          "science_philosophy",
          "engineering_physics_math"
        ],
        "expansionDomains": [
          "science_history",
          "engineering_data",
          "environment_energy"
        ],
        "titleBoost": [
          "객관성의 칼날",
          "부분과 전체",
          "코스모스"
        ],
        "titleDemote": [],
        "reportRolePriority": [
          "conceptExplanation",
          "analysisFrame",
          "limitationDiscussion"
        ]
      },
      "real_life_change_modeling": {
        "label": "실생활 변화 모델링 축",
        "patterns": [
          "실생활 변화",
          "변화 모델링",
          "생활 변화",
          "현상 변화",
          "시간에 따른 변화",
          "변화 양상",
          "함수 변화",
          "변화율"
        ],
        "preferredDomains": [
          "engineering_data",
          "engineering_physics_math",
          "science_method",
          "engineering_information"
        ],
        "expansionDomains": [
          "science_philosophy",
          "science_history"
        ],
        "titleBoost": [
          "카오스",
          "20세기 수학의 다섯가지 황금률",
          "혼돈으로부터의 질서"
        ],
        "titleDemote": [
          "팩트풀니스",
          "부분과 전체",
          "객관성의 칼날",
          "1984",
          "감시와 처벌",
          "미디어의 이해",
          "제3의 물결",
          "엔트로피",
          "코스모스",
          "침묵의 봄",
          "총, 균, 쇠"
        ],
        "reportRolePriority": [
          "analysisFrame",
          "conceptExplanation",
          "limitationDiscussion"
        ]
      },
      "prediction_data_interpretation": {
        "label": "예측·데이터 해석 축",
        "patterns": [
          "예측·데이터 해석",
          "예측 데이터 해석",
          "데이터 해석",
          "자료 해석",
          "통계 판단",
          "데이터 예측",
          "편향 점검",
          "그래프 해석",
          "예측 한계"
        ],
        "preferredDomains": [
          "engineering_data",
          "engineering_information",
          "science_method",
          "engineering_physics_math"
        ],
        "expansionDomains": [
          "science_philosophy",
          "science_history"
        ],
        "titleBoost": [
          "카오스",
          "혼돈으로부터의 질서",
          "팩트풀니스"
        ],
        "titleDemote": [
          "부분과 전체",
          "객관성의 칼날",
          "미디어의 이해",
          "1984",
          "감시와 처벌",
          "제3의 물결",
          "엔트로피",
          "코스모스",
          "침묵의 봄",
          "총, 균, 쇠"
        ],
        "reportRolePriority": [
          "analysisFrame",
          "limitationDiscussion",
          "comparisonFrame"
        ]
      }
    }
  };

  const GENERIC_TOKENS = new Set([
    "과학","사회","우리","기반","후속","연계","해석","선택","개념","키워드","보고서","탐구",
    "직접","확장","추천","교과","학과","구조","비교","분석","설명","원인","사례","중심",
    "관련","영향","관점","흐름","활동","형태","좋습니다","좋은","데이터","시스템","측정","표준"
  ]);

  const STRONG_CONCEPT_TOKENS = new Set([
    "폭염","기후","환경","에너지","열역학","엔트로피","모델링","수리","통계","알고리즘",
    "센서","카메라","속도","반도체","전자","전기","물리","수학","카오스","혼돈","우주",
    "화학","생태계","측정오차","오차","표준화","예측","시뮬레이션","정보","디지털"
  ]);

  function toText(v){
    if (v == null) return "";
    if (Array.isArray(v)) return v.map(toText).join(" ");
    if (typeof v === "object") return Object.values(v).map(toText).join(" ");
    return String(v);
  }
  function normalize(v){
    return toText(v).toLowerCase().replace(/[·ㆍ/|,;:()[\]{}<>_\-]/g," ").replace(/\s+/g," ").trim();
  }
  function uniq(arr){
    return Array.from(new Set((arr || []).filter(Boolean)));
  }
  function arr(v){
    if (!v) return [];
    return Array.isArray(v) ? v.filter(Boolean) : [v];
  }
  function intersect(a,b){
    const set = new Set(a || []);
    return (b || []).filter(x => set.has(x));
  }
  function hasAny(text, list){
    const t = normalize(text);
    return (list || []).some(x => {
      const n = normalize(x);
      return n && t.includes(n);
    });
  }
  function expandToken(t){
    const out = [t];
    ["폭염","기후","환경","에너지","열역학","엔트로피","디지털","데이터","모델링","수리","통계","알고리즘","센서","카메라","속도","반도체","전자","전기","물리","수학","카오스","혼돈","우주","화학","생태계","오차","측정","표준","정보"].forEach(k=>{
      if (String(t).includes(k)) out.push(k);
    });
    return out;
  }
  function tokenize(v){
    const raw = (normalize(v).match(/[가-힣A-Za-z0-9]+/g) || []).filter(x => x.length >= 2);
    const expanded = [];
    raw.forEach(x => expandToken(x).forEach(y => expanded.push(y)));
    return uniq(expanded.filter(x => !GENERIC_TOKENS.has(x) || STRONG_CONCEPT_TOKENS.has(x)));
  }
  function tokenHits(text, tokens){
    const t = normalize(text);
    return uniq((tokens || []).filter(x => t.includes(normalize(x))));
  }

  function trimTrailingSlash(path){ return String(path || "").replace(/\/+$/,""); }
  function stripFile(pathname){
    if (!pathname) return "/";
    if (pathname.endsWith("/")) return pathname;
    return pathname.replace(/\/[^/]*$/,"/");
  }
  function buildBaseCandidates(){
    const candidates = [];
    function add(base){
      base = trimTrailingSlash(base);
      if (base && !candidates.includes(base)) candidates.push(base);
    }
    const loc = global.location;
    const pathname = loc ? loc.pathname : "";
    const keywordMatch = pathname.match(/^(.*?\/keyword-engine)(?:\/|$)/);
    if (keywordMatch) add(keywordMatch[1]);

    const currentDir = stripFile(pathname);
    add(currentDir.replace(/\/$/,""));
    add(currentDir.replace(/\/assets\/js\/?$/,""));
    add("/keyword-engine");
    add("/univ-search/keyword-engine");
    add("/univ-search/public/keyword-engine");
    add("/public/keyword-engine");
    add(".");
    return candidates;
  }
  async function tryFetchJson(url){
    const bust = (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(ADAPTER_VERSION) + "&t=" + Date.now();
    const res = await fetch(url + bust, { cache: "no-store" });
    if (!res.ok) return { ok:false, status:res.status, url };
    const text = await res.text();
    if (/^\s*</.test(text)) return { ok:false, status:"HTML_INSTEAD_OF_JSON", url };
    try { return { ok:true, status:res.status, url, data:JSON.parse(text) }; }
    catch(e){ return { ok:false, status:"JSON_PARSE_ERROR", url, error:e.message }; }
  }
  async function resolveBookEngineBase(options){
    options = options || {};
    const explicit = options.base || global.BOOK_ENGINE_BASE;
    const candidates = explicit ? [explicit].concat(buildBaseCandidates()) : buildBaseCandidates();
    const tried = [];
    for (const base of uniq(candidates)){
      const url = trimTrailingSlash(base) + "/data/books/" + MASTER_FILE;
      try {
        const result = await tryFetchJson(url);
        tried.push({ base, url, status: result.status });
        if (result.ok && result.data && Number(result.data.totalBooks) === 210 && Array.isArray(result.data.books)){
          global.BOOK_ENGINE_BASE = trimTrailingSlash(base);
          global.BOOK_SOURCE_MASTER_210 = result.data;
          return { base: global.BOOK_ENGINE_BASE, url, master: result.data, tried };
        }
      } catch(e){
        tried.push({ base, url, status:"FETCH_ERROR", error:e.message });
      }
    }
    const err = new Error("210권 도서 master 경로를 찾지 못했습니다.");
    err.tried = tried;
    throw err;
  }
  async function loadBookMaster(options){
    const resolved = await resolveBookEngineBase(options || {});
    return resolved.master;
  }
  async function loadRules(options){
    try {
      const resolved = await resolveBookEngineBase(options || {});
      const url = resolved.base + "/data/books/" + RULE_FILE;
      const result = await tryFetchJson(url);
      if (result.ok && result.data) {
        global.BOOK_RECOMMENDATION_RULES_V22 = result.data;
        return result.data;
      }
    } catch(e){}
    global.BOOK_RECOMMENDATION_RULES_V22 = FALLBACK_RULES;
    return FALLBACK_RULES;
  }

  function inferMajorGroup(payload, rules){
    const groups = rules.majorGroups || {};
    const deptText = normalize([
      payload.department,
      payload.major,
      payload.selectedDepartment,
      payload.selectedMajor
    ].join(" "));
    const allText = normalize([
      deptText,
      payload.subject,
      payload.selectedSubject,
      payload.reportIntent
    ].join(" "));

    // 과목명(예: 통계, 정보)보다 학과명이 우선이다.
    // 생명공학과/환경공학과처럼 '공학'이 포함된 학과가 반도체·기계 공학군으로 빨려 들어가는 것을 막는다.
    const priority = [
      "medical_life",
      "environment_energy",
      "social_business",
      "engineering_information",
      "engineering_semiconductor",
      "humanities"
    ];

    for (const id of priority){
      const rule = groups[id];
      if (rule && (rule.patterns || []).some(p => deptText.includes(normalize(p)))) return id;
    }
    for (const id of priority){
      const rule = groups[id];
      if (rule && (rule.patterns || []).some(p => allText.includes(normalize(p)))) return id;
    }
    for (const [id, rule] of Object.entries(groups)){
      if ((rule.patterns || []).some(p => allText.includes(normalize(p)))) return id;
    }
    return "engineering_information";
  }

  function getBookTexts(book){
    const title = normalize([book.title, (book.titleAliases || []).join(" "), book.author].join(" "));
    const meta = normalize([
      (book.relatedSubjects || []).join(" "),
      (book.relatedMajors || []).join(" "),
      (book.relatedThemes || []).join(" "),
      book.summary,
      book.reportUse,
      book.primarySearchText
    ].join(" "));
    const full = normalize([
      title, meta,
      (book.keywords || []).join(" "),
      book.searchText,
      (book.starterQuestions || []).join(" "),
      (book.advancedQuestions || []).join(" "),
      (book.inquiryPoints || []).join(" ")
    ].join(" "));
    return { title, meta, full, primary: title + " " + meta };
  }

  function getOverride(book, rules){
    const title = book.title || "";
    const overrides = rules.domainOverrideByTitle || {};
    return overrides[title] || null;
  }

  function inferDomains(book, rules){
    const override = getOverride(book, rules);
    if (override && override.domains) return override.domains.slice();

    const t = getBookTexts(book).primary;
    const domains = [];

    if (/(컴퓨터|소프트웨어|정보|데이터|인공지능|AI|알고리즘|통계|모델링)/i.test(t)) domains.push("engineering_information","engineering_data");
    if (/(반도체|전자|전기|신소재|재료|기계|공학|센서|측정|표준|물리|수학)/i.test(t)) domains.push("engineering_physics_math");
    if (/(환경|기후|폭염|에너지|열역학|엔트로피|생태계|지구)/i.test(t)) domains.push("environment_energy");
    if (/(의학|의사|환자|진단|치료|건강|약|신약|간호|보건|생명|DNA|유전자|미생물)/i.test(t)) domains.push("medical_health","medical_life");
    if (/(경영|경제|마케팅|사회|정치|법|윤리|공정|불평등|기아|교육)/i.test(t)) domains.push("social_business","social_policy");
    if (/(소설|문학|예술|미술|음악|역사|철학|르네상스|한중록|구운몽|이방인|보바리|안나)/i.test(t)) domains.push("humanities_literature");

    if (!domains.length && /(과학|객관성|코스모스|페르마|부분과 전체|혼돈|카오스)/i.test(t)) domains.push("science_method","science_philosophy");
    return uniq(domains.length ? domains : ["general_science"]);
  }

  function domainFit(book, majorGroup, rules){
    const domains = inferDomains(book, rules);
    const group = (rules.majorGroups || {})[majorGroup] || {};
    const override = getOverride(book, rules);
    if (override && (override.avoidDirectFor || []).includes(majorGroup)) {
      return { level:"excluded", domains, reason:"전공군 직접 사용 제한" };
    }
    if (intersect(domains, group.excludedDomains || []).length) {
      return { level:"excluded", domains, reason:"전공군 제외 도메인" };
    }
    if (intersect(domains, group.directDomains || []).length) {
      return { level:"direct", domains, reason:"전공군 직접 도메인" };
    }
    if (intersect(domains, group.expansionDomains || []).length) {
      return { level:"expansion", domains, reason:"전공군 확장 도메인" };
    }
    return { level:"excluded", domains, reason:"전공군 도메인 불일치" };
  }

  function collectPayloadTerms(payload){
    payload = payload || {};
    const subject = payload.subject || payload.selectedSubject || payload.course || "";
    const department = payload.department || payload.major || payload.selectedDepartment || "";
    const selectedConcept = payload.selectedConcept || payload.concept || payload.step3Concept || "";
    const selectedKeyword = payload.selectedRecommendedKeyword || payload.recommendedKeyword || payload.keyword || payload.step3Keyword || "";
    const axis = payload.followupAxis || payload.axis || payload.axisPayload || payload.step4Axis || "";
    const reportIntent = payload.reportIntent || payload.reportMode || "";
    const conceptTokens = tokenize(selectedConcept);
    const keywordTokens = tokenize(selectedKeyword);
    const axisTokens = tokenize(axis);
    return {
      subject, department, selectedConcept, selectedKeyword, axis, reportIntent,
      conceptTokens, keywordTokens, axisTokens,
      strongTokens: uniq(conceptTokens.concat(keywordTokens, axisTokens))
    };
  }
  function hasRequiredPayload(terms){
    return !!(normalize(terms.selectedConcept) || normalize(terms.selectedKeyword) || normalize(terms.axis));
  }

  function roleFit(book, terms, rules){
    const override = getOverride(book, rules);
    const texts = getBookTexts(book);
    const hitTokens = uniq(
      tokenHits(texts.full, terms.conceptTokens)
        .concat(tokenHits(texts.full, terms.keywordTokens))
        .concat(tokenHits(texts.full, terms.axisTokens))
    );
    const strongHits = hitTokens.filter(t => STRONG_CONCEPT_TOKENS.has(t));
    const triggers = override ? arr(override.triggers) : [];
    const triggerHits = triggers.filter(t => hasAny([terms.selectedConcept, terms.selectedKeyword, terms.axis].join(" "), [t]) || hasAny(texts.full, [t]));

    let score = 0;
    const reasons = [];
    if (strongHits.length) {
      score += Math.min(35, strongHits.length * 10);
      reasons.push("핵심 개념 연결: " + strongHits.slice(0,3).join(", "));
    }
    if (triggerHits.length) {
      score += 25;
      reasons.push("보고서 역할 트리거 연결: " + triggerHits.slice(0,3).join(", "));
    }
    if (hasAny(texts.full, [terms.selectedKeyword])) {
      score += 20;
      reasons.push("추천 키워드 문맥 연결");
    }
    if (hasAny(texts.full, [terms.axis])) {
      score += 20;
      reasons.push("후속 연계축 문맥 연결");
    }
    if (hasAny(texts.full, [terms.department])) {
      score += 10;
      reasons.push("학과 문맥 보조 연결");
    }

    const roles = override && override.reportRoles ? override.reportRoles.slice() : inferReportRoles(book, terms, texts);
    return { score, reasons, roles, hitTokens, triggerHits };
  }

  function inferReportRoles(book, terms, texts){
    const roles = [];
    const text = texts.full;
    if (/(원리|개념|이론|법칙|측정|표준|물리|수학|열역학|엔트로피)/i.test(text)) roles.push("conceptExplanation");
    if (/(데이터|모델링|분석|해석|시스템|예측|통계|알고리즘|카오스|혼돈)/i.test(text)) roles.push("analysisFrame");
    if (/(비교|차이|한계|오류|편향|불확실|객관성|관찰)/i.test(text)) roles.push("limitationDiscussion","comparisonFrame");
    if (/(환경|기후|사회|윤리|지속가능|정책|문명|생태계)/i.test(text)) roles.push("conclusionExpansion");
    if (/(사례|적용|산업|기술|의사결정)/i.test(text)) roles.push("application");
    return uniq(roles.length ? roles : ["analysisFrame"]);
  }

  function buildSelectedBookContext(book, terms, majorGroup, domain, role, type, rules){
    const roleDefinitions = rules.reportRoleDefinitions || {};
    const roles = role.roles || [];
    const roleLabels = roles.map(r => roleDefinitions[r] || r);
    const override = getOverride(book, rules);
    const title = book.title || "";
    const reason = type === "direct"
      ? `${title}은(는) 선택한 전공군·교과 개념·후속 연계축 안에서 보고서의 핵심 논지를 설명하거나 분석하는 데 사용할 수 있는 도서입니다.`
      : `${title}은(는) 핵심 개념과 완전히 같은 도서는 아니지만, 보고서의 비교·한계·사회적 의미를 확장하는 참고 도서로 사용할 수 있습니다.`;

    return {
      title: book.title,
      author: book.author || "",
      recommendationType: type,
      majorGroup,
      bookDomains: domain.domains,
      domainFit: domain.level,
      recommendationReason: reason,
      matchReasons: role.reasons,
      reportRole: roles,
      reportRoleLabels: roleLabels,
      useInReport: {
        intro: roles.includes("intro") ? "탐구 문제의식과 배경을 제시할 때 활용합니다." : "",
        conceptExplanation: roles.includes("conceptExplanation") ? "선택 개념의 원리·측정·자료 해석 기준을 설명할 때 활용합니다." : "",
        analysisFrame: roles.includes("analysisFrame") ? "자료를 해석하거나 현상을 모델링하는 분석 프레임으로 활용합니다." : "",
        comparisonFrame: roles.includes("comparisonFrame") ? "다른 사례·조건·관점과 비교하는 기준으로 활용합니다." : "",
        limitationDiscussion: roles.includes("limitationDiscussion") ? "데이터 해석의 한계, 오차, 판단 편향을 논의할 때 활용합니다." : "",
        conclusionExpansion: roles.includes("conclusionExpansion") ? "결론에서 사회적 의미나 진로 확장으로 연결할 때 활용합니다." : ""
      },
      miniInstruction: "이 책을 단순 독후감처럼 요약하지 말고, 선택 개념과 후속 연계축을 설명하는 근거 프레임으로 사용한다. 책의 줄거리보다 보고서에서 맡는 역할과 관점을 우선 반영한다.",
      doNotUseAs: (override && override.doNotUseAs) || "",
      bestFor: (override && override.bestFor) || [],
      connectionToPayload: {
        subject: terms.subject,
        department: terms.department,
        selectedConcept: terms.selectedConcept,
        selectedKeyword: terms.selectedKeyword,
        followupAxis: terms.axis
      }
    };
  }


  function inferAxisProfile(terms, rules){
    const profiles = rules.axisProfiles || {};
    const axisText = normalize(terms.axis || "");
    const keywordText = normalize(terms.selectedKeyword || "");
    const conceptText = normalize(terms.selectedConcept || "");
    const allText = [conceptText, keywordText, axisText].filter(Boolean).join(" ");

    // v91.1: 5번 도서는 3번 추천 키워드보다 4번 후속 연계축을 우선한다.
    // 기존에는 '데이터 예측' 키워드가 너무 강해서 신호·용량/변화 모델링 축도 모두
    // math_data_modeling으로 수렴했다. 축 제목·id·domain 텍스트를 먼저 직접 판별한다.
    const directAxisRules = [
      // v92: 실제 4번 축 id를 우선 판별한다.
      // 강제렌더/캐시렌더 경로에서는 axisLabel 없이 state.linkTrack id만 전달될 수 있으므로,
      // id를 잡지 못하면 세 축이 모두 '데이터 예측' 키워드의 math_data_modeling으로 수렴한다.
      ["signal_network_capacity", /(signal\s+capacity\s+interpretation|signal\s+network\s+capacity|신호|용량|채널|네트워크|통신|전송|정보량|정보 시스템|데이터 전송)/],
      ["information_society_ethics", /(information\s+society\s+ethics|info\s+ethics|digital\s+ethics|윤리|감시|플랫폼|정보사회|지식 정보 사회|디지털|미디어|정보 문화|정보 보호)/],
      ["prediction_data_interpretation", /(future\s+prediction\s+data|prediction\s+data\s+interpretation|data\s+interpretation|예측\s*[·ㆍ-]?\s*데이터\s*해석|데이터\s*해석|자료\s*해석|통계\s*판단|편향\s*점검|그래프\s*해석|예측\s*한계|데이터\s*예측\s*축)/],
      ["real_life_change_modeling", /(real\s+world\s+change\s+modeling|real\s+life\s+change\s+modeling|change\s+modeling|실생활\s*변화|변화\s*모델링|생활\s*변화|현상\s*변화|시간에\s*따른\s*변화|변화\s*양상|함수\s*변화|변화율)/]
    ];

    for (const [id, pattern] of directAxisRules) {
      if (profiles[id] && pattern.test(axisText)) {
        return { id, score: 100, profile: profiles[id] };
      }
    }

    let best = { id: "generic_science_method", score: 0, profile: profiles.generic_science_method || {} };

    Object.entries(profiles).forEach(([id, profile]) => {
      let score = 0;
      (profile.patterns || []).forEach(p => {
        const n = normalize(p);
        if (!n) return;
        if (axisText.includes(n)) score += 12;
        else if (keywordText.includes(n)) score += 2;
        else if (conceptText.includes(n)) score += 1;
        else if (allText.includes(n)) score += 1;
      });
      if (score > best.score) best = { id, score, profile };
    });

    return best;
  }

  function axisFit(book, domain, role, axisInfo){
    const profile = axisInfo.profile || {};
    const title = book.title || "";
    let boost = 0;
    const reasons = [];

    if ((profile.preferredDomains || []).some(d => (domain.domains || []).includes(d))) {
      boost += 24;
      reasons.push("후속 연계축 우선 도메인");
    } else if ((profile.expansionDomains || []).some(d => (domain.domains || []).includes(d))) {
      boost += 10;
      reasons.push("후속 연계축 확장 도메인");
    } else {
      boost -= 18;
      reasons.push("후속 연계축 도메인 약함");
    }

    if ((profile.titleBoost || []).includes(title)) {
      boost += 84;
      reasons.push("후속 연계축 대표 도서");
    }
    if ((profile.titleDemote || []).includes(title)) {
      boost -= 72;
      reasons.push("후속 연계축 직접성 낮음");
    }

    const rolePriority = profile.reportRolePriority || [];
    const roleHits = (role.roles || []).filter(r => rolePriority.includes(r));
    if (roleHits.length) {
      boost += Math.min(18, roleHits.length * 8);
      reasons.push("후속 연계축 보고서 역할 적합");
    }

    return { score: boost, reasons };
  }


  function evaluateBook(book, terms, majorGroup, rules){
    const domain = domainFit(book, majorGroup, rules);
    if (domain.level === "excluded") {
      return { include:false, type:"excluded", score:0, domain, role:null, axis:null, axisProfile:"" };
    }

    const role = roleFit(book, terms, rules);
    const axisInfo = inferAxisProfile(terms, rules);
    const axis = axisFit(book, domain, role, axisInfo);

    const domainScore = domain.level === "direct" ? 55 : 25;
    const score = domainScore + role.score + axis.score;

    let type = "excluded";
    if (domain.level === "direct" && role.score >= 20 && axis.score >= 5) {
      type = "direct";
    } else if (role.score >= 15 && score >= 45) {
      type = "expansion";
    }

    if (type === "excluded") return { include:false, type, score, domain, role, axis, axisProfile: axisInfo.id };

    if (type === "direct" && axis.score < 15 && score < 95) {
      type = "expansion";
    }

    return { include:true, type, score, domain, role, axis, axisProfile: axisInfo.id };
  }



  function getAxisHardOrder(axisProfileId){
    // v92: BOOK-A 1차 잠금. 4번 후속 연계축 3개가 모두 같은 직접 일치 도서로
    // 수렴하지 않도록, 축별 대표 직접 도서 순서를 명시한다.
    const map = {
      real_life_change_modeling: [
        "카오스",
        "20세기 수학의 다섯가지 황금률",
        "혼돈으로부터의 질서",
        "페르마의 마지막 정리",
        "객관성의 칼날",
        "부분과 전체",
        "팩트풀니스"
      ],
      signal_network_capacity: [
        "부분과 전체",
        "20세기 수학의 다섯가지 황금률",
        "객관성의 칼날",
        "미디어의 이해",
        "제3의 물결",
        "카오스",
        "팩트풀니스"
      ],
      prediction_data_interpretation: [
        "팩트풀니스",
        "카오스",
        "혼돈으로부터의 질서",
        "20세기 수학의 다섯가지 황금률",
        "객관성의 칼날",
        "부분과 전체"
      ]
    };
    return map[axisProfileId] || null;
  }

  function applyAxisHardSplit(evaluated, axisProfileId, majorGroup){
    // 현재 요청된 BOOK-A 컴퓨터/데이터 계열에만 강제 분화 적용.
    if (majorGroup !== "engineering_information") return evaluated;
    const order = getAxisHardOrder(axisProfileId);
    if (!order || !order.length) return evaluated;
    const orderIndex = new Map(order.map((title, idx) => [title, idx]));
    return evaluated.map(book => {
      const idx = orderIndex.has(book.title) ? orderIndex.get(book.title) : -1;
      if (idx < 0) return book;
      const hardBoost = 1000 - idx * 30;
      return Object.assign({}, book, {
        matchType: idx < 3 ? "direct" : book.matchType,
        matchScore: (book.matchScore || 0) + hardBoost,
        matchReasons: uniq((book.matchReasons || []).concat(["4번 후속 연계축 대표 도서"])),
        axisHardSplitRank: idx + 1
      });
    });
  }

  function recommendBooks(payload, books, options){
    options = options || {};
    books = books || (global.BOOK_SOURCE_MASTER_210 && global.BOOK_SOURCE_MASTER_210.books) || [];
    const rules = global.BOOK_RECOMMENDATION_RULES_V22 || FALLBACK_RULES;
    const terms = collectPayloadTerms(payload);
    if (!hasRequiredPayload(terms)){
      return {
        directBooks: [],
        expansionBooks: [],
        selectedBookSummary: null,
        inheritedPayload: payload || {},
        adapterVersion: ADAPTER_VERSION,
        warning: "도서 추천은 학과 단독 추천으로 실행하지 않습니다. 3번 선택 개념, 추천 키워드, 4번 후속 연계축 중 하나 이상이 필요합니다."
      };
    }

    const majorGroup = inferMajorGroup(terms, rules);
    const axisInfoForRequest = inferAxisProfile(terms, rules);
    const evaluatedRaw = books.map(book => {
      const ev = evaluateBook(book, terms, majorGroup, rules);
      const selectedBookContext = ev.include ? buildSelectedBookContext(book, terms, majorGroup, ev.domain, ev.role, ev.type, rules) : null;
      return Object.assign({}, book, {
        matchScore: ev.score,
        matchType: ev.type,
        matchReasons: (ev.role ? ev.role.reasons : [ev.domain.reason]).concat(ev.axis ? ev.axis.reasons : []),
        reportRoles: ev.role ? ev.role.roles : [],
        bookDomains: ev.domain.domains,
        axisProfile: ev.axisProfile || "",
        axisFitReasons: ev.axis ? ev.axis.reasons : [],
        selectedBookContext,
        adapterVersion: ADAPTER_VERSION
      });
    }).filter(book => book.matchType === "direct" || book.matchType === "expansion");

    const evaluated = applyAxisHardSplit(evaluatedRaw, axisInfoForRequest.id, majorGroup)
      .sort((a,b) => {
        if (a.axisHardSplitRank && b.axisHardSplitRank) return a.axisHardSplitRank - b.axisHardSplitRank;
        if (a.axisHardSplitRank && !b.axisHardSplitRank) return -1;
        if (!a.axisHardSplitRank && b.axisHardSplitRank) return 1;
        if (a.matchType !== b.matchType) return a.matchType === "direct" ? -1 : 1;
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.managementNo - b.managementNo;
      });

    const directLimit = options.directLimit || 3;
    const expansionLimit = options.expansionLimit || 5;
    const directBooks = evaluated.filter(b => b.matchType === "direct").slice(0, directLimit);
    const directIds = new Set(directBooks.map(b => b.sourceId));
    const expansionBooks = evaluated.filter(b => b.matchType === "expansion" && !directIds.has(b.sourceId)).slice(0, expansionLimit);

    return {
      directBooks,
      expansionBooks,
      selectedBookSummary: directBooks[0] || expansionBooks[0] || null,
      inheritedPayload: payload || {},
      terms,
      majorGroup,
      adapterVersion: ADAPTER_VERSION,
      debug: {
        majorGroup,
        axisProfile: axisInfoForRequest.id,
        strongTokens: terms.strongTokens,
        evaluatedCount: evaluated.length,
        directCount: directBooks.length,
        expansionCount: expansionBooks.length
      }
    };
  }

  global.BookRecommendationAdapter = {
    version: ADAPTER_VERSION,
    collectPayloadTerms,
    recommendBooks,
    loadBookMaster,
    loadRules,
    resolveBookEngineBase,
    inferMajorGroup
  };
})(typeof window !== "undefined" ? window : globalThis);
