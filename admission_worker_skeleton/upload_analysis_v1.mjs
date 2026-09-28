// Reads what a student uploads — a past 탐구보고서 or their 생활기록부, as PDF pages or photos — and turns it into
// the structure the report engine can build on.
//
// Two rules shape everything here:
//   1. Nothing personal is kept. The analysis never carries a name, a school, a teacher or a classmate, and the
//      transcription itself is never stored: only the derived structure goes to D1.
//   2. The upload decides the next report, never the student's own guess about what level they are at. A 생활기록부
//      shows what they have already done, so the engine can propose the lines that actually continue it.

export const DOC = Object.freeze({ REPORT: 'report', RECORD: 'record', OTHER: 'other' });

export const UPLOAD_LIMITS = Object.freeze({
  // The size cap is what the student meets, not a file count: a 생활기록부 can run to many pages, and a real one
  // scanned at full quality passes 20MB easily.
  totalBytes: 60 * 1024 * 1024,
  // OpenAI refuses a single file over 50MB, so one file stops at 45MB while the batch may reach 60MB.
  fileBytes: 45 * 1024 * 1024,
  // Anything past this is handed to the model as an uploaded file instead of base64: a 60MB file becomes an
  // 80MB base64 string, and the Worker only has 128MB of memory to work in.
  inlineBytes: 4 * 1024 * 1024,
  maxFiles: 30,
  // **한 번에 다 읽지 않고 묶음으로 나눠 읽는다.** 2026-09-27 에 실제 1학년 생기부(사진 8장)로
  // 확인했다: 한 번에 읽으면 쓸 수 있는 글자 수 천장에 부딪혀 교과 절반을 빠뜨리거나 통째로
  // 실패한다. 2학년까지 올리면 사진이 두 배가 되므로 천장만 올려서는 곧 다시 부딪힌다.
  // 묶음으로 나누면 몇 해치를 올리든 한 번에 읽는 양이 늘 작다. 비용은 같다 — 읽는 양이 같다.
  batchFiles: 4,
  types: Object.freeze(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic']),
});

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const list = (value, max, each) => (Array.isArray(value) ? value : []).map((item) => clip(item, each)).filter(Boolean).slice(0, max);

// A name, a school or a teacher must never survive into the analysis, whatever the document contained. The patterns
// stay narrow on purpose: a rule loose enough to catch "풍생고" also eats "참고", and a report that loses the word
// 참고 is worse than one that keeps a school's short form the model was told not to write in the first place.
const PERSONAL = [
  [/[가-힣]{2,4}\s*(?:학생|군|양|선생님|교사|담임)(?:은|는|이|가|의|과|와|도|을|를|께|에게)?/g, ''],
  [/[가-힣]{2,10}(?:초등|중|고등)학교/g, ''],
  [/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, ''],
];
export function scrubPersonal(text) {
  return PERSONAL.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), String(text ?? ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function checkUpload(files) {
  if (!files.length) return '읽을 파일이 없습니다.';
  if (files.length > UPLOAD_LIMITS.maxFiles) return `파일은 한 번에 ${UPLOAD_LIMITS.maxFiles}개까지 올릴 수 있어요.`;
  const oversize = files.find((file) => file.size > UPLOAD_LIMITS.fileBytes);
  if (oversize) return `파일 하나는 ${Math.round(UPLOAD_LIMITS.fileBytes / 1048576)}MB까지예요. "${clip(oversize.name, 40)}"이(가) 너무 큽니다.`;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > UPLOAD_LIMITS.totalBytes) return `한 번에 올리는 파일은 모두 합쳐 ${Math.round(UPLOAD_LIMITS.totalBytes / 1048576)}MB까지예요.`;
  const wrongType = files.find((file) => !UPLOAD_LIMITS.types.includes(String(file.type || '').toLowerCase()));
  if (wrongType) return `PDF와 사진만 읽을 수 있어요. "${clip(wrongType.name, 40)}"은(는) 읽을 수 없습니다.`;
  return '';
}

const STRING = { type: 'string' };
const STRINGS = { type: 'array', items: STRING };

// **묶음 한 개를 읽을 때 쓰는 칸.** 판단은 하지 않는다 — 보이는 것을 옮겨 적기만 한다.
// 판단(무엇이 반복되는 관심인가, 다음에 무엇을 쓰면 좋은가)은 묶음을 다 모은 뒤 한 번에 한다.
// 묶음마다 판단하면 조각난 판단 다섯 개가 나오고, 합쳐도 말이 안 된다.
export function pageSchema() {
  const whole = analysisSchema();
  const record = whole.record.properties;
  return {
    entries: record.entries,
    pastUnits: record.pastUnits,
  };
}

// onlyGrade 를 주면 그 학년만 옮긴다. **파일이 한 개일 때 쓴다** — 26쪽짜리 PDF 한 개를 한 번에
// 보내면 모델에 앞쪽만 닿는다(2026-09-27: 26쪽인데 입력이 19,065 토큰뿐이었고 교과를 넷만 적었다).
// 학년을 나눠 세 번 부르면 같은 파일을 세 번 보내게 되지만, 그 값은 싸다(입력 ₩33 남짓).
// **PDF 한 개는 쪽 묶음으로 나눈다.** 26쪽짜리를 한 번에 보내면 앞쪽만 읽힌다(2026-09-27 실측:
// 26쪽인데 입력이 19,065 토큰뿐이었고 교과를 넷만 적어 왔다). 학년으로 나눠 보니 뒷부분이
// 읽히기는 했지만(넷 → 아홉) 이번에는 고1 이 빠졌다 — 학년은 문서 어디에 있는지 모르기 때문이다.
// 쪽 번호는 문서가 스스로 아는 것이라 빠짐이 없다.
// **판단할 때는 옮겨 적기 칸을 빼 준다.** 스키마가 entries 와 pastUnits 를 꼭 있어야 하는 칸으로
// 잡고 있어서, 「비워 두라」고 말해도 모델이 열세 줄을 다시 써 내며 자리를 다 쓴다 —
// 2026-09-27 에 실제 생기부로 확인했다(판단이 통째로 실패해 다음 보고서 제안이 0개가 됐다).
// 옮겨 적은 것은 우리가 이미 갖고 있으니 다시 받을 까닭이 없다.
export function judgeSchema() {
  const whole = analysisSchema();
  const { entries, pastUnits, ...rest } = whole.record.properties;
  return {
    ...whole,
    record: { ...whole.record, required: whole.record.required.filter((one) => one !== 'entries' && one !== 'pastUnits'), properties: rest },
  };
}

export function pagePromptLines(input, span) {
  return [
    '[너의 일]',
    '- 학생이 올린 생활기록부 사진 몇 장을 읽고, 거기 보이는 것을 **그대로 옮겨 적는다**. 판단하거나 요약하지 않는다.',
    '',
    '[반드시 지킬 것]',
    '- 사람 이름, 학교 이름, 선생님 이름, 친구 이름은 어떤 항목에도 쓰지 않는다. 읽었더라도 옮기지 않는다.',
    '- **이 묶음에 보이는 교과를 빠짐없이** 한 줄씩 넣는다. 한 장이라도 건너뛰지 않는다.',
    ...(span ? [`- **이 문서의 ${span} 만 옮긴다.** 그 밖의 쪽은 건너뛴다. 그 쪽들을 보려면 문서를 끝까지 넘겨 보아야 한다.`] : []),
    '- 파일에 적힌 내용만 쓴다. 없는 활동을 지어내지 않는다. 읽히지 않는 부분은 빼고 읽힌 것만 옮긴다.',
    '- 모든 항목을 한국어로 쓴다. 교과 용어는 우리 교과서에서 쓰는 말로 바꾼다.',
    '',
    '[entries — 과목별로 한 줄]',
    '- subject는 교과목 이름, text는 그 과목의 세부능력특기사항을 **줄이지 말고** 옮긴 것이다(800자를 넘으면 뒤를 자른다).',
    '- **grade는 그 쪽에 적힌 학년 칸을 그대로 읽어서 적는다.** 쪽 위쪽의 「1학년」·「2학년」 같은 표시나 표의 학년 칸을 본다.',
    '- 학년이 그 쪽에 안 보이면 **비워 둔다.** 짐작해서 적지 않는다 — 틀린 학년이 적히면 3년 기록이 뒤섞인다. 빈 채로 두면 나중에 사람이 고칠 수 있다.',
    '- 태도나 참여도 칭찬은 빼고 다룬 주제와 활동을 남긴다. 교과 세부능력특기사항만 넣는다 — 창의적 체험활동과 행동특성은 넣지 않는다.',
    '',
    '[pastUnits — 이미 다룬 주제]',
    '- subject는 교과목 이름, topic은 교과서 말로 짧게(예: 광합성과 세포 호흡), grade는 학년.',
    '- 같은 주제가 여러 번 나오면 한 번만 쓴다. 동아리·자율활동처럼 교과가 아닌 것은 subject를 비운다.',
  ];
}

// 묶음들을 하나로 모은다. 같은 과목이 여러 묶음에서 나오면 **더 긴 글**을 남긴다 —
// 사진이 겹쳐 찍혔거나 한 과목이 두 장에 걸쳐 있을 때 잘린 쪽을 버리기 위해서다.
export function mergePages(parts) {
  const entries = new Map();
  const units = new Map();
  for (const part of parts || []) {
    for (const one of part?.entries || []) {
      const key = `${clip(one?.grade, 6)}::${clip(one?.subject, 30)}`;
      const now = entries.get(key);
      if (!now || String(one?.text || '').length > String(now.text || '').length) entries.set(key, one);
    }
    for (const one of part?.pastUnits || []) {
      const key = `${clip(one?.grade, 6)}::${clip(one?.subject, 30)}::${clip(one?.topic, 60)}`;
      if (!units.has(key)) units.set(key, one);
    }
  }
  // **학년을 못 읽은 줄은 같은 과목의 학년 있는 줄에 합친다.** 안 그러면 「공통국어1」이 두 번 나온다 —
  // 한 번은 고1, 한 번은 학년 빈칸으로(2026-09-27, 열두 번 올린 기록을 합치다가 보였다).
  // 학년을 아는 쪽을 남기고, 글은 더 긴 쪽을 쓴다.
  const named = new Map();
  for (const [key, one] of entries) if (clip(one?.grade, 6)) named.set(clip(one?.subject, 30), key);
  for (const [key, one] of [...entries]) {
    if (clip(one?.grade, 6)) continue;
    const mine = named.get(clip(one?.subject, 30));
    if (!mine) continue;
    const now = entries.get(mine);
    if (String(one?.text || '').length > String(now?.text || '').length) entries.set(mine, { ...now, text: one.text });
    entries.delete(key);
  }
  // 이미 한 것도 같은 방식으로 합친다.
  const namedUnit = new Map();
  for (const [key, one] of units) if (clip(one?.grade, 6)) namedUnit.set(`${clip(one?.subject, 30)}::${clip(one?.topic, 60)}`, key);
  for (const [key, one] of [...units]) {
    if (clip(one?.grade, 6)) continue;
    if (namedUnit.has(`${clip(one?.subject, 30)}::${clip(one?.topic, 60)}`)) units.delete(key);
  }
  return { entries: [...entries.values()], pastUnits: [...units.values()] };
}

// **모아 놓고 한 번에 판단한다.** 사진은 다시 안 보낸다 — 이미 옮겨 적은 글만 본다.
// 그래서 이 호출은 싸고 빠르다.
export function judgePromptLines(input, merged) {
  // **판단에 넣는 글은 짧게 자른다.** 과목이 스물여덟 개가 되자 판단이 또 실패했다
  // (2026-09-27, 1·2학년 16쪽). 넣는 글이 길수록 모델이 생각을 길게 하다 자리를 다 쓴다.
  // 판단에 필요한 것은 「무엇을 다뤘나」이지 세특 전문이 아니다. 전문은 이미 우리가 갖고 있다.
  const said = (merged?.entries || []).slice(0, 40)
    .map((one) => `  [${clip(one?.grade, 6) || '학년?'}] ${clip(one?.subject, 30)}: ${clip(one?.text, 110)}`);
  return [
    '[너의 일]',
    '- 아래는 한 학생의 생활기록부에서 과목별로 옮겨 적은 글이다. 이것만 보고 아래 형식으로 정리한다.',
    '- docType은 record로 한다. report 항목은 비워 둔다.',
    '',
    '[학생이 적어 둔 것]',
    ...said,
    '',
    '[반드시 지킬 것]',
    '- 사람 이름, 학교 이름, 선생님 이름은 쓰지 않는다.',
    '- 위에 적힌 것만 쓴다. 없는 활동을 지어내지 않는다.',
    '- activitySummary는 학년이 올라가며 관심이 어떻게 움직였는지 한 문단으로 쓴다.',
    '- repeatedInterests는 여러 과목에서 반복되는 주제 3~6개, strongSides는 이미 잘 해 둔 탐구 방식, thinSides는 아직 얇은 부분이다.',
    '- 과목별 글을 다시 옮겨 적지 않는다. 그것은 이미 우리가 갖고 있다.',
    '',
    '[reportLines — 가장 중요한 항목]',
    '- 이 학생이 다음에 쓰면 좋을 보고서 주제를 2~4개 제안한다. 이미 한 것을 반복하지 않고 한 단계 올라가야 한다.',
    '- title은 보고서 제목처럼 구체적으로, subject는 어느 과목에서 할지, why는 위의 무엇과 이어지는지, step은 이전보다 무엇이 더 깊어지는지를 쓴다.',
    `- 목표 수준은 ${clip(input?.targetLevel, 40) || '고2~고3 심화 수준'}이다. 생각의 깊이는 그 수준으로 올리되, 하는 일은 고등학생이 학교나 집에서 실제로 할 수 있어야 한다.`,
    '- 전문 장비나 전문 분석을 전제로 한 제안은 하지 않는다. 조건별로 값을 여러 번 재서 평균과 흔들림을 비교하는 것만으로 확인할 수 있어야 한다.',
    '- 반복 횟수를 적을 때는 3~5회로 쓴다.',
    ...axisPromptLines(input?.matchedAxes),
  ];
}
export function analysisSchema() {
  return {
    docType: { type: 'string', enum: [DOC.REPORT, DOC.RECORD, DOC.OTHER] },
    docTypeReason: STRING,
    subjectGuess: STRING,
    gradeGuess: STRING,
    level: { type: 'string', enum: ['고1 수준', '고2 수준', '고3 수준', '대학 1학년 수준', '판단 어려움'] },
    report: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'question', 'concepts', 'method', 'findings', 'limits', 'nextSteps'],
      properties: { title: STRING, question: STRING, concepts: STRINGS, method: STRING, findings: STRING, limits: STRING, nextSteps: STRINGS },
    },
    record: {
      type: 'object',
      additionalProperties: false,
      required: ['activitySummary', 'repeatedInterests', 'strongSides', 'thinSides', 'pastUnits', 'entries'],
      properties: { activitySummary: STRING, repeatedInterests: STRINGS, strongSides: STRINGS, thinSides: STRINGS,
        // **이미 한 것을 과목별로 받는다.** 3년을 이어 쓰려면 2학년 학생이 1학년에 무엇을 했는지
        // 알아야 한다(사장님 결정 2026-09-26). 요약문만으로는 단원을 집을 수 없어 따로 받는다.
        // topic 은 우리 단원 사전에 대어 실제 단원 이름으로 바꾼다 — 세특 문장으로 재 보니 33줄 중
        // 32줄(97%)에서 단원이 나왔다(tools/measure_record_unit_hits_v1.mjs).
        pastUnits: {
          type: 'array',
          minItems: 0,
          maxItems: 20,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['subject', 'topic', 'grade'],
            properties: { subject: STRING, topic: STRING, grade: STRING },
          },
        },
        // **세특 글을 과목별로 그대로 받는다.** 학생이 개인정보 동의를 한 학생들이므로(사장님 확인
        // 2026-09-27) 원문을 남길 수 있다. 남기면 두 가지가 된다:
        //   · 우리 사전이 좋아질 때 **학생에게 다시 안 물어보고** 다시 뽑는다(₩0).
        //   · 포트폴리오 화면에 1학년 기록을 줄로 보여 준다 — 3년이 한 화면에 있으려면 이것이 있어야 한다.
        // 사람 이름·학교 이름은 여기에도 쓰지 않는다. 그건 동의와 무관하게 보고서 품질 문제다.
        entries: {
          type: 'array',
          minItems: 0,
          maxItems: 40,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['grade', 'subject', 'text'],
            properties: { grade: STRING, subject: STRING, text: STRING },
          },
        } },
    },
    reportLines: {
      type: 'array',
      minItems: 0,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'subject', 'why', 'step'],
        properties: { title: STRING, subject: STRING, why: STRING, step: STRING },
      },
    },
  };
}

