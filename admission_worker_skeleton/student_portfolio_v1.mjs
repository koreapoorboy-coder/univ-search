// 학생 한 명, 코드 하나, 3년.
//
// Until now a report was made and forgotten: everything stored was keyed to a school, so nobody could ask what
// one student had actually done. This is the record that makes the rest possible — 면접 준비, 전공 적합도,
// 학과·수시 판단 all need the three years to exist somewhere first.
//
// Two rules the data itself has to carry:
//   · 이름은 모델에게 가지 않는다. It is stored so the student recognises their own page, and never leaves it.
//     The same rule the school name already lives under.
//   · 코드는 맞힐 수 없어야 한다. sc-study0042 alone lets anyone try 0043 and read a minor's name, school and
//     three years of work, so a four-character check is appended. The student still sees their number.

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const CODE_PREFIX = 'sc-study';
// No 0/O/1/l — a student reads this off a slip of paper and types it.
const CHECK_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const STUDENT_CODE_RE = /^sc-study(\d{4,6})-([a-z2-9]{4})$/;

export function formatStudentCode(serial, check) {
  return `${CODE_PREFIX}${String(serial).padStart(4, '0')}-${check}`;
}

export function parseStudentCode(code) {
  const match = STUDENT_CODE_RE.exec(clean(code, 40).toLowerCase());
  return match ? { serial: Number(match[1]), check: match[2] } : null;
}

function makeCheck() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => CHECK_ALPHABET[byte % CHECK_ALPHABET.length]).join('');
}

export async function ensureStudentTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      code TEXT PRIMARY KEY,
      serial INTEGER NOT NULL,
      name TEXT NOT NULL,
      school_name TEXT,
      entered_grade TEXT,
      track TEXT,
      major TEXT,
      license_id INTEGER,
      org_name TEXT,
      max_uses INTEGER NOT NULL DEFAULT -1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      entered_year INTEGER,
      phone_tail TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )
  `).run();
  await addMissingColumns(db);
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS student_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      grade TEXT,
      subject TEXT,
      subject_group TEXT,
      task_key TEXT,
      concept TEXT,
      keyword TEXT,
      axis_id TEXT,
      axis_title TEXT,
      axis_next TEXT,
      cross_subject TEXT,
      report_stage TEXT,
      collection_kind TEXT,
      title TEXT,
      case_tag TEXT,
      variable_tag TEXT,
      measure_tag TEXT,
      record_draft TEXT,
      attempts INTEGER NOT NULL DEFAULT 1
    )
  `).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS student_reports_by_code ON student_reports (student_code, id)').run();
  // 한 과제를 몇 번 다시 만들었는지. 이 표가 만들어진 뒤에 생긴 칸이라 나중에 붙인다.
  try {
    await db.prepare('ALTER TABLE student_reports ADD COLUMN attempts INTEGER NOT NULL DEFAULT 1').run();
  } catch (error) {
    // 이미 있는 칸이다.
  }
}

// 이미 만들어진 표에 칸을 더한다. SQLite는 있는 칸을 또 더하면 오류를 내므로, 오류 하나하나를 삼킨다.
const ADDED_COLUMNS = [
  'license_id INTEGER', 'org_name TEXT',
  'max_uses INTEGER NOT NULL DEFAULT -1', 'used_count INTEGER NOT NULL DEFAULT 0',
  'expires_at TEXT', 'enabled INTEGER NOT NULL DEFAULT 1', 'entered_year INTEGER', 'phone_tail TEXT',
];
async function addMissingColumns(db) {
  for (const column of ADDED_COLUMNS) {
    try {
      await db.prepare(`ALTER TABLE students ADD COLUMN ${column}`).run();
    } catch (error) {
      // 이미 있는 칸이다. 그게 정상이다.
    }
  }
}

// 학년은 해마다 바뀐다. 가입할 때 적은 '고1'을 그대로 두면 3년 뒤에도 고1로 보인다. 입학연도만 저장하고
// 지금 학년은 그때그때 센다. 3월에 학년이 오르므로 1~2월은 아직 지난 학년이다.
export function gradeNow(enteredYear, now = new Date()) {
  const year = Number(enteredYear);
  if (!Number.isFinite(year) || year < 2000) return '';
  const schoolYear = now.getFullYear() - (now.getMonth() < 2 ? 1 : 0);
  const step = schoolYear - year + 1;
  if (step < 1) return '입학 전';
  if (step > 3) return '졸업';
  return `고${step}`;
}

// 학생이 고른 '고2'와 오늘 날짜로 입학연도를 되돌린다. 가입할 때 한 번만 쓴다.
export function enteredYearFrom(grade, now = new Date()) {
  const step = Number(String(grade || '').replace(/[^123]/g, '')) || 0;
  if (!step) return 0;
  const schoolYear = now.getFullYear() - (now.getMonth() < 2 ? 1 : 0);
  return schoolYear - step + 1;
}

