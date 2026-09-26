// **전에 올린 생활기록부를 이어받는가.** ₩0 — GPT 는 가짜 답으로 바꾼다.
//
// 지금까지 시험은 늘 반듯한 숫자로만 했다(조건 A 3·4·5). 그런데 실제 학생은 「몰라요」를 적고,
// 칸을 비우고, 「25도」처럼 단위를 붙이고, 99999 를 넣는다. 그때 보고서가
//   ① 막히는가(막아야 하는 것은 막아야 한다)
//   ② 그 줄만 버리고 나머지로 쓰는가
//   ③ 아니면 NaN·Infinity·undefined 가 보고서에 박히는가
// 를 확인한다. ③ 은 학생이 돈을 내고 받은 보고서에 「평균 NaN」이 적히는 일이다.
//
//   node public/keyword-engine/build/test_weird_student_data_v1.mjs [--show]
import { copyFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/korea/univ-search';
const SITE = `${ROOT}/public/keyword-engine`;
const SEED = 'https://univ-search.pages.dev/keyword-engine/seed';
const SHOW = process.argv.includes('--show');

// ── 씨앗과 GPT 를 가짜로 바꾼다(전수 검사기와 같은 방식) ─────────────────────────
const seedCache = new Map();
let lastPrompt = '';
let calls = 0;
function fake(schema, key = '') {
  if (!schema || typeof schema !== 'object') return '';
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (schema.anyOf) return fake(schema.anyOf.find((one) => one.type !== 'null') || schema.anyOf[0], key);
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  if (type === 'object') {
    const out = {};
    for (const [name, sub] of Object.entries(schema.properties || {})) out[name] = fake(sub, name);
    return out;
  }
  if (type === 'array') {
    const n = Math.min(Math.max(schema.minItems || 1, key === 'conditions' ? 2 : 1), schema.maxItems || 9);
    return Array.from({ length: n }, (_, i) => (schema.items?.type === 'string' && key === 'conditions' ? `조건 ${'ABCDEFGH'[i]}` : fake(schema.items, key)));
  }
  if (type === 'integer' || type === 'number') {
    const want = key === 'trials' ? 3 : 2;
    return Math.min(Math.max(want, schema.minimum ?? want), schema.maximum ?? want);
  }
  if (type === 'boolean') return false;
  const text = '검사용 문장입니다.';
  return text.repeat(Math.max(1, Math.ceil((schema.minLength || 0) / text.length)));
}
const sectionTitles = (prompt) => {
  const lines = String(prompt).split('\n');
  let best = []; let run = [];
  for (const line of lines) {
    const m = /^\s*(\d+)\.\s+(.+?)\s*$/.exec(line);
    if (m && (run.length === 0 ? Number(m[1]) === 1 : Number(m[1]) === run.length + 1)) run.push(m[2].trim());
    else { if (run.length > best.length) best = run; run = m && Number(m[1]) === 1 ? [m[2].trim()] : []; }
  }
  return run.length > best.length ? run : best;
};
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.startsWith(SEED)) {
    const file = decodeURIComponent(url.slice(SEED.length + 1));
    if (!seedCache.has(file)) {
      try { seedCache.set(file, readFileSync(`${SITE}/seed/${file}`)); } catch { seedCache.set(file, null); }
    }
    const body = seedCache.get(file);
    return body ? new Response(body, { headers: { 'Content-Type': 'application/json' } }) : new Response('', { status: 404 });
  }
  if (url === 'https://api.openai.com/v1/responses') {
    const body = JSON.parse(init?.body || (await input.text()));
    lastPrompt = typeof body.input === 'string' ? body.input : JSON.stringify(body.input);
    calls += 1;
    const out = fake(body.text?.format?.schema);
    const titles = sectionTitles(lastPrompt);
    if (titles.length) out.sections = titles.map((title) => ({ title, body: `${title} 검사용 본문입니다.` }));
    out.reportTitle = '검사용 보고서 제목입니다';
    return new Response(JSON.stringify({ status: 'completed', model: 'gpt-5',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(out) }] }],
      usage: { input_tokens: 0, output_tokens: 0 } }), { status: 200 });
  }
  return new Response('', { status: 404 });
};

const TEMP = `${ROOT}/admission_worker_skeleton/.worker_weird.mjs`;
await copyFile(`${ROOT}/admission_worker_skeleton/worker.js`, TEMP);
let worker;
try { worker = (await import(`file:///${TEMP}`)).default; } finally { await rm(TEMP, { force: true }); }
const intake = createRequire(import.meta.url)(`${SITE}/assets/js/simple_live_intake_v1.js`);
const env = { OPENAI_API_KEY: 'test-stub', OPENAI_MODEL: 'gpt-5', ENGINE_MODE: 'production', ALLOW_STUB: 'false', SEED_BASE_URL: SEED };
console.error = () => {};
console.warn = () => {};
import assert from 'node:assert/strict';
const { analysisSchema, sanitizeAnalysis } = await import(`file:///${ROOT}/admission_worker_skeleton/upload_analysis_v1.mjs`);

