-- Calendar watcher: caches spreadsheet tab headers and the resolved current-month tab.

CREATE TABLE IF NOT EXISTS calendar_tab_cache (
  gid TEXT PRIMARY KEY,
  tab_name TEXT,
  header_year INTEGER,
  header_month INTEGER,
  checked_at TEXT
);

CREATE TABLE IF NOT EXISTS calendar_resolution (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  gid TEXT NOT NULL,
  label TEXT NOT NULL,
  resolved_at TEXT NOT NULL
);
