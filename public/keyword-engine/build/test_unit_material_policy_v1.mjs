// **안내문이 말하지 않은 자료는 단원표가 「준다」라고 한 것만 준다.**
//
// 사용자 결정 2026-09-30. 이 검사가 지키는 것은 두 가지다:
//   ① 안내문이 요구했으면 표와 무관하게 준다 — 표 때문에 요구를 못 지키면 안 된다.
//   ② 안내문이 말 안 했으면 표를 따른다 — 낱말 하나로 몰래 들어올 길을 막는다.
// 그리고 이 규칙이 실제로 붙어 있는지도 본다(워커의 네 자리).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MATERIAL, allowsMaterial, demandsMaterial, missingDemanded } from '../../../admission_worker_skeleton/unit_material_policy_v1.mjs';

const here = (name) => new URL(name, import.meta.url);
const worker = (await readFile(here('../../../admission_worker_skeleton/worker.js'), 'utf8')).replace(/\r\n/g, '\n');
const policyFile = JSON.parse(await readFile(here('../seed/engine-index/unit_material_policy.v1.json'), 'utf8'));

let pass = 0;
const fails = [];
const ok = (name, got) => { if (got) pass += 1; else fails.push(name); };

// ── ① 안내문이 요구하면 표를 이긴다 ────────────────────────────────────
{
  // 「급수」는 표에 논문 없음으로 적혀 있다. 그래도 안내문이 논문을 요구하면 막지 않는다.
  const 표 = { policy: { '미적분1::급수': { 논문: '없음', 대학연구: '없음', 통계: '없음', 책: '준다' } } };
  ok('P1 표가 「없음」이어도 안내문이 논문을 요구하면 통과시킨다',
    allowsMaterial(표, { subject: '미적분1', concept: '급수', taskText: '논문을 한 편 찾아 읽고', kind: MATERIAL.PAPER }) === true);
  ok('P1 안내문이 말 안 하면 표를 따라 막는다',
    allowsMaterial(표, { subject: '미적분1', concept: '급수', taskText: '급수의 수렴을 설명하기', kind: MATERIAL.PAPER }) === false);
  ok('P1 표가 「준다」면 안내문이 말 안 해도 준다',
    allowsMaterial(표, { subject: '미적분1', concept: '급수', taskText: '급수의 수렴을 설명하기', kind: MATERIAL.BOOK }) === true);
  // **표에 없는 단원은 막지 않는다.** 표가 못 따라온 단원 때문에 자료가 사라지면 표를 만든 일이 손해가 된다.
  ok('P1 표에 없는 단원은 막지 않는다',
    allowsMaterial(표, { subject: '없는과목', concept: '없는단원', taskText: '아무 말 없음', kind: MATERIAL.PAPER }) === true);
}

// ── ② 안내문에서 요구를 읽어내는 규칙 ──────────────────────────────────
{
  ok('P2 「빅데이터를 분석하여」는 통계 요구다', demandsMaterial('빅 데이터를 분석하여 논술하기', MATERIAL.DATASET));
  ok('P2 「선행 연구를 조사하여」는 논문 요구다', demandsMaterial('선행 연구를 조사하여 정리하기', MATERIAL.PAPER));
  ok('P2 「책을 읽고 서평」은 책 요구다', demandsMaterial('책을 읽고 서평 쓰기', MATERIAL.BOOK));
  // 「참고문헌」·「출처」를 요구하면 **어느 자료든** 하나는 있어야 한다.
  ok('P2 「참고문헌을 적어」는 모든 자료를 요구로 본다', demandsMaterial('참고 문헌을 반드시 적어 제출하기', MATERIAL.PAPER)
    && demandsMaterial('참고 문헌을 반드시 적어 제출하기', MATERIAL.DATASET));
  ok('P2 아무 말 없는 안내문은 아무것도 요구하지 않는다',
    !demandsMaterial('실생활 사례를 찾아 개념을 설명하기', MATERIAL.PAPER)
    && !demandsMaterial('실생활 사례를 찾아 개념을 설명하기', MATERIAL.DATASET)
    && !demandsMaterial('실생활 사례를 찾아 개념을 설명하기', MATERIAL.BOOK));
}

