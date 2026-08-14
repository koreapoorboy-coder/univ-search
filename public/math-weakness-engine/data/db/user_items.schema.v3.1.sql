-- ★★ user_items 스키마 v3.1 — 검수 확정 2026-08-14 ★★
-- 확정 근거: 검수 판정(2026-08-14) — 22컬럼 · dedup 옵션 C · backfill 2건 · org_id 채움.
--   옵션 C = 멱등키 content_hash UNIQUE / 탐지키 dedup_key NON-UNIQUE (목적 분리).
--   ★v3 초안의 uq_ui_dedup UNIQUE 는 만들지 않는다(검수 명시).
-- 실제 기반: user_items.schema.v2.sql(라이브 15컬럼) 위에 가산. 전부 nullable = 기존 2행 무손실.
-- 실행 주체: 사용자가 D1(scstudy-axis, AXIS_DB) 콘솔에서 1회 실행. Code탭은 원문 제공만(인계문 §7).
-- ★ALTER ADD COLUMN 은 SQLite에서 IF NOT EXISTS 미지원 → 1회만 실행.
--   재실행 시 "duplicate column name" 에러 = 이미 적용됨 신호(무해, 무시).

-- ══════════════════════════════════════════════════════════════════
-- STEP 0 — 실행 전 백업 (읽기전용). 결과를 텍스트로 복사·보존할 것.
--   현재 2건뿐이라 SELECT 복사로 충분(검수 지시). D1 전체 백업이면 더 좋음.
-- ══════════════════════════════════════════════════════════════════
-- SELECT * FROM user_items;   ← 먼저 실행, 결과 전체를 텍스트 파일로 저장한 뒤 STEP 1 진행.

-- ══════════════════════════════════════════════════════════════════
-- STEP 1 — 컬럼 7개 추가 (전부 nullable). v2 15 + 여기 7 = 22컬럼.
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE user_items ADD COLUMN source_text            TEXT;   -- 비소급: AI 구조화 이전 원문. ★차단2로 서버 자동복사 제거(null 유지).
ALTER TABLE user_items ADD COLUMN provenance             TEXT;   -- 비소급: JSON {ingest, extraction:판독기·버전, source, at}
ALTER TABLE user_items ADD COLUMN dedup_key              TEXT;   -- 탐지키(NON-UNIQUE): unit_id + normalize(question_text) 해시. 중복 탐지·경고용.
ALTER TABLE user_items ADD COLUMN dedup_key_norm_version TEXT;   -- 차단3: dedup_key/content_hash 계산에 쓴 정규화 버전(=qnorm.v1). 규칙 변경 시 대상 재생성.
ALTER TABLE user_items ADD COLUMN org_id                 TEXT;   -- 비소급: 출처 기관. 매칭 미참조·집계 미사용(출처 표시만). 기관 통합 확정(2026-08-13).
ALTER TABLE user_items ADD COLUMN bulk_batch_id          TEXT;   -- 비소급: 대량투입 배치 식별(배치 롤백 대상 특정). 판정1(2026-08-13).
ALTER TABLE user_items ADD COLUMN content_hash           TEXT;   -- 멱등키(UNIQUE): 전체내용 해시. 동일 문항 재투입 차단(ON CONFLICT).

-- ══════════════════════════════════════════════════════════════════
-- STEP 2 — 인덱스. content_hash 만 UNIQUE. dedup_key 는 NON-UNIQUE.
--   기존 2행은 content_hash/dedup_key 가 NULL → SQLite는 UNIQUE 인덱스에서 NULL 다중 허용(충돌 없음).
-- ══════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS uq_ui_content ON user_items(content_hash);  -- 멱등(재투입 차단)
CREATE INDEX        IF NOT EXISTS idx_ui_dedup  ON user_items(dedup_key);     -- 중복 탐지 조회
CREATE INDEX        IF NOT EXISTS idx_ui_batch  ON user_items(bulk_batch_id); -- 배치 롤백 대상 조회
-- ★v3 초안의  CREATE UNIQUE INDEX uq_ui_dedup  는 만들지 않는다(옵션 C: dedup_key NON-UNIQUE).

-- ══════════════════════════════════════════════════════════════════
-- STEP 3 — backfill (기존 2행)
-- ══════════════════════════════════════════════════════════════════
-- 3a. org_id — 콘솔에서 실행 가능(해시 불요). ★기관 식별자 문자열 확정 후 <ORG> 치환.
--     검수 권고: NULL 로 두지 말고 사용자 기관 값으로 채울 것(지금 2건뿐, 비용 0).
-- UPDATE user_items SET org_id = '<ORG>' WHERE org_id IS NULL;

-- 3b. content_hash / dedup_key / dedup_key_norm_version — ★콘솔 SQL로 채울 수 없음(보류).
--     이유(코드 확인, 워커 math_diagnosis_worker.js):
--       · qnorm.v1 정규화 함수가 아직 코드에 없음(매칭·bulk 미구현). itemAdd(323)는 15컬럼만 INSERT.
--       · SQLite/D1 콘솔에 SHA256 내장 없음 → 해시를 SQL로 계산 불가.
--     ⇒ 이 backfill 은 qnorm.v1 이 코드에 정의되는 시점(bulk/매칭 구현)에 동일 코드경로로 수행.
--        재사용 형태 = 워커 admin backfill 경로  WHERE content_hash IS NULL OR dedup_key_norm_version != '<현재>'
--        (검수가 말한 "M1·수연산 투입 후 재실행" 의 정본 위치 = 이 코드경로. 콘솔 스크립트 아님).
--     ⇒ 지금은 2행이 content_hash/dedup_key NULL 상태로 남음(UNIQUE 인덱스 NULL 허용이라 안전).
--        UNIQUE 위반 보고(검수 지시)도 이 코드경로에서 처리: 채우다 충돌 시 실패시키지 말고 목록 반환.
