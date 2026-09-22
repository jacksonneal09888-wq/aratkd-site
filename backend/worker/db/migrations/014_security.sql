-- Migration 014: Security audit, IP blocks, and login attempt tracking
-- Enables persistent threat detection, audit trail, and admin review

CREATE TABLE IF NOT EXISTS security_events (
  id           TEXT    PRIMARY KEY,
  event_type   TEXT    NOT NULL,  -- brute_force_ip | brute_force_student | rate_limit | ip_blocked | honeypot_hit | suspicious_ua | auth_failure | enumeration | data_purge
  severity     TEXT    NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
  ip_address   TEXT,
  student_id   TEXT,
  endpoint     TEXT,
  user_agent   TEXT,
  details      TEXT,              -- JSON blob
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_events_ip      ON security_events (ip_address);
CREATE INDEX IF NOT EXISTS idx_sec_events_student  ON security_events (student_id);
CREATE INDEX IF NOT EXISTS idx_sec_events_type     ON security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON security_events (severity);
CREATE INDEX IF NOT EXISTS idx_sec_events_created  ON security_events (created_at DESC);

CREATE TABLE IF NOT EXISTS ip_blocks (
  ip_address   TEXT    PRIMARY KEY,
  reason       TEXT    NOT NULL,
  blocked_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT,              -- NULL = permanent
  created_by   TEXT    NOT NULL DEFAULT 'auto'  -- auto | admin
);

CREATE INDEX IF NOT EXISTS idx_ip_blocks_expires ON ip_blocks (expires_at);

-- Tracks per-student login failures (persisted so they survive isolate restarts)
CREATE TABLE IF NOT EXISTS login_failures (
  student_id   TEXT    PRIMARY KEY,
  fail_count   INTEGER NOT NULL DEFAULT 0,
  first_fail   TEXT    NOT NULL DEFAULT (datetime('now')),
  last_fail    TEXT    NOT NULL DEFAULT (datetime('now')),
  locked_until TEXT    -- NULL = not locked
);

CREATE INDEX IF NOT EXISTS idx_login_failures_locked ON login_failures (locked_until);