// Which of the engine's 종단 축 this student's own work already sits on. The axes carry where each one leads
// (next_subjects), why, and what a student produces along it — all of it from our own curriculum maps, so the
// next report is proposed on ground we can point at instead of whatever the model thinks of.
// 전공 이름을 축 낱말이 만날 수 있는 모양으로 쪼갠다.
//
// 축을 찾는 방법은 「글자가 들어 있나」다. 그런데 학생은 「기계」가 아니라 **「기계공학과」**라고 쓴다.
// 축 낱말은 「기계 시스템」이라, 「기계공학과」 안에 「기계 시스템」이 없고 거꾸로도 없다 — 못 만난다.
// 그래서 전공 이름의 꼬리를 떼어 짧게 만든 말도 같이 넣는다.
//
//   기계공학과 → 기계공학 → 기계          전기전자공학부 → 전기전자공학 → 전기전자
//   간호학과   → 간호                      체육교육과     → 체육교육     → 체육
//
// 짧게 만들수록 뜻이 흐려지므로 **점수를 낮춰서** 넣는다(weight). 과제 글에서 찾은 낱말이 먼저이고,
// 전공은 과제가 아무 말도 안 할 때 기댈 곳이다.
// 꼬리는 두 번에 나눠 뗀다. 한 번에 「학과」를 떼면 「기계공학과」가 「기계공」이 된다 — 「공학」의
// 「학」까지 먹기 때문이다. 먼저 학과를 가리키는 꼬리(과·부·전공)만 떼고, 그 다음에 분야 꼬리를 뗀다.
//   기계공학과 → (과) 기계공학 → (공학) 기계        생명과학과 → 생명과학 → 생명
//   간호학과   → (과) 간호학   → (학)   간호        사학과     → 사학     → (사는 너무 짧아 그대로)
const MAJOR_TAIL = /(학전공|전공|계열|과|부)$/;
const FIELD_TAIL = /(공학|과학|교육|디자인|경영|행정|정책|문학|학)$/;

