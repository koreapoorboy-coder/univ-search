// 학과 적합도 — 점수가 아니라 증거로.
//
// The tempting version of this feature prints "컴퓨터학과 적합도 87%". That number is unfalsifiable, and it is the
// same 억지 매칭 the engine already refuses to do when it writes a topic: a student who measured spring constants
// does not become an 기계공학과 candidate because a formula says so.
//
// So this returns the only thing that survives a third party reading it: which university courses in that
// department the student's own reports have actually touched, through which 고교 과목, in which report. Every line
// is checkable against the portfolio and against the department's own curriculum page.
//
// What it deliberately does not do:
//   · rank a department the student has no evidence for
//   · turn 3 touched courses out of 26 into a percentage of "fit"
//   · tell a 고1 with one report that their future is decided

const clean = (value, max = 80) => String(value ?? '').trim().slice(0, max);

// 공통국어1 → 공통국어, 확률과 통계 → 확률과통계. A student writes 물리, the curriculum says 물리학.
const normalise = (name) => clean(name, 40).replace(/\s+/g, '').replace(/\d+$/, '');

function subjectMatches(mine, theirs) {
  const a = normalise(mine);
  const b = normalise(theirs);
  if (!a || !b || a.length < 2 || b.length < 2) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

// 개념은 문장이 아니라 말이다. Two concepts touch when one contains the other as a word, not when they share a syllable.
function conceptMatches(mine, theirs) {
  const a = normalise(mine);
  const b = normalise(theirs);
  if (!a || !b || a.length < 3 || b.length < 3) return false;
  return a.includes(b) || b.includes(a);
}

// What the student has actually done, flattened once so each department is a cheap pass over it.
function evidenceFrom(reports) {
  return (reports || []).map((report) => ({
    title: clean(report.title, 200),
    grade: clean(report.grade, 10),
    subjects: [report.subject, ...(report.crossSubject || [])].map((value) => clean(value)).filter(Boolean),
    concepts: [report.concept, report.keyword, report.axis?.title].map((value) => clean(value)).filter(Boolean),
  }));
}

// One department, read against one student.
export function fitForMajor(name, entry, evidence) {
  const courses = [];
  for (const year of entry?.years || []) {
    for (const course of year?.courses || []) {
      const via = [];
      for (const link of course?.highSchool || []) {
        const hits = evidence.filter((item) =>
          item.subjects.some((subject) => subjectMatches(subject, link.subject))
          || item.concepts.some((concept) => conceptMatches(concept, link.concept)));
        if (hits.length) {
          via.push({
            subject: clean(link.subject, 40),
            concept: clean(link.concept, 60),
            reports: hits.map((hit) => ({ grade: hit.grade, title: hit.title })),
          });
        }
      }
      courses.push({
        year: year.year, title: clean(course.title, 60),
        needs: (course?.highSchool || []).map((link) => clean(link.subject, 40)),
        via,
      });
    }
  }
  const touched = courses.filter((course) => course.via.length);
  // 닿지 않은 과목은 실패가 아니라 다음에 할 수 있는 것이다.
  const open = courses.filter((course) => !course.via.length && course.needs.length);
  const subjects = [...new Set(touched.flatMap((course) => course.via.map((link) => link.subject)))];
  const backing = [...new Set(touched.flatMap((course) => course.via.flatMap((link) => link.reports.map((r) => r.title))))];
  return {
    major: name,
    group: clean(entry?.group, 20),
    touched,
    open: open.slice(0, 6),
    subjects,
    reportCount: backing.length,
    touchedCount: touched.length,
    linkedCount: entry?.linkedCount || courses.filter((course) => course.needs.length).length,
    courseCount: entry?.courseCount || courses.length,
  };
}

// 3년치를 33개 학과에 대본다. Only departments with real evidence come back, most-touched first.
export function majorFit(reports, index, options = {}) {
  const evidence = evidenceFrom(reports);
  const majors = index?.majors || {};
  const chosen = clean(options.major, 40);
  const ranked = [];
  for (const [name, entry] of Object.entries(majors)) {
    const fit = fitForMajor(name, entry, evidence);
    if (fit.touchedCount) ranked.push(fit);
  }
  ranked.sort((a, b) =>
    b.touchedCount - a.touchedCount
    || b.reportCount - a.reportCount
    || b.subjects.length - a.subjects.length
    || a.major.localeCompare(b.major, 'ko'));

  // 학생이 고른 학과는 순위와 상관없이 따로 보여 준다. 증거가 적으면 적다고 말한다.
  let picked = null;
  if (chosen) {
    const key = Object.keys(majors).find((name) => normalise(name) === normalise(chosen) || normalise(name).startsWith(normalise(chosen)));
    picked = key ? fitForMajor(key, majors[key], evidence) : { major: chosen, group: '', touched: [], open: [], subjects: [], reportCount: 0, touchedCount: 0, linkedCount: 0, courseCount: 0, unknown: true };
  }

  return { picked, ranked: ranked.slice(0, options.limit || 6), checked: Object.keys(majors).length, note: fitNote(evidence.length, ranked, picked) };
}

// 학생이 읽을 한 줄. 과장하지 않는다.
export function fitNote(reportCount, ranked, picked) {
  if (!reportCount) return '아직 보고서가 없어요. 한 편을 쓰면 그때부터 어떤 학과의 대학 과목과 닿는지 보여 줄 수 있어요.';
  if (!ranked.length) return '지금 보고서로는 아래 33개 학과의 대학 과목과 겹치는 데가 아직 없어요. 이건 잘못된 게 아니라, 앞으로 무엇을 더 해도 되는지가 열려 있다는 뜻이에요.';
  if (picked && !picked.touchedCount) {
    return `${picked.major}의 대학 과목과 아직 닿은 보고서는 없어요. 대신 지금 닿아 있는 곳은 ${ranked[0].major}예요. 학과를 바꾸라는 말이 아니라, ${picked.major}로 가려면 어떤 과목을 더 건드리면 되는지 아래에 적어 뒀어요.`;
  }
  if (reportCount < 3) return `보고서 ${reportCount}편으로 읽은 결과예요. 편수가 적어서 아직 방향이라고 부르긴 이르고, 지금 닿아 있는 자리만 보여 줍니다.`;
  return `보고서 ${reportCount}편이 ${ranked[0].major}의 대학 과목 ${ranked[0].touchedCount}개와 닿아 있어요. 아래는 어떤 보고서가 어떤 과목과 닿았는지 그대로 적은 것이고, 점수가 아니라 근거예요.`;
}
