// 이용권 — 누가 샀고, 몇 명이, 몇 번, 언제까지.
//
// The access codes lived in the gateway's source, so issuing one for a paying customer meant editing a file and
// deploying. That cannot be how a business sells anything. These live in D1: 발급도 충전도 정지도 배포 없이 된다.
//
// Two levels, because both are sold:
//   · 이용권(license) — 산 것. 학원이 30석을 사거나, 개인이 1석을 산다. 등록 코드 하나가 딸려 나온다.
//   · 학생 코드 — 쓰는 것. 학생이 등록 코드로 한 석을 가져가면서 발급된다. 횟수는 **학생마다** 따로 센다.
//
// 횟수를 이용권에 달면 한 반이 코드를 나눠 쓸 때 한 명이 다 써버린다. 그래서 석을 나눠 주고, 각자 자기 몫을 쓴다.

const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback);

// 무제한은 -1. 0은 '남은 횟수 없음'이어야 관리자가 횟수를 빼서 학생을 멈출 수 있다.
export const UNLIMITED = -1;
// 이용권을 발급할 때 횟수를 안 적으면 무제한이다. 0회짜리 이용권은 팔 이유가 없으므로 0도 무제한으로 읽는다.
export function capFrom(value) {
  const asked = num(value, UNLIMITED);
  return asked > 0 ? asked : UNLIMITED;
}

// 학생이 종이에서 옮겨 적는다. 0/O/1/l 없음 — 학생 코드와 같은 규칙.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const JOIN_CODE_RE = /^ac-([a-z2-9]{6})$/;

export function parseJoinCode(code) {
  const match = JOIN_CODE_RE.exec(clean(code, 20).toLowerCase());
  return match ? match[1] : null;
}

function makeJoinCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `ac-${[...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')}`;
}

export async function ensureLicenseTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      join_code TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'org',
      org_name TEXT,
      plan_name TEXT,
      seats INTEGER NOT NULL DEFAULT 1,
      seats_used INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT -1,
      period_days INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      amount_krw INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT,
      memo TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

// 기간은 두 가지로 판다: 가입일부터 N일(period_days), 또는 정해진 날짜까지(expires_at). 둘 다 있으면 이른 쪽이 이긴다.
export function endOfPeriod(license, from = new Date()) {
  const dates = [];
  const days = num(license?.period_days);
  if (days > 0) dates.push(new Date(from.getTime() + days * 86400000));
  const fixed = clean(license?.expires_at, 40);
  if (fixed) {
    const parsed = new Date(fixed);
    if (!Number.isNaN(parsed.getTime())) dates.push(parsed);
  }
  if (!dates.length) return '';
  return new Date(Math.min(...dates.map((date) => date.getTime()))).toISOString();
}

