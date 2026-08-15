# M1 기하 재태깅 명세 v1 — 리비전 r4 (GPT용) 2026-08-14

> ★r4: 수치 정정 — overlay 36 = 사전중복 **30** + 고유 **6**(`law_selection_error`는 사전 §6 소속 = tier-2, overlay 고유 아님). tier 표 ~39→36.
> ★r3: tier-1 기대치 정정(고유 대부분 M2전용 → M1 재사용 기대 낮음·실질풀 tier-2 45) + 단원별 순차·new_tags 이월(§11).
> ★r2: SPEC v4 누락 3건 반영 — §3 정답률 판정 · §4 verification_scan · §5 tag_scope + 유형당 2~3개.
> 대상: M1_BASIC_GEOMETRY(55)·M1_PLANE_GEOMETRY(54)·M1_SOLID_GEOMETRY(83) = **192유형**. 실태 = [[B_m1_geometry_retag_audit.v1.md]].
> 성격: **예측층 재태깅**. ★관측 대조·predicted_observed_gaps 수집 안 함(실사용에서). SPEC_tagging_v4 계승 + [[TAG_DICTIONARY_v2.md]](163종).
> 산출 = `tagging_<unit>_v4_v2.json` → `axis_map/<unit>.pt_fine_error_tags.v1.json` overlay.

## 0. 대원칙
1. **재사용 먼저** — 신설 전 tier 순서 조회(§1). 사전은 **v2(163종)** — ★v1 참조 금지(v1은 통합 지시 2건이 정정 전이라 오통합 유발).
2. **오류형만** — "무엇을 틀리는가". 주제형 금지.
3. **1태그=1오류·snake_case.** 대상만 다른 동일 오류는 통합.
4. **유형당 2~3개**(v4 §3). 처방의 checkpoint 3~4와 다름 — 재태깅은 2~3 유지.

## 1. 태그 소스 우선순위 (★이 순서로 조회 후 신설)
| tier | 소스 | 규모 |
|---|---|---|
| **1** | `axis_map/m2_geometry_properties.pt_fine_error_tags.v1.json`(M2_GEOM overlay) | 36 도형 오류태그(각대응·이등변·각추론) |
| **2** | 사전 v2 **§1 범용 13** + **§2 도형공통 32** = **45** | 사전이 "§2를 가장 꼼꼼히" |
| **3** | **신설**(M1 고유) | 작도·전개도·겨냥도·위치관계·다면체 |
- ★**tier-1 실질 기대치(정정 r4)**: overlay 36 중 **30종은 사전 v2 중복**(tier-2로도 조회됨). **고유 6종은 전부 M2 전용**(외심 `circumcenter_*`×2·내심 `incenter_*`·평행사변형 `parallelogram_condition_converse_failure`·사각형포함 `quadrilateral_hierarchy_classification_failure`·합동 `triangle_congruence_condition_selection_failure`) — **외심·내심·평행사변형·합동은 중2 과정이라 중1(M1)엔 거의 안 나옴** → **tier-1의 M1 재사용 기대는 사실상 0. 실질 재사용 풀 = tier-2 45종.** ★단 tier-1 파일은 **삭제 말 것**: M1에 합동 문항이 있으면 `triangle_congruence_condition_selection_failure`가 쓰임(기대 낮을 뿐 0 아님). tier-1 재사용 0은 **정상 신호**(경보 아님).
- ★**단원 간 재사용**: **BASIC→PLANE→SOLID 순** 누적. 앞 단원 태그를 뒤 단원이 조회·재사용.

## 2. 신설 규칙 (v4 §2)
- `snake_case`·**1태그=1오류**·오류형·영문. **대상만 다른 것 통합**(예 `interior_angle_sum_error`를 삼각형·사각형·다각형 공용 — M2_GEOM서 3맥락 실증). **new_tags 전량 보고 + 사유 1줄**.

## 3. ★ 정답률 기반 판정 (v4 §4)
- **정답률이 PDF에 있으면**(문항 위 `| 유형명 | 정답률 67%`) 두 패턴으로 조작 추가지점 판정:
  - **패턴 A 유형 간 절벽**: 인접 유형 20~30pp 하락 = 그 유형에 조작이 하나 더 붙은 지점.
  - **패턴 B 유형 내 이탈**: 유형 내 한두 문항만 낮음 = 그 문항 고유 요소(→ §6 tag_scope 대상).
- ★**M1 학습지에 정답률이 없으면**(shstudy 학습지 실측: 정답률 없음) → **`accuracy: null` 로 두고 §4 스킵, 해설·문항 구조 중심 판정.** 정답률을 지어내지 말 것.

