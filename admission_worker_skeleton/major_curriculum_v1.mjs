// 대학 전공 과목 ↔ 고교 개념.
//
// The thing this exists to stop: "전기전자 지망이니까 저항 실험". That connects a department's *name* to whatever
// the name brings to mind. What a student should be able to see instead is the real line — 고교 물리학의 전류·전압·
// 저항 → 대학 2학년 전자기학 — and that line only counts if it comes from two real sources: a university's own
// published curriculum, and our own 162-concept map of what each 고교 개념 is made of.
//
// Two columns, kept apart on purpose:
//   · 대학 과목명과 학년 — published by the university, carries a source URL, quotable.
//   · 고교 연계 — matched here on shared words. It is our reading, not a cited fact, and is labelled as such.
// Nothing is invented for a course that matches nothing. An empty link is the honest answer and stays empty.

const clean = (value) => String(value ?? '').trim();

// Words every course title carries. Left in, they match everything and mean nothing.
const EMPTY = /(원론|원리|개론|입문|기초|이해|이론|실무|실습|응용|활용|연습|세미나|특강|관리|시스템|분석|설계|개발|연구|탐구|프로젝트|캡스톤디자인|졸업논문|인턴십|현장실습|[0-9IVX]+)$/;

// A course title is one run-on noun: 빅데이터분석과응용, 전자기학, 경영정보시스템. Cutting it into every substring
// invents words that are not there — 면역학 yields 역학, 유기화학 yields 기화 — so only the front and the back of
// each word are taken. Korean compounds are head-final: 면역-학, 유기-화학 carry their meaning at the front, while
// 경영-통계 carries it at the back, and both ends are needed.
// 유전학 minus its 학 is 유전, a whole word; 발달심리학 minus its 학 is 발달심리, and 발달 is only its front half.
// Two characters standing on their own mean something; two characters cut out of a longer word usually do not.
const ACADEMIC = /(학개론|개론|원론|공학|학|론)$/;

function fragments(title) {
  const text = clean(title).replace(/[()[\]{}<>·,./]|와 |과 |및 /g, ' ');
  const out = new Map();
  const add = (piece, prefix, whole) => {
    if (piece.length < 2 || EMPTY.test(piece)) return;
    const had = out.get(piece);
    out.set(piece, { prefix: prefix || had?.prefix || false, whole: whole || had?.whole || false });
  };
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const base = raw.replace(ACADEMIC, '');
    for (const word of base.length >= 2 && base !== raw ? [raw, base] : [raw]) {
      add(word, true, true);
      for (let size = Math.min(word.length, 10) - 1; size >= 2; size--) {
        add(word.slice(0, size), true, false);
        add(word.slice(word.length - size), false, false);
      }
    }
  }
  return [...out.entries()].map(([piece, flag]) => ({ piece, ...flag }));
}

// Which 고교 개념 this course sits on top of. Returns [] when nothing real matches.
export function matchConceptsForCourse(title, index, limit = 3) {
  if (!index?.terms || !index?.concepts) return [];
  const pieces = fragments(title);
  if (!pieces.length) return [];
  const scores = new Map();
  const hits = new Map();
  const fromFront = new Set();
  const solid = new Set();
  let anyFront = false;
  for (const { piece, prefix, whole } of pieces) {
    const byTerm = index.terms[piece] || [];
    const bySubject = index.subjectTerms?.[piece] || [];
    if (!byTerm.length && !bySubject.length) continue;
    for (const [id, weight] of [...byTerm, ...bySubject]) {
      // A longer shared word is stronger evidence than a two-letter coincidence.
      scores.set(id, (scores.get(id) || 0) + weight * piece.length);
      const seen = hits.get(id) || new Set();
      seen.add(piece);
      hits.set(id, seen);
      if (prefix) { fromFront.add(id); anyFront = true; }
    }
    // Evidence worth keeping on its own: a whole word, a word of three characters or more, or the name of the
    // subject itself. Everything else has to be corroborated by a second match.
    if (whole || piece.length >= 3 || bySubject.length) {
      for (const [id] of [...byTerm, ...bySubject]) solid.add(id);
    }
  }
  const ranked = [...scores.entries()]
    // 면역학 matches 면역 at the front and 역학 at the back, and only the front one is about this course. Where the
    // front of the word matched anything, what only the back matched was a coincidence.
    .filter(([id]) => !anyFront || fromFront.has(id))
    .filter(([id]) => solid.has(id) || (hits.get(id)?.size || 0) >= 2)
    .map(([id, score]) => ({ ...index.concepts[id], id, score: Math.round(score * 10) / 10, matched: [...(hits.get(id) || [])].sort((a, b) => b.length - a.length).slice(0, 4) }))
    .filter((item) => item.concept)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return [];
  // Whatever is far behind the best match was a coincidence, not a link.
  const best = ranked[0].score;
  return ranked.filter((item) => item.score >= best * 0.45).slice(0, limit);
}

