/**
 * Promotes exported studio projects into template-gallery entries.
 *
 * The project library lives only in the browser, so the input here is the
 * JSON file produced by the home screen's **Export** button
 * (`motion-studio-projects-YYYY-MM-DD.json`). Each project becomes:
 *
 *   public/templates/<slug>.svg        the art, served on demand
 *   lib/user-templates.generated.ts    the tracks + metadata the gallery reads
 *
 * Art goes to `/public` rather than into the bundle for the same reason the
 * imported SVG exports do: a project can carry a megabyte of paths, and only
 * the card the user opens should pay for it.
 *
 * Usage:
 *   node scripts/projects-to-templates.mjs ~/Downloads/motion-studio-projects-2026-11-06.json
 *
 * Projects whose title already exists in the gallery are skipped and listed,
 * so running it twice never creates duplicate cards.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
// OUT_ROOT lets a dry run write somewhere else (e.g. a temp dir) instead of
// the repo, so the pipeline can be checked without generating files.
const OUT_ROOT = process.env.OUT_ROOT ? path.resolve(process.env.OUT_ROOT) : ROOT;
const PUBLIC_DIR = path.join(OUT_ROOT, "public", "templates");
const OUT_FILE = path.join(OUT_ROOT, "lib", "user-templates.generated.ts");

const ICONS = ["sparkles", "loader", "bolt", "spinner", "bars", "heart", "orbit", "ball"];

/** Keyword → icon, so a cardio/rocket/bell card reads right in the grid. */
const ICON_HINTS = [
  [/load|spin|progress|wait/i, "loader"],
  [/heart|love|like|birthday/i, "heart"],
  [/rocket|launch|bolt|flash|pulse|signal|pump|battery|chip|power|circuit/i, "bolt"],
  [/ball|jump|bounce|drop|fruit/i, "ball"],
  [/bar|equal|wave|chart|level/i, "bars"],
  [/orbit|planet|space|earth|globe|grid/i, "orbit"],
  [/star|sparkle|ai|chat|type|reveal/i, "sparkles"],
];

const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error(
    "usage: node scripts/projects-to-templates.mjs <path to exported projects JSON>",
  );
  process.exit(1);
}

const exported = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
const projects = Array.isArray(exported) ? exported : exported.projects;
if (!Array.isArray(projects)) {
  console.error("Input has no `projects` array.");
  process.exit(1);
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  );
}

function iconFor(title) {
  for (const [pattern, icon] of ICON_HINTS) {
    if (pattern.test(title)) return icon;
  }
  return "sparkles";
}

/** Artboard size, so the card can size the preview to the art. */
function artboardSize(svg) {
  const viewBox = /viewBox=["']([^"']+)["']/i.exec(svg);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }
  const width = Number(/\bwidth=["']([\d.]+)/i.exec(svg)?.[1] ?? 0);
  const height = Number(/\bheight=["']([\d.]+)/i.exec(svg)?.[1] ?? 0);
  return { width: width || 512, height: height || 512 };
}

/** Existing gallery labels, so a re-run does not duplicate a card. */
function existingTemplateLabels() {
  const labels = new Set();
  for (const file of ["lib/templates.ts", "lib/imported-templates.generated.ts"]) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const match of text.matchAll(/\blabel:\s*"([^"]+)"/g)) {
      labels.add(match[1].toLowerCase().trim());
    }
  }
  return labels;
}

const existing = existingTemplateLabels();
const usedSlugs = new Set();
const created = [];
const skipped = [];

/** One card per title: the same project saved twice is still one animation. */
const byTitle = new Map();
for (const project of projects) {
  const title = (project.title ?? "Untitled").trim();
  const key = title.toLowerCase();
  const seen = byTitle.get(key);
  if (!seen || Date.parse(project.updatedAt ?? 0) > Date.parse(seen.updatedAt ?? 0)) {
    if (seen) skipped.push(`${title} — duplicate, kept the newer copy`);
    byTitle.set(key, project);
  } else {
    skipped.push(`${title} — duplicate, kept the newer copy`);
  }
}

// Newest work first: the gallery should open on what the user just made.
const ordered = [...byTitle.values()].sort(
  (a, b) => Date.parse(b.updatedAt ?? 0) - Date.parse(a.updatedAt ?? 0),
);

for (const project of ordered) {
  const title = (project.title ?? "Untitled").trim();
  const svg = typeof project.svg === "string" ? project.svg : "";
  if (!svg.includes("<svg")) {
    skipped.push(`${title} — no SVG`);
    continue;
  }
  if (existing.has(title.toLowerCase())) {
    skipped.push(`${title} — already a template`);
    continue;
  }

  const base = slugify(title);
  let slug = base;
  for (let n = 2; usedSlugs.has(slug); n += 1) slug = `${base}-${n}`;
  usedSlugs.add(slug);

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, `${slug}.svg`), svg);

  const tracks = Array.isArray(project.tracks) ? project.tracks : [];
  const targets = new Set(tracks.map((track) => track.target));
  const size = artboardSize(svg);
  const duration = Number.isFinite(project.duration) ? project.duration : 2000;
  const loop = project.loop !== false;

  created.push({
    id: slug,
    label: title,
    hint: `${targets.size || 1} element${targets.size === 1 ? "" : "s"} · ${(
      duration / 1000
    ).toFixed(1)}s${loop ? " loop" : ""}`,
    icon: iconFor(title),
    src: `/templates/${slug}.svg`,
    width: size.width,
    height: size.height,
    duration,
    loop,
    tracks,
  });
}

const body = created
  .map((template) => `  ${JSON.stringify(template, null, 2).replace(/\n/g, "\n  ")},`)
  .join("\n");

fs.writeFileSync(
  OUT_FILE,
  `/**
 * AUTO-GENERATED by scripts/projects-to-templates.mjs — do not edit by hand.
 *
 * Projects promoted from the studio's own library into gallery templates.
 * The art stays in /public; only the motion lives here.
 */
import type { Track } from "./motion";

export interface UserTemplateData {
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

export const USER_TEMPLATES: UserTemplateData[] = [
${body}
];
`,
);

console.log(`created ${created.length} template(s):`);
for (const template of created) console.log(`  + ${template.label} → ${template.src}`);
if (skipped.length > 0) {
  console.log(`\nskipped ${skipped.length}:`);
  for (const reason of skipped) console.log(`  - ${reason}`);
}