// ── ③ 요구했는데 없으면 무엇이 없는지 돌려준다 ──────────────────────────
{
  const 있는것 = { [MATERIAL.PAPER]: false, [MATERIAL.RESEARCH]: true, [MATERIAL.DATASET]: false, [MATERIAL.BOOK]: true };
  const 없는것 = missingDemanded(null, { subject: '정보', concept: '자료와 정보의 분석', taskText: '빅데이터를 분석하고 선행 연구를 조사하기' }, 있는것);
  ok('P3 요구했는데 없는 것만 돌려준다', 없는것.includes(MATERIAL.PAPER) && 없는것.includes(MATERIAL.DATASET));
  ok('P3 있는 것은 돌려주지 않는다', !없는것.includes(MATERIAL.RESEARCH) && !없는것.includes(MATERIAL.BOOK));
  ok('P3 요구하지 않았으면 없어도 돌려주지 않는다',
    missingDemanded(null, { subject: '정보', concept: '자료와 정보의 분석', taskText: '개념을 설명하기' },
      { [MATERIAL.PAPER]: false, [MATERIAL.RESEARCH]: false, [MATERIAL.DATASET]: false, [MATERIAL.BOOK]: false }).length === 0);
}

// ── ④ 워커가 네 자리에 이 문을 달았나 ─────────────────────────────────
{
  ok('P4 워커가 단원표를 seed 로 읽는다', worker.includes("unitMaterialPolicy: 'engine-index/unit_material_policy.v1.json'"));
  ok('P4 책에 문이 달려 있다', /const 책허용 = allowsMaterial\(seedPack\.unitMaterialPolicy/.test(worker)
    && /if \(책허용 && \(input\.reportStage === STAGE\.DRAFT/.test(worker));
  ok('P4 통계에 문이 달려 있다', /const 통계허용 = allowsMaterial\(seedPack\.unitMaterialPolicy/.test(worker)
    && /if \(통계허용 && input\.reportStage !== STAGE\.DRAFT\)/.test(worker));
  ok('P4 논문·대학연구에 문이 달려 있다', /const 논문허용 = 재료허용\(MATERIAL\.PAPER\)/.test(worker)
    && /const 연구허용 = 재료허용\(MATERIAL\.RESEARCH\)/.test(worker));
  ok('P4 요구했는데 못 준 것을 설명서로 넘긴다', /input\.missingDemanded = missingDemanded\(seedPack\.unitMaterialPolicy/.test(worker));
}

// ── ⑤ 표 자체가 멀쩡한가 ──────────────────────────────────────────
{
  const rows = policyFile.policy || {};
  const keys = Object.keys(rows);
  ok('P5 표에 단원이 300줄 넘게 있다', keys.length >= 300);
  const 값 = new Set();
  for (const key of keys) for (const kind of Object.values(MATERIAL)) 값.add(rows[key][kind]);
  // **값이 셋이다**(2026-09-30). 초안은 세어서 「준다」·「없음」만 쓰지만, 사람이 읽고
  // 「안준다」로 바꾼 칸이 생긴다 — 자료가 **있는데도** 이 단원에는 맞지 않는 경우다.
  // 「없음」과 「안준다」는 다르다: 없어서 못 주는 것과, 있는데 안 주기로 정한 것이다.
  // allowsMaterial 은 「준다」가 아니면 모두 막으므로 동작은 같고, 구분은 사람이 읽기 위한 것이다.
  ok('P5 칸에 들어가는 값은 「준다」·「없음」·「안준다」 셋뿐이다',
    [...값].every((one) => one === '준다' || one === '없음' || one === '안준다'));
  const 안준다 = keys.filter((key) => Object.values(MATERIAL).some((kind) => rows[key][kind] === '안준다'));
  ok(`P5 「안준다」로 바꾼 칸에는 이유가 적혀 있다 (${안준다.length}단원)`, 안준다.every((key) => String(rows[key].memo || '').trim().length >= 20));
  // 단원 이름이 우리 체계와 같아야 한다 — 어긋나면 표가 아무것도 막지 못하고 조용히 통과시킨다.
  const axisIndex = JSON.parse(await readFile(here('../seed/engine-index/longitudinal_axis_index.v1.json'), 'utf8'));
  const 우리 = new Set();
  for (const axis of Object.values(axisIndex.axes || {})) if (axis.subject && axis.concept) 우리.add(`${axis.subject}::${axis.concept}`);
  const 없는이름 = keys.filter((one) => !우리.has(one));
  ok(`P5 표의 단원 이름이 모두 우리 체계에 있다 (어긋난 것 ${없는이름.length}개)`, 없는이름.length === 0);
}

console.log(`단원 자료 표: ${pass}개 통과${fails.length ? ` · 실패 ${fails.length}` : ''}`);
if (fails.length) { for (const one of fails) console.error('  실패:', one); process.exit(1); }
assert.ok(pass > 0);
