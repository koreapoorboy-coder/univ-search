window.REPORT_SEED_BANK_STAGE7_PARTIAL_V1 = {
  "schemaVersion": "report-seed-bank-stage-v1",
  "stage": "stage7",
  "stageStatus": "partial",
  "range": "RPT-031~RPT-033",
  "createdAt": "2026-05-15",
  "updatedAt": "2026-05-15",
  "policy": {
    "excelPurpose": "사진 보고서 원문 보존용",
    "githubPatchPurpose": "MINI 적용·다음 작업용 구조화 seed 데이터",
    "includePreviousStages": false,
    "engineApplied": false
  },
  "sourceWorkbook": "seed/seed-bank/raw-reports/original-xlsx/report_dataset_stage7_RPT031_033_partial.xlsx",
  "seeds": [
    {
      "seedId": "RPT-031",
      "stage": "stage7",
      "stageStatus": "partial",
      "seedName": "인간의 몸짓을 흉내 내는 기계 — 동역학이 만드는 휴머노이드 운동 제어",
      "studentFacingLabel": "휴머노이드 로봇이 복합 무술 동작을 수행하는 현상을 다관절 동역학, ZMP, 역기구학, 각운동량 보상, 강화학습 기반 제어로 해석한 보고서.",
      "fusionType": "물리·수학·기계공학·로봇공학·AI",
      "corePattern": "복잡한 로봇 동작 사례 제시 → 동역학 모델 설명 → 균형 조건(ZMP) 해석 → 역기구학으로 자세 계산 → 각운동량 보상 → 강화학습으로 실제 제어 최적화",
      "problemFrame": "휴머노이드 로봇은 왜 산업용 로봇보다 제어가 어렵고, 어떻게 균형을 잃지 않으면서 사람 같은 연속 동작을 수행할 수 있는가?",
      "conceptRole": "다관절 동역학, 영점 모멘트 점(ZMP), 역기구학/순기구학, 관성 모멘트와 각운동량, 강화학습 기반 운동 제어",
      "analysisMethod": "사례 기반 문제 인식 → 핵심 개념·원리 설명 → 실제 적용 과정 구조화 → 교과 연계와 심화 탐구 제안",
      "bestForSubjects": [
        "물리학Ⅰ·Ⅱ",
        "수학",
        "미적분",
        "정보",
        "공학 일반",
        "과학탐구실험"
      ],
      "bestForMajors": [
        "기계공학과",
        "로봇공학과",
        "메카트로닉스공학과",
        "전기전자공학과",
        "인공지능학과",
        "컴퓨터공학과"
      ],
      "axisTriggers": [
        "다관절 동역학",
        "영점 모멘트 점(ZMP)",
        "역기구학/순기구학",
        "관성 모멘트와 각운동량",
        "강화학습 기반 운동 제어"
      ],
      "topicSynthesisFormula": "인간 동작 모사 + 물리 법칙 + 수학적 모델링 + 제어공학 + 강화학습",
      "avoid": [
        "로봇을 단순 기계 동작 수준으로 설명",
        "취권 장면만 흥미 위주로 소비",
        "ZMP/역기구학 용어 나열",
        "AI만 강조하고 물리·동역학 기초 생략"
      ],
      "miniPromptFragment": "인간의 몸짓을 흉내 내는 기계 — 동역학이 만드는 휴머노이드 운동 제어 보고서 유형을 바탕으로, 학생이 선택한 교과 개념을 실제 문제 해결 구조로 연결하고 원리-적용-한계-심화 흐름으로 8문단 보고서 초안을 생성한다.",
      "referenceCandidates": [
        "동아사이언스(2024). \"취권 하는 中 휴머노이드…'긴 동작 이어져 놀라워'…산업용 로봇은 별개\". https://www.dongascience.com",
        "Vukobratović, M., & Borovac, B. (2004). \"Zero-Moment Point — Thirty Five Years of Its Life.\" International Journal of Humanoid Robotics, 1(1), 157-173.",
        "Siciliano, B., Sciavicco, L., Villani, L., & Oriolo, G. (2009). Robotics: Modelling, Planning and Control. Springer.",
        "Schulman, J. et al. (2017). \"Proximal Policy Optimization Algorithms.\" arXiv:1707.06347.",
        "Kumar, V. et al. (2023). \"Learning Agile Soccer Skills for a Bipedal Robot with Deep Reinforcement Learning.\" Science Robotics, 8(80)."
      ],
      "qualityNotes": "ZMP 수식, 뉴턴-오일러 역동학 방정식, Jacobian/의사역행렬, 취권 기사 제목·날짜, 참고문헌 서지정보"
    },
    {
      "seedId": "RPT-032",
      "stage": "stage7",
      "stageStatus": "partial",
      "seedName": "산불은 기후의 결과이자 원인 — 탄소중립 너머의 환경공학적 해법",
      "studentFacingLabel": "산불을 기후변화의 결과이자 원인으로 보고, 대기·탄소·토양·수질·생태계를 연결한 환경공학적 대응 전략을 설계한 보고서.",
      "fusionType": "환경공학·기후과학·대기과학·수문학·생태학",
      "corePattern": "기후변화 심화 → 산불 증가 → 탄소·에어로졸 대량 배출 → 대기·수질·토양 피해 확산 → 다시 기후위기 심화 → 복합 적응 전략 설계",
      "problemFrame": "산불은 단순한 자연재해인가, 아니면 기후 시스템 전체를 다시 흔드는 피드백 구조인가? 왜 탄소중립만으로는 충분하지 않은가?",
      "conceptRole": "기후-산불 피드백 루프, 대기 에어로졸, 탄소플럭스, 산불 위험도 모델링, 산불 후 토양 침식과 수질 오염, 복합 적응 전략",
      "analysisMethod": "사례 기반 문제 인식 → 핵심 개념·원리 설명 → 실제 적용 과정 구조화 → 교과 연계와 심화 탐구 제안",
      "bestForSubjects": [
        "통합과학",
        "지구과학",
        "화학",
        "생명과학",
        "환경 관련 탐구",
        "사회문제 탐구"
      ],
      "bestForMajors": [
        "환경공학과",
        "환경과학과",
        "산림자원학과",
        "생태학과",
        "기후에너지 관련 전공",
        "토목·수자원 계열"
      ],
      "axisTriggers": [
        "기후-산불 피드백 루프",
        "대기 에어로졸",
        "탄소플럭스",
        "산불 위험도 모델링",
        "산불 후 토양 침식과 수질 오염",
        "복합 적응 전략"
      ],
      "topicSynthesisFormula": "기후변화 + 산불 재난 + 탄소배출 + 대기·수질 영향 + 환경공학적 통합 대응",
      "avoid": [
        "산불을 단순 화재 사건으로만 설명",
        "탄소배출 감소만 강조",
        "환경 문제를 대기오염 한 축으로만 축소",
        "예방·적응·복원 전략 없이 문제 진단만 함"
      ],
      "miniPromptFragment": "산불은 기후의 결과이자 원인 — 탄소중립 너머의 환경공학적 해법 보고서 유형을 바탕으로, 학생이 선택한 교과 개념을 실제 문제 해결 구조로 연결하고 원리-적용-한계-심화 흐름으로 8문단 보고서 초안을 생성한다.",
      "referenceCandidates": [
        "동아사이언스(2024). \"[과기원NOW] 기후가 키운 산불, 탄소중립만으로는 못 막는다\". https://www.dongascience.com",
        "Abatzoglou, J. T., & Williams, A. P. (2016). \"Impact of anthropogenic climate change on wildfire across western US forests.\" PNAS, 113(42), 11770-11775.",
        "Jones, M. W. et al. (2022). \"Global and regional trends and drivers of fire under climate change.\" Reviews of Geophysics, 60(3), e2020RG000726.",
        "IPCC (2022). Climate Change 2022: Impacts, Adaptation and Vulnerability. Contribution of Working Group II to the Sixth Assessment Report.",
        "국립산림과학원(2023). \"기후변화 시나리오에 따른 한국 산불 위험도 전망 보고서\". https://www.nifos.go.kr"
      ],
      "qualityNotes": "산불 배출량 수치, PM2.5 수치, 캐나다 사례 수치, FWI/PDSI 식, 일부 보고서·논문 서지정보"
    },
    {
      "seedId": "RPT-033",
      "stage": "stage7",
      "stageStatus": "partial",
      "seedName": "투명 실리콘 메타렌즈: 초박형 광학의 미래를 열다",
      "studentFacingLabel": "나노구조로 빛의 위상과 진행 방향을 제어하는 메타렌즈와 투명 실리콘 박막을 통해 초박형 광학기기 구현 가능성을 분석한 보고서.",
      "fusionType": "물리·광학·나노소재·반도체공정·전자기기",
      "corePattern": "기존 렌즈 한계 인식 → 메타렌즈 원리 이해 → 나노구조를 통한 빛의 위상 제어 → 투명 실리콘 박막 제조 → 스마트폰·AR/VR·바이오센서 적용 가능성 분석",
      "problemFrame": "기존 렌즈의 두께와 무게 한계를 어떻게 극복할 수 있으며, 나노구조 기반 메타렌즈는 왜 차세대 광학기기의 핵심 기술이 되는가?",
      "conceptRole": "메타렌즈, 투명 실리콘 박막, 나노구조, 플라즈마 증착, 증강현실(AR), 가상현실(VR)",
      "analysisMethod": "사례 기반 문제 인식 → 핵심 개념·원리 설명 → 실제 적용 과정 구조화 → 교과 연계와 심화 탐구 제안",
      "bestForSubjects": [
        "물리학Ⅰ·Ⅱ",
        "화학",
        "정보",
        "통합과학",
        "과학탐구실험",
        "공학 일반"
      ],
      "bestForMajors": [
        "물리학과",
        "광학공학과",
        "신소재공학과",
        "반도체공학과",
        "전기전자공학과",
        "나노공학과",
        "디스플레이공학 관련 전공"
      ],
      "axisTriggers": [
        "메타렌즈",
        "투명 실리콘 박막",
        "나노구조",
        "플라즈마 증착",
        "증강현실(AR)",
        "가상현실(VR)"
      ],
      "topicSynthesisFormula": "기존 광학기기 한계 + 나노구조 설계 + 빛의 위상 제어 + 반도체 박막 공정 + 차세대 전자기기 적용",
      "avoid": [
        "메타렌즈를 단순히 얇은 렌즈로만 설명",
        "나노구조와 위상 제어 생략",
        "응용만 나열하고 광학 원리 설명 부족",
        "소재·공정 설명 없이 장점만 강조"
      ],
      "miniPromptFragment": "투명 실리콘 메타렌즈: 초박형 광학의 미래를 열다 보고서 유형을 바탕으로, 학생이 선택한 교과 개념을 실제 문제 해결 구조로 연결하고 원리-적용-한계-심화 흐름으로 8문단 보고서 초안을 생성한다.",
      "referenceCandidates": [
        "머리카락보다 얇은 렌즈, 투명 실리콘으로 만든다 - 동아사이언스",
        "https://www.dongascience.com/news/view/76435",
        "노준석 포스텍 교수 연구팀, 투명 실리콘 기반 초박형 메타렌즈 개발 성공 - 한국연구재단 보도자료",
        "https://www.nrf.re.kr/policy/ccprt/view?nts_no=211612&menu_no=182&prev_no=211613",
        "'메타렌즈' 기술 개발 동향…스마트폰 '카툭튀' 없앤다 - 디지털투데이",
        "https://www.digitaltoday.co.kr/news/articleView.html?idxno=471842",
        "메타렌즈: 미래 광학계를 바꿀 혁신 기술 - 삼성 반도체 이야기",
        "https://www.samsungsemistory.com/2693",
        "초박막 메타렌즈를 이용한 비구면 광학계 설계 및 구현(학술논문 등)"
      ],
      "qualityNotes": "메타렌즈 성능 수치, 투명 실리콘 박막 연구 자료, URL·기관 보도자료 정확도"
    }
  ]
};
