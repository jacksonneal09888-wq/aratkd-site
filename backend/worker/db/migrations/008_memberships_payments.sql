ALTER TABLE students
  ADD COLUMN status TEXT DEFAULT 'active';

ALTER TABLE students
  ADD COLUMN parent_name TEXT;

ALTER TABLE students
  ADD COLUMN emergency_contact TEXT;

ALTER TABLE students
  ADD COLUMN address TEXT;

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  membership_type TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  billing_cycle TEXT,
  payment_method TEXT,
  status TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_student ON memberships(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS student_payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  status TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  membership_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_student_payments_student ON student_payments(student_id, created_at DESC);
