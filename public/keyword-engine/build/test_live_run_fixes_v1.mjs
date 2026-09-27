// 실전 한 편(2026-09-27, 화학 「물질의 양과 화학 반응식」)을 통으로 돌려서 찾은 흠 네 개.
// 하나도 화면에서는 안 보이던 것들이다 — 학생이 내는 글에서만 보인다.
import { allowedNumberSet, computeStats, normalizeStudentData, dropUnkeptPledges, isPlanSentence, removeNoSourceClaim, removeUnnamedTools, removeUnsupportedNumbers } from '../../../admission_worker_skeleton/report_stages_v1.mjs';
import { readFileSync } from 'node:fs';
import { summarise } from '../../../admission_worker_skeleton/student_portfolio_v1.mjs';

let pass = 0;
const fails = [];
const ok = (name, got) => { if (got) pass += 1; else fails.push(name); };

// ① mL·g 로 재는 실험에서 「직전 조건 대비」 분석이 잘리지 않는다.
{
  const sections = [
    { title: '실험 조건 또는 자료 수집', body: '식초 양을 고정하고 질량을 바꾸어 세 번씩 잰다. 첫 조건 대비 차이와 직전 조건 대비 차이를 함께 본다.' },
    { title: '결과 정리', body: '평균 부피는 0.00 g에서 12.4 mL였다. 직전 조건 대비로 보면 0.50 g에서 +7 mL, 1.00 g에서 역시 +7 mL였다.' },
  ];
  const out = dropUnkeptPledges(sections);
  const body = out.sections[1].body;
  ok('mL 분석 문장이 그대로 남는다', body.includes('직전 조건 대비로 보면'));
  ok('조사로 시작하는 부서진 문장이 안 남는다', !/(?:^|\s)로 보면/.test(body));
}

// ② %·배로 재는 과제에서 약속만 하고 안 쓴 것은 여전히 뗀다(원래 흠의 재발 검사).
{
  const sections = [
    { title: '자료 수집', body: '세 해의 값을 모아 표로 만든다. 첫 조건 대비 변화율과 직전 조건 대비 변화율을 함께 본다. 그런 다음 흐름을 살핀다.' },
    { title: '자료 해석', body: '값이 해마다 커졌다. 가장 큰 해와 가장 작은 해의 차이가 눈에 보였다.' },
  ];
  const out = dropUnkeptPledges(sections);
  ok('안 쓴 약속은 그대로 뗀다', out.dropped >= 1);
}

// ③ 「…지점을 찾는다」처럼 현재형으로 쓴 후속 탐구가 지워지지 않는다.
{
  const plan = '같은 식초 부피를 고정하고 질량을 더 촘촘히(예: 0.10 g 간격) 바꾸어 증가폭이 줄어드는 지점을 찾는다.';
  ok('다음 단계를 가리키는 현재형은 계획이다', isPlanSentence(plan));
  ok('방법 절 말투(단서 없는 현재형)는 계획이 아니다', !isPlanSentence('세 번씩 반복해 값을 측정한다.'));
  ok('결과를 말하는 문장은 계획이 아니다', !isPlanSentence('다음 조건에서 값이 7 mL 커졌다.'));
  const allowed = new Set(['12.4']);
  ok('후속 탐구에서 계획의 숫자는 안 지운다', removeUnsupportedNumbers(plan, allowed, { allowPlans: true }).removed === 0);
  ok('방법 절에서는 없는 숫자를 그대로 막는다', removeUnsupportedNumbers(plan, allowed, { allowPlans: false }).removed === 1);
}

// ④ 뜻이 안 닿는 대학 글은 붙어 있으면 안 된다.
//
// 여기서 배운 것을 적어 둔다: **낱말로 자르는 것은 답이 아니다.** 붙여서 재 보니 재료가 가는 과제가
// 3,342건 중 2,586건으로 줄었다(100% → 77%). 대학 글은 낱말이 아니라 **단원으로** 이어 붙인 것이라
// 낱말이 안 겹치는 것이 정상이다 — 「태양계 천체의 관측」 ← 「남반구 하늘 지도」가 그렇다.
// 그래서 코드가 아니라 자료를 고쳤다. 감사의 「살펴보기:연구_낱말안겹침」 23건을 손으로 훑어
// 정말 잘못된 한 줄만 뺐다.
{
  const index = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/snu_research_index.v1.json', 'utf8'));
  const list = index.concepts['화학::물질의 양과 화학 반응식'] || [];
  ok('베이킹소다 실험 단원에 음극 소재 연구가 없다', !list.some((one) => /왕겨/.test(one.title || '')));
  const redox = index.concepts['통합과학2::산화와 환원'] || [];
  ok('맞는 자리(산화와 환원)에는 그대로 있다', redox.some((one) => /왕겨/.test(one.title || '')));
}

