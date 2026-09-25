// **지금 엔진으로 보고서를 만들어 바로 읽힌다.** 틀의 흠을 찾는 쓸이.
//
// 왜 새로 만드나. 보관된 273장은 9월 17~24일에 만든 것이고, 그동안 엔진을 거의 매일 고쳤다.
// 옛 보고서를 읽히면 **이미 고친 흠**이 나온다 — 돈을 버리는 것보다 나쁜 것은, 이미 고친 것을
// 흠으로 보고 지금 엔진을 잘못 판단하는 것이다(사용자 지적 2026-09-24).
// 지금 엔진이 어떤지 알려면 **지금 엔진으로 만든 것**을 읽혀야 한다.
//
// 과제는 실제 수행평가 기록에서 뽑는다(assessment_tasks.v1.jsonl). 지어낸 과제로는
// 지어낸 흠만 나온다. 과목과 모으는 방식을 골고루 뽑아 **한 칸에 세 장 이상** 되게 한다 —
// 그래야 겹침으로 틀 흠을 가려낼 수 있다.
//
//   node tools/sweep_reports_for_defects.mjs --per 3 --out <폴더>
//   --per N      한 칸(과목군 × 모으는 방식)마다 몇 장 (기본 3)
//   --stage final | draft | both        (기본 final)
//   --parallel N 동시에 몇 개 (기본 4). 워커가 견디는 만큼만.
//   --dry        만들지 않고 뽑은 과제만 보여 준다 (₩0)
//
// 값: 최종 보고서 한 장 약 ₩96~162, 설계서 약 ₩130. 읽히기는 장당 약 ₩165.
// 학생 코드는 SC 환경 변수로 준다 — 횟수 무제한인 시험용 계정을 쓴다.
import { execSync } from 'node:child_process';
import https from 'node:https';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'C:/Users/korea/univ-search';
const arg = (name, fallback) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
const PER = Number(arg('--per', '3'));
const STAGE = arg('--stage', 'final');
const PARALLEL = Math.max(1, Number(arg('--parallel', '4')));
const OUT = arg('--out', '');
const DRY = process.argv.includes('--dry');
const WORKER = 'https://curly-base-a1a9.koreapoorboy.workers.dev';
const SC = process.env.SC || '';
const KEY = process.env.OPENAI_API_KEY;
if (!DRY && !SC) { console.error('SC 환경 변수에 시험용 학생 코드를 주세요.'); process.exit(1); }
if (!DRY && !KEY) { console.error('OPENAI_API_KEY 가 없습니다.'); process.exit(1); }

const { siteSubject } = await import(`file:///${ROOT}/tools/site_subject.mjs`);
const { resolveCollectionKind, COLLECTION } = await import(`file:///${ROOT}/admission_worker_skeleton/report_stages_v1.mjs`);

// **갈래 이름은 화면 목록에서 가져온다.** 과제 기록의 갈래 이름(「공학·정보」)과 화면이 쓰는
// 이름(「정보」)이 달라서 워커가 INVENTORY_GROUP_MISMATCH 로 400 을 주었다(2026-09-24).
// 목록은 손댈 수 없게 박아 둔 것이므로, 거기 적힌 이름을 그대로 써야 한다.
const inventory = await import(`file:///${ROOT}/admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs`);
const INVENTORY = JSON.parse(Buffer.from(inventory.IMMUTABLE_SUBJECT_INVENTORY_BASE64, 'base64').toString('utf8'));
const SITE_GROUP = new Map((INVENTORY.rows || INVENTORY.subjects || INVENTORY).map((one) => [one.subject_value, one.subject_group]));

// ── 과제 뽑기: 과목군 × 모으는 방식 칸마다 PER 장 ──────────
// --groups 로 갈래를 고를 수 있다. 국어·영어를 따로 재려고 붙였다(2026-09-25).
const GROUPS = (arg('--groups', '') || '과학,수학,정보').split(',').map((one) => one.trim()).filter(Boolean);
const KINDS = [COLLECTION.MEASUREMENT, COLLECTION.DATASET, COLLECTION.READING, COLLECTION.NONE];
const rows = readFileSync(`${ROOT}/public/keyword-engine/data/assessment/records/assessment_tasks.v1.jsonl`, 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);