// We issue the code, so the serial is ours to hand out and the check is what makes it unguessable.
export async function issueStudentCode(db, profile) {
  const name = clean(profile?.name, 40);
  if (!name) return { ok: false, error: '학생 이름을 적어 주세요.' };
  await ensureStudentTables(db);
  const row = await db.prepare('SELECT MAX(serial) AS last FROM students').first();
  const serial = Number(row?.last || 0) + 1;
  const code = formatStudentCode(serial, makeCheck());
  const grant = profile?.grant || {};
  await db.prepare(`
    INSERT INTO students (code, serial, name, school_name, entered_grade, entered_year, phone_tail, track, major,
      license_id, org_name, max_uses, used_count, expires_at, enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, datetime('now'))
  `).bind(
    code, serial, name, clean(profile?.school, 60), clean(profile?.grade, 10),
    enteredYearFrom(profile?.grade) || null,
    // 입금한 사람과 학생을 맞추는 데만 쓴다. 번호 전체는 받지 않는다.
    clean(profile?.phoneTail, 4).replace(/\D/g, '') || null,
    clean(profile?.track, 40), clean(profile?.major, 40),
    grant.licenseId || null, clean(grant.orgName, 60) || null,
    // 무제한은 -1이다. 여기서 0으로 깎으면 무제한 이용권이 소진된 것으로 뒤집힌다.
    Number.isFinite(Number(grant.maxUses)) ? Math.trunc(Number(grant.maxUses)) : -1, clean(grant.expiresAt, 40) || null,
  ).run();
  return { ok: true, code, serial, name };
}

export async function loadStudent(db, code) {
  if (!parseStudentCode(code)) return null;
  await ensureStudentTables(db);
  const row = await db.prepare('SELECT * FROM students WHERE code = ?').bind(clean(code, 40).toLowerCase()).first();
  return row || null;
}

export async function updateStudent(db, code, profile) {
  const student = await loadStudent(db, code);
  if (!student) return { ok: false, error: '학생 코드를 찾을 수 없어요.' };
  await db.prepare(`
    UPDATE students SET name = ?, school_name = ?, entered_grade = ?, track = ?, major = ?, updated_at = datetime('now')
    WHERE code = ?
  `).bind(
    clean(profile?.name, 40) || student.name,
    clean(profile?.school, 60) || student.school_name,
    clean(profile?.grade, 10) || student.entered_grade,
    clean(profile?.track, 40) || student.track,
    // 진로는 바뀐다. An empty major is a real answer — 아직 못 정했어요 — so it is written as given.
    clean(profile?.major, 40),
    student.code,
  ).run();
  return { ok: true };
}

// One row per finished report. What is kept is what a portfolio needs to be read three years later — not the
// report text, which the student already has, but the line it sits on.
// 평가 기준 문장이 개념 칸에 들어오는 일이 있다. A concept is a thing; a rubric line is a sentence about the work.
function conceptOf(report) {
  const concept = clean(report?.concept, 200);
  const sentence = concept.length > 40 || /(하였는가|했는가|는가[.?]?|[다요][.]?)$/.test(concept);
  return sentence ? clean(report?.keyword, 60) : clean(concept, 60);
}

