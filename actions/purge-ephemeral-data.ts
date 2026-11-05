import { defineAction } from "@agent-native/core/action";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../server/db";

/**
 * Hackathon retention: the hosted database is a scratchpad, not a store.
 *
 * Project libraries live in the browser. The only rows that reach Postgres are
 * the agent's temporary working copies plus chat/run telemetry. This action
 * removes anything older than the retention window so a demo deployment never
 * accumulates user data. Wire it to a Vercel cron (see vercel.json).
 */
export default defineAction({
  description:
    "Delete ephemeral chat, agent-run, audit, sync, and UI-state rows older than the retention window.",
  readOnly: false,
  schema: z.object({
    hours: z
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .default(24)
      .describe("Retention window in hours"),
  }),
  http: { method: "GET" },
  run: async ({ hours }) => {
    const db = getDb();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const isoCutoff = new Date(cutoff).toISOString();

    // A missing framework table should not stop the other tables from being
    // cleaned, so each delete is best-effort.
    const purge = async (statement: SQL) => {
      try {
        await db.execute(statement);
      } catch {
        // Table may not exist on a partial schema.
      }
    };

    await purge(sql`delete from agent_run_events where event_at < ${cutoff}`);
    await purge(sql`delete from agent_runs where started_at < ${cutoff}`);
    await purge(sql`delete from agent_audit_log where created_at < ${cutoff}`);
    await purge(sql`delete from chat_threads where updated_at < ${cutoff}`);
    await purge(sql`delete from sync_events where created_at < ${cutoff}`);
    await purge(sql`delete from application_state where updated_at < ${cutoff}`);
    // Deliberately never touch `animations`: if DB-backed projects are turned
    // back on, a cron must not delete a user's work.

    // Auth is disabled for the hackathon build, so no session rows are needed.
    if (process.env.AUTH_DISABLED?.trim().toLowerCase() === "true") {
      await purge(sql`delete from session`);
    }

    return {
      ok: true,
      retentionHours: hours,
      cutoff: isoCutoff,
    };
  },
});
