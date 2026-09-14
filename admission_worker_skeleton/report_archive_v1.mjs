// AI가 쓴 것이 우리에게 남아야 한다.
//
// Until now the engine stored what a student *chose* — school, grade, subject, keyword, the whole input payload —
// and then threw away what the model actually *wrote*. So every fault in the writing had to be found by paying to
// generate fresh reports (₩23,251 in one session), and a question like "어느 과목에서 결론이 자주 빠지나" could
// only be answered by running the whole sweep again.
//
// This keeps the other half: the report body, beside the input that produced it and what it cost. Reading it is
// free, so a bug hunt becomes a query instead of a bill.
//
// Two rules it carries:
//   · 이름은 안 남는다. A student can type anything into the free-text fields, so the body is scrubbed on the way
//     in rather than trusted. This table is meant to be read by us, over and over, for years.
//   · 코드가 없어도 남는다. The improvement data has nothing to do with whether a student wanted a portfolio —
//     most of them will not — so a row is written either way, and carries the code only when there is one.

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

// ₩/USD and the gpt-5 price, kept beside the numbers they explain: $1.25 per 1M in, $10 per 1M out.
const KRW_PER_USD = 1385;
export function costKrw(usage, model) {
  const input = Number(usage?.input_tokens || 0);
  const output = Number(usage?.output_tokens || 0);
  if (!input && !output) return 0;
  // Only gpt-5 pricing is known here; another model records tokens and leaves the cost at 0 rather than guessing.
  if (!/^gpt-5/.test(String(model || ''))) return 0;
  const usd = (input / 1e6) * 1.25 + (output / 1e6) * 10;
  return Math.round(usd * KRW_PER_USD);
}

// 학생이 자유 입력 칸에 이름을 적을 수 있다. 넓게 잡으면 '참고'까지 먹어서, 좁게 잡고 대신 확실한 것만 지운다.
const NAME_LINE = /((?:학생|이름|성명|작성자|제출자)\s*[:：]\s*)[^\n,·]{2,20}/g;
const SCHOOL = /[가-힣A-Za-z0-9]{2,12}(?:초등학교|중학교|고등학교|중학교부설|고교)/g;
export function scrubForArchive(text) {
  return String(text ?? '')
    .replace(NAME_LINE, '$1○○○')
    .replace(SCHOOL, '○○학교');
}

