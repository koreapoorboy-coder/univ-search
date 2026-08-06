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
  - 맵 검수확정(REVIEWED_APPROVED): 18종 승인, 그래프↔식 3분 판례 승인(이차함수 적용), parallel_slope tier boundary/alt B1 조정.
- **✅ 함수(8)=set09 10단원째 완결 — 로컬 확보분 종료** (`260710_함수(8).pdf`, m2_linear_function 기존유닛). item_id `M2_LF_50_S09_Q###`.
  - 50유형·50문항(각1)·37종, new_tags **0**, 전량 풀 존재→승계(신규0). 독립검증 PASS(3=11·2=39). 축분포 C1·24/C3·22/C4·16/B3·9/B2·5.
  - **★함수(5) 신규18 실증**: 18종 중 **16(88.9%) 재등장** → 의미분석뿐이던 정당성이 타 학습지 재등장으로 실오류모드 확인. 미등장2(coincident_line_parameter_matching·slope_magnitude_graph_comparison)=특수문항용. 함수(8) 고유3(abstract_notation_application·extremum_selection·integer_candidate_enumeration_gap)도 사전 조달(신규0).
  - 방법론기록: GPT가 사전갱신 없이 직전산출(tagging_function5)을 "function-family previous authority"로 참조해 new_tags 0 달성 — 사전갱신 주기 지연 가능, 후속 적용.
- **✅ 닮음 예측축 실행 완료**(2026-08-06, `Run-AxisPrediction -Only GS` 단독, 27행 $PSScriptRoot 이식, temp CSV·엔진데이터 무변경): **239항목 100% 적중·미매칭 0·과다규칙(>60%) 0.** 팩=SM_GS **74규칙(D-GS-01~74) 전부 발화**(정정: 앞 "78"은 문자열 grep). 최다 공통 C-15×122·C-08×69(둘다 C1), 팩 D-GS-39(무게중심)×31·D-GS-20(평행선분)×20·D-GS-09(닮음조건)×16. **예측축 분포** C1·71.5%/D2·53.6%/C3·50.2%/C2·37.7%/C4·19.7%/B1·17.2%/E1·14.6%/B2·11.7%/B3·11.3%/E3·5.9%/E2·2.9%/B4·2.1%(항목당 다축). 최고 발화율 51%(<60)라 규율 신설 불요. 45재검증 불수반. ⇒ **닮음 예측층 건강, 이미 완비.**
- **✅ D2 예측-관측 격차 조사(첫 대조 실물, 검수 요청)**: 예측 D2=128/239(53.6%, 39/81 그룹, D-GS 팩규칙 무게중심 D-GS-39×31 등이 "공식적용"텍스트에 D2 부착) vs 관측 D2=17/300(5.7%, **law_selection_error×17 단독**; 풀의 다른 D2태그 solid_measure_formula_selection·volume_formula_misapplication·trig_table_value_selection·custom_operator = 닮음서 0회). 택소노미 불일치(예측 M2_SIM vs 관측 M2_SIMPY)로 항목단위 조인 없음=집계대조. **핵심**: 예측이 무게중심·넓이비·부피비를 D2(공식선택)로, 관측은 같은 주제를 C2(centroid_*개념)/C4(area_ratio·volume 변환)로 배정 → 층간 D2↔C2·C4 체계적 재배정. 🔴 **검수판정: ③정의불일치 주요인 + ②부분인정. 명세 수정 없음.** 근거=대응표(무게중심 예측D2/관측C2, 넓이·부피비 예측D2/관측C4)가 "누락 아닌 배정 차이"—관측이 문항 보고 다른 축 택함(rationale 근거 有, 타당). 예측은 mathflat 유형명 regex라 "무게중심" 단어만으로 D2 부착(학생 오류위치 모름). ②는 volume_formula 0회 사실이나 닮음 부피문항이 공식보다 비변환에서 갈려 관측 C4가 맞음(E1 사각지대와 구조 다름—그땐 관점 미관찰, 이번은 보고 다른축 선택). **명세 개정 불요**: "공식선택 보라" 지시하면 C2·C4로 정확히 잡히는 게 D2로 밀려 관측 품질 저하. **남은 PDF v4 그대로.** 🏁 **위치=고칠 결함 아니라 "대조 발견 1호"**: 예측층이 주제어 regex로 축 붙이는 방식의 한계 실증(프로젝트 목적이 이런 발견). [[predicted-observed-d2-gap]]. **후속(지금 아님)**: ⓐ예측층 정비 시 D-GS 팩 D2부착 규칙 재검토대상(D-GS-39·42·45·47·32·24). ⓑ타단원 대조로 D2격차가 닮음특유인지 전반인지 판별(원·삼각비·함수 예측축 산출→관측 대조)—남은 PDF 반영 후 착수.
- **✅ 이차함수(3)=set04 11단원째 완결** (856 트랜치 856:116+주제형:34, `260711_이차함수(3).pdf`). item_id `M3_QFUNC_150_S04_Q###`.
  - ★**유닛 완비 확인(검수 강조: type_variant 먼저)**: m3_quadratic_function은 type_variant_bank·source_item_links·problem_types(`M3_QFUNC_PT`) 전부 존재, links가 problem_types에 해소 → **856 등재 불필요**(닮음과 달리 predicted 인프라 완비).
  - 42유형·150문항·42종, 재사용26·**신규16**. 독립검증 PASS(3=35·2=7). NOT-IN-POOL=16=선언 new_tags 정확일치, 재사용26 갭0.
  - **맵 `B_tag_axis_map_M3QF_new.v1.json`(16종, 전량 C축)**: C1·5(재구성/복원)/C3·5(연결)/C4·3(변환)/C2·3(개념).
  - **★그래프↔식 3분 판례 첫 적용**(함수5 확정분 그대로): 완전제곱·평행이동식변환→**C4** / 부호↔이동방향·사분면·대칭점·증감구간·근↔절편→**C3** / 계수부호·폭·꼭짓점축식별·이차판별→**C2**. 검수 제시 후보와 실배정 일치 — 판례 무리없이 적용.
  - **반영**(축분포): C3·106(개념연결 지배)/C1·54/C2·34/D1·33/C4·24/B2·15/B3·11. 함수5(C11+B4)보다 C편중 — 이차=그래프변환·개념. 미해결0.
  - 검수확정 대기(맵 CODE_DRAFT).
