# P0-01 Multi-Unit Runtime Binding Fix — 결과 보고

## 1. 수정한 파일 목록
- `public/math-weakness-engine/assets/math_verification_flow.js` (유일한 소스 변경, +116 / −18)

신규 추가(테스트/문서, production 코드 아님):
- `public/math-weakness-engine/_multi_unit_binding_test.html` (mock 엔진 픽스처)
- `public/math-weakness-engine/_multi_unit_realdata_test.html` (실 canonical 데이터 픽스처)
- `public/math-weakness-engine/_multi_unit_probe.html` (버전 무관 before/after 프로브)
- `public/math-weakness-engine/_P0_01_regression.txt` (before/after 기록)

## 2. 수정한 함수 목록
- `MathVerificationFlow._ensureUnitsForAttempt(attempt)` — 전면 재작성
- `MathVerificationFlow._hasUnitId(v)` — 신규(“존재” 정의 헬퍼)
- (그 외 함수·클래스 무변경)

## 3. 기존 문제 원인
`_ensureUnitsForAttempt` 는 top-level `attempt.unit_id` **하나만** 로드 대상에 넣고,
문항별 로딩은 `problem_type_id` 접두어를 index 의 `unit_id` 와 `startsWith` 로 대조하는
**역추정 경로만** 사용했다. 그러나 실제 ID 체계는 접두어가 다르다:
`unit_id = M2_LINEAR_EQUATION` vs `problem_type_id = M2_LE_PT001` → `startsWith` 실패.
따라서 여러 단원이 섞인 시험에서 AI 가 문항별 `unit_id` 를 정확히 판정해도, top-unit 이 아닌
단원은 로드되지 않아 그 문항의 `problem_type_id` 가 `problemTypeById` 에서 해소되지 않고
`missing` 처리되어 **최종 진단에서 조용히 누락**됐다.

실측(baseline, 3단원 혼합 시험): 로드된 단원 `[M2_LINEAR_EQUATION]` 뿐 · `missing_type_count=2`
· 진단된 문항 `[1]` (문항 2·3 유실). → `_P0_01_regression.txt` BEFORE.

## 4. 수정 후 authority 우선순위
문항(및 top-level)별로:
1. **P1 — 명시 `unit_id`**(top-level `attempt.unit_id` + 문항별 `attempts[].unit_id`)를 최우선 authority.
   - [존재 정의] `unit_id` 가 문자열이고 `trim()` 후 비어있지 않을 때만 ‘존재’. `null`/`undefined`/`""`/공백만 = 부재 → P2 로.
   - 명시 `unit_id` 가 있으면 그 문항엔 P2·P3 추정을 적용하지 않는다.
2. **P2 — canonical lookup**(이미 로드된 `problemTypeById[problem_type_id].unit_id`).
3. **P3 — legacy 접두어 추정**(`startsWith`) — 마지막 fallback.
- 아무 단원 신호도 없을 때만(순수 legacy attempt) 종전대로 전 단원 로드(`load_all_fallback`).

**fail-closed(추측 금지)** — 없는 데이터를 다른 단원으로 매핑하지 않는다. 상태:
- `UNKNOWN_UNIT` — 명시 `unit_id` 가 index(canonical runtime)에 없음.
- `UNIT_DATA_NOT_AVAILABLE` — index 에 선언됐으나 데이터 파일 부재(로드 실패). 엔진 `skipped_units` 와도 일치.
- `PROBLEM_TYPE_NOT_FOUND` — 단원은 로드됐으나 그 `problem_type_id` 가 없음. *(추가 5: §4 는 unit 부재만 다뤘음)*
- `UNRESOLVED_UNIT` — 단원 자체를 못 정함(명시 없음·추정 실패).

**[추가 4] unit_id ↔ canonical 불일치**: authority 는 `unit_id` 로 유지하되 `unit_id_canonical_mismatches`
에 기록하고 `console.warn` 으로 telemetry 남김(AI 오판정이 영구히 안 보이는 것 방지).

