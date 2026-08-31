# 도형의 성질 Shadow 조회 경로 구현 보고 v1

- 작성일: 2026-08-31
- 대상 단원: `M2_GEOMETRY_PROPERTIES`
- 상태: 로컬 구현·검증 완료, 미배포
- 실제 D1 쓰기: 0건
- 학생 화면 출력: 없음

## 1. 구현 결과

도형의 성질 2,340문항의 최종 축을 정적 Shadow 레지스트리로 만들고 기존 진단 경로 옆에 병렬로 연결했다.

도형의 성질은 기존 `problem_type_id` 기반 진단이 이미 작동하므로 원의 성질과 다르게 처리한다.

- 원의 성질: 유형 없이 Shadow로 진입
- 도형의 성질: 기존 유형 진단·처방을 유지하면서 새 축을 내부 관측

두 경로를 같은 집합으로 처리하지 않고 `SHADOW_UNIT_IDS`와 `TYPE_FREE_SHADOW_UNIT_IDS`를 분리했다. 이에 따라 도형의 성질은 legacy 유형 매칭에서 제외되지 않는다.

## 2. 정적 레지스트리

| 항목 | 결과 |
|---|---:|
| 전체 문항 | 2,340 |
| 원본 문항 | 2,265 |
| 별칭 문항 | 75 |
| 문항당 축 | 4 |
| 유효 축 인스턴스 | 9,360 |
| assessed | 9,341 |
| unjudgeable | 19 |
| 누락 | 0 |
| 운영 조회 대상(approved) | 1,980 |
| 보관 레코드(archived) | 360 |
| approved 단일후보 연결 가능 | 1,978 |
| approved 복수후보 | 2 |

75개 별칭 문항은 축을 복제하지 않는다. 별칭 자신의 `user_item_id`와 `content_hash`를 먼저 확인한 다음 `axes_ref_user_item_id`가 가리키는 원본 축을 읽는다. 별칭 참조가 끊기거나 단원이 다르면 `registry_axes_ref_invalid`로 닫힌다.

운영 D1 읽기 전용 실측은 `approved=1,980`, `archived=368`, `pending=0`이다. archived 368건에는 정적 레지스트리에 없는 테스트 8건이 포함되므로 레지스트리 내부 보관 문항은 360건이다. 도형의 성질 Shadow 연결기는 approved 1,980건만 조회하고 archived 문항은 사용하지 않는다. approved 중 본문 단일후보는 1,978건이고 복수후보는 2건이다. 복수후보는 AI 유형이나 정답률로 억지 선택하지 않고 `ambiguous`로 보존한다.

## 3. 런타임 흐름

1. 기존 Worker가 도형의 성질 문항의 단원과 유형을 종전 방식으로 판정한다.
2. 기존 등록 문항 매칭과 `problem_type_id` 교정도 그대로 실행한다.
3. 별도 Shadow 연결기가 D1 approved 문항만 읽기 전용으로 조회한다.
4. `qnorm.v1` 본문 완전일치·단일 후보만 `user_item_id`에 연결한다.
5. `normalized_item_content.v1` 해시가 정적 레지스트리와 일치할 때만 축을 읽는다.
6. Shadow 결과는 `axis_records.attempts[].shadow_analysis`에만 보존한다.
7. 기존 `engineDiagnosis`, 학생 화면, 프로필 점수, 처방에는 합치지 않는다.

## 4. 호환성과 안전장치

- 기존 `problem_type_id` 유지
- 기존 도형의 성질 진단·처방 유지
- Shadow `student_output:false`
- Shadow `profile_eligible:false`
- Shadow `diagnostic_authority:false`
- Shadow `remediation_eligible:false`
- 전체 축 객체는 저장 레코드에 복제하지 않고 참조만 저장
- 해시 불일치·별칭 참조 실패는 `invalid`로 보존
- 학생 풀이 evidence 계약 실패는 문항을 버리지 않고 `unresolved`로 보존

## 5. 구현 중 발견해 바로잡은 해시 경계

D1의 기존 `user_items.content_hash`는 qnorm.v1 중복·멱등 검사용이다. 축 재판정용 `normalized_item_content.v1`과 목적과 계산식이 다르다. 최초 후보가 이 두 값을 같은 것으로 취급해 런타임 해시 검사에서 불일치가 발생했고, 실제 저장·배포 전에 회귀검사로 발견했다.

다음과 같이 바로잡았다.

- D1 기존 `content_hash`를 축 해시로 사용하지 않음
- `unit_id`·`question_text`·`answer`·`explanation`에서 NFC 기반 축 해시를 별도 재계산
- 운영 D1에서 `answer NULL=0/빈 문자열=1`, `explanation NULL=0/빈 문자열=443` 실측
- 2,340건 축 해시 전량 재계산 일치
- Worker 계산값과 정적 레지스트리 해시 일치 확인

이 수정 과정에서도 D1 쓰기는 발생하지 않았다.

## 6. 자동검사 결과

### 도형의 성질 Shadow 검사

- 레지스트리 2,340건 로드: 통과
- 원본 2,265건·별칭 75건: 통과
- 유효 축 9,360개·누락 0개: 통과
- 원본 문항 조회: 통과
- 별칭 문항 조회와 원본 축 참조: 통과
- 별칭 해시 불일치 fail-closed: 통과
- Worker 본문 완전일치 단일후보 연결: 통과
- Worker 복수후보 `ambiguous` 보존: 통과
- 기존 `problem_type_id` 보존: 통과
- 학생 프로필 비노출: 통과
- Shadow 연결기 쓰기 SQL 없음: 통과

### 회귀검사

- 원의 성질 Shadow 런타임: 통과, 오류 0
- item axis spec v2: 통과, 오류 0
- Worker·브라우저 엔진 JavaScript 문법: 통과
- manifest JSON 구문: 통과

## 7. 변경 파일

- `public/math-weakness-engine/data/item_axes/m2_geometry_properties.item_analysis_registry.shadow.v1.json`
- `public/math-weakness-engine/manifest.json`
- `public/math-weakness-engine/assets/math_weakness_engine.js`
- `public/math-weakness-engine/worker_skeleton/math_diagnosis_worker.js`
- `tools/axis_prediction/B_geometry_axis_spec.v2.finalized.json`
- `tools/axis_prediction/.artifact_build/geometry_independent_review/build_geometry_shadow_registry.mjs`
- `tools/axis_prediction/scripts/Test-GeometryShadowRuntime.mjs`
- `tools/axis_prediction/scripts/Test-CircleShadowRuntime.mjs`

## 8. 이번 작업에서 하지 않은 것

- GitHub push
- Cloudflare Worker 배포
- 실제 D1 저장·스키마 변경
- 기존 D1 레코드 소급 변경
- 학생 화면 출력
- 처방 또는 학생 프로필 반영

다음 별도 게이트는 배포 전 최종 검증과 운영 배포다.
