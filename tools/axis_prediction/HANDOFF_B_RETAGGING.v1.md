# (B) 재태깅 → 관측축 파이프라인 인계문 (새 Code 세션)

> 이 문서 하나로 **재태깅 스트림**을 이어받는다. 큰 그림은 `HANDOFF_B_MASTER.md`. 관측 태그 정본은 `TAG_DICTIONARY_v1.md`.

## ⭐⭐ 최신 진입점 (2026-08-09, 배선 국면 — **여기부터 읽기**)
> 재태깅·경계재검토·예측관측대조는 **완료**. 현재 = **배선(wiring) 국면**. 아래 순서로 읽어라: 이 블록 → `B_wiring_pilot_QF.v1.md`(현재 시범) → `B_wiring_design.v1.md`(설계) → `B_pred_vs_obs_20units.v1.md`(대조 발견). 리포=**`C:\Users\user\projects\scshstudy`**(OneDrive 아님). HEAD는 아래 커밋들 최신(전부 push됨).

- **✅ 완료된 대과제 3**: ①재태깅 20단원(2722문항·321종). ②경계재검토(§7 판례 10종, boundary 147→14=90%해소, 잔여14 동결). ③**예측vs관측 대조 11단원**(`B_pred_vs_obs_20units.v1.md`): **D2격차=유형A정의불일치(6단원 예측과다)·E1격차=유형B예측과잉발화(C-01"주어진"·C-11"방정식" 공통규칙 표면어, `B_E1_gap_diagnosis.v1.md`)·C3=유형C관측우위.** 조인=전단원 유형vs문항이라 분포대조만.

- **🔧 배선 발견(핵심)**: 관측층(재태깅 321종·17축)은 런타임과 **어휘 완전분리**(∩=0~1종). 런타임 observed_error_tags=외부 Cloudflare Worker(opus-4-8, 학생답안 판독) 자유생성 거친태그(sqrt_definition_property류). **problem_types.error_tags = Worker 프롬프트 입력 + 엔진 `_tagsFor` 매칭** 양쪽 경로(error_tags=null 보류 전제 정정됨). ⇒ **fine태그를 넣으면 관측층↔런타임 정합 = 최단로.** (b)Worker주입+(c1)엔진축경로 병행. 상세 `B_wiring_investigation.v1.md`·`B_wiring_design.v1.md`.

- **🚀 QF 시범 진행중** (`B_wiring_pilot_QF.v1.md`). QF선정=B스키마 미소비라 진단공백→축경로 효과 순수판별+B회생 비교 가능.
  - **✅ ①a 데이터**(커밋 `f291e9fe`+`996113ef`): `data/axis_map/fine_tag_to_axis.v1.json`(재태깅321→15축·메타O). `data/axis_map/qf_pt_fine_error_tags.v1.json`(QF PT→fine태그 오버레이, 프로덕션 problem_types 무변경). 실측 PT당 태그 min2·max24·avg3.8(PT175만 24).
  - **✅ ①b 엔진**(커밋 `5833f97b`, 가산): `math_weakness_engine.js` load()에 `fineTagToAxis` 로드 + diagnose()에 axisStats(문항당 축유니크) + `observed_axes` 반환키. **debug.html 실검증**: QF 3오답 fine태그→observed_axes 정확, **비회귀 증명**(축맵 제거 시 기존12키 동일). 학생화면·Worker 무변경.
  - **✅ ③ B회생 완료** (커밋 `6489aa53`, 검수승인 2026-08-09): QF 13규칙 `trigger_error_tags`(평면)→`trigger.error_tags_any`(중첩)+**`wrong_min:2·low:1` 주입**. ★**필드명만으론 부족 발견**: 엔진 554행 `wrong_min||999`라 wrong_min 없으면 전부 死. 정상 32단원 값 2/1로 통일. **debug.html 회생전/후 동일입력 실증**: BEFORE QF발화0 / AFTER QF발화8(RULE_001·002·003·005·007·009·010·012). 타단원 31규칙·observed_axes(C1~C4) 전후 동일=회귀0. 롤백=단독커밋 revert. **TR(8규칙 동일 평면스키마)는 미착수**(QF 결과 보고 판단). ⚠**용어정정**: B회생 출력=`triggered_rules`(≠wrong_answer_diagnoses; 후자는 instruction기반이라 ③과 무관·전후 동일).
  - **✅ ④ 비교 판정 완료**(검수 2026-08-09): 경쟁 아님·**역할분담 확정**. `triggered_rules`=이번시험 진단·학생즉시출력(구체 오류모드) / `observed_axes`=누적 프로파일·교사 학기조회(추상축, 여러단원·시험 묶어야 의미). 확대=둘다 다른화면. 통제실험으로 **팽창=QF특유 아님 확정**(단독로드 QF발화2·LE3, 태그/PT밀도 비례 보편성질, "8개"는 debug 36단원 아티팩트). QF wrong_min 2/1 유지.
  - **✅ ② Worker주입 배포·검증 완료**(편집 커밋 `ba32030c`, 오버레이메타ASCII+테스터 `32f4660e`): worker_skeleton 가산3곳(fine 후보주입)·QF한정·fail-open. **사용자 `wrangler deploy` 완료**(VERSION `2026.08.09-fine-error-tags` 라이브·오버레이200). **3단계 실효 검증 성공**: 무설치 테스터(`B_wiring_worker_tester.html`, text/plain 시험지→`/analyze`) QF 3오답에 **fine태그 5종 검출**(quadratic_translation_parameter_sign_confusion·vertex_axis_reading_failure·completing_square_vertex_axis_failure·parabola_coefficient_width_direction_confusion·graph_property_statement_evaluation_failure), 배정 정확. 배포가이드 `B_wiring_worker_deploy_QF.v1.md`(engine_data_base=진단페이지 디렉터리URL·5단계 판정기준).
  - **✅ 4단계 observed_axes 실데이터화 완료**: ②의 fine태그 5종을 엔진 투입→`observed_axes=C3·2,C2·2,C4·1`(전부 축맵 매핑, 거친 pt.error_tags는 축맵 부재라 미오염). **파일럿 end-to-end 성립**: 재태깅321→오버레이→Worker(②)→observed_error_tags→observed_axes(①b)+triggered_rules(③).
  - **📋 별건 백로그 2**: ①`ISSUE_pt_error_tags_attribution`(커밋 `c7c3f371`): pt.error_tags 병합 귀속·34단원 전역·②로 완화예상→**5단계 팽창 재측정 대기**. ②`ISSUE_analyze_review_json_structural`: analyze_review(structured=false) **괄호짝 구조오류**(검수정정, 미이스케이프 아님)→fallback. 영향=교사문구만·②무관 기존문제. 완화=review structured화(재측정=시범배포) or 스키마분할. repairJsonText 확장 부적절.
  - **✅ ③ 학생식별자 + 누적저장소(A안) 완료**(검수승인, `B_wiring_student_identity.v1.md`): 학생키=**교사배정 `SC-STUDY-NNN`**. **입력란**(index+hybrid.html): 접두사고정+숫자3자리·실시간미리보기·blur zero-pad·최근코드 datalist(localStorage)·필수검증→payload `student_profile.student_code`. **누적저장소** `assets/math_axis_accumulation.js`(`MathAxisStore`): 레코드=DB행 스키마{id·schema_version·student_code·date·exam_label·scope_units·observed_axes·**attempts(원본태그)**·**axis_map_version**} — 축만 아니라 원본태그·축맵버전 보존(경계재검토로 축바뀌어도 재계산). 진단성공 쓰기훅(fail-soft). **조회화면 `profile.html`**: 코드조회→시험목록+축합산("C3 반복취약")+원본태그+**export/import**(A안 소멸/이전 대비). 브라우저 실측 전부 통과. ⚠**개인정보**: 레코드에 이름 미저장(코드만). B(KV/D1) 이관 시 레코드가 그대로 행.