**[추가 1 — 문항 수 보존]** `attempt_accounting`:
`total(N) == diagnosable_count + unresolved_count` (`conserved:true`).
각 문항을 진단 가능 / fail-closed 로 **정확히 1회** 분류 → fail-closed 문항이 보고서 집계에서 조용히 사라지지 않음.

**중복 방지**: 입력 순서를 유지하는 stable dedup(`Set` + 순서 배열)으로 같은 단원은 한 번만 로드.

반환/노출(감사·다운스트림용, scoring 무관): `attempt._unit_binding = { resolved_unit_ids,
unresolved_units, load_all_fallback, unit_id_canonical_mismatches, attempt_accounting }`.

## 5. 추가/수정한 fixture 목록
- `_multi_unit_binding_test.html` — mock 엔진. CASE A~F + H(공백 unit_id) + I(불일치) + J(유형 부재) + G(보존).
  각 케이스에 **문항 수 보존 불변식** 검사 포함.
- `_multi_unit_realdata_test.html` — 실 canonical 데이터. multi-unit 3단원 + CASE F(M3_CIRCLE_PROPERTIES) + 보존.
- `_multi_unit_probe.html` — 버전 무관 프로브(로드된 단원·missing_type_count 관측).

## 6. fixture PASS / FAIL
- `_multi_unit_binding_test.html`: **PASS = 49 / FAIL = 0** → `VERDICT: PASS — MULTI_UNIT_RUNTIME_BINDING_FIXED`
- `_multi_unit_realdata_test.html`: **PASS = 11 / FAIL = 0** → `VERDICT: PASS — REALDATA_MULTI_UNIT_OK`
- `_multi_unit_probe.html`(수정본): **OK** (3단원 전부 로드 · missing 0 · `conserved:true`)

## 7. 기존 regression test 결과
- **자동 테스트 러너 없음**: 저장소에 `package.json`/npm test 등 실행 가능한 자동 러너가 없다.
  → “기존 자동 regression 없음”으로 명시 보고. 대신 **기존 브라우저 픽스처 `_state_test.html`** 을
  baseline(worktree HEAD)과 수정본 양쪽에서 실행해 대조.
- `_state_test.html` — BEFORE(baseline)·AFTER(수정본) **동일**: `missing_type_count=0` · `loaded_unit_count=6`
  · 4상태 정확 · 오답 문항 3,4,5,6. → **단일-단원 경로 회귀 없음.**
- baseline worktree 는 검증 후 `git worktree remove` 로 제거(현재 작업분 무접촉). 상세 = `_P0_01_regression.txt`.

## 8. production / UI / data 변경 여부
- **없음.** 소스 변경은 `math_verification_flow.js` 1개 파일의 `_ensureUnitsForAttempt`/신규 헬퍼로 한정.
- canonical taxonomy·problem type·concept·weakness scoring·remediation·verification question generation·
  Worker AI prompt·Claude 모델 설정·UI·학생 보고서 형식·difficulty·source ingestion **전부 무변경**.
- 반환/노출 필드(`attempt._unit_binding`)는 **추가만**(기존 scoring 은 미지의 필드를 무시). 로딩 결정 경로만 수정.

## 9. 발견했지만 이번 패치에서 수정하지 않은 문제
- **fail-open 전제 2곳(코드 주석 명시)**: 문항 회계의 `isLoaded`/`ptKnown` 은 각각
  `engine.unitData`/`engine.problemTypeById` 가 **없는** 구현에서는 확인 불가로 보고 통과(true) 처리한다.
  즉 그런 엔진에서는 `UNIT_DATA_NOT_AVAILABLE`·`PROBLEM_TYPE_NOT_FOUND` 가 발동하지 않는다.
  현재 `MathWeaknessEngine` 은 둘 다 제공(로드 후 `problemTypeById` 재색인)하므로 실동작 영향 없음.
  다른 엔진 구현으로 교체 시 이 전제를 재확인해야 한다.
