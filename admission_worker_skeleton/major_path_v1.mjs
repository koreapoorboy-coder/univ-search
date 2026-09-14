// Which way this report reaches the student's future, and — more importantly — what happens when it cannot.
//
// The user's rule, and the reason this module exists at all: 학생의 선택이나 결과나 연결에서 우리가 생각하지 못한
// 것이 나오면 교과 심화 확장으로 가야 한다. So 교과 심화 확장 is not a special case for undecided students. It is
// the floor. Every other path is an upgrade off it, taken only when the evidence is there, and every failure —
// a major we hold nothing for, a major that does not touch this task, a typo, an empty result — lands back on it
// rather than reaching for a connection that is not real.
//
//   curriculum  the student named a major we hold a published curriculum for, and one of its courses stands on
//               a 고교 개념 this task actually touches. Rare, specific, and worth a lot when it happens.
//   axis        everything else. The concept's own 종단 축 — where this competency deepens — written as
//               확장성 rather than as a career claim.

const clean = (value) => String(value ?? '').trim();
// 계열 names are not majors. A student who picked only 공학계열 has not told us a department.
const TRACK_ONLY = /계열$|^(인문|자연|공학|의약|보건|사회|교육|예체능|예술|체육|경상|상경)$/;

function findMajor(name, index) {
  const table = index?.majors || {};
  const want = clean(name);
  if (!want || TRACK_ONLY.test(want)) return null;
  if (table[want]) return { major: want, ...table[want] };
  // 컴퓨터공학과 should find 컴퓨터학과, 전자공학과 should find 전기전자공학부.
  const bare = want.replace(/(학과|학부|과|전공)$/, '');
  if (bare.length < 2) return null;
  for (const key of Object.keys(table)) {
    const other = key.replace(/(학과|학부|과|전공)$/, '');
    if (other === bare || other.includes(bare) || bare.includes(other)) return { major: key, ...table[key] };
  }
  return null;
}

// Does this major's curriculum actually touch what the student is studying right now? A 물리학과 student writing
// about 효소 is still a 물리학과 student, but the curriculum has nothing to say about that particular report.
function touching(found, input) {
  const here = [input?.subject, input?.selectedConcept, input?.selectedKeyword, input?.keyword]
    .map(clean).filter((value) => value.length >= 2);
  const hits = [];
  for (const year of found.years || []) {
    for (const course of year.courses) {
      for (const hit of course.highSchool) {
        const near = here.some((value) => hit.subject.includes(value) || value.includes(hit.subject)
          || hit.concept.includes(value) || value.includes(hit.concept));
        if (near) hits.push({ year: year.year, title: course.title, ...hit });
      }
    }
  }
  return hits;
}

export function resolveMajorPath(input, index) {
  const major = clean(input?.major);
  const found = findMajor(major, index);
  if (!found) {
    return { mode: 'axis', major, reason: major ? (TRACK_ONLY.test(major) ? 'TRACK_ONLY' : 'NO_CURRICULUM') : 'NO_MAJOR' };
  }
  const hits = touching(found, input);
  if (!hits.length) {
    return { mode: 'axis', major: found.major, reason: 'NOT_TOUCHING', leans: found.leans || [] };
  }
  return { mode: 'curriculum', major: found.major, group: found.group, hits: hits.slice(0, 5), leans: found.leans || [], sources: found.sources || [] };
}

// The floor. Written as 확장성, not as a career claim, because the student may not have one and may change the
// one they have — a 1학년 report that names a department is still in 생활기록부 three years later.
export function axisPromptLines(axes, path) {
  const top = (axes || []).slice(0, 2).filter((axis) => axis?.title);
  const why = {
    NO_MAJOR: '학생이 아직 전공을 정하지 않았다.',
    TRACK_ONLY: '학생이 계열까지만 정했고 학과는 정하지 않았다.',
    NO_CURRICULUM: `학생이 정한 ${path?.major || '학과'}는 우리가 교육과정을 가지고 있지 않다.`,
    NOT_TOUCHING: `학생이 정한 ${path?.major || '학과'}의 교육과정은 이번 과제와 닿는 부분이 없다.`,
  }[path?.reason] || '';
  return [
    '',
    '[교과 심화와 확장 — 이 탐구가 어디까지 뻗는가]',
    ...(why ? [`- ${why} 그러니 전공 이야기로 끌고 가지 않는다.`] : []),
    '- 이 절은 학생이 이번 탐구에서 쓴 교과 역량이 어느 방향으로 더 깊어지는지를 쓰는 자리다. 진로를 맞히는 자리가 아니다.',
    ...(top.length
      ? [
        '- 아래는 이 개념에서 실제로 뻗어 나가는 방향이다. 우리 교육과정 지도에서 찾은 것이며, 이 중에서 고른다.',
        ...top.map((axis) => `  · ${axis.title}: ${axis.subject}의 "${axis.concept}"에서 ${(axis.next || []).join(', ')}로 이어진다. ${axis.why || ''}`.trim()),
        '- 고른 방향에서 학생이 다음에 실제로 해 볼 수 있는 탐구를 1~2개, 무엇을 바꾸어 무엇을 볼지까지 구체적으로 쓴다.',
      ]
      : ['- 이번 탐구에서 쓴 방법과 개념이 그다음에 무엇을 할 수 있게 하는지를 쓴다. 학생이 실제로 이어서 할 수 있는 탐구 1~2개를 구체적으로 제안한다.']),
    '- 학과 이름이나 직업 이름을 쓰지 않는다. 이 학생은 전공을 바꿀 수 있고, 이 보고서는 생활기록부에 3년간 남는다.',
    '- 이번 결과와 이어지지 않는 방향은 쓰지 않는다. 억지로 넓히는 것보다 한 방향을 정확히 쓰는 편이 낫다.',
  ];
}

// The upgrade. Only when a real course in a real curriculum stands on the concept this report is about.
export function curriculumPathPromptLines(path) {
  if (path?.mode !== 'curriculum' || !path.hits?.length) return [];
  return [
    '',
    `[교과 심화와 확장 — ${path.major}에서 실제로 이어지는 과목]`,
    '- 아래는 대학이 공개한 교육과정에서 가져온 것이다. 학과 이름에서 연상한 것이 아니다.',
    ...path.hits.map((hit) => `  · ${hit.year ? `${hit.year}학년 ` : ''}${hit.title} — ${hit.subject}의 "${hit.concept}" 위에 선다`),
    ...(path.leans?.length ? [`- ${path.major}가 기대는 고교 과목: ${path.leans.map((item) => `${item.subject} ${item.count}회`).join(', ')}. 이번 탐구가 그중 어디에 해당하는지 밝힌다.`] : []),
    '- 이 절은 "그 학과에 가고 싶다"는 말을 쓰는 자리가 아니라, 이번에 쓴 교과 역량이 그 과목에서 어떻게 이어지는지를 쓰는 자리다.',
    '- 학과 이름은 한 번까지만 쓴다. 대신 위 과목이 다루는 문제를 고등학생이 할 수 있는 크기로 좁혀 다음 탐구를 제안한다.',
    '- 위 과목과 이번 결과가 이어지지 않으면 억지로 쓰지 않고, 이 탐구의 교과 역량이 어디로 더 깊어지는지만 쓴다.',
  ];
}

// One call for the Worker: the right lines for whichever path survived, with the floor always underneath.
export function majorPathPromptLines(path, axes) {
  const upgrade = curriculumPathPromptLines(path);
  return upgrade.length ? upgrade : axisPromptLines(axes, path);
}