- **⚠ 별건 이슈**(`ISSUE_4unit_diagnosis_rule_schema_mismatch.v1.md`): 4단원(GP·PB·QF·TR) 진단규칙 **스키마 불일치 미소비 확정**. B(QF/TR:trigger_error_tags 영문거친태그74%뒷받침=저비용회생)·C(GP/PB:if_observed_signals 한글자연어0%·teacher_confirmation_prompt=의도된 교사확인플로우 미구현③, 신규구현트랙). 수정 보류(검수). 배선과 겹침(4단원=관측층 최대수혜).

- **🧰 환경함정(꼭)**: PS5.1이 .ps1 한글리터럴 ANSI 오독→깨짐. **스크립트 라벨·메타 전부 영문**(검수 지시). 전각괄호(（〔）〕)도 `[char]0xFF08`류 코드. ConvertFrom-Json은 `[IO.File]::ReadAllText(...,UTF8)`. 데이터(한글)는 UTF8통과 OK. scratchpad 스크립트는 매세션 재작성(predict_tally·observed_tally·compare_axes·build_axismap_qf·qf_rules_extract·serve). Downloads=검수전달용 사본.

- **✅ 라이브 전구간 검증 통과**(2026-08-09, `B_wiring_live_verification_QF.v1.md`): 실제 진단페이지서 .txt 시험지(accept에 text/plain 추가) 업로드→Worker fine태그4종→observed_axes(C2·2/C3·1/C4·1)→자동저장→profile.html 조회 전부 연결 확인. profile 링크(상단nav + 진단직후 `?code` 자동조회) 동작. 축맵ver 캡처됨.
- **다음 세션 즉시 할 일**: ①②③④·3·4단계·**③ 학생식별자+누적저장소(A안)**·**라이브검증** 완료·배포·push. **파일럿 end-to-end + 누적층 + 실사용 전부 성립.** 다음 1순위=**(b) 19단원 확대**(검수). 확대 assessment: 생성=자동화가능(20 B_reflection ⋈ 14 source_item_links dir ⋈ problem_types union, QF 레시피 검증됨) / Worker=단원별 코드수정 불요(제네릭, 등록만) / 재배포=**FINE_OVERLAY_BY_UNIT 배치등록 1회** or **index.v1.json 구동화하면 1회 후 영영 0회**(오버레이경로를 index 단원엔트리에 넣어 Worker가 거기서 읽게). 남은 후보(우선순위 미확정): **(a) 실사용 검증**(교사가 실제 진단→profile.html에 축 누적되는지 라이브 확인) / **(b) profile.html 링크**를 진단페이지에 노출(디스커버리) / **(c) ② 확대**(19단원 오버레이) / **(d) 5단계 팽창 재측정**(②로 완화되는지) / **(e) B(KV/D1) 이관 설계** / **(f) review-hardening**(백로그). 검증서버=scratchpad `serve.ps1`(8731·ASCII·매세션 재작성). ↓ 아래는 이전 국면 이력(참고).

