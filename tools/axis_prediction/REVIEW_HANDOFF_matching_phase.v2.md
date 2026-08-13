# 검수 인계문 v2 — 매칭+다기관 국면 (2026-08-13)

> v1(2026-08-11) 대체. 검수(클로드)는 리포 접근 없음 → 파일로 받아 대조. 전달 경로 Code탭↔사용자↔검수.
> ★이 v2는 검수 §-스펙(2026-08-13)에 따라 갱신. 검수 보유본과 대조 후 확정.

## §2 완료된 것 (v1 이후 · [실측]/[코드확인] 표기)
- **차단1·2 + 저장가드** — worker `2026.08.11-catstage-a2b` (+ 배포판 `2026.08.11-nowork-guard`, req c89db5b8 검증 통과). 차단1 guard_applied·is_correct null, 차단2 distinct_types 3→12·no_type 0.
- **레버 A(범주 2단계) 적용** — 유형 일치율 90%는 A 전후 동일. **category 100% 안정**이 산출물(재현성 확보).
- **결함① 게이트** — `template_unit_map.v1.json` no_template_units **12단원**(M2_GEOM 해제됨, c0b7b673). 엔진 line 344 [코드확인]: `_tplId && has(unit) && !generic` 억제.
- **★M2_GEOM 처방 140종 — 저작·병합·게이트해제·실사용 검증 완료.**
  - 저작 195e2e76(신설 8·재사용 distinct 79%/배치 85.5%·멀티18 신설0), 병합 de66406e(part04 텍스트 서지컬·타단원 1883 무변경), 게이트해제 c0b7b673, 실사용 관찰 10821104.
  - 실사용 대조(run 2caaa04c) [실측]: 오답 4건(10·19·36·37) suppressed_reason 소멸·8필드 렌더·matched_template_id null·ACTION_LINEAR_FUNCTION 소멸. 정상층 무손상. 비용 $2.5356($2.4954 동급). ★37번→PT074, student_command 앞 절 PT065 앵커 리터럴 = waver 실작동.

## §4/§5 우선순위 순서 (교체)
- 기존 **"AI 판독 오류 조사" 국면 종료.**
- **새 순서**: (1) **문항 매칭 + 다기관 지원**(통합 구현) → (2) **M1 기하 재태깅 + 처방 192**(SOLID83·BASIC55·PLANE54) → (3) **수연산 처방 739**.
- M1 기하 병합 시 M2_GEOM 텍스트 서지컬 기법 재사용(scratchpad/merge_part04.ps1·verify_merge.ps1).

## §6 손대지 말 것 (추가)
- **part04 M2_GEOM 140 엔트리** — 병합 완료(de66406e). 재편집 금지(재저작은 draft에서, 재병합은 서지컬).
- **백업** — `_backup/part04.pre-geom-rewrite.6a63ee99.json`(2640e479=병합전) · `_backup/m2_geom_prescriptions.draft.v1.lastgood.json`.
- (기존) `axis_rules.v44.json` 불가침.

## §7 실무 함정 (추가)
- **push 누락 3회**(2→3). 커밋 후 항상 push 확인.
- **diff 귀인**: 육안 재입력본 금지, 원문 JSON/코드포인트/도구 diff만.
- **★검증 기준은 검증 대상과 독립일 것**(3회 발생) — PS 스크립트 zero-pad 버그로 "0-cp"·regex "M2 digit strip" 오탐. 스크립트 오류를 데이터 문제로 오인 말 것(재계산으로 확인).
- **리포 파일 ≠ 워커 런타임 객체** — description 솎임 사례([[worker-type-object-is-reduced-projection]]).
- **/health 확인 시 t= 값 매번 다르게**(캐시).
- **PS5.1 .ps1 한글은 BOM 없으면 깨짐** → 검증 스크립트 ASCII 전용. ConvertTo-Json 전량 재직렬화 금지(단일원소배열 언랩 버그).

## §9 URL — 변경 없음 (원본 §9 유지)

## §10 비용
- `$0.16`(구) → **50문항 $2.5356**(문항당 ≈ $0.05). two_stage $2.4954와 동급 — 처방 렌더로 인한 증가 없음. opus-4-8·effort high·3콜. (v1 §10 "20문항 $0.8915"도 상위 관측.)

## §11 파일 목록 (추가)
- `tools/axis_prediction/TAG_DICTIONARY_v2.md`(163종 사전, ae388d94) — 리포 경로 명기.
- `tools/axis_prediction/m2_geom_prescriptions.draft.v1.json`(M2_GEOM 140종 처방 정본, _meta에 발견 5계열·category_ledger·waver_pairs). 검수 전달본 Downloads/m2_geom_prescriptions.FINAL_140.v1.json.
- `tools/axis_prediction/HANDOFF_B_PRESCRIPTION.v1.md`(처방 저작 스트림 진입점).

