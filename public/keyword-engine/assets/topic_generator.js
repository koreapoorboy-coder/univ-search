window.__TOPIC_GENERATOR_VERSION = "v25.0-book-payload-bridge";

(function(){
  const BOOK_URLS = [
    "seed/book-engine/mini_book_engine_books_starter.json"
  ];
  const REPORT_CARD_URLS = [
    "seed/book-report-cards/book_report_cards_active_draft_v1.json"
  ];
  const MASTER_BOOK_URLS = [
    "seed/book-engine/source/book_master_integrated_v1.json",
    "../book-engine/source/book_master_integrated_v1.json",
    "book-engine/source/book_master_integrated_v1.json"
  ];
  const FILTER_URLS = [
    "seed/book-engine/book_recommendation_filter_mapping.json"
  ];
  const LOOKUP_URLS = [
    "seed/book-engine/archive/book_engine_lookup_70.json",
    "seed/book-engine/book_engine_lookup_70.json"
  ];
  const TOPIC_MATRIX_URLS = [
    "seed/textbook-v1/topic_matrix_seed.json",
    "seed/topic_matrix_seed.json"
  ];

  const DEFAULT_MODE_OPTIONS = [
    { id: "principle", label: "원리 파악형", desc: "핵심 개념이 왜 성립하는지 설명합니다." },
    { id: "compare", label: "비교 분석형", desc: "두 사례나 조건의 차이를 비교합니다." },
    { id: "data", label: "데이터 확장형", desc: "자료·수치·그래프를 해석하며 확장합니다." },
    { id: "application", label: "사례 적용형", desc: "실생활·산업 사례에 적용합니다." },
    { id: "major", label: "전공 확장형", desc: "희망 진로와 직접 연결해 정리합니다." }
  ];
  const DEFAULT_VIEW_OPTIONS = ["원리", "구조", "기능", "변화", "비교", "효율", "데이터"];

  let books = [];
  let reportCards = [];
  let filterMap = { subject_keyword_rules: [] };
  let lookup = { career_index: {}, subject_index: {}, theme_index: {} };
  let topicMatrix = null;
  let loaded = false;

  function esc(v){
    return String(v || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()\-_/·.,]/g, "");
  }

  function fuzzyIncludes(base, target){
    const a = normalize(base);
    const b = normalize(target);
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a);
  }

  function uniq(arr){
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function coerceArray(value){
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function normalizeCardToBook(card){
    if (!card || typeof card !== "object") return null;
    const direct = card.direct_match || {};
    const expand = card.expand_reference || {};
    const conceptRoutes = coerceArray(card.concept_bridges).map(bridge => ({
      subject: bridge?.subject || "",
      concept: bridge?.concept || "",
      micro_keywords: coerceArray(bridge?.micro_keywords),
      why_linked: bridge?.why_linked || "",
      activity_types: coerceArray(bridge?.activity_types),
      career_bridge: coerceArray(bridge?.career_bridge)
    }));
    const reportModes = coerceArray(card.report_modes).map(v => v === "case" ? "application" : (v === "career" ? "major" : v));
    const linkedSubjects = uniq([
      ...coerceArray(direct.subjects),
      ...coerceArray(expand.subjects),
      ...coerceArray(card.related_subjects_highschool),
      ...coerceArray(card.linked_subjects_runtime)
    ]);
    const linkedMajors = uniq([
      ...coerceArray(direct.majors),
      ...coerceArray(expand.majors),
      ...coerceArray(card.related_majors),
      ...coerceArray(card.linked_majors_runtime)
    ]);
    const axisProfile = card.axis_profile || {
      primary_axis: card.primary_axis || "",
      secondary_axes: coerceArray(card.secondary_axes),
      axis_domains: coerceArray(card.axis_domains)
    };
    const coreSummary = String(card.selection_summary || card.summary_short || "").trim();
    const coreKeywords = uniq([
      ...coerceArray(card.core_keywords),
      ...coerceArray(card.fit_keywords_raw),
      ...coerceArray(card.fit_keywords),
      ...coerceArray(direct.keywords),
      ...coerceArray(expand.fit_keywords)
    ]);
    return {
      book_id: card.book_id || card.book_uid || card.source_book_uid || "",
      source_book_uid: card.source_book_uid || card.book_uid || card.book_id || "",
      title: card.title || "",
      author: card.author || (Array.isArray(card.authors) ? card.authors.join(', ') : ""),
      publisher: card.publisher || "",
      status: card.status || "active",
      summary_short: coreSummary,
      book_core_summary: coreSummary,
      linked_subjects: linkedSubjects,
      linked_majors: linkedMajors,
      related_subjects_highschool: coerceArray(card.related_subjects_highschool),
      related_majors: coerceArray(card.related_majors || card.linked_majors_runtime),
      related_majors_runtime: coerceArray(card.linked_majors_runtime),
      fit_keywords: uniq([...coerceArray(card.fit_keywords_raw), ...coerceArray(direct.keywords), ...coerceArray(expand.fit_keywords)]),
      broad_theme: uniq([...coerceArray(card.recommended_themes_raw), ...coerceArray(expand.themes), ...coerceArray(card.broad_theme_runtime)]),
      book_keywords: coreKeywords,
      core_keywords: coreKeywords,
      engine_subject_routes: conceptRoutes,
      connectable_concepts: uniq([...coerceArray(direct.concepts), ...conceptRoutes.map(route => route.concept)]),
      book_content_points: coerceArray(card.book_content_points),
      book_format: coerceArray(card.book_format),
      book_approach: card.book_approach || "",
      fit_modes: reportModes,
      report_modes: reportModes,
      perspectives: uniq(coerceArray(card.perspectives)),
      report_lines: uniq(coerceArray(card.report_lines)),
      question_seeds: uniq(coerceArray(card.question_seeds)),
      evidence_types: uniq(coerceArray(card.evidence_types)),
      direct_match: direct,
      expand_reference: expand,
      axis_profile: axisProfile,
      ui_hints: card.ui_hints || {},
      card_version: card.card_version || "integrated_v1",
      selection_summary: coreSummary
    };
  }

  function buildFallbackBookId(book, index){
    const uid = String(book?.book_uid || book?.source_book_uid || book?.catalog_no || '').trim();
    if (uid) return uid;
    const title = String(book?.title || '').trim();
    if (title) return `book_auto_${normalize(title).slice(0, 40)}`;
    return `book_auto_${index}`;
  }

  function normalizeIntegratedMasterBook(book, index){
    if (!book || typeof book !== "object") return null;
    const conceptRoutes = coerceArray(book.concept_bridges).map(bridge => ({
      subject: bridge?.subject || "",
      concept: bridge?.concept || "",
      micro_keywords: coerceArray(bridge?.micro_keywords),
      why_linked: bridge?.why_linked || "",
      activity_types: coerceArray(bridge?.activity_types),
      career_bridge: coerceArray(bridge?.career_bridge)
    }));
    return {
      ...book,
      book_id: String(book.book_id || '').trim() || buildFallbackBookId(book, index),
      source_book_uid: String(book.source_book_uid || book.book_uid || '').trim() || buildFallbackBookId(book, index),
      summary_short: String(book.summary_short || book.selection_summary || '').trim(),
      book_core_summary: String(book.book_core_summary || book.selection_summary || book.summary_short || '').trim(),
      linked_subjects: uniq([
        ...coerceArray(book.linked_subjects),
        ...coerceArray(book.linked_subjects_runtime),
        ...coerceArray(book?.direct_match?.subjects),
        ...coerceArray(book?.expand_reference?.subjects),
        ...conceptRoutes.map(route => route.subject)
      ]),
      linked_majors: uniq([
        ...coerceArray(book.linked_majors),
        ...coerceArray(book.linked_majors_runtime),
        ...coerceArray(book?.direct_match?.majors),
        ...coerceArray(book?.expand_reference?.majors)
      ]),
      related_majors: uniq([
        ...coerceArray(book.related_majors),
        ...coerceArray(book.linked_majors_runtime),
        ...coerceArray(book.bridge_major_candidates)
      ]),
      fit_keywords: uniq([
        ...coerceArray(book.fit_keywords),
        ...coerceArray(book.fit_keywords_raw),
        ...coerceArray(book?.direct_match?.keywords),
        ...coerceArray(book?.expand_reference?.fit_keywords)
      ]),
      broad_theme: uniq([
        ...coerceArray(book.broad_theme),
        ...coerceArray(book.broad_theme_runtime),
        ...coerceArray(book.recommended_themes_raw),
        ...coerceArray(book?.expand_reference?.themes)
      ]),
      book_keywords: uniq([
        ...coerceArray(book.book_keywords),
        ...coerceArray(book.fit_keywords_raw),
        ...coerceArray(book.recommended_themes_raw),
        ...coerceArray(book.inquiry_points_raw)
      ]),
      engine_subject_routes: conceptRoutes,
      connectable_concepts: uniq([
        ...coerceArray(book.connectable_concepts),
        ...coerceArray(book?.direct_match?.concepts),
        ...conceptRoutes.map(route => route.concept)
      ]),
      report_modes: uniq(coerceArray(book.report_modes).map(v => v === "case" ? "application" : (v === "career" ? "major" : v))),
      perspectives: uniq(coerceArray(book.perspectives)),
      report_lines: uniq(coerceArray(book.report_lines)),
      question_seeds: uniq(coerceArray(book.question_seeds)),
      evidence_types: uniq(coerceArray(book.evidence_types))
    };
  }

  function extractIntegratedBooks(data){
    if (!data || typeof data !== "object") return [];
    const list = Array.isArray(data?.books) ? data.books : [];
    return list
      .filter(book => book && typeof book === "object" && book.book_card_ready !== false)
      .map((book, index) => normalizeIntegratedMasterBook(book, index))
      .filter(Boolean);
  }

function getReportCardByBookId(bookId){
    return reportCards.find(card => card.book_id === bookId || card.source_book_uid === bookId) || null;
  }

  async function loadJSON(urls, fallback){
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        return await res.json();
      } catch (e) {
        // continue
      }
    }
    return fallback;
  }

  function detectCareerBucket(rawCareer){
    const career = String(rawCareer || "");
    if (!career) return "default";
    if (/(신소재|재료|반도체|배터리|에너지|화학공학|고분자|금속)/.test(career)) return "materials";
    if (/(기계|자동차|로봇|항공|모빌리티)/.test(career)) return "mechanical";
    if (/(전기|전자|회로|통신|전파)/.test(career)) return "electronic";
    if (/(컴퓨터|소프트웨어|인공지능|AI|데이터|보안|정보|통계|코딩|프로그래밍)/i.test(career)) return "it";
    if (/(간호|의학|의대|의예|치의|치과|한의|약학|보건|수의|생명|바이오|의료)/.test(career)) return "bio";
    if (/(환경|기후|지구|천문|우주|해양|지리)/.test(career)) return "env";
    if (/(경영|경제|회계|금융|마케팅|산업공학)/.test(career)) return "biz";
    if (/(행정|정치|법|사회|언론|미디어|철학|역사|국문|문학|교육)/.test(career)) return "humanities";
    return "default";
  }

  function tokenizeCareer(rawCareer){
    const career = String(rawCareer || "").trim();
    const tokens = [];
    career.split(/[\s,·/]+/).forEach(t => { if (t) tokens.push(t); });
    const expansions = {
      materials: ["신소재", "재료", "반도체", "배터리", "에너지", "화학공학"],
      mechanical: ["기계", "자동차", "로봇", "설계", "구조"],
      electronic: ["전자", "전기", "회로", "센서", "반도체"],
      it: ["컴퓨터", "소프트웨어", "데이터", "인공지능", "정보"],
      bio: ["생명", "바이오", "의학", "간호", "보건", "의료"],
      env: ["환경", "지구", "기후", "우주", "천문"],
      biz: ["경영", "경제", "산업", "최적화", "데이터"],
      humanities: ["사회", "윤리", "역사", "언어", "정책"]
    };
    const bucket = detectCareerBucket(career);
    return uniq(tokens.concat(expansions[bucket] || []));
  }

  function getMatchedRules(ctx){
    const subject = ctx?.selectedSubject || ctx?.subject || "";
    const concept = ctx?.selectedConcept || ctx?.concept || "";
    const keyword = ctx?.selectedKeyword || ctx?.keyword || "";
    const rules = Array.isArray(filterMap?.subject_keyword_rules) ? filterMap.subject_keyword_rules : [];

    return rules.filter(rule => {
      const subjectOk = !Array.isArray(rule.subjects) || rule.subjects.length === 0 || rule.subjects.some(v => fuzzyIncludes(v, subject));
      const conceptOk = !Array.isArray(rule.concepts) || rule.concepts.length === 0 || rule.concepts.some(v => fuzzyIncludes(v, concept));
      const keywordOk = !Array.isArray(rule.keywords) || rule.keywords.length === 0 || rule.keywords.some(v => fuzzyIncludes(v, keyword));
      return subjectOk && conceptOk && keywordOk;
    });
  }

  function getCareerLookupCandidates(career){
    const entries = lookup?.career_index || {};
    const raw = String(career || "").trim();
    const result = [];
    Object.entries(entries).forEach(([key, list]) => {
      if (fuzzyIncludes(raw, key)) {
        (list || []).forEach(item => result.push(item));
      }
    });
    return result;
  }

  function getKeywordProfile(keyword){
    const profiles = topicMatrix?.keywordProfiles || {};
    const target = String(keyword || "").trim();
    const key = Object.keys(profiles).find(k => fuzzyIncludes(k, target));
    return key ? profiles[key] : null;
  }

  function getCareerProfile(career){
    const profiles = topicMatrix?.careerProfiles || {};
    const bucket = detectCareerBucket(career);
    const map = {
      materials: ["재료공학", "전자공학"],
      mechanical: ["기계공학"],
      electronic: ["전자공학", "재료공학"],
      it: ["정보"],
      bio: ["생명과학 탐구"],
      env: ["_default"],
      biz: ["_default"],
      humanities: ["_default"],
      default: ["_default"]
    };
    for (const key of map[bucket] || ["_default"]) {
      if (profiles[key]) return profiles[key];
    }
    return profiles._default || null;
  }

  function getBookThemeArray(book){
    return uniq([
      ...(book?.fit_keywords || []),
      ...(book?.broad_theme || []),
      ...(book?.book_keywords || [])
    ]);
  }

  function getBucketPatterns(bucket){
    const map = {
      materials: {
        major: /(재료|신소재|반도체|배터리|에너지|화학공학|고분자|금속|물리|화학)/,
        theme: /(재료|구조|측정|단위|원소|에너지|기술|과학방법|정량|데이터)/,
        avoid: /(의학|질병|환자|간호|수의|치과|동물병원|약학|제약|의료기술|의료)/
      },
      mechanical: {
        major: /(기계|자동차|로봇|항공|모빌리티|설계|구조|물리)/,
        theme: /(구조|역학|진동|측정|단위|시스템|에너지|기술|정량|데이터)/,
        avoid: /(의학|질병|환자|간호|수의|치과|동물병원|약학|제약|의료기술|의료)/
      },
      electronic: {
        major: /(전자|전기|회로|센서|반도체|통신|전파|물리)/,
        theme: /(센서|전류|측정|단위|시스템|에너지|데이터|정확도|기술)/,
        avoid: /(의학|질병|환자|간호|수의|치과|동물병원|약학|제약|의료기술|의료)/
      },
      it: {
        major: /(컴퓨터|소프트웨어|데이터|인공지능|정보|통계|보안|전자)/,
        theme: /(데이터|정보|구조|시스템|알고리즘|정량|분석|기술)/,
        avoid: /(의학|질병|환자|수의|치과)/
      },
      bio: {
        major: /(의학|의예|치의|약학|보건|간호|수의|생명|바이오)/,
        theme: /(생명|건강|질병|항상성|의학|생체|반응)/,
        avoid: /(전쟁|국가|정치 체제)/
      },
      env: {
        major: /(환경|지구|지리|천문|우주|기후|해양)/,
        theme: /(지구|환경|우주|천체|기후|시스템|데이터)/,
        avoid: /(의학|질병|환자)/
      },
      default: {
        major: /.^/,
        theme: /.^/,
        avoid: /.^/
      }
    };
    return map[bucket] || map.default;
  }


  function getTrackPatterns(track){
    const map = {
      physics: {
        major: /(물리|전자|전기|기계|반도체|천문|재료|공학|수학)/,
        theme: /(힘|운동|전류|측정|센서|구조|에너지|진동|안정성|시스템|데이터|정량)/,
        subjects: /(물리학|통합과학1|공통수학1|공통수학2|정보)/
      },
      chemistry: {
        major: /(화학|재료|신소재|배터리|화학공학|반도체|에너지|공학)/,
        theme: /(원소|물질|산화|환원|결합|분류|재료|금속|반응|이온|분자|주기율)/,
        subjects: /(화학|통합과학1)/
      },
      biology: {
        major: /(생명|의학|간호|보건|바이오|수의|약학|의예)/,
        theme: /(생명|세포|항상성|자극|반응|건강|생체|질병)/,
        subjects: /(생명과학|통합과학1|윤리와사상)/
      },
      earth: {
        major: /(지구|환경|기후|천문|우주|해양|지리)/,
        theme: /(환경|기후|지구|천체|우주|관측|지구계|대기|수권)/,
        subjects: /(지구과학|통합과학1|통합사회)/
      }
    };
    return map[track] || null;
  }

  function getTrackAlignment(book, track){
    const patterns = getTrackPatterns(track);
    if (!patterns) return { score: 0, reasons: [], themeHit: false, majorHit: false };
    const majors = book?.linked_majors || [];
    const subjects = book?.linked_subjects || [];
    const themes = getBookThemeArray(book);
    const bag = `${book?.title || ""} ${book?.summary_short || ""}`;
    const majorHit = majors.some(v => patterns.major.test(v));
    const subjectHit = subjects.some(v => patterns.subjects.test(v));
    const themeHit = themes.some(v => patterns.theme.test(v)) || patterns.theme.test(bag);
    let score = 0;
    const reasons = [];
    if (majorHit) { score += 12; reasons.push("연계 축 적합"); }
    if (subjectHit) { score += 8; if (!reasons.includes("연계 축 적합")) reasons.push("연계 축 적합"); }
    if (themeHit) score += 10;
    if (!majorHit && !subjectHit && !themeHit) score -= 8;
    return { score, reasons, themeHit, majorHit, subjectHit };
  }
  function getSelectedAxisContext(ctx){
    const linkedSubjects = coerceArray(ctx?.linkedSubjects).map(v => String(v || "").trim()).filter(Boolean);
    const title = String(ctx?.selectedFollowupAxis || ctx?.followupAxisTitle || "").trim();
    return {
      id: String(ctx?.followupAxisId || "").trim(),
      title,
      axisLabel: String(ctx?.axisLabel || "").trim(),
      domain: String(ctx?.followupAxisDomain || "").trim().toLowerCase(),
      legacyTrack: String(ctx?.linkTrack || "").trim().toLowerCase(),
      linkedSubjects,
      activityExample: String(ctx?.activityExample || "").trim(),
      longitudinalPath: String(ctx?.longitudinalPath || "").trim()
    };
  }

  function getAxisPatternRegistry(){
    return {
      data: {
        titles: ["수리·데이터 모델링 축", "정량·데이터 표준화 축", "데이터 예측·해석 축", "데이터 예측·추정 축", "기후 데이터 예측 축", "건강 데이터 시각화 축"],
        regex: /(데이터|그래프|통계|예측|추정|수치|정량|표준|시각화|분석|모델링|비교|패턴|측정값|기록|시계열|표본|정확도)/
      },
      physics: {
        titles: ["물리·시스템 해석 축", "물리 기초량·측정 축", "운동·힘 해석 축", "고급 역학 해석 축", "파동·신호 해석 축", "전자기 신호 해석 축"],
        regex: /(물리|운동|힘|가속도|전류|전압|센서|시스템|장치|회로|전자기|파동|에너지|역학|측정|속력|질량|시간|길이|전기|자기|신호)/
      },
      chemistry: {
        titles: ["화학·성질 예측 축", "화학 반응 해석 축", "주기율·성질 예측 축", "열화학·반응 에너지 축", "기체 상태·열역학 해석 축"],
        regex: /(화학|원소|주기율|성질|반응|이온|분자|결합|산화|환원|열화학|몰|기체|용액|산|염기|전자 이동)/
      },
      materials: {
        titles: ["재료·소자 설계 기초 축", "재료·소자 설계 축", "재료 선택·설계 축", "반도체·소재 설계 축", "가스 센서·측정 응용 축"],
        regex: /(재료|소자|반도체|배터리|부식|소재|코팅|접착|금속|세라믹|고분자|센서 범위|가스 센서|보존|제련|도핑|p형|n형)/
      },
      biology: {
        titles: ["생명·건강 해석 축", "세포 에너지 해석 축", "면역 반응 해석 축", "유전 정보 해석 축", "생체 신호·건강 해석 축"],
        regex: /(생명|세포|대사|효소|면역|백신|유전자|건강|생체|호흡|광합성|질병|영양|호르몬|항체|DNA|염색체)/
      },
      earth_env: {
        titles: ["지구·환경 데이터 해석 축", "지구·환경 해석 축", "대기·해양 자료 해석 축", "기후 시스템 해석 축", "재난·지구물리 응용 축"],
        regex: /(환경|지구|기후|대기|해양|미세먼지|기상|재난|천체|우주|해수면|탄소중립|온실가스|지진|화산|관측|폭염|한파)/
      },
      social: {
        titles: ["사회 문제 통합해석 축", "시민 참여·제도 이해 축", "정의·분배 원리 해석 축", "불평등 구조 해석 축"],
        regex: /(사회|정책|문제|시민|헌법|인권|정의|불평등|복지|시장|경제|세계화|평화|지속가능)/
      },
      argument: {
        titles: ["논증·비판적 읽기 축", "매체 비평·판단 축", "자료 검증·팩트체크 축"],
        regex: /(논증|비판|읽기|토론|근거|주장|반론|매체|검증|팩트체크|신뢰성|출처)/
      }
    };
  }

  function getCardAxisProfile(reportCard){
    const profile = reportCard?.axis_profile || {};
    return {
      primary_axis: String(profile?.primary_axis || "").trim(),
      secondary_axes: uniq(coerceArray(profile?.secondary_axes).map(v => String(v || "").trim())),
      axis_domains: uniq(coerceArray(profile?.axis_domains).map(v => String(v || "").trim().toLowerCase()))
    };
  }

  function getAxisDomainFromTitle(axisTitle){
    const registry = getAxisPatternRegistry();
    const entry = Object.entries(registry).find(([, meta]) =>
      axisTitle && meta.titles.some(title => fuzzyIncludes(axisTitle, title) || fuzzyIncludes(title, axisTitle))
    );
    return entry ? entry[0] : "";
  }

  function detectBookAxisDomains(book){
    const reportCard = getReportCardByBookId(book?.book_id);
    const profile = getCardAxisProfile(reportCard);
    const axes = uniq([
      profile.primary_axis,
      ...profile.secondary_axes,
      ...coerceArray(reportCard?.direct_match?.followup_axes),
      ...coerceArray(reportCard?.expand_reference?.followup_axes)
    ]);
    const bag = [
      book?.title || "",
      book?.summary_short || "",
      ...(book?.linked_subjects || []),
      ...(book?.linked_majors || []),
      ...(book?.related_majors || []),
      ...(book?.fit_keywords || []),
      ...(book?.broad_theme || []),
      ...axes
    ].join(" ");
    const registry = getAxisPatternRegistry();
    const domains = [...profile.axis_domains];
    Object.entries(registry).forEach(([domain, meta]) => {
      if (axes.some(v => meta.titles.some(title => fuzzyIncludes(v, title)))) {
        domains.push(domain);
        return;
      }
      if (meta.regex.test(bag)) domains.push(domain);
    });
    return uniq(domains);
  }

  function getAxisAffinity(book, ctx){
    const axis = getSelectedAxisContext(ctx);
    if (!axis.id && !axis.title && !axis.domain && !axis.legacyTrack) {
      return {
        score: 0,
        reasons: [],
        primaryTitleHit: false,
        secondaryTitleHit: false,
        exactTitleHit: false,
        domainHit: false,
        legacyHit: false,
        anyHit: false
      };
    }

    const reportCard = getReportCardByBookId(book?.book_id);
    const profile = getCardAxisProfile(reportCard);
    const explicitAxes = uniq([
      profile.primary_axis,
      ...profile.secondary_axes,
      ...coerceArray(reportCard?.direct_match?.followup_axes),
      ...coerceArray(reportCard?.expand_reference?.followup_axes)
    ]);
    const inferredDomains = detectBookAxisDomains(book);

    const primaryTitleHit = !!axis.title && !!profile.primary_axis && fuzzyIncludes(profile.primary_axis, axis.title);
    const secondaryTitleHit = !!axis.title && profile.secondary_axes.some(v => fuzzyIncludes(v, axis.title));
    const exactTitleHit = !!axis.title && explicitAxes.some(v => fuzzyIncludes(v, axis.title));
    const titleDomain = axis.title ? (getAxisDomainFromTitle(axis.title) || getAxisDomainFromTitle(profile.primary_axis)) : "";
    const domainTarget = axis.domain || titleDomain || (axis.legacyTrack === 'earth' ? 'earth_env' : axis.legacyTrack);
    const domainHit = !!domainTarget && inferredDomains.includes(domainTarget);
    const legacyTarget = axis.legacyTrack === 'earth' ? 'earth_env' : axis.legacyTrack;
    const legacyHit = !!legacyTarget && inferredDomains.includes(legacyTarget);

    let score = 0;
    const reasons = [];

    if (primaryTitleHit) {
      score += 48;
      reasons.push("대표 축 일치");
    } else if (exactTitleHit) {
      score += 32;
      reasons.push("선택 축 직접 일치");
    }

    if (!primaryTitleHit && secondaryTitleHit) {
      score += 12;
      reasons.push("보조 축 일치");
    }

    if (!primaryTitleHit && !exactTitleHit && domainHit) {
      score += 20;
      reasons.push("선택 축 핵심 연계");
    }

    if (!primaryTitleHit && !exactTitleHit && !secondaryTitleHit && !domainHit && legacyHit) {
      score += 8;
      reasons.push("선택 축 보조 연계");
    }

    if ((axis.title || axis.domain || axis.legacyTrack) && profile.primary_axis && !primaryTitleHit && !exactTitleHit && !secondaryTitleHit && !domainHit && !legacyHit) {
      score -= 18;
      reasons.push("대표 축 불일치");
    } else if ((axis.title || axis.domain || axis.legacyTrack) && !primaryTitleHit && !exactTitleHit && !secondaryTitleHit && !domainHit && !legacyHit) {
      score -= 12;
    }

    return {
      score,
      reasons,
      primaryTitleHit,
      secondaryTitleHit,
      exactTitleHit,
      domainHit,
      legacyHit,
      anyHit: primaryTitleHit || exactTitleHit || secondaryTitleHit || domainHit || legacyHit,
      explicitAxes,
      inferredDomains,
      profilePrimary: profile.primary_axis,
      profileSecondary: profile.secondary_axes,
      targetDomain: domainTarget,
      primaryDomain: getAxisDomainFromTitle(profile.primary_axis)
    };
  }

  function getAxisProfileControls(reportCard){
    const ui = reportCard?.ui_hints || {};
    return {
      directAxisExcludeDomains: uniq(coerceArray(ui?.direct_axis_exclude_domains).map(v => String(v || '').trim().toLowerCase())),
      directAxisBoostDomains: uniq(coerceArray(ui?.direct_axis_boost_domains).map(v => String(v || '').trim().toLowerCase()))
    };
  }

  function getAxisDirectTuning(book, ctx, axisAffinity){
    const reportCard = getReportCardByBookId(book?.book_id);
    const controls = getAxisProfileControls(reportCard);
    const targetDomain = String(axisAffinity?.targetDomain || '').trim().toLowerCase();
    const primaryDomain = String(axisAffinity?.primaryDomain || '').trim().toLowerCase();

    let score = 0;
    const reasons = [];

    if (!targetDomain) return { score, reasons, controls, primaryDomain, targetDomain };

    if (controls.directAxisBoostDomains.includes(targetDomain)) {
      score += 14;
      reasons.push('선택 축 우선 도서');
    }

    if (controls.directAxisExcludeDomains.includes(targetDomain) && !axisAffinity?.primaryTitleHit && !axisAffinity?.exactTitleHit) {
      score -= 32;
      reasons.push('선택 축 direct 제외');
    }

    if (primaryDomain && targetDomain && primaryDomain !== targetDomain) {
      if (axisAffinity?.primaryTitleHit || axisAffinity?.exactTitleHit) {
        score += 0;
      } else if (axisAffinity?.domainHit) {
        score -= 6;
      } else if (axisAffinity?.secondaryTitleHit) {
        score -= 12;
      } else {
        score -= 22;
        reasons.push('선택 축 대표 불일치');
      }
    }

    if (targetDomain === 'physics' && /생명|의학|보건|의예|간호|의료/.test(`${(book?.linked_majors || []).join(' ')} ${(book?.title || '')}`) && !axisAffinity?.primaryTitleHit && !axisAffinity?.exactTitleHit) {
      score -= 18;
      reasons.push('생명 중심 direct 감점');
    }

    if (targetDomain === 'data' && /의학|보건|간호|의료/.test(`${(book?.linked_majors || []).join(' ')} ${(book?.title || '')}`) && !axisAffinity?.primaryTitleHit && !axisAffinity?.exactTitleHit) {
      score -= 16;
      reasons.push('전용 데이터 direct 감점');
    }

    return { score, reasons, controls, primaryDomain, targetDomain };
  }


  function getBucketAlignment(book, bucket){
    const patterns = getBucketPatterns(bucket);
    const majors = book?.linked_majors || [];
    const themes = getBookThemeArray(book);
    const titleBag = `${book?.title || ""} ${book?.summary_short || ""}`;

    const majorHit = majors.some(v => patterns.major.test(v));
    const themeHit = themes.some(v => patterns.theme.test(v));
    const avoidHit = patterns.avoid.test(titleBag) || majors.some(v => patterns.avoid.test(v)) || themes.some(v => patterns.avoid.test(v));
    const bioHeavy = majors.length > 0 && majors.every(v => /(의학|의예|치의|약학|보건|간호|수의|생명|바이오)/.test(v));
    const professionSpecificBio = /(의사|수의사|치과의사|환자|동물 병원|동물병원|간호사|약학|신약|제약|의료기술|의료)/.test(titleBag);
    const generalScience = majors.some(v => /(물리|화학|과학교육|천문|지구과학|수학)/.test(v));

    let score = 0;
    const reasons = [];

    if (majorHit) {
      score += 20;
      reasons.push("진로 적합 연결");
    }
    if (themeHit) {
      score += 10;
      reasons.push("개념 확장 적합");
    }

    if (["materials", "mechanical", "electronic", "it"].includes(bucket)) {
      if (bioHeavy && !majorHit) score -= 22;
      if (professionSpecificBio && !majorHit) score -= 28;
      if (avoidHit && !majorHit) score -= 18;
      if (generalScience && !bioHeavy) {
        score += 8;
        reasons.push("일반 과학 확장");
      }
      if (!majorHit && /(약학|제약|의공학|생명공학|의료)/.test((majors || []).join(" "))) score -= 10;
    }

    if (bucket === "bio") {
      if (avoidHit && !majorHit) score -= 12;
    }

    return {
      score,
      reasons: uniq(reasons),
      majorHit,
      themeHit,
      bioHeavy,
      professionSpecificBio,
      generalScience
    };
  }

  function getRouteMatches(book, subject, concept, keyword){
    const routes = Array.isArray(book?.engine_subject_routes) ? book.engine_subject_routes : [];
    return routes.filter(route => {
      const subjectOk = fuzzyIncludes(route.subject, subject);
      const conceptOk = !concept || fuzzyIncludes(route.concept, concept);
      const keywordOk = !keyword || (Array.isArray(route.micro_keywords) && route.micro_keywords.some(k => fuzzyIncludes(k, keyword)));
      return subjectOk && conceptOk && keywordOk;
    });
  }

  function scoreBook(book, ctx){
    const subject = ctx?.selectedSubject || ctx?.subject || "";
    const concept = ctx?.selectedConcept || ctx?.concept || "";
    const keyword = ctx?.selectedKeyword || ctx?.keyword || "";
    const career = ctx?.selectedMajor || ctx?.career || "";
    const linkTrack = ctx?.linkTrack || "";
    const bucket = detectCareerBucket(career);
    const careerTokens = tokenizeCareer(career);
    const matchedRules = getMatchedRules(ctx);
    const themes = getBookThemeArray(book);
    const routes = getRouteMatches(book, subject, concept, keyword);
    const bucketAlignment = getBucketAlignment(book, bucket);
    const trackAlignment = getTrackAlignment(book, linkTrack);
    const axisAffinity = getAxisAffinity(book, ctx);
    const reportCard = getReportCardByBookId(book.book_id);
    const axisDirectTuning = getAxisDirectTuning(book, ctx, axisAffinity);
    const direct = reportCard?.direct_match || {};
    const expand = reportCard?.expand_reference || {};
    const selectedAxis = getSelectedAxisContext(ctx);

    let score = 0;
    const reasons = [];

    const directSubjectHit = coerceArray(direct.subjects).some(v => fuzzyIncludes(v, subject));
    const directConceptHit = coerceArray(direct.concepts).some(v => fuzzyIncludes(v, concept));
    const directKeywordHit = coerceArray(direct.keywords).some(v => fuzzyIncludes(v, keyword));
    const expandSubjectHit = coerceArray(expand.subjects).some(v => fuzzyIncludes(v, subject));
    const expandMajorHit = coerceArray(expand.majors).some(v => careerTokens.some(token => fuzzyIncludes(v, token)));
    const expandAxisHit = axisAffinity.anyHit;

    if (directSubjectHit) { score += 24; reasons.push("직접 일치 과목"); }
    if (directConceptHit) { score += 28; reasons.push("직접 일치 개념"); }
    if (directKeywordHit) { score += 30; reasons.push("직접 일치 키워드"); }
    if (directConceptHit && directKeywordHit) { score += 12; reasons.push("직접 일치 도서"); }
    if (!directKeywordHit && expandSubjectHit) { score += 10; reasons.push("확장 참고 과목"); }
    if (expandMajorHit) { score += 12; reasons.push("확장 학과 연결"); }
    if (expandAxisHit) { score += 8; reasons.push("후속 축 연결"); }
    if (selectedAxis.linkedSubjects.length && (book.linked_subjects || []).some(v => selectedAxis.linkedSubjects.some(subjectName => fuzzyIncludes(v, subjectName)))) {
      score += 10;
      reasons.push("후속 과목 연결");
    }
    if (selectedAxis.activityExample && themes.some(v => fuzzyIncludes(v, selectedAxis.activityExample))) {
      score += 4;
    }

    if ((book.linked_subjects || []).some(v => fuzzyIncludes(v, subject))) {
      score += 16;
      reasons.push("과목 연결");
    }

    routes.forEach(route => {
      const exactConcept = fuzzyIncludes(route.concept, concept);
      const exactKeyword = Array.isArray(route.micro_keywords) && route.micro_keywords.some(k => fuzzyIncludes(k, keyword));
      if (exactConcept) score += 18;
      if (exactKeyword) score += 18;
      if (exactConcept && exactKeyword) reasons.push("개념-키워드 직접 연결");
    });

    if ((book.fit_keywords || []).some(v => fuzzyIncludes(v, keyword))) {
      score += 14;
      reasons.push("키워드 일치");
    }

    if (themes.some(v => fuzzyIncludes(v, keyword))) {
      score += 8;
    }

    if ((book.linked_majors || []).some(v => careerTokens.some(token => fuzzyIncludes(v, token)))) {
      score += 18;
      reasons.push("진로 직접 연결");
    }

    const lookupHits = getCareerLookupCandidates(career);
    if (lookupHits.some(item => item.book_id === book.book_id)) {
      score += 12;
      reasons.push("진로 추천 목록");
    }

    matchedRules.forEach(rule => {
      if ((rule.blocked_books || []).includes(book.book_id)) score -= 100;
      if ((rule.recommended_books || []).includes(book.book_id)) {
        score += 18;
        reasons.push("필터 추천");
      }
    });

    score += bucketAlignment.score;
    reasons.push(...bucketAlignment.reasons);

    score += trackAlignment.score;
    reasons.push(...trackAlignment.reasons);

    score += axisAffinity.score;
    reasons.push(...axisAffinity.reasons);

    score += axisDirectTuning.score;
    reasons.push(...axisDirectTuning.reasons);

    if (["materials", "mechanical", "electronic", "it"].includes(bucket)) {
      const selectedBioConcept = /(생명|세포|항상성|자극|내부 환경|변화 대응)/.test(`${concept} ${keyword}`);
      if (selectedBioConcept && bucketAlignment.professionSpecificBio && !bucketAlignment.majorHit) {
        score -= 22;
      }
      if (selectedBioConcept && bucketAlignment.generalScience) {
        score += 8;
      }
    }

    if (linkTrack && !trackAlignment.majorHit && !trackAlignment.themeHit && !routes.length) {
      score -= 10;
    }

    if (!concept && !keyword) score -= 12;

    return { score, reasons: uniq(reasons).slice(0, 3), matchedRules, routes };
  }

  function getMatchSignals(book, ctx){
    const subject = ctx?.selectedSubject || ctx?.subject || "";
    const concept = ctx?.selectedConcept || ctx?.concept || "";
    const keyword = ctx?.selectedKeyword || ctx?.keyword || "";
    const careerTokens = tokenizeCareer(ctx?.selectedMajor || ctx?.career || "");
    const themes = getBookThemeArray(book);
    const routes = getRouteMatches(book, subject, concept, keyword);
    const subjectHit = (book?.linked_subjects || []).some(v => fuzzyIncludes(v, subject));
    const themeKeywordHit = themes.some(v => fuzzyIncludes(v, keyword)) || (book?.fit_keywords || []).some(v => fuzzyIncludes(v, keyword));
    const themeConceptHit = themes.some(v => fuzzyIncludes(v, concept)) || (book?.fit_keywords || []).some(v => fuzzyIncludes(v, concept));
    const careerMajorHit = [...(book?.linked_majors || []), ...(book?.related_majors || [])].some(v => careerTokens.some(token => fuzzyIncludes(v, token)));
    const bucketAffinity = hasCareerBucketAffinity(book, ctx);
    const lookupCareerHit = hasLookupCareerHit(book, ctx);
    return { routes, subjectHit, themeKeywordHit, themeConceptHit, careerMajorHit, bucketAffinity, lookupCareerHit };
  }

