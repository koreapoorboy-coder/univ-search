// **보관된 보고서를 gpt-5 에게 읽혀 우리 템플릿의 흠을 모은다.**
//
// 왜 이렇게 쓰나. 2026-09-24 에 검수를 학생마다 돌려 보았다. 실전 4건에서 지적이 0건이었다.
// 깨끗해서가 아니었다 — 같은 보고서에 **목록을 없애고** 물으니 25건이 나왔다(₩327).
// 그런데 그중 상당수가 **우리 템플릿 탓**이었다. 가장 무거운 것은 이것이다:
//
//   「10 °C와 25 °C의 평균 차이는 8.76초로 두 조건의 흔들림(1.3초, 0.8초)보다 훨씬 크다」
//   → 범위(최댓값−최솟값)를 유의성 근거로 쓰는 것은 통계적으로 부적절하다. n=3 이다.
//
// 이 문장은 AI 가 지어낸 것이 아니라 **우리가 시킨 것**이다(report_stages_v1.mjs 의 spread 와
// 「흔들림보다큰차이인가」). 즉 모든 학생의 보고서에 같은 흠이 난다.
//
// 학생마다 ₩327 을 내면 한 명만 나아진다. **우리가 열 장에 ₩3,000 을 쓰면 템플릿 흠을 걷어내고
// 앞으로 수천 장이 나아진다.** ₩0 전수 감사·씨앗 미리 받기와 같은 방식이다.
//
//   node tools/review_reports_open.mjs --ids r-xxx,r-yyy          (보고서 번호로)
//   node tools/review_reports_open.mjs --latest 10                (최근 10장)
//   node tools/review_reports_open.mjs --file <json>              (로컬 응답 파일)
//   --stage experiment_final | experiment_draft | complete        (--latest 와 함께)
//   --out <폴더>                                                  (모은 결과를 적는다)
//
// 값은 gpt-5 한 번 호출이고 보고서 한 장에 약 ₩150 이다. 학생 이용권은 쓰지 않는다.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const arg = (name, fallback) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : fallback; };
const IDS = (arg('--ids', '') || '').split(',').map((one) => one.trim()).filter(Boolean);
const LATEST = Number(arg('--latest', '0'));
const STAGE = arg('--stage', 'experiment_final');
const FILE = arg('--file', '');
const OUT = arg('--out', '');
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY 가 없습니다. 환경 변수로 넣어 주세요.'); process.exit(1); }

const loose = (text) => String(text ?? '').replace(/[\s"'“”‘’]/g, '');
const clip = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// 심각도를 받는다. 목록은 주지 않지만 **무게는 받아야** 한다 —
// 「낮음」까지 다 고치게 하면 보고서가 오히려 나빠진다(2026-09-24 판정: 25건 중 과한 지적 4건).
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['quote', 'problem', 'severity', 'blame'],
        properties: {
          quote: { type: 'string', minLength: 6 },
          problem: { type: 'string', minLength: 10 },
          severity: { type: 'string', enum: ['높음', '보통', '낮음'] },
          // 이 칸이 이 도구의 핵심이다. 「틀이 시킨 것」이 우리가 고칠 것이다.
          blame: { type: 'string', enum: ['틀이 시킨 것', '이 보고서만의 것', '모르겠다'] },
        },
      },
    },
  },
};

function prompt(kind, title, body, table, task) {
  return [
    `너는 고등학교 수행평가 ${kind}를 읽는 까다로운 교사다. 학생이 이것을 그대로 제출한다.`,
    '',
    '**잘못된 곳을 모두 찾아라.** 종류를 제한하지 않는다 — 과학적으로 틀린 말, 자료가 뒷받침하지 않는 단정,',
    '단위나 계산의 오류, 빠진 변인, 정량이 없어 재현할 수 없는 절차, 안전 미흡, 앞뒤가 어긋나는 문장,',
    '같은 말의 반복, 학생이 하지 않은 일을 했다고 쓴 것 — 감점될 만한 것은 무엇이든 찾는다.',
    '',
    '규칙',
    '1. `quote` 는 글에서 **그대로 옮긴 문장**이어야 한다. 고쳐 적거나 요약하면 그 지적은 버려진다.',
    '2. `severity` 는 학생이 잃을 점수로 정한다. 「높음」은 틀린 말이거나 실험이 어긋나는 것이다.',
    '3. `blame` 이 중요하다. 이 글을 만든 프로그램의 **틀(양식·지시)이 시켜서** 생긴 흠이면 「틀이 시킨 것」,',
    '   이 주제·이 자료에서만 생긴 흠이면 「이 보고서만의 것」이라고 적는다.',
    '   보기: 반복 3회의 「최댓값−최솟값」을 차이의 신뢰 근거로 쓰는 문장은 양식이 시킨 것이다.',
    '4. 글이 매끄러운지, 더 길게 쓸 수 있는지는 보지 않는다. 흠이 없으면 빈 배열로 둔다.',
    '',
    '참고: 표와 그림은 **프로그램이 따로 붙인다.** 본문이 「표 1」·「그림 1」을 가리키는 것은 흠이 아니다.',
    '',
    '## 학생이 적은 표',
    ...(table.length ? table : ['  (표가 없는 단계다)']),
    '',
    '## 과제 안내문',
    task || '(없음)',
    '',
    `## ${kind}`,
    `제목: ${title}`,
    '',
    body,
  ].join('\n');
}

