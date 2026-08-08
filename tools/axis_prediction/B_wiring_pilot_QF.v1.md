# 배선 시범안 — QF(이차함수) (2026-08-07) ★실행 전 검수 승인 필요

> 검수 선정: QF는 B스키마 미소비라 진단 공백 → 축 경로 효과 순수 판별 + B회생과 나란히 비교 가능. 런타임 프로덕션이므로 **변경범위·롤백 명시, 승인 후 실행.**

## 조인 실현성 (확인됨)
- QF reflection item_id(`M3_QFUNC_150_S04_Q001`) = links item_id 일치. links가 `primary_problem_type_id`(예 `M3_QFUNC_PT004`) 보유. QF problem_types 176종.
- 경로: B_reflection_QF(item→fine태그) ⋈ links(item→PT_id) → PT별 fine태그 집계 → `pt.fine_error_tags`. 커버리지=set04+set10(300문항) 링크 PT만(나머지 빈 배열).

## 변경 범위 (파일별)
### 데이터 (QF 국한, ADD)
1. **`data/problem_types/m3_quadratic_function.problem_types.v1.json`**: 각 problem_type에 **새 필드 `fine_error_tags`** 추가(집계 결과). 기존 `error_tags`(거친) **무변경**.
2. **신규 `data/axis_map/fine_tag_to_axis.v1.json`**: 재태깅 321종 fine태그 → 17축 맵(B_tag_axis_map_*.json에서 생성). QF뿐 아니라 전역이나 파일 신설만.

### 코드 (프로덕션·**가산적**=기존 출력 무변경)
3. **`assets/math_weakness_engine.js`**(index.html 로드): 
   - `_axesFor(attempt,pt)` 헬퍼(fine태그→축, 맵 로드) — `_tagsFor` 옆.
   - diagnose 루프(:528)에 axisStats 집계 블록.
   - diagnose 반환(:564~)에 **`observed_axes` 신규 키 1개**.
   - `_loadGlobalLogic`에 축맵 JSON 로딩 1줄(`_optionalJson`).
   → **가산적**: 기존 top_concepts·tag_stats·wrong_answer_diagnoses 전부 무변경. `_tagsFor`는 `pt.error_tags`만 읽으므로(fine_error_tags 아님) **diagnosis_rules 매칭 무영향**.
4. **`worker_skeleton/math_diagnosis_worker.js`**(참조본): `fetchUnitProblemTypes`에 `fine_error_tags` 1줄 + `assignTypesForUnit` 프롬프트에 fine 후보 블록. ⚠**참조본 변경일 뿐, 실효는 사용자가 Cloudflare 배포해야 발생.**
5. (선택·후순위) 렌더러 `renderObservedAxes()` — 초기엔 생략, observed_axes는 교사용 JSON 덤프로만 확인.

## 단계 (프로덕션 위험 오름차순)
- **① 엔진 축경로 + 데이터 (Worker 배포·학생화면 변경 없음)** ← 가장 안전, 먼저
  - 데이터 2 + 코드 3 반영. observed_axes 출력만 추가(렌더 안 함).
  - **검증 = `debug.html`**: QF student_attempt JSON(fine태그 포함)을 손으로 붙여 `diagnoseWithGuidance` 직접 호출 → 반환에 observed_axes 나오는지·17축이 맞는지 확인. **Worker 불요**(debug.html은 Worker 우회).
  - 기존 진단 무변경 확인(QF 원래 공백+가산적이라 회귀 위험 최소).
- **② Worker 주입 (사용자 배포 필요)**: worker_skeleton 변경 → 사용자가 배포 → 실제 학생 답안이 fine 태그 생성 → 실데이터로 observed_axes.
- **③ B스키마 회생 (별도·같은 QF)**: QF diagnosis_rules의 `trigger_error_tags` → `trigger.error_tags_any` 필드명 수정(13규칙). 발화 여부 debug.html 확인. **①과 독립.**
- **④ 비교**: 축경로(①·②) vs B회생(③) → 어느 쪽이 QF 진단에 유용한지 → 확대 방향 결정.

## 롤백 경로
- 모든 변경 git 커밋 → **`git revert <commit>` 단계별.**
- 데이터(pt.fine_error_tags)=가산 필드, revert=필드 제거. 축맵 JSON=파일 삭제.
- 엔진=가산 블록(헬퍼+observed_axes키), revert=블록 제거. **기존 동작 무변경이라 clean.**
- Worker=참조본이라 리포 revert + 사용자 재배포로 원복.
- ⚠단계별 커밋 분리(데이터·엔진·worker·B회생 각각) → 부분 롤백 가능.

## 프로덕션 위험 평가
| 변경 | 위험 | 근거 |
|---|---|---|
| 엔진 axisStats+observed_axes | **낮음** | 가산적. 기존 출력 키 무변경. fine 데이터 없으면 빈 배열(무해). tag_stats 선례 복제 |
| QF pt.fine_error_tags | **낮음** | 신규 필드. `_tagsFor`는 error_tags만 읽음 → diagnosis_rules 무영향 |
| 축맵 JSON 신설 | **없음** | 신규 파일 |
| Worker 변경 | **사용자 통제** | 외부 배포. 리포 변경만으론 실효 없음 |
| B스키마 회생(③) | **중간** | 13규칙 실발화 = 학생 진단 바뀜. 규칙 내용 검수 판정 후(별건 이슈) |

## 실행 전 확인 요청 (검수)
1. **① 단계(엔진+데이터+debug.html 검증)부터 착수 승인?** — 가장 안전, 학생화면·Worker 무변경.
2. 축맵 파일 위치/이름(`data/axis_map/fine_tag_to_axis.v1.json`) OK?
3. fine_error_tags 집계 규칙(조인 granularity): PT별 **문항 fine태그 union**(중복제거) 기본안 — OK? (미결항목이라 시범서 실측 후 확정)
4. B회생(③)은 별건 이슈라 **①·② 검증 뒤** 착수 — 순서 OK?

**승인 오면 ①단계(엔진 가산 + QF 데이터 + debug.html 검증)만 먼저 실행하고 결과 보고 → ② 이후 재승인.**