function getBookDiversityTokens(book){
  return uniq([
    ...(book?.linked_majors || []).slice(0, 4),
    ...(book?.linked_subjects || []).slice(0, 3),
    ...(book?.fit_keywords || []).slice(0, 6),
    ...(book?.broad_theme || []).slice(0, 4),
    ...((book?.engine_subject_routes || []).flatMap(route => [route?.subject, route?.concept, ...((route?.micro_keywords || []).slice(0, 3))]))
  ]).map(normalize).filter(Boolean);
}

function getBookFamilyKey(book){
  const parts = uniq([
    ...(book?.linked_majors || []).slice(0, 2),
    ...(book?.broad_theme || []).slice(0, 2),
    ...((book?.engine_subject_routes || []).slice(0, 1).map(route => route?.concept))
  ]).map(normalize).filter(Boolean);
  return parts.slice(0, 3).join("|") || normalize(book?.title || "").slice(0, 18);
}

function getBookSimilarity(a, b){
  const aTokens = getBookDiversityTokens(a);
  const bTokens = getBookDiversityTokens(b);
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const overlap = aTokens.filter(token => bSet.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size || 1;
  const ratio = overlap / union;
  const familyA = getBookFamilyKey(a);
  const familyB = getBookFamilyKey(b);
  return {
    ratio,
    sameFamily: !!familyA && !!familyB && familyA === familyB,
    sameAuthor: normalize(a?.author) && normalize(a?.author) === normalize(b?.author)
  };
}

function getDiversityPenalty(item, selectedItems, ctx, mode){
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) return 0;
  const strong = hasStrongMatchEvidence(item, ctx);
  let penalty = 0;

  selectedItems.forEach(selectedItem => {
    const similar = getBookSimilarity(item.book, selectedItem.book);
    if (similar.sameFamily) penalty += mode === "explore" ? 12 : 10;
    if (similar.ratio >= 0.62) penalty += mode === "explore" ? 18 : 14;
    else if (similar.ratio >= 0.42) penalty += mode === "explore" ? 12 : 9;
    else if (similar.ratio >= 0.24) penalty += 5;
    if (similar.sameAuthor) penalty += 3;
  });

  if (strong) penalty *= 0.65;
  return penalty;
}

