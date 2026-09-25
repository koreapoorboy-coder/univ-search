// **읽은 작품을 물어본 것이 보고서를 바꾸는가.** 운영 사이트로 실제 보고서를 만들어 확인한다.
//
// 같은 과제를 두 번 만든다 — 작품 이름 **없이** 한 번, **적어서** 한 번. 다른 것은 하나도 없다.
// 그래야 바뀐 것이 이 기능 때문인지 알 수 있다.
//
//   SC=<시험용 학생 코드> node tools/test_read_work_live.mjs <나갈 폴더>
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2];
const SC = process.env.SC || '';
if (!OUT) { console.error('나갈 폴더를 주세요.'); process.exit(1); }
if (!SC) { console.error('SC 환경 변수에 시험용 학생 코드를 주세요.'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const WORKER = 'https://curly-base-a1a9.koreapoorboy.workers.dev';
const INV = 'subject-option-inventory-v2_73ed6bf7a284c7105f2fdf51e2c01feb0944d96253b4bd95b71011103ebd9767';
const won = (u) => Math.round((((u.input_tokens || 0) / 1e6) * 1.25 + ((u.output_tokens || 0) / 1e6) * 10) * 1385);

// **실제 수행평가 기록에서 가져온 과제다.** 지어낸 과제로는 지어낸 결과만 나온다.
// 안내문에 작품 이름이 없다 — 이것이 국어·영어 과제 620건 중 298건의 모습이다.
const TASK = {
  subject: '공통국어1', subjectGroup: '국어', grade: '고1',   // 「1」이 아니라 「고1」이다(GRADE_INVALID)
  name: '작품 속 인물이 되어 토론하기',
  desc: '문학 작품에서 갈등 관계를 분석하고, 갈등 관계에 있는 한 인물이 되어 다른 견해를 가진 인물을 근거를 들어 설득하기 / 평가방법: 논술, 교사 관찰 및 기록 / 반영비율 30%',
};
const WORK = '동백꽃 (김유정)';

const payload = (readWork) => ({
  liveInputCandidate: {
    candidate_version: 'PHASE6_LIVE_INPUT_CANDIDATE_SIMPLE_V3',
    raw_authority: { school: '시험용 고등학교', grade: TASK.grade, subject_group: TASK.subjectGroup, subject: TASK.subject, task_description: TASK.desc },
    selected_option_metadata: { subject_value: TASK.subject, subject_group: TASK.subjectGroup, inventory_version: INV },
    client_transport_metadata: { authority_class: 'UNTRUSTED_TRANSPORT_METADATA', client_capture_digest: null, client_observed_at: null },
  },
  schoolName: '시험용 고등학교', grade: TASK.grade, subject: TASK.subject, subjectGroup: TASK.subjectGroup,
  taskDescription: TASK.desc, taskName: TASK.name, taskType: '보고서',
  keyword: '', selectedKeyword: '', selectedConcept: '',
  track: '인문', major: '', interpretationConfirmed: true, studentCode: SC,
  reportStage: 'complete',
  readWork,
});

// node 의 fetch 는 머리글을 5분 안에 못 받으면 스스로 끊는다. https 로 직접 부르고 15분을 준다.
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

async function run(label, readWork) {
  const at = Date.now();
  process.stdout.write(`${label} 만드는 중… `);
  const res = await post(`${WORKER}/generate`, payload(readWork));
  let out = null;
  try { out = JSON.parse(res.text); } catch { /* 본문이 JSON 이 아니면 아래에서 적는다 */ }
  const secs = Math.round((Date.now() - at) / 1000);
  if (!out?.ok) {
    console.log(`실패 (${secs}초) ${res.status} ${String(out?.error || res.text).slice(0, 120)}`);
    return { label, readWork, ok: false, secs };
  }
  const cost = won(out.usage || {});
  console.log(`끝 (${secs}초, ₩${cost})`);
  const one = {
    label, readWork, ok: true, secs, cost,
    id: out.reportId || '',
    title: out.result?.reportTitle || '',
    stage: out.result?.reportStage || '',
    body: String(out.result?.report || ''),
    paperGuide: out.result?.paperGuide || out.paperGuide || null,
    raw: out.result || null,
  };
  writeFileSync(`${OUT}/${label}${ONLY ? '_v2' : ''}.json`, JSON.stringify(one, null, 1), 'utf8');
  return one;
}

// **하나씩 돌린다.** 같이 돌리면 워커가 바빠 한쪽이 늦고, 비교가 흐려진다.
// --only 를 주면 한 쪽만 돌린다. 고친 것을 확인할 때 쓴다(₩110 쯤).
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const before = ONLY && ONLY !== 'before' ? { ok: false } : await run('01_작품이름_없이', '');
const after = ONLY && ONLY !== 'after' ? { ok: false } : await run('02_작품이름_적고', WORK);
writeFileSync(`${OUT}/summary${ONLY ? `_${ONLY}` : ''}.json`, JSON.stringify({ task: TASK, work: WORK, before, after }, null, 1), 'utf8');
const total = (before.cost || 0) + (after.cost || 0);
console.log(`\n두 장 합 ₩${total} · ${(before.secs || 0) + (after.secs || 0)}초`);
console.log(`저장: ${OUT}`);
