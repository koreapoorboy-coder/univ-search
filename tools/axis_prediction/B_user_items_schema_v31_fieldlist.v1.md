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
| `dedup_key` (TEXT null) | 멱등 | ★**구성·UNIQUE 여부 판정2 진행중**(아래 §판정2). type 제외는 확정, but unit+본문만으로는 그림의존 문항 소실 위험 [실측 확인] → 구성(answer 추가?)·제약(UNIQUE vs warn-only) 검수 판정 대기. **확정 전 컬럼/인덱스 SQL 미작성** |

## C. v3.1 신규 필드 (3)
| 필드 | 성격 | 근거 |
|---|---|---|
| `dedup_key_norm_version` (TEXT null) | 버전 각인 | ★**차단3**. dedup_key 계산에 쓴 qnorm 버전(=`qnorm.v1`). 규칙 변경 시 `WHERE dedup_key_norm_version != 현재`로 대상만 재생성. field_req §57 "저장된 정규화 산출물엔 예외없이 버전각인" |
| `org_id` (TEXT null) | 비소급 — 출처 기관 | 기관 통합 확정(2026-08-13). **매칭 미참조·집계 미사용**(출처 표시만). 투입 시점에 안 넣으면 어느 기관인지 나중에 복구 불가 → 비소급 |
| `bulk_batch_id` (TEXT null) + **인덱스** | 비소급 — 대량투입 배치 식별 | ★**판정1(검수 2026-08-13)**: provenance JSON 내부 반대(SQLite JSON 인덱스 미적용→배치조회 전체스캔). 배치 롤백 대상 특정 수단 필요. 배치식별자는 투입 시점만 앎=비소급. `idx_ui_batch(bulk_batch_id)` 추가 |

★**이미지 원본 참조** — 미채택 확정(검수 동의). 텍스트 체제 우선.

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

## ★ 판정2: dedup_key type 제외 부작용 — [실측]
### 데이터 제약
- ★question_text 본문은 **리포 미저장**([코드확인] source_items storage_mode = metadata/answer_key only). 정확한 `normalize(question_text)` 해시 실측 불가.
- user_items(본문 저장)는 D1 라이브 = 미접근. 50문항 원문도 리포에 없음(run 2caaa04c 미저장).
- → **프록시 실측**: source_items의 `structure_fingerprint`(구조 지문)·`answer_key` 사용.

### 프록시 [실측] — m2_geometry_properties 150worksheet_set07 (150문항)
- `structure_fingerprint` **충돌 그룹 38 / 걸린 item 91(61%)**.
- ★그중 **answer_key 상이 그룹 34** = 구조 동일·정답 다른 = **실제로 다른 문항**. 표본 Q001·Q002(같은 구조지문, 정답 choice:3 vs choice:4).
- **해석**: 구조동일·답상이 문항이 다수 실재 = 검수 우려("다음 그림에서 x…" 그림의존류) 확인. 단 structure_fingerprint ⊃ normalize(question_text)라 **과대추정**(구조지문 충돌 ≠ 본문 정확일치). 정확 본문 충돌 부분집합 크기는 본문 필요.
- 근거등급 [실측 프록시]. 정확 확정은 사용자 제공 50문항 본문 or user_items D1.

### 설계 옵션 (검수 판정 요청)
- **옵션 A (검수 제안)**: dedup_key = unit+본문, **NON-UNIQUE**(탐지용). 본문 동일이면 차단 말고 **경고만+둘 다 등록** → 매칭 후보다수 → 미매칭 → AI폴백(안전 실패). 멱등(재투입)은 별도 수단 필요.
- **옵션 B (실측 근거 정제)**: dedup_key = **unit + 본문 + normalize(answer)**, UNIQUE 유지. 근거: 실측 34/38 그룹이 answer 상이 → answer가 강한 판별자. answer는 **stable**(type과 달리 진단으로 안 흔들림). 재투입 멱등 유지 + 그림문항(답 상이) 둘 다 등록. 잔여 위험: 본문·답 모두 동일·그림만 다른 희소 케이스는 여전히 뭉침.
- **옵션 C (분리키)**: 멱등키(재투입) = 전체내용 해시 or 소스제공 item_id(UNIQUE) / 본문유사키(경고) = unit+본문(non-unique). 둘 목적 분리. 소실 0 + 멱등 유지. 컬럼 1개 더.
- ★검수 원칙("소실 소급불가 > 미매칭 회복가능")엔 A·C가 정합. B는 소실 축소하나 잔여. **판정 요청**.

## 다음 (검수 대조 후)
1. 20/21컬럼 목록 + 판정2(dedup 옵션 A/B/C) 확정 → `user_items.schema.v3.1.sql` 작성.
2. backfill 대상 건수 확인(admin_items.html total / D1 COUNT) → 0이면 생략.
3. bulk spec v2(5차단 + 확정된 dedup 방침).
