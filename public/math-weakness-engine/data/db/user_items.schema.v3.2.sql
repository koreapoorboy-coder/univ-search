-- ★★ user_items 스키마 v3.2 — question_no 참조 컬럼 추가 (검수 발견 2026-08-14) ★★
-- 근거: 대량투입 스펙에서 question_no는 필수 입력이나 v3.1까지 user_items에 미저장.
--   inserted_items/skipped_items 응답이 사라지면 "원본 학습지 몇 번 문항"인지 추적 불가(비소급).
--   → 저장(검수 권고). ★식별키 아님(식별=id, 번호배제 원칙 유지) · content_hash 구성요소 아님(같은 문항이 다른 번호로 재사용 가능) · 참조/원본대조용.
-- ★비소급이라 대량투입 전 실행. v3.1(22컬럼 라이브) 위에 가산. nullable = 기존 행 무손실.
-- 실행: D1(scstudy-axis, AXIS_DB) 콘솔 1회. ALTER는 IF NOT EXISTS 미지원 → 1회만("duplicate column name"=이미 적용).

ALTER TABLE user_items ADD COLUMN question_no TEXT;   -- 참조: 원본 학습지 문항번호(bulk_batch_id와 조합해 원본 대조). 비소급.

-- 조회 인덱스: 배치 내 번호로 원본 대조. (bulk_batch_id는 idx_ui_batch 존재 — 복합으로 좁힘)
CREATE INDEX IF NOT EXISTS idx_ui_batch_qno ON user_items(bulk_batch_id, question_no);

-- v3.2 = v3.1(22) + question_no(1) = 23컬럼.
-- ※ 단건 /add(itemAdd)는 question_no를 안 넘김 → null(문항번호 개념이 대량투입 전용). 무손실.
-- ※ 재계산(bulk-assign-type)·매칭은 question_no 미참조 → 승격/매칭 시 값 보존(UPDATE 대상 아님).