## ⭐ 현재 상태 (2026-08-07, 이전 진입점 — 재태깅/경계재검토 이력)
- **정본 리포 = `C:\Users\user\projects\scshstudy`**(로컬, OneDrive 아님·은퇴대상). `_inbox/*.json` 미커밋=교환 입력본(정본 `B_tagging_*`는 커밋됨, 정상).
- **🏁 중등 재태깅 20단원 전량 완결**(2026-08-07): 수와식5·원12+6·삼각비6+무번호(set01)+10(set11)·닮음3+8·함수5+8·이차함수3+9·다항식5+13·도형성질6·이차방정식5+9·실수(6)set07·확률(5)set06+**(10)set11**. 856 트랜치 종료. **입력 소진 → 재태깅 스트림 종료. 다음 국면 = 프로덕션 병합·경계 재검토·예측 대조(§아래).**
- **📊 20단원 완결 집계**(전 리플렉션 스캔): 총 **2722문항** / 관측 **321종**(=축매핑풀 321). **17축 관측분포**(item-level 5218건): C3·1153>C1·1083>C2·679>C4·528>B3·328>D1·322>D3·290>D2·267>B2·200>B1·125>A3·100>E3·44>B4·36>A2·35>E1·28. **미등장 = A1·E2**(2축).
- **⚠ 맵 위생(경계 재검토 중 발견)**: `M3CP.v1`(27)·`M3CP_circle6new`(28)은 **둘 다 `M3CP.v2`(55)의 완전 부분집합·축 불일치 0**(55=27+28 정확분할). 반영 축·풀 321은 무영향(union·축 일치). 단 naive 글롭이 v1·circle6new를 함께 읽어 tier **중복 계수**. **★집계 정규 대상 = 11맵(글롭서 v1·circle6new 제외)**: M2GEOM_new·M2LF_new·M2NE·M2PROB_new·**M3CP.v2**·M3POLY_new·M3QF_new·M3QUAD_new·M3REAL_new·M3TR_new·similarity3_new. **정규 tier(11맵): boundary 147·confident 175**(앞 보고 154/223은 중복분). 경계쌍(정규): **C1↔C3=22**(C1>C3·13+C3>C1·9)·**C2↔C3=22**(12+10)·C4↔C1=11(9+2)·C4↔C3=9·C1↔C2=7·C4↔D1=6. **C계 상호경계가 압도** → 판례화 표적.
- **🔎 경계 재검토 국면 진행중**: 검수 방식=경계쌍별 dossier→검수 판정→기준 도출→반대방향 자동정리. **✅ 1단계 C1↔C3 완료**(dossier `_boundary_review_C1_C3.md`): 22건 중 **18건 확증→confident 승격**(C1·11 incl segment_partition + C3·7 incl multi_circle 2), **보류 4종**(prism_cross_section·repeated_circle_sector·diagonal_included_angle·equilateral_midpoint = 저증거 1회·공란, §9). §7 ⑤C1vsC3 판례 등록. **boundary 147→129**. **✅ 2단계 C2↔C3 완료**(dossier `_boundary_review_C2_C3.md`): 22건 중 **19 확증→승격**(C2·9 incl slope_sign·radical_magnitude·quadrilateral_hierarchy + C3·10 incl converse3·판례3·확률2), **boundary 유지 3**(irrational_conjugate_root_pair=C2 반반·§9 저증거 2: multiple_line_angle·overlapping_rotated_congruence). §7 ⑥C2vsC3 판례 등록. **boundary 129→110**. **✅ 3단계 C4인접 완료**(dossier `_boundary_review_C4.md`): 20건 중 **17 확증→승격**(C4>C1·9 all C4·incl 변환병목 4 / C1>C4·2 C1 / C4>C3·5 incl same_altitude(형제일관 C4) / C3>C4·1 C3판례), **보류 3**(§9 저증거: coordinate_projection·scaled_extension·similarity_subtriangle). §7 ⑦C4 판례 등록. **boundary 110→93**. **✅ 4단계 C4↔D1+C1↔C2 완료**(dossier `_boundary_review_C4D1_C1C2.md`): 13건 중 **12 확증→승격**(C4>D1·5 / C1>C2·6 / C2>C1·1), **1 이동**(abstract_notation_application C4→D1·boundary 유지·재등장시 분리검토). §7 ⑧C4vsD1·⑨C1vsC2 등록. **boundary 93→81**. 4쌍 완료(C1↔C3·C2↔C3·C4인접·C4D1+C1C2).
- **✅ 5단계 B3 클러스터 완료**(dossier `_boundary_review_B3.md`): 12건 **전부 현행 유지·confident 승격**(이동0). B3>C1·4/B3>C2·2/B3>C3·1/B3>E3·1/C1>B3·3/C2>B3·1. §7 ⑩B3 판례 등록(count-vs-structure). overlap_double_count alt E3→C1 정정. **boundary 81→69**. §9 보류 10 동결.
- **✅ 6단계 C1잔여 완료**(dossier `_boundary_review_C1residual.md`, C계 축별 1차): 10건 중 **9 C1 유지·승격**(alt B1·B2·D1·D2·D3·A2 전반→전부 C1 수렴), **1 이동**(right_triangle_altitude_geometric_mean C1→C3: DE²=AE×CE는 알려진 식·실패는 닮음 연쇄, C1↔C3 판례). **boundary 69→59**. ★**C1 성격 확립(검수 관찰)**: C1은 "다른 축의 전 단계" — **세우고 나면 나머지 자동이면 C1 / 세운 뒤 별도 실패 있으면 그 축**. 역할분업 사례 다수(perfect_square_trinomial↔공식, factor_pair↔D2, adjacent_block↔D3계산, special_angle↔A2암기).
- **✅ 7단계 C2잔여 완료**(dossier `_boundary_review_C2residual.md`): 8건 **전부 C2 유지·승격**(이동0. alt A3·B2·C4·D2·D3 전반→전부 C2 수렴). 검수확정 3종(principle_selection×2·isosceles) 포함. special_angle_identification=C2(tan√3→60° 원자대응, §9보류 아님). **boundary 51**. C1(9/10)·C2(8/8) 유지율 높음=C계 판정 안정.
- **✅ 8단계 C3잔여 완료**(dossier `_boundary_review_C3residual.md`): 14건 중 **13 C3 유지·승격**(alt A3·B1·B2·B3·B4·D1·D2·D3 8종 전반→전부 C3 수렴. 고빈도 pattern_extraction 26x·triangle_congruence_selection 11x·root_count_discriminant 7x 포함), **1 보류전환**(diameter_pairing_failure: 검수확정 C3나 형제 diameter_pair_counting B3와 이름유사·1회, 검수 안전장치 유지 → §9 보류 편입). **boundary 51→38. §9 보류 10→11**.
- **✅ 9단계 C4잔여 완료**(dossier `_boundary_review_C4residual.md`): 5건 중 **4 C4 유지·승격**(complementary_angle·obtuse_supplement 여각/보각 변환=C4·표기 / inequality_bound_conversion 12x=부등식 형태로 옮김 C4 / recurrence_dot_scope), **1 이동**(digit_swap_misapplication C4→D3: ab→ba는 다른 값이라 표기변환 아님·재계산, boundary 유지). **boundary 38→34**. **C계 5쌍 완료. 시작 147→34, 113해소 77%**.
- **✅ 10단계 D계 완료·경계재검토 사실상 종료**(dossier `_boundary_review_Dcluster.md`): 17건 중 **14 승격**(D1·5·D2·3·D3·6 유지·triangle_area_sine+square_formula watch해제 동시확정), **2 이동**(inverse_operation_setup D1→C1·"세우면 자동" / absolute_value_from_square_root D1→B4·"부호 조건"), **1 boundary유지**(inverse_operation_sign_error, 형제 setup 이동으로 재검토여지). **boundary 34→20**.
- **✅ 11단계 A/B잔여 완료**(dossier `_boundary_review_AB.md`): 6건 중 **4 유지·승격**(A3·3 전처리정리 / line_intersection_parameter_range B2), **2 이동**(★denominator_multiple_condition B1→C1: 최장기 B1/C1 경계 해소·학생이 조건 세움 / discrete_solution_graph_continuity B2→C2: 정의역이 그래프 바꾼다는 함수개념 오해). **boundary 20→14. 미검토 0.**
- **🏁🏁 경계 재검토 완전 종료: 시작 147 → boundary 14 (133해소·90%)**. 잔여 14 = **§9 저증거 보류 11** + **이동·watch 3**(abstract_notation D1·digit_swap D3·inverse_operation_sign D1) — 전부 사례 축적 전까지 동결. **11 dossier·§7 판례 10종·C계 유지율 94%.**
- **🔧 채점로직 조사(코드확인, 2026-08-07)**: ①진단 흐름=학생답안→외부 Cloudflare Worker(AI)가 observed_error_tags 생성→`engine.diagnoseWithGuidance`. ②diagnosis_rules는 error_tags 소비(`trigger.error_tags_any`), **axis_rules는 빌드전용**(선례 재확인). ③**B_reflection·per-unit links는 런타임 소비처 0**(grep 0). 런타임 스키마에 axis 개념 없음. ④엔진은 동작가능하나 **관측축 데이터층은 구축단계·미배선**. ⑤**병합 함의**: observed 필드 추가해도 런타임 무영향·무해(별개파일이면 스키마도 회피). ⇒ 관측층은 아직 라이브 미연결 = **staging 병합은 즉각효과 0**. [[predicted-layer-join-source-item-links]]
- **▶ 다음 방향 판단(검수/사용자)**: (A)staging 병합 `*.observed.v1.json`(저위험·미래대비·즉각가치無) / (B)예측vs관측 대조 20단원 확장(§9 본목적·D2격차 발견 [[predicted-observed-d2-gap]]·관측축 확정된 지금 적기) / (C)순차. Code탭 견해=(B) 즉각가치 큼.
- **§7 경계판례 최종 10종**: ①D2vsD3 ②B1vsC2 ③D3vsC2 ④D2vsC2 ⑤C1vsC3 ⑥C2vsC3 ⑦C4(표기변경) ⑧C4vsD1 ⑨C1vsC2 ⑩B3(세기vs구조) + 기반판례 그래프↔식3분·converse=C3·E1=문항구조·기준명시(union vs pool). ★C1성격=다른 축의 전 단계(세우면 자동 C1 / 세운뒤 별도실패 그 축).
- **📉 잔여 boundary 81 분포**(정규 11맵, 검수 마무리계획용). **최다=B3>C1·4 / C3>B2·3·C3>B3·3·C2>D2·3·D3>C2·3 / C1>B3·3**. 나머지 **전부 1~2건 파편**(~50쌍). 클러스터: **B3계 12**(B3>C1·4·C1>B3·3·B3>C2·2·B3>C3·1·C2>B3·1·B3>E3·1) / **C1잔여 ~12**(C1>D1/D2/D3·각2·C1>B1·2·C1>C3·2·C1>B2·1·C1>A2·1) / **C3잔여 ~13**(C3>B2·3·C3>B3·3·C3>A3·2·C3>B1·2·C3>C1·2·C3>C2·2·C3>D1/D2/D3·각1·C3>B4·1) / **C2잔여 ~9**(C2>D2·3·C2>C4·2·C2>A3/B2/B3/C3/D3·각1) / **C4잔여 ~8**(C4>C3·3(§9보류)·C4>C2·2·C4>B1/B2/D3·각1) / **D계 ~11**(D3>C2·3·D1>D3·2·D3>C1/D1/D2·각1·D1>A3/B4/C1/C2/C4·각1·D2>A2/C2/D3·각1). **§9 보류 10**(reviewed 4쌍 저증거: prism·repeated_sector·diagonal·equilateral·irrational_conjugate·multiple_line_angle·overlapping_rotated·coordinate_projection·scaled_extension·similarity_subtriangle). ⇒ 마무리 제안: **B3계 묶어 1 dossier → C1/C2/C3/C4/D 축별 일괄 → §9 10건 재태깅재개까지 동결**.
- **✅ 실수(6)=set07 18단원째 완결** (2026-08-07, 주제형·유닛완비·856불요, `260711_실수와 그 계산(6).pdf`). item_id `M3_REAL_150_S07_Q###`.
  - 36유형·150문항·49종, 재사용36·**신규13**(재사용률 73.5%). 검수 **조건부PASS** → Code탭 수정 1건: 유형34가 태그4개(명세§3=2~3위반) → 범용 `multi_step_composite_error` 제거(scope가 `pythagorean_setup_failure`와 동일·중복, 개념3태그로 전문항 커버 유지). 독립검증 재PASS(4태그 0·scope오류 0·new13 전량 풀부재·reused36 전량 풀존재 gap0).
  - **맵 `B_tag_axis_map_M3REAL_new.v1.json`(13종, CODE_DRAFT)**: **C2·5**(제곱근개수·주값부호·밀도·연산닫힘·대소비교=실수 원자개념) / **C4·5**(계수 안팎이동·완전제곱 인수추출·곱정리·유리화·길이→수직선=근호 형태변환) / **C1·2**(N=완전제곱·q=0 조건세우기, B1 아님-판례) / **C3·1**(√x 구간대응). 미언급 3종은 풀 선례로 확정(rationalization=conjugate C4·length_to_number_line=coordinate_projection_from_similarity C4·magnitude=proximity_vs_magnitude C2).
  - **반영**(`B_reflection_m3_real_numbers_and_operations_set07.v1.json`, 150문항, 미해결0). 축분포 C2·62/C4·57/C1·39/D1·37/B2·33/D3·28/C3·15/B3·9/E3·6/A3·4/B1·3/B4·1(12축, A1·A2·E2 미등장). 신규 C편중이 재사용(D1·D3 계산·B2 범위)과 섞여 광폭. `ratio_direction_inversion`=E3 판례 유지.