// 결제를 받은 뒤 우리가 만든다. 결제 자체는 여기서 처리하지 않는다 — 얼마를 받았는지만 적어 둔다.
export async function issueLicense(db, input = {}) {
  await ensureLicenseTables(db);
  const seats = Math.max(1, num(input.seats, 1));
  const kind = input.kind === 'personal' || seats === 1 && !clean(input.orgName) ? 'personal' : 'org';
  const orgName = clean(input.orgName, 60) || (kind === 'personal' ? '개인' : '');
  if (kind === 'org' && !orgName) return { ok: false, error: '학원 이름을 적어 주세요.' };
  const joinCode = makeJoinCode();
  await db.prepare(`
    INSERT INTO licenses (join_code, kind, org_name, plan_name, seats, max_uses, period_days, expires_at, amount_krw, paid_at, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    joinCode, kind, orgName, clean(input.planName, 60),
    seats, capFrom(input.maxUses), Math.max(0, num(input.periodDays)),
    clean(input.expiresAt, 40) || null, Math.max(0, num(input.amountKrw)),
    clean(input.paidAt, 40) || null, clean(input.memo, 300) || null,
  ).run();
  return { ok: true, joinCode, kind, orgName, seats };
}

export async function loadLicense(db, joinCode) {
  if (!parseJoinCode(joinCode)) return null;
  await ensureLicenseTables(db);
  return db.prepare('SELECT * FROM licenses WHERE join_code = ?').bind(clean(joinCode, 20).toLowerCase()).first();
}

// 학생 한 명이 한 석을 가져간다. 자리가 없거나, 정지됐거나, 기간이 끝났으면 거절한다 — 가입 전에.
export async function claimSeat(db, joinCode, now = new Date()) {
  const license = await loadLicense(db, joinCode);
  if (!license) return { ok: false, reason: 'NO_CODE', error: '등록 코드를 찾을 수 없어요. 학원에서 받은 코드를 다시 확인해 주세요.' };
  if (!num(license.enabled, 1)) return { ok: false, reason: 'DISABLED', error: '지금은 쓸 수 없는 등록 코드예요. 학원에 문의해 주세요.' };
  const ends = endOfPeriod(license, now);
  if (ends && new Date(ends).getTime() <= now.getTime()) {
    return { ok: false, reason: 'EXPIRED', error: '이 등록 코드는 기간이 끝났어요. 학원에 문의해 주세요.' };
  }
  if (num(license.seats_used) >= num(license.seats)) {
    return { ok: false, reason: 'NO_SEAT', error: '이 등록 코드는 인원이 다 찼어요. 학원에 문의해 주세요.' };
  }
  await db.prepare('UPDATE licenses SET seats_used = seats_used + 1 WHERE id = ?').bind(license.id).run();
  return {
    ok: true, license,
    // 학생에게 복사되는 몫. 이 순간부터 이 학생의 기간이 시작된다.
    grant: {
      licenseId: license.id, orgName: license.org_name || '',
      maxUses: num(license.max_uses, UNLIMITED),
      expiresAt: endOfPeriod(license, now),
    },
  };
}

// 등록 코드 없이 온 학생. 가입은 되고 사용은 잠긴다 — 0회는 무제한이 아니라 남은 횟수 없음이다.
// 대표님이 관리 화면에서 부여하면 그때 열린다.
export function emptyGrant() {
  return { licenseId: null, orgName: '', maxUses: 0, expiresAt: '' };
}

// 자리를 가져갔는데 가입이 실패하면 되돌린다. 안 그러면 산 석이 조용히 사라진다.
export async function releaseSeat(db, licenseId) {
  if (!licenseId) return { ok: false };
  await db.prepare('UPDATE licenses SET seats_used = MAX(0, seats_used - 1) WHERE id = ?').bind(licenseId).run();
  return { ok: true };
}

// 학생이 지금 보고서를 만들 수 있는가. 이유를 학생이 읽을 말로 돌려준다.
export function checkEntitlement(student, now = new Date()) {
  if (!student) return { ok: false, reason: 'NO_STUDENT', error: '그 코드로 만든 기록이 없어요.' };
  if (!num(student.enabled, 1)) return { ok: false, reason: 'DISABLED', error: '지금은 쓸 수 없는 코드예요. 학원에 문의해 주세요.', expiresAt: clean(student.expires_at, 40), maxUses: num(student.max_uses, UNLIMITED), used: num(student.used_count) };
  const expires = clean(student.expires_at, 40);
  if (expires) {
    const until = new Date(expires);
    if (!Number.isNaN(until.getTime()) && until.getTime() <= now.getTime()) {
      return { ok: false, reason: 'EXPIRED', error: '이용 기간이 끝났어요. 학원에 문의해 주세요.', expiresAt: expires };
    }
  }
  const max = num(student.max_uses, UNLIMITED);
  const used = Math.max(0, num(student.used_count));
  // 무제한은 -1이고 0은 '남은 횟수 없음'이다. 처음에는 0을 무제한으로 뒀는데, 그러면 관리자가 횟수를 빼서
  // 0으로 만든 학생이 무제한이 되어 버렸다 — 막으려는 조작이 정반대로 동작했다.
  if (max >= 0 && used >= max) {
    // 한 번도 못 받은 학생에게 '0회를 모두 썼어요'라고 하면 틀린 말이다. 쓴 적이 없으면 아직 못 받은 것이다.
    const never = max === 0 && used === 0;
    // 막힌 학생에게도 언제까지인지는 보여 준다. 충전하면 바로 쓸 수 있는지 판단할 재료다.
    return {
      ok: false,
      reason: never ? 'NO_GRANT' : 'NO_USES',
      error: never
        ? '아직 보고서를 만들 수 있는 권한이 없어요. 결제한 곳에 내 학생 코드를 알려 주면 열립니다.'
        : `보고서 ${max}회를 모두 썼어요. 학원에 문의해 주세요.`,
      remaining: 0, maxUses: max, used, expiresAt: expires || '',
    };
  }
  return { ok: true, remaining: max > 0 ? max - used : null, maxUses: max, used, expiresAt: expires || '' };
}

// 한 과제는 한 번이다. 설계서와 최종본은 같은 보고서이므로 두 번 세지 않는다.
export async function spendUse(db, code, { charge = true } = {}) {
  const student = clean(code, 40).toLowerCase();
  if (!student) return { ok: false };
  if (!charge) return { ok: true, charged: false };
  await db.prepare('UPDATE students SET used_count = COALESCE(used_count, 0) + 1 WHERE code = ?').bind(student).run();
  return { ok: true, charged: true };
}

// 관리 화면이 읽는 목록. 이름으로 찾는 것은 오직 여기, 관리자 열쇠 뒤에서만 된다.
export async function listStudents(db, { q = "", limit = 50, offset = 0 } = {}) {
  const term = `%${clean(q, 40)}%`;
  const rows = await db.prepare(`
    SELECT code, serial, name, school_name, entered_grade, entered_year, phone_tail, org_name, track, major,
           max_uses, used_count, expires_at, enabled, created_at
    FROM students
    WHERE (? = '%%' OR name LIKE ? OR code LIKE ? OR school_name LIKE ? OR org_name LIKE ? OR phone_tail LIKE ?)
    ORDER BY serial DESC LIMIT ? OFFSET ?
  `).bind(term, term, term, term, term, term, Math.min(200, Math.max(1, num(limit, 50))), Math.max(0, num(offset))).all();
  return rows?.results || [];
}

export async function listLicenses(db, { limit = 50 } = {}) {
  const rows = await db.prepare(`
    SELECT id, join_code, kind, org_name, plan_name, seats, seats_used, max_uses, period_days, expires_at,
           amount_krw, paid_at, memo, enabled, created_at
    FROM licenses ORDER BY id DESC LIMIT ?
  `).bind(Math.min(200, Math.max(1, num(limit, 50)))).all();
  return rows?.results || [];
}

// 이용권 자체를 멈춘다. 이미 가입한 학생은 각자 자기 몫을 그대로 들고 있다 — 학원이 환불을 받아도
// 학생이 이미 쓴 것을 빼앗지는 않는다. 학생을 멈추려면 학생을 멈춘다.
export async function adjustLicense(db, joinCode, change = {}) {
  const license = await loadLicense(db, joinCode);
  if (!license) return { ok: false, error: '등록 코드를 찾을 수 없어요.' };
  const seats = change.addSeats ? Math.max(num(license.seats_used), num(license.seats) + num(change.addSeats)) : num(license.seats);
  const enabled = change.enabled === undefined ? num(license.enabled, 1) : (change.enabled ? 1 : 0);
  await db.prepare('UPDATE licenses SET seats = ?, enabled = ? WHERE id = ?').bind(seats, enabled, license.id).run();
  return { ok: true, seats, seatsUsed: num(license.seats_used), enabled: Boolean(enabled) };
}

// 대표님의 후속 조치: 충전, 연장, 정지, 해제. 배포 없이.
export async function adjustStudent(db, code, change = {}) {
  const student = clean(code, 40).toLowerCase();
  if (!student) return { ok: false };
  const row = await db.prepare('SELECT * FROM students WHERE code = ?').bind(student).first();
  if (!row) return { ok: false, error: '그 코드로 만든 기록이 없어요.' };
  const addUses = num(change.addUses);
  const extendDays = num(change.extendDays);
  const current = num(row.max_uses, UNLIMITED);
  const maxUses = addUses
    ? Math.max(0, (current < 0 ? num(row.used_count) : current) + addUses)
    : (change.unlimited ? UNLIMITED : current);
  let expires = clean(row.expires_at, 40);
  if (extendDays) {
    // 이미 끝난 이용권을 연장하면 오늘부터 다시 센다. 지나간 날을 연장해 봐야 여전히 끝나 있다.
    const from = expires && new Date(expires).getTime() > Date.now() ? new Date(expires) : new Date();
    expires = new Date(from.getTime() + extendDays * 86400000).toISOString();
  }
  const enabled = change.enabled === undefined ? num(row.enabled, 1) : (change.enabled ? 1 : 0);
  await db.prepare('UPDATE students SET max_uses = ?, expires_at = ?, enabled = ? WHERE code = ?')
    .bind(maxUses, expires || null, enabled, student).run();
  return { ok: true, maxUses, expiresAt: expires || '', enabled: Boolean(enabled), used: num(row.used_count) };
}