// ⑤ 생기부 줄에 축이 붙으면 「3년 줄기」가 생긴다.
{
  const axis = { axisId: 'A1', title: '양적 관계로 반응을 설명하기' };
  const noAxis = summarise([{ grade: '고1', subject: '통합과학1', axis: null }, { grade: '고2', subject: '화학', axis }]);
  ok('축이 하나뿐이면 줄기가 아니다', noAxis.lines.length === 0);
  const withAxis = summarise([{ grade: '고1', subject: '통합과학1', axis }, { grade: '고2', subject: '화학', axis }]);
  ok('같은 축을 두 번 지나면 줄기다', withAxis.lines.length === 1 && withAxis.lines[0].count === 2);
}

// ⑥ 우리가 표로 넘겨준 값은 본문에 쓸 수 있어야 한다.
//
// 「직전조건과의차이」·「직전조건대비변화율」을 계산해 AI에게 주고, 시계열 과제에서는 그것으로 전환점을
// 짚으라고 시켜 놓고, 쓸 수 있는 숫자 목록에는 안 넣었다. 그래서 그 분석을 쓴 문장이 전부 지워졌다 —
// 조건이 셋 이상인 측정 과제는 모두 그랬다. 지워지자 이번에는 「약속만 하고 안 썼다」 장치가 방법 절의
// 약속까지 뗐다. 두 장치가 서로 싸우고 있었다(2026-09-27 확인 실행).
{
  const raw = { measurementName: '풍선 둘레 길이', unit: 'cm', reason: '', observations: '', reflection: '', sources: [], sourceCards: [],
    conditions: [{ label: '0 mL', values: ['12.0', '12.4', '12.8'] }, { label: '5 mL', values: ['19.0', '19.4', '19.8'] }, { label: '10 mL', values: ['26.0', '26.4', '26.8'] }] };
  const data = normalizeStudentData(raw);
  const stats = computeStats(data);
  const allowed = allowedNumberSet(data, stats);
  const prev = stats.rows[2].percent_from_prev;
  ok('직전 조건 대비 변화율을 계산한다', prev === 36.1);
  ok('그 값을 본문에 쓸 수 있다', allowed.has(String(prev)));
  ok('직전 조건과의 차이도 쓸 수 있다', allowed.has(String(stats.rows[2].diff_from_prev)));
  const sentence = '첫 조건 대비 변화율은 5 mL에서 56.5%, 10 mL에서 112.9%였고, 직전 조건 대비 변화율은 5→10 mL에서 36.1%였다.';
  ok('그 분석을 쓴 문장이 안 지워진다', removeUnsupportedNumbers(sentence, allowed, { allowPlans: false }).removed === 0);
}

// ⑦ 참고 자료가 실려 있는데 「참고 자료 없이 진행했으며」라고 쓰면 안 된다.
//
// 학생이 자료 카드를 안 적어도, 교과 확장 재료에서 온 대학 글·논문이 참고 자료에 실린다. 그것을 세지
// 않았더니 서울대 연구 두 편이 실린 보고서의 느낀 점에 이 문장이 남았다. 선생님은 두 곳을 같이 본다.
{
  const said = '참고 자료 없이 진행했으며, 수업 개념과 측정값만으로 해석을 시도했다.';
  ok('자료가 실렸으면 그 문장을 지운다', removeNoSourceClaim(said, true).removed === 1);
  ok('정말 없으면 그대로 둔다', removeNoSourceClaim(said, false).removed === 0);
  ok('예전 말투(인용하지 않았다)도 그대로 잡는다', removeNoSourceClaim('참고 자료는 따로 인용하지 않았다.', true).removed === 1);
}

