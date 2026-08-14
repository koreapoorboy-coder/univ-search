# 대량투입 JSON 스펙 v2 (2026-08-14, 검수 체크리스트 대조본)

> v1(2026-08-11, 보류) 대체. 그간 확정(차단2·dedup 옵션C·qnorm.v1 canonical·스키마 v3.1 라이브) 반영.
> ★v1과 뒤집힌 항목: **source_text 자동복사 폐지(차단2)** · **dedup_key 구성/역할 변경(옵션C)** · **ON CONFLICT DO NOTHING skip-only(updated 제거)**.
> ★이 스펙은 설계 확정용. /add-bulk 구현은 검수 승인 후. 투입 금지(승인 전).
> 선행: [[B_qnorm_canonical.v1.md]] · [[user_items.schema.v3.1.sql]] · [[B_user_items_field_requirements.v1.md]].

## 1. 경로
- 투입: admin_items.html `[JSON 일괄 업로드]` → `POST /api/user-items/add-bulk` (헤더 `X-Write-Key`). 서버 순회(클라 폭주·부분실패 복구난 회피).
- **dry-run**: 같은 엔드포인트 `{ "dry_run": true }` → **INSERT 없이** 유형매칭 결과(approved/pending 비율)·중복예상·failed만 반환. 실제 투입 전 점검용.
- 정정(내용 수정): **별도 엔드포인트**(`/api/user-items/correct`, 후속). bulk는 skip-only라 기존행 안 건드림.

## 2. JSON 형식
```json
{
  "batch": {
    "unit_id": "M3_QFUNC",
    "org_id": "SCSTUDY",
    "bulk_batch_id": "SCSTUDY-2026-08-14-qfunc-01",
    "engine_data_base": "https://<host>/.../math-weakness-engine",
    "provenance": { "ingest": "bulk", "extraction": "gpt-<model>-pdf-<yyyymm>", "source": "SC-STUDY 08/14", "at": "2026-08-14T09:00:00Z" }
  },
  "items": [
    {
      "question_no": "1",
      "unit_id": "M3_QFUNC",
      "problem_type_id": "M3_QFUNC_PT006",
      "question_text": "이차함수 f(x)=ax^2-5x-4에서 f(-1)=2일 때, 상수 a의 값을 구하시오.",
      "source_text": "(선택) AI/GPT 구조화 이전 원문 — 없으면 넣지 말 것(자동복사 안 함)",
      "answer": "", "explanation": "", "difficulty": "core"
    }
  ]
}
```

## 3. 필드 규칙
| 필드 | 필수 | 규칙 (★=v1 대비 변경) |
|---|---|---|
| `question_text` | ✅ | 매칭키·정규화 대상. 평문 수식(LaTeX 금지). NOT NULL. qnorm→'' 되면 flag(투입 거부). |
| `question_no` | ✅ | ★**필수화**(v1 참고용→필수). 단 **매칭키 아님**(시험지 재구성 가능·번호배제). failed 보고·감사 추적용. |
| `unit_id` | ✅ | ★**항목 우선**(항목값이 batch.unit_id override). 항목 없으면 batch 상속. |
| `problem_type_id` | – | 단원 유형목록에 존재 → `approved`. 없거나 미존재 → **`pending`**(방치 방지). |
| `source_text` | – | ★**자동복사 폐지(차단2)**. 없으면 **null 유지**. question_text 복사 절대 금지. 있으면 그대로 저장(비소급 원문). |
| `answer`·`explanation` | – | 선택. content_hash 구성요소(원문 그대로, qnorm 안 함). |
| `difficulty` | – | enum `['basic','core','advanced','high']` 기본 `core`. ★**source_item_bank 9종과 의도적 불일치 — 정렬/매핑 금지**(4값 고정). |
| `concept_ids` | ✕ | **넣지 마라**. JSON에 있어도 서버 무시 → 런타임 조인(스냅샷 저장 안 함). |
| `org_id` | – | batch에서 상속. 기본 `SCSTUDY`. 출처표시만(매칭·집계 미참조). |
| `bulk_batch_id` | – | batch에서 각인. 배치 롤백 대상 특정(`idx_ui_batch`). 비소급. |
| `provenance` | – | batch 상속·행 각인. ★**append(덮어쓰기 금지)** — 재처리 이력 보존. 정정은 별도 엔드포인트. |
| `id` | ✕ | 서버 uuid. 멱등은 **content_hash**로(id·dedup_key 아님). |

## 4. 멱등·중복 (옵션 C — ★v1에서 전면 변경)
- **멱등키 = `content_hash` UNIQUE**. `INSERT ... ON CONFLICT(content_hash) DO NOTHING` = **skip-only**. 같은 문항 재투입 → `skipped_dup`. ★**DO UPDATE 없음**(updated 제거·검수 지시). 내용 수정은 정정 엔드포인트.
- **탐지키 = `dedup_key` NON-UNIQUE**. 저장은 하되 차단 안 함. 같은 dedup_key(본문+단원 동일, 유형/정답 다를 수 있음) 다수 → **`duplicate_body_warning`으로 보고**(차단 아님). 그림의존 문항(본문동일·답상이) 소실 방지.
- **해시 구성 정본**(schema v3.1 SQL 상단, 구분자 = U+001F):
  - `content_hash = sha256( qnorm.v1(question_text) ⟂ unit_id ⟂ problem_type_id ⟂ answer ⟂ explanation ⟂ difficulty )`
  - `dedup_key   = sha256( qnorm.v1(question_text) ⟂ unit_id )`
