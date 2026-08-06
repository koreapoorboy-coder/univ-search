# (B) 재태깅 → 관측축 파이프라인 인계문 (새 Code 세션)

> 이 문서 하나로 **재태깅 스트림**을 이어받는다. 큰 그림은 `HANDOFF_B_MASTER.md`. 관측 태그 정본은 `TAG_DICTIONARY_v1.md`.
> HEAD 시점: `daee3d42` (== origin, 동기화됨). 미커밋 8은 세션 밖 무관 파일(zip·_P0_·.claude).

## ▶ 세션 인계 (2026-08-06, 새 로컬 세션 진입점)
- 🔴 **리포 위치 이전**: 정본 = **`C:\Users\user\projects\scshstudy`** (로컬, OneDrive 아님). OneDrive `바탕 화면\scshstudy` 사본은 **은퇴 대상 — 건드리지 말 것**. 이유·검증: 메모리 `repo-location-local-projects`. (OneDrive 폴더백업이 바탕화면을 삼켜 .git dehydrate→꼬임. GitHub `d2a85b3a` push 확인 후 로컬 사본 ff-pull로 최신화 완료, tracked 2359 일치.)
- ⚠ 이 문서·`HANDOFF_B_MASTER.md`·스크립트의 `OneDrive\바탕 화면` 경로 하드코딩은 **미갱신**. projects 경로로 고칠 것(to-do).
- **닮음(3) 진행 중** — 파일 `_inbox/tagging_similarity3_v4.json`(+QA리포트) 착. 검수 판정 PASS.
  - **✅ Code탭 독립검증 완료**(scratchpad `verify_sim3.ps1`, ASCII전용·PS ConvertFrom-Json; py/node/jq 없음): 67유형/150문항/1~150연속/52종/한글0/tag_scope 26태그·48배정·범위내·유형내중복0 — **구조 전부 검수와 일치**.
  - 🔴 **재사용 split 1건 불일치**: 검수 39재사용/13신규 vs 재현 **38/14**. flip = **`midpoint_length_relation_error`**. 삼각비(6)에서 고려됐다 Q137서 제거(§5)돼 **어떤 맵에도 축매핑 없음**(전 맵 grep 무매치). 닮음(3)선 유형6·12·25·26·29·33…+Q28 scope에 실사용 → **승계 두면 축 구멍**. **매핑 대상 = 13 아니라 14**(신규13 + 미매핑 midpoint_length_relation_error). ⚠ 검수에 이 갭 회신 필요.
- **다음 할 일** = Task #2(1문항유형 7개 rationale 충실도)→#3(신규14 축매핑, 재사용37 승계·재배정금지)→#4(반영+856 raw_taxonomy 등재+커밋). 검수 지시: converse류(pythagorean_converse_condition_failure·parallelism_converse_ratio_test_failure)는 원 `cyclicity_converse_angle_condition_failure`(C3) 선례 참조. tag_scope 48건 그대로 반영.

## ⏱ 첫 5분
- **목표**: 각 단원 150문항을 재태깅(오류형)→17진단축(관측층)에 매핑→문항단위 반영. PREDICTED(팩)와 별개층.
- **완료 4단원**: 수와식(5)·원의성질(12)·원의성질(6)·삼각비(6). 전부 커밋·push.
- **다음 = 닮음**(도형의 닮음 3 또는 8). 856 첫 케이스(아래 §닮음 특수성).
- **관측층은 초안(draft). 프로덕션 병합 보류** — 조건: 단원 더 쌓여 새 사각지대 안 나오면.

## 🔁 파이프라인 (단원당 반복)
1. **재태깅** = 검수측(GPT 비전)이 PDF 읽어 유형·정답률·오류형 태그·tag_scope 생성 → `_inbox/`에 저장, 파일명만 Code탭에.
2. **Code탭 검증**: 유형수·문항수·1~N연속·태그수·tag_scope(태그 존재·범위내) 독립 재현. 정답률은 `source_item_bank`의 `observed_accuracy_percent`와 대조(오전사 슬립 잡음).
3. **통합사전 조회**(★필수): `TAG_DICTIONARY_v1.md`/기존 맵과 **의미 대조**. 같은 오류 다른 이름 → 기존 이름 통합(축배정 前). 재사용률 재측정.
4. **신규 태그만 17축 매핑**(기존 승계·재배정 금지). confident/boundary tier.
5. **검수 리뷰** → 확정.
6. **문항반영**: tag_scope로 유형태그→문항 배분(scoped=지정문항, else=유형전체). item_id는 `source_item_bank`(source_file 매칭)로 조인.
7. **커밋·push**: 태깅json + 맵 + 반영 묶음.

