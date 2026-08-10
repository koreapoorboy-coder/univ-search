-- 문항 등록 통로 (item_bank). 기존 D1(scstudy-axis, 바인딩 AXIS_DB)에 테이블만 추가.
-- 사용자가 D1 콘솔에서 1회 실행. axis_records와 같은 DB를 공유하므로 새 바인딩 불요.
-- 신규 문항은 브라우저(item_register.html)에서 Worker /api/item-bank/* 로 여기에 쓴다(git 불요).
CREATE TABLE IF NOT EXISTS item_bank (
  id               TEXT PRIMARY KEY,   -- uuid (멱등 upsert)
  created_at       TEXT NOT NULL,      -- 서버 수신 시각(ISO)
  updated_at       TEXT,
  status           TEXT,               -- approved | draft | archived (soft-delete)
  unit_id          TEXT,
  unit_name        TEXT,
  problem_type_id  TEXT,               -- 기존 유형에서 지정(진단 매칭 키)
  type_name        TEXT,
  concept_ids      TEXT,               -- JSON 배열 (선택 유형에서 자동 상속)
  question_text    TEXT NOT NULL,      -- 문제 본문
  answer           TEXT,               -- 정답
  explanation      TEXT,               -- 해설
  difficulty       TEXT,               -- basic | core | advanced | high
  error_tags       TEXT,               -- JSON 배열 (선택)
  source_note      TEXT                -- 출처/메모(선택)
);
CREATE INDEX IF NOT EXISTS idx_ib_unit    ON item_bank(unit_id);
CREATE INDEX IF NOT EXISTS idx_ib_type    ON item_bank(problem_type_id);
CREATE INDEX IF NOT EXISTS idx_ib_status  ON item_bank(status);
CREATE INDEX IF NOT EXISTS idx_ib_created ON item_bank(created_at);
