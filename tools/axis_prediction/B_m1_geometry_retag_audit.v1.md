# M1 기하 재태깅 실태 조사 (착수 전 [코드확인]) v1 (2026-08-14)

> 검수 착수전 4건. 대상 3단원: M1_BASIC_GEOMETRY(55)·M1_PLANE_GEOMETRY(54)·M1_SOLID_GEOMETRY(83) = **192종**.
> 방법: 리포 파일 실측(존재·종수·구조).

## 1. 3단원 현재 상태 [실측]
| 항목 | M1_BASIC(55) | M1_PLANE(54) | M1_SOLID(83) |
|---|---|---|---|
| problem_types 카탈로그 | ✅ 55 (id `M1_BG_PT`) | ✅ 54 (`M1_PG_PT`) | ✅ 83 (`M1_SG_PT`) |
| **fine_error_tags overlay**(axis_map) | ❌ **부재** | ❌ **부재** | ❌ **부재** |
| edges / rules / remediation | ✅ 3종 존재 | ✅ | ✅ |
| instruction_map 엔트리 | 55 | 54 | 83 |
- ★**instruction_map은 192 전건 엔트리 존재하나, 3단원 모두 `no_template_units`(12) 소속**(line 8 확정). = 전용 처방 없음·GENERIC/억제(엔진 line 344 `suppressed_reason=no_template_for_unit`). **M2_GEOM(처방 전) 상태와 동일 → 실처방 192종 저작 대상.**
- M2_GEOM은 no_template_units에서 **제거됨**(처방 완료·게이트 해제, 2026-08-13). M1 기하 3단원은 잔존 12단원에 포함.

## 2. §2 재태깅에 M1 기하 포함됐나 → ❌ 아니오 [실측]
- `_inbox`·`axis_map`에 **`tagging_basic/plane/solid_geometry` 산출물 부재**(있는 건 확률·닮음·삼각비 등, M1 기하 아님).
- ⇒ **overlay 0 = 재태깅을 안 한 것**(했는데 반영 누락이 아님). 기존 산출물 재사용 **불가** → **신규 재태깅 필요.**

## 3. 재태깅 산출물 형식 [코드확인]
- §2 실적 형식 = GPT 산출 **`tagging_<unit>_v4_v2.json`**(`_inbox`) → 반영 = **`axis_map/<unit>.pt_fine_error_tags.v1.json`** overlay.
- overlay 구조 = `{ version, unit, join, n_pt, total_pt, pt_fine_error_tags: { <PT_id>: [error_tag,…] } }`. M1도 이 형식·경로 그대로.
- 사전 = `TAG_DICTIONARY_v2.md`(163종). 명세 = `SPEC_tagging_v4`(§2 GPT 명세) 재사용.

## 4. M2_GEOM overlay 차용 가능성 [실측]
- `m2_geometry_properties.pt_fine_error_tags.v1.json`: `pt_fine_error_tags` 맵, **n_pt=27/140**, 고유 오류태그 **~31**.
- 태그 예: `angle_correspondence_chain_failure`·`isosceles_triangle_angle_chain_failure`·`angle_bisector_chain_integration_failure` 등 = **도형 공통 오류**(각 대응·이등변·각 추론).
- ⇒ **차용 가능**: M1 기하의 각 관계·합동·평면/입체 도형 오류에 겹치는 태그는 재사용 → 신설 축소.
- ⇒ **신설 필요**: M1 고유(작도·전개도·겨냥도·위치관계·다면체) 오류는 M2_GEOM에 없음. 재태깅에서 신설.

## 5. 순서 판단 (검수 잠정 5단계 + 사용자 병행 우려)
검수 5단계: 조사 → 재태깅 명세 → GPT 재태깅(사용자) → 검수 대조·overlay 반영 → 처방 192 저작.
- ★**사용자 병행 부담**: 3번(GPT 재태깅)과 문항 등록(GPT) 둘 다 GPT 작업 → 겹침. **판단**: 명세 작성(2번, Code탭)은 지금 진행 가능. GPT 재태깅(3번)은 사용자가 문항등록과 우선순위 조율. 문항등록이 매칭 가치를 즉시 내므로(등록 풀↑=매칭률↑) 문항등록 우선, 재태깅은 명세 준비해두고 사용자 여유 시.
- 처방 저작(5번)은 재태깅 overlay 반영 후 = M2_GEOM 140종 기법(part05 신규 or part04 확장·서지컬 병합) 재사용.

## 6. 결론 (검수 판정 요청)
- M1 기하 3단원 = **재태깅·처방 미착수 상태**(카탈로그·edges/rules/remediation는 있음, overlay·전용처방 없음). M2_GEOM 착수 전과 동형.
- **다음 = 재태깅 명세 작성**(Code탭, §2/SPEC_tagging_v4 재사용 + M2_GEOM overlay 차용 지침 + M1 고유 신설). 그 뒤 GPT 재태깅은 사용자 스케줄.
- ★순서(문항등록 vs M1 재태깅 GPT작업) 우선순위 = 사용자 판정.
