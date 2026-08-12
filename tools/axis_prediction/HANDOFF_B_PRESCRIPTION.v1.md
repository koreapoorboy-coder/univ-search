# (B) no_template 처방 저작 인계문 (새 Code 세션 진입점)

> 이 문서 하나로 **처방 저작 스트림**을 이어받는다. 리포 = `C:\Users\user\projects\scshstudy` (OneDrive 아님).
> 검수(별도 Claude)는 **리포 접근 없음(§0)** — 넘길 것은 Downloads 복사 + SendUserFile + 인라인 붙여넣기. 링크는 검수에 안 보인다.
> 근거등급 [코드확인]/[실측]/[추정] 표기, [추정]을 다음 단계 전제로 쓰지 말 것. 한 번에 한 트랙. 커밋+푸시(푸시 누락 3회 전례).

작성 2026-08-11. 진입 시점: **M2_GEOM 처방 32/140 완료(3/14 카테고리).**

---

## 0. 지금 당장 할 일 (이어받기)
**M2_GEOM 4번째 카테고리 = 삼각형의 외심(C011-C014, PT033-044, 12종)부터 저작 이어가기.**
작업파일 `tools/axis_prediction/m2_geom_prescriptions.draft.v1.json`의 `prescriptions`에 엔트리를 append하고 `_meta.progress`·`new_tags`·`reuse_note` 갱신 → 커밋.

먼저 읽을 것: ① 이 문서 ② 작업파일 `_meta`(저작기준·재사용우선순위 명문) ③ `tools/axis_prediction/TAG_DICTIONARY_v2.md`(163종 사전).

---

## 1. 큰 그림 (왜 이걸 하는가)
- 최종목표 = 실답안 기반 **태그 세분화**. 그 전에 no_template 단원에 **전용 처방이 없어** 오염(예: 도형에 일차함수 처방) 또는 억제(suppressed_reason=no_template_for_unit) 중.
- **스코프 = 332종** (기하 4단원, instruction_map에 엔트리 존재하는 것):
  `M2_GEOMETRY_PROPERTIES 140` → `M1_SOLID_GEOMETRY 83` → `M1_BASIC_GEOMETRY 55` → `M1_PLANE_GEOMETRY 54`. **M2_GEOM부터, 단원별.**
- similarity_pythagoras·circle·trig, 수연산 739 = **별도 스코프**(instruction_map 엔트리 부재 or 재태깅 선행). 지금 안 함.
- 방침 = **(나) 전량 저작**. M1 기하 3단원은 overlay 부재라 error_code 신설·`observed_basis:false` 성격 강함(검수 확정).

## 2. 저작 = 기존 엔트리 8필드 교체 (신규 생성 아님)
- 332종은 이미 `part04`(`data/display/problem_type_instruction_map_parts/problem_type_instruction_map.part04.v1.json`)에 엔트리가 있다(오염된 내용). **8 내용필드만 교체**:
  `problem_nature · required_thinking[] · must_write_steps[] · common_wrong_actions[] · error_checkpoints[{error_code,label,diagnosis,student_fix}] · student_command · teacher_note · parent_message`
  + `matched_template_id:null · match_score:null · draft:true · revision:1 · observed_basis:(bool)`.
  나머지(grade·course·unit_id·unit_name·type_name·visible_path·taxonomy_levels·concept_ids)는 **보존**.
- **엔진 [코드확인]**: `math_weakness_engine.js getWrongAnswerDiagnosis`(359-376행)가 엔트리 인라인 8필드를 직접 렌더. `matched_template_id:null`이면 결함① 게이트 통과(억제 안 됨). studentActionTemplates 22종은 렌더 경로 미소비. draft/revision 미노출(명시필드 선택). → **null 안전·정답.**
- **part04는 아직 무변경.** 140 완료 → 검수 제출 → 병합(140 인라인Edit 대신 병합 스크립트) → 게이트 해제 → 대조. 백업 존재: `tools/axis_prediction/_backup/part04.pre-geom-rewrite.6a63ee99.json`(커밋 2640e479).

## 3. error_code 규칙 (검수 확정 — 작업파일 _meta에도 있음)
**재사용 우선순위(4-tier, overlay가 사전보다 앞):**
1. **이 유형 자신의 fine_error_tags** (overlay·observed_basis:true인 유형)
2. **M2_GEOM overlay 36종** (same-unit 관측 어휘, dict에 없어도 우선)
3. **TAG_DICTIONARY_v2** §1범용13→§2도형공통32→§3원35 (3순위 사전 건너뛰지 말 것)
4. **신설** (new_tags에 tag+사유1줄 보고)

**통합/분리 기준:** 같은 오류·대상만 다름 → **통합**(예 삼각형+다각형 내각합=`interior_angle_sum_error`). 다른 정리·관계 → **분리**(외각정리↔외각합). 애매하면 통합.
**접미 관례:** `_failure`(85)·`_error`(37)·`_omitted`·`_confusion`·`_misapplied` 등 사전 관례. **대문자·도메인접두 금지.**

