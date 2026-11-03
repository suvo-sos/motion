export type Property =
  | "translateX"
  | "translateY"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "rotate"
  | "skewX"
  | "skewY"
  | "originX"
  | "originY"
  | "opacity"
  | "blur"
  | "brightness"
  | "saturate"
  | "contrast"
  | "grayscale"
  | "hueRotate"
  | "sepia"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "strokeDashoffset";

export type PropertyGroup =
  | "transform"
  | "origin"
  | "effects"
  | "appearance"
  | "stroke";

export interface PropertyDefinition {
  label: string;
  group: PropertyGroup;
  kind: "number" | "color";
  unit?: string;
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  /** UI multiplier — opacity is stored 0–1 but shown as 0–100%. */
  displayScale?: number;
}

export interface Keyframe {
  t: number;
  v: number | string;
  ease?: string;
}

export interface Track {
  target: string;
  property: Property;
  keyframes: Keyframe[];
}

export interface MotionAnimation {
  id: string;
  title: string;
  svg: string;
  tracks: Track[];
  duration: number;
  loop: boolean;
  updatedAt?: string;
}

export const PROPERTY_GROUPS: Array<{
  id: PropertyGroup;
  label: string;
  properties: Property[];
}> = [
  {
    id: "transform",
    label: "Transform",
    properties: [
      "translateX",
      "translateY",
      "scale",
      "scaleX",
      "scaleY",
      "rotate",
      "skewX",
      "skewY",
    ],
  },
  { id: "origin", label: "Origin", properties: ["originX", "originY"] },
  {
    id: "effects",
    label: "Opacity & Filters",
    properties: [
      "opacity",
      "blur",
      "brightness",
      "saturate",
      "contrast",
      "grayscale",
      "hueRotate",
      "sepia",
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    properties: ["fill", "stroke", "strokeWidth"],
  },
  {
    id: "stroke",
    label: "Draw & Stroke",
    properties: ["strokeDashoffset"],
  },
];

export const PROPERTY_DEFINITIONS: Record<Property, PropertyDefinition> = {
  translateX: {
    label: "Move X",
    group: "transform",
    kind: "number",
    unit: "px",
    default: 0,
    step: 1,
  },
  translateY: {
    label: "Move Y",
    group: "transform",
    kind: "number",
    unit: "px",
    default: 0,
    step: 1,
  },
  scale: {
    label: "Scale",
    group: "transform",
    kind: "number",
    unit: "×",
    default: 1,
    min: 0,
    step: 0.01,
  },
  scaleX: {
    label: "Scale X",
    group: "transform",
    kind: "number",
    unit: "×",
    default: 1,
    min: 0,
    step: 0.01,
  },
  scaleY: {
    label: "Scale Y",
    group: "transform",
    kind: "number",
    unit: "×",
    default: 1,
    min: 0,
    step: 0.01,
  },
  rotate: {
    label: "Rotate",
    group: "transform",
    kind: "number",
    unit: "°",
    default: 0,
    step: 1,
  },
  skewX: {
    label: "Skew X",
    group: "transform",
    kind: "number",
    unit: "°",
    default: 0,
    step: 1,
  },
  skewY: {
    label: "Skew Y",
    group: "transform",
    kind: "number",
    unit: "°",
    default: 0,
    step: 1,
  },
  originX: {
    label: "Origin X",
    group: "origin",
    kind: "number",
    unit: "%",
    default: 50,
    min: 0,
    max: 100,
    step: 1,
  },
  originY: {
    label: "Origin Y",
    group: "origin",
    kind: "number",
    unit: "%",
    default: 50,
    min: 0,
    max: 100,
    step: 1,
  },
  opacity: {
    label: "Opacity",
    group: "effects",
    kind: "number",
    unit: "%",
    default: 1,
    min: 0,
    max: 1,
    step: 0.01,
    displayScale: 100,
  },
  blur: {
    label: "Blur",
    group: "effects",
    kind: "number",
    unit: "px",
    default: 0,
    min: 0,
    step: 0.5,
  },
  brightness: {
    label: "Brightness",
    group: "effects",
    kind: "number",
    unit: "%",
    default: 100,
    min: 0,
    step: 1,
  },
  saturate: {
    label: "Saturate",
    group: "effects",
    kind: "number",
    unit: "%",
    default: 100,
    min: 0,
    step: 1,
  },
  contrast: {
    label: "Contrast",
    group: "effects",
    kind: "number",
    unit: "%",
    default: 100,
    min: 0,
    step: 1,
  },
  grayscale: {
    label: "Grayscale",
    group: "effects",
    kind: "number",
    unit: "%",
    default: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  hueRotate: {
    label: "Hue rotate",
    group: "effects",
    kind: "number",
    unit: "°",
    default: 0,
    step: 1,
  },
  sepia: {
    label: "Sepia",
    group: "effects",
    kind: "number",
    unit: "%",
    default: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  fill: {
    label: "Fill",
    group: "appearance",
    kind: "color",
    default: "#000000",
  },
  stroke: {
    label: "Stroke",
    group: "appearance",
    kind: "color",
    default: "#000000",
  },
  strokeWidth: {
    label: "Stroke width",
    group: "appearance",
    kind: "number",
    unit: "px",
    default: 1,
    min: 0,
    step: 0.5,
  },
  strokeDashoffset: {
    label: "Draw on",
    group: "stroke",
    kind: "number",
    unit: "",
    default: 0,
    step: 1,
  },
};

export const TRANSFORM_PROPERTIES: Property[] = [
  "translateX",
  "translateY",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "skewX",
  "skewY",
];

/** Transform order is fixed so adding a track never reshuffles the canvas. */
export const TRANSFORM_ORDER: Property[] = [
  "translateX",
  "translateY",
  "rotate",
  "skewX",
  "skewY",
  "scale",
  "scaleX",
  "scaleY",
];

export const FILTER_PROPERTIES: Property[] = [
  "blur",
  "brightness",
  "saturate",
  "contrast",
  "grayscale",
  "hueRotate",
  "sepia",
];

function cubicBezier(_x1: number, y1: number, _x2: number, y2: number) {
  return (t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
  };
}

function easeProgress(ease: string | undefined, p: number): number {
  if (!ease || ease === "linear") return p;
  if (ease === "ease-in") return p * p;
  if (ease === "ease-out") return 1 - (1 - p) * (1 - p);
  if (ease === "ease-in-out")
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const m = ease.match(/cubic-bezier\(([^)]+)\)/);
  if (m?.[1]) {
    const [x1, y1, x2, y2] = m[1].split(",").map((n) => parseFloat(n.trim()));
    if (
      x1 !== undefined &&
      y1 !== undefined &&
      x2 !== undefined &&
      y2 !== undefined &&
      [x1, y1, x2, y2].every((n) => Number.isFinite(n))
    ) {
      // Binary search for x = p.
      let lo = 0;
      let hi = 1;
      const fx = cubicBezier(x1, y1, x2, y2);
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        // Approximate x with the same bezier x control points.
        const xm =
          3 * (1 - mid) * (1 - mid) * mid * x1 +
          3 * (1 - mid) * mid * mid * x2 +
          mid ** 3;
        if (xm < p) lo = mid;
        else hi = mid;
      }
      return fx((lo + hi) / 2);
    }
  }
  return p;
}

type Rgba = { r: number; g: number; b: number; a: number };

/** Parse a colour track value into channels, or null if it is not a colour. */
function parseColor(value: unknown): Rgba | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    const h = hex[1]!;
    const expand = (c: string) => parseInt(c + c, 16);
    if (h.length === 3) return { r: expand(h[0]!), g: expand(h[1]!), b: expand(h[2]!), a: 1 };
    if (h.length === 4) return { r: expand(h[0]!), g: expand(h[1]!), b: expand(h[2]!), a: expand(h[3]!) / 255 };
    if (h.length === 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  }
  return null;
}

