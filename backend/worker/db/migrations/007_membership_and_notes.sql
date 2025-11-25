ALTER TABLE students
  ADD COLUMN membership_type TEXT;

CREATE TABLE IF NOT EXISTS student_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  note_type TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id, created_at DESC);
