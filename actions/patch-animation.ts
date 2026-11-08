import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { animationOwnedBy, ownerFromCtx } from "../server/ownership";

// Small targeted edits to an animation, applied to the latest saved copy.
//
// Why this exists instead of get-animation + save-animation: a full save
// carries an expectedUpdatedAt guard, so it is rejected whenever the
// studio mirrored a newer copy in between — which is constantly, while
// the user is editing. The agent would retry for minutes and still lose.
// A patch is small and composable, so it can always apply to whatever
// the row holds right now: the agent and the user work side by side
// instead of one at a time. All operations in one call apply together
// or not at all; a failed operation reports which one and writes nothing.

const keyframeSchema = z.object({
  t: z.number().min(0).max(1).describe("Normalized time in the timeline, 0 to 1"),
  v: z.union([z.number(), z.string()]).describe("Value at this time"),
  ease: z.string().optional().describe("CSS easing for the segment starting at this keyframe"),
});

const trackPropertySchema = z.enum([
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
]);

// Same shape as save-animation's hover param; kept in sync by hand.
const hoverEffectSchema = z.object({
  effect: z.enum(["scale", "color", "rotate", "bounce", "glow", "lift"]),
  durationMs: z.number().int().min(50).max(2000).optional(),
  color: z.string().optional(),
  amount: z.number().optional(),
});

const operationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("set-attribute"),
    target: z.string().describe("SVG element id"),
    name: z.string().describe("Attribute name, e.g. rx, fill, opacity"),
    value: z.string().describe("New attribute value"),
  }),
  z.object({
    kind: z.literal("set-text"),
    target: z.string().describe("Text or tspan element id"),
    value: z.string().describe("New text content"),
  }),
  z.object({
    kind: z.literal("set-track"),
    target: z.string().describe("SVG element id"),
    property: trackPropertySchema,
    keyframes: z.array(keyframeSchema).min(1),
  }),
  z.object({
    kind: z.literal("remove-track"),
    target: z.string().describe("SVG element id"),
    property: trackPropertySchema,
  }),
  z.object({
    kind: z.literal("set-hover"),
    target: z.string().describe("SVG element id"),
    effect: hoverEffectSchema,
  }),
  z.object({
    kind: z.literal("remove-hover"),
    target: z.string().describe("SVG element id"),
  }),
]);

type Operation = z.infer<typeof operationSchema>;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Find the opening tag of the element with the given id. Returns the tag
// text, its byte range, and its tag name — or null when there is no such
// element. Matches inside <!-- comments --> are skipped, and a `>` inside
// an attribute value would confuse it; the studio's own SVGs never do that.
function findElementTag(
  svg: string,
  id: string,
): { start: number; end: number; tag: string; name: string } | null {
  const tagRe = /<([A-Za-z][A-Za-z0-9]*)[^>]*>/g;
  const idRe = new RegExp(`\\bid\\s*=\\s*["']${escapeRegExp(id)}["']`);
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(svg)) !== null) {
    const tag = m[0];
    if (!idRe.test(tag)) continue;
    // Skip a match that sits inside an XML comment.
    const before = svg.slice(0, m.index);
    const opens = (before.match(/<!--/g) ?? []).length;
    const closes = (before.match(/-->/g) ?? []).length;
    if (opens > closes) continue;
    return { start: m.index, end: m.index + tag.length, tag, name: m[1]! };
  }
  return null;
}