function lerpColor(a: Rgba, b: Rgba, p: number): string {
  const r = Math.round(a.r + (b.r - a.r) * p);
  const g = Math.round(a.g + (b.g - a.g) * p);
  const bl = Math.round(a.b + (b.b - a.b) * p);
  const alpha = a.a + (b.a - a.a) * p;
  if (alpha >= 1) {
    const hex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(bl)}`;
  }
  return `rgba(${r}, ${g}, ${bl}, ${Math.round(alpha * 100) / 100})`;
}

export function sampleTrack(track: Track, t: number): number | string {
  const kfs = [...track.keyframes].sort((a, b) => a.t - b.t);
  const first = kfs[0];
  const last = kfs[kfs.length - 1];
  if (!first || !last) return 0;
  if (t <= first.t) return first.v;
  if (t >= last.t) return last.v;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const raw = (t - a.t) / span;
      const p = easeProgress(a.ease, raw);
      if (typeof a.v === "number" && typeof b.v === "number") {
        return a.v + (b.v - a.v) * p;
      }
      // Colour values blend channel by channel instead of jumping at the
      // midpoint, so an animated fill or stroke actually fades.
      const ca = parseColor(a.v);
      const cb = parseColor(b.v);
      if (ca && cb) return lerpColor(ca, cb, p);
      return p < 0.5 ? a.v : b.v;
    }
  }
  return last.v;
}

export function transformPart(
  property: Property,
  value: number | string | undefined,
): string | null {
  if (value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  switch (property) {
    case "translateX":
      return `translateX(${number}px)`;
    case "translateY":
      return `translateY(${number}px)`;
    case "scale":
      return `scale(${number})`;
    case "scaleX":
      return `scaleX(${number})`;
    case "scaleY":
      return `scaleY(${number})`;
    case "rotate":
      return `rotate(${number}deg)`;
    case "skewX":
      return `skewX(${number}deg)`;
    case "skewY":
      return `skewY(${number}deg)`;
    default:
      return null;
  }
}

export function filterPart(
  property: Property,
  value: number | string | undefined,
): string | null {
  if (value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  switch (property) {
    case "blur":
      return `blur(${number}px)`;
    case "brightness":
      return `brightness(${number}%)`;
    case "saturate":
      return `saturate(${number}%)`;
    case "contrast":
      return `contrast(${number}%)`;
    case "grayscale":
      return `grayscale(${number}%)`;
    case "hueRotate":
      return `hue-rotate(${number}deg)`;
    case "sepia":
      return `sepia(${number}%)`;
    default:
      return null;
  }
}

function numeric(value: number | string | undefined, fallback: number) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function applyAt(root: ParentNode, tracks: Track[], t: number) {
  // Clear styles applied by the previous frame so a removed track does not
  // leave a stale transform behind.
  for (const el of root.querySelectorAll<SVGElement>("[data-motion-applied]")) {
    el.style.transform = "";
    el.style.opacity = "";
    el.style.fill = "";
    el.style.stroke = "";
    el.style.removeProperty("stroke-width");
    el.style.strokeDashoffset = "";
    el.style.removeProperty("filter");
    el.style.removeProperty("transform-origin");
    el.style.removeProperty("transform-box");
    el.removeAttribute("data-motion-applied");
  }

  const byTarget = new Map<string, Track[]>();
  for (const tr of tracks) {
    if (!byTarget.has(tr.target)) byTarget.set(tr.target, []);
    byTarget.get(tr.target)!.push(tr);
  }
  for (const [id, list] of byTarget) {
    const el = root.querySelector(
      `#${CSS.escape(id)}`,
    ) as HTMLElement | SVGElement | null;
    if (!el) continue;
    const styles = (el as HTMLElement).style;
    const values = new Map<Property, number | string>();
    for (const tr of list) {
      values.set(tr.property, sampleTrack(tr, t));
    }

    const parts: string[] = [];
    for (const property of TRANSFORM_ORDER) {
      if (!values.has(property)) continue;
      const part = transformPart(property, values.get(property));
      if (part) parts.push(part);
    }
    if (parts.length > 0) {
      styles.transform = parts.join(" ");
      const originX = numeric(values.get("originX"), 50);
      const originY = numeric(values.get("originY"), 50);
      styles.setProperty("transform-origin", `${originX}% ${originY}%`);
      styles.setProperty("transform-box", "fill-box");
    }

    const filterParts: string[] = [];
    for (const property of FILTER_PROPERTIES) {
      if (!values.has(property)) continue;
      const part = filterPart(property, values.get(property));
      if (part) filterParts.push(part);
    }
    if (filterParts.length > 0) {
      styles.filter = filterParts.join(" ");
    }

    if (values.has("opacity")) styles.opacity = String(values.get("opacity"));
    if (values.has("fill")) styles.fill = String(values.get("fill"));
    if (values.has("stroke")) styles.stroke = String(values.get("stroke"));
    if (values.has("strokeWidth")) {
      styles.setProperty("stroke-width", String(values.get("strokeWidth")));
    }
    if (values.has("strokeDashoffset")) {
      styles.strokeDashoffset = String(values.get("strokeDashoffset"));
    }

    el.setAttribute("data-motion-applied", "");
  }
}

