// **학생이 표에 이상한 값을 넣었을 때** 무슨 일이 나는지 본다. ₩0 — GPT 는 가짜 답으로 바꾼다.
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

const TASK = [
  '화학 수행평가 안내문',
  '주제: 온도에 따른 반응 속도 비교',
  '1) 온도를 달리하여 같은 반응이 끝나는 데 걸리는 시간을 측정한다.',
  '2) 온도가 반응 속도에 어떤 영향을 주는지 설명한다.',
].join('\n');

async function run(studentData) {
  calls = 0;
  lastPrompt = '';
  const body = {
    schoolName: '시험용 고등학교', grade: '고2', subject: '화학', subjectGroup: '과학',
    taskDescription: TASK, taskName: '온도에 따른 반응 속도 비교', taskType: '실험보고서',
    career: 'natural', track: 'natural', major: '화학공학과',
    keyword: '반응 속도', selectedKeyword: '온도와 반응 속도', selectedConcept: '화학 반응의 속도',
    reportStage: 'experiment_final', interpretationConfirmed: true, studentCode: 'sc-study0001-6dhy',
    liveInputCandidate: intake.buildCandidateFromValues({ school: '시험용 고등학교', grade: '고2', subject: '화학',
      subject_group: '과학', task_description: TASK, selected_subject: '화학', selected_subject_group: '과학' }),
    studentData,
  };
  const res = await worker.fetch(new Request('http://localhost/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env, { waitUntil() {} });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, calls, prompt: lastPrompt };
}

// 학생이 낼 수 있는 표들. 이름은 무엇이 이상한지를 말한다.
const CASES = [
  ['반듯한 표(견주는 기준)', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: [30, 31, 29] }, { label: '40도', values: [15, 16, 14] }] }],
  ['숫자 칸에 글자', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: ['몰라요', '안 했어요', '-'] }, { label: '40도', values: [15, 16, 14] }] }],
  ['모든 칸이 글자', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: ['몰라요', 'ㅇㅇ', '?'] }, { label: '40도', values: ['x', 'y', 'z'] }] }],
  ['표를 통째로 비움', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: ['', '', ''] }, { label: '40도', values: ['', '', ''] }] }],
  ['conditions 자체가 없음', { measurementName: '반응 시간', unit: 's' }],
  ['studentData 자체가 없음', null],
  ['단위를 붙여 적음', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: ['30초', '31초', '29초'] }, { label: '40도', values: ['15초', '16초', '14초'] }] }],
  ['터무니없는 숫자', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: [99999, 99999, 99999] }, { label: '40도', values: [0.0000001, 0, -5] }] }],
  ['모두 같은 값', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: [30, 30, 30] }, { label: '40도', values: [30, 30, 30] }] }],
  ['조건이 하나뿐', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: [30, 31, 29] }] }],
  ['한 조건에 값 하나', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: [30] }, { label: '40도', values: [15] }] }],
  ['소수점이 두 개', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: ['3.1.4', '30', '31'] }, { label: '40도', values: [15, 16, 14] }] }],
  ['천 단위 쉼표', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: ['1,200', '1,210', '1,190'] }, { label: '40도', values: [600, 610, 590] }] }],
  ['조건 이름이 없음', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '', values: [30, 31, 29] }, { label: '', values: [15, 16, 14] }] }],
  ['값이 숫자 아닌 자료형', { measurementName: '반응 시간', unit: 's',
    conditions: [{ label: '20도', values: [null, undefined, {}, [], true] }, { label: '40도', values: [15, 16, 14] }] }],
];

// 무엇이 나와야 맞는가. 「막음」은 **유료 호출 0번**으로 막아야 한다는 뜻이다.
const WANT = new Map([
  ['반듯한 표(견주는 기준)', '보고서'],
  ['숫자 칸에 글자', '막음'],
  ['모든 칸이 글자', '막음'],
  ['표를 통째로 비움', '막음'],
  ['conditions 자체가 없음', '막음'],
  ['studentData 자체가 없음', '막음'],
  ['단위를 붙여 적음', '보고서'],
  ['터무니없는 숫자', '보고서'],
  ['모두 같은 값', '보고서'],
  ['조건이 하나뿐', '막음'],
  ['한 조건에 값 하나', '보고서'],
  ['소수점이 두 개', '보고서'],
  ['천 단위 쉼표', '보고서'],
  ['조건 이름이 없음', '막음'],
  ['값이 숫자 아닌 자료형', '막음'],
]);
const BAD = /NaN|Infinity|undefined|null명|\[object Object\]/;
let broken = 0;
const rows = [];
for (const [name, studentData] of CASES) {
  let out;
  try { out = await run(studentData); } catch (error) { out = { status: 0, data: { ok: false, error: `던져진 오류: ${error?.message || error}` } }; }
  const r = out.data?.result || {};
  const text = `${JSON.stringify(r)} ${JSON.stringify(out.data?.filledTable || {})}`;
  const bad = BAD.exec(text);
  const table = out.data?.filledTable || r.filledTable || null;
  const state = out.status === 200 && out.data?.ok ? '보고서 나옴'
    : out.status === 422 ? '막음(보고서 과제 아님)'
    : out.status === 400 ? '막음(400)'
    : `실패 ${out.status}`;
  if (bad) broken += 1;
  // 기대와 다른가. 이것이 이 검사의 본체다.
  const got = out.status === 200 && out.data?.ok ? '보고서' : '막음';
  const want = WANT.get(name);
  const wrong = want && got !== want;
  if (wrong) broken += 1;
  // 막아야 하는 것은 **AI를 부르기 전에** 막아야 한다. 부른 뒤 막으면 돈은 이미 나갔다.
  const paid = want === '막음' && (out.calls || 0) > 0;
  if (paid) broken += 1;
  rows.push({ name, state, calls: out.calls || 0, bad: bad ? bad[0] : '', chars: String(r.report || '').length,
    error: out.data?.ok ? '' : String(out.data?.error || out.data?.message || '').slice(0, 120) });
  console.log(`${bad || wrong || paid ? '✗' : '○'} ${name.padEnd(18)} ${state.padEnd(22)} GPT ${out.calls || 0}번 · 글자 ${String(String(r.report || '').length).padStart(5)}${bad ? `  ← 보고서에 ${bad[0]} 가 들어 있다` : ''}${wrong ? `  ← ${want} 이 나와야 한다` : ''}${paid ? '  ← 막기 전에 AI를 불렀다' : ''}${rows.at(-1).error ? `  (${rows.at(-1).error})` : ''}`);
  if (SHOW && table) console.log(`     표: ${JSON.stringify(table).slice(0, 300)}`);
}

console.log(`\n${CASES.length}가지 가운데 어긋난 것 ${broken}가지`);
if (broken) process.exitCode = 1;
