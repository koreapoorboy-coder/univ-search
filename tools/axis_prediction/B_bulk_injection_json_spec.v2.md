# 대량투입 JSON 스펙 v2 (2026-08-14, 검수 대조·2차 반영본)

> v1(2026-08-11, 보류) 대체. 확정 반영: 차단2·dedup 옵션C·qnorm.v1 canonical·스키마 v3.1 라이브.
> ★v1과 뒤집힌 항목: **source_text 자동복사 폐지(차단2)** · **dedup_key 구성/역할 변경(옵션C)** · **ON CONFLICT DO NOTHING skip-only(updated 제거)**.
> ★2차 반영(검수 2026-08-14): pending 임계 게이트 **폐기** → **pending 후처리 절 신설** · 유형 카탈로그 필수 · concept_ids 스냅샷 처리 · 배치 롤백 · self-check 순서 · 근접중복 감사 dry-run 포함.
> ★설계 확정용. /add-bulk 구현·투입은 검수 승인 후. 선행: [[B_qnorm_canonical.v1.md]] · [[user_items.schema.v3.1.sql]] · [[B_user_items_field_requirements.v1.md]].

## 1. 경로
- 투입: admin_items.html `[JSON 일괄 업로드]` → `POST /api/user-items/add-bulk` (헤더 `X-Write-Key`). 서버 순회(클라 폭주·부분실패 복구난 회피).
- **dry-run**: 같은 엔드포인트 `{ "dry_run": true }` → INSERT 없이 후처리 예측(§5).
- 정정(내용 수정): **별도 엔드포인트**(`/api/user-items/correct`, 후속). bulk는 skip-only라 기존행 안 건드림.
- 배치 롤백: admin 버튼(§9).

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
| `question_text` | ✅ | 매칭키·정규화 대상. 평문 수식(LaTeX 금지). NOT NULL. qnorm→'' 되면 failed(투입 거부). |
| `question_no` | ✅ | ★**필수화**. 단 **매칭키 아님**(시험지 재구성 가능·번호배제). failed 보고·pending 후처리·감사 추적용. |
| `unit_id` | ✅ | ★**항목 우선**(항목값이 batch.unit_id override). 항목 없으면 batch 상속. |
| `problem_type_id` | – | 단원 유형목록에 존재 → `approved`. 없거나 미존재 → **`pending`**(방치 방지·후처리 §6). |
| `source_text` | – | ★**자동복사 폐지(차단2)**. 없으면 **null 유지**. question_text 복사 절대 금지. 있으면 그대로 저장(비소급 원문). |
| `answer`·`explanation` | – | 선택. content_hash 구성요소(원문 그대로, qnorm 안 함). |
| `difficulty` | – | enum `['basic','core','advanced','high']` 기본 `core`. ★**source_item_bank 9종과 의도적 불일치 — 정렬/매핑 금지**(4값 고정). |
| `concept_ids` | ✕ | **넣지 마라**. 서버 무시 → 런타임 조인(스냅샷 저장 안 함). 기존 스냅샷 행 처리 = §8. |
| `org_id` | – | batch 상속. 기본 `SCSTUDY`. 출처표시만(매칭·집계 미참조). |
| `bulk_batch_id` | – | batch 각인. 배치 롤백 대상 특정(`idx_ui_batch`). 비소급. |
| `provenance` | – | batch 상속·행 각인. ★**append(덮어쓰기 금지)** — 재처리 이력 보존. 정정은 별도 엔드포인트. |
| `id` | ✕ | 서버 uuid. 멱등은 **content_hash**로(id·dedup_key 아님). |

