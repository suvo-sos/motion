import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";

function parseCanvasSize(svg: string): { width: number; height: number; viewBox: string } | null {
  if (!svg) return null;
  const vbMatch = svg.match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i);
  let viewBox = "";
  let width = 0;
  let height = 0;
  if (vbMatch) {
    const [, minX, minY, w, h] = vbMatch;
    viewBox = `${minX} ${minY} ${w} ${h}`;
    width = Number(w);
    height = Number(h);
  }
  const wMatch = svg.match(/\swidth\s*=\s*["']\s*(\d+(?:\.\d+)?)/i);
  const hMatch = svg.match(/\sheight\s*=\s*["']\s*(\d+(?:\.\d+)?)/i);
  if (wMatch) width = Number(wMatch[1]);
  if (hMatch) height = Number(hMatch[1]);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return null;
  }
  if (!viewBox) viewBox = `0 0 ${width} ${height}`;
  return { width, height, viewBox };
}

export default defineAction({
  description:
    "Read the Chat app's current navigation state. Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");
    const url = await readAppState("__url__");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if (url) screen.url = url;

    // Surface the open animation id when the studio is open, so the agent
    // always targets the right row and re-reads it before editing.
    const searchParams = (url as any)?.searchParams ?? {};
    const id =
      (typeof searchParams?.id === "string" && searchParams.id) ||
      (typeof searchParams?.get === "function" ? searchParams.get("id") : null);
    if (id) screen.animationId = id;

    // Tell the agent the canvas size so artwork fills it instead of being drawn
    // at a tiny default scale. Read the row directly rather than round-tripping
    // through get-animation (which would add a second network hop).
    if (id) {
      try {
        const db = getDb();
        const rows = await db
          .select({ svg: animations.svg })
          .from(animations)
          .where(eq(animations.id, id))
          .limit(1);
        const canvas = rows[0]?.svg ? parseCanvasSize(rows[0].svg) : null;
        if (canvas) {
          screen.canvasSize = {
            ...canvas,
            recommendedArtworkSize: {
              width: Math.round(canvas.width * 0.8),
              height: Math.round(canvas.height * 0.8),
            },
          };
        }
      } catch {
        // Best-effort: canvas size is a hint, not a requirement.
      }
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
