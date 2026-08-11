# 검수 인계문 — 매칭 설계 국면 (2026-08-11)

> 검수(클로드)용 오리엔테이션 한 장. 검수는 리포 접근 없음(§0) → 아래 6문서를 **파일로** 받음. 전달 경로 Code탭↔사용자↔검수.

## 갱신 (2026-08-11 저녁) — 차단1·2 배포·검증 완료
- **[실측] 차단1·2 프로덕션 검증 통과**(req c89db5b8). VERSION `2026.08.11-nowork-guard` 배포됨(대시보드). 차단1: guard_applied·states{UNKNOWN:20}·is_correct null·run_diagnoseWithGuidance 제거. 차단2: distinct_types 3→12·no_type 0·정확 유형매칭.
- **[대기·사용자]** D1 오늘 레코드 미생성 확인 + 화면 노란문구(Pages 캐시) + 기존 오염 SQL 조회. 서버 저장가드는 클라 skip 경로라 미실행(백스톱, [코드확인]만).

### ★ 다음 트랙 = 결함 ① 닮음 해석층 미구축 [코드확인]
- `m2_similarity`·`m2_similarity_pythagoras` = problem_types 있으나 **edges/rules/remediation 전무**(40 pt 중 rules 없는 단원 딱 이 2개). 유형 배정은 되나 해석 규칙 없어 **UNIT_DATA_NOT_AVAILABLE → 진단 불가**. §2 circle·stat 복구와 동종(대상만 닮음). 나머지 38단원·circle·stat 정상.
- 스코프 미정: 닮음 해석층 구축(circle 복구 방식) vs 보류. 검수 판단 대기.

### 동결 백로그 (배포·다음트랙 전까지 손대지 않음)
- **결함② 필기검수 타단원 내용**: unit=M2_SIMILARITY_PYTHAGORAS·note_text="" 인데 출력=순환소수·유리수(수와식). note_text 빈값 시 하드코딩 샘플 방출 의심 = 차단1 계열(근거 없이 판정 생성). 기록만.
- **결함③ 비용 상승**: 20문항 $1.1029(vs $0.8915, +24%). stage2 출력 8,373→15,479 토큰(NO_MATCH 허용으로 응답 길어짐 추정). §10 실측·학생10명 월 재산정 필요. 기록만.
- **인프라**: index.html==hybrid.html 바이트 동일 복제본 → 항상 같이 수정(dedupe 검토 대상).
- JSON스펙 v2 · SQL v3.1(차단2·3·4·5+A정정엔드포인트) · GPT명세(3) · 근접중복 감사 · no-lexchange 추적(라이브=리포로 종결).

## 지금 국면
매칭 설계 진행 중, request_id **20ea9e45** 진단 JSON 감수에서 **진단 경로 결함 2건** 발견 → 우선순위 **진단경로 > 매칭**으로 재편.

## 검수 대상 = 아래 6문서 (전부 전달됨)
| 문서 | 성격 | 상태 |
|---|---|---|
| `ISSUE_diagnosis_false_correct_and_type_collapse.v1` | 진단 차단1·2 | 근본원인 코드확인 완료·수정안 제시 → **구현 승인 대기** |
| `ISSUE_ai_ocr_misread_diagnosis_path.v1` | AI 부호/글자 오독 | OPEN·조사 TODO(별건) |
| `B_bulk_injection_json_spec.v1` | 대량투입 JSON 스펙 | **감수 보류·5차단 → v2 대기** |
| `B_user_items_field_requirements.v1` | user_items 필드 결정 | 승인(q_norm 런타임·v3 원칙 반영) |
| `user_items.schema.v3.sql` | 스키마 v3 | **실행 보류**(차단3·4 수정대상) |
| `B_match_threshold_experiment.v1` | 임계값·실측 | 0.99 확정(텍스트)·도형 미검증 |

## 검수 대기 결정/승인
1. **차단1 가드 지금 구현할지** (긴급·D1 오염 방지) — 병합 1지점 + 프롬프트
2. 차단2 유형배정 로직 수정 (매칭 구현 전 선결)
3. 도형 유사도 실측 (ocr_measure 별도 실행) — 대량투입 "대수 한정" 게이트
4. D1 오염 조회 결과 (사용자 D1 콘솔)
5. JSON스펙 v2·SQL v3.1(5차단 반영) 착수 타이밍

## 이미 확정된 것
- 임계값 **0.99**(텍스트 체제). 대량투입 방식 = **`/add-bulk`**. concept_ids = **런타임 조인**(스냅샷 아님). 매칭 저장필드 = `source_text`+`provenance`+`dedup_key`.
- 원칙: **저장된 정규화 산출물엔 버전 각인**(`dedup_key_norm_version`), 참조/결과 아니라 **저장 여부**가 기준. **비소급 필드는 투입 전** 필수.
- diff 귀인 함정(3회): 육안 재입력본 금지, 원문 JSON/코드포인트로만.

## 우선순위 순서
차단1 가드 → 차단2 유형로직 → (사용자 재배포 1회) → 도형 실측 → JSON v2·SQL v3.1 → 매칭 구현.

## 제약/메모
- opus-4-8·effort high·3콜, 20문항 **$0.8915**(§10 "$0.16"의 5.6배, 갱신 필요).
- difficulty enum = `['basic','core','advanced','high']`로 통일(bulk v2 락인).