## 4. 멱등·중복 (옵션 C — ★v1에서 전면 변경)
- **멱등키 = `content_hash` UNIQUE**. `INSERT ... ON CONFLICT(content_hash) DO NOTHING` = **skip-only**. 재투입 → `skipped_dup`. ★**DO UPDATE 없음**(updated 제거). 내용 수정은 정정 엔드포인트.
- **탐지키 = `dedup_key` NON-UNIQUE**. 저장하되 차단 안 함. 같은 dedup_key(본문+단원 동일) 다수 → **`duplicate_body_warning`으로 보고**(차단 아님). 그림의존 문항(본문동일·답상이) 소실 방지.
- **해시 구성 정본**(schema v3.1 SQL 상단, 구분자 = U+001F):
  - `content_hash = sha256( qnorm.v1(question_text) ⟂ unit_id ⟂ problem_type_id ⟂ answer ⟂ explanation ⟂ difficulty )`
  - `dedup_key   = sha256( qnorm.v1(question_text) ⟂ unit_id )`
- **qnorm.v1 = 워커 인라인 canonical**(매칭·backfill 공유). `dedup_key_norm_version='qnorm.v1'` 각인.
- ★**self-check 차단·순서**(검수 지적 A): self-check(캐시)는 **항목 루프 진입 전 1회**(§7-1). 통과해야 루프 진입 → **부분 INSERT 후 중간 실패 불가**(루프 안에서 self-check 재검사 없음, 실패면 아예 시작 안 함). 구현 시 이 순서 준수 검증.

## 5. dry-run 모드 (역할 = 후처리 미리 파악, ★투입 여부 판정 아님)
- **게이트 폐기**(검수 2026-08-14): "pending 몇 % 넘으면 보류" 기준 **없음**. pending은 안전 상태(저장됨·매칭제외·승격가능)라 잘 처리된 문항까지 막는 게이트는 손실이 큼. → dry-run은 **투입 후 무엇을 후처리(pending 지정·중복 확인)해야 하는지 미리 보는 용도**.
- `{ "dry_run": true, ... }` → 각 항목 qnorm+유형대조까지만, **INSERT 0**. 반환:
```json
{ "ok": true, "dry_run": true, "count": 513,
  "would_approved": 500, "would_skipped_dup": 30,
  "would_pending": [ { "question_no": "12", "reason": "problem_type_id 미지정" }, ... ],
  "duplicate_body_warnings": [ ... ],
  "near_duplicate_warnings": [ { "question_no": ["7","41"], "sim": 0.994 } ],
  "failed": [ ... ] }
```
- ★`would_pending`은 **question_no 목록**(어느 문항이 pending 될지 투입 전 파악 → §6 후처리 연결).
- ★근접중복 감사(§7)를 **dry-run에 포함**(검수 권고 B): 투입 전에 유형 내 0.99≤sim<1.0 쌍을 알 수 있음.

## 6. 유형 배정 = 3단 구조 + pending 후처리 (★검수 2026-08-14 · /add-bulk와 **동시** 구축)
GPT는 유형을 정하지 않음((d), [[B_gpt_item_registration_spec.v2.md]]) → **투입 시 전건 pending이 정상.** 유형은 아래 3단으로 붙는다:
```
1단 GPT     본문 정확 전사 + source_note "유형후보: <설명>". problem_type_id 없음.
2단 검수     GPT JSON + 단원 카탈로그 축약본(problem_type_id·type_name) 기계 대조 →
             확정 목록 [{ (bulk_batch_id+)question_no|id, problem_type_id }] / 애매하면 보류.
3단 사용자   검수 보류분(소수)만 화면에서 판단. 확정 목록은 파일 업로드로 일괄 반영.
```
★2단이 사람 부담을 수백→수십으로 줄임(검수는 카탈로그 대조 가능 — 처방140↔사전163 대조와 동형). 사용자는 파일 업로드+클릭 or 소수 건 화면 선택만.

