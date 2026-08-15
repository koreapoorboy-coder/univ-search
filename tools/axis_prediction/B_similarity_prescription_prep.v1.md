# 닮음 처방 저작 준비 — 엔트리 신설 규격 ([코드확인] 3건) v1 (2026-08-14)

> 검수 착수전 [코드확인] 3건. 대상 = M2_SIMILARITY_PYTHAGORAS 87종(`M2_SIMPY_PT`, 비연속 ID). instruction_map 엔트리 0 → **교체 아닌 신설**.
> 기준 = M2_GEOM part04 엔트리 정본(26필드). [실측].

## 1. 엔트리 필수 필드 (26) + 출처
M2_GEOM 엔트리 필드 = 26. 닮음 신설 시 각 출처:
| 필드 | 출처 (닮음) |
|---|---|
| problem_type_id·grade·unit_id·unit_name·type_name | **M2_SIMPY 카탈로그** 그대로 |
| course | **index.v1.json** (M2_SIMPY = "중학수학 2") — ★카탈로그엔 없음 |
| default_difficulty | ★M2_SIMPY 카탈로그 **빈값** → 기본 **'core'** |
| visible_path·taxonomy_levels | **파생**(course + unit_name + type_name → strand/sub_strand/representative/detail). M2_GEOM 형식: `taxonomy_levels={course,unit,strand,sub_strand,representative_type,detail_type}`, `visible_path`=그 값들 join |
| source_orders·raw_section_id | ★M2_SIMPY 카탈로그에 **없음**(대신 attested_item_ids/attested_in_sets) → **생략(또는 null)** |
| error_tags | overlay `pt_fine_error_tags`(87/87) 또는 카탈로그 |
| **8 처방 내용**(problem_nature·required_thinking·must_write_steps·common_wrong_actions·error_checkpoints·student_command·teacher_note·parent_message) | ★**저작**(overlay 관측 근거) |
| matched_template_id·match_score | **null** |
| draft·revision·observed_basis | draft=true·revision=1·**observed_basis=true(전건, overlay 87/87)** |
| concept_ids | ★**생략**(§2 참조) |
- ★**M2_GEOM과 차이**: M2_GEOM 카탈로그엔 source_orders/raw_section_id/default_difficulty가 있었으나 M2_SIMPY 카탈로그엔 없음/빈값 → 생략·기본값 처리. visible_path/taxonomy_levels는 양쪽 다 파생.

## 2. concept_ids — 생략 확정 [코드확인]
- 8/14 결정 = concept_ids **런타임 조인**(단일 진실원). 신설 스냅샷 금지.
- ★**엔진이 instruction.concept_ids를 읽지 않음**(`math_weakness_engine.js` grep = **0**). getWrongAnswerDiagnosis는 concept_ids를 반환 객체에 안 넣고, 점수/개념은 `problemTypeById[pt].concept_ids`(=카탈로그 런타임 조회)를 씀.
- ⇒ **닮음 엔트리에서 concept_ids 생략**(엔진 무영향·런타임조인 정합). M2_GEOM 140의 concept_ids는 기존 데이터(그대로 둠). **근거 = 엔진 미참조 코드확인.**

## 3. part 파일 구조 [실측]
- 매니페스트 `problem_type_instruction_map.v1.json`: split_mode·4 parts·total 12523. **`source_problem_type_files`에 M2_SIMPY 없음**(닮음/삼각비/원/통계 미포함) = 엔트리 0의 이유.
- part01~03 = 3500씩. **part04 = 2023(idx 10500~12522, 6.4MB)** — M2_GEOM 140 + 타단원 1883.
- ★**part04에 append**(2023 → 2110). 추가 87×~3.2KB ≈ +280KB → **~6.7MB(25MB 이내)**. 새 part 불요.
- **매니페스트 갱신**: part04 `instruction_count` 2023→2110·`instruction_end_index` 12522→12609·최상위 `instruction_total_count`/`problem_type_count` 12523→12610·`source_problem_type_files`에 `m2_similarity_pythagoras.problem_types.v1.json` 추가.
- 병합 = M2_GEOM 서지컬 기법(`merge_part04.ps1`/`verify_merge.ps1` 재사용, 타 엔트리 무변경).

## 4. 저작 요건 확정 (M2_GEOM 승계 + 닮음 특이)
- 87종 전량·**비연속 ID 카탈로그 그대로**(PT001-087 가정 금지).
- matched_template_id null·match_score null·draft true·revision 1·**observed_basis 전건 true**(overlay 87/87 — 실제 확인해 기록).
- error_code 4-tier: 1)자기 fine_error_tags → 2)단원 overlay 87 → 3)TAG_DICT_v2 **§5 닮음 13 + §2 도형공통 32** → 4)신설(new_tags 전량+사유). ★overlay 100%라 **신설 거의 0이 정상**(많으면 tier-1 누락 의심).
- checkpoint 3~4 상한 · 개념 내 골격 공유(required_thinking·must_write_steps) · student_command·parent_message 유형별 구분.
- category_ledger 합=87 · concept_map · 재사용률 tier 분해 · **predicted_observed_gaps 수집**(overlay 100%라 정확, A계열 전역부재/B계열 개념국소 구분).

## 5. 진행 방식 (검수 승계)
- 카테고리별 배치·**커밋 12종 이하** · 커밋 전 수치검증 3(JSON파싱·엔트리수·필드완비) + 보조(0-cp·cp≤4·nonnull 0·ledger합) · 롤링 백업(lastgood) · **30종 중간제출**(형식확정) → 87 최종 · 리비전 파일명.
- 저작 후: 엔트리 병합 → no_template_units에서 M2_SIMILARITY_PYTHAGORAS 제거 → 실사용 대조는 **닮음 답안 생길 때**(보류, 백로그 동일).

## 6. 판정 요청 = 2건
1. **엔트리 규격 승인** — §1 필드/출처(특히 concept_ids 생략·source_orders/raw_section_id 생략·observed_basis 전건 true·part04 append).
2. **visible_path/taxonomy_levels 파생 규칙** — M2_GEOM은 detail_type에 "기본 구조 확인" 같은 세부가 있었음(카탈로그 유형명 분해 추정). 닮음은 type_name만으로 detail 분해가 가능한지, 아니면 strand=sub_strand=type_name 단순형으로 갈지 검수 판단.
→ 승인 오면 30종 배치 저작 착수. 확정 전 저작 없음.