function selectDiverseItems(items, ctx, limit, mode, anchorItems){
  const pool = Array.isArray(items) ? items.slice() : [];
  const anchors = Array.isArray(anchorItems) ? anchorItems.slice() : [];
  const selected = [];

  while (pool.length && selected.length < limit) {
    let bestIndex = 0;
    let bestValue = -Infinity;

    pool.slice(0, 40).forEach((item, index) => {
      const penalty = getDiversityPenalty(item, [...anchors, ...selected], ctx, mode);
      const adjusted = item.score - penalty;
      if (adjusted > bestValue) {
        bestValue = adjusted;
        bestIndex = index;
      }
    });

    const chosen = pool.splice(bestIndex, 1)[0];
    if (!chosen) break;

    const adjustedChosen = chosen.score - getDiversityPenalty(chosen, [...anchors, ...selected], ctx, mode);
    const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
    const strict = isStrictCareerBucket(bucket);
    const minFollowup = strict ? 18 : (bucket === "bio" ? 8 : 10);
    if (selected.length > 0 && adjustedChosen < minFollowup) continue;

    selected.push(chosen);
  }

  return selected;
}

  
function classifyRecommendation(item, ctx){
    const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
    const strictBucket = isStrictCareerBucket(bucket);
    const signals = getMatchSignals(item.book, ctx);
    const reasonSet = new Set(item.reasons || []);
    const reportCard = getReportCardByBookId(item.book.book_id);
    const direct = reportCard?.direct_match || {};
    const expand = reportCard?.expand_reference || {};
    const axisAffinity = item.axisAffinity || getAxisAffinity(item.book, ctx);
    const directHit = coerceArray(direct.subjects).some(v => fuzzyIncludes(v, ctx?.selectedSubject || ctx?.subject || "")) && (
      coerceArray(direct.concepts).some(v => fuzzyIncludes(v, ctx?.selectedConcept || ctx?.concept || "")) ||
      coerceArray(direct.keywords).some(v => fuzzyIncludes(v, ctx?.selectedKeyword || ctx?.keyword || ""))
    );
    const expandHit = coerceArray(expand.subjects).some(v => fuzzyIncludes(v, ctx?.selectedSubject || ctx?.subject || "")) ||
      coerceArray(expand.majors).some(v => tokenizeCareer(ctx?.selectedMajor || ctx?.career || "").some(token => fuzzyIncludes(v, token))) ||
      axisAffinity.anyHit;

    const hasAxisContext = !!(ctx?.selectedFollowupAxis || ctx?.followupAxisTitle || ctx?.followupAxisDomain || ctx?.followupAxisId || ctx?.linkTrack);
    const isDirectBase = (
      directHit ||
      signals.routes.length > 0 ||
      reasonSet.has("개념-키워드 직접 연결") ||
      reasonSet.has("연계 축 적합") ||
      (signals.themeKeywordHit && signals.careerMajorHit) ||
      (signals.themeKeywordHit && signals.subjectHit && item.score >= 24) ||
      (signals.themeConceptHit && signals.careerMajorHit && item.score >= 24) ||
      (signals.subjectHit && signals.careerMajorHit && item.score >= 24) ||
      (signals.bucketAffinity && signals.subjectHit && item.score >= 16) ||
      (signals.bucketAffinity && signals.themeConceptHit && item.score >= 16) ||
      (signals.lookupCareerHit && signals.subjectHit && item.score >= 14)
    );

    if (hasAxisContext) {
      const axisControls = getAxisProfileControls(reportCard);
      const targetDomain = String(axisAffinity?.targetDomain || '').trim().toLowerCase();
      const primaryDomain = String(axisAffinity?.primaryDomain || '').trim().toLowerCase();
      const blockedDirect = !!targetDomain && axisControls.directAxisExcludeDomains.includes(targetDomain) && !axisAffinity.primaryTitleHit && !axisAffinity.exactTitleHit;
      const severeMismatch = !!targetDomain && !!primaryDomain && targetDomain !== primaryDomain && !axisAffinity.primaryTitleHit && !axisAffinity.exactTitleHit && !axisAffinity.domainHit;

      if (blockedDirect) return strictBucket ? 'drop' : 'explore';
      if (axisAffinity.primaryTitleHit && item.score >= 14) return 'direct';
      if (axisAffinity.exactTitleHit && item.score >= 18) return 'direct';
      if (axisAffinity.domainHit && isDirectBase && item.score >= 20) return 'direct';
      if (axisAffinity.secondaryTitleHit && isDirectBase && !severeMismatch && item.score >= 24) return 'direct';
      if (isDirectBase) return strictBucket ? 'drop' : 'explore';
    }

    if (isDirectBase) return "direct";

    if (strictBucket) {
      if (isClearlyOffTopicBook(item.book, bucket)) return "drop";
      if (item.score < 24) return "drop";
      if (!signals.subjectHit && !signals.themeConceptHit) return "drop";
      if (!(reasonSet.has("일반 과학 확장") || reasonSet.has("과목 연결") || reasonSet.has("개념 확장 적합") || signals.themeConceptHit)) return "drop";
      return "explore";
    }

    if (expandHit && item.score >= 8) return "explore";
    if (signals.bucketAffinity && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit) && item.score >= 12) return "explore";
    if (signals.lookupCareerHit && item.score >= 12) return "explore";
    if (item.score >= 16 && !isClearlyOffTopicBook(item.book, bucket)) return "explore";
    return "drop";
  }

  
