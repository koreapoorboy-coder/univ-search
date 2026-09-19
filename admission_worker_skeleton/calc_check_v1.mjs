// 보고서 안의 **계산**을 코드가 다시 해 본다.
//
// 보고서에는 학생이 적은 숫자와 코드가 낸 평균·흔들림만 쓸 수 있다(지어낸 숫자가 든 문장은 지운다). 그런데 그러면
// 안내문이 구하라고 한 값도 못 쓴다 — 운영 테스트(2026-09-19) 중화 적정 보고서가 적정 부피는 적고도 식초의 산도를
// 끝내 계산하지 않았다("본문에서 수치 계산을 제시하지 않아 직접 비교하지 못했다").
//
// 그래서 AI가 식을 먼저 적게 한다(calculations). 식의 숫자는 이미 쓸 수 있는 숫자이거나, 이름을 붙여 밝힌 교과서
// 상수(몰질량 같은 것)여야 한다. 코드가 식을 다시 계산해 AI가 적은 답과 맞는 것만 본문에 쓸 수 있는 숫자로 더한다.
// 앞 계산의 답은 뒤 계산의 식에 쓸 수 있다(몰 농도 → 질량 백분율 → 표시값과의 오차).

const MAX_CALCULATIONS = 6;
const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const canonical = (value) => String(Number(value));

export const CALCULATION_SCHEMA = {
  type: 'array',
  minItems: 0,
  maxItems: MAX_CALCULATIONS,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['what', 'constants', 'expression', 'result', 'unit'],
    properties: {
      what: { type: 'string' },
      constants: {
        type: 'array',
        maxItems: 4,
        items: { type: 'object', additionalProperties: false, required: ['name', 'value'], properties: { name: { type: 'string' }, value: { type: 'string' } } },
      },
      expression: { type: 'string' },
      result: { type: 'string' },
      unit: { type: 'string' },
    },
  },
};

// 숫자와 + - × ÷ * / ( ) 만 읽는다. 그 밖의 글자가 있으면 계산하지 않는다.
export function evaluateExpression(text) {
  const source = String(text || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
  if (!/^[\d.\s+\-*/()]+$/.test(source)) return null;
  const tokens = source.match(/\d+(?:\.\d+)?|[+\-*/()]/g) || [];
  let at = 0;
  const peek = () => tokens[at];
  const take = () => tokens[at++];
  function primary() {
    const token = take();
    if (token === '(') { const value = sum(); if (take() !== ')') throw new Error('paren'); return value; }
    if (token === '-') return -primary();
    if (token !== undefined && /^\d/.test(token)) return Number(token);
    throw new Error('token');
  }
  function product() {
    let value = primary();
    while (peek() === '*' || peek() === '/') {
      const op = take();
      const right = primary();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const op = take();
      const right = product();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }
  try {
    const value = sum();
    return at === tokens.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

// 답이 식의 값을 적은 자릿수로 반올림한 것인가. 유효숫자로 줄여 쓴 것(0.72 대신 0.7)도 1% 안이면 맞다고 본다.
function sameResult(computed, written) {
  const decimals = (String(written).split('.')[1] || '').length;
  const step = 10 ** -decimals;
  const value = Number(written);
  if (Math.abs(computed - value) <= step / 2 + 1e-9) return true;
  return Math.abs(computed) > 0 && Math.abs(computed - value) / Math.abs(computed) <= 0.01;
}

const addRounded = (allowed, value) => {
  if (!Number.isFinite(value)) return;
  [0, 1, 2, 3].forEach((digits) => {
    const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
    allowed.add(canonical(rounded));
    allowed.add(canonical(Math.abs(rounded)));
  });
};

// allowed 는 쓸 수 있는 숫자 모음이다(report_stages_v1 의 allowedNumberSet). 맞는 계산의 상수와 답을 더해 돌려준다.
export function verifyCalculations(list, allowed) {
  const extended = new Set(allowed);
  const verified = [];
  const rejected = [];
  for (const raw of (Array.isArray(list) ? list : []).slice(0, MAX_CALCULATIONS)) {
    const constants = (Array.isArray(raw?.constants) ? raw.constants : [])
      .map((one) => ({ name: clip(one?.name, 40), value: clip(one?.value, 20).replace(/,/g, '') }))
      .filter((one) => one.name && /^-?\d+(?:\.\d+)?$/.test(one.value));
    const expression = clip(raw?.expression, 200);
    const result = clip(raw?.result, 20).replace(/,/g, '');
    const known = new Set([...extended, ...constants.map((one) => canonical(one.value))]);
    const numbers = expression.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [];
    const computed = evaluateExpression(expression);
    const why = !/^-?\d+(?:\.\d+)?$/.test(result) ? '답이 숫자가 아님'
      : computed === null ? '식을 읽을 수 없음'
        : !numbers.every((number) => known.has(canonical(number))) ? '식에 출처 없는 숫자'
          : !sameResult(computed, result) ? '답이 식과 다름' : '';
    if (why) { rejected.push({ what: clip(raw?.what, 60), expression, result, why }); continue; }
    constants.forEach((one) => extended.add(canonical(one.value)));
    addRounded(extended, computed);
    extended.add(canonical(result));
    verified.push({ what: clip(raw?.what, 60), constants, expression, result, unit: clip(raw?.unit, 20) });
  }
  return { allowed: extended, verified, rejected };
}

export function calculationPromptLines() {
  return [
    '- 안내문이 구하라고 한 값(농도·산도·속력·효율·오차율 등)을 학생 숫자로 계산할 수 있으면, 본문을 쓰기 전에 calculations에 식으로 먼저 계산한다. 계산이 필요 없으면 빈 배열이다.',
    '- calculations의 expression은 숫자와 + - × ÷ ( )만 쓴 한 줄 식이다(단위·글자 없이). 식의 숫자는 학생입력·결과정리·기준값·안내문·1차 설계서의 숫자, 앞 계산의 result, 또는 constants에 이름과 함께 적은 교과서 상수(몰질량 등)만 쓴다. result는 식의 값을 알맞은 자릿수로 반올림한 숫자다.',
    '- 코드가 식을 다시 계산해 맞는 계산의 result만 본문에 쓸 수 있다. 본문에는 계산 과정(무엇을 무엇으로 나눴는지)과 result를 함께 쓴다.',
    '- **calculations에 없는 계산 결과를 본문에 쓰면 그 문장은 통째로 지워진다.** 농도, 산도, 비율, 오차율처럼 본문에 쓸 계산값은 하나도 빠짐없이 calculations에 먼저 넣는다. 비율(예: 72.1 ÷ 36.0)도 계산이다.',
    '- 기준값이 있으면 계산한 값과 나란히 놓고 차이와 오차율(%)을 calculations로 계산해 비교한다. 비교하라는 안내문인데 기준값이 비어 있으면, 계산한 값까지 쓰고 "기준값을 옮겨 적으면 바로 비교할 수 있다"를 한계에 쓴다.',
  ];
}
