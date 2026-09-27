// **안내문이 깨졌거나 아주 길 때** 무슨 일이 나는지 본다. ₩0 — GPT 는 가짜 답으로 바꾼다.
//
// 지금까지 시험은 늘 반듯한 숫자로만 했다(조건 A 3·4·5). 그런데 실제 학생은 「몰라요」를 적고,
// 칸을 비우고, 「25도」처럼 단위를 붙이고, 99999 를 넣는다. 그때 보고서가
//   ① 막히는가(막아야 하는 것은 막아야 한다)
//   ② 그 줄만 버리고 나머지로 쓰는가
//   ③ 아니면 NaN·Infinity·undefined 가 보고서에 박히는가
// 를 확인한다. ③ 은 학생이 돈을 내고 받은 보고서에 「평균 NaN」이 적히는 일이다.
//
//   node public/keyword-engine/build/test_broken_guide_v1.mjs [--show]
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
const allPrompts = [];
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
    allPrompts.push(lastPrompt);
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

// 학생은 안내문을 **사진에서 뽑아** 붙여 넣는다. 그러면 글자가 뭉개지고, 평가계획표를 통째로
// 붙이면 다른 과목 과제까지 딸려 온다. 지금까지 시험은 늘 반듯한 안내문으로만 했다.
// 여기서 보는 것은 셋이다.
//   ① 막아야 할 것을 **유료 호출 전에** 막는가
//   ② 만들기로 했으면 **이 과제**를 잡는가(엉뚱한 과목 과제를 잡지 않는가)
//   ③ 아주 긴 글이 워커를 깨뜨리지 않는가

const GOOD = [
  '화학 수행평가 안내문',
  '주제: 온도에 따른 반응 속도 비교',
  '1) 온도를 달리하여 같은 반응이 끝나는 데 걸리는 시간을 측정한다.',
  '2) 온도가 반응 속도에 어떤 영향을 주는지 충돌 이론으로 설명한다.',
  '3) 측정에서 생기는 오차와 보완할 점을 쓴다.',
].join('\n');

// 실제 기록에서 다른 과목 과제를 모아 「학년 전체 평가계획표」를 만든다. 학생이 실제로 이렇게 붙인다.
const lines = readFileSync(`${SITE}/data/assessment/records/assessment_tasks.v1.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean);
const others = [];
for (const line of lines) {
  const task = JSON.parse(line);
  const text = `${task.raw_task_title || ''}\n${task.raw_task_desc || ''}`.trim();
  if (text.length < 200 || /화학/.test(task.subject_raw || '')) continue;
  others.push(text);
  if (others.length >= 40) break;
}
const wholePlan = `${others.slice(0, 20).join('\n\n')}\n\n${GOOD}\n\n${others.slice(20).join('\n\n')}`;

// 자모가 갈라진 글자(사진에서 뽑을 때 흔하다)와 뭉개진 글자
const broken = GOOD.replace(/온도/g, 'ㅇㅗㄴㄷㅗ').replace(/반응/g, '반\u0000응').replace(/측정/g, '측 정');

const CASES = [
  ['반듯한 안내문(기준)', GOOD, '보고서'],
  ['한 글자', '가', '막음'],
  ['숫자만', '1234567890', '막음'],
  ['이모지만', '🙂🙂🙂🙂', '막음'],
  ['아주 짧음(8자 미만)', '실험 보고', '막음'],
  ['짧지만 만든다(25자 미만)', '온도에 따른 반응 속도 실험 보고서 쓰기', '보고서'],
  ['자모가 갈라짐', broken, '보고서'],
  ['같은 글이 두 번', `${GOOD}\n${GOOD}`, '보고서'],
  ['영어만', 'Write a lab report comparing reaction rates at different temperatures and explain with collision theory.', '보고서'],
  ['HTML 태그가 섞임', `<div class="x">${GOOD.replace(/\n/g, '<br>')}</div>`, '보고서'],
  ['줄바꿈 없이 한 줄', GOOD.replace(/\n/g, ' '), '보고서'],
  ['제어문자가 섞임', GOOD.split('').join('​'), '보고서'],
  ['아주 긺(학년 전체 평가계획표)', wholePlan, '보고서'],
  ['아주 긺 + 우리 과제가 뒤쪽', `${others.join('\n\n')}\n\n${GOOD}`, '보고서'],
];

async function run(taskDescription) {
  calls = 0;
  allPrompts.length = 0;
  const body = {
    schoolName: '시험용 고등학교', grade: '고2', subject: '화학', subjectGroup: '과학',
    taskDescription, taskName: '', taskType: '실험보고서',
    career: 'natural', track: 'natural', major: '화학공학과',
    keyword: '반응 속도', selectedKeyword: '온도와 반응 속도', selectedConcept: '화학 반응의 속도',
    reportStage: 'experiment_draft', interpretationConfirmed: true, studentCode: 'sc-study0001-6dhy',
    liveInputCandidate: intake.buildCandidateFromValues({ school: '시험용 고등학교', grade: '고2', subject: '화학',
      subject_group: '과학', task_description: taskDescription, selected_subject: '화학', selected_subject_group: '과학' }),
  };
  const res = await worker.fetch(new Request('http://localhost/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env, { waitUntil() {} });
  const data = await res.json().catch(() => ({}));
  // **만드는 프롬프트**를 본다. 검수 프롬프트(두 번째)에는 안내문이 통째로 안 들어간다.
  return { status: res.status, data, calls, prompt: allPrompts[0] || '' };
}

let wrong = 0;
for (const [name, text, want] of CASES) {
  let out;
  try { out = await run(text); } catch (error) { out = { status: 0, data: { ok: false, error: `던져진 오류: ${error?.message || error}` }, calls: 0, prompt: '' }; }
  const got = out.status === 200 && out.data?.ok ? '보고서' : '막음';
  const bad = got !== want;
  // 막아야 하는 것은 AI 를 부르기 전에 막아야 한다. 부른 뒤 막으면 돈은 이미 나갔다.
  const paid = want === '막음' && out.calls > 0;
  // 만들기로 했으면 **이 과제**를 잡아야 한다 — 프롬프트에 우리 과제 문장이 남아 있는가.
  // 우리가 넣은 낱말은 늘 프롬프트에 있다. 그러니 **안내문에만 있는 문장**으로 확인한다 —
  // 아주 긴 글은 6,000자에서 잘리므로, 우리 과제가 뒤쪽에 있으면 통째로 사라질 수 있다.
  const mark = /충돌 이론|collision theory/i;
  const kept = got === '보고서' ? (mark.test(String(text)) ? mark.test(out.prompt) : true) : true;
  if (bad || paid || !kept) wrong += 1;
  const size = String(text).length;
  console.log(`${bad || paid || !kept ? '✗' : '○'} ${name.padEnd(22)} ${String(size).padStart(6)}자 · ${got.padEnd(4)} · GPT ${out.calls}번`
    + `${bad ? `  ← ${want} 이 나와야 한다` : ''}${paid ? '  ← 막기 전에 AI를 불렀다' : ''}${!kept ? '  ← 우리 과제가 프롬프트에서 사라졌다' : ''}`
    + `${out.data?.reason ? `  (${out.data.reason})` : ''}`);
}

console.log(`\n${CASES.length}가지 가운데 어긋난 것 ${wrong}가지`);
assert.equal(wrong, 0, '안내문이 깨졌거나 아주 길 때 어긋나는 것이 있다');