function getBookRecommendationSections(ctx){
    const recommended = getRecommendedBooks(ctx);
    const directCandidates = [];
    const exploreCandidates = [];

    recommended.forEach(item => {
      const section = classifyRecommendation(item, ctx);
      if (section === "direct") directCandidates.push(item);
      else if (section === "explore") exploreCandidates.push(item);
    });

    const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
    const targetDirectMin = isStrictCareerBucket(bucket) ? 2 : (bucket === "bio" ? 3 : 2);

    const axisAwareDirect = directCandidates.slice().sort((a, b) => {
      const aPrimary = a.axisAffinity?.primaryTitleHit ? 1 : 0;
      const bPrimary = b.axisAffinity?.primaryTitleHit ? 1 : 0;
      if (bPrimary !== aPrimary) return bPrimary - aPrimary;
      const aExact = a.axisAffinity?.exactTitleHit ? 1 : 0;
      const bExact = b.axisAffinity?.exactTitleHit ? 1 : 0;
      if (bExact !== aExact) return bExact - aExact;
      const aDomain = a.axisAffinity?.domainHit ? 1 : 0;
      const bDomain = b.axisAffinity?.domainHit ? 1 : 0;
      if (bDomain !== aDomain) return bDomain - aDomain;
      const aSecondary = a.axisAffinity?.secondaryTitleHit ? 1 : 0;
      const bSecondary = b.axisAffinity?.secondaryTitleHit ? 1 : 0;
      if (bSecondary !== aSecondary) return bSecondary - aSecondary;
      const aAny = a.axisAffinity?.anyHit ? 1 : 0;
      const bAny = b.axisAffinity?.anyHit ? 1 : 0;
      if (bAny !== aAny) return bAny - aAny;
      return b.score - a.score;
    });
    const directLimited = selectDiverseItems(axisAwareDirect, ctx, 4, "direct");
    const usedIds = new Set(directLimited.map(item => item.book.book_id));

    if (directLimited.length < targetDirectMin) {
      const backfillPool = recommended.filter(item =>
        !usedIds.has(item.book.book_id) &&
        (shouldPromoteToDirect(item, ctx) || isBroadRelevantItem(item, ctx))
      );
      const supplementalPool = getSupplementalRecommendationPool(ctx, Array.from(usedIds));
      const mergedPool = [];
      const seen = new Set();
      [...backfillPool, ...supplementalPool].forEach(item => {
        if (!item?.book?.book_id || seen.has(item.book.book_id) || usedIds.has(item.book.book_id)) return;
        seen.add(item.book.book_id);
        mergedPool.push(item);
      });
      const need = targetDirectMin - directLimited.length;
      const promoted = selectDiverseItems(mergedPool, ctx, need, "direct", directLimited);
      promoted.forEach(item => {
        if (!usedIds.has(item.book.book_id)) {
          directLimited.push(item);
          usedIds.add(item.book.book_id);
        }
      });
    }

    const remainingExplore = recommended.filter(item => !usedIds.has(item.book.book_id) && (
      classifyRecommendation(item, ctx) === "explore" || isBroadRelevantItem(item, ctx)
    ));
    let exploreLimited = [];

    if (directLimited.length === 0) {
      exploreLimited = selectDiverseItems(remainingExplore, ctx, 4, "explore");
    } else if (directLimited.length <= 2) {
      exploreLimited = selectDiverseItems(remainingExplore, ctx, 3, "explore", directLimited);
    } else {
      exploreLimited = selectDiverseItems(remainingExplore, ctx, 2, "explore", directLimited);
    }

    exploreLimited.forEach(item => usedIds.add(item.book.book_id));

    const supportPool = recommended
      .filter(item => !usedIds.has(item.book.book_id) && isReportSupportItem(item, ctx))
      .sort((a, b) => {
        const aModes = coerceArray(a.book?.report_modes || a.book?.fit_modes).length;
        const bModes = coerceArray(b.book?.report_modes || b.book?.fit_modes).length;
        const aPerspectives = coerceArray(a.book?.perspectives).length;
        const bPerspectives = coerceArray(b.book?.perspectives).length;
        const aEvidence = coerceArray(a.book?.evidence_types).length;
        const bEvidence = coerceArray(b.book?.evidence_types).length;
        return (bModes + bPerspectives + bEvidence) - (aModes + aPerspectives + aEvidence) || b.score - a.score;
      });

    const supportLimited = selectDiverseItems(supportPool, ctx, directLimited.length ? 2 : 3, "support", [...directLimited, ...exploreLimited]);

    return { direct: directLimited, explore: exploreLimited, support: supportLimited, all: [...directLimited, ...exploreLimited, ...supportLimited] };
  }

  
