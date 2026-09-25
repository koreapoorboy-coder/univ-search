// **읽은 작품을 학생에게 묻는 길**이 끝까지 이어져 있는지 본다. AI를 쓰지 않으므로 ₩0.
//
// 왜 이 시험이 필요한가. 이 기능은 조각이 다섯이다 — 묻는 규칙, 화면 칸, 보내는 값,
// 논문 찾기, 프롬프트. 하나만 빠져도 **아무 일도 일어나지 않고 조용하다.**
// 전에 그런 일이 있었다: guideBlock 을 아무도 부르지 않아 논문 길잡이가 한 번도 뜨지 않았다.
import { readFileSync } from 'node:fs';
import { ASK_HELP, needsWorkName, workNotice, workParts } from '../assets/js/shared/read_work_v1.js';
import { findLiteraryPapers, literaryCitation, literaryGuide, workParts as workPartsWorker } from '../../../admission_worker_skeleton/literary_paper_v1.mjs';

let fail = 0;
const ok = (cond, why) => { if (!cond) { console.log(`  ✗ ${why}`); fail += 1; } };
const read = (path) => readFileSync(path, 'utf8');

// ── ① 언제 묻는가 ───────────────────────────────────────────────
// 전 과목 7,131건으로 재 보니 298건에서 묻는다. 전에 과목 조건이 없을 때는 1,328건이었고
// 그중 1,048건이 미술·음악·과학이었다(「그래프를 읽고」에 걸렸다).
{
  const ask = (subject, taskName, taskDescription) => needsWorkName({ subject, taskName, taskDescription });
  ok(ask('공통국어1', '시에서 발견하기', '사전에 작품은 선정해 놓고 수행평가 당일에 작성하여 제출'), '작품 이름이 없으면 물어야 한다');
  ok(ask('문학', '작품 속 인물이 되어 토론하기', '문학 작품에서 갈등 관계를 분석하고'), '「작품」이라고만 하면 물어야 한다');
  ok(!ask('공통영어', '멋진 신세계 논평', '‘멋진 신세계(올더스 헉슬리)’를 읽고'), '이름이 있으면 묻지 않는다');
  ok(!ask('공통국어1', '서평 작성하기', '자신의 진로와 관련한 글을 읽고 서평으로 정리'), '학생이 고르는 과제는 묻지 않는다');
  ok(!ask('공통국어1', '논설문 쓰기', '찬반 의견을 나누고 논설문을 쓴다'), '읽을 글이 없는 과제는 묻지 않는다');
  // **과목으로 먼저 자른다.** 수학·과학 과제에 「읽은 작품」을 물으면 고장 난 것처럼 보인다.
  ok(!ask('화학', '자료 해석하기', '그래프를 읽고 작품처럼 해석한다'), '국어·영어가 아니면 묻지 않는다');
  ok(!ask('미술', '작품 감상문 쓰기', '미술 작품을 감상하고 쓴다'), '미술 과제에는 묻지 않는다');
  ok(!ask('공통국어1', '', ''), '입력이 없으면 묻지 않는다');
  ok(/작품 이름이 없어요/.test(ASK_HELP) && /비워 두면/.test(ASK_HELP), '왜 묻는지와 안 적어도 되는 것을 말해야 한다');
}

// ── ② 적은 것을 조각으로 끊는다 ────────────────────────────────
// 화면과 워커가 **같은 방식**으로 끊어야 한다. 다르면 화면은 찾은 척하고 워커는 못 찾는다.
{
  ok(JSON.stringify(workParts('동백꽃 (김유정)')) === JSON.stringify(['동백꽃', '김유정']), `조각: ${workParts('동백꽃 (김유정)')}`);
  ok(workParts('메밀꽃 필 무렵')[0] === '메밀꽃 필 무렵', '긴 조각이 먼저여야 한다');
  ok(workParts('「구운몽」')[0] === '구운몽', '낫표를 떼야 한다');
  ok(workParts('')[0] === undefined, '빈 값은 빈 목록이어야 한다');
  // 워커 쪽은 혼자서 작품을 못 가리키는 말을 더 떼어 낸다.
  ok(!workPartsWorker('현대 소설 감상').includes('소설'), '「소설」로는 찾지 않는다');
  ok(!workPartsWorker('나의 라임오렌지나무').includes('나의'), '「나의」로는 찾지 않는다');
}

// ── ③ 그 이름으로 논문을 찾는다 ────────────────────────────────
{
  const index = JSON.parse(read('public/keyword-engine/seed/engine-index/literary_papers.v1.json'));
  ok(index.rows.length > 3000, `색인이 있어야 한다 — ${index.rows.length}편`);
  const hit = findLiteraryPapers(index.rows, '구운몽', { limit: 2 });
  ok(hit.picked.length === 2, `구운몽으로 논문을 찾아야 한다 — ${hit.picked.length}편`);
  ok(hit.picked.every((one) => `${one.title} ${one.keywords}`.includes('구운몽')), '찾은 논문에 그 이름이 있어야 한다');
  const byAuthor = findLiteraryPapers(index.rows, '동백꽃 (김유정)', { limit: 2 });
  ok(byAuthor.picked.length > 0, '제목이 없으면 지은이로 찾아야 한다');
  // **짧은 이름을 맨몸으로 믿지 않는다.** 「날개」가 「뿌리와 날개의 크로노토프」에 걸렸다.
  const short = findLiteraryPapers(index.rows, '날개', { limit: 3 });
  ok(!short.picked.some((one) => one.title.includes('크로노토프')), `엉뚱한 논문이 붙었다 — ${short.picked.map((o) => o.title).join(' / ')}`);
  // 없으면 없다고 한다. 지어내지 않는다.
  ok(findLiteraryPapers(index.rows, '나의 라임오렌지나무', { limit: 2 }).picked.length === 0, '없는 작품에는 아무것도 붙이지 않는다');
  ok(findLiteraryPapers(index.rows, '').picked.length === 0, '빈 값에는 아무것도 붙이지 않는다');
  // 화면과 참고 자료가 쓸 모양
  const guide = literaryGuide('구운몽', hit.picked);
  ok(guide.papers.length === 2 && guide.papers.every((one) => one.line && one.guide), '화면 묶음에 줄과 이유가 있어야 한다');
  ok(guide.routeLabel.includes('읽은 작품'), '무엇으로 찾았는지 말해야 한다');
  const cite = literaryCitation(hit.picked[0]);
  ok(cite.title && cite.author && cite.year && cite.journal, `서지사항 칸이 채워져야 한다 — ${JSON.stringify(cite)}`);
  ok(cite.from && cite.to, '쪽수를 시작·끝으로 갈라야 한다');
}