**후처리 요건(강화 — 없으면 (d)가 사용자 부담으로 무너짐)**:
1. **조회** — admin `status='pending'` 필터 + **`bulk_batch_id` 필터**(배치별 미확정 파악). `/api/user-items/list`에 bulk_batch_id 파라미터 추가. ★목록에 **`source_note`의 `유형후보:` 표시**(사람이 그걸 보고 판단).
2. **일괄 유형 지정** — 신규 `POST /api/user-items/bulk-assign-type`(X-Write-Key). ★**두 입력 방식**:
   - **파일 업로드**: 검수가 만든 확정 JSON `[{ "id":"<uuid>", "problem_type_id":"M2_GEOM_PT041" }, …]` 업로드 → 버튼 1회 일괄 반영. ★**행 식별키 = `id`(검수 확정 2026-08-14)**. `bulk_batch_id+question_no`는 기각(question_no는 PDF 번호라 배치 내 중복 가능 — 같은 학습지 2파일 분할 시 1번이 둘 · §번호배제 원칙과 일관). id는 서버 uuid로 유일. → **검수가 2단 산출물을 만들려면 각 행의 id를 알아야 함 → 투입 응답(§10)에 `inserted_items:[{question_no,id}]` 필수**(없으면 3단 성립 불가).
   - **화면 직접 선택**: 같은 유형후보 문항을 묶어 여러 건 선택 → 유형 지정(소수 건·보류분용). ★유형 선택 UI에 **검색 필터 필수**(448종 드롭다운 스크롤 불가). ★**같은 `유형후보:`끼리 묶어 표시**(비슷한 것 한 번에).
   - 승격 시 content_hash/dedup_key 재계산(problem_type_id가 구성요소). ★**재계산 UNIQUE 충돌 → 실패 말고 conflicts 목록 보고**(§6-2 기존, 미승격 유지·사용자 판단).
3. **진행률** — 배치별 **"미지정 N건 남음"** + 전체 pending/처리 수(줄어드는 게 보여야 작업 지속). list counts 재사용.
4. **dry-run would_pending 목록**(§5, question_no 포함) — 투입 전 예측.

★**2단용 카탈로그 축약본**: 검수는 D1·리포 접근 없음 → Code탭이 `problem_type_id`+`type_name` 2필드만 뽑은 단원별 축약 카탈로그를 전달. 스크립트 = `tools/axis_prediction/make_catalog_short.ps1`(ASCII·단원 인자·재사용), 산출 = `data/problem_types_short/<UNIT>.catalog_short.v1.json`(39단원 생성됨).
- ★**2단 대조 감안**(검수 관찰 2026-08-14): `type_name`이 두 계열 혼재 — **오류 서술형**("동위각과 엇각 혼동", 무접미 ~46종) vs **유형 서술형**("…-조건 적용", 접미). GPT 유형후보는 "무엇을 묻는가"로 오는데 무접미 46종은 "무엇을 틀리는가"로 적혀 매칭 난이도↑. 2단 대조 시 무접미 계열을 별도 취급(지금 조치 불요).

## 7. 근접중복 감사 (실행 = dry-run 포함 · 투입후 재실행 선택)
- **유형 내 0.99 ≤ sim < 1.0** 쌍 감사 — content_hash는 달라 통과했으나 본문 매우 유사(표기 drift·숫자만 다른 동일유형). 매칭 미매칭률↑ 소지 → `near_duplicate_warnings` 목록(차단 아님).
- ★**실행 주체·시점**(검수 지적 B): **primary = dry-run 내부**(투입 전 파악, §5). 투입 후 재확인 필요 시 같은 로직을 `{ audit_only:true }`로 재호출. qnorm.v1 dice(match_lab 동일 함수)로 유형별 후보 비교.

