// 과제 글이 주제를 말하지 않을 때 **학생에게 보여 줄 낱말 목록**을 만든다.
//
// 왜 목록인가. 학생에게 빈칸을 주면 못 씁니다 — 단원 이름을 모르고, 무엇이 가능한지도 모릅니다.
// 반대로 우리가 말없이 정하면(유료 확인 2026-09-21) 같은 과제를 두 번 돌렸을 때 「보호필름 정전기」와
// 「투명 전극 저항」처럼 **매번 다른 주제**가 나옵니다. 학생은 제출할 수 없습니다.
//
// 그래서 **우리가 좁히고 학생이 짚는** 모양으로 만든다. 단원 이름은 몰라도, 자기 수업에서
// 「등가속도 운동」을 배웠는지는 안다. 그건 학생이 아는 것이다.
//
// 차례:
//   1. 안내문에서 읽어낸 단원 — 맨 위에 두고 **「안내문에서 읽었어요」로 표시**한다. 표시가 없으면
//      학생이 진로에 맞는 쪽으로 바꿔 버리고, 그러면 과제와 어긋난 보고서가 나온다.
//   2. 학생이 고른 전공이 닿는 단원
//   3. 학생이 고른 **계열**이 닿는 단원 — 자율전공·미정 학생은 전공이 없지만 계열은 반드시 고른다
//   4. 나머지
// 이미 쓴 단원은 지우지 않고 뒤로 보내고 표시한다.
//
// 목록은 tools/build_unit_choices_index.mjs 가 만든 얇은 표(unit_choices.v1.json, 29KB)를 읽는다.
// 원본(subject_concept_engine_map)은 428KB라 화면이 통째로 받기에는 크다.

const clean = (value, max = 160) => String(value ?? '').trim().slice(0, max);
const plain = (value) => String(value || '').replace(/\s+/g, '');

// 화면의 계열 단추 값 → 전공 묶음 이름. 화면은 engineering/natural/... 로 보내고 표는 공학/자연/... 이다.
export const TRACK_GROUP = {
  engineering: '공학', natural: '자연', medical: '의약', social: '사회', humanities: '인문',
  공학: '공학', 자연: '자연', 의약: '의약', 사회: '사회', 인문: '인문', 예체능: '예체능',
};

// 왜 위에 올렸는지. 학생에게 그대로 보여 준다 — 우리가 고른 까닭을 숨기지 않는다.
export const CHOICE_WHY = {
  FROM_TASK: 'task',      // 선생님 안내문에서 읽어냈다
  MAJOR: 'major',         // 학생이 고른 전공이 닿는 단원(진로 칸으로 걸린 것 — 주제에 가깝다)
  MAJOR_COURSE: 'course', // 그 전공이 대학에서 배우는 단원(넓다)
  TRACK: 'track',         // 학생이 고른 계열이 닿는 단원
  PLAIN: 'plain',         // 그 과목의 단원이지만 진로와의 연결은 없다
};

export function unitChoices({
  subject, index = null, major = '', track = '', detected = '',
  used = [], limit = 6,
} = {}) {
  const rows = (index?.subjects || {})[clean(subject, 40)] || [];
  if (!rows.length) return [];
  const wantMajor = clean(major, 40);
  const wantGroup = TRACK_GROUP[clean(track, 20)] || '';
  const found = plain(detected);
  const skip = new Set((Array.isArray(used) ? used : []).map((one) => plain(one)).filter(Boolean));

  const out = rows.map((row) => {
    const fromTask = Boolean(found) && plain(row.c) === found;
    // 진로 칸으로 걸린 전공이 먼저다. 대학 교육과정으로만 걸린 것은 넓어서 주제가 흐리다.
    const byBridge = Boolean(wantMajor) && (row.b || []).includes(wantMajor);
    const byCourse = Boolean(wantMajor) && !byBridge && (row.m || []).includes(wantMajor);
    const byTrack = Boolean(wantGroup) && (row.g || []).includes(wantGroup);
    const why = fromTask ? CHOICE_WHY.FROM_TASK
      : byBridge ? CHOICE_WHY.MAJOR
        : byCourse ? CHOICE_WHY.MAJOR_COURSE
          : byTrack ? CHOICE_WHY.TRACK : CHOICE_WHY.PLAIN;
    return {
      concept: row.c,
      keywords: (row.k || []).slice(0, 5),
      topic: clean(row.t, 160),
      why,
      // 이 단원이 닿는 전공 이름 두 개까지 — 「기계공학과와 이어져요」처럼 까닭을 말할 때 쓴다.
      majors: (row.m || []).slice(0, 2),
      done: skip.has(plain(row.c)),
      rank: fromTask ? 0 : byBridge ? 1 : byCourse ? 2 : byTrack ? 3 : 4,
    };
  });

  out.sort((a, b) => (a.done - b.done) || (a.rank - b.rank) || a.concept.localeCompare(b.concept, 'ko'));
  return out.slice(0, limit).map(({ rank, ...row }) => row);
}

// 학생이 고른 낱말이 어느 단원의 것인가. 화면은 낱말을 보여 주므로 낱말만 돌아올 수 있다.
export function conceptOfKeyword({ subject, keyword, index = null } = {}) {
  const pick = plain(keyword);
  if (!pick) return '';
  for (const row of (index?.subjects || {})[clean(subject, 40)] || []) {
    if (plain(row.c) === pick) return row.c;
    for (const word of row.k || []) if (plain(word) === pick) return row.c;
  }
  return '';
}
