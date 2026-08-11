# 대량투입 JSON 스펙 v1 (2026-08-11, CODE_DRAFT · ★감수 보류·v2 대상)

> ★감수 판정(2026-08-11): **승인 보류.** 5차단(도형실측·source_text복사금지·dedup_key_norm_version·backfill·skip-only) + 질의답 반영해 **v2 요청**됨. 이 v1은 감수 트레일. 실측(도형)·v2 확정 전 투입 금지.


> 스텝 2. 결정 반영: (a) `/add-bulk` 신설 · (b) concept_ids 서버 자동·런타임 조인. 선행 [[B_user_items_field_requirements.v1.md]]·스키마 [[user_items.schema.v3.sql]].
> 검수 감수 대기 → 승인 후 GPT 명세(3)·매칭 구현(4).

## 경로
admin_items.html `[JSON 일괄 업로드]` → Worker `POST /api/user-items/add-bulk` (헤더 `X-Write-Key`). 클라 순회 아님(요청폭주·부분실패 복구난 회피).

## JSON 형식
```json
{
  "batch": {
    "unit_id": "M3_QFUNC",
    "engine_data_base": "https://<host>/.../math-weakness-engine",
    "provenance": { "ingest": "bulk", "extraction": "gpt-<model>-pdf-<yyyymm>", "source": "SC-STUDY 08/11", "at": "2026-08-11T09:00:00Z" }
  },
  "items": [
    {
      "question_no": "1",
      "problem_type_id": "M3_QFUNC_PT006",
      "question_text": "이차함수 f(x)=ax^2-5x-4에서 f(-1)=2일 때, 상수 a의 값을 구하시오.",
      "source_text": "(선택) AI/GPT 구조화 이전 원문",
      "answer": "", "explanation": "", "difficulty": "core",
      "unit_id": "M3_QFUNC"
    }
  ]
}
```

## 필드 규칙
| 필드 | 필수 | 규칙 |
|---|---|---|
| `question_text` | ✅ | 매칭키·정규화 대상. 평문 수식(LaTeX 금지). |
| `unit_id` | ✅(배치 or 항목) | 항목이 batch.unit_id 상속, override 가능. |
| `problem_type_id` | – | 있고 단원 유형목록에 존재 → `approved`. 없거나 미존재 → **`pending`**(방치 방지). |
| `source_text` | – | 없으면 서버가 `question_text` 복사(원문 보존 보장). |
| `answer`·`explanation`·`difficulty` | – | 선택. difficulty 기본 `core`. |
| `question_no` | – | 참고용. **매칭키 아님**(시험지 재구성 가능·§번호배제). |
| `concept_ids` | ✕ | **넣지 마라**(결정 (b)). JSON에 있어도 서버가 무시 → 런타임 조인. |
| `provenance` | – | batch에서 상속, 각 행에 각인. 항목 override 가능. |
| `id` | ✕ | 서버 uuid. 멱등은 dedup_key로(id 아님). |

## 멱등성 (재투입 안전)
- `dedup_key = sha256( qnorm.v1(question_text) + '|' + unit_id + '|' + problem_type_id )`.
- Worker `/add-bulk` = `INSERT ... ON CONFLICT(dedup_key) DO UPDATE`(내용 갱신) 또는 `DO NOTHING`(불변). **같은 JSON 2회 투입해도 중복 0.**
- 중복 문항은 매칭서 "후보 여럿 → 미매칭"으로 미매칭률을 조용히 올리므로 등록 시점 차단이 핵심.
- normalize는 매칭과 **동일 canonical 함수**(qnorm.v1) 재사용 → 추가 설계 없음.

## 응답 (부분실패 표)
```json
{ "ok": true, "worker_version": "<VER>",
  "inserted": 480, "updated": 12, "skipped_dup": 30, "pending": 3,
  "failed": [ { "index": 17, "question_no": "18", "reason": "unit_id 없음" } ] }
```
admin 화면: 성공 n / 갱신 / 중복스킵 / pending / **실패목록+사유 표**. 롤백보다 **재실행(멱등)** 우선.

## 서버 처리 순서(구현 메모, 4번서 실장)
1. `X-Write-Key`·`AXIS_DB` 확인. 2. batch.provenance/unit_id 전개.
3. 항목별: unit_id 확정 → qnorm+dedup_key 계산 → problem_type_id 유형목록 대조(approved/pending) → source_text 없으면 question_text 복사 → provenance 각인 → upsert(ON CONFLICT dedup_key).
4. concept_ids는 **저장 안 함**(조인 경로). 5. 집계·failed 반환.

## 후속
- **GPT 명세(3)**: 이 JSON을 GPT가 PDF→생성하는 지침(SPEC 형태). ★전사 정확도(부호·글자전치=ISSUE_ai_ocr_misread) 방어 문구 포함.
- **매칭 구현(4)**: `/add-bulk`·qnorm.v1 canonical 확정·norm_rule_version 결과레코드 각인·0.99미달 로그.
