/**
 * Converts imported SVG CSS exports into timeline-editable templates.
 *
 * The source app writes motion as CSS `@keyframes`. The studio drives motion
 * from `Track[]`, so this script translates every property the engine can
 * express into tracks and only leaves the rest in the SVG's own `<style>`
 * block:
 *
 *   converted  → opacity, fill, stroke, stroke-width, stroke-dashoffset,
 *                and transform (translate / scale / rotate only)
 *   kept in CSS → `d`, `r`, `rx`, `ry`, `width`, `height`, plus anything
 *                 unrecognised, so the art never silently breaks
 *
 * Transform conversion also emits a scoped `!important` rule forcing
 * `transform-box: view-box` on the converted elements. The engine normally
 * renders transforms in `fill-box` space, but the source exports rely on the
 * SVG default pivot (the centre of the viewBox); the important rule keeps
 * that pivot while the engine writes the per-frame inline transform.
 *
 * The pristine source exports are NOT committed (one of them carries ~1 MB of
 * embedded art), so point the script at the folder that holds them:
 *
 *   node scripts/import-svg-templates.mjs ~/Downloads
 *
 * Running it twice from the same folder is safe: it always starts from the
 * original exports and rewrites both the public SVGs and the generated tracks.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const TEMPLATES = [
  {
    id: "cup-game-loader",
    label: "Cup game loader",
    hint: "Shell-game loop with three cups and a bouncing ball.",
    icon: "loader",
    source: "cup-game-loader (1).svg",
  },
];

const SOURCE_DIR = process.argv[2];
if (!SOURCE_DIR) {
  console.error(
    "usage: node scripts/import-svg-templates.mjs <folder with the source SVG exports>",
  );
  process.exit(1);
}

/** Properties this engine can drive from a track. */
const CONVERTIBLE = new Set([
  "opacity",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dashoffset",
  "transform",
]);

/* ------------------------------------------------------------------ *
 * CSS parsing
 * ------------------------------------------------------------------ */

function splitDecls(body) {
  const out = [];
  for (const chunk of body.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon < 0) continue;
    const prop = chunk.slice(0, colon).trim().toLowerCase();
    const value = chunk.slice(colon + 1).trim();
    if (!prop) continue;
    out.push({ prop, value });
  }
  return out;
}

function parseCss(css) {
  const tokens = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    if (brace < 0) break;
    const selector = css.slice(i, brace).trim();
    if (!selector) {
      i = brace + 1;
      continue;
    }
    let depth = 0;
    let end = brace;
    for (; end < css.length; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = css.slice(brace + 1, end);
    if (selector.startsWith("@keyframes")) {
      const name = selector.replace(/@keyframes\s+/, "").trim();
      const frames = [];
      let cursor = 0;
      while (cursor < body.length) {
        const open = body.indexOf("{", cursor);
        if (open < 0) break;
        const offsets = body.slice(cursor, open).trim();
        let d = 0;
        let close = open;
        for (; close < body.length; close++) {
          if (body[close] === "{") d++;
          else if (body[close] === "}") {
            d--;
            if (d === 0) break;
          }
        }
        const declBody = body.slice(open + 1, close);
        for (const offset of offsets.split(",")) {
          const pct = parseFloat(offset);
          if (!Number.isFinite(pct)) continue;
          frames.push({ pct, offset: offset.trim(), decls: splitDecls(declBody) });
        }
        cursor = close + 1;
      }
      tokens.push({ type: "keyframes", name, frames });
    } else if (selector.startsWith("@")) {
      tokens.push({ type: "at", raw: `${selector}{${body}}` });
    } else {
      tokens.push({
        type: "rule",
        selector,
        decls: splitDecls(body),
        originalBody: body,
      });
    }
    i = end + 1;
  }
  return tokens;
}