/** Add explicit 0% and 100% frames so a value never jumps at the seam. */
function withEnds(track: Track): Keyframe[] {
  const kfs = [...track.keyframes].sort((a, b) => a.t - b.t);
  const first = kfs[0];
  const last = kfs[kfs.length - 1];
  if (!first || !last) return kfs;
  const out = [...kfs];
  if (first.t > 0) out.unshift({ t: 0, v: sampleTrack(track, 0) });
  if (last.t < 1) out.push({ t: 1, v: sampleTrack(track, 1) });
  return out;
}

function declaration(property: Property, v: number | string): string {
  switch (property) {
    case "opacity":
      return `opacity: ${v};`;
    case "fill":
      return `fill: ${v};`;
    case "stroke":
      return `stroke: ${v};`;
    case "strokeWidth":
      return `stroke-width: ${v};`;
    case "strokeDashoffset":
      return `stroke-dashoffset: ${v};`;
    default:
      return "";
  }
}

function keyframeCss(track: Track): string {
  return withEnds(track)
    .map((k) => {
      const percent = Math.round(k.t * 1000) / 10;
      const ease = k.ease ? ` animation-timing-function: ${k.ease};` : "";
      return `  ${percent}% {${ease} ${declaration(track.property, k.v)} }`;
    })
    .join("\n");
}

