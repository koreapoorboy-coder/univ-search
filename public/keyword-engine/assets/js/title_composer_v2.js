(function (global) {
  "use strict";

  const VERSION = "patch6-title-composer-v2-audit-only";
  const PLACEHOLDERS = ["선택 키워드", "탐구 대상", "교과 개념", "미입력", "undefined", "null"];
  const CAREER_TERMS = /(?:진로|학과|전공|직업|계열)/g;
  const GENERIC_OBJECTS = new Set([
    "보고서", "탐구 보고서", "탐구보고서", "발표", "수행평가", "평가", "과제",
    "포트폴리오", "활동지", "주제", "자료", "선택 키워드", "탐구 대상", "교과 개념"
  ]);
  const STOP_TOKENS = new Set([
    "대해", "대한", "통해", "위해", "관련", "바탕으로", "활용하여", "작성", "작성하기",
    "탐구", "탐구하기", "분석", "분석하기", "비교", "비교하기", "설명", "설명하기",
    "논술", "논술하기", "보고서", "수행평가", "과제", "평가", "학생", "다양한",
    "어떤", "어떻게", "그리고", "또한", "결과", "과정", "선택", "미입력"
  ]);
  const TEMPLATE_ORDER = [
    "EXP_EFFECT_A", "EXP_EFFECT_B", "COMPARE_A", "COMPARE_B",
    "DATA_REL_A", "DATA_REL_B", "CASE_MECH_A", "CASE_MECH_B",
    "DESIGN_APP_A", "DESIGN_APP_B", "ARG_EVAL_A", "ARG_EVAL_B", "ARG_EVAL_C", "ARG_EVAL_D",
    "MATH_MODEL_A", "MATH_MODEL_B", "GENERAL_A", "GENERAL_B", "GENERAL_SAFE"
  ];

  function text(value) {
    return String(value == null ? "" : value).normalize("NFKC").replace(/\s+/g, " ").trim();
  }
  function list(value) {
    return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  }
  function uniq(values) {
    return [...new Set(values.map(text).filter(Boolean))];
  }
  function normalize(value) {
    return text(value).toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
  }
  function tokens(value) {
    return text(value).replace(/[^0-9A-Za-z가-힣]+/g, " ").split(/\s+/)
      .map(token => token.replace(/(?:은|는|이|가|을|를|과|와|의|에|에서|으로|로)$/u, ""))
      .filter(token => token.length >= 2 && !STOP_TOKENS.has(token));
  }
  function includesEvidence(candidate, guide) {
    const normalizedCandidate = normalize(candidate);
    const normalizedGuide = normalize(guide);
    if (!normalizedCandidate || !normalizedGuide) return false;
    if (normalizedGuide.includes(normalizedCandidate)) return true;
    const candidateTokens = tokens(candidate);
    const guideTokens = new Set(tokens(guide));
    return candidateTokens.length > 0 && candidateTokens.some(token => guideTokens.has(token));
  }
  function stripForbidden(value) {
    let output = text(value)
      .replace(/\[[^\]]{0,40}\]/g, " ")
      .replace(CAREER_TERMS, " ")
      .replace(/\b(?:major|seed)_[0-9A-Za-z가-힣_-]+\b/gi, " ");
    PLACEHOLDERS.forEach(item => { output = output.split(item).join(" "); });
    return text(output)
      .replace(/^[·•\-–—:;,.\s]+|[·•\-–—:;,.\s]+$/g, "")
      .replace(/\s+([,.:;])/g, "$1");
  }
  function trimObject(value, max = 34) {
    let output = stripForbidden(value)
      .replace(/^(?:다음|아래|제시된|선택한)\s+/g, "")
      .replace(/\s*(?:탐구\s*)?(?:보고서|발표자료|발표|논술문|포트폴리오|활동지)\s*(?:작성|제작)?(?:하기)?$/g, "")
      .replace(/\s*(?:조사|분석|비교|설명|논술|탐구|작성|발표|제작|설계|평가)(?:하여|하고|하기)?$/g, "")
      .replace(/[.?!]+$/g, "");
    if ([...output].length > max) {
      const clipped = [...output].slice(0, max + 1).join("");
      const cut = Math.max(clipped.lastIndexOf(" "), clipped.lastIndexOf(","), clipped.lastIndexOf("·"));
      output = cut >= Math.floor(max * 0.55) ? clipped.slice(0, cut) : [...output].slice(0, max).join("");
    }
    return text(output);
  }
  function extractObject(guide) {
    const source = stripForbidden(guide);
    const early = source.slice(0, 150);
    const actionPattern = /^(.{2,80}?)(?:을|를|에 대해|에 대한)?\s*(?:조사|분석|비교|설명|논술|탐구|작성|발표|제작|설계|평가)(?:하여|하고|하기)/u;
    const actionMatch = early.match(actionPattern);
    const sentence = early.split(/[.!?\n]|(?:평가\s*요소)|(?:성취기준)|(?:채점기준)/)[0];
    let candidate = trimObject(actionMatch?.[1] || sentence || "", 34);
    if (GENERIC_OBJECTS.has(candidate) || candidate.length < 2) {
      const meaningful = tokens(source).filter(token => !GENERIC_OBJECTS.has(token)).slice(0, 4);
      candidate = trimObject(meaningful.join(" "), 30);
    }
    return candidate;
  }
  function conceptCandidates(input, guide) {
    const detail = input.conceptDetail || {};
    const scope = text(detail.evidenceScope || "none");
    const directAllowed = scope === "guide" || scope === "both";
    const candidates = directAllowed
      ? uniq([...list(detail.matchedTerms), ...list(detail.parentConcepts), ...list(input.subjectConcepts)])
      : [];
    const subject = normalize(input.subject);
    return candidates
      .filter(candidate => normalize(candidate) !== subject)
      .filter(candidate => includesEvidence(candidate, guide))
      .map(candidate => trimObject(candidate, 20))
      .filter(candidate => candidate.length >= 2 && !GENERIC_OBJECTS.has(candidate))
      .slice(0, 3);
  }
  function guideConceptFallback(guide, objectValue, subject) {
    const objectTokens = new Set(tokens(objectValue));
    const subjectKey = normalize(subject);
    return uniq(tokens(guide))
      .filter(token => !objectTokens.has(token) && normalize(token) !== subjectKey)
      .filter(token => !/^(?:보고서|수행평가|과제|평가|작성|탐구|분석|비교|설명)$/.test(token))
      .slice(0, 2);
  }
  function determineType(interpreter, guide) {
    if (interpreter?.fallbackActive === true) return "GENERAL_ANALYSIS";
    const method = [
      ...list(interpreter?.methodAxes),
      ...list(interpreter?.reportModes),
      ...list(interpreter?.outputAxes),
      text(interpreter?.ruleId),
      text(interpreter?.structureId)
    ].join(" ");
    const evidence = `${guide} ${method}`;
    if (/실험|측정|가설|변인/.test(guide) && /실험|측정|연구/.test(method)) return "EXPERIMENT_EFFECT";
    if (/비교|차이|대조/.test(guide) && /비교|자료해석|풀이/.test(method)) return "COMPARE";
    if (/모델링|수학적\s*모델|함수|방정식|확률|통계/.test(guide) && /모델|문제설계|풀이|수학/.test(evidence)) return "MATHEMATICAL_MODEL";
    if (/설계|제작|구현|프로그램|알고리즘/.test(guide) && /설계|제작|연구/.test(method)) return "DESIGN_APPLICATION";
    if (/논술|토론|주장|비판|평가/.test(guide) && /논술|토론|발표|평가/.test(evidence)) return "ARGUMENT_EVALUATION";
    if (/자료|데이터|통계|그래프|표|관계/.test(guide) && /자료|데이터|해석|조사/.test(method)) return "DATA_RELATION";
    if (/사례|원인|과정|원리|메커니즘/.test(guide)) return "CASE_MECHANISM";
    return "GENERAL_ANALYSIS";
  }
  function hasJongseong(value) {
    const chars = [...text(value)];
    const code = chars.length ? chars[chars.length - 1].charCodeAt(0) : 0;
    return code >= 0xAC00 && code <= 0xD7A3 ? (code - 0xAC00) % 28 !== 0 : false;
  }
  function particle(value, pair) {
    const [withJong, withoutJong] = pair.split("/");
    return hasJongseong(value) ? withJong : withoutJong;
  }
  function buildCandidates(type, objectValue, concepts) {
    const concept = concepts.slice(0, 2).join("·");
    const object = trimObject(objectValue, concept ? 30 : 36);
    const objectWithTopic = `${object}${particle(object, "의/의")}`;
    const byConcept = concept ? `${concept}${particle(concept, "에 따른/에 따른")}` : "조건에 따른";
    const candidates = {
      EXPERIMENT_EFFECT: [
        { id: "EXP_EFFECT_A", title: `${object}: ${byConcept} 변화와 실험 결과 분석` },
        { id: "EXP_EFFECT_B", title: `${objectWithTopic} 조건별 변화와 측정 오차 검증` }
      ],
      COMPARE: [
        { id: "COMPARE_A", title: `${object}: ${concept ? `${concept} 관점의 ` : ""}차이와 판단 기준` },
        { id: "COMPARE_B", title: `${objectWithTopic} 조건별 특징 비교 분석` }
      ],
      DATA_RELATION: [
        { id: "DATA_REL_A", title: `${object}: ${concept ? `${concept}와 ` : ""}자료의 관계 분석` },
        { id: "DATA_REL_B", title: `${objectWithTopic} 자료 변화와 결과 해석` }
      ],
      CASE_MECHANISM: [
        { id: "CASE_MECH_A", title: `${object}: ${concept ? `${concept}로 본 ` : ""}원인과 작동 과정` },
        { id: "CASE_MECH_B", title: `${objectWithTopic} 사례에서 확인한 원리와 영향` }
      ],
      DESIGN_APPLICATION: [
        { id: "DESIGN_APP_A", title: `${object}: ${concept ? `${concept}를 활용한 ` : ""}설계 조건과 적용 가능성` },
        { id: "DESIGN_APP_B", title: `${objectWithTopic} 구현 과정과 개선 기준` }
      ],
      ARGUMENT_EVALUATION: [
        { id: "ARG_EVAL_A", title: `${object}: 핵심 쟁점과 판단 근거 평가` },
        { id: "ARG_EVAL_B", title: `${objectWithTopic} 주장과 근거의 타당성 분석` },
        { id: "ARG_EVAL_C", title: `${object}: 자료 근거와 해석의 신뢰도 검토` },
        { id: "ARG_EVAL_D", title: `${objectWithTopic} 판단 기준과 논증 구조 분석` }
      ],
      MATHEMATICAL_MODEL: [
        { id: "MATH_MODEL_A", title: `${object}: ${concept ? `${concept}를 활용한 ` : ""}수학적 관계 모델링` },
        { id: "MATH_MODEL_B", title: `${objectWithTopic} 조건과 결과의 수학적 해석` }
      ],
      GENERAL_ANALYSIS: [
        { id: "GENERAL_A", title: `${object}: ${concept ? `${concept}의 ` : ""}핵심 원리와 적용 조건` },
        { id: "GENERAL_B", title: `${objectWithTopic} 주요 특징과 결과 분석` }
      ]
    };
    return candidates[type] || candidates.GENERAL_ANALYSIS;
  }
  function qualityFlags(title, input, concepts) {
    const value = text(title);
    const flags = [];
    if (!value) flags.push("EMPTY");
    if ([...value].length > 70) flags.push("OVER_70");
    if ([...value].length < 18) flags.push("UNDER_18");
    if (PLACEHOLDERS.some(item => value.includes(item))) flags.push("PLACEHOLDER");
    if (CAREER_TERMS.test(value)) flags.push("CAREER_TERM");
    CAREER_TERMS.lastIndex = 0;
    if (/\b(?:major|seed)_[0-9A-Za-z가-힣_-]+\b/i.test(value)) flags.push("INTERNAL_ID");
    if ((value.match(/[:\-–—]/g) || []).length > 1) flags.push("TOO_MANY_SEPARATORS");
    if (/[.!?]$/.test(value)) flags.push("TERMINAL_PUNCTUATION");
    if (concepts.length > 3) flags.push("TOO_MANY_CONCEPTS");
    if (/(?:은는|는은|이가|가이|을를|를을|과와|와과|으로로|로로)/.test(value)) flags.push("PARTICLE_DUPLICATION");
    const subject = text(input.subject);
    if (subject && new RegExp(`${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:으?로)\\s*(?:설명|분석|해석)`).test(value)) {
      flags.push("SUBJECT_PSEUDO_CONCEPT");
    }
    const badPatterns = list(input?.seed?.topic?.badPatterns);
    if (badPatterns.some(pattern => pattern && value.includes(pattern))) flags.push("SEED_BAD_PATTERN");
    const tokenList = tokens(value);
    if (tokenList.some((token, index) => index > 0 && token === tokenList[index - 1])) flags.push("ADJACENT_REPEAT");
    return uniq(flags);
  }
  function shorten(title) {
    let value = text(title).replace(/[.!?]+$/g, "");
    if ([...value].length <= 70) return value;
    const [left, right] = value.split(":").map(text);
    if (right) {
      const maxLeft = Math.max(18, 68 - [...right].length);
      value = `${trimObject(left, maxLeft)}: ${right}`;
    }
    if ([...value].length > 70) value = [...value].slice(0, 70).join("").replace(/\s+\S*$/g, "");
    return text(value).replace(/[,:;\-–—\s]+$/g, "");
  }
  function safeGeneral(guide, subject) {
    const evidenceTokens = uniq(tokens(guide).filter(token => normalize(token) !== normalize(subject))).slice(0, 4);
    const object = trimObject(evidenceTokens.join(" "), 32) || "안내문 핵심 내용";
    return `${object}: 주요 특징과 적용 조건 분석`;
  }
  function legacyAllowed(title, input) {
    const value = text(title);
    const flags = qualityFlags(value, input, []);
    return !!value && [...value].length <= 70
      && !flags.some(flag => ["PLACEHOLDER", "SUBJECT_PSEUDO_CONCEPT", "ADJACENT_REPEAT", "CAREER_TERM", "INTERNAL_ID"].includes(flag));
  }

  function compose(input) {
    const safeInput = input && typeof input === "object" ? input : {};
    const guide = stripForbidden(safeInput.taskDescription);
    const interpreter = safeInput.task_interpreter || {};
    const objectValue = extractObject(guide);
    let concepts = conceptCandidates(safeInput, guide);
    if (!concepts.length) concepts = guideConceptFallback(guide, objectValue, safeInput.subject);
    concepts = uniq(concepts).slice(0, 3);
    const titleType = determineType(interpreter, guide);
    const candidates = objectValue ? buildCandidates(titleType, objectValue, concepts) : [];
    const stableVariant = [...guide].reduce((value, char) => ((value * 33) + char.charCodeAt(0)) >>> 0, 5381)
      % Math.max(candidates.length, 1);
    const evaluated = candidates.map((candidate, candidateIndex) => {
      const title = shorten(stripForbidden(candidate.title));
      const flags = qualityFlags(title, safeInput, concepts);
      const score = (flags.length ? -100 : 0)
        + ([...title].length >= 18 && [...title].length <= 60 ? 20 : 0)
        + (objectValue && title.includes(trimObject(objectValue, 18).slice(0, 8)) ? 8 : 0)
        + concepts.filter(concept => title.includes(concept)).length * 3
        + (candidateIndex === stableVariant ? 0.5 : 0)
        - TEMPLATE_ORDER.indexOf(candidate.id) / 100;
      return { ...candidate, title, flags, score };
    }).sort((a, b) => b.score - a.score || TEMPLATE_ORDER.indexOf(a.id) - TEMPLATE_ORDER.indexOf(b.id));

    let selected = evaluated.find(candidate => !candidate.flags.some(flag => flag !== "UNDER_18")) || null;
    let fallbackUsed = false;
    let fallbackReason = "";
    if (!selected && legacyAllowed(safeInput.legacyGeneratedTitle, safeInput)) {
      selected = {
        id: "LEGACY_QUALITY_CUT",
        title: shorten(stripForbidden(safeInput.legacyGeneratedTitle)),
        flags: []
      };
      fallbackUsed = true;
      fallbackReason = "LEGACY_QUALITY_CUT_PASS";
    }
    if (!selected) {
      const title = shorten(safeGeneral(guide, safeInput.subject));
      selected = { id: "GENERAL_SAFE", title, flags: qualityFlags(title, safeInput, []) };
      fallbackUsed = true;
      fallbackReason = "SAFE_GENERAL";
    }

    const directConcepts = concepts.filter(concept => includesEvidence(concept, guide));
    const confidence = interpreter?.fallbackActive === true
      ? "LOW" : (objectValue && directConcepts.length ? "HIGH" : (objectValue ? "MEDIUM" : "LOW"));
    const keyword = text(safeInput.keywordLabel);
    const focusEvidence = keyword && !PLACEHOLDERS.includes(keyword) && includesEvidence(keyword, guide) ? [keyword] : [];
    return {
      title: selected.title,
      templateId: selected.id,
      titleType,
      confidence,
      evidence: {
        object: objectValue ? [objectValue] : [],
        concept: directConcepts,
        method: uniq([
          ...list(interpreter.methodAxes),
          ...list(interpreter.reportModes),
          ...list(interpreter.outputAxes)
        ]).slice(0, 5),
        focus: focusEvidence,
        titleOptionsUsed: false
      },
      fallbackUsed,
      fallbackReason,
      validationFlags: qualityFlags(selected.title, safeInput, concepts)
    };
  }

  global.MiniTitleComposerV2 = Object.freeze({ version: VERSION, compose });
})(typeof window !== "undefined" ? window : globalThis);