async function ask(text) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5', input: text,
      reasoning: { effort: 'medium' }, max_output_tokens: 16000,
      text: { format: { type: 'json_schema', name: 'open_review', schema: SCHEMA } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body?.error || body).slice(0, 300));
  const message = (body.output || []).find((one) => one?.type === 'message') || body.output?.[0];
  const out = message?.content?.find((one) => one?.type === 'output_text')?.text || body.output_text;
  return { parsed: JSON.parse(out),
    won: Math.round(((body.usage.input_tokens / 1e6) * 1.25 + (body.usage.output_tokens / 1e6) * 10) * 1385) };
}

// ── 읽을 보고서 모으기 ────────────────────────────────────
function fromD1(sql) {
  // 윈도에서는 npx 가 npx.cmd 라 execFileSync 로 바로 못 부른다(ENOENT). 셸을 거친다.
  const raw = execSync(`npx wrangler d1 execute keyword-engine-db --remote`
    + ` --config wrangler.production-report-v2.toml --command "${sql.replace(/"/g, '\\"')}" --json`,
    { cwd: 'admission_worker_skeleton', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(raw.slice(raw.indexOf('[')))[0].results;
}

const SKIP = new Set(['reportStage', 'sectionTitles', 'figuresAfterSection', 'removedNumberSamples', 'dataSummary']);
const pieces = [];
if (FILE) {
  const d = JSON.parse(readFileSync(FILE, 'utf8'));
  const r = d.result || d;
  pieces.push({ id: d.reportId || FILE, stage: r.reportStage || '', subject: '', task: '',
    title: r.reportTitle || '', body: String(r.report || ''), conditions: [] });
} else {
  const where = IDS.length ? `report_id IN (${IDS.map((one) => `'${one.replace(/'/g, '')}'`).join(', ')})`
    : `report_stage = '${STAGE}' AND source = 'openai' AND body_chars > 3000`;
  const sql = `SELECT report_id, report_stage, subject, task_description, title, body_json FROM report_outputs`
    + ` WHERE ${where} ORDER BY id DESC${IDS.length ? '' : ` LIMIT ${Math.max(1, LATEST || 5)}`}`;
  for (const row of fromD1(sql)) {
    const parts = JSON.parse(row.body_json || '[]').filter((one) => !SKIP.has(one.key));
    pieces.push({ id: row.report_id, stage: row.report_stage, subject: row.subject,
      task: row.task_description || '', title: row.title || '',
      body: parts.map((one) => `${one.key}\n${one.text}`).join('\n\n'), conditions: [] });
  }
}
if (!pieces.length) { console.error('읽을 보고서가 없습니다.'); process.exit(1); }
console.log(`보고서 ${pieces.length}장을 읽힙니다 (한 장에 약 ₩150).\n`);

// ── 읽히고 모으기 ────────────────────────────────────────
let total = 0;
const all = [];
for (const one of pieces) {
  const kind = one.stage === 'experiment_draft' ? '설계서' : '보고서';
  let got;
  try { got = await ask(prompt(kind, one.title, one.body, one.conditions, one.task)); }
  catch (error) { console.log(`✗ ${one.id} — ${String(error.message).slice(0, 120)}`); continue; }
  total += got.won;
  const flat = loose(one.body);
  const real = got.parsed.findings.filter((x) => flat.includes(loose(x.quote)));
  const fake = got.parsed.findings.length - real.length;
  for (const x of real) all.push({ ...x, id: one.id, stage: one.stage, subject: one.subject });
  console.log(`${one.id} · ${one.subject || kind} — 지적 ${real.length}건 (거짓 ${fake}건) · ₩${got.won}`);
}

// ── 틀이 시킨 것을 모아 보여 준다 — 이것이 우리가 고칠 목록이다 ──
// **겹치는 지적을 묶는다. 이것이 이 도구의 핵심이다.**
//
// AI 에게 「틀이 시킨 것인가」를 물어도 못 믿는다. 2026-09-24 에 72건 중 65건을
// 「이 보고서만의 것」이라고 답했는데, 흔들림 문제는 분명히 모든 보고서에 나는 것이었다.
//
// **여러 장에서 똑같이 나온 지적이면 그것이 틀 흠이다.** AI 의 판정이 아니라 겹침으로 정한다.
// 그러면 수백 건을 다 볼 필요 없이 겹친 열 개쯤만 보면 된다.
const STOP = /이다|있다|없다|한다|된다|같다|것|수|의|를|을|이|가|은|는|에|와|과|로|도|만|더|그|이런|저런|때문|경우|대해|관해|따라|통해|위해|보고서|설계서|학생|내용|부분|표현|문장|서술|기술|제시|사용|필요|가능|어렵|부족|미흡|불명확|근거|해석|판단|기록|조건|결과/g;
const gist = (text) => [...new Set(String(text ?? '')
  .replace(/[^가-힣A-Za-z0-9 ]/g, ' ').replace(STOP, ' ')
  .split(/\s+/).filter((one) => one.length >= 2))].sort();

