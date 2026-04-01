(function () {
  const TEXTBOOK_MASTER_URL = "seed/textbook_master.json";

  const SUBJECT_ALIAS_MAP = {
    "이공계": ["물리", "화학", "생명과학", "정보"],
    "공학": ["물리", "화학", "정보"],
    "에너지": ["물리", "화학"],
    "배터리": ["화학", "물리", "정보"],
    "전기": ["물리", "화학"],
    "전자": ["물리", "정보"],
    "컴퓨터": ["정보", "물리"],
    "소프트웨어": ["정보"],
    "ai": ["정보", "물리"],
    "인공지능": ["정보", "물리"],
    "보건": ["생명과학", "화학"],
    "의료": ["생명과학", "화학"],
    "간호": ["생명과학", "화학"],
    "생명": ["생명과학", "화학"],
    "환경": ["화학", "생명과학", "물리"],
    "기후": ["화학", "생명과학", "물리"],
    "인문사회": ["정보"],
    "데이터": ["정보", "물리"],
    "시뮬레이션": ["정보", "물리"]
  };

  const MAJOR_ALIAS_MAP = {
    "화학공학": ["화학공학", "신소재공학", "에너지공학"],
    "신소재공학": ["신소재공학", "화학공학", "배터리공학"],
    "배터리공학": ["배터리공학", "화학공학", "에너지공학"],
    "에너지공학": ["에너지공학", "화학공학", "전기공학"],
    "전자공학": ["전자공학", "전기공학", "기계공학"],
    "전기공학": ["전기공학", "전자공학", "에너지공학"],
    "기계공학": ["기계공학", "전자공학", "에너지공학"],
    "컴퓨터공학": ["컴퓨터공학", "소프트웨어학과", "인공지능학과", "산업공학"],
    "컴퓨터공학과": ["컴퓨터공학", "소프트웨어학과", "인공지능학과", "산업공학"],
    "소프트웨어": ["소프트웨어학과", "컴퓨터공학", "인공지능학과"],
    "인공지능": ["인공지능학과", "컴퓨터공학", "소프트웨어학과"],
    "간호": ["간호학", "보건계열", "의생명공학"],
    "간호학": ["간호학", "보건계열", "의생명공학"],
    "간호학과": ["간호학", "보건계열", "의생명공학"],
    "생명공학": ["생명공학", "의생명공학", "식품공학"],
    "의생명": ["의생명공학", "생명공학", "보건계열"]
  };

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/·/g, "")
      .replace(/[()\[\]{}.,/#!$%^&*;:=_`~?+\\|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactText(value) {
    return normalizeText(value).replace(/\s+/g, "");
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function splitTokens(value) {
    const normalized = normalizeText(value);
    if (!normalized) return [];
    return unique([
      normalized,
      ...normalized.split(/\s+/g).filter(v => v.length >= 2),
      compactText(normalized)
    ]);
  }

  function expandAliases(tokens, aliasMap) {
    const expanded = [...tokens];
    tokens.forEach(token => {
      Object.entries(aliasMap).forEach(([key, values]) => {
        if (token.includes(compactText(key)) || compactText(key).includes(token) || normalizeText(key) === token) {
          values.forEach(v => expanded.push(...splitTokens(v)));
        }
      });
    });
    return unique(expanded);
  }

  function includesLoose(target, token) {
    if (!target || !token) return false;
    const a = compactText(target);
    const b = compactText(token);
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a);
  }

  let textbookMasterCache = null;

  async function loadTextbookMaster() {
    if (textbookMasterCache) return textbookMasterCache;

    const response = await fetch(TEXTBOOK_MASTER_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("textbook_master.json을 불러오지 못했습니다.");
    }

    textbookMasterCache = await response.json();
    return textbookMasterCache;
  }

  function flattenTextbookMaster(data) {
    const subjects = Array.isArray(data?.subjects) ? data.subjects : [];
    const flat = [];

    subjects.forEach(subjectItem => {
      const subjectName = subjectItem.subject || "";
      const units = Array.isArray(subjectItem.units) ? subjectItem.units : [];

      units.forEach(unitItem => {
        const unitName = unitItem.unit || "";
        const subunits = Array.isArray(unitItem.subunits) ? unitItem.subunits : [];

        subunits.forEach(subunitItem => {
          flat.push({
            subject: subjectName,
            unit: unitName,
            subunit: subunitItem.name || "",
            core_concepts: toArray(subunitItem.core_concepts),
            interpretation_points: toArray(subunitItem.interpretation_points),
            topic_seeds: toArray(subunitItem.topic_seeds),
            major_links: toArray(subunitItem.major_links),
            record_seeds: toArray(subunitItem.record_seeds)
          });
        });
      });
    });

    return flat;
  }

  function buildContext({ keywords = [], category = "", major = "" } = {}) {
    const rawTokens = unique([
      ...keywords.flatMap(splitTokens),
      ...splitTokens(category),
      ...splitTokens(major)
    ]);

    const expandedMajorTokens = expandAliases(rawTokens, MAJOR_ALIAS_MAP);
    const expandedTokens = expandAliases(expandedMajorTokens, SUBJECT_ALIAS_MAP);

    const subjectHints = unique(
      Object.entries(SUBJECT_ALIAS_MAP)
        .filter(([key]) => expandedTokens.some(token => includesLoose(key, token)))
        .flatMap(([, values]) => values)
    );

    const majorHints = unique(
      Object.entries(MAJOR_ALIAS_MAP)
        .filter(([key]) => expandedTokens.some(token => includesLoose(key, token)))
        .flatMap(([, values]) => values)
    );

    return {
      rawTokens,
      tokens: expandedTokens,
      subjectHints,
      majorHints,
      keywords,
      category,
      major
    };
  }

  function scoreList(values, tokens, weight) {
    let score = 0;
    const normalizedValues = toArray(values).filter(Boolean);

    normalizedValues.forEach(value => {
      tokens.forEach(token => {
        if (includesLoose(value, token)) score += weight;
      });
    });

    return score;
  }

  function scoreMatch(item, context) {
    let score = 0;

    score += scoreList(item.core_concepts, context.tokens, 8);
    score += scoreList(item.topic_seeds, context.tokens, 9);
    score += scoreList(item.interpretation_points, context.tokens, 5);
    score += scoreList(item.record_seeds, context.tokens, 4);
    score += scoreList(item.major_links, context.tokens, 10);

    if (context.tokens.some(token => includesLoose(item.subject, token))) score += 12;
    if (context.tokens.some(token => includesLoose(item.unit, token))) score += 8;
    if (context.tokens.some(token => includesLoose(item.subunit, token))) score += 8;

    if (context.subjectHints.some(subject => includesLoose(item.subject, subject))) score += 14;
    if (context.majorHints.some(major => toArray(item.major_links).some(link => includesLoose(link, major)))) score += 14;

    if (score === 0) {
      const subject = compactText(item.subject);
      if (context.category && context.subjectHints.some(subjectHint => includesLoose(subject, subjectHint))) score += 4;
      if (context.major && context.majorHints.some(majorHint => toArray(item.major_links).some(link => includesLoose(link, majorHint)))) score += 4;
    }

    return score;
  }

  function fallbackMatches(flat, context) {
    const hinted = flat.filter(item =>
      context.subjectHints.some(subject => includesLoose(item.subject, subject)) ||
      context.majorHints.some(major => toArray(item.major_links).some(link => includesLoose(link, major)))
    );

    if (hinted.length) return hinted.slice(0, 5);

    const subjectPriority = ["화학", "물리", "생명과학", "정보"];
    const ordered = [...flat].sort((a, b) => {
      return subjectPriority.indexOf(a.subject) - subjectPriority.indexOf(b.subject);
    });

    return ordered.slice(0, 5);
  }

  async function matchTextbook({ keywords = [], category = "", major = "" } = {}) {
    const master = await loadTextbookMaster();
    const flat = flattenTextbookMaster(master);
    const context = buildContext({ keywords, category, major });

    const scored = flat
      .map(item => ({ ...item, _score: scoreMatch(item, context) }))
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return String(a.subject).localeCompare(String(b.subject), "ko");
      });

    const positiveMatches = scored.filter(item => item._score > 0).slice(0, 5);
    const matches = positiveMatches.length ? positiveMatches : fallbackMatches(flat, context);

    return {
      matches,
      debug: {
        tokens: context.tokens,
        subjectHints: context.subjectHints,
        majorHints: context.majorHints,
        topScores: scored.slice(0, 5).map(item => ({
          subject: item.subject,
          unit: item.unit,
          subunit: item.subunit,
          score: item._score
        }))
      }
    };
  }

  function buildTextbookSummary(matches = []) {
    const subjects = [...new Set(matches.map(x => x.subject).filter(Boolean))];
    const units = matches.map(x => [x.subject, x.unit].filter(Boolean).join(" > "));
    return {
      matchedSubjects: subjects,
      matchedUnits: units,
      count: matches.length
    };
  }

  window.matchTextbook = matchTextbook;
  window.textbookMatcher = {
    normalizeText,
    flattenTextbookMaster,
    matchTextbook,
    buildTextbookSummary,
    buildContext,
    scoreMatch
  };
})();