- **✅ 이차함수(9)=set10 12단원째 완결** (같은 단원 2번째, `260711_이차함수(9).pdf`). item_id `M3_QFUNC_150_S10_Q###`. 유닛 완비(type_variant set10 존재)→856 불요. 19유형·150문항·27종, **new_tags 0**(이차함수3 신규16 중 12재등장, 두 학습지 겹침 26/27=사실상 전량 재사용), 전량 풀 승계. 독립검증 PASS(3=17·2=2). 축분포 **C3·124 지배**/C1·68/C4·26/B3·23 — 이차함수 C3 프로파일 재확인. 미해결0. 굵은 편성(19유형·평균7.9문항).
  - **패턴 4번째 확인**: 같은 단원 2번째 학습지 재사용률 100% (닮음3→8·함수5→8·삼각비무→10·이차함수3→9). 사전+직전산출 참조(authority_sources 명시) 안정 작동.
- **✅ 남은 5유닛 인프라 사전조사 완료(검수 요청) — 전부 완비, 856 등재 불요**(닮음이 유일 예외였음). links의 primary_problem_type_id가 problem_types에 전부 해소:
  | 단원 | code | PT스킴 | set / item_id | source_file(원본) |
  |---|---|---|---|---|
  | 다항식 | m3_polynomial_multiplication_factorization | M3_POLY_PT | set06→`M3_POLY_150_S06` / set10 | `260711_다항식의 곱셈과 인수분해(5).pdf` / `(13).pdf` |
  | 도형의성질 | m2_geometry_properties | M2_GEOM_PT | set07→`M2_GEOM_150_S07` | `260710_도형의 성질(6).pdf` |
  | 이차방정식 | m3_quadratic_equation | M3_QUAD_PT | set06→`M3_QUAD_150_S06` / set12 | `260711_이차방정식(5).pdf` / `(11).pdf` |
  | 실수 | m3_real_numbers_and_operations | M3_REAL_PT | set07→`M3_REAL_150_S07` | `260711_실수와 그 계산(6).pdf` |
  | 확률 | m2_probability | M2_PROB_PT | set06→`M2_PROB_150_S06` / set11 | `260711_경우의 수와 확률(5).pdf` / `(10).pdf` |
  ⚠ 도형성질만 260710(나머지 260711). 확률 unit=경우의수+확률. 전부 type_variant_bank·links·problem_types 존재→반영만(등재 무).