function animationList(rule) {
  const decls = rule.decls;
  const get = (prop) => decls.find((d) => d.prop === prop)?.value;
  const shorthand = get("animation");
  if (shorthand) {
    return shorthand.split(",").map((part) => {
      const words = part.trim().split(/\s+/);
      return {
        name: words[0],
        duration: words[1] ?? "0ms",
        timing: words[2] ?? "linear",
        iteration: words[3] ?? "1",
        delay: "0ms",
      };
    });
  }
  const names = (get("animation-name") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return [];
  const list = (prop) =>
    (get(prop) ?? "").split(",").map((v) => v.trim());
  const durations = list("animation-duration");
  const timings = list("animation-timing-function");
  const iterations = list("animation-iteration-count");
  const delays = list("animation-delay");
  return names.map((name, index) => ({
    name,
    duration: durations[index] ?? durations[0] ?? "0ms",
    timing: timings[index] ?? timings[0] ?? "linear",
    iteration: iterations[index] ?? iterations[0] ?? "1",
    delay: delays[index] ?? delays[0] ?? "0ms",
  }));
}

const isAnimationDecl = (prop) =>
  prop === "animation" || prop.startsWith("animation-");

/* ------------------------------------------------------------------ *
 * Value conversion
 * ------------------------------------------------------------------ */

function numberFrom(text) {
  const match = String(text).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/i);
  return match ? parseFloat(match[0]) : null;
}

const round = (n) => Math.round(n * 1e4) / 1e4;

/** Parse a CSS transform list into additive components, or null if unsupported. */
function parseTransform(value) {
  const text = value.trim();
  const state = {
    tx: 0,
    ty: 0,
    sx: 1,
    sy: 1,
    rotate: 0,
    signature: [],
  };
  if (/^none$/i.test(text)) return state;
  const calls = [...text.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)];
  if (calls.length === 0) return null;
  for (const [, rawFn, rawArgs] of calls) {
    const fn = rawFn.toLowerCase();
    const args = rawArgs
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    switch (fn) {
      case "translate": {
        state.tx += numberFrom(args[0] ?? "0") ?? 0;
        state.ty += numberFrom(args[1] ?? "0") ?? 0;
        break;
      }
      case "translatex":
        state.tx += numberFrom(args[0] ?? "0") ?? 0;
        break;
      case "translatey":
        state.ty += numberFrom(args[0] ?? "0") ?? 0;
        break;
      case "scale": {
        const x = numberFrom(args[0] ?? "1");
        const y = args[1] === undefined ? x : numberFrom(args[1]);
        if (x === null || y === null) return null;
        state.sx *= x;
        state.sy *= y;
        break;
      }
      case "scalex": {
        const x = numberFrom(args[0] ?? "1");
        if (x === null) return null;
        state.sx *= x;
        break;
      }
      case "scaley": {
        const y = numberFrom(args[0] ?? "1");
        if (y === null) return null;
        state.sy *= y;
        break;
      }
      case "rotate": {
        if (args.length > 1) return null; // rotate(angle cx cy) needs a pivot
        const angle = numberFrom(args[0] ?? "0");
        if (angle === null) return null;
        state.rotate += angle;
        break;
      }
      default:
        return null; // matrix, skew, 3d, perspective…
    }
    state.signature.push(fn);
  }
  return state;
}

const TRANSFORM_TRACKS = [
  { key: "tx", property: "translateX", base: 0 },
  { key: "ty", property: "translateY", base: 0 },
  { key: "sx", property: "scaleX", base: 1 },
  { key: "sy", property: "scaleY", base: 1 },
  { key: "rotate", property: "rotate", base: 0 },
];

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */

/** Give the root a width/height matching its viewBox so nothing letterboxes it. */
function normaliseRoot(source) {
  const head = source.slice(0, source.indexOf(">") + 1);
  if (/\swidth=/.test(head)) return source;
  const viewBox = head.match(/viewBox="([^"]+)"/);
  if (!viewBox) return source;
  const [, , width, height] = viewBox[1].trim().split(/[\s,]+/);
  if (!width || !height) return source;
  return source.replace(
    /(<svg[^>]*?viewBox="[^"]*")/,
    `$1 width="${width}" height="${height}"`,
  );
}

/**
 * Optional scene rotation for compositions that read sideways. Wraps the art
 * (not the root) so keyframe values stay untouched while the whole scene —
 * vehicle and speed streaks together — turns.
 */
function rotateScene(svg, degrees) {
  if (!degrees) return svg;
  const open = svg.indexOf(">", svg.indexOf("<svg")) + 1;
  const close = svg.lastIndexOf("</svg>");
  const box = svg
    .slice(0, open)
    .match(/viewBox="([^"]+)"/)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const cx = box?.[2] ? box[2] / 2 : 0;
  const cy = box?.[3] ? box[3] / 2 : 0;
  return `${svg.slice(0, open)}<g transform="rotate(${degrees} ${cx} ${cy})">${svg.slice(open, close)}</g>${svg.slice(close)}`;
}