export function expandMajorTerms(name) {
  const base = String(name || '').trim();
  if (base.length < 2) return [];
  const out = [{ term: base, weight: 0.6 }];
  const stripped = base.replace(MAJOR_TAIL, '');
  if (stripped.length >= 2 && stripped !== base) out.push({ term: stripped, weight: 0.5 });
  const head = stripped.replace(FIELD_TAIL, '');
  if (head.length >= 2 && head !== stripped) out.push({ term: head, weight: 0.4 });
  const seen = new Set();
  return out.filter((one) => !seen.has(one.term) && seen.add(one.term));
}

// subject 를 주면 **그 과목의 축만** 고른다. 과제 글이 주제를 안 말할 때, 학생의 전공으로 축을 찾되
// 지금 쓰는 과목 안에서 찾아야 하기 때문이다 — 컴퓨터학과 학생의 정보 과제에 「전자기와 양자」 축을
// 물려 주면 안 된다.
// **끝 숫자는 지우지 않는다.** 「공통국어1」과 「공통국어2」는 다른 과목이고, 통합과학·통합사회·
// 과학탐구실험도 마찬가지다. 지웠더니 공통국어1 과제에 공통국어2 단원이 붙었다.
const plainSubject = (value) => String(value || '').replace(/\s+/g, '');

