// 다음에 해 볼 것.
//
// 처음에는 '읽을거리'를 주려고 했다. 사용자가 짚은 대로 그건 앞뒤가 안 맞는다 — 우리 제품은 **완성된 보고서를
// 주는 것**이고, 학생이 하는 일은 자기 데이터를 넣고 다듬는 것이지 책을 읽는 게 아니다. 마감이 내일인 학생에게
// 책 세 권을 권하면 화면만 복잡해진다.
//
// 그래서 주는 것을 바꿨다. **읽을거리가 아니라 할 일이다.**
//
// 보고서에는 이미 '후속 탐구'가 있고, 그건 "이 실험을 어떻게 더 정확히 다시 할까"를 답한다(컵 크기를 바꿔서,
// 난수 발생기로 모의해서…). 여기서 주는 것은 다른 질문의 답이다: **"이 주제로 무엇을 더 만들까."**
// 그 답은 이미 우리 축 데이터에 있다 — 축마다 output(만들 것)과 next(이어지는 과목)가 달려 있다.
//
// 자료는 그 일을 하는 **수단**으로만 붙는다. 자료가 앞에 서면 다시 읽을거리가 된다.

const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

// 축의 output은 "수온·염분 비교표, 연직 분포 해석, 해양 환경 기초 보고서"처럼 쉼표로 이어져 있다.
// 가운뎃점은 한 낱말 안에서도 쓰이므로(수온·염분) 쉼표로만 끊는다.
export function activitiesFrom(output) {
  return clean(output, 300)
    .split(/[,،]/)
    .map((one) => clean(one, 60))
    .filter((one) => one.length >= 3)
    .slice(0, 3);
}

// 이 보고서와 **같은 과목**의 축을 고른다.
//
// careerAxes는 이 탐구가 앞으로 어디로 가는지를 가리키므로 첫 번째가 다른 과목일 수 있다 — 실제로 지구과학
// 반감기 보고서에 국어의 '비판 해석 확장 축'이 붙어서 "매체 해석 메모"를 하라고 나왔다. 교과서 인용에서 겪은
// 것과 같은 일이다. 같은 과목의 축이 없으면 블록을 안 만든다.
export function pickAxis(axes, axisIndex, subject) {
  const want = clean(subject, 40).replace(/\s+/g, '').replace(/\d+$/, '');
  if (!want) return null;
  for (const axis of Array.isArray(axes) ? axes : [axes].filter(Boolean)) {
    const full = axis?.axisId ? (axisIndex?.axes || {})[axis.axisId] : null;
    const theirs = clean(full?.subject, 40).replace(/\s+/g, '').replace(/\d+$/, '');
    if (theirs && theirs === want) return axis;
  }
  return null;
}

// **이 개념의 축**을 찾는다.
//
// careerAxes 는 이 탐구가 앞으로 갈 곳이라, 같은 과목이어도 다른 단원의 축이 잡힌다 — 커피 추출
// 보고서에 '화학량론 해석 축'이 잡혀 "몰비 계산, 반응식 계수 해석"을 하라고 나왔다. 보고서가 실제로
// 선 개념의 축이 있으면 그것을 먼저 쓴다.
export function axisForConcept(axisIndex, subject, concept) {
  const tight = (value, max) => clean(value, max).replace(/\s+/g, '');
  const wantSubject = tight(subject, 40).replace(/\d+$/, '');
  const wantConcept = tight(concept, 80);
  if (!wantSubject || !wantConcept) return null;
  for (const [axisId, axis] of Object.entries(axisIndex?.axes || {})) {
    if (tight(axis?.subject, 40).replace(/\d+$/, '') !== wantSubject) continue;
    if (tight(axis?.concept, 80) !== wantConcept) continue;
    return { axisId, title: axis.title };
  }
  return null;
}

// 이 보고서 다음에 무엇을 할 수 있는가. 축이 없으면 아무것도 없다 — 지어내지 않는다.
export function buildNextStep({ axis = null, axisIndex = null, books = [], datasets = [], research = [] } = {}) {
  const full = axis?.axisId ? (axisIndex?.axes || {})[axis.axisId] : null;
  const title = clean(full?.title || axis?.title, 60);
  const activities = activitiesFrom(full?.output);
  // 할 일이 없으면 블록을 만들지 않는다. 자료만 남으면 그게 읽을거리 목록이다.
  if (!title || !activities.length) return null;
  return {
    axisTitle: title,
    why: clean(full?.why, 200),
    activities,
    nextSubjects: (full?.next || []).map((one) => clean(one, 30)).filter(Boolean).slice(0, 3),
    // 자료는 수단이다. 없으면 없는 대로 두고, 할 일은 그대로 남는다.
    books: books.slice(0, 2).map((book) => ({ title: book.title, author: book.author })),
    datasets: datasets.slice(0, 2).map((row) => ({ title: row.title, org: row.org, id: row.id })),
    // 대학 연구. 자료가 아니라 **이 주제가 어디로 이어지는지**다. 그래서 '쓸 수 있는 자료'와 따로 둔다.
    // 학생이 읽을 원문이 없으므로 참고문헌에는 안 들어간다.
    research: research.slice(0, 2).map((row) => ({
      title: row.title, org: row.org, lead: row.lead, year: row.year, url: row.url, kind: row.kind,
      // 그 대학의 학과와, **그 학과에서 이 개념을 실제로 배우는 과목**. 없으면 안 붙는다.
      major: row.major ? {
        name: row.major.name, college: row.major.college,
        courses: (row.major.courses || []).slice(0, 3), jobs: (row.major.jobs || []).slice(0, 2),
      } : null,
    })),
  };
}

// 학생이 읽을 한 줄. 지금 내라는 것이 아니라, 다음에 할 수 있는 것이라고 말한다.
export function nextStepNote(step) {
  if (!step) return '';
  const has = step.books.length || step.datasets.length;
  return has
    ? '이 보고서는 여기서 끝나지만, 같은 축으로 한 걸음 더 갈 수 있어요. 아래 자료는 그때 쓰면 됩니다.'
    : '이 보고서는 여기서 끝나지만, 같은 축으로 한 걸음 더 갈 수 있어요.';
}
