// **책 추천이 실제 보고서에 들어가는가.** 운영 사이트로 2단계를 그대로 돌려 확인한다.
//
// 어제까지 수학 과목은 책을 통째로 못 받았다(wantsBooks). 2026-09-30 에 「단원을 지목한 책만 통과」로
// 바꿨으므로, 그 자리가 실제로 열렸는지는 **운영 워커로 돌려 봐야** 안다. ₩0 감사는 바깥 호출을 막아
// 공공데이터도 못 본다 — 미적분1 「급수」에는 물가지수를 이어 두었으니 그것도 여기서 함께 확인된다.
//
//   SC=<시험용 학생 코드> node tools/live_book_run_v1.mjs <나갈 폴더>
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2];
const SC = process.env.SC || '';
if (!OUT) { console.error('나갈 폴더를 주세요.'); process.exit(1); }
if (!SC) { console.error('SC 환경 변수에 시험용 학생 코드를 주세요.'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const WORKER = 'https://curly-base-a1a9.koreapoorboy.workers.dev';
// 판 번호는 재고 파일 안의 inventory_version 그대로다. 옛 도구에 박아 둔 값은 낡아서 400 이 온다.
const INV = JSON.parse(Buffer.from((await import('../admission_worker_skeleton/immutable_subject_inventory_bytes_v1.mjs')).IMMUTABLE_SUBJECT_INVENTORY_BASE64, 'base64').toString('utf8')).inventory_version;
const won = (u) => Math.round((((u.input_tokens || 0) / 1e6) * 1.25 + ((u.output_tokens || 0) / 1e6) * 10) * 1385);

// 수학 수행평가의 흔한 모습으로 적었다 — 단원 이름이 안내문에 있고, 무엇을 낼지가 적혀 있다.
const TASK = {
  subject: '확률과 통계', subjectGroup: '수학', grade: '고2',
  name: '표본 크기와 추정 정확도 비교 탐구',
  desc: '통계 자료를 활용하여 표본을 뽑아 모집단의 특성을 추정하고, 표본의 크기가 추정에 미치는 영향을 분석하여 보고서로 작성하기 / 평가방법: 보고서 / 반영비율 20%',
};

const base = (extra) => ({
  liveInputCandidate: {
    candidate_version: 'PHASE6_LIVE_INPUT_CANDIDATE_SIMPLE_V3',
    raw_authority: { school: '시험용 고등학교', grade: TASK.grade, subject_group: TASK.subjectGroup, subject: TASK.subject, task_description: TASK.desc },
    selected_option_metadata: { subject_value: TASK.subject, subject_group: TASK.subjectGroup, inventory_version: INV },
    client_transport_metadata: { authority_class: 'UNTRUSTED_TRANSPORT_METADATA', client_capture_digest: null, client_observed_at: null },
  },
  schoolName: '시험용 고등학교', grade: TASK.grade, subject: TASK.subject, subjectGroup: TASK.subjectGroup,
  taskDescription: TASK.desc, taskName: TASK.name, taskType: '보고서',
  keyword: '', selectedKeyword: '', selectedConcept: '',
  track: '자연', major: '', interpretationConfirmed: true, studentCode: SC,
  ...extra,
});

function post(url, body, ms = 900000) {
  return new Promise((done, fail) => {
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, (res) => {
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

async function call(label, body) {
  const at = Date.now();
  process.stdout.write(`${label} … `);
  const res = await post(`${WORKER}/generate`, body);
  let out = null;
  try { out = JSON.parse(res.text); } catch { /* 아래에서 적는다 */ }
  const secs = Math.round((Date.now() - at) / 1000);
  if (!out?.ok) {
    console.log(`실패 (${secs}초) ${res.status} ${String(out?.message || out?.error || res.text).slice(0, 200)}`);
    writeFileSync(`${OUT}/${label}_실패.json`, res.text, 'utf8');
    return null;
  }
  const cost = won(out.usage || {});
  console.log(`끝 (${secs}초 · ₩${cost})`);
  writeFileSync(`${OUT}/${label}.json`, JSON.stringify(out, null, 1), 'utf8');
  return { out, cost, secs };
}

// ── 1단계: 설계서 ─────────────────────────────────────────────
const one = await call('01_설계서', base({ reportStage: 'experiment_draft' }));
if (!one) process.exit(1);
const draft = one.out.result || {};
console.log('   검수 자료판단: '+JSON.stringify(one.out.reviewSources));
console.log(`   책 추천 ${Array.isArray(one.out.bookChoices) ? one.out.bookChoices.length : 0}권`);
for (const b of one.out.bookChoices || []) console.log(`      · 『${b.title}』 ${b.author || ''}  [${(b.why || []).join(', ')}]`);

const tpl = draft.dataTemplate || {};
const rows = Array.isArray(tpl.conditions) ? tpl.conditions : [];
console.log(`   학생이 채울 표: 조건 ${rows.length}줄 · 항목 ${(tpl.measures || tpl.columns || []).length || '?'}개`);

// ── 학생이 표를 채운다(가상 숫자) ──────────────────────────────
// 등비급수 부분합처럼 **수렴하는 모양**으로 채운다. 지어낸 숫자임을 요약에 적는다.
const filled = rows.map((row, i) => {
  const label = String(row?.label || row?.name || `조건 ${i + 1}`);
  const n = Math.max(1, (Array.isArray(row?.values) ? row.values.length : 0) || 3);
  // 첫째항 100, 공비 0.6 인 등비급수의 부분합
  const partial = [];
  let sum = 0; let term = 100;
  for (let k = 0; k < n; k += 1) { sum += term; term *= 0.6; partial.push(Number(sum.toFixed(1))); }
  return { label, values: partial.map(String) };
});
writeFileSync(`${OUT}/02_학생이_채운_표.json`, JSON.stringify({ template: tpl, filled }, null, 1), 'utf8');
console.log(`   채운 표: ${filled.map((r) => `${r.label}=${r.values.join('/')}`).join(' · ')}`);

// ── 2단계: 최종 보고서 ────────────────────────────────────────
const two = await call('03_최종보고서', base({
  reportStage: 'experiment_final',
  studentData: { conditions: filled },
  priorDraft: draft.caseTag ? { caseTag: draft.caseTag } : undefined,
}));

if(two) console.log('   최종 검수 자료판단: '+JSON.stringify(two.out.reviewSources));
const total = (one.cost || 0) + (two?.cost || 0);
writeFileSync(`${OUT}/summary.json`, JSON.stringify({
  task: TASK, 설계서: { cost: one.cost, secs: one.secs, 책: one.out.bookChoices || [] },
  최종: two ? { cost: two.cost, secs: two.secs } : null, 합계원: total,
}, null, 1), 'utf8');
console.log(`\n합 ₩${total} · ${(one.secs || 0) + (two?.secs || 0)}초`);
console.log(`저장: ${OUT}`);
