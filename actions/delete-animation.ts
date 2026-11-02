import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";

export default defineAction({
  description: "Delete an SVG motion animation by id.",
  mcpTool: true,
  schema: z.object({ id: z.string().describe("Animation id") }),
  http: { method: "DELETE" },
  run: async ({ id }) => {
    const db = getDb();
    await db.delete(animations).where(eq(animations.id, id));
    return { ok: true };
  },
});