- **✅ 확률(5)=set06 19단원째 완결** (2026-08-07, 주제형·유닛완비·856불요, `260711_경우의 수와 확률(5).pdf`). item_id `M2_PROB_150_S06_Q###`. **단원 최대 규모 매핑**.
  - 43유형·150문항·47종, 재사용10·**신규37**(재사용률 **21.3%** — 계열 최초라 낮지만 정당. 억지 승계 회피, 검수 PASS·수정불요). 독립검증 PASS(scope0·new37 전량 풀부재·reused10 전량 풀존재 gap0).
  - **맵 `B_tag_axis_map_M2PROB_new.v1.json`(37종, CODE_DRAFT)**: **C1·12**(확률식·사건번역·여사건·배열구성 설정) / **C3·11**(연속시행 상태갱신·경로집계·사건연산 연결·추적) / **B3·8**(경우 열거·분류·중복·제외 관리) / **C2·5**(법칙개념·순서/조합 개념) / **D3·1**(순열 계산). ★**law_selection(reused,D2 '공식선택') vs addition/multiplication_principle_selection(신규,C2 '세는 방식 개념')** 구분 명문화(검수 지시). ★오염방지: Q144~150 도형그림에도 도형태그 미사용·`geometric_probability_area_ratio`로 확률 처리(검수 확인).
  - **반영**(`B_reflection_m2_probability_set06.v1.json`, 150문항, 미해결0). 축분포 **B3·78**(지배)/C1·67/C3·54/C2·48/D3·26/B2·20/D2·8/D1·7/A3·4(9축). 검수 예상대로 B3(경우분류·열거) 주력축 실증.