// ⑧ 감사의 「살펴볼 것」을 사람이 훑고 뺀 것들은 다시 들어오지 않는다.
//
// 수학 7과목에는 논문 묶음이 아예 없어(seed/paper-route 에 파일이 없다) 2026-09-21에 서울대 연구를
// 손으로 이어 붙였다. 그중 글자만 겹친 것들을 뺐다. univ_research_v1.mjs 는 바로 이 실패를 예고해
// 두었다 — 「수열의 극한」과 「급수」를 이름까지 적어서.
{
  const index = JSON.parse(readFileSync('public/keyword-engine/seed/engine-index/snu_research_index.v1.json', 'utf8'));
  const 빠졌나 = (unit, word) => !((index.concepts[unit] || []).some((one) => String(one.title || '').includes(word)));
  ok('수학적 귀납법에 단백질 정렬이 없다', 빠졌나('대수::수학적 귀납법', 'FoldMason'));
  ok('이차곡선에 양자기하학이 없다', 빠졌나('기하::이차곡선과 자취 해석', '양자기하학'));
  ok('급수에 단백질 정렬이 없다', 빠졌나('미적분1::급수', 'FoldMason'));
  ok('수열의 극한에 단백질 정렬이 없다', 빠졌나('미적분1::수열의 극한', 'FoldMason'));
  ok('확률과 통계의 의학 코호트 연구는 그대로 있다', (index.concepts['확률과 통계::통계적 추정'] || []).length >= 5);
}

// ⑨ 「프레임」이 영상의 프레임이 아닐 때가 있다.
//
// 설문형 한 편(2026-09-27, 사회문제 탐구 · 메시지 프레이밍)에서 「환경 프레임으로 같은 활동을 제안했을 때
// 응답 분포는 …」 세 문장이 통째로 지워졌다. 핵심 분석이 전부 사라졌다. 학생이 말한 적 없는 기구를 막는
// 장치가 「프레임으로」를 영상 측정 기구로 읽은 것이다. 영상의 프레임은 「프레임률」·「프레임 단위」로 잡는다.
{
  const 설문 = '환경 프레임으로 같은 활동을 제안했을 때 응답 분포는 아마 안 하겠다 26명 > 하겠다 19명 순으로 나타났다.';
  ok('메시지 프레이밍 문장은 안 지운다', removeUnnamedTools(설문, '').removed === 0);
  const 영상 = '영상 재생의 프레임 단위로 종료 시점을 판정했다.';
  ok('영상 프레임 단위는 그대로 막는다', removeUnnamedTools(영상, '').removed === 1);
  ok('안내문에 있으면 그대로 둔다', removeUnnamedTools(영상, '영상을 프레임 단위로 재라고 했다').removed === 0);
  ok('조사가 붙어도 학생이 말한 것으로 본다', removeUnnamedTools('촬영으로 시점을 정했다.', '촬영 기록').removed === 0);
}

// ⑩ 제안 절의 「영상」은 측정 기구가 아니다.
//
// 설문형 한 편(2026-09-27, 분실물 반환 캠페인)의 활용 방안에서 두 문장이 지워졌다 — 「반납 절차 영상
// 링크 … 같은 구체화가 효과적일 수 있다」, 「후속 터치포인트(…, 절차 영상)를 1회 제공한다」. 여기서
// 영상은 앞으로 만들 안내물이다. 막아야 하는 것은 「내가 이렇게 재었다」는 거짓말뿐이다.
{
  const 제안 = '예컨대 반납 절차 영상 링크, 가까운 신고지점 자동 제시 같은 구체화가 효과적일 수 있다.';
  const 제안2 = '안내 직후의 후속 터치포인트(짧은 리마인드, 위치 지도, 절차 영상)를 1회 제공한다.';
  const 거짓 = '스마트폰 카메라를 고정해 프레임률을 고정했다.';
  ok('제안 절의 제안 문장은 안 지운다', removeUnnamedTools(제안, '', { proposal: true }).removed === 0);
  ok('제안 절의 목록형 제안도 안 지운다', removeUnnamedTools(제안2, '', { proposal: true }).removed === 0);
  ok('제안 절이어도 「했다」는 막는다', removeUnnamedTools(거짓, '', { proposal: true }).removed === 1);
  ok('방법 절은 현재형도 막는다', removeUnnamedTools('스마트폰 카메라를 고정해 촬영한다.', '').removed === 1);
}

console.log(`실전 한 편에서 찾은 흠: ${pass}개 통과${fails.length ? ` · 실패 ${fails.length}` : ''}`);
if (fails.length) { for (const one of fails) console.error('  실패:', one); process.exit(1); }
