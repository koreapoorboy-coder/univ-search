
export function matchContentCore(input, bridges) {
  const keyword = normalize(input.keyword);
  const major = normalize(input.career || input.major || "");
  const subject = normalize(input.subject || "");

  const conceptItem = (bridges.concept_bridge?.items || []).find(item => {
    const keys = [item.keyword, ...(item.aliases || [])].map(normalize);
    return keys.some(k => keyword.includes(k) || k.includes(keyword));
  }) || null;

  const subjectData = bridges.subject_unit_map?.subjects?.[input.subject] || null;

  const bookMatches = (bridges.book_bridge?.books || []).filter(book => {
    const tags = (book.tags || []).map(normalize);
    return tags.some(t => keyword.includes(t) || t.includes(keyword) || major.includes(t) || subject.includes(t));
  }).slice(0, 3);

  const caseMatches = (bridges.case_bridge?.cases || []).filter(c => {
    const tags = (c.tags || []).map(normalize);
    return tags.some(t => keyword.includes(t) || t.includes(keyword));
  }).slice(0, 2);

  return { conceptItem, subjectData, bookMatches, caseMatches };
}

export function buildContentOutput(input, matches) {
  const concept = matches.conceptItem || {};
  const units = matches.subjectData?.units || [];
  const firstCase = matches.caseMatches?.[0];

  const title = `[탐구주제] ${input.keyword} 관련 교과 연결`;
  const intro = firstCase
    ? `${firstCase.summary} 고등학생 수준에서는 ${input.subject} 교과 개념과 연결해 탐구 주제로 확장할 수 있다.`
    : `${input.keyword}는 ${input.subject} 개념과 실제 사례를 연결하기 좋은 탐구 주제다.`;

  const subject_connection = units.slice(0, 2).map((unit, idx) => ({
    section_title: `${idx + 1}. ${input.subject} : ${unit.unit_name}`,
    concepts: unit.concept_tags.slice(0, 4),
    points: unit.usable_points.slice(0, 2)
  }));

  const research_points = (concept.research_angles || []).slice(0, 4);
  const deepening = [
    "실제 사례 데이터와 교과 개념을 함께 연결해 해석하기",
    "비교 기준을 먼저 세운 뒤 차이를 설명하기",
    "고1 수준에서는 과도한 대학 이론보다 개념-사례 연결에 집중하기"
  ];

  const recommended_books = (matches.bookMatches || []).map(book => ({
    title: book.title,
    author: book.author,
    use_for: book.use_for?.[0] || ""
  }));

  return { title, intro, subject_connection, research_points, deepening, recommended_books };
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}
