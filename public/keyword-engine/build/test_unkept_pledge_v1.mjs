// **적어 놓고 안 쓴 것**을 보고서에서 떼는지 본다. ₩0.
//
// 보고서 49장 + 다시 잰 13장을 gpt-5 에게 읽히니 같은 지적이 양쪽에서 나왔다(2026-09-24/25):
//   「② 에서 약속한 '첫 조건/직전 조건 대비 차이'의 수치를 본문 어디에서도 제시하지 않았다」
//
// 지시로 「쓸 것만 적어라」 해도 안 막혔다. 방법 절과 해석 절을 따로 쓰기 때문이다.
// 그래서 코드가 본다 — 약속한 항목의 **수치가 보고서 어디에도 없으면** 그 약속을 뗀다.
//
// 그리고 **참고 자료를 가른다.** 우리가 붙인 논문은 학생이 읽은 것이 아니므로,
// 학생이 적은 자료와 한 줄씩 섞이면 「인용한 자료」처럼 보인다. 「더 읽어 볼 자료」로 따로 적는다.
import { STAGE, dropUnkeptPledges, finalizeStageOutput, normalizeStudentData } from '../../../admission_worker_skeleton/report_stages_v1.mjs';
import { referencesBody } from '../../../admission_worker_skeleton/references_v1.mjs';

let fail = 0;
const bad = (why) => { console.log(`  ✗ ${why}`); fail += 1; };
const ok = (cond, why) => { if (!cond) bad(why); };

// ── 안 쓴 약속은 뗀다 ────────────────────────────────────
{
  const out = dropUnkeptPledges([
    { title: '탐구 방법', body: '비교 기준은 세 층위로 둔다. ① 절대 비교: 조건별 평균 자체의 크기. ② 기준 대비 비교: 첫 조건 대비 차이와 직전 조건 대비 차이. ③ 변동성 비교: 조건별 흔들림.' },
    { title: '자료 해석', body: '조건 2의 평균은 9.5초로 가장 짧았다.' },
  ]);
  const body = out.sections[0].body;
  ok(out.dropped >= 1, '안 쓴 약속을 떼야 한다');
  ok(!/첫 조건 대비|직전 조건 대비/.test(body), `약속이 남았다 — ${body}`);
  // 나머지 기준은 지킨 것일 수 있으니 남긴다
  ok(/절대 비교/.test(body) && /변동성 비교/.test(body), `다른 기준까지 지웠다 — ${body}`);
  // 「② …:.」처럼 빈 항목이 남으면 안 된다
  ok(!/[①-⑳]\s*[^.。]{0,20}[:：]\s*[.。]/.test(body), `빈 항목이 남았다 — ${body}`);
  // 「세 층위」라고 했는데 둘만 남으면 개수를 말하지 않는다
  ok(!/세\s*층위/.test(body), `개수가 안 맞는다 — ${body}`);
}

// ── 실제로 쓴 약속은 그대로 둔다 ─────────────────────────
{
  const before = [
    { title: '탐구 방법', body: '첫 조건 대비 차이와 직전 조건 대비 차이를 함께 본다.' },
    { title: '자료 해석', body: '조건 3은 직전 조건 대비 -6.7% 로 꺾였고 첫 조건 대비 16.7% 높았다.' },
  ];
  const out = dropUnkeptPledges(before);
  ok(out.dropped === 0, `지킨 약속을 뗐다 — ${out.sections[0].body}`);
  ok(out.sections === before, '고칠 것이 없으면 그대로 돌려줘야 한다');
}

// ── 문장이 부서지면 그 문장을 뺀다 ───────────────────────
{
  const out = dropUnkeptPledges([
    { title: '탐구 방법', body: '표 1에 측정값과 평균, 흔들림을 함께 적고, 첫 조건 대비 변화율과 직전 조건 대비 변화율을 병기해 본다. 시작과 끝 기준은 같은 사람이 판정한다.' },
    { title: '자료 해석', body: '조건 2의 평균은 9.5초였다.' },
  ]);
  const body = out.sections[0].body;
  ok(!/적고을|과 를|와 을/.test(body), `문장이 부서졌다 — ${body}`);
  ok(/같은 사람이 판정한다/.test(body), `멀쩡한 문장까지 지웠다 — ${body}`);
}

