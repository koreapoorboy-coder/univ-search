# One row per unit: everything needed to rebuild its *.mathflat.v1.json.
# lgArr/lgName/lgId describe the GROUP-level legacy source (already chosen by
# measurement in earlier sessions); itemLg names the ITEM-level candidate.
# '' means the unit has no legacy file of that kind.
$DATA = "C:\Users\user\Desktop\scshstudy\public\math-weakness-engine\data"
function RT($n) { if ($n) { "$DATA\raw_taxonomy\$n.raw_taxonomy.v1.json" } else { '' } }
function PT($n) { if ($n) { "$DATA\problem_types\$n.problem_types.v1.json" } else { '' } }

$UNITS = @(
  @{ code='PF'; out='m1_prime_factorization'; id='M1_PRIME_FACTORIZATION'; name='소인수분해';       ch='1-1 소인수분해';       dump='1-1_소인수의_분해';   zip='소인수분해.zip 내 PNG 112장';        exp=50; sem='M1S1'; semn='중1 1학기'; lg=(RT 'm1_prime_factorization'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm1_prime_factorization'); altArr='problem_types' }
  @{ code='IR'; out='m1_int_rational';        id='M1_INT_RATIONAL';        name='정수와 유리수';     ch='1-1 정수와 유리수';    dump='1-1_정수와_유리수';   zip='정수와 유리수(1).zip 내 PNG 114장'; exp=58; sem='M1S1'; semn='중1 1학기'; lg=(PT 'm1_int_rational'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=''; altArr='problem_types' }
  @{ code='LE'; out='m1_expression';          id='M1_EXPRESSION';          name='문자와 식';        ch='1-1 문자와 식';       dump='1-1_문자와_식';       zip='문자와식.zip 내 PNG 142장';          exp=76; sem='M1S1'; semn='중1 1학기'; lg=(RT 'm1_expression'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm1_expression'); altArr='problem_types' }
  @{ code='CG'; out='m1_coordinate_graph';    id='M1_COORD_GRAPH';         name='좌표평면과 그래프'; ch='1-1 좌표평면과 그래프'; dump='1-1_좌표평면과_그래프'; zip='좌표평면과 그래프.zip 내 PNG 13장'; exp=47; sem='M1S1'; semn='중1 1학기'; lg=(PT 'm1_coordinate_graph'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'm1_coordinate_graph'); altArr='sections' }
  @{ code='BG'; out='m1_basic_geometry';      id='M1_BASIC_GEOMETRY';      name='기본도형과 작도';   ch='1-2 기본도형과 작도';  dump='1-2_기본도형과_작도'; zip='1-2 기본도형과 작도.zip';            exp=62; sem='M1S2'; semn='중1 2학기'; lg=(RT 'm1_basic_geometry'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm1_basic_geometry'); altArr='problem_types' }
  @{ code='PG'; out='m1_plane_geometry';      id='M1_PLANE_GEOMETRY';      name='평면도형의 성질';   ch='1-2 평면도형의 성질';  dump='1-2_평면도형의_성질'; zip='1-2 평면도형의 성질.zip';            exp=44; sem='M1S2'; semn='중1 2학기'; lg=(RT 'm1_plane_geometry'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm1_plane_geometry'); altArr='problem_types' }
  @{ code='SG'; out='m1_solid_geometry';      id='M1_SOLID_GEOMETRY';      name='입체도형의 성질';   ch='1-2 입체도형의 성질';  dump='1-2_입체도형의_성질'; zip='1-2 입체도형의 성질.zip 내 PNG 13장'; exp=52; sem='M1S2'; semn='중1 2학기'; lg=(RT 'm1_solid_geometry'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm1_solid_geometry'); altArr='problem_types' }
  @{ code='DA'; out='m1_data_analysis';       id='M1_DATA_ANALYSIS';       name='자료 정리와 해석';  ch='1-2 자료 정리와 해석'; dump='1-2_자료_정리와_해석'; zip='1-2 자료 정리와 해석.zip 내 PNG 10장'; exp=31; sem='M1S2'; semn='중1 2학기'; lg=(RT 'm1_data_analysis'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm1_data_analysis'); altArr='problem_types'; known=@('G023'); knownNote='매쓰플랫 화면 배지는 6개로 표기되지만 실제 주제유형은 5개다. 원본 8.png 대조로 확인한 매쓰플랫 자체 표기 오류이며, 전사 누락이 아니다. 5개 그대로 저장했다.' }
  @{ code='NE'; out='m2_number_expression';   id='M2_NUMBER_EXPRESSION';   name='수와 식';          ch='2-1 수와 식';         dump='2-1_수와_식';         zip='2-1 수와 식.zip';                    exp=71; sem='M2S1'; semn='중2 1학기'; lg=(RT 'm2_number_expression'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm2_number_expression'); altArr='problem_types' }
  @{ code='EQ'; out='m2_linear_equation';     id='M2_LINEAR_EQUATION';     name='방정식';           ch='2-1 방정식';          dump='2-1_방정식';          zip='2-1 방정식.zip';                     exp=53; sem='M2S1'; semn='중2 1학기'; lg=(RT 'm2_linear_equation'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm2_linear_equation'); altArr='problem_types' }
  @{ code='IN'; out='m2_linear_inequality';   id='M2_LINEAR_INEQUALITY';   name='부등식';           ch='2-1 부등식';          dump='2-1_부등식';          zip='2-1 부등식.zip';                     exp=41; sem='M2S1'; semn='중2 1학기'; lg=(RT 'm2_linear_inequality'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm2_linear_inequality'); altArr='problem_types' }
  @{ code='FN'; out='m2_linear_function';     id='M2_LINEAR_FUNCTION';     name='함수';             ch='2-1 함수';            dump='2-1_함수';            zip='2-1 함수.zip';                       exp=79; sem='M2S1'; semn='중2 1학기'; lg=(RT 'm2_linear_function'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm2_linear_function'); altArr='problem_types' }
  @{ code='GP'; out='m2_geometry_properties'; id='M2_GEOMETRY_PROPERTIES'; name='도형의 성질';       ch='2-2 도형의 성질';     dump='2-2_도형의_성질';     zip='2-2 도형의 성질.zip 내 PNG 19장';    exp=60; sem='M2S2'; semn='중2 2학기'; lg=(PT 'm2_geometry_properties'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'm2_geometry_properties'); altArr='sections'; known=@('G014','G049'); knownNote='매쓰플랫 화면 배지가 실제 표시 항목보다 적게 적혀 있다. 하위 활용 항목이 배지 숫자에 안 잡힌 경우로, 화면에 보이는 항목을 모두 저장했다. 전사 오류가 아니다.' }
  @{ code='PB'; out='m2_probability';         id='M2_PROBABILITY';         name='확률';             ch='2-2 확률';            dump='2-2_확률';            zip='2-2확률.zip 내 PNG 14장';            exp=51; sem='M2S2'; semn='중2 2학기'; lg=(PT 'm2_probability'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'm2_probability'); altArr='sections' }
  @{ code='GS'; out='m2_similarity';          id='M2_SIMILARITY';          name='도형의 닮음';       ch='2-2 도형의 닮음';     dump='2-2_도형의_닮음';     zip='2-2 도형의 닮음(1).zip 내 PNG 29장'; exp=81; sem='M2S2'; semn='중2 2학기'; lg=''; lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=''; altArr='problem_types'; known=@('G005','G035','G074'); knownNote='매쓰플랫 화면 배지가 실제 표시 항목보다 적게 적혀 있다. 하위 항목이 배지 숫자에 안 잡힌 경우로, 화면에 보이는 항목을 모두 저장했다. 전사 오류가 아니다.' }
  @{ code='RC'; out='m3_real_numbers_and_operations'; id='M3_REAL_NUMBER_CALC'; name='실수와 그 계산'; ch='3-1 실수와 그 계산'; dump='3-1_실수와_그_계산'; zip='3-1 실수와 그 계산.zip 내 PNG 22장'; exp=59; sem='M3S1'; semn='중3 1학기'; lg=(RT 'm3_real_numbers_and_operations'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm3_real_numbers_and_operations'); altArr='problem_types' }
  # group-level match is 0 confident on both legacy files; problem_types kept as the
  # recorded source since it has more candidates and carries problem_type_id.
  @{ code='QF'; out='m3_quadratic_function'; id='M3_QUADRATIC_FUNCTION'; name='이차함수'; ch='3-1 이차함수'; dump='3-1_이차함수'; zip='3-1 이차함수.zip 내 PNG 22장'; exp=60; sem='M3S1'; semn='중3 1학기'; lg=(PT 'm3_quadratic_function'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'm3_quadratic_function'); altArr='sections' }
  # both layers line up exactly here: raw_taxonomy 50 = groups, problem_types 144 = items.
  @{ code='QE'; out='m3_quadratic_equation'; id='M3_QUADRATIC_EQUATION'; name='이차방정식'; ch='3-1 이차방정식'; dump='3-1_이차방정식'; zip='3-1 이차방정식.zip 내 PNG 16장'; exp=50; sem='M3S1'; semn='중3 1학기'; lg=(RT 'm3_quadratic_equation'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'm3_quadratic_equation'); altArr='problem_types' }
  # PF is reused: the workbook's 세부코드 column says PF here and also in 1-1 소인수분해.
  # Ids stay unique because the semester segment differs (MPLAT.M1S1.PF vs MPLAT.M3S1.PF).
  @{ code='PF'; out='m3_polynomial_multiplication_factorization'; id='M3_POLYNOMIAL_FACTORING'; name='다항식의 곱셈과 인수분해'; ch='3-1 다항식의 곱셈과 인수분해'; dump='3-1_다항식'; zip='3-1 다항식의 곱셈과 인수분해.zip 내 PNG 24장'; exp=61; sem='M3S1'; semn='중3 1학기'; lg=(PT 'm3_polynomial_multiplication_factorization'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'm3_polynomial_multiplication_factorization'); altArr='sections'
     codeNote='단원코드 PF가 1-1 소인수분해와 겹친다. 엑셀 세부코드 열을 그대로 승계한 결과이며, problem_type_id는 학기 구간이 달라(MPLAT.M1S1.PF vs MPLAT.M3S1.PF) 여전히 고유하다. unit_code만으로 단원을 찾는 코드를 쓰면 두 단원이 섞인다.'
     excl=@('4.png · 곱셈 공식(6) 세제곱 공식 — 주제유형·세부유형 배지와 하위 이름이 화면에 보이지 않아 엑셀 유형 묶음 합계에서 제외됨. 유형요약에 행이 없으므로 61/211 검증에는 나타나지 않는다. legacy raw_taxonomy에는 "세제곱 공식의 전개"로 존재한다.') }
  # first high-school unit. CMP does not collide with any 중학 code.
  @{ code='CMP'; out='h1_common_math1_polynomial'; id='H1_COMMON_MATH1_POLYNOMIAL'; name='다항식'; ch='고1 공통수학1 다항식'; dump='H1_다항식'; zip='공통수학 다항식.zip 내 PNG 21장'; exp=44; sem='H1S1'; semn='고1 공통수학1'; lg=(RT 'h1_common_math1_polynomial'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'h1_common_math1_polynomial'); altArr='problem_types'
     known=@('G004'); knownNote='매쓰플랫 배지는 11개이나 화면에 실제 표시된 이름은 13개다. 3.png 대조로 확인한 배지 표기 오류이며 전사 오류가 아니다. 보이는 이름 13개를 모두 저장했다.' }
  @{ code='CMEI'; out='h1_common_math1_equation_inequality'; id='H1_COMMON_MATH1_EQUATION_INEQUALITY'; name='방정식과 부등식'; ch='고1 공통수학1 방정식과 부등식'; dump='H1_방정식과_부등식'; zip='공통수학 방정식과 부등식.zip 내 PNG 56장'; exp=120; sem='H1S1'; semn='고1 공통수학1'; lg=(PT 'h1_common_math1_equation_inequality'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h1_common_math1_equation_inequality'); altArr='sections'
     known=@('G088'); knownNote='매쓰플랫 배지는 20개이나 화면에 실제 표시된 이름은 21개다. 42-43.png 대조로 확인한 배지 표기 오류이며 전사 오류가 아니다. 보이는 이름 21개를 모두 저장했다.' }
  # 수정본 v2 registers G031 자연수를 분할하는 방법의 수 as a real 유형요약 row (line 32),
  # so it comes in through the normal path. The earlier ExtraGroup entry was removed
  # to avoid storing it twice.
  @{ code='CMC'; out='h1_common_math1_counting'; id='H1_COMMON_MATH1_COUNTING'; name='경우의 수'; ch='고1 공통수학1 경우의 수'; dump='H1_경우의_수'; zip='공통수학 경우의 수.zip 내 PNG 11장'; exp=31; sem='H1S1'; semn='고1 공통수학1'; lg=(PT 'h1_common_math1_counting'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h1_common_math1_counting'); altArr='sections' }
  # G093 and G094 are badge-less rows like 경우의 수 G031: real 유형요약 rows with no
  # 문항분류표 children, so the ordinary path handles them. No ExtraGroup here.
  @{ code='CM2GE'; out='h1_common_math2_geometry_equation'; id='H1_COMMON_MATH2_GEOMETRY_EQUATION'; name='도형의 방정식'; ch='고1 공통수학2 도형의 방정식'; dump='H1_도형의_방정식'; zip='공통수학2 도형의 방정식.zip 내 PNG 26장'; exp=94; sem='H1S2'; semn='고1 공통수학2'; lg=(PT 'h1_common_math2_geometry_equation'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h1_common_math2_geometry_equation'); altArr='sections' }
  # 중3-2. Group layer measures better on problem_types (37 confident + error_tags)
  # than raw_taxonomy (36, no error_tags). 구 형식 + M열. 원문비고 5건은 전부 매쓰플랫
  # 화면의 오탈자 추정을 원문 그대로 둔 것(수정 아님) — source_note에 그대로 실린다.
  # TR-117/TR-129는 예각/둔각 묶음에 같은 항목명이 존재(원문). group_id·source_code로만 구분.
  @{ code='TR'; out='m3_trigonometric_ratio'; id='M3_TRIG_RATIO'; name='삼각비'; ch='3-2 삼각비'; dump='3-2_삼각비'; zip='3-2 삼각비.zip 내 PNG 19장'; exp=38; sem='M3S2'; semn='중3 2학기'; lg=(PT 'm3_trigonometric_ratio'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'm3_trigonometric_ratio'); altArr='sections' }
  # 고1 공통수학2. Worst duplicate-name unit: 17 names repeat inside it across 43
  # items (함수의 식이 주어진 경우 x5, 대응이 주어진 경우 x4, ...). The item-level
  # ambiguous-duplicate-name guard holds all of those back from inheritance. Group
  # layer measures far better on problem_types (60 confident) than raw_taxonomy (0,
  # its 320 sections are item-grained). 구 형식 + M열. 원문비고 6건 전부 원문 그대로.
  @{ code='CM2FG'; out='h1_common_math2_function_graph'; id='H1_COMMON_MATH2_FUNCTION_GRAPH'; name='함수와 그래프'; ch='고1 공통수학2 함수와 그래프'; dump='H1_함수와_그래프'; zip='공통수학2 함수와 그래프.zip 내 이미지 28장'; exp=80; sem='H1S2'; semn='고1 공통수학2'; lg=(PT 'h1_common_math2_function_graph'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h1_common_math2_function_graph'); altArr='sections' }
  # 중3-2. Original workbook, no revision -- review found 0 errors. 구 형식, and the
  # only stored unit with no 원문비고 column at all, so every source_note is null (the
  # column being absent, not blank). No legacy of either kind -> matching skipped,
  # concept_ids null. Completes 중3-2 (삼각비·원의성질·통계).
  @{ code='ST'; out='m3_statistics'; id='M3_STATISTICS'; name='통계'; ch='3-2 통계'; dump='3-2_통계'; zip='3-2 통계.zip 내 PNG 12장'; exp=28; sem='M3S2'; semn='중3 2학기' }
  # 중3-2. No legacy of either kind, so matching is skipped and concept_ids stay null.
  # 구 형식 + M열. Two kinds of 원문비고 preserved as-is: CP-155~159 「전사 오류 수정」
  # (묶음명 "두 원이나"→"두 원에서", 3 sheets) and CP-191 「원문 오탈자 추정」(원문 그대로).
  @{ code='CP'; out='m3_circle_properties'; id='M3_CIRCLE_PROPERTIES'; name='원의 성질'; ch='3-2 원의 성질'; dump='3-2_원의_성질'; zip='3-2 원의성질.zip 내 PNG 22장'; exp=54; sem='M3S2'; semn='중3 2학기' }
  # 고2 대수. v2 최종본(수정v2): 배지없음 G052 「지수함수의 최대·최소(5)」 포함 52묶음, 원문비고
  # 열 포함 신 형식, 세부이름 79(파이프). 07-23 구버전(51묶음, G052 없음, 원문비고 없음)은 폐기.
  # Group layer problem_types 압도적(51 confident, concept 51).
  @{ code='AELF'; out='h2_algebra_exp_log_function'; id='H2_ALGEBRA_EXP_LOG_FUNCTION'; name='지수함수와 로그함수'; ch='고2 대수 지수함수와 로그함수'; dump='H2_지수함수와_로그함수'; zip='대수 지수함수와 로그함수.zip 내 이미지 38장'; exp=52; expNames=79; sem='H2AL'; semn='고2 대수'; lg=(PT 'h2_algebra_exp_log_function'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_algebra_exp_log_function'); altArr='sections' }
  # 고2 대수. v2 최종본(수정v2): 배지없음 G058 「삼각함수 사이의 관계의 활용」 포함 58묶음,
  # 원문비고 열(유형요약 K)·표시 세부유형 이름 수 열 포함 신 형식. 세부이름 61(파이프 구분).
  # 07-23 구버전(57묶음, G058 없음, 원문비고 없음)은 폐기. Group layer legacy is weak here
  # (problem_types 1 confident, raw_taxonomy 0) — legacy 이름 결이 달라 concept 상속은 희박하다.
  @{ code='ATF'; out='h2_algebra_trigonometric_function'; id='H2_ALGEBRA_TRIG_FUNCTION'; name='삼각함수'; ch='고2 대수 삼각함수'; dump='H2_삼각함수'; zip='대수 삼각함수.zip 내 이미지 40장'; exp=58; expNames=61; sem='H2AL'; semn='고2 대수'; lg=(PT 'h2_algebra_trigonometric_function'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_algebra_trigonometric_function'); altArr='sections' }
  # First 고2 unit. The semester segment is H2AL, not H2S1: 고2's 대수 / 미적분I /
  # 확률과 통계 are parallel subjects, not sequential semesters, so an S1/S2 label
  # would assert an ordering the curriculum does not have.
  # Also the first workbook with a 「세부유형 이름」 column — its screenshots were taken
  # with 세부유형 expanded, so 88 detail names exist here and nowhere else.
  @{ code='EL'; out='h2_algebra_exp_log'; id='H2_ALGEBRA_EXP_LOG'; name='지수와 로그'; ch='고2 대수 지수와 로그'; dump='H2_지수와_로그'; zip='지수와 로그.zip 내 이미지 37장'; exp=39; expNames=88; sem='H2AL'; semn='고2 대수'; lg=(RT 'h2_exp_log'); lgArr='sections'; lgName='task_group'; lgId='raw_section_id'; alt=(PT 'h2_exp_log'); altArr='problem_types'
     excl=@('27.png · 로그의 값이 자연수가 되도록 하는 조건(1) — 주제유형·세부유형 배지와 하위 이름이 화면에 보이지 않아 유형요약에 행이 없다. 39/261 검증에는 나타나지 않는다.') }
  # 행렬 is 공통수학1 (2022 개정에서 편입). Group layer measures better on problem_types
  # (2 confident) than raw_taxonomy (0, its 61 sections are item-grained). 구 형식 + M열.
  # G005의 1~3번 항목명이 G006·G007 묶음명과 같은 형식이나 원문 그대로 — 전부 source_group_id·
  # source_code로 구분하고, 항목 층 중복이름 가드가 상속 보류를 처리한다.
  @{ code='CMM'; out='h1_common_math1_matrix'; id='H1_COMMON_MATH1_MATRIX'; name='행렬'; ch='고1 공통수학1 행렬'; dump='H1_행렬'; zip='공통수학 행렬.zip 내 PNG 7장'; exp=19; sem='H1S1'; semn='고1 공통수학1'; lg=(PT 'h1_common_math1_matrix'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h1_common_math1_matrix'); altArr='sections' }
  # 고2 대수 수열. 신 형식(EL형) — 세부유형 이름 열이 파이프(|) 구분으로 98개. detail_type_names_raw는
  # 원문 문자열 그대로 저장하고 분리하지 않으므로 구분자 종류는 무관하다. Group layer measures
  # far better on problem_types (51 confident) than raw_taxonomy (0). 배지합계 376 vs 주제코드 375의
  # 1 차이는 G024 배지 오류(배지 20/실제 19, 19·20.png 대조 확정) — accepted_source_error.
  # G062 「가우스가 포함된 수열의 합」은 배지 없음: 유형요약엔 있고 문항분류표엔 행 없음 → 유형요약
  # 경로로 묶음만 등재(topic_type_count null, unreadable_group). ExtraGroup 불필요.
  @{ code='ASQ'; out='h2_algebra_sequence'; id='H2_ALGEBRA_SEQUENCE'; name='수열'; ch='고2 대수 수열'; dump='H2_수열'; zip='대수 수열.zip'; exp=62; expNames=98; sem='H2AL'; semn='고2 대수'; lg=(PT 'h2_algebra_sequence'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_algebra_sequence'); altArr='sections'
     known=@('G024'); knownNote='매쓰플랫 화면 배지는 주제유형 20개이나 화살표가 달린 실제 주제행은 19개다. 19·20.png 원본 대조로 배지 오류를 확정했으며(검증 열 「층 확인」), 20번째를 지어내지 않고 19개 그대로 저장했다. 전사 누락이 아니다. 배지 합계 376과 주제코드 375의 1 차이가 여기서 난다.' }
  # 미적분Ⅱ 적분법. Semester H3CA2 per 명세서 §3① (미적분Ⅱ=고3, H2CA2는 착오). 파일명은
  # "고2 미적분2"라 학생 이수 학년에 따라 H2로 바뀔 수 있으나 아직 파싱되지 않아 변경 비용 0.
  # v3(세부유형 이름 열 있음, 원문비고 열 없음), 배지없음 0. Group layer problem_types(50 confident).
  @{ code='M2I'; out='h3_calculus2_integration'; id='H3_CALCULUS2_INTEGRATION'; name='적분법'; ch='미적분Ⅱ 적분법'; dump='H3_적분법'; zip='미적분2 적분법.zip'; exp=62; sem='H3CA2'; semn='고3 미적분Ⅱ'; lg=(PT 'h2_calculus2_integration'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_calculus2_integration'); altArr='sections' }
  # 미적분Ⅱ 수열의 극한. H3CA2 (고3, 사용자 명시 확정). 신 형식(문항분류표 14칼럼 원문비고,
  # 유형요약 11칼럼 원문비고). 세부유형 접혀 있어 표시 세부이름 0. 배지없음 G052 「급수의 활용(2)
  # 도형」 포함 52묶음 (유형요약 등재, 문항분류표 행 없음). Group layer problem_types(30 confident).
  # 미적분Ⅰ 함수의극한과연속(M1LC)과 이름·구조 유사하나 학기 구간(H2CA1 vs H3CA2)으로 구분.
  @{ code='M2SL'; out='h3_calculus2_sequence_limit'; id='H3_CALCULUS2_SEQUENCE_LIMIT'; name='수열의 극한'; ch='미적분Ⅱ 수열의 극한'; dump='H3_수열의_극한'; zip='미적분2 수열의 극한.zip'; exp=52; sem='H3CA2'; semn='고3 미적분Ⅱ'; lg=(PT 'h2_calculus2_sequence_limit'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_calculus2_sequence_limit'); altArr='sections' }
  # 미적분Ⅰ 미분. H2CA1 (고2, 사용자 명시). 신 형식이나 원문비고 열 없음 -> source_note 전부 null.
  # 세부유형 접힘, G006만 표시 세부이름 4개(파이프). 3.png는 촬영 번호 오류로 빈 번호(해당없음), 정상.
  # 미적분Ⅱ 미분법(H3CA2.M2D)과 중영역 4개 이름 동일(접선의 방정식/함수의 그래프/방정식과 부등식에의
  # 활용/속도와 가속도)하나 학기 구간으로 구분(다항함수→미분, 초월함수→미분법).
  # 출력 파일은 h2_calculus1_differentiation.mathflat.v1.json — _pilot_ 유령 파일과 별개 정본.
  @{ code='M1D'; out='h2_calculus1_differentiation'; id='H2_CALCULUS1_DIFFERENTIATION'; name='미분'; ch='미적분Ⅰ 미분'; dump='H2_미분'; zip='미적분1 미분11.zip 내 실제 이미지 30장'; exp=79; expNames=4; sem='H2CA1'; semn='고2 미적분Ⅰ'; lg=(PT 'h2_calculus1_differentiation'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_calculus1_differentiation'); altArr='sections' }
  # 미적분Ⅰ 적분. H2CA1 (고2, 사용자 명시). 신 형식이나 원문비고 열 없음 -> source_note 전부 null.
  # 세부유형 접힘(표시 세부이름 0), 배지없음 없음. 코드 M1I ≠ 미적분2 적분법 M2I(충돌 없음).
  # 미적분2 적분법(H3CA2.M2I)과 이름 겹칠 수 있으나 학기 구간으로 구분(다항함수→적분, 초월→적분법).
  @{ code='M1I'; out='h2_calculus1_integration'; id='H2_CALCULUS1_INTEGRATION'; name='적분'; ch='미적분Ⅰ 적분'; dump='H2_적분'; zip='미적분1 적분.zip 내 이미지 19장'; exp=45; sem='H2CA1'; semn='고2 미적분Ⅰ'; lg=(PT 'h2_calculus1_integration'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_calculus1_integration'); altArr='sections' }
  # 미적분Ⅰ 함수의 극한과 연속. H2CA1 (고2). 신 형식이나 원문비고 열 없음 -> source_note 전부 null.
  # 세부유형 접힘(표시 세부이름 0), 배지없음 없음. 검수 재확인 결과 이상 0 (배지 불일치 0, 코드 연속).
  # 단원 내 원문 중복 이름 3세트(함수의 그래프가 주어진 경우 등) -> 항목 층 가드가 처리.
  # 미적분Ⅱ 수열의극한(M2SL)과 이름·구조 유사하나 학기 구간으로 구분. group layer problem_types(29/29).
  @{ code='M1LC'; out='h2_calculus1_limit_continuity'; id='H2_CALCULUS1_LIMIT_CONTINUITY'; name='함수의 극한과 연속'; ch='미적분Ⅰ 함수의 극한과 연속'; dump='H2_극한과연속'; zip='미적분1 함수의 극한과 연속.zip 내 이미지 15장'; exp=29; sem='H2CA1'; semn='고2 미적분Ⅰ'; lg=(PT 'h2_calculus1_limit_continuity'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_calculus1_limit_continuity'); altArr='sections' }
  # 미적분Ⅱ 미분법. H3CA2 (고3, 명세서 §3⑥ H3CA2.M2D). 신 형식이나 원문비고 열 없음 -> source_note
  # 전부 null. 세부유형 접힘. 가장 큰 단원(108묶음/406주제/2594세부). 배지없음 없음, 배지-행 불일치 0.
  # 미적분Ⅰ 미분(H2CA1.M1D)과 중영역 4개 이름 동일하나 학기 구간으로 구분(초월함수→미분법).
  # 원본 ZIP에 앞 단원 수열의극한 이미지(1~17.png)가 섞여 해당없음 처리됨 — 데이터 영향 없음.
  @{ code='M2D'; out='h3_calculus2_differentiation'; id='H3_CALCULUS2_DIFFERENTIATION'; name='미분법'; ch='미적분Ⅱ 미분법'; dump='H3_미분법'; zip='미적분2 미분법.zip'; exp=108; sem='H3CA2'; semn='고3 미적분Ⅱ'; lg=(PT 'h2_calculus2_differentiation'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h2_calculus2_differentiation'); altArr='sections' }
  # 확률과 통계 · 확률 (3개 대단원 경우의수 PSC / 확률 PSP / 통계 PSS 중 확률). 학기 H2PS(예정, 미확정).
  # ⚠️ 배지 없음이 §16 예외: 4묶음 전부 화면 배지가 없으나 원본 3장 전수 대조로 문항분류표에 행 유지.
  #   topic_type_count/detail_type_count는 배지 없어 null, topic_types는 실측 항목으로 채워짐.
  #   -> item_check.badge_less_verified_groups에 4묶음이 잡힌다(unreadable 아님).
  # 묶음당 주제유형 1개(이름=묶음명)는 확률 단원의 실제 구조(원본 확인). 세부이름 27(파이프, ∣는 U+2223로
  # 세로줄 구분자 충돌 회피 — 원문비고 기록). 확통 전용 legacy 없음(m2_probability는 중2 과정이라 미사용).
  @{ code='PSP'; out='h2_prob_stats_probability'; id='H2_PROB_STATS_PROBABILITY'; name='확률'; ch='확률과 통계 확률'; dump='H2_확률'; zip='확률.zip 내 이미지 3장'; exp=4; expNames=27; sem='H2PS'; semn='고2 확률과 통계' }
  # 확률과 통계 · 경우의 수 (PSC). 확률(PSP)과 동일한 §16 배지없음 예외(3묶음 전부 배지없음이나
  # 문항분류표 행 유지). 원본 미대조(경우의 수.zip 미확보) — 검증열 「배지 없음 / 원본 미대조」.
  # 위첨자 ⁿ(U+207F)·ᵐ(U+1D50) 포함, 유니코드 정규화 금지(원문 문자열 그대로 저장하므로 안전).
  # 이름 내 파이프 없음. 확통 전용 legacy 없어 미사용. 코드 PSC ≠ 고1 경우의수 CMC.
  # 미결(원본 확보 시 확인): 함수의 개수(3) 뒷말 없음, 원순열 항목 부재 — §5 원문비고 참조.
  @{ code='PSC'; out='h2_prob_stats_counting'; id='H2_PROB_STATS_COUNTING'; name='경우의 수'; ch='확률과 통계 경우의 수'; dump='H2_경우의수확통'; zip='경우의 수.zip 내 이미지 2장'; exp=3; expNames=23; sem='H2PS'; semn='고2 확률과 통계' }
  # 확률과 통계 · 통계 (PSS). 확률(PSP)·경우의수(PSC)와 동일한 §16 배지없음 예외(7묶음 전부 배지없음,
  # 문항분류표 행 유지 -> badge_less_verified). 원본 미대조(통계.zip 미확보). 세부이름에 쉼표 포함 5행
  # -> 파이프(|) 단독 분할, detail_type_names_raw는 원문 그대로라 안전. ≤(U+2264) 포함, 정규화 금지.
  # 미결(원본 확보 시 확인): G005 세부 1개(이미지 경계 잘림 가능), 층 정정(대영역=통계)은 확률 파일 기준 추론.
  # 확통 전용 legacy 없음. 코드 PSS ≠ 중3 통계 ST. 이로써 확률과 통계 3개 대단원 전부 저장.
  @{ code='PSS'; out='h2_prob_stats_statistics'; id='H2_PROB_STATS_STATISTICS'; name='통계'; ch='확률과 통계 통계'; dump='H2_통계확통'; zip='통계.zip 내 이미지 5장'; exp=7; expNames=56; sem='H2PS'; semn='고2 확률과 통계' }
  # 기하 · 공간도형과 공간좌표 (GES). H3GE (고3, 명세서 §3① H3GE). 벡터·미분처럼 주제유형까지
  # 완전 수집(141행=배지141), 세부유형은 이름 미수집·배지만 673(유형요약 '확인된 세부유형 이름 수'=0).
  # 배지없음 G023 「다른 과목과의 통합 유형」 1건(문항분류표 행 없음, badge_less standalone).
  # ⚠ 이름 중복 심함: 「다른 과목과의 통합 유형」 단원 내 5회(G008/G015/G023/G030/G046) + 벡터에도 2건,
  #   「자취의 방정식」 벡터 G047과 단원 간 중복 -> 전부 group_id·source_code로 구분(대단원 prefix GES/GEV).
  # 고3 기하 전용 legacy 없어 미사용. GES ≠ 다른 코드.
  @{ code='GES'; out='h3_geometry_space_coordinate'; id='H3_GEOMETRY_SPACE_COORD'; name='공간도형과 공간좌표'; ch='기하 공간도형과 공간좌표'; dump='H3_공간도형'; zip='공간도형과 공간좌표.zip 내 이미지 14장'; exp=46; sem='H3GE'; semn='고3 기하' }
  # 기하 · 이차곡선 (GEC). H3GE (고3). ⚠ group_only: 원본 스크린샷 4장이 유형 묶음 레벨에서 접혀(▶)
  # 하위 주제유형(배지 183) 이름이 캡처 안 됨 — 이미지 직접 확인함. 진단 단위가 유형 묶음이라 46묶음만
  # 저장해도 학생 진단 결과는 동일(선생님 결정). topic_type_count/detail_type_count는 배지에서 얻은
  # 실제 개수(183/727), topic_types는 비움. 재캡처(펼침) 오면 46→183 채우면 됨. 고3 기하 legacy 없음.
  # 「다른 과목과의 통합 유형」 G025·G046 등 이름 중복 있으나 group_id로 구분.
  @{ code='GEC'; out='h3_geometry_conic_section'; id='H3_GEOMETRY_CONIC'; name='이차곡선'; ch='기하 이차곡선'; dump='H3_이차곡선'; zip='이차곡선.zip 내 이미지 4장'; exp=46; sem='H3GE'; semn='고3 기하'; grouponly=$true }
  # 기하 · 벡터 (GEV). H3GE (고3). 주제유형까지 완전 수집(227행, 이름 전부 채워짐). 세부유형은 이름
  # 미수집·배지만 667. 배지없음 단독 2건 G045·G063(문항분류표 행 없음). ⚠ 미결 2건(안내 §33):
  # G055 배지2/실제3, G057 배지1/실제2 — 마지막 행이 묶음 주제와 어긋나 「층 확인」. 배지 없는 단독
  # 묶음 흡수 의심(원본 미대조). 확정 오류 아님. 보이는 행은 저장하되 accepted로 처리하고 근거를 미결로
  # 명기. 원본 대조로 분리 확정되면 묶음 64→66. 「자취의 방정식」 G047은 GES G037과, 「다른 과목과의
  # 통합 유형」 G036·G064는 타 묶음과 이름 중복 — 대단원 prefix(GEV/GES)+group_id로 구분. 고3 기하 legacy 없음.
  @{ code='GEV'; out='h3_geometry_vector'; id='H3_GEOMETRY_VECTOR'; name='벡터'; ch='기하 벡터'; dump='H3_벡터'; zip='벡터.zip 내 이미지 23장'; exp=64; sem='H3GE'; semn='고3 기하'; known=@('G055','G057'); knownNote='안내 시트 §33의 미결 「층 확인」 2건. G055 배지2/실제3, G057 배지1/실제2로 마지막 행이 묶음 주제와 어긋난다. 배지 없는 단독 묶음이 흡수됐을 가능성이 있으나 원본(23장) 미대조로 확정하지 못했다. 화면에 보이는 행은 모두 저장했고, 원본 대조 시 별도 묶음으로 분리되면 유형 묶음 수가 64→66, 배지없음 2→4가 된다. 전사 오류로 확정된 것이 아니라 추적 대상이다.' }
  @{ code='CM2SP'; out='h1_common_math2_set_proposition'; id='H1_COMMON_MATH2_SET_PROPOSITION'; name='집합과 명제'; ch='고1 공통수학2 집합과 명제'; dump='H1_집합과_명제'; zip='공통수학2 집합과 명제.zip 내 PNG 26장'; exp=68; sem='H1S2'; semn='고1 공통수학2'; lg=(PT 'h1_common_math2_set_proposition'); lgArr='problem_types'; lgName='type_name'; lgId='problem_type_id'; alt=(RT 'h1_common_math2_set_proposition'); altArr='sections' }
)