## ★ 신규 절: 미해결 백로그
1. **D1 기존 오염 조회** — 미실행(사용자 D1 콘솔).
2. **닮음 해석층 placeholder** — 실측 미완(v1 배선 요건 미충족 상태).
3. **mismatch 2,297** — 고등 착수 전 선결.
4. **미세축 유형 병합**(③의 B) — 실답안 기반 태그 세분화 최종목표.
5. **관측→태그 개선 절차** — 실사용 시작 시 필수(실데이터 축적→세분화 루프).
6. **관측 태그 자유생성 문제** — 목록 강제(enum) 여부 미결. overlay_live_divergence·observed_tag_instability와 동근원 가능성.
7. **발견 5계열** — predicted_observed_gaps 5 · observed_tag_instability 1 · overlay_live_divergence 1 · type_observation_nature_mismatch 3 · **live_run_observations**(신규: D2 최초등장·observed_error_tags 순환 위험). findings_bundle_for_final에 "관측 어휘가 예측보다 좁음(동일현상 미확인)". 전부 해석 보류.
8. **결함② 필기검수** — 해결됨(저장가드), 확인 완료.
9. **23번 범주 오배정**(원 접선→삼각형의 내심) 2회 재현 — 미해소.
10. **타 기관 결과 제공 형태 시 §1 원칙 재검토** — 관측 데이터는 기관 통합 확정(2026-08-13, 사용자 고유 프로그램). 나중에 "통합 관측으로 만든 태그를 타 기관에 결과로 제공"하는 형태가 되면 §1(서비스형·데이터는 사용자 보유)과의 성격 재검토 필요. 지금 해당 없음(전부 사용자 데이터).

## 다음 트랙 착수 = (1) 문항 매칭 + 다기관 지원
- 사용자 결정 확인됨(다기관 완성 포함 진행).
- **설계 질의 (a) 확정**: 등록 문항 = **단일 풀**. `org_id`는 **출처 표시만**(매칭 미참조). 확정.
- **설계 질의 (b) 확정(2026-08-13)**: 관측 데이터 = **기관 통합**(옵션 가). 근거: 사용자 고유 프로그램, 태그 세분화 재료가 한 곳에 모여야 정교. **3계층 구조 확정**: [문항] 단일 풀·org_id 출처표시만·매칭 미참조 / [관측·집계] 기관 통합·태그 세분화 전체 사용 / [학생 개인] student_code 분리·프로파일 조회 개인 단위. ★관측 통합과 개인 분리는 비충돌 — 같은 axis_records를 집계질의=전체, 조회질의=student_code 거름(구조 분리 아닌 질의 방식 차이). **스키마 별도 조치 불요**(org_id는 넣되 집계 미사용).
- **v1 매칭 확정 유지**: 임계값 **0.99**(텍스트 체제·도형 미검증), 방식 **/add-bulk**, concept_ids **런타임 조인**, 저장필드 `source_text`+`provenance`+`dedup_key`, **저장 산출물 버전각인**(`dedup_key_norm_version`), **비소급 필드는 투입 전**, difficulty enum `['basic','core','advanced','high']`.
- **★dedup_key 구성 변경(검수 판정 2026-08-13)**: `unit + type + 본문해시` → **`unit + 본문해시`(type 제외)**. 근거: 유형 90% 흔들림(레버A로 category만 100% 안정) → type을 키에 넣으면 같은 문항이 유형 변동 시 중복 등록. B_bulk_injection_json_spec v2 작성 시 반영.
- **착수 시 선행(v1 이월)**:
  - `user_items.schema.v3.sql` — 차단3·4 수정 미반영(실행 보류). 매칭 착수 시 **v3.1로 갱신하며 `org_id` 동시 투입**(비소급 필드는 투입 전 원칙).
  - `B_bulk_injection_json_spec v2` — 미작성. 5차단 + dedup_key 변경 반영 필요.
- **관련 문서**(v1 §검수대상): B_user_items_field_requirements(승인).

## 문서 계보 (★검수 2026-08-13 요청 — 완료)
- **전체 인계 = `tools/axis_prediction/HANDOFF_검수_20260811.md`** ✅**리포 커밋됨**(2026-08-13, 검수 보유본 원본 + 최상단 v2연결 배너 1블록만 Code탭 추가). 권위 절: **§0 역할 · §1 목적 · §3 매칭설계 · §6 손대지말것 · §7 함정 · §8 자세 · §9 URL · §11 파일**.
- **현 국면 = 이 문서(v2)**. ★전체 인계 문서의 **§2(완료)·§4·§5(순서)·§10(비용)은 stale → v2가 갱신·대체**(완료 항목·우선순위·비용은 v2 기준). URL·역할·인프라는 v2에 비어 있으니 상위 문서 참조.
- **★새 세션 시작 파일 = `HANDOFF_검수_20260811.md`**(배너가 v2로 연결) → 둘 다 읽을 것: 역할·URL·인프라는 상위, 완료·백로그·다음 트랙은 v2.

---
> 대조 포인트: §9 URL은 원본 유지로 표기(Code탭 미보유). 검수 보유본과 §번호 매핑 상이할 수 있어 각 절에 내용 기준으로 대조 요망.
