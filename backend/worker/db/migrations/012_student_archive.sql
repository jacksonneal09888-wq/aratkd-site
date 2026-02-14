ALTER TABLE students
  ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

ALTER TABLE students
  ADD COLUMN archived_at TEXT;

ALTER TABLE students
  ADD COLUMN archived_reason TEXT;

ALTER TABLE students
  ADD COLUMN archived_by TEXT;

CREATE INDEX IF NOT EXISTS idx_students_archived
  ON students (is_archived, archived_at);