- **✅ 확률(10)=set11 20단원째 완결·🏁중등 마지막** (2026-08-07, 주제형·유닛완비·856불요, `260711_경우의 수와 확률(10).pdf`). item_id `M2_PROB_150_S11_Q###`.
  - 19유형·150문항·28종, **신규0·재사용률 100%**(확률5 47종 중 28종 재등장, 신규37 중 23종 재등장). 여섯 번째 100% 사례(닮음8·삼각비3set·확률10). 검수 PASS·수정불요. 독립검증 PASS(scope0·new0·reused28 gap0). **맵 없음**.
  - **반영**(`B_reflection_m2_probability_set11.v1.json`, 150문항, 미해결0). 축분포 C1·84/B3·80/C3·65/C2·20/D2·18/A3·11/D3·11/B2·10(8축). tag_scope 정밀(유형4 인쇄유형명 유지+문항단위 분리·유형17 Q134 패턴B 이탈·유형2 Q5 회전대칭 중복을 신규없이 overlap_double_count로).
- **🔴 남은 재태깅 = 없음.** 다음 국면은 §미결/대기·§예측층 참조(프로덕션 병합·경계 재검토·예측 대조).
- **단원 반영 절차**(반복): ①파일 `_inbox/`에 확보(cp 실체화 or 검수 원본 재전달; Downloads 미실체 시 재수록 폴백). ②독립검증(유형수·문항수·1~150연속·종수·tag_scope 범위·유형당2~3태그). ③**축매핑 풀 전수대조**(NOT-IN-POOL=신규, verification_missing류 재사용 갭 주의). ④신규만 17축 매핑(맵파일 `B_tag_axis_map_<CODE>_new.v1.json`, 판례 적용, review_status=CODE_DRAFT). ⑤반영(tag_scope 배분·item_id 조인)→`B_reflection_*`. ⑥커밋 태깅+맵+반영. 검수 확정 후 맵 REVIEWED_APPROVED.
- **재현 스크립트**(scratchpad, 매 세션 재작성): PS5.1 **ASCII 전용**(한글은 데이터 통과 or `[char]0x…` 코드포인트, ConvertFrom-Json은 `[IO.File]::ReadAllText(...,UTF8)`; `$ErrorActionPreference` Stop 금지-ConvertFrom-Json이 경고에 죽음). 반영 맵 풀 = 유닛맵(similarity3_new·M2LF_new·M3QF_new·M3POLY_new·M2GEOM_new·M3QUAD_new·M3TR_new·M3CP.v2·M3CP_circle6new·M2NE·**M3REAL_new**·**M2PROB_new**) + verification_missing은 M3POLY맵에 E1 캐리. 풀 유니크키 321종.
- **확정 판례/규칙**(§확정규율·§7 참조): 그래프↔식 3분(순수형태변환=C4/해석적연결=C3/원자개념=C2)·**§7 경계판례 10종**: ①**D2 vs D3**(대입자리=D2/계수계산=D3) ②**B1 vs C2**(문제에주어짐안씀=B1/알고꺼내야하는데못꺼냄=C2) ③**D3 vs C2**(확정본: 맞는 공식서 계수·부호 흘리면 D3 예:½ab sinC의 ½·(a±b)²의 ±2ab / 어느 공식인지 혼동하면 C2 예:trapezoid_midsegment) ④**D2 vs C2**(이미 정해진 도구 중 고름=D2 예:law_selection / 상황을 어떻게 이해했느냐 갈림=C2 예:principle_selection. Q112 실증) ⑤**C1 vs C3**(★경계재검토 등록: **C1=끝점이 식 하나**(부분을 동시에 놓고 모아 넓이식·직선식·함수식·사건조건) / **C3=끝점이 연결**(앞 단계 결과가 다음 단계 입력이 되는 연쇄·전략전환·관계추적). ★보강: 이름의 tracking·chain보다 이 기준 우선 — segment_partition_tracking=C1(부분 동시수집) vs multi_circle_dependency=C3(반지름A→B→C 연쇄)) ⑥**C2 vs C3**(★경계재검토 등록: **C2=한 번에 매핑되는 원자 대응**(A=B를 아는가; slope_sign_graph_direction·radical_magnitude·quadrilateral_hierarchy) / **C3=여러 단계·조건을 순차로 이음**(앞 결과가 다음 입력; quadratic_translation_sign·converse류). ★"연결"에 원자 대응 포함 금지 — 3분 판례 C2(원자적 개념혼동)와 동일 기준) ⑦**C4 대상동일·표기만변경**(★경계재검토 등록: 치환·유리화·평행이동반영·반사·투영·단면·비종류전환(길이비↔넓이비↔부피비, 제곱·제곱근·선형 무관). **갈림=실패위치**: 변환이 병목=C4 / 변환후 식 못세움=C1 / 변환후 관계 순차연쇄 못함=C3. same_altitude_area_ratio=C4(형제 area_ratio_from/to_similarity와 일관)) ⑧**C4 vs D1**(표기 바꾸면 C4 / 조작해 검증·정리하면 D1. ★abstract_notation=C4→D1 이동: E[]관계 성립여부를 지수법칙으로 양변 정리=조작) ⑨**C1 vs C2**(조건·구조를 스스로 세우면 C1 / 성질·정의를 혼동하면 C2. 개념 아는 것 ≠ 그 조건을 세우는 것) ⑩**B3 = 경우 빠짐없이 나누고 세기**(열거·분류·제외·중복제거. ★역할분업: 세기 자체 실패=B3 vs 세는 구조·전략 세움=C1 vs 무엇을 세는지 개념 모름=C2 vs 센 결과 다음단계로 이음=C3. 선례 diameter_pair_counting(B3)↔diameter_pairing(C3). 분업쌍 sample_space_counting(B3)↔probability_ratio_setup(C1)·ordered_enum(B3)↔order_relevance(C2)·exactly_k_counting(B3)↔sequential_path_aggregation(C3))·converse류=C3(cyclicity B3 미승계)·**E1=문항구조 기준**(역방향 문항 유무, 단원 아님)·**기준명시**(관측 union vs 축매핑풀).
- **축 변별력 6단원 프로파일**(검수 정리): 수와식·다항식=**D 편중** / 원·삼각비·도형=**C 편중** / 일차함수=**B2·B3 등장** / 이차함수=**C3 지배** / 실수=**C2·C4 지배**(개념+형태변환) / 확률=**B3 지배(78)**(경우 빠짐없이 세기=단원 본질). B3 주력 단원은 확률이 처음. 17진단축의 단원 변별력 실증.
- **예측층·후속(별도 과제, 지금 아님)**: M2_SIMPY error_tags **null 유지**(예측축과 무관·소비처 3개 null-safe, 예측층 정비 시 재검토). 닮음 예측축 실행완료(`Run-AxisPrediction -Only GS` 100%커버·과발화0). **D2 대조 발견 1호**(예측53.6%vs관측5.7%=정의불일치, [[predicted-observed-d2-gap]]). crosswalk=`source_item_links` id조인(이름매칭 불필요). **타단원 예측축 대조**(D2격차 닮음특유vs전반)는 남은 PDF 반영 후.
- **메모리 5**: repo-location-local-projects·file-transfer-workflow·retagging-observed-axis-pipeline·observed-vs-axismap-pool-basis·predicted-layer-join-source-item-links·predicted-observed-d2-gap.