## 4. ★ 두 관점 스캔 = verification_scan (v4 §5) — 사전 §1을 실제로 쓰는 장치
모든 유형에 아래 2관점을 **반드시 스캔**하고, 해당하면 사전 §1 범용 태그를 붙인다. **0건이어도 `verification_scan.checked:true`로 명시(보고 의무).**
- **5-1 검산**(답을 구한 뒤 원 조건으로 되돌아가는 문제인가) → `verification_missing`·`solution_check_omitted`.
- **5-2 답 마무리**(형식·단위·자릿수 확인이 필요한 문제인가) → `answer_format_mismatch`·`final_form_reduction_omitted`·`rounding_instruction_overlooked`·`unit_conversion_omitted`·`ratio_direction_inversion`.
- ★이 스캔이 없으면 §1 범용 13이 재사용될 경로가 없음(요건4 경보의 실행 수단).

## 5. ★ tag_scope (v4 §6) — 유형 전체 아닌 특정 문항 태그
- 근거가 "이 유형에서 **○○ 문항만** 낮다/특정 조건에서만"이면 그 태그는 **유형 전체가 아니라 그 문항/조건에만** 적용 → `tag_scope`에 명시.
- ★**v4 §8 금지: tag_scope 생략 금지.** 특정 문항 태그를 유형 전체에 붙이면 오진단.

## 6. M1 고유 후보 영역 (신설 예상 — 힌트, 먼저 tier1/2 조회)
- BASIC: 작도 절차·점선면 위치관계·각 이등분/수직이등분 작도.
- PLANE: 다각형 내외각·대각선·부채꼴 호넓이(중등 원의성질과 구분).
- SOLID: 겨냥도·전개도 대응·다면체 요소수(오일러)·회전체·겉넓이/부피 전개.

## 7. 재사용률 목표·경보
- M1 신설 단원이라 재사용률 낮게 예상(정상). ★단 **§1(13)+§2(32)=45 중 상당수 재사용되어야 정상. 하나도 안 쓰이면 조회 누락 의심**(특히 §4 verification_scan 미실행 신호). 단원별 `reuse_rate` 보고.

## 8. M2_GEOM 저작 경험
- **개념 내 골격 공유 → 태그도 개념 단위로 묶기.** **상호이동쌍**(흔들리는 유형쌍)엔 상충 태그 금지. ★predicted_observed_gaps 수집 안 함(예측층).

## 9. 산출 형식
```json
{
  "unit": "m1_basic_geometry", "spec": "v4", "dictionary": "v2",
  "problem_types": [
    { "problem_type_id": "M1_BG_PT001", "type_name": "<카탈로그 그대로>",
      "accuracy": null,
      "error_tags": ["angle_correspondence_chain_failure", "verification_missing"],
      "tag_scope": { "verification_missing": "3번 문항(검산 요구)만" },
      "verification_scan": { "checked": true, "applied": ["verification_missing"] },
      "tag_sources": { "reused": ["…"], "new": ["…"] } }
  ],
  "new_tags": [ { "tag": "compass_construction_step_order_error", "reason": "작도 절차 오류 — tier1/2 부재" } ],
  "reuse_rate": { "tier1": 0, "tier2": 0, "new": 0, "total": 0 }
}
```
- 파일명 `tagging_<unit>_v4_v2.json`. 유형은 카탈로그 **192개 전부**. 태그 2~3개/유형.

## 10. ★ 자가검산 체크리스트 (출력 전 — 태그사전 §7 형식)
1. [ ] 사전 참조 **v2**인가(v1 금지).
2. [ ] 카탈로그 전건에 error_tags(2~3개)·**verification_scan.checked** 있는가.
3. [ ] 신설 전 tier1·tier2(45) 조회했고 **§1·§2에서 실제 재사용된 태그가 있는가**(0이면 §4 스캔 누락 의심).
4. [ ] 모든 태그 오류형·snake_case·1태그1오류(주제형 0).
5. [ ] 대상만 다른 동일 오류 통합(불필요 신설 0).
6. [ ] **특정 문항 태그는 tag_scope 명시**(생략 0).
7. [ ] 정답률 있으면 §4 절벽/이탈, 없으면 `accuracy:null`(지어내기 0).
8. [ ] BASIC→PLANE→SOLID 재사용했는가.
9. [ ] new_tags 전량+사유·tag_sources·reuse_rate 채웠는가.
10. [ ] predicted_observed_gaps 등 관측 필드 안 넣었는가(예측층).

## 11. 이후 흐름 · 작업 방식
- ★**단원 하나씩** 진행(BASIC / PLANE / SOLID 3단원을 한 번에 넣지 말 것).
- ★**앞 단원 결과의 `new_tags`를 다음 단원 작업 시 함께 줄 것**(BASIC 결과 → PLANE 작업 입력, PLANE 결과 → SOLID 입력). 안 주면 같은 오류에 이름이 두 번 생김(§1 단원 간 재사용의 실행 수단).
- GPT 재태깅(사용자·문항등록 뒤) → 검수 대조 → overlay 반영(`axis_map/<unit>.pt_fine_error_tags.v1.json`) → **M1 처방 192종**(M2_GEOM 140종 기법: 개념 골격·category_ledger·part 서지컬 병합).