const cells = new Map();
for (const task of rows) {
  const subject = siteSubject(task.subject_standard || task.subject_raw);
  const desc = String(task.raw_task_desc || '').trim();
  const name = String(task.raw_task_title || '').trim();
  if (!subject || desc.length < 60) continue;
  // 기록의 갈래가 아니라 **화면 목록의 갈래**를 쓴다.
  const group = SITE_GROUP.get(subject) || '';
  if (!GROUPS.includes(group)) continue;
  const kind = resolveCollectionKind({ subject, taskDescription: desc, taskName: name,
    taskType: (task.raw_method_labels || []).join(' ') });
  const key = `${group} · ${kind}`;
  const box = cells.get(key) || [];
  // 같은 과목이 한 칸을 다 차지하지 않게 한 과목에 한 장까지만.
  if (box.some((one) => one.subject === subject)) continue;
  if (box.length < PER) box.push({ group, kind, subject, name, desc,
    school: task.school_name, grade: `고${task.grade || 2}`, subjectGroup: group });
  cells.set(key, box);
}

const picked = [];
for (const key of [...cells.keys()].sort()) for (const one of cells.get(key)) picked.push(one);
console.log(`과제 ${rows.length}건에서 ${picked.length}장을 뽑았습니다 (칸마다 ${PER}장까지).`);
for (const key of [...cells.keys()].sort()) {
  console.log(`  ${key.padEnd(22)} ${cells.get(key).length}장 — ${cells.get(key).map((one) => one.subject).join(', ')}`);
}
if (DRY) { console.log('\n(--dry 이므로 만들지 않았습니다.)'); process.exit(0); }

// ── 보고서 만들기 ────────────────────────────────────────
const INV = 'subject-option-inventory-v2_73ed6bf7a284c7105f2fdf51e2c01feb0944d96253b4bd95b71011103ebd9767';
const won = (u) => Math.round(((u.input_tokens / 1e6) * 1.25 + (u.output_tokens / 1e6) * 10) * 1385);

// 재는 과제에는 값을 우리가 넣는다. **꺾이는 자료**를 쓴다 — 단조롭게 오르는 값만 주면
// 「높으면 빨라진다」 한 줄로 끝나고, 해석이 어긋나는 흠이 드러나지 않는다.
const VALUES = [['18.2', '17.6', '18.9'], ['9.4', '9.9', '9.1'], ['21.5', '22.4', '20.8'], ['13.0', '12.4', '13.6']];

function payload(one, stage) {
  const base = {
    liveInputCandidate: {
      candidate_version: 'PHASE6_LIVE_INPUT_CANDIDATE_SIMPLE_V3',
      raw_authority: { school: '시험용 고등학교', grade: one.grade, subject_group: one.subjectGroup,
        subject: one.subject, task_description: one.desc },
      selected_option_metadata: { subject_value: one.subject, subject_group: one.subjectGroup, inventory_version: INV },
      client_transport_metadata: { authority_class: 'UNTRUSTED_TRANSPORT_METADATA', client_capture_digest: null, client_observed_at: null },
    },
    schoolName: '시험용 고등학교', grade: one.grade, subject: one.subject, subjectGroup: one.subjectGroup,
    taskDescription: one.desc, taskName: one.name, taskType: '보고서',
    keyword: '', selectedKeyword: '', selectedConcept: '',
    track: '자연', major: '', interpretationConfirmed: true, studentCode: SC,
  };
  if (stage === 'draft') return { ...base, reportStage: 'experiment_draft' };
  if (one.kind !== COLLECTION.MEASUREMENT && one.kind !== COLLECTION.DATASET) {
    return { ...base, reportStage: 'complete' };
  }
  return { ...base, reportStage: 'experiment_final', collectionKind: one.kind,
    studentData: {
      measurementName: '측정값', unit: '초', scaleGuide: '',
      conditions: ['조건 1', '조건 2', '조건 3', '조건 4'].map((label, at) => ({
        label, values: VALUES[at], note: at === 2 ? '변화가 거의 없었다' : '' })),
      reason: '수업에서 배운 것을 직접 확인해 보고 싶었다',
      observations: '세 번째 조건에서 예상과 다르게 나와 놀랐다',
      reflection: '눈으로 판단하는 부분이 사람마다 다를 수 있다고 느꼈다',
      sources: [],
    } };
}

