-- Meetings published from the Microsoft List via Power Automate (see docs/CONTENT-PUBLISHING-DESIGN.md).
-- One row per list item; the latest approved version wins. Times are UTC ISO 8601.
CREATE TABLE meetings (
  item_id            INTEGER PRIMARY KEY,          -- SharePoint list item ID
  version            TEXT    NOT NULL,             -- SharePoint version, e.g. "7.0"
  body               TEXT    NOT NULL,             -- "Board of Directors" | "Executive Committee"
  start_utc          TEXT    NOT NULL,
  end_utc            TEXT    NOT NULL,
  first_start_utc    TEXT    NOT NULL,             -- start at first publish; shown as "Rescheduled from"
  status             TEXT    NOT NULL,             -- Scheduled | Rescheduled | Canceled
  notice_posted_utc  TEXT    NOT NULL,             -- first approval time; never changes
  location_name      TEXT,
  location_address   TEXT,
  online_url         TEXT,
  recording_url      TEXT,
  note_en            TEXT,
  note_es            TEXT,
  files_json         TEXT    NOT NULL DEFAULT '[]', -- [{ role, name, url }]
  approved_by        TEXT,
  approved_at        TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL
);
CREATE INDEX meetings_end ON meetings (end_utc);

-- Append-only audit trail of every publish request that passed validation.
CREATE TABLE publish_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  list         TEXT    NOT NULL,
  item_id      INTEGER NOT NULL,
  version      TEXT    NOT NULL,
  approved_by  TEXT,
  approved_at  TEXT,
  received_at  TEXT    NOT NULL,
  outcome      TEXT    NOT NULL,                   -- created | updated | unchanged
  record_json  TEXT    NOT NULL
);
CREATE INDEX publish_log_item ON publish_log (list, item_id);
