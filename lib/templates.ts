import type { Track } from "./motion";
import { IMPORTED_TEMPLATES } from "./imported-templates.generated";
import { USER_TEMPLATES } from "./user-templates.generated";

/**
 * Prebuilt starter projects.
 *
 * Each template is a complete animation — raw SVG plus keyframe tracks — so
 * picking one creates a real project instantly instead of waiting on the agent.
 * Rules that keep them valid in the studio and in the SVG export:
 *
 * - every `target` is an `id` present in `svg`, and ids are unique;
 * - keyframe times stay inside 0..1;
 * - the SVG's inline attributes describe the *final* pose, so project
 *   thumbnails look finished before anything plays;
 * - looping templates start and end on the same pose so the animation seam is
 *   invisible (one-shot templates set `loop: false`).
 *
 * The imported SVG exports (see
 * `scripts/import-svg-templates.mjs`) lead the grid: their keyframes were
 * translated into tracks so they edit like any other project, and the few
 * properties the engine cannot express (`d`, `rx`/`ry`, `r`, `width`/`height`)
 * stay in the SVG's own `<style>` block. Their art lives in `/public` so the
 * embedded base64 payload never enters the JS bundle.
 */
export interface MotionTemplate {
  /** Stable slug used for keys and selection state. */
  id: string;
  label: string;
  hint: string;
  /** Tabler icon name, resolved by the home screen. */
  icon: TemplateIconName;
  duration: number;
  loop: boolean;
  /** Inline SVG for small templates that ship with the bundle. */
  svg?: string;
  tracks?: Track[];
  /** Public URL for templates whose SVG is too large to inline. */
  src?: string;
  /** Artboard size in user units, so galleries can size previews to the art. */
  width?: number;
  height?: number;
}

export type TemplateIconName =
  | "sparkles"
  | "loader"
  | "bolt"
  | "spinner"
  | "bars"
  | "heart"
  | "orbit"
  | "ball";

const easeOut = "cubic-bezier(0.22, 1, 0.36, 1)";
const easeBack = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const easeIn = "cubic-bezier(0.55, 0, 1, 0.45)";
const easeInOut = "cubic-bezier(0.65, 0, 0.35, 1)";

