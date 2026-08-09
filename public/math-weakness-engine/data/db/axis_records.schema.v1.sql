-- Axis accumulation store (B: Cloudflare D1). 사용자가 D1 콘솔에 1회 실행.
-- 레코드 1건 = 1행. observed_axes/attempts/scope_units는 JSON 텍스트 컬럼(축 미고정·재계산 대비).
CREATE TABLE IF NOT EXISTS axis_records (
  id               TEXT PRIMARY KEY,   -- 레코드 uuid (멱등 upsert)
  student_code     TEXT NOT NULL,
  date             TEXT NOT NULL,      -- 클라이언트 ISO 시각
  exam_label       TEXT,
  scope_units      TEXT,               -- JSON 배열
  observed_axes    TEXT,               -- JSON
  attempts         TEXT,               -- JSON (원본 태그 = 축 재계산 소스)
  axis_map_version TEXT,               -- 별도 컬럼 (버전별 질의)
  schema_version   INTEGER,
  created_at       TEXT                -- 서버 수신 시각(감사; insert 시에만 설정)
);
CREATE INDEX IF NOT EXISTS idx_student ON axis_records(student_code);
CREATE INDEX IF NOT EXISTS idx_date    ON axis_records(date);
CREATE INDEX IF NOT EXISTS idx_amv     ON axis_records(axis_map_version);
