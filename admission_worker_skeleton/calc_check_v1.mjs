// 보고서 안의 **계산**을 코드가 다시 해 본다.
//
// 보고서에는 학생이 적은 숫자와 코드가 낸 평균·흔들림만 쓸 수 있다(지어낸 숫자가 든 문장은 지운다). 그런데 그러면
// 안내문이 구하라고 한 값도 못 쓴다 — 운영 테스트(2026-09-19) 중화 적정 보고서가 적정 부피는 적고도 식초의 산도를
// 끝내 계산하지 않았다("본문에서 수치 계산을 제시하지 않아 직접 비교하지 못했다").
//
// 그래서 AI가 식을 먼저 적게 한다(calculations). 식의 숫자는 이미 쓸 수 있는 숫자이거나, 이름을 붙여 밝힌 교과서
// 상수(몰질량 같은 것)여야 한다. 코드가 식을 다시 계산해 AI가 적은 답과 맞는 것만 본문에 쓸 수 있는 숫자로 더한다.
// 앞 계산의 답은 뒤 계산의 식에 쓸 수 있다(몰 농도 → 질량 백분율 → 표시값과의 오차).

const MAX_CALCULATIONS = 16;
const UNIT_FACTORS = ['1', '10', '100', '1000', '1000000'];
// 교과서에 늘 나오는 상수. AI가 constants에 밝히지 않고 써도 지어낸 숫자가 아니다. 운영 테스트 17: 아세트산 몰질량 60.05를
// 밝히지 않아 산도 계산과 그 뒤가 모두 떨어졌다. 몰질량(아세트산·NaOH·HCl·물·CO2·NaCl·포도당·H2SO4·CaCO3),
// 중력가속도, 물의 비열, 기체 상수, 표준 상태 기체 1몰 부피.
const TEXTBOOK_CONSTANTS = ['60.05', '60.1', '60', '40', '40.00', '36.46', '36.5', '18', '18.02', '18.0', '44', '44.01', '58.44', '58.5',
  '180', '180.16', '98', '98.08', '100.09', '9.8', '9.81', '4.18', '4.184', '4.2', '0.082', '0.0821', '8.31', '8.314', '22.4',
  '3.14', '3.1416', '3.14159', '6.28', '6.283', '39.48', '39.478', '9.87', '9.8696'];  // π, 2π, 4π², π²
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
    // 단위 바꾸기(mL→L ÷1000, 백분율 ×100)의 10의 거듭제곱은 출처를 따지지 않는다. 운영 테스트 12(2026-09-19): 맞게 계산한
    // 몰 농도·산도·오차율이 「÷ 1000」 때문에 모두 떨어졌다.
    const known = new Set([...extended, ...UNIT_FACTORS, ...TEXTBOOK_CONSTANTS.map(canonical), ...constants.map((one) => canonical(one.value))]);
    const numbers = expression.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [];
    // 단위를 미리 바꿔 적은 숫자(35.93 mL → 0.03593 L, 5 mL → 0.005 L)도 아는 숫자다. 운영 테스트 14에서 맞는 산도 계산이
    // 이것 때문에 떨어졌다. 아는 숫자에 10의 거듭제곱을 곱하거나 나눈 값인지 본다.
    const knownOrShifted = (number) => known.has(canonical(number))
      || [1, 2, 3, 4, 5, 6].some((power) => known.has(canonical(Number((Number(number) * 10 ** power).toPrecision(12))))
        || known.has(canonical(Number((Number(number) / 10 ** power).toPrecision(12)))));
    const computed = evaluateExpression(expression);
    const why = !/^-?\d+(?:\.\d+)?$/.test(result) ? '답이 숫자가 아님'
      : computed === null ? '식을 읽을 수 없음'
        : !numbers.every(knownOrShifted) ? '식에 출처 없는 숫자'
          : !sameResult(computed, result) ? '답이 식과 다름' : '';
    if (why) { rejected.push({ what: clip(raw?.what, 60), expression, result, why }); continue; }
    constants.forEach((one) => extended.add(canonical(one.value)));
    // 검산을 통과한 식의 숫자(36.0 mL를 리터로 바꾼 0.0360 등)도 본문에 쓸 수 있다. 운영 테스트 19: 본문에 식을 풀어 쓴
    // 「0.1×0.0360=0.00360 mol」 문장이 0.0360 때문에 지워졌다.
    numbers.forEach((number) => extended.add(canonical(number)));
    addRounded(extended, computed);
    // 뒤 계산은 앞 답의 **절댓값**을 그대로 쓰기도 한다(차이 -0.2079… → 상대오차 0.2079… ÷ 4.5). 운영 테스트 16.
    [computed, Math.abs(computed), Number(result), Math.abs(Number(result))].forEach((value) => extended.add(canonical(value)));
    // 단위에 답 형식 조각이 붙어 오기도 했다(「%p},{」, 운영 테스트 19).
    verified.push({ what: clip(raw?.what, 60), constants, expression, result, unit: clip(String(raw?.unit ?? '').split(/["{}[\],]/)[0], 20) });
  }
  return { allowed: extended, verified, rejected };
}

// 검산을 통과한 답이 본문에 「4.3236%」처럼 자릿수가 길게 나오면 유효숫자 세 자리로 줄인다(4.32%). 운영 테스트 18:
// 측정값은 0.05 mL 눈금인데 산도를 소수 넷째 자리까지 적었다.
export function shortNumber(text) {
  const value = Number(text);
  const decimals = (String(text).split('.')[1] || '').length;
  // 소수 셋째 자리 이상이면서 유효숫자가 넷 이상인 것만 줄인다(0.00144·14.33·0.0392 는 그대로).
  const significant = String(text).replace(/^-/, '').replace('.', '').replace(/^0+/, '').length;
  if (!Number.isFinite(value) || decimals < 3 || significant <= 3) return String(text);
  return Math.abs(value) >= 1 ? String(Number(value.toFixed(2)).toFixed(2)) : String(Number(value.toPrecision(3)));
}

export function tidyCalculatedNumbers(body, verified) {
  let out = String(body || '');
  for (const one of Array.isArray(verified) ? verified : []) {
    for (const raw of [one.result, String(Math.abs(Number(one.result)))]) {
      const short = shortNumber(raw);
      if (short === raw) continue;
      const pattern = new RegExp(`(?<![\\d.])${raw.replace(/[.]/g, '\\.')}(?!\\d)`, 'g');
      out = out.replace(pattern, short);
    }
  }
  return out;
}

export function calculationPromptLines() {
  return [
    '- 안내문이 구하라고 한 값(농도·산도·속력·효율·오차율 등)을 학생 숫자로 계산할 수 있으면, 본문을 쓰기 전에 calculations에 식으로 먼저 계산한다. 계산이 필요 없으면 빈 배열이다.',
    '- calculations의 expression은 숫자와 + - × ÷ ( )만 쓴 한 줄 식이다(단위·글자 없이). 식의 숫자는 학생입력·결과정리·기준값·안내문·1차 설계서의 숫자, 앞 계산의 result, 또는 constants에 이름과 함께 적은 교과서 상수(몰질량 등)만 쓴다. result는 식의 값을 유효숫자 세 자리로 반올림한 숫자다(예: 4.3236 → 4.32, 0.17640 → 0.176). 측정값이 0.05 mL 눈금인데 답을 소수 넷째 자리까지 적는 것은 정밀도를 부풀리는 것이다.',
    '- 한 계산에는 단위 바꾸기를 여러 번 섞지 않는다. 예: ① 몰 농도(M) = 0.1 × 36.0 ÷ 5 → 0.72, ② 산도(%) = 0.72 × 60.05 ÷ 10 → 4.32, ③ 오차율(%) = (4.5 - 4.32) ÷ 4.5 × 100 → 4. 단위 바꾸기를 한 식에 여러 번 섞으면 자릿수가 틀리기 쉽다. 앞 단계의 result를 다음 식에 그대로 쓴다. 단, 리터로 바꾸기·블랭크 빼기 같은 작은 손질만 따로 떼어 칸을 쓰지 않는다 — 칸은 최대 16개이고, **안내문이 구하라고 한 값과 기준값 비교가 먼저**다.',
    '- 코드가 식을 다시 계산해 맞는 계산의 result만 본문에 쓸 수 있다. 본문에는 계산 과정(무엇을 무엇으로 나눴는지)과 result를 함께 쓴다.',
    '- **calculations에 없는 계산 결과를 본문에 쓰면 그 문장은 통째로 지워진다.** 농도, 산도, 비율, 오차율처럼 본문에 쓸 계산값은 하나도 빠짐없이 calculations에 먼저 넣는다. 비율(예: 72.1 ÷ 36.0)도 계산이다.',
    '- 기준값이 있으면 계산한 값과 나란히 놓고 차이와 오차율(%)을 calculations로 계산해 비교한다. 비교하라는 안내문인데 기준값이 비어 있으면, 계산한 값까지 쓰고 "기준값을 옮겨 적으면 바로 비교할 수 있다"를 한계에 쓴다.',
  ];
}
