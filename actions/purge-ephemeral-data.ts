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
 * accumulates user data. Nothing schedules it; call it manually when needed.
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
  http: { method: "POST" },
  run: async ({ hours }) => {
    const db = getDb();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const isoCutoff = new Date(cutoff).toISOString();

    // A missing framework table should not stop the other tables from being
    // cleaned, so a "table does not exist" failure is best-effort. Any other
    // failure is logged and rethrown after every table has been attempted,
    // instead of being swallowed.
    const purge = async (table: string, statement: SQL): Promise<number> => {
      try {
        const result = (await db.execute(statement)) as unknown as {
          rowCount?: number | null;
          rows?: unknown[];
        };
        return result.rowCount ?? result.rows?.length ?? 0;
      } catch (error) {
        if (error instanceof Error && /does not exist/i.test(error.message)) {
          console.warn(
            `[purge-ephemeral-data] table ${table} does not exist, skipped`,
          );
          return 0;
        }
        console.error(`[purge-ephemeral-data] failed to purge ${table}`, error);
        throw error;
      }
    };

    const deletes: Array<[string, SQL]> = [
      ["agent_run_events", sql`delete from agent_run_events where event_at < ${isoCutoff}`],
      ["agent_runs", sql`delete from agent_runs where started_at < ${isoCutoff}`],
      ["agent_audit_log", sql`delete from agent_audit_log where created_at < ${isoCutoff}`],
      ["chat_threads", sql`delete from chat_threads where updated_at < ${isoCutoff}`],
      ["sync_events", sql`delete from sync_events where created_at < ${isoCutoff}`],
      ["application_state", sql`delete from application_state where updated_at < ${isoCutoff}`],
    ];
    // Deliberately never touch `animations`: if DB-backed projects are turned
    // back on, cleanup must not delete a user's work.
    // Sessions are deliberately never touched either: auth is enabled, so
    // deleting session rows would sign every user out. (The old branch that
    // deleted all sessions when AUTH_DISABLED=true is removed.)

    const deleted: Record<string, number> = {};
    const failures: string[] = [];
    for (const [table, statement] of deletes) {
      try {
        deleted[table] = await purge(table, statement);
      } catch {
        failures.push(table);
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `purge-ephemeral-data failed for table(s): ${failures.join(", ")}`,
      );
    }

    return {
      ok: true,
      retentionHours: hours,
      cutoff: isoCutoff,
      deleted,
    };
  },
});
