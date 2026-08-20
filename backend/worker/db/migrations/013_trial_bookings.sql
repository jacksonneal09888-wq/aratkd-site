-- Trial / class booking requests submitted from the website
CREATE TABLE IF NOT EXISTS trial_bookings (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  phone        TEXT,
  email        TEXT,
  program      TEXT,
  preferred_day  TEXT,
  preferred_time TEXT,
  message      TEXT,
  status       TEXT    NOT NULL DEFAULT 'pending',
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trial_bookings_status ON trial_bookings (status);
CREATE INDEX IF NOT EXISTS idx_trial_bookings_created ON trial_bookings (created_at DESC);
