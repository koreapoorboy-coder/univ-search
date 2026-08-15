# M1 기하 재태깅 명세 v1 (GPT용) 2026-08-14

> 대상: M1_BASIC_GEOMETRY(55)·M1_PLANE_GEOMETRY(54)·M1_SOLID_GEOMETRY(83) = **192유형**. 실태 = [[B_m1_geometry_retag_audit.v1.md]](overlay 부재·재태깅 미착수).
> 성격: **예측층 재태깅**(학습지 문항/유형에서 "학생이 틀리기 쉬운 오류"를 예측). ★관측 대조·predicted_observed_gaps 수집은 **하지 않음**(실사용에서 나중). SPEC_tagging_v4 원칙 계승 + [[TAG_DICTIONARY_v2.md]](163종) 기준.
> 산출 = `tagging_<unit>_v4_v2.json`(§2 형식) → 반영 `axis_map/<unit>.pt_fine_error_tags.v1.json` overlay.

## 0. 대원칙 3
1. **재사용 먼저.** 신설 전 반드시 §2 tier 순서로 조회. 사전은 **v2(163종)** — ★v1 참조 금지.
2. **오류형만.** 태그는 "무엇을 틀리는가"(오류형). "무엇을 묻는가"(주제형) 금지.
3. **1태그=1오류·snake_case.** 대상만 다른 동일 오류는 통합(신설 남발 금지).

## 1. 태그 소스 우선순위 (★반드시 이 순서로 조회 후 신설)
| tier | 소스 | 규모 | 성격 |
|---|---|---|---|
| **1** | `axis_map/m2_geometry_properties.pt_fine_error_tags.v1.json`(M2_GEOM overlay) | ~39 도형 오류태그 | 각대응·이등변·각추론 등 **도형 공통** — M1 각·합동에 직접 차용 |
| **2** | TAG_DICTIONARY_v2 **§1 범용 13** + **§2 도형공통 32** = **45** | 45 | §1=단원무관, §2="원·삼각비·닮음 어디서든" = 도형 전반. ★사전이 "§2를 가장 꼼꼼히" 지시 |
| **3** | **신설** — M1 고유 오류만 | ? | 작도·전개도·겨냥도·위치관계·다면체 등 tier1/2에 없는 것 |
- ★**단원 간 재사용 유도**: BASIC에서 만든/쓴 태그를 PLANE·SOLID가 재사용. 3단원을 독립 작업하지 말고 **BASIC→PLANE→SOLID 순**으로 누적(앞 단원 태그를 뒤 단원이 조회).

## 2. 신설 규칙 (v4 §2)
- `snake_case` · **1태그=1오류** · **오류형**(주제형 금지) · 영문.
- **대상만 다른 것은 통합**: 같은 오류가 삼각형·사각형·다각형에서 나오면 하나로(예: `interior_angle_sum_error`를 대상 무관 재사용 — M2_GEOM 저작서 3맥락 재사용 실증).
- **new_tags 전량 보고** + 각 신설 사유(왜 tier1/2에 없는지) 1줄.

## 3. M1 고유 후보 영역 (신설 예상 — 참고, 강제 아님)
- BASIC(기본도형·작도): 작도 절차 오류, 점·선·면 위치관계, 각의 이등분·수직이등분 작도.
- PLANE(평면도형): 다각형 내·외각, 원과 부채꼴 호·넓이(중등 원의성질과 구분), 다각형 대각선.
- SOLID(입체도형): 겨냥도·전개도 대응, 다면체 요소 수(오일러), 회전체, 겉넓이·부피 전개.
- ★위는 힌트일 뿐. **먼저 tier1/2 조회**하고 없을 때만 신설.

## 4. 재사용률 목표·경보
- M1은 신설 단원이라 재사용률은 낮게 나올 수 있음(정상).
- ★단 **tier2의 §1 범용 13 + §2 도형공통 32 = 45종은 상당수 재사용되어야 정상**. 그 45종에서 **하나도 안 쓰였다면 조회 누락 의심** → 재확인.
- 보고에 **단원별 재사용률**(tier1/2 재사용 수 / 전체 태그 수) 명시.

## 5. M2_GEOM 저작 경험 반영
- **개념 내 골격 공유** → 태그도 **개념 단위로 묶어** 부여(같은 개념의 유형들은 태그 집합이 겹침).
- **상호이동쌍 주의**: 유형이 서로 흔들리는 쌍(A2 관측)엔 **상충되는 태그를 쓰지 말 것**(같은 오류를 다르게 태깅하면 진단 불안정).
- ★**predicted_observed_gaps 수집 안 함** — 재태깅은 예측층. 관측 대조는 실사용에서(명세 범위 밖).

## 6. 산출 형식
```json
{
  "unit": "m1_basic_geometry",
  "spec": "v4", "dictionary": "v2",
  "problem_types": [
    { "problem_type_id": "M1_BG_PT001", "type_name": "<카탈로그 그대로>",
      "error_tags": ["angle_correspondence_chain_failure", "<...>"],
      "tag_sources": { "reused": ["…(tier1/2 태그)"], "new": ["…(신설)"] } }
  ],
  "new_tags": [ { "tag": "compass_construction_step_order_error", "reason": "작도 절차 오류 — tier1/2에 없음" } ],
  "reuse_rate": { "tier1": 0, "tier2": 0, "new": 0, "total": 0 }
}
```
- 파일명 = `tagging_<unit>_v4_v2.json`(예: `tagging_basic_geometry_v4_v2.json`). 유형은 **카탈로그 192개 전부**(빠짐없이).

## 7. ★ 자가검산 체크리스트 (출력 전 — 태그사전 §7 형식)
1. [ ] 사전 참조가 **v2**인가(v1 금지).
2. [ ] 모든 유형(단원 카탈로그 전건)에 error_tags 있는가.
3. [ ] 신설 전 tier1(M2_GEOM overlay)·tier2(§1·§2 45종)를 조회했는가. **§1·§2에서 실제로 재사용된 태그가 있는가**(0이면 조회 누락).
4. [ ] 모든 태그가 오류형·snake_case·1태그=1오류인가(주제형 0).
5. [ ] 대상만 다른 동일 오류를 통합했는가(불필요 신설 0).
6. [ ] new_tags 전량 + 사유가 있는가.
7. [ ] BASIC→PLANE→SOLID 순으로 앞 단원 태그를 뒤 단원이 재사용했는가.
8. [ ] tag_sources(reused/new)·reuse_rate를 채웠는가.
9. [ ] predicted_observed_gaps 같은 관측 필드를 넣지 않았는가(예측층).

## 8. 이후 흐름
GPT 재태깅(사용자, 문항등록 뒤) → 검수 대조(tier 재사용·신설 사유·오류형) → overlay 반영(`axis_map/<unit>.pt_fine_error_tags.v1.json`) → **M1 처방 192종 저작**(M2_GEOM 140종 기법: 개념 골격·category_ledger·part 병합 서지컬).
