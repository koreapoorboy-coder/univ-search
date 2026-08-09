# 배선 확대 — 오버레이 생성 커버리지 보고 (2026-08-09, 검수 확인용)

> 생성 완료(레시피: reflection `likely_error_tags` ⋈ source_item_links `primary_problem_type_id`, item_id 조인, PT별 union). **QF 재생성치가 기존 오버레이와 정확히 일치**(46/176·min2·max24·avg3.85) → 레시피 검증됨. 배선(index 구동화·Worker·발행) **전에 이 보고 확인 요청**.

## 생성 결과 (retagged 11 distinct 단원)
| 단원 | reflset | items | 커버리지(PT중) | join_fail | 태그/PT min·max·avg | 배선 |
|---|---|---|---|---|---|---|
| m2_geometry_properties | 1 | 150 | **27/140 (19%)** | 0 | 2·9·4.26 | ✓ |
| m2_linear_function | 2 | 100 | 45/144 (31%) | 0 | 2·8·2.96 | ✓ |
| m2_number_expression | 1 | 150 | 71/211 (34%) | 0 | 1·3·2.15 | ✓ |
| m2_probability | 2 | 300 | 123/153 (80%) | 0 | 2·5·3.01 | ✓ |
| m2_similarity_pythagoras | 2 | 300 | **87/87 (100%)** | 0 | 1·7·3.21 | ✓ |
| m3_circle_properties | 2 | 300 | 47/? | 0 | 1·5·3.09 | ⚠ 보류 |
| m3_polynomial_multiplication_factorization | 2 | 300 | 90/212 (42%) | 0 | 1·8·3.04 | ✓* |
| m3_quadratic_equation | 2 | 300 | 82/144 (57%) | 0 | 1·5·2.83 | ✓ |
| m3_quadratic_function (QF, 완료) | 2 | 300 | 46/176 (26%) | 0 | 2·**24**·3.85 | ✅ 배포됨 |
| m3_real_numbers_and_operations | 1 | 150 | 89/203 (44%) | 0 | 1·5·2.40 | ✓ |
| m3_trigonometric_ratio | 3 | 372 | 86/108 (80%) | 0 | 1·7·3.21 | ✓ |

## 4가지 확인 답 (검수 요청)

### 1) PT 커버리지 — 낮은 단원 있음, 전부 사용 가능
- 범위 **19%~100%**. 최저 **geometry 19%**, 다음 QF 26%. 최고 similarity 100%·probability/trig 80%.
- 커버리지 = 재태깅한 워크시트가 PT 카탈로그를 얼마나 훑었나. 낮으면 **미커버 PT 문항엔 fine 후보 없음 → AI 자유생성(fail-open)**. 낮아도 진단은 정상, fine태그 적중만 적음. QF 26%로 라이브 통과했으니 19%도 동작하나 **적중률 낮음**을 감안.
- ★ **기대치(검수 지시 기록)**: **geometry(19%)·QF(26%) 등 저커버리지 단원은 시험지에서 fine 태그가 적게 나와도 정상.** 미커버 PT 문항은 fail-open으로 거친/자유 태그가 나오고, 그건 결함이 아니라 재태깅이 그 PT를 아직 안 훑은 것. 커버리지↑는 재태깅 워크시트 추가로만 오름(배선 문제 아님).
- ★ **저커버 우려 해소(라이브 관찰, 2026-08-09)**: **geometry 19%에서도 검증 3문항 전부 fine 태그 검출**(circumcenter·central_inscribed·diameter). similarity 100%도 3/3. ⇒ **실사용 적중률은 커버리지 수치보다 높을 것**: 자주 출제되는 유형은 재태깅 워크시트에도 포함됐을 가능성이 높아, 실제 시험지의 흔한 문항은 커버된 PT에 몰림. 커버리지%는 PT 카탈로그 전체 대비이지 출제빈도 가중이 아님.

### 2) 태그/PT 분포 — QF만 이상치, 나머지 절단 불요
- QF 제외 **전 단원 max ≤9**(avg 2.1~4.3). **QF만 max 24**(기존 PT175 이상치). 
- ⇒ **다른 10단원은 상위 N 절단 불필요**(이미 유계). QF만 원하면 그 1개 PT 절단 후보나, 라이브서 문제없었음.

### 3) item_id 스킴 불일치 — 전무
- **11단원 전부 join_fail=0.** reflection↔links item_id 완전 일치. 조인 실패 0. (slug 불일치는 파일명뿐, item_id는 일치.)

### 4) 빠지는 단원 — "20 vs 14"는 워크시트 착시, 실제는 아래
- ★ **재태깅 = 20 워크시트 = 11 distinct 단원.** 11 전부 source_item_links 있음(0-fail). **조인 사유로 빠지는 단원 0.**
- **확대 대상 정정: "19단원" 아님. 실제 = 11 distinct 단원.** QF 완료 → **남은 10**, 그중 circle 보류 → **깨끗이 배선가능 9단원**.
- ⚠ **circle_properties 보류**: index에 등록됐으나 참조 PT 파일 `m3_circle_properties.problem_types.v1.json` **실제 부재**(기존 런타임 갭 — circle 진단 자체가 이미 깨져 있음). 오버레이(47PT)는 생성됐으나 검증·배선 불가. **circle는 PT파일 복구 별건 트랙 후로 보류.**
- **polynomial 주의(✓*)**: index unit_id=`M3_POLYNOMIAL_FACTORING`(파일 슬러그와 다름). 오버레이 PT키는 PT파일과 일치 확인 → **그 unit_id 엔트리에 등록**하면 배선 OK.
- **비대상**: links만 있고 재태깅 없는 3단원(linear_equation·linear_inequality·statistics)=fine태그 없음→오버레이 없음(정상). **고등(h1/h2)·기타 중등=재태깅 전무→현재 불가**(재태깅 선행 필요). **fine층 상한 = 중등 11단원.**

## 산출물 (로컬 draft, 미커밋)
- `data/axis_map/<unit>.pt_fine_error_tags.v1.json` 11개 생성(circle 포함). 생성기 `B_wiring_gen_overlays.ps1`.
- **커밋·배선은 이 보고 확인 후.** 확인 항목: (a) 9단원 진행 OK? (b) geometry 19% 그대로 vs 보류? (c) QF max24 절단 여부? (d) circle 보류 승인?

## 배선 순서(확인 후)
1. index.v1.json 각 단원 엔트리에 `fine_error_tags_overlay` 경로 추가(9단원, polynomial=M3_POLYNOMIAL_FACTORING).
2. Worker: 하드코딩 `FINE_OVERLAY_BY_UNIT` → index 엔트리서 읽기(제네릭). **사용자 배포 1회.**
3. 오버레이 파일 발행(데이터 갱신).
4. 테스터로 2~3단원 샘플 검증.
