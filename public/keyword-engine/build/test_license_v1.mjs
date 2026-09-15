// 이용권 — 누가 샀고, 몇 명이, 몇 번, 언제까지. 돈이 걸린 계산이라 경계를 하나씩 민다.
import assert from "node:assert/strict";
import {
  adjustStudent, checkEntitlement, claimSeat, endOfPeriod, issueLicense,
  loadLicense, parseJoinCode, releaseSeat, spendUse,
} from "../../../admission_worker_skeleton/license_v1.mjs";
import { enteredYearFrom, gradeNow, issueStudentCode, loadStudent } from "../../../admission_worker_skeleton/student_portfolio_v1.mjs";

let passed = 0;
const check = (ok, label, detail = "") => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed++; };
if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: (await import("node:crypto")).webcrypto });

function makeDb() {
  const licenses = [];
  const students = new Map();
  let nextId = 1;
  const run = (sql, args) => {
    const text = sql.replace(/\s+/g, " ").trim();
    if (/^(CREATE|ALTER)/i.test(text)) return {};
    if (text.startsWith("INSERT INTO licenses")) {
      const keys = ["join_code", "kind", "org_name", "plan_name", "seats", "max_uses", "period_days", "expires_at", "amount_krw", "paid_at", "memo"];
      licenses.push(Object.fromEntries([["id", nextId++], ["seats_used", 0], ["enabled", 1], ...keys.map((key, at) => [key, args[at]])]));
      return {};
    }
    if (text.startsWith("SELECT * FROM licenses")) return { first: licenses.find((row) => row.join_code === args[0]) || null };
    if (text.startsWith("UPDATE licenses SET seats_used = seats_used + 1")) {
      const row = licenses.find((item) => item.id === args[0]);
      if (row) row.seats_used += 1;
      return {};
    }
    if (text.startsWith("UPDATE licenses SET seats_used = MAX(0, seats_used - 1)")) {
      const row = licenses.find((item) => item.id === args[0]);
      if (row) row.seats_used = Math.max(0, row.seats_used - 1);
      return {};
    }
    if (text.startsWith("SELECT MAX(serial)")) return { first: { last: [...students.values()].reduce((a, s) => Math.max(a, s.serial), 0) } };
    if (text.startsWith("INSERT INTO students")) {
      const keys = ["code", "serial", "name", "school_name", "entered_grade", "entered_year", "track", "major",
        "license_id", "org_name", "max_uses", "expires_at"];
      const row = Object.fromEntries([["used_count", 0], ["enabled", 1], ...keys.map((key, at) => [key, args[at]])]);
      students.set(row.code, row);
      return {};
    }
    if (text.startsWith("SELECT * FROM students")) return { first: students.get(args[0]) || null };
    if (text.startsWith("UPDATE students SET used_count")) {
      const row = students.get(args[0]);
      if (row) row.used_count = (row.used_count || 0) + 1;
      return {};
    }
    if (text.startsWith("UPDATE students SET max_uses")) {
      const [max_uses, expires_at, enabled, code] = args;
      const row = students.get(code);
      if (row) Object.assign(row, { max_uses, expires_at, enabled });
      return {};
    }
    if (text.startsWith("UPDATE students SET name")) return {};
    throw new Error(`unexpected SQL: ${text.slice(0, 60)}`);
  };
  return {
    licenses, students,
    prepare(sql) {
      let args = [];
      const api = {
        bind(...values) { args = values; return api; },
        async run() { return run(sql, args); },
        async first() { return run(sql, args).first ?? null; },
        async all() { return run(sql, args); },
      };
      return api;
    },
  };
}

// L1: 이용권은 D1에 있다. 코드를 하나 팔 때마다 배포하던 것을 없앤 것이 이 기능의 전부다.
{
  const db = makeDb();
  const org = await issueLicense(db, { orgName: "미래학원", planName: "3개월 10회", seats: 30, maxUses: 10, periodDays: 90, amountKrw: 900000, paidAt: "2026-09-15" });
  check(org.ok && /^ac-[a-z2-9]{6}$/.test(org.joinCode), "L1 an academy licence comes with a join code", org.joinCode);
  check(org.kind === "org" && org.seats === 30, "L1 30석", `${org.kind}/${org.seats}`);
  const one = await issueLicense(db, { kind: "personal", seats: 1, maxUses: 1, periodDays: 30, amountKrw: 9900 });
  check(one.ok && one.kind === "personal" && one.orgName === "개인", "L1 개인도 같은 방식으로 산다", one.orgName);
  check((await issueLicense(db, { seats: 30 })).ok === false, "L1 an academy licence without a name is refused");
  check(parseJoinCode("AC-7K2PQM") !== null && parseJoinCode("ac-7k2p") === null, "L1 the join code is read as typed, and only in its own shape");
  check((await loadLicense(db, org.joinCode)).org_name === "미래학원", "L1 and reads back");
}

