# 관측층 배선 설계안 v1 (2026-08-07)

> 검수 발견(Worker가 이미 problem_types를 프롬프트에 주입)으로 (b)안 저비용화. error_tags=null 보류의 전제(예측층 자산) 정정 → problem_types.error_tags = **Worker 입력 + 엔진 매칭** 경로. 이게 관측층↔런타임 어휘 정합의 최단로.

## 0. 검수 3건 확인 결과
| # | 질문 | 결과(코드확인) |
|---|---|---|
| 1 | 재태깅 태그를 pt.error_tags에 넣으면 기존 어휘(1199)와 충돌? | **ADD면 무충돌·교체면 파손.** diagnosis_rules는 `trigger.error_tags_any`(거친 1199)로 매칭(엔진:544). 거친 태그를 그대로 두고 fine을 **별도 필드**로 추가하면 기존 규칙 무영향 |
| 2 | pt.error_tags를 지금 무엇이 읽나(전수) | **Worker + 엔진 양쪽.** Worker=현재 `{id,name}`만 뽑음(주입 안함, 241행). 엔진 `_tagsFor`(288)=`pt.error_tags`+observed 합쳐 tagStats(528)·규칙(544)·route(298/307)·severity(549) 소비 |
| 3 | 유형당 태그 수 · MAX_ENUM_TYPES 청킹 | 청킹 상한 600(worker `MAX_ENUM_TYPES`·`chunkList`). 재태깅 2~3태그/유형. 유형 목록이 이미 프롬프트 bulk라 태그 추가분은 상대적 소량, 청크가 상한 보장 |

## 1. 주입 방식 = ADD (별도 필드), 교체 아님
- 기존 `problem_types[].error_tags`(거친 1199, diagnosis_rules 소비)는 **그대로 둔다.**
- 재태깅 fine 태그(321종)는 **새 필드 `problem_types[].axis_error_tags`**(가칭)로 추가.
- 이유: 한 필드에 거친+fine 섞으면 (a)diagnosis_rules가 fine을 못 매칭해 잡음, (b)Worker가 어느 어휘를 낼지 불명확. **분리하면 소비처별로 명확.**

## 2. 기존 diagnosis_rules와 공존 = 무회귀
- diagnosis_rules(A스키마)는 `pt.error_tags`(거친)만 매칭 → **fine 필드 추가해도 발화 불변.**
- ⚠4단원(GP·PB·QF·TR) B/C스키마 규칙은 별건 이슈(미소비)라 이 배선과 독립. **역설: 이 4단원은 태그진단 공백이라 fine 축 경로의 최대 수혜.**
- Worker 주입: **fine 태그를 후보 블록으로 프롬프트에 추가**(assignTypesForUnit, 수 줄). Worker가 fine observed_error_tags 생성 → 아래 c1이 소비.

## 3. 17축 소비처 (c1) 관계 = "태그 들어오면 축은 맵으로"
경로: `pt.axis_error_tags`(fine) → Worker 프롬프트 주입 → `observed_error_tags`(fine 생성) → **엔진 신규 axisStats 루프가 fine태그→17축 매핑**(재태깅 321→17축 맵을 data JSON으로 로드) → `observed_axes` 신규 출력키.
- 엔진 변경(c1, 소규모, tag_stats 선례 복제): `_axesFor(attempt,pt)` 헬퍼 + axisStats 집계(:528 루프 옆) + diagnose 반환에 `observed_axes` 1키 + global_logic 로딩에 축맵 JSON 1줄.
- 렌더러: `renderObservedAxes()` + 축→설명문 맵(선택, 초기엔 JSON만도 가능).
- **핵심**: 축은 fine태그가 들어와야 붙는다. 그래서 (b)Worker fine주입 + (c1)축경로 **병행 필수**(검수 판정 확증).

## 4. 데이터 준비 = 관측 태그를 problem_type에 조인
- 재태깅 관측 = 워크시트 문항단위(B_reflection, item_id별 fine태그). problem_types = 유형단위.
- 조인 = `source_item_links`(item_id → primary_problem_type_id). 문항별 fine태그를 problem_type_id로 집계 → `pt.axis_error_tags`.
- ⚠커버리지 = 내 재태깅 워크시트가 링크된 problem_type만. 부분(시범엔 충분). 미재태깅 유형은 빈 배열.

## 5. 단계적 적용 (시범 → 확대)
1. **시범 1단원**(RC 실수 권장: 유닛완비·재태깅 1set·격차 명확): axis_error_tags 필드 채움 + Worker fine주입 + 엔진 axisStats + observed_axes 출력. 기존 진단 무변경 확인.
2. **검증**: 시범 단원 학생 답안(샘플)으로 observed_axes가 나오는지·17축 분포가 관측 대조와 맞는지.
3. **확대**: 11단원 → 전 단원. 축맵(321→17)·조인 자동화.
4. **4단원 이슈 병합 판단**: GP·PB·QF·TR은 이 축 경로가 태그진단 공백을 메우는지 확인 후 B스키마 회생과 비교.

## 6. 미결/설계 질문
- **거친 vs fine 이원화 장기**: 진단 규칙(거친)과 축(fine)이 계속 별도 어휘로 갈지, 축맵을 통해 통합할지.
- **Worker enum vs 자유생성**: fine을 enum으로 강제(스키마 개정)할지 프롬프트 유도만 할지. 유도만으로 1차 시도 가능(검수).
- **조인 granularity**: 워크시트 유형(2~3태그) vs mathflat problem_type 종수 차이. 집계 규칙 확정 필요.
- **A스키마 규칙 실화력**: 런타임 학생데이터 없어 실측 불가(정적 뒷받침 99~100%만 확인).

## 7. Worker 품질 대비 (격차 발견에 추가)
- Worker = **claude-opus-4-8·effort high가 학생 답안 직접 판독** → observed_error_tags 생성. 실제 오류 관찰.
- 예측층 axis_rules = **mathflat 유형명 regex만** 봄(문항 안 봄).
- ⇒ **D2·E1 격차가 큰 근본이유**: 예측은 유형명 표면어로 축 부착(무게중심→D2·주어진→E1), Worker/관측은 실답안 보고 실오류 배정. 신호 품질이 근본적으로 다름. (B_pred_vs_obs_20units·B_E1_gap_diagnosis에 이 대비 반영.)