## ▶ 세션 인계 (2026-08-06, 이전 진입점 — 이하 단원별 이력)
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
- **✅ 다항식(13)=set10 14단원째 완결** (같은 단원 2번째, `260711_다항식의 곱셈과 인수분해(13).pdf`). item_id `M3_POLY_150_S10_Q###`. 15유형·150문항·23종, new_tags **0**(다항식5 신규9 중 6재등장, 겹침20/23), 전량 풀 승계(verification_missing E1은 M3POLY맵 해소). 독립검증 PASS(3=13·2=2).
  - **문항수 확인(검수요청)**: 재고표 143=재태깅대상(856:100+주제형:43) / **set10 뱅크=150**(item_count 150·q001~150). 반영 조인 **150, without_id=0**. → 143 아닌 150.
  - **★E1=8**(verification_missing 3[Q28·30·31] + answer_stage_confusion 5[둘 다 E1]). verification_missing **3번째 사용** — E1 두 학습지 연속 = **다항식 역방향/답마무리 문항이 구조적**. 앞 12단원 E1 0건은 사각지대 아니라 단원 특성.
  - 축분포 **D2·79 지배**/C3·56/C2·43/D1·39/D3·27/A3·22 — (5)보다 공식선택(D2) 더 강세. 다항식 D편중 재확인.