// L2: 기간은 두 가지로 판다. 둘 다 걸려 있으면 이른 쪽이 이긴다 — 산 사람에게 유리한 쪽이 아니라 정확한 쪽.
{
  const at = new Date("2026-09-15T00:00:00Z");
  check(endOfPeriod({ period_days: 90 }, at).startsWith("2026-12-14"), "L2 90일은 가입일부터 센다", endOfPeriod({ period_days: 90 }, at));
  check(endOfPeriod({ expires_at: "2026-11-30T23:59:59Z" }, at).startsWith("2026-11-30"), "L2 고정 만료일도 판다");
  check(endOfPeriod({ period_days: 90, expires_at: "2026-10-31T00:00:00Z" }, at).startsWith("2026-10-31"),
    "L2 둘 다면 이른 쪽", endOfPeriod({ period_days: 90, expires_at: "2026-10-31T00:00:00Z" }, at));
  check(endOfPeriod({}, at) === "", "L2 아무것도 없으면 무기한");
  check(endOfPeriod({ expires_at: "아무거나" }, at) === "", "L2 날짜가 아닌 값은 기간이 아니다");
}

// L3: 한 석씩 나간다. 자리가 없으면 가입 전에 막는다 — AI를 부르기 전에.
{
  const db = makeDb();
  const { joinCode } = await issueLicense(db, { orgName: "미래학원", seats: 2, maxUses: 5, periodDays: 90 });
  const first = await claimSeat(db, joinCode);
  check(first.ok && first.grant.maxUses === 5 && first.grant.orgName === "미래학원", "L3 a seat carries the plan to the student");
  check(first.grant.expiresAt !== "", "L3 and starts that student's clock on the day they join");
  await claimSeat(db, joinCode);
  const third = await claimSeat(db, joinCode);
  check(third.ok === false && third.reason === "NO_SEAT", "L3 2석짜리는 세 번째를 막는다", JSON.stringify(third));
  check(third.error.includes("인원이 다 찼어요"), "L3 with a sentence a student can act on", third.error);
  check((await claimSeat(db, "ac-zzzzzz")).reason === "NO_CODE", "L3 an unknown join code claims nothing");
  db.licenses[0].enabled = 0;
  check((await claimSeat(db, joinCode)).reason === "DISABLED", "L3 a stopped licence claims nothing");
  db.licenses[0].enabled = 1;
  db.licenses[0].expires_at = "2020-01-01T00:00:00Z";
  check((await claimSeat(db, joinCode)).reason === "EXPIRED", "L3 nor an expired one");
}

// L4: 가입이 실패하면 자리를 돌려놓는다. 산 석이 조용히 사라지면 그건 우리가 돈을 먹은 것이다.
{
  const db = makeDb();
  const { joinCode } = await issueLicense(db, { orgName: "미래학원", seats: 1, maxUses: 5 });
  const seat = await claimSeat(db, joinCode);
  check(db.licenses[0].seats_used === 1, "L4 claiming takes the seat");
  await releaseSeat(db, seat.grant.licenseId);
  check(db.licenses[0].seats_used === 0, "L4 and a failed signup gives it back");
  await releaseSeat(db, seat.grant.licenseId);
  check(db.licenses[0].seats_used === 0, "L4 twice over does not go negative");
}

// L5: 학생이 지금 쓸 수 있는가. 0은 무제한이다 — 판 적 없는 값이 학생을 막아서는 안 된다.
{
  const now = new Date("2026-09-15T00:00:00Z");
  check(checkEntitlement({ max_uses: 10, used_count: 3, enabled: 1 }, now).remaining === 7, "L5 남은 횟수를 센다");
  check(checkEntitlement({ max_uses: 0, used_count: 999, enabled: 1 }, now).ok === true, "L5 0회는 무제한이다");
  check(checkEntitlement({ max_uses: 0, used_count: 999, enabled: 1 }, now).remaining === null, "L5 무제한은 남은 수가 숫자가 아니다");
  const spent = checkEntitlement({ max_uses: 5, used_count: 5, enabled: 1 }, now);
  check(spent.ok === false && spent.reason === "NO_USES" && spent.error.includes("5회를 모두 썼어요"), "L5 다 쓰면 막고 몇 회였는지 말한다", spent.error);
  const gone = checkEntitlement({ max_uses: 10, used_count: 0, enabled: 1, expires_at: "2026-09-01T00:00:00Z" }, now);
  check(gone.ok === false && gone.reason === "EXPIRED", "L5 기간이 끝나면 횟수가 남아도 막는다");
  check(checkEntitlement({ max_uses: 10, used_count: 0, enabled: 0 }, now).reason === "DISABLED", "L5 정지된 코드는 막는다");
  check(checkEntitlement(null, now).reason === "NO_STUDENT", "L5 없는 학생은 이용권도 없다");
  check(checkEntitlement({ max_uses: 10, used_count: 0, enabled: 1, expires_at: "2027-01-01T00:00:00Z" }, now).ok === true,
    "L5 기간이 남았으면 통과");
}

