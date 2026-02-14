CREATE TABLE IF NOT EXISTS login_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_events_student ON login_events(student_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events(created_at);

CREATE TABLE IF NOT EXISTS belt_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  belt_slug TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(student_id, belt_slug)
);
CREATE INDEX IF NOT EXISTS idx_belt_progress_student ON belt_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_belt_progress_uploaded ON belt_progress(uploaded_at);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  phone TEXT,
  current_belt TEXT,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  suspended_reason TEXT,
  suspended_at TEXT,
  email TEXT,
  membership_type TEXT,
  status TEXT DEFAULT 'active',
  parent_name TEXT,
  emergency_contact TEXT,
  address TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  archived_reason TEXT,
  archived_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);
CREATE INDEX IF NOT EXISTS idx_students_archived ON students(is_archived, archived_at);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_type TEXT,
  class_level TEXT,
  kiosk_id TEXT,
  source TEXT,
  created_at TEXT NOT NULL,
  event_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_at
  ON attendance_sessions (student_id, created_at);

CREATE TABLE IF NOT EXISTS student_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  note_type TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_student_notes_student
  ON student_notes(student_id, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_memberships_student
  ON memberships(student_id, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_student_payments_student
  ON student_payments(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS special_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT,
  capacity INTEGER,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  event_type TEXT DEFAULT 'Special Class'
);

CREATE TABLE IF NOT EXISTS site_banners (
  id TEXT PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  alt_text TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_site_banners_order
  ON site_banners (is_active, sort_order, updated_at);
