import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";

const keyframeSchema = z.object({
  t: z.number().min(0).max(1).describe("Normalized time in the timeline, 0 to 1"),
  v: z.union([z.number(), z.string()]).describe("Value at this time"),
  ease: z
    .string()
    .optional()
    .describe("CSS easing for the segment starting at this keyframe, e.g. cubic-bezier(...)"),
});

const trackSchema = z.object({
  target: z.string().describe("SVG element id"),
  property: z
    .enum([
      "translateX",
      "translateY",
      "scale",
      "scaleX",
      "scaleY",
      "rotate",
      "skewX",
      "skewY",
      "originX",
      "originY",
      "opacity",
      "blur",
      "brightness",
      "saturate",
      "contrast",
      "grayscale",
      "hueRotate",
      "sepia",
      "fill",
      "stroke",
      "strokeWidth",
      "strokeDashoffset",
    ])
    .describe("Animatable property"),
  keyframes: z.array(keyframeSchema).min(1),
});

export default defineAction({
  description:
    "Create or update an SVG motion animation. Provide the raw SVG markup, a title, a duration in ms, loop flag, and tracks (one per animated property per element). Each track targets an SVG element id and has keyframes with normalized time (0-1) and values.",
  mcpTool: true,
  schema: z.object({
    id: z.string().optional().describe("Existing animation id to update"),
    title: z.string().default("Untitled animation"),
    svg: z.string().describe("Raw SVG markup. Give animated elements stable ids."),
    tracks: z.array(trackSchema).default([]),
    duration: z.number().int().min(100).max(60000).default(2000).describe("Duration in ms"),
    loop: z.boolean().default(true),
    expectedUpdatedAt: z
      .string()
      .optional()
      .describe(
        "updatedAt value from the last get-animation read. If provided and the row changed since, the save is rejected so manual edits are not overwritten.",
      ),
  }),
  http: { method: "POST" },
  run: async ({ id, title, svg, tracks, duration, loop, expectedUpdatedAt }, ctx) => {
    const db = getDb();
    const now = new Date().toISOString();

    // Remove script tags from SVG to prevent React rendering issues.
    // React refuses to render SVG with script tags for security reasons.
    let cleanSvg = svg;
    if (cleanSvg.includes('<script')) {
      cleanSvg = cleanSvg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      cleanSvg = cleanSvg.replace(/<script[^>]*>/gi, '');
      cleanSvg = cleanSvg.replace(/<\/script>/gi, '');
    }

    // Validate SVG has basic structure.
    if (!cleanSvg.includes('<svg')) {
      throw new Error('Invalid SVG: missing <svg> tag');
    }

    svg = cleanSvg;

    if (id) {
      const existing = await db
        .select({ id: animations.id, updatedAt: animations.updatedAt })
        .from(animations)
        .where(eq(animations.id, id))
        .limit(1);
      if (existing.length === 0) {
        return { error: `Animation ${id} not found` };
      }
      const currentUpdatedAt = existing[0]?.updatedAt ?? null;
      if (
        expectedUpdatedAt &&
        currentUpdatedAt &&
        expectedUpdatedAt !== currentUpdatedAt
      ) {
        return {
          error: `Animation ${id} changed since it was read (expected updatedAt ${expectedUpdatedAt}, current ${currentUpdatedAt}). Re-read with get-animation and retry; do not overwrite the user's manual edits.`,
          currentUpdatedAt,
        };
      }
      await db
        .update(animations)
        .set({
          title,
          svg,
          tracks: JSON.stringify(tracks),
          duration,
          loop,
          updatedAt: now,
        })
        .where(eq(animations.id, id));
      return { id, updatedAt: now };
    }

    const newId = randomUUID();
    await db.insert(animations).values({
      id: newId,
      title,
      svg,
      tracks: JSON.stringify(tracks),
      duration,
      loop,
      ownerEmail: ctx?.userEmail ?? null,
      orgId: ctx?.orgId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return { id: newId, updatedAt: now };
  },
});
