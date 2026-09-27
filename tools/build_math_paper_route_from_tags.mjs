// **수학 과목 논문 묶음을, 이미 붙여 둔 GPT 꼬리표만 보고 만든다.** ₩0.
//
// 왜 따로 만드나. build_paper_route.mjs 는 「분야」로 논문을 고른다. 수학은 그 길이 막혀 있다 —
// KCI 의 「자연과학 > 수학」 820편 가운데 한글 제목은 110편이고 전부 수학교육 연구이며, 나머지
// 710편은 영어 제목 순수 수학이다(2026-09-27 재확인). 그래서 수학 다섯 과목은 묶음을 안 만들었다.
//
// 그런데 GPT 는 이미 논문 26,938편을 읽으면서 **수학 단원도 후보로 보고 있었다.** 그 결과가
// .cache_kci_tags.json 에 남아 있다: 기하 19편, 공통수학1 9편, 공통수학2 6편. 값은 이미 치렀는데
// 묶음 파일이 없어서 한 편도 쓰이지 않고 있었다. 「경우의 수, 순열, 조합」 과제 71건이 진짜 논문을
// 0편 받고 있었고, 거기 붙을 퍼즐 알고리즘 논문 두 편이 놀고 있었다.
//
// 그래서 **분야를 보지 않고 꼬리표만 본다.** 뜻을 읽어 붙인 것이므로 낱말로 걸린 엉뚱한 논문이 섞일
// 자리가 없다. 묶음이 작은 것은 당연하다 — 없는 것을 만들지는 않는다.
//
// build_paper_route.mjs 를 다시 돌리지 않는다. 그것은 56개 묶음을 통째로 다시 만들고, 그러다
// 영어 267건·한국사 142건의 꼬리표가 지워진 적이 있다(전수 검사 69% → 53%).
//
//   node tools/build_math_paper_route_from_tags.mjs           — 무엇이 들어가는지만 보여 준다
//   node tools/build_math_paper_route_from_tags.mjs --write   — 실제로 만든다
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const here = (name) => new URL(name, import.meta.url);
const CSV = process.argv.find((one) => /\.csv$/i.test(one))
  || 'C:/Users/korea/Downloads/한국연구재단_KCI논문정보_20250825.csv';
const OUT_DIR = here('../public/keyword-engine/seed/paper-route/');
const TAGS_FILE = here('../public/keyword-engine/build/.cache_kci_tags.json');
// 묶음 파일이 없는 수학 과목 가운데 꼬리표가 붙은 논문이 있는 것만.
const SUBJECTS = ['기하', '공통수학1', '공통수학2'];
const LEVEL = { 쉬움: 'e', 보통: 'm', 어려움: 'h' };
// **가르치는 법 연구는 뺀다.** 확률과 통계 묶음이 이미 같은 목록으로 뺀다(subject_field_map → route_title_exclude).
// GPT 가 뜻으로는 맞게 붙여 놓았지만, 「초등학교 평면도형의 이동 관련 용어에 대한 고찰」은 고등학생이
// 도형의 이동을 탐구할 때 쓸 배경이 아니다 — 초등학생이 그 말을 어떻게 배우는지에 관한 글이다.
const TEACHING = ['초등', '중학교', '중등', '교사', '교육과정', '수업', '학업성취', '교과서', '교수학',
  '수학교육', '예비 교사', '예비교사', '학습자', '학습 자료', '학습자료', '교육적', '지도 방안', '지도방안'];

function cells(line) {
  const out = [];
  let now = '';
  let quoted = false;
  for (let at = 0; at < line.length; at += 1) {
    const ch = line[at];
    if (quoted) {
      if (ch === '"' && line[at + 1] === '"') { now += '"'; at += 1; }
      else if (ch === '"') quoted = false;
      else now += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(now); now = ''; }
    else now += ch;
  }
  out.push(now);
  return out;
}
const HANGUL = /[가-힣]/g;
const korean = (...values) => values.find((one) => (String(one || '').match(HANGUL) || []).length >= 2) || '';
const key = (title) => String(title || '').replace(/\s+/g, '');

const TAGS = JSON.parse(await readFile(TAGS_FILE, 'utf8'));
// 제목(공백 제거) → 꼬리표. 캐시의 키는 공백이 들어간 원래 제목이다.
const byKey = new Map();
for (const [title, one] of Object.entries(TAGS)) {
  const mine = (one.concepts || []).filter((c) => SUBJECTS.includes(String(c).split('::')[0]));
  if (mine.length) byKey.set(key(title), { concepts: one.concepts || [], level: one.level });
}
console.log(`꼬리표에서 찾은 수학 논문 ${byKey.size}편`);

