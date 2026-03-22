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
      `${subject}의 ${unit}에서 다루는 원리가 실제 문제 이해에 어떻게 연결될 수 있는가`,
      `${subunit} 개념을 학교 수업 안에서 해석해 보면 어떤 탐구 질문이 자연스러운가`,
      concepts[0] ? `${concepts[0]}를 비교·분석 관점에서 읽어볼 수 있는 방법은 무엇인가` : "",
      topics[0] ? `${topics[0]}를 학생 수준의 탐구 질문으로 바꾸면 어떤 접근이 가능한가` : ""
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
        action: `${subject} ${unit}의 핵심 개념을 교과서 기준으로 다시 정리하고 주요 용어 관계를 파악하기`,
        example: concepts[0]
          ? `${concepts[0]}의 정의, 작동 조건, 관련 변수의 관계를 정리`
          : `${subunit}의 기본 원리를 개념 노트 형태로 구조화`,
        report_point: "단순 요약보다 개념 간 관계와 해석 관점을 드러내기"
      },
      {
        stage: "확장",
        level: "교과서-사례 연결",
        action: `교과 개념을 실제 사례와 연결해 볼 수 있는 질문 2~3개를 세우기`,
        example: topics[0]
          ? `${topics[0]}와 연결되는 사례를 기사·보고서 수준에서 비교`
          : `${subunit}이 적용되는 사례 2개를 비교 정리`,
        report_point: "사례 선정 이유와 교과 개념 연결 근거를 함께 적기"
      },
      {
        stage: "심화",
        level: "해석 구조화",
        action: `${profile.main_track} 관점에서 어떤 변수와 비교 기준으로 읽을 수 있는지 해석 틀 만들기`,
        example: seeds[0]
          ? `${seeds[0]}를 바탕으로 비교표 또는 해석 프레임 구성`
          : `변수 2~3개를 두고 관계를 비교하는 표 작성`,
        report_point: "결과 단정보다 해석 기준과 근거를 중심으로 정리하기"
      },
      {
        stage: "정리",
        level: "학생부형 정돈",
        action: `탐구 동기 → 교과 개념 연결 → 해석 포인트 → 확장 가능성 순으로 정리하기`,
        example: `${subject}에서 보인 관심과 해석 흐름을 과정 중심 문장으로 정돈`,
        report_point: "무엇을 했는지보다 어떻게 읽고 연결했는지를 강조하기"
      }
    ];
  }

  function buildRecommendedOutputs(match, profile) {
    const concepts = unique(match?.core_concepts || []).slice(0, 3);
    const topics = unique(match?.recommended_topics || []).slice(0, 3);

    return unique([
      `${match.subject} 개념-사례 연결 정리표`,
      `${match.unit} 핵심 개념 해석 노트`,
      concepts[0] ? `${concepts[0]} 비교 분석표` : "",
      topics[0] ? `${topics[0]} 관련 자료 요약 카드` : "",
      `${profile.main_track} 연결 관점 메모`
    ]).filter(Boolean);
  }

  function buildRecordSentenceSeeds(match, profile) {
    const concepts = unique(match?.core_concepts || []).slice(0, 3);
    const topics = unique(match?.recommended_topics || []).slice(0, 2);
    const seeds = unique(match?.record_seeds || []).slice(0, 2);

    return unique([
      `${match.subject} 수업에서 ${concepts[0] || match.subunit} 개념을 바탕으로 탐구 질문을 설정하고, 관련 사례를 조사하여 개념 적용 가능성을 해석함.`,
      `${profile.main_track} 관심과 연결해 ${topics[0] || match.unit} 주제를 확장하고, 자료 비교를 통해 해석의 근거를 정리함.`,
      seeds[0]
        ? `${seeds[0]}를 중심으로 탐구 흐름을 구조화하며 개념과 사례의 연결 가능성을 점검함.`
        : `탐구 과정에서 비교 기준과 해석 관점을 스스로 세우며 과정 중심의 학업 태도를 드러냄.`
    ]).filter(Boolean);
  }

  function buildConsultingComment(match, profile) {
    return [
      `현재 매칭은 ${match.subject} - ${match.unit} - ${match.subunit} 축에서 가장 강하게 잡힙니다.`,
      `따라서 활동을 넓게 퍼뜨리기보다 ${profile.main_track} 방향 안에서 교과서 개념과 기존 기록을 반복 연결하는 구성이 자연스럽습니다.`,
      `핵심은 새로운 활동을 억지로 만드는 것보다, 이미 있는 관심을 수업·발표·탐구 장면에서 어떤 개념 언어로 해석할 수 있는지 분명히 하는 것입니다.`
    ].join(" ");
  }

  function buildTextbookConnection(match, profile) {
    const subject = match?.subject || "관련 과목";
    const unit = match?.unit || "관련 단원";
    const subunit = match?.subunit || "핵심 소단원";
    const concepts = unique(match?.core_concepts || []).slice(0, 4);
    const topicSeed = unique(match?.recommended_topics || []).slice(0, 2);
    const points = unique(match?.interpretation_points || []).slice(0, 2);

    const relatedUnits = unique([subject, unit, subunit]).filter(Boolean);
    const conceptSummary = concepts.length ? concepts.join(", ") : `${unit}의 핵심 개념`;
    const conceptLink = [
      `${subject}의 ${unit}${subunit ? ` - ${subunit}` : ""} 축에서 다루는 ${conceptSummary} 개념과 연결될 수 있음.`,
      points[0] ? `교과서에서는 특히 '${points[0]}'와 같은 해석 관점으로 읽어볼 수 있음.` : "",
      topicSeed[0] ? `${topicSeed[0]}와 같은 사례 축은 ${profile.main_track} 관심과 맞물려 작동 가능함.` : ""
    ].filter(Boolean).join(" ");

    return {
      related_units: relatedUnits,
      core_concepts: concepts,
      concept_link: conceptLink
    };
  }

  function buildSchoolScene(match, profile) {
    const subject = match?.subject || "관련 과목";
    const unit = match?.unit || "관련 단원";
    const concepts = unique(match?.core_concepts || []).slice(0, 3);
    const topicSeed = unique(match?.recommended_topics || []).slice(0, 2);
    const firstConcept = concepts[0] || unit;

    return unique([
      `수업에서 ${firstConcept} 개념을 설명할 때 기존 관심 주제와 연결해 해석해 볼 수 있음.`,
      `수행평가에서는 ${unit} 개념을 단순 정리보다 비교·분석 관점으로 드러내는 장면에서 작동할 수 있음.`,
      `발표나 탐구활동에서는 ${topicSeed[0] || unit} 사례를 통해 ${profile.main_track} 관심과 교과 개념을 묶어 설명하는 흐름으로 연결 가능함.`,
      `${subject} 세특에서는 새로운 결과보다 개념을 실제 사례와 연결해 읽어내는 과정이 포인트로 작용할 수 있음.`
    ]).filter(Boolean);
  }

  function createExtensionPlan(match, studentInput = {}, options = {}) {
    const profile = inferTrackProfile(studentInput, [match]);
    const textbookConnection = buildTextbookConnection(match, profile);
    const schoolScene = buildSchoolScene(match, profile);

    return {
      source_match: {
        subject: match.subject || "",
        unit: match.unit || "",
        subunit: match.subunit || "",
        score: Number(match.score || 0),
        matched_keywords: unique(match.matched_keywords || [])
      },
      track_profile: profile,
      textbook_connection: textbookConnection,
      school_scene: schoolScene,
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
      return '<div class="empty-box">확장 연결 안내 결과가 없습니다.</div>';
    }

    return items.map((plan, index) => {
      const roadmapHtml = ensureArray(plan.roadmap).map(step => `
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
          <div style="font-size:12px;color:#667085;font-weight:800">${step.stage} · ${step.level}</div>
          <div style="margin-top:6px;font-weight:800">${step.action}</div>
          <div style="margin-top:6px;line-height:1.6"><b>예시</b>: ${step.example}</div>
          <div style="margin-top:4px;line-height:1.6"><b>정리 포인트</b>: ${step.report_point}</div>
        </div>
      `).join("");

      const qHtml = ensureArray(plan.inquiry_questions).map(q => `<li>${q}</li>`).join("");
      const outHtml = ensureArray(plan.recommended_outputs).map(q => `<li>${q}</li>`).join("");
      const seedHtml = ensureArray(plan.record_sentence_seeds).map(q => `<li>${q}</li>`).join("");
      const sceneHtml = ensureArray(plan.school_scene).map(q => `<li>${q}</li>`).join("");
      const unitHtml = ensureArray(plan.textbook_connection?.related_units).map(q => `<li>${q}</li>`).join("");
      const conceptHtml = ensureArray(plan.textbook_connection?.core_concepts).map(q => `<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:#eef4ff;border:1px solid #dbe7ff;margin:0 6px 6px 0;font-size:12px;font-weight:700">${q}</span>`).join("");

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

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
              <div style="font-weight:900;margin-bottom:8px">교과서 연결 근거</div>
              <div style="line-height:1.7;margin-bottom:8px">${plan.textbook_connection?.concept_link || "-"}</div>
              <div style="font-size:13px;font-weight:800;color:#475467;margin:8px 0 6px">관련 축</div>
              <ul style="margin:0;padding-left:18px;line-height:1.7">${unitHtml}</ul>
              <div style="font-size:13px;font-weight:800;color:#475467;margin:10px 0 6px">핵심 개념</div>
              <div>${conceptHtml || "-"}</div>
            </div>
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
              <div style="font-weight:900;margin-bottom:8px">학교 안에서 작동 가능한 장면</div>
              <ul style="margin:0;padding-left:18px;line-height:1.7">${sceneHtml}</ul>
            </div>
          </div>

          <div style="margin-top:14px">
            <div style="font-weight:900;margin-bottom:8px">탐구 질문</div>
            <ul style="margin:0;padding-left:18px;line-height:1.7">${qHtml}</ul>
          </div>

          <div style="margin-top:14px">
            <div style="font-weight:900;margin-bottom:8px">연결 안내 로드맵</div>
            <div style="display:grid;gap:10px">${roadmapHtml}</div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
              <div style="font-weight:900;margin-bottom:8px">정리해 볼 수 있는 산출물</div>
              <ul style="margin:0;padding-left:18px;line-height:1.7">${outHtml}</ul>
            </div>
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
              <div style="font-weight:900;margin-bottom:8px">학생부에서 읽힐 수 있는 포인트</div>
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
    toHtml,
    buildTextbookConnection,
    buildSchoolScene
  };
})();