**M2_GEOM overlay 36종 태그**(2순위 풀): `grep -oE '"[a-z][a-z_]+"' data/axis_map/m2_geometry_properties.pt_fine_error_tags.v1.json` 로 재추출. dict엔 없는 관측 전용: circumcenter_equidistance_relation_failure · circumcenter_perpendicular_bisector_relation_failure · incenter_angle_bisector_relation_failure · parallelogram_condition_converse_failure · quadrilateral_hierarchy_classification_failure · triangle_congruence_condition_selection_failure. **외심·내심 저작 시 이 관측 태그 재사용.**

## 4. observed_basis:true = 27종 (fine_error_tags 보유, 전부 계산·추론)
PT023·026·029 / 038·041·044(외심) / 047·050·053(내심) / 055 / 067·071·074(평행사변형) / 077·080·083·086·089·092·134(여러사각형) / 100·103·104(도형증명) / 107·116(활용) / 119 / 140.
→ 이 27종은 **자기 fine_error_tags가 1순위**. 나머지 113종 false. 로스터: `tools/axis_prediction/_m2geom_roster.tsv`(id|cat|concept|type_name|error_tags).

## 5. 남은 M2_GEOM 11 카테고리 (108종)
외심12(C011-14) · 내심9(C015-17) · 중심3(C018) · 사각형기초3(C019) · 평행사변형18(C020-24) · 여러사각형21(C025-30) · 도형증명15(C031-34) · 활용12(C035-38) · 종합6(C39-40) · 각관계와합동3(멀티concept) · 종합활용3(멀티concept).
- 개념당 3~4유형(오류형/조건적용/계산추론/±증명서술). required_thinking·must_write_steps는 **개념내 골격공유**, student_command·parent_message는 **유형별 구분**(요건 B).
- `proof_reasoning_order_failure`(신설)를 도형증명(C031-34)에서 재사용할 것(안 되면 통합 대상 — 검수 확인).

## 6. 중간 제출 & 완료 절차
- 3~4 카테고리마다 중간 제출(현재 32/140 1회 제출함). 검수가 볼 것: new_tags 통합 일관성 · 재사용률 tier분해(overlay/사전/신설) · 골격공유 표본 · student_command·parent_message 구분.
- **140 완료 시 제출물**: new_tags 전량+사유 · 재사용률(tier분해) · observed_basis 분포(true27/false113) · 처방 없이 남은 유형 목록.
- 그 후: part04 병합 → stage-1 게이트에서 `M2_GEOMETRY_PROPERTIES` 해제(`template_unit_map.v1.json` no_template_units에서 제거) → **실사용 1건 대조**: 억제됐던 오답 4건(문항 10·19·36·37)에 억제 대신 실제 처방이 나오는지 [실측]. 그 4건 유형 = 10번 PT041·19번 PT077·36번 PT080·37번 PT065/PT074(흔들림). **PT041·PT080은 observed_basis:true → 관측 근거로 검증 / PT077·PT065·PT074는 false → 내용 적정성만.**

## 7. 병렬로 살아있는 다른 트랙(참고, 지금 건드리지 말 것)
- **레버 A(범주 2단계) 워커 `catstage-a2b`**: 재현성 90%미달 대응으로 stage-2를 범주 2단계화. 파일 전달·배포 대기 상태였으나 검수가 처방 저작로 피벗. **배포·2회실측 미완(파킹)**. VERSION `2026.08.11-catstage-a2b`. 재개 시 판정기준 문서 `B_type_stability_leverA.v1.md`.
- 진단 워커 정본: `public/math-weakness-engine/worker_skeleton/math_diagnosis_worker.js`(로컬 node 없음, 배포는 사용자 대시보드).

## 8. 최근 커밋 (origin/main)
bf87b200 처방3/14 성질 · 89d36f2d 처방2/14 합동 · f5b66ca3 처방1/14 기본각관계 · 3e3154af 통합4→3 · 035770e5 인계문§11 · ae388d94 dict_v2 · 2640e479 part04백업 · 6a63ee99 catstage-a2b파싱수정.

## 9. 핵심 파일
- 작업파일: `tools/axis_prediction/m2_geom_prescriptions.draft.v1.json` (32/140, _meta에 규칙)
- 사전: `tools/axis_prediction/TAG_DICTIONARY_v2.md` (163종)
- 로스터: `tools/axis_prediction/_m2geom_roster.tsv`
- overlay(관측태그): `public/math-weakness-engine/data/axis_map/m2_geometry_properties.pt_fine_error_tags.v1.json` (27유형/36태그)
- 유형정의: `public/math-weakness-engine/data/problem_types/m2_geometry_properties.problem_types.v1.json` (140/40concept/14cat)
- instruction_map: `.../problem_type_instruction_map_parts/part04.v1.json` (M2_GEOM 엔트리, 병합대상)
- 엔진: `public/math-weakness-engine/assets/math_weakness_engine.js`
