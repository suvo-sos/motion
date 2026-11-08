import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { animationOwnedBy, ownerFromCtx } from "../server/ownership";

function normalizeSvgSize(svg: string): string {
  if (!svg) return svg;
  if (/\swidth\s*=\s*["']\d/.test(svg) && /\sheight\s*=\s*["']\d/.test(svg)) {
    return svg;
  }
  const vb = svg.match(
    /viewBox\s*=\s*["']\s*[-\d.eE+]+\s+[-\d.eE+]+\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i,
  );
  if (!vb) return svg;
  const w = Number(vb[1]);
  const h = Number(vb[2]);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
    return svg;
  }
  return svg.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
}

export default defineAction({
  description: "Get one SVG motion animation by id, including its SVG markup and tracks.",
  mcpTool: true,
  readOnly: true,
  schema: z.object({ id: z.string().describe("Animation id") }),
  // POST, not GET: the studio calls this via callAction(), which defaults to
  // POST. With GET declared, that call got a 405 and the studio showed
  // "This animation no longer exists" for animations the agent had just made.
  // Agent tool calls bypass HTTP, so this does not change how the agent reads.
  http: { method: "POST" },
  run: async ({ id }, ctx) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(animations)
      .where(animationOwnedBy(id, ownerFromCtx(ctx)))
      .limit(1);
    if (rows.length === 0) return { animation: null };
    const row = rows[0];
    if (!row) return { animation: null };
    const svg = normalizeSvgSize(row.svg ?? "");
    return {
      animation: {
        ...row,
        svg,
        tracks: JSON.parse(row.tracks || "[]"),
        // Rows written before the hover column existed have no value.
        hover: JSON.parse((row as { hover?: string }).hover || "{}"),
      },
    };
  },
});
