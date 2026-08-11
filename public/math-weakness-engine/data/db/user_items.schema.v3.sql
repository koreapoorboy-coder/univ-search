-- ★★ 감수 미반영 · 실행 보류 (2026-08-11) ★★
-- 차단3(dedup_key_norm_version 추가)·차단4(기존행 backfill)·차단2(source_text 자동복사 제거)로 수정 대상.
-- v3.1로 갱신 후 실행할 것. 현재 파일은 감수 트레일용 초안.
--
-- user_items 스키마 v3 (2026-08-11). v2에 가산 컬럼만 추가(기존 데이터 무손실).
-- 근거: B_user_items_field_requirements.v1.md — 비소급(판독 산출물) 보존 + 대량투입 멱등성.
-- D1 콘솔에서 1회 실행. 전부 nullable = 기존 행 영향 0. ★대량투입 전에 반드시 실행(비소급).

-- 1) 비소급 보존 2필드 (검수 #3: 판독기 이력·원문 미보관 확인됨)
ALTER TABLE user_items ADD COLUMN source_text TEXT;   -- AI 구조화 이전 원문(문항판 Fix-A). 없으면 서버가 question_text 복사.
ALTER TABLE user_items ADD COLUMN provenance  TEXT;   -- JSON {ingest:admin|bulk, extraction:판독기·버전, source, at}. 버그 판독기 산출물 격리용.

-- 2) 대량투입 멱등성 (검수 #4a: 재투입 중복 차단)
--    dedup_key = sha256( normalize(question_text) | unit_id | problem_type_id ). normalize = canonical qnorm.v1(매칭과 동일).
--    UNIQUE라 /add-bulk가 ON CONFLICT(dedup_key)로 멱등. 규칙 변경 시 재생성 가능(무결성만 영향, 내용 무관).
ALTER TABLE user_items ADD COLUMN dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ui_dedup ON user_items(dedup_key);  -- 기존 행은 NULL(SQLite는 NULL 다중 허용)

-- 주의: concept_ids 컬럼은 v2 그대로 두되 대량투입 시 채우지 않음(결정 (b): 런타임 조인).
--       기존 admin 등록분의 스냅샷 concept_ids는 유지(호환), 신규는 조인 경로로 통일.