const found = new Map();
let 가르치는법 = 0;
{
  const stream = createInterface({ input: createReadStream(CSV, { encoding: 'utf8' }), crlfDelay: Infinity });
  let head = null;
  for await (const line of stream) {
    if (!line.trim()) continue;
    const parts = cells(line);
    if (!head) { head = parts.map((one) => one.replace(/^\uFEFF/, '').trim()); continue; }
    const get = (name) => parts[head.indexOf(name)] || '';
    const title = korean(get('논문명(국문)'), get('논문명(외국어)')).trim();
    if (!title) continue;
    const tag = byKey.get(key(title));
    if (!tag || found.has(key(title))) continue;
    if (TEACHING.some((word) => title.includes(word))) { 가르치는법 += 1; continue; }
    const names = [get('저자'), get('공동저자')].join(';').split(/[;,·]/).map((one) => one.trim()).filter(Boolean);
    const from = get('시작페이지').trim();
    const to = get('끝페이지').trim();
    found.set(key(title), {
      title: title.slice(0, 200),
      who: !names.length ? '' : names.length > 2 ? `${names[0]} 외` : names.join(' · '),
      year: get('발행년').trim(),
      journal: (korean(get('학술지명(국문)'), get('학술지명(외국어)')) || get('학술지명(국문)') || get('학술지명(외국어)')).trim(),
      volume: get('권').trim(), issue: get('호').trim(), pages: from && to ? `${from}-${to}` : '',
      keywords: (get('키워드(국문)') || '').split(/[,;]/).map((one) => one.trim()).filter(Boolean).slice(0, 4).join(', ').slice(0, 50),
      concepts: tag.concepts, level: LEVEL[tag.level] || '',
    });
  }
}
console.log(`가르치는 법 연구라 뺀 것 ${가르치는법}편`);
console.log(`CSV 에서 찾은 것 ${found.size}편 · 못 찾음 ${byKey.size - found.size}편 (제목 표기가 달라진 것)`);

const shards = {};
for (const subject of SUBJECTS) {
  const units = [];
  const unitAt = (name) => { let at = units.indexOf(name); if (at < 0) { units.push(name); at = units.length - 1; } return at; };
  const rows = [];
  for (const paper of found.values()) {
    // 이 과목 단원만 꼬리표로 싣는다. 한 논문이 두 과목에 걸리면 양쪽 묶음에 들어간다.
    const mine = paper.concepts.filter((c) => String(c).split('::')[0] === subject);
    if (!mine.length) continue;
    // 중심 학문 칸은 1 로 둔다 — 이 묶음은 분야로 고른 것이 아니라 뜻으로 고른 것이다.
    rows.push([paper.title, paper.who, paper.year, paper.journal, paper.volume, paper.issue, paper.pages, 1,
      mine.map(unitAt), paper.level, paper.keywords]);
  }
  shards[subject] = { rows, units };
}

console.log('\n과목별 묶음:');
for (const [subject, one] of Object.entries(shards)) {
  const 읽을만한 = one.rows.filter((row) => row[9] !== 'h').length;
  console.log(`  ${subject.padEnd(8)} ${String(one.rows.length).padStart(3)}편 (읽을 만한 것 ${읽을만한}편) · 단원 ${one.units.length}개`);
  const 셈 = new Map();
  for (const row of one.rows) for (const at of row[8]) {
    const name = one.units[at];
    if (!셈.has(name)) 셈.set(name, { 다: 0, 읽을만: 0 });
    셈.get(name).다 += 1;
    if (row[9] !== 'h') 셈.get(name).읽을만 += 1;
  }
  for (const [name, n] of [...셈].sort((a, b) => b[1].읽을만 - a[1].읽을만)) {
    console.log(`        ${String(n.읽을만).padStart(2)}편 쓸 수 있음 (전체 ${n.다}) · ${name.split('::')[1]}`);
  }
}

if (process.argv.includes('--write')) {
  const meta = {
    source: '한국연구재단 KCI논문정보 (공공데이터포털 15083283, 2024년 발행분)',
    license: '이용허락범위 제한 없음',
    built_at: new Date().toISOString().slice(0, 10),
  };
  for (const [subject, one] of Object.entries(shards)) {
    if (!one.rows.length) { console.log(`  ${subject}: 실을 것이 없어 만들지 않았습니다.`); continue; }
    const file = new URL(`${subject.replace(/\s+/g, '_')}.v1.json`, OUT_DIR);
    await writeFile(file, JSON.stringify({
      version: 'paper-route-v1', subject, ...meta,
      fields: ['(분야로 고르지 않았습니다 — GPT 꼬리표만 봤습니다)'],
      note: '한 줄 = [제목, 저자, 연도, 학술지, 권, 호, 쪽, 중심 학문(1/0), 단원 번호들(units 의 자리), 난이도(e/m/h), 키워드]. 이 묶음은 build_math_paper_route_from_tags.mjs 가 만든다 — 수학은 분야로 고르는 길이 막혀 있어 GPT 가 뜻을 읽어 붙인 꼬리표만 보고 싣는다.',
      units: one.units,
      rows: one.rows,
    }), 'utf8');
  }
  console.log(`\n${OUT_DIR.pathname.replace(/^\//, '')} 에 썼습니다.`);
} else {
  console.log('\n(보여 주기만 했습니다. 만들려면 --write 를 붙이세요.)');
}