// ── 관문이 실제로 돌린다 ────────────────────────────────
{
  const data = normalizeStudentData({ measurementName: '시간', unit: '초',
    conditions: [{ label: '조건 1', values: ['18.2', '17.6', '18.9'] }, { label: '조건 2', values: ['9.4', '9.9', '9.1'] }] });
  const long = (seed) => `${seed} `.repeat(10).trim();
  const { parsed } = finalizeStageOutput(STAGE.FINAL, { reportTitle: '조건에 따른 시간 비교 탐구',
    sections: [
      { title: '탐구 방법', body: `${long('같은 구간을 지나는 시간을 세 번씩 재었다.')} 비교 기준은 세 층위로 둔다. ① 절대 비교: 조건별 평균. ② 기준 대비 비교: 첫 조건 대비 차이와 직전 조건 대비 차이. ③ 변동성 비교: 조건별 흔들림.` },
      { title: '자료 해석', body: long('조건 2가 더 짧았다.') },
    ] }, { subject: '물리', reportStage: STAGE.FINAL, studentData: data });
  const body = parsed.sections[0].body;
  ok(!/첫 조건 대비|직전 조건 대비/.test(body), `관문이 안 뗐다 — ${body.slice(-90)}`);
  ok(/절대 비교/.test(body), '지킨 기준은 남아야 한다');
}

// ── 우리가 붙인 논문은 「더 읽어 볼 자료」로 가른다 ────────
{
  const paper = { title: '과수원 토양에서 분리한 섬유소 분해 효소 생산', who: '김철수', year: '2024', journal: '한국미생물학회지', volume: '60', issue: '2', pages: '100-108' };
  const body = referencesBody({ cards: [{ title: '기후변화 감시 보고서 2025', type: '기관 자료', take: '기온 상승 폭을 확인했다' }],
    papers: [paper], textbook: '생명과학Ⅰ 교과서 · 세포와 물질대사 단원' });
  const lines = body.split('\n');
  ok(/더 읽어 볼 자료/.test(body), `가르는 줄이 없다 — ${body}`);
  const at = lines.findIndex((one) => /더 읽어 볼 자료/.test(one));
  ok(at > 0, '가르는 줄은 맨 앞에 오면 안 된다');
  ok(lines.slice(at + 1).some((one) => one.includes('섬유소')), '논문은 그 줄 뒤에 와야 한다');
  ok(lines.slice(0, at).some((one) => one.includes('기후변화')), '학생이 적은 자료는 그 줄 앞에 있어야 한다');
  ok(lines.slice(0, at).some((one) => one.includes('교과서')), '교과서도 그 줄 앞에 있어야 한다');
}

// 학생이 그 논문을 이미 적었으면 가르지 않는다 — 그건 학생이 본 자료다
{
  const title = '과수원 토양에서 분리한 섬유소 분해 효소 생산';
  const body = referencesBody({ cards: [{ title, type: '논문', take: '효소가 온도에 민감하다는 것을 알았다' }],
    papers: [{ title, who: '김철수', year: '2024', journal: '한국미생물학회지' }] });
  ok(!/더 읽어 볼 자료/.test(body), `학생이 읽은 자료를 갈랐다 — ${body}`);
  ok(body.split('\n').length === 1, `한 줄이어야 한다 — ${body}`);
}

// 논문이 없으면 가르는 줄도 없다
{
  const body = referencesBody({ cards: [{ title: '기후변화 보고서', type: '기관 자료', take: '확인했다' }], textbook: '화학Ⅰ 교과서 · 동적 평형 단원' });
  ok(!/더 읽어 볼 자료/.test(body), `붙일 논문이 없는데 줄이 생겼다 — ${body}`);
}

if (fail) { console.log(`\n실패 ${fail}건`); process.exit(1); }
console.log('통과 — 적어 놓고 안 쓴 것은 떼고, 우리가 붙인 논문은 읽은 자료와 섞지 않는다');
