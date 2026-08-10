-- 사용자(교사) 등록 문항 (user_items). 기존 D1(scstudy-axis, 바인딩 AXIS_DB)에 테이블만 추가.
-- 정적 item_bank(3,364건)과 구분되는 신규 레이어. 브라우저(admin_items.html)에서 Worker
-- /api/user-items/* 로 즉시 쓴다(git 불요). 사용자가 D1 콘솔에서 1회 실행.
CREATE TABLE IF NOT EXISTS user_items (
  id               TEXT PRIMARY KEY,   -- uuid (멱등 upsert)
  created_at       TEXT NOT NULL,      -- 서버 수신 시각(ISO)
  updated_at       TEXT,
  status           TEXT,               -- approved(유형지정됨) | pending(유형미매칭·보류) | archived(soft-delete)
  unit_id          TEXT,
  unit_name        TEXT,
  problem_type_id  TEXT,               -- 기존 유형에서 지정(진단 매칭 키). 비면 pending
  type_name        TEXT,
  concept_ids      TEXT,               -- JSON 배열 (선택 유형에서 자동 상속)
  question_text    TEXT NOT NULL,      -- 문제 본문
  answer           TEXT,               -- 정답
  explanation      TEXT,               -- 해설
  difficulty       TEXT,               -- basic | core | advanced | high
  error_tags       TEXT,               -- JSON 배열 (선택)
  source_note      TEXT                -- 출처/메모(선택)
);
CREATE INDEX IF NOT EXISTS idx_ui_unit    ON user_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_ui_type    ON user_items(problem_type_id);
CREATE INDEX IF NOT EXISTS idx_ui_status  ON user_items(status);
CREATE INDEX IF NOT EXISTS idx_ui_created ON user_items(created_at);
