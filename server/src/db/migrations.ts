import type Database from "better-sqlite3";

/** Idempotent schema creation. Safe to run on every boot. */
export function runMigrations(db: Database.Database): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      transcript  TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'text',
      tldr        TEXT NOT NULL DEFAULT '',
      decisions   TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id            TEXT PRIMARY KEY,
      meeting_id    TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      owner         TEXT NOT NULL DEFAULT 'Unassigned',
      due_date      TEXT,
      follow_up     TEXT,
      source_quote  TEXT NOT NULL DEFAULT '',
      confidence    REAL NOT NULL DEFAULT 0.5,
      status        TEXT NOT NULL DEFAULT 'open',
      confirmed     INTEGER NOT NULL DEFAULT 0,
      duplicate_of  TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_items_meeting ON action_items(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_items_status  ON action_items(status);
    CREATE INDEX IF NOT EXISTS idx_items_owner   ON action_items(owner);
  `);
}
