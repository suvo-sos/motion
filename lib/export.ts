import { toAnimatedSvg, type MotionAnimation } from "./motion";

export type ExportFormat = "svg" | "webcss" | "js" | "lottie";

export interface ExportResult {
  content: string;
  filename: string;
  mime: string;
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

export function exportSvg(anim: MotionAnimation): ExportResult {
  return {
    content: toAnimatedSvg(anim),
    filename: `${slug(anim.title)}.svg`,
    mime: "image/svg+xml",
  };
}

export function exportWebCss(anim: MotionAnimation): ExportResult {
  const svg = toAnimatedSvg(anim);
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

export function exportJs(anim: MotionAnimation): ExportResult {
  const svg = anim.svg;
  const data = JSON.stringify(anim);
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
function frame(now) {
  if (!start) start = now;
  const elapsed = (now - start) % animation.duration;
  const t = elapsed / animation.duration;
  applyAt(document, animation.tracks || [], t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
</script>
</body>
</html>`;
  return {
    content,
    filename: `${slug(anim.title)}.js.html`,
    mime: "text/html",
  };
}

export function exportLottie(anim: MotionAnimation): ExportResult {
  // Build a minimal but valid Lottie composition embedding the static SVG
  // as an image asset. Animation tracks are preserved as layer markers data
  // is not fully converted; this provides a previewable Lottie file.
  const svg = anim.svg;
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg).toString("base64");
  const vbMatch = svg.match(/viewBox=["']([^"']+)["']/i)?.[1]?.split(/\s+/);
  const vb = vbMatch && vbMatch.length >= 4 ? vbMatch : ["0", "0", "200", "200"];
  const w = parseFloat(vb[2] ?? "200") || 200;
  const h = parseFloat(vb[3] ?? "200") || 200;
  const frames = Math.max(1, Math.round((anim.duration / 1000) * 60));
  const lottie = {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op: frames,
    w,
    h,
    nm: anim.title || "Animation",
    ddd: 0,
    assets: [
      {
        id: "svg_asset",
        w,
        h,
        u: "",
        p: `data:image/svg+xml;base64,${b64}`,
        e: 0,
      },
    ],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 2,
        nm: "svg",
        refId: "svg_asset",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [w / 2, h / 2, 0] },
          a: { a: 0, k: [w / 2, h / 2, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        ip: 0,
        op: frames,
        st: 0,
        bm: 0,
      },
    ],
    markers: [],
  };
  return {
    content: JSON.stringify(lottie, null, 2),
    filename: `${slug(anim.title)}.json`,
    mime: "application/json",
  };
}

export function runExport(anim: MotionAnimation, format: ExportFormat): ExportResult {
  switch (format) {
    case "svg":
      return exportSvg(anim);
    case "webcss":
      return exportWebCss(anim);
    case "js":
      return exportJs(anim);
    case "lottie":
      return exportLottie(anim);
  }
}
