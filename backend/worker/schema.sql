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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);

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