## 8. 기존 concept_ids 스냅샷 처리 (★신설)
- 결정(8/11 근거4·#4b): concept_ids는 **런타임 조인**(single source = 매핑 테이블). user_items 스냅샷 저장 안 함.
- **기존 admin 등록분(현 3행)의 스냅샷 concept_ids → null로 비운다**(stale 2차 소스 제거·단일진실원 일치). 지금 3행이라 비용 0. 수단 = backfill 확장 또는 1회 `UPDATE user_items SET concept_ids=NULL`(검수 확인 후).
- ★단건 `/add`(itemAdd)도 현재 concept_ids 스냅샷 저장 중 → **저장 중단으로 정렬**(작은 워커 변경, 후속). 매칭·진단은 이미 조인 경로라 영향 없음.

## 9. 배치 롤백 절차 (★신설 — 사용자 CLI 불가)
- 사고(잘못된 배치 투입) 시 급히 찾게 되므로 미리 고정.
- **주체·수단 = admin 버튼**(사용자 CLI·콘솔 불가). 신규 `POST /api/user-items/rollback-batch`(bulk_batch_id, X-Write-Key).
- **가드**: ① 대상 건수 미리보기(`SELECT COUNT(*) WHERE bulk_batch_id=?`) → ② bulk_batch_id 재입력 확인 → ③ **soft-delete 우선**(`status='archived'`, 복구 가능) → ④ hard-delete는 별도 명시 클릭(`DELETE`). 기존 itemDelete soft/hard 패턴 재사용.
- **폴백**: D1 콘솔 `DELETE FROM user_items WHERE bulk_batch_id='<id>'`(검수 안내·백업 후).

## 10. 응답 (부분실패 표 — skip-only)
```json
{ "ok": true, "worker_version": "<VER>", "bulk_batch_id": "SCSTUDY-2026-08-14-qfunc-01",
  "count": 513, "inserted": 480, "skipped_dup": 30, "pending": 480,
  "inserted_items": [ { "question_no": "1", "id": "<uuid>" }, { "question_no": "2", "id": "<uuid>" } ],
  "duplicate_body_warnings": [ { "dedup_key": "8942…", "ids": ["...","..."], "question_no": ["12","47"] } ],
  "near_duplicate_warnings": [ { "question_no": ["7","41"], "sim": 0.994 } ],
  "failed": [ { "index": 17, "question_no": "18", "reason": "unit_id 없음" } ] }
```
- ★**`inserted_items:[{question_no,id}]` 필수**(검수 확정 2026-08-14) — 신규 삽입된 각 행의 서버 uuid를 question_no와 함께 반환. **검수 2단이 question_no↔id를 매핑해 확정 JSON(id 기준)을 만드는 근거. 없으면 3단 성립 불가.** (skipped_dup 행은 기존 id가 있으므로 필요 시 별도 조회; 신규분만 필수.)
- ★(d) 구조에선 GPT가 유형 미배정 → 대개 **`pending`이 `inserted`와 같은 규모**(전건 pending). `inserted`=신규 저장 수, `pending`=그중 유형 없는 수.
- ★필드: `inserted`·`skipped_dup`·`pending`·`inserted_items`·`failed` (updated 없음) + warnings 2종. **duplicate_body_warnings·near_duplicate_warnings 반드시 노출**.
- admin 화면: 성공/중복스킵/pending/**실패목록+사유 표** + warning 목록 + **pending 후처리로 이동(§6)**. 롤백보다 재실행(멱등) 우선.

## 11. 서버 처리 순서 (구현 메모)
1. `X-Write-Key`·`AXIS_DB` 확인. **qnorm self-check(캐시) — fail 시 전체 차단(루프 진입 전)**.
2. batch 전개(unit_id·org_id·bulk_batch_id·provenance).
3. 항목별: unit_id 확정(항목 우선) → question_no·question_text 검증(빈/누락 failed) → qnorm+content_hash+dedup_key 계산(qnorm→'' failed) → problem_type_id 유형목록 대조(approved/pending) → source_text 빈값 null(복사 금지) → provenance append·org_id·bulk_batch_id 각인 → `INSERT ON CONFLICT(content_hash) DO NOTHING`.
4. dedup_key 다중출현 집계 → duplicate_body_warnings. 유형 내 근접중복 → near_duplicate_warnings.
5. concept_ids 저장 안 함(조인). 6. 집계·failed·warnings 반환.

## 12. ★ 검수 체크리스트 대조표 (1차 15 + 2차 6 · 누락 명시)
| # | 검수 확정 항목 | v2 반영 | 위치 |
|---|---|---|---|
| 1 | dedup 옵션 C (content_hash UNIQUE / dedup_key NON-UNIQUE) | ✅ | §4 |
| 2 | 해시 구성 = schema v3.1 정본(구분자 U+001F) | ✅ | §4 |
| 3 | qnorm.v1 워커 인라인 + 계산경로 self-check 차단 | ✅ | §4·§11-1 |
| 4 | ON CONFLICT DO NOTHING(skip-only)·updated 제거 | ✅ | §4·§10 |
| 5 | provenance append·정정 전용 엔드포인트 별도 | ✅ | §3·§1 |
| 6 | source_text 자동복사 금지(빈값 null) | ✅ | §3 |
| 7 | org_id 기본 SCSTUDY | ✅ | §2·§3 |
| 8 | bulk_batch_id 각인 | ✅ | §2·§3·§10 |
| 9 | difficulty 4값 enum·9종 bank와 의도적 불일치·정렬금지 | ✅ | §3 |
| 10 | question_no 필수·unit_id 항목 우선 | ✅ | §3 |
| 11 | concept_ids 미저장(런타임 조인) | ✅ | §3·§11-5 |
| 12 | dry-run 모드 | ✅ (역할=후처리 파악) | §5 |
| 13 | 부분실패 표 admin 화면 | ✅ | §10 |
| 14 | dedup_key 충돌 → duplicate_body_warning(차단 아님) | ✅ | §4·§10 |
| 15 | 투입 후 근접중복 감사(0.99≤sim<1.0) | ✅ (dry-run 포함) | §7 |
| **2차** | | | |
| 16 | ~~pending 임계 게이트~~ → **폐기**(사용자 결정) | ✅ 폐기 명기 | §5 |
| 17 | **pending 후처리 절 신설**(조회·일괄지정·진행률·dry-run목록) | ✅ /add-bulk 동시 | §6 |
| 18 | dry-run 역할 변경(후처리 파악) | ✅ | §5 |
| 19 | 유형 카탈로그 필수 첨부(GPT 명세) | ✅ | §13 |
| 20 | 기존 concept_ids 스냅샷 처리(null) | ✅ | §8 |
| 21 | 배치 롤백 절차(admin 버튼·soft우선) | ✅ | §9 |
| A | self-check 순서(루프 전 1회·부분INSERT 불가) | ✅ | §4·§11-1 |
| B | 근접중복 감사 dry-run 포함 | ✅ | §5·§7 |
| — | **누락: 없음** (21항 + 지적 A·B 반영). | — | — |

★검수 재대조 요청: 위 전항 + 누락 0 확인. 이견 시 지적.

## 13. 후속
- **GPT 문항등록 명세(3)**: 이 JSON을 GPT가 PDF→생성하는 지침(SPEC). 포함 필수:
  - ★**problem_type_id 유형 카탈로그 필수 첨부**(태그 사전과 동일 위상). **목록에 없으면 유형을 만들지 말고 비우고(→pending) 사유 기재.** = pending 폭증을 막는 유일한 수단(§6 후처리 부담 최소화).
  - ★전사 정확도(부호·글자전치 = ISSUE_ai_ocr_misread) 방어 문구.
- **/add-bulk 구현(4)**: §11 순서. computeItemHashes(Step3 헬퍼) 재사용. **§6 pending 후처리 4종 동시 구축.** 0.99미달 로그(매칭).
- **매칭 구현(5)**: qnorm.v1 canonical·norm_rule_version 결과레코드 각인·0.99미달 로그.
- **정정 엔드포인트**: provenance append·source_text 보존·해시 재계산(content_hash 변경 시 재멱등).
