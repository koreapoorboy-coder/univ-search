# (B) 재태깅 → 관측축 파이프라인 인계문 (새 Code 세션)

> 이 문서 하나로 **재태깅 스트림**을 이어받는다. 큰 그림은 `HANDOFF_B_MASTER.md`. 관측 태그 정본은 `TAG_DICTIONARY_v1.md`.
> HEAD 시점: `daee3d42` (== origin, 동기화됨). 미커밋 8은 세션 밖 무관 파일(zip·_P0_·.claude).

## ▶ 세션 인계 (2026-08-06, 새 로컬 세션 진입점)
- 🔴 **리포 위치 이전**: 정본 = **`C:\Users\user\projects\scshstudy`** (로컬, OneDrive 아님). OneDrive `바탕 화면\scshstudy` 사본은 **은퇴 대상 — 건드리지 말 것**. 이유·검증: 메모리 `repo-location-local-projects`. (OneDrive 폴더백업이 바탕화면을 삼켜 .git dehydrate→꼬임. GitHub `d2a85b3a` push 확인 후 로컬 사본 ff-pull로 최신화 완료, tracked 2359 일치.)
- ⚠ 이 문서·`HANDOFF_B_MASTER.md`·스크립트의 `OneDrive\바탕 화면` 경로 하드코딩은 **미갱신**. projects 경로로 고칠 것(to-do).
- **✅ 닮음(3) 5단원째 완결** (커밋 `1bc4e002` + 등재 후속). set04=닮음(3), item_id `M2_SIMPY_150_S04_Q###`.
  - **태깅**: `B_tagging_m2_similarity_set04.v1.json`(67유형·150문항·관측52종, 검수 PASS) + `_QA.v1.md`.
  - **기준화해(중요)**: 검수 39재사용/13신규(**관측 union 209 기준**) vs Code 38재사용/14매핑필요(**축매핑풀 197 기준**). 차 1건=`midpoint_length_relation_error`(관측풀엔 있고 축매핑풀 미등재). **오산 아님·기준차**. 검수 승인. 규칙 메모리 `observed-vs-axismap-pool-basis`. → 축매핑 대상 **14**(신규13+midpoint).
  - **맵**: `B_tag_axis_map_similarity3_new.v1.json`(14종, 검수확정). 분포 C1·2/C2·5/C3·2/C4·5. isosceles_altitude_bisection_overlooked **C2**(검수 B1→C2). converse 2종(pythagorean/parallelism)=**C3, alt=C2**(cyclicity의 alt B3 미승계·개별판단, 경우분류 성분 없음).
  - **반영**: `B_reflection_m2_similarity_set04.v1.json`(150문항, tag_scope 배분, item_id=set04 조인, 미해결태그 0).
  - **rationale 충실도**(1문항유형 7개: 2·19·26·30·55·56·57): 전부 문제특정·태그근거 충실. under-doc 2건(유형2 seg_ratio·유형55 pythagorean)=베이스태그 유효하나 rationale 미명시, **축매핑 무관 각주**.
  - **856 등재(뼈대만)**: 검수결정=mathflat 81 canonical, error_tags 보류. 생성: `data/raw_taxonomy/m2_similarity.raw_taxonomy.v1.json`(81섹션) + `data/problem_types/m2_similarity.problem_types.v1.json`(81, `status:raw_registered_not_wired`). **pending**: 예측 error_tags 부착·concept_ids 상속·set04 source_type_label(관측67)↔mathflat81 crosswalk. OBSERVED층과 별개(§9).
- **✅ 닮음(8) 6단원째 완결** (set09, 동일 유닛 M2_SIMILARITY_PYTHAGORAS). item_id `M2_SIMPY_150_S09_Q###`.
  - **★사전 v2 100% 작동**: new_tags **0**. 51유형·150문항·관측48종 전량 축매핑 풀 존재 → **신규매핑 0, 전부 승계**(닮음3 midpoint 갭이 similarity3_new로 메워져 이번엔 갭 없음). 재사용률 삼각비6 3%→닮음3 75%→닮음8 100%.
  - **파일**: `B_tagging_m2_similarity_set09.v1.json`(검수 PASS) + `B_reflection_m2_similarity_set09.v1.json`(150문항, tag_scope 58배분, item_id 조인, 미해결0). Code탭 독립검증 PASS(3태그44·2태그7·avg2.86). 반영축분포 C1·99/C3·64/C4·44/C2·41.
  - **원 전용 태그 정당 사용**(피타고라스+원 혼합 후반): tangent_radius_perpendicularity_omitted·central_angle_to_arc_ratio_failure·area_inradius_relation_setup_failure·right_triangle_tangent_partition_failure·spatial_cross_section_identification_failure. 사전서 꺼내 씀(신규 아님).
  - **856 등재**: set04와 동일 유닛 → mathflat 81 raw_taxonomy/problem_types **공유, 재생성 불필요**.
  - 맵 파일 없음(신규0).
- **✅ 삼각비(무번호) 7단원째 완결** (set01=`260711_삼각비.pdf`, 삼각비(6)=set07과 다른 학습지). 삼각비는 기존 유닛(856 아님)→반영만. item_id `M3_TRIG_150_S01_Q###`.
  - 37유형·150문항·관측53종, new_tags **0**, 전량 축매핑 풀 존재→승계(신규0). 전 유형 3태그(avg 3.0). 사전 v2 재사용 100%.
  - **파일**: `B_tagging_m3_trigonometric_ratio_set01.v1.json` + `B_reflection_m3_trigonometric_ratio_set01.v1.json`(미해결0). Code탭 독립검증 PASS.
  - **축분포 광폭**(삼각비 특성): A2·29(특수각 암기)·B2·15·C1·73·D3·26 등 A1·A3·E1·E2 뺀 전축 등장. 닮음(C편중)과 대조적 변별폭.
  - ⚠ **삼각비 set 구분**: set01=무번호 / set07=(6) / set11=(10, 72문항). 정본명에 set번호 명시.
