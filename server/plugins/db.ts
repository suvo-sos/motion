import { runMigrations } from "@agent-native/core/db";

export default runMigrations(
  [
    {
      version: 1,
      name: "animations",
      sql: `CREATE TABLE IF NOT EXISTS animations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled animation',
        svg TEXT NOT NULL DEFAULT '',
        tracks TEXT NOT NULL DEFAULT '[]',
        duration INTEGER NOT NULL DEFAULT 2000,
        loop BOOLEAN NOT NULL DEFAULT TRUE,
        owner_email TEXT,
        org_id TEXT,
        created_at TEXT NOT NULL DEFAULT now(),
        updated_at TEXT NOT NULL DEFAULT now()
      )`,
    },
    {
      version: 2,
      name: "animations_pinned",
      sql: `ALTER TABLE animations ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE`,
    },
    {
      version: 3,
      name: "animations_hover",
      sql: `ALTER TABLE animations ADD COLUMN IF NOT EXISTS hover TEXT NOT NULL DEFAULT '{}'`,
    },
  ],
  { table: "_app_migrations" },
);
