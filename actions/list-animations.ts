import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { desc, sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { ownedBy, ownerFromCtx } from "../server/ownership";

export default defineAction({
  description:
    "List saved SVG motion projects, newest first. Pass includeSvg: true to include the raw SVG and parsed tracks for thumbnails.",
  mcpTool: true,
  readOnly: true,
  schema: z.object({
    includeSvg: z
      .boolean()
      .default(false)
      .describe("Include raw svg markup and parsed tracks for thumbnails"),
  }),
  http: { method: "GET" },
  run: async ({ includeSvg }, ctx) => {
    const db = getDb();
    const rows = await db
      .select({
        id: animations.id,
        title: animations.title,
        svg: animations.svg,
        tracks: animations.tracks,
        duration: animations.duration,
        loop: animations.loop,
        pinned: animations.pinned,
        updatedAt: animations.updatedAt,
      })
      .from(animations)
      // Only this browser's projects. Without a session (scripts), keep the
      // unscoped listing.
      .where(ownedBy(ownerFromCtx(ctx)) ?? sql`TRUE`)
      .orderBy(desc(animations.pinned), desc(animations.updatedAt))
      .limit(60);

    return {
      animations: rows.map((row) =>
        includeSvg
          ? { ...row, tracks: JSON.parse(row.tracks || "[]") }
          : {
              id: row.id,
              title: row.title,
              duration: row.duration,
              loop: row.loop,
              pinned: row.pinned,
              updatedAt: row.updatedAt,
            },
      ),
    };
  },
});