function getRecommendedBooks(ctx){
    if (!loaded || !Array.isArray(books) || books.length === 0) return [];
    const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
    const strictBucket = isStrictCareerBucket(bucket);

    const scored = books.map(book => {
      const meta = scoreBook(book, ctx);
      return {
        book,
        score: meta.score,
        reasons: meta.reasons,
        matchedRules: meta.matchedRules,
        routes: meta.routes,
        axisAffinity: meta.axisAffinity
      };
    });

    const sorted = scored
      .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title, 'ko'));

    const cutoff = getScoreCutoff(sorted, ctx);
    const primary = sorted.filter(item => {
      if (item.score < cutoff) return false;
      if (strictBucket && isClearlyOffTopicBook(item.book, bucket) && !hasStrongMatchEvidence(item, ctx)) return false;
      if (strictBucket && !hasStrongMatchEvidence(item, ctx) && item.score < cutoff + 4) return false;
      return true;
    });

    const relaxedFloor = strictBucket ? Math.max(cutoff - 6, 10) : Math.max(cutoff - 8, bucket === "bio" ? 6 : 8);
    const secondary = sorted.filter(item => {
      const signals = getMatchSignals(item.book, ctx);
      if (item.score < relaxedFloor) return false;
      if (strictBucket && isClearlyOffTopicBook(item.book, bucket) && !hasStrongMatchEvidence(item, ctx)) return false;
      if (isBroadRelevantItem(item, ctx)) return true;
      if (!strictBucket && signals.bucketAffinity && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit)) return true;
      if (!strictBucket && signals.lookupCareerHit && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit)) return true;
      return item.score >= relaxedFloor + (strictBucket ? 0 : 2);
    });

    const combined = [...primary, ...secondary];
    if (!combined.length) return [];

    const dedup = [];
    const seen = new Set();
    combined.forEach(item => {
      if (seen.has(item.book.book_id)) return;
      seen.add(item.book.book_id);
      dedup.push(item);
    });

    return selectDiverseItems(dedup, ctx, strictBucket ? 18 : 24, "pool");
  }


  function isStrictCareerBucket(bucket){
    return ["materials", "mechanical", "electronic", "it"].includes(bucket);
  }

  function hasStrongMatchEvidence(item, ctx){
    if (!item) return false;
    const strongReasons = [
      "개념-키워드 직접 연결",
      "키워드 일치",
      "진로 직접 연결",
      "필터 추천",
      "진로 적합 연결",
      "개념 확장 적합",
      "진로 추천 목록"
    ];
    const reasonSet = new Set(item.reasons || []);
    const hasStrongReason = strongReasons.some(reason => reasonSet.has(reason));
    const hasRoute = Array.isArray(item.routes) && item.routes.length > 0;
    const themes = getBookThemeArray(item.book);
    const hasKeywordTheme = themes.some(v => fuzzyIncludes(v, ctx?.selectedKeyword || ctx?.keyword)) || (item.book?.fit_keywords || []).some(v => fuzzyIncludes(v, ctx?.selectedKeyword || ctx?.keyword));
    const careerTokens = tokenizeCareer(ctx?.selectedMajor || ctx?.career || "");
    const hasCareerMajor = (item.book?.linked_majors || []).some(v => careerTokens.some(token => fuzzyIncludes(v, token)));
    return hasRoute || hasStrongReason || (hasKeywordTheme && hasCareerMajor);
  }

  function getScoreCutoff(sorted, ctx){
    if (!Array.isArray(sorted) || !sorted.length) return Infinity;
    const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
    const strict = isStrictCareerBucket(bucket);
    const hasConceptKeyword = !!((ctx?.selectedConcept || ctx?.concept) && (ctx?.selectedKeyword || ctx?.keyword));
    const hasTrack = !!(ctx?.followupAxisId || ctx?.selectedFollowupAxis || ctx?.linkTrack);
    const topScore = sorted[0]?.score ?? -999;

    let baseCutoff;
    if (strict) {
      baseCutoff = hasConceptKeyword ? 24 : 20;
    } else if (bucket === "bio") {
      baseCutoff = hasConceptKeyword ? 12 : 10;
    } else if (bucket === "biz" || bucket === "humanities" || bucket === "env") {
      baseCutoff = hasConceptKeyword ? 13 : 10;
    } else {
      baseCutoff = hasConceptKeyword ? 14 : 10;
    }

    const trackBonusCutoff = hasTrack ? (strict ? 4 : 2) : 0;
    const spreadCutoff = topScore - (hasConceptKeyword ? (strict ? 16 : 20) : (strict ? 12 : 16));
    return Math.max(baseCutoff + trackBonusCutoff, spreadCutoff);
  }

  function isClearlyOffTopicBook(book, bucket){
    const bag = `${book?.title || ""} ${(book?.linked_majors || []).join(" ")} ${(book?.linked_subjects || []).join(" ")} ${(book?.broad_theme || []).join(" ")} ${(book?.fit_keywords || []).join(" ")} ${book?.summary_short || ""}`;
    const engineeringSignals = /(물리|화학|과학|천문|지구과학|재료|구조|역학|측정|데이터|시스템|기술|공학)/;
    if (!isStrictCareerBucket(bucket)) return false;
    if (engineeringSignals.test(bag)) return false;
    return /(철학|윤리|문학|국문|한문|사회학|정치|행정|역사|교육|인류학|신학|종교|의학|의예|치의|간호|수의|동물보건)/.test(bag);
  }

  function mapModeLabel(id){
    return (DEFAULT_MODE_OPTIONS.find(item => item.id === id) || {}).label || id;
  }

  function pickTop(arr, n){
    return (arr || []).filter(Boolean).slice(0, n);
  }

  function isGenericBookSummary(text){
    const s = String(text || '').trim();
    if (!s) return true;
    return /(교과 개념과 실제 사례로 확장하기 좋은 도서|연결성이 높다|확장할 수 있는 .* 도서|입문 도서)/.test(s);
  }

