/* qnorm.v1 — canonical 문항 텍스트 정규화. SINGLE SOURCE OF TRUTH (검수 승인 2026-08-14).
 * 정본 = ocr_measure.html 구 `norm`(NFKC형). 0.99 임계값을 실측한 도구 = 이것. 다른 구현을 정본삼으면 0.99 무효.
 * ★워커(math_diagnosis_worker.js)는 paste-deploy라 import 불가 → 아래 [CANONICAL CORE] 블록을 byte-identical 인라인.
 * ★변경 시 버전 올림(qnorm.v2) + dedup_key_norm_version 각인값 동반. 규칙 순서 고정(NFKC 먼저).
 * ★self-check는 해시 계산 직전 호출 → 불일치 시 계산 중단·에러(저장 금지). 경보 아닌 차단(검수 2026-08-14).
 */

// ==== [CANONICAL CORE] BEGIN — 이 블록은 워커 인라인 사본과 반드시 동일 ====================
var QNORM_VERSION = 'qnorm.v1';

function qnormV1(s) {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/\^/g, '')
    .replace(/[×·]/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/[.,·、。]/g, '')
    .toLowerCase();
}

// 드리프트 차단용 고정 벡터. [입력, 기대출력]. 워커 인라인 사본과 동일해야 함.
// 빈값 규칙: qnormV1(null)==='' , qnormV1('')==='' (함수 레벨). ★해시 계산기는 ''이면 계산 안 함(null 유지) — 아래 hash 헬퍼.
var QNORM_V1_TESTVEC = [
  ['2 cm³',       '2cm3'],    // NFKC ³→3
  ['2 cm^3',      '2cm3'],    // ^제거 → cm3 (cm³와 동일 정규형)
  ['x²+1',        'x2+1'],    // NFKC ²→2
  ['x^2+1',       'x2+1'],    // ^제거
  ['a  b\tc',     'abc'],     // 공백류 제거
  ['1, 2. 3',     '123'],     // 문장부호·공백 제거
  ['3×4',         '3*4'],     // 기호통일 ×→*
  ['x⁶',          'x6'],      // ★NFKC 상첨자(match_lab 수동맵 누락분)
  ['ＡＢＣ１２３', 'abc123'],   // ★전각 NFKC 분해
  [null,          ''],        // ★빈값(null)
  ['',            '']         // ★빈값(공문자열)
];

// 전 벡터 통과 시 {pass:true}. 실패 시 {pass:false, index, input, expected, got}.
function qnormV1SelfCheck() {
  for (var i = 0; i < QNORM_V1_TESTVEC.length; i++) {
    var inp = QNORM_V1_TESTVEC[i][0], exp = QNORM_V1_TESTVEC[i][1], got = qnormV1(inp);
    if (got !== exp) return { pass: false, index: i, input: String(inp), expected: exp, got: got };
  }
  return { pass: true };
}
// ==== [CANONICAL CORE] END ==============================================================

// ---- 브라우저 글루 (워커는 이 아래를 인라인하지 않음) --------------------------------------
// 클라 도구(ocr_measure·match_lab·admin)가 <script src="js/qnorm.v1.js"> 로 로드해 window.qnormV1 사용.
if (typeof window !== 'undefined') {
  window.qnormV1 = qnormV1;
  window.QNORM_VERSION = QNORM_VERSION;
  window.QNORM_V1_TESTVEC = QNORM_V1_TESTVEC;
  window.qnormV1SelfCheck = qnormV1SelfCheck;
  // 로드 즉시 self-check(콘솔 경보) — 도구는 차단까지 필요 없으나 드리프트 조기발견.
  try { var _r = qnormV1SelfCheck(); if (!_r.pass) console.error('[qnorm.v1] SELF-CHECK FAIL', _r); } catch (e) {}
}