## 📂 산출물 파일 (커밋됨)
| 단원 | 태깅 | 맵 | 반영 |
|---|---|---|---|
| 수와식(5) | `B_tagging_m2_number_expression_set5.v1.json/.md` | `B_tag_axis_map_M2NE.v1.json`(v3, 91종) | `B_reflection_m2_number_expression_set5.v1.json` |
| 원의성질(12) | `B_tagging_m3_circle_properties_set12.v1.json` | `B_tag_axis_map_M3CP.v1.json`(27) | `B_reflection_m3_circle_properties_set12.v1.json` |
| 원의성질(6) | `B_tagging_m3_circle_properties_set6.v1.json` | `B_tag_axis_map_M3CP_circle6new.v1.json`(28) → **통합 `M3CP.v2.json`(55)** | `B_reflection_m3_circle_properties_set6.v1.json` |
| 삼각비(6) | `B_tagging_m3_trigonometric_ratio_set6.v1.json` | `B_tag_axis_map_M3TR_new.v1.json`(신규54) | `B_reflection_m3_trigonometric_ratio_set6.v1.json` |
- **통합 사전**: `TAG_DICTIONARY_v1.md` (§4 통합결정·§6 재사용률·§7 경계 중기재검토).

## ✅ 확정된 규율
- **관측층 별개**: 맵/반영은 OBSERVED. predicted_axes와 같은 필드 저장 금지(§9). 안 그러면 predicted vs observed 대조 무의미.
- **재사용률**: 같은/인접단원 66.7%, 교차도메인 낮음. **20% 실패선**(사전 커지면 올라야 정상). 닮음(원·삼각비 인접)에서 재확인.
- **ratio_direction_inversion = E3**(B4→E3 통일, 수와식·원). "몇 배 답 방향 뒤집기"=답 마무리.
- **축 커버리지 15/17 관측**. 미등장 **A1·E2**만. A2 첫 실측=삼각비 `special_angle_trig_value_recall_error`(암기형).
- **단원별 편중**: 수와식 D / 원 C / 삼각비 광폭 → 진단축 변별력 실증.
- **검수 flow**: Code탭 매핑 → 검수 리뷰 → 확정 → 커밋. 경계는 억지 배정 말고 boundary 표시.

## 🔴 닮음 특수성 (다음, 앞 4단원과 다름)
- 닮음(3·8) = **300문항 전부 856**(raw_taxonomy 유형 미등재). 유형·정답률·기존태그 **전무**.
- 재태깅 세션엔 **PDF만** 주면 됨(대조할 기존 CSV 없음). 결과로 유형·정답률·축 처음부터.
- ⚠ **추가 단계**: 856은 재태깅 후 그 유형을 **raw_taxonomy에 신규 등재**해야 팩 예측축이 붙음(관측층 넘어 예측층까지). 앞 4단원(태그없음/주제형)엔 없던 단계.
- 소스 PDF `260711_도형의 닮음(3)/(8).pdf`는 **로컬 부재**(12개 부재 목록 중). 확보 필요.

## ⛔ 미결 / 대기
- **프로덕션 병합**(관측층→실 source_item_links): 보류. 3~4단원 더 + 새 사각지대 안 나오면.
- **경계 40% 누적**(수와식33·원1248·원6·삼각44): 3~4단원 후 일괄 재검토(같은 경계선 C1/C3·C2/C4 묶어 판례). `TAG_DICTIONARY §7`.
- **856/1655/150 트랜치**: 미완 소스 PDF 12개 부재(`B_worklist_pdfs.v1.csv`). 856 6개(닮음·다항식·이차함수·도형성질) 우선.
- **A1·E2 미등장**: 다른 단원서 나오는지 관찰.

## ⚠ 환경 함정 (꼭 지킬 것)
- **PS5.1이 .ps1을 ANSI로 읽어 한글 리터럴 깨짐** → 스크립트는 **ASCII만**, 한글 경로·매칭은 **명령줄 인자/인라인**으로. `if(){}#한글주석\nelse`도 깨짐(주석 빼고 elseif 구조).
- **Downloads 첨부 파일은 Code탭 디스크에 실재 안 함**(Read는 내용만) → cp 실패. **`_inbox/` 저장** 또는 내용 재수록. (메모리 `file-transfer-workflow`)
- **Code탭→사용자 파일**: 넘길 것만 `Downloads`에 복사(전부 X). (메모리)
- **`Run-AxisPrediction.ps1` 27행 Desktop 경로 하드코딩** — OneDrive로 고쳐 실행(scratchpad 사본).
- **`source_file` 매칭**: 닮음(3)=`*(3).pdf`, 삼각비(6)=`*(6).pdf` 식. 다운로드 사본 접미사 "(1)" 무시.
- 스크립트는 세션 scratchpad에 있음(재현 시 재작성).

## 🧰 재현 스크립트 패턴 (scratchpad, ASCII)
- 검증: 태깅 파싱·tag_scope 무결·정답률 대조.
- 반영: 3개 맵 통합 조회 + tag_scope 배분 + item_id 조인 → `ConvertTo-Json -Depth 6`.
- 통합스캔: 신규태그 ↔ 기존 vocab 공유토큰≥2로 후보 추출(false positive는 수동 제거).