function getDisplaySubjects(book){
  const curated = Array.isArray(book?.related_subjects_highschool) ? book.related_subjects_highschool.filter(Boolean) : [];
  if (curated.length) return uniq(curated).slice(0, 5);
  const fallback = Array.isArray(book?.linked_subjects) ? book.linked_subjects.filter(Boolean) : [];
  return uniq(fallback).slice(0, 5);
}

function getDisplayMajors(book){
  const curated = Array.isArray(book?.related_majors) ? book.related_majors.filter(Boolean) : [];
  if (curated.length) return uniq(curated).slice(0, 5);
  const fallback = Array.isArray(book?.linked_majors) ? book.linked_majors.filter(Boolean) : [];
  return uniq(fallback).slice(0, 5);
}
function getBookCareerBucket(book){
  const bag = [
    ...(Array.isArray(book?.related_majors) ? book.related_majors : []),
    ...(Array.isArray(book?.linked_majors) ? book.linked_majors : []),
    ...(Array.isArray(book?.broad_theme) ? book.broad_theme : []),
    ...(Array.isArray(book?.fit_keywords) ? book.fit_keywords : []),
    book?.title || "",
    book?.summary_short || "",
    book?.book_core_summary || ""
  ].filter(Boolean).join(" ");
  return detectCareerBucket(bag);
}

function hasCareerBucketAffinity(book, ctx){
  const targetBucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
  if (!targetBucket || targetBucket === "default") return false;
  return getBookCareerBucket(book) === targetBucket;
}

function hasLookupCareerHit(book, ctx){
  const hits = getCareerLookupCandidates(ctx?.selectedMajor || ctx?.career || "");
  return hits.some(item => item.book_id === book?.book_id);
}

function shouldPromoteToDirect(item, ctx){
  if (!item?.book) return false;
  const signals = getMatchSignals(item.book, ctx);
  const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
  const sameBucket = signals.bucketAffinity || hasCareerBucketAffinity(item.book, ctx);
  const lookupHit = signals.lookupCareerHit || hasLookupCareerHit(item.book, ctx);
  if (sameBucket && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit) && item.score >= (bucket === "bio" ? 14 : 16)) return true;
  if (lookupHit && signals.subjectHit && item.score >= 14) return true;
  if (signals.careerMajorHit && (signals.themeConceptHit || signals.subjectHit) && item.score >= 16) return true;
  return false;
}

function isBroadRelevantItem(item, ctx){
  if (!item?.book) return false;
  const signals = getMatchSignals(item.book, ctx);
  const sameBucket = signals.bucketAffinity || hasCareerBucketAffinity(item.book, ctx);
  const lookupHit = signals.lookupCareerHit || hasLookupCareerHit(item.book, ctx);
  if (signals.routes.length > 0) return true;
  if (sameBucket && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit)) return true;
  if (lookupHit && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit)) return true;
  if (signals.careerMajorHit && (signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit)) return true;
  return false;
}

function getCareerBucketRegex(bucket){
  const map = {
    bio: /(의예|의학|의사|간호|보건|치의|약학|수의|의공|생명|바이오)/,
    materials: /(반도체|신소재|재료|배터리|에너지|화학공학|고분자|금속)/,
    electronic: /(전자|전기|회로|센서|통신|반도체)/,
    mechanical: /(기계|로봇|자동차|항공|설계|구조)/,
    env: /(환경|지구|기후|우주|천문|해양|지리)/,
    biz: /(경영|경제|회계|금융|마케팅|산업공학|국제통상|무역)/,
    humanities: /(사회|역사|철학|윤리|정치|법|행정|언론|미디어|교육|문학|심리)/
  };
  return map[bucket] || null;
}

function getSupplementalRecommendationPool(ctx, usedIds){
  const bucket = detectCareerBucket(ctx?.selectedMajor || ctx?.career || "");
  const bucketRegex = getCareerBucketRegex(bucket);
  const subject = String(ctx?.selectedSubject || ctx?.subject || "");
  const concept = String(ctx?.selectedConcept || ctx?.concept || "");
  const keyword = String(ctx?.selectedKeyword || ctx?.keyword || "");
  const used = new Set(Array.isArray(usedIds) ? usedIds : []);
  const pool = [];

  (books || []).forEach(book => {
    if (!book?.book_id || used.has(book.book_id)) return;
    const meta = scoreBook(book, ctx);
    const item = {
      book,
      score: meta.score,
      reasons: uniq([...(meta.reasons || []), "보강 추천"]),
      matchedRules: meta.matchedRules,
      routes: meta.routes
    };
    const signals = getMatchSignals(book, ctx);
    const majorsBag = [
      ...(Array.isArray(book?.related_majors) ? book.related_majors : []),
      ...(Array.isArray(book?.linked_majors) ? book.linked_majors : [])
    ].join(" ");
    const subjectsBag = [
      ...(Array.isArray(book?.related_subjects_highschool) ? book.related_subjects_highschool : []),
      ...(Array.isArray(book?.linked_subjects) ? book.linked_subjects : [])
    ].join(" ");
    const themesBag = [
      ...(Array.isArray(book?.fit_keywords) ? book.fit_keywords : []),
      ...(Array.isArray(book?.broad_theme) ? book.broad_theme : []),
      ...(Array.isArray(book?.book_keywords) ? book.book_keywords : []),
      ...(Array.isArray(book?.core_keywords) ? book.core_keywords : [])
    ].join(" ");

    const bucketMajorHit = bucketRegex ? bucketRegex.test(majorsBag) : false;
    const subjectLooseHit = subject ? fuzzyIncludes(subjectsBag, subject) : false;
    const conceptLooseHit = concept ? fuzzyIncludes(themesBag, concept) : false;
    const keywordLooseHit = keyword ? fuzzyIncludes(themesBag, keyword) : false;
    const broadRelevant = signals.bucketAffinity || signals.lookupCareerHit || signals.careerMajorHit || bucketMajorHit;

    if (!broadRelevant) return;
    if (!(signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit || subjectLooseHit || conceptLooseHit || keywordLooseHit || signals.routes.length > 0)) return;

    item.score = Math.max(item.score, bucket === "bio" ? 12 : 14);
    pool.push(item);
  });

  return pool.sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title, 'ko'));
}




function buildBookCoreKeywords(book, ctx){
  const manual = Array.isArray(book?.core_keywords) ? book.core_keywords.filter(Boolean) : [];
  if (manual.length) return uniq(manual).slice(0, 10);
  const legacy = Array.isArray(book?.book_core_keywords) ? book.book_core_keywords.filter(Boolean) : [];
  if (legacy.length) return uniq(legacy).slice(0, 10);
  return uniq([
    ...(book?.fit_keywords || []),
    ...(book?.book_keywords || []),
    ...(book?.broad_theme || []),
    String(ctx?.selectedKeyword || ctx?.keyword || '').trim()
  ]).filter(Boolean).slice(0, 10);
}

function buildBookPreviewText(book){
  const formats = Array.isArray(book?.book_format) ? book.book_format.filter(Boolean).slice(0, 2) : [];
  const keywords = buildBookCoreKeywords(book, {}).slice(0, 3);
  if (formats.length && keywords.length) return `${formats.join(' · ')} | ${keywords.join(', ')}`;
  if (formats.length) return formats.join(' · ');
  if (keywords.length) return `${keywords.join(', ')} 중심`;
  const themes = pickTop(book?.broad_theme, 2);
  if (themes.length) return `${themes.join(', ')} 관점`;
  return '책의 내용과 핵심 키워드를 먼저 확인해 보세요.';
}

function buildBookSummaryText(book){
  const core = String(book?.book_core_summary || '').trim();
  if (core) return core;
  const raw = String(book?.summary_short || '').trim();
  if (raw && !isGenericBookSummary(raw)) return raw;
  const keywords = pickTop(buildBookCoreKeywords(book, {}), 3);
  const majors = pickTop(getDisplayMajors(book), 2);
  const subjects = pickTop(getDisplaySubjects(book), 2);
  const title = book?.title || '이 도서';

  if (keywords.length && majors.length) {
    return `${title}는 ${keywords.join(', ')} 주제를 중심으로 다루며 ${majors.join('·')} 관심과 연결해 이해하기 좋은 책이다.`;
  }
  if (keywords.length && subjects.length) {
    return `${title}는 ${keywords.join(', ')} 내용을 바탕으로 ${subjects.join('·')} 교과와 연결해 볼 수 있는 책이다.`;
  }
  if (majors.length) {
    return `${title}는 ${majors.join('·')} 관심 분야와 연결해 보기 좋은 책이다.`;
  }
  return raw || '선택한 주제와 연결해 책의 내용과 핵심 개념을 파악하기 좋은 도서입니다.';
}

function buildBookFormatText(book){
  const manual = Array.isArray(book?.book_format) ? book.book_format.filter(Boolean) : [];
  if (manual.length) return manual.join(' · ');
  if (String(book?.book_approach || '').trim()) return String(book.book_approach).trim();
  const bag = `${book?.title || ""} ${book?.summary_short || ""} ${(book?.broad_theme || []).join(" ")} ${(book?.fit_keywords || []).join(" ")}`;
  if (/(자서전|에세이|일기|기록|고백|삶|현장|환자|의사|간호사|수기|인터뷰)/.test(bag)) {
    return '현장형 · 자전적 에세이형';
  }
  if (/(역사|변화|발달|탄생|문명|과정|계보|기원)/.test(bag)) {
    return '역사 전개형 · 설명형';
  }
  if (/(비교|차이|분석|논쟁|쟁점|정책|사회|윤리)/.test(bag)) {
    return '분석형 · 비교형';
  }
  if (/(실험|원리|측정|구조|시스템|데이터|과학|기술|공학)/.test(bag)) {
    return '과학 설명형';
  }
  return '개념 확장형';
}

