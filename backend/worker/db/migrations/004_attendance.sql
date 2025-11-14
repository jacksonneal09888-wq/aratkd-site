CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_type TEXT,
  class_level TEXT,
  kiosk_id TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_at
  ON attendance_sessions (student_id, created_at);