- **✅ 다항식(곱셈·인수분해)(5)=set06 13단원째 완결** (식조작 새 도메인, `260711_다항식의 곱셈과 인수분해(5).pdf`). item_id `M3_POLY_150_S06_Q###`. 유닛 완비→856 불요. 51유형·150문항·42종, 재사용33·**신규9**. 독립검증 PASS(3=49·2=2).
  - **맵 `B_tag_axis_map_M3POLY_new.v1.json`(신규9)**: C1·5(인수분해 조건세우기: 합곱·교차곱·완전제곱조건·묶음·무리수분리)/C4·2(치환·유리화 변환)/D3·1/A3·1(내림차순 정리).
  - **★verification_missing = E1 첫 실측**(Q21 오계산 역추적, 명세 §5-1). curated풀 부재→**89종 선례맵(B_tag_axis_map.v1) E1 승계**, M3POLY맵에 캐리. E1 사각지대 태그 관측 첫 등장. 🔹**검수 구분기록**: 수와식 E1 2건은 검수가 *다른 태그를 E1로 재배정*한 것 / 이번은 **정본 태그(verification_missing) 직접 사용** — 성격 다름(v2 E1 관점 신설 후 정본 첫 발화).
  - **square_formula_middle_term_error = D3/alt C2**(검수판단, triangle_area_sine_factor(½누락) 선례 그대로: 중항 ±2ab 계산실수 D3).
  - **반영 축분포 광폭+D편중**: C3·60/D1·50/C1·47/D2·46/D3·39/C4·24/A3·20/C2·14/B2·14/B3·11 + E1·1. 식조작=D(조작·공식·계산) 강세. 수와식 D편중 계열 확장.
  - ⚠선행: 잘못된 고등PDF(260712_다항식(5)) 반려 후 중3 재작업본, 고등태그 혼입0. 맵 CODE_DRAFT.