// ── ④ 화면이 묻고 보낸다 ───────────────────────────────────────
{
  const html = read('public/keyword-engine/index.html');
  ok(/id="readWorkField"[^>]*hidden/.test(html), '칸은 처음에 숨어 있어야 한다');
  ok(/id="readWork"/.test(html), '적을 칸이 있어야 한다');
  ok(/read_work_v1\.js\?v=/.test(html) && /window\.__READ_WORK__/.test(html), '규칙을 화면에 실어야 한다');
  const flow = read('public/keyword-engine/assets/js/decision_flow_v1.js');
  ok(/function syncReadWork\(\)/.test(flow), '보이고 숨기는 코드가 있어야 한다');
  ok((flow.match(/syncReadWork\(\)/g) || []).length >= 3, '안내문을 고칠 때마다 다시 살펴야 한다');
  ok(/"readWork"\]\.forEach|,"readWork"\]/.test(flow), '「처음부터 다시」에서 지워야 한다');
  const bridge = read('public/keyword-engine/assets/js/mini_worker_generate_bridge_v32.js');
  ok(/readWork: readValue\("readWork"\)/.test(bridge), '폼에서 읽어야 한다');
  ok(/readWork: form\.readWork/.test(bridge), '워커로 보내야 한다');
}

// ── ⑤ 워커가 받아서 쓴다 ───────────────────────────────────────
{
  const worker = read('admission_worker_skeleton/worker.js');
  ok(/readWork: String\(payload\?\.readWork/.test(worker), '요청에서 받아야 한다');
  ok(/findLiteraryPapers\(await loadLiteraryPapers\(env\)/.test(worker), '그 이름으로 논문을 찾아야 한다');
  ok(/paperGuide = literaryGuide\(input\.readWork/.test(worker), '설계서에 논문 길잡이로 내려야 한다');
  ok(/input\.referencePapers = workPapers\.map\(literaryCitation\)/.test(worker), '최종 보고서 참고 자료로 써야 한다');
  // **찾았으면 개념 논문을 쓰지 않는다.** 둘 다 붙으면 학생이 무엇을 읽어야 할지 모른다.
  ok(/const shard = !workPapers\.length/.test(worker), '작품 논문을 찾았으면 개념 논문은 건너뛴다');
  ok(/학생이 읽은 작품은 「\$\{input\.readWork\}」이다/.test(worker), '프롬프트가 그 작품을 못 박아야 한다');
  ok(/지어내지 않는다/.test(worker.slice(worker.indexOf('학생이 읽은 작품은'), worker.indexOf('학생이 읽은 작품은') + 900)), '줄거리·인용을 지어내지 말라고 해야 한다');
  const refs = read('admission_worker_skeleton/references_v1.mjs');
  ok(/readWork = ''/.test(refs) && /수업에서 읽은 작품/.test(refs), '참고 자료 맨 앞에 그 작품이 와야 한다');
  const stages = read('admission_worker_skeleton/report_stages_v1.mjs');
  ok((stages.match(/readWork/g) || []).length >= 4, '보고서 세 갈래 모두에 넘겨야 한다');
}

// ── ⑥ 적었을 때 화면이 확인해 준다 ─────────────────────────────
{
  ok(/동백꽃/.test(workNotice('동백꽃')), '적은 것을 되읽어 줘야 한다');
  ok(workNotice('') === '', '안 적었으면 아무 말도 하지 않는다');
}

// ── ⑦ 운영 테스트에서 잡힌 흠 두 개 ────────────────────────────
// 2026-09-25 에 실제 보고서를 만들어 보고 찾았다(₩257).
{
  const stages = read('admission_worker_skeleton/report_stages_v1.mjs');
  const worker = read('admission_worker_skeleton/worker.js');
  // ㉠ 한 번에 끝나는 보고서에 「읽지 않은 연구」 검사가 없었다 — 국어·영어 글쓰기는 전부 이 길로 온다.
  ok(stages.includes('const unread = removeUnreadAuthority(raw, []);'), '한 번에 끝나는 보고서에도 검사를 걸어야 한다');
  ok(stages.includes('연구' + String.fromCharCode(92) + 's*(흐름|경향|성과)'), '「연구 흐름이 있다」도 잡아야 한다');
  // ㉡ 「동백꽃 (김유정)에서」처럼 괄호를 문장마다 끌고 다녔다.
  ok(worker.includes('본문에서는 **제목만** 쓴다'), '본문에서는 제목만 쓰라고 해야 한다');
}

if (fail) { console.error(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 읽은 작품을 묻고, 그 작품으로 논문을 찾고, 그 작품만 다룬다');