export function matchAxes(terms, index, limit = 4, subject = '') {
  if (!index?.keywords || !index?.axes) return [];
  // 낱말은 글자만 줄 수도 있고 {term, weight} 로 줄 수도 있다. 점수를 낮춰 넣고 싶은 말(전공에서
  // 쪼갠 짧은 말)을 위해서다. 글자만 주면 weight 는 1 이다.
  const wanted = (Array.isArray(terms) ? terms : [])
    .map((one) => (one && typeof one === 'object'
      ? { term: String(one.term || '').trim(), weight: Number(one.weight) || 1 }
      : { term: String(one || '').trim(), weight: 1 }))
    .filter((one) => one.term.length >= 2);
  const scores = new Map();
  for (const { term, weight } of wanted) {
    for (const [keyword, hits] of Object.entries(index.keywords)) {
      // A repeated interest rarely matches a keyword exactly: 항공우주 meets 항공, 미세먼지 meets 미세먼지 농도.
      if (!term.includes(keyword) && !keyword.includes(term)) continue;
      const closeness = Math.min(term.length, keyword.length) / Math.max(term.length, keyword.length);
      for (const [axisId, boost] of hits) {
        scores.set(axisId, (scores.get(axisId) || 0) + boost * closeness * weight);
      }
    }
  }
  const want = plainSubject(subject);
  return [...scores.entries()]
    .map(([axisId, score]) => ({ ...index.axes[axisId], axisId, score: Math.round(score) }))
    .filter((axis) => axis.title)
    .filter((axis) => !want || plainSubject(axis.subject) === want)
    .sort((a, b) => b.score - a.score || a.priority - b.priority)
    .slice(0, limit);
}