// L6: 한 과제는 한 번이다. 설계서와 최종본을 두 번 세면 5회권이 2.5편이 된다.
{
  const db = makeDb();
  const { joinCode } = await issueLicense(db, { orgName: "미래학원", seats: 5, maxUses: 3 });
  const seat = await claimSeat(db, joinCode);
  const { code } = await issueStudentCode(db, { name: "권민규", school: "보인고등학교", grade: "고2", grant: seat.grant });
  check((await loadStudent(db, code)).max_uses === 3, "L6 the student carries the plan, not the licence");
  await spendUse(db, code);
  check((await loadStudent(db, code)).used_count === 1, "L6 a new task costs one");
  await spendUse(db, code, { charge: false });
  check((await loadStudent(db, code)).used_count === 1, "L6 the final of the same task costs nothing");
  await spendUse(db, code);
  await spendUse(db, code);
  check(checkEntitlement(await loadStudent(db, code)).ok === false, "L6 three tasks use up a 3회권");
}

// L7: 대표님의 후속 조치 — 충전, 연장, 정지, 해제. 배포 없이.
{
  const db = makeDb();
  const { joinCode } = await issueLicense(db, { orgName: "미래학원", seats: 5, maxUses: 2, periodDays: 30 });
  const seat = await claimSeat(db, joinCode);
  const { code } = await issueStudentCode(db, { name: "권민규", grade: "고2", grant: seat.grant });
  await spendUse(db, code); await spendUse(db, code);
  check(checkEntitlement(await loadStudent(db, code)).ok === false, "L7 다 썼다");
  const topped = await adjustStudent(db, code, { addUses: 5 });
  check(topped.ok && topped.maxUses === 7, "L7 충전하면 이어서 쓴다 — 쓴 횟수를 지우지 않는다", String(topped.maxUses));
  check(checkEntitlement(await loadStudent(db, code)).remaining === 5, "L7 남은 5회");
  const stopped = await adjustStudent(db, code, { enabled: false });
  check(stopped.enabled === false && checkEntitlement(await loadStudent(db, code)).reason === "DISABLED", "L7 정지된다");
  await adjustStudent(db, code, { enabled: true });
  check(checkEntitlement(await loadStudent(db, code)).ok === true, "L7 다시 열린다");
  // 이미 끝난 이용권을 30일 연장하면 오늘부터 센다. 지나간 날에 더해 봐야 여전히 끝나 있다.
  await adjustStudent(db, code, { enabled: true });
  db.students.get(code).expires_at = "2020-01-01T00:00:00Z";
  const extended = await adjustStudent(db, code, { extendDays: 30 });
  check(new Date(extended.expiresAt).getTime() > Date.now(), "L7 끝난 이용권을 연장하면 오늘부터 다시 센다", extended.expiresAt);
  check((await adjustStudent(db, "sc-study9999-zzzz", { addUses: 1 })).ok === false, "L7 없는 학생은 충전되지 않는다");
}

// L8: 학년은 해마다 바뀐다. 가입할 때 적은 '고1'이 3년 뒤에도 고1이면 안 된다.
{
  check(gradeNow(2026, new Date("2026-09-15")) === "고1", "L8 입학한 해에는 고1");
  check(gradeNow(2026, new Date("2027-09-15")) === "고2", "L8 한 해 뒤 고2");
  check(gradeNow(2026, new Date("2029-01-15")) === "고3", "L8 1·2월은 아직 지난 학년 — 3월에 올라간다", gradeNow(2026, new Date("2029-01-15")));
  check(gradeNow(2026, new Date("2029-05-01")) === "졸업", "L8 그 뒤는 졸업");
  check(gradeNow("", new Date()) === "" && gradeNow(1900, new Date()) === "", "L8 입학연도가 없으면 아무 말도 안 한다");
  check(enteredYearFrom("고2", new Date("2026-09-15")) === 2025, "L8 고2가 지금 가입하면 작년 입학");
  check(enteredYearFrom("고1", new Date("2027-01-10")) === 2026, "L8 1월의 고1은 작년에 입학한 것");
  check(enteredYearFrom("", new Date()) === 0, "L8 학년을 안 고르면 입학연도도 없다");
}

console.log(`PASS license: ${passed}/${passed}`);