// **fetch 를 쓰지 않는다.** node 의 fetch 는 머리글을 5분 안에 못 받으면 스스로 끊는다
// (UND_ERR_HEADERS_TIMEOUT). 보고서 한 장이 4~5분 걸리고, 동시에 넷을 돌리면 그보다 길어진다.
// 2026-09-24 에 19번째에서 쓸이가 통째로 죽었다 — 만든 것까지 잃을 수 있었다.
// https 로 직접 부르고 제한을 15분으로 둔다.
function post(url, body, ms = 900000) {
  return new Promise((done, fail) => {
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request(url, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (piece) => { text += piece; });
      res.on('end', () => done({ status: res.statusCode, text }));
    });
    req.setTimeout(ms, () => { req.destroy(new Error(`${Math.round(ms / 1000)}초가 지났다`)); });
    req.on('error', fail);
    req.end(data);
  });
}

async function generate(one, stage) {
  const at = Date.now();
  // 한 장이 실패해도 쓸이는 계속 간다. 한 번 다시 해 본다 — 워커가 바빠 늦는 일이 있다.
  for (let tries = 1; tries <= 2; tries += 1) {
    try {
      const res = await post(`${WORKER}/generate`, payload(one, stage));
      const out = JSON.parse(res.text);
      if (!out.ok) return { ok: false, why: `${res.status} ${String(out.error || out.reason || '').slice(0, 60)}` };
      // **본문을 그대로 들고 있는다.** 읽힐 때 D1 을 다시 안 거친다 —
      // 번호 36개를 한 줄에 넣어 물으니 명령이 너무 길어 막혔다(2026-09-24).
      return { ok: true, id: out.reportId, won: won(out.usage || {}), secs: Math.round((Date.now() - at) / 1000),
        title: out.result?.reportTitle || '', stage: out.result?.reportStage || stage,
        body: String(out.result?.report || ''), task: one.desc,
        conditions: (payload(one, stage).studentData?.conditions || []).map((row) => `  · ${row.label} = ${row.values.join(', ')}${row.note ? ` (메모: ${row.note})` : ''}`) };
    } catch (error) {
      if (tries === 2) return { ok: false, why: String(error?.message || error).slice(0, 70) };
    }
  }
  return { ok: false, why: '알 수 없음' };
}

const stages = STAGE === 'both' ? ['final', 'draft'] : [STAGE];
const jobs = [];
for (const stage of stages) for (const one of picked) jobs.push({ one, stage });
console.log(`\n${jobs.length}개를 만듭니다 (동시에 ${PARALLEL}개).`);

const made = [];
let spent = 0;
let done = 0;
async function worker() {
  for (;;) {
    const job = jobs.shift();
    if (!job) return;
    const got = await generate(job.one, job.stage);
    done += 1;
    if (!got.ok) { console.log(`  ✗ ${job.one.subject} ${job.stage} — ${got.why}`); continue; }
    spent += got.won;
    made.push({ ...got, subject: job.one.subject, kind: job.one.kind, group: job.one.group });
    console.log(`  ${String(done).padStart(2)}/${done + jobs.length} ${job.one.subject.padEnd(10)} ${job.stage.padEnd(5)} ${got.id} · ${got.secs}초 · ₩${got.won}`);
    // 한 장 만들 때마다 적어 둔다. 쓸이가 죽어도 만든 것은 남는다.
    if (OUT) { mkdirSync(OUT, { recursive: true });
      writeFileSync(`${OUT}/sweep_made.json`, JSON.stringify({ at: new Date().toISOString(), won: spent, made }, null, 1), 'utf8'); }
  }
}
await Promise.all(Array.from({ length: PARALLEL }, worker));
console.log(`\n보고서 ${made.length}장 · 만드는 데 ₩${spent}`);
if (!made.length) process.exit(1);

if (OUT) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/sweep_made.json`, JSON.stringify({ at: new Date().toISOString(), won: spent, made }, null, 1), 'utf8');
}

// ── 바로 읽힌다 ──────────────────────────────────────────
console.log(`\n${'='.repeat(64)}\n이제 읽힙니다.\n`);
const madeFile = `${OUT || ROOT}/sweep_made.json`;
mkdirSync(OUT || ROOT, { recursive: true });
writeFileSync(madeFile, JSON.stringify({ at: new Date().toISOString(), won: spent, made }, null, 1), 'utf8');
execSync(`node tools/review_reports_open.mjs --made "${madeFile}"${OUT ? ` --out ${OUT}` : ''}`,
  { cwd: ROOT, stdio: 'inherit', env: process.env });
console.log(`\n만드는 데 ₩${spent} 썼습니다(읽히는 값은 위에 따로 적혀 있습니다).`);
