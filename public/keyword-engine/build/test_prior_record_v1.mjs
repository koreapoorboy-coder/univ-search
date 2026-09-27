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

// ── ⑤ 3년이 한 화면에 보이는가 — 포트폴리오에 학교 기록 줄이 들어가는가 ──────────────
check(/function recordRowsOf\(/.test(workerSrc), '세특 한 줄을 포트폴리오 한 줄로 바꾸는 길이 있다');
check(/priorRows, summary: summarise\(wholeStory\)/.test(workerSrc),
  '포트폴리오 응답이 학교 기록 줄과 합친 요약을 함께 돌려준다');
check(/majorFit\(wholeStory,/.test(workerSrc), '학과 적합도도 3년 전체로 센다 — 우리와 쓴 것만 세면 1학년이 빠진다');
check(/source: 'record'/.test(workerSrc), '학교 기록에서 온 줄에 출처를 적는다');
const folioSrc = readFileSync(`${SITE}/portfolio.html`, 'utf8');
check(/renderRecordRow/.test(folioSrc), '화면이 학교 기록 줄을 따로 그린다');
check(/badge">학교 기록/.test(folioSrc), '학교 기록이라고 이름 붙여 보여 준다');
check(/badge mine">우리와 씀/.test(folioSrc), '우리가 만든 보고서도 이름 붙여 보여 준다 — 섞이면 공식 기록으로 오해한다');
check(/fromRecord\.map\(renderRecordRow\)/.test(folioSrc), '학년 묶음 안에 학교 기록 줄이 함께 들어간다');
const sheet = readFileSync(`${SITE}/assets/student_screens.css`, 'utf8');
check(/\.badge\.mine/.test(sheet), '출처 표 꾸밈은 공용 한 장에 있다');

// ── ⑥ 여러 장이면 묶음으로 나눠 읽는가 ─────────────────────────────────────────
const { UPLOAD_LIMITS, pageSchema, pagePromptLines, mergePages, judgePromptLines, judgeSchema } = await import(`file:///${ROOT}/admission_worker_skeleton/upload_analysis_v1.mjs`);
check(UPLOAD_LIMITS.batchFiles >= 2 && UPLOAD_LIMITS.batchFiles <= 8, '묶음 크기가 정해져 있다', String(UPLOAD_LIMITS.batchFiles));
const page = pageSchema();
check(Object.keys(page).join(',') === 'entries,pastUnits', '묶음을 읽을 때는 옮겨 적기만 한다 — 판단 칸은 없다', Object.keys(page).join(','));
check(/빠짐없이/.test(pagePromptLines({}).join(' ')), '묶음 안의 교과를 빠짐없이 옮기라고 말한다');
// 같은 과목이 두 묶음에서 나오면 더 긴 글을 남긴다 — 한 과목이 두 장에 걸쳐 찍히면 한쪽이 잘린다.
const merged = mergePages([
  { entries: [{ grade: '고1', subject: '통합과학', text: '짧게 잘린 글' }], pastUnits: [{ grade: '고1', subject: '통합과학', topic: '생명 시스템' }] },
  { entries: [{ grade: '고1', subject: '통합과학', text: '광합성 색소를 분리하는 실험을 수행하고 흡수 스펙트럼을 해석함' },
              { grade: '고1', subject: '한국사', text: '조선 후기 대동법을 사료로 살펴봄' }],
    pastUnits: [{ grade: '고1', subject: '통합과학', topic: '생명 시스템' }, { grade: '고1', subject: '한국사', topic: '조선 후기' }] },
]);
check(merged.entries.length === 2, '같은 과목은 한 줄로 합친다', String(merged.entries.length));
check(/광합성/.test(merged.entries[0].text), '잘린 쪽이 아니라 더 긴 쪽을 남긴다');
check(merged.pastUnits.length === 2, '이미 한 것도 겹치면 한 번만 남긴다', String(merged.pastUnits.length));
// 판단은 모아 놓고 한 번만 한다 — 사진을 다시 보내지 않는다.
const judge = judgePromptLines({ targetLevel: '고3 수준' }, merged).join(' ');
check(/광합성/.test(judge), '판단할 때 옮겨 적은 글을 넣어 준다');
check(/과목별 글을 다시 옮겨 적지 않는다/.test(judge),
  '판단 단계에서는 옮겨 적기를 다시 시키지 않는다');
check(/analyzeRecordInBatches/.test(workerSrc), '워커에 묶음으로 읽는 길이 있다');
check(/read = await analyzeRecordInBatches\(files, meta, env\)/.test(workerSrc),
  '생활기록부는 장수와 상관없이 옮겨 적기 → 판단 두 단계로 읽는다');
check(/!read\?\.analysis\?\.record\?\.entries\?\.length/.test(workerSrc),
  '옮겨 적은 것이 없으면 생기부가 아니다 — 그때만 예전 길로 간다');
check(/async function countPdfPages\(/.test(workerSrc),
  'PDF 쪽 수를 센다 — 라이브러리 없이 바이트를 훑는다');
check(/const byGrade = files\.length === 1 && pages > 4/.test(workerSrc),
  'PDF 한 개는 학년으로 나눠 세 번 읽는다 — 한 번에 보내면 앞쪽만 읽힌다');
check(/Promise\.all\(groups\.map/.test(workerSrc), '묶음을 같이 보낸다 — 차례로 보내면 학생이 오래 기다린다');
check(/missedBatches/.test(workerSrc), '못 읽은 묶음이 있으면 남겨서 학생에게 말할 수 있어야 한다');

// ── ⑦ PDF 를 쪽마다 사진으로 바꾸는가(화면 쪽) ──────────────────────────────────
const pdfSrc = readFileSync(`${SITE}/assets/js/shared/pdf_pages_v1.js`, 'utf8');
check(/export async function splitLongPdfs/.test(pdfSrc), 'PDF 를 쪽마다 사진으로 바꾸는 길이 있다');
check(/minPages: 7/.test(pdfSrc), '짧은 PDF(보고서)는 그대로 보낸다 — 사진이 글자보다 비싸다');
check(/new URL\('\.\.\/vendor\/', import\.meta\.url\)/.test(pdfSrc), 'pdf.js 는 우리 서버에 둔 것을 쓴다 — 바깥 CDN 이 아니다');
check(/out\.length >= 28/.test(pdfSrc), '스물여덟 장을 넘기지 않는다 — 워커는 한 번에 서른 개까지 받는다');
check(/toSend\.forEach\(file => form\.append/.test(bridgeSrc), '바꾼 사진을 올린다 — 원래 PDF 가 아니라');
check(/assets\/js\/shared\/pdf_pages_v1\.js/.test(bridgeSrc), '화면이 그 조각을 불러 쓴다');
// 학년은 쪽에서 읽고, 안 보이면 비운다. 짐작하면 3년이 뒤섞인다.
const graded = sanitizeAnalysis({ docType: 'record', record: { entries: [
  { grade: '3학년', subject: '독서', text: '정보글을 읽고 요약하며 비판적으로 평가하는 활동을 수행함' },
  { grade: '', subject: '기하', text: '벡터의 내적과 평면의 방정식을 다루고 좌표기하 문제를 해결함' }] } });
check(graded.record.entries[0].grade === '고3', '「3학년」을 「고3」으로 맞춘다 — 안 맞추면 포트폴리오에서 기타로 빠진다', graded.record.entries[0].grade);
check(graded.record.entries[1].grade === '', '학년을 못 읽었으면 비워 둔다 — 짐작해 채우지 않는다', JSON.stringify(graded.record.entries[1].grade));

// ── ⑧ 판단 호출의 자리 크기 — 넓게 주면 오히려 실패한다(2026-09-27 실측) ──────────
check(/judgeProps, name: 'student_upload_analysis', budget: 8000/.test(workerSrc),
  '판단은 좁게 준다 — 32,000·16,000 에서는 생각만 하다 끝났고 8,000 에서 됐다');
check(/budget: 16000, effort: 'low'/.test(workerSrc),
  '옮겨 적기는 넉넉히 준다 — 거기는 쓸 글이 많다');
const judgeOnly = judgeSchema();
check(!judgeOnly.record.properties.entries && !judgeOnly.record.properties.pastUnits,
  '판단할 때는 옮겨 적기 칸을 빼 준다 — 안 빼면 열세 줄을 다시 쓰며 자리를 다 쓴다');

// 판단에 넣는 글은 짧게 자른다. 과목이 스물여덟 개가 되자 자르지 않은 글로는 판단이 실패했다.
const many = judgePromptLines({}, { entries: Array.from({ length: 28 }, (_, i) => ({ grade: '고1', subject: `과목${i}`, text: '가'.repeat(300) })) }).join('
');
check(many.length < 6000, '판단 프롬프트가 짧게 유지된다 — 길면 모델이 생각만 하다 끝난다', String(many.length));
check(!/가{200}/.test(many), '세특 전문을 다시 넣지 않는다 — 전문은 우리가 갖고 있다');

console.log(`\n전에 올린 생활기록부 이어받기: ${passed}/${passed} 통과`);