// A whole curriculum, course by course. The university's half is copied through untouched; ours is added beside it.
export function linkCurriculum(curriculum, index, limit = 2) {
  const years = (curriculum?.years || []).map((year) => ({
    year: Number(year?.year) || null,
    courses: (year?.courses || []).map((course) => {
      const title = clean(typeof course === 'string' ? course : course?.title);
      const linked = matchConceptsForCourse(title, index, limit);
      return {
        title,
        // 고교 연계 — our reading, from shared words, never a cited fact.
        highSchool: linked.map((item) => ({ subject: item.subject, concept: item.concept, matched: item.matched, score: item.score })),
        judged: true,
      };
    }).filter((course) => course.title),
  })).filter((year) => year.courses.length);

  const courses = years.flatMap((year) => year.courses);
  return {
    major: clean(curriculum?.major),
    group: clean(curriculum?.group),
    sources: (curriculum?.sources || []).map((s) => clean(s)).filter(Boolean),
    years,
    linkedCount: courses.filter((course) => course.highSchool.length).length,
    courseCount: courses.length,
  };
}

// Which 고교 과목 this major leans on, counted across everything its curriculum matched. This is what tells a
// student "전자공학은 물리를 이만큼 쓴다" without anyone guessing.
export function subjectsBehindMajor(linked) {
  const counts = new Map();
  for (const year of linked?.years || []) {
    for (const course of year.courses) {
      for (const hit of course.highSchool) counts.set(hit.subject, (counts.get(hit.subject) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([subject, count]) => ({ subject, count }));
}

// What the report is told, when the student named a major we hold a curriculum for.
export function curriculumPromptLines(linked, concept = '') {
  if (!linked?.years?.length) return [];
  const here = clean(concept);
  const touching = [];
  for (const year of linked.years) {
    for (const course of year.courses) {
      for (const hit of course.highSchool) {
        if (here && !hit.concept.includes(here) && !here.includes(hit.concept)) continue;
        touching.push(`${year.year ? `${year.year}학년 ` : ''}${course.title} (${hit.subject}의 "${hit.concept}" 위에 선다)`);
      }
    }
  }
  const lead = touching.length ? touching : linked.years.flatMap((year) => year.courses.filter((c) => c.highSchool.length).slice(0, 2)
    .map((c) => `${year.year ? `${year.year}학년 ` : ''}${c.title} (${c.highSchool[0].subject}의 "${c.highSchool[0].concept}" 위에 선다)`));
  if (!lead.length) return [];
  return [
    '',
    `[${linked.major}에서 실제로 배우는 것 — 그 대학 교육과정에서 가져온 것]`,
    ...lead.slice(0, 5).map((line) => `- ${line}`),
    '- 이 목록은 학과 이름에서 연상한 것이 아니라 대학이 공개한 교육과정이다. 전공 연계는 여기에 닿을 때만 쓴다.',
    '- 학과 이름을 본문에 반복하지 않는다. 대신 위 과목이 다루는 문제를 고등학생이 할 수 있는 크기로 좁혀 탐구한다.',
    '- 위 어느 것과도 닿지 않으면 전공 이야기를 꺼내지 않고 교과 개념을 더 깊게 파는 쪽으로 쓴다.',
  ];
}