export const MOTION_TEMPLATES: MotionTemplate[] = [
  /* ------------------------------------------------------------------ *
   * The studio's own projects, promoted to templates — see
   * lib/user-templates.generated.ts. They lead the gallery: these are the
   * animations the user actually made.
   * ------------------------------------------------------------------ */
  ...USER_TEMPLATES.map((template) => ({
    ...template,
    icon: template.icon as TemplateIconName,
  })),

  /* ------------------------------------------------------------------ *
   * Imported SVG exports — see lib/imported-templates.generated.ts.
   * Kept first so the richest previews open the gallery.
   * ------------------------------------------------------------------ */
  ...IMPORTED_TEMPLATES.map((template) => ({
    ...template,
    icon: template.icon as TemplateIconName,
  })),

  {
    id: "happy-birthday",
    label: "Happy birthday card",
    hint: "A popping title, floating balloons and a cake.",
    icon: "heart",
    duration: 3000,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <rect id="card" x="30" y="40" width="180" height="160" rx="20" fill="#FFF7ED" stroke="#FDBA74" stroke-width="3"/>
  <text id="hb-text" x="120" y="95" text-anchor="middle" font-size="22" font-weight="700" fill="#EA580C">Happy Birthday</text>
  <g id="balloon-1"><ellipse cx="70" cy="60" rx="16" ry="20" fill="#F43F5E"/><path d="M70 80 L70 110" stroke="#F43F5E" stroke-width="2"/></g>
  <g id="balloon-2"><ellipse cx="170" cy="55" rx="16" ry="20" fill="#3B82F6"/><path d="M170 75 L170 110" stroke="#3B82F6" stroke-width="2"/></g>
  <g id="cake"><rect x="90" y="150" width="60" height="30" rx="6" fill="#FCD34D"/><rect x="100" y="140" width="40" height="12" rx="4" fill="#F87171"/><rect x="118" y="132" width="4" height="10" fill="#FBBF24"/></g>
</svg>`,
    tracks: [
      { target: "hb-text", property: "scale", keyframes: [{ t: 0, v: 0.6, ease: easeBack }, { t: 0.25, v: 1.05, ease: easeOut }, { t: 0.4, v: 1 }, { t: 1, v: 1 }] },
      { target: "hb-text", property: "opacity", keyframes: [{ t: 0, v: 0, ease: easeOut }, { t: 0.2, v: 1 }, { t: 1, v: 1 }] },
      { target: "balloon-1", property: "translateY", keyframes: [{ t: 0, v: 0, ease: easeInOut }, { t: 0.5, v: -10, ease: easeInOut }, { t: 1, v: 0 }] },
      { target: "balloon-2", property: "translateY", keyframes: [{ t: 0, v: -6, ease: easeInOut }, { t: 0.5, v: 4, ease: easeInOut }, { t: 1, v: -6 }] },
      { target: "cake", property: "scale", keyframes: [{ t: 0, v: 0.85, ease: easeBack }, { t: 0.3, v: 1.02, ease: easeOut }, { t: 0.5, v: 1 }, { t: 1, v: 1 }] },
    ],
  },
  {
    id: "sale-starts-nov14",
    label: "Sale starts Nov 14",
    hint: "A bold sale badge counting down to launch day.",
    icon: "bolt",
    duration: 2600,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <circle id="orbit" cx="120" cy="120" r="86" stroke="#111827" stroke-width="2" stroke-dasharray="6 12" opacity="0.25"/>
  <g id="badge"><rect x="55" y="70" width="130" height="80" rx="22" fill="#EF4444"/><text x="120" y="118" text-anchor="middle" font-size="34" font-weight="800" fill="#FFFFFF">SALE</text></g>
  <text id="date" x="120" y="175" text-anchor="middle" font-size="16" font-weight="600" fill="#111827">Starts Nov 14</text>
  <circle id="dot-1" cx="60" cy="60" r="6" fill="#F59E0B"/>
  <circle id="dot-2" cx="180" cy="60" r="6" fill="#10B981"/>
  <circle id="dot-3" cx="60" cy="180" r="6" fill="#3B82F6"/>
</svg>`,
    tracks: [
      { target: "badge", property: "scale", keyframes: [{ t: 0, v: 1, ease: easeInOut }, { t: 0.5, v: 1.06, ease: easeInOut }, { t: 1, v: 1 }] },
      { target: "badge", property: "rotate", keyframes: [{ t: 0, v: -3, ease: easeInOut }, { t: 0.5, v: 3, ease: easeInOut }, { t: 1, v: -3 }] },
      { target: "orbit", property: "rotate", keyframes: [{ t: 0, v: 0, ease: "linear" }, { t: 1, v: 360 }] },
      { target: "date", property: "opacity", keyframes: [{ t: 0, v: 0.6, ease: easeInOut }, { t: 0.5, v: 1, ease: easeInOut }, { t: 1, v: 0.6 }] },
      { target: "dot-1", property: "translateY", keyframes: [{ t: 0, v: 0, ease: easeInOut }, { t: 0.5, v: -8, ease: easeInOut }, { t: 1, v: 0 }] },
      { target: "dot-2", property: "translateY", keyframes: [{ t: 0, v: -6, ease: easeInOut }, { t: 0.5, v: 4, ease: easeInOut }, { t: 1, v: -6 }] },
    ],
  },

  /* Hand-drawn loader: a rocket climbing past speed streaks. Replaces the
     imported jet export, whose silhouette read as a plane rather than a
     rocket. */
  /* Hand-drawn sale sticker: ink card, lime percent glyph, dashed orbit and
     drifting confetti. Replaces the imported photo-and-copy ad. */
  {
    id: "discount-promo",
    label: "Discount promo",
    hint: "Ink sticker with a lime percent mark, orbiting dots and confetti.",
    icon: "bolt",
    duration: 3200,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <circle id="orbit-ring" cx="120" cy="120" r="76" stroke="#111827" stroke-width="2" stroke-dasharray="4 10" stroke-linecap="round" opacity="0.3"/>
  <g id="confetti-1"><rect x="44" y="54" width="10" height="10" rx="3" fill="#D9F99D"/></g>
  <g id="confetti-2"><circle cx="190" cy="74" r="5" fill="#F43F5E"/></g>
  <g id="confetti-3"><circle cx="50" cy="182" r="5" fill="#0EA5E9"/></g>
  <g id="confetti-4"><rect x="184" y="172" width="10" height="10" rx="3" fill="#F59E0B"/></g>
  <g id="badge">
    <rect x="60" y="60" width="120" height="120" rx="30" fill="#111827"/>
    <rect x="72" y="72" width="96" height="96" rx="22" stroke="#D9F99D" stroke-width="3" opacity="0.85"/>
    <circle cx="108" cy="108" r="8" stroke="#D9F99D" stroke-width="6"/>
    <circle cx="132" cy="132" r="8" stroke="#D9F99D" stroke-width="6"/>
    <path d="M142 98 98 142" stroke="#D9F99D" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`,
    tracks: [
      {
        target: "badge",
        property: "rotate",
        keyframes: [
          { t: 0, v: -5, ease: easeInOut },
          { t: 0.5, v: 5, ease: easeInOut },
          { t: 1, v: -5 },
        ],
      },
      {
        target: "badge",
        property: "scale",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.5, v: 1.035, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "orbit-ring",
        property: "rotate",
        keyframes: [
          { t: 0, v: 0, ease: "linear" },
          { t: 1, v: 360 },
        ],
      },
      ...([
        { id: "confetti-1", dx: 10, dy: -14, from: 0, peak: 0.3, out: 0.62 },
        { id: "confetti-2", dx: 14, dy: 10, from: 0.14, peak: 0.44, out: 0.76 },
        { id: "confetti-3", dx: -12, dy: 12, from: 0.07, peak: 0.37, out: 0.69 },
        { id: "confetti-4", dx: -10, dy: -12, from: 0.2, peak: 0.5, out: 0.82 },
      ] as const).flatMap(({ id, dx, dy, from, peak, out }): Track[] => [
        {
          target: id,
          property: "translateX",
          keyframes: [
            { t: 0, v: 0, ease: easeOut },
            { t: out, v: dx, ease: "linear" },
            { t: 1, v: dx },
          ],
        },
        {
          target: id,
          property: "translateY",
          keyframes: [
            { t: 0, v: 0, ease: easeOut },
            { t: out, v: dy, ease: "linear" },
            { t: 1, v: dy },
          ],
        },
        {
          target: id,
          property: "opacity",
          keyframes: [
            { t: 0, v: 0 },
            { t: from, v: 0, ease: easeOut },
            { t: peak, v: 0.9, ease: easeInOut },
            { t: out, v: 0, ease: "linear" },
            { t: 1, v: 0 },
          ],
        },
      ]),
    ],
  },
  {
    id: "rocket-loader",
    label: "Rocket loader",
    hint: "Rocket climbing past speed streaks.",
    icon: "bolt",
    duration: 2000,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <defs>
    <linearGradient id="rl-body" x1="120" y1="100" x2="120" y2="176" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="0.6" stop-color="#E7ECF5"/>
      <stop offset="1" stop-color="#C3CFE0"/>
    </linearGradient>
    <linearGradient id="rl-flame" x1="120" y1="180" x2="120" y2="222" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FBBF24"/>
      <stop offset="0.55" stop-color="#F97316"/>
      <stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g stroke="#94A3B8" stroke-width="4" stroke-linecap="round" opacity="0.75">
    <line id="streak-1" x1="66" y1="74" x2="66" y2="106"/>
    <line id="streak-2" x1="176" y1="58" x2="176" y2="84"/>
    <line id="streak-3" x1="62" y1="140" x2="62" y2="164"/>
    <line id="streak-4" x1="172" y1="132" x2="172" y2="158"/>
  </g>
  <g id="rocket">
    <path id="rocket-flame" d="M120 184c11 13 15 23 0 36-15-13-11-23 0-36Z" fill="url(#rl-flame)"/>
    <path id="rocket-flame-core" d="M120 189c6 8 8 14 0 21-8-7-6-13 0-21Z" fill="#FDE68A"/>
    <path id="rocket-fin-left" d="M96 118 72 170l24-9z" fill="#6366F1"/>
    <path id="rocket-fin-right" d="M144 118l24 52-24-9z" fill="#6366F1"/>
    <path id="rocket-nozzle" d="M104 168h32v12a8 8 0 0 1-8 8h-16a8 8 0 0 1-8-8z" fill="#334155"/>
    <path id="rocket-body" d="M120 36c15 16 24 42 24 74v44c0 12-11 20-24 20s-24-8-24-20v-44c0-32 9-58 24-74Z" fill="url(#rl-body)"/>
    <path id="rocket-nose" d="M120 36c15 16 24 40 24 66h-48c0-26 9-50 24-66Z" fill="#6366F1"/>
    <path id="rocket-sheen" d="M108 102c0-18 4-32 9-44" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>
    <circle id="rocket-window-ring" cx="120" cy="130" r="15" fill="#FFFFFF"/>
    <circle id="rocket-window" cx="120" cy="130" r="11" fill="#1E293B"/>
    <path id="rocket-window-glint" d="M114 125a8 8 0 0 1 8-3" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`,
    tracks: [
      {
        target: "rocket",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0, ease: easeInOut },
          { t: 0.5, v: -9, ease: easeInOut },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "rocket",
        property: "rotate",
        keyframes: [
          { t: 0, v: 0, ease: easeInOut },
          { t: 0.25, v: 1.2, ease: easeInOut },
          { t: 0.75, v: -1.2, ease: easeInOut },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "rocket-flame",
        property: "originY",
        keyframes: [{ t: 0, v: 0 }],
      },
      {
        target: "rocket-flame",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.22, v: 1.3, ease: easeInOut },
          { t: 0.42, v: 0.88, ease: easeInOut },
          { t: 0.64, v: 1.18, ease: easeInOut },
          { t: 0.84, v: 0.94, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "rocket-flame",
        property: "opacity",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.5, v: 0.85, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "rocket-flame-core",
        property: "originY",
        keyframes: [{ t: 0, v: 0 }],
      },
      {
        target: "rocket-flame-core",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.18, v: 0.82, ease: easeInOut },
          { t: 0.46, v: 1.22, ease: easeInOut },
          { t: 0.7, v: 0.9, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      ...["streak-1", "streak-2", "streak-3", "streak-4"].map(
        (target, index): Track => ({
          target,
          property: "translateY",
          keyframes: [
            { t: 0, v: -240 - index * 20, ease: "linear" },
            { t: 1, v: 200 + index * 20 },
          ],
        }),
      ),
    ],
  },

  {
    id: "countdown-loader",
    label: "Countdown",
    hint: "Five-second ring counting 5 to 1, one colour per digit.",
    icon: "spinner",
    duration: 5000,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <circle id="countdown-track" cx="120" cy="120" r="92" stroke="#E2E8F0" stroke-width="6" opacity="0.7"/>
  <circle id="countdown-ring" cx="120" cy="120" r="92" stroke="#F43F5E" stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 120 120)"/>
  <g font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="700" text-anchor="middle" dominant-baseline="central">
    <text id="count-5" x="120" y="120" fill="#F43F5E" opacity="0">5</text>
    <text id="count-4" x="120" y="120" fill="#F59E0B" opacity="0">4</text>
    <text id="count-3" x="120" y="120" fill="#22C55E" opacity="0">3</text>
    <text id="count-2" x="120" y="120" fill="#0EA5E9" opacity="0">2</text>
    <text id="count-1" x="120" y="120" fill="#8B5CF6" opacity="0">1</text>
  </g>
</svg>`,
    tracks: [
      {
        target: "countdown-ring",
        property: "strokeDashoffset",
        keyframes: [
          { t: 0, v: 1, ease: "linear" },
          { t: 1, v: 0 },
        ],
      },
      /* Ring colour snaps at each one-second boundary so it always matches
         the digit on screen. */
      {
        target: "countdown-ring",
        property: "stroke",
        keyframes: [
          { t: 0, v: "#F43F5E", ease: "linear" },
          { t: 0.199, v: "#F43F5E", ease: "linear" },
          { t: 0.2, v: "#F59E0B", ease: "linear" },
          { t: 0.399, v: "#F59E0B", ease: "linear" },
          { t: 0.4, v: "#22C55E", ease: "linear" },
          { t: 0.599, v: "#22C55E", ease: "linear" },
          { t: 0.6, v: "#0EA5E9", ease: "linear" },
          { t: 0.799, v: "#0EA5E9", ease: "linear" },
          { t: 0.8, v: "#8B5CF6", ease: "linear" },
          { t: 1, v: "#8B5CF6" },
        ],
      },
      /* 5 — shows 0.0–0.2s */
      {
        target: "count-5",
        property: "opacity",
        keyframes: [
          { t: 0, v: 1, ease: "linear" },
          { t: 0.17, v: 1, ease: "linear" },
          { t: 0.2, v: 0, ease: "linear" },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "count-5",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.8, ease: easeBack },
          { t: 0.045, v: 1.08, ease: easeInOut },
          { t: 0.09, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      /* 4 — shows 0.2–0.4s */
      {
        target: "count-4",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.2, v: 0, ease: "linear" },
          { t: 0.225, v: 1, ease: "linear" },
          { t: 0.375, v: 1, ease: "linear" },
          { t: 0.4, v: 0, ease: "linear" },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "count-4",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.8 },
          { t: 0.2, v: 0.8, ease: easeBack },
          { t: 0.245, v: 1.08, ease: easeInOut },
          { t: 0.29, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      /* 3 — shows 0.4–0.6s */
      {
        target: "count-3",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.4, v: 0, ease: "linear" },
          { t: 0.425, v: 1, ease: "linear" },
          { t: 0.575, v: 1, ease: "linear" },
          { t: 0.6, v: 0, ease: "linear" },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "count-3",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.8 },
          { t: 0.4, v: 0.8, ease: easeBack },
          { t: 0.445, v: 1.08, ease: easeInOut },
          { t: 0.49, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      /* 2 — shows 0.6–0.8s */
      {
        target: "count-2",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.6, v: 0, ease: "linear" },
          { t: 0.625, v: 1, ease: "linear" },
          { t: 0.775, v: 1, ease: "linear" },
          { t: 0.8, v: 0, ease: "linear" },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "count-2",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.8 },
          { t: 0.6, v: 0.8, ease: easeBack },
          { t: 0.645, v: 1.08, ease: easeInOut },
          { t: 0.69, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      /* 1 — shows 0.8–1.0s */
      {
        target: "count-1",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.8, v: 0, ease: "linear" },
          { t: 0.825, v: 1, ease: "linear" },
          { t: 0.97, v: 1, ease: "linear" },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "count-1",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.8 },
          { t: 0.8, v: 0.8, ease: easeBack },
          { t: 0.845, v: 1.08, ease: easeInOut },
          { t: 0.89, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
    ],
  },
  {
    id: "app-download-promo",
    label: "App download promo",
    hint: "Phone mockup with a pulsing download badge and CTA.",
    icon: "ball",
    duration: 3000,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" width="240" height="300" fill="none">
  <ellipse id="phone-shadow" cx="120" cy="252" rx="50" ry="7" fill="#0F172A" opacity="0.12"/>
  <g id="phone">
    <rect x="66" y="30" width="108" height="204" rx="20" fill="#0F172A"/>
    <rect x="72" y="36" width="96" height="192" rx="14" fill="#F8FAFC"/>
    <rect x="106" y="41" width="28" height="5" rx="2.5" fill="#CBD5E1"/>
    <circle id="pulse-ring" cx="120" cy="90" r="30" stroke="#6366F1" stroke-width="2" opacity="0"/>
    <rect id="app-icon" x="96" y="66" width="48" height="48" rx="13" fill="#6366F1"/>
    <path id="icon-glyph" d="M120 78v16m0 0-6-6m6 6 6-6M110 100h20" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect id="line-1" x="84" y="130" width="72" height="8" rx="4" fill="#E2E8F0"/>
    <rect id="line-2" x="84" y="144" width="50" height="8" rx="4" fill="#E2E8F0"/>
    <rect id="cta" x="84" y="166" width="72" height="26" rx="13" fill="#6366F1"/>
    <text id="cta-label" x="120" y="179" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">Get app</text>
    <rect x="102" y="212" width="36" height="4" rx="2" fill="#CBD5E1"/>
  </g>
</svg>`,
    tracks: [
      {
        target: "phone",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0, ease: easeInOut },
          { t: 0.5, v: -5, ease: easeInOut },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "phone-shadow",
        property: "scaleX",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.5, v: 0.9, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      /* Badge pulse: two beats per loop, ring expanding out of the icon. */
      {
        target: "app-icon",
        property: "scale",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.12, v: 1.07, ease: easeInOut },
          { t: 0.26, v: 1, ease: easeInOut },
          { t: 0.5, v: 1, ease: easeInOut },
          { t: 0.62, v: 1.07, ease: easeInOut },
          { t: 0.76, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "icon-glyph",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0, ease: easeInOut },
          { t: 0.12, v: 3, ease: easeInOut },
          { t: 0.26, v: 0, ease: easeInOut },
          { t: 0.62, v: 3, ease: easeInOut },
          { t: 0.76, v: 0 },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "pulse-ring",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.7, ease: easeOut },
          { t: 0.26, v: 1.6 },
          { t: 0.3, v: 0.7 },
          { t: 0.5, v: 0.7, ease: easeOut },
          { t: 0.76, v: 1.6 },
          { t: 0.8, v: 0.7 },
          { t: 1, v: 0.7 },
        ],
      },
      {
        target: "pulse-ring",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.08, v: 0.45 },
          { t: 0.26, v: 0 },
          { t: 0.5, v: 0 },
          { t: 0.58, v: 0.45 },
          { t: 0.76, v: 0 },
          { t: 1, v: 0 },
        ],
      },
      /* Copy lines breathe in sequence, so the card never looks static. */
      {
        target: "line-1",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0.45, ease: easeInOut },
          { t: 0.3, v: 1, ease: easeInOut },
          { t: 0.7, v: 1, ease: easeInOut },
          { t: 1, v: 0.45 },
        ],
      },
      {
        target: "line-2",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0.45, ease: easeInOut },
          { t: 0.42, v: 1, ease: easeInOut },
          { t: 0.8, v: 1, ease: easeInOut },
          { t: 1, v: 0.45 },
        ],
      },
      {
        target: "cta",
        property: "scale",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.5, v: 1, ease: easeBack },
          { t: 0.6, v: 1.05, ease: easeInOut },
          { t: 0.72, v: 1 },
          { t: 1, v: 1 },
        ],
      },
    ],
  },
  {
    id: "logo-reveal",
    label: "Logo reveal",
    hint: "Stroke draws on, then the mark pops in.",
    icon: "sparkles",
    duration: 1800,
    loop: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <path id="logo-outline" d="M120 26 178 58v52l-58 32-58-32V58z" stroke="#0F172A" stroke-width="5" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/>
  <path id="logo-glyph" d="M120 66 154 86 120 106 86 86z" fill="#6366F1"/>
</svg>`,
    tracks: [
      {
        target: "logo-outline",
        property: "strokeDashoffset",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.5, v: 0, ease: easeInOut },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "logo-glyph",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.45, v: 0 },
          { t: 0.62, v: 1, ease: easeOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "logo-glyph",
        property: "scale",
        keyframes: [
          { t: 0, v: 0.7 },
          { t: 0.45, v: 0.7 },
          { t: 0.7, v: 1.06, ease: easeBack },
          { t: 0.85, v: 1, ease: easeOut },
          { t: 1, v: 1 },
        ],
      },
    ],
  },

  {
    id: "loading-dots",
    label: "Loading dots",
    hint: "Three dots bounce out of phase.",
    icon: "loader",
    duration: 1200,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <circle id="dot-1" cx="96" cy="84" r="11" fill="#6366F1"/>
  <circle id="dot-2" cx="120" cy="84" r="11" fill="#818CF8"/>
  <circle id="dot-3" cx="144" cy="84" r="11" fill="#A5B4FC"/>
</svg>`,
    tracks: [
      {
        target: "dot-1",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0, ease: easeOut },
          { t: 0.22, v: -18, ease: easeIn },
          { t: 0.44, v: 0 },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "dot-2",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.12, v: 0, ease: easeOut },
          { t: 0.34, v: -18, ease: easeIn },
          { t: 0.56, v: 0 },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "dot-3",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.24, v: 0, ease: easeOut },
          { t: 0.46, v: -18, ease: easeIn },
          { t: 0.68, v: 0 },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "dot-1",
        property: "opacity",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.22, v: 0.65 },
          { t: 0.44, v: 1 },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "dot-3",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0.5 },
          { t: 0.46, v: 0.8 },
          { t: 0.68, v: 0.5 },
          { t: 1, v: 0.5 },
        ],
      },
    ],
  },

  {
    id: "sticker-pop",
    label: "Sticker pop",
    hint: "Star springs in with a wobble.",
    icon: "bolt",
    duration: 1600,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <path id="sticker-star" d="M120 36 130.6 65.4 161.9 66.4 137.1 85.6 145.9 115.6 120 98 94.1 115.6 102.9 85.6 78.1 66.4 109.4 65.4z" fill="#F59E0B" stroke="#B45309" stroke-width="4" stroke-linejoin="round"/>
</svg>`,
    tracks: [
      {
        target: "sticker-star",
        property: "scale",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.16, v: 1.12, ease: easeBack },
          { t: 0.3, v: 0.97, ease: easeInOut },
          { t: 0.42, v: 1 },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "sticker-star",
        property: "rotate",
        keyframes: [
          { t: 0, v: 0 },
          { t: 0.16, v: 7, ease: easeBack },
          { t: 0.3, v: -3, ease: easeInOut },
          { t: 0.44, v: 0 },
          { t: 1, v: 0 },
        ],
      },
    ],
  },

  {
    id: "spinner",
    label: "Spinner",
    hint: "Arc sweeps around a ring forever.",
    icon: "spinner",
    duration: 1000,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <circle cx="120" cy="80" r="40" stroke="#E2E8F0" stroke-width="10"/>
  <g id="spinner-arc">
    <circle cx="120" cy="80" r="40" stroke="#6366F1" stroke-width="10" stroke-linecap="round" stroke-dasharray="63 252"/>
  </g>
</svg>`,
    tracks: [
      {
        target: "spinner-arc",
        property: "rotate",
        keyframes: [
          { t: 0, v: 0 },
          { t: 1, v: 360 },
        ],
      },
    ],
  },

  {
    id: "equalizer",
    label: "Equalizer",
    hint: "Five bars rise and fall, out of phase.",
    icon: "bars",
    duration: 1200,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <g fill="#6366F1">
    <rect id="bar-1" x="60" y="76" width="18" height="48" rx="6"/>
    <rect id="bar-2" x="90" y="52" width="18" height="72" rx="6" fill="#818CF8"/>
    <rect id="bar-3" x="120" y="28" width="18" height="96" rx="6" fill="#A5B4FC"/>
    <rect id="bar-4" x="150" y="52" width="18" height="72" rx="6" fill="#818CF8"/>
    <rect id="bar-5" x="180" y="76" width="18" height="48" rx="6"/>
  </g>
</svg>`,
    tracks: [
      ...["bar-1", "bar-2", "bar-3", "bar-4", "bar-5"].map(
        (target): Track => ({
          target,
          property: "originY",
          keyframes: [{ t: 0, v: 100 }],
        }),
      ),
      {
        target: "bar-1",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 0.55, ease: easeInOut },
          { t: 0.25, v: 1, ease: easeInOut },
          { t: 0.5, v: 0.7, ease: easeInOut },
          { t: 0.75, v: 0.9, ease: easeInOut },
          { t: 1, v: 0.55 },
        ],
      },
      {
        target: "bar-2",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 0.8, ease: easeInOut },
          { t: 0.25, v: 0.45, ease: easeInOut },
          { t: 0.5, v: 1, ease: easeInOut },
          { t: 0.75, v: 0.6, ease: easeInOut },
          { t: 1, v: 0.8 },
        ],
      },
      {
        target: "bar-3",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.25, v: 0.6, ease: easeInOut },
          { t: 0.5, v: 0.85, ease: easeInOut },
          { t: 0.75, v: 0.45, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "bar-4",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 0.8, ease: easeInOut },
          { t: 0.25, v: 1, ease: easeInOut },
          { t: 0.5, v: 0.45, ease: easeInOut },
          { t: 0.75, v: 0.85, ease: easeInOut },
          { t: 1, v: 0.8 },
        ],
      },
      {
        target: "bar-5",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 0.55, ease: easeInOut },
          { t: 0.25, v: 0.85, ease: easeInOut },
          { t: 0.5, v: 0.6, ease: easeInOut },
          { t: 0.75, v: 1, ease: easeInOut },
          { t: 1, v: 0.55 },
        ],
      },
    ],
  },

  {
    id: "heartbeat",
    label: "Heartbeat",
    hint: "Double-thump pulse on a heart.",
    icon: "heart",
    duration: 1600,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <path id="heart-body" d="M120 126C88 106 66 88 66 68c0-16 12-27 25-27 10 0 19 6 29 18 10-12 19-18 29-18 13 0 25 11 25 27 0 20-22 38-54 58z" fill="#EF4444"/>
</svg>`,
    tracks: [
      {
        target: "heart-body",
        property: "scale",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.1, v: 1.12, ease: easeOut },
          { t: 0.2, v: 1, ease: easeInOut },
          { t: 0.28, v: 1.07, ease: easeOut },
          { t: 0.4, v: 1, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "heart-body",
        property: "brightness",
        keyframes: [
          { t: 0, v: 100 },
          { t: 0.1, v: 122 },
          { t: 0.4, v: 100 },
          { t: 1, v: 100 },
        ],
      },
    ],
  },

  {
    id: "orbit",
    label: "Orbit",
    hint: "A satellite circles a planet.",
    icon: "orbit",
    duration: 2400,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <g id="orbit-system">
    <circle cx="120" cy="80" r="62" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="4 8"/>
    <circle cx="120" cy="18" r="11" fill="#22D3EE"/>
    <circle cx="120" cy="142" r="11" fill="none"/>
  </g>
  <circle id="orbit-core" cx="120" cy="80" r="26" fill="#6366F1"/>
</svg>`,
    tracks: [
      {
        target: "orbit-system",
        property: "rotate",
        keyframes: [
          { t: 0, v: 0 },
          { t: 1, v: 360 },
        ],
      },
      {
        target: "orbit-core",
        property: "scale",
        keyframes: [
          { t: 0, v: 1, ease: easeInOut },
          { t: 0.5, v: 1.08, ease: easeInOut },
          { t: 1, v: 1 },
        ],
      },
    ],
  },

  {
    id: "bounce",
    label: "Bounce",
    hint: "Ball drops with squash and stretch.",
    icon: "ball",
    duration: 1400,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" fill="none">
  <ellipse id="bounce-shadow" cx="120" cy="134" rx="34" ry="7" fill="#0F172A" opacity="0.12"/>
  <circle id="bounce-ball" cx="120" cy="48" r="22" fill="#F59E0B"/>
</svg>`,
    tracks: [
      {
        target: "bounce-ball",
        property: "originY",
        keyframes: [{ t: 0, v: 100 }],
      },
      {
        target: "bounce-ball",
        property: "translateY",
        keyframes: [
          { t: 0, v: 0, ease: easeIn },
          { t: 0.48, v: 62, ease: easeOut },
          { t: 1, v: 0 },
        ],
      },
      {
        target: "bounce-ball",
        property: "scaleY",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.4, v: 1.04, ease: easeIn },
          { t: 0.48, v: 0.78, ease: easeOut },
          { t: 0.58, v: 1.02, ease: easeInOut },
          { t: 0.7, v: 1 },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "bounce-ball",
        property: "scaleX",
        keyframes: [
          { t: 0, v: 1 },
          { t: 0.4, v: 0.97, ease: easeIn },
          { t: 0.48, v: 1.2, ease: easeOut },
          { t: 0.58, v: 0.99, ease: easeInOut },
          { t: 0.7, v: 1 },
          { t: 1, v: 1 },
        ],
      },
      {
        target: "bounce-shadow",
        property: "scaleX",
        keyframes: [
          { t: 0, v: 0.78, ease: easeIn },
          { t: 0.48, v: 1, ease: easeOut },
          { t: 1, v: 0.78 },
        ],
      },
      {
        target: "bounce-shadow",
        property: "opacity",
        keyframes: [
          { t: 0, v: 0.12, ease: easeIn },
          { t: 0.48, v: 0.22, ease: easeOut },
          { t: 1, v: 0.12 },
        ],
      },
    ],
  },
  {
    id: "wave-loader",
    label: "Wave loader",
    hint: "Five bars rising and falling in a smooth wave.",
    icon: "bars",
    duration: 1800,
    loop: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <rect id="wave-1" x="32" y="90" width="24" height="60" rx="12" fill="#3B82F6"/>
  <rect id="wave-2" x="64" y="90" width="24" height="60" rx="12" fill="#06B6D4"/>
  <rect id="wave-3" x="96" y="90" width="24" height="60" rx="12" fill="#10B981"/>
  <rect id="wave-4" x="128" y="90" width="24" height="60" rx="12" fill="#F59E0B"/>
  <rect id="wave-5" x="160" y="90" width="24" height="60" rx="12" fill="#EF4444"/>
</svg>`,
    tracks: [
      { target: "wave-1", property: "translateY", keyframes: [{ t: 0, v: 0, ease: easeInOut }, { t: 0.25, v: -22, ease: easeInOut }, { t: 0.5, v: 0, ease: easeInOut }, { t: 0.75, v: 22, ease: easeInOut }, { t: 1, v: 0 }] },
      { target: "wave-2", property: "translateY", keyframes: [{ t: 0, v: -18, ease: easeInOut }, { t: 0.25, v: 0, ease: easeInOut }, { t: 0.5, v: 22, ease: easeInOut }, { t: 0.75, v: 0, ease: easeInOut }, { t: 1, v: -18 }] },
      { target: "wave-3", property: "translateY", keyframes: [{ t: 0, v: 0, ease: easeInOut }, { t: 0.25, v: 22, ease: easeInOut }, { t: 0.5, v: 0, ease: easeInOut }, { t: 0.75, v: -22, ease: easeInOut }, { t: 1, v: 0 }] },
      { target: "wave-4", property: "translateY", keyframes: [{ t: 0, v: 18, ease: easeInOut }, { t: 0.25, v: 0, ease: easeInOut }, { t: 0.5, v: -22, ease: easeInOut }, { t: 0.75, v: 0, ease: easeInOut }, { t: 1, v: 18 }] },
      { target: "wave-5", property: "translateY", keyframes: [{ t: 0, v: 0, ease: easeInOut }, { t: 0.25, v: -22, ease: easeInOut }, { t: 0.5, v: 0, ease: easeInOut }, { t: 0.75, v: 22, ease: easeInOut }, { t: 1, v: 0 }] },
    ],
  },
];

export function findTemplate(id: string): MotionTemplate | undefined {
  return MOTION_TEMPLATES.find((template) => template.id === id);
}
