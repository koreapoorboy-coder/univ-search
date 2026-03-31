// student_textbook_matcher.js
// textbook_master.json 기반 교과서/단원 매칭 유틸
// 사용 위치 예시: public/keyword-engine/assets/ 또는 build/ 유틸

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·•,./()\[\]{}:;'"!?~`-]/g, "");
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildKeywordCandidates({
  keyword = "",
  track = "",
  major = "",
  subjects = [],
  extraKeywords = []
} = {}) {
  return [
    keyword,
    track,
    major,
    ...toArray(subjects),
    ...toArray(extraKeywords)
  ]
    .map(v => String(v || "").trim())
    .filter(Boolean);
}

function scoreSubunit(subunit, candidateNorms, majorNorm, trackNorm) {
  let score = 0;

  const haystacks = [
    ...toArray(subunit.name),
    ...toArray(subunit.core_concepts),
    ...toArray(subunit.interpretation_points),
    ...toArray(subunit.topic_seeds),
    ...toArray(subunit.major_links),
    ...toArray(subunit.record_seeds)
  ].map(normalizeText);

  for (const cand of candidateNorms) {
    for (const h of haystacks) {
      if (!cand || !h) continue;
      if (h.includes(cand) || cand.includes(h)) {
        score += 5;
      }
    }
  }

  const majors = toArray(subunit.major_links).map(normalizeText);
  if (majorNorm && majors.some(m => majorNorm.includes(m) || m.includes(majorNorm))) {
    score += 6;
  }

  const scienceTrack = ["이공계", "공학", "자연", "과학", "ai", "소프트웨어"]
    .map(normalizeText);
  const medicalTrack = ["보건", "의료", "간호", "의학", "생명"]
    .map(normalizeText);
  const humanitiesTrack = ["인문", "언어", "사회", "경제", "경영"]
    .map(normalizeText);

  const subunitText = haystacks.join(" ");
  if (trackNorm) {
    if (scienceTrack.some(t => trackNorm.includes(t)) && /물리|화학|수학|공학|전지|반응|전자|파동|행렬|함수|기하|에너지/.test(subunitText)) {
      score += 2;
    }
    if (medicalTrack.some(t => trackNorm.includes(t)) && /생명|유전|면역|건강|간호|의학|세포|항상성/.test(subunitText)) {
      score += 2;
    }
    if (humanitiesTrack.some(t => trackNorm.includes(t)) && /문학|소설|인권|정치|경제|국제|사회|언어/.test(subunitText)) {
      score += 2;
    }
  }

  return score;
}

function flattenTextbookMaster(textbookMaster) {
  const out = [];
  for (const subjectEntry of toArray(textbookMaster?.subjects)) {
    const subject = subjectEntry.subject || "";
    const source = subjectEntry.source || {};
    const overview = subjectEntry.overview || null;

    for (const unitEntry of toArray(subjectEntry.units)) {
      const unit = unitEntry.unit || "";
      for (const subunit of toArray(unitEntry.subunits)) {
        out.push({
          subject,
          unit,
          subunitName: subunit.name || "",
          source,
          overview,
          coreConcepts: toArray(subunit.core_concepts),
          interpretationPoints: toArray(subunit.interpretation_points),
          topicSeeds: toArray(subunit.topic_seeds),
          majorLinks: toArray(subunit.major_links),
          recordSeeds: toArray(subunit.record_seeds)
        });
      }
    }
  }
  return out;
}

function matchTextbooks(textbookMaster, options = {}) {
  const {
    keyword = "",
    track = "",
    major = "",
    subjects = [],
    extraKeywords = [],
    topK = 5,
    minScore = 3
  } = options;

  const flat = flattenTextbookMaster(textbookMaster);
  const candidates = buildKeywordCandidates({ keyword, track, major, subjects, extraKeywords });
  const candidateNorms = candidates.map(normalizeText).filter(Boolean);
  const majorNorm = normalizeText(major);
  const trackNorm = normalizeText(track);

  const scored = flat
    .map(item => {
      const score = scoreSubunit({
        name: item.subunitName,
        core_concepts: item.coreConcepts,
        interpretation_points: item.interpretationPoints,
        topic_seeds: item.topicSeeds,
        major_links: item.majorLinks,
        record_seeds: item.recordSeeds
      }, candidateNorms, majorNorm, trackNorm);
      return { ...item, score };
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return uniqueBy(scored, item => `${item.subject}__${item.unit}__${item.subunitName}`).slice(0, topK);
}

function buildTextbookUiFeed(matches = []) {
  return matches.map(item => ({
    subject: item.subject,
    unit: item.unit,
    subunit: item.subunitName,
    publisher: item.source?.publisher || "",
    filename: item.source?.filename || "",
    coreConcepts: item.coreConcepts.slice(0, 5),
    interpretationPoints: item.interpretationPoints.slice(0, 2),
    recommendedTopics: item.topicSeeds.slice(0, 2),
    majorLinks: item.majorLinks.slice(0, 4),
    recordHint: item.recordSeeds[0] || "",
    score: item.score
  }));
}

function buildTextbookSummary(matches = []) {
  const subjects = uniqueBy(matches.map(m => ({ subject: m.subject })), x => x.subject).map(x => x.subject);
  const units = matches.slice(0, 3).map(m => `${m.subject} - ${m.unit}`);
  return {
    matchedSubjects: subjects,
    matchedUnits: units,
    count: matches.length
  };
}

// 브라우저/노드 공용 내보내기
const textbookMatcher = {
  normalizeText,
  flattenTextbookMaster,
  matchTextbooks,
  buildTextbookUiFeed,
  buildTextbookSummary
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = textbookMatcher;
}

if (typeof window !== "undefined") {
  window.textbookMatcher = textbookMatcher;
}
