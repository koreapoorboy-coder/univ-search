(function () {
  "use strict";

  function ensureArray(value) {
    if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined);
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function unique(arr) {
    return [...new Set(ensureArray(arr).map(v => String(v).trim()).filter(Boolean))];
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\/|·,:;()[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pickTopMatches(matchResults, topN = 5) {
    return ensureArray(matchResults)
      .slice()
      .sort((a, b) => (Number(b.score || 0) - Number(a.score || 0)))
      .slice(0, topN);
  }

  function inferTrackProfile(studentInput = {}, matchResults = []) {
    const allText = normalizeText([
      ...(studentInput.track_keywords || []),
      ...(studentInput.activity_keywords || []),
      ...(studentInput.selected_subjects || []),
      ...pickTopMatches(matchResults, 5).flatMap(item => [
        item.subject, item.unit, item.subunit,
        ...(item.core_concepts || []),
        ...(item.recommended_topics || []),
        ...(item.major_links || [])
      ])
    ].join(" "));

    const profile = {
      main_track: "일반 이공 탐구형",
      subject_bias: [],
      keywords: []
    };

    if (/배터리|전지|리튬|전고체|산화환원|전기화학|에너지/.test(allText)) {
      profile.main_track = "배터리·에너지형";
      profile.subject_bias = ["화학", "물리", "공학"];
      profile.keywords = ["산화환원", "전지", "에너지 전환", "안전성", "효율"];
      return profile;
    }

    if (/생명|세포|면역|유전|단백질|항상성|의학|의생명/.test(allText)) {
      profile.main_track = "생명·의생명형";
      profile.subject_bias = ["생명과학", "화학", "의생명"];
      profile.keywords = ["세포", "대사", "항상성", "유전정보", "질병 이해"];
      return profile;
    }

    if (/환경|기후|지구|해양|대기|재해|탄소|지질/.test(allText)) {
      profile.main_track = "환경·지구형";
      profile.subject_bias = ["지구과학", "환경", "데이터 분석"];
      profile.keywords = ["기후", "지질", "탄소순환", "재해", "환경 변화"];
      return profile;
    }

    if (/ai|인공지능|알고리즘|정보|보안|데이터|행렬|모델링/.test(allText)) {
      profile.main_track = "AI·정보형";
      profile.subject_bias = ["정보", "수학", "데이터"];
      profile.keywords = ["알고리즘", "데이터", "모델링", "행렬", "최적화"];
      return profile;
    }

    if (/전자|전자기|반도체|회로|광학|파동/.test(allText)) {
      profile.main_track = "반도체·전자형";
      profile.subject_bias = ["물리", "전자", "재료"];
      profile.keywords = ["전자기", "회로", "파동", "반도체", "소자"];
      return profile;
    }

    return profile;
  }

  function buildQuestionSeeds(match) {
    const subject = match?.subject || "관련 과목";
    const unit = match?.unit || "관련 단원";
    const subunit = match?.subunit || "핵심 소단원";
    const concepts = unique(match?.core_concepts || []).slice(0, 3);
    const topics = unique(match?.recommended_topics || []).slice(0, 3);

    return unique([
      `${subject}의 ${unit}에서 다루는 원리가 실제 문제 해결에 어떻게 적용되는가`,
      `${subunit} 개념을 실생활 사례와 연결하면 어떤 탐구 질문을 만들 수 있는가`,
      concepts[0] ? `${concepts[0]}를 정량적으로 비교·분석할 수 있는 방법은 무엇인가` : "",
      topics[0] ? `${topics[0]}를 학생 수준의 탐구로 변환하면 어떤 실험·조사 설계가 가능한가` : ""
    ]).filter(Boolean);
  }

  function buildActivityRoadmap(match, profile) {
    const subject = match?.subject || "관련 과목";
    const unit = match?.unit || "관련 단원";
    const subunit = match?.subunit || "핵심 소단원";
    const concepts = unique(match?.core_concepts || []).slice(0, 4);
    const topics = unique(match?.recommended_topics || []).slice(0, 4);
    const seeds = unique(match?.record_seeds || []).slice(0, 4);

    return [
      {
        stage: "출발",
        level: "개념 확인",
        action: `${subject} ${unit}의 핵심 개념을 교과서 기준으로 다시 정리하고 용어 정의를 정확히 잡기`,
        example: concepts[0]
          ? `${concepts[0]}의 정의, 원리, 조건을 표로 정리`
          : `${subunit}의 기본 원리를 한 페이지 개념 노트로 정리`,
        report_point: "단순 요약이 아니라 핵심 변수와 개념 간 관계를 드러내기"
      },
      {
        stage: "확장",
        level: "자료 조사",
        action: `교과 개념을 실제 사례와 연결하여 조사 질문 2~3개 설계`,
        example: topics[0]
          ? `${topics[0]}와 연결되는 사례를 기사·보고서·논문 요약 자료로 비교`
          : `${subunit}이 적용되는 산업·기술 사례 2개 비교`,
        report_point: "왜 이 사례를 골랐는지 선정 이유를 명확히 쓰기"
      },
      {
        stage: "심화",
        level: "분석·설계",
        action: `${profile.main_track} 관점에서 변수 설정, 비교 기준, 해석 틀 만들기`,
        example: seeds[0]
          ? `${seeds[0]}를 바탕으로 실험/조사 설계 초안 작성`
          : `변인 2~3개를 두고 비교표 또는 간단한 데이터 분석표 작성`,
        report_point: "결과보다 설계 논리와 해석 근거를 중심으로 쓰기"
      },
      {
        stage: "완성",
        level: "학생부형 정리",
        action: `탐구 동기 → 개념 적용 → 분석 결과 → 확장 가능성 순으로 보고서 문장화`,
        example: `${subject} 세특에 들어갈 수 있도록 과정 중심 문장 3~4문장으로 정리`,
        report_point: "‘무엇을 했다’보다 ‘어떻게 검토하고 왜 해석했는가’를 강조"
      }
    ];
  }

  function buildRecommendedOutputs(match, profile) {
    const concepts = unique(match?.core_concepts || []).slice(0, 3);
    const topics = unique(match?.recommended_topics || []).slice(0, 3);

    return unique([
      `${match.subject} 탐구 보고서 1차 설계안`,
      `${match.unit} 개념-사례 연결표`,
      concepts[0] ? `${concepts[0]} 비교 분석표` : "",
      topics[0] ? `${topics[0]} 관련 자료 요약 카드` : "",
      `${profile.main_track} 연계 세특 문장 초안`
    ]).filter(Boolean);
  }

  function buildRecordSentenceSeeds(match, profile) {
    const concepts = unique(match?.core_concepts || []).slice(0, 3);
    const topics = unique(match?.recommended_topics || []).slice(0, 2);
    const seeds = unique(match?.record_seeds || []).slice(0, 2);

    return unique([
      `${match.subject} 수업에서 ${concepts[0] || match.subunit} 개념을 바탕으로 탐구 질문을 설정하고, 관련 사례를 조사하여 개념 적용 가능성을 분석함.`,
      `${profile.main_track} 관심과 연결해 ${topics[0] || match.unit} 주제를 확장하고, 자료 비교를 통해 해석의 근거를 정리함.`,
      seeds[0]
        ? `${seeds[0]}를 중심으로 수행 과정을 구조화하며 탐구의 타당성과 확장 방향을 스스로 점검함.`
        : `탐구 과정에서 변수 설정과 해석 기준을 스스로 세우며 과정 중심의 학업 태도를 보임.`
    ]).filter(Boolean);
  }

  function buildConsultingComment(match, profile) {
    return [
      `현재 매칭은 ${match.subject} - ${match.unit} - ${match.subunit} 축에서 가장 강하게 잡힙니다.`,
      `따라서 활동은 넓게 퍼뜨리기보다 ${profile.main_track} 방향으로 한 축을 반복 심화하는 구성이 유리합니다.`,
      `보고서는 개념 정리형에서 끝내지 말고, 사례 비교 또는 변수 분석이 들어가야 학생부 설득력이 생깁니다.`
    ].join(" ");
  }

  function createExtensionPlan(match, studentInput = {}, options = {}) {
    const profile = inferTrackProfile(studentInput, [match]);
    return {
      source_match: {
        subject: match.subject || "",
        unit: match.unit || "",
        subunit: match.subunit || "",
        score: Number(match.score || 0),
        matched_keywords: unique(match.matched_keywords || [])
      },
      track_profile: profile,
      inquiry_questions: buildQuestionSeeds(match),
      roadmap: buildActivityRoadmap(match, profile),
      recommended_outputs: buildRecommendedOutputs(match, profile),
      record_sentence_seeds: buildRecordSentenceSeeds(match, profile),
      consulting_comment: buildConsultingComment(match, profile)
    };
  }

  function generateExtensionPlans(studentInput = {}, matchResults = [], options = {}) {
    const topN = Number(options.topN || 3);
    const topMatches = pickTopMatches(matchResults, topN);
    return topMatches.map(match => createExtensionPlan(match, studentInput, options));
  }

  function toHtml(plans) {
    const items = ensureArray(plans);
    if (!items.length) {
      return '<div class="empty-box">확장 활동 추천 결과가 없습니다.</div>';
    }

    return items.map((plan, index) => {
      const roadmapHtml = ensureArray(plan.roadmap).map(step => `
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
          <div style="font-size:12px;color:#667085;font-weight:800">${step.stage} · ${step.level}</div>
          <div style="margin-top:6px;font-weight:800">${step.action}</div>
          <div style="margin-top:6px;line-height:1.6"><b>예시</b>: ${step.example}</div>
          <div style="margin-top:4px;line-height:1.6"><b>보고서 포인트</b>: ${step.report_point}</div>
        </div>
      `).join("");

      const qHtml = ensureArray(plan.inquiry_questions).map(q => `<li>${q}</li>`).join("");
      const outHtml = ensureArray(plan.recommended_outputs).map(q => `<li>${q}</li>`).join("");
      const seedHtml = ensureArray(plan.record_sentence_seeds).map(q => `<li>${q}</li>`).join("");

      return `
        <section style="border:1px solid #dfe3ea;border-radius:18px;padding:18px;background:#fff;margin:0 0 14px">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
            <div>
              <div style="font-size:18px;font-weight:900">${index + 1}. ${plan.source_match.subject}</div>
              <div style="margin-top:4px;color:#475467;font-weight:700">${plan.source_match.unit}</div>
              <div style="margin-top:3px;color:#667085">${plan.source_match.subunit}</div>
            </div>
            <div style="min-width:52px;height:52px;border-radius:14px;background:#1f3c88;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900">
              ${plan.source_match.score}
            </div>
          </div>

          <div style="margin-top:12px;padding:12px;border:1px solid #e7ecf3;border-radius:12px;background:#f8fbff;line-height:1.7">
            <div><b>진로 프로필</b>: ${plan.track_profile.main_track}</div>
            <div><b>핵심 키워드</b>: ${ensureArray(plan.track_profile.keywords).join(", ") || "-"}</div>
            <div><b>매칭 키워드</b>: ${ensureArray(plan.source_match.matched_keywords).join(", ") || "-"}</div>
          </div>

          <div style="margin-top:14px">
            <div style="font-weight:900;margin-bottom:8px">탐구 질문</div>
            <ul style="margin:0;padding-left:18px;line-height:1.7">${qHtml}</ul>
          </div>

          <div style="margin-top:14px">
            <div style="font-weight:900;margin-bottom:8px">로드맵</div>
            <div style="display:grid;gap:10px">${roadmapHtml}</div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
              <div style="font-weight:900;margin-bottom:8px">추천 산출물</div>
              <ul style="margin:0;padding-left:18px;line-height:1.7">${outHtml}</ul>
            </div>
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
              <div style="font-weight:900;margin-bottom:8px">세특 문장 씨앗</div>
              <ul style="margin:0;padding-left:18px;line-height:1.7">${seedHtml}</ul>
            </div>
          </div>

          <div style="margin-top:14px;padding:12px;border-radius:12px;background:#fff8ee;border:1px solid #f0dfbf;line-height:1.7">
            <b>컨설팅 해석</b>: ${plan.consulting_comment}
          </div>
        </section>
      `;
    }).join("");
  }

  window.StudentTextbookExtensionEngine = {
    normalizeText,
    inferTrackProfile,
    createExtensionPlan,
    generateExtensionPlans,
    toHtml
  };
})();
