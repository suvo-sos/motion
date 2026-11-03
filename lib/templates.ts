import type { Track } from "./motion";
import { IMPORTED_TEMPLATES } from "./svgator-templates.generated";

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
 * The last three are converted from SVGator CSS exports (see
 * `scripts/import-svgator-templates.mjs`): their keyframes were translated
 * into tracks so they edit like any other project, and the few properties the
 * engine cannot express (`d`, `rx`/`ry`, `r`, `width`/`height`) stay in the
 * SVG's own `<style>` block. Their art lives in `/public` so the embedded
 * base64 payload never enters the JS bundle.
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

  /* ------------------------------------------------------------------ *
   * Converted SVGator exports — see lib/svgator-templates.generated.ts.
   * ------------------------------------------------------------------ */
  ...IMPORTED_TEMPLATES.map((template) => ({
    ...template,
    icon: template.icon as TemplateIconName,
  })),
];

export function findTemplate(id: string): MotionTemplate | undefined {
  return MOTION_TEMPLATES.find((template) => template.id === id);
}