- **✅ 삼각비(10)=set11 8단원째 완결** (72문항, `260711_삼각비(10).pdf`). item_id `M3_TRIG_72_S11_Q###`. 5유형·72문항·13종, new_tags **0**(세 번 연속 100%: 닮음8→삼각비무번호→삼각비10), 전량 풀 존재→승계. 파일 `B_tagging_m3_trigonometric_ratio_set11.v1.json`+`B_reflection_..set11.v1.json`(미해결0). 독립검증 PASS(3태그4·2태그1). 축분포 C1·45/D3·28. 구조특이(유형5개, 유형4·5가 절반씩)=학습지 특성, 반영 지장 없음.
- **✅ 함수(5)=set06 9단원째 완결** (첫 대수 계열, `260710_함수(5).pdf`, m2_linear_function 기존유닛→856 불필요). item_id `M2_LF_50_S06_Q###`.
  - 50유형·50문항(각1)·44종, 재사용26·**신규18**. tag_scope 없음(전부 1문항). 독립검증 PASS. NOT-IN-POOL=18=선언 new_tags 정확일치, 재사용26 풀갭 0.
  - **맵 `B_tag_axis_map_M2LF_new.v1.json`(18종)**. 분포 C1·4/C4·3/C3·4/C2·3/B2·2/B3·2.
  - **★그래프↔식 변환 판례**(검수 질의, 후속 함수단원 기준): 3분 — ①순수 형태변환(식형↔식형·이동→계수갱신)=**C4** ②해석적 역추론·연결(그래프거동↔매개변수, 부호역추론, 다진술판정)=**C3** ③원자적 개념혼동(기울기부호=증감·절댓값=가파름)=**C2**. 기준=대상동일·표기만변경→C4 / 개념 이어 추론→C3 / 한개념 오이해→C2.
  - **함수 첫 축 실측**(반영 항목레벨): C1·23/C3·20/C4·17/B3·6/C2·6/B2·4/D1·4/A3·3/B4·3/D3·3/B1·1/E1·1. **닮음(C4·C1·C2·C3·B거의無)과 대조: 함수는 매개변수 범위(B2)·경우(B3) 실측 등장.**
  - 검수확정 대기(맵 review_status=CODE_DRAFT).
- **다음 할 일** (검수 큐): ① **함수(8)=48** 반영 — 로컬 마지막(태깅 미시작). ② **예측 error_tags 부착** = M2_SIMPY 87에 적용. 조사완료: vocab 유닛별 bespoke, 닮음 템플릿=`m2_geometry_properties`(소수 광개념), geometry 스타일+concept 파생 권고. 검수 판정 대기. ③ crosswalk는 이미 id조인 완료(source_item_links)=신규작업 없음. ④ 856 나머지(다항식·이차함수·도형성질)=PDF 로컬 부재, 사용자 확보 대기.
- **✅ crosswalk 후속조사 완료 — 이름매칭 불필요로 판명**:
  - 조인 실체 = **`source_item_links/`** (아이템별 `item_id → primary_problem_type_id` **id 조인**, concept_ids·mapping_confidence 0.98·`review_status: verified_against_problem_answer_and_solution`). 닮음 set04/09 링크 **이미 존재**(patch209).
  - 닮음 실 canonical = **`M2_SIMPY_PT###`**(unit `M2_SIMILARITY_PYTHAGORAS`, 닮음+피타고라스 **87유형**), `type_variant_bank`가 id+type_name 정의, links/coverage/duplicate_map/source_bank가 참조. → **관측 reflection(item_id) → links → M2_SIMPY_PT 로 id 조인. §5 금지 이름매칭 안 함.**
  - 🔴 **경정정**: 내 mathflat 등재(`m2_similarity`, M2_SIMILARITY, 닮음만 81)는 **유닛 canonical 아님** = 플랫폼 뷰. `superseded_note` 표시. 완료 유닛(수와식)은 links의 primary_problem_type_id가 problem_types 파일로 해소되나 닮음은 정의파일만 부재였음.
  - **✅ M2_SIMPY problem_types 뼈대 등재**(검수결정): `data/problem_types/m2_similarity_pythagoras.problem_types.v1.json`(87유형, type_variant_bank+links id조인, concept_ids 87/87, `error_tags=null`, `status:raw_registered_not_wired`).
  - **유일 pending = 예측 error_tags 상속원**(검수결정=지금은 보류). **✅상속 패턴 조사(완료 5유닛)**: ①error_tags 100% 채움(null 0) ②**vocab 유닛별 bespoke**(교차겹침 0~15%, 대부분 0%) — 공유 통제어휘 없음 ③스타일 2갈래: **다수(geometry·probability·quadratic·polynomial)=소수(12~20) 광범위 개념슬러그 고반복** / NE·linear만 대규모 세분(100+). "core"는 error_tag 아님(앞 grep 오탐 정정). ④**닮음 템플릿 = `m2_geometry_properties`**(14종: parallel_lines·angle_chasing·triangle_congruence·triangle_center·length_area·diagonal_property·proof_structure·auxiliary_line…) — 도메인 정합. 권고: geometry 스타일로 소수 광개념 vocab 신규(닮음/피타고라스 특화: similarity_ratio·area_volume_ratio·pythagorean·midpoint_connector·right_triangle_altitude 등), M2_SIMPY concept_ids(53종) 정렬. **wholesale 상속 불가(bespoke), 알고리즘=geometry모델+concept파생.**
  - default_difficulty·전체유형 완성(워크시트 미커버 PT177까지)도 후속.

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
