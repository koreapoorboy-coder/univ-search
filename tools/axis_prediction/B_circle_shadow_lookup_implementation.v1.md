# 원의 성질 Shadow 조회 경로 구현 보고 v1

- 작성일: 2026-08-28
- 최종 갱신: 2026-08-29
- 대상 단원: `M3_CIRCLE_PROPERTIES`
- 상태: 로컬 구현·검증 완료, 미배포
- D1 쓰기: 0건
- 학생 화면 출력: 없음

## 1. 구현 결과

원의 성질 문항은 기존 `problem_type_id` 유형 판정 단계를 거치지 않고 별도 Shadow 경로로 들어간다. 이 경로는 D1 `user_items`의 pending 문항과 정적 `item_axes` 레지스트리를 조회해 내부 관측 기록만 만든다.

Shadow 결과는 기존 `engineDiagnosis`, 처방, 보강문제 생성, 최종보고서 입력에 합치지 않는다. 학생용 프로필에도 포함하지 않는다. 저장되는 값에는 `student_output:false`, `profile_eligible:false`, `diagnostic_authority:false`, `remediation_eligible:false`가 유지된다.

## 2. 조회 흐름

1. 워커가 원의 성질 제출 문항에서 문항 번호·응답 상태·문제 본문·학생 풀이 관측을 추출한다.
2. AI 출력에는 `user_item_id`를 요구하지 않는다.
3. 워커가 후처리로 D1 pending 문항을 조회한다.
4. 동일 단원 안에서 `qnorm.v1` 본문이 완전히 같고 후보가 하나일 때만 연결한다.
5. 연결된 D1 문항의 `unit_id`, `question_text`, `answer`, `explanation`으로 `normalized_item_content.v1` 해시를 계산한다.
6. 브라우저 엔진이 정적 레지스트리의 ID·단원·해시를 다시 검증한다.
7. 검증 성공 시 `item_axes_ref`와 학생 풀이 관측을 `axis_records.attempts[].shadow_analysis`에만 보존한다.

본문이 없거나 동일 후보가 여러 개이거나 해시가 다르면 ID를 붙이지 않는다. 각각 `unlinked`, `ambiguous`, `invalid`로 남긴다.

## 3. 정적 레지스트리

- 전체: 2,168문항
- 축 판정 있음: 2,168문항
  - 통합 검증 작업팩: 1,129문항
  - 그림 기반 통합 검증 작업팩: 1,004문항
  - 기존 검증 표본: 35문항
- 축 미판정: 0문항
- 판정 완료율: 100%
- 레지스트리 SHA-256: `7F2B6A9B19B83FC61D13BD4D457B47CF65F94D2C1B016973887717F5B678A156`

레지스트리는 앱 시작 때 읽지 않고 원의 성질 Shadow 시도에만 지연 로드한다.

## 4. 학생 풀이 상태와 evidence

`student_work_text`의 생략, `null`, 빈 문자열을 서로 다르게 보존한다.

- 실제 원문 있음: `observed`
- 학생이 쓰지 않았다는 별도 관측과 근거 있음: `absent`
- 필드 생략·명시적 빈 값·읽기 불가·모순: `unresolved`

`failed_steps`가 들어오는 경우에만 다음을 검사한다.

- `evidence.source`가 `student_work_text`
- `evidence.quote`가 실제 학생 원문에 포함됨
- 확실/애매 이산 등급
- 애매이면 사유 필수

검사 실패 시 문항을 버리지 않고 `unresolved`로 보존한다.

## 5. 기존 학생 화면 차단

- Shadow를 기존 `engineDiagnosis`에 합치지 않음
- 후속 AI 요청 전 Shadow 내부 필드 제거
- Shadow 전용 기록은 `profile_eligible:false`
- 로컬 학생 목록·학생 프로필·서버 프로필 응답에서 Shadow 전용 기록 제외
- 원의 성질 문항은 legacy 등록문항/유형 매칭 대상에서 제외
- 처방 및 보강문제 생성에 사용하지 않음

기존 단원은 기존 유형 기반 경로를 그대로 사용한다.

## 6. 검증 결과

자동검사 `Test-CircleShadowRuntime.mjs` 결과:

- 오류: 0건
- 레지스트리 2,168건 로드 및 축 미판정 0건 확인
- 정상 ID·해시 연결 확인
- 해시 불일치 시 `invalid` 및 ID 제거 확인
- 풀이 필드 생략 시 `work_field_omitted` 확인
- Shadow 전용 학생 프로필 비노출 확인
- 워커 해시와 레지스트리 해시 일치 확인
- HTML 인라인 스크립트 문법 확인 4건
- D1 쓰기 0건 확인

기존 다중 단원 회귀검사도 `PASS=49, FAIL=0`이다.

## 7. 현재 남은 한계

로컬 D1 추출본 2,168문항에는 `concept_ids`가 연결된 문항이 0건이다. 따라서 현재 Shadow는 문항 연결·축 조회·학생 풀이 관측을 내부에 쌓을 수 있지만, 개념별 점수 누적과 처방 확정은 하지 않는다. 이 경우 `concept_ids_missing`으로 남는다.

또한 문항 연결은 안전을 위해 본문 완전동일·단일후보만 허용한다. D1 본문에만 `그림 정보:` 서술이 있고 학생 제출에서 그 서술을 얻지 못하면 `unlinked`가 될 수 있다. 잘못 연결하는 대신 미연결 신호를 보존하는 동작이다.

D1 읽기 전용 확인 결과 `M3_CIRCLE_PROPERTIES`의 2,168문항은 ID 누락·중복과 문제·정답·해설 누락이 모두 0건이다. D1에는 별도 `item_axes`·`item_analysis_registry`·`user_item_analysis`·`failed_steps` 테이블이 없고 관련 기존 테이블은 `axis_records` 하나다. 승인된 1단계 계약대로 문항 축은 정적 레지스트리에서 조회하고, 학생 풀이에서 생긴 Shadow 관측만 기존 `axis_records.attempts`에 저장한다.

## 8. 변경 범위

- `public/math-weakness-engine/manifest.json`
- `public/math-weakness-engine/assets/math_weakness_engine.js`
- `public/math-weakness-engine/assets/math_verification_flow.js`
- `public/math-weakness-engine/assets/math_axis_accumulation.js`
- `public/math-weakness-engine/worker_skeleton/math_diagnosis_worker.js`
- `public/math-weakness-engine/index.html`
- `public/math-weakness-engine/hybrid.html`
- `public/math-weakness-engine/data/item_axes/m3_circle_properties.item_analysis_registry.shadow.v1.json`
- `tools/axis_prediction/.artifact_build/workpacks_2133/build_circle_shadow_registry.mjs`
- `tools/axis_prediction/scripts/Test-CircleShadowRuntime.mjs`

## 9. 이번 작업에서 하지 않은 것

- 워커 배포
- 실제 D1 저장 또는 스키마 변경
- 기존 레코드 소급 변경
- 학생 화면 처방 출력
- `item_axes`, `item_analysis_registry`, `user_item_analysis`, `failed_steps` D1 테이블 생성
- `concept_ids` 추정 생성
