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

const hoverSchema = z.object({
  effect: z
    .enum(["scale", "color", "rotate", "bounce", "glow", "lift"])
    .describe(
      "Hover effect: scale (grow), color (change fill), rotate (spin), bounce, glow, or lift (rise up)",
    ),
  durationMs: z
    .number()
    .int()
    .min(50)
    .max(2000)
    .optional()
    .describe("Duration of the hover transition (or one bounce cycle) in ms"),
  color: z
    .string()
    .optional()
    .describe("Hex colour for the color effect (target fill) or glow effect"),
  amount: z
    .number()
    .optional()
    .describe(
      "Strength: scale factor for scale, degrees for rotate, px for lift/bounce",
    ),
});

export default defineAction({
  description:
    "Create or update an SVG. What you make depends on what the user asked for. By default make a STATIC svg: pass tracks: [] and leave hover out — a still image, no motion. Only add tracks (animation) when the user asks for animation, motion, movement, or a moving/animated svg. Only add hover when the user asks for hover or interactive-on-hover behaviour: hover maps an SVG element id to one effect — scale (grow), color (change fill), rotate (spin), bounce, glow, or lift — with durationMs and, for scale/rotate/lift/bounce, an amount, and for color/glow a hex color. Provide the raw SVG markup, a title, a duration in ms, loop flag, and tracks (one per animated property per element). Each track targets an SVG element id and has keyframes with normalized time (0-1) and values.",
  mcpTool: true,
  schema: z.object({
    id: z.string().optional().describe("Existing animation id to update"),
    title: z.string().default("Untitled animation"),
    svg: z.string().describe("Raw SVG markup. Give animated elements stable ids."),
    tracks: z.array(trackSchema).default([]),
    hover: z
      .record(z.string(), hoverSchema)
      .optional()
      .describe(
        "Hover effects, keyed by SVG element id. Only when the user asks for hover/interactive behaviour. Omit it entirely when updating an animation whose hover effects should stay as they are.",
      ),
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
  run: async ({ id, title, svg, tracks, hover, duration, loop, expectedUpdatedAt }, ctx) => {
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
        // Upsert, not an error: the studio mirrors browser-only projects
        // into the server scratchpad by id, so a local project the agent
        // has never seen has no row yet. Creating it here is what lets
        // the agent load — and then edit — the project currently open.
        await db.insert(animations).values({
          id,
          title,
          svg,
          tracks: JSON.stringify(tracks),
          hover: JSON.stringify(hover ?? {}),
          duration,
          loop,
          ownerEmail: ctx?.userEmail ?? null,
          orgId: ctx?.orgId ?? null,
          createdAt: now,
          updatedAt: now,
        });
        return { id, updatedAt: now };
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
          // Omit hover when the caller did not pass it, so an edit that
          // only changes the artwork or tracks never wipes the hover
          // effects the user set in the studio.
          ...(hover !== undefined ? { hover: JSON.stringify(hover) } : {}),
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
      hover: JSON.stringify(hover ?? {}),
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
