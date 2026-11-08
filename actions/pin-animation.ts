import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { animationOwnedBy, ownerFromCtx } from "../server/ownership";

export default defineAction({
  description: "Pin or unpin a saved animation project.",
  mcpTool: true,
  schema: z.object({
    id: z.string().describe("Animation id"),
    pinned: z.boolean().describe("Pin state"),
  }),
  http: { method: "POST" },
  run: async ({ id, pinned }, ctx) => {
    const db = getDb();
    const now = new Date().toISOString();
    await db
      .update(animations)
      .set({ pinned, updatedAt: now })
      .where(animationOwnedBy(id, ownerFromCtx(ctx)));
    return { id, pinned };
  },
});