- **✅ 도형의 성질(6)=set07 15단원째 완결 — 856 트랜치 종료** (`260710_도형의 성질(6).pdf`). item_id `M2_GEOM_150_S07_Q###`. 유닛 완비→856 불요. 48유형·150문항·36종, 재사용30·**신규6**. 재사용률 **83.3%(새 단원 최고**: 삼각비3%→함수59%→이차62%→다항79%→도형83%). 독립검증 PASS(3=42·2=6).
  - **맵 `B_tag_axis_map_M2GEOM_new.v1.json`(신규6, 전량 C축)**: C2·4/C3·2.
  - **★검수 지침 배정**: 외심·내심·위계 정의(circumcenter_equidistance·circumcenter_perp_bisector·incenter_angle_bisector·quadrilateral_hierarchy)=**C2**(정의 미소환=개념, B1 아님·isosceles_altitude B1→C2 선례). ⚠**B1 vs C2 구분**: diameter_right_angle·tangent_radius(특정 조건 누락)=B1 / 외심내심(정의)=C2. parallelogram_condition_converse=**C3**(converse family, cyclicity 선례). triangle_congruence_condition_selection=**C3/alt D2**(구성이 본질=C3, 법칙선택 D2. 최다11회, 검수 갈림점 명시).
  - **반영 축분포 C3·89 지배**/C1·53/C2·48/D2·37/C4·24/B1·13 — 도형=C편중(각연쇄·합동구성·연결), 원 계열 정합. 미해결0. 맵 CODE_DRAFT.
  - **★856 트랜치 완료**: 닮음300+이차함수300+다항식293(150+143)+도형성질150 = 검수측 재태깅 대상 종료.
