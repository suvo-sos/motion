import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { animationOwnedBy, ownerFromCtx } from "../server/ownership";

export default defineAction({
  description: "Delete an SVG motion animation by id.",
  mcpTool: true,
  schema: z.object({ id: z.string().describe("Animation id") }),
  http: { method: "DELETE" },
  run: async ({ id }, ctx) => {
    const db = getDb();
    await db
      .delete(animations)
      .where(animationOwnedBy(id, ownerFromCtx(ctx)));
    return { ok: true };
  },
});