function unionTimes(tracks: Track[]): number[] {
  return Array.from(
    new Set([0, 1, ...tracks.flatMap((track) => track.keyframes.map((k) => k.t))]),
  ).sort((a, b) => a - b);
}

function easeAt(t: number, tracks: Track[]): string {
  const source = tracks
    .flatMap((track) => track.keyframes)
    .find((k) => Math.abs(k.t - t) < 1e-6);
  return source?.ease ? ` animation-timing-function: ${source.ease};` : "";
}

function transformFrame(t: number, tracks: Track[]): string {
  const values = new Map<Property, number | string>();
  for (const track of tracks) {
    values.set(track.property, sampleTrack(track, t));
  }
  return TRANSFORM_ORDER.map((property) =>
    transformPart(property, values.get(property)),
  )
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function originFrame(t: number, tracks: Track[]): string {
  const values = new Map<Property, number | string>();
  for (const track of tracks) {
    values.set(track.property, sampleTrack(track, t));
  }
  return `${numeric(values.get("originX"), 50)}% ${numeric(
    values.get("originY"),
    50,
  )}%`;
}

function filterFrame(t: number, tracks: Track[]): string {
  const values = new Map<Property, number | string>();
  for (const track of tracks) {
    values.set(track.property, sampleTrack(track, t));
  }
  return FILTER_PROPERTIES.map((property) =>
    filterPart(property, values.get(property)),
  )
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export interface AnimatedSvgOptions {
  speed?: number;
  canvasBg?: string;
  trigger?: "load" | "hover";
  loop?: boolean;
  scale?: number;
  minify?: boolean;
  filename?: string;
  includeMetadata?: boolean;
  hyperlink?: string;
  frameRate?: number;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toAnimatedSvg(anim: MotionAnimation, options?: AnimatedSvgOptions): string {
  const byTarget = new Map<string, Track[]>();
  for (const tr of anim.tracks) {
    if (!byTarget.has(tr.target)) byTarget.set(tr.target, []);
    byTarget.get(tr.target)!.push(tr);
  }

  const iteration = (options?.loop ?? anim.loop) ? "infinite" : "1";
  const speed = Math.max(0.1, options?.speed ?? 1);
  const duration = anim.duration / speed;
  const trigger = options?.trigger ?? "load";
  const blocks: string[] = [];
  const rules: string[] = [];

  for (const [id, list] of byTarget) {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const animations: string[] = [];
    const staticProps: string[] = [];

    const transforms = list.filter((tr) =>
      TRANSFORM_PROPERTIES.includes(tr.property),
    );
    const origins = list.filter(
      (tr) => tr.property === "originX" || tr.property === "originY",
    );
    const filters = list.filter((tr) => FILTER_PROPERTIES.includes(tr.property));

    if (transforms.length > 0) {
      const frames = unionTimes(transforms)
        .map((t) => {
          const percent = Math.round(t * 1000) / 10;
          const ease = easeAt(t, transforms);
          return `  ${percent}% {${ease} transform: ${transformFrame(
            t,
            transforms,
          )}; }`;
        })
        .join("\n");
      const name = `m-${safeId}-transform`;
      blocks.push(`@keyframes ${name} {\n${frames}\n}`);
      animations.push(`${name} ${duration}ms linear ${iteration} both`);
      staticProps.push("transform-box: fill-box;");
      if (origins.length === 0) staticProps.push("transform-origin: center;");
    }

    if (origins.length > 0) {
      const frames = unionTimes(origins)
        .map((t) => {
          const percent = Math.round(t * 1000) / 10;
          const ease = easeAt(t, origins);
          return `  ${percent}% {${ease} transform-origin: ${originFrame(
            t,
            origins,
          )}; }`;
        })
        .join("\n");
      const name = `m-${safeId}-origin`;
      blocks.push(`@keyframes ${name} {\n${frames}\n}`);
      animations.push(`${name} ${duration}ms linear ${iteration} both`);
      staticProps.push("transform-box: fill-box;");
    }

    if (filters.length > 0) {
      const frames = unionTimes(filters)
        .map((t) => {
          const percent = Math.round(t * 1000) / 10;
          const ease = easeAt(t, filters);
          return `  ${percent}% {${ease} filter: ${filterFrame(
            t,
            filters,
          )}; }`;
        })
        .join("\n");
      const name = `m-${safeId}-filter`;
      blocks.push(`@keyframes ${name} {\n${frames}\n}`);
      animations.push(`${name} ${duration}ms linear ${iteration} both`);
    }

    for (const tr of list) {
      if (
        TRANSFORM_PROPERTIES.includes(tr.property) ||
        tr.property === "originX" ||
        tr.property === "originY" ||
        FILTER_PROPERTIES.includes(tr.property)
      ) {
        continue;
      }
      const name = `m-${safeId}-${tr.property}`;
      blocks.push(`@keyframes ${name} {\n${keyframeCss(tr)}\n}`);
      animations.push(`${name} ${duration}ms linear ${iteration} both`);
    }

    if (animations.length > 0) {
      const uniqueProps = Array.from(new Set(staticProps));
      const rule = `animation: ${animations.join(", ")};${
        uniqueProps.length ? ` ${uniqueProps.join(" ")}` : ""
      }`;
      if (trigger === "hover") {
        rules.push(`#${safeId}:hover { ${rule} }`);
      } else {
        rules.push(`#${safeId} { ${rule} }`);
      }
    }
  }

  // Reduced motion: viewers who prefer it get the end pose, statically,
  // instead of the animation. Each element's final sampled values become
  // plain declarations with animation disabled.
  const reducedRules: string[] = [];
  for (const [id, list] of byTarget) {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const parts: string[] = ["animation: none;"];
    const transforms = list.filter((tr) => TRANSFORM_PROPERTIES.includes(tr.property));
    if (transforms.length > 0) {
      const finalTransform = transformFrame(1, transforms);
      if (finalTransform) parts.push(`transform: ${finalTransform};`);
      parts.push("transform-box: fill-box;");
    }
    const origins = list.filter((tr) => tr.property === "originX" || tr.property === "originY");
    if (origins.length > 0) parts.push(`transform-origin: ${originFrame(1, origins)};`);
    const filters = list.filter((tr) => FILTER_PROPERTIES.includes(tr.property));
    if (filters.length > 0) {
      const finalFilter = filterFrame(1, filters);
      if (finalFilter) parts.push(`filter: ${finalFilter};`);
    }
    for (const tr of list) {
      if (TRANSFORM_PROPERTIES.includes(tr.property) || tr.property === "originX" || tr.property === "originY" || FILTER_PROPERTIES.includes(tr.property)) continue;
      const decl = declaration(tr.property, sampleTrack(tr, 1));
      if (decl) parts.push(decl);
    }
    if (parts.length > 1) reducedRules.push(`#${safeId} { ${parts.join(" ")} }`);
  }
  const css = [...blocks, ...rules, ...(reducedRules.length > 0 ? [`@media (prefers-reduced-motion: reduce) {\n${reducedRules.join("\n")}\n}`] : [])].join("\n");
  let svg = anim.svg;
  if (!/\sxmlns=/.test(svg)) {
    svg = svg.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  // Canvas background
  const bg = options?.canvasBg;
  if (bg && bg !== "none") {
    const vbMatch = svg.match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i);
    const x = vbMatch ? vbMatch[1] : "0";
    const y = vbMatch ? vbMatch[2] : "0";
    const w = vbMatch ? vbMatch[3] : "100%";
    const h = vbMatch ? vbMatch[4] : "100%";
    const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" />`;
    svg = svg.replace(/(<svg[^>]*>)/, `$1${rect}`);
  }
  // Scale (resolution bump): multiply width/height attributes only.
  const scale = Math.max(0.1, options?.scale ?? 1);
  if (scale !== 1) {
    svg = svg.replace(/(\swidth\s*=\s*["'])(\d+(?:\.\d+)?)(["'])/i, (m, pre, num, post) => `${pre}${Math.round(Number(num) * scale)}${post}`);
    svg = svg.replace(/(\sheight\s*=\s*["'])(\d+(?:\.\d+)?)(["'])/i, (m, pre, num, post) => `${pre}${Math.round(Number(num) * scale)}${post}`);
  }
  // Metadata
  if (options?.includeMetadata) {
    const titleTag = `<title>${escapeXml(anim.title || "Animation")}</title>`;
    svg = svg.replace(/(<svg[^>]*>)/, `$1${titleTag}`);
  }
  if (options?.hyperlink) {
    const link = options.hyperlink.trim();
    if (link) {
      svg = svg.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/, (m, open, inner, close) => {
        // Avoid double-wrapping if a style tag exists; wrap all inner content.
        return `${open}<a href="${escapeXml(link)}" target="_blank" rel="noopener noreferrer">${inner}</a>${close}`;
      });
    }
  }
  if (svg.includes("</svg>")) {
    svg = svg.replace("</svg>", `<style>${css}</style></svg>`);
  }
  if (options?.minify) {
    svg = svg.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  }
  return svg;
}