- **qnorm.v1 = 워커 인라인 canonical**(매칭·backfill 공유). ★해시 계산 직전 **self-check 차단**(불일치 시 배치 전체 저장 금지·에러). 
- `dedup_key_norm_version = 'qnorm.v1'` 각인 → 규칙 변경 시 `WHERE norm_version != 현재`로 대상 재생성.

## 5. dry-run 모드
- `{ "dry_run": true, ... }` → 각 항목 qnorm+유형대조까지만, **INSERT 0**. 반환:
  `{ ok, dry_run:true, count, would_approved, would_pending, would_skipped_dup(=content_hash 기존존재), duplicate_body_warnings, failed }`.
- 대량 투입 전 pending 비율·중복예상 점검. 투입 결정 후 `dry_run` 빼고 재호출.

## 6. 응답 (부분실패 표 — skip-only)
```json
{ "ok": true, "worker_version": "<VER>", "bulk_batch_id": "SCSTUDY-2026-08-14-qfunc-01",
  "count": 513, "inserted": 480, "skipped_dup": 30, "pending": 3,
  "duplicate_body_warnings": [ { "dedup_key": "8942…", "ids": ["...","..."], "question_no": ["12","47"] } ],
  "failed": [ { "index": 17, "question_no": "18", "reason": "unit_id 없음" } ] }
```
- ★필드: `inserted`·`skipped_dup`·`pending`·`failed` (updated 없음). `duplicate_body_warnings` 반드시 노출.
- admin 화면: 성공/중복스킵/pending/**실패목록+사유 표** + **duplicate_body_warning 목록**. 롤백보다 재실행(멱등) 우선. 배치 롤백 필요시 `bulk_batch_id`로 특정.

## 7. 서버 처리 순서 (구현 메모)
1. `X-Write-Key`·`AXIS_DB` 확인. **qnorm self-check(캐시) — fail 시 전체 차단**.
2. batch 전개(unit_id·org_id·bulk_batch_id·provenance).
3. 항목별: unit_id 확정(항목 우선) → question_no·question_text 검증(빈/누락 failed) → qnorm+content_hash+dedup_key 계산(qnorm→'' 이면 failed) → problem_type_id 유형목록 대조(approved/pending) → source_text 빈값 null(복사 금지) → provenance append·org_id·bulk_batch_id 각인 → `INSERT ON CONFLICT(content_hash) DO NOTHING`.
4. dedup_key 다중출현 집계 → duplicate_body_warnings.
5. concept_ids 저장 안 함(조인). 6. 집계·failed·warnings 반환.

## 8. 투입 후 근접중복 감사
- 투입 후(또는 dry-run 확장) **유형 내 0.99 ≤ sim < 1.0** 쌍 감사 — content_hash는 달라 통과했으나 본문이 매우 유사한 건(표기 drift·숫자만 다른 동일유형). 매칭 미매칭률을 높일 소지 → 목록 보고(차단 아님). 규칙: match_lab/qnorm.v1 dice로 유형별 후보 비교.

## 9. ★ 검수 체크리스트 대조표 (누락 명시 — 투입 후 소급불가)
| # | 검수 확정 항목 | v2 반영 | 위치 |
|---|---|---|---|
| 1 | dedup 옵션 C (content_hash UNIQUE / dedup_key NON-UNIQUE) | ✅ | §4 |
| 2 | 해시 구성 = schema v3.1 상단 정본 | ✅ (구분자 U+001F 명기) | §4 |
| 3 | qnorm.v1 워커 인라인 + 계산경로 self-check 차단 | ✅ | §4·§7-1 |
| 4 | ON CONFLICT DO NOTHING (skip-only)·updated 제거·skipped_dup 통일 | ✅ | §4·§6 |
| 5 | provenance append(덮어쓰기 금지)·정정 전용 엔드포인트 별도 | ✅ | §3·§1 |
| 6 | source_text 자동복사 금지(빈값 null) | ✅ (v1 폐지) | §3 |
| 7 | org_id 기본 SCSTUDY | ✅ | §2·§3 |
| 8 | bulk_batch_id 각인 | ✅ | §2·§3·§6 |
| 9 | difficulty enum 4값·source_item_bank 9종과 의도적 불일치·정렬 금지 | ✅ | §3 |
| 10 | question_no 필수·unit_id 항목 우선 | ✅ | §3 |
| 11 | concept_ids 미저장(런타임 조인) | ✅ | §3·§7-5 |
| 12 | dry-run 모드(INSERT 없이 pending 비율) | ✅ | §5 |
| 13 | 부분실패 표 admin 화면 | ✅ | §6 |
| 14 | dedup_key 충돌 → duplicate_body_warning(차단 아님) | ✅ | §4·§6 |
| 15 | 투입 후 근접중복 감사(유형 내 0.99≤sim<1.0) | ✅ | §8 |
| — | **누락**: 없음(15/15 반영). | — | — |

★검수 재대조 요청: 위 15항 + 누락 0 확인. 이견 시 지적.

## 10. 후속
- **GPT 명세(3)**: 이 JSON을 GPT가 PDF→생성하는 지침(SPEC). ★전사 정확도(부호·글자전치=ISSUE_ai_ocr_misread) 방어 문구 포함.
- **/add-bulk 구현(4)**: 위 §7 순서. computeItemHashes 재사용(Step3 헬퍼). 0.99미달 로그(매칭).
- **정정 엔드포인트**: provenance append·source_text 보존·해시 재계산(content_hash 변경 시 재멱등).
