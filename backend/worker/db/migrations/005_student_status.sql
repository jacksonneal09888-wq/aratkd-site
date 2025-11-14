ALTER TABLE students
  ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0;

ALTER TABLE students
  ADD COLUMN suspended_reason TEXT;

ALTER TABLE students
  ADD COLUMN suspended_at TEXT;
