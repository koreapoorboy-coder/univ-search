window.__TOPIC_GENERATOR_VERSION = "v10.0-book-filter-applied";

(function(){
  const BOOKS_URL = "seed/book-engine/mini_book_engine_books_starter.json";
  const FILTER_URL = "seed/book-engine/book_recommendation_filter_mapping.json";
  const PROMPT_URL = "mini/mini_generation_prompt.txt";

  const FALLBACK_BOOKS = [{"book_id": "book_1984", "title": "1984", "author": "조지 오웰", "summary_short": "감시와 통제, 언어 조작을 통해 사회 시스템이 개인을 어떻게 제한하는지 다루는 작품", "book_keywords": ["감시", "통제", "언어", "권력", "사회 시스템"], "starter_questions": ["감시 사회는 어디까지 허용될 수 있는가?", "언어가 사고를 바꿀 수 있는가?", "기술은 사회를 더 안전하게 만드는가, 더 통제하게 만드는가?"], "linked_subjects": ["통합사회", "정보", "공통국어"], "linked_majors": ["사회학과", "행정학과", "컴퓨터공학과"], "fit_keywords": ["감시", "통제", "시스템", "정보 처리", "데이터", "구조"], "fit_modes": ["compare", "career", "case"]}, {"book_id": "book_galmaegi", "title": "갈매기", "author": "안톤 체호프", "summary_short": "인물의 욕망과 좌절, 예술관의 충돌을 통해 감정과 관계를 탐구하는 작품", "book_keywords": ["욕망", "감정", "관계", "예술", "무의식"], "starter_questions": ["예술적 이상과 현실적 제약은 어떻게 충돌하는가?", "인물의 감정 변화는 어떤 계기로 나타나는가?", "관계 속 상처는 선택에 어떤 영향을 주는가?"], "linked_subjects": ["문학", "공통국어", "심리학 기초"], "linked_majors": ["심리학과", "국어국문학과", "연극영화과"], "fit_keywords": ["감정", "관계", "무의식", "표현", "갈등", "변화"], "fit_modes": ["compare", "case", "career"]}, {"book_id": "book_gyeongyeonghak", "title": "경영학 콘서트", "author": "장영재", "summary_short": "데이터와 시스템 사고로 기업 의사결정 구조와 효율 문제를 설명하는 책", "book_keywords": ["데이터", "의사결정", "효율", "시스템", "최적화"], "starter_questions": ["데이터 기반 의사결정은 기업에 어떤 변화를 만드는가?", "효율을 높이는 시스템은 항상 공정한가?", "ESG 전략은 기업 성과와 어떤 관계가 있는가?"], "linked_subjects": ["정보", "수학", "경제"], "linked_majors": ["경영학과", "산업공학과", "통계학과"], "fit_keywords": ["데이터", "구조", "시스템", "효율", "분석", "정보 처리"], "fit_modes": ["case", "application", "career", "compare"]}, {"book_id": "book_doctorsignal", "title": "닥터스 씽킹", "author": "제롬 그루프만", "summary_short": "의사의 사고 과정과 진단 오류, 판단의 편향을 다루는 책", "book_keywords": ["진단", "오류", "판단", "편향", "증거"], "starter_questions": ["의사의 판단에서 오류는 왜 생기는가?", "증거 기반 판단은 어떻게 더 나은 결정을 돕는가?", "데이터와 직관은 어떤 관계인가?"], "linked_subjects": ["생명과학", "통계", "정보", "윤리"], "linked_majors": ["의예과", "간호학과", "보건행정학과"], "fit_keywords": ["자극 반응", "항상성", "반응", "오류", "증거", "건강 측정", "생체 데이터"], "fit_modes": ["case", "career", "compare"]}, {"book_id": "book_demian", "title": "데미안", "author": "헤르만 헤세", "summary_short": "자아 발견과 성장, 내면의 갈등을 통해 정체성을 찾아가는 과정을 다룬 작품", "book_keywords": ["자아", "성장", "정체성", "갈등", "선택"], "starter_questions": ["자아를 찾아가는 과정에서 사회 규범은 어떤 영향을 주는가?", "성장은 왜 갈등을 통해 이루어지는가?", "진짜 나를 찾는다는 것은 무엇을 의미하는가?"], "linked_subjects": ["문학", "윤리", "심리학 기초"], "linked_majors": ["심리학과", "철학과", "교육학과"], "fit_keywords": ["정체성", "성장", "갈등", "선택", "변화", "심리"], "fit_modes": ["compare", "career", "application"]}, {"book_id": "book_science_history", "title": "과학혁명의 법칙", "author": "이언 스튜어트", "summary_short": "과학사와 관측, 모형의 변화 과정을 통해 자연과학의 발전을 설명하는 책", "book_keywords": ["과학사", "천문", "관측", "모형", "자연과학"], "starter_questions": ["과학 개념은 왜 시대에 따라 달라지는가?", "천체 관측은 과학 모델을 어떻게 바꾸어 왔는가?", "과학적 설명은 어떤 증거를 통해 강화되는가?"], "linked_subjects": ["통합과학1", "지구과학", "공통수학1"], "linked_majors": ["지구과학과", "천문우주학과", "환경공학과"], "fit_keywords": ["수성", "금성", "행성", "천체", "지구계", "과학 모델", "관측"], "fit_modes": ["case", "compare", "application"]}, {"book_id": "book_cosmos_intro", "title": "코스모스", "author": "칼 세이건", "summary_short": "우주와 천체, 생명의 연결을 대중적으로 풀어낸 과학 교양서", "book_keywords": ["우주", "천체", "과학 커뮤니케이션", "자연"], "starter_questions": ["우주를 이해하는 방식은 어떻게 발전해 왔는가?", "행성 환경의 차이는 무엇으로 설명할 수 있는가?", "인간은 왜 우주를 탐구하려 하는가?"], "linked_subjects": ["통합과학1", "지구과학"], "linked_majors": ["천문우주학과", "지구과학과", "환경공학과"], "fit_keywords": ["수성", "금성", "행성", "천체", "우주", "지구계"], "fit_modes": ["case", "application", "career"]}, {"book_id": "book_science_guide", "title": "과학의 눈으로 세상 읽기", "author": "오퍼상 저자", "summary_short": "과학적 사고와 자연 현상, 데이터 해석을 연결하는 설명형 도서", "book_keywords": ["과학적 사고", "자연 현상", "데이터", "구조"], "starter_questions": ["자연 현상은 어떤 구조로 설명할 수 있는가?", "데이터는 현상을 어떻게 해석하게 해 주는가?", "과학적 설명은 무엇을 근거로 설득력을 갖는가?"], "linked_subjects": ["통합과학1", "정보", "통합사회"], "linked_majors": ["환경공학과", "데이터사이언스학과", "자연과학계열"], "fit_keywords": ["수성", "금성", "지구계", "데이터", "구조", "환경 데이터", "시스템 구성 요소"], "fit_modes": ["case", "compare", "application", "career"]}, {"book_id": "book_medical_thinking", "title": "의학적 사고의 법칙", "author": "가상 저자", "summary_short": "의학 판단과 근거, 반응 해석을 중심으로 건강 데이터를 해석하는 책", "book_keywords": ["의학", "증거", "판단", "반응", "건강"], "starter_questions": ["건강 데이터는 어떻게 더 정확한 판단을 돕는가?", "몸의 반응을 어떻게 해석해야 하는가?", "의학적 판단은 어떤 근거를 통해 더 나아지는가?"], "linked_subjects": ["생명과학", "통합과학1", "보건"], "linked_majors": ["간호학과", "의예과", "보건행정학과"], "fit_keywords": ["자극 반응", "항상성 유지", "건강 측정", "생체 데이터", "판단"], "fit_modes": ["case", "career", "compare"]}];
  const FALLBACK_FILTER = {"subject_keyword_rules": [{"rule_id": "astro_planetary", "subjects": ["통합과학1"], "concepts": ["지구시스템", "자연 세계의 시간과 공간"], "keywords": ["수성", "금성", "지구", "화성", "목성", "토성", "해왕성", "천체 분류", "지구계", "대기권", "수권", "물의 순환", "권역 간 이동"], "recommended_books": ["book_science_history", "book_cosmos_intro", "book_science_guide"], "blocked_books": ["book_1984", "book_galmaegi", "book_demian", "book_doctorsignal", "book_medical_thinking"], "recommended_modes": ["case", "compare", "application"], "recommended_views": ["원리", "구조", "변화", "영향"]}, {"rule_id": "bio_response", "subjects": ["통합과학1", "생명과학"], "concepts": ["생명 시스템"], "keywords": ["자극 반응", "항상성 유지", "내부 환경", "균형 유지", "생명 유지", "변화 대응", "건강 측정", "생체 데이터"], "recommended_books": ["book_doctorsignal", "book_medical_thinking", "book_demian"], "blocked_books": ["book_1984"], "recommended_modes": ["case", "career", "compare"], "recommended_views": ["기능", "비교", "변화", "영향"]}, {"rule_id": "system_data", "subjects": ["통합과학1", "정보", "통합사회"], "concepts": ["역학 시스템", "지구시스템", "정보"], "keywords": ["시스템 구성 요소", "구조", "데이터", "정보 처리", "효율", "시스템 사고", "환경 데이터"], "recommended_books": ["book_gyeongyeonghak", "book_1984", "book_science_guide"], "blocked_books": [], "recommended_modes": ["compare", "application", "career", "case"], "recommended_views": ["구조", "기능", "비교", "영향"]}, {"rule_id": "emotion_identity", "subjects": ["공통국어", "문학", "윤리"], "concepts": ["문학 감상", "자아 탐색", "윤리적 성찰"], "keywords": ["감정", "정체성", "선택", "성장", "갈등", "관계"], "recommended_books": ["book_demian", "book_galmaegi"], "blocked_books": ["book_gyeongyeonghak"], "recommended_modes": ["compare", "career", "application"], "recommended_views": ["변화", "비교", "영향"]}], "career_rules": [{"career_keywords": ["지구환경", "환경 분석", "환경공학", "지구과학", "천문", "우주"], "preferred_books": ["book_science_history", "book_cosmos_intro", "book_science_guide"], "preferred_modes": ["case", "application", "career"], "preferred_views": ["원리", "구조", "영향"], "linked_majors": ["지구과학과", "환경공학과", "천문우주학과", "해양학과"]}, {"career_keywords": ["간호", "의예", "보건", "생명", "의생명"], "preferred_books": ["book_doctorsignal", "book_medical_thinking"], "preferred_modes": ["case", "career", "compare"], "preferred_views": ["기능", "비교", "변화"], "linked_majors": ["간호학과", "의예과", "보건행정학과", "생명과학과"]}, {"career_keywords": ["컴퓨터", "소프트웨어", "인공지능", "데이터", "정보보호"], "preferred_books": ["book_1984", "book_gyeongyeonghak"], "preferred_modes": ["compare", "career", "application"], "preferred_views": ["구조", "기능", "영향"], "linked_majors": ["컴퓨터공학과", "소프트웨어학과", "인공지능학과", "데이터사이언스학과"]}, {"career_keywords": ["기계", "반도체", "전자", "신소재"], "preferred_books": ["book_gyeongyeonghak", "book_science_guide"], "preferred_modes": ["application", "case", "career"], "preferred_views": ["구조", "원리", "기능"], "linked_majors": ["기계공학과", "전자공학과", "반도체공학과", "신소재공학과"]}]};
  const FALLBACK_PROMPT = "[ROLE]\n너는 교과 개념-도서-수행평가-진로 연결 데이터를 읽고,\n학생 제출형 탐구 제목과 보고서 초안을 생성하는 엔진이다.\n\n[INPUT RULE]\n- 반드시 입력 JSON만 기준으로 해석한다.\n- 입력에 없는 비약적 결론은 만들지 않는다.\n- connection_points의 근거를 우선 사용한다.\n- 제목은 고등학생 수행평가 제출 수준의 자연스러운 한국어로 만든다.\n\n[OUTPUT RULE]\n1. 탐구 제목 3안\n2. 가장 적합한 제목 1안\n3. 제목 선택 이유 3줄\n4. 학생 제출형 보고서 초안(서론-본론-결론)\n5. 생기부 반영형 요약 문장 2안";

  let bookSeed = null;
  let filterSeed = null;
  let promptText = FALLBACK_PROMPT;
  let listenersBound = false;

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }
  function normalize(v) {
    return String(v || "").replace(/\s+/g, "").toLowerCase();
  }

  async function loadBooks(){
    if (bookSeed) return bookSeed;
    try {
      const res = await fetch(BOOKS_URL, { cache:"no-store" });
      if(res.ok) {
        bookSeed = await res.json();
        return bookSeed;
      }
    } catch(e) {}
    bookSeed = FALLBACK_BOOKS;
    return bookSeed;
  }

  async function loadFilter(){
    if (filterSeed) return filterSeed;
    try {
      const res = await fetch(FILTER_URL, { cache:"no-store" });
      if(res.ok) {
        filterSeed = await res.json();
        return filterSeed;
      }
    } catch(e) {}
    filterSeed = FALLBACK_FILTER;
    return filterSeed;
  }

  async function loadPrompt(){
    try {
      const res = await fetch(PROMPT_URL, { cache:"no-store" });
      if(res.ok) promptText = await res.text();
    } catch(e) {}
    return promptText;
  }

  function getBooks() { return bookSeed || FALLBACK_BOOKS; }
  function getFilter() { return filterSeed || FALLBACK_FILTER; }

  function getCurrentBook(root) {
    const id = root.querySelector('.book-chip[data-kind="book"].is-active')?.getAttribute("data-value");
    return getBooks().find(b => b.book_id === id) || getBooks()[0];
  }

  function modeLabel(mode) {
    return {
      case: "사례 조사",
      compare: "비교 탐구",
      application: "응용 탐구",
      career: "진로 연결"
    }[mode] || "사례 조사";
  }

  function textIncludesAny(text, arr) {
    const nt = normalize(text);
    return (arr || []).some(v => {
      const nv = normalize(v);
      return nt.includes(nv) || nv.includes(nt);
    });
  }

  function getMatchedRules(subject, concept, keyword) {
    const rules = getFilter().subject_keyword_rules || [];
    return rules.filter(rule =>
      (!rule.subjects?.length || rule.subjects.includes(subject)) &&
      (!rule.concepts?.length || rule.concepts.includes(concept)) &&
      (!rule.keywords?.length || textIncludesAny(keyword, rule.keywords))
    );
  }

  function getMatchedCareerRule(career) {
    const rules = getFilter().career_rules || [];
    return rules.find(rule => textIncludesAny(career, rule.career_keywords)) || null;
  }

  function scoreBook(book, subject, concept, keyword, career) {
    let score = 0;
    const matchedRules = getMatchedRules(subject, concept, keyword);
    const careerRule = getMatchedCareerRule(career);

    for(const rule of matchedRules) {
      if((rule.blocked_books || []).includes(book.book_id)) return -999;
      if((rule.recommended_books || []).includes(book.book_id)) score += 100;
      if((rule.recommended_modes || []).length) score += 5;
    }

    if(careerRule) {
      if((careerRule.preferred_books || []).includes(book.book_id)) score += 60;
    }

    if(textIncludesAny(keyword, book.fit_keywords || [])) score += 40;
    if(textIncludesAny(subject, book.fit_subjects || [])) score += 20;
    if(textIncludesAny(career, book.fit_careers || [])) score += 20;
    if(textIncludesAny(keyword, book.blocked_keywords || [])) score -= 120;

    return score;
  }

  function getRecommendedModes(subject, concept, keyword, career) {
    const matchedRules = getMatchedRules(subject, concept, keyword);
    const careerRule = getMatchedCareerRule(career);
    const modeSet = new Set();

    matchedRules.forEach(rule => (rule.recommended_modes || []).forEach(m => modeSet.add(m)));
    if(careerRule) (careerRule.preferred_modes || []).forEach(m => modeSet.add(m));
    if(!modeSet.size) ["case","compare","application","career"].forEach(m => modeSet.add(m));

    return Array.from(modeSet);
  }

  function getRecommendedViews(subject, concept, keyword, career) {
    const matchedRules = getMatchedRules(subject, concept, keyword);
    const careerRule = getMatchedCareerRule(career);
    const viewSet = new Set();

    matchedRules.forEach(rule => (rule.recommended_views || []).forEach(v => viewSet.add(v)));
    if(careerRule) (careerRule.preferred_views || []).forEach(v => viewSet.add(v));
    if(!viewSet.size) ["원리","구조","기능","비교","변화","영향"].forEach(v => viewSet.add(v));
    return Array.from(viewSet);
  }

  function getRecommendedBooks(subject, concept, keyword, career) {
    return [...getBooks()]
      .map(book => ({ book, score: scoreBook(book, subject, concept, keyword, career) }))
      .filter(x => x.score > -500)
      .sort((a,b) => b.score - a.score)
      .map(x => x.book)
      .slice(0, 5);
  }

  function buildConnectionPoints(keyword, book, mode, career, subject, concept) {
    const matchedRules = getMatchedRules(subject, concept, keyword);
    const careerRule = getMatchedCareerRule(career);
    const conceptReason = matchedRules[0]?.reason || `${keyword}은(는) '${book.title}'의 문제의식과 연결 가능한 교과 출발점이다.`;
    const taskReason = `'${book.title}'의 질문 구조는 ${modeLabel(mode)} 방식으로 전개하기에 적합하다.`;
    const careerReason = careerRule
      ? `${modeLabel(mode)} 방식은 ${career}와(과) 관련된 탐구 결과를 만들기에 적합하다.`
      : `${modeLabel(mode)} 방식은 ${career}와 연결 가능한 탐구 확장 방향이다.`;

    return {
      concept_to_book: [{ strength: "high", reason: conceptReason }],
      book_to_task: [{ strength: "high", reason: taskReason }],
      task_to_career: [{ strength: "high", reason: careerReason }]
    };
  }

  function getLinkedMajors(book, career) {
    const careerRule = getMatchedCareerRule(career);
    if(careerRule?.linked_majors?.length) return careerRule.linked_majors;
    return book.linked_majors || [];
  }

  function buildAllowedNavigation(book, subject, concept, keyword, career) {
    return {
      recommended_questions: book.starter_questions || [],
      recommended_cases: (book.book_keywords || []).slice(0, 3),
      recommended_views: getRecommendedViews(subject, concept, keyword, career),
      recommended_modes: getRecommendedModes(subject, concept, keyword, career).map(modeLabel)
    };
  }

  function buildFinalTitle(payload) {
    const q = payload.book_context.selected_question;
    const k = payload.student_context.textbook_keyword;
    const m = payload.task_context.performance_task_mode;
    const c = payload.career_context.target_career;
    const t = payload.book_context.title;

    if (m === "사례 조사") return `『${t}』의 "${q}"를 바탕으로 ${k}을(를) 사례 조사하기`;
    if (m === "비교 탐구") return `『${t}』의 "${q}"를 바탕으로 ${k}을(를) 비교 탐구하기`;
    if (m === "응용 탐구") return `『${t}』의 문제의식을 바탕으로 ${k}이(가) ${c} 방향에서 어떻게 적용되는지 탐구하기`;
    return `『${t}』의 "${q}"를 바탕으로 ${k}을(를) ${c}와 연결해 탐구하기`;
  }

  function buildMiniPayload(root) {
    const subject = root.getAttribute("data-subject") || "";
    const concept = root.getAttribute("data-concept") || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const book = getCurrentBook(root);
    const mode = root.querySelector('.book-chip[data-kind="mode"].is-active')?.getAttribute("data-value") || "case";
    const question = root.querySelector('.book-chip[data-kind="question"].is-active')?.getAttribute("data-value") || (book.starter_questions?.[0] || "");
    const taskType = $("taskType")?.value || "탐구 보고서";
    const taskDesc = $("taskDescription")?.value || "";

    const payload = {
      source_type: "book_textbook_navigation",
      student_context: {
        school_level: $("grade")?.value || "",
        subject,
        textbook_concept: concept,
        textbook_keyword: keyword
      },
      book_context: {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        summary_short: book.summary_short,
        book_keywords: book.book_keywords || [],
        starter_questions: book.starter_questions || [],
        selected_question: question
      },
      task_context: {
        performance_task_mode: modeLabel(mode),
        task_output_type: taskType,
        task_constraints: taskDesc ? [taskDesc] : []
      },
      career_context: {
        target_career: career,
        linked_majors: getLinkedMajors(book, career)
      },
      connection_points: buildConnectionPoints(keyword, book, mode, career, subject, concept),
      allowed_navigation: buildAllowedNavigation(book, subject, concept, keyword, career),
      mini_generation_rules: {
        must_include: ["도서의 문제의식","교과 개념 또는 키워드","수행평가 방식","학생 진로 연결"],
        must_avoid: ["입력에 없는 비약적 결론","대학 수준 과도한 전문용어","도서와 무관한 사례 확장"],
        output_requests: ["탐구 제목 3안","가장 적합한 제목 1안","학생 제출형 보고서 초안","생기부 반영형 요약 문장"]
      }
    };
    payload.final_title = buildFinalTitle(payload);
    return payload;
  }

  function buildMiniBlock(payload) {
    return `[MINI_REPORT_INPUT_JSON]\n${JSON.stringify(payload, null, 2)}\n\n[MINI_REPORT_PROMPT]\n${promptText}`;
  }

  function updateQuestions(root) {
    const book = getCurrentBook(root);
    const wrap = root.querySelector(".book-question-wrap");
    if(!wrap) return;
    wrap.innerHTML = (book.starter_questions || []).map((q, i) => `
      <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="question" data-value="${esc(q)}">${esc(q)}</button>
    `).join("");
  }

  function updateModeButtons(root) {
    const subject = root.getAttribute("data-subject") || "";
    const concept = root.getAttribute("data-concept") || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const wrap = root.querySelector(".book-mode-wrap");
    if(!wrap) return;

    const modes = getRecommendedModes(subject, concept, keyword, career);
    wrap.innerHTML = modes.map((m, i) => `
      <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="mode" data-value="${esc(m)}">${esc(modeLabel(m))}</button>
    `).join("");
  }

  function updateBookButtons(root) {
    const subject = root.getAttribute("data-subject") || "";
    const concept = root.getAttribute("data-concept") || "";
    const keyword = root.getAttribute("data-keyword") || "";
    const career = root.getAttribute("data-career") || "";
    const wrap = root.querySelector(".book-book-wrap");
    if(!wrap) return;

    const recBooks = getRecommendedBooks(subject, concept, keyword, career);
    wrap.innerHTML = recBooks.map((b, i) => `
      <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="book" data-value="${esc(b.book_id)}">${esc(b.title)}</button>
    `).join("");
  }

  function updateResult(root) {
    const payload = buildMiniPayload(root);
    const titleEl = root.querySelector(".book-final-title");
    if(titleEl) titleEl.textContent = payload.final_title;
    const textarea = root.querySelector(".book-mini-payload");
    if(textarea) textarea.value = buildMiniBlock(payload);
  }

  function applyToTaskDescription(root) {
    const taskDesc = $("taskDescription");
    const payloadText = root.querySelector(".book-mini-payload")?.value || "";
    if(!taskDesc || !payloadText) return;

    const cleaned = (taskDesc.value || "").replace(/\n*\[MINI_REPORT_INPUT_JSON\][\s\S]*$/m, "").trim();
    taskDesc.value = cleaned ? `${cleaned}\n\n${payloadText}` : payloadText;

    const notice = root.querySelector(".book-copy-notice");
    if(notice) {
      notice.textContent = "필터링된 MINI용 JSON 입력값이 수행평가 설명 칸에 반영됐어요.";
      notice.style.display = "block";
      setTimeout(() => notice.style.display = "none", 2200);
    }
  }

  function refreshAll(root) {
    updateBookButtons(root);
    updateQuestions(root);
    updateModeButtons(root);
    updateResult(root);
  }

  function bindEvents() {
    if(listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", function(event) {
      const chip = event.target.closest(".book-chip");
      if(chip) {
        const root = chip.closest(".book-puzzle-root");
        if(!root) return;
        if(chip.classList.contains("is-active")) return;

        const kind = chip.getAttribute("data-kind");
        root.querySelectorAll(`.book-chip[data-kind="${kind}"]`).forEach(btn => btn.classList.remove("is-active"));
        chip.classList.add("is-active");

        if(kind === "book") {
          updateQuestions(root);
        }
        updateResult(root);
        return;
      }

      const btn = event.target.closest(".book-apply-btn");
      if(btn) {
        const root = btn.closest(".book-puzzle-root");
        if(root) applyToTaskDescription(root);
      }
    });
  }

  window.renderTopicSuggestionHTML = function(ctx) {
    const keyword = ctx?.keyword || "";
    const subject = ctx?.subject || "";
    const concept = ctx?.concept || "";
    const career = ctx?.career || "";
    if(!keyword || !career) return "";

    bindEvents();
    loadPrompt();

    const recBooks = getRecommendedBooks(subject, concept, keyword, career);
    const firstBook = recBooks[0] || getBooks()[0];
    const recModes = getRecommendedModes(subject, concept, keyword, career);

    loadBooks().then(() => loadFilter()).then(() => {
      document.querySelectorAll(".book-puzzle-root").forEach(root => refreshAll(root));
    });

    const initialPayload = {
      source_type: "book_textbook_navigation",
      student_context: {
        school_level: $("grade")?.value || "",
        subject,
        textbook_concept: concept,
        textbook_keyword: keyword
      },
      book_context: {
        book_id: firstBook.book_id,
        title: firstBook.title,
        author: firstBook.author,
        summary_short: firstBook.summary_short,
        book_keywords: firstBook.book_keywords || [],
        starter_questions: firstBook.starter_questions || [],
        selected_question: firstBook.starter_questions?.[0] || ""
      },
      task_context: {
        performance_task_mode: modeLabel(recModes[0] || "case"),
        task_output_type: $("taskType")?.value || "탐구 보고서",
        task_constraints: []
      },
      career_context: {
        target_career: career,
        linked_majors: getLinkedMajors(firstBook, career)
      },
      connection_points: buildConnectionPoints(keyword, firstBook, recModes[0] || "case", career, subject, concept),
      allowed_navigation: buildAllowedNavigation(firstBook, subject, concept, keyword, career),
      mini_generation_rules: {
        must_include: ["도서의 문제의식","교과 개념 또는 키워드","수행평가 방식","학생 진로 연결"],
        must_avoid: ["입력에 없는 비약적 결론","대학 수준 과도한 전문용어","도서와 무관한 사례 확장"],
        output_requests: ["탐구 제목 3안","가장 적합한 제목 1안","학생 제출형 보고서 초안","생기부 반영형 요약 문장"]
      }
    };
    initialPayload.final_title = buildFinalTitle(initialPayload);

    return `
      <div class="book-puzzle-root" data-keyword="${esc(keyword)}" data-subject="${esc(subject)}" data-concept="${esc(concept)}" data-career="${esc(career)}">
        <div class="book-puzzle-head">
          <h4>5. 도서에서 시작하는 탐구 퍼즐</h4>
          <div class="book-puzzle-guide">추천 필터 적용</div>
        </div>

        <p class="book-puzzle-desc">교과 키워드와 진로에 맞는 도서만 먼저 추천하고, 그 연결점만 MINI에 넘깁니다.</p>

        <div class="book-step">
          <div class="book-step-label">1. 추천 도서 선택</div>
          <div class="book-chip-wrap book-book-wrap">
            ${recBooks.map((b, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="book" data-value="${esc(b.book_id)}">${esc(b.title)}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">2. 도서 기반 시작 질문 선택</div>
          <div class="book-chip-wrap book-question-wrap">
            ${(firstBook.starter_questions || []).map((q, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="question" data-value="${esc(q)}">${esc(q)}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-step">
          <div class="book-step-label">3. 추천 수행평가 방식 선택</div>
          <div class="book-chip-wrap book-mode-wrap">
            ${recModes.map((m, i) => `
              <button type="button" class="book-chip ${i===0 ? "is-active" : ""}" data-kind="mode" data-value="${esc(m)}">${esc(modeLabel(m))}</button>
            `).join("")}
          </div>
        </div>

        <div class="book-result-box">
          <div class="book-result-label">자동 생성 탐구 보고서 제목</div>
          <div class="book-final-title">${esc(initialPayload.final_title)}</div>
        </div>

        <textarea class="book-mini-payload" style="display:none;">${esc(buildMiniBlock(initialPayload))}</textarea>
        <button type="button" class="book-apply-btn">보고서 만들기</button>
        <div class="book-copy-notice" style="display:none;"></div>
      </div>
    `;
  };
})();