export function axisPromptLines(matched) {
  if (!matched?.length) return [];
  return [
    '',
    '[이 학생의 관심이 이미 올라타 있는 탐구 축 — 우리 교육과정 지도에서 찾은 것]',
    ...matched.map((axis, index) => [
      `${index + 1}. ${axis.title} (${axis.subject}의 "${axis.concept}"에서 이어짐)`,
      `   이어지는 과목·학과: ${axis.next.join(', ')}`,
      `   왜: ${axis.why}`,
      `   이 축에서 나오는 산출물: ${axis.output}`,
    ].join('\n')),
    '- reportLines는 위 축 중에서 고른다. 축의 "이어지는 과목"을 subject에 쓰고, why에는 그 축이 학생의 어떤 활동과 이어지는지 적는다.',
    '- 위 축이 이번 학생과 전혀 맞지 않을 때만 축 밖에서 제안하고, why에 그 이유를 밝힌다.',
  ];
}

export function analysisPromptLines(input) {
  return [
    '[너의 일]',
    '- 학생이 올린 파일을 읽고, 그것이 지난 탐구보고서인지 생활기록부인지 판단한 뒤 아래 형식으로 정리한다.',
    '- 보고서면 docType을 report로 하고 report 항목을 채운다. 생활기록부면 record로 하고 record 항목을 채운다. 둘 다 아니면 other로 하고 두 항목을 빈 값으로 둔다.',
    '',
    '[반드시 지킬 것]',
    '- 모든 항목을 한국어로 쓴다. 원문이 영어나 다른 언어여도 한국어로 옮겨 적는다. 교과 용어는 우리 교과서에서 쓰는 말로 바꾼다.',
    '- 사람 이름, 학교 이름, 선생님 이름, 친구 이름은 어떤 항목에도 쓰지 않는다. 읽었더라도 옮기지 않는다.',
    '- 파일에 적힌 내용만 쓴다. 없는 활동이나 수치를 지어내지 않는다. 읽히지 않는 부분은 빈 값으로 둔다.',
    '- 글자가 흐리거나 잘려 확실하지 않으면 docTypeReason에 그렇게 적는다.',
    '- 확실히 읽히지 않는 낱말은 옮기지 않는다. 앞뒤 문맥으로 비슷한 말을 지어내 채우지 않는다. 그 부분은 빼고 읽힌 것만 쓴다.',
    '- subjectGuess에는 학교 교과목 이름을 쓴다(예: 통합과학, 물리학, 생명과학, 정보, 통합사회). 진로나 학문 분야 이름(예: 항공우주공학)은 쓰지 않는다.',
    '',
    '[보고서일 때]',
    '- question은 그 보고서가 던진 연구 질문, concepts는 사용한 교과 개념 3~6개, method는 무엇을 어떤 기준으로 했는지, findings는 결과를 숫자가 있으면 숫자와 함께, limits는 그 보고서가 밝혔거나 드러난 한계다.',
    '- nextSteps에는 그 보고서에서 자연스럽게 이어지는 다음 탐구 2~4개를 쓴다.',
    '',
    '[생활기록부일 때]',
    '- activitySummary는 학년이 올라가며 관심이 어떻게 움직였는지 한 문단으로 쓴다.',
    '- repeatedInterests는 여러 과목·여러 학년에서 반복되는 주제 3~6개, strongSides는 이미 잘 해 둔 탐구 방식, thinSides는 아직 얇은 부분(예: 수치 분석이 없음, 한 과목에만 몰려 있음)이다.',
    '- pastUnits에는 **이 학생이 이미 다룬 것**을 과목별로 적는다. subject는 학교 교과목 이름(통합과학·공통국어1·한국사처럼), topic은 그 과목에서 다룬 주제를 교과서 말로 짧게(예: 광합성과 세포 호흡, 음운 변동), grade는 몇 학년 때인지(고1·고2·고3)를 쓴다.',
    '- pastUnits는 지어내지 않는다. 세부능력특기사항에 적힌 것만 쓴다. 같은 주제가 여러 번 나오면 한 번만 쓴다. 동아리·자율활동처럼 교과가 아닌 것은 subject를 비운다.',
    '- entries에는 **세부능력특기사항 글을 과목별로 그대로** 옮긴다. grade는 학년(고1·고2·고3), subject는 교과목 이름, text는 그 과목에 적힌 글이다. 한 과목이 한 줄이다.',
    '- **사진에 보이는 교과를 빠짐없이** 한 줄씩 넣는다. 국어·수학·영어·한국사·통합사회·통합과학처럼 앞쪽에 있는 과목도 반드시 넣는다. 빠뜨리면 학생의 3년 기록에 구멍이 생긴다.',
    '- entries의 text는 세부능력특기사항에 적힌 내용을 **줄이지 말고** 옮긴다. 800자를 넘으면 뒤를 자른다. 태도나 참여도 칭찬만 있는 문장은 빼도 된다.',
    '- 사진이 여러 장이면 **모든 장**을 끝까지 읽는다. 뒤쪽 장만 읽고 끝내지 않는다.',
    '- entries에는 교과 세부능력특기사항만 넣는다. 창의적 체험활동(자율·동아리·진로)과 행동특성은 넣지 않는다 — 그건 activitySummary가 맡는다.',
    '',
    '[reportLines — 가장 중요한 항목]',
    '- 이 학생이 다음에 쓰면 좋을 보고서 주제를 2~4개 제안한다. 이미 한 것을 반복하지 않고 한 단계 올라가야 한다.',
    '- 길게 고민하지 말고 위에 적힌 것에서 바로 고른다. 없는 것을 새로 지어내지 않는다.',
    '- title은 보고서 제목처럼 구체적으로, subject는 어느 과목에서 할지, why는 올린 자료의 무엇과 이어지는지, step은 이전보다 무엇이 더 깊어지는지(예: 사례 비교 → 변인 통제 실험, 문헌 정리 → 수치 해석)를 쓴다.',
    `- 목표 수준은 ${clip(input?.targetLevel, 40) || '고2~고3 심화 수준'}이다. 생각의 깊이는 그 수준으로 올리되, 하는 일은 고등학생이 학교나 집에서 실제로 할 수 있어야 한다.`,
    '- 전문 장비나 전문 분석을 전제로 한 제안은 하지 않는다. 색도계, 분광광도계, 단백질 정량 키트, RT-qPCR, 유전자 분석, 통계 검정(ANOVA, t검정), 곡선 적합 같은 것은 쓰지 않는다.',
    '- 제안한 탐구는 조건별로 값을 여러 번 재서 평균과 흔들림(최댓값-최솟값)을 비교하는 것만으로 확인할 수 있어야 한다. 학교에서 구할 수 있는 도구(자, 저울, 타이머, 스마트폰 카메라, 온도계)와 공개 자료로 할 수 있는 범위에서 고른다.',
    '- 반복 횟수를 적을 때는 3~5회로 쓴다. 결과 표가 한 조건에 다섯 번까지만 받으므로 "5회 이상"이나 "10회"처럼 그보다 많은 횟수를 제안하지 않는다.',
    '- 올린 자료와 이번 학생의 계열이 많이 다르면 주제를 억지로 잇지 않는다. 대신 이전에 쓴 탐구 방법과 분석 능력을 한 단계 올리는 방향으로 잇고, why에 그렇게 적는다.',
    ...axisPromptLines(input?.matchedAxes),
  ];
}