function setAttributeOnElement(
  svg: string,
  id: string,
  name: string,
  value: string,
): { svg: string; found: boolean } {
  if (!/^[A-Za-z][A-Za-z0-9:._-]*$/.test(name)) {
    throw new Error(`Invalid attribute name "${name}"`);
  }
  if (/["<>]/.test(value)) {
    throw new Error(`Attribute value for "${name}" must not contain ", < or >`);
  }
  const found = findElementTag(svg, id);
  if (!found) return { svg, found: false };
  const attrRe = new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*(?:"[^"]*"|'[^']*')`);
  const newTag = attrRe.test(found.tag)
    ? found.tag.replace(attrRe, `${name}="${value}"`)
    : found.tag.slice(0, found.tag.endsWith("/>") ? -2 : -1) +
      ` ${name}="${value}"` +
      (found.tag.endsWith("/>") ? "/>" : ">");
  return {
    svg: svg.slice(0, found.start) + newTag + svg.slice(found.end),
    found: true,
  };
}

function setTextOnElement(
  svg: string,
  id: string,
  value: string,
): { svg: string; found: boolean; reason?: string } {
  const found = findElementTag(svg, id);
  if (!found) return { svg, found: false };
  if (found.name !== "text" && found.name !== "tspan") {
    return {
      svg,
      found: false,
      reason: `Element "${id}" is a <${found.name}>, not text — set-text only works on <text> and <tspan>`,
    };
  }
  const escaped = escapeXmlText(value);
  // Self-closing text element: open it up and put the text inside.
  if (found.tag.endsWith("/>")) {
    const newTag =
      found.tag.slice(0, -2) + `>${escaped}</${found.name}>`;
    return {
      svg: svg.slice(0, found.start) + newTag + svg.slice(found.end),
      found: true,
    };
  }
  const closeRe = new RegExp(`</${escapeRegExp(found.name)}\\s*>`);
  const after = svg.slice(found.end);
  const close = closeRe.exec(after);
  if (!close || close.index === undefined) {
    return { svg, found: false, reason: `Element "${id}" has no closing tag` };
  }
  const inner = after.slice(0, close.index);
  if (inner.includes("<")) {
    return {
      svg,
      found: false,
      reason: `Element "${id}" contains child elements — set-text only works on plain text; use save-animation for structured text`,
    };
  }
  return {
    svg:
      svg.slice(0, found.end) +
      escaped +
      svg.slice(found.end + close.index),
    found: true,
  };
}

export default defineAction({
  description:
    "Apply small targeted edits to an animation: change one attribute, one piece of text, one track, or one hover effect. Applies to the latest saved copy and never goes stale, so it works while the user is editing in the studio — prefer this over get-animation + save-animation for small edits. Use save-animation only when creating a new animation or replacing the whole svg/tracks.",
  mcpTool: true,
  http: false,
  schema: z.object({
    id: z.string().describe("Animation id"),
    operations: z
      .array(operationSchema)
      .min(1)
      .max(20)
      .describe("Edits to apply together, or not at all"),
  }),
  run: async ({ id, operations }, ctx) => {
    const db = getDb();
    const owner = ownerFromCtx(ctx);
    const rows = await db
      .select()
      .from(animations)
      .where(animationOwnedBy(id, owner))
      .limit(1);
    if (rows.length === 0) {
      return { error: `Animation ${id} not found. Re-read with list-animations or get-animation for the right id.` };
    }
    const row = rows[0]!;
    let tracks: Array<Record<string, unknown>>;
    let hover: Record<string, unknown>;
    try {
      tracks = JSON.parse(row.tracks || "[]");
      hover = JSON.parse((row as { hover?: string }).hover || "{}");
    } catch {
      return { error: `Animation ${id} has unreadable saved data; use save-animation to rewrite it.` };
    }
    if (!Array.isArray(tracks)) tracks = [];
    if (!hover || typeof hover !== "object") hover = {};

    let svg = row.svg ?? "";
    try {
      for (const op of operations as Operation[]) {
        switch (op.kind) {
          case "set-attribute": {
            const res = setAttributeOnElement(svg, op.target, op.name, op.value);
            if (!res.found) {
              return { error: `No element with id "${op.target}" in animation ${id}; the set-attribute was not applied.` };
            }
            svg = res.svg;
            break;
          }
          case "set-text": {
            const res = setTextOnElement(svg, op.target, op.value);
            if (!res.found) {
              return { error: res.reason ?? `No element with id "${op.target}" in animation ${id}; the set-text was not applied.` };
            }
            svg = res.svg;
            break;
          }
          case "set-track": {
            const idx = tracks.findIndex(
              (t) => t.target === op.target && t.property === op.property,
            );
            const track = { target: op.target, property: op.property, keyframes: op.keyframes };
            if (idx >= 0) tracks[idx] = track;
            else tracks.push(track);
            break;
          }
          case "remove-track": {
            tracks = tracks.filter(
              (t) => !(t.target === op.target && t.property === op.property),
            );
            break;
          }
          case "set-hover": {
            hover[op.target] = op.effect;
            break;
          }
          case "remove-hover": {
            delete hover[op.target];
            break;
          }
        }
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Patch failed; nothing was saved." };
    }

    const now = new Date().toISOString();
    await db
      .update(animations)
      .set({
        svg,
        tracks: JSON.stringify(tracks),
        hover: JSON.stringify(hover),
        updatedAt: now,
      })
      .where(animationOwnedBy(id, owner));
    return { id, updatedAt: now, applied: operations.length };
  },
});