// 두 지적이 같은 흠인가 — 뜻 낱말이 절반 넘게 겹치면 같은 것으로 본다.
function same(a, b) {
  if (!a.length || !b.length) return false;
  const set = new Set(b);
  const hit = a.filter((one) => set.has(one)).length;
  return hit / Math.min(a.length, b.length) >= 0.5;
}

const weightOf = (level) => ({ '높음': 2, '보통': 1, '낮음': 0 })[level] || 0;

function cluster(list) {
  const groups = [];
  for (const one of list) {
    const key = gist(one.problem);
    const box = groups.find((group) => same(group.key, key));
    if (box) { box.items.push(one); box.ids.add(one.id); }
    else groups.push({ key, items: [one], ids: new Set([one.id]) });
  }
  // 여러 장에 난 것이 먼저, 그다음 무거운 것이 먼저.
  return groups.sort((a, b) => (b.ids.size - a.ids.size)
    || (Math.max(...b.items.map((x) => weightOf(x.severity))) - Math.max(...a.items.map((x) => weightOf(x.severity)))));
}

const byBlame = { '틀이 시킨 것': [], '이 보고서만의 것': [], '모르겠다': [] };
for (const one of all) (byBlame[one.blame] || byBlame['모르겠다']).push(one);
const heavy = (list) => list.filter((one) => one.severity !== '낮음');

console.log(`\n${'='.repeat(64)}`);
console.log(`지적 ${all.length}건 · ₩${total}`);
console.log(`  틀이 시킨 것       ${byBlame['틀이 시킨 것'].length}건 (높음·보통 ${heavy(byBlame['틀이 시킨 것']).length}건)  ← 엔진에서 고칠 것`);
console.log(`  이 보고서만의 것   ${byBlame['이 보고서만의 것'].length}건 (높음·보통 ${heavy(byBlame['이 보고서만의 것']).length}건)`);
console.log(`  모르겠다           ${byBlame['모르겠다'].length}건`);

// **겹친 것 = 틀 흠.** 두 장 이상에 난 것만 사람이 본다.
const groups = cluster(all);
const repeated = groups.filter((one) => one.ids.size >= 2);
const once = groups.filter((one) => one.ids.size === 1);
console.log(`
지적을 뜻으로 묶으니 ${groups.length}가지 · 그중 두 장 이상에 난 것 ${repeated.length}가지`);
console.log(`한 장에만 난 것 ${once.length}가지는 그 보고서만의 일일 수 있어 뒤로 둔다.`);
console.log(`
${'-'.repeat(64)}`);
console.log(`── 여러 장에 똑같이 난 흠 — **이것이 우리가 고칠 목록이다** ──`);
for (const box of repeated) {
  const worst = box.items.reduce((a, b) => ((weightOf(b.severity) > weightOf(a.severity)) ? b : a));
  const said = box.items.filter((one) => one.blame === '틀이 시킨 것').length;
  console.log(`
[${worst.severity}] **${box.ids.size}장**에서 (AI 가 틀 탓이라고 본 것 ${said}/${box.items.length}건)`);
  console.log(`   ${clip(worst.problem, 220)}`);
  for (const one of box.items.slice(0, 2)) console.log(`   · ${one.subject || one.stage} 「${clip(one.quote, 76)}」`);
}
console.log(`
── 한 장에만 난 무거운 것 (높음) ──`);
for (const box of once.filter((one) => one.items.some((x) => x.severity === '높음')).slice(0, 12)) {
  const one = box.items[0];
  console.log(`  [${one.subject || one.stage}] ${clip(one.problem, 130)}`);
}
for (const box of [...groups.values()].sort((a, b) => b.ids.length - a.ids.length)) {
  console.log(`\n[${box.severity}] ${box.ids.length}장에서 — ${clip(box.problem, 200)}`);
  console.log(`   「${clip(box.quote, 90)}」`);
}

if (OUT) {
  mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/open_review_${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), won: total, findings: all,
    repeated: repeated.map((one) => ({ 장수: one.ids.size, 보고서: [...one.ids], problem: one.items[0].problem, quotes: one.items.map((x) => x.quote) })) }, null, 1), 'utf8');
  console.log(`\n${file} 에 적었습니다.`);
}