export async function saveStudentReport(db, code, report) {
  if (!parseStudentCode(code) || !clean(report?.title)) return { ok: false };
  await ensureStudentTables(db);
  const axis = report?.axis || null;
  const student = clean(code, 40).toLowerCase();
  const taskKey = clean(report.taskKey, 200);
  // The same task, coming back finished, replaces what it wrote on the way in.
  const prior = taskKey
    ? await db.prepare('SELECT id, attempts FROM student_reports WHERE student_code = ? AND task_key = ? AND subject = ? ORDER BY id DESC LIMIT 1')
        .bind(student, taskKey, clean(report.subject, 40)).first()
    : null;
  if (prior?.id) {
    await db.prepare(`
      UPDATE student_reports SET
        grade = ?, subject_group = ?, concept = ?, keyword = ?,
        axis_id = ?, axis_title = ?, axis_next = ?, cross_subject = ?, report_stage = ?, collection_kind = ?,
        title = ?, case_tag = ?, variable_tag = ?, measure_tag = ?, record_draft = ?,
        attempts = COALESCE(attempts, 1) + 1
      WHERE id = ?
    `).bind(
      clean(report.grade, 10), clean(report.subjectGroup, 20), conceptOf(report), clean(report.keyword, 60),
      clean(axis?.axisId, 60), clean(axis?.title, 60), (axis?.next || []).map((v) => clean(v, 30)).join(', '),
      (report.crossSubject || []).map((v) => clean(v, 30)).join(', '),
      clean(report.stage, 30), clean(report.collectionKind, 20),
      clean(report.title, 200), clean(report.caseTag, 40), clean(report.variableTag, 60), clean(report.measureTag, 40),
      (report.recordDraft || []).map((v) => clean(v, 200)).join('\n'), prior.id,
    ).run();
    return { ok: true, replaced: true, attempts: Number(prior.attempts || 1) + 1 };
  }
  await db.prepare(`
    INSERT INTO student_reports (
      student_code, grade, subject, subject_group, task_key, concept, keyword,
      axis_id, axis_title, axis_next, cross_subject, report_stage, collection_kind,
      title, case_tag, variable_tag, measure_tag, record_draft
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    student, clean(report.grade, 10), clean(report.subject, 40), clean(report.subjectGroup, 20),
    taskKey, conceptOf(report), clean(report.keyword, 60),
    clean(axis?.axisId, 60), clean(axis?.title, 60), (axis?.next || []).map((v) => clean(v, 30)).join(', '),
    (report.crossSubject || []).map((v) => clean(v, 30)).join(', '),
    clean(report.stage, 30), clean(report.collectionKind, 20),
    clean(report.title, 200), clean(report.caseTag, 40), clean(report.variableTag, 60), clean(report.measureTag, 40),
    (report.recordDraft || []).map((v) => clean(v, 200)).join('\n'),
  ).run();
  return { ok: true };
}

// 같은 과제를 지금까지 몇 번 만들었는가. 한 과제는 1회로 세면서 재생성은 무제한이면, 설계서를 열 번
// 다시 만든 학생 하나에 우리는 ₩1,200을 쓰고 1회만 받는다. 만들기 전에 이 숫자를 본다.
export async function countAttempts(db, code, taskKey, subject) {
  const student = clean(code, 40).toLowerCase();
  const task = clean(taskKey, 200);
  if (!student || !task) return 0;
  await ensureStudentTables(db);
  const row = await db.prepare(
    'SELECT attempts FROM student_reports WHERE student_code = ? AND task_key = ? AND subject = ? ORDER BY id DESC LIMIT 1'
  ).bind(student, task, clean(subject, 40)).first();
  return Number(row?.attempts || 0);
}

// 막힌 학생을 다시 열어 주는 길. 진짜로 고장 나서 못 쓴 경우가 있고, 그때 우리가 풀어 줄 수 있어야 한다.
export async function resetAttempts(db, code) {
  const student = clean(code, 40).toLowerCase();
  if (!parseStudentCode(student)) return { ok: false };
  await ensureStudentTables(db);
  await db.prepare('UPDATE student_reports SET attempts = 1 WHERE student_code = ?').bind(student).run();
  return { ok: true };
}

// Everything the student did, in order, with the lines that run through it. The name never leaves this function
// toward a prompt — it is here so the student knows the page is theirs.
export async function loadPortfolio(db, code) {
  const student = await loadStudent(db, code);
  if (!student) return null;
  const rows = await db.prepare('SELECT * FROM student_reports WHERE student_code = ? ORDER BY id ASC').bind(student.code).all();
  const reports = (rows?.results || []).map((row) => ({
    at: row.created_at, grade: row.grade, subject: row.subject, subjectGroup: row.subject_group,
    concept: row.concept, keyword: row.keyword,
    axis: row.axis_title ? { id: row.axis_id, title: row.axis_title, next: (row.axis_next || '').split(', ').filter(Boolean) } : null,
    crossSubject: (row.cross_subject || '').split(', ').filter(Boolean),
    stage: row.report_stage, collectionKind: row.collection_kind, title: row.title,
    caseTag: row.case_tag, variableTag: row.variable_tag, measureTag: row.measure_tag,
    recordDraft: (row.record_draft || '').split('\n').filter(Boolean),
  }));
  return { student: { code: student.code, serial: student.serial, name: student.name, school: student.school_name, enteredGrade: student.entered_grade, gradeNow: gradeNow(student.entered_year), track: student.track, major: student.major, org: student.org_name || '' }, reports, summary: summarise(reports) };
}

// What three years add up to, counted rather than described. This is what the 면접·전공 적합도 work will read.
export function summarise(reports) {
  const count = (key, pick) => {
    const map = new Map();
    for (const report of reports) for (const value of [].concat(pick(report) || []).filter(Boolean)) map.set(value, (map.get(value) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n, key }));
  };
  const axes = count('axis', (r) => r.axis?.title);
  return {
    reportCount: reports.length,
    byGrade: count('grade', (r) => r.grade),
    subjects: count('subject', (r) => r.subject),
    concepts: count('concept', (r) => r.concept),
    axes,
    crossSubjects: count('cross', (r) => r.crossSubject),
    methods: count('method', (r) => r.collectionKind),
    // A line is an axis the student came back to. One report on an axis is a report; three is a direction.
    lines: axes.filter((axis) => axis.count >= 2),
  };
}