- **✅ 이차방정식(5)=set06 16단원째 완결** (주제형 트랜치 시작, `260711_이차방정식(5).pdf`). item_id `M3_QUAD_150_S06_Q###`. 유닛 완비→등재 불요. 37유형·150문항·47종(전유형 3태그), 재사용39·**신규8**. 재사용률 **83.0%**(80%대 2번째). 검증 PASS.
  - ✅**재수록 폴백→정본 복원 완료**: Downloads 첨부 미실체로 1차 재수록(진단데이터 완전)했으나, 검수가 전체 원본 전달 → **정본을 전체 원본으로 교체**(rationale 37·verification_scan 복원). 재실행 결과 반영 byte 동일=재수록 진단데이터가 원본과 일치 확증. 리포 정합 복원. (교훈: Downloads 첨부 미실체 시 검수가 repo `_inbox`에 직접 저장 또는 원본 재전달이 확실.)
  - **맵 `B_tag_axis_map_M3QUAD_new.v1.json`(신규8)**: C1·3(근조건대입·활용모델링·근→방정식)/D2·1(공식대입)/C4·1(차수환원)/C3·1(판별식연결)/B3·1(영인수경우)/C2·1(켤레근). **검수 4갈림점 전부 후보 일치**: root_count_discriminant→**C3**(alt B3)·zero_product→**B3**(alt C2)·quadratic_formula_coefficient→**D2**(alt D3, calibration custom_operator·volume=D2 확증)·quadratic_application→**C1**.
  - **verification_missing 4번째**(Q98~101·107, E1 세 단원 연속: 다항식5·13·이차방정식5 = **대수 계열 역방향 문항 구조적**). 반영 E1=10.
  - **반영 C1·81 지배**/C3·58/B2·35/D1·33/C2·22/D2·21/C4·20/B3·19 — **14/17축 등장 광폭**(인수분해+근+판별식+활용 종합). 미해결0. 맵 CODE_DRAFT.
- **✅ 이차방정식(11)=set12 17단원째 완결** (같은 단원 2번째, `260711_이차방정식(11).pdf`). item_id `M3_QUAD_150_S12_Q###`. 21유형·150문항·31종, new_tags **0**(이차방정식5 신규8 중 7재등장·미등장 zero_product, 겹침30/31), 전량 풀 승계. cp 실체화 성공(정본 rationale 완전). 검증 PASS(3=20·2=1).
  - **★E1 판정 = 문항 구조를 따름(단원 아님)**: (5)엔 "잘못 본 식→원래 식 복원" 역방향 문항 있어 E1(verification_missing)·(11)엔 없어 **E1=0**. 같은 단원인데 학습지 문항 구조에 따라 E1 갈림 = 근거 명확(음수근 버림=range_constraint 조건필터, 검산 아님·명세 §5-1). **E1 판정은 단원이 아니라 문항 구조 기준** 사례 기록.
  - 축분포 **C1·88 지배**/C3·66/C4·33/D1·24/B2·23/B3·21/C2·13 — (5)와 동형 C1지배·광폭. D2·3(vs (5) D2·21, 근의공식 유형 적음). E1·0. 미해결0.
- **다음 할 일**: ① 주제형 순차: 실수(6)·확률(5)·(10). ② 예측 error_tags = M2_SIMPY 예측층 정비 시 재검토(별도). ③ D2 후속(타단원 대조)·관측층 병합(§미결) = 남은 PDF 반영 후.
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
- **★D2 vs D3 판례(검수확정)**: `quadratic_formula_coefficient_substitution_failure`→**D2** / `square_formula_middle_term_error`→**D3**. 기준: **대입 자리·부호를 틀리면 D2(공식 대입), 계수를 계산에서 틀리면 D3(계산 실수).** 같은 대수 계열 두 태그라 판례로 유용. (square_formula는 D3/C2 판례 후보와도 연결.)
- **★B1 vs C2 경계 판례(검수확정 기준)**: **문제에 주어졌는데 안 쓰면 B1 / 학생이 알고 꺼내야 하는데 못 꺼내면 C2.** 사례 4tag 축적: `diameter_right_angle_condition_omitted`→**B1**(지름 문제에 그려짐)·`tangent_radius_perpendicularity_omitted`→**B1** / 외심·내심 정의 4종(circumcenter_equidistance·circumcenter_perp_bisector·incenter_angle_bisector·quadrilateral_hierarchy)→**C2**(문제 미기재, 학생 소환)·`isosceles_altitude_bisection_overlooked`→**C2**(검수 B1→C2 선례). §7 D3/C2와 나란히 판례.
- **★재사용률 상승곡선(사전 성숙 실증)**: 삼각비 3%→함수 59%→이차함수 62%→다항식 79%→도형성질 **83%**. 새 단원에서 80%대 첫 사례. `verification_missing`처럼 사전+직전산출 참조로 신규 최소화.
- **triangle_congruence_condition_selection_failure = C3/alt D2** (11회 최다) — 검수 승인이나 최다사용이라 경계 재검토 여지 유지(구성=C3 vs 선택=D2).
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