let passed = 0;
const check = (ok, label, detail = '') => { assert.equal(ok, true, `${label} -> ${detail}`); console.log(`PASS ${label}`); passed += 1; };

// ── ① 생활기록부에서 「이미 한 것」을 과목별로 받는 칸이 있는가 ─────────────────────
const schema = analysisSchema();
const record = schema.record;
check(Boolean(record.properties.pastUnits), '생활기록부 칸에 pastUnits 가 있다');
check(record.required.includes('pastUnits'), 'pastUnits 가 required 에 들어 있다 — OpenAI 는 빠진 칸이 있으면 400 을 낸다');
const item = record.properties.pastUnits.items;
check(item.additionalProperties === false, 'pastUnits 한 줄은 정해진 칸만 받는다');
check(['subject', 'topic', 'grade'].every((key) => item.required.includes(key)), 'pastUnits 는 과목·주제·학년을 함께 받는다');

// ── ② 다듬을 때 들고 가는가. 사람 이름은 지우고, 주제가 빈 줄은 버린다 ─────────────
const cleaned = sanitizeAnalysis({ docType: 'record', level: '고1 수준',
  record: { activitySummary: '김민수 학생은 광합성을 다뤘다.', repeatedInterests: ['광합성'], strongSides: [], thinSides: [],
    pastUnits: [
      { subject: '통합과학1', topic: '생명 시스템과 세포', grade: '고1' },
      { subject: '통합과학1', topic: '', grade: '고1' },
    ] } });
check(cleaned.record.pastUnits.length === 1, '주제가 빈 줄은 버린다', String(cleaned.record.pastUnits.length));
check(cleaned.record.pastUnits[0].topic === '생명 시스템과 세포', '주제를 그대로 들고 간다');
check(!/김민수/.test(JSON.stringify(cleaned)), '사람 이름은 남기지 않는다');

// ── ③ 워커가 그 표를 「이미 한 단원」으로 읽고 다른 단원을 주는가 ────────────────────
const TASK = ['통합과학 수행평가 안내문', '과제: 자유 주제 탐구 보고서', '관심 있는 주제를 스스로 정해 탐구하고 보고서를 작성한다.'].join('\n');
async function unitFor(priorWork) {
  const body = {
    schoolName: '시험용 고등학교', grade: '고2', subject: '통합과학1', subjectGroup: '과학',
    taskDescription: TASK, taskName: '자유 주제 탐구 보고서', taskType: '탐구보고서',
    career: 'natural', track: 'natural', major: '화학공학과',
    keyword: '', selectedKeyword: '', selectedConcept: '',
    reportStage: 'complete', interpretationConfirmed: true, studentCode: 'sc-study0001-6dhy',
    priorWork,
    liveInputCandidate: intake.buildCandidateFromValues({ school: '시험용 고등학교', grade: '고2', subject: '통합과학1',
      subject_group: '과학', task_description: TASK, selected_subject: '통합과학1', selected_subject_group: '과학' }),
  };
  const res = await worker.fetch(new Request('http://localhost/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env, { waitUntil() {} });
  const data = await res.json().catch(() => ({}));
  return data?.resolved?.reportConcept || '';
}
const plain = await unitFor(null);
check(Boolean(plain), '주제 없는 과제도 단원이 정해진다', plain);
const done = { docType: 'record', docTypeReason: '', subjectGuess: '통합과학', gradeGuess: '고1', level: '고1 수준',
  report: null, reportLines: [],
  record: { activitySummary: '', repeatedInterests: [], strongSides: [], thinSides: [],
    pastUnits: [{ subject: '통합과학1', topic: `${plain}과 세포의 물질 출입`, grade: '고1' }] } };
const next = await unitFor(done);
check(next !== plain, '생활기록부가 이미 했다고 말한 단원은 다시 주지 않는다', `${plain} → ${next}`);
check(Boolean(next), '피하면서도 단원은 비우지 않는다', next);

// ── ④ 저장이 학생과 이어지는가(원본을 읽어 못 박는다) ─────────────────────────────
const workerSrc = readFileSync(`${ROOT}/admission_worker_skeleton/worker.js`, 'utf8');
check(/CREATE TABLE IF NOT EXISTS student_uploads[\s\S]{0,200}student_code TEXT/.test(workerSrc),
  '올린 자료 표에 학생 부호 칸이 있다');
check(/INSERT INTO student_uploads \(student_code,/.test(workerSrc), '저장할 때 학생 부호를 함께 적는다');
check(/SELECT analysis FROM student_uploads[\s\S]{0,120}WHERE student_code = \?/.test(workerSrc),
  '학생 부호로 다시 읽는 길이 있다 — 없으면 보고서마다 다시 올려야 한다');
const bridgeSrc = readFileSync(`${SITE}/assets/js/mini_worker_generate_bridge_v32.js`, 'utf8');
check(/studentCode: req\.studentCode/.test(bridgeSrc), '화면이 올릴 때 학생 부호를 함께 보낸다');

console.log(`\n전에 올린 생활기록부 이어받기: ${passed}/${passed} 통과`);