export async function ensureArchiveTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS report_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      student_code TEXT,
      school_name TEXT,
      grade TEXT,
      subject TEXT,
      subject_group TEXT,
      track TEXT,
      major TEXT,
      task_key TEXT,
      task_description TEXT,
      keyword TEXT,
      concept TEXT,
      report_stage TEXT,
      collection_kind TEXT,
      report_structure TEXT,
      axis_id TEXT,
      axis_title TEXT,
      cross_subject TEXT,
      major_path TEXT,
      case_tag TEXT,
      variable_tag TEXT,
      measure_tag TEXT,
      title TEXT,
      body_json TEXT,
      record_draft TEXT,
      section_count INTEGER,
      body_chars INTEGER,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      reasoning_tokens INTEGER,
      cost_krw INTEGER,
      took_ms INTEGER,
      source TEXT
    )
  `).run();
  // 과목별로 훑고, 한 보고서를 이어 보고, 코드로 붙일 때 쓴다.
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_report_outputs_subject ON report_outputs (subject, report_stage)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_report_outputs_report ON report_outputs (report_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_report_outputs_code ON report_outputs (student_code)').run();
}

// The report the model returned, as it was written. Sections keep their headings so a later sweep can ask
// structural questions ("어느 단계에서 결론이 빠지나") without re-parsing prose.
function bodyOf(result) {
  const sections = [];
  for (const [key, value] of Object.entries(result || {})) {
    if (key === 'reportTitle' || key === 'recordDraft' || key === 'combination' || key === 'figures') continue;
    if (typeof value === 'string' && value.trim()) sections.push({ key, text: scrubForArchive(value) });
    else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      const joined = value.filter(Boolean).join('\n');
      if (joined.trim()) sections.push({ key, text: scrubForArchive(joined) });
    }
  }
  return sections;
}

export function archiveRow(input, result, meta = {}) {
  const sections = bodyOf(result);
  const axis = (input?.careerAxes || [])[0] || null;
  const combination = result?.combination || {};
  return {
    report_id: clean(meta.reportId, 60) || `r-${Date.now().toString(36)}`,
    student_code: clean(input?.studentCode, 40).toLowerCase() || null,
    school_name: clean(input?.schoolName || input?.school, 60),
    grade: clean(input?.grade, 10),
    subject: clean(input?.subject, 40),
    subject_group: clean(input?.subjectGroup, 20),
    track: clean(input?.track || input?.career, 40),
    major: clean(input?.major, 40),
    task_key: clean(meta.taskKey, 200),
    // 과제 설명은 길다. 앞 1,000자면 어떤 과제였는지 알아보기에 충분하다.
    task_description: scrubForArchive(clean(input?.taskDescription, 1000)),
    keyword: clean(input?.selectedKeyword || input?.keyword, 60),
    concept: clean(input?.selectedConcept, 200),
    report_stage: clean(input?.reportStage, 30),
    collection_kind: clean(input?.collectionKind, 20),
    report_structure: clean(input?.reportShape?.structure || meta.structure, 60),
    axis_id: clean(axis?.axisId, 60),
    axis_title: clean(axis?.title, 60),
    cross_subject: (input?.crossSubject?.partners || []).map((partner) => clean(partner.subject, 30)).join(', '),
    major_path: clean(input?.majorPath?.mode, 20),
    case_tag: clean(combination.caseTag, 40),
    variable_tag: clean(combination.variableTag, 60),
    measure_tag: clean(combination.measureTag, 40),
    title: scrubForArchive(clean(result?.reportTitle, 300)),
    body_json: JSON.stringify(sections),
    record_draft: (result?.recordDraft || []).map((line) => scrubForArchive(clean(line, 200))).join('\n'),
    section_count: sections.length,
    body_chars: sections.reduce((total, section) => total + section.text.length, 0),
    model: clean(meta.model, 40),
    input_tokens: Number(meta.usage?.input_tokens || 0),
    output_tokens: Number(meta.usage?.output_tokens || 0),
    reasoning_tokens: Number(meta.usage?.reasoning_tokens || 0),
    cost_krw: costKrw(meta.usage, meta.model),
    took_ms: Number(meta.tookMs || 0),
    source: clean(meta.source, 40),
  };
}

const COLUMNS = [
  'report_id', 'student_code', 'school_name', 'grade', 'subject', 'subject_group', 'track', 'major',
  'task_key', 'task_description', 'keyword', 'concept', 'report_stage', 'collection_kind', 'report_structure',
  'axis_id', 'axis_title', 'cross_subject', 'major_path', 'case_tag', 'variable_tag', 'measure_tag',
  'title', 'body_json', 'record_draft', 'section_count', 'body_chars',
  'model', 'input_tokens', 'output_tokens', 'reasoning_tokens', 'cost_krw', 'took_ms', 'source',
];

export async function saveReportOutput(db, input, result, meta = {}) {
  // 제목도 본문도 없으면 남길 것이 없다. A seed fallback with nothing written is not worth a row.
  if (!result?.reportTitle && !bodyOf(result).length) return { ok: false };
  await ensureArchiveTable(db);
  const row = archiveRow(input, result, meta);
  await db.prepare(`
    INSERT INTO report_outputs (${COLUMNS.join(', ')})
    VALUES (${COLUMNS.map(() => '?').join(', ')})
  `).bind(...COLUMNS.map((column) => row[column])).run();
  return { ok: true, reportId: row.report_id };
}

// 1회성으로 쓴 학생이 나중에 마음을 바꾸면, 그때 그 보고서를 자기 코드에 붙일 수 있다.
// The row was kept anyway for our own reading, so this costs nothing extra and stores no new personal data.
export async function attachToStudent(db, reportId, code) {
  const id = clean(reportId, 60);
  const student = clean(code, 40).toLowerCase();
  if (!id || !student) return { ok: false };
  await ensureArchiveTable(db);
  const row = await db.prepare('SELECT * FROM report_outputs WHERE report_id = ? ORDER BY id DESC LIMIT 1').bind(id).first();
  if (!row) return { ok: false, reason: 'NOT_FOUND' };
  await db.prepare('UPDATE report_outputs SET student_code = ? WHERE report_id = ?').bind(student, id).run();
  return { ok: true, row };
}
