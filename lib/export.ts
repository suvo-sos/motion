import { toAnimatedSvg, type MotionAnimation, type AnimatedSvgOptions } from "./motion";
import { sanitizeSvg } from "./sanitize";

export type ExportFormat = "svg" | "webcss" | "js" | "copy";

export interface ExportResult {
  content: string;
  filename: string;
  mime: string;
}

export interface ExportRenderOptions extends AnimatedSvgOptions {
  // Optimization
  optimize?: boolean;
  precision?: number;
  removeViewBox?: boolean;
  removeDimensions?: boolean;
  normalizeViewBox?: boolean;
  removeDefaults?: boolean;
  cleanupIds?: boolean;
  // Accessibility
  title?: string;
  description?: string;
  addAriaLabels?: boolean;
  // Note: colorFormat / useCssVariables / externalCss were removed here —
  // they were accepted as options but never implemented in export code,
  // so keeping them only promised features that did nothing.
}

function roundNumber(num: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

function optimizeSvgContent(svg: string, options?: ExportRenderOptions): string {
  if (!options?.optimize) return svg;

  let optimized = svg;
  const precision = options.precision ?? 2;

  // Round numbers in SVG
  if (precision < 3) {
    optimized = optimized.replace(/(\d+\.\d{2,})/g, (match) => {
      const num = parseFloat(match);
      return roundNumber(num, precision).toString();
    });
  }

  // Remove dimensions if requested
  if (options.removeDimensions) {
    optimized = optimized.replace(/\s+(width|height)=["'][^"']*["']/gi, '');
  }

  // Normalize viewBox if requested
  if (options.normalizeViewBox) {
    optimized = optimized.replace(
      /viewBox=["']([^"']+)["']/,
      (match, vb) => {
        const parts = vb.split(/\s+/).map(parseFloat);
        if (parts.length === 4 && parts.every(Number.isFinite)) {
          const [x, y, w, h] = parts;
          return `viewBox="${roundNumber(x, precision)} ${roundNumber(y, precision)} ${roundNumber(w, precision)} ${roundNumber(h, precision)}"`;
        }
        return match;
      }
    );
  }

  // Remove default fill and stroke
  if (options.removeDefaults) {
    optimized = optimized.replace(/\s+fill=["']#000000["']/gi, '');
    optimized = optimized.replace(/\s+fill=["']black["']/gi, '');
    optimized = optimized.replace(/\s+stroke=["']none["']/gi, '');
  }

  // Remove viewBox if requested (this option was previously accepted by the
  // dialog but never applied).
  if (options.removeViewBox) {
    optimized = optimized.replace(/\s+viewBox=["'][^"']*["']/i, '');
  }

  // Cleanup IDs - shorten them
  if (options.cleanupIds) {
    const idMap = new Map<string, string>();
    let idCounter = 0;
    
    // Find all IDs
    optimized = optimized.replace(/\sid=["']([^"']+)["']/g, (match, id) => {
      if (!idMap.has(id)) {
        idMap.set(id, `e${idCounter++}`);
      }
      return ` id="${idMap.get(id)}"`;
    });
    
    // Replace ID references. Two fixes vs the old code: (1) escape the old
    // id before interpolating it into a RegExp, so ids containing regex
    // characters (dots, brackets, etc.) can't break the replacement, and
    // (2) also replace the sanitised id that toAnimatedSvg wrote into its
    // CSS selectors (e.g. `my shape` -> `my_shape` in CSS, but the raw id
    // in the element) — without this, an element with a space/dot in its
    // id silently stopped animating after id cleanup.
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    idMap.forEach((newId, oldId) => {
      optimized = optimized.replace(new RegExp(`#${escapeRegExp(oldId)}\\b`, 'g'), `#${newId}`);
      optimized = optimized.replace(new RegExp(`url\\(#${escapeRegExp(oldId)}\\)`, 'g'), `url(#${newId})`);
      const safeId = oldId.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (safeId !== oldId) {
        optimized = optimized.replace(new RegExp(`#${escapeRegExp(safeId)}\\b`, 'g'), `#${newId}`);
      }
    });
  }

  // Add accessibility tags
  if (options.title || options.description) {
    const titleTag = options.title
      ? `<title>${escapeHtml(options.title)}</title>`
      : "";
    const descTag = options.description
      ? `<desc>${escapeHtml(options.description)}</desc>`
      : "";
    optimized = optimized.replace(
      /(<svg[^>]*>)/,
      `$1${titleTag}${descTag}`
    );
  }

  if (options.addAriaLabels && options.title) {
    optimized = optimized.replace(
      /(<svg[^>]*?)>/,
      `$1 role="img" aria-label="${escapeHtml(options.title)}">`
    );
  }

  // Minify if requested
  if (options.minify) {
    // Remove comments
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
    // Remove extra whitespace between tags
    optimized = optimized.replace(/>\s+</g, '><');
    // Remove whitespace at start/end
    optimized = optimized.trim();
  }

  return optimized;
}

function slug(s: string) {
  return (s || "animation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Titles are plain text. Strip markup — including script bodies — so an
    exported page never echoes a payload back, even in an escaped context. */
function plainText(s: string) {
  return (s || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<[^>]*>/g, "");
}

export function exportSvg(anim: MotionAnimation, options?: ExportRenderOptions): ExportResult {
  let svg = toAnimatedSvg(anim, options);
  
  // Apply optimization
  svg = optimizeSvgContent(svg, options);
  
  return {
    content: svg,
    filename: `${slug(anim.title)}.svg`,
    mime: "image/svg+xml",
  };
}

export function exportWebCss(anim: MotionAnimation, options?: ExportRenderOptions): ExportResult {
  let svg = toAnimatedSvg(anim, options);
  svg = optimizeSvgContent(svg, options);
  
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(anim.title || "Animation")}</title>
<style>
  html, body { margin: 0; min-height: 100%; }
  body { display: grid; place-items: center; min-height: 100vh; background: #f5f5f5; }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
${svg}
</body>
</html>`;
  return {
    content,
    filename: `${slug(anim.title)}.html`,
    mime: "text/html",
  };
}

export function exportJs(anim: MotionAnimation, options?: ExportRenderOptions): ExportResult {
  const speed = Math.max(0.1, options?.speed ?? 1);
  const trigger = options?.trigger ?? "load";
  const frameRate = Math.max(1, Math.round(options?.frameRate ?? 60));
  const loop = options?.loop ?? anim.loop;
  // The JS export embeds the artwork directly, so it gets the same shared
  // sanitiser as the stage and the CSS export — not the raw saved SVG.
  let svg = sanitizeSvg(anim.svg);
  const bg = options?.canvasBg;
  if (bg && bg !== "none") {
    const vbMatch = svg.match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([\d.eE+]+)\s+([\d.eE+]+)\s*["']/i);
    const x = vbMatch ? vbMatch[1] : "0";
    const y = vbMatch ? vbMatch[2] : "0";
    const w = vbMatch ? vbMatch[3] : "100%";
    const h = vbMatch ? vbMatch[4] : "100%";
    svg = svg.replace(/(<svg[^>]*>)/, `$1<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" />`);
  }
  const scale = Math.max(0.1, options?.scale ?? 1);
  if (scale !== 1) {
    svg = svg.replace(/(\swidth\s*=\s*["'])(\d+(?:\.\d+)?)(["'])/i, (m, pre, num, post) => `${pre}${Math.round(Number(num) * scale)}${post}`);
    svg = svg.replace(/(\sheight\s*=\s*["'])(\d+(?:\.\d+)?)(["'])/i, (m, pre, num, post) => `${pre}${Math.round(Number(num) * scale)}${post}`);
  }
  if (options?.hyperlink && options.hyperlink.trim()) {
    const link = options.hyperlink.trim();
    svg = svg.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/, (m, open, inner, close) => `${open}<a href="${link}" target="_blank" rel="noopener noreferrer">${inner}</a>${close}`);
  }
  // Escape < in the embedded JSON so a title or value containing
  // "</script>" cannot close the player's own <script> tag early. The
  // JSON parser still reads \u003c as <, so the data is unchanged.
  // The title is plain text, so markup never reaches the exported page.
  const title = plainText(anim.title) || "Animation";
  const data = JSON.stringify({ ...anim, title, svg }).replace(/</g, "\\u003c");
  const content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  html, body { margin: 0; min-height: 100%; }
  body { display: grid; place-items: center; min-height: 100vh; background: #f5f5f5; }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
<div id="stage">${svg}</div>
<script>
const animation = ${data};

function cubicBezier(x1, y1, x2, y2) {
  return function (t) {
    const u = 1 - t;
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
  };
}

function easeProgress(ease, p) {
  // WARNING: this player is a copy of lib/motion.ts's engine, kept here
  // because the export must be self-contained. When the engine changes,
  // update this copy too — lib/motion.test.ts checks the export for hold
  // and colour handling so drift fails a test instead of shipping silently.
  if (ease === "hold") return 0;
  if (!ease || ease === "linear") return p;
  if (ease === "ease-in") return p * p;
  if (ease === "ease-out") return 1 - (1 - p) * (1 - p);
  if (ease === "ease-in-out") return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const match = ease.match(/cubic-bezier\\(([^)]+)\\)/);
  if (match && match[1]) {
    const points = match[1].split(",").map(function (n) { return parseFloat(n.trim()); });
    const x1 = points[0]; const y1 = points[1]; const x2 = points[2]; const y2 = points[3];
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      let lo = 0; let hi = 1;
      const fx = cubicBezier(x1, y1, x2, y2);
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const xm = 3 * (1 - mid) * (1 - mid) * mid * x1 + 3 * (1 - mid) * mid * mid * x2 + mid * mid * mid;
        if (xm < p) lo = mid; else hi = mid;
      }
      return fx((lo + hi) / 2);
    }
  }
  return p;
}

function parseColor(value) {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    const h = hex[1];
    const expand = (c) => parseInt(c + c, 16);
    if (h.length === 3) return { r: expand(h[0]), g: expand(h[1]), b: expand(h[2]), a: 1 };
    if (h.length === 4) return { r: expand(h[0]), g: expand(h[1]), b: expand(h[2]), a: expand(h[3]) / 255 };
    if (h.length === 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  return null;
}

function lerpColor(a, b, p) {
  const r = Math.round(a.r + (b.r - a.r) * p);
  const g = Math.round(a.g + (b.g - a.g) * p);
  const bl = Math.round(a.b + (b.b - a.b) * p);
  const alpha = a.a + (b.a - a.a) * p;
  if (alpha >= 1) {
    const hex = (v) => v.toString(16).padStart(2, "0");
    return "#" + hex(r) + hex(g) + hex(bl);
  }
  return "rgba(" + r + ", " + g + ", " + bl + ", " + (Math.round(alpha * 100) / 100) + ")";
}

function sampleTrack(track, t) {
  const kfs = [...track.keyframes].sort((a, b) => a.t - b.t);
  const first = kfs[0]; const last = kfs[kfs.length - 1];
  if (!first || !last) return 0;
  if (t <= first.t) return first.v;
  if (t >= last.t) return last.v;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]; const b = kfs[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const raw = (t - a.t) / span;
      const p = easeProgress(a.ease, raw);
      if (typeof a.v === "number" && typeof b.v === "number") return a.v + (b.v - a.v) * p;
      const ca = parseColor(a.v); const cb = parseColor(b.v);
      if (ca && cb) return lerpColor(ca, cb, p);
      return p < 0.5 ? a.v : b.v;
    }
  }
  return last.v;
}

const TRANSFORM_ORDER = [
  "translateX", "translateY", "rotate", "skewX", "skewY",
  "scale", "scaleX", "scaleY",
];
const FILTER_PROPERTIES = [
  "blur", "brightness", "saturate", "contrast", "grayscale", "hueRotate", "sepia",
];

function numeric(value, fallback) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function transformPart(property, value) {
  if (value === undefined) return null;
  const number = numeric(value, NaN);
  if (!Number.isFinite(number)) return null;
  if (property === "translateX") return "translateX(" + number + "px)";
  if (property === "translateY") return "translateY(" + number + "px)";
  if (property === "scale") return "scale(" + number + ")";
  if (property === "scaleX") return "scaleX(" + number + ")";
  if (property === "scaleY") return "scaleY(" + number + ")";
  if (property === "rotate") return "rotate(" + number + "deg)";
  if (property === "skewX") return "skewX(" + number + "deg)";
  if (property === "skewY") return "skewY(" + number + "deg)";
  return null;
}

function filterPart(property, value) {
  if (value === undefined) return null;
  const number = numeric(value, NaN);
  if (!Number.isFinite(number)) return null;
  if (property === "blur") return "blur(" + number + "px)";
  if (property === "brightness") return "brightness(" + number + "%)";
  if (property === "saturate") return "saturate(" + number + "%)";
  if (property === "contrast") return "contrast(" + number + "%)";
  if (property === "grayscale") return "grayscale(" + number + "%)";
  if (property === "hueRotate") return "hue-rotate(" + number + "deg)";
  if (property === "sepia") return "sepia(" + number + "%)";
  return null;
}

function applyAt(root, tracks, t) {
  for (const el of root.querySelectorAll("[data-motion-applied]")) {
    el.style.transform = ""; el.style.opacity = ""; el.style.fill = "";
    el.style.stroke = ""; el.style.removeProperty("stroke-width");
    el.style.strokeDashoffset = ""; el.style.removeProperty("filter");
    el.style.removeProperty("transform-origin"); el.style.removeProperty("transform-box");
    el.removeAttribute("data-motion-applied");
  }
  const byTarget = new Map();
  for (const tr of tracks) {
    if (!byTarget.has(tr.target)) byTarget.set(tr.target, []);
    byTarget.get(tr.target).push(tr);
  }
  for (const entry of byTarget) {
    const id = entry[0]; const list = entry[1];
    const el = root.querySelector("#" + CSS.escape(id));
    if (!el) continue;
    const styles = el.style;
    const values = new Map();
    for (const tr of list) values.set(tr.property, sampleTrack(tr, t));
    const parts = [];
    for (const property of TRANSFORM_ORDER) {
      if (!values.has(property)) continue;
      const part = transformPart(property, values.get(property));
      if (part) parts.push(part);
    }
    if (parts.length) {
      styles.transform = parts.join(" ");
      styles.setProperty("transform-origin", numeric(values.get("originX"), 50) + "% " + numeric(values.get("originY"), 50) + "%");
      styles.setProperty("transform-box", "fill-box");
    }
    const filterParts = [];
    for (const property of FILTER_PROPERTIES) {
      if (!values.has(property)) continue;
      const part = filterPart(property, values.get(property));
      if (part) filterParts.push(part);
    }
    if (filterParts.length) styles.filter = filterParts.join(" ");
    if (values.has("opacity")) styles.opacity = String(values.get("opacity"));
    if (values.has("fill")) styles.fill = String(values.get("fill"));
    if (values.has("stroke")) styles.stroke = String(values.get("stroke"));
    if (values.has("strokeWidth")) styles.setProperty("stroke-width", String(values.get("strokeWidth")));
    if (values.has("strokeDashoffset")) styles.strokeDashoffset = String(values.get("strokeDashoffset"));
    el.setAttribute("data-motion-applied", "");
  }
}

let start = null;
const duration = animation.duration / ${speed};
// frameRate/loop are baked in as literals by exportJs above. The old code
// read an undefined options variable here, which threw a ReferenceError
// and meant the JS export never animated at all. (No backticks in this
// embedded script: a backtick would end the template literal above.)
const frameInterval = 1000 / ${frameRate};
const shouldLoop = ${loop};
let lastApply = 0;
function frame(now) {
  if (!start) start = now;
  if (now - lastApply < frameInterval) { requestAnimationFrame(frame); return; }
  lastApply = now;
  const elapsed = now - start;
  if (!shouldLoop && elapsed >= duration) {
    applyAt(document, animation.tracks || [], 1);
    return;
  }
  const t = shouldLoop ? (elapsed % duration) / duration : elapsed / duration;
  applyAt(document, animation.tracks || [], t);
  requestAnimationFrame(frame);
}
const triggerMode = ${JSON.stringify(trigger)};
function startAnim() { requestAnimationFrame(frame); }
if (triggerMode === "hover") {
  const stageEl = document.getElementById("stage");
  if (stageEl) stageEl.addEventListener("mouseenter", startAnim, { once: true });
} else {
  startAnim();
}
</script>
</body>
</html>`;
  return {
    content,
    filename: `${slug(anim.title)}.js.html`,
    mime: "text/html",
  };
}

// Lottie export was removed: the old implementation embedded a static SVG
// image in a single layer with empty markers, so it was not a real animated
// Lottie at all. A real conversion needs a proper Lottie shape exporter;
// shipping a static file labelled as animated would be worse than none.
export function runExport(anim: MotionAnimation, format: ExportFormat, options?: ExportRenderOptions): ExportResult {
  if (format === "copy") {
    // Copy must return the animated export, not the raw artwork — copying
    // the raw SVG silently dropped the animation entirely.
    return exportSvg(anim, options);
  }
  
  let result: ExportResult;
  switch (format) {
    case "svg":
      result = exportSvg(anim, options);
      break;
    case "webcss":
      result = exportWebCss(anim, options);
      break;
    case "js":
      result = exportJs(anim, options);
      break;
  }
  if (options?.filename && options.filename.trim()) {
    const slug = options.filename.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
    const ext = result.filename.includes(".") ? result.filename.slice(result.filename.lastIndexOf(".")) : "";
    result.filename = `${slug}${ext}`;
  }
  return result;
}
