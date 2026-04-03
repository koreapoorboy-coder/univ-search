(function () {
  const TEXTBOOK_MASTER_URL = "seed/textbook_master.json";
  const MIN_MATCH_SCORE = 10;

  function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  function tokenize(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return [];

    return [...new Set(
      raw
        .split(/[\/,|·ㆍ>]+|\s+/)
        .map(v => normalizeText(v))
        .filter(v => v && v.length >= 2)
    )];
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

  function scoreField(values, token, exactWeight, partialWeight) {
    const normalized = toArray(values).map(normalizeText).filter(Boolean);
    let score = 0;

    normalized.forEach(value => {
      if (!value || !token) return;
      if (value === token) score += exactWeight;
      else if (value.includes(token) || token.includes(value)) score += partialWeight;
    });

    return score;
  }

  function scoreMatch(item, context) {
    let score = 0;
    const tokenPool = [
      ...(context.keywords || []).flatMap(tokenize),
      ...tokenize(context.category || ""),
      ...tokenize(context.major || "")
    ];
    const haystack = [...new Set(tokenPool)].filter(Boolean);

    haystack.forEach(token => {
      score += scoreField(item.core_concepts, token, 14, 9);
      score += scoreField(item.topic_seeds, token, 12, 7);
      score += scoreField(item.interpretation_points, token, 7, 4);
      score += scoreField(item.major_links, token, 10, 6);
      score += scoreField([item.subject], token, 8, 4);
      score += scoreField([item.unit], token, 6, 3);
      score += scoreField([item.subunit], token, 6, 3);
      score += scoreField(item.record_seeds, token, 5, 2);
    });

    const major = normalizeText(context.major || "");
    if (major && toArray(item.major_links).map(normalizeText).some(v => v === major)) {
      score += 16;
    }

    return score;
  }

  async function matchTextbook({ keywords = [], category = "", major = "" } = {}) {
    const master = await loadTextbookMaster();
    const flat = flattenTextbookMaster(master);

    const scored = flat
      .map(item => ({
        ...item,
        _score: scoreMatch(item, { keywords, category, major })
      }))
      .sort((a, b) => b._score - a._score);

    const matches = scored.filter(item => item._score >= MIN_MATCH_SCORE).slice(0, 5);

    if (!matches.length) {
      return {
        matches: scored.slice(0, 3)
      };
    }

    return { matches, bestScore, minScore };
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
    tokenize
  };
})();