// 학년 표기를 우리 것으로 맞춘다. 생활기록부는 「3학년」이라고 적고 우리 화면은 「고3」으로 묶는다 —
// 그대로 두면 포트폴리오에서 「기타」로 빠진다(2026-09-27 실측).
// 못 읽은 학년은 빈 채로 둔다. 짐작해 채우면 3년 기록이 뒤섞인다.
function gradeWord(value) {
  const said = String(value ?? '').replace(/\s+/g, '');
  const found = /([123])/.exec(said);
  return found ? `고${found[1]}` : '';
}

export function sanitizeAnalysis(parsed) {
  const docType = [DOC.REPORT, DOC.RECORD, DOC.OTHER].includes(parsed?.docType) ? parsed.docType : DOC.OTHER;
  const text = (value, max) => scrubPersonal(clip(value, max));
  const texts = (value, max, each) => list(value, max, each).map((item) => scrubPersonal(item)).filter(Boolean);
  return {
    docType,
    docTypeReason: text(parsed?.docTypeReason, 200),
    subjectGuess: text(parsed?.subjectGuess, 40),
    gradeGuess: text(parsed?.gradeGuess, 20),
    level: clip(parsed?.level, 20) || '판단 어려움',
    report: docType === DOC.REPORT ? {
      title: text(parsed?.report?.title, 100),
      question: text(parsed?.report?.question, 300),
      concepts: texts(parsed?.report?.concepts, 6, 40),
      method: text(parsed?.report?.method, 600),
      findings: text(parsed?.report?.findings, 600),
      limits: text(parsed?.report?.limits, 400),
      nextSteps: texts(parsed?.report?.nextSteps, 4, 120),
    } : null,
    record: docType === DOC.RECORD ? {
      activitySummary: text(parsed?.record?.activitySummary, 900),
      repeatedInterests: texts(parsed?.record?.repeatedInterests, 6, 40),
      strongSides: texts(parsed?.record?.strongSides, 5, 80),
      thinSides: texts(parsed?.record?.thinSides, 5, 80),
      entries: (Array.isArray(parsed?.record?.entries) ? parsed.record.entries : []).slice(0, 40)
        // 800자까지 남긴다. 실제 세특 한 과목이 800자 안팎이다(repo 의 실제 생기부로 쟀다).
        // 짧게 자르면 나중에 사전이 좋아져도 다시 뽑을 거리가 없다 — 쌓아 두는 값이 여기 있다.
        .map((one) => ({ grade: gradeWord(one?.grade), subject: text(one?.subject, 30), text: text(one?.text, 800) }))
        .filter((one) => one.text.length >= 20),
      pastUnits: (Array.isArray(parsed?.record?.pastUnits) ? parsed.record.pastUnits : []).slice(0, 20)
        .map((one) => ({ subject: text(one?.subject, 30), topic: text(one?.topic, 60), grade: gradeWord(one?.grade) }))
        .filter((one) => one.topic),
    } : null,
    reportLines: (Array.isArray(parsed?.reportLines) ? parsed.reportLines : []).slice(0, 4).map((line) => ({
      title: text(line?.title, 80),
      subject: text(line?.subject, 30),
      why: text(line?.why, 200),
      step: text(line?.step, 150),
    })).filter((line) => line.title && line.why),
    chosenLine: parsed?.chosenLine?.title ? {
      title: text(parsed.chosenLine.title, 80),
      subject: text(parsed.chosenLine.subject, 30),
      why: text(parsed.chosenLine.why, 200),
      step: text(parsed.chosenLine.step, 150),
    } : null,
  };
}

