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
      required: ['activitySummary', 'repeatedInterests', 'strongSides', 'thinSides'],
      properties: { activitySummary: STRING, repeatedInterests: STRINGS, strongSides: STRINGS, thinSides: STRINGS },
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
    '',
    '[reportLines — 가장 중요한 항목]',
    '- 이 학생이 다음에 쓰면 좋을 보고서 주제를 2~4개 제안한다. 이미 한 것을 반복하지 않고 한 단계 올라가야 한다.',
    '- title은 보고서 제목처럼 구체적으로, subject는 어느 과목에서 할지, why는 올린 자료의 무엇과 이어지는지, step은 이전보다 무엇이 더 깊어지는지(예: 사례 비교 → 변인 통제 실험, 문헌 정리 → 수치 해석)를 쓴다.',
    `- 목표 수준은 ${clip(input?.targetLevel, 40) || '고2~고3 심화 수준'}이다. 생각의 깊이는 그 수준으로 올리되, 하는 일은 고등학생이 학교나 집에서 실제로 할 수 있어야 한다.`,
    '- 전문 장비나 전문 분석을 전제로 한 제안은 하지 않는다. 색도계, 분광광도계, 단백질 정량 키트, RT-qPCR, 유전자 분석, 통계 검정(ANOVA, t검정), 곡선 적합 같은 것은 쓰지 않는다.',
    '- 제안한 탐구는 조건별로 값을 여러 번 재서 평균과 흔들림(최댓값-최솟값)을 비교하는 것만으로 확인할 수 있어야 한다. 학교에서 구할 수 있는 도구(자, 저울, 타이머, 스마트폰 카메라, 온도계)와 공개 자료로 할 수 있는 범위에서 고른다.',
    '- 반복 횟수를 적을 때는 3~5회로 쓴다. 결과 표가 한 조건에 다섯 번까지만 받으므로 "5회 이상"이나 "10회"처럼 그보다 많은 횟수를 제안하지 않는다.',
    '- 올린 자료와 이번 학생의 계열이 많이 다르면 주제를 억지로 잇지 않는다. 대신 이전에 쓴 탐구 방법과 분석 능력을 한 단계 올리는 방향으로 잇고, why에 그렇게 적는다.',
  ];
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