- **다음 할 일**: ① 순차 반영: 다항식(13)·도형성질(6)·이차방정식(5)·실수(6)·확률(5)(전부 완비·등재 불요). ② 예측 error_tags = M2_SIMPY 예측층 정비 시 재검토(별도). ③ D2 후속(타단원 대조)·관측층 병합(§미결) = 남은 PDF 반영 후.
- **✅ crosswalk 후속조사 완료 — 이름매칭 불필요로 판명**:
  - 조인 실체 = **`source_item_links/`** (아이템별 `item_id → primary_problem_type_id` **id 조인**, concept_ids·mapping_confidence 0.98·`review_status: verified_against_problem_answer_and_solution`). 닮음 set04/09 링크 **이미 존재**(patch209).
  - 닮음 실 canonical = **`M2_SIMPY_PT###`**(unit `M2_SIMILARITY_PYTHAGORAS`, 닮음+피타고라스 **87유형**), `type_variant_bank`가 id+type_name 정의, links/coverage/duplicate_map/source_bank가 참조. → **관측 reflection(item_id) → links → M2_SIMPY_PT 로 id 조인. §5 금지 이름매칭 안 함.**
  - 🔴 **경정정**: 내 mathflat 등재(`m2_similarity`, M2_SIMILARITY, 닮음만 81)는 **유닛 canonical 아님** = 플랫폼 뷰. `superseded_note` 표시. 완료 유닛(수와식)은 links의 primary_problem_type_id가 problem_types 파일로 해소되나 닮음은 정의파일만 부재였음.
  - **✅ M2_SIMPY problem_types 뼈대 등재**(검수결정): `data/problem_types/m2_similarity_pythagoras.problem_types.v1.json`(87유형, type_variant_bank+links id조인, concept_ids 87/87, `error_tags=null`, `status:raw_registered_not_wired`).
  - **유일 pending = 예측 error_tags 상속원**(검수결정=지금은 보류). **✅상속 패턴 조사(완료 5유닛)**: ①error_tags 100% 채움(null 0) ②**vocab 유닛별 bespoke**(교차겹침 0~15%, 대부분 0%) — 공유 통제어휘 없음 ③스타일 2갈래: **다수(geometry·probability·quadratic·polynomial)=소수(12~20) 광범위 개념슬러그 고반복** / NE·linear만 대규모 세분(100+). "core"는 error_tag 아님(앞 grep 오탐 정정). ④**닮음 템플릿 = `m2_geometry_properties`**(14종: parallel_lines·angle_chasing·triangle_congruence·triangle_center·length_area·diagonal_property·proof_structure·auxiliary_line…) — 도메인 정합. 권고: geometry 스타일로 소수 광개념 vocab 신규(닮음/피타고라스 특화: similarity_ratio·area_volume_ratio·pythagorean·midpoint_connector·right_triangle_altitude 등), M2_SIMPY concept_ids(53종) 정렬. **wholesale 상속 불가(bespoke), 알고리즘=geometry모델+concept파생.**
  - 🔴 **추가조사 3건 완료(검수 요청, 2026-08-06)** — 판정 재료가 예상을 뒤집음:
    - **①(최우선) axis_rules.v44는 error_tags를 0번 참조.** 예측축 = `Run-AxisPrediction.ps1`이 규칙 regex를 **mathflat 유형명 텍스트(`$ctx="$group $nm"`)에 매칭**(83행)해 채움. error_tags·concept_ids 예측 경로에 **전혀 없음**. → **error_tags 입도는 예측축과 무관.** 검수 전제("error_tags=axis_rules 입력") 불성립. ⇒ M2_SIMPY error_tags는 예측축을 위해선 불필요(다른 진단용도 있으면 별개).
    - **② 45단원 스타일 분포**: BROAD(≤30)~16 / mid~11 / FINE(≥70)~11 스펙트럼. **geometry·삼각비·이차·다항식 클러스터 전부 BROAD**(geometry_properties14·trigonometric_ratio26·quadratic19·geometry_equation25). 닮음(geometry)은 BROAD 계열.
    - **③ 의도 vs 편차**: problem_types 전부 2026-07-06~08 동일배치 저작(광범위 geometry·세분 linear가 같은날 07-07), error_tags 설계문서 부재 → **통제어휘 없는 유닛별 저작편차**에 가까움(의도된 통일설계 아님).
    - ⇒ **결론(검수 판정 대기)**: 예측축엔 error_tags 불요(mathflat+텍스트규칙으로 이미 산출가능). 닮음 예측축은 `Run-AxisPrediction`을 `m2_similarity.mathflat`에 돌리면 나옴. error_tags를 굳이 붙인다면 BROAD(geometry)스타일이나, **목적(무슨 소비처?)부터 재확인 필요** — 안 붙여도 예측축 지장 없음.
    - ⚠ mathflat 뉘앙스(검수확정): mathflat="비-canonical" 아님 = **PREDICTED-층 입력**(Run-AxisPrediction이 *.mathflat 소비). M2_SIMPY=OBSERVED-조인 canonical. 경쟁 아닌 서로 다른 층·둘 다 유효. **보존 이유=예측 파이프라인 실사용**(되짚기용 아님). superseded_note→layer_role_note로 문구 확정.
  - **✅ error_tags 소비처 확인(검수①)**: 0 아님 = **3개(전부 null-safe `pt.error_tags||[]`)**. `algebra_master_matcher`(학생↔유형 매칭 토큰 보조), `math_weakness_engine._tagsFor`(교정루트 trigger 병합), `report_renderer`(표시 fallback). worker의 `observed_error_tags`는 학생 실측필드로 별개. ⇒ **M2_SIMPY null=크래시 없으나 "영향 없음" 아니라 "기능 저하"**(두 소프트신호 포기: 매칭보조·error_tag트리거 교정). fallback 존재(매칭→type_name/description, 교정→observed 태그)라 진단 멈추진 않음. 🔴 **검수 판정(정정): "null 유지 확정" 아님 = "예측층 정비 시 재검토 — 소비처 3개 있음, 현재 기능저하 감수".** 지금 null 유지 이유: ①포기분이 fallback 있는 보조신호 ②닮음만 채우면 45단원 중 하나만 상태 달라지고 통제어휘 부재 문제 가중 ③error_tags=예측층 자산인데 현 작업=관측층 구축 → **범위 밖, 예측층 정비는 별도 과제**.
  - **✅ 닮음 예측축 실행 전 사전보고(검수 4항목)**: ⓐ하드코딩=`Run-AxisPrediction.ps1` **27행** `$dir='...Desktop\scshstudy...'`→projects 경로(또는 $PSScriptRoot 유도). RulesPath는 이미 $PSScriptRoot 상대. ⓑ산출물=**temp `%TEMP%\axispred`에 분석 CSV만**(name_source_dist·unmatched_all·pack_gap_all·rule_over60)+콘솔. **엔진 데이터 덮어쓰기 0**(read-only audit, 예측축을 소비파일에 안 씀). ⓒ다른 44단원=이미 **45/45 산출됨**, 닮음(GS)도 포함(mathflat 45개+axis_rules에 **GS 팩 실재** applies_to:["GS"]). 재산출 아닌 재검증. ⓓ`-Only GS` 단독실행 가능→**45 재검증 불수반**(§7 관건 해소). unmatched 수치는 실행시 산출(approval시 -Only GS 단독run으로 보고).
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
- **단원별 편중 = 진단축 변별력 실증** (검수확정 사례 누적): ①수와식 D편중 vs 원 C편중. ②일차함수 B2·B3(매개변수 범위·경우) vs 이차함수 C3 지배(그래프↔식). ③**다항식 = D1·D2·D3 강세 + 13축 광폭**(수와식 계열 확장, **전 축 고르게 나오는 유일 단원**). 닮음 C4·C1편중, 삼각비 광폭. → 축 체계가 단원 특성을 변별함이 3사례로 반복 실증.
- **검수 flow**: Code탭 매핑 → 검수 리뷰 → 확정 → 커밋. 경계는 억지 배정 말고 boundary 표시.