function buildBookContentPoints(book){
  const manual = Array.isArray(book?.book_content_points) ? book.book_content_points.filter(Boolean) : [];
  if (manual.length) return uniq(manual).slice(0, 5);

  const summary = buildBookSummaryText(book);
  const keywords = buildBookCoreKeywords(book, {}).slice(0, 4);
  const subjects = getDisplaySubjects(book).slice(0, 3);
  const majors = getDisplayMajors(book).slice(0, 3);
  const questionSeeds = coerceArray(book?.question_seeds).slice(0, 2);
  const points = [];
  if (summary) points.push(summary);
  questionSeeds.forEach(seed => points.push(seed));
  if (keywords.length) points.push(`핵심 키워드는 ${keywords.join(', ')}이며, 이 개념들을 중심으로 책의 내용을 이해할 수 있다.`);
  if (subjects.length) points.push(`${subjects.join('·')} 교과와 연결해 개념을 정리하기 좋다.`);
  if (majors.length) points.push(`${majors.join('·')} 관심 분야와 연결해 책의 의미를 파악할 수 있다.`);
  return uniq(points).slice(0, 4);
}


function isDisplayConceptTag(value){
  const s = String(value || '').trim();
  if (!s) return false;
  const blocked = [
    /탐구\s*보고서\s*작성/,
    /자료\s*수집[·ㆍ\-–~]?분석[·ㆍ\-–~]?결론\s*도출/,
    /생활\s*자료를\s*활용한\s*과학적\s*의사결정\s*탐구/,
    /의사결정\s*탐구/,
    /보고서\s*작성/,
    /자료\s*수집/,
    /결론\s*도출/,
    /조사\s*(중심|활동|설계)/,
    /발표\s*(중심|활동|설계)/,
    /탐구\s*(주제|활동|설계)/,
    /실험\s*(보고서|설계|수행|중심)/,
    /토론\s*(활동|중심|설계)/
  ];
  if (blocked.some(rx => rx.test(s))) return false;
  if (s.length > 22 && /(탐구|작성|활용|의사결정|자료|결론)/.test(s)) return false;
  return true;
}

function buildConnectableConcepts(book, ctx){
  const manual = Array.isArray(book?.connectable_concepts) ? book.connectable_concepts.filter(isDisplayConceptTag) : [];
  if (manual.length) return uniq(manual).slice(0, 6);

  const routeConcepts = uniq((book?.engine_subject_routes || [])
    .map(route => String(route?.concept || '').trim())
    .filter(isDisplayConceptTag));

  const ctxConcept = String(ctx?.selectedConcept || ctx?.concept || '').trim();
  const concepts = uniq([
    ...routeConcepts,
    ctxConcept
  ]).filter(isDisplayConceptTag);

  if (concepts.length) return concepts.slice(0, 6);

  const subjects = getDisplaySubjects(book);
  const fallback = [];
  if (subjects.some(v => /생명과학|보건/.test(v))) fallback.push('생명 시스템');
  if (subjects.some(v => /화학/.test(v))) fallback.push('물질 구성과 분류');
  if (subjects.some(v => /물리|정보/.test(v))) fallback.push('과학의 측정과 우리 사회');
  if (subjects.some(v => /지구과학|지리/.test(v))) fallback.push('자연 세계의 시간과 공간');
  return uniq(fallback).filter(isDisplayConceptTag).slice(0, 4);
}

  function buildReportOptionMeta(ctx){
    const sections = getBookRecommendationSections(ctx);
    const recommendations = sections.all || [];
    const selected = recommendations.find(item => item.book.book_id === ctx?.selectedBook)?.book || recommendations[0]?.book || null;
    const matchedRules = getMatchedRules(ctx);
    const keywordProfile = getKeywordProfile(ctx?.selectedKeyword || ctx?.keyword);
    const careerProfile = getCareerProfile(ctx?.selectedMajor || ctx?.career);

    const modeIds = uniq([
      ...matchedRules.flatMap(rule => rule.recommended_modes || []),
      ...(selected?.report_modes || selected?.fit_modes || []),
      "principle",
      "compare",
      "data",
      "application",
      "major"
    ]).map(v => {
      if (v === "case") return "application";
      if (v === "career") return "major";
      return v;
    });

    const modeOptions = DEFAULT_MODE_OPTIONS.filter(item => modeIds.includes(item.id));
    if (!modeOptions.length) modeOptions.push(...DEFAULT_MODE_OPTIONS.slice(0, 3));

    const viewOptions = uniq([
      ...matchedRules.flatMap(rule => rule.recommended_views || []),
      ...(selected?.perspectives || []),
      ...(keywordProfile?.perspectives || []),
      ...(careerProfile?.perspectives || []),
      ...DEFAULT_VIEW_OPTIONS
    ]).slice(0, 8);

    const reportLines = uniq([
      ...(selected?.report_lines || []),
      "기본형",
      "확장형",
      "심화형"
    ]).slice(0, 3);

    let recommendedLine = reportLines[0] || "기본형";
    if (reportLines.includes("확장형") && ["data", "compare", "application"].includes(ctx?.reportMode || "")) recommendedLine = "확장형";
    if (reportLines.includes("심화형") && (ctx?.reportMode === "major" || /(고3)/.test(ctx?.grade || ""))) recommendedLine = "심화형";

    return { selectedBook: selected, modeOptions, viewOptions, reportLines, recommendedLine };
  }


  function getRecommendationTypeLabel(sectionType){
    if (sectionType === "support") return "보고서 관점 보강 도서";
    if (sectionType === "explore") return "확장 참고 도서";
    return "직접 일치 도서";
  }

  function getReportSupportRole(book, ctx, sectionType){
    const modeLabels = coerceArray(book?.report_modes || book?.fit_modes)
      .map(mode => (DEFAULT_MODE_OPTIONS.find(item => item.id === mode) || {}).label || mode)
      .filter(Boolean);
    const perspectives = coerceArray(book?.perspectives).filter(Boolean);
    const evidenceTypes = coerceArray(book?.evidence_types).filter(Boolean);
    if (sectionType === "direct") {
      return "선택 개념·키워드와 직접 연결되는 보고서의 이론적 근거 도서";
    }
    if (sectionType === "explore") {
      return "4번 후속 연계축을 넓혀 사례·자료를 보강하는 확장 참고 도서";
    }
    if (modeLabels.length || perspectives.length || evidenceTypes.length) {
      const parts = [];
      if (modeLabels.length) parts.push(`${modeLabels.slice(0,2).join("·")} 전개`);
      if (perspectives.length) parts.push(`${perspectives.slice(0,2).join("·")} 관점`);
      if (evidenceTypes.length) parts.push(`${evidenceTypes.slice(0,2).join("·")} 근거`);
      return `${parts.join(" / ")}을 보강하는 도서`;
    }
    return "보고서 방식과 관점 선택을 보강하는 참고 도서";
  }

  function buildMatchReason(item, ctx, sectionType){
    const reasons = coerceArray(item?.reasons).filter(Boolean);
    const direct = [];
    if (ctx?.selectedConcept || ctx?.concept) direct.push(`개념 '${ctx.selectedConcept || ctx.concept}'`);
    if (ctx?.selectedKeyword || ctx?.keyword) direct.push(`키워드 '${ctx.selectedKeyword || ctx.keyword}'`);
    if (ctx?.selectedFollowupAxis || ctx?.followupAxisTitle) direct.push(`후속축 '${ctx.selectedFollowupAxis || ctx.followupAxisTitle}'`);
    if (sectionType === "direct") {
      return `${direct.join(" · ")}와 직접 연결되어 추천되었습니다.${reasons.length ? ` (${reasons.slice(0,3).join(" · ")})` : ""}`;
    }
    if (sectionType === "explore") {
      return `${ctx?.selectedFollowupAxis || ctx?.followupAxisTitle || "선택 후속축"}을 확장하는 참고 자료로 추천되었습니다.${reasons.length ? ` (${reasons.slice(0,3).join(" · ")})` : ""}`;
    }
    return `선택 도서를 보고서 방식·관점으로 전개할 때 보강 자료로 활용할 수 있어 추천되었습니다.${reasons.length ? ` (${reasons.slice(0,3).join(" · ")})` : ""}`;
  }

  function buildBookRecommendationDetail(item, ctx, sectionType){
    const book = item?.book || null;
    if (!book) return null;
    return {
      book_id: book.book_id || "",
      title: book.title || "",
      author: book.author || "",
      recommendation_type: getRecommendationTypeLabel(sectionType),
      match_reason: buildMatchReason(item, ctx, sectionType),
      report_support_role: getReportSupportRole(book, ctx, sectionType),
      matched_subject: ctx?.selectedSubject || ctx?.subject || "",
      matched_major: ctx?.selectedMajor || ctx?.career || "",
      matched_concept: ctx?.selectedConcept || ctx?.concept || "",
      matched_keyword: ctx?.selectedKeyword || ctx?.keyword || "",
      matched_followup_axis: ctx?.selectedFollowupAxis || ctx?.followupAxisTitle || "",
      matched_axis_label: ctx?.axisLabel || "",
      linked_subjects: coerceArray(ctx?.linkedSubjects),
      activity_example: ctx?.activityExample || "",
      longitudinal_path: ctx?.longitudinalPath || "",
      evidence_types: coerceArray(book?.evidence_types),
      report_modes: coerceArray(book?.report_modes || book?.fit_modes),
      perspectives: coerceArray(book?.perspectives),
      reasons: coerceArray(item?.reasons)
    };
  }

  function isReportSupportItem(item, ctx){
    if (!item?.book) return false;
    const book = item.book;
    const hasReportMeta = coerceArray(book?.report_modes || book?.fit_modes).length > 0 ||
      coerceArray(book?.perspectives).length > 0 ||
      coerceArray(book?.report_lines).length > 0 ||
      coerceArray(book?.evidence_types).length > 0 ||
      coerceArray(book?.question_seeds).length > 0;
    if (!hasReportMeta) return false;
    const signals = getMatchSignals(book, ctx);
    const axisHit = item.axisAffinity?.anyHit || false;
    return axisHit || signals.subjectHit || signals.themeConceptHit || signals.themeKeywordHit || signals.careerMajorHit || signals.bucketAffinity || item.score >= 12;
  }

  function renderBookCard(item, active, index, sectionType){
    const book = item.book;
    const labels = (item.reasons || []).slice(0, 2);
    if (sectionType === "direct") labels.push("직접 일치");
    if (sectionType === "explore") labels.push("확장 참고");
    if (sectionType === "support") labels.push("관점 보강");
    const reasonText = labels.length ? labels.join(" · ") : getRecommendationTypeLabel(sectionType);
    const subjectTag = getDisplaySubjects(book)[0] || "교과 연결";
    const previewText = buildBookPreviewText(book);
    return `
      <button type="button" class="engine-book-card ${active ? "is-active" : ""} book-chip" data-kind="book" data-value="${esc(book.book_id)}" data-title="${esc(book.title)}">
        <div class="engine-book-order">${index + 1}</div>
        <div class="engine-book-main">
          <div class="engine-book-title">${esc(book.title)}</div>
          <div class="engine-book-meta">${esc(book.author || "저자 정보 없음")} · ${esc(subjectTag)}</div>
          <div class="engine-book-preview">${esc(previewText)}</div>
          <div class="engine-book-reason">${esc(reasonText)}</div>
        </div>
      </button>
    `;
  }

