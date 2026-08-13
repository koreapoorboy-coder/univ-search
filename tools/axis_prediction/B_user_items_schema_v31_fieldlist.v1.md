# user_items 스키마 v3.1 — 필드 최종 목록 (SQL 실행 전 검수 대조용) 2026-08-13

> ★투입 후 소급 불가. 이 목록을 검수가 대조·확정한 뒤에 SQL 작성·실행. v3 초안(실행 보류) → v3.1.
> 근거: B_user_items_field_requirements.v1(승인) + 차단2·3·4 + dedup_key 구성변경(2026-08-13) + org_id(기관 통합).

## A. 기존 v2 필드 — 변경 없음 (15)
`id`(PK uuid) · `created_at`(NOT NULL) · `updated_at` · `status`(approved|pending|archived) · `unit_id` · `unit_name` · `problem_type_id` · `type_name` · `concept_ids`(JSON, 런타임 조인 원칙: 신규 미저장·admin 스냅샷 유지) · `question_text`(NOT NULL, 매칭 본문) · `answer` · `explanation` · `difficulty`(basic|core|advanced|high) · `error_tags`(JSON) · `source_note`

## B. v3 추가 필드 — 이미 v3 초안 존재 (3)
| 필드 | 성격 | v3.1 변경 |
|---|---|---|
| `source_text` (TEXT null) | 비소급 — AI 구조화 이전 원문 | ★**차단2**: "빈값이면 question_text 자동복사" 로직 **제거**(null 유지·하드코딩 방출 금지). 컬럼 자체는 유지 |
| `provenance` (TEXT null, JSON) | 비소급 — 판독 이력 `{ingest:admin\|bulk, extraction:worker-<ver>\|gpt\|manual, source, at}` | 유지 |
| `dedup_key` (TEXT null, UNIQUE) | 멱등 | ★**구성 변경**: `sha256(normalize(question_text) \| unit_id)` — **problem_type_id(type) 제외**(2026-08-13, 유형 90% 흔들림). 기존 v3: type 포함 → 제거 |

## C. v3.1 신규 필드 (2)
| 필드 | 성격 | 근거 |
|---|---|---|
| `dedup_key_norm_version` (TEXT null) | 버전 각인 | ★**차단3**. dedup_key 계산에 쓴 qnorm 버전(=`qnorm.v1`). 규칙 변경 시 `WHERE dedup_key_norm_version != 현재`로 대상만 재생성. field_req §57 "저장된 정규화 산출물엔 예외없이 버전각인" |
| `org_id` (TEXT null) | 비소급 — 출처 기관 | 기관 통합 확정(2026-08-13). **매칭 미참조·집계 미사용**(출처 표시만). 투입 시점에 안 넣으면 어느 기관인지 나중에 복구 불가 → 비소급 |

## 인덱스
- 기존: `idx_ui_unit`(unit_id) · `idx_ui_type`(problem_type_id) · `idx_ui_status`(status) · `idx_ui_created`(created_at)
- v3: `uq_ui_dedup` **UNIQUE**(dedup_key)
- v3.1: `org_id` 인덱스 **불요**(집계 미사용·출처표시만). 조회 요건 생기면 나중에. → 가산 최소.

## 차단별 매핑
- **차단2**(source_text 자동복사 제거) = 서버 코드 변경(worker `itemAdd`): source_text 빈값이면 question_text 복사 금지, null 유지. 스키마 아님.
- **차단3**(dedup_key_norm_version) = 신규 컬럼(C).
- **차단4**(backfill) = 기존 행에 `dedup_key`+`dedup_key_norm_version` 채우기. **대상 = 현 user_items total**(★확인 필요: admin_items.html 화면 total 또는 D1 `SELECT COUNT(*) FROM user_items`). 0건이면 backfill 불요.

## 비소급 필드 점검 (투입 후 복구 불가 = 반드시 투입 전)
✓ `source_text`(판독 이전 원문) · ✓ `provenance`(판독기 이력) · ✓ `org_id`(출처 기관, v3.1 신규) · ✓ `dedup_key_norm_version`(정규화 버전).
**미채택 후보(검수 판단 요청)**:
- `bulk_batch_id` — 대량투입 배치 식별. 현재는 `provenance` JSON에 담아 갈음(별도 컬럼 불요). ★배치 단위 롤백을 SQL로 하려면 컬럼이 편리 → 검수가 "배치 롤백을 SQL로 할지" 결정하면 승격.
- 이미지 원본 참조 — 텍스트 체제 우선, 이미지 미검증(field_req §텍스트vs이미지). 이미지 투입 도입 시점에 추가(그때도 비소급이라 그 투입 전). 지금 불요.

## 전체 컬럼 수
v2 15 + v3 추가 3 + v3.1 신규 2 = **20 컬럼**. 신규 5개 전부 nullable·가산 → 기존 행 무손실.

## 다음 (검수 대조 후)
1. 이 목록 확정 → `user_items.schema.v3.1.sql` 작성(ALTER 5 + dedup_key_norm_version·org_id + UNIQUE idx). 차단2는 worker 코드 별건.
2. backfill 대상 건수 확인 → 0이면 backfill SQL 생략, >0이면 dedup_key 생성 UPDATE.
3. bulk spec v2(5차단 + dedup_key=unit+본문해시).