/** Root artboard size, used by galleries to lay previews out at their real ratio. */function readRootSize(svg) {
  const head = svg.slice(0, svg.indexOf(">") + 1);
  const width = Number(head.match(/\swidth="([\d.]+)"/)?.[1]);
  const height = Number(head.match(/\sheight="([\d.]+)"/)?.[1]);
  if (width > 0 && height > 0) return { width, height };
  const box = head
    .match(/viewBox="([^"]+)"/)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length === 4 && box[2] > 0 && box[3] > 0) {
    return { width: box[2], height: box[3] };
  }
  return { width: 3, height: 2 };
}

/**
 * Remote asset references die the moment the file is opened from a data: URL
 * (home previews) or exported, so pull them in as data URIs.
 */
async function inlineRemoteAssets(source) {
  const urls = new Set(
    [...source.matchAll(/(?:xlink:)?href="(https?:[^"]+)"/g)].map((m) => m[1]),
  );
  let out = source;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
      const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
      out = out.split(url).join(`data:${type};base64,${base64}`);
      console.log(`  inlined ${url} (${type})`);
    } catch (error) {
      console.warn(`  kept remote ${url} (${error.message})`);
    }
  }
  return out;
}

async function convertTemplate({ id }) {
  const template = TEMPLATES.find((t) => t.id === id);
  const source = normaliseRoot(
    await inlineRemoteAssets(
      fs.readFileSync(path.join(path.resolve(SOURCE_DIR), template.source), "utf8"),
    ),
  );

  const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error(`${file}: no <style> block`);
  const styleStart = styleMatch.index;
  const styleEnd = styleStart + styleMatch[0].length;
  const inner = styleMatch[1];
  const cdataOpen = inner.includes("<![CDATA[");
  const cdataClose = inner.includes("]]>");
  const css = inner
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "");

  const tokens = parseCss(css);
  const keyframes = new Map();
  for (const token of tokens) {
    if (token.type === "keyframes") keyframes.set(token.name, token);
  }

  const ruleTokens = tokens.filter((t) => t.type === "rule");
  const animatedRules = ruleTokens.filter((r) => animationList(r).length > 0);

  // Group by element so multi-animation rules stay consistent.
  const bySelector = new Map();
  for (const rule of animatedRules) {
    if (!bySelector.has(rule.selector)) bySelector.set(rule.selector, []);
    bySelector.get(rule.selector).push(rule);
  }

  const tracks = [];
  const transformTargets = new Set();
  const removedByAnim = new Map(); // keyframe name -> Set(props)
  let durationMs = 0;
  let loops = false;

  for (const [selector, rules] of bySelector) {
    const target = selector.replace(/^#/, "");
    const anims = rules.flatMap((rule) =>
      animationList(rule).map((anim) => ({ anim, rule })),
    );

    const dur = Math.max(
      ...anims.map(({ anim }) => numberFrom(anim.duration) ?? 0),
    );
    durationMs = Math.max(durationMs, dur);
    if (anims.some(({ anim }) => /infinite/i.test(anim.iteration))) loops = true;

    // Which properties does each animation touch?
    const touched = new Map();
    for (const { anim } of anims) {
      const kf = keyframes.get(anim.name);
      if (!kf) continue;
      const props = new Set();
      for (const frame of kf.frames) {
        for (const decl of frame.decls) {
          if (decl.prop === "animation-timing-function") continue;
          props.add(decl.prop);
        }
      }
      touched.set(anim.name, props);
    }

    const transformAnims = anims.filter((a) => touched.get(a.anim.name)?.has("transform"));

    for (const { anim } of anims) {
      const kf = keyframes.get(anim.name);
      const props = touched.get(anim.name);
      if (!kf || !props) continue;

      const removable = new Set();
      const transformSlots = [];

      for (const prop of props) {
        if (!CONVERTIBLE.has(prop)) continue;
        if (prop === "transform") {
          if (transformAnims.length !== 1) continue; // CSS transform lists never compose
          const parsed = [];
          let ok = true;
          for (const frame of kf.frames) {
            const decl = frame.decls.find((d) => d.prop === "transform");
            if (!decl) {
              parsed.push(null);
              continue;
            }
            const value = parseTransform(decl.value);
            if (!value) {
              ok = false;
              break;
            }
            parsed.push(value);
          }
          if (!ok) continue;
          removable.add("transform");
          transformSlots.push({ kf, parsed });
          transformTargets.add(target);
          continue;
        }
        removable.add(prop);
      }

      if (removable.size === 0) continue;

      const easeFor = (frame) => {
        const declared = frame.decls.find(
          (d) => d.prop === "animation-timing-function",
        );
        const ease = (declared?.value ?? anim.timing ?? "linear").trim();
        return /^linear$/i.test(ease) ? undefined : ease;
      };

      // --- transform → translate/scale/rotate tracks
      for (const { kf: transformKf, parsed } of transformSlots) {
        const values0 = transformKf.frames
          .map((frame, index) => ({ frame, state: parsed[index] }))
          .filter(({ state }) => Boolean(state));
        // A CSS transform list replaces the whole transform, so every function
        // the animation mentions needs a track even when its value is the
        // identity (the element's own transform attribute is overridden).
        const used = new Set();
        for (const { state } of values0) {
          for (const fn of state.signature) {
            if (fn === "translate" || fn === "translatex") used.add("translateX");
            if (fn === "translate" || fn === "translatey") used.add("translateY");
            if (fn === "scale" || fn === "scalex") used.add("scaleX");
            if (fn === "scale" || fn === "scaley") used.add("scaleY");
            if (fn === "rotate") used.add("rotate");
          }
        }
        for (const { key, property } of TRANSFORM_TRACKS) {
          if (!used.has(property)) continue;
          const values = values0.map(({ frame, state }) => ({
            frame,
            value: state[key],
          }));
          if (values.length === 0) continue;
          tracks.push({
            target,
            property,
            keyframes: values.map(({ frame, value }) => {
              const ease = easeFor(frame);
              return ease
                ? { t: round(frame.pct / 100), v: round(value), ease }
                : { t: round(frame.pct / 100), v: round(value) };
            }),
          });
        }
      }

      // --- plain property tracks
      for (const prop of removable) {
        if (prop === "transform") continue;
        const property =
          prop === "stroke-width"
            ? "strokeWidth"
            : prop === "stroke-dashoffset"
              ? "strokeDashoffset"
              : prop;
        const numeric = prop !== "fill" && prop !== "stroke";
        const entries = [];
        for (const frame of kf.frames) {
          const decl = frame.decls.find((d) => d.prop === prop);
          if (!decl) continue;
          let value = numeric ? numberFrom(decl.value) : decl.value;
          if (value === null) continue;
          const ease = easeFor(frame);
          entries.push(
            ease
              ? { t: round(frame.pct / 100), v: numeric ? round(value) : value, ease }
              : { t: round(frame.pct / 100), v: numeric ? round(value) : value },
          );
        }
        if (entries.length === 0) continue;
        tracks.push({ target, property, keyframes: entries });
      }

      if (removable.size > 0) {
        removedByAnim.set(anim.name, removable);
      }
    }
  }

  /* ---------------- rewrite the stylesheet ---------------- */

  const removeProps = new Map(); // keyframe name -> Set(props)
  const dropAnimations = new Set(); // keyframe names fully consumed
  for (const [name, props] of removedByAnim) {
    const kf = keyframes.get(name);
    const all = new Set();
    for (const frame of kf.frames) {
      for (const decl of frame.decls) {
        if (decl.prop === "animation-timing-function") continue;
        all.add(decl.prop);
      }
    }
    const remaining = [...all].filter((p) => !props.has(p));
    if (remaining.length === 0) dropAnimations.add(name);
    else removeProps.set(name, props);
  }

  const output = [];
  for (const token of tokens) {
    if (token.type === "at") {
      output.push(token.raw);
      continue;
    }
    if (token.type === "keyframes") {
      if (dropAnimations.has(token.name)) continue;
      const remove = removeProps.get(token.name);
      const frames = token.frames
        .map((frame) => {
          const decls = remove
            ? frame.decls.filter((d) => !remove.has(d.prop))
            : frame.decls;
          if (decls.length === 0) return null;
          return `${frame.offset} {${decls.map((d) => `${d.prop}: ${d.value}`).join(";")}}`;
        })
        .filter(Boolean);
      if (frames.length === 0) continue;
      output.push(`@keyframes ${token.name} { ${frames.join(" ")} }`);
      continue;
    }
    // rule
    const anims = animationList(token);
    if (anims.length === 0) {
      output.push(`${token.selector} {${token.originalBody}}`);
      continue;
    }
    const kept = anims.filter((anim) => !dropAnimations.has(anim.name));
    const others = token.decls.filter((d) => !isAnimationDecl(d.prop));
    const decls = [];
    for (const anim of kept) {
      decls.push(
        `animation: ${anim.name} ${anim.duration} ${anim.timing} ${anim.iteration} normal forwards`,
      );
    }
    for (const decl of others) decls.push(`${decl.prop}: ${decl.value}`);
    if (decls.length === 0) continue;
    output.push(`${token.selector} {${decls.join(";")}}`);
  }

  if (transformTargets.size > 0) {
    const list = [...transformTargets].map((t) => `#${t}`).join(",");
    // The engine renders transforms around the fill-box centre. These exports
    // pivot on the SVG default (viewBox centre), so pin that for the converted
    // elements. `!important` beats the inline styles the engine writes.
    output.push(
      `${list} {transform-box: view-box !important;transform-origin: 50% 50% !important}`,
    );
  }

  const rebuiltCss = `\n${output.join("")}\n`;
  const rebuiltStyle = `<style>${cdataOpen ? "<![CDATA[" : ""}${rebuiltCss}${cdataClose ? "]]>" : ""}</style>`;
  const nextSvg =
    source.slice(0, styleStart) + rebuiltStyle + source.slice(styleEnd);

  return {
    id,
    svg: nextSvg,
    css: rebuiltCss,
    tracks,
    intrinsic: readRootSize(nextSvg),
    duration: Math.min(60000, Math.round(durationMs)),
    loop: loops,
    stats: {
      tracks: tracks.length,
      keyframes: tracks.reduce((n, t) => n + t.keyframes.length, 0),
      keptKeyframes: [...keyframes.keys()].filter(
        (name) => !dropAnimations.has(name),
      ).length,
      droppedKeyframes: dropAnimations.size,
      transformTargets: transformTargets.size,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const results = [];
for (const template of TEMPLATES) {
  const result = await convertTemplate(template);
  fs.writeFileSync(
    path.resolve(ROOT, `public/templates/${template.id}.svg`),
    rotateScene(result.svg, template.rotate),
    "utf8",
  );
  results.push({ ...result, template });
}

const generated = `/**
 * AUTO-GENERATED by scripts/import-svg-templates.mjs — do not edit by hand.
 *
 * Keyframe tracks converted from imported SVG CSS exports. The payload art
 * stays in /public; only the motion lives here.
 */
import type { Track } from "./motion";

export interface ImportedTemplateData {
  id: string;
  label: string;
  hint: string;
  icon: string;
  src: string;
  width: number;
  height: number;
  duration: number;
  loop: boolean;
  tracks: Track[];
}

export const IMPORTED_TEMPLATES: ImportedTemplateData[] = [
${results
  .map((r) => {
    const tracks = r.tracks
      .map((track) => {
        const frames = track.keyframes
          .map((k) => {
            const ease = k.ease ? `, ease: ${JSON.stringify(k.ease)}` : "";
            return `          { t: ${k.t}, v: ${JSON.stringify(k.v)}${ease} },`;
          })
          .join("\n");
        return `      {\n        target: ${JSON.stringify(track.target)},\n        property: ${JSON.stringify(track.property)},\n        keyframes: [\n${frames}\n        ],\n      },`;
      })
      .join("\n");
    return `  {
    id: ${JSON.stringify(r.template.id)},
    label: ${JSON.stringify(r.template.label)},
    hint: ${JSON.stringify(r.template.hint)},
    icon: ${JSON.stringify(r.template.icon)},
    src: ${JSON.stringify(`/templates/${r.template.id}.svg`)},
    width: ${r.intrinsic.width},
    height: ${r.intrinsic.height},
    duration: ${r.duration},
    loop: ${r.loop},
    tracks: [
${tracks}
    ],
  },`;
  })
  .join("\n")}
];
`;

fs.writeFileSync(
  path.resolve(ROOT, "lib/imported-templates.generated.ts"),
  generated,
  "utf8",
);

for (const result of results) {
  console.log(
    `${result.id}: ${result.stats.tracks} tracks / ${result.stats.keyframes} keyframes · ` +
      `${result.duration}ms · loop=${result.loop} · ` +
      `${result.stats.transformTargets} transform targets · ` +
      `kept ${result.stats.keptKeyframes} keyframe rules, dropped ${result.stats.droppedKeyframes}`,
  );
}