function renderBookSummary(selectedBook, ctx, sectionType){
  if (!selectedBook) {
    return `<div class="engine-empty">왼쪽에서 도서를 선택하면 요약이 보입니다.</div>`;
  }
  const subjectTags = getDisplaySubjects(selectedBook).map(v => `<span class="engine-tag">${esc(v)}</span>`).join("");
  const majorTags = getDisplayMajors(selectedBook).map(v => `<span class="engine-tag subtle">${esc(v)}</span>`).join("");
  const badgeText = getRecommendationTypeLabel(sectionType);
  const summaryText = buildBookSummaryText(selectedBook);
  const formatText = buildBookFormatText(selectedBook);
  const contentPoints = buildBookContentPoints(selectedBook);
  const coreKeywords = buildBookCoreKeywords(selectedBook, ctx);
  const concepts = buildConnectableConcepts(selectedBook, ctx);

  const contentHTML = contentPoints.length
    ? `<ul class="engine-summary-list">${contentPoints.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`
    : `<div class="engine-summary-empty">도서 내용을 보강 중입니다.</div>`;

  const keywordHTML = coreKeywords.length
    ? `<div class="engine-tag-wrap">${coreKeywords.map(item => `<span class="engine-tag">${esc(item)}</span>`).join("")}</div>`
    : `<div class="engine-summary-empty">표시할 핵심 키워드가 아직 없습니다.</div>`;

  const conceptHTML = concepts.length
    ? `<div class="engine-tag-wrap">${concepts.map(item => `<span class="engine-tag subtle">${esc(item)}</span>`).join("")}</div>`
    : `<div class="engine-summary-empty">연결 가능한 교과 개념이 아직 없습니다.</div>`;

  return `
    <div class="engine-summary-box">
      <div class="engine-summary-top">
        <div>
          <div class="engine-summary-title">${esc(selectedBook.title)}</div>
          <div class="engine-summary-meta">${esc(selectedBook.author || "")}</div>
        </div>
        <div class="engine-summary-badge">${esc(badgeText)}</div>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">MINI 전달 추천 근거</div>
        <p class="engine-summary-note">${esc(buildMatchReason({ book: selectedBook, reasons: [] }, ctx, sectionType))}</p>
        <p class="engine-summary-note">${esc(getReportSupportRole(selectedBook, ctx, sectionType))}</p>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">이 책은 어떤 내용인가</div>
        <p class="engine-summary-text">${esc(summaryText)}</p>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">도서 내용</div>
        ${contentHTML}
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">책의 접근 방식 / 형태</div>
        <p class="engine-summary-note">${esc(formatText)}</p>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">이 책의 핵심 키워드</div>
        ${keywordHTML}
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">연결 가능한 교과 개념</div>
        ${conceptHTML}
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">이 책으로 출발할 수 있는 궁금증</div>
        ${coerceArray(selectedBook?.question_seeds).length ? `<ul class="engine-summary-list">${coerceArray(selectedBook.question_seeds).slice(0,3).map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : `<div class="engine-summary-empty">궁금증 문장을 보강 중입니다.</div>`}
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">추천 보고서 전개 방식</div>
        <div class="engine-tag-wrap">${coerceArray(selectedBook?.report_modes).length ? coerceArray(selectedBook.report_modes).map(item => `<span class="engine-tag">${esc((DEFAULT_MODE_OPTIONS.find(v => v.id === item) || {}).label || item)}</span>`).join("") : `<span class="engine-tag">원리 파악형</span>`}</div>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">추천 관점 / 라인</div>
        <div class="engine-tag-wrap">${coerceArray(selectedBook?.perspectives).slice(0,4).map(item => `<span class="engine-tag subtle">${esc(item)}</span>`).join("") || `<span class="engine-tag subtle">원리</span>`}${coerceArray(selectedBook?.report_lines).slice(0,3).map(item => `<span class="engine-tag">${esc(item)}</span>`).join("")}</div>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">관련 교과</div>
        <div class="engine-tag-wrap">${subjectTags || `<span class="engine-tag">관련 교과 보강 중</span>`}</div>
      </div>
      <div class="engine-summary-section">
        <div class="engine-summary-section-title">관련 학과</div>
        <div class="engine-tag-wrap">${majorTags || `<span class="engine-tag subtle">관련 학과 보강 중</span>`}</div>
      </div>
    </div>
  `;
}

  window.renderBookSelectionHTML = function(ctx){
    if (!(ctx?.selectedSubject || ctx?.subject) || !(ctx?.selectedMajor || ctx?.career)) {
      return `<div class="engine-empty">먼저 과목과 진로를 입력하세요.</div>`;
    }
    if (!(ctx?.selectedKeyword || ctx?.keyword)) {
      return `<div class="engine-empty">먼저 개념과 키워드를 선택해야 도서 추천이 열립니다.</div>`;
    }
    if (!ctx?.followupAxisId && !ctx?.selectedFollowupAxis) {
      return `<div class="engine-empty">먼저 4번 후속 연계축을 선택해야 도서 추천이 열립니다.</div>`;
    }
    if (!loaded) {
      return `<div class="engine-empty">도서 추천 데이터를 불러오는 중입니다.</div>`;
    }

    const sections = getBookRecommendationSections(ctx);
    const direct = sections.direct || [];
    const explore = sections.explore || [];
    const support = sections.support || [];
    const all = sections.all || [];

    if (!all.length) {
      return `<div class="engine-empty">현재 선택한 진로·개념·키워드와 직접 연결되는 도서 데이터가 아직 충분하지 않습니다. 관련 도서가 있을 때만 보여줍니다.</div>`;
    }

    const selectedItem = all.find(item => item.book.book_id === ctx.selectedBook) || direct[0] || explore[0] || support[0] || null;
    const selectedBook = selectedItem?.book || null;
    const selectedSection = selectedItem
      ? (direct.some(item => item.book.book_id === selectedItem.book.book_id) ? "direct"
        : (explore.some(item => item.book.book_id === selectedItem.book.book_id) ? "explore" : "support"))
      : "direct";

    const directHTML = direct.length
      ? direct.map((item, index) => renderBookCard(item, selectedBook && item.book.book_id === selectedBook.book_id, index, "direct")).join("")
      : `<div class="engine-empty">현재 선택한 진로·개념·키워드와 직접 일치하는 도서 데이터는 아직 충분하지 않습니다.</div>`;

    const exploreHTML = explore.length
      ? `
        <div style="margin-top:18px;">
          <div class="engine-subtitle">확장 참고 도서</div>
          <div class="engine-help">4번 후속 연계축과 연결되어 보고서 확장에 참고할 수 있는 도서입니다.</div>
          ${explore.map((item, index) => renderBookCard(item, selectedBook && item.book.book_id === selectedBook.book_id, index, "explore")).join("")}
        </div>
      `
      : "";

    const supportHTML = support.length
      ? `
        <div style="margin-top:18px;">
          <div class="engine-subtitle">보고서 관점 보강 도서</div>
          <div class="engine-help">6번 보고서 전개 방식과 7번 관점 선택에 근거를 보강하는 도서입니다.</div>
          ${support.map((item, index) => renderBookCard(item, selectedBook && item.book.book_id === selectedBook.book_id, index, "support")).join("")}
        </div>
      `
      : "";

    return `
      <div class="engine-book-layout">
        <div class="engine-book-list">
          <div class="engine-subtitle">직접 일치 도서</div>
          <div class="engine-help">3번 선택 개념·키워드와 4번 후속 연계축을 함께 반영해 직접 연결되는 도서를 먼저 보여줍니다.</div>
          ${directHTML}
          ${exploreHTML}
          ${supportHTML}
        </div>
        <div class="engine-book-summary">
          <div class="engine-subtitle">선택 도서 요약</div>
          ${renderBookSummary(selectedBook, ctx, selectedSection)}
        </div>
      </div>
    `;
  };

  window.getBookRecommendationDetail = function(bookId, ctx){
    if (!bookId) return null;
    const sections = getBookRecommendationSections(ctx || {});
    const allWithTypes = [
      ...(sections.direct || []).map(item => ({ item, type: "direct" })),
      ...(sections.explore || []).map(item => ({ item, type: "explore" })),
      ...(sections.support || []).map(item => ({ item, type: "support" }))
    ];
    const found = allWithTypes.find(entry => entry.item?.book?.book_id === bookId);
    if (found) return buildBookRecommendationDetail(found.item, ctx || {}, found.type);
    const book = books.find(item => item.book_id === bookId) || null;
    return book ? buildBookRecommendationDetail({ book, reasons: [] }, ctx || {}, "direct") : null;
  };

  window.getReportOptionMeta = function(ctx){
    return buildReportOptionMeta(ctx || {});
  };

  window.getSelectedBookDetail = function(bookId){
    return books.find(book => book.book_id === bookId) || null;
  };

  async function init(){
    const [masterData, reportCardData, bookData, filterData, lookupData, matrixData] = await Promise.all([
      loadJSON(MASTER_BOOK_URLS, null),
      loadJSON(REPORT_CARD_URLS, []),
      loadJSON(BOOK_URLS, []),
      loadJSON(FILTER_URLS, { subject_keyword_rules: [] }),
      loadJSON(LOOKUP_URLS, { career_index: {}, subject_index: {}, theme_index: {} }),
      loadJSON(TOPIC_MATRIX_URLS, null)
    ]);

    const masterBooks = extractIntegratedBooks(masterData);
    const preferredCards = masterBooks.length ? masterBooks : (Array.isArray(reportCardData) ? reportCardData : []);
    reportCards = preferredCards;

    const normalizedCards = reportCards.map(normalizeCardToBook).filter(Boolean);
    const legacyBooks = Array.isArray(bookData) ? bookData : [];
    const merged = [];
    const seen = new Set();
    normalizedCards.forEach(book => {
      const key = book?.book_id || book?.source_book_uid;
      if (key && !seen.has(key)) { seen.add(key); merged.push(book); }
    });
    legacyBooks.forEach(book => {
      const key = book?.book_id || book?.source_book_uid;
      if (key && !seen.has(key)) { seen.add(key); merged.push(book); }
    });
    books = merged;
    filterMap = filterData || { subject_keyword_rules: [] };
    lookup = lookupData || { career_index: {}, subject_index: {}, theme_index: {} };
    topicMatrix = matrixData || null;
    loaded = true;
    window.__BOOK_ENGINE_DATA_READY__ = true;

    if (typeof window.__BOOK_ENGINE_REQUEST_RERENDER__ === "function") {
      window.__BOOK_ENGINE_REQUEST_RERENDER__();
    }
  }

document.addEventListener("DOMContentLoaded", init);
})();