// What the draft prompt is told about the student's own history. Topics are only carried over when the upload and
// this task sit in the same ground; otherwise the continuity is in the method, which is the honest link.
export function priorWorkPromptLines(analysis, sameGround) {
  if (!analysis) return [];
  const lines = ['', '[학생이 올린 지난 자료]'];
  if (analysis.docType === DOC.REPORT && analysis.report) {
    lines.push(`- 지난 보고서 주제: ${analysis.report.title || '(제목 없음)'}`);
    if (analysis.report.question) lines.push(`- 그때의 연구 질문: ${analysis.report.question}`);
    if (analysis.report.concepts.length) lines.push(`- 그때 쓴 개념: ${analysis.report.concepts.join(', ')}`);
    if (analysis.report.method) lines.push(`- 그때의 방법: ${analysis.report.method}`);
    if (analysis.report.limits) lines.push(`- 그때 남은 한계: ${analysis.report.limits}`);
    if (analysis.report.nextSteps.length) lines.push(`- 그때 제안한 다음 탐구: ${analysis.report.nextSteps.join(' / ')}`);
  }
  if (analysis.docType === DOC.RECORD && analysis.record) {
    lines.push(`- 지금까지의 흐름: ${analysis.record.activitySummary}`);
    if (analysis.record.repeatedInterests.length) lines.push(`- 반복해서 나오는 관심: ${analysis.record.repeatedInterests.join(', ')}`);
    if (analysis.record.strongSides.length) lines.push(`- 이미 잘 해 둔 것: ${analysis.record.strongSides.join(' / ')}`);
    if (analysis.record.thinSides.length) lines.push(`- 아직 얇은 것: ${analysis.record.thinSides.join(' / ')}`);
  }
  if (analysis.level && analysis.level !== '판단 어려움') lines.push(`- 지난 자료의 수준: ${analysis.level}. 이번 설계는 여기서 한 단계 위로 간다.`);
  if (analysis.chosenLine) {
    lines.push(`- 학생이 다음 탐구로 고른 주제: ${analysis.chosenLine.title}`);
    if (analysis.chosenLine.step) lines.push(`- 그 주제에서 깊어져야 하는 점: ${analysis.chosenLine.step}`);
    lines.push('- 이번 설계서는 이 주제로 만든다. 과제 안내문의 조건과 맞지 않는 부분만 과제에 맞게 고친다.');
  }
  lines.push(sameGround
    ? '- 이번 탐구는 위 자료에서 이어지는 종단 탐구다. 같은 주제를 다시 하지 말고, 남은 한계나 다음 탐구로 적힌 것에서 출발해 한 단계 깊게 설계한다. 무엇이 이어지는지는 연구 질문에 자연스럽게 드러나야 하고, 본문에 "지난 보고서"라는 말을 쓰지 않는다.'
    : '- 이번 과제는 위 자료와 주제가 다르다. 주제를 억지로 잇지 않는다. 대신 그때보다 한 단계 높은 탐구 방법(변인 통제, 수치 비교, 반복 측정, 근거 검토)을 쓰도록 설계한다.');
  return lines;
}

// Same ground means the subject group or the repeated interests actually meet this task; a shared common word does not.
export function sharesGround(analysis, input) {
  if (!analysis) return false;
  const target = `${input?.taskDescription || ''} ${input?.selectedConcept || ''} ${input?.selectedKeyword || ''} ${input?.subject || ''}`;
  const terms = [
    ...(analysis.report?.concepts || []),
    ...(analysis.record?.repeatedInterests || []),
    analysis.report?.title || '',
    analysis.subjectGuess || '',
  ].map((term) => String(term).trim()).filter((term) => term.length >= 2);
  return terms.some((term) => target.includes(term));
}