## 🔴 닮음 특수성 (다음, 앞 4단원과 다름)
- 닮음(3·8) = **300문항 전부 856**(raw_taxonomy 유형 미등재). 유형·정답률·기존태그 **전무**.
- 재태깅 세션엔 **PDF만** 주면 됨(대조할 기존 CSV 없음). 결과로 유형·정답률·축 처음부터.
- ⚠ **추가 단계**: 856은 재태깅 후 그 유형을 **raw_taxonomy에 신규 등재**해야 팩 예측축이 붙음(관측층 넘어 예측층까지). 앞 4단원(태그없음/주제형)엔 없던 단계.
- 소스 PDF `260711_도형의 닮음(3)/(8).pdf`는 **로컬 부재**(12개 부재 목록 중). 확보 필요.

## ⛔ 미결 / 대기
- **프로덕션 병합**(관측층→실 source_item_links): 보류. 3~4단원 더 + 새 사각지대 안 나오면.
- **경계 40% 누적**(수와식33·원1248·원6·삼각44): 3~4단원 후 일괄 재검토(같은 경계선 C1/C3·C2/C4 묶어 판례). `TAG_DICTIONARY §7`.
- **★D3/C2 경계 판례 후보**(검수지정): `triangle_area_sine_factor_omitted`(삼각비, ½ 누락) + `square_formula_middle_term_error`(다항식, ±2ab 계수)= **공식은 알되 계수를 틀림** 동형. 둘 다 D3/alt C2. 삼각비 때 "C2 나아보이나 확신 없음"으로 남김. **같은 경계에 2사례 모임 → 경계 재검토 시 함께, 판례 후보.**
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
