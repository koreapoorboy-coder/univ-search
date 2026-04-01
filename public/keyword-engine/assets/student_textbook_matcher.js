(function () {
  const TEXTBOOK_MASTER_URL = "seed/textbook_master.json";

  function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
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
        const subunits = Array.isArray(unitItem.subunits) ? subjectItem.subunits : [];

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

  function scoreMatch(item, context) {
    let score = 0;

    const haystack = [
      ...(context.keywords || []),
      context.category || "",
      context.major || ""
    ].map(normalizeText).filter(Boolean);

    const concepts = toArray(item.core_concepts).map(normalizeText);
    const points = toArray(item.interpretation_points).map(normalizeText);
    const topics = toArray(item.topic_seeds).map(normalizeText);
    const majors = toArray(item.major_links).map(normalizeText);
    const subject = normalizeText(item.subject);
    const unit = normalizeText(item.unit);
    const subunit = normalizeText(item.subunit);

    haystack.forEach(token => {
      if (!token) return;
      if (concepts.some(v => v.includes(token) || token.includes(v))) score += 10;
      if (topics.some(v => v.includes(token) || token.includes(v))) score += 8;
      if (points.some(v => v.includes(token) || token.includes(v))) score += 5;
      if (majors.some(v => v.includes(token) || token.includes(v))) score += 7;
      if (subject.includes(token) || token.includes(subject)) score += 4;
      if (unit.includes(token) || token.includes(unit)) score += 3;
      if (subunit.includes(token) || token.includes(subunit)) score += 3;
    });

    const major = normalizeText(context.major || "");
    if (major && majors.some(v => v.includes(major) || major.includes(v))) score += 12;

    return score;
  }

  async function matchTextbook({ keywords = [], category = "", major = "" } = {}) {
    const master = await loadTextbookMaster();
    const flat = flattenTextbookMaster(master);

    const matches = flat
      .map(item => ({
        ...item,
        _score: scoreMatch(item, { keywords, category, major })
      }))
      .filter(item => item._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    return { matches };
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
    buildTextbookSummary
  };
})();