- **fail-closed 문항의 보고서 렌더링**: `attempt_accounting`(진단 불가 문항 목록)을 데이터로는 노출했으나,
  학생/교사 보고서 UI 에 “진단 불가 N문항”을 표시하는 것은 **§3 UI 무변경 범위 밖**이라 이번 패치에서 제외.
  **후속 P0-02 UI 패치**에서 `math_hybrid_report_renderer.js` 에 표시 권장(데이터는 이미 준비됨).
  ⚠ 이 패치는 **런타임 바인딩 계층 한정**이며, 사용자 가시 증상(보고서에서의 문항 누락 노출)은
  P0-02 UI 패치 전까지 잔존한다.
- **canonical 파일 부재 단원 3종**(M3_CIRCLE_PROPERTIES · M3_STATISTICS · M2_SIMILARITY_PYTHAGORAS):
  index 에 선언돼 있으나 `data/problem_types/*.json` 부재. §8 지시대로 **이번 패치에서 생성하지 않음**(별도 패치).
- **P2 canonical lookup 의 pre-load 데이터원 부재**: `index.v1.json` 은 단원별 파일 경로만 갖고
  problem_type→unit 사전-로드 맵이 없어, P2 는 “이미 로드된 단원”에 대해서만 동작(그 외엔 P3 로 degrade). 기록만.
- 그 외 §8 명시 별도 항목(M2_LE/M2_EQ·M2_LI/M2_INEQ concept ID mismatch, M3_TRIG_C001 중복,
  M3 trig instruction, weakness scoring redesign, difficulty normalization) — **미접촉**.

## 10. Acceptance Criteria
- [x] attempt.unit_id 가 항상 problem_type prefix inference 보다 우선 — CASE A · CORE · I
- [x] mixed-unit 시험에서 필요한 모든 unit 로딩 — CASE B · realdata · probe
- [x] 동일 unit 중복 로딩 없음 — CASE C
- [x] explicit invalid unit 을 다른 unit 으로 추측하지 않음 — CASE E
- [x] canonical data 없는 unit 도 추측하지 않음 — CASE F · realdata F
- [x] legacy attempt 의 기존 fallback 유지 — CASE D1(추정) · D2(load-all)
- [x] unit_id 가 downstream weakness engine 까지 보존 — CASE G
- [x] unrelated taxonomy/data/scoring/UI 변경 없음 — §8
- [x] 모든 신규 fixture PASS — 49 + 11
- [x] 기존 관련 regression PASS — _state_test BEFORE == AFTER
- [x] **[추가] 문항 수 보존 N == 진단가능 + 진단불가(fail-closed)** — 전 케이스 `conserved:true`

## 판정
**PASS — MULTI_UNIT_RUNTIME_BINDING_FIXED**

## 권장 commit message
```
fix(math-engine): honor attempt.unit_id as unit-loading authority (P0-01)

_ensureUnitsForAttempt used only problem_type_id prefix inference for
per-question unit loading, but ID schemes differ (M2_LINEAR_EQUATION vs
M2_LE_PT001), so mixed-unit exams silently dropped questions whose unit
was not the top unit. Establish authority order: explicit attempt.unit_id
(top-level + per-question) → canonical problemTypeById lookup → legacy
prefix inference. Fail-closed on unresolved/absent units (no substitution;
UNKNOWN_UNIT / UNIT_DATA_NOT_AVAILABLE / PROBLEM_TYPE_NOT_FOUND /
UNRESOLVED_UNIT). Treat blank unit_id as absent; record unit_id↔canonical
mismatches to telemetry. Add per-question conservation accounting
(N == diagnosable + fail-closed) so dropped questions are never silent.
Loading/binding path only — no taxonomy/scoring/UI/data changes.
```
